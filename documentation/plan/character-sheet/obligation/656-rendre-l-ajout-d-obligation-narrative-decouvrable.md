# Character Sheet — Rendre l’ajout d’Obligation narrative découvrable

**Issue** : [#656 — Rendre l’ajout d’Obligation narrative découvrable](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/656)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Permettre au joueur ou au MJ d’identifier immédiatement, depuis l’onglet `Commitments`, comment ajouter une Obligation narrative sans devoir passer par un flux générique de création d’item orienté inventaire.

## Contexte utile

- `templates/sheets/actor/character-commitments.hbs` affiche aujourd’hui la liste des Obligations, leurs actions d’édition/suppression et les résumés associés, mais aucun point d’entrée explicite pour en créer une nouvelle.
- `module/applications/sheets/base-actor-sheet.mjs` branche l’action générique `itemCreate` sur un `createDialog` préconfiguré avec `type: 'weapon'`, ce qui n’aide pas l’utilisateur à créer une Obligation depuis la fiche personnage.
- `module/applications/sheets/character-sheet.mjs` prépare déjà tout le contexte du bloc Obligations et constitue le bon point d’entrée pour porter une action dédiée à ce parcours.
- `module/models/obligation.mjs` et `templates/sheets/partials/obligation-config.hbs` distinguent déjà les bonus de création (`isExtra`) et les champs narratifs/campagne ; le déficit principal est donc la découvrabilité du flux d’ajout, pas l’absence de modèle.

## Plan d'implémentation

### Étape 1 — Ajouter un point d’entrée explicite de création dans le bloc Obligations

**Fichiers** : `templates/sheets/actor/character-commitments.hbs`, `module/applications/sheets/character-sheet.mjs`, `module/applications/sheets/base-actor-sheet.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- ajouter un CTA visible dans l’en-tête ou l’état vide du bloc Obligations, formulé comme ajout d’Obligation narrative plutôt que création d’item générique ;
- brancher ce CTA sur une action dédiée qui vise directement le type `obligation`, au lieu de réutiliser silencieusement le flux `itemCreate` par défaut centré sur `weapon` ;
- garantir que ce parcours ouvre immédiatement la bonne fiche d’item pour éviter toute étape implicite de sélection de type.

**Résultat attendu** : depuis l’onglet `Commitments`, l’utilisateur comprend immédiatement comment créer une Obligation narrative et arrive directement sur le bon formulaire.

### Étape 2 — Clarifier le parcours de création pour distinguer Obligation narrative et bonus de création

**Fichiers** : `templates/sheets/partials/obligation-config.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- expliciter dans la fiche d’Obligation qu’une nouvelle entrée créée via ce parcours correspond d’abord à une Obligation narrative standard ;
- conserver `isExtra` comme option secondaire clairement séparée des bonus de création, avec une aide qui explique quand l’utiliser ;
- ajouter les clés i18n EN/FR nécessaires pour le CTA, l’éventuel état vide et les aides contextuelles du formulaire.

**Résultat attendu** : le flux de création ne laisse plus penser qu’une Obligation doit d’abord être manipulée comme un bonus XP/crédits ou comme un item générique.

### Étape 3 — Verrouiller la découvrabilité et le routage du flux par des tests ciblés

**Fichiers** : `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- couvrir la présence du CTA ou de l’état vide et le déclenchement de l’action dédiée ;
- vérifier que l’action de création cible bien `obligation` et ne retombe pas sur le défaut `weapon` ;
- valider que le premier rendu de la fiche d’Obligation reste compréhensible pour une Obligation narrative standard.

**Résultat attendu** : une régression de découvrabilité ou un retour au flux générique inadapté est détecté automatiquement.

## Périmètre / hors périmètre

### Inclus

- CTA explicite d’ajout d’Obligation dans l’onglet `Commitments`
- routage du flux de création vers le type `obligation`
- microcopy et i18n pour distinguer Obligation narrative et bonus de création

### Exclus

- refonte métier complète du domaine Obligation
- nouvelles règles de calcul des bonus XP/crédits
- automatisation de l’évolution de campagne au-delà du flux d’ajout
