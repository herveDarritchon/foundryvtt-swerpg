# Plan de refonte holographique — Star Wars Edge of the Empire (Foundry VTT)

## Objectif

Transformer l'interface actuelle (néon / arcade cyberpunk) en une interface **holographique Star Wars** sobre : datapad
tactique, tableau de bord de vaisseau, projection d'état-major.

### IMPORTANT — méthode attendue

Ne pas appliquer ce plan comme une simple liste d’overrides ajoutés en fin de fichier.
Le but est de refactorer proprement le LESS existant :

- identifier les règles responsables du rendu néon ;
- les remplacer directement lorsque c’est possible ;
- supprimer les animations et shadows inutiles ;
- éviter les doublons ;
- conserver les classes, data-action, data-tooltip et data-\* existants ;
- ne modifier le HTML que si une correction CSS propre est impossible.

Les valeurs cibles indiquées ci-dessous sont des directions de design, pas des obligations absolues.
Si une valeur nuit à la lisibilité, privilégier la lisibilité et expliquer le choix.

## Principes directeurs

- **Bleu-cyan désaturé** dominant ; les couleurs sémantiques (rouge, orange, jaune) restent en accents uniquement.
- **Glow discret** : uniquement au `hover` ou sur état critique, jamais permanent.
- **Fonds translucides** et bordures fines plutôt qu'aplat plein.
- **Scanlines / bruit visuel** très subtils, presque imperceptibles.
- **Hiérarchie visuelle claire** : l'information utile prime sur l'ornement.
- **Star Wars par le langage visuel**, pas par une accumulation de polices ou d'effets.
- Compatibilité **Foundry VTT 13+** préservée.
- Aucune modification structurelle HTML sauf si strictement nécessaire.
- Tout le CSS/LESS **encapsulé** dans le scope du système.

---

## Fichiers concernés

| Fichier                           | Rôle                                                     |
| --------------------------------- | -------------------------------------------------------- |
| `styles/variables.less`           | Palette, familles de polices, tokens holographiques      |
| `styles/theme.less`               | Typographie structurelle, headings, liens                |
| `styles/actor.less`               | Caractéristiques (anneaux, icônes, valeurs, boutons +/-) |
| `styles/components/jauge.less`    | Ressources (wounds, strain, encumbrance)                 |
| `styles/components/defenses.less` | Défenses (soak, melee, ranged)                           |

---

## 1. Variables holographiques (`variables.less`)

### 1.1 Palette à désaturer

| Variable                 | Valeur actuelle          | Valeur cible              |
| ------------------------ | ------------------------ | ------------------------- |
| `--color-glow`           | `#00b0ff`                | `#78a9c2`                 |
| `--color-glow-hover`     | `lighten(#00b0ff, 15%)`  | `#9ec3d6`                 |
| `--color-accent`         | `#00b0ff`                | `#6fa7c4`                 |
| `--color-accent-blue`    | `#00b0ff`                | `#6fa7c4`                 |
| `--color-accent-yellow`  | `#ffe81f`                | `#c9b36a`                 |
| `--color-link-text`      | `#26c6da`                | `#8db9cc`                 |
| `--color-shadow`         | `rgba(0, 176, 255, 0.3)` | `rgb(111 167 196 / 0.18)` |
| `--color-frame`          | `#3a3f48`                | `#334150`                 |
| `--color-frame-bg`       | `#121923`                | `#101722`                 |
| `--color-frame-bg-25`    | `rgb(18 25 35 / 25%)`    | `rgb(16 23 34 / 25%)`     |
| `--color-frame-bg-50`    | `rgb(18 25 35 / 50%)`    | `rgb(16 23 34 / 50%)`     |
| `--color-frame-bg-75`    | `rgb(18 25 35 / 75%)`    | `rgb(16 23 34 / 75%)`     |
| `--color-tern`           | `#063a5e`                | `#142a3c`                 |
| `--color-border-default` | `#333`                   | `#2a3642`                 |

### 1.2 Ressources — désaturer les gradients et couleurs

| Variable                       | Valeur cible                                   |
| ------------------------------ | ---------------------------------------------- |
| `--color-wounds`               | `#b55050`                                      |
| `--color-wounds-glow`          | `#cc6666`                                      |
| `--color-strain`               | `#5ab4c9`                                      |
| `--color-strain-glow`          | `#80c8d9`                                      |
| `--color-encumbrance`          | `#c4944a`                                      |
| `--color-encumbrance-glow`     | `#d4a96e`                                      |
| `--color-wounds-gradient`      | `linear-gradient(to bottom, #b55050, #7a2222)` |
| `--color-strain-gradient`      | `linear-gradient(to bottom, #5ab4c9, #2a7088)` |
| `--color-encumbrance-gradient` | `linear-gradient(to bottom, #c4944a, #8a5a1a)` |

