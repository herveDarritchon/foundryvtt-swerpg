# Market — Trancher la revente des items broken dans validateSale

**Issue** : [#546 — Market — Trancher la revente des items broken dans validateSale](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/546)

**Domaine métier** : `market`

## Goal

Aligner la vente Market sur la règle métier décidée pour les items `broken` : pouvoir interdire leur revente via un setting dédié, ou appliquer un multiplicateur configurable sur la valeur normale de revente quand cette revente reste autorisée.

## Contexte utile

- `module/lib/market/eligibility.mjs` exclut déjà les items `broken` du parcours d’achat.
- `module/lib/market/sell-validation.mjs` ne contrôle aujourd’hui ni l’état `broken`, ni une politique de revente configurable.
- `module/lib/market/sell-valuation.mjs` calcule la revente uniquement depuis `basePrice` et l’issue de négociation.
- Le panneau `MarketSettingsPanel` possède déjà un onglet `prices` adapté pour exposer des réglages économiques supplémentaires.

## Plan d’implémentation

### Étape 1 — Introduire une politique canonique de revente des items broken

**Fichiers** : `module/config/market.mjs`, `module/lib/market/market-settings.mjs`, `module/lib/market/index.mjs`, `module/applications/settings/market-settings-panel.mjs`, `templates/settings/market-prices.hbs`, `lang/en.json`, `lang/fr.json`

**What** :

- définir des constantes nommées pour la règle (`allowBrokenItemSale`, multiplicateur par défaut `50`, bornes `0..100`) afin d’éviter toute magie métier ;
- enregistrer les deux nouveaux settings Foundry et centraliser leur lecture/écriture/normalisation dans les helpers Market ;
- exposer ces réglages dans l’onglet `prices` du panneau GM avec microcopy et garde-fous cohérents (booléen + entier borné).

**Résultat attendu** : la politique de revente des items `broken` est configurable depuis une source de vérité unique, avec des défauts et des bornes explicites.

### Étape 2 — Appliquer la règle au flux de vente et au calcul de valeur

**Fichiers** : `module/lib/market/sell-validation.mjs`, `module/lib/market/sell-valuation.mjs`, `module/applications/market/market-application.mjs`

**What** :

- étendre `validateSale` pour rejeter un item `broken` quand `allowBrokenItemSale = false`, avec une raison/message dédiés ;
- étendre `computeResalePrice` pour appliquer le multiplicateur `brokenItemSaleMultiplier` à la valeur normale de revente, après la fraction liée à la négociation ;
- brancher `MarketApplicationV2.#onSellItem` sur les nouveaux helpers de settings pour que confirmation, crédit, audit et notification utilisent la valeur finale broken-aware, sans casser la logique actuelle de quantité.

**Résultat attendu** : un item `broken` est soit refusé à la vente, soit revendu à une valeur réduite conforme à la configuration GM.

### Étape 3 — Verrouiller la décision par des tests ciblés

**Fichiers** : `tests/config/market.test.mjs`, `tests/lib/market/market-settings.test.mjs`, `tests/applications/settings/market-settings-panel.test.mjs`, `tests/lib/market/sell-validation.test.mjs`, `tests/lib/market/sell-valuation.test.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- couvrir les constantes/défauts/bornes de la nouvelle politique Market ;
- tester la lecture/écriture/normalisation des settings et leur présence dans le panneau de configuration ;
- ajouter les cas métier clés : revente broken désactivée, revente activée à `50%`, multiplicateur personnalisé, bornes `0` et `100`, et arrondi entier sur la valeur finale.

**Résultat attendu** : la règle métier décidée par l’issue est protégée contre les régressions côté configuration, validation et calcul économique.

## Périmètre / hors périmètre

### Inclus

- settings de revente broken ;
- validation de vente alignée sur ces settings ;
- calcul de valeur de revente broken et tests associés.

### Exclus

- refonte générale du pricing Market hors cas `broken` ;
- changement des règles d’achat des items `broken` déjà traitées par l’éligibilité ;
- retouche UI sans lien direct avec la nouvelle règle économique.
