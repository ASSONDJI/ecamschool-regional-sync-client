const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('exportXSLWithColsNames Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

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

    global.saveAs = jest.fn();
    m._s2ab = jest.fn(() => 'BUFFER');
  });

  test('exportXSLWithColsNames utilise les colonnes passées en paramètre', () => {

    const cols = ['Nom', 'Prenom'];

    m.exportXSLWithColsNames(cols, 'SheetTest');

    // ✔️ vérifie que XLSX reçoit bien les données
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();

    // ✔️ vérifie écriture fichier
    expect(XLSX.write).toHaveBeenCalled();

    // ✔️ vérifie téléchargement
    expect(saveAs).toHaveBeenCalled();

    // ✔️ vérifie que les colonnes utilisées sont celles du paramètre
    const wsData = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    expect(wsData[0]).toEqual(cols);

  });

});