### 1.3 Polices — retirer Star Jedi du corps structurel

| Variable       | Valeur cible             | Usage recommandé                         |
| -------------- | ------------------------ | ---------------------------------------- |
| `--font-h1`    | `'Orbitron', sans-serif` | Titres principaux, nom du personnage     |
| `--font-h2`    | `'Orbitron', sans-serif` | Titres secondaires                       |
| `--font-h3`    | `'Rajdhani', sans-serif` | Labels de panneaux, sous-sections        |
| `--font-body`  | `'Exo 2', sans-serif`    | Texte courant, formulaires, descriptions |
| `--font-sans`  | `'Rajdhani', sans-serif` | Tags, boutons, micro-labels              |
| `--font-quote` | `'Exo 2', sans-serif`    | Citations, textes narratifs              |

Star Jedi ne doit plus être utilisée comme police structurelle.
Elle peut rester disponible pour un logo ou un élément décoratif exceptionnel, mais pas pour les headings génériques.

### 1.4 Thèmes light/dark — cohérence

- `theme-light()` et `theme-dark()` (`variables.less:188-210`) doivent être alignés sur les mêmes valeurs cibles.
- `@color-glow` global (ligne 171) : `#00b0ff` → `#78a9c2`.

---

## 2. Typographie structurelle (`theme.less`)

### 2.1 Headings (`theme.less:13-20`)

- Le bloc `h1, h2, h3, h4` hérite de `var(--font-h1)` → `Orbitron`.
- Supprimer `font-family: var(--font-h1)` s'il est redondant avec `font-family: var(--font-body)`.
- Ajouter `text-transform: uppercase` et `letter-spacing: 0.08em` pour le caractère technique.

### 2.2 Dividers (`theme.less:35-57`)

- Les masques en `linear-gradient` sur les `::before`/`::after` sont conservés.
- Remplacer `--color-h1` par un ton holographique désaturé.

### 2.3 Th (`theme.less:94-100`)

- `font-family: var(--font-h1)` → `Rajdhani` ou `Orbitron`.
- `text-shadow: none` (déjà le cas).

---

## 3. Animations permanentes à neutraliser (`actor.less:4-56`)

### 3.1 `@keyframes fade-in-holo`

- Réduire `drop-shadow` final de `10px` à `4px`.
- Réduire `fade(@color-glow, 60%)` à `fade(@color-glow, 20%)`.

### 3.2 `@keyframes pulse-glow`

- **Supprimer** l'animation telle quelle.
- La remplacer par une transition `hover` unique sur les caractéristiques.
- Les valeurs de `box-shadow` sont trop intenses (6px-18px).

### 3.3 `@keyframes holo-fade-in`

- `blur(4px) brightness(150%)` est trop marqué.
- Remplacer par `blur(1px) brightness(110%)` ou supprimer.

### 3.4 `@keyframes pulse-ring`

- **Supprimer** — ne sert à rien en holographique sobre.

---

## 4. Caractéristiques — réécriture complète (`actor.less:885-1048`)

### 4.1 `.characteristics-wrapper`

- Centrage conservé.
- Réduire l'espacement entre les éléments si nécessaire.

### 4.2 `.characteristic.holo-circle`

| Propriété          | Actuel                            | Cible                                                                                  |
| ------------------ | --------------------------------- | -------------------------------------------------------------------------------------- |
| `width` / `height` | `80px`                            | `72px` (réduction subtile)                                                             |
| `border-radius`    | `50%`                             | `50%`                                                                                  |
| `background`       | radial-gradient sombre            | `radial-gradient(circle at center, rgb(16 23 34 / 90%) 40%, rgb(8 12 18 / 100%) 100%)` |
| `box-shadow`       | `0 0 10px fade(@color-glow, 40%)` | `0 0 4px rgb(120 169 194 / 0.15)`                                                      |

### 4.3 `.circle-content`

