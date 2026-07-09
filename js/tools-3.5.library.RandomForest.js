/**
 * ============================================================
 * RANDOM FOREST - BASE + CLASSIFIER + REGRESSOR
 * ============================================================
 *
 * Hiérarchie inspirée de scikit-learn :
 *   - RandomForest (classe de base abstraite)
 *   - RandomForestClassifier (classification)
 *   - RandomForestRegressor (régression)
 *
 * La classe de base contient tout le code commun :
 *   - Configuration (configure)
 *   - Entraînement (train)
 *   - Prédiction (predict)
 *   - Transformation (transform)
 *   - Méthodes utilitaires (_bootstrapSample, _shuffleArray, etc.)
 *
 * Les sous-classes redéfinissent deux méthodes abstraites :
 *   - _getLeafValue()  → valeur d'une feuille (majorité ou moyenne)
 *   - _aggregateVotes() → agrégation des votes (majorité ou moyenne)
 *
 * @author Groupe E-Camschool
 * @version 2.0
 * @since 2026-06-23
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // CLASSE DE BASE : RandomForest
  // ============================================================

  /**
   * RandomForest - Classe de base abstraite
   * 
   * Contient tout le code commun aux Classifier et Regressor.
   * Les méthodes _getLeafValue() et _aggregateVotes() sont abstraites
   * et doivent être redéfinies par les sous-classes.
   */
  tools.Library.RandomForest = function () {
    // ============================================================
    // HÉRITAGE DE ANALYSER
    // ============================================================

    tools.Library.Analyser.call(this);
    this.modelType = "RandomForest";

    // ============================================================
    // PROPRIÉTÉS
    // ============================================================

    /** La forêt : ensemble d'arbres de décision */
    this.trees = [];

    /** Nombre d'arbres dans la forêt */
    this.nTrees = 10;

    /** Proportion des données pour l'entraînement de chaque arbre */
    this.sampleRatio = 0.7;

    /** Nombre max de caractéristiques à considérer par division */
    this.maxFeatures = null;

    /** Colonnes caractéristiques */
    this.featureCols = [];

    /** Colonne cible (ce qu'on veut prédire) */
    this.targetCol = null;

    /** Profondeur maximale des arbres */
    this.maxDepth = 10;

    /** Nombre minimum d'échantillons dans une feuille */
    this.minSamplesLeaf = 2;

    /** Matrice d'entraînement */
    this.trainingMatrix = null;

    // ============================================================
    // NOUVEAU : POUR L'IMPORTANCE DES FEATURES
    // ============================================================

    /**
     * Importance des caractéristiques (calculée après l'entraînement)
     * @type {Array|null}
     */
    this.featureImportance = null;

    /**
     * Indique si l'importance a été calculée
     * @type {boolean}
     */
    this._importanceComputed = false;

    // ============================================================
    // MÉTHODES DE CONFIGURATION
    // ============================================================

    /**
     * Configure le Random Forest
     * 
     * @param {Object} config - Paramètres de configuration
     * @param {number} [config.nTrees=10] - Nombre d'arbres
     * @param {number} [config.sampleRatio=0.7] - Ratio d'échantillonnage
     * @param {Array<string>} [config.featureCols=[]] - Colonnes caractéristiques
     * @param {string} [config.targetCol=null] - Colonne cible
     * @param {number} [config.maxDepth=10] - Profondeur maximale
     * @param {number} [config.minSamplesLeaf=2] - Minimum par feuille
     * @returns {this}
     */
    this.configure = function (config) {
      if (config.nTrees !== undefined) {
        this.nTrees = config.nTrees;
        console.log(`🌲 Nombre d'arbres : ${this.nTrees}`);
      }
      if (config.sampleRatio !== undefined) {
        this.sampleRatio = config.sampleRatio;
        console.log(`📊 Ratio d'échantillonnage : ${this.sampleRatio * 100}%`);
      }
      if (config.featureCols !== undefined) {
        this.featureCols = config.featureCols;
        console.log(`📋 Colonnes caractéristiques : ${this.featureCols.join(', ')}`);
      }
      if (config.targetCol !== undefined) {
        this.targetCol = config.targetCol;
        console.log(`🎯 Colonne cible : ${this.targetCol}`);
      }
      if (config.maxDepth !== undefined) {
        this.maxDepth = config.maxDepth;
        console.log(`📏 Profondeur maximale : ${this.maxDepth}`);
      }
      if (config.minSamplesLeaf !== undefined) {
        this.minSamplesLeaf = config.minSamplesLeaf;
        console.log(`🌿 Minimum par feuille : ${this.minSamplesLeaf}`);
      }
      return this;
    };

    // ============================================================
    // MÉTHODE D'ENTRAÎNEMENT
    // ============================================================

    /**
     * Entraîne le Random Forest sur une matrice
     * 
     * @param {tools.Library.Stats.Matrice} matrice - Matrice d'entraînement
     * @returns {this}
     */
    this.train = function (matrice) {
      if (!matrice) {
        throw new Error("❌ La matrice d'entraînement est nulle ou indéfinie.");
      }

      this.trainingMatrix = matrice;

      const rows = matrice.getLignes();
      const cols = matrice.getColonnes();

      // Colonne cible par défaut : dernière colonne
      if (!this.targetCol) {
        this.targetCol = cols[cols.length - 1];
        console.log(`🎯 Colonne cible par défaut : ${this.targetCol}`);
      }

      if (!matrice.colIndexExist(this.targetCol)) {
        throw new Error(
          `❌ La colonne cible "${this.targetCol}" n'existe pas. ` +
          `Colonnes disponibles : ${cols.join(', ')}`
        );
      }

      // Colonnes caractéristiques par défaut : toutes sauf la cible
      if (this.featureCols.length === 0) {
        this.featureCols = cols.filter(col => col !== this.targetCol);
        console.log(`📋 Colonnes caractéristiques par défaut : ${this.featureCols.join(', ')}`);
      }

      // Vérification des colonnes caractéristiques
      for (let i = 0; i < this.featureCols.length; i++) {
        if (!matrice.colIndexExist(this.featureCols[i])) {
          throw new Error(
            `❌ La colonne "${this.featureCols[i]}" n'existe pas.`
          );
        }
      }

      // maxFeatures par défaut : racine carrée du nombre de caractéristiques
      if (!this.maxFeatures) {
        this.maxFeatures = Math.floor(Math.sqrt(this.featureCols.length));
        console.log(`📊 maxFeatures par défaut : ${this.maxFeatures}`);
      }

      // Construction des arbres
      console.log(`🌳 Construction de ${this.nTrees} arbres de décision...`);
      this.trees = [];

      for (let i = 0; i < this.nTrees; i++) {
        console.log(`   Arbre ${i + 1}/${this.nTrees}...`);

        // Échantillonnage bootstrap
        const sampledRows = this._bootstrapSample(rows, this.sampleRatio);

        // Construction de l'arbre
        const tree = new tools.Library.Tree(`Tree_${i + 1}`);
        this._buildDecisionTree(
          tree,
          matrice,
          sampledRows,
          this.featureCols,
          this.targetCol,
          0,
          this.maxDepth
        );

        this.trees.push(tree);
      }

      this.isTrained = true;

      // ============================================================
      // NOUVEAU : Calcul de l'importance des features après l'entraînement
      // ============================================================
      this._computeFeatureImportance();

      console.log(`✅ Random Forest entraîné avec succès ! ${this.trees.length} arbres.`);
      console.log(`   📋 Caractéristiques : ${this.featureCols.join(', ')}`);
      console.log(`   🎯 Cible : ${this.targetCol}`);

      return this;
    };

    // ============================================================
    // MÉTHODE DE PRÉDICTION
    // ============================================================

    /**
     * Prédit les valeurs manquantes d'un sample
     * 
     * @param {Object} sample - Objet clé-valeur partiel
     * @returns {Object} Le sample complété
     */
    this.predict = function (sample) {
      if (!this.isTrained || this.trees.length === 0) {
        throw new Error(
          "❌ Le Random Forest n'est pas entraîné. Utilisez train() d'abord."
        );
      }

      if (!sample || typeof sample !== 'object') {
        throw new Error("❌ Le sample doit être un objet clé-valeur.");
      }

      const allCols = this.trainingMatrix.getColonnes();
      const missingCols = allCols.filter(
        col => sample[col] === undefined || sample[col] === null
      );

      if (missingCols.length === 0) {
        console.log("ℹ️ Le sample est déjà complet.");
        return sample;
      }

      console.log(`🔮 Prédiction des colonnes : ${missingCols.join(', ')}`);

      const predictions = {};
      for (let i = 0; i < missingCols.length; i++) {
        const col = missingCols[i];
        const prediction = this._predictColumn(sample, col);
        predictions[col] = prediction;
        console.log(`   ${col} → ${prediction}`);
      }

      return { ...sample, ...predictions };
    };

    // ============================================================
    // MÉTHODE DE TRANSFORMATION
    // ============================================================

    /**
     * Transforme une matrice en arbre
     * 
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Function} callback - Fonction de transformation
     * @returns {tools.Library.Tree} L'arbre construit
     */
    this.transform = function (matrice, callback) {
      if (!matrice) {
        throw new Error("❌ La matrice est nulle ou indéfinie.");
      }

      const root = new tools.Library.Tree('Root', null);
      const rows = matrice.getLignes();
      const cols = matrice.getColonnes();

      console.log(`🔄 Transformation de la matrice (${rows.length} lignes, ${cols.length} colonnes)...`);

      for (let i = 0; i < rows.length; i++) {
        const rowName = rows[i];
        const rowNode = new tools.Library.Tree(`Row_${i}`, rowName);
        root.addChild(rowNode);

        for (let j = 0; j < cols.length; j++) {
          const colName = cols[j];
          const value = matrice.getElement(colName, rowName);

          const cell = {
            indexRow: i,
            indexCol: j,
            colName: colName,
            rowName: rowName,
            val: value
          };

          const transformed = callback(cell);
          if (transformed !== undefined && transformed !== null) {
            let childNode;
            if (transformed instanceof tools.Library.Tree) {
              childNode = transformed;
            } else {
              childNode = new tools.Library.Tree(
                typeof transformed === 'string' ? transformed : `${colName}`,
                transformed
              );
            }
            rowNode.addChild(childNode);
          }
        }
      }

      console.log(`✅ Transformation terminée !`);
      return root;
    };

    // ============================================================
    // MÉTHODE POUR L'IMPORTANCE DES FEATURES
    // ============================================================

    /**
     * Retourne l'importance des caractéristiques
     * 
     * @returns {Array|null} Tableau trié [{feature: nom, importance: score}, ...]
     */
    this.getFeatureImportance = function () {
      if (!this._importanceComputed) {
        console.warn("⚠️ L'importance n'a pas encore été calculée. Entraînez d'abord le modèle.");
        return null;
      }
      return this.featureImportance;
    };

    /**
     * Calcule l'importance des caractéristiques (méthode basée sur la réduction d'impureté)
     * @private
     */
    this._computeFeatureImportance = function () {
      if (!this.isTrained || this.trees.length === 0) {
        console.warn("⚠️ Impossible de calculer l'importance : modèle non entraîné.");
        return;
      }

      console.log("📊 Calcul de l'importance des caractéristiques...");

      // Accumulateur pour toutes les features
      const totalImportance = {};

      // Parcourir chaque arbre
      for (let t = 0; t < this.trees.length; t++) {
        const tree = this.trees[t];
        // Utiliser la nouvelle méthode computeFeatureImportance de Tree
        const treeImportance = tree.computeFeatureImportance();

        // Accumuler les scores
        for (const feature in treeImportance) {
          if (totalImportance[feature] === undefined) {
            totalImportance[feature] = 0;
          }
          totalImportance[feature] += treeImportance[feature];
        }
      }

      // Normaliser les scores (somme = 1)
      let totalSum = 0;
      for (const feature in totalImportance) {
        totalSum += totalImportance[feature];
      }

      if (totalSum === 0) {
        console.warn("⚠️ Aucune importance calculée. Les arbres sont peut-être trop petits.");
        this.featureImportance = this.featureCols.map(function(f) {
          return { feature: f, importance: 0 };
        });
        this._importanceComputed = true;
        return;
      }

      // Créer un tableau trié
      const sortedImportance = [];
      for (const feature in totalImportance) {
        sortedImportance.push({
          feature: feature,
          importance: totalImportance[feature] / totalSum
        });
      }

      // Trier par importance décroissante
      sortedImportance.sort(function(a, b) {
        return b.importance - a.importance;
      });

      this.featureImportance = sortedImportance;
      this._importanceComputed = true;

      // Afficher un résumé
      console.log("📊 Importance des caractéristiques :");
      for (let i = 0; i < Math.min(5, sortedImportance.length); i++) {
        const fi = sortedImportance[i];
        const pct = (fi.importance * 100).toFixed(1);
        const emoji = ["🔴", "🟠", "🟡", "🟢", "🔵"][i] || "▪️";
        console.log(`   ${emoji} ${fi.feature} → ${pct}%`);
      }

      this.featureImportance = sortedImportance;
    };

    // ============================================================
    // MÉTHODES ABSTRAITES (redéfinies par les sous-classes)
    // ============================================================

    /**
     * Retourne la valeur d'une feuille.
     * 
     * @abstract
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes de la feuille
     * @param {string} targetCol - Colonne cible
     * @returns {*} La valeur de la feuille
     */
    this._getLeafValue = function (matrice, rows, targetCol) {
      throw new Error("❌ _getLeafValue() doit être redéfinie par la sous-classe.");
    };

    /**
     * Agrège les votes des arbres.
     * 
     * @abstract
     * @param {Object} votes - Dictionnaire {valeur: nombre_de_votes}
     * @returns {*} La valeur agrégée
     */
    this._aggregateVotes = function (votes) {
      throw new Error("❌ _aggregateVotes() doit être redéfinie par la sous-classe.");
    };

    // ============================================================
    // MÉTHODES UTILITAIRES (communes)
    // ============================================================

    /**
     * Échantillonnage bootstrap
     * @private
     */
    this._bootstrapSample = function (array, ratio) {
      const size = Math.floor(array.length * ratio);
      const sample = [];
      for (let i = 0; i < size; i++) {
        const randomIndex = Math.floor(Math.random() * array.length);
        sample.push(array[randomIndex]);
      }
      return sample;
    };

    /**
     * Mélange un tableau (Fisher-Yates)
     * @private
     */
    this._shuffleArray = function (array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    /**
     * Calcule l'impureté de Gini
     * @private
     */
    this._calculateGini = function (values) {
      if (values.length === 0) return 0;
      const counts = {};
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v !== null && v !== undefined) {
          counts[v] = (counts[v] || 0) + 1;
        }
      }
      const total = values.length;
      let gini = 1;
      for (const key in counts) {
        const p = counts[key] / total;
        gini -= p * p;
      }
      return gini;
    };

    /**
     * Calcule l'erreur quadratique moyenne (MSE)
     * @private
     */
    this._calculateMSE = function (values) {
      if (values.length === 0) return 0;
      let sum = 0, count = 0;
      for (let i = 0; i < values.length; i++) {
        const v = parseFloat(values[i]);
        if (!isNaN(v)) { sum += v; count++; }
      }
      if (count === 0) return 0;
      const mean = sum / count;
      let mse = 0;
      for (let i = 0; i < values.length; i++) {
        const v = parseFloat(values[i]);
        if (!isNaN(v)) { mse += (v - mean) ** 2; }
      }
      return mse / count;
    };

    /**
     * Vérifie si une colonne est numérique
     * @private
     */
    this._isNumeric = function (matrice, rows, feature) {
      let numericCount = 0, total = 0;
      for (let i = 0; i < rows.length; i++) {
        const val = matrice.getElement(feature, rows[i]);
        if (val !== null && val !== undefined) {
          total++;
          if (!isNaN(parseFloat(val)) && isFinite(val)) {
            numericCount++;
          }
        }
      }
      return total > 0 && (numericCount / total) > 0.5;
    };

    /**
     * Trouve le meilleur seuil pour une feature numérique
     * @private
     */
    this._findBestThreshold = function (matrice, rows, feature, targetCol) {
      const values = [];
      for (let i = 0; i < rows.length; i++) {
        const val = parseFloat(matrice.getElement(feature, rows[i]));
        if (!isNaN(val)) { values.push(val); }
      }
      const uniqueValues = [];
      const seen = {};
      for (let i = 0; i < values.length; i++) {
        if (!seen[values[i]]) { seen[values[i]] = true; uniqueValues.push(values[i]); }
      }
      uniqueValues.sort((a, b) => a - b);
      if (uniqueValues.length <= 1) return null;

      const targetValues = rows.map(r => matrice.getElement(targetCol, r));
      const parentScore = this._getScore(targetValues);

      let bestThreshold = null, bestGain = -Infinity;

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const leftRows = [], rightRows = [];
        for (let j = 0; j < rows.length; j++) {
          const val = parseFloat(matrice.getElement(feature, rows[j]));
          if (!isNaN(val)) {
            if (val <= threshold) { leftRows.push(rows[j]); }
            else { rightRows.push(rows[j]); }
          }
        }
        if (leftRows.length === 0 || rightRows.length === 0) continue;

        const leftTargets = leftRows.map(r => matrice.getElement(targetCol, r));
        const rightTargets = rightRows.map(r => matrice.getElement(targetCol, r));

        const weightedScore =
          (leftRows.length / rows.length) * this._getScore(leftTargets) +
          (rightRows.length / rows.length) * this._getScore(rightTargets);

        const gain = parentScore - weightedScore;

        if (gain > bestGain) {
          bestGain = gain;
          bestThreshold = threshold;
        }
      }

      return bestThreshold !== null ? { threshold: bestThreshold, gain: bestGain } : null;
    };

    /**
     * Trouve le meilleur split catégoriel
     * @private
     */
    this._findBestCategoricalSplit = function (matrice, rows, feature, targetCol) {
      const uniqueValues = [];
      const seen = {};
      for (let i = 0; i < rows.length; i++) {
        const val = matrice.getElement(feature, rows[i]);
        if (val !== null && val !== undefined && !seen[val]) {
          seen[val] = true;
          uniqueValues.push(val);
        }
      }
      if (uniqueValues.length <= 1) return null;

      const targetValues = rows.map(r => matrice.getElement(targetCol, r));
      const parentScore = this._getScore(targetValues);

      let bestValue = null, bestGain = -Infinity;

      for (let i = 0; i < uniqueValues.length; i++) {
        const splitValue = uniqueValues[i];
        const leftRows = [], rightRows = [];
        for (let j = 0; j < rows.length; j++) {
          const val = matrice.getElement(feature, rows[j]);
          if (String(val).toUpperCase() === String(splitValue).toUpperCase()) {
            leftRows.push(rows[j]);
          } else {
            rightRows.push(rows[j]);
          }
        }
        if (leftRows.length === 0 || rightRows.length === 0) continue;

        const leftTargets = leftRows.map(r => matrice.getElement(targetCol, r));
        const rightTargets = rightRows.map(r => matrice.getElement(targetCol, r));

        const weightedScore =
          (leftRows.length / rows.length) * this._getScore(leftTargets) +
          (rightRows.length / rows.length) * this._getScore(rightTargets);

        const gain = parentScore - weightedScore;

        if (gain > bestGain) {
          bestGain = gain;
          bestValue = splitValue;
        }
      }

      return bestValue !== null ? { value: bestValue, gain: bestGain } : null;
    };

    /**
     * Trouve le meilleur split global
     * @private
     */
    this._findBestSplit = function (matrice, rows, features, targetCol) {
      let bestSplit = null, bestGain = -Infinity;

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (this._isNumeric(matrice, rows, feature)) {
          const result = this._findBestThreshold(matrice, rows, feature, targetCol);
          if (result && result.gain > bestGain) {
            bestGain = result.gain;
            bestSplit = {
              feature: feature,
              type: 'numeric',
              threshold: result.threshold,
              gain: result.gain
            };
          }
        } else {
          const result = this._findBestCategoricalSplit(matrice, rows, feature, targetCol);
          if (result && result.gain > bestGain) {
            bestGain = result.gain;
            bestSplit = {
              feature: feature,
              type: 'categorical',
              value: result.value,
              gain: result.gain
            };
          }
        }
      }

      return bestSplit;
    };

    /**
     * Construction d'un arbre de décision (CART)
     * @private
     */
    this._buildDecisionTree = function (
      node, matrice, rows, features, targetCol, depth, maxDepth
    ) {
      if (rows.length === 0) { node.value = null; return; }

      // Vérifier si toutes les lignes ont la même classe / valeur
      const targetValues = rows.map(r => matrice.getElement(targetCol, r));
      const seenTargets = {};
      const uniqueTargets = [];
      for (let i = 0; i < targetValues.length; i++) {
        if (!seenTargets[targetValues[i]]) {
          seenTargets[targetValues[i]] = true;
          uniqueTargets.push(targetValues[i]);
        }
      }

      if (uniqueTargets.length === 1) {
        node.value = uniqueTargets[0];
        node.setSamples(rows.length);
        return;
      }

      // Conditions d'arrêt
      if (depth >= maxDepth ||
          rows.length < this.minSamplesLeaf * 2 ||
          features.length === 0) {
        node.value = this._getLeafValue(matrice, rows, targetCol);
        node.setSamples(rows.length);
        return;
      }

      // Sous-ensemble aléatoire de features
      const shuffled = this._shuffleArray(features);
      const selectedFeatures = shuffled.slice(0, this.maxFeatures);

      const bestSplit = this._findBestSplit(matrice, rows, selectedFeatures, targetCol);

      if (!bestSplit || bestSplit.gain <= 0) {
        node.value = this._getLeafValue(matrice, rows, targetCol);
        node.setSamples(rows.length);
        return;
      }

      const leftRows = [], rightRows = [];
      let splitName = '';

      if (bestSplit.type === 'numeric') {
        splitName = bestSplit.feature + '<=' + bestSplit.threshold;
        for (let i = 0; i < rows.length; i++) {
          const val = parseFloat(matrice.getElement(bestSplit.feature, rows[i]));
          if (!isNaN(val) && val <= bestSplit.threshold) { leftRows.push(rows[i]); }
          else { rightRows.push(rows[i]); }
        }
      } else {
        splitName = bestSplit.feature + '==' + bestSplit.value;
        for (let i = 0; i < rows.length; i++) {
          const val = matrice.getElement(bestSplit.feature, rows[i]);
          if (String(val).toUpperCase() === String(bestSplit.value).toUpperCase()) {
            leftRows.push(rows[i]);
          } else {
            rightRows.push(rows[i]);
          }
        }
      }

      if (leftRows.length === 0 || rightRows.length === 0) {
        node.value = this._getLeafValue(matrice, rows, targetCol);
        node.setSamples(rows.length);
        return;
      }

      // ============================================================
      // NOUVEAU : Enregistrer la réduction d'impureté pour l'importance
      // ============================================================
      node.setFeatureName(bestSplit.feature);
      node.setImpurityReduction(bestSplit.gain);
      node.setSamples(rows.length);

      node.name = splitName;
      node.value = this._getLeafValue(matrice, rows, targetCol);

      const leftNode = new tools.Library.Tree(splitName + '_left');
      const rightNode = new tools.Library.Tree(splitName + '_right');
      node.addChild(leftNode);
      node.addChild(rightNode);

      this._buildDecisionTree(leftNode, matrice, leftRows, features, targetCol, depth + 1, maxDepth);
      this._buildDecisionTree(rightNode, matrice, rightRows, features, targetCol, depth + 1, maxDepth);
    };

    /**
     * Parcourt un arbre pour faire une prédiction
     * @private
     */
    this._traverseTree = function (node, sample) {
      if (node.children.length === 0) {
        return node.value;
      }

      const leftChild = node.children[0];
      const rightChild = node.children[1];
      if (!leftChild || !rightChild) { return node.value; }

      const nodeName = node.name || '';

      if (nodeName.indexOf('<=') !== -1) {
        const sepIdx = nodeName.indexOf('<=');
        const feature = nodeName.substring(0, sepIdx).trim();
        const threshold = parseFloat(nodeName.substring(sepIdx + 2).trim());

        const sampleVal = sample[feature];
        if (sampleVal === undefined || sampleVal === null) { return node.value; }

        const numVal = parseFloat(sampleVal);
        if (isNaN(numVal)) { return node.value; }

        return numVal <= threshold
          ? this._traverseTree(leftChild, sample)
          : this._traverseTree(rightChild, sample);

      } else if (nodeName.indexOf('==') !== -1) {
        const sepIdx = nodeName.indexOf('==');
        const feature = nodeName.substring(0, sepIdx).trim();
        const splitVal = nodeName.substring(sepIdx + 2).trim();

        const sampleVal = sample[feature];
        if (sampleVal === undefined || sampleVal === null) { return node.value; }

        return String(sampleVal).toUpperCase() === splitVal.toUpperCase()
          ? this._traverseTree(leftChild, sample)
          : this._traverseTree(rightChild, sample);

      } else {
        return node.value;
      }
    };

    /**
     * Prédit une colonne spécifique
     * @private
     */
    this._predictColumn = function (sample, targetCol) {
      const votes = {};

      for (let i = 0; i < this.trees.length; i++) {
        const prediction = this._traverseTree(this.trees[i], sample);
        if (prediction !== undefined && prediction !== null) {
          votes[prediction] = (votes[prediction] || 0) + 1;
        }
      }

      return this._aggregateVotes(votes);
    };

    /**
     * Retourne le score (Gini ou MSE) selon le contexte
     * @private
     */
    this._getScore = function (values) {
      // Par défaut, utilise Gini (surchargé dans les sous-classes si besoin)
      return this._calculateGini(values);
    };

    // ============================================================
    // NOUVEAU : SÉRIALISATION POUR PERSISTANCE (IndexedDB)
    // ============================================================

    /**
     * Convertit ce Random Forest entraîné en un objet JavaScript "brut"
     * (sans fonctions, sans référence circulaire) prêt pour
     * JSON.stringify() puis pour être restauré via
     * tools.Library.RandomForest.fromJSON().
     * 
     * modelType est inclus pour que fromJSON() sache s'il doit
     * reconstruire un RandomForestClassifier ou un RandomForestRegressor.
     * 
     * @returns {Object} Représentation sérialisable de la forêt entraînée
     */
    this.toJSON = function () {
      return {
        modelType: this.modelType,
        nTrees: this.nTrees,
        sampleRatio: this.sampleRatio,
        featureCols: this.featureCols,
        targetCol: this.targetCol,
        maxDepth: this.maxDepth,
        minSamplesLeaf: this.minSamplesLeaf,
        trees: this.trees.map(function (tree) {
          return tree.toPlainObject();
        })
      };
    };
  };

  // Établir l'héritage de Analyser
  tools.Library.RandomForest.prototype = Object.create(
    tools.Library.Analyser.prototype
  );
  tools.Library.RandomForest.prototype.constructor = tools.Library.RandomForest;


  // ============================================================
  // CLASSE : RandomForestClassifier
  // ============================================================

  /**
   * RandomForestClassifier - Classification
   * 
   * Utilise :
   *   - Impureté de Gini pour les splits
   *   - Vote majoritaire pour l'agrégation
   */
  tools.Library.RandomForestClassifier = function () {
    tools.Library.RandomForest.call(this);
    this.modelType = "RandomForestClassifier";

    /**
     * Retourne la valeur la plus fréquente (majorité)
     * @override
     */
    this._getLeafValue = function (matrice, rows, targetCol) {
      if (rows.length === 0) return null;

      const counts = {};
      for (let i = 0; i < rows.length; i++) {
        const value = matrice.getElement(targetCol, rows[i]);
        if (value !== undefined && value !== null) {
          counts[value] = (counts[value] || 0) + 1;
        }
      }

      let mostCommon = null, maxCount = 0;
      for (const key in counts) {
        if (counts[key] > maxCount) {
          maxCount = counts[key];
          mostCommon = key;
        }
      }

      return mostCommon;
    };

    /**
     * Vote majoritaire
     * @override
     */
    this._aggregateVotes = function (votes) {
      let max = 0, result = null;
      for (const key in votes) {
        if (votes[key] > max) {
          max = votes[key];
          result = key;
        }
      }
      return result;
    };

    /**
     * Utilise Gini pour le score
     * @override
     */
    this._getScore = function (values) {
      return this._calculateGini(values);
    };
  };

  // Héritage
  tools.Library.RandomForestClassifier.prototype = Object.create(
    tools.Library.RandomForest.prototype
  );
  tools.Library.RandomForestClassifier.prototype.constructor = tools.Library.RandomForestClassifier;


  // ============================================================
  // CLASSE : RandomForestRegressor
  // ============================================================

  /**
   * RandomForestRegressor - Régression
   * 
   * Utilise :
   *   - Erreur quadratique moyenne (MSE) pour les splits
   *   - Moyenne pour l'agrégation
   */
  tools.Library.RandomForestRegressor = function () {
    tools.Library.RandomForest.call(this);
    this.modelType = "RandomForestRegressor";

    /**
     * Retourne la moyenne des valeurs numériques
     * @override
     */
    this._getLeafValue = function (matrice, rows, targetCol) {
      let sum = 0, count = 0;
      for (let i = 0; i < rows.length; i++) {
        const val = parseFloat(matrice.getElement(targetCol, rows[i]));
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    };

    /**
     * Moyenne pondérée des votes
     * @override
     */
    this._aggregateVotes = function (votes) {
      let sum = 0, count = 0;
      for (const key in votes) {
        const val = parseFloat(key);
        if (!isNaN(val)) {
          sum += val * votes[key];
          count += votes[key];
        }
      }
      return count > 0 ? sum / count : null;
    };

    /**
     * Utilise MSE pour le score
     * @override
     */
    this._getScore = function (values) {
      return this._calculateMSE(values);
    };
  };

  // Héritage
  tools.Library.RandomForestRegressor.prototype = Object.create(
    tools.Library.RandomForest.prototype
  );
  tools.Library.RandomForestRegressor.prototype.constructor = tools.Library.RandomForestRegressor;


  // ============================================================
  // NOUVEAU : RECONSTRUCTION DEPUIS toJSON()
  // ============================================================

  /**
   * Reconstruit un RandomForest (Classifier ou Regressor selon
   * data.modelType) entraîné à partir d'un objet produit par toJSON().
   * 
   * Attachée sur RandomForest (la classe de base) mais utilisable aussi
   * pour reconstruire un RandomForestClassifier ou RandomForestRegressor,
   * puisque c'est data.modelType qui décide quelle sous-classe instancier.
   * 
   * @param {Object} data - Objet produit par forest.toJSON()
   * @returns {tools.Library.RandomForest} L'instance reconstruite (déjà entraînée)
   */
  tools.Library.RandomForest.fromJSON = function (data) {
    var instance;

    if (data.modelType === "RandomForestRegressor") {
      instance = new tools.Library.RandomForestRegressor();
    } else {
      // Par défaut (et pour "RandomForestClassifier") : classification
      instance = new tools.Library.RandomForestClassifier();
    }

    instance.nTrees = data.nTrees;
    instance.sampleRatio = data.sampleRatio;
    instance.featureCols = data.featureCols;
    instance.targetCol = data.targetCol;
    instance.maxDepth = data.maxDepth;
    instance.minSamplesLeaf = data.minSamplesLeaf;

    instance.trees = (data.trees || []).map(function (treeObj) {
      return tools.Library.Tree.fromPlainObject(treeObj);
    });

    instance.isTrained = true;
    instance._computeFeatureImportance();

    return instance;
  };


  // ============================================================
  // MESSAGE DE CHARGEMENT
  // ============================================================

  console.log("✅ tools.Library.RandomForest chargé avec succès");
  console.log("   - RandomForest (base)");
  console.log("   - RandomForestClassifier (classification)");
  console.log("   - RandomForestRegressor (régression)");
  console.log("   - Support de l'importance des features (comme scikit-learn)");

})();