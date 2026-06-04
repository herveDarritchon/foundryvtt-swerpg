# Issue #549 — Audit Log : aligner les deltas de l'app sur les tokens `--color-success` / `--color-danger`

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/549  
**Domaine métier** : `audit-log`

## Goal

Supprimer les couleurs en dur utilisées par les deltas de l'application Audit Log et les aligner sur les tokens sémantiques du design system afin qu'un gain et une dépense aient la même lecture visuelle dans l'app et dans la carte de chat.

## Contexte utile

- L'issue provient de `documentation/audit/audit-log/audit-ui-ux-audit-log.md` (AUDIT-UI-02), qui relève une incohérence entre les deltas de l'app et ceux du chat.
- `module/applications/character-audit-log.mjs` expose déjà `deltaClass` avec les états `is-gain`, `is-spend` et `is-neutral` à partir des deltas XP/crédits.
- `templates/applications/character-audit-log.hbs` branche déjà `{{entry.deltaClass}}` sur `.audit-log-entry__delta` : le point d'entrée du correctif est donc essentiellement CSS.
- `styles/applications.less` contient aujourd'hui les deux couleurs en dur visées par l'issue : `#77d38a` pour les gains et `#f07a7a` pour les dépenses.

## Plan d’implémentation

### Étape 1 — Remplacer les couleurs hardcodées des deltas Audit Log par les tokens sémantiques

**Fichiers** : `styles/applications.less`

**What** :

- Remplacer `#77d38a` dans `.audit-log-entry__delta.is-gain` par `var(--color-success)`.
- Remplacer `#f07a7a` dans `.audit-log-entry__delta.is-spend` par `var(--color-danger)`.
- Conserver inchangés le sélecteur `.is-neutral`, la structure du composant et tout le câblage JS/Handlebars déjà en place.

**Résultat attendu** : les deltas positifs et négatifs de l'application utilisent les mêmes tokens sémantiques que le reste du système, sans couleur en dur dans les règles de delta Audit Log.

### Étape 2 — Verrouiller la non-régression du contrat UI et la validation attendue par l'issue

**Fichiers** : `tests/applications/character-audit-log.test.mjs` _(si un complément de couverture est jugé utile pendant l'implémentation)_

**What** :

- S'appuyer sur les tests existants autour de `buildAuditLogEntries()` qui couvrent déjà `deltaClass`, `formattedDelta` et les cas XP/crédits.
- Ajouter uniquement si nécessaire un test ciblé rappelant que les deltas positifs, négatifs et neutres continuent d'émettre les classes attendues côté app.
- Vérifier au moment de l'implémentation que `pnpm run build` reste conforme au critère d'acceptation de l'issue.

**Résultat attendu** : le correctif reste un changement de présentation ciblé, appuyé sur le contrat UI existant, avec un chemin de validation explicite.

## Périmètre / hors périmètre

### Inclus

- Tokenisation des couleurs de delta dans l'application Audit Log
- Alignement visuel app ↔ chat pour les états gain / dépense
- Validation ciblée du contrat de classes CSS existant

### Exclus

- Refonte visuelle plus large du journal d'audit
- Changement du modèle de données ou du template Audit Log
- Tokenisation d'autres couleurs en dur hors du bloc delta visé par l'issue
