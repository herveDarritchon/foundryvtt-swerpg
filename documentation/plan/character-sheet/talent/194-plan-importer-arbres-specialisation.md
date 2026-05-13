# Plan d'implémentation — US10 : Importer les arbres de spécialisation

**Issue** : [#194 — US10: Importer les arbres de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/194)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/importer/oggDude.mjs` (modification), `module/importer/items/specialization-tree-ogg-dude.mjs` (création), `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (création), `module/importer/utils/specialization-tree-import-utils.mjs` (création), `module/models/specialization-tree.mjs` (modification), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (création), `tests/models/specialization-tree.test.mjs` (modification)

---

## 1. Objectif

Étendre l'import OggDude pour produire des référentiels `specialization-tree` contenant les nœuds, leurs positions, leurs coûts et leurs connexions, sans copier l'arbre sur l'acteur et sans réintroduire la logique legacy fondée sur `SwerpgTalentNode`.

Le résultat attendu est un import capable de créer des arbres exploitables par la couche domaine (US5, US6), en particulier par la résolution d'arbre et par les règles de calcul d'état et d'achat des nœuds, tout en restant résilient face aux données OggDude incomplètes.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Création d'un flux d'import dédié aux `Item` de type `specialization-tree`
- Extraction depuis les XML OggDude des informations suivantes lorsqu'elles sont disponibles :
  - spécialisation liée
  - carrière liée
  - nœuds
  - positions `row` / `column`
  - coûts
  - connexions
- Normalisation des `nodeId` selon la convention V1 `r{row}c{column}`
- Conservation des données brutes et diagnostics utiles dans `flags.swerpg.import`
- Gestion explicite des cas incomplets :
  - coût manquant
  - talent non résolu
  - connexion absente ou incohérente
  - arbre sans spécialisation exploitable
- Intégration dans le pipeline OggDude existant sans créer un nouveau domaine utilisateur séparé
- Tests unitaires et d'intégration ciblés sur le mapper et sur l'orchestration d'import

### Exclu de cette US / ce ticket

- Création d'achats acteur dans `actor.system.progression.talentPurchases`
- Copie complète d'un arbre dans les données de l'acteur
- Refonte du mapper `specialization` existant pour changer son contrat métier principal
- Rétroécriture automatique de `treeUuid` sur les spécialisations d'acteur
- Placeholder `Item talent` automatique pour toute référence inconnue
- Refonte UI de l'importeur OggDude
- Vue graphique des arbres
- Calcul des états `purchased` / `available` / `locked` / `invalid`
- Achat d'un nœud
- Migration des anciens nœuds legacy Crucible

---

## 3. Constat sur l'existant

### Le type `specialization-tree` existe déjà

Le fichier `module/models/specialization-tree.mjs` est opérationnel avec `specializationId`, `careerId`, `nodes`, `connections`, et les champs de nœud `nodeId`, `talentId`, `row`, `column`, `cost`.

Le resolver domaine `module/lib/talent-node/talent-tree-resolver.mjs` consomme déjà ce modèle. Il considère actuellement qu'un arbre est `available` si `nodes` et `connections` sont non vides, sinon `incomplete`.

### La couche domaine attend un contrat stable

Les règles de domaine actuelles des nœuds (`tests/lib/talent-node/talent-node-state.test.mjs`) supposent déjà un contrat minimal stable côté arbre :
- `nodeId`, `talentId`, `row`, `column`, `cost` sur chaque nœud
- `connections` avec `from` et `to`
- un arbre `available` a au moins un nœud et une connexion

### Le pipeline OggDude ne connaît pas `specialization-tree`

Le pipeline actuel (`module/importer/oggDude.mjs`) enregistre les domaines `talent` et `specialization`. Aucun flux `specialization-tree` n'existe.

Le mapper `module/importer/items/specialization-ogg-dude.mjs` ne crée aujourd'hui que des `Item` `specialization` avec `description`, `freeSkillRank` et `specializationSkills`. Il ne produit ni nœuds, ni coûts, ni connexions.

### Le moteur d'import force un type unique par batch

`OggDudeDataElement.processElements()` impose un `element.type` unique pour tout un batch. Un même contexte ne peut donc pas créer à la fois des `specialization` et des `specialization-tree` sans orchestration explicite supplémentaire.

### Legacy `SwerpgTalentNode` toujours présent mais non utilisé par US10

Le mapper talent actuel (`module/importer/mappers/oggdude-talent-mapper.mjs`) utilise encore `resolveTalentNode()` via `module/importer/mappings/oggdude-talent-node-map.mjs`, lui-même fondé sur `module/config/talent-tree.mjs`. US10 ne doit pas dépendre de cette structure legacy.

---

## 4. Décisions d'architecture

### 4.1. Domaine utilisateur conservé, flux interne dédié pour les arbres

**Décision** : conserver le domaine utilisateur `specialization` dans l'UI, mais ajouter un flux interne dédié `specialization-tree` qui s'exécute sous le même domaine.

Justification :
- évite de modifier l'UI de sélection des domaines
- évite de coupler deux contrats métier différents dans un seul mapper
- respecte la contrainte technique de `processElements()` qui impose un `element.type` unique par batch
- changement minimal et localisé

### 4.2. Orchestration en deux passes sous le même domaine

**Décision** : orchestrer explicitement deux passes successives dans `oggDude.mjs` lorsque le domaine `specialization` est importé :
1. Import existant des `Item` `specialization`
2. Import des `Item` `specialization-tree`

Justification :
- conserve le comportement existant du flux `specialization`
- permet d'ajouter US10 sans refactor large du moteur générique d'import
- réduit le risque de régression sur les autres domaines OggDude

### 4.3. Les arbres importés sont stockés dans `item.system`

**Décision** : les arbres importés sont stockés dans `item.system` du type `specialization-tree`, comme défini par US1 et US2.

Justification :
- conforme au modèle V1 Talents
- cohérent avec US1 et US2 déjà posées
- l'acteur ne conserve que sa progression, pas le référentiel complet
- le resolver domaine existant sait déjà consommer ce support

### 4.4. Contrat importé minimal : ce que la couche domaine consomme déjà

**Décision** : le mapper importe strictement le contrat déjà consommé par la couche domaine : `nodeId`, `talentId`, `row`, `column`, `cost`, et `connections` avec `from`, `to`, `type` (optionnel).

Justification :
- aligne US10 sur les besoins réels de US5 et US6
- évite d'ouvrir prématurément le chantier d'édition avancée ou de rendu graphique
- découple totalement V1 Talents du legacy `SwerpgTalentNode`

### 4.5. Enrichir le schéma `connections` avec un champ `type` optionnel

**Décision** : ajouter `type` (StringField optionnel) dans le schéma `connections`.

Justification :
- respecte le contrat attendu par l'issue (connexions typées `vertical`/`horizontal`)
- ne casse pas la compatibilité des arbres déjà créés
- prépare les besoins de rendu et de diagnostic futurs sans migration lourde

### 4.6. Données incomplètes : import partiel explicite, sans fallback dangereux

**Décision** : importer ce qui est fiable, marquer explicitement le reste comme incomplet ou invalide. Ne jamais deviner les valeurs manquantes.

Justification :
- conforme au cadrage `03-import-oggdude-talents.md`
- conforme à ADR-0006 sur l'isolation des erreurs par item
- évite les faux positifs métier
- conserve suffisamment de matière pour diagnostiquer et corriger les données

### 4.7. Pas de dépendance bloquante à US9 pour les talents inconnus

**Décision** : conserver le `talentId` brut, stocker le diagnostic dans `flags.swerpg.import`, et marquer l'arbre comme incomplet si des références sont non résolues.

Justification :
- évite d'élargir US10 au contrat métier du type `talent`
- maintient l'indépendance annoncée vis-à-vis de US9
- laisse la couche domaine exploiter l'arbre structurellement, tout en rendant les références non résolues visibles et diagnostiquables

### 4.8. Couverture de tests : unité + intégration ciblée

**Décision** : couvrir US10 par des tests unitaires du mapper et par un test d'intégration du pipeline d'import.

Justification :
- conforme à ADR-0004 et ADR-0012
- nécessaire pour verrouiller la double orchestration sous un même domaine utilisateur

---

## 5. Plan de travail détaillé

### Étape 1 — Enrichir le contrat du data model `specialization-tree`

**Quoi faire** : faire évoluer `module/models/specialization-tree.mjs` pour ajouter `connections[].type` comme champ optionnel (`StringField`), sans casser les arbres déjà valides.

**Fichiers** :
- `module/models/specialization-tree.mjs`
- `tests/models/specialization-tree.test.mjs`

**Risques spécifiques** :
- rendre `type` obligatoire casserait la rétrocompatibilité avec les arbres créés avant US10
- oublier d'adapter les tests du modèle ferait dériver le contrat attendu

### Étape 2 — Créer les utilitaires de normalisation et de diagnostic d'arbre

**Quoi faire** : créer `module/importer/utils/specialization-tree-import-utils.mjs` pour centraliser :
- la génération stable de `nodeId` selon la convention `r{row}c{column}`
- la normalisation des coûts et positions
- la validation structurelle minimale (coût présent, connexion cohérente, nœud résolu)
- la collecte de warnings et raisons de rejet
- les statistiques dédiées à l'import des arbres

**Fichiers** :
- `module/importer/utils/specialization-tree-import-utils.mjs`

**Risques spécifiques** :
- disperser cette logique dans le mapper rendrait les diagnostics difficiles à maintenir
- mélanger ces utilitaires avec ceux de `specialization-import-utils.mjs` augmenterait le couplage entre deux contrats différents

### Étape 3 — Implémenter le mapper dédié `specialization-tree`

**Quoi faire** : créer `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` pour transformer les données XML OggDude en sources `Item` `specialization-tree`.

Le mapper doit au minimum :
- lire l'identifiant et le nom de la spécialisation
- extraire le rattachement carrière si disponible
- construire les nœuds avec `nodeId`, `talentId`, `row`, `column`, `cost`
- construire les connexions avec `from`, `to`, `type` si disponible
- écrire les diagnostics utiles dans `flags.swerpg.import`
- isoler les erreurs arbre par arbre (pattern ADR-0006)

**Fichiers** :
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`

**Risques spécifiques** :
- dépendre du legacy `resolveTalentNode()` contaminerait le nouveau modèle
- deviner un coût manquant ou reconstruire des connexions implicites créerait des arbres faux mais apparemment valides

### Étape 4 — Créer le context builder dédié pour les arbres

**Quoi faire** : créer `module/importer/items/specialization-tree-ogg-dude.mjs` pour assembler le contexte OggDude des arbres :
- lecture des fichiers XML concernés (Specializations.xml)
- sélection des données utiles
- configuration du dossier cible (`Swerpg - Specialization Trees`)
- branchement du mapper dédié
- configuration du `element.type = 'specialization-tree'`

**Fichiers** :
- `module/importer/items/specialization-tree-ogg-dude.mjs`

**Risques spécifiques** :
- si le builder ne lit pas les mêmes variantes XML que le flux `specialization`, l'import sera incomplet selon les exports OggDude
- mal choisir le dossier cible brouillerait les référentiels monde/compendium

### Étape 5 — Orchestrer la double passe dans `oggDude.mjs`

**Quoi faire** : modifier `module/importer/oggDude.mjs` pour que le domaine utilisateur `specialization` exécute deux imports successifs :
1. le flux existant `specialization`
2. le nouveau flux `specialization-tree`

Cette orchestration doit :
- garder une seule entrée utilisateur côté domaine
- conserver des logs et stats lisibles
- ne pas marquer tout le domaine en échec si un arbre isolé est rejeté
- exposer un diagnostic clair des deux sous-passes dans les logs

**Fichiers** :
- `module/importer/oggDude.mjs`

**Risques spécifiques** :
- un reporting insuffisant rendra les échecs de la seconde passe invisibles dans l'UI ou dans les logs
- l'ordre des passes ne doit pas créer de dépendance implicite (les `specialization` peuvent être créées avant ou après les arbres)

### Étape 6 — Verrouiller la non-régression par tests

**Quoi faire** : ajouter des tests couvrant :
- mappage complet d'un arbre valide
- gestion de coûts manquants
- gestion de connexions manquantes ou invalides
- conservation des diagnostics dans `flags.swerpg.import`
- cas d'un arbre sans spécialisation exploitable
- import simultané du domaine `specialization` sans créer un nouveau domaine utilisateur
- non-régression du modèle `specialization-tree`

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- `tests/models/specialization-tree.test.mjs`
- test d'intégration complémentaire dans `tests/importer/`

**Risques spécifiques** :
- tests trop profonds sur des objets complets et verbeux, contraires à ADR-0012
- ne tester que le mapper unitaire laisserait passer une erreur d'orchestration dans `oggDude.mjs`

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/models/specialization-tree.mjs` | modification | Ajouter `connections[].type` optionnel |
| `module/importer/utils/specialization-tree-import-utils.mjs` | création | Centraliser normalisation, diagnostics et statistiques de l'import d'arbres |
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | création | Mapper dédié des XML OggDude vers les `Item` `specialization-tree` |
| `module/importer/items/specialization-tree-ogg-dude.mjs` | création | Context builder OggDude pour les arbres de spécialisation |
| `module/importer/oggDude.mjs` | modification | Orchestrer deux sous-passes dans le domaine `specialization` |
| `tests/models/specialization-tree.test.mjs` | modification | Couvrir le champ `connections[].type` et la compatibilité du modèle |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | création | Tests unitaires du mapper et des cas dégradés |
| `tests/importer/` (test pipeline) | création ou modification | Vérifier l'orchestration de la double passe sous un seul domaine utilisateur |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le moteur `processElements()` impose un seul `element.type` | Impossible de créer `specialization` et `specialization-tree` en un seul batch | Prévoir explicitement une orchestration en deux passes dans `oggDude.mjs` |
| Variantes XML OggDude non couvertes | Certains arbres ne seront jamais importés | Reprendre la stratégie de fallback déjà utilisée dans `buildJsonDataFromDirectory()` et la tester sur plusieurs formes |
| Coûts ou connexions manquants traités avec fallback implicite | Arbres faux mais apparemment valides | Ne jamais deviner les valeurs manquantes ; stocker les warnings dans `flags.swerpg.import` |
| Références talent non résolues | Nœuds structurellement présents mais métier incomplets | Conserver le `talentId` brut, exposer les diagnostics, ne pas bloquer tout le domaine |
| Régression sur le flux `specialization` existant | L'import de spécialisations simples peut casser | Isoler le nouveau code dans des modules dédiés et conserver les tests du flux existant |
| Tests trop couplés à la structure exacte des objets | Diagnostics faibles et maintenance coûteuse | Suivre ADR-0012 avec assertions ciblées sur les champs métier utiles |

---

## 8. Proposition d'ordre de commit

1. `test(model): verrouiller le contrat specialization-tree pour les connexions`
2. `feat(model): enrichir specialization-tree avec le type de connexion optionnel`
3. `feat(importer): ajouter les utilitaires d import des arbres de specialisation`
4. `feat(importer): ajouter le mapper oggdude des specialization-tree`
5. `feat(importer): brancher le context builder specialization-tree`
6. `feat(importer): orchestrer la double passe du domaine specialization`
7. `test(importer): couvrir l import oggdude des arbres de specialisation`

---

## 9. Dépendances avec les autres US

- **Dépend de US1 (#185)** : le type `specialization-tree` doit exister.
- **Dépend de US2 (#186)** : les nœuds doivent déjà porter `row`, `column` et `cost`.
- **Ne dépend pas strictement de US9 (#193)** : l'import des arbres peut fonctionner sans référentiel talent complet, à condition de diagnostiquer explicitement les références non résolues.
- **Alimente US5 (#189)** : les états de nœuds dépendent directement des nœuds et connexions importés.
- **Alimente US6 (#190)** : l'achat d'un nœud repose sur `treeId`, `nodeId`, `cost` et la structure de connexions.
- **Bénéficie à US4 (#188)** : le fallback par `specializationId` devient utile dès lors que les `specialization-tree` existent réellement dans le monde ou en compendium.
