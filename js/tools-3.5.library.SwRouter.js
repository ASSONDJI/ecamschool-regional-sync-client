// ===========================================================
//
// MODIFICATIONS ARCHITECTURE :
//   1. Ajout de tools.Library.Proxy (classe abstraite)
//      ExternalProxyRouter_AJAX et ExternalProxyRouter_IndexDB
//      en héritent formellement via Proxy.call(this)
//   2. ExternalProxyRouter_AJAX et ExternalProxyRouter_IndexDB
//      passent de <<interface>> à <<abstract>>
//      (ils portent du code commun héritable)
//   3. SwRouter porte DelegateComponent et SyncManager
//      (inchangé)
//
// 
// ============================================================


// ============================================================
// Proxy  — classe abstraite
//
// Rôle   : définit le contrat commun à tous les ProxyRouter.
//          Porte les deux méthodes génériques delegate() et
//          update_delegate() que chaque ExternalProxyRouter
//          DOIT redéfinir (override) selon son canal.
//
// RELATION UML :
//   ExternalProxyRouter_AJAX    △─── Proxy
//   ExternalProxyRouter_IndexDB △─── Proxy
//   Proxy ◆── DelegateComponent  (composition interne)
// ============================================================
tools.Library.Proxy = function () {

    // ----------------------------------------------------------
    // delegate()
    // Rôle    : méthode abstraite — déléguer une opération de
    //           lecture au canal géré par ce proxy.
    //           DOIT être redéfinie dans chaque sous-classe.
    // Paramètres :
    //   - uri      : URL / clé de la requête
    //   - table    : nom de la table (ex: "Enseignement")
    //   - req      : objet HTTPRequest de l'application
    //   - attrib   : attribut à remplir dans req
    //   - filter   : filtre (peut être null)
    //   - keyCols  : colonnes clés (tableau)
    // ----------------------------------------------------------
    this.delegate = function (uri, table, req, attrib, filter, keyCols) {
        throw new Error(
            "[Proxy] delegate() est abstraite — " +
            "elle doit être redéfinie dans la sous-classe."
        );
    };

    // ----------------------------------------------------------
    // update_delegate()
    // Rôle    : méthode abstraite — mettre à jour la source de
    //           données gérée par ce proxy.
    //           DOIT être redéfinie dans chaque sous-classe.
    // Paramètres :
    //   - uri      : URL / clé de la requête
    //   - table    : nom de la table
    //   - elements : tableau de données à sauvegarder
    // ----------------------------------------------------------
    this.update_delegate = function (uri, table, elements) {
        throw new Error(
            "[Proxy] update_delegate() est abstraite — " +
            "elle doit être redéfinie dans la sous-classe."
        );
    };

    // ----------------------------------------------------------
    // proxy()
    // Rôle    : méthode abstraite — retourner le ProxyDAO
    //           géré par ce router.
    //           DOIT être redéfinie dans chaque sous-classe.
    // ----------------------------------------------------------
    this.proxy = function () {
        throw new Error(
            "[Proxy] proxy() est abstraite — " +
            "elle doit être redéfinie dans la sous-classe."
        );
    };

    // ----------------------------------------------------------
    // isAvailable()
    // Rôle    : méthode abstraite — indiquer si ce canal
    //           est utilisable dans l'état réseau actuel.
    //           DOIT être redéfinie dans chaque sous-classe.
    // ----------------------------------------------------------
    this.isAvailable = function () {
        throw new Error(
            "[Proxy] isAvailable() est abstraite — " +
            "elle doit être redéfinie dans la sous-classe."
        );
    };
};


