# Plan de Correction - Bug Import Specializations UI (Aucune Stats Affichées)

**Date**: 2025-11-22  
**Contexte**: L'import OggDude des spécialisations ne crée aucun Item Foundry et n'affiche aucune ligne "Load Specialization data" dans le tableau des statistiques, malgré que la case soit cochée dans l'UI.

---

## 🔍 Diagnostic du Problème

### Symptômes Observés (Screenshots)

1. ✅ Case "Load Specialization data" **est cochée** dans l'UI
2. ❌ **Aucune ligne "Load Specialization data"** dans le tableau "Import Statistics"
3. ❌ **Aucun dossier "Swerpg - Specializations"** créé dans la liste des items
4. ❌ Seuls 7 dossiers visibles : Armors, Careers, Gears, Obligations, Species, Talents, Weapons
5. ❌ Barre de progression **reste à 0%**
6. ❌ Toutes les colonnes du tableau stats affichent **0** pour tous les domaines

### Analyse de la Cause Racine

**PROBLÈME IDENTIFIÉ** : La méthode `_buildImportDomainStatus` dans le composant UI `OggDudeDataImporter.mjs` ne contient probablement PAS "specialization" dans sa liste de domaines à afficher.

**Preuve** :

- Le code backend (`oggDude.mjs`) contient bien `buildContextMap.set('specialization', ...)`
- Le mapper (`specialization-ogg-dude.mjs`) est correct et complet
- Le stats utils (`specialization-import-utils.mjs`) existe et fonctionne
- MAIS le tableau UI ne montre pas la ligne "Load Specialization data"

**Hypothèse confirmée** : Il y a un décalage entre :

1. Les domaines disponibles dans le backend (`_domainNames` ligne 30)
2. Les domaines affichés dans le tableau des stats (méthode `_buildImportDomainStatus`)

---

## 📋 Plan d'Action Détaillé

### Phase 1: Localiser et Corriger la Méthode UI

#### TASK-001: Rechercher la méthode `_buildImportDomainStatus`

**Fichier cible**: `module/settings/OggDudeDataImporter.mjs`

**Action**:

```bash
# Rechercher la méthode dans le fichier
grep -n "_buildImportDomainStatus" module/settings/OggDudeDataImporter.mjs
```

**Attendu**: Trouver la ligne où cette méthode est définie (probablement après ligne 300)

---

#### TASK-002: Lire le code actuel de `_buildImportDomainStatus`

**Objectif**: Identifier si la liste des domaines inclut ou non "specialization"

**Code attendu (INCORRECT - à corriger)**:

```javascript
_buildImportDomainStatus(stats) {
  // Liste INCOMPLÈTE - manque 'specialization'
  const domains = ['armor', 'weapon', 'gear', 'species', 'career', 'talent', 'obligation']

  return domains.map(domain => {
    const stat = stats[domain] || { total: 0, imported: 0, rejected: 0 }
    // ... construction de la ligne
  })
}
```

---

#### TASK-003: Corriger la liste des domaines dans `_buildImportDomainStatus`

**Fichier**: `module/settings/OggDudeDataImporter.mjs`

**Modification requise**:

```javascript
_buildImportDomainStatus(stats) {
  // CORRECTION: Ajouter 'specialization' à la liste
  const domains = ['weapon', 'armor', 'gear', 'species', 'career', 'talent', 'obligation', 'specialization']

  return domains.map(domain => {
    const stat = stats[domain] || { total: 0, imported: 0, rejected: 0 }

    // Calculer le statut visuel
    const hasData = stat.total > 0
    const statusIcon = hasData ? '✓' : '○'

    // Calculer la durée (si métriques disponibles)
    const duration = this._getDomainDuration ? this._getDomainDuration(domain) : 0

    return {
      domain,
      label: `Load ${this._capitalize(domain)} data`,
      total: stat.total || 0,
      imported: stat.imported || 0,
      rejected: stat.rejected || 0,
      duration: this._formatDuration(duration),
      statusIcon,
      status: hasData ? 'completed' : 'pending'
    }
  })
}

// Helper pour capitaliser le nom du domaine
_capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Helper pour formater la durée
_formatDuration(ms) {
  if (!ms || ms <= 0) return '-'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
```

---

### Phase 2: Vérifier la Cohérence avec `_domainNames`

#### TASK-004: Synchroniser `_domainNames` et `_buildImportDomainStatus`

