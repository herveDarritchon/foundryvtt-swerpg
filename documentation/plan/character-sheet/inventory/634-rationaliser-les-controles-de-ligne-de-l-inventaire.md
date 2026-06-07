# Character Sheet — Rationaliser les contrôles de ligne de l'inventaire

**Issue** : [#634 — Rationaliser les contrôles de ligne de l'inventaire](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/634)
**Domaine métier** : `character-sheet/inventory`

## Objectif

Rendre les actions de chaque ligne de l'onglet `Inventory` plus cohérentes, plus visibles et plus accessibles, afin que l'état équipé / non équipé et les contrôles d'action soient compris immédiatement sans ambiguïté visuelle.

## Contexte utile

- `templates/sheets/actor/inventory.hbs` affiche aujourd'hui les contrôles de ligne via des `<a>` icon-only séparés du reste du contenu de l'objet.
- `module/applications/sheets/base-actor-sheet.mjs` prépare déjà `canEquip`, `cssClass`, `quantity`, `encumbrance`, `price`, `tags` et `restrictionBadge` pour les lignes inventory.
- `styles/actor.less` applique déjà un état `.equipped` / `.unequipped` et les règles de densité des `line-item`, mais le signal visuel d'équipement reste léger.
- Les libellés localisés génériques existent déjà pour `ACTOR.LABELS.EQUIP_ITEM`, `EDIT_ITEM` et `DELETE_ITEM`, mais pas encore un contrat explicite pour l'état accessible et la perception groupée des contrôles.

## Plan d'implémentation

### Étape 1 — Stabiliser le contrat de contrôles et d'état d'équipement

**Fichiers** : `module/applications/sheets/base-actor-sheet.mjs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- compléter le view-model inventory avec les informations d'UI nécessaires pour rendre les contrôles sans logique implicite dans le template : état équipé explicite, variante de contrôle, labels accessibles et éventuel libellé d'état de ligne ;
- introduire les clés i18n manquantes pour distinguer proprement les états / actions icon-only (équiper, déséquiper, éditer, supprimer, état équipé) si les libellés génériques actuels sont insuffisants ;
- garder un contrat homogène entre `weapon` et `armor`, sans changer le comportement métier d'équipement.

**Résultat attendu** : le template inventory reçoit un contrat déclaratif complet pour afficher un groupe de contrôles cohérent et sémantiquement accessible.

### Étape 2 — Regrouper les actions dans la ligne et renforcer le feedback visuel

**Fichiers** : `templates/sheets/actor/inventory.hbs`, `styles/actor.less`, `styles/applications.less` _(si les styles de boutons/icônes partagés doivent être ajustés)_

**What** :

- remplacer les ancres icon-only de ligne par une structure de contrôles plus sémantique (`button`, `role/group`, `aria-label`, `aria-pressed` si pertinent) directement rattachée à l'objet concerné ;
- repositionner et regrouper visuellement les actions d'équipement, d'édition et de suppression pour qu'elles soient perçues comme un seul cluster d'actions de ligne ;
- renforcer le signal visuel de l'état équipé via la ligne et/ou le bouton d'équipement, puis définir des états `hover` et `focus-visible` qui améliorent la découvrabilité sans casser la hiérarchie actuelle de la feuille.

**Résultat attendu** : chaque ligne inventory expose des contrôles cohérents, proches de l'objet, avec un état équipé/non équipé lisible au premier coup d'œil.

### Étape 3 — Verrouiller l'accessibilité et les non-régressions du flux inventory

**Fichiers** : `tests/applications/sheets/base-actor-sheet.test.mjs`, `tests/applications/sheets/character-sheet-inventory.test.mjs` _(ou test de rendu inventory ciblé si un meilleur point d'ancrage existe)_

**What** :

- ajouter des assertions sur le contrat de contexte pour vérifier l'exposition des labels / états nécessaires aux contrôles de ligne ;
- couvrir au moins un `weapon` équipé, un `armor` non équipé et un `gear` sans action d'équipement afin de verrouiller les variantes de rendu ;
- documenter la vérification visuelle attendue : groupe d'actions identifiable, état équipé évident, navigation clavier/focus visible et contrôles icon-only correctement libellés.

**Résultat attendu** : la rationalisation des contrôles de ligne est protégée à la fois sur le contrat de données et sur les exigences d'accessibilité visibles.

## Périmètre / hors périmètre

### Inclus

- contrôles de ligne de l'onglet `Inventory`
- perception visuelle de l'état équipé / non équipé
- sémantique accessible des actions icon-only et des états hover/focus

### Exclus

- refonte du bloc `CREDITS`
- redesign des états vides de sections inventory
- modification de la logique métier d'équipement ou de suppression des items
