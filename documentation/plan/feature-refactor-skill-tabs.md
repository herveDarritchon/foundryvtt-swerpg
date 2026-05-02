# Plan d’implémentation — Onglet Skills / XP Purchase Console

## Objectif

Refactorer et enrichir l’onglet `skills` de la feuille de personnage Foundry VTT afin qu’il devienne une véritable interface d’achat de compétences avec l’expérience du personnage.

L’onglet ne doit plus être seulement une liste de compétences. Il doit permettre au joueur et au MJ de comprendre immédiatement :

- combien d’XP est disponible ;
- combien d’XP a déjà été dépensée ;
- combien de compétences gratuites de carrière restent à choisir ;
- combien de compétences gratuites de spécialisation restent à choisir ;
- quelles compétences sont carrière ou spécialisation ;
- quel est le coût du prochain rang ;
- si l’achat est possible ou impossible ;
- quel sera l’impact de l’achat sur le rang de compétence ;
- à terme, quel sera l’impact sur le pool de dés.

Le design doit rester cohérent avec la charte actuelle du système : datapad Star Wars, hologramme, interface de vaisseau, tons cyan/bleu froid, lisibilité élevée, animations sobres.

---

## Contraintes générales

- Ne pas casser le rendu visuel existant.
- Ne pas introduire de régression sur les autres onglets de la fiche acteur.
- Ne pas modifier les règles métier sans validation.
- Garder une structure compatible Foundry VTT 13+.
- Utiliser JavaScript vanilla et les APIs Foundry.
- Garder le HTML accessible autant que possible : `title`, `aria-label`, tooltips Foundry si déjà utilisés.
- Éviter les animations trop agressives.
- Préférer une première passe stable à une refonte complète.

---

## Fichiers probablement concernés

À adapter selon l’organisation réelle du projet :

- `templates/actor/character-sheet.hbs`
- `templates/actor/parts/skills.hbs`
- `templates/actor/parts/skill-row.hbs`
- `less/actor.less`
- `less/theme.less`
- `less/variables.less`
- `less/swerpg.less`
- fichier JS de la feuille acteur :
  - `scripts/actor/character-sheet.js`
  - ou équivalent existant
- éventuel modèle acteur :
  - `scripts/documents/actor.js`
  - ou `module/actor/actor.js`
- éventuel fichier de constantes :
  - `scripts/constants/skills.js`
  - `scripts/constants/xp.js`
  - ou équivalent

Avant modification, identifier les vrais chemins dans le dépôt.

---

# Phase 1 — Audit rapide du code existant

## 1.1 Identifier le template de l’onglet Skills

Chercher dans le dépôt :

```bash
rg "data-tab=\"skills\""
rg "skills-wrapper"
rg "toggleTrainedSkill"
rg "career-and-speciality"
````

Objectif : trouver le template qui génère cette structure :

```html
<section class="tab secondary skills flexcol scrollable" data-tab="skills">
  ...
