# Synthèse – Règles UI swerpg (Sheets)

## 1. Classes & enregistrement

- Les feuilles d’acteur **doivent** étendre `SwerpgBaseActorSheet`.
- Les feuilles d’item **doivent** étendre `SwerpgBaseItemSheet`.
- Les classes de feuilles **doivent** être en PascalCase et se terminer par `Sheet`.
- Le fichier d’une feuille **doit** être en kebab-case avec suffixe `-sheet.mjs` dans `module/applications/sheets/`.
- Il ne doit y avoir **qu’une classe principale par fichier**.
- Toute nouvelle sheet **doit** être enregistrée via `Actors.registerSheet` ou `Items.registerSheet` dans le bootstrap (hook `init`).
- L’ID système `"swerpg"` ne doit **pas** être modifié.
- `makeDefault: true` ne doit être utilisé que pour la variante **principale** d’un type.
- Les clés de sheet exposées aux modules externes (ex. `swerpg.CharacterSheet`, `renderCharacterSheet`) doivent être considérées comme **stables**.

---

## 2. `defaultOptions` (ApplicationV2)

- `static get defaultOptions()` **doit** toujours partir de `super.defaultOptions`.
- `defaultOptions` **doit** contenir uniquement des options d’interface (id, classes, dimensions, template, tabs, etc.).
- Il ne doit y avoir **aucune logique métier** dans `defaultOptions`.

---

## 3. Données & contexte de rendu

- `getData()` ne doit **pas** être surchargé (on est en ApplicationV2).
- La préparation des données **doit** passer par :
  - `_prepareContext(options)` pour le contexte global.
  - `_preparePartContext(partId, context, options)` pour les UI multi-parts.

- `system.*` doit **respecter** la structure définie dans `DATA_MODELS.md`.
- Le contexte **doit** exposer explicitement au minimum : `document`, `system`, `config`, `isOwner`.
- Toute logique de dérivation/assemblage de données pour le template **doit** être faite dans `_prepareContext` / `_preparePartContext`, pas dans les templates.
- `_onRender` / `_postRender` ne doivent **pas** être utilisés pour fabriquer ou modifier le contexte de données.

---

## 4. Formulaires & persistance

- Les champs de formulaire **doivent** utiliser l’attribut `name` aligné sur le `TypeDataModel` (ex. `name="system.foo.bar"`).
- Les actions ciblées (boutons, toggles, rolls, etc.) **doivent** passer par des éléments avec `data-action` et des handlers dédiés.
- Les handlers qui modifient les données **doivent** appeler `this.document.update(...)`.
- Si la soumission globale de formulaire est surchargée, il faut :
  - la **documenter** clairement dans la classe ;
  - se limiter à récupérer les données (FormData, etc.) puis appeler `this.document.update(...)` ;
  - appeler la super-implémentation si la classe parente en fournit une.

---

## 5. Événements & DOM

- Toute la logique d’interaction **doit** passer par `activateListeners(html)`.
- `activateListeners(html)` **doit** appeler `super.activateListeners(html)` au début.
- Si la feuille n’est pas éditable, les handlers modifiant les données ne doivent **pas** être enregistrés (`if (!this.isEditable) return;`).
- Les handlers **doivent** être organisés par blocs logiques (\_activateXxxListeners) plutôt que tous dans `activateListeners`.
- Il faut privilégier la **délégation d’événements** basée sur `data-action` plutôt que des sélecteurs fragiles.
- Le code de sheet ne doit **pas** utiliser `document.querySelector` ou accéder au DOM global : il doit rester dans `html` / `this.element`.

### Drag & drop / context menu

- Les sources et cibles de drag & drop / context menu **doivent** être marquées via des attributs ou classes explicites (ex. `data-drag-source`, `data-drop-target`, `data-has-context`).
- Les événements `dragstart`, `drop`, `contextmenu` **doivent** être branchés dans `activateListeners(html)` sur ces marqueurs.
- Les effets de ces interactions (mutation de données) **doivent** passer par `this.document.update(...)`.

---

## 6. Mise à jour des données

- Il est **interdit** de muter directement `this.document.system` (ex. `this.document.system.foo = 42`).
- Les mises à jour persistantes **doivent** utiliser `document.update(data, options)`.
- `update()` **doit** être utilisé :
  - après une action utilisateur dans l’UI ;
  - pour toute modification qui doit être persistée, hookée, et broadcast aux autres clients.

- Les mises à jour non persistantes / préparatoires **doivent** utiliser `document.updateSource(data)`.
- `updateSource()` **doit** être utilisé pour :
  - les migrations ;
  - la préparation de sources avant `create()` ;
  - les scripts ou tests qui manipulent des données en mémoire.

- Les mises à jour **doivent** être regroupées dans un seul objet plutôt que multipliées en plusieurs `update()`.
- Pour les valeurs saisies invalides, il faut :
  - les corriger côté JS avant `update()` (clamp, valeur par défaut), **ou**
  - afficher une erreur via `ui.notifications.error(...)` ;
  - ne pas laisser le template ou le DataModel deviner la correction.

---

