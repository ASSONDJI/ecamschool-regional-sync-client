// ============================================================
// FICHIER  : tools-3.5.library.IDBManager.js
//
// RÔLE     : Fournit un CRUD complet et autonome sur IndexedDB.
//            Conçu pour fonctionner EN PARALLÈLE de l'architecture
//            existante (SwRouter, ProxyDAO, SyncManager) sans
//            jamais la modifier ni l'impacter.
//
// PRINCIPE : Ce fichier est un module indépendant. Il ouvre SA
//            PROPRE connexion à la même base "ecamschool_idb"
//            mais via un objet séparé — aucun couplage avec
//            ProxyDAO_idb ou SwRouter.
//
// UTILISATION DEPUIS LE CONTRÔLEUR :
//
//   let idb = new tools.Library.IDBManager("ecamschool_idb", 1);
//   idb.open(["Enseignement"], function () {
//
//       // CREATE
//       idb.create("Enseignement", { id: 1, regime: "Francophone" },
//           function(id)  { console.log("Créé, id:", id); },
//           function(err) { console.error(err); }
//       );
//
//       // READ ONE
//       idb.readOne("Enseignement", 1,
//           function(record) { console.log(record); },
//           function(err)    { console.error(err); }
//       );
//
//       // READ ALL
//       idb.readAll("Enseignement",
//           function(records) { console.log(records); },
//           function(err)     { console.error(err); }
//       );
//
//       // UPDATE
//       idb.update("Enseignement", { id: 1, regime: "Anglophone" },
//           function()    { console.log("Mis à jour"); },
//           function(err) { console.error(err); }
//       );
//
//       // DELETE
//       idb.delete("Enseignement", 1,
//           function()    { console.log("Supprimé"); },
//           function(err) { console.error(err); }
//       );
//   });
//
// ============================================================

