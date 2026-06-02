# Issue #530 — Market UI : rendre l’état filtre actif visible, compter les résultats, réorganiser la toolbar

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/530  
**Domaine métier** : `market`

## Goal

Améliorer la lisibilité et le pilotage de la toolbar du Market en rendant immédiatement visibles les filtres actifs, en exposant un compteur de résultats filtrés, et en regroupant les contrôles par fonction, sans modifier la logique métier du catalogue.

## Contexte utile

- L’issue cible trois défauts UI précis : absence d’indicateur visuel sur les filtres non par défaut, absence de compteur de résultats, et toolbar trop dense sans regroupement explicite.
- `module/applications/market/market-application.mjs` est le point naturel pour calculer les valeurs par défaut, l’état actif des contrôles et les métriques `filtered / total` à exposer au template.
- `templates/market/market.hbs` porte déjà le markup de la toolbar ; c’est là que doivent être branchés les états visuels, les groupes visibles et le compteur.
- `styles/market.less` peut accueillir l’activation réelle de `.is-active` (ou équivalent), les séparateurs de groupes et le rendu responsive de la toolbar.
- `tests/applications/market/market-application.test.mjs` est l’ancrage logique pour verrouiller le contrat de contexte UI et l’absence de régression sur les filtres existants.

## Plan d’implémentation

### Étape 1 — Formaliser l’état UI de la toolbar et le compteur

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- Définir explicitement, pour chaque contrôle de filtre/tri, sa valeur par défaut et un indicateur dérivé de type `isActive` / `hasActiveFilters` exploitable par le template.
- Calculer dans le contexte de vue un compteur de résultats cohérent avec les filtres en cours (`filteredCount` / `totalCount`) pour la liste affichée.
- Verrouiller par tests ciblés le contrat de contexte : état inactif par défaut, activation après changement de filtre, cohérence du compteur après filtrage et après reset.

**Résultat attendu** : le template reçoit un contrat UI explicite ; l’état actif n’est plus implicite ni laissé à une CSS morte.

### Étape 2 — Afficher l’état actif et le compteur dans la toolbar

**Fichiers** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json` _(si un libellé dédié manque)_

**What** :

- Brancher les classes et attributs conditionnels sur les contrôles dont la valeur diffère du défaut afin de matérialiser visuellement les filtres actifs.
- Ajouter un compteur lisible dans la toolbar (ex. `12 / 45`) avec libellé accessible, sans dégrader les labels existants ni dépendre uniquement de `sr-only`.
- Conserver le comportement existant des actions de recherche, tri et reset ; seul le rendu de l’état UI évolue.

**Résultat attendu** : l’utilisateur voit immédiatement quels filtres sont actifs et combien de résultats restent affichés.

### Étape 3 — Regrouper visuellement la toolbar par fonction

**Fichiers** : `templates/market/market.hbs`, `styles/market.less`

**What** :

- Réorganiser le markup de la toolbar pour séparer clairement les zones `Filtrer` et `Trier`, avec labels visibles et/ou séparateurs adaptés.
- Activer le rendu visuel des contrôles actifs (`.is-active` ou équivalent) avec accent, focus-visible et compatibilité responsive en `flex-wrap`.
- Prévoir la validation finale par `pnpm run build` et une revue visuelle ciblée de la toolbar, sans ouvrir de refonte globale du Market.

**Résultat attendu** : la toolbar devient plus scannable, plus compréhensible et plus robuste visuellement, sans régression fonctionnelle sur les filtres existants.

## Périmètre / hors périmètre

### Inclus

- Indicateur visuel des filtres non par défaut
- Compteur de résultats filtrés dans la toolbar
- Regroupement visuel `Filtrer` / `Trier`
- Ajustements ciblés de contexte UI, template, styles et tests Market

### Exclus

- Ajout de nouveaux filtres métier ou nouveaux critères de tri
- Modification de la logique d’achat, de vente, de négociation ou de calcul de prix
- Refonte globale du design Market en dehors de la toolbar
