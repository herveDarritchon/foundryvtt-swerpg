# Issues Checklist — Specialization Tree V1 / US16.2 Current Tree Render View-Model

## Préparation

- [ ] Relire le cadrage US16.2 dans `cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`
- [ ] Confirmer le domaine métier `character-sheet / specialization-tree`
- [ ] Vérifier le rattachement à l'Epic #184 et à la Feature #200
- [ ] Vérifier le prérequis fonctionnel US16.1 sur la sélection de l'arbre courant

## Story principale

- [ ] Créer ou mettre à jour l'issue `#295 - US16.2 - Construire le view-model de rendu de l'arbre courant`
- [ ] Renseigner `Priority = P0`, `Value = High`, `Component = Specialization Tree`, `Estimate = 2`
- [ ] Ajouter les AC : nœuds normalisés, connexions prêtes au rendu, fallback talent introuvable, testabilité sans PIXI

## Sous-issues recommandées

### US16.2.a — Normaliser les nœuds du tree courant

- [ ] Titre : `US16.2.a - Normaliser les nœuds du tree courant`
- [ ] AC : exposer `nodeId`, talent, coût, `row`, `column`, état métier, métadonnées d'affichage
- [ ] Priority : `P0`
- [ ] Estimate : `1`
- [ ] Bloquée par : `#295`

### US16.2.b — Préparer les connexions du view-model

- [ ] Titre : `US16.2.b - Préparer les connexions du view-model`
- [ ] AC : exposer toutes les connexions utiles au rendu sans calcul PIXI
- [ ] Priority : `P0`
- [ ] Estimate : `1`
- [ ] Bloquée par : `#295`

### US16.2.c — Gérer le fallback talent introuvable

- [ ] Titre : `US16.2.c - Gérer le fallback talent introuvable dans le view-model`
- [ ] AC : fallback explicite, déterministe et non ambigu sur les talents non résolus
- [ ] Priority : `P0`
- [ ] Estimate : `1`
- [ ] Bloquée par : `#295`

### US16.2.t — Couvrir le contrat du view-model

- [ ] Titre : `US16.2.t - Couvrir le contrat du view-model de rendu`
- [ ] Cas : état vide, arbre nominal, exhaustivité des nœuds, exhaustivité des connexions, fallback talent introuvable, absence de dépendance PIXI
- [ ] Priority : `P0`
- [ ] Estimate : `1`
- [ ] Bloquée par : `US16.2.a`, `US16.2.b`, `US16.2.c`

## Dépendances GitHub à poser

- [ ] `#295` **blocked by** Feature #200
- [ ] `#295` **blocked by** prérequis US16.1 si non clos
- [ ] `US16.2.a` **blocked by** `#295`
- [ ] `US16.2.b` **blocked by** `#295`
- [ ] `US16.2.c` **blocked by** `#295`
- [ ] `US16.2.t` **blocked by** `US16.2.a`
- [ ] `US16.2.t` **blocked by** `US16.2.b`
- [ ] `US16.2.t` **blocked by** `US16.2.c`
- [ ] Poser ensuite les liens **blocking** vers US16.3, US16.4 et la consolidation US16.8

## Labels et board

- [ ] Labels : `user-story` / `enabler` / `test`
- [ ] Labels : `priority-high` ou équivalent `P0`, `value-high`, `specialization-tree`, `character-sheet`
- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `#295` en `Sprint Ready` seulement quand les AC sont figés

## Checklist de clôture

- [ ] Le contrat `currentTree` est explicite et stable
- [ ] Le view-model expose tous les nœuds attendus
- [ ] Le view-model expose toutes les connexions attendues
- [ ] Le fallback talent introuvable est documenté et couvert
- [ ] Aucune logique métier n'est nécessaire dans PIXI pour interpréter les données
- [ ] Les dépendances GitHub vers les tickets aval sont posées
- [ ] #295 peut être fermée sans refonte supplémentaire pour US16.3 / US16.4
