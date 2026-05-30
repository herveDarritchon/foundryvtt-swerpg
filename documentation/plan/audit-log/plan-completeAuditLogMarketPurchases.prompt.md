# Plan : Compléter l'Audit Log Market Purchases (Issue #490)

## Vue d'ensemble

**TL;DR** : L'essentiel de la feature Audit Log pour Market Purchases est implémenté (issue #489). Ce plan couvre l'ajout de la colonne `creditDelta` dans l'export CSV, la validation de bout-en-bout de l'intégration, et les tests finaux pour clôturer complètement cette feature.

**Statut** : La majorité du travail est déjà réalisé (recordItemPurchase, \_buildChatContext, filtres, i18n). Cette issue #490 complète les derniers éléments de validation et d'export.

## Objectifs

1. **Export CSV complet** : Ajouter la colonne `creditDelta` à l'export CSV pour que les achats d'items apparaissent avec leur coût en crédits.
2. **Validation de bout-en-bout** : Tester l'intégration complète : Market → entrée audit → chat émis → filtre "Purchases" → export CSV.
3. **Tests finaux** : Unitaires et manuels pour valider que la feature fonctionne correctement.
4. **Documentation** : Mettre à jour la documentation de tests si nécessaire.

## État actuel

### Déjà implémenté (Issue #489)

- ✅ `recordItemPurchase()` dans `module/utils/audit-log.mjs` (L501-527)
- ✅ Famille `purchases` dans `AUDIT_LOG_FAMILIES` dans `character-audit-log.mjs`
- ✅ `getAuditLogFamily('item.purchase')` retourne `AUDIT_LOG_FAMILIES.purchases`
- ✅ `_buildChatContext` pour `item.purchase` (L677-687) avec variant 'add'
- ✅ `buildAuditLogDescription` pour `item.purchase`
- ✅ `formatAuditLogCreditDelta` pour affichage crédits (L157)
- ✅ Intégration Market → `#executePurchase` appelle `recordItemPurchase()` (L698+)
- ✅ Clés i18n complètes EN/FR :
  - `SWERPG.AUDIT_LOG.TYPE.ITEM_PURCHASE`
  - `SWERPG.AUDIT_LOG.FILTER.PURCHASES`
  - `SWERPG.AUDIT_LOG.DESCRIPTION.ITEM_PURCHASE`
  - `SWERPG.AUDIT_LOG.META.PRICE`
  - `SWERPG.AUDIT_LOG.META.CREDITS_REMAINING`
- ✅ Tests unitaires existants dans `tests/utils/audit-log.test.mjs` et `tests/applications/character-audit-log.test.mjs`

### Lacune identifiée (Issue #490)

- ⚠️ Export CSV : colonne `creditDelta` **absente** de `CSV_COLUMNS` et `buildCsvContent()`
  - Actuellement, seul `xpDelta` est exporté (L516-518)
  - Les achats d'items ne sont pas visibles dans le CSV avec leur coût crédit

## Périmètre détaillé

### Inclus

1. Ajouter `creditDelta` à `CSV_COLUMNS` dans `character-audit-log.mjs` (L6)
2. Extraire et inclure `creditDelta` dans la row CSV dans `buildCsvContent()` (L512-520)
3. Ajouter un test unitaire validant l'export CSV pour `item.purchase`
4. Valider le test d'intégration de bout-en-bout (Market → audit → chat → filtre → CSV)
5. Test manuel final : achat complet via Market, vérification de tous les artifacts

### Exclus

- Modifications du Market flow existant
- Changement de format CSV (ajout de colonne est extension compatible)
- Migration rétroactive de données

### Hypothèses

- Les utilisateurs acceptent une colonne CSV supplémentaire (rétrocompatible, ajout en fin)
- Le `creditDelta` est toujours disponible dans l'entrée audit (défini lors de `recordItemPurchase`)
- Les tests existants de #489 passent déjà (pas de régression)

### Contraintes

- Pas de modification du format d'entrée audit (déjà figé)
- L'export CSV ne doit pas bloquer s'il manque `creditDelta` (fallback 0)
- Rétrocompatibilité : ancien logs sans `creditDelta` doivent avoir une valeur par défaut

## Architecture

```
Market#executePurchase
  ↓
recordItemPurchase(actor, {price, creditsAfter, ...})
  ↓
entry = {type: 'item.purchase', data: {...}, creditDelta: -price, snapshot: {...}, ...}
  ↓
writeLogEntries(actor, [entry])
  ↓
sendChatForAuditEntries(actor, [entry])
  ↓ (audit log UI)
buildAuditLogEntries(actor, filter) → filtre "Purchases" fonctionne
  ↓ (export CSV)
buildCsvContent(actor) → ajouter creditDelta à la row CSV
```

