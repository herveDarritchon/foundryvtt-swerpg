# Plan d'implémentation — US2 : Définir la structure des nœuds de talent

**Issue** : [#186 — US2: Définir la structure des nœuds de talent](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/186)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`  
**Module(s) impacté(s)** : `module/models/specialization-tree.mjs` (modification), `lang/en.json` (modification), `lang/fr.json` (modification), `tests/models/specialization-tree.test.mjs` (modification)

---

## 1. Objectif

Enrichir le schéma des nœuds du type `specialization-tree` avec les champs `row`, `column` et `cost`. Ces champs représentent respectivement la position dans la grille d'arbre et le coût XP d'achat du nœud. US2 pose la structure de données complète du nœud telle que définie par le modèle métier V1. Aucune logique d'achat, d'accessibilité ou de consolidation n'est introduite.

---

## 2. Périmètre

### Inclus dans US2

- Ajout du champ `row` (`NumberField`, requis, entier > 0, min=1) dans le `SchemaField` du nœud
- Ajout du champ `column` (`NumberField`, requis, entier > 0, min=1) dans le `SchemaField` du nœud
- Ajout du champ `cost` (`NumberField`, requis, entier >= 0, initial=0) dans le `SchemaField` du nœud
- Ajout d'une validation `validateJoint()` minimale qui vérifie la cohérence `nodeId` avec `row`/`column` selon la convention `r{row}c{column}`
- Mise à jour des tests Vitest existants : vérification des nouveaux champs dans le schéma, test d'instance avec données complètes, test de validation
- Ajout des clés d'i18n pour les nouveaux champs dans `SPECIALIZATION_TREE.FIELDS.nodes`
- Mise à jour du hint i18n existant de la section `nodes` pour refléter la structure désormais détaillée
- Ajustement mineur du template partiel `specialization-tree-config.hbs` si nécessaire pour afficher les nouveaux champs en lecture seules (les nœuds ne sont pas éditables individuellement dans la sheet de configuration en US1/US2)

### Exclu de US2

- Logique d'achat d'un nœud → US6
- Calcul de l'état des nœuds (purchased/available/locked/invalid) → US5
- Champ `prerequisites` sur le nœud (différé, pas dans les données minimales de l'issue)
- Champ `connections` spécifiques au nœud (les connexions restent au niveau de l'arbre comme défini en US1)
- Connexions typées (enhancement du champ `connections` de l'arbre)
- Modification du template partiel pour permettre l'édition individuelle des nœuds
- Aucune logique métier de coût, d'achat ou de progression
- Aucune modification du modèle `talent` existant (la définition générique ne porte pas le coût)

---

## 3. Constat sur l'existant

### Le type `specialization-tree` est créé (US1)

Le fichier `module/models/specialization-tree.mjs` existe et contient le `TypeDataModel` avec les champs :

```js
{
  description: HTMLField,
  specializationId: StringField,
  careerId: StringField,
  source: SchemaField({ system, book, page }),
  nodes: ArrayField(SchemaField({
    nodeId: StringField({ required: true, blank: false }),
    talentId: StringField({ required: true, blank: false }),
  })),
  connections: ArrayField(SchemaField({
    from: StringField({ required: true, blank: false }),
    to: StringField({ required: true, blank: false }),
  })),
}
```

Le schéma du nœud est volontairement minimal en US1 pour être étendu par US2 sans breaking change.

### Tests existants

Le fichier `tests/models/specialization-tree.test.mjs` couvre :

- `defineSchema()` — vérifie la présence et le type de tous les champs
- Création d'instance avec données minimales
- Création d'instance avec données complètes (incluant `nodes: [{ nodeId: 'n1', talentId: 'talent-slice-1' }]`)
- `LOCALIZATION_PREFIXES`
- `validateJoint` (no-op)
- Tests de la sheet

Ces tests vérifient le schéma actuel ; ils doivent continuer de passer après US2, et de nouveaux tests sont ajoutés.

### Clés i18n existantes

Les clés `SPECIALIZATION_TREE.FIELDS.nodes` et `SPECIALIZATION_TREE.FIELDS.connections` existent avec des hints génériques ("details managed in future updates") qui doivent être mis à jour.

### Aucune validation de cohérence

`validateJoint()` est actuellement un no-op (`static validateJoint(data) {}`). US2 introduit une validation minimale de cohérence entre `nodeId` et `row`/`column`.

---

## 4. Décisions d'architecture

### 4.1. Champs ajoutés : `row`, `column`, `cost`

**Décision** : Ajouter `row` (`NumberField`, requis, entier, min=1, max=10), `column` (`NumberField`, requis, entier, min=1, max=10) et `cost` (`NumberField`, requis, entier, min=0, initial=5).

Justification :

- Conforme au modèle cible défini dans `01-modele-domaine-talents.md` §5.2 et à l'issue #186.
- `row` et `column` sont des entiers positifs, cohérents avec la convention `r{row}c{column}`.
- `cost` est un entier >= 0 (un nœud peut théoriquement être gratuit, mais la valeur par défaut typique est 5 XP).
- Les bornes `max=10` pour `row`/`column` sont une protection sans contraindre les arbres réels (max 5 rangées dans les livres Edge).

### 4.2. Pas de champ `prerequisites` en US2

**Décision** : Ne pas ajouter `prerequisites` dans le schéma du nœud en US2.

Justification :

- L'issue #186 ne mentionne pas `prerequisites` dans ses données minimales.
- Le cadrage `01-modele-domaine-talents.md` mentionne `prerequisites: []` dans la donnée cible, mais son implémentation relève de US5 (calcul d'état des nœuds) ou d'une US ultérieure dédiée aux prérequis.
- Garder US2 focalisée sur les champs strictement nécessaires au positionnement et au coût réduit le risque de devoir refactorer un champ non encore utilisé.

### 4.3. Validation `validateJoint` cohérence `nodeId` / `row` / `column`

**Décision** : Ajouter une validation dans `validateJoint()` qui vérifie que `nodeId` suit la convention `r{row}c{column}` pour chaque nœud.

Justification :

- La convention `r{row}c{column}` est documentée comme stable pour la V1 (`01-modele-domaine-talents.md` §5.3).
- Une validation explicite protège contre les incohérences de données importées (OggDude) ou créées manuellement.
- La validation émet un warning via le logger centralisé sans bloquer la création (non bloquante en V1 pour éviter de casser des imports partiels).
- Conforme au pattern des validateurs runtime décrit dans ADR-0010.

### 4.4. `cost` porté par le nœud, pas par le talent générique

**Décision** : Le champ `cost` est positionné sur le nœud, dans l'arbre. Aucun coût n'est lu depuis le data model `SwerpgTalent`.

Justification :

- Règle métier explicite de l'issue #186 et du cadrage (`01-modele-domaine-talents.md` §5.5).
- ADR-0010 §3 décrit `system.effects` sur le talent ; le coût XP d'achat est orthogonal aux effets mécaniques.

### 4.5. Sheet : pas d'édition individuelle des nœuds en US2

**Décision** : Les champs `row`, `column`, `cost` ne sont pas exposés en édition individuelle dans la sheet de configuration `specialization-tree-config.hbs`.

Justification :

- La sheet US1 affiche les nœuds comme une information non éditable.
- L'édition des nœuds sera traitée dans une US ultérieure (US10 pour l'import OggDude, ou US dédiée à l'édition d'arbre).
- Le hint i18n des `nodes` est mis à jour pour documenter la structure désormais détaillée.

---

## 5. Plan de travail détaillé

### Étape 1 — Enrichir le schéma des nœuds

**Quoi** : Ajouter `row`, `column` et `cost` dans le `SchemaField` du tableau `nodes` dans `SwerpgSpecializationTree.defineSchema()`.

**Fichiers** :
- `module/models/specialization-tree.mjs` (modification)

**Risques** :
- Si `required` est mal positionné, les nœuds existants (créés avant US2) pourraient ne plus passer la validation. Vérifier que les nouveaux champs ont `required: false` (ou `required: true, nullable: true`) pour la rétrocompatibilité.
- Les valeurs par défaut (`initial`) doivent être cohérentes : `row=1`, `column=1`, `cost=5`.

### Étape 2 — Ajouter la validation `validateJoint`

**Quoi** : Ajouter une validation dans `validateJoint()` qui itère sur `data.nodes` et vérifie la cohérence `nodeId` / `row` / `column` selon la convention `r{row}c{column}`.

**Fichiers** :
- `module/models/specialization-tree.mjs` (modification)

**Risques** :
- La validation ne doit pas être bloquante en V1 pour éviter de casser des imports OggDude partiels. Utiliser `logger.warn` plutôt que `throw`.
- Si `nodes` est `undefined` ou vide, la validation doit passer silencieusement.

### Étape 3 — Mettre à jour les clés i18n

**Quoi** : Mettre à jour le hint de `SPECIALIZATION_TREE.FIELDS.nodes` pour indiquer que les nœuds portent désormais `nodeId`, `talentId`, `row`, `column` et `cost`. Ajouter des clés `SPECIALIZATION_TREE.FIELDS.nodes.row`, `.column`, `.cost` si nécessaire pour la future édition.

**Fichiers** :
- `lang/en.json` (modification)
- `lang/fr.json` (modification)

**Risques** :
- Les clés ajoutées ne doivent pas casser les traductions existantes.

### Étape 4 — Mettre à jour les tests Vitest

**Quoi** : Ajouter des tests pour les nouveaux champs dans `tests/models/specialization-tree.test.mjs` :

- Vérifier que `row`, `column` et `cost` sont présents dans `defineSchema().nodes.field.schema`
- Vérifier leurs types (`NumberField`), requis, min, initial
- Vérifier une instance avec données complètes incluant `row`, `column`, `cost`
- Vérifier la validation `validateJoint` avec des données cohérentes et incohérentes
- Vérifier qu'un nœud sans `row`/`column`/`cost` est toujours valide (rétrocompatibilité)

**Fichiers** :
- `tests/models/specialization-tree.test.mjs` (modification)

**Risques** :
- Le mock Foundry doit supporter `NumberField` (c'est déjà le cas, utilisé par d'autres modèles).
- Les tests existants ne doivent pas être cassés par l'ajout des nouveaux champs.

### Étape 5 — Ajuster le template partiel (si nécessaire)

**Quoi** : Vérifier que le template `specialization-tree-config.hbs` continue de fonctionner avec la structure enrichie. Si les nœuds sont affichés en JSON brut ou en liste simple, aucun changement n'est nécessaire. Si un affichage plus détaillé est souhaité, l'ajuster pour montrer `row`, `column` et `cost`.

**Fichiers** :
- `templates/sheets/partials/specialization-tree-config.hbs` (modification, optionnelle)

**Risques** :
- Si le template fait une hypothèse sur la structure des nœuds (par exemple `node.nodeId` sans vérification d'existence), l'ajout de champs ne casse rien.
- Aucun changement n'est attendu en US2.

---

## 6. Fichiers modifiés

| Fichier                                                    | Action       | Description du changement                                                                                                                        |
|------------------------------------------------------------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `module/models/specialization-tree.mjs`                    | Modification | Ajout de `row` (`NumberField`), `column` (`NumberField`), `cost` (`NumberField`) dans le `SchemaField` des nœuds ; enrichissement de `validateJoint` |
| `lang/en.json`                                             | Modification | Mise à jour du hint de `SPECIALIZATION_TREE.FIELDS.nodes` ; ajout si nécessaire des sous-clés `row`, `column`, `cost`                            |
| `lang/fr.json`                                             | Modification | Idem en français                                                                                                                                 |
| `tests/models/specialization-tree.test.mjs`                | Modification | Ajout de tests pour les nouveaux champs (type, requis, initial, min) ; tests de `validateJoint` ; test d'instance avec données complètes           |
| `templates/sheets/partials/specialization-tree-config.hbs` | Modification | Optionnelle — ajustement d'affichage des nœuds si souhaité                                                         |

---

## 7. Risques

| Risque                                                                                              | Impact                                                              | Mitigation                                                                                                                                        |
|-----------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Rétrocompatibilité : des nœuds existants sans `row`/`column`/`cost` pourraient planter à la lecture | Les arbres créés avant US2 deviennent invalides                    | Les nouveaux champs sont marqués `required: false` ou `required: true, nullable: true` pour accepter les données anciennes sans breaking change      |
| `validateJoint` bloquante sur des données OggDude partielles                                        | L'import d'arbres OggDude échoue                                   | La validation utilise `logger.warn` et n'est pas bloquante (ne `throw` pas)                                                                        |
| `NumberField` avec `min: 1` rejette des données à zéro                                              | Impossible de créer un nœud à la ligne/colonne 0                   | C'est le comportement souhaité (`row`/`column` sont 1-indexed dans la convention `r{row}c{column}`)                                                 |
| `cost` avec `initial: 0` n'est pas l'intention (le coût par défaut devrait être ~5)                 | Un nœud sans coût explicite serait gratuit par défaut              | `cost` a `initial: 5` (ou `required: false` sans `initial` si le coût est obligatoire). Trancher lors de l'implémentation. Recommandé : `initial: 5` |

---

## 8. Proposition d'ordre de commit

1. **`feat(model): add row, column, cost to specialization-tree node schema`**
   - `module/models/specialization-tree.mjs` (modification)

2. **`feat(model): add validateJoint coherence check for nodeId vs row/column`**
   - `module/models/specialization-tree.mjs` (modification)

3. **`feat(i18n): update specialization-tree node field descriptions`**
   - `lang/en.json` (modification)
   - `lang/fr.json` (modification)

4. **`test(model): add tests for node schema enrichment and validation`**
   - `tests/models/specialization-tree.test.mjs` (modification)

5. **`feat(ui): adjust specialization-tree sheet node display (optional)`**
   - `templates/sheets/partials/specialization-tree-config.hbs` (modification, optionnel)

---

## 9. Dépendances avec les autres US

- **Dépend de** : US1 (#185) — le type `specialization-tree` doit exister avec son schéma minimal.
- **Est dépendante de** :
  - US3 (achats acteur) — utilisera `nodeId` comme référence d'achat
  - US4 (résolution spécialisation → arbre) — lira les nœuds depuis l'arbre
  - US5 (calcul d'état des nœuds) — utilisera `row`, `column` pour les connexions implicites
  - US6 (achat d'un nœud) — lira `cost` depuis le nœud
  - US7 (consolidation) — utilisera `talentId` pour regrouper les achats
  - US10 (import OggDude) — produira des nœuds avec `row`, `column`, `cost`
- **Ordre conseillé** : US1 → **US2** → US3 → US4, puis Lot 2 et Lot 3 en parallèle.
