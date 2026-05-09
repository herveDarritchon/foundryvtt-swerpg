# Plan d'implémentation — US3 : Prévisualisation d'achat au survol d'une compétence

**Issue** : [#138 — US3: Prévisualisation d'achat au survol d'une compétence](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/138)  
**Epic** : [#144 — EPIC: Console de transaction XP des compétences](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/144)  
**Spécification** : `documentation/spec/character-sheet/spec-console-transaction-xp.md` (§6, §9, §10.1)  
**Dépend de** : US1 (console d'affichage des ressources), US2 (états visuels des lignes)  
**Prérequis pour** : US4 (achat d'un rang), US5 (retrait d'un rang)

---

## 1. Objectif

Rendre la console XP interactive au survol d'une ligne de compétence : le joueur voit immédiatement le coût, le gain de rang, l'impact XP et le pool de dés, sans clic ni modification des données.

Aucune transaction n'est déclenchée dans US3. C'est une couche de prévisualisation purement UI.

il faut donc réutiliser le code existant, sans duplication, mais en respectant les règles de conception et de ségrégation des responsabilités d'un code professionnel.

---

## 2. Périmètre

### Inclus dans US3

- Mise à jour dynamique de la console XP au `mouseenter` / `focusin` d'une ligne `.skill`
- Retour à l'état neutre (idle) au `mouseleave` / `focusout`
- Affichage des 5 états fonctionnels de la spec (§6) :
  - Achat gratuit disponible
  - Achat payant possible
  - XP insuffisants
  - Rang maximum atteint
  - Retrait impossible (état neutre pour le hover de US3, pas de decrease)
- Pool de dés : afficher le pool actuel **et** le pool après achat dans la preview
- Mise à jour de la classe CSS de la console (`.is-free`, `.is-affordable`, `.is-locked`, `.is-error`)
- Tous les textes visibles internationalisés (FR/EN)
- Accessibilité clavier : `focusin` / `focusout` sur les lignes

### Exclu de US3

- Achat effectif d'un rang → US4
- Retrait effectif d'un rang → US5
- Traçabilité des rangs → US6
- Notifications toast → US7
- Pool de dés dans les stats de la console (hors preview) → US8
- Modification des données du personnage (XP, rangs, compteurs)

---

## 3. Constat sur l'existant

### 3.1. Console XP prête mais statique

Le template `templates/sheets/actor/skills.hbs` contient une structure complète avec `data-xp-console-status`, `data-selected-skill-cost`, `data-selected-skill-summary`. Tous les labels sont déjà localisés (US1). Mais la console ne réagit à aucun événement.

### 3.2. Données métier déjà calculées

Dans `CharacterSheet.#prepareSkills()` (`character-sheet.mjs:420-503`), chaque skill reçoit déjà :

```js
{
  nextRank,       // rang cible
  nextCost,       // coût (0, nombre, ou null)
  canPurchase,    // booléen
  isFreePurchase, // booléen
  purchaseReason, // 'FREE_RANK_AVAILABLE' | 'AFFORDABLE' | 'INSUFFICIENT_XP' | 'MAX_RANK'
  dicePreview,    // { ability, proficiency } — pool actuel
  ui: {
    markerState,
    increaseState,
    increaseIcon,
    decreaseState: 'pending',
    lineCssClass,
  },
  freeRank: {
    isCareer,
    isSpecialization,
    name,           // nom de la carrière / spé
  },
}
```

**Ce qui manque pour la preview** :

- Pas de `dicePreviewAfterPurchase` (pool dés après achat du prochain rang)
- Pas de `remainingXpAfterPurchase` dans le contexte
- Pas de méthode centralisée pour produire l'objet de preview de la console
- Pas de méthode pour le cas "idle"
- Pas de mapping `purchaseReason` → message localisé pour le résumé console

### 3.3. Gestionnaires d'événements

- `character-sheet.mjs` a `_onClickAction()` et des actions `static #on*` (ApplicationV2 `actions` dans `DEFAULT_OPTIONS`).
- La base `SwerpgBaseActorSheet._onRender()` ne fait que du DragDrop.
- `SwerpgBaseActorSheet._attachFrameListeners()` attache un `focusin` global sur la frame.
- Aucun listener `mouseenter` / `mouseleave` sur `.skill` n'existe.
- L'attribut `data-action="skillHover"` dans `character-skill.hbs:11` n'est pas supporté par `_onClickAction` et ne peut pas gérer le hover.

### 3.4. CSS de la console

Dans `styles/actor.less:1868-1953`, les classes d'état existent :

```less
.xp-console.is-free       .xp-console__status { color: #00ff99; }
.xp-console.is-affordable .xp-console__status { color: #c9b36a; }
.xp-console.is-locked     .xp-console__status,
.xp-console.is-error      .xp-console__status { color: #c9593f; }
```

Elles ne sont **jamais appliquées dynamiquement**.

---

## 4. Décisions techniques

### 4.1. Mode d'interaction : hover via listeners DOM (pas `data-action`)

**Important** : Les `actions` ApplicationV2 (`data-action` + `DEFAULT_OPTIONS.actions`) ne fonctionnent **que pour les clics**. Pour les interactions de type **hover** (`mouseenter`/`mouseleave`) et **focus clavier** (`focusin`/`focusout`), il faut utiliser des listeners DOM classiques attachés dans `_onRender`.

**Décision finale** : Utiliser des listeners DOM délégués dans `_onRender` avec `data-hover-action` pour router les événements hover et focus.

Pattern à respecter :

1. **Template** : Ajouter `data-hover-action="skillPreview"` et `tabindex="0"` sur les éléments interactifs :
   ```hbs
   <div class="skill" data-skill-id="{{id}}" tabindex="0" data-hover-action="skillPreview">
   ```

2. **JS - `_onRender`** : Attacher 4 listeners (2 pour souris, 2 pour clavier) :
   ```js
   async _onRender(context, options) {
     await super._onRender(context, options)
     this.element.addEventListener('mouseover', this.#onHoverAction)   // délégation souris in
     this.element.addEventListener('mouseout', this.#onHoverOutAction) // délégation souris out
     this.element.addEventListener('focusin', this.#onHoverAction)    // délégation focus in
     this.element.addEventListener('focusout', this.#onHoverOutAction) // délégation focus out
   }
   ```

3. **JS - Handlers délégués** : Utiliser `closest('[data-hover-action]')` pour router :
   ```js
   #onHoverAction = async (event) => {
     const target = event.target.closest('[data-hover-action]')
     if (!target) return
     const action = target.dataset.hoverAction
     switch (action) {
       case 'skillPreview': return this.#handleSkillPreviewEnter(target)
       // ... autres actions hover
     }
   }
   ```

4. **Anti-clignotement** : Quand on quitte un élément, vérifier `event.relatedTarget` pour ne pas reset si on entre dans un autre élément du même type :
   ```js
   #handleSkillPreviewLeave(target, event) {
     const related = event.relatedTarget
     if (related) {
       const enteringSkill = related.closest('[data-hover-action="skillPreview"]')
       if (enteringSkill) return  // on ne reset pas
     }
     this.#resetConsolePreview()
   }
   ```

Justification :

- `mouseover`/`mouseout` et `focusin`/`focusout** bubblent, donc la délégation sur `this.element` fonctionne.
- `mouseenter`/`mouseleave` et `focus`/`blur** NE bubblent PAS, donc ils ne fonctionnent pas avec la délégation.
- Accessibilité clavier : `tabindex="0"` + `focusin`/`focusout` permettent de prévisualiser en naviguant avec Tab.
- Ce pattern est déjà utilisé ailleurs dans la codebase (`character-sheet.mjs` lignes ~670).

### 4.2. Architecture du preview

Créer une méthode publique de classe `CharacterSheet.#buildSkillPreview(context, skillId)` qui :

1. Reçoit le contexte complet
2. Trouve la skill par `skillId` dans `context.skills.[exp|kno|soc]`
3. Calcule le pool après achat via `getPositiveDicePoolPreview({ characteristicValue, skillRank: nextRank })`
4. Calcule les XP restants après achat
5. Assemble un objet de preview avec :

```js
{
  statusKey,          // clé i18n pour le statut
  consoleCssClass,    // 'is-free' | 'is-affordable' | 'is-locked' | 'is-error' | ''
  selectedCost,       // string localisée : '0 XP', '15 XP', '—', 'MAX'
  summaryParts,       // tableau de chaînes à joindre pour le résumé
  dicePreviewAfter,   // { ability, proficiency }
}
```

### 4.3. Résumé console compact

Le résumé (`data-selected-skill-summary`) doit tenir en 1-2 lignes. Format recommandé par état :

| État | Résumé |
|------|--------|
| Gratuit | `{label} : rang {current} → {next} · {source} · 0 XP` |
| Payant | `{label} : {cost} XP · {remaining} XP restants · Pool {currDice} → {nextDice}` |
| Insuffisant | `{label} : {cost} XP requis · {available} XP disponibles · manque {shortfall} XP` |
| Max | `{label} : rang maximum atteint ({max}/5)` |

Ce format est produit en JS sous forme de texte localisé, pas de HTML brut dans le template.

### 4.4. Pool de dés dans la preview

Le template affiche déjà les dés du pool actuel via `.skill__dice-preview`. Pour la preview console, il faut montrer **les deux pools** (actuel → après achat). Format proposé :

```
Pool actuel : 🎲🎲🎲  →  Pool après achat : 🎲🎲🎲🎲
```

(utilisation des icônes SVG existantes ou texte stylé)

### 4.5. État neutre

La remise à zéro de la console doit être une méthode dédiée : `#resetSkillPreview(context)`. Elle réapplique les valeurs idle.

---

## 5. Plan de travail détaillé

### Étape 1 : Ajouter `dicePreviewAfter` au contexte de chaque skill

Fichier : `module/applications/sheets/character-sheet.mjs` — dans `#prepareSkills()`

Après le calcul de `dicePreview` (pool actuel), ajouter le pool prévu après le prochain achat :

```js
const dicePreviewAfter = getPositiveDicePoolPreview({
  characteristicValue,
  skillRank: purchaseState.nextRank,
})
skillEnriched.dicePreviewAfter = dicePreviewAfter
```

Puis inclure dans l'objet retourné :

```js
dicePreview,
dicePreviewAfter,
```

### Étape 2 : Créer le builder de preview console

Fichier : `module/applications/sheets/character-sheet.mjs`

Ajouter une méthode privée statique :

```js
/**
 * Build a console preview object for the given skill.
 * @param {object} skill - Enriched skill data from #prepareSkills
 * @param {object} progression - context.progression
 * @returns {object} Preview data for the console
 */
static #buildSkillPreview(skill, progression) {
  const { nextCost, nextRank, canPurchase, isFreePurchase, purchaseReason, dicePreview, dicePreviewAfter } = skill
  const rank = skill.rank.value
  const available = progression.experience.available

  // ... construire statusKey, consoleCssClass, selectedCost, summaryParts, dicePreviewAfter
}
```

Détail par état :

**FREE_RANK_AVAILABLE :**
```js
statusKey = 'SKILL.XP_CONSOLE.STATUS.FREE_RANK'
selectedCost = '0 XP'
consoleCssClass = 'is-free'
summaryParts = [
  label,
  `rank ${rank} → ${nextRank}`,
  freeRank.name,       // source
  '0 XP',
]
```

**AFFORDABLE :**
```js
statusKey = 'SKILL.XP_CONSOLE.STATUS.AFFORDABLE'
selectedCost = `${nextCost} XP`
consoleCssClass = 'is-affordable'
summaryParts = [
  label,
  `${nextCost} XP`,
  `${available - nextCost} XP remaining`,
  `Pool ${formatDice(dicePreview)} → ${formatDice(dicePreviewAfter)}`,
]
```

**INSUFFICIENT_XP :**
```js
statusKey = 'SKILL.XP_CONSOLE.STATUS.INSUFFICIENT_XP'
selectedCost = `${nextCost} XP`
consoleCssClass = 'is-locked'
summaryParts = [
  label,
  `${nextCost} XP required`,
  `${available} XP available`,
  `shortfall ${nextCost - available} XP`,
]
```

**MAX_RANK :**
```js
statusKey = 'SKILL.XP_CONSOLE.STATUS.MAX_RANK'
selectedCost = '—'
consoleCssClass = 'is-error'
summaryParts = [ label, 'Maximum rank reached (5/5)' ]
```

Ajouter un helper `#formatDicePreview(dice)` pour produire une chaîne lisible :

```js
static #formatDicePreview(dice) {
  const a = dice?.ability ?? 0
  const p = dice?.proficiency ?? 0
  const parts = []
  if (p > 0) parts.push(`${p}P`)
  if (a > 0) parts.push(`${a}A`)
  return parts.join('+') || '0'
}
```

### Étape 3 : Créer la méthode de reset idle

Fichier : `module/applications/sheets/character-sheet.mjs`

```js
static #buildIdlePreview() {
  return {
    statusKey: 'SKILL.XP_CONSOLE.STATUS.IDLE',
    consoleCssClass: '',
    selectedCost: '—',
    summaryKey: 'SKILL.XP_CONSOLE.PLACEHOLDER',
    summaryParts: null,
    dicePreviewAfter: null,
  }
}
```

### Étape 4 : Brancher les listeners hover/focus dans `_onRender`

**Important :** Les `actions` ApplicationV2 (`data-action`) ne fonctionnent **que pour les clics**. Pour le hover et le focus clavier, il faut utiliser des listeners DOM dans `_onRender`.

Fichier : `module/applications/sheets/character-sheet.mjs`

**1. Ajouter les listeners dans `_onRender` :**

```js
async _onRender(context, options) {
  await super._onRender(context, options)

  // Souris : mouseover/mouseout BUBBLENT → délégation possible
  this.element.addEventListener('mouseover', this.#onHoverAction)
  this.element.addEventListener('mouseout', this.#onHoverOutAction)

  // Clavier : focusin/focusout BUBBLENT → délégation possible
  this.element.addEventListener('focusin', this.#onHoverAction)
  this.element.addEventListener('focusout', this.#onHoverOutAction)
}
```

**Note :** Ne pas utiliser `mouseenter`/`mouseleave` ni `focus`/`blur` — ils **ne bubblent pas** et ne fonctionnent pas avec la délégation.

**2. Créer les handlers délégués :**

```js
#onHoverAction = async (event) => {
  const target = event.target.closest('[data-hover-action]')
  if (!target || !this.element.contains(target)) return

  const action = target.dataset.hoverAction

  switch (action) {
    case 'skillPreview':
      return this.#handleSkillPreviewEnter(target)
    // ... autres actions hover
  }
}

#onHoverOutAction = async (event) => {
  const target = event.target.closest('[data-hover-action]')
  if (!target || !this.element.contains(target)) return

  const action = target.dataset.hoverAction

  switch (action) {
    case 'skillPreview':
      return this.#handleSkillPreviewLeave(target, event)
    // ... autres actions hover
  }
}
```

**3. Créer les handlers spécifiques à la preview skill :**

```js
#handleSkillPreviewEnter(target) {
  const skillId = target.dataset.skillId
  if (!skillId) return
  this.#updateConsolePreview(skillId)
}

#handleSkillPreviewLeave(target, event) {
  // Anti-clignotement : ne pas reset si on entre dans une autre skill
  const related = event.relatedTarget
  if (related) {
    const enteringSkill = related.closest('[data-hover-action="skillPreview"]')
    if (enteringSkill) return
  }
  this.#resetConsolePreview()
}
```

**Méthodes de mise à jour UI (déjà existantes) :**

```js
#updateConsolePreview(skillId) {
  const skill = this.#findSkillInContext(skillId)
  if (!skill) return

  const preview = CharacterSheet._buildSkillPreview(skill, this._context.progression)
  this.#applyConsolePreview(preview)
}

#resetConsolePreview() {
  this.#_selectedSkillId = null
  const preview = CharacterSheet._buildIdlePreview()
  this.#applyConsolePreview(preview)
}

#applyConsolePreview(preview) {
  const consoleEl = this.element.querySelector('[data-skill-purchase-console]')
  if (!consoleEl) return

  const statusEl = consoleEl.querySelector('[data-xp-console-status]')
  if (statusEl) statusEl.textContent = game.i18n.localize(preview.statusKey)

  const costEl = consoleEl.querySelector('[data-selected-skill-cost]')
  if (costEl) costEl.textContent = preview.selectedCost

  const summaryEl = consoleEl.querySelector('[data-selected-skill-summary]')
  if (summaryEl) {
    summaryEl.textContent = preview.summaryText ?? game.i18n.localize('SKILL.XP_CONSOLE.PLACEHOLDER')
  }

  consoleEl.className = consoleEl.className
    .split(' ')
    .filter((c) => !c.startsWith('is-'))
    .concat(preview.consoleCssClass)
    .filter(Boolean)
    .join(' ')
}
```

Comportement :
- `mouseover` sur une ligne → affiche la preview
- `mouseout` d'une ligne → reset à idle (sauf si on entre dans une autre skill)
- `focusin` (Tab) → affiche la preview
- `focusout` (Shift+Tab ou Tab vers autre) → reset

### Étape 5 : Mettre à jour le template `character-skill.hbs`

Fichier : `templates/sheets/partials/character-skill.hbs`

Ajouter `tabindex="0"` et `data-hover-action="skillPreview"` (au lieu de `data-action` qui ne marche pas pour hover) :

```html
<div class="skill {{ui.lineCssClass}}"
     data-skill-id="{{id}}"
     ...
     tabindex="0"
     data-hover-action="skillPreview">
```

- `tabindex="0"` permet de focus l'élément avec Tab
- `data-hover-action` est utilisé par les listeners délégués dans `_onRender`
- **Ne pas utiliser** `data-action` pour du hover — les actions ApplicationV2 ne fonctionnent que pour les clics.

Fichier : `templates/sheets/actor/skills.hbs`

Aucune modification nécessaire. La structure actuelle avec les `data-xp-console-*` est prête.

### Étape 6 : Ajouter les clés i18n

Fichiers : `lang/en.json` et `lang/fr.json`

Ajouter dans `SKILL.XP_CONSOLE.STATUS.*` :

| Clé i18n | EN | FR |
|---|---|---|
| `SKILL.XP_CONSOLE.STATUS.FREE_RANK` | Free rank available | Rang gratuit disponible |
| `SKILL.XP_CONSOLE.STATUS.AFFORDABLE` | Purchase possible | Achat possible |
| `SKILL.XP_CONSOLE.STATUS.INSUFFICIENT_XP` | Insufficient XP | XP insuffisants |
| `SKILL.XP_CONSOLE.STATUS.MAX_RANK` | Maximum rank | Rang maximum |
| `SKILL.XP_CONSOLE.SUMMARY.FREE` | {label} rank {current} → {next} · 0 XP | {label} rang {current} → {next} · 0 XP |
| `SKILL.XP_CONSOLE.SUMMARY.AFFORDABLE` | {label} · {cost} XP · {remaining} XP left · Pool {pool} → {poolAfter} | {label} · {cost} XP · {remaining} XP restants · Pool {pool} → {poolAfter} |
| `SKILL.XP_CONSOLE.SUMMARY.INSUFFICIENT` | {label} · {cost} XP needed · {available} XP available · shortfall {shortfall} XP | {label} · {cost} XP requis · {available} XP disponibles · manque {shortfall} XP |
| `SKILL.XP_CONSOLE.SUMMARY.MAX` | {label} · Maximum rank ({max}/{max}) | {label} · Rang maximum ({max}/{max}) |
| `SKILL.XP_CONSOLE.SUMMARY.DICE_POOL` | {proficiency}P+{ability}A | {proficiency}P+{ability}A |
| `SKILL.XP_CONSOLE.XP_REMAINING` | {xp} XP remaining | {xp} XP restants |

### Étape 7 : Tests unitaires

Fichier : `tests/applications/sheets/character-sheet-skills.test.mjs`

Ajouter des tests pour :

```js
it('buildSkillPreview returns FREE_RANK_AVAILABLE state with correct fields')
it('buildSkillPreview returns AFFORDABLE state with correct fields')
it('buildSkillPreview returns INSUFFICIENT_XP state with correct fields')
it('buildSkillPreview returns MAX_RANK state with correct fields')
it('buildIdlePreview returns neutral state')
it('formatDicePreview formats proficiency+ability correctly')
it('formatDicePreview returns "0" for empty pool')
it('formatDicePreview returns only proficiency when ability is 0')
it('dicePreviewAfter is computed for each skill')
it('dicePreviewAfter differs from dicePreview when nextRank > current rank')
```

Ces tests n'ont pas besoin de Foundry DOM. Ils testent les méthodes statiques avec des objets skill mockés.

### Étape 8 : Vérification manuelle

1. Personnage neuf (100 XP, rangs gratuits dispo) :
   - Survoler une compétence carrière rang 0 → console affiche "Gratuit", coût "0 XP", source carrière
   - Survoler une compétence hors carrière rang 0 → console affiche coût
   - Survoler une compétence au max → console affiche "Rang maximum"

2. Personnage sans XP :
   - Survoler une compétence avec coût > 0 → console affiche "XP insuffisants", coût, manque

3. Personnage avec XP suffisants :
   - Survoler une compétence achetable → console affiche coût, XP restants, pool avant/après

4. Sortie de survol :
   - Quitter la ligne → retour à l'état neutre

5. Accessibilité clavier :
   - Tab sur une ligne → console se met à jour
   - Tab hors de la ligne → retour neutre

6. Changement de langue FR → EN :
   - Tous les textes de preview changent

---

## 6. Fichiers modifiés

| Fichier | Modification |
|---|---|---|
| `module/applications/sheets/character-sheet.mjs` | Ajout `dicePreviewAfter` dans `#prepareSkills()`, méthodes `_buildSkillPreview`, `_buildIdlePreview`, `_formatDicePreview`, `#findSkillInContext`, `#applyConsolePreview`, `#updateConsolePreview`, `#resetConsolePreview`, listeners hover/focus dans `_onRender` et handlers `#handleSkillPreviewEnter`/`#handleSkillPreviewLeave` (utilise `data-hover-action`, pas `data-action`) |
| `templates/sheets/partials/character-skill.hbs` | Ajout `tabindex="0"` et `data-hover-action="skillPreview"` (au lieu de `data-action` qui ne fonctionne pas pour hover) |
| `lang/en.json` | Nouvelles clés `SKILL.XP_CONSOLE.STATUS.*`, `SKILL.XP_CONSOLE.SUMMARY.*`, `SKILL.XP_CONSOLE.XP_REMAINING` |
| `lang/fr.json` | Traductions françaises correspondantes |
| `tests/applications/sheets/character-sheet-skills.test.mjs` | Tests sur `_buildSkillPreview`, `_buildIdlePreview`, `_formatDicePreview`, `dicePreviewAfter` |

Fichiers **non modifiés** (aucun changement nécessaire) :
- `templates/sheets/actor/skills.hbs`
- `styles/actor.less`

---

## 7. Tests et validation

```bash
# Tests unitaires
npx vitest run tests/applications/sheets/character-sheet-skills.test.mjs

# Build LESS (selon setup)
npm run build:less  # ou équivalent
```

---

## 8. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| `this._context` non disponible dans `_onRender` | La preview ne peut pas lire les skills | Les méthodes de preview ne dépendent pas du contexte ; on peut stocker le contexte ou le retrouver par re-calcul |
| Les listeners ajoutés dans `_onRender` s'accumulent si le DOM n'est pas détruit | Multiples events par render | ApplicationV2 détruit l'élément. Vérifier que `_onRender` reçoit bien un élément frais |
| `data-skill-id` vs `data-skill` en double sur la ligne | Incohérence de lecture | Vérifier que les deux attributs existent avec la même valeur ; sinon unifier vers `data-skill-id` |
| Performance si beaucoup de skills | Lag au survol rapide | Le calcul de preview est léger (pas de DOM, pas de Foundry). La mise à jour DOM est 3-4 assignations |
| `focusout` se déclenche entre deux skills | Console clignote | Utiliser `event.relatedTarget` pour détecter le passage d'une skill à l'autre |
| i18n des chaînes de summary composées | Mauvaise traduction | Utiliser `game.i18n.format()` avec des paramètres pour chaque clé |

---

## 9. Ordre de commit suggéré

1. Ajout de `dicePreviewAfter` dans `#prepareSkills()` + test associé
2. Méthodes `_buildSkillPreview`, `_buildIdlePreview`, `_formatDicePreview`, `#findSkillInContext` + tests unitaires
3. Méthode `#applyConsolePreview` + `#updateConsolePreview` / `#resetConsolePreview`
4. Clés i18n dans `en.json` et `fr.json`
5. Listeners hover/focus dans `_onRender` + handlers `#handleSkillPreviewEnter`/`#handleSkillPreviewLeave` + `data-hover-action="skillPreview"` + `tabindex="0"` dans le template
   - **Important :** Ne pas utiliser `data-action` pour le hover — les actions ApplicationV2 ne fonctionnent que pour les clics.
6. Test manuel complet (tous les états, FR/EN, souris, clavier avec Tab)

---

## 10. Points de vigilance

- US3 ne doit **jamais muter** les données de l'acteur. Si un handler de sélection déclenche une écriture, c'est un bug.
- La preview du pool de dés après achat est un calcul instantané (`getPositiveDicePoolPreview`), pas une simulation de transaction.
- **Règle critique sur les interactions UI :**
  - Pour les **clics** : utiliser `data-action` + `DEFAULT_OPTIONS.actions` (pattern ApplicationV2)
  - Pour les **hover/survol** (`mouseenter`/`mouseleave`) : utiliser **listeners DOM** dans `_onRender` avec `data-hover-action` — les actions ApplicationV2 ne fonctionnent **pas** pour les événements hover.
  - Pour l'**accessibilité clavier** : ajouter `tabindex="0"` et utiliser `focusin`/`focusout` (qui bubblent, contrairement à `focus`/`blur`)
- L'interaction est en hover, pas en clic toggle. `mouseover`/`focusin` → affiche la preview ; `mouseout`/`focusout` → retour à idle.
