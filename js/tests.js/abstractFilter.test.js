const Stats = require('../tools-3.5.library.stats.matrice.js'); 

describe('AbstractFilter Tests', () => {

  test('MIN filter', () => {
    const f = new Stats.Filter.AbstractFilter("MIN", 10);
    expect(f.applyFilter(5)).toBe(true);
    expect(f.applyFilter(15)).toBe(false);
  });

  test('MAX filter', () => {
    const f = new Stats.Filter.AbstractFilter("MAX", 10);
    expect(f.applyFilter(15)).toBe(true);
    expect(f.applyFilter(5)).toBe(false);
  });

  test('EQUAL filter', () => {
    const f = new Stats.Filter.AbstractFilter("EQUAL", 10);
    expect(f.applyFilter(10)).toBe(true);
    expect(f.applyFilter(9)).toBe(false);
  });

  test('DIFF filter', () => {
    const f = new Stats.Filter.AbstractFilter("DIFF", 10);
    expect(f.applyFilter(5)).toBe(true);
    expect(f.applyFilter(10)).toBe(false);
  });

  test('MIN_EQUAL filter', () => {
    const f = new Stats.Filter.AbstractFilter("MIN_EQUAL", 10);
    expect(f.applyFilter(5)).toBe(true);
    expect(f.applyFilter(10)).toBe(true);
    expect(f.applyFilter(15)).toBe(false);
  });

  test('MAX_EQUAL filter', () => {
    const f = new Stats.Filter.AbstractFilter("MAX_EQUAL", 10);
    expect(f.applyFilter(15)).toBe(true);
    expect(f.applyFilter(10)).toBe(true);
    expect(f.applyFilter(5)).toBe(false);
  });

  test('BETWEEN filter', () => {
    const f = new Stats.Filter.AbstractFilter("BETWEEN", 10, 20);
    expect(f.applyFilter(15)).toBe(true);
    expect(f.applyFilter(10)).toBe(false);
    expect(f.applyFilter(20)).toBe(false);
  });

  test('filterUniqueContent fonctionne', () => {
    const f = new Stats.Filter.AbstractFilter("EQUAL", 10);

    expect(f.filterUniqueContent(5)).toBe(true);
    expect(f.filterUniqueContent(5)).toBe(false);
  });

});