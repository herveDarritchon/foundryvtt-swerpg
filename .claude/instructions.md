# SWERPG Coding Conventions

## Architecture & Design Patterns

### ⚠️ CRITICAL: Getter Mutation Anti-Pattern

**NEVER** implement getters that return mutable references to internal state, then mutate those references externally.

#### ❌ WRONG Pattern (Anti-Pattern)

```javascript
// Dans actor.mjs
get experiencePoints() {
  return this.system.progression.experience
}

// Dans trained-skill.mjs - MUTATION VIA GETTER
this.actor.experiencePoints.spent = 20  // ❌ INTERDIT
```

**Pourquoi c'est interdit :**
1. Violation de l'encapsulation
2. Getters = lecture seule par convention
3. Non-testable (les mocks ne peuvent pas intercepter la mutation)
4. Dépendance au détail d'implémentation (Proxy Foundry)

#### ✅ CORRECT Patterns

**Option 1 : Accès direct (Simple)**
```javascript
// Accès direct aux données system
this.actor.system.progression.experience.spent = 20
```

**Option 2 : Méthode d'update encapsulée (Recommandé)**
```javascript
// Dans actor.mjs
updateExperiencePoints({ spent, gained, total } = {}) {
  const updates = {}
  if (spent !== undefined) updates['system.progression.experience.spent'] = spent
  if (gained !== undefined) updates['system.progression.experience.gained'] = gained
  if (total !== undefined) updates['system.progression.experience.total'] = total
  return this.update(updates)
}

// Dans trained-skill.mjs
await this.actor.updateExperiencePoints({ spent: experiencePointsSpent })
```

### Règles pour les Getters

1. **Un getter ne doit jamais permettre la mutation indirecte**
2. Si tu as besoin de modifier la donnée retournée par un getter, crée une méthode `updateX()` ou `setX()`
3. Les getters peuvent retourner :
   - Des valeurs primitives (number, string, boolean)
   - Des objets immutables ou des copies
   - Des objets qui ne sont pas destinés à être mutés

### Pattern Foundry VTT

Dans l'écosystème Foundry VTT, privilégier l'utilisation de `actor.update()` :

```javascript
// ✅ Pattern Foundry standard
await actor.update({
  'system.progression.experience.spent': newValue
})
```

---

## File Structure

### Actor System
- `module/documents/actor.mjs` : Document principal, contient les getters et méthodes d'update
- `module/lib/skills/*.mjs` : Classes de traitement des compétences (ne doivent pas muter actor via getters)
- `module/lib/talents/*.mjs` : Classes de traitement des talents
- `module/lib/characteristics/*.mjs` : Classes de traitement des caractéristiques

### Tests
- `tests/lib/` : Tests unitaires des classes de traitement
- `tests/utils/` : Utilitaires et mocks pour les tests
- `tests/documents/` : Tests d'intégration sur les documents Foundry

---

## Testing Guidelines

### Mocking Actors in Tests

**Ne pas faire confiance aux getters pour les mocks.** Toujours construire la structure `system` complète :

```javascript
export function createActor({ careerSpent = 0, specializationSpent = 0 } = {}) {
  return {
    system: {
      progression: {
        experience: { spent: 0, gained: 0, total: 100 },
        freeSkillRanks: {
          career: { spent: careerSpent, gained: 4 },
          specialization: { spent: specializationSpent, gained: 2 }
        }
      }
    },
    // Si tu dois mocker les getters, fais-le explicitement :
    // get experiencePoints() { return this.system.progression.experience }
  }
}
```

---

## Anti-Patterns Documentés

Voir `/docs/anti-patterns/` pour la documentation complète des anti-patterns identifiés.

- [Getter Mutation Anti-Pattern](./docs/anti-patterns/getter-mutation-anti-pattern.md)

---

## Commit Messages

Format : `type(scope): description`

- `fix(actor)`: Fix d'un bug
- `feat(combat)`: Nouvelle fonctionnalité
- `refactor(resources)`: Refactoring sans changement de comportement
- `test(skills)`: Ajout ou modification de tests

---

## Code Style

- Indentation : 2 espaces
- Pas de points-virgules inutiles
- Pas de commentaires sauf demande expresse
- Utiliser les `async/await` plutôt que les `.then()`
