# Plan d'implémentation — TECH : Taille maximale configurable des logs avec éviction FIFO

**Issue** : [#162 — TECH: Taille maximale configurable des logs avec éviction FIFO](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/162)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plan parent** : `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` (§4.7)
**Module(s) impacté(s)** : `module/utils/audit-log.mjs`, `module/applications/settings/settings.js`, `lang/en.json`, `lang/fr.json`, `tests/utils/audit-log.test.mjs`

---

## 1. Objectif

Empêcher le tableau `actor.flags.swerpg.logs` de croître indéfiniment. Implémenter une taille maximale configurable via les System Settings Foundry (MJ uniquement), avec éviction FIFO (First In, First Out) quand le seuil est dépassé.

Actuellement `writeLogEntries()` dans `audit-log.mjs:180` empile les entrées sans aucune limite : `const nextLogs = [...currentLogs, ...entries]`. Sans cette TECH, les logs peuvent saturer la taille du document actor.

---

## 2. Périmètre

### Inclus dans ce ticket

- Nouveau System Setting : `swerpg.auditLogMaxEntries` (Number, world scope, config: true, restricted: true)
- Valeur par défaut : 500, min : 100, max : 5000, step : 100
- Lecture du setting dans `writeLogEntries()` au moment de l'écriture
- Application de l'éviction FIFO après chaque batch d'écriture
- Clés i18n pour `name` et `hint` du setting (EN + FR)
- Tests Vitest couvrant :
  - Éviction FIFO quand le seuil est dépassé
  - Aucune éviction quand le seuil n'est pas atteint
  - Lecture du setting via `game.settings.get`
  - Rétrocompatibilité : le comportement sans setting (fallback à 500)
  - Aucune modification du comportement existant quand le log est sous le seuil

### Exclu de ce ticket

- Modification du format des entrées de log (schema, structure)
- Ajout d'une UI de visualisation des logs → US6
- Export des logs → US7
- Mécanisme de purge manuelle (bouton "vider les logs")
- Taille max différente par acteur (le setting est global au monde)

---

## 3. Constat sur l'existant

### `writeLogEntries()` n'a aucune limite de taille

Dans `module/utils/audit-log.mjs:175-196` :

```js
async function writeLogEntries(actor, entries) {
  // ...
  const currentLogs = cloneValue(_getProperty(actor, AUDIT_LOG_KEY) ?? [])
  const nextLogs = [...currentLogs, ...entries]
  // ⚠️  Pas de limite — nextLogs peut croître indéfiniment
  await actor.update({ [AUDIT_LOG_KEY]: nextLogs }, { swerpgAuditLog: false })
  // ...
}
```

Le plan initial (US1-plan-audit-log-hooks.md §4.7) mentionnait une constante `MAX_LOG_ENTRIES = 500` et une éviction par `splice`, mais cette logique n'a **pas** été implémentée dans le code final. Le plan de refacto `TECH-158-plan-aop-hooks.md` a supprimé la constante et la logique FIFO sans les remplacer.

### System Settings centralisés

Tous les settings Foundry du système sont enregistrés dans `module/applications/settings/settings.js:registerSystemSettings()`, appelé depuis `swerpg.mjs:45` dans le hook `init`. C'est l'emplacement canonique pour ajouter le nouveau setting.

### Mock de test sans `game.settings.get`

Le mock Foundry dans `tests/helpers/mock-foundry.mjs:447` fournit `game.settings.register` mais pas `game.settings.get`. Les tests de `audit-log.test.mjs` configurent leur propre `globalThis.game` qui n'a pas non plus `settings.get`. Il faudra ajouter un mock de `game.settings.get` retournant une valeur par défaut.

### Namespace i18n

Les clés existantes pour l'audit log utilisent le namespace `SWERPG.AUDIT.*`. Les settings existants utilisent `SETTINGS.*` pour les clés localisées (ex: `SETTINGS.AutoConfirmName`). La convention pour les nouveaux settings est de suivre le pattern `SWERPG.SETTINGS.*`.

---

## 4. Décisions d'architecture

### 4.1. Emplacement du System Setting

**Décision** : Ajouter le setting dans `registerSystemSettings()` dans `module/applications/settings/settings.js`.

Justification :
- Tous les settings existants du système sont dans ce fichier (actionAnimations, autoConfirm, etc.)
- `registerSystemSettings()` est appelé depuis `init`, avant que les hooks audit-log ne soient enregistrés dans `setup`
- Cohérence de maintenance : un seul point d'entrée pour les settings
- Le pseudo-code de l'issue montrait `swerpg.mjs` mais c'était une illustration conceptuelle

### 4.2. Namespace i18n

**Décision** : Utiliser `SWERPG.SETTINGS.AUDIT_LOG_MAX_ENTRIES_NAME` et `SWERPG.SETTINGS.AUDIT_LOG_MAX_ENTRIES_HINT`.

Justification :
- Cohérence avec le namespace `SWERPG.*` existant (utilisé par `SWERPG.AUDIT.*`)
- Le namespace `SKILL.*` est réservé aux données de compétences (skills)
- Les settings existants utilisent déjà une structure plate : `SETTINGS.AutoConfirmName` — on reste dans le même esprit mais sous `SWERPG`

### 4.3. Lecture du setting à l'écriture (runtime)

**Décision** : Lire `game.settings.get('swerpg', 'auditLogMaxEntries')` dans `writeLogEntries()` à chaque appel, pas une seule fois au démarrage.

Justification :
- Le MJ peut modifier le setting à chaud via la fenêtre des paramètres
- Le `onChange` du setting invaliderait un cache local, mais un simple `game.settings.get` est négligeable (hash lookup)
- Pas d'état global à synchroniser : chaque écriture lit la valeur courante

### 4.4. Algorithme FIFO

**Décision** : `splice(0, currentLogs.length - maxEntries)` après chaque batch.

```js
if (nextLogs.length > maxEntries) {
  nextLogs.splice(0, nextLogs.length - maxEntries)
}
```

Justification :
- Algorithme O(n) borné par `maxEntries` (100–5000) — négligeable
- Préserve les entrées les plus récentes
- Pas de tri nécessaire (le tableau est ordonné chronologiquement)
- Même algorithme que celui esquissé dans le plan US1 original (§4.7)

### 4.5. Nom du setting

**Décision** : `auditLogMaxEntries` (camelCase), clé `swerpg.auditLogMaxEntries`.

Justification :
- Conforme aux conventions de nommage des settings existants : `systemMigrationVersion`, `actionAnimations`, `autoConfirm`
- Pas de clash de nom connu dans `game.settings`

---

## 5. Plan de travail détaillé

### Étape 1 : Ajouter le System Setting dans `settings.js`

Dans `registerSystemSettings()`, ajouter :

```js
game.settings.register(SYSTEM.id, 'auditLogMaxEntries', {
  name: 'SWERPG.SETTINGS.AUDIT_LOG_MAX_ENTRIES_NAME',
  hint: 'SWERPG.SETTINGS.AUDIT_LOG_MAX_ENTRIES_HINT',
  scope: 'world',
  config: true,
  type: Number,
  default: 500,
  range: {
    min: 100,
    max: 5000,
    step: 100,
  },
  onChange: (value) => {
    logger.debug(`[AuditLog] Max entries setting changed to ${value}`)
  },
})
```

Risques :
- Nécessite d'importer `logger` dans `settings.js` (vérifier si déjà importé)
- `onChange` ne doit pas throw (Foundry le gère, mais par principe)

Fichiers :
- `module/applications/settings/settings.js` — modification

### Étape 2 : Ajouter la logique FIFO dans `writeLogEntries()`

Dans `module/utils/audit-log.mjs`, modifier `writeLogEntries()` :

```js
async function writeLogEntries(actor, entries) {
  if (!entries.length) return

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const maxEntries = game.settings.get('swerpg', 'auditLogMaxEntries') ?? 500
      const currentLogs = cloneValue(_getProperty(actor, AUDIT_LOG_KEY) ?? [])
      const nextLogs = [...currentLogs, ...entries]

      if (nextLogs.length > maxEntries) {
        nextLogs.splice(0, nextLogs.length - maxEntries)
      }

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

Points d'attention :
- `game.settings.get` peut throw si le setting n'existe pas (environnement test) → fallback `?? 500`
- L'éviction doit se faire APRÈS l'ajout des nouvelles entrées, pas avant (pour respecter le seuil)
- `maxEntries` est lu à chaque tentative (pas mis en cache hors de la boucle) pour réagir aux changements de setting entre retries (cas très marginal mais correct)

Fichiers :
- `module/utils/audit-log.mjs` — modification de `writeLogEntries()`

### Étape 3 : Ajouter les clés i18n

```json
// lang/en.json
"SWERPG": {
  "SETTINGS": {
    "AUDIT_LOG_MAX_ENTRIES_NAME": "Audit Log max entries",
    "AUDIT_LOG_MAX_ENTRIES_HINT": "Maximum number of entries stored in the character audit log (100-5000). Oldest entries are removed first when the limit is exceeded."
  }
}
```

```json
// lang/fr.json
"SWERPG": {
  "SETTINGS": {
    "AUDIT_LOG_MAX_ENTRIES_NAME": "Nombre max d'entrées du journal",
    "AUDIT_LOG_MAX_ENTRIES_HINT": "Nombre maximum d'entrées dans le journal d'évolution du personnage (100-5000). Les plus anciennes sont supprimées en premier lorsque la limite est dépassée."
  }
}
```

Fichiers :
- `lang/en.json` — modification
- `lang/fr.json` — modification

### Étape 4 : Mettre à jour les tests Vitest

Modifications dans `tests/utils/audit-log.test.mjs` :

1. **Mock de `game.settings.get`** : Ajouter dans le `beforeEach` global :

```js
globalThis.game.settings.get = vi.fn((_key, _default) => {
  if (_key === 'swerpg.auditLogMaxEntries') return 500
  return _default
})
```

2. **Tests à ajouter** (describe `writeLogEntries max size`) :

| Test | Description | Vérification |
|------|-------------|-------------|
| `évicte les entrées les plus anciennes quand le seuil est dépassé` | 3 entrées existantes + 2 nouvelles, max=3 | logs.length === 3, les 2 plus anciennes supprimées |
| `ne fait rien quand le seuil n'est pas atteint` | 2 entrées existantes + 1 nouvelle, max=5 | logs.length === 3 |
| `respecte une limite basse (100)` | 150 entrées existantes + 10 nouvelles, max=100 | logs.length === 100 |
| `lit le setting dynamiquement à chaque appel` | Vérifie que `game.settings.get` est appelé 1 fois par write | `expect(game.settings.get).toHaveBeenCalledWith('swerpg', 'auditLogMaxEntries')` |
| `fallback à 500 si game.settings.get throw` | Simule une erreur de `game.settings.get` | nextLogs.length inchangé, pas d'éviction erronée |

3. **Régression** : Vérifier que les tests existants de `writeLogEntries` passent encore (ils n'atteignent pas le seuil de 500).

Fichiers :
- `tests/utils/audit-log.test.mjs` — modification
- `tests/helpers/mock-foundry.mjs` — optionnel : ajout de `game.settings.get` stub si pertinent

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `module/applications/settings/settings.js` | Modification | Ajout de `game.settings.register(SYSTEM.id, 'auditLogMaxEntries', ...)` |
| `module/utils/audit-log.mjs` | Modification | Ajout de la lecture du setting + éviction FIFO dans `writeLogEntries()` |
| `lang/en.json` | Modification | Ajout de `SWERPG.SETTINGS.AUDIT_LOG_MAX_ENTRIES_NAME` et `HINT` |
| `lang/fr.json` | Modification | Ajout des traductions françaises |
| `tests/utils/audit-log.test.mjs` | Modification | Mock de `game.settings.get` + nouveaux tests FIFO |
| `tests/helpers/mock-foundry.mjs` | Modification possible | Ajout de `game.settings.get` stub si jugé utile pour les autres tests |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| `game.settings.get` throw en environnement de test | Tests cassés | Fallback `?? 500` dans `writeLogEntries()` ; le mock de test retourne 500 |
| `onChange` callback throw | Setting non enregistré | `onChange` minimal (seulement logger.debug) ; pas de logique critique |
| Éviction trop agressive avec `range.min = 100` | Perte de logs si MJ met 100 | Acceptable : c'est une configuration explicite du MJ |
| Performance : `splice` sur tableau de 5000 entrées | Latence sur write | O(n) borné, négligeable. 5000 entrées ~ quelques microsecondes |
| Concurrent writes : deux updates simultanés lisent la même valeur avant éviction | Dépassement temporaire du seuil | Acceptable : le prochain write corrigera. Le seuil est une limite souple. |

---

## 8. Proposition d'ordre de commit

1. `feat(settings): register swerpg.auditLogMaxEntries system setting`
   - Ajout du setting dans `settings.js`
   - Ajout des clés i18n EN + FR

2. `feat(audit-log): enforce configurable max size with FIFO eviction`
   - Lecture du setting et éviction FIFO dans `writeLogEntries()`
   - Fallback à 500

3. `test(audit-log): add FIFO eviction and game.settings.get mock`
   - Mock de `game.settings.get`
   - Tests d'éviction (seuil dépassé, non dépassé, limite basse)
   - Test de fallback
   - Vérification que tous les tests existants passent

---

## 9. Dépendances avec les autres US

Ce ticket TECH n'a **aucune dépendance bloquante** vis-à-vis des autres US de l'epic #150. Il peut être implémenté à tout moment.

La modification de `writeLogEntries()` est transparente pour les consommateurs (US6, US7) : elle réduit la taille du tableau mais ne change ni le format des entrées ni la signature de la fonction.

```
US1 (infrastructure) → ce TECH améliore US1
  ├── US6 (UI)       ← consomme flags.swerpg.logs (inchangé)
  └── US7 (export)   ← lit flags.swerpg.logs (inchangé)
```
