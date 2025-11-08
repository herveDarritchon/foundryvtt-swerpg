# SWERPG — Coding Style Guide for Copilot Agent (JS, Foundry v13+)

## 0) Mode opératoire de l’agent

Quand tu réponds à une demande de code, tu respectes ce contrat, dans cet ordre :

1. **Résumé** (2–4 phrases : objectif + ce qui change).
2. **Arborescence modifiée** (mini tree des fichiers touchés/créés).
3. **Patches complets** (un bloc ` ```js ` ou ` ```hbs ` par fichier, avec `path: ...` sur la première ligne).
4. **i18n** (clés ajoutées/modifiées dans `lang/en.json` et `lang/fr.json`).
5. **Tests Vitest** (nouveaux ou mis à jour) + scénarios manuels si UI.
6. **Commandes** (scripts npm, build, tests à lancer).
7. **Commit message** (Conventional Commit) + mention **BREAKING** si nécessaire.
8. **Assumptions & Follow-ups** :
   - _Assumptions_ : décisions prises en cas d’ambiguïté.
   - _Follow-ups_ : TODO non bloquants pour la PR (issue/PR ultérieure).

---

## 1) Périmètre & philosophie

- **Langage** : JavaScript **ES2022** uniquement.
  - Pas de TypeScript, pas de `.d.ts`, pas de `require`.

- **Cible** : Foundry VTT **v13+** :
  - `ApplicationV2`, `HandlebarsApplicationMixin`, `TypeDataModel`.

- **Principe clé** :
  - **Séparation stricte** entre **métier pur** (sans Foundry) et **adaptateurs Foundry**.

- **Priorités** :
  - lisibilité > concision,
  - cohérence > préférences perso,
  - code testable > bricolage rapide,
  - zéro logique métier dans les `.hbs`.

---

## 2) Organisation du code projet

Arborescence de référence :

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
  lib/                # Logique métier pure (règles, calculs, conversions)
  ui/                 # Composants UI réutilisables
  utils/              # Helpers système (flags, i18n, logger, etc.)
  chat.mjs            # Gestion des messages de chat
  socket.mjs          # Communication WebSocket
styles/               # LESS + variables thématiques
templates/            # Handlebars + partials
lang/                 # Internationalisation (en.json, fr.json)
_source/              # Données YAML source pour compendiums
packs/                # Compendiums LevelDB compilés
tests/                # Tests Vitest
```

**Nommage :**

- Fichiers JS : `kebab-case.mjs`.
- Classes : `PascalCase`.
- Fonctions/variables : `camelCase`.
- Partials Handlebars : `_partial-name.hbs` (underscore).
- Booléens : `isSomething`, `hasSomething`.
- Suffixes standard : `*Model`, `*Service`, `*Config`, `*Action`.

---

## 3) Séparation métier / Foundry

Tu dois **toujours** réfléchir en deux couches :

1. **Métier pur** (dans `module/lib/` ou `module/rules/` par ex.) :
   - fonctions/classes **sans aucune dépendance** à Foundry :
     - pas de `game`, `Actor`, `Item`, `ChatMessage`, `CONFIG`, `Hooks`…

   - code déterministe : entrée → sortie, sans effets de bord globaux.
   - utilisable directement dans des **tests Vitest** sans mocking de Foundry.

2. **Adaptateurs Foundry** (dans `applications/`, `documents/`, `hooks/`, etc.) :
   - lisent / écrivent les `Documents`,
   - préparent des données simples pour le métier,
   - appellent les fonctions métier, puis réappliquent le résultat dans Foundry,
   - gèrent les hooks, le DOM, les événements, les jets, les messages de chat.

**Règles à suivre :**

- **Pas de logique métier** dans les templates Handlebars (vue = rendu).
- **Une feuille = un `.mjs` + un `.hbs`** ; événements via `data-action`; aucun `querySelector` global hors périmètre de l’app.
- **Données dérivées** dans `prepareDerivedData()` **sans effet de bord** (aucune écriture sur d’autres documents).
- Toute nouvelle feature = **d’abord une fonction/méthode métier testable**, ensuite un adaptateur Foundry minimal.

Si ton code métier a besoin d’un jet, de i18n ou de flags → **fais passer ça par l’adaptateur**, pas par un appel direct à Foundry.

---

## 4) Règles de code enforcées (ESLint)

L’agent doit produire du code qui respecte implicitement les règles suivantes :

- `===` obligatoire (`eqeqeq`).
- `const` par défaut ; `let` si mutation ; **jamais** `var`.
- `no-param-reassign` : interdiction de modifier les paramètres (copie défensive).
- `no-unused-vars` : aucune variable déclarée non utilisée.
- `no-console` :
  - **Seul** `module/utils/logger.mjs` peut utiliser `console.xxx`.
  - Partout ailleurs, utiliser `logger.xxx`.

- Imports ES modules uniquement (`import` / `export`).
- `import/order` :
  - groupes logiques,
  - ordre alphabétique,
  - lignes blanches entre groupes.

Exemple d’intention d’ESLint (pour l’agent) :

```js
// globals typiques (déclarés côté config ESLint humaine)
;(game, ui, canvas, foundry, Hooks, CONFIG)
```

Tu dois **spontanément éviter** tout ce qui déclencherait ces règles.

---

## 5) Formatage & syntaxe (Prettier)

Le formatage est **100% géré par Prettier**. L’agent doit écrire du code qui s’aligne naturellement avec :

- indentation **2 espaces**,
- `printWidth`: **160**,
- `singleQuote`: **true** en JS,
- `trailingComma`: `"all"`.

Tu ne joues pas avec les espaces / retours à la ligne pour “faire joli” : tu laisses Prettier décider.

---

## 6) Usage du langage

- `async/await` préféré aux chaînes de `.then()`.
- Gérer **tous** les rejets de promesse (try/catch ou `.catch` explicite).
- Préférer **fonctions pures** pour le métier.
- Pas de mutation cachée d’objets d’entrée métier : retourner une **nouvelle structure** ou documenter clairement les effets de bord quand ils sont voulus (rare).

---

## 7) Logging (logger central, debug gate)

### 7.1 Principe

- Aucun `console.xxx` **direct** dans le code de système (hors `logger.mjs`).
- Tous les logs passent par un **logger central**.
- Tous les messages sont préfixés par :
  `SWERPG || `
- Le logger permet de **désactiver/activer** les logs en fonction d’un mode debug, tout en laissant **passer au minimum les erreurs**.

### 7.2 Logger de référence pour l’agent

L’agent doit considérer qu’il existe (ou créer, si absent) un logger proche de ceci :

```js
// path: module/utils/logger.mjs
const PREFIX = 'SWERPG ||'
let debugEnabled = false