## 7. Templates & Handlebars

- Les templates `.hbs` ne doivent **pas** contenir de logique métier.
- Les templates ne doivent **pas** contenir de calculs complexes (conditions imbriquées, lookups lourds) qui pourraient être faits dans `_prepareContext` / `_preparePartContext`.
- Les chemins de données utilisés dans les templates doivent **refléter** la structure du `TypeDataModel` (ex. `system.attributes.*`).
- La localisation doit se faire via `{{localize "MY_SYSTEM.Key"}}` côté template, et `game.i18n.localize` côté JS.

### Partials & helpers

- Tout bloc de markup utilisé dans plusieurs templates **doit** être extrait dans un partial (`systems/swerpg/templates/partials/...`).
- Les partials **doivent** avoir des noms explicites et cohérents (ex. `swerpg-actor-header`, `swerpg-item-summary`).
- Toute logique récurrente ou un peu intelligente **doit** aller dans :
  - un helper Handlebars custom, **ou**
  - la préparation du contexte (`_prepareContext` / `_preparePartContext`) ;
  - **jamais** directement dans le `.hbs`.

---

## 8. Performance & qualité

- Il faut éviter les `console.log` permanents ; utiliser un mécanisme de logging conditionnel si nécessaire.
- Les handlers déclenchant des `update()` fréquents (ex. sur input texte) doivent être **debouncés**.
- La logique complexe ne doit **pas** être mise dans les setters/manipulations DOM : elle doit être dans des méthodes dédiées.
- Les méthodes des sheets doivent rester **courtes et ciblées** (single responsibility).

---

## 9. Accessibilité & UX minimale

- Chaque champ de formulaire doit avoir un `<label>` explicite.
- Les boutons « icône seule » ne doivent **pas** être utilisés pour les actions importantes sans texte ou `title` clair.
- Les actions critiques (suppression, reset, etc.) doivent être regroupées dans des zones prévisibles (footer, menus contextuels).
- Les raccourcis clavier globaux doivent être gérés au niveau **système**, pas dans chaque sheet.

---

## 10. Extension & hooks

- Pour les variations internes au système, il faut :
  - étendre une feuille existante ou la base (`SwerpgBaseActorSheet`, `SwerpgBaseItemSheet`) ;
  - surcharger principalement `_prepareContext` / `_preparePartContext` et `activateListeners`.

- Pour les modules externes / patchs légers, il faut **privilégier les hooks** :
  - `render<NomDeLaClasseDeFeuille>` pour modifier le DOM après rendu ;
  - `renderSwerpgBaseActorSheet`, `renderSwerpgBaseItemSheet` ;
  - `close<NomDeLaFeuille>` pour nettoyer.

- Les hooks ne doivent **pas** supposer la présence de sélecteurs CSS sans vérification (`html.find(...).length`).
- Les hooks ne doivent **pas** écraser les handlers existants ; ils doivent ajouter un comportement complémentaire.

---

## 11. Conventions CSS & structure HTML (contrat)

- Les classes CSS de base **doivent** inclure au minimum :
  - `swerpg`
  - `sheet`
  - `actor` ou `item`
  - une classe spécifique (ex. `character`, `talent`, `weapon`)

- La structure HTML recommandée **doit** être respectée :
  - conteneur principal `.swerpg.sheet`
  - `.sheet-header`
  - `.sheet-tabs`
  - `.sheet-body`
  - `.sheet-footer`

- Ces classes/container (`.swerpg.sheet`, `.sheet-header`, `.sheet-tabs`, `.sheet-body`, `.sheet-footer`) sont considérés comme **stables** pour les modules externes.

- Toute modification **incompatible** de ces blocs (renommage, suppression, restructuration majeure) doit être :
  - documentée dans le **changelog** ;
  - documentée dans la **doc d’intégration** (section modules / hooks).

---

## 12. Checklist obligatoire « nouvelle sheet »

Une nouvelle feuille est considérée conforme si et seulement si :

- [ ] Elle étend `SwerpgBaseActorSheet` ou `SwerpgBaseItemSheet`.
- [ ] Sa classe suit la convention `<Name>Sheet`.
- [ ] Son fichier est `module/applications/sheets/<name>-sheet.mjs`.
- [ ] Elle est enregistrée via `Actors.registerSheet` / `Items.registerSheet` (ID système `"swerpg"`).
- [ ] `defaultOptions` part de `super.defaultOptions` et ne contient pas de logique métier.
- [ ] `_prepareContext()` est implémenté et expose au moins `document`, `system`, `config`, `isOwner`.
- [ ] `activateListeners(html)` est implémenté, appelle `super.activateListeners(html)` et délègue à des méthodes `_activate...Listeners`.
- [ ] Les données sont modifiées via `this.document.update()` / `updateSource()`, jamais par mutation directe de `this.document.system`.
- [ ] Les templates `.hbs` ne contiennent pas de logique métier et respectent la structure du `TypeDataModel`.
- [ ] Les classes CSS de base et la structure `.sheet-header`, `.sheet-tabs`, `.sheet-body`, `.sheet-footer` sont respectées.
