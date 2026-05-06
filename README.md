# E-Camschool Regional Sync Client
##  Description du projet

Ce projet s’inscrit dans le cadre du développement d’une application de gestion et de synchronisation des données pour le système **E-CAMSCHOOL**.

Il repose sur une bibliothèque JavaScript personnalisée permettant de manipuler des structures matricielles dynamiques (colonnes, lignes, filtres, transformations et agrégations).  
L’objectif est de faciliter le traitement, l’analyse et l’exportation des données scolaires.

---

##  Objectifs

- Structurer et manipuler des données sous forme de matrices
- Appliquer des filtres et transformations dynamiques
- Générer des colonnes dérivées et des agrégations
- Exporter les données vers des formats exploitables (Excel)
- Assurer la fiabilité du système via des tests unitaires

---

##  Architecture technique

Le projet est organisé autour d’un module principal de gestion des matrices :

- **Matrice* : gestion des lignes, colonnes et cellules
- **Filtres** : abstraction des conditions (MIN, MAX, BETWEEN, etc.)
- **Transformations** : mapping et dérivation de colonnes
- **Agrégation** : combinaison de plusieurs matrices
- **Export** : génération de fichiers Excel

---

##  Qualité & Tests

Une suite de tests unitaires a été mise en place afin de garantir la robustesse des fonctionnalités principales.

Les tests couvrent notamment :

- les filtres de données
- les transformations de colonnes
- les opérations d’agrégation
- certaines fonctionnalités d’export (avec mocks)

Cette approche permet de détecter rapidement les anomalies et de sécuriser les évolutions du projet.

---

## Contribution

Ce projet est développé dans un contexte collaboratif.  
Chaque contribution vise à améliorer la qualité du code, la couverture des tests et la maintenabilité globale du système.

---

Une suite de tests unitaires a été mise en place à l’aide de Jest afin de valider les principales fonctionnalités du module de gestion des matrices.

Les tests portent notamment sur les opérations de filtrage, de transformation, d’agrégation ainsi que sur certaines fonctionnalités d’export.  
Des mécanismes de mock ont été utilisés pour simuler les dépendances externes (comme les exports Excel) et permettre l’exécution des tests dans un environnement isolé.

Cette démarche permet d’améliorer la fiabilité du code, de détecter rapidement les anomalies et de faciliter la maintenance du projet.