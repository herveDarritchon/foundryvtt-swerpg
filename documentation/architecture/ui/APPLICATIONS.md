# UI Applications – Architecture des feuilles et composants - Interface Utilisateur

Ce document décrit comment sont conçues, structurées et étendues les applications UI du système **Star Wars Edge RPG (swerpg)** : principalement les feuilles d’acteur et d’item. Les autres applications (dialogues, écrans métiers) seront détaillées dans des documents séparés.

Il s’adresse à la fois :

- aux **développeurs** qui implémentent ou modifient les écrans ;
- aux **agents d’IA / copilots** qui génèrent, complètent ou refactorent du code à partir de cette architecture.

L’objectif est de fournir un cadre clair pour tout ce qui repose sur `ApplicationV2` et `HandlebarsApplicationMixin` :

- organisation des fichiers dans `module/applications/` ;
- conventions de nommage des classes de feuilles et de leurs templates ;
- cycle de vie d’une application (initialisation, rendu, gestion des événements) ;
- bonnes pratiques pour garder des interfaces cohérentes, accessibles et faciles à maintenir.

En pratique, ce document doit permettre de répondre rapidement aux questions suivantes :

- **Quelle classe de base dois-je étendre pour créer une nouvelle feuille ?**
- **Où déclarer les options d’interface (taille, onglets, classes CSS, etc.) ?**
- **Comment connecter les données (TypeDataModel) aux templates Handlebars ?**
- **Quels hooks et points d’extension utiliser pour enrichir les feuilles existantes ?**

Si tu es un développeur humain, lis ce document avant de créer une nouvelle UI.  
Si tu es un agent AI/copilot, utilise-le comme référence pour proposer du code conforme aux patterns et conventions de swerpg.

## 🎨 Patterns d'Applications

### 1. Base Classes

- `SwerpgBaseActorSheet`
- `SwerpgBaseItemSheet`

#### 1.1 Feuilles dérivées de `SwerpgBaseActorSheet`

| Type d’acteur / variante | Classe           | Fichier                                                 |
| ------------------------ | ---------------- | ------------------------------------------------------- |
| Adversaire               | `AdversarySheet` | `module/applications/sheets/adversary-sheet.mjs`        |
| Personnage (origin)      | `CharacterSheet` | `module/applications/sheets/character-sheet-origin.mjs` |
| Personnage (swerpg)      | `CharacterSheet` | `module/applications/sheets/character-sheet-swerpg.mjs` |
| Personnage (générique)   | `CharacterSheet` | `module/applications/sheets/character-sheet.mjs`        |
| Héros                    | `HeroSheet`      | `module/applications/sheets/hero-sheet.mjs`             |

#### 1.2 Spécialisations de `SwerpgBaseItemSheet`

| Type d’élément | Classe de feuille     | Fichier                                               |
| -------------- | --------------------- | ----------------------------------------------------- |
| Armure         | `ArmorSheet`          | `module/applications/sheets/armor-sheet.mjs`          |
| Historique     | `BackgroundSheet`     | `module/applications/sheets/background-sheet.mjs`     |
| Carrière       | `CareerSheet`         | `module/applications/sheets/career-sheet.mjs`         |
| Équipement     | `GearSheet`           | `module/applications/sheets/gear-sheet.mjs`           |
| Obligation     | `ObligationSheet`     | `module/applications/sheets/obligation-sheet.mjs`     |
| Origine        | `OriginSheet`         | `module/applications/sheets/origin-sheet.mjs`         |
| Spécialisation | `SpecializationSheet` | `module/applications/sheets/specialization-sheet.mjs` |
| Espèce         | `SpeciesSheet`        | `module/applications/sheets/species-sheet.mjs`        |
| Talent         | `TalentSheet`         | `module/applications/sheets/talent-sheet.mjs`         |
| Arme           | `WeaponSheet`         | `module/applications/sheets/weapon-sheet.mjs`         |

#### 1.3 Enregistrer une sheet pour un type de document

Définir la classe ne suffit pas : tu dois l’enregistrer auprès de Foundry pour qu’elle soit proposée (et éventuellement utilisée par défaut) pour un type de document donné.
Dans swerpg, cet enregistrement se fait dans le fichier d’init du système (par exemple `module/system/registration.mjs`), au moment du hook init.