**Objectif**: S'assurer que les deux listes sont identiques

**Vérification**:

```javascript
// Ligne ~30 dans OggDudeDataImporter.mjs
_domainNames = ['weapon', 'armor', 'gear', 'species', 'career', 'talent', 'obligation', 'specialization']

// Dans _buildImportDomainStatus (à ajouter si absent)
_buildImportDomainStatus(stats) {
  // Utiliser directement _domainNames au lieu d'une liste en dur
  const domains = this._domainNames

  return domains.map(domain => {
    // ... reste du code
  })
}
```

**Avantage**: Évite les désynchronisations futures (single source of truth)

---

#### TASK-005: Vérifier le template Handlebars

**Fichier**: `templates/settings/oggDudeDataImporter.hbs`

**Objectif**: S'assurer que le template itère bien sur `importDomainStatus`

**Code attendu**:

```handlebars
{{#if hasStats}}
  <section class='import-statistics'>
    <h3>{{localize 'SETTINGS.OggDudeDataImporter.importStatistics'}}</h3>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Domain</th>
          <th>Total</th>
          <th>Imported</th>
          <th>Rejected</th>
          <th>Duration (ms)</th>
        </tr>
      </thead>
      <tbody>
        {{#each importDomainStatus}}
          <tr data-domain='{{domain}}' data-status='{{status}}'>
            <td class='status-icon'>{{statusIcon}}</td>
            <td>{{label}}</td>
            <td>{{total}}</td>
            <td>{{imported}}</td>
            <td>{{rejected}}</td>
            <td>{{duration}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>
  </section>
{{/if}}
```

**Si absent ou incorrect**: Le corriger pour utiliser `importDomainStatus` depuis le contexte

---

### Phase 3: Ajouter des Logs de Diagnostic

#### TASK-006: Ajouter logs dans `_prepareContext`

**Fichier**: `module/settings/OggDudeDataImporter.mjs`

**Ajout dans la méthode `_prepareContext`**:

```javascript
_prepareContext(options) {
  // ...existing code...

  const importDomainStatus = this._buildImportDomainStatus(stats)

  // LOG DE DIAGNOSTIC
  logger.debug('[OggDudeDataImporter] Context prepared', {
    domainsCount: this._domainNames.length,
    domainsList: this._domainNames,
    statsKeys: Object.keys(stats),
    importDomainStatusCount: importDomainStatus.length,
    specializationInStats: !!stats.specialization,
    specializationStats: stats.specialization
  })

  return {
    // ...existing code...
    importDomainStatus,
  }
}
```

---

#### TASK-007: Ajouter logs dans le pipeline d'import

**Fichier**: `module/importer/oggDude.mjs`

**Ajout juste avant la boucle `for (const entry of contextEntries)`**:

```javascript
logger.info('[ProcessOggDudeData] DIAGNOSTIC - Pipeline initialization', {
  contextEntriesCount: contextEntries.length,
  contextEntriesTypes: contextEntries.map((e) => e.type),
  domainsToImport,
  buildContextMapKeys: Array.from(buildContextMap.keys()),
  hasSpecialization: buildContextMap.has('specialization'),
  specializationInEntries: contextEntries.some((e) => e.type === 'specialization'),
})
```

---

### Phase 4: Tests et Validation

#### TASK-008: Test de validation de la correction

**Procédure**:

1. Redémarrer Foundry VTT
2. Vider le cache navigateur (Cmd+Shift+R)
3. Ouvrir la console DevTools
4. Cocher uniquement "Load Specialization data"
5. Cliquer sur "Load"
6. Observer les logs et le tableau UI

**Critères de succès**:

- [ ] Log `[OggDudeDataImporter] Context prepared` montre `specializationInStats: true`
- [ ] Log `[ProcessOggDudeData] DIAGNOSTIC` montre `hasSpecialization: true`
- [ ] Tableau UI affiche ligne "Load Specialization data"
- [ ] Après import, colonnes Total/Imported/Rejected sont >0
- [ ] Dossier "Swerpg - Specializations" créé avec Items dedans

---

#### TASK-009: Test de non-régression

**Procédure**:

1. Cocher "Load Career data" ET "Load Specialization data"
2. Lancer l'import
3. Vérifier que les deux domaines créent des Items et stats

**Critères de succès**:

