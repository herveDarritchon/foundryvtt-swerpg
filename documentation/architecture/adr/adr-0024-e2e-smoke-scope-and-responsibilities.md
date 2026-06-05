---
title: 'ADR-0024: Portee et responsabilite de la suite E2E smoke'
status: 'Accepted'
date: '2026-06-05'
authors: 'Herve Darritchon, Quality Team'
tags: ['architecture', 'testing', 'e2e', 'playwright', 'smoke', 'quality', 'observability']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette decision definit le role transverse de `pnpm e2e:smoke` pour l'ensemble du systeme SWERPG.

## Context

Le systeme a besoin d'un signal de sante rapide, lisible et peu intrusif apres deploiement, maintenance ou diagnostic d'une instance Foundry existante.

Ce besoin n'est pas celui de la non-regression fonctionnelle profonde :

- il doit etre rapide ;
- il doit etre sans mutation metier ;
- il doit etre executable sur une instance stable ;
- il doit repondre a la question simple : **"le systeme est-il globalement vivant et presentable ?"**

Sans frontiere explicite, une suite smoke derive facilement vers deux extremes egalement mauvais :

- une pseudo-suite de regression trop lente et trop mutante ;
- une suite trop faible pour detecter les crashs, placeholders casses, erreurs navigateur ou surfaces critiques inaccessibles.

Le systeme a donc besoin d'une decision d'architecture qui precise la responsabilite de `e2e:smoke`, ses objectifs, ses interdits et sa place par rapport a `e2e:regression`.

## Decision

### 1. Role de la suite `e2e:smoke`

La suite `e2e:smoke` est la suite E2E de **verification de surface** du systeme.

Sa responsabilite est de detecter rapidement qu'une instance Foundry ciblee :

- repond ;
- charge le systeme SWERPG ;
- permet l'acces aux surfaces critiques attendues ;
- n'expose pas d'erreur navigateur bloquante ou evidente ;
- n'affiche pas de symptomes visibles grossiers incompatibles avec un usage normal.

Elle fournit un **signal de sante**. Elle ne fournit pas une preuve de non-regression fonctionnelle profonde.

### 2. Perimetre couvert

La suite `e2e:smoke` couvre des verifications de surface transverses, generiques et peu nombreuses, comme :

- disponibilite de l'instance et chargement du monde ;
- activation effective du systeme SWERPG ;
- acces en lecture aux surfaces critiques du shell Foundry ;
- absence d'erreurs `console.error`, `pageerror` ou echec de chargement critique ;
- absence de symptomes visibles grossiers tels que placeholders casses, cles i18n brutes ou rendu evidentement incoherent sur les zones critiques.

Cette suite reste volontairement **superficielle** et **transverse**.

### 3. Regles fondamentales du smoke

La suite `e2e:smoke` respecte les principes suivants :

- **lecture seule stricte** ;
- **temps d'execution court** ;
- **diagnostic rapide** ;
- **faible risque d'effet de bord** sur l'instance cible ;
- **portee systeme**, non feature-par-feature.

Un smoke test n'a pas pour mission de prouver qu'un workflow metier complet fonctionne. Il a pour mission de prouver que l'instance n'est pas manifestement cassee.

### 4. Ce que la suite doit tester

La suite `e2e:smoke` doit verifier des invariants de sante observables sans mutation :

- l'application atteint une page exploitable ;
- le chargement systeme se termine sans symptome bloquant ;
- les principales surfaces de navigation sont accessibles ;
- le rendu visible ne contient pas d'erreurs grossieres evidentes ;
- l'environnement ne remonte pas d'erreurs techniques majeures pendant l'observation.

Ces checks doivent etre suffisamment generiques pour rester valables meme quand des parcours metier, des feuilles ou des domaines fonctionnels evoluent.

### 5. Ce que la suite ne doit pas tester

Sont hors scope par principe :

