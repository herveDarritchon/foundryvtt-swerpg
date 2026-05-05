# UI Applications – Guide pour copilots / agents IA (swerpg)

Ce document définit les **règles à respecter par un copilot / agent IA** lorsqu’il propose, génère ou modifie du code lié aux **feuilles d’acteur et d’item** du système **Star Wars Edge RPG (swerpg)** sous Foundry VTT v13.

Si tu es un copilot, considère ces règles comme **contractuelles** : ne les enfreins pas sans instruction humaine explicite.

---

## 0. Objectif

Quand tu écris du code UI pour swerpg, tu dois :

1. Respecter l’architecture basée sur `ApplicationV2` + `HandlebarsApplicationMixin`.
2. Protéger les conventions de nommage, d’organisation des fichiers et de structure HTML/CSS.
3. Ne jamais introduire de logique métier dans les templates Handlebars.
4. Utiliser correctement l’API Foundry (`update`, `updateSource`, hooks, registres de sheets).
5. Produire du code qui reste compatible avec les modules externes (contrats CSS, hooks).

---

## 1. Classes & enregistrement des sheets

### 1.1. Bases à utiliser

Quand tu crées ou modifies une sheet :

- Pour les **acteurs**, tu dois **toujours** étendre :
  `SwerpgBaseActorSheet`
- Pour les **items**, tu dois **toujours** étendre :
  `SwerpgBaseItemSheet`

Ne propose pas d’étendre directement `ActorSheet` ou `ItemSheet` sauf demande explicite.

### 1.2. Types de sheets existants

Connais et respecte ces mappings (ne les renomme pas sans instruction humaine) :

**Acteurs (`SwerpgBaseActorSheet`)**

- Adversaire → `AdversarySheet` → `module/applications/sheets/adversary-sheet.mjs`
- Personnage (origin) → `CharacterSheet` → `module/applications/sheets/character-sheet-origin.mjs`
- Personnage (swerpg) → `CharacterSheet` → `module/applications/sheets/character-sheet-swerpg.mjs`
- Personnage (générique) → `CharacterSheet` → `module/applications/sheets/character-sheet.mjs`
- Héros → `HeroSheet` → `module/applications/sheets/hero-sheet.mjs`

**Items (`SwerpgBaseItemSheet`)**

`GearSheet`, `ObligationSheet`, `OriginSheet`, `SpecializationSheet`, `SpeciesSheet`,
→ tous sous `module/applications/sheets/*-sheet.mjs`.

### 1.3. Nommage & fichiers

Quand tu proposes une nouvelle sheet :

- Le nom de classe doit être en **PascalCase** avec suffixe **`Sheet`**
  ex. `MyCoolThingSheet`.
- Le fichier correspondant doit être en **kebab-case** avec suffixe `-sheet.mjs` :
  `module/applications/sheets/my-cool-thing-sheet.mjs`
- Une seule **classe principale** par fichier.

Ne renomme pas des classes ou fichiers existants sans instruction explicite.

### 1.4. Enregistrement des sheets (Foundry)

Si tu crées une nouvelle sheet, tu dois **aussi** proposer son enregistrement via `Actors.registerSheet` ou `Items.registerSheet` dans le fichier d’init (ex. `module/system/registration.mjs`) :

```js
Hooks.once('init', function () {
  Actors.registerSheet('swerpg', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Character',
  })

  Items.registerSheet('swerpg', WeaponSheet, {
    types: ['weapon'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Weapon',
  })
})
```

Règles pour un copilot :

- Ne change **jamais** l’ID système `"swerpg"`.
- N’utilise `makeDefault: true` que pour la variante principale, pas pour chaque nouvelle variation.
- Considère la clé de sheet (`swerpg.CharacterSheet`, `renderCharacterSheet`, etc.) comme **stable** : ne la renomme pas.

---

## 2. `defaultOptions` & options d’interface

Quand tu modifies ou génères `static get defaultOptions()` :

- Tu dois **toujours** partir de `super.defaultOptions` :

```js
static get defaultOptions() {
  const options = super.defaultOptions;
  // modifications...
  return options;
}
```

- Tu peux configurer :
  - `id`, `classes`, `width`, `height`, `top`, `left`, `resizable`
  - `template`
  - `tabs` (navSelector, contentSelector, initial)

- Tu **ne dois pas** mettre de **logique métier** dans `defaultOptions`
  (pas de calculs fonctionnels, pas de lecture de `this.document`).

---

## 3. Données & contexte de rendu

### 3.1. Source de vérité des données

