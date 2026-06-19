const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('moyenneFromMatrices Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();
    m.getColonnes = jest.fn(() => ['col1', 'col2']);
    m.getColIndex = jest.fn((colName) => colName === 'col1' ? 0 : 1);
    m.getLignes = jest.fn(() => ['ligne1', 'ligne2']);
    m.getGroupPolice = jest.fn(() => '+');
    m.getElement = jest.fn(() => 10);
    m._moyenneValues = jest.fn(() => 15);
    m.setElement = jest.fn();
  });

  test('appelle setElement pour chaque cellule non-id', () => {
    const mat2 = { getElement: jest.fn(() => 20) };

    m.moyenneFromMatrices([mat2]);

    // 2 colonnes x 2 lignes = 4 appels
    expect(m.setElement).toHaveBeenCalledTimes(4);
  });

  test('ignore les colonnes avec police "id"', () => {
    m.getGroupPolice = jest.fn((indexCol) => indexCol === 0 ? 'id' : '+');

    const mat2 = { getElement: jest.fn(() => 20) };

    m.moyenneFromMatrices([mat2]);

    // seulement col2 (1 colonne x 2 lignes = 2 appels)
    expect(m.setElement).toHaveBeenCalledTimes(2);
  });

  test('passe les bons éléments à _moyenneValues', () => {
    m.getElement = jest.fn(() => 10);
    const mat2 = { getElement: jest.fn(() => 20) };

    m.moyenneFromMatrices([mat2]);

    // elements = [elt_this, elt_mat2] = [10, 20]
    expect(m._moyenneValues).toHaveBeenCalledWith([10, 20], '+');
  });

  test('fonctionne avec un tableau de matrices vide', () => {
    m.moyenneFromMatrices([]);

    // elements = [elt] seulement, _moyenneValues appelé quand même
    expect(m._moyenneValues).toHaveBeenCalledWith([10], '+');
    expect(m.setElement).toHaveBeenCalled();
  });

  test('passe la police correcte à _moyenneValues', () => {
    m.getGroupPolice = jest.fn(() => '*');
    const mat2 = { getElement: jest.fn(() => 5) };

    m.moyenneFromMatrices([mat2]);

    expect(m._moyenneValues).toHaveBeenCalledWith(expect.any(Array), '*');
  });

});