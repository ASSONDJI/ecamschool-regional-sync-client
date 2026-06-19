const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('ligneExist Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();
  });

  test('retourne true si la ligne existe', () => {
    m.lignes = ['ligne1', 'ligne2', 'ligne3'];
    expect(m.ligneExist('ligne1')).toBe(true);
    expect(m.ligneExist('ligne2')).toBe(true);
  });

  test('retourne false si la ligne n existe pas', () => {
    m.lignes = ['ligne1', 'ligne2'];
    expect(m.ligneExist('ligneX')).toBe(false);
  });

  test('retourne false si lignes est vide', () => {
    m.lignes = [];
    expect(m.ligneExist('ligne1')).toBe(false);
  });

  test('est sensible à la casse', () => {
    m.lignes = ['Ligne1'];
    expect(m.ligneExist('ligne1')).toBe(false);
    expect(m.ligneExist('Ligne1')).toBe(true);
  });

});