# Issue #551 — Audit Log : icône par famille, `aria-pressed` sur les filtres, glyphe par variante (a11y)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/551  
**Domaine métier** : `audit-log`

## Goal

Rendre le journal d’audit plus scannable et plus accessible en ajoutant un repère visuel par famille sur les filtres et les lignes, en exposant l’état actif des filtres via `aria-pressed`, et en complétant les variantes `add` / `remove` / `gain` / `change` / `fail` par un glyphe non basé uniquement sur la couleur, sans changer le modèle de données, le tri, le filtrage ni l’export CSV.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-04** (icône par famille/type) et **AUDIT-UI-09** (`aria-pressed` + glyphe par variante).
- `buildAuditLogEntries()` dans `module/applications/character-audit-log.mjs` expose déjà `family`, `familyLabel`, `variant`, `eventLabel`, `description` et les deltas : le besoin est surtout un enrichissement de view-model et de rendu.
- `_prepareContext()` construit aujourd’hui des filtres limités à `id`, `label`, `cssClass` ; `templates/applications/character-audit-log.hbs` rend encore des boutons texte seul sans `aria-pressed`.
- `templates/chat/audit-entry.hbs` et les contextes d’audit existants reposent encore principalement sur la couleur pour exprimer les variantes ; `tests/applications/character-audit-log.test.mjs` et `tests/utils/audit-log.test.mjs` sont les ancrages de non-régression.

## Plan d’implémentation

### Étape 1 — Canoniser les métadonnées UI audit pour les familles et les variantes

**Fichiers** : `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs`, `lang/en.json`, `lang/fr.json` _(si un libellé accessible dédié est requis)_

**What** :

- Définir une table canonique `family -> icon` couvrant au minimum `all`, `skills`, `talents`, `xp`, `characteristics`, `details`, `advancement`, `purchases`, `sales`, réutilisable dans les filtres et sur les lignes.
- Définir une table canonique `variant -> glyph` pour `add`, `remove`, `gain`, `change`, `fail`, afin d’éviter une dérive entre l’application Audit Log et la carte de chat.
- Enrichir les view-models existants avec les métadonnées nécessaires (`iconClass`/`iconGlyph`, `variantGlyph`, `isPressed` ou équivalent, éventuel texte d’assistance) sans toucher au mapping métier, au tri anté-chronologique, au filtrage par famille ni à l’export CSV.

**Résultat attendu** : l’application et le chat partagent une sémantique visuelle canonique pour les familles et variantes, avec un état actif de filtre explicitement disponible dans le contexte.

### Étape 2 — Brancher le markup accessible sur les filtres et les entrées Audit Log

**Fichiers** : `templates/applications/character-audit-log.hbs`, `templates/chat/audit-entry.hbs`

**What** :

- Rendre chaque bouton filtre avec icône + libellé visible et `aria-pressed="true|false"`, tout en conservant le câblage `data-action='setFilter'` / `data-filter` existant.
- Afficher le repère de famille sur chaque ligne de l’application (dans l’en-tête/type ou un slot adjacent) sans casser la troncature, la lisibilité ni le responsive actuel.
- Ajouter un glyphe de variante dans l’application et la carte chat pour compléter la couleur ; le rendre décoratif (`aria-hidden`) si le texte voisin suffit déjà, sinon prévoir un libellé accessible localisé.

**Résultat attendu** : les filtres annoncent correctement leur état actif aux technologies d’assistance et les entrées restent interprétables sans dépendre uniquement de la couleur.

### Étape 3 — Ajuster les styles et verrouiller la non-régression UI / a11y

**Fichiers** : `styles/applications.less`, `styles/chat.less`, `tests/applications/character-audit-log.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- Styliser les icônes et glyphes dans l’app et le chat en réutilisant les tokens existants, sans casser l’état `is-active`, les variantes visuelles déjà livrées ni le layout mobile.
- Étendre les tests de contexte pour verrouiller au minimum : la métadonnée famille sur des entrées représentatives (`skill.train`, `item.sale`), l’état actif accessible du filtre courant, et la présence d’un glyphe de variante sur des cas `add`, `gain`, `change`, `fail`.
- Prévoir une validation visuelle ciblée pendant l’implémentation sur la barre de filtres, la liste Audit Log et les cartes chat correspondantes.

**Résultat attendu** : le gain UI/a11y reste ciblé sur Audit Log, couvert par les contrats existants et sans régression sur le comportement de filtre ou le rendu chat.

## Périmètre / hors périmètre

### Inclus

- Icône par famille sur les boutons filtres et sur les lignes Audit Log
- `aria-pressed` sur les filtres
- Glyphe par variante dans le langage visuel Audit Log

### Exclus

- Recherche texte, filtre temporel, regroupement par date
- Changement du modèle métier d’audit log ou de l’export CSV
- Refonte d’autres écrans hors Audit Log
