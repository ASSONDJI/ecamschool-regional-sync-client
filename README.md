# E-Camschool Regional Sync Client

## Description du projet

Ce projet s'inscrit dans le cadre du développement d'une application de gestion et de synchronisation des données pour le système **E-CAMSCHOOL**.

Il repose sur une bibliothèque JavaScript personnalisée permettant de manipuler des structures matricielles dynamiques (colonnes, lignes, filtres, transformations et agrégations).  
L'objectif est de faciliter le traitement, l'analyse et l'exportation des données scolaires.

---

## Objectifs

- Structurer et manipuler des données sous forme de matrices
- Appliquer des filtres et transformations dynamiques
- Générer des colonnes dérivées et des agrégations
- Exporter les données vers des formats exploitables (Excel)
- Assurer la fiabilité du système via des tests unitaires

---

## Architecture technique

Le projet est organisé autour d'un module principal de gestion des matrices :

- **Matrice** : gestion des lignes, colonnes et cellules
- **Filtres** : abstraction des conditions (MIN, MAX, BETWEEN, etc.)
- **Transformations** : mapping et dérivation de colonnes
- **Agrégation** : combinaison de plusieurs matrices
- **Export** : génération de fichiers Excel

---

## Qualité & Tests

Une suite de tests unitaires a été mise en place à l'aide de **Jest** afin de valider les principales fonctionnalités du module de gestion des matrices.

Les tests portent notamment sur les opérations de filtrage, de transformation, d'agrégation ainsi que sur certaines fonctionnalités d'export.  
Des mécanismes de **mock** ont été utilisés pour simuler les dépendances externes (comme les exports Excel) et permettre l'exécution des tests dans un environnement isolé.

Cette démarche permet d'améliorer la fiabilité du code, de détecter rapidement les anomalies et de faciliter la maintenance du projet.

---

## Tests Unitaires — Matrice (`tools-3.5.library.stats.matrice.js`)

Les tests suivants couvrent les fonctionnalités principales du module `Matrice`.

---

### `exportXSLBySheetGroupSum(colGroupName, colsNameRead, fileNameExport)`

Génère une configuration d'export Excel groupée par valeurs de colonne, puis déclenche l'export.

#### Vérifications effectuées :
- appel correct de `getConfigGroupExportSchemes` avec les schémas construits ;
- appel de `exportFileXSL` pour déclencher l'export ;
- retour de la configuration finale générée.

#### Correction apportée :
La fonction ne retournait pas la valeur de `getConfigGroupExportSchemes`. Un `return dataConfigXsl` a été ajouté en fin de fonction.  
De plus, `exportFileXSL` n'était pas mockée dans les tests, ce qui provoquait un timeout de 48 secondes et un crash du worker Jest.

---

### `initFromTab(tab)`

Initialise la matrice à partir d'un objet JavaScript structuré `{ ligneName: { colName: value } }`.

#### Vérifications effectuées :
- appel de `setElement` pour chaque cellule du tableau ;
- absence d'appel si le tableau est vide ;
- absence d'appel si une ligne ne contient aucune colonne ;
- gestion correcte d'une seule ligne avec une seule colonne ;
- transmission correcte des valeurs `null` à `setElement`.

---

### `ligneExist(ligneName)`

Vérifie si une ligne existe dans la matrice.

#### Vérifications effectuées :
- retourne `true` si la ligne est présente ;
- retourne `false` si la ligne est absente ;
- retourne `false` si la liste des lignes est vide ;
- sensibilité à la casse.

---

### `moyenneCol(colName)`

Calcule la moyenne des valeurs d'une colonne en divisant la somme par le nombre d'éléments.

#### Vérifications effectuées :
- calcul correct de la moyenne ;
- gestion des valeurs décimales (`toBeCloseTo`) ;
- retour de `NaN` si la colonne est vide ;
- retour de `0` si la somme est `0`.

---

### `moyenneFromMatrices(matrices)`

