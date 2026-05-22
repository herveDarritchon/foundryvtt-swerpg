# Issues Checklist — Specialization Tree V1 / Pixi Tree Polish

## Préparation

- [ ] Relire les cadrages `cadrage-refonte-graphique.md` et `spec-cadrage-canvas-specialization-tree-ergonomie.md`
- [ ] Confirmer le rattachement à l'epic `Specialization Tree V1`
- [ ] Noter que la feature prolonge `Graphical UX Refresh` sans la remplacer
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-high`, `specialization-tree`, `pixi`, `ux`

## Création Epic / Feature

- [ ] Réutiliser l'epic `Specialization Tree V1`
- [ ] Créer la feature `Pixi Tree Polish - Renforcer lisibilité et netteté de l'arbre de spécialisation`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Character Sheet / Specialization Tree / PIXI`
- [ ] Poser la relation de continuité avec `Graphical UX Refresh`

## Stories / Enabler / Test à créer

### PXP1 — États visuels des nœuds

- [ ] Titre : `PXP1 - Clarifier contraste et états des nœuds actifs/inactifs`
- [ ] AC : base rouge pour actif, base bleue pour inactif, variantes visibles pour `available` / `locked` / `purchased`
- [ ] AC : lecture claire des 6 cas prioritaires sans dépendre uniquement de la couleur
- [ ] AC : coût XP uniformisé
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### PXP2 — Clic nœud et icônes

- [ ] Titre : `PXP2 - Ouvrir le détail au clic et ajouter les icônes d'action des nœuds`
- [ ] AC : clic sur nœud ouvre la fenêtre de détail
- [ ] AC : `assets/images/icons/electricity.svg` en haut à gauche pour actif
- [ ] AC : `assets/images/icons/plain-circle.svg` en haut à gauche pour inactif
- [ ] AC : `assets/images/icons/buy-card.svg` / `sell-card.svg` en haut à droite selon l'action
- [ ] AC : `assets/images/icons/rank.svg` en bas à droite pour talent ranked
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PXP1`

### PXP3 — Connexions et détail

- [ ] Titre : `PXP3 - Renforcer connexions et compacter la fenêtre de détail`
- [ ] AC : connexions élargies et plus visibles
- [ ] AC : header de détail compacté
- [ ] AC : croix explicite pour fermer la fenêtre de détail
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PXP1`

### PXP4 — Enabler zoom PIXI

- [ ] Titre : `PXP4 - Corriger le flou du zoom PIXI dans le viewport`
- [ ] AC : le zoom reste lisible dans la plage supportée
- [ ] AC : la correction ne réintroduit pas de glissement ou de perte de contrôle du viewport
- [ ] AC : la netteté des nœuds, icônes et connexions reste acceptable après zoom in/out
- [ ] Estimate : `3`
- [ ] Priority : `P0`
- [ ] Bloquée par : Feature

### PXP5 — Validation ciblée

- [ ] Titre : `PXP5 - Valider lisibilité, affordances et netteté du canvas`
- [ ] Cas : actif disponible, actif indisponible, actif acheté, inactif disponible, inactif indisponible, inactif acheté
- [ ] Cas : ouverture détail au clic, fermeture par croix, visibilité des connexions, cohérence des icônes, netteté au zoom
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PXP1`, `PXP2`, `PXP3`, `PXP4`

## Sous-tâches recommandées

- [ ] Ajouter une task de mapping des emplacements d'icônes par coin du nœud
- [ ] Ajouter une task de normalisation visuelle du badge/coût XP
- [ ] Ajouter une task de différenciation fine acheté vs disponible vs indisponible dans chaque famille actif/inactif
- [ ] Ajouter une task de réglage d'épaisseur et contraste des connexions
- [ ] Ajouter une task dédiée à la netteté du rendu pendant le zoom

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Specialization Tree V1`
- [ ] Feature **related to** `Graphical UX Refresh`
- [ ] `PXP1` **blocked by** Feature
- [ ] `PXP2` **blocked by** `PXP1`
- [ ] `PXP3` **blocked by** `PXP1`
- [ ] `PXP4` **blocked by** Feature
- [ ] `PXP5` **blocked by** `PXP1`, `PXP2`, `PXP3`, `PXP4`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `PXP1` et `PXP4` en `Sprint Ready` en premier
- [ ] Lancer `PXP2` et `PXP3` après validation du langage visuel de base
- [ ] Garder `PXP5` comme verrou final de la feature

## Checklist de clôture

- [ ] Les nœuds et connexions sont plus lisibles au premier regard
- [ ] Le joueur comprend actif/inactif et acheté/disponible/indisponible sans effort excessif
- [ ] Le détail s'ouvre directement au clic sur nœud
- [ ] Les icônes de statut et d'action sont cohérentes avec le métier
- [ ] Le coût XP est uniforme
- [ ] Le header de détail est compact et la fermeture est explicite
- [ ] Le zoom n'introduit plus de flou gênant
