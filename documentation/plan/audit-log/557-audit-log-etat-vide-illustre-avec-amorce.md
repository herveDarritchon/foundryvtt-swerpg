# Issue #557 — Audit Log : état vide illustré avec amorce

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/557  
**Domaine métier** : `audit-log`

## Goal

Rendre l’état vide natif du journal d’audit plus guidant et plus incarné avec un bloc illustré et une amorce explicite, sans toucher à l’écriture des entrées, aux filtres, ni à l’export CSV.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-12** / **UX8** et documente l’état actuel : `audit-log__empty` n’est aujourd’hui qu’un texte centré, sans illustration ni phrase d’accompagnement.
- Les plans `552`, `555` et `556` ont déjà consolidé les variantes d’état vide filtré / famille vide et le view-model du journal ; l’issue #557 doit donc enrichir l’état vide principal sans réouvrir ces autres cas.
- `templates/applications/character-audit-log.hbs` et `styles/applications.less` sont les points d’ancrage naturels du rendu illustré, avec `module/applications/character-audit-log.mjs` pour exposer au template un contrat d’état vide explicite.
- `tests/applications/character-audit-log.test.mjs` est l’ancrage naturel pour verrouiller la distinction entre journal réellement vide et résultats vides dus aux filtres.

## Plan d’implémentation

### Étape 1 — Formaliser un contrat d’état vide illustrable côté Audit Log

**Fichiers** : `module/applications/character-audit-log.mjs`, `lang/en.json`, `lang/fr.json`

**What** :

- Exposer au template un objet d’état vide canonique (`kind`, `title`, `hint`, `icon`, variantes éventuelles) au lieu de laisser Handlebars déduire le rendu depuis de simples booléens dispersés.
- Réserver ce contrat enrichi au cas “journal réellement vide” tout en conservant des états distincts pour “aucun résultat” après filtres/recherche et pour “famille vide” déjà cadrés par les issues précédentes.
- Ajouter les clés i18n minimales pour un titre et une phrase d’amorce localisés, sans hardcoder de microcopy dans le template.

**Résultat attendu** : le template reçoit une source de vérité claire pour afficher un empty state illustré sans mélanger les différents cas de vide du journal.

### Étape 2 — Remplacer le texte vide brut par un bloc illustré avec amorce

**Fichiers** : `templates/applications/character-audit-log.hbs`, `styles/applications.less`

**What** :

- Remplacer le rendu minimal actuel par un bloc structuré d’état vide comprenant au moins une illustration/pictogramme, un titre et une phrase guide du type « Les évolutions du personnage apparaîtront ici ».
- Garder le rendu cohérent avec le langage visuel déjà posé sur l’Audit Log (tokens, hiérarchie, contraste, responsive) sans lancer de refonte plus large de la carte d’entrée ou des toolbars.
- Veiller à l’accessibilité : illustration décorative masquée si nécessaire, texte réellement utile exposé aux technologies d’assistance, et absence de dépendance à la couleur seule.

**Résultat attendu** : un journal vide n’apparaît plus comme une zone morte, mais comme un état d’attente compréhensible et intentionnel.

### Étape 3 — Verrouiller le rendu et la non-régression des autres états vides

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**What** :

- Ajouter des tests ciblés couvrant au minimum : journal réellement vide avec contrat illustré complet, présence de la microcopy d’amorce, et maintien des messages dédiés pour les cas “aucun résultat” / “famille vide”.
- Vérrouiller le contrat exposé au template (objet `emptyState` ou équivalent) plutôt qu’un simple détail cosmétique fragile.
- Confirmer que l’évolution reste purement UI : aucune modification de persistance `flags.swerpg.logs`, de filtres métier ou d’export CSV.

**Résultat attendu** : l’état vide illustré devient stable, testable et isolé des autres comportements déjà livrés sur le journal.

## Périmètre / hors périmètre

### Inclus

- Bloc d’état vide illustré pour un journal réellement vide
- Phrase d’amorce localisée
- Ajustements limités au view-model, au template, aux styles et aux tests Audit Log

### Exclus

- Refonte des états vides filtrés ou des familles de filtres
- Changement du stockage des entrées, de l’export CSV ou du pipeline d’écriture d’audit
- Ajout d’un panneau de détails, de nouveaux filtres ou d’une refonte générale de l’application
