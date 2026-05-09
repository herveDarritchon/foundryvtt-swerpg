# Audit des tests existants — XP Transaction Console

## Résumé

**226 tests uniques** couvrent les couches métier (SkillFactory, calculs de coûts, achat/retrait de rangs). **Zéro test** ne couvre la couche de présentation (préparation des données sheet, rendu template).

---

## 1. Tests couvrant la logique métier (bien testé)

### Tests unitaires — `tests/lib/skills/` (135 tests)

| Fichier | Tests | Ce qui est testé |
|---------|-------|-------------------|
| `skill-base.test.mjs` | 3 | Constructeur, deep clone, méthodes abstraites |
| `skill-factory.test.mjs` | 23 | `SkillFactory.build()` combinatoire complète (train/forget, career/specialization/both/neither, création/post-création) |
| `skill-factory-additional.test.mjs` | 9 | Cas non-création, rangs gratuits manquants |
| `trained-skill.test.mjs` | 10 | `process()` train/forget, max rank, validation XP, `updateState()` |
| `trained-skill-additional.test.mjs` | 14 | Cas limites XP, forget à rank 0, max rank création (2) vs post-création (5) |
| `career-free-skill.test.mjs` | 10 | Max 1 par skill, overspent guard, forget < 0 |
| `career-free-skill-additional.test.mjs` | 5 | Cas gained=0/spent=0, available négatif |
| `specialization-free-skill.test.mjs` | 12 | Max 1 par skill, species free, `updateState()` |
| `specialization-free-skill-additional.test.mjs` | 12 | `freeSkillRankAvailable`, value recalculation, cas limites |
| `error-skill.test.mjs` | 5 | Retourne message d'erreur fixe |
| `skill-cost-calculator.test.mjs` | 15 | `calculateCost()` train/forget pour tous les types de skill |
| `skill-cost-calculator-additional.test.mjs` | 17 | Symétrie forget, unknown action, progression multi-rank |

### Tests utilitaires — `tests/utils/` (47 tests)

| Fichier | Tests | Ce qui est testé |
|---------|-------|-------------------|
| `skill-costs.test.mjs` | 22 | `getSkillNextRankCost`, `getSkillPurchaseState`, `getPositiveDicePoolPreview` |
| `skill-costs-additional.test.mjs` | 25 | Cas négatifs, valeurs limites, custom maxRank |

### Tests d'intégration document — `tests/documents/` (14 tests)

| Fichier | Tests | Ce qui est testé |
|---------|-------|-------------------|
| `actor-creation.test.mjs` | 14 | `purchaseSkill()` → délégation SkillFactory, params train/forget/delta > 1, warning on error |

### Duplication

- `module/utils/__tests__/skill-costs.test.js` (20 tests) — doublon de `tests/utils/skill-costs.test.mjs`, probablement une relique d'une ancienne structure.

---

## 2. Tests manquants (lacunes critiques)

### Aucun test pour la couche de présentation sheet

| Code non testé | Où | Impact |
|----------------|----|--------|
| `CharacterSheet.#prepareSkills()` | `character-sheet.mjs:420` | Cœur de la préparation des données skills pour le template. Transforme `actor.system.skills` en données enrichies (pips, freeRank, nextCost, dicePreview). Appelle `getSkillPurchaseState` et `getPositiveDicePoolPreview`. |
| `CharacterSheet.#prepareSkillRanks()` | `character-sheet.mjs:487` | Construit le tableau de pips pour l'affichage des rangs |
| `CharacterSheet.#prepareFreeSkill()` | `character-sheet.mjs:~459` | Détermine l'état free skill par compétence |
| `CharacterSheet._prepareContext()` (partie skills) | `character-sheet.mjs:104-159` | Calcule les compteurs `freeSkillRanks.*.available`, appelle `#prepareSkills()`, construit le contexte |
| Template `skills.hbs` | `templates/sheets/actor/skills.hbs` | Rendu HTML de la console et des listes de compétences |
| Partial `character-skill.hbs` | `templates/sheets/partials/character-skill.hbs` | Rendu d'une ligne de compétence |

### Tests manquants additionnels

| Fonction non testée | Où |
|---------------------|----|
| `hasFreeSkillsAvailable()` | `module/documents/actor.mjs:716` |
| `hasCareerFreeSkillsAvailable()` | `module/documents/actor.mjs:694` |
| `hasSpecializationFreeSkillsAvailable()` | `module/documents/actor.mjs:705` |
| `updateExperiencePoints()` | `module/documents/actor.mjs:68` (testé via mock assertions seulement) |
| `updateFreeSkillRanks()` | `module/documents/actor.mjs:681` (testé via mock assertions seulement) |
| `actor-type.mjs _prepareSkills()` | `module/models/actor-type.mjs:199` |
| `character.mjs _prepareSkills()` | `module/models/character.mjs:436` |

### Aucun test d'intégration de bout en bout

- Aucun test ne chaîne `purchaseSkill() → SkillFactory → process() → updateState() → actor.update()`.
- Tous les tests utilisent des mocks (`vi.mock('SkillFactory')`, `actor.update = vi.fn()`).

---

## 3. Analyse de la qualité des tests existants

| Critère | Évaluation |
|---------|------------|
| Séparation domaine/adaptateur | ✅ Bonne — les tests lib/skills utilisent des objets JS simples, pas de Foundry API |
| Cas nominaux | ✅ Couverts |
| Cas limites | ✅ Bien couverts (XP à 0, max rank, valeurs négatives, free ranks épuisés) |
| Erreurs | ✅ ErrorSkill, overspent guards, validation XP |
| Tests -additional | ⚠️ Suggèrent une couverture ajoutée après coup, certaines redondances |
| Duplication | ⚠️ `module/utils/__tests__/skill-costs.test.js` est un doublon à supprimer |
| Couverture couche présentation | ❌ **Aucune** |
| Tests d'intégration chaînés | ❌ **Aucun** |
| Tests de template | ❌ **Aucun** |

---

## 4. Recommandations pour la suite

### Priorité haute (US1)

1. **Tester `#prepareSkills()`** — c'est le point d'entrée principal. Vérifier que les données produites sont cohérentes (catégories `exp`/`kno`/`soc`, champs `nextRank`/`nextCost`/`canPurchase` présents, pips corrects).

2. **Tester `_prepareContext()` partie skills** — s'assurer que les compteurs `freeSkillRanks.*.available` sont corrects.

### Priorité moyenne (US3-US5)

3. **Tester le chainage `purchaseSkill()` complet** — de l'appel à la mise à jour du document.
4. **Tester les méthodes `has*FreeSkillsAvailable()`** de l'actor.

### Priorité basse (nettoyage)

5. **Supprimer le doublon** `module/utils/__tests__/skill-costs.test.js`.
6. **Ajouter des tests pour `updateExperiencePoints()` et `updateFreeSkillRanks()`** sans mocks.