</section>
```

## 1.2 Identifier la logique actuelle de clic sur les pips

Chercher :

```bash
rg "toggleTrainedSkill"
rg "data-action"
rg "trained"
rg "untrained"
```

Comprendre :

* comment le rang est actuellement calculé ;
* comment le clic sur un pip modifie la compétence ;
* si le coût XP est déjà calculé quelque part ;
* si les achats gratuits carrière/spécialisation sont déjà gérés ;
* si les validations d’achat sont côté client uniquement ou aussi côté modèle acteur.

## 1.3 Identifier la source des données de compétence

Trouver où sont définis :

* nom de compétence ;
* caractéristique associée ;
* rang actuel ;
* statut carrière ;
* statut spécialisation ;
* coût éventuel ;
* rang maximum.

Chercher :

```bash
rg "astrogation"
rg "athletics"
rg "xenology"
rg "coreworlds"
```

---

# Phase 2 — Corriger les anomalies visibles

## 2.1 Corriger le bug d’affichage Xenology

Dans le HTML actuel, la compétence ayant l’id `xenology` affiche incorrectement :

```html
<span class="label">Piloting Planetary</span>
<span class="abbreviation">(Int)</span>
```

Elle doit afficher :

```html
<span class="label">Xenology</span>
<span class="abbreviation">(Int)</span>
```

ou, si l’interface est localisée en français :

```html
<span class="label">Xénologie</span>
<span class="abbreviation">(Int)</span>
```

Action attendue :

* trouver la donnée source de `xenology` ;
* corriger son label ;
* vérifier que `Piloting Planetary` n’est pas dupliqué dans les Lore Skills ;
* ajouter ou mettre à jour un test si une structure de test existe.

---

# Phase 3 — Transformer le bandeau XP en console d’achat

## 3.1 Objectif UX

Le bandeau actuel affiche seulement des valeurs dispersées :

```text
Career Free Skill(s) left
Specialization Free Skill(s) left
Experience Spent
Available
```

Il faut le transformer en console synthétique :

```text
XP AVAILABLE     100
XP SPENT         100
FREE CAREER      3
FREE SPECIALTY   4
SELECTED COST    —
```

Puis, lorsqu’une compétence est survolée ou sélectionnée :

```text
SELECTED: PERCEPTION
CURRENT RANK: 2
NEXT RANK: 3
COST: 15 XP
TYPE: CAREER
STATUS: PURCHASE READY
```

## 3.2 Ajouter une structure HTML dédiée

Dans le template de l’onglet Skills, remplacer ou compléter le bloc actuel :

```html
<div>
  <div class="point-pools flexrow">...</div>
  <div class="point-pools flexrow">...</div>
</div>
```

par une structure plus explicite :

```html
<section class="xp-console" data-skill-purchase-console>
  <header class="xp-console__header">
    <span class="xp-console__title">XP Transaction Console</span>
    <span class="xp-console__status" data-xp-console-status>Awaiting selection</span>
  </header>

  <div class="xp-console__stats">
    <div class="xp-console__stat">
      <span class="xp-console__label">Available</span>
      <span class="xp-console__value" data-xp-available>{{system.experience.available}}</span>
    </div>

    <div class="xp-console__stat">
      <span class="xp-console__label">Spent</span>
      <span class="xp-console__value" data-xp-spent>{{system.experience.spent}}</span>
    </div>

    <div class="xp-console__stat">
      <span class="xp-console__label">Career Free</span>
      <span class="xp-console__value" data-free-career-skills>{{freeCareerSkillsLeft}}</span>
    </div>

    <div class="xp-console__stat">
      <span class="xp-console__label">Specialty Free</span>
      <span class="xp-console__value" data-free-specialization-skills>{{freeSpecializationSkillsLeft}}</span>
    </div>

    <div class="xp-console__stat xp-console__stat--selected">
      <span class="xp-console__label">Selected Cost</span>
      <span class="xp-console__value" data-selected-skill-cost>—</span>
    </div>
  </div>

  <div class="xp-console__selection" data-selected-skill-summary>
    <span class="xp-console__selection-placeholder">
      Select a skill to preview purchase cost.
    </span>
  </div>