```js
Hooks.once('init', function () {
  // Exemple pour un acteur "character"
  Actors.registerSheet('swerpg', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Character',
  })

  // Exemple pour un item "weapon"
  Items.registerSheet('swerpg', WeaponSheet, {
    types: ['weapon'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Weapon',
  })
})
```

##### Points importants

- Le premier argument ("swerpg") est l’ID du système : ne le change pas.
- La clé de sheet exposée aux modules externes est dérivée de la classe et du système
  (ex. swerpg.CharacterSheet) : considère-la comme stable pour permettre aux modules d’accrocher des hooks (renderCharacterSheet, etc.).
- Utilise makeDefault: true uniquement pour la variante principale d’un type (ex. la feuille de personnage que tu veux pour 90% des cas) et enregistre les variantes comme feuilles alternatives sans makeDefault.

**En résumé :** toute nouvelle feuille doit avoir sa classe, son fichier et son enregistrement explicite dans le bootstrap du système, sinon elle n’existe tout simplement pas aux yeux de Foundry.

### 2. Règles de nommage des classes de feuilles

Toutes les classes de feuilles suivent une convention stricte afin de rester prévisibles pour les développeurs et les agents AI :

- Les classes sont en **PascalCase** et se terminent toujours par le suffixe **`Sheet`**  
  (ex. `CharacterSheet`, `WeaponSheet`, `AdversarySheet`).
- Les feuilles d’acteur étendent `SwerpgBaseActorSheet`, les feuilles d’item étendent `SwerpgBaseItemSheet`.
- Le nom du fichier est en **kebab-case**, dérivé du nom de la classe **avec un suffixe `-sheet`**,  
  placé dans le répertoire racine : `module/applications/sheets/`  
  (ex. `CharacterSheet` → `module/applications/sheets/character-sheet.mjs`,  
  `ArmorSheet` → `module/applications/sheets/armor-sheet.mjs`).
- Une classe par fichier : le nom du fichier doit identifier sans ambiguïté la classe principale du module.

En résumé : si tu crées `MyNewThingSheet`, on s’attend à la trouver dans  
`module/applications/sheets/my-new-thing-sheet.mjs` et à ce qu’elle étende la bonne base (`SwerpgBaseActorSheet` ou `SwerpgBaseItemSheet`).

---

## ❓ Guides de mise en œuvre – Développer une Sheet (Foundry VTT v13, JS)

Ce qui suit n’est pas optionnel si tu veux un système maintenable.

### 1. Architecture & Classes

- **Toujours étendre la bonne base**
  - Acteurs → base système (`SwerpgBaseActorSheet`, etc.).
  - Items → base système (`SwerpgBaseItemSheet`, etc.).

### 1.1 `defaultOptions` – Déclarer les options d’interface

Toutes les options d’interface d’une feuille sont déclarées dans `static get defaultOptions()` de la classe (héritée d’`ApplicationV2` via les bases swerpg).

Points clés :

- **Dimensions, position** : `width`, `height`, `top`, `left`, `resizable`.
- **Classes CSS** : tableau `classes` (pour cibler la feuille dans le SCSS).
- **Template** : chemin Handlebars via `template`.
- **Onglets** : configuration `tabs` (groupes, sélecteur, onglet par défaut).
- **Drag & Drop / context menu** : souvent initialisés via les options ou dans `activateListeners`.

Exemple :

```js
static get defaultOptions() {
  const options = super.defaultOptions;
  options.id = "swerpg-character-sheet";
  options.classes = ["swerpg", "sheet", "actor", "character"];
  options.width = 800;
  options.height = 700;
  options.resizable = true;
  options.template = "systems/swerpg/templates/actors/character-sheet.hbs";
  options.tabs = [
    {
      navSelector: ".sheet-tabs",
      contentSelector: ".sheet-body",
      initial: "summary"
    }
  ];
  return options;
}
```

### Règles

- pars toujours de `super.defaultOptions`
- ne mets aucune logique métier dans `defaultOptions`

