# Character Sheet — Séparer Obligations narratives et bonus de création dans la feuille

**Issue** : [#657 — Séparer Obligations narratives et bonus de création dans la feuille](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/657)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Rendre l’onglet `Commitments` immédiatement lisible en séparant visuellement et fonctionnellement les Obligations narratives des bonus de création, afin que chaque parcours affiche seulement les informations et actions utiles à son intention métier.

## Contexte utile

- `templates/sheets/actor/character-commitments.hbs` affiche aujourd’hui une liste unique d’Obligations avec toggle `isExtra` et colonnes XP / crédits partagées, ce qui mélange les cas narratifs et les bonus de départ.
- `module/applications/sheets/character-sheet.mjs` prépare déjà `obligations`, `obligationPoints` et `obligationCreationState`, mais le contexte reste plat et ne distingue pas explicitement les deux sous-parcours d’usage.
- `templates/sheets/partials/obligation-config.hbs` différencie déjà `isExtra` et la section bonus de création ; la séparation manque surtout dans la feuille personnage, pas dans le schéma de base.
- La revue UX `documentation/review/character/obligations/ux-review-obligation-purchase-workflow.md` recommande explicitement de séparer la liste narrative et la zone des bonus de création, ainsi que de masquer les colonnes XP / crédits hors du périmètre bonus.

## Plan d'implémentation

### Étape 1 — Dériver deux collections métier distinctes pour l’onglet `Commitments`

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- faire évoluer la préparation du contexte pour exposer séparément les Obligations narratives (`isExtra === false`) et les bonus de création (`isExtra === true`), sans perdre le total global d’Obligation ni les résumés de campagne déjà dérivés ;
- conserver `obligationCreationState` comme source canonique du diagnostic bonus, mais le rattacher explicitement à la section bonus de création plutôt qu’à la liste complète ;
- verrouiller par tests le partitionnement, les compteurs/points affichés et la stabilité des données dérivées quand une Obligation change de statut ou porte une évolution de campagne.

**Résultat attendu** : la feuille dispose d’un contexte clair, orienté UI, où chaque section consomme uniquement les données pertinentes à son usage.

### Étape 2 — Recomposer la feuille en deux zones explicites : narratif vs bonus de création

**Fichiers** : `templates/sheets/actor/character-commitments.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- remplacer la liste mixte actuelle par une section dédiée aux Obligations narratives (nom, valeur, actions, CTA d’ajout) et une section dédiée aux bonus de création (résumé, plafond restant, lignes bonus, actions adaptées) ;
- retirer du rendu narratif le toggle `Extra` et les colonnes XP / crédits, réservés à la zone bonus de création pour supprimer le bruit visuel ;
- ajouter les libellés et aides EN/FR nécessaires pour expliciter la différence entre une Obligation narrative et un bonus de départ lié à l’Obligation.

**Résultat attendu** : un joueur comprend d’un coup d’œil où gérer ses Obligations de fiction et où consulter/configurer ses bonus de création.

### Étape 3 — Aligner les actions d’édition sur la séparation des parcours

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/partials/obligation-config.hbs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- conserver un parcours d’ajout centré sur l’Obligation narrative et introduire, pour les bonus de création, une action dédiée cohérente avec la nouvelle section au lieu de dépendre d’un toggle noyé dans une liste mixte ;
- clarifier dans la fiche d’item, lors de l’édition d’une Obligation `isExtra`, qu’elle appartient au sous-parcours des bonus de création et non à la narration courante ;
- compléter les tests ciblés sur les CTA, les actions disponibles par section et le rendu conditionnel des champs/indicateurs selon le type d’Obligation affiché.

**Résultat attendu** : chaque action de la feuille renforce la séparation métier au lieu de demander à l’utilisateur d’interpréter un même composant pour deux intentions différentes.

## Périmètre / hors périmètre

### Inclus

- séparation visuelle et fonctionnelle des Obligations narratives et des bonus de création dans l’onglet `Commitments`
- adaptation du contexte de sheet, des libellés i18n et des actions UI associées
- couverture de tests ciblée sur le partitionnement et les parcours distincts

### Exclus

- redéfinition des règles officielles de bonus de création déjà cadrées par l’issue `#646`
- modélisation approfondie des évolutions de campagne au-delà du rendu déjà prévu par l’issue `#649`
- refonte générale de la feuille personnage hors du périmètre Obligations
