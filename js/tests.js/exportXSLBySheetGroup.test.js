const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('exportXSLBySheetGroupSum Tests', () => {

  let m;

  beforeEach(() => {
    m = new Stats.Matrice();

    m.getColIndex = jest.fn(() => 0);

    m._groupIndexColsNames = [
      ['G1', 'G2']
    ];

    m.getConfigGroupExportSchemes = jest.fn(() => 'FINAL_CONFIG');

    // mock XLSX (sécurité)
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
  });

  test('génère une configuration d export par groupe', () => {

    const result = m.exportXSLBySheetGroupSum(
      'GROUP',
      ['A', 'B'],
      'fileTest'
    );

    expect(m.getConfigGroupExportSchemes).toHaveBeenCalled();
    expect(result).toBe('FINAL_CONFIG');

  });

});