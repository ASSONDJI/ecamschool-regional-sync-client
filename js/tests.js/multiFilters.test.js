const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonnesFilters', () => {

  test('applique plusieurs filtres successifs', () => {

    const matrice = new Stats.Matrice();

    // mock intelligent
    matrice.applyColonneFilters = jest.fn()
      .mockImplementationOnce(() => [0, 1])  // filtre 1
      .mockImplementationOnce(() => [1]);    // filtre 2

    const result = matrice.applyColonnesFilters(['A', 'B'], [0, 1, 2]);

    //  vérification
    expect(result).toEqual([1]);

    // vérifie que la fonction a été appelée 2 fois
    expect(matrice.applyColonneFilters).toHaveBeenCalledTimes(2);
  });

});  