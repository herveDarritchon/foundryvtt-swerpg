# SWERPG — Coding Style Guide (Foundry VTT v13+)

> **But** : poser un cadre clair, cohérent et « Star Wars‑friendly » pour tout le code du système **SWERPG** (Star Wars Edge RPG) : modèles de données, feuilles, jets, i18n, CSS/UX, tests, CI et conventions Git. Cette page est un **document vivant** ; elle accompagne la base de code et sert de checklist lors des PR.

---

## 1) Philosophie

* **Lisible d’abord** : privilégier la clarté au « clever ». Chaque module doit se comprendre en 5 min.
* **API Foundry idiomatique** : utiliser `ApplicationV2`, `HandlebarsApplicationMixin`, `TypeDataModel`, `foundry.utils` et les Hooks, pas d’API privées.
* **Séparation nette** : *Data* (models), *UI* (sheets/apps), *Règles* (actions/rollers/effects), *Ressources* (templates, lang, styles).
* **SOLID** : Single Responsibility pour chaque classe ; composabilité ; dépendances injectées (facades utilitaires) ; interfaces stables.
* **Testable** : logique pure testée avec Vitest, UI « smoke‑tested ». Les jets déterministes isolent l’aléatoire.
* **Thème Star Wars** : variables CSS (holo‑blue, imperial‑red, beskar‑gray), animations sobres.

---

## 2) Stack & Outils

* **Langage** : **JavaScript ES2022** (modules `.mjs`) + **JSDoc** pour la documentation.
* **Build System** : Scripts npm avec Rollup, LESS, et `@foundryvtt/foundryvtt-cli` pour les compendiums.
* **Gestionnaire de paquets** : **pnpm** (lockfile : `pnpm-lock.yaml`).
* **Tests** : **Vitest** avec couverture via `@vitest/coverage-v8`, environnement jsdom.
* **Workflow de contenu** : YAML source (`_source/`) → LevelDB compilé (`packs/`) via `build.mjs`.
* **Styles** : **LESS** → CSS avec variables thématiques Star Wars.
* **Hot Reload** : Support intégré pour `.less`, `.css`, `.hbs`, `.json` via `system.json`.

---

## 3) Architecture du Projet

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

**Conventions de nommage** :

* **Fichiers** : `kebab-case.mjs` pour les modules, `PascalCase.mjs` pour les classes principales.
* **Classes** : `Swerpg{Type}` (ex: `SwerpgActor`, `SwerpgHero`, `SwerpgBaseActorSheet`).
* **Exports** : `camelCase` pour les fonctions, `PascalCase` pour les classes.
* **Templates** : `kebab-case.hbs`, partials avec préfixe `_partial-name.hbs`.
* **Styles** : classes CSS avec préfixe `swerpg` ou `sw-`.

---

## 4) Modules & Imports

* **Extensions** : `.mjs` pour tous les modules JavaScript (respect de `"type": "module"`).
* **Imports relatifs** : utiliser les chemins relatifs depuis la racine du module.
* **Barrels** : `_module.mjs` dans chaque dossier principal pour les exports groupés.
* **Exports par défaut** : privilégiés pour les classes principales, exports nommés pour les utilitaires.
* **Structure d'imports** :

  ```javascript
  // Configuration et constants d'abord
  import {SYSTEM} from "./config/system.mjs";
  
  // Modules internes
  import * as applications from "./applications/_module.mjs";
  import * as models from "./models/_module.mjs";
  
  // Classes spécifiques
  import SwerpgActor from "./documents/actor.mjs";
  ```

---

## 5) Data Models (TypeDataModel)

```js
// module/data/actor/actor-model.js
// @ts-check  // Optionnel : active une vérification basique dans les fichiers JS

export class SwerpgActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      characteristics: new fields.SchemaField({
        agility:   new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        brawn:     new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        intellect: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        cunning:   new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        willpower: new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
        presence:  new fields.NumberField({ initial: 2, integer: true, min: 0, max: 6 }),
      }),
      thresholds: new fields.SchemaField({
        wounds: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
        strain: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
        soak:   new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      skills: new fields.ObjectField({ initial: {} }),
    };
  }

  /** Données dérivées légères */
  prepareDerivedData() {
    const data = /** @type {any} */ (this);
    const armorSoak = this.parent?.system?.armor?.soak ?? 0;
    data.thresholds.soak = Math.max(0, (data.characteristics?.brawn ?? 0) + armorSoak);
  }

  /** @param {object} source */
  static migrateData(source) {
    const s = /** @type {any} */ (source);
    if (s.characteristics?.vigor) {
      s.characteristics.willpower = s.characteristics.vigor;
      delete s.characteristics.vigor;
    }
  }
}
```

**Règles**

* `prepareDerivedData` : **sans effets de bord** (pas d’Item.update ici).
* Les migrations sont **idempotentes** et tracées (`module/data/migrations/*.ts`).

---

## 6) Feuilles & Applications (ApplicationV2)

