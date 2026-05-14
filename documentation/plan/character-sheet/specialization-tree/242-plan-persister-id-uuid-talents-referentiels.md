# Plan d'implémentation — #242 : Persister `system.id` et `system.uuid` sur les talents créés et importés

**Issue
** : [#242 — Persister system.uuid sur les talents crees et importes](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/242)  
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`  
**Module(s) impacté(s)** : `module/models/talent.mjs`, `module/importer/mappers/oggdude-talent-mapper.mjs`,
`module/settings/models/OggDudeDataElement.mjs`, `module/utils/storage/world-item-storage-target.mjs`,
`module/utils/storage/compendium-item-storage-target.mjs`, `module/documents/item.mjs`,
`tests/importer/talent-mapper.spec.mjs`, `tests/documents/item.test.mjs`, tests d'intégration import talent à compléter

---

## 1. Objectif

Poser le socle d'identification des items `talent` référentiels conformément à l'ADR-0013 :

- `system.id` = clé métier stable ;
- `system.uuid` = UUID Foundry réel du document créé.

Le ticket couvre uniquement les talents référentiels :

- créés dans le monde ;
- créés dans un compendium ;
- importés via l'importer OggDude.

Il ne couvre pas les talents embarqués sur actor, ni la résolution `node -> talentUuid` des `specialization-tree`.

---

## 2. Périmètre

### Inclus dans ce ticket

- Ajout des champs `system.id` et `system.uuid` au data model `talent`.
- Garantie que les talents importés via OggDude portent une clé métier stable dans `system.id`.
- Garantie que les talents créés dans le monde et en compendium portent `system.uuid === item.uuid` après création.
- Mise en place du mécanisme technique de post-création pour renseigner `system.uuid` sur les talents référentiels créés
  par les storage targets de l'importer.
- Définition explicite du comportement attendu pour la création directe des talents référentiels.
- Tests ciblés sur :
    - projection `system.id` dans le mapper ;
    - persistance `system.uuid` après création world et compendium.

### Exclu de ce ticket

- Talents embarqués sur actor via `createEmbeddedDocuments('Item', ...)`.
- Migration / rétrocompatibilité des mondes existants.
- Enrichissement des nœuds `specialization-tree` avec `talentUuid` (ticket #243).
- Résolution UI par `talentUuid` (ticket #244).
- Refactor global des autres types d'items.
- Correction du fallback `fromUuidSync(node.talentId)` dans l'UI graphique.

---

## 3. Constat sur l'existant

### 3.1. Le modèle talent ne porte pas encore le double identifiant cible

Dans `module/models/talent.mjs`, le schéma expose des champs métier et techniques liés au gameplay (`node`, `trees`,
`activation`, `rank`), mais pas `system.id` ni `system.uuid`. Le contrat ADR-0013 ne peut donc pas s'exprimer au niveau
du data model.

### 3.2. Le mapper OggDude conserve la clé métier uniquement dans un flag

Dans `module/importer/mappers/oggdude-talent-mapper.mjs`, la clé OggDude est conservée dans `flags.swerpg.oggdudeKey`
mais n'est jamais projetée dans `system.id`. Le repo dispose donc d'une source métier exploitable mais qui n'est pas
encore placée dans le modèle cible.

### 3.3. L'importer crée les documents sans post-traitement UUID

Le flux d'import passe par `OggDudeDataElement.processElements()` → `storageTarget.createDocuments(mappedItems)` →
`Item.createDocuments(...)`. Aucun enrichissement post-création n'écrit `system.uuid` avec la valeur réelle de
`item.uuid`.

### 3.4. La création directe des talents référentiels n'a pas de stratégie explicite

`module/documents/item.mjs` contient un `_preCreate`, mais uniquement pour les items owned et pour `keepId`. Ce n'est
pas le point adapté pour garantir `system.uuid === item.uuid` sur des items référentiels : l'UUID réel n'est connu
qu'après création, et le flux d'import batch est structuré autour de `createDocuments()`.

### 3.5. Les talents actor-owned existent mais sont hors périmètre

Des chemins comme `trained-talent.mjs` ou `actor-mixins/talents.mjs` créent des talents embarqués sur actor via
`createEmbeddedDocuments`. Tu as explicitement exclu ce cas, ce qui évite de mélanger identité du talent référentiel et
état d'acquisition sur l'acteur.

### 3.6. La couverture de tests existe mais ne valide pas encore le nouveau contrat

Les tests actuels valident le mapper talent et certains flux document, mais ne couvrent pas encore explicitement
`system.id` comme clé métier stable ni `system.uuid` comme UUID Foundry réel.

---

## 4. Décisions d'architecture

### 4.1. `system.id` fait partie du ticket #242

**Décision** : intégrer `system.id` dans le périmètre de #242, en plus de `system.uuid`.

**Justification** : `system.uuid` seul ne suffit pas à appliquer l'ADR-0013. Le ticket doit poser le socle
d'identification complet des talents référentiels. Le ticket #243 pourra ensuite enrichir les nœuds avec `talentUuid` en
s'appuyant sur un modèle talent déjà stabilisé. Confirmé avec toi lors de la revue du plan.

### 4.2. Les talents actor-owned restent exclus

**Décision** : ne pas couvrir les créations via `createEmbeddedDocuments('Item', ...)` sur actor.

**Justification** : ce sont des objets d'état / acquisition, pas le référentiel talent cible du cadrage. Inclure
brouillerait le domaine du ticket.

### 4.3. La clé métier OggDude est projetée dans `system.id`

**Décision** : utiliser la clé métier déjà déterminée par le mapper (`context.key`) comme valeur de `system.id`.

**Justification** : `context.key` est déjà la meilleure source métier disponible dans l'import actuel.
`flags.swerpg.oggdudeKey` peut rester comme trace d'import mais ne doit pas être la seule porte d'entrée pour l'identité
métier.

### 4.4. `system.uuid` est renseigné après création, pas avant

**Décision** : renseigner `system.uuid` dans un post-traitement après `Item.createDocuments(...)`.

**Justification** : conforme ADR-0013. L'UUID réel n'est connu qu'après création. Fonctionne aussi bien pour le monde
que pour le compendium.

### 4.5. Le point de centralisation est le stockage, pas le mapper

**Décision** : le mapper prépare `system.id`, mais le renseignement de `system.uuid` se fait au moment du stockage, dans
le flux commun qui reçoit les documents créés.

**Justification** : séparation claire des responsabilités : mapper = données métier source ; stockage = interaction
réelle avec Foundry.

### 4.6. Création directe = item référentiel monde ou compendium, pas actor-owned

**Décision** : la "création directe" concerne la création d'un item `talent` référentiel via les APIs Foundry monde ou
compendium. Confirmé avec toi lors de la revue du plan.

---

## 5. Plan de travail détaillé

### Étape 1 — Ajouter `system.id` et `system.uuid` au data model talent

**À faire**

- Ajouter `id` (StringField, requis) et `uuid` (StringField, requis, blank, initial `''`) au schéma `SwerpgTalent` dans
  `module/models/talent.mjs`.
- `uuid` doit accepter une chaîne vide à la création (il sera rempli après création).

**Fichiers**

- `module/models/talent.mjs`

**Risques**

- Collision potentielle entre `item.id` Foundry et `system.id` métier : imposer des assertions claires dans les tests et
  le code review.

---

### Étape 2 — Projeter la clé OggDude dans `system.id` lors du mapping

**À faire**

- Dans `OggDudeTalentMapper.transform()`, ajouter `system.id = context.key` (normalisé en lowercase).
- Conserver `flags.swerpg.oggdudeKey` comme métadonnée d'import.

**Fichiers**

- `module/importer/mappers/oggdude-talent-mapper.mjs`

**Risques**

- Divergence de normalisation si la clé source existe sous plusieurs formes. Une seule source de vérité : `context.key`.

---

### Étape 3 — Ajouter le post-traitement `system.uuid` après `createDocuments`

**À faire**

- Créer un utilitaire ou une méthode de post-traitement qui, après `Item.createDocuments(items)` sur les talents, itère
  les documents créés et met à jour `system.uuid` avec `item.uuid`.
- Intégrer ce post-traitement dans `OggDudeDataElement.processElements()` après `storageTarget.createDocuments(...)`.
- Filtrer pour ne l'appliquer qu'aux items de type `talent`.

**Fichiers**

- `module/settings/models/OggDudeDataElement.mjs`
- `module/utils/storage/world-item-storage-target.mjs` (si besoin d'exposer un hook)
- `module/utils/storage/compendium-item-storage-target.mjs` (idem)

**Risques**

- Surcoût en écriture post-création. Mitigation : ne toucher que les talents.
- Nécessité de bien distinguer les types d'items.

---

### Étape 4 — Cadrer la création directe des talents référentiels

**À faire**

- Identifier si un mécanisme dédié est nécessaire pour les créations directes hors importer.
- Si oui, l'ajouter sous forme d'un helper ou d'une extension document ciblée.
- Sinon, documenter que le flux import couvre déjà le cas nominal.

**Fichiers potentiels**

- `module/documents/item.mjs`
- Ou un nouveau utilitaire dédié

**Risques**

- Éviter une solution trop large qui s'appliquerait aussi aux embedded items.

---

### Étape 5 — Ajouter les tests

**À faire**

- **Mapper** : vérifier que `system.id` est présent et correspond à la clé métier stable.
- **Post-traitement** : vérifier que les talents créés en world et compendium ont `system.uuid === item.uuid`.
- **Non-régression** : vérifier que les autres types d'items ne sont pas impactés.

**Fichiers**

- `tests/importer/talent-mapper.spec.mjs`
- `tests/importer/talent-import-real-test.spec.mjs` ou nouveau fichier
- `tests/documents/item.test.mjs`

**Risques**

- Mocks Foundry insuffisants pour simuler les UUID compendium. Mitigation : isoler la logique de post-renseignement pour
  la tester unitairement.

---

### Étape 6 — Documenter les limites

**À faire**

- Ajouter des commentaires dans les nouvelles sections de code pour préciser que le traitement est limité aux talents
  référentiels.
- S'assurer que les noms de tests ne suggèrent pas une couverture des actor-owned talents.

---

## 6. Fichiers modifiés

| Fichier                                                   | Action                   | Description                                           |
|-----------------------------------------------------------|--------------------------|-------------------------------------------------------|
| `module/models/talent.mjs`                                | modification             | Ajouter `system.id` et `system.uuid` au schéma        |
| `module/importer/mappers/oggdude-talent-mapper.mjs`       | modification             | Alimenter `system.id` depuis `context.key`            |
| `module/settings/models/OggDudeDataElement.mjs`           | modification             | Post-traitement `system.uuid` après `createDocuments` |
| `module/utils/storage/world-item-storage-target.mjs`      | modification potentielle | Supporter le flux post-création                       |
| `module/utils/storage/compendium-item-storage-target.mjs` | modification potentielle | Supporter le flux post-création                       |
| `module/documents/item.mjs`                               | modification potentielle | Création directe référentielle si nécessaire          |
| `tests/importer/talent-mapper.spec.mjs`                   | modification             | Vérifier `system.id`                                  |
| `tests/documents/item.test.mjs`                           | modification             | Vérifier comportement création référentielle          |
| `tests/importer/...`                                      | modification/création    | Test `system.uuid === item.uuid` world et compendium  |

---

## 7. Risques

| Risque                                                | Impact                       | Mitigation                                          |
|-------------------------------------------------------|------------------------------|-----------------------------------------------------|
| Confusion `item.id` Foundry vs `system.id` métier     | bugs de lecture/association  | Assertions explicites dans tests et code review     |
| Solution trop large touchant les actor-owned talents  | dérive de périmètre          | Filtrer strictement sur talents référentiels        |
| Post-update UUID oublié sur un des deux contextes     | incohérence world/compendium | Mutualiser la logique et tester les deux modes      |
| Persistance de `oggdudeKey` comme identité principale | dette d'architecture         | Documenter que `system.id` devient la clé canonique |
| Tests compendium difficiles à simuler                 | couverture incomplète        | Isoler la logique de post-renseignement             |

---

## 8. Proposition d'ordre de commit

1. `feat(talent): add system.id and system.uuid to talent data model`
2. `feat(importer): map oggdude talent key to system.id`
3. `feat(importer): persist system.uuid after world and compendium creation`
4. `test(talent): cover business and technical identifiers for talent mapper and storage`

---

## 9. Dépendances

- **Bloque #243** : le ticket #243 a besoin que les talents référentiels portent `system.id` et `system.uuid` avant
  d'enrichir les nœuds avec `talentUuid`.
- **Ne dépend de personne** : #242 peut démarrer immédiatement.
- **Prépare #243 et #244** : sans ce socle d'identification, la résolution des nœuds par `talentUuid` ne peut pas
  fonctionner.
