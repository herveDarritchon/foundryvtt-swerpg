# Character Sheet — Localiser complètement `ACTOR.TABS` et `ACTOR.LABELS` en français

**Issue** : [#637 — 631: Localiser complètement ACTOR.TABS et ACTOR.LABELS en français](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/637)
**Domaine métier** : `character-sheet`

## Objectif

Supprimer les libellés anglais résiduels encore visibles sur la feuille d'acteur en français, en complétant le bloc `ACTOR.TABS` et en vérifiant que les labels de section réellement utilisés reposent bien sur des traductions FR effectives.

## Contexte utile

- `module/applications/sheets/base-actor-sheet.mjs` déclare les onglets via `ACTOR.TABS.ATTRIBUTES`, `ACTIONS`, `INVENTORY`, `SKILLS`, `TALENTS`, `EFFECTS`, `BIOGRAPHY` et `COMMITMENTS`.
- `templates/sheets/actor/sidebar.hbs` consomme `ACTOR.LABELS.CURRENT_EQUIPMENT` et `ACTOR.LABELS.FAVORITE_ACTIONS`, tandis que `templates/sheets/actor/adversary-header.hbs` consomme `ACTOR.LABELS.SIZE`.
- L'audit du dépôt montre que `lang/fr.json` contient déjà une traduction FR pour `CURRENT_EQUIPMENT`, `FAVORITE_ACTIONS` et `SIZE`, mais laisse plusieurs valeurs de `ACTOR.TABS` en anglais et ne contient pas `COMMITMENTS`.

## Plan d'implémentation

### Étape 1 — Auditer puis compléter le contrat i18n FR des tabs et labels acteur

**Fichiers** : `lang/fr.json`, `lang/en.json`

**What** :

- corriger toutes les valeurs françaises encore laissées en anglais dans `ACTOR.TABS` et ajouter toute clé manquante nécessaire à la parité avec `lang/en.json`, notamment `COMMITMENTS` ;
- vérifier si les labels signalés par l'issue (`CURRENT_EQUIPMENT`, `FAVORITE_ACTIONS`, `SIZE`) nécessitent réellement une correction de dictionnaire ou seulement une validation d'usage, afin d'éviter des modifications inutiles ;
- conserver un contrat explicite et symétrique entre EN et FR pour éviter un fallback silencieux vers l'anglais.

**Résultat attendu** : le bloc `ACTOR.TABS` est complet en français et le périmètre exact des labels `ACTOR.LABELS` à corriger est clarifié sans ambiguïté.

### Étape 2 — Verrouiller l'usage réel côté feuille et la non-régression bilingue

**Fichiers** : `module/applications/sheets/base-actor-sheet.mjs`, `templates/sheets/actor/sidebar.hbs`, `templates/sheets/actor/adversary-header.hbs`, `tests/applications/sheets/base-actor-sheet.test.mjs`, `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`

**What** :

- confirmer que les onglets et labels visibles de la feuille consomment bien les clés `ACTOR.TABS.*` et `ACTOR.LABELS.*` attendues, sans chaîne codée en dur ni clé obsolète ;
- ajouter des tests ciblés EN + FR sur les onglets préparés par la sheet et sur les labels de sidebar/header afin de détecter toute régression de traduction ou tout fallback anglais ;
- couvrir explicitement le cas FR pour s'assurer qu'aucun onglet/label de ce périmètre ne reste affiché en anglais.

**Résultat attendu** : la feuille acteur rend ses tabs et labels de section du périmètre en français, et la couverture de tests protège durablement ce contrat i18n.

## Périmètre / hors périmètre

### Inclus

- `ACTOR.TABS` utilisés par la feuille acteur
- labels de section acteur réellement consommés par les templates concernés
- non-régression bilingue EN/FR sur ces libellés

### Exclus

- refonte visuelle de la feuille acteur
- localisation d'autres domaines i18n hors `ACTOR.TABS` / `ACTOR.LABELS`
- modification du comportement métier des onglets ou de la sidebar
