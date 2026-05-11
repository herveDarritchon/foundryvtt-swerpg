# Plan d'implémentation — #160 : Résilience — anti-boucle infinie, fire-and-forget et gestion d'erreur

**Issue** : [#160 — TECH: Résilience — anti-boucle infinie, fire-and-forget et gestion d'erreur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/160)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**User Story** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plans amont** :
  - `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` (§4.5, §4.6)
  - `documentation/plan/character-sheet/evolution-logs/TECH-158-plan-aop-hooks.md`
  - `documentation/plan/character-sheet/evolution-logs/TECH-159-plan-diff-analyzer.md`
**Modules impactés** : `module/utils/audit-log.mjs` (modification), `tests/utils/audit-log.test.mjs` (modification)

---

## 1. Objectif

Compléter les mécanismes de résilience du système d'audit log qui n'ont pas été couverts par #158.
La spec #160 décrivait 4 mécanismes : anti-boucle infinie, fire-and-forget, gestion d'erreur et nettoyage des orphelins.
Les 3 premiers ont été implémentés dans #158 ; il reste à :

1. Extraire `handleWriteError` comme fonction nommée (actuellement inline dans `writeLogEntries`)
2. Ajouter un retry simple (1 tentative après 1s) avant le fallback erreur
3. Ajouter un message chuchoté aux MJ en complément de la notification UI
4. Ajouter un avertissement `logger.warn` si `pendingOldStates` dépasse 100 entrées
5. Tests associés pour ces 4 points

---

## 2. Périmètre

### Inclus dans #160

- **Extraction de `handleWriteError`** : fonction nommée exportée depuis `audit-log.mjs`, factorisant `logger.error` + `ui.notifications.warn`
- **Retry simple** : en cas d'échec d'écriture, 1 tentative supplémentaire après 1s avant d'appeler `handleWriteError`
- **GM whisper** : si `game.user.isGM`, envoi d'un `ChatMessage` chuchoté aux MJ en complément de la notification
- **Warning pendingOldStates** : si le nombre total d'entrées dans `pendingOldStates` dépasse 100, `logger.warn` avec diagnostic
- **Tests Vitest** :
  - Test unitaire pour `handleWriteError` (logger.error + notification.warn appelés)
  - Test unitaire pour le retry (simulation d'échec → retry → fallback)
  - Test unitaire pour le GM whisper (`ChatMessage.create` appelé avec whisper)
  - Test unitaire pour le warning pendingOldStates (> 100 → `logger.warn` appelé)
  - Test d'intégration : `writeLogEntries` échoue → notification + pas de throw

### Exclu de #160

- Anti-boucle infinie → déjà implémenté dans #158
- Anti-fuite mémoire (TTL, MAX_PENDING, eviction) → déjà implémenté dans #158
- Retry avec exponential backoff (plusieurs tentatives avec délai croissant) → considéré comme overkill pour un log secondaire
- System Setting pour le nombre max de retries → pas nécessaire pour un retry simple fixe
- Taille max des logs configurable → #162

---

## 3. Constat sur l'existant

### Infrastructure existante (`module/utils/audit-log.mjs`, 253 lignes)

Le module contient déjà l'essentiel des mécanismes de résilience :

| Mécanisme | Statut | Code |
|-----------|--------|------|
| `isOnlyAuditChange` guard | ✔️ Implémenté | L.17-21 |
| `isAuditInternalUpdate(options)` guard | ✔️ Implémenté | L.27-29 |
| `void writeLogEntries(...)` (fire-and-forget) | ✔️ Implémenté | L.195 |
| try/catch avec `logger.error` + `ui.notifications.warn` dans `writeLogEntries` | ✔️ Implémenté (inline) | L.147-152 |
| `SWERPG.AUDIT.WRITE_FAILED` i18n key | ✔️ Dans en.json et fr.json | — |
| TTL (30s) + MAX_PENDING (50) | ✔️ Implémenté | L.9-10, 44-82 |
| File pending par actor:userId | ✔️ Implémenté | L.88-106 |
| `snapshotOldState` générique | ✔️ Implémenté | L.116-130 |

### `handleWriteError` est actuellement inline

```js
// writeLogEntries (l.147-152)
} catch (err) {
  logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id})`, err)
  ui.notifications?.warn?.(
    game.i18n.format('SWERPG.AUDIT.WRITE_FAILED', { actor: actor.name })
  )
}
```

Il n'y a pas :
- De fonction `handleWriteError` nommée ❌
- De retry en cas d'échec ❌
- De message chuchoté aux MJ ❌
- De warning de capacité `pendingOldStates` ❌

### Analyseur de diff existant (`module/utils/audit-diff.mjs`, 446 lignes)

Module complet livré par #159. Non modifié par #160.

---

## 4. Décisions d'architecture

### 4.1. `handleWriteError` comme fonction nommée

**Problème** : La logique d'erreur est inline dans `writeLogEntries`, non testable unitairement et non extensible.

**Décision** : Extraire dans une fonction exportée `handleWriteError(actor, err)` dans `audit-log.mjs`.

**Justification** :
- Testable unitairement (vérifier que `logger.error` et `ui.notifications.warn` sont appelés)
- Extensible : le retry, le GM whisper et d'autres comportements futurs s'ajoutent à un seul endroit
- Conforme à la spec #160 qui définit `handleWriteError` comme point d'extension

### 4.2. Retry simple (1 tentative, 1s de délai)

**Problème** : Un échec d'écriture transitoire (conflit DB, contention) ne mérite pas d'erreur immédiate.

**Décision** : En cas d'échec de `actor.update()`, attendre 1s et réessayer une fois. Si le retry échoue aussi, appeler `handleWriteError`.

```js
async function writeLogEntries(actor, entries) {
  if (!entries.length) return

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentLogs = cloneValue(_getProperty(actor, AUDIT_LOG_KEY) ?? [])
      const nextLogs = [...currentLogs, ...entries]
      await actor.update({ [AUDIT_LOG_KEY]: nextLogs }, { swerpgAuditLog: false })
      return
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      await handleWriteError(actor, err)
    }
  }
}
```

**Justification** :
- 1 seule tentative = pas de boucle de retry infinie
- 1s de délai = laisse le temps à une éventuelle contention DB de se résoudre
- Le log est secondaire : si le retry échoue, on notifie l'utilisateur et on abandonne
- Pas d'exponential backoff : overkill pour une donnée secondaire avec 1 seul retry

### 4.3. Message chuchoté aux MJ en cas d'échec

**Problème** : `ui.notifications.warn` est éphémère (disparaît après quelques secondes). Le MJ peut ne pas la voir.

**Décision** : Dans `handleWriteError`, si `game.user.isGM`, créer un `ChatMessage` chuchoté aux MJ.

```js
async function handleWriteError(actor, err) {
  logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id})`, err)
  ui.notifications?.warn?.(game.i18n.format('SWERPG.AUDIT.WRITE_FAILED', { actor: actor.name }))

  if (game.user?.isGM) {
    try {
      await ChatMessage.create({
        content: `⚠️ Audit log write failed for ${actor.name}: ${err.message}`,
        whisper: ChatMessage.getWhisperRecipients('GM'),
      })
    } catch (chatErr) {
      logger.warn(`[AuditLog] Failed to send GM whisper for write error:`, chatErr)
    }
  }
}
```

