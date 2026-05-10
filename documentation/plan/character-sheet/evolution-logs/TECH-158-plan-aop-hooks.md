# Plan d'implémentation — #158 : Architecture AOP et double hook preUpdateActor/updateActor pour l'audit log

**Issue** : [#158 — TECH: Architecture AOP et double hook preUpdateActor/updateActor pour l'audit log](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/158)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**User Story** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plan amont** : `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md`
**Module impacté** : `module/utils/audit-log.mjs` (création), `swerpg.mjs` (modification), `lang/en.json`, `lang/fr.json` (modification)

---

## 1. Objectif

Créer le module racine d'interception AOP qui écoute les hooks Foundry `preUpdateActor` / `updateActor` / `createItem`, capture l'état `_source` avant modification, et prépare l'interface vers l'analyseur de diff. Aucune logique de détection de changement n'est implémentée ici — elle relève de #159.

Ce ticket absorbe également le périmètre **anti-boucle infinie** de #160 (isOnlyAuditChange + fire-and-forget sécurisé avec notification utilisateur) afin de garantir qu'aucun risque de boucle infinie n'existe dès la première version fonctionnelle.

---

## 2. Périmètre

### Inclus dans #158

- Création de `module/utils/audit-log.mjs` :
  - `pendingOldStates` (Map) — liaison preUpdate → update
  - `onPreUpdateActor(actor, changes, options, userId)` — capture old state
  - `onUpdateActor(actor, changes, options, userId)` — consomme old state + appelle `composeEntries` (placeholder)
  - `onCreateItemAction(item, data, options, userId)` — stub pour détection talent
  - `snapshotOldState(source, changes)` — extraction partielle de `_source`
  - `composeEntries(oldState, changes, actor, userId)` — placeholder vide retournant `[]`
  - `writeLogEntry(actor, entry)` — écriture fire-and-forget dans `flags.swerpg.logs` avec try/catch
  - `registerAuditLogHooks()` — câblage unique des 3 hooks
  - Gardes :
    - `isOnlyAuditChange(changes)` — anti-boucle infinie
    - `isCharacterActor(actor)` — filtrage par `actor.type === 'character'`
  - Anti-fuite mémoire :
    - TTL 30s sur les entrées `pendingOldStates`
    - MAX_PENDING = 50 avec éviction FIFO des plus anciennes
    - Nettoyage opportuniste à chaque `set()`
- Câblage dans `swerpg.mjs` :
  - `Hooks.once('setup', registerAuditLogHooks)`
- Gestion d'erreur :
  - `logger.error` + `ui.notifications.warn` en cas d'échec d'écriture
  - Fire-and-forget : `void writeLogEntry(...)` — pas de `await` bloquant dans les hooks
- Clés i18n :
  - `SKILL.AUDIT.WRITE_FAILED` pour le message d'erreur UI
- Tests Vitest :
  - Tests unitaires pour `snapshotOldState`, `isOnlyAuditChange`, `pruneExpiredPending`
  - Tests d'intégration pour `onPreUpdateActor` / `onUpdateActor` / `onCreateItemAction`
  - Test de non-régression : écriture fire-and-forget ne bloque pas le hook

### Exclu de #158

- Analyseur de diff (détection des types de changement) → #159
- Snapshot XP dans chaque entrée → #161
- Taille max configurable (System Setting + éviction FIFO) → #162
- Chat message aux MJ en cas d'erreur → #160 (périmètre réduit)
- Tests Vitest avancés (couverture complète des détecteurs) → #163

---

## 3. Constat sur l'existant

### Aucun audit log n'existe

Il n'y a **aucune** structure de log, d'historique ou de trace dans le codebase. Les seules données de progression disponibles sont les compteurs globaux `system.progression.experience.{spent, gained}`.

### Aucun hook `updateActor` / `preUpdateActor` enregistré

Le fichier `swerpg.mjs` enregistre des hooks pour le chat, le combat, le canvas, mais **aucun** pour les mises à jour d'acteur. Le seul hook lié aux documents est :
- `preDeleteChatMessage` (ligne 357)
- `createItem` n'est pas utilisé
- `updateItem` existe en dev-only (ligne 512)

### `_onUpdate` déjà surchargé dans `SwerpgActor`

`actor.mjs:574` — `_onUpdate(data, options, userId)` est déjà override pour :
- Affichage du scrolling de statut
- Mise à jour de la taille du token
- Mise à jour du flanking
- Rafraîchissement de l'arbre de talents

### ADR-0011 déjà accepté

L'ADR `adr-0011-stockage-journal-evolution-personnage-flags.md` valide le stockage dans `actor.flags.swerpg.logs`. Règles clés :
- Le log est une donnée **secondaire**, pas une source de vérité
- Stockage dans les flags pour éviter migration du data model
- Pas de recalcul automatique de l'état du personnage à partir du log

---

## 4. Décisions d'architecture

### 4.1. Hook global vs override de `_onUpdate`

**Problème** : Où placer la logique d'interception des mises à jour d'acteur ?

**Options** :
| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| Surcharger `_onUpdate` dans `SwerpgActor` | Accès direct à `this._source` pour les old values | Couplage fort, modifie le modèle, mélange responsabilités |
| `Hooks.on('updateActor', ...)` | Approche AOP, séparation des concerns, désactivable | Nécessite double hook (preUpdate + update) pour old values |

**Décision** : `Hooks.on('preUpdateActor', ...)` + `Hooks.on('updateActor', ...)`.

**Justification** : L'audit log est un aspect transverse, pas une responsabilité du modèle acteur. Les hooks peuvent être retirés sans impacter le métier. Le double hook est nécessaire car `actor._source` a déjà été écrasé quand `updateActor` est appelé.

### 4.2. Asynchronie des hooks Foundry

**Problème** : Les handlers de hooks Foundry ne sont pas fiables en `async`. Un `await` dans un handler peut causer des comportements imprévisibles (ordre d'exécution, race conditions).

**Décision** : Fire-and-forget sécurisé.

```js
void writeLogEntry(actor, entry).catch((err) => {
  logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id}):`, err)
  ui.notifications.warn(game.i18n.format('SKILL.AUDIT.WRITE_FAILED', { actor: actor.name }))
})
```

**Justification** : Le log est une donnée secondaire — il ne doit jamais bloquer l'action utilisateur. Le `catch` assure la traçabilité de l'erreur sans propager l'exception.

### 4.3. Anti-boucle infinie

**Problème** : `actor.update({ 'flags.swerpg.logs': [...] })` déclenche un nouveau `updateActor` hook. Sans garde, c'est une boucle infinie.

**Décision** : `isOnlyAuditChange(changes)` en tête de `onPreUpdateActor` et `onUpdateActor`.

```js
function isOnlyAuditChange(changes) {
  const keys = Object.keys(foundry.utils.flattenObject(changes))
  return keys.length === 1 && keys[0] === 'flags.swerpg.logs'
}
```

**Justification** : Si le diff ne contient QUE `flags.swerpg.logs`, c'est que l'update vient de `writeLogEntry` lui-même. On ignore.

### 4.4. Anti-fuite mémoire sur `pendingOldStates`

**Problème** : Si `preUpdateActor` est appelé sans `updateActor` correspondant (crash DB, timeout, navigation), la Map `pendingOldStates` conserve une entrée orpheline.

**Décision** : Trois mécanismes complémentaires.

```js
const PENDING_TTL_MS = 30000
const MAX_PENDING = 50
const pendingOldStates = new Map()

