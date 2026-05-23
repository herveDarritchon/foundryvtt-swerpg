---
title: 'ADR-0016: Usage de DialogV2.confirm'
status: 'Proposed'
date: '2026-05-23'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['foundry-vtt', 'ui', 'dialogv2', 'applicationv2']
---

## Status

**Proposed**

## Context

`DialogV2.confirm()` est un composant Foundry destiné aux confirmations binaires.

Il retourne un booléen :

```js
true // confirmation
false // annulation
```

Il fournit déjà deux boutons internes :

```txt
yes
no
```

Ces boutons peuvent être personnalisés, mais ils ne doivent pas être remplacés par `buttons`.

## Decision

Le projet utilise `DialogV2.confirm()` uniquement pour les dialogues à deux issues :

```txt
confirmer / annuler
oui / non
continuer / abandonner
```

La personnalisation des boutons se fait exclusivement via :

```js
yes: { ... }
no: { ... }
```

`buttons` est interdit avec `DialogV2.confirm()`.

## Règle de surcharge des boutons

### Correct

```js
const confirmed = await foundry.applications.api.DialogV2.confirm({
  window: {
    title,
  },
  content,
  yes: {
    label: confirmLabel,
    icon: 'fa-solid fa-check',
  },
  no: {
    label: cancelLabel,
    icon: 'fa-solid fa-xmark',
  },
})
```

Ici, `yes` surcharge le bouton de confirmation par défaut.

`no` surcharge le bouton d’annulation par défaut.

Le dialogue conserve exactement deux boutons.

### Interdit

```js
await foundry.applications.api.DialogV2.confirm({
  window: {
    title,
  },
  content,
  buttons: [
    {
      action: 'confirm',
      label: confirmLabel,
    },
    {
      action: 'cancel',
      label: cancelLabel,
    },
  ],
})
```

Avec `DialogV2.confirm()`, `buttons` ajoute des boutons supplémentaires au lieu de surcharger `yes` et `no`.

## Quand utiliser DialogV2.confirm

Utiliser `DialogV2.confirm()` si :

1. l’utilisateur doit valider ou annuler une action ;
2. le résultat attendu est strictement booléen ;
3. il n’y a que deux choix possibles.

Exemples :

```txt
Dépenser 40 XP ?
Oublier ce talent ?
Supprimer cette spécialisation ?
Confirmer cette modification ?
```

## Quand ne pas l’utiliser

Ne pas utiliser `DialogV2.confirm()` si le dialogue contient :

1. plus de deux choix ;
2. un formulaire ;
3. une sélection ;
4. plusieurs actions métier ;
5. un résultat autre que `true` ou `false`.

Dans ces cas, utiliser `DialogV2.wait()` ou une `ApplicationV2` dédiée.

## Exemple projet

```js
const confirmed = await foundry.applications.api.DialogV2.confirm({
  window: {
    title: i18n.format('SPECIALIZATION.PURCHASE.CONFIRM_TITLE', {
      name: specializationName,
    }),
  },
  content,
  yes: {
    label: i18n.format('SPECIALIZATION.PURCHASE.CONFIRM_BUTTON', {
      cost: cost.finalCost,
    }),
    icon: 'fa-solid fa-check',
  },
  no: {
    label: i18n.localize('SPECIALIZATION.PURCHASE.CANCEL_BUTTON'),
    icon: 'fa-solid fa-xmark',
  },
})

if (!confirmed) return
```

## Consequences

### Positive

- usage clair de `DialogV2.confirm()` ;
- deux boutons maximum garantis ;
- retour booléen simple ;
- code plus lisible ;
- moins de dialogues UI incohérents.

### Negative

- nécessite de choisir explicitement `DialogV2.wait()` pour les dialogues non binaires.

## Code Review Checklist

Refuser systématiquement :

```js
DialogV2.confirm({
  buttons: [...]
})
```

Accepter :

```js
DialogV2.confirm({
  yes: {...},
  no: {...},
})
```

Utiliser `DialogV2.wait()` dès que le dialogue n’est pas strictement booléen.

## References

- Foundry VTT - `DialogV2.confirm`
- Foundry VTT - `DialogV2.wait`
