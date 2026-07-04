tools.AppLib = {

    constantes: {
        API_BASE_URL: 'http://localhost:8080',
        JSON_ENSEIGNEMENTS: 'uds-server/enseignements.json'
    },

    Entities: {

        User: function (data) {
            tools.Library.Entity.call(this, data);
            this.id = function () { return this._getDataValue("id"); };
            this.username = function () { return this._getDataValue("username"); };
            this.role = function () { return this._getDataValue("role"); };
            this.fullName = function () { return this._getDataValue("fullName"); };
            this.email = function () { return this._getDataValue("email"); };
        },

        Establishment: function (data) {
            tools.Library.Entity.call(this, data);
            this.id = function () { return this._getDataValue("id"); };
            this.name = function () { return this._getDataValue("name"); };
            this.code = function () { return this._getDataValue("code"); };
            this.city = function () { return this._getDataValue("city"); };
            this.type = function () { return this._getDataValue("type"); };
        },

        Enseignement: function (data) {
            tools.Library.Entity.call(this, data);
            this.id = function () { return this._getDataValue("id"); };
            this.idEnseignant = function () { return this._getDataValue("idEnseignant"); };
            this.idDiscipline = function () { return this._getDataValue("idDiscipline"); };
            this.idClasse = function () { return this._getDataValue("idClasse"); };
            this.regime = function () { return this._getDataValue("regime"); };
            this.nbreHeures = function () { return this._getDataValue("nbreHeures"); };
            this.nbreHeuresTP = function () { return this._getDataValue("nbreHeuresTP"); };
            this.anneeAcad = function () { return this._getDataValue("anneeAcad"); };
            this.portee = function () { return this._getDataValue("portee"); };
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
        },

        EnseignementContainer: function (dao) {
            tools.Library.Container_mat.call(this, dao);
            this.table = "Enseignement";
        }
    },

    Models: {

        // --------------------------------------------------
        // UserManagers_AJAX
        // Appel backend via _requestFetchAll (framework natif)
        // --------------------------------------------------
        UserManagers_AJAX: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);
            this.table = "User";

            this.getUsers = function (httpRequest, attribHTTP) {
                const url = tools.AppLib.constantes.API_BASE_URL + "/users";
                console.log("[UserManagers_AJAX] getUsers →", url);
                this._requestFetchAll(url, httpRequest, attribHTTP, null, []);
            };
        },

        // --------------------------------------------------
        // EstablishmentManagers_AJAX
        // Appel backend via _requestFetchAll (framework natif)
        // --------------------------------------------------
        EstablishmentManagers_AJAX: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);
            this.table = "Establishment";

            this.getEstablishments = function (httpRequest, attribHTTP) {
                const url = tools.AppLib.constantes.API_BASE_URL + "/establishments";
                console.log("[EstablishmentManagers_AJAX] getEstablishments →", url);
                this._requestFetchAll(url, httpRequest, attribHTTP, null, []);
            };
        },

        // --------------------------------------------------
        // EnseignementManagers_AJAX
        // COMMENTÉ pour l'instant — on valide d'abord User
        // et Establishment avec le backend, puis on branche
        // Enseignement avec le fichier JSON local + SwRouter
        // --------------------------------------------------
        EnseignementManagers_AJAX: function (api, dao) {
            tools.Library.Managers_api.call(this, api, dao);
            this.table = "Enseignement";

            this.getEnseignements = function (httpRequest, attribHTTP) {

                /*
                // ── MODE PRODUCTION (backend) ──────────────────
                const url = tools.AppLib.constantes.API_BASE_URL + "/enseignements";
                this._requestFetchAll(url, httpRequest, attribHTTP, null, []);
                */

                // ── MODE TEST (fichier JSON local) ─────────────
                let context = this;
                let urlLocal = tools.AppLib.constantes.JSON_ENSEIGNEMENTS;
                console.log("[EnseignementManagers_AJAX] lecture JSON local →", urlLocal);

                $.getJSON(urlLocal, function (reponse) {
                    console.log("[EnseignementManagers_AJAX]", reponse.length, "enseignements chargés");
                    context.dao.updateTable(urlLocal, context.table, reponse, []);
                    httpRequest.setAttribute(
                        attribHTTP,
                        context.dao.getElementsIndexUri(context.table, urlLocal)
                    );
                    httpRequest.chainActivate();

                }).fail(function (jqXHR, textStatus, error) {
                    console.error("[EnseignementManagers_AJAX] Erreur JSON :", error);
                    alert("Impossible de charger enseignements.json : " + error);
                });
            };
        }
    },

    EBackController: function (app, module, action) {
        tools.Library.BackController.call(this, app, module, action);

        // --------------------------------------------------
        // Exposer le DelegateComponent et le SwRouter
        // globalement via tools.AppLib — UNIQUEMENT si l'ancien
        // mécanisme est encore présent (voir Étape 9 du plan de
        // migration Service Worker). Depuis cette étape, app.js
        // n'utilise plus tools.AppLib.delegate : il fait des
        // appels réseau directs, interceptés par sw.js.
        // --------------------------------------------------
        if (this.swRouter) {
            tools.AppLib.delegate  = this.swRouter.delegate;
            tools.AppLib.swRouter  = this.swRouter;
            console.log("[EBackController] delegate et swRouter exposés dans tools.AppLib (ancien mécanisme encore présent)");
        } else {
            console.log("[EBackController] Ancien mécanisme SwRouter absent — gestion offline déléguée au Service Worker.");
        }
    }

};
