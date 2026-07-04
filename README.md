# E-Camschool - Application de Gestion des Données

## Présentation

E-Camschool est une application de gestion des données pour la Délégation Régionale des Enseignements Secondaires. Elle permet la collecte, la synthèse et l'analyse des données issues des établissements scolaires.

## Architecture

### Vue d'ensemble

L'application est construite sur une architecture **offline-first** avec un Service Worker, une base IndexedDB et un framework maison en JavaScript natif.

┌─────────────────────────────────────────────────────────────────┐
│ Architecture │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Manager │───▶│ SwRouter │───▶│ ProxyRouter │ │
│ └─────────────┘ └─────────────┘ └──────────┬──────────┘ │
│ │ │
│ ┌───────────────────────────┼─────────┐ │
│ │ │ │ │
│ ▼ ▼ │ │
│ ┌─────────────────────────────────┐ ┌─────────────────────┐ │ │
│ │ ExternalProxyRouter_IndexedDB │ │ ExternalProxyRouter_│ │ │
│ │ (BLEU) │ │ Matrice (ROUGE) │ │ │
│ └──────────────────┬──────────────┘ └──────────────────┬──┘ │ │
│ │ │ │ │
│ ▼ ▼ │ │
│ ┌─────────────────────────────────┐ ┌─────────────────────┐ │ │
│ │ ProxyDAO_IndexedDB │ │ ProxyDAO_Matrice │ │ │
│ │ - dao : IdbStore │ │ - dao : DAOContainer│ │ │
│ │ - delegate() │ │ - proxyDB : ProxyDAO│ │ │
│ │ - update_delegate() │ │ _IndexedDB │ │ │
│ └──────────────────┬──────────────┘ └──────────┬──────────┘ │ │
│ │ │ │ │
│ ▼ ▼ │ │
│ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ DelegateComponent (interface) │ │ │
│ │ - save() - getPending() - markSynced() │ │ │
│ │ - purgeSynced() - cacheReadResponse() │ │ │
│ │ - getReadCache() │ │ │
│ └─────────────────────────────────────────────────────────┘ │ │
│ ▲ │ │
│ │ implémente │ │
│ │ │ │
│ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ IdbStore │ │ │
│ └─────────────────────────────────────────────────────────┘ │ │
│ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ChooseRouteStrategy (interface) │ │
│ │ - choose_route(candidates) : ProxyDAO │ │
│ └──────────────────┬──────────────────────────────────────┘ │
│ │ │
│ ┌───────────┴───────────┐ │
│ │ │ │
│ ▼ ▼ │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Online │ │ Offline │ │
│ │ Strategy │ │ Strategy │ │
│ └─────────────┘ └─────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────┘

### Composants Principaux

| Composant | Rôle |
|-----------|------|
| **Service Worker (sw.js)** | Gère le cache, intercepte les requêtes, synchronise les données |
| **IdbStore (sw-idb-store.js)** | Interface IndexedDB, implémente DelegateComponent |
| **ProxyRouter** | Détecte les changements réseau et route vers le bon proxy |
| **ProxyDAO** | Gère la délégation de travail vers le DelegateComponent |
| **CandidateFactory** | Fabrique dynamiquement les ExternalProxyRouter |

### Relations Clés

| Relation | Type | Explication |
|----------|------|-------------|
| `ProxyDAO_Matrice` → `ProxyDAO_IndexedDB` | Héritage + Composition | Le rouge hérite du bleu ET le contient |
| `ExternalProxyRouter_IndexedDB` → `ProxyRouter` | Héritage | Le bleu hérite de ProxyRouter |
| `ProxyDAO` → `DelegateComponent` | Délégation | ProxyDAO délègue le travail |
| `IdbStore` → `DelegateComponent` | Implémentation | IdbStore implémente l'interface |

## Fonctionnalités

### Offline-first
- Cache de l'app shell (installation)
- Interception des requêtes API
- Sauvegarde PENDING en IndexedDB
- Synchronisation différée (Background Sync)
- Repli manuel (message REPLAY_PENDING)

### Tableau de bord
- Affichage des matrices Users, Establishments, Enseignements
- Filtres (recherche textuelle)
- Regroupements (par colonne)
- Export Excel (.xlsx)
- Tri des colonnes

### Notifications Push
- Notifications reçues du serveur
- Ouvre l'application au clic

## Installation

1. Cloner le dépôt
2. Démarrer le serveur backend (localhost:8080)
3. Ouvrir index.html dans le navigateur
4. Le Service Worker s'installe automatiquement

## Structure des Fichiers
/
├── index.html # Page principale
├── css/
│ └── style.css # Styles
├── js/
│ ├── app.js # UI et contrôle
│ ├── sw.js # Service Worker
│ ├── sw-idb-store.js # Logique IndexedDB
│ ├── jquery.js # jQuery (compatibilité)
│ ├── tools-3.5.js # Framework principal
│ ├── tools-3.5.AppLib.js # Application Library
│ ├── tools-3.5.controller.js # Contrôleurs
│ ├── tools-3.5.library..js # Utilitaires
│ └── tools-3.5.library.IDBManager.js # Tests
├── uds-server/
│ └── enseignements.json # Données locales
└── README.md

## Tester hors-ligne

1. Ouvrir l'application avec une connexion réseau
2. Couper la connexion réseau
3. Les données restent accessibles via le cache
4. Les modifications sont sauvegardées en IndexedDB
5. Rétablir la connexion → synchronisation automatique

## Technologies

- JavaScript natif (framework maison)
- IndexedDB
- Service Worker
- XLSX (SheetJS) pour l'export Excel
- jQuery (compatibilité héritée)

## Auteur

E-Camschool Team

## Licence

Propriétaire - Tous droits réservés