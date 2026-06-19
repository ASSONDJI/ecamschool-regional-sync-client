const Stats = require('../tools-3.5.library.stats.matrice.js');
describe('addGroupPolice Tests', () => {

    let m;
  
    beforeEach(() => {
      m = new Stats.Matrice();
  
      // colonnes simulées
      m.colonnes = ['A', 'B', 'C'];
  
      // mock index
      m.getColIndex = (name) => {
        const map = { A: 0, B: 1, C: 2 };
        return map[name];
      };
    });
  
    test('ajoute police sur toutes les colonnes', () => {
  
      m.addGroupPolice('*');
  
      expect(m.groupPolice[0]).toBe('*');
      expect(m.groupPolice[1]).toBe('*');
      expect(m.groupPolice[2]).toBe('*');
    });
  
    test('ajoute police sur colonnes spécifiques', () => {
  
      m.addGroupPolice('+', ['A', 'C']);
  
      expect(m.groupPolice[0]).toBe('+');
      expect(m.groupPolice[2]).toBe('+');
  
      expect(m.groupPolice[1]).toBeUndefined();
    });
  
  });