- [ ] Tableau UI montre 2 lignes avec stats >0
- [ ] 2 dossiers créés : "Swerpg - Careers" et "Swerpg - Specializations"
- [ ] Barre de progression passe à 2/2 (100%)

---

#### TASK-010: Test avec archive vide/incorrecte

**Procédure**:

1. Utiliser une archive OggDude sans répertoire `Data/Specializations`
2. Cocher "Load Specialization data"
3. Lancer l'import

**Critères de succès**:

- [ ] Log warning: "Domaine sans données, import ignoré"
- [ ] Ligne "Load Specialization data" affiche 0/0/0 (pas d'erreur)
- [ ] Pas de crash, UI reste fonctionnelle

---

### Phase 5: Amélioration de la Résilience

#### TASK-011: Ajouter validation de cohérence au démarrage

**Fichier**: `module/settings/OggDudeDataImporter.mjs`

**Ajout dans le constructeur ou \_onRender**:

```javascript
_validateConfiguration() {
  // S'assurer que buildContextMap dans oggDude.mjs contient tous les domaines de _domainNames
  const expectedDomains = new Set(this._domainNames)

  // Dans un environnement de prod, on ne peut pas inspecter buildContextMap directement
  // mais on peut vérifier que les stats utils existent pour chaque domaine
  const statsAvailable = {
    armor: typeof getArmorImportStats === 'function',
    weapon: typeof getWeaponImportStats === 'function',
    gear: typeof getGearImportStats === 'function',
    species: typeof getSpeciesImportStats === 'function',
    career: typeof getCareerImportStats === 'function',
    talent: typeof getTalentImportStats === 'function',
    obligation: typeof getObligationImportStats === 'function',
    specialization: typeof getSpecializationImportStats === 'function'
  }

  const missingStats = this._domainNames.filter(d => !statsAvailable[d])

  if (missingStats.length > 0) {
    logger.warn('[OggDudeDataImporter] Configuration warning: missing stats utilities', {
      missingDomains: missingStats
    })
  }

  return missingStats.length === 0
}
```

---

#### TASK-012: Ajouter message utilisateur si domaine non supporté

**Fichier**: `module/settings/OggDudeDataImporter.mjs`

**Modification dans `loadAction`**:

```javascript
static async loadAction(_event, target) {
  logger.info('[OggDudeDataImporter] Load OggDude Data', { instance: this })

  // Validation avant lancement
  const checkedDomains = this.domains.filter(d => d.checked)
  if (checkedDomains.length === 0) {
    ui.notifications.warn('Please select at least one domain to import.')
    return
  }

  // Vérifier que tous les domaines cochés sont supportés
  const unsupportedDomains = checkedDomains.filter(d =>
    !['weapon', 'armor', 'gear', 'species', 'career', 'talent', 'obligation', 'specialization'].includes(d.id)
  )

  if (unsupportedDomains.length > 0) {
    ui.notifications.error(`Unsupported domains: ${unsupportedDomains.map(d => d.id).join(', ')}`)
    logger.error('[OggDudeDataImporter] Unsupported domains selected', { unsupportedDomains })
    return
  }

  // ... reste du code existant
}
```

---

### Phase 6: Documentation et Mise à Jour

#### TASK-013: Mettre à jour le CHANGELOG

**Fichier**: `CHANGELOG.md`

**Ajout**:

```markdown
## [Version X.X.X] - 2025-11-22

### Fixed

- **Import OggDude Specializations**: Correction du bug empêchant l'affichage des statistiques et la création des Items pour le domaine "specialization"
  - Ajout de "specialization" dans la méthode `_buildImportDomainStatus` (OggDudeDataImporter.mjs)
  - Synchronisation de la liste des domaines entre UI et backend
  - Amélioration des logs de diagnostic pour faciliter le débogage futur

### Added

- **Import OggDude**: Validation de configuration au démarrage pour détecter les domaines manquants
- **Import OggDude**: Logs de diagnostic détaillés dans la console pour le suivi du pipeline d'import
```

---

#### TASK-014: Créer un test de non-régression

**Fichier**: `tests/settings/OggDudeDataImporter.specializationStats.spec.mjs`

**Contenu**:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter - Specialization Stats Display', () => {
  let importer

  beforeEach(() => {
    importer = new OggDudeDataImporter()
  })

  it('should include specialization in _domainNames', () => {
    expect(importer._domainNames).toContain('specialization')
  })

  it('should build importDomainStatus including specialization', () => {
    const mockStats = {
      specialization: { total: 5, imported: 4, rejected: 1 },
    }

    const status = importer._buildImportDomainStatus(mockStats)
    const specializationStatus = status.find((s) => s.domain === 'specialization')

    expect(specializationStatus).toBeDefined()
    expect(specializationStatus.total).toBe(5)
    expect(specializationStatus.imported).toBe(4)
    expect(specializationStatus.rejected).toBe(1)
  })

  it('should handle missing specialization stats gracefully', () => {
    const mockStats = {}

    const status = importer._buildImportDomainStatus(mockStats)
    const specializationStatus = status.find((s) => s.domain === 'specialization')

    expect(specializationStatus).toBeDefined()
    expect(specializationStatus.total).toBe(0)
    expect(specializationStatus.imported).toBe(0)
    expect(specializationStatus.rejected).toBe(0)
  })
})
```

---

## 🧪 Checklist de Validation Finale

### Avant le Commit

- [ ] Fichier `OggDudeDataImporter.mjs` modifié avec 'specialization' dans `_buildImportDomainStatus`
- [ ] Logs de diagnostic ajoutés dans `_prepareContext` et `processOggDudeData`
- [ ] Tests unitaires créés et passent
- [ ] Import manual testé avec succès en environnement Foundry
- [ ] Aucune régression sur les autres domaines (armor, weapon, etc.)

### Après le Déploiement

- [ ] Cache navigateur vidé + Foundry redémarré
- [ ] Console DevTools ouverte pendant un import test
- [ ] Ligne "Load Specialization data" visible dans tableau UI
- [ ] Stats affichées correctement (Total/Imported/Rejected >0)
- [ ] Dossier "Swerpg - Specializations" créé avec Items
- [ ] CHANGELOG.md mis à jour

---

## 📊 Métriques de Succès

- **Temps de correction**: <1h (modification simple d'une liste)
- **Couverture tests**: 100% de la méthode `_buildImportDomainStatus`
- **Taux de régression**: 0% (tests sur les 7 autres domaines)
- **Satisfaction utilisateur**: Résolution du bug visible immédiatement après import

---

## 🔗 Fichiers Concernés

### Fichiers à Modifier (Critique)

1. `module/settings/OggDudeDataImporter.mjs` - Ajouter 'specialization' dans `_buildImportDomainStatus`
2. `module/importer/oggDude.mjs` - Ajouter logs de diagnostic

### Fichiers à Vérifier (Validation)

3. `templates/settings/oggDudeDataImporter.hbs` - Vérifier itération sur `importDomainStatus`
4. `module/importer/items/specialization-ogg-dude.mjs` - Déjà correct (fourni en attachment)
5. `module/importer/utils/specialization-import-utils.mjs` - Déjà correct

### Fichiers à Créer (Tests)

6. `tests/settings/OggDudeDataImporter.specializationStats.spec.mjs` - Tests de non-régression

---

## 🚨 Points d'Attention

### Risques Identifiés

1. **Cache navigateur**: Utilisateur peut ne pas voir les changements → Ajouter instruction claire de vidage cache
2. **Archive sans Data/Specializations**: Ne doit pas crasher → Géré par validation dataset vide
3. **Typo dans nom domaine**: "specialization" vs "specializations" → Vérifier cohérence partout

### Mitigations

- Logs exhaustifs à chaque étape pour faciliter débogage
- Validation de configuration au démarrage
- Messages utilisateur clairs en cas d'erreur
- Tests unitaires couvrant les cas nominaux et edge cases

---

## 📚 Références

- Plan initial : `plan-featureImportSpecialization1.prompt.md`
- Code backend : `module/importer/oggDude.mjs`
- Code mapper : `module/importer/items/specialization-ogg-dude.mjs` (attachment fourni - correct)
- Code UI : `module/settings/OggDudeDataImporter.mjs`
- Stats utils : `module/importer/utils/global-import-metrics.mjs`

---

## ✅ Prochaines Étapes Immédiates

1. **MAINTENANT**: Lire le fichier `OggDudeDataImporter.mjs` pour localiser `_buildImportDomainStatus`
2. **PUIS**: Modifier la méthode pour ajouter 'specialization' à la liste
3. **ENSUITE**: Ajouter les logs de diagnostic
4. **ENFIN**: Tester en environnement Foundry réel et valider
