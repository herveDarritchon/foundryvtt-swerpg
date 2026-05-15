# Plan d'implémentation — US21 : Neutraliser les anciennes logiques Crucible

**Issue** : [#205 — US21: Neutraliser les anciennes logiques Crucible](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/205)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`
**Module(s) impacté(s)** : `module/lib/talents/` (modification), `module/models/talent.mjs` (modification), `module/documents/actor.mjs` (modification), `module/canvas/` (modification), `module/config/talent-tree.mjs` (modification), `module/applications/sheets/character-sheet.mjs` (modification)

---

## 1. Objectif

Neutraliser les 6 logiques héritées de Crucible identifiées dans l'issue, en vérifiant d'abord que le flux V1 n'en dépend pas, puis en ajoutant des protections runtime avec avertissements de dépréciation, sans casser la compatibilité des personnages existants qui utilisent encore ces chemins legacy.

Les 6 logiques à neutraliser :

| # | Logique Crucible | Fichier(s) porteur(s) |
|---|------------------|----------------------|
| 1 | `rank * 5` | `talent-cost-calculator.mjs:32` |
| 2 | `isCreation` | `talent-factory.mjs:54`, `talent.mjs:5` |
| 3 | Talent points (`actor.points.talent`) | `models/talent.mjs:241`, `actor.mjs:211` |
| 4 | Arbre global Crucible | `config/talent-tree.mjs` |
| 5 | `choice wheel` métier | `canvas/talent-choice-wheel.mjs` |
| 6 | Achat direct de talent générique | `actor-mixins/talents.mjs:168` (`addTalent`), `talents.mjs:208` (`addTalentWithXpCheck`) |

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Vérification que le flux V1 (US6 #190, US7 #191, US18 #202) n'utilise **aucune** des 6 logiques Crucible
- Ajout de logging de dépréciation (`logger.warn`) sur chaque point d'entrée Crucible
- Ajout de guards runtime optionnels (via `CONFIG.SWERPG.deprecationFlags`) pour désactiver chaque logique indépendamment
- Marquage JSDoc `@deprecated` sur les classes, méthodes et paramètres concernés
- Documentation dans le code de chaque logique comme « héritée Crucible — ne pas utiliser pour V1 »
- Neutralisation de l'appel `addTalent()` depuis l'arbre canvas legacy (chemin mort pour V1)
- Tests Vitest vérifiant que les guards et warnings fonctionnent sans régression
- Mise à jour des tests existants qui utilisent encore `isCreation=true` pour talents

### Exclu de cette US / ce ticket

- Suppression physique du code Crucible (conservé pour compatibilité)
- Refonte ou réécriture des classes Crucible
- Migration des données des personnages existants
- Neutralisation des logiques Crucible **skills** (`isCreation` dans `module/lib/skills/`) — concerne uniquement les talents
- Modification du flux d'achat V1 (`talent-node-purchase.mjs`, `talent-node-state.mjs`)
- Modification de l'UI V1 (`specialization-tree-app.mjs`)

---

## 3. Constat sur l'existant

### 3.1. US6, US7, US18 sont fermés et livrés

| US | Issue | Statut | Rôle |
|----|-------|--------|------|
| US6 (#190) | Implémenter l'achat d'un nœud | CLOSED | Achat via `talent-node-purchase.mjs` |
| US7 (#191) | Consolider les talents possédés | CLOSED | Vue consolidée des achats |
| US18 (#202) | Acheter un nœud depuis la vue graphique | CLOSED | UI d'achat dans `specialization-tree-app.mjs` |

**Vérification effectuée** : Le flux V1 est totalement indépendant des 6 logiques Crucible :

| V1 Purchase Flow | Utilise Crucible ? |
|-----------------|-------------------|
| `talent-node-purchase.mjs:purchaseTalentNode()` | Non — utilise `system.progression.talentPurchases` + XP |
| `talent-node-state.mjs:getNodeState()` | Non — utilise `talentPurchases` pour l'état |
| `specialization-tree-app.mjs` (click → purchase) | Non — appelle `purchaseTalentNode()` directement |

### 3.2. État des 6 logiques Crucible

#### 3.2.1. `rank * 5` (talent-cost-calculator.mjs:32)

```js
#calculateTrainCost(rank) { return rank * 5 }
```

**Appelé par** : `trained-talent.mjs:process()`, `ranked-trained-talent.mjs:process()` via `TalentCostCalculator.calculateCost()`.

**Appelé depuis** :
- `character-sheet.mjs:640` — `_onDropItem` avec `TalentFactory.build(actor, item, { action: 'train', isCreation: true })` puis `talentClass.process()` → utilise `rank * 5`
- `item.mjs:190` — `deleteTalent()` avec `TalentFactory.build(actor, this, { action: 'forget', isCreation: true })` puis `talentClass.process()` → utilise `rank * 5` (pour remboursement)

**Flux V1** : `purchaseTalentNode()` utilise `nodeData.cost` depuis le schéma `specialization-tree`, pas `rank * 5`.

#### 3.2.2. `isCreation` (talent-factory.mjs:54, talent.mjs:5)

```js
// talent-factory.mjs:54
if (!isCreation) {
  options.message = `You can train or forget a talent only at creation!`
  return new ErrorTalent(...)
}
```

**Comportement** : Le factory bloque **tout** train/forget de talent si `isCreation === false`. En V1, les talents ne s'achètent plus via ce factory — ils passent par `purchaseTalentNode()`.

**Paradoxe** : Les deux callers (`character-sheet.mjs:645`, `item.mjs:195`) hardcodent `isCreation: true`. Donc le guard ne bloque rien en pratique — mais `isCreation: true` désactive toute validation de coût « post-creation ».

#### 3.2.3. Talent points (`actor.points.talent`)

```js
// models/talent.mjs:241
const points = actor.points.talent
if (points.available < 1) { throw new Error(...) }
```

**Appelé par** : `SwerpgTalent.assertPrerequisites()` → appellé par `addTalent()` (legacy canvas) et potentiellement par d'autres chemins.

**Autre usage** : `actor.mjs:211` — `levelUp()` vérifie `!this.points.talent.available` pour valider la création.

**Flux V1** : `talent-node-purchase.mjs` n'appelle pas `assertPrerequisites()`. V1 ne dépend pas des talent points.

#### 3.2.4. Arbre global Crucible (config/talent-tree.mjs)

`module/config/talent-tree.mjs` (1152 lignes) définit un arbre global unique avec des nœuds, connexions et talents. Il est référencé par :
- `SwerpgTalent` (models/talent.mjs) — `initializeTree()`, `prepareBaseData()`, `assertPrerequisites()`
- `module/config/talent-tree.mjs` lui-même — s'auto-enregistre via `SwerpgTalentNode`
- Canvas legacy — `SwerpgTalentTree` lit les nœuds depuis cet arbre

**Flux V1** : Les arbres V1 sont des items de type `specialization-tree`, chargés via `resolveSpecializationTree()`.

#### 3.2.5. `choice wheel` métier (canvas/talent-choice-wheel.mjs)

`SwerpgTalentChoiceWheel` (148 lignes) et `SwerpgTalentTreeTalent` (74 lignes) forment le mécanisme de sélection radiale.

**Appelé par** : `SwerpgTalentTree` (legacy canvas) uniquement. La V1 utilise `specialization-tree-app.mjs` avec sélection directe par clic.

#### 3.2.6. Achat direct de talent générique (actor-mixins/talents.mjs)

```js
addTalent(talent, { dialog = false })     // ligne 168
addTalentWithXpCheck(item)                 // ligne 208
```

- `addTalent()` est appelé UNIQUEMENT depuis `canvas/talent-tree-talent.mjs:43` (legacy canvas tree)
- `addTalentWithXpCheck()` n'est appelé **nulle part** (code mort)
- Coût hardcodé à `5` XP dans `addTalentWithXpCheck()` (ligne 217)

**Flux V1** : Achat UNIQUEMENT via `purchaseTalentNode()` dans `talent-node-purchase.mjs`.

---

## 4. Décisions d'architecture

### 4.1. Neutralisation progressive avec flags de dépréciation

**Problème** : Comment neutraliser sans casser les personnages existants et les tests ?

**Décision** : Ajouter un système de flags de dépréciation dans `CONFIG.SWERPG.deprecation` permettant de contrôler chaque logique indépendamment :

```js
CONFIG.SWERPG.deprecation = {
  crucible: {
    rankTimes5: { enabled: true, warn: true },     // true = la logique fonctionne encore
    isCreation: { enabled: true, warn: true },       // false = la logique est désactivée
    talentPoints: { enabled: true, warn: true },
    globalTree: { enabled: true, warn: true },
    choiceWheel: { enabled: true, warn: true },
    directPurchase: { enabled: true, warn: true },
  }
}
```

Justification :
- Permet de désactiver chaque logique indépendamment pendant le debug
- Les warnings sont activables/désactivables
- Compatibilité ascendante préservée : `enabled: true` par défaut
- Désactivation possible en test via `CONFIG.SWERPG.deprecation.crucible.X.enabled = false`

### 4.2. Logging de dépréciation centralisé

**Problème** : Comment signaler qu'un chemin legacy est utilisé ?

**Décision** : Créer un helper `logger.deprecated(module, feature)` qui émet un `logger.warn` structuré :

```js
logger.deprecated('talent-cost-calculator', 'rank * 5 cost calculation')
// → [DEPRECATED] [talent-cost-calculator] rank * 5 cost calculation
//   Use node-based cost from specialization-tree instead.
```

Justification :
- Pattern unique et identifiable dans les logs
- Message standardisé incluant la suggestion de remplacement
- Facile à rechercher dans les logs : `[DEPRECATED]`

### 4.3. Marquer le code legacy en JSDoc `@deprecated`

**Problème** : Comment signaler aux développeurs que du code est legacy ?

**Décision** : Ajouter `@deprecated` JSDoc avec message de remplacement sur chaque classe/méthode/propriété concernée.

Exemple :
```js
/**
 * Calculate the cost of the talent.
 * @deprecated Crucible legacy — use nodeData.cost from specialization-tree instead.
 *   Will be removed in a future version.
 * @param {string} action The action to perform.
 * @param {number} rank The rank of the talent in the tree (row).
 * @returns {number} - The cost of the talent.
 */
```

### 4.4. Pas de suppression du code legacy

**Décision** : Conserver le code Crucible jusqu'à la fin de l'EPIC talents V1 (#184). La suppression sera traitée dans une US ultérieure dédiée au nettoyage.

Justification :
- Personnages existants peuvent encore référencer l'arbre global Crucible
- Tests existants utilisent encore ces chemins
- Risque de régression inacceptable en cours d'EPIC

### 4.5. Neutralisation de l'appel canvas `addTalent()` comme priorité

**Décision** : Désactiver le bouton d'achat dans le canvas legacy pour les personnages V1. Dans `talent-tree-talent.mjs:#onClickLeft`, ajouter un guard qui redirige vers la vue graphique V1.

Justification :
- Le canvas legacy est le seul point d'entrée qui déclenche encore `addTalent()` en runtime
- La V1 propose déjà `specialization-tree-app.mjs` pour l'achat
- Évite qu'un joueur utilise par erreur l'ancien flux

### 4.6. `addTalentWithXpCheck()` supprimé (code mort)

**Décision** : Supprimer `addTalentWithXpCheck()` de `actor-mixins/talents.mjs`. Cette méthode a été remplacée par `purchaseTalentNode()` et n'est appelée nulle part.

Justification :
- Élimination de code mort sans risque
- La méthode utilisait un `cost = 5` hardcodé qui est trompeur

---

## 5. Plan de travail détaillé

### Étape 1 : Audit complet des flux V1

**Quoi** : Vérifier exhaustivement que le flux V1 (depuis `specialization-tree-app.mjs` → `purchaseTalentNode()` → `talent-node-state.mjs`) ne passe par aucune des 6 logiques Crucible.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs` — tracer l'appel `purchaseTalentNode`
- `module/lib/talent-node/talent-node-purchase.mjs` — tracer le chemin complet
- `module/lib/talent-node/talent-node-state.mjs` — vérifier l'absence de `rank*5`, `points.talent`, `isCreation`

**Risque** : Aucun — simple vérification de lecture.

### Étape 2 : Ajouter les flags de dépréciation dans `CONFIG.SWERPG`

**Quoi** : Ajouter la structure `CONFIG.SWERPG.deprecation.crucible` avec les 6 flags, chacun supportant `{ enabled, warn }`.

**Fichiers** :
- `module/config/system.mjs` (ou fichier de configuration dédié)

**Risque** : Faible — nouvelle structure, aucun code existant ne la lit encore.

### Étape 3 : Ajouter `logger.deprecated()` helper

**Quoi** : Ajouter une méthode `deprecated(module, feature, suggestion)` sur le logger centralisé.

**Fichiers** :
- `module/utils/logger.mjs` — ajout de la méthode

**Risque** : Faible — ajout non-cassant.

### Étape 4 : Neutraliser `rank * 5`

**Quoi** :
1. Ajouter `@deprecated` JSDoc sur `TalentCostCalculator` et ses méthodes
2. Ajouter un `logger.deprecated()` dans `#calculateTrainCost()` et `#calculateForgetCost()`
3. Ajouter un guard optionnel via `CONFIG.SWERPG.deprecation.crucible.rankTimes5.enabled`
4. Mettre à jour les tests pour vérifier le warning de dépréciation

**Fichiers** :
- `module/lib/talents/talent-cost-calculator.mjs` — modification
- `tests/lib/talents/talent-cost-calculator.test.mjs` — modification

**Risque** : Faible — la logique continue de fonctionner, seul un warning est émis.

### Étape 5 : Neutraliser `isCreation` (périmètre talents uniquement)

**Quoi** :
1. Ajouter `@deprecated` JSDoc sur le paramètre `isCreation` de `Talent` et `TalentFactory`
2. Ajouter `logger.deprecated()` dans `TalentFactory.build()` quand un talent est construit avec `isCreation`
3. Ajouter un commentaire « héritée Crucible — ne pas utiliser pour V1 » en tête de `talent-factory.mjs`
4. Mettre à jour les tests talents pour vérifier le warning

**Fichiers** :
- `module/lib/talents/talent.mjs` — modification
- `module/lib/talents/talent-factory.mjs` — modification
- `module/lib/talents/trained-talent.mjs` — modification
- `module/lib/talents/ranked-trained-talent.mjs` — modification
- `tests/lib/talents/talent-factory.test.mjs` — modification
- `tests/lib/talents/talent-cost-calculator.test.mjs` — modification

**Risque** : Moyen — les tests skills utilisent aussi `isCreation` mais dans une factory différente (`SkillFactory`). On ne touche pas aux skills.

### Étape 6 : Neutraliser `talentPoints` (actor.points.talent)

**Quoi** :
1. Ajouter `@deprecated` JSDoc sur `SwerpgTalent.assertPrerequisites()` — signaler que cette méthode utilise les talent points Crucible
2. Ajouter un `logger.deprecated()` dans `assertPrerequisites()` quand elle est appelée
3. Vérifier que `levelUp()` dans `actor.mjs:211` ne bloque pas les personnages V1 (la vérification `points.talent.available` est déjà conditionnée par `this.isL0`)

**Fichiers** :
- `module/models/talent.mjs` — modification
- `module/models/talent-orig.mjs` — modification (même logique)

**Risque** : Faible — `assertPrerequisites()` n'est appelée que par `addTalent()` (legacy canvas). La V1 ne passe pas par là.

### Étape 7 : Neutraliser l'arbre global Crucible

**Quoi** :
1. Ajouter un en-tête de commentaire en haut de `module/config/talent-tree.mjs` : « Ce fichier définit l'arbre global hérité de Crucible. Ne pas ajouter de nouveaux nœuds. Utiliser specialization-tree pour les arbres V1. »
2. Ajouter `@deprecated` JSDoc sur `SwerpgTalentNode` et ses méthodes principales
3. Ajouter `logger.deprecated()` dans `SwerpgTalentNode.getNodes()` et `SwerpgTalentNode.preparePrerequisites()`

**Fichiers** :
- `module/config/talent-tree.mjs` — modification

**Risque** : Faible — la structure est encore utilisée par les talents existants. Ne pas désactiver, juste marquer.

### Étape 8 : Neutraliser la `choice wheel`

**Quoi** :
1. Ajouter un en-tête de commentaire dans `module/canvas/talent-choice-wheel.mjs` et `module/canvas/talent-tree-talent.mjs`
2. Dans `talent-tree-talent.mjs:#onClickLeft`, ajouter un guard qui vérifie si une spécialisation V1 est présente sur l'acteur. Si oui, afficher une notification redirigeant vers la vue graphique V1 et ne pas appeler `addTalent()`.
3. Marquer `@deprecated` sur `SwerpgTalentChoiceWheel`

**Fichiers** :
- `module/canvas/talent-choice-wheel.mjs` — modification
- `module/canvas/talent-tree-talent.mjs` — modification

**Risque** : Moyen — des personnages peuvent encore utiliser le canvas legacy. Le guard ne bloque que si l'acteur a des spécialisations V1.

### Étape 9 : Neutraliser l'achat direct de talent générique

**Quoi** :
1. Ajouter `@deprecated` JSDoc sur `addTalent()` et `addTalentWithXpCheck()` dans `actor-mixins/talents.mjs`
2. Ajouter `logger.deprecated()` dans `addTalent()` quand elle est appelée
3. Supprimer `addTalentWithXpCheck()` (code mort non appelé)
4. Marquer tout le bloc « talent purchase » comme hérité Crucible

**Fichiers** :
- `module/documents/actor-mixins/talents.mjs` — modification
- `tests/documents/actor-creation.test.mjs` — vérifier qu'aucun test ne dépend de `addTalentWithXpCheck()`

**Risque** : Faible pour `addTalentWithXpCheck()` (code mort). Moyen pour `addTalent()` car utilisé par le canvas legacy (neutralisé à l'étape 8).

### Étape 10 : Mettre à jour les tests

**Quoi** :
1. Dans les tests talents existants qui utilisent `isCreation`, vérifier que le warning de dépréciation apparaît
2. Ajouter un test vérifiant que `talent-node-purchase.mjs` n'émet AUCUN warning de dépréciation Crucible
3. Ajouter un test par logique vérifiant que le guard `CONFIG.SWERPG.deprecation.crucible.X.enabled = false` désactive la logique

**Fichiers** :
- `tests/lib/talents/talent-factory.test.mjs` — modification
- `tests/lib/talents/talent-cost-calculator.test.mjs` — modification
- `tests/lib/talent-node/talent-node-purchase.test.mjs` — ajout d'un test de non-régression
- `tests/deprecation/crucible-neutralization.test.mjs` — création

**Risque** : Standard.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/config/system.mjs` | Modification | Ajout de `CONFIG.SWERPG.deprecation.crucible` avec les 6 flags |
| `module/utils/logger.mjs` | Modification | Ajout de `logger.deprecated(module, feature, suggestion)` |
| `module/lib/talents/talent-cost-calculator.mjs` | Modification | `@deprecated` JSDoc + `logger.deprecated()` + guard flag |
| `module/lib/talents/talent.mjs` | Modification | `@deprecated` JSDoc sur `isCreation` param |
| `module/lib/talents/talent-factory.mjs` | Modification | `@deprecated` en-tête + `logger.deprecated()` + guard flag |
| `module/lib/talents/trained-talent.mjs` | Modification | `@deprecated` en-tête |
| `module/lib/talents/ranked-trained-talent.mjs` | Modification | `@deprecated` en-tête |
| `module/lib/talents/error-talent.mjs` | Modification | `@deprecated` en-tête |
| `module/models/talent.mjs` | Modification | `@deprecated` sur `assertPrerequisites()` + `logger.deprecated()` |
| `module/models/talent-orig.mjs` | Modification | `@deprecated` sur `assertPrerequisites()` |
| `module/config/talent-tree.mjs` | Modification | En-tête legacy + `@deprecated` sur `SwerpgTalentNode` + `logger.deprecated()` |
| `module/canvas/talent-choice-wheel.mjs` | Modification | En-tête legacy + `@deprecated` |
| `module/canvas/talent-tree-talent.mjs` | Modification | Guard V1 dans `#onClickLeft` + notification |
| `module/documents/actor-mixins/talents.mjs` | Modification | `@deprecated` + `logger.deprecated()` sur `addTalent()` ; suppression de `addTalentWithXpCheck()` |
| `documentation/cadrage/character-sheet/talent/07-plan-issues-github.md` | Modification | Marquage US21 comme livrée |
| `tests/lib/talents/talent-factory.test.mjs` | Modification | Vérification warning dépréciation |
| `tests/lib/talents/talent-cost-calculator.test.mjs` | Modification | Vérification warning dépréciation |
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | Modification | Test non-régression V1 sans warning Crucible |
| `tests/deprecation/crucible-neutralization.test.mjs` | Création | Tests par logique : flag enabled/disabled, warning émis |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Un module inconnu dépend encore d'une logique Crucible** | Warning inattendu, comportement modifié | Audit préalable (étape 1). Tous les appels ont été tracés. Si un nouveau chemin est découvert, le warning le signalera immédiatement dans les logs. |
| **`addTalent()` est encore utilisé par un module non-couvrant** | L'achat de talent plante | Le guard dans `talent-tree-talent.mjs` ne désactive que si l'acteur a des spécialisations V1. Les personnages sans spécialisation V1 continuent de passer par l'ancien flux. |
| **`levelUp()` bloque les personnages V1** | Impossibilité de monter de niveau | La vérification `points.talent.available` dans `levelUp()` (actor.mjs:211) n'est exécutée que si `this.isL0`. Un personnage V1 qui a déjà commencé sa progression ne sera pas bloqué. |
| **Tests flaky à cause des warnings de dépréciation** | Tests qui échouent inopinément | Les tests qui vérifient l'absence de warning doivent utiliser `CONFIG.SWERPG.deprecation.crucible.X.enabled = false` pour désactiver le warning. |
| **Suppression de `addTalentWithXpCheck()` cassant un import** | Erreur à l'import OggDude | Vérification préalable : aucun import n'appelle `addTalentWithXpCheck()`. Seul `purchaseTalentNode()` est utilisé par l'importer. |
| **Fausse alerte de dépréciation pendant les tests d'intégration** | Bruit dans les logs de test | Les tests d'intégration qui utilisent intentionnellement les chemins legacy doivent activer le flag `warn: false` ou `enabled: false` pour éviter le bruit. |

---

## 8. Proposition d'ordre de commit

1. `chore(config): add deprecation flags to CONFIG.SWERPG.deprecation.crucible`
   - Ajout des 6 flags dans `module/config/system.mjs`
2. `feat(logger): add logger.deprecated() helper method`
   - Ajout dans `module/utils/logger.mjs`
3. `deprecate(talents): mark rank * 5 cost calculation as deprecated`
   - `talent-cost-calculator.mjs` : JSDoc + logger.deprecated() + guard flag
4. `deprecate(talents): mark isCreation parameter as deprecated (talent scope)`
   - `talent.mjs`, `talent-factory.mjs`, `trained-talent.mjs`, `ranked-trained-talent.mjs`, `error-talent.mjs`
5. `deprecate(talents): mark talentPoints (actor.points.talent) as deprecated`
   - `models/talent.mjs`, `models/talent-orig.mjs`
6. `deprecate(talents): mark global Crucible tree as deprecated`
   - `config/talent-tree.mjs`
7. `deprecate(talents): neutralize choice wheel and legacy canvas purchase path`
   - `canvas/talent-choice-wheel.mjs`, `canvas/talent-tree-talent.mjs`
8. `deprecate(talents): neutralize addTalent() and remove dead code addTalentWithXpCheck()`
   - `actor-mixins/talents.mjs`
9. `test(talents): add deprecation warning tests for all 6 Crucible logics`
   - Tests dans `tests/lib/talents/` et `tests/deprecation/crucible-neutralization.test.mjs`
10. `test(talents): verify V1 purchase flow emits no Crucible deprecation warnings`
    - Test dans `tests/lib/talent-node/talent-node-purchase.test.mjs`
11. `docs(talents): update issue plan and document US21 as delivered`
    - `documentation/cadrage/character-sheet/talent/07-plan-issues-github.md`

---

## 9. Dépendances avec les autres US

```
Epic #184 — Refonte V1 des talents Edge
├── US1 #185 — Définir le type specialization-tree      → CLOSED
├── US2 #186 — Définir la structure des nœuds            → CLOSED
├── US3 #187 — Définir les achats de nœuds sur l'acteur  → CLOSED
├── US4 #188 — Résoudre spécialisation → arbre           → CLOSED
├── US5 #189 — Calculer l'état des nœuds                 → CLOSED
├── US6 #190 — Implémenter l'achat d'un nœud             → CLOSED (dépend bloquante)
├── US7 #191 — Consolider les talents possédés           → CLOSED (dépend bloquante)
├── US8–US17 — US intermédiaires                         → CLOSED
├── US18 #202 — Acheter un nœud depuis la vue graphique  → CLOSED (dépend bloquante)
├── US21 #205 — Neutraliser les anciennes logiques Crucible ← VOUS ÊTES ICI
└── US suivantes — Nettoyage final, suppression du code legacy
```

**Dépendances bloquantes** : US6 (#190), US7 (#191), US18 (#202) doivent être livrés AVANT US21. Ces 3 US sont CLOSED, la dépendance est levée.

**Ordre conseillé** : US21 doit être la dernière US de l'EPIC avant la phase de nettoyage final (suppression physique du code legacy). Toutes les autres US doivent être livrées pour garantir que le flux V1 est complet et peut être testé sans régression.
