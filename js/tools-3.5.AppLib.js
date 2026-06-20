tools.AppLib = {
    constantes: {
        API_BASE_URL: 'http://localhost'
    },
    Entities: {
        Personne: function (data) {
            tools.Library.Entity.call(this, data);

            this.nom = function () {
                return this._getDataValue("nom");
            }

            this.prenom = function () {
                return this._getDataValue("prenom");
            }

            this.nomPere = function () {
                return this._getDataValue("nomPere");
            }

            this.nomMere = function () {
                return this._getDataValue("nomMere");
            }

            this.dateNaiss = function () {
                return this._getDataValue("dateNaiss");
            }

            this.lieuNaiss = function () {
                return this._getDataValue("lieuNaiss");
            }

            this.sexe = function () {
                return this._getDataValue("sexe");
            }

            this.profileImage = function () {
                return this._getDataValue("profileImage");
            }

            this.telephone = function () {
                return this._getDataValue("telephone");
            }
        },
        Enseignement: function (data) {
            tools.Library.Entity.call(this, data);

            this.regime = function () {
                return this._getDataValue("regime");
            }
        },
        User: function (data) {
            tools.Library.Entity.call(this, data);

        }
    },
    Utilitary: {
        DataTableContainer: function (matrice) {
            this.matrice = matrice;
            this.colonnes = [];
            this.searchForm = {};
            this.updateForm = {};
            this.notUpdateForm = [];
            this.schemesConfig = {};

            this.setColonnes = function (colonnes) {
                this.colonnes = colonnes;
            }

            this.addUpdateFormSelect = function (colName, data) {
                if (data == false) {
                    this.notUpdateForm.push(colName);
                    return this;
                }

                let result = {};
                // console.log(colName);
                // console.log(data);
                for (let i = 0; i < data.length; i++) {
                    const val = data[i];
                    result[val] = val;
                }
                this.updateForm[colName] = JSON.stringify(result);
                return this;
            }

            this.addSearchForm = function (type, colName, title) {
                if (tools.AppLib.constantes.DataTableContainerSearchForm.DATE == type) {
                    this.searchForm[colName] = '<input type="date" placeholder="' + title + '" />';
                }
                return this;
            }

            this.addSearchFormSelect = function (colName, data) {
                let result = '<select name="" id="">';

                result += '<option value="">Aucun</option>';
                // console.log(colName);
                // console.log(data);
                if (data) {
                    for (let i = 0; i < data.length; i++) {
                        const val = data[i];
                        result += '<option value="' + val + '">' + val + '</option>';
                    }
                }
                result += '</select>';
                this.searchForm[colName] = result;

                return this;
            }

            this.addColonneNameToScheme = function (colName, accumulator) {
                this.schemesConfig[colName] = this.matrice.getConfigSchemeGroup(colName, accumulator);
                return this;
            }

            this.getSearchForm = function (colName) {
                if (this.searchForm[colName] == undefined) {
                    return '<input type="text" placeholder="' + colName + '" />';
                }
                return this.searchForm[colName];
            }

            this.updateFormExist = function (colName) {
                return this.updateForm[colName] != undefined
            }

            this.formatCellContent = function (api, filterH, colIdx) {
                let cell = $(filterH).eq(
                    $(api.column(colIdx).header()).index()
                );
                // let title = $(cell).text();
                $(cell).html(this.getSearchForm($(cell).text()));
            }

            this.getFormatEditableCols = function () {
                let result = [];

                for (let index = 0; index < this.colonnes.length; index++) {
                    const colonne = this.colonnes[index];
                    if (this.updateFormExist(colonne)) {
                        result.push([index, colonne, this.updateForm[colonne]]);
                    }
                    else if (this.notUpdateForm.indexOf(colonne) == -1) {
                        result.push([index, colonne]);
                    }
                }

                // return [[1, 'first_name'], [2, 'last_name'], [3, 'gender', '{"1":"Male","2":"Female"}']];
                return result;
            }

            this.getBuildSchemes = function () {
                let result = {};
                // console.log("Promise launch");
                for (const colName in this.schemesConfig) {
                    if (Object.hasOwnProperty.call(this.schemesConfig, colName)) {
                        const configsForName = this.schemesConfig[colName];

                        result[colName] = this.matrice.getConfigGroupExportSchemesHeadersLignes(configsForName);
                        // result[colName] = this.matrice.getConfigGroupExportSchemesHeaders(configsForName);
                    }
                }

                return result;
            }

            this.config = function () {
                let context = this;

                let buttonsConfig = '<button class="btn btn-inverse btn-default btn-xs export-list-matrice-global">Recap: Global</button>';
                for (const colName in this.schemesConfig) {
                    if (Object.hasOwnProperty.call(this.schemesConfig, colName)) {
                        buttonsConfig += '<button class="btn btn-inverse btn-default btn-xs export-list-matrice" colName="' + colName + '">Recap: ' + colName + '</button>';
                    }
                }
                $("#show-buttons-config-recap").html(buttonsConfig);

                $('.export-list-matrice').click(function (e) {
                    e.preventDefault();
                    let
                        colName = $(this).attr("colName"),
                        myDisplay = async function () {
                            let myPromise = new Promise(function (resolve, reject) {
                                let solve = function () {
                                    console.log("Promise launch");
                                    let dataExport = context.getBuildSchemes();
                                    context.matrice.exportFileXSL(dataExport[colName], "resume " + colName);
                                }
                                resolve(solve());
                            });
                            myPromise;
                        };

                    myDisplay();
                    // let dataExport = context.getBuildSchemes();
                    // // btn-delegation-para-ets
                    // context.matrice.exportFileXSL(dataExport["idEtablissement"], "resume");
                });

                $('.export-list-matrice-global').click(function (e) {
                    e.preventDefault();
                    let
                        exportContent = [],
                        dataExport = context.getBuildSchemes(),
                        title = "";

                    for (const colName in dataExport) {
                        if (Object.hasOwnProperty.call(dataExport, colName)) {
                            const data = dataExport[colName];

                            exportContent = exportContent.concat(data);
                            title += "_" + colName;
                        }
                    }

                    context.matrice.exportFileXSL(exportContent, "resume " + title);
                });

                $('#example thead tr')
                    .clone(true)
                    .addClass('filters')
                    .appendTo('#example thead');

                let dt = $('#example').DataTable({
                    data: this.matrice.getDataSetForm(this.colonnes),
                    scrollX: 400,
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'excel', 'pdf'
                    ],
                    fixedHeader: {
                        header: true,
                        footer: true
                    },
                    orderCellsTop: true,
                    initComplete: function () {
                        let api = this.api();
                        // For each column
                        api
                            .columns()
                            .eq(0)
                            .each(function (colIdx) {
                                // Set the header cell to contain the input element
                                // let cell = $('.filters th').eq(
                                //     $(api.column(colIdx).header()).index()
                                // );
                                // let title = $(cell).text();
                                // $(cell).html('<input type="text" placeholder="' + title + '" />');
                                context.formatCellContent(api, '.filters th', colIdx);
                                let cursorPosition = 0;
                                // On every keypress in this input
                                $(
                                    // 'input',
                                    'input, select',
                                    $('.filters th').eq($(api.column(colIdx).header()).index())
                                )
                                    // .off('keyup change')
                                    .on('change', function (e) {
                                        // Get the search value
                                        $(this).attr('title', $(this).val());
                                        let regexr = '({search})'; //$(this).parents('th').find('select').val();

                                        cursorPosition = this.selectionStart;
                                        // console.log(cursorPosition);
                                        // console.log(colIdx);
                                        // Search the column for that value
                                        api
                                            .column(colIdx)
                                            .search(
                                                this.value != ''
                                                    ? regexr.replace('{search}', '(((' + this.value + ')))')
                                                    : '',
                                                this.value != '',
                                                this.value == ''
                                            )
                                            .draw();
                                    })
                                    .on('keyup', function (e) {
                                        e.stopPropagation();
                                        console.log(cursorPosition);

                                        $(this).trigger('change');
                                        $(this)
                                            .focus()[0]
                                            .setSelectionRange(cursorPosition, cursorPosition);
                                    });
                            });
                    }
                });

                return dt;
            }

            this.showViewTableConfig = function (dt, names) {
                // let names = dt.settings().init().columns;
                let result = "";
                for (const key in names) {
                    if (Object.hasOwnProperty.call(names, key)) {
                        const name = names[key];
                        result += '<button class="btn btn-inverse btn-default btn-xs btn-view-header-table" index="' + key + '">' + name + '</button>';
                        // result += '<button class="btn btn-inverse btn-default btn-xs btn-view-header-table" index="' + key + '">' + name.title + '</button>';
                    }
                }

                $("#show-buttons-config").html(result);
                this.showHideTableHeader(dt, ".btn-view-header-table");
            }

            this.initShowTableHeader = function (colonnes) {
                let result = "<tr>";

                for (let i = 0; i < colonnes.length; i++) {
                    result += "<th>" + colonnes[i] + "</th>";
                }

                result += "</tr>";
                $("#example thead").html(result);
            }

            this.showHideTableHeader = function (dt, cible) {
                $(cible).click(function (e) {
                    e.preventDefault();
                    let index = parseInt($(this).attr("index"));
                    // console.log(dt.columns([index]));
                    if ($(this).hasClass("btn-success")) {
                        dt.columns([index]).visible(true);
                    } else {
                        dt.columns([index]).visible(false);
                        // dt.columns([index]).searchable(false);
                    }

                    $(this).toggleClass('btn-default');
                    $(this).toggleClass('btn-success');
                });
            }
        }
    },
    Container: {
        PersonneContainer: function (dao) {
            tools.Library.Container_mat.call(this, dao);
            this.table = "Personne";

        }
    },
    Models: {
        PersonneManagers_AJAX: function (api, dao) {
            tools.Library.Managers_AJAX.call(this, api, dao);
            this.table = "Personne";

            this.fromContext = function (httpRequest, attribHTTP) {
                this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/personnes.json", httpRequest, attribHTTP, null);
            }
        },
        EnseignementManagers_AJAX: function (api, dao) {
            tools.Library.Managers_AJAX.call(this, api, dao);
            this.table = "Enseignement";

            this.getEnseignements = function (httpRequest, attribHTTP) {
                this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/uds2026/ecamschool-regional-sync-client/uds-server/", httpRequest, attribHTTP, null);
            }
        },
        EnseignementManagers_InDB: function (api, dao) {
            tools.Library.Managers_InDB.call(this, api, dao);
            this.table = "Enseignement";

            this.getEnseignements = function (httpRequest, attribHTTP) {

            }
        },
        UserManagers_AJAX: function (api, dao) {
            tools.Library.Managers_AJAX.call(this, api, dao);
            this.table = "User";

            this.getUsers = function (httpRequest, attribHTTP) {
                this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/users-lst", httpRequest, attribHTTP, null);
            }
        }
    },
    EBackController: function (app, module, action) {
        tools.Library.BackController.call(this, app, module, action);

    }
}