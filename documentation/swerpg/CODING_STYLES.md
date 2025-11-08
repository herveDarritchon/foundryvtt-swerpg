# SWERPG — Coding Style (Foundry VTT v13+, JavaScript)

> **Objectif** : un style guide court, actionnable, et **enforcé par les outils**. Il doit réduire la friction, rendre le code prévisible, faciliter l’onboarding, brancher ESLint/Prettier/tests sur des règles claires et limiter les débats sans fin. Si ce doc ne sert pas à ça, il est décoratif.

---

## 1) À quoi sert vraiment un coding‑style ?

- **Réduire la friction** en review.
- **Rendre le code prévisible** quelle que soit la zone.
- **Faciliter l’onboarding** d’un nouveau.
- **Outiller le projet** (lint/format/tests/CI) avec des règles nettes.
- **Couper court aux débats** : on tranche une fois, on applique.

---

## 2) Périmètre & philosophie

- **Langage** : JavaScript **ES2022**, **pas de TypeScript** (JSDoc & `// @ts-check` facultatifs).
- **Cible** : Foundry VTT **v13+**, navigateur moderne.
- **Principes** : lisibilité > concision ; cohérence > préférences perso ; code testable ; zéro magie.

---

## 3) Organisation du code

```text
module/
  applications/       # ApplicationV2 & feuilles (sheets/, config/, sidebar/)
  models/             # TypeDataModel pour tous les types d'items/actors
  config/             # Configuration système (SYSTEM, enums, constantes)
  documents/          # Extensions des documents Foundry
  hooks/              # Gestionnaires d'événements Foundry
  canvas/             # Éléments canvas (ruler, token, talent-tree)
  dice/               # Système de dés spécialisé Star Wars
  helpers/            # Utilitaires génériques
  lib/                # Bibliothèques de logique métier
  ui/                 # Composants UI réutilisables
  utils/              # Helpers système (flags, i18n, etc.)
  chat.mjs            # Gestion des messages de chat
  socket.mjs          # Communication WebSocket
styles/               # LESS + variables thématiques
templates/            # Handlebars + partials
lang/                 # Internationalisation (en.json, fr.json)
_source/              # Données YAML source pour compendiums
packs/                # Compendiums LevelDB compilés
tests/                # Tests Vitest
```

### **Règles**

- **Pas de logique métier** dans les templates Handlebars (vue = rendu).
- **Une feuille = un fichier .mjs + un .hbs** ; événements via `data-action` ; aucun querySelector global.
- **Données dérivées** dans `prepareDerivedData()` **sans effet de bord** (pas d’updates).

---

## 4) Nommage

- **Fichiers** : `kebab-case.mjs` ; **classes** : `PascalCase` ; **fonctions/vars** : `camelCase`.
- **Fonctions** : verbe d’action (`createActor`, `updateTalentTree`).
- **Constantes** : `SCREAMING_SNAKE_CASE` pour des invariants globaux.
- **Suffixes** : `*Schema`, `*Config`, `*Model`, `*Service` ; booléens `is*/has*`.
- **Templates** : `actor-sheet.hbs`, partials `_stats.hbs` (underscore pour partials).

---

## 5) Formatage & syntaxe (automatisés)

> Le **formatage est 100% géré par Prettier**. Pas de débat en review.

- Indentation 2 espaces ; largeur 160 ; **guillemets simples** ; trailing commas **toujours**.
- ESLint doit passer **sans erreur** ; sinon la PR ne merge pas.

`.prettierrc`

```json
{
  "semi": false,
  "eslintIntegration": true,
  "printWidth": 160,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "all"
}
```

---

## 6) Usage du langage

- `const` par défaut ; `let` si mutation ; **jamais** `var`.
- **`===` obligatoire** (`eqeqeq`) ; **pas** de mutation de paramètres (copie défensive si besoin).
- Modules **ES** (`import/export`) ; pas de `require`.
- Préférer **`async/await`** aux `.then()` ; toujours gérer les rejets.
- Gestion d’erreur : `try/catch` + **logger** central ; pas de `console.log` en prod.
- Foundry : pas d’accès sauvage aux globaux ; wrappers minces quand utile (flags, i18n, logs).

---

## 7) Commentaires & documentation

- **Commenter l’intention**, pas l’évidence.
- **JSDoc** pour les APIs publiques/complexes (services, actions, hooks exposés).
- Documenter : points d’extension, hooks, schémas de données et helpers non triviaux.

Nous utilisons **JSDoc comme source de vérité pour les types et les contrats publics**. Toute fonction/export non trivial (API, hooks, handlers, data models, classes d’applications Foundry, etc.) doit être documenté avec `/** … */` incluant au minimum `@param`, `@returns` et, si besoin, `@throws`. Les types complexes sont décrits via `@typedef` / `@template` plutôt que dans le texte. La doc doit expliquer l’intention et les effets de bord, pas réécrire le code ligne par ligne. On évite les commentaires décoratifs : si la JSDoc ne sert ni à comprendre l’API, ni à guider l’autocomplétion/les outils (Copilot, agents, TS), on ne l’écrit pas.

---

## 8) Tests (Vitest)

- **Unit** : `utils/`, `rules/`, `data/` (derived data, formules de jets).
- **Contract minimal** : existence d’une feuille, handlers, hooks (sans tester le DOM en profondeur).
- **Toujours** tester : formules de jets, calculs de difficultés, règles centrales.

`vitest.config.mjs`

```js
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'jsdom', globals: true, coverage: { reporter: ['text', 'lcov'] } },
})
```

---

## 9) Git & revue de code