Les structures de `system.*` sont définies dans `DATA_MODELS.md`.
En tant que copilot, **ne crée pas de nouvelles propriétés `system.*` au hasard**. Reste strictement aligné sur ces modèles ou sur ce que le code existant montre.

### 3.2. `_prepareContext(options)`

Quand tu as besoin de préparer des données pour le template :

- Utilise **`_prepareContext(options)`** (équivalent moderne de `getData()`).
- Appelle **toujours** `await super._prepareContext(options)`.

Tu dois y mettre :

- `context.document` (`actor`, `item`, …)
- `context.system = doc.system`
- `context.config = game.system.config`
- `context.isOwner = doc.isOwner`
- Toute donnée dérivée utile au template (pré-calculée).

Exemple type que tu dois suivre :

```js
protected async _prepareContext(options) {
  const context = await super._prepareContext(options);

  const doc = this.document;
  context.document = doc;
  context.system = doc.system;
  context.config = game.system.config;
  context.isOwner = doc.isOwner;

  context.skills = this._prepareSkills(doc.system);
  context.hasForceRating = doc.system.force?.rating > 0;

  return context;
}
```

Ne surcharge **jamais** `getData()` dans cette architecture.

### 3.3. `_preparePartContext(partId, context, options)`

Si la classe utilise des `PARTS`, tu peux affiner par part :

```js
protected async _preparePartContext(partId, context, options) {
  await super._preparePartContext(partId, context, options);

  if (partId === "talents") {
    context.talentsTree = this._buildTalentsTree(context.system.talents);
  }
}
```

En tant que copilot :

- Utilise `_preparePartContext` uniquement si la classe exploite déjà `PARTS` ou si l’humain le demande.
- Ne duplique pas la même logique entre `_prepareContext` et `_preparePartContext`.

### 3.4. Ce que tu ne dois pas faire

- Ne **jamais** remettre de logique de données dans `_onRender` / `_postRender`.
- Ne pas écrire de logique complexe dans les templates (gros `{{#if}}`, `lookup` imbriqués, etc.) → remonte tout ça dans `_prepareContext`.

---

## 4. Formulaires & persistance

### 4.1. Binding des champs

Dans les templates que tu génères :

- Utilise **toujours** `name="system.xxx.yyy"` pour les champs qui reflètent le `TypeDataModel`.
- Ne change pas la structure des chemins (`system.attributes.bravery`, etc.) sauf si tu modifies aussi le modèle de données (et que c’est validé côté système).

### 4.2. Actions ciblées

Pour les boutons / toggles / actions custom :

- Utilise des boutons avec `data-action="..."`.
- Dans la sheet, branche des handlers qui appellent **explicitement** `this.document.update(...)`.

Exemple de pattern que tu dois réutiliser :

```js
html.on("click", "[data-action=roll-skill]", this._onRollSkill.bind(this));

async _onRollSkill(event) {
  event.preventDefault();
  const skill = event.currentTarget.dataset.skill;
  // ... logique de jet
}
```

### 4.3. Override de la soumission globale

Si tu proposes d’override la soumission d’un `<form>` :

- Documente clairement le comportement dans un commentaire.
- Récupère les données (FormData / `Object.fromEntries`).
- Passe **toujours** par `this.document.update(...)`.
- Appelle `super._onSubmit(...)` si la superclasse définit déjà un comportement.

---

## 5. Événements, DOM & interactions avancées

### 5.1. `activateListeners(html)`

Règles :

- Commence toujours par `super.activateListeners(html)`.
- Respecte `if (!this.isEditable) return;` quand tu modifies des données.
- Ne surcharge pas tout dans un gros bloc : factorise.

Pattern recommandé :

```js
activateListeners(html) {
  super.activateListeners(html);
  if (!this.isEditable) return;

  this._activateHeaderListeners(html);
  this._activateTalentsListeners(html);
  this._activateInventoryListeners(html);
  this._activateActionsListeners(html);
}
```

En tant que copilot, favorise **toujours** ce pattern plutôt qu’un `activateListeners` de 300 lignes.

### 5.2. Drag & drop, context menus

Règles :

- **Jamais** de `document.querySelector` dans les sheets.
- Toujours travailler dans le périmètre `html` / `this.element`.
- Marquer les éléments avec des `data-*` clairs :

```hbs
<li data-drag-source='talent' draggable='true'>...</li>
<li data-drop-target='inventory-slot'>...</li>
```

Et côté JS :

```js
html.on('dragstart', '[data-drag-source=talent]', this._onDragTalentStart.bind(this))
html.on('drop', '[data-drop-target=inventory-slot]', this._onDropToInventory.bind(this))
html.on('contextmenu', '[data-has-context=talent]', this._onTalentContextMenu.bind(this))
```

