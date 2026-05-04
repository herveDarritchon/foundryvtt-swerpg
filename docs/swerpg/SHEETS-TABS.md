# Mode opératoire – Onglets de character sheets (Foundry VTT v13, ApplicationV2)

## Objectif

Ce guide explique comment fonctionnent les onglets (tabs) des sheets Foundry **en ApplicationV2**,
avec une lecture "du code" (JS), des templates (HBS/HTML) et des styles (LESS/CSS).

L’objectif est de fournir un **mode opératoire** réutilisable pour implémenter des onglets
sur d’autres systèmes Foundry, en s’appuyant sur les patterns employés dans swerpg.

## Résumé du pattern (ce qu’il faut retenir)

Dans swerpg, les onglets sont principalement gérés par :

- Un **registre de tabs** côté classe (`static TABS`) : quels onglets existent et à quel groupe ils appartiennent.
- Un **état d’onglet actif** côté instance (`tabGroups`) : pour chaque groupe, quel onglet est sélectionné.
- Des **parts ApplicationV2** (`static PARTS`) : chaque onglet correspond souvent à une part rendue.
- Un template d’onglets dont chaque item contient `data-action="tab"`, `data-group` et `data-tab`.
- Des panneaux de contenu qui portent `.tab` + `data-group` + `data-tab` + une classe `.active`.

L’activation se fait via le mécanisme Action/Handlers ApplicationV2 (pas via l’ancien `new Tabs(...)`).

## Glossaire

- **Groupe d’onglets** : identifiant logique (ex. `sheet`, `description`) permettant d’avoir plusieurs barres
  d’onglets indépendantes dans une même application.
- **Tab ID** : identifiant stable de l’onglet (ex. `attributes`, `skills`, `description`, `config`).
- **tabGroups** : objet qui mémorise l’onglet actif par groupe (ex. `{ sheet: 'attributes' }`).
- **tabs** : structure de rendu (par onglet) enrichie avec `active` / `cssClass` etc.

## Implémentation JavaScript (ApplicationV2)

### 1) Déclarer les onglets : `static TABS`

Dans swerpg, les classes de base déclarent la structure des onglets via une constante `TABS`.

- Feuilles d’acteur : `module/applications/sheets/base-actor-sheet.mjs`
  - `static TABS.sheet = [ { id, group, label }, ... ]`
- Feuilles d’item : `module/applications/sheets/base-item.mjs`
  - `static TABS.sheet = [ { id, group, icon, label }, ... ]`
  - peut être enrichi dynamiquement (ex. `includesActions`, `includesHooks`, `advancedDescription`).

Règle de base :

- `id` doit être stable (utilisé dans le DOM, le CSS, les parts, etc.)
- `group` doit correspondre à une clé de `tabGroups`.

### 2) Définir l’onglet actif : `tabGroups`

Toujours côté instance (donc par window ouverte), une propriété `tabGroups` indique la sélection :

- `SwerpgBaseActorSheet` :
  - `tabGroups = { sheet: 'attributes' }`
- `SwerpgBaseItemSheet` :
  - `tabGroups = { sheet: 'description', description: 'public' }`

Le second exemple montre un cas important : **onglets imbriqués**.
Ici, le groupe `sheet` choisit l’onglet `description`, et le groupe `description` choisit
le sous-onglet `public` (uniquement si `advancedDescription` est activé).

### 3) Relier tabs et contexte : `_prepareContext()` + `_getTabs()`

Dans swerpg, `_prepareContext()` expose `tabGroups` et `tabs` au template.

- Acteurs : `SwerpgBaseActorSheet._prepareContext()` appelle `#getTabs()`.
- Items : `SwerpgBaseItemSheet._prepareContext()` appelle `_getTabs()`.

Ces méthodes construisent une structure riche :

- `active` (bool)
- `cssClass` (souvent `'active'` ou `''`)
- et le reste du descripteur (`id`, `group`, `label`, `icon`…)

Exemple de conséquence côté template :

- `{{tabs.skills.cssClass}}` devient `active` quand l’onglet est sélectionné.

### 4) Rendre le contenu par onglet : `static PARTS` + `data-application-part`

Le pattern swerpg associe très souvent **1 onglet = 1 part**.

