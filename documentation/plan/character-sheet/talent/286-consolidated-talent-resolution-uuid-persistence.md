# Plan d'implémentation — #286 : Consolidated Talent Resolution + UUID Persistence

**Issue** : #286 (proposed)
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/cadrage-resolution-talents-unknown-vue-consolidee.md`
**Plans de référence** : `documentation/plan/character-sheet/talent/283-vue-consolidee-resoudre-talents-connus-referentiel.md`, `documentation/plan/character-sheet/talent/284-vue-consolidee-des-talents-consolider-le-rang-et-les-sources-multiples.md`, `documentation/plan/character-sheet/talent/285-vue-consolidee-des-talents-diagnostiquer-proprement-les-talents-non-resolus.md`

---

## 1. Objectif

Résoudre durablement les `Unknown Talent` dans l'onglet Talents de la feuille personnage en :

1. alignant la résolution des définitions de talents de la vue consolidée sur celle déjà utilisée par l'arbre de spécialisation ;
2. enrichissant les nouveaux achats avec `talentUuid` et `treeUuid` ;
3. rendant le groupement et la déduplication de la vue consolidée aware des UUID quand ils sont disponibles ;
4. centralisant la logique de résolution métier des talents partagée entre la vue consolidée et la vue arbre.

## 2. Diagnostic

### 2.1 Résolution divergente

Deux chemins de résolution coexistent actuellement :

- **Arbre de spécialisation** (`module/applications/specialization-tree-app.mjs:154`) : résout par `talentUuid` via `fromUuidSync`, puis par `talentId` dans `game.items`, puis dans `game.packs`.
- **Vue consolidée** (`module/applications/sheets/character-sheet.mjs:924`) : résout uniquement dans `game.items` par `item.system?.id || item.id`.

Quand les Items Talent ne sont pas dans `game.items` (uniquement en compendium) ou que la clé métier courte (`conv`, `fearsome`, etc.) ne correspond pas à `system.id`, la vue consolidée échoue et produit `Unknown Talent` / `Unspecified`.

### 2.2 Persistance incomplète

Le schéma d'achat acteur (`module/models/character.mjs:176`) stocke seulement :

```js
{
  ;(treeId, nodeId, talentId, specializationId)
}
```

alors que les nœuds d'arbre (`module/models/specialization-tree.mjs:16`) supportent déjà `talentUuid`. Les spécialisations possédées supportent `treeUuid`. Les achats ne les utilisent pas.

### 2.3 Comportement attendu

- un achat avec un `talentId` métier court est résolu vers le vrai talent (via arbre ou compendium) ;
- un achat enrichi d'un `talentUuid` est résolu immédiatement sans index métier ;
- la déduplication et le calcul de rang restent corrects après enrichissement.

## 3. Périmètre

### Inclus

- schéma `talentPurchases` : ajout optionnel de `talentUuid`, `treeUuid` ;
- écriture achat : enrichir le payload depuis `node.talentUuid` et `tree.uuid` ;
- reconnaissance des achats existants (état `purchased`) compatible avec et sans UUID ;
- résolution centralisée des talents (nouveau helper `module/lib/talent-node/talent-reference-resolver.mjs`) ;
- vue consolidée : utiliser le même index de résolution que l'arbre ;
- vue consolidée : grouper par `talentUuid ?? talentId` ;
- tests unitaires pour chaque étape.

### Exclu

- migration rétroactive des achats existants (compatibilité ascendante uniquement) ;
- refonte Handlebars ou CSS de l'onglet Talents ;
- refonte de l'import OggDude au-delà du mapping déjà existant ;
- effets mécaniques, `system.effects`, ou `ActiveEffect`.

## 4. Architecture

### 4.1 Schéma achat enrichi (optionnel, rétrocompatible)

```js
talentPurchases: new fields.ArrayField(
  new fields.SchemaField({
    treeId: new fields.StringField({ required: true, blank: false }),
    treeUuid: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
    nodeId: new fields.StringField({ required: true, blank: false }),
    talentId: new fields.StringField({ required: true, blank: false }),
    talentUuid: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
    specializationId: new fields.StringField({ required: true, blank: false }),
  }),
  { required: false, initial: [] },
)
```

### 4.2 Helper de résolution centralisé

Nouveau fichier : `module/lib/talent-node/talent-reference-resolver.mjs`

Responsabilités :

- résoudre par `talentUuid` via `fromUuidSync` (priorité 1) ;
- résoudre par `talentId` normalisé dans `game.items` via `system.id` ;
- fallback `flags.swerpg.oggdudeKey` ;
- index compendium via `game.packs` (comme `buildTalentByIdFromCompendium`) ;
- exposer `buildTalentDefinitionsMap()` pour remplacer `#buildTalentDefinitions()` de la fiche.

