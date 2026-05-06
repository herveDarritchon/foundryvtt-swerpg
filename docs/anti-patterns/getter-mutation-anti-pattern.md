# Anti-Pattern : Getter Returning Mutable References

## Status
🚨 **Active - To Be Fixed**

## Severity
**High** - Impacts architecture integrity and testability

## Discovery Context
- **Date** : 2026-05-06
- **Identified by** : Analysis of failing tests on actor system
- **Affected components** : Actor document, Skill/Talent/Characteristic processing classes

---

## Description

L'utilisation de getters qui retournent des références directes vers des objets internes, suivie d'une mutation directe de ces objets par les consommateurs, constitue un anti-pattern architectural majeur.

### Le principe violé

> **Un getter doit être une vue en lecture seule, pas un chemin de mutation déguisé.**

---

## Code en faute

### 1. Les Getters dans `module/documents/actor.mjs`

```javascript
// Lignes 81-84
get experiencePoints() {
  if (this.type !== SYSTEM.ACTOR_TYPE.character.type) return { gained: 0, spent: 0, startingExperience: 0 }
  return this.system.progression.experience
}

// Lignes ~140-142
get freeSkillRanks() {
  return this.system.progression.freeSkillRanks
}
```

**Problème** : Ces getters retournent une référence directe vers les données internes de `system`.

### 2. La Mutation dans les classes de traitement

**Dans `module/lib/skills/trained-skill.mjs` (ligne 50) :**
```javascript
this.actor.experiencePoints.spent = experiencePointsSpent
```

**Dans `module/lib/skills/career-free-skill.mjs` (ligne 49) :**
```javascript
this.actor.freeSkillRanks.career.spent = careerFreeRankSpent
```

**Dans `module/lib/skills/specialization-free-skill.mjs` (ligne 49) :**
```javascript
this.actor.freeSkillRanks.specialization.spent = specializationFreeRankSpent
```

---

## Pourquoi c'est un Anti-Pattern

### 1. **Violation de l'encapsulation**
Le principe d'encapsulation veut que l'état interne d'un objet ne soit modifiable que par ses propres méthodes. Ici, `TrainedSkill` modifie l'état de l'acteur sans passer par une API contrôlée.

### 2. **Getters = Lecture, pas Écriture**
En convention logicielle (JavaScript/TypeScript), un getter est une méthode d'accès en lecture. L'écriture doit se faire par des méthodes dédiées (`updateX()`, `setX()`) ou des setters.

### 3. **Dépendance au détail d'implémentation**
Ça "marche" uniquement parce que FoundryVTT utilise un `Proxy` pour `system`. Si cette implémentation change (ex: migration vers une structure immutable), tout casserait.