- `SwerpgBaseActorSheet` définit `static PARTS` pour `attributes`, `skills`, `inventory`, etc.
- Le template `templates/sheets/actor/body.hbs` itère sur `tabs` et insère :

```hbs
<template data-application-part='header'></template>
{{#each tabs as |tab|}}
  <template data-application-part='{{tab.id}}'></template>
{{/each}}
```

Ce point est clé :

- si tu ajoutes un onglet `foo`, tu dois aussi fournir une `PARTS.foo.template`
- sinon la navigation peut s’afficher, mais il n’y aura rien à rendre pour le contenu.

### 5) Comment ApplicationV2 change l’onglet actif ?

L’activation est déclenchée par un clic sur un élément qui porte :

- `data-action="tab"`
- `data-group="<group>"`
- `data-tab="<id>"`

Foundry gère ensuite l’état (mise à jour du groupe sélectionné) et le re-render
ou la mise à jour DOM nécessaire.

Dans swerpg, cet attribut est visible notamment dans :

- `templates/sheets/actor/tabs.hbs`

## Templates Handlebars / HTML

### 1) La barre d’onglets (nav)

Dans swerpg acteur : `templates/sheets/actor/tabs.hbs`

- un conteneur `nav.sheet-tabs.tabs`
- une itération sur `tabs`
- un item par onglet avec `data-action="tab"`

Extrait :

```hbs
<nav class='sheet-tabs tabs' aria-label='{{localize "SHEETS.FormNavLabel"}}'>
  {{#each tabs as |tab|}}
    <a class='{{tab.id}} {{tab.cssClass}}' data-action='tab' data-group='{{tab.group}}' data-tab='{{tab.id}}' data-tooltip='{{tab.label}}'>
      <img class='tab-icon' src='{{tab.icon}}' alt='' />
    </a>
  {{/each}}
</nav>
```

Points importants :

- `data-group` et `data-tab` doivent matcher `group`/`id` de `TABS`.
- `tab.cssClass` pilote la classe `.active`.
- Pour l’accessibilité, préfère `aria-label` sur le `nav`.
  (Dans le code actuel, tu verras parfois `aria-role` : ce n’est pas un attribut ARIA standard.)

### 2) Le panneau de contenu d’un onglet

Un panneau est généralement une section avec :

- la classe `.tab`
- `data-group="..."`
- `data-tab="..."`
- `{{tabs.<id>.cssClass}}` pour activer `.active`

Exemple sur item description : `templates/sheets/partials/item-description.hbs`

```hbs
<section class='tab sheet-body flexcol {{tabs.description.cssClass}}' data-tab='{{tabs.description.id}}' data-group='{{tabs.description.group}}'>
  ...
</section>
```

Même principe côté acteur (ex. `templates/sheets/actor/skills.hbs`) :

- `.tab`
- `data-tab="{{tabs.skills.id}}"`
- `data-group="{{tabs.skills.group}}"`
- `{{tabs.skills.cssClass}}`

### 3) Onglets imbriqués (groupes multiples)

Le cas standard dans swerpg item :

- groupe `sheet` : `description` / `config` / (optionnel) `actions` / `hooks`
- groupe `description` : `public` / `secret` (si `advancedDescription`)

Le mode opératoire est identique :

- un second `nav` avec `data-action="tab"` et `data-group="description"`
- des sections `.tab` dont `data-group="description"`

## CSS / LESS

### 1) Le mécanisme `.active`

Les onglets reposent sur la classe `.active` appliquée :

- sur l’item d’onglet (dans la nav)
- sur le panneau `.tab`

En général, Foundry fournit déjà des règles de base du type :

- `.tab { display: none; }`
- `.tab.active { display: block; }` (ou `flex`)

Ensuite le système peut affiner par onglet (ex. `grid` au lieu de `block`).

### 2) Styliser la nav et l’état actif

Dans swerpg acteur, les onglets sont une barre verticale à icônes.
Les styles se trouvent dans `styles/actor.less` (section "Sheet Tabs").

Points saillants :

- `.sheet-tabs` positionné en absolu (à droite de la fenêtre)
- `.tab-icon` opacity 0.5 par défaut
- `.active` change le fond, la bordure et remet l’icône en opacity 1

