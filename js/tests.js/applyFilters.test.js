const Stats = require('../tools-3.5.library.stats.matrice.js');

describe('applyColonneFilters Tests', () => {

      test('filtre MIN fonctionne correctement', () => {

       //  Création objet matrice
       const matrice = new Stats.Matrice();

       // Mock des fonctions nécessaires
        matrice.getColIndex = jest.fn().mockReturnValue(0);
        matrice.getElementsColonne = jest.fn().mockReturnValue([5, 10, 15]);

       // lignes simulées
       const lignes = [0, 1, 2];

       // ajout du filtre MIN < 10
       const filter = new Stats.Filter.AbstractFilter("MIN", 10);
       matrice.filter[0] = [filter];

       // appel fonction
       const result = matrice.applyColonneFilters("col1", lignes);

      // vérification
       expect(result).toEqual([0]); // seule la ligne avec 5 passe
  });

});