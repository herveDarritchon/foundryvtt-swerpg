---
title: Ajout d'une stack de tests end-to-end Playwright séparée
domain: core
purpose: feature
feature: playwright-e2e-test-stack
version: 1.0
date_created: 2025-11-29
last_updated: 2025-11-29
owner: Core dev team
status: 'Draft'
tags: ['feature', 'testing', 'e2e', 'playwright', 'quality']
---

# Introduction

Cette spécification décrit l'ajout d'une stack de tests end-to-end (E2E) basée sur Playwright pour le système Swerpg /
Star Wars Edge sur Foundry VTT v13+. L'objectif est de valider les parcours critiques des MJ et des joueurs dans l'
interface réelle de Foundry, avec un outillage séparé des tests unitaires (Vitest), un cycle de vie dédié et des bonnes
pratiques Playwright.

## 1. Contexte métier (MJ / joueurs)

Actuellement, la qualité du système repose principalement sur des tests unitaires et des tests manuels. Les parcours
réels dans Foundry (chargement de la table, ouverture de feuilles, navigation dans les menus du système, déclenchement
d'actions clés) ne sont pas couverts de manière systématique.

Pour les MJ et les joueurs, cela se traduit par un risque de régressions sur des scénarios critiques : démarrage d'une
partie, ouverture de feuilles d'acteurs ou d'objets, utilisation d'actions de jeu, accès aux journaux, etc. Une
régression visible uniquement dans l'UI de Foundry peut passer sous les radars des tests unitaires.

### 1.1 Comportement actuel

- Les tests automatisés existants sont principalement des tests unitaires (Vitest) exécutés via `pnpm test`.
- Il n'existe pas de suite de tests E2E automatisés qui interagissent avec une instance de Foundry VTT exécutant le
  système Swerpg.
- Les validations de bout-en-bout (démarrage d'un monde, affichage des feuilles, actions de base) sont effectuées
  manuellement par les développeurs ou les MJ lors des sessions de test.

### 1.2 Comportement cible

- Disposer d'une stack Playwright dédiée permettant d'exécuter des tests E2E qui ouvrent un navigateur, se connectent à
  une instance Foundry, chargent un monde de test avec le système Swerpg actif et vérifient des parcours clés.
- Cette stack doit être **totalement décorrelée des tests unitaires** : configuration, répertoires, scripts `pnpm`,
  outillage et éventuelles dépendances.
- Les développeurs doivent pouvoir lancer facilement :
  - tous les tests e2e,
  - un seul fichier de test,
  - un test précis en mode headed pour le débogage.
- Les tests doivent suivre les bonnes pratiques Playwright (locators par rôle/label/texte, assertions web-first, pas de
  `wait` fixes).

## 2. Objectifs et périmètre

### 2.1 Objectifs principaux

- O-001 : Introduire une stack de tests E2E Playwright dédiée pour Swerpg, clairement séparée des tests unitaires
  Vitest.
- O-002 : Permettre la validation automatique des parcours critiques MJ/joueurs dans Foundry (chargement du système,
  navigation de base, ouverture de feuilles, etc.).
- O-003 : Fournir une structure et des exemples de tests conformes aux bonnes pratiques Playwright pour faciliter
  l'écriture de nouveaux scénarios.
- O-004 : Intégrer cette stack dans le cycle de développement (exécution locale, intégration continue) sans perturber le
  pipeline existant des tests unitaires.

### 2.2 Objectifs secondaires (facultatif)

- OS-001 : Proposer une configuration permettant d'exécuter les tests E2E en parallèle sur plusieurs navigateurs (
  Chromium, Firefox, WebKit) à terme.
- OS-002 : Documenter un guide rapide pour que les contributeurs sachent comment ajouter et maintenir des tests E2E
  Playwright.

### 2.3 Périmètre (In scope / Out of scope)

- **In scope** :
  - Structure de répertoires pour les tests E2E (par exemple `e2e/` ou `tests-e2e/`).
  - Fichier(s) de configuration Playwright (`playwright.config.ts` ou équivalent) adapté au projet.
  - Scripts `pnpm` dédiés (par ex. `pnpm test:e2e`, `pnpm test:e2e:headed`).
  - Mise en place d'au moins un monde / scénario de test Foundry de base (ou configuration permettant de se connecter
    à un monde de test existant).
  - Création de quelques specs E2E exemples qui :
    - se connectent à l'instance Foundry,
    - chargent un monde de test,
    - vérifient l'affichage de l'écran principal et d'un élément clé du système Swerpg.
