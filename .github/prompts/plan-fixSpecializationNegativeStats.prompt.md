# Plan de Correction - Import Specializations (Valeurs Négatives)

**Date**: 2025-11-22  
**Contexte**: L'import des spécialisations affiche des valeurs incorrectes (Imported: -1, Rejected: 1, Total: 0) alors que le log montre 123 spécialisations chargées.

---

## 🔍 Diagnostic du Problème

### Symptômes Observés (Screenshot)

1. ✅ Case "Load Specialization data" cochée
2. ✅ Ligne "Load Specialization data" visible dans le tableau
3. ❌ **Valeurs incorrectes** : Total=0, Imported=-1, Rejected=1, Duration=346ms
4. ✅ Log console montre : `jsonData: Array(123)` → 123 spécialisations détectées
5. ❌ Aucun dossier "Swerpg - Specializations" créé (ni Items)

### Analyse de la Cause Racine

**Hypothèses principales** :

#### H1: Les stats ne sont pas incrémentées correctement

- `resetSpecializationImportStats()` est appelé AVANT le mapping
- `incrementSpecializationImportStat('total')` est appelé pour chaque spécialisation
- `incrementSpecializationImportStat('rejected')` est appelé si champs manquants
- **MAIS** : `imported` est calculé comme `total - rejected`
  **Problème potentiel** : Si `total=0` mais `rejected=1`, alors `imported = 0-1 = -1` !
  Cela signifie que :
