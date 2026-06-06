# Issue #593 — Market: remove dead `DEFAULT_MARKET_CONTEXT.availability` backward-compat field

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/593  
**Domaine métier** : `market`

## Goal

Retirer du contrat canonique Market le champ legacy `DEFAULT_MARKET_CONTEXT.availability`, devenu incohérent avec la règle actuelle où `availability` est dérivée depuis `rarity` + `restrictionLevel`, puis réaligner le pricing Market et ses tests sur cette source de vérité unique.

## Contexte utile

- `module/lib/market/market-entry.mjs` dérive déjà `availability` de façon canonique via `deriveAvailability()` puis la passe explicitement au pricing.
- `module/config/market.mjs` conserve encore `availability` dans `DEFAULT_MARKET_CONTEXT`, et `module/lib/market/price-engine.mjs` documente encore une precedence `itemData.availability` → `marketContext.availability` → défaut global.
- Des appels applicatifs Market injectent encore `availability: 'available'` dans le `marketContext`, ce qui ressemble à une compatibilité résiduelle plutôt qu’à un besoin métier actif.

## Plan d’implémentation

### Étape 1 — Nettoyer le contrat `MarketContext` et le fallback legacy du pricing

**Fichiers** : `module/config/market.mjs`, `module/lib/market/price-engine.mjs`, typedefs/JSDoc Market concernés.

**What** :

- Supprimer `availability` de `DEFAULT_MARKET_CONTEXT` et de la documentation contractuelle du contexte Market si ce champ n’est plus canonique.
- Remplacer le fallback contextuel legacy du price engine par un fallback interne neutre, sans réintroduire `availability` comme axe de contexte métier.
- Mettre à jour la documentation de résolution du pricing pour clarifier que l’axe `availability` doit venir d’une donnée explicitement fournie par l’appelant, pas d’un état implicite du contexte.

**Résultat attendu** : le contrat Market distingue clairement les vraies dimensions de contexte (`marketType`, `manualModifier`, etc.) de la donnée métier dérivée `availability`.

### Étape 2 — Aligner tous les appels Market sur la source de vérité canonique

**Fichiers** : `module/lib/market/market-entry.mjs`, `module/applications/market/market-application.mjs`, `module/applications/settings/market-settings-panel.mjs`, autres call sites ciblés de `calculateItemPrice()` dans le domaine Market.

**What** :

- Supprimer les constructions de `marketContext` qui injectent artificiellement `availability: 'available'`.
- Vérifier que les flux Market qui calculent un prix continuent de fournir `availability` via l’entrée canonique dérivée ou via une donnée explicite d’item quand c’est réellement requis.
- Conserver au niveau du contexte uniquement les axes réellement contextuels, afin d’éviter toute seconde source de vérité silencieuse.

**Résultat attendu** : les calculs de prix du Market ne dépendent plus d’un champ de compatibilité mort et restent alignés sur l’`availability` canonique dérivée.

### Étape 3 — Verrouiller la suppression par des tests contractuels ciblés

**Fichiers** : `tests/lib/market/price-engine.test.mjs`, `tests/lib/market/market-entry.test.mjs`, `tests/config/market.test.mjs`, `tests/applications/market/market-application.test.mjs`.

**What** :

- Remplacer les tests qui encodent une precedence `marketContext.availability` par des assertions reflétant le nouveau contrat.
- Couvrir la non-régression suivante : les appels purs au price engine restent corrects quand `itemData.availability` est fourni explicitement, tandis que les flux Market continuent d’utiliser l’`availability` dérivée.
- Ajouter un garde-fou contractuel sur `DEFAULT_MARKET_CONTEXT` pour empêcher la réintroduction future d’un champ legacy équivalent.

**Résultat attendu** : la suppression du champ backward-compat est explicite, testée et protégée contre une réapparition implicite.

## Périmètre / hors périmètre

### Inclus

- Suppression du champ legacy `DEFAULT_MARKET_CONTEXT.availability`
- Alignement des appels Market et de la documentation contractuelle
- Tests ciblés de non-régression sur le pricing et le contrat de contexte

### Exclus

- Refonte des règles métier de dérivation de `availability`
- Changement des modificateurs économiques du Market
- Extension fonctionnelle ou cosmétique du Market sans lien avec ce nettoyage contractuel