- **Out of scope** :
  - Couverture exhaustive de toutes les fonctionnalités de Swerpg par des tests E2E.
  - Refonte ou migration complète des tests unitaires existants.
  - Mise en place d'une infrastructure d'exécution distribuée des tests E2E (ex. grid de navigateurs, farm de
    runners).

## 3. Acteurs et cas d’usage

### 3.1 Acteurs

- **Développeur / Tech lead** : configure et maintient la stack Playwright, écrit des tests E2E avancés, intègre la
  suite e2e au pipeline CI.
- **Contributeur occasionnel** : ajoute ou adapte des scénarios E2E ciblés lors de la création de nouvelles features.
- **MJ / Joueurs (indirectement)** : bénéficient de la réduction des régressions sur les parcours critiques grâce à ces
  tests automatisés.

### 3.2 Cas d’usage principaux

- US-001 : En tant que développeur, je veux lancer `pnpm test:e2e` pour exécuter la suite de tests end-to-end Playwright
  sans lancer les tests unitaires, afin de vérifier rapidement la santé des parcours critiques.
- US-002 : En tant que développeur, je veux pouvoir exécuter un seul fichier de test E2E Playwright pour déboguer un
  scénario particulier sans exécuter la suite complète.
- US-003 : En tant que développeur, je veux disposer d'exemples clairs de tests E2E Playwright pour le système Swerpg (
  locators par rôle, assertions web-first, gestion de l'auth éventuelle) afin de pouvoir en écrire de nouveaux
  rapidement.
- US-004 : En tant que mainteneur, je veux intégrer la commande de tests E2E Playwright dans la CI, tout en gardant la
  possibilité d'exécuter uniquement les tests unitaires si nécessaire.

### 3.3 Flots d’interaction (MJ / joueurs)

Les MJ et joueurs ne déclenchent pas directement cette stack de tests. Les tests E2E reproduisent toutefois leurs
interactions typiques :

1. Lancer Foundry VTT avec le système Swerpg installé et un monde de test configuré.
2. Ouvrir une session navigateur (via Playwright) et accéder à l'URL de l'instance Foundry.
3. Se connecter si nécessaire (auth locale ou token de test).
4. Charger le monde de test et vérifier l'écran d'accueil / scène principale.
5. Ouvrir une feuille de personnage ou d'objet, vérifier quelques éléments clés de l'interface.
6. Fermer la session et rapporter les résultats de test.

## 4. Exigences fonctionnelles

- **F-001** : La stack de tests E2E doit être physiquement séparée des tests unitaires (répertoires, fichiers de
  configuration, scripts `pnpm`).
- **F-002** : La commande `pnpm test:e2e` doit exécuter exclusivement les tests Playwright, sans lancer les tests
  unitaires Vitest.
- **F-003** : Il doit être possible d'exécuter un fichier de spec E2E Playwright individuel via la ligne de commande (
  par exemple `pnpm test:e2e path/to/spec`).
- **F-004** : Les specs E2E doivent utiliser principalement des locators Playwright basés sur les rôles, labels et
  textes (`getByRole`, `getByLabel`, `getByText`, etc.).
- **F-005** : Les assertions doivent utiliser l'API `expect` de Playwright avec des assertions web-first (`toHaveTitle`,
  `toHaveURL`, `toHaveText`, `toHaveCount`, etc.), sans multiplier les vérifications de visibilité génériques.
- **F-006** : La configuration Playwright doit être compatible avec une exécution locale (dev) et une exécution CI (URL
  de Foundry configurable, timeouts raisonnables, headless par défaut).
