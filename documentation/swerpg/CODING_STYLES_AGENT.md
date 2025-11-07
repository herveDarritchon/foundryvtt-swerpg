# SWERPG — Coding Style Guide for Copilot Agent (JS, Foundry v13+)

> **But** : fournir des règles **opérationnelles pour un agent/copilot** qui génère et modifie du code du système SWERPG en JavaScript. Le résultat attendu : **zéro friction**, **zéro lint error**, **Foundry‑idiomatique**, **testable**, **i18n ready**.

---

## 0) Mode opératoire de l’agent

* **Langage** : JavaScript ES2022 **uniquement** (aucun TypeScript). Ext. `.mjs`/`.js` selon le dossier (code : `.mjs`).
* **Cible** : Foundry VTT **v13+** (utiliser `ApplicationV2`, `HandlebarsApplicationMixin`, `TypeDataModel`).
* **Style** : Prettier & ESLint **doivent** passer. Ne jamais insérer de `console.log` (utiliser `logger`).
* **Sécurité** : pas d’effets de bord dans `prepareDerivedData`; migrations **idempotentes**; pas d’accès DOM global (scoper à l’app).

**Contrat de réponse** (ordre strict) :

1. **Résumé** (2–4 phrases, objectif + ce qui change).
2. **Arborescence modifiée** (mini tree).
3. **Patches complets** (code fences par fichier, avec `path:` en première ligne).
4. **i18n** (clés nouvelles/modifiées : `lang/en.json`, `lang/fr.json`).
5. **Tests Vitest** (nouveaux/MAJ) + scénarios manuels si UI.
6. **Commandes** à exécuter (scripts npm, build).
7. **Commit message** (Conventional Commit) + **BREAKING** si besoin.
8. **Assumptions** (si tu as tranché un point ambigu) + **Follow‑ups** (TODO qui ne bloquent pas la PR).

---

## 1) Décisions d’architecture (arbre des choix)

**Si la demande touche…**

* **Données d’acteur/item** → créer/étendre un **`TypeDataModel`** dans `module/data/**` + migration si renommage.
* **Interface (feuille, dialog, app)** → `ApplicationV2` + `HandlebarsApplicationMixin` dans `module/applications/**` + template `.hbs` dans `templates/**`.
* **Règles/jet/effet** → classe d’**action** isolée dans `module/rules/actions/**` consommée par la feuille ou un service.
* **Utilitaire transverse** (i18n, flags, logger, roll) → `module/services/**` ou `module/utils/**` (purs si possible).

**Toujours** :

* Les handlers UI utilisent `data-action` et des méthodes privées `#onX`.
* `prepareDerivedData()` **ne met à jour** aucun Document.
* Les chaînes sont **i18n** (jamais en dur dans le code/template) ; clés `SWERPG.Domain.Sub.Key`.

---

## 2) Organisation & nommage

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

* Fichiers JS : `kebab-case.mjs`. Classes : `PascalCase`. Fonctions/vars : `camelCase`.
* Partials Handlebars : `_partial.hbs` (underscore).
* Booléens : `is*/has*`. Suffixes standard : `*Model`, `*Service`, `*Config`.

---

## 3) Règles de code **enforcées**

* `===` obligatoire (`eqeqeq`).
* `const` par défaut; `let` si mutation; **jamais** `var`.
* `no-param-reassign`: interdit la mutation de paramètres (copie défensive).
* Imports ES (`import/export`), pas de `require`.
* `async/await` préféré; gérer tous les rejets.
* `no-console` (sauf `warn`/`error` via `logger`).
* `import/order` alphabétique + lignes blanches.

**Logger minimal** (à utiliser par l’agent) :

```js
// path: module/utils/logger.mjs
export const logger = {
  debug: (...a) => console.debug('[SWERPG]', ...a),
  info:  (...a) => console.info('[SWERPG]', ...a),
  warn:  (...a) => console.warn('[SWERPG]', ...a),
  error: (...a) => console.error('[SWERPG]', ...a),
};
```

---

## 4) Patterns Foundry obligatoires

### 4.1 DataModel

```js
// path: module/data/actor/actor-model.mjs
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
  prepareDerivedData() {
    const data = this;
    const armorSoak = this.parent?.system?.armor?.soak ?? 0;
    data.thresholds.soak = Math.max(0, (data.characteristics?.brawn ?? 0) + armorSoak);
  }
  static migrateData(source) {
    const s = source;
    if (s.characteristics?.vigor) {
      s.characteristics.willpower = s.characteristics.vigor;
      delete s.characteristics.vigor;
    }
  }
}
```

### 4.2 Feuille (ApplicationV2)