// ============================================================
// ExternalProxyRouter_AJAX  — <<abstract>> — canal en ligne
//
// Rôle   : gère le canal AJAX (serveur).
//          Hérite de Proxy et redéfinit toutes ses méthodes.
//          Contient ProxyDAO_mat par composition.
//
// RELATION UML :
//   ExternalProxyRouter_AJAX △─── Proxy   (héritage)
//   ExternalProxyRouter_AJAX ◆─── ProxyDAO_mat  (composition)
// ============================================================
tools.Library.ExternalProxyRouter_AJAX = function (proxyDAO_mat) {

    // Héritage de Proxy — récupère le contrat abstrait
    tools.Library.Proxy.call(this);

    // ProxyDAO_mat inclus par COMPOSITION dans ce router
    this.proxyDAO_mat = proxyDAO_mat;

    // ----------------------------------------------------------
    // proxy()  [redéfinition de Proxy.proxy()]
    // Rôle : expose le ProxyDAO_mat géré par ce router.
    // ----------------------------------------------------------
    this.proxy = function () {
        return this.proxyDAO_mat;
    };

    // ----------------------------------------------------------
    // isAvailable()  [redéfinition de Proxy.isAvailable()]
    // Rôle : retourne true si le navigateur est en ligne.
    // ----------------------------------------------------------
    this.isAvailable = function () {
        let available = navigator.onLine;
        console.log("[ExternalProxyRouter_AJAX] isAvailable →", available);
        return available;
    };

    // ----------------------------------------------------------
    // delegate()  [redéfinition de Proxy.delegate()]
    // Rôle : délégue la lecture au ProxyDAO_mat (canal AJAX).
    // ----------------------------------------------------------
    this.delegate = function (uri, table, req, attrib, filter, keyCols) {
        console.log("[ExternalProxyRouter_AJAX] delegate → ProxyDAO_mat");
        this.proxyDAO_mat.delegate(uri, table, req, attrib, filter, keyCols);
    };

    // ----------------------------------------------------------
    // update_delegate()  [redéfinition de Proxy.update_delegate()]
    // Rôle : met à jour la source AJAX et sauvegarde en local.
    // ----------------------------------------------------------
    this.update_delegate = function (uri, table, elements) {
        console.log("[ExternalProxyRouter_AJAX] update_delegate → ProxyDAO_mat");
        this.proxyDAO_mat.update_delegate(uri, table, elements);
    };
};


// ============================================================
// ExternalProxyRouter_IndexDB  — <<abstract>> — canal hors ligne
//
// Rôle   : gère le canal IndexedDB (stockage local).
//          Hérite de Proxy et redéfinit toutes ses méthodes.
//          Contient ProxyDAO_idb par composition.
//
// RELATION UML :
//   ExternalProxyRouter_IndexDB △─── Proxy        (héritage)
//   ExternalProxyRouter_IndexDB ◆─── ProxyDAO_idb (composition)
// ============================================================
tools.Library.ExternalProxyRouter_IndexDB = function (proxyDAO_idb) {

    // Héritage de Proxy — récupère le contrat abstrait
    tools.Library.Proxy.call(this);

    // ProxyDAO_idb inclus par COMPOSITION dans ce router
    this.proxyDAO_idb = proxyDAO_idb;

    // ----------------------------------------------------------
    // proxy()  [redéfinition de Proxy.proxy()]
    // Rôle : expose le ProxyDAO_idb géré par ce router.
    // ----------------------------------------------------------
    this.proxy = function () {
        return this.proxyDAO_idb;
    };

    // ----------------------------------------------------------
    // isAvailable()  [redéfinition de Proxy.isAvailable()]
    // Rôle : retourne true si IndexedDB est ouverte et dispo.
    // ----------------------------------------------------------
    this.isAvailable = function () {
        let available = (this.proxyDAO_idb.db !== null) &&
                        (typeof indexedDB !== "undefined");
        console.log("[ExternalProxyRouter_IndexDB] isAvailable →", available);
        return available;
    };

    // ----------------------------------------------------------
    // delegate()  [redéfinition de Proxy.delegate()]
    // Rôle : délégue la lecture au ProxyDAO_idb (IndexedDB).
    // ----------------------------------------------------------
    this.delegate = function (uri, table, req, attrib, filter, keyCols) {
        console.log("[ExternalProxyRouter_IndexDB] delegate → ProxyDAO_idb");
        this.proxyDAO_idb.delegate(uri, table, req, attrib, filter, keyCols);
    };

    // ----------------------------------------------------------
    // update_delegate()  [redéfinition de Proxy.update_delegate()]
    // Rôle : sauvegarde les données dans IndexedDB.
    // ----------------------------------------------------------
    this.update_delegate = function (uri, table, elements) {
        console.log("[ExternalProxyRouter_IndexDB] update_delegate → ProxyDAO_idb");
        this.proxyDAO_idb.update_delegate(uri, table, elements);
    };
};


