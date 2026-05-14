# Plan d'implémentation — #243 : Enrichir les nœuds d'arbres de spécialisation avec `talentUuid` à l'import

**Issue** : [#243 — Enrichir les nœuds d'arbres de specialisation avec talentUuid a l'import](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/243)  
**Bloqué par** : [#242 — Persister `system.id` et `system.uuid` sur les talents créés et importés](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/242)  
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`  
**ADRs complémentaires** : `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Cadrage complémentaire** : `documentation/cadrage/character-sheet/specialization-tree/cadrage-cles-metier-techniques-specialization-trees.md`  
**Module(s) impacté(s)** : `module/models/specialization-tree.mjs`, `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`, `module/importer/items/specialization-tree-ogg-dude.mjs`, `module/utils/logger.mjs` via usages existants, tests importer/model

---

## 1. Objectif

Faire en sorte que chaque nœud importé d'un `specialization-tree` conserve :

- `talentId` comme clé métier stable ;
- `talentUuid` comme référence Foundry exacte du talent associé.

Le ticket doit enrichir les données importées, pas corriger l'UI graphique. L'objectif est de livrer un contrat de données fiable pour les couches aval.

---

## 2. Périmètre

### Inclus dans ce ticket

- Ajout de `talentUuid` au schéma des nœuds de `specialization-tree`.
- Construction d'un index de talents disponibles au moment de l'import des arbres.
- Résolution de `talentUuid` à partir de `talentId` pendant le mapping/import.
- Support world items et compendium items.
- Journalisation exploitable quand un talent n'est pas résolu.
- Tests unitaires et d'intégration ciblant la cohérence `talentId` / `talentUuid` / talent réel.

### Exclu de ce ticket

- Création ou réimport automatique des talents manquants.
- Réécriture de l'UI `specialization-tree-app` pour consommer `node.talentUuid`.
- Migration des anciens `specialization-tree` déjà présents en monde ou compendium.
- Refactor global de l'orchestration multi-domaines de l'importer.
- Changement du rôle métier de `talentId`, qui doit rester une clé stable.

---

## 3. Constat sur l'existant

### 3.1. Le mapper d'arbres ne produit aujourd'hui que `talentId`

Dans `module/importer/mappers/oggdude-specialization-tree-mapper.mjs:424`, les nœuds finaux sont exportés sous la forme :

- `nodeId`
- `talentId`
- `row`
- `column`
- `cost`

Aucun `talentUuid` n'est calculé ni stocké.

### 3.2. Le data model ne permet pas encore `talentUuid`

Dans `module/models/specialization-tree.mjs:19`, le schéma des nœuds ne contient pas `talentUuid`. Le contrat ADR-0013 n'est donc pas exprimable côté modèle.

### 3.3. Le socle talent existe déjà via #242

Le code actuel montre déjà deux mécanismes alignés avec #242 :

- `module/settings/models/OggDudeDataElement.mjs:418` persiste `system.uuid` après création des talents ;
- `module/documents/item.mjs:168` renseigne aussi `system.uuid` à la création d'un talent non owned.

Le plan #243 peut donc s'appuyer sur `talent.system.id` et `talent.system.uuid` comme contrat nominal.

### 3.4. L'import d'arbres est aujourd'hui découplé de toute résolution talent

`buildSpecializationTreeContext()` (`module/importer/items/specialization-tree-ogg-dude.mjs:7`) branche directement `specializationTreeMapper` sans lui fournir de contexte de résolution. Le mapper travaille en isolation sur le XML brut.

### 3.5. Il existe déjà un pattern voisin de résolution talent world/compendium

`module/importer/items/species-ogg-dude.mjs:142` contient `resolveTalentUUIDs(keys)` qui montre un pattern simple :

- recherche dans `game.items` ;
- fallback sur les index de compendium.

Ce pattern est réutilisable, mais doit être rendu plus strict et plus aligné avec ADR-0013 en privilégiant `system.id` et `system.uuid`.

---

## 4. Décisions d'architecture

### 4.1. Résolution sur l'existant au moment de l'import

**Décision** : résoudre `talentUuid` contre les talents déjà disponibles dans Foundry au moment où les arbres sont importés.

**Justification** :
- conforme à ton choix ;
- évite de coupler ce ticket à une refonte d'ordonnancement inter-domaines ;
- couvre à la fois les talents déjà présents et ceux importés plus tôt dans la même session s'ils existent déjà au moment du mapping.

### 4.2. `talentId` reste la clé métier canonique

**Décision** : ne jamais remplacer `talentId` par un UUID.

**Justification** :
- conforme ADR-0013 ;
- indispensable pour garder une identité stable entre imports ;
- évite de mélanger identité métier et référence technique.

### 4.3. `talentUuid` est une donnée dérivée de résolution, nullable

**Décision** : renseigner `talentUuid` avec l'UUID Foundry exact si le talent est trouvé, sinon `null`.

**Justification** :
- conforme aux critères d'acceptation ;
- évite de bloquer l'import pour une référence manquante ;
- compatible avec ADR-0006 sur la résilience et l'isolation des erreurs.

### 4.4. La résolution doit s'appuyer d'abord sur `system.id` et `system.uuid`

**Décision** : construire l'index de résolution à partir de `talent.system.id` -> `talent.system.uuid`.

**Justification** :
- c'est le contrat cible posé par #242 ;
- plus robuste qu'une recherche par nom ;
- limite les ambiguïtés entre variantes de libellés.

### 4.5. Les métadonnées d'import restent un fallback technique, pas la source de vérité

**Décision** : autoriser un fallback limité sur `flags.swerpg.oggdudeKey` seulement si nécessaire pour retrouver des talents importés avant stabilisation complète de #242.

**Justification** :
- réduit le risque de rupture pendant la transition ;
- garde `system.id` comme voie nominale ;
- doit rester secondaire et explicitement borné.

### 4.6. Le point d'injection doit être le contexte d'import des arbres, pas l'UI

**Décision** : enrichir les nœuds pendant le flux importer, avant persistance des `specialization-tree`.

**Justification** :
- l'issue parle d'enrichissement à l'import ;
- permet de persister des données complètes et non de recalculer à l'affichage ;
- prépare proprement le ticket UI suivant sans le mélanger à celui-ci.

---

## 5. Plan de travail détaillé

### Étape 1 — Étendre le schéma des nœuds de `specialization-tree`

**À faire**

- Ajouter `talentUuid` au schéma `nodes[]` dans `module/models/specialization-tree.mjs`.
- Le champ doit être optionnel et nullable, avec `initial: null` ou l'équivalent compatible avec le projet.

**Fichiers**
- `module/models/specialization-tree.mjs`
- `tests/models/specialization-tree.test.mjs`

**Risques**
- casser des tests existants si le schéma suppose encore une forme minimale sans `talentUuid`.

---

### Étape 2 — Introduire une résolution centralisée des talents disponibles

**À faire**

- Ajouter un resolver/indexeur dédié aux talents disponibles pendant l'import des arbres.
- Construire une map `talentId normalisé -> talentUuid`.
- Couvrir les deux sources :
  - `game.items` pour le monde ;
  - `game.packs` / index compendium pour les talents en compendium.
- Prioriser `system.id` + `system.uuid`.
- N'utiliser les flags historiques qu'en secours transitoire si nécessaire.

**Fichiers potentiels**
- `module/importer/items/specialization-tree-ogg-dude.mjs`
- ou un nouveau helper dédié dans `module/importer/utils/`

**Risques**
- index de compendium incomplet si certains packs ne sont pas chargés ;
- collisions si plusieurs talents partagent la même clé métier.

---

### Étape 3 — Injecter ce contexte de résolution dans le mapper d'arbres

**À faire**

- Faire évoluer `buildSpecializationTreeContext()` pour préparer le resolver avant le mapping.
- Remplacer le branchement direct actuel par un mapper contextualisé, par exemple une closure ou une signature enrichie.
- Éviter de rendre `OggDudeDataElement` plus générique que nécessaire si le besoin est spécifique au domaine `specialization-tree`.

**Fichiers**
- `module/importer/items/specialization-tree-ogg-dude.mjs`
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques**
- trop élargir l'API générique des mappers alors que le besoin est local ;
- couplage inutile avec d'autres pipelines importer.

---

### Étape 4 — Enrichir les nœuds avec `talentUuid` pendant le mapping

**À faire**

- Dans la normalisation finale des nœuds, conserver `talentId`.
- Ajouter `talentUuid` à partir du resolver.
- Si le talent est introuvable :
  - conserver le nœud ;
  - poser `talentUuid: null` ;
  - journaliser un warning exploitable contenant au minimum `specializationId`, `nodeId`, `talentId`.

**Fichiers**
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques**
- bruit de logs si le warning n'est pas bien structuré ;
- divergence entre `warnings[]` internes et logs émis si les deux ne sont pas alignés.

---

### Étape 5 — Aligner les diagnostics import avec le nouveau cas d'échec

**À faire**

- Réutiliser le mécanisme de warnings/statistiques existant pour les talents non résolus.
- Distinguer clairement :
  - `talentId` absent dans les données source ;
  - `talentId` présent mais aucun talent Foundry correspondant ;
  - `talentUuid` trouvé.

**Fichiers**
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
- éventuellement `module/importer/utils/specialization-tree-import-utils.mjs`

**Risques**
- confondre "nœud invalide" et "référence non résolue" dans les stats métier.

---

### Étape 6 — Ajouter la couverture de tests world et compendium

**À faire**

- Compléter les tests unitaires du mapper pour vérifier :
  - `talentId` inchangé ;
  - `talentUuid` renseigné quand la correspondance existe ;
  - `talentUuid: null` sinon.
- Ajouter des tests d'intégration simulant :
  - résolution sur `game.items` ;
  - résolution sur index compendium ;
  - cohérence entre `node.talentUuid` et `talent.system.uuid`.
- Mettre à jour les tests du modèle `specialization-tree` pour inclure le nouveau champ.
- Garder des assertions ciblées et lisibles, conformément ADR-0012.

**Fichiers**
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- `tests/models/specialization-tree.test.mjs`

**Risques**
- mocks Foundry insuffisants pour la forme exacte des UUID compendium ;
- tests trop couplés à des structures complètes au lieu du contrat métier.

---

### Étape 7 — Vérification de non-régression hors scope UI

**À faire**

- Vérifier que l'ajout de `talentUuid` n'impacte pas les usages existants de `talentId`.
- Vérifier que les arbres déjà mappés sans UI consommatrice restent valides côté modèle/import.
- Documenter explicitement dans le plan ou PR que l'exploitation UI reste à traiter séparément.

**Fichiers à relire**
- `module/applications/specialization-tree-app.mjs`
- `tests/applications/specialization-tree-app.test.mjs`

**Risques**
- confusion de périmètre avec le futur ticket UI.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/models/specialization-tree.mjs` | modification | Ajouter `talentUuid` au schéma des nœuds |
| `module/importer/items/specialization-tree-ogg-dude.mjs` | modification | Préparer le contexte de résolution des talents disponibles |
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | modification | Enrichir chaque nœud avec `talentUuid` et warnings associés |
| `module/importer/utils/specialization-tree-import-utils.mjs` | modification potentielle | Étendre les diagnostics si nécessaire |
| `tests/models/specialization-tree.test.mjs` | modification | Valider le nouveau champ de schéma |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | modification | Couvrir les cas unitaires de résolution |
| `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` | modification | Couvrir world items et compendium |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| `#242` non totalement appliquée | résolution incomplète ou ambiguë | considérer `#242` comme prérequis dur pour la voie nominale |
| plusieurs talents pour un même `system.id` | UUID non déterministe | documenter une règle de priorité et logger les collisions |
| compendium index sans `system.id` exploitable | faux négatifs en compendium | fallback transitoire borné sur `flags.swerpg.oggdudeKey` |
| surcharge de l'API générique des mappers | complexité technique inutile | injecter le contexte au niveau `buildSpecializationTreeContext()` |
| warnings peu exploitables | diagnostic difficile | inclure `specializationId`, `nodeId`, `talentId`, source de résolution |
| dérive de périmètre vers l'UI | ticket trop large | maintenir l'exploitation `fromUuidSync(node.talentUuid)` hors de #243 |

---

## 8. Proposition d'ordre de commit

1. `feat(specialization-tree): add talentUuid to specialization tree node schema`
2. `feat(importer): resolve talent uuids when mapping specialization tree nodes`
3. `test(importer): cover specialization tree talent uuid resolution in world and compendium`

---

## 9. Dépendances avec les autres US

- **Dépend de `#242`** : le contrat `talent.system.id` / `talent.system.uuid` doit exister pour une résolution nominale fiable.
- **Prépare `#244`** : une fois `node.talentUuid` persisté, l'UI pourra résoudre les talents sans ambiguïté.
- **N'inclut pas de migration** : un ticket séparé sera nécessaire si tu veux enrichir les `specialization-tree` déjà importés.
