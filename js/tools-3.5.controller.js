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
            console.log(" Exécution de executeIndex - Chargement des données");
            
           
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
    
    Views: {
    }
};