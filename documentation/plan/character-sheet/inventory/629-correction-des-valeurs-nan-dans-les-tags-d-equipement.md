# Character Sheet — Corriger les valeurs `NaN` dans les tags d’équipement

**Issue** : [#629 — Correction des valeurs NaN dans les tags d'équipement](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/629)

## Objectif

Empêcher l’affichage de `NaN` dans les tags courts des équipements affichés sur la feuille personnage en garantissant qu’aucune valeur numérique invalide n’est interpolée telle quelle dans le rendu.

## Décisions de cadrage

- Le correctif vise le flux de préparation des tags d’équipement affichés sur la feuille personnage, sans refonte UI ni changement de périmètre fonctionnel.
- Toute valeur numérique absente, invalide ou non finie utilisée dans un tag doit produire un fallback lisible ou un tag omis, jamais la chaîne `NaN`.
- Si plusieurs types d’équipement partagent le même helper de tags (`item.getTags('short')` ou équivalent), le guard doit être posé au niveau partagé pour éviter les divergences entre armes, armures et gear.

## Étapes d’implémentation

### 1. Localiser la source du `NaN` et centraliser la normalisation des tags

**Fichiers cibles** : flux de préparation des équipements affichés sur la feuille personnage (notamment la préparation du featured equipment et/ou le helper partagé de tags courts appelé pour les items concernés).

**What**

- identifier quel champ numérique dérivé utilisé dans les tags (par exemple dégâts, soak, encumbrance ou équivalent) peut devenir `NaN` ;
- corriger la source la plus centrale du problème pour transformer toute valeur non finie en fallback métier avant composition du tag ;
- conserver les tags valides existants et limiter le correctif au défaut prouvé par l’issue.

**Validation visée** : un équipement avec donnée partielle ou invalide n’affiche plus `NaN` dans ses tags et les autres tags restent cohérents.

### 2. Verrouiller le rendu par des cas de non-régression ciblés

**Fichiers cibles** : tests couvrant la préparation des tags d’équipement ou le helper partagé concerné.

**What**

- ajouter un cas reproduisant l’issue avec une valeur numérique absente ou non finie ;
- couvrir au moins un cas nominal et un cas dégradé sur le helper corrigé ;
- vérifier explicitement que le rendu final contient un fallback lisible ou omet le tag invalide, mais ne contient jamais `NaN`.

**Validation visée** : le contrat de rendu des tags d’équipement interdit explicitement `NaN` pour le cas historique et ses variantes proches.

## Résultat attendu

- les tags d’équipement affichés sur la feuille ne montrent plus `NaN` ;
- la normalisation est placée au niveau partagé le plus pertinent ;
- une non-régression documente le comportement attendu sur données partielles ou invalides.
