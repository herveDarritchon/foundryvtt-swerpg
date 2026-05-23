# Issues Checklist — Specialization Tree V1 / Multi-Specialization Management

## Préparation

- [ ] Relire `documentation/cadrage/character-sheet/specializations/cadrage-gestion-multi-specialisations-feuille-personnage.md`
- [ ] Confirmer le rattachement à l'epic `Specialization Tree V1`
- [ ] Vérifier les prérequis fonctionnels issus de US16 / US17 et de la fenêtre `SpecializationTreeApp`
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `character-sheet`, `specializations`, `specialization-tree`

## Création Epic / Feature

- [ ] Réutiliser l'epic `Specialization Tree V1`
- [ ] Créer la feature `Multi-Specialization Management - Gérer ajout, synthèse et suppression des spécialisations`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Character Sheet / Specializations / Specialization Tree`
- [ ] Poser la dépendance de feature vers l'epic et la continuité US16 / US17

## Stories / Enabler / Test à créer

### MSM1 — Contrat métier et arbre courant

- [ ] Titre : `MSM1 - Stabiliser le contrat métier des spécialisations et de l'arbre courant`
- [ ] AC : `career` inchangé, `ownedSpecializations` canonique, `selectedSpecializationTree` purement UI, coût carrière / hors carrière / universelle défini
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### MSM2 — Header multi-spécialisation

- [ ] Titre : `MSM2 - Résumer les spécialisations dans le header et ouvrir la gestion`
- [ ] AC : affichage `No specialization` / nom principal / `+N`, tooltip des spécialisations supplémentaires, clic ouvrant la gestion
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `MSM1`

### MSM3 — Achat de spécialisation

- [ ] Titre : `MSM3 - Acheter une spécialisation avec coût prévisualisé et blocages explicites`
- [ ] AC : coût visible avant validation, distinction carrière / hors carrière, doublons bloqués, XP insuffisante bloquante avec message, arbre non résolu bloqué
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `MSM1`

### MSM4 — Suppression contrôlée

- [ ] Titre : `MSM4 - Supprimer une spécialisation autorisée avec confirmation et fallback d'arbre courant`
- [ ] AC : suppression seulement si non initiale et sans talent acheté, confirmation obligatoire, pas de remboursement XP, nouvel arbre courant sélectionné après retrait
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `MSM1`

### MSM5 — Validation ciblée

- [ ] Titre : `MSM5 - Valider coûts, états UI et non-régression multi-spécialisation`
- [ ] Cas : header `0/1/N`, achat carrière / hors carrière, XP insuffisante, doublon, suppression autorisée, suppression verrouillée, absence de remboursement XP
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `MSM2`, `MSM3`, `MSM4`

## Sous-tâches recommandées

- [ ] Ajouter une task de badge `+N` et tooltip des spécialisations supplémentaires
- [ ] Ajouter une task de microcopy explicite pour `XP insuffisante` et `suppression impossible`
- [ ] Ajouter une task de traitement des spécialisations universelles comme spécialisations de carrière pour le coût V1
- [ ] Ajouter une task de blocage achat si l'arbre n'est pas résoluble proprement
- [ ] Ajouter une task de confirmation de suppression sans remboursement XP
- [ ] Ajouter une task de fallback vers la dernière spécialisation encore disponible après suppression

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Specialization Tree V1`
- [ ] Feature **related to** continuité US16 / US17
- [ ] `MSM1` **blocked by** Feature
- [ ] `MSM2` **blocked by** `MSM1`
- [ ] `MSM3` **blocked by** `MSM1`
- [ ] `MSM4` **blocked by** `MSM1`
- [ ] `MSM5` **blocked by** `MSM2`, `MSM3`, `MSM4`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `MSM1` en `Sprint Ready` en premier
- [ ] Lancer `MSM2` juste après stabilisation du contrat de données
- [ ] Paralléliser `MSM3` et `MSM4` si le centre de gestion est stable
- [ ] Réserver `MSM5` comme verrou de fin de flux, pas comme ticket fourre-tout

## Checklist de clôture

- [ ] Le header reste compact et informatif quel que soit le nombre de spécialisations
- [ ] L'utilisateur comprend que `current tree` est un contexte d'affichage et non un état métier exclusif
- [ ] Le coût d'achat respecte les exemples métier du cadrage
- [ ] Les achats bloqués restent visibles avec raison explicite
- [ ] Une spécialisation déjà possédée ne peut jamais être rachetée
- [ ] La spécialisation initiale n'est pas supprimable en V1
- [ ] Aucun remboursement XP n'est appliqué lors d'une suppression
- [ ] La suppression d'une spécialisation courante laisse toujours l'interface sur un arbre valide
