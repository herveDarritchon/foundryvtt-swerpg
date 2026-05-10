# Plan d'implémentation — US1 : Enregistrer chaque action d'évolution du personnage dans un journal de bord

**Issue** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Module impacté** : `module/utils/audit-log.mjs` (création), `swerpg.mjs` (modification)

---

## 1. Objectif

Mettre en place un système de journalisation via hooks Foundry qui intercepte **toute mise à jour d'un actor de type `character`** et enregistre automatiquement une trace structurée dans `actor.flags.swerpg.logs`, sans modifier le code métier existant (approche AOP).

US1 pose l'infrastructure transverse. US2 à US5 instrumenteront des types d'événements spécifiques ; US6 fournira l'interface de visualisation.

---

## 2. Périmètre

### Inclus dans US1

- Création du fichier `module/utils/audit-log.mjs` avec :
  - Hook handler `onPreUpdate` — capture de l'état `_source` avant modification (nécessaire pour connaître les anciennes valeurs)
  - Hook handler `onUpdate` — analyse du diff, composition de l'entrée de log, écriture dans les flags
  - Analyseur de diff capable de détecter les types de changement suivants :
    - `skill.train` / `skill.forget` — modification d'un rang de compétence
    - `characteristic.increase` — modification d'une caractéristique
    - `xp.spend` — dépense d'XP (`system.progression.experience.spent`)
    - `xp.grant` — gain d'XP (`system.progression.experience.gained`)
    - `species.set` — changement d'espèce
    - `career.set` — changement de carrière
    - `specialization.add` / `specialization.remove` — ajout/retrait de spécialisation
    - `advancement.level` — changement de niveau
    - `talent.purchase` — achat de talent (détecté via création d'item)
    - `system.other` — toute autre modification non typée
  - Fonction `#writeLogEntry` — écriture sécurisée dans les flags avec try/catch, taille max, garde anti-boucle
  - Fonction `#captureSnapshot` — capture de l'état XP courant
  - Guard anti-boucle infinie (ignorer les updates qui ne changent QUE `flags.swerpg.logs`)
- Câblage des hooks dans `swerpg.mjs` :
  - `Hooks.on('preUpdateActor', auditLog.onPreUpdate)`
  - `Hooks.on('updateActor', auditLog.onUpdate)`
  - `Hooks.on('createItem', auditLog.onCreateItem)` — pour détecter les achats de talent
- Gestion d'erreur :
  - Échec d'écriture : `logger.error` + `ui.notifications.warn`
  - Échec silencieux : l'action utilisateur n'est jamais bloquée
- Internationalisation :
  - Clé `AUDIT.WRITE_FAILED` pour le message d'erreur UI
- Tests Vitest :
  - Tests unitaires pour l'analyseur de diff
  - Tests d'intégration pour les hooks (simulation d'update actor)
  - Test de non-régression : les updates sans changement pertinent ne créent pas d'entrée

### Exclu de US1

