# Plan d'implémentation — US3 : Ajouter les logs de diagnostic dans le mapper OggDude

**Issue** : [#220 — US3: Ajouter les logs de diagnostic dans le mapper OggDude](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/220)
**Epic** : [#217 — EPIC: Fix OggDude Specialization Tree Import — Arbres de spécialisation vides](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (modification), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (modification)

---

## 1. Objectif

Ajouter des logs de diagnostic structurés dans le mapper `specialization-tree` pour rendre le format XML réellement utilisé et les métriques de mapping visibles dans la console Foundry sans nécessiter de debug interactif.

Le résultat attendu est le suivant :
- le format XML réellement rencontré (TalentRows/Keys, TalentRows/Columns, flat list, ou inconnu) est loggé en `debug` ;
- une synthèse du mapping (rawNodeCount, importedNodeCount, connectionCount) est loggée en `debug` ;
- les anomalies structurelles (lignes sans nœuds, format non reconnu, cibles directionnelles absentes) sont loggées en `warn` ;
- les compteurs et warnings déjà stockés dans `flags.swerpg.import` sont réutilisés sans nouveau contrat de sortie ;
- la couverture de test existante est étendue pour vérifier les appels au logger.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Détection explicite du format XML rencontré (via l'examen des chemins OggDude)
- Log `debug` du format détecté avec `specializationId`
- Log `debug` du résumé de mapping : `rawNodeCount`, `importedNodeCount`, `connectionCount`
- Log `warn` pour les anomalies :
  - format non reconnu (aucun chemin XML connu n'a produit de nœuds)
  - lignes sans nœuds exploitables dans le format rows
  - cibles directionnelles absentes (déjà dans `directionalWarnings`, à journaliser aussi en runtime)
- Réutilisation des compteurs et warnings existants sans refactor des flags
- Vérification des appels `logger.debug` / `logger.warn` dans les tests

### Exclu de cette US / ce ticket

- Création d'un nouveau contrat de sortie ou de nouvelles métriques dans `flags.swerpg.import`
- Refonte du mécanisme de détection de format (reste dans le mapper)
- Remplacement des warnings existants dans `warnings[]`
- Validation d'intégration Foundry bout en bout → #222
- Campagne de tests exhaustive avec fixtures larges → #221

---

## 3. Constat sur l'existant

Le mapper `oggdude-specialization-tree-mapper.mjs` contient déjà :

- **import de `logger`** (ligne 1)
- **`logger.warn`** pour valeurs obligatoires manquantes (ligne 28), input vide (ligne 280), erreur de mapping (ligne 365)
- **`logger.error`** pour erreurs bloquantes (ligne 365)
- **Aucun `logger.debug`** structuré
- **Aucune fonction de détection de format explicite** — la sélection du chemin XML est implicite dans `extractNodesFromRows()` (tente `Talents.Key` puis `TalentColumns.TalentColumn`) et dans `extractRawNodeEntries()` (tente rows puis flat list)

Les compteurs et diagnostics suivants existent déjà :
- `rawCount` : nombre brut d'entrées XML avant normalisation
- `normalizedNodes.length` : nœuds effectivement importés
- `connections.length` : connexions après déduplication
- `warnings[]` : tableau de chaînes (unresolved-talent, missing-cost, tree-incomplete, directional-target-missing)
- `flags.swerpg.import.rawNodeCount`, `.importedNodeCount`, `.importedConnectionCount`

`extractDirectionalConnections()` retourne déjà des `warnings` de cibles manquantes (lignes 258, 268), mais ne journalise rien en runtime.

Le logger mocké est déjà présent dans les tests (lignes 3-10 du spec), avec `vi.fn()` pour toutes les méthodes.

---

## 4. Décisions d'architecture

### 4.1. Garder les diagnostics dans le mapper (inchangé depuis #218/#219)

**Décision** : toute la logique de détection de format et de journalisation reste dans `oggdude-specialization-tree-mapper.mjs`, pas dans l'orchestrateur ni dans le context builder.

**Justification** : le problème est un problème de compréhension du XML OggDude ; le mapper est déjà responsable de l'interprétation du format.

### 4.2. Séparer logs `debug` et `warn`

**Décision** :
- `logger.debug` pour la télémétrie de mapping : format détecté, résumé des compteurs
- `logger.warn` pour les anomalies récupérables : lignes sans nœuds, format non reconnu, cibles directionnelles absentes

**Justification** : les anomalies sont visibles même sans mode debug ; la télémétrie de mapping est utile en debug uniquement pour ne pas polluer la console en production.

### 4.3. Détecter explicitement le format rencontré

**Décision** : introduire une fonction `detectInputFormat(xmlSpecialization)` qui examine les chemins XML et retourne un identifiant de format :
- `'talent-rows-keys'` : format réel OggDude `TalentRows.TalentRow[].Talents.Key[]`
- `'talent-rows-columns'` : format legacy `TalentRows.TalentRow[].TalentColumns.TalentColumn[]`
- `'talent-rows-unknown'` : format rows présent mais sous-format non reconnu
- `'flat-list'` : format plat `Nodes.Node` / `TalentNodes.TalentNode` / `Tree.Nodes.Node`
- `'unknown'` : aucun format reconnu

**Justification** : la détection implicite actuelle empêche de savoir quel chemin a été emprunté sans lire le code ; une fonction dédiée est testable et documente les formats supportés.

### 4.4. Réutiliser les warnings et compteurs existants

**Décision** : les logs de diagnostic lisent les compteurs déjà calculés (`rawCount`, `normalizedNodes.length`, `connections.length`, `warnings[]`), sans ajouter de nouveau champ dans `flags.swerpg.import`.

**Justification** : les flags contiennent déjà toute l'information nécessaire ; ajouter des champs redondants augmenterait la surface de contrat sans bénéfice.

### 4.5. Journaliser les cibles directionnelles absentes en runtime

**Décision** : dans `specializationTreeMapper()`, après avoir récupéré les `directionalWarnings`, appeler `logger.warn` pour chaque warning de cible manquante, en incluant `specializationId`.

**Justification** : actuellement les warnings de cibles manquantes sont stockés mais jamais visibles dans la console ; cela rend le diagnostic des imports partiels difficile.

### 4.6. Étendre la spec existante sans nouvelle suite de tests isolée

**Décision** : enrichir `tests/importer/specialization-tree-ogg-dude.spec.mjs` avec des tests qui vérifient les appels à `logger.debug` et `logger.warn`.

**Justification** : conforme aux décisions #218 (4.6) et #219 (4.6) ; le logger est déjà mocké ; une seule spec par mapper simplifie la navigation.

---

## 5. Plan de travail détaillé

### Étape 1 — Formaliser la détection de format

**Quoi faire** :
- créer `detectInputFormat(xmlSpecialization)` dans le mapper
- la fonction examine les chemins XML et retourne un identifiant de format parmi `'talent-rows-keys'`, `'talent-rows-columns'`, `'talent-rows-unknown'`, `'flat-list'`, `'unknown'`
- appeler cette fonction dans `specializationTreeMapper()` avant la normalisation

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- détecter un format différent de celui que le mapper utilisera effectivement (si la logique de fallback change)

### Étape 2 — Ajouter le log `debug` du format détecté

**Quoi faire** :
- après la détection de format et la résolution de `specializationId`, ajouter :
  ```js
  logger.debug('[SpecializationTreeImporter] Format détecté', { specializationId, format: detectedFormat })
  ```

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- logger avant que `specializationId` soit résolu → impossible, donc placer après la validation de `specializationId`

### Étape 3 — Ajouter le log `debug` du résumé de mapping

**Quoi faire** :
- après la construction des connexions et avant le `return`, ajouter :
  ```js
  logger.debug('[SpecializationTreeImporter] Résumé du mapping', {
    specializationId,
    rawNodeCount: rawCount,
    importedNodeCount: normalizedNodes.length,
    connectionCount: connections.length,
  })
  ```

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** : aucun — les compteurs sont déjà calculés à ce stade.

### Étape 4 — Ajouter les logs `warn` pour les anomalies structurelles

**Quoi faire** :
- si `detectedFormat === 'unknown'`, logger un `warn` avec `specializationId`
- si `detectedFormat === 'talent-rows-unknown'`, logger un `warn` avec `specializationId`, `rowCount`
- si `normalizedNodes.length === 0 && rawCount > 0`, logger un `warn` avec `specializationId`, `rawCount` (toutes les entrées brutes ont été rejetées)
- après `extractDirectionalConnections()`, itérer sur `directionalWarnings` et logger chaque cible manquante :
  ```js
  for (const warning of directionalWarnings) {
    logger.warn(`[SpecializationTreeImporter] ${warning}`, { specializationId })
  }
  ```

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- doubler les warnings si `logger.warn` est appelé en plus du stockage dans `warnings[]` → acceptable, c'est le comportement voulu (visible console + stocké flags)

### Étape 5 — Ajouter la couverture de test du contrat de logging

**Quoi faire** :
- ajouter un test qui vérifie `logger.debug` appelé avec le bon format et le bon `specializationId` pour le format `talent-rows-keys`
- ajouter un test qui vérifie `logger.debug` appelé avec le résumé de mapping (rawNodeCount, importedNodeCount, connectionCount)
- ajouter un test qui vérifie `logger.warn` appelé pour une cible directionnelle absente
- ajouter un test qui vérifie `logger.warn` appelé pour format non reconnu (XML vide ou sans structure connue)
- ne pas sur-tester les appels internes : vérifier la présence et le contenu des appels, pas le nombre exact

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`

**Risques spécifiques** :
- trop de coupling aux chaînes exactes de log (fragile au refactor) → mitiger en vérifiant `toContain` ou `toMatchObject` plutôt que des assertions rigides sur `toHaveBeenCalledWith`

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | Modification | Ajouter `detectInputFormat()`, logs `debug` de format et résumé, logs `warn` pour anomalies structurelles et cibles manquantes |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | Modification | Ajouter la couverture des appels `logger.debug` et `logger.warn` pour les formats et anomalies |
| `module/importer/items/specialization-tree-ogg-dude.mjs` | Vérification seule | Confirmer qu'aucun log supplémentaire n'est nécessaire au niveau du context builder |
| `module/importer/utils/specialization-tree-import-utils.mjs` | Vérification seule | Confirmer que les compteurs existants suffisent sans ajout |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Logs `debug` visibles en production sans activation volontaire | Bruit console | `logger.debug` est désactivé par défaut ; activé uniquement via `logger.enableDebug()` ou `game.settings.set('swerpg', 'debug', true)` |
| Doublon entre `warnings[]` existant et `logger.warn` | Information redondante mais pas trompeuse | Documenter que les warnings sont volontairement dupliqués (console + flags) pour le diagnostic support |
| Test trop couplé au message exact de log | Refactor coûteux | Utiliser `expect.stringContaining` ou `toMatchObject` partiel sur les arguments du logger |
| Détection de format divergente de la réalité du mapper | Logs trompeurs | Tester `detectInputFormat()` isolément et comparer son résultat avec le comportement réel de `extractRawNodeEntries()` |
| Ajout de logs dans la boucle `specializations.map()` sans garde | Logs répétés pour chaque arbre | C'est le comportement attendu (un log par arbre) ; les tests vérifient que chaque arbre produit ses logs |

---

## 8. Proposition d'ordre de commit

1. `feat(importer): add diagnostic logging to specialization-tree mapper`
2. `test(importer): cover diagnostic logging contract for specialization-tree`

Si l'implémentation reste compacte, un seul commit est acceptable :

1. `feat(importer): add structured diagnostic logging to OggDude specialization-tree mapper`

---

## 9. Dépendances avec les autres US

- **Dépend de** : `#218` (les nœuds doivent être correctement extraits avant de pouvoir logger leur comptage), `#219` (les connexions directionnelles doivent exister pour logger les cibles manquantes)
- **Bloque directement** : aucune (US d'observabilité, indépendante)
- **Facilite** : `#221` (les logs aident à comprendre les fixtures de test), `#222` (les logs aident à valider les imports complets)

Ordre recommandé :
1. `#218` — mapping des nœuds (done)
2. `#219` — génération des connexions (done)
3. `#220` — logs de diagnostic
4. `#221` — campagne de tests (peut être parallélisé avec #220)
5. `#222` — validation d'intégration Foundry (dépend de #220 et #221 pour le diagnostic)