- **F-007** : La stack doit inclure au minimum un test E2E démontrant :
  - connexion à l'instance Foundry,
  - chargement d'un monde de test,
  - vérification d'un élément clé de l'UI spécifique à Swerpg (par exemple, présence du logo système ou d'un élément
    de navigation propre au système).

### 4.1 Gestion des erreurs / validations

- **E-001** : Si l'instance Foundry n'est pas joignable (URL invalide, port fermé), les tests E2E doivent échouer
  rapidement avec un message d'erreur explicite (ex. "Foundry instance unreachable"), plutôt que de rester bloqués ou de
  dépasser un timeout très long.
- **E-002** : Si les identifiants / token de test sont invalides, les tests doivent échouer avec une indication claire
  dans les logs (ex. échec de connexion), afin de distinguer ce cas d'une erreur de rendu.
- **E-003** : Si un élément clé attendu de l'UI Swerpg n'est pas trouvé (ex. le logo ou un bouton important),
  l'assertion doit produire un message explicite permettant d'identifier la page et l'élément concerné.

## 5. Contraintes non fonctionnelles

### 5.1 Performance et charge

- Les tests E2E ne doivent pas être systématiquement exécutés sur chaque sauvegarde locale ; ils peuvent être réservés
  aux runs explicites ou à certains jobs CI.
- Le temps d'exécution de la suite E2E de base (exemples fournis) doit rester raisonnable (objectif indicatif : moins de
  quelques minutes sur une machine de dev standard ou un runner CI typique).
- La configuration doit permettre d'ajuster facilement le parallélisme Playwright pour adapter la durée d'exécution à la
  CI.

### 5.2 Compatibilité et migration

- La stack Playwright doit être compatible avec Foundry VTT v13+ et la version Node/PNPM utilisée par le projet.
- L'ajout de Playwright ne doit pas casser les scripts existants (`pnpm test`, `pnpm build`, etc.).
- Les dépendances Playwright doivent être gérées proprement (ajout dans `package.json` avec versions stables, pas de
  duplication inutile de dépendances déjà présentes).

### 5.3 UX / UI

- Les tests E2E doivent favoriser des locators accessibles (rôles ARIA, labels, texte visible) afin de rester robustes
  aux changements mineurs d'UI et de promouvoir une meilleure accessibilité dans le système.
- Les scénarios doivent cibler des parcours réalistes côté MJ/joueurs (ouverture de feuilles, navigation, etc.) plutôt
  que des détails purement techniques.

## 6. Contexte technique et dépendances

### 6.1 Domaines et modules concernés

- Domaine principal : `core` (outillage de test et qualité globale du système).
- Modules et répertoires impactés :
  - `package.json` (scripts `pnpm` et dépendances Playwright),
  - éventuellement `tests/` si une convention de structure est réutilisée, ou un nouveau répertoire `e2e/` /
    `tests-e2e/`.
- Intégration avec la configuration Foundry utilisée localement ou en CI (URL, monde de test, utilisateur de test).

### 6.2 APIs et concepts Foundry probables

