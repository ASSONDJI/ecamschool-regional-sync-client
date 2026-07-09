/**
 * ============================================================
 * PREDICTION TAB CONTROLLER (v2 - multi-modèles)
 * ============================================================
 *
 * Rôle : gère l'onglet "Prédiction" avec gestion de plusieurs modèles.
 *
 * @author Groupe E-Camschool
 * @version 2.0
 * @since 2026-07-09
 * ============================================================
 */

(function () {
    'use strict';

    // ============================================================
    // ÉTAT DE L'ONGLET (privé)
    // ============================================================

    var _initialized = false;
    var _predictor = null;
    var _logEl = null;

    // Clé pour stocker le dernier nom de modèle utilisé (dans localStorage)
    var LAST_MODEL_KEY = 'ecamschool_last_model_name';

    // ============================================================
    // FONCTIONS DE LOG
    // ============================================================

    function log(message, type) {
        type = type || 'info';
        if (!_logEl) {
            _logEl = document.getElementById('pred-logArea');
        }
        if (!_logEl) {
            console.warn('⚠️ pred-logArea introuvable');
            return;
        }
        var timestamp = new Date().toLocaleTimeString();
        var prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        } [type] || '📌';
        var className = 'log-' + type;
        var entry = '[' + timestamp + '] ' + prefix + ' ' + message + '\n';
        var span = document.createElement('span');
        span.className = className;
        span.textContent = entry;
        _logEl.appendChild(span);
        _logEl.scrollTop = _logEl.scrollHeight;
    }

    // ============================================================
    // GESTION DU NOM DU MODÈLE
    // ============================================================

    function getModelName() {
        var input = document.getElementById('pred-model-name');
        if (!input) return 'modele_par_defaut';
        var name = input.value.trim();
        if (!name) {
            name = 'modele_' + new Date().toISOString().slice(0, 10);
            input.value = name;
        }
        return name;
    }

    function setModelName(name) {
        var input = document.getElementById('pred-model-name');
        if (input) input.value = name;
    }

    function getLastUsedModelName() {
        try {
            return localStorage.getItem(LAST_MODEL_KEY) || null;
        } catch (e) {
            return null;
        }
    }

    function setLastUsedModelName(name) {
        try {
            localStorage.setItem(LAST_MODEL_KEY, name);
        } catch (e) { /* silence */ }
    }

    // ============================================================
    // MISE À JOUR DES INTERFACES (UI)
    // ============================================================

    function updatePredictionInputs() {
        var container = document.getElementById('pred-predictionInputs');
        if (!container) return;

        if (!_predictor || !_predictor._matrice) {
            container.innerHTML = '<span style="color:#888;">(Chargez les données d\'abord)</span>';
            return;
        }

        var cols = _predictor._matrice.getColonnes();
        var target = _predictor._targetCol;
        var html = '';

        for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            if (col === target) continue;

            var values = _predictor._matrice.getElementsColonne(col);
            var uniqueValues = _predictor._matrice.getColsValuesGroupForColName(col);
            var isCategory = (uniqueValues && uniqueValues.length <= 10);

            if (isCategory) {
                html += '<div style="display:flex;flex-direction:column;gap:2px;">';
                html += '<label style="font-size:11px;font-weight:600;">' + col + '</label>';
                html += '<select class="pred-input" data-col="' + col + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;width:120px;">';
                for (var v = 0; v < uniqueValues.length; v++) {
                    html += '<option value="' + uniqueValues[v] + '">' + uniqueValues[v] + '</option>';
                }
                html += '</select>';
                html += '</div>';
            } else {
                var isNumeric = false;
                for (var j = 0; j < Math.min(10, values.length); j++) {
                    if (values[j] !== null && values[j] !== undefined) {
                        var val = String(values[j]).trim();
                        if (/^-?\d+(\.\d+)?$/.test(val)) {
                            isNumeric = true;
                            break;
                        }
                    }
                }
                if (isNumeric) {
                    html += '<div style="display:flex;flex-direction:column;gap:2px;">';
                    html += '<label style="font-size:11px;font-weight:600;">' + col + '</label>';
                    html += '<input type="number" class="pred-input" data-col="' + col + '" placeholder="Valeur numérique" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;width:120px;">';
                    html += '</div>';
                } else {
                    html += '<div style="display:flex;flex-direction:column;gap:2px;">';
                    html += '<label style="font-size:11px;font-weight:600;">' + col + '</label>';
                    html += '<input type="text" class="pred-input" data-col="' + col + '" placeholder="Texte" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;width:120px;">';
                    html += '</div>';
                }
            }
        }

        if (html === '') {
            html = '<span style="color:#888;">Aucune colonne disponible</span>';
        }
        container.innerHTML = html;
        updateSliders();
    }

    function updateSliders() {
        var container = document.getElementById('pred-sliderInputs');
        var placeholder = document.getElementById('pred-sliderPlaceholder');
        if (!container || !placeholder) return;

        if (!_predictor || !_predictor._isTrained) {
            container.parentElement.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }

        var suggested = _predictor.getSuggestedValues();
        if (!suggested || Object.keys(suggested).length === 0) {
            container.parentElement.style.display = 'none';
            placeholder.style.display = 'block';
            return;
        }

        container.parentElement.style.display = 'block';
        placeholder.style.display = 'none';

        var html = '';
        for (var col in suggested) {
            var info = suggested[col];
            if (info.isNumeric) {
                var mean = info.mean !== undefined ? info.mean : (info.min + info.max) / 2;
                html += '<div style="min-width:180px;flex:1;">';
                html += '<label style="font-size:11px;font-weight:600;display:block;">' + col + '</label>';
                html += '<div style="display:flex;align-items:center;gap:8px;">';
                html += '<span style="font-size:10px;color:#888;">' + info.min.toFixed(1) + '</span>';
                html += '<input type="range" class="slider-input" data-col="' + col + '" ';
                html += 'min="' + info.min + '" max="' + info.max + '" step="' + info.step + '" ';
                html += 'value="' + mean + '" style="flex:1;">';
                html += '<span style="font-size:10px;color:#888;">' + info.max.toFixed(1) + '</span>';
                html += '</div>';
                html += '<div style="text-align:center;font-size:12px;font-weight:600;" class="slider-value" id="slider-value-' + col + '">' + mean.toFixed(1) + '</div>';
                html += '</div>';
            } else {
                if (info.values && info.values.length > 0) {
                    html += '<div style="min-width:150px;flex:1;">';
                    html += '<label style="font-size:11px;font-weight:600;display:block;">' + col + '</label>';
                    html += '<select class="slider-input" data-col="' + col + '" style="width:100%;padding:5px;border:1px solid #ddd;border-radius:4px;">';
                    for (var v = 0; v < info.values.length; v++) {
                        html += '<option value="' + info.values[v] + '">' + info.values[v] + '</option>';
                    }
                    html += '</select>';
                    html += '</div>';
                }
            }
        }

        container.innerHTML = html;

        var sliders = container.querySelectorAll('.slider-input[type="range"]');
        for (var i = 0; i < sliders.length; i++) {
            (function (slider) {
                slider.addEventListener('input', function () {
                    var col = this.dataset.col;
                    var val = parseFloat(this.value);
                    if (!isNaN(val)) {
                        var display = document.getElementById('slider-value-' + col);
                        if (display) {
                            display.textContent = val.toFixed(1);
                        }
                    }
                });
            })(sliders[i]);
        }
    }

    function displayResult(resultat) {
        var container = document.getElementById('pred-predictionArea');
        if (!container) {
            console.error('❌ Élément #pred-predictionArea introuvable');
            return;
        }

        if (!resultat) {
            container.innerHTML = '<p>Aucune prédiction effectuée.</p>';
            return;
        }

        var targetCol = _predictor._targetCol;
        var valeurPredite = resultat[targetCol];
        var isClassifier = _predictor._problemType === 'classification';
        var isReliable = resultat._isReliable !== undefined ? resultat._isReliable : true;

        var html = '';

        if (isClassifier) {
            var classe = 'prediction-unknown';
            var label = 'Résultat : ' + valeurPredite;
            var confiance = resultat._confiance || 'N/A';

            if (valeurPredite === 'Succès' || valeurPredite === 'SUCCÈS') {
                classe = 'prediction-success';
                label = '✅ SUCCÈS';
            } else if (valeurPredite === 'Échec' || valeurPredite === 'ÉCHEC') {
                classe = 'prediction-failure';
                label = '❌ ÉCHEC';
            }

            html += '<div class="prediction-result ' + classe + '">';
            html += '<div style="font-size:32px;font-weight:bold;">' + label + '</div>';
            html += '<div style="font-size:16px;margin-top:10px;">Confiance : ' + confiance + '</div>';
            html += '</div>';
        } else {
            html += '<div style="font-size:24px;font-weight:bold;color:#2c3e50;">';
            html += '📊 ' + targetCol + ' = ' + valeurPredite;
            html += '</div>';
        }

        if (!isReliable) {
            html += '<div style="margin-top:10px;padding:15px;background:#fff3cd;border:2px solid #f39c12;border-radius:8px;color:#856404;">';
            html += '<strong>⚠️ ATTENTION :</strong><br>';
            html += 'Le modèle est entraîné UNIQUEMENT pour prédire <strong>' + targetCol + '</strong>.<br>';
            html += 'Les colonnes suivantes ont été prédites mais <strong>NE SONT PAS FIABLES</strong> :<br>';
            html += '<span style="color:#e74c3c;font-weight:bold;">' + (resultat._unreliableCols || []).join(', ') + '</span><br>';
            html += '<span style="font-size:12px;color:#666;">💡 Utilisez uniquement <strong>' + targetCol + '</strong> comme résultat fiable.</span>';
            html += '</div>';
        } else {
            html += '<div style="margin-top:10px;padding:10px;background:#d5f5e3;border-radius:8px;color:#1a7a42;">';
            html += '✅ Toutes les colonnes sont déjà complètes. Prédiction fiable.';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    // ============================================================
    // MISE À JOUR DES ÉTAPES
    // ============================================================

    function updateSteps() {
        var steps = {
            step1: _predictor && _predictor._matrice ? 'done' : 'active',
            step2: _predictor && _predictor._targetCol ? 'done' : 'active',
            step3: _predictor && _predictor._isAnalyzed ? 'done' : 'active',
            step4: _predictor && _predictor._isTrained ? 'done' : 'active'
        };

        for (var i = 1; i <= 4; i++) {
            var el = document.getElementById('pred-step' + i);
            if (el) {
                el.classList.remove('active', 'done');
                if (steps['step' + i] === 'active') el.classList.add('active');
                if (steps['step' + i] === 'done') el.classList.add('done');
            }
        }
    }

    // ============================================================
    // FONCTIONS PRINCIPALES
    // ============================================================

    /**
     * ÉTAPE 1 : Charger les données
     */
    function predStep1() {
        log('📂 Chargement des données...', 'info');

        var select = document.getElementById('pred-dataFile');
        var value = select ? select.value : '';

        var promise;
        if (value === '__server__') {
            log('📡 Interrogation du serveur...', 'info');
            promise = tools.Library.MlDataSource.loadFromServer()
                .then(function (result) {
                    return result.rows;
                });
        } else {
            log('📁 Chargement du fichier local : ' + value, 'info');
            promise = new Promise(function (resolve, reject) {
                $.getJSON(value, function (data) {
                    resolve(data);
                }).fail(function (jqXHR, textStatus) {
                    reject(new Error('Impossible de charger ' + value + ' : ' + textStatus));
                });
            });
        }

        promise.then(function (rows) {
            if (!rows || rows.length === 0) {
                throw new Error('Aucune donnée chargée.');
            }

            _predictor = new tools.Library.Predictor();
            _predictor.loadData(rows);

            var cols = _predictor._matrice.getColonnes();
            var targetSelect = document.getElementById('pred-targetCol');
            if (targetSelect) {
                targetSelect.innerHTML = '';
                for (var i = 0; i < cols.length; i++) {
                    var option = document.createElement('option');
                    option.value = cols[i];
                    option.text = cols[i];
                    targetSelect.appendChild(option);
                }
            }

            updatePredictionInputs();

            log('✅ Données chargées : ' + rows.length + ' lignes, ' + cols.length + ' colonnes', 'success');
            log('📋 Colonnes : ' + cols.join(', '), 'info');

            var resultsArea = document.getElementById('pred-resultsArea');
            if (resultsArea) {
                resultsArea.innerHTML = '<p>✅ Données chargées avec succès. Passez à l\'étape 2.</p>';
            }

            // Mettre à jour les étapes
            updateSteps();

            // Ne pas restaurer automatiquement : on laisse l'utilisateur choisir via le bouton "Charger"

        }).catch(function (err) {
            log('❌ Erreur : ' + err.message, 'error');
            if (err.message.indexOf('aucune donnée') !== -1) {
                log('💡 Le serveur a renvoyé un tableau vide. Vérifiez les données.', 'warning');
            }
        });
    }

    /**
     * ÉTAPE 2 : Choisir la colonne cible
     */
    function predStep2() {
        if (!_predictor) {
            log('❌ Chargez d\'abord les données (étape 1)', 'error');
            return;
        }

        var targetSelect = document.getElementById('pred-targetCol');
        if (!targetSelect) {
            log('❌ Élément targetCol introuvable', 'error');
            return;
        }
        var target = targetSelect.value;
        if (!target) {
            log('❌ Sélectionnez une colonne cible', 'error');
            return;
        }

        try {
            _predictor.setTarget(target);
            log('🎯 Colonne cible : ' + target, 'success');
            var resultsArea = document.getElementById('pred-resultsArea');
            if (resultsArea) {
                resultsArea.innerHTML = '<p>🎯 Cible choisie : <strong>' + target + '</strong>. Passez à l\'étape 3.</p>';
            }
            updateSteps();
        } catch (error) {
            log('❌ Erreur : ' + error.message, 'error');
        }
    }

    /**
     * ÉTAPE 3 : Analyser / Entraîner
     */
    function predStep3() {
        if (!_predictor) {
            log('❌ Chargez d\'abord les données (étape 1)', 'error');
            return;
        }
        if (!_predictor._targetCol) {
            log('❌ Choisissez d\'abord la colonne cible (étape 2)', 'error');
            return;
        }

        var nTrees = parseInt(document.getElementById('pred-nTrees').value) || 20;
        var maxDepth = parseInt(document.getElementById('pred-maxDepth').value) || 8;
        var kFold = parseInt(document.getElementById('pred-kFold').value) || 5;
        var modelName = getModelName();

        log('🔍 Analyse en cours... (' + nTrees + ' arbres, profondeur ' + maxDepth + ')', 'info');

        try {
            var report = _predictor.analyze({
                nTrees: nTrees,
                maxDepth: maxDepth,
                kFold: kFold
            });

            // Afficher le rapport
            var container = document.getElementById('pred-resultsArea');
            if (container) {
                var html = '<div class="result-card">' + report.resume + '</div>';
                html += '<div class="stats-grid">';
                if (report.type === 'classification') {
                    html += '<div class="stat-card success"><div class="stat-value">' + (report.cvResults ? (report.cvResults.moyenne.accuracy * 100).toFixed(1) + '%' : 'N/A') + '</div><div class="stat-label">Fiabilité</div></div>';
                } else {
                    html += '<div class="stat-card success"><div class="stat-value">' + (report.cvResults ? (report.cvResults.moyenne.r2 * 100).toFixed(1) + '%' : 'N/A') + '</div><div class="stat-label">R² (précision)</div></div>';
                }
                html += '<div class="stat-card info"><div class="stat-value">' + report.totalLignes + '</div><div class="stat-label">Enregistrements</div></div>';
                html += '<div class="stat-card info"><div class="stat-value">' + report.totalColonnes + '</div><div class="stat-label">Colonnes</div></div>';
                html += '</div>';

                if (report.featureImportance && report.featureImportance.length > 0) {
                    html += '<h4 style="margin:15px 0 8px;">🔑 Facteurs les plus influents</h4>';
                    var emojis = ['🔴', '🟠', '🟡', '🟢', '🔵'];
                    for (var i = 0; i < Math.min(5, report.featureImportance.length); i++) {
                        var fi = report.featureImportance[i];
                        var pct = (fi.importance * 100).toFixed(0);
                        var emoji = emojis[i] || '▪️';
                        html += '<div class="feature-bar">';
                        html += '<span class="label">' + emoji + ' ' + fi.feature + '</span>';
                        html += '<div class="bar" style="width:' + pct + '%;"></div>';
                        html += '<span class="value">' + pct + '%</span>';
                        html += '</div>';
                    }
                }

                container.innerHTML = html;
            }

            log(report.resumeCourt, 'success');
            log('💡 Utilisez l\'étape 4 pour faire des prédictions', 'info');

            // Sauvegarder le modèle dans IndexedDB
            try {
                var serialized = _predictor.toJSON();
                var metadata = {
                    trainedAt: Date.now(),
                    source: document.getElementById('pred-dataFile')?.value || 'unknown',
                    rowCount: _predictor._matrice.getLignes().length,
                    featureCols: _predictor._featureCols || [],
                    targetCol: _predictor._targetCol,
                    nTrees: nTrees,
                    maxDepth: maxDepth
                };
                tools.Library.MlModelIdbStore.saveModel(modelName, serialized, metadata)
                    .then(function () {
                        log('✅ Modèle "' + modelName + '" sauvegardé dans IndexedDB', 'success');
                        setLastUsedModelName(modelName);
                    })
                    .catch(function (err) {
                        log('⚠️ Sauvegarde IndexedDB échouée : ' + err.message, 'warning');
                    });
            } catch (err) {
                log('⚠️ Erreur lors de la sérialisation : ' + err.message, 'warning');
            }

            updatePredictionInputs();
            updateSteps();

        } catch (error) {
            log('❌ Erreur : ' + error.message, 'error');
        }
    }

    /**
     * ÉTAPE 4 : Prédire avec les champs de saisie
     */
    function predStep4() {
        if (!_predictor || !_predictor._isTrained) {
            log('❌ Analysez d\'abord les données (étape 3) ou chargez un modèle', 'error');
            return;
        }

        var sample = {};
        var inputs = document.querySelectorAll('.pred-input');
        var hasValues = false;

        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var colName = input.dataset.col;
            var val = input.value;

            if (val !== "") {
                hasValues = true;
                var numVal = parseFloat(val);
                sample[colName] = isNaN(numVal) ? val : numVal;
            }
        }

        if (!hasValues) {
            log('❌ Saisissez au moins une valeur à prédire', 'error');
            return;
        }

        try {
            var resultat = _predictor.predict(sample);
            displayResult(resultat);
            log('🔮 Prédiction effectuée', 'success');
        } catch (error) {
            log('❌ Erreur : ' + error.message, 'error');
        }
    }

    /**
     * Prédire avec les sliders
     */
    function predRunSliderPredict() {
        if (!_predictor || !_predictor._isTrained) {
            log('❌ Analysez d\'abord les données (étape 3) ou chargez un modèle', 'error');
            return;
        }

        var sliders = document.querySelectorAll('.slider-input');
        var sample = {};
        var hasValues = false;

        for (var i = 0; i < sliders.length; i++) {
            var slider = sliders[i];
            var col = slider.dataset.col;
            var val = slider.value;

            if (val !== "") {
                hasValues = true;
                var numVal = parseFloat(val);
                sample[col] = isNaN(numVal) ? val : numVal;
            }
        }

        if (!hasValues) {
            log('❌ Aucune valeur à prédire', 'error');
            return;
        }

        try {
            var resultat = _predictor.predict(sample);
            displayResult(resultat);
            log('🔮 Prédiction avec sliders effectuée', 'success');
        } catch (error) {
            log('❌ Erreur : ' + error.message, 'error');
        }
    }

    /**
     * Ré-entraîner : supprime le modèle en IndexedDB et recharge les données
     */
    function predReTrain() {
        var modelName = getModelName();
        if (!confirm('Voulez-vous vraiment supprimer le modèle "' + modelName + '" et ré-entraîner ?')) {
            return;
        }

        log('🔄 Ré-entraînement demandé pour "' + modelName + '"...', 'info');
        tools.Library.MlModelIdbStore.deleteModel(modelName)
            .then(function () {
                log('🗑️ Modèle "' + modelName + '" supprimé de IndexedDB', 'info');
                var resultsArea = document.getElementById('pred-resultsArea');
                if (resultsArea) resultsArea.innerHTML = '<p>Prêt pour un nouvel entraînement.</p>';
                var predictionArea = document.getElementById('pred-predictionArea');
                if (predictionArea) predictionArea.innerHTML = '<p>Aucune prédiction effectuée.</p>';
                // On recharge les données (étape 1) pour repartir de zéro
                predStep1();
            })
            .catch(function (err) {
                log('⚠️ Échec de la suppression : ' + err.message, 'warning');
                predStep1();
            });
    }

    /**
     * Charger un modèle sauvegardé
     */
    function predLoadSavedModel() {
        if (!_predictor || !_predictor._matrice) {
            log('❌ Chargez d\'abord les données (étape 1) avant de charger un modèle.', 'error');
            return;
        }

        var modelName = getModelName();
        if (!modelName) {
            log('❌ Veuillez saisir un nom de modèle.', 'error');
            return;
        }

        var currentCols = _predictor._matrice.getColonnes();

        tools.Library.MlModelIdbStore.loadModel(modelName)
            .then(function (result) {
                if (!result) {
                    log('ℹ️ Aucun modèle trouvé avec le nom "' + modelName + '".', 'info');
                    return;
                }

                var serialized = result.serializedPredictor;
                var metadata = result.metadata || {};

                var savedTarget = serialized.targetCol;
                var savedFeatures = serialized.featureCols || [];
                var allSavedCols = [savedTarget].concat(savedFeatures);

                var missingCols = allSavedCols.filter(function (col) {
                    return currentCols.indexOf(col) === -1;
                });

                if (missingCols.length > 0) {
                    log('❌ Le modèle "' + modelName + '" utilise des colonnes qui n\'existent pas dans les données actuelles : ' + missingCols.join(', '), 'error');
                    log('💡 Utilisez les mêmes données que lors de l\'entraînement.', 'warning');
                    return;
                }

                var restored = tools.Library.Predictor.fromJSON(serialized, _predictor._matrice);
                _predictor = restored;
                _predictor._isAnalyzed = true;

                updateSteps();
                updatePredictionInputs();

                log('✅ Modèle "' + modelName + '" restauré avec succès (cible: ' + _predictor._targetCol + ', ' + _predictor._model.trees.length + ' arbres)', 'success');
                log('📊 Utilisez l\'étape 4 pour faire des prédictions.', 'info');

                setLastUsedModelName(modelName);

                var resultsArea = document.getElementById('pred-resultsArea');
                if (resultsArea) {
                    resultsArea.innerHTML = '<p>✅ Modèle "' + modelName + '" restauré. Vous pouvez faire des prédictions (étape 4).</p>';
                }

            })
            .catch(function (err) {
                log('❌ Erreur lors du chargement du modèle : ' + err.message, 'error');
            });
    }

    /**
     * Supprimer un modèle sauvegardé
     */
    function predDeleteModel() {
        var modelName = getModelName();
        if (!modelName) {
            log('❌ Veuillez saisir un nom de modèle.', 'error');
            return;
        }

        if (!confirm('Voulez-vous vraiment supprimer le modèle "' + modelName + '" ? Cette action est irréversible.')) {
            return;
        }

        log('🗑️ Suppression du modèle "' + modelName + '"...', 'info');

        tools.Library.MlModelIdbStore.deleteModel(modelName)
            .then(function () {
                log('✅ Modèle "' + modelName + '" supprimé de IndexedDB.', 'success');

                if (_predictor) {
                    _predictor._isTrained = false;
                    _predictor._isAnalyzed = false;
                    _predictor._model = null;
                    _predictor._analyser = null;
                }

                updateSteps();

                var predictionArea = document.getElementById('pred-predictionArea');
                if (predictionArea) {
                    predictionArea.innerHTML = '<p>Modèle supprimé. Effectuez une nouvelle analyse (étape 3) ou chargez un autre modèle.</p>';
                }

                updateSliders();

                log('💡 Vous pouvez maintenant entraîner un nouveau modèle (étape 3) ou importer une autre sauvegarde.', 'info');
            })
            .catch(function (err) {
                log('❌ Erreur lors de la suppression : ' + err.message, 'error');
            });
    }

    /**
     * Lister les modèles sauvegardés
     */
    function predListModels() {
        log('📋 Recherche des modèles sauvegardés...', 'info');

        tools.Library.MlModelIdbStore.listModelNames()
            .then(function (names) {
                if (!names || names.length === 0) {
                    log('ℹ️ Aucun modèle sauvegardé trouvé.', 'info');
                    return;
                }

                log('📋 Modèles disponibles (' + names.length + '):', 'info');
                names.forEach(function (name) {
                    // On peut aussi récupérer les métadonnées pour les afficher
                    tools.Library.MlModelIdbStore.loadModel(name)
                        .then(function (result) {
                            if (result && result.metadata) {
                                var meta = result.metadata;
                                var info = '   - ' + name + ' (cible: ' + meta.targetCol + ', ' + (meta.nTrees || '?') + ' arbres, ' + (meta.rowCount || '?') + ' lignes)';
                                log(info, 'info');
                            } else {
                                log('   - ' + name, 'info');
                            }
                        })
                        .catch(function () {
                            log('   - ' + name, 'info');
                        });
                });

                // Un petit délai pour que les logs s'affichent proprement
                setTimeout(function () {
                    log('💡 Pour charger un modèle, saisissez son nom dans le champ et cliquez sur "Charger le modèle sauvegardé".', 'info');
                }, 200);
            })
            .catch(function (err) {
                log('❌ Erreur lors de la liste des modèles : ' + err.message, 'error');
            });
    }

    // ============================================================
    // VISUALISATION : GRAPHIQUES
    // ============================================================

    function predShowCharts() {
        if (!_predictor || !_predictor._matrice) {
            log('❌ Chargez et analysez les données d\'abord.', 'error');
            return;
        }

        var matrice = _predictor._matrice;
        var visualizer = new tools.Library.Visualizer(matrice);
        visualizer.setSize(500, 400);

        document.getElementById('pred-chartsSection').style.display = 'block';

        // 1. Camembert
        try {
            var pieCol = null;
            var availableCols = matrice.getColonnes();
            if (availableCols.indexOf('reussite') !== -1) {
                pieCol = 'reussite';
            } else if (availableCols.indexOf('tauxReussite') !== -1) {
                pieCol = 'tauxReussite';
            }
            if (pieCol) {
                if (pieCol === 'tauxReussite') {
                    var tempCol = '__temp_reussite';
                    var lignes = matrice.getLignes();
                    for (var i = 0; i < lignes.length; i++) {
                        var val = matrice.getElement('tauxReussite', lignes[i]);
                        var categorie = (parseFloat(val) >= 50) ? 'Succès' : 'Échec';
                        matrice.setElement(categorie, tempCol, lignes[i]);
                    }
                    visualizer.pieChart(tempCol, '#pred-pieChart', { title: 'Répartition Succès/Échec (seuil 50%)' });
                } else {
                    visualizer.pieChart('reussite', '#pred-pieChart', { title: 'Répartition Succès/Échec' });
                }
            } else {
                d3.select('#pred-pieChart').html('<p style="color:#888;">Aucune colonne de classification disponible</p>');
            }
        } catch (e) {
            d3.select('#pred-pieChart').html('<p style="color:#888;">Erreur : ' + e.message + '</p>');
        }

        // 2. Barres
        try {
            var regimeValues = matrice.getColsValuesGroupForColName('regime');
            if (regimeValues && regimeValues.length > 0) {
                var availableCols = matrice.getColonnes();
                var valueCol = null;
                var numericCols = ['moyenneClasse', 'tauxPresence', 'tauxReussite', 'nbreEleves', 'nbreHeures', 'nbreHeuresTP'];
                for (var c = 0; c < numericCols.length; c++) {
                    if (availableCols.indexOf(numericCols[c]) !== -1) {
                        var testValues = matrice.getElementsColonne(numericCols[c]);
                        var hasData = false;
                        for (var v = 0; v < Math.min(10, testValues.length); v++) {
                            if (testValues[v] !== null && testValues[v] !== undefined && testValues[v] !== '') {
                                hasData = true;
                                break;
                            }
                        }
                        if (hasData) {
                            valueCol = numericCols[c];
                            break;
                        }
                    }
                }
                if (valueCol) {
                    visualizer.barChart('regime', valueCol, '#pred-barChart', 'mean', {
                        title: 'Moyenne par régime (' + valueCol + ')'
                    });
                } else {
                    d3.select('#pred-barChart').html('<p style="color:#888;">Aucune colonne numérique disponible</p>');
                }
            } else {
                d3.select('#pred-barChart').html('<p style="color:#888;">Colonne "regime" vide</p>');
            }
        } catch (e) {
            d3.select('#pred-barChart').html('<p style="color:#888;">Erreur : ' + e.message + '</p>');
        }

        // 3. Histogramme
        try {
            var histCol = null;
            var availableCols = matrice.getColonnes();
            var numericCols = ['moyenneClasse', 'tauxPresence', 'tauxReussite', 'nbreEleves', 'nbreHeures'];
            for (var c = 0; c < numericCols.length; c++) {
                if (availableCols.indexOf(numericCols[c]) !== -1) {
                    var testValues = matrice.getElementsColonne(numericCols[c]);
                    var hasData = false;
                    for (var v = 0; v < Math.min(10, testValues.length); v++) {
                        if (testValues[v] !== null && testValues[v] !== undefined && testValues[v] !== '') {
                            hasData = true;
                            break;
                        }
                    }
                    if (hasData) {
                        histCol = numericCols[c];
                        break;
                    }
                }
            }
            if (histCol) {
                visualizer.histogram(histCol, '#pred-histogramChart', 10, {
                    title: 'Distribution de ' + histCol
                });
            } else {
                d3.select('#pred-histogramChart').html('<p style="color:#888;">Aucune colonne numérique disponible</p>');
            }
        } catch (e) {
            d3.select('#pred-histogramChart').html('<p style="color:#888;">Erreur : ' + e.message + '</p>');
        }

        // 4. Nuage de points
        try {
            var xCol = null,
                yCol = null;
            var availableCols = matrice.getColonnes();
            if (availableCols.indexOf('tauxPresence') !== -1) xCol = 'tauxPresence';
            else if (availableCols.indexOf('nbreHeures') !== -1) xCol = 'nbreHeures';
            if (availableCols.indexOf('tauxReussite') !== -1) yCol = 'tauxReussite';
            else if (availableCols.indexOf('moyenneClasse') !== -1) yCol = 'moyenneClasse';
            else if (availableCols.indexOf('nbreEleves') !== -1) yCol = 'nbreEleves';
            if (xCol && yCol) {
                visualizer.scatter(xCol, yCol, '#pred-scatterChart', {
                    title: 'Corrélation ' + xCol + ' / ' + yCol,
                    xLabel: xCol,
                    yLabel: yCol
                });
            } else {
                d3.select('#pred-scatterChart').html('<p style="color:#888;">Colonnes pour le nuage de points non trouvées</p>');
            }
        } catch (e) {
            d3.select('#pred-scatterChart').html('<p style="color:#888;">Erreur : ' + e.message + '</p>');
        }

        log('📊 Graphiques générés avec D3.js', 'success');
    }

    // ============================================================
    // VISUALISATION : ARBRES DE DÉCISION
    // ============================================================

    function predShowTree(index) {
        if (!_predictor || !_predictor._model || !_predictor._model.trees) {
            log('❌ Entraînez d\'abord le modèle.', 'error');
            return;
        }

        var trees = _predictor._model.trees;
        if (index >= trees.length) {
            log('❌ Arbre ' + (index + 1) + ' n\'existe pas. ' + trees.length + ' arbres disponibles.', 'warning');
            return;
        }

        document.getElementById('pred-treeSection').style.display = 'block';

        var visualizerTree = new tools.Library.Visualizer(_predictor._matrice);
        visualizerTree.setSize(800, 500);
        visualizerTree.tree(trees[index], '#pred-treeContainer', {
            title: '🌳 Arbre de décision ' + (index + 1) + '/' + trees.length,
            nodeColor: '#3498db',
            linkColor: '#999'
        });

        log('🌳 Arbre ' + (index + 1) + ' visualisé', 'success');
    }

    function predShowAllTrees() {
        if (!_predictor || !_predictor._model || !_predictor._model.trees) {
            log('❌ Entraînez d\'abord le modèle.', 'error');
            return;
        }

        var trees = _predictor._model.trees;
        document.getElementById('pred-treeSection').style.display = 'block';

        var visualizerTree = new tools.Library.Visualizer(_predictor._matrice);
        visualizerTree.setSize(800, 500);
        visualizerTree.forest(trees, '#pred-treeContainer', 5, { title: '🌲 Forêt d\'arbres de décision' });

        log('🌲 ' + trees.length + ' arbres visualisés', 'success');
    }

    // ============================================================
    // INITIALISATION DE L'ONGLET
    // ============================================================

    function initPredictionTab() {
        if (_initialized) {
            return;
        }
        _initialized = true;

        log('🚀 Initialisation de l\'onglet Prédiction...', 'info');

        _logEl = document.getElementById('pred-logArea');

        // Restaurer le dernier nom de modèle utilisé
        var lastModel = getLastUsedModelName();
        if (lastModel) {
            setModelName(lastModel);
            log('📛 Dernier modèle utilisé : "' + lastModel + '"', 'info');
        }

        // Écouteurs des boutons
        document.getElementById('pred-btn-step1')?.addEventListener('click', predStep1);
        document.getElementById('pred-btn-step2')?.addEventListener('click', predStep2);
        document.getElementById('pred-btn-step3')?.addEventListener('click', predStep3);
        document.getElementById('pred-btn-step4')?.addEventListener('click', predStep4);
        document.getElementById('pred-btn-retrain')?.addEventListener('click', predReTrain);
        document.getElementById('pred-btn-load-model')?.addEventListener('click', predLoadSavedModel);
        document.getElementById('pred-btn-delete-model')?.addEventListener('click', predDeleteModel);
        document.getElementById('pred-btn-list-models')?.addEventListener('click', predListModels);
        document.getElementById('pred-btn-charts')?.addEventListener('click', predShowCharts);
        document.getElementById('pred-btn-all-trees')?.addEventListener('click', predShowAllTrees);
        document.getElementById('pred-btn-slider-predict')?.addEventListener('click', predRunSliderPredict);

        // Boutons "Arbre 1/2/3"
        document.querySelectorAll('.pred-btn-tree').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var index = parseInt(this.dataset.tree, 10);
                predShowTree(index);
            });
        });

        updateSteps();

        log('✅ Onglet Prédiction prêt (multi-modèles).', 'success');
        log('📌 Suivez les étapes 1 à 4 dans l\'ordre.', 'info');
    }

    // ============================================================
    // EXPOSITION PUBLIQUE
    // ============================================================

    window.initPredictionTab = initPredictionTab;

    console.log('✅ prediction-tab-controller.js chargé avec succès (v2 - multi-modèles)');

})();