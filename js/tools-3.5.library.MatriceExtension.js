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

(function () {
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
    tools.Library.Stats.Matrice.prototype.setAnalyser = function (analyser) {
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
    tools.Library.Stats.Matrice.prototype.getAnalyser = function () {
        return this.objectAnalyser || null;
    };

    /**
     * Vérifie si un analyseur est configuré sur la matrice
     * 
     * @returns {boolean} True si un analyseur est présent
     */
    tools.Library.Stats.Matrice.prototype.hasAnalyser = function () {
        return this.objectAnalyser !== undefined &&
            this.objectAnalyser !== null;
    };

    /**
     * Supprime l'analyseur de la matrice
     * 
     * @returns {tools.Library.Stats.Matrice} La matrice (pour le chaînage)
     */
    tools.Library.Stats.Matrice.prototype.removeAnalyser = function () {
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
    tools.Library.Stats.Matrice.prototype.predict = function (sample) {
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
    tools.Library.Stats.Matrice.prototype.predictBatch = function (samples) {
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
    tools.Library.Stats.Matrice.prototype.transform = function (callback) {
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
    tools.Library.Stats.Matrice.prototype.transformWithIterator = function (callback, targetCols) {
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
    tools.Library.Stats.Matrice.prototype.trainModel = function () {
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
    tools.Library.Stats.Matrice.prototype.isModelTrained = function () {
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
    tools.Library.Stats.Matrice.prototype.getModelType = function () {
        if (!this.hasAnalyser()) {
            return "Aucun modèle";
        }
        return this.objectAnalyser.getModelType();
    };

    // ============================================================
    // OPÉRATIONS D'ÉVALUATION
    // À coller dans tools-3.5.library.MatriceExtension.js
    // en remplacement du bloc existant "OPÉRATIONS D'ÉVALUATION"
    // (de la ligne 264 à la ligne 344 environ)
    //
    // Contient :
    //   1. splitTrainTest(ratio)
    //   2. evaluateModel(testMatrix, targetCol)
    //      → accuracy, précision, recall, F1 par classe
    // ============================================================

    // ----------------------------------------------------------
    // splitTrainTest(ratio)
    // Rôle : diviser la matrice en deux sous-matrices :
    //        trainMatrix (pour entraîner) et testMatrix
    //        (pour évaluer sur des données inédites).
    //
    // Paramètre :
    //   ratio : proportion réservée à l'entraînement
    //           ex: 0.7 → 70% train, 30% test
    //           Valeur par défaut : 0.7
    //
    // Retour :
    //   { trainMatrix, testMatrix }
    //
    // Exemple :
    //   const split = matrice.splitTrainTest(0.7);
    //   split.trainMatrix.getLignes().length // → 449
    //   split.testMatrix.getLignes().length  // → 193
    // ----------------------------------------------------------
    tools.Library.Stats.Matrice.prototype.splitTrainTest = function (ratio) {

        ratio = ratio || 0.7;

        // Mélanger aléatoirement les lignes avant de découper
        // pour éviter que train et test contiennent des classes différentes
        const allRows = this.getLignes().slice(); // copie pour ne pas modifier l'original
        for (let i = allRows.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = allRows[i];
            allRows[i] = allRows[j];
            allRows[j] = tmp;
        }

        const allCols = this.getColonnes();
        const total = allRows.length;
        const trainEnd = Math.floor(total * ratio);

        const trainMatrix = new tools.Library.Stats.Matrice();
        const testMatrix = new tools.Library.Stats.Matrice();

        for (let i = 0; i < total; i++) {
            const rowName = allRows[i];
            const target = i < trainEnd ? trainMatrix : testMatrix;

            for (let j = 0; j < allCols.length; j++) {
                const colName = allCols[j];
                const val = this.getElement(colName, rowName);
                if (val !== null && val !== undefined) {
                    target.setElement(val, colName, rowName);
                }
            }
        }

        console.log(
            "[splitTrainTest] Total:", total,
            "| Train:", trainMatrix.getLignes().length,
            "| Test:", testMatrix.getLignes().length
        );

        return { trainMatrix: trainMatrix, testMatrix: testMatrix };
    };

    // ----------------------------------------------------------
    // evaluateModel(testMatrix, targetCol)
    //
    // Rôle : mesurer la qualité du modèle entraîné sur des données
    //        qu'il n'a jamais vues, en calculant 4 métriques :
    //
    //   1. Accuracy  — % global de bonnes prédictions
    //   2. Précision — pour chaque classe : parmi les fois où le
    //                  modèle a prédit cette classe, combien de fois
    //                  avait-il raison ?
    //   3. Recall    — pour chaque classe : parmi tous les exemples
    //                  qui appartiennent réellement à cette classe,
    //                  combien le modèle en a-t-il détectés ?
    //   4. F1-Score  — moyenne harmonique de précision et recall,
    //                  utile pour comparer deux configurations
    //
    // Précision et recall sont calculés PAR CLASSE (valeur unique
    // de targetCol) — ce qui permet de voir quelle classe pose
    // problème et d'ajuster les paramètres du modèle en conséquence.
    //
    // Paramètres :
    //   testMatrix : matrice de test (lignes non vues pendant train)
    //   targetCol  : colonne à prédire (ex: "idClasse")
    //
    // Retour :
    //   {
    //     total, correct, incorrect,
    //     accuracy, accuracyPercent,
    //     parClasse: {
    //       "1343": { precision, recall, f1, support },
    //       "1345": { precision, recall, f1, support },
    //       ...
    //     },
    //     predictions: [{ row, input, realValue, predictedValue, correct }]
    //   }
    //
    // Exemple d'utilisation :
    //   const stats = trainMatrix.evaluateModel(testMatrix, "idClasse");
    //   console.log(stats.accuracyPercent);        // "83.33%"
    //   console.log(stats.parClasse["1343"].f1);   // 0.87
    //   console.log(stats.parClasse["1343"].recall); // 0.90
    // ----------------------------------------------------------
    tools.Library.Stats.Matrice.prototype.evaluateModel = function (testMatrix, targetCol) {

        // --- Préconditions ---
        if (!this.hasAnalyser()) {
            throw new Error("[evaluateModel] Aucun analyseur configuré. Appelez setAnalyser() d'abord.");
        }
        if (!this.isModelTrained()) {
            throw new Error("[evaluateModel] Modèle non entraîné. Appelez trainModel() d'abord.");
        }
        if (!targetCol) {
            throw new Error("[evaluateModel] Précisez la colonne cible. Ex: 'idClasse'.");
        }

        console.log(
            "[evaluateModel] Évaluation sur",
            testMatrix.getLignes().length, "lignes | cible:", targetCol
        );

        const rows = testMatrix.getLignes();
        const allCols = testMatrix.getColonnes();

        // Colonnes données au modèle = toutes SAUF targetCol
        // (on ne lui révèle pas la réponse)
        const featureCols = allCols.filter(function (col) {
            return col !== targetCol;
        });

        // --- Structures de comptage ---

        // Compteurs globaux
        const stats = {
            total: 0,
            correct: 0,
            incorrect: 0,
            accuracy: 0,
            accuracyPercent: "0%",
            parClasse: {},   // métriques par valeur de targetCol
            predictions: []    // détail ligne par ligne
        };

        // Pour calculer précision et recall on a besoin de :
        //   TP (True Positive)  : prédit X et c'était vraiment X
        //   FP (False Positive) : prédit X mais c'était autre chose
        //   FN (False Negative) : n'a pas prédit X alors que c'était X
        //
        // Par classe → un objet { tp, fp, fn } pour chaque valeur unique
        const compteurs = {};
        // compteurs["1343"] = { tp: 0, fp: 0, fn: 0 }

        // --- Boucle principale ---
        for (let i = 0; i < rows.length; i++) {
            const rowName = rows[i];

            // 1. Construire le sample SANS targetCol
            const sample = {};
            for (let j = 0; j < featureCols.length; j++) {
                sample[featureCols[j]] = testMatrix.getElement(featureCols[j], rowName);
            }

            // 2. Vraie valeur connue
            const realValue = String(testMatrix.getElement(targetCol, rowName));

            // 3. Prédiction du modèle (sans connaître realValue)
            const predicted = this.predict(sample);
            const predictedValue = predicted && predicted[targetCol] !== undefined
                ? String(predicted[targetCol])
                : null;

            // 4. Comparaison
            const isCorrect = (
                predictedValue !== null &&
                predictedValue === realValue
            );

            // 5. Comptabiliser globalement
            stats.total++;
            if (isCorrect) { stats.correct++; }
            else { stats.incorrect++; }

            // 6. Initialiser les compteurs pour les classes rencontrées
            if (compteurs[realValue] === undefined) {
                compteurs[realValue] = { tp: 0, fp: 0, fn: 0 };
            }
            if (predictedValue !== null &&
                compteurs[predictedValue] === undefined) {
                compteurs[predictedValue] = { tp: 0, fp: 0, fn: 0 };
            }

            // 7. Mettre à jour TP / FP / FN
            if (isCorrect) {
                // Bonne prédiction → TP pour cette classe
                compteurs[realValue].tp++;
            } else {
                // Mauvaise prédiction :
                // → FN pour la classe réelle (on a raté un vrai cas)
                compteurs[realValue].fn++;
                // → FP pour la classe prédite (fausse alarme)
                if (predictedValue !== null) {
                    compteurs[predictedValue].fp++;
                }
            }

            // 8. Garder le détail
            stats.predictions.push({
                row: rowName,
                input: sample,
                realValue: realValue,
                predictedValue: predictedValue,
                correct: isCorrect
            });
        }

        // --- Calcul des métriques finales ---

        // Accuracy globale
        stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
        stats.accuracyPercent = (stats.accuracy * 100).toFixed(2) + "%";

        // Précision, Recall, F1 par classe
        for (let classe in compteurs) {
            if (!Object.hasOwnProperty.call(compteurs, classe)) continue;

            const c = compteurs[classe];
            const tp = c.tp;
            const fp = c.fp;
            const fn = c.fn;

            // Précision : TP / (TP + FP)
            // Si le modèle n'a jamais prédit cette classe → précision = 0
            const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;

            // Recall : TP / (TP + FN)
            // Si aucun exemple réel de cette classe → recall = 0
            const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;

            // F1 : moyenne harmonique de précision et recall
            // = 0 si les deux sont à 0
            const f1 = (precision + recall) > 0
                ? 2 * (precision * recall) / (precision + recall)
                : 0;

            // Support : nombre de fois où cette classe apparaît réellement
            const support = tp + fn;

            stats.parClasse[classe] = {
                precision: precision,
                precisionPercent: (precision * 100).toFixed(2) + "%",
                recall: recall,
                recallPercent: (recall * 100).toFixed(2) + "%",
                f1: f1,
                f1Percent: (f1 * 100).toFixed(2) + "%",
                support: support,    // nbre d'exemples réels de cette classe
                tp: tp,         // bien prédits
                fp: fp,         // faussement prédits comme cette classe
                fn: fn          // ratés (vraie classe mais non détectés
            };
        }

        console.log(
            "[evaluateModel] Résultat →",
            stats.correct, "/", stats.total,
            "| Accuracy:", stats.accuracyPercent
        );

        return stats;
    };

    console.log(" Extensions de Matrice chargées avec succès");

})();