## Tâches implémentation

### Tâche 1 : Ajouter `creditDelta` à `CSV_COLUMNS`

**Fichiers** : `module/applications/character-audit-log.mjs` (L6)

**Contenu** :

Changer :

```javascript
const CSV_COLUMNS = Object.freeze(['timestamp', 'date', 'userName', 'type', 'typeLabel', 'description', 'xpDelta', 'actorName', 'playerName'])
```

En :

```javascript
const CSV_COLUMNS = Object.freeze(['timestamp', 'date', 'userName', 'type', 'typeLabel', 'description', 'xpDelta', 'creditDelta', 'actorName', 'playerName'])
```

**Raison** : La colonne `creditDelta` est utilisée par les entrées `item.purchase` pour représenter le coût en crédits (négatif).

### Tâche 2 : Extraire et inclure `creditDelta` dans `buildCsvContent()`

**Fichiers** : `module/applications/character-audit-log.mjs` (L506-524)

**Contenu** :

Dans la fonction `buildCsvContent(actor)`, ajouter extraction de `creditDelta` :

```javascript
export function buildCsvContent(actor) {
  const rawLogs = foundry.utils.getProperty(actor, AUDIT_LOG_PATH) ?? []
  const ownerName = getPrimaryOwnerName(actor)
  const actorName = actor?.name ?? ''

  const header = CSV_COLUMNS.map(escapeCsvCell).join(',')
  const rows = rawLogs.map((entry) => {
    const typeLabel = getAuditLogTypeLabel(entry.type)
    const description = buildAuditLogDescription(entry)
    const formattedDate = formatAuditLogTimestamp(entry.timestamp)
    const xpDelta = Number(entry.xpDelta) || 0
    const creditDelta = Number(entry.creditDelta) || 0 // NOUVEAU

    // ANCIEN: const row = [entry.timestamp ?? '', formattedDate, entry.userName ?? '', entry.type ?? '', typeLabel, description, xpDelta, actorName, ownerName]
    // NOUVEAU:
    const row = [
      entry.timestamp ?? '',
      formattedDate,
      entry.userName ?? '',
      entry.type ?? '',
      typeLabel,
      description,
      xpDelta,
      creditDelta,
      actorName,
      ownerName,
    ]

    return row.map(escapeCsvCell).join(',')
  })

  return [header, ...rows].join('\n')
}
```

**Raison** : Pour que le CSV reflète à la fois les dépenses XP ET les dépenses en crédits, chaque ligne doit comporter les deux métriques.

**Tests** :

- ✓ `creditDelta` pour `item.purchase` est `-price * quantity`
- ✓ Ancien logs sans `creditDelta` ont une valeur par défaut (0)
- ✓ CSV header inclut la nouvelle colonne
- ✓ CSV rows incluent la colonne `creditDelta` au bon emplacement

### Tâche 3 : Test unitaire — Export CSV pour `item.purchase`

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**Contenu** :

Ajouter un test dans la suite `buildCsvContent` :

```javascript
it('buildCsvContent includes creditDelta for item.purchase entries', () => {
  const actor = createActor({
    flags: {
      swerpg: {
        logs: [
          {
            id: 'purchase-1',
            timestamp: 1000,
            type: 'item.purchase',
            userName: 'GM',
            xpDelta: 0,
            creditDelta: -150,
            data: { itemName: 'Blaster Pistol', itemType: 'weapon', price: 150, quantity: 1 },
          },
        ],
      },
    },
  })

  const csv = buildCsvContent(actor)
  const lines = csv.split('\n')

  // Vérifier que le header inclut creditDelta
  expect(lines[0]).toContain('creditDelta')

  // Vérifier que la valeur est correcte dans la row
  expect(lines[1]).toContain('-150')
})
```

**Raison** : Valider que le `creditDelta` est correctement extrait et inclus dans l'export CSV.

### Tâche 4 : Test d'intégration — Validation complète Market → Audit → CSV

**Fichiers** : `tests/applications/character-audit-log.test.mjs` ou nouveau fichier d'intégration

**Contenu** :

Ajouter un test d'intégration :

```javascript
it('item purchase flows through audit log, chat, filter, and CSV export', async () => {
  // Setup
  const actor = createActorWithLog([
    {
      id: 'p1',
      timestamp: 100,
      type: 'item.purchase',
      xpDelta: 0,
      creditDelta: -100,
      data: { itemName: 'Blaster', itemType: 'weapon', price: 100, quantity: 1 },
      snapshot: { creditsBefore: 250, creditsAfter: 150 },
    },
  ])

  // Vérifier filtre "Purchases"
  const entries = buildAuditLogEntries(actor, 'purchases')
  expect(entries).toHaveLength(1)
  expect(entries[0].family).toBe('purchases')

  // Vérifier description
  const description = buildAuditLogDescription(entries[0])
  expect(description).toContain('Blaster')
  expect(description).toContain('100')

  // Vérifier CSV
  const csv = buildCsvContent(actor)
  expect(csv).toContain('-100')
})
```

