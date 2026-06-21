/**
 * ============================================================
 * INDEX - POINT D'ENTRÉE POUR LES NOUVELLES FONCTIONNALITÉS
 * ============================================================
 * 
 * Ce fichier regroupe tous les nouveaux modules pour faciliter
 * leur chargement et leur utilisation.
 * 
 * Ordre de chargement :
 * 1. Analyser (interface)
 * 2. ObjectAnalyser (décorateur)
 * 3. Tree (structure)
 * 4. RandomForest (algorithme)
 * 5. MatriceExtension (extensions)
 * 
 * @author Groupe E-Camschool
 * @version 1.0
 * @since 2026-06-21
 * ============================================================
 */

(function() {
    'use strict';
    
    // Vérifier que l'espace de noms existe
    if (typeof tools === 'undefined') {
        window.tools = {};
    }
    
    if (typeof tools.Library === 'undefined') {
        tools.Library = {};
    }
    
    if (typeof tools.Library.Stats === 'undefined') {
        tools.Library.Stats = {};
    }
    
    // Afficher un message de bienvenue
    console.log("╔═══════════════════════════════════════════════════╗");
    console.log("║   E-CAMSCHOOL - ObjectAnalyser & Prediction      ║");
    console.log("║   Version 1.0                                   ║");
    console.log("║   Chargé le : " + new Date().toLocaleString() + "      ║");
    console.log("╚═══════════════════════════════════════════════════╝");
    
    console.log(" Modules disponibles :");
    console.log("   - tools.Library.Analyser");
    console.log("   - tools.Library.ObjectAnalyser");
    console.log("   - tools.Library.Tree");
    console.log("   - tools.Library.RandomForest");
    console.log("   - Extensions de Matrice");
    
    console.log(" Exemple d'utilisation :");
    console.log("   const rf = new tools.Library.RandomForest();");
    console.log("   rf.configure({ nTrees: 10, targetCol: 'idClasse' });");
    console.log("   const analyser = new tools.Library.ObjectAnalyser(matrice, rf);");
    console.log("   matrice.setAnalyser(analyser);");
    console.log("   matrice.trainModel();");
    console.log("   const result = matrice.predict({ idEnseignant: 26848 });");
    
})();