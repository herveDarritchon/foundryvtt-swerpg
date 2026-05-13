# Plan d'implémentation — US7 : Consolider les talents possédés

**Issue
** : [#191 — US7: Consolider les talents possédés](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/191)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`,
`documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/lib/talent-node/owned-talent-summary.mjs` (création),
`tests/lib/talent-node/owned-talent-summary.test.mjs` (création), `tests/utils/talents/talent.mjs` (modification, si
fixture réutilisée)

---

## 1. Objectif

Construire une vue consolidée des talents possédés par un acteur à partir de la source de vérité V1
`actor.system.progression.talentPurchases`.

Cette vue doit rester dérivée, non persistée, et fournir un contrat domaine testable sans dépendre de la fiche
personnage ni de la création d'`Item` embarqués sur l'acteur. Elle servira ensuite d'entrée pour l'onglet Talents de la
fiche (US12).

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Création d'un module domaine pur chargé de consolider les achats de nœuds par `talentId`
- Regroupement des achats multi-nœuds portant le même talent
- Calcul du rang consolidé pour les talents ranked
- Déduplication des talents non-ranked présents dans plusieurs arbres
- Exposition, pour chaque talent consolidé, des données suivantes :
    - `talentId`
    - `name`
    - `activation`
    - `isRanked`
    - `rank`
    - `sources`
- Réutilisation de la résolution spécialisation -> arbre déjà introduite par US4
- Résolution temporaire des définitions génériques de talents à partir des `Item` `talent` existants du monde/compendium
- Gestion des cas dégradés :
    - arbre introuvable
    - nœud introuvable
    - définition de talent introuvable
    - source incomplète
- Tests Vitest couvrant les cas métier nominaux et dégradés

### Exclu de cette US / ce ticket

- Refonte visuelle de l'onglet Talents -> US12 / US13
- Modification de `module/applications/sheets/character-sheet.mjs`
- Modification de `templates/sheets/actor/talents.hbs`
- Achat de talents depuis l'onglet
- Persistance de la vue consolidée sur l'acteur
- Création d'`Item` `talent` embarqués pour refléter la consolidation
- Automatisation des effets mécaniques des talents
- Migration ou suppression du legacy talents hérité de Crucible
- Alignement définitif avec un futur référentiel générique de talents importé par US9 si celui-ci évolue ensuite

---

## 3. Constat sur l'existant

### La source de vérité V1 existe, mais la vue consolidée n'existe pas

Le modèle `character` porte déjà `system.progression.talentPurchases[]` dans `module/models/character.mjs`, avec les
quatre références minimales :

- `treeId`
- `nodeId`
- `talentId`
- `specializationId`

US6 persiste ces achats et met à jour l'XP via `module/lib/talent-node/talent-node-purchase.mjs`.

En revanche, aucun module ne construit aujourd'hui une vue consolidée acteur -> talents possédés.

### La résolution spécialisation -> arbre est disponible

`module/lib/talent-node/talent-tree-resolver.mjs` permet déjà de résoudre une spécialisation possédée vers son
`specialization-tree`, avec états `available`, `unresolved`, `incomplete`.

US7 doit réutiliser cette brique plutôt que reconstituer sa propre logique de résolution.

### La fiche personnage est encore pilotée par les `Item` embarqués

`module/applications/sheets/character-sheet.mjs#buildTalentList()` lit uniquement `this.actor.items` :

- les non-ranked sont listés unitairement ;
- les ranked sont regroupés par `name`, pas par `talentId` ;
- aucune source de spécialisation n'est exposée ;
- aucun lien n'est fait avec `talentPurchases`.

Le template `templates/sheets/actor/talents.hbs` suppose aussi qu'une ligne correspond à un `Item` embarqué
supprimable/éditable.

US7 ne doit pas corriger cette UI, mais doit préparer la donnée domaine qui la remplacera plus tard.

### Le legacy talents reste incompatible avec la V1

`module/documents/actor-mixins/talents.mjs` continue à gérer la possession de talents via `Item` embarqués et
`addTalentWithXpCheck()` applique encore un coût hardcodé de `5`.

Ce legacy ne doit pas être réutilisé comme source de vérité de la consolidation V1.

### La résolution de définition générique de talent n'est pas encore canonisée

L'issue demande `name`, `activation`, `ranked / non-ranked`, mais `talentPurchases` ne porte que `talentId`.

À ce stade du chantier, aucun resolver V1 dédié n'existe pour transformer `talentId` en définition générique de talent.
Le projet possède toutefois déjà des `Item` de type `talent` et un modèle `module/models/talent.mjs` qui expose
notamment :

- `activation`
- `isRanked`

US7 doit donc s'appuyer temporairement sur ces `Item` `talent` comme référentiel de lecture, sans en faire la source de
vérité de possession.

---

## 4. Décisions d'architecture

### 4.1. La vue consolidée reste une donnée dérivée non persistée

**Décision** : construire la consolidation à la volée depuis `actor.system.progression.talentPurchases`, sans écrire de
cache dans `actor.system` ni dans `actor.flags`.

Justification :

- conforme à l'issue ;
- conforme au cadrage `01-modele-domaine-talents.md` et `04-ui-onglet-talents.md` ;
- évite toute deuxième source de vérité ;
- garde US7 indépendante de l'UI et des migrations de données.

### 4.2. Créer un module domaine dédié dans `module/lib/talent-node/`

**Décision** : créer `module/lib/talent-node/owned-talent-summary.mjs`.

Options envisagées :

- étendre `talent-node-state.mjs`
- ajouter la logique dans `character-sheet.mjs`
- ajouter la logique dans le legacy `module/lib/talents/`

Décision retenue :

- module dédié, voisin du resolver et du purchase flow.

Justification :

- la consolidation est une responsabilité distincte du calcul d'état des nœuds ;
- l'issue demande un calcul testable sans Foundry UI ;
- ce module pourra être réutilisé par US12 et US13.

### 4.3. Regrouper strictement par `talentId`

**Décision** : le regroupement consolidé se fait uniquement par `talentId`, jamais par `name`.

Justification :

- conforme à l'issue ;
- plus robuste que le regroupement actuel par nom dans la fiche ;
- évite les doublons ou fusions erronées en cas de libellés éditoriaux proches ou traduits.

### 4.4. Résoudre temporairement les définitions de talents via les `Item` `talent` existants

**Décision** : pour exposer `name`, `activation` et `isRanked`, US7 utilise un resolver local qui lit les `Item`
`talent` existants du monde/compendium.

Règle recommandée :

- priorité à une correspondance stable documentée entre `purchase.talentId` et la définition talent disponible ;
- si la définition est introuvable, produire une entrée dégradée plutôt qu'un échec silencieux.

Justification :

- l'issue demande les données d'affichage métier dès US7 ;
- un référentiel talent V1 plus abouti n'est pas encore formalisé dans le flux livré ;
- cette approche permet d'avancer sans réintroduire les `Item` embarqués comme source de vérité d'acteur.

Point d'attention :

- ce resolver doit être explicitement présenté comme transitoire tant que la stratégie finale de référentiel générique
  n'est pas stabilisée par les US d'import talents.

### 4.5. Règles de consolidation

**Décision** :

- un talent ranked donne une seule entrée consolidée ;
- son `rank` correspond au nombre d'achats de nœuds portant ce `talentId` ;
- un talent non-ranked donne une seule entrée, même si plusieurs nœuds ont été achetés ;
- chaque entrée expose l'ensemble de ses `sources`.

Forme indicative de sortie :

```js
{
  talentId: 'talent-parry',
    name
:
  'Parer',
    activation
:
  'active',
    isRanked
:
  true,
    rank
:
  2,
    sources
:
  [
    {
      specializationId: 'bodyguard',
      specializationName: 'Bodyguard',
      treeId: 'bodyguard-tree',
      treeName: 'Bodyguard',
      nodeId: 'r1c1'
    },
    {
      specializationId: 'mercenary-soldier',
      specializationName: 'Mercenary Soldier',
      treeId: 'merc-tree',
      treeName: 'Mercenary Soldier',
      nodeId: 'r2c1'
    }
  ]
}
```

Justification :

- conforme à `02-regles-achat-progression.md` ;
- conforme à `04-ui-onglet-talents.md` ;
- prépare directement les besoins de US12 / US13.

### 4.6. Les données incomplètes doivent produire des entrées exploitables

**Décision** : si une partie de la chaîne de résolution est absente, la consolidation doit continuer avec un état
dégradé documenté, au lieu d'ignorer silencieusement l'achat.

Cas minimaux à couvrir :

- arbre introuvable ;
- nœud introuvable ;
- spécialisation source absente ;
- définition de talent introuvable.

Justification :

- conforme au cadrage UI : ne pas bloquer tout l'onglet ;
- facilite le diagnostic et les imports partiels ;
- évite de masquer des données réellement achetées par l'acteur.

### 4.7. US7 reste strictement domaine

**Décision** : US7 ne modifie ni la fiche personnage ni les templates Handlebars.

Justification :

- choix explicite retenu pendant la préparation du plan ;
- cohérent avec le découpage du document `07-plan-issues-github.md` ;
- réduit le risque de mélanger domaine et UI.

---

## 5. Plan de travail détaillé

### Étape 1 — Définir le contrat public de la consolidation

**Quoi faire** : créer un point d'entrée unique dans `module/lib/talent-node/owned-talent-summary.mjs`, par exemple
`buildOwnedTalentSummary(actor)`.

**Contrat attendu** :

- entrée : acteur character
- sortie : tableau d'entrées consolidées triables/affichables
- sortie stable même en présence de données partielles

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- contrat trop couplé à l'UI future ;
- contrat trop pauvre, forçant US12 à recalculer une partie des données.

### Étape 2 — Indexer les achats acteur par `talentId`

**Quoi faire** : lire `actor.system.progression.talentPurchases[]`, normaliser la collection, puis regrouper les achats
par `talentId`.

**À produire par groupe** :

- liste des achats bruts ;
- nombre d'achats ;
- ensemble des sources candidates ;
- métadonnées minimales pour la résolution des arbres et spécialisations.

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- compter deux fois un achat dupliqué par erreur de données ;
- introduire un regroupement par nom ou par arbre au lieu du `talentId`.

### Étape 3 — Résoudre les sources spécialisation / arbre / nœud

**Quoi faire** : pour chaque achat :

- retrouver la spécialisation possédée correspondante ;
- résoudre l'arbre via `resolveSpecializationTree()`;
- retrouver le nœud concerné dans l'arbre ;
- enrichir la source avec les informations lisibles disponibles.

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- dupliquer la logique de US4 ;
- échouer totalement sur un achat alors qu'une source dégradée aurait suffi.

### Étape 4 — Résoudre la définition générique du talent

**Quoi faire** : centraliser dans le module la recherche de la définition de talent à partir des `Item` `talent`
existants.

**Objectif** :

- récupérer au minimum `name`, `activation`, `isRanked`, et l'image si utile plus tard ;
- expliciter la stratégie de lookup retenue ;
- prévoir le cas `definition introuvable`.

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- absence de clé de jointure réellement stable entre `talentId` et `Item talent` ;
- dépendance implicite à une convention non documentée dans les données du monde.

### Étape 5 — Appliquer les règles ranked / non-ranked

**Quoi faire** :

- si `isRanked === true`, calculer `rank = nombre d'achats du groupe` ;
- si `isRanked === false`, ne produire qu'une seule entrée, avec `rank = 1` ou `null` selon le contrat retenu ;
- conserver toutes les `sources`.

**Recommandation** :

- utiliser un contrat explicite pour le rang des non-ranked afin d'éviter des ambiguïtés UI ultérieures.

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- confondre possession multi-source et cumul mécanique ;
- introduire un comportement différent entre ranked et non-ranked non documenté dans le contrat.

### Étape 6 — Gérer les cas dégradés sans masquer les achats

**Quoi faire** : définir une convention de sortie pour les entrées ou sources incomplètes.

**Exemples de données à exposer** :

- `name: '[Talent non résolu]'`
- `activation: null`
- `isRanked: null`
- `sources[].resolutionState: 'tree-unresolved' | 'node-missing' | 'talent-missing'`

**Fichiers** :

- `module/lib/talent-node/owned-talent-summary.mjs` (création)

**Risques spécifiques** :

- faire disparaître des achats valides de l'acteur ;
- surcharger trop tôt le contrat avec des états UI.

### Étape 7 — Couvrir le module par des tests ciblés et lisibles

**Quoi faire** : créer `tests/lib/talent-node/owned-talent-summary.test.mjs` avec des assertions ciblées conformément à
ADR-0012.

**Scénarios minimaux** :

- un talent non-ranked acheté une fois ;
- un talent ranked acheté plusieurs fois dans le même arbre ou plusieurs arbres ;
- un talent non-ranked acheté via plusieurs sources ;
- une spécialisation dont l'arbre est introuvable ;
- un nœud acheté mais absent de l'arbre résolu ;
- une définition `Item talent` introuvable ;
- acteur sans `talentPurchases` ou avec tableau vide.

**Fichiers** :

- `tests/lib/talent-node/owned-talent-summary.test.mjs` (création)
- `tests/utils/talents/talent.mjs` (modification, si aide de fixture nécessaire)

**Risques spécifiques** :

- assertions trop profondes et peu diagnostiques ;
- tests qui dépendent trop de mocks Foundry complets au lieu de contrats métier simples.

---

## 6. Fichiers modifiés

| Fichier                                               | Action                  | Description du changement                                                                               |
|-------------------------------------------------------|-------------------------|---------------------------------------------------------------------------------------------------------|
| `module/lib/talent-node/owned-talent-summary.mjs`     | Création                | Module domaine pur de consolidation des talents possédés à partir de `talentPurchases`                  |
| `tests/lib/talent-node/owned-talent-summary.test.mjs` | Création                | Couverture Vitest des règles de consolidation ranked / non-ranked et des cas dégradés                   |
| `tests/utils/talents/talent.mjs`                      | Modification éventuelle | Ajout d'un helper de fixture pour des définitions `Item talent` si cela réduit la duplication des tests |

---

## 7. Risques

| Risque                                                                             | Impact                                                                                | Mitigation                                                                                                 |
|------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| Pas de clé de jointure canonique entre `talentId` et les `Item` `talent` existants | La consolidation ne peut pas exposer `name`, `activation`, `isRanked` de façon fiable | Documenter explicitement la stratégie de lookup, la tester, et prévoir un mode dégradé `talent non résolu` |
| Coexistence entre V1 `talentPurchases` et legacy `Item` talents embarqués          | L'UI actuelle et la vue consolidée peuvent diverger temporairement                    | Garder US7 strictement domaine et documenter que la fiche actuelle n'est pas encore consommateur canonique |
| Arbres ou nœuds incomplets                                                         | Sources partielles, rang ou provenance incomplets                                     | Réutiliser le resolver US4, porter des états dégradés explicites par source                                |
| Tentation de persister la vue consolidée pour simplifier la future UI              | Introduction d'une seconde source de vérité                                           | Interdire explicitement toute écriture acteur dans le module US7                                           |
| Tests trop couplés à la structure interne du résultat                              | Maintenance coûteuse et diagnostics médiocres                                         | Appliquer ADR-0012 avec assertions ciblées sur `talentId`, `rank`, `sources.length`, `resolutionState`     |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-node): add owned talent summary builder from talent purchases`
2. `test(talent-node): cover ranked, non-ranked and degraded owned talent summaries`

Option si une fixture dédiée est introduite :

3. `test(fixtures): add talent definition helpers for owned talent summary`

---

## 9. Dépendances avec les autres US

### Dépendances amont

- **US3 / #187** : fournit `actor.system.progression.talentPurchases`
- **US4 / #188** : fournit la résolution spécialisation -> arbre
- **US5 / #189** : pas strictement nécessaire au calcul de consolidation, mais fait partie du socle domaine V1 cohérent
- **US6 / #190** : produit les achats de nœuds que US7 consolide

### Dépendances aval

- **US12** : consommera cette vue consolidée pour refondre l'onglet Talents
- **US13** : enrichira l'affichage des rangs et des sources
- **US9 / US10 / US11** : pourront plus tard durcir ou remplacer la stratégie transitoire de résolution des définitions
  de talents, sans remettre en cause la règle centrale de consolidation par `talentId`

### Ordre recommandé

1. livrer US3 à US6 ;
2. livrer US7 comme brique domaine autonome ;
3. brancher cette brique dans l'UI seulement en US12.