**Raison** : Validation de bout-en-bout que toute la pipeline fonctionne correctement.

### Tâche 5 : Test manuel — Achat complet via Market

**Documentation** : `documentation/tests/manuel/audit-log/README.md` (si existe)

**Procédure** :

1. Ouvrir un personnage avec crédits disponibles (ex: 500)
2. Ouvrir le Market
3. Acheter un item (ex: Blaster Pistol pour 100 crédits)
4. Vérifier :
   - ✓ Crédits diminuent (500 → 400)
   - ✓ Item ajouté à l'inventaire
   - ✓ Message chat émis avec format correct (variante 'add', vert)
   - ✓ Entrée audit créée dans Character Audit Log
   - ✓ Filtre "Purchases" affiche l'entrée
   - ✓ Description : "Purchased Blaster Pistol (weapon) for 100 credits"
   - ✓ Métadonnées : "100 credits" (gauche), "400 credits remaining" (droite)
5. Exporter l'audit log en CSV
6. Vérifier que la ligne contient `-100` dans la colonne `creditDelta`

**Raison** : Validation humaine de l'intégration complète avant fermeture de l'issue.

### Tâche 6 : Vérifier régression sur tests existants

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/applications/character-audit-log.test.mjs`

**Contenu** :

Exécuter :

```bash
pnpm vitest run tests/utils/audit-log.test.mjs
pnpm vitest run tests/applications/character-audit-log.test.mjs
```

**Raison** : S'assurer qu'aucune régression n'a été introduite par l'ajout de `creditDelta` au CSV.

## Découpage en sous-tâches GitHub

| #     | Titre                                                    | Périmètre                                 | Dépendances  | Points |
| ----- | -------------------------------------------------------- | ----------------------------------------- | ------------ | ------ |
| 490.1 | **feat: Add creditDelta column to audit log CSV export** | `CSV_COLUMNS`, `buildCsvContent()`, tests | —            | 3      |
| 490.2 | **test: Unit test for item.purchase CSV export**         | `character-audit-log.test.mjs`            | 490.1        | 2      |
| 490.3 | **test: Integration test Market → Audit → CSV**          | `character-audit-log.test.mjs`            | 490.1, 490.2 | 3      |
| 490.4 | **test: Manual test procedure documentation**            | `documentation/tests/manuel/audit-log/`   | 490.1–490.3  | 2      |
| 490.5 | **chore: Verify no regressions in audit log tests**      | Run vitest full suite                     | 490.1–490.4  | 1      |

**Total estimation** : ~11 SP (moins d'une journée de développement)

## Considérations supplémentaires

### 1. Rétrocompatibilité CSV

Les logs existants sans `creditDelta` seront-ils exportés avec 0 ?

**Recommandation** : Oui, fallback à 0 via `Number(entry.creditDelta) || 0`. Cela ne casse pas les scripts de parsing existants.

### 2. Format CSV extensibilité

Ajouter `creditDelta` modifie le format CSV. Faut-il ajouter une version ou un header spécifique ?

**Recommandation** : Non, c'est une extension rétrocompatible. Les anciens parsers continueront de fonctionner (colonnes ignorées suffisent).

### 3. Ordre des colonnes

Pourquoi `creditDelta` après `xpDelta` et avant `actorName` ?

**Recommandation** : Grouper les métriques (xp, credit costs) avant les métadonnées acteur. C'est une convention logique.

### 4. Performance CSV

Extracting 1000+ logs en CSV avec la nouvelle colonne ?

**Recommandation** : Pas de changement de performance (une seule colonne ajoutée, pas de calcul complexe).

## Validation de succès

- ✓ `CSV_COLUMNS` inclut `creditDelta`
- ✓ `buildCsvContent()` extrait et inclut `creditDelta` pour chaque entrée
- ✓ Test unitaire valide l'export CSV pour `item.purchase`
- ✓ Test d'intégration valide le flow complet (Market → audit → CSV)
- ✓ Test manuel réussit tous les points de vérification
- ✓ Aucune régression sur les tests existants
- ✓ Ancien logs sans `creditDelta` exportent correctement (fallback 0)

## Prochaines étapes

1. **Affiner ce plan** : Feedback sur le scope et les tests proposés
2. **Créer les issues GitHub** : 490.1 → 490.5
3. **Implémenter par ordre** : 490.1 → 490.2 → 490.3 → 490.4 → 490.5
4. **Review + merge** : PR par issue avec tests complets
5. **Fermer issue #490** : Valider que tous les points de succès sont couverts
