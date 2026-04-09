tools.Applications.Frontend.Modules.Rh = {
    DataLoad: {
        ActionIndex: {
            loadTest: function (httpRequest) {
                let managers = httpRequest.getApp().getCurrentController().getManagers();
               
                managers.getManagerOf("Personne").fromContext(httpRequest, "personnes");
                managers.getManagerOf("User").fromContext(httpRequest, "users");
                managers.getManagerOf("Establishment").fromContext(httpRequest, "establishments");
                managers.getManagerOf("DataMatrix").fromContext(httpRequest, "data-matrix");
            }
        }
    },
    
    RhController: function (app, module, action) {
        tools.AppLib.EBackController.call(this, app, module, action);

        this.executeIndex = function (httpRequest) {
            console.log("Execution de executeIndex - Chargement des donnees");
            
            // Creer l'objet matrice global
            window.appMatrix = {
                matrice: new tools.Library.Stats.Matrice(),
                
                loadUsersToMatrice: function(users) {
                    users.forEach(user => {
                        this.matrice.setElement(user.id, "ID", user.username);
                        this.matrice.setElement(user.username, "Username", user.username);
                        this.matrice.setElement(user.email, "Email", user.username);
                        this.matrice.setElement(user.fullName, "Nom complet", user.username);
                        this.matrice.setElement(user.role, "Role", user.username);
                        this.matrice.setElement(user.delegationRegion, "Region", user.username);
                    });
                    console.log(users.length + " utilisateurs dans la matrice");
                },
                
                loadEstablishmentsToMatrice: function(establishments) {
                    establishments.forEach(etab => {
                        this.matrice.setElement(etab.id, "ID", etab.code);
                        this.matrice.setElement(etab.code, "Code", etab.code);
                        this.matrice.setElement(etab.name, "Nom", etab.code);
                        this.matrice.setElement(etab.city, "Ville", etab.code);
                    });
                    console.log(establishments.length + " etablissements dans la matrice");
                },
                
                loadDataMatrixToMatrice: function(dataMatrices) {
                    dataMatrices.forEach(data => {
                        this.matrice.setElement(data.id, "ID", data.clientKey);
                        this.matrice.setElement(data.clientKey, "ClientKey", data.clientKey);
                        this.matrice.setElement(data.syncStatus, "Statut", data.clientKey);
                        this.matrice.setElement(data.dataType, "Type", data.clientKey);
                    });
                    console.log(dataMatrices.length + " donnees dans la matrice");
                },
                
                displayMatricePreview: function() {
                    console.log("Apercu de la matrice");
                    console.log("Colonnes:", this.matrice.getColonnes());
                    console.log("Lignes:", this.matrice.getLignes());
                }
            };
            
            this.DataLoad.ActionIndex.loadTest(httpRequest);
        };
    
        this.getManagers = function() {
            return {
                getManagerOf: function(entityName) {
                    switch(entityName) {
                        case "Personne":
                            return new tools.AppLib.Models.PersonneManagers_AJAX();
                        case "User":
                            return new tools.AppLib.Models.UsersManagers_AJAX();
                        case "Establishment":
                            return new tools.AppLib.Models.EstablishmentsManagers_AJAX();
                        case "DataMatrix":
                            return new tools.AppLib.Models.DataMatrixManagers_AJAX();
                        default:
                            return null;
                    }
                }
            };
        };
    },
    
    Views: {}
};