### 2. Préparer les données en ApplicationV2 + HandlebarsApplicationMixin

En ApplicationV2, tu **ne surcharges plus `getData()`** comme en v1.
La préparation des données pour les templates se fait via les méthodes protégées suivantes :

Les structures de `system.*` sont définies dans [DATA_MODELS.md](../data/MODELS.md). Tout accès dans les feuilles doit respecter ces modèles.

#### `_prepareContext(options)` – Point d’entrée principal

C’est l’équivalent moderne de `getData()` :

- prépare le **contexte global** passé aux templates Handlebars ;
- est appelée à chaque `render()` ;
- doit retourner un objet `ApplicationRenderContext`.

C’est ici que tu exposes :

- le document (`actor`, `item` ou autre) ;
- `system` (le `TypeDataModel`) ;
- `config`, `flags`, `isOwner`, etc. ;
- toutes les données déjà calculées pour éviter la logique dans les templates.

Exemple :

```js
protected async _prepareContext(options) {
  const context = await super._prepareContext(options);

  const doc = this.document;
  context.document = doc;
  context.system = doc.system;
  context.config = game.system.config;
  context.isOwner = doc.isOwner;

  // Exemples de dérivés précalculés
  context.skills = this._prepareSkills(doc.system);
  context.hasForceRating = doc.system.force?.rating > 0;

  return context;
}
```

**Règle** : si tu te demandes « où préparer telle donnée pour le template ? »,
la réponse par défaut est : **`_prepareContext()`**.

---

#### `_preparePartContext(partId, context, options)` – Pour les UI en plusieurs “parts”

Si tu exploites `PARTS` sur ta classe (pattern ApplicationV2), tu peux affiner la préparation par “part” :

- `partId` : identifiant de la part (ex. `"header"`, `"body"`, `"talents"`, etc.) ;
- `context` : contexte global déjà préparé par `_prepareContext()` ;
- tu peux y ajouter des propriétés spécifiques à cette part seulement.

À utiliser quand :

- ta sheet est découpée en gros blocs logiques (header, stats, talents, équipement…) ;
- certains blocs nécessitent des calculs lourds ou optionnels ;
- tu veux éviter d’alourdir `_prepareContext()` avec de la logique conditionnelle sur tout.

Exemple :

```js
protected async _preparePartContext(partId, context, options) {
  await super._preparePartContext(partId, context, options);

  if (partId === "talents") {
    context.talentsTree = this._buildTalentsTree(context.system.talents);
  }

  if (partId === "equipment") {
    context.encumbrance = this._computeEncumbrance(context.system.inventory);
  }
}
```

---

#### Et pour les onglets ?

Si tu utilises des **tabs** déclarés dans `PARTS` ou via la config de l’appli, `HandlebarsApplicationMixin` fournit aussi des helpers internes comme `_prepareTabContext`, mais dans un système de jeu classique tu peux tout à fait rester sur :

- `_prepareContext()` pour le global ;
- `_preparePartContext()` si tu exploites vraiment les parts.

---

#### Ce qu’il ne faut pas faire

- Ne pas surcharger `getData()` : c’est du monde v1, tu es en v2.
- Ne pas faire de « calculs intelligents » dans le template Handlebars :
  - si tu te surprends à écrire des `{{#if ...}}` complexes ou des grosses chaînes de `lookup`, c’est que tu dois remonter la logique dans `_prepareContext()` / `_preparePartContext()`.

- Ne pas bricoler le contexte dans `_onRender()` ou `_postRender()` : ces hooks sont pour la **gestion du DOM**, pas pour fabriquer les données.

#### Exemple complet – Feuille d’item + template

```js
protected async _preparePartContext(partId, context, options) {
  await super._preparePartContext(partId, context, options);

  if (partId !== "main") return;

  const doc = this.document;
  context.item = doc;
  context.system = doc.system;
  context.config = game.system.config;
  context.isOwner = doc.isOwner;

  context.skills = this._prepareSkills(doc.system);
  context.hasForceRating = doc.system.force?.rating > 0;

  return context;
}
```

Et côté template :

