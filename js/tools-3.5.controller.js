tools.Applications.Frontend.Modules.Rh = {
  DataLoad: {
    ActionIndex: {
      loadTest: function (httpRequest) {
        let managers = httpRequest
          .getApp()
          .getCurrentController()
          .getManagers();
        managers.getManagerOf("User").getUsers(httpRequest, "users");
        managers
          .getManagerOf("Establishment")
          .getEstablishments(httpRequest, "establishments");
        managers
          .getManagerOf("DataMatrix")
          .getDataMatrices(httpRequest, "dataMatrices");
      },
    },
  },

  RhController: function (app, module, action) {
    tools.AppLib.EBackController.call(this, app, module, action);

    this.executeIndex = function (httpRequest) {
      let users = httpRequest.getAttribute("users");
      let establishments = httpRequest.getAttribute("establishments");
      let dataMatrices = httpRequest.getAttribute("dataMatrices");

      let matrice = new tools.Library.Stats.Matrice();
      let index = 0;

      // Utilisateurs : indices 0 à 99
      if (users) {
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          matrice.setElement(user.username, "username", index);
          matrice.setElement(user.email, "email", index);
          matrice.setElement(user.role, "role", index);
          matrice.setElement(user.fullName, "fullName", index);
          matrice.setElement(user.delegationRegion, "delegationRegion", index);
          index++;
        }
        console.log(users.length + " utilisateurs charges");
      }

      // Établissements : indices 100 à 199
      if (establishments) {
        for (let i = 0; i < establishments.length; i++) {
          const etab = establishments[i];
          matrice.setElement(etab.code, "code", index);
          matrice.setElement(etab.name, "name", index);
          matrice.setElement(etab.city, "city", index);
          matrice.setElement(etab.delegationRegion, "delegationRegion", index);
          index++;
        }
        console.log(establishments.length + " etablissements charges");
      }

      // Données : indices 200 à 299
      if (dataMatrices) {
        for (let i = 0; i < dataMatrices.length; i++) {
          const data = dataMatrices[i];
          matrice.setElement(data.clientKey, "clientKey", index);
          matrice.setElement(data.syncStatus, "syncStatus", index);
          matrice.setElement(data.dataType, "dataType", index);
          index++;
        }
        console.log(dataMatrices.length + " donnees chargees");
      }

      console.log("Matrice:", matrice);
      console.log("Colonnes:", matrice.getColonnes());
      console.log("Lignes:", matrice.getLignes());

      window.appMatrix = matrice;
    };

    this.getManagers = function () {
      return {
        getManagerOf: function (entityName) {
          switch (entityName) {
            case "Personne":
              return new tools.AppLib.Models.PersonneManagers_AJAX();
            case "Enseignement":
              return new tools.AppLib.Models.EnseignementManagers_AJAX();
            case "User":
              return new tools.AppLib.Models.UserManagers_AJAX();
            case "Establishment":
              return new tools.AppLib.Models.EstablishmentManagers_AJAX();
            case "DataMatrix":
              return new tools.AppLib.Models.DataMatrixManagers_AJAX();
            default:
              return null;
          }
        },
      };
    };
  },

  Views: {},
};
