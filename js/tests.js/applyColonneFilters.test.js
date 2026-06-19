const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonneFilters Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    // colonnes et lignes
    m.colonnes = ['A'];
    m.lignes = ['L1', 'L2', 'L3'];

    // mock index colonne
    m.getColIndex = () => 0;

    // mock éléments colonne
    m.getElementsColonne = () => [5, 10, 15];

    // filtre simulé (> 8)
    const fakeFilter = {
      applyFilter: (val) => val > 8
    };

    // appliquer filtre sur colonne A
    m.filter = [];
    m.filter[0] = [fakeFilter];
  });

  test('filtre correctement les lignes', () => {

    const result = m.applyColonneFilters('A', ['L1', 'L2', 'L3']);

    // L1 = 5 ❌
    // L2 = 10 
    // L3 = 15 

    expect(result[1]).toBe('L2');
    expect(result[2]).toBe('L3');

    // L1 doit être filtrée
    expect(result[0]).toBeUndefined();

  });

});