```hbs
<h1>{{item.name}}</h1>

<section class='grid'>
  <div class='field'>
    <label>Bravoure</label>
    <input type='number' name='system.attributes.bravery' value='{{system.attributes.bravery}}' />
  </div>

  <div class='field'>
    <label>Description</label>
    <textarea name='system.description'>{{system.description}}</textarea>
  </div>
</section>
```

### Bonnes pratiques

- expose explicitement `item`, `actor`, `system`, `config` dans le contexte.
- garde la logique métier dans la classe de feuille (ou le `TypeDataModel`), pas dans le template.
- utilise des chemins cohérents avec la structure du `TypeDataModel`.

#### 2.1 Sauvegarde des données de formulaire

Pour la persistance, la règle est simple : le formulaire décrit les données, la sheet les enregistre. Dans tes templates, utilise toujours le binding standard des champs via l’attribut name (ex. name="system.attributes.bravery") de façon à refléter la structure réelle du TypeDataModel. Pour les interactions ciblées (boutons, toggles, roll, etc.), préfère des boutons avec data-action et des handlers dédiés qui appellent explicitement this.document.update({ "system.foo.bar": value }). Si tu vas plus loin et que tu overrides la soumission globale d’un formulaire (par exemple pour traiter un gros payload en une fois), documente-le clairement dans la classe, limite-toi à récupérer les données (via FormData ou équivalent) puis appelle this.document.update(...), et n’oublie pas d’appeler la super-implémentation si la classe parente fournit déjà un comportement standard.

---

### 3. Événements & DOM

- Toute la logique d’interaction passe par `activateListeners(html)`.
- Utilise des **`data-action`** + délégation d’événements plutôt que des sélecteurs fragiles.
- Commence toujours par `super.activateListeners(html)`.

```js
activateListeners(html) {
  super.activateListeners(html);
  if (!this.isEditable) return;

  html.on("click", "[data-action=roll-skill]", this._onRollSkill.bind(this));
}

async _onRollSkill(event) {
  event.preventDefault();
  const skill = event.currentTarget.dataset.skill;
  // … logique de jet
}
```

#### 3.1 Organiser les handlers pour garder la sheet lisible

Ne balance pas tout en vrac dans activateListeners(html). Pour un système ambitieux, tu as besoin de blocs logiques clairement séparés. Le pattern recommandé :

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

Chaque bloc (`_activateTalentsListeners`, `_activateInventoryListeners`, etc.) ne gère qu’une zone ou un usage précis de la sheet. Ça évite les méthodes de 300 lignes illisibles, et ça permet à un copilot (ou à toi dans 6 mois) de savoir où brancher un nouveau comportement sans tout casser.

---

#### 3.2 Drag & drop, context menus & interactions avancées

Pour le drag & drop et les interactions avancées, reste strict : tout doit être ancré dans le DOM de la sheet, jamais sur document ou le DOM global.

- Marque les cibles et les sources avec des attributs ou classes explicites (ex. `data-drag-source="talent"`, `data-drop-target="inventory-slot"`).
- Branche les événements dans `activateListeners(html)`

```js
html.on('dragstart', '[data-drag-source=talent]', this._onDragTalentStart.bind(this))
html.on('drop', '[data-drop-target=inventory-slot]', this._onDropToInventory.bind(this))
html.on('contextmenu', '[data-has-context=talent]', this._onTalentContextMenu.bind(this))
```

Dans les handlers, travaille uniquement avec html / this.element et les dataset des éléments (`event.currentTarget.dataset.*`), pas avec `document.querySelector`.

Le contrat est simple :

- le template signale ce qui est draggable / droppable / a un menu contextuel ;
- la sheet gère le comportement via des handlers bien rangés ;
- les mises à jour de données passent toujours par this.document.update(...).

### 4. Mise à jour des données

#### `update()` vs `updateSource()` – Quand utiliser quoi ?

**Règle d’or** : ne mute jamais `this.document.system` directement (`this.document.system.foo = 42`).
Passe toujours par l’API de Foundry : `update()` ou `updateSource()`.

##### `document.update(data, options)` – Pour les _vraies_ mises à jour

À utiliser quand :

