# Issues — Refonte holographique Star Wars Edge of the Empire

## Issue 1 : Tokens holographiques, typographie structurelle et neutralisation des animations globales

**Fichiers concernés :** `styles/variables.less`, `styles/theme.less`, `styles/actor.less` (keyframes uniquement)

**Objectif :**
- Remplacer la palette néon par des valeurs désaturées (cyan bleuté, or froid)
- Retirer `Star Jedi` des headings structurels au profit d'Orbitron/Rajdhani/Exo 2
- Neutraliser les animations `pulse-glow` et `pulse-ring` (déjà trop arcade)
- Atténuer `fade-in-holo` et `holo-fade-in` sans les supprimer

**Critères de validation :**
- [x] `--color-glow` n'est plus un bleu néon saturé
- [x] `--font-h1`, `--font-h2`, `--font-h3` ne pointent plus vers `Star Jedi`
- [x] `pulse-glow` n'est plus utilisé comme animation permanente
- [x] La feuille de personnage affiche toujours les éléments, avec une palette plus sobre
- [x] Aucune régression sur la structure HTML ou les data-action

---

## Issue 2 : Refonte des caractéristiques (holo-circle)

**Fichiers concernés :** `styles/actor.less` (section `.characteristics`)

**Objectif :**
- Réduire l'anneau de 4px à 1px, supprimer le glow permanent
- Remplacer `animation: pulse-glow` par une transition hover discrète
- Réduire la taille et le glow du chiffre central
- Rendre les boutons +/- compacts et non dominants
- Supprimer le drop-shadow sur les icônes

**Critères de validation :**
- [x] L'anneau est fin, sans halo permanent
- [x] Le chiffre est lisible sans text-shadow excessif
- [x] Les boutons +/- sont discrets (opacité 0.5 par défaut)
- [x] Le hover est subtil (scale 1.04 max)
- [x] L'icône n'a plus de drop-shadow prononcé

---

## Issue 3 : Refonte des ressources (jauge.less)

**Fichiers concernés :** `styles/components/jauge.less`

**Objectif :**
- Ré-encapsuler tout le fichier sous `.swerpg.sheet.actor`
- Neutraliser `.left-half` / `.right-half` (fonds violets/bleu plein)
- Remplacer les aplats noirs par des fonds translucides
- Supprimer les box-shadow colorés permanents sur titres et blocs actifs
- Désaturer les couleurs sémantiques (wounds, strain, encumbrance)
- Rendre les boutons +/- discrets

**Critères de validation :**
- [x] Les panneaux de ressources sont translucides, pas opaques
- [x] Aucun box-shadow coloré permanent
- [x] Les couleurs sémantiques restent identifiables mais désaturées
- [x] Les boutons +/- sont secondaires
- [x] Tout est encapsulé dans `.swerpg.sheet.actor`

---

## Issue 4 : Refonte des défenses (defenses.less)

**Fichiers concernés :** `styles/components/defenses.less`

**Objectif :**
- Ré-encapsuler tout le fichier sous `.swerpg.sheet.actor`
- Harmoniser le style avec les ressources (fonds translucides, bordures fines)
- Réduire la taille des chiffres (3rem → 2rem)
- Supprimer les box-shadow permanents sur les titres
- Désaturer les couleurs (soak, melee, ranged)

**Critères de validation :**
- [x] Les panneaux de défenses sont cohérents avec les ressources
- [x] Les chiffres sont plus compacts
- [x] Aucun glow permanent sur les titres
- [x] Tout est encapsulé dans `.swerpg.sheet.actor`

---

## Issue 5 : Scanlines et bruit subtil

**Fichiers concernés :** `styles/actor.less`, `styles/components/jauge.less`

**Objectif :**
- Ajouter un effet de scanlines très subtil sur les `.sheet-section`
- Uniquement via pseudo-élément `::after` avec `pointer-events: none`
- Opacité minimale (3%) pour ne pas interférer avec la lisibilité

**Critères de validation :**
- [x] Les scanlines sont visibles de près mais pas distrayantes
- [x] Ne bloquent pas les interactions (clic, hover, drag)
- [x] Ne cassent pas le rendu des autres éléments
- [x] z-index cohérent : scanlines (1), contenu (2), titres h3 (3)
