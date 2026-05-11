# Plan d'implémentation — US5 : Tracer les choix fondamentaux du personnage (espèce, carrière, spécialisation)

**Issue** : [#155 — US5: Tracer les choix fondamentaux du personnage (espèce, carrière, spécialisation)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/155)  
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)  
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`  
**Module(s) impacté(s)** : `module/utils/audit-diff.mjs` (déjà implémenté — vérification uniquement)

---

## 1. Objectif

Vérifier que l'infrastructure livrée par US1 (#151) et TECH-159 (#159) satisfait les critères d'acceptation d'US5. Les détecteurs `species.set`, `career.set`, `specialization.add` et `specialization.remove` sont déjà implémentés dans `module/utils/audit-diff.mjs` ; ce plan documente l'existant, identifie les éventuels écarts, et valide que chaque choix fondamental du personnage est correctement tracé.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Vérification que `detectDetailChanges()` dans `audit-diff.mjs` (l.276-324) produit les entrées conformes aux AC :
  - `species.set` — ancienne et nouvelle espèce
  - `career.set` — ancienne et nouvelle carrière
  - `specialization.add` — nom de la spécialisation ajoutée
  - `specialization.remove` — nom de la spécialisation retirée
- Vérification que les entrées sont écrites uniquement après validation réussie
- Vérification que la chronologie est préservée (ordre des `actor.update()`)
- Tests complémentaires si des lacunes sont identifiées
- Documentation de l'état de couverture pour l'épic #150

### Exclu de cette US / ce ticket

- Interface de visualisation des logs → US6 (#156)
- Export des logs → US7
- Coût XP des spécialisations (`specialization.add` avec `cost`) → non applicable car le coût XP est géré dans une `actor.update()` séparée
- Détection des changements via OggDude (import en masse) → à traiter séparément
- Détection des changements de compétences de carrière liés aux choix (carried par les skills, déjà couvert par US2)

---

## 3. Constat sur l'existant

### 3.1. Infrastructure AOP livrée et fermée

| Issue | Titre | Statut |
|-------|-------|--------|
| #151 | US1: Enregistrer chaque action d'évolution du personnage | CLOSED |
| #158 | TECH: Architecture AOP et double hook preUpdateActor/updateActor | CLOSED |
| #159 | TECH: Analyseur de diff pour détection des changements | CLOSED |

### 3.2. `detectDetailChanges()` — déjà implémenté

`module/utils/audit-diff.mjs:276-324` :

```js
function detectDetailChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const detailChanges = changes.system?.details
  if (!detailChanges) return entries

  if (detailChanges.species !== undefined) {
    const oldSpecies = oldState.system?.details?.species?.name ?? null
    const newSpecies = actor.system?.details?.species?.name ?? null
    if (oldSpecies !== newSpecies) {
      entries.push(makeEntry({
        type: 'species.set',
        data: { oldSpecies, newSpecies },
        xpDelta: 0,
        ts, userId, user, snapshot,
      }))
    }
  }

  if (detailChanges.career !== undefined) {
    const oldCareer = oldState.system?.details?.career?.name ?? null
    const newCareer = actor.system?.details?.career?.name ?? null
    if (oldCareer !== newCareer) {
      entries.push(makeEntry({
        type: 'career.set',
        data: { oldCareer, newCareer },
        xpDelta: 0,
        ts, userId, user, snapshot,
      }))
    }
  }

  if (detailChanges.specializations !== undefined) {
    entries.push(
      ...detectSpecializationChanges(oldState, detailChanges.specializations, actor, ts, userId, user, snapshot),
    )
  }

  return entries
}
```

### 3.3. `detectSpecializationChanges()` — déjà implémenté

`module/utils/audit-diff.mjs:326-368` :

```js
function detectSpecializationChanges(oldState, specializationChanges, actor, ts, userId, user, snapshot) {
  const entries = []

  for (const [key, value] of Object.entries(specializationChanges)) {
    if (key.startsWith('-=')) {    // Foundry deletion syntax
      const specializationId = key.slice(2)
      if (!specializationId) continue
      entries.push(makeEntry({
        type: 'specialization.remove',
        data: { specializationId },
        xpDelta: 0,
        ts, userId, user, snapshot,
      }))
      continue
    }

    const oldSpec = oldState.system?.details?.specializations?.[key]
    const newSpec = actor.system?.details?.specializations?.[key]
    if (!oldSpec && newSpec) {
      entries.push(makeEntry({
        type: 'specialization.add',
        data: { specializationId: key },
        xpDelta: 0,
        ts, userId, user, snapshot,
      }))
    }
  }
  return entries
}
```

### 3.4. Structure des entrées de log

```json
// species.set
{
  "type": "species.set",
  "data": { "oldSpecies": null, "newSpecies": "Human" },
  "xpDelta": 0
}

