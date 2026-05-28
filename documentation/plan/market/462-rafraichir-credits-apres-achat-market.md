# Rafraîchir les crédits et l'éligibilité dans le Market après un achat

**Issue** : — (complément de #462)
**Dépend sur** : #457 (achat simple), #462 (bouton achat Market)

## Constat

Le flux d'achat `#onBuyItem` déduit bien les crédits de l'acteur via `createEmbeddedDocuments`, mais le Market **ne se rerend pas** après l'achat. Conséquences :

1. La barre du buyer affiche toujours l'ancien montant de crédits.
2. Les entrées du catalogue gardent leur état `canBuy=true` même si le solde ne permet plus un second achat.
3. L'utilisateur peut cliquer « Acheter » plusieurs fois de suite et déclencher des achats au-delà de sa capacité financière (avant que la revalidation ligne 488-492 ne rattrape le cas).

## Cause racine

Dans `module/applications/market/market-application.mjs`, la méthode `#onBuyItem` termine le succès d'achat (ligne 499) sans appeler `this.render()`.

`_preparePartContext('catalog', ...)` et `#prepareCatalog(...)` savent déjà recalculer `buyer.credits` et `canBuy` à partir de `_buyerActor.system.creditBudget.availableCredits`. Le code de relecture existe — seul le déclenchement manque.

## Solution

Ajouter `await this.render()` après le bloc `createEmbeddedDocuments` réussi, dans le `try` de `#onBuyItem`.

```js
// Après ligne 499
await this.render()
```

## Tests à ajouter

Dans `tests/applications/market/market-application.test.mjs`, section `buyItem action` :

| Cas                                                               | Résultat attendu                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Achat confirmé → `createEmbeddedDocuments` résolu                 | `render()` appelé sur l'instance                                                                         |
| Achat confirmé → crédits mock passent de 500 à 400 après mutation | `_preparePartContext('catalog')` expose `buyer.credits === 400` et `canBuy === false` pour un item à 500 |

## Tests

- `pnpm vitest run tests/applications/market/market-application.test.mjs` — pas de régression.
- Vérification manuelle : ouvrir Market depuis fiche perso (500 crédits), acheter un item à 100 → barre affiche 400, item à 400 devient « non achetable ».

## Résultat attendu

- Market toujours synchronisé avec le solde réel après chaque achat.
- `canBuy` réévalué sur chaque ligne après achat.
- Plus de possibilité d'achats multiples au-delà du budget (la revalidation ligne 488 reste une sécurité, mais l'UI ne l'expose plus).