- tu veux **persister** la modification en base (monde, compendium, etc.) ;
- tu veux déclencher les **hooks** (`updateActor`, `updateItem`, etc.) ;
- tu veux que tous les clients connectés voient le changement ;
- tu réagis à une **action utilisateur** dans l’UI (click, input, bouton « Sauver », etc.).

Exemple (dans une sheet) :

```js
async _onChangeBravery(event) {
  event.preventDefault();
  const value = Number(event.currentTarget.value) || 0;
  await this.document.update({ "system.attributes.bravery": value });
}
```

Effets :

- update sauvegardé, feuille rerendue, autres clients synchronisés.
- update() est broadcast à tous les clients. Évite les updates ultra fréquents (ex. on input sans debounce) ou massifs, qui peuvent saturer la synchro réseau et rerendre les feuilles trop souvent.

---

##### `document.updateSource(data)` – Pour préparer / manipuler la source _sans_ persister

À utiliser quand :

- tu es dans une phase de **préparation** ou de **construction** de données ;
- tu ne veux pas déclencher de hooks ni de sauvegarde immédiate ;
- tu ajustes les données **avant** création (`preCreate`, génération de documents, migration interne) ;
- tu travailles sur des données éphémères ou sur des documents qui seront sauvegardés plus tard.

Exemples typiques :

- dans une **migration de système**, pour transformer des données avant un `update()` global ;
- dans un **factory** qui prépare un `ActorSource` ou `ItemSource` avant `Actor.create()` / `Item.create()`;
- dans les **tests** ou scripts de setup.

```js
// Préparation d'une source d'item avant création
const source = duplicate(item.toObject())
source.system.attributes.bravery = 3
item.updateSource(source.system) // pas de persistance directe ici
```

Effet :
→ tu modifies la **source** en mémoire, mais rien n’est encore commit tant que tu n’appelles pas ensuite `update()` / `create()`.

---

##### Résumé brutal

- **Dans une sheet, après une action utilisateur** → `update()`.
- **Dans du code de préparation interne / migration / génération de données** → `updateSource()`.
- Si tu te surprends à faire `this.document.system.foo = ...` → stop, tu es en train de contourner le moteur et tu vas créer des incohérences de rendu et de synchro.
- Groupe les updates dans un seul objet plutôt que de spammer plusieurs `update()`.

---

#### Validation des données saisies

Si une valeur saisie est invalide, corrige-la côté JS avant l’update() (clamp, fallback), ou affiche un message d’erreur via le système de notifications (ui.notifications.error(...)). Ne laisse pas le template ou le DataModel « deviner » quoi faire avec des valeurs incohérentes.

### 5. Templates & Handlebars

- Le template est **bête** : pas de logique métier, juste de la présentation.
- Ne calcule pas dans le template ce qui peut être préparé dans `_prepareContext()` ou `_preparePartContext`.
- Utilise des chemins cohérents avec le `TypeDataModel` (`system.attributes.*`).
- Gère la localisation avec `{{localize "MY_SYSTEM.Key"}}` et `game.i18n.localize` côté JS.

#### 5.1 Partials & helpers Handlebars

Dès que tu commences à dupliquer du markup entre plusieurs templates, arrête-toi et factorise. Tous les morceaux d’UI réutilisables (headers d’acteur, résumé d’item, blocs de caractéristiques, etc.) doivent être extraits en partials dans `systems/swerpg/templates/partials/`. Donne-leur des noms explicites et cohérents (ex. `swerpg-actor-header`, `swerpg-item-summary`) et inclue-les avec `{{> "systems/swerpg/templates/partials/swerpg-actor-header.hbs"}}`.

Même règle pour la logique de présentation : si tu as besoin de formater des valeurs (nombres, seuils de difficulté, durées, icônes de statut…), fais-le soit dans `_prepareContext` / `_preparePartContext` côté JS, soit dans un helper Handlebars custom. Toute logique récurrente ou un peu intelligente doit aller dans un helper ou dans la préparation du contexte – jamais directement dans le `.hbs`. Le template doit rester un assemblage de blocs et de valeurs déjà prêtes, pas un endroit où tu bricoles des calculs.