### 3) Ajuster le display du contenu actif

Dans `styles/actor.less`, certains onglets choisissent un display spécifique quand actifs.
Exemple :

- `.tab.attributes.active { display: grid; }`

Idée générale :

- Laisser Foundry gérer le masque/affiche
- Surcharger uniquement le display de l’onglet actif quand tu as besoin de grid

### 4) Focus visible (recommandé)

Si tes onglets sont des `<a>`, assure-toi que le focus est visible.
Même si le style global Foundry s’en occupe souvent, le mode opératoire portable est :

- avoir un état `:focus-visible` perceptible sur les items
- éviter que la seule différence actif/inactif soit une variation subtile de couleur

## Design – Onglets verticaux latéraux (look’n feel)

Cette section décrit comment implémenter un **design d’onglets verticaux sur le côté** d’une sheet
(comme dans swerpg), tout en gardant le même moteur de tabs ApplicationV2.

L’idée :

- Les onglets restent une `nav` standard (même contrat `data-action="tab"` / `data-group` / `data-tab`).
- Le **look** (vertical + “en dehors” du cadre) est 100% CSS.
- Le JS ne change quasiment pas : il se contente d’exposer `tabs` (incluant `icon`, `cssClass`, etc.).

### Objectifs UX

- Libérer de l’espace horizontal pour le contenu.
- Permettre une navigation rapide (un onglet = une icône).
- Rendre l’état actif très visible (pas uniquement via une couleur).
- Garder une cible de clic confortable et cohérente.

### A11y – contraintes spécifiques à une nav « icône seule »

Quand les onglets sont uniquement des icônes, la navigation doit rester **nommée** pour les
personnes utilisant un lecteur d’écran ou la commande vocale.

Recommandations :

- Sur chaque item d’onglet, fournir un nom accessible via `aria-label="{{localize tab.label}}"`.
- L’icône (`<img>`) est décorative : `alt=""` + `aria-hidden="true"`.
- Le focus visible (`:focus-visible`) doit être perceptible et distinct de l’état `.active`.

### Implémentation JS (préparer les données affichées)

Le design vertical ne requiert pas de JS dédié : le template et le CSS font le travail.
Il faut surtout exposer correctement :

- `tab.id` : identifiant stable (sert aussi de classe)
- `tab.group` : groupe de tabs
- `tab.label` : clé i18n
- `tab.icon` : URL d’icône
- `tab.cssClass` : `active` ou `''`

Dans swerpg, c’est déjà le cas via `module/applications/sheets/base-actor-sheet.mjs` → `#getTabs()`.
Si tu réimplémentes ailleurs : calcule ces champs dans ton `_prepareContext()`.

### Implémentation HBS / HTML (structure)

Le markup minimal (reprend le pattern swerpg, avec les ajouts a11y) :

```hbs
<nav class='sheet-tabs tabs' aria-label='{{localize "SHEETS.FormNavLabel"}}'>
  {{#each tabs as |tab|}}
    <a
      class='{{tab.id}} {{tab.cssClass}}'
      data-action='tab'
      data-group='{{tab.group}}'
      data-tab='{{tab.id}}'
      data-tooltip='{{tab.label}}'
      aria-label='{{localize tab.label}}'
    >
      <img class='tab-icon' src='{{tab.icon}}' alt='' aria-hidden='true' />
    </a>
  {{/each}}
</nav>
```

Notes :

- `data-tooltip` aide visuellement, mais ne remplace pas `aria-label`.
- Le label i18n doit être compréhensible seul (ex. “Compétences”, pas “Tab 3”).

### Implémentation CSS / LESS (mise en forme verticale)

L’implémentation swerpg se trouve dans `styles/actor.less` (section “Sheet Tabs”).
Le principe :

1. Mettre la nav en **colonne**.
2. La **sortir du cadre** à droite via un `right` négatif.
3. Donner une taille stable au “bouton” et à l’icône via des variables.
4. Styliser `.active` et `:focus-visible`.

Squelette LESS (adaptable) :