function pruneExpiredPending() {
  const now = Date.now()
  for (const [uuid, pending] of pendingOldStates) {
    if (now - pending.timestamp > PENDING_TTL_MS) pendingOldStates.delete(uuid)
  }
}

function evictOldestIfNeeded() {
  if (pendingOldStates.size < MAX_PENDING) return
  const entries = [...pendingOldStates.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)
  const toRemove = entries.slice(0, pendingOldStates.size - MAX_PENDING)
  for (const [uuid] of toRemove) pendingOldStates.delete(uuid)
}
```

**Justification** : Le TTL garanti qu'une entrée non consommée expire après 30s. MAX_PENDING empêche la Map de croître indéfiniment en cas de pic. Le nettoyage opportuniste à chaque `set()` évite une thread de nettoyage dédiée.

### 4.5. Séparation #158 / #159

**Problème** : L'analyseur de diff (`composeEntries`) est dans #159, mais #158 a besoin de l'appeler.

**Décision** : `composeEntries` est un placeholder vide retournant `[]`.

```js
function composeEntries(oldState, changes, actor, userId) {
  // Placeholder — implémenté dans #159
  return []
}
```

**Justification** : #158 et #159 sont indépendants. #158 livre l'infrastructure AOP complète et testée. #159 branche la logique réelle de détection des changements. Pas de dépendance bloquante.

### 4.6. Nommage et API

**Problème** : Comment organiser les exports du module ?

**Décision** :
- Fichier : `module/utils/audit-log.mjs`
- Fonction principale : `registerAuditLogHooks()` — câble tout en interne
- Handlers exportés individuellement pour les tests :
  - `onPreUpdateActor`
  - `onUpdateActor`
  - `onCreateItemAction`

### 4.7. Câblage dans `setup`

**Problème** : Quand enregistrer les hooks ? Trop tard (`ready`) et on rate des updates précoces.

**Décision** : `Hooks.once('setup', registerAuditLogHooks)`.

**Justification** : Le hook `setup` est appelé après que tous les systèmes sont initialisés mais avant que les mondes et scènes soient chargés. Les documents commencent à être créés dans `ready`. `setup` est le bon moment pour enregistrer des hooks document.

---

## 5. Plan de travail détaillé

### Étape 1 : Créer `module/utils/audit-log.mjs`

Structure complète du module :

```
module/utils/audit-log.mjs
├── Imports
│   └── logger depuis ./logger.mjs
├── Constantes
│   ├── AUDIT_LOG_KEY = 'flags.swerpg.logs'
│   ├── PENDING_TTL_MS = 30000
│   ├── MAX_PENDING = 50
│   └── pendingOldStates = new Map()
├── Gardes
│   ├── isOnlyAuditChange(changes)
│   └── isCharacterActor(actor)
├── Capture old state
│   └── snapshotOldState(source, changes)
├── Anti-fuite mémoire
│   ├── pruneExpiredPending()
│   └── evictOldestIfNeeded()
├── Handlers (exportés)
│   ├── onPreUpdateActor(actor, changes, options, userId)
│   ├── onUpdateActor(actor, changes, options, userId)
│   └── onCreateItemAction(item, data, options, userId)
├── Analyseur de diff (placeholder vers #159)
│   └── composeEntries(oldState, changes, actor, userId) → []
├── Écriture (fire-and-forget)
│   └── writeLogEntry(actor, entry)
└── Point d'entrée unique
    └── registerAuditLogHooks()
```

#### Détail des handlers

**onPreUpdateActor :**
```js
export function onPreUpdateActor(actor, changes, options, userId) {
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  pruneExpiredPending()
  evictOldestIfNeeded()

  const oldState = snapshotOldState(actor._source, changes)
  pendingOldStates.set(actor.uuid, {
    oldState,
    changes,
    userId,
    timestamp: Date.now(),
  })
}
```

**onUpdateActor :**
```js
export function onUpdateActor(actor, changes, options, userId) {
  if (!isCharacterActor(actor)) return
  if (isOnlyAuditChange(changes)) return

  const pending = pendingOldStates.get(actor.uuid)
  pendingOldStates.delete(actor.uuid)
  if (!pending) return
  if (Date.now() - pending.timestamp > PENDING_TTL_MS) return

  const entries = composeEntries(pending.oldState, changes, actor, pending.userId)
  for (const entry of entries) {
    void writeLogEntry(actor, entry)
  }
}
```

**onCreateItemAction :**
```js
export function onCreateItemAction(item, data, options, userId) {
  if (item.parent?.type !== 'character') return
  if (item.type !== 'talent') return
  // Stub — sera implémenté dans #159 (via composeEntries ou dédié)
}
```

#### Détail de writeLogEntry

```js
async function writeLogEntry(actor, entry) {
  try {
    const currentLogs = foundry.utils.getProperty(actor, `flags.swerpg.logs`) ?? []
    currentLogs.push(entry)
    await actor.update({ 'flags.swerpg.logs': currentLogs })
  } catch (err) {
    logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id}):`, err)
    ui.notifications.warn(game.i18n.format('SKILL.AUDIT.WRITE_FAILED', { actor: actor.name }))
  }
}
```

#### Détail de snapshotOldState

```js
function snapshotOldState(source, changes) {
  const oldState = {}

  if (changes.system?.skills) {
    oldState.skills = {}
    for (const skillId of Object.keys(changes.system.skills)) {
      const path = `system.skills.${skillId}`
      const value = foundry.utils.getProperty(source, path)
      if (value !== undefined) oldState.skills[skillId] = value
    }
  }

  if (changes.system?.characteristics) {
    oldState.characteristics = {}
    for (const charId of Object.keys(changes.system.characteristics)) {
      const path = `system.characteristics.${charId}`
      const value = foundry.utils.getProperty(source, path)
      if (value !== undefined) oldState.characteristics[charId] = value
    }
  }

  if (changes.system?.progression) {
    const value = foundry.utils.getProperty(source, 'system.progression')
    if (value !== undefined) oldState.progression = value
  }

  if (changes.system?.details) {
    oldState.details = {}
    for (const key of Object.keys(changes.system.details)) {
      const path = `system.details.${key}`
      const value = foundry.utils.getProperty(source, path)
      if (value !== undefined) oldState.details[key] = value
    }
  }

  if (changes.system?.advancement) {
    const value = foundry.utils.getProperty(source, 'system.advancement')
    if (value !== undefined) oldState.advancement = value
  }

  return oldState
}
```

### Étape 2 : Modifier `swerpg.mjs`

```js
// swerpg.mjs, en haut du fichier (zone des imports)
import { registerAuditLogHooks } from './module/utils/audit-log.mjs'

// Dans Hooks.once('setup', () => { ... })
registerAuditLogHooks()
```

### Étape 3 : Ajouter les clés i18n

```json
// lang/en.json — dans le bloc SKILL
{
  "SKILL": {
    "AUDIT": {
      "WRITE_FAILED": "Audit log could not be saved for {actor}. See console for details."
    }
  }
}
```

```json
// lang/fr.json — dans le bloc SKILL
{
  "SKILL": {
    "AUDIT": {
      "WRITE_FAILED": "Le journal d'évolution n'a pas pu être sauvegardé pour {actor}. Voir la console pour plus de détails."
    }
  }
}
```

### Étape 4 : Tests Vitest

Fichier : `tests/utils/audit-log.test.mjs`

#### Tests unitaires

| # | Test | Description | Vérification |
|---|------|-------------|-------------|
| 1 | `snapshotOldState ne capture que les chemins modifiés` | changes = `{ system: { skills: { stealth: {} } } }` | `oldState` a `skills.stealth` mais pas `progression` |
| 2 | `snapshotOldState retourne objet vide si changes vides` | changes = `{}` | `oldState = {}` |
| 3 | `snapshotOldState gère les chemins imbriqués` | changes = `{ system: { skills: { stealth: { rank: { trained: 3 } } } } }` | `oldState.skills.stealth.rank` est l'objet complet |
| 4 | `isOnlyAuditChange retourne true` | changes = `{ flags: { swerpg: { logs: [...] } } }` | `true` |
| 5 | `isOnlyAuditChange retourne false si system modifié` | changes = `{ system: { skills: {} } }` | `false` |
| 6 | `isOnlyAuditChange retourne false si mixte` | changes = `{ flags: { swerpg: { logs: [] } }, system: { skills: {} } }` | `false` |
| 7 | `isOnlyAuditChange retourne false si changes vide` | changes = `{}` | `false` |
| 8 | `pruneExpiredPending supprime les entrées expirées` | 2 expired + 3 valides | size = 3 |
| 9 | `evictOldestIfNeeded ne fait rien si < MAX` | size = 30, MAX = 50 | size inchangé |
| 10 | `evictOldestIfNeeded évince les plus anciennes` | size = 55, MAX = 50 | size = 50, les 5 plus anciennes supprimées |

#### Tests d'intégration

| # | Test | Description |
|---|------|-------------|
| 11 | `onPreUpdateActor ignore non-character` | actor.type = "adversary" → `pendingOldStates` non modifié |
| 12 | `onPreUpdateActor ignore isOnlyAuditChange` | changes = `{ flags: { swerpg: { logs: [] } } }` → pas de capture |
| 13 | `onPreUpdateActor stocke dans pendingOldStates` | Character update → Map a l'entrée |
| 14 | `onUpdateActor consomme pendingOldStates` | preUpdate + update → Map.get null après |
| 15 | `onUpdateActor ignore TTL expiré` | pending.timestamp > 30s → `writeLogEntry` non appelé |
| 16 | `onUpdateActor ignore si composeEntries vide` | composeEntries retourne [] → `writeLogEntry` non appelé |
| 17 | `onUpdateActor ignore si pas de pending` | update sans preUpdate → return silencieux |
| 18 | `onCreateItemAction ignore non-talent` | item.type = "weapon", parent character → pas d'appel |
| 19 | `onCreateItemAction ignore non-character` | item.type = "talent", parent adversary → pas d'appel |

#### Tests de résilience

| # | Test | Description |
|---|------|-------------|
| 20 | `writeLogEntry ne throw pas si update fail` | actor.update reject → `logger.error` appelé, pas d'exception |
| 21 | `writeLogEntry appelle ui.notifications.warn sur erreur` | actor.update reject → `ui.notifications.warn` appelé |
| 22 | `writeLogEntry ajoute une entrée à un tableau vide` | flags.swerpg.logs = [] → entry ajoutée |
| 23 | `writeLogEntry ajoute une entrée à des logs existants` | 3 entries existantes → 4 après |

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/utils/audit-log.mjs` | **Création** | Module AOP complet : handlers, gardes, anti-fuite, placeholder composeEntries, writeLogEntry fire-and-forget |
| `swerpg.mjs` | **Modification** | Import de `registerAuditLogHooks` + appel dans `Hooks.once('setup', ...)` |
| `lang/en.json` | **Modification** | Ajout `SKILL.AUDIT.WRITE_FAILED` |
| `lang/fr.json` | **Modification** | Ajout `SKILL.AUDIT.WRITE_FAILED` |
| `tests/utils/audit-log.test.mjs` | **Création** | 23 tests Vitest |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Boucle infinie** si `writeLogEntry` déclenche un nouveau `preUpdateActor` | Crash navigateur, freeze | `isOnlyAuditChange` guard en tête des deux hooks (testé #4-7) |
| **Fuite mémoire** si preUpdate sans update (crash DB, timeout, navigation) | Map qui gonfle | TTL 30s + MAX_PENDING 50 + pruneExpiredPending + evictOldestIfNeeded (testé #8-10) |
| **Perte d'entrée** si `onUpdateActor` appelé sans `preUpdateActor` préalable | Entrée non enregistrée | Acceptable : le log est secondaire. `onUpdateActor` retourne silencieusement (testé #17) |
| **Race condition** si deux updates simultanés sur le même actor (ex: GM + joueur) | Écrasement ou perte old state | `pendingOldStates.set` remplace l'ancienne entrée. Cas rare, sans gravité pour un log secondaire |
| **Le placeholder composeEntries retourne []** | Aucun log écrit tant que #159 n'est pas implémenté | Comportement attendu et documenté. #159 aura un test qui vérifie que composeEntries est appelé |

---

## 8. Proposition d'ordre de commit

1. **Création de `module/utils/audit-log.mjs`** — squelette complet avec gardes, anti-fuite, placeholder, writeLogEntry fire-and-forget
2. **Modification de `swerpg.mjs`** — import + `registerAuditLogHooks()` dans `setup`
3. **Clés i18n** — `SKILL.AUDIT.WRITE_FAILED` dans `en.json` et `fr.json`
4. **Tests Vitest** — 23 tests dans `tests/utils/audit-log.test.mjs`
5. **Vérification** — `npx vitest run tests/utils/audit-log.test.mjs` passe

---

## 9. Dépendances avec les autres US

```
#158 (ce ticket) — Infrastructure AOP + anti-boucle
  │
  ├── #159 (analyseur de diff)     → implémente composeEntries
  ├── #160 (résilience avancée)    → chat MJ, retry (périmètre réduit)
  ├── #161 (snapshot XP)           → enrichit captureSnapshot
  ├── #162 (taille configurable)   → System Setting + FIFO évolué
  ├── #163 (tests)                 → tests complémentaires
  │
  └── US6 #156 (visualisation)     → consomme flags.swerpg.logs
```

#158 est le **prérequis bloquant** pour #159, #160, #161, #162. Il peut être mergé seul et `composeEntries` retournera `[]` jusqu'à ce que #159 soit livré.
