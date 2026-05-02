tools.Applications.Frontend.Modules.Rh = {
    DataLoad: {
        ActionIndex: {
            loadTest: function (httpRequest) {
                let managers = httpRequest.getApp().getCurrentController().getManagers();

                // Charger USERS depuis backend
                managers.getManagerOf("User").getUsers(httpRequest, "users");

                // Charger ESTABLISHMENTS depuis backend
                managers.getManagerOf("Establishment").getEstablishments(httpRequest, "establishments");
            }
        }
    },

    RhController: function (app, module, action) {
        if (tools.AppLib && tools.AppLib.EBackController) {
            tools.AppLib.EBackController.call(this, app, module, action);
        } else {
            console.error("EBackController ou BackController manquant", tools.Library);
        }

        this.executeIndex = function (httpRequest) {

            let users = httpRequest.getAttribute("users");
            let establishments = httpRequest.getAttribute("establishments");

            console.log("===== USERS (JSON BACKEND) =====");
            console.log(users);

            console.log("===== ESTABLISHMENTS (JSON BACKEND) =====");
            console.log(establishments);


            //  Exemple avec matrice pour USERS
            let matriceUsers = new tools.Library.Stats.Matrice();

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                matriceUsers.setElement(user.getData().username, "username", i);
                matriceUsers.setElement(user.getData().role, "role", i);
            }

            console.log("===== MATRICE USERS =====");
            console.log(matriceUsers);


            //  Exemple avec matrice pour ESTABLISHMENTS
            let matriceEstablishments = new tools.Library.Stats.Matrice();

            for (let i = 0; i < establishments.length; i++) {
                const est = establishments[i];

                matriceEstablishments.setElement(est.getData().name, "name", i);
                matriceEstablishments.setElement(est.getData().city, "city", i);
            }

            console.log("===== MATRICE ESTABLISHMENTS =====");
            console.log(matriceEstablishments);
        }
    },

    Views: {}
};