</section>
```

Adapter les helpers et chemins de données aux vrais noms du modèle.

## 3.3 États visuels de la console

Prévoir les états suivants :

```html
<section class="xp-console is-idle">
<section class="xp-console is-affordable">
<section class="xp-console is-free">
<section class="xp-console is-locked">
<section class="xp-console is-error">
```

Signification :

* `is-idle` : aucune compétence sélectionnée ;
* `is-affordable` : achat possible avec XP ;
* `is-free` : achat gratuit possible ;
* `is-locked` : achat impossible ;
* `is-error` : incohérence ou erreur de données.

---

# Phase 4 — Enrichir chaque ligne de compétence

## 4.1 Objectif UX

Chaque ligne doit afficher les informations nécessaires à la décision :

* nom ;
* caractéristique ;
* statut carrière/spécialisation ;
* rang actuel ;
* coût du prochain rang ;
* état d’achat ;
* pips interactifs.

Exemple cible :

```text
Perception (Cun)    Career    Rank 2/5    Next 15 XP    ▰▰▱▱▱
```

## 4.2 Étendre le HTML d’une compétence

Structure cible recommandée :

```html
<div
  class="skill"
  data-skill-id="{{skill.id}}"
  data-skill-rank="{{skill.rank}}"
  data-skill-next-rank="{{skill.nextRank}}"
  data-skill-next-cost="{{skill.nextCost}}"
  data-skill-can-purchase="{{skill.canPurchase}}"
  data-skill-is-free="{{skill.isFreePurchase}}"
  data-is-career="{{skill.isCareer}}"
  data-is-specialization="{{skill.isSpecialization}}"