**Justification** :
- Message persistant dans le chat (contrairement à `ui.notifications.warn`)
- Whisper aux MJ uniquement → ne pollue pas le chat des joueurs
- Message en anglais (ciblé MJ technique) → pas de clé i18n nécessaire
- `ChatMessage.create` protégé par try/catch → une erreur ici ne se propage pas

**design graphique**
- respecter le design et l'esprit graphique du système (exemple la notification `#sendSkillTransactionChat`) mais l'adapter à un whisper d'une notification de warning.
- le design doit être immersif dans l'univers de star wars

### 4.4. Warning de capacité `pendingOldStates`

**Problème** : `pendingOldStates` peut atteindre des tailles anormales si un bug empêche la consommation normale (ex: `updateActor` non déclenché après `preUpdateActor`).

**Décision** : Dans `pruneExpiredPending()`, si le nombre total d'entrées (`countPendingEntries()`) dépasse 100, logger un avertissement.

```js
function pruneExpiredPending() {
  const now = Date.now()
  for (const [key, queue] of pendingOldStates) {
    const remaining = queue.filter(p => now - p.timestamp <= PENDING_TTL_MS)
    if (remaining.length === 0) {
      pendingOldStates.delete(key)
    } else if (remaining.length !== queue.length) {
      pendingOldStates.set(key, remaining)
    }
  }

  const total = countPendingEntries()
  if (total > 100) {
    logger.warn(`[AuditLog] pendingOldStates has ${total} entries. Possible leak.`)
  }
}
```

