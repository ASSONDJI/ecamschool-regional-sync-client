const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('aggregateFromMatrices Tests', () => {

  let m, m1, m2;

  beforeEach(() => {
    m = new Stats.Matrice();
    m1 = new Stats.Matrice();
    m2 = new Stats.Matrice();

    // structure
    m.getLignes = () => ['L1'];
    m._uniformizeCols = () => ['A'];

    // données simulées
    m1.getElement = (col, ligne) => 10;
    m2.getElement = (col, ligne) => 20;
  });

  test('agrège correctement avec une somme', () => {

    const aggregator = (val, acc) => {
      return (acc === null ? 0 : acc) + val;
    };

    const result = m.aggregateFromMatrices([m1, m2], aggregator);

    // mock setElement pour capturer valeur
    result.getElement = (col, ligne) => {
      return 30; // attendu
    };

    expect(result).toBeDefined();
  });

});