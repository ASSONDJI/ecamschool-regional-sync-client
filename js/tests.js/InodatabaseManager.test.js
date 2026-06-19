const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('EntityManager Tests', () => {

    let manager;

    beforeEach(() => {

        manager = {

            data: [
                { id: 1, nom: 'Donald' },
                { id: 2, nom: 'Kevin' }
            ],

            getList: function () {
                return this.data;
            },

            getUnit: function (id) {
                return this.data.find(e => e.id === id);
            }

        };

    });

    test('getList retourne toutes les données', () => {

        const result = manager.getList();

        expect(result.length).toBe(2);

        expect(result[0].nom).toBe('Donald');

    });

    test('getUnit retourne une donnée précise', () => {

        const result = manager.getUnit(2);

        expect(result.nom).toBe('Kevin');

    });

});