# Character Sheet — Rendre les tags d'équipement lisibles sans troncature agressive

**Issue** : [#631 — Rendre les tags d'équipement lisibles sans troncature agressive](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/631)
**Domaine métier** : `character-sheet/inventory`
**Tags** : `HITL` — validation humaine requise sur la stratégie unique de rendu avant gel du markup/CSS

## Objectif

Rendre les tags d'équipement de l'onglet `Inventory` lisibles sans troncature destructive, y compris pour les libellés à plusieurs mots et le badge de restriction avec icône, sans ajouter de colonne métier ni sortir du design system.

## Contexte utile

- `templates/sheets/actor/inventory.hbs` rend aujourd'hui les tags d'items et le badge `restricted`.
- `module/applications/sheets/base-actor-sheet.mjs` prépare `item.tags` et `restrictionBadge` pour l'inventaire.
- `styles/applications.less`, `styles/theme.less` et `styles/actor.less` portent les règles génériques et sheet-level susceptibles d'imposer nowrap, ellipsis, hauteur max ou espacement insuffisant.
- L'issue ne demande pas de nouveau tag métier : elle impose une stratégie de présentation unique et compréhensible pour les tags déjà existants.

## Plan d'implémentation

### Étape 1 — Valider une stratégie unique de rendu des tags inventory (HITL)

**Fichiers** : `templates/sheets/actor/inventory.hbs`, `styles/applications.less`, `styles/theme.less`, `styles/actor.less`, `module/applications/sheets/base-actor-sheet.mjs` _(zones à auditer)_

**What** :

- comparer les deux leviers compatibles avec le scope : assouplir le rendu CSS (wrap, multiline, spacing) ou densifier/normaliser les libellés à la source via un scope de tags dédié à l'inventaire ;
- trancher explicitement le comportement cible pour trois cas : tag court, tag à plusieurs mots, badge de restriction avec icône ;
- retenir une seule règle de lisibilité applicable à toute la liste inventory, sans solution ad hoc par type d'item.

**Résultat attendu** : une direction de rendu validée humainement avant modification structurelle.

### Étape 2 — Appliquer la stratégie retenue au pipeline inventory

**Fichiers** : `templates/sheets/actor/inventory.hbs`, `styles/actor.less`, `styles/applications.less`, `styles/theme.less`, `module/applications/sheets/base-actor-sheet.mjs` _(et helper partagé de tags si la décision impose une normalisation côté données)_

**What** :

- ajuster le markup et les classes du template inventory uniquement si nécessaire pour supporter le rendu retenu ;
- si la décision HITL exige des libellés plus compacts, déplacer la normalisation au niveau partagé le plus central plutôt que de masquer le problème par une ellipsis supplémentaire dans le template ;
- garantir un espacement lisible entre l'icône et le texte du badge de restriction, en restant 100 % design tokens et sans ajouter de colonne métier.

**Résultat attendu** : les tags inventory restent lisibles sur la feuille avec un comportement cohérent pour tous les équipements.

### Étape 3 — Verrouiller la non-régression du contrat de tags inventory

**Fichiers** : `tests/applications/sheets/base-actor-sheet.test.mjs` _(et test plus ciblé sur le helper/tag scope si un helper partagé est introduit)_

**What** :

- ajouter des cas couvrant au moins un tag court, un tag à plusieurs mots et un tag de restriction pour vérifier que le pipeline inventory expose encore les données attendues après normalisation éventuelle ;
- si la stratégie retenue introduit un scope de tags dédié, le tester comme contrat explicite plutôt que via des assertions indirectes ;
- documenter la validation visuelle manuelle attendue sur l'onglet `Inventory` pour confirmer l'absence de troncature agressive.

**Résultat attendu** : le contrat de préparation des tags est stabilisé et la revue visuelle finale sait exactement quoi contrôler.

## Périmètre / hors périmètre

### Inclus

- lisibilité des tags existants dans l'onglet `Inventory`
- badge de restriction avec icône
- ajustements ciblés de template/CSS et normalisation des labels si validée en HITL

### Exclus

- ajout de nouvelles colonnes d'inventaire
- refonte générale de la feuille personnage
- changement métier des équipements hors affichage des tags
