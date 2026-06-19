const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('addDeriveColFrom Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    // Colonnes existantes
    m.colonnes = ['A', 'B'];

    // Lignes
    m.lignes = ['L1', 'L2'];

    // Mock fonctions nécessaires
    m.getLignes = () => ['L1', 'L2'];

    m.getElement = (col, ligne) => {
      const data = {
        L1: { A: 10, B: 5 },
        L2: { A: 20, B: 3 }
      };
      return data[ligne][col];
    };

    // Espion (très important)
    m.setElement = jest.fn();
  });

  test('calcule correctement une colonne dérivée (somme)', () => {

    m.addDeriveColFrom(
      'C',
      ['A', 'B'],
      (values) => values[0] + values[1]
    );

    // Vérifie uniquement la logique (pas la structure)
    expect(m.setElement).toHaveBeenCalledWith(15, 'C', 'L1');
    expect(m.setElement).toHaveBeenCalledWith(23, 'C', 'L2');

  });

});