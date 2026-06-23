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
 * 4. Évaluer les modèles (classification ET régression)
 * 
 * @author Groupe E-Camschool
 * @version 2.0
 * @since 2026-06-23
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
     */
    tools.Library.Stats.Matrice.prototype.setAnalyser = function (analyser) {
        if (!analyser) {
            throw new Error("❌ L'analyseur fourni est nul ou indéfini.");
        }

        if (typeof analyser.predict !== 'function') {
            throw new Error("❌ L'analyseur doit implémenter la méthode predict().");
        }

        if (typeof analyser.transform !== 'function') {
            throw new Error("❌ L'analyseur doit implémenter la méthode transform().");
        }

        this.objectAnalyser = analyser;
        console.log("✅ Analyseur configuré sur la matrice.");
        return this;
    };

    /**
     * Retourne l'analyseur associé à la matrice
     */
    tools.Library.Stats.Matrice.prototype.getAnalyser = function () {
        return this.objectAnalyser || null;
    };

    /**
     * Vérifie si un analyseur est configuré
     */
    tools.Library.Stats.Matrice.prototype.hasAnalyser = function () {
        return this.objectAnalyser !== undefined && this.objectAnalyser !== null;
    };

    /**
     * Supprime l'analyseur de la matrice
     */
    tools.Library.Stats.Matrice.prototype.removeAnalyser = function () {
        if (this.hasAnalyser()) {
            console.log("🗑️ Analyseur supprimé de la matrice.");
        }
        delete this.objectAnalyser;
        return this;
    };

    // ============================================================
    // OPÉRATIONS DE PRÉDICTION
    // ============================================================

    /**
     * Effectue une prédiction sur un sample
     */
    tools.Library.Stats.Matrice.prototype.predict = function (sample) {
        if (!this.hasAnalyser()) {
            throw new Error(
                "❌ Aucun analyseur n'est configuré sur cette matrice. " +
                "Utilisez setAnalyser() d'abord."
            );
        }

        console.log("🔮 Prédiction via la matrice...");
        return this.objectAnalyser.predict(sample);
    };

    /**
     * Prédit un ensemble de samples
     */
    tools.Library.Stats.Matrice.prototype.predictBatch = function (samples) {
        if (!this.hasAnalyser()) {
            throw new Error("❌ Aucun analyseur n'est configuré sur cette matrice.");
        }

        console.log(` Prédiction de ${samples.length} samples...`);
        const results = [];

        for (let i = 0; i < samples.length; i++) {
            try {
                const result = this.objectAnalyser.predict(samples[i]);
                results.push(result);
            } catch (error) {
                console.error(`❌ Erreur sur le sample ${i}:`, error.message);
                results.push(null);
            }
        }

        return results;
    };

    // ============================================================
    // OPÉRATIONS DE TRANSFORMATION
    // ============================================================

    /**
     * Transforme la matrice en un arbre
     */
    tools.Library.Stats.Matrice.prototype.transform = function (callback) {
        if (!this.hasAnalyser()) {
            throw new Error("❌ Aucun analyseur n'est configuré sur cette matrice.");
        }

        console.log(" Transformation de la matrice...");
        return this.objectAnalyser.transform(this, callback);
    };

    /**
     * Transforme la matrice avec l'itérateur nextElement()
     */
    tools.Library.Stats.Matrice.prototype.transformWithIterator = function (callback, targetCols) {
        this.currentIndexRow = 0;
        this.currentIndexCol = 0;

        const results = [];
        const cols = targetCols || this.getColonnes();
        let cell;

        console.log(" Transformation avec l'itérateur...");

        while ((cell = this.nextElement()) !== undefined) {
            const colName = this.getColonnes()[cell.indexCol];
            if (targetCols && !targetCols.includes(colName)) {
                continue;
            }

            const transformed = callback(cell);
            if (transformed !== undefined && transformed !== null) {
                results.push(transformed);
            }
        }

        console.log(`✅ Transformation terminée. ${results.length} éléments transformés.`);
        return results;
    };

    // ============================================================
    // OPÉRATIONS D'ENTRAÎNEMENT
    // ============================================================

    /**
     * Entraîne le modèle configuré
     */
    tools.Library.Stats.Matrice.prototype.trainModel = function () {
        if (!this.hasAnalyser()) {
            throw new Error("❌ Aucun analyseur n'est configuré sur cette matrice.");
        }

        console.log("🏋️ Entraînement du modèle sur la matrice...");
        this.objectAnalyser.train(this);
        return this;
    };

    /**
     * Vérifie si le modèle est entraîné
     */
    tools.Library.Stats.Matrice.prototype.isModelTrained = function () {
        if (!this.hasAnalyser()) {
            return false;
        }
        return this.objectAnalyser.isTrained();
    };

    /**
     * Retourne le type du modèle
     */
    tools.Library.Stats.Matrice.prototype.getModelType = function () {
        if (!this.hasAnalyser()) {
            return "Aucun modèle";
        }
        return this.objectAnalyser.getModelType();
    };

    // ============================================================
    // OPÉRATIONS DE SPLIT
    // ============================================================

    /**
     * Divise la matrice en train et test
     */
    tools.Library.Stats.Matrice.prototype.splitTrainTest = function (ratio) {
        ratio = ratio || 0.7;

        const allRows = this.getLignes().slice();
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
            `📊 Split: Total ${total} | Train ${trainMatrix.getLignes().length} | Test ${testMatrix.getLignes().length}`
        );

        return { trainMatrix: trainMatrix, testMatrix: testMatrix };
    };

    // ============================================================
    // OPÉRATIONS D'ÉVALUATION
    // ============================================================

    // ----------------------------------------------------------
    // 1. ÉVALUATION POUR LA CLASSIFICATION
    //   
    // ----------------------------------------------------------
    tools.Library.Stats.Matrice.prototype.evaluateClassification = function (testMatrix, targetCol) {

        if (!this.hasAnalyser()) {
            throw new Error("[evaluateClassification] Aucun analyseur configuré.");
        }
        if (!this.isModelTrained()) {
            throw new Error("[evaluateClassification] Modèle non entraîné. Appelez trainModel() d'abord.");
        }
        if (!targetCol) {
            throw new Error("[evaluateClassification] Précisez la colonne cible.");
        }

        console.log(
            `📊 Évaluation CLASSIFICATION sur ${testMatrix.getLignes().length} lignes | cible: ${targetCol}`
        );

        const rows = testMatrix.getLignes();
        const allCols = testMatrix.getColonnes();
        const featureCols = allCols.filter(function (col) {
            return col !== targetCol;
        });

        const stats = {
            total: 0,
            correct: 0,
            incorrect: 0,
            accuracy: 0,
            accuracyPercent: "0%",
            parClasse: {},
            predictions: []
        };

        const compteurs = {};

        for (let i = 0; i < rows.length; i++) {
            const rowName = rows[i];
            const sample = {};
            for (let j = 0; j < featureCols.length; j++) {
                sample[featureCols[j]] = testMatrix.getElement(featureCols[j], rowName);
            }

            const realValue = String(testMatrix.getElement(targetCol, rowName));
            const predicted = this.predict(sample);
            const predictedValue = predicted && predicted[targetCol] !== undefined
                ? String(predicted[targetCol])
                : null;

            const isCorrect = (predictedValue !== null && predictedValue === realValue);

            stats.total++;
            if (isCorrect) { stats.correct++; } else { stats.incorrect++; }

            if (compteurs[realValue] === undefined) {
                compteurs[realValue] = { tp: 0, fp: 0, fn: 0 };
            }
            if (predictedValue !== null && compteurs[predictedValue] === undefined) {
                compteurs[predictedValue] = { tp: 0, fp: 0, fn: 0 };
            }

            if (isCorrect) {
                compteurs[realValue].tp++;
            } else {
                compteurs[realValue].fn++;
                if (predictedValue !== null) {
                    compteurs[predictedValue].fp++;
                }
            }

            stats.predictions.push({
                row: rowName,
                input: sample,
                realValue: realValue,
                predictedValue: predictedValue,
                correct: isCorrect
            });
        }

        stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
        stats.accuracyPercent = (stats.accuracy * 100).toFixed(2) + "%";

        for (let classe in compteurs) {
            if (!Object.hasOwnProperty.call(compteurs, classe)) continue;

            const c = compteurs[classe];
            const tp = c.tp;
            const fp = c.fp;
            const fn = c.fn;

            const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
            const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
            const f1 = (precision + recall) > 0
                ? 2 * (precision * recall) / (precision + recall)
                : 0;
            const support = tp + fn;

            stats.parClasse[classe] = {
                precision: precision,
                precisionPercent: (precision * 100).toFixed(2) + "%",
                recall: recall,
                recallPercent: (recall * 100).toFixed(2) + "%",
                f1: f1,
                f1Percent: (f1 * 100).toFixed(2) + "%",
                support: support,
                tp: tp,
                fp: fp,
                fn: fn
            };
        }

        console.log(
            `📊 Classification → Accuracy: ${stats.accuracyPercent} (${stats.correct}/${stats.total})`
        );

        return stats;
    };

    // Alias pour la rétrocompatibilité
    tools.Library.Stats.Matrice.prototype.evaluateModel =
        tools.Library.Stats.Matrice.prototype.evaluateClassification;

    // ----------------------------------------------------------
    // 2. ÉVALUATION POUR LA RÉGRESSION
    //  
    // ----------------------------------------------------------
    tools.Library.Stats.Matrice.prototype.evaluateRegression = function (testMatrix, targetCol) {

        if (!this.hasAnalyser()) {
            throw new Error("[evaluateRegression] Aucun analyseur configuré.");
        }
        if (!this.isModelTrained()) {
            throw new Error("[evaluateRegression] Modèle non entraîné. Appelez trainModel() d'abord.");
        }
        if (!targetCol) {
            throw new Error("[evaluateRegression] Précisez la colonne cible.");
        }

        console.log(
            `📊 Évaluation RÉGRESSION sur ${testMatrix.getLignes().length} lignes | cible: ${targetCol}`
        );

        const rows = testMatrix.getLignes();
        const allCols = testMatrix.getColonnes();
        const featureCols = allCols.filter(function (col) {
            return col !== targetCol;
        });

        const predictions = [];
        const reals = [];
        const details = [];

        for (let i = 0; i < rows.length; i++) {
            const rowName = rows[i];
            const sample = {};
            for (let j = 0; j < featureCols.length; j++) {
                sample[featureCols[j]] = testMatrix.getElement(featureCols[j], rowName);
            }

            const realVal = testMatrix.getElement(targetCol, rowName);
            const real = parseFloat(realVal);

            const predicted = this.predict(sample);
            const predVal = predicted && predicted[targetCol] !== undefined
                ? parseFloat(predicted[targetCol])
                : 0;

            // Ne garder que les valeurs valides
            if (!isNaN(real) && !isNaN(predVal)) {
                reals.push(real);
                predictions.push(predVal);
                details.push({
                    row: rowName,
                    real: real,
                    predicted: predVal,
                    error: predVal - real,
                    absError: Math.abs(predVal - real)
                });
            }
        }

        const n = predictions.length;
        if (n === 0) {
            console.warn("⚠️ Aucune donnée valide pour l'évaluation de la régression.");
            return {
                mse: 0,
                rmse: 0,
                r2: 0,
                n: 0,
                details: [],
                message: "Aucune donnée valide"
            };
        }

        // Calcul de la moyenne des valeurs réelles
        const meanReal = reals.reduce((a, b) => a + b, 0) / n;

        // Calcul de MSE (Mean Squared Error)
        let ssRes = 0; // Somme des carrés des résidus
        let ssTot = 0; // Somme des carrés totaux
        let sumAbsError = 0;

        for (let i = 0; i < n; i++) {
            const err = predictions[i] - reals[i];
            ssRes += err * err;
            ssTot += (reals[i] - meanReal) * (reals[i] - meanReal);
            sumAbsError += Math.abs(err);
        }

        const mse = ssRes / n;
        const rmse = Math.sqrt(mse);
        const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
        const mae = sumAbsError / n;

        // Résultat structuré
        const result = {
            mse: mse,
            rmse: rmse,
            r2: r2,
            r2Percent: (r2 * 100).toFixed(2) + "%",
            mae: mae,
            n: n,
            meanReal: meanReal,
            ssRes: ssRes,
            ssTot: ssTot,
            predictions: predictions,
            reals: reals,
            details: details
        };

        console.log(
            `📊 Régression → R²: ${result.r2Percent} | RMSE: ${rmse.toFixed(4)} | MSE: ${mse.toFixed(4)}`
        );

        return result;
    };

    console.log("✅ Extensions de Matrice chargées avec succès");
    console.log("   - evaluateClassification() pour la classification");
    console.log("   - evaluateRegression() pour la régression");
    console.log("   - evaluateModel() (alias de evaluateClassification)");

})();