>
  <div class="skill__identity">
    <span class="skill__label">{{skill.label}}</span>
    <span class="skill__characteristic">({{skill.characteristicAbbr}})</span>
  </div>

  <div class="skill__tags">
    {{#if skill.isCareer}}
      <span class="skill-tag skill-tag--career" data-tooltip="Career skill">C</span>
    {{/if}}

    {{#if skill.isSpecialization}}
      <span class="skill-tag skill-tag--specialization" data-tooltip="Specialization skill">S</span>
    {{/if}}
  </div>

  <div class="skill__rank">
    <span class="skill__rank-label">Rank</span>
    <span class="skill__rank-value">{{skill.rank}}/5</span>
  </div>

  <div class="skill__cost">
    {{#if skill.isFreePurchase}}
      <span class="skill-cost skill-cost--free">FREE</span>
    {{else}}
      <span class="skill-cost">{{skill.nextCost}} XP</span>
    {{/if}}
  </div>

  <div class="skill__pips" data-action="toggleTrainedSkill">
    {{#each skill.pips}}
      <button
        type="button"
        class="pip {{this.state}}"
        data-rank="{{this.rank}}"
        data-tooltip="{{this.tooltip}}"
        aria-label="{{this.ariaLabel}}"
      ></button>
    {{/each}}
  </div>
</div>
```

Si le template actuel doit rester stable, faire une première passe minimale :

* conserver `.name`, `.career`, `.pips` ;
* ajouter uniquement `.skill__rank` et `.skill__cost` ;
* remplacer progressivement les classes anciennes ensuite.

## 4.3 Remplacer l’icône seule par des badges explicites

Actuellement, le statut carrière/spécialisation repose sur :

```html
<span class="career-and-speciality active" data-tooltip="Bounty Hunter"></span>
```

Ce n’est pas assez clair.

Ajouter des badges textuels :

```html
<span class="skill-tag skill-tag--career" data-tooltip="Career skill">C</span>
<span class="skill-tag skill-tag--specialization" data-tooltip="Specialization skill">S</span>
```

Conserver l’icône actuelle si elle est déjà utilisée visuellement, mais ne pas la laisser comme seul signal.

---

# Phase 5 — Calculer le coût du prochain rang

## 5.1 Règle à implémenter

Implémenter une fonction unique de calcul du coût du prochain rang.

Règle FFG Edge of the Empire à vérifier dans les données du système :

* compétence de carrière : coût du prochain rang = prochain rang × 5 XP ;
* compétence hors carrière : coût du prochain rang = prochain rang × 5 XP + 5 XP ;
* rang maximum standard : 5 ;
* pendant la création de personnage, certaines compétences de carrière ou spécialisation peuvent recevoir un rang gratuit.

Exemples :

```text
Carrière, rang 0 → rang 1 : 5 XP
Carrière, rang 1 → rang 2 : 10 XP
Carrière, rang 2 → rang 3 : 15 XP

Hors carrière, rang 0 → rang 1 : 10 XP
Hors carrière, rang 1 → rang 2 : 15 XP
Hors carrière, rang 2 → rang 3 : 20 XP
```

## 5.2 Créer une fonction pure

Créer une fonction du type :

```js
export function getSkillNextRankCost({ rank, isCareer, maxRank = 5 }) {
  const nextRank = rank + 1;

  if (nextRank > maxRank) {
    return null;
  }

  const baseCost = nextRank * 5;
  return isCareer ? baseCost : baseCost + 5;
}
```

## 5.3 Créer une fonction d’état d’achat

Créer une fonction du type :

```js
export function getSkillPurchaseState({
  rank,
  isCareer,
  isSpecialization,
  availableXp,
  freeCareerSkillsLeft,
  freeSpecializationSkillsLeft,
  maxRank = 5
}) {
  const nextRank = rank + 1;
  const nextCost = getSkillNextRankCost({ rank, isCareer, maxRank });

  if (nextCost === null) {
    return {
      canPurchase: false,
      isFreePurchase: false,
      reason: "MAX_RANK",
      nextRank,
      nextCost: null
    };
  }

  const canUseCareerFreeRank = isCareer && freeCareerSkillsLeft > 0 && rank === 0;
  const canUseSpecializationFreeRank = isSpecialization && freeSpecializationSkillsLeft > 0 && rank === 0;

  if (canUseCareerFreeRank || canUseSpecializationFreeRank) {
    return {
      canPurchase: true,
      isFreePurchase: true,
      reason: "FREE_RANK_AVAILABLE",
      nextRank,
      nextCost: 0
    };
  }

  if (availableXp >= nextCost) {
    return {
      canPurchase: true,
      isFreePurchase: false,
      reason: "AFFORDABLE",
      nextRank,
      nextCost
    };
  }

  return {
    canPurchase: false,
    isFreePurchase: false,
    reason: "INSUFFICIENT_XP",
    nextRank,
    nextCost
  };
}
```

Important : adapter la règle des rangs gratuits selon la logique réelle déjà présente dans le système. Ne pas écraser une mécanique existante sans vérification.

---

# Phase 6 — Préparer la prévisualisation du pool de dés

## 6.1 Ne pas confondre rang et couleur du dé

Le rang de compétence ne correspond pas directement à une couleur de dé.

Le pool dépend de :

* la valeur de caractéristique ;
* le rang de compétence.

Principe :

* le plus haut des deux donne le nombre total de dés positifs ;
* le plus bas donne le nombre de dés améliorés en dés jaunes ;
* les dés restants sont des dés verts.

Exemples :

```text
Agilité 3 + Distance légère 0 = 3 verts
Agilité 3 + Distance légère 1 = 1 jaune + 2 verts
Agilité 3 + Distance légère 2 = 2 jaunes + 1 vert
Agilité 3 + Distance légère 3 = 3 jaunes
Agilité 3 + Distance légère 4 = 3 jaunes + 1 vert
```

## 6.2 Créer une fonction pure de preview

```js
export function getPositiveDicePoolPreview({ characteristicValue, skillRank }) {
  const totalDice = Math.max(characteristicValue, skillRank);
  const proficiencyDice = Math.min(characteristicValue, skillRank);
  const abilityDice = totalDice - proficiencyDice;

  return {
    ability: abilityDice,
    proficiency: proficiencyDice
  };
}
```

## 6.3 Ajouter une zone optionnelle dans chaque ligne

Dans une première passe, cette zone peut être masquée si la donnée de caractéristique n’est pas facilement disponible.

Structure cible :

```html
<div class="skill__dice-preview" data-tooltip="Dice pool after next rank">
  <span class="die die--proficiency"></span>
  <span class="die die--proficiency"></span>
  <span class="die die--ability"></span>
</div>
```

États CSS :

```css
.die--ability      = vert
.die--proficiency = jaune
.die--boost       = bleu clair
.die--difficulty  = violet
.die--challenge   = rouge
.die--setback     = noir/gris
```

---

# Phase 7 — Interaction utilisateur

## 7.1 Survol d’une compétence

Au `mouseenter` ou `focusin` d’une ligne `.skill`, mettre à jour la console XP :

```text
Selected: Perception
Current Rank: 2
Next Rank: 3
Cost: 15 XP
Type: Career
Status: Purchase Ready
```

## 7.2 Sortie de survol

Au `mouseleave`, deux options :

Option A, simple :

* la console revient à l’état idle.

Option B, meilleure UX :

* la dernière compétence sélectionnée reste affichée jusqu’à ce qu’une autre soit survolée.

Recommandation : Option B.

## 7.3 Clic sur un pip

Avant de modifier la compétence :

* vérifier si le rang ciblé est valide ;
* vérifier si l’achat est possible ;
* vérifier s’il s’agit d’un achat gratuit ;
* afficher une notification si impossible ;
* appliquer la dépense ou le rang gratuit ;
* mettre à jour l’acteur ;
* rafraîchir la feuille.

Pseudo-code :

```js
async onToggleTrainedSkill(event) {
  event.preventDefault();

  const skillElement = event.currentTarget.closest(".skill");
  const skillId = skillElement.dataset.skillId;
  const targetRank = Number(event.target.dataset.rank);

  const state = this.getSkillPurchaseState(skillId, targetRank);

  if (!state.canPurchase) {
    ui.notifications.warn(state.message);
    return;
  }

  await this.actor.purchaseSkillRank(skillId, {
    targetRank,
    cost: state.nextCost,
    isFreePurchase: state.isFreePurchase
  });
}
```

## 7.4 Messages d’erreur

Prévoir des messages clairs :

```text
Not enough XP to purchase this rank.
This skill is already at maximum rank.
You cannot skip skill ranks.
No free career skill selection remaining.
No free specialization skill selection remaining.
```

En français si le système est localisé :

```text
XP insuffisante pour acheter ce rang.
Cette compétence est déjà au rang maximum.
Vous ne pouvez pas sauter de rang.
Aucun choix gratuit de carrière restant.
Aucun choix gratuit de spécialisation restant.
```

---

# Phase 8 — Styles LESS

## 8.1 Ajouter des variables de design

Dans `variables.less` ou le fichier équivalent :

```less
@skill-career: #46c7ff;
@skill-specialization: #00d49a;
@skill-free: #00ff99;
@skill-cost: #c9b36a;
@skill-cost-warning: #ee9b3a;
@skill-locked: #c9593f;

@die-ability: #2f9f4a;
@die-proficiency: #d6b63f;
@die-boost: #5ab4c9;
@die-difficulty: #7b4bb3;
@die-challenge: #b55050;
@die-setback: #222831;
```

Ou, si le projet utilise déjà des CSS custom properties :

```less
.swerpg {
  --skill-career: #46c7ff;
  --skill-specialization: #00d49a;
  --skill-free: #00ff99;
  --skill-cost: #c9b36a;
  --skill-cost-warning: #ee9b3a;
  --skill-locked: #c9593f;

  --die-ability: #2f9f4a;
  --die-proficiency: #d6b63f;
  --die-boost: #5ab4c9;
  --die-difficulty: #7b4bb3;
  --die-challenge: #b55050;
  --die-setback: #222831;
}
```

## 8.2 Styliser la console XP

Créer un bloc LESS dédié :

```less
.swerpg .tab.skills {
  .xp-console {
    margin: 0 auto 0.85rem;
    padding: 0.55rem 0.75rem;
    width: min(760px, 100%);
    border: 1px solid fade(@color-glow, 28%);
    border-radius: 4px;
    background:
      linear-gradient(90deg, fade(@color-bg-dark, 82%), fade(@color-bg, 62%)),
      radial-gradient(circle at 50% 0%, fade(@color-glow, 14%), transparent 58%);
    box-shadow:
      inset 0 0 18px fade(@color-glow, 8%),
      0 0 12px fade(@color-glow, 8%);
  }

  .xp-console__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .xp-console__title {
    color: @color-h1;
    font-family: @font-h1;
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .xp-console__status {
    color: @skill-cost;
    font-size: 0.75rem;
    font-style: italic;
  }

  .xp-console__stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(90px, 1fr));
    gap: 0.45rem;
  }

  .xp-console__stat {
    padding: 0.35rem 0.45rem;
    border: 1px solid fade(@color-glow, 18%);
    background: fade(@color-bg-dark, 34%);
  }

  .xp-console__label {
    display: block;
    color: @color-label;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .xp-console__value {
    display: block;
    color: @color-text;
    font-family: @font-h1;
    font-size: 1rem;
    text-shadow: 0 0 6px fade(@color-glow, 38%);
  }

  .xp-console.is-free .xp-console__status {
    color: @skill-free;
  }

  .xp-console.is-affordable .xp-console__status {
    color: @skill-cost;
  }

  .xp-console.is-locked .xp-console__status,
  .xp-console.is-error .xp-console__status {
    color: @skill-locked;
  }
}
```

Adapter les variables `@color-*` et `@font-*` aux noms réellement disponibles dans le projet.

## 8.3 Styliser les lignes de compétence

Ajouter ou adapter :

```less
.swerpg .tab.skills {
  .skill {
    display: grid;
    grid-template-columns:
      minmax(165px, 1fr)
      44px
      58px
      64px
      132px;
    align-items: center;
    min-height: 1.75rem;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    transition:
      background-color 140ms ease,
      box-shadow 140ms ease,
      transform 140ms ease;

    &:hover,
    &:focus-within {
      background: fade(@color-glow, 8%);
      box-shadow: inset 2px 0 0 fade(@color-glow, 55%);
      transform: translateX(1px);
    }

    &.is-free {
      box-shadow: inset 2px 0 0 fade(@skill-free, 45%);
    }

    &.is-locked {
      opacity: 0.72;
    }
  }

  .skill__identity,
  .name {
    min-width: 0;
  }

  .skill__label,
  .name .label {
    overflow: hidden;
    color: @color-text;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .skill__characteristic,
  .name .abbreviation {
    color: @color-label;
    font-size: 0.72rem;
    font-style: italic;
  }

  .skill__tags {
    display: flex;
    justify-content: center;
    gap: 0.2rem;
  }

  .skill-tag {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 1.1rem;
    height: 1.1rem;
    border: 1px solid currentColor;
    border-radius: 2px;
    font-family: @font-h1;
    font-size: 0.62rem;
    line-height: 1;
  }

  .skill-tag--career {
    color: @skill-career;
    box-shadow: 0 0 6px fade(@skill-career, 25%);
  }

  .skill-tag--specialization {
    color: @skill-specialization;
    box-shadow: 0 0 6px fade(@skill-specialization, 25%);
  }

  .skill__rank {
    color: @color-label;
    font-size: 0.7rem;
    text-align: center;
  }

  .skill__cost {
    text-align: right;
  }

  .skill-cost {
    color: @skill-cost;
    font-family: @font-h1;
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .skill-cost--free {
    color: @skill-free;
    text-shadow: 0 0 6px fade(@skill-free, 42%);
  }

  .skill.is-locked .skill-cost {
    color: @skill-locked;
  }
}
```

---

# Phase 9 — Tests

## 9.1 Tests unitaires recommandés

Si Vitest existe dans le projet, ajouter des tests pour :

```js
getSkillNextRankCost()
getSkillPurchaseState()
getPositiveDicePoolPreview()
```

Cas à tester :

```text
Carrière rang 0 → coût 5
Carrière rang 1 → coût 10
Hors carrière rang 0 → coût 10
Hors carrière rang 1 → coût 15
Rang 5 → achat impossible
XP insuffisante → achat impossible
XP suffisante → achat possible
Choix gratuit carrière disponible → coût 0
Choix gratuit spécialisation disponible → coût 0
Pool caractéristique 3 + skill 0 → 3 verts
Pool caractéristique 3 + skill 2 → 2 jaunes + 1 vert
Pool caractéristique 2 + skill 4 → 2 jaunes + 2 verts
```

## 9.2 Tests visuels manuels

Tester avec plusieurs personnages :

### Cas 1

```text
XP available: 100
Skill rank: 0
Career: true
Free career left: 3
Résultat attendu: FREE affiché
```

### Cas 2

```text
XP available: 5
Skill rank: 1
Career: false
Résultat attendu: coût 15 XP, achat impossible
```

### Cas 3

```text
XP available: 20
Skill rank: 2
Career: true
Résultat attendu: coût 15 XP, achat possible
```

### Cas 4

```text
Skill rank: 5
Résultat attendu: MAX, achat impossible
```

### Cas 5

```text
Skill id: xenology
Résultat attendu: label Xenology ou Xénologie
```

---

# Phase 10 — Critères d’acceptation

L’implémentation est considérée comme correcte si :

* l’onglet Skills reste visuellement cohérent avec le thème Star Wars/datapad ;
* le bandeau XP est lisible et central ;
* chaque compétence affiche son coût de prochain rang ;
* les compétences carrière et spécialisation sont identifiables sans ambiguïté ;
* les achats gratuits sont visibles ;
* les achats impossibles sont visuellement différenciés ;
* le clic sur un pip ne permet pas d’achat invalide ;
* les XP sont correctement décrémentées lors d’un achat payant ;
* les compteurs gratuits sont correctement décrémentés lors d’un achat gratuit ;
* `xenology` n’affiche plus `Piloting Planetary` ;
* aucun autre onglet de la feuille acteur n’est impacté ;
* les tests unitaires passent si le projet en possède ;
* le rendu reste correct sur la largeur actuelle de la feuille.

---

# Phase 11 — Ordre d’implémentation recommandé

Ne pas tout faire en une seule passe.

## Étape 1 — Sécurisation

* Identifier les fichiers.
* Corriger `xenology`.
* Ajouter les fonctions pures de coût et de preview.
* Ajouter les tests unitaires si possible.

## Étape 2 — UX minimale

* Ajouter le coût du prochain rang dans chaque ligne.
* Ajouter les badges `C` et `S`.
* Ajouter les classes d’état :

    * `is-free`
    * `is-affordable`
    * `is-locked`
    * `is-max-rank`

## Étape 3 — Console XP

* Remplacer le bandeau actuel par `xp-console`.
* Brancher les valeurs existantes.
* Mettre à jour la console au survol ou focus d’une compétence.

## Étape 4 — Achat contrôlé

* Intercepter les clics sur les pips.
* Vérifier les conditions d’achat.
* Appliquer coût XP ou rang gratuit.
* Afficher les notifications d’erreur.

## Étape 5 — Dice preview

* Ajouter la fonction de pool.
* Ajouter le rendu compact du pool positif.
* Ne pas bloquer l’intégration principale si cette étape dépend d’une donnée manquante.

---

# Notes importantes pour OpenCode

* Ne pas inventer une nouvelle structure de données si le système possède déjà une logique d’XP ou de compétences.
* Réutiliser les propriétés existantes du modèle acteur autant que possible.
* Si une propriété manque, ajouter une couche de préparation des données dans `getData()` ou équivalent plutôt que de mettre de la logique complexe dans le template.
* La logique métier doit rester côté JS/modèle, pas dans le Handlebars.
* Le template ne doit recevoir que des données prêtes à afficher :

    * `nextCost`
    * `nextRank`
    * `canPurchase`
    * `isFreePurchase`
    * `purchaseReason`
    * `dicePreview`
* Les styles doivent rester confinés à `.swerpg .tab.skills` pour éviter les effets de bord.

Point critique : ne laisse pas OpenCode commencer par la partie “dice preview”. C’est séduisant, mais ce n’est pas le cœur. Le vrai gain UX vient d’abord du coût, des états d’achat et de la console XP.
