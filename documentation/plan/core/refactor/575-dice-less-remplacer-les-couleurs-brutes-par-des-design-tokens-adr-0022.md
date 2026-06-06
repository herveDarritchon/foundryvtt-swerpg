# Issue #575 — `dice.less` : remplacer les couleurs brutes par des design tokens (ADR-0022)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/575  
**Domaine métier** : `core/refactor`

## Goal

Mettre `styles/dice.less` en conformité avec ADR-0022 en remplaçant les couleurs codées en dur par des design tokens, sans changer le comportement ni la structure des rendus de jets de dés.

## Contexte utile

- ADR-0022 cite explicitement `dice.less` parmi les feuilles encore en dette, avec **8 occurrences** de couleurs brutes.
- Les occurrences relevées dans `styles/dice.less` sont concentrées sur les états visuels des résultats (`success`, `failure`, `glance`, `critical`) et sur l’ombre portée des dés dans la visualisation du pool.
- `styles/variables.less` expose déjà une base réutilisable pour ce chantier : `--color-success-*`, `--color-danger-*`, `--color-warning-*`, `--color-success-text`, `--color-danger-text`, `--color-shadow`, `--color-result-good`, `--color-result-bad`, `--color-result-warn`.
- Le périmètre de l’issue est strictement CSS : ne pas mélanger cette remédiation avec le moteur de dés, les templates de chat ou les dialogues de jet.

## Plan d’implémentation

### Étape 1 — Cartographier les 8 littéraux couleur et définir leur mapping cible

**Fichiers** : `styles/dice.less`, `styles/variables.less`

**What** :

- relever les 8 occurrences brutes (`rgb(...)`, `#hex`) dans `dice.less` et les regrouper par rôle visuel ;
- décider pour chaque occurrence si un token existant suffit ou si un token sémantique minimal doit être ajouté dans `variables.less` ;
- qualifier explicitement le cas du `drop-shadow(... #000)` : remplacement par token si la sémantique existe, sinon exception ADR documentée.

**Résultat attendu** : un mapping complet couvre les fonds d’état, les couleurs critiques de texte et l’ombre des dés avant toute modification de style.

### Étape 2 — Tokeniser les états visuels des résultats de jet

**Fichiers** : `styles/dice.less`, `styles/variables.less` _(uniquement si des tokens manquent réellement)_

**What** :

- remplacer les fonds `--check-bg-color` codés en dur pour `success`, `failure` et `glance` par des tokens cohérents avec les sémantiques succès / danger / warning ;
- remplacer les couleurs critiques de texte (`failure.critical`, `success.critical`) par des tokens réels du design system, en privilégiant les familles `danger` / `success` existantes ;
- conserver inchangés les sélecteurs, variables locales CSS et états fonctionnels déjà utilisés par le rendu des jets.

**Résultat attendu** : les variantes de résultat n’embarquent plus de couleurs de marque en dur et restent lisibles dans les thèmes Jedi/Sith.

### Étape 3 — Finaliser la conformité ADR-0022 de `dice.less`

**Fichiers** : `styles/dice.less`

**What** :

- traiter l’ombre portée des dés selon la décision de mapping retenue à l’étape 1 ;
- vérifier qu’aucun nouveau littéral couleur n’est introduit dans `dice.less` hors exception ADR justifiée ;
- préparer la validation ciblée prévue à l’implémentation : `pnpm run style:tokens`, `pnpm run style:tokens:strict` et revue visuelle des états `success`, `failure`, `glance`, `critical` dans les cartes de jet.

**Résultat attendu** : `styles/dice.less` devient vérifiable contre ADR-0022 sans élargir le chantier à d’autres feuilles de style.

## Périmètre / hors périmètre

### Inclus

- Remédiation couleur de `styles/dice.less`
- Ajout minimal de tokens partagés dans `styles/variables.less` si nécessaire
- Qualification explicite des exceptions ADR éventuelles

### Exclus

- Modifications JS, Handlebars ou logique du moteur de dés
- Refonte UX du rendu de jet
- Remédiation d’autres feuilles (`actor.less`, `applications.less`, `chat.less`, etc.)
