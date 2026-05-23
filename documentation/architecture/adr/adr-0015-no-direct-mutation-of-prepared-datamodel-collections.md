---
title: 'ADR-0015: Ne pas muter directement les collections préparées du DataModel'
status: 'Proposed'
date: '2026-05-23'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['foundry-vtt', 'data-model', 'mutation', 'actor']
---

## Status

**Proposed**

## Context

Dans un `DataModel` Foundry, `this` représente déjà `actor.system`.

Donc ceci est faux :

```js
this.system.details.specializations
````

Il faut écrire :

```js
this.details.specializations
```

Mais le vrai problème est ailleurs : il ne faut pas modifier directement une collection préparée du modèle :

```js
this.details.specializations.add(data)
```

puis la réécrire ensuite avec :

```js
actor.update({
  'system.details.specializations': this.details.specializations,
})
```

Cette pratique est fragile, car elle mélange :

* lecture du modèle préparé ;
* mutation en place ;
* persistance Foundry.

## Decision

Les collections issues de `actor.system` ou `item.system` ne doivent pas être mutées directement avant un `update()`.

Interdit :

```js
this.details.specializations.add(data)
this.progression.talentPurchases.push(purchase)
this.someCollection.set(key, value)
this.someArray.splice(index, 1)
```

À la place, on construit une nouvelle valeur persistable.

## Rule

### Mauvais

```js
this.details.specializations.add(data)

await actor.update({
  'system.details.specializations': this.details.specializations,
})
```

### Bon

```js
const specializations = Array.from(this.details.specializations || [])

await actor.update({
  'system.details.specializations': [
    ...specializations,
    data,
  ],
})
```

## Application

Correction recommandée pour l’acquisition d’une spécialisation :

```js
async acquireSpecialization(specialization) {
  const actor = this.parent
  const itemData = specialization.toObject()

  const acquiredSpecialization = {
    ...itemData.system,
    name: itemData.name,
    img: itemData.img,
    freeSkillRank: 0,
  }

  const specializations = Array.from(this.details.specializations || [])

  await actor.update(
    {
      'system.details.specializations': [
        ...specializations,
        acquiredSpecialization,
      ],
    },
    { keepEmbeddedIds: true },
  )
}
```

## Consequences

### Positive

* moins d’effets de bord ;
* payloads `update()` plus lisibles ;
* tests plus simples ;
* meilleure compatibilité avec l’évolution de Foundry ;
* séparation claire entre modèle préparé et donnée persistée.

### Negative

* code un peu plus verbeux ;
* refactor progressif nécessaire ;
* vigilance en review sur `.add()`, `.push()`, `.set()`, `.delete()`, `.splice()`.

## Implementation Notes

* Lire depuis `this`.
* Copier la collection.
* Construire la nouvelle valeur.
* Persister avec `this.parent.update(...)`.
* Ne jamais utiliser une collection préparée comme payload muté.

## Tests attendus

Vérifier que :

1. la spécialisation est ajoutée ;
2. `freeSkillRank` vaut `0` ;
3. les spécialisations existantes sont conservées ;
4. aucun test ne dépend d’une mutation directe du `SetField`.

## References

* Foundry VTT - DataModel
* Foundry VTT - Document update workflow
* SWERPG ADR-0012 - Tests unitaires lisibles et diagnostiques
