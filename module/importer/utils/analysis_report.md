# Analyse de l'utilisation de ImportStats

## Constat

Il existe effectivement une différence d'utilisation de `ImportStats` entre les modules simples (comme `duty`) et les modules plus complexes (comme `talent`).

### Cas Standard (`duty`, `armor`, etc.)

Ces modules utilisent les métriques par défaut fournies par la classe `ImportStats` :

- `total` : Nombre total d'éléments traités.
- `rejected` : Nombre d'éléments rejetés.
- `imported` : Calculé automatiquement (`total - rejected`).

Appel : `new ImportStats()` (pas de paramètres, car les défauts suffisent).

### Cas Complexe (`talent`)

Le module `talent` utilise des noms de métriques historiques/spécifiques qui diffèrent du standard :

- `processed` au lieu de `total`.
- `failed` au lieu de `rejected`.
- De nombreuses métriques détaillées (`validation_failed`, `transform_failed`, etc.).

Appel : `new ImportStats({ processed: 0, failed: 0, ... })`.
Cela force `ImportStats` à suivre ces compteurs spécifiques. Ensuite, la fonction `getTalentImportStats` doit faire un "mapping" manuel pour renvoyer des données conformes au standard attendu par le système global (`total`, `imported`, `rejected`).

## Pourquoi ?

Cette divergence est due à un héritage de code. Le refactoring initial a préservé les noms de variables internes pour minimiser les risques de régression (changement "à iso-fonctionnalité").

## Proposition de Standardisation

Il est tout à fait possible et recommandé de simplifier et standardiser le code.

### Actions proposées

1. **Aligner les noms de métriques** : Renommer `processed` en `total` et `failed` en `rejected` dans `talent-import-utils.mjs`.
2. **Garder les métriques spécifiques** : Conserver les compteurs de détails (`validation_failed`, etc.) comme métriques additionnelles.
3. **Simplifier l'instanciation** : Ne passer que les métriques *supplémentaires* au constructeur.

### Exemple Avant/Après pour Talent

**Avant :**

```javascript
const talentStats = new ImportStats({
  processed: 0, // Doublon sémantique de total
  failed: 0,    // Doublon sémantique de rejected
  validation_failed: 0,
  // ...
})
// + Mapping manuel en sortie
```

**Après :**

```javascript
const talentStats = new ImportStats({
  validation_failed: 0, // Uniquement les métriques custom
  transform_failed: 0,
  // ...
})
// Utilisation de .increment('total') au lieu de .increment('processed')
// Plus besoin de mapping manuel pour total/rejected
```

Cela rendra le code plus lisible et l'utilisation de `ImportStats` cohérente partout.
