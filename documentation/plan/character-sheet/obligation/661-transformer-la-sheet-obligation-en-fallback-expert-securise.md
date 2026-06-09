# Character Sheet — Transformer la sheet Obligation en fallback expert sécurisé

**Issue** : [#661 — Transformer la sheet Obligation en fallback expert sécurisé](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/661)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Faire de la sheet item `obligation` un fallback expert sûr et cohérent avec le parcours guidé des bonus de création : l’édition narrative reste simple, les options officielles sont privilégiées dès qu’une Obligation est marquée `isExtra`, et les combinaisons non officielles deviennent difficiles à produire par erreur tout en restant clairement signalées si elles existent déjà.

## Contexte utile

- L’issue `#658` a déjà déplacé le parcours nominal d’ajout de bonus vers un sélecteur guidé dans `Commitments` ; `#661` finalise le repositionnement de la fiche item comme filet de sécurité expert.
- `templates/sheets/partials/obligation-config.hbs` expose encore des champs libres `extraXp` / `extraCredits` dès qu’une Obligation est `isExtra`, ce qui laisse trop facilement produire une combinaison hors cadre officiel.
- `module/applications/sheets/obligation.mjs` est aujourd’hui quasi passif ; c’est le bon point d’entrée pour préparer un contexte de rendu qui distingue cas narratif, bonus officiel reconnu et état legacy/non officiel.
- L’ADR-0025 impose de ne pas enrichir le DataModel `obligation` : la sécurisation doit rester portée par le runtime, le rendu de sheet et la microcopy.

## Plan d'implémentation

### Étape 1 — Préparer un état de fallback expert dérivé des options officielles

**Fichiers** : `module/lib/obligations/obligation-bonus-calculator.mjs`, `module/applications/sheets/obligation.mjs`, `tests/lib/obligations/obligation-bonus-calculator.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- exposer, depuis le domaine pur ou un helper dédié déjà canonique, la résolution de la combinaison courante d’une Obligation `isExtra` vers une option officielle reconnue ou un état `legacy/non-officiel` ;
- préparer dans `ObligationSheet` un contexte séparant explicitement l’édition narrative simple, la configuration bonus officielle, et l’éventuelle alerte expert quand les valeurs existantes sortent du cadre officiel ;
- verrouiller par tests les trois cas de contrat : Obligation narrative standard, bonus officiel reconnu, combinaison non officielle existante affichée comme anomalie sans toucher au schéma.

**Résultat attendu** : avant même le rendu du template, la sheet sait si elle doit présenter un bonus officiel guidé ou un état expert à risque, sans ajouter de nouveau champ métier.

### Étape 2 — Recomposer la sheet pour privilégier les options officielles et encadrer la saisie libre

**Fichiers** : `templates/sheets/partials/obligation-config.hbs`, `module/applications/sheets/obligation.mjs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- conserver l’édition narrative (`description`, `value`) comme parcours simple et principal pour toute Obligation ;
- quand `isExtra === true`, remplacer l’exposition frontale des inputs libres par une présentation guidée des options officielles, puis reléguer toute modification manuelle derrière une affordance explicitement experte afin qu’une combinaison non officielle ne soit plus le chemin naturel ;
- afficher un warning localisé et visible quand l’item courant porte déjà une combinaison non officielle, avec microcopy indiquant que le sélecteur guidé reste le parcours recommandé ;
- compléter la couverture de tests de rendu/configuration pour vérifier la séparation narrative/bonus, la mise en avant des options officielles, et la signalisation claire des états legacy.

**Résultat attendu** : la fiche item n’encourage plus la saisie arbitraire de `extraXp` / `extraCredits`, tout en restant éditable de façon délibérée par un MJ ou un utilisateur avancé.

## Périmètre / hors périmètre

### Inclus

- fallback expert sécurisé dans la sheet item `obligation`
- priorité donnée aux options officielles pour les bonus de création
- signalisation localisée des combinaisons non officielles existantes
- tests ciblés de contrat de rendu et de configuration de la sheet

### Exclus

- ajout de nouveaux champs au DataModel `obligation` interdit par l’ADR-0025
- refonte globale du workflow Obligation hors fallback de la fiche item
- harmonisation transverse complète de toute la microcopy/accessibilité du workflow Obligation au-delà du périmètre de cette sheet
