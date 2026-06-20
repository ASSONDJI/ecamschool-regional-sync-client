tools.Library.DAOContainer = function () {
    this.listTableData = tools.Library._$$DAOContainerData.listTableData;
    this.tableHeader = tools.Library._$$DAOContainerData.tableHeader;
    this.container = new tools.Library.Container(this);

    this.setTableHeader = function (table, uri, headers) {
        this.tableHeader[uri] = { "table": table, "headers": headers };
    }

    this.getListTableData = function (table) {
        if (this.listTableData[table] == undefined) {
            this.listTableData[table] = new tools.Library.Stats.Matrice();
        }

        return this.listTableData[table];
    }

    this.setListTableData = function (table, content_mat) {
        this.listTableData[table] = content_mat;
    }

    this.updateTable = function (uri, table, elements, dataKeysCols = []) {
        let
            dataTable = this.getListTableData(table),
            headers = [],
            keysExist = [];

        dataTable.setColsBuildIndexs(dataKeysCols);
        for (const key in elements) {
            if (Object.hasOwnProperty.call(elements, key) && elements[key] != null) {
                const
                    element = elements[key],
                    id = element["id"] == undefined ? key : element["id"];

                if (keysExist.indexOf(id) == -1) {
                    keysExist.push(id);
                } else console.log("Attention vos entités de bases de données ont le même identifiant");


                for (const attr in element) {
                    if (Object.hasOwnProperty.call(element, attr)) {
                        const val = element[attr];
                        dataTable.setElement(val, attr, id);
                    }
                }

                headers.push(id);
            }
        }

        this.setTableHeader(table, uri, headers);
        // this.listTableData[table] = dataTable;
    }

    this.getElementIndex = function (table, index) {
        return this.getListTableData(table).getElementsLigneMap(index);
    }

    this.getElementRowIndex = function (table, index) {
        return this.getListTableData(table).getElementsLigneMapInIndex(index);
    }

    this.getElementRow = function (table, element) {
        let index = this.getListTableData(table).getLigneIndex(element);
        return this.getListTableData(table).getElementsLigneMapInIndex(index);
    }

    this.getElementsIndexUri = function (table, uri) {
        let result = [];
        // console.log(this.tableHeader);
        for (let i = 0; i < this.tableHeader[uri]["headers"].length; i++) {
            const
                index = this.tableHeader[uri]["headers"][i],
                entityNP = new tools.AppLib.Entities[table](this.getElementIndex(table, index));

            result.push(entityNP);
        }

        return result;
    }

    this.getElementsHaveColVal = function (table, val, colName) {
        // console.log(table);
        // console.log(this.listTableData);
        let
            indexCol = this.getListTableData(table).getLignes(colName),
            result = [];
        // console.log(this.tableHeader);
        let indexColsRows = this.getListTableData(table).getLignesIndexColsHaveValue(val, indexCol);
        for (const key in indexColsRows) {
            if (Object.hasOwnProperty.call(indexColsRows, key)) {
                const
                    indexColRow = indexColsRows[key],
                    entityNP = new tools.AppLib.Entities[table](this.getElementRowIndex(table, indexColRow.indexRow));

                result.push(entityNP);
            }
        }

        return result;
    }

    this.getList = function (table, start = 0, end = -1) {
        let
            lignesNames = this.getListTableData(table).getLignes(),
            result = [];
        // console.log(this.tableHeader);
        // let indexColsRows = this.listTableData[table].getLignesIndexColsHaveValue(val, indexCol);
        let posAdd = 0;
        for (const key in lignesNames) {
            if (Object.hasOwnProperty.call(lignesNames, key)) {
                if ((posAdd > (start - 1) && end == -1) || (posAdd > (start - 1) && posAdd < end)) {
                    const
                        ligne = lignesNames[key],
                        entityNP = new tools.AppLib.Entities[table](this.getElementIndex(table, ligne));

                    result.push(entityNP);
                }
                posAdd++;
            }
        }

        return result;
    }

    this.getElementsJoinTables = function (tableL, propertyL, tableR, propertyR, conditions = []) {
        let matriceJoin = new tools.Library.Stats.MatriceJoin();

        matriceJoin.join(this.getListTableData(tableR), tableR);
        matriceJoin.join(this.getListTableData(tableL), tableL);

        return matriceJoin.getMatriceJoinProperties(tableL, propertyL, tableR, propertyR, conditions);
    }

    this.uriExist = function (uri) {
        // return this.tableHeader[uri] != undefined;
        return false;
    }

    this.getContainer = function () {
        return this.container;
    }
}