const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('productScallar Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();
  });

  test('multiplie chaque élément par le scalaire', () => {
    m.setElement(10, 'col1', 'ligne1');
    m.setElement(20, 'col1', 'ligne2');
    m.setElement(5,  'col2', 'ligne1');
    m.setElement(15, 'col2', 'ligne2');

    const result = m.productScallar(2);

    expect(result.getElement('col1', 'ligne1')).toBe(20);
    expect(result.getElement('col1', 'ligne2')).toBe(40);
    expect(result.getElement('col2', 'ligne1')).toBe(10);
    expect(result.getElement('col2', 'ligne2')).toBe(30);
  });

  test('retourne une nouvelle matrice sans modifier l originale', () => {
    m.setElement(10, 'col1', 'ligne1');

    const result = m.productScallar(3);

    expect(result).not.toBe(m);
    expect(m.getElement('col1', 'ligne1')).toBe(10); // originale inchangée
    expect(result.getElement('col1', 'ligne1')).toBe(30);
  });

  test('multiplie par 0 retourne des zéros', () => {
    m.setElement(10, 'col1', 'ligne1');
    m.setElement(99, 'col2', 'ligne1');

    const result = m.productScallar(0);

    expect(result.getElement('col1', 'ligne1')).toBe(0);
    expect(result.getElement('col2', 'ligne1')).toBe(0);
  });

  test('multiplie par 1 retourne les mêmes valeurs', () => {
    m.setElement(42, 'col1', 'ligne1');

    const result = m.productScallar(1);

    expect(result.getElement('col1', 'ligne1')).toBe(42);
  });

  test('multiplie par un scalaire négatif', () => {
    m.setElement(10, 'col1', 'ligne1');

    const result = m.productScallar(-3);

    expect(result.getElement('col1', 'ligne1')).toBe(-30);
  });

  test('retourne une matrice vide si la matrice source est vide', () => {
    const result = m.productScallar(5);

    expect(result.getColonnes().length).toBe(0);
    expect(result.getLignes().length).toBe(0);
  });

});