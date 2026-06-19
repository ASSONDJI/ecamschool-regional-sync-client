const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('moyenneCol Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();
    m.sommeCol = jest.fn();
    m.getElementsColonne = jest.fn();
  });

  test('retourne la moyenne correcte', () => {
    m.sommeCol.mockReturnValue(30);
    m.getElementsColonne.mockReturnValue([10, 10, 10]);

    const result = m.moyenneCol('colA');

    expect(m.sommeCol).toHaveBeenCalledWith('colA');
    expect(m.getElementsColonne).toHaveBeenCalledWith('colA');
    expect(result).toBe(10);
  });

  test('retourne la moyenne avec valeurs décimales', () => {
    m.sommeCol.mockReturnValue(10);
    m.getElementsColonne.mockReturnValue([2, 4, 4]);

    const result = m.moyenneCol('colB');

    expect(result).toBeCloseTo(3.33, 2);
  });

  test('retourne NaN si la colonne est vide', () => {
    m.sommeCol.mockReturnValue(0);
    m.getElementsColonne.mockReturnValue([]);

    const result = m.moyenneCol('colVide');

    expect(isNaN(result)).toBe(true);
  });

  test('retourne 0 si somme est 0', () => {
    m.sommeCol.mockReturnValue(0);
    m.getElementsColonne.mockReturnValue([0, 0, 0]);

    const result = m.moyenneCol('colZero');

    expect(result).toBe(0);
  });

});