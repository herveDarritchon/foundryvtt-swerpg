---
title: 'ADR-0021: Scrollable Areas dans les ApplicationV2 — Pattern PARTS + CSS'
status: 'Accepted'
date: '2026-05-29'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'ui', 'applicationv2', 'css', 'scroll', 'foundry-v14']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Applicable à toute ApplicationV2 du codebase `swerpg`.

## Context

Foundry VTT v14+ fournit un mécanisme natif de gestion du scroll dans `HandlebarsApplicationMixin` : la propriété `scrollable` sur chaque entrée de `PARTS`. Ce mécanisme sauvegarde `scrollTop` avant un re-render et le restaure après, éliminant le saut visuel et la perte de position.

Sans ce mécanisme, chaque re-render (modification de données, navigation entre onglets, tick d'update) remet le scroll à zéro. Ce problème est invisible sur les contenus courts et systématique sur les listes longues.

Deux anti-patterns récurrents ont été observés dans le projet :

1. **`scrollable` déclaré dans `PARTS` sans conteneur CSS correct** : le sélecteur ne trouve rien ou le conteneur n'a pas de hauteur contrainte → `overflow-y: auto` est sans effet.
2. **CSS correct sans `scrollable` dans `PARTS`** : le scroll fonctionne visuellement mais la position est perdue à chaque re-render.

Les deux composants sont nécessaires et indissociables.

## Decision

**Tout conteneur scrollable dans une ApplicationV2 doit combiner :**

1. La propriété `scrollable` dans `PARTS` (Foundry persiste le `scrollTop`)
2. Un conteneur HTML avec classe `.scrollable` (cible du sélecteur)
3. Des règles CSS garantissant `overflow-y: auto` avec hauteur contrainte

### Règle principale

```
Aucune zone à contenu variable ne doit scroller sans déclarer
`scrollable` dans PARTS et sans contrainte CSS de hauteur.
```

### Phase 1 — Déclarer `scrollable` dans `PARTS`

Chaque PART susceptible de contenir plus de contenu que sa hauteur visible doit déclarer le sélecteur de son conteneur scrollable :

```js
static PARTS = {
  myPart: {
    id: 'myPart',
    template: 'systems/swerpg/templates/…/my-part.hbs',
    scrollable: ['.scrollable'],
  },
}
```

**Règle de sélecteur** : utiliser `.scrollable` comme classe marqueuse uniforme. Ne pas utiliser de sélecteurs sémantiques spécifiques à la PART (ex: `.skills-wrapper`) — ils couplent `PARTS` aux noms internes des templates et cassent silencieusement lors d'un refactor.

**Exception** : si une PART contient plusieurs zones scrollables indépendantes, lister chaque sélecteur :

```js
scrollable: ['.scrollable-left', '.scrollable-right'],
```

### Phase 2 — Ajouter la classe `.scrollable` dans le template

Le conteneur ciblé par le sélecteur `PARTS.*.scrollable` doit porter la classe `.scrollable` dans le template Handlebars :

```handlebars
<section class='tab scrollable' data-tab='{{tabs.myPart.id}}' data-group='{{tabs.myPart.group}}'>
  <!-- contenu potentiellement long -->
</section>
```

Si le conteneur racine de la PART est déjà la cible, lui ajouter la classe suffit. Si la PART a une structure avec header fixe + corps scrollable, ne poser `.scrollable` que sur le corps :

```handlebars
<section class='tab' data-tab='{{tabs.myPart.id}}' data-group='{{tabs.myPart.group}}'>
  <header class='part-header'>…</header>
  <div class='scrollable'>
    <!-- contenu scrollable -->
  </div>
</section>
```

### Phase 3 — CSS : contrainte de hauteur

`overflow-y: auto` est sans effet sans hauteur contrainte sur le conteneur. Deux patterns selon la structure parent :

**Pattern A — Parent flex column (recommandé pour les onglets)**

```less
.swerpg.sheet {
  .window-content {
    display: flex;
    flex-direction: column;
  }

  [data-application-part] {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; // essentiel : empêche le débordement hors du flex container

    .scrollable {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
  }
}
```

**Pattern B — Hauteur fixe ou pourcentage**

```less
.my-app {
  .scrollable {
    overflow-y: auto;
    height: 100%; // fonctionne seulement si le parent a une hauteur définie
  }
}
```

**Règle de choix** : préférer le Pattern A (flex) pour toute ApplicationV2 dont la hauteur est contrôlée par Foundry (fenêtres redimensionnables). Utiliser le Pattern B uniquement pour des UI à dimensions fixes.

### Ce qui est interdit

```js
// ❌ scrollable déclaré mais sélecteur absent du template → aucun effet
static PARTS = { myPart: { scrollable: ['.scrollable'] } }
// template ne contient pas class="scrollable" → Foundry ne trouve rien

// ❌ CSS correct mais PARTS sans scrollable → scroll fonctionne, position perdue à chaque re-render
static PARTS = { myPart: { template: '…' } } // scrollable omis
// template et CSS corrects → scroll visuel OK, mais position reset au re-render

// ❌ Sélecteur couplé au nom interne du template
static PARTS = { myPart: { scrollable: ['.skills-wrapper'] } }
// renommer .skills-wrapper casse silencieusement la persistance du scroll
```

### Ce qui est autorisé

```js
// ✅ Pattern complet : PARTS + template + CSS
static PARTS = {
  skills: {
    id: 'skills',
    template: 'systems/swerpg/templates/…/skills.hbs',
    scrollable: ['.scrollable'],
  },
}
```

```handlebars
{{! skills.hbs }}
<section class='tab scrollable' data-tab='skills' data-group='primary'>
  <!-- liste de compétences -->
</section>
```

```less
[data-application-part='skills'] {
  .scrollable {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
}
```

## Quand appliquer ce pattern

| Cas                                                                             | Scrollable ? |
| ------------------------------------------------------------------------------- | ------------ |
| Liste d'items potentiellement longue (inventaire, talents, compétences, effets) | Oui          |
| Texte biographique / notes libres                                               | Oui          |
| Formulaire compact à champs fixes (attributs, en-tête de fiche)                 | Non          |
| Header fixe d'une fenêtre (nom du personnage, portrait)                         | Non          |
| Contenu dont la hauteur est garantie inférieure à la fenêtre                    | Non          |

En cas de doute, appliquer le pattern — il est sans effet visible si le contenu ne déborde pas.

## Consequences

### Positif

- **Position scroll préservée** lors des re-renders (modification de données, navigation entre onglets).
- **Zéro code custom** : Foundry gère `scrollTop` automatiquement via `PARTS.scrollable`.
- **Pattern uniforme** : `.scrollable` comme classe marqueuse évite la prolifération de sélecteurs ad hoc.
- **Testable visuellement** : le scroll perdu au re-render est immédiatement observable lors du test manuel.

### Négatif / Contraintes

- `min-height: 0` est contre-intuitif dans les layouts flex — sans cette règle, un enfant flex ignore la contrainte de hauteur du parent. Toujours l'ajouter sur les conteneurs `flex: 1` scrollables.
- Un sélecteur `scrollable` qui ne trouve aucun élément dans le DOM ne provoque pas d'erreur — l'oubli de classe dans le template passe silencieusement.

## Checklist agent (LLM)

Avant d'ajouter ou de modifier une zone potentiellement scrollable dans une ApplicationV2 :

1. **Cette PART peut-elle contenir plus de contenu que sa hauteur visible ?** → Si oui, ajouter `scrollable: ['.scrollable']` dans `PARTS`.
2. **Le template a-t-il un conteneur `.scrollable` ?** → Vérifier ou ajouter la classe sur le conteneur cible.
3. **Le CSS applique-t-il `overflow-y: auto` avec hauteur contrainte ?** → Vérifier `flex: 1; min-height: 0` sur le conteneur et son parent flex.
4. **Plusieurs zones scrollables dans une PART ?** → Lister chaque sélecteur dans `scrollable: ['.sel-a', '.sel-b']`.
5. **Aucun parent n'a `overflow: hidden` qui bloquerait le scroll ?** → Vérifier la chaîne CSS parente.

## Références

- [Foundry VTT v14 ApplicationV2 docs — PARTS.scrollable](https://foundryvtt.com/api/v14/classes/client.HandlebarsApplicationMixin.html)
- `module/applications/market/market-application.mjs` — exemple `PARTS.catalog.scrollable: ['.market-catalog']`
- `module/applications/character-audit-log.mjs` — exemple `PARTS.root.scrollable: ['.audit-log__entries']`
- `module/applications/specialization-tree/specialization-tree-app.mjs` — exemple multi-zone
- [ADR-0017 — E2E Playwright interaction contract](adr-0017-e2e-playwright-interaction-contract-and-browser-error-capture.md) — validation manuelle attendue en phase 4
