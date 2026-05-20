# Issues Checklist — Specialization Tree V1 / US17 Talent Node Purchase and Forget

## Préparation

- [ ] Relire le cadrage source `cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- [ ] Confirmer le domaine métier `character-sheet / specialization-tree`
- [ ] Vérifier le rattachement à l'epic `Specialization Tree V1`
- [ ] Vérifier le prérequis US16 : arbre graphique déjà exploitable en lecture
- [ ] Figer l'hypothèse V1 sur les doublons de talents non ranked

## Création Epic / Feature

- [ ] Réutiliser l'epic `Specialization Tree V1`
- [ ] Créer la feature `US17 - Restaurer l'achat et l'oubli de talents depuis l'arbre de spécialisation`
- [ ] Ajouter la valeur métier, les critères de succès et la DoD feature
- [ ] Renseigner `Priority = P0`, `Value = High`, `Component = Specialization Tree`, `US = US17`

## Stories / Enablers / Tests à créer

### US17.1 — Service métier d'achat et d'oubli

- [ ] Titre : `US17.1 - Créer le service métier d'achat et d'oubli de nœud`
- [ ] AC : valider achat, valider oubli, refuser les états invalides, produire des erreurs métier exploitables
- [ ] Estimate : `3`
- [ ] Priority : `P0`
- [ ] Bloquée par : Feature

### US17.2 — Persistance acteur et XP atomique

- [ ] Titre : `US17.2 - Stabiliser la persistance acteur et l'impact XP`
- [ ] AC : ajout/retrait dans `talentPurchases`, patch acteur atomique, alignement sur la convention XP existante
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : `US17.1`

### US17.3 — View-model de nœud actionnable

- [ ] Titre : `US17.3 - Exposer un view-model de nœud actionnable`
- [ ] AC : `canPurchase`, `canForget`, `actionLabel`, `blockedReason`, `blockingDependents`, coût, référence d'achat
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : `US17.1`

### US17.4 — Interactions UI et confirmations

- [ ] Titre : `US17.4 - Brancher les interactions UI et confirmations dans SpecializationTreeApp`
- [ ] AC : clic sur nœud, confirmation achat, confirmation oubli, notification succès/échec, respect des permissions
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : `US17.2`, `US17.3`

### US17.5 — Synchronisation arbre et onglet Talents

- [ ] Titre : `US17.5 - Synchroniser l'arbre et l'onglet Talents après update acteur`
- [ ] AC : refresh de l'arbre, conservation du viewport, vue Talents consolidée alignée après achat/oubli
- [ ] Estimate : `1`
- [ ] Priority : `P0`
- [ ] Bloquée par : `US17.4`

### US17.6 — Audit log

- [ ] Titre : `US17.6 - Émettre les événements d'audit log d'achat et d'oubli`
- [ ] AC : événements `requested` / `succeeded` / `failed`, payload minimal utile, absence de blocage si audit en échec
- [ ] Estimate : `1`
- [ ] Priority : `P1`
- [ ] Bloquée par : `US17.1`, `US17.2`

### US17.7 — Tests ciblés

- [ ] Titre : `US17.7 - Couvrir achat, oubli, blocages et refreshs`
- [ ] Cas : achat nominal, XP insuffisante, nœud déjà acheté, arbre non résolu, oubli bloqué par dépendants, permissions, refresh arbre, refresh onglet Talents
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : `US17.2`, `US17.3`, `US17.4`, `US17.5`

## Sous-tâches recommandées

- [ ] Ajouter une task d'arbitrage explicite sur les talents non ranked dupliqués
- [ ] Ajouter une task de remboursement XP à l'oubli selon l'hypothèse V1 retenue
- [ ] Ajouter une task d'explication UI des dépendants bloquant l'oubli
- [ ] Ajouter une task de conservation du viewport après redraw
- [ ] Ajouter une task de messages utilisateur localisables pour les erreurs métier

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Specialization Tree V1`
- [ ] Feature **blocked by** prérequis US16
- [ ] `US17.1` **blocked by** Feature
- [ ] `US17.2` **blocked by** `US17.1`
- [ ] `US17.3` **blocked by** `US17.1`
- [ ] `US17.4` **blocked by** `US17.2`
- [ ] `US17.4` **blocked by** `US17.3`
- [ ] `US17.5` **blocked by** `US17.4`
- [ ] `US17.6` **blocked by** `US17.1`
- [ ] `US17.6` **blocked by** `US17.2`
- [ ] `US17.7` **blocked by** `US17.2`
- [ ] `US17.7` **blocked by** `US17.3`
- [ ] `US17.7` **blocked by** `US17.4`
- [ ] `US17.7` **blocked by** `US17.5`

## Labels et board

- [ ] Labels : `feature`, `user-story`, `enabler`, `test`
- [ ] Labels : `priority-high`, `value-high`, `character-sheet`, `specialization-tree`
- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `US17.1` en `Sprint Ready` avant les autres sous-issues

## Checklist de clôture

- [ ] L'achat depuis un nœud `available` fonctionne côté joueur autorisé
- [ ] L'oubli d'un nœud acheté est refusé si la chaîne de progression serait cassée
- [ ] Les messages d'erreur sont explicites et actionnables pour l'utilisateur
- [ ] La progression acteur et l'XP sont mises à jour dans une seule opération cohérente
- [ ] L'arbre reflète immédiatement le nouvel état après succès
- [ ] L'onglet Talents consolidé reflète immédiatement le nouvel état après succès
- [ ] Les événements d'audit utiles sont émis sans rendre le flux fragile
- [ ] Les dépendances GitHub sont fermées dans l'ordre prévu
