# Issue #550 — Audit Log : unifier le langage visuel app ↔ chat (badge `prev→next`, variante, avatar)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/550  
**Domaine métier** : `audit-log`

## Goal

Porter dans l'application Character Audit Log les repères visuels déjà présents dans la carte de chat — avatar, variante sémantique et transition `previousValue → nextValue` — afin que l'écran de référence adopte le même langage visuel sans changer le modèle métier ni l'export CSV.

## Contexte utile

- L'audit design `documentation/audit/audit-log/audit-ui-ux-audit-log.md` classe ce besoin en **AUDIT-UI-03** et pointe que l'app est aujourd'hui moins expressive que le chat.
- `templates/applications/character-audit-log.hbs` rend actuellement une entrée minimale : date, type, description et delta.
- `templates/chat/audit-entry.hbs` et `_buildChatContext()` dans `module/utils/audit-log.mjs` portent déjà le contrat visuel cible : `actorImg`, `eventLabel`, `previousValue`, `nextValue`, `variant`, méta.
- `buildAuditLogEntries()` dans `module/applications/character-audit-log.mjs` expose déjà le tri, le filtrage, `typeLabel`, `formattedDelta` et `deltaClass`, mais pas encore ce view-model visuel enrichi.

## Plan d’implémentation

### Étape 1 — Enrichir le view-model de l’application avec le contrat visuel Audit Log

**Fichiers** : `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs` _(si mutualisation minimale utile)_

**What** :

- Définir pour chaque entrée affichée dans l'app les champs de présentation nécessaires à la carte unifiée : `variant`, `eventLabel`, `previousValue`, `nextValue`, `actorImg`/`actorName`, présence d'un badge de transition.
- Réutiliser autant que possible le mapping métier déjà codé par `_buildChatContext()` pour éviter une dérive app/chat sur les types `skill.*`, `species.set`, `career.set`, `advancement.level`, `item.purchase`, `item.sale`, `talent-node-*`.
- Conserver inchangés le tri anté-chronologique, le filtrage par famille, le calcul des deltas XP/crédits et l'export CSV.

**Résultat attendu** : l'app dispose d'un view-model compatible avec le langage visuel du chat, sans régression sur les données déjà exposées.

### Étape 2 — Recomposer le template de l’app autour d’une carte d’entrée plus riche

**Fichiers** : `templates/applications/character-audit-log.hbs`

**What** :

- Remplacer la ligne minimaliste actuelle par une structure qui affiche avatar, bloc méta, badge `prev→next`/`nextValue`, description et delta.
- Appliquer une classe de variante au niveau de l'entrée (`audit-log-entry--{{entry.variant}}` ou équivalent) pour que l'app partage la même sémantique visuelle que le chat.
- Prévoir un fallback propre pour les entrées sans `previousValue` afin d'afficher seulement le badge cible sur les cas d'ajout/retrait.

**Résultat attendu** : la lecture d'une entrée dans l'app retrouve les mêmes repères visuels que dans le chat tout en conservant les informations d'audit existantes.

### Étape 3 — Aligner le style app sur les variantes Audit Log et verrouiller la non-régression

**Fichiers** : `styles/applications.less`, `tests/applications/character-audit-log.test.mjs`

**What** :

- Ajouter les styles app pour avatar, badge, flèche et variantes `add` / `remove` / `gain` / `change` / `fail` en réutilisant les tokens déjà employés côté chat.
- Garder le delta comme information complémentaire à droite, sans casser le responsive existant de l'application.
- Étendre les tests de `buildAuditLogEntries()` pour verrouiller les nouveaux champs de présentation sur quelques types représentatifs (`skill.train`, `species.set`, `item.purchase`, `talent-node-purchase-failed`) et prévoir une validation visuelle ciblée de l'app pendant l'implémentation.

**Résultat attendu** : l'app et le chat parlent le même langage visuel, avec un contrat de présentation explicitement couvert.

## Périmètre / hors périmètre

### Inclus

- Enrichissement visuel de l'application Audit Log
- Réutilisation des variantes, du badge `prev→next` et de l'avatar déjà présents dans le chat
- Non-régression du tri, des filtres et des deltas

### Exclus

- Refonte de la carte de chat
- Ajout d'icônes par famille/type (`AUDIT-UI-04`)
- Recherche, regroupement par date ou détails dépliables
- Changement du modèle de données d'audit log ou de l'export CSV
