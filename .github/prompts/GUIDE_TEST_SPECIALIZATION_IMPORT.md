# Guide de Test - Import Specializations avec Diagnostic

**Date**: 2025-11-23  
**Objectif**: Tester l'import des spécialisations avec les nouveaux logs de diagnostic pour identifier le problème des valeurs négatives.

---

## 📋 Pré-requis

1. ✅ Foundry VTT lancé en mode développement
2. ✅ Console DevTools ouverte (F12)
3. ✅ Fichier `oggdude-data.zip` disponible
4. ✅ Code modifié déployé (phase 1 du plan)

---

## 🧪 Procédure de Test

### Étape 1: Activer les Logs Debug

Ouvrir la console DevTools et exécuter:

```javascript
CONFIG.debug.hooks = true
```

Cela active tous les logs de debug du système.

### Étape 2: Lancer l'Import

1. Ouvrir le menu "Import OggDude Data"
2. Sélectionner le fichier `oggdude-data.zip`
3. ✅ Cocher **uniquement** "Load Specialization data"
4. Cliquer sur "Load"

### Étape 3: Observer les Logs Console

Pendant l'import, vous devriez voir dans la console:

#### Logs Attendus (ordre chronologique)

```
SWERPG || [ProcessOggDudeData] Context créé {domain: "specialization", datasetSize: 123, hasMapper: true, ...}
SWERPG || [ProcessOggDudeData] AVANT processElements {domain: "specialization", ...}
SWERPG || [OggDudeDataElement] processElements START {hasJsonData: true, jsonDataLength: 123, hasMapper: true, elementType: "specialization"}
SWERPG || [SpecializationImporter] DÉBUT MAPPING {inputCount: 123, isArray: true, strictSkills: false}
SWERPG || [SpecializationImporter] FIN MAPPING {inputCount: 123, mappedCount: 123, filteredCount: 123, stats: {...}}
SWERPG || [OggDudeDataElement] APRÈS MAPPING {itemsCount: 123, elementType: "specialization", jsonDataInputLength: 123}
SWERPG || [OggDudeDataElement] processElements END {itemsCreated: 123, elementType: "specialization"}
SWERPG || [ProcessOggDudeData] APRÈS processElements {domain: "specialization"}
```

---

## 🔍 Analyse des Résultats

### Cas 1: Logs Complets avec inputCount=123 ✅

**Logs observés**:

- ✅ `DÉBUT MAPPING {inputCount: 123}`
- ✅ `FIN MAPPING {filteredCount: 123}`
- ✅ `processElements END {itemsCreated: 123}`
  **Conclusion**: Le mapping fonctionne correctement.
  **Actions**:
- Vérifier les stats affichées dans l'UI
- Si stats affichent Total=0 → PROBLÈME DE TIMING (Phase 3, TASK-006/007)

---

### Cas 2: inputCount=0 ❌

**Logs observés**:

- ❌ `DÉBUT MAPPING {inputCount: 0}` ou `Input vide ou invalide`
  **Conclusion**: Les données ne sont pas chargées depuis le ZIP.
  **Actions**:

1. Vérifier le log `Context créé`:
   - Si `datasetSize: 0` → Problème dans `buildSpecializationContext`
   - Vérifier que le fichier ZIP contient `Data/Specializations/*.xml`
2. Extraire manuellement le ZIP et lister les fichiers
3. Vérifier la structure XML d'un fichier de spécialisation

---

### Cas 3: inputCount=123 mais filteredCount=0 ❌

**Logs observés**:

- ✅ `DÉBUT MAPPING {inputCount: 123}`
- ❌ `FIN MAPPING {filteredCount: 0}`
- ❌ Plusieurs `[SpecializationImporter] Erreur mapping item`
  **Conclusion**: Toutes les spécialisations sont rejetées pour champs manquants ou erreurs.
  **Actions**:

1. Lire les logs d'erreur pour identifier les champs manquants
2. Extraire un fichier XML de spécialisation du ZIP
3. Vérifier la structure XML (Key, Name, CareerSkills présents ?)
4. Implémenter TASK-004 du plan (validation structure XML)

---

### Cas 4: filteredCount=123 mais itemsCreated=0 ❌

**Logs observés**:

- ✅ `FIN MAPPING {filteredCount: 123}`
- ❌ `APRÈS MAPPING {itemsCount: 0}` ou erreur dans `_storeItems`
  **Conclusion**: Le mapping fonctionne mais le stockage échoue.
  **Actions**:

1. Vérifier les erreurs dans la console (permissions, base de données)
2. Vérifier que le type "specialization" est enregistré (`system.json`)
3. Vérifier le DataModel `SwerpgSpecialization` (TASK-010)

---

### Cas 5: Logs Manquants ❌

**Logs observés**:

- ❌ Aucun log `DÉBUT MAPPING` ou `Context créé`
  **Conclusion**: Le mapper n'est pas appelé.
  **Actions**:

1. Vérifier que le domaine "specialization" est enregistré dans `oggDude.mjs`
2. Vérifier que `buildSpecializationContext` est dans `contextEntries`
3. Vérifier les logs `processOggDudeData` (domain list)

---

## 📊 Tableau de Diagnostic

| Symptôme          | inputCount | filteredCount | itemsCreated | Cause Probable           | Phase Correction       |
| ----------------- | ---------- | ------------- | ------------ | ------------------------ | ---------------------- |
| Stats négatives   | 123        | 123           | 123          | Timing stats UI          | Phase 3 (TASK-006/007) |
| Aucun item        | 0          | 0             | 0            | ZIP vide / structure XML | Phase 2 (TASK-004)     |
| Mapping échoue    | 123        | 0             | 0            | Champs manquants         | Phase 2 (TASK-005)     |
| Stockage échoue   | 123        | 123           | 0            | Type non enregistré      | Phase 5 (TASK-009/010) |
| Mapper non appelé | -          | -             | -            | Pipeline cassé           | Phase 1 (vérif code)   |

---

## 🎯 Actions Selon les Résultats

### Si Tout Fonctionne (123 items créés)

1. ✅ Vérifier le dossier "Swerpg - Specializations" dans Items
2. ✅ Ouvrir une spécialisation et vérifier les champs
3. ✅ Vérifier les stats affichées dans l'UI
4. Si stats incorrectes → Implémenter Phase 3 (timing)

### Si Erreurs Détectées

1. Copier les logs d'erreur de la console
2. Identifier le cas de figure (voir tableau ci-dessus)
3. Implémenter la phase de correction correspondante
4. Re-tester

---

## 📝 Checklist de Validation

- [ ] Console DevTools ouverte
- [ ] Logs debug activés (`CONFIG.debug.hooks = true`)
- [ ] Import lancé avec uniquement "Load Specialization data" coché
- [ ] Logs console copiés dans un fichier
- [ ] Cas de figure identifié (voir tableau)
- [ ] Dossier "Swerpg - Specializations" vérifié
- [ ] Stats UI notées (Total, Imported, Rejected)

---

## 🔗 Ressources

- Plan complet: `.github/prompts/plan-fixSpecializationNegativeStats.prompt.md`
- Résumé Phase 1: `.github/prompts/IMPLEMENTATION_SUMMARY_specialization_diagnostic_phase1.md`
- Tests unitaires: `tests/importer/specialization-ogg-dude.spec.mjs`

---

**Prochaine étape**: Partager les logs console pour analyse et décision sur la suite du plan (Phase 2, 3 ou 5).
