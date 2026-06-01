# EW4 — Corriger les warnings de code restants

**Issue** : [#433 — EW4 — Corriger les warnings de code restants](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/433)
**Baseline de référence** : [commentaire snapshot ESLint du 433](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/433#issuecomment-4590302708) — `✖ 133 problems (0 errors, 133 warnings)`
**ADR** : [`adr-0018-no-magic-numbers-named-constants.md`](../../../architecture/adr/adr-0018-no-magic-numbers-named-constants.md) (pour le Lot C)

> **Mise à jour de périmètre (décision utilisateur)** : EW4 est élargi pour absorber, en plus des warnings de code isolés, le lot `jsdoc/require-param-type` (initialement EW2 #438) **et** le lot `no-magic-numbers` (initialement EW6 / ADR-0018). Ce regroupement est volontaire : EW4 devient le lot de clôture global des 133 warnings restants. Voir « Écart de périmètre assumé » plus bas.

## Objectif

Ramener à 0 les 133 warnings ESLint restants remontés par le snapshot du commentaire, en trois lots distincts mais portés par cette même story : warnings de code isolés (Lot A), types JSDoc manquants (Lot B), et magic numbers (Lot C). Corrections prudentes, sans changement comportemental, alignées sur l'état réel du lint plutôt que sur l'estimation initiale du corps de l'issue.

## Périmètre

### Inclus

- **Lot A — warnings de code isolés** : `jsdoc/require-yields`, `jsdoc/check-param-names`, plus toute réapparition de `no-proto` / `no-promise-executor-return`.
- **Lot B — types JSDoc** : `jsdoc/require-param-type` sur l'ensemble du scope (`module/**/*.mjs`, `tests/**/*.mjs`, `swerpg.mjs`).
- **Lot C — magic numbers** : `no-magic-numbers` dans `module/config/*.mjs`, traités selon ADR-0018 (constantes nommées + tests contractuels).

### Hors scope

- `jsdoc/require-description` (reste EW3 #432).
- Tout refactor fonctionnel, renommage, ou changement de règle métier non strictement requis par une correction de warning.

## Constat sur l'existant

Le corps de l'issue cible historiquement `no-proto` (12), `no-promise-executor-return` (5), `jsdoc/check-param-names` (6) et des cas isolés. Le snapshot ESLint le plus récent (commentaire prioritaire) montre un état différent, réparti ainsi :

| Règle                        | Occurrences | Localisation                                                        | Lot             |
| ---------------------------- | ----------- | ------------------------------------------------------------------- | --------------- |
| `no-proto`                   | 0           | — (`grep __proto__` vide)                                           | A (déjà résolu) |
| `no-promise-executor-return` | 0           | —                                                                   | A (déjà résolu) |
| `jsdoc/require-yields`       | 1           | `module/models/action.mjs:916`                                      | A               |
| `jsdoc/check-param-names`    | 3           | `tests/models/gear.test.mjs:10`                                     | A               |
| `jsdoc/require-param-type`   | ~109        | ~23 fichiers (voir Lot B)                                           | B               |
| `no-magic-numbers`           | ~16         | `config/action.mjs`, `config/effects.mjs`, `config/talent-tree.mjs` | C               |

> **Statut Lot A** : déjà implémenté. `module/models/action.mjs` (`*_tests()` → `@yields`) et `tests/models/gear.test.mjs` (`buildGearData` → `@param overrides.*`) corrigés ; `eslint` ne remonte plus `require-yields` ni `check-param-names` sur ces fichiers ; `no-proto` / `no-promise-executor-return` confirmés à 0. Reste à traiter : Lot B et Lot C.

## Décisions de cadrage

- Baseline = snapshot ESLint du commentaire, à re-figer par une passe lint fraîche avant le Lot B (le Lot A a déjà bougé l'état).
- **Lot B** : ajouter des types **larges, observables et défendables** (`string`, `number`, `boolean`, `object`, `Array<...>`, unions simples, nullable) plutôt que des types métier spéculatifs. Réutiliser les typedefs/shapes locaux quand ils existent. Pas de réécriture documentaire ni de description (ça reste EW3).
- **Lot C** : appliquer strictement ADR-0018 — extraire chaque littéral porteur de sens métier en constante nommée dans `module/config/<entity>.mjs`, exposée via `SYSTEM.<ENTITY>.<CONST>`, avec `Object.defineProperty({ enumerable: false })` si le parent est itéré, et ajouter/compléter un test contractuel sous `tests/config/<entity>.test.mjs`. Ne pas masquer un warning avec un commentaire `eslint-disable` sauf littéral réellement non métier dûment justifié.
- Prioriser les fichiers les plus denses pour une baisse visible et des revues lisibles.
- Corrections sans changement comportemental : un magic number extrait doit conserver exactement la même valeur.

## Plan de travail

### Lot A — warnings de code isolés ✅ (fait)

1. **Re-figer la baseline** — passe ESLint, filtrer `require-yields`, `check-param-names`, `no-proto`, `no-promise-executor-return`.
2. **`@yields`** — `module/models/action.mjs` (`*_tests()`) : `@returns {Generator<...>}` → `@yields`.
3. **`check-param-names`** — `tests/models/gear.test.mjs` (`buildGearData`) : documenter `overrides.price/rarity/broken`.

> Étapes 2-3 livrées. Étape 1 reconduite en tête du Lot B pour re-figer la baseline avant d'attaquer les types.

### Lot B — `jsdoc/require-param-type`

**Fichiers cibles** (du snapshot, à reconfirmer par lint frais) :
`module/applications/character-audit-log.mjs`, `module/applications/specialization-tree-app.mjs`, `module/canvas/grid.mjs`, `module/canvas/talent-icon.mjs`, `module/canvas/talent-tree-talent.mjs`, `module/canvas/talent-tree.mjs`, `module/canvas/token.mjs`, `module/config/qualities.mjs`, `module/config/talent-tree.mjs`, `module/dice/action-use-dialog.mjs`, `module/dice/standard-check-dialog.mjs`, `module/documents/actor.mjs`, `module/documents/item.mjs`, `module/importer/oggDude.mjs`, `module/models/action.mjs` (lignes 1203-1206), `module/models/actor-type.mjs`, `module/models/career.mjs`, `module/models/specialization.mjs`, `module/models/species.mjs`, `module/settings/OggDudeDataImporter.mjs`, `module/settings/directories.mjs`, `module/utils/oggdude-mapping-config.mjs`, `module/utils/skill-costs.mjs`.

**What**

- regrouper les corrections par fichier/module cohérent (batches relisibles), en commençant par les plus denses (`oggDude.mjs`, `OggDudeDataImporter.mjs`, `character-audit-log.mjs`, `action-use-dialog.mjs`) ;
- ajouter sur chaque `@param` signalé le type le plus simple compatible avec l'usage réel visible localement ;
- pour les params déstructurés (`options.*`, `root0.*`), typer chaque sous-propriété signalée ;
- ne pas reformuler les descriptions, ne pas renommer, ne pas restructurer les signatures.

**Validation visée** : `jsdoc/require-param-type` à 0 sur tout le scope, sans documentation trompeuse.

### Lot C — `no-magic-numbers` (ADR-0018)

**Fichiers cibles** :

- `module/config/action.mjs` — `2` (lignes 400, 401, 402, 567).
- `module/config/effects.mjs` — `16` (ligne 7 ×2), `2` (lignes 76, 100, 170, 285).
- `module/config/talent-tree.mjs` — `3` (154), `0.5` (221 ×2, 222), `2` (286).

**What**

- pour chaque littéral, déterminer le sens métier et choisir un nom de constante explicite (ex. multiplicateur de dégâts, taille d'icône, demi-pas de grille) ;
- déclarer la constante dans le `module/config/<entity>.mjs` correspondant, exposée via `SYSTEM.<ENTITY>.<CONST>`, `enumerable: false` si le parent est itéré par des consommateurs ;
- remplacer le littéral par la constante au point d'usage ;
- ajouter/compléter le test contractuel sous `tests/config/<entity>.test.mjs` vérifiant la valeur et la non-énumérabilité quand applicable ;
- réutiliser une constante existante si elle porte déjà ce sens, plutôt qu'en créer une seconde.

**Validation visée** : `no-magic-numbers` à 0 sur `module/config/*`, valeurs inchangées, tests contractuels verts.

### Clôture

- relancer la passe ESLint complète : 0 warning sur le scope ;
- vérifier le diff (pas de débordement hors warnings ciblés) ;
- confirmer non-régression des suites de tests impactées.

## Fichiers probablement modifiés

- **Lot A (fait)** : `module/models/action.mjs`, `tests/models/gear.test.mjs`.
- **Lot B** : les ~23 fichiers listés ci-dessus (JSDoc `@param` uniquement).
- **Lot C** : `module/config/action.mjs`, `module/config/effects.mjs`, `module/config/talent-tree.mjs` + `tests/config/action.test.mjs`, `tests/config/effects.test.mjs`, `tests/config/talent-tree.test.mjs` (création/màj selon existant).

## Tests attendus

- **Lot A/B** : corrections documentaires → pas de nouveau test ; non-régression `pnpm vitest run` sur fichiers ayant un test associé (ex. `tests/models/gear.test.mjs`).
- **Lot C** : un test contractuel par constante nommée sous `tests/config/<entity>.test.mjs` (valeur exacte + non-énumérabilité si `enumerable: false`).
- Global : `pnpm exec eslint module tests swerpg.mjs` → 0 warning sur les règles ciblées.

## Risques et mitigations

- **Risque** : types JSDoc spéculatifs créant une doc fausse (Lot B). **Mitigation** : types larges fondés sur l'usage local observable, pas d'invention de contrat métier.
- **Risque** : extraction d'un magic number changeant la valeur ou la sémantique (Lot C). **Mitigation** : valeur strictement identique, test contractuel figeant la valeur.
- **Risque** : un `no-magic-numbers` portant sur un littéral non métier (ex. `2` purement arithmétique). **Mitigation** : si aucune sémantique métier, justifier un `// eslint-disable-next-line` ciblé plutôt qu'une constante artificielle — décision au cas par cas, documentée dans le diff.
- **Risque** : diff transverse illisible vu le nombre de fichiers (Lot B). **Mitigation** : batches par module, commits courts.
- **Risque** : débordement sur `jsdoc/require-description` (EW3). **Mitigation** : ne toucher que les `@param` de type, pas les descriptions.

## Écart de périmètre assumé

Le découpage chantier d'origine isolait `require-param-type` en EW2 (#438) et `no-magic-numbers` en EW6 / ADR-0018. Sur décision utilisateur, ces deux lots sont rapatriés dans EW4 #433 qui devient le lot de clôture global des warnings. Conséquence : EW2 et EW6 deviennent sans objet si EW4 ramène le compteur à 0 ; à acter au moment de la revalidation du chantier pour éviter un double traitement.

## Critères d'arrêt

- Lot A : `require-yields`, `check-param-names` à 0 ; `no-proto` / `no-promise-executor-return` confirmés à 0. ✅
- Lot B : `jsdoc/require-param-type` à 0 sur tout le scope.
- Lot C : `no-magic-numbers` à 0 sur `module/config/*`, constantes nommées + tests contractuels verts, valeurs inchangées.
- `jsdoc/require-description` (EW3) non touché.
- Suites Vitest impactées vertes, aucun changement comportemental introduit.
