const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('exportXSLMap Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    // lignes simulées
    m.getLignes = () => ['L1', 'L2'];

    // colonnes simulées
    m.getColonnes = () => ['A', 'B'];

    // valeurs ligne
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

    global.saveAs = jest.fn();

    // mock s2ab global car utilisé dans fonction
    global.s2ab = jest.fn(() => 'BUFFER');
  });

  test('exportXSLMap applique mapCell, mapRow et mapCol correctement', () => {

    const mapCell = jest.fn((v) => v * 2);
    const mapRow = jest.fn((r) => `ROW_${r}`);
    const mapCol = jest.fn((c) => `COL_${c}`);

    m.exportXSLMap(mapCell, mapRow, mapCol, 'SheetMap');

    // ✔️ XLSX appelé
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();

    // ✔️ export déclenché
    expect(XLSX.write).toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalled();

    // ✔️ mapCol utilisé
    expect(mapCol).toHaveBeenCalled();

    // ✔️ mapRow utilisé
    expect(mapRow).toHaveBeenCalled();

    // ✔️ mapCell utilisé
    expect(mapCell).toHaveBeenCalled();

  });

});