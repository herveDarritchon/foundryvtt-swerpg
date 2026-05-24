# Plan d'implementation - Issue #368

**Issue** : [#368 - PWE2 - [Tier 1 Regression] Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/368)
**Dependances** : [#366 - Playwright Local Foundry Smoke Tests - Securiser les parcours MJ essentiels en local](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/366), [#367 - PWE1 - Stabiliser la baseline locale Playwright et le monde E2E](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/367)
**Domaine metier** : `tests/e2e`
**Source de cadrage** :

- `documentation/plan/tests/366-playwright-local-foundry-smoke-tests-securiser-les-parcours-mj-essentiels-en-local.md`
- `documentation/plan/tests/367-pwe1-stabiliser-la-baseline-locale-playwright-et-le-monde-e2e.md`
- `documentation/plan/tests/e2e/strategie-contrat-commandes-e2e-smoke-regression.md`

---

## 1. Objectif

Fiabiliser les interactions Playwright utilisees par les scenarios de regression Tier 1 et les specs legacy encore actives, puis rendre toute erreur navigateur inattendue immediatement visible afin de reduire la flakiness et d'accelerer le diagnostic des regressions UI Foundry/SWERPG.

---

## 2. Perimetre

### Inclus

- contrat d'interaction commun pour les helpers Playwright critiques ;
- capture centralisee des erreurs `console` et `pageerror` non autorisees ;
- adoption de ces garde-fous dans les specs Tier 1 sous `e2e/regression/**` ;
- adoption du meme contrat dans les specs legacy sous `e2e/specs/*.ts` tant qu'elles restent actives ;
- documentation courte des regles d'usage pour les futures specs.

### Exclu

- ajout d'une large nouvelle couverture metier hors Tier 1 et hors specs legacy deja actives ;
- refonte complete de toute l'arborescence E2E sans besoin direct ;
- changements runtime applicatifs hors besoins stricts des tests Playwright.

---

## 3. Cible fonctionnelle

Le meme contrat technique doit s'appliquer a deux zones tant qu'elles coexistent :

- `e2e/regression/**` pour la baseline Tier 1 pre-livraison ;
- `e2e/specs/*.ts` pour les specs legacy encore executees ou conservees comme reference.

Ce contrat commun impose :

- des helpers d'interaction centralises pour les etapes Foundry critiques ;
- des attentes explicites sur la navigation et la disponibilite UI ;
- une politique unique de capture et de filtrage des erreurs navigateur ;
- des messages d'echec relisibles relies au scenario fautif.

---

## 4. Plan de travail propose

### Etape 1 - Formaliser le contrat d'interaction partage

**But** : supprimer les interactions fragiles dispersees et imposer des helpers de navigation/action coherents pour `regression` et `legacy`.

**Fichiers cibles** : `e2e/utils/foundrySession.ts`, `e2e/utils/foundryUI.ts`, `e2e/utils/playwrightTest.ts`

**Actions** :

- identifier les interactions Tier 1 et legacy reellement critiques a centraliser ;
- privilegier des helpers fondes sur roles, labels et attentes explicites plutot que des selecteurs decoratifs ;
- integrer des garde-fous de synchronisation et des messages d'echec lisibles ;
- verifier que les specs `e2e/specs/*.ts` utilisent elles aussi ces helpers au lieu de sequences locales ad hoc.

### Etape 2 - Brancher une capture d'erreurs navigateur centralisee

**But** : faire echouer rapidement tout scenario `regression` ou `legacy` quand le navigateur remonte une regression significative.

**Fichiers cibles** : `e2e/fixtures/index.ts`, `e2e/utils/playwrightTest.ts`, eventuels helpers partages sous `e2e/utils/`

**Actions** :

- capturer de facon homogene les erreurs `console` et `pageerror` inattendues ;
- definir une politique explicite de filtrage minimale pour les bruits connus et maitrises ;
- enrichir le reporting pour rattacher clairement l'erreur a la spec en echec ;
- appliquer ce branchement unique a la fixture partagee consommee par `e2e/specs/*.ts` et par les specs de regression qui importent deja `../../fixtures`.

### Etape 3 - Migrer les scenarios Tier 1 et les specs legacy prioritaires vers ce contrat

**But** : appliquer immediatement le contrat sur tous les parcours actuellement utilises comme baseline de confiance.

**Fichiers cibles** : `e2e/regression/specs/**/*.ts`, `e2e/specs/*.ts`, helpers partages sous `e2e/utils/`

**Actions** :

- remplacer les interactions fragiles des scenarios prioritaires par les helpers centralises ;
- verifier que chaque spec echoue bien sur erreur navigateur non autorisee ;
- conserver des scenarios courts, diagnostiquables et compatibles avec la baseline locale definie par `PWE1` ;
- reduire les divergences de comportement entre specs legacy et specs `regression` tant qu'elles reposent sur la meme fixture partagee.

### Etape 4 - Documenter le contrat et les criteres de cloture

**But** : eviter le retour de patterns fragiles lors de l'ajout ou de la maintenance de nouvelles specs.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`

**Actions** :

- documenter quels helpers doivent etre utilises pour les interactions critiques ;
- expliciter la regle de traitement des erreurs navigateur et des exceptions tolerees ;
- ajouter une checklist courte pour toute nouvelle spec `regression` ou spec legacy encore maintenue ;
- rappeler que toute nouvelle spec doit converger vers le contrat partage, meme avant sa requalification structurelle.

---

## 5. Ordre recommande

1. Contrat d'interaction partage
2. Capture d'erreurs navigateur
3. Migration des scenarios `regression` et `legacy`
4. Documentation et criteres de cloture

---

## 6. Validation prevue

- execution ciblee des specs Tier 1 concernees sous `e2e/regression/specs/` ;
- execution ciblee des specs legacy encore actives sous `e2e/specs/*.ts` ;
- verification qu'une erreur `console` ou `pageerror` non autorisee fait bien echouer chaque famille de specs ;
- relecture croisee helpers <-> fixtures <-> documentation pour confirmer un contrat unique et explicite.

---

## 7. Resultat attendu

Les scenarios Playwright Tier 1 sous `e2e/regression/**` et les specs legacy sous `e2e/specs/*.ts` reposent sur un meme contrat d'interaction stable, detectent explicitement les erreurs navigateur inattendues, et fournissent des diagnostics plus rapides en cas de regression locale ou pre-livraison.
