# Issues Checklist — Specialization Tree V1 / Graphical UX Refresh

## Préparation

- [ ] Relire `documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md`
- [ ] Confirmer le rattachement à l'epic `Specialization Tree V1`
- [ ] Vérifier les prérequis US16 et US17
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `specialization-tree`, `ux`

## Création Epic / Feature

- [ ] Réutiliser l'epic `Specialization Tree V1`
- [ ] Créer la feature `Graphical UX Refresh - Rendre l'arbre de spécialisation plus lisible et actionnable`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Character Sheet / Specialization Tree / UX`
- [ ] Poser les dépendances de feature vers l'epic et les prérequis US16 / US17

## Stories / Enabler / Test à créer

### GUX1 — Header et sidebar

- [ ] Titre : `GUX1 - Compacter le header et clarifier la sidebar de progression`
- [ ] AC : header réduit, progression utile visible, suppression des redondances, arbre actif mieux mis en évidence
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### GUX2 — États visuels des nœuds

- [ ] Titre : `GUX2 - Clarifier les états des nœuds avec couleurs, contraste et pictogrammes`
- [ ] AC : couleur métier actif/passif, luminosité selon achat/disponibilité, pictogrammes d'état, coût XP plus stable, verrouillés lisibles
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### GUX3 — Connexions et hover

- [ ] Titre : `GUX3 - Rendre les connexions et le hover plus explicites pour la progression`
- [ ] AC : styles de liens par état, highlight du nœud survolé, mise en lumière des prérequis et dépendants, atténuation sobre du reste
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `GUX2`

### GUX4 — Panneau d'action contextuelle

- [ ] Titre : `GUX4 - Transformer le panneau de détail en panneau d'action contextuelle`
- [ ] AC : action `Purchase` / `Refund` quand autorisée, état affiché, raison de blocage, description du talent, absence d'action si oubli impossible
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `GUX2`, prérequis `US17`

### GUX5 — Polish UX global

- [ ] Titre : `GUX5 - Harmoniser microcopy, curseurs, légende et ambiance visuelle`
- [ ] AC : boutons d'action explicites, curseurs cohérents, légende discrète, thème `Outer Rim Datapad` sobre et lisible
- [ ] Estimate : `2`
- [ ] Priority : `P2`
- [ ] Bloquée par : `GUX1`, `GUX2`, `GUX3`, `GUX4`

### GUX6 — Validation ciblée

- [ ] Titre : `GUX6 - Valider lisibilité, affordances et non-régression du flux`
- [ ] Cas : acheté, achetable, verrouillé, invalide, hover contextuel, panneau d'action, microcopy des modales, cohérence curseur / action
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `GUX1`, `GUX2`, `GUX3`, `GUX4`, `GUX5`

## Sous-tâches recommandées

- [ ] Ajouter une task de barre de progression dans la carte de spécialisation active
- [ ] Ajouter une task d'icônes discrètes d'état pour les nœuds
- [ ] Ajouter une task de lisibilité renforcée des nœuds verrouillés
- [ ] Ajouter une task de highlight des prérequis et talents débloqués
- [ ] Ajouter une task de description repliable dans le panneau de détail
- [ ] Ajouter une task de remplacement systématique des boutons `Yes / No`

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Specialization Tree V1`
- [ ] Feature **blocked by** prérequis US16
- [ ] Feature **blocked by** prérequis US17
- [ ] `GUX1` **blocked by** Feature
- [ ] `GUX2` **blocked by** Feature
- [ ] `GUX3` **blocked by** `GUX2`
- [ ] `GUX4` **blocked by** `GUX2`
- [ ] `GUX4` **blocked by** `US17`
- [ ] `GUX5` **blocked by** `GUX1`
- [ ] `GUX5` **blocked by** `GUX2`
- [ ] `GUX5` **blocked by** `GUX3`
- [ ] `GUX5` **blocked by** `GUX4`
- [ ] `GUX6` **blocked by** `GUX1`, `GUX2`, `GUX3`, `GUX4`, `GUX5`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `GUX1` et `GUX2` en `Sprint Ready` en premier
- [ ] Paralléliser `GUX3` et `GUX4` après stabilisation du langage visuel
- [ ] Réserver `GUX5` comme passe de consolidation courte, pas comme fourre-tout

## Checklist de clôture

- [ ] L'utilisateur comprend en quelques secondes ce qui est acheté, disponible, verrouillé et invalide
- [ ] L'état global de progression est visible sans inspection manuelle de l'arbre
- [ ] Les nœuds verrouillés restent lisibles pour la planification
- [ ] Le hover explique le chemin de progression et l'impact d'un oubli
- [ ] Le panneau de détail sert de point d'entrée principal pour l'action contextuelle
- [ ] Les dialogues et boutons utilisent une microcopy explicite
- [ ] La passe visuelle reste sobre et compatible avec l'identité Star Wars Edge