```js
// module/applications/actor/actor-sheet.js
export class SwerpgActorSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["swerpg", "sheet", "actor"],
    window: { title: "SWERPG.ActorSheet.Title" },
    position: { width: 860, height: 640 },
    form: { submitOnChange: true }
  };

  #actor;
  constructor(actor, options = {}) {
    super(options);
    this.#actor = actor;
  }

  get title() {
    return game.i18n.format("SWERPG.ActorSheet.Title", { name: this.#actor.name });
  }

  async _prepareContext(options) {
    const system = this.#actor.system;
    return { actor: this.#actor, system, characteristics: system.characteristics };
  }

  static PARTS = {
    header: { template: "templates/actor/_header.hbs" },
    stats:  { template: "templates/actor/_stats.hbs" },
    skills: { template: "templates/actor/_skills.hbs" },
  };

  activateListeners(html) {
    html.querySelectorAll("[data-action='roll']").forEach((el) =>
      el.addEventListener("click", (ev) => this.#onRoll(ev))
    );
  }

  async #onRoll(ev) {
    const key = ev.currentTarget?.dataset?.skill ?? "cool";
    const roll = await new Roll(`1d20 + @skills[\"${key}\"]`, this.#actor.getRollData())
      .evaluate({ async: true });
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.#actor }) });
  }
}
```

**Règles**

* **Aucun querySelector global** : scoper aux racines d’app (`html`).
* Gestion d’événements via `data-action` ; méthodes privées `#onX`.
* Donner des IDs stables aux éléments interactifs pour les tests.

---

## 7) Hooks & Cycle de vie

* `init` : registre (settings, sheets, helpers, templates, CONFIG).
* `setup` : connexions entre systèmes / modules.
* `ready` : accès monde (`game.actors`, `canvas`).

```ts
Hooks.once("init", () => {
  game.settings.register("swerpg", "enableCinematicDice", {
    scope: "world", config: true, type: Boolean, default: true,
    name: "SWERPG.Settings.CineDice.Name", hint: "SWERPG.Settings.CineDice.Hint"
  });
  Handlebars.registerHelper("t", (k: string, data?: any) => game.i18n.format(k, data));
});
```

---

## 8) i18n & Lang

* **Clés** : `SWERPG.Domain.Subdomain.Key` (ex: `SWERPG.Actor.Chars.Agility`).
* **Pas de chaînes brutes** dans le code (sauf logs). Templates : `{{t "SWERPG.ActorSheet.Title" name=actor.name}}`.
* **Pluriels** via `i18n.format` et variables.

Structure :

```
lang/
  en.json
  fr.json
```

---

## 9) Templates Handlebars

* Partials `_partial.hbs` ; sections déclarées via `PARTS` dans l’app.
* Helpers maison minimalistes et **purs**.
* Données passées **déjà préparées** par `_prepareContext`.

Extrait `templates/actor/_stats.hbs` :

```hbs
<section class="stats">
  {{#each characteristics as |value key|}}
    <div class="stat" data-key="{{key}}">
      <label>{{t (concat "SWERPG.Actor.Chars." (capitalize key))}}</label>
      <input type="number" name="system.characteristics.{{key}}" value="{{value}}" min="0" max="6"/>
    </div>
  {{/each}}
</section>
```

---

## 10) CSS/SCSS & UX

* **Tokens** `:root` (theme sombre par défaut) ; BEM avec préfixe `sw-`.
* **Animations** < 200ms, `prefers-reduced-motion` respecté.
* **Accessibilité** : contraste ≥ 4.5:1 ; focus visible ; tailles rem.

`styles/tokens.scss` :

```scss
:root {
  --sw-color-primary: hsl(197 100% 50%);   /* holo blue */
  --sw-color-accent:  hsl(0 72% 55%);      /* imperial red */
  --sw-color-bg:      #0b0f14;              /* deep space */
  --sw-color-fg:      #e6edf3;              /* coruscant white */
  --sw-radius: 14px;
  --sw-gap: 12px;
}

.swerpg.sheet.actor {
  background: radial-gradient(1200px 600px at 80% -10%, #113e53 0%, #0b0f14 60%);
  color: var(--sw-color-fg);
}

.sw-panel { padding: var(--sw-gap); border-radius: var(--sw-radius); }
.sw-btn { cursor:pointer; border-radius: 8px; }
```

Stylelint : BEM simple `sw-Block__elem--mod`. Pas d’`!important` (sauf correctifs Foundry ciblés).

---

## 11) Rollers & Actions

* **Une action = une classe** : sérialise inputs, construit la formule, exécute, rend le résultat.
* Les dés spéciaux SW sont encapsulés (adaptateur) ; pas d’appel direct 3D Dice dans la logique.

