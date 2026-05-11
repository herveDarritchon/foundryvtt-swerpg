# Plan d'implémentation — US2 : Tracer les achats et reventes de rangs de compétence

**Issue** : [#152 — US2: Tracer les achats et reventes de rangs de compétence](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/152)  
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)  
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`  
**Module(s) impacté(s)** : `module/utils/audit-diff.mjs` (modification), `module/lib/skills/skill-cost-calculator.mjs` (modification mineure), `module/utils/audit-log.mjs` (modification mineure), `lang/en.json` (vérification), `lang/fr.json` (vérification), `tests/utils/audit-diff.test.mjs` (modification)

---

## 1. Objectif

Enrichir les entrées `skill.train` / `skill.forget` créées par l'infrastructure US1 pour qu'un joueur consultant le journal puisse immédiatement identifier la compétence (nom lisible), sa catégorie, le caractère gratuit ou non du rang, et que le coût XP reflète exactement les règles métier (via le vrai `SkillCostCalculator`). Corriger la détection des rangs gratuits lors des `skill.forget`.

---

## 2. Périmètre

### Inclus

- Ajout de `skillName` (label localisé) dans les entrées `skill.train` / `skill.forget`
- Ajout de `skillCategory` (type de compétence : `general` / `combat` / `knowledge`) dans les entrées
- Ajout de `freeRankType` (`'career'` / `'specialization'` / `null`) pour indiquer la provenance du rang gratuit
- Correction de la détection des rangs gratuits : un `skill.forget` sur un rang gratuit (careerFree ou specializationFree) n'est pas `isFree` mais son `cost` doit être 0 (pas de remboursement XP)
- Refactor du calcul de coût XP : extraction de la logique de `SkillCostCalculator` dans un pur helper partagé, utilisé à la fois par le calculateur et par `audit-diff.mjs`
- Tests Vitest : mise à jour des tests existants + nouveaux cas (free rank forget, skillName en sortie)

### Exclu

- Interface de visualisation des logs → US6
- Agrégation / helper `getXpSpentBySkill()` → pourra être ajouté ultérieurement
- Détection des imports OggDude → déjà couvert par les hooks génériques
- Migration des logs existants (champ `skillName` absent des anciennes entrées → géré par l'affichage dans US6)

---

## 3. Constat sur l'existant

### US1 implémente déjà

- `detectSkillChanges()` dans `audit-diff.mjs` (lignes 82-132) détecte les changements de rang et crée des entrées
- Les entrées contiennent : `skillId`, `oldRank`, `newRank`, `cost`, `isFree`, `isCareer`
- Le calcul de coût est dupliqué dans `computeSkillTrainCost()` / `computeSkillForgetRefund()` (lignes 23-30)
- `inferIsCareer()` détermine si la compétence est de carrière/spécialisation

### Bug identifié : `skill.forget` sur rang gratuit

Dans `detectSkillChanges()` :

```js
const isFree = isIncrease && trainedUnchanged
```

Pour un `skill.forget` (isIncrease = false) d'un rang gratuit, `isFree` est toujours `false`. Le coût est calculé via `computeSkillForgetRefund()` qui retourne un montant > 0. Or, un rang gratuit (careerFree / specializationFree) n'a pas coûté d'XP à l'achat et n'en rembourse pas à la revente.

### `SkillCostCalculator` encapsulé

`skill-cost-calculator.mjs` nécessite une instance de `TrainedSkill` pour `instanceof` check. On ne peut pas l'utiliser directement depuis `detectSkillChanges` sans refactor.

### Le label de compétence est disponible

`actor.system.skills[skillId].label` est résolu par `_prepareSkill()` dans `actor-type.mjs`. Il est accessible dans `composeEntries()` via le paramètre `actor` passé à `detectSkillChanges`.

---

## 4. Décisions d'architecture

### 4.1. Enrichissement des données d'entrée

**Décision** : Ajouter `skillName`, `skillCategory`, `freeRankType` aux entrées `skill.train` / `skill.forget`.

Justification :
- `skillName` permet une lecture humaine immédiate sans résolution i18n côté UI
- `skillCategory` permet le filtrage/groupement par type (US6 pourra l'exploiter)
- `freeRankType` distingue les rangs gratuits carrière vs spécialisation vs aucun

### 4.2. Extraction d'un helper de coût partagé

**Décision** : Extraire la logique de calcul de coût XP dans une fonction statique exportée depuis `skill-cost-calculator.mjs`, utilisée par le calculateur ET par `audit-diff.mjs`.

**Problème** : `SkillCostCalculator` vérifie `instanceof TrainedSkill` dans son constructeur, ce qui empêche son usage depuis `detectSkillChanges` (pas de `TrainedSkill` disponible).

**Solution** : Ajouter une méthode statique `SkillCostCalculator.computeCost({ action, rankValue, isSpecialized })` qui encapsule la formule :

```js
static computeCost({ action, rankValue, isSpecialized }) {
  if (action === 'train') {
    return isSpecialized ? rankValue * 5 : rankValue * 5 + 5
  }
  if (action === 'forget') {
    return isSpecialized ? (rankValue + 1) * 5 : (rankValue + 1) * 5 + 5
  }
  return 0
}
```

`SkillCostCalculator.#calculateTrainCost()` et `#calculateForgetCost()` délèguent à cette méthode statique. `detectSkillChanges()` l'appelle directement.

