// ============================================================
// FICHIER : tools-3.5.library.ProxyDAO.js
// MODIFICATIONS : ajout de save(), getPending(), markSynced()
//                 dans ProxyDAO_idb
//                 ajout de push() dans ProxyDAO_mat
// ============================================================

// ------------------------------------------------------------
// ProxyDAO_mat — Proxy pour le DAO de la matrice (AJAX)
// ------------------------------------------------------------
tools.Library.ProxyDAO_mat = function (dao_mat) {

    this.dao_mat      = dao_mat;
    this.proxyDAO_idb = null;

    // ----------------------------------------------------------
    // delegate()
    // LECTURE — choisit entre IndexedDB et serveur
    // ----------------------------------------------------------
    this.delegate = function (uri, table, req, attrib, filter, keyCols) {

        if (this.proxyDAO_idb !== null && this.proxyDAO_idb.uriExist(uri)) {
            console.log("[ProxyDAO_mat] Lecture locale (IndexedDB) pour :", uri);
            this.proxyDAO_idb.delegate(uri, table, req, attrib, filter, keyCols);
        } else {
            console.log("[ProxyDAO_mat] Lecture serveur (AJAX) pour :", uri);
            this._fetchFromServer(uri, table, req, attrib, filter, keyCols);
        }
    };

    // ----------------------------------------------------------
    // _fetchFromServer()
    // Effectue l'appel AJAX et sauvegarde en IndexedDB
    // ----------------------------------------------------------
    this._fetchFromServer = function (uri, table, req, attrib, filter, keyCols) {

        let context = this;

        $.ajax({
            type    : "POST",
            url     : uri,
            data    : filter,
            dataType: "JSON",

            success: function (reponse) {
                console.log("[ProxyDAO_mat] Réponse serveur reçue pour table :", table);
                context.dao_mat.updateTable(uri, table, reponse, keyCols);

                if (context.proxyDAO_idb !== null) {
                    context.proxyDAO_idb.update_delegate(uri, table, reponse);
                }

                req.setAttribute(attrib, context.dao_mat.getElementsIndexUri(table, uri));
                req.chainActivate();
            },

            error: function (requestH, error) {
                console.error("[ProxyDAO_mat] Erreur AJAX :", uri, error);

                if (context.proxyDAO_idb !== null && context.proxyDAO_idb.uriExist(uri)) {
                    console.warn("[ProxyDAO_mat] Réseau indisponible → bascule IndexedDB");
                    context.proxyDAO_idb.delegate(uri, table, req, attrib, filter, keyCols);
                } else {
                    alert("Réseau indisponible et aucune donnée locale : " + error);
                }
            }
        });
    };

    // ----------------------------------------------------------
    // push()
    // ÉCRITURE — reçoit les données d'un formulaire et décide :
    //   - En ligne  → envoie directement au backend (POST)
    //   - Hors ligne → sauvegarde dans IndexedDB en PENDING
    //
    // Paramètres :
    //   - uri      : URL de l'endpoint backend (ex: "/enseignements")
    //   - table    : nom de la table (ex: "Enseignement")
    //   - data     : objet de données du formulaire
    //   - onSuccess: callback appelé après succès (optionnel)
    //   - onError  : callback appelé après échec  (optionnel)
    // ----------------------------------------------------------
    this.push = function (uri, table, data, onSuccess, onError) {

        let context = this;

        if (navigator.onLine) {

            // En ligne → envoi direct au backend
            console.log("[ProxyDAO_mat] push() EN LIGNE → POST vers :", uri);

            $.ajax({
                type       : "POST",
                url        : uri,
                data       : JSON.stringify(data),
                contentType: "application/json",
                dataType   : "json",

                success: function (reponse) {
                    console.log("[ProxyDAO_mat] push() succès :", table);
                    if (onSuccess) onSuccess(reponse);
                },

                error: function (requestH, error) {
                    console.error("[ProxyDAO_mat] push() erreur réseau :", error);

                    // Réseau coupé pendant l'envoi → sauvegarder en local
                    if (context.proxyDAO_idb !== null) {
                        console.warn("[ProxyDAO_mat] Bascule sauvegarde locale");
                        context.proxyDAO_idb.save(table, data);
                    }
                    if (onError) onError(error);
                }
            });

        } else {

            // Hors ligne → sauvegarde locale avec statut PENDING
            console.log("[ProxyDAO_mat] push() HORS LIGNE → sauvegarde IndexedDB");

            if (this.proxyDAO_idb !== null) {
                this.proxyDAO_idb.save(table, data);
                if (onSuccess) onSuccess(null); // succès local
            } else {
                console.error("[ProxyDAO_mat] push() impossible : pas de ProxyDAO_idb");
                if (onError) onError("IndexedDB non disponible");
            }
        }
    };

    // ----------------------------------------------------------
    // update_delegate()
    // Met à jour la matrice après retour serveur
    // ----------------------------------------------------------
    this.update_delegate = function (uri, table, elements) {
        console.log("[ProxyDAO_mat] update_delegate → table :", table);
        this.dao_mat.updateTable(uri, table, elements);
    };

    this.uriExist = function (uri) {
        return this.dao_mat.uriExist(uri);
    };

    this.setProxyIdb = function (proxyDAO_idb) {
        this.proxyDAO_idb = proxyDAO_idb;
        console.log("[ProxyDAO_mat] ProxyDAO_idb injecté avec succès.");
    };

    this.choose_route = function () {
        let route = navigator.onLine ? "ajax" : "idb";
        console.log("[ProxyDAO_mat] choose_route →", route);
        return route;
    };
};


