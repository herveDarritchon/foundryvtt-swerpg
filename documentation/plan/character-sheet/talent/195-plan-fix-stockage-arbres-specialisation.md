# Plan de correction — Bug stockage `specialization-tree` invisible après import

**Issue** : [#194 — US10: Importer les arbres de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/194)  
**Module(s) impacté(s)** : `module/utils/oggdude-mapping-config.mjs` (modification), `module/importer/utils/oggdude-import-folders.mjs` (modification), `tests/importer/utils/oggdude-mapping-config.spec.mjs` (création), `tests/importer/utils/oggdude-import-folders.test.mjs` (modification)

---

## 1. Objectif

Rendre visibles les items `specialization-tree` créés par l'import OggDude dans les dossiers monde et dans les compendiums.

---

## 2. Contexte

Le pipeline d'import crée bien des items `specialization-tree` (data model, mapper, context builder, orchestration double passe fonctionnels et testés — 70 tests passent), mais ces items sont **invisibles** dans les items importés :

- **Mode monde** : rangés dans `OggDude / Misc` au lieu d'un dossier dédié
- **Mode compendium** : `getOggDudePackConfig('specialization-tree')` lève une erreur car le type est inconnu dans `OGGDUDE_PACKS_BY_TYPE`

La cause racine est l'absence d'entrées de configuration pour le type `specialization-tree` dans les mappings de stockage.

---

## 3. Cause racine

Les trois tables de configuration suivantes ne contiennent pas d'entrée `specialization-tree` :

| Table | Fichier | Conséquence |
|---|---|---|
| `OGGDUDE_PACKS_BY_TYPE` | `module/utils/oggdude-mapping-config.mjs` | `getOggDudePackConfig('specialization-tree')` throw `Unsupported OggDude element type` → échec compendium |
| `OGGDUDE_FOLDER_MAP` | `module/importer/utils/oggdude-import-folders.mjs` | `getOrCreateWorldFolder('specialization-tree')` → fallback `Misc` |
| `OGGDUDE_FOLDER_COLORS` | `module/importer/utils/oggdude-import-folders.mjs` | Couleur grise fallback au lieu d'une couleur dédiée |

---

## 4. Périmètre

### Inclus

- Ajout de `specialization-tree` dans `OGGDUDE_PACKS_BY_TYPE`
- Ajout de `specialization-tree` dans `OGGDUDE_FOLDER_MAP`
- Ajout de `specialization-tree` dans `OGGDUDE_FOLDER_COLORS`
- Tests pour la résolution pack et dossier

### Exclu

- Changement UI OggDude (domaine `specialization` reste unique)
- Refonte du système de stockage ou des `storage-strategy`
- Changement du data model, du mapper ou de l'orchestration
- Migration de données existantes

---

## 5. Modifications

### `module/utils/oggdude-mapping-config.mjs`

Ajouter dans `OGGDUDE_PACKS_BY_TYPE` :

```js
'specialization-tree': {
  name: 'swerpg-specialization-trees',
  label: 'Specialization Trees',
  folderGroup: 'actor-options',
},
```

### `module/importer/utils/oggdude-import-folders.mjs`

Ajouter dans `OGGDUDE_FOLDER_MAP` :

```js
'specialization-tree': 'Specialization Trees',
```

Ajouter dans `OGGDUDE_FOLDER_COLORS` :

```js
'specialization-tree': '#7b1fa2', // Violet profond (arbres de spécialisation)
```

### Tests

- `tests/importer/utils/oggdude-mapping-config.spec.mjs` : nouveau fichier avec 3 tests (`getOggDudePackConfig('specialization-tree')`, throw sur type inconnu, normalisation casse)
- `tests/importer/utils/oggdude-import-folders.test.mjs` : 2 tests ajoutés (résolution nom dossier `Specialization Trees`, couleur `#7b1fa2`)

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/utils/oggdude-mapping-config.mjs` | modification | Ajout `specialization-tree` dans `OGGDUDE_PACKS_BY_TYPE` |
| `module/importer/utils/oggdude-import-folders.mjs` | modification | Ajout `specialization-tree` dans `OGGDUDE_FOLDER_MAP` et `OGGDUDE_FOLDER_COLORS` |
| `tests/importer/utils/oggdude-mapping-config.spec.mjs` | création | Tests `getOggDudePackConfig` pour `specialization-tree` |
| `tests/importer/utils/oggdude-import-folders.test.mjs` | modification | Tests résolution dossier et couleur `specialization-tree` |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le dossier `Specialization Trees` n'existe pas dans l'UI des joueurs | Confusion | Cohérent avec le nommage existant (`Weapons`, `Specializations`) |

---

## 8. Ordre de commit

1. `fix(importer): ajouter les entrées de stockage manquantes pour specialization-tree`
2. `test(importer): couvrir la résolution pack et dossier de specialization-tree`

---

## 9. Validation

- `npx vitest run` — 137 test files, 1508 tests pass
- Import monde : les items `specialization-tree` apparaissent dans `OggDude / Specialization Trees`
- Import compendium : le pack `swerpg-specialization-trees` est créé et alimenté sans erreur
