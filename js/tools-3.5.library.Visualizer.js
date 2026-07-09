/**
 * ============================================================
 * VISUALIZER - Visualisation des données avec D3.js
 * ============================================================
 * 
 * Cette classe permet de créer des visualisations interactives
 * pour les données de la matrice et les arbres de décision.
 * 
 * Utilisation :
 *   var visualizer = new tools.Library.Visualizer(matrice);
 *   visualizer.pieChart("reussite", "#chart1");
 *   visualizer.barChart("regime", "moyenneClasse", "#chart2");
 *   visualizer.tree(model.trees[0], "#treeContainer");
 * 
 * @author E-Camschool
 * @version 1.0
 * @since 2026-06-25
 * ============================================================
 */

(function () {
    'use strict';

    /**
     * Visualizer - Classe principale pour les visualisations
     * 
     * @param {tools.Library.Stats.Matrice} matrice - La matrice de données
     */
    tools.Library.Visualizer = function (matrice) {
        if (!matrice) {
            throw new Error("❌ Une matrice est requise pour le visualiseur.");
        }
        this._matrice = matrice;
        this._width = 800;
        this._height = 500;
        this._margin = { top: 40, right: 40, bottom: 60, left: 60 };
    };

    // ============================================================
    // CONFIGURATION
    // ============================================================

    /**
     * Définit les dimensions du graphique
     * 
     * @param {number} width - Largeur
     * @param {number} height - Hauteur
     * @returns {this}
     */
    tools.Library.Visualizer.prototype.setSize = function (width, height) {
        this._width = width;
        this._height = height;
        return this;
    };

    /**
     * Définit les marges du graphique
     * 
     * @param {Object} margin - { top, right, bottom, left }
     * @returns {this}
     */
    tools.Library.Visualizer.prototype.setMargin = function (margin) {
        this._margin = margin;
        return this;
    };

    // ============================================================
    // GRAPHIQUES STATISTIQUES
    // ============================================================

    /**
     * Crée un camembert (Pie Chart)
     * 
     * @param {string} colName - Nom de la colonne à visualiser
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.pieChart("reussite", "#chart1");
     */
    tools.Library.Visualizer.prototype.pieChart = function (colName, selector, options) {
        var self = this;
        options = options || {};

        // Récupérer les données
        var values = this._matrice.getElementsColonne(colName);
        var counts = {};
        for (var i = 0; i < values.length; i++) {
            var val = values[i];
            if (val !== null && val !== undefined) {
                counts[val] = (counts[val] || 0) + 1;
            }
        }

        var data = [];
        for (var key in counts) {
            data.push({ label: key, value: counts[key] });
        }

        // Couleurs
        var colors = options.colors || ['#27ae60', '#e74c3c', '#3498db', '#f39c12', '#8e44ad', '#1abc9c'];

        // Dimensions
        var width = this._width;
        var height = this._height;
        var radius = Math.min(width, height) / 2 - 40;

        // Nettoyer le conteneur
        d3.select(selector).html('');

        // Créer le SVG
        var svg = d3.select(selector)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

        // Gérer les couleurs
        var color = d3.scaleOrdinal()
            .domain(data.map(function (d) { return d.label; }))
            .range(colors);

        // Générer le camembert
        var pie = d3.pie()
            .value(function (d) { return d.value; })
            .sort(null);

        var arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        var arcHover = d3.arc()
            .innerRadius(0)
            .outerRadius(radius * 1.1);

        // Dessiner les parts
        var paths = svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d) { return color(d.data.label); })
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('d', arcHover);

                // Afficher l'info-bulle
                var tooltip = d3.select(selector).select('.tooltip');
                tooltip.style('opacity', 1)
                    .html('<strong>' + d.data.label + '</strong><br/>' + d.data.value + ' (' + (d.data.value / data.reduce(function (a, b) { return a + b.value; }, 0) * 100).toFixed(1) + '%)');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('d', arc);

                d3.select(selector).select('.tooltip').style('opacity', 0);
            });

        // Ajouter les labels
        var labelArc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.8);

        svg.selectAll('text')
            .data(pie(data))
            .enter()
            .append('text')
            .attr('transform', function (d) { return 'translate(' + labelArc.centroid(d) + ')'; })
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .text(function (d) {
                var pct = (d.data.value / data.reduce(function (a, b) { return a + b.value; }, 0) * 100);
                return pct > 10 ? pct.toFixed(0) + '%' : '';
            });

        // Ajouter le titre
        if (options.title) {
            d3.select(selector)
                .append('div')
                .style('text-align', 'center')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .style('margin-bottom', '10px')
                .text(options.title);
        }

        // Ajouter l'info-bulle
        d3.select(selector)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('transition', 'opacity 0.3s');

        // Légende
        var legend = svg.selectAll('.legend')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                var x = radius + 20;
                var y = -radius + i * 25 + 20;
                return 'translate(' + x + ',' + y + ')';
            });

        legend.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', function (d) { return color(d.label); })
            .attr('rx', 4);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 13)
            .attr('font-size', '12px')
            .style('fill', '#333')
            .text(function (d) { return d.label + ' (' + d.value + ')'; });

        return this;
    };

    /**
     * Crée un diagramme à barres (Bar Chart)
     * 
     * @param {string} groupCol - Colonne de regroupement
     * @param {string} valueCol - Colonne de valeur
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {string} aggType - 'mean', 'sum', 'count'
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.barChart("regime", "moyenneClasse", "#chart2", "mean");
     */
    tools.Library.Visualizer.prototype.barChart = function (groupCol, valueCol, selector, aggType, options) {
        var self = this;
        options = options || {};
        aggType = aggType || 'mean';

        // Récupérer les données différemment
        var lignes = this._matrice.getLignes();
        var groups = {};
        var values = {};

        for (var i = 0; i < lignes.length; i++) {
            var row = lignes[i];
            var groupVal = this._matrice.getElement(groupCol, row);
            var valueVal = this._matrice.getElement(valueCol, row);

            if (groupVal !== null && groupVal !== undefined && groupVal !== "" &&
                valueVal !== null && valueVal !== undefined && valueVal !== "") {

                var groupKey = String(groupVal).trim();
                var numVal = parseFloat(valueVal);

                if (!isNaN(numVal)) {
                    if (!groups[groupKey]) {
                        groups[groupKey] = [];
                    }
                    groups[groupKey].push(numVal);
                }
            }
        }

        // Calculer les agrégats
        var data = [];
        for (var key in groups) {
            var groupValues = groups[key];
            if (groupValues.length > 0) {
                var result = 0;
                if (aggType === 'mean') {
                    result = groupValues.reduce(function (a, b) { return a + b; }, 0) / groupValues.length;
                } else if (aggType === 'sum') {
                    result = groupValues.reduce(function (a, b) { return a + b; }, 0);
                } else if (aggType === 'count') {
                    result = groupValues.length;
                }
                data.push({ label: key, value: result, count: groupValues.length });
            }
        }

        if (data.length === 0) {
            d3.select(selector).html('<p style="color:#888;">Pas de données disponibles pour ce graphique.</p>');
            return this;
        }

        // Trier les données
        data.sort(function (a, b) { return b.value - a.value; });

        // Dimensions
        var margin = this._margin;
        var width = this._width - margin.left - margin.right;
        var height = this._height - margin.top - margin.bottom - 40; // Espace pour le titre

        // Nettoyer le conteneur
        d3.select(selector).html('');

        // Ajouter le titre
        if (options.title) {
            d3.select(selector)
                .append('div')
                .style('text-align', 'center')
                .style('font-weight', 'bold')
                .style('font-size', '14px')
                .style('margin-bottom', '5px')
                .style('color', '#2c3e50')
                .text(options.title);
        }

        // Créer le SVG
        var svg = d3.select(selector)
            .append('svg')
            .attr('width', this._width)
            .attr('height', this._height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Échelles
        var x = d3.scaleBand()
            .domain(data.map(function (d) { return d.label; }))
            .range([0, width])
            .padding(0.2);

        var maxValue = d3.max(data, function (d) { return d.value * 1.1; }) || 1;
        var y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([height, 0]);

        // Couleurs
        var colors = options.colors || ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#8e44ad', '#1abc9c', '#e67e22', '#9b59b6'];
        var color = d3.scaleOrdinal()
            .domain(data.map(function (d) { return d.label; }))
            .range(colors.slice(0, data.length));

        // Ajouter les barres
        svg.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', function (d) { return x(d.label); })
            .attr('y', function (d) { return y(d.value); })
            .attr('width', x.bandwidth())
            .attr('height', function (d) { return height - y(d.value); })
            .attr('fill', function (d) { return color(d.label); })
            .attr('rx', 4)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8);

                var tooltip = d3.select(selector).select('.tooltip');
                tooltip.style('opacity', 1)
                    .html('<strong>' + d.label + '</strong><br/>' + aggType + ': ' + d.value.toFixed(2) + '<br/>n: ' + d.count);
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1);

                d3.select(selector).select('.tooltip').style('opacity', 0);
            });

        // Ajouter les valeurs sur les barres
        svg.selectAll('.label')
            .data(data)
            .enter()
            .append('text')
            .attr('x', function (d) { return x(d.label) + x.bandwidth() / 2; })
            .attr('y', function (d) { return y(d.value) - 5; })
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .style('fill', '#333')
            .style('font-weight', 'bold')
            .text(function (d) { return d.value.toFixed(1); });

        // Ajouter l'axe X
        svg.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x))
            .style('font-size', '11px')
            .selectAll('text')
            .attr('transform', 'rotate(-15)')
            .style('text-anchor', 'end');

        // Ajouter l'axe Y
        svg.append('g')
            .call(d3.axisLeft(y))
            .style('font-size', '11px');

        // Ajouter l'info-bulle
        d3.select(selector)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('transition', 'opacity 0.3s');

        return this;
    };

    /**
     * Crée un histogramme (Histogram)
     * 
     * @param {string} colName - Colonne à analyser
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {number} bins - Nombre de bins
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.histogram("moyenneClasse", "#chart3", 10);
     */
    tools.Library.Visualizer.prototype.histogram = function (colName, selector, bins, options) {
        var self = this;
        options = options || {};
        bins = bins || 10;

        // Récupérer les données
        var values = this._matrice.getElementsColonne(colName);
        var numericValues = [];
        for (var i = 0; i < values.length; i++) {
            var val = parseFloat(values[i]);
            if (!isNaN(val)) {
                numericValues.push(val);
            }
        }

        if (numericValues.length === 0) {
            d3.select(selector).html('<p style="color:#888;">Pas de données numériques pour cette colonne.</p>');
            return this;
        }

        // Calculer les bins
        var min = d3.min(numericValues);
        var max = d3.max(numericValues);
        var binWidth = (max - min) / bins;

        var binsData = [];
        for (var i = 0; i < bins; i++) {
            var start = min + i * binWidth;
            var end = start + binWidth;
            var count = 0;
            for (var j = 0; j < numericValues.length; j++) {
                if (numericValues[j] >= start && numericValues[j] < end) {
                    count++;
                }
            }
            binsData.push({ start: start, end: end, count: count });
        }

        // Dimensions
        var margin = this._margin;
        var width = this._width - margin.left - margin.right;
        var height = this._height - margin.top - margin.bottom;

        // Nettoyer le conteneur
        d3.select(selector).html('');

        // Créer le SVG
        var svg = d3.select(selector)
            .append('svg')
            .attr('width', this._width)
            .attr('height', this._height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Échelles
        var x = d3.scaleLinear()
            .domain([min, max])
            .range([0, width]);

        var y = d3.scaleLinear()
            .domain([0, d3.max(binsData, function (d) { return d.count * 1.1; })])
            .range([height, 0]);

        // Ajouter les barres
        svg.selectAll('rect')
            .data(binsData)
            .enter()
            .append('rect')
            .attr('x', function (d) { return x(d.start); })
            .attr('y', function (d) { return y(d.count); })
            .attr('width', function (d) { return x(d.end) - x(d.start) - 1; })
            .attr('height', function (d) { return height - y(d.count); })
            .attr('fill', options.color || '#3498db')
            .attr('rx', 2)
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.8);

                var tooltip = d3.select(selector).select('.tooltip');
                tooltip.style('opacity', 1)
                    .html('<strong>' + d.start.toFixed(1) + ' - ' + d.end.toFixed(1) + '</strong><br/>' + d.count + ' enregistrements');
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('opacity', 1);

                d3.select(selector).select('.tooltip').style('opacity', 0);
            });

        // Ajouter l'axe X
        svg.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x))
            .style('font-size', '12px');

        // Ajouter l'axe Y
        svg.append('g')
            .call(d3.axisLeft(y))
            .style('font-size', '12px');

        // Ajouter le titre
        if (options.title) {
            d3.select(selector)
                .append('div')
                .style('text-align', 'center')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .style('margin-bottom', '10px')
                .text(options.title);
        }

        // Ajouter l'info-bulle
        d3.select(selector)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('transition', 'opacity 0.3s');

        return this;
    };

    /**
     * Crée un nuage de points (Scatter Plot)
     * 
     * @param {string} colX - Colonne X
     * @param {string} colY - Colonne Y
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.scatter("tauxPresence", "tauxReussite", "#chart4");
     */
    tools.Library.Visualizer.prototype.scatter = function (colX, colY, selector, options) {
        var self = this;
        options = options || {};

        // Récupérer les données
        var valuesX = this._matrice.getElementsColonne(colX);
        var valuesY = this._matrice.getElementsColonne(colY);

        var data = [];
        for (var i = 0; i < valuesX.length; i++) {
            var x = parseFloat(valuesX[i]);
            var y = parseFloat(valuesY[i]);
            if (!isNaN(x) && !isNaN(y) && valuesX[i] !== null && valuesY[i] !== null) {
                data.push({ x: x, y: y });
            }
        }

        if (data.length === 0) {
            d3.select(selector).html('<p style="color:#888;">Pas de données disponibles pour ce graphique.</p>');
            return this;
        }

        // Dimensions
        var margin = this._margin;
        var width = this._width - margin.left - margin.right;
        var height = this._height - margin.top - margin.bottom;

        // Nettoyer le conteneur
        d3.select(selector).html('');

        // Créer le SVG
        var svg = d3.select(selector)
            .append('svg')
            .attr('width', this._width)
            .attr('height', this._height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Échelles
        var x = d3.scaleLinear()
            .domain([d3.min(data, function (d) { return d.x; }) * 0.9, d3.max(data, function (d) { return d.x; }) * 1.1])
            .range([0, width]);

        var y = d3.scaleLinear()
            .domain([d3.min(data, function (d) { return d.y; }) * 0.9, d3.max(data, function (d) { return d.y; }) * 1.1])
            .range([height, 0]);

        // Ajouter les points
        svg.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', function (d) { return x(d.x); })
            .attr('cy', function (d) { return y(d.y); })
            .attr('r', 6)
            .attr('fill', options.color || '#3498db')
            .attr('opacity', 0.6)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 10)
                    .attr('opacity', 1);

                var tooltip = d3.select(selector).select('.tooltip');
                tooltip.style('opacity', 1)
                    .html('<strong>X:</strong> ' + d.x.toFixed(1) + '<br/><strong>Y:</strong> ' + d.y.toFixed(1));
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .attr('opacity', 0.6);

                d3.select(selector).select('.tooltip').style('opacity', 0);
            });

        // Ajouter l'axe X
        svg.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x))
            .style('font-size', '12px');

        // Ajouter l'axe Y
        svg.append('g')
            .call(d3.axisLeft(y))
            .style('font-size', '12px');

        // Ajouter le titre
        if (options.title) {
            d3.select(selector)
                .append('div')
                .style('text-align', 'center')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .style('margin-bottom', '10px')
                .text(options.title);
        }

        // Ajouter les labels des axes
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text(options.xLabel || colX);

        svg.append('text')
            .attr('x', -height / 2)
            .attr('y', -margin.left + 20)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text(options.yLabel || colY);

        // Ajouter l'info-bulle
        d3.select(selector)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('transition', 'opacity 0.3s');

        return this;
    };

    // ============================================================
    // VISUALISATION DES ARBRES DE DÉCISION
    // ============================================================

    /**
     * Visualise un arbre de décision (Tree)
     * 
     * @param {tools.Library.Tree} tree - L'arbre à visualiser
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.tree(model.trees[0], "#treeContainer");
     */
    tools.Library.Visualizer.prototype.tree = function (tree, selector, options) {
        var self = this;
        options = options || {};

        if (!tree) {
            d3.select(selector).html('<p style="color:#888;">Aucun arbre à visualiser.</p>');
            return this;
        }

        // Nettoyer le conteneur
        d3.select(selector).html('');

        // Dimensions
        var width = this._width;
        var height = this._height;
        var margin = this._margin;

        // Créer le SVG
        var svg = d3.select(selector)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Convertir l'arbre en structure pour D3
        var treeData = this._treeToD3(tree);

        // Créer le layout d'arbre
        var treeLayout = d3.tree()
            .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
            .separation(function (a, b) { return (a.parent === b.parent ? 1 : 2) / a.depth; });

        var root = d3.hierarchy(treeData);
        var treeLayoutData = treeLayout(root);

        // Dessiner les liens (branches)
        svg.selectAll('.link')
            .data(treeLayoutData.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke', options.linkColor || '#ccc')
            .attr('stroke-width', 2)
            .attr('d', d3.linkVertical()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })
            );

        // Dessiner les nœuds
        var nodes = svg.selectAll('.node')
            .data(treeLayoutData.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });

        // Fond des nœuds
        nodes.append('rect')
            .attr('rx', 6)
            .attr('ry', 6)
            .attr('fill', function (d) {
                if (d.data.isLeaf) {
                    return d.data.value === 'Succès' || d.data.value === 'SUCCÈS' ? '#27ae60' : '#e74c3c';
                }
                return options.nodeColor || '#3498db';
            })
            .attr('stroke', function (d) {
                if (d.data.isLeaf) {
                    return d.data.value === 'Succès' || d.data.value === 'SUCCÈS' ? '#1a7a42' : '#922b21';
                }
                return options.nodeStroke || '#2980b9';
            })
            .attr('stroke-width', 2)
            .attr('width', function (d) {
                var name = d.data.name || '';
                var len = Math.min(name.length, 35);
                return len * 7 + 30;
            })
            .attr('height', 35)
            .attr('x', function (d) {
                var name = d.data.name || '';
                var len = Math.min(name.length, 35);
                return -(len * 7 + 30) / 2;  // 👈 Utiliser la même logique que width
            })
            .attr('y', -17.5)
            .style('cursor', 'pointer')
            .on('click', function (event, d) {
                var details = d3.select(selector + ' .node-details');
                if (d.data.isLeaf) {
                    details.html('<strong>Feuille</strong><br/>Valeur: ' + d.data.value + '<br/>Samples: ' + (d.data.samples || 'N/A'));
                } else {
                    details.html('<strong>Nœud de décision</strong><br/>Condition: ' + d.data.name + '<br/>Samples: ' + (d.data.samples || 'N/A'));
                }
                details.style('opacity', 1);
            });

        // Texte des nœuds - police plus petite
        nodes.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '5px')
            .attr('fill', 'white')
            .attr('font-size', '9px')
            .attr('font-weight', 'bold')
            .text(function (d) {
                var name = d.data.name || '';
                if (name.length > 30) {
                    name = name.substring(0, 27) + '...';
                }
                return name;
            });
        // Ajouter le titre
        if (options.title) {
            d3.select(selector)
                .append('div')
                .style('text-align', 'center')
                .style('font-weight', 'bold')
                .style('font-size', '16px')
                .style('margin-bottom', '10px')
                .text(options.title);
        }

        // Ajouter les détails du nœud
        d3.select(selector)
            .append('div')
            .attr('class', 'node-details')
            .style('margin-top', '10px')
            .style('padding', '10px')
            .style('background', '#f8f9fa')
            .style('border-radius', '4px')
            .style('border-left', '4px solid #3498db')
            .style('font-size', '13px')
            .style('opacity', 0)
            .style('transition', 'opacity 0.3s')
            .html('Cliquez sur un nœud pour voir les détails.');

        return this;
    };

    /**
     * Convertit un Tree en structure D3
     * @private
     */
    /**
 * Convertit un Tree en structure D3
 * @private
 */
    tools.Library.Visualizer.prototype._treeToD3 = function (tree) {
        // Nettoyer le nom : enlever _left, _right, _...
        var cleanName = tree.name || 'Root';
        cleanName = cleanName.replace(/_left$/, '');
        cleanName = cleanName.replace(/_right$/, '');
        cleanName = cleanName.replace(/_[0-9]+$/, ''); // Enlever les suffixes numériques

        var result = {
            name: cleanName,
            value: tree.value,
            isLeaf: tree.children.length === 0,
            samples: tree.samples || 0,
            children: []
        };

        for (var i = 0; i < tree.children.length; i++) {
            result.children.push(this._treeToD3(tree.children[i]));
        }

        return result;
    };

    /**
     * Visualise les premiers arbres de la forêt
     * 
     * @param {Array} trees - Liste des arbres
     * @param {string} selector - Sélecteur CSS du conteneur
     * @param {number} maxTrees - Nombre maximum d'arbres à afficher
     * @param {Object} options - Options supplémentaires
     * 
     * @example
     * visualizer.forest(model.trees, "#forestContainer", 3);
     */
    tools.Library.Visualizer.prototype.forest = function (trees, selector, maxTrees, options) {
        maxTrees = maxTrees || 3;
        var self = this;

        if (!trees || trees.length === 0) {
            d3.select(selector).html('<p style="color:#888;">Aucun arbre dans la forêt.</p>');
            return this;
        }

        var toShow = Math.min(maxTrees, trees.length);

        // Créer un conteneur pour chaque arbre
        var container = d3.select(selector);
        container.html('');

        for (var i = 0; i < toShow; i++) {
            var div = container.append('div')
                .style('display', 'inline-block')
                .style('width', (100 / toShow) + '%')
                .style('min-width', '300px')
                .style('vertical-align', 'top')
                .style('padding', '5px');

            var id = 'tree-' + i + '-' + Date.now();
            div.append('h4')
                .style('text-align', 'center')
                .style('font-size', '14px')
                .style('margin', '5px 0')
                .text('Arbre ' + (i + 1) + '/' + trees.length);

            div.append('div')
                .attr('id', id)
                .style('height', '400px')
                .style('overflow', 'auto');

            // Réduire la taille pour les mini-arbres
            var tempWidth = this._width;
            var tempHeight = this._height;
            this._width = Math.min(400, tempWidth);
            this._height = 400;

            this.tree(trees[i], '#' + id, { title: false });

            // Restaurer la taille
            this._width = tempWidth;
            this._height = tempHeight;
        }

        return this;
    };

    console.log("✅ tools.Library.Visualizer chargé avec succès (D3.js)");
    console.log("   Utilisation : new tools.Library.Visualizer(matrice)");
    console.log("   📊 Graphiques : pieChart, barChart, histogram, scatter");
    console.log("   🌳 Arbres : tree, forest");

})();