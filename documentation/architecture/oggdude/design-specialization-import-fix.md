---
goal: Design de la correction import spécialisation OggDude (dataset vide + stats)
version: 1.0
date_created: 2025-11-23
last_updated: 2025-11-23
owner: herve.darritchon
status: 'Draft'
tags: ['design', 'importer', 'specialization', 'oggdude']
---

# Design: Correction Import Spécialisation OggDude

## 1. Architecture Résumée

Flux: ZIP → `OggDudeDataElement.processElements()` → `jsonData[]` → `specializationMapper(jsonData)` → dataset → `processOggDudeData()` → documents Foundry + métriques → UI (`OggDudeDataImporter`).

Problèmes ciblés: (1) dataset vide, (2) invariant statistiques violé, (3) progression incorrecte.

## 2. Composants Modifiés

| Composant | Type | Modification |
|-----------|------|--------------|
| specialization-ogg-dude.mjs | Mapper | Ajout try/catch par item + comptage rejected + logs | 
| oggDude.mjs | Orchestrateur | Propagation rejectedCount + ajustement emitProgress |
| OggDudeDataImporter.mjs | UI | Correction computeDomainStatus, clamp préventif amélioré |
| extractRawSpecializationSkillCodes() | Utilitaire | Retour toujours tableau, validation structure |

## 3. Flux de Données Mapper

Pseudo-code proposé:

```javascript
function specializationMapper(jsonData, { debug }={}) {
  const rejected = []
  const mapped = []
  if (debug) console.log('SWERPG || [SpecializationMapper] Input', { len: jsonData.length, sample: jsonData.slice(0,2) })
  for (const raw of jsonData) {
    try {
      const careerSkills = normalizeCareerSkills(raw.CareerSkills)
      const obj = buildSpecialization(raw, careerSkills)
      mapped.push({ id: raw.Key || generateId(raw.Name), name: raw.Name, obj })
    } catch (err) {
      rejected.push({ key: raw.Key, name: raw.Name, reason: err.message })
      if (debug) console.warn('SWERPG || [SpecializationMapper] Item rejected', { key: raw.Key, reason: err.message })
    }
  }
  console.log('SWERPG || [SpecializationMapper] Output', { mapped: mapped.length, rejected: rejected.length })
  return { dataset: mapped, rejected }
}
```

## 4. Gestion des Erreurs

| Type | Détection | Action |
|------|-----------|--------|
| Structure manquante | Clés essentielles absentes (`Name`) | Reject + log WARN |
| Skill codes invalides | Non tableau / valeurs vides | Fallback `[]` + log INFO |
| Description HTML | Balises script/style | Sanitize + log SECURITY |
| Doublon Key | Key déjà rencontré | Reject + log WARN (premier conserve) |

## 5. Statistiques & Invariant

Nouveau calcul dans `computeDomainStatus`:

```javascript
if (imported + rejected > total) {
  const original = { imported, rejected, total }
  total = imported + rejected // recalcul véritable
  console.warn('SWERPG || [OggDudeDataImporter] Invariant violé recalculé', { original, fixed: { imported, rejected, total } })
}
```

Additions context `_prepareContext()`:
- Ajouter `rejectedCount` pour chaque domaine
- Calcul `errorRate = rejected / (imported + rejected)`

## 6. Progression

`emitProgress({ domain, processed })` → `processed++` par item tenté (mapped ou rejeté).

## 7. Sécurité (OWASP)

- Sanitization description: strip `<script>`, événements inline, iframes.
- Aucune interpolation HTML directe (`textContent` usage lors de rendu).
- Validation des chemins déjà couverte upstream.

## 8. Performance

Complexité O(n) avec n = 123. Logs conditionnels (debug). Surcoût négligeable (<5 ms). Aucun parsing supplémentaire lourd.

## 9. Tests Plan

| Test ID | Objectif | Implémentation |
|---------|----------|----------------|
| TEST-001 | Nominal | 5 valides → dataset=5 |
| TEST-002 | Résilience | 3 valides + 2 invalides → rejected=2 |
| TEST-003 | Stat Invariant | imported + rejected ≤ total |
| TEST-004 | Skills Manquants | careerSkills=[] |
| TEST-005 | Sanitization | `<script>` retiré |
| TEST-006 | Logging | Start + End log présents |
| TEST-007 | Debug Items | Logs per-item en mode debug |

## 10. Décisions Ouvertes

- Fallback sur doublons Key: conserver premier (simple). Documenté ADR-0006.

## 11. Diagramme Simplifié

```
[ZIP] -> parse -> jsonData(123) -> specializationMapper -> {mapped X, rejected Y} -> processOggDudeData -> emitProgress (X+Y) -> stats invariant check -> UI render
```

## 12. Checklist Implémentation

- [ ] Mapper refactoré
- [ ] Fonction de normalisation skills
- [ ] Sanitization utilitaire réutilisable
- [ ] Propagation rejectedCount
- [ ] Correction computeDomainStatus
- [ ] Tests ajoutés
- [ ] Changelog mis à jour
- [ ] Documentation plan & design finalisée

## 13. Maintenance

Ajouter drapeau `CONFIG.debug.importer` (déjà existant si pattern). Nettoyage logs verbeux avant release stable.

---

