// ============================================================
// FICHIER : js/sw-idb-store.js
//
// RÔLE : Logique IndexedDB utilisée par le Service Worker
//        (sw.js), réécrite en JS pur — AUCUNE dépendance à
//        jQuery, puisque jQuery n'est pas utilisable dans le
//        contexte d'un Service Worker (pas d'accès au DOM).
//
// Ce fichier reprend, sans changer le raisonnement, la logique
// de réconciliation CREATE/UPDATE/DELETE déjà validée pour
// ProxyDAO_idb.save() :
//   CREATE existant + UPDATE → reste CREATE, payload remplacé
//   CREATE existant + DELETE → entrée supprimée (rien à envoyer)
//   UPDATE existant + UPDATE → reste UPDATE, payload remplacé
//   UPDATE existant + DELETE → devient DELETE
//
// Chargé dans sw.js via : importScripts("js/sw-idb-store.js")
// Expose un objet global `IdbStore` utilisable depuis sw.js.
//
// ★ AMÉLIORATIONS (alignées avec sw.js) :
//   - Cache avec TTL (expiration après 5 minutes)
//   - Vérification de l'expiration dans getReadCache()
//   - Ajout de _expiresAt dans cacheReadResponse()
//   - Ajout de _table dans save() pour identifier le type de données
//   - Implémente DelegateComponent (Phase 3)
//   - Méthodes utilitaires (Phase 5)
// ============================================================

