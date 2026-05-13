# Plan d'implémentation — US9 : Importer les définitions génériques de talents

**Issue** : [#193 — US9: Importer les définitions génériques de talents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/193)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`, `documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/models/talent.mjs` (modification), `module/importer/mappers/oggdude-talent-mapper.mjs` (modification), `module/importer/items/talent-ogg-dude.mjs` (modification), `module/importer/mappings/oggdude-talent-activation-map.mjs` (modification), `module/importer/utils/talent-import-utils.mjs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/importer/talent-mapper.spec.mjs` (modification), `tests/importer/` (création ou modification d'un test d'intégration ciblé)

---

## 1. Objectif

Aligner l'import OggDude des talents sur le modèle V1 Talents Edge pour produire un **référentiel de définitions génériques de talents**, exploitable par les arbres de spécialisation et la vue consolidée, sans réintroduire les hypothèses legacy de coût, de possession acteur ou d'automatisation mécanique.

Le résultat attendu est un import qui crée ou complète des `Item` `talent` représentant le talent générique avec au minimum `name`, `description`, `activation`, `ranked`, `tags`, `source`, et qui conserve les données brutes utiles au diagnostic dans `flags.swerpg.import`.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Recentrer l'import OggDude talent sur la **définition générique** du talent
- Garantir que l'import ne stocke **aucun coût XP** sur la définition générique
- Conserver les données brutes utiles au diagnostic dans `flags.swerpg.import`
- Continuer à importer dans le référentiel monde/compendium via le pipeline OggDude existant
- Faire évoluer le contrat du data model `talent` pour qu'il puisse porter une définition générique sans champs de progression incohérents
- Gérer le cas des activations inconnues de manière explicite et non silencieuse
- Préserver la résilience du pipeline d'import domaine par domaine et item par item
- Ajouter des tests de non-régression ciblant le mapper et le pipeline d'import talent

### Exclu de cette US / ce ticket

- Création d'achats acteur dans `actor.system.progression.talentPurchases`
- Import des arbres de spécialisation et des nœuds talent → US10 / US11
- Calcul de coût d'achat depuis les talents
- Automatisation mécanique des talents via `system.effects` ou `ActiveEffect`
- Refonte de l'onglet Talents ou de la vue consolidée → US12 / US13
- Migration complète ou suppression du legacy talents hors du strict nécessaire pour supporter le nouveau contrat référentiel
- Synchronisation acteur <-> embedded `Item` talent
- Import des effets mécaniques détaillés des `DieModifiers` comme logique métier canonique

---

## 3. Constat sur l'existant

### L'import talent existe déjà, mais il cible un ancien contrat trop riche

Le pipeline OggDude référence déjà le domaine `talent` dans `module/importer/oggDude.mjs` et construit un contexte via `module/importer/items/talent-ogg-dude.mjs`.

Le mapper principal `module/importer/mappers/oggdude-talent-mapper.mjs` produit aujourd'hui des `Item` `talent` avec :

- `system.node`
- `system.rank`
- `system.tier`
- `system.actions`
- `system.actorHooks`
- `system.importMeta`
- `flags.swerpg.oggdude`

Ce contrat ne correspond pas au besoin US9, qui vise une **définition générique minimale**, sans coût XP stocké sur la définition.

### Le data model `talent` porte encore des hypothèses legacy

`module/models/talent.mjs` impose aujourd'hui un schéma centré sur l'ancien usage :

- `node` (StringField, requis)
- `row` (NumberField, requis)
- `rank.idx` et `rank.cost`
- `actions`
- `actorHooks`

Le cadrage V1 dit explicitement qu'une définition générique de talent ne porte pas de coût XP, pas de position d'arbre, pas d'état acheté et pas de rang possédé par un acteur. Si US9 réutilise `Item` `talent`, le modèle doit être assoupli pour ne pas injecter de faux champs métier.

### Le stockage des données brutes n'est pas aligné sur le contrat cible

L'issue et le cadrage demandent `flags.swerpg.import`. L'import actuel écrit dans :

- `flags.swerpg.oggdude` (données brutes)
- `system.importMeta`

Ce décalage est incohérent avec `03-import-oggdude-talents.md`, `01-modele-domaine-talents.md` et ADR-0010 qui réserve `flags.swerpg.*` aux données d'import, de mapping et de traçabilité.

### L'activation inconnue est rabattue silencieusement vers `passive`

`module/importer/mappings/oggdude-talent-activation-map.mjs` retourne `passive` pour tout code inconnu. Ce comportement est trop permissif par rapport au cadrage, qui demande une valeur neutre explicite et un warning non bloquant.

### La résolution temporaire côté US7 dépend déjà de `Item` `talent`

Le plan US7 et le module `owned-talent-summary` partent du principe que les définitions de talents pourront être lues depuis des `Item` `talent` monde/compendium. US9 doit stabiliser ce référentiel, pas introduire un second support concurrent.

---

## 4. Décisions d'architecture

### 4.1. Réutiliser `Item` `talent` comme référentiel canonique

**Décision** : réutiliser `Item` `talent` comme support canonique des définitions génériques, en assouplissant son data model pour qu'il puisse représenter un talent générique sans induire de faux champs métier.

Justification :
- évite de créer deux référentiels parallèles pour un même concept
- cohérent avec le resolver temporaire déjà anticipé par US7
- limite la dispersion de lecture côté UI et domaine

### 4.2. Le coût XP est strictement exclu de la définition générique

**Décision** : la définition générique importée ne porte aucun coût XP ; le contrat mapper retire toute dépendance à `system.rank.cost`.

Justification :
- conforme à l'issue #193
- conforme au cadrage `01-modele-domaine-talents.md` et `02-regles-achat-progression.md`
- évite une fausse source de vérité

### 4.3. Données brutes dans `flags.swerpg.import`

**Décision** : remplacer l'usage principal de `flags.swerpg.oggdude` et `system.importMeta` par `flags.swerpg.import` pour les données brutes et de diagnostic pertinentes.

Justification :
- conforme à l'issue et au cadrage
- conforme à ADR-0010
- homogénéise la stratégie d'observabilité import

### 4.4. Activation inconnue : valeur neutre explicite, pas de fallback silencieux

**Décision** : introduire une valeur d'activation neutre pour les cas non spécifiés ou inconnus, avec warning de mapping, plutôt qu'un fallback silencieux vers `passive`.

Justification :
- conforme au cadrage `03-import-oggdude-talents.md`
- évite une corruption discrète de la donnée métier
- améliore le diagnostic

### 4.5. `DieModifiers` restent des données descriptives, pas des effets automatisés

**Décision** : US9 ne transforme pas les `DieModifiers` en `system.effects` métier canonique ; ils enrichissent la description et les flags d'import.

Justification :
- conforme à l'issue
- conforme à ADR-0010
- évite d'ouvrir prématurément le chantier d'automatisation mécanique

### 4.6. Résilience item par item

**Décision** : conserver le pattern de try/catch par talent dans le mapper, avec accumulation de métriques et diagnostics, sans bloquer tout le domaine sur un talent invalide.

Justification :
- cohérent avec ADR-0006
- soutient le critère "aucune régression sur l'import OggDude existant"

### 4.7. Tests unitaires + intégration

**Décision** : US9 inclut des tests unitaires sur le contrat mapper et un test d'intégration du pipeline d'import talent.

Justification :
- conforme à ta décision validée
- conforme à ADR-0004 et ADR-0012
- nécessaire pour le critère de non-régression

---

## 5. Plan de travail détaillé

### Étape 1 — Recadrer le contrat métier du `Item` `talent`

**Quoi faire** : analyser puis faire évoluer `module/models/talent.mjs` pour que le type `talent` puisse représenter un talent générique sans exiger `node`, `row`, `rank` ou `actorHooks` comme champs obligatoires pour la définition référentielle.

**Fichiers** :
- `module/models/talent.mjs`

**Risques** : casser des usages legacy qui supposent `node` ou `rank` toujours présents. Introduire une ambiguïté entre ancien talent "achetable" et nouveau talent "référentiel".

### Étape 2 — Stabiliser le schéma minimal produit par le mapper talent

**Quoi faire** : faire évoluer `module/importer/mappers/oggdude-talent-mapper.mjs` pour ne produire que le contrat utile à la définition générique : `name`, `description`, `activation`, `isRanked`, `tags`, `source`, `flags.swerpg.import`. Retirer les champs legacy `node`, `rank`, `tier`, `actorHooks` du flux importé.

**Fichiers** :
- `module/importer/mappers/oggdude-talent-mapper.mjs`
- éventuellement `module/importer/mappings/oggdude-talent-rank-map.mjs`
- éventuellement `module/importer/mappings/oggdude-talent-diemodifiers-map.mjs`

**Risques** : conserver par inadvertance des champs legacy dans `system`. Perdre des informations de diagnostic si le transfert vers `flags.swerpg.import` n'est pas complet.

### Étape 3 — Revoir la gestion de l'activation inconnue

**Quoi faire** : adapter le mapping d'activation pour distinguer les cas connus des cas inconnus/non spécifiés. Ajouter la valeur neutre dans les constantes système et l'i18n.

**Fichiers** :
- `module/importer/mappings/oggdude-talent-activation-map.mjs`
- `module/config/attributes.mjs`
- `lang/fr.json`
- `lang/en.json`

**Risques** : casser des `StringField` existants si la nouvelle valeur n'est pas déclarée partout. Faire apparaître un libellé non localisé dans l'UI.

### Étape 4 — Aligner le builder d'import talent

**Quoi faire** : adapter `module/importer/items/talent-ogg-dude.mjs` pour que le builder et le pipeline d'items créés s'alignent sur le nouveau contrat mapper, en conservant la compatibilité avec `OggDudeDataElement.processElements()`.

**Fichiers** :
- `module/importer/items/talent-ogg-dude.mjs`
- `module/importer/utils/talent-import-utils.mjs`

**Risques** : divergence entre le mapper unitaire et le flux réel d'import. Régression des métriques d'import talent.

### Étape 5 — Verrouiller la non-régression par tests

**Quoi faire** : compléter les tests pour couvrir : absence de coût XP sur la définition générique, présence de `flags.swerpg.import`, conservation de `name`/`description`/`activation`/`ranked`/`tags`/`source`, comportement sur activation inconnue, résilience sur talent invalide, absence de création d'état acteur.

**Fichiers** :
- `tests/importer/talent-mapper.spec.mjs`
- nouveau test d'intégration dans `tests/importer/`

**Risques** : tests trop couplés à l'ancienne structure `rank/node/actions`. Couverture insuffisante du pipeline réel malgré des tests unitaires verts.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/models/talent.mjs` | modification | Recadrer le data model pour porter une définition générique sans coût ni nœud obligatoires |
| `module/importer/mappers/oggdude-talent-mapper.mjs` | modification | Réduire la sortie du mapper au contrat US9 et déplacer les données brutes vers `flags.swerpg.import` |
| `module/importer/items/talent-ogg-dude.mjs` | modification | Aligner le builder d'import talent sur le nouveau contrat mapper |
| `module/importer/mappings/oggdude-talent-activation-map.mjs` | modification | Gérer explicitement les activations inconnues / non spécifiées |
| `module/importer/mappings/oggdude-talent-rank-map.mjs` | modification potentielle | Neutraliser l'usage legacy du coût/rang dans le contrat importé |
| `module/importer/mappings/oggdude-talent-diemodifiers-map.mjs` | modification potentielle | Limiter les enrichissements à la description/flags sans automatisation métier |
| `module/importer/utils/talent-import-utils.mjs` | modification | Compléter la télémétrie et les raisons de rejet / warning spécifiques à US9 |
| `module/config/attributes.mjs` | modification potentielle | Ajouter une valeur d'activation neutre |
| `lang/fr.json` | modification | Libellés i18n pour l'activation neutre et les diagnostics |
| `lang/en.json` | modification | Même besoin côté anglais |
| `tests/importer/talent-mapper.spec.mjs` | modification | Mettre à jour le contrat attendu et couvrir les cas US9 |
| `tests/importer/` | création ou modification | Ajouter un test d'intégration du flux d'import talent |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le data model `talent` reste trop legacy | Les talents importés portent des champs incohérents ou un faux coût | Verrouiller d'abord le contrat du modèle avant de retoucher le mapper |
| Activation inconnue convertie en `passive` | Référentiel importé faux mais apparemment valide | Ajouter un cas de test explicite et une valeur neutre documentée |
| Données brutes non transférées vers `flags.swerpg.import` | Diagnostic et corrections futures plus difficiles | Définir un sous-contrat minimal des flags import et le tester |
| Le pipeline réel diverge du mapper testé | Régression invisible malgré des tests unitaires verts | Ajouter un test d'intégration passant par `talent-ogg-dude.mjs` |
| L'évolution du type `talent` casse des usages legacy | Régressions sur la sheet talent ou d'anciens flux | Limiter le changement au strict nécessaire et couvrir les invariants critiques par tests |
| Les `DieModifiers` réouvrent le chantier des effets | US9 déborde vers ADR-0010 | Maintenir `DieModifiers` en données brutes / descriptives en V1 |

---

## 8. Proposition d'ordre de commit

1. `test(importer): verrouiller le contrat US9 des définitions génériques de talents`
2. `refactor(talent): recadrer le data model pour les définitions génériques`
3. `feat(importer): aligner le mapper OggDude talent sur le référentiel V1`
4. `feat(importer): stocker les diagnostics talent dans flags.swerpg.import`
5. `test(importer): couvrir la non-régression du pipeline d import talent`

---

## 9. Dépendances avec les autres US

- **Dépend de US1 (#185)** : le socle référentiel de l'épic (type `specialization-tree`) doit exister.
- **Indépendant des règles d'achat** : US9 ne dépend pas d'US5/US6 pour être livré.
- **Prépare US7 / US12 / US13** : un référentiel talent stabilisé rend plus propre la résolution des définitions dans la vue consolidée et l'onglet Talents.
- **Complément naturel de US10 / US11** : US9 couvre la définition générique ; US10 et US11 couvriront les arbres, nœuds et données incomplètes d'import.
