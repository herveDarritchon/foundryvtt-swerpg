# Issue #576 — `chat.less` : remplacer les couleurs brutes et corriger les tokens non reconnus (ADR-0022)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/576  
**Domaine métier** : `core/refactor`

## Goal

Mettre `styles/chat.less` en conformité avec ADR-0022 en supprimant les couleurs codées en dur et en remplaçant les tokens CSS non reconnus par des tokens réels du design system, sans changer la structure ni le comportement des cartes de chat.

## Contexte utile

- `chat.less` concentre plusieurs surfaces distinctes dans un même fichier : cartes de chat génériques, actions, confirmations, `skill-transaction`, `audit-entry`, `audit-entry-summary` et `audit-log-warning`.
- Les dettes visibles sont de deux types : quelques littéraux couleur (`#090b13`, `#7b8cc7`, `#130913`, `#977dcc`, `#b33a2e`, `#fff`) et plusieurs tokens legacy/non reconnus (`--colorBeige`, `--colorOlive`, `--colorSuccess`, `--colorError`, `--color-error`, etc.).
- ADR-0022 impose de réutiliser des tokens existants ou d’ajouter un minimum de tokens partagés dans `styles/variables.less` seulement si aucune sémantique canonique n’existe déjà.
- Le périmètre de l’issue est strictement orienté couleurs/tokens ; ne pas rouvrir les chantiers séparés sur les polices littérales ou sur une refonte des templates chat.

## Plan d’implémentation

### Étape 1 — Cartographier la dette ADR-0022 restante dans `chat.less`

**Fichiers** : `styles/chat.less`, `styles/variables.less`

**What** :

- relever les couleurs brutes et les tokens non reconnus encore présents par bloc fonctionnel ;
- distinguer les zones génériques (`whisper`, `blind`, actions, confirmations, métadonnées) des zones métier (`skill-transaction`, `audit-log-warning`) ;
- définir pour chaque occurrence un mapping cible vers un token existant, ou identifier le très petit nombre de tokens partagés réellement manquants.

**Résultat attendu** : un mapping complet couvre toute la dette de `chat.less` sans élargir le périmètre à d’autres feuilles de style.

### Étape 2 — Corriger les tokens legacy/non reconnus par des équivalents canoniques

**Fichiers** : `styles/chat.less`, `styles/variables.less` _(uniquement si un token partagé manque réellement)_

**What** :

- remplacer les aliases/casses non valides par les tokens sémantiques déjà canonisés dans le design system ;
- harmoniser les états `success` / `danger` / `secondary` / `frame` utilisés dans les métadonnées, actions et variantes de badges ;
- limiter tout ajout éventuel dans `variables.less` à des besoins récurrents réellement partagés, sans créer de palette ad hoc propre à `chat.less`.

**Résultat attendu** : `chat.less` ne référence plus de token fantôme ou non reconnu dans les règles concernées.

### Étape 3 — Remplacer les couleurs brutes restantes par des design tokens

**Fichiers** : `styles/chat.less`

**What** :

- tokeniser les couleurs brutes des cartes `whisper` / `blind` et de l’icône `audit-log-warning` ;
- convertir les bordures, fonds et couleurs d’accent pour qu’ils reposent sur des `var(--color-*)` réels, ou sur des compositions conformes ADR (`color-mix(...)`) si une alpha thémable est nécessaire ;
- conserver strictement les mêmes rôles visuels et ne pas modifier la structure CSS/HTML des cartes chat.

**Résultat attendu** : `styles/chat.less` n’embarque plus de couleurs de marque en dur hors exceptions ADR explicitement justifiées.

### Étape 4 — Préparer la validation ciblée de la conformité `chat.less`

**Fichiers** : aucun nouveau fichier requis

**What** :

- prévoir une validation par `pnpm run style:tokens` puis `pnpm run style:tokens:strict` sur les fichiers touchés ;
- prévoir une revue visuelle ciblée des cartes `whisper`, `blind`, `skill-transaction`, `audit-entry` et `audit-log-warning` ;
- vérifier que les contrastes et le theming Jedi/Sith restent lisibles après tokenisation.

**Résultat attendu** : la conformité ADR-0022 de `chat.less` devient vérifiable sans rouvrir d’autres chantiers CSS.

## Périmètre / hors périmètre

### Inclus

- Remédiation couleur de `styles/chat.less`
- Correction des tokens non reconnus encore présents dans `chat.less`
- Ajout minimal de tokens partagés dans `styles/variables.less` si nécessaire

### Exclus

- Modifications JS, Handlebars ou logique métier des cartes chat
- Refonte UX des cartes `skill-transaction`, `audit-entry` ou `audit-log-warning`
- Tokenisation des polices littérales ou autres chantiers CSS déjà suivis par des issues dédiées
