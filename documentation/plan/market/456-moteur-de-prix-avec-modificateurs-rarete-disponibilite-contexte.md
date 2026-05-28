# Moteur de prix avec modificateurs (rareté, disponibilité, contexte)

**Issue** : [#456 — Moteur de prix avec modificateurs (rareté, disponibilité, contexte)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/456)

**Dépend sur** : [#455 — Recherche, filtres et tris du catalogue Market](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/455)

## Objectif

Remplacer le calcul de prix historique dispersé par un moteur métier Market pur, modulaire et explicable, afin que chaque entrée du catalogue expose à la fois son prix final et la décomposition lisible des modificateurs appliqués.

## Décisions de cadrage

- Le contrat canonique devient `calculateItemPrice(itemData, marketContext) => { basePrice, finalPrice, modifiers }`, sans dépendance à `game`, `foundry` ou à l’UI.
- Le moteur doit absorber l’existant de `module/lib/market/pricing.mjs` au lieu de recréer une deuxième logique de pricing parallèle.
- Les modificateurs de rareté, disponibilité, contexte local / type de marché et override manuel MJ sont évalués comme étapes explicites, ordonnées et traçables.
- L’UI Market consomme uniquement le résultat du moteur de prix ; elle ne recalcule jamais un pourcentage ou un total côté template.

## Étapes d’implémentation

### 1. Poser le contrat canonique du moteur de prix Market

**Fichiers cibles** : `module/lib/market/price-engine.mjs`, `module/lib/market/index.mjs`, `module/config/market.mjs`, documentation technique Market pertinente.

**What**

- définir les types d’entrée/sortie du moteur : item normalisé, `marketContext`, structure `modifiers[]` avec `label`, `amount`, `reason` ;
- formaliser les registres/constants métier utiles aux modificateurs de disponibilité et de contexte futur ;
- décider explicitement la stratégie de migration depuis `pricing.mjs` : renommage, wrapper de compatibilité ou ré-export canonique unique.

**Validation visée** : le projet dispose d’une seule API de calcul de prix Market, pure et extensible.

### 2. Implémenter la composition des modificateurs et la migration depuis l’existant

**Fichiers cibles** : `module/lib/market/price-engine.mjs`, `module/lib/market/pricing.mjs`, `module/models/physical.mjs`.

**What**

- encapsuler chaque modificateur dans une étape dédiée : rareté, disponibilité, contexte local / type de marché, modificateur manuel MJ ;
- calculer `finalPrice` à partir de `basePrice` et de la somme canonique des modificateurs, avec garde-fous sur les cas limites et un résultat entier non négatif ;
- faire déléguer `_preparePrice()` au nouveau moteur, ou supprimer la logique historique si toute la chaîne bascule sur l’API canonique.

**Validation visée** : toute consommation du prix passe par le nouveau moteur, sans duplication ni formule legacy cachée.

### 3. Brancher le moteur sur les entrées et le contexte du Market

**Fichiers cibles** : `module/lib/market/market-entry.mjs`, `module/applications/market/market-application.mjs`, éventuels helpers Market ciblés.

**What**

- enrichir les entrées Market avec le `PriceResult` calculé à partir de l’item et du contexte courant ;
- préparer un `marketContext` simple et stable pour cette tranche (`availability`, `marketType`, `manualModifier`), avec fallback déterministes tant que les marchés contextualisés ne sont pas encore livrés ;
- faire converger le tri et l’affichage du catalogue sur le prix final calculé, pas uniquement sur `basePrice`.

**Validation visée** : chaque entrée Market expose un prix final cohérent avec son contexte métier courant.

### 4. Afficher la décomposition du prix et verrouiller la non-régression

**Fichiers cibles** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`, `tests/lib/market/price-engine.test.mjs`, `tests/lib/market/pricing.test.mjs`, `tests/applications/market/market-application.test.mjs`.

**What**

- afficher dans la ligne d’item, un tooltip ou un expand la décomposition `prix de base -> modificateurs -> prix final` avec libellés localisés ;
- couvrir par tests unitaires les modificateurs seuls et combinés, le modificateur manuel, les fallback de contexte et les bornes ;
- couvrir côté application que le Market expose et rend bien le détail de prix attendu pour chaque item.

**Validation visée** : l’utilisateur voit un prix expliqué, et les contrats de calcul / exposition sont verrouillés par tests ciblés.

## Résultat attendu

- `price-engine.mjs` devient la source de vérité du calcul de prix Market.
- Le calcul historique de `physical.mjs` n’embarque plus sa propre formule.
- Le Market affiche un prix final contextualisé et sa décomposition lisible.
- Les futurs marchés contextualisés peuvent ajouter des modificateurs sans refonte de l’API de prix.
