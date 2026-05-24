# Strategie E2E - contrat des commandes `e2e`, `e2e:smoke` et `e2e:regression`

**Contexte** : le projet doit clarifier le role exact des commandes Playwright et la frontiere entre verification basique de fonctionnement, validation fonctionnelle pre-livraison et commande agregee.

**Decision structurante** :

- `pnpm run e2e` lance les deux familles de tests E2E ;
- `pnpm run e2e:smoke` lance des tests de surface, executes a la main, pour des verifications basiques de fonctionnement ;
- `pnpm run e2e:regression` lance des tests fonctionnels de validation applicative et feature avant livraison ;
- ces suites ont vocation a remplacer les validations manuelles QA sur ce perimetre, avec un contrat clair et reproductible.

---

## 1. Objectif

Formaliser une strategie E2E lisible et actionnable dans laquelle :

- `e2e:smoke` couvre une verification courte de sante et de surface ;
- `e2e:regression` couvre la validation fonctionnelle profonde de l'application ;
- `e2e` joue le role de commande omnibus en executant les deux suites dans un ordre explicite ;
- la documentation, les scripts npm et les conventions d'environnement racontent tous la meme chose.

---

## 2. Perimetre

### Inclus

- clarification du role de chaque commande E2E ;
- definition d'une taxonomie unique `smoke` / `regression` / `e2e` ;
- alignement de la documentation, des scripts npm et des exemples d'environnement ;
- formalisation de la frontiere entre verification manuelle de surface et validation fonctionnelle pre-livraison ;
- repositionnement des suites E2E comme remplacant les validations QA manuelles sur ce perimetre.

### Exclu

- ajout immediat de toutes les nouvelles specs fonctionnelles ou smoke ;
- refonte complete des helpers Playwright non necessaire au contrat des commandes ;
- automatisation GitHub Actions des smoke tests manuels ;
- modifications du runtime applicatif hors besoin direct de test/documentation.

---

## 3. Contrat cible des commandes

### `pnpm run e2e`

**Role** : commande agregee qui execute les deux familles de tests E2E.

**But** : fournir un point d'entree unique pour lancer la couverture E2E complete quand tous les prerequis sont disponibles.

**Contraintes** :

- l'ordre d'execution doit etre explicite et documente ;
- la commande ne doit pas laisser penser qu'il s'agit d'une simple baseline locale minimaliste ;
- les prerequis des deux environnements doivent etre visibles avant execution.

### `pnpm run e2e:smoke`

**Role** : suite de tests de surface.

**But** : verifier a la main qu'une instance Foundry fonctionne globalement, sans controle fonctionnel profond.

**Caracteristiques** :

- execution manuelle ;
- verification basique de fonctionnement ;
- focus sur sante de l'instance, UI critique, i18n, ouverture de surfaces, erreurs bloquantes navigateur ;
- suite courte et rapidement diagnostique.

### `pnpm run e2e:regression`

**Role** : suite de tests fonctionnels pre-livraison.

**But** : valider le fonctionnement de l'application et de ses features avant livraison.

**Caracteristiques** :

- workflows metier et applicatifs reels ;
- verifications de persistance quand necessaire ;
- couverture par domaine fonctionnel ;
- base de confiance pour remplacer les validations QA manuelles repetitives.

---

## 4. Positionnement des suites

### Suite `smoke`

**Nature** : verification de surface.

**Exemples de checks attendus** :

- l'instance repond ;
- l'application charge sans crash ;
- les surfaces critiques s'ouvrent ;
- l'i18n visible est correcte ;
- aucune erreur `console` ou `pageerror` inattendue n'apparait ;
- pas de placeholder casse du type `undefined`, `null` ou cle brute `SWERPG.*` dans les zones critiques.

**Regle de profondeur** : pas de validation fonctionnelle poussee, pas de scenario metier long.

### Suite `regression`

**Nature** : validation fonctionnelle.

**Exemples de checks attendus** :

- creation et ouverture des documents cibles ;
- edition des champs critiques ;
- verification de la persistance ;
- validation des features majeures de l'application ;
- parcours metier transverses necessaires avant livraison.

**Regle de profondeur** : cette suite porte la vraie confiance applicative avant release.

### Commande `e2e`

**Nature** : orchestration.

**Regle** : `e2e` ne definit pas une troisieme categorie de tests ; elle orchestre `smoke` et `regression`.

---

## 5. Arborescence cible

- `e2e/smoke/**` : tests de surface ;
- `e2e/regression/**` : tests fonctionnels pre-livraison ;
- `e2e/utils/**` : helpers partages uniquement s'ils restent compatibles avec les deux suites ;
- `e2e/specs/**` : a requalifier progressivement pour eviter toute ambiguite de destination.

Decision recommandee :