**Justification** :
- 100 est un seuil de sécurité bien au-dessus du MAX_PENDING=50 normal
- Ne devrait jamais arriver sauf bug → le warning sert de diagnostique
- `logger.warn` est toujours actif (même hors debug, car warn ∈ ALWAYS_ON_LEVELS)

### 4.5. `sleep` utilitaire

**Décision** : Fonction utilitaire privée pour le délai de retry.

```js
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
```

### 4.6. Organisation des exports

**Décision** : `handleWriteError` est exporté individuellement (pour les tests) et ajouté à la ligne d'export des helpers.

---

## 5. Plan de travail détaillé

### Étape 1 : Modifier `module/utils/audit-log.mjs`

#### 1a. Ajouter les constantes de retry et sleep

Dans la zone des constantes (après `MAX_PENDING`), ajouter :

```js
const MAX_RETRIES = 1
const RETRY_DELAY_MS = 1000
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
```

#### 1b. Extraire `handleWriteError` comme fonction exportée

Nouvelle fonction, positionnée avant `writeLogEntries` :

```js
export async function handleWriteError(actor, err) {
  logger.error(`[AuditLog] Write failed for actor "${actor.name}" (${actor.id})`, err)
  ui.notifications?.warn?.(
    game.i18n.format('SWERPG.AUDIT.WRITE_FAILED', { actor: actor.name })
  )

  if (game.user?.isGM) {
    try {
      await ChatMessage.create({
        content: `⚠️ Audit log write failed for ${actor.name}: ${err.message}`,
        whisper: ChatMessage.getWhisperRecipients('GM'),
      })
    } catch (chatErr) {
      logger.warn(`[AuditLog] Failed to send GM whisper for write error:`, chatErr)
    }
  }
}
```

Exporter `handleWriteError` dans la ligne d'export existante (l.159).

#### 1c. Refactor `writeLogEntries` avec retry loop

Remplacer le try/catch simple par une boucle de retry :

```js
async function writeLogEntries(actor, entries) {
  if (!entries.length) return

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const currentLogs = cloneValue(_getProperty(actor, AUDIT_LOG_KEY) ?? [])
      const nextLogs = [...currentLogs, ...entries]
      await actor.update(
        { [AUDIT_LOG_KEY]: nextLogs },
        { swerpgAuditLog: false }
      )
      return
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      await handleWriteError(actor, err)
    }
  }
}
```

#### 1d. Ajouter le warning de capacité dans `pruneExpiredPending`

Ajouter en fin de la fonction `pruneExpiredPending` (l.54), après le bloc de nettoyage :

```js
const total = countPendingEntries()
if (total > 100) {
  logger.warn(`[AuditLog] pendingOldStates has ${total} entries. Possible leak.`)
}
```

### Étape 2 : Ajouter les tests dans `tests/utils/audit-log.test.mjs`

#### Mocks supplémentaires

Dans le `beforeEach`, ajouter :

```js
globalThis.game.user = { id: 'gm-1', name: 'Game Master', isGM: true }
globalThis.ChatMessage = {
  create: vi.fn().mockResolvedValue(undefined),
  getWhisperRecipients: vi.fn(() => ['gm-1']),
}
```

#### Tests unitaires pour `handleWriteError`

| # | Test | Description | Vérification |
|---|------|-------------|-------------|
| 1 | `handleWriteError appelle logger.error` | Simulation d'erreur | `logger.error` appelé avec le message attendu |
| 2 | `handleWriteError appelle ui.notifications.warn` | Simulation d'erreur | `ui.notifications.warn` appelé avec la clé i18n |
| 3 | `handleWriteError envoie ChatMessage si GM` | `game.user.isGM = true` | `ChatMessage.create` appelé avec `whisper` |
| 4 | `handleWriteError n'envoie pas ChatMessage si joueur` | `game.user.isGM = false` | `ChatMessage.create` NON appelé |
| 5 | `handleWriteError catch l'échec de ChatMessage.create` | `ChatMessage.create` throw | `logger.warn` appelé, pas d'exception propagée |

