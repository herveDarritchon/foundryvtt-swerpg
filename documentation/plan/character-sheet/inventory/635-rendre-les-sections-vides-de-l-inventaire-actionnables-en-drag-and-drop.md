# Character Sheet — Rendre les sections vides de l'inventaire actionnables en drag-and-drop

**Issue** : [#635 — Rendre les sections vides de l'inventaire actionnables en drag-and-drop](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/635)
**Domaine métier** : `character-sheet/inventory`

## Objectif

Rendre les états vides des sections `Equipment` et `Backpack` immédiatement identifiables comme zones de dépôt, avec une affordance visuelle et un message d'usage concis, sans modifier la logique métier existante du drag-and-drop inventory.

## Contexte utile

- `templates/sheets/actor/inventory.hbs` rend actuellement une section vide avec un simple `<li class="notes">{{section.empty}}</li>`.
- `module/applications/sheets/base-actor-sheet.mjs` prépare aujourd'hui `inventory.equipment.empty` et `inventory.backpack.empty` comme simples chaînes localisées.
- `lang/en.json` et `lang/fr.json` contiennent déjà `ACTOR.LABELS.EQUIPMENT_HINT` et `ACTOR.LABELS.BACKPACK_HINT`, mais ces messages ne couvrent pas explicitement toutes les sources mentionnées dans l'issue (`compendium`, `Items` du monde, `market`).
- `styles/actor.less` gère déjà la densité visuelle des `line-item` inventory, tandis que l'état vide reste peu actionnable et peu distinct d'une simple note.

## Plan d'implémentation

### Étape 1 — Stabiliser le contrat d'état vide des sections inventory

**Fichiers** : `module/applications/sheets/base-actor-sheet.mjs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/base-actor-sheet.test.mjs`

**What** :

- faire évoluer le view-model des sections `equipment` et `backpack` pour exposer un contrat d'état vide déclaratif (message principal, aide secondaire, éventuelle clé d'icône/variant, indicateur de section vide) au lieu d'une simple chaîne `empty` ;
- réviser les libellés i18n pour expliciter les sources de drag-and-drop attendues, en restant cohérent avec le périmètre de l'issue : `Equipment` et `Backpack` seulement, sans changer les règles métier de dépôt ;
- ajouter des tests de contrat pour verrouiller que les deux sections exposent bien des données localisées et distinctes pour leur état vide.

**Résultat attendu** : le template inventory reçoit un contrat d'état vide explicite, localisé et suffisant pour rendre une affordance de dépôt sans logique implicite côté Handlebars.

### Étape 2 — Rendre les listes vides visuellement actionnables comme dropzones

**Fichiers** : `templates/sheets/actor/inventory.hbs`, `styles/actor.less`

**What** :

- remplacer le rendu texte minimal de l'état vide par un bloc dédié de type dropzone, avec hiérarchie visuelle claire (titre, aide courte, iconographie/ornement cohérent avec la feuille) ;
- appliquer des classes et hooks sémantiques propres aux sections vides pour que `Equipment` et `Backpack` partagent la même structure tout en conservant un message contextualisé ;
- prévoir le repli automatique de l'affordance dès qu'une section contient des items, afin que la dropzone disparaisse proprement sans affecter les lignes déjà présentes.

**Résultat attendu** : une section vide d'inventaire est perçue au premier coup d'œil comme une zone de dépôt, avec un rendu homogène entre `Equipment` et `Backpack`.

### Étape 3 — Verrouiller les non-régressions de rendu et d'usage

**Fichiers** : `tests/applications/sheets/base-actor-sheet.test.mjs`, `tests/applications/sheets/character-sheet-inventory.test.mjs`

**What** :

- compléter la couverture sur le contexte inventory pour vérifier les données d'état vide des deux sections et leur disparition quand des items sont présents ;
- ajouter un test de rendu ciblé sur l'onglet `Inventory` pour valider la structure attendue de la dropzone vide et l'absence du bloc quand la section n'est plus vide ;
- documenter dans le plan de validation la vérification visuelle des trois sources citées par l'issue (`compendium`, `Items` du monde, `market`) sans introduire de changement dans le pipeline métier de drop.

**Résultat attendu** : l'affordance des états vides inventory est protégée à la fois par le contrat de données et par le rendu attendu de l'onglet.

## Périmètre / hors périmètre

### Inclus

- états vides des sections `Equipment` et `Backpack`
- affordance visuelle de dépôt et message d'usage associé
- cohérence de rendu entre sections inventory vides

### Exclus

- modification des règles métier de drag-and-drop
- refonte des lignes inventory non vides
- changement du comportement du `market`, des compendiums ou des items du monde eux-mêmes
