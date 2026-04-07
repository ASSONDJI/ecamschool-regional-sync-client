tools.AppLib = {
  constantes: {
    API_BASE_URL: "http://localhost:8080",
  },
  Entities: {
    Personne: function (data) {
      tools.Library.Entity.call(this, data);

      this.nom = function () {
        return this._getDataValue("nom");
      };

      this.prenom = function () {
        return this._getDataValue("prenom");
      };

      this.nomPere = function () {
        return this._getDataValue("nomPere");
      };

      this.nomMere = function () {
        return this._getDataValue("nomMere");
      };

      this.dateNaiss = function () {
        return this._getDataValue("dateNaiss");
      };

      this.lieuNaiss = function () {
        return this._getDataValue("lieuNaiss");
      };

      this.sexe = function () {
        return this._getDataValue("sexe");
      };

      this.profileImage = function () {
        return this._getDataValue("profileImage");
      };

      this.telephone = function () {
        return this._getDataValue("telephone");
      };
    },
  },
  ContainerProto: {
    PersonnesContainer: function (personnes) {
      this.personnes = personnes;
      this.matrice = new tools.Library.Stats.Matrice();

      // Representation matricielle de la liste de personnes Tranchehoraire
      this.getMatriceRepresentation = function () {
        for (let i = 0; i < this.personnes.length; i++) {
          const data = this.personnes[i].getData();
          for (const attrib in data) {
            if (Object.hasOwnProperty.call(data, attrib)) {
              const element = data[attrib];
              this.matrice.setElement(element, attrib, i);
            }
          }
        }

        return this.matrice;
      };

      this.getPersonnes = function () {
        return this.personnes;
      };
    },
  },
  Container: {
    PersonneContainer: function (dao) {
      tools.Library.Container_mat.call(this, dao);
      this.table = "Personne";
    },
  },
  Models: {
    PersonneManagers_AJAX: function (api, dao) {
        tools.Library.Managers_api.call(this, api, dao);
        this.table = "Personne";

        this.fromContext = function (httpRequest, attribHTTP) {
            this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/personnes.json", httpRequest, attribHTTP, null);
        }
    },
    
    
    UsersManagers_AJAX: function (api, dao) {
        tools.Library.Managers_api.call(this, api, dao);
        this.table = "User";

        this.fromContext = function (httpRequest, attribHTTP) {
            this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/users", httpRequest, attribHTTP, null);
        }
    },
    
    EstablishmentsManagers_AJAX: function (api, dao) {
        tools.Library.Managers_api.call(this, api, dao);
        this.table = "Establishment";

        this.fromContext = function (httpRequest, attribHTTP) {
            this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/establishments", httpRequest, attribHTTP, null);
        }
    },
    
    DataMatrixManagers_AJAX: function (api, dao) {
        tools.Library.Managers_api.call(this, api, dao);
        this.table = "DataMatrix";

        this.fromContext = function (httpRequest, attribHTTP) {
            this._requestFetchAll(tools.AppLib.constantes.API_BASE_URL + "/data-matrix", httpRequest, attribHTTP, null);
        }
    }
},
  EBackController: function (app, module, action) {
    tools.Library.BackController.call(this, app, module, action);
  },
};
