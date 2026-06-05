# Plan d'implémentation — Audit Log : tokeniser les polices et glow en dur du chat (theming)

**Issue** : [#558 — Audit Log — Tokeniser les polices et glow en dur du chat (theming)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/558)
**Source** : `documentation/audit/audit-log/audit-ui-ux-audit-log.md` (AUDIT-UI-13, DA3)
**Domaine métier** : `audit-log`

## Objectif

Remplacer les littéraux de police et de glow encore utilisés par l'UI Audit Log par les tokens du design system afin que le theming Jedi/Sith s'applique correctement, sans changer la structure HTML ni la logique métier.

## Contexte utile

- L'issue vise explicitement les occurrences de police littérale dans `styles/chat.less` et le glow brut utilisé par les styles Audit Log.
- `styles/chat.less` contient encore des usages de `'Orbitron', sans-serif` sur la carte de chat Audit Log ; le design system expose déjà `var(--font-h1)` pour cette famille.
- Le glow visé par l'audit DA3 est documenté comme un `rgba(79, 168, 255, 0.22)` à remplacer par une variable de glow existante ; l'implémentation devra confirmer si cette règle se trouve côté chat ou dans le bloc Audit Log adjacent, tout en restant strictement limitée au périmètre Audit Log.

## Étapes d'implémentation

### 1. Remplacer les polices littérales du chat Audit Log par les tokens de police

**Fichiers pressentis** : `styles/chat.less`

- Relever les règles Audit Log qui utilisent encore `'Orbitron', sans-serif`.
- Remplacer chaque occurrence par le token de police déjà canonique dans la feature (`var(--font-h1)`).
- Vérifier que le remplacement reste limité au bloc Audit Log et ne modifie pas d'autres cartes de chat hors périmètre.

### 2. Remplacer le glow brut Audit Log par un token existant

**Fichiers pressentis** : `styles/chat.less`, `styles/applications.less` _(uniquement si la règle glow Audit Log documentée s'y trouve réellement)_

- Identifier la règle Audit Log qui porte encore le littéral `rgba(79, 168, 255, 0.22)`.
- La remplacer par la variable de glow existante la plus proche sémantiquement, sans créer de nouveau token ni introduire de couleur brute.
- Conserver strictement les mêmes états visuels et le même niveau d'emphase pour éviter un élargissement de scope stylistique.

### 3. Verrouiller la non-régression de theming

**Vérifications attendues à l'implémentation** : audit visuel ciblé des cartes/chat et `pnpm run build`

- Confirmer qu'aucune police littérale ne subsiste dans `styles/chat.less` pour l'Audit Log.
- Confirmer qu'aucun glow brut en dur ne subsiste dans les règles Audit Log concernées.
- Vérifier que les thèmes Jedi/Sith réappliquent correctement les polices et accents lumineux sur la carte de chat Audit Log.

## Résultat attendu

- La carte de chat Audit Log ne dépend plus de police littérale.
- Le glow Audit Log ciblé ne dépend plus d'un `rgba(...)` brut.
- Le correctif reste strictement limité au theming Audit Log, sans changement de structure, de comportement ni de modèle métier.
