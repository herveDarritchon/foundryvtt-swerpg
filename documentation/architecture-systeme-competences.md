# Rapport d'Architecture : Système de Compétences (Skills)

_Analyse technique par l'architecte logiciel senior_

## Table des matières

1. [Vue d'ensemble architecturale](#1-vue-densemble-architecturale)
2. [Structure des données](#2-structure-des-données)
3. [Calcul des valeurs de compétences](#3-calcul-des-valeurs-de-compétences)
4. [Services et Pattern Factory](#4-services-et-pattern-factory)
5. [Utilisation dans les jets de dés (Rolls)](#5-utilisation-dans-les-jets-de-dés-rolls)
6. [Interface utilisateur](#6-interface-utilisateur)
7. [Flux de données et interactions](#7-flux-de-données-et-interactions)
8. [Inventaire complet des fichiers impactés](#8-inventaire-complet-des-fichiers-impactés)
9. [Guide pour nouveaux développeurs](#9-guide-pour-nouveaux-développeurs)

---

## 1. Vue d'ensemble architecturale

Le système de compétences suit une architecture modulaire avec séparation claire entre :

- **Configuration** : Définition des compétences, rangs, catégories
- **Modèles de données** : Schémas FoundryVTT (Data Models)
- **Logique métier** : Calculs, coûts, validation (Lib + Utils)
- **Interface utilisateur** : Sheets, templates Handlebars

### Schéma global

```
Configuration (config/skills.mjs)
         ↓
Modèles de données (models/*.mjs)
         ↓
Logique métier (lib/skills/*.mjs + utils/skill-costs.mjs)
         ↓
Documents Actor (documents/actor.mjs)
         ↓
Interface Utilisateur (applications/sheets/*.mjs + templates/*.hbs)
         ↓
Système de dés (dice/standard-check.mjs)
```

---

## 2. Structure des données

### 2.1 Configuration centrale

**Fichier :** `module/config/skills.mjs`

#### Rangs de compétence (RANKS)

```javascript
RANKS = {
  0: { id: 'untrained', rank: 0, label: '...', cost: 0, spent: 0, bonus: -4, path: false },
  1: { id: 'novice', rank: 1, label: '...', cost: 1, spent: 1, bonus: 0, path: false },
  2: { id: 'apprentice', rank: 2, label: '...', cost: 1, spent: 2, bonus: 2, path: false },
  3: { id: 'specialist', rank: 3, label: '...', cost: 2, spent: 4, bonus: 4, path: true },
  4: { id: 'adept', rank: 4, label: '...', cost: 4, spent: 8, bonus: 8, path: false },
  5: { id: 'master', rank: 5, label: '...', cost: 4, spent: 12, bonus: 12, path: true },
}
```

**Propriétés clés :**

- `cost` : Coût en points de compétence pour acquérir le rang
- `spent` : Points totaux dépensés pour atteindre ce rang
- `bonus` : Bonus numérique ajouté au score de compétence
- `path` : Indique si une spécialisation est requise (rangs 3 et 5)

#### Catégories de compétences (CATEGORIES)

```javascript
CATEGORIES = {
  exp: { label: 'Exploration', color: Color.from('#81cc44'), defaultIcon: 'icons/skills/no-exp.jpg' },
  kno: { label: 'Knowledge', color: Color.from('#6c6cff'), defaultIcon: 'icons/skills/no-kno.jpg' },
  soc: { label: 'Social', color: Color.from('#ab3fe8'), defaultIcon: 'icons/skills/no-soc.jpg' },
}
```

#### Définition des compétences (SKILLS)

12 compétences réparties en 3 catégories, chacune avec :

- `id` : Identifiant unique
- `category` : Catégorie (exp, kno, soc)
- `characteristics` : Tableau de 2 caractéristiques associées [primaire, secondaire]

**Exemple :**

```javascript
athletics: {
  id: 'athletics',
  category: 'exp',
  characteristics: ['strength', 'dexterity']
}
```

### 2.2 Modèle de compétence pour JournalEntry (SwerpgSkill)

**Fichier :** `module/models/skill.mjs`

**Classe :** `SwerpgSkill extends foundry.abstract.TypeDataModel`

**Schema :**

```javascript
{
  skillId: StringField (lié à SYSTEM.SKILLS),
  overview: HTMLField,
  ranks: SchemaField (descriptions pour chaque rang: untrained → master),
  paths: SchemaField (3 chemins de spécialisation avec id, name, overview, ranks)
}
```

**Méthode clé :** `static async initialize()`

- Charge les données depuis le JournalEntry configuré
- Fusionne les données du journal avec la configuration SYSTEM.SKILLS
- Initialise les icônes, descriptions, chemins de spécialisation

### 2.3 Modèle de compétence pour Acteur (ActorType)

**Fichier :** `module/models/actor-type.mjs`

**Schema pour chaque compétence d'acteur :**

```javascript
skills: {
  [skillId]: {
    rank: {
      base: NumberField (initial: 0, max: 5),              // Rang de base (espèce)
      careerFree: NumberField (initial: 0, max: 5),         // Rang gratuit carrière
      specializationFree: NumberField (initial: 0, max: 5), // Rang gratuit spécialisation
      trained: NumberField (initial: 0, max: 5)            // Rang acheté avec XP
    },
    path: StringField (spécialisation choisie)
  }
}
```

**Valeur totale du rang :** `rank.value = base + careerFree + specializationFree + trained`

---

## 3. Calcul des valeurs de compétences

### 3.1 Préparation des compétences (\_prepareSkill)

**Fichier :** `module/models/actor-type.mjs` (lignes 214-222)

```javascript
_prepareSkill(skillId, skill) {
  const config = SYSTEM.SKILLS[skillId];

  // Bonus de caractéristique (plus haute des 2 caractéristiques)
  const ab = skill.abilityBonus = this.parent.getAbilityBonus(config.characteristics);

  // Bonus de rang (depuis RANKS)
  const sb = skill.skillBonus = SYSTEM.SKILL.RANKS[r].bonus;

  // Bonus d'enchantement (actuellement 0)
  const eb = skill.enchantmentBonus = 0;

  // Score total
  const s = skill.score = ab + sb + eb;

  // Valeur passive (pour tests opposés)
  skill.passive = SYSTEM.PASSIVE_BASE + s;
}
```

### 3.2 Calcul du bonus de caractéristique (getAbilityBonus)

**Fichier :** `module/documents/actor-origin.mjs` (lignes 734-738)

```javascript
getAbilityBonus(scaling) {
  const abilities = this.system.abilities;
  if (scaling == null || scaling.length === 0) return 0;
  // Moyenne arrondie des caractéristiques divisée par 2
  return Math.round(scaling.reduce((x, t) => x + abilities[t].value, 0) / (scaling.length * 2));
}
```

### 3.3 Coût des rangs (Skill Costs)

**Fichier :** `module/utils/skill-costs.mjs`

Règle FFG Edge of the Empire :

- Compétence de carrière : `rangSuivant * 5` XP
- Compétence hors carrière : `rangSuivant * 5 + 5` XP

```javascript
getSkillNextRankCost({ rank, isCareer, maxRank = 5 }) {
  const nextRank = rank + 1;
  if (nextRank > maxRank) return null;
  const baseCost = nextRank * 5;
  return isCareer ? baseCost : baseCost + 5;
}
```

**Fichier :** `module/lib/skills/skill-cost-calculator.mjs`

```javascript
class SkillCostCalculator {
  #calculateTrainCost(value) {
    const baseCost = value * 5
    return this.isSpecialized ? baseCost : baseCost + 5
  }

  #skillIsSpecialized() {
    return this.skill.isCareer || this.skill.isSpecialization
  }
}
```

---

## 4. Services et Pattern Factory

### 4.1 SkillFactory (Fabrique de compétences)

**Fichier :** `module/lib/skills/skill-factory.mjs`

**Classe :** `SkillFactory`

**Méthode statique :** `static build(actor, skillId, params, options)`

**Logique de création :**

1. **Hors création** : toujours `TrainedSkill`
2. **En création :**
   - Si pas de compétence gratuite disponible : `TrainedSkill`
   - Si compétence de carrière gratuite : `CareerFreeSkill`
   - Si compétence de spécialisation gratuite : `SpecializationFreeSkill`
   - Si les deux : priorité carrière puis spécialisation
3. **Gestion d'erreur** : `ErrorSkill`

### 4.2 Hiérarchie des classes de compétence

**Classe de base :** `Skill` (`module/lib/skills/skill.mjs`)

- Propriétés : actor, data, isCreation, isCareer, isSpecialization, action, options, evaluated
- Méthodes abstraites : `process()`, `updateState()`, `#computeFreeSkillRankAvailable()`

**Sous-classes :**

| Classe                    | Fichier                                           | Rôle                             |
| ------------------------- | ------------------------------------------------- | -------------------------------- |
| `TrainedSkill`            | `module/lib/skills/trained-skill.mjs`             | Achat normal avec XP             |
| `CareerFreeSkill`         | `module/lib/skills/career-free-skill.mjs`         | Rangs gratuits de carrière       |
| `SpecializationFreeSkill` | `module/lib/skills/specialization-free-skill.mjs` | Rangs gratuits de spécialisation |
| `ErrorSkill`              | `module/lib/skills/error-skill.mjs`               | Gestion d'erreurs                |

**Détails des sous-classes :**

1. **TrainedSkill**
   - `process()` : incrémente/décrémente `trained`, calcule le coût avec `SkillCostCalculator`
   - `updateState()` : met à jour l'acteur via `actor.update()`
   - Limites : max rang 2 en création, max rang 5 en jeu

2. **CareerFreeSkill**
   - `process()` : incrémente/décrémente `careerFree` (max 1 par compétence)
   - Met à jour `freeSkillRanks.career.spent`
   - Pas de coût en XP

3. **SpecializationFreeSkill**
   - `process()` : incrémente/décrémente `specializationFree` (max 1 par compétence)
   - Met à jour `freeSkillRanks.specialization.spent`

---

## 5. Utilisation dans les jets de dés (Rolls)

### 5.1 Roll de compétence (rollSkill)

**Fichier :** `module/documents/actor.mjs` (lignes 874-911)

```javascript
async rollSkill(skillId, { banes = 0, boons = 0, dc, rollMode, dialog = false } = {}) {
  const skill = this.system.skills[skillId];

  const rollData = {
    actorId: this.id,
    ability: skill.abilityBonus,    // Bonus de caractéristique
    skill: skill.skillBonus,        // Bonus de rang de compétence
    enchantment: skill.enchantmentBonus,
    type: skillId,
    banes: {...},
    boons: {...},
    dc: dc
  };

  // Hooks de talents
  this.callActorHooks('prepareStandardCheck', rollData);
  this.callActorHooks('prepareSkillCheck', skill, rollData);

  // Création du jet
  const sc = new StandardCheck(rollData);

  if (dialog) await sc.dialog({ title, flavor, rollMode });
  await sc.toMessage({ flavor, flags: { swerpg: { skill: skillId } } });
  return sc;
}
```

### 5.2 StandardCheck (Système de dés)

**Fichier :** `module/dice/standard-check.mjs`

**Formule :** `3d8 + @ability + @skill + @enchantment`

**Mécanique :**

- **Boons** : augmentent la taille des dés (d8 → d10 → d12)
- **Banes** : diminuent la taille des dés (d8 → d6 → d4)
- **Max Boons/Banes** : définis dans `SYSTEM.dice.MAX_BOONS`

**Résultats :**

- `isSuccess` : total > DC
- `isCriticalSuccess` : total > DC + (criticalSuccessThreshold ?? 6)
- `isFailure` : total <= DC
- `isCriticalFailure` : total < DC - (criticalFailureThreshold ?? 6)

### 5.3 Prévisualisation du pool de dés

**Fichier :** `module/utils/skill-costs.mjs`

```javascript
getPositiveDicePoolPreview({ characteristicValue, skillRank }) {
  const totalDice = Math.max(characteristicValue, skillRank);
  const proficiencyDice = Math.min(characteristicValue, skillRank);
  const abilityDice = totalDice - proficiencyDice;

  return { ability: abilityDice, proficiency: proficiencyDice };
}
```

---

## 6. Interface utilisateur

### 6.1 Feuilles de personnage

**CharacterSheet :** `module/applications/sheets/character-sheet.mjs`

- Classe : `CharacterSheet extends SwerpgBaseActorSheet`
- Actions : `toggleTrainedSkill`, `skillDecrease`, `skillIncrease`, `skillRoll`, `skillConfig`

**HeroSheet :** `module/applications/sheets/hero-sheet.mjs`

- Classe : `HeroSheet extends SwerpgBaseActorSheet`
- Actions similaires pour les héros

### 6.2 Configuration de compétence (SkillConfig)

**Fichier :** `module/applications/config/skill.mjs`

**Classe :** `SkillConfig extends api.HandlebarsApplicationMixin(api.DocumentSheetV2)`

**Fonctionnalités :**

- Choix de spécialisation (choosePath)
- Augmentation/diminution de rang (increase/decrease)
- Affichage des rangs acquis et non-acquis
- Lien vers les règles (rules)

### 6.3 Templates Handlebars

| Template                 | Chemin                                             | Rôle                               |
| ------------------------ | -------------------------------------------------- | ---------------------------------- |
| `skills.hbs`             | `templates/sheets/actor/skills.hbs`                | Onglet principal des compétences   |
| `character-skill.hbs`    | `templates/sheets/partials/character-skill.hbs`    | Ligne individuelle de compétence   |
| `skill.hbs`              | `templates/sheets/actor/skill.hbs`                 | Vue détaillée d'une compétence     |
| `skill-modifier-tag.hbs` | `templates/sheets/partials/skill-modifier-tag.hbs` | Affichage des tags de modification |

---

## 7. Flux de données et interactions

### 7.1 Achat d'une compétence (purchaseSkill)

**Fichier :** `module/documents/actor.mjs` (lignes 1852-1869)

```javascript
async purchaseSkill(skillId, delta = 1) {
  delta = Math.sign(delta);
  const skill = this.system.skills[skillId];

  // Validation
  this.canPurchaseSkill(skillId, delta, true);

  // Mise à jour du rang
  const rank = skill.rank + delta;
  const update = { [`system.skills.${skillId}.rank`]: rank };

  // Si rang 3, reset du chemin de spécialisation
  if (rank === 3) update[`system.skills.${skillId}.path`] = null;

  return this.update(update);
}
```

### 7.2 Validation d'achat (canPurchaseSkill)

Vérifie :

- Présence d'un background (pour l'achat)
- Rang maximum (5)
- Choix de spécialisation requis pour rang 3+
- Disponibilité des points (XP ou gratuits)

### 7.3 Préparation des compétences pour l'Actor

**Hero** (`module/models/hero.mjs`) :

```javascript
_prepareSkills() {
  let pointsSpent = 0;
  for (const [skillId, skill] of Object.entries(this.skills)) {
    this._prepareSkill(skillId, skill);
    pointsSpent += skill.spent;
  }
  // Mise à jour des points disponibles
  this.points.skill.spent = pointsSpent;
  this.points.skill.available = this.points.skill.total - pointsSpent;
}
```

**Character** (`module/models/character.mjs`) :

- `_applyFreeSkillSpecies()` : applique les compétences gratuites de l'espèce (base = 1)
- Préparation via `_prepareSkills()` et `_prepareSkill()`

### 7.4 Diagramme de flux : Achat d'une compétence

```
UI (Clic "+") → character-sheet.hbs
    ↓
Sheet._onClickAction() → skillIncrease
    ↓
actor.purchaseSkill(skillId, 1)
    ↓
actor.canPurchaseSkill() [Validation]
    ↓
SkillFactory.build(actor, skillId, params, options)
    ↓
[TrainedSkill | CareerFreeSkill | SpecializationFreeSkill].process()
    ↓
actor.update() → Foundry reactivity
    ↓
prepareDerivedData() → _prepareSkills() → _prepareSkill()
    ↓
UI refresh (automatique via Foundry)
```

### 7.5 Diagramme de flux : Jet de compétence

```
UI (Clic nom compétence) → skillRoll action
    ↓
HeroSheet._onClickAction() → actor.rollSkill(skillId, {dialog: true})
    ↓
actor.rollSkill() prépare rollData
    ↓
Appel hooks: prepareStandardCheck, prepareSkillCheck
    ↓
new StandardCheck(rollData) → Formule: 3d8 + ability + skill
    ↓
sc.dialog() → Affichage dialog options
    ↓
sc.toMessage() → Envoi dans le chat
```

---

## 8. Inventaire complet des fichiers impactés

### Configuration et Constantes

- `module/config/skills.mjs` - Définition RANKS, CATEGORIES, SKILLS

### Modèles de Données (Models)

- `module/models/skill.mjs` - SwerpgSkill (JournalEntryPage)
- `module/models/actor-type.mjs` - SwerpgActorType (schema skills, \_prepareSkill)
- `module/models/actor-type-origin.mjs` - SwerpgActorTypeOrigin (schema alternatif)
- `module/models/hero.mjs` - SwerpgHero (\_prepareSkills, \_prepareSkill)
- `module/models/character.mjs` - SwerpgCharacter (\_applyFreeSkillSpecies, \_prepareSkills)
- `module/models/character-origin.mjs` - SwerpgCharacterOrigin (\_prepareSkills, \_prepareSkill)

### Logique Métier (Lib)

- `module/lib/skills/skill.mjs` - Classe abstraite Skill
- `module/lib/skills/skill-factory.mjs` - SkillFactory.build()
- `module/lib/skills/trained-skill.mjs` - TrainedSkill
- `module/lib/skills/career-free-skill.mjs` - CareerFreeSkill
- `module/lib/skills/specialization-free-skill.mjs` - SpecializationFreeSkill
- `module/lib/skills/error-skill.mjs` - ErrorSkill
- `module/lib/skills/skill-cost-calculator.mjs` - SkillCostCalculator

### Utilitaires (Utils)

- `module/utils/skill-costs.mjs` - getSkillNextRankCost, getSkillPurchaseState, getPositiveDicePoolPreview

### Documents (Actor)

- `module/documents/actor.mjs` - purchaseSkill, canPurchaseSkill, rollSkill, getAbilityBonus
- `module/documents/actor-origin.mjs` - purchaseSkill (origin), rollSkill, getAbilityBonus

### Interface Utilisateur (Applications/Sheets)

- `module/applications/sheets/base-actor-sheet.mjs` - SwerpgBaseActorSheet (base)
- `module/applications/sheets/character-sheet.mjs` - CharacterSheet
- `module/applications/sheets/hero-sheet.mjs` - HeroSheet
- `module/applications/config/skill.mjs` - SkillConfig

### Système de Dés (Dice)

- `module/dice/standard-check.mjs` - StandardCheck (3d8 + ability + skill)

### Templates (Handlebars)

- `templates/sheets/actor/skills.hbs` - Onglet skills
- `templates/sheets/partials/character-skill.hbs` - Ligne skill
- `templates/sheets/actor/skill.hbs` - Vue détaillée
- `templates/sheets/skill-edit.hbs` - Édition
- `templates/sheets/skill-view.hbs` - Vue
- `templates/sheets/partials/skill-modifier-tag.hbs` - Tag

### Tests

- `tests/lib/skills/skill-factory.test.mjs`
- `tests/lib/skills/trained-skill.test.mjs`
- `tests/lib/skills/career-free-skill.test.mjs`
- `tests/lib/skills/specialization-free-skill.test.mjs`
- `tests/lib/skills/error-skill.test.mjs`
- `tests/lib/skills/skill-cost-calculator.test.mjs`
- `tests/utils/skill-costs.test.mjs`
- `tests/utils/skills/skill.mjs`

### Styles

- `styles/skill.less`

---

## 9. Guide pour nouveaux développeurs

### 9.1 Points clés à comprendre

1. **Pattern Factory** : Le système utilise `SkillFactory` pour créer le bon type d'objet skill selon le contexte (création vs jeu, carrière vs spécialisation).

2. **Deux systèmes d'actors** : `actor.mjs` et `actor-origin.mjs` coexistent avec des implémentations similaires mais distinctes.

3. **Calcul de caractéristique** : La méthode `getAbilityBonus()` utilise la moyenne des deux caractéristiques liées à la compétence, divisée par 2.

4. **Gestion des rangs** : Quatre sources de rangs (base, careerFree, specializationFree, trained) permettent une granularité fine.

5. **Système de dés unique** : `StandardCheck` utilise 3d8 modifiés par les boons/banes qui changent la taille des dés.

6. **Préparation des données** : Les méthodes `_prepareSkill()` calculent les valeurs dérivées (score, passive) lors du `prepareDerivedData()`.

### 9.2 Où commencer ?

1. **Comprendre la config** : Lire `module/config/skills.mjs`
2. **Voir le modèle de données** : Explorer `module/models/actor-type.mjs` (schema skills)
3. **Comprendre le calcul** : Étudier `_prepareSkill()` dans `module/models/actor-type.mjs`
4. **Voir le pattern Factory** : Lire `module/lib/skills/skill-factory.mjs`
5. **Comprendre l'achat** : Suivre le flux dans `module/documents/actor.mjs` (purchaseSkill)
6. **Voir l'UI** : Explorer `module/applications/sheets/hero-sheet.mjs` et les templates

### 9.3 Tests

Le système est bien testé avec Vitest. Les tests se trouvent dans `tests/lib/skills/` et `tests/utils/`.

Pour lancer les tests :

```bash
npm run test
```

### 9.4 Règles métier importantes

- **Rang max** : 5
- **Spécialisation requise** : Rangs 3 et 5
- **Coût carrière** : rang × 5 XP
- **Coût hors carrière** : (rang × 5) + 5 XP
- **Limite création** : Rang max 2 sans XP
- **Bonus caractéristique** : Moyenne arrondie des 2 caractéristiques / 2

---

## Conclusion

Ce système est robuste, bien testé, et suit les règles de Edge of the Empire (FFG) adaptées pour Foundry VTT. L'architecture modulaire permet une maintenance facile et une extension possible des fonctionnalités.

_Rapport généré le 3 mai 2026 par l'architecte logiciel senior_
