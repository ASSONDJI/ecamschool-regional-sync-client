tools.Applications.Frontend.Modules.Rh = {
    DataLoad: {
        ActionIndex: {
            loadTest: function (httpResquest) {
                let managers = httpResquest.getApp().getCurrentController().getManagers();
                managers.getManagerOf("Enseignement").getEnseignements(httpResquest, "enseignements");
            },
            // loadTest1: function (httpResquest) {
            //     let managers = httpResquest.getApp().getCurrentController().getManagers();
            //     managers.getManagerOf("User").getUsers(httpResquest, "users");
            // }
        }
    },
    RhController: function (app, module, action) {
        tools.Library.BackController.call(this, app, module, action);

        this.executeIndex2 = function (httpRequest) {
            let enseignements = httpRequest.getAttribute("enseignements");
            // let users = httpRequest.getAttribute("users");
            // Instance de la matrice de représentation des données
            let matrice = new tools.Library.Stats.Matrice();

            for (let index = 0; index < enseignements.length; index++) {
                const elt = enseignements[index];
                matrice.setElement(elt.regime(), "regime", index);
                // matrice.setElement(elt.getDescription("regime"), "regime", index);
            }

            console.log(matrice.getElement("regime", "65"));
            console.log("after-test");

            matrice.renameCol("regime", "test");
            console.log(matrice.getElement("test", "65"));
            console.log(matrice.getElement("regime", "65"));


            console.log(matrice);

        }

        this.executeIndex3 = function (httpRequest) {
            // let users = httpRequest.getAttribute("users");
            // Instance de la matrice de représentation des données
            let langue1 = this.managers.getManagerOf("Enseignement").getUnique(1);
            // let langue1 = this.managersInDB.getManagerOf("Enseignement").getUnique(1);
        }

        this.executeIndex = function (httpRequest) {
            let
                matriceContent = this.getManagers().getManagerOf("Enseignement").matriceContent(),
                // matriceContent = this.getManagers().getManagerOf("Enseignant").getContainer().getJoinPersonnes(),
                colonnesShow = [
                    "id", "idEnseignant", "idDiscipline", "idClasse", "regime", "anneeAcad", "portee"
                ];

            this.page.views().initShowTableHeader(colonnesShow);
            matriceContent.applyColonneMapCell("id", function (cellContent) {
                let content = '<a target="_blanck" href="/dres/disciplines/' + cellContent + 'copy/" class="btn btn-inverse btn-default btn-xs">clone</a>';
                content += '<a target="_blanck" href="/dres/disciplines/modify' + cellContent + '/" class="btn btn-inverse btn-warning btn-xs">update</a>';
                return content;
            });

            let dataTable = new tools.AppLib.Utilitary.DataTableContainer(matriceContent);
            // console.log(matriceContent);
            dataTable.setColonnes(colonnesShow);
            dataTable
                // .addSearchForm(tools.AppLib.constantes.DataTableContainerSearchForm.DATE, "datePriseDeFonctionFP", "date Prise De Fonction A La FP")
                .addSearchFormSelect("idEnseignant", matriceContent.getColsValuesGroupForColName("idEnseignant"))
                .addSearchFormSelect("idDiscipline", matriceContent.getColsValuesGroupForColName("idDiscipline"))
                .addSearchFormSelect("idClasse", matriceContent.getColsValuesGroupForColName("idClasse"))
                .addSearchFormSelect("regime", matriceContent.getColsValuesGroupForColName("regime"))
                .addSearchFormSelect("anneeAcad", matriceContent.getColsValuesGroupForColName("anneeAcad"))
                .addSearchFormSelect("portee", matriceContent.getColsValuesGroupForColName("portee"));

            let dt = dataTable.config();
            // this.configShowViewSearchColumnTable(dt);
            this.page.views().showViewTableConfig(dt, colonnesShow, this.page.views());
        }

    },
    Views: {
        initShowTableHeader: function (colonnes) {
            let result = "<tr>";

            for (let i = 0; i < colonnes.length; i++) {
                result += "<th>" + colonnes[i] + "</th>";
            }

            result += "</tr>";
            $("#example thead").html(result);
        },
        showViewTableConfig: function (dt, names, views) {
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
            views.showHideTableHeader(dt, ".btn-view-header-table");
        },
        showHideTableHeader: function (dt, cible) {
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
}