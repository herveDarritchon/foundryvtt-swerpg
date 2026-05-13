# Plan d'implémentation — US1 : Mapper les nœuds depuis le format réel OggDude

**Issue** : [#218 — US1: Mapper les nœuds depuis le format réel OggDude (TalentRows/Talents/Key)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/218)
**Epic** : [#217 — EPIC: Fix OggDude Specialization Tree Import — Arbres de spécialisation vides](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (modification), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (modification ciblée), `module/importer/utils/specialization-tree-import-utils.mjs` (vérification)

---

## 1. Objectif

Corriger la lecture des nœuds d'arbres de spécialisation OggDude dans le mapper `specialization-tree` pour qu'il comprenne le format réel `TalentRows.TalentRow[].Talents.Key[]` au lieu de dépendre en priorité d'un ancien format à colonnes.

Le résultat attendu pour cette US est limité mais structurant :
- les arbres importés ne doivent plus avoir `system.nodes = []` lorsque le XML OggDude réel contient des talents ;
- chaque nœud importé doit porter un `nodeId` stable, un `row`, un `column`, un `talentId` et un `cost` ;
- le support de l'ancien format doit rester disponible en fallback ;
- la correction doit rester localisée au mapper, sans élargir le ticket aux connexions directionnelles, au durcissement complet des logs ni à la validation d'intégration Foundry.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Prioriser la lecture du format réel OggDude : `TalentRows.TalentRow[].Talents.Key[]`
- Déterminer `row` par ordre d'apparition dans le XML : `rowIndex + 1`
- Déterminer `column` par ordre d'apparition dans la ligne : `columnIndex + 1`
- Hériter le coût depuis `rawRow.Cost` pour tous les nœuds de la ligne
- Normaliser `talentId` depuis la valeur du `Key`
- Générer un `nodeId` déterministe selon la convention `r{row}c{column}`
- Conserver le fallback existant vers les formats anciens ou hypothétiques : `TalentColumns.TalentColumn`, `Nodes.Node`, `TalentNodes.TalentNode`, `Connections.Connection`
- Vérifier la robustesse des helpers utilisés par ce flux : `asArray()`, `readFirstString()`, `parseNonNegativeInteger()`, `normalizeSpecializationTreeId()`
- Ajouter une couverture de test minimale ciblée sur ce contrat de mapping

### Exclu de cette US / ce ticket

- Génération des connexions depuis `Directions` → issue #219
- Ajout des logs de diagnostic détaillés de format détecté / rowCount / nodeCount → issue #220
- Campagne complète de tests de non-régression avec fixture Advisor.xml étendu → issue #221
- Vérification d'intégration Foundry après import complet → issue #222
- Modification du data model `specialization-tree`
- Modification du resolver domaine `talent-tree-resolver`
- Refonte de l'orchestrateur `module/importer/oggDude.mjs`
- Refonte globale de l'import OggDude

---

## 3. Constat sur l'existant

Le code actuel lit les lignes via `extractNodesFromRows()` dans `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`, mais cherche des colonnes dans `rawRow?.TalentColumns?.TalentColumn`. C'est incompatible avec le XML réel décrit dans le cadrage, où les talents sont sous `rawRow?.Talents?.Key`.

Conséquences actuelles :
- le mapper peut construire un `specialization-tree` valide en surface ;
- mais il ne produit aucun nœud pour un export OggDude réel de type `Advisor.xml` ;
- les compteurs `rawNodeCount`, `importedNodeCount` et `importedConnectionCount` existent déjà dans `flags.swerpg.import`, mais restent inexacts pour ce format si aucun nœud n'est extrait ;
- le resolver domaine considère encore un arbre comme `available` seulement si `nodes.length > 0` et `connections.length > 0`, donc après cette US l'arbre pourra encore rester `incomplete` tant que #219 n'aura pas ajouté les connexions directionnelles.

L'existant montre aussi que :
- `normalizeNodeId()`, `normalizeSpecializationTreeId()` et `parseNonNegativeInteger()` existent déjà dans `module/importer/utils/specialization-tree-import-utils.mjs` ;
- `asArray()` et `readFirstString()` sont aujourd'hui locales au mapper ;
- le mapper applique déjà un pattern d'isolation des erreurs par item cohérent avec ADR-0006 ;
- un test existe déjà pour l'ancien format à colonnes dans `tests/importer/specialization-tree-ogg-dude.spec.mjs`, mais pas pour le vrai format `TalentRows/Talents/Key`.

---

## 4. Décisions d'architecture

### 4.1. Garder la correction dans le mapper, pas dans l'orchestrateur ni le modèle

**Décision** : corriger `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` comme couche de compréhension du XML OggDude.

Justification :
- le bug est un problème de mapping XML vers modèle métier, pas de création d'item Foundry ;
- le cadrage insiste explicitement sur ce point ;
- la correction la plus petite et la plus sûre reste locale au mapper.

### 4.2. Priorité au format réel `TalentRows/Talents/Key`, fallback ancien conservé

**Décision** : lire d'abord `TalentRows.TalentRow[].Talents.Key[]`, puis retomber sur les structures anciennes seulement si ce format n'est pas présent.

Justification :
- c'est le format réellement observé ;
- l'issue demande explicitement de ne pas casser les anciens exports potentiels ;
- cela limite la régression tout en corrigeant le cas principal.

### 4.3. `row` et `column` viennent de l'ordre XML, pas des pseudo-index OggDude

**Décision** : utiliser `rowIndex + 1` et `columnIndex + 1` comme source principale de vérité.

Justification :
- le cadrage signale que `<Index>` peut être à `0` ou ne pas refléter correctement la position réelle ;
- la convention V1 du projet repose sur des identifiants stables `r{row}c{column}` ;
- cela rend le comportement déterministe et testable.

### 4.4. Conserver les helpers locaux tant qu'ils ne sont pas réutilisés ailleurs

**Décision** : ne pas extraire `asArray()` ni `readFirstString()` dans un utilitaire partagé dans cette US.

Justification :
- la consigne projet privilégie les plus petits changements corrects ;
- ce ticket ne demande pas une mutualisation transversale ;
- déplacer des helpers maintenant élargirait le périmètre sans bénéfice immédiat.

### 4.5. Ne pas anticiper les connexions directionnelles dans cette US

**Décision** : limiter cette US à l'extraction correcte des nœuds et ne pas ajouter ici la lecture de `Directions`.

Justification :
- #219 est explicitement dédié à cette responsabilité ;
- cela évite de mélanger correction bloquante et enrichissement structurel ;
- le découpage reste cohérent avec les issues créées.

### 4.6. Ajouter un test ciblé sur le nouveau format, mais pas la campagne complète

**Décision** : ajouter ou adapter une couverture de test minimale pour figer le nouveau comportement du mapper, tout en laissant la suite exhaustive à #221.

Justification :
- conforme à ADR-0004 ;
- évite une correction sans filet ;
- reste compatible avec le périmètre strict de #218.

---

## 5. Plan de travail détaillé

### Étape 1 — Vérifier et fiabiliser les helpers utilisés par le mapper

**Quoi faire** :
- relire le comportement réel de `asArray()` et `readFirstString()` dans le mapper ;
- confirmer que `parseNonNegativeInteger()` et `normalizeSpecializationTreeId()` suffisent pour le contrat du ticket ;
- corriger seulement les cas qui bloquent la lecture du format réel : `undefined`, objet seul, tableau, chaîne simple si elle peut apparaître comme valeur de `Key`.

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
- `module/importer/utils/specialization-tree-import-utils.mjs` uniquement si une adaptation ciblée est réellement nécessaire

**Risques spécifiques** :
- changer le comportement de `asArray()` trop largement pourrait casser les anciens formats ;
- surcorriger les helpers peut diluer le ticket.

### Étape 2 — Réécrire l'extraction des nœuds par lignes pour le format réel

**Quoi faire** :
- faire évoluer `extractNodesFromRows()` pour qu'elle lise en priorité : `TalentRows.TalentRow`, `rawRow.Talents.Key`, `rawRow.Cost` ;
- construire des entrées brutes de nœuds avec `row`, `column`, `rawNodeKey`, `talentId`, `cost`, `rawNode` minimal utile au traitement existant ;
- ne plus dépendre du sous-arbre `TalentColumns.TalentColumn` comme chemin principal.

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- utiliser encore `rawRow.Index` comme source prioritaire ferait persister le bug ;
- mal normaliser `talentId` pourrait produire des IDs incohérents avec le reste des imports.

### Étape 3 — Préserver le fallback ancien format sans ambiguïté

**Quoi faire** :
- garder `extractNodesFromFlatList()` et la logique existante pour les anciens formats ;
- faire en sorte que le fallback ne s'active que si le format réel n'a produit aucun nœud exploitable ;
- éviter tout mélange implicite entre nœuds issus du nouveau format et nœuds issus d'un ancien format dans un même arbre.

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- un fallback trop agressif peut masquer un problème de lecture du format réel ;
- un fallback supprimé casserait la rétrocompatibilité souhaitée par l'issue.

### Étape 4 — Aligner la normalisation finale et les métriques existantes

**Quoi faire** :
- vérifier que `normalizeNodes()` transforme correctement les entrées extraites depuis `Talents.Key` ;
- conserver le placeholder `unknown:<specializationId>:<nodeId>` si un talent est absent ;
- conserver les compteurs existants dans `flags.swerpg.import` : `rawNodeCount`, `importedNodeCount`, `importedConnectionCount` ;
- accepter qu'après cette US les connexions puissent rester vides tant que #219 n'est pas implémentée.

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- considérer l'absence de connexions comme une régression de #218 alors qu'elle relève de #219 ;
- produire des métriques incohérentes entre nœuds bruts et nœuds normalisés.

### Étape 5 — Ajouter une couverture de test minimale du nouveau chemin

**Quoi faire** :
- ajouter un test nominal de mapping depuis `TalentRows/Talents/Key` ;
- vérifier au minimum : le nombre de nœuds produits, les `nodeId`, les coûts par ligne simples, la normalisation de `talentId` ;
- ajouter un test de robustesse sur absence de `Talents.Key` ou ligne vide ;
- garder des assertions lisibles et ciblées, conformément à ADR-0012.

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`

**Risques spécifiques** :
- refaire dans #218 toute la matrice de tests prévue pour #221 ;
- écrire des assertions trop profondes et fragiles.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | Modification | Corriger la lecture prioritaire des nœuds depuis `TalentRows.TalentRow[].Talents.Key[]`, générer `row`/`column` par ordre XML, conserver le fallback ancien format |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | Modification | Ajouter une couverture minimale du vrai format OggDude pour figer le contrat de #218 |
| `module/importer/utils/specialization-tree-import-utils.mjs` | Vérification, modification ciblée éventuelle | Ajustement uniquement si un helper existant empêche une correction locale propre dans le mapper |
| `module/importer/items/specialization-tree-ogg-dude.mjs` | Vérification seule | Confirmer qu'aucun changement n'est nécessaire dans le context builder |
| `module/models/specialization-tree.mjs` | Vérification seule | Confirmer que le contrat `nodeId/talentId/row/column/cost` reste déjà compatible |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le vrai format est lu, mais les arbres restent `incomplete` faute de connexions | La correction peut sembler partielle côté domaine | Documenter explicitement la dépendance à #219 et ne pas élargir #218 |
| Régression sur les anciens exports à colonnes | Perte de compatibilité sur des datasets déjà supportés | Conserver un fallback explicite et le vérifier par test ciblé si possible |
| Mauvaise interprétation de `Index` OggDude | `nodeId` instables ou positions fausses | Utiliser l'ordre d'apparition XML comme source principale |
| Helpers insuffisamment robustes | Nœuds silencieusement perdus | Vérifier les cas `undefined`, objet seul, tableau, chaîne simple |
| Tests trop ambitieux dans #218 | Glissement de périmètre vers #221 | Limiter la couverture à la preuve du nouveau chemin nominal et à un cas de robustesse |

---

## 8. Proposition d'ordre de commit

1. `fix(importer): read specialization-tree nodes from OggDude TalentRows keys`
2. `test(importer): cover specialization-tree row key node mapping`

Si l'implémentation reste très compacte, un seul commit est aussi acceptable :
1. `fix(importer): map specialization-tree nodes from real OggDude row format`

---

## 9. Dépendances avec les autres US

- **Dépend de** : aucune issue bloquante
- **Bloque directement** : #219 (connexions), #220 (logs), #221 (tests)
- **Conditionne indirectement** : #222 (intégration Foundry)

Ordre recommandé :
1. #218 — correction du mapping des nœuds
2. #219 — génération des connexions
3. #220 et #221 — logs et couverture exhaustive
4. #222 — validation d'intégration Foundry
