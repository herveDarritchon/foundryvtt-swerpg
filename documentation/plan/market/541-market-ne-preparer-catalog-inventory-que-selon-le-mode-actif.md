# Market — Ne préparer catalog/inventory que selon le mode actif

**Issue** : [#541 — Market — Ne préparer catalog/inventory que selon le mode actif](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/541)

**Domaine métier** : `market`

## Goal

Éviter les préparations inutiles dans le Market en ne calculant le catalogue qu’en mode achat et l’inventaire qu’en mode vente, afin de réduire le coût de rendu et de clarifier le contrat de contexte selon le mode affiché.

## Contexte utile

- `MarketApplicationV2._preparePartContext('catalog')` prépare aujourd’hui à la fois `#prepareCatalog()` et `#prepareInventory()`.
- Le template `templates/market/market.hbs` n’affiche pourtant qu’une seule branche à la fois selon `mode === 'buy'` ou `mode === 'sell'`.
- Le catalogue reste la branche la plus coûteuse car il peut déclencher le pipeline World + Compendiums + `loadMarketCatalog()`, même quand l’utilisateur ne fait qu’ouvrir la vue inventaire.

## Plan d’implémentation

### Étape 1 — Scinder la préparation du contexte selon le mode actif

**Fichiers** : `module/applications/market/market-application.mjs` _(et `templates/market/market.hbs` seulement si un garde-fou de template s’avère nécessaire)_

**What** :

- faire brancher `_preparePartContext()` sur `this._viewState.mode` avant tout calcul coûteux ;
- en mode `buy`, ne préparer que `catalog`, les options/filtres/tri du catalogue, `marketTypeOptions` et `toolbarState` ;
- en mode `sell`, ne préparer que `inventory`, `inventorySortOptions` et le socle commun (`mode`, `buyer`, `viewState`) ;
- conserver un contrat de contexte sûr pour le template si certaines clés doivent rester neutres/optionnelles.

**Résultat attendu** : ouvrir le Market en vente n’amorce plus le pipeline catalogue, et ouvrir le Market en achat ne prépare plus inutilement l’inventaire du personnage.

### Étape 2 — Verrouiller le non-calcul croisé par des tests ciblés

**Fichiers** : `tests/applications/market/market-application.test.mjs`

**What** :

- ajouter un test prouvant qu’en mode `sell`, la préparation de contexte n’entraîne plus le chargement du catalogue ;
- ajouter le symétrique en mode `buy`, avec vérification que l’inventaire n’est pas préparé inutilement ;
- vérifier que le toggle buy/sell continue d’exposer au template uniquement les données attendues pour la branche affichée.

**Résultat attendu** : le mode actif devient un contrat testé, sans régression fonctionnelle sur l’affichage Market.

## Périmètre / hors périmètre

### Inclus

- préparation conditionnelle du contexte buy/sell ;
- suppression du calcul inutile de la branche non affichée ;
- tests de non-régression ciblés sur `MarketApplicationV2`.

### Exclus

- refonte de l’UI Market ;
- optimisation supplémentaire du pipeline catalogue au-delà de ce gain de mode actif ;
- changement du métier achat/vente, du pricing ou de la négociation.
