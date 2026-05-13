# Plan d'implémentation — US5 : Vérifier l'intégration Foundry après correction du mapper

**Issue** : [#222 — US5: Vérifier l'intégration Foundry après correction du mapper](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/222)
**Epic** : [#217 — EPIC: Fix OggDude Specialization Tree Import — Arbres de spécialisation vides](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
**Cadrage** : `documentation/cadrage/character-sheet/specialization-tree/fix-oggdude-specialization-tree-import-empty-nodes.md`
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`
**Module(s) impacté(s)** : `module/importer/items/specialization-tree-ogg-dude.mjs` (vérification/modification), `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` (vérification), `module/importer/items/specialization-ogg-dude.mjs` (vérification), `module/importer/items/specialization-tree-ogg-dude.mjs` (relecture)

---

## 1. Objectif

Vérifier que les corrections apportées au mapper OggDude des arbres de spécialisation (US1–US4) s'intègrent correctement dans Foundry VTT : l'import complet depuis un ZIP OggDude produit des items `specialization-tree` avec des nœuds et connexions non vides, sans régression sur les autres types d'items importés.

Le résultat attendu est le suivant :
- l'import Foundry d'un arbre réel (ex. `Advisor.xml`) produit un item avec `system.nodes.length > 0` et `system.connections.length > 0` ;
- les compteurs `rawNodeCount`, `importedNodeCount`, `importedConnectionCount` sont cohérents et accessibles dans les flags ;
- les `talentId` des nœuds correspondent aux talents réellement présents dans les compendiums ;
- aucun autre type d'item importé (talents, carrières, species, équipement) ne régresse ;
- la chaîne complète XML → parseur → context builder → mapper → document Foundry est validée.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Exécution d'un import OggDude complet depuis un ZIP contenant un arbre de spécialisation réel (Advisor) + les talents associés + carrières
- Vérification que l'item `specialization-tree` créé a :
  - `system.nodes` non vide (> 0 nœuds)
  - `system.connections` non vide (> 0 connexions)
  - des `nodeId`, `talentId`, `row`, `column`, `cost` cohérents avec le XML source
  - `rawNodeCount === importedNodeCount`
  - `importedConnectionCount` égal au nombre de connexions dédupliquées
- Validation que les talents référencés par les nœuds existent bien dans les compendiums (ou sont créés par l'import)
- Vérification de la non-régression sur :
  - l'import des talents (spécialisation)
  - l'import des carrières
  - l'import des species
  - l'import des armes/armures/équipement
  - les compteurs globaux d'import (`global-import-metrics`)
- Scénario de test manuel documenté pour validation Foundry réelle
- Mise à jour des tests d'intégration existants si nécessaire

### Exclu de cette US / ce ticket

- Correction du mapping des nœuds → déjà couvert par `#218`
- Génération des connexions depuis `Directions` → déjà couvert par `#219`
- Enrichissement des logs de diagnostic → déjà couvert par `#220`
- Nouveaux tests unitaires sur le mapper → déjà couvert par `#221`
- Migration de structure de données ou modification du data model `specialization-tree`
- Support de nouveaux formats XML OggDude non encore identifiés
- Test de performance ou de charge

---

## 3. Constat sur l'existant

### Travaux déjà réalisés et mergés

L'epic `#217` est en phase finale. Les US suivantes sont mergées sur `develop` :

| US | Issue | PR | Statut |
|---|---|---|---|
| US1 — Mapper les nœuds depuis le format réel | #218 | #223 | ✅ Mergé |
| US2 — Générer les connexions depuis Directions | #219 | #224 | ✅ Mergé |
| US3 — Logs de diagnostic | #220 | #225 | ✅ Mergé |
| US4 — Tests unitaires format réel | #221 | #226 | ✅ Mergé |

### État du mapper (`oggdude-specialization-tree-mapper.mjs`)

Le mapper contient aujourd'hui :
- `extractNodesFromRows()` — lit `Talents.Key`, `Cost`, `Directions.Direction` (format réel) et `TalentColumns.TalentColumn` (fallback) — couvert par #218
- `extractDirectionalConnections(nodes)` — génère connexions `horizontal`/`vertical` depuis `Right`/`Down` — couvert par #219
- `detectInputFormat(xmlSpecialization)` — détection de format — couvert par #220
- `logger.debug` pour format détecté et résumé de mapping — couvert par #220
- `logger.warn` pour anomalies (format inconnu, cibles directionnelles absentes) — couvert par #220
- `normalizeNodes()` — normalisation et validation — couvert par #218
- `dedupeConnections()` — déduplication des connexions — couvert par #219

### État des tests

- **19 tests unitaires** dans `tests/importer/specialization-tree-ogg-dude.spec.mjs` (micro-contrats)
- **20 tests d'intégration** dans `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` (fixture XML Advisor.xml, parsing réel)
- **Couverture totale** : les tests Vitest mockent le logger mais pas le parseur XML ni l'orchestrateur d'import Foundry

### Ce qui n'est PAS encore couvert

- La chaîne complète `ZIP OggDude → parseXmlToJson() → buildSpecializationTreeContext() → specializationTreeMapper()` n'est pas testée en environnement Foundry réel
- L'orchestrateur (`specialization-tree-ogg-dude.mjs`) n'a pas de test d'intégration avec données réelles
- La cohérence entre les `talentId` des nœuds et les items `talent` importés n'est pas vérifiée automatiquement
- La non-régression des autres imports (carrières, species, armes, etc.) en présence de specialization-tree n'est pas testée
- Aucun scénario de test manuel n'est documenté pour une validation Foundry réelle

### Fichier de cadrage

Le fichier `documentation/cadrage/character-sheet/specialization-tree/fix-oggdude-specialization-tree-import-empty-nodes.md` référencé par l'issue est vide, donc aucune contrainte métier supplémentaire n'en découle.

---

## 4. Décisions d'architecture

### 4.1. Tests automatisés sans Foundry live

**Décision** : ajouter un test d'intégration Vitest qui exécute la chaîne complète `parseXmlToJson → buildSpecializationTreeContext → specializationTreeMapper` en mockant uniquement le filesystem OggDudeDataElement (pas Foundry).

**Justification** :
- `buildSpecializationTreeContext` est déjà testé dans la spec existante (mock `buildJsonDataFromDirectory`)
- Ajouter un test qui part d'un vrai fichier XML, passe par le context builder, et vérifie le résultat du mapper permettra de valider la chaîne sans environnement Foundry
- Évite la complexité et la fragilité d'un test Foundry réel (nécessite `game`, `ui`, etc.)

### 4.2. Scénario de validation manuelle documenté

**Décision** : rédiger un scénario de test manuel (dans les commentaires du code ou dans un fichier `tests/manual/specialization-tree-import-validation.md`) qui décrit les étapes pour valider dans Foundry :
1. Charger un ZIP OggDude contenant Advisor + ses talents
2. Lancer l'import
3. Vérifier les items créés dans le compendium

**Justification** : le pipeline complet inclut des appels Foundry qui ne peuvent pas être mockés (création de compendium, Actors, dossier ZIP). Un scénario manuel est le seul moyen de valider le comportement réel.

### 4.3. Pas de modification du mapper ni des utils

**Décision** : cette US ne modifie ni `oggdude-specialization-tree-mapper.mjs` ni `specialization-tree-import-utils.mjs`, sauf si un bug d'intégration est découvert.

**Justification** : le mapper et ses utils ont été stabilisés et testés par US1–US4. L'objectif est la validation, pas la correction.

### 4.4. Vérification de non-régression multi-types

**Décision** : exécuter la suite complète des tests d'import (`tests/importer/*.spec.mjs` et `tests/importer/*.integration.spec.mjs`) et vérifier que tous les tests passent, en particulier ceux des autres types d'items.

**Justification** : les spécialisations partagent des utils d'import communs (`specialization-import-utils.mjs`). Une modification involontaire pourrait affecter les autres imports de spécialisation. Les autres types d'items (carrières, species) ont leurs propres mappers indépendants, mais partagent l'orchestrateur OggDude.

---

## 5. Plan de travail détaillé

### Étape 1 — Exécuter la suite de tests complète et vérifier l'absence de régression

**Quoi faire** :
- Lancer `npx vitest run tests/importer/` et vérifier que les 547+ tests passent
- Lancer `npx vitest run tests/` complet (si faisable) pour détecter toute régression hors importer
- Signaler tout échec comme bug bloquant avant de continuer

**Fichiers** : aucun (validation uniquement)

**Risques spécifiques** : aucun — c'est une vérification préalable.

### Étape 2 — Vérifier la chaîne parseur → context builder → mapper dans un test automatisé

**Quoi faire** :
- Ajouter un test d'intégration dans la spec existante (`specialization-tree-ogg-dude.integration.spec.mjs`) ou un nouveau fichier dédié
- Le test lit la fixture `tests/fixtures/Specializations/Advisor.xml`, appelle `parseXmlToJson`, puis `buildSpecializationTreeContext` avec les données parsées, et vérifie que l'élément produit n'a pas de nœuds/connexions vides
- Mock `OggDudeDataElement.buildJsonDataFromDirectory` pour retourner les données parsées au lieu de lire le filesystem ZIP

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` (ajout de test)

**Risques spécifiques** :
- `buildSpecializationTreeContext` dépend de `OggDudeDataElement.buildJsonDataFromDirectory` qui lit un ZIP → nécessite un mock minimal

### Étape 3 — Documenter le scénario de validation manuelle Foundry

**Quoi faire** :
- Créer un fichier `tests/manual/specialization-tree-import-validation.md`
- Documenter les étapes précises pour :
  1. Préparer un ZIP OggDude de test contenant Advisor.xml + talents + carrières
  2. Lancer l'import OggDude dans Foundry
  3. Vérifier la console (logs debug/warn)
  4. Vérifier le compendium `specialization-tree` créé
  5. Vérifier les propriétés de l'item Advisor (nœuds, connexions, coûts)
  6. Vérifier que les talents sont liés correctement
  7. Vérifier que les autres items (carrières, species) sont intacts

**Fichiers** :
- `tests/manual/specialization-tree-import-validation.md` (création)

**Risques spécifiques** :
- Scénario manuel obsolète si le workflow d'import change → le maintenir à jour avec les versions

### Étape 4 — Exécuter le scénario manuel et consigner les résultats

**Quoi faire** :
- Exécuter le scénario de validation manuelle dans une instance Foundry réelle
- Noter les résultats : succès/échec pour chaque étape
- En cas d'échec, créer un bug report et retourner en US1–US4 pour correction
- En cas de succès, marquer l'US5 comme validée

**Fichiers** : aucun (validation manuelle)

**Risques spécifiques** :
- L'environnement Foundry réel peut révéler des problèmes non visibles en tests Vitest (ex. timing, hooks, permissions)

### Étape 5 — Nettoyage et clôture de l'epic

**Quoi faire** :
- Mettre à jour le fichier de cadrage (`fix-oggdude-specialization-tree-import-empty-nodes.md`) avec un résumé des problèmes résolus et de l'état actuel
- Vérifier que tous les critères d'acceptation de l'epic #217 sont remplis :
  - ✅ 20 nœuds produits depuis Advisor.xml
  - ✅ Coûts 5/10/15/20/25
  - ✅ Connexions générées depuis Directions
  - ✅ Aucun arbre vide
  - ✅ Tests unitaires passent
  - ✅ Fallback ancien format conservé
  - ✅ Logs de diagnostic opérationnels (US5 restant à valider)
- Clore l'epic #217

**Fichiers** :
- `documentation/cadrage/character-sheet/specialization-tree/fix-oggdude-specialization-tree-import-empty-nodes.md` (mise à jour)

**Risques spécifiques** : aucun.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` | Modification | Ajouter un test qui valide la chaîne parseur → context builder → mapper avec données réelles |
| `tests/manual/specialization-tree-import-validation.md` | Création | Scénario de validation manuelle documentée pour environnement Foundry réel |
| `documentation/cadrage/character-sheet/specialization-tree/fix-oggdude-specialization-tree-import-empty-nodes.md` | Mise à jour | Résumé des corrections apportées et état de l'epic |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Tests Vitest mockés ne couvrent pas les appels Foundry réels | Faux sentiment de sécurité, bugs non détectés | Documenter et exécuter le scénario manuel (Étape 4) |
| `buildSpecializationTreeContext` difficile à tester sans mock OggDudeDataElement | Test fragile ou trop complexe | Mocker uniquement `buildJsonDataFromDirectory`, tester le reste du pipeline |
| Scénario manuel non exécuté faute de temps ou d'environnement | Epic non validée | Planifier une session de validation dédiée avant la clôture |
| Régression silencieuse sur un autre type d'import | Découverte tardive | Exécuter la suite complète de tests avant et après la validation (Étape 1) |
| Le fichier de cadrage vide ne fournit pas de contraintes | Pas de guidance métier supplémentaire | Utiliser les AC de l'epic #217 comme unique référence |

---

## 8. Proposition d'ordre de commit

1. `test(importer): add full pipeline validation for specialization-tree import`
2. `docs(importer): add manual validation scenario for specialization-tree import`
3. `docs(cadrage): summarize specialization-tree fix epic outcomes`

Si les étapes 1 et 2 sont atomiques :

1. `test(importer): validate OggDude specialization-tree full import pipeline`

---

## 9. Dépendances avec les autres US

- **Dépend de** :
  - `#218` — mapping des nœuds (✅ mergé)
  - `#219` — génération des connexions (✅ mergé)
  - `#220` — logs de diagnostic (✅ mergé)
  - `#221` — tests unitaires format réel (✅ mergé)
- **Bloque** : la clôture de l'epic `#217`
- **Rôle dans l'epic** : US5 est la dernière US de l'epic #217. Sa validation confirme que toutes les corrections antérieures fonctionnent ensemble dans Foundry.

Ordre recommandé final :
1. `#218` — mapping des nœuds (✅)
2. `#219` — connexions directionnelles (✅)
3. `#220` — logs de diagnostic (✅)
4. `#221` — campagne de tests élargie (✅)
5. **`#222` — validation d'intégration Foundry (⬅️ ici)**
