const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonneMapCell - test réel', () => {

  test('met en majuscule les valeurs', () => {

    const matrice = new Stats.Matrice();

    //  initialisation
    matrice.colonnes = ['A'];
    matrice.lignes = [0, 1, 2];

    matrice.data = {
      'A': ['a', 'b', 'c']
    };

    //  méthodes nécessaires
    matrice.getLignes = function() {
      return this.lignes;
    };

    matrice.getElementsColonne = function(colName) {
      return this.data[colName];
    };

    matrice.setElement = function(value, colName, ligne) {
      this.data[colName][ligne] = value;
    };

    // transformation
    matrice.applyColonneMapCell('A', (val) => val.toUpperCase());

    //  vérification
    expect(matrice.data['A']).toEqual(['A', 'B', 'C']);
  });

});