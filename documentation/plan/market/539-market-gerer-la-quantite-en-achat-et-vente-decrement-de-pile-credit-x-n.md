# Market — Gérer la quantité en achat et vente (décrément de pile, crédit × n)

**Issue** : [#539 — Market — Gérer la quantité en achat et vente (décrément de pile, crédit × n)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/539)

**Domaine métier** : `market`

## Goal

Permettre d’acheter et de vendre plusieurs unités d’un item physique via le Market, avec un débit/crédit total multiplié par la quantité choisie et une vente partielle qui décrémente `system.quantity` au lieu de supprimer toute la pile.

## Contexte utile

- Les items physiques portent déjà `system.quantity` et le budget dérivé du personnage calcule bien `price × quantity` dans `SwerpgCharacter._prepareCredits()`.
- Le flow d’achat Market est encore câblé en dur sur `quantity: 1`.
- Le flow de vente supprime actuellement tout l’item (`deleteEmbeddedDocuments`) et l’audit de vente ne transporte pas encore de quantité.

## Plan d’implémentation

### Étape 1 — Introduire une quantité explicite dans les parcours achat/vente

**Fichiers** : `module/applications/market/market-application.mjs`, `templates/market/market.hbs`, `templates/market/market-inventory.hbs`, `lang/en.json`, `lang/fr.json` _(et un petit dialog réutilisable si nécessaire)_

**What** :

- ajouter un sélecteur de quantité entier `>= 1` réutilisable entre achat et vente ;
- borner la vente par la pile réellement possédée (`system.quantity`) et afficher cette pile dans la vue inventaire ;
- faire apparaître dans les confirmations le total calculé sur `prix unitaire × quantité`.

**Résultat attendu** : l’utilisateur choisit une quantité valide avant mutation, sans ambiguïté entre prix unitaire et total.

### Étape 2 — Faire porter la quantité par les validations et les mutations métier

**Fichiers** : `module/lib/market/purchase.mjs`, `module/lib/market/sell-validation.mjs`, `module/applications/market/market-application.mjs`

**What** :

- étendre les helpers purs pour accepter `quantity` et retourner les montants totaux (`finalPrice × n`, `resalePrice × n`, `creditsAfter`) ;
- en achat, créer l’item embarqué avec `system.quantity = n` au lieu d’un achat implicitement unitaire ;
- en vente, calculer le crédit total sur `n`, décrémenter `system.quantity` quand une pile reste, et ne supprimer le document que lorsque la quantité vendue épuise la pile ;
- adapter la formule compensée de `system.credits` pour raisonner sur `basePrice × n`, afin de préserver l’invariant `availableCreditsAfter = availableCreditsBefore + resaleTotal`.

**Résultat attendu** : acheter 3 unités débite 3× le prix final ; vendre 2 unités d’une pile de 5 crédite 2× la revente et laisse une pile de 3.

### Étape 3 — Propager la quantité dans l’audit, les feedbacks et les tests de non-régression

**Fichiers** : `module/utils/audit-log.mjs`, `tests/applications/market/market-application.test.mjs`, `tests/lib/market/purchase.test.mjs`, `tests/lib/market/sell-validation.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- ajouter `quantity` au contrat de `recordItemSale()` pour l’aligner avec `recordItemPurchase()` ;
- vérifier que notifications, logs et snapshots d’audit reflètent le total financier et la quantité réelle ;
- couvrir les cas `achat x n`, `crédits insuffisants pour n`, `vente partielle avec décrément`, `vente totale avec suppression`, et l’invariant crédits dérivés/non dérivés.

**Résultat attendu** : le comportement multi-quantité est verrouillé côté achat, vente et traçabilité.

## Périmètre / hors périmètre

### Inclus

- choix d’une quantité en achat et en vente ;
- débit/crédit multiplié par `n` ;
- décrément de pile en vente partielle ;
- audit et feedbacks cohérents avec la quantité.

### Exclus

- fusion automatique avec une pile existante différente lors d’un achat ;
- gestion d’un stock limité côté catalogue monde ;
- refonte du moteur de négociation ou du pricing unitaire.