function shouldLog(level) {
  if (debugEnabled) return true
  // Même sans debug, on laisse au moins passer les erreurs (et éventuellement les warnings)
  return level === 'error' || level === 'warn'
}

export const logger = {
  enableDebug() {
    debugEnabled = true
  },

  disableDebug() {
    debugEnabled = false
  },

  setDebug(value) {
    debugEnabled = Boolean(value)
  },

  isDebugEnabled() {
    return debugEnabled
  },

  log(...args) {
    if (shouldLog('log')) console.log(PREFIX, ...args)
  },

  info(...args) {
    if (shouldLog('info')) console.info(PREFIX, ...args)
  },

  warn(...args) {
    if (shouldLog('warn')) console.warn(PREFIX, ...args)
  },

  error(...args) {
    if (shouldLog('error')) console.error(PREFIX, ...args)
  },

  debug(...args) {
    if (shouldLog('debug')) console.debug(PREFIX, ...args)
  },

  group(...args) {
    if (shouldLog('group')) console.group(PREFIX, ...args)
  },

  groupCollapsed(...args) {
    if (shouldLog('groupCollapsed')) console.groupCollapsed(PREFIX, ...args)
  },

  groupEnd() {
    if (shouldLog('groupEnd')) console.groupEnd()
  },

  table(...args) {
    if (shouldLog('table')) console.table(...args)
  },

  time(label) {
    if (shouldLog('time')) console.time(`${PREFIX} ${label}`)
  },

  timeEnd(label) {
    if (shouldLog('timeEnd')) console.timeEnd(`${PREFIX} ${label}`)
  },

  trace(...args) {
    if (shouldLog('trace')) console.trace(PREFIX, ...args)
  },

  assert(condition, ...args) {
    if (!condition && shouldLog('assert')) {
      console.assert(condition, PREFIX, ...args)
    }
  },
}
```

**À faire dans le code généré :**

```js
import { logger } from '../utils/logger.mjs'

logger.info('Initialisation du système', { module: 'core' })
logger.warn('Jet sans compétence associée', rollData)
logger.error('Impossible de charger le pack', packId)
```

**À ne pas faire :**

```js
console.log('Debug') // interdit
console.warn('Oops') // interdit en dehors de logger.mjs
console.error('Aïe', err) // interdit en dehors de logger.mjs
```

---

## 8) Commentaires & documentation (JSDoc)

- Commenter **l’intention**, pas l’évidence :
  - pourquoi ce choix, quelle règle métier, quels effets de bord.

- Utiliser **JSDoc** pour :
  - APIs publiques (services, actions, helpers exposés),
  - data models non triviaux,
  - fonctions métier complexes.

**Règles pour l’agent :**

- Toute fonction/export non triviale (API, hooks, handlers, modèles, classes d’applications) doit avoir une JSDoc avec au minimum :
  - `@param`,
  - `@returns`,
  - `@throws` si pertinent.

- Types complexes via `@typedef` / `@template` plutôt que du texte vague.
- Pas de commentaires décoratifs.

---

## 9) Tests (Vitest)

L’agent **doit** penser les tests d’abord pour le **métier pur**.

### 9.1 Tests unitaires

Objectif : verrouiller les **règles du système**, pas refaire Foundry en miniature.

- Toute règle de jeu, tout calcul, toute transformation de données doit pouvoir être testée avec un import direct d’un module **pur** dans Vitest.
- Aucun test unitaire ne doit dépendre de `game`, `Actor`, `Item`, `canvas`, etc.
- Cas à tester en priorité :
  - formules de jets,
  - dérivées de données (soak, seuils, etc.),
  - règles d’état (blessures, stress, etc.),
  - cas limites (0, valeurs extrêmes, seuils exacts).

**Règles :**

- Si un test a besoin de `game` ou `Actor` → la logique est mal isolée.
- Les données de test sont de **simples objets** (factories/helpers), pas des Documents Foundry.
- En cas de bug fonctionnel :
  1. écrire un test qui **échoue** et reproduit le bug ;
  2. corriger le métier jusqu’à ce que le test passe.

### 9.2 Vitest config

L’agent peut supposer une config proche de :

```js
// path: vitest.config.mjs
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: { reporter: ['text', 'lcov'] },
  },
})
```

### 9.3 Exemple de test attendu

```js
// path: tests/lib/calc-soak.test.mjs
import { describe, it, expect } from 'vitest'
import { calcSoak } from '../../module/lib/calc-soak.mjs'