tools.Library.IDBManager = function (dbName, dbVersion) {

    // ----------------------------------------------------------
    // Paramètres de connexion à la base IndexedDB
    // Utilise les mêmes valeurs que ProxyDAO_idb pour pointer
    // sur la même base, sans partager l'objet de connexion.
    // ----------------------------------------------------------
    this.dbName    = dbName    || "ecamschool_idb";
    this.dbVersion = dbVersion || 1;

    // Référence à la connexion ouverte (null avant open())
    this.db = null;

    // ============================================================
    // open()
    // Rôle    : ouvre la connexion à IndexedDB et crée les stores
    //           manquants si nécessaire.
    //           DOIT être appelée une fois avant tout CRUD.
    //
    // Paramètres :
    //   - stores   : tableau de noms de stores à créer
    //                ex: ["Enseignement", "User"]
    //   - onReady  : callback() appelé quand la base est prête
    //   - onError  : callback(error) en cas d'échec
    // ============================================================
    this.open = function (stores, onReady, onError) {

        let context = this;

        // Incrémenter la version si on ajoute de nouveaux stores
        // afin de déclencher onupgradeneeded
        let request = indexedDB.open(this.dbName, this.dbVersion);

        // Appelé quand la version de la base doit être mise à jour
        request.onupgradeneeded = function (event) {

            let db = event.target.result;
            console.log("[IDBManager] onupgradeneeded — création des stores manquants");

            for (let i = 0; i < stores.length; i++) {
                let storeName = stores[i];

                // Ne créer le store que s'il n'existe pas encore
                // pour ne pas écraser les données existantes
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "id" });
                    console.log("[IDBManager] Store créé :", storeName);
                }
            }

            // Créer le store _pending s'il n'existe pas
            // (partagé avec ProxyDAO_idb pour la synchronisation)
            if (!db.objectStoreNames.contains("_pending")) {
                db.createObjectStore("_pending", {
                    autoIncrement: true,
                    keyPath      : "_localId"
                });
                console.log("[IDBManager] Store _pending créé");
            }
        };

        request.onsuccess = function (event) {
            context.db = event.target.result;
            console.log("[IDBManager] Base ouverte :", context.dbName);
            if (onReady) onReady();
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] Erreur ouverture :", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // _checkDB()
    // Rôle    : vérifie que la base est ouverte avant une opération.
    //           Méthode interne utilisée par toutes les méthodes CRUD.
    // Retourne : true si OK, false sinon
    // ============================================================
    this._checkDB = function (operationName) {
        if (this.db === null) {
            console.error("[IDBManager] " + operationName +
                          "() — base non ouverte. Appelez open() d'abord.");
            return false;
        }
        return true;
    };

    // ============================================================
    // CREATE
    // Rôle    : insère un nouvel enregistrement dans le store.
    //           Si un enregistrement avec le même id existe déjà,
    //           une erreur est retournée (utiliser update() à la place).
    //
    // Paramètres :
    //   - store     : nom du store (ex: "Enseignement")
    //   - data      : objet à insérer — DOIT avoir un champ "id"
    //   - onSuccess : callback(id) appelé avec la clé insérée
    //   - onError   : callback(error) en cas d'échec
    // ============================================================
    this.create = function (store, data, onSuccess, onError) {

        if (!this._checkDB("create")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readwrite");
        let objectStore = transaction.objectStore(store);

        // add() échoue si l'id existe déjà (contrairement à put())
        let request = objectStore.add(data);

        request.onsuccess = function (event) {
            let insertedId = event.target.result;
            console.log("[IDBManager] create() OK — store:", store, "| id:", insertedId);
            if (onSuccess) onSuccess(insertedId);
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] create() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // READ ONE
    // Rôle    : lit un enregistrement unique par sa clé primaire.
    //
    // Paramètres :
    //   - store     : nom du store (ex: "Enseignement")
    //   - id        : valeur de la clé primaire (ex: 1716)
    //   - onSuccess : callback(record) — record est null si non trouvé
    //   - onError   : callback(error)
    // ============================================================
    this.readOne = function (store, id, onSuccess, onError) {

        if (!this._checkDB("readOne")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readonly");
        let objectStore = transaction.objectStore(store);

        let request = objectStore.get(id);

        request.onsuccess = function (event) {
            let record = event.target.result || null;
            console.log("[IDBManager] readOne() — store:", store,
                        "| id:", id, "| trouvé:", record !== null);
            if (onSuccess) onSuccess(record);
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] readOne() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // READ ALL
    // Rôle    : lit tous les enregistrements d'un store.
    //
    // Paramètres :
    //   - store     : nom du store (ex: "Enseignement")
    //   - onSuccess : callback(records) — tableau, vide si aucun
    //   - onError   : callback(error)
    // ============================================================
    this.readAll = function (store, onSuccess, onError) {

        if (!this._checkDB("readAll")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readonly");
        let objectStore = transaction.objectStore(store);

        let request = objectStore.getAll();

        request.onsuccess = function (event) {
            let records = event.target.result || [];
            console.log("[IDBManager] readAll() — store:", store,
                        "| count:", records.length);
            if (onSuccess) onSuccess(records);
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] readAll() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // UPDATE
    // Rôle    : met à jour un enregistrement existant.
    //           Si l'id n'existe pas, un nouvel enregistrement
    //           est créé (comportement natif de put()).
    //           Pour une mise à jour stricte, utiliser readOne()
    //           avant update() pour vérifier l'existence.
    //
    // Paramètres :
    //   - store     : nom du store (ex: "Enseignement")
    //   - data      : objet mis à jour — DOIT avoir un champ "id"
    //   - onSuccess : callback() après succès
    //   - onError   : callback(error)
    // ============================================================
    this.update = function (store, data, onSuccess, onError) {

        if (!this._checkDB("update")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readwrite");
        let objectStore = transaction.objectStore(store);

        // put() insère ou remplace — contrairement à add()
        let request = objectStore.put(data);

        request.onsuccess = function (event) {
            console.log("[IDBManager] update() OK — store:", store,
                        "| id:", data.id);
            if (onSuccess) onSuccess();
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] update() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // DELETE
    // Rôle    : supprime un enregistrement par sa clé primaire.
    //           Aucune erreur si l'id n'existe pas.
    //
    // Paramètres :
    //   - store     : nom du store (ex: "Enseignement")
    //   - id        : valeur de la clé primaire à supprimer
    //   - onSuccess : callback() après suppression
    //   - onError   : callback(error)
    // ============================================================
    this.delete = function (store, id, onSuccess, onError) {

        if (!this._checkDB("delete")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readwrite");
        let objectStore = transaction.objectStore(store);

        let request = objectStore.delete(id);

        request.onsuccess = function () {
            console.log("[IDBManager] delete() OK — store:", store, "| id:", id);
            if (onSuccess) onSuccess();
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] delete() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // CLEAR
    // Rôle    : vide complètement un store.
    //           Utile pour les tests (reset avant chaque test).
    //
    // Paramètres :
    //   - store     : nom du store à vider
    //   - onSuccess : callback() après vidage
    //   - onError   : callback(error)
    // ============================================================
    this.clear = function (store, onSuccess, onError) {

        if (!this._checkDB("clear")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readwrite");
        let objectStore = transaction.objectStore(store);

        let request = objectStore.clear();

        request.onsuccess = function () {
            console.log("[IDBManager] clear() OK — store:", store);
            if (onSuccess) onSuccess();
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] clear() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };

    // ============================================================
    // COUNT
    // Rôle    : compte le nombre d'enregistrements dans un store.
    //           Utile pour les assertions dans les tests.
    //
    // Paramètres :
    //   - store     : nom du store
    //   - onSuccess : callback(count) avec le nombre
    //   - onError   : callback(error)
    // ============================================================
    this.count = function (store, onSuccess, onError) {

        if (!this._checkDB("count")) {
            if (onError) onError("Base non ouverte");
            return;
        }

        let transaction = this.db.transaction([store], "readonly");
        let objectStore = transaction.objectStore(store);

        let request = objectStore.count();

        request.onsuccess = function (event) {
            let total = event.target.result;
            console.log("[IDBManager] count() — store:", store, "| total:", total);
            if (onSuccess) onSuccess(total);
        };

        request.onerror = function (event) {
            let err = event.target.error;
            console.error("[IDBManager] count() erreur — store:", store, "|", err);
            if (onError) onError(err);
        };
    };
};
