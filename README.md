# E-Camschool — Regional Sync Client

Application de gestion et de synthèse des données de la Délégation Régionale des
Enseignements Secondaires (utilisateurs, établissements, enseignements). Le client
fonctionne en **offline-first** : les données restent utilisables et modifiables hors
connexion, puis se synchronisent avec le backend dès que le réseau revient.

> Branche de cet export : `feature/pour-la-fusion` (dernier commit : *"Integration de
> la prediction"*).

## Contexte

Les établissements scolaires remontent des pièces périodiques (états de besoin en
personnel, effectifs, etc.) dont la synthèse est produite par chaque Délégation
Départementale. L'application historique, en mode Client-Serveur strict, perdait le
travail des utilisateurs à la moindre coupure réseau. E-camschool répond à ce problème
par trois mécanismes : **sauvegarde** locale du cycle de vie d'une donnée
(création/modification/suppression), **synchronisation** différée vers le serveur, et
**projection** (anticipation de données manquantes à partir des habitudes utilisateur).

## Architecture

L'ancienne couche applicative (`SwRouter` / `ProxyDAO` / `ExternalProxyRouter` /
`ChooseRouteStrategy` / `SyncManager`, écrite à la main en JS) a été **remplacée par un
Service Worker natif du navigateur**. `sw.js` l'indique explicitement dans son
en-tête : il reprend le même raisonnement métier (réconciliation CREATE/UPDATE/DELETE,
stratégie de routage online/offline) mais avec les API standard du Service Worker.

```
┌─────────────┐        fetch()        ┌────────────────────────┐
│   app.js     │ ─────────────────────▶│   Service Worker        │
│  (UI/DOM)    │                        │   (sw.js)                │
└─────────────┘                        │  - intercepte /users,     │
      ▲                                 │    /establishments,       │
      │ postMessage                     │    /data-matrix           │
      │ (GET_PENDING_COUNT,              │  - lecture: cache d'abord │
      │  REPLAY_PENDING)                 │    + TTL 5 min            │
      │                                  │  - écriture: réseau       │
      │                                  │    d'abord, sinon file    │
      │                                  │    PENDING                │
      │                                  │  - Background Sync +      │
      │                                  │    repli manuel (Safari)  │
      │                                  │  - notifications push     │
      └──────────────────────────────────┴───────────┬────────────┘
                                                       │ importScripts
                                                       ▼
                                          ┌──────────────────────┐
                                          │  sw-idb-store.js      │
                                          │  (JS pur, pas de      │
                                          │   jQuery — pas de DOM │
                                          │   dans un SW)         │
                                          │  DB ecamschool_idb    │
                                          │  store _pending       │
                                          │  Réconciliation :     │
                                          │  CREATE+UPDATE→CREATE │
                                          │  CREATE+DELETE→annulé │
                                          │  UPDATE+DELETE→DELETE │
                                          └──────────────────────┘
```

**Règle d'or de schéma** : seul le Service Worker ouvre et initialise IndexedDB (avec
`onupgradeneeded`). Un accès direct depuis la page sans ce handler risque de corrompre
le schéma — c'est un bug déjà rencontré sur `updateSyncBadge()`.

> ⚠️ **Point de vigilance dans cet export** : `updateSyncBadge()` (dans `app.js`) ouvre
> encore `indexedDB.open("ecamschool_idb", 6)` directement depuis la page, sans passer
> par l'échange `postMessage` (`GET_PENDING_COUNT`) prévu dans le plan de correction. À
> vérifier si le correctif a bien été committé dans une révision plus récente.

### Composants principaux

| Fichier | Rôle |
|---|---|
| `sw.js` | Service Worker : cache de l'app shell, interception fetch, réconciliation CREATE/UPDATE/DELETE, Background Sync + repli manuel, notifications push |
| `js/sw-idb-store.js` | Accès IndexedDB pur JS (sans jQuery) utilisé par `sw.js`, base `ecamschool_idb`, store `_pending`, cache de lecture avec TTL 5 min |
| `js/app.js` | UI, appels AJAX vers le backend, gestion des onglets, badge de synchronisation |
| `js/tools-3.5.js` | Framework maison (Managers, Container, DAO) |
| `js/tools-3.5.AppLib.js`, `tools-3.5.controller.js` | Extensions du framework et contrôleurs |
| `js/tools-3.5.library.*.js` | Bibliothèques : matrices statistiques, Container_mat, DAOContainer, IDBManager (+ suite de tests dédiée) |

### Module Machine Learning / Prédiction

Branche d'origine : `feature/ObjectAnalyser-prediction`, intégrée dans ce client via
l'onglet **🔮 Prédiction**.

| Fichier | Rôle |
|---|---|
| `js/tools-3.5.library.RandomForest.js` / `Tree.js` | Random Forest (CART, impureté de Gini) |
| `js/tools-3.5.library.ObjectAnalyser.js` | Analyse d'objets/attributs pour la prédiction |
| `js/tools-3.5.library.MatriceExtension.js` | Extensions de `Matrice` nécessaires au pipeline ML |
| `js/tools-3.5.library.Predictor.js` | Orchestration entraînement/prédiction ; `loadMatrice()` pour injecter une `Matrice` déjà construite ; `fromJSON()` exige une matrice réellement chargée (pas un stub vide) |
| `js/tools-3.5.library.Visualizer.js` | Visualisation des résultats/arbres |
| `js/ml-data-source.js` | Seul rôle : dialoguer avec le backend Spring (`ecamschool-regional-sync-core`) pour récupérer les données d'entraînement — ignore tout de Matrice/Predictor/IndexedDB |
| `js/ml-model-idb-store.js` | Persistance des modèles entraînés (`Predictor.toJSON()`) dans une base IndexedDB dédiée `ecamschool_ml_store` (store `trained_models`), totalement séparée de `ecamschool_idb` |
| `js/prediction-tab-controller.js` | Orchestration de l'onglet Prédiction (multi-modèles), fait le lien entre les deux fichiers précédents |

Principes retenus :
- **Sélection de source manuelle** : serveur ou l'un des deux fichiers JSON via menu
  déroulant — aucun repli automatique entre sources.
- **Séparation stricte des bases IndexedDB** : sync (`ecamschool_idb`) et ML
  (`ecamschool_ml_store`) ne se mélangent jamais.
- Hors scope pour l'instant : regroupement dynamique par `dataType`, jointures
  multi-tables (`MatriceJoin`).

## Structure des fichiers

```
.
├── index.html                                # Page principale (5 onglets)
├── css/style.css
├── js/
│   ├── app.js                                 # UI + AJAX + badge de sync
│   ├── jquery.js
│   ├── tools-3.5.js                           # Framework principal (Managers/Container/DAO)
│   ├── tools-3.5.AppLib.js
│   ├── tools-3.5.controller.js
│   ├── tools-3.5.library.stats.matrice.js
│   ├── tools-3.5.library.Container_mat.js
│   ├── tools-3.5.library.DAOContainer.js
│   ├── tools-3.5.library.IDBManager.js
│   ├── tools-3.5.library.IDBManager.test.js   # Suite de tests IDBManager
│   ├── tools-3.5.library.Analyser.js
│   ├── tools-3.5.library.Tree.js
│   ├── tools-3.5.library.RandomForest.js
│   ├── tools-3.5.library.ObjectAnalyser.js
│   ├── tools-3.5.library.MatriceExtension.js
│   ├── tools-3.5.library.Predictor.js
│   ├── tools-3.5.library.Visualizer.js
│   ├── ml-data-source.js                      # Récupération des données côté serveur
│   ├── ml-model-idb-store.js                  # Persistance des modèles (ecamschool_ml_store)
│   ├── prediction-tab-controller.js           # Orchestration onglet Prédiction
│   ├── sw-idb-store.js                        # Accès IndexedDB pour le Service Worker
│   ├── xlsx.full.min.js                       # Export Excel (SheetJS)
│   └── FileSaver.min.js
├── sw.js                                      # Service Worker (remplace SwRouter/ProxyDAO/SyncManager)
└── uds-server/
    ├── index.php                              # Mock serveur : renvoie enseignements.json
    ├── enseignements.json                     # Jeu de données réel (source d'entraînement ML)
    ├── enseignements_classification.json
    └── enseignements_train.json
```

## Interface (onglets)

| Onglet | Contenu |
|---|---|
| 👥 Utilisateurs | Création/gestion des utilisateurs |
| 🏛️ Établissements | Création/gestion des établissements |
| 📊 Données en attente | File des enregistrements PENDING non encore synchronisés |
| 📈 Tableau de bord | Matrices Users / Établissements / Enseignements — filtres, regroupement par colonne, tri, export `.xlsx` |
| 🔮 Prédiction | Chargement d'une source de données (serveur ou JSON), entraînement/chargement d'un modèle Random Forest, prédiction simplifiée par sliders |

## Backend attendu

L'application consomme une API sur `http://localhost:8080` (`API_BASE_URL` dans
`app.js`), avec les préfixes interceptés par le Service Worker :
`/users`, `/establishments`, `/data-matrix` — servis par
`ecamschool-regional-sync-core` (Spring Boot, hors de ce dépôt).

Le dossier `uds-server/` est un mock PHP indépendant : `index.php` renvoie simplement
le contenu de `enseignements.json`, utilisé comme source de données pour le module ML.

## Installation

1. Démarrer le backend Spring Boot (`ecamschool-regional-sync-core`) sur le port 8080.
2. Servir ce dossier avec un serveur statique (ex. Live Server, `http://127.0.0.1:5500`).
3. Ouvrir `index.html` — le Service Worker s'installe automatiquement et met en cache
   l'app shell.

## Tester le mode hors-ligne

1. Charger l'application avec le réseau actif.
2. Couper la connexion.
3. Les données déjà chargées restent accessibles (cache + IndexedDB).
4. Les créations/modifications/suppressions sont mises en file `_pending`.
5. Reconnexion → synchronisation automatique (Background Sync), ou repli manuel via
   message `REPLAY_PENDING` sur les navigateurs sans support (Safari).

## Technologies

- JavaScript natif (framework maison `tools-3.5`)
- Service Worker natif du navigateur + IndexedDB
- jQuery (compatibilité héritée, non utilisé dans le Service Worker)
- XLSX (SheetJS) + FileSaver pour l'export Excel
- D3.js (chargé en tête de page, pour la visualisation)
- Backend : Spring Boot (`ecamschool-regional-sync-core`)

## Hors scope / reporté

- Boutons d'édition/suppression dédiés pour les entrées de sync (réutilisation des
  formulaires existants en mode édition à la place).
- `MatriceJoin` (jointures multi-tables).
- Regroupement dynamique par `dataType`.

## Licence

Propriétaire — Tous droits réservés.
