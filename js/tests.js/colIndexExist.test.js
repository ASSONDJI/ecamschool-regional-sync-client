const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('getElementsColonnesIndexsDoubleEntries Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    // mock colonnes
    m.colonnes = ['A', 'B', 'C'];

    // mock index
    m.getColIndex = (name) => {
      const map = { A: 0, B: 1, C: 2 };
      return map[name];
    };

    // mock existence
    m.colIndexExist = (name) => {
      return ['A', 'B', 'C'].includes(name);
    };
  });

  test('retourne colonnes et valeurs correspondantes', () => {

    const cols = ['A', 'B', 'C'];

    const lignesElements = {
      0: 10,
      2: 30
    };

    const result = m.getElementsColonnesIndexsDoubleEntries(cols, lignesElements);

    // colonnes correspondantes
    expect(result[0]).toEqual(['A', 'C']);

    // valeurs correspondantes
    expect(result[1]).toEqual([10, 30]);

  });

});