- converger vers une separation pleinement explicite entre `e2e/smoke/**` et `e2e/regression/**` ;
- limiter `e2e/specs/**` aux cas legacy le temps de la migration documentaire et structurelle ;
- documenter pour chaque spec si elle releve de la surface ou de la regression fonctionnelle.

---

## 6. Scripts et environnements

### Scripts npm cibles

- `e2e` : enchaine `e2e:regression` puis `e2e:smoke`, ou l'ordre inverse si la decision d'execution le justifie ;
- `e2e:smoke` : lance la suite de surface ;
- `e2e:smoke:headed` : debug visuel de la suite de surface ;
- `e2e:regression` : lance la suite fonctionnelle ;
- `e2e:regression:headed` et `e2e:regression:ui` : debug de la suite fonctionnelle.

### Variables d'environnement

- `.env.e2e.regression` : environnement dedie a la suite fonctionnelle ;
- `.env.e2e.smoke.prod` : environnement dedie a la suite smoke ;
- si `e2e` orchestre les deux suites, son contrat doit expliquer explicitement comment chaque sous-suite charge son propre environnement.

### Point d'attention

Si `e2e` execute aussi `smoke`, la commande agregee ne doit pas etre presentee comme la commande de dev ordinaire tant que l'environnement smoke n'est pas pret.

---

## 7. Frontiere d'usage

### `smoke`

- execution manuelle ;
- verification basique de fonctionnement ;
- usage ponctuel, diagnostic, post-deploiement ou controle rapide ;
- non destine a remplacer la validation fonctionnelle complete.

### `regression`

- execution avant livraison ;
- usage de validation applicative ;
- remplace les campagnes QA manuelles repetitives sur le perimetre couvert.

### `e2e`

- execution volontaire quand les deux suites et leurs prerequis sont disponibles ;
- usage comme campagne complete, pas comme simple test rapide local.

---

## 8. Plan de travail propose

### Etape 1 - Refixer la taxonomie projet

**But** : eliminer les termes ambigus et imposer un seul vocabulaire.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, documentation annexe E2E

**Actions** :

- remplacer les formulations floues par `smoke`, `regression` et `e2e` agrege ;
- expliquer clairement le role de chaque commande ;
- supprimer les formulations qui suggerent que `e2e` est une baseline locale unique.

### Etape 2 - Realigner les scripts npm

**But** : faire correspondre la promesse documentaire et le comportement reel des commandes.

**Fichiers cibles** : `package.json`, configurations Playwright associees.

**Actions** :

- verifier que `e2e` orchestre bien les deux suites ;
- verifier que `e2e:smoke` et `e2e:regression` pointent chacune sur la bonne configuration ;
- documenter explicitement l'ordre d'execution retenu pour `e2e`.

### Etape 3 - Clarifier les environnements et prerequis

**But** : eviter les erreurs d'usage entre campagne complete, smoke manuel et regression pre-livraison.

**Fichiers cibles** : `.env.e2e.regression.example`, `.env.e2e.smoke.prod.example`, documentation associee.

**Actions** :

- rendre explicite quel fichier sert a quelle suite ;
- documenter les prerequis de chaque commande ;
- expliquer ce que `e2e` suppose pour pouvoir lancer les deux suites sans ambiguite.

### Etape 4 - Requalifier la structure des specs

**But** : aligner l'arborescence avec la semantique des suites.

**Fichiers cibles** : `e2e/specs/**`, `e2e/smoke/**`, `e2e/regression/**`

**Actions** :

- identifier les specs legacy a reclasser ;
- rattacher chaque spec a `smoke` ou `regression` ;
- eviter toute zone grise sur la destination d'un test.

### Etape 5 - Documenter le remplacement des validations QA manuelles

**But** : expliciter la valeur attendue des suites E2E dans le cycle de livraison.

**Fichiers cibles** : documentation E2E, documentation process si pertinente.

**Actions** :

- decrire que `regression` remplace les controles QA repetitifs sur le perimetre couvert ;
- decrire que `smoke` remplace les checks manuels basiques de surface ;
- conserver une formulation factuelle centree sur le perimetre reellement automatise.

---

## 9. Ordre recommande

1. Refixer la taxonomie projet
2. Realigner les scripts npm
3. Clarifier les environnements et prerequis
4. Requalifier la structure des specs
5. Documenter le remplacement des validations QA manuelles

---

## 10. Resultat attendu

Le projet dispose d'un contrat E2E explicite et partage :

- `pnpm run e2e:smoke` signifie partout la meme chose : tests de surface, manuels, basiques ;
- `pnpm run e2e:regression` signifie partout la meme chose : validation fonctionnelle de l'application et de ses features avant livraison ;
- `pnpm run e2e` signifie partout la meme chose : campagne E2E complete orchestrant les deux suites ;
- la documentation, les scripts et l'arborescence ne laissent plus de place a l'ambiguite ;
- l'automatisation E2E remplace progressivement les validations QA manuelles sur le perimetre effectivement couvert.
