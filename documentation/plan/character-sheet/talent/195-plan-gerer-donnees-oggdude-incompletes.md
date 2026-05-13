# Plan d'implémentation — US11 : Gérer les données OggDude incomplètes

**Issue** : [#195 — US11: Gérer les données OggDude incomplètes](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/195)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (modification), `module/importer/utils/specialization-tree-import-utils.mjs` (modification), `module/lib/talent-node/talent-tree-resolver.mjs` (modification), `module/lib/talent-node/talent-node-state.mjs` (modification), `module/importer/mappers/oggdude-talent-mapper.mjs` (modification ciblée), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (modification), `tests/lib/talent-node/talent-tree-resolver.test.mjs` (modification), `tests/lib/talent-node/talent-node-state.test.mjs` (modification), `tests/importer/talent-mapper.spec.mjs` (modification ciblée)

---

## 1. Objectif

Fiabiliser l'import OggDude des talents et arbres de spécialisation lorsque les données sont incomplètes, ambiguës ou incohérentes, afin d'éviter des référentiels apparemment valides mais métier faux.

Le résultat attendu est un import qui :
- conserve le brut utile au diagnostic ;
- marque explicitement les arbres et nœuds incomplets ou invalides ;
- empêche les achats non fiables ;
- produit des warnings exploitables pour correction manuelle ou migration ultérieure.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Formaliser la gestion des cas suivants :
  - talent inconnu (pas de référentiel définissant le talent référencé par un nœud) ;
  - coût manquant sur un nœud ;
  - connexions manquantes ou incohérentes ;
  - activation inconnue sur une définition générique de talent ;
  - statut import `valid` / `incomplete` / `invalid`.
- Conserver les données brutes OggDude pertinentes dans `flags.swerpg.import.raw`.
- Compléter les diagnostics d'import exposés sur les items importés (`warnings`, `status`, `unresolved`, etc.).
- Faire en sorte que la couche domaine (`talent-tree-resolver` + `talent-node-state`) bloque les achats lorsque la fiabilité de l'arbre ou du nœud n'est pas suffisante.
- Ajouter des tests unitaires et de non-régression ciblés.
- Aligner les diagnostics d'import talent (`activation` inconnue) sur le même contrat que les arbres (`flags.swerpg.import`).

### Exclu de cette US / ce ticket

- Refonte UI de l'importeur OggDude.
- Création d'un éditeur manuel de correction des arbres importés.
- Automatisation mécanique des talents via `system.effects`.
- Refonte du modèle métier générique des talents au-delà du strict nécessaire.
- Migration massive d'anciens contenus déjà importés.
- Résolution automatique de talents inconnus par matching heuristique.
- Création automatique d'`Item` `talent` placeholders — le placeholder reste côté nœud d'arbre.

---

## 3. Constat sur l'existant

### Une partie du besoin existe déjà sur les arbres

Le mapper `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` gère déjà plusieurs diagnostics :
- `unresolved-talent:*` pour les références sans talent exploitable ;
- `missing-cost:*` pour les nœuds sans coût ;
- connexions invalides via les stats dédiées (`invalidConnections`) ;
- warning global `tree-incomplete` ;
- placeholder `talentId = unknown:<specializationId>:<nodeId>` ;
- conservation de données brutes dans `flags.swerpg.import` (`warnings`, `unresolved`, compteurs).

Les tests `tests/importer/specialization-tree-ogg-dude.spec.mjs` couvrent déjà les trois cas de base (talent inconnu, coût manquant, arbre complet).

### Le contrat actuel reste insuffisant pour fiabiliser l'aval

L'implémentation actuelle ne garantit pas encore que les diagnostics d'import empêchent réellement les achats non fiables :
- un nœud avec `talentId = unknown:*` reste structurellement "valide" pour `talent-node-state.mjs` qui ne vérifie que la présence de `nodeId`, `talentId`, `row`, `cost` ;
- un arbre avec des connexions partiellement invalides peut rester `available` si `nodes.length > 0` et `connections.length > 0` ;
- le resolver `talent-tree-resolver.mjs` ne connaît aujourd'hui que `available` vs `incomplete` sur base structurelle minimale, sans consulter `flags.swerpg.import`.

### Les données brutes ne sont pas systématiquement conservées dans `flags.swerpg.import.raw`

Le cadrage `03-import-oggdude-talents.md` et ADR-0010 demandent explicitement la conservation du brut utile dans `flags.swerpg.import.raw`. Le code actuel stocke des warnings et métriques, mais pas encore un sous-contrat clair et stable du brut utile pour les cas incomplets.

### L'activation inconnue est déjà neutre, mais le diagnostic n'atteint pas le document importé

`module/importer/mappings/oggdude-talent-activation-map.mjs` retourne déjà `unspecified` pour une activation inconnue et incrémente une statistique. En revanche, l'item talent importé n'expose pas encore un warning explicite sur le document lui-même pour ce cas.

---

## 4. Décisions d'architecture

### 4.1. Conserver le brut et les diagnostics dans `flags.swerpg.import`

**Décision** : stocker les données brutes OggDude utiles, les warnings, les références non résolues et le statut d'import dans `flags.swerpg.import`, avec un sous-champ `raw` dédié au brut utile.

Justification :
- conforme au cadrage `03-import-oggdude-talents.md` ;
- conforme à ADR-0010 qui réserve `flags.swerpg.*` aux données d'import, de mapping et de traçabilité ;
- évite de polluer le modèle métier cœur (`system.*`) avec du brut OggDude ;
- homogène entre specialization-tree et talent.

### 4.2. Aucun fallback implicite dangereux

**Décision** : interdire toute reconstruction silencieuse non documentée :
- pas de fallback `rank * 5` ;
- pas de coût par défaut inventé ;
- pas de connexion reconstruite "au mieux" ;
- pas de résolution automatique opaque d'un talent inconnu.

Justification :
- explicitement demandé par l'issue ;
- conforme au cadrage `02-regles-achat-progression.md` ;
- évite des arbres faux mais visuellement plausibles.

### 4.3. Placeholder contrôlé pour talent inconnu, sans créer d'Item talent automatique

**Décision** : conserver le placeholder existant `talentId = unknown:<specializationId>:<nodeId>` sur le nœud d'arbre importé, avec diagnostic explicite dans `flags.swerpg.import`.

Justification :
- cohérent avec l'implémentation déjà amorcée dans US10 ;
- évite d'élargir US11 à la création automatique d'items de référence ;
- permet l'affichage du nœud tout en interdisant son achat fiable (via l'étape 4.4).

