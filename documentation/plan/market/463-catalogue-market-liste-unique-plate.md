# Catalogue Market : liste unique plate (suppression du regroupement par type)

**Demande utilisateur** : ne plus séparer les items par type dans le Market, mais afficher une seule liste plate de tous les items en vente, avec la colonne Type et le filtre Type comme moyen principal de navigation.

---

## Contexte actuel

Le Market regroupe les items par type (`weapon`, `armor`, `gear`) dans des sections visuelles distinctes (`market-group`). Chaque groupe a son en-tête, sa propre table, et sa propre itération dans le template. Le tri s'applique par groupe et non globalement.

Le regroupement est implémenté dans :

- `module/applications/market/market-application.mjs` — étape 6 de `#prepareCatalog()`, lignes 345-363
- `templates/market/market.hbs` — boucle `{{#each catalog.groups}}`, lignes 116-178
- `styles/market.less` — `.market-group`, `.market-group__header`, `.market-group__title`, lignes 169-245
- `tests/applications/market/market-application.test.mjs` — nombreuses assertions sur `catalog.groups`

---

## Décisions UX

- La colonne `Type` reste purement textuelle (pas de badge, pas d'icône par ligne).
- Le filtre `Type` devient le moyen principal pour cibler une famille d'items.
- Pas de séparateur visuel par famille d'items.

---

## Étapes d'implémentation

### Étape 1 : Refondre la structure du catalogue côté application

**Fichier** : `module/applications/market/market-application.mjs`

**What** :

- Dans `#prepareCatalog()`, supprimer l'étape 6 (groupement par type) — lignes 345-363
- Retourner `catalog.items` comme liste plate triée
- Supprimer `catalog.groups` du type de retour
- Conserver les autres propriétés : `isEmpty`, `isFilteredEmpty`, `totalCount`, `filteredCount`, `activeMarketType`, `activeMarketDef`
- Mettre à jour le JSDoc du retour (ligne 291)
- Supprimer les imports/deps devenus inutiles si applicable (vérifier `PURCHASABLE_ITEM_TYPES` — encore utilisé par le filtre Type, donc à garder)

**Why** : la structure `groups` est devenue un artefact visuel qui empêche le tri global et ajoute de la complexité inutile.

### Étape 2 : Simplifier le template Market en un seul bloc

**Fichier** : `templates/market/market.hbs`

**What** :

- Remplacer la boucle `{{#each catalog.groups as |group|}}`...`{{/each}}` par :
  - un unique conteneur de table
  - une boucle directe `{{#each catalog.items as |entry|}}` dans un seul `<tbody>`
- Conserver les colonnes actuelles dans l'en-tête (`<th>`) : icône, nom, type, prix, rareté, restriction, achat
- Afficher `entry.itemType` localisé comme aujourd'hui dans la colonne Type

**Why** : une seule table = tri global, rendu plus simple, pas de duplication de structure.

### Étape 3 : Nettoyer le CSS

**Fichier** : `styles/market.less`

**What** :

- Supprimer ou rendre inutiles les blocs liés à `.market-group`, `.market-group__header`, `.market-group__title`
- Conserver le style de table existant `.market-group__table` (renommer éventuellement en `.market-catalog__table` si pertinent, mais pas nécessaire)
- Vérifier qu'aucun style de bordure/background ne dépend de l'encapsulation `.market-group`

**Why** : les séparateurs visuels par groupe n'ont plus de sens.

### Étape 4 : Recaler les tests sur une liste plate

**Fichier** : `tests/applications/market/market-application.test.mjs`

**What** :

- Remplacer les assertions basées sur `catalog.groups[0].items[0]` par `catalog.items[0]`
- Remplacer les assertions basées sur `catalog.groups.find(...)` par des vérifications directes
- Réécrire ou supprimer les tests qui vérifient le comportement de groupement :
  - `'groups eligible items by type'` → `'returns a flat item list with all types'`
  - `'does not include groups with zero items'` → à supprimer (plus de notion de groupe)
  - `'includes typeKey, label, icon in each group'` → à supprimer (la colonne Type est textuelle)
- Conserver les tests métier :
  - visibilité par marché
  - calcul de prix / `priceResult`
  - `canBuy` / `buyBlockedReason`
  - recherche texte
  - filtres type/source/restriction
  - tri
  - reset
  - achat
- Vérifier que le filtre Type fonctionne toujours sur la liste plate

**Why** : les tests doivent valider le nouveau contrat sans régresser les fonctionnalités métier.

---

## Comportements attendus après changement

- Le Market affiche une **seule table** contenant tous les items éligibles
- Le **tri** (nom/prix/rareté) s'applique globalement à toute la liste
- Le **filtre Type** permet d'isoler rapidement `weapon`, `armor` ou `gear`
- La **recherche texte** s'applique sur la liste unique
- Les **achats**, la **visibilité par marché** et les **états vides** ne changent pas

---

## Fichiers modifiés

- `module/applications/market/market-application.mjs`
- `templates/market/market.hbs`
- `styles/market.less`
- `tests/applications/market/market-application.test.mjs`

---

## Tradeoffs

**Perdu** : séparateurs visuels par famille d'items, navigation par groupe.

**Gagné** :

- lecture plus compacte
- tri global cohérent
- UI plus simple
- moins de duplication structurelle template/JS
- suppression d'une étape de calcul dans le pipeline catalogue

**Risque** : changement de contrat du contexte `catalog` (suppression de `groups`). Aucun autre consommateur applicatif connu. Propre.
