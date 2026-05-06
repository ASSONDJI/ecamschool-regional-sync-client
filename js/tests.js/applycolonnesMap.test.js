const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonnesMap', () => {

  test('applique map sur plusieurs colonnes', () => {

    const matrice = new Stats.Matrice();

    // mock
    matrice.applyColonneMap = jest.fn();

    const mapFunction = (x) => x * 2;

    //  appel
    matrice.applyColonnesMap(['A', 'B', 'C'], mapFunction);

    // vérifications
    expect(matrice.applyColonneMap).toHaveBeenCalledTimes(3);

    expect(matrice.applyColonneMap).toHaveBeenCalledWith('A', mapFunction);
    expect(matrice.applyColonneMap).toHaveBeenCalledWith('B', mapFunction);
    expect(matrice.applyColonneMap).toHaveBeenCalledWith('C', mapFunction);

  });

});