### 4.4. La couche domaine doit consommer les diagnostics d'import pour bloquer les achats non fiables

**Décision** : faire évoluer `talent-tree-resolver.mjs` et `talent-node-state.mjs` pour qu'ils ne se fient plus uniquement à la structure minimale (`nodes.length > 0`), mais tiennent compte de la fiabilité exprimée dans `flags.swerpg.import`.

Règles cibles :
- un arbre marqué `unresolved: true` dans ses flags d'import n'est plus classé `available` mais `incomplete` ;
- un nœud avec `talentId === undefined` OU un `talentId` commençant par `unknown:` est classé `invalid` par `talent-node-state` ;
- un nœud sans coût (`cost == null`) est classé `invalid`.

Justification :
- l'issue ne demande pas seulement des warnings, mais aussi l'interdiction des achats non fiables ;
- évite que la fiabilité dépende de conventions implicites que l'aval pourrait ignorer ;
- garde la responsabilité métier côté domaine pur, testable sans Foundry.

### 4.5. Activation inconnue : valeur neutre + warning non bloquant

**Décision** : conserver `activation = 'unspecified'` pour les talents importés avec activation inconnue, et ajouter un warning explicite (`flags.swerpg.import.warnings`) sur l'item importé.

Justification :
- conforme à l'issue et au cadrage ;
- cas non bloquant pour l'affichage du talent, sans transformer une inconnue en donnée erronée.

### 4.6. Statut d'import homogène entre `talent` et `specialization-tree`

**Décision** : uniformiser les clés de diagnostic dans `flags.swerpg.import` entre les deux flux d'import qui produisent des définitions de talents et des arbres.

Contrat cible (indicatif) :
- `flags.swerpg.import.status` : `'valid'` | `'incomplete'` | `'invalid'`
- `flags.swerpg.import.warnings` : `string[]`
- `flags.swerpg.import.unresolved` : `boolean`
- `flags.swerpg.import.raw` : conservation du brut OggDude utile

Justification :
- les deux flux traitent des cas incomplets ;
- éviter deux conventions parallèles qui compliqueraient la maintenance.

### 4.7. Tests ciblés sur le contrat utile

