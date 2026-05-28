# Compléter le bouton d'achat dans le Market

**Issue** : à créer
**Dépend sur** : #457 (achat simple), #461 (bouton Market dans inventaire)

## Constat

Le flux JS d'achat est déjà implémenté (`module/lib/market/purchase.mjs`, `#onBuyItem` dans `market-application.mjs`, `openMarket(actor)` dans `swerpg.mjs`). Mais :

1. **Bug de scope Handlebars (cause racine)** : Dans `templates/market/market.hbs`, la condition `{{#if ../buyer}}` à la ligne 136 (dans `{{#each group.items as |entry|}}`) ne remonte qu'au contexte `group`, pas au root. `group` n'a pas de propriété `buyer` → le bouton d'achat ne s'affiche jamais dans les lignes. En revanche la condition `{{#if ../buyer}}` à la ligne 110 fonctionne car le parent direct est le niveau racine.
2. Les styles de la buyer bar, de la colonne `market-col--buy` et du bouton `market-item__buy` sont absents du fichier `styles/market.less`.
3. Le clic `buyItem` n'est pas encore testé dans l'application Market.
4. Il n'y a pas de feedback explicite quand le Market est ouvert sans acheteur.

## Décisions

- Conserver la logique actuelle : l'acheteur est l'acteur courant de la fiche personnage, passé via `openMarket(actor)`.
- Ajouter un message informatif dans le header du Market quand aucun acheteur n'est défini.
- Ajouter les styles pour la buyer bar, la colonne d'achat et le bouton.
- Ajouter les tests manquants pour l'action `buyItem` et le rendu conditionnel.

## Étapes

### 1. Styles manquants — `styles/market.less`

Ajouter après `.market-item__icon` (l.297) :

```less
/* ----------------------------------------- */
/*  Market Buyer Bar                         */
/* ----------------------------------------- */

.market-buyer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  background: rgba(12, 18, 27, 0.7);
  border: 1px solid var(--color-cool-4, rgba(120, 169, 194, 0.22));
  border-radius: 6px;
  margin-bottom: 0.25rem;
  font-size: var(--font-size-13);
}

.market-buyer-bar__name {
  color: var(--color-primary);
  font-weight: 600;
}

.market-buyer-bar__credits {
  color: var(--color-secondary);
}

/* ----------------------------------------- */
/*  Market Buy Column & Button               */
/* ----------------------------------------- */

.market-col--buy {
  width: 50px;
  text-align: center;
}

.market-item__buy {
  padding: 0.3rem 0.5rem;
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 4px;
  color: #81c784;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  font-size: var(--font-size-13);

  &:hover {
    background: rgba(76, 175, 80, 0.3);
    color: #a5d6a7;
  }

  &:focus-visible {
    outline: 2px solid var(--color-cool-4, rgba(120, 169, 194, 0.5));
    outline-offset: 2px;
  }

  &--disabled {
    background: rgba(120, 169, 194, 0.08);
    border-color: rgba(120, 169, 194, 0.15);
    color: var(--color-secondary);
    cursor: not-allowed;
    opacity: 0.45;

    &:hover {
      background: rgba(120, 169, 194, 0.08);
      color: var(--color-secondary);
    }
  }
}
```

### 2. Correction du scope Handlebars + feedback sans acheteur — `templates/market/market.hbs`

**Problème** : `{{#if ../buyer}}` à la ligne 136 ne remonte qu'au parent immédiat (`group`) alors que `buyer` est à la racine du contexte. Le bouton d'achat ne s'affiche jamais.

**Correctif** : Remplacer toutes les conditions `{{#if ../buyer}}` (lignes 110 et 136) par `{{#if @root.buyer}}` pour remonter jusqu'à la racine du contexte.

Mettre à jour le buyer bar pour montrer un message invitant à ouvrir le Market depuis une fiche personnage quand `buyer` est absent (à la place du bloc `{{#if buyer}}` actuel) :

```hbs
{{#if buyer}}
  <div class='market-buyer-bar'>
    <span class='market-buyer-bar__name'>{{buyer.name}}</span>
    <span class='market-buyer-bar__credits'>
      {{localize 'MARKET.Buyer.Credits'}}:
      <strong>{{buyer.credits}}</strong>
    </span>
  </div>
{{else}}
  <div class='market-buyer-bar market-buyer-bar--empty'>
    <span>{{localize 'MARKET.Buyer.SelectCharacter'}}</span>
  </div>
{{/if}}
```

### 3. Clé i18n — `lang/en.json` et `lang/fr.json`

Ajouter dans la section `MARKET.Buyer` :

**`en.json`** :

```json
"SelectCharacter": "Open the Market from a character sheet to make purchases."
```

**`fr.json`** :

```json
"SelectCharacter": "Ouvrez le marché depuis une fiche personnage pour effectuer un achat."
```

### 4. Tests — `tests/applications/market/market-application.test.mjs`

Ajouter une section `buyItem action` avec les cas :

| Cas                                                          | Résultat attendu                                         |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| Clic sans `data-uuid`                                        | Warning logger + return                                  |
| Clic sans `_buyerActor`                                      | Notification `MissingActor`                              |
| UUID résolu → item null                                      | Notification `ItemNotFound`                              |
| UUID résolu → item valide, validation `canPurchase=false`    | Notification avec `messageKey`                           |
| UUID résolu → validation `canPurchase=true`, dialog confirmé | `createEmbeddedDocuments` appelé, notification `Success` |
| UUID résolu → dialog annulé                                  | Aucune mutation                                          |

### 5. Styles buyer bar vide — `styles/market.less`

Ajouter après les styles de `.market-buyer-bar` :

```less
.market-buyer-bar--empty {
  justify-content: center;
  color: var(--color-secondary);
  font-style: italic;
}
```

## Tests

- `pnpm test` — aucune régression.
- Vérification manuelle : ouvrir le Market depuis la fiche personnage → barre acheteur visible → bouton Acheter par ligne.
- Vérification manuelle : ouvrir le Market via une autre méthode (GM sur sidebar) → message "Ouvrez le marché depuis...".

## Résultat attendu

- Bouton Acheter visible et stylé quand un acheteur est défini.
- Message d'invitation clair quand aucun acheteur n'est présent.
- `market-item__buy` a un état désactivé `.market-item__buy--disabled` quand `canBuy=false`.
- Tests automatisés couvrant le déclenchement `buyItem`.
