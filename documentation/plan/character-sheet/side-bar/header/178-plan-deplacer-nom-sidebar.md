# Plan d'implémentation — #178 : Déplacer le nom du personnage du header droit vers la sidebar

**Issue
** : [#178 — Déplacer le nom du personnage du header droit vers la sidebar](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/178)  
**Epic
** : [#177 — Epic: Enrichir le header de la sidebar Character Sheet](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/177)  
**ADR(s)** :

- `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md` (UI en ApplicationV2)
- `documentation/architecture/adr/adr-0005-localization-strategy.md` (i18n, pas de nouvelles clés nécessaires)  
  **Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs` (modification)

---

## 1. Objectif

Déplacer le champ modifiable `name` du personnage depuis le header droit de la Character Sheet (
`templates/sheets/actor/character-header.hbs`) vers la sidebar (`templates/sheets/actor/sidebar.hbs`), au-dessus de
l'avatar. Le nom reste éditable et persiste via le mécanisme `submitOnChange` natif d'ApplicationV2. Aucune modification
du modèle de données n'est nécessaire.

Ce ticket #178 est strictement limité au déplacement du nom. Les issues #179 (overlay) et #180 (Wounds/Strain) seront
traitées séparément.

---

## 2. Périmètre

### Inclus dans #178

- Ajout d'un champ `<input name="name">` dans `templates/sheets/actor/sidebar.hbs`, au-dessus de l'image avatar, dans un
  conteneur `.sidebar-header`
- Contribution d'une propriété `context.sidebarHeader` (préparée dans `_prepareContext()` de `CharacterSheet`) contenant
  minimalement `{ name, img }` pour alimenter le template sidebar
- Retrait du `<input class="charname">` existant dans `templates/sheets/actor/character-header.hbs`
- Ajustement CSS du header droit (`.sheet-header`) pour occuper l'espace libéré : retrait des règles `.charname`
  devenues inutiles, rééquilibrage des flex enfants
- Ajout des styles du nouveau bloc `.sidebar-header` dans `styles/actor.less` : nom centré, fond transparent, bordure
  inférieure fine, focus visible
- Protection de la régression Adversary : le nouveau bloc n'apparaît que quand `context.sidebarHeader` est défini, ce
  qui n'est le cas que pour les sheets `character`
- Tests Vitest de contexte : vérifier que `_prepareContext()` dans `CharacterSheet` expose `sidebarHeader.name` et
  `sidebarHeader.img` un document character, et que ces propriétés sont absentes pour un non-character

### Exclu de #178

- Overlay avatar overlay (#179)
- Affichage des ressources Wounds / Strain (#180)
- Création d'un template de sidebar dédié au character
- Changement de modèle de données
- Nouveaux hooks ou actions
- Tests de rendu DOM (tests manuels suffisants)
- Changements dans les fichiers i18n (aucune nouvelle clé nécessaire)

---

## 3. Constat sur l'existant

### Le nom est actuellement dans le header droit

```
templates/sheets/actor/character-header.hbs:3
  <input class="charname" name="name" type="text" value="{{source.name}}" placeholder="Actor Name">
```

Ce champ est éditable, persiste via `submitOnChange: true` (option du formulaire dans `DEFAULT_OPTIONS`), et sa valeur
provient de `{{source.name}}` (`this.document.toObject()`).

### La sidebar est un PART commun partagé

```
base-actor-sheet.mjs:62-66
  static PARTS = {
    sidebar: {
      id: 'sidebar',
      template: 'systems/swerpg/templates/sheets/actor/sidebar.hbs',
    },
    ...
  }
```

Tous les types d'acteurs (`character`, `adversary`, etc.) utilisent la même template `sidebar.hbs`. Actuellement, le
seul contenu de la sidebar est :

1. Une image avatar (`<img class="profile">`)
2. La section équipement favori
3. La section actions favorites

### Le header droit a un flex layout spécifique pour le nom

```
styles/actor.less:162-227
  .sheet-header {
    header.title {
      .charname { flex: 1 !important; margin-right: 2rem; ... }
      input { height: var(--sheet-header-height); font-size: var(--font-size-24); ... }
      ...
    }
  }
```

Le `.charname` occupe `flex: 1` dans le `header.title`, ce qui pousse les éléments suivants (audit log, XP) vers la
droite.

### Aucune donnée `sidebarHeader` n'existe dans le contexte

Le contexte actuel de `CharacterSheet._prepareContext()` (fichier `character-sheet.mjs:106-159`) expose `source`,
`actor`, `system`, etc. mais pas de bloc dédié à la sidebar. L'image avatar utilise `{{source.img}}` et
`{{source.name}}`.

### Tests existants

Les tests de contexte `character-sheet-skills.test.mjs` testent déjà `_prepareContext()` via `getContext(actor)` (ligne
263-270). Ils mockent un actor character et peuvent être étendus pour valider la présence de `sidebarHeader`.

---

## 4. Décisions d'architecture

### 4.1. Enrichissement du contexte vs nouveau PART

**Question** : Faut-il créer un `PART sidebar-header` séparé ou enrichir le contexte du `PART sidebar` existant ?

**Décision** : Enrichir le contexte existant.

Justification :

- Le nom et l'avatar sont structurellement liés (le nom est juste au-dessus de l'image) ; les séparer en deux templates
  ajouterait de la complexité sans bénéfice
- Le `PART sidebar` actuel a le bon cycle de rendu pour cet affichage permanent
- La template `sidebar.hbs` reste simple avec un bloc conditionnel

### 4.2. Propriété dédiée `sidebarHeader` vs réutilisation de `source`

**Question** : Faut-il enrichir `context.source` avec les nouvelles données ou créer une propriété dédiée
`context.sidebarHeader` ?

**Décision** : Créer `context.sidebarHeader`.

Justification :

- `context.source` est un `toObject()` complet du document, ce qui est plus lourd que nécessaire
- `sidebarHeader` est sémantiquement clair : "données préparées pour le header de la sidebar"
- Permet d'ajouter ultérieurement `wounds`/`strain` (issue #180) sans toucher à `source`
- Limite le couplage entre le template et le data model

### 4.3. Condition `{{#if sidebarHeader}}` vs template de sidebar séparé

**Question** : Comment protéger les autres types d'acteurs (adversary, etc.) de ce nouveau bloc ?

**Décision** : Utiliser `{{#if sidebarHeader}}` dans la template partagée.

Justification :

- Un template de sidebar séparé dupliquerait tout le contenu (équipement, actions) pour un seul champ de différence
- Le bloc conditionnel est localisé et facile à maintenir
- Seul `CharacterSheet` définit `sidebarHeader` ; les autres sheets ne voient aucun changement
- Pattern déjà utilisé par d'autres conditions dans la template (ex: `{{#if compactMode}}`)

### 4.4. Valeur du champ nom dans la sidebar

**Question** : Faut-il lier `sidebarHeader.name` à `a.name` (instance) ou `source.name` (objet source) ?

**Décision** : Utiliser `source.name` pour rester cohérent avec le comportement actuel du header (`{{source.name}}`).

Justification :

- `{{source.name}}` est la valeur figée au moment du rendu, ce qui est attendu pour un formulaire
- `a.name` pourrait retourner une valeur différente si l'actor a été modifié entre le rendu et la soumission
- Cohérence avec les autres templates sheet qui utilisent `{{source.name}}` pour les `<input>`

### 4.5. Stockage de `sidebarHeader` dans le contexte

**Décision** : La propriété est préparée dans `CharacterSheet._prepareContext()` et non dans
`SwerpgBaseActorSheet._prepareContext()`.

Justification :

- Seule la Character Sheet a besoin de ce header enrichi pour l'instant
- Laisser la base inchangée respecte le principe de responsabilité unique
- Si une autre sheet (hero, etc.) devait un jour l'utiliser, on pourrait la remonter

### 4.6. Tests

**Décision** : Ajouter des tests unitaires de contexte dans un nouveau fichier dédié ou étendre le fichier existant
`character-sheet-skills.test.mjs`, sans tests de rendu DOM.

Justification :

- Le risque de #178 est principalement dans la préparation des données et le conditionnel HBS
- Les tests de rendu nécessiteraient un environnement DOM (ApplicationV2) non disponible en tests unitaires
- Le pattern existant `getContext(actor)` est réutilisable directement

---

## 5. Plan de travail détaillé

### Étape 1 : Préparer `context.sidebarHeader` dans `CharacterSheet._prepareContext()`

**Fichier** : `module/applications/sheets/character-sheet.mjs`

Dans `_prepareContext()`, ajouter après l'enrichissement existant (après `context.defenses = ...`) :

```
context.sidebarHeader = {
  name: s.name,
  img: s.img,
}
```

`a` est l'instance actor, `s` est `source` (déjà présent dans le contexte). On utilise `s.name` car c'est la valeur
figée au rendu.

**Risque** : Aucun, car `s` existe toujours après `const { actor: a, source: s, incomplete: i } = context`.

### Étape 2 : Ajouter le bloc `.sidebar-header` dans `sidebar.hbs`

**Fichier** : `templates/sheets/actor/sidebar.hbs`

Remplacer le `<img class="profile">` existant (ligne 2) par un bloc conditionnel :

```hbs
{{#if sidebarHeader}}
<div class="sidebar-header">
  <input class="sidebar-name" name="name" type="text" value="{{sidebarHeader.name}}" placeholder="Actor Name">
  <div class="sidebar-profile-wrapper">
    <img class="profile" src="{{sidebarHeader.img}}" alt="{{sidebarHeader.name}}"
         width="200" height="200" data-action="editImage" data-edit="img">
  </div>
</div>
{{else}}
<img class="profile" src="{{source.img}}" alt="{{source.name}}"
     width="200" height="200" data-action="editImage" data-edit="img" />
{{/if}}
```

**Risque** : L'action `data-action="editImage"` et `data-edit="img"` doivent être préservées sur l'image du bloc
character. C'est le cas ci-dessus.

### Étape 3 : Retirer le champ nom du `character-header.hbs`

**Fichier** : `templates/sheets/actor/character-header.hbs`

Supprimer la ligne :

```hbs
<input class="charname" name="name" type="text" value="{{source.name}}" placeholder="Actor Name">
```

Les autres éléments du header (audit log, XP, bouton creation) ne sont pas modifiés.

**Risque** : Le retrait du champ `flex: 1` peut déstabiliser le layout du `.title`. Mitigation : étape 4.

### Étape 4 : Ajuster les styles CSS

#### 4a. Nouveaux styles sidebar header

**Fichier** : `styles/actor.less`

Ajouter dans la section `.sheet-sidebar` (après `img.profile`) un bloc `.sidebar-header` :

```
.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .sidebar-name {
    width: 100%;
    height: 32px;
    border: none;
    border-bottom: 1px solid var(--color-frame);
    background: transparent;
    font-family: var(--font-h1);
    font-size: var(--font-size-16);
    text-align: center;
    color: var(--color-text-light-highlight);

    &:focus {
      border-bottom-color: var(--color-accent);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      outline: none;
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
  }
}
```

#### 4b. Ajustement du header droit

**Fichier** : `styles/actor.less`

Dans `.sheet-header header.title` :

- Retirer la règle `.charname` (flex 1, margin-right, padding, text-align)
- Les règles `input { ... }` (height, font-size) restent car d'autres inputs pourraient exister dans le titre
- Vérifier que le retrait de `flex: 1` ne casse pas le positionnement du bouton audit-log et de l'XP

**Risque** : Le header `.title` peut rétrécir après retrait du champ nom. Les éléments restants (audit-log, XP) sont en
`flex: none` et devraient rester alignés à droite. À valider manuellement.

### Étape 5 : Tests

#### 5a. Test de contexte character

**Fichier** : à créer ou étendre (proposition : `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`)

Test unitaire :

1. Construire un mock actor character avec `name: 'Test Character'` et `img: 'test-avatar.png'`
2. Appeler `CharacterSheet._prepareContext()` (via `getContext()` existant)
3. Vérifier `context.sidebarHeader.name === 'Test Character'`
4. Vérifier `context.sidebarHeader.img === 'test-avatar.png'`

#### 5b. Test d'absence pour non-character (adversary)

Vérifier que `SwerpgBaseActorSheet._prepareContext()` (base, pas CharacterSheet) ne produit pas `sidebarHeader`.

#### 5c. Validation manuelle

- Ouvrir une Character Sheet → le nom doit apparaître dans la sidebar, centré au-dessus de l'avatar
- Modifier le nom → la modification persiste au blur (submitOnChange)
- Le header droit ne doit plus afficher le nom mais conserver audit-log, XP, bouton creation
- Ouvrir une Adversary Sheet → pas de régression, la sidebar reste inchangée

---

## 6. Fichiers modifiés

| Fichier                                                             | Action       | Description                                                                                                          |
|---------------------------------------------------------------------|--------------|----------------------------------------------------------------------------------------------------------------------|
| `module/applications/sheets/character-sheet.mjs`                    | Modification | Ajout de `context.sidebarHeader = { name, img }` dans `_prepareContext()`                                            |
| `templates/sheets/actor/sidebar.hbs`                                | Modification | Ajout du bloc conditionnel `.sidebar-header` avec input name ; fallback pour les non-character                       |
| `templates/sheets/actor/character-header.hbs`                       | Modification | Retrait du `<input class="charname">`                                                                                |
| `styles/actor.less`                                                 | Modification | Ajout des styles `.sidebar-header`, `.sidebar-name`, `.sidebar-profile-wrapper` ; retrait/adjustement de `.charname` |
| `tests/applications/sheets/character-sheet-sidebar-header.test.mjs` | Création     | Tests de contexte pour `sidebarHeader`                                                                               |

---

## 7. Risques

| Risque                                                                                              | Impact | Mitigation                                                                                                                                         |
|-----------------------------------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| **Régression Adversary** : l'ajout dans `sidebar.hbs` impacte les adversary sheets                  | Moyen  | Bloc `{{#if sidebarHeader}}` ; tester qu'AdversarySheet ne définit pas `sidebarHeader`                                                             |
| **Perte de persistance du nom** : l'input dans la sidebar ne persiste pas                           | Élevé  | Le binding `name="name"` est identique à celui du header ; `submitOnChange` est défini dans `DEFAULT_OPTIONS` de `base-actor-sheet.mjs` (ligne 39) |
| **Layout header droit cassé** : le retrait du champ `flex: 1` désaligne les éléments restants       | Faible | Les autres enfants (audit-log, XP) sont en `flex: none` et `flex: 0 0 var(--sheet-header-height)` ; vérification manuelle après changement CSS     |
| **Édition d'image perdue** : `data-action="editImage"` absent dans le nouveau bloc                  | Faible | Vérifier la présence de l'attribut sur l'`<img>` dans le bloc character                                                                            |
| **Tests existants cassés** : les tests `_prepareContext()` s'attendent à des propriétés spécifiques | Faible | Les tests existants lisent `context.skills` et `context.source` ; `sidebarHeader` est une propriété additionnelle, pas un remplacement             |

---

## 8. Proposition d'ordre de commit

1. **`feat(sidebar-header): add sidebarHeader context data to CharacterSheet._prepareContext()`**
    - `module/applications/sheets/character-sheet.mjs`
    - Ajoute `context.sidebarHeader = { name, img }`

2. **`feat(sidebar-header): add character name input to sidebar template`**
    - `templates/sheets/actor/sidebar.hbs`
    - Bloc conditionnel `.sidebar-header` avec l'input nom et l'avatar

3. **`feat(sidebar-header): remove character name input from right header`**
    - `templates/sheets/actor/character-header.hbs`
    - Retrait du `<input class="charname">`

4. **`style(sidebar-header): add sidebar header styles and adjust right header`**
    - `styles/actor.less`
    - Nouveaux styles `.sidebar-header`, `.sidebar-name`, `.sidebar-profile-wrapper`
    - Nettoyage des règles `.charname` devenues inutiles

5. **`test(sidebar-header): add context tests for sidebarHeader presence and shape`**
    - `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`
    - Test character → `sidebarHeader` présent
    - Test non-character → `sidebarHeader` absent

---

## 9. Dépendances avec les autres US

| Issue                 | Dépendance       | Raison                                                           |
|-----------------------|------------------|------------------------------------------------------------------|
| #179 — Overlay avatar | #178 (précédent) | L'overlay s'insère dans `.sidebar-profile-wrapper` créé par #178 |
| #180 — Wounds/Strain  | #179 (précédent) | Les valeurs s'affichent dans l'overlay créé par #179             |

**Ordre conseillé** : #178 → #179 → #180.

Les trois tickets peuvent toutefois être préparés en parallèle au niveau contexte (`sidebarHeader` peut contenir les
clés vides pour #179/#180 sans les rendre visibles).
