---
title: 'ADR-0023: Portee et responsabilite de la suite E2E de regression'
status: 'Accepted'
date: '2026-06-05'
authors: 'Herve Darritchon, Quality Team'
tags: ['architecture', 'testing', 'e2e', 'playwright', 'regression', 'golden-path', 'bug-fix']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette decision definit le role transverse de `pnpm e2e:regression` pour l'ensemble du systeme SWERPG.

## Context

Le systeme SWERPG combine des regles metier riches, des documents Foundry, des feuilles ApplicationV2, des integrations UI, des imports, du chat, du drag & drop et des parcours temps reel fortement dependants du navigateur et de Foundry VTT.

Le projet dispose deja d'une strategie de test multi-couches :

- tests unitaires pour les regles pures et deterministes ;
- tests d'integration pour les interactions entre services, documents et transformations de donnees ;
- tests E2E Playwright pour les parcours utilisateur reels dans Foundry.

Sans frontiere explicite, une suite E2E de regression derive facilement vers un anti-pattern couteux :

- duplication de tests deja mieux couverts en unitaire ou integration ;
- multiplication de scenarios trop longs et fragiles ;
- validation combinatoire impossible a maintenir ;
- confusion entre verification de surface, non-regression fonctionnelle et diagnostic post-deploiement.

Le systeme a donc besoin d'une decision d'architecture qui precise ce que la suite `e2e:regression` doit prouver, ce qu'elle ne doit pas prouver, et selon quelles regles un nouveau scenario peut y entrer.

## Decision

### 1. Role de la suite `e2e:regression`

La suite `e2e:regression` est la suite E2E de **non-regression fonctionnelle pre-livraison** du systeme.

Sa responsabilite est de demontrer qu'un utilisateur reel peut encore executer, dans une instance Foundry dediee et mutable, des **parcours critiques de bout en bout** apres un changement.

Elle ne certifie pas l'exactitude exhaustive de toutes les regles metier. Elle certifie que le systeme reste **utilisable** sur ses integrations critiques UI + Foundry + donnees + persistance.

### 2. Perimetre couvert

La suite `e2e:regression` couvre exclusivement deux familles de scenarios :

1. **Golden paths**
2. **Bug-fix scenarios** eligibles a une couverture E2E

Un scenario **golden path** est un parcours critique, representatif, demonstrable de bout en bout, dont la reussite apporte une confiance forte sur un domaine de risque du systeme.

Un scenario **bug-fix** entre dans `e2e:regression` seulement si le defaut corrige dependait reellement d'une interaction navigateur / DOM / Foundry / rendu / persistance / chat / drag & drop qu'un test de niveau inferieur ne pouvait pas garantir de facon suffisante.

### 3. Regle d'admission d'un scenario E2E de regression

Un scenario est un bon candidat a `e2e:regression` s'il verifie au moins deux des conditions suivantes :

- il passe par une vraie interaction utilisateur ;
- il depend fortement du runtime Foundry ;
- il ne serait pas detecte de maniere fiable par un test unitaire ou d'integration ;
- il correspond a un parcours critique joueur ou MJ ;
- la regression serait bloquante ou fortement degradante en partie ;
- il traverse des couches de rendu ou d'integration comme feuille, chat, sidebar, canvas ou drag & drop.

Inversement, si le comportement peut etre garanti correctement sans navigateur reel ni UI Foundry, il ne doit pas entrer dans cette suite.

### 4. Ce que la suite doit tester

La suite `e2e:regression` doit rester structuree par **domaines de risque** et par **parcours representatifs**, jamais par exhaustivite fonctionnelle.

Elle peut couvrir, selon l'evolution du systeme, des familles transverses telles que :

- chargement global du systeme dans Foundry ;
- creation et edition d'entites via l'interface ;
- affichage et persistance d'etat visible ;
- progression utilisateur via une interface de jeu ;
- import demarre depuis l'UI puis verification de resultat visible ;
- mecaniques de drag & drop dependantes de Foundry ;
- declenchement d'actions UI produisant un rendu chat ;
- integration minimale avec les mecanismes Foundry transverses comme combat ou migration visible.

La suite doit privilegier **peu de scenarios mais fortement representatifs**.

### 5. Ce que la suite ne doit pas tester

La suite `e2e:regression` ne doit pas devenir une encyclopedie de regles.

Sont hors scope par principe :

- calculs metier purs ;
- verifications combinatoires exhaustives ;
- transformation de donnees purement deterministe ;
- validation exhaustive des prerequis ou couts internes ;
- details visuels fins ou pixel-perfect ;
- scenarios fleuves rejouant tout un cycle de jeu pour prouver un seul comportement ;
- tout bug-fix mieux teste en unitaire ou integration.

