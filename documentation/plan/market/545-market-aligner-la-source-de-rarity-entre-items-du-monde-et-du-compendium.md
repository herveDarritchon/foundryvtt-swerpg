# Issue #545 — Market : aligner la source de rarity entre items du monde et du compendium

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/545  
**Domaine métier** : `market`

## Goal

Garantir que le Market lise la rareté depuis une source canonique identique pour les items du monde et les items de compendium, afin d’éviter des écarts de prix, de tri, d’affichage et de disponibilité selon l’origine du document.

## Contexte utile

- `module/applications/market/market-application.mjs` convertit les items du monde via `itemToRawItem()` et lit déjà le prix depuis `system._source?.price` pour éviter les valeurs dérivées.
- Ce même mapper lit encore `rarity` depuis `system.rarity`, alors que les items du monde peuvent exposer une valeur préparée différente de la valeur persistée.
- `module/applications/market/compendium-source-adapter.mjs` charge les items de compendium depuis l’index Foundry, ce qui revient à consommer une valeur de rareté issue de la source persistée.
- La rareté pilote plusieurs comportements Market : tri, pips d’affichage, disponibilité dérivée, obtainability et pricing.

## Plan d’implémentation

### Étape 1 — Poser un contrat unique d’extraction de la rareté Market

**Fichiers** : `module/applications/market/market-application.mjs`, `module/applications/market/compendium-source-adapter.mjs`

**What** :

- Définir explicitement l’ordre de fallback attendu pour la rareté brute côté Market (`source persistée` puis `valeur runtime` puis `0`).
- Aligner le mapping des items du monde sur le même principe que celui déjà appliqué au prix, pour éviter qu’un item monde utilise une valeur dérivée quand un item compendium utilise une valeur source.
- Vérifier qu’aucun deuxième mapper Market ne reconstruit sa propre règle de lecture de `rarity` en parallèle.

**Résultat attendu** : le catalogue reçoit une valeur de rareté homogène, indépendante du fait que l’item vienne du monde ou d’un compendium.

### Étape 2 — Répercuter l’alignement sur le pipeline catalogue sans élargir le scope

**Fichiers** : `module/applications/market/market-application.mjs`, éventuellement helper Market ciblé si une factorisation minimale évite la duplication

**What** :

- Faire passer toutes les entrées du catalogue par cette lecture canonique avant `loadMarketCatalog()`.
- Vérifier le contrat des champs consommateurs déjà branchés sur `entry.rarity` : tri par rareté, `rarityPips`, availability dérivée, obtainability et pricing.
- Limiter la tranche à l’alignement de la source de donnée ; ne pas modifier les règles métier de calcul elles-mêmes.

**Résultat attendu** : les mêmes données d’entrée produisent les mêmes comportements Market quel que soit le type de source.

### Étape 3 — Verrouiller la non-régression par tests ciblés

**Fichiers** : `tests/applications/market/market-application.test.mjs`, tests Market ciblés supplémentaires seulement si un contrat pur doit être isolé

**What** :

- Ajouter un cas où un item du monde expose une différence entre `system._source.rarity` et `system.rarity`, et vérifier que le Market retient bien la valeur canonique attendue.
- Ajouter/adapter un cas compendium équivalent pour confirmer que monde et compendium convergent vers la même rareté d’entrée.
- Couvrir au moins un effet observable de bout en bout sur le catalogue (tri rareté, pips, prix ou disponibilité) pour éviter une correction purement cosmétique du mapper.

**Résultat attendu** : la régression est capturée par des tests qui protègent explicitement l’alignement monde/compendium.

## Périmètre / hors périmètre

### Inclus

- Alignement de la lecture de `rarity` dans les adaptateurs Market
- Sécurisation du pipeline catalogue et des tests ciblés associés

### Exclus

- Refonte du moteur de pricing ou des règles d’obtainability
- Changement du schéma item ou migration de données
- Modifications UI autres que les effets indirects d’une rareté désormais cohérente