describe('calcSoak', () => {
  it('combine brawn et armorSoak', () => {
    expect(calcSoak({ brawn: 3, armorSoak: 2 })).toBe(5)
  })

  it('ne descend jamais sous 0', () => {
    expect(calcSoak({ brawn: -2, armorSoak: 0 })).toBe(0)
  })
})
```

---

## 10) i18n

- **Jamais** de chaîne en dur dans le code ou les templates.
- Utiliser `game.i18n.localize/format` côté JS, et un helper `t` côté HBS.

Clés :

- structure : `SWERPG.Domain.Sub.Key`
  - ex. `SWERPG.ActorSheet.Title`, `SWERPG.Actor.Chars.Agility`.

- L’agent ajoute les clés manquantes dans :
  - `lang/en.json`,
  - `lang/fr.json` (avec une traduction FR simple mais correcte).

Exemple côté JS :

```js
import { t } from '../services/i18n.mjs'

const title = t('SWERPG.ActorSheet.Title', { name: actor.name })
```

Helper minimal :

```js
// path: module/services/i18n.mjs
export const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key))
```

Exemple côté template :

```hbs
<h1>{{t 'SWERPG.ActorSheet.Title' name=actor.name}}</h1>
```

---

## 11) Patterns Foundry (obligatoires pour l’agent)

### 11.1 DataModel (TypeDataModel)

Même esprit que le guide humain :

```js
// path: module/models/actor/actor-model.mjs
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

### 11.2 Feuille (ApplicationV2 + HandlebarsApplicationMixin)

```js
// path: module/applications/actor/actor-sheet.mjs
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
    return {
      actor: this.#actor,
      system,
      characteristics: system.characteristics,
    }
  }

  static PARTS = {
    header: { template: 'templates/actor/_header.hbs' },
    stats: { template: 'templates/actor/_stats.hbs' },
    skills: { template: 'templates/actor/_skills.hbs' },
  }

  activateListeners(html) {
    html.querySelectorAll('[data-action="roll"]').forEach((el) => el.addEventListener('click', (event) => this.#onRoll(event)))
  }

  async #onRoll(event) {
    const key = event.currentTarget?.dataset?.skill ?? 'cool'
    const roll = await new Roll(`1d20 + @skills["${key}"]`, this.#actor.getRollData()).evaluate({ async: true })

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.#actor }),
    })
  }
}
```

---

## 12) Git, revue & CI (pour ce que produit l’agent)

- Commits : **Conventional Commits** :
  - `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `build:`, etc.

- PR :
  - petite et focalisée,
  - liée à une feature ou un bug précis,
  - checklist type :
    - lint/format OK,
    - tests verts + couverture stable,
    - pas de chaînes en dur,
    - accessibilité minimale si UI,
    - changelog si besoin.

Scripts attendus :

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

## 13) Anti-patterns (refus explicites)

L’agent doit **refuser / contourner** les demandes qui impliquent :

- TypeScript, `require`, `var`, manipulation d’ES5.
- `console.log` (ou `console.xxx`) en dehors de `logger.mjs`.
- Logique métier lourde dans un `.hbs`.
- Écriture de Documents dans `prepareDerivedData`.
- Accès DOM global (hors périmètre de l’application et sans `data-action`).
- Règles non testables mélangeant directement Foundry + métier.

Si la demande force un anti-pattern, l’agent propose une **alternative propre** et documente le risque dans la section **Assumptions**.

---

## 14) Checklists internes de l’agent

Avant d’envoyer une réponse :

- [ ] Code JS ES2022, pas de TS, pas de `require`.
- [ ] Séparation métier / Foundry respectée.
- [ ] Logger central utilisé, aucun `console.xxx` direct.
- [ ] Pas de side effects dans `prepareDerivedData`.
- [ ] i18n OK (aucune chaîne brute).
- [ ] Tests Vitest fournis/MAJ pour la logique métier.
- [ ] Structure de réponse respectée (Résumé → Arborescence → Patches → i18n → Tests → Commandes → Commit → Assumptions/Follow-ups).

Ce guide est désormais aligné sur le **coding-style humain SWERPG** et doit être la référence pour tout code généré par l’agent.