```js
// module/rules/actions/skill-check.js
export class SkillCheck {
  constructor(actor, skill, modifier = 0) {
    this.actor = actor;
    this.skill = skill;
    this.modifier = modifier;
  }
  async execute() {
    const data = this.actor.getRollData();
    const roll = await new Roll(`1d20 + @skills[\"${this.skill}\"] + ${this.modifier}`, data)
      .evaluate({ async: true });
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: game.i18n.format("SWERPG.Roll.Skill", { skill: this.skill })
    });
  }
}
```

---

## 12) Tests (Vitest)

* **Unit tests** pour `utils/`, `rules/`, `data/` (derivedData).
* **Contract tests** minimaux pour `applications/` (existence, hooks, handlers).

```js
// tests/rules/skill-check.test.js
import { describe, it, expect, vi } from 'vitest';
import { SkillCheck } from '@/module/rules/actions/skill-check.js';

describe('SkillCheck', () => {
  it('builds a roll with the right formula', async () => {
    const actor = { getRollData: () => ({ skills: { cool: 3 } }) };
    const toMessage = vi.fn();
    vi.spyOn(global, 'Roll').mockImplementation((f, d) => ({
      formula: f, data: d, evaluate: async () => ({ toMessage })
    }));

    const sc = new SkillCheck(actor, 'cool', 2);
    await sc.execute();
    expect(toMessage).toHaveBeenCalled();
  });
});
```

---

## 13) Journalisation & Erreurs

* Logger façade `utils/logger.ts` (wrap `console`) ; niveaux : `debug/info/warn/error`.
* **Jamais** d’exception silencieuse ; préférer `ui.notifications.error` + log.

---

## 14) Paramètres & Flags

* `game.settings` : `namespace = "swerpg"` ; clés kebab-case ; `scope: world` par défaut.
* Flags : `document.setFlag("swerpg", "key", value)` ; utilitaires `getFlag/setFlag` centralisés.

---

## 15) Conventions Git & PR

* **Conventional Commits** : `feat:`, `fix:`, `refactor:`, `docs:`, `build:`, `test:` …
* PR Checklist :

  * [ ] Lint/format ok
  * [ ] Tests pass + coverage stable
  * [ ] i18n (pas de chaînes brutes)
  * [ ] UI accessible (contraste, focus)
  * [ ] Changelog mis à jour

---

## 16) Checklists rapides

**Nouveau modèle de données**

* [ ] `TypeDataModel` + `defineSchema`
* [ ] `prepareDerivedData` pure
* [ ] Migration défensive

**Nouvelle feuille**

* [ ] `ApplicationV2` + `PARTS`
* [ ] `activateListeners` scoper
* [ ] Actions via `data-action`
* [ ] Template sans logique

---

## 17) Fichiers de configuration — **Référence**

**`jsconfig.json`** (optionnel mais recommandé si vous activez `// @ts-check`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "checkJs": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["module", "tests", "types"]
}
```

**`.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['import'],
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'prettier'
  ],
  env: { browser: true, es2022: true },
  globals: {
    game: 'readonly', ui: 'readonly', canvas: 'readonly',
    foundry: 'readonly', Hooks: 'readonly', CONFIG: 'readonly'
  },
  settings: { 'import/resolver': { node: true } },
  rules: {
    curly: ['error', 'all'], eqeqeq: ['error', 'always'],
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }]
  }
};
```

**`.prettierrc`**

```json
{ "printWidth": 100, "tabWidth": 2, "singleQuote": true, "trailingComma": "all" }
```

**`stylelint.config.cjs`**

```js
module.exports = {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-prettier-scss'],
  rules: {
    'selector-class-pattern': '^sw-[a-z]+(?:__[a-z]+)?(?:--[a-z]+)?$',
    'declaration-no-important': true
  }
};
```

**`vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true, coverage: { reporter: ['text', 'lcov'] } }
});
```

**Scripts `package.json` (extrait)**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext .js && stylelint 'styles/**/*.scss'",
    "fmt": "prettier --write .",
    "test": "vitest run"
  }
}
```

---

## 18) Modèle de PR (copier‑coller)

```md
### Résumé

### Détails technique
- [ ] Data model / Migrations
- [ ] UI (screenshots si pertinent)

### Tests
- [ ] Unit
- [ ] Manuel (scénarios)

### Checklist
- [ ] Lint/format ok
- [ ] i18n
- [ ] Accessibilité
- [ ] Changelog
```

---

## 19) Annexe — Utilitaires recommandés

* `utils/i18n.ts` : wrappers `t(key, data?)` & `tl(key)`.
* `utils/assert.ts` : `assert(condition, message)`.
* `utils/flags.ts` : `getFlag/setFlag/hasFlag` (namespacés `swerpg`).
* `utils/roll.ts` : fabrique de Roll (`from(formula, data)`), conversion toMessage.

---

## 20) Roadmap d’adoption

1. **Lint + Prettier + Stylelint** branch d’outillage ; PR de base.
2. **Migrer** 1 feuille type vers `ApplicationV2` + `PARTS`.
3. **Isoler** 1 action de jet -> classe (`rules/actions`).
4. **Passer** les chaînes en i18n sur 1 écran.
5. **Activer** CI (lint + test) + badge de couverture.

> *Cette doc évolue par PR `docs: ...`. Tout ajout de feature majeure s’accompagne d’une section de style correspondante.*
