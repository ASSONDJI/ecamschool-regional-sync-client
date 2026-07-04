// ============================================================
// FICHIER : sw.js
// 
// RÔLE : Service Worker de E-camschool.
//        Remplace SwRouter / DelegateComponent / ProxyDAO /
//        SyncManager pour la gestion offline-first.
//
// CONTENU (étapes du plan de migration réunies ici) :
//   Étape 3 : mise en cache de l'app shell (install/activate)
//   Étape 4 : import de js/sw-idb-store.js
//   Étape 5 : interception des requêtes (fetch)
//   Étape 6 : réconciliation CREATE/UPDATE/DELETE
//   Étape 7 : synchronisation différée (sync + repli manuel)
//   Étape 8 : notifications push
//   Étape 9 : améliorations lecture (cache d'abord + TTL + cache POST/PUT/DELETE)
//   Étape 10 : Pattern Stratégie avec CandidateFactory (Phase 3)
// ============================================================

importScripts("js/sw-idb-store.js");

// ----------------------------------------------------------
// Configuration
// ----------------------------------------------------------
const CACHE_VERSION = "v1";
const CACHE_NAME = "ecamschool-shell-" + CACHE_VERSION;

// Durée de vie du cache de lecture (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Fichiers nécessaires à l'ouverture de l'application hors-ligne.
// Doit rester synchronisé avec les balises <script>/<link> de
// index.html.
const APP_SHELL_FILES = [
    "/",
    "/index.html",
    "/css/style.css",
    "/js/jquery.js",
    "/js/tools-3.5.js",
    "/js/tools-3.5.library.stats.matrice.js",
    "/js/tools-3.5.library.Container_mat.js",
    "/js/tools-3.5.library.DAOContainer.js",
    "/js/tools-3.5.library.IDBManager.js",
    "/js/tools-3.5.AppLib.js",
    "/js/tools-3.5.controller.js",
    "/js/app.js"
];

// Endpoints de l'API backend à intercepter. Toute requête dont
// le chemin commence par l'un de ces préfixes est traitée par
// la logique offline-first ci-dessous ; le reste (fichiers
// statiques, CDN externes, uds-server/enseignements.json...)
// suit le comportement réseau normal ou l'app shell.
const API_PREFIXES = ["/users", "/establishments", "/data-matrix"];

const SYNC_TAG = "ecamschool-sync-pending";

// ============================================================
// PHASE 3 : CONFIGURATION DES ENTITÉS ET CANDIDATES
// ============================================================

// Entités gérées par le Service Worker
const ENTITIES = ["User", "Establishment", "DataMatrix"];

// Vérifier que IdbStore est bien chargé
if (typeof IdbStore === 'undefined') {
    console.error("[sw.js] IdbStore non chargé !");
} else {
    console.log("[sw.js] IdbStore chargé avec succès.");
}

// ----------------------------------------------------------
// getCandidates()
// Rôle : Retourne la liste des candidats (ProxyDAO) disponibles.
//        Utilisé par choose_route() pour sélectionner le bon canal.
// ----------------------------------------------------------
function getCandidates() {
    var candidates = [];
    
    // Créer un candidat IndexedDB (BLEU) pour chaque entité
    for (var i = 0; i < ENTITIES.length; i++) {
        var entity = ENTITIES[i];
        candidates.push({
            _name: entity + "_IndexedDB",
            entity: entity,
            type: "indexeddb",
            store: IdbStore,
            // Méthodes de délégation vers IdbStore
            save: function(endpoint, data, operation) {
                return IdbStore.save(endpoint, data, operation);
            },
            getPending: function() {
                return IdbStore.getPending();
            },
            markSynced: function(localId, serverData) {
                return IdbStore.markSynced(localId, serverData);
            },
            purgeSynced: function(olderThanDays) {
                return IdbStore.purgeSynced(olderThanDays);
            },
            cacheReadResponse: function(endpoint, data) {
                return IdbStore.cacheReadResponse(endpoint, data);
            },
            getReadCache: function(endpoint) {
                return IdbStore.getReadCache(endpoint);
            }
        });
    }
    
    console.log("[sw.js] getCandidates() →", candidates.length, "candidats créés.");
    return candidates;
}

