# Plan d'implémentation — #159 : Analyseur de diff pour détection des changements et composition des entrées de log

**Issue** : [#159 — TECH: Analyseur de diff pour détection des changements et composition des entrées de log](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/159)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**User Story** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plans amont** :
  - `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` (§4.3, §4.4)
  - `documentation/plan/character-sheet/evolution-logs/TECH-158-plan-aop-hooks.md`
**Modules impactés** : `module/utils/audit-diff.mjs` (création), `module/utils/audit-log.mjs` (modification), `tests/utils/audit-diff.test.mjs` (création)

---

## 1. Objectif

Implémenter l'analyseur de diff qui, à partir du `changes` (diff imbriqué Foundry) et de l'ancien état capturé par `snapshotOldState`, détermine le ou les types de changement et compose une ou plusieurs entrées de log structurées.

#158 a livré l'infrastructure AOP complète (hooks `preUpdateActor`/`updateActor`, guards, anti-fuite mémoire, placeholder `composeEntries` retournant `[]`). #159 branche la logique réelle de détection pour que les entrées de log soient effectivement produites.

---

## 2. Périmètre

### Inclus dans #159

- Création de `module/utils/audit-diff.mjs` avec :
  - `composeEntries(oldState, changes, actor, userId)` — point d'entrée unique, parcourt les sections du diff et délègue aux détecteurs
  - `detectSkillChanges(oldState, changes, actor, ts, userId, user, snapshot)` — détection `skill.train` / `skill.forget`
  - `detectCharacteristicChanges(oldState, changes, actor, ts, userId, user, snapshot)` — détection `characteristic.increase`
  - `detectXpChanges(oldState, changes, actor, ts, userId, user, snapshot)` — détection `xp.spend` / `xp.grant`
  - `detectDetailChanges(oldState, changes, actor, ts, userId, user, snapshot)` — détection `species.set`, `career.set`, `specialization.add` / `specialization.remove`
  - `detectAdvancementChanges(oldState, changes, actor, ts, userId, user, snapshot)` — détection `advancement.level`
  - `makeEntry({ type, data, xpDelta, ts, userId, user, snapshot })` — helper de construction d'entrée de log
  - Calculs de coûts XP autonomes (n'appelle aucune méthode métier existante, règles de l'issue §"Règles inviolables")
- Modification de `module/utils/audit-log.mjs` :
  - Remplacer le placeholder `composeEntries` par un import de `module/utils/audit-diff.mjs` et délégation réelle
  - Exporter `composeEntries` depuis le module pour tests (via ré-export ou par le nouveau fichier)
  - Supprimer le placeholder mort (lignes 135-137)
- Tests Vitest dans `tests/utils/audit-diff.test.mjs` :
  - Tests unitaires pour chaque détecteur
  - Tests d'intégration pour `composeEntries`
  - Tests de non-régression : changes vides → `[]`, section absente → ignorée

### Exclu de #159

- Détection des achats de talent via `createItem` (hook `onCreateItemAction`) → fera l'objet d'une issue séparée
- Interface de visualisation des logs → US6 (#156)
- Taille max configurable (System Setting + éviction FIFO) → #162
- Snapshot XP dans chaque entrée → déjà implémenté via `captureSnapshot` dans `writeLogEntries` (#158)
- Migration des logs existants (aucun n'existe)
- Tests de bout en bout avec UI Foundry

---

## 3. Constat sur l'existant

### #158 livré : infrastructure AOP complète

`module/utils/audit-log.mjs` (260 lignes) contient :

- `pendingOldStates` (Map liée par `actor.uuid:userId`) — file d'attente FIFO
- `onPreUpdateActor` — capture `snapshotOldState` dans `pendingOldStates`
- `onUpdateActor` — consomme la file, appelle `composeEntries`, écrit via `writeLogEntries`
- `snapshotOldState(source, changes)` — extrait de `actor._source` les chemins modifiés, **avec préfixe `system.`** conservé (ex: `{ system: { skills: { Athletics: { rank: { trained: 2 } } } } }`)
- `writeLogEntries(actor, entries)` — écriture batch fire-and-forget avec try/catch
- `registerAuditLogHooks()` — câblage de `preUpdateActor` et `updateActor`
- `isOnlyAuditChange`, `cloneValue`, `isDeletionPath`, anti-fuite mémoire (TTL, MAX_PENDING, eviction)
- `composeEntries` est un **placeholder vide** retournant `[]` (lignes 135-137)

### Composition du diff Foundry

Foundry transmet un `changes` sous forme de nested object. Pour un `actor.update({ 'system.skills.Athletics.rank.trained': 3 })`, le `changes` reçu par les hooks est :

```js
{
  system: {
    skills: {
      Athletics: {
        rank: {
          trained: 3
        }
      }
    }
  }
}
```

La fonction `snapshotOldState` (implémentée dans #158) aplatit ce diff et extrait de `actor._source` uniquement les feuilles modifiées, produisant un `oldState` de structure parallèle :

```js
{
  system: {
    skills: {
      Athletics: {
        rank: {
          trained: 2  // ancienne valeur
        }
      }
    }
  }
}
```

### Structure des données acteur (schéma character)

Pour référence, voici la structure des chemins impactés par les détecteurs :

| Section | Chemin | Détecteur |
|---------|--------|-----------|
| Skills | `system.skills.{id}.rank.{base,careerFree,specializationFree,trained}` | `detectSkillChanges` |
| Caractéristiques | `system.characteristics.{id}.rank.{base,trained,bonus}` | `detectCharacteristicChanges` |
| XP | `system.progression.experience.{spent,gained}` | `detectXpChanges` |
| Détails | `system.details.{species,career,specializations}` | `detectDetailChanges` |
| Avancement | `system.advancement.level` | `detectAdvancementChanges` |

### Contrainte forte : aucune méthode métier existante

L'issue spécifie : *"L'analyseur ne doit appeler aucune méthode métier existante"*. Les détecteurs doivent donc implémenter leurs propres calculs de coût XP à partir des seules données old/new, sans appeler `skill-costs.mjs`, `SkillCostCalculator`, ou toute autre classe métier.

Les formules de coût à dupliquer dans l'analyseur :
- **Skill train** : `nextRank * 5` (career) ou `nextRank * 5 + 5` (non-career) où `nextRank = oldTotal + 1`
- **Skill forget** : remboursement = coût du rang supprimé : `oldTotal * 5` (career) ou `oldTotal * 5 + 5` (non-career)
- **Characteristic increase** : `newTotal * 10`

---

## 4. Décisions d'architecture

### 4.1. Fichier dédié pour l'analyseur

**Problème** : Où placer le code des 5 détecteurs et de `makeEntry` ?

**Options** :
| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Dans `audit-log.mjs` | Cohésion, pas d'import | Fichier ~500 lignes, mélange infrastructure/détection |
| Fichier séparé `audit-diff.mjs` | Séparation claire, testable indépendamment | Import supplémentaire, deux fichiers à maintenir |

**Décision** : Nouveau fichier `module/utils/audit-diff.mjs`.

**Justification** : L'infrastructure AOP (#158) est stable et ne changera pas. L'analyseur de diff est la seule pièce manquante. Le séparer permet de tester les détecteurs sans importer les hooks, et maintient `audit-log.mjs` à ~260 lignes.

### 4.2. Adaptation des détecteurs à la structure `oldState.system.*`

**Problème** : La spec de l'issue #159 référence `oldState.skills` (sans préfixe), mais `snapshotOldState` (implémenté dans #158) produit `{ system: { skills: {...} } }` (avec préfixe).

**Décision** : Les détecteurs lisent `oldState.system.*` pour correspondre à la sortie de `snapshotOldState`.

**Justification** : Pas de modification du code #158 déjà livré et testé. L'adaptation est triviale (`oldState.system.skills` au lieu de `oldState.skills`).

### 4.3. Calcul de coût XP autonome

**Problème** : Comment calculer le coût XP des opérations sans appeler le code métier existant ?

**Décision** : Chaque détecteur embarque ses propres formules de calcul, calquées sur la logique de `skill-costs.mjs` mais indépendantes.

Formules intégrées :
- `computeSkillTrainCost(oldTotal, isCareer)` = `(oldTotal + 1) * 5` (career) ou `(oldTotal + 1) * 5 + 5` (non-career)
- `computeSkillForgetRefund(oldTotal, isCareer)` = `oldTotal * 5` (career) ou `oldTotal * 5 + 5` (non-career)
- `computeCharacteristicCost(newValue)` = `newValue * 10`

**Justification** : Ces formules sont stables (règles du jeu FFG/SW non changeantes). Les dupliquer dans l'analyseur évite tout couplage avec le code métier, conformément aux règles inviolables de l'issue.

### 4.4. Détection `isCareer` et `isFree` sans code métier

**Problème** : Le code métier détermine si une skill est career/specialization via les données de carrière. L'analyseur ne peut pas y accéder.

**Décision** :
- `isFree` = le nouveau `rank.trained` n'a pas augmenté (seuls `careerFree` ou `specializationFree` ont changé)
- `isCareer` = estimé depuis les career skills disponibles : si des `freeSkillRanks.career` ont été consommés entre old et new, la skill appartient à la carrière

**Justification** : Approche pragmatique. Si le rank total a augmenté mais que `trained` n'a pas bougé, c'est un free rank. Si `trained` a augmenté, c'est un achat XP. La détection fine (career vs non-career pour le pricing) utilise les mêmes données que le métier (via oldState.progression.freeSkillRanks). En cas d'ambiguïté, le coût career par défaut est utilisé (moins de risque d'erreur).

### 4.5. Détection des changements de spécialisation (add/remove)

**Problème** : Les spécialisations sont stockées dans `system.details.specializations` (SetField). Le diff Foundry pour un SetField peut utiliser le format `-=id` pour la suppression.

**Décision** : Détecter `add` via présence d'une nouvelle spécialisation dans `changes`, détecter `remove` via le path `.-=` dans le diff.

**Justification** : Les `-=` paths sont déjà gérés par `snapshotOldState` (qui les ignore). Pour la détection de removal, on les détecte dans `changes` directement via `foundry.utils.flattenObject`.

### 4.6. Pas de `createItem` hook dans #159

**Problème** : La détection d'achat de talent (`talent.purchase`) nécessite le hook `createItem`, qui n'est pas dans le périmètre de #159.

**Décision** : Exclu. Une issue séparée sera créée pour ajouter le hook `createItem` et la détection `talent.purchase`.

**Justification** : Le hook `createItem` est orthogonal à l'analyseur de diff updateActor. Il a son propre cycle de vie et ses propres tests. Le séparer évite de complexifier #159.

---

## 5. Plan de travail détaillé

### Étape 1 : Créer `module/utils/audit-diff.mjs`

Contenu du module :

```
module/utils/audit-diff.mjs
├── composeEntries(oldState, changes, actor, userId)
│   ├── if changes.system?.skills        → detectSkillChanges
│   ├── if changes.system?.characteristics → detectCharacteristicChanges
│   ├── if changes.system?.progression?.experience → detectXpChanges
│   ├── if changes.system?.details       → detectDetailChanges
│   └── if changes.system?.advancement   → detectAdvancementChanges
├── detectSkillChanges(...)
│   ├── Parcourt changes.system.skills
│   ├── Calcule oldTotal / newTotal depuis rank.{base,careerFree,specializationFree,trained}
│   ├── Produit skill.train (newTotal > oldTotal) ou skill.forget (newTotal < oldTotal)
│   └── Champs : skillId, oldRank, newRank, cost, isFree
├── detectCharacteristicChanges(...)
│   ├── Parcourt changes.system.characteristics
│   ├── Calcule oldTotal / newTotal depuis rank.{base,trained,bonus}
│   └── Produit characteristic.increase (newTotal > oldTotal)
├── detectXpChanges(...)
│   ├── Détecte experience.spent → xp.spend
│   ├── Détecte experience.gained → xp.grant
│   └── Calcule le delta old→new
├── detectDetailChanges(...)
│   ├── species → species.set
│   ├── career → career.set
│   ├── specializations → specialization.add (diff key présente) / .remove (path .-=)
│   └── Compare old vs new
├── detectAdvancementChanges(...)
│   ├── advancement.level → advancement.level
│   └── Champs : oldLevel, newLevel
├── makeEntry({ type, data, xpDelta, ts, userId, user, snapshot })
│   └── Id (randomID), timestamp, userId, userName, type, data, xpDelta, snapshot
├── computeSkillTrainCost(oldTotal, isCareer)
│   └── Formule autonome : (oldTotal + 1) * 5 + (isCareer ? 0 : 5)
├── computeSkillForgetRefund(oldTotal, isCareer)
│   └── Formule autonome : oldTotal * 5 + (isCareer ? 0 : 5)
└── computeCharacteristicCost(newValue)
    └── Formule autonome : newValue * 10
```

### Étape 2 : Modifier `module/utils/audit-log.mjs`

Changements :
1. **Supprimer le placeholder `composeEntries`** (lignes 134-137) et le remplacer par un import et une délégation
2. **Importer `composeEntries`** depuis `./audit-diff.mjs`

```js
// audit-log.mjs — nouveau contenu pour remplacer le placeholder
import { composeEntries } from './audit-diff.mjs'
```

Note : le flux existant dans `onUpdateActor` appelle déjà `composeEntries(pending.oldState, changes, actor, pending.userId)`. Le remplacement du placeholder par la vraie fonction est transparent.

### Étape 3 : Tests Vitest dans `tests/utils/audit-diff.test.mjs`

#### Tests unitaires pour chaque détecteur

| # | Test | Description |
|---|------|-------------|
| 1 | `composeEntries retourne [] si changes vide` | `changes = {}` → `[]` |
| 2 | `composeEntries retourne [] si changes sans system` | `changes = { flags: {} }` → `[]` |
| 3 | `detectSkillChanges produit skill.train` | rank 2→3, oldState a rank 2, actor rank 3 → type `skill.train`, data.oldRank=2, data.newRank=3 |
| 4 | `detectSkillChanges produit skill.forget` | rank 3→2 → type `skill.forget`, data.oldRank=3, data.newRank=2 |
| 5 | `detectSkillChanges ignore si rank inchangé` | rank 2→2 (seul un sous-champ non-rank a changé) → `[]` |
| 6 | `detectSkillChanges calcule cost correct pour career` | oldTotal=2, isCareer=true → cost = 3*5 = 15 |
| 7 | `detectSkillChanges calcule cost correct pour non-career` | oldTotal=2, isCareer=false → cost = 3*5+5 = 20 |
| 8 | `detectSkillChanges détecte isFree=true` | seul careerFree a augmenté, trained inchangé → isFree=true, xpDelta=0 |
| 9 | `detectCharacteristicChanges produit characteristic.increase` | rank 2→3 → type `characteristic.increase`, cost = 3*10 = 30 |
| 10 | `detectCharacteristicChanges ignore si decrease` | rank 3→2 (annulation/erreur) → `[]` |
| 11 | `detectCharacteristicChanges calcule cost correct` | newValue=4 → cost=40 |
| 12 | `detectXpChanges produit xp.spend` | spent 50→75 → type `xp.spend`, amount=25, xpDelta=-25 |
| 13 | `detectXpChanges produit xp.grant` | gained 100→150 → type `xp.grant`, amount=50, xpDelta=50 |
| 14 | `detectXpChanges ignore si valeur inchangée` | spent 50→50 (même valeur) → `[]` |
| 15 | `detectDetailChanges produit species.set` | species null→Human → type `species.set` |
| 16 | `detectDetailChanges produit career.set` | career null→Mercenary → type `career.set` |
| 17 | `detectDetailChanges produit specialization.add` | spécialisation ajoutée → type `specialization.add` |
| 18 | `detectDetailChanges produit specialization.remove` | spécialisation retirée (path `.-=`) → type `specialization.remove` |
| 19 | `detectAdvancementChanges produit advancement.level` | level 1→2 → type `advancement.level`, oldLevel=1, newLevel=2 |
| 20 | `detectAdvancementChanges ignore si level inchangé` | level 1→1 → `[]` |
| 21 | `makeEntry génère entrée bien formée` | Vérifie id (non vide), timestamp, userId, userName, type, data, xpDelta, snapshot |

#### Tests d'intégration pour composeEntries

| # | Test | Description |
|---|------|-------------|
| 22 | `composeEntries délègue aux bons détecteurs` | changes avec skills+XP → 2 entrées (skill.train + xp.spend) |
| 23 | `composeEntries gère les opérations composites` | skill.train + xp.spend dans le même changes (même timestamp) |
| 24 | `composeEntries ignore sections sans changement réel` | changes.system.skills présent mais valeurs identiques → `[]` |

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/utils/audit-diff.mjs` | **Création** | Module analyseur : `composeEntries`, 5 détecteurs, `makeEntry`, helpers de coûts |
| `module/utils/audit-log.mjs` | **Modification** | Suppression du placeholder `composeEntries` (l.134-137), import de `audit-diff.mjs` |
| `tests/utils/audit-diff.test.mjs` | **Création** | ~24 tests Vitest pour les détecteurs et `composeEntries` |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Décalage structure oldState** : les détecteurs lisent `oldState.system.*` mais `snapshotOldState` ne capture que les feuilles du diff (pas les objets complets) | Old total rank incomplet si le diff ne contient pas toutes les sous-propriétés | Fallback : tout sous-champ manquant dans `oldState` est considéré inchangé (valeur par défaut 0 ou lue depuis `actor.system`) |
| **isCareer indéterminable** : impossible de savoir si une skill est career sans appeler le métier | Coût XP erroné | Par défaut, considérer `isCareer=false` (coût majoré). Le snapshot inclura `progression.freeSkillRanks.career` si modifié, ce qui permet d'inférer le statut career |
| **isFree ambigu** : une skill peut gagner un rank free ET un rank trained dans la même opération | `isFree` mal classifié | Cas rare. Si `trained` a augmenté ET que `careerFree` a aussi augmenté, classer comme non-free (l'utilisateur a payé). Acceptable pour un log secondaire |
| **Spécialisation.add non détectée** : le diff spécialisations peut ne pas contenir les nouvelles clés si le SetField utilise un format inattendu | Entrée specialization.add manquée | Comparer oldState.specializations vs actor.specializations comme fallback robuste |
| **Régression #158** : la modification de `audit-log.mjs` casse l'infrastructure existante | Plus aucun log produit | Tests d'intégration existants (404 lignes) inchangés. Ajouter un test qui vérifie que `onUpdateActor` appelle `composeEntries` et que le résultat est écrit |
| **Formules de coût dupliquées** : si les règles de coût changent, `audit-diff.mjs` doit être mis à jour manuellement | Coûts XP désynchronisés | Documenter clairement les formules dans le code avec référence à `skill-costs.mjs`. Ajouter un test de cohérence qui compare les résultats des deux implémentations |

---

## 8. Proposition d'ordre de commit

1. **Création de `module/utils/audit-diff.mjs`** — `composeEntries`, 5 détecteurs, `makeEntry`, helpers de coûts
2. **Modification de `module/utils/audit-log.mjs`** — suppression du placeholder, import de `audit-diff.mjs`
3. **Tests Vitest** — `tests/utils/audit-diff.test.mjs` avec ~24 tests
4. **Vérification** — `npx vitest run tests/utils/audit-diff.test.mjs` + `npx vitest run tests/utils/audit-log.test.mjs` (non-régression)

---

## 9. Dépendances avec les autres US

```
#158 (infrastructure AOP) — DÉJÀ LIVRÉ
  │
  └── #159 (ce ticket) — Analyseur de diff
        │
        ├── US2 (skills automation)   → consomme les entrées skill.train/forget
        ├── US3 (caracs automation)   → consomme les entrées characteristic.increase
        ├── US4 (talents)             → hook createItem (issue séparée à créer)
        ├── US5 (choix création)      → consomme species.set, career.set, specialization.*
        ├── US6 (UI)                  → consomme flags.swerpg.logs (dont les entrées #159)
        └── US7 (export)              → lit flags.swerpg.logs
```

#159 n'a pas de dépendance bloquante. Il peut être implémenté en isolation : l'infrastructure #158 est déjà en place, le placeholder `composeEntries` retournera désormais les vraies entrées au lieu de `[]`.