Justification :
- DRY : une seule formule de coût dans le codebase
- Testable unitairement
- Pas de dépendance cyclique (audit-diff n'a pas besoin d'importer TrainedSkill)
- La méthode statique ne nécessite pas d'instance

### 4.3. Détection du type de rang modifié

**Décision** : Analyser les sous-clés de `skillData.rank` dans le diff pour déterminer quel composant de rang a changé.

Le diff `changes.system.skills[skillId].rank` ne contient que les sous-champs modifiés. On peut détecter :
- Si `careerFree` est dans les clés → action sur rang gratuit carrière
- Si `specializationFree` est dans les clés → action sur rang gratuit spé
- Si `trained` est dans les clés → action sur rang XP

Pour le cas `skill.forget` où l'un des champs gratuits a changé : `cost = 0` et `freeRankType` est renseigné.

### 4.4. Pas de migration des anciennes entrées

Les anciennes entrées (sans `skillName`, `skillCategory`, `freeRankType`) restent valides. L'affichage dans US6 devra gérer leur absence (fallback = `skillId`).

---

## 5. Plan de travail détaillé

### Étape 1 : Extraire le calcul de coût XP dans une méthode statique partagée

**Quoi** : Ajouter une méthode statique `SkillCostCalculator.computeCost()`. Modifier les méthodes privées d'instance pour déléguer. Remplacer les helpers dupliqués dans `audit-diff.mjs` par l'appel à la méthode statique.

**Fichiers** :
- `module/lib/skills/skill-cost-calculator.mjs` — ajouter `static computeCost()`, modifier `#calculateTrainCost` / `#calculateForgetCost`
- `module/utils/audit-diff.mjs` — supprimer `computeSkillTrainCost` et `computeSkillForgetRefund`, les remplacer par `SkillCostCalculator.computeCost()`

**Risques** :
- `SkillCostCalculator` vérifie `instanceof TrainedScript` dans `calculateCost()` — on conserve ce guard pour la méthode d'instance ; la statique n'en a pas besoin
- La fonction partagée doit avoir exactement la même sémantique pour ne pas casser le calcul existant → tests de parité

### Étape 2 : Ajouter `skillName`, `skillCategory`, `freeRankType` aux entrées

**Quoi** : Dans `detectSkillChanges()`, lire `actor.system.skills[skillId].label` et `.type` (après update) et les inclure dans `data`. Analyser les sous-clés du diff rank pour déterminer `freeRankType`.

**Fichiers** :
- `module/utils/audit-diff.mjs` — modifier `detectSkillChanges()` :
  ```js
  // Nouveaux champs enrichis
  const skillData = actor.system?.skills?.[skillId]
  const skillName = skillData?.label ?? skillId
  const skillCategory = skillData?.type ?? null

  // Détection de freeRankType
  const changedRankKeys = Object.keys(skillData?.rank ?? {})
  const hasCareerFreeChange = 'careerFree' in (skillData?.rank ?? {})
  const hasSpecFreeChange = 'specializationFree' in (skillData?.rank ?? {})
  const hasTrainedChange = 'trained' in (skillData?.rank ?? {})

  let freeRankType = null
  if (isIncrease && trainedUnchanged) {
    freeRankType = hasCareerFreeChange ? 'career' : hasSpecFreeChange ? 'specialization' : null
  } else if (!isIncrease && trainedUnchanged) {
    freeRankType = hasCareerFreeChange ? 'career' : hasSpecFreeChange ? 'specialization' : null
  }
  ```

**Risques** :
- `actor.system.skills[skillId]` peut ne pas exister au moment du hook (compétence supprimée ?) → fallback
- `skill.label` est résolu par `_prepareSkill()` → présent sur l'instance actor après update

### Étape 3 : Corriger la détection des rangs gratuits pour `skill.forget`

**Quoi** : Quand `skill.forget` est détecté et que le champ modifié est `careerFree` ou `specializationFree` (et pas `trained` uniquement), le `cost` doit être 0.

**Fichiers** :
- `module/utils/audit-diff.mjs` — dans `detectSkillChanges()`, logique modifiée :
  ```js
  const isPureFreeRankChange = trainedUnchanged &&
    (hasCareerFreeChange || hasSpecFreeChange)

  let cost = 0
  if (!isPureFreeRankChange) {
    cost = isIncrease
      ? SkillCostCalculator.computeCost({ action: 'train', rankValue: oldTotal + 1, isSpecialized: isCareer })
      : SkillCostCalculator.computeCost({ action: 'forget', rankValue: oldTotal, isSpecialized: isCareer })
  }
  ```

