# Character Sheet — Permettre la suppression claire d’un bonus de création Obligation

**Issue** : [#660 — Permettre la suppression claire d’un bonus de création Obligation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/660)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Rendre la suppression d’un bonus de création d’Obligation immédiatement compréhensible et sûre depuis l’onglet `Commitments`, afin que le joueur sache clairement quelle action destructive il déclenche et quel bonus sera retiré.

## Contexte utile

- `documentation/plan/character-sheet/obligation/658-ajouter-un-selecteur-guide-pour-prendre-un-bonus-officiel-d-obligation.md` a fait du bloc bonus de création le parcours nominal pour ajouter un bonus officiel.
- `documentation/plan/character-sheet/obligation/659-prevenir-doublons-et-depassements-dans-le-selecteur-de-bonus-obligation.md` a sécurisé l’ajout, mais pas encore la lisibilité du retrait.
- `templates/sheets/actor/character-commitments.hbs` affiche aujourd’hui la suppression via une icône corbeille branchée sur `itemDelete`, avec un libellé générique partagé avec les Obligations narratives.
- `module/applications/sheets/base-actor-sheet.mjs` fournit déjà une confirmation générique ; l’enjeu de `#660` est donc surtout de qualifier explicitement l’intention métier “retirer ce bonus de création” dans la ligne, le tooltip et la confirmation.

## Plan d'implémentation

### Étape 1 — Dédier l’action de suppression au parcours bonus de création

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- remplacer, pour les lignes `creationBonusObligations`, l’usage implicite du delete générique par une action dédiée du type `creationBonusObligationDelete` portée par `CharacterSheet` ;
- exposer dans la ligne bonus une affordance plus explicite qu’une simple corbeille icon-only (libellé, tooltip, aria-label et/ou microcopy contextualisée) pour signifier qu’on retire un bonus de création, pas une Obligation narrative quelconque ;
- conserver le contrat destructif existant (suppression de l’item `obligation` extra) sans introduire de nouvelle logique métier hors UI.

**Résultat attendu** : depuis la section bonus de création, l’utilisateur identifie sans ambiguïté comment retirer un bonus et sur quel élément porte l’action.

### Étape 2 — Qualifier la confirmation et verrouiller le recalcul visible

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `module/applications/sheets/base-actor-sheet.mjs` si factorisation utile, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- faire apparaître dans la confirmation de suppression le nom du bonus ciblé et une formulation orientée bonus de création, pour éviter le doute avec la suppression d’une Obligation narrative ;
- vérifier par tests ciblés que l’action dédiée appelle bien la suppression du bon item, conserve la confirmation avant destruction et laisse le bloc `obligationCreationState` se recalculer au rendu suivant ;
- couvrir au moins le cas nominal de suppression d’un bonus existant et le cas de libellé/tooltip spécifique affiché sur la ligne bonus.

**Résultat attendu** : la suppression est explicite avant confirmation et le retour visuel attendu (bonus retiré, compteurs mis à jour) reste protégé par des tests ciblés.

## Périmètre / hors périmètre

### Inclus

- action dédiée et explicite de suppression dans la section bonus de création
- microcopy/tooltip/confirmation spécifiques au retrait d’un bonus de création
- couverture de tests ciblée sur ce parcours destructif

### Exclus

- refonte générale de tous les contrôles de suppression de la feuille personnage
- changement des règles métier de calcul des bonus d’Obligation
- suppression ou refonte du parcours d’édition expert de l’item `obligation`
