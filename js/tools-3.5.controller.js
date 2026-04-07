tools.Applications.Frontend.Modules.Rh = {
    DataLoad: {
        ActionIndex: {
            loadTest: function (httpResquest) {
                let managers = httpResquest.getApp().getCurrentController().getManagers();
                managers.getManagerOf("Enseignement").getEnseignements(httpResquest, "enseignements");
            }
        }
    },
    RhController: function (app, module, action) {
        tools.AppLib.EBackController.call(this, app, module, action);

        this.executeIndex = function (httpRequest) {
            let enseignements = httpRequest.getAttribute("enseignements");
            // Instance de la matrice de représentation des données
            let matrice = new tools.Library.Stats.Matrice();


            for (let index = 0; index < enseignements.length; index++) {
                const elt = enseignements[index];
                matrice.setElement(elt.getDescription("regime"), "regime", index);
            }

            console.log("index");
            console.log(enseignements);
            console.log(matrice.getElement("regime", "65"));
            console.log(matrice);

        }

    },
    Views: {
    }
}