**Risques** :
- Un oubli de rang où `trained` ET `careerFree` changent simultanément (ne devrait pas arriver dans le flux normal) → `isPureFreeRankChange` sera false, le calcul normal s'applique. C'est correct car on ne peut pas garantir quel mécanisme est en jeu.

### Étape 4 : Mettre à jour les tests

**Quoi** : Ajouter des tests pour :
- `skill.train` avec `skillName` et `skillCategory` dans la sortie
- `skill.forget` d'un rang gratuit (careerFree → cost 0, xpDelta 0)
- `skill.forget` d'un rang specializationFree
- `freeRankType` correct pour chaque cas
- Cas `skill.forget` d'un trained rank (cost normal, freeRankType null)
- Parité entre `SkillCostCalculator.computeCost()` statique et l'ancienne formule

**Fichiers** :
- `tests/utils/audit-diff.test.mjs` — nouveaux cas de test
- `tests/lib/skills/skill-cost-calculator.test.mjs` — tests de la méthode statique

### Étape 5 : Vérification i18n

**Quoi** : Vérifier qu'aucune nouvelle clé i18n n'est nécessaire. Les noms de compétence sont déjà localisés via `SKILLS.*`.

**Fichiers** :
- `lang/en.json` — vérification
- `lang/fr.json` — vérification

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/lib/skills/skill-cost-calculator.mjs` | Modification | Ajout de `static computeCost()`, délégation depuis les méthodes d'instance |
| `module/utils/audit-diff.mjs` | Modification | Ajout de `skillName`, `skillCategory`, `freeRankType` dans `detectSkillChanges()` ; correction du calcul de coût pour `skill.forget` free ranks ; suppression des helpers dupliqués au profit de `SkillCostCalculator.computeCost()` |
| `module/utils/audit-log.mjs` | Aucune (vérification) | Pas de changement attendu dans le module d'infrastructure |
| `lang/en.json` | Vérification | Aucun changement attendu |
| `lang/fr.json` | Vérification | Aucun changement attendu |
| `tests/utils/audit-diff.test.mjs` | Modification | Nouveaux tests pour skillName, skillCategory, freeRankType, free rank forget |
| `tests/lib/skills/skill-cost-calculator.test.mjs` | Modification | Tests de `static computeCost()` |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Régression** du calcul de coût XP si la fonction partagée diffère | Coût erroné dans les logs | Tests de parité comparant l'ancienne et la nouvelle formule |
| **`skill.label` absent** au moment du hook (cas rare de compétence non trouvée) | Entrée sans `skillName` | Fallback à `skillId` si le label n'est pas disponible |
| **`SkillCostCalculator` cassé** si on modifie l'interface `instanceof` | Blocage des achats de compétence | On conserve le guard `instanceof` dans la méthode d'instance ; la statique ne change pas l'interface publique |
| **Migration** des anciens logs (sans les nouveaux champs) | Champs manquants dans les anciennes entrées | L'UI (US6) doit gérer les champs optionnels avec fallback |
| **Changement simultané** de plusieurs sous-composants de rang (trained + careerFree) | freeRankType ambigu | Scénario impossible dans le flux actuel (les appels sont atomiques par type de rang). Si ça arrive, `isPureFreeRankChange` est false → calcul normal |

---

## 8. Proposition d'ordre de commit

1. `refactor(skill-costs)!: extract shared XP cost calculation as static method` — `skill-cost-calculator.mjs`, `audit-diff.mjs`
2. `feat(audit-log): add skillName and skillCategory to skill entries` — `audit-diff.mjs`
3. `fix(audit-log): correct free rank forget detection — cost is 0` — `audit-diff.mjs`
4. `feat(audit-log): add freeRankType to skill entries` — `audit-diff.mjs`
5. `test(audit-log): cover enriched skill entries and free rank forget` — `tests/utils/audit-diff.test.mjs`
6. `test(skill-costs): cover static computeCost method` — `tests/lib/skills/skill-cost-calculator.test.mjs`

---

## 9. Dépendances avec les autres US

```
US1 (infrastructure hooks + diff)
  └── US2 (enrichissement skills) ← YOU ARE HERE
        ├── US3 (characteristics) — indépendant, même pattern
        ├── US4 (talents) — indépendant
        ├── US5 (choices) — indépendant
        ├── US6 (UI) — consommera les nouveaux champs (skillName, category)
        └── US7 (export) — les nouveaux champs sont exportés automatiquement
```

US2 n'a aucune dépendance bloquante. Il enrichit ce que US1 produit déjà, sans casser la structure existante.
