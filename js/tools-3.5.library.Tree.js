/**
 * ============================================================
 * STRUCTURE D'ARBRE
 * ============================================================
 * 
 * Cette classe représente une structure d'arbre générique utilisée
 * par les modèles de prédiction (Random Forest, arbres de décision, etc.)
 * 
 * Un arbre est composé de nœuds qui peuvent avoir des enfants.
 * Chaque nœud a un nom, une valeur optionnelle, et peut contenir
 * des sous-arbres.
 * 
 * Utilisations dans le système :
 * 1. Représenter les arbres de décision du Random Forest
 * 2. Transformer une matrice en structure hiérarchique
 * 3. Visualiser les relations entre les données
 * 
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function() {
    'use strict';

    /**
     * Classe Tree - Représente un arbre générique
     * 
     * @param {string} name - Le nom du nœud
     * @param {*} [value=null] - La valeur du nœud (optionnelle)
     */
    tools.Library.Tree = function(name, value = null) {
        // ============================================================
        // PROPRIÉTÉS
        // ============================================================
        
        /**
         * Le nom du nœud (identifiant)
         * @type {string}
         */
        this.name = name;
        
        /**
         * La valeur du nœud (peut être de n'importe quel type)
         * @type {*}
         */
        this.value = value;
        
        /**
         * La liste des enfants du nœud
         * @type {Array<tools.Library.Tree>}
         */
        this.children = [];
        
        /**
         * Le parent du nœud (null si c'est la racine)
         * @type {tools.Library.Tree|null}
         */
        this.parent = null;
        
        /**
         * La profondeur du nœud dans l'arbre (0 pour la racine)
         * @type {number}
         */
        this.depth = 0;
        
        /**
         * Métadonnées supplémentaires attachées au nœud
         * @type {Object}
         */
        this.metadata = {};

        // ============================================================
        // MÉTHODES
        // ============================================================
        
        /**
         * Ajoute un enfant au nœud
         * 
         * @param {tools.Library.Tree|*} child - L'enfant à ajouter (Tree ou valeur)
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * const root = new Tree("Root");
         * root.addChild(new Tree("Child1"));
         * root.addChild("Child2"); // Crée automatiquement un Tree("Child2", "Child2")
         */
        this.addChild = function(child) {
            let childNode;
            
            if (child instanceof tools.Library.Tree) {
                childNode = child;
            } else {
                // Si ce n'est pas un Tree, on le crée automatiquement
                childNode = new tools.Library.Tree(child.toString(), child);
            }
            
            // Lier l'enfant à ce parent
            childNode.parent = this;
            childNode.depth = this.depth + 1;
            
            this.children.push(childNode);
            return this;
        };
        
        /**
         * Ajoute plusieurs enfants à la fois
         * 
         * @param {Array<tools.Library.Tree|*>} children - Liste des enfants à ajouter
         * @returns {this} Pour permettre le chaînage
         */
        this.addChildren = function(children) {
            for (let i = 0; i < children.length; i++) {
                this.addChild(children[i]);
            }
            return this;
        };
        
        /**
         * Trouve un nœud par son nom (recherche récursive)
         * 
         * @param {string} name - Le nom du nœud à trouver
         * @returns {tools.Library.Tree|null} Le nœud trouvé ou null
         */
        this.findNode = function(name) {
            // Vérifier si ce nœud correspond
            if (this.name === name) {
                return this;
            }
            
            // Rechercher récursivement dans les enfants
            for (let i = 0; i < this.children.length; i++) {
                const found = this.children[i].findNode(name);
                if (found) {
                    return found;
                }
            }
            
            return null;
        };
        
        /**
         * Trouve tous les nœuds qui correspondent à un critère
         * 
         * @param {Function} predicate - Fonction de test (retourne true pour les nœuds à garder)
         * @returns {Array<tools.Library.Tree>} Liste des nœuds trouvés
         */
        this.findNodes = function(predicate) {
            const results = [];
            
            // Vérifier si ce nœud correspond
            if (predicate(this)) {
                results.push(this);
            }
            
            // Rechercher récursivement dans les enfants
            for (let i = 0; i < this.children.length; i++) {
                const found = this.children[i].findNodes(predicate);
                results.push(...found);
            }
            
            return results;
        };
        
        /**
         * Parcourt l'arbre en profondeur avec une fonction de rappel
         * 
         * @param {Function} callback - Fonction appelée pour chaque nœud
         * @param {string} [order='pre'] - Ordre de parcours : 'pre' (préfixe), 'post' (postfixe)
         * @returns {this} Pour permettre le chaînage
         * 
         * @example
         * tree.traverse(function(node) {
         *     console.log(node.name + ' (profondeur: ' + node.depth + ')');
         * });
         */
        this.traverse = function(callback, order = 'pre') {
            if (order === 'pre') {
                callback(this);
            }
            
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].traverse(callback, order);
            }
            
            if (order === 'post') {
                callback(this);
            }
            
            return this;
        };
        
        /**
         * Parcourt l'arbre en largeur (BFS - Breadth First Search)
         * 
         * @param {Function} callback - Fonction appelée pour chaque nœud
         * @returns {this} Pour permettre le chaînage
         */
        this.traverseBFS = function(callback) {
            const queue = [this];
            
            while (queue.length > 0) {
                const node = queue.shift();
                callback(node);
                
                for (let i = 0; i < node.children.length; i++) {
                    queue.push(node.children[i]);
                }
            }
            
            return this;
        };
        
        /**
         * Calcule la hauteur de l'arbre (nombre de niveaux)
         * 
         * @returns {number} La hauteur de l'arbre
         */
        this.getHeight = function() {
            if (this.children.length === 0) {
                return 1;
            }
            
            let maxChildHeight = 0;
            for (let i = 0; i < this.children.length; i++) {
                const childHeight = this.children[i].getHeight();
                if (childHeight > maxChildHeight) {
                    maxChildHeight = childHeight;
                }
            }
            
            return 1 + maxChildHeight;
        };
        
        /**
         * Calcule le nombre total de nœuds dans l'arbre
         * 
         * @returns {number} Le nombre total de nœuds
         */
        this.getSize = function() {
            let size = 1; // Ce nœud
            
            for (let i = 0; i < this.children.length; i++) {
                size += this.children[i].getSize();
            }
            
            return size;
        };
        
        /**
         * Vérifie si le nœud est une feuille (sans enfants)
         * 
         * @returns {boolean} True si le nœud est une feuille
         */
        this.isLeaf = function() {
            return this.children.length === 0;
        };
        
        /**
         * Vérifie si le nœud est la racine (sans parent)
         * 
         * @returns {boolean} True si le nœud est la racine
         */
        this.isRoot = function() {
            return this.parent === null;
        };
        
        /**
         * Retourne le chemin depuis la racine jusqu'à ce nœud
         * 
         * @returns {Array<string>} Liste des noms des nœuds du chemin
         */
        this.getPath = function() {
            const path = [];
            let current = this;
            
            while (current) {
                path.unshift(current.name);
                current = current.parent;
            }
            
            return path;
        };
        
        /**
         * Convertit l'arbre en objet JSON
         * 
         * @param {boolean} [includeChildren=true] - Inclure les enfants dans la conversion
         * @returns {Object} L'objet JSON représentant l'arbre
         */
        this.toJSON = function(includeChildren = true) {
            const obj = {
                name: this.name,
                value: this.value,
                depth: this.depth,
                metadata: this.metadata
            };
            
            if (includeChildren && this.children.length > 0) {
                obj.children = this.children.map(child => child.toJSON(includeChildren));
            }
            
            return obj;
        };
        
        /**
         * Convertit l'arbre en chaîne de caractères (affichage)
         * 
         * @param {string} [prefix=''] - Préfixe pour l'indentation
         * @param {boolean} [isLast=true] - Indique si c'est le dernier enfant
         * @returns {string} La représentation textuelle de l'arbre
         */
        this.toString = function(prefix = '', isLast = true) {
            let result = prefix;
            
            if (isLast) {
                result += '└── ';
            } else {
                result += '├── ';
            }
            
            result += this.name;
            if (this.value !== null && this.value !== undefined) {
                result += ` (${this.value})`;
            }
            result += '\n';
            
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            for (let i = 0; i < this.children.length; i++) {
                const isChildLast = (i === this.children.length - 1);
                result += this.children[i].toString(childPrefix, isChildLast);
            }
            
            return result;
        };
    };

    console.log(" tools.Library.Tree chargé avec succès");

})();