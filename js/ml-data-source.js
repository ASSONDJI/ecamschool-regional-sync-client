/**
 * ============================================================
 * ML DATA SOURCE
 * ============================================================
 *
 * Rôle UNIQUE de ce fichier : parler au backend Spring
 * (ecamschool-regional-sync-core) pour récupérer les données
 * d'entraînement du module de prédiction.
 *
 * Ce fichier ne connaît RIEN de Matrice, Predictor, RandomForest,
 * ni d'IndexedDB — voir ml-model-idb-store.js pour la persistance
 * locale, et prediction-tab-controller.js pour l'orchestration.
 *
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-07-06
 * ============================================================
 */

(function () {
    'use strict';

    /**
     * MlDataSource - API publique de récupération des données serveur.
     *
     * Note sur API_BASE_URL : cette constante est déclarée dans app.js,
     * qui charge APRÈS ce fichier (voir l'ordre des <script> dans
     * index.html). Ce n'est pas un problème : API_BASE_URL n'est lue
     * qu'au moment où loadFromServer() est réellement APPELÉE (donc
     * après que toute la page, y compris app.js, ait fini de charger),
     * jamais au moment où ce fichier est lui-même chargé/parsé.
     */
    tools.Library.MlDataSource = {

        /**
         * Récupère toutes les entrées data-matrix depuis le serveur et
         * les convertit en tableau d'objets exploitable par
         * predictor.loadData().
         *
         * @returns {Promise<{rows: Array<Object>, source: string}>}
         */
        loadFromServer: function () {
            return fetch(API_BASE_URL + "/data-matrix")
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Le serveur a répondu avec une erreur (" + response.status + ")");
                    }
                    return response.json();
                })
                .then(function (entries) {
                    var rows = entries.map(function (entry) {
                        return JSON.parse(entry.dataValue);
                    });

                    if (rows.length === 0) {
                        throw new Error("Le serveur n'a renvoyé aucune donnée.");
                    }

                    return { rows: rows, source: "serveur" };
                });
        }
    };

    console.log("✅ tools.Library.MlDataSource chargé avec succès");

})();
