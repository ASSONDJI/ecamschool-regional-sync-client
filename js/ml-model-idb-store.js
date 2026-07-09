/**
 * ============================================================
 * ML MODEL IDB STORE
 * ============================================================
 *
 * Base IndexedDB dédiée à la persistance des modèles de prédiction
 * entraînés (Predictor.toJSON()), complètement SÉPARÉE de toute base
 * utilisée par la synchronisation Client/Serveur.
 *
 * Nom de la base : ecamschool_ml_store
 * Object store   : trained_models (keyPath: "name")
 *
 * Rôle UNIQUE de ce fichier : lire/écrire des modèles entraînés dans
 * IndexedDB. Il ne connaît rien de la Matrice, du Predictor, ni du
 * réseau — voir ml-data-source.js pour la partie "parler au serveur",
 * et prediction-tab-controller.js pour l'orchestration des deux.
 *
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-07-06
 * ============================================================
 */

(function () {
    'use strict';

    var DB_NAME = "ecamschool_ml_store";
    var DB_VERSION = 1;
    var STORE_NAME = "trained_models";

    /**
     * Promesse de connexion à la base, mise en cache pour ne pas
     * rouvrir une connexion IndexedDB à chaque appel.
     * @type {Promise<IDBDatabase>|null}
     */
    var _dbPromise = null;

    /**
     * Ouvre (ou crée si absente) la base ecamschool_ml_store et son
     * object store trained_models.
     *
     * @returns {Promise<IDBDatabase>}
     * @private
     */
    function _openDb() {
        if (_dbPromise) {
            return _dbPromise;
        }

        _dbPromise = new Promise(function (resolve, reject) {
            if (!window.indexedDB) {
                reject(new Error("❌ IndexedDB n'est pas disponible dans ce navigateur."));
                return;
            }

            var request = window.indexedDB.open(DB_NAME, DB_VERSION);

            // Appelé uniquement à la création de la base, ou lors d'une
            // montée de version (DB_VERSION incrémenté plus tard).
            request.onupgradeneeded = function (event) {
                var db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "name" });
                    console.log("✅ Object store '" + STORE_NAME + "' créé dans '" + DB_NAME + "'.");
                }
            };

            request.onsuccess = function (event) {
                var db = event.target.result;

                // Si une autre partie de l'app (ou un autre onglet)
                // fait monter la version de la base plus tard, cette
                // connexion doit se fermer proprement pour ne pas
                // bloquer la nouvelle version.
                db.onversionchange = function () {
                    db.close();
                    _dbPromise = null;
                    console.warn("⚠️ Connexion à '" + DB_NAME + "' fermée (changement de version ailleurs).");
                };

                resolve(db);
            };

            request.onerror = function (event) {
                _dbPromise = null; // on autorise une nouvelle tentative au prochain appel
                reject(new Error("❌ Impossible d'ouvrir la base '" + DB_NAME + "' : " +
                    (event.target.error ? event.target.error.message : "erreur inconnue")));
            };
        });

        return _dbPromise;
    }

    /**
     * MlModelIdbStore - API publique de persistance des modèles entraînés.
     *
     * Rattaché sous tools.Library, par cohérence avec le reste du
     * framework (ex. tools.Library.MlDataSource) : dans le code, on
     * l'utilisera donc via tools.Library.MlModelIdbStore.xxx().
     */
    tools.Library.MlModelIdbStore = {

        /**
         * Sauvegarde (ou remplace) un modèle entraîné sous un nom donné.
         *
         * @param {string} name - Identifiant du modèle (ex: "regime-predictor")
         * @param {Object} serializedPredictor - Résultat de predictor.toJSON()
         * @param {Object} [metadata] - Métadonnées libres, ex :
         *        { trainedAt: Date.now(), source: "serveur", rowCount: 1875,
         *          featureCols: [...], targetCol: "reussite" }
         * @returns {Promise<Object>} Le record sauvegardé
         */
        saveModel: function (name, serializedPredictor, metadata) {
            if (!name || typeof name !== 'string') {
                return Promise.reject(new Error("❌ saveModel() : 'name' doit être une chaîne non vide."));
            }
            if (!serializedPredictor) {
                return Promise.reject(new Error("❌ saveModel() : 'serializedPredictor' est requis."));
            }

            var record = {
                name: name,
                serializedPredictor: serializedPredictor,
                metadata: metadata || {}
            };

            return _openDb().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(STORE_NAME, "readwrite");
                    var store = tx.objectStore(STORE_NAME);
                    var request = store.put(record);

                    request.onsuccess = function () {
                        console.log("✅ Modèle '" + name + "' sauvegardé dans '" + DB_NAME + "'.");
                        resolve(record);
                    };

                    request.onerror = function (event) {
                        reject(new Error("❌ Échec de la sauvegarde du modèle '" + name + "' : " +
                            (event.target.error ? event.target.error.message : "erreur inconnue")));
                    };
                });
            });
        },

        /**
         * Charge un modèle entraîné sauvegardé sous un nom donné.
         *
         * @param {string} name - Identifiant du modèle (ex: "regime-predictor")
         * @returns {Promise<{serializedPredictor: Object, metadata: Object}|null>}
         *          null si aucun modèle n'est enregistré sous ce nom
         */
        loadModel: function (name) {
            if (!name || typeof name !== 'string') {
                return Promise.reject(new Error("❌ loadModel() : 'name' doit être une chaîne non vide."));
            }

            return _openDb().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(STORE_NAME, "readonly");
                    var store = tx.objectStore(STORE_NAME);
                    var request = store.get(name);

                    request.onsuccess = function (event) {
                        var record = event.target.result;

                        if (!record) {
                            console.log("ℹ️ Aucun modèle trouvé sous le nom '" + name + "'.");
                            resolve(null);
                            return;
                        }

                        resolve({
                            serializedPredictor: record.serializedPredictor,
                            metadata: record.metadata || {}
                        });
                    };

                    request.onerror = function (event) {
                        reject(new Error("❌ Échec du chargement du modèle '" + name + "' : " +
                            (event.target.error ? event.target.error.message : "erreur inconnue")));
                    };
                });
            });
        },

        /**
         * Supprime un modèle sauvegardé (utile pour le bouton "Ré-entraîner",
         * ou pour repartir de zéro pendant les tests).
         *
         * @param {string} name - Identifiant du modèle à supprimer
         * @returns {Promise<void>}
         */
        deleteModel: function (name) {
            if (!name || typeof name !== 'string') {
                return Promise.reject(new Error("❌ deleteModel() : 'name' doit être une chaîne non vide."));
            }

            return _openDb().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(STORE_NAME, "readwrite");
                    var store = tx.objectStore(STORE_NAME);
                    var request = store.delete(name);

                    request.onsuccess = function () {
                        console.log("🗑️ Modèle '" + name + "' supprimé de '" + DB_NAME + "'.");
                        resolve();
                    };

                    request.onerror = function (event) {
                        reject(new Error("❌ Échec de la suppression du modèle '" + name + "' : " +
                            (event.target.error ? event.target.error.message : "erreur inconnue")));
                    };
                });
            });
        },

        /**
         * Liste les noms de tous les modèles actuellement sauvegardés.
         * Utile pour le diagnostic (DevTools, console).
         *
         * @returns {Promise<Array<string>>}
         */
        listModelNames: function () {
            return _openDb().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(STORE_NAME, "readonly");
                    var store = tx.objectStore(STORE_NAME);
                    var request = store.getAllKeys();

                    request.onsuccess = function (event) {
                        resolve(event.target.result || []);
                    };

                    request.onerror = function (event) {
                        reject(new Error("❌ Échec de la liste des modèles : " +
                            (event.target.error ? event.target.error.message : "erreur inconnue")));
                    };
                });
            });
        }
    };

    console.log("✅ tools.Library.MlModelIdbStore chargé avec succès (base : '" + DB_NAME + "')");

})();
