# Strategie E2E a deux etages

**Contexte** : besoin de separer clairement les tests E2E de non-regression fonctionnelle profonde et les tests E2E de surface sur instance de production.

**Decision structurante** :

- les tests `smoke prod` tournent uniquement en manuel, post-deploiement (pnpm run e2e:smoke) ;
- ils ne tournent pas en pipeline GitHub car l'execution Foundry VTT requiert une machine locale adaptee, notamment cote GPU et performances navigateur ;
- les tests `regression` tournent sur une instance E2E dediee, avec monde controle et mutations autorisees (pnpm run e2e:regression).

---

## 1. Objectif

Mettre en place une strategie Playwright a deux etages :

- un etage `regression` pour valider en profondeur les parcours fonctionnels, la persistance et les regressions UI/metier sur une instance E2E dediee ;
- un etage `smoke prod` pour verifier rapidement, manuellement et sans mutation, que l'instance de production deployee est saine et exploitable.

---

## 2. Perimetre

### Inclus

- separation explicite entre suites `regression` et `smoke prod` ;
- conventions d'execution, de structure de fichiers et de variables d'environnement ;
- criteres de couverture initiaux pour chaque etage ;
- documentation de la frontiere CI / execution manuelle ;
- garde-fous pour garantir que le `smoke prod` reste strictement non destructif.

### Exclu

- execution automatique des `smoke prod` dans GitHub Actions ;
- transformation du `smoke prod` en suite fonctionnelle profonde ;
- couverture exhaustive de toute la logique metier par Playwright quand Vitest est plus adapte ;
- refonte globale des tests non liee a cette separation de strategie.

---

## 3. Architecture cible

### Etage 1 - `regression`

**Cible** : instance Foundry E2E dediee (e2e: port 31001), monde controle, donnees jetables ou regenerables.

**Usage** : non-regression fonctionnelle profonde avant merge important, avant release, ou en campagne locale dediee.

**Proprietes** :

- mutations autorisees ;
- persistance verifiee ;
- workflows complets autorises ;
- couverture large par domaine fonctionnel ;
- duree plus longue acceptable ;
- priorite a Chromium, extension eventuelle a Firefox pour un sous-ensemble stable.

### Etage 2 - `smoke prod`

**Cible** : instance Foundry actuellement deployee (port 30000). Monde standant de test (test-v14-309).

**Usage** : verification manuelle post-deploiement, depuis une machine locale adaptee.

**Proprietes** :

- lecture seule ;
- aucune creation, edition, suppression ou import ;
- duree tres courte ;
- focus sur la sante de l'instance et la disponibilite des surfaces critiques ;
- diagnostic rapide en cas de regression visible ou de crash navigateur (ouverture de feuille de personnage démo, check du i18n, ...).

---

## 4. Arborescence cible

Conserver l'intention deja visible dans le repository et la rendre explicite :

- `e2e/regression/**` : suite de non-regression profonde sur instance dediee ;
- `e2e/specs/**` ou `e2e/smoke/**` : suite de smoke tests de surface pour l'instance de production.

Decision recommandee :

- conserver `e2e/regression/**` pour l'etage profond ;
- converger progressivement vers `e2e/smoke/**` pour rendre la destination des tests de surface explicite ;
- garder les helpers partages dans `e2e/utils/**` uniquement s'ils restent compatibles avec les deux etages ;
- isoler les helpers destructifs ou relies au monde jetable dans `e2e/regression/**` quand necessaire.

---

## 5. Variables d'environnement et scripts

### Variables d'environnement

Prevoir deux configurations separees :

- `.env.e2e.regression` ;
- `.env.e2e.smoke.prod`.

Variables minimales attendues selon la suite :

- `E2E_FOUNDRY_BASE_URL` ;
- `E2E_FOUNDRY_ADMIN_PASSWORD` si necessaire pour la suite cible ;
- `E2E_FOUNDRY_USERNAME` ;
- `E2E_FOUNDRY_PASSWORD` si necessaire ;
- `E2E_FOUNDRY_WORLD` uniquement pour la suite `regression` ou pour un compte/monde de lecture controle si le `smoke prod` en a besoin.

### Scripts npm cibles

- conserver `pnpm e2e:regression` pour la suite profonde ;
- ajouter `pnpm e2e:smoke:prod` pour l'execution manuelle post-deploiement ;
- ajouter si utile `pnpm e2e:smoke:prod:headed` pour le debug visuel local ;
- ne pas brancher `e2e:smoke:prod` dans GitHub Actions.

---

## 6. Contrat de couverture - suite `regression`

La suite `regression` doit couvrir des parcours metier et techniques profonds, avec verification de persistance et d'absence de regression observable.

### Couverture initiale attendue

- bootstrap monde, login, session MJ ;
- creation et ouverture de personnage ;
- edition de champs critiques et verification apres reouverture ;
- depense simple d'XP et recalcul observable ;
- ouverture et usage des surfaces de progression critiques ;
- arbre de specialisation et interactions centrales ;
- import OggDude ;
- settings systeme critiques ;
- workflows UI centraux necessaires a la sante fonctionnelle du systeme.

### Regles de conception

- une spec par domaine fonctionnel, pas une megaspec transversale ;
- des donnees deterministes et jetables ;
- des assertions de persistance apres fermeture/reouverture quand le flux le justifie ;
- capture des `console error`, `pageerror` et erreurs reseau critiques comme causes d'echec ;
- zero verification decorative sans valeur de contrat.

### Matrice de couverture attendue

Maintenir une matrice qui relie :