Les mises à jour qui en découlent doivent **toujours** passer par `this.document.update(...)`.

---

## 6. Mise à jour & validation des données

### 6.1. `update()` vs `updateSource()`

En tant que copilot :

- Dans une sheet, après une action utilisateur → **`this.document.update(...)`**
- Dans de la préparation interne, migrations, factories de source → **`updateSource(...)`**

**Interdit** : `this.document.system.foo = ...`.

Exemple valide dans une sheet :

```js
async _onChangeBravery(event) {
  event.preventDefault();
  const value = Number(event.currentTarget.value) || 0;
  await this.document.update({ "system.attributes.bravery": value });
}
```

Rappelle-toi : `update()` est broadcast à tous les clients, donc :

- évite les updates sur chaque `input` sans debounce ;
- regroupe plusieurs changements dans un seul objet.

### 6.2. Validation

Si tu dois gérer une valeur potentiellement invalide :

- Corrige-la côté JS (clamp, valeur par défaut).
- Ou affiche une erreur via `ui.notifications.error(...)`.
- Ne compte pas sur le template ou le DataModel pour « deviner » le comportement.

---

## 7. Templates, partials & helpers

### 7.1. Rôle des templates

En tant que copilot, considère que :

- Les templates `.hbs` sont **bêtes**.
- Ils affichent des valeurs pré-calculées, ne font pas de logique métier.
- Toute logique un peu intelligente doit être :
  - soit dans `_prepareContext` / `_preparePartContext`,
  - soit dans un **helper Handlebars custom**.

### 7.2. Organisation des templates

Respecte ces conventions :

- Feuilles d’acteur → `systems/swerpg/templates/actors/*.hbs`
- Feuilles d’item → `systems/swerpg/templates/items/*.hbs`
- Partials réutilisables → `systems/swerpg/templates/partials/*.hbs`

Dès que tu dupliques un bloc entre plusieurs templates, propose un **partial** :

```hbs
{{> "systems/swerpg/templates/partials/swerpg-actor-header.hbs"}}
```

Nommes-les de façon explicite (ex. `swerpg-actor-header`, `swerpg-item-summary`).

### 7.3. Helpers Handlebars

Si tu as besoin de formatage :

- N’écris pas de logique complexe dans le template.
- Prépare des valeurs formatées dans le contexte **ou** utilise un helper Handlebars existant/custom.
- Pour la localisation, utilise `{{localize "SWERPG.Key"}}` et côté JS `game.i18n.localize`.

---

## 8. Performance, accessibilité & UX

### 8.1. Performance

- Ne laisse pas de `console.log` permanents (préférer un logger conditionnel).
- Debounce les inputs qui déclenchent des `update()` fréquents.
- Garde les méthodes courtes et ciblées.

### 8.2. Accessibilité & UX minimale

Quand tu génères du HTML :

- Assure-toi que chaque champ a un `<label>` clair.
- Évite les boutons « icône seule » pour les actions critiques (ajoute du texte ou un `title` explicite).
- Regroupe les actions destructives / critiques dans des zones cohérentes (footer, menus contextuels).
- Ne définis pas de raccourcis clavier globaux dans chaque sheet : ça se gère au niveau système, pas par feuille.

---

## 9. Contrat CSS / HTML pour les modules externes

En tant que copilot, tu dois **respecter** et **préserver** ces classes et structures :

- Conteneur principal de sheet : `.swerpg.sheet`
- Sections principales :
  - `.sheet-header`
  - `.sheet-tabs`
  - `.sheet-body`
  - `.sheet-footer`

Ne les renomme pas, ne les supprime pas, ne les restructure pas lourdement sans raison explicite.
Les modules externes s’appuient dessus via les hooks `render*`.

Si, à la demande d’un humain, tu dois faire une modification incompatible :

- Ajoute un commentaire clair dans le code.
- Mentionne qu’il faut mettre à jour le changelog et la doc d’intégration.

---

## 10. Quand tu dois choisir entre plusieurs options

Règles de priorité pour un copilot :

1. **Ne casse jamais** les conventions existantes (noms de classes, structure HTML, chemins `system.*`).
2. Préfère **étendre** les bases (`SwerpgBaseActorSheet`, `SwerpgBaseItemSheet`) plutôt que réinventer une architecture.
3. Préfère **les hooks `render*`** pour les modules externes plutôt que la modification intrusive des classes cœur.
4. Si tu hésites entre logique dans le template ou dans la sheet → mets-la dans la sheet (`_prepareContext`, handlers).
5. Si tu hésites entre `update()` et `updateSource()` → dans une sheet, c’est presque toujours `update()`.

---
