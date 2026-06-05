# Issue #555 — Audit Log : compteur ou désactivation des familles de filtres vides

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/555  
**Domaine métier** : `audit-log`

## Goal

Rendre les filtres de familles du journal d’audit auto-explicatifs en signalant clairement les familles sans entrée, tout en conservant la consultation locale existante, le stockage des entrées et l’export CSV inchangés.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-10** / **UX6**.
- `module/applications/character-audit-log.mjs` calcule déjà les entrées affichées, les filtres actifs et les compteurs globaux (`totalCount`, `filteredCount`), mais les boutons de familles n’exposent aujourd’hui ni volume ni état vide.
- `templates/applications/character-audit-log.hbs` distingue déjà journal vide vs résultat filtré vide ; le besoin ajoute un troisième cas : famille sélectionnée sans entrée correspondante.
- `tests/applications/character-audit-log.test.mjs` est l’ancrage naturel pour verrouiller les compteurs par famille et l’état vide informatif.

## Plan d’implémentation

### Étape 1 — Canoniser les compteurs et états de disponibilité par famille dans le view-model

**Fichiers** : `module/applications/character-audit-log.mjs`

**What** :

- Étendre la préparation du contexte pour calculer, pour chaque famille, un `count` et un `isEmpty` à partir du corpus déjà filtré par recherche texte/plage de dates, mais avant application du filtre de famille actif.
- Exposer une métadonnée homogène par bouton (`id`, `label`, `icon`, `count`, `isEmpty`, `isPressed`, `cssClass`) afin que le template n’ait pas à recalculer la disponibilité métier.
- Définir explicitement le contrat d’état vide de famille : une famille vide reste identifiable et sa sélection doit produire un état informatif dédié, pas une liste vide silencieuse.

**Résultat attendu** : l’application dispose d’une source de vérité unique pour les compteurs par famille et pour la distinction entre vide global, vide filtré et vide de famille.

### Étape 2 — Brancher les compteurs/états vides sur la toolbar et le rendu Audit Log

**Fichiers** : `templates/applications/character-audit-log.hbs`, `styles/applications.less`, `lang/en.json`, `lang/fr.json`

**What** :

- Afficher sur chaque bouton de famille un compteur lisible (badge ou suffixe) et une atténuation visuelle des familles vides sans masquer la famille ni casser la navigation existante.
- Prévoir une sémantique accessible cohérente (`aria-label`, état visuel, éventuel `aria-disabled`) sans utiliser un `disabled` HTML dur si cela empêche de satisfaire le critère “cliquer une famille vide affiche un message informatif”.
- Ajouter un message dédié quand la famille active ne contient aucune entrée dans le contexte courant, distinct du message “aucun résultat” lié à la recherche et du message “journal vide”.

**Résultat attendu** : l’utilisateur voit immédiatement quelles familles sont disponibles et comprend pourquoi une famille donnée n’affiche rien.

### Étape 3 — Verrouiller la logique de comptage et les cas limites UX

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**What** :

- Ajouter des tests couvrant au minimum : compteurs par famille sur un journal mixte, compteurs recalculés avec recherche texte/plage de dates, sélection d’une famille vide, et maintien du rendu normal pour une famille non vide.
- Verrouiller la distinction entre trois états : journal réellement vide, résultat filtré vide, famille active vide avec message explicatif.
- Confirmer que le nouveau comportement reste purement côté application et n’affecte ni les entrées d’audit persistées ni l’export CSV.

**Résultat attendu** : le contrat UX des filtres de familles devient stable, compréhensible et non régressif.

## Périmètre / hors périmètre

### Inclus

- Compteurs et/ou atténuation visuelle des familles de filtres vides
- Message informatif explicite lors de la sélection d’une famille vide
- Prise en compte des filtres déjà existants (texte, dates) dans la disponibilité affichée

### Exclus

- Changement du modèle métier, du stockage `flags.swerpg.logs` ou de l’export CSV
- Refonte des familles de filtres ou du mapping des types d’audit
- Pagination, requêtes serveur ou modification du pipeline d’écriture du journal
