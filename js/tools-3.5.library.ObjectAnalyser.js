/**
 * ============================================================
 * OBJECT ANALYSER (DÉCORATEUR)
 * ============================================================
 * 
 * ObjectAnalyser est un décorateur qui encapsule un modèle de prédiction.
 * 
 * Il permet de :
 * 1. Associer un modèle de prédiction à une matrice
 * 2. Échanger dynamiquement les modèles sans modifier la matrice
 * 3. Ajouter des fonctionnalités d'analyse à la matrice
 * 
 * Le pattern Decorator est utilisé car :
 * - Il permet d'ajouter des responsabilités à un objet dynamiquement
 * - Il offre une alternative flexible à l'héritage
 * - Il permet la composition plutôt que l'héritage multiple
 * 
 * Dans notre cas, la Matrice est le composant de base, et ObjectAnalyser
 * est le décorateur qui lui ajoute des capacités de prédiction.
 * 
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function() {
    'use strict';

    /**
     * ObjectAnalyser - Le décorateur
     * 
     * @param {tools.Library.Stats.Matrice} matrice - La matrice à décorer
     * @param {tools.Library.Analyser} model - Le modèle de prédiction à utiliser
     */
    tools.Library.ObjectAnalyser = function(matrice, model) {
        // ============================================================
        // PROPRIÉTÉS PRIVÉES
        // ============================================================
        
        /**
         * Référence vers la matrice sur laquelle on travaille
         * @private
         * @type {tools.Library.Stats.Matrice}
         */
        this._matrice = matrice;
        
        /**
         * Le modèle de prédiction (RandomForest, etc.)
         * @private
         * @type {tools.Library.Analyser}
         */
        this._model = model;
        
        /**
         * Indique si le modèle est entraîné
         * @private
         * @type {boolean}
         */
        this._isTrained = false;
        
        /**
         * L'historique des prédictions effectuées
         * @private
         * @type {Array}
         */
        this._predictionHistory = [];
        
        /**
         * Le nombre maximum de prédictions à conserver dans l'historique
         * @private
         * @type {number}
         */
        this._maxHistorySize = 100;

        // ============================================================
        // MÉTHODES PUBLIQUES
        // ============================================================
        
        /**
         * Prédit les valeurs manquantes d'un sample
         * 
         * Fonctionnement :
         * 1. Vérifie que le modèle est entraîné
         * 2. Si ce n'est pas le cas, lance l'entraînement automatiquement
         * 3. Délègue la prédiction au modèle
         * 4. Sauvegarde la prédiction dans l'historique
         * 5. Retourne le sample complété
         * 
         * @param {Object} sample - Objet clé-valeur partiel
         * @returns {Object} Le sample complété
         * 
         * @example
         * const sample = { idEnseignant: 26848, idDiscipline: 1343 };
         * const result = analyser.predict(sample);
         * // result = { idEnseignant: 26848, idDiscipline: 1343, idClasse: 'CLASSE A', regime: 'Francophone' }
         */
        this.predict = function(sample) {
            // Étape 1 : Vérifier que le modèle existe
            if (!this._model) {
                throw new Error(
                    " Aucun modèle n'est configuré dans l'ObjectAnalyser. " +
                    "Utilisez setModel() pour définir un modèle."
                );
            }
            
            // Étape 2 : Entraîner le modèle si nécessaire
            if (!this._isTrained) {
                console.warn(" Le modèle n'est pas encore entraîné. Entraînement en cours...");
                this.train();
            }
            
            // Étape 3 : Déléguer la prédiction au modèle
            console.log(` Prédiction en cours sur le modèle ${this._model.getModelType()}...`);
            const result = this._model.predict(sample);
            
            // Étape 4 : Sauvegarder dans l'historique
            this._savePredictionHistory(sample, result);
            
            // Étape 5 : Retourner le résultat
            console.log(" Prédiction terminée !");
            return result;
        };
        
        /**
         * Transforme une matrice en un objet d'analyse
         * 
         * Utilise l'itérateur nextElement() de la matrice pour parcourir
         * toutes les cellules et les transformer via une fonction callback.
         * 
         * @param {tools.Library.Stats.Matrice} matrice - La matrice source
         * @param {Function} callback - Fonction de transformation pour chaque cellule
         * @returns {Object} L'objet transformé (généralement un arbre)
         * 
         * @example
         * const tree = analyser.transform(matrice, function(cell) {
         *     return {
         *         colName: cell.colName,
         *         value: cell.val
         *     };
         * });
         */
        this.transform = function(matrice, callback) {
            // Vérification que la matrice existe
            if (!matrice) {
                throw new Error(" La matrice fournie est nulle ou indéfinie.");
            }
            
            // Vérification que le callback est une fonction
            if (typeof callback !== 'function') {
                throw new Error(
                    " Le callback doit être une fonction. " +
                    "Reçu : " + typeof callback
                );
            }
            
            console.log(" Transformation de la matrice en arbre...");
            
            // Délégation de la transformation au modèle
            const result = this._model.transform(matrice, callback);
            
            console.log(" Transformation terminée !");
            return result;
        };
        
        /**
         * Entraîne le modèle sur la matrice
         * 
         * @param {tools.Library.Stats.Matrice} [matrice] - La matrice d'entraînement (optionnelle)
         * @returns {this} Pour permettre le chaînage
         */
        this.train = function(matrice) {
            // Utiliser la matrice fournie ou celle stockée
            const trainingData = matrice || this._matrice;
            
            if (!trainingData) {
                throw new Error(
                    " Aucune matrice d'entraînement disponible. " +
                    "Fournissez une matrice en paramètre ou configurez-en une dans l'analyseur."
                );
            }
            
            console.log(` Entraînement du modèle ${this._model.getModelType()}...`);
            
            // Déléguer l'entraînement au modèle
            this._model.train(trainingData);
            this._isTrained = true;
            
            console.log(" Modèle entraîné avec succès !");
            return this;
        };
        
        /**
         * Change le modèle dynamiquement
         * 
         * Cette méthode permet de remplacer le modèle de prédiction
         * à l'exécution sans recréer l'analyseur.
         * 
         * @param {tools.Library.Analyser} newModel - Le nouveau modèle
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * // Changer de RandomForest à un autre modèle
         * analyser.setModel(new NeuralNetwork());
         * analyser.train(); // Ré-entraîner avec le nouveau modèle
         */
        this.setModel = function(newModel) {
            if (!newModel) {
                throw new Error(" Le nouveau modèle est nul ou indéfini.");
            }
            
            // Vérifier que le modèle implémente bien l'interface Analyser
            if (typeof newModel.predict !== 'function') {
                throw new Error(
                    " Le nouveau modèle doit implémenter la méthode predict(). " +
                    "Il doit hériter de tools.Library.Analyser."
                );
            }
            
            if (typeof newModel.transform !== 'function') {
                throw new Error(
                    " Le nouveau modèle doit implémenter la méthode transform(). " +
                    "Il doit hériter de tools.Library.Analyser."
                );
            }
            
            console.log(` Changement du modèle : ${this._model ? this._model.getModelType() : 'Aucun'} → ${newModel.getModelType()}`);
            
            // Remplacer le modèle
            this._model = newModel;
            this._isTrained = false;
            
            console.log(" Modèle changé avec succès ! N'oubliez pas de l'entraîner.");
            return this;
        };
        
        /**
         * Retourne le type du modèle actuel
         * 
         * @returns {string} Le type du modèle
         */
        this.getModelType = function() {
            return this._model ? this._model.getModelType() : "Aucun modèle";
        };
        
        /**
         * Vérifie si le modèle est entraîné
         * 
         * @returns {boolean} True si le modèle est entraîné
         */
        this.isTrained = function() {
            return this._isTrained;
        };
        
        /**
         * Retourne la matrice associée
         * 
         * @returns {tools.Library.Stats.Matrice} La matrice
         */
        this.getMatrice = function() {
            return this._matrice;
        };
        
        /**
         * Retourne l'historique des prédictions
         * 
         * @param {number} [limit] - Nombre maximum de prédictions à retourner
         * @returns {Array} L'historique des prédictions
         */
        this.getPredictionHistory = function(limit) {
            const history = this._predictionHistory;
            if (limit && limit > 0) {
                return history.slice(-limit);
            }
            return history;
        };
        
        /**
         * Efface l'historique des prédictions
         * 
         * @returns {this} Pour permettre le chaînage
         */
        this.clearHistory = function() {
            this._predictionHistory = [];
            console.log("🧹 Historique des prédictions effacé.");
            return this;
        };

        // ============================================================
        // MÉTHODES PRIVÉES
        // ============================================================
        
        /**
         * Sauvegarde une prédiction dans l'historique
         * @private
         * @param {Object} input - Le sample d'entrée
         * @param {Object} output - Le résultat de la prédiction
         */
        this._savePredictionHistory = function(input, output) {
            const entry = {
                timestamp: new Date().toISOString(),
                input: input,
                output: output,
                modelType: this._model.getModelType()
            };
            
            this._predictionHistory.push(entry);
            
            // Limiter la taille de l'historique
            if (this._predictionHistory.length > this._maxHistorySize) {
                this._predictionHistory.shift();
            }
        };
    };

    console.log(" tools.Library.ObjectAnalyser chargé avec succès");

})();