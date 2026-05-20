# Issues Checklist — Talents V1 / Consolidated Talent Resolution

## Préparation

- [ ] Relire le cadrage source `cadrage-resolution-talents-unknown-vue-consolidee.md`
- [ ] Vérifier le rattachement à l'epic `Talents V1`
- [ ] Confirmer le composant métier `character-sheet / talent`
- [ ] Préparer les labels `epic`, `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`

## Création Epic / Feature

- [ ] Créer l'epic `Talents V1 - fiabiliser la résolution de la vue consolidée`
- [ ] Ajouter la valeur métier, les critères de succès et la DoD epic
- [ ] Créer la feature `Corriger la résolution des talents agrégés depuis les arbres de spécialisation`
- [ ] Lier la feature à l'epic
- [ ] Renseigner `Priority = P0/P1`, `Value = High`, `Component = Talents`

## Stories / Enablers / Tests à créer

### Story 1 — Diagnostic prouvé

- [ ] Titre : `Story: Diagnostiquer où la vue consolidée produit Unknown Talent`
- [ ] AC : localiser le resolver, tracer les clés disponibles, confirmer si l'échec vient du référentiel ou du mapping
- [ ] Estimate : `2`
- [ ] Priority : `P0`

### Enabler 1 — Stratégie de clés

- [ ] Titre : `Enabler: Formaliser la stratégie talentId / talentUuid / treeUuid`
- [ ] AC : documenter la clé métier, la référence Foundry et l'ordre de résolution
- [ ] Estimate : `1`
- [ ] Priority : `P1`
- [ ] Bloquée par : Story diagnostic

### Story 2 — Resolver consolidé

- [ ] Titre : `Story: Corriger le resolver de talents consolidés`
- [ ] AC : résolution par `talentUuid`, fallback par `talentId`, fallback contrôlé, sources conservées
- [ ] Estimate : `3`
- [ ] Priority : `P0`
- [ ] Bloquée par : Story diagnostic, Enabler stratégie de clés

### Enabler 2 — Persistance future enrichie

- [ ] Titre : `Enabler: Enrichir les nouveaux achats avec talentUuid et treeUuid`
- [ ] AC : compatibilité ascendante garantie, pas de migration lourde immédiate
- [ ] Estimate : `2`
- [ ] Priority : `P2`
- [ ] Bloquée par : Story resolver consolidé

### Test 1 — Couverture unitaire

- [ ] Titre : `Test: Couvrir la consolidation des talents agrégés`
- [ ] Cas : résolution UUID, fallback talentId, talent inconnu, ranked multi-sources, source dégradée, absence d'achats
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : Story resolver consolidé

### Test 2 — Vérification visuelle Foundry

- [ ] Titre : `Test: Valider la vue Talents sur l'acteur de référence`
- [ ] Cas : `conv`, `fearsome`, `intim`, `quickdr`, `senseadv`, `tough`, sources `Scoundrel` / `Aggressor`
- [ ] Estimate : `1`
- [ ] Priority : `P1`
- [ ] Bloquée par : Story resolver consolidé, Test couverture unitaire

## Sous-tâches recommandées

- [ ] Ajouter une task de logging ciblé pour le diagnostic
- [ ] Ajouter une task d'indexation des Items Talent par UUID et clé métier
- [ ] Ajouter une task de fallback `Unknown Talent` contrôlé
- [ ] Ajouter une task de documentation courte sur la clé canonique
- [ ] Ajouter une task de validation des scénarios ranked / multi-sources

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic
- [ ] Enabler stratégie de clés **blocked by** Story diagnostic
- [ ] Story resolver consolidé **blocked by** Story diagnostic
- [ ] Story resolver consolidé **blocked by** Enabler stratégie de clés
- [ ] Enabler persistance future **blocked by** Story resolver consolidé
- [ ] Test couverture unitaire **blocked by** Story resolver consolidé
- [ ] Test visuel Foundry **blocked by** Story resolver consolidé
- [ ] Test visuel Foundry **blocked by** Test couverture unitaire

## Checklist board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Renseigner `Priority`, `Value`, `Component`, `Estimate`, `Epic`
- [ ] Mettre les issues prêtes dans `Sprint Ready`
- [ ] Garder au moins 20% de buffer pour investigation complémentaire si le référentiel Talent est incomplet

## Checklist de clôture

- [ ] Tous les faux `Unknown Talent` du scénario de référence sont supprimés
- [ ] Les vraies références introuvables restent identifiables via fallback et logs
- [ ] Les dépendances GitHub sont fermées dans l'ordre prévu
- [ ] La feature et l'epic reflètent les métriques finales de résolution et de non-régression
