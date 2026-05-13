# Plan d'implémentation — US4 : Ajouter les tests unitaires du mapper OggDude (format réel)

**Issue** : [#221 — US4: Ajouter les tests unitaires du mapper OggDude (format réel)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/221)
**Epic** : [#217 — EPIC: Fix OggDude Specialization Tree Import — Arbres de spécialisation vides](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` (création), `tests/fixtures/Specializations/Advisor.xml` (création), `tests/importer/specialization-tree-ogg-dude.spec.mjs` (modification ciblée éventuelle), `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` (modification ciblée éventuelle pour helper testable)

---

## 1. Objectif

Ajouter une campagne de tests unitaires / d'intégration légère autour du mapper `specialization-tree` pour figer le comportement réel OggDude à partir d'un fixture XML dérivé d'`Advisor.xml`, avec une couverture suffisante des cas nominaux, des cas limites, des diagnostics et de la rétrocompatibilité.

Le résultat attendu est le suivant :
- le format réel `TalentRows/Talents/Key` est validé sur un fixture XML lisible représentant un arbre complet de 20 nœuds ;
- les positions, `talentId`, coûts par ligne et connexions issues de `Directions` sont vérifiés de manière stable ;
- l'absence de doublons et la tolérance aux directions manquantes sont couvertes ;
- le fallback ancien format reste explicitement protégé ;
- le contrat de diagnostic sur format inconnu et warning logger reste couvert ;
- la coercition booléenne utilisée pour `Right` / `Down` est explicitée et testée.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Création d'une fixture XML minimale dérivée d'`Advisor.xml` avec 5 lignes x 4 nœuds = 20 nœuds
- Parsing de cette fixture via `parseXmlToJson()` pour reproduire la forme JSON réellement fournie au mapper
- Test nominal sur :
  - import de 20 nœuds
  - `nodeId` des premiers nœuds
  - `talentId` normalisés (`r1c1 -> plausden`, `r1c2 -> knowsom`)
  - coûts par ligne (`5`, `10`, `15`, `20`, `25`)
- Test sur les connexions générées depuis `Directions`
- Test d'absence de doublons de connexions
- Test de robustesse quand certaines directions sont absentes ou vides
- Test du format inconnu avec vérification du warning logger
- Test explicite du fallback ancien format
- Test du helper de lecture booléenne si ce helper est introduit pour rendre le contrat explicite et testable
- Assertions lisibles, ciblées et diagnostiques, conformes à ADR-0012

### Exclu de cette US / ce ticket

- Correction du mapping des nœuds → déjà couvert par `#218`
- Génération des connexions depuis `Directions` → déjà couvert par `#219`
- Enrichissement des logs de diagnostic → déjà couvert par `#220`
- Validation d'intégration Foundry complète après import utilisateur → `#222`
- Refonte globale du mapper ou mutualisation large de helpers
- Couverture exhaustive multi-fixtures de tous les arbres OggDude du jeu
- Migration de structure de données ou modification du data model `specialization-tree`

---

## 3. Constat sur l'existant

L'existant a déjà évolué sur trois tickets successifs :

- `#218` a ajouté la lecture du format réel `TalentRows.TalentRow[].Talents.Key[]`
- `#219` a ajouté la génération des connexions depuis `Directions`
- `#220` a ajouté des logs de diagnostic (`format détecté`, résumé de mapping, warnings structurels)

Le code actuel du mapper montre que :

- `extractNodesFromRows()` lit déjà `Talents.Key`, `Cost` et stocke `direction` par nœud
- `extractDirectionalConnections(nodes)` existe déjà comme fonction pure exportée
- `detectInputFormat(xmlSpecialization)` existe déjà pour distinguer `talent-rows-keys`, `talent-rows-columns`, `talent-rows-unknown`, `flat-list`, `unknown`
- le mapper journalise déjà les cas `unknown`, `talent-rows-unknown` et `directional-target-missing`
- les compteurs `rawNodeCount`, `importedNodeCount`, `importedConnectionCount` sont déjà exposés dans `flags.swerpg.import`

La couverture de test actuelle protège déjà des cas ciblés :

- ancien format à colonnes
- mapping minimal du vrai format
- quelques connexions `Right` / `Down`
- warnings de cibles manquantes
- quelques logs de diagnostic

Mais elle ne couvre pas encore de manière satisfaisante :

- un fixture XML réaliste dérivé d'un arbre réel complet
- le contrat 20 nœuds / 5 lignes de coût
- une vérification plus large des connexions réelles et de l'absence de doublons sur un arbre complet
- la forme JSON issue du vrai parsing XML du projet
- le contrat de coercition booléenne explicitement demandé par l'issue

Le fichier de cadrage référencé par l'issue est vide, donc aucune contrainte métier supplémentaire n'en découle.

---

## 4. Décisions d'architecture

### 4.1. Créer une spec dédiée fixture-driven plutôt que surcharger la spec existante

**Problème** : où placer la campagne de test plus large demandée par `#221` ?

**Options envisagées** :
- enrichir encore `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- créer une nouvelle spec dédiée au fixture XML réel

**Décision retenue** : créer une spec dédiée, par exemple `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`.

**Justification** :
- le fichier de spec existant protège déjà les contrats unitaires ciblés de `#218`, `#219` et `#220` ;
- `#221` introduit une campagne plus large et plus proche des données réelles ;
- le projet utilise déjà des specs `*.integration.spec.mjs` pour les tests basés sur des fixtures XML ;
- cela garde une séparation claire entre micro-contrats du mapper et scénario XML plus complet.

### 4.2. Utiliser une fixture XML minimale dédiée dérivée d'`Advisor.xml`

**Problème** : faut-il utiliser directement `resources/integration/Specializations/Advisor.xml` ou une fixture de test dédiée ?

**Options envisagées** :
- lire directement le fichier réel sous `resources/integration/Specializations/Advisor.xml`
- créer une fixture dédiée dans `tests/fixtures/Specializations/`

**Décision retenue** : créer une fixture dédiée dérivée d'`Advisor.xml`.

**Justification** :
- l'issue demande des fixtures minimales et lisibles ;
- le fichier de ressource réel contient du contenu hors sujet pour le mapper (description complète, autres sections non nécessaires au contrat testé) ;
- une fixture dédiée permet de ne garder que les champs réellement utiles : `Key`, `Name`, `TalentRows`, `Talents`, `Directions`, `Cost` ;
- la fixture reste revue et maintenable dans l'espace `tests/fixtures/`.

### 4.3. Parser la fixture XML via le parseur du projet

**Problème** : faut-il convertir le XML en objet JS à la main ou passer par le vrai parseur du projet ?

**Options envisagées** :
- parser "à la main" dans le test
- utiliser `module/utils/xml/parser.mjs`

**Décision retenue** : utiliser `parseXmlToJson()`.

**Justification** :
- `parseXmlToJson()` encode déjà les choix de parsing du projet (`explicitArray: false`, `trim: true`, `mergeAttrs: true`) ;
- le contrat testé doit refléter la forme JSON réellement reçue par le mapper ;
- cela évite de tester un objet artificiel trop éloigné du flux réel d'import.

### 4.4. Garder le fallback ancien format comme contrat de non-régression explicite

**Problème** : où figer la rétrocompatibilité avec l'ancien format ?

**Options envisagées** :
- considérer que les anciens tests suffisent
- ajouter un cas explicite dans `#221`

**Décision retenue** : ajouter un cas explicite de non-régression dans `#221`.

**Justification** :
- l'issue le demande explicitement ;
- `#218` a réordonné la priorité des formats, donc il est utile de garder un garde-fou durable ;
- cela évite qu'une future simplification du mapper supprime accidentellement le fallback.

### 4.5. Formaliser la coercition booléenne par un helper local si nécessaire

**Problème** : l'issue demande un test de `readBoolean()`, mais aucun helper de ce nom n'existe aujourd'hui dans le mapper.

**Options envisagées** :
- tester indirectement la coercition via `extractDirectionalConnections()`
- introduire un petit helper local `readBoolean(value)` dans le mapper, exporté si nécessaire pour les tests
- déplacer la logique dans un utilitaire partagé

**Décision retenue** : autoriser l'introduction d'un helper local pur `readBoolean(value)` dans le mapper si cela simplifie le contrat et les tests, sans créer d'utilitaire partagé transverse.

**Justification** :
- l'issue mentionne explicitement ce helper ;
- la logique actuelle est inline et dupliquée sur `Right` et `Down` ;
- un helper local garde le changement minimal tout en rendant le comportement testable et lisible ;
- extraire un utilitaire partagé serait prématuré à ce stade.

### 4.6. Assertions ciblées et métier plutôt que comparaisons profondes massives

**Problème** : comment éviter des tests verbeux et fragiles sur un arbre de 20 nœuds ?

**Décision retenue** : privilégier des assertions ciblées sur :
- `length`
- listes de `nodeId`
- listes de `talentId`
- regroupements de coûts par ligne
- présence / absence de connexions clés
- absence de doublons via cardinalité contrôlée
- appels logger ciblés

**Justification** :
- conforme à ADR-0012 ;
- les diffs seront immédiatement exploitables ;
- cela réduit le couplage à la structure interne complète des objets.

---

## 5. Plan de travail détaillé

### Étape 1 — Préparer la fixture XML minimale dérivée d'Advisor

**Quoi faire** :
- créer une fixture XML dédiée sous `tests/fixtures/Specializations/`
- conserver uniquement les champs nécessaires au mapper :
  - `Key`
  - `Name`
  - `TalentRows/TalentRow`
  - `Talents/Key`
  - `Directions/Direction`
  - `Cost`
- conserver les 5 lignes et 4 nœuds par ligne pour reproduire le contrat de 20 nœuds et les coûts `5/10/15/20/25`

**Fichiers** :
- `tests/fixtures/Specializations/Advisor.xml`

**Risques spécifiques** :
- une fixture trop "nettoyée" pourrait ne plus représenter le format réel ;
- une fixture trop proche du fichier source complet deviendrait peu lisible.

### Étape 2 — Mettre en place la lecture XML dans une spec dédiée

**Quoi faire** :
- créer une spec de type intégration légère dédiée au specialization-tree mapper
- lire la fixture XML depuis le filesystem
- parser via `parseXmlToJson()`
- extraire le sous-objet `Specialization` puis invoquer `specializationTreeMapper([specialization])`

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- éventuelle vérification de `module/utils/xml/parser.mjs` pour le pattern de test seulement

**Risques spécifiques** :
- oublier la forme racine `Specialization` ferait tester un mauvais contrat d'entrée ;
- un shim `xml2js` incorrect rendrait le test flaky ou artificiel.

### Étape 3 — Couvrir le scénario nominal complet sur 20 nœuds

**Quoi faire** :
- ajouter un test qui vérifie qu'un import depuis la fixture produit 20 nœuds
- vérifier explicitement :
  - `r1c1 -> plausden`
  - `r1c2 -> knowsom`
  - la présence de 5 lignes
  - la répartition des coûts par ligne (`5`, `10`, `15`, `20`, `25`)
- vérifier que les compteurs `rawNodeCount` et `importedNodeCount` sont cohérents

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`

**Risques spécifiques** :
- assertions trop larges sur l'objet complet ;
- dépendance implicite à un ordre de nœuds non documenté si l'intention métier est seulement la position.

### Étape 4 — Couvrir les connexions réelles et l'absence de doublons

**Quoi faire** :
- vérifier sur la fixture qu'un ensemble représentatif de connexions issues de `Right` / `Down` est présent
- vérifier qu'aucune connexion dupliquée n'est produite
- vérifier que `Left` / `Up` n'introduisent pas de doublons inverses
- vérifier que `importedConnectionCount` reflète bien le nombre final dédupliqué

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`

**Risques spécifiques** :
- choisir trop de connexions de référence rendrait le test fragile ;
- ne vérifier que la longueur totale pourrait laisser passer des erreurs de ciblage.

### Étape 5 — Couvrir les cas limites et diagnostics

**Quoi faire** :
- ajouter un cas où certaines directions sont absentes ou vides sans provoquer de crash
- ajouter un cas de format inconnu qui :
  - retourne 0 nœud exploitable
  - journalise un warning ciblé
- maintenir un cas explicite de fallback ancien format
- vérifier les warnings / logs avec assertions partielles et lisibles

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- `tests/importer/specialization-tree-ogg-dude.spec.mjs` si certains cas restent mieux placés dans la spec unitaire existante

**Risques spécifiques** :
- confondre "format inconnu" et "entrées brutes rejetées" ;
- rendre les assertions logger trop dépendantes du texte exact.

### Étape 6 — Formaliser le contrat booléen si le helper est introduit

**Quoi faire** :
- si l'implémentation introduit `readBoolean(value)`, ajouter des tests explicites sur :
  - `true`
  - `false`
  - `'true'`
  - `'false'`
  - `undefined`
- si l'implémentation décide de ne pas extraire le helper, déplacer ce contrat sur des tests ciblés de `extractDirectionalConnections()` avec entrées booléennes et stringifiées

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` uniquement si le helper local est créé

**Risques spécifiques** :
- créer un helper plus large que nécessaire ;
- sur-spécifier un comportement non utilisé ailleurs dans le mapper.

### Étape 7 — Nettoyer et réaligner la lisibilité de la suite specialization-tree

**Quoi faire** :
- vérifier que la séparation entre tests unitaires ciblés et tests fixture-driven reste claire
- conserver dans la spec existante les micro-contrats :
  - anciens formats
  - `extractDirectionalConnections()`
  - logs ciblés
- réserver la nouvelle spec au scénario XML complet

**Fichiers** :
- `tests/importer/specialization-tree-ogg-dude.spec.mjs`
- `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`

**Risques spécifiques** :
- dupliquer inutilement des cas entre les deux fichiers ;
- disperser le contrat si la frontière entre unitaire et fixture-driven n'est pas claire.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs` | Création | Ajouter la campagne principale basée sur une fixture XML dérivée d'Advisor, avec parsing réel et assertions métier ciblées |
| `tests/fixtures/Specializations/Advisor.xml` | Création | Fournir une fixture XML minimaliste et lisible représentant le vrai format OggDude à 20 nœuds |
| `tests/importer/specialization-tree-ogg-dude.spec.mjs` | Modification ciblée éventuelle | Compléter les micro-contrats non couverts par la spec fixture-driven, notamment le booléen si besoin |
| `module/importer/mappers/oggdude-specialization-tree-mapper.mjs` | Modification ciblée éventuelle | Introduire un helper local `readBoolean()` seulement si nécessaire pour rendre le contrat explicitement testable |
| `module/utils/xml/parser.mjs` | Vérification seule | Confirmer que le parseur existant fournit bien la forme d'entrée attendue en test |
| `resources/integration/Specializations/Advisor.xml` | Référence seule | Source métier du fixture dérivé, sans modification |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Fixture XML trop lourde ou trop proche du fichier de prod | Lecture et maintenance difficiles | Créer une version dérivée centrée sur les seuls champs nécessaires au mapper |
| Fixture trop simplifiée | Faux sentiment de sécurité, écart avec le format réel | Parser via `parseXmlToJson()` et conserver la structure `TalentRows/Talents/Key/Directions` intacte |
| Assertions trop profondes sur 20 nœuds | Tests fragiles et diagnostics médiocres | Vérifier des listes ciblées, des longueurs, des coûts par ligne et quelques connexions représentatives |
| Rétrocompatibilité ancien format cassée plus tard | Régression silencieuse | Ajouter un cas explicite de fallback ancien format dans la campagne #221 |
| Contrat booléen implicite | Comportement ambigu sur `true` / `false` stringifiés | Formaliser par helper local ou assertions ciblées sur la fonction pure existante |
| Couverture du logger trop couplée au texte exact | Refactorings coûteux | Utiliser `expect.stringContaining` et `expect.objectContaining` |
| Duplication entre spec unitaire et spec fixture-driven | Maintenance inutilement coûteuse | Réserver la nouvelle spec au scénario XML complet et garder la spec existante pour les micro-contrats |

---

## 8. Proposition d'ordre de commit

1. `test(importer): add specialization-tree advisor xml fixture coverage`
2. `test(importer): cover specialization-tree fallback and unknown format cases`

Si un helper booléen local est réellement nécessaire :

3. `refactor(importer): isolate specialization-tree boolean direction parsing`

Si l'implémentation reste compacte, un seul commit est acceptable :

1. `test(importer): expand specialization-tree mapper coverage for real OggDude format`

---

## 9. Dépendances avec les autres US

- **Dépend de** :
  - `#218` — le mapping des nœuds doit être stabilisé
  - `#219` — la génération des connexions depuis `Directions` doit être en place
  - `#220` — le contrat de diagnostic logger doit être disponible pour le cas "format inconnu"
- **Ne bloque pas directement** de ticket fonctionnel, mais
- **Sécurise** :
  - la maintenance future du mapper specialization-tree
  - `#222` — validation d'intégration Foundry bout en bout
- **Rôle dans l'epic** : `#221` transforme les corrections successives `#218/#219/#220` en contrat de non-régression robuste et lisible

Ordre recommandé :
1. `#218` — mapping des nœuds
2. `#219` — connexions directionnelles
3. `#220` — logs de diagnostic
4. `#221` — campagne de tests élargie
5. `#222` — validation d'intégration Foundry
