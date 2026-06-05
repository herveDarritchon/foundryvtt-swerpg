# Issue #556 — Audit Log : repère d’unité XP vs crédits sur le delta

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/556  
**Domaine métier** : `audit-log`

## Goal

Rendre la colonne delta du journal d’audit immédiatement lisible en distinguant visuellement les variations d’XP des variations de crédits, sans changer la persistance des entrées, les familles de filtres ni l’export CSV.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-11** / **UX5** et décrit le problème actuel : `+50 XP` et `+25 cr` partagent le même traitement visuel dans la même colonne.
- `module/applications/character-audit-log.mjs` sait déjà distinguer les entrées crédits (`item.purchase`, `item.sale`) des entrées XP lors du calcul de `formattedDelta` ; le point d’extension naturel est donc le view-model des entrées, pas le stockage métier.
- `templates/applications/character-audit-log.hbs` rend aujourd’hui un unique `span.audit-log-entry__delta` avec `formattedDelta`, sans repère d’unité dédié.
- `tests/applications/character-audit-log.test.mjs` couvre déjà la différence de contenu textuel entre deltas XP et crédits ; c’est l’ancrage naturel pour verrouiller le nouveau contrat visuel/métier.

## Plan d’implémentation

### Étape 1 — Exposer explicitement l’unité du delta dans le view-model Audit Log

**Fichiers** : `module/applications/character-audit-log.mjs`, `lang/en.json`, `lang/fr.json`

**What** :

- Étendre les entrées préparées par `buildAuditLogEntries()` avec une métadonnée canonique d’unité (`xp` vs `credits`) et les dérivés nécessaires au rendu (`unitIcon`, `unitLabel`, classe CSS dédiée), au lieu de laisser le template déduire l’unité implicitement depuis la chaîne formatée.
- Conserver `formattedDelta` comme source de vérité textuelle (`+50 XP`, `-25 cr`) pour ne pas casser le contrat existant, puis ajouter seulement les repères complémentaires nécessaires au rendu.
- Prévoir un fallback explicite pour les cas neutres / inattendus afin que l’absence de repère n’introduise pas d’ambiguïté ou de régression silencieuse.

**Résultat attendu** : l’application fournit un contrat homogène permettant d’afficher un repère d’unité sans toucher au modèle d’audit persistant.

### Étape 2 — Rendre le repère d’unité dans la colonne delta sans perdre la lisibilité actuelle

**Fichiers** : `templates/applications/character-audit-log.hbs`, `styles/applications.less`

**What** :

- Afficher dans la zone delta une icône ou un marqueur visuel distinct pour les XP et pour les crédits, en complément du texte signé existant et sans supprimer le suffixe d’unité.
- Introduire les modificateurs de style minimaux pour que deux entrées de même variante métier mais d’unités différentes restent différenciables au premier coup d’œil, y compris en responsive.
- Conserver une sémantique accessible : l’icône décorative reste masquée aux technologies d’assistance si le libellé textuel suffit, sinon un libellé dédié doit être exposé via l’attribut approprié.

**Résultat attendu** : un achat et une dépense d’XP ne se ressemblent plus visuellement dans la colonne delta tout en conservant l’ergonomie existante du journal.

### Étape 3 — Verrouiller la distinction XP / crédits et les cas limites de rendu

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**What** :

- Ajouter des tests ciblés couvrant au minimum : entrée XP avec repère d’unité XP, entrée achat/vente avec repère crédits, conservation de `formattedDelta`, et maintien du comportement neutre pour delta nul.
- Vérrouiller le contrat exposé au template (métadonnées d’unité, classes CSS ou labels associés) plutôt qu’un simple détail cosmétique fragile.
- Prévoir dans la validation d’implémentation la vérification finale des critères de l’issue, dont le passage de `pnpm run build`, sans élargir le scope à d’autres améliorations UX du journal.

**Résultat attendu** : la distinction XP / crédits devient stable, testable et non régressive.

## Périmètre / hors périmètre

### Inclus

- Repère visuel distinct pour les deltas XP
- Repère visuel distinct pour les deltas crédits
- Ajustements limités au view-model, au template, aux styles et aux tests du journal d’audit

### Exclus

- Refonte du modèle métier d’audit ou de `flags.swerpg.logs`
- Changement de l’export CSV, des familles de filtres ou du tri/regroupement des entrées
- Ajout d’un panneau de détails, d’un nouveau filtre ou d’une refonte globale de la carte d’entrée