- **Conventional Commits** : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `build:` …
- **PR** : petite, focalisée, avec **checklist** ci‑dessous ; capture d’écran si UI.

Checklist PR

- [ ] Lint/format OK (CI)
- [ ] Tests verts + couverture stable
- [ ] Pas de chaînes en dur (i18n)
- [ ] Accessibilité minimale (focus, contraste)
- [ ] Changelog

---

## 10) Règles **enforcées par l’outillage** (non négociables)

- Prettier formatte tout (CI).
- ESLint : `eqeqeq`, `no-unused-vars`, `no-var`, `no-param-reassign`, `no-console` (sauf debug gate), `import/order`.
- Imports cycliques interdits (si plugin mis en place) ; dead code supprimé.
- Build Vite : erreurs = PR bloquée.

`.eslintrc.cjs`

```js
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['import'],
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  env: { browser: true, es2022: true },
  globals: { game: 'readonly', ui: 'readonly', canvas: 'readonly', foundry: 'readonly', Hooks: 'readonly', CONFIG: 'readonly' },
  rules: {
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'no-param-reassign': ['error', { props: true }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
  },
}
```

---

## 11) Règles à **ne pas** mettre (anti‑brouillard)

- Détails esthétiques que Prettier gère déjà (espaces, accolades, alignements).
- Règles invérifiables ou extrêmes ("jamais > 10 lignes", "toujours optimal perf").
- Interdictions dogmatiques sans raison ("pas d`async/await", "pas de classes").
- Procédures d’équipe (vendredi, RH, etc.) → autre doc.
- Vocabulaire métier → mettre dans un **glossaire** séparé.

---

## Annexe A — Patterns Foundry minimaux (JS)

### A.1 Data Model (TypeDataModel)

```js
// module/data/actor/actor-model.mjs
export class SwerpgActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data
    return {
      characteristics: new fields.SchemaField({
        agility: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        brawn: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        intellect: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        cunning: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        willpower: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        presence: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
      }),
      thresholds: new fields.SchemaField({
        wounds: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
        strain: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
        soak: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      skills: new fields.ObjectField({ initial: {} }),
    }
  }
  prepareDerivedData() {
    const data = this
    const armorSoak = this.parent?.system?.armor?.soak ?? 0
    data.thresholds.soak = Math.max(0, (data.characteristics?.brawn ?? 0) + armorSoak)
  }
  static migrateData(source) {
    const s = source
    if (s.characteristics?.vigor) {
      s.characteristics.willpower = s.characteristics.vigor
      delete s.characteristics.vigor
    }
  }
}
```

### A.2 Feuille (ApplicationV2 + Handlebars)

```js
// module/applications/actor/actor-sheet.mjs
export class SwerpgActorSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: 'form',
    classes: ['swerpg', 'sheet', 'actor'],
    window: { title: 'SWERPG.ActorSheet.Title' },
    position: { width: 860, height: 640 },
    form: { submitOnChange: true },
  }
  #actor
  constructor(actor, options = {}) {
    super(options)
    this.#actor = actor
  }
  get title() {
    return game.i18n.format('SWERPG.ActorSheet.Title', { name: this.#actor.name })
  }
  async _prepareContext() {
    const system = this.#actor.system
    return { actor: this.#actor, system, characteristics: system.characteristics }
  }
  static PARTS = {
    header: { template: 'templates/actor/_header.hbs' },
    stats: { template: 'templates/actor/_stats.hbs' },
    skills: { template: 'templates/actor/_skills.hbs' },
  }
  activateListeners(html) {
    html.querySelectorAll("[data-action='roll']").forEach((el) => el.addEventListener('click', (ev) => this.#onRoll(ev)))
  }
  async #onRoll(ev) {
    const key = ev.currentTarget?.dataset?.skill ?? 'cool'
    const roll = await new Roll(`1d20 + @skills[\"${key}\"]`, this.#actor.getRollData()).evaluate({ async: true })
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.#actor }) })
  }
}
```

### A.3 Action de jet

```js
// module/rules/actions/skill-check.mjs
export class SkillCheck {
  constructor(actor, skill, modifier = 0) {
    this.actor = actor
    this.skill = skill
    this.modifier = modifier
  }
  async execute() {
    const data = this.actor.getRollData()
    const roll = await new Roll(`1d20 + @skills[\"${this.skill}\"] + ${this.modifier}`, data).evaluate({ async: true })
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: game.i18n.format('SWERPG.Roll.Skill', { skill: this.skill }) })
  }
}
```

---

## Annexe B — Configs minimales

**ESLint** et **Prettier** : voir sections 5 et 10.

`stylelint.config.cjs`

```js
module.exports = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-prettier-scss'],
  rules: { 'selector-class-pattern': '^sw-[a-z]+(?:__[a-z]+)?(?:--[a-z]+)?$', 'declaration-no-important': true },
}
```

`scripts` (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext .mjs,.js && stylelint 'styles/**/*.scss'",
    "fmt": "prettier --write .",
    "test": "vitest run"
  }
}
```

---

## Annexe C — Adoption rapide

1. **Outillage** : ajouter configs ESLint/Prettier/Stylelint/Vitest + scripts.
2. **Pilote** : migrer **une** feuille & **une** action en suivant les patterns.
3. **CI** : bloquer la PR si lint/test échouent.
4. **Vocabulaire métier** : créer un **glossaire** séparé (pas dans le style guide).

> Ce document doit tenir en quelques pages. Toute nouvelle feature majeure peut ajouter un **pattern** en annexe, mais les **règles** restent courtes, enforcées et à jour.
