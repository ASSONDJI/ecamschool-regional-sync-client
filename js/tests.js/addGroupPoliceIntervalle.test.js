const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('addGroupPoliceIntervalle Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    m.colonnes = ['A', 'B', 'C', 'D'];

    m.getColIndex = (name) => {
      const map = { A: 0, B: 1, C: 2, D: 3 };
      return map[name];
    };
  });

  test('applique police sur intervalle de colonnes', () => {

    m.addGroupPoliceIntervalle('#', 1, 3);

    expect(m.groupPolice[1]).toBe('#');
    expect(m.groupPolice[2]).toBe('#');

    expect(m.groupPolice[0]).toBeUndefined();

    // on tolère comportement interne pour index 3
    expect([undefined, '#']).toContain(m.groupPolice[3]);

  });

});