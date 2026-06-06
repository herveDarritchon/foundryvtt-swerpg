# Issue #574 — `applications.less` : remplacer les couleurs brutes par des design tokens (ADR-0022)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/574  
**Domaine métier** : `core/refactor`

## Goal

Mettre `styles/applications.less` en conformité avec ADR-0022 en remplaçant les couleurs codées en dur par des design tokens, sans changer la structure ni le comportement des applications V2 concernées.

## Contexte utile

- ADR-0022 cite explicitement `applications.less` parmi les principaux foyers de dette, avec **~85 occurrences** de couleurs brutes.
- Les occurrences restantes sont surtout concentrées dans deux zones : la jauge de progression de l’import OggDude et l’application `specialization-tree-app` (header, sidebar, cartes, viewport, légende, toolbar, panneau de détail).
- La zone `character-audit-log` est déjà largement tokenisée ; les rares littéraux encore présents y sont documentés comme exceptions ponctuelles `// tokens-allow-raw`.
- `styles/variables.less` expose déjà une base exploitable (`--color-frame-*`, `--color-glow-*`, `--color-success-*`, `--color-danger-*`, `--color-warning-*`, `--color-primary/secondary/tertiary`) ; n’ajouter de nouveaux tokens que s’ils sont réellement réutilisables.

## Plan d’implémentation

### Étape 1 — Cartographier les littéraux restants par surface applicative

**Fichiers** : `styles/applications.less`, `styles/variables.less`

**What** :

- relever les couleurs brutes, gradients et fallbacks non conformes encore présents dans `applications.less` ;
- regrouper les remplacements par rôle visuel : progression importeur, surfaces holo de la specialization tree, états success/danger, textes, bordures, overlays et ombres ;
- distinguer explicitement les exceptions ADR déjà justifiées de la dette réellement à résorber.

**Résultat attendu** : un mapping clair couvre toutes les occurrences à traiter sans rouvrir les blocs déjà conformes.

### Étape 2 — Compléter la surface de tokens partagés strictement nécessaire

**Fichiers** : `styles/variables.less` _(uniquement si des tokens manquent réellement)_

**What** :

- remplacer les fallbacks du type `var(..., rgba(...))` / `var(..., #hex)` par de vrais tokens existants ou nouvellement définis ;
- ajouter seulement les tokens sémantiques ou alpha récurrents nécessaires aux surfaces holo, aux bordures actives et aux états success/danger de `applications.less` ;
- conserver un nommage cohérent avec ADR-0022 (`--color-*-NN`, tokens de texte sémantiques, `color-mix(...)` si l’héritage de thème doit rester dynamique).

**Résultat attendu** : `applications.less` dispose d’une surface de tokens suffisante sans introduire de palette ad hoc locale au fichier.

### Étape 3 — Remplacer les couleurs brutes dans `applications.less`

**Fichiers** : `styles/applications.less`

**What** :

- tokeniser la jauge de progression OggDude (fond, bordure, gradient de barre) ;
- tokeniser les surfaces de la `specialization-tree-app` : header, meta pills, sidebar, summary cards, états `is-available` / `is-active`, viewport, detail panel, CTA, legend, toolbar et empty states ;
- convertir textes, bordures, gradients, radial backgrounds, box-shadows et swatches d’état pour qu’ils reposent sur des `var(--color-*)` réels plutôt que sur des hex/rgb en dur.

**Résultat attendu** : `styles/applications.less` n’embarque plus de couleurs de marque en dur hors exceptions ADR explicitement documentées.

### Étape 4 — Préparer la validation ciblée ADR-0022

**Fichiers** : aucun nouveau fichier requis

**What** :

- prévoir une validation par `pnpm run style:tokens` puis `pnpm run style:tokens:strict` sur les fichiers touchés ;
- prévoir une revue visuelle des deux surfaces critiques : progression d’import OggDude et specialization tree app ;
- vérifier que les contrastes et les thèmes Jedi/Sith restent cohérents après tokenisation.

**Résultat attendu** : la conformité ADR-0022 de `applications.less` devient vérifiable sans élargir le chantier aux autres feuilles de style.

## Périmètre / hors périmètre

### Inclus

- Remédiation couleur de `styles/applications.less`
- Ajout minimal de tokens partagés dans `styles/variables.less` si nécessaire
- Suppression des fallbacks couleur non conformes dans `applications.less`

### Exclus

- Modifications JS, templates Handlebars ou logique applicative
- Refonte UX/fonctionnelle de l’importeur OggDude, de l’Audit Log ou de la specialization tree
- Remédiation d’autres feuilles (`actor.less`, `dice.less`, `item.less`, `chat.less`, etc.)