- Utilisation de l'interface web de Foundry VTT v13 (connexion, sélection de monde, lancement d'une partie).
- Interaction avec les feuilles d'acteurs / objets spécifiques au système Swerpg (templates Handlebars, ApplicationV2).
- Potentielle utilisation de hooks Foundry uniquement côté observation (aucune modification spécifique dans le code de
  prod ne doit être requise pour les tests E2E, en dehors d'éventuels flags de dev documentés).

### 6.3 Données et compendiums

- Un monde de test dédié pourra utiliser un sous-ensemble de données issues des compendiums (`packs/`) ou du dossier
  `_source/`.
- Aucun changement de schéma de données n'est requis pour la mise en place de la stack E2E.
- Il peut être utile de prévoir un monde de test minimal préconfiguré (PJ, scène, quelques objets) pour les scénarios
  E2E.

## 7. Cas limites / Edge cases

- **Edge-001** : Exécution des tests E2E sur un environnement de développement où Foundry n'est pas lancé ou pas
  installé → les tests doivent échouer proprement avec un message clair et non masquer cette situation.
- **Edge-002** : Environnement CI sans interface graphique classique (headless) → les tests doivent pouvoir s'exécuter
  en mode headless, avec gestion des dépendances (polices, librairies système) documentée.
- **Edge-003** : Changement d'URL / port de l'instance Foundry entre environnements (dev, CI, préprod) → la
  configuration des tests E2E doit permettre de surcharger facilement l'URL via variable d'environnement ou paramètre.
- **Edge-004** : Temps de démarrage plus long de l'instance Foundry sur certaines machines → la configuration Playwright
  doit offrir des timeouts raisonnables et/ou des attentes adaptées (en restant web-first, sans `sleep` arbitraires).

## 8. Critères d’acceptation

- **AC-001** : Sur un environnement où Foundry v13+ est accessible, l'exécution de `pnpm test:e2e` lance Playwright,
  exécute au moins un scénario E2E de base et retourne un code de sortie 0 en l'absence d'échecs.
- **AC-002** : La commande `pnpm test` continue de lancer uniquement les tests unitaires Vitest, sans exécuter les tests
  E2E Playwright.
- **AC-003** : Un fichier de test E2E d'exemple démontre l'utilisation de
  `import { test, expect } from '@playwright/test'`, d'un locator par rôle (`getByRole`) et d'une assertion web-first (
  `await expect(page).toHaveURL(...)`).
- **AC-004** : Il est possible de cibler un seul fichier de test E2E via la ligne de commande (par exemple en passant un
  chemin ou un filtre) et l'exécution ne lance que ce scénario.
- **AC-005** : En cas d'instance Foundry injoignable, le run `pnpm test:e2e` échoue rapidement avec un message explicite
  permettant de diagnostiquer le problème (edge case `Edge-001`).
- **AC-006 (edge)** : Les tests E2E peuvent être exécutés avec succès en mode headless sur un runner CI standard sans
  intervention manuelle.

## 9. Questions ouvertes et hypothèses

### 9.1 Hypothèses

- **ASS-001** : Les développeurs disposent d'une instance Foundry VTT v13+ accessible localement ou dans un
  environnement de test explicitement configuré pour les E2E.
  - oui, ce sera le cas.
- **ASS-002** : Il est acceptable d'ajouter Playwright comme dépendance de développement dans `package.json`.
  - oui, c'est le cas.
- **ASS-003** : Un monde de test minimal peut être créé (ou réutilisé) sans impacter les mondes de production des MJ.
  - oui, c'est le cas.
- **ASS-004** : La CI peut être configurée pour démarrer (ou accéder à) une instance Foundry avant l'exécution des tests
  E2E.
  - oui, il faudra le faire mais ce n'est pas dans le scope de cette demande.

### 9.2 Questions ouvertes

- **Q-001** : Quel nom et quelle convention de dossier retenir pour les tests E2E (`e2e/`, `tests-e2e/`, sous-dossier de
  `tests/`...) ?
  - e2e, me semble le plus logique.
- **Q-002** : Faut-il prévoir un script d'aide pour démarrer automatiquement une instance Foundry dédiée aux tests avant
  d'exécuter Playwright, ou s'appuyer sur une instance déjà en cours d'exécution ?
  - s'appuyer sur une instance disponible par contre il faudra créer une librairie de méthode pour pouvoir se
    connecter au monde de test avant de lancer les tests e2e fonctionnels. Une instance de foundryvtt sera disponible
    mais il faudra revenir à revenir à l'écran de setup puis se connecter au monde.
- **Q-003** : Quels sont les premiers parcours fonctionnels à couvrir en priorité (ouverture de feuille de héros, import
  OggDude, actions de combat, etc.) ?
  - en premier il faudra couvrir les imports OggDude
- **Q-004** : La suite E2E doit-elle être exécutée sur plusieurs navigateurs (Chromium, Firefox, WebKit) ou seulement
  sur Chromium dans un premier temps ?
  - oui, minimum Chromium et Firefox dans un premier temps.
- **Q-005** : Faut-il intégrer des données de test spécifiques (PJ préconfigurés, équipements, talents) dans un monde
  dédié aux E2E, et si oui, comment les maintenir ?
  - Pour l'instant non, on va partir d'un monde de test vierge.