### 6. Performance & Qualité

- Évite les `console.log` permanents, utilise un logger conditionnel si besoin.
- Débounce les handlers sur l’input texte si tu déclenches des updates fréquents.
- Pas de logique complexe dans les setters DOM ; place ça dans des méthodes dédiées.
- Garde les méthodes de la sheet **courtes et ciblées** (single responsibility).

### ⚠️ Remarque

Si ton code de sheet ne respecte pas ces règles, tu auras des templates ingérables, des bugs de synchro de données et des modules impossibles à étendre. Corrige maintenant, pas dans deux versions.

### 6.1 Accessibilité & UX minimale

Même pour un système orienté power-users, tu dois respecter un minimum d’accessibilité et d’ergonomie :

- Donne **un `<label>` explicite à chaque champ** de formulaire ; pas de champ anonyme ou uniquement identifié par une icône.
- Évite les boutons **« icône seule »** pour les actions importantes (suppression, validation, jet critique, etc.) : ajoute au moins un texte, ou un `title` clair (`title="Supprimer le talent"`, par exemple).
- Regroupe les actions critiques (supprimer, réinitialiser, etc.) dans des zones prévisibles (footer, menus contextuels), pas au milieu du bruit visuel.
- Garde les **raccourcis clavier globaux** (raccourcis de système, macros, etc.) hors des sheets individuelles : la feuille doit rester cohérente avec le reste de l’UI, pas redéfinir des comportements clavier à la volée.

Si tu ne fais pas ça, tu rends les feuilles pénibles à utiliser, impossibles à « deviner » pour un nouvel utilisateur, et plus difficiles à automatiser côté copilot.

---

### 7. Quels hooks et points d’extension utiliser pour enrichir les feuilles existantes ?

Il y a deux niveaux d’extension :

1. **Par héritage** : créer une nouvelle classe qui étend une feuille existante.
2. **Par hooks Foundry** : brancher du comportement sans toucher à la classe.

#### 7.1. Extension par héritage

Pour des variations de feuille internes au système :

- Étends la feuille de base (`SwerpgBaseActorSheet`, `SwerpgBaseItemSheet`)
  ou une feuille existante (`HeroSheet`, `WeaponSheet`, etc.).
- Surcharge principalement :
  - `_prepareContext()` ou `_preparePartContext` pour enrichir le contexte ;
  - `activateListeners(html)` pour brancher les handlers DOM ;
  - d’éventuelles méthodes utilitaires fournies par les classes de base
    (ex. `_prepareAttributes`, `_registerRollHandlers`, etc. si définies).

Exemple :

```js
export class EliteAdversarySheet extends AdversarySheet {
  protected async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const doc = this.document;
    context.document = doc;
    context.system = doc.system;
    context.config = game.system.config;
    context.isOwner = doc.isOwner;

    // Exemples de dérivés précalculés
    context.skills = this._prepareSkills(doc.system);
    context.hasForceRating = doc.system.force?.rating > 0;

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action=elite-roll]").on("click", this._onEliteRoll.bind(this));
  }

  async _onEliteRoll(event) {
    event.preventDefault();
    // ... logique de jet spécifique
  }
}
```

#### 7.2. Extension via hooks Foundry

Pour des modules externes ou des patchs légers, privilégie les **hooks** :

- `Hooks.on("render<NomDeLaClasseDeFeuille>", (app, html, data) => { ... })`
  pour modifier le DOM ou injecter des widgets après rendu.

Exemple :

```js
// Ajout d'un bouton personnalisé sur toutes les feuilles de talents
Hooks.on('renderTalentSheet', (app, html, data) => {
  const footer = html.find('.sheet-footer')
  if (!footer.length) return

  const button = $(
    `<button type="button" data-action="export-talent">
       <i class="fas fa-file-export"></i> Exporter
     </button>`,
  )
  footer.append(button)

  button.on('click', (event) => app.exportTalent?.(event))
})
```

Autres hooks utiles côté UI :

- `renderSwerpgBaseActorSheet`
- `renderSwerpgBaseItemSheet`
- `close<NomDeLaFeuille>` pour nettoyer des listeners ou overlays.

