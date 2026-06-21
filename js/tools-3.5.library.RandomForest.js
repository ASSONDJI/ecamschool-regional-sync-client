/**
 * ============================================================
 * RANDOM FOREST - ALGORITHME DE PRÉDICTION
 * ============================================================
 *
 * Le Random Forest est un algorithme d'apprentissage supervisé
 * qui construit une "forêt" d'arbres de décision.
 *
 * Principe de fonctionnement :
 * 1. On crée plusieurs arbres de décision à partir d'échantillons
 *    aléatoires des données (bootstrap sampling)
 * 2. Chaque arbre est construit avec un sous-ensemble aléatoire
 *    des caractéristiques (features)
 * 3. Pour faire une prédiction, on fait "voter" tous les arbres
 * 4. La valeur qui obtient le plus de votes est la prédiction finale
 *
 * Avantages du Random Forest :
 * - Réduit le surapprentissage (overfitting)
 * - Fonctionne bien avec des données de grande dimension
 * - Robustesse face aux données manquantes
 * - Peut gérer des relations non-linéaires
 *
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function () {
  "use strict";

  /**
   * RandomForest - Algorithme de prédiction
   *
   * Hérite de Analyser pour respecter le contrat de l'interface.
   */
  tools.Library.RandomForest = function () {
    // ============================================================
    // HÉRITAGE DE ANALYSER
    // ============================================================

    // Appel du constructeur parent
    tools.Library.Analyser.call(this);

    // ============================================================
    // PROPRIÉTÉS SPÉCIFIQUES
    // ============================================================

    /**
     * Type du modèle (identifiant)
     * @type {string}
     */
    this.modelType = "RandomForest";

    /**
     * La forêt : un ensemble d'arbres de décision
     * @type {Array<tools.Library.Tree>}
     */
    this.trees = [];

    /**
     * Nombre d'arbres dans la forêt
     * Plus il y a d'arbres, plus la prédiction est fiable,
     * mais plus l'entraînement est long.
     * @type {number}
     */
    this.nTrees = 10;

    /**
     * Proportion des données utilisées pour l'entraînement de chaque arbre
     * (bootstrap sampling). Généralement entre 0.6 et 0.8.
     * @type {number}
     */
    this.sampleRatio = 0.7;

    /**
     * Nombre maximum de caractéristiques (features) à considérer
     * pour chaque division d'un arbre.
     * @type {number}
     */
    this.maxFeatures = null;

    /**
     * Les colonnes utilisées comme caractéristiques pour la prédiction
     * @type {Array<string>}
     */
    this.featureCols = [];

    /**
     * La colonne cible (ce qu'on veut prédire)
     * @type {string}
     */
    this.targetCol = null;

    /**
     * Profondeur maximale des arbres (limite pour éviter le surapprentissage)
     * @type {number}
     */
    this.maxDepth = 10;

    /**
     * Nombre minimum d'échantillons dans une feuille
     * @type {number}
     */
    this.minSamplesLeaf = 2;

    // ============================================================
    // MÉTHODES DE CONFIGURATION
    // ============================================================

    /**
     * Configure le Random Forest avec les paramètres désirés
     *
     * @param {Object} config - Configuration du modèle
     * @param {number} [config.nTrees=10] - Nombre d'arbres
     * @param {number} [config.sampleRatio=0.7] - Proportion des données par arbre
     * @param {Array<string>} [config.featureCols=[]] - Colonnes caractéristiques
     * @param {string} [config.targetCol=null] - Colonne cible
     * @param {number} [config.maxDepth=10] - Profondeur maximale des arbres
     * @param {number} [config.minSamplesLeaf=2] - Minimum d'échantillons par feuille
     * @returns {this} Pour permettre le chaînage
     */
    this.configure = function (config) {
      if (config.nTrees !== undefined) {
        this.nTrees = config.nTrees;
        console.log(` Nombre d'arbres configuré : ${this.nTrees}`);
      }

      if (config.sampleRatio !== undefined) {
        this.sampleRatio = config.sampleRatio;
        console.log(` Ratio d'échantillonnage : ${this.sampleRatio * 100}%`);
      }

      if (config.featureCols !== undefined) {
        this.featureCols = config.featureCols;
        console.log(
          ` Colonnes caractéristiques : ${this.featureCols.join(", ")}`,
        );
      }

      if (config.targetCol !== undefined) {
        this.targetCol = config.targetCol;
        console.log(` Colonne cible : ${this.targetCol}`);
      }

      if (config.maxDepth !== undefined) {
        this.maxDepth = config.maxDepth;
        console.log(` Profondeur maximale : ${this.maxDepth}`);
      }

      if (config.minSamplesLeaf !== undefined) {
        this.minSamplesLeaf = config.minSamplesLeaf;
        console.log(
          `Minimum d'échantillons par feuille : ${this.minSamplesLeaf}`,
        );
      }

      return this;
    };

    // ============================================================
    // MÉTHODE D'ENTRAÎNEMENT (IMPLÉMENTATION DE Analyser)
    // ============================================================

    /**
     * Entraîne le Random Forest sur une matrice
     *
     * @param {tools.Library.Stats.Matrice} matrice - La matrice d'entraînement
     * @returns {this} Pour permettre le chaînage
     */
    this.train = function (matrice) {
      // Étape 1 : Vérifier que la matrice est valide
      if (!matrice) {
        throw new Error(" La matrice d'entraînement est nulle ou indéfinie.");
      }

      this.trainingMatrix = matrice;

      // Étape 2 : Récupérer les lignes et colonnes
      const rows = matrice.getLignes();
      const cols = matrice.getColonnes();

      // Étape 3 : Vérifier que la colonne cible existe
      if (!this.targetCol) {
        // Si non spécifiée, on prend la dernière colonne
        this.targetCol = cols[cols.length - 1];
        console.log(
          ` Colonne cible non spécifiée. Utilisation de : ${this.targetCol}`,
        );
      }

      if (!matrice.colIndexExist(this.targetCol)) {
        throw new Error(
          ` La colonne cible "${this.targetCol}" n'existe pas dans la matrice. ` +
            `Colonnes disponibles : ${cols.join(", ")}`,
        );
      }

      // Étape 4 : Déterminer les colonnes caractéristiques
      if (this.featureCols.length === 0) {
        // Par défaut, on prend toutes les colonnes sauf la cible
        this.featureCols = cols.filter((col) => col !== this.targetCol);
        console.log(
          ` Colonnes caractéristiques non spécifiées. Utilisation de : ${this.featureCols.join(", ")}`,
        );
      }

      // Étape 5 : Vérifier que les colonnes caractéristiques existent
      for (let i = 0; i < this.featureCols.length; i++) {
        if (!matrice.colIndexExist(this.featureCols[i])) {
          throw new Error(
            ` La colonne caractéristique "${this.featureCols[i]}" n'existe pas dans la matrice.`,
          );
        }
      }

      // Étape 6 : Configurer maxFeatures (nombre de caractéristiques à considérer)
      if (!this.maxFeatures) {
        // Par défaut : racine carrée du nombre de caractéristiques
        this.maxFeatures = Math.floor(Math.sqrt(this.featureCols.length));
        console.log(
          ` maxFeatures non spécifié. Utilisation de : ${this.maxFeatures}`,
        );
      }

      // Étape 7 : Construire les arbres de la forêt
      console.log(` Construction de ${this.nTrees} arbres de décision...`);
      this.trees = [];

      for (let i = 0; i < this.nTrees; i++) {
        console.log(`    Arbre ${i + 1}/${this.nTrees}...`);

        // 7.1: Échantillonnage bootstrap
        const sampledRows = this._bootstrapSample(rows, this.sampleRatio);

        // 7.2: Construction de l'arbre
        const tree = new tools.Library.Tree(`Tree_${i + 1}`);
        this._buildDecisionTree(
          tree, // Nœud racine
          matrice, // Matrice source
          sampledRows, // Lignes échantillonnées
          this.featureCols, // Caractéristiques disponibles
          this.targetCol, // Colonne cible
          0, // Profondeur actuelle
          this.maxDepth, // Profondeur maximale
        );

        this.trees.push(tree);
      }

      // Étape 8 : Marquer le modèle comme entraîné
      this.isTrained = true;

      console.log(
        ` Random Forest entraîné avec succès ! ${this.trees.length} arbres construits.`,
      );
      console.log(
        `    Colonnes caractéristiques : ${this.featureCols.join(", ")}`,
      );
      console.log(`    Colonne cible : ${this.targetCol}`);

      return this;
    };

    // ============================================================
    // MÉTHODE DE PRÉDICTION (IMPLÉMENTATION DE Analyser)
    // ============================================================

    /**
     * Prédit les valeurs manquantes d'un sample
     *
     * @param {Object} sample - Objet clé-valeur partiel
     * @returns {Object} Le sample complété
     */
    this.predict = function (sample) {
      // Étape 1 : Vérifier que le modèle est entraîné
      if (!this.isTrained || this.trees.length === 0) {
        throw new Error(
          " Le Random Forest n'est pas encore entraîné. " +
            "Utilisez la méthode train() d'abord.",
        );
      }

      // Étape 2 : Vérifier que le sample est valide
      if (!sample || typeof sample !== "object") {
        throw new Error(" Le sample doit être un objet clé-valeur.");
      }

      // Étape 3 : Identifier les colonnes manquantes
      const allCols = this.trainingMatrix.getColonnes();
      const missingCols = allCols.filter(
        (col) => sample[col] === undefined || sample[col] === null,
      );

      if (missingCols.length === 0) {
        console.log(
          " Le sample est déjà complet. Aucune prédiction nécessaire.",
        );
        return sample;
      }

      console.log(
        ` Prédiction des colonnes manquantes : ${missingCols.join(", ")}`,
      );

      // Étape 4 : Pour chaque colonne manquante, faire une prédiction
      const predictions = {};
      for (let i = 0; i < missingCols.length; i++) {
        const col = missingCols[i];
        const prediction = this._predictColumn(sample, col);
        predictions[col] = prediction;
        console.log(`    ${col} → ${prediction}`);
      }

      // Étape 5 : Fusionner les prédictions avec le sample original
      const result = { ...sample, ...predictions };

      return result;
    };

    // ============================================================
    // MÉTHODE DE TRANSFORMATION (IMPLÉMENTATION DE Analyser)
    // ============================================================

    /**
     * Transforme une matrice en un arbre en utilisant l'itérateur nextElement()
     *
     * @param {tools.Library.Stats.Matrice} matrice - La matrice source
     * @param {Function} callback - Fonction de transformation pour chaque cellule
     * @returns {tools.Library.Tree} L'arbre construit
     */
    this.transform = function (matrice, callback) {
      // Étape 1 : Vérifier que la matrice est valide
      if (!matrice) {
        throw new Error(" La matrice fournie est nulle ou indéfinie.");
      }

      // Étape 2 : Créer la racine de l'arbre
      const root = new tools.Library.Tree("Root", null);

      // Étape 3 : Récupérer les lignes et colonnes
      const rows = matrice.getLignes();
      const cols = matrice.getColonnes();

      console.log(
        ` Transformation de la matrice (${rows.length} lignes, ${cols.length} colonnes)...`,
      );

      // Étape 4 : Parcourir toutes les lignes
      let rowCount = 0;
      for (let i = 0; i < rows.length; i++) {
        const rowName = rows[i];
        rowCount++;

        // Créer un nœud pour la ligne
        const rowNode = new tools.Library.Tree(`Row_${i}`, rowName);
        root.addChild(rowNode);

        // Étape 5 : Parcourir toutes les colonnes de la ligne
        for (let j = 0; j < cols.length; j++) {
          const colName = cols[j];
          const value = matrice.getElement(colName, rowName);

          // Créer la cellule avec les informations nécessaires
          const cell = {
            indexRow: i,
            indexCol: j,
            colName: colName,
            rowName: rowName,
            val: value,
          };

          // Étape 6 : Appeler le callback pour transformer la cellule
          const transformed = callback(cell);

          // Ajouter le résultat comme nœud enfant
          if (transformed !== undefined && transformed !== null) {
            let childNode;
            if (transformed instanceof tools.Library.Tree) {
              childNode = transformed;
            } else {
              const nodeName =
                typeof transformed === "string" ? transformed : `${colName}`;
              childNode = new tools.Library.Tree(nodeName, transformed);
            }
            rowNode.addChild(childNode);
          }
        }
      }

      console.log(` Transformation terminée ! ${rowCount} lignes traitées.`);
      return root;
    };

    // ============================================================
    // MÉTHODES PRIVÉES (ALGORITHME)
    // ============================================================

    /**
     * Échantillonnage bootstrap
     * @private
     * @param {Array} array - Tableau à échantillonner
     * @param {number} ratio - Proportion à garder (entre 0 et 1)
     * @returns {Array} L'échantillon
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
     * Construction récursive d'un arbre de décision
     * @private
     * @param {tools.Library.Tree} node - Nœud actuel
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes à considérer
     * @param {Array} features - Caractéristiques disponibles
     * @param {string} targetCol - Colonne cible
     * @param {number} depth - Profondeur actuelle
     * @param {number} maxDepth - Profondeur maximale
     */
    this._buildDecisionTree = function (
      node,
      matrice,
      rows,
      features,
      targetCol,
      depth,
      maxDepth,
    ) {
      // Condition d'arrêt 1 : Plus de lignes ou plus de caractéristiques
      if (rows.length === 0 || features.length === 0 || depth >= maxDepth) {
        node.value = this._getMostCommonValue(matrice, rows, targetCol);
        return;
      }

      // Condition d'arrêt 2 : Toutes les lignes ont la même valeur cible
      const targetValues = rows.map((row) =>
        matrice.getElement(targetCol, row),
      );
      const uniqueTargets = [...new Set(targetValues)];
      if (uniqueTargets.length === 1) {
        node.value = uniqueTargets[0];
        return;
      }

      // Condition d'arrêt 3 : Pas assez d'échantillons pour diviser
      if (rows.length < this.minSamplesLeaf * 2) {
        node.value = this._getMostCommonValue(matrice, rows, targetCol);
        return;
      }

      // Sélectionner un sous-ensemble aléatoire de caractéristiques
      const shuffledFeatures = this._shuffleArray(features);
      const selectedFeatures = shuffledFeatures.slice(0, this.maxFeatures);

      // Trouver la meilleure caractéristique pour diviser
      const bestFeature = this._selectBestFeature(
        matrice,
        rows,
        selectedFeatures,
        targetCol,
      );

      if (!bestFeature) {
        node.value = this._getMostCommonValue(matrice, rows, targetCol);
        return;
      }

      // Obtenir les valeurs uniques de la caractéristique
      const values = this._getUniqueValues(matrice, rows, bestFeature);

      // Pour chaque valeur, créer un nœud enfant
      const remainingFeatures = features.filter((f) => f !== bestFeature);

      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const childNode = new tools.Library.Tree(`${bestFeature}=${value}`);
        node.addChild(childNode);

        // Filtrer les lignes qui ont cette valeur
        const filteredRows = rows.filter(
          (row) => matrice.getElement(bestFeature, row) === value,
        );

        // Continuer récursivement
        this._buildDecisionTree(
          childNode,
          matrice,
          filteredRows,
          remainingFeatures,
          targetCol,
          depth + 1,
          maxDepth,
        );
      }
    };

    /**
     * Sélectionne la meilleure caractéristique pour diviser
     * @private
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes à considérer
     * @param {Array} features - Caractéristiques candidates
     * @param {string} targetCol - Colonne cible
     * @returns {string|null} La meilleure caractéristique
     */
    this._selectBestFeature = function (matrice, rows, features, targetCol) {
      let bestFeature = null;
      let bestGain = -Infinity;

      // Si une seule feature, on la prend
      if (features.length === 1) {
        return features[0];
      }

      // Calculer le gain d'information pour chaque caractéristique
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const gain = this._calculateInformationGain(
          matrice,
          rows,
          feature,
          targetCol,
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = feature;
        }
      }

      return bestFeature;
    };

    /**
     * Calcule le gain d'information (implémentation simplifiée)
     * @private
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes à considérer
     * @param {string} feature - Caractéristique à évaluer
     * @param {string} targetCol - Colonne cible
     * @returns {number} Le gain d'information
     */
    /**
     * Calcule le gain d'information (version fonctionnelle)
     * @private
     */
    this._calculateInformationGain = function (
      matrice,
      rows,
      feature,
      targetCol,
    ) {
      // Si une seule valeur, pas de gain
      const featureValues = rows.map((row) => matrice.getElement(feature, row));
      const uniqueFeatureValues = [...new Set(featureValues)];
      if (uniqueFeatureValues.length <= 1) {
        return 0;
      }

      // Si la colonne cible a une seule valeur, pas de gain
      const targetValues = rows.map((row) =>
        matrice.getElement(targetCol, row),
      );
      const uniqueTargetValues = [...new Set(targetValues)];
      if (uniqueTargetValues.length <= 1) {
        return 0;
      }

      // Entropie avant division
      const entropyBefore = this._calculateEntropy(targetValues);

      // Entropie après division
      let entropyAfter = 0;
      for (let i = 0; i < uniqueFeatureValues.length; i++) {
        const value = uniqueFeatureValues[i];
        const subset = rows.filter(
          (row) => matrice.getElement(feature, row) === value,
        );
        const subsetTargets = subset.map((row) =>
          matrice.getElement(targetCol, row),
        );
        const weight = subset.length / rows.length;
        entropyAfter += weight * this._calculateEntropy(subsetTargets);
      }

      return entropyBefore - entropyAfter;
    };

    /**
     * Calcule l'entropie d'un ensemble de valeurs
     * @private
     * @param {Array} values - Liste des valeurs
     * @returns {number} L'entropie
     */
    this._calculateEntropy = function (values) {
      if (values.length === 0) {
        return 0;
      }

      const counts = {};
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value !== undefined && value !== null) {
          counts[value] = (counts[value] || 0) + 1;
        }
      }

      let entropy = 0;
      const total = values.length;

      for (const key in counts) {
        const probability = counts[key] / total;
        entropy -= probability * Math.log2(probability);
      }

      return entropy;
    };

    /**
     * Retourne les valeurs uniques d'une colonne
     * @private
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes à considérer
     * @param {string} feature - Colonne à analyser
     * @returns {Array} Les valeurs uniques
     */
    this._getUniqueValues = function (matrice, rows, feature) {
      const values = [];
      for (let i = 0; i < rows.length; i++) {
        const value = matrice.getElement(feature, rows[i]);
        if (value !== undefined && value !== null && !values.includes(value)) {
          values.push(value);
        }
      }
      return values;
    };

    /**
     * Retourne la valeur la plus fréquente d'une colonne cible
     * @private
     * @param {tools.Library.Stats.Matrice} matrice - Matrice source
     * @param {Array} rows - Lignes à considérer
     * @param {string} targetCol - Colonne cible
     * @returns {*} La valeur la plus fréquente
     */
    this._getMostCommonValue = function (matrice, rows, targetCol) {
      if (rows.length === 0) {
        return null;
      }

      const counts = {};
      for (let i = 0; i < rows.length; i++) {
        const value = matrice.getElement(targetCol, rows[i]);
        if (value !== undefined && value !== null) {
          counts[value] = (counts[value] || 0) + 1;
        }
      }

      let mostCommon = null;
      let maxCount = 0;
      for (const key in counts) {
        if (counts[key] > maxCount) {
          maxCount = counts[key];
          mostCommon = key;
        }
      }

      return mostCommon;
    };

    /**
     * Prédit la valeur d'une colonne spécifique
     * @private
     * @param {Object} sample - Le sample partiel
     * @param {string} targetCol - Colonne à prédire
     * @returns {*} La valeur prédite
     */
    this._predictColumn = function (sample, targetCol) {
      const votes = {};

      // Faire voter tous les arbres
      for (let i = 0; i < this.trees.length; i++) {
        const tree = this.trees[i];
        const prediction = this._traverseTree(tree, sample);

        if (prediction !== undefined && prediction !== null) {
          votes[prediction] = (votes[prediction] || 0) + 1;
        }
      }

      // Trouver la valeur avec le plus de votes
      let maxVotes = 0;
      let result = null;
      for (const key in votes) {
        if (votes[key] > maxVotes) {
          maxVotes = votes[key];
          result = key;
        }
      }

      return result;
    };

    /**
     * Parcourt un arbre pour trouver une prédiction
     * @private
     * @param {tools.Library.Tree} node - Nœud actuel
     * @param {Object} sample - Le sample
     * @returns {*} La valeur prédite
     */
    /**
     * Parcourt un arbre pour trouver une prédiction
     * @private
     */
    this._traverseTree = function (node, sample) {
      // Si le nœud a une valeur (feuille), on la retourne
      if (node.value !== null && node.value !== undefined) {
        return node.value;
      }

      // Si le nœud n'a pas d'enfants, on retourne sa valeur
      if (node.children.length === 0) {
        return node.value;
      }

      // Essayer de suivre le chemin correspondant au sample
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const parts = child.name.split("=");

        if (parts.length === 2) {
          const featureName = parts[0].trim();
          const featureValue = parts[1].trim();

          // Si le sample contient cette valeur, on continue
          if (
            sample[featureName] !== undefined &&
            sample[featureName] !== null &&
            String(sample[featureName]) === featureValue
          ) {
            return this._traverseTree(child, sample);
          }
        }
      }

      // Si on ne trouve pas de correspondance exacte, chercher une correspondance partielle
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const parts = child.name.split("=");

        if (parts.length === 2) {
          const featureName = parts[0].trim();
          // Vérifier si la feature existe dans le sample
          if (
            sample[featureName] !== undefined &&
            sample[featureName] !== null
          ) {
            // Chercher un enfant qui correspond approximativement
            const childValue = parts[1].trim();
            const sampleValue = String(sample[featureName]);
            if (
              childValue.includes(sampleValue) ||
              sampleValue.includes(childValue)
            ) {
              return this._traverseTree(child, sample);
            }
          }
        }
      }

      // Si on ne trouve pas de correspondance, on prend l'enfant le plus fréquent
      if (node.children.length > 0) {
        // Compter les enfants qui ont une valeur
        const childValues = {};
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child.value !== null && child.value !== undefined) {
            childValues[child.value] = (childValues[child.value] || 0) + 1;
          }
        }

        // Trouver la valeur la plus fréquente
        let maxCount = 0;
        let mostCommonValue = null;
        for (const key in childValues) {
          if (childValues[key] > maxCount) {
            maxCount = childValues[key];
            mostCommonValue = key;
          }
        }

        if (mostCommonValue !== null) {
          return mostCommonValue;
        }

        // Sinon, prendre le premier enfant
        return this._traverseTree(node.children[0], sample);
      }

      return null;
    };
    
    /**
     * Mélange un tableau aléatoirement (algorithme de Fisher-Yates)
     * @private
     * @param {Array} array - Le tableau à mélanger
     * @returns {Array} Le tableau mélangé
     */
    this._shuffleArray = function (array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
  };

  // Établir l'héritage
  tools.Library.RandomForest.prototype = Object.create(
    tools.Library.Analyser.prototype,
  );
  tools.Library.RandomForest.prototype.constructor = tools.Library.RandomForest;

  console.log(" tools.Library.RandomForest chargé avec succès");
})();