| Propriété    | Actuel                        | Cible                                          |
| ------------ | ----------------------------- | ---------------------------------------------- |
| `border`     | `4px solid var(--color-glow)` | `1px solid rgb(120 169 194 / 0.45)`            |
| `box-shadow` | 4 couches de glow             | `inset 0 0 6px rgb(120 169 194 / 0.08)`        |
| `animation`  | `pulse-glow 2s infinite`      | **supprimée**                                  |
| `transition` | `box-shadow, transform`       | `border-color 0.2s ease, box-shadow 0.2s ease` |

### 4.4 `.characteristic-icon`

| Propriété   | Actuel                             | Cible                                                         |
| ----------- | ---------------------------------- | ------------------------------------------------------------- |
| `filter`    | `drop-shadow(0 0 6px @color-glow)` | **supprimé** ou `drop-shadow(0 0 2px rgb(120 169 194 / 0.2))` |
| `opacity`   | `0.2`                              | `0.15`                                                        |
| `animation` | `holo-fade-in 0.6s ease-out`       | **supprimée**                                                 |

### 4.5 `.value`

| Propriété     | Actuel                       | Cible                             |
| ------------- | ---------------------------- | --------------------------------- |
| `font-size`   | `3rem`                       | `2.2rem`                          |
| `color`       | `var(--color-accent-yellow)` | `#c9b36a` (ton or froid)          |
| `text-shadow` | 4 couches de glow            | `0 0 2px rgb(201 179 106 / 0.25)` |

### 4.6 Hover

- Remplacer `transform: scale(1.1)` par `scale(1.04)`.
- `box-shadow` hover : `0 0 8px rgb(120 169 194 / 0.2)` maximum.

### 4.7 Boutons + / -

| Propriété          | Actuel                             | Cible                                |
| ------------------ | ---------------------------------- | ------------------------------------ |
| `color`            | `#00b0ff`                          | `#78a9c2`                            |
| `border`           | `1px solid rgba(0, 176, 255, 0.5)` | `1px solid rgb(120 169 194 / 0.3)`   |
| `background`       | `rgba(12, 15, 23, 0.5)`            | `transparent`                        |
| `height` / `width` | `10px` / `25px`                    | `14px` / `14px` (carrés compacts)    |
| `font-size`        | hérité                             | `10px`                               |
| hover              | `background: @background-dark`     | `background: rgb(16 23 34 / 40%)`    |
| Opacité par défaut | `1`                                | `0.5` (visible au survol uniquement) |

---

## 5. Ressources — refonte (`components/jauge.less`)

### 5.1 Scope

- Tout le contenu doit être encapsulé dans `.swerpg.sheet.actor`.
- Les classes `.left-half` et `.right-half` actuelles (`lines 17-29`) ont des fonds violets/bleu plein : **à neutraliser
  ou supprimer**.

### 5.2 `.resource-bar-container`

| Propriété          | Actuel                       | Cible                                   |
| ------------------ | ---------------------------- | --------------------------------------- |
| `border`           | `2px solid #2a2a2a`          | `1px solid rgb(42 54 66 / 0.6)`         |
| `border-radius`    | `8px`                        | `6px`                                   |
| `background-color` | `#1b1b1b`                    | `rgb(16 23 34 / 70%)`                   |
| `box-shadow`       | `0 0 6px rgba(0, 0, 0, 0.4)` | `inset 0 1px 0 rgb(120 169 194 / 0.06)` |
| `width`            | `80px`                       | `72px`                                  |

### 5.3 `.jauge .block`

| Propriété          | Actuel           | Cible                            |
| ------------------ | ---------------- | -------------------------------- |
| `border`           | `1px solid #555` | `1px solid rgb(42 54 66 / 0.35)` |
| `background-color` | `#111`           | `rgb(8 12 18 / 80%)`             |
| `opacity`          | `0.3`            | `0.35`                           |

### 5.4 `.block.active` par type

| Type        | Couleur actuelle | Couleur cible |
| ----------- | ---------------- | ------------- |
| wounds      | `#ff0000` + glow | `#b55050`     |
| strain      | `#00bfff` + glow | `#5ab4c9`     |
| encumbrance | `#ff9900` + glow | `#c4944a`     |

> Tous les `box-shadow` permanents sur les blocs actifs sont **supprimés**.

### 5.5 `.title` et `.values`

- `font-family: 'Orbitron'` → `'Rajdhani'`.
- `color: white` → `var(--color-text)` ou ton désaturé.
- Supprimer tous les `box-shadow` colorés des titres (wounds, strain, encumbrance).
- `text-shadow: 0 0 2px black` → `none` ou `0 1px 2px rgb(0 0 0 / 0.5)`.

