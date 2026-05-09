# Plan d'implémentation — US3 : Prévisualisation d'achat au survol d'une compétence (Version simplifiée)

**Issue** : [#138 — US3: Prévisualisation d'achat au survol d'une compétence](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/138)
**Epic** : [#144 — EPIC: Console de transaction XP des compétences](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/144)
**Spécification** : `documentation/spec/character-sheet/spec-console-transaction-xp.md` (§9 — Version simplifiée)
**Dépend de** : US1 (console d'affichage des ressources), US2 (états visuels des lignes)
**Prérequis pour** : US4 (achat d'un rang), US5 (retrait d'un rang)

---

## 1. Objectif

Simplifier la preview console XP au survol d'une compétence : **seulement statut + coût**.

Aucun calcul complexe. Aucun summary texte détaillé. Juste un mapping direct des données déjà enrichies.

---

## 2. Constat sur l'existant (état actuel)

### 2.1. Ce qui existe DÉJÀ et fonctionne

**Listeners et handlers sont connectés** :
- `_onRender` attache `mouseover`/`mouseout`/`focusin`/`focusout` (lignes 782-785)
- `#onHoverAction` et `#onHoverOutAction` délèguent vers `skillPreview`
- `#handleSkillPreviewEnter` et `#handleSkillPreviewLeave` existent

**Méthodes de preview existent** :
- `_buildSkillPreview()` — construit l'objet preview (actuellement trop complexe)
- `_buildIdlePreview()` — construit l'état neutre
- `#findSkillInContext()` — retrouve une skill par son `id`
- `#updateConsolePreview()` — met à jour la console
- `#resetConsolePreview()` — reset à l'état neutre
- `#applyConsolePreview()` — applique la preview au DOM

**Données sont DÉJÀ enrichies** dans `#prepareSkills()` :
Chaque skill reçoit de `getSkillPurchaseState()` (source de vérité dans `utils/skill-costs.mjs`) :
- `purchaseReason`: `'FREE_RANK_AVAILABLE' | 'AFFORDABLE' | 'INSUFFICIENT_XP' | 'MAX_RANK'`
- `nextCost`: coût du prochain rang (0 si gratuit, nombre, ou null si max)

### 2.2. Ce qui est dupliqué/buggé et à supprimer

**Code dupliqué/buggé dans `character-sheet.mjs`** :
1. `#getSkillRankCost()` (ligne 247) — **BUG** :
   - Calcule coût = `nextRank * 5` pour TOUTES les compétences
   - MAIS compétences **non-carrière** coûtent `(nextRank * 5) + 5`
   - La source de vérité est `utils/skill-costs.mjs#getSkillPurchaseState()` qui calcule `nextCost` correctement

2. `#getSkillPurchaseReason()` (ligne 256) — **DUPLICATION** :
   - Reproduit la logique de `getSkillPurchaseState` de `utils/skill-costs.mjs`
   - Utilise le `#getSkillRankCost()` buggé
   - Résultat : incohérence entre `#prepareSkills()` (correct) et `_buildSkillPreview()` (buggé)

3. `#getAvailableFreeRankForSkill()` (ligne 293) — **DUPLICATION** :
   - Logique similaire à `_prepareFreeSkill()`
   - Plus nécessaire car `purchaseReason` et `isFreePurchase` sont déjà enrichis

### 2.3. Ce qui est trop complexe et à simplifier

**`_buildSkillPreview()` (lignes 873-944)** — actuellement construit :
- `summaryText` complexe avec :
  - Nom de la skill
  - Rang actuel → prochain rang
  - Source du rang gratuit
  - Coût
  - XP restants / manque
  - Pool de dés avant/après

**Ce qui doit être simplifié** :
- Retirer TOUTE la logique de `summaryText`
- Ne garder que le **mapping simple**

---

## 3. Mapping simple (Preview = Statut + Coût)

| `purchaseReason` | `statusKey` | `consoleCssClass` | `selectedCost` |
|------------------|-------------|-------------------|----------------|
| `FREE_RANK_AVAILABLE` | `SKILL.XP_CONSOLE.STATUS.FREE_RANK` | `is-free` | `0 XP` |
| `AFFORDABLE` | `SKILL.XP_CONSOLE.STATUS.AFFORDABLE` | `is-affordable` | `${nextCost} XP` |
| `INSUFFICIENT_XP` | `SKILL.XP_CONSOLE.STATUS.INSUFFICIENT_XP` | `is-locked` | `${nextCost} XP` |
| `MAX_RANK` | `SKILL.XP_CONSOLE.STATUS.MAX_RANK` | `is-error` | `—` |
| (idle) | `SKILL.XP_CONSOLE.STATUS.IDLE` | `''` | `—` |

---

## 4. Plan de travail détaillé

### Étape 1 : Supprimer le code dupliqué/buggé

**Fichier** : `module/applications/sheets/character-sheet.mjs`

**À supprimer** :

1. `#getSkillRankCost()` (ligne 247)
   - **Pourquoi** : Bug sur le coût des compétences non-carrière
   - **Remplacement** : Utiliser `skill.nextCost` déjà enrichi par `#prepareSkills()`

2. `#getSkillPurchaseReason()` (ligne 256)
   - **Pourquoi** : Duplication de `getSkillPurchaseState`
   - **Remplacement** : Utiliser `skill.purchaseReason` déjà enrichi

3. `#getAvailableFreeRankForSkill()` (ligne 293)
   - **Pourquoi** : Duplication, plus nécessaire
   - **Remplacement** : Utiliser `skill.isFreePurchase` et `skill.purchaseReason`

**Vérification** : S'assurer que rien d'autre n'appelle ces méthodes.

### Étape 2 : Simplifier `_buildSkillPreview()`

**Fichier** : `module/applications/sheets/character-sheet.mjs`

**Approche** : Mapping direct, pas de calcul complexe.

**Code simplifié** :
```js
/**
 * Mapping purchaseReason → statut console
 */
static #PURCHASE_REASON_TO_STATUS = {
  'FREE_RANK_AVAILABLE': {
    statusKey: 'SKILL.XP_CONSOLE.STATUS.FREE_RANK',
    consoleCssClass: 'is-free',
    getCost: (nextCost) => '0 XP',
  },
  'AFFORDABLE': {
    statusKey: 'SKILL.XP_CONSOLE.STATUS.AFFORDABLE',
    consoleCssClass: 'is-affordable',
    getCost: (nextCost) => `${nextCost} XP`,
  },
  'INSUFFICIENT_XP': {
    statusKey: 'SKILL.XP_CONSOLE.STATUS.INSUFFICIENT_XP',
    consoleCssClass: 'is-locked',
    getCost: (nextCost) => `${nextCost} XP`,
  },
  'MAX_RANK': {
    statusKey: 'SKILL.XP_CONSOLE.STATUS.MAX_RANK',
    consoleCssClass: 'is-error',
    getCost: () => '—',
  },
}

/**
 * Build a console preview object for the given skill.
 * @param {object} skill - Enriched skill data from #prepareSkills
 * @param {object} _progression - Ignored in simplified version
 * @returns {object} Preview data for the console
 */
static _buildSkillPreview(skill, _progression) {
  const { nextCost, purchaseReason } = skill
  const mapping = this.#PURCHASE_REASON_TO_STATUS[purchaseReason]

  if (!mapping) {
    // Fallback vers état neutre
    return this._buildIdlePreview()
  }

  return {
    statusKey: mapping.statusKey,
    consoleCssClass: mapping.consoleCssClass,
    selectedCost: mapping.getCost(nextCost),
    summaryText: null,
  }
}
```

**À retirer de l'ancienne implémentation** :
- Toute la logique de `summaryText`
- Les références à `dicePreview`, `dicePreviewAfter`, `freeRank`
- Les références à `#getSkillRankCost()` (sera supprimé)
- Les références à `#getSkillPurchaseReason()` (sera supprimé)
- Les références à `#getAvailableFreeRankForSkill()` (sera supprimé)
- Les références à `_formatDicePreview()` (si plus utilisé)

### Étape 3 : Simplifier/supprimer `_formatDicePreview()`

**Fichier** : `module/applications/sheets/character-sheet.mjs`

**Action** :
1. Vérifier si `_formatDicePreview()` est utilisé ailleurs que dans l'ancienne implémentation de `_buildSkillPreview()`
2. Si **plus utilisé** : le supprimer
3. Si **utilisé ailleurs** : le garder tel quel

### Étape 4 : Vérifier `_buildIdlePreview()`

**Fichier** : `module/applications/sheets/character-sheet.mjs`

**Action** : Vérifier que `_buildIdlePreview()` retourne bien :
```js
{
  statusKey: 'SKILL.XP_CONSOLE.STATUS.IDLE',
  consoleCssClass: '',
  selectedCost: '—',
  summaryText: null,
}
```

### Étape 5 : Mettre à jour les tests

**Fichier** : `tests/applications/sheets/character-sheet-skills.test.mjs`

**Tests existants pour `_buildSkillPreview()`** (lignes 648-744) :
- Vérifient `statusKey`, `consoleCssClass`, `selectedCost` ✅
- Vérifient aussi `summaryText` ❌ (à retirer)

**Modifications nécessaires** :
1. Retirer les assertions sur `summaryText`
2. Garder les assertions sur `statusKey`, `consoleCssClass`, `selectedCost`

**Exemple de test simplifié** :
```js
it('returns FREE_RANK_AVAILABLE state', () => {
  const skill = {
    purchaseReason: 'FREE_RANK_AVAILABLE',
    nextCost: 0,
  }

  const preview = CharacterSheet._buildSkillPreview(skill, baseProgression)

  expect(preview.statusKey).toBe('SKILL.XP_CONSOLE.STATUS.FREE_RANK')
  expect(preview.consoleCssClass).toBe('is-free')
  expect(preview.selectedCost).toBe('0 XP')
  // Plus de vérification sur summaryText
})
```

**Tests de `_formatDicePreview()`** (lignes 615-636) :
- Si `_formatDicePreview()` est supprimé : supprimer ces tests
- Si `_formatDicePreview()` est gardé : garder ces tests

---

## 5. Architecture après simplification

### Flux de données
```
1. #prepareSkills()
   ↓ appelle getSkillPurchaseState() (source de vérité)
   ↓ enrichit chaque skill avec : purchaseReason, nextCost, isFreePurchase, canPurchase

2. Hover/focus sur une ligne .skill
   ↓ déclenche #onHoverAction
   ↓ appelle #handleSkillPreviewEnter(skillId)
   ↓ appelle #updateConsolePreview(skillId)

3. #updateConsolePreview(skillId)
   ↓ appelle #findSkillInContext(skillId) → retrouve la skill enrichie
   ↓ appelle CharacterSheet._buildSkillPreview(skill, progression)
   ↓ appelle #applyConsolePreview(preview)

4. _buildSkillPreview(skill)
   ↓ MAPPING DIRECT : skill.purchaseReason → { statusKey, consoleCssClass, selectedCost }
   ↓ PAS DE CALCUL COMPLEXE
   ↓ PAS DE SUMMARY TEXTE

5. #applyConsolePreview(preview)
   ↓ met à jour le DOM : status, cost, CSS class
```

### Points clés
- **Source de vérité unique** : `utils/skill-costs.mjs#getSkillPurchaseState()`
- **Pas de duplication** : toutes les données sont enrichies une seule fois dans `#prepareSkills()`
- **Preview = mapping simple** : pas de logique métier dans la preview
- **Listeners existent déjà** : rien à ajouter sur ce plan

---

## 6. Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `documentation/spec/character-sheet/spec-console-transaction-xp.md` | Mise à jour §9 — Prévisualisation au survol (version simplifiée) |
| `documentation/plan/character-sheet/console-xp/US3-plan-preview-survol-competence.md` | Réécriture complète — Approche simplifiée |
| `module/applications/sheets/character-sheet.mjs` | Suppression code dupliqué/buggé + simplification `_buildSkillPreview()` |
| `tests/applications/sheets/character-sheet-skills.test.mjs` | Mise à jour tests — retrait assertions sur `summaryText` |

---

## 7. Ordre de commit suggéré

1. **Mise à jour documentation** :
   - Spécification §9 simplifiée
   - Plan US3 réécrit

2. **Suppression code dupliqué/buggé** :
   - Supprimer `#getSkillRankCost()`
   - Supprimer `#getSkillPurchaseReason()`
   - Supprimer `#getAvailableFreeRankForSkill()`
   - Vérifier que rien ne casse

3. **Simplification `_buildSkillPreview()`** :
   - Ajouter mapping constant `#PURCHASE_REASON_TO_STATUS`
   - Simplifier la méthode
   - Retirer la logique de `summaryText`

4. **Nettoyage `_formatDicePreview()`** (si nécessaire) :
   - Si plus utilisé : le supprimer
   - Sinon : le garder

5. **Mise à jour tests** :
   - Retirer assertions sur `summaryText`
   - Garder assertions sur `statusKey`, `consoleCssClass`, `selectedCost`
   - Supprimer tests de `_formatDicePreview()` si nécessaire

6. **Vérification finale** :
   - Lancer les tests
   - Vérifier que les listeners existent toujours
   - Vérifier que le flux fonctionne

---

## 8. Validation

```bash
# Lancer les tests
npx vitest run tests/applications/sheets/character-sheet-skills.test.mjs

# Vérifier qu'il n'y a pas d'erreurs TypeScript (si applicable)
# npm run typecheck

# Vérifier qu'il n'y a pas d'erreurs LESS
# npm run build:less
```

---

## 9. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Du code utilise encore les méthodes supprimées | Erreur JS | Vérifier les références avant suppression |
| `#findSkillInContext()` est encore utile | Ne pas le supprimer | Ce n'est pas dans la liste des suppressions — il sert à retrouver la skill par son id dans le contexte |
| Tests échouent après simplification | CI casse | Mettre à jour les tests en même temps que le code |
| `_formatDicePreview()` est utilisé ailleurs | Erreur après suppression | Vérifier les références avant suppression |

---

## 10. Résultat attendu

Après implémentation :
- ✅ Plus de code dupliqué
- ✅ Plus de bug sur le coût des compétences non-carrière
- ✅ Preview = mapping simple de `purchaseReason` et `nextCost`
- ✅ Source de vérité unique : `utils/skill-costs.mjs#getSkillPurchaseState()`
- ✅ Tous les tests passent
- ✅ Listeners existent toujours et fonctionnent

La preview est **simplifiée**, **maintenable**, et **cohérente** avec le reste du code.