Bonnes pratiques :

- Ne jamais supposer un sélecteur CSS sans vérifier sa présence (`html.find(...).length`).
- Évite d’écraser les handlers existants ; ajoute plutôt des listeners complémentaires.
- Pour un **copilot**, préfère toujours les hooks `render*` pour les modules externes,
  et l’héritage uniquement dans le cœur du système.

---

En résumé :

- **Base classes** → `SwerpgBaseActorSheet` et `SwerpgBaseItemSheet`.
- **Options UI** → dans `static get defaultOptions()`.
- **Données ↔ Handlebars** → via `_prepareContext()` ou `_preparePartContext` et le `TypeDataModel`.
- **Extensions** → soit par héritage de feuille, soit via les hooks `render*` de Foundry.

Ce document sert de contrat : toute nouvelle feuille ou extension UI dans swerpg devrait respecter ces patterns.

---

### 8. Checklist finale « nouvelle sheet »

Avant d'ouvrir une PR, vérifie que ta nouvelle feuille respecte cette checklist :

- [ ] Choisir la base : `SwerpgBaseActorSheet` / `SwerpgBaseItemSheet`.
- [ ] Créer le fichier `module/applications/sheets/<name>-sheet.mjs`.
- [ ] Définir `defaultOptions(id, classes, template, tabs)`.
- [ ] Implémenter `_prepareContext()`.
- [ ] Implémenter `activateListeners(html)`.
- [ ] Appeler `this.document.update()` pour les changements persistants.
- [ ] Pas de logique métier dans les fichiers `.hbs`.
- [ ] Respecter la convention de classes CSS : `["swerpg", "sheet", "actor"|"item", "<type>"]`.
- [ ] Suivre la structure HTML standard (.sheet-header, .sheet-tabs, .sheet-body, .sheet-footer).

---

## 9. Conventions CSS & structure HTML de base

Pour garder une UI cohérente et stylable, toutes les sheets swerpg respectent une structure HTML et des classes CSS communes.

### 9.1 Classes CSS de base

Chaque feuille doit au minimum inclure :

- `swerpg` : namespace global du système ;
- `sheet` : indique qu’il s’agit d’une feuille ;
- `actor` ou `item` : type de document ;
- une classe spécifique (ex. `character`, `talent`, `weapon`).

Exemples :

```js
options.classes = ['swerpg', 'sheet', 'actor', 'character']
options.classes = ['swerpg', 'sheet', 'item', 'talent']
```

### 9.2 Structure HTML recommandée

Les templates suivent une structure commune :

```hbs
<div class='swerpg sheet actor character'>
  <header class='sheet-header'>
    <!-- Nom, image, résumé -->
  </header>

  <nav class='sheet-tabs' data-group='primary'>
    <!-- Onglets -->
  </nav>

  <section class='sheet-body'>
    <!-- Contenu tabulé -->
  </section>

  <footer class='sheet-footer'>
    <!-- Boutons d'action, infos secondaires -->
  </footer>
</div>
```

Cette convention permet :

- d’appliquer des styles globaux (`.swerpg.sheet`).
- de cibler facilement certains types de feuilles (`.sheet.actor.character`).
- aux modules externes et aux hooks `render*` de trouver des zones stables (`.sheet-header`, `.sheet-footer`, etc.).

### 9.3 Contrat de stabilité pour les modules externes

Dans la mesure du possible, les classes CSS suivantes et la structure HTML de base sont considérées comme **stables** pour les modules externes :

- `.swerpg.sheet`
- `.sheet-header`
- `.sheet-tabs`
- `.sheet-body`
- `.sheet-footer`

Les modules sont encouragés à s’appuyer sur ces classes pour injecter du contenu (via les hooks `render*`) ou ajuster le style.  
Si tu dois modifier ces blocs de manière **incompatible** (changement de nom de classe, suppression d’un conteneur, restructuration majeure), documente-le clairement :

- dans le **changelog** du système ;
- dans la **doc d’intégration** (section modules / hooks).

À partir de là, ce n’est plus un “hasard d’implémentation”, c’est un **contrat** que le système expose aux intégrations externes.
