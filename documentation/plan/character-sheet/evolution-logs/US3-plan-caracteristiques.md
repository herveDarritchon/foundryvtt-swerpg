# Plan d'implémentation — US3 : Tracer les augmentations de caractéristiques

**Issue** : [#153 — US3: Tracer les augmentations de caractéristiques](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/153)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Module(s) impacté(s)** : `module/utils/audit-diff.mjs` (déjà implémenté — vérification uniquement)

---

## 1. Objectif

Vérifier que l'infrastructure livrée par US1 (#151) et TECH-159 (#159) satisfait les critères d'acceptation d'US3. Le détecteur `characteristic.increase` est déjà implémenté dans `module/utils/audit-diff.mjs` ; ce plan documente l'existant, identifie les éventuels écarts, et valide que chaque augmentation de caractéristique est correctement tracée.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Vérification que `detectCharacteristicChanges()` dans `audit-diff.mjs` produit une entrée `characteristic.increase` conforme aux AC :
  - Nom de la caractéristique (`characteristicId`)
  - Ancienne et nouvelle valeur (`oldValue`, `newValue`)
  - Coût en XP (`cost`)
- Vérification que l'entrée n'est écrite qu'en cas d'augmentation réussie (pas d'entrée si l'opération échoue)
- Vérification que les six caractéristiques sont tracées (Brawn, Agility, Intellect, Cunning, Willpower, Presence)
- Vérification de l'intégration avec le flux `purchaseCharacteristic()` (end-to-end : clic UI → `actor.update()` → hook → entrée de log)
- Tests complémentaires si des lacunes sont identifiées
- Documentation de l'état de couverture pour l'épic #150

### Exclu de cette US / ce ticket

- Interface de visualisation des logs → US6 (#156)
- Export des logs → US7
- Ajout d'un `characteristicName` lisible dans les données d'entrée (résolu par US6 via i18n)
- Caractéristiques decrease : intentionnellement non tracées (AC ne mentionne que les augmentations)
- `canPurchaseCharacteristic()` legacy (basé sur `system.abilities`, pas `system.characteristics`) → bug existant hors périmètre

---

## 3. Constat sur l'existant

### 3.1. Infrastructure AOP livrée et fermée

| Issue | Titre | Statut |
|-------|-------|--------|
| #151 | US1: Enregistrer chaque action d'évolution du personnage | CLOSED |
| #158 | TECH: Architecture AOP et double hook preUpdateActor/updateActor | CLOSED |
| #159 | TECH: Analyseur de diff pour détection des changements | CLOSED |
| #160 | TECH: Résilience avancée (retry, GM whisper) | — |
| #161 | TECH: Snapshot XP dans chaque entrée | — |
| #162 | TECH: Taille max configurable (System Setting) | — |

### 3.2. `detectCharacteristicChanges()` — déjà implémenté

`module/utils/audit-diff.mjs:173-212` :

```js
function detectCharacteristicChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const characteristicChanges = changes.system?.characteristics
  if (!characteristicChanges) return entries

  for (const [charId, charData] of Object.entries(characteristicChanges)) {
    if (!charData?.rank) continue

    const newRank = actor.system?.characteristics?.[charId]?.rank
    if (!newRank) continue

    const oldRank = reconstructPreviousValue(oldState.system?.characteristics?.[charId]?.rank, newRank) ?? {}
    const oldTotal = getCharacteristicTotalRank(oldRank)
    const newTotal = getCharacteristicTotalRank(newRank)

    if (newTotal <= oldTotal) continue   // ← only increases

    const cost = computeCharacteristicCost(newTotal)   // newValue * 10

    entries.push(makeEntry({
      type: 'characteristic.increase',
      data: {
        characteristicId: charId,
        oldValue: oldTotal,
        newValue: newTotal,
        cost,
      },
      xpDelta: -cost,
      ts, userId, user, snapshot,
    }))
  }
  return entries
}
```

### 3.3. Structure de l'entrée de log

```json
{
  "id": "random-uuid",
  "schemaVersion": 1,
  "timestamp": 1715000000000,
  "userId": "user-id",
  "userName": "Alice",
  "type": "characteristic.increase",
  "data": {
    "characteristicId": "brawn",
    "oldValue": 2,
    "newValue": 3,
    "cost": 30
  },
  "xpDelta": -30,
  "snapshot": {
    "xpAvailable": 45,
    "totalXpSpent": 155,
    "totalXpGained": 200,
    "careerFreeAvailable": 0,
    "specializationFreeAvailable": 0
  }
}
```

### 3.4. Flux complet : UI → log

```
character-sheet.mjs :: _onClickAction(event, target)
  case 'characteristicIncrease'
    │
    ▼
actor.mjs :: purchaseCharacteristic(characteristicId, 'train')
    │
    ├─ 1. CharacteristicFactory.build(actor, id, { action:'train', isCreation:true })
    │     → TrainedCharacteristic instance
    │
    ├─ 2. characteristic.process()
    │     ├─ Calcule new trained = old trained + 1
    │     ├─ Calcule cost = new total value × 10
    │     ├─ Valide : trained >= 0, total <= 6, XP suffisant
    │     ├─ this.actor.updateExperiencePoints({ spent: newSpent })
    │     │    └─ actor.update({ 'system.progression.experience.spent': newSpent })
    │     │         └─ ★ Hook updateActor → detectXpChanges (supprimé car hasBusinessChange=true)
    │     └─ return this (evaluated=true)
    │
    └─ 3. characteristic.updateState()
          └─ actor.update({ 'system.characteristics.${id}.rank': newRank })
               └─ ★ Hook updateActor → detectCharacteristicChanges → characteristic.increase 🎯
```

**Deux `actor.update()` distincts** : le premier (XP) est supprimé par la logique de dédup XP (ligne 420 : `!hasBusinessChange`), le second (caractéristique) produit l'entrée `characteristic.increase`. Résultat : **1 entrée de log par augmentation**, ce qui est correct.

### 3.5. Tests existants

`tests/utils/audit-diff.test.mjs:838-898` :

| Test | Statut |
|------|--------|
| `characteristic.increase from 2 to 3 costs 30 XP` | ✅ Passe |
| `returns empty for characteristic decrease` | ✅ Passe |

### 3.6. Différence notable avec skill.train

Les entrées `skill.train` incluent un champ `skillName` lisible (ex: "Athletics"). Les entrées `characteristic.increase` n'ont que `characteristicId` (ex: "brawn"). Pas d'impact sur la complétude des données (US6 pourra résoudre le nom via i18n), mais écart de symétrie.

---

## 4. Décisions d'architecture

### 4.1. Aucune modification nécessaire

**Décision** : Aucune modification de code n'est nécessaire pour US3. L'infrastructure US1/TECH-159 couvre intégralement les critères d'acceptation.

Justification :
- Le détecteur `detectCharacteristicChanges()` est implémenté, testé, et fonctionnel
- Il couvre les six caractéristiques (même schéma `system.characteristics.{id}.rank`)
- La dédup XP fonctionne correctement (pas de double entrée `xp.spend` + `characteristic.increase`)
- Les tests unitaires passent

### 4.2. `characteristicName` optionnel

**Décision** : Ne pas ajouter de `characteristicName` lisible dans l'entrée de log. La résolution nom → label sera faite par US6 (UI).

Justification :
- Le label lisible est dans `SYSTEM.CHARACTERISTICS` (config) ou via i18n, pas dans les données de l'acteur
- L'ajouter nécessiterait d'importer la config dans `audit-diff.mjs` (couplage)
- US6 peut résoudre `characteristicId → label` via `game.i18n.localize('SWERPG.Characteristic.brawn')`

### 4.3. Pas de traçage des decreases

**Décision** : Conforme à l'existant — `detectCharacteristicChanges` ignore les decreases (`if (newTotal <= oldTotal) continue`). Les AC US3 ne mentionnent que les augmentations.

Justification : Une caractéristique ne peut pas être "dés-augmentée" dans les règles SW FFG. La diminution n'est pas une action métier valide (hors erreur ou cas exceptionnel).

---

## 5. Plan de travail détaillé

### Étape 1 : Vérification de l'existant (tests passerelles)

1. Vérifier que les 44 tests Vitest passent (notamment les 2 tests characteristics)
2. Lire `detectCharacteristicChanges()` et confirmer qu'il couvre :
   - Tous les champs de l'AC : `characteristicId`, `oldValue`, `newValue`, `cost`
   - Le filtre `newTotal <= oldTotal` pour les decreases
   - Le coût via `computeCharacteristicCost` (= `newValue * 10`, conforme à `CharacteristicCostCalculator`)
3. Vérifier la dédup XP dans `composeEntries()` ligne 403-422 — confirmation que `characteristic.increase` supprime `xp.spend` quand les deux arrivent dans le même `changes`

Résultat attendu : les tests passent, le code est conforme.

### Étape 2 : Test d'intégration manuel (ou automatisé si faisable)

1. Simuler un `actor.update({ 'system.characteristics.brawn.rank.trained': 1 })` sur un character dont brawn.base = 2, brawn.trained = 0
2. Vérifier que `flags.swerpg.logs` contient une entrée `characteristic.increase` avec les bonnes valeurs
3. Vérifier qu'aucune entrée `xp.spend` n'est créée en parallèle (dédup XP)

Si un hook d'update simulé est possible en test unitaire (via le mock d'acteur existant dans `tests/utils/actors/actor-factory.js`), ajouter ce test.

### Étape 3 : Vérification des six caractéristiques

1. Confirmer que `detectCharacteristicChanges` parcourt `changes.system.characteristics` et traite tous les IDs de façon générique — pas de liste blanche hardcodée
2. Vérification : le test actuel utilise "brawn" ; ajouter un test paramétré qui couvre les six IDs (`brawn`, `agility`, `intellect`, `cunning`, `willpower`, `presence`)

### Étape 4 : Validation des edge cases

| Edge case | Impact attendu | Statut |
|-----------|----------------|--------|
| **XP insuffisant** | `process()` retourne `ErrorCharacteristic`, `updateState()` n'est pas appelé → pas d'`actor.update()` → pas de log | ✅ Fonctionnel |
| **Augmentation au max (5→6)** | `trained` passe de 0 à 1, base à 5 → new total 6. Coût = 60 XP. Entrée créée | ⚠️ À tester |
| **Augmentation après création (6 max)** | Bloqué par `process()` (value > 6) → pas de log | ✅ Fonctionnel |
| **Bonus rank qui change seul** | `bonus` change sans `trained` → `newTotal > oldTotal` → entrée créée | ⚠️ Faux positif potentiel |
| **Annulation (decrease)** | Ignoré intentionnellement → pas de log | ✅ Conforme |

⚠️ **Faux positif potentiel** : si un effet de talent modifie `bonus` (ex: +1 bonus), le détecteur voit `newTotal > oldTotal` et crée une entrée `characteristic.increase`. À discuter si c'est souhaitable. Atténuation : l'entrée contient `oldValue` et `newValue` égaux au total (incluant bonus), donc le contexte est traçable.

### Étape 5 : Mise à jour de la checklist de l'épic #150

Marquer US3 comme vérifiée dans la feuille de route de l'épic.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `tests/utils/audit-diff.test.mjs` | **Modification** (mineure) | Ajout d'un test paramétré pour les six caractéristiques + test edge case bonus |

Aucune modification de code métier ou d'infrastructure n'est nécessaire.

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Faux positif bonus rank** : un changement de `bonus` (par talent) crée une entrée `characteristic.increase` non souhaitée | Entrée de log trompeuse (augmentation "gratuite") | Vérifier en étape 4 si c'est acceptable. Si nécessaire, filtrer les changements qui ne touchent QUE `bonus` |
| **`purchaseCharacteristic` sans `await` sur `process()`** : ligne 252, `characteristicClass.process()` n'est pas attendu. Si `process()` devient synchrone, le comportement change | Possible incohérence si refacto | Bug préexistant hors périmètre US3. Documenté dans les risques. |
| **Dédup XP fragile** : la suppression de `xp.spend` repose sur `!hasBusinessChange` (ligne 420). Si l'ordre des updates change (XP après caractéristique au lieu de avant), la logique casse | Double entrée (characteristic.increase + xp.spend) | Actuellement, XP est mis à jour AVANT la caractéristique dans `process()`. Vérifier que cet ordre est stable. Si inversé, la dédup rate. |
| **Tests non exécutables sans Foundry** : certains tests nécessitent un hook Foundry réel | Couverture partielle | Les tests unitaires existants mockent les données sans dépendre de Foundry. Ajouter les nouveaux tests dans le même format. |

---

## 8. Proposition d'ordre de commit

1. **Tests : ajout de tests paramétrés pour les six caractéristiques** dans `tests/utils/audit-diff.test.mjs`
2. **Vérification** : `npx vitest run tests/utils/audit-diff.test.mjs` passe (au moins 46 tests)
3. **Fermeture de l'issue** #153

---

## 9. Dépendances avec les autres US

```
US1 (infrastructure AOP + diff analyzer) — LIVRÉ
  │
  ├── US2 (skills)   — LIVRÉ (dans le même diff analyzer)
  ├── US3 (caracs)   — 🎯 COUVERT par US1 (vérification uniquement)
  ├── US4 (talents)  — hook createItem (hors analyseur de diff)
  ├── US5 (choix)    — species.set, career.set, specialization.*
  ├── US6 (UI)       — consomme flags.swerpg.logs (dont characteristic.increase)
  └── US7 (export)   — lit flags.swerpg.logs
```

US3 n'a aucune dépendance bloquante. L'infrastructure est en place, testée, et fonctionnelle. La vérification peut être faite en isolation.