**Décision** : écrire des tests qui vérifient les statuts, warnings, identifiants et blocages métier utiles, plutôt que de comparer des objets complets verbeux.

Justification :
- conforme à ADR-0012 ;
- facilite le diagnostic quand une régression survient sur un cas incomplet.

---

## 5. Plan de travail détaillé

### Étape 1 — Formaliser le contrat des diagnostics d'import incomplet

**Quoi faire** : définir et homogénéiser le contrat minimal attendu dans `flags.swerpg.import` pour les talents et arbres :
- `raw` : conservation du brut OggDude utile ;
- `warnings` : tableau de chaînes explicites ;
- `status` : `'valid'` | `'incomplete'` | `'invalid'` ;
- `unresolved` : booléen indiquant si des références sont non résolues.

**Fichiers** :
- `module/importer/utils/specialization-tree-import-utils.mjs`
- `module/importer/utils/talent-import-utils.mjs`

**Risques spécifiques** :
- contrat trop implicite ;
- duplication de conventions différentes entre talent et specialization-tree.

### Étape 2 — Compléter le mapper `specialization-tree` pour couvrir tous les cas incomplets de l'issue

**Quoi faire** : faire évoluer le mapper d'arbres pour que :
- un talent inconnu reste affichable mais explicitement non fiable (`status`, `unresolved`) ;
- un coût manquant n'introduise jamais de nœud achetable par erreur (nœud exclu des `normalizedNodes`, warning) ;
- une connexion manquante ou incohérente dégrade explicitement l'arbre (`status`, warning) ;
- l'arbre reçoive un statut d'intégrité cohérent avec ses warnings ;
- les données brutes utiles soient conservées dans `flags.swerpg.import.raw`.

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
- `module/importer/utils/specialization-tree-import-utils.mjs`

**Risques spécifiques** :
- marquer trop d'arbres `invalid` et dégrader l'utilité de l'import ;
- au contraire laisser passer des arbres "partiellement faux" comme achetables.

### Étape 3 — Étendre le mapper talent pour exposer ses diagnostics dans le même contrat

**Quoi faire** : compléter `module/importer/mappers/oggdude-talent-mapper.mjs` pour :
- exporter un warning d'activation inconnue dans `flags.swerpg.import.warnings` ;
- aligner `flags.swerpg.import` sur le contrat défini en étape 1 ;
- conserver le brut utile dans `flags.swerpg.import.raw`.

**Fichiers** :
- `module/importer/mappers/oggdude-talent-mapper.mjs`
- `module/importer/utils/talent-import-utils.mjs`

**Risques spécifiques** :
- casser le format actuel consommé par des tests ou modules aval ;
- divergence entre statistiques globales et warning réellement porté sur l'item.

### Étape 4 — Aligner la couche domaine sur les diagnostics d'import

**Quoi faire** : adapter :
- `talent-tree-resolver.mjs` dans `getSpecializationTreeResolutionState()` pour consulter `flags.swerpg.import` et ne pas se limiter à la seule structure `nodes + connections` ;
- `talent-node-state.mjs` dans `getNodeState()` pour invalider les nœuds dont :
  - `talentId` est manquant ou commence par `unknown:`;
  - le parent tree est marqué `unresolved` ou `incomplete`.

**Fichiers** :
- `module/lib/talent-node/talent-tree-resolver.mjs`
- `module/lib/talent-node/talent-node-state.mjs`

**Risques spécifiques** :
- coupler trop fortement la couche domaine à une représentation interne d'import ;
- casser des tests US4/US5 existants sans redéfinir clairement le contrat.

### Étape 5 — Verrouiller la non-régression par tests

**Quoi faire** : compléter les tests pour couvrir :
- placeholder talent inconnu et statut `incomplete` ;
- coût manquant sur nœud ;
- connexions invalides partielles ;
- arbre complet mais avec références non résolues ;
- arbre `invalid` → achat refusé ;
- activation inconnue non bloquante avec warning sur l'item ;
- conservation du brut utile dans `flags.swerpg.import.raw`.

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- `tests/lib/talent-node/talent-tree-resolver.test.mjs`
- `tests/lib/talent-node/talent-node-state.test.mjs`
- `tests/importer/talent-mapper.spec.mjs`

