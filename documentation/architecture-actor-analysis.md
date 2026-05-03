# Rapport d'Analyse Architecturale : `module/documents/actor.mjs`
*Analyse par l'architecte logiciel senior*

## Table des matières
1. [Vue d'ensemble et métriques](#1-vue-densemble-et-métriques)
2. [Analyse des responsabilités](#2-analyse-des-responsabilités)
3. [Problèmes d'architecture identifiés](#3-problèmes-darchitecture-identifiés)
4. [Code mort et duplications](#4-code-mort-et-duplications)
5. [Comparaison avec actor-origin.mjs](#5-comparaison-avec-actor-originmjs)
6. [Analyse de la couverture de tests](#6-analyse-de-la-couverture-de-tests)
7. [Recommandations de refactoring](#7-recommandations-de-refactoring)
8. [Plan d'action proposé](#8-plan-daction-proposé)

---

## 1. Vue d'ensemble et métriques

### Statistiques du fichier
- **Taille** : 2490 lignes
- **Complexité** : Très élevée (une seule classe avec ~40 méthodes publiques)
- **Responsabilités** : ~15 domaines différents mélangés
- **Code commenté/TODO** : ~10 blocs (environ 50 lignes mortes)

### Structure actuelle
```
SwerpgActor (2490 lignes)
├── Getters (12) : species, experiencePoints, freeSkillRanks, abilities, background, etc.
├── Préparation des données (5) : prepareBaseData, prepareEmbeddedDocuments, etc.
├── Gestion des Talents (4) : #prepareTalents, addTalent, resetTalents, syncTalents
├── Équipement (6) : _prepareArmor, _prepareWeapons, equipArmor, equipWeapon, etc.
├── Actions et Combats (10) : prepareAction, useAction, weaponAttack, skillAttack, etc.
├── Ressources (5) : alterResources, _getRestData, modifyResource, etc.
├── Création de personnage (5) : purchaseSkill, purchaseCharacteristic, levelUp, etc.
├── Gestion des tours de combat (4) : onStartTurn, onEndTurn, onLeaveCombat, etc.
├── Effets actifs (3) : _prepareEffects, expireEffects, toggleStatusEffect
├── Spells (2) : #prepareSpells, castSpell
├── Database hooks (3) : _preCreate, _preUpdate, _onUpdate
└── Utilitaires divers (4) : getAbilityBonus, hasItem, canLearnIconicSpell, etc.
```

---

## 2. Analyse des responsabilités

### Violation du Principle de Responsabilité Unique (SRP)

La classe `SwerpgActor` viole flagramment le principe SRP. Elle gère :

| Domaine | Méthodes | Problème |
|--------|----------|---------|
| **Préparation des données** | `prepareBaseData`, `prepareEmbeddedDocuments`, `#prepareTraining`, `#prepareEquipment`, `#prepareActions`, etc. | ✅ Correct ici, mais trop de méthodes privées |
| **Système de dés/rolls** | `rollSkill`, `testDefense`, `applyTargetBoons`, `prepareAction` | ⚠️ Devrait être dans `dice/` |
| **Gestion de combat** | `onStartTurn`, `onEndTurn`, `onLeaveCombat`, `applyDamageOverTime`, `expireEffects` | ⚠️ Devrait être extrait dans `combat/` |
| **Équipement** | `_prepareArmor`, `_prepareWeapons`, `equipArmor`, `equipWeapon`, `#equipWeapon`, `#unequipWeapon` | ⚠️ Devrait être dans `equipment/` |
| **Création personnage** | `purchaseSkill`, `canPurchaseSkill`, `purchaseCharacteristic`, `canPurchaseCharacteristic`, `levelUp` | ❌ **Doublon avec `lib/skills/` et `lib/characteristics/`** |
| **Gestion des talents** | `#prepareTalents`, `addTalent`, `resetTalents`, `syncTalents`, `addTalentWithXpCheck` | ⚠️ Devrait être dans `talents/` |
| **Gestion des ressources** | `alterResources`, `modifyResource`, `_getRestData`, `rest`, `#trackHeroismDamage` | ⚠️ Devrait être dans `resources/` |
| **Spells** | `#prepareSpells`, `castSpell` | ⚠️ Devrait être dans `spells/` |
| **Effets actifs** | `_prepareEffects`, `toggleStatusEffect`, `#applyOutcomeEffects` | ⚠️ Mélangé avec la logique métier |

---

## 3. Problèmes d'architecture identifiés

### 3.1 Taille excessive du fichier
**Problème** : 2490 lignes dans un seul fichier.
- Difficulté de lecture et maintenance
- Conflits Git fréquents
- Tests unitaires difficiles à écrire

**Solution** : Extraire en modules séparés (voir section 7).

### 3.2 Duplication de logique avec `lib/skills/`

**Problème majeur** : La méthode `purchaseSkill` (lignes 1852-1869) et `canPurchaseSkill` (lignes 1881-1923) dupliquent la logique déjà présente dans `lib/skills/`.

**Comparaison** :

| Aspect | `actor.mjs` (lignes 1852-1923) | `lib/skills/` |
|--------|---------------------------|-----------------|
| Création de l'objet skill | ❌ Absente (met à jour directement) | ✅ `SkillFactory.build()` |
| Validation des règles | ⚠️ Partielle dans `canPurchaseSkill` | ✅ Complète dans `*Skill.process()` |
| Calcul des coûts | ❌ Absent | ✅ `SkillCostCalculator` |
| Gestion des erreurs | ⚠️ `ui.notifications.warn()` | ✅ `ErrorSkill` avec messages |
| Mise à jour BDD | ✅ Présent | ✅ `updateState()` |

**Code dupliqué dans `actor.mjs`** :
```javascript
// Lignes 1852-1869 : purchaseSkill()
async purchaseSkill(skillId, delta = 1) {
  delta = Math.sign(delta);
  const skill = this.system.skills[skillId];
  if (!skill) return;
  
  // Validation partielle
  try {
    this.canPurchaseSkill(skillId, delta, true);
  } catch (err) {
    return ui.notifications.warn(err);
  }
  
  // Mise à jour directe (contrairement à lib/skills qui utilise process())
  const rank = skill.rank + delta;
  const update = { [`system.skills.${skillId}.rank`]: rank };
  if (rank === 3) update[`system.skills.${skillId}.path`] = null;
  return this.update(update);
}
```

**Problème** : Cette méthode ne utilise pas `SkillFactory`, `TrainedSkill`, etc. Elle contourne tout le système de classes que vous avez construit dans `lib/skills/`.

### 3.3 Duplication avec `actor-origin.mjs`

**Problème** : Il existe deux systèmes d'actors (`actor.mjs` et `actor-origin.mjs`) avec des méthodes dupliquées.

Méthodes présentes dans les deux fichiers :
- `rollSkill()`
- `getAbilityBonus()` (⚠️ **Bug dans actor.mjs ligne 763-768** : retourne toujours `1` !)
- `castSpell()`
- `weaponAttack()`
- `testDefense()`
- `applyTargetBoons()`
- `alterResources()`
- `rest()`

**Bug identifié ligne 763-768** :
```javascript
getAbilityBonus(scaling) {
  const abilities = this.system.abilities;
  if (scaling == null || scaling.length === 0) return 0;
  /*        return Math.round(scaling.reduce((x, t) => x + abilities[t].value, 0) / (scaling.length * 2));*/
  return 1; // <-- BUG : Retourne toujours 1 au lieu du calcul !
}
```

Le calcul est commenté et la fonction retourne toujours `1`. C'est un bug majeur qui casse le système de compétences.

---

## 4. Code mort et duplications

### 4.1 Code commenté (mort)

| Lignes | Description | Action recommandée |
|--------|-------------|---------------------|
| 369 | `// Natural: Math.clamp(...)` TODO temporaire | Supprimer si périmé |
| 390 | `accessories: {}, // TODO: Equipped Accessories` | Implémenter ou supprimer |
| 514-515 | `// Mh.system.prepareEquippedData();` | Supprimer |
| 521-535 | Sections commentées (Range, Free Hand, etc.) | Créer des tickets ou supprimer |
| 684-691 | Grand bloc `if (this.type === "character"...` | Supprimer le code mort |
| 1221 | `// Updates["system.resources.heroism.value"] = 0;` | Supprimer |
| 2271-2273 | `// TODO update size of active tokens` et `// this.#replenishResources...` | Implémenter ou supprimer |

### 4.2 Duplication de méthodes

**`getAbilityBonus()`** existe dans :
- `module/documents/actor.mjs` (ligne 763) - **Buggy : retourne toujours 1**
- `module/documents/actor-origin.mjs` - (à vérifier)
- `module/lib/skills/trained-skill.mjs` utilise `SkillCostCalculator`

**`purchaseSkill()`** devrait utiliser `SkillFactory` mais ne le fait pas.

---

## 5. Comparaison avec `actor-origin.mjs`

### Architecture à double système

Le projet a deux implémentations d'Actor :
1. `actor.mjs` (2490 lignes) - "Nouvelle" version ?
2. `actor-origin.mjs` (2322 lignes) - Ancienne version ?

**Problème** : Cette dualité crée :
- Maintenance double
- Incohérences entre les deux (comme le bug `getAbilityBonus`)
- Confusion pour les nouveaux développeurs

**Recommandation** : Choisir un seul système et migrer l'autre vers celui-ci, ou créer une vraie hiérarchie de classes avec une base commune.

---

## 6. Analyse de la couverture de tests

### État actuel
En cherchant dans `tests/documents/`, je ne vois pas de fichier de test dédié à `actor.mjs`.

**Problèmes** :
1. **Aucun test unitaire** pour une classe de 2490 lignes
2. **Aucun test** pour les méthodes critiques (`purchaseSkill`, `canPurchaseSkill`, `alterResources`)
3. **Aucun test** pour les hooks de combat (`onStartTurn`, `onEndTurn`)
4. **Bug `getAbilityBonus`** non détecté faute de tests

### Tests manquants
- `tests/documents/actor.mjs` - Tests des méthodes publiques
- `tests/documents/actor-creation.test.mjs` - Tests de création de personnage
- `tests/documents/actor-combat.test.mjs` - Tests des mécaniques de combat
- `tests/documents/actor-equipment.test.mjs` - Tests d'équipement

---

## 7. Recommandations de refactoring

### 7.1 Extraire les modules métier

**Structure proposée** :
```
module/
├── documents/
│   ├── actor.mjs (réduit à ~300 lignes)
│   ├── actor-base.mjs (classe de base commune)
│   └── actor-mixins/
│       ├── actor-talents.mjs
│       ├── actor-equipment.mjs
│       ├── actor-combat.mjs
│       ├── actor-spells.mjs
│       └── actor-resources.mjs
├── lib/
│   ├── skills/ (existant - bien structuré)
│   ├── characteristics/ (existant)
│   ├── combat/ (à créer)
│   ├── equipment/ (à créer)
│   └── resources/ (à créer)
└── models/
    └── (existant)
```

### 7.2 Corriger l'utilisation de `lib/skills/`

**Modification de `purchaseSkill()`** (lignes 1852-1869) :

```javascript
// AVANT (actuel - ne utilise pas le système lib/skills)
async purchaseSkill(skillId, delta = 1) {
  delta = Math.sign(delta);
  const skill = this.system.skills[skillId];
  if (!skill) return;
  // ... validation partielle ...
  const rank = skill.rank + delta;
  const update = { [`system.skills.${skillId}.rank`]: rank };
  return this.update(update);
}

// APRÈS (utilise lib/skills correctement)
async purchaseSkill(skillId, delta = 1) {
  delta = Math.sign(delta);
  const skill = this.system.skills[skillId];
  if (!skill) return;
  
  // Utiliser SkillFactory comme dans le reste du système
  const isCareer = /* déterminer si career skill */;
  const isSpecialization = /* déterminer si specialization skill */;
  const isCreation = this.isL0;
  
  const skillObj = SkillFactory.build(this, skillId, {
    action: delta > 0 ? 'train' : 'forget',
    isCreation,
    isCareer,
    isSpecialization,
  }, {});
  
  const evaluated = skillObj.process();
  if (evaluated instanceof ErrorSkill) {
    ui.notifications.warn(evaluated.options.message);
    return;
  }
  
  return evaluated.updateState();
}
```

### 7.3 Corriger le bug `getAbilityBonus()`

**Ligne 763-768** :
```javascript
// BUG : Retourne toujours 1
getAbilityBonus(scaling) {
  const abilities = this.system.abilities;
  if (scaling == null || scaling.length === 0) return 0;
  /* return Math.round(scaling.reduce((x, t) => x + abilities[t].value, 0) / (scaling.length * 2));*/
  return 1;
}

// CORRECTION
getAbilityBonus(scaling) {
  const abilities = this.system.abilities;
  if (scaling == null || scaling.length === 0) return 0;
  return Math.round(scaling.reduce((x, t) => x + abilities[t].value, 0) / (scaling.length * 2));
}
```

### 7.4 Unifier `actor.mjs` et `actor-origin.mjs`

**Approche recommandée** :
1. Créer `SwerpgActorBase` avec les méthodes communes
2. `SwerpgActor` et `SwerpgActorOrigin` héritent de la base
3. Supprimer les doublons
4. Corriger le bug `getAbilityBonus` dans la classe de base

---

## 8. Plan d'action proposé

### Phase 1 : Corrections critiques (immédiat)
1. ✅ **Corriger `getAbilityBonus()`** (ligne 763-768) - Bug bloquant
2. ✅ **Corriger `purchaseSkill()`** pour utiliser `SkillFactory`
3. ✅ **Supprimer le code mort** commenté (environ 50 lignes)

### Phase 2 : Refactoring modulaire (court terme)
1. Extraire `actor-talents.mjs` (méthodes talents)
2. Extraire `actor-equipment.mjs` (méthodes équipement)
3. Extraire `actor-combat.mjs` (méthodes combat)
4. Créer les tests unitaires correspondants

### Phase 3 : Unification des Actors (moyen terme)
1. Créer `SwerpgActorBase`
2. Migrer `actor-origin.mjs` vers la nouvelle structure
3. Supprimer les doublons
4. Ajouter des tests d'intégration

### Phase 4 : Amélioration continue (long terme)
1. Extraire `actor-resources.mjs`
2. Extraire `actor-spells.mjs`
3. Documenter l'API publique
4. Atteindre 80% de couverture de tests

---

## Conclusion

Le fichier `actor.mjs` souffre de plusieurs problèmes architecturaux majeurs :

1. **Taille** : 2490 lignes (cible : <500 lignes par fichier)
2. **Responsabilités** : ~15 domaines mélangés (SRP violé)
3. **Doublons** : Avec `lib/skills/`, `actor-origin.mjs`, et dans le fichier lui-même
4. **Bugs** : `getAbilityBonus()` retourne toujours `1`
5. **Code mort** : ~50 lignes commentées
6. **Tests** : Aucun test unitaire pour 2490 lignes de code

**Priorité absolue** : Corriger le bug `getAbilityBonus()` et faire utiliser `purchaseSkill()` le système `lib/skills/` existant.

**Gain attendu** : Réduction de la complexité, meilleure maintenabilité, détection de bugs via tests.