### 5.6 Boutons +/- (jauge)

- Mêmes corrections que pour les caractéristiques :
  - taille réduite
  - opacité `0.5` par défaut
  - bordure fine désaturée
  - pas de background plein

### 5.7 `.icon img`

- `filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.2))` → `drop-shadow(0 0 1px rgb(255 255 255 / 0.08))` ou supprimer.
- `width/height: 40px` → `36px`.

---

## 6. Défenses — refonte (`components/defenses.less`)

### 6.1 Scope

- Tout encapsuler sous `.swerpg.sheet.actor`.

### 6.2 `.defense-bar-container`

| Propriété          | Actuel                       | Cible                                   |
| ------------------ | ---------------------------- | --------------------------------------- |
| `width`            | `60px`                       | `56px`                                  |
| `border`           | `2px solid #2a2a2a`          | `1px solid rgb(42 54 66 / 0.6)`         |
| `border-radius`    | `8px`                        | `6px`                                   |
| `background-color` | `#1b1b1b`                    | `rgb(16 23 34 / 70%)`                   |
| `box-shadow`       | `0 0 6px rgba(0, 0, 0, 0.4)` | `inset 0 1px 0 rgb(120 169 194 / 0.06)` |

### 6.3 `.values`

- `font-size: 3rem` → `2rem`.
- `color: white` → ton sémantique désaturé.
- `text-shadow` → `none` ou `0 1px 1px rgb(0 0 0 / 0.4)`.

### 6.4 `.title`

- `font-size: 1rem` → `0.75rem`.
- `font-family: 'Orbitron'` → `'Rajdhani'`.
- Supprimer `box-shadow` permanents.
- Couleurs : `#00bfff` → `#5ab4c9`, `#ff9900` → `#c4944a`.

### 6.5 `.icon img`

- Mêmes corrections que les jauges.

---

## 7. Scanlines / bruit subtil

À ajouter uniquement sur les panneaux principaux (`.sheet-section`) via un pseudo-élément :

```less
.swerpg.sheet.actor .sheet-section {
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgb(0 0 0 / 0.04) 2px, rgb(0 0 0 / 0.04) 4px);
    border-radius: inherit;
    z-index: 1;
  }
}
```

- Opacité si faible qu'elle ne se voit que de près.
- `pointer-events: none` pour ne jamais interférer avec le clic.
- `z-index: 1` au-dessus du fond, sous le contenu (`z-index: 2` sur le contenu existant).

---

## 8. Ordre d'exécution

| Étape | Fichier                    | Action                                       |
| ----- | -------------------------- | -------------------------------------------- |
| 1     | `variables.less`           | Palette, polices, gradients, thèmes          |
| 2     | `theme.less`               | Headings, dividers, th                       |
| 3     | `actor.less`               | Animations, caractéristiques, boutons +/-    |
| 4     | `components/jauge.less`    | Scope, conteneurs, barres, titres, boutons   |
| 5     | `components/defenses.less` | Scope, conteneurs, valeurs, titres           |
| 6     | `actor.less`               | Ajout scanlines subtils sur `.sheet-section` |

---

## 9. Critères de validation

- [ ] Plus aucune animation visible en continu sur les widgets principaux.
- [ ] `pulse-glow` et `pulse-ring` ne sont plus utilisés sur les caractéristiques.
- [ ] `Star Jedi` n’est plus utilisée sur les headings structurels (`h1-h4`).
- [ ] Les caractéristiques ont un anneau fin, sans halo permanent.
- [ ] Les chiffres de caractéristiques sont lisibles sans halo jaune excessif.
- [ ] Les ressources et défenses utilisent des fonds translucides, pas des aplats noirs pleins.
- [ ] Les boutons +/- sont secondaires : visibles, mais non dominants.
- [ ] Aucun `box-shadow` coloré permanent sur les titres de ressources/défenses.
- [ ] Les couleurs sémantiques restent identifiables mais désaturées.
- [ ] Toutes les règles spécifiques à la feuille acteur sont encapsulées dans `.swerpg.sheet.actor`.
- [ ] Aucun sélecteur global dangereux du type `a.button` hors scope.
- [ ] Les `data-action`, `data-tooltip` et `data-*` ne sont pas modifiés.
- [ ] Blessures, stress, encumbrance, soak, melee defense, ranged defense restent lisibles en moins d’une seconde.
- [ ] Le rendu final évoque un datapad / tableau de bord holographique Star Wars, pas une interface arcade néon.