**Risques spécifiques** :
- tests trop centrés sur la forme exacte du document (contraire à ADR-0012) ;
- absence de couverture des interactions import → domaine.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/importer/utils/specialization-tree-import-utils.mjs` | modification | Centraliser les statuts `valid/incomplete/invalid`, warnings et détails de diagnostic des arbres incomplets |
| `module/importer/utils/talent-import-utils.mjs` | modification | Aligner les diagnostics talent sur le même contrat que les arbres (`status`, `warnings`, `raw`) |
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | modification | Renforcer le mapping des cas incomplets, enrichir `flags.swerpg.import` (status, raw, warnings) |
| `module/importer/mappers/oggdude-talent-mapper.mjs` | modification | Porter un warning explicite pour activation inconnue, aligner `flags.swerpg.import` |
| `module/lib/talent-node/talent-tree-resolver.mjs` | modification | Consulter la fiabilité d'import de l'arbre pour déterminer son état de résolution |
| `module/lib/talent-node/talent-node-state.mjs` | modification | Invalider les nœuds à `talentId` manquant / préfixé `unknown:` et les arbres non fiables |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | modification | Couvrir les nouveaux contrats `status`, `raw`, warnings et cas partiellement invalides |
| `tests/importer/talent-mapper.spec.mjs` | modification | Vérifier `activation = unspecified` + warning de diagnostic et `flags.swerpg.import.raw` |
| `tests/lib/talent-node/talent-tree-resolver.test.mjs` | modification | Vérifier que les arbres incomplets importés restent non fiables côté résolution |
| `tests/lib/talent-node/talent-node-state.test.mjs` | modification | Vérifier qu'un nœud importé non fiable devient `invalid` |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Les diagnostics restent purement décoratifs, ignorés par la couche domaine | Des achats faux restent possibles | Brancher explicitement resolver et node-state sur la fiabilité import (étape 4) |
| Le contrat de statut est trop implicite | Régressions futures difficiles à diagnostiquer | Formaliser un sous-contrat stable dans `flags.swerpg.import` et le tester |
| Trop de cas passent en `invalid` | Import utile mais trop sévèrement bloqué | Distinguer clairement `incomplete` (affichable, achat contrôlé) et `invalid` (achat interdit) |
| Les talents inconnus restent achetables | Corruption métier de la progression acteur | Faire traiter le préfixe `unknown:` comme non fiable côté domaine |
| Les connexions partiellement invalides sont ignorées | Accessibilité calculée à tort alors que des nœuds sont inaccessibles | Ajouter des tests ciblés sur connexions incohérentes partielles |
| Les warnings talent et les stats globales divergent | Diagnostic incohérent pour le MJ et le développeur | Vérifier dans les tests la cohérence item importé + statistiques |
| L'alignement `flags.swerpg.import` casse des tests existants | Régression sur US9/US10 | Exécuter les tests des deux US avant de merger les changements |

---

## 8. Proposition d'ordre de commit

1. `test(importer): verrouiller le contrat des diagnostics pour les cas oggdude incomplets sur les arbres`
2. `feat(importer): enrichir les diagnostics et statuts des specialization-tree incomplets`
3. `test(importer): verrouiller les diagnostics d activation inconnue pour les talents`
4. `feat(importer): exposer un warning d activation inconnue et le brut conserve sur les talents`
5. `test(domain): couvrir les blocages d achat lies aux imports incomplets`
6. `feat(domain): consommer la fiabilite import pour bloquer les achats non fiables`

---

## 9. Dépendances avec les autres US

- **Dépend de US9 (#193)** : l'activation inconnue côté talent doit déjà disposer de la valeur neutre `unspecified`, ou être alignée ici si US9 est partiellement livré. Le contrat `flags.swerpg.import` côté talent doit être stabilisé avant de l'enrichir.
- **Dépend de US10 (#194)** : l'import `specialization-tree` doit exister pour que US11 puisse durcir et fiabiliser son contrat. Les diagnostics existants sont la base sur laquelle US11 s'appuie.
- **Alimente US5 (#189)** : le calcul d'état des nœuds devient réellement fiable face aux imports incomplets (nœuds `unknown:` → `invalid`).
- **Alimente US6 (#190)** : l'achat de nœud peut refuser proprement les cas non fiables via `talent-node-state`.
- **Bénéficie à US7/US8 (#191/#192)** : la consolidation de talents évite de traiter comme "propres" des références non résolues.
- **Bénéficie à US4 (#188)** : la résolution d'arbre devient plus robuste : un arbre marqué `unresolved` n'est plus classé `available`.
