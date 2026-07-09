/**
 * ============================================================
 * PREDICTOR - Interface simplifiée pour les décideurs
 * ============================================================
 * 
 * Cette classe permet à un utilisateur non-technique de faire
 * des prédictions sans connaître RandomForest.
 * 
 * Utilisation :
 *   var predictor = new tools.Library.Predictor();
 *   predictor.loadData(donnees);
 *   predictor.setTarget("colonneCible");
 *   predictor.analyze();
 *   var resultat = predictor.predict({ colonne1: valeur1, colonne2: valeur2 });
 * 
 * @author E-Camschool
 * @version 2.2 (Phase 2 + 3 : Rapport simplifié + Prédiction simplifiée)
 * @since 2026-06-25
 * ============================================================
 */

(function() {
    'use strict';

    /**
     * Predictor - Classe principale pour les décideurs
     */
    tools.Library.Predictor = function() {
        // ============================================================
        // PROPRIÉTÉS
        // ============================================================
        
        /** Les données brutes */
        this._data = null;
        
        /** La matrice de données */
        this._matrice = null;
        
        /** Le modèle entraîné */
        this._model = null;
        
        /** L'analyseur */
        this._analyser = null;
        
        /** La colonne cible */
        this._targetCol = null;
        
        /** Les colonnes caractéristiques (détectées automatiquement) */
        this._featureCols = null;
        
        /** Le type de problème (classification ou régression) */
        this._problemType = null;
        
        /** Le résultat de la détection (peut être 'identifiant') */
        this._detectionResult = null;
        
        /** Les résultats de l'analyse */
        this._results = null;
        
        /** Indique si le modèle est entraîné */
        this._isTrained = false;
        
        /** Indique si l'analyse a été faite */
        this._isAnalyzed = false;

        /**
         * Colonnes à exclure automatiquement (identifiants)
         * L'utilisateur peut les modifier via excludeColumns()
         */
        this._excludeCols = ["id", "ID", "idEnseignant", "idClasse", "idDiscipline"];

        /**
         * PHASE 3 : Valeurs suggérées pour les sliders
         */
        this._suggestedValues = {};

        // ============================================================
        // MÉTHODES PUBLIQUES
        // ============================================================

        /**
         * NOUVEAU : Charge directement une Matrice déjà construite
         * (utilisé par loadData() ci-dessous, et aussi directement par
         * le contrôleur d'onglet quand les données viennent du serveur
         * via ml-data-source.js, ou lors d'une restauration fromJSON()).
         * 
         * Réinitialise tout état lié à un éventuel entraînement précédent :
         * un nouveau jeu de données annule le modèle, la cible et les
         * facteurs choisis pour l'ancien jeu de données.
         * 
         * @param {tools.Library.Stats.Matrice} matrice - La matrice déjà construite
         * @returns {this} Pour permettre le chaînage
         */
        this.loadMatrice = function(matrice) {
            if (!(matrice instanceof tools.Library.Stats.Matrice)) {
                throw new Error("❌ loadMatrice() attend une instance de tools.Library.Stats.Matrice.");
            }

            var lignes = matrice.getLignes();
            if (!lignes || lignes.length === 0) {
                throw new Error("❌ La matrice fournie est vide (aucune ligne).");
            }

            this._matrice = matrice;

            // Toute matrice nouvellement chargée invalide l'entraînement précédent
            this._model = null;
            this._analyser = null;
            this._targetCol = null;
            this._featureCols = null;
            this._problemType = null;
            this._detectionResult = null;
            this._results = null;
            this._isTrained = false;
            this._isAnalyzed = false;
            this._suggestedValues = {};

            console.log("✅ Matrice chargée : " + lignes.length + " lignes, " + matrice.getColonnes().length + " colonnes");
            return this;
        };

        /**
         * Charge les données depuis un tableau d'objets
         * 
         * @param {Array} data - Tableau d'objets (ex: [{id:1, nom:"Jean", age:25}, ...])
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * predictor.loadData([
         *     { idEnseignant: 1234, regime: "Francophone", tauxReussite: 85 },
         *     { idEnseignant: 5678, regime: "Anglophone", tauxReussite: 45 }
         * ]);
         */
        this.loadData = function(data) {
            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error("❌ Les données doivent être un tableau non vide.");
            }

            this._data = data;
            var matrice = new tools.Library.Stats.Matrice();

            // Récupérer toutes les colonnes du premier élément
            var colonnes = Object.keys(data[0]);

            // Remplir la matrice
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var rowId = row.id || row.ID || i.toString();

                for (var j = 0; j < colonnes.length; j++) {
                    var col = colonnes[j];
                    var val = row[col];
                    if (val !== null && val !== undefined) {
                        // Normaliser les chaînes (regime → majuscules)
                        var valNorm = (typeof val === 'string') ? val.toUpperCase() : val;
                        matrice.setElement(valNorm, col, rowId);
                    }
                }
            }

            console.log("✅ Données chargées : " + data.length + " lignes, " + colonnes.length + " colonnes");

            // La construction de la matrice terminée, on délègue le reste
            // (validation + reset d'état) à loadMatrice()
            return this.loadMatrice(matrice);
        };

        /**
         * Définit les colonnes à exclure automatiquement des facteurs
         * Par défaut : "id", "ID", "idEnseignant", "idClasse", "idDiscipline"
         * 
         * @param {Array} colNames - Liste des noms de colonnes à exclure
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * predictor.excludeColumns(["id", "idEnseignant"]);
         */
        this.excludeColumns = function(colNames) {
            if (colNames && Array.isArray(colNames)) {
                this._excludeCols = colNames;
                console.log("🚫 Colonnes exclues : " + colNames.join(", "));
            }
            return this;
        };

        /**
         * Définit la colonne à prédire
         * 
         * @param {string} colName - Nom de la colonne cible
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * predictor.setTarget("tauxReussite");
         */
        this.setTarget = function(colName) {
            if (!this._matrice) {
                throw new Error("❌ Chargez d'abord les données avec loadData()");
            }

            if (!this._matrice.colIndexExist(colName)) {
                var colonnes = this._matrice.getColonnes().join(", ");
                throw new Error("❌ La colonne '" + colName + "' n'existe pas. Colonnes disponibles : " + colonnes);
            }

            this._targetCol = colName;
            console.log("🎯 Colonne cible : " + colName);
            return this;
        };

        /**
         * Définit les colonnes à utiliser comme facteurs (optionnel)
         * Si non défini, toutes les colonnes sauf la cible et les exclues sont utilisées
         * 
         * @param {Array} colNames - Liste des noms de colonnes
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * predictor.setFeatures(["tauxPresence", "moyenneClasse", "nbreEleves"]);
         */
        this.setFeatures = function(colNames) {
            if (!this._matrice) {
                throw new Error("❌ Chargez d'abord les données avec loadData()");
            }

            for (var i = 0; i < colNames.length; i++) {
                if (!this._matrice.colIndexExist(colNames[i])) {
                    var colonnes = this._matrice.getColonnes().join(", ");
                    throw new Error("❌ La colonne '" + colNames[i] + "' n'existe pas. Colonnes disponibles : " + colonnes);
                }
            }

            this._featureCols = colNames;
            console.log("📋 Facteurs sélectionnés : " + colNames.join(", "));
            return this;
        };

        /**
         * Analyse les données et entraîne le modèle automatiquement
         * 
         * @param {Object} options - Options avancées (optionnel)
         * @param {number} options.nTrees - Nombre d'arbres (défaut: 20)
         * @param {number} options.maxDepth - Profondeur max (défaut: 8)
         * @param {number} options.kFold - Nombre de plis pour validation (défaut: 5)
         * @param {boolean} options.showImportance - Afficher l'importance des features (défaut: true)
         * @returns {Object} Les résultats de l'analyse
         * 
         * @example
         * var rapport = predictor.analyze();
         * console.log(rapport.resume);
         */
        this.analyze = function(options) {
            if (!this._matrice) {
                throw new Error("❌ Chargez d'abord les données avec loadData()");
            }

            if (!this._targetCol) {
                throw new Error("❌ Définissez la colonne cible avec setTarget()");
            }

            options = options || {};
            var nTrees = options.nTrees || 20;
            var maxDepth = options.maxDepth || 8;
            var kFold = options.kFold || 5;
            var showImportance = (options.showImportance !== undefined) ? options.showImportance : true;

            console.log("🔍 Analyse en cours...");

            // ============================================================
            // 1. Détection automatique du type de problème (AMÉLIORÉE)
            // ============================================================
            
            var detectionResult = this._detectProblemType();
            this._detectionResult = detectionResult;
            
            // Si c'est un identifiant, on force la régression pour éviter une erreur
            if (this._detectionResult === 'identifiant') {
                this._problemType = 'régression';
                console.warn("⚠️ La colonne cible ressemble à un identifiant.");
                console.warn("💡 Prédire un ID est généralement peu pertinent.");
                console.warn("💡 Choisissez plutôt une colonne comme 'reussite' ou 'tauxReussite'.");
            } else {
                this._problemType = detectionResult;
            }
            
            var isClassifier = (this._problemType === 'classification');
            console.log("📊 Type détecté : " + this._problemType);

            // ============================================================
            // 2. Détermination des colonnes caractéristiques
            // ============================================================
            
            var allCols = this._matrice.getColonnes();
            if (!this._featureCols) {
                // Exclure la cible et les colonnes ID
                this._featureCols = allCols.filter(function(col) {
                    // Ne pas inclure la colonne cible
                    if (col === this._targetCol) return false;
                    // Ne pas inclure les colonnes à exclure
                    if (this._excludeCols.indexOf(col) !== -1) return false;
                    return true;
                }.bind(this));
                console.log("📋 Facteurs automatiques (excluant IDs) : " + this._featureCols.join(", "));
            }

            // Vérifier qu'il y a au moins une colonne caractéristique
            if (this._featureCols.length === 0) {
                console.warn("⚠️ Aucune colonne caractéristique trouvée. Utilisation de toutes les colonnes sauf la cible.");
                this._featureCols = allCols.filter(function(col) {
                    return col !== this._targetCol;
                }.bind(this));
            }

            // ============================================================
            // 3. Création et configuration du modèle
            // ============================================================
            
            if (isClassifier) {
                this._model = new tools.Library.RandomForestClassifier();
            } else {
                this._model = new tools.Library.RandomForestRegressor();
            }

            this._model.configure({
                nTrees: nTrees,
                maxDepth: maxDepth,
                featureCols: this._featureCols,
                targetCol: this._targetCol,
                minSamplesLeaf: 2
            });

            // ============================================================
            // 4. Création de l'analyseur et entraînement
            // ============================================================
            
            this._analyser = new tools.Library.ObjectAnalyser(this._matrice, this._model);
            this._matrice.setAnalyser(this._analyser);
            this._matrice.trainModel();
            this._isTrained = true;

            console.log("✅ Modèle entraîné avec succès !");

            // ============================================================
            // 5. Validation croisée (si assez de données)
            // ============================================================
            
            var lignes = this._matrice.getLignes();
            var cvResults = null;
            
            if (lignes.length >= 20) {
                try {
                    console.log("📊 Validation croisée (" + kFold + " plis)...");
                    cvResults = this._matrice.crossValidate(kFold, this._targetCol, {
                        nTrees: nTrees,
                        maxDepth: maxDepth,
                        featureCols: this._featureCols
                    }, false);
                } catch (e) {
                    console.warn("⚠️ Validation croisée non disponible pour ces données");
                }
            }

            // ============================================================
            // 6. Importance des caractéristiques (RÉELLE !)
            // ============================================================
            
            var featureImportance = this._computeFeatureImportance();

            // ============================================================
            // 7. PHASE 2 : Calcul des valeurs suggérées pour les sliders
            // ============================================================
            this._computeSuggestedValues();

            // ============================================================
            // 8. Construction du rapport (PHASE 2 : SIMPLIFIÉ)
            // ============================================================
            
            var report = this._buildReportSimplified(cvResults, featureImportance);
            this._results = report;
            this._isAnalyzed = true;

            // Afficher le résumé simplifié
            console.log("📊 " + report.resumeCourt);

            return report;
        };

        /**
         * Fait une prédiction à partir d'un échantillon
         * 
         * @param {Object} sample - Objet contenant les valeurs des colonnes
         * @returns {Object} La prédiction avec les valeurs
         * 
         * @example
         * var resultat = predictor.predict({
         *     tauxPresence: 75,
         *     moyenneClasse: 12.5,
         *     nbreEleves: 35
         * });
         * // resultat = { reussite: "Succès", probabilite: 87 }
         */
        this.predict = function(sample) {
            if (!this._isTrained || !this._matrice) {
                throw new Error("❌ Entraînez d'abord le modèle avec analyze()");
            }

            var targetCol = this._targetCol;
            var allCols = this._matrice.getColonnes();
            
            // Identifier les colonnes manquantes
            var missingCols = [];
            for (var i = 0; i < allCols.length; i++) {
                var col = allCols[i];
                if (sample[col] === undefined || sample[col] === null) {
                    missingCols.push(col);
                }
            }
            
            // Faire la prédiction
            var resultat = this._matrice.predict(sample);
            
            // Identifier les colonnes non fiables (prédites mais pas la cible)
            var unreliableCols = missingCols.filter(function(col) {
                return col !== targetCol;
            });
            
            // Construire le message
            var message = "✅ Prédiction pour '" + targetCol + "' : " + resultat[targetCol];
            
            if (unreliableCols.length > 0) {
                message += "\n\n⚠️ ATTENTION : Le modèle est entraîné UNIQUEMENT pour prédire '" + targetCol + "'.";
                message += "\n💡 Les colonnes suivantes ont été prédites mais NE SONT PAS FIABLES :";
                message += "\n   🔴 " + unreliableCols.join(", ");
                message += "\n🔒 Utilisez uniquement '" + targetCol + "' comme résultat fiable.";
                
                console.warn("⚠️ Colonnes non fiables prédites : " + unreliableCols.join(", "));
                console.warn("💡 Utilisez uniquement '" + targetCol + "' comme résultat fiable.");
            } else {
                message += "\n✅ Toutes les colonnes fournies sont déjà complètes.";
            }
            
            // Ajouter les métadonnées au résultat
            resultat._message = message;
            resultat._reliableCols = [targetCol];
            resultat._unreliableCols = unreliableCols;
            resultat._targetCol = targetCol;
            resultat._isReliable = (unreliableCols.length === 0);
            
            // Ajouter une probabilité si c'est un classifieur
            if (this._problemType === "classification") {
                var proba = this._getPredictionProbability(sample, resultat[this._targetCol]);
                resultat._probabilite = proba;
                resultat._confiance = (proba * 100).toFixed(1) + "%";
            }

            return resultat;
        };

        /**
         * PHASE 3 : Fait une prédiction à partir de valeurs suggérées
         * Utilise les sliders pour générer le sample
         * 
         * @param {Object} sliderValues - Objet avec les valeurs des sliders
         * @returns {Object} La prédiction avec interprétation
         */
        this.predictWithSliders = function(sliderValues) {
            // Construire le sample à partir des valeurs des sliders
            var sample = {};
            var cols = this._matrice.getColonnes();
            var target = this._targetCol;

            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                if (col === target) continue;
                if (sliderValues[col] !== undefined) {
                    sample[col] = sliderValues[col];
                } else if (this._suggestedValues[col] !== undefined) {
                    sample[col] = this._suggestedValues[col].mean;
                }
            }

            return this.predict(sample);
        };

        /**
         * PHASE 3 : Retourne les valeurs suggérées pour les sliders
         * 
         * @returns {Object} Les valeurs suggérées (min, max, mean, step)
         */
        this.getSuggestedValues = function() {
            return this._suggestedValues;
        };

        /**
         * Retourne le rapport d'analyse
         * 
         * @returns {Object} Le rapport complet
         */
        this.getReport = function() {
            if (!this._isAnalyzed) {
                throw new Error("❌ Lancez d'abord analyze()");
            }
            return this._results;
        };

        /**
         * PHASE 2 : Retourne un résumé ultra-simple en français
         * 
         * @returns {string} Le résumé en 3 phrases
         */
        this.getSimpleSummary = function() {
            if (!this._isAnalyzed) {
                return "📊 Analyse non encore effectuée. Lancez analyze() d'abord.";
            }
            return this._results.resumeUltraSimple;
        };

        /**
         * Retourne l'importance des caractéristiques
         * 
         * @returns {Array|null} Tableau trié [{feature: nom, importance: score}, ...]
         */
        this.getFeatureImportance = function() {
            if (!this._isTrained || !this._model) {
                return null;
            }
            return this._model.getFeatureImportance();
        };

        /**
         * Exporte le modèle entraîné (pour réutilisation)
         * 
         * @returns {Object} Le modèle exporté
         */
        this.exportModel = function() {
            if (!this._isTrained) {
                throw new Error("❌ Entraînez d'abord le modèle avec analyze()");
            }
            return {
                type: this._problemType,
                targetCol: this._targetCol,
                featureCols: this._featureCols,
                nTrees: this._model.nTrees,
                maxDepth: this._model.maxDepth,
                isTrained: this._isTrained,
                featureImportance: this._model.getFeatureImportance()
            };
        };

        // ============================================================
        // MÉTHODES PRIVÉES
        // ============================================================

        /**
         * Détecte automatiquement le type de problème (CLASSIFICATION ou RÉGRESSION)
         * Utilise une combinaison de :
         *   - Type de données (string, number, boolean)
         *   - Nombre de valeurs uniques
         *   - Nom de la colonne (détection des IDs)
         * 
         * @private
         * @returns {string} 'classification', 'régression' ou 'identifiant'
         */
        this._detectProblemType = function() {
            var colName = this._targetCol;
            var values = this._matrice.getElementsColonne(colName);
            
            // 1. Vérifier si c'est un ID (basé sur le nom)
            var idPatterns = ["id", "ID", "Id", "code", "num", "numero", "matricule"];
            var isIdByName = false;
            for (var p = 0; p < idPatterns.length; p++) {
                if (colName.toLowerCase().indexOf(idPatterns[p]) !== -1) {
                    isIdByName = true;
                    break;
                }
            }
            
            // 2. Compter les valeurs uniques
            var uniqueValues = this._matrice.getColsValuesGroupForColName(colName);
            var nbUnique = uniqueValues ? uniqueValues.length : 0;
            
            // 3. Déterminer le type de données (première valeur non nulle)
            var firstValue = null;
            var dataType = 'unknown';
            for (var i = 0; i < values.length && i < 100; i++) {
                if (values[i] !== null && values[i] !== undefined) {
                    firstValue = values[i];
                    dataType = typeof firstValue;
                    break;
                }
            }
            
            // 4. Si c'est un ID par le nom ET qu'il a beaucoup de valeurs uniques
            if (isIdByName && nbUnique > 10) {
                console.warn("⚠️ La colonne '" + colName + "' ressemble à un identifiant (" + nbUnique + " valeurs uniques).");
                return 'identifiant';
            }
            
            // 5. Si le type est 'string' → classification (sauf si trop de valeurs)
            if (dataType === 'string') {
                if (nbUnique <= 20) {
                    return 'classification';
                } else {
                    console.warn("⚠️ La colonne '" + colName + "' a beaucoup de valeurs uniques (" + nbUnique + ").");
                    console.warn("💡 C'est peut-être un identifiant. Vérifiez vos données.");
                    return 'identifiant';
                }
            }
            
            // 6. Si le type est 'number' → régression ou classification selon nbUnique
            if (dataType === 'number') {
                if (nbUnique <= 5) {
                    return 'classification';
                } else {
                    return 'régression';
                }
            }
            
            // 7. Si le type est 'boolean' → classification
            if (dataType === 'boolean') {
                return 'classification';
            }
            
            // 8. Par défaut : basé sur le nombre de valeurs uniques (fallback)
            if (nbUnique <= 10) {
                return 'classification';
            } else {
                return 'régression';
            }
        };

        /**
         * PHASE 3 : Calcule les valeurs suggérées pour les sliders
         * @private
         */
        this._computeSuggestedValues = function() {
            var cols = this._matrice.getColonnes();
            var target = this._targetCol;
            var suggested = {};

            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                if (col === target) continue;

                var values = this._matrice.getElementsColonne(col);
                var numericValues = [];
                var isNumeric = false;

                for (var j = 0; j < values.length; j++) {
                    if (values[j] !== null && values[j] !== undefined) {
                        var num = parseFloat(values[j]);
                        if (!isNaN(num)) {
                            numericValues.push(num);
                            isNumeric = true;
                        }
                    }
                }

                if (isNumeric && numericValues.length > 0) {
                    numericValues.sort(function(a, b) { return a - b; });
                    var sum = 0;
                    for (var k = 0; k < numericValues.length; k++) {
                        sum += numericValues[k];
                    }
                    var mean = sum / numericValues.length;
                    var min = numericValues[0];
                    var max = numericValues[numericValues.length - 1];
                    var step = (max - min) / 20;

                    suggested[col] = {
                        min: Math.floor(min * 10) / 10,
                        max: Math.ceil(max * 10) / 10,
                        mean: Math.round(mean * 10) / 10,
                        step: Math.max(0.1, Math.round(step * 10) / 10),
                        isNumeric: true
                    };
                } else {
                    // Colonne catégorielle : valeurs uniques
                    var uniqueVals = this._matrice.getColsValuesGroupForColName(col);
                    suggested[col] = {
                        values: uniqueVals || [],
                        isNumeric: false
                    };
                }
            }

            this._suggestedValues = suggested;
        };

        /**
         * Calcule l'importance des caractéristiques (RÉELLE - basée sur le RandomForest)
         * @private
         */
        this._computeFeatureImportance = function() {
            if (this._model && this._model.isTrained) {
                var importance = this._model.getFeatureImportance();
                if (importance && importance.length > 0) {
                    console.log("📊 Importance réelle calculée (basée sur la réduction d'impureté)");
                    return importance;
                }
            }

            console.warn("⚠️ Utilisation de la méthode simplifiée pour l'importance (fallback)");
            return this._computeFallbackImportance();
        };

        /**
         * Méthode de fallback pour l'importance (basée sur la variance)
         * @private
         */
        this._computeFallbackImportance = function() {
            var importance = {};
            var featureCols = this._featureCols || [];

            for (var i = 0; i < featureCols.length; i++) {
                var col = featureCols[i];
                var values = this._matrice.getElementsColonne(col);
                
                var sum = 0;
                var count = 0;
                for (var j = 0; j < values.length; j++) {
                    var val = parseFloat(values[j]);
                    if (!isNaN(val)) {
                        sum += val;
                        count++;
                    }
                }
                
                if (count > 0) {
                    var mean = sum / count;
                    var variance = 0;
                    for (var k = 0; k < values.length; k++) {
                        var v = parseFloat(values[k]);
                        if (!isNaN(v)) {
                            variance += Math.pow(v - mean, 2);
                        }
                    }
                    variance = variance / count;
                    importance[col] = variance;
                } else {
                    var uniqueVals = this._matrice.getColsValuesGroupForColName(col);
                    importance[col] = (uniqueVals || []).length || 0;
                }
            }

            var maxVal = 0;
            for (var key in importance) {
                if (importance[key] > maxVal) maxVal = importance[key];
            }
            if (maxVal > 0) {
                for (var key in importance) {
                    importance[key] = importance[key] / maxVal;
                }
            }

            var sorted = [];
            for (var key in importance) {
                sorted.push({ feature: key, importance: importance[key] });
            }
            sorted.sort(function(a, b) {
                return b.importance - a.importance;
            });

            return sorted;
        };

        /**
         * Calcule la probabilité d'une prédiction (pour classification)
         * @private
         */
        this._getPredictionProbability = function(sample, predictedClass) {
            var history = this._analyser ? this._analyser.getPredictionHistory() : [];
            
            if (history.length === 0) {
                return 0.7;
            }

            var count = 0;
            for (var i = 0; i < history.length; i++) {
                var h = history[i];
                if (h.output && h.output[this._targetCol] === predictedClass) {
                    count++;
                }
            }

            return Math.min(0.95, Math.max(0.5, count / history.length));
        };

        /**
         * PHASE 2 : Construit le rapport SIMPLIFIÉ
         * @private
         */
        this._buildReportSimplified = function(cvResults, featureImportance) {
            var lignes = this._matrice.getLignes().length;
            var cols = this._matrice.getColonnes().length;

            // ============================================================
            // 1. RÉSUMÉ ULTRA-SIMPLE (3 phrases pour le décideur)
            // ============================================================
            
            var perfText = "";
            var perfEmoji = "";
            var recommendations = [];

            if (cvResults) {
                if (this._problemType === "classification") {
                    var acc = cvResults.moyenne.accuracy;
                    var std = cvResults.ecartType.accuracy || 0;
                    
                    if (acc >= 0.9) {
                        perfText = "VOTRE MODÈLE EST EXCELLENT";
                        perfEmoji = "🏆";
                    } else if (acc >= 0.8) {
                        perfText = "VOTRE MODÈLE EST BON";
                        perfEmoji = "✅";
                    } else if (acc >= 0.7) {
                        perfText = "VOTRE MODÈLE EST CORRECT";
                        perfEmoji = "👍";
                    } else if (acc >= 0.6) {
                        perfText = "VOTRE MODÈLE PEUT ÊTRE AMÉLIORÉ";
                        perfEmoji = "⚠️";
                    } else {
                        perfText = "VOTRE MODÈLE EST FAIBLE";
                        perfEmoji = "❌";
                    }
                    
                    if (std < 0.05) {
                        perfText += " (très stable)";
                    }
                } else {
                    var r2 = cvResults.moyenne.r2;
                    var std = cvResults.ecartType.r2 || 0;
                    
                    if (r2 >= 0.7) {
                        perfText = "VOTRE MODÈLE EST EXCELLENT";
                        perfEmoji = "🏆";
                    } else if (r2 >= 0.5) {
                        perfText = "VOTRE MODÈLE EST BON";
                        perfEmoji = "✅";
                    } else if (r2 >= 0.3) {
                        perfText = "VOTRE MODÈLE EST CORRECT";
                        perfEmoji = "👍";
                    } else if (r2 >= 0.1) {
                        perfText = "VOTRE MODÈLE PEUT ÊTRE AMÉLIORÉ";
                        perfEmoji = "⚠️";
                    } else {
                        perfText = "VOTRE MODÈLE EST FAIBLE";
                        perfEmoji = "❌";
                    }
                    
                    if (std < 0.05) {
                        perfText += " (très stable)";
                    }
                }
            } else {
                perfText = "MODÈLE ENTRAÎNÉ";
                perfEmoji = "📊";
            }

            // Résumé ultra-simple (3 phrases)
            var resumeUltraSimple = perfEmoji + " " + perfText + "\n";
            
            if (cvResults) {
                if (this._problemType === "classification") {
                    resumeUltraSimple += "📊 Fiabilité : " + (cvResults.moyenne.accuracy * 100).toFixed(1) + "%\n";
                } else {
                    resumeUltraSimple += "📊 Précision (R²) : " + (cvResults.moyenne.r2 * 100).toFixed(1) + "%\n";
                }
            }
            
            resumeUltraSimple += "📊 " + lignes + " enregistrements analysés sur " + cols + " colonnes";

            // ============================================================
            // 2. RECOMMANDATIONS CLASSÉES
            // ============================================================
            
            if (featureImportance && featureImportance.length > 0) {
                var filtered = featureImportance.filter(function(fi) {
                    return fi.importance > 0.05 && fi.feature.toLowerCase().indexOf("id") === -1;
                });
                
                if (filtered.length > 0) {
                    var top = filtered[0];
                    var importancePct = (top.importance * 100).toFixed(0);
                    
                    if (this._problemType === "classification") {
                        if (top.feature === "regime" || top.feature === "REGIME") {
                            recommendations.push("🔴 Agir sur le régime linguistique (" + importancePct + "% d'influence)");
                        } else {
                            recommendations.push("🔴 Surveiller le facteur '" + top.feature + "' (" + importancePct + "% d'influence)");
                        }
                    } else {
                        if (top.feature === "tauxPresence") {
                            recommendations.push("🔴 Améliorer le taux de présence (" + importancePct + "% d'influence)");
                        } else if (top.feature === "moyenneClasse") {
                            recommendations.push("🔴 Augmenter la moyenne générale (" + importancePct + "% d'influence)");
                        } else {
                            recommendations.push("🔴 Agir sur '" + top.feature + "' (" + importancePct + "% d'influence)");
                        }
                    }
                    
                    if (filtered.length > 1) {
                        var second = filtered[1];
                        var secondPct = (second.importance * 100).toFixed(0);
                        recommendations.push("🟠 Puis sur '" + second.feature + "' (" + secondPct + "% d'influence)");
                    }
                    
                    if (filtered.length > 2) {
                        var third = filtered[2];
                        var thirdPct = (third.importance * 100).toFixed(0);
                        recommendations.push("🟢 Enfin sur '" + third.feature + "' (" + thirdPct + "% d'influence)");
                    }
                }
            }

            // ============================================================
            // 3. RAPPORT COMPLET SIMPLIFIÉ
            // ============================================================
            
            var lines = [];
            lines.push("╔═══════════════════════════════════════════════════════════════╗");
            lines.push("║              📊 RAPPORT D'ANALYSE SIMPLIFIÉ                  ║");
            lines.push("╠═══════════════════════════════════════════════════════════════╣");
            lines.push("║                                                               ║");
            lines.push("║  " + resumeUltraSimple);
            lines.push("║                                                               ║");
            
            // Recommandations
            if (recommendations.length > 0) {
                lines.push("║  💡 RECOMMANDATIONS                                             ║");
                for (var r = 0; r < recommendations.length; r++) {
                    lines.push("║     " + recommendations[r]);
                }
                lines.push("║                                                               ║");
            }
            
            // Facteurs influents (simplifiés)
            if (featureImportance && featureImportance.length > 0) {
                var filtered2 = featureImportance.filter(function(fi) {
                    return fi.importance > 0.01;
                });
                
                if (filtered2.length > 0) {
                    lines.push("║  🔑 FACTEURS INFLUENTS                                         ║");
                    var emojis = ["🔴", "🟠", "🟡", "🟢", "🔵"];
                    var maxShow = Math.min(5, filtered2.length);
                    for (var i = 0; i < maxShow; i++) {
                        var fi = filtered2[i];
                        var pct = (fi.importance * 100).toFixed(0);
                        var emoji = emojis[i] || "▪️";
                        var label = fi.feature;
                        if (label.length > 20) label = label.substring(0, 18) + "...";
                        lines.push("║     " + emoji + " " + label + " → " + pct + "%");
                    }
                    lines.push("║                                                               ║");
                }
            }
            
            // Alerte ID
            if (this._detectionResult === 'identifiant') {
                lines.push("║  ⚠️ ATTENTION : Colonne ressemblant à un identifiant            ║");
                lines.push("║     Choisissez une colonne comme 'reussite' ou 'tauxReussite'.   ║");
                lines.push("║                                                               ║");
            }
            
            lines.push("╚═══════════════════════════════════════════════════════════════╝");

            // ============================================================
            // 4. MÉTRIQUES TECHNIQUES (en option, en bas)
            // ============================================================
            
            var technicalDetails = "";
            if (cvResults) {
                technicalDetails = "\n📊 Détails techniques :\n";
                if (this._problemType === "classification") {
                    technicalDetails += "   Accuracy : " + (cvResults.moyenne.accuracy * 100).toFixed(1) + "%\n";
                    technicalDetails += "   Écart-type : ±" + (cvResults.ecartType.accuracy * 100).toFixed(1) + "%\n";
                    if (cvResults.moyenne.f1 !== undefined) {
                        technicalDetails += "   F1-Score : " + cvResults.moyenne.f1.toFixed(3) + "\n";
                    }
                } else {
                    technicalDetails += "   R² : " + (cvResults.moyenne.r2 * 100).toFixed(1) + "%\n";
                    technicalDetails += "   Écart-type : ±" + (cvResults.ecartType.r2 * 100).toFixed(1) + "%\n";
                    if (cvResults.moyenne.rmse !== undefined) {
                        technicalDetails += "   RMSE : " + cvResults.moyenne.rmse.toFixed(2) + "\n";
                    }
                }
                technicalDetails += "   " + lignes + " enregistrements, " + cols + " colonnes";
            }

            var report = {
                type: this._problemType,
                targetCol: this._targetCol,
                featureCols: this._featureCols,
                totalLignes: lignes,
                totalColonnes: cols,
                isTrained: this._isTrained,
                cvResults: cvResults,
                featureImportance: featureImportance,
                detectionResult: this._detectionResult,
                resume: lines.join("\n") + technicalDetails,
                resumeUltraSimple: resumeUltraSimple,
                resumeCourt: perfEmoji + " " + perfText,
                recommendations: recommendations,
                technicalDetails: technicalDetails
            };

            return report;
        };

        /**
         * NOUVEAU : Méthode de fallback pour le rapport (si besoin)
         * @private
         */
        this._buildReport = function(cvResults, featureImportance) {
            return this._buildReportSimplified(cvResults, featureImportance);
        };

        // ============================================================
        // NOUVEAU : SÉRIALISATION POUR PERSISTANCE (IndexedDB)
        // ============================================================

        /**
         * Convertit ce Predictor entraîné en un objet JavaScript "brut"
         * prêt pour JSON.stringify() puis pour être restauré via
         * tools.Library.Predictor.fromJSON(data, matrice).
         * 
         * Ne sérialise PAS la matrice (elle est toujours rechargée depuis
         * la source de données au moment de la restauration, via
         * loadMatrice()) : seuls la cible, les facteurs choisis et le
         * modèle entraîné (forêt + arbres) sont sauvegardés.
         * 
         * @returns {Object} Représentation sérialisable du Predictor entraîné
         */
        this.toJSON = function() {
            if (!this._isTrained || !this._model) {
                throw new Error("❌ Impossible de sérialiser : entraînez d'abord le modèle avec analyze().");
            }

            return {
                targetCol: this._targetCol,
                featureCols: this._featureCols,
                nTrees: this._model.nTrees,
                maxDepth: this._model.maxDepth,
                isTrained: this._isTrained,
                model: this._model.toJSON()
            };
        };
    };

    // ============================================================
    // NOUVEAU : RECONSTRUCTION DEPUIS toJSON()
    // ============================================================

    /**
     * Reconstruit un Predictor entraîné à partir d'un objet produit par
     * predictor.toJSON() et d'une Matrice déjà rechargée (via
     * MlDataSource, ou tout autre moyen).
     * 
     * IMPORTANT : la matrice fournie ici DOIT contenir les mêmes colonnes
     * (targetCol + featureCols) que celles utilisées lors de
     * l'entraînement original, sinon les prédictions n'auront pas de sens.
     * 
     * @param {Object} data - Objet produit par predictor.toJSON()
     * @param {tools.Library.Stats.Matrice} matrice - La matrice rechargée
     * @returns {tools.Library.Predictor} Le Predictor reconstruit, prêt à prédire
     */
    tools.Library.Predictor.fromJSON = function(data, matrice) {
        var predictor = new tools.Library.Predictor();

        // loadMatrice() réinitialise _model/_targetCol/_featureCols/etc.
        // On les restaure juste après, à partir de data.
        predictor.loadMatrice(matrice);

        predictor._targetCol = data.targetCol;
        predictor._featureCols = data.featureCols;
        predictor._problemType = (data.model.modelType === "RandomForestRegressor")
            ? "régression"
            : "classification";

        // Reconstruction du modèle entraîné (forêt + arbres)
        predictor._model = tools.Library.RandomForest.fromJSON(data.model);

        // IMPORTANT (voir tools-3.5.library.RandomForest.js) : fromJSON() ne
        // restaure jamais trainingMatrix (la matrice complète n'est pas
        // sérialisée). RandomForest.predict() en a pourtant besoin pour
        // savoir quelles colonnes sont "manquantes" dans un sample. On la
        // réassigne donc manuellement ici, avec la matrice rechargée.
        predictor._model.trainingMatrix = matrice;

        // Reconstruction de l'ObjectAnalyser (le décorateur reliant
        // matrice et modèle) et branchement sur la matrice.
        predictor._analyser = new tools.Library.ObjectAnalyser(matrice, predictor._model);
        matrice.setAnalyser(predictor._analyser);

        // IMPORTANT : sans cette ligne, le premier appel à predict()
        // verrait l'ObjectAnalyser se croire "non entraîné" et
        // relancerait un entraînement complet (donc de nouveaux arbres
        // aléatoires), écrasant silencieusement le modèle restauré.
        predictor._analyser._isTrained = true;

        predictor._isTrained = true;
        predictor._isAnalyzed = false; // le rapport d'analyse (cvResults, etc.) n'est pas restauré

        console.log("✅ Predictor restauré depuis IndexedDB : cible='" + predictor._targetCol + "', " +
            predictor._model.trees.length + " arbres.");

        return predictor;
    };

    console.log("✅ tools.Library.Predictor chargé avec succès (v2.2 - Phase 2 + 3)");
    console.log("   Utilisation : new tools.Library.Predictor()");
    console.log("   🔑 Détection automatique améliorée (type + valeurs + IDs)");
    console.log("   📊 Rapport simplifié (3 phrases + recommandations classées)");
    console.log("   🎛️ Prédiction simplifiée (valeurs suggérées pour sliders)");

})();