#### Tests unitaires pour le retry

| # | Test | Description | Vérification |
|---|------|-------------|-------------|
| 6 | `writeLogEntries retry après échec puis réussite` | 1er `actor.update` échoue, 2e réussit | `actor.update` appelé 2 fois, `handleWriteError` non appelé |
| 7 | `writeLogEntries appelle handleWriteError après 2 échecs` | Les 2 tentatives échouent | `handleWriteError` appelé après le 2e échec |
| 8 | `writeLogEntries succès direct sans retry` | 1er `actor.update` réussit | `actor.update` appelé 1 fois |

#### Tests pour le warning pendingOldStates

| # | Test | Description | Vérification |
|---|------|-------------|-------------|
| 9 | `pruneExpiredPending ne log pas si < 100` | 50 entrées | `logger.warn` non appelé |
| 10 | `pruneExpiredPending log warning si > 100` | 101 entrées | `logger.warn` appelé avec "101" |

#### Tests d'intégration

| # | Test | Description | Vérification |
|---|------|-------------|-------------|
| 11 | `onUpdateActor ne throw pas si writeLogEntries échoue` | `writeLogEntries` échoue | `ui.notifications.warn` appelé, pas d'exception |
| 12 | `onUpdateActor avec retry puis succès` | 1er update échoue, 2e réussit | Entrée écrite, pas d'erreur notifiée |

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/utils/audit-log.mjs` | **Modification** | Ajout `MAX_RETRIES`, `RETRY_DELAY_MS`, `sleep()` ; extraction de `handleWriteError` (nommée, exportée, avec GM whisper) ; refactor `writeLogEntries` avec retry loop ; ajout warning capacité dans `pruneExpiredPending` |
| `tests/utils/audit-log.test.mjs` | **Modification** | Ajout des mocks `game.user`, `ChatMessage` ; ~12 nouveaux tests |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Retry masque une erreur récurrente** : l'écriture échoue systématiquement, le retry de 1s retarde la notification | L'utilisateur voit la notification 1s plus tard | Acceptable : 1s est imperceptible. Le retry est limité à 1 tentative. |
| **ChatMessage.create échoue** : l'envoi du whisper au MJ provoque une erreur | Exception non catchée dans `handleWriteError` | `try/catch` interne avec `logger.warn` silencieux |
| **game.user non disponible** : pendant le setup ou dans les tests, `game` peut être null | `TypeError` | Guard `game.user?.isGM` (optional chaining) |
| **sleep() non awaitée** : si `writeLogEntries` est appelée sans `await` (c'est le cas via `void`), le retry peut ne pas attendre | Le retry est immédiat, pas de délai réel | Vérifier que `sleep` est bien `await`ée dans la boucle. Le `void` n'impacte pas le flow interne de la promesse. |
| **Tests lents** : le `sleep(1000)` dans les tests de retry allonge le temps d'exécution | Tests qui prennent 2+ secondes | Dans les tests, mocker `sleep` ou utiliser `vi.advanceTimersByTime()` pour éviter l'attente réelle. |

---

## 8. Proposition d'ordre de commit

1. `feat(audit-log): extract handleWriteError function with GM whisper`
2. `feat(audit-log): add retry loop to writeLogEntries`
3. `feat(audit-log): warn when pendingOldStates exceeds 100 entries`
4. `test(audit-log): add resilience tests (handleWriteError, retry, capacity)`

---

## 9. Dépendances avec les autres US

```
#158 (infrastructure AOP) — DÉJÀ LIVRÉ
  │
  ├── #159 (analyseur de diff) — DÉJÀ LIVRÉ
  │
  └── #160 (ce ticket) — Résilience avancée
        │
        ├── US6 #156 (visualisation) → consomme flags.swerpg.logs
        ├── US7 (export) → lit flags.swerpg.logs
        └── #162 (taille configurable) → système de settings + FIFO évolué
```

#160 n'a pas de prérequis bloquant. Il peut être implémenté immédiatement sur la base de #158 et #159 déjà livrés.
