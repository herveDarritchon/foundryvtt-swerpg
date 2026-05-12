# Plan : Enrichissement du header de la sidebar (Character Sheet)

## Objectif

Déplacer le nom du personnage du header droit de la character sheet vers le
haut de la sidebar (au-dessus de l'avatar), et ajouter un overlay translucide
en bas de l'avatar affichant les ressources Wounds et Strain en lecture seule
(valeur actuelle / seuil).

## État actuel

1. Le nom modifiable est dans
   `templates/sheets/actor/character-header.hbs:3` : un `<input>` avec `name="name"`.
2. L'avatar de sidebar est un simple `<img class="profile">` dans
   `templates/sheets/actor/sidebar.hbs:2`.
3. La sidebar est un PART commun partagé entre `character` et `adversary`
   (déclaré dans `base-actor-sheet.mjs:62-66`).
4. Les données `resources.wounds` et `resources.strain` existent déjà sur le
   document actor ; pas de changement de modèle nécessaire.

## Modifications

### 1. Contexte : `module/applications/sheets/character-sheet.mjs`

Dans `_prepareContext()`, ajouter un bloc `sidebarHeader` :

```js
const r = a.system.resources
context.sidebarHeader = {
  name: a.name,
  img: a.img,
  wounds: { value: r.wounds.value, threshold: r.wounds.threshold },
  strain: { value: r.strain.value, threshold: r.strain.threshold },
}
```

Le template pourra consommer `sidebarHeader.name`, `sidebarHeader.img`, etc.
Condition : ne rien exposer pour `adversary` (pas d'impact).

### 2. Template sidebar : `templates/sheets/actor/sidebar.hbs`

Remplacer :

```hbs
<img class="profile" src="{{source.img}}" ... />
```

par un bloc structuré **uniquement si** `sidebarHeader` existe :

```hbs
{{#if sidebarHeader}}
<div class="sidebar-header">
  <input class="sidebar-name" name="name" type="text" value="{{sidebarHeader.name}}" placeholder="…">

  <div class="sidebar-profile-wrapper">
    <img class="profile" src="{{sidebarHeader.img}}" alt="{{sidebarHeader.name}}"
         width="200" height="200" data-action="editImage" data-edit="img">

    <div class="sidebar-profile-overlay">
      <div class="sidebar-resource wounds">
        <span class="label">{{localize "RESOURCES.WOUNDS"}}</span>
        <span class="value">{{sidebarHeader.wounds.value}}/{{sidebarHeader.wounds.threshold}}</span>
      </div>
      <div class="sidebar-resource strain">
        <span class="label">{{localize "RESOURCES.STRAIN"}}</span>
        <span class="value">{{sidebarHeader.strain.value}}/{{sidebarHeader.strain.threshold}}</span>
      </div>
    </div>
  </div>
</div>
{{else}}
<img class="profile" src="{{source.img}}" alt="{{source.name}}"
     width="200" height="200" data-action="editImage" data-edit="img" />
{{/if}}
```

Le `else` préserve le comportement actuel pour `adversary` et tout autre type.

### 3. Header droit : `templates/sheets/actor/character-header.hbs`

Retirer :

```hbs
<input class="charname" name="name" type="text" value="{{source.name}}" placeholder="Actor Name">
```

et ajuster le layout du `.title` pour occuper l'espace libéré.

### 4. Styles : `styles/actor.less`

Ajouter dans la section `.sheet-sidebar` :

```less
.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .sidebar-name {
    width: 100%;
    border: none;
    border-bottom: 1px solid var(--color-frame);
    background: transparent;
    font-family: var(--font-h1);
    font-size: var(--font-size-18);
    text-align: center;

    &:focus {
      border-bottom-color: var(--color-accent);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
  }

  .sidebar-profile-wrapper {
    position: relative;
    width: 100%;

    img.profile {
      display: block;
      width: 100%;
      border: none;
      border-radius: 4px;
      background: var(--color-frame-bg-50);
      object-fit: contain;
    }

    .sidebar-profile-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 20%; /* ~ un cinquième de l'avatar */
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 0.5rem;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(2px);
      border-radius: 0 0 4px 4px;
      gap: 0.75rem;

      .sidebar-resource {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1.2;

        .label {
          font-size: var(--font-size-9);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }

        .value {
          font-family: var(--font-h1);
          font-size: var(--font-size-12);
          white-space: nowrap;
        }

        &.wounds .label { color: #ff4444; }
        &.wounds .value { color: #ff6666; }
        &.strain .label { color: #44cc44; }
        &.strain .value { color: #66ee66; }
      }
    }
  }
}
```

### 5. i18n

Pas de nouvelles clés : on réutilise `RESOURCES.WOUNDS` et `RESOURCES.STRAIN` déjà
présentes dans `lang/en.json` et `lang/fr.json`.

### 6. Tests

- Ajouter un test de contexte dans `CharacterSheet._prepareContext()` pour
  vérifier la présence de `sidebarHeader` avec ses sous-champs.
- Ajouter un test de non-régression : le flag n'apparaît pas pour un mock actor
  non-character.
- Les tests responsive existants (compact mode) ne sont pas impactés.

## Fichiers impactés

| Fichier | Nature |
|---|---|
| `module/applications/sheets/character-sheet.mjs` | + préparation contexte |
| `templates/sheets/actor/sidebar.hbs` | + structure header/overlay |
| `templates/sheets/actor/character-header.hbs` | - champ nom |
| `styles/actor.less` | + styles nouveau bloc |
| `tests/…` (à définir) | + tests contexte |

## Risques et atténuations

- **Sidebar partagée** : le bloc `{{#if sidebarHeader}}` évite toute régression
  sur `adversary`. Vérification manuelle recommandée.
- **Nom modifiable perdu** : le champ `<input name="name">` dans la sidebar
  respecte le form `submitOnChange`, donc la persistance est identique.
- **Superposition overlay / clics** : l'overlay a `pointer-events: none` sur
  les zones non interactives ; l'image conserve `data-action="editImage"`.
- **Hauteur 20%** : à ajuster si le ratio portrait est très vertical. Prévoir
  `max-height: 48px` pour ne pas saturer l'image.
