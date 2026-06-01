# EW4 — Corriger les warnings de code restants

**Issue** : [#433 — EW4 — Corriger les warnings de code restants](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/433)
**Baseline de référence** : [commentaire snapshot ESLint du 433](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/433#issuecomment-4590302708) — `✖ 133 problems (0 errors, 133 warnings)`

## Objectif

Fermer le lot des warnings de code « isolés » du chantier `ESLint Warnings Reduction` qui ne relèvent ni des types JSDoc (EW2), ni des descriptions JSDoc (EW3), ni de `no-magic-numbers` (EW6 / ADR-0018), en s'appuyant sur l'état réel du lint remonté dans le commentaire de l'issue plutôt que sur l'estimation initiale du corps de l'issue.

## Constat sur l'existant

Le corps de l'issue cible historiquement `no-proto` (12), `no-promise-executor-return` (5), `jsdoc/check-param-names` (6) et des cas isolés. Le snapshot ESLint le plus récent (commentaire à utiliser en priorité) montre un état différent :

- `no-proto` : **0 occurrence** restante (`grep __proto__` sur `module/` et `swerpg.mjs` ne remonte rien) — déjà absorbé en amont.
- `no-promise-executor-return` : **0 occurrence** restante — déjà absorbé en amont.
- `jsdoc/require-param-type` : majorité des 133 warnings — **hors scope EW4**, relève de EW2 (#438).
- `no-magic-numbers` : ~16 warnings (`config/action.mjs`, `config/effects.mjs`, `config/talent-tree.mjs`) — **hors scope EW4**, relève de EW6 / ADR-0018.
- `jsdoc/require-yields` : **1 occurrence** — `module/models/action.mjs:916` (`*_tests()` documenté `@returns` au lieu de `@yields`).
- `jsdoc/check-param-names` : **3 occurrences** — `tests/models/gear.test.mjs:10` (`@param {object} [overrides]` alors que la fonction déstructure `price`, `rarity`, `broken`).

Le résiduel réellement imputable à EW4 dans l'état courant se réduit donc à **4 warnings** : 1 `jsdoc/require-yields` + 3 `jsdoc/check-param-names`.

## Décisions de cadrage

- Prendre comme baseline le snapshot ESLint du commentaire de l'issue, pas la liste prévisionnelle du corps de l'issue.
- Limiter le lot aux warnings de code « isolés » réellement présents et non rattachés à un autre lot : `jsdoc/require-yields` et `jsdoc/check-param-names`.
- Confirmer (et non re-corriger) que `no-proto` et `no-promise-executor-return` sont déjà absents : si une occurrence réapparaît au lancement du lint, la traiter mécaniquement (`Object.setPrototypeOf`, refactor de l'exécuteur de Promise) ; sinon ne rien faire.
- Exclure strictement `jsdoc/require-param-type` (EW2), `jsdoc/require-description` (EW3) et `no-magic-numbers` (EW6) : aucune absorption opportuniste.
- Corrections documentaires/mécaniques uniquement, sans changement comportemental ni refactor fonctionnel.

## Plan de travail

### 1. Re-figer la baseline EW4 depuis le lint courant

**Fichiers cibles** : rapport ESLint courant sur `module/**/*.mjs`, `tests/**/*.mjs`, `swerpg.mjs`

**What**

- relancer la passe ESLint pour obtenir l'état à jour et le comparer au snapshot du commentaire ;
- isoler uniquement les warnings `jsdoc/require-yields` et `jsdoc/check-param-names`, plus toute éventuelle réapparition de `no-proto` / `no-promise-executor-return` ;
- écarter explicitement `jsdoc/require-param-type`, `jsdoc/require-description` et `no-magic-numbers` du lot.

**Validation visée** : le périmètre EW4 est borné au résiduel réel et ne recouvre pas EW2/EW3/EW6.

### 2. Aligner le contrat `@yields` du générateur

**Fichiers cibles** : `module/models/action.mjs` (`*_tests()`, ~ligne 916)

**What**

- remplacer/compléter le bloc JSDoc du générateur pour exposer un `@yields` cohérent avec les valeurs réellement `yield`ées, conformément à `jsdoc/require-yields` ;
- conserver le comportement et la signature du générateur inchangés.

**Validation visée** : le warning `jsdoc/require-yields` disparaît sans modifier la mécanique du générateur.

### 3. Aligner les noms de paramètres JSDoc déstructurés

**Fichiers cibles** : `tests/models/gear.test.mjs` (`buildGearData`, ~ligne 10)

**What**

- documenter les propriétés déstructurées (`overrides.price`, `overrides.rarity`, `overrides.broken`) attendues par `jsdoc/check-param-names`, en restant fidèle aux valeurs par défaut existantes ;
- ne pas altérer la logique du helper ni les tests qui l'utilisent.

**Validation visée** : les 3 warnings `jsdoc/check-param-names` disparaissent sans changer le comportement du helper de test.

### 4. Qualifier le résiduel et préparer la revalidation globale

**Fichiers cibles** : fichiers modifiés EW4, rapport ESLint du lot

**What**

- vérifier qu'aucun warning hors périmètre EW4 n'a été touché ;
- confirmer le statut « déjà résolu » de `no-proto` / `no-promise-executor-return` ou consigner la correction si réapparition ;
- laisser le résiduel restant (`jsdoc/require-param-type`, `no-magic-numbers`) clairement attribué à EW2 et EW6 pour la revalidation globale du chantier.

**Validation visée** : EW4 ferme uniquement les warnings de code isolés et laisse un résiduel proprement routé.

## Fichiers probablement modifiés

- `module/models/action.mjs` — JSDoc `@yields` du générateur `*_tests()`.
- `tests/models/gear.test.mjs` — JSDoc `@param` déstructuré de `buildGearData`.

## Tests attendus

- Aucun nouveau test requis (corrections documentaires).
- Non-régression : `pnpm vitest run tests/models/gear.test.mjs` doit rester vert.
- `pnpm exec eslint module/models/action.mjs tests/models/gear.test.mjs` ne remonte plus `jsdoc/require-yields` ni `jsdoc/check-param-names`.

## Risques et mitigations

- **Risque** : déborder sur EW2 (`require-param-type`) ou EW6 (`no-magic-numbers`) par effet de bord lors de l'édition des blocs JSDoc. **Mitigation** : limiter chaque diff aux lignes signalées, ne pas reformuler les blocs voisins.
- **Risque** : `@yields` mal typé créant une doc trompeuse. **Mitigation** : refléter exactement les valeurs `yield`ées observables dans `*_tests()`.
- **Risque** : réapparition de `no-proto` / `no-promise-executor-return` non anticipée. **Mitigation** : étape 1 compare au lint courant et inclut ces règles dans le filtre.

## Critères d'arrêt

- `jsdoc/require-yields` et `jsdoc/check-param-names` à 0 sur le scope EW4.
- `no-proto` et `no-promise-executor-return` confirmés à 0 (ou corrigés si présents).
- Aucun warning EW2/EW3/EW6 absorbé ou modifié.
- Suite Vitest impactée verte, aucun changement comportemental introduit.