- domaine fonctionnel ;
- feature ;
- champs critiques ;
- spec Playwright de regression associee ;
- statut de couverture.

Cette matrice evite de transformer l'objectif "tous les champs / toutes les features" en scenario monolithique fragile.

---

## 7. Contrat de couverture - suite `smoke prod`

La suite `smoke prod` doit rester courte, non destructive et operationnelle.

### Couverture initiale attendue

- l'instance repond et charge correctement ;
- la surface Foundry cible s'ouvre sans crash ;
- `body.system-swerpg` est present quand le systeme est charge ;
- les surfaces UI critiques sont visibles ;
- quelques ecrans racine peuvent etre ouverts sans erreur bloquante ;
- aucune erreur `console` ou `pageerror` inattendue n'apparait ;
- aucune cle i18n brute visible du type `SWERPG.*` ;
- absence de `undefined`, `null` ou placeholders casses dans les zones critiques ;
- absence de 404 sur les assets systeme critiques.

### Interdictions absolues

- aucune creation de document ;
- aucune edition de champ ;
- aucun import ;
- aucune suppression ;
- aucun test qui depend d'un monde jetable ou d'un reset de donnees.

### Mode operatoire

- execution manuelle uniquement ;
- post-deploiement ;
- depuis une machine locale adaptee GPU/performance ;
- compte de lecture seule si possible, sinon compte dedie avec discipline stricte de non-mutation.

---

## 8. Frontiere CI / local manuel

### Ce qui reste en CI GitHub

- `pnpm run build` ;
- `pnpm test` ;
- lint et format checks selon l'usage du repository ;
- eventuellement d'autres validations non GPU et non Foundry-live.

### Ce qui reste hors CI GitHub

- `smoke prod` Playwright (`pnpm run e2e:smoke`);
- `non regression` Playwright (`pnpm run e2e:regression`) ;
- toute verification post-deploiement demandant une machine locale adaptee ;
- toute execution dont la fiabilite depend du rendu navigateur GPU et des performances reelles de l'instance.

---

## 9. Plan de travail propose

### Etape 1 - Formaliser la frontiere documentaire

**But** : documenter noir sur blanc la difference entre `regression` et `smoke prod`.

**Fichiers cibles** : `documentation/tests/e2e/playwright-e2e-guide.md`, `e2e/README.md`

**Actions** :

- decrire les deux etages, leurs objectifs et leurs interdictions ;
- documenter que `smoke prod` est manuel et post-deploiement uniquement ;
- corriger les references de doc desynchronisees si besoin.

### Etape 2 - Clarifier la structure des suites

**But** : rendre la separation visible dans l'arborescence et les conventions de nommage.

**Fichiers cibles** : `e2e/regression/**`, `e2e/specs/**` ou `e2e/smoke/**`

**Actions** :

- figer la destination des specs profondes ;
- figer la destination des specs de surface ;
- identifier les helpers communs et ceux a isoler.

### Etape 3 - Stabiliser la suite `regression`

**But** : faire de `e2e/regression/**` la suite de non-regression profonde de reference.

**Fichiers cibles** : `playwright.regression.config.ts`, `e2e/regression/specs/**`, `e2e/regression/utils/**`

**Actions** :

- consolider la baseline monde dedie ;
- ajouter les specs par domaine prioritaire ;
- brancher la surveillance systematique des erreurs navigateur ;
- verifier la persistance sur les parcours qui mutent l'etat.

### Etape 4 - Creer la suite `smoke prod`

**But** : disposer d'une suite courte et non destructive pour valider la sante de la prod.

**Fichiers cibles** : config Playwright dediee si necessaire, specs sous `e2e/specs/**` ou `e2e/smoke/**`, helpers non destructifs associes.

**Actions** :

- definir les checks de surface obligatoires ;
- ajouter la capture d'erreurs navigateur et des assets critiques ;
- garantir l'absence de mutation dans les helpers et les specs.

### Etape 5 - Ajouter les scripts et env dedies

**But** : rendre l'execution explicite et sans ambiguite.

**Fichiers cibles** : `package.json`, `.env.e2e.example` ou fichiers d'exemple dedies, documentation associee.

**Actions** :

- ajouter les commandes `smoke prod` ;
- documenter les fichiers d'environnement attendus ;
- eviter toute confusion entre instance dediee et instance live.

### Etape 6 - Etablir la matrice de couverture

**But** : suivre proprement l'objectif "toutes les features / tous les champs critiques" cote regression.

**Fichiers cibles** : documentation de test dediee a definir.

**Actions** :

- lister les domaines fonctionnels ;
- lister les champs et parcours critiques par domaine ;
- relier chaque element a une spec Playwright de regression ou a un test Vitest quand Playwright n'est pas la bonne couche.

---

## 10. Ordre recommande

1. Documenter la strategie et la frontiere CI / manuel
2. Clarifier la structure des suites et des helpers
3. Stabiliser la baseline `regression`
4. Mettre en place la suite `smoke prod`
5. Ajouter scripts et fichiers d'environnement dedies
6. Construire la matrice de couverture profonde

---

## 11. Resultat attendu

Le projet dispose d'une strategie E2E claire, lisible et exploitable :

- une suite `regression` profonde, executee sur instance E2E dediee pour securiser les features et la persistance ;
- une suite `smoke prod` courte, strictement non destructive, executee manuellement post-deploiement pour verifier la sante de l'instance live ;
- une frontiere explicite entre ce qui releve de la CI GitHub et ce qui releve d'une validation locale Foundry GPU-compatible.