// ----------------------------------------------------------
// choose_route()
// Rôle : Implémente le Pattern Stratégie pour choisir le canal.
//        En ligne → AJAX (Matrice), Hors ligne → IndexedDB.
// ----------------------------------------------------------
function choose_route(candidates, request) {
    // Vérifier si le réseau est disponible
    var isOnline = navigator.onLine;
    
    // Si on a une préférence dans la requête, l'utiliser
    if (request && request.headers) {
        var preferOffline = request.headers.get('X-Prefer-Offline');
        if (preferOffline === 'true') {
            isOnline = false;
        }
    }
    
    console.log("[sw.js] choose_route() → isOnline:", isOnline);
    
    if (isOnline) {
        // En ligne → retourner le candidat AJAX (matrice)
        // Note : Dans le Service Worker, nous utilisons le candidat
        // IndexedDB par défaut car c'est lui qui gère le cache
        console.log("[sw.js] OnlineStrategy → candidat IndexedDB sélectionné (cache).");
        return candidates.length > 0 ? candidates[0] : null;
    } else {
        // Hors ligne → retourner le candidat IndexedDB (bleu)
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i].type === "indexeddb") {
                console.log("[sw.js] OfflineStrategy → candidat IndexedDB sélectionné.");
                return candidates[i];
            }
        }
        // Fallback
        return candidates.length > 0 ? candidates[0] : null;
    }
}

// Initialiser les candidats au démarrage
var CANDIDATES = getCandidates();
console.log("[sw.js] CANDIDATES initialisés :", CANDIDATES.length);

// ============================================================
// FIN PHASE 3
// ============================================================

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
// install
// Met en cache l'app shell, pour permettre l'ouverture de
// l'application même sans aucune connexion réseau.
// ----------------------------------------------------------
self.addEventListener("install", function (event) {
    console.log("[sw.js] install — mise en cache de l'app shell.");

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_SHELL_FILES);
            })
            .then(function () {
                // Prendre le contrôle dès l'installation suivante,
                // sans attendre la fermeture de tous les onglets.
                return self.skipWaiting();
            })
            .catch(function (error) {
                console.error("[sw.js] install — échec de mise en cache :", error);
            })
    );
});

// ----------------------------------------------------------
// activate
// Supprime les anciens caches (versions précédentes de l'app
// shell) et prend le contrôle des onglets déjà ouverts.
// ----------------------------------------------------------
self.addEventListener("activate", function (event) {
    console.log("[sw.js] activate — nettoyage des anciens caches.");

    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames
                        .filter(function (name) { return name !== CACHE_NAME; })
                        .map(function (name) {
                            console.log("[sw.js] Suppression ancien cache :", name);
                            return caches.delete(name);
                        })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

// ----------------------------------------------------------
// fetch
// Point d'interception central de toute requête réseau
// (déclenchée par $.ajax, fetch, ou le chargement d'une page).
// ----------------------------------------------------------
self.addEventListener("fetch", function (event) {

    let url = new URL(event.request.url);

    // Ignorer les requêtes vers d'autres origines qu'on ne
    // maîtrise pas (CDN externes, etc.) — les laisser passer
    // normalement, sans interception.
    if (url.origin !== self.location.origin && !isKnownApiHost(url)) {
        return;
    }

    let isApiRequest = API_PREFIXES.some(function (prefix) {
        return url.pathname.indexOf(prefix) === 0;
    });

    if (isApiRequest) {
        event.respondWith(handleApiRequest(event.request, url));
        return;
    }

    // Requêtes de l'app shell (HTML/CSS/JS) : cache d'abord,
    // réseau en repli, pour permettre l'ouverture hors-ligne.
    if (event.request.method === "GET") {
        event.respondWith(handleShellRequest(event.request));
    }
});

// ----------------------------------------------------------
// isKnownApiHost()
// L'API backend (API_BASE_URL = http://localhost:8080 côté
// app.js) peut être sur une origine différente de celle qui
// sert les fichiers statiques selon la config locale. On
// l'autorise explicitement ici.
// ----------------------------------------------------------
function isKnownApiHost(url) {
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

// ----------------------------------------------------------
// handleShellRequest()
// Stratégie "cache d'abord, réseau en repli" pour les fichiers
// statiques de l'application.
// ----------------------------------------------------------
function handleShellRequest(request) {
    return caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).catch(function () {
            return caches.match("/index.html");
        });
    });
}

