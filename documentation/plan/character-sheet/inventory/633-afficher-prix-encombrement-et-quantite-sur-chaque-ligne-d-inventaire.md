# Character Sheet — Afficher prix, encombrement et quantité sur chaque ligne d'inventaire

**Issue** : [#633 — Afficher prix, encombrement et quantité sur chaque ligne d'inventaire](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/633)
**Domaine métier** : `character-sheet/inventory`

## Objectif

Rendre chaque ligne de l'onglet `Inventory` plus informative en affichant systématiquement la quantité, l'encombrement et le prix de l'objet, sans changer la logique métier des items ni surcharger visuellement la feuille personnage.

## Contexte utile

- `module/applications/sheets/base-actor-sheet.mjs` prépare déjà le view-model des lignes d'inventaire (`quantity`, `showStack`, `tags`, `restrictionBadge`) pour `weapon`, `armor` et `gear`.
- `templates/sheets/actor/inventory.hbs` affiche aujourd'hui la quantité seulement sous forme de préfixe `({{item.quantity}})` quand `showStack` est vrai.
- Les libellés localisés existent déjà pour `price`, `encumbrance` et `quantity` dans `lang/en.json` / `lang/fr.json` sous `ITEM.FIELDS.*.label`.
- `styles/actor.less` porte déjà les règles de densité et de hiérarchie visuelle des lignes inventory.

## Plan d'implémentation

### Étape 1 — Stabiliser le contrat d'affichage des métriques inventory

**Fichiers** : `module/applications/sheets/base-actor-sheet.mjs`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- compléter le view-model inventory pour exposer, de façon homogène sur chaque ligne éligible, les trois valeurs à afficher : `quantity`, `encumbrance`, `price` ;
- décider la règle d'affichage des valeurs manquantes ou neutres (ex. quantité `1`, prix absent/invalide, encombrement vide) afin que le template reste déclaratif ;
- éviter le doublon entre l'ancien préfixe de stack et le futur bloc d'informations de ligne.

**Résultat attendu** : le template inventory consomme un contrat unique et explicite pour les métriques de ligne, sans recalcul métier côté Handlebars.

### Étape 2 — Ajouter une zone compacte prix / encombrement / quantité dans chaque ligne

**Fichiers** : `templates/sheets/actor/inventory.hbs`, `styles/actor.less`

**What** :

- introduire dans chaque `line-item` une zone secondaire compacte affichant quantité, encombrement et prix avec des libellés ou abréviations cohérents et localisables ;
- retirer ou réintégrer proprement le préfixe de quantité actuel pour n'avoir qu'une seule source d'affichage de la quantité ;
- préserver la lisibilité des tags, du nom et des contrôles existants, en restant compatible avec les design tokens et la densité visuelle de l'inventaire.

**Résultat attendu** : chaque ligne inventory expose immédiatement ses informations pratiques sans casser la hiérarchie visuelle actuelle.

### Étape 3 — Verrouiller la non-régression du pipeline inventory

**Fichiers** : `tests/applications/sheets/base-actor-sheet.test.mjs`, `tests/applications/sheets/character-sheet-inventory.test.mjs` _(si un test de rendu/contexte ciblé est déjà le meilleur point d'ancrage)_

**What** :

- ajouter des cas couvrant au moins un `gear`, un `weapon` et un `armor` pour vérifier la présence des valeurs attendues dans le contexte inventory ;
- couvrir le cas quantité `1` vs pile `> 1` pour éviter toute régression de doublon ou d'omission d'affichage ;
- documenter la vérification visuelle attendue sur une ligne dense avec tags et contrôles pour s'assurer que les nouvelles métriques restent lisibles.

**Résultat attendu** : l'affichage enrichi des lignes inventory est protégé par une couverture ciblée sur le contrat de données et les cas de présentation sensibles.
