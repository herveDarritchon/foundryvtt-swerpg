# Issue #573 — `actor.less` : remplacer les couleurs brutes par des design tokens (ADR-0022)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/573  
**Domaine métier** : `character-sheet/refactor`

## Goal

Mettre `styles/actor.less` en conformité avec ADR-0022 en remplaçant les couleurs codées en dur par des design tokens, sans changer la structure ni le comportement des feuilles acteur.

## Contexte utile

- ADR-0022 cite explicitement `actor.less` comme l’un des principaux foyers de dette couleurs du système (~113 occurrences).
- `styles/variables.less` expose déjà une base utile de tokens réutilisables : `--color-glow-*`, `--color-frame-bg-*`, `--color-success-*`, `--color-danger-*`, `--color-warning-*`, `--color-accent-blue-*`, `--color-accent-yellow-*`.
- La dette visible est concentrée dans quelques familles UI de la feuille personnage : triggers du header, badge de spécialisation, console XP, cercles holo/caractéristiques, tags talents, états de skills, pips et ressources.
- Le périmètre de l’issue vise la dette **couleur** de `actor.less` ; ne pas mélanger ce chantier avec une refonte HTML/JS ou une refonte fonctionnelle de la character sheet.

## Plan d’implémentation

### Étape 1 — Cartographier les littéraux couleur par familles de composants

**Fichiers** : `styles/actor.less`, `styles/variables.less`

**What** :

- regrouper les occurrences brutes par sémantique de rendu plutôt que par ligne isolée ;
- identifier ce qui peut réutiliser des tokens existants et ce qui nécessite un token partagé manquant ;
- qualifier explicitement les rares exceptions ADR autorisées (`transparent`, `currentColor`, neutres purs ou `// tokens-allow-raw` si justifié).

**Résultat attendu** : un mapping clair de remplacement couvrant au minimum le header, la console XP, les caractéristiques, les tags talents et les états des skills.

### Étape 2 — Compléter la surface de tokens réutilisables manquante

**Fichiers** : `styles/variables.less`

**What** :

- ajouter uniquement les tokens réellement récurrents encore absents pour `actor.less` ;
- suivre les conventions existantes de nommage et d’alpha (`--color-*-NN`) avec `color-mix(...)` quand l’héritage de thème doit rester dynamique ;
- privilégier des tokens sémantiques pour les états métier/visuels récurrents (badges, highlight, tags, pips, ressources) plutôt que de réintroduire des valeurs ad hoc dans `actor.less`.

**Résultat attendu** : `actor.less` peut consommer une surface de tokens stable, sans recréer de nouvelles couleurs en dur.

### Étape 3 — Remplacer les couleurs brutes dans `actor.less`

**Fichiers** : `styles/actor.less`

**What** :

- remplacer les `hex`, `rgb/rgba`, `fade(...)` et fallbacks couleur non conformes par des `var(--color-*)` réels ;
- traiter en priorité les blocs les plus denses : header/triggers, badge de spécialisation, console XP, cercles holo + steppers, talents consolidés, skills (`career` / `specialization` / `free` / `affordable` / `max`) et pips ;
- convertir les gradients, ombres et variantes alpha pour qu’ils reposent sur les tokens du design system au lieu de couleurs littérales.

**Résultat attendu** : `styles/actor.less` n’embarque plus de couleurs de marque codées en dur hors exceptions ADR documentées.

### Étape 4 — Préparer la validation ciblée ADR-0022

**Fichiers** : aucun nouveau fichier requis

**What** :

- prévoir une validation par `pnpm run style:tokens` puis `pnpm run style:tokens:strict` sur le fichier touché ;
- prévoir une revue visuelle manuelle des surfaces critiques de la feuille acteur : header, console XP, caractéristiques, talents et skills ;
- vérifier que les thèmes et contrastes restent lisibles après tokenisation.

**Résultat attendu** : la conformité ADR-0022 de `actor.less` devient vérifiable sans élargir le périmètre à d’autres feuilles de style.

## Périmètre / hors périmètre

### Inclus

- Remédiation couleur de `styles/actor.less`
- Ajout minimal de tokens partagés dans `styles/variables.less` si nécessaire
- Nettoyage des fallbacks couleur non conformes dans `actor.less`

### Exclus

- Modifications JS, templates ou logique métier
- Remédiation des autres feuilles (`market.less`, `applications.less`, `item.less`, etc.)
- Refonte UX de la character sheet sans lien direct avec la conformité ADR-0022
