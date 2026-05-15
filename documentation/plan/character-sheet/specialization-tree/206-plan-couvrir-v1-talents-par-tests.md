# Plan d'implémentation — US22 : Couvrir la V1 Talents par des tests

**Issue** : [#206 — US22: Couvrir la V1 Talents par des tests](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/206)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Plans de référence** : `documentation/plan/character-sheet/specialization-tree/203-plan-synchroniser-achat-arbre-onglet-talents.md` (US19), `documentation/plan/character-sheet/specialization-tree/204-plan-operation-audit-log-achat-noeud.md` (US20)
**Module(s) impacté(s)** : aucun — uniquement `tests/` et `documentation/tests/`

---

## 1. Objectif

Couvrir les règles critiques de la V1 Talents — achat, consolidation, synchronisation, états des nœuds, résilience — par des tests automatisés Vitest, et documenter les scénarios de test manuel spécifiques au flux V1 (spécialisation-tree, vue consolidée, données dégradées).

Le socle métier V1 est déjà livré et partiellement testé. US22 consolide la couverture là où elle est lacunaire, sans modifier le code métier dans `module/`.

---

## 2. Périmètre

### Inclus dans ce ticket

- Ajout de tests Vitest automatisés pour les scénarios critiques non encore couverts :
  - achat d'un nœud ranked, vérification du rang consolidé via `buildOwnedTalentSummary` après `purchaseTalentNode`
  - achat d'un nœud non-ranked dans deux arbres → déduplication + sources multiples
  - chaîne complète achat → vue consolidée → audit (test d'intégration unique)
  - états des nœuds : purchased, available, locked, invalid avec raisons de blocage explicites
  - récupération de `talentPurchases` absent sur l'acteur (graceful degradation)
  - arbre introuvable / incomplet côté état des nœuds et côté résolution
  - données OggDude incomplètes (import flags `incomplete` / `unresolved`)
  - spécialisation possédée sans arbre résolu
- Mise à jour de la documentation de tests manuels :
  - `documentation/tests/manuel/talents/README.md` — ajouter les scénarios V1 (spécialisation-tree, vue consolidée, cas dégradés)
  - `documentation/tests/manuel/audit-log/README.md` — ajouter un scénario `talent-node-purchase`
- Vérification que tous les tests existants passent avant validation

### Exclu de ce ticket

- Modification du code métier dans `module/` — aucuns changements dans `module/lib/talent-node/`, `module/applications/` ni ailleurs
- Tests E2E Playwright pour les talents V1
- Migration des tests legacy (Crucible) vers le nouveau système
- Nouveau fichier de tests manuels dédié « V1 Talents » — les scénarios sont ajoutés dans les fichiers existants
- Tests de performance ou de charge

---

## 3. Constat sur l'existant

### 3.1. Le socle métier V1 est livré et partiellement testé

| Règle | Test existant | Statut |
|-------|---------------|--------|
| Achat nœud `available` | `talent-node-purchase.test.mjs` — root node success | ✅ |
| Achat nœud `locked` | `talent-node-purchase.test.mjs` — locked node error | ✅ |
| Achat nœud `invalid` | `talent-node-state.test.mjs` — invalid states (missing fields, tree incomplete, flags) | ✅ |
| Achat XP insuffisant | `talent-node-purchase.test.mjs` — NOT_ENOUGH_XP | ✅ |
| Achat sans spécialisation | `talent-node-purchase.test.mjs` — SPECIALIZATION_NOT_OWNED | ✅ |
| États purchased / available / locked / invalid | `talent-node-state.test.mjs` — 27 tests couvrant tous les codes raison | ✅ |
| Raisons de blocage exploitables | `REASON_CODE` constants et `reason` textuelle dans chaque résultat | ✅ |
| Ranked consolidé (deux arbres → rang 2) | `owned-talent-summary.test.mjs` — ranked purchase grouped | ✅ |
| Non-ranked dédupliqué (deux arbres → une entrée, deux sources) | `owned-talent-summary.test.mjs` — deduplication test | ✅ |
| Résolution d'arbre spécialisation | `talent-tree-resolver.test.mjs` — résolution par uuid, specializationId, nom, fallback | ✅ |
| Vue consolidée sans doublon | `character-sheet-talents.test.mjs` — dedup source labels | ✅ |
| Audit `talent-node-purchase` émis | `talent-node-purchase.test.mjs` — `recordTalentNodePurchase` appelé | ✅ |
| Audit non-bloquant si échec écriture | `talent-node-purchase.test.mjs` — audit fail ne bloque pas l'achat | ✅ |
| Contrat de l'entrée audit | `audit-log.test.mjs` — `recordTalentNodePurchase` 4 tests | ✅ |
| Synchronisation purchase → vue consolidée | `actor-synchronization.test.mjs` — purchase puis summary séparés | ⚠️ Vue consolidée testée en isolation, pas dans la même fonction que l'achat |
| Vue graphique refresh après achat | `actor.mjs:_onUpdate()` + `specialization-tree-app.test.mjs` | ✅ |
| Résolution talents par `talentUuid` prioritaire | `specialization-tree-app.test.mjs` — resolveTalentDetail | ✅ |

### 3.2. Gaps identifiés

**Gap 1 — Pas de test d'intégration chaîne complète.** Les tests existants vérifient chaque brique isolément. Aucun test ne simule un achat complet suivi de la vérification consolidée dans la même procédure.

**Gap 2 — Pas de test pour `actor.system.progression.talentPurchases` absent.** `purchaseTalentNode` a un test pour le cas où `progression` est absent (XP fails). Mais `getNodeState` a un test pour `talentPurchases` absent → available. La couverture est bonne mais mérite une vérification systématique.

**Gap 3 — Pas de test pour le cas `talentPurchases` contient des entrées avec des `specializationId` non possédées.** Testé indirectement via `buildOwnedTalentSummary` (specialization-not-found resolutionState = tree-unresolved), mais pas via `purchaseTalentNode` dans son état initial.

**Gap 4 — Documentation manuelle V1 incomplète.** `documentation/tests/manuel/talents/README.md` décrit uniquement le flux legacy Crucible (canvas PIXI, roue de choix). Le flux V1 (spécialisation-tree-app, vue consolidée, audit) n'a pas de scénarios manuels dédiés.

**Gap 5 — Pas de scénarios manuels pour données dégradées.** Arbre introuvable, données OggDude incomplètes, spécialisation sans arbre résolu ne sont pas documentés.

### 3.3. Conventions de test en place

- Tous les tests Vitest mockent `module/utils/logger.mjs` avec `vi.mock`
- Les tests de `talent-node-purchase` et `actor-synchronization` mockent `recordTalentNodePurchase` et `resolveSpecializationTree`
- Les tests de `owned-talent-summary` mockent `resolveSpecializationTree` (appelé par `resolveTreeCached`)
- Le setup global (`tests/setup.mjs`, `tests/vitest-setup.js`) fournit les mocks Foundry (ADR-0004)
- Les assertions suivent ADR-0012 : assertions ciblées, messages explicites, extraction de valeurs utiles

---

## 4. Décisions d'architecture

### 4.1. Aucune modification du code métier

**Décision** : Aucun fichier dans `module/` n'est modifié. L'US22 est un ticket de couverture de test uniquement.

Justification :
- Conforme à l'intitulé de l'issue (« couvrir la V1 Talents par des tests »)
- Le socle métier est déjà livré (US5 à US20) et stable
- Réduit le risque de régression

### 4.2. Nouveaux tests ajoutés dans les fichiers existants

**Décision** : Ajouter les tests manquants dans les fichiers Vitest existants plutôt que de créer de nouveaux fichiers.

Justification :
- Cohérence : `talent-node-purchase.test.mjs`, `owned-talent-summary.test.mjs`, `actor-synchronization.test.mjs` sont les fichiers naturels
- Pas de fragmentation de la couverture
- Les tests d'intégration chaîne complète atterrissent dans `actor-synchronization.test.mjs` (déjà conçu pour ça, voir plan US19)

### 4.3. Documentation manuelle dans les fichiers existants, pas de nouveau dossier

**Décision** : Mettre à jour `documentation/tests/manuel/talents/README.md` et `documentation/tests/manuel/audit-log/README.md` avec les scénarios V1, sans créer de nouveau dossier dédié.

Justification :
- L'écosystème documentaire est déjà organisé par domaine fonctionnel
- Un dossier séparé « talents-v1 » créerait de la confusion avec le dossier « talents » existant
- Les scénarios V1 s'intègrent naturellement dans le plan existant (sections 7 et 8 à ajouter)

### 4.4. Vérification préalable de l'état des tests existants

**Décision** : Avant d'ajouter des tests, lancer la suite existante et corriger les échecs éventuels (mocks, setup).

Justification :
- Évite d'ajouter des tests sur une base rouge
- Conforme à la pratique standard du projet (ADR-0004)
- Les plans US1/TECH-audit-log et US19 ont montré que des échecs de tests existants sont possibles après des changements dans le code

---

## 5. Plan de travail détaillé

### Étape 1 — Vérifier que tous les tests talent existants passent

**Quoi** : Lancer les tests talent-node, owned-summary, actor-synchronization, state, tree-resolver, character-sheet-talents.

```bash
pnpm vitest run tests/lib/talent-node/ tests/unit/documents/actor-synchronization.test.mjs tests/applications/sheets/character-sheet-talents.test.mjs tests/applications/specialization-tree-app.test.mjs
```

Analyser les résultats. Si des tests échouent :
- Investiguer (mock obsolète, régression code métier, assertion incorrecte)
- Ne corriger que le test ou le mock, pas le code métier
- Si régression code métier, documenter et reporter

**Fichiers** : aucun (commande seule)
**Risque** : Découverte de régressions non documentées.

### Étape 2 — Ajouter les tests manquants dans `talent-node-purchase.test.mjs`

**Quoi** : Ajouter des tests pour les scénarios de l'issue non encore couverts par ce fichier.

Tests à ajouter dans `describe('purchaseTalentNode')` :

1. **Achat ranked puis vérification rang consolidé** : après achat du même talent ranked dans deux arbres différents, vérifier que `buildOwnedTalentSummary` retourne `rank: 2`. Nécessite un mock actor avec deux spécialisations et deux purchases distincts. Appeler `buildOwnedTalentSummary` directement après le second achat simulé.

2. **Achat non-ranked déjà possédé ailleurs** : vérifier déduplication via `buildOwnedTalentSummary` après achat du même talent non-ranked dans deux arbres. Vérifier `rank: null` et `sources.length === 2`.

**Fichiers** : `tests/lib/talent-node/talent-node-purchase.test.mjs` (modification)
**Risque** : Faible — suit le pattern existant des helpers `buildActor()` et `buildResolvedTree()`.

### Étape 3 — Ajouter les tests d'intégration chaîne complète dans `actor-synchronization.test.mjs`

**Quoi** : Ajouter un test unique qui enchaîne :
1. Création d'un mock actor avec deux spécialisations
2. Achat `purchaseTalentNode()` du nœud r1c1 (talent ranked)
3. Vérification que `buildOwnedTalentSummary()` retourne 1 entrée avec rang 1
4. Achat du même talent ranked dans la seconde spécialisation
5. Vérification que `buildOwnedTalentSummary()` retourne 1 entrée avec rang 2 et 2 sources
6. Vérification que l'audit a été appelé 2 fois avec les bonnes données

Tests supplémentaires :
- Achat d'un talent non-ranked dans deux arbres → 1 entrée, 2 sources, rang null
- Achat avec `talentPurchases` absent (graceful)

**Fichiers** : `tests/unit/documents/actor-synchronization.test.mjs` (modification)
**Risque** : Mock trop complexe à cause des appels imbriqués à `resolveSpecializationTree`. Utiliser `mockImplementation()` (déjà fait dans les tests existants).

### Étape 4 — Vérifier la couverture des états de nœuds

**Quoi** : Lire la liste complète des tests dans `talent-node-state.test.mjs` et vérifier que chaque combinaison est couverte :

- [x] purchased (purchase matching entry) → déjà testé
- [x] available (root node, enough XP) → déjà testé
- [x] available (node unlocked by purchased predecessor) → déjà testé
- [x] locked (non-root sans predecessor acheté) → déjà testé
- [x] locked (XP insuffisant) → déjà testé
- [x] invalid (specialization not owned) → déjà testé
- [x] invalid (tree null) → déjà testé
- [x] invalid (tree sans nodes) → déjà testé
- [x] invalid (tree sans connections) → déjà testé
- [x] invalid (node not found) → déjà testé
- [x] invalid (node sans row) → déjà testé
- [x] invalid (node sans cost) → déjà testé
- [x] invalid (unknown placeholder talentId) → déjà testé
- [x] invalid (import flags incomplete / unresolved) → déjà testé
- [x] invalid (actor null, specializationId missing) → déjà testé
- [x] getTreeNodesStates → déjà testé

Pas de nouveaux tests nécessaires pour cette section. Si l'étape 1 révèle un échec, corriger.

**Fichiers** : aucun (vérification uniquement)
**Risque** : Aucun.

### Étape 5 — Vérifier la couverture de la résolution d'arbre

**Quoi** : Lire la liste des tests dans `talent-tree-resolver.test.mjs` :

- [x] Résolution par uuid valide → testé
- [x] Fallback par specializationId → testé
- [x] Résolution sans identifiants → testé
- [x] game not ready → testé
- [x] Tree incomplete (sans nodes) → testé
- [x] résolution toutes les spécialisations → testé
- [x] getSpecializationTreeResolutionState → testé
- [x] normalizeActorSpecializations → testé
- [x] findTreeForSpecialization → testé (match name slug, exact name, null)

Pas de nouveaux tests nécessaires.

**Fichiers** : aucun (vérification uniquement)
**Risque** : Aucun.

### Étape 6 — Mettre à jour `documentation/tests/manuel/talents/README.md`

**Quoi** : Ajouter deux nouvelles sections à la fin du fichier :

**Section 7 — Spécialisation-tree V1 (application graphique dédiée)**

Scénarios :
- Ouvrir l'arbre de spécialisation depuis le bouton de la fiche
- Sélectionner une spécialisation parmi celles possédées
- Acheter un nœud available → nœud passe en purchased, XP déduite
- Acheter un nœud locked → blocage, message de raison (ex: prérequis manquant, XP insuffisant)
- Acheter un nœud invalid → blocage (arbre incomplet, données manquantes)
- Rafraîchissement de la vue graphique après achat

**Section 8 — Vue consolidée (onglet Talents)**

Scénarios :
- Achat reflété dans l'onglet Talents après retour sur la fiche
- Rang consolidé pour un talent ranked possédé dans deux arbres
- Sources listées pour un talent non-ranked dans deux arbres
- Talents sans définition (Unknown) affichés avec l'état dégradé

**Section 9 — Données dégradées V1**

Scénarios :
- Personnage avec une seule spécialisation
- Personnage avec plusieurs spécialisations
- Arbre introuvable (treeUuid invalide, specialisationId inconnu)
- Arbre incomplet (import OggDude partiel — nodes vides, connections vides)
- Données OggDude avec flags `incomplete` / `unresolved`

**Fichiers** : `documentation/tests/manuel/talents/README.md` (modification)
**Risque** : Faible — simple ajout documentaire.

### Étape 7 — Mettre à jour `documentation/tests/manuel/audit-log/README.md`

**Quoi** : Ajouter un sous-scénario dans la section 7 (ou une section 7.3) pour l'achat V1 :

**7.3. Achat de nœud d'arbre (talent-node-purchase)**

| Action | Résultat attendu |
|--------|------------------|
| Acheter un nœud dans l'arbre de spécialisation | Une entrée `talent-node-purchase` est créée |
| Vérifier les champs : `specializationId`, `treeId`, `nodeId`, `talentId`, `cost`, `source: 'specialization-tree'` | Les données correspondent à l'achat effectué |
| Vérifier `xpDelta` = -cost | Le delta est négatif (dépense) |
| Vérifier `previousXp` et `nextXp` | Les valeurs XP avant/après sont correctes |

**Fichiers** : `documentation/tests/manuel/audit-log/README.md` (modification)
**Risque** : Faible.

### Étape 8 — Vérification finale

**Quoi** :
1. Lancer toute la suite talent : `pnpm vitest run tests/lib/talent-node/ tests/unit/documents/actor-synchronization.test.mjs tests/applications/sheets/character-sheet-talents.test.mjs`
2. Vérifier que tous les tests passent (étape 1 + nouveaux tests)
3. Vérifier la cohérence de la documentation manuelle

**Fichiers** : aucun (validation)
**Risque** : Si échec, revenir à l'étape 1.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | Modification | Ajout des tests achat ranked + non-ranked avec consolidation via `buildOwnedTalentSummary` |
| `tests/unit/documents/actor-synchronization.test.mjs` | Modification | Ajout du test chaîne complète purchase → consolidated → audit (2 arbres, ranked/non-ranked, graceful) |
| `documentation/tests/manuel/talents/README.md` | Modification | Ajout sections 7, 8, 9 : scénarios V1 spécialisation-tree, vue consolidée, données dégradées |
| `documentation/tests/manuel/audit-log/README.md` | Modification | Ajout scénario 7.3 : achat nœud d'arbre (`talent-node-purchase`) |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Tests existants qui échouent** (mock obsolète, régression code métier, setup) | Bloquant pour l'étape 1 | Debug du test ou du mock. Si régression code métier, documenter et reporter sans corriger. |
| **Mock trop complexe pour le test chaîne complète** (appels imbriqués `resolveSpecializationTree` avec plusieurs spécialisations) | Test fragile ou non maintenable | S'inspirer du pattern `mockImplementation()` déjà utilisé dans `owned-talent-summary.test.mjs` (2 spécialisations mockées par condition) |
| **Documentation manuelle redondante** avec les scénarios existants | Duplication, désynchronisation | Référencer les sections existantes plutôt que de copier. Ajouter des scénarios, pas des doublons. |
| **Oubli de couvrir un cas dégradé** | Faux sentiment de sécurité | Lire la checklist de l'issue § « Scénarios manuels » et s'assurer que chaque cas est couvert soit par test automatisé, soit par scénario manuel. |

---

## 8. Proposition d'ordre de commit

1. `test(talent-node-purchase): add ranked/non-ranked consolidation via buildOwnedTalentSummary`
2. `test(actor-synchronization): add full-chain purchase→consolidated→audit integration test`
3. `docs(manual-tests): add V1 talent scenarios to talents README (tree, consolidated, degraded)`
4. `docs(manual-tests): add talent-node-purchase scenario to audit-log README`

---

## 9. Dépendances avec les autres US

US22 dépend des US suivantes (toutes livrées dans l'Epic #184) :

| US | Périmètre | Nature de la dépendance |
|----|-----------|------------------------|
| US5 (#189) | Calcul d'état des nœuds (`talent-node-state.mjs`) | Tests d'état déjà existants |
| US6 (#190) | Achat d'un nœud (`talent-node-purchase.mjs`) | Tests d'achat déjà existants |
| US7 (#191) | Consolidation des talents possédés (`owned-talent-summary.mjs`) | Tests de consolidation déjà existants |
| US8 (#192) | Gestion ranked / non-ranked / doublons | Tests de déduplication déjà existants |
| US11 (#195) | Données OggDude incomplètes | Scénarios manuels dégradés (étape 6) |
| US19 (#203) | Synchronisation achat → arbre → onglet Talents | Test chaîne complète (étape 3), scénarios manuels synchro |
| US20 (#204) | Audit log lors d'un achat | Scénario manuel audit `talent-node-purchase` (étape 7) |

Aucune dépendance descendante : US22 ne bloque aucune autre US.
