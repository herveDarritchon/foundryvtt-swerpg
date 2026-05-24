# Plan d'implémentation — Issue #369

**Issue** : [#369 — PWE3 - [Tier 1 Regression] Spec regression : création personnage et ouverture de fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/369)
**Dépendances** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 — PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367), [#368 — PWE2 - [Tier 1 Regression] Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/367-pwe1-stabiliser-la-baseline-locale-playwright-et-le-monde-e2e.md`
- `documentation/plan/tests/368-pwe2-fiabiliser-les-contrats-d-interaction-et-la-capture-d-erreurs-navigateur.md`
- `documentation/plan/tests/e2e/strategie-contrat-commandes-e2e-smoke-regression.md`

---

## 1. Objectif

Corriger la régression de la spec Tier 1 couvrant la création de personnage et l'ouverture de fiche, afin de restaurer un parcours E2E local fiable, diagnostiquable et cohérent avec les contrats Playwright déjà définis par `PWE1` et `PWE2`.

---

## 2. Périmètre

### Inclus

- diagnostic précis du point de rupture dans le parcours `création personnage → ouverture de fiche` ;
- réalignement de la spec sur les helpers, fixtures et attentes supportés ;
- verrouillage des critères d'ouverture de fiche et de détection d'erreurs navigateur pour ce scénario.

### Exclu

- ajout d'une nouvelle couverture métier hors scénario déjà ciblé ;
- refonte générale de tout le socle Playwright ;
- changements runtime applicatifs sans lien direct avec la régression observée.

---

## 3. Plan de travail proposé

### Étape 1 — Circonscrire précisément la régression du scénario

**But** : identifier si la rupture vient du setup du monde, de la création d'acteur, de l'ouverture de fiche ou d'un bruit navigateur désormais bloquant.

**Fichiers cibles** : spec Tier 1 concernée sous `e2e/regression/**` et/ou `e2e/specs/**`, fixtures sous `e2e/fixtures/**`, helpers sous `e2e/utils/**`

**Actions** :

- isoler la séquence minimale qui échoue dans le parcours ;
- qualifier la cause dominante : précondition monde/données, contrat d'interaction UI, attente asynchrone ou erreur navigateur ;
- formaliser le signal attendu de succès et le signal d'échec utile au diagnostic.

### Étape 2 — Réaligner la création de personnage et l'ouverture de fiche sur le contrat partagé

**But** : rendre le scénario compatible avec les helpers d'interaction et les garde-fous introduits pour la baseline locale.

**Fichiers cibles** : spec Tier 1 concernée, `e2e/utils/foundrySession.ts`, `e2e/utils/foundryUI.ts`, `e2e/fixtures/index.ts`, éventuels helpers partagés sous `e2e/utils/`

**Actions** :

- remplacer les interactions fragiles restantes par les helpers centralisés déjà retenus ;
- expliciter les préconditions déterministes nécessaires à la création du personnage ;
- verrouiller l'enchaînement d'ouverture de fiche avec des attentes lisibles sur l'UI réellement utile.

### Étape 3 — Sécuriser le diagnostic et les critères de clôture du scénario

**But** : éviter qu'une future dérive rende à nouveau la spec opaque ou flaky.

**Fichiers cibles** : spec Tier 1 concernée, éventuelle documentation courte sous `e2e/README.md` ou `documentation/tests/e2e/`

**Actions** :

- conserver une détection explicite des erreurs `console` / `pageerror` non autorisées pour ce parcours ;
- clarifier l'assertion finale qui prouve que la fiche du personnage est bien ouverte et exploitable ;
- documenter brièvement les préconditions et le contrat minimal du scénario si une ambiguïté subsiste.

---

## 4. Ordre recommandé

1. Circonscrire la régression
2. Réaligner le scénario sur le contrat partagé
3. Sécuriser le diagnostic et les critères de clôture

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de la spec Tier 1 impactée ;
- vérification que la création du personnage aboutit et que sa fiche s'ouvre sans erreur navigateur non autorisée ;
- relecture croisée `spec ↔ helpers ↔ fixtures` pour confirmer un contrat unique et déterministe sur ce parcours.

---

## 6. Résultat attendu

Le scénario Tier 1 centré sur la création de personnage et l'ouverture de fiche redevient une baseline locale fiable, avec un contrat d'interaction explicite et un diagnostic rapide en cas de nouvelle régression.