// ----------------------------------------------------------
// handleApiRequest()
// Étape 5 + 6 : distingue lecture (GET) et écriture
// (POST/PUT/DELETE), avec bascule offline sur chaque cas.
// ★ AMÉLIORATION PHASE 3 : Utilise choose_route() pour sélectionner
//                          le bon candidat selon l'état du réseau.
// ----------------------------------------------------------
function handleApiRequest(request, url) {

    // Choisir le bon candidat selon l'état du réseau
    var candidate = choose_route(CANDIDATES, request);
    
    if (candidate) {
        console.log("[sw.js] handleApiRequest() → candidat sélectionné :", candidate._name);
    } else {
        console.warn("[sw.js] handleApiRequest() → aucun candidat disponible.");
    }

    if (request.method === "GET") {
        return handleRead(request, url, candidate);
    }

    return handleWrite(request, url, candidate);
}

// ----------------------------------------------------------
// handleRead()
// ★ AMÉLIORATION 1 : STRATÉGIE "CACHE D'ABORD"
// ★ AMÉLIORATION 2 : CACHE AVEC EXPIRATION (TTL)
// ★ AMÉLIORATION PHASE 3 : Utilise le candidat sélectionné
//
// 1. Lire le cache immédiatement (instantané)
// 2. Si cache valide → retourner + mise à jour arrière-plan
// 3. Si cache vide/expiré → attendre le réseau
// 4. Si réseau échoue → erreur
// ----------------------------------------------------------
function handleRead(request, url, candidate) {

    // Utiliser le cache du candidat s'il est disponible
    var cacheStore = candidate && candidate.store ? candidate.store : IdbStore;

    // 1. Lire d'abord le cache
    return cacheStore.getReadCache(url.pathname)
        .then(function (cachedData) {
            if (cachedData !== null) {
                // 2. Cache disponible → retourner immédiatement
                const response = new Response(JSON.stringify(cachedData), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });

                // 3. Mettre à jour en arrière-plan (sans bloquer)
                fetch(request.clone())
                    .then(function (networkResponse) {
                        if (networkResponse.ok) {
                            networkResponse.clone().json()
                                .then(function (data) {
                                    cacheStore.cacheReadResponse(url.pathname, data);
                                    // Notifier l'UI d'une mise à jour
                                    notifyClients({
                                        type: "CACHE_UPDATED",
                                        endpoint: url.pathname
                                    });
                                })
                                .catch(function () { /* ignore */ });
                        }
                    })
                    .catch(function () { /* réseau indisponible, on ignore */ });

                return response; // Retour immédiat
            }

            // 4. Cache vide → fallback sur le réseau
            console.log("[sw.js] Cache vide pour :", url.pathname, "→ requête réseau.");
            return fetch(request.clone())
                .then(function (networkResponse) {
                    if (networkResponse.ok) {
                        networkResponse.clone().json()
                            .then(function (data) {
                                cacheStore.cacheReadResponse(url.pathname, data);
                            })
                            .catch(function () { /* ignore */ });
                    }
                    return networkResponse;
                })
                .catch(function () {
                    // 5. Réseau indisponible → erreur
                    console.warn("[sw.js] Lecture réseau échouée, aucun cache disponible :", url.pathname);
                    return new Response(
                        JSON.stringify({ error: "Aucune donnée disponible pour " + url.pathname }),
                        { status: 503, headers: { "Content-Type": "application/json" } }
                    );
                });
        });
}

// ----------------------------------------------------------
// handleWrite()
// ★ AMÉLIORATION 3 : CACHE DES RÉPONSES POST/PUT/DELETE
// ★ AMÉLIORATION PHASE 3 : Utilise le candidat sélectionné
//
// Réseau d'abord ; si échec (hors-ligne), l'opération est mise
// en file d'attente via IdbStore.save(), avec le type
// d'opération déduit directement de la méthode HTTP.
// En cas de succès, le cache de lecture est mis à jour.
// ----------------------------------------------------------
function handleWrite(request, url, candidate) {

    // Utiliser le store du candidat s'il est disponible
    var store = candidate && candidate.store ? candidate.store : IdbStore;

    let operation = { POST: "CREATE", PUT: "UPDATE", DELETE: "DELETE" }[request.method];

    return request.clone().json().catch(function () { return {}; }).then(function (body) {

        // ★ AJOUT : Extraire _table à partir de l'endpoint
        let segments = url.pathname.split("/").filter(Boolean);
        let idFromUrl = segments.length > 0 && /^\d+$/.test(segments[segments.length - 1])
            ? parseInt(segments[segments.length - 1], 10)
            : null;

        let endpoint = idFromUrl !== null ? "/" + segments.slice(0, -1).join("/") : url.pathname;
        let data = Object.assign({}, body);
        if (idFromUrl !== null) data.id = idFromUrl;

        // ★ AJOUT : Ajouter _table aux données pour le stockage IndexedDB
        data._table = extractTableFromEndpoint(endpoint);

        return fetch(request.clone())
            .then(function (response) {
                // Succès réseau
                if (response.ok) {
                    // ★ AMÉLIORATION 3 : Sauvegarder la réponse pour le cache
                    if (request.method === "POST" || request.method === "PUT" || request.method === "DELETE") {
                        response.clone().json().then(function (serverData) {
                            updateReadCacheForWrite(url.pathname, serverData, body, request.method);
                        }).catch(function () {
                            // Pour DELETE, la réponse peut être vide (204)
                            if (request.method === "DELETE") {
                                updateReadCacheForWrite(url.pathname, null, body, request.method);
                            }
                        });
                    }
                }
                return response;
            })
            .catch(function () {
                console.warn("[sw.js] Écriture réseau échouée → mise en attente :", operation, url.pathname);

                // Utiliser le store du candidat pour sauvegarder
                return store.save(endpoint, data, operation).then(function (localId) {
                    return registerBackgroundSync().then(function () {
                        notifyClients({ type: "QUEUED", endpoint: endpoint, operation: operation });
                        return new Response(
                            JSON.stringify({ queued: true, offline: true, localId: localId }),
                            { status: 202, headers: { "Content-Type": "application/json" } }
                        );
                    });
                });
            });
    });
}

// ----------------------------------------------------------
// updateReadCacheForWrite()
// ★ AMÉLIORATION 3 : Met à jour le cache de lecture après une écriture
//
// Rôle : après un POST, PUT ou DELETE réussi, mettre à jour le cache
// de lecture pour que l'utilisateur voit immédiatement les
// changements sans recharger.
// ----------------------------------------------------------
function updateReadCacheForWrite(endpoint, serverData, originalData, method) {

    // Lire le cache existant pour cet endpoint
    IdbStore.getReadCache(endpoint).then(function (cachedData) {
        let updatedData = cachedData || [];

        if (Array.isArray(updatedData)) {
            // Vérifier si l'élément existe déjà dans le cache
            let existsIndex = -1;
            if (serverData && serverData.id !== undefined) {
                existsIndex = updatedData.findIndex(function (item) {
                    return item.id === serverData.id;
                });
            }

            if (method === "POST") {
                // CREATE : ajouter l'élément au cache
                if (existsIndex === -1) {
                    updatedData.push(serverData);
                    console.log("[sw.js] Cache mis à jour (POST) :", endpoint, "ajout de", serverData.id);
                } else {
                    // Si déjà présent, mettre à jour
                    updatedData[existsIndex] = serverData;
                    console.log("[sw.js] Cache mis à jour (POST) :", endpoint, "mise à jour de", serverData.id);
                }
            } else if (method === "PUT") {
                // UPDATE : mettre à jour l'élément existant
                if (existsIndex !== -1) {
                    updatedData[existsIndex] = serverData;
                    console.log("[sw.js] Cache mis à jour (PUT) :", endpoint, "mise à jour de", serverData.id);
                } else {
                    // L'élément n'existe pas dans le cache, on l'ajoute
                    updatedData.push(serverData);
                    console.log("[sw.js] Cache mis à jour (PUT) :", endpoint, "ajout de", serverData.id);
                }
            } else if (method === "DELETE") {
                // ★ NOUVEAU : DELETE - supprimer l'élément du cache
                const idToDelete = originalData && originalData.id ? originalData.id : (serverData ? serverData.id : null);
                if (idToDelete !== null) {
                    updatedData = updatedData.filter(function (item) {
                        return item.id !== idToDelete;
                    });
                    console.log("[sw.js] Cache mis à jour (DELETE) :", endpoint, "suppression de", idToDelete);
                }
            }

            // Sauvegarder le cache mis à jour
            IdbStore.cacheReadResponse(endpoint, updatedData).catch(function () { /* ignore */ });
        }
    }).catch(function () { /* ignore */ });
}

// ----------------------------------------------------------
// registerBackgroundSync()
// Enregistre une tâche de synchronisation différée. Si l'API
// n'est pas supportée (Safari notamment), on se contente de
// ne rien faire ici — le repli se fait via le message
// "REPLAY_PENDING" envoyé par app.js sur l'évènement "online"
// de la page (voir Étape 8).
// ----------------------------------------------------------
function registerBackgroundSync() {
    if ("sync" in self.registration) {
        return self.registration.sync.register(SYNC_TAG).catch(function (error) {
            console.warn("[sw.js] registerBackgroundSync() — échec :", error);
        });
    }
    console.warn("[sw.js] Background Sync non supportée par ce navigateur — repli manuel utilisé.");
    return Promise.resolve();
}

// ----------------------------------------------------------
// sync
// Déclenché par le navigateur au retour du réseau (si
// Background Sync est supportée), même app fermée.
// ----------------------------------------------------------
self.addEventListener("sync", function (event) {
    if (event.tag === SYNC_TAG) {
        console.log("[sw.js] sync — retour réseau détecté, relecture des PENDING.");
        event.waitUntil(replayPending());
    }
});

// ----------------------------------------------------------
// message
// Canal de repli pour les navigateurs sans Background Sync :
// app.js envoie ce message sur l'évènement "online" de la page.
// ----------------------------------------------------------
self.addEventListener("message", function (event) {
    if (event.data && event.data.type === "REPLAY_PENDING") {
        console.log("[sw.js] message REPLAY_PENDING reçu.");
        event.waitUntil(replayPending());
    }
});

// ----------------------------------------------------------
// replayPending()
// Renvoie chaque enregistrement PENDING au backend, avec la
// bonne méthode HTTP selon _operation, puis purge les
// entrées SYNCED anciennes.
// ----------------------------------------------------------
function replayPending() {

    return IdbStore.getPending().then(function (records) {

        if (records.length === 0) {
            console.log("[sw.js] replayPending() — rien à synchroniser.");
            return Promise.resolve();
        }

        console.log("[sw.js] replayPending() —", records.length, "enregistrement(s) à envoyer.");

        let promises = records.map(function (record) {
            return sendOneRecord(record);
        });

        return Promise.all(promises).then(function () {
            // Purge des entrées SYNCED après le cycle de sync
            return IdbStore.purgeSynced(7); // rétention de 7 jours, ajustable
        }).then(function () {
            notifyClients({ type: "SYNC_DONE" });
        });
    });
}

// ----------------------------------------------------------
// sendOneRecord()
// Construit la requête HTTP correcte selon _operation, l'envoie,
// et marque l'enregistrement SYNCED en cas de succès.
// L'échec est silencieux : l'enregistrement reste PENDING pour
// la prochaine tentative.
// ----------------------------------------------------------
function sendOneRecord(record) {

    const API_BASE_URL = 'http://localhost:8080';

    let httpMethod = { CREATE: "POST", UPDATE: "PUT", DELETE: "DELETE" }[record._operation];

    let fullUrl = API_BASE_URL + record._endpoint;
    if (record._operation !== "CREATE" && record.id !== undefined && record.id !== null) {
        fullUrl = API_BASE_URL + record._endpoint + "/" + record.id;
    }

    let payload = {};
    for (let key in record) {
        if (Object.prototype.hasOwnProperty.call(record, key) && key.indexOf("_") !== 0) {
            payload[key] = record[key];
        }
    }

    let fetchOptions = { method: httpMethod };
    if (httpMethod !== "DELETE") {
        fetchOptions.headers = { "Content-Type": "application/json" };
        fetchOptions.body = JSON.stringify(payload);
    }

    console.log("[sw.js] sendOneRecord() — méthode:", httpMethod, "| URL:", fullUrl);

    return fetch(fullUrl, fetchOptions)
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);

            if (record._operation === "CREATE") {
                return response.json().catch(function () { return {}; }).then(function (serverData) {
                    return IdbStore.markSynced(record._localId, serverData);
                });
            }
            return IdbStore.markSynced(record._localId, {});
        })
        .catch(function (error) {
            console.warn("[sw.js] sendOneRecord() — échec, reste PENDING :", record._localId, error);
        });
}

// ----------------------------------------------------------
// notifyClients()
// Informe toutes les pages ouvertes qu'un évènement de
// synchronisation a eu lieu, pour qu'elles rafraîchissent
// leur affichage (badge, listes).
// ----------------------------------------------------------
function notifyClients(message) {
    self.clients.matchAll().then(function (clients) {
        clients.forEach(function (client) {
            client.postMessage(message);
        });
    });
}

// ============================================================
// NOTIFICATIONS PUSH (Étape 8 du plan de migration)
// ============================================================

// ----------------------------------------------------------
// push
// Déclenché lorsqu'une notification push est reçue du serveur.
// Le navigateur réveille le Service Worker pour traiter
// l'évènement, même si la page est fermée.
// ----------------------------------------------------------
self.addEventListener("push", function (event) {

    console.log("[sw.js] push — notification reçue.");

    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.warn("[sw.js] push — payload non-JSON :", event.data);
        data = { title: "E-Camschool", body: "Une mise à jour est disponible." };
    }

    // Extraire le contenu de la notification
    let title = data.title || "E-Camschool";
    let body = data.body || "Consultez vos données.";
    let icon = data.icon || "/favicon.ico";
    let url = data.url || "/";

    // Options de la notification (affichage)
    let options = {
        body: body,
        icon: icon,
        badge: icon,
        tag: "ecamschool-notification",
        renotify: true,
        requireInteraction: true,
        data: { url: url }
    };

    // Afficher la notification à l'utilisateur
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ----------------------------------------------------------
// notificationclick
// Déclenché lorsque l'utilisateur clique sur une notification
// affichée. Ouvre l'application sur l'URL spécifiée.
// ----------------------------------------------------------
self.addEventListener("notificationclick", function (event) {

    console.log("[sw.js] notificationclick — l'utilisateur a cliqué sur une notification.");

    // Fermer la notification
    event.notification.close();

    // Récupérer l'URL associée à la notification
    let urlToOpen = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : "/";

    // Ouvrir ou focaliser l'application sur l'URL
    event.waitUntil(
        self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(function (clientList) {

            // Chercher un client déjà ouvert
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }

            // Aucun client ouvert → en ouvrir un nouveau
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// ----------------------------------------------------------
// notificationclose
// Déclenché lorsque l'utilisateur ferme la notification sans
// cliquer dessus. Utile pour du logging ou des analytics.
// ----------------------------------------------------------
self.addEventListener("notificationclose", function (event) {
    console.log("[sw.js] notificationclose — notification fermée par l'utilisateur.");
});