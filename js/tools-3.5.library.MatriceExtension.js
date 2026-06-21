/**
 * ============================================================
 * EXTENSIONS DE LA CLASSE MATRICE
 * ============================================================
 * 
 * Ce fichier ajoute des méthodes à la classe Matrice pour
 * intégrer l'ObjectAnalyser et les fonctionnalités de prédiction.
 * 
 * Ces extensions permettent à la matrice de :
 * 1. Recevoir un analyseur (décorateur)
 * 2. Déléguer les opérations de prédiction et de transformation
 * 3. Gérer l'entraînement des modèles
 * 
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // GESTION DE L'ANALYSEUR
    // ============================================================
    
    /**
     * Définit l'analyseur pour la matrice
     * 
     * @param {tools.Library.ObjectAnalyser} analyser - L'analyseur à associer
     * @returns {tools.Library.Stats.Matrice} La matrice (pour le chaînage)
     * 
     * @example
     * const analyser = new ObjectAnalyser(matrice, randomForest);
     * matrice.setAnalyser(analyser);
     */
    tools.Library.Stats.Matrice.prototype.setAnalyser = function(analyser) {
        if (!analyser) {
            throw new Error(" L'analyseur fourni est nul ou indéfini.");
        }
        
        // Vérifier que l'analyseur a les bonnes méthodes
        if (typeof analyser.predict !== 'function') {
            throw new Error(
                " L'analyseur doit implémenter la méthode predict()."
            );
        }
        
        if (typeof analyser.transform !== 'function') {
            throw new Error(
                " L'analyseur doit implémenter la méthode transform()."
            );
        }
        
        this.objectAnalyser = analyser;
        console.log(" Analyseur configuré sur la matrice.");
        return this;
    };
    
    /**
     * Retourne l'analyseur associé à la matrice
     * 
     * @returns {tools.Library.ObjectAnalyser|null} L'analyseur ou null
     */
    tools.Library.Stats.Matrice.prototype.getAnalyser = function() {
        return this.objectAnalyser || null;
    };
    
    /**
     * Vérifie si un analyseur est configuré sur la matrice
     * 
     * @returns {boolean} True si un analyseur est présent
     */
    tools.Library.Stats.Matrice.prototype.hasAnalyser = function() {
        return this.objectAnalyser !== undefined && 
               this.objectAnalyser !== null;
    };
    
    /**
     * Supprime l'analyseur de la matrice
     * 
     * @returns {tools.Library.Stats.Matrice} La matrice (pour le chaînage)
     */
    tools.Library.Stats.Matrice.prototype.removeAnalyser = function() {
        if (this.hasAnalyser()) {
            console.log(" Analyseur supprimé de la matrice.");
        }
        delete this.objectAnalyser;
        return this;
    };

    // ============================================================
    // OPÉRATIONS DE PRÉDICTION
    // ============================================================
    
    /**
     * Effectue une prédiction sur un sample
     * Délègue l'opération à l'analyseur configuré.
     * 
     * @param {Object} sample - Objet clé-valeur partiel
     * @returns {Object} Le sample complété
     * 
     * @throws {Error} Si aucun analyseur n'est configuré
     * 
     * @example
     * const result = matrice.predict({ idEnseignant: 26848 });
     */
    tools.Library.Stats.Matrice.prototype.predict = function(sample) {
        if (!this.hasAnalyser()) {
            throw new Error(
                " Aucun analyseur n'est configuré sur cette matrice. " +
                "Utilisez setAnalyser() d'abord."
            );
        }
        
        console.log("Prédiction via la matrice...");
        return this.objectAnalyser.predict(sample);
    };
    
    /**
     * Prédit un ensemble de samples
     * 
     * @param {Array<Object>} samples - Liste des samples à prédire
     * @returns {Array<Object>} Les samples complétés
     */
    tools.Library.Stats.Matrice.prototype.predictBatch = function(samples) {
        if (!this.hasAnalyser()) {
            throw new Error(
                " Aucun analyseur n'est configuré sur cette matrice."
            );
        }
        
        console.log(` Prédiction de ${samples.length} samples...`);
        const results = [];
        
        for (let i = 0; i < samples.length; i++) {
            try {
                const result = this.objectAnalyser.predict(samples[i]);
                results.push(result);
            } catch (error) {
                console.error(` Erreur sur le sample ${i}:`, error.message);
                results.push(null);
            }
        }
        
        return results;
    };

    // ============================================================
    // OPÉRATIONS DE TRANSFORMATION
    // ============================================================
    
    /**
     * Transforme la matrice en un arbre ou un autre objet
     * Délègue l'opération à l'analyseur configuré.
     * 
     * @param {Function} callback - Fonction de transformation
     * @returns {Object} L'objet transformé
     * 
     * @throws {Error} Si aucun analyseur n'est configuré
     * 
     * @example
     * const tree = matrice.transform(function(cell) {
     *     return cell.val;
     * });
     */
    tools.Library.Stats.Matrice.prototype.transform = function(callback) {
        if (!this.hasAnalyser()) {
            throw new Error(
                " Aucun analyseur n'est configuré sur cette matrice."
            );
        }
        
        console.log(" Transformation de la matrice...");
        return this.objectAnalyser.transform(this, callback);
    };
    
    /**
     * Transforme la matrice en utilisant l'itérateur nextElement()
     * 
     * Cette méthode est une alternative directe qui n'utilise pas
     * l'analyseur. Elle permet une transformation simple.
     * 
     * @param {Function} callback - Fonction appelée pour chaque cellule
     * @param {Array} [targetCols] - Colonnes à transformer (toutes si non spécifié)
     * @returns {Array} Liste des éléments transformés
     */
    tools.Library.Stats.Matrice.prototype.transformWithIterator = function(callback, targetCols) {
        // Réinitialiser l'itérateur
        this.currentIndexRow = 0;
        this.currentIndexCol = 0;
        
        const results = [];
        const cols = targetCols || this.getColonnes();
        let cell;
        
        console.log(" Transformation avec l'itérateur...");
        
        while ((cell = this.nextElement()) !== undefined) {
            // Vérifier si la colonne est dans la liste cible
            const colName = this.getColonnes()[cell.indexCol];
            if (targetCols && !targetCols.includes(colName)) {
                continue;
            }
            
            // Appliquer le callback
            const transformed = callback(cell);
            if (transformed !== undefined && transformed !== null) {
                results.push(transformed);
            }
        }
        
        console.log(` Transformation terminée. ${results.length} éléments transformés.`);
        return results;
    };

    // ============================================================
    // OPÉRATIONS D'ENTRAÎNEMENT
    // ============================================================
    
    /**
     * Entraîne le modèle configuré sur la matrice
     * 
     * @returns {tools.Library.Stats.Matrice} La matrice (pour le chaînage)
     * 
     * @throws {Error} Si aucun analyseur n'est configuré
     */
    tools.Library.Stats.Matrice.prototype.trainModel = function() {
        if (!this.hasAnalyser()) {
            throw new Error(
                " Aucun analyseur n'est configuré sur cette matrice."
            );
        }
        
        console.log(" Entraînement du modèle sur la matrice...");
        this.objectAnalyser.train(this);
        return this;
    };
    
    /**
     * Vérifie si le modèle configuré est entraîné
     * 
     * @returns {boolean} True si le modèle est entraîné
     */
    tools.Library.Stats.Matrice.prototype.isModelTrained = function() {
        if (!this.hasAnalyser()) {
            return false;
        }
        return this.objectAnalyser.isTrained();
    };
    
    /**
     * Retourne le type du modèle configuré
     * 
     * @returns {string} Le type du modèle
     */
    tools.Library.Stats.Matrice.prototype.getModelType = function() {
        if (!this.hasAnalyser()) {
            return "Aucun modèle";
        }
        return this.objectAnalyser.getModelType();
    };

    // ============================================================
    // OPÉRATIONS D'ÉVALUATION
    // ============================================================
    
    /**
     * Évalue la performance du modèle sur un ensemble de test
     * 
     * @param {tools.Library.Stats.Matrice} testMatrix - Matrice de test
     * @param {Array} [targetCols] - Colonnes à évaluer
     * @returns {Object} Statistiques d'évaluation
     */
    tools.Library.Stats.Matrice.prototype.evaluateModel = function(testMatrix, targetCols) {
        if (!this.hasAnalyser()) {
            throw new Error(" Aucun analyseur n'est configuré.");
        }
        
        if (!this.isModelTrained()) {
            throw new Error(" Le modèle n'est pas entraîné.");
        }
        
        console.log(" Évaluation du modèle...");
        
        const stats = {
            total: 0,
            correct: 0,
            errors: 0,
            accuracy: 0,
            predictions: []
        };
        
        const rows = testMatrix.getLignes();
        const cols = targetCols || testMatrix.getColonnes();
        
        for (let i = 0; i < rows.length; i++) {
            const rowName = rows[i];
            
            // Construire le sample à partir de la ligne
            const sample = {};
            for (let j = 0; j < cols.length; j++) {
                const colName = cols[j];
                sample[colName] = testMatrix.getElement(colName, rowName);
            }
            
            // Copier le sample original pour la comparaison
            const originalSample = { ...sample };
            
            // Faire la prédiction
            const predicted = this.predict(sample);
            
            // Comparer les valeurs prédites avec les valeurs originales
            let isCorrect = true;
            for (const key in predicted) {
                if (originalSample[key] !== undefined && 
                    originalSample[key] !== null &&
                    predicted[key] !== originalSample[key]) {
                    isCorrect = false;
                    stats.errors++;
                    break;
                }
            }
            
            if (isCorrect) {
                stats.correct++;
            }
            stats.total++;
            
            stats.predictions.push({
                row: rowName,
                original: originalSample,
                predicted: predicted,
                correct: isCorrect
            });
        }
        
        // Calculer l'exactitude
        stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
        stats.accuracyPercent = (stats.accuracy * 100).toFixed(2) + '%';
        
        console.log(` Évaluation terminée. Exactitude : ${stats.accuracyPercent}`);
        return stats;
    };

    console.log(" Extensions de Matrice chargées avec succès");

})();