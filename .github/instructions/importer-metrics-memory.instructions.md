---
description: "Mémoire — Agrégateur de métriques Importer OggDude & stratégies de test"
applyTo: "module/importer/**/*.mjs, tests/importer/**/*.mjs"
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
await new Promise(r => setTimeout(r, 20))
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

## Checklist PR / Revue
- `resetRuntimeMetrics()` exposé et utilisé dans `beforeEach()`.
- `aggregateImportMetrics()` robustifié (validation start/end, fallback timing).
- Tests utilisent `statsOverride` ou `vi.spyOn` au lieu d'écrire sur exports.
- Documenter la présence du fallback et du reset dans la description de la PR.

## Pourquoi ceci aide
- Évite erreurs compliquées en CI liées aux environnements d'exécution (performance vs Date).
- Rend les TU plus robustes et évite coups de chance (flaky tests) dus à état partagé.
- Donne une stratégie claire pour tester des fonctions qui lisent des exports ou des modules dépendants.

---
applyTo: "module/importer/**/*.mjs, tests/importer/**/*.mjs"
