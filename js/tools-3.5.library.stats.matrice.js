tools.Library.Stats = {
    Filter: {
        FILTER_TYPE_MIN: "MIN",
        FILTER_TYPE_MIN_EQUAL: "MIN_EQUAL",
        FILTER_TYPE_MAX: "MAX",
        FILTER_TYPE_MAX_EQUAL: "MAX_EQUAL",
        FILTER_TYPE_EQUAL: "EQUAL",
        FILTER_TYPE_DIFF: "DIFF",
        FILTER_TYPE_BETWEEN: "BETWEEN",
        FILTER_TYPE_BETWEEN_EQUAL: "BETWEEN_EQUAL",
        AbstractFilter: function (type, valueStart, valueEnd = "") {
            this.type = type;
            this.valueStart = valueStart;
            this.valueEnd = valueEnd;
            this.contents = [];

            this.filterUniqueContent = function (element) {
                if (this.contents.indexOf(element) == -1) {
                    this.contents.unshift(element);
                    return true;
                }
                return false;
            }

            this.applyFilterMIN = function (value) {
                return this.valueStart > value;
            }

            this.applyFilterMAX = function (value) {
                return this.valueStart < value;
            }

            this.applyFilterEQUAL = function (value) {
                return !this.applyFilterMAX(value) && !this.applyFilterMIN(value);
            }

            this.applyFilterDIFF = function (value) {
                return value != this.valueStart;
            }

            this.applyFilterMIN_EQUAL = function (value) {
                return this.applyFilterMIN(value) || this.applyFilterEQUAL(value);
            }

            this.applyFilterMAX_EQUAL = function (value) {
                return this.applyFilterMAX(value) || this.applyFilterEQUAL(value);
            }

            this.applyFilterBETWEEN = function (value) {
                return value > this.valueStart && value < this.valueEnd;
                // return this.applyFilterMIN_EQUAL(value) && this.applyFilterMAX_EQUAL(value);
            }

            this.applyFilter = function (value) {
                return this["applyFilter" + this.type](value);
            }

        }
    },
    MatriceHeader: function (matrice, colonnes, lignes) {
        tools.Library.Stats.Matrice.call(this);
        this.matrice = matrice;

        this.setColonnes(colonnes);
        this.setLignes(lignes);

        this.setElement = function (element, colName, ligneName) {
            this.matrice.setElement(element, colName, ligneName);
        }

        this.getElement = function (colName, ligneName) {
            return this.matrice.getElement(colName, ligneName);
        }
    },
    Matrice: function () {
        this.prefix = "";
        // Chaque élèment est un Library\Entity
        this.elements = new Map();
        this._groupIndexColsNames = [];
        this._countGroupIndexColsNamesOccurences = {};
        this._buildIndexContent = {};
        // la clé c'est le nom de la colonne
        this.colonnes = [];
        this.colonnesTypes = [];
        this.colonnesLabels = [];
        // la clé c'est le nom de la ligne
        this.lignes = [];
        this.filter = [];
        this.groupPolice = [];
        // Pour construire des indexs de contenu. Non si vide
        this.colsBuildIndexs = [];

        this.setColsBuildIndexs = function (colsNames) {
            this.colsBuildIndexs = colsNames;
        }

        this.setColLabel = function (label, colName) {
            let indexCol = this.getColIndex(colName);
            this.colonnesLabels[indexCol] = label;
        }

        this.getColLabel = function (colName) {
            let indexCol = this.getColIndex(colName);
            return this.colonnesLabels[indexCol];
        }

        this.renameCol = function (colName, name) {
            let indexCol = this.getColIndex(colName);
            this.colonnes[indexCol] = name;
        }

        this.renameCols = function (colsNames) {
            for (const colName in colsNames) {
                if (Object.hasOwnProperty.call(colsNames, colName)) {
                    const name = colsNames[colName];
                    this.renameCol(colName, name);
                }
            }
        }

        this.addGroupPolice = function (police, colsNames = []) {
            if (colsNames.length == 0) {
                colsNames = this.getColonnes();
            }

            for (let i = 0; i < colsNames.length; i++) {
                let indexCol = this.getColIndex(colsNames[i]);
                this.groupPolice[indexCol] = police;
            }
            // console.log('groupPolice');
            // console.log(this.groupPolice);
        }

        this.addGroupPoliceIntervalle = function (police, min = 0, max = -1) {
            if (this.getColonnes().length > max || max == -1) {
                max = this.getColonnes().length;
            }
            if (min > max) {
                min = max - 1;
            }

            let colsNames = this.getColonnes();
            for (let i = min; i < max; i++) {
                let indexCol = this.getColIndex(colsNames[i]);
                this.groupPolice[indexCol] = police;
            }
            // console.log('groupPolice');
            // console.log(this.groupPolice);
        }

        this.getGroupPolice = function (indexCol) {
            let police = this.groupPolice[indexCol];
            if (police == undefined) {
                // return this.colonnesTypes[indexCol] == 'string' ? ' ' : '+';
                return '+';
            }
            return police;
        }

        this.addFilter = function (filter, colsNames = []) {
            if (colsNames.length == 0) {
                colsNames = this.getColonnes();
            }

            for (let i = 0; i < colsNames.length; i++) {
                let indexCol = this.getColIndex(colsNames[i]);
                if (this.filter[indexCol] == undefined) {
                    this.filter[indexCol] = [];
                }

                this.filter[indexCol].unshift(filter);
            }

            return this;
        }

        this.setFilter = function (filter, colsNames = []) {
            this.filter = [];
            return this.addFilter(filter, colsNames);
        }

        this.applyColonneFilters = function (colName, lignesSelected = []) {
            let indexCol = this.getColIndex(colName);
            let ligneSelected_t = [];

            if (this.filter[indexCol] != undefined) {
                let filters = this.filter[indexCol];
                // if (lignesSelected.length == 0) {
                //     lignesSelected = this.getLignes();
                // }

                for (let i = 0; i < filters.length; i++) {
                    var
                        filter = filters[i],
                        colElements = this.getElementsColonne(colName);

                    for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                        const elt = colElements[indexLigne];
                        if (filter.applyFilter(elt)) {
                            ligneSelected_t[indexLigne] = lignesSelected[indexLigne];
                        }
                    }
                }
                return ligneSelected_t;
            }

            return lignesSelected;
        }

        /**
         * colName le nom de la colonne sur laquelle appliquer map
         * map prend en parametre (la valeur d'une cellule de la colonne, un tableau de données sur la ligne)
         */
        this.applyColonneMap = function (colName, map) {
            // let indexCol = this.getColIndex(colName);

            let lignesSelected = this.getLignes();
            let colElements = this.getElementsColonne(colName);
            // console.log(colElements);
            for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                const elt = colElements[indexLigne];
                this.setElement(map(elt, this.getElementsLigne(this.getLignes()[indexLigne])), colName, this.getLignes()[indexLigne]);
            }

        }

        /**
         * colName le nom de la colonne sur laquelle appliquer map
         * map prend en parametre (la valeur d'une cellule de la colonne)
         */
        this.applyColonneMapCell = function (colName, mapCell) {
            // let indexCol = this.getColIndex(colName);
            let lignesSelected = this.getLignes();
            let colElements = this.getElementsColonne(colName);
            // console.log(colElements);
            // var
            //     indexCol = this.getColIndex(colName),
            //     indexHight = this._getHightIndex(hightName),elementExist
            for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                const
                    elt = colElements[indexLigne],
                    eltM = mapCell(elt);
                if (eltM) {
                    this.setElement(eltM, colName, this.getLignes()[indexLigne]);
                } else if (elt) {
                    this.setElement("", colName, this.getLignes()[indexLigne]);
                }
            }
            // console.log(this._groupIndexColsNames[indexCol]);
            // console.log(this.getElementsColonne(colNamelksflls));
        }

        this.applyColonnesFilters = function (colsNames, lignesSelected = []) {
            var
                // isFirstApply = true,
                ligneSelected_t = lignesSelected;

            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];
                ligneSelected_t = this.applyColonneFilters(colName, ligneSelected_t);
                // isFirstApply = false;
            }

            return ligneSelected_t;
        }

        this.applyColonnesMap = function (colsNames, map) {
            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];
                this.applyColonneMap(colName, map);
            }
        }

        this.applyColonnesMapCell = function (colsNames, map) {
            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];
                this.applyColonneMapCell(colName, map);
            }
        }

        this.applyColonnesMapCellIdentify = function (colsNames, mapCelldentifyCol) {
            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];

                let indexCol = this.getColIndex(colName);
                let lignesSelected = this.getLignes();
                let colElements = this.getElementsColonne(colName);
                // console.log(colsNames);
                // var
                //     indexCol = this.getColIndex(colName),
                //     indexHight = this._getHightIndex(hightName),
                for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                    const
                        elt = colElements[indexLigne],
                        eltM = mapCelldentifyCol(elt, colName);
                    this.setElement(eltM, colName, this.getLignes()[indexLigne]);
                    // if (eltM) {
                    // }
                }
            }
        }

        this.applyLignesMapCellIdentify = function (lignesNames, mapCelldentifyCol) {
            let colsNames = this.getColonnes();

            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];

                let indexCol = this.getColIndex(colName);
                let lignesSelected = lignesNames;
                let colElements = this.getElementsColonne(colName);
                // console.log(colsNames);
                // var
                //     indexCol = this.getColIndex(colName),
                //     indexHight = this._getHightIndex(hightName),
                for (let indexLigne = 0; indexLigne < lignesSelected.length; indexLigne++) {
                    const
                        elt = colElements[indexLigne],
                        eltM = mapCelldentifyCol(elt, colName);
                    this.setElement(eltM, colName, this.getLignes()[indexLigne]);
                    if (eltM) {
                        this.updateBuildIndex(indexCol, indexLigne, elt);
                    }
                }
            }
        }

        this.applyFilters = function () {
            var
                result = [],
                lignesSelected = this.getLignes();

            lignesSelected = this.applyColonnesFilters(this.getColonnes(), lignesSelected);
            for (const key in lignesSelected) {
                if (Object.hasOwnProperty.call(lignesSelected, key)) {
                    const lign = lignesSelected[key];
                    // const lign = lignesSelected[key].trim();
                    if (lign) result.push(lign);
                }
            }
            return new tools.Library.Stats.MatriceHeader(this, this.getColonnes(), result);
        }

        this._addGroupValColName = function (indexCol, val) {
            if (this._groupIndexColsNames[indexCol] == undefined) {
                this._countGroupIndexColsNamesOccurences[indexCol] = {};
                this._groupIndexColsNames[indexCol] = [];
            }

            let indexVal = this._groupIndexColsNames[indexCol].indexOf(val);
            if (indexVal == -1) {
                // console.log(this._groupIndexColsNames[indexCol]); 
                this._groupIndexColsNames[indexCol].unshift(val);
                this._countGroupIndexColsNamesOccurences[indexCol][val] = 1;
            } else {
                // console.log(this._countGroupIndexColsNamesOccurences);:
                this._countGroupIndexColsNamesOccurences[indexCol][val] = 1 + this._countGroupIndexColsNamesOccurences[indexCol][val];
            }
        }

        this._deleteGroupValColName = function (indexCol, val) {
            if (this._groupIndexColsNames[indexCol] != undefined) {
                let indexVal = this._groupIndexColsNames[indexCol].indexOf(val);
                if (indexVal != -1) {
                    let list = [];
                    for (let i = 0; i < this._groupIndexColsNames[indexCol].length; i++) {
                        const element = this._groupIndexColsNames[indexCol][i];
                        if (val != element) {
                            list.push(element);
                        }
                    }
                    this._groupIndexColsNames[indexCol] = list;
                    delete this._countGroupIndexColsNamesOccurences[indexCol][val];
                    // console.log(this._groupIndexColsNames[indexCol]); 
                }
            }
        }

        this._create_buildIndexContent = function (val) {
            if (val) {
                // if (val && (typeof val != "object") && !Array.isArray(val)) {
                if (typeof val == "string") {
                    let
                        result = "",
                        content = val.split(" ");

                    for (const key in content) {
                        if (Object.hasOwnProperty.call(content, key)) {
                            const elt = content[key];
                            if (elt) {
                                result += elt;
                            }
                        }
                    }

                    return result;
                }
            }
            return val;
        }

        this._exist_buildIndexContent = function (val) {
            let key_add = this._create_buildIndexContent(val);
            if (this._buildIndexContent[key_add] == undefined) {
                return false;
            }
            return key_add;
        }

        this._init_buildIndexContent = function (val) {
            let key_add = this._exist_buildIndexContent(val);

            if (!key_add) {
                key_add = this._create_buildIndexContent(val);
                this._buildIndexContent[key_add] = {};
            }

            return key_add;
        }

        this._add_buildIndexContent = function (key_add, indexRow, indexCol) {
            let key = indexRow + "_" + indexCol;
            this._buildIndexContent[key_add][key] = { 'indexRow': indexRow, 'indexCol': indexCol };
        }

        this._get_buildIndexContent = function (val, similarity = null, sensibility = 4) {
            let valL = val;
            // let valL = val.trim().replace(/ /g, '');
            if (similarity == null || similarity == 0) {
                let key_add = this._exist_buildIndexContent(valL);
                return this._buildIndexContent[key_add];
            }

            let result = {};
            for (const key_add in this._buildIndexContent) {
                if (Object.hasOwnProperty.call(this._buildIndexContent, key_add)) {
                    const sensitive = similarity(valL, key_add);
                    // console.log(similarity(val, key_add));
                    if (Math.abs(sensitive) < sensibility) {
                        // console.log(element);
                        result[key_add] = Math.abs(sensitive);
                    }
                }
            }

            let keysSorted = Object.keys(result).sort(function (a, b) { return result[a] - result[b]; });
            result = {};
            for (const key in keysSorted) {
                if (Object.hasOwnProperty.call(keysSorted, key)) {
                    const
                        key_add = keysSorted[key],
                        element = this._buildIndexContent[key_add];
                    // console.log(similarity(val, key_add));
                    result = { ...result, ...element };
                    // console.log(result);
                }
            }
            // console.log(result);
            return result;
        }

        this._get_buildIndexContentFuzzy = function (val, options = { keys: ['title'], threshold: 0.3, location: 0, distance: 100, includeMatches: true, includeScore: true, useExtendSearch: true }) {
            let list = Object.keys(this._buildIndexContent).map((key) => [{ title: key }]);

            const fuse = new Fuse(list, options);
            return fuse.search(val);
        }

        this.__buildIndex = function (indexCol, indexRow, val) {
            if (this.colsBuildIndexs.length == 0 || this.colsBuildIndexs.indexOf(this.colonnes[indexCol]) !== -1) {
                let key_add = this._init_buildIndexContent(val);
                this._add_buildIndexContent(key_add, indexRow, indexCol);
            }
        }

        this.__updateBuildIndex = function (indexCol, indexRow, val) {
            let key_add = this._exist_buildIndexContent(val);
            if (key_add) {
                let key = indexRow + "_" + indexCol;
                // console.log(this._buildIndexContent[val][key]);
                delete this._buildIndexContent[key_add][key];
                // console.log(this._buildIndexContent[val][key]);
            }

            if (!this.__buildIndexExist(indexCol, key_add)) {
                this._deleteGroupValColName(indexCol, key_add);
                if (this._buildIndexContent[key_add] != undefined && Object.keys(this._buildIndexContent[key_add]).length == 0) {
                    delete this._buildIndexContent[key_add];
                }
            }
            // console.log(this._buildIndexContent[val]);
            // matriceContent.getColsValuesGroupForColName("Colonne2")
        }

        this.updateBuildIndex = function (indexCol, indexRow, val) {
            let key_add = this._exist_buildIndexContent(val);
            if (this._buildIndexContent[key_add] != undefined && this.getElementIndex(indexCol, indexRow) != key_add) {
                let key = indexRow + "_" + indexCol;
                // console.log(this._buildIndexContent[val][key]);
                delete this._buildIndexContent[key_add][key];
                // console.log(this._buildIndexContent[val][key]);
            }

            if (!this.__buildIndexExist(indexCol, key_add)) {
                this._deleteGroupValColName(indexCol, key_add);
                if (this._buildIndexContent[key_add] != undefined && Object.keys(this._buildIndexContent[key_add]).length == 0) {
                    delete this._buildIndexContent[key_add];
                }
            }
            // console.log(this._buildIndexContent[val]);
            // matriceContent.getColsValuesGroupForColName("Colonne2")
        }

        this.__buildIndexExist = function (indexCol, val) {
            let listIndexCols = this._get_buildIndexContent(val);

            for (const key in listIndexCols) {
                if (Object.hasOwnProperty.call(listIndexCols, key)) {
                    const indexLignCol = listIndexCols[key];
                    if (indexLignCol.indexCol == indexCol) {
                        return true;
                    }
                }
            }
            return false;
        }

        this.getIndexRowColsInContext = function (val, indexCol) {
            var
                result = {},
                elements = this._get_buildIndexContent(val);

            // console.log("val");
            // console.log(indexCol);
            // console.log(val);
            // console.log(elements);
            for (const key in elements) {
                if (Object.hasOwnProperty.call(elements, key)) {
                    const indexRowCol = elements[key];
                    if (indexRowCol.indexCol == indexCol) {
                        result[key] = indexRowCol;
                    }
                }
            }

            return result;
        }

        this.groupLignesByColumn = function (columnName) {
            var
                result = [],
                keyValues = [];

            var
                indexCol = this.getColIndex(columnName),
                keyValues = this._groupIndexColsNames[indexCol];
            // console.log(keyValues);
            for (let j = 0; j < keyValues.length; j++) {
                const key = keyValues[j];
                let
                    lignesElementsIndexs = this.getLignesIndexHaveValues([key], indexCol),
                    lignesElements = this.getElementsLigneIndexs(lignesElementsIndexs);
                // console.log('lignesElements');
                // console.log(lignesElements);
                let ligneResult = [];
                for (let i = 0; i < this.getColonnes().length; i++) {
                    const
                        colName = this.getColonnes()[i],
                        indexCol = this.getColIndex(colName),
                        police = this.getGroupPolice(indexCol);

                    colElements = this.getElementsColonneInLignes(indexCol, lignesElements);
                    // console.log(colName);
                    // console.log(colElements);
                    let cell = tools.Library.ArrayUtility.acc(function (val) {
                        return parseFloat(val);
                    }, colElements, police);
                    // console.log('police');
                    // console.log(police);
                    // console.log(cell);
                    ligneResult[indexCol] = cell;
                }

                result.unshift({ keyValue: key, group: ligneResult });
            }

            return result;
        }

        this.groupLignesByColumnNotResume = function (columnName) {
            var
                result = [],
                keyValues = [];
            // console.log(this);
            var
                // colElements = this.getElementsColonne(columnName),
                indexCol = this.getColIndex(columnName),
                keyValues = this._groupIndexColsNames[indexCol];
            // keyValues = tools.Library.ArrayUtility.filterUniques(colElements);
            console.log(keyValues);
            for (let j = 0; j < keyValues.length; j++) {
                const key = keyValues[j];
                var
                    lignesElementsIndexs = this.getLignesIndexHaveValues([key], indexCol),
                    lignesElements = this.getElementsLigneIndexs(lignesElementsIndexs);
                // console.log('Groupe read data ' + keyValues.length - j);
                // console.log(lignesElements);
                result.unshift({ keyValue: key, group: lignesElements });
            }

            return result;
        }

        this.getColonnes = function () {
            return this.colonnes;
        }

        this.getColonnesInPos = function (minPos, maxPos) {
            let result = [];
            if (maxPos > this.getColonnes().length) {
                maxPos = this.getColonnes().length;
            }

            if (minPos < 0) {
                minPos = 0;
            }

            for (let i = minPos; i < maxPos; i++) {
                const colName = this.getColonnes()[i];
                result.push(colName);
            }

            return result;
        }

        this.setColonnes = function (colonnes) {
            this.colonnes = colonnes;
        }

        this.addColonnes = function (colonnes) {
            for (let i = 0; i < colonnes.length; i++) {
                const colIndex = this.getColIndex(colonnes[i]);
            }
        }

        this.getLignes = function () {
            return this.lignes;
        }

        this.ligneExist = function (ligneName) {
            return this.lignes.indexOf(ligneName) != -1;
        }

        this.setLignes = function (lignes) {
            this.lignes = lignes;
        }

        this.addDeriveColFrom = function (colNameNew, cols = [], deriverFunct, detailCell = false) {
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                // const indexLigne = this.getLigneIndex(this.lignes[index]);
                let collect = [];

                for (let i = 0; i < cols.length; i++) {
                    const colName = cols[i];

                    let element = this.getElement(colName, this.lignes[index]);
                    if (detailCell) {
                        collect.push({
                            indexRow: this.getLigneIndex(this.lignes[index]),
                            indexCol: this.getColIndex(colName),
                            val: element
                        });
                    } else {
                        collect.push(element);
                    }
                }

                this.setElement(deriverFunct(collect), colNameNew, this.lignes[index]);
            }
        }

        this.addLigne = function (ligneName, lignesElements) {
            for (let i = 0; i < this.getColonnes().length; i++) {
                const colName = this.getColonnes()[i];
                for (const key in lignesElements) {
                    if (Object.hasOwnProperty.call(lignesElements, key)) {
                        const element = lignesElements[key];
                        this.setElement(element, colName, ligneName)
                    }
                }
            }
        }

        this.addLigneContent = function (colsNames, ligneName, lignesElements) {
            for (let i = 0; i < colsNames.length; i++) {
                const colName = colsNames[i];
                // let j = 0;

                for (const key in lignesElements) {
                    if (Object.hasOwnProperty.call(lignesElements, key)) {
                        const element = lignesElements[key];
                        this.setElement(element, colName, ligneName)
                    }
                }
            }
        }

        this.getColonnesTypes = function () {
            return this.colonnesTypes;
        }

        this.getColonneType = function (colName) {
            let indexCol = this.getColIndex(colName);
            return this.colonnesTypes[indexCol];
        }

        this.dataTableForm = function () {
            return {
                data: this.getDataSet(),
                columns: this.getColonnesFormatDataTable(),
            };
        }

        this.getColonnesFormatDataTable = function () {
            let result = [];

            for (let index = 0; index < this.colonnes.length; index++) {
                const col = this.colonnes[index];
                result.push({ title: col });
            }

            return result;
        }

        this.vectorColToCell = function (col) {
            let eltsLigne = this.getElementsColonne(col);
            // console.log(col);
            return this._vectorToCell(eltsLigne);
        }

        this.vectorColInLignesToCell = function (col, lignesElements) {
            let eltsLigne = this.getElementsColonneInLignes(col, lignesElements);
            // console.log(col);
            return this._vectorToCell(eltsLigne);
        }

        this.vectorLigneToCell = function (ligne) {
            let eltsLigne = this.getElementsLigne(ligne);
            // console.log(ligne);
            // console.log(this);
            return this._vectorToCell(eltsLigne);
        }

        this.fusionAllLignes = function () {
            let
                colsName = this.getLignes(),
                result = this.getElementsLigne(colsName.shift());

            for (let index = 0; index < colsName.length; index++) {
                const col1 = colsName[index];

                result = this._fusion(result, col1);
            }

            return result;
        }

        this.fusionAllColonnes = function () {
            var
                colsName = this.getColonnes(),
                result = this.getElementsColonne(colsName.shift());

            for (let index = 0; index < colsName.length; index++) {
                const col1 = colsName[index];

                result = this._fusion(result, col1);
            }

            return result;
        }

        this.resumeColsWithPolice = function (colsNames = []) {
            let result = [];
            if (colsNames.length == 0) {
                colsNames = this.getColonnes();
            }
            // console.log(colsNames.length);
            for (let i = 0; i < colsNames.length; i++) {
                const
                    colName = colsNames[i],
                    indexCol = this.getColIndex(colName),
                    police = this.getGroupPolice(indexCol);

                let colElements = this.getElementsColonne(colName);
                // console.log(colName);
                // console.log(colElements);

                let cell = tools.Library.ArrayUtility.acc(function (val) {
                    return val;
                }, colElements, police);
                // console.log('police');
                // console.log(police);
                // console.log(cell);
                result[indexCol] = cell;
            }

            return result;
        }

        this.resumeWithPolice = function (police, elements) {
            return tools.Library.ArrayUtility.acc(function (val) {
                return val;
            }, elements, police);
        }

        this.sommeWithMatrice = function (matrice) {
            for (let i = 0; i < this.getColonnes().length; i++) {
                const
                    colName = this.getColonnes()[i],
                    indexCol = this.getColIndex(colName),
                    police = this.getGroupPolice(indexCol);

                for (let j = 0; j < this.getLignes().length; j++) {
                    const
                        lignName = this.getLignes()[j],
                        elt = this.getElement(colName, lignName),
                        elt1 = matrice.getElement(colName, lignName),
                        elements = [elt, elt1];

                    let cell = tools.Library.ArrayUtility.acc(function (val) {
                        return val;
                    }, elements, police);

                    this.setElement(cell, colName, lignName);
                }
            }
        }

        this.moyenneFromMatrices = function (matrices = []) {
            for (let i = 0; i < this.getColonnes().length; i++) {
                const
                    colName = this.getColonnes()[i],
                    indexCol = this.getColIndex(colName),
                    police = this.getGroupPolice(indexCol);

                // console.log(this.groupPolice);
                if (police != "id") {
                    for (let j = 0; j < this.getLignes().length; j++) {
                        const
                            lignName = this.getLignes()[j],
                            elt = this.getElement(colName, lignName),
                            elements = [elt],
                            allIsNull = true;

                        for (let k = 0; k < matrices.length; k++) {
                            const
                                matrice = matrices[k],
                                elt_tmp = matrice.getElement(colName, lignName);

                            elements.push(elt_tmp);
                        }

                        this.setElement(this._moyenneValues(elements, police), colName, lignName);
                    }

                }
            }
        }

        this.moyenneFromNumMatrices = function (matrices = []) {
            for (let i = 0; i < this.getColonnes().length; i++) {
                const
                    colName = this.getColonnes()[i],
                    indexCol = this.getColIndex(colName),
                    police = this.getGroupPolice(indexCol);

                // console.log(this.groupPolice);
                if (police != "id") {
                    for (let j = 0; j < this.getLignes().length; j++) {
                        const
                            lignName = this.getLignes()[j],
                            elt = this.getElement(colName, lignName),
                            elements = [elt];

                        let allIsNull = elt == null || elt == -1;
                        for (let k = 0; k < matrices.length; k++) {
                            const
                                matrice = matrices[k],
                                elt_tmp = matrice.getElement(colName, lignName);

                            if (elt_tmp != -1 && elt_tmp != null) {
                                allIsNull = true;

                                if (!isNaN(parseFloat(elt_tmp))) {
                                    elements.push(elt_tmp);
                                    // elt_tmp = 0;
                                }
                            }
                        }

                        if (!allIsNull) {
                            this.setElement(this._moyenneValues(elements, police), colName, lignName);
                        }
                    }

                }
            }
        }

        this.aggregateFromMatrices = function (matrices = [], aggregator) {
            let
                matriceR = new tools.Library.Stats.Matrice(),
                colsUniform = this._uniformizeCols(matrices);

            for (const i in colsUniform) {
                if (Object.hasOwnProperty.call(colsUniform, i)) {
                    const colName = colsUniform[i];

                    for (let j = 0; j < this.getLignes().length; j++) {
                        const lignName = this.getLignes()[j];

                        let elementAdd = null;
                        for (let k = 0; k < matrices.length; k++) {
                            const
                                matrice = matrices[k],
                                elt_tmp = matrice.getElement(colName, lignName);
                            // elt_tmp = 0;
                            elementAdd = aggregator(elt_tmp, elementAdd);
                        }

                        if (elementAdd != null) {
                            matriceR.setElement(elementAdd, colName, lignName);
                        }
                    }

                }
            }

            return matriceR;
        }

        this.sommeCol = function (colName) {
            let colElements = this.getElementsColonne(colName);
            // console.log(colName);
            // console.log(colElements);

            let cell = tools.Library.ArrayUtility.acc(function (val) {
                return val;
            }, colElements, "+");

            return cell;
        }

        this.moyenneCol = function (colName) {
            return this.sommeCol(colName) / this.getElementsColonne(colName).length;
        }

        this.sommeValues = function (values) {
            let somme = 0;
            for (const key in values) {
                if (Object.hasOwnProperty.call(values, key)) {
                    const val = values[key];
                    somme = somme + parseFloat(val);
                }
            }
            return somme;
        }

        this.moyenneValues = function (values) {
            let somme = 0;
            for (const key in values) {
                if (Object.hasOwnProperty.call(values, key)) {
                    const val = parseFloat(values[key]);

                    if (!isNaN(val)) {
                        somme = somme + val;
                    }
                }
            }
            return somme / values.length;
        }

        this._moyenneValues = function (values, police = "+") {
            let cell = tools.Library.ArrayUtility.acc(function (val) {
                return val;
            }, values, police);

            let val = cell;
            if (police == "+") {
                val = cell / (values.length);
            }

            return val;
        }

        this._uniformizeCols = function (matrices = []) {
            let result = {};

            for (let i = 0; i < matrices.length; i++) {
                const
                    mat = matrices[i],
                    colsNames = mat.getColonnes();

                for (let j = 0; j < colsNames.length; j++) {
                    const colName = colsNames[j];
                    result[colName] = 1;
                }
            }

            return Object.keys(result);
        }

        this.getIndexLignesApplyFilterIndexsColsRows = function (filters, colName, indexsColsRows) {
            var
                result = [],
                indexCol = this.getColIndex(colName);

            // console.log(indexsColsRows);
            for (const key in indexsColsRows) {
                if (Object.hasOwnProperty.call(indexsColsRows, key)) {
                    const
                        indexColRow = indexsColsRows[key],
                        elt = this.getElementIndex(indexCol, indexColRow.indexRow);
                    // console.log(indexColRow);
                    let save = true;
                    for (const keyF in filters) {
                        if (Object.hasOwnProperty.call(filters, keyF)) {
                            const filter = filters[keyF];
                            if (!filter.applyFilter(elt)) {
                                save = false;
                                break;
                            }
                        }
                    }

                    if (save) {
                        result.unshift({ indexRow: indexColRow.indexRow, indexCol: indexCol });
                    }
                }
            }

            // console.log(result);
            // console.log("result");
            return result;
        }

        this.countElementCol = function (element, colName) {
            var
                nbre = 0,
                colElements = this.getElementsColonne(colName);

            for (const key in colElements) {
                if (Object.hasOwnProperty.call(colElements, key)) {
                    const val = colElements[key];
                    if (val == element) {
                        nbre++;
                    }
                }
            }
            return nbre;
        }

        this.countSupElementCol = function (val, colName) {
            var
                nbre = 0,
                colElements = this.getElementsColonne(colName);

            for (const key in colElements) {
                if (Object.hasOwnProperty.call(colElements, key)) {
                    const elt = colElements[key];
                    if (elt > val) {
                        nbre++;
                    }
                }
            }
            return nbre;
        }

        this.countInfElementCol = function (val, colName) {
            var
                nbre = 0,
                colElements = this.getElementsColonne(colName);

            for (const key in colElements) {
                if (Object.hasOwnProperty.call(colElements, key)) {
                    const elt = colElements[key];
                    if (elt < val) {
                        nbre++;
                    }
                }
            }
            return nbre;
        }

        this._s2ab = function (s) {
            let buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
            let view = new Uint8Array(buf);  //create uint8array as viewer
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
            return buf;
        }

        this.exportFileXSL = function (ws_data, sheatName) {
            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            wb.SheetNames.push(sheatName);

            let ws = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[sheatName] = ws;

            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            saveAs(new Blob([this._s2ab(wbout)], { type: "application/octet-stream" }), sheatName + '.xlsx');
        }

        this.exportXSL = function (sheatName = "Fichier Recap") {
            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            wb.SheetNames.push(sheatName);
            let
                propertiesLabels = this.getColonnes(),
                dataReadH = this.getLignes(),
                ws_data = [];  //a row with 2 columns

            ws_data.push(propertiesLabels);
            // console.log(schools);
            for (let j = 0; j < dataReadH.length; j++) {
                const lignName = dataReadH[j];
                // let ws_data = [['hello', 'world']];  //a row with 2 columns
                // ws_data.push(['Nom', 'prenom', 'sexe', 'matricule', 'Seq 1', 'Seq 2', 'Seq 3', 'Seq 4', 'Seq 5', 'Seq 6']);
                let elements = this.getElementsLigne(lignName);
                // console.log(elements);
                ws_data.push(elements);
            }
            let ws = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[sheatName] = ws

            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            saveAs(new Blob([this._s2ab(wbout)], { type: "application/octet-stream" }), sheatName + '.xlsx');

            // managers.getManagerOf("Eleve").save('/php/save.php', eleves, httpRequest);
        }

        this.exportXSLWithColsNames = function (colsNames, sheatName = "Fichier Recap") {
            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            wb.SheetNames.push(sheatName);
            let
                propertiesLabels = colsNames,
                dataReadH = this.getLignes(),
                ws_data = [];  //a row with 2 columns

            ws_data.push(propertiesLabels);
            // console.log(schools);
            for (let j = 0; j < dataReadH.length; j++) {
                const lignName = dataReadH[j];
                // let ws_data = [['hello', 'world']];  //a row with 2 columns
                // ws_data.push(['Nom', 'prenom', 'sexe', 'matricule', 'Seq 1', 'Seq 2', 'Seq 3', 'Seq 4', 'Seq 5', 'Seq 6']);
                let elements = this.getElementsLigne(lignName);
                // console.log(elements);
                ws_data.push(elements);
            }
            let ws = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[sheatName] = ws

            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            saveAs(new Blob([this._s2ab(wbout)], { type: "application/octet-stream" }), sheatName + '.xlsx');

            // managers.getManagerOf("Eleve").save('/php/save.php', eleves, httpRequest);
        }

        this.exportXSLMap = function (mapCell, mapRow, mapCol, sheatName = "Fichier Recap") {
            function s2ab(s) {
                let buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
                let view = new Uint8Array(buf);  //create uint8array as viewer
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
                return buf;
            }

            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            wb.SheetNames.push(sheatName);
            var
                propertiesLabels = ["Head"],
                dataReadH = this.getLignes(),
                ws_data = [];  //a row with 2 columns

            for (let i = 0; i < this.getColonnes().length; i++) {
                const elt = this.getColonnes()[i];
                propertiesLabels.push(mapCol(elt));
            }

            ws_data.push(propertiesLabels);
            // console.log(schools);
            for (let j = 0; j < dataReadH.length; j++) {
                const lignName = dataReadH[j];
                // let ws_data = [['hello', 'world']];  //a row with 2 columns
                // ws_data.push(['Nom', 'prenom', 'sexe', 'matricule', 'Seq 1', 'Seq 2', 'Seq 3', 'Seq 4', 'Seq 5', 'Seq 6']);
                var
                    elementsMap = [mapRow(lignName)],
                    elements = this.getElementsLigne(lignName);
                // console.log(elements);
                for (const k in elements) {
                    if (Object.hasOwnProperty.call(elements, k)) {
                        const elt = elements[k];
                        elementsMap.push(mapCell(elt));
                    }
                }
                ws_data.push(elementsMap);
            }
            let ws = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[sheatName] = ws

            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), sheatName + '.xlsx');

            // managers.getManagerOf("Eleve").save('/php/save.php', eleves, httpRequest);
        }

        this.exportXSLBySheetGroupTMP = function () {
            console.log("Debut de l'estimation des groupes");
            let groups = this.groupLignesByColumnNotResume(colGroupName);
            console.log("Fin de l'estimation des groupes : " + groups.length);
            // console.log(colIndex);
            if (colsNameRead.length < 1) {
                colsNameRead = this.getColonnes();
            }

            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            for (let i = 0; i < groups.length; i++) {
                const
                    groupName = groups[i].keyValue,
                    sheatName = groupName;
                console.log("Traitement du groupe : " + (groups.length - i));

                wb.SheetNames.push(sheatName);
                var
                    propertiesLabels = colsNameRead,
                    ws_data = [];  //a row with 2 columns

                ws_data.push(propertiesLabels);
                for (let j = 0; j < groups[i].group.length; j++) {
                    const lignElements = groups[i].group[j];
                    let lignElementsRead = [];

                    for (let k = 0; k < colsNameRead.length; k++) {
                        const
                            colName = colsNameRead[k],
                            colIndex = this.getColIndex(colName);

                        lignElementsRead.push(lignElements[colIndex]);
                    }
                    ws_data.push(lignElementsRead);
                }
                // console.log(groups[i].group);
                let ws = XLSX.utils.aoa_to_sheet(ws_data);
                wb.Sheets[sheatName] = ws;
            }

            this.exportFileXSL(wb, fileNameExport);
        }

        this.exportXSLBySheetGroup = function (colGroupName, colsNameRead = [], fileNameExport = 'file group', recap = true, validators = {}) {
            let
                dataConfigXslSchemes = [],
                indexCol = this.getColIndex(colGroupName),
                keyValues = this._groupIndexColsNames[indexCol];

            for (const key in keyValues) {
                if (Object.hasOwnProperty.call(keyValues, key)) {
                    const value = keyValues[key];
                    // console.log(matiere);
                    const dataConfigXslLocal = {
                        "config": {
                            "validators": validators,
                            "accumulator": function (nbre, somme) {
                                return "";
                            },
                            "label": "SYNTH GROUPE : " + value
                        },
                        "colonnesShow": colsNameRead,
                        "colonnesResume": [],
                        "title": "groupe: " + value
                    };
                    // console.log(dataConfigXslLocal);
                    dataConfigXslLocal["config"]["validators"][colGroupName] = [
                        function (val) {
                            return val == value;
                        }
                    ];
                    dataConfigXslSchemes = dataConfigXslSchemes.concat(dataConfigXslLocal);
                }
            }

            let dataConfigXsl = this.getConfigGroupExportSchemes(dataConfigXslSchemes, function (resume, result) {
                // console.log(resume);
                return resume;
            }, 'FIN GLOBAL', recap);
            this.exportFileXSL(dataConfigXsl, fileNameExport);
        }

        this.exportXSLBySheetGroupSum = function (colGroupName, colsNameRead = [], fileNameExport = 'file group') {
            let
                dataConfigXslSchemes = [],
                indexCol = this.getColIndex(colGroupName),
                keyValues = this._groupIndexColsNames[indexCol];

            for (const key in keyValues) {
                if (Object.hasOwnProperty.call(keyValues, key)) {
                    const value = keyValues[key];
                    // console.log(matiere);
                    const dataConfigXslLocal = {
                        "config": {
                            "validators": {},
                            "accumulator": function (nbre, somme) {
                                if (nbre == null) {
                                    return somme;
                                }

                                if (somme == null) {
                                    return nbre;
                                }

                                return nbre + somme;
                            },
                            "label": "SYNTH GROUPE : " + value
                        },
                        "colonnesShow": colsNameRead,
                        "colonnesResume": [],
                        "title": "groupe: " + value
                    };
                    // console.log(dataConfigXslLocal);
                    dataConfigXslLocal["config"]["validators"][colGroupName] = [
                        function (val) {
                            return val == value;
                        }
                    ];
                    dataConfigXslSchemes = dataConfigXslSchemes.concat(dataConfigXslLocal);
                }
            }

            let dataConfigXsl = this.getConfigGroupExportSchemes(dataConfigXslSchemes, function (resume, result) {
                // console.log(resume);
                return resume;
            }, 'FIN GLOBAL');
            this.exportFileXSL(dataConfigXsl, fileNameExport);
        }

        this.exportGroupValuesCols = function (colsNames, title = "recap vals groups") {
            let
                maxLength = 0,
                content = [];
            // console.log(this);
            for (let k = 0; k < colsNames.length; k++) {
                const
                    colName = colsNames[k],
                    colIndex = this.getColIndex(colName),
                    keyValues = this._groupIndexColsNames[colIndex];

                console.log("knowledge for Data " + colName);
                let contentRow = [];

                if (keyValues != undefined) {
                    for (let i = 0; i < keyValues.length; i++) {
                        const val = keyValues[i];
                        contentRow.push(val);
                    }

                    if (keyValues.length > maxLength) {
                        maxLength = keyValues.length;
                    }
                }

                content.push(contentRow);
            }

            let ws_data = Array(maxLength + 1);
            for (let j = 0; j < maxLength + 1; j++) {
                ws_data[j] = Array(colsNames.length);
            }

            console.log("Start intégration...");
            for (let i = 0; i < colsNames.length; i++) {
                ws_data[0][i] = colsNames[i];
                console.log("knowledge for Data " + colsNames[i]);

                for (let j = 1; j < content[i].length + 1; j++) {
                    ws_data[j][i] = content[i][j - 1];
                }
            }

            this.exportFileXSL(ws_data, title);
        }

        this.exportGroupValuesColsPreserveKnowledge = function (knowledge, colsNames, title = "recap vals groups") {
            let
                maxLength = 0,
                content = [];
            // console.log(this);
            for (let k = 0; k < colsNames.length; k++) {
                const
                    colName = colsNames[k],
                    colIndex = this.getColIndex(colName),
                    keyValues = this._groupIndexColsNames[colIndex];

                console.log("knowledge for Data " + colName);
                let
                    contentRow = [],
                    whiteremove = [];

                if (keyValues != undefined) {
                    for (let i = 0; i < keyValues.length; i++) {
                        const
                            val = keyValues[i],
                            valProper = knowledge.properObservation(val),
                            valProperCheck = knowledge.containProperObservationInList(valProper, whiteremove);

                        if (valProperCheck === false) {
                            contentRow.push(val);
                            whiteremove.push(valProper);
                        }
                    }

                    if (keyValues.length > maxLength) {
                        maxLength = keyValues.length;
                    }
                }

                content.push(contentRow);
            }
            console.log("Update export");

            let ws_data = Array(maxLength + 1);
            for (let j = 0; j < maxLength + 1; j++) {
                ws_data[j] = Array(colsNames.length);
            }

            console.log("Start intégration...");
            for (let i = 0; i < colsNames.length; i++) {
                ws_data[0][i] = colsNames[i];
                console.log("knowledge for Data " + colsNames[i]);

                for (let j = 1; j < content[i].length + 1; j++) {
                    ws_data[j][i] = content[i][j - 1];
                }

            }

            console.log("Start export...");
            this.exportFileXSL(ws_data, title);
        }

        this.getConfigExport = function (title = "Label Config", ligneH = "Head") {
            var
                propertiesLabels = this.getColonnes(),
                dataReadH = this.getLignes(),
                ws_data = [];  //a row with 2 columns

            ws_data.push([title]);
            ws_data.push([]);

            propertiesLabels.unshift(ligneH);
            ws_data.push(propertiesLabels);
            // console.log(schools);
            for (let j = 0; j < dataReadH.length; j++) {
                const
                    lignName = dataReadH[j],
                    elements = this.getElementsLigne(lignName);

                elements.unshift(lignName);
                ws_data.push(elements);
            }
            ws_data.push([]);

            return ws_data;
        }

        this.getConfigGroupExport = function (config, colonnesShow, title = "Label Config") {
            let
                ws_data = this.getConfigGroupExportHeaders(config, title);
            // console.log(elementResume)
            ws_data.push(["LISTE"]);
            ws_data.push(colonnesShow);

            for (const keyP in points) {
                if (Object.hasOwnProperty.call(points, keyP)) {
                    const point = points[keyP];
                    if (ligneRead[point.indexRow] == undefined) {
                        ligneRead[point.indexRow] = true;
                        let contentLigne = this.getElementsLigneInIndexWithCols(point.indexRow, colonnesShow);

                        if (contentLigne[1]) {
                            ws_data.push(contentLigne);
                        }
                    }
                }
            }
            // groupLignesByColumnWhitAccumulator
            // console.log(ws_data);
            return ws_data;
        }

        this.getConfigGroupResume = function (configScheme) {
            // console.log(configScheme);
            // console.log(configScheme["config"]);
            let
                validators = configScheme["config"]["validators"],
                // ligneRead = {},
                points = this._getPointsWithColValidators(validators),
                resume = this._iteratorAccumulator(points, configScheme["config"]["accumulator"]);

            // console.log(this._iteratorAccumulator(points, config["accumulator"], "Ligne"));
            // console.log(config);
            console.log(resume);
            let elementResume = this.getElementsColonnesIndexsDoubleEntries(configScheme["colonnesResume"], resume);
            // console.log(this.getElementsLignesIndexsDoubleEntries(colonnesResume, this._iteratorAccumulator(points, config["accumulator"]), "Ligne"));
            // console.log(resume);
            return elementResume;
        }

        this.getConfigGroupExportHeaders = function (configScheme) {
            let ws_data = [];  //a row with 2 columns
            ws_data.push([configScheme["title"]]);
            // ws_data.push([]);

            let elementResume = this.getConfigGroupResume(configScheme);
            // console.log(this.getElementsLignesIndexsDoubleEntries(colonnesResume, this._iteratorAccumulator(points, config["accumulator"]), "Ligne"));
            ws_data.push(elementResume[0]);
            ws_data.push(elementResume[1]);
            // ws_data.push(resume);
            // console.log(resume);
            return ws_data;
        }

        this.getConfigGroupExportHeadersLignesResumes = function (config, colonnesShow, colonnesResume, title = "Label Config") {
            let ws_data = [];  //a row with 2 columns
            ws_data.push([title, "Effectif"]);

            let
                validators = config["validators"],
                ligneRead = {},
                points = this._getPointsWithColValidatorsStrict(validators),
                resume = this._iteratorAccumulator(points, config["accumulator"], "Ligne");

            ws_data.push([config["label"], Object.keys(resume).length]);
            // let elementResume = this.getElementsColonnesIndexsDoubleEntries(colonnesResume, resume);
            // ws_data.push(colonnesShow);
            // console.log(points);
            // console.log(resume);
            // ws_data.push(Object.values(resume));
            // ws_data.push(elementResume[1]);
            // ws_data.push(resume);
            // console.log(resume);
            return ws_data;
        }

        this.getConfigGroupExportSchemes = function (configSchemes, resumer, title = "Label Global Resume", recap = true) {
            let
                ws_data = [],
                resume = null,
                ws_data_title = [],
                ws_data_list = [];  //a row with 2 columnsfgffh

            ws_data.push([title]);
            for (const keyC in configSchemes) {
                if (Object.hasOwnProperty.call(configSchemes, keyC)) {
                    const
                        configS = configSchemes[keyC],
                        data = this.getConfigGroupExport(configS["config"], configS["colonnesShow"], configS["title"]);
                    let
                        localResumeT = data[1],
                        localResumeH = data[2],
                        localResumeData = data[3],
                        localList = data.slice(5);
                    // localList = data.slice(configS["colonnesResume"].length);
                    // console.log(data);
                    if (recap) {
                        ws_data.push(localResumeT);
                        ws_data.push(localResumeH);
                        ws_data.push(localResumeData);
                    }
                    ws_data_title.push(localResumeT);
                    resume = resumer([localResumeH, localResumeData], resume);
                    // ws_data_list = ws_data_list.concat(localList);
                    ws_data_list.push(localList);
                }
            }

            if (recap) {
                ws_data_list.push(resume);
            }
            ws_data.push(["GLOBAL LIST"]);

            for (let i = 0; i < ws_data_title.length; i++) {
                const local_title = ws_data_title[i];

                ws_data.push([]);
                ws_data.push(local_title);
                ws_data = ws_data.concat(ws_data_list[i]);
            }

            return ws_data;
        }

        this.getConfigGroupExportSchemesHeaders = function (configSchemes, title = "Label Global Resume") {
            let ws_data = [];  //a row with 2 columns

            ws_data.push([title]);
            for (const keyC in configSchemes) {
                if (Object.hasOwnProperty.call(configSchemes, keyC)) {
                    const
                        configS = configSchemes[keyC],
                        dataHeader = this.getConfigGroupExportHeaders(configS);
                    // dataHeader = this.getConfigGroupExportHeaders(configS["config"], configS["colonnesResume"], configS["title"]);

                    // localList = data.slice(configS["colonnesResume"].length);
                    // console.log(data);

                    ws_data.push(dataHeader);
                }
            }

            return ws_data;
        }

        this.getConfigGroupExportSchemesHeadersLignes = function (configSchemes, title = "Label Global Resume") {
            let
                total = 0,
                ws_data = [];  //a row with 2 columns

            // ws_data.push([title]);
            for (const keyC in configSchemes) {
                if (Object.hasOwnProperty.call(configSchemes, keyC)) {
                    const
                        configS = configSchemes[keyC],
                        dataHeader = this.getConfigGroupExportHeadersLignesResumes(configS["config"], configS["colonnesShow"], configS["colonnesResume"], configS["title"]);

                    // localList = data.slice(configS["colonnesResume"].length);
                    // console.log(data);
                    total += dataHeader[1][1];
                    ws_data = ws_data.concat(dataHeader);
                }
            }
            ws_data.unshift([title, total]);
            return ws_data;
        }

        this.getConfigSchemeGroup = function (columnName, accumulator) {
            let
                dataConfigXslSchemes = [],
                indexCol = this.getColIndex(columnName),
                keyValues = this._groupIndexColsNames[indexCol];

            for (const key in keyValues) {
                if (Object.hasOwnProperty.call(keyValues, key)) {
                    const groupVal = keyValues[key];
                    // console.log(matiere);
                    let dataConfigXslLocal = {
                        "config": {
                            "validators": {
                                columnName: [
                                    function (val) {
                                        return val == groupVal;
                                    }
                                ]
                            },
                            "accumulator": accumulator,
                            "label": groupVal
                        },
                        "colonnesShow": [],
                        "colonnesResume": this.getColonnes(),
                        "title": "data synth : "
                    };

                    // let colValidator = {};
                    // colValidator[columnName] = [
                    //     function (val) {
                    //         return val == groupVal;
                    //     }
                    // ];
                    // dataConfigXslLocal["config"]["validators"] = colValidator;
                    dataConfigXslSchemes = dataConfigXslSchemes.concat(dataConfigXslLocal);
                }
            }
            // console.log(dataConfigXslSchemes);
            return dataConfigXslSchemes;
        }

        this.fusionCols = function (col1, col2) {
            var
                col1Elemenst = this.getElementsColonne(col1),
                col2Elemenst = this.getElementsColonne(col2);

            return this._fusion(col1Elemenst, col2Elemenst);
        }

        this.fusionLignes = function (ligne1, ligne2) {
            var
                col1Elemenst = this.getElementsLigne(ligne1),
                col2Elemenst = this.getElementsLigne(ligne2);

            return this._fusion(col1Elemenst, col2Elemenst);
        }

        this.initFromTab = function (tab) {

            for (const rowName in tab) {
                if (Object.hasOwnProperty.call(tab, rowName)) {
                    const rowData = tab[rowName];

                    for (const colName in rowData) {

                        if (Object.hasOwnProperty.call(rowData, colName)) {
                            const element = rowData[colName];
                            this.setElement(element, colName, rowName);
                        }

                    }
                }

            }

        }

        this.setElement = function (elementT, colName, ligneName) {
            if (elementT == null) { return };
            let elementExist = this.elementExist(colName, ligneName);

            var
                indexCol = this.getColIndex(colName),
                indexLigne = this.getLigneIndex(ligneName);
            // console.log(indexCol + " _ " + colName);

            if (!this.elements.has(indexLigne)) {
                this.elements.set(indexLigne, new Map());
            }
            // console.log(elementT);
            if (elementExist) {
                let elementOld = this.getElementIndex(indexCol, indexLigne);
                this.__updateBuildIndex(indexCol, indexLigne, elementOld);
            }
            // let element = elementT.trim().replace(/\s+/g, ' ');
            let element = elementT;
            // console.log(indexLigne + " index_col " + indexCol);
            // console.log(this);
            this.elements.get(indexLigne).set(indexCol, element);
            this.colonnesTypes[indexCol] = typeof element;
            this._addGroupValColName(indexCol, element);
            this.__buildIndex(indexCol, indexLigne, element);
            // this.setColLabel(colName, colName);
            // console.log(this);
        }

        this.setElementIndex = function (elementT, colIndex, ligneIndex) {
            if (elementT == null) return;
            var
                indexCol = colIndex,
                indexLigne = ligneIndex;
            // console.log(indexCol + " _ " + colName);
            if (!this.elements.has(indexLigne)) {
                this.elements.set(indexLigne, new Map());
            }
            // console.log(indexLigne + " index_col " + indexCol);
            let elementExist = this.elementExist(colName, ligneName);
            // console.log(this);
            if (elementExist) {
                let elementOld = this.getElementIndex(indexCol, indexLigne);
                this.__updateBuildIndex(indexCol, indexLigne, elementOld);
            }
            // let element = elementT.trim().replace(/\s+/g, ' ');
            let element = elementT;
            this.elements.get(indexLigne).set(indexCol, element);
            this.colonnesTypes[indexCol] = typeof element;
            // console.log(this);
        }

        this.getElement = function (colName, ligneName) {
            var
                indexCol = this.getColIndex(colName),
                indexLigne = this.getLigneIndex(ligneName);
            // console.log(indexCol);
            // console.log(indexLigne);
            if (this.elements.has(indexLigne) && this.elements.get(indexLigne).has(indexCol)) {
                return this.elements.get(indexLigne).get(indexCol);
            }
            return null;
        }

        this.elementExist = function (colName, ligneName) {
            var
                indexCol = this.colonnes.indexOf(colName),
                indexLigne = this.lignes.indexOf(ligneName);
            // console.log(indexCol);
            // console.log(indexLigne);
            return indexCol == -1 && indexLigne == -1;
        }

        this.elementIndexsExist = function (indexCol, indexLigne) {
            return indexCol == -1 && indexLigne == -1;
        }

        this.getElementIndex = function (indexCol, indexLigne) {
            // console.log(indexCol);
            // console.log(indexLigne);
            if (this.elements.has(indexLigne) && this.elements.get(indexLigne).has(indexCol)) {
                return this.elements.get(indexLigne).get(indexCol);
            }
            return null;
        }

        this.getDataSet = function () {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                let resultR = [];

                for (let indexC = 0; indexC < this.colonnes.length; indexC++) {

                    const element = this.getElement(this.colonnes[indexC], this.lignes[index]);
                    resultR.push(element);

                }
                result.push(resultR);
            }

            return result;
        }

        this.getDataSetForm = function (colonnes) {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                let resultR = [];

                for (let indexC = 0; indexC < colonnes.length; indexC++) {

                    const element = this.getElement(colonnes[indexC], this.lignes[index]);
                    resultR.push(element);

                }
                result.push(resultR);
            }

            return result;
        }

        this.getMatriceWithCols = function (cols = []) {
            let matrice = new tools.Library.Stats.Matrice();
            // console.log(colIndex);
            for (let i = 0; i < cols.length; i++) {
                const colName = cols[i];
                for (let index = 0; index < this.lignes.length; index++) {
                    // const indexLigne = this.getLigneIndex(this.lignes[index]);
                    let element = this.getElement(colName, this.lignes[index]);
                    matrice.setElement(element, colName, this.lignes[index]);
                }
            }

            return matrice;
        }

        this.getMatriceWithColsDerive = function (cols = [], derives = {}) {
            let matrice = new tools.Library.Stats.Matrice();
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                // const indexLigne = this.getLigneIndex(this.lignes[index]);
                let collect = [];

                for (let i = 0; i < cols.length; i++) {
                    const colName = cols[i];
                    let element = this.getElement(colName, this.lignes[index]);

                    matrice.setElement(element, colName, this.lignes[index]);
                    collect.push(element);
                }

                for (const colNameDerive in derives) {
                    if (Object.hasOwnProperty.call(derives, colNameDerive)) {
                        const colNameFuncDerive = derives[colNameDerive];
                        matrice.setElement(colNameFuncDerive(element, collect, this.lignes[index]), colNameDerive, this.lignes[index]);
                    }
                }
            }

            return matrice;
        }

        /**
         ** Retourne une matrice dont les les lignes sont le resumé des lignes groupés
         */
        this.getMatriceGroupByCol = function (colGroupName, colsNameRead = []) {
            var
                matrice = new tools.Library.Stats.Matrice(),
                groups = this.groupLignesByColumn(colGroupName);
            // console.log(colIndex);
            if (colsNameRead.length < 1) {
                colsNameRead = this.getColonnes();
            }

            for (let i = 0; i < groups.length; i++) {
                const groupName = groups[i].keyValue;
                // matrice.setElement(groupName, "Groupe", i);

                for (let j = 0; j < colsNameRead.length; j++) {
                    const
                        colName = colsNameRead[j],
                        colIndex = this.getColIndex(colName),
                        valGroup = groups[i].group[colIndex];

                    matrice.setElement(valGroup, colName, groupName);
                }
            }

            return matrice;
        }

        this.getMatriceDecomposedFromCols = function (stop_word_removed, colsNames = [], validator, separator = " ") {
            let matrice = new tools.Library.Stats.Matrice();
            // console.log(this.getLignes());
            if (colsNames.length < 1) {
                colsNames = this.getColonnes();
            }

            for (let i = 0; i < colsNames.length; i++) {
                const
                    colName = colsNames[i],
                    colElements = this.getElementsColonne(colName);
                // matrice.setElement(groupName, "Groupe", i);
                for (const indexLign in colElements) {
                    if (Object.hasOwnProperty.call(colElements, indexLign)) {
                        const
                            colContent = stop_word_removed(colElements[indexLign]),
                            colParts = colContent.split(separator);

                        for (let j = 0; j < colParts.length; j++) {
                            const part = colParts[j];
                            if (validator(part)) {
                                // console.log(indexLign);
                                matrice.setElement(part, colName + "_Part" + j, this.getLignes()[indexLign]);
                            }
                        }

                    }
                }

            }

            // console.log(matrice.getLignes());
            return matrice;
        }

        this.includeMatriceDecomposedToCol = function (matrice, colName, separator = " ") {
            let lignsNames = matrice.getLignes();

            for (let j = 0; j < lignsNames.length; j++) {
                const
                    lignName = lignsNames[j],
                    elements = matrice.getElementsLigne(lignName);

                let content = "";
                for (let k = 0; k < elements.length; k++) {
                    const elt = elements[k];
                    if (elt) {
                        content += elt.trim() + separator;
                    }
                }
                this.setElement(content, colName, lignName);
                // this.setElement(elements.join(separator), colName, lignName);
            }
        }

        this.includeMatriceDecomposedCols = function (matrice, colsNames) {
            let lignsNames = matrice.getLignes();

            for (let i = 0; i < colsNames.length; i++) {
                const
                    colName = colsNames[i],
                    elements = matrice.getElementsColonne(colName);

                for (const indexLign in elements) {
                    if (Object.hasOwnProperty.call(elements, indexLign)) {
                        const lignElement = elements[indexLign];
                        this.setElement(lignElement, colName, lignsNames[indexLign]);
                    }
                }

            }
        }

        this.getElementsColonne = function (colName) {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                const indexLigne = this.getLigneIndex(this.lignes[index]);
                result[indexLigne] = this.getElement(colName, this.lignes[index]);
            }

            return result;
        }

        this.getElementsColonneWithLignIndex = function (colName) {
            let result = {};
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                const indexLigne = this.lignes[index];
                result[indexLigne] = this.getElement(colName, this.lignes[index]);
            }

            return result;
        }

        this.getElementsColonneIndex = function (colIndex) {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < this.lignes.length; index++) {
                const indexLigne = this.getLigneIndex(this.lignes[index]);
                result[indexLigne] = this.getElementIndex(colIndex, indexLigne);
            }

            return result;
        }

        this.getElementsColonneInLignes = function (colIndex, lignesElements) {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < lignesElements.length; index++) {
                const ligneElements = lignesElements[index];
                result[index] = ligneElements[colIndex];
            }

            return result;
        }

        this.getElementsColonneIndexs = function (colName, indexs = []) {
            let result = [];
            // console.log(colIndex);
            for (let index = 0; index < indexs.length; index++) {
                const indexLigne = this.getLigneIndex(indexs[index]);
                result[indexLigne] = this.getElement(colName, indexs[index]);
            }

            return result;
        }

        this.getElementsColonnesIndexsDoubleEntries = function (colsNames, lignesElements = [] || {}) {
            let result = [[], []];
            // console.log(colIndex);

            for (const keyJ in colsNames) {
                if (Object.hasOwnProperty.call(colsNames, keyJ) && this.colIndexExist(colsNames[keyJ])) {
                    // if (Object.hasOwnProperty.call(colsNames, keyJ) && key == this.getColIndex(colsNames[keyJ])) {
                    let key = this.getColIndex(colsNames[keyJ]);
                    const colonneResume = colsNames[keyJ];
                    // for (const key in lignesElements) {
                    if (Object.hasOwnProperty.call(lignesElements, key)) {
                        const element = lignesElements[key];

                        result[0].push(colonneResume);
                        result[1].push(element);
                    }
                    // else{
                    //     result[0].push(colsNames[keyJ]);
                    //     result[1].push("");
                    // }
                    // }
                }
            }

            return result;
        }

        this.getElementsLignesIndexsDoubleEntries = function (colsNames, lignesElements = [] || {}) {
            let result = [[], []];
            // console.log(colIndex);
            for (const keyJ in colsNames) {
                if (Object.hasOwnProperty.call(colsNames, keyJ)) {
                    const colonneResume = colsNames[keyJ];

                    for (const key in lignesElements) {
                        if (Object.hasOwnProperty.call(lignesElements, key)) {
                            const element = lignesElements[key];

                            result[0].push(colonneResume);
                            result[1].push(element);
                        }
                        // else{
                        //     result[0].push(colsNames[keyJ]);
                        //     result[1].push("");
                        // }
                    }
                }
            }

            return result;
        }

        this.getElementsLigne = function (ligneName) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.colonnes.length; i++) {
                const colName = this.colonnes[i];
                result.push(this.getElement(colName, ligneName));
            }
            // console.log(result);
            return result;
        }

        this.getElementsLigneInIndex = function (ligneIndex) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.colonnes.length; i++) {
                const colIndex = this.getColIndex(this.colonnes[i]);
                result.push(this.getElementIndex(colIndex, ligneIndex));
            }
            // console.log(result);
            return result;
        }

        this.getElementsLigneInIndexWithCols = function (ligneIndex, colsNames) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < colsNames.length; i++) {
                const colIndex = this.getColIndex(colsNames[i]);
                result.push(this.getElementIndex(colIndex, ligneIndex));
            }
            // console.log(result);
            return result;
        }

        this.getOrdererElementsLigneIndexInCol = function (colsName, ordererFunct) {
            let
                result = [],
                values = ordererFunct(this.getColsValuesGroupForColName(colsName)),
                colIndex = this.getColIndex(colsName);
            // console.log(ligneContentKeys);
            for (const key in values) {
                if (Object.hasOwnProperty.call(values, key)) {
                    const
                        val = values[key],
                        indexRows = this.getLignesIndexHaveValue(val, colIndex);

                    result = result.concat(indexRows);
                }
            }

            // console.log(result);
            return result;
        }

        this.getOrdererElementsLigneInCol = function (colsName, ordererFunct) {
            // console.log(result);
            return this.getElementsLigneIndexs(this.getOrdererElementsLigneIndexInCol(colsName, ordererFunct));
        }

        this.getElementsLigneMapInIndex = function (ligneIndex) {
            let result = {};
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.colonnes.length; i++) {
                const colIndex = this.getColIndex(this.colonnes[i]);
                result[this.colonnes[i]] = this.getElementIndex(colIndex, ligneIndex);
            }
            // console.log(result);
            return result;
        }

        this.getElementsLigneMap = function (ligneName) {
            let result = {};
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.colonnes.length; i++) {
                const colName = this.colonnes[i];
                result[colName] = this.getElement(colName, ligneName);
            }
            // console.log(result);
            return result;
        }

        this.getElementsLignesMapFormatter = function (formatter) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.getLignes().length; i++) {
                // const lignName = this.lignes[i];
                result.push(formatter(this.getElementsLigneMap(this.getLignes()[i])));
            }
            // console.log(result);
            return result;
        }

        this.getElementsLigneIndexs = function (indexs = []) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < indexs.length; i++) {
                const ligneIndex = indexs[i];
                result.push(this.getElementsLigneInIndex(ligneIndex));
            }
            // console.log(result);
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexHaveValue = function (value, indexCol) {
            let result = [];
            const indexs = this._get_buildIndexContent(value);
            // console.log(indexs);
            if (indexs != undefined) {
                for (const key in indexs) {
                    if (Object.hasOwnProperty.call(indexs, key) && indexs[key].indexCol == indexCol) {
                        const indexsRowCol = indexs[key];
                        result.unshift(indexsRowCol.indexRow);
                    }
                }
            } else {
                console.log("Valeur non défini dans la matrice: " + value);
            }
            // console.log(result);
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexHaveValueFuzzySearch = function (value, indexCol) {
            let resultd = [];
            const indexs = this._get_buildIndexContentFuzzy(value);
            console.log(indexs);
            let resultds = {};
            for (const key_add in this._buildIndexContent) {
                if (Object.hasOwnProperty.call(this._buildIndexContent, key_add)) {
                    const element = this._buildIndexContent[key_add];
                    // console.log(similarity(val, key_add));
                    if (similarity(valL, key_add) < sensibility) {
                        // console.log(element);
                        result = { ...result, ...element };
                        // console.log(result);
                    }
                }
            }
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexHaveValueWithSimilarity = function (value, indexCol, sensibility) {
            let valueL = '';
            if (value !== undefined) {
                valueL = value.toString().replace(/ /gi, '');
            }
            let result = [], manager = new tools.Library.Knowledge.Managers("");
            const indexs = this._get_buildIndexContent(valueL, manager.levenshteinDistance, sensibility);
            // console.log(indexs);
            if (indexs != undefined) {
                for (const key in indexs) {
                    if (Object.hasOwnProperty.call(indexs, key) && indexs[key].indexCol == indexCol) {
                        const indexsRowCol = indexs[key];
                        result.unshift(indexsRowCol.indexRow);
                    }
                }
            } else {
                console.log("Valeur non défini dans la matrice: " + valueL);
            }
            // console.log(result);
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexsIncludeValue = function (value, indexCol) {
            // console.log(value);
            let values = [];
            if (value !== undefined) {
                values = value.toString().split(" ");
            }

            let
                result = [], sensibility = 2,
                distance = function (a, b) {
                    if (b.toUpperCase().search(a.toUpperCase()) !== -1) {
                        return 1;
                    }
                    return 4;
                };
            // this._getIndexRowsColsHaveSameIndexRow(indexColsRows1, indexColsRow2)
            let indexResults = null, valuesLength = values.length;
            for (const key in values) {
                if (Object.hasOwnProperty.call(values, key)) {
                    const
                        value = values[key],
                        indexs = this._get_buildIndexContent(value, distance, sensibility);

                    if (indexs != undefined) {
                        if (indexResults == null) {
                            indexResults = indexs;
                        }
                        // console.log(indexResults);
                        let indexResultsTmp = this._getIndexRowsColsHaveSameIndexRow(indexResults, indexs);
                        // console.log(indexResultsTmp);

                        if (Object.keys(indexResultsTmp).length == 0 || (--valuesLength) == 0) {
                            // console.log("indexResultsTmp");

                            for (const key in indexResults) {
                                if (Object.hasOwnProperty.call(indexResults, key) && indexResults[key].indexCol == indexCol) {
                                    const indexsRowCol = indexResults[key];
                                    result.unshift(indexsRowCol.indexRow);
                                }
                            }
                            return result;
                        }

                        indexResults = indexResultsTmp;

                    } else {
                        console.log("Valeur non défini dans la matrice: " + value);
                    }
                }
            }
            // console.log(result);
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexsHaveValueWithSimilarity = function (value, indexCols, sensibility) {
            let result1 = [];
            // console.log("kjkjksd");
            for (const key in indexCols) {
                if (Object.hasOwnProperty.call(indexCols, key)) {
                    const
                        indexCol = indexCols[key],
                        elements = this.getLignesIndexsIncludeValue(value, indexCol);
                    // result.unshift(indexsRowCol.indexRow);
                    if (elements.length != 0) {
                        // result1 = elements;
                        // break;
                        return elements;
                    }
                }
            }
            // console.log(indexCols);
            for (const key in indexCols) {
                if (Object.hasOwnProperty.call(indexCols, key)) {
                    const
                        indexCol = indexCols[key],
                        elements = this.getLignesIndexHaveValueWithSimilarity(value, indexCol, sensibility);
                    // result.unshift(indexsRowCol.indexRow);
                    // console.log(indexCol);
                    if (elements.length != 0) {
                        // return result1.filter(value => elements.includes(value));
                        return elements;
                    }
                }
            }
            // console.log(result);
            return result1;
        }
        /*
        * @return [indexsRowCol]
        */
        this.getLignesIndexColsHaveValue = function (value, indexCol) {
            let result = [];
            const indexs = this._get_buildIndexContent(value);

            if (indexs != undefined) {
                for (const key in indexs) {
                    if (Object.hasOwnProperty.call(indexs, key) && indexs[key].indexCol == indexCol) {
                        const indexsRowCol = indexs[key];
                        result.unshift(indexsRowCol);
                    }
                }
            } else {
                console.log("Valeur non défini dans la matrice: " + value);
            }
            // console.log(result);
            return result;
        }

        /*
        * @return [indexRow]
        */
        this.getLignesIndexHaveValues = function (values, indexCol) {
            let result = [];

            for (let i = 0; i < values.length; i++) {
                const
                    val = values[i],
                    lignesIndex = this.getLignesIndexHaveValue(val, indexCol);

                result = result.concat(lignesIndex);
            }
            // console.log(result);
            return result;
        }

        this.getColsValuesGroupForColsNames = function (colsNames) {
            let result, colsValuesGroup = {}, colGroupMinIndex = 0, colGroupMinLength = -1;
            // console.log(colsNames);
            for (let i = 1; i < colsNames.length; i++) {
                const
                    colName = colsNames[i],
                    colIndex = this.getColIndex(colName);

                colsValuesGroup[colIndex] = this._groupIndexColsNames[colIndex];
                // if (colGroupMinLength != -1 && colGroupMinLength > colsValuesGroup[colIndex].length) {
                // colGroupMinLength = colsValuesGroup[colIndex].length;
                // colGroupMinIndex = colIndex;
                // }
                // else if (colGroupMinLength == -1) {
                //     colGroupMinLength = colsValuesGroup[colIndex].length;
                //     colGroupMinIndex = colIndex;
                // }
            }
            // console.log(this.getColIndex(colsNames[0]));
            // console.log(this._groupIndexColsNames);

            // for (const key in colsValuesGroup) {
            //     if (Object.hasOwnProperty.call(colsValuesGroup, key) && key != colGroupMinIndex) {
            // const elt = colsValuesGroup[key];
            result = this._groupIndexColsNames[this.getColIndex(colsNames[0])];
            // console.log(result);
            //     }
            // }

            return [colsValuesGroup, { "elementsAxe": result, "indexColAxe": this.getColIndex(colsNames[0]) }];
        }

        this.getColsValuesGroupForColName = function (colName) {
            // console.log(result);
            const colIndex = this.getColIndex(colName);
            return this._groupIndexColsNames[colIndex];
        }

        this.getCellValuesForIndexsRows = function (indexRowsCols) {
            let result = [];

            for (const key in indexRowsCols) {
                if (Object.hasOwnProperty.call(indexRowsCols, key)) {
                    const val = indexRowsCols[key];
                    result.unshift(this.getElementIndex(val.indexCol, val.indexRow));
                }
            }

            return result;
        }

        this._getIndexRowsInRowIndex = function (rowIndew, indexsColsRows) {
            let result = [];
            // console.log(indexsColsRows);

            for (const key in indexsColsRows) {
                if (Object.hasOwnProperty.call(indexsColsRows, key)) {
                    const indexColRow = indexsColsRows[key];
                    // console.log(indexColRow.indexRow);
                    // console.log(rowIndew);
                    if (indexColRow.indexRow == rowIndew) {
                        result.unshift(indexColRow);
                    }
                }
            }

            return result;
        }
        /**
         * Retourne uniquement des éléments de lignes identiques
         * l1 -> r1 : l1 -> r2 (Valide)
         * ceci iterativement en correspondance entre indexColsRows1 et indexColsRow2
         * indexColsRows1 et indexColsRow2 representent les clés de cellules de 02 valeurs distinctes
         */
        this._getIndexRowsColsHaveSameIndexRow = function (indexColsRows1, indexColsRow2) {
            let result = {};

            for (const key in indexColsRow2) {
                if (Object.hasOwnProperty.call(indexColsRow2, key)) {
                    const
                        indexColRow2 = indexColsRow2[key],
                        indexsColsSameRows = this._getIndexRowsInRowIndex(indexColRow2.indexRow, indexColsRows1);

                    if (indexsColsSameRows.length) {
                        result[key] = indexColRow2;
                    }
                }
            }

            return result;
        }

        this._getCombineIndexRowsColsHaveSameIndexRow = function (indexColsRows1, indexColsRow2) {
            let result = {};

            for (const key in indexColsRows1) {
                if (Object.hasOwnProperty.call(indexColsRows1, key)) {
                    const
                        indexColRow = indexColsRows1[key],
                        indexsColsSameRows = this._getIndexRowsInRowIndex(indexColRow.indexRow, indexColsRow2);
                    // console.log(indexsColsSameRows);
                    if (indexsColsSameRows.length) {
                        indexsColsSameRows.unshift(indexColRow);
                        result[indexColRow.indexRow] = indexsColsSameRows;
                    }
                }
            }

            return result;
        }

        this._getIndexRowsColsHaveSameIndexRowForValue = function (valueGroup_axe, indexColGroup_axe, colsValuesGroup) {
            var
                result = {},
                valuesGroup_axeIndexColsRows = this.getIndexRowColsInContext(valueGroup_axe, indexColGroup_axe);
            // valuesGroup_axeIndexColsRows = this._buildIndexContent[valueGroup_axe];

            // delete colsValuesGroup.colGroupMinIndex;
            // console.log("colsValuesGroup");
            // console.log(valueGroup_axe);
            // console.log(valuesGroup_axeIndexColsRows);
            for (const colIndex in colsValuesGroup) {
                //Parcour des colonnes de groupes de valeurs excepté la colonne de valeurs de départ
                if (Object.hasOwnProperty.call(colsValuesGroup, colIndex)) {
                    const colsValuesGroup_check = colsValuesGroup[colIndex];
                    // console.log(colsValuesGroup_check);
                    // result[colIndex] = {};
                    for (const indexColGroup in colsValuesGroup_check) {
                        if (Object.hasOwnProperty.call(colsValuesGroup_check, indexColGroup)) {
                            const
                                valueGroup_check = colsValuesGroup_check[indexColGroup],
                                valuesGroup_checkIndexColsRows = this.getIndexRowColsInContext(valueGroup_check, colIndex);
                            // valuesGroup_checkIndexColsRows = this._buildIndexContent[valueGroup_check];

                            // console.log("valueGroup_check");
                            // console.log(valueGroup_check);
                            // console.log(valuesGroup_axeIndexColsRows);
                            // console.log(this.getCellValuesForIndexsRows(valuesGroup_axeIndexColsRows));
                            // console.log(valuesGroup_checkIndexColsRows);
                            // console.log(this.getCellValuesForIndexsRows(valuesGroup_checkIndexColsRows));
                            let indexColsRows = this._getIndexRowsColsHaveSameIndexRow(valuesGroup_axeIndexColsRows, valuesGroup_checkIndexColsRows);
                            // console.log("indexColsRows");
                            // console.log(indexColsRows);
                            // console.log(this.getCellValuesForIndexsRows(indexColsRows));
                            result[valueGroup_check] = indexColsRows;
                        }
                    }
                }
            }

            return result;
        }

        this._getIndexRowsColsHaveSameIndexRowForValueRecursively = function (valueGroup_axe, indexColGroup_axe, colsValuesGroup) {
            let colsIndexs = Object.keys(colsValuesGroup);
            // console.log("valueGroup_axe");
            // console.log(valueGroup_axe);
            // console.log(indexColGroup_axe);
            // console.log(colsValuesGroup);
            // valuesGroup_axeIndexColsRows = this._buildIndexContent[valueGroup_axe];
            if (colsIndexs.length) {
                // console.log(colsIndexs.length);
                if (colsIndexs.length == 1) {
                    return this._getIndexRowsColsHaveSameIndexRowForValue(valueGroup_axe, indexColGroup_axe, colsValuesGroup)
                }
                else {
                    var
                        colIndex = colsIndexs[0],
                        colsValuesGroup_check = colsValuesGroup[colIndex];
                    // let valuesGroup_axeIndexColsRows_tmp = { ...valuesGroup_axeIndexColsRows };
                    // console.log("valueGroup_axe");
                    // console.log(colsValuesGroup_check);
                    // console.log(colsValuesGroup);
                    let colsValuesGroup_tmp = { ...colsValuesGroup };
                    delete colsValuesGroup_tmp[colIndex];

                    let colsValuesGroup_descend = {};
                    colsValuesGroup_descend[colIndex] = colsValuesGroup_check;

                    var
                        indexColsRows_tmp = this._getIndexRowsColsHaveSameIndexRowForValueRecursively(valueGroup_axe, indexColGroup_axe, colsValuesGroup_tmp),
                        indexColsRows_tmp2 = this._getIndexRowsColsHaveSameIndexRowForValue(valueGroup_axe, indexColGroup_axe, colsValuesGroup_descend);

                    let indexColsRows = this._getIndexRowsColsHaveSameIndexRow(indexColsRows_tmp2, indexColsRows_tmp);
                    // console.log(indexColsRows_tmp);
                    // console.log(indexColsRows_tmp2);
                    // console.log(indexColsRows);
                    return indexColsRows;
                }
            }

            var
                valuesGroup_axeIndexColsRows = this.getIndexRowColsInContext(valueGroup_axe, indexColGroup_axe),
                result = {};

            // console.log(valuesGroup_axeIndexColsRows);
            result[valueGroup_axe] = valuesGroup_axeIndexColsRows;
            return result;
        }

        this.getLignesIndexHaveCombineValues = function (colsNames) {
            var
                result = {},
                colsValuesGroup_info = this.getColsValuesGroupForColsNames(colsNames),
                colsValuesGroup_axe = colsValuesGroup_info[1].elementsAxe,
                indexColGroup_axe = colsValuesGroup_info[1].indexColAxe;
            // console.log(colsNames);
            // console.log(colsValuesGroup_info);
            for (let i = 0; i < colsValuesGroup_axe.length; i++) {
                // console.log("valueGroup_axe");
                const
                    valueGroup_axe = colsValuesGroup_axe[i],
                    indexColsRowsSelect = this._getIndexRowsColsHaveSameIndexRowForValueRecursively(valueGroup_axe, indexColGroup_axe, colsValuesGroup_info[0]);

                // console.log("valueGroup_axe");
                // console.log(valueGroup_axe);
                // console.log(indexColGroup_axe);
                // console.log(indexColsRowsSelect);
                result[valueGroup_axe] = indexColsRowsSelect;
            }

            return result;
        }

        this.getBuildNodeIndexValueTree = function (colName) {
            let
                content = {},
                colIndex = this.getColIndex(colName),
                valuesUniqueInCol = this._groupIndexColsNames[colIndex];

            for (const indexValue in valuesUniqueInCol) {
                if (Object.hasOwnProperty.call(valuesUniqueInCol, indexValue)) {
                    const
                        uniqueValue = valuesUniqueInCol[indexValue],
                        valuesGroup_axeIndexColsRows = this.getIndexRowColsInContext(uniqueValue, colIndex);

                    content[uniqueValue] = valuesGroup_axeIndexColsRows;
                }
            }

            return content;
        }

        this.getNodeforLigneNodesIsNotEmptyChilds = function (ligneIndexRowCols) {
            for (const node in ligneIndexRowCols) {
                if (Object.hasOwnProperty.call(ligneIndexRowCols, node)) {
                    const indexColRows = ligneIndexRowCols[node];
                    if (Object.keys(indexColRows).length !== 0) {
                        return node;
                    }
                }
            }
            return false;
        }

        this.getRefreshTreeByNodeIndexValueCombine = function (tree, ligneNodes) {
            // let nodeChilld = this.getNodeforLigneNodesIsNotEmptyChilds(tree);

            if (Object.keys(tree).length) {
                let
                    result = {},
                    keys = Object.keys(tree),
                    firstKey = keys[0],
                    objetNext = tree[firstKey];

                // console.log(tree);
                if (objetNext["indexCol"] !== undefined) {
                    // Tree is ligne Nodes (leaf)
                    for (const node1 in ligneNodes) {
                        if (Object.hasOwnProperty.call(ligneNodes, node1)) {
                            const
                                subIndexColRows1 = ligneNodes[node1],
                                subIndexColRowsValide = this._getIndexRowsColsHaveSameIndexRow(tree, subIndexColRows1);

                            result[node1] = subIndexColRowsValide;
                        }
                    }

                    return result;
                }

                for (const node in tree) {
                    if (Object.hasOwnProperty.call(tree, node)) {
                        const
                            subTree = tree[node],
                            subTreeNodeIndexValueCombine = this.getRefreshTreeByNodeIndexValueCombine(subTree, ligneNodes);

                        result[node] = subTreeNodeIndexValueCombine;
                    }
                }

                return result;
            }

            if (Object.keys(tree).length == 0) {
                let result = {};

                for (const node1 in ligneNodes) {
                    if (Object.hasOwnProperty.call(ligneNodes, node1)) {

                        result[node1] = {};
                    }
                }

                return result;
            }

            return ligneNodes;
        }

        this.getLignesIndexHaveCombineValuesTrees = function (colsNames) {
            if (colsNames.length == 1) {
                return this.getBuildNodeIndexValueTree(colsNames[0]);
            }
            else if (colsNames.length > 1) {
                let colsNamesNext = colsNames.slice(1);

                let
                    result = {},
                    ligneNodes1 = this.getBuildNodeIndexValueTree(colsNames[0]),
                    ligneTree = this.getLignesIndexHaveCombineValuesTrees(colsNamesNext);
                // console.log("ligneNodes1");
                // console.log(ligneNodes1);
                // console.log(ligneTree);
                for (const node in ligneTree) {
                    if (Object.hasOwnProperty.call(ligneTree, node)) {
                        const
                            subTree = ligneTree[node],
                            indexValuesSubTree = this.getRefreshTreeByNodeIndexValueCombine(subTree, ligneNodes1);

                        result[node] = indexValuesSubTree;
                    }
                }
                // console.log(result);
                return result;
            }

            return {};
        }

        this.getColumnsHaveValues = function (values, indexLigne) {
            let result = [];
            // console.log(ligneContentKeys);
            for (let i = 0; i < this.colonnes.length; i++) {
                const eltsColumn = this.getElementsColonne(this.colonnes[i]);
                let select = false;

                for (let j = 0; j < values.length; j++) {
                    const val = values[j];
                    if (eltsColumn[indexLigne] == val) {
                        select = true;
                        break;
                    }
                }

                if (select) {
                    let colIndex = this.getColIndex(this.colonnes[i]);
                    result.unshift(colIndex);
                }
            }
            // console.log(result);
            return result;
        }

        this.getColIndex = function (colName) {
            if (!this.colonnes.includes(colName)) {
                this.colonnes.push(colName);
            }
            // console.log(this.colonnes.includes(colName));
            // console.log("size: " + this.colonnes.length);
            let pos = this.elementKey(this.colonnes, colName);
            return this.prefix + pos;
        }

        this.colIndexExist = function (colName) {
            if (!this.colonnes.includes(colName)) {
                return false;
            }
            // console.log(this.colonnes.includes(colName));
            // console.log("size: " + this.colonnes.length);
            return true;
        }

        this.getColsIndexs = function (names) {
            let result = [];
            // console.log(this.colsNote);

            for (let i = 0; i < names.length; i++) {
                const colName = names[i];
                // console.log(colName);
                // console.log(this.getColIndex(colName));
                result.push(this.getColIndex(colName));
            }
            // console.log(result);
            // console.log("result");
            return result;
        }

        this.getLigneIndex = function (ligneName) {
            if (!this.lignes.includes(ligneName)) {
                this.lignes.push(ligneName);
            }
            // return this.colonnes[ligneName];
            // console.log(ligneName + " <= " + this.elementKey(this.lignes, ligneName));
            return this.prefix + this.elementKey(this.lignes, ligneName);
        }

        this._fusion = function (elements1, elements2) {
            let result = [];

            for (let index = 0; index < elements1.length; index++) {
                const eltCol1 = elements2[index];
                const eltCol2 = elements1[index];
                result.push(eltCol1.add(eltCol2));
            }

            return result;
        }

        this._vectorToCellEntities = function (vector, f = 'add') {
            // console.log(vector);
            let result = vector.shift();
            // console.log(vector);
            for (let index = 0; index < vector.length; index++) {
                const element = vector[index];
                result = result[f](element);
                // result = result.add(element);
            }

            return result;
        }

        this._vectorToCell = function (vector, f = '+') {
            // console.log(vector);
            if (vector[0][f] == undefined) {
                // console.log("vector");
                let valD = tools.Library.ArrayUtility.acc(function (val) {
                    return val;
                }, vector, f);
                // console.log("vector");
                // console.log(valD);
                return valD;
            }
            return this._vectorToCellEntities(vector, f);
        }

        /*
        *Accumule en fonction de l'orientation voulue 
        *Colonne = pour l'accumulation par Colonne
        *Ligne = Pour l'acculumaltion par Ligne
        */
        this._iteratorAccumulator = function (indexColsRows, accumulators, direction = "Colonne") {
            let result = {};

            for (const key in indexColsRows) {
                if (Object.hasOwnProperty.call(indexColsRows, key)) {
                    const
                        indexColRow = indexColsRows[key],
                        colName = this.getColonnes()[indexColRow.indexCol],
                        val = this.getElementIndex(indexColRow.indexCol, indexColRow.indexRow);

                    // result = accumulator(val, result);
                    // console.log(indexColRow.indexRow);
                    let index = indexColRow.indexCol;
                    if (direction != "Colonne") {
                        index = indexColRow.indexRow;
                    }

                    if (result[index] == undefined) {
                        result[index] = null;
                    }
                    // console.log(typeof accumulators);
                    if (typeof accumulators == "object") {
                        if (accumulators[colName]) {
                            result[index] = accumulators[colName](val, result[index]);
                        } else {
                            if (accumulators["default"]) {
                                result[index] = accumulators["default"](val, result[index]);

                            }
                        }

                    } else if (typeof accumulators == "function") {
                        result[index] = accumulators(val, result[index]);

                    }
                }
            }
            // console.log(Object.keys(result));
            return result;
        }

        this._iterator = function (indexColsRows, map) {
            let result = [];

            for (const key in indexColsRows) {
                if (Object.hasOwnProperty.call(indexColsRows, key)) {
                    const
                        indexColRow = indexColsRows[key],
                        val = this.getElementIndex(indexColRow.indexCol, indexColRow.indexRow);

                    result.push(map(val));
                }
            }

            return result;
        }

        this._axePointsCollector = function (direction, indexAxe) {
            let
                result = [],
                opdirIndexs = Object.keys(this["get" + this._oppositeDirection(direction) + "s"]());

            for (const keyOp in opdirIndexs) {
                if (Object.hasOwnProperty.call(opdirIndexs, keyOp)) {
                    const opdirIndex = opdirIndexs[keyOp];
                    if (direction == "Colonne") {
                        result.push({ "indexRow": opdirIndex, "indexCol": indexAxe });
                    } else {
                        result.push({ "indexRow": indexAxe, "indexCol": opdirIndex });
                    }
                }
            }

            return result;
        }

        this._axePointsCollectorWithIndexAxeValidators = function (direction, indexAxeValidators) {
            let
                result = [],
                tmpResult = [];

            for (const key in indexAxeValidators) {
                if (Object.hasOwnProperty.call(indexAxeValidators, key)) {
                    const element = indexAxeValidators[key];
                    tmpResult = this._axePointsCollectorWithValidators(direction, indexAxeValidators.indexAxe, validators)
                }
            }

            return result;
        }

        this._axePointsCollectorWithValidators = function (direction, indexAxe, validators) {
            let
                result = [],
                opdirIndexs = Object.keys(this["get" + this._oppositeDirection(direction) + "s"]());
            // console.log(validators);
            for (const keyOp in opdirIndexs) {
                if (Object.hasOwnProperty.call(opdirIndexs, keyOp)) {
                    const opdirIndex = opdirIndexs[keyOp];
                    let point = null;

                    if (direction == "Colonne") {
                        point = { "indexRow": opdirIndex, "indexCol": indexAxe };
                    } else {
                        point = { "indexRow": indexAxe, "indexCol": opdirIndex };
                    }

                    let
                        val = this.getElementIndex(point.indexCol, point.indexRow),
                        savePoint = true;

                    // console.log(validators);
                    for (let i = 0; i < validators.length; i++) {
                        const validator = validators[i];
                        if (typeof validator != "function" || !validator(val)) {
                            savePoint = false;
                            break;
                        }
                    }

                    if (savePoint) {
                        result.push(point);
                    }
                }
            }

            return result;
        }

        this._getPointsWithColValidatorsStrict = function (validators) {
            let
                result = [], resultTMP = {},
                colsIndexs = Object.keys(this.getColonnes());

            for (const colName in validators) {
                if (Object.hasOwnProperty.call(validators, colName)) {
                    const validator = validators[colName];
                    // console.log(this.getColonnes()[this.getColIndex(colName)]);
                    resultTMP[colName] = this._axePointsCollectorWithValidators("Colonne", this.getColIndex(colName), validator);
                }
            }
            // console.log(resultTMP);

            for (const colName in resultTMP) {
                if (Object.hasOwnProperty.call(resultTMP, colName)) {
                    const points = resultTMP[colName];
                    // console.log(point);
                    for (const key in points) {
                        if (Object.hasOwnProperty.call(points, key)) {
                            const point = points[key];

                            for (const key in colsIndexs) {
                                if (Object.hasOwnProperty.call(colsIndexs, key)) {
                                    const colIndex = colsIndexs[key];
                                    // console.log(resultTMP);
                                    // console.log(validators);
                                    result.push({ "indexRow": point.indexRow, "indexCol": colIndex });
                                }
                            }
                        }
                    }
                }
            }

            return result;
        }

        this._getPointsWithColValidators = function (validators) {
            let
                result = [], resultTMP = {}, indexAxe = 0;
            // console.log(this.getColonnes());

            for (const colName in validators) {
                if (!Object.hasOwn(validators, colName)) continue;

                const
                    validator = validators[colName];

                if (this.colIndexExist(colName)) {
                    let colIndex = this.getColIndex(colName);
                    resultTMP[colIndex] = this._axePointsCollectorWithValidators("Colonne", colIndex, validator);
                    // console.log(resultTMP[colIndex]);
                    indexAxe = colIndex;
                }
            }

            // result = resultTMP[indexAxe];
            for (const key in resultTMP) {
                if (Object.hasOwnProperty.call(resultTMP, key) && key != indexAxe) {
                    const
                        points = resultTMP[key],
                        elements = this._getCombineIndexRowsColsHaveSameIndexRow(resultTMP[indexAxe], points);
                    // console.log(elements);
                    for (const keyJ in elements) {
                        if (Object.hasOwnProperty.call(elements, keyJ)) {
                            const element = elements[keyJ];
                            result = result.concat(element);
                        }
                    }
                    // console.log(result);
                }
            }

            return result.length == 0 ? resultTMP[indexAxe] : result;
        }

        this._getPointsWithColValidatorsTMP = function (validators) {
            let
                result = [], resultTMP = {}, indexAxe = 0,
                colIndexs = Object.keys(this.getColonnes());

            for (const keyOp in colIndexs) {
                if (Object.hasOwnProperty.call(colIndexs, keyOp)) {
                    const colIndex = colIndexs[keyOp];
                    // console.log(validators);
                    if (validators[this.getColonnes()[colIndex]] != undefined) {
                        indexAxe = colIndex;
                        // console.log(this.getColonnes()[colIndex]);
                        resultTMP[colIndex] = this._axePointsCollectorWithValidators("Colonne", colIndex, validators[this.getColonnes()[colIndex]])
                    }
                    // else {
                    //     // console.log(this._axePointsCollector("Colonne", colIndex));
                    //     resultTMP[colIndex] = this._axePointsCollector("Colonne", colIndex);
                    // }
                }
            }

            // result = resultTMP[indexAxe];
            for (const key in resultTMP) {
                if (Object.hasOwnProperty.call(resultTMP, key) && key != indexAxe) {
                    const
                        points = resultTMP[key],
                        elements = this._getCombineIndexRowsColsHaveSameIndexRow(resultTMP[indexAxe], points);
                    // console.log(elements);
                    for (const keyJ in elements) {
                        if (Object.hasOwnProperty.call(elements, keyJ)) {
                            const element = elements[keyJ];
                            result = result.concat(element);
                        }
                    }
                    // console.log(result);
                }
            }

            return result.length == 0 ? resultTMP[indexAxe] : result;
        }


        this._getPointsWithLignValidators = function (validators) {
            let
                result = [], resultTMP = {}, indexAxe = 0,
                lignIndexs = Object.keys(this.getLignes());

            for (const keyOp in lignIndexs) {
                if (Object.hasOwnProperty.call(lignIndexs, keyOp)) {
                    const lignIndex = lignIndexs[keyOp];
                    // console.log(validators);
                    if (validators[this.getLignes()[lignIndex]] != undefined) {
                        indexAxe = lignIndex;
                        // console.log(this.getColonnes()[colIndex]);
                        resultTMP[lignIndex] = this._axePointsCollectorWithValidators("Ligne", lignIndex, validators[this.getLignes()[lignIndex]]);
                    }
                    else {
                        // console.log(this._axePointsCollector("Colonne", colIndex));
                        resultTMP[colIndex] = this._axePointsCollector("Ligne", lignIndex);
                    }
                }
            }

            // result = resultTMP[indexAxe];
            for (const key in resultTMP) {
                if (Object.hasOwnProperty.call(resultTMP, key) && key != indexAxe) {
                    const
                        points = resultTMP[key],
                        elements = this._getCombineIndexRowsColsHaveSameIndexRow(resultTMP[indexAxe], points);
                    // console.log(elements);
                    for (const keyJ in elements) {
                        if (Object.hasOwnProperty.call(elements, keyJ)) {
                            const element = elements[keyJ];
                            result = result.concat(element);
                        }
                    }
                    // console.log(result);
                }
            }

            return result.length == 0 ? resultTMP[indexAxe] : result;
        }

        this._oppositeDirection = function (direction) {
            if (direction == "Colonne") return "Ligne";
            return "Colonne";
        }

        this.groupLignesByColumnWhitAccumulator = function (columnName, accumulator) {
            var
                result = {},
                indexCol = this.getColIndex(columnName),
                keyValues = this._groupIndexColsNames[indexCol];
            // console.log(keyValues);
            for (let j = 0; j < keyValues.length; j++) {
                const
                    key = keyValues[j],
                    points = this.getLignesIndexColsHaveValue(key, indexCol),
                    resumeColVal = this._iteratorAccumulator(points, accumulator);

                result[key] = resumeColVal[indexCol];
            }

            return result;
        }

        this.summerize = function () {
            let
                result = [];
            colsNames = this.getColonnes();

            for (let i = 0; i < colsNames.length; i++) {
                const
                    colName = colsNames[i]
                indexCol = this.getColIndex(colName);

                result[indexCol] = this.summerizeCol(indexCol);
            }

            return result;
        }

        this.summerizeCol = function (indexCol) {
            let
                points = this._axePointsCollector("Colonnes", indexCol),
                summer = this._iteratorAccumulator(points, function (val, sum) {
                    if (sum == null) {
                        return val;
                    }

                    if (val == null) {
                        return sum;
                    }

                    return val + sum;
                });

            return summer[indexCol];
        }

        this.elementKey = function (list, element) {
            for (const key in list) {
                if (Object.hasOwnProperty.call(list, key)) {
                    const elt = list[key];
                    if (elt == element) {
                        return key;
                    }
                }
            }
            return null;
        }

        // Operation
        this.add = function (matrice) {
            if (tools.Library.Stats.MatriceUtilitary.hasSameConfig(this, matrice)) {
                let matR = new tools.Library.Stats.Matrice();
                for (let i = 0; i < this.getLignes().length; i++) {
                    const ligneName = this.getLignes()[i];
                    for (let j = 0; j < this.getColonnes().length; j++) {
                        const colName = this.getColonnes()[j];

                        matR.setElement(this.getElement(colName, ligneName) + (matrice.getElement(colName, ligneName)), colName, ligneName);
                    }
                }
                return matR;
            }
            else {
                console.log("Les matrices n'ont pas une configuration identique !");
                return null;
            }
        }

        this.productScallar = function (scallar) {
            let matR = new tools.Library.Stats.Matrice();
            for (let i = 0; i < this.getLignes().length; i++) {
                const ligneName = this.getLignes()[i];
                for (let j = 0; j < this.getColonnes().length; j++) {
                    const colName = this.getColonnes()[j];

                    matR.setElement(this.getElement(colName, ligneName) * scallar, colName, ligneName);
                }
            }
            return matR;
        }
    },
    MatriceJoin: function () {
        this.matriceJoined = {};

        this.join = function (matrice, name) {
            this.matriceJoined[name] = matrice;
        }

        this.getMatriceJoinProperties = function (nameL, propertyL, nameR, propertyR, conditions) {
            let ensembles = this._buildEnsembleJoinProperties(nameL, propertyL, nameR, propertyR, conditions);
            // console.log(ensembles);
            return this._joinMatriceWithLinksElements(this.matriceJoined[nameL], this.matriceJoined[nameR], ensembles);
        }

        this._buildEnsembleJoinProperties = function (nameL, propertyL, nameR, propertyR, conditions) {
            let
                colsValuesGroupR = this.matriceJoined[nameR].getColsValuesGroupForColName(propertyR),
                // colsValuesGroupL = this.matriceJoined[nameL].getColsValuesGroupForColName(propertyL),
                ensembles = [];

            let
                colRindex = this.matriceJoined[nameR].getColIndex(propertyR),
                colLindex = this.matriceJoined[nameL].getColIndex(propertyL);

            for (const key in colsValuesGroupR) {
                if (Object.hasOwnProperty.call(colsValuesGroupR, key)) {
                    const
                        colValR = colsValuesGroupR[key],
                        indexColsRowsR = this.matriceJoined[nameR].getLignesIndexColsHaveValue(colValR, colRindex),
                        indexColsRowsL = this.matriceJoined[nameL].getLignesIndexColsHaveValue(colValR, colLindex);

                    let add = true;
                    for (let i = 0; i < conditions.length; i++) {
                        const condition = conditions[i];
                        if (condition(colValR)) {
                            add = false;
                            break;
                        }
                    }

                    if (add) {
                        for (const key1 in indexColsRowsR) {
                            if (Object.hasOwnProperty.call(indexColsRowsR, key1)) {
                                const indexColRowR = indexColsRowsR[key1];

                                for (const key2 in indexColsRowsL) {
                                    if (Object.hasOwnProperty.call(indexColsRowsL, key2)) {
                                        const indexColRowL = indexColsRowsL[key2];

                                        ensembles.push({ indexColRowL, indexColRowR });
                                    }
                                }
                            }
                        }

                    }

                }
            }

            return ensembles;
        }

        this._copyRowElementsToMatrice = function (matriceContent, rowIndexContent, matriceToCopy, rowIndexToCopy) {
            let colonnesCopy = matriceToCopy.getColonnes();

            for (let i = 0; i < colonnesCopy.length; i++) {
                const
                    colName = colonnesCopy[i],
                    colIndex = matriceToCopy.getColIndex(colName);

                matriceContent.setElement(matriceToCopy.getElementIndex(colIndex, rowIndexToCopy), colName, rowIndexContent);
            }
        }

        this._joinMatriceWithLinksElements = function (matriceL, matriceR, ensembles) {
            let result = new tools.Library.Stats.Matrice();

            for (const key in ensembles) {
                if (Object.hasOwnProperty.call(ensembles, key)) {
                    const element = ensembles[key];

                    this._copyRowElementsToMatrice(result, key, matriceR, element.indexColRowR.indexRow);
                    this._copyRowElementsToMatrice(result, key, matriceL, element.indexColRowL.indexRow);
                    // console.log(result);
                    // console.log(results);
                }
            }

            return result;
        }
    },
    Cube: function () {
        this.prefix = "";
        // Chaque élèment est un Library\Entity
        this.elements = new Map();
        this._groupIndexColsNames = [];
        this._countGroupIndexColsNamesOccurences = {};
        this._buildIndexContent = {};
        // la clé c'est le nom de la colonne
        this.colonnes = [];
        this.colonnesTypes = [];
        this.colonnesLabels = [];
        // la clé c'est le nom de la ligne
        this.lignes = [];
        this.filter = [];
        this.groupPolice = [];
        // la clé c'est le nom de la hauteur
        this.hauteurs = [];
        this.hauteursTypes = [];
        this.hauteursLabels = [];

        this.setColLabel = function (label, colName) {
            let indexCol = this.getColIndex(colName);
            this.colonnesLabels[indexCol] = label;
        }

        this.getColLabel = function (colName) {
            let indexCol = this.getColIndex(colName);
            return this.colonnesLabels[indexCol];
        }

        this.elementKey = function (list, element) {
            for (const key in list) {
                if (Object.hasOwnProperty.call(list, key)) {
                    const elt = list[key];
                    if (elt == element) {
                        return key;
                    }
                }
            }
            return null;
        }

        this.getColIndex = function (colName) {
            if (!this.colonnes.includes(colName)) {
                this.colonnes.push(colName);
            }
            // console.log(this.colonnes.includes(colName));
            // console.log("size: " + this.colonnes.length);
            let pos = this.elementKey(this.colonnes, colName);
            return this.prefix + pos;
        }

        this._getHightIndex = function (hightName) {
            if (!this.hauteurs.includes(hightName)) {
                this.hauteurs.push(hightName);
            }
            // console.log(this.colonnes.includes(colName));
            // console.log("size: " + this.colonnes.length);
            let pos = this.elementKey(this.hauteurs, hightName);
            return this.prefix + pos;
        }
        this.getLigneIndex = function (ligneName) {
            if (!this.lignes.includes(ligneName)) {
                this.lignes.push(ligneName);
            }
            // return this.colonnes[ligneName];
            // console.log(ligneName + " <= " + this.elementKey(this.lignes, ligneName));
            return this.prefix + this.elementKey(this.lignes, ligneName);
        }

        this.__buildIndex = function (indexCol, indexRow, indexHigh, val) {
            if (this._buildIndexContent[val] == undefined) {
                this._buildIndexContent[val] = {};
            }

            let key = indexRow + "_" + indexCol + "_" + indexHigh;
            this._buildIndexContent[val][key] = { 'indexRow': indexRow, 'indexCol': indexCol, 'indexHight': indexHigh };
        }

        this.getIndexRowColsHighInContextCol = function (val, indexCol) {
            var
                result = {},
                elements = this._buildIndexContent[val];

            for (const key in elements) {
                if (Object.hasOwnProperty.call(elements, key)) {
                    const indexRowCol = elements[key];
                    if (indexRowCol.indexCol == indexCol) {
                        result[key] = indexRowCol;
                    }
                }
            }

            return result;
        }

        this.getColonnes = function () {
            return this.colonnes;
        }

        this.getColonnesInPos = function (minPos, maxPos) {
            let result = [];
            if (maxPos > this.getColonnes().length) {
                maxPos = this.getColonnes().length;
            }

            if (minPos < 0) {
                minPos = 0;
            }

            for (let i = minPos; i < maxPos; i++) {
                const colName = this.getColonnes()[i];
                result.push(colName);
            }

            return result;
        }

        this.setColonnes = function (colonnes) {
            this.colonnes = colonnes;
        }

        this.addColonnes = function (colonnes) {
            for (let i = 0; i < colonnes.length; i++) {
                const colIndex = this.getColIndex(colonnes[i]);
            }
        }

        this.getHauteurs = function () {
            return this.hauteurs;
        }

        this.getHauteursInPos = function (minPos, maxPos) {
            let result = [];
            if (maxPos > this.getHauteurs().length) {
                maxPos = this.getHauteurs().length;
            }

            if (minPos < 0) {
                minPos = 0;
            }

            for (let i = minPos; i < maxPos; i++) {
                const higthName = this.getHauteurs()[i];
                result.push(higthName);
            }

            return result;
        }

        this.setHauteurs = function (hauteurs) {
            this.hauteurs = hauteurs;
        }

        this.addHauteurss = function (hauteurs) {
            for (let i = 0; i < hauteurs.length; i++) {
                const colIndex = this._getHightIndex(hauteurs[i]);
            }
        }

        this.getLignes = function () {
            return this.lignes;
        }

        this.ligneExist = function (ligneName) {
            return this.lignes.indexOf(ligneName) != -1;
        }

        this.setLignes = function (lignes) {
            this.lignes = lignes;
        }

        this.addLigne = function (ligneName, lignesElements) {
            for (let i = 0; i < this.getColonnes().length; i++) {
                const colName = this.getColonnes()[i];
                for (const key in lignesElements) {
                    if (Object.hasOwnProperty.call(lignesElements, key)) {
                        const element = lignesElements[key];
                        this.setElement(element, colName, ligneName)
                    }
                }
            }
        }

        this.getColonnesTypes = function () {
            return this.colonnesTypes;
        }

        this.getColonneType = function (colName) {
            let indexCol = this.getColIndex(colName);
            return this.colonnesTypes[indexCol];
        }

        this.setElement = function (element, colName, ligneName, hightName) {
            if (element == null) return;
            var
                indexCol = this.getColIndex(colName),
                indexHight = this._getHightIndex(hightName),
                indexLigne = this.getLigneIndex(ligneName);
            // console.log(indexCol + " _ " + colName);
            if (!this.elements.has(indexLigne)) {
                this.elements.set(indexLigne, new Map());
            }

            if (!this.elements.get(indexLigne).has(indexHight)) {
                this.elements.get(indexLigne).set(indexHight, new Map());
            }
            // console.log(indexLigne + " index_col " + indexCol);
            // console.log(this);
            this.elements.get(indexLigne).get(indexHight).set(indexCol, element);
            this.__buildIndex(indexCol, indexLigne, indexHight, element);
        }

        this.setElementIndex = function (element, colIndex, ligneIndex, hightIndex) {
            if (element == null) return;
            var
                indexCol = colIndex,
                indexHight = hightIndex,
                indexLigne = ligneIndex;
            // console.log(indexCol + " _ " + colName);
            if (!this.elements.has(indexLigne)) {
                this.elements.set(indexLigne, new Map());
            }

            if (!this.elements.get(indexLigne).has(indexHight)) {
                this.elements.get(indexLigne).set(indexHight, new Map());
            }
            // console.log(indexLigne + " index_col " + indexCol);
            // console.log(this);
            this.elements.get(indexLigne).get(indexHight).set(indexCol, element);
            this.__buildIndex(indexCol, indexLigne, indexHight, element);
            // console.log(this);
        }

        this.getElement = function (colName, ligneName, hightName) {
            var
                indexCol = this.getColIndex(colName),
                indexHight = this._getHightIndex(hightName),
                indexLigne = this.getLigneIndex(ligneName);
            // console.log(indexCol);
            // console.log(indexLigne);
            if (this.elements.has(indexLigne)
                && this.elements.get(indexLigne).has(indexHight)
                && this.elements.get(indexLigne).get(indexHight).has(indexCol)) {
                return this.elements.get(indexLigne).get(indexHight).get(indexCol);
            }
            return null;
        }

        this.getElementIndex = function (indexCol, indexLigne, indexHight) {
            // console.log(indexCol);
            // console.log(indexLigne);
            if (this.elements.has(indexLigne)
                && this.elements.get(indexLigne).has(indexHight)
                && this.elements.get(indexLigne).get(indexHight).has(indexCol)) {
                return this.elements.get(indexLigne).get(indexHight).get(indexCol);
            }
            return null;
        }

        this.getMatriceAxeCol = function (colName) {
            let matrice = new tools.Library.Stats.Matrice();
            // console.log(colIndex);
            for (let i = 0; i < this.getHauteurs().length; i++) {
                const hightName = this.getHauteurs()[i];
                for (let index = 0; index < this.lignes.length; index++) {
                    // const indexLigne = this.getLigneIndex(this.lignes[index]);
                    let element = this.getElement(colName, this.lignes[index], hightName);
                    if (element != null) {
                        matrice.setElement(element, hightName, this.lignes[index]);
                        // console.log(element);

                    }
                }
            }

            return matrice;
        }

        this.getMatriceAxeHight = function (hightName) {
            let matrice = new tools.Library.Stats.Matrice();
            // console.log(colIndex);
            for (let i = 0; i < this.getColonnes().length; i++) {
                const colName = this.getColonnes()[i];
                for (let index = 0; index < this.lignes.length; index++) {
                    // const indexLigne = this.getLigneIndex(this.lignes[index]);
                    let element = this.getElement(colName, this.lignes[index], hightName);
                    if (element != null) {
                        matrice.setElement(element, colName, this.lignes[index]);
                    }
                }
            }

            return matrice;
        }

        this.resumeTubeAxe = function (resumer, points) {
            let resume = null;

            for (const key in points) {
                if (Object.hasOwnProperty.call(points, key)) {
                    const point = points[key];
                    // console.log(this.getElementIndex(point.indexCol, point.indexRow, point.indexHight));
                    resume = resumer(this.getElementIndex(point.indexCol, point.indexRow, point.indexHight), resume);
                }
            }

            return resume;
        }

        this.getMatriceResumeAxeCols = function (resumer) {
            let matrice = new tools.Library.Stats.Matrice();

            for (const keyH in Object.keys(this.getHauteurs())) {
                if (Object.hasOwnProperty.call(Object.keys(this.getHauteurs()), keyH)) {
                    const indexHight = Object.keys(this.getHauteurs())[keyH];

                    for (const keyC in Object.keys(this.getColonnes())) {
                        if (Object.hasOwnProperty.call(Object.keys(this.getColonnes()), keyC)) {
                            const colIndex = Object.keys(this.getColonnes())[keyC];
                            let points = [];

                            for (const keyL in Object.keys(this.getLignes())) {
                                if (Object.hasOwnProperty.call(Object.keys(this.getLignes()), keyL)) {
                                    const indexRow = Object.keys(this.getLignes())[keyL];

                                    points.unshift({ 'indexRow': indexRow, 'indexCol': colIndex, 'indexHight': indexHight })
                                }
                            }
                            // console.log(this.resumeTubeAxe(resumer, points));
                            matrice.setElement(this.resumeTubeAxe(resumer, points), this.getHauteurs()[indexHight], this.getColonnes()[colIndex]);
                        }
                    }

                }
            }

            return matrice;
        }

        this.getPointsAxeCol = function (colName) {
            let
                points = [],
                colIndex = this.getColIndex(colName);

            for (const key in Object.keys(this.getLignes())) {
                if (Object.hasOwnProperty.call(Object.keys(this.getLignes()), key)) {
                    const indexRow = Object.keys(this.getLignes())[key];

                    for (const keyH in Object.keys(this.getHauteurs())) {
                        if (Object.hasOwnProperty.call(Object.keys(this.getHauteurs()), keyH)) {
                            const indexHight = Object.keys(this.getHauteurs())[keyH];

                            points.unshift({ 'indexRow': indexRow, 'indexCol': colIndex, 'indexHight': indexHight })
                        }
                    }

                }
            }

            return points;
        }

        this.exportXSL = function (sheatName = "Fichier Recap", labelizeColNames = function (id) { return id; }) {
            let s2ab = function (s) {
                let buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
                let view = new Uint8Array(buf);  //create uint8array as viewer
                for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
                return buf;
            }

            let wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "E-CAMSCHOOL - SheetJS",
                Subject: "E-CAMSCHOOL-DATA",
                Author: "E-CAMSCHOOL",
                CreatedDate: new Date()
            };

            wb.SheetNames.push(sheatName);
            let
                colNames = this.getColonnes(),
                ws_data = [];
            for (let i = 0; i < colNames.length; i++) {
                const
                    colName = colNames[i],
                    matrice = this.getMatriceAxeCol(colName);

                ws_data = ws_data.concat(matrice.getConfigExport(labelizeColNames(colName), "Etablissements"));
            }

            let ws = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[sheatName] = ws;

            let wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), sheatName + '.xlsx');

            // managers.getManagerOf("Eleve").save('/php/save.php', eleves, httpRequest);
        }
    },
    MatriceUtilitary: {
        hasSameColonnes: function (mat1, mat2) {
            let col1 = mat1.getColonnes(), col2 = mat2.getColonnes();
            if (col1.length != col2.length) {
                return false;
            }

            return JSON.stringify(col1) === JSON.stringify(col2);
        },

        hasSameLignes: function (mat1, mat2) {
            let col1 = mat1.getLignes(), col2 = mat2.getLignes();
            if (col1.length != col2.length) {
                return false;
            }

            return JSON.stringify(col1) === JSON.stringify(col2);
        },

        hasSameConfig: function (mat1, mat2) {
            return tools.Library.Stats.MatriceUtilitary.hasSameColonnes(mat1, mat2) && tools.Library.Stats.MatriceUtilitary.hasSameLignes(mat1, mat2);
        },

        operationAddition: function (matR, mat1, mat2) {
            if (tools.Library.Stats.MatriceUtilitary.hasSameConfig(mat1, mat2)) {
                // let mat = new tools.Library.Stats.Matrice();
                for (let i = 0; i < mat1.getLignes().length; i++) {
                    const ligneName = mat1.getLignes()[i];
                    for (let j = 0; j < mat1.getColonnes().length; j++) {
                        const colName = mat1.getColonnes()[j];

                        matR.setElement(mat1.getElement(colName, ligneName).add(mat2.getElement(colName, ligneName)), colName, ligneName);
                    }
                }
                return matR;
            }
            else {
                console.log("Les matrices n'ont pas une configuration identique !");
                return null;
            }
        }
    }
}