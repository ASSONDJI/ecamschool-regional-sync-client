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
        tools.AppLib.EBackController.call(this, app, module, action);

        this.executeIndex = function (httpRequest) {
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

        this.executeExportEtsDDESEff = function (httpRequest) {
            var
                etablissements = httpRequest.getAttribute("etablissements"),
                matrice = new tools.Library.Stats.Matrice();
            // controller.processExportListPersonnelDDES(httpRequest);
            etablissements.sort(function (a, b) {
                if (a.nom() < b.nom()) { return -1; }
                if (a.nom() > b.nom()) { return 1; }
                return 0;
            });

            let colsNames = ["global", "solvable", "insolvable", "cas_sociaux"];
            let colsNamesEts = ["nom", "global", "solvable", "insolvable", "cas_sociaux"];

            for (let i = 0; i < etablissements.length; i++) {
                const
                    ets = etablissements[i],
                    a = ets.getDescription("effectifs")["solvable"],
                    b = ets.getDescription("effectifs")["insolvable"],
                    c = ets.getDescription("effectifs")["cas_sociaux"];

                matrice.setElement(ets.nom(), "nom", i);
                matrice.setElement(ets.cycle(), "cycle", i);
                matrice.setElement(ets.structure(), "structure", i);
                matrice.setElement(ets.localite(), "localite", i);

                matrice.setElement(a, "solvable", i);
                matrice.setElement(b, "insolvable", i);
                matrice.setElement(c, "cas_sociaux", i);
                matrice.setElement(a + b + c, "global", i);
            }


            // matrice.exportXSL("listing global rettraite");
            let dataConfigXslSchemes = [];
            let localites = matrice.getColsValuesGroupForColName("localite");
            // console.log(enseignements);
            for (const key in localites) {
                if (Object.hasOwnProperty.call(localites, key)) {
                    const localite = localites[key];
                    // console.log(matiere);
                    const dataConfigXslLocal = {
                        "config": {
                            "validators": {
                                "localite": [
                                    function (val) {
                                        return val == localite;
                                    }
                                ]
                            },
                            "accumulator": function (nbre, somme) {
                                if (somme == null) {
                                    return nbre;
                                }

                                if (nbre == null) {
                                    return somme;
                                }

                                return nbre + somme;
                            },
                            "label": "SYNTH LOCALITE : " + localite
                        },
                        "colonnesShow": colsNamesEts,
                        "colonnesResume": colsNames,
                        "title": "data synth : " + localite
                    };

                    dataConfigXslSchemes = dataConfigXslSchemes.concat(dataConfigXslLocal);
                }
            }

            // console.log(dataConfigXslSchemes);
            let dataConfigXsl = matrice.getConfigGroupExportSchemes(dataConfigXslSchemes, function (resume, result) {
                // console.log(resume);
                return resume;
            }, 'FIN GLOBAL');
            matrice.exportFileXSL(dataConfigXsl, "general effectif");
        }

    },
    Views: {
    }
}