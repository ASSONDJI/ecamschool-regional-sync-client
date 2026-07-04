tools.Applications.Frontend.Modules.Rh = {

    DataLoad: {
        ActionIndex: {

            loadTest: function (httpRequest) {

                let controller = httpRequest.getApp().getCurrentController();
                let managers = controller.getManagers();

                // Backend → framework natif _requestFetchAll → $.ajax
                managers.getManagerOf("User").getUsers(httpRequest, "users");
                managers.getManagerOf("Establishment").getEstablishments(httpRequest, "establishments");

                managers.getManagerOf("Enseignement").getEnseignements(httpRequest, "enseignements");
            }
        }
    },

    RhController: function (app, module, action) {

        tools.AppLib.EBackController.call(this, app, module, action);

        this.executeIndex = function (httpRequest) {

            let users = httpRequest.getAttribute("users");
            let establishments = httpRequest.getAttribute("establishments");
            let enseignements = httpRequest.getAttribute("enseignements");

            console.log("===== USERS =====");
            console.log(users);

            console.log("===== ESTABLISHMENTS =====");
            console.log(establishments);

            if (!users || !establishments || !enseignements) {
                console.warn("[RhController] Données manquantes.");
                return;
            }
            if (window.DEBUG_MODE) {
                // Matrice Users
                let matriceUsers = new tools.Library.Stats.Matrice();
                for (let i = 0; i < users.length; i++) {
                    matriceUsers.setElement(users[i].getData().username, "username", i);
                    matriceUsers.setElement(users[i].getData().role, "role", i);
                }
                console.log("===== MATRICE USERS =====");
                console.log(matriceUsers);

                // Matrice Establishments
                let matriceEstablishments = new tools.Library.Stats.Matrice();
                for (let i = 0; i < establishments.length; i++) {
                    matriceEstablishments.setElement(establishments[i].getData().name, "name", i);
                    matriceEstablishments.setElement(establishments[i].getData().city, "city", i);
                }
                console.log("===== MATRICE ESTABLISHMENTS =====");
                console.log(matriceEstablishments);

                // Matrice Enseignements
                console.log("===== ENSEIGNEMENTS =====");
                console.log(enseignements);

                let matriceEnseignements = new tools.Library.Stats.Matrice();
                for (let i = 0; i < enseignements.length; i++) {
                    matriceEnseignements.setElement(enseignements[i].idEnseignant(), "idEnseignant", i);
                    matriceEnseignements.setElement(enseignements[i].idDiscipline(), "idDiscipline", i);
                    matriceEnseignements.setElement(enseignements[i].idClasse(), "idClasse", i);
                    matriceEnseignements.setElement(enseignements[i].regime(), "regime", i);
                    matriceEnseignements.setElement(enseignements[i].anneeAcad(), "anneeAcad", i);
                    matriceEnseignements.setElement(enseignements[i].portee(), "portee", i);
                }
                console.log("===== MATRICE ENSEIGNEMENTS =====");
                console.log(matriceEnseignements);
            }
        };
    },

    Views: {}
};
