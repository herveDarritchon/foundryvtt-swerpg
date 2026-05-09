# Rapport : XP Transaction Console — Feature inachevée

## Constat

L'onglet **Skills** de la feuille de personnage affiche un bandeau « XP Transaction Console » qui reste **totalement statique**. Il indique toujours « Awaiting selection » et « Select a skill to preview purchase cost. », sans jamais réagir au survol ou au clic sur une compétence.

## C'est quoi cette feature ?

D'après le plan détaillé dans `documentation/plan/feature-refactor-skill-tabs.md`, il s'agit d'une **console d'achat de rangs de compétences** via l'XP du personnage. L'objectif fonctionnel est de permettre au joueur de :

- Voir d'un coup d'œil l'XP disponible, dépensé, et les rangs gratuits restants (carrière/spécialisation)
- **Survoler** une compétence pour prévisualiser le coût et le résultat de l'achat
- **Cliquer** sur les pips pour acheter le rang suivant, avec validation (XP suffisant, pas de dépassement du rang max)
- Voir le pool de dés mis à jour après l'achat

## Ce qui est implémenté (le squelette)

### Template (`templates/sheets/actor/skills.hbs`)
- Structure HTML complète de la console : header, stats (Available, Spent, Career Free, Specialty Free, Selected Cost), zone de sélection
- Données statiques affichées : `progression.experience.available`, `progression.experience.total`, `progression.freeSkillRanks.career.available`, `progression.freeSkillRanks.specialization.available`
- Section entourée d'un `{{#if incomplete.skills}}` qui est **toujours true** (hardcodé dans `character-sheet.mjs:130`)

### CSS (`styles/actor.less:1854-1936`)
- Styles complets pour `.xp-console` et ses sous-éléments
- Classes d'état définies : `is-free`, `is-affordable`, `is-locked`, `is-error`

### Data enrichment (`character-sheet.mjs:#prepareSkills`)
- Chaque compétence reçoit : `nextRank`, `nextCost`, `canPurchase`, `isFreePurchase`, `purchaseReason`, `dicePreview`
- Groupement par `skill.type.id` (valeurs : `exp`, `kno`, `soc`)
- Données exposées dans les `data-*` attributes du partial `character-skill.hbs`

## Ce qui manque (le moteur)

### 1. Aucun handler JavaScript pour le survol
- `character-skill.hbs:1` : l'attribut `data-action` est **déclaré deux fois** :
  ```html
  data-action="skillHover" data-action="skillLeave"
  ```
  En HTML, seule la dernière valeur (`skillLeave`) est prise en compte.
- La méthode `_onClickAction` dans `character-sheet.mjs:191-221` ne contient **aucun case** pour `skillHover` ou `skillLeave`.
- Aucun écouteur d'événement `mouseenter`/`mouseleave` n'est branché nulle part.

### 2. Console toujours en état "idle"
- Le `data-xp-console-status` est figé à « Awaiting selection »
- Le `data-selected-skill-cost` est toujours « — »
- Le `data-selected-skill-summary` montre toujours « Select a skill to preview purchase cost. »
- Les classes CSS `is-idle`, `is-affordable`, `is-free`, `is-locked`, `is-error` ne sont **jamais appliquées dynamiquement**

### 3. Pas d'internationalisation
- Tous les libellés de la console sont en anglais **hardcodés** (pas de `{{localize}}`)
- Aucune clé i18n correspondante dans `lang/en.json` ou `lang/fr.json`

### 4. Bug potentiel : nom des catégories
- Le template `skills.hbs` référence `skills.general`, `skills.combat`, `skills.knowledge`
- `#prepareSkills()` groupe par `skill.type.id` qui donne `exp`, `kno`, `soc`
- Les skills risquent de **ne pas s'afficher** car les clés ne correspondent pas

### 5. `incomplete.skills` toujours true
- Ligne 130 de `character-sheet.mjs` : `skills: true` en dur
- Le plan lui-même (`chantier-5.md:25`) note que cette condition est à revoir

## Documentation de référence

- Plan global : `documentation/plan/feature-refactor-skill-tabs.md` (1024 lignes)
- Chantier 5 (console HTML/CSS) : `documentation/plan/feature-refactor-skill-tabs-chantier-5.md`
- Chantier 6 (interaction utilisateur) : `documentation/plan/feature-refactor-skill-tabs-chantier-6.md` — décrit exactement ce qui manque : `mouseenter`/`mouseleave`, mise à jour de la console, validation d'achat, notifications

## Conclusion

La **XP Transaction Console** est un squelette HTML/CSS complet mais **totalement passif**. Toute l'interactivité (survol → preview, clic → achat avec validation, mise à jour dynamique des stats, basculement des classes d'état CSS) n'a jamais été câblée. La feature était prévue dans le plan de refonte mais seul le Chantier 5 (structure) a été partiellement livré ; le Chantier 6 (interaction) n'a pas été implémenté.