- Soit `incrementSpecializationImportStat('total')` n'est JAMAIS appelé
- Soit il est appelé APRÈS le calcul des stats
- Soit `resetSpecializationImportStats()` est appelé TROP TARD (après l'affichage)

#### H2: Le mapper retourne un tableau vide

- Si `specializationMapper()` retourne `[]`, aucun Item n'est créé
- Mais les stats devraient quand même montrer `total=123` si on itère sur les 123 entrées

#### H3: Erreur silencieuse dans le mapper

- Une exception est levée dans `specializationMapper()` avant l'incrémentation des stats
- Le tableau retourné est vide mais aucune erreur n'est loggée

#### H4: Problème de timing dans l'affichage des stats

- Les stats sont lues AVANT la fin du mapping
- Le callback `progressCallback` est appelé trop tôt

---

## 📋 Plan d'Investigation et Correction

### Phase 1: Vérifier le Flux d'Exécution

#### TASK-001: Ajouter logs de debug au début et fin du mapper

**Fichier**: `module/importer/items/specialization-ogg-dude.mjs`
**Modification dans `specializationMapper`** :

```javascript
export function specializationMapper(specializations, { strictSkills = false } = {}) {
  resetSpecializationImportStats()
  logger.info('[SpecializationImporter] DÉBUT MAPPING', {
    inputCount: specializations?.length || 0,
    isArray: Array.isArray(specializations),
  })
  if (!Array.isArray(specializations) || specializations.length === 0) {
    logger.warn('[SpecializationImporter] Input vide ou invalide', {
      specializations,
      type: typeof specializations,
    })
    return []
  }
  const mapped = specializations.map((xmlSpecialization, index) => {
    incrementSpecializationImportStat('total')
    logger.debug('[SpecializationImporter] Processing specialization', {
      index,
      hasName: !!xmlSpecialization?.Name,
      hasKey: !!xmlSpecialization?.Key,
    })
    // ...existing mapping code...
  })
  const filtered = mapped.filter((item) => item !== null)
  const finalStats = getSpecializationImportStats()
  logger.info('[SpecializationImporter] FIN MAPPING', {
    inputCount: specializations.length,
    mappedCount: mapped.length,
    filteredCount: filtered.length,
    stats: finalStats,
  })
  return filtered
}
```

---

#### TASK-002: Vérifier que le mapper est bien appelé

**Fichier**: `module/importer/oggDude.mjs`
**Dans la boucle `for (const entry of contextEntries)`**, après la création du context :

```javascript
const context = await withRetry(() => entry.contextBuilder(zip, groupByDirectory, groupByType), {
  shouldRetry: (err) => /parse|XML|network/i.test(err?.message || ''),
})
const datasetSize = Array.isArray(context?.jsonData)
  ? context.jsonData.filter((el) => el != null).length
  : 0
logger.info('[ProcessOggDudeData] Context créé', {
  domain: entry.type,
  datasetSize,
  hasMapper: typeof context?.element?.mapper === 'function',
  jsonDataSample: context?.jsonData?.slice(0, 2) // Premier échantillon
})
if (datasetSize === 0) {
  // ...existing code...
  continue
}
// NOUVEAU: Logger juste avant l'appel au processElements
logger.info('[ProcessOggDudeData] AVANT processElements', {
  domain: entry.type,
  contextKeys: Object.keys(context || {}),
  elementKeys: Object.keys(context?.element || {})
})
await withRetry(() => OggDudeDataElement.processElements(context), {
  shouldRetry: (err) => /database|upload|parse/i.test(err?.message || ''),
})
logger.info('[ProcessOggDudeData] APRÈS processElements', {
  domain: entry.type
})
```

---

#### TASK-003: Vérifier `OggDudeDataElement.processElements`

**Fichier**: `module/settings/models/OggDudeDataElement.mjs`
**Trouver la méthode `processElements` et ajouter logs** :

```javascript
static async processElements(context) {
  logger.info('[OggDudeDataElement] processElements START', {
    hasJsonData: !!context?.jsonData,
    jsonDataLength: context?.jsonData?.length || 0,
    hasMapper: typeof context?.element?.mapper === 'function',
    elementType: context?.element?.type
  })
  // Appel au mapper
  const items = this._buildItemElements(context.jsonData, context.element.mapper)
  logger.info('[OggDudeDataElement] APRÈS MAPPING', {
    itemsCount: items?.length || 0,
    elementType: context?.element?.type
  })
  // ...existing code pour createFolder, upload images, create Items...
  logger.info('[OggDudeDataElement] processElements END', {
    itemsCreated: items?.length || 0,
    elementType: context?.element?.type
  })
}
```

---

### Phase 2: Vérifier la Structure XML des Spécialisations

#### TASK-004: Extraire un exemple de spécialisation du ZIP

**Manuel** : Extraire `Data/Specializations/XXXXX.xml` et vérifier la structure.
**Structure attendue** :

```xml
<Specializations>
  <Specialization>
    <Key>PILOT</Key>
    <Name>Pilote</Name>
    <Description>...</Description>
    <CareerSkills>
      <Key>PILOTPL</Key>
      <Key>PILOTSP</Key>
      <Key>GUNN</Key>
      <Key>MECH</Key>
    </CareerSkills>
    <FreeRanks>0</FreeRanks>
  </Specialization>
</Specializations>
```

**Vérifications** :

- [ ] `<Key>` et `<Name>` sont présents ?
- [ ] `<CareerSkills>` existe et contient des `<Key>` ?
- [ ] Structure correspond à ce qu'attend `extractRawSpecializationSkillCodes` ?

---

#### TASK-005: Ajouter validation dans `extractRawSpecializationSkillCodes`

**Fichier**: `module/importer/items/specialization-ogg-dude.mjs`

```javascript
function extractRawSpecializationSkillCodes(xmlSpecialization) {
  if (!xmlSpecialization) {
    logger.warn('[SpecializationImporter] extractRawCodes: xmlSpecialization null')
    return []
  }
  const cs = xmlSpecialization.CareerSkills
  if (!cs) {
    logger.warn('[SpecializationImporter] extractRawCodes: CareerSkills manquant', {
      keys: Object.keys(xmlSpecialization),
    })
    return []
  }
  logger.debug('[SpecializationImporter] extractRawCodes: structure CareerSkills', {
    isArray: Array.isArray(cs),
    type: typeof cs,
    keys: typeof cs === 'object' ? Object.keys(cs) : null,
  })
  // ...existing code...
}
```

---

### Phase 3: Corriger le Problème de Stats

#### TASK-006: Garantir que les stats sont lues AU BON MOMENT

**Fichier**: `module/settings/OggDudeDataImporter.mjs`
**Dans `_prepareContext`**, les stats sont lues via `getAllImportStats()`.
**Problème potentiel** : Si `_prepareContext` est appelé PENDANT l'import (via le `progressCallback`), les stats peuvent être partielles.
**Solution** : Ne lire les stats que APRÈS la complétion de tous les domaines.
**Vérifier dans `loadAction`** :

```javascript
static async loadAction(_event, target) {
  logger.info('[OggDudeDataImporter] Load OggDude Data', { instance: this })
  const totalDomains = this.domains.filter((d) => d.checked).length
  this._progress = { processed: 0, total: totalDomains }
  await this.render() // Premier rendu
  await OggDudeImporter.processOggDudeData(this.zipFile, this.domains, {
    progressCallback: ({ processed, total, domain, phase }) => {
      this._progress = { processed, total, domain, phase }
      logger.debug('[OggDudeDataImporter] Progress callback', this._progress)
      // NE PAS render si phase = 'start' (stats pas encore prêtes)
      if (phase !== 'start') {
        this.render().catch((e) => logger.warn('[OggDudeDataImporter] render progress error', { e }))
      }
    },
  })
  // Rendu final APRÈS l'import complet
  logger.info('[OggDudeDataImporter] Import terminé, rendu final')
  await this.render()
}
```

---

#### TASK-007: Ajouter un délai avant le rendu final

**Fichier**: `module/settings/OggDudeDataImporter.mjs`
**Alternative** : Attendre un court délai pour que les stats soient propagées.

```javascript
// Après l'import complet
await OggDudeImporter.processOggDudeData(...)
// Petit délai pour garantir que les stats sont à jour
await new Promise(resolve => setTimeout(resolve, 100))
// Rendu final
await this.render()
```

---

### Phase 4: Vérifier les Erreurs Silencieuses

#### TASK-008: Ajouter try/catch global dans `specializationMapper`

**Fichier**: `module/importer/items/specialization-ogg-dude.mjs`

```javascript
export function specializationMapper(specializations, { strictSkills = false } = {}) {
  try {
    resetSpecializationImportStats()
    logger.info('[SpecializationImporter] DÉBUT MAPPING', {
      inputCount: specializations?.length || 0,
    })
    if (!Array.isArray(specializations) || specializations.length === 0) {
      logger.warn('[SpecializationImporter] Input vide')
      return []
    }
    const mapped = specializations.map((xmlSpecialization, index) => {
      try {
        incrementSpecializationImportStat('total')
        // ...existing mapping code...
        return specializationObject
      } catch (error) {
        logger.error('[SpecializationImporter] Erreur mapping item', {
          index,
          error: error.message,
          stack: error.stack,
        })
        incrementSpecializationImportStat('rejected')
        return null
      }
    })
    const filtered = mapped.filter((item) => item !== null)
    const finalStats = getSpecializationImportStats()
    logger.info('[SpecializationImporter] FIN MAPPING', {
      inputCount: specializations.length,
      filteredCount: filtered.length,
      stats: finalStats,
    })
    return filtered
  } catch (error) {
    logger.error('[SpecializationImporter] ERREUR FATALE MAPPING', {
      error: error.message,
      stack: error.stack,
    })
    return []
  }
}
```

---

### Phase 5: Vérifier le Type d'Item "specialization"

#### TASK-009: Vérifier que le type est enregistré dans Foundry

**Fichier**: `system.json` (ou équivalent)
**Vérifier que `"specialization"` est dans la liste des types d'Items** :

```json
{
  "Item": {
    "types": ["weapon", "armor", "gear", "species", "career", "talent", "obligation", "specialization"],
    ...
  }
}
```

## **Si manquant** : Ajouter "specialization" à la liste des types.

#### TASK-010: Vérifier le modèle de données SwerpgSpecialization

**Fichier**: `module/models/` (chercher le DataModel pour specialization)
**Vérifier que** :

- [ ] `SwerpgSpecialization` existe et est enregistré
- [ ] Le schéma contient `description`, `freeSkillRank`, `specializationSkills`
- [ ] Le type est bien "specialization"

---

### Phase 6: Tests de Validation

#### TASK-011: Test unitaire du mapper avec données réelles

**Fichier**: `tests/importer/specialization-ogg-dude.spec.mjs` (NOUVEAU)

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { specializationMapper, mapSpecializationSkills } from '../../module/importer/items/specialization-ogg-dude.mjs'
import { resetSpecializationImportStats, getSpecializationImportStats } from '../../module/importer/utils/specialization-import-utils.mjs'
describe('specializationMapper', () => {
  beforeEach(() => {
    resetSpecializationImportStats()
  })
  it('should map valid specialization', () => {
    const input = [
      {
        Key: 'PILOT',
        Name: 'Pilote',
        Description: 'Test description',
        CareerSkills: {
          Key: ['PILOTPL', 'PILOTSP', 'GUNN'],
        },
        FreeRanks: '0',
      },
    ]
    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pilote')
    expect(result[0].type).toBe('specialization')
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })
  it('should reject specialization with missing Name', () => {
    const input = [
      {
        Key: 'TEST',
        // Name manquant
        CareerSkills: { Key: ['PILOTPL'] },
      },
    ]
    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()
    expect(result).toHaveLength(0)
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(0)
    expect(stats.rejected).toBe(1)
  })
  it('should handle 123 specializations', () => {
    const input = Array.from({ length: 123 }, (_, i) => ({
      Key: `SPEC_${i}`,
      Name: `Specialization ${i}`,
      Description: 'Test',
      CareerSkills: { Key: ['PILOTPL'] },
      FreeRanks: '0',
    }))
    const result = specializationMapper(input)
    const stats = getSpecializationImportStats()
    expect(result).toHaveLength(123)
    expect(stats.total).toBe(123)
    expect(stats.imported).toBe(123)
    expect(stats.rejected).toBe(0)
  })
})
```

---

#### TASK-012: Test d'intégration avec zip mock

**Fichier**: `tests/integration/specialization-import.integration.spec.mjs` (NOUVEAU)

```javascript
import { describe, it, expect } from 'vitest'
import { buildSpecializationContext } from '../../module/importer/items/specialization-ogg-dude.mjs'
describe('Specialization Import Integration', () => {
  it('should build context from mock zip', async () => {
    // Mock minimal
    const mockZip = {
      files: {
        'Data/Specializations/Pilot.xml': {
          async: () =>
            Promise.resolve(
              '<?xml version="1.0"?><Specializations><Specialization><Key>PILOT</Key><Name>Pilote</Name><CareerSkills><Key>PILOTPL</Key></CareerSkills></Specialization></Specializations>',
            ),
        },
      },
    }
    const mockGroupByDirectory = [{ name: 'Data/Specializations/Pilot.xml' }]
    const mockGroupByType = { xml: [{ name: 'Data/Specializations/Pilot.xml' }], image: [] }
    const context = await buildSpecializationContext(mockZip, mockGroupByDirectory, mockGroupByType)
    expect(context.jsonData).toBeDefined()
    expect(context.element.type).toBe('specialization')
    expect(typeof context.element.mapper).toBe('function')
  })
})
```

---

## 🧪 Checklist de Validation

### Avant Corrections

- [ ] Lancer l'import avec logs activés (niveau debug)
- [ ] Noter tous les logs console dans un fichier
- [ ] Identifier exactement où les stats restent à 0

### Après Corrections TASK-001 à TASK-003

- [ ] Vérifier que les logs montrent "DÉBUT MAPPING" avec inputCount=123
- [ ] Vérifier que "FIN MAPPING" montre filteredCount=123
- [ ] Vérifier que stats.total=123 dans les logs

### Après Corrections TASK-004 à TASK-005

- [ ] Extraire un fichier XML réel
- [ ] Vérifier que la structure correspond aux attentes
- [ ] Tester `extractRawSpecializationSkillCodes` avec cet XML

### Après Corrections TASK-006 à TASK-007

- [ ] Vérifier que les stats affichées sont cohérentes
- [ ] Imported doit être ≥0
- [ ] Total doit être =123

### Après Corrections TASK-008

- [ ] Aucune erreur silencieuse dans les logs
- [ ] Tous les try/catch loggent les erreurs

### Après Corrections TASK-009 à TASK-010

- [ ] Type "specialization" enregistré dans system.json
- [ ] DataModel existe et est valide
- [ ] Items créés avec le bon type

### Après Tests TASK-011 à TASK-012

- [ ] Tests unitaires passent (100%)
- [ ] Test d'intégration passe
- [ ] Import réel crée 123 items

---

## 📊 Critères de Succès

### Minimum Viable

- [ ] Stats affichent Total=123, Imported=123, Rejected=0
- [ ] Dossier "Swerpg - Specializations" créé avec 123 Items
- [ ] Aucune valeur négative dans les stats

### Complet

- [ ] Tous les logs de debug présents et cohérents
- [ ] Tests unitaires et d'intégration passent
- [ ] Documentation mise à jour (CHANGELOG)
- [ ] Aucune régression sur les autres domaines

---

## 🚨 Points d'Attention

### Risques Identifiés

1. **Reset des stats trop tard** : Si `resetSpecializationImportStats()` est appelé après le premier rendu UI
2. **Stats lues trop tôt** : Si `getAllImportStats()` est appelé pendant le mapping
3. **Erreur silencieuse** : Exception non catchée qui vide le tableau retourné
4. **Type non enregistré** : Foundry rejette les Items de type "specialization"

### Mitigations

- Logs exhaustifs à chaque étape
- Try/catch avec logs détaillés
- Tests unitaires couvrant les cas limites
- Validation du type avant création

---

## 📝 Ordre d'Exécution Recommandé

1. **Phase 1** (TASK-001 à TASK-003) : Diagnostiquer avec logs
2. **Analyser les logs** : Identifier l'étape qui échoue
3. **Phase 2** (TASK-004 à TASK-005) : Valider la structure XML
4. **Phase 3** (TASK-006 à TASK-007) : Corriger le timing des stats
5. **Phase 4** (TASK-008) : Ajouter gestion d'erreur robuste
6. **Phase 5** (TASK-009 à TASK-010) : Valider l'enregistrement du type
7. **Phase 6** (TASK-011 à TASK-012) : Tests de non-régression

---

**Durée estimée** : 2-4 heures (selon la complexité du problème)  
**Priorité** : HAUTE (bug bloquant l'import)  
**Statut** : PRÊT À IMPLÉMENTER