### 4.3 Détection d'achat UUID-aware

`module/lib/talent-node/talent-node-state.mjs:hasPurchase` : accepter que les nouveaux achats portent des UUIDs et les anciens non. Règle de matching :

- obligatoire : `nodeId`, `specializationId` ;
- matching par `treeUuid` si les deux côtés en ont, sinon `treeId` ;
- matching par `talentUuid` si les deux côtés en ont, sinon `talentId`.

### 4.4 Groupement consolidé UUID-aware

`module/lib/talent-node/owned-talent-summary.mjs` :

- clé de groupement = `purchase.talentUuid || purchase.talentId` ;
- ajout d'un champ optionnel `talentUuid` sur `OwnedTalentSummaryEntry` ;
- résolution de définition : préférer `talentUuid`, fallback `talentId`.

## 5. Fichiers impactés

| Fichier                                                | Type de changement                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `module/models/character.mjs`                          | Ajout `treeUuid`, `talentUuid` optionnels dans le schéma `talentPurchases`                  |
| `module/lib/talent-node/talent-node-purchase.mjs`      | Enrichir le payload achat avec `treeUuid`, `talentUuid`                                     |
| `module/lib/talent-node/talent-node-state.mjs`         | `hasPurchase` compatible UUID                                                               |
| `module/lib/talent-node/talent-reference-resolver.mjs` | **Nouveau** — helper partagé de résolution                                                  |
| `module/applications/specialization-tree-app.mjs`      | Supprimer `_resolveTalentByBusinessKey` / `resolveTalentDetail`, utiliser le helper partagé |
| `module/applications/sheets/character-sheet.mjs`       | Remplacer `#buildTalentDefinitions()` par le helper partagé                                 |
| `module/lib/talent-node/owned-talent-summary.mjs`      | Groupement par `talentUuid ?? talentId`, ajout `talentUuid` au résultat                     |
| `module/utils/audit-log.mjs`                           | (Optionnel) Ajout `treeUuid`, `talentUuid` dans le payload audit                            |

## 6. Tests à ajouter ou modifier

| Fichier test                                                 | Cas                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `tests/lib/talent-node/talent-node-purchase.test.mjs`        | Payload enrichi avec UUID ; absence de régression legacy                                 |
| `tests/lib/talent-node/talent-node-state.test.mjs`           | `hasPurchase` match mixte UUID+legacy ; dédoublonnage UUID                               |
| `tests/lib/talent-node/talent-reference-resolver.test.mjs`   | Résolution par UUID, par business key, fallback compendium, fallback oggdudeKey, inconnu |
| `tests/lib/talent-node/owned-talent-summary.test.mjs`        | Groupement UUID ; fallback `talentId` legacy ; définition priorise UUID                  |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | Résolution compendium-only ; clé oggdudeKey ; warning enrichi avec UUID                  |
| `tests/applications/specialization-tree-app.test.mjs`        | Aucun changement de comportement attendu après extraction du helper                      |
| `tests/unit/documents/actor-synchronization.test.mjs`        | Vérifier que les achats avec UUID se consolident correctement                            |

## 7. Ordre d'implémentation recommandé

1. Schéma `talentPurchases` (character.mjs)
2. Enrichissement à l'écriture (purchaseTalentNode — talent-node-purchase.mjs)
3. Compatibilité de matching (talent-node-state.mjs)
4. Helper centralisé (talent-reference-resolver.mjs)
5. Mise à jour de la vue arbre (specialization-tree-app.mjs) pour utiliser le helper
6. Mise à jour de la vue consolidée (character-sheet.mjs, owned-talent-summary.mjs)
7. Tests
8. (Optionnel) Audit log enrichi

## 8. Risques

- Changement de schéma `talentPurchases` : les propriétés `treeUuid` / `talentUuid` doivent être optionnelles et nullable pour ne pas casser les acteurs existants.
- `hasPurchase` avec matching UUID : si un arbre est ré-importé et que `nodeId` change mais que `talentUuid` reste stable, la détection d'achat doit encore fonctionner.
- Regroupement mixte UUID/talentId : un talent acheté avant et après l'enrichissement pourrait être dédoublonné en deux entrées si la clé de groupement n'est pas stable. La règle `talentUuid ?? talentId` en clé unique résout ce cas.

## 9. Critères d'arrêt

- les talents connus du cadrage (`conv`, `fearsome`, `intim`, `quickdr`, `senseadv`, `tough`) ne s'affichent plus en `Unknown Talent` ;
- un nouvel achat enrichi avec `talentUuid` est résolu immédiatement et correctement ;
- les achats legacy sans UUID continuent de fonctionner ;
- les tests de non-régression des plans #283, #284, #285 passent ;
- la duplication de logique de résolution entre arbre et fiche est éliminée.
