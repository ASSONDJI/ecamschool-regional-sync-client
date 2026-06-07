// ============================================================
//
// RÔLE    : Gère la synchronisation des données écrites
//           hors ligne (statut PENDING dans IndexedDB) vers
//           le backend au retour du réseau.
//
// RELATIONS :
//   - Composé dans SwRouter (SwRouter ◆→ SyncManager)
//   - Utilise ProxyDAO_idb  (getPending, markSynced)
//   - Utilise DAOContainer_mat ($.ajax POST vers backend)
//
// FLUX :
//   window "online" détecté
//       → sync(table) pour chaque table enregistrée
//           → proxyDAO_idb.getPending(table)
//               → pour chaque record PENDING :
//                   → $.ajax POST vers backend
//                       → succès : proxyDAO_idb.markSynced()
//                       → échec  : reste PENDING, retry suivant
// ============================================================

tools.Library.SyncManager = function (proxyDAO_idb, dao_mat) {

    // ProxyDAO_idb pour lire/marquer les enregistrements PENDING
    this.proxyDAO_idb = proxyDAO_idb;

    // DAOContainer_mat pour les appels $.ajax vers le backend
    this.dao_mat = dao_mat;

    // Liste des tables à surveiller pour la synchronisation
    // Alimentée par addTable() depuis SwRouter
    this.tables = [];

    // Flag pour éviter deux synchronisations simultanées
    this._syncing = false;

    // ----------------------------------------------------------
    // addTable()
    // Rôle : enregistrer une table à surveiller.
    //        Appelé depuis SwRouter pour chaque store.
    // Paramètre :
    //   - table : nom de la table (ex: "Enseignement")
    // ----------------------------------------------------------
    this.addTable = function (table) {
        if (this.tables.indexOf(table) === -1) {
            this.tables.push(table);
            console.log("[SyncManager] Table enregistrée :", table);
        }
    };

    // ----------------------------------------------------------
    // start()
    // Rôle : démarrer l'écoute du retour réseau.
    //        Appelé une seule fois depuis SwRouter après
    //        l'ouverture de IndexedDB.
    //        Lance aussi une première sync si déjà en ligne.
    // ----------------------------------------------------------
    this.start = function () {

        let context = this;

        // Écouter le retour du réseau
        window.addEventListener("online", function () {
            console.log("[SyncManager] Réseau détecté → lancement synchronisation");
            context.syncAll();
        });

        // Si déjà en ligne au démarrage → vérifier les PENDING
        if (navigator.onLine) {
            console.log("[SyncManager] Démarrage en ligne → vérification PENDING");
            this.syncAll();
        }

        console.log("[SyncManager] Démarré. Tables surveillées :", this.tables);
    };

    // ----------------------------------------------------------
    // syncAll()
    // Rôle : lancer la synchronisation pour toutes les tables
    //        enregistrées. Protégé contre les doublons via
    //        le flag _syncing.
    // ----------------------------------------------------------
    this.syncAll = function () {

        if (this._syncing) {
            console.log("[SyncManager] Synchronisation déjà en cours — ignoré");
            return;
        }

        this._syncing = true;
        console.log("[SyncManager] syncAll() → tables :", this.tables);

        let context   = this;
        let remaining = this.tables.length;

        if (remaining === 0) {
            this._syncing = false;
            return;
        }

        // Lancer la sync pour chaque table
        for (let i = 0; i < this.tables.length; i++) {
            this.sync(this.tables[i], function () {
                remaining--;
                if (remaining === 0) {
                    context._syncing = false;
                    console.log("[SyncManager] syncAll() terminé.");
                }
            });
        }
    };

    // ----------------------------------------------------------
    // sync()
    // Rôle : synchroniser tous les enregistrements PENDING
    //        d'une table spécifique vers le backend.
    //
    // Paramètres :
    //   - table    : nom de la table (ex: "Enseignement")
    //   - onDone   : callback appelé quand la table est terminée
    // ----------------------------------------------------------
    this.sync = function (table, onDone) {

        let context = this;

        console.log("[SyncManager] sync() →", table);

        // Récupérer tous les enregistrements PENDING pour cette table
        this.proxyDAO_idb.getPending(table, function (records) {

            if (records.length === 0) {
                console.log("[SyncManager] Aucun PENDING pour :", table);
                if (onDone) onDone();
                return;
            }

            console.log("[SyncManager]", records.length, "PENDING à synchroniser pour :", table);

            let remaining = records.length;

            // Envoyer chaque enregistrement au backend
            for (let i = 0; i < records.length; i++) {
                context._sendRecord(table, records[i], function () {
                    remaining--;
                    if (remaining === 0) {
                        console.log("[SyncManager] sync() terminé pour :", table);
                        if (onDone) onDone();
                    }
                });
            }
        });
    };

    // ----------------------------------------------------------
    // _sendRecord()
    // Rôle : envoyer un enregistrement PENDING au backend
    //        via $.ajax POST, puis appeler markSynced() si OK.
    //
    // Paramètres :
    //   - table    : nom de la table
    //   - record   : l'enregistrement PENDING complet
    //   - onDone   : callback après succès ou échec
    // ----------------------------------------------------------
    this._sendRecord = function (table, record, onDone) {

        let context = this;

        // Construire l'URL backend pour cette table
        // ex: "Enseignement" → "/enseignements"
        let uri = tools.AppLib.constantes.API_BASE_URL +
                  "/" + table.toLowerCase() + "s";

        // Nettoyer les métadonnées internes avant envoi
        // Le backend ne doit pas recevoir _localId, _table, etc.
        let payload = {};
        for (let key in record) {
            if (Object.hasOwnProperty.call(record, key) &&
                key.indexOf("_") !== 0) {
                payload[key] = record[key];
            }
        }

        console.log("[SyncManager] Envoi au backend :", uri, payload);

        $.ajax({
            type       : "POST",
            url        : uri,
            data       : JSON.stringify(payload),
            contentType: "application/json",
            dataType   : "json",

            success: function (reponse) {
                console.log("[SyncManager] Envoi réussi →", table, record._localId);
                // Marquer comme SYNCED dans IndexedDB
                context.onSuccess(record._localId, onDone);
            },

            error: function (jqXHR, textStatus, error) {
                console.error("[SyncManager] Échec envoi →", table, error);
                // Laisser en PENDING pour la prochaine tentative
                context.onError(table, record._localId, error, onDone);
            }
        });
    };

    // ----------------------------------------------------------
    // onSuccess()
    // Rôle : appelé après envoi réussi au backend.
    //        Marque l'enregistrement SYNCED dans IndexedDB.
    //
    // Paramètres :
    //   - localId  : clé _localId dans le store _pending
    //   - onDone   : callback après marquage
    // ----------------------------------------------------------
    this.onSuccess = function (localId, onDone) {
        console.log("[SyncManager] onSuccess() → markSynced localId :", localId);
        this.proxyDAO_idb.markSynced(localId, function () {
            console.log("[SyncManager] localId", localId, "marqué SYNCED");
            if (onDone) onDone();
        });
    };

    // ----------------------------------------------------------
    // onError()
    // Rôle : appelé après un échec d'envoi.
    //        L'enregistrement reste PENDING pour la prochaine
    //        tentative au prochain retour réseau.
    //
    // Paramètres :
    //   - table    : nom de la table
    //   - localId  : clé _localId dans le store _pending
    //   - error    : message d'erreur
    //   - onDone   : callback
    // ----------------------------------------------------------
    this.onError = function (table, localId, error, onDone) {
        console.warn("[SyncManager] onError() → localId:", localId,
                     "| table:", table, "| restera PENDING. Erreur:", error);
        if (onDone) onDone();
    };

    // ----------------------------------------------------------
    // getStatus()
    // Rôle : retourne un résumé du statut de synchronisation.
    //        Utile pour afficher un badge dans l'UI.
    //        ex: { "Enseignement": 3, "User": 0 }
    //
    // Paramètre :
    //   - callback : function(status) appelée avec le résumé
    // ----------------------------------------------------------
    this.getStatus = function (callback) {

        let context = this;
        let status  = {};
        let remaining = this.tables.length;

        if (remaining === 0) {
            callback(status);
            return;
        }

        for (let i = 0; i < this.tables.length; i++) {
            (function (table) {
                context.proxyDAO_idb.getPending(table, function (records) {
                    status[table] = records.length;
                    remaining--;
                    if (remaining === 0) {
                        console.log("[SyncManager] getStatus() →", status);
                        callback(status);
                    }
                });
            })(this.tables[i]);
        }
    };
};
