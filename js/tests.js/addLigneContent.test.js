const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('addLigneContent Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    m.colonnes = ['A', 'B', 'C'];

    // mock setElement
    m.setElement = jest.fn();
  });

  test('ajoute du contenu dans une ligne pour colonnes spécifiques', () => {

    m.addLigneContent(
      ['A', 'C'],     // colonnes ciblées
      'L1',           // ligne
      [10, 30]        // valeurs correspondantes
    );

    // vérifie les appels
    expect(m.setElement).toHaveBeenCalledWith(10, 'A', 'L1');
    expect(m.setElement).toHaveBeenCalledWith(30, 'C', 'L1');

  });

});