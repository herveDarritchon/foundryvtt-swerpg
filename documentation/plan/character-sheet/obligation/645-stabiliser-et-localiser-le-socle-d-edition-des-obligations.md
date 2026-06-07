# Character Sheet — Stabiliser et localiser le socle d'édition des Obligations

**Issue** : [#645 — Stabiliser et localiser le socle d'édition des Obligations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/645)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Nettoyer le socle technique actuel des Obligations avant d'étendre la fonctionnalité, afin de garantir une implémentation canonique unique du calcul de bonus, une UI entièrement localisée EN/FR et un flux d'édition plus robuste côté fiche personnage et fiche item.

## Contexte utile

- `module/lib/obligations/obligation-bonus-calculator.mjs` porte déjà l'implémentation canonique, tandis que `module/lib/credits/obligation-bonus-calculator.mjs` ne fait qu'un relais devenu mort.
- `module/models/obligation.mjs` expose bien `value`, `isExtra`, `extraXp` et `extraCredits`, mais conserve une JSDoc incorrecte et un `validateJoint()` vide à clarifier.
- `templates/sheets/actor/character-commitments.hbs` contient encore plusieurs chaînes utilisateur codées en dur (`Obligations`, `name`, `extra`, `actions`, tooltips, alt text).
- `templates/sheets/partials/obligation-config.hbs` n'expose aujourd'hui que `value`, `extraXp` et `extraCredits`, sans contrôle explicite de `isExtra`.
- `lang/en.json` contient déjà `OBLIGATION.FIELDS.*`, alors que `lang/fr.json` ne porte pas encore le bloc équivalent.
- Le handler `CharacterSheet.#onToggleObligationExtraState` suppose implicitement que l'élément DOM et l'item existent, ce qui ouvre la porte à une NPE évitable.

## Plan d'implémentation

### Étape 1 — Supprimer les reliquats morts et réaffirmer le contrat canonique Obligation

**Fichiers** : `module/lib/credits/obligation-bonus-calculator.mjs`, `module/lib/credits/index.mjs`, `module/models/obligation.mjs`, `tests/lib/credits/obligation-bonus-calculator.test.mjs`, `tests/lib/obligations/obligation-bonus-calculator.test.mjs`, `tests/models/obligation.test.mjs`

**What** :

- supprimer le wrapper mort dans `lib/credits/` et le barrel associé pour que le calculateur d'Obligation ne vive plus qu'à un seul endroit ;
- corriger la JSDoc du modèle `SwerpgObligation` et expliciter le statut de `validateJoint()` (no-op assumé ou garde minimale documentée) pour éviter l'ambiguïté ;
- supprimer le test redondant côté `tests/lib/credits/` et compléter la couverture canonique côté `tests/lib/obligations/` / `tests/models/` pour verrouiller le contrat réel.

**Résultat attendu** : le domaine Obligation n'a plus qu'une seule implémentation métier de référence et ses contrats de modèle/calcul sont explicites.

### Étape 2 — Compléter l'i18n Obligation et retirer les chaînes codées en dur de l'UI

**Fichiers** : `lang/en.json`, `lang/fr.json`, `templates/sheets/actor/character-commitments.hbs`, `templates/sheets/partials/obligation-config.hbs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- ajouter dans `lang/fr.json` le bloc `OBLIGATION.FIELDS.*` manquant en miroir du contrat EN existant ;
- introduire les clés `SWERPG...` nécessaires pour tous les libellés visibles encore hardcodés dans `character-commitments.hbs` et `obligation-config.hbs` ;
- faire consommer systématiquement ces clés par les templates, y compris pour les titres de colonnes, légendes, tooltips et textes d'action.

**Résultat attendu** : aucune chaîne utilisateur du périmètre Obligation n'est laissée en dur, et le rendu EN/FR repose sur un contrat i18n complet et symétrique.

### Étape 3 — Rendre le flux d'édition des Obligations robuste et cohérent autour de `isExtra`

**Fichiers** : `templates/sheets/partials/obligation-config.hbs`, `module/applications/sheets/character-sheet.mjs`, `module/applications/sheets/obligation.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- exposer explicitement le champ `isExtra` dans la configuration de l'item Obligation et conditionner l'affichage/activation des champs `extraXp` et `extraCredits` à cet état ;
- ajouter un guard null-safe dans `#onToggleObligationExtraState` pour quitter proprement si le conteneur DOM ou l'item ciblé sont introuvables ;
- verrouiller par tests ciblés le toggle depuis la fiche personnage et le rendu attendu de la fiche item quand une Obligation est normale vs extra.

**Résultat attendu** : le statut `isExtra` est éditable et compréhensible dans l'UI, et le toggle côté feuille personnage ne casse plus sur des références manquantes.

## Périmètre / hors périmètre

### Inclus

- nettoyage du socle technique Obligation
- complétude i18n EN/FR du périmètre Obligation
- robustesse du toggle `isExtra` et de la configuration d'item associée

### Exclus

- implémentation des règles métier officielles de bonus de création de l'issue `#646`
- enrichissement métier détaillé d'une Obligation individuelle de l'issue `#647`
- refonte visuelle large de l'onglet `Commitments` hors besoins directs de localisation et d'édition