Calcule la moyenne élément par élément entre la matrice courante et un tableau de matrices externes, pour chaque colonne dont la police n'est pas `"id"`.

#### Vérifications effectuées :
- appel de `setElement` pour chaque cellule non-id (2 colonnes × 2 lignes = 4 appels) ;
- ignorance correcte des colonnes avec police `"id"` ;
- transmission des bons éléments à `_moyenneValues` ;
- fonctionnement avec un tableau de matrices vide ;
- transmission de la police correcte à `_moyenneValues`.

---

### `productScallar(scallar)`

Retourne une nouvelle matrice dont chaque élément est le produit de l'élément original par le scalaire donné.

#### Vérifications effectuées :
- multiplication correcte de chaque élément ;
- retour d'une nouvelle matrice sans modifier l'originale ;
- multiplication par `0` retourne des zéros ;
- multiplication par `1` retourne les mêmes valeurs ;
- multiplication par un scalaire négatif ;
- retour d'une matrice vide si la matrice source est vide.

---

## Tests Unitaires — EntityManager & INODatabaseManager

Dans le cadre de l'amélioration de la qualité logicielle du projet, plusieurs tests unitaires ont été implémentés avec Jest afin de valider le bon fonctionnement des composants de gestion des données.

---

# EntityManager

Le composant `EntityManager` joue un rôle central dans la couche métier de l'application.  
Il agit comme un gestionnaire d'entités permettant l'accès et la manipulation des données utilisées par le système.

### Fonctions testées

#### `getList()`

Cette fonction permet de récupérer l'ensemble des données disponibles dans le gestionnaire.

##### Vérifications effectuées :
- récupération correcte de toutes les entités ;
- cohérence du nombre d'éléments retournés ;
- validation du contenu des données récupérées.

---

#### `getUnit(id)`

Cette fonction permet de récupérer une entité spécifique à partir de son identifiant.

##### Vérifications effectuées :
- recherche correcte d'une entité ;
- retour des bonnes informations ;
- validation des propriétés de l'objet récupéré.

---

# INODatabaseManager

Le composant `INODatabaseManager` est responsable de la gestion des données locales dans IndexedDB dans une approche offline-first.

Il permet :
- la lecture locale des données ;
- la mise à jour des enregistrements ;
- la suppression des données ;
- la synchronisation future avec le backend distant.

---

## Fonctions testées

### `getList()`

Récupère l'ensemble des données stockées localement.

##### Vérifications effectuées :
- récupération complète des données ;
- intégrité des éléments retournés.

---

### `getUnit(id)`

Retourne un élément précis à partir de son identifiant.

##### Vérifications effectuées :
- récupération correcte d'un enregistrement ;
- validation des données retournées.

---

### `update(id, data)`

Permet de modifier les informations d'un élément existant.

##### Vérifications effectuées :
- mise à jour correcte des champs ;
- conservation de la structure de l'objet ;
- persistance des nouvelles valeurs.

---

### `delete(id)`

Supprime un élément de la base locale.

##### Vérifications effectuées :
- suppression effective de l'élément ;
- diminution du nombre total de données ;
- vérification de l'absence de l'élément supprimé.

---

# Objectifs des tests

Ces tests ont été réalisés afin de :

- améliorer la fiabilité du système ;
- réduire les régressions lors des évolutions du projet ;
- garantir le bon fonctionnement de la couche d'accès aux données ;
- sécuriser les traitements liés au mode offline-first ;
- faciliter la maintenance du projet collaboratif.

---

# Technologies utilisées

- JavaScript
- Jest
- IndexedDB
- AJAX
- Architecture MVT
- DAO Pattern

---

# Exécution des tests

Lancer tous les tests :

```bash
npm test
```

Lancer un test spécifique :

```bash
npx jest js/tests.js/nom_du_fichier.test.js --verbose
```

---

## Contribution

Ce projet est développé dans un contexte collaboratif.  
Chaque contribution vise à améliorer la qualité du code, la couverture des tests et la maintenabilité globale du système.