// ------------------------------------------------------------
// ProxyDAO_idb — Proxy pour IndexedDB (stockage local)
// Hérite de ProxyDAO_mat
// ------------------------------------------------------------
tools.Library.ProxyDAO_idb = function (dao_mat) {

    tools.Library.ProxyDAO_mat.call(this, dao_mat);

    this.DB_NAME    = "ecamschool_idb";
    this.DB_VERSION = 2;
    this.db         = null;

    // ----------------------------------------------------------
    // openDB()
    // Ouvre ou crée la base IndexedDB
    // Le store "_pending" est créé automatiquement pour stocker
    // les données en attente de synchronisation
    // ----------------------------------------------------------
    this.openDB = function (stores, callback) {

        let context = this;

        // Ajouter le store "_pending" à la liste des stores
        // Il contient tous les enregistrements hors-ligne
        let allStores = stores.concat(["_pending"]);

        let request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            console.log("[ProxyDAO_idb] Initialisation du schéma IndexedDB");

            for (let i = 0; i < allStores.length; i++) {
                let storeName = allStores[i];
                if (!db.objectStoreNames.contains(storeName)) {

                    if (storeName === "_pending") {
                        // Store spécial pour la synchronisation
                        // autoIncrement : pas besoin d'id métier
                        db.createObjectStore("_pending", { autoIncrement: true, keyPath: "_localId" });
                        console.log("[ProxyDAO_idb] Store _pending créé");
                    } else {
                        db.createObjectStore(storeName, { keyPath: "id" });
                        console.log("[ProxyDAO_idb] Store créé :", storeName);
                    }
                }
            }
        };

        request.onsuccess = function (event) {
            context.db = event.target.result;
            console.log("[ProxyDAO_idb] Base ouverte :", context.DB_NAME);
            if (callback) callback();
        };

        request.onerror = function (event) {
            console.error("[ProxyDAO_idb] Erreur ouverture :", event.target.error);
        };
    };

    this.uriExist = function (uri) {
        let exists = localStorage.getItem("idb_uri_" + uri) !== null;
        console.log("[ProxyDAO_idb] uriExist(", uri, ") →", exists);
        return exists;
    };

    // ----------------------------------------------------------
    // delegate()
    // Lit les données depuis IndexedDB
    // ----------------------------------------------------------
    this.delegate = function (uri, table, req, attrib, filter, keyCols) {

        if (this.db === null) {
            console.warn("[ProxyDAO_idb] Base non ouverte.");
            return;
        }

        let context     = this;
        let transaction = this.db.transaction([table], "readonly");
        let store       = transaction.objectStore(table);
        let getAllReq   = store.getAll();

        getAllReq.onsuccess = function (event) {
            let elements = event.target.result;
            console.log("[ProxyDAO_idb]", elements.length, "éléments lus pour", table);
            context.dao_mat.updateTable(uri, table, elements, keyCols);
            req.setAttribute(attrib, context.dao_mat.getElementsIndexUri(table, uri));
            req.chainActivate();
        };

        getAllReq.onerror = function (event) {
            console.error("[ProxyDAO_idb] Erreur lecture :", event.target.error);
        };
    };

    // ----------------------------------------------------------
    // update_delegate()
    // Sauvegarde les données du serveur en local (cache lecture)
    // ----------------------------------------------------------
    this.update_delegate = function (uri, table, elements) {

        if (this.db === null) {
            console.warn("[ProxyDAO_idb] Base non ouverte.");
            return;
        }

        let transaction = this.db.transaction([table], "readwrite");
        let store       = transaction.objectStore(table);

        for (let i = 0; i < elements.length; i++) {
            store.put(elements[i]);
        }

        localStorage.setItem("idb_uri_" + uri, "1");

        transaction.oncomplete = function () {
            console.log("[ProxyDAO_idb] Cache local OK — table:", table);
        };

        transaction.onerror = function (event) {
            console.error("[ProxyDAO_idb] Erreur cache :", event.target.error);
        };
    };

    // ----------------------------------------------------------
    // save()
    // ÉCRITURE HORS LIGNE — sauvegarde un enregistrement
    // dans le store "_pending" avec statut PENDING.
    //
    // Paramètres :
    //   - table : nom de la table cible (ex: "Enseignement")
    //   - data  : objet de données du formulaire
    //
    // Structure stockée dans _pending :
    //   { _table, _uri, _syncStatus, _createdAt, ...data }
    // ----------------------------------------------------------
    this.save = function (table, data) {

        if (this.db === null) {
            console.warn("[ProxyDAO_idb] save() — base non ouverte.");
            return;
        }

        let transaction = this.db.transaction(["_pending"], "readwrite");
        let store       = transaction.objectStore("_pending");

        // Envelopper la donnée avec les métadonnées de sync
        let record = Object.assign({}, data, {
            _table      : table,
            _syncStatus : "PENDING",
            _createdAt  : new Date().toISOString()
        });

        let req = store.add(record);

        req.onsuccess = function () {
            console.log("[ProxyDAO_idb] save() — enregistrement PENDING sauvegardé :", table);
        };

        req.onerror = function (event) {
            console.error("[ProxyDAO_idb] save() — erreur :", event.target.error);
        };
    };

    // ----------------------------------------------------------
    // getPending()
    // Retourne tous les enregistrements en attente pour une table
    //
    // Paramètres :
    //   - table    : nom de la table (ex: "Enseignement")
    //   - callback : function(records) appelée avec les résultats
    // ----------------------------------------------------------
    this.getPending = function (table, callback) {

        if (this.db === null) {
            console.warn("[ProxyDAO_idb] getPending() — base non ouverte.");
            callback([]);
            return;
        }

        let transaction = this.db.transaction(["_pending"], "readonly");
        let store       = transaction.objectStore("_pending");
        let getAllReq   = store.getAll();

        getAllReq.onsuccess = function (event) {
            let all = event.target.result;

            // Filtrer par table ET par statut PENDING
            let pending = all.filter(function (record) {
                return record._table === table &&
                       record._syncStatus === "PENDING";
            });

            console.log("[ProxyDAO_idb] getPending()", table, "→", pending.length, "en attente");
            callback(pending);
        };

        getAllReq.onerror = function (event) {
            console.error("[ProxyDAO_idb] getPending() erreur :", event.target.error);
            callback([]);
        };
    };

    // ----------------------------------------------------------
    // markSynced()
    // Marque un enregistrement comme SYNCED après envoi réussi
    //
    // Paramètres :
    //   - localId  : la clé _localId de l'enregistrement dans _pending
    //   - callback : appelé après mise à jour (optionnel)
    // ----------------------------------------------------------
    this.markSynced = function (localId, callback) {

        if (this.db === null) {
            console.warn("[ProxyDAO_idb] markSynced() — base non ouverte.");
            return;
        }

        let transaction = this.db.transaction(["_pending"], "readwrite");
        let store       = transaction.objectStore("_pending");

        // Lire l'enregistrement existant
        let getReq = store.get(localId);

        getReq.onsuccess = function (event) {
            let record = event.target.result;

            if (record) {
                // Mettre à jour le statut
                record._syncStatus = "SYNCED";
                record._syncedAt   = new Date().toISOString();
                store.put(record);
                console.log("[ProxyDAO_idb] markSynced() — localId:", localId, "→ SYNCED");
                if (callback) callback();
            }
        };

        getReq.onerror = function (event) {
            console.error("[ProxyDAO_idb] markSynced() erreur :", event.target.error);
        };
    };

    this.choose_route = function () {
        console.log("[ProxyDAO_idb] choose_route → idb");
        return "idb";
    };
};