```less
.sheet-tabs {
  --tab-size: 32px;
  --icon-size: 28px;

  display: flex;
  flex-direction: column;
  gap: var(--margin-half);

  position: absolute;
  top: 90px;
  right: calc(-1 * (var(--tab-size) + 4px));
  width: calc(var(--tab-size) + 4px);
  padding: 4px 4px 4px 0;

  border: none;
  overflow: hidden;

  > a {
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--tab-size);
    height: calc(var(--tab-size) + 4px);

    padding: 0;
    background: var(--color-frame-bg-75);
    border: 1px solid #000;
    border-left: none;
    border-radius: 0 4px 4px 0;

    .tab-icon {
      width: var(--icon-size);
      height: var(--icon-size);
      opacity: 0.5;
      border: none;
    }

    &.active {
      background: var(--color-frame-bg);
      border-color: var(--color-accent);
      box-shadow: 0 0 4px var(--color-link-text);

      .tab-icon {
        opacity: 1;
      }
    }

    &:focus-visible {
      outline: 2px solid var(--color-warm-1);
      outline-offset: 2px;
    }
  }
}
```

### Points d’intégration / pièges fréquents

- **Overflow** : si un parent a `overflow: hidden`, la nav “hors cadre” peut être coupée.
- **Responsive** : le `right` négatif peut réduire l’accessibilité sur petites tailles.
  Prévoir une réduction des tailles ou un fallback horizontal.
- **Cibles trop petites** : garder une taille stable sur le `<a>`, pas sur l’icône seulement.
- **État actif trop discret** : ne pas coder l’état uniquement via opacity/couleur.
- **Mouvement** : si transitions ajoutées, respecter `prefers-reduced-motion`.

## Mode opératoire – Ajouter un onglet (checklist)

### A) Sur une ActorSheet (pattern swerpg)

1. Ajouter un descripteur dans `static TABS.sheet` : `{ id: 'foo', group: 'sheet', label: '...' }`.
2. Ajouter / déclarer une part `static PARTS.foo = { id: 'foo', template: '...' }`.
3. Créer le template de la part (ex. `templates/sheets/actor/foo.hbs`) avec :
   - `<section class="tab ... {{tabs.foo.cssClass}}" data-group="{{tabs.foo.group}}" data-tab="{{tabs.foo.id}}"> ...`.
4. Vérifier que `body.hbs` rend bien la part via `data-application-part="foo"`.
5. Ajouter le style (optionnel) :
   - `.tab.foo.active { display: ... }` si nécessaire.
6. Vérifier la navigation : clic, re-render, et compatibilité GM/joueurs si pertinent.

### B) Sur une ItemSheet (pattern swerpg)

1. Déterminer si l’onglet est générique (base) ou conditionnel (par type).
2. Si conditionnel : enrichir `static _initializeItemSheetClass()` (ou via une classe dérivée)
   pour pousser l’entrée dans `TABS.sheet`.
3. Déclarer la `PARTS.<id>` correspondante si tu rends le contenu comme une part.
4. Fournir le template partiel pour le contenu.

## Dépannage (symptômes classiques)

- L’onglet apparaît mais le contenu ne change pas :
  - `data-group` ou `data-tab` ne matchent pas `TABS`.
  - le contenu n’a pas `.tab`.
  - la part n’existe pas (`PARTS` manquant) ou n’est pas rendue dans le `body.hbs`.

- Le contenu change mais le style ne suit pas :
  - le template n’utilise pas `{{tabs.<id>.cssClass}}`.
  - le CSS cible `.tab.<id>.active` mais ton markup ne met pas la classe `<id>`.

- Onglets imbriqués instables :
  - `tabGroups` ne contient pas de valeur par défaut pour le groupe secondaire.
  - le groupe secondaire n’est construit que dans certains modes mais le template l’affiche toujours.

## Références (dans ce repo)

- JS (ActorSheet)
  - `module/applications/sheets/base-actor-sheet.mjs`
- JS (ItemSheet)
  - `module/applications/sheets/base-item.mjs`
- Templates acteur
  - `templates/sheets/actor/tabs.hbs`
  - `templates/sheets/actor/body.hbs`
  - `templates/sheets/actor/*.hbs` (contenus d’onglets)
- Templates item
  - `templates/sheets/partials/item-description.hbs`
  - `templates/sheets/partials/<type>-config.hbs`
- Styles
  - `styles/actor.less`
  - `styles/applications.less`
  - `styles/item.less`
