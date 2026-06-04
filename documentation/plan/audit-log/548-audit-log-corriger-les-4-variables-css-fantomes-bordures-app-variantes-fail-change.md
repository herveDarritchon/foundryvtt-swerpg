# Plan d'implémentation — Audit Log : corriger les 4 variables CSS fantômes

**Issue** : [#548 — Audit Log — Corriger les 4 variables CSS fantômes (bordures app + variantes fail/change)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/548)
**Source** : `documentation/audit/audit-log/audit-ui-ux-audit-log.md` (AUDIT-UI-01, DA1, UX10)

## Objectif

Remplacer les 4 variables CSS non définies utilisées par l'UI Audit Log afin de restaurer les bordures visibles dans l'application et les variantes visuelles `fail` / `change` des cartes de chat, sans changer la structure HTML ni le comportement métier.

## Remplacements attendus

- `--color-cool-4` → `--color-frame`
- `--color-text-dark-secondary` → `--color-secondary`
- `--color-error` → `--color-danger`
- `--color-underline` → `--color-frame`

## Périmètre

- `styles/applications.less`
- `styles/chat.less`
- Aucun changement JS, template, i18n ou logique d'audit log

## Étapes d'implémentation

### 1. Corriger les bordures de l'application Audit Log

**Fichiers pressentis** : `styles/applications.less`

- Remplacer `--color-cool-4` par le token canonique `--color-frame` sur les bordures de l'en-tête et des cartes d'entrée du journal.
- Vérifier que le correctif reste limité au bloc `.swerpg.application.character-audit-log`.
- Conserver les autres couleurs et ombres existantes pour éviter tout élargissement de scope visuel.

### 2. Corriger les variantes chat `fail` et `change`

**Fichiers pressentis** : `styles/chat.less`

- Remplacer `--color-error` par `--color-danger` pour la variante `audit-entry--fail` afin de rétablir un rouge visible.
- Remplacer `--color-text-dark-secondary` par `--color-secondary` et `--color-underline` par `--color-frame` pour la variante `audit-entry--change`.
- Appliquer le correctif uniquement aux règles de variantes audit log concernées pour ne pas modifier les autres cartes de chat.

### 3. Préparer la validation ciblée

**Vérifications attendues à l'implémentation** : audit visuel local de l'app Audit Log et des cartes chat, puis `pnpm run build`.

- Confirmer que les bordures des entrées du journal sont de nouveau visibles.
- Confirmer que `fail` affiche une couleur d'échec lisible et que `change` retrouve sa couleur de texte et sa bordure.
- Vérifier qu'aucune variable CSS non définie ne subsiste dans ces règles après remplacement.

## Résultat attendu

- Les cartes d'entrée du journal d'audit affichent des bordures visibles.
- La variante chat `fail` utilise un rouge visible basé sur `--color-danger`.
- La variante chat `change` retrouve une bordure et une couleur de texte correctes.
- Le correctif reste strictement limité aux tokens CSS manquants signalés par l'issue.
