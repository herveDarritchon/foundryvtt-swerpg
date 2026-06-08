# Character Sheet — Ajouter un sélecteur guidé pour prendre un bonus officiel d’Obligation

**Issue** : [#658 — Ajouter un sélecteur guidé pour prendre un bonus officiel d’Obligation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/658)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Permettre au joueur de prendre un bonus officiel d’Obligation depuis l’onglet `Commitments` via un parcours guidé, contraint et immédiatement compréhensible, sans devoir éditer manuellement `extraXp` / `extraCredits` dans une fiche item séparée.

## Contexte utile

- `documentation/plan/character-sheet/obligation/646-appliquer-les-regles-officielles-de-bonus-de-creation-lies-aux-obligations.md` a déjà cadré les options officielles et le diagnostic canonique de conformité.
- `documentation/plan/character-sheet/obligation/657-separer-obligations-narratives-et-bonus-de-creation-dans-la-feuille.md` a déjà séparé visuellement les Obligations narratives et les bonus de création dans l’onglet `Commitments`.
- `templates/sheets/partials/obligation-config.hbs` affiche encore des champs libres `extraXp` / `extraCredits`, accompagnés d’une simple liste statique des options officielles.
- `module/models/character.mjs` dérive déjà `obligationCreationState` avec les options reconnues, le plafond restant et les erreurs, ce qui fournit le socle métier nécessaire pour désactiver les choix impossibles au lieu de les signaler après coup.
- La revue UX `documentation/review/character/obligations/ux-review-obligation-purchase-workflow.md` recommande explicitement un sélecteur guidé avec options désactivées quand elles sont déjà prises ou hors plafond.

## Plan d'implémentation

### Étape 1 — Exposer des options officielles prêtes à consommer côté UI

**Fichiers** : `module/lib/obligations/obligation-bonus-calculator.mjs`, `module/models/character.mjs`, `module/applications/sheets/character-sheet.mjs`, `tests/lib/obligations/obligation-bonus-calculator.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- partir de la source canonique des bonus officiels pour produire une liste d’options UI homogène (`id`, bonus XP/crédits, coût en Obligation, libellé, état de disponibilité) au lieu de laisser les templates reconstituer les règles ;
- enrichir le contexte de feuille avec les métadonnées nécessaires au sélecteur guidé : option déjà prise, option bloquée par le plafond restant, raison de désactivation, prévisualisation d’impact sur le total d’Obligation ;
- verrouiller par tests les cas clés de disponibilité : option libre, doublon interdit, option au-delà du plafond, combinaison valide restant sélectionnable.

**Résultat attendu** : la UI dispose d’un catalogue d’options officielles déjà annoté par le runtime, sans recalcul métier ad hoc dans les templates.

### Étape 2 — Remplacer l’ajout générique de bonus par un parcours guidé depuis `Commitments`

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `module/applications/sheets/obligation.mjs` ou nouvelle application/dialog dédiée, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- brancher l’action `creationBonusObligationCreate` sur un sélecteur guidé qui ne propose que les bonus officiels, au lieu d’ouvrir directement une Obligation extra vierge ;
- afficher pour chaque option son gain, son coût en Obligation et son impact sur le total/plafond, avec désactivation explicite des choix déjà consommés ou impossibles ;
- à la confirmation, créer ou préremplir l’Obligation bonus avec les valeurs officielles exactes (`isExtra`, `value`, `extraXp`, `extraCredits`) pour éviter toute saisie libre sur le chemin nominal.

**Résultat attendu** : prendre un bonus officiel devient une action unique, guidée et sûre depuis la fiche personnage.

### Étape 3 — Repositionner la fiche d’Obligation en fallback expert et finaliser la couverture UX

**Fichiers** : `templates/sheets/partials/obligation-config.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/obligation-sheet.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- faire évoluer la fiche item `obligation` pour qu’un bonus de création édité manuellement renvoie vers les options officielles guidées ou, à minima, n’encourage plus la saisie arbitraire de montants ;
- ajouter les libellés, aides et raisons d’indisponibilité EN/FR nécessaires au sélecteur et à son fallback d’édition ;
- compléter les tests ciblés sur le rendu du sélecteur, les états disabled, le payload créé/prérempli et la lisibilité du fallback expert.

**Résultat attendu** : le flux guidé devient le parcours standard, tandis que la fiche item reste cohérente et ne réintroduit pas silencieusement des combinaisons invalides.

## Périmètre / hors périmètre

### Inclus

- sélecteur guidé pour choisir un bonus officiel d’Obligation depuis l’onglet `Commitments`
- désactivation préventive des options déjà prises ou hors plafond
- harmonisation du fallback d’édition et des libellés i18n autour du nouveau parcours

### Exclus

- redéfinition des règles officielles des bonus d’Obligation déjà cadrées par l’issue `#646`
- refonte générale du domaine Obligation hors achat de bonus de création
- automatisation d’autres parcours de création de personnage non liés aux Obligations