Les E2E peuvent verifier un **exemple representatif** d'une regle visible, mais jamais la totalite de ses variantes.

### 6. Contrat de construction des scenarios

Chaque scenario `e2e:regression` doit respecter les regles suivantes :

- **Preparation par fixture ou API, action par UI, verification par UI et donnees visibles** ;
- **independance stricte** : aucun scenario ne depend du resultat d'un precedent ;
- **etat de test jetable ou reinitialisable** ;
- **locators stables** et intentionnels ;
- **assertions web-first** ;
- **absence de dependance au hasard**, au timing arbitraire et aux sleeps ;
- **duree raisonnable** compatible avec un usage pre-livraison.

Un scenario qui exige de rejouer de longs prerequis UI uniquement pour atteindre l'action a tester doit etre refactore vers plus de fixtures et moins de preambule interactif.

### 7. Responsabilite de la suite vis-a-vis des bug-fix

La suite `e2e:regression` est responsable de memoriser uniquement les regressions **de nature E2E**.

En consequence :

- un bug de calcul, de mapping, de validation pure ou de transformation de donnees ne doit pas y entrer par defaut ;
- un bug de bouton, de rerender, de persistance visible, de chat, de drag & drop, de navigation Foundry, ou de contrat UI peut y entrer ;
- un bug-fix n'est pas promu en E2E pour augmenter artificiellement la couverture, mais pour proteger une integration critique reelle.

### 8. Positionnement dans la strategie de qualite

`e2e:regression` complete les tests unitaires et d'integration ; elle ne les remplace jamais.

Sa responsabilite est la **preuve de parcours critiques en environnement reel**. La responsabilite des couches inferieures reste :

- l'exactitude exhaustive des regles ;
- la couverture parametrable des combinaisons ;
- la validation des transformations deterministes ;
- la robustesse des migrations et services hors UI reelle.

### 9. Gouvernance de la suite

L'ajout d'un nouveau scenario `e2e:regression` doit etre justifie par au moins un de ces motifs :

- nouveau golden path critique du systeme ;
- domaine de risque transverse non encore sonde ;
- regression reelle dont la nature justifie un test E2E ;
- manque de confiance sur une integration Foundry impossible a prouver plus bas.

Le retrait d'un scenario est acceptable si sa valeur est devenue redondante, si une couche inferieure le couvre mieux, ou s'il ne represente plus un parcours critique reel.

## Consequences

### Positive

- **POS-001** : la suite E2E de regression reste petite, lisible et durable ;
- **POS-002** : les scenarios couverts maximisent la valeur de confiance par minute d'execution ;
- **POS-003** : la frontiere avec Vitest et les tests d'integration devient explicite ;
- **POS-004** : les bug-fix E2E sont reserves aux regressions qui le meritent vraiment ;
- **POS-005** : la suite protege les integrations Foundry les plus risquantes sans chercher l'exhaustivite impossible.

### Negative

- **NEG-001** : certains comportements visibles resteront volontairement non couverts en E2E ;
- **NEG-002** : la discipline de selection des scenarios demande une revue d'architecture continue ;
- **NEG-003** : une pression naturelle existera toujours pour ajouter trop de cas dans la suite ;
- **NEG-004** : la qualite globale depend fortement du maintien parallele de bonnes couches unitaires et integration.

## Alternatives Considered

### E2E exhaustifs par feature

- **Rejection reason** : trop lent, trop fragile, trop couteux, et mauvais niveau pour la logique deterministe.

### Une suite E2E basee sur de longs journeys complets

- **Rejection reason** : trop de couplage, faible diagnostic en echec, flakiness elevee, maintenance disproportionnee.

### Capturer tous les bug-fix en E2E par defaut

- **Rejection reason** : encourage l'usage du navigateur comme marteau universel et degrade la pyramide de tests.

### Ne garder que des tests unitaires et integration

- **Rejection reason** : laisse sans preuve les parcours critiques qui dependent du navigateur reel, du DOM et de Foundry en execution.

## References

- **REF-001** : [ADR-0004: Pattern de Test avec Vitest et Strategie de Couverture](./adr-0004-vitest-testing-strategy.md)
- **REF-002** : [ADR-0017: Contrat d'interaction E2E et capture centralisee des erreurs navigateur](./adr-0017-e2e-playwright-interaction-contract-and-browser-error-capture.md)
- **REF-003** : [Strategie tests E2E](../../cadrage/tests/e2e/strategie_tests_e2e.md)
- **REF-004** : [Guide Playwright E2E](../../tests/e2e/playwright-e2e-guide.md)
- **REF-005** : [README E2E](../../../e2e/README.md)
