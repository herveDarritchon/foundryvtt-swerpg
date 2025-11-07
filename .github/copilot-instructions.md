# Copilot Instructions - Swerpg (Star Wars Edge RPG for FoundryVTT)

## Project Overview

Swerpg is a Foundry Virtual Tabletop game system for Star Wars Edge RPG built on modern ES modules. The system leverages Foundry's V2 application architecture and provides:

## Architecture Essentials

- **Core Entry point**: `swerpg.mjs` - Main system initialization and API exposure
- **Module Structure**: `/module/` - Organized by functional areas (documents, applications, models, config)
- **Data Management**: YAML-based compendium packs with build pipeline (`_source/` → `packs/`)
- **Styling**: LESS-based CSS compilation with component architecture
- **Configuration**: `module/config/system.mjs` - Central system constants and enums
- **Documents**: Foundry document extensions in `module/documents/`
- **Data Models**: TypeDataModel subclasses in `module/models/` define item/actor schemas
- **Applications**: UI components in `module/applications/` following Foundry's ApplicationV2 pattern

### Key Foundry Integrations

- **Data Models**: Use `foundry.abstract.TypeDataModel` for all item/actor data schemas
- **Applications**: Extend `ApplicationV2` with `HandlebarsApplicationMixin` for sheets
- **Actions**: `swerpgAction` is the core mechanic - encapsulates dice rolls, targeting, and effects

### Content Management Workflow

```bash
# Extract binary packs to YAML for editing
npm run extract

# Compile YAML back to binary packs
npm run compile

# Full build (compile + rollup + less)
npm run build

# LESS → CSS compilation
pnpm run less
```

### Testing & Coverage

```bash
pnpm test               # Run vitest tests
pnpm test:coverage      # Generate coverage reports
```

**Critical**:

- Game content lives in `_source/` as YAML files, compiled to `packs/` LevelDB. Never edit binary packs directly.
- System must remain compatible with Foundry VTT v13.

### Action System

Actions are the heart of Crucible mechanics:

```javascript
// Actions are bound to actors and contain all logic for execution
const action = item.actions[0].bind(actor)
await action.use() // Full workflow: preparation → execution → confirmation
```

### Compendium Integration

- **Settings**: `swerpg.CONFIG.packs` defines which compendia provide content
- **UUIDs**: Use `Compendium.swerpg.talent.Item.{id}` format for references
- **Migration**: System maintains content IDs across versions via `generateId()`

### Sheet Architecture

- Base classes: `SwerpgBaseActorSheet`, `SwerpgBaseItemSheet`
- Type-specific extensions: `HeroSheet`, `SwerpgTalentItemSheet`, etc.
- Use `HandlebarsApplicationMixin(ApplicationV2)` pattern consistently

### Data Management

- Source data in `_source/` as YAML files (e.g., `_source/armors/Armoured_Clothing_armouredClothing.yml`)
- Compiled to LevelDB packs in `packs/` directory
- Use `build.mjs` script with `@foundryvtt/foundryvtt-cli` for pack operations

## Project-Specific Patterns

### Document Models

- Extend Foundry base classes: `SwerpgActor`, `SwerpgItem`, `SwerpgChatMessage`
- Data models in `/module/models/` use `foundry.abstract.TypeDataModel`
- Schema definition pattern: `static defineSchema()` with field validation

### Application Architecture

- ApplicationV2 + Handlebars: `api.HandlebarsApplicationMixin(sheets.ActorSheetV2)`
- Base classes: `SwerpgBaseActorSheet` for common functionality
- Context preparation: `_prepareContext()` → build display data objects

### Configuration System

- Central config in `/module/config/system.mjs` exports `SYSTEM` constant
- Modular config files: `attributes.mjs`, `skills.mjs`, `spellcraft.mjs`, etc.
- Compendium pack references: `SYSTEM.COMPENDIUM_PACKS`

### Development Mode Features

- Debug hooks: `CONFIG.debug.hooks = true` in console
- Development detection: `detectDevelopmentMode()` function
- Hot reload support for templates, styles, and language files

## Critical Integration Points

### Compendium Pack Integration

- Pack IDs defined in `SYSTEM.COMPENDIUM_PACKS` (ancestry, archetype, etc.)
- Runtime pack loading via `game.packs.get(packId)`
- Export/import workflow through `packageCompendium()` function

### Talent Tree System

- `SwerpgTalentNode` manages talent relationships and prerequisites
- Nodes tracked in global registry: `SwerpgTalentNode.nodes`
- Tree initialization from talent compendium packs

### UI Components

