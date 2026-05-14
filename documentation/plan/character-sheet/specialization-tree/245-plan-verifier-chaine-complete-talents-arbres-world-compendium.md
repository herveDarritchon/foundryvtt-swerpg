# Plan d'implémentation — #245 : Vérifier la chaîne complète talents et arbres en world et en compendium

**Issue** : [#245 — Vérifier la chaîne complète talents et arbres en world et en compendium](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/245)  
**Bloqué par** : [#243](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/243), [#244](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/244)  
**ADR principale** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`  
**ADRs complémentaires** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`, `tests/applications/specialization-tree-app.test.mjs`, potentiellement `tests/helpers/mock-foundry.mjs` et `tests/helpers/mock-foundry.test.mjs`

---

## 1. Objectif

Valider de bout en bout que la chaîne :

`talent référentiel` -> `talentUuid` importé dans les nœuds -> résolution du document Foundry -> affichage UI

fonctionne correctement dans les deux contextes suivants :

- **world items**
- **compendium items**

Le ticket porte sur une preuve d'intégration démontrable. Le besoin principal n'est plus d'introduire un nouveau contrat, mais de prouver que le contrat livré par #243 et consommé par #244 tient réellement en chaîne complète.

---

## 2. Périmètre

### Inclus dans ce ticket

- Ajouter un scénario automatisé complet pour world items.
- Ajouter un scénario automatisé complet pour compendium items.
- Vérifier la forme exacte de l'UUID Foundry réutilisé dans les nœuds.
- Vérifier que l'UI affiche le talent attendu sans retomber sur `Unknown talent`.
- Consolider les mocks de compendium si nécessaire pour refléter le vrai contrat utilisé par le code.

### Exclu de ce ticket

- Nouvelle évolution du contrat métier `talentId` / `talentUuid`.
- Refonte de l'importer OggDude.
- Refonte de l'application `specialization-tree-app`.
- Migration de données historiques.
- Ajout de tests Playwright sauf besoin explicite de validation navigateur réelle.

---

## 3. Constat sur l'existant

### 3.1. Les tickets bloquants semblent déjà intégrés

Le code lu montre que :

- `module/importer/items/specialization-tree-ogg-dude.mjs` construit déjà un index de talents world + compendium.
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` persiste déjà `talentUuid` dans chaque nœud.
- `module/applications/specialization-tree-app.mjs` résout déjà `talentUuid` en priorité et ne traite plus `talentId` comme UUID nominal.

### 3.2. La couverture actuelle est fragmentée

Les tests actuels couvrent des morceaux isolés :

- enrichissement `talentUuid` dans le mapper ;
- résolution UI via `resolveTalentDetail()` ;
- rendu avec des nœuds déjà fournis.

Mais ils ne démontrent pas une chaîne complète unique allant de l'import des talents/arbre jusqu'au rendu UI final.

### 3.3. Le cas compendium n'est pas suffisamment prouvé en chaîne complète

Aucun scénario de test ne vérifie explicitement :

- la construction de `Compendium.<collection>.<id>` ;
- sa persistance dans `node.talentUuid` ;
- sa réutilisation effective dans le rendu UI.

### 3.4. Les helpers de mock peuvent être trop faibles pour ce besoin

Le helper `tests/helpers/mock-foundry.mjs` expose bien `game.packs`, mais sa forme actuelle ne reflète pas complètement ce que le code de prod parcourt :

- `pack.documentName`
- `pack.collection`
- `pack.index.size`
- `pack.index.values()`

Pour un test compendium fiable, il faudra soit enrichir ce helper, soit créer localement un mock plus fidèle.

---

## 4. Décisions d'architecture

### 4.1. Utiliser des tests d'intégration Vitest plutôt qu'une démo manuelle seule

**Décision** : couvrir #245 principalement par des tests d'intégration Vitest.

**Justification** :
- conforme ADR-0004.
- démonstration reproductible en CI.
- plus robuste qu'une validation manuelle seule.

### 4.2. Tester la chaîne complète dans un scénario unique par contexte

**Décision** : écrire deux scénarios nominaux complets : world et compendium.

**Justification** :
- correspond exactement aux critères d'acceptation.
- évite une couverture dispersée difficile à relire.

### 4.3. Réutiliser les modules réels plutôt que sur-mocker la logique métier

**Décision** : chaîner les vraies fonctions déjà en place :

- `buildTalentIndex()`, `buildTalentByIdFromWorld()`, `buildTalentByIdFromCompendium()` de l'importer.
- `specializationTreeMapper()`.
- `buildSpecializationTreeContext()` de l'application UI.

**Justification** :
- meilleure preuve d'intégration.
- limite les faux positifs dus à des mocks trop éloignés du runtime réel.

### 4.4. Garder les assertions ciblées

**Décision** : vérifier des valeurs métier simples :

- `node.talentId`
- `node.talentUuid`
- `renderNode.talentName`
- absence de `Unknown talent`

**Justification** :
- conforme ADR-0012.
- diagnostics plus lisibles.

### 4.5. Ne modifier le code métier que si le test révèle une vraie rupture

**Décision** : ce ticket doit rester orienté validation. Toute modification de prod doit être justifiée par un échec réel découvert pendant la mise en place des scénarios.

**Justification** :
- le besoin exprimé est une vérification E2E, pas une nouvelle feature.
- minimise le risque de régression.

---

## 5. Plan de travail détaillé

### Étape 1 — Définir le scénario world nominal

**À faire**

- Préparer un talent world avec :
  - `type: 'talent'`
  - `system.id` renseigné
  - `system.uuid` renseigné
  - `uuid` renseigné
- Importer ou mapper un arbre contenant un nœud pointant vers ce talent via `talentId`.
- Vérifier que le mapper enrichit le nœud avec `talentUuid = Item.<id>`.
- Construire ensuite un acteur et un arbre résolu côté UI.
- Vérifier que `buildSpecializationTreeContext()` affiche le vrai nom du talent.

**Fichiers**
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- potentiellement `tests/applications/specialization-tree-app.test.mjs`

**Risques**
- scénario trop artificiel s'il ne réutilise pas un flux déjà présent dans les tests de fixture.

---

### Étape 2 — Définir le scénario compendium nominal

**À faire**

- Préparer un pack compendium mocké avec :
  - `documentName: 'Item'`
  - `collection`
  - `index` compatible `Map`
  - entrée talent avec `_id`, `type`, `system.id`, `system.isRanked`, `flags.swerpg`
- Vérifier que `buildTalentByIdFromCompendium()` génère un UUID de forme `Compendium.<collection>.<entryId>`.
- Mapper un arbre et vérifier que `node.talentUuid` reprend exactement cette valeur.
- Vérifier ensuite que l'UI résout ce `talentUuid` et affiche le bon talent.

**Fichiers**
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- potentiellement `tests/helpers/mock-foundry.mjs`
- potentiellement `tests/helpers/mock-foundry.test.mjs`

**Risques**
- mock compendium insuffisamment fidèle au runtime Foundry.
- confusion entre format attendu par l'importer et format attendu par l'UI.

---

### Étape 3 — Consolider les helpers de mock si nécessaire

**À faire**

- Soit enrichir `addPacksMock()` pour produire des packs compatibles avec le code réel (`documentName`, `collection`, `index` en `Map`).
- Soit garder un mock local dédié dans le test si l'évolution du helper n'apporte pas de valeur réutilisable.

**Fichiers**
- `tests/helpers/mock-foundry.mjs`
- `tests/helpers/mock-foundry.test.mjs`

**Risques**
- introduire un helper trop générique pour un besoin très local.
- casser des tests existants si le contrat du helper change.

---

### Étape 4 — Ajouter les assertions UI finales

**À faire**

Pour chaque contexte :

- vérifier que `renderNodes` contient le nœud attendu.
- vérifier que `renderNodes[i].talentName` correspond au vrai talent.
- vérifier que `renderNodes[i].talentName !== 'Unknown talent'`.
- vérifier que la résolution passe par la donnée enrichie attendue.

**Fichiers**
- `tests/applications/specialization-tree-app.test.mjs`
- ou scénario transversal centralisé dans `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`

**Risques**
- dupliquer inutilement des cas déjà couverts.
- disperser la lecture entre trop de fichiers.

---

### Étape 5 — Ajouter une preuve explicite de non-régression sur la séparation métier/technique

**À faire**

- vérifier que `talentId` reste la clé métier stable.
- vérifier que `talentUuid` est la référence technique réutilisée telle quelle.
- vérifier que la couche UI affiche le talent résolu sans réinterpréter `talentId` comme UUID nominal.

**Fichiers**
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- `tests/applications/specialization-tree-app.test.mjs`

**Risques**
- assertions trop couplées à l'implémentation interne au lieu du contrat observable.

---

### Étape 6 — Validation finale

**À faire**

- exécuter les tests ciblés sur importer, application et helpers.
- confirmer que les deux scénarios passent.
- vérifier que les messages d'échec restent lisibles.

**Commande cible**
- `pnpm vitest tests/importer/specialization-tree-ogg-dude.integration.spec.mjs tests/applications/specialization-tree-app.test.mjs`

**Risques**
- besoin d'ajuster les mocks Foundry globaux.
- flakiness si un test repose trop sur un état global partagé.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` | modification | Ajouter les scénarios complets world et compendium |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Compléter la preuve d'affichage final côté UI si nécessaire |
| `tests/helpers/mock-foundry.mjs` | modification potentielle | Rendre le mock compendium compatible avec `documentName`, `collection`, `index: Map` |
| `tests/helpers/mock-foundry.test.mjs` | modification potentielle | Cadrer le nouveau contrat du helper si celui-ci évolue |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le test compendium repose sur un mock irréaliste | faux positif | aligner le mock sur `pack.collection`, `pack.documentName`, `pack.index.values()` |
| La couverture reste fragmentée entre importer et UI | preuve incomplète | ajouter au moins un scénario transversal lisible par contexte |
| Les tests vérifient trop de structure | diagnostics médiocres | assertions ciblées sur UUID, nom affiché, absence de `Unknown talent` |
| Le ticket dérive vers une refonte métier | scope creep | limiter les changements prod à une correction révélée par les tests |
| État global Foundry partagé entre tests | intermittence | reset strict des mocks entre scénarios |
| `buildTalentByIdFromWorld()` et `buildTalentByIdFromCompendium()` ne sont pas exportées dans les tests | blocage | les exporter depuis `specialization-tree-ogg-dude.mjs` (elles sont déjà dans le bloc `export { ... }`) |

---

## 8. Proposition d'ordre de commit

1. `test(importer): add end-to-end world and compendium specialization tree talent resolution scenarios`
2. `test(foundry): improve compendium pack mocks for specialization tree resolution`
3. `test(ui): verify specialization tree renders resolved talents in both contexts`

---

## 9. Dépendances avec les autres US

- `#243` doit rester la source de vérité pour l'enrichissement `talentUuid` à l'import.
- `#244` doit rester la source de vérité pour la consommation UI de `talentUuid`.
- `#245` vient valider l'intégration entre ces deux tickets, pas redéfinir leur responsabilité.

## Recommandation

Le chemin le plus propre est :

1. étendre `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` avec deux vrais scénarios transversaux.
2. n'ajuster `tests/applications/specialization-tree-app.test.mjs` que si une preuve UI complémentaire manque encore.
3. ne toucher au code de production qu'en cas d'échec réel mis en évidence par ces scénarios.