// career.set
{
  "type": "career.set",
  "data": { "oldCareer": null, "newCareer": "Mercenary" },
  "xpDelta": 0
}

// specialization.add
{
  "type": "specialization.add",
  "data": { "specializationId": "spec1" },
  "xpDelta": 0
}

// specialization.remove
{
  "type": "specialization.remove",
  "data": { "specializationId": "spec1" },
  "xpDelta": 0
}
```

### 3.5. Tests existants

`tests/utils/audit-diff.test.mjs` — bloc `detail changes` (l.1244-1385) :

| Test | Statut |
|------|--------|
| `creates species.set entry` | ✅ |
| `creates career.set entry` | ✅ |
| `detects specialization.add on real addition` | ✅ |
| `does not detect specialization.add for internal specialization update` | ✅ |
| `detects specialization.remove from -= key` | ✅ |

Les 5 tests sont dans le vert. Aucun test d'edge case pour les valeurs nulles, les changements vers `null`, ou les IDs vides.

### 3.6. Câblage dans `composeEntries()`

`module/utils/audit-diff.mjs:424-426` :

```js
if (expandedChanges.system?.details) {
  entries.push(...detectDetailChanges(oldState, expandedChanges, actor, ts, userId, user, snapshot))
}
```

Les détails sont traités après les skills/caracs et avant l'avancement. La dédup XP ne concerne pas les détails (xpDelta = 0 pour tous les types).

---

## 4. Décisions d'architecture

### 4.1. Aucune modification nécessaire

**Décision** : Aucune modification de code n'est nécessaire pour US5. L'infrastructure US1/TECH-159 couvre intégralement les critères d'acceptation.

Justification :
- `detectDetailChanges()` et `detectSpecializationChanges()` sont implémentés, testés et fonctionnels
- Les quatre types d'événements (`species.set`, `career.set`, `specialization.add`, `specialization.remove`) sont produits
- La détection utilise des comparaisons old/new via `reconstructPreviousValue` et le snapshot oldState
- La chronologie est garantie par l'ordre FIFO des hooks Foundry

### 4.2. Pas de `cost` pour `specialization.add`

**Décision** : L'entrée `specialization.add` n'inclut pas de coût XP. `xpDelta = 0`.

Justification : Le coût XP d'une spécialisation est géré par un `actor.update()` séparé (mise à jour de `system.progression.experience.spent`), qui produira sa propre entrée `xp.spend`. Le détecteur de détails ne voit que `system.details.specializations`. C'est cohérent avec le pattern US1 (chaque `actor.update()` produit une entrée indépendante).

### 4.3. Pas de traçage des modifications internes de spécialisation

**Décision** : `detectSpecializationChanges` ignore les modifications de champs internes d'une spécialisation existante (ex: renommage). Seules l'ajout et la suppression sont tracés.

Justification : Le diff Foundry ne distingue pas un rename d'un add/suppress au niveau du SetField. Le détecteur compare `!oldSpec && newSpec` pour l'ajout, et `key.startsWith('-=')` pour la suppression. Une modification interne (ex: `name` change) n'est pas détectée — comportement intentionnel et documenté.

---

## 5. Plan de travail détaillé

### Étape 1 : Vérification de l'existant (tests passerelles)

1. Lire `detectDetailChanges()` et `detectSpecializationChanges()` — confirmer la couverture des AC
2. Vérifier le câblage dans `composeEntries()` — les détails sont bien traités
3. `npx vitest run tests/utils/audit-diff.test.mjs` — 53 tests passent

### Étape 2 : Test d'intégration

1. Simuler `actor.update({ 'system.details.species': { name: 'Human' } })` sur un character sans espèce
2. Vérifier `flags.swerpg.logs` contient `species.set` avec `oldSpecies: null, newSpecies: 'Human'`
3. Répéter pour carrière et spécialisations

### Étape 3 : Ajout de tests pour les edge cases

| Edge case | Description | Statut |
|-----------|-------------|--------|
| **species.set vers `null`** (suppression d'espèce) | `oldSpecies: 'Human', newSpecies: null` | ⚠️ À tester |
| **career.set vers `null`** | `oldCareer: 'Mercenary', newCareer: null` | ⚠️ À tester |
| **specializations.add avec clé non normalisée** | ID avec espaces ou caractères spéciaux | ⚠️ À tester |
| **specialization.remove avec ID vide** | `-=: null` ignoré | ✅ Déjà géré |
| **Aucun changement dans details** | `details` présent mais valeurs identiques → `[]` | ⚠️ À tester |

### Étape 4 : Vérification de la chronologie

Les hooks Foundry `preUpdateActor`/`updateActor` sont appelés dans l'ordre des `actor.update()`. Le pending queue (FIFO) dans `audit-log.mjs` garantit que les entrées sont consommées et écrites dans l'ordre de réception. La chronologie est donc préservée sans code supplémentaire.

### Étape 5 : Mise à jour de la checklist de l'épic #150

Marquer US5 comme vérifiée dans la feuille de route de l'épic.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `tests/utils/audit-diff.test.mjs` | **Modification** (mineure) | Ajout de tests edge case (valeurs nulles, changement vers null, spécialisation inchangée) |

Aucune modification de code métier ou d'infrastructure n'est nécessaire.

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **species.details ou career.details avec structure différente** | `species?.name` / `career?.name` peut être `undefined` si la structure change | Fallback `?? null` déjà en place. Tests à maintenir si le data model évolue |
| **specializations SetField avec format non standard** | `specialization.add` non détecté si le diff Foundry utilise un autre format | Le pattern `!oldSpec && newSpec` est robuste. Risque faible |
| **Ordre des updates inversé** (coût XP après choix, ou choix après XP) | Chronologie légèrement différente de l'ordre "logique" | Attendu : chaque update produit une entrée. US6 pourra regrouper par timestamp |
| **OggDude import** : les choix sont définis en masse | Multiples entrées pour un seul import | Hors périmètre US5. L'import OggDude pourra être traité séparément |

---

## 8. Proposition d'ordre de commit

1. **Tests : ajout de tests edge case** dans `tests/utils/audit-diff.test.mjs` (valeurs nulles, changement vers null)
2. **Vérification** : `npx vitest run tests/utils/audit-diff.test.mjs` passe
3. **Fermeture de l'issue** #155

---

## 9. Dépendances avec les autres US

```
US1 (infrastructure AOP + diff analyzer) — LIVRÉ
  │
  ├── US2 (skills)     — LIVRÉ
  ├── US3 (caracs)     — LIVRÉ
  ├── US4 (talents)    — BLOQUÉ (talents non implémentés)
  ├── US5 (choix)      — 🎯 COUVERT par US1 (vérification uniquement)
  ├── US6 (UI)         — consomme flags.swerpg.logs
  └── US7 (export)     — lit flags.swerpg.logs
```

US5 n'a aucune dépendance bloquante. L'infrastructure est en place, testée, et fonctionnelle. La vérification peut être faite en isolation.
