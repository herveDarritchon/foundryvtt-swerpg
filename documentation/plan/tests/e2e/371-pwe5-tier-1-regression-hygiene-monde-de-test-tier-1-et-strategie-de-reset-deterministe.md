# Plan d'implémentation — Issue #371

**Issue** : [#371 — PWE5 - [Tier 1 Regression] Hygiène monde de test Tier 1 et stratégie de reset déterministe](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/371)
**Dépendances** : [#366 — Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 — PWE1 - [Tier 1 Regression] Stabiliser la baseline et l'environnement dédié (port 31001, Docker)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367), [#368 — PWE2 - [Tier 1 Regression] Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368), [#369 — PWE3 - [Tier 1 Regression] Spec regression : création personnage et ouverture de fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/369), [#370 — PWE4 - [Tier 1 Regression] Spec regression : dépense simple d'XP et ouverture arbre de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/370)
**Domaine métier** : `tests`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/367-pwe1-stabiliser-la-baseline-locale-playwright-et-le-monde-e2e.md`
- `documentation/plan/tests/368-pwe2-fiabiliser-les-contrats-d-interaction-et-la-capture-d-erreurs-navigateur.md`
- `documentation/plan/tests/369-pwe3-tier-1-regression-spec-regression-creation-personnage-et-ouverture-de-fiche.md`
- `documentation/plan/tests/370-pwe4-tier-1-regression-spec-regression-depense-simple-d-xp-et-ouverture-arbre-de-specialisation.md`
- `documentation/plan/tests/e2e/strategie-e2e-deux-etages-regression-et-smoke-prod.md`
- `documentation/tests/e2e/playwright-e2e-guide.md`
- `e2e/README.md`

---

## 1. Objectif

Formaliser puis outiller une stratégie de reset déterministe pour le monde Tier 1 afin que les specs de régression restent reproductibles, idempotentes et indépendantes de leur ordre d'exécution.

---

## 2. Périmètre

### Inclus

- décision explicite entre reset complet du monde et cleanup ciblé par spec ;
- définition des données minimales attendues par domaine fonctionnel couvert ;
- politique de noms uniques et/ou suppression systématique des artefacts de test ;
- sécurisation du bootstrap `globalSetup` quand le monde existe déjà ;
- vérification du déterminisme sur les parcours `PWE3` et `PWE4`.

### Exclu

- extension de couverture E2E hors parcours déjà priorisés ;
- refonte générale des helpers Playwright sans lien direct avec l'hygiène du monde ;
- changement applicatif runtime sans preuve qu'il est nécessaire pour stabiliser le reset Tier 1.

---

## 3. Plan de travail proposé

### Étape 1 — Trancher et documenter le contrat d'hygiène Tier 1

**But** : décider un contrat unique de remise à zéro, compréhensible et applicable par toutes les specs de régression.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle documentation courte sous `documentation/tests/e2e/`

**Actions** :

- comparer explicitement les deux approches visées par l'issue : monde jetable/recréé vs cleanup systématique par spec ;
- retenir une règle opérationnelle par défaut, ainsi que les exceptions tolérées si certaines specs doivent nettoyer leurs propres artefacts ;
- documenter les données minimales requises par domaine déjà couvert (`smoke`, création personnage, dépense XP / arbre) ;
- expliciter la règle de nommage unique ou de teardown obligatoire pour éviter les collisions inter-specs.

### Étape 2 — Rendre le bootstrap monde idempotent et reproductible

**But** : garantir qu'un lancement sur monde absent, déjà présent, partiellement pollué ou déjà actif converge vers un état connu.

**Fichiers cibles** : `e2e/regression/fixtures/global-setup.ts`, `e2e/regression/utils/world-manager.ts`, éventuels helpers partagés sous `e2e/regression/utils/` et `e2e/fixtures/`

**Actions** :

- clarifier le rôle exact de `globalSetup` : créer, réinitialiser ou nettoyer le monde selon la politique retenue ;
- fiabiliser la gestion des cas `monde déjà existant`, `monde déjà actif`, `retour setup` et `rebootstrap` sans dépendance à l'ordre des specs ;
- centraliser les primitives de reset/cleanup pour éviter des nettoyages ad hoc dispersés dans les specs ;
- rendre observable le reset réellement exécuté pour accélérer le diagnostic en cas d'échec de préparation.

### Étape 3 — Réaligner les specs Tier 1 prioritaires sur ce contrat

**But** : prouver que la stratégie retenue fonctionne sur les deux parcours réels déjà identifiés comme sensibles.

**Fichiers cibles** : specs Tier 1 sous `e2e/regression/specs/**`, fixtures sous `e2e/fixtures/**` ou `e2e/regression/fixtures/**`, éventuels helpers sous `e2e/utils/**`

**Actions** :

- expliciter pour `PWE3` et `PWE4` quelles données doivent être présentes avant exécution et lesquelles doivent être créées/effacées par le scénario ;
- remplacer les hypothèses implicites sur l'état du monde par des préconditions ou nettoyages centralisés compatibles avec la politique retenue ;
- verrouiller un ordre d'exécution indifférent : exécution isolée, séquentielle, puis répétée sur monde déjà existant ;
- documenter brièvement la frontière entre données communes de baseline et artefacts éphémères de scénario.

---

## 4. Ordre recommandé

1. Contrat d'hygiène Tier 1
2. Bootstrap monde idempotent
3. Réalignement des specs prioritaires

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de `PWE3` puis `PWE4`, puis dans l'ordre inverse, pour vérifier l'indépendance ;
- relance complète sur un monde déjà existant pour confirmer le comportement idempotent de `globalSetup` ;
- vérification qu'aucun artefact métier résiduel ne pollue la campagne suivante ;
- relecture croisée `README ↔ guide E2E ↔ helpers de reset ↔ specs` pour confirmer un contrat unique et explicite.

---

## 6. Résultat attendu

Le Tier 1 dispose d'une stratégie de reset claire, documentée et outillée ; les specs prioritaires restent déterministes même sur monde déjà existant, et les futures régressions liées à la pollution de données deviennent rapides à diagnostiquer.
