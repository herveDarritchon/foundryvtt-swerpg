# Character Sheet — Refondre le bloc CREDITS en synthèse compacte et cohérente

**Issue** : [#632 — Refondre le bloc CREDITS en synthèse compacte et cohérente](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/632)

## Objectif

Transformer le bloc `CREDITS` de l’onglet `Inventory` en synthèse visuelle plus compacte, mieux hiérarchisée et cohérente avec le reste de la feuille personnage, sans modifier la logique métier de calcul du budget.

## Décisions de cadrage

- Le périmètre est limité à la présentation du budget crédits dans l’onglet inventaire de la feuille personnage.
- La source de vérité métier reste `context.creditBudget` déjà préparée par la sheet ; la refonte vise le contrat d’affichage, pas les calculs de crédits.
- La nouvelle synthèse doit reprendre le minimum d’informations utiles au premier regard (`available`, `totalBudget`, `totalSpent`, état over-budget) et éviter le pavé vertical actuel.
- Le rendu doit réutiliser des patterns UI déjà cohérents dans le système quand c’est pertinent (notamment la mise en valeur compacte des crédits visible côté Market), tout en respectant ADR-0022 sur les design tokens.

## Étapes d’implémentation

### 1. Stabiliser le contrat d’affichage compact du budget inventaire

**Fichiers cibles** : `module/applications/sheets/character-sheet.mjs` _(ou la couche de préparation de contexte la plus centrale déjà responsable de `creditBudget` / `creditsInfo`)_ , `tests/applications/sheets/character-sheet*.test.*` _(ou test de contexte inventory équivalent)_

**What**

- définir quelles valeurs du budget doivent alimenter la synthèse compacte et sous quelle hiérarchie visuelle (montant disponible mis en avant, total budget / dépensé en secondaires, warning explicite si dépassement) ;
- si nécessaire, préparer un sous-objet de présentation dédié au template inventaire pour éviter toute logique conditionnelle lourde dans le Handlebars ;
- verrouiller le contrat minimal de contexte pour les deux états critiques : budget normal et budget dépassé.

**Validation visée** : le template inventaire reçoit un contrat d’affichage clair, stable et suffisant pour rendre une synthèse compacte sans recalcul métier côté UI.

### 2. Remplacer le bloc vertical actuel par une synthèse compacte cohérente dans l’inventaire

**Fichiers cibles** : `templates/sheets/actor/inventory.hbs`, `styles/actor.less`

**What**

- repositionner le bloc `CREDITS` dans une zone plus pertinente de l’onglet inventaire afin de combler l’espace mort et de l’intégrer au flux visuel de l’écran ;
- remplacer la liste de lignes actuelle par un rendu plus dense et lisible, avec hiérarchie claire entre montant principal, détails secondaires et alerte `over-budget` ;
- harmoniser la typographie, les espacements, les séparateurs et l’iconographie avec les autres sections de la feuille et avec le pattern compact déjà utilisé pour les crédits côté Market ;
- appliquer uniquement des tokens de design existants ou explicitement ajoutés au système, sans couleurs brutes ni style ad hoc.

**Validation visée** : l’onglet inventaire affiche un bloc crédits plus compact, mieux intégré et immédiatement lisible, sans régression sur l’état d’alerte budget dépassé.

### 3. Ajouter une non-régression ciblée sur le rendu des états budget

**Fichiers cibles** : tests de rendu/contexte de la feuille personnage ou de l’inventaire selon la couverture existante.

**What**

- couvrir au moins un cas nominal où la synthèse expose correctement disponible / budget / dépensé ;
- couvrir un cas `over-budget` vérifiant la présence du style/flag d’alerte attendu ;
- vérifier que la refonte reste purement UI et n’altère pas les valeurs métier remontées par `creditBudget`.

**Validation visée** : la nouvelle synthèse compacte est documentée par des cas de non-régression centrés sur les deux états de budget visibles.

## Résultat attendu

- le bloc `CREDITS` de l’inventaire n’apparaît plus comme un pavé vertical brut et isolé ;
- la feuille personnage expose une synthèse crédits compacte, cohérente et plus valorisée visuellement ;
- le comportement normal et l’état `over-budget` sont explicitement couverts par une non-régression ciblée.
