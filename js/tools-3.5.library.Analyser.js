/**
 * ============================================================
 * INTERFACE ANALYSER
 * ============================================================
 * 
 * Cette interface définit le contrat que toutes les classes 
 * d'analyse prédictive doivent respecter.
 * 
 * Elle permet le polymorphisme : on peut échanger dynamiquement
 * différents modèles de prédiction (RandomForest, Réseau de neurones, etc.)
 * sans modifier la matrice elle-même.
 * 
 * C'est le coeur du pattern Decorator utilisé dans ce système.
 * 
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function() {
    'use strict';

    /**
     * Interface Analyser
     * Toute classe qui implémente cette interface doit fournir
     * les méthodes predict() et transform().
     */
    tools.Library.Analyser = function() {
        // ============================================================
        // PROPRIÉTÉS
        // ============================================================
        
        /**
         * Le type du modèle (RandomForest, NeuralNetwork, etc.)
         * @type {string}
         */
        this.modelType = "Unknown";
        
        /**
         * Indique si le modèle a été entraîné
         * @type {boolean}
         */
        this.isTrained = false;
        
        /**
         * La matrice sur laquelle le modèle travaille
         * @type {tools.Library.Stats.Matrice}
         */
        this.trainingMatrix = null;

        // ============================================================
        // MÉTHODES (à implémenter par les classes filles)
        // ============================================================
        
        /**
         * Prédit les valeurs manquantes d'un échantillon
         * 
         * @param {Object} sample - Un objet clé-valeur contenant les données partielles
         *                           Exemple: { idEnseignant: 26848, idDiscipline: 1343 }
         * @returns {Object} Le sample complété avec les valeurs prédites
         *                   Exemple: { idEnseignant: 26848, idDiscipline: 1343, idClasse: 'CLASSE A' }
         * 
         * @throws {Error} Si la méthode n'est pas implémentée par la classe fille
         */
        this.predict = function(sample) {
            throw new Error(
                "❌ La méthode predict() doit être implémentée par la classe fille " +
                "qui hérite de Analyser."
            );
        };
        
        /**
         * Transforme une matrice en un objet d'analyse (arbre, modèle, etc.)
         * Utilise l'itérateur nextElement() pour parcourir la matrice cellule par cellule.
         * 
         * @param {tools.Library.Stats.Matrice} matrice - La matrice source à transformer
         * @param {Function} callback - Fonction appelée pour chaque cellule parcourue
         *                              Cette fonction reçoit un objet {indexRow, indexCol, val}
         *                              et retourne la valeur transformée.
         * @returns {Object} L'objet transformé (généralement un arbre)
         * 
         * @throws {Error} Si la méthode n'est pas implémentée par la classe fille
         */
        this.transform = function(matrice, callback) {
            throw new Error(
                "❌ La méthode transform() doit être implémentée par la classe fille " +
                "qui hérite de Analyser."
            );
        };
        
        /**
         * Entraîne le modèle sur une matrice de données
         * 
         * @param {tools.Library.Stats.Matrice} matrice - La matrice d'entraînement
         * @returns {this} Pour permettre le chaînage
         * 
         * @throws {Error} Si la méthode n'est pas implémentée par la classe fille
         */
        this.train = function(matrice) {
            throw new Error(
                "❌ La méthode train() doit être implémentée par la classe fille " +
                "qui hérite de Analyser."
            );
        };
        
        /**
         * Retourne le type du modèle
         * 
         * @returns {string} Le type du modèle (ex: "RandomForest", "NeuralNetwork")
         */
        this.getModelType = function() {
            return this.modelType;
        };
        
        /**
         * Vérifie si le modèle est entraîné
         * 
         * @returns {boolean} True si le modèle est entraîné, false sinon
         */
        this.isModelTrained = function() {
            return this.isTrained;
        };
    };

    console.log("tools.Library.Analyser chargé avec succès");

})();