- Interface de visualisation des logs → US6
- Export des logs → US7
- Regroupement des entrées multiples pour une même action métier (skill.train = 1 update rank + 1 update XP → 2 entrées de log) → pourra être amélioré dans une US ultérieure si le besoin est validé
- Détection des changements OggDude (import en masse) → à traiter dans US2/US5
- Migration des logs existants (aucun n'existe)

---

## 3. Constat sur l'existant

### Aucun audit log n'existe

Il n'y a **aucune** structure de log, d'historique ou de trace dans le codebase. Les seules données de progression disponibles sont :

```
actor.system.progression.experience      → { spent, gained, total, available, startingExperience }
actor.system.progression.freeSkillRanks  → { career: { spent, gained }, specialization: { spent, gained } }
```

Ces champs sont des compteurs globaux : impossible de savoir quels achats individuels ont été réalisés.

### ADR-0011 déjà accepté

L'ADR `adr-0011-stockage-journal-evolution-personnage-flags.md` valide le stockage dans `actor.flags.swerpg.logs`. Les règles de conception sont claires :

- Le log est une donnée **secondaire**, pas une source de vérité
- Chaque entrée = une modification
- Stockage dans les flags pour éviter migration du data model
- Pas de recalcul automatique de l'état du personnage à partir du log

### Multiples `actor.update()` par opération logique

Une action comme `purchaseSkill` déclenche **2 appels `actor.update()`** distincts :

1. `actor.update({ 'system.skills.${id}.rank': newRank })` — via `trained-skill.mjs:74`
2. `actor.update({ 'system.progression.experience.spent': newSpent })` — via `updateExperiencePoints()` dans `actor.mjs:73`

Ces appels sont séquentiels avec `await` entre eux. Le hook `updateActor` sera donc appelé **2 fois** pour une seule action utilisateur. C'est un comportement attendu : US1 ne tente pas de les fusionner.

### Signature des hooks Foundry v14

| Hook | Paramètres | Timing |
|------|-----------|--------|
| `preUpdateActor(actor, changes, options, userId)` | `actor` = instance (old state dans `_source`), `changes` = diff imbriqué | Avant écriture DB |
| `updateActor(actor, changes, options, userId)` | `actor` = instance (new state dans `_source`), `changes` = diff imbriqué | Après écriture DB |

**Important** : Après `updateActor`, `actor._source` contient déjà les nouvelles valeurs. On NE PEUT PAS récupérer les anciennes valeurs depuis `_source` dans ce hook. D'où la nécessité du hook `preUpdateActor` pour capturer l'ancien état.

| Hook | Paramètres | Timing |
|------|-----------|--------|
| `createItem(item, data, options, userId)` | `item` = l'item créé, `data` = les données de création | Après création DB |

Le `createItem` permet de détecter les achats de talent (création d'un embedded Item de type `talent`).

### Contrôle des boucles infinies

Écrire dans `flags.swerpg.logs` via `actor.update()` déclenche un nouveau `updateActor` hook. Sans garde, c'est une boucle infinie.

**Solution** : Détecter si le `changes` ne contient QUE `flags.swerpg.logs`. Dans ce cas, ignorer le hook.

```js
function isOnlyAuditChange(changes) {
  const keys = Object.keys(foundry.utils.flattenObject(changes))
  return keys.length === 1 && keys[0] === 'flags.swerpg.logs'
}
```

---

## 4. Décisions d'architecture

### 4.1. Hook global vs override de `_onUpdate`

**Décision** : Utiliser `Hooks.on('updateActor', ...)` plutôt que de surcharger `SwerpgActor._onUpdate()`.

Justification :

- Approche AOP : le code métier (actor.mjs, skill-costs.mjs, etc.) n'est pas modifié
- Séparation des concerns : l'audit log est un aspect transverse, pas une responsabilité du modèle acteur
- Désactivable : on peut retirer les hooks sans impacter le métier
- Réutilisable : le même pattern pourra être appliqué aux `createItem` (talent)

### 4.2. Double hook (preUpdate + update) pour capturer les anciennes valeurs

**Décision** : Utiliser `preUpdateActor` pour capturer les anciennes valeurs, `updateActor` pour composer et écrire le log.

Mécanisme :

```js
const pendingOldStates = new Map() // actor.uuid → { oldState, changes, userId, timestamp }

Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
  if (actor.type !== 'character') return
  if (isOnlyAuditChange(changes)) return

  pendingOldStates.set(actor.uuid, {
    oldState: snapshotOldState(actor._source, changes),
    changes,
    userId,
    timestamp: Date.now(),
  })
})

Hooks.on('updateActor', (actor, changes, options, userId) => {
  if (actor.type !== 'character') return
  if (isOnlyAuditChange(changes)) return

  const pending = pendingOldStates.get(actor.uuid)
  pendingOldStates.delete(actor.uuid)
  if (!pending) return // sécurité : preUpdate non reçu ou déjà consommé

  const entries = composeEntries(pending.oldState, changes, actor, pending.userId)
  for (const entry of entries) {
    await writeLogEntry(actor, entry)
  }
})
```

**Risque** : Si `preUpdateActor` est appelé mais que `updateActor` ne l'est pas (ex : erreur DB), une entrée orpheline reste dans `pendingOldStates`. Solution : `Map` est nettoyée à chaque appel de `updateActor`. Les orphelines sont limitées au cycle de vie de la page.

### 4.3. Détection du type de changement par analyse du diff

**Décision** : Analyser le diff `changes.system` avec des utilitaires de détection de chemin Foundry (`foundry.utils.hasProperty`, `foundry.utils.getProperty`).

Algorithme :

```js
function composeEntries(oldState, changes, actor, userId) {
  const entries = []

  // Détection skill.train / skill.forget
  const skillsChanged = changes.system?.skills
  if (skillsChanged) {
    for (const [skillId, skillData] of Object.entries(skillsChanged)) {
      if (!skillData.rank) continue
      const oldRank = oldState.skills?.[skillId]?.rank ?? { base: 0, careerFree: 0, specializationFree: 0, trained: 0 }
      const newRank = actor.system.skills?.[skillId]?.rank
      if (!newRank) continue

      const oldTotal = oldRank.base + oldRank.careerFree + oldRank.specializationFree + oldRank.trained
      const newTotal = newRank.base + newRank.careerFree + newRank.specializationFree + newRank.trained
      if (oldTotal === newTotal) continue

      entries.push({
        type: newTotal > oldTotal ? 'skill.train' : 'skill.forget',
        data: {
          skillId,
          oldRank: oldTotal,
          newRank: newTotal,
          cost: calculateCost(oldState, changes, newTotal > oldTotal),
          isFree: isFreeRank(oldState, changes, skillId),
        },
        xpDelta: computeXpDelta(oldState, changes),
      })
    }
  }

  // Détection characteristic.increase
  const charsChanged = changes.system?.characteristics
  if (charsChanged) { /* même logique */ }

  // Détection xp.spend / xp.grant
  const xpChanged = changes.system?.progression?.experience
  if (xpChanged) { /* détection spent / gained */ }

  // Détection species.set, career.set
  // Détection specialization.add / .remove
  // Détection advancement.level

  return entries
}
```

### 4.4. Détection des achats de talent via `createItem`

**Décision** : Utiliser `Hooks.on('createItem', ...)` pour détecter la création d'un Item de type `talent` sur un actor character. Le hook `updateActor` ne capte pas les créations d'embedded documents.

```js
Hooks.on('createItem', (item, data, options, userId) => {
  if (item.parent?.type !== 'character') return
  if (item.type !== 'talent') return

  const entry = {
    type: 'talent.purchase',
    data: {
      talentId: item.id,
      talentName: item.name,
      cost: item.system.cost ?? 5,
      ranks: item.system.ranks ?? 1,
    },
    xpDelta: -(item.system.cost ?? 5),
  }

  writeLogEntry(item.parent, enhanceEntry(entry, userId))
})
```

### 4.5. Pas de fusion des appels multiples

**Décision** : Chaque `actor.update()` produit une entrée de log indépendante. Une action `purchaseSkill` produira 2 entrées :

1. `skill.train` (ou `skill.forget`) avec les données de rang
2. `xp.spend` avec le montant dépensé

Ces entrées partagent le même `timestamp` (à la milliseconde près), ce qui permettra à l'interface US6 de les regrouper visuellement.

**Alternative écartée** : Utiliser un contexte de transaction (ex : `actor._auditBatch`) qui fusionnerait les entrées. Raison : complexité inutile pour le MVP, risque de fuite mémoire, et le regroupement visuel est un problème d'UI (US6) pas de collecte de données.

### 4.6. Gestion d'erreur : fire-and-forget avec notification

**Décision** : L'écriture du log est en `try/catch`. En cas d'échec :

1. `logger.error('[AuditLog] Échec d'écriture du log :', { actorId: actor.id, error: err })`
2. `ui.notifications.warn(game.i18n.localize('AUDIT.WRITE_FAILED'))` — visible par l'utilisateur courant
3. Si l'utilisateur est MJ, un message chuchoté aux MJ est envoyé comme trace supplémentaire

L'action utilisateur n'est **jamais** interrompue par un échec d'écriture du log.

```js
async function writeLogEntry(actor, entry) {
  try {
    const currentLogs = actor.flags.swerpg?.logs ?? []
    currentLogs.push(entry)
    if (currentLogs.length > 500) currentLogs.splice(0, currentLogs.length - 500)
    await actor.update({ 'flags.swerpg.logs': currentLogs })
  } catch (err) {
    handleWriteError(actor, err)
  }
}
```

### 4.7. Format de snapshot

**Décision** : Chaque entrée inclut un snapshot de l'état XP au moment de l'écriture, ce qui permet de reconstituer l'évolution sans recalcul.

```js
function captureSnapshot(actor) {
  const xp = actor.system.progression?.experience
  return {
    xpAvailable: xp?.available ?? 0,
    totalXpSpent: xp?.spent ?? 0,
    totalXpGained: xp?.gained ?? 0,
    careerFreeAvailable: actor.system.progression?.freeSkillRanks?.career?.available ?? 0,
    specializationFreeAvailable: actor.system.progression?.freeSkillRanks?.specialization?.available ?? 0,
  }
}
```

### 4.8. Clés i18n

**Décision** : Namespace `AUDIT.*` (dans `SKILL.AUDIT.*` pour rester cohérent avec `SKILL.XP_CONSOLE.*`).

| Clé | EN | FR |
|-----|----|----|
| `SKILL.AUDIT.WRITE_FAILED` | Audit log could not be saved. See console for details. | Le journal d'évolution n'a pas pu être sauvegardé. Voir la console pour plus de détails. |

Les descriptions lisibles des types d'événement seront ajoutées dans US6 (interface de visualisation).

---

## 5. Plan de travail détaillé

### Étape 1 : Créer `module/utils/audit-log.mjs`

Contenu du module :

```
module/utils/audit-log.mjs
├── Constantes
│   ├── MAX_LOG_ENTRIES = 500
│   ├── AUDIT_LOG_KEY = 'flags.swerpg.logs'
│   └── pendingOldStates = new Map()
├── Hooks exportés
│   ├── onPreUpdate(actor, changes, options, userId)  → capture old state
│   ├── onUpdate(actor, changes, options, userId)      → compose + write
│   └── onCreateItem(item, data, options, userId)       → talent detection
├── Analyse du diff
│   ├── detectSkillChanges(oldState, changes, actor)    → skill.train / skill.forget
│   ├── detectCharacteristicChanges(oldState, changes, actor)
│   ├── detectXpChanges(oldState, changes)
│   ├── detectDetailChanges(oldState, changes, actor)   → species, career, spec
│   └── detectAdvancementChanges(oldState, changes)
├── Helpers
│   ├── composeEntry(type, data, oldState, changes, actor, userId)
│   ├── captureSnapshot(actor)
│   ├── isOnlyAuditChange(changes)
│   └── snapshotOldState(source, changes)
├── Écriture
│   └── writeLogEntry(actor, entry)
└── Gestion d'erreur
    └── handleWriteError(actor, err)
```

Structure du module :

```js
// audit-log.mjs
import { logger } from './logger.mjs'

const MAX_LOG_ENTRIES = 500
const AUDIT_LOG_KEY = 'flags.swerpg.logs'
const pendingOldStates = new Map()

/* -------------------------------------------- */
/*  Hooks publics                               */
/* -------------------------------------------- */

export function onPreUpdate(actor, changes, options, userId) {
  if (actor.type !== 'character') return
  if (isOnlyAuditChange(changes)) return

  pendingOldStates.set(actor.uuid, {
    oldState: snapshotOldState(actor._source, changes),
    changes,
    userId,
    timestamp: Date.now(),
  })
}

export function onUpdate(actor, changes, options, userId) {
  if (actor.type !== 'character') return
  if (isOnlyAuditChange(changes)) return

  const pending = pendingOldStates.get(actor.uuid)
  pendingOldStates.delete(actor.uuid)
  if (!pending) return

  const entries = composeEntries(pending.oldState, changes, actor, pending.userId)
  for (const entry of entries) {
    await writeLogEntry(actor, entry)
  }
}

export function onCreateItem(item, data, options, userId) {
  if (item.parent?.type !== 'character') return
  if (item.type !== 'talent') return
  // Composition et écriture d'une entrée talent.purchase
}

/* -------------------------------------------- */
/*  Analyse du diff                             */
/* -------------------------------------------- */

function composeEntries(oldState, changes, actor, userId) {
  const entries = []
  const ts = Date.now()
  const snapshot = captureSnapshot(actor)
  const user = game.users.get(userId)

  // Skills
  if (changes.system?.skills) {
    entries.push(...detectSkillChanges(oldState, changes, actor, ts, userId, user, snapshot))
  }

  // Characteristics
  if (changes.system?.characteristics) {
    entries.push(...detectCharacteristicChanges(oldState, changes, actor, ts, userId, user, snapshot))
  }

  // XP
  if (changes.system?.progression?.experience) {
    entries.push(...detectXpChanges(oldState, changes, actor, ts, userId, user, snapshot))
  }

  // Details (species, career, specializations)
  if (changes.system?.details) {
    entries.push(...detectDetailChanges(oldState, changes, actor, ts, userId, user, snapshot))
  }

  // Advancement
  if (changes.system?.advancement) {
    entries.push(...detectAdvancementChanges(oldState, changes, actor, ts, userId, user, snapshot))
  }

  return entries
}
```

### Détection des changements de compétences

```js
function detectSkillChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  for (const [skillId, skillData] of Object.entries(changes.system.skills)) {
    if (!skillData.rank) continue

    const oldRank = oldState.skills?.[skillId]?.rank ?? {}
    const oldTotal = (oldRank.base ?? 0) + (oldRank.careerFree ?? 0) +
      (oldRank.specializationFree ?? 0) + (oldRank.trained ?? 0)

    const newRankObj = actor.system.skills?.[skillId]?.rank
    if (!newRankObj) continue
    const newTotal = newRankObj.base + newRankObj.careerFree +
      newRankObj.specializationFree + newRankObj.trained

    if (oldTotal === newTotal) continue

    const cost = computeSkillCost(oldState, changes, skillId, newTotal > oldTotal)
    const isFree = cost === 0 && newTotal > oldTotal

    entries.push(makeEntry({
      type: newTotal > oldTotal ? 'skill.train' : 'skill.forget',
      data: { skillId, oldRank: oldTotal, newRank: newTotal, cost, isFree },
      xpDelta: newTotal > oldTotal ? -(cost) : cost,
      ts, userId, user, snapshot,
    }))
  }
  return entries
}

function makeEntry({ type, data, xpDelta, ts, userId, user, snapshot }) {
  return {
    id: foundry.utils.randomID(),
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

### Détection des changements d'XP

```js
function detectXpChanges(oldState, changes, actor, ts, userId, user, snapshot) {
  const entries = []
  const exp = changes.system.progression.experience

  if (exp.spent !== undefined) {
    const oldSpent = oldState.progression?.experience?.spent ?? 0
    const newSpent = actor.system.progression.experience.spent
    const diff = newSpent - oldSpent
    if (diff !== 0) {
      entries.push(makeEntry({
        type: diff > 0 ? 'xp.spend' : 'xp.refund',
        data: { amount: Math.abs(diff), oldSpent, newSpent },
        xpDelta: -diff,
        ts, userId, user, snapshot,
      }))
    }
  }

  if (exp.gained !== undefined) {
    const oldGained = oldState.progression?.experience?.gained ?? 0
    const newGained = actor.system.progression.experience.gained
    const diff = newGained - oldGained
    if (diff !== 0) {
      entries.push(makeEntry({
        type: 'xp.grant',
        data: { amount: diff, oldGained, newGained },
        xpDelta: diff,
        ts, userId, user, snapshot,
      }))
    }
  }

  return entries
}
```

### Snapshot de l'ancien état

```js
function snapshotOldState(source, changes) {
  // Extrait uniquement les parties du _source qui sont modifiées dans changes
  // pour minimiser la mémoire utilisée par pendingOldStates
  const oldState = {}

  if (changes.system?.skills) {
    oldState.skills = {}
    for (const skillId of Object.keys(changes.system.skills)) {
      oldState.skills[skillId] = foundry.utils.getProperty(source, `system.skills.${skillId}`)
    }
  }

  if (changes.system?.characteristics) {
    oldState.characteristics = {}
    for (const charId of Object.keys(changes.system.characteristics)) {
      oldState.characteristics[charId] = foundry.utils.getProperty(source, `system.characteristics.${charId}`)
    }
  }

  if (changes.system?.progression) {
    oldState.progression = foundry.utils.getProperty(source, 'system.progression')
  }

  if (changes.system?.details) {
    oldState.details = {}
    for (const key of Object.keys(changes.system.details)) {
      oldState.details[key] = foundry.utils.getProperty(source, `system.details.${key}`)
    }
  }

  if (changes.system?.advancement) {
    oldState.advancement = foundry.utils.getProperty(source, 'system.advancement')
  }

  return oldState
}
```

### Écriture sécurisée

```js
async function writeLogEntry(actor, entry) {
  try {
    const currentPath = `flags.swerpg.logs`
    const currentLogs = foundry.utils.getProperty(actor, currentPath) ?? []
    currentLogs.push(entry)

    // Taille max
    if (currentLogs.length > MAX_LOG_ENTRIES) {
      currentLogs.splice(0, currentLogs.length - MAX_LOG_ENTRIES)
    }

    await actor.update({ [AUDIT_LOG_KEY]: currentLogs })
    logger.debug(`[AuditLog] Entry written: ${entry.type} for ${actor.name} (${actor.id})`)
  } catch (err) {
    handleWriteError(actor, err)
  }
}

function handleWriteError(actor, err) {
  logger.error(`[AuditLog] Failed to write log entry for actor "${actor.name}" (${actor.id}):`, err)
  ui.notifications.warn(game.i18n.format('SKILL.AUDIT.WRITE_FAILED', { actor: actor.name }))
}
```

### Étape 2 : Câbler les hooks dans `swerpg.mjs`

```js
// swerpg.mjs
import * as auditLog from './module/utils/audit-log.mjs'

// Dans la fonction d'initialisation setup ou ready :
Hooks.on('preUpdateActor', auditLog.onPreUpdate)
Hooks.on('updateActor', auditLog.onUpdate)
Hooks.on('createItem', auditLog.onCreateItem)
```

### Étape 3 : Ajouter les clés i18n

```json
// lang/en.json
"SKILL": {
  // ... existing keys ...
  "AUDIT": {
    "WRITE_FAILED": "Audit log could not be saved for {actor}. See console for details."
  }
}
```

```json
// lang/fr.json
"SKILL": {
  // ... existing keys ...
  "AUDIT": {
    "WRITE_FAILED": "Le journal d'évolution n'a pas pu être sauvegardé pour {actor}. Voir la console pour plus de détails."
  }
}
```

### Étape 4 : Tests Vitest

Fichier : `tests/utils/audit-log.test.mjs`

| Test | Description | Vérification |
|------|-------------|-------------|
| `snapshotOldState captures only changed paths` | Simule un update de skill, vérifie que seul `skills.X` est capturé | `oldState` ne contient pas `progression` |
| `snapshotOldState handles empty changes` | `changes` vide → `oldState` vide | Objet vide |
| `composeEntries creates skill.train entry` | Rank 2→3, XP 10→20 | Type = `skill.train`, data.oldRank = 2, data.newRank = 3 |
| `composeEntries creates skill.forget entry` | Rank 3→2, XP 20→10 | Type = `skill.forget`, data.oldRank = 3, data.newRank = 2 |
| `composeEntries creates xp.spend entry` | XP.spent 30→40 | Type = `xp.spend`, data.amount = 10 |
| `composeEntries creates xp.grant entry` | XP.gained 200→250 | Type = `xp.grant`, data.amount = 50 |
| `composeEntries creates characteristic.increase` | Brawn 2→3 | Type = `characteristic.increase` |
| `composeEntries creates species.set entry` | species de null→Human | Type = `species.set` |
| `isOnlyAuditChange returns true` | changes = `{ flags: { swerpg: { logs: [...] } } }` | `true` |
| `isOnlyAuditChange returns false` | changes = `{ system: { skills: { ... } } }` | `false` |
| `writeLogEntry appends to existing logs` | 3 entrées existantes + 1 nouvelle | flags.swerpg.logs.length = 4 |
| `writeLogEntry enforces max size` | 500 entrées + 1 nouvelle | 500 entrées, la plus ancienne retirée |
| `writeLogEntry handles error gracefully` | `actor.update` throw | `logger.error` appelé |
| `onUpdate ignore non-character` | Adversary update | Aucune entrée créée |
| `onCreateItem creates talent.purchase entry` | Talent item créé sur character | Type = `talent.purchase` |
| `onCreateItem ignore non-talent` | Weapon item créé | Aucune entrée |

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/utils/audit-log.mjs` | Création | Module principal : hooks, analyse, écriture |
| `swerpg.mjs` | Modification | Ajout des 3 hooks (`preUpdateActor`, `updateActor`, `createItem`) |
| `lang/en.json` | Modification | Ajout de `SKILL.AUDIT.WRITE_FAILED` |
| `lang/fr.json` | Modification | Ajout de `SKILL.AUDIT.WRITE_FAILED` (traduction) |
| `tests/utils/audit-log.test.mjs` | Création | Tests Vitest complets |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Boucle infinie** si `writeLogEntry` déclenche un autre `updateActor` hook | Crash navigateur, freeze | Guard `isOnlyAuditChange` + test de non-régression |
| **Perte d'entrée** si `preUpdateActor` reçu mais `updateActor` pas reçu (erreur DB) | Entrée non enregistrée | Acceptable : le log est secondaire. `pendingOldStates` sera nettoyée au prochain update réussi |
| **Doublon d'entrée** si plusieurs `updateActor` pour la même modif (rare) | Entrée en double | Acceptable : mieux que de perdre une entrée. US6 pourra dédupliquer par timestamp |
| **Taille du flag** : un personnage actif peut accumuler des centaines d'entrées | Document trop volumineux | Taille max = 500 entrées (bien en dessous des limites Foundry). `splice` FIFO |
| **Performance** : analyse du diff sur chaque update | Latence perceptible | L'analyse est légère (parcours d'objets). Si besoin, utiliser `foundry.utils.hasProperty` qui est optimisé |
| **Race condition** : deux updates simultanés sur le même actor (ex: GM + joueur) | Écrasement d'entrée | `actor.update` est atomique en Foundry. La lecture + écriture dans le hook est séquentielle |

---

## 8. Proposition d'ordre de commit

1. Création de `module/utils/audit-log.mjs` avec l'ensemble des helpers et l'analyseur de diff
2. Ajout des clés i18n dans `lang/en.json` et `lang/fr.json`
3. Câblage des hooks dans `swerpg.mjs`
4. Tests Vitest dans `tests/utils/audit-log.test.mjs`
5. Vérification manuelle :
   - Créer un personnage, acheter une compétence → vérifier `actor.flags.swerpg.logs`
   - Augmenter une caractéristique → vérifier l'entrée
   - Changer le MJ → vérifier le `userId` dans les logs
   - Simuler une erreur d'écriture → vérifier le message UI

---

## 9. Dépendances avec les autres US

```
US1 (infrastructure)
  ├── US2 (skills)    — utilise le détecteur de skill.train / skill.forget
  ├── US3 (caracs)    — utilise le détecteur de characteristic.increase
  ├── US4 (talents)   — utilise le hook createItem pour talent.purchase
  ├── US5 (choix)     — utilise les détecteurs species/career/specialization
  ├── US6 (UI)        — consomme les entrées de flags.swerpg.logs
  └── US7 (export)    — lit les entrées depuis flags.swerpg.logs
```

US1 n'a pas de dépendance bloquante. Il peut être implémenté en isolation complète et fournit immédiatement des logs exploitables pour toutes les actions de modification du personnage, sans aucune modification du code métier existant.
