# EW3 — Rédiger les descriptions JSDoc manquantes

**Issue** : [#432 — EW3 — Rédiger les descriptions JSDoc manquantes](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/432)

## Objectif

Réduire le backlog de warnings `jsdoc/require-description` du chantier `ESLint Warnings Reduction` en ajoutant des descriptions JSDoc courtes, factuelles et strictement alignées sur le contrat observable, sans refactor fonctionnel ni réécriture éditoriale opportuniste.

## Décisions de cadrage

- Démarrer ce lot uniquement après EW2, afin de documenter des blocs JSDoc déjà remis au propre côté types et de limiter les reprises croisées.
- Limiter le périmètre aux occurrences remontées par `jsdoc/require-description` dans le scope déjà retenu pour la feature : `module/**/*.mjs`, `tests/**/*.mjs` et `swerpg.mjs`.
- Regrouper les corrections par modules cohérents pour garder des commits courts et des revues lisibles.
- Rédiger des descriptions minimales, concrètes et observables, centrées sur la responsabilité du symbole documenté plutôt que sur son implémentation interne.
- Exclure de ce lot les ajouts de types, les corrections de noms JSDoc, les warnings de code et tout refactor comportemental.

## Étapes d’implémentation

### 1. Borner le lot EW3 et constituer des batches relisibles

**Fichiers cibles** : fichiers remontés par `jsdoc/require-description`, regroupés par module ou zone fonctionnelle cohérente

**What**

- repartir du baseline ESLint laissé après EW2 pour isoler uniquement les warnings `jsdoc/require-description` ;
- classer les occurrences par lots de modules cohérents afin d'éviter un diff transverse illisible ;
- identifier les cas simples à documenter et laisser hors lot les blocs dont le contrat observable reste ambigu.

**Validation visée** : le périmètre EW3 est borné, ordonné et ne mélange pas les autres familles de warnings.

### 2. Ajouter des descriptions JSDoc courtes et factuelles

**Fichiers cibles** : uniquement les fichiers confirmés à l’étape 1

**What**

- compléter les descriptions manquantes sur les fonctions, méthodes, classes ou typedefs signalés ;
- formuler chaque description à partir du comportement visible du symbole documenté, avec une phrase courte et non spéculative ;
- éviter toute retouche non nécessaire du code, des signatures ou de la structure documentaire au-delà du strict besoin ESLint.

**Validation visée** : les warnings `jsdoc/require-description` disparaissent sur le lot traité sans documentation trompeuse ni changement métier.

### 3. Qualifier le résiduel et préparer la suite du chantier ESLint

**Fichiers cibles** : fichiers modifiés EW3, rapport ESLint du lot

**What**

- relever les cas résiduels qui demanderaient un arbitrage de vocabulaire, de responsabilité ou de découpage hors du lot courant ;
- vérifier que les descriptions ajoutées restent homogènes en ton, niveau de détail et granularité ;
- laisser un résiduel clairement qualifié pour les lots suivants de réduction des warnings.

**Validation visée** : EW3 ferme un lot documentaire propre, relisible et sans dérive de périmètre.

## Résultat attendu

- Le backlog `jsdoc/require-description` baisse nettement sur les modules priorisés.
- Les descriptions ajoutées sont brèves, factuelles et alignées sur le contrat observable.
- Aucun refactor fonctionnel ni warning hors périmètre EW3 n’est absorbé opportunistement dans ce chantier.
