# Character Sheet — Permettre la réduction, l'aggravation et la transformation d'une Obligation en campagne

**Issue** : [#649 — Permettre la réduction, l'aggravation et la transformation d'une Obligation en campagne](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/649)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Structurer l'évolution d'une Obligation en cours de campagne pour que le MJ et le joueur puissent la diminuer, l'aggraver ou la transformer sans détourner les champs de création ni perdre le contexte narratif.

## Contexte utile

- `module/models/obligation.mjs` ne porte aujourd'hui que `description`, `value`, `isExtra`, `extraXp` et `extraCredits` ; rien ne distingue une évolution de campagne d'un bonus de création.
- `templates/sheets/partials/obligation-config.hbs` expose surtout les champs liés à la création du personnage, pas un workflow d'évolution en campagne.
- `templates/sheets/actor/character-commitments.hbs` affiche la liste et le total d'Obligation, mais n'offre aucun résumé explicite des évolutions subies par une Obligation.
- Le cadrage `documentation/cadrage/character-sheet/obligations/cadrage-obligations-star-wars-edge-aux-confins-empire.md` fixe déjà le contrat métier attendu : réduction progressive, aggravation par nouvelles dettes ou pressions, et transformation quand le problème change de nature plutôt que de disparaître.

## Plan d'implémentation

### Étape 1 — Canoniser le contrat d'évolution de campagne dans le domaine Obligation

**Fichiers** : `module/models/obligation.mjs`, `module/lib/obligations/obligation-evolution.mjs`, `tests/models/obligation.test.mjs`, `tests/lib/obligations/obligation-evolution.test.mjs`

**What** :

- introduire dans le domaine Obligation une structure minimale dédiée aux évolutions de campagne (état courant, raison ou notes, transformation éventuelle, traçabilité compacte) séparée des bonus de création ;
- centraliser dans un helper pur les trois opérations supportées — réduction, aggravation, transformation — avec garde-fous métier (pas de valeur négative, transformation incomplète refusée, conservation du contexte utile) ;
- verrouiller par tests les cas typiques : réduction partielle, aggravation, transformation d'un type narratif vers un autre et tentative invalide.

**Résultat attendu** : le runtime possède une source unique de vérité pour faire évoluer une Obligation en campagne sans surcharger `isExtra`, `extraXp` ou `extraCredits`.

### Étape 2 — Ajouter un parcours d'édition explicite pour les évolutions de campagne

**Fichiers** : `module/applications/sheets/obligation.mjs`, `templates/sheets/partials/obligation-config.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- faire apparaître dans la fiche d'Obligation une section dédiée à la campagne, distincte des bonus de création, pour saisir une réduction, une aggravation ou une transformation ;
- guider l'utilisateur avec des libellés et aides explicites sur ce qui change réellement (valeur, nature de l'Obligation, justification narrative) ;
- localiser en EN et FR l'ensemble des nouveaux champs, états et messages associés.

**Résultat attendu** : la fiche item permet de faire évoluer une Obligation de manière explicite, compréhensible et localisée.

### Étape 3 — Rendre l'évolution visible et lisible sur la fiche personnage

**Fichiers** : `module/models/character.mjs`, `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- enrichir les données dérivées de la fiche personnage pour exposer un résumé de l'état courant d'une Obligation (valeur ajustée, transformation éventuelle, dernière évolution utile à afficher) ;
- afficher ces informations dans l'onglet `Commitments` sans obliger le MJ à ouvrir chaque item pour comprendre ce qui a changé ;
- garantir par tests que les totaux d'Obligation et les indicateurs visibles restent cohérents après réduction, aggravation et transformation.

**Résultat attendu** : le suivi campagne devient immédiatement lisible depuis la fiche personnage, avec des totaux et un contexte d'évolution cohérents.

## Périmètre / hors périmètre

### Inclus

- contrat métier d'évolution de campagne des Obligations
- parcours d'édition dédié sur la fiche item
- restitution synthétique sur la fiche personnage

### Exclus

- refonte complète du tirage d'Obligation avant session
- automatisation du stress / strain lié au déclenchement d'Obligation
- migration des Obligations individuelles vers des Obligations de groupe au-delà du minimum nécessaire pour la transformation
