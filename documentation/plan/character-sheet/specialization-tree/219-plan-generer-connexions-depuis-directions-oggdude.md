# Plan d'implémentation — US2 : Générer les connexions depuis Directions

**Issue** : [#219 — US2: Générer les connexions depuis Directions (Right/Down)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/219)
**Epic** : [#217 — EPIC: Fix OggDude Specialization Tree Import — Arbres de spécialisation vides](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (modification), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (modification)

---

## 1. Objectif

Compléter le mapper `specialization-tree` pour générer les connexions entre nœuds à partir du format réel OggDude `TalentRows.TalentRow[].Directions.Direction[]`, en se basant sur les nœuds déjà extraits par `#218`.

Le résultat attendu est le suivant :
- un arbre importé depuis le vrai format OggDude ne doit plus rester sans connexions quand les directions sont présentes ;
- les connexions doivent être générées de manière déterministe depuis `Right` et `Down` uniquement ;
- les connexions existantes de l'ancien format doivent rester supportées ;
- les erreurs de cible manquante ne doivent jamais faire échouer l'import complet de l'arbre.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Lecture des `Directions.Direction[]` au niveau de chaque ligne OggDude
- Association indicée `Direction[i]` ↔ nœud `Key[i]` de la même ligne
- Génération des connexions :
  - `Right === true` → `rXcY -> rXcY+1`, type `horizontal`
  - `Down === true` → `rXcY -> rX+1cY`, type `vertical`
- Ignorer `Left` et `Up` pour éviter les doublons structurels
- Tolérance aux cibles absentes :
  - warning via logger centralisé
  - pas de crash
  - pas de rejet global de l'arbre
- Fonction pure dédiée `extractDirectionalConnections(nodes)` testable unitairement
- Fusion avec les connexions déjà extraites de l'ancien format (`Connections.Connection`)
- Déduplication finale via `dedupeConnections`
- Couverture de tests ciblée sur ce contrat

### Exclu de cette US / ce ticket

- Remapping des nœuds depuis `TalentRows/Talents/Key` → déjà couvert par `#218`
- Ajout des logs de diagnostic enrichis de format détecté / compteurs détaillés → `#220`
- Campagne complète de tests / fixture OggDude large → `#221`
- Validation d'intégration Foundry bout en bout → `#222`
- Modification du data model `specialization-tree`
- Refonte du resolver domaine `talent-tree-resolver`
- Refonte globale de l'importeur OggDude

---

## 3. Constat sur l'existant

Le mapper actuel a déjà franchi une partie du chemin :

- `extractNodesFromRows()` lit le vrai format `TalentRows.TalentRow[].Talents.Key[]`
- ce même flux capture déjà `rawRow?.Directions?.Direction` et le stocke dans `rawNode.direction`
- les connexions finales sont aujourd'hui construites uniquement depuis :
  - `rawNode.Connections.Connection`
  - `xmlSpecialization.Connections.Connection`
- `dedupeConnections()` existe déjà et dédoublonne par couple `from/to/type`
- si `normalizedNodes.length === 0 || connections.length === 0`, l'arbre est marqué `tree-incomplete`
- `module/lib/talent-node/talent-tree-resolver.mjs` considère encore qu'un arbre n'est `available` que s'il possède à la fois des nœuds et des connexions

Conséquence actuelle :
- après `#218`, le vrai format OggDude produit bien des nœuds ;
- mais tant que `#219` n'est pas implémentée, ces arbres restent souvent sans connexions, donc `incomplete`.

Le fichier de cadrage référencé par l'issue est vide, donc aucune règle supplémentaire ne peut en être déduite.

---

## 4. Décisions d'architecture

### 4.1. Garder la logique dans le mapper

**Problème** : où implémenter la lecture de `Directions` ?

**Options envisagées** :
- Ajouter la logique dans l'orchestrateur OggDude
- Ajouter la logique dans le data model `specialization-tree`
- Ajouter la logique dans le mapper `oggdude-specialization-tree-mapper.mjs`

**Décision retenue** : implémenter dans le mapper.

**Justification** :
- le problème est un problème de compréhension du XML OggDude ;
- `#218` a déjà posé ce mapper comme couche dédiée au format réel ;
- c'est le changement le plus petit, le plus local et le plus cohérent avec le découpage existant.

### 4.2. Introduire une fonction pure dédiée `extractDirectionalConnections(nodes)`

**Problème** : comment rendre la logique testable sans élargir inutilement le périmètre ?

**Options envisagées** :
- coder la logique inline dans `specializationTreeMapper()`
- créer un nouveau fichier utilitaire partagé
- créer une fonction dédiée dans le mapper et l'exposer pour les tests

**Décision retenue** : créer une fonction pure dédiée dans le mapper.

**Justification** :
- l'issue demande explicitement une fonction testable unitairement ;
- cela évite d'introduire un nouveau module partagé sans besoin transversal avéré ;
- cela reste conforme au principe de changement minimal.

### 4.3. Générer uniquement depuis `Right` et `Down`

**Problème** : comment éviter les doublons de connexions quand le XML peut contenir plusieurs directions ?

**Options envisagées** :
- lire `Right/Down/Left/Up`
- lire uniquement `Right/Down`

**Décision retenue** : ne traiter que `Right` et `Down`.

**Justification** :
- c'est explicitement demandé par l'issue ;
- cela évite de produire simultanément `r1c1 -> r1c2` et `r1c2 -> r1c1` ;
- cela simplifie les tests et la logique de déduplication.

### 4.4. Conserver les connexions legacy et fusionner avant déduplication

**Problème** : comment préserver la rétrocompatibilité avec les anciens formats déjà supportés ?

**Options envisagées** :
- remplacer complètement les connexions legacy par les directions
- fusionner les deux sources puis dédupliquer

**Décision retenue** : fusionner puis passer par `dedupeConnections`.

**Justification** :
- l'issue demande explicitement la fusion avec les éventuelles connexions existantes ;
- cela conserve la compatibilité avec les anciens exports ;
- `dedupeConnections()` existe déjà et fournit le garde-fou attendu.

### 4.5. Tolérer les cibles manquantes par warning non bloquant

**Problème** : que faire quand `Right` ou `Down` pointe vers un nœud absent ?

**Options envisagées** :
- rejeter l'arbre entier
- créer une connexion partielle invalide
- journaliser un warning et ignorer la connexion

**Décision retenue** : warning + connexion ignorée.

**Justification** :
- conforme à ADR-0006 : isolation des erreurs par item et robustesse ;
- conforme aux AC de l'issue ;
- évite de fabriquer des données fausses ou de bloquer des arbres partiellement valides.

### 4.6. Étendre la couverture de test dans le fichier de spec existant

**Problème** : où figer le contrat de `#219` ?

**Options envisagées** :
- créer une nouvelle suite de tests isolée
- enrichir `tests/importer/specialization-tree-ogg-dude.spec.mjs`

**Décision retenue** : enrichir la spec existante.

**Justification** :
- la spec du mapper existe déjà ;
- elle couvre déjà `#218` et le contrat `specialization-tree` ;
- cela garde la navigation et la maintenance simples, tout en respectant ADR-0004 et ADR-0012.

---

## 5. Plan de travail détaillé

### Étape 1 — Formaliser l'entrée de la logique directionnelle

**Quoi faire** :
- confirmer le contrat réel des nœuds normalisés issus de `extractNodesFromRows()`
- décider quelles données minimales la fonction pure doit recevoir pour calculer les connexions directionnelles
- s'assurer que l'information de direction par nœud est bien disponible au moment du calcul

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- faire dépendre la fonction d'objets XML trop bruts la rendrait fragile ;
- faire dépendre la fonction d'un état global compliquerait sa testabilité.

### Étape 2 — Implémenter `extractDirectionalConnections(nodes)`

**Quoi faire** :
- créer une fonction pure qui parcourt les nœuds dans l'ordre normalisé
- pour chaque nœud :
  - lire sa direction indicée
  - si `Right === true`, chercher le nœud cible `row` identique / `column + 1`
  - si `Down === true`, chercher le nœud cible `row + 1` / `column` identique
- produire des connexions typées `horizontal` et `vertical`
- ignorer `Left` et `Up`

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- une mauvaise correspondance entre index de `Direction[]` et index de `Key[]` casserait le contrat métier ;
- utiliser les mauvaises coordonnées introduirait des connexions fantômes.

### Étape 3 — Gérer les cibles manquantes sans crash

**Quoi faire** :
- lorsqu'une direction pointe vers une cible inexistante, émettre un `logger.warn`
- enrichir le diagnostic import si nécessaire via les compteurs déjà existants d'invalid connection
- ne pas créer de connexion invalide
- ne pas rejeter l'arbre pour ce seul cas

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
- `module/importer/utils/specialization-tree-import-utils.mjs` uniquement si un détail diagnostique supplémentaire est réellement nécessaire

**Risques spécifiques** :
- transformer ce cas en erreur bloquante contredirait l'issue ;
- ne rien logger rendrait le diagnostic difficile côté support.

### Étape 4 — Fusionner avec les connexions legacy existantes

**Quoi faire** :
- conserver les extractions existantes :
  - `extractNodeConnectionEntries()`
  - `extractGlobalConnectionEntries()`
- ajouter les connexions directionnelles au pipeline de composition
- dédupliquer l'ensemble via `dedupeConnections`
- conserver le format final déjà attendu par le modèle et les tests

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- remplacer au lieu de fusionner casserait la rétrocompatibilité ;
- dédupliquer trop tôt pourrait masquer des erreurs de construction.

### Étape 5 — Revalider l'état `tree-incomplete`

**Quoi faire** :
- vérifier que les arbres au vrai format OggDude obtiennent désormais des connexions quand `Directions` est présent
- confirmer que le warning `tree-incomplete` reste réservé aux arbres sans connexions réellement exploitables
- documenter que `#219` débloque le passage fonctionnel entre `#218` et la résolution `available`

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
- vérification de cohérence avec `module/lib/talent-node/talent-tree-resolver.mjs`

**Risques spécifiques** :
- modifier involontairement la définition d'un arbre `available` sortirait du ticket ;
- un calcul erroné des connexions maintiendrait à tort les arbres en `incomplete`.

### Étape 6 — Ajouter la couverture de test ciblée

**Quoi faire** :
- ajouter un test nominal `Right === true`
- ajouter un test nominal `Down === true`
- ajouter un test garantissant l'absence de doublons inverses
- ajouter un test de robustesse quand `Directions` est absent ou vide
- ajouter un test de warning non bloquant quand la cible n'existe pas
- garder des assertions ciblées sur les listes de connexions et compteurs, conformément à ADR-0012

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`

**Risques spécifiques** :
- écrire des assertions trop profondes et fragiles ;
- refaire dans `#219` la campagne complète prévue pour `#221`.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | Modification | Ajouter la génération de connexions depuis `Directions`, la fonction pure `extractDirectionalConnections(nodes)`, la gestion des warnings de cible manquante et la fusion avec les connexions legacy |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | Modification | Ajouter la couverture ciblée des connexions directionnelles, de la déduplication et des cas de robustesse |
| `module/importer/utils/specialization-tree-import-utils.mjs` | Vérification, modification ciblée éventuelle | N'adapter que si le diagnostic des connexions invalides doit être enrichi de façon locale et utile |
| `module/lib/talent-node/talent-tree-resolver.mjs` | Vérification seule | Confirmer qu'aucun changement n'est nécessaire une fois les connexions correctement générées |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Mauvaise association `Direction[i]` ↔ `Key[i]` | Connexions fausses, arbre structurellement invalide | Figer explicitement le contrat par tests nominaux simples et ciblés |
| Lecture de `Left` / `Up` en plus de `Right` / `Down` | Doublons ou symétries non souhaitées | Limiter explicitement la logique à `Right` et `Down` |
| Cible absente traitée comme erreur bloquante | Rejets d'arbres partiellement valides | Logger un warning et ignorer la connexion, conformément à ADR-0006 |
| Régression sur les anciens formats de connexions | Perte de compatibilité | Conserver les deux chemins d'extraction et fusionner avant déduplication |
| Tests trop couplés à la structure interne | Maintenance difficile | Vérifier des listes de connexions, longueurs et types, conformément à ADR-0012 |
| Arbres toujours marqués `incomplete` malgré `Directions` | Ticket perçu comme non résolu | Vérifier explicitement que des connexions sont bien produites pour le vrai format OggDude |

---

## 8. Proposition d'ordre de commit

1. `fix(importer): generate specialization-tree connections from OggDude directions`
2. `test(importer): cover specialization-tree directional connections`

Si l'implémentation reste compacte, un seul commit est acceptable :

1. `fix(importer): map specialization-tree directional connections from OggDude rows`

---

## 9. Dépendances avec les autres US

- **Dépend de** : `#218` — les nœuds doivent être correctement extraits avant de pouvoir être reliés
- **Bloque directement** :
  - `#220` — logs de diagnostic enrichis
  - `#221` — campagne de tests plus large
  - `#222` — validation d'intégration Foundry
- **Rôle dans l'epic** : `#219` est la première US qui permet à un arbre réel importé de devenir structurellement exploitable par le resolver

Ordre recommandé :
1. `#218` — mapping des nœuds
2. `#219` — génération des connexions
3. `#220` et `#221` — observabilité et couverture élargie
4. `#222` — validation d'intégration Foundry
