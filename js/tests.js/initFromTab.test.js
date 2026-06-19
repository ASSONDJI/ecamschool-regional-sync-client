const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('initFromTab Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();
    m.setElement = jest.fn();
  });

  test('appelle setElement pour chaque cellule du tableau', () => {
    const tab = {
      'ligne1': { 'col1': 'val1', 'col2': 'val2' },
      'ligne2': { 'col1': 'val3', 'col2': 'val4' }
    };

    m.initFromTab(tab);

    expect(m.setElement).toHaveBeenCalledTimes(4);
    expect(m.setElement).toHaveBeenCalledWith('val1', 'col1', 'ligne1');
    expect(m.setElement).toHaveBeenCalledWith('val2', 'col2', 'ligne1');
    expect(m.setElement).toHaveBeenCalledWith('val3', 'col1', 'ligne2');
    expect(m.setElement).toHaveBeenCalledWith('val4', 'col2', 'ligne2');
  });

  test('ne fait rien si le tableau est vide', () => {
    m.initFromTab({});
    expect(m.setElement).not.toHaveBeenCalled();
  });

  test('ignore les lignes sans colonnes', () => {
    const tab = {
      'ligne1': {}
    };

    m.initFromTab(tab);
    expect(m.setElement).not.toHaveBeenCalled();
  });

  test('gère une seule ligne avec une seule colonne', () => {
    const tab = {
      'ligneA': { 'colX': 42 }
    };

    m.initFromTab(tab);

    expect(m.setElement).toHaveBeenCalledTimes(1);
    expect(m.setElement).toHaveBeenCalledWith(42, 'colX', 'ligneA');
  });

  test('passe correctement les valeurs null à setElement', () => {
    const tab = {
      'ligne1': { 'col1': null }
    };

    m.initFromTab(tab);

    // setElement est appelé, c'est à setElement de gérer le null
    expect(m.setElement).toHaveBeenCalledWith(null, 'col1', 'ligne1');
  });

});