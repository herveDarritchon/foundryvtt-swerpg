---
description: 'Mémoire — Agrégateur de métriques Importer OggDude & stratégies de test'
applyTo: 'module/importer/**/*.mjs, tests/importer/**/*.mjs'
---

# Importer Metrics Memory

Conserver et partager les leçons relatives à l'agrégateur global de métriques et aux patterns de tests utilisés pour l'import OggDude.

Tagline: Robustesse des métriques (durées, items/s, taux d'erreur) et bonnes pratiques pour les TU.

## Leçon: reset runtime & état déterministe

- Exposer `resetRuntimeMetrics()` dans `module/importer/utils/global-import-metrics.mjs` pour réinitialiser l'état interne entre tests.
- Appeler ce `reset` dans `beforeEach()` des TU/IT pour éviter la fuite d'état entre tests.

## Leçon: fallback pour timing

- Ne pas dépendre exclusivement de `performance.now()`.
- Utiliser un fallback safe: `const now = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()`.
- Garantir l'interop entre Node/Vitest et environnements navigateur.

## Leçon: validations avant calcul de durée

- Toujours vérifier que `start` et `end` sont des nombres finis et que `end >= start` avant de retourner `end - start`.
- En cas d'incohérence, retourner `0` pour éviter NaN/valeurs négatives.

## Leçon: patterns de tests pour exports ESM

- Ne pas écrire directement sur les exports ESM (ex: `module.fn = ...`) — ces exports peuvent être en lecture seule et provoquer une erreur.
- Solutions:
  - Fournir un `aggregateImportMetrics(statsOverride)` optionnel pour permettre aux TU de passer des stats factices.
  - Utiliser `vi.spyOn(module, 'fn').mockReturnValue(...)` pour remplacer proprement un export lors du test.

## Exemple de TU (pratique)

```js
// Option A: stats override
const stats = { totalProcessed: 10, totalRejected: 2, totalImported: 8 }
markGlobalStart()
await new Promise((r) => setTimeout(r, 20))
markGlobalEnd()
const res = aggregateImportMetrics(stats)
expect(res.itemsPerSecond).toBeGreaterThan(0)

// Option B: spy
const spy = vi.spyOn(metricsModule, 'getAllImportStats').mockReturnValue(stats)
// ... run markers
spy.mockRestore()
```

## Leçon: ne pas modifier le code de production pour faire passer les TU

- Préférer corriger les TU (mocks, fixtures, spy) ou ajouter des paramètres non intrusifs (ex: statsOverride).
- Documenter toute modification non triviale dans la PR.

## Leçon: préservation des stats du dernier import réussi

- **Problème identifié** : L'UI affichait `Overall Duration` et `Items/Second` à 0 car `aggregateImportMetrics()` était appelée après que les stats individuelles aient été réinitialisées.
- **Solution** : Ajouter `lastImportStats` dans `_runtime` pour conserver les stats du dernier import réussi.
- **Logique** : Si `currentStats.totalImported === 0` mais `lastImportStats.totalImported > 0`, utiliser les stats préservées.
- **Test** : Vérifier que les métriques restent cohérentes entre l'import et l'affichage UI.

## Leçon: rafraîchissement UI après opérations asynchrones FoundryVTT

- **Problème identifié** : Les métriques globales (`Overall Duration`, `Items/Second`) restaient à 0 dans l'UI après l'import jusqu'à interaction utilisateur.
- **Cause racine** : L'UI était rafraîchie **pendant** l'import (via `progressCallback`) mais **pas après** la fin de `processOggDudeData`.
- **Pattern de solution** : Ajouter `render()` explicite après toute opération async qui modifie l'état UI.

### Implementation dans OggDudeDataImporter

```js
// Après processOggDudeData, dans loadAction() et _onSubmit()
if (typeof this.render === 'function') {
  try {
    await this.render()
    logger.debug('[OggDudeDataImporter] UI refreshed after import completion')
  } catch (e) {
    logger.warn('[OggDudeDataImporter] render after import error', { e })
  }
}
```

### Caractéristiques du pattern sécurisé

- ✅ **Vérification de disponibilité** : `typeof this.render === 'function'`
- ✅ **Gestion d'erreur gracieuse** : `try/catch` pour éviter que render() bloque l'import
- ✅ **Logs de debug** : Traçabilité pour diagnostic
- ✅ **Tests de validation** : Vérifier présence du code via analyse de contenu fichier

### Généralisation pour autres composants UI FoundryVTT

- Toujours appeler `render()` après opérations async qui modifient l'état affiché
- Ne jamais assumer que l'UI se rafraîchit automatiquement après operations métier
- Préférer `await this.render()` plutôt que `this.render()` pour s'assurer de la completion
- Toujours wrapper dans try/catch pour éviter impact sur logique métier

## Checklist PR / Revue

- `resetRuntimeMetrics()` exposé et utilisé dans `beforeEach()`.
- `aggregateImportMetrics()` robustifié (validation start/end, fallback timing).
- Tests utilisent `statsOverride` ou `vi.spyOn` au lieu d'écrire sur exports.
- Stats du dernier import préservées pour éviter valeurs zéro dans UI.
- **Rafraîchissement UI automatique** : `render()` appelé après operations async qui modifient state UI.
- Tests de validation UI incluent vérification code pattern (analyse contenu fichier).
- Documenter la présence du fallback et du reset dans la description de la PR.

## Pourquoi ceci aide

- Évite erreurs compliquées en CI liées aux environnements d'exécution (performance vs Date).
- Rend les TU plus robustes et évite coups de chance (flaky tests) dus à état partagé.
- Donne une stratégie claire pour tester des fonctions qui lisent des exports ou des modules dépendants.

---

applyTo: "module/importer/**/\*.mjs, tests/importer/**/\*.mjs"
