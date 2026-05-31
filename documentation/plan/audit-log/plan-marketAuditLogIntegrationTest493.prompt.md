# Plan : Test d'intégration Market → Audit Log → Chat (Issue #493)

## Vue d'ensemble

**TL;DR** : Créer un test d'intégration Vitest dans `tests/integration/` qui exerce le flux `recordItemPurchase` → `writeLogEntries` → `sendChatForAuditEntries` → `buildAuditLogEntries(filter)`, vérifie la résilience (achat non bloqué si audit ou chat échoue), et enrichir la documentation smoke. Les E2E Tier 1 existent déjà (#492) ; cette issue ajoute la couche intégration Vitest rapide et sans Docker.

**Acceptance Criteria (extraits de l'issue #493)** :

- [ ] Un test d'intégration couvre un parcours complet audit Market réussi et vérifie la présence de l'entrée d'audit, du message chat attendu et des informations financières essentielles.
- [ ] Le parcours reste robuste : un échec d'audit ou de chat n'empêche pas le comportement principal attendu du Market.
- [ ] La documentation de validation manuelle ou smoke précise comment vérifier rapidement le flux complet en jeu.

**Bloqué par** : #490, #491, #492 (toutes les issues complètes et clôturées)

## Objectifs

1. **Valider flux complet écrit** : `recordItemPurchase()` → enregistre entrée audit avec structure correcte (`creditDelta`, `snapshot`, `itemId`) dans `flags.swerpg.logs` via `actor.update()`.
2. **Valider flux complet écrit+chat** : `sendChatForAuditEntries()` construit contexte template correct (variante `add`, metadonnées crédits) et envoie message via `ChatMessage.create()`.
3. **Valider circuit lecture-filtrage** : `buildAuditLogEntries(actor, 'purchases')` retourne l'entrée créée isolée des autres types.
4. **Valider résilience audit** : `recordItemPurchase` non-blocking (ne throw pas) même si `actor.update` rejette, simule le try/catch du Market.
5. **Valider résilience chat** : `sendChatForAuditEntries` non-blocking même si `ChatMessage.create` rejette.
6. **Enrichir documentation smoke** : Checklist < 2 min pour QA/GM validation manuelle du flux complet en jeu.

## Périmètre détaillé

### Inclus

1. **Fichier test d'intégration** : `tests/integration/market-audit-log.integration.test.mjs`
   - Scénario 1 : `recordItemPurchase` crée entrée audit bien formée, `sendChatForAuditEntries` envoie chat correct, `buildAuditLogEntries('purchases')` retourne l'entrée
   - Scénario 2 : `recordItemPurchase` résilient si `actor.update` rejette (no-throw)
   - Scénario 3 : `sendChatForAuditEntries` résilient si `ChatMessage.create` rejette (no-throw)

2. **Enrichissement documentation smoke** : `documentation/tests/manuel/audit-log/README.md` §15
   - « Vérification smoke rapide (< 2 min) »
   - Checklist 5 étapes : achat Market, inspect log en console, vérifier message chat, filtre UI, export CSV

3. **Optionnel (future amélioration)** :
   - Documentation de la couche d'intégration dans `documentation/architecture/` si nécessaire
   - Métriques de couverture (vérifier que les chemins happy-path + résilience sont couverts)

### Exclus

- Modifications du Market flow existant
- Modifications de `recordItemPurchase` ou `sendChatForAuditEntries` (déjà stables)
- Modifications des tests E2E (déjà complètement couverts par #492)
- Migration rétroactive des achats passés

### Hypothèses

- `setupFoundryMock()` / `teardownFoundryMock()` fonctionnent correctement et fournissent `game.users`, `ChatMessage`, `game.actors`
- Les imports ESM vers `module/utils/audit-log.mjs` et `module/applications/character-audit-log.mjs` réussissent sans problème
- Les tests existants de `recordItemPurchase` (unitaires dans `tests/utils/audit-log.test.mjs`) passent ; ce test d'intégration valide l'interaction entre les modules
- Le mock `actor.update` peut être configuré pour résoudre ou rejeter selon le scénario

### Contraintes

- Aucun test d'intégration ne doit dépendre d'une instance Docker Foundry (Tier 1 E2E seul)
- Les mocks doivent être aussi simples que possible (pas de recréation complète de `#executePurchase`)
- Le temps d'exécution des tests doit rester < 5 secondes (pas de vraies HTML renders)

## Architecture

```
Test d'intégration : market-audit-log.integration.test.mjs
  │
  ├─ Scénario 1 (Happy path complet)
  │  ├─ recordItemPurchase(actor, {...})
  │  │  └─ actor.update('flags.swerpg.logs', [entry])
  │  │     └─ assert: entry.type='item.purchase', creditDelta=-100, snapshot.creditsAfter=300
  │  ├─ sendChatForAuditEntries(actor, [entry])
  │  │  └─ ChatMessage.create(...)
  │  │     └─ assert: ctx.variant='add', ctx.metaLeft, ctx.metaRight
  │  └─ buildAuditLogEntries(actor, 'purchases')
  │     └─ assert: retourne [entry], famille='purchases'
  │
  ├─ Scénario 2 (Résilience audit)
  │  ├─ actor.update.mockRejectedValue(new Error('DB fail'))
  │  ├─ recordItemPurchase(actor, {...})
  │  └─ assert: resolves (no throw), log.warn appelé
  │
  └─ Scénario 3 (Résilience chat)
     ├─ ChatMessage.create.mockRejectedValue(new Error('Chat fail'))
     ├─ sendChatForAuditEntries(actor, [entry])
     └─ assert: resolves (no throw), log.warn appelé, entry toujours dans flags
```

## Structure de données

### Entrée audit créée par `recordItemPurchase`

```javascript
{
  id: 'purchase-xyz',
  schemaVersion: 1,
  type: 'item.purchase',
  timestamp: 1234567890,
  userId: 'user-123',
  userName: 'GameMaster',
  data: {
    itemName: 'Blaster Pistol',
    itemType: 'weapon',
    price: 100,
    quantity: 1,
    itemId: 'item-uuid-abc' // crucial pour traçabilité
  },
  xpDelta: 0,
  creditDelta: -100,
  snapshot: {
    creditsBefore: 400,
    creditsAfter: 300,
    creditsDelta: 100 // 400 - 300
  }
}
```

### Contexte template pour chat (de `_buildChatContext`)

```javascript
{
  actorImg: '...',
  actorName: 'Pax Mondala',
  eventLabel: 'SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE',
  nextValue: 'Blaster Pistol (weapon)',
  description: 'Purchased Blaster Pistol (weapon) for 100 credits',
  metaLeft: '100 credits',
  metaRight: '300 credits remaining',
  hasMeta: true,
  variant: 'add'
}
```

## Tâches implémentation

### Tâche 1 : Créer test d'intégration Scénario 1 (happy path complet)

**Fichiers** : `tests/integration/market-audit-log.integration.test.mjs` (nouveau)

**Contenu** :

Structure du fichier :

```javascript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

describe('market-audit-log integration', () => {
  beforeEach(() => setupFoundryMock())
  afterEach(() => teardownFoundryMock())

  it('scenario 1: recordItemPurchase → sendChatForAuditEntries → buildAuditLogEntries returns entry', async () => {
    // 1. Import functions
    // 2. Setup actor with mocked update, mocked ChatMessage.create
    // 3. Call recordItemPurchase(actor, {...})
    // 4. Assert actor.update called with correct 'flags.swerpg.logs' structure
    // 5. Extract entry from mock call, verify all fields
    // 6. Call sendChatForAuditEntries(actor, [entry])
    // 7. Assert ChatMessage.create called with correct context (variant='add', metaLeft, metaRight)
    // 8. Manually inject entry into actor.flags.swerpg.logs (simulate state after update)
    // 9. Call buildAuditLogEntries(actor, 'purchases')
    // 10. Assert returns [entry] exactly
  })
})
```

**Tests** :

- ✓ `recordItemPurchase` appelle `actor.update` avec `flags.swerpg.logs` contenant `type: 'item.purchase'`
- ✓ Entry contient `creditDelta: -100`, `snapshot.creditsAfter: 300`, `snapshot.creditsDelta: 100`
- ✓ Entry contient `data.itemId: 'item-uuid-abc'`
- ✓ `sendChatForAuditEntries` appelle `ChatMessage.create` avec contexte correct
- ✓ Contexte a variante `'add'`, métadonnées crédits (prix + restants)
- ✓ `buildAuditLogEntries(actor, 'purchases')` isole l'entrée du filtre

### Tâche 2 : Ajouter Scénario 2 (Résilience audit)

**Fichiers** : `tests/integration/market-audit-log.integration.test.mjs`

**Contenu** :

- Mock `actor.update` pour rejeter : `mockRejectedValue(new Error('DB fail'))`
- Appeler `recordItemPurchase(actor, {...})`
- Assert que l'appel resolve (ne throw pas)
- Assert que `logger.warn` est appelé avec message contenant audit context
- Vérifier que malgré l'erreur, aucune exception ne remonte à l'appelant

**Tests** :

- ✓ `recordItemPurchase` ne throw pas même si `actor.update` rejette
- ✓ `logger.warn` appelé avec message informatif
- ✓ Le Market flow (dans la vraie implémentation) peut continuer après ce catch

### Tâche 3 : Ajouter Scénario 3 (Résilience chat)

**Fichiers** : `tests/integration/market-audit-log.integration.test.mjs`

**Contenu** :

- Mock `ChatMessage.create` pour rejeter : `mockRejectedValue(new Error('Chat fail'))`
- Appeler `sendChatForAuditEntries(actor, [entry])`
- Assert que l'appel resolve (ne throw pas)
- Assert que `logger.warn` est appelé
- Bonus : vérifier que même après l'erreur, l'entrée audit reste dans `flags.swerpg.logs` (isolation)

**Tests** :

- ✓ `sendChatForAuditEntries` ne throw pas même si `ChatMessage.create` rejette
- ✓ `logger.warn` appelé
- ✓ L'entrée audit persiste indépendamment du chat

### Tâche 4 : Enrichir documentation smoke

**Fichiers** : `documentation/tests/manuel/audit-log/README.md`

**Contenu** :

Ajouter nouvelle section §15 après §14 :

```markdown
## 15. Vérification smoke rapide du flux complet (< 2 minutes)

**But** : Valider rapidement que le circuit Market → audit log → chat → filtrage → export fonctionne de bout en bout.

**Prérequis** :

- Personnage actif avec ≥ 500 crédits
- Market ouvert et chargé
- Console F12 disponible
- Character Audit Log accessible

| Étape | Action                                                                       | Résultat attendu                                                           |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1     | Ouvrir Market, acheter 1 item (ex: « Blaster Pistol » 100 crédits)           | Notification succès, solde mis à jour (500 → 400)                          |
| 2     | Exécuter en console : `game.actors.getName("YourName").flags.swerpg.logs[0]` | Entrée type='item.purchase', creditDelta=-100, snapshot.creditsAfter=400   |
| 3     | Aller au chat log et chercher le dernier message du Market                   | Message avec classe CSS `audit-entry--add` (fond vert), contient nom item  |
| 4     | Ouvrir Character Audit Log (bouton fiche personnage), filtrer « Purchases »  | Seule l'entrée achat Market visible, autres entrées (skills, XP) masquées  |
| 5     | Cliquer « Exporter CSV »                                                     | Fichier CSV téléchargé, contient ligne item.purchase avec creditDelta=-100 |

**Verdict** :

- ✅ Si toutes les étapes réussissent → flux complet OK
- ❌ Si une étape échoue → noter laquelle et relancer test après correction

**Temps estimé** : 1–2 minutes
```

### Tâche 5 : Valider couverture tests

**Fichiers** : `pnpm test`, `pnpm vitest run tests/integration/market-audit-log.integration.test.mjs`

**Contenu** :

- Exécuter test d'intégration isolé → tous les `it` passent
- Exécuter suite Vitest complète → zéro régressions
- Vérifier couverture des chemins :
  - ✓ Happy path audit + chat + filtrage
  - ✓ Audit échoue → non-bloquant
  - ✓ Chat échoue → non-bloquant
  - ✓ Filtrage `purchases` isole correctement

## Découpage en issues GitHub (Futures)

Cette implémentation pourrait être découpée comme suit si décomposée :

| #     | Titre                                                                      | Périmètre    | SP  |
| ----- | -------------------------------------------------------------------------- | ------------ | --- |
| 493.1 | **test: Scénario happy path complet (recordItemPurchase → chat → filter)** | Tâches 1 + 5 | 5   |
| 493.2 | **test: Scénarios résilience audit + chat**                                | Tâche 2 + 3  | 3   |
| 493.3 | **docs: Vérification smoke rapide dans README manuel**                     | Tâche 4      | 2   |

**Total** : ~10 SP (1 sprint)

## Validation de succès

- ✅ Fichier `tests/integration/market-audit-log.integration.test.mjs` créé avec 3 `describe` / 3+ `it`
- ✅ Test exécuté via `pnpm vitest run tests/integration/market-audit-log.integration.test.mjs` : tous passent
- ✅ Suite complète `pnpm test` : zéro régression
- ✅ Documentation smoke ajoutée à README manuel (§15)
- ✅ Documentation accessible avant #493 clôture en cas qu'un utilisateur veut tester manuellement le flux

## Prochaines étapes (pour le responsable)

1. **Lire ce plan au complet** pour clarifications, suggestions
2. **Créer issue GitHub** avec acceptance criteria extraits de ce plan
3. **Implémenter par tâche** dans une feature branch
4. **PR** avec tests + doc, demander review @hervedarritchon
5. **Merge** vers `develop` après validation

---

## Statut clôture (Future)

Sera complété après implémentation :

| Tâche              | Status | Notes |
| ------------------ | ------ | ----- |
| 1. Test Scénario 1 | ⧗ TODO |       |
| 2. Test Scénario 2 | ⧗ TODO |       |
| 3. Test Scénario 3 | ⧗ TODO |       |
| 4. Doc smoke       | ⧗ TODO |       |
| 5. Validation      | ⧗ TODO |       |