### 4. **Non-testabilité**
Les tests ne peuvent pas mocker proprement ces getters car :
- Chaque appel au getter retourne un nouvel objet (ou le même selon l'implémentation)
- La mutation directe n'est pas interceptée
- Le mock doit recréer toute la structure `system` en espérant que ça matche

### 5. **Comportement imprévisible**
```javascript
// Premier appel
actor.experiencePoints.spent = 20
// Second appel - retourne une nouvelle référence ?
const xp = actor.experiencePoints  // spent = 0 ou 20 ? Dépend de l'implémentation du Proxy
```

---

## Impact sur les Tests

### Erreurs observées

| Erreur | Cause |
|--------|-------|
| `Cannot read properties of undefined (reading 'spent')` | Le mock ne définit pas la structure complète retournée par le getter |
| `Cannot set properties of undefined (setting 'spent')` | Tentative de mutation d'un objet retourné par un getter qui n'est pas persisté |

### Fichiers de tests affectés (non-exhaustif)
- `tests/lib/skills/trained-skill.test.mjs`
- `tests/lib/skills/career-free-skill.test.mjs`
- `tests/lib/skills/specialization-free-skill.test.mjs`
- `tests/lib/talents/trained-talent.test.mjs`
- `tests/lib/characteristics/trained-characteristic.test.mjs`
- `tests/lib/skills/skill-cost-calculator.test.mjs`
- `tests/lib/skills/skill-factory.test.mjs`

---

## Preuve de Concept : Pourquoi ça "marche" en Production

En FoundryVTT, `actor.system` est un `Proxy` (via `foundry.utils.mergeObject` et le système de documents de Foundry).

```javascript
// En production, system est un Proxy Foundry
actor.system.progression.experience === actor.system.progression.experience  // true (Proxy fait le lien)

// Mais dans les tests sans Foundry...
const actor = { system: { progression: { experience: { spent: 0 } } } }
actor.experiencePoints  // Appelle le getter qui retourne actor.system.progression.experience
// Si le getter est implémenté naïvement, chaque appel peut retourner une nouvelle référence
```

---

## Solution Recommandée

Voir section **Options de Résolution** ci-dessous.

---

## Options de Résolution

### Option A : Supprimer les getters et accéder directement au `system`

**Changement** :
```javascript
// Au lieu de :
this.actor.experiencePoints.spent = value

// Faire :
this.actor.system.progression.experience.spent = value
```

**Avantages** :
- ✅ Simple et direct
- ✅ Pas de magie noire avec les getters
- ✅ Visible dans le code ce qui est modifié
- ✅ Pas de surcoût de méthodes

**Inconvénients** :
- ❌ Couplage fort avec la structure interne de `system`
- ❌ Si la structure change, il faut changer partout

---

### Option B : Créer de vraies méthodes d'update sur l'acteur

**Changement** :
```javascript
// Dans actor.mjs
updateExperiencePoints(spent) {
  this.system.progression.experience.spent = spent
}

// Dans trained-skill.mjs
this.actor.updateExperiencePoints(experiencePointsSpent)
```

**Avantages** :
- ✅ Encapsulation respectée
- ✅ API contrôlée
- ✅ Facilite le debugging (on peut mettre un log dans la méthode)
- ✅ Évolutivité (changement de structure interne = mise à jour d'une seule méthode)

**Inconvénients** :
- ❌ Plus de code à écrire
- ❌ Surcoût de méthodes simples

---

## Décision et Justification

**L'option B est préférable.**

### Argumentation

1. **Cohérence architecturale** : FoundryVTT encourage l'utilisation de `actor.update()` pour modifier les données. L'option B peut être étendue pour utiliser cette API proprement.

2. **Maintenance** : Si demain tu changes la structure de `system.progression.experience` (ex: migration vers un nouveau format), tu changes le code à un seul endroit (dans l'acteur).

3. **Testabilité** : Avec l'option B, tu peux mocker `updateExperiencePoints` dans les tests au lieu de recréer toute la structure `system`.

4. **Principe de moindre surprise** : Un développeur lisant `actor.updateExperiencePoints(20)` comprend immédiatement l'intention. `actor.experiencePoints.spent = 20` cache que c'est une mutation d'un objet retourné par un getter.

### Implémentation recommandée (Option B améliorée)

```javascript
// Dans actor.mjs
updateExperiencePoints({ spent, gained, total } = {}) {
  const updates = {}
  if (spent !== undefined) updates['system.progression.experience.spent'] = spent
  if (gained !== undefined) updates['system.progression.experience.gained'] = gained
  if (total !== undefined) updates['system.progression.experience.total'] = total
  return this.update(updates)  // Utilise la méthode Foundry standard
}

updateFreeSkillRanks(type, { spent, gained } = {}) {
  const updates = {}
  if (spent !== undefined) updates[`system.progression.freeSkillRanks.${type}.spent`] = spent
  if (gained !== undefined) updates[`system.progression.freeSkillRanks.${type}.gained`] = gained
  return this.update(updates)
}
```

---

## Actions Requises

- [ ] Choisir l'option de résolution (Recommandé : Option B)
- [ ] Refactoriser `trained-skill.mjs`
- [ ] Refactoriser `career-free-skill.mjs`
- [ ] Refactoriser `specialization-free-skill.mjs`
- [ ] Vérifier s'il y a d'autres usages des getters dans `talents/` et `characteristics/`
- [ ] Mettre à jour les tests pour utiliser les nouvelles méthodes
- [ ] Documenter la nouvelle API dans le README ou la doc technique

---

## Références

- **Foundry VTT Documentation** : [Document Update Pattern](https://foundryvtt.com/docs/api/)
- **Clean Code** : Robert C. Martin - Chapitre sur l'encapsulation
- **MDN Web Docs** : [Getter MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)

---

## Historique

| Date | Action | Auteur |
|------|--------|--------|
| 2026-05-06 | Création du document et identification de l'anti-pattern | Analyse OpenCode |
|  |  |  |