- toute mutation persistante de donnees ;
- creation, edition, suppression, import ou achat utilises comme preuve fonctionnelle ;
- verification de persistance apres action ;
- golden paths complets ;
- validation detaillee de regles metier ;
- tests de combat, progression, import, drag & drop ou chat lorsqu'ils exigent une interaction fonctionnelle profonde ;
- comparaison visuelle fine ou pixel-perfect.

Si un scenario commence a exiger une action mutante ou une verification metier detaillee, il n'appartient plus a `e2e:smoke` et doit etre traite ailleurs, en priorite dans `e2e:regression` ou dans une couche de test inferieure.

### 6. Positionnement par rapport a `e2e:regression`

Les deux suites ont des responsabilites differentes et complementaires :

- `e2e:smoke` repond : **"le systeme est-il charge, visible et globalement sain ?"**
- `e2e:regression` repond : **"les parcours critiques restent-ils executables de bout en bout ?"**

La suite smoke n'est pas une version plus legere de la regression ; c'est une suite d'un autre niveau de responsabilite.

### 7. Gouvernance de la suite smoke

Un nouveau smoke test est legitime seulement s'il :

- renforce le signal de sante transverse du systeme ;
- reste non mutatif ;
- reste rapide ;
- reduit un angle mort de surface difficile a voir autrement.

Un test ne doit pas entrer dans cette suite simplement parce qu'il est plus facile a ecrire en lecture seule. Le critere d'entree est la **valeur de diagnostic de surface**.

### 8. Nature du resultat attendu

Un echec smoke signifie qu'une instance doit etre consideree comme **suspecte** ou **degradee** au niveau systeme ou surface.

Il ne localise pas toujours precisement la cause racine, mais il doit suffire a declencher :

- une investigation rapide ;
- un controle manuel cible ;
- ou l'execution d'une suite plus profonde si necessaire.

Le smoke est donc un **outil d'alerte precoce**, pas un substitut de validation exhaustive.

## Consequences

### Positive

- **POS-001** : le projet dispose d'un signal de sante simple et rapide ;
- **POS-002** : les checks post-deploiement ou de diagnostic restent peu risquants pour les donnees ;
- **POS-003** : la frontiere entre verification de surface et regression fonctionnelle devient explicite ;
- **POS-004** : la suite reste stable dans le temps car elle depend d'invariants transverses, pas de workflows metier detailles ;
- **POS-005** : les symptomes grossiers de casse systeme sont detectes plus tot.

### Negative

- **NEG-001** : la confiance apportee par la suite reste volontairement limitee ;
- **NEG-002** : une instance peut passer le smoke tout en echouant sur un parcours metier critique ;
- **NEG-003** : certains echec smoke resteront peu diagnostiques sans suite complementaire ;
- **NEG-004** : la tentation d'ajouter des checks metiers plus profonds devra etre continuellement refusee.

## Alternatives Considered

### Utiliser uniquement la suite de regression

- **Rejection reason** : trop lent, trop mutatif et mal adapte a un controle rapide de surface ou post-deploiement.

### Limiter le smoke a un simple ping HTTP

- **Rejection reason** : insuffisant pour detecter les cassures visibles, erreurs navigateur et problemes de chargement UI reel.

### Ajouter des workflows fonctionnels complets dans le smoke

- **Rejection reason** : brouille la responsabilite de la suite, augmente les effets de bord et transforme le smoke en regression partielle mal definie.

### Remplacer le smoke par un controle manuel uniquement

- **Rejection reason** : moins reproductible, moins rapide et moins fiable pour capter des symptomes techniques repetitifs.

## References

- **REF-001** : [ADR-0017: Contrat d'interaction E2E et capture centralisee des erreurs navigateur](./adr-0017-e2e-playwright-interaction-contract-and-browser-error-capture.md)
- **REF-002** : [Strategie tests E2E](../../cadrage/tests/e2e/strategie_tests_e2e.md)
- **REF-003** : [Guide Playwright E2E](../../tests/e2e/playwright-e2e-guide.md)
- **REF-004** : [README E2E](../../../e2e/README.md)
