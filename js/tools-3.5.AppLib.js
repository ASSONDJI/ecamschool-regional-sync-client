tools.AppLib = {
    constantes: {
        API_BASE_URL: 'http://localhost:8080'
    },

    Entities: {
        User: function (data) {
            tools.Library.Entity.call(this, data);

            this.id = function () {
                return this._getDataValue("id");
            };

            this.username = function () {
                return this._getDataValue("username");
            };
        },

        Establishment: function (data) {
            tools.Library.Entity.call(this, data);

            this.id = function () {
                return this._getDataValue("id");
            };

            this.name = function () {
                return this._getDataValue("name");
            };
        }
    },

    Container: {

        UserContainer: function (dao) {
            tools.Library.Container_mat.call(this, dao);
            this.table = "User";
        },

        EstablishmentContainer: function (dao) {
            tools.Library.Container_mat.call(this, dao);
            this.table = "Establishment";
        }

    },

    Models: {

        UserManagers_AJAX: function (api, dao) {

            tools.Library.Managers_api.call(this, api, dao);

            this.table = "User";

            this.getUsers = function (httpRequest, attribHTTP) {

                const url = tools.AppLib.constantes.API_BASE_URL + "/users";

                console.log("Appel API USERS:", url);

                this._requestFetchAll(
                    url,
                    httpRequest,
                    attribHTTP,
                    null,
                    []
                );
            };
        },

        EstablishmentManagers_AJAX: function (api, dao) {

            tools.Library.Managers_api.call(this, api, dao);

            this.table = "Establishment";

            this.getEstablishments = function (httpRequest, attribHTTP) {

                const url = tools.AppLib.constantes.API_BASE_URL + "/establishments";

                console.log("Appel API ESTABLISHMENTS:", url);

                this._requestFetchAll(
                    url,
                    httpRequest,
                    attribHTTP,
                    null,
                    []
                );
            };
        }

    },

    // IMPORTANT : EN DEHORS DE Models
    EBackController: function (app, module, action) {

        tools.Library.BackController.call(
            this,
            app,
            module,
            action
        );
    }

};
