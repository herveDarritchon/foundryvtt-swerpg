# Plan d'implémentation — #161 : Snapshot XP dans chaque entrée de log

**Issue** : [#161 — TECH: Snapshot XP dans chaque entrée de log](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/161)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**User Story** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plan de référence** : `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` (§4.7)
**Plans amont** :
  - `documentation/plan/character-sheet/evolution-logs/TECH-158-plan-aop-hooks.md`
  - `documentation/plan/character-sheet/evolution-logs/TECH-159-plan-diff-analyzer.md`
  - `documentation/plan/character-sheet/evolution-logs/TECH-160-plan-resilience.md`
**Module impacté** : `module/utils/audit-diff.mjs` (modification)

---

## 1. Objectif

Remplacer le snapshot XP actuel (`{ available, spent, gained }` dans `snapshot.xpAfter`) par un snapshot enrichi qui capture l'intégralité de l'état XP du personnage au moment de l'écriture : XP available/spent/gained + rangs gratuits carrière et spécialisation. Ce snapshot permet aux US ultérieures (US6 — visualisation, US7 — export) de reconstituer l'évolution chronologique des ressources sans recalcul.

**Règle inviolable** : aucune modification du code métier existant — les changements sont confinés à `audit-diff.mjs` et ses tests.

---

## 2. Périmètre

### Inclus

- Renommage de `captureXpSnapshotAfter()` en `captureSnapshot()` dans `module/utils/audit-diff.mjs`
- Ajout des champs `careerFreeAvailable` et `specializationFreeAvailable` au snapshot
- Renommage des champs existants : `available` → `xpAvailable`, `spent` → `totalXpSpent`, `gained` → `totalXpGained`
- Aplatissement de la structure : suppression du sous-objet `snapshot.xpAfter`, montée directe dans `snapshot.{xpAvailable, ...}`
- Mise à jour de `makeEntry()` : param `xpAfter` → `snapshot`, stockage plat `snapshot: { ...snapshot }`
- Mise à jour des 6 détecteurs (`detectSkillChanges`, `detectCharacteristicChanges`, `detectXpChanges`, `detectDetailChanges`, `detectSpecializationChanges`, `detectAdvancementChanges`) : param `xpAfter` → `snapshot`
- Mise à jour de `composeEntries()` pour utiliser la nouvelle fonction et le nouveau nom de paramètre
- Mise à jour des exports du module
- Mise à jour des tests Vitest dans `tests/utils/audit-diff.test.mjs`
- Copie défensive du snapshot dans `makeEntry()` (déjà en place, à adapter à la nouvelle structure)

### Exclu

- **Rétrocompatibilité des entrées existantes** : les logs déjà stockés avec l'ancien format (`snapshot.xpAfter`) ne sont pas migrés. La normalisation sera faite côté affichage dans US6.
- **Modification de `audit-log.mjs`** : aucune — `composeEntries` conserve la même signature publique (seul le paramètre interne est renommé)
- **Modification des data models** : le snapshot est une donnée de log dans les flags, pas un champ système
- **US6 (visualisation)** : utilisation du snapshot dans l'interface — traité dans une issue séparée
- **US7 (export)** : utilisation du snapshot dans les exports — traité dans une issue séparée
- **Incrément de `schemaVersion`** : reste à 1 (la structure snapshot n'est pas un discriminant de parsing)
- **Modification de `lang/en.json` et `lang/fr.json`** : aucun changement nécessaire

---

## 3. Constat sur l'existant

### 3.1. Snapshot actuel dans `audit-diff.mjs`

```js
function captureXpSnapshotAfter(actor) {
  const xp = actor.system?.progression?.experience
  if (!xp) {
    return { available: 0, spent: 0, gained: 0 }
  }
  return {
    available: xp.available ?? 0,
    spent: xp.spent ?? 0,
    gained: xp.gained ?? 0,
  }
}
```

### 3.2. Structure d'entrée actuelle

```js
{
  id: "abc123",
  schemaVersion: 1,
  // timestamp, userId, userName, type, data, xpDelta ...
  snapshot: {
    xpAfter: {
      available: 150,
      spent: 50,
      gained: 200,
    }
  }
}
```

### 3.3. `makeEntry` actuel

```js
function makeEntry({ type, data, xpDelta, ts, userId, user, xpAfter }) {
  return {
    id: foundry.utils.randomID(),
    schemaVersion: 1,
    timestamp: ts,
    userId,
    userName: user?.name ?? 'Unknown',
    type,
    data,
    xpDelta,
    snapshot: {
      xpAfter: { ...xpAfter },
    },
  }
}
```

### 3.4. Données XP disponibles dans `actor.system.progression`

| Chemin | Origine |
|--------|---------|
| `experience.spent` | Persisté (data model) |
| `experience.gained` | Persisté (data model) |
| `experience.total` | Calculé dans `_prepareExperience()` |
| `experience.available` | Calculé dans `_prepareExperience()` |
| `freeSkillRanks.career.spent` | Persisté (data model) |
| `freeSkillRanks.career.gained` | Persisté (data model) |
| `freeSkillRanks.career.available` | Calculé dans `_prepareFreeSkillRanks()` |
| `freeSkillRanks.specialization.spent` | Persisté (data model) |
| `freeSkillRanks.specialization.gained` | Persisté (data model) |
| `freeSkillRanks.specialization.available` | Calculé dans `_prepareFreeSkillRanks()` |

Ces champs calculés sont disponibles au moment du hook `updateActor` car `prepareDerivedData()` est exécutée après chaque mise à jour.

### 3.5. Tests existants

- `captureXpSnapshotAfter` : 2 tests (snapshot normal, données manquantes → zéros)
- `makeEntry` : 4 tests (structure, fallback userName, -0 normalisation, shallow-clone)
- Les détecteurs et `composeEntries` vérifient indirectement le snapshot via `toMatchObject`
- `defaultSource()` dans les helpers contient `freeSkillRanks.career` et `freeSkillRanks.specialization` (sans `available`)

---

## 4. Décisions d'architecture

### 4.1. Aplatissement de la structure snapshot

**Décision** : Remplacer `snapshot.xpAfter.{available, spent, gained}` par `snapshot.{xpAvailable, totalXpSpent, totalXpGained, careerFreeAvailable, specializationFreeAvailable}`.

Justification :
- Conforme à la spec de l'issue #161 (format exact imposé)
- Noms longs auto-documentés dans le JSON brut
- Structure aplatie plus simple à consommer par US6
- Préfixe `xp` / suffixe `FreeAvailable` lève toute ambiguïté entre champs XP et free ranks

### 4.2. Pas de migration des entrées existantes

**Décision** : Les entrées déjà stockées avec `snapshot.xpAfter` ne sont pas migrées.

Justification :
- ADR-0011 : les flags sont des données secondaires, pas une source de vérité
- US6 devra normaliser les deux formats à l'affichage (ancien : `snapshot.xpAfter`, nouveau : `snapshot.*`)
- Éviter une migration coûteuse et risquée sur des données non critiques

### 4.3. Lecture de `available` depuis les données préparées

**Décision** : Lire `freeSkillRanks.career.available` et `freeSkillRanks.specialization.available` depuis `actor.system.progression`, plutôt que de recalculer `gained - spent`.

Justification :
- `available` est déjà calculé par `_prepareFreeSkillRanks()` durant `prepareDerivedData()`
- Le `?? 0` de la spec couvre le cas d'indisponibilité
- DRY : ne pas dupliquer la formule de calcul

### 4.4. Renommage du paramètre `xpAfter` en `snapshot`

**Décision** : Le paramètre `xpAfter` de `makeEntry` et des détecteurs devient `snapshot`.

Justification :
- Cohérence sémantique : la variable ne contient plus seulement "l'XP après" mais aussi les free ranks
- Préparation à d'éventuelles extensions futures du snapshot

### 4.5. `schemaVersion` inchangé

**Décision** : Ne pas incrémenter `schemaVersion` (reste à 1).

Justification : La structure `snapshot` n'est pas un champ critique pour le parsing (la clé `type` et `data` sont les discriminants). US6 gérera la rétrocompatibilité.

---

## 5. Plan de travail détaillé

### Étape 1 : Renommer et enrichir `captureSnapshot`

**Fichier** : `module/utils/audit-diff.mjs`

- Renommer `captureXpSnapshotAfter` → `captureSnapshot`
- Étendre le retour : `xpAvailable`, `totalXpSpent`, `totalXpGained`, `careerFreeAvailable`, `specializationFreeAvailable`

```js
function captureSnapshot(actor) {
  const xp = actor.system?.progression?.experience
  const freeRanks = actor.system?.progression?.freeSkillRanks
  return {
    xpAvailable: xp?.available ?? 0,
    totalXpSpent: xp?.spent ?? 0,
    totalXpGained: xp?.gained ?? 0,
    careerFreeAvailable: freeRanks?.career?.available ?? 0,
    specializationFreeAvailable: freeRanks?.specialization?.available ?? 0,
  }
}
```

**Risques** : Aucun — fonction pure sans effet de bord.

### Étape 2 : Mettre à jour `makeEntry`

**Fichier** : `module/utils/audit-diff.mjs`

- Changer le paramètre `xpAfter` → `snapshot`
- Changer la valeur stockée : `snapshot: { xpAfter: { ...xpAfter } }` → `snapshot: { ...snapshot }`

```js
function makeEntry({ type, data, xpDelta, ts, userId, user, snapshot }) {
  return {
    id: foundry.utils.randomID(),
    schemaVersion: 1,
    timestamp: ts,
    userId,
    userName: user?.name ?? 'Unknown',
    type,
    data,
    xpDelta,
    snapshot: { ...snapshot },
  }
}
```

**Risques** : Vérifier que tous les appelants passent le bon paramètre.

### Étape 3 : Mettre à jour les détecteurs et `composeEntries`

**Fichier** : `module/utils/audit-diff.mjs`

- Dans `composeEntries` : `captureXpSnapshotAfter` → `captureSnapshot`, variable `xpAfter` → `snapshot`
- Dans les 6 détecteurs, renommer le paramètre `xpAfter` → `snapshot`
- Vérifier que tous les appels à `makeEntry` passent `snapshot`

Détecteurs concernés :
| Fonction | Lignes |
|----------|--------|
| `detectSkillChanges` | ~89-139 |
| `detectCharacteristicChanges` | ~168-207 |
| `detectXpChanges` | ~213-269 |
| `detectDetailChanges` | ~271-319 |
| `detectSpecializationChanges` | ~321-363 |
| `detectAdvancementChanges` | ~365-384 |

### Étape 4 : Mettre à jour les exports

**Fichier** : `module/utils/audit-diff.mjs`

Ligne ~437-446 :
```js
export {
  makeEntry,
  captureSnapshot,   // was captureXpSnapshotAfter
  // ... unchanged ...
}
```

### Étape 5 : Mettre à jour les tests Vitest

**Fichier** : `tests/utils/audit-diff.test.mjs`

- **Tests `captureXpSnapshotAfter`** (lignes ~186-225) :
  - Renommer `describe` et import → `captureSnapshot`
  - Mettre à jour les assertions : `available` → `xpAvailable`, `spent` → `totalXpSpent`, `gained` → `totalXpGained`
  - Ajouter `freeSkillRanks` avec `available` dans le mock de base pour tester les nouveaux champs
  - Ajouter un test cas limite : `freeSkillRanks` manquant → zéros

- **Tests `makeEntry`** (lignes ~231-338) :
  - Remplacer `xpAfter` par `snapshot` dans les appels
  - Ajouter les nouveaux champs (`careerFreeAvailable`, `specializationFreeAvailable`) au snapshot de test
  - Mettre à jour les assertions : `snapshot.xpAfter.available` → `snapshot.xpAvailable`
  - Adapter le test de shallow-clone : `entry.snapshot.xpAfter.available` → `entry.snapshot.xpAvailable`

- **Tests indirects** (détecteurs, `composeEntries`) :
  - Vérifier qu'aucun test ne référence `snapshot.xpAfter` (chercher dans le fichier)
  - Mettre à jour si nécessaire

### Étape 6 : Vérification finale

- Lancer `npx vitest run tests/utils/audit-diff.test.mjs`
- Vérifier qu'aucun import de `captureXpSnapshotAfter` ne subsiste ailleurs dans le projet

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/utils/audit-diff.mjs` | Modification | Renommage `captureXpSnapshotAfter` → `captureSnapshot`, enrichissement du payload, aplatissement de `snapshot`, mise à jour de `makeEntry`, des 6 détecteurs, de `composeEntries`, et des exports |
| `tests/utils/audit-diff.test.mjs` | Modification | Mise à jour des 2 tests `captureXpSnapshotAfter` + 4 tests `makeEntry` + tests indirects ; ajout de `available` dans mock `freeSkillRanks` ; nouveaux tests pour `careerFreeAvailable` / `specializationFreeAvailable` |
| `module/utils/audit-log.mjs` | Aucun changement | Importe `composeEntries` — signature publique inchangée |
| `tests/utils/audit-log.test.mjs` | Aucun changement | Ne teste pas directement le snapshot |
| `lang/en.json` | Aucun changement | Pas de clés i18n liées au snapshot |
| `lang/fr.json` | Aucun changement | Idem |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Régression sur un détecteur** : param `xpAfter` oublié, pas converti en `snapshot` | Les entrées de log pour ce type auront un snapshot vide ou `undefined` | Recherche exhaustive de `xpAfter` dans `audit-diff.mjs`. Vérification que tous les appels à `makeEntry` passent `snapshot` |
| **Tests insuffisants** : les tests indirects ne couvrent pas les nouveaux champs | Régression non détectée | Ajouter des assertions explicites sur les nouveaux champs dans les tests des détecteurs |
| **Rétrocompatibilité oubliée** : US6 attend le nouveau format mais reçoit l'ancien pour les logs pré-migration | Affichage partiellement cassé | Documenter dans le plan US6 la normalisation nécessaire des deux formats |
| **`available` non défini** (cas edge : hook appelé avant `prepareDerivedData`) | `careerFreeAvailable` = 0 (fallback `?? 0`) | Comportement acceptable : 0 est une valeur valide (pas de rangs gratuits) |

---

## 8. Proposition d'ordre de commit

1. **refactor(audit): rename `captureXpSnapshotAfter` to `captureSnapshot` and expand payload**
   - Renommage de la fonction, ajout de `careerFreeAvailable` et `specializationFreeAvailable`
   - Renommage : `available` → `xpAvailable`, `spent` → `totalXpSpent`, `gained` → `totalXpGained`

2. **refactor(audit): flatten snapshot structure in `makeEntry` and detectors**
   - `makeEntry` : param `xpAfter` → `snapshot`, stockage : `snapshot: { ...snapshot }`
   - 6 détecteurs + `composeEntries` : param `xpAfter` → `snapshot`
   - Mise à jour des exports

3. **test(audit): update snapshot tests for new structure and fields**
   - Tests `captureSnapshot` avec nouveaux champs
   - Tests `makeEntry` avec structure plate
   - Ajout `available` dans mock `freeSkillRanks` de `defaultSource()`
   - Nouveaux tests pour `careerFreeAvailable` / `specializationFreeAvailable`
   - Vérification `npx vitest run tests/utils/audit-diff.test.mjs` OK

---

## 9. Dépendances avec les autres US

```
TECH-161 (ce ticket) — enrichit le snapshot dans chaque entrée de log
  ↑ US1 (infrastructure) — le snapshot existait déjà, ce ticket le complète
  ↓ US6 (visualisation) — consomme le snapshot enrichi pour l'affichage
  ↓ US7 (export) — consomme le snapshot enrichi pour l'export
  ↓ Debug — permet de comprendre l'état XP à un instant T sans rejouer les calculs
```

TECH-161 n'a pas de dépendance bloquante. Il peut être implémenté indépendamment après US1 (déjà livré). Aucune modification du code métier n'est nécessaire.
