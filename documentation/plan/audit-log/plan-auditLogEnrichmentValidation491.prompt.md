# Plan : Enrichissement et Validation Audit Log Market Purchases (Issue #491)

## Vue d'ensemble

**TL;DR** : L'issue #491 vise à finaliser/valider l'extension Audit Log pour les achats Market. La feature est déjà fonctionnelle (issues #489/#490). Ce plan couvre les enrichissements résiduels identifiés dans le cadrage initial (`plan-auditLogMarketPurchases.prompt.md`), la validation E2E complète, et la documentation de clôture.

**Statut actuel** :

- ✅ `recordItemPurchase()` implémenté et fonctionnel
- ✅ Intégration Market → Audit Log opérationnelle
- ✅ Filtres et export CSV en place
- ✅ Clés i18n EN/FR complètes
- ❓ Champ `itemId` dans `data` — mentionné dans le cadrage, non présent dans l'implémentation
- ❓ Snapshot `creditsDelta` — mentionné dans le cadrage, actuellement non capturé
- ❓ Tests unitaires pour les nouveaux champs

## Objectifs

1. **Enrichir les entrées audit** : Ajouter `itemId` et `creditsDelta` dans snapshot pour alignement complet avec le cadrage.
2. **Valider la feature E2E** : Tests complets Market → audit log → chat → filtre → CSV.
3. **Documenter la clôture** : Finaliser la documentation et les références de plan.
4. **Zéro régressions** : Vérifier que les tests existants passent toujours.

## Périmètre détaillé

### Inclus

1. Ajouter le champ `itemId` à `data` dans `recordItemPurchase()` et dans l'appel depuis Market
2. Ajouter `creditsDelta` dans la `snapshot` de l'entrée audit (calculé comme `creditsBefore - creditsAfter`)
3. Mettre à jour les tests unitaires pour couvrir `itemId` et `snapshot.creditsDelta`
4. Validation E2E complète : Market → audit → chat → filtre → CSV avec nouveaux champs
5. Documentation finale et clôture de #491

### Exclus

- Modifications du Market flow existant
- Changement de format des entrées (extension rétrocompatible uniquement)
- Migration rétroactive des logs existants

### Hypothèses

- L'issue #491 accepte les enrichissements proposés (confirmation par review)
- Les anciens logs sans `itemId` et `creditsDelta` demeurent valides (fallback `null`/`undefined`)
- Les tests peuvent être mis à jour sans blocage pour validation

### Contraintes

- Rétrocompatibilité : pas de breaking changes pour les logs existants
- `itemId` doit être capturé au moment de l'achat (disponible dans le contexte Market)
- `creditsDelta` calculé comme différence `creditsBefore - creditsAfter` (doit être cohérent avec `creditDelta` au niveau racine, qui est `-price * quantity`)

## Architecture et flux

```
Market#executePurchase
  ↓
  capture itemId depuis item.id ou item.uuid
  ↓
recordItemPurchase(actor, { itemName, itemType, price, quantity, creditsAfter, itemId })
  ↓
entry = {
  type: 'item.purchase',
  data: { itemName, itemType, price, quantity, itemId },          // NOUVEAU: itemId
  creditDelta: -(price * quantity),
  snapshot: {
    creditsBefore,
    creditsAfter,
    creditsDelta: creditsBefore - creditsAfter              // NOUVEAU
  }
}
  ↓
writeLogEntries(actor, [entry])
  ↓
sendChatForAuditEntries + buildAuditLogEntries + buildCsvContent
```

## Tâches implémentation

### Tâche 1 : Ajouter `itemId` à `recordItemPurchase()` dans `module/utils/audit-log.mjs`

**Fichiers** : `module/utils/audit-log.mjs` (L501-527)

**Contenu** :

- Signature : `recordItemPurchase(actor, { itemName, itemType, price, quantity = 1, creditsAfter, itemId })`
- Ajouter `itemId` au champ `data` de l'entrée (L511-515)
- JSDoc mises à jour pour documenter le nouveau paramètre

**Avant** :

```javascript
const entry = {
  ...makeEntry({
    type: 'item.purchase',
    data: {
      itemName,
      itemType,
      price,
      quantity,
    },
```

**Après** :

```javascript
const entry = {
  ...makeEntry({
    type: 'item.purchase',
    data: {
      itemName,
      itemType,
      price,
      quantity,
      itemId,
    },
```

**Tests** :

- ✓ `itemId` présent dans `entry.data`
- ✓ `itemId` peut être `undefined` (fallback gracieux)
- ✓ `itemId` accepte UUID ou ID simple

### Tâche 2 : Ajouter `creditsDelta` à la snapshot de l'entrée audit

**Fichiers** : `module/utils/audit-log.mjs` (L501-527)

**Contenu** :

Modifier la construction de la `snapshot` pour inclure `creditsDelta` :

```javascript
const creditsBefore = actor.system?.creditBudget?.availableCredits ?? actor.system?.credits ?? null
const snapshot = {
  creditsBefore,
  creditsAfter,
  creditsDelta: creditsBefore !== null && creditsAfter !== null ? creditsBefore - creditsAfter : null,
}
```

**Validation** :

- ✓ `creditsDelta = creditsBefore - creditsAfter` (positif si loss, négatif si gain, nul si incomplet)
- ✓ Gestion gracieuse si `creditsBefore` ou `creditsAfter` est `null`

### Tâche 3 : Mettre à jour l'appel Market → `recordItemPurchase()` pour passer `itemId`

**Fichiers** : `module/applications/market/market-application.mjs` (L698+)

**Contenu** :

Dans `#executePurchase`, après `createEmbeddedDocuments(...)` réussi, passer `itemId` :

```javascript
const { recordItemPurchase } = await import('../../utils/audit-log.mjs')
try {
  await recordItemPurchase(buyer, {
    itemName: entry.name,
    itemType: item.type,
    price: finalValidation.finalPrice,
    quantity: 1,
    creditsAfter: finalValidation.creditsAfter,
    itemId: item.id, // NOUVEAU
  })
}
```

**Tests** :

- ✓ `item.id` est accessible dans le contexte Market
- ✓ `recordItemPurchase` reçoit `itemId` correctement

### Tâche 4 : Tests unitaires — `itemId` et `creditsDelta` dans snapshot

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs`

**Contenu** :

#### Test `recordItemPurchase` avec `itemId` et `creditsDelta`

```javascript
it('recordItemPurchase captures itemId and creditsDelta in snapshot', async () => {
  const { recordItemPurchase } = await import('../../module/utils/audit-log.mjs')
  const actor = makeActor({
    system: { credits: 250 },
  })

  await recordItemPurchase(actor, {
    itemName: 'Blaster Pistol',
    itemType: 'weapon',
    price: 100,
    quantity: 1,
    creditsAfter: 150,
    itemId: 'item-uuid-12345',
  })

  const logs = foundry.utils.getProperty(actor, 'flags.swerpg.logs')
  const entry = logs[logs.length - 1]

  expect(entry.data.itemId).toBe('item-uuid-12345')
  expect(entry.snapshot.creditsDelta).toBe(100) // 250 - 150
  expect(entry.creditDelta).toBe(-100) // -(100 * 1)
})
```

#### Test rétrocompatibilité (logs sans `itemId`)

```javascript
it('handles logs without itemId gracefully', () => {
  const actor = createActorWithLog([
    {
      id: 'p1',
      timestamp: 100,
      type: 'item.purchase',
      xpDelta: 0,
      data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
      snapshot: { creditsBefore: 250, creditsAfter: 150 },
      // itemId absent
    },
  ])

  const entries = buildAuditLogEntries(actor, 'purchases')
  expect(entries).toHaveLength(1)
  expect(entries[0].data.itemId).toBeUndefined()
})
```

**Tests** :

- ✓ `itemId` capturé dans `entry.data`
- ✓ `creditsDelta` calculé correctement dans `snapshot`
- ✓ Logs sans `itemId` traitées sans erreur
- ✓ Calcul `creditsDelta = creditsBefore - creditsAfter`

### Tâche 5 : Test d'intégration E2E — Market → Audit → Chat → Filtre → CSV avec itemId

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**Contenu** :

```javascript
it('item purchase with itemId flows through audit log, chat, and CSV', () => {
  const actor = createActorWithLog([
    {
      id: 'p1',
      timestamp: 100,
      type: 'item.purchase',
      xpDelta: 0,
      creditDelta: -100,
      data: {
        itemName: 'Blaster Pistol',
        itemType: 'weapon',
        price: 100,
        quantity: 1,
        itemId: 'item-uuid-abc123',
      },
      snapshot: {
        creditsBefore: 250,
        creditsAfter: 150,
        creditsDelta: 100,
      },
    },
  ])

  // Filtre "Purchases"
  const entries = buildAuditLogEntries(actor, 'purchases')
  expect(entries).toHaveLength(1)
  expect(entries[0].data.itemId).toBe('item-uuid-abc123')

  // Description
  const description = buildAuditLogDescription(entries[0])
  expect(description).toContain('Blaster Pistol')
  expect(description).toContain('100')

  // CSV
  const csv = buildCsvContent(actor)
  expect(csv).toContain('-100') // creditDelta
  expect(csv).toContain('Blaster Pistol') // description
})
```

**Tests** :

- ✓ `itemId` présent dans l'entrée filtrée
- ✓ Chat message construit correctement
- ✓ CSV export inclut tous les champs
- ✓ Snapshot `creditsDelta` cohérent avec `creditDelta`

### Tâche 6 : Test manuel — Achat complet et vérification des nouveaux champs

**Documentation** : `documentation/tests/manuel/audit-log/README.md`

**Procédure** :

1. Ouvrir un personnage avec crédits (ex: 500)
2. Ouvrir le Market et acheter un item (ex: Blaster Pistol pour 100 crédits)
3. Vérifier :
   - ✓ Crédits diminuent (500 → 400)
   - ✓ Item ajouté à l'inventaire
   - ✓ Message chat émis avec format correct
   - ✓ Entrée audit créée
   - ✓ **Entrée contains `itemId` (UUID ou ID de l'item acheté)**
   - ✓ **Snapshot contains `creditsDelta = 100`**
4. Ouvrir l'Audit Log UI pour le personnage
   - ✓ Filtre "Purchases" fonctionne
   - ✓ Description complète
   - ✓ Métadonnées (prix et solde restant)
5. Exporter CSV et vérifier :
   - ✓ Ligne contient `itemId` (si colonne ajoutée)
   - ✓ Colonne `creditDelta = -100`

### Tâche 7 : Vérification régression — Tous les tests existants passent

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs`

**Commande** :

```bash
pnpm vitest run tests/utils/audit-log.test.mjs tests/applications/character-audit-log.test.mjs
```

**Validation** :

- ✓ Aucune régression introduite par l'ajout de `itemId` et `creditsDelta`
- ✓ Tous les tests existants passent
- ✓ Nouveaux tests pour `itemId` et `creditsDelta` passent

### Tâche 8 : Documentation et clôture de #491

**Fichiers** : Ce plan, `documentation/plan/audit-log/README.md` (si existe)

**Contenu** :

- Mettre à jour la documentation pour couvrir les deux champs ajoutés (`itemId`, `snapshot.creditsDelta`)
- Ajouter des exemples d'utilisation dans les références
- Documenter la rétrocompatibilité et les fallbacks
- Marquer issue #491 comme fermée avec résumé des changements

## Découpage en sous-tâches GitHub

| #     | Titre                                                     | Périmètre                                            | Dépendances  | Points |
| ----- | --------------------------------------------------------- | ---------------------------------------------------- | ------------ | ------ |
| 491.1 | **feat: Add itemId capture to recordItemPurchase()**      | `audit-log.mjs`, Market snapshot                     | —            | 3      |
| 491.2 | **feat: Add creditsDelta to audit entry snapshot**        | `audit-log.mjs` snapshot calculation                 | 491.1        | 2      |
| 491.3 | **test: Unit tests for itemId and creditsDelta**          | `audit-log.test.mjs`, `character-audit-log.test.mjs` | 491.1, 491.2 | 3      |
| 491.4 | **test: Integration E2E test Market → Audit with itemId** | Full flow validation                                 | 491.1–491.3  | 3      |
| 491.5 | **test: Manual test procedure with itemId verification**  | `documentation/tests/manuel/audit-log/`              | 491.1–491.4  | 2      |
| 491.6 | **chore: Verify no regressions in audit log tests**       | Full vitest suite                                    | 491.1–491.5  | 1      |
| 491.7 | **docs: Update audit log documentation and close #491**   | Plan references, README, closure                     | 491.1–491.6  | 2      |

**Estimation totale** : ~16 SP (2 jours de développement)

## Considérations supplémentaires

### 1. Redondance `creditDelta` vs `snapshot.creditsDelta`

**Question** : Faut-il garder les deux ?

**Recommandation** :

- **Oui, conserver les deux** pour traçabilité complète :
  - `creditDelta` au niveau racine = `-price * quantity` (ce qui a été dépensé)
  - `snapshot.creditsDelta = creditsBefore - creditsAfter` (ce qui a réellement été dépensé, peut varier en cas d'ajustement)
- Cela permet de détecter les écarts o particuliers (ex: bonus, réduction appliquée après coup)

### 2. Scope de `itemId`

**Question** : Doit-on stocker l'UUID ou l'ID simple du document Item ?

**Recommandation** :

- Utiliser `item.id` (ID simple, plus stable à court terme)
- Si UUID est nécessaire, capturer aussi via `item.uuid` dans un champ séparé `itemUuid` optionnel
- Pour #491, couvrir `itemId` uniquement (minimal et suffisant)

### 3. Utilité de `itemId` pour les futures features

**Cas d'usage** :

- Lier l'entrée audit à l'item en inventory (si l'item est supprimé plus tard, audit reste intègre)
- Générer des rapports d'inventaire achetés
- Dénormalisation partielle entre audit log et inventory

### 4. Format d'export CSV — ajouter `itemId` ?

**Question** : Faut-il ajouter une colonne CSV pour `itemId` ?

**Recommandation** :

- **Non pour #491** (gardez l'export CSV stable)
- `itemId` est capturé dans l'entrée audit (visible via l'UI Audit Log)
- CSV conserve sa structure actuelle pour rétrocompatibilité
- Possibilité future : exporter JSON enrichi avec `itemId` comme alternate format

## Validation de succès

- ✓ `itemId` capturé et présent dans `entry.data` pour tous les achats Market
- ✓ `snapshot.creditsDelta` calculé correctement (`creditsBefore - creditsAfter`)
- ✓ Tests unitaires couvrent `itemId`, `creditsDelta`, et rétrocompatibilité
- ✓ Test E2E valide entièrement Market → audit → chat → filtre avec nouveaux champs
- ✓ Test manuel réussit avec vérification visuelle des champs enrichis
- ✓ Aucune régression sur tests existants
- ✓ Documentation mise à jour
- ✓ Issue #491 fermée

## Prochaines étapes

1. **Affiner ce plan** : Feedback sur les choix proposés (redondance `creditDelta`, scope `itemId`, etc.)
2. **Créer les issues GitHub** : 491.1 → 491.7 avec estimations confirmées
3. **Implémenter par ordre** : 491.1 → 491.2 → 491.3 → 491.4 → 491.5 → 491.6 → 491.7
4. **Review + merge** : PR par issue avec tests complets
5. **Fermer #491** : Vérifier tous les points de succès, marquer comme Done

## References

- Plan d'origine (cadrage métier) : `plan-auditLogMarketPurchases.prompt.md`
- Plan #489 (core implementation) : `plan-itemPurchaseAuditLog.prompt.md`
- Plan #490 (CSV export) : `plan-completeAuditLogMarketPurchases.prompt.md`
- Code core : `module/utils/audit-log.mjs` (L501-527 `recordItemPurchase`)
- Integration Market : `module/applications/market/market-application.mjs` (L678+ `#executePurchase`)
- Tests : `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs`
