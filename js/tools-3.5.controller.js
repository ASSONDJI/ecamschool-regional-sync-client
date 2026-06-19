 tools.Applications.Frontend.Modules.Rh = {
    DataLoad: {
        ActionIndex: {
            loadTest: function (httpResquest) {
                let managers = httpResquest.getApp().getCurrentController().getManagers();
                managers.getManagerOf("Personne").fromContext(httpResquest, "personnes");
            }
        }
    },
    RhController: function (app, module, action) {
        tools.AppLib.EBackController.call(this, app, module, action);

        this.executeIndex = function (httpRequest) {
            console.log("index");

        }
    },
    Views: {
    }
}