// ============================================================
// DelegateComponent
//
// Rôle   : objet interne qui traite les opérations CRUD
//          déclenchées depuis le contrôleur.
//          Point d'entrée unique pour toute écriture.
//          Utilise ProxyDAO_mat.push() qui choisit
//          AJAX (en ligne) ou IndexedDB (hors ligne).
//
// RELATION UML :
//   SwRouter ◆── DelegateComponent  (composition)
//   DelegateComponent ──utilise──> ProxyDAO_mat
// ============================================================
tools.Library.DelegateComponent = function (proxyDAO_mat) {

    // ProxyDAO_mat — choix automatique AJAX ou IndexedDB
    this.proxyDAO_mat = proxyDAO_mat;

    // ----------------------------------------------------------
    // create()
    // Rôle : créer un nouvel enregistrement.
    //        En ligne  → POST backend via ProxyDAO_mat.push()
    //        Hors ligne → sauvegarde PENDING via ProxyDAO_idb
    // Paramètres :
    //   - uri       : URL backend (ex: "/enseignements")
    //   - table     : nom de la table (ex: "Enseignement")
    //   - data      : données du formulaire
    //   - onSuccess : callback(reponse) après succès
    //   - onError   : callback(error) après échec
    // ----------------------------------------------------------
    this.create = function (uri, table, data, onSuccess, onError) {
        console.log("[DelegateComponent] create() →", table);
        this.proxyDAO_mat.push(uri, table, data, onSuccess, onError);
    };

    // ----------------------------------------------------------
    // update()
    // Rôle : mettre à jour un enregistrement existant (PUT).
    //        En ligne  → PUT backend
    //        Hors ligne → sauvegarde PENDING
    // ----------------------------------------------------------
    this.update = function (uri, table, data, onSuccess, onError) {

        console.log("[DelegateComponent] update() →", table);

        let context = this;
        let fullUri = uri + "/" + data.id;

        if (navigator.onLine) {

            $.ajax({
                type       : "PUT",
                url        : fullUri,
                data       : JSON.stringify(data),
                contentType: "application/json",
                dataType   : "json",

                success: function (reponse) {
                    console.log("[DelegateComponent] update() succès :", table);
                    if (onSuccess) onSuccess(reponse);
                },

                error: function (requestH, error) {
                    console.error("[DelegateComponent] update() erreur :", error);
                    // Réseau perdu pendant la requête → PENDING
                    if (context.proxyDAO_mat.proxyDAO_idb !== null) {
                        context.proxyDAO_mat.proxyDAO_idb.save(table, data);
                    }
                    if (onError) onError(error);
                }
            });

        } else {
            // Hors ligne → sauvegarder localement en PENDING
            if (this.proxyDAO_mat.proxyDAO_idb !== null) {
                this.proxyDAO_mat.proxyDAO_idb.save(table, data);
                if (onSuccess) onSuccess(null);
            }
        }
    };

    // ----------------------------------------------------------
    // delete()
    // Rôle : supprimer un enregistrement (DELETE).
    //        En ligne  → DELETE backend
    //        Hors ligne → intention de suppression en PENDING
    // ----------------------------------------------------------
    this.delete = function (uri, table, id, onSuccess, onError) {

        console.log("[DelegateComponent] delete() →", table, id);

        let context = this;

        if (navigator.onLine) {

            $.ajax({
                type    : "DELETE",
                url     : uri + "/" + id,
                dataType: "json",

                success: function (reponse) {
                    console.log("[DelegateComponent] delete() succès :", id);
                    if (onSuccess) onSuccess(reponse);
                },

                error: function (requestH, error) {
                    console.error("[DelegateComponent] delete() erreur :", error);
                    if (onError) onError(error);
                }
            });

        } else {
            // Hors ligne → sauvegarder l'intention de suppression
            console.warn("[DelegateComponent] delete() hors ligne — différé");
            if (this.proxyDAO_mat.proxyDAO_idb !== null) {
                this.proxyDAO_mat.proxyDAO_idb.save(
                    table,
                    { id: id, _operation: "DELETE" }
                );
                if (onSuccess) onSuccess(null);
            }
        }
    };
};


// ============================================================
// SwRouter  — ProxyRouter / ServiceWorker
//
// Rôle   : objet pivot central qui détecte l'état réseau
//          et route les requêtes vers le bon canal.
//
// RELATION UML :
//   SwRouter ◆── candidates : ExternalProxyRouter[]
//   SwRouter ◆── DelegateComponent
//   SwRouter ◆── SyncManager
//   Managers_api ◆── SwRouter  (SwRouter est attribut de Managers_api)
// ============================================================
tools.Library.SwRouter = function (dao_mat, stores) {

    // ----------------------------------------------------------
    // Initialisation des deux ProxyDAO
    // ----------------------------------------------------------
    this.proxyDAO_mat = new tools.Library.ProxyDAO_mat(dao_mat);
    this.proxyDAO_idb = new tools.Library.ProxyDAO_idb(dao_mat);

    // Injection de proxyDAO_idb dans proxyDAO_mat (composition)
    this.proxyDAO_mat.setProxyIdb(this.proxyDAO_idb);

    // ----------------------------------------------------------
    // Initialisation des deux ExternalProxyRouter (candidates)
    // Les deux héritent de Proxy via Proxy.call(this)
    // ----------------------------------------------------------
    let routerAJAX = new tools.Library.ExternalProxyRouter_AJAX(this.proxyDAO_mat);
    let routerIDB  = new tools.Library.ExternalProxyRouter_IndexDB(this.proxyDAO_idb);

    // candidates[] : les deux canaux disponibles
    this.candidates = [routerAJAX, routerIDB];

    // ----------------------------------------------------------
    // DelegateComponent — composé dans SwRouter
    // Point d'entrée pour toutes les opérations CRUD (écriture)
    // Accessible depuis les contrôleurs via swRouter.delegate
    // ----------------------------------------------------------
    this.delegate = new tools.Library.DelegateComponent(this.proxyDAO_mat);

    // ----------------------------------------------------------
    // SyncManager — composé dans SwRouter
    // Écoute le retour réseau et synchronise les PENDING
    // ----------------------------------------------------------
    this.syncManager = new tools.Library.SyncManager(
        this.proxyDAO_idb,
        dao_mat
    );

    // Enregistrer chaque table dans le SyncManager
    let context = this;
    for (let i = 0; i < stores.length; i++) {
        this.syncManager.addTable(stores[i]);
    }

    // Ouvrir IndexedDB puis démarrer le SyncManager
    this.proxyDAO_idb.openDB(stores, function () {
        console.log("[SwRouter] IndexedDB prêt. SwRouter opérationnel.");
        context.syncManager.start();
    });

    // Écouter la perte de réseau
    window.addEventListener("offline", function () {
        console.log("[SwRouter] Réseau perdu → mode hors ligne activé.");
    });

    // ----------------------------------------------------------
    // candidates()
    // Rôle : retourner la liste des routers disponibles.
    // ----------------------------------------------------------
    this.getCandidates = function () {
        return this.candidates;
    };

    // ----------------------------------------------------------
    // proxy()
    // Rôle : retourner le router actif selon l'état réseau.
    // ----------------------------------------------------------
    this.proxy = function () {
        return this.choose_route();
    };

    // ----------------------------------------------------------
    // choose_route()  ← PATTERN STRATEGY
    // Rôle : choisir quel ExternalProxyRouter utiliser.
    //        En ligne  → candidates[0] (AJAX)
    //        Hors ligne → candidates[1] (IndexedDB)
    //        Peut être redéfinie dans une sous-classe pour
    //        une stratégie personnalisée.
    // ----------------------------------------------------------
    this.choose_route = function () {
        if (navigator.onLine) {
            console.log("[SwRouter] choose_route → AJAX (en ligne)");
            return this.candidates[0];
        } else {
            console.log("[SwRouter] choose_route → IndexedDB (hors ligne)");
            return this.candidates[1];
        }
    };

    // ----------------------------------------------------------
    // route()
    // Rôle : point d'entrée lecture pour les Managers.
    //        Reçoit tous les paramètres et délègue au bon router.
    // ----------------------------------------------------------
    this.route = function (uri, table, req, attrib, filter, keyCols) {
        console.log("[SwRouter] route() →", uri, "| table :", table);
        let activeRouter = this.choose_route();
        activeRouter.delegate(uri, table, req, attrib, filter, keyCols);
    };
};
