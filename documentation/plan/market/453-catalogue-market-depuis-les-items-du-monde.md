# Catalogue Market depuis les items du monde

**Issue** : [#453 — Catalogue Market depuis les items du monde](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/453)

**Dépend sur** : [#452 — Modèle métier du Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/452) ✅ livré

## Objectif

Créer la première version UI de la fenêtre Market, alimentée par les `World Items` éligibles, sans achat ni filtres avancés. Réutiliser le contrat métier posé par `#452`.

## Décisions de cadrage

- Source unique : `game.items` (World Items, pas les compendiums)
- Réutiliser `createMarketEntry()` + `evaluateEligibility()` de `#452` — pas de logique d'éligibilité locale
- Catégories affichées : `weapon`, `armor`, `gear` (clés de `PURCHASABLE_ITEM_TYPES`)
- Pas de filtres, pas de tri, pas d'achat — scope strictement consultatif
- Créer le scaffold UI complet car rien n'existe encore (pas de `MarketApplicationV2`, pas de template, pas de style, pas de clés i18n)

## État initial du code

Ce qui existe déjà (issue #452) :

- `module/config/market.mjs` — registres canoniques `PURCHASABLE_ITEM_TYPES`, `EXCLUDED_ITEM_TYPES`, `AVAILABILITY_STATUS`, `SOURCE_TYPES`
- `module/lib/market/eligibility.mjs` — `evaluateEligibility()`
- `module/lib/market/market-entry.mjs` — `createMarketEntry()`
- `module/lib/market/pricing.mjs` — `computeMarketPrice()`
- `module/lib/market/source-resolver.mjs` — `resolveMarketSources()`, `filterDuplicates()`
- `module/lib/market/index.mjs` — réexport barrel
- Exposition via `SYSTEM.MARKET`

Ce qui manque et doit être créé :

- `MarketApplicationV2` (ApplicationV2)
- Template Handlebars `templates/market/` (nouveau dossier)
- Styles LESS dans `styles/` pour le Market
- Clés i18n `MARKET.*` dans `lang/en.json` et `lang/fr.json`
- Tests unitaires sur la préparation de contexte et le formatage d'affichage

## Étapes d'implémentation

### 1. Créer le scaffold UI Market (ApplicationV2)

**Fichiers à créer** :

- `module/applications/market/market-application.mjs` — classe `MarketApplicationV2`
- `templates/market/market.hbs` — template Handlebars principal
- `styles/market.less` ou ajout dans `styles/swerpg.less`

**Détails** :

- `MarketApplicationV2` extends `api.HandlebarsApplicationMixin(api.ApplicationV2)`
- `static DEFAULT_OPTIONS` : `id: 'market'`, `window: { title: 'MARKET.Title' }`, `tag: 'aside'`
- `static PARTS` : `{ catalog: { template: 'templates/market/market.hbs' } }`
- `static TABS` : vide pour l'instant (pas d'onglets)
- Enregistrer l'application dans le code d'initialisation (hook `init` ou `ready`)

### 2. Ajouter les clés i18n MARKET

**Fichiers** : `lang/en.json`, `lang/fr.json`

Clés minimales :

- `MARKET.Title` — `"Market"`
- `MARKET.Catalog.Empty` — `"No items available in the market."`
- `MARKET.Catalog.Column.Name` — `"Name"`
- `MARKET.Catalog.Column.Type` — `"Type"`
- `MARKET.Catalog.Column.Price` — `"Price"`
- `MARKET.Catalog.Column.Rarity` — `"Rarity"`
- `MARKET.Catalog.Column.Restriction` — `"Restriction"`
- `MARKET.Catalog.Group.Weapon` — `"Weapons"` (ou réutiliser `MARKET.ItemType.Weapon` déjà défini dans `#452`)
- `MARKET.Catalog.Group.Armor` — `"Armor"`
- `MARKET.Catalog.Group.Gear` — `"Gear"`
- `MARKET.Catalog.OpenSheet` — `"Open item sheet"`

### 3. Implémenter le catalogue world dans le contexte applicatif

**Fichier** : `module/applications/market/market-application.mjs`

**What** :

- surcharger `_preparePartContext(partId, context)` pour la part `catalog`
- interroger `game.items` (collection `items`)
- pour chaque item, appeler `createMarketEntry()` du domaine `#452` :
  - `sourceType: 'world'`
  - `sourceId: 'world'` (ou l'UUID du document)
- filtrer `entry.eligible === true`
- grouper par `entry.itemType` en utilisant `PURCHASABLE_ITEM_TYPES` pour le libellé et l'icône
- retourner `{ catalog: { groups: [...] } }` dans le contexte

**API réelle** (pas `isItemPurchasable()` qui n'existe pas) :

```js
import { createMarketEntry } from '../../lib/market/market-entry.mjs'
import { PURCHASABLE_ITEM_TYPES } from '../../config/market.mjs'

for (const item of game.items) {
  try {
    const entry = createMarketEntry(item, { sourceType: 'world', sourceId: item.uuid })
    if (entry.eligible) {
      /* group by entry.itemType */
    }
  } catch (err) {
    // createMarketEntry throw pour les types non autorisés -> skip
  }
}
```

**Validation visée** : le contexte produit `{ groups: [ { typeKey, label, icon, items: [...] }, ... ] }` sans items non éligibles.

### 4. Rendre la liste groupée dans le template

**Fichier** : `templates/market/market.hbs`

**What** :

- itérer les groupes, afficher un `<section>` par groupe avec titre + icône
- tableau ou liste des items avec colonnes : icône, nom, type, prix, rareté, restriction
- chaque ligne a `data-uuid="{{ uuid }}"` et `data-action="openItem"`
- état vide : `<p>{{ localize "MARKET.Catalog.Empty" }}</p>` si aucun groupe n'a d'items
- attributs `data-application-part="catalog"` pour le rattachement ApplicationV2

**Validation visée** : la fenêtre Market affiche le catalogue groupé, lisible, avec état vide.

### 5. Câbler l'ouverture de fiche item

**Fichier** : `module/applications/market/market-application.mjs`

**What** :

- ajouter une méthode action `openItem(event)` avec décorateur `@action('openItem')` ou via `_onAction`
- résoudre l'UUID via `fromUuid(uuid)` et appeler `item.sheet.render(true)`
- gérer le cas où l'item n'existe plus (item supprimé entre-temps) → logger.warn

### 6. Ajouter les styles LESS

**Fichier** : `styles/market.less` (importé depuis `swerpg.less`)

**What** :

- styles pour `.market-catalog`, `.market-group`, `.market-item`, `.market-empty`
- grille simple pour les colonnes (CSS grid ou table)
- thème visuel cohérent avec le reste du système (variables CSS existantes)
- pas de style complexe — réutiliser les tokens de design existants

### 7. Enregistrer l'application et le point d'accès

**Fichier** : hook `ready` dans `module/hooks/` ou dans un bloc d'initialisation

**What** :

- exposer un moyen d'ouvrir le Market : `game.system.swerpg.openMarket()` ou via une barre d'outils
- créer une instance singleton ou la détruire à chaque fermeture

**Validation visée** : l'utilisateur peut ouvrir la fenêtre Market depuis le jeu.

### 8. Tests unitaires

**Fichier** : `tests/applications/market/market-application.test.mjs` (nouveau)

**What** :

- tester `_preparePartContext` avec un mock Foundry (`setupFoundryMock`) :
  - simuler `game.items` avec des items valides, invalides, non autorisés
  - vérifier le groupement correct
  - vérifier l'exclusion des items non éligibles
  - vérifier l'état vide
- tester l'action `openItem` :
  - vérifier que `item.sheet.render(true)` est appelé avec le bon item
  - vérifier le comportement avec un UUID invalide

**Validation visée** : couverture du requêtage, du filtrage, du groupement, de l'affichage et de l'action d'ouverture.

## Résultat attendu

- `MarketApplicationV2` créée et fonctionnelle
- La fenêtre Market affiche les items achetables du monde à partir de `game.items`
- Les entrées sont regroupées par type achetable (`weapon`, `armor`, `gear`)
- Chaque ligne affiche : icône, nom, type, prix, rareté, restriction
- Un clic ouvre la fiche détaillée de l'item
- Les items non éligibles (type interdit, nom manquant, prix manquant) sont exclus par le contrat `#452`
- Le catalogue est prêt pour les filtres/tris de `#455`
- Tests unitaires couvrant le contexte applicatif et l'interaction

## Fichiers modifiés

| Fichier                                                 | Action                             |
| ------------------------------------------------------- | ---------------------------------- |
| `module/applications/market/market-application.mjs`     | Créer                              |
| `templates/market/market.hbs`                           | Créer                              |
| `styles/market.less`                                    | Créer                              |
| `styles/swerpg.less`                                    | Modifier (importer `market.less`)  |
| `lang/en.json`                                          | Modifier (ajouter clés `MARKET.*`) |
| `lang/fr.json`                                          | Modifier (ajouter clés `MARKET.*`) |
| `tests/applications/market/market-application.test.mjs` | Créer                              |
