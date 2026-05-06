const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('exportXSL Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    // colonnes et lignes simulées
    m.getColonnes = () => ['A', 'B'];
    m.getLignes = () => ['L1', 'L2'];

    m.getElementsLigne = (ligne) => {
      return ligne === 'L1' ? [10, 20] : [30, 40];
    };

    // mock XLSX
    global.XLSX = {
      utils: {
        book_new: jest.fn(() => ({
          SheetNames: [],
          Sheets: {},
          Props: {}
        })),
        aoa_to_sheet: jest.fn(() => 'SHEET')
      },
      write: jest.fn(() => 'BINARY')
    };

    // mock saveAs
    global.saveAs = jest.fn();

    // mock helper
    m._s2ab = jest.fn(() => 'BUFFER');
  });

  test('exportXSL génère correctement les données Excel', () => {

    m.exportXSL('TestSheet');

    // ✔️ vérifie création sheet
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();

    // ✔️ vérifie écriture fichier
    expect(XLSX.write).toHaveBeenCalled();

    // ✔️ vérifie téléchargement
    expect(saveAs).toHaveBeenCalled();

  });

});