tools.AppLib = {
    constantes: {
        API_BASE_URL: 'http://localhost:8080'
    },

    Entities: {
        User: function (data) {
            tools.Library.Entity.call(this, data);

            this.id = function () {
                return this._getDataValue("id");
            }

            this.username = function () {
                return this._getDataValue("username");
            }

            this.email = function () {
                return this._getDataValue("email");
            }

            this.fullName = function () {
                return this._getDataValue("fullName");
            }

            this.role = function () {
                return this._getDataValue("role");
            }

            this.delegationRegion = function () {
                return this._getDataValue("delegationRegion");
            }

            this.department = function () {
                return this._getDataValue("department");
            }

            this.createdAt = function () {
                return this._getDataValue("createdAt");
            }
        },

        Establishment: function (data) {
            tools.Library.Entity.call(this, data);

            this.id = function () {
                return this._getDataValue("id");
            }

            this.code = function () {
                return this._getDataValue("code");
            }

            this.name = function () {
                return this._getDataValue("name");
            }

            this.city = function () {
                return this._getDataValue("city");
            }

            this.department = function () {
                return this._getDataValue("department");
            }

            this.delegationRegion = function () {
                return this._getDataValue("delegationRegion");
            }

            this.type = function () {
                return this._getDataValue("type");
            }

            this.createdAt = function () {
                return this._getDataValue("createdAt");
            }
        }
    },

    ContainerProto: {
        UsersContainer: function (users) {
            this.users = users;
            this.matrice = new tools.Library.Stats.Matrice();

            this.getMatriceRepresentation = function () {
                for (let i = 0; i < this.users.length; i++) {
                    const data = this.users[i].getData();

                    for (const attrib in data) {
                        if (Object.hasOwnProperty.call(data, attrib)) {
                            const element = data[attrib];
                            this.matrice.setElement(element, attrib, i);
                        }
                    }
                }

                return this.matrice;
            }

            this.getUsers = function () {
                return this.users;
            }
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

                console.log(" Appel API USERS:", url);

                // IMPORTANT : on passe directement httpRequest au framework
                this._requestFetchAll(
                    url,
                    httpRequest,
                    attribHTTP,
                    null,
                    []
                );
            }
        },

        EstablishmentManagers_AJAX: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);
            this.table = "Establishment";

            this.getEstablishments = function (httpRequest, attribHTTP) {
                const url = tools.AppLib.constantes.API_BASE_URL + "/establishments";

                console.log(" Appel API ESTABLISHMENTS:", url);

                // même logique ici
                this._requestFetchAll(
                    url,
                    httpRequest,
                    attribHTTP,
                    null,
                    []
                );
            }
        },

        EBackController: function (app, module, action) {
            tools.Library.BackController.call(this, app, module, action);
        }
    },
};