- Custom Handlebars components in `/ui/` directory
- Jauge (gauge) system for resources with factory pattern
- Defense display with percentage calculations and CSS states

## Common Patterns

### Error Handling in Actions

Always wrap action execution in try-catch and provide user feedback through UI.notifications (ui.notifications.error() si erreur bloquante et ui.notifications.warn() si erreur non bloquante, ui.notifications.info() pour les messages d'information si traitement asynchrone).

## Foundry VTT Conventions

- **IDs**: Use `generateId(name, length)` for consistent document IDs
- **Localization**: All user-facing strings use `game.i18n.localize()`
- **Stylesheets**: LESS files in `styles/` compiled to `styles/crucible.css`
- **Templates**: Handlebars templates in `templates/` with partials for reusable components

## Sources pour approfondir Foundry VTT v13

- Foundry VTT Knowledge Base: https://foundryvtt.com/kb/
- Foundry VTT v13 API Reference: https://foundryvtt.com/api/
- Foundry VTT Release Notes: https://foundryvtt.com/releases/

---

## 📌 Règles JavaScript

- **Syntaxe** : ES6+ modules (modules `import`/`export`, arrow functions, async/await), destructuring, async/await, éviter `var`
- **Nommage** : `camelCase` pour variables et fonctions, `PascalCase` pour classes et composants
- **Sécurité** : Toujours utiliser `foundry.utils.mergeObject()` au lieu d'Object.assign, valider les entrées utilisateur, éviter le `innerHTML` direct.
- **Performance** : Privilégier `const` over `let`, éviter les boucles dans les getters, mise en cache des sélecteurs DOM, Privilégier le lazy loading des modules, déstructuration, spread operator.
- **Documentation** : JSDoc obligatoire pour toutes les méthodes publiques, typage avec `@param` et `@returns`

---

## 🏷️ Règles HTML

- **Structure sémantique** : Utiliser `<section>`, `<header>`, `<nav>` appropriés, pas de `<div>` génériques
- **Accessibilité (a11y)** : `data-tooltip` pour les infobulles, `aria-label` si nécessaire, contraste WCAG AA
- **Balisage** : Hiérarchie respectée `h1` → `h2` → `h3` ordonnées, une seule `h1` par sheet, `<title>`

---

## 🎨 Règles CSS

- **Organisation** : méthodologie CSS Modules.
- **Responsive** : Mobile-first, media queries basées sur `min-width`.
- **Flexbox & Grid** : privilégier ces modules pour la mise en page.
- **Variables CSS** : déclarer les couleurs, espacements et typographies dans `:root`.
- **Préprocesseur** (optionnel) : less pour gérer les mixins, fonctions, et imports.

---

## 🚫 À ne pas faire

- **Modifier** directement les packs binaires dans `packs/` - utiliser le workflow YAML dans `_source/`
- **Ignorer la hiérarchie** des configurations `SYSTEM` → `crucible.CONST` → `crucible.CONFIG`
- **Oublier l'internationalisation** avec `game.i18n.localize()`
- **Mélanger les patterns ApplicationV1 et ApplicationV2** - toujours utiliser ApplicationV2
- **Inline styles** dans le HTML.
- **Variables globales** non encapsulées.
- Utilisation de **jQuery** pour de la manipulation DOM simple (utiliser Vanilla JS).
- Ignorer les **erreurs ESLint** ou warnings de **Prettier**.

---

## 🔗 Références utiles en dehors de Foundry VTT

- Prettier : https://prettier.io
- ESLint Airbnb : https://github.com/airbnb/javascript
- BEM : http://getbem.com
- WCAG : https://www.w3.org/WAI/standards-guidelines/wcag/

## My Rules for AI Assistance

- Always prioritize clarity, conciseness, and maintainability in code suggestions and explanations.
- Ensure all code adheres to Foundry VTT's best practices and Crucible's architecture.
- when responding, always respond in French.
- Use technical terminology appropriate for experienced Foundry VTT developers.

## Common Development Tasks

When adding new item types:

1. Create data model in `/module/models/`
2. Add to document type registrations
3. Create sheet class extending base sheet
4. Add YAML source data in `_source/`
5. Update build configuration if new pack needed

When modifying spells:

- Update component definitions in `/module/config/spellcraft.mjs`
- Spell composition logic in `SwerpgSpellAction._prepareData()`
- Dialog components for spell building interface

When styling:

- Use LESS with component-based imports in `styles/swerpg.less`
- Follow established CSS class patterns (`active`/`inactive`, percentage-based layouts)
- Leverage system CSS variables in `variables.less`
