const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonneMap - test réel', () => {

  test('multiplie chaque valeur par 2', () => {

    const matrice = new Stats.Matrice();

    // 🔧 initialisation
    matrice.colonnes = ['A'];
    matrice.lignes = [0, 1, 2];

    // stockage des données réel
    matrice.data = {
      'A': [1, 2, 3]
    };

    // redéfinition minimale des méthodes nécessaires
    matrice.getLignes = function() {
      return this.lignes;
    };

    matrice.getElementsColonne = function(colName) {
      return this.data[colName];
    };

    matrice.getElementsLigne = function(index) {
      return [this.data['A'][index]];
    };

    matrice.setElement = function(value, colName, ligne) {
      this.data[colName][ligne] = value;
    };

    //  transformation
    matrice.applyColonneMap('A', (val) => val * 2);

    // vérification
    expect(matrice.data['A']).toEqual([2, 4, 6]);
  });

});