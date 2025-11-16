# Phase 4 - Conformité CSS/HTML - Documentation Technique

> **Phase 4** du plan de refactorisation des sheets swerpg - Finalisation de la conformité architecturale selon les standards Foundry VTT v13.

---

## Contexte de la Phase 4

**Date**: 8 novembre 2025  
**Objectif**: Corriger les dernières non-conformités CSS/HTML et ApplicationV2  
**Priorité**: Faible (système déjà fonctionnel)  
**Statut**: ✅ **Complétée**

## Analyse de Conformité Effectuée

### 1. Audit des Classes CSS

**Classes de base validées** :

```javascript
// ✅ SwerpgBaseItemSheet
static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'item', 'standard-form'], // Base correcte
}

// ✅ SwerpgBaseActorSheet
static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'actor', 'standard-form'], // Base correcte
}
```

**Méthodes d'initialisation validées** :

```javascript
// ✅ _initializeItemSheetClass() - Fusion correcte des classes
const baseClasses = this.DEFAULT_OPTIONS.classes || ['swerpg', 'item', 'standard-form']
const itemTypeClass = this.DEFAULT_OPTIONS.item.type
this.DEFAULT_OPTIONS.classes = [...new Set([...baseClasses, 'sheet', 'item', itemTypeClass])]

// ✅ _initializeActorSheetClass() - Fusion correcte des classes
const baseClasses = this.DEFAULT_OPTIONS.classes || ['swerpg', 'actor', 'standard-form']
const actorTypeClass = actor.type
this.DEFAULT_OPTIONS.classes = [...new Set([...baseClasses, 'sheet', 'actor', actorTypeClass])]
```

**Résultat** : Toutes les sheets respectent le pattern `['swerpg', 'sheet', 'actor/item', 'standard-form', '{type}']`

### 2. Validation des Templates HTML

**Structure sémantique validée** :

- ✅ **Acteurs** : `hero-header.hbs` utilise `<section class="sheet-header">` + `<header class="title">`
- ✅ **Navigation** : `tabs.hbs` utilise `<nav class="sheet-tabs tabs">`
- ✅ **Contenu** : `body.hbs` utilise `<section class="sheet-body">`
- ✅ **Items** : `item-header.hbs` utilise `<header class="sheet-header">`

**Architecture ApplicationV2** respectée : Classes CSS appliquées via JavaScript, non dans templates.

### 3. Audit ApplicationV1/V2

**Non-conformité identifiée** : `skill.mjs` utilisait encore ApplicationV1

```javascript
// ❌ PROBLÈME
export default class SkillPageSheet extends foundry.appv1.sheets.JournalPageSheet
```

**Toutes les autres sheets** : ✅ ApplicationV2 conforme

## Migration ApplicationV1 → ApplicationV2

### Objectif

Migrer `SkillPageSheet` de ApplicationV1 vers ApplicationV2 selon les standards définis.

### Code Changes Implémentés

#### Avant (ApplicationV1)

```javascript
export default class SkillPageSheet extends foundry.appv1.sheets.JournalPageSheet {
  static get defaultOptions() {
    const options = super.defaultOptions
    options.viewClasses.push('swerpg', 'skill')
    options.scrollY = ['.scrollable']
    return options
  }

  async getData(options = {}) {
    const context = await super.getData(options)
    context.skills = SKILL.SKILLS
    context.skill = SKILL.SKILLS[context.data.system.skillId]
    // ... préparation données
    return context
  }
}
```

#### Après (ApplicationV2)

```javascript
const { api, sheets } = foundry.applications

export default class SkillPageSheet extends api.HandlebarsApplicationMixin(sheets.JournalPageSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'skill'],
    scrollable: ['.scrollable'],
  }

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options)

    // ✅ Standard minimum OBLIGATOIRE selon le plan Phase 2.2
    context.document = this.document
    context.system = this.document.system
    context.config = game.system.config
    context.isOwner = this.document.isOwner

    // Préparation spécifique à la skill page
    context.skills = SKILL.SKILLS
    context.skill = SKILL.SKILLS[context.document.system.skillId]
    context.tags = this.#getTags(context.skill)
    context.ranks = this.#prepareRanks(context.document.system.ranks)
    context.paths = this.#preparePaths(context.document.system.paths)
    return context
  }
}
```

### Changements Techniques Détaillés

| Aspect             | ApplicationV1                           | ApplicationV2                                               |
| ------------------ | --------------------------------------- | ----------------------------------------------------------- |
| **Classe de base** | `foundry.appv1.sheets.JournalPageSheet` | `api.HandlebarsApplicationMixin(sheets.JournalPageSheetV2)` |
| **Configuration**  | `static get defaultOptions()`           | `static DEFAULT_OPTIONS = {}`                               |
| **Classes CSS**    | `options.viewClasses.push()`            | `classes: ['swerpg', 'skill']`                              |
| **Scrolling**      | `options.scrollY = ['.scrollable']`     | `scrollable: ['.scrollable']`                               |
| **Context**        | `async getData(options)`                | `async _prepareContext(options)`                            |
| **Data access**    | `context.data.system`                   | `context.document.system`                                   |

### Bénéfices de la Migration

- ✅ **100% ApplicationV2** : Plus aucune sheet ApplicationV1 dans le système
- ✅ **Standard context** : Template `_prepareContext()` obligatoire respecté
- ✅ **Compatibilité Foundry v13** : Utilise les APIs modernes recommandées
- ✅ **Maintien fonctionnel** : Aucune régression de fonctionnalité

## Tests et Validation

### Tests de Régression

**Build complet** :

- ✅ Prettier formatting : 100% des fichiers conformes
- ✅ Compilation packs : 9 databases compilées avec succès
- ✅ Rollup bundle : Bundle généré sans erreurs
- ✅ LESS compilation : CSS généré correctement

**Tests unitaires** :

- ✅ **150/150 tests passent** : Aucune régression fonctionnelle
- ✅ **17 fichiers de test** : Toutes les suites réussies
- ✅ **Durée**: 779ms (performance maintenue)

### Validation de Conformité

**Standards respectés** :

1. ✅ **Classes CSS** : Pattern `['swerpg', 'sheet', 'type', 'standard-form', 'specificType']`
2. ✅ **ApplicationV2** : 100% des sheets utilisent les APIs modernes
3. ✅ **Context standard** : Template `_prepareContext()` dans toutes les sheets
4. ✅ **Structure HTML** : Sémantique `<header>`, `<nav>`, `<section>` respectée

## Impact et Résultats

### Fichiers Modifiés

```text
Phase 4 - Conformité CSS/HTML:
├── module/applications/sheets/skill.mjs    # ApplicationV1 → ApplicationV2
└── documentation/                          # Documentation mise à jour
    ├── DEVELOPMENT_PROCESS.md              # Phase 4 ajoutée
    └── architecture/ui/
        └── PHASE4-CSS-HTML-CONFORMITY.md  # Documentation technique
```

### Métriques Finales

| Métrique                     | Avant Phase 4 | Après Phase 4 | Amélioration |
| ---------------------------- | ------------- | ------------- | ------------ |
| **Sheets ApplicationV2**     | 20/21         | 21/21         | **100%**     |
| **Non-conformités CSS/HTML** | 1             | 0             | **-100%**    |
| **Tests passants**           | 150/150       | 150/150       | **Maintenu** |
| **Builds réussis**           | ✅            | ✅            | **Stable**   |

### Architecture Finale

```mermaid
graph TD
    A[SwerpgBaseActorSheet] --> B[HeroSheet]
    A --> C[AdversarySheet]
    A --> D[CharacterSheet]

    E[SwerpgBaseItemSheet] --> F[TalentSheet]
    E --> G[WeaponSheet]
    E --> H[ArmorSheet]

    I[SkillPageSheet] --> J[ApplicationV2]

    K[DEFAULT_OPTIONS Partiel] --> L[Classes CSS Fusionnées]
    M[_prepareContext Standard] --> N[Context Minimum]

    style A fill:#e1f5fe
    style E fill:#e1f5fe
    style I fill:#4caf50
    style J fill:#4caf50
    style L fill:#81c784
    style N fill:#81c784
```

## Recommandations pour l'Avenir

### Bonnes Pratiques Établies

1. **ApplicationV2 Only** : Toutes nouvelles sheets doivent utiliser ApplicationV2
2. **Pattern partiel** pour DEFAULT_OPTIONS : Ne redéfinir que les propriétés différentes
3. **Standard context** : Toujours implémenter le template minimum dans `_prepareContext()`
4. **Classes CSS** : Laisser les méthodes d'initialisation fusionner automatiquement

### Checklist pour Nouvelles Sheets

```javascript
// ✅ Template de conformité pour nouvelles sheets
export default class NewSheet extends SwerpgBaseItemSheet {
  static DEFAULT_OPTIONS = {
    // Seulement les propriétés spécifiques
    position: { width: 600, height: 'auto' },
    item: { type: 'monType' },
    actions: {
      // Actions spécifiques
    },
  }

  static {
    this._initializeItemSheetClass() // Fusion CSS automatique
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    // Le standard minimum est déjà inclus par la classe de base

    // Ajouter seulement la logique spécifique
    return context
  }
}
```

## Conclusion

La **Phase 4** a finalisé la refactorisation des sheets swerpg en :

- ✅ **Éliminant la dernière non-conformité** ApplicationV1
- ✅ **Validant la conformité CSS/HTML** selon les standards
- ✅ **Maintenant 100% de compatibilité** avec les tests existants
- ✅ **Préparant le système** pour l'évolution future

**Le système swerpg est maintenant entièrement conforme aux standards Foundry VTT v13 et ApplicationV2.**

---

**Auteur**: GitHub Copilot & Hervé Darritchon  
**Date**: 8 novembre 2025  
**Révision**: 1.0  
**Statut**: Documentation complète Phase 4