const IdbStore = (function () {

    const DB_NAME = "ecamschool_idb";
    const DB_VERSION = 7;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes

    let dbPromise = null;

    // ----------------------------------------------------------
    // extractTableFromEndpoint()
    // Extrait le nom de la table à partir de l'endpoint
    // Ex: /users → User, /establishments → Establishment
    // ----------------------------------------------------------
    function extractTableFromEndpoint(endpoint) {
        let parts = endpoint.split('/').filter(Boolean);
        if (parts.length === 0) return 'Unknown';
        let table = parts[0];
        // Singulariser (ex: users → User)
        if (table.endsWith('s')) {
            table = table.slice(0, -1);
        }
        return table.charAt(0).toUpperCase() + table.slice(1);
    }

    // ----------------------------------------------------------
    // openDB()
    // Ouvre (ou crée) la base. Retourne une Promise<IDBDatabase>.
    // La promesse est mise en cache : un seul open() par cycle
    // de vie du Service Worker.
    // ----------------------------------------------------------
    function openDB() {

        if (dbPromise) return dbPromise;

        dbPromise = new Promise(function (resolve, reject) {

            let request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                let db = event.target.result;
                console.log("[sw-idb-store] Mise à niveau du schéma IndexedDB (version " + DB_VERSION + ")");

                if (!db.objectStoreNames.contains("_pending")) {
                    db.createObjectStore("_pending", { autoIncrement: true, keyPath: "_localId" });
                    console.log("[sw-idb-store] Store _pending créé");
                }

                if (!db.objectStoreNames.contains("_readCache")) {
                    db.createObjectStore("_readCache", { keyPath: "endpoint" });
                    console.log("[sw-idb-store] Store _readCache créé");
                }
            };

            request.onsuccess = function (event) {
                resolve(event.target.result);
            };

            request.onerror = function (event) {
                reject(event.target.error);
            };
        });

        return dbPromise;
    }

    // ----------------------------------------------------------
    // save()
    // ÉCRITURE HORS LIGNE avec réconciliation.
    //
    // Paramètres :
    //   - endpoint  : chemin de l'API concerné (ex: "/users")
    //   - data      : données de l'enregistrement (peut contenir
    //                 id si l'enregistrement est déjà connu du
    //                 serveur, ou _localId s'il a déjà été mis
    //                 en attente sans id serveur)
    //   - operation : "CREATE" | "UPDATE" | "DELETE"
    //
    // Retourne une Promise résolue avec le _localId concerné
    // (ou null si l'entrée a été annulée par la fusion).
    // ----------------------------------------------------------
    function save(endpoint, data, operation) {

        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {

                let tx = db.transaction(["_pending"], "readwrite");
                let store = tx.objectStore("_pending");
                let getAllReq = store.getAll();

                getAllReq.onsuccess = function (event) {

                    let all = event.target.result;

                    let existing = all.find(function (r) {
                        if (r._endpoint !== endpoint || r._syncStatus !== "PENDING") {
                            return false;
                        }
                        if (data.id !== undefined && data.id !== null) {
                            return r.id === data.id;
                        }
                        if (data._localId !== undefined && data._localId !== null) {
                            return r._localId === data._localId;
                        }
                        return false;
                    });

                    // ---- Une entrée PENDING existe déjà ----
                    if (existing) {

                        // CREATE + DELETE avant tout envoi → annulation complète
                        if (existing._operation === "CREATE" && operation === "DELETE") {
                            let delReq = store.delete(existing._localId);
                            delReq.onsuccess = function () {
                                console.log("[sw-idb-store] save() — CREATE annulé par DELETE local :", existing._localId);
                                resolve(null);
                            };
                            delReq.onerror = function (ev) { reject(ev.target.error); };
                            return;
                        }

                        // DELETE gagne toujours sur un UPDATE en attente
                        let finalOperation = (existing._operation === "UPDATE" && operation === "DELETE")
                            ? "DELETE"
                            : existing._operation;

                        let merged = Object.assign({}, existing, data, {
                            _endpoint: endpoint,
                            _operation: finalOperation,
                            _syncStatus: "PENDING",
                            _updatedAt: new Date().toISOString()
                        });

                        let putReq = store.put(merged);
                        putReq.onsuccess = function () {
                            console.log("[sw-idb-store] save() — entrée fusionnée :", existing._localId, "→", finalOperation);
                            resolve(existing._localId);
                        };
                        putReq.onerror = function (ev) { reject(ev.target.error); };
                        return;
                    }

                    // ---- Aucune entrée existante → nouvelle entrée PENDING ----
                    // ★ AJOUT : extraire _table depuis l'endpoint si non fourni
                    let table = data._table || extractTableFromEndpoint(endpoint);
                    
                    let record = Object.assign({}, data, {
                        _table: table,
                        _endpoint: endpoint,
                        _operation: operation,
                        _syncStatus: "PENDING",
                        _createdAt: new Date().toISOString()
                    });

                    let addReq = store.add(record);
                    addReq.onsuccess = function (ev) {
                        console.log("[sw-idb-store] save() — nouvelle entrée PENDING :", endpoint, operation, "_localId:", ev.target.result, "| _table:", table);
                        resolve(ev.target.result);
                    };
                    addReq.onerror = function (ev) { reject(ev.target.error); };
                };

                getAllReq.onerror = function (event) { reject(event.target.error); };
            });
        });
    }

    // ----------------------------------------------------------
    // getPending()
    // Retourne toutes les entrées en attente (tous endpoints
    // confondus — le tri par endpoint se fait à la lecture).
    // ----------------------------------------------------------
    function getPending() {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                let tx = db.transaction(["_pending"], "readonly");
                let store = tx.objectStore("_pending");
                let req = store.getAll();

                req.onsuccess = function (event) {
                    let pending = event.target.result.filter(function (r) {
                        return r._syncStatus === "PENDING";
                    });
                    resolve(pending);
                };
                req.onerror = function (event) { reject(event.target.error); };
            });
        });
    }

    // ----------------------------------------------------------
    // markSynced()
    // Marque une entrée comme SYNCED après envoi réussi.
    // `serverData` (optionnel) permet de rattacher les champs
    // renvoyés par le serveur (notamment l'id définitif pour un
    // CREATE) à l'enregistrement local.
    // ----------------------------------------------------------
    function markSynced(localId, serverData) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                let tx = db.transaction(["_pending"], "readwrite");
                let store = tx.objectStore("_pending");
                let getReq = store.get(localId);

                getReq.onsuccess = function (event) {
                    let record = event.target.result;
                    if (!record) { resolve(); return; }

                    record = Object.assign({}, record, serverData || {}, {
                        _syncStatus: "SYNCED",
                        _syncedAt: new Date().toISOString()
                    });

                    let putReq = store.put(record);
                    putReq.onsuccess = function () {
                        console.log("[sw-idb-store] markSynced() — localId:", localId, "→ SYNCED");
                        resolve();
                    };
                    putReq.onerror = function (ev) { reject(ev.target.error); };
                };
                getReq.onerror = function (event) { reject(event.target.error); };
            });
        });
    }

    // ----------------------------------------------------------
    // purgeSynced()
    // Supprime les entrées SYNCED plus vieilles que
    // `olderThanDays` jours (choix validé : purge périodique
    // plutôt que conservation indéfinie).
    // ----------------------------------------------------------
    function purgeSynced(olderThanDays) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {

                let seuil = new Date();
                seuil.setDate(seuil.getDate() - olderThanDays);

                let tx = db.transaction(["_pending"], "readwrite");
                let store = tx.objectStore("_pending");
                let req = store.getAll();

                req.onsuccess = function (event) {
                    let aSupprimer = event.target.result.filter(function (r) {
                        return r._syncStatus === "SYNCED" &&
                            r._syncedAt !== undefined &&
                            new Date(r._syncedAt) < seuil;
                    });

                    if (aSupprimer.length === 0) { resolve(0); return; }

                    let restant = aSupprimer.length;
                    aSupprimer.forEach(function (r) {
                        let delReq = store.delete(r._localId);
                        delReq.onsuccess = function () {
                            restant--;
                            if (restant === 0) {
                                console.log("[sw-idb-store] purgeSynced() —", aSupprimer.length, "entrée(s) purgée(s).");
                                resolve(aSupprimer.length);
                            }
                        };
                        delReq.onerror = function (ev) { reject(ev.target.error); };
                    });
                };
                req.onerror = function (event) { reject(event.target.error); };
            });
        });
    }

    // ----------------------------------------------------------
    // cacheReadResponse()
    // ★ AMÉLIORATION : AJOUT DU TTL (expiration)
    // Sauvegarde une réponse GET dans le cache _readCache avec
    // une date d'expiration.
    //
    // Paramètres :
    //   - endpoint : URL de la requête (ex: "/users")
    //   - data     : données à mettre en cache
    //
    // Retourne une Promise résolue quand l'écriture est terminée.
    // ----------------------------------------------------------
    function cacheReadResponse(endpoint, data) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {

                // Vérifier que la base est encore ouverte
                try {
                    if (!db || db.close === undefined) {
                        console.warn("[sw-idb-store] cacheReadResponse — base fermée, réouverture");
                        dbPromise = null;
                        return openDB().then(function (newDb) {
                            return cacheReadResponse(endpoint, data).then(resolve).catch(reject);
                        });
                    }
                } catch (e) {
                    console.warn("[sw-idb-store] cacheReadResponse — erreur de connexion, réessai");
                    dbPromise = null;
                    return openDB().then(function (newDb) {
                        return cacheReadResponse(endpoint, data).then(resolve).catch(reject);
                    });
                }

                // Vérifier que le store _readCache existe
                if (!db.objectStoreNames.contains("_readCache")) {
                    console.warn("[sw-idb-store] cacheReadResponse — store _readCache inexistant");
                    db.close();
                    dbPromise = null;
                    let newVersion = DB_VERSION + 1;
                    let reopenReq = indexedDB.open(DB_NAME, newVersion);
                    reopenReq.onupgradeneeded = function (ev) {
                        let newDb = ev.target.result;
                        if (!newDb.objectStoreNames.contains("_readCache")) {
                            newDb.createObjectStore("_readCache", { keyPath: "endpoint" });
                            console.log("[sw-idb-store] Store _readCache créé (reprise)");
                        }
                    };
                    reopenReq.onsuccess = function (ev) {
                        let newDb = ev.target.result;
                        try {
                            let tx2 = newDb.transaction(["_readCache"], "readwrite");
                            let store2 = tx2.objectStore("_readCache");
                            
                            // ★ AJOUT : date d'expiration (TTL)
                            let record = {
                                endpoint: endpoint,
                                data: data,
                                _cachedAt: new Date().toISOString(),
                                _expiresAt: new Date(Date.now() + CACHE_TTL).toISOString()
                            };
                            
                            let req2 = store2.put(record);
                            req2.onsuccess = function () { resolve(); };
                            req2.onerror = function (ev2) { reject(ev2.target.error); };
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reopenReq.onerror = function (ev) { reject(ev.target.error); };
                    return;
                }

                // Store existe → procéder normalement
                try {
                    let tx2 = db.transaction(["_readCache"], "readwrite");
                    let store2 = tx2.objectStore("_readCache");
                    
                    // ★ AJOUT : date d'expiration (TTL)
                    let record = {
                        endpoint: endpoint,
                        data: data,
                        _cachedAt: new Date().toISOString(),
                        _expiresAt: new Date(Date.now() + CACHE_TTL).toISOString()
                    };
                    
                    let req2 = store2.put(record);
                    req2.onsuccess = function () { resolve(); };
                    req2.onerror = function (ev2) { reject(ev2.target.error); };
                } catch (err) {
                    console.warn("[sw-idb-store] cacheReadResponse — erreur transaction, réessai:", err.message);
                    dbPromise = null;
                    return openDB().then(function (newDb) {
                        return cacheReadResponse(endpoint, data).then(resolve).catch(reject);
                    });
                }
            });
        });
    }

    // ----------------------------------------------------------
    // getReadCache()
    // ★ AMÉLIORATION : VÉRIFICATION DE L'EXPIRATION
    // Récupère une réponse GET mise en cache. Si elle a expiré,
    // elle est supprimée et null est retourné.
    //
    // Paramètres :
    //   - endpoint : URL de la requête (ex: "/users")
    //
    // Retourne une Promise résolue avec les données en cache,
    // ou null si aucune donnée ou expirée.
    // ----------------------------------------------------------
    function getReadCache(endpoint) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {

                try {
                    if (!db || db.close === undefined) {
                        console.warn("[sw-idb-store] getReadCache — base fermée");
                        resolve(null);
                        return;
                    }
                } catch (e) {
                    console.warn("[sw-idb-store] getReadCache — erreur de connexion");
                    resolve(null);
                    return;
                }

                if (!db.objectStoreNames.contains("_readCache")) {
                    console.warn("[sw-idb-store] getReadCache — store _readCache inexistant");
                    resolve(null);
                    return;
                }

                try {
                    let tx = db.transaction(["_readCache"], "readonly");
                    let store = tx.objectStore("_readCache");
                    let req = store.get(endpoint);
                    
                    req.onsuccess = function (event) {
                        let record = event.target.result;
                        
                        if (!record) {
                            resolve(null);
                            return;
                        }
                        
                        // ★ AJOUT : Vérifier l'expiration
                        let now = new Date();
                        let expiresAt = new Date(record._expiresAt);
                        
                        if (now > expiresAt) {
                            // Expiré → supprimer et retourner null
                            console.log("[sw-idb-store] Cache expiré pour :", endpoint);
                            
                            // Supprimer l'entrée expirée
                            try {
                                let deleteTx = db.transaction(["_readCache"], "readwrite");
                                let deleteStore = deleteTx.objectStore("_readCache");
                                deleteStore.delete(endpoint);
                            } catch (err) {
                                console.warn("[sw-idb-store] Erreur suppression cache expiré:", err.message);
                            }
                            
                            resolve(null);
                            return;
                        }
                        
                        resolve(record.data);
                    };
                    req.onerror = function (event) { resolve(null); };
                } catch (err) {
                    console.warn("[sw-idb-store] getReadCache — erreur transaction:", err.message);
                    resolve(null);
                }
            });
        });
    }

    // ============================================================
    // MÉTHODES UTILITAIRES (PHASE 5)
    // ============================================================

    // ----------------------------------------------------------
    // getStoreNames()
    // Rôle : Retourne la liste des stores disponibles.
    // ----------------------------------------------------------
    function getStoreNames() {
        return openDB().then(function(db) {
            var names = [];
            for (var i = 0; i < db.objectStoreNames.length; i++) {
                names.push(db.objectStoreNames[i]);
            }
            return names;
        });
    }

    // ----------------------------------------------------------
    // getVersion()
    // Rôle : Retourne la version de la base.
    // ----------------------------------------------------------
    function getVersion() {
        return openDB().then(function(db) {
            return db.version;
        });
    }

    // ----------------------------------------------------------
    // isReady()
    // Rôle : Vérifie si la base est ouverte et prête.
    // ----------------------------------------------------------
    function isReady() {
        return openDB().then(function(db) {
            return db !== null && db.close !== undefined;
        }).catch(function() {
            return false;
        });
    }

    // ----------------------------------------------------------
    // closeDB()
    // Rôle : Ferme la connexion proprement.
    // ----------------------------------------------------------
    function closeDB() {
        return openDB().then(function(db) {
            db.close();
            dbPromise = null;
            console.log("[sw-idb-store] Base fermée.");
            return true;
        });
    }

    // ============================================================
    // EXPOSITION DE L'API
    // ============================================================

    return {
        // ---- Marqueur DelegateComponent (Phase 3) ----
        __isDelegateComponent: true,
        __version: "1.0.0",
        
        // ---- Méthodes DelegateComponent ----
        openDB: openDB,
        save: save,
        getPending: getPending,
        markSynced: markSynced,
        purgeSynced: purgeSynced,
        cacheReadResponse: cacheReadResponse,
        getReadCache: getReadCache,
        
        // ---- Méthodes utilitaires (Phase 5) ----
        getStoreNames: getStoreNames,
        getVersion: getVersion,
        isReady: isReady,
        closeDB: closeDB
    };

})();