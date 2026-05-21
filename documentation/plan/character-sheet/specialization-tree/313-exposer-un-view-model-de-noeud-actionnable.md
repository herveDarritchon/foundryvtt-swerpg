# US17.3 — Plan d'implémentation : Exposer un view-model de nœud actionnable

## Contexte

Issue : [#313 — US17.3 - Exposer un view-model de nœud actionnable](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/313)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- `documentation/plan/character-sheet/specialization-tree/311-creer-le-service-metier-dachat-et-doubli-de-noeud.md`
- `documentation/plan/character-sheet/specialization-tree/312-stabiliser-la-persistance-acteur-et-limpact-xp.md`

L'existant expose déjà un `renderNode` enrichi avec `nodeState`, `reasonCode`, `reasonLabel` et les variantes UI, tandis que `processTalentNodeProgression()` sait déjà valider achat, oubli et dépendances bloquantes. Le besoin de US17.3 est maintenant d'assembler ces briques en un contrat UI stable, lisible et réutilisable par la future interaction utilisateur, sans réimplémenter les règles métier dans `SpecializationTreeApp`.

## Objectif

Enrichir chaque nœud rendu avec un sous-view-model actionnable, localisable et déterministe, décrivant l'action principale possible, les blocages éventuels et la référence métier minimale à transmettre aux futures interactions UI.

## Périmètre

### Inclus

- exposition de `canPurchase`, `canForget`, `actionLabel`, `blockedReason`, `blockingDependents` ;
- convention explicite de l'action principale (`purchase`, `forget` ou aucune) selon l'état courant du nœud ;
- référence d'action stable pour le futur flux UI (`specializationId`, `treeId`/`treeUuid`, `nodeId`, `talentId`/`talentUuid`, `cost`) ;
- couverture de test du contrat view-model et de son intégration au contexte applicatif.

### Exclus

- persistance acteur et `actor.update()` (`US17.2`) ;
- clics, confirmations, notifications et permissions interactives (`US17.4`) ;
- refresh de l'arbre et de l'onglet Talents après mutation (`US17.5`) ;
- audit log (`US17.6`).

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/applications/specialization-tree/actionable-node-view-model.mjs` | Nouveau builder pur du sous-view-model actionnable d'un nœud |
| `module/applications/specialization-tree-app.mjs` | Brancher l'enrichissement actionnable dans `buildSpecializationTreeContext()` |
| `module/applications/specialization-tree/node-ui-state.mjs` | Réutiliser/compléter le mapping i18n UI si le contrat actionnable partage des labels |
| `lang/fr.json` | Ajouter les libellés FR des actions et blocages manquants |
| `lang/en.json` | Ajouter les libellés EN des actions et blocages manquants |
| `tests/applications/specialization-tree/actionable-node-view-model.test.mjs` | Tests unitaires du mapper pur |
| `tests/applications/specialization-tree-app.test.mjs` | Vérifier l'intégration du contrat dans le contexte exposé à l'application |

## Plan d'implémentation

### Étape 1 — Formaliser un contrat actionnable pur par nœud

**Fichiers :** `module/applications/specialization-tree/actionable-node-view-model.mjs`, `module/lib/talent-node/talent-node-progression.mjs`

1. Extraire un builder pur recevant l'acteur, la spécialisation, l'arbre et le nœud courant, puis déléguant les validations à `getNodeState(...)` et `processTalentNodeProgression(..., 'purchase' | 'forget')`.
2. Définir une convention stable : nœud `available` → action primaire `purchase`, nœud `purchased` → action primaire `forget`, autres états → aucune action primaire et blocage explicite.
3. Normaliser une sortie unique par nœud avec au minimum `canPurchase`, `canForget`, `primaryAction`, `actionLabel`, `blockedReasonCode`, `blockedReasonLabel`, `blockingDependents` et `actionRef`.

### Étape 2 — Brancher le contexte de rendu sur ce contrat unique

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `module/applications/specialization-tree/actionable-node-view-model.mjs`

1. Enrichir chaque `renderNode` de `buildSpecializationTreeContext()` avec le sous-view-model actionnable, sans casser le contrat existant de layout, labels et variantes visuelles.
2. Garder les règles de prérequis, d'XP et de dépendances exclusivement dans la couche métier existante, sans recalcul inline dans l'application.
3. Exposer `blockingDependents` dans une forme stable directement réutilisable par `US17.4`, au minimum comme liste déterministe de nœuds bloquants liée au nœud courant.

### Étape 3 — Compléter l'i18n et verrouiller les cas nominaux / bloquants

**Fichiers :** `lang/fr.json`, `lang/en.json`, `tests/applications/specialization-tree/actionable-node-view-model.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Ajouter les libellés localisés nécessaires aux actions utilisateur (`purchase`, `forget`) et aux éventuels messages bloquants non encore couverts par l'i18n existante.
2. Couvrir les cas clés : nœud disponible achetable, nœud acheté oubliable, nœud acheté bloqué par dépendants, nœud verrouillé par XP ou prérequis, nœud invalide/non résolu.
3. Vérifier que le contexte expose une `actionRef` stable et qu'aucune construction du view-model n'appelle la persistance acteur ou ne déclenche d'effet de bord.

## Définition de done

- [ ] Chaque `renderNode` expose un contrat actionnable stable et documenté.
- [ ] `SpecializationTreeApp` ne recalcule aucune règle métier d'achat/oubli.
- [ ] Les nœuds oubliables bloqués exposent leurs dépendants bloquants de façon exploitable.
- [ ] Les libellés d'action et de blocage passent par l'i18n FR/EN.
- [ ] Les tests couvrent les cas nominaux et les principaux refus métier visibles par l'UI.