```js
// path: module/applications/actor/actor-sheet.mjs
export class SwerpgActorSheet extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: 'form',
    classes: ['swerpg', 'sheet', 'actor'],
    window: { title: 'SWERPG.ActorSheet.Title' },
    position: { width: 860, height: 640 },
    form: { submitOnChange: true }
  };
  #actor;
  constructor(actor, options = {}) { super(options); this.#actor = actor; }
  get title() { return game.i18n.format('SWERPG.ActorSheet.Title', { name: this.#actor.name }); }
  async _prepareContext() {
    const system = this.#actor.system;
    return { actor: this.#actor, system, characteristics: system.characteristics };
  }
  static PARTS = {
    header: { template: 'templates/actor/_header.hbs' },
    stats:  { template: 'templates/actor/_stats.hbs' },
    skills: { template: 'templates/actor/_skills.hbs' }
  };
  activateListeners(html) {
    html.querySelectorAll("[data-action='roll']").forEach((el) =>
      el.addEventListener('click', (ev) => this.#onRoll(ev))
    );
  }
  async #onRoll(ev) {
    const key = ev.currentTarget?.dataset?.skill ?? 'cool';
    const roll = await new Roll(`1d20 + @skills[\"${key}\"]`, this.#actor.getRollData())
      .evaluate({ async: true });
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.#actor }) });
  }
}
```

### 4.3 Action de jet

```js
// path: module/rules/actions/skill-check.mjs
export class SkillCheck {
  constructor(actor, skill, modifier = 0) { this.actor = actor; this.skill = skill; this.modifier = modifier; }
  async execute() {
    const data = this.actor.getRollData();
    const roll = await new Roll(`1d20 + @skills[\"${this.skill}\"] + ${this.modifier}`, data)
      .evaluate({ async: true });
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: game.i18n.format('SWERPG.Roll.Skill', { skill: this.skill }) });
  }
}
```

---

## 5) i18n : règles de génération

* **Jamais** de chaînes brutes dans le code. Utiliser `game.i18n.localize/format`.
* Clés : `SWERPG.Domain.Sub.Key` (ex. `SWERPG.Actor.Chars.Agility`).
* L’agent **ajoute** les clés manquantes dans `lang/en.json` et `lang/fr.json` avec une traduction FR basique.
* Dans les templates : `{{t "SWERPG.ActorSheet.Title" name=actor.name}}` (helper `t` via service).

Helper i18n minimal :

```js
// path: module/services/i18n.mjs
export const t = (k, data) => (data ? game.i18n.format(k, data) : game.i18n.localize(k));
```

---

## 6) Accessibilité & CSS

* Préfixe BEM : `sw-Block__elem--mod`. Contraste ≥ 4.5:1 ; focus visible.
* Pas d’`!important` sauf correctif ciblé Foundry. Animations < 200ms et respect de `prefers-reduced-motion`.
* Les classes CSS introduites par l’agent doivent être **définies** dans `styles/**` ou réutiliser les tokens existants.

---

## 7) Tests générés par l’agent

* **Toujours** tester : calculs de règles, formules de jets, chemins heureux/erreurs.
* Pour les feuilles : test de construction, handlers, au moins un event `data-action`.

Exemple Vitest (JS) :

```js
// path: tests/rules/skill-check.test.js
import { describe, it, expect, vi } from 'vitest';
import { SkillCheck } from '@/module/rules/actions/skill-check.mjs';

describe('SkillCheck', () => {
  it('sends a chat message with the built roll', async () => {
    const actor = { getRollData: () => ({ skills: { cool: 3 } }) };
    const toMessage = vi.fn();
    vi.spyOn(global, 'Roll').mockImplementation(() => ({ evaluate: async () => ({ toMessage }) }));
    await new SkillCheck(actor, 'cool', 2).execute();
    expect(toMessage).toHaveBeenCalled();
  });
});
```

---

## 8) Quand poser des questions vs. prendre des hypothèses

**Poser des questions si** :

* Ambiguïté bloquante sur le **type de Document** à modifier (Actor vs Item),
* Conflit de **clé i18n** existante/attendue,
* Risque de **breaking change** (migration de données) non couvert.

**Sinon** :

* Prendre une **hypothèse raisonnable**, la consigner en section **Assumptions**, et **paramétrer** (setting/flag) quand c’est pertinent.

---

## 9) Checklists de l’agent (avant d’envoyer)

* [ ] Code **JS** uniquement, Foundry v13, patterns conformes.
* [ ] Aucune chaîne brute (i18n OK). Pas de `console.log`.
* [ ] `prepareDerivedData` sans side effects; migrations idempotentes si présentes.
* [ ] Tests Vitest fournis/MAJ; scripts et commandes listés.
* [ ] Commit Conventional prêt; changelog si nécessaire.

---

## 10) Modèles de sortie (copier‑coller)

### 10.1 Commit message

```
feat(actor): add soak auto‑calc from armor to derived data

- compute soak = brawn + armor.soak
- add i18n keys for sheet labels
- add unit test for SkillCheck flavor
```

### 10.2 Bloc i18n

```json
// path: lang/en.json (extract)
{
  "SWERPG": {
    "Actor": {
      "Sheet": { "Title": "Actor — {name}" },
      "Chars": { "Agility": "Agility" }
    },
    "Roll": { "Skill": "Skill check: {skill}" }
  }
}
```

```json
// path: lang/fr.json (extrait)
{
  "SWERPG": {
    "Actor": {
      "Sheet": { "Title": "Personnage — {name}" },
      "Chars": { "Agility": "Agilité" }
    },
    "Roll": { "Skill": "Jet de compétence : {skill}" }
  }
}
```

---

## 11) Anti‑patterns (refus explicites)

* TS, d.ts, `require`, `var`, `console.log`, requêtes DOM globales hors composant.
* Logique métier lourde dans un template `.hbs`.
* Écriture de Documents dans `prepareDerivedData`.
* Dés 3D appelés directement depuis la logique de règles (passer par une action/service).

> Si la demande force un anti‑pattern, l’agent **propose une alternative** et documente le risque.

---

## 12) Adoption CI

* Scripts npm attendus :

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

* La PR est bloquée si lint/test échouent.

---

> Ce guide est la **charte de génération** pour l’agent. Toute exception doit être justifiée dans la section **Assumptions** et accompagnée d’un plan de régularisation (issue/PR suivante).
