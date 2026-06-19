const Stats = require('../tools-3.5.library.stats.matrice.js');
describe('addFilter Tests', () => {

    let m;
    let fakeFilter;
  
    beforeEach(() => {
      m = new Stats.Matrice();
  
      // colonnes simulées
      m.colonnes = ['A', 'B', 'C'];
  
      // filtre fake
      fakeFilter = {
        applyFilter: jest.fn(() => true)
      };
    });
  
    test('ajoute un filtre sur toutes les colonnes', () => {
  
      m.addFilter(fakeFilter);
  
      // le filtre doit être ajouté à chaque colonne
      expect(m.filter[0]).toContain(fakeFilter);
      expect(m.filter[1]).toContain(fakeFilter);
      expect(m.filter[2]).toContain(fakeFilter);
    });
  
    test('ajoute un filtre sur colonnes spécifiques', () => {
  
      m.addFilter(fakeFilter, ['A', 'C']);
  
      expect(m.filter[0]).toContain(fakeFilter);
      expect(m.filter[2]).toContain(fakeFilter);
  
      // colonne B ne doit pas avoir le filtre
      expect(m.filter[1]).toBeUndefined();
    });
  
  });