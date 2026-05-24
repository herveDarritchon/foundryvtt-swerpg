# Plan d'implémentation — Issue #370

**Issue** : [#370 — PWE4 - [Tier 1 Regression] Spec regression : dépense simple d'XP et ouverture arbre de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/370)
**Dépendances** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 — PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367), [#368 — PWE2 - [Tier 1 Regression] Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368), [#369 — PWE3 - [Tier 1 Regression] Spec regression : création personnage et ouverture de fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/369)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/368-pwe2-fiabiliser-les-contrats-d-interaction-et-la-capture-d-erreurs-navigateur.md`
- `documentation/plan/tests/369-pwe3-tier-1-regression-spec-regression-creation-personnage-et-ouverture-de-fiche.md`
- `documentation/plan/tests/e2e/strategie-e2e-deux-etages-regression-et-smoke-prod.md`

---

## 1. Objectif

Corriger la régression de la spec Tier 1 couvrant la dépense simple d'XP et l'ouverture de l'arbre de spécialisation, afin de restaurer un parcours E2E local fiable, diagnostiquable et aligné sur le contrat Playwright partagé.

---

## 2. Périmètre

### Inclus

- diagnostic précis du point de rupture dans le parcours `dépense XP → persistance minimale → ouverture arbre de spécialisation` ;
- réalignement de la spec sur les helpers, fixtures et attentes désormais retenus pour Tier 1 ;
- verrouillage des critères de succès métier visibles et des erreurs navigateur non autorisées.

### Exclu

- extension du périmètre E2E au-delà du scénario déjà ciblé ;
- refonte générale du socle Playwright sans lien direct avec la régression ;
- changement runtime applicatif sans preuve qu'il est requis pour corriger la spec.

---

## 3. Plan de travail proposé

### Étape 1 — Circonscrire précisément la régression du scénario XP / arbre

**But** : identifier si la rupture vient des préconditions acteur, du contrat d'interaction UI, d'une attente asynchrone ou d'un bruit navigateur désormais bloquant.

**Fichiers cibles** : spec Tier 1 concernée sous `e2e/regression/**` et/ou `e2e/specs/**`, fixtures sous `e2e/fixtures/**`, helpers sous `e2e/utils/**`

**Actions** :

- isoler la séquence minimale qui échoue entre la dépense d'XP, la vérification du recalcul visible et l'ouverture de l'arbre ;
- qualifier la cause dominante : données de départ, action UI fragile, persistance insuffisamment vérifiée ou erreur navigateur ;
- formaliser le signal attendu de succès pour chaque sous-étape du parcours.

### Étape 2 — Réaligner la spec sur le contrat Tier 1 partagé

**But** : rendre le scénario compatible avec les helpers centralisés et les garde-fous de synchronisation déjà retenus.

**Fichiers cibles** : spec Tier 1 concernée, `e2e/utils/foundrySession.ts`, `e2e/utils/foundryUI.ts`, `e2e/fixtures/index.ts`, éventuels helpers partagés sous `e2e/utils/`

**Actions** :

- remplacer les interactions fragiles restantes par les helpers centralisés déjà adoptés sur les autres specs Tier 1 ;
- expliciter les préconditions déterministes nécessaires à une dépense simple d'XP observable ;
- verrouiller l'ouverture de l'arbre de spécialisation avec des attentes lisibles sur la surface réellement utile, sans assertions décoratives.

### Étape 3 — Sécuriser la persistance minimale et le diagnostic de clôture

**But** : éviter qu'une future dérive rende à nouveau la spec opaque ou flaky.

**Fichiers cibles** : spec Tier 1 concernée, éventuelle documentation courte sous `e2e/README.md` ou `documentation/tests/e2e/`

**Actions** :

- conserver une détection explicite des erreurs `console` / `pageerror` non autorisées sur ce parcours ;
- clarifier l'assertion finale qui prouve à la fois l'impact visible sur l'XP et l'ouverture exploitable de l'arbre de spécialisation ;
- documenter brièvement les préconditions et le contrat minimal du scénario si une ambiguïté persiste.

---

## 4. Ordre recommandé

1. Circonscrire la régression
2. Réaligner la spec sur le contrat partagé
3. Sécuriser la persistance minimale et le diagnostic

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de la spec Tier 1 impactée ;
- vérification qu'une dépense simple d'XP produit un recalcul visible et persistant selon le contrat retenu ;
- vérification que l'arbre de spécialisation s'ouvre sans erreur navigateur non autorisée ;
- relecture croisée `spec ↔ helpers ↔ fixtures` pour confirmer un contrat unique et déterministe.

---

## 6. Résultat attendu

Le scénario Tier 1 centré sur la dépense simple d'XP et l'ouverture de l'arbre de spécialisation redevient une baseline locale fiable, avec un contrat d'interaction explicite et un diagnostic rapide en cas de nouvelle régression.
