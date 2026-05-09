# Plan d'implémentation — US2 : États visuels des lignes de compétence

**Issue** : [#137 — US2: États visuels des lignes de compétence](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/137)  
**Epic** : [#144 — EPIC: Console de transaction XP des compétences](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/144)  
**Spécification** : `documentation/spec/character-sheet/spec-console-transaction-xp.md` (§10.5)  
**Dépend de** : US1 (console affichage ressources) — peut avancer en parallèle  
**Prérequis pour** : US3 (survol), US4 (achat)

---

## 1. Objectif

Ajouter sur chaque ligne de compétence des indicateurs visuels compacts permettant au joueur de comprendre d'un coup d'œil :

- si la compétence est de carrière / spécialisation ;
- si le prochain rang est gratuit, payant, bloqué ou au maximum ;
- si le dernier rang est oubliable via la console ou non remboursable.

Ces indicateurs sont organisés en **3 colonnes** dans la ligne de compétence, sans alourdir la liste existante.

---

## 2. Périmètre

### Inclus dans US2

- Colonne **marqueur** : `C` / `S` / les deux / aucun
- Colonne **increase** : icône + label court en tooltip pour chaque état d'achat
- Colonne **decrease** : icône + état visuel en tooltip pour la réversibilité
- Classes CSS conditionnelles sur `.skill` pour chaque état
- `data-*` attributes enrichis et normalisés sur la ligne
- Internationalisation de tous les nouveaux textes visibles
- Styles LESS compacts dans `styles/actor.less`
- Tests unitaires sur les nouvelles propriétés de contexte

### Exclu de US2

- Survol → mise à jour de la console → US3
- Achat effectif d'un rang → US4
- Retrait effectif d'un rang → US5
- Traçabilité métier des rangs (distingo console / import / manuel) → US6
- Messages de notification → US7
- Pool de dés dynamique dans la console → US8

---

## 3. Constat sur l'existant

### 3.1. Contrat de données actuel (`character-sheet.mjs:420-479`)

`#prepareSkills()` enrichit déjà chaque skill avec :

```js
{
  nextRank,          // rang cible
  nextCost,          // coût du prochain rang (0, nombre, ou null)
  canPurchase,       // booléen
  isFreePurchase,    // booléen
  purchaseReason,    // 'FREE_RANK_AVAILABLE' | 'AFFORDABLE' | 'INSUFFICIENT_XP' | 'MAX_RANK'
  freeRank: {
    isCareer,
    isSpecialization,
    extraClass,
    name,
  },
  dicePreview,       // { ability, proficiency }
  pips,              // tableau de { cssClass }
}
```

**Ce qui manque** :
- Aucune propriété normalisée pour l'état visuel "increase" (icône, label, classe)
- Aucune propriété pour l'état visuel "decrease"
- Aucune classe CSS d'état sur la ligne

### 3.2. Template actuel (`templates/sheets/partials/character-skill.hbs`)

La ligne affiche déjà :

- nom + abréviation caractéristique
- badges `C` / `S` (`.skill-tag`)
- rang `X/5`
- coût : `FREE`, `X XP`, ou `MAX`
- preview dés (icônes)
- pips (losanges / hexagones)

**Problèmes** :
- `data-action` dupliqué en HTML (seule la dernière valeur est prise)
- Textes hardcodés : `Career skill`, `Specialization skill`, `Rank`, `FREE`, `MAX`, `Dice pool after next rank`
- Pas de structure "3 colonnes" explicite
- Pas de colonne "decrease"

### 3.3. Styles actuels (`styles/actor.less:1535-1733`)

- Grille existante : `minmax(120px, 1fr) 26px 36px 36px 26px 80px`
- Classes `.skill-tag--career` et `.skill-tag--specialization` existantes
- Pas de classes d'état de ligne (`.is-free`, `.is-blocked`, `.is-max`, etc.)

### 3.4. États métier disponibles (`module/utils/skill-costs.mjs:34-77`)

```js
'FREE_RANK_AVAILABLE'  // canPurchase=true,  isFreePurchase=true,  nextCost=0
'AFFORDABLE'           // canPurchase=true,  isFreePurchase=false, nextCost=nombre
'INSUFFICIENT_XP'      // canPurchase=false, isFreePurchase=false, nextCost=nombre
'MAX_RANK'             // canPurchase=false, isFreePurchase=false, nextCost=null
```

### 3.5. Icônes SVG disponibles

- `assets/images/icons/free.svg`
- `assets/images/icons/buy.svg`
- `assets/images/icons/sell.svg`

---

## 4. Point d'architecture : colonne "decrease" et traçabilité

### Constat

L'issue US2 demande d'afficher `dernier rang oubliable` vs `dernier rang non remboursable`.  
La spec §8 et §13 précisent que seuls les rangs **acquis via la console XP** sont oubliables automatiquement.

**Problème** : le modèle actuel ne trace pas l'origine des rangs. Les composantes `rank.base`, `rank.careerFree`, `rank.specializationFree`, `rank.trained` ne permettent pas de savoir si un rang a été acheté via la console, importé, ou saisi manuellement.

### Décision retenue

1. **US2 implémente la colonne "decrease" en mode visuel uniquement** : affichage des icônes `.skill-action--decrease` avec un état `unavailable` tant que la traçabilité n'est pas fiable.
2. Un second état `forgettable` est préparé dans le contrat de données (`decreaseState`) mais **laissé à `pending`** jusqu'à US6.
3. Justification : promettre métier un état "oubliable" sans traçabilité réelle créerait une attente fausse et risquerait de faire croire au joueur qu'il peut annuler un rang importé.

Si tu souhaites malgré tout afficher les deux états dès US2 de façon heuristique (basée sur `rank.trained > 0` ou `freeSkillRanks.spent > 0`), c'est possible en le documentant comme provisoire. La recommandation est d'attendre US6.

---

## 5. Contrat de données enrichi

Ajouter dans `#prepareSkills()` un bloc `skill.ui` :

```js
skill.ui = {
  // === MARQUEUR ===
  markerState: 'career' | 'specialization' | 'both' | 'none',
  markerLabel: 'SKILL.MARKER.CAREER' | 'SKILL.MARKER.SPECIALIZATION' | '',

  // === INCREASE ===
  increaseState: purchaseReason,  // même chaîne normalisée
  increaseIcon: 'free' | 'buy' | 'buy-blocked' | null,
  increaseLabelKey: 'SKILL.INCREASE.FREE' | 'SKILL.INCREASE.COST' | 'SKILL.INCREASE.BLOCKED' | 'SKILL.INCREASE.MAX',

  // === DECREASE (visuel uniquement jusqu'à US6) ===
  decreaseState: 'pending' | 'forgettable' | 'non-refundable',
  // 'pending' = traçabilité non disponible (valeur par défaut avant US6)
  // 'forgettable' = activé après US6
  // 'non-refundable' = activé après US6
  decreaseIcon: 'sell' | null,
  decreaseLabelKey: 'SKILL.DECREASE.PENDING' | 'SKILL.DECREASE.FORGETTABLE' | 'SKILL.DECREASE.NON_REFUNDABLE',

  // === CLASSES CSS ===
  // une chaîne concaténée directement exploitable
  lineCssClass: 'is-career is-free',
}
```

Les champs `decreaseState` et `decreaseIcon` sont préparés et passent en `pending` dès US2. Seul US6 les rendra fonctionnels.

---

## 6. Plan de travail détaillé

### Étape 1 : Enrichir le contrat de données dans `#prepareSkills()`

Fichier : `module/applications/sheets/character-sheet.mjs`

- Après le calcul de `purchaseState`, construire l'objet `skill.ui` :
  - Déduire `markerState` de `freeRank.isCareer` et `freeRank.isSpecialization`
  - Déduire `increaseState` de `purchaseReason`
  - Déduire `increaseIcon` et `increaseLabelKey` par mapping de `purchaseReason`
  - Initialiser `decreaseState` à `'pending'`
  - Concaténer les classes CSS dans `lineCssClass`
- Attacher `skill.ui` à chaque élément du tableau `skills`

Taille estimée : ~30 lignes de code.

### Étape 2 : Refactorer `character-skill.hbs`

Fichier : `templates/sheets/partials/character-skill.hbs`

- Passer en structure 3 colonnes explicites (via grid existante)
- Colonne 1 `marker` : `C` / `S` / les deux / vide
- Colonne 2 `increase` : icône + label court
- Colonne 3 `decrease` : icône placeholder ou état visuel provisoire

```hbs
<div class="skill {{ui.lineCssClass}}"
     data-skill-id="{{id}}"
     data-skill-rank="{{rank.value}}"
     data-skill-marker="{{ui.markerState}}"
     data-skill-increase-state="{{ui.increaseState}}"
     data-skill-decrease-state="{{ui.decreaseState}}"
     data-skill-next-rank="{{nextRank}}"
     data-skill-next-cost="{{nextCost}}"
     data-skill-can-purchase="{{canPurchase}}"
     data-skill-is-free="{{isFreePurchase}}"
     data-action="skillHover">

  <div class="skill__info">
    <span class="skill__label">{{label}}</span>
    <span class="skill__characteristic">({{characteristics.abbreviation}})</span>
  </div>

  <div class="skill__marker">
    {{#if freeRank.isCareer}}
      <span class="skill-marker skill-marker--career"
            data-tooltip="{{localize 'SKILL.MARKER.CAREER'}}">C</span>
    {{/if}}
    {{#if freeRank.isSpecialization}}
      <span class="skill-marker skill-marker--specialization"
            data-tooltip="{{localize 'SKILL.MARKER.SPECIALIZATION'}}">S</span>
    {{/if}}
  </div>

  <div class="skill__action skill__action--increase {{#if (eq ui.increaseState 'INSUFFICIENT_XP')}}is-blocked{{/if}}">
    {{#if (eq ui.increaseState 'FREE_RANK_AVAILABLE')}}
      <img src="systems/swerpg/assets/images/icons/free.svg" alt="" aria-hidden="true"
           data-tooltip="{{localize 'SKILL.INCREASE.FREE_TOOLTIP'}}">
      <span class="increase-label">{{localize 'SKILL.INCREASE.FREE'}}</span>
    {{else if (eq ui.increaseState 'MAX_RANK')}}
      <span class="increase-badge increase-badge--max">M</span>
    {{else if nextCost}}
      <img src="systems/swerpg/assets/images/icons/buy.svg" alt="" aria-hidden="true"
           data-tooltip="{{localize 'SKILL.INCREASE.COST_TOOLTIP' cost=nextCost}}">
      <span class="increase-label">{{nextCost}}</span>
    {{/if}}
  </div>

  <div class="skill__action skill__action--decrease {{ui.decreaseState}}">
    {{#if (eq ui.decreaseState 'forgettable')}}
      <img src="systems/swerpg/assets/images/icons/sell.svg" alt="" aria-hidden="true"
           data-tooltip="{{localize 'SKILL.DECREASE.FORGETTABLE'}}">
    {{else}}
      <img src="systems/swerpg/assets/images/icons/sell.svg" alt="" aria-hidden="true"
           class="is-disabled"
           data-tooltip="{{localize 'SKILL.DECREASE.PENDING'}}">
    {{/if}}
  </div>

  <div class="skill__rank">
    <span class="skill-rank-label">{{rank.value}}/5</span>
  </div>

  <div class="skill__dice-preview" data-tooltip="{{localize 'SKILL.DICE_PREVIEW_TOOLTIP'}}">
    {{#each dicePreview.proficiency}}<span class="die die--proficiency"></span>{{/each}}
    {{#each dicePreview.ability}}<span class="die die--ability"></span>{{/each}}
  </div>

  <div class="pips flexrow" data-action="toggleTrainedSkill">
    {{#each pips as |pip|}}
      <div class="pip {{pip.cssClass}}"></div>
    {{/each}}
  </div>
</div>
```

Supprimer l'ancien bloc `skill-tags`, `skill-rank`, `skill-cost`, `skill-dice-preview` qui sont remplacés par la nouvelle structure. Conserver les `pips`.

### Étape 3 : Compléter les styles LESS

Fichier : `styles/actor.less` (section `.skills-wrapper .skill`)

Remplacer la grille existante par :

```less
.skill {
  grid-template-columns:
    minmax(120px, 1fr)  // info (nom + abréviation)
    28px                 // marker (C/S)
    52px                 // action increase
    52px                 // action decrease
    36px                 // rank
    80px                 // dice preview
    1fr;                 // pips (flex)
}
```

Ajouter les états visuels demandés par l'issue, en restant discret :

```less
// Classes d'état sur la ligne
.skill.is-free {
  .skill__action--increase { color: @skill-free; }
}
.skill.is-affordable {
  .skill__action--increase { color: @skill-cost; }
}
.skill.is-blocked {
  .skill__action--increase { opacity: 0.5; }
}
.skill.is-max {
  .skill__action--increase { color: @color-label; }
}
.skill.is-career .skill-marker--career {
  color: @skill-career;
  border-color: @skill-career;
}
.skill.is-specialization .skill-marker--specialization {
  color: @skill-specialization;
  border-color: @skill-specialization;
}

// État decrease "non disponible"
.skill__action--decrease img.is-disabled {
  opacity: 0.25;
  filter: grayscale(1);
}
```

### Étape 4 : Ajouter les clés i18n

Fichiers : `lang/en.json` et `lang/fr.json`

| Clé i18n | EN | FR |
|---|---|---|
| `SKILL.MARKER.CAREER` | Career skill | Compétence de carrière |
| `SKILL.MARKER.SPECIALIZATION` | Specialization skill | Compétence de spécialisation |
| `SKILL.INCREASE.FREE` | FREE | GRATUIT |
| `SKILL.INCREASE.FREE_TOOLTIP` | Free rank available | Rang gratuit disponible |
| `SKILL.INCREASE.BLOCKED` | Blocked | Bloqué |
| `SKILL.INCREASE.BLOCKED_TOOLTIP` | Insufficient XP | XP insuffisants |
| `SKILL.INCREASE.MAX` | MAX | MAX |
| `SKILL.INCREASE.MAX_TOOLTIP` | Maximum rank reached | Rang maximum atteint |
| `SKILL.INCREASE.COST_TOOLTIP` | Cost: {cost} XP | Coût : {cost} XP |
| `SKILL.DECREASE.PENDING` | Refund not available | Remboursement non disponible |
| `SKILL.DECREASE.FORGETTABLE` | Refundable rank | Rang remboursable |
| `SKILL.DECREASE.NON_REFUNDABLE` | Non-refundable rank | Rang non remboursable |
| `SKILL.DICE_PREVIEW_TOOLTIP` | Current dice pool | Pool de dés actuel |

### Étape 5 : Tests unitaires

Fichier : `tests/applications/sheets/character-sheet-skills.test.mjs`

Ajouter des tests sur le nouvel objet `ui` :

```js
it('computes ui.markerState = "career" for career skill', () => { /* ... */ })
it('computes ui.markerState = "specialization" for specialization skill', () => { /* ... */ })
it('computes ui.markerState = "both" when career + specialization', () => { /* ... */ })
it('computes ui.increaseState = "FREE_RANK_AVAILABLE" with icon "free"', () => { /* ... */ })
it('computes ui.increaseState = "AFFORDABLE" with icon "buy"', () => { /* ... */ })
it('computes ui.increaseState = "INSUFFICIENT_XP" with icon "buy-blocked"', () => { /* ... */ })
it('computes ui.increaseState = "MAX_RANK" with icon null', () => { /* ... */ })
it('computes ui.decreaseState = "pending" before US6', () => { /* ... */ })
it('computes ui.lineCssClass with correct classes', () => { /* ... */ })
```

### Étape 6 : Vérification manuelle

1. Personnage neuf (100 XP, carrière + spé) :
   - Toutes les skills de carrière affichent `C` et `FREE` au rang 0
   - Toutes les skills de spécialisation affichent `S` et `FREE` au rang 0
   - Les skills hors carrière/spé affichent le coût XP

2. Personnage sans XP, rang > 0 :
   - Les skills affichent l'icône `buy` atténuée + tooltip "Insufficient XP"
   - Les skills au rang 5 affichent `M`

3. Personnage avec rangs gratuits épuisés :
   - Les skills de carrière au rang 0 affichent le coût XP (plus `FREE`)

4. Changement de langue FR → EN :
   - Tous les tooltips et labels changent

5. Aucune régression :
   - Les pips s'affichent correctement
   - Le preview de dés s'affiche
   - La console XP est toujours présente et fonctionnelle

---

## 7. Fichiers modifiés

| Fichier | Modification |
|---|---|
| `module/applications/sheets/character-sheet.mjs` | Ajout bloc `skill.ui` dans `#prepareSkills()` |
| `templates/sheets/partials/character-skill.hbs` | Refactor complet en 3 colonnes + localisation |
| `styles/actor.less` | Nouvelle grille + classes d'état |
| `lang/en.json` | Nouvelles clés `SKILL.MARKER.*`, `SKILL.INCREASE.*`, `SKILL.DECREASE.*`, `SKILL.DICE_PREVIEW_TOOLTIP` |
| `lang/fr.json` | Traductions françaises correspondantes |
| `tests/applications/sheets/character-sheet-skills.test.mjs` | Tests sur `skill.ui` |

---

## 8. Tests et validation

```bash
# Tests unitaires
npx vitest run tests/applications/sheets/character-sheet-skills.test.mjs

# Build LESS (selon setup du projet)
npm run build:less  # ou équivalent
```

---

## 9. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Restructurer le partial `character-skill.hbs` casse les sélecteurs CSS existants | Régression visuelle | Conserver les classes stables ; vérifier le rendu des pips |
| L'état `pending` pour la colonne decrease est frustrant pour le joueur | UX dégradée | Ajouter un tooltip explicatif ; documenter que ce sera activé après US6 |
| `skill.type.id` ne correspond pas au groupement attendu | Skills dans la mauvaise section | Vérifier avant de commencer l'étape 1 ; déjà corrigé dans US1 |
| Utiliser des `<img>` pour les icônes SVG crée des requêtes HTTP | Latence au premier hover | Préférer des `background-image` en CSS ou vérifier que les SVG sont bien dans le système |
| La grille à 7 colonnes ne passe pas sur écran étroit | Débordement horizontal | Tester avec un width de feuille réduit ; prévoir un breakpoint si nécessaire |

---

## 10. Ordre de commit suggéré

1. Contrat de données `skill.ui` dans `character-sheet.mjs` + tests
2. Clés i18n dans `en.json` et `fr.json`
3. Refactor du partial `character-skill.hbs`
4. Styles LESS
5. Vérification manuelle et ajustements visuels

---

## 11. Dépendances avec les autres US

```
US1 (console statique)
  └── US2 (états visuels des lignes) — peut avancer en parallèle de US1
        ├── US3 (survol) — dépend de US2 pour les data-* et classes
        ├── US4 (achat) — dépend de US3
        ├── US5 (retrait) — dépend de US6 pour la colonne decrease
        ├── US6 (traçabilité) — active l'état decrease réel
        └── US7 (notifications) — dépend de US4/US5
```

US2 est un prérequis visuel pour US3 (survol) car les `data-*` enrichis et les classes CSS seront utilisés par les handlers d'interaction. US2 n'a pas de dépendance bloquante sur US1 (les deux modifient des fichiers différents, le risque de conflit est faible).
