# Fix - Statistiques d'import Obligations dans l'UI

## 🐛 Problème

Les statistiques d'import pour le domaine **Obligations** n'apparaissaient pas dans l'interface utilisateur (fenêtre OggDude Data Importer), bien que :

- Le domaine soit enregistré dans `_domainNames`
- Le mapper et les utilitaires de stats fonctionnent correctement
- Les tests unitaires et d'intégration passent (38/38 ✅)

## 🔍 Diagnostic

Le template Handlebars `templates/settings/oggDudeDataImporter.hbs` contenait des lignes de tableau HTML pour afficher les statistiques de chaque domaine, mais **la ligne pour obligation était absente**.

Le template affichait uniquement :

- armor
- weapon  
- gear
- species
- career
- talent

**❌ Manquant** : obligation

## ✅ Solution

Ajout de la ligne de tableau HTML pour le domaine obligation dans le template, suivant exactement le même pattern que les autres domaines.

### Fichier modifié

**`templates/settings/oggDudeDataImporter.hbs`** (ligne ~149-155)

Ajout de :

```handlebars
<tr>
    <td class="{{importDomainStatus.obligation.class}}" aria-label="{{localize importDomainStatus.obligation.labelI18n}}"><i class="fa-solid fa-circle" aria-hidden="true"></i></td>
    <th scope="row">{{localize "SETTINGS.OggDudeDataImporter.loadWindow.domains.obligation"}}</th>
    <td>{{importStats.obligation.total}}</td>
    <td>{{importStats.obligation.imported}}</td>
    <td>{{importStats.obligation.rejected}}</td>
    <td>{{importMetricsFormatted.domains.obligation.duration}}</td>
</tr>
```

### Test de validation ajouté

**`tests/settings/oggDudeDataImporter.template.spec.mjs`**

Nouveau test vérifiant la présence de tous les placeholders Handlebars pour obligation :

```javascript
it('inclut les statistiques pour le domaine obligation', () => {
  expect(source.includes('{{importDomainStatus.obligation.class}}')).toBe(true)
  expect(source.includes('{{importStats.obligation.total}}')).toBe(true)
  expect(source.includes('{{importStats.obligation.imported}}')).toBe(true)
  expect(source.includes('{{importStats.obligation.rejected}}')).toBe(true)
  expect(source.includes('{{importMetricsFormatted.domains.obligation.duration}}')).toBe(true)
})
```

**`tests/importer/oggDudeDataImporter.spec.mjs`**

Nouveau test vérifiant que `_buildImportDomainStatus()` génère bien un statut pour obligation :

```javascript
it('_buildImportDomainStatus génère les statuts pour tous les domaines incluant obligation', () => {
  const mockStats = {
    weapon: { total: 10, imported: 10, rejected: 0 },
    armor: { total: 5, imported: 5, rejected: 0 },
    gear: { total: 8, imported: 6, rejected: 2 },
    species: { total: 0, imported: 0, rejected: 0 },
    career: { total: 3, imported: 3, rejected: 0 },
    talent: { total: 20, imported: 18, rejected: 2 },
    obligation: { total: 41, imported: 41, rejected: 0 },
  }

  const result = importer._buildImportDomainStatus(mockStats)

  // Vérifier que obligation a bien un statut
  expect(result.obligation).toHaveProperty('code')
  expect(result.obligation).toHaveProperty('labelI18n')
  expect(result.obligation).toHaveProperty('class')
  expect(result.obligation.code).toBe('success')
  expect(result.obligation.labelI18n).toBe('SETTINGS.OggDudeDataImporter.loadWindow.stats.status.success')
  expect(result.obligation.class).toBe('domain-status domain-status--success')
})
```

## 📊 Validation

### Tests automatisés

- ✅ **34/34 tests** passent pour OggDudeDataImporter
- ✅ **38/38 tests** passent pour le domaine obligation (utils + mapper + integration)
- ✅ Nouveau test template vérifie présence de tous les placeholders obligation
- ✅ Nouveau test unitaire vérifie génération du statut obligation

### Checklist de validation

- [x] Le template inclut la ligne HTML pour les stats obligation
- [x] Les 5 colonnes sont présentes : Status, Domain, Total, Imported, Rejected, Duration
- [x] Les placeholders Handlebars sont corrects (même pattern que les autres domaines)
- [x] L'accessibilité est maintenue (aria-label, scope="row", etc.)
- [x] La localisation est cohérente (clé `SETTINGS.OggDudeDataImporter.loadWindow.domains.obligation` existe en FR et EN)
- [x] Le statut visuel (icône colorée) est calculé via `importDomainStatus.obligation`
- [x] Tests de couverture ajoutés pour éviter régression

## 🎯 Impact

### Avant

- ❌ Domaine obligation absent du tableau de statistiques
- ❌ Aucun retour visuel sur l'import des obligations (total, imported, rejected, duration)
- ⚠️ Expérience utilisateur incomplète

### Après

- ✅ Domaine obligation visible dans le tableau avec toutes les métriques
- ✅ Icône de statut colorée (pending/success/mixed/error)
- ✅ Cohérence visuelle avec les autres domaines
- ✅ Expérience utilisateur complète

## 🔄 Intégration

### Dépendances existantes validées

- ✅ `module/importer/items/obligation-ogg-dude.mjs` : mapper fonctionnel
- ✅ `module/importer/utils/obligation-import-utils.mjs` : stats tracking opérationnel
- ✅ `module/importer/utils/global-import-metrics.mjs` : obligation intégré dans `getAllImportStats()`
- ✅ `module/settings/OggDudeDataImporter.mjs` : obligation dans `_domainNames`
- ✅ `lang/fr.json` & `lang/en.json` : clés de localisation présentes

### Pattern de preview

La section preview (dropdown de filtrage) utilise déjà `{{#each domains}}`, donc obligation apparaîtra automatiquement dans la liste des filtres sans modification supplémentaire.

## 🚀 Prochaines étapes

Aucune action supplémentaire requise. La feature d'import des obligations est maintenant complète :

1. ✅ Mapper et context builder implémentés
2. ✅ Tests unitaires et d'intégration passent  
3. ✅ UI activée (checkbox + label)
4. ✅ Localisation FR/EN présente
5. ✅ **Statistiques visibles dans l'interface** ← correction actuelle
6. ✅ Documentation complète (`documentation/importer/import-obligation.md`)

---

**Date** : 19 novembre 2025  
**Fichiers modifiés** : 1 (template) + 2 (tests)  
**Tests ajoutés** : 2 (template + domainStatus)  
**Tests totaux** : 72 (obligation: 38, OggDudeDataImporter: 34)  
**Status** : ✅ **Résolu et validé**
