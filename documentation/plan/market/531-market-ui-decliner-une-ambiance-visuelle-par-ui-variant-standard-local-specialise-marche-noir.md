# Marché UI — Ambiance visuelle par `uiVariant` (standard/local/spécialisé/marché noir)

**Issue** : [#531 — Market UI — Décliner une ambiance visuelle par uiVariant (standard/local/spécialisé/marché noir)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/531)

**Dépend sur** : [#523 — Market UI: Variabiliser toute la palette market.less (0 couleur en dur)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523)

**Tags** : `HITL` — validation humaine des palettes avant implémentation

## Objectif

Donner une identité visuelle distincte à chaque type de marché en stylant les classes CSS `market--*` déjà appliquées au DOM, en réutilisant exclusivement les tokens du design system.

## Contexte

- Les classes `market--standard`, `market--local`, `market--specialized`, `market--black-market` sont déjà appliquées au `<div>` racine du catalogue en mode achat (`templates/market/market.hbs:2`) et documentées dans `module/config/market.mjs:271-316`.
- `styles/market.less` ne définit **aucun style** pour ces classes (constat de l'audit `audit-ui-ux-market.md`, DA3).
- Le sélecteur de marché déclenche déjà un re-render immédiat via `market-application.mjs:1223-1231`, donc aucun changement JS nécessaire.
- Le plan de variabilisation (`refactor-market-design-tokens-1.md`) a déjà livré les tokens alpha nécessaires ; la présente étape les consomme.

## Étapes d'implémentation

### 1. Valider les palettes (HITL)

Avant toute écriture CSS, faire valider les 4 palettes par le demandeur (DA) :

| Variante               | Ambiance                 | Tokens candidats                                          |
| ---------------------- | ------------------------ | --------------------------------------------------------- |
| `market--standard`     | Cyan (palette existante) | `--color-accent`, `--color-glow`, `--color-accent-blue-*` |
| `market--local`        | Vert / agricole          | `--color-success*`                                        |
| `market--specialized`  | Or / impérial            | `--color-accent-yellow`, `--color-warning*`               |
| `market--black-market` | Violet / interlope       | `--color-market-forbidden*`                               |

**Critères** : chaque jeu de couleurs définit : accent, bordure/liseré, fond de table, glow, texte secondaire si nécessaire.

### 2. Ajouter les blocs de style pour chaque variante

**Fichier** : `styles/market.less` (ajout en fin de fichier, avant les éventuelles media queries)

**Approche** : utiliser des CSS custom properties scoped par variante plutôt que dupliquer les blocs de règles. Chaque variante surcharge les tokens consommés par les composants Market existants (toolbar, buyer-bar, table, mode toggle, badges).

**Structure attendue** :

```less
.market--standard {
  --color-accent: var(--color-accent-blue);
  --color-glow: var(--color-glow); /* inchangé */
  /* autres surcharges */
}

.market--local {
  --color-accent: var(--color-success);
  --color-glow-22: color-mix(in srgb, var(--color-success) 22%, transparent);
  /* etc */
}
```

**Règles** :

- 0 couleur en dur (vérifié par `pnpm run style:tokens:strict`)
- Tous les tokens doivent exister dans `styles/variables.less`
- Les variantes héritent automatiquement des thèmes `.light-side`/`.dark-side`

### 3. Vérifier le rendu en mode achat uniquement (scope V1)

**Ce qui change** : les styles des composants catalogue (toolbar, table, buyer bar, mode toggle, badges, boutons) s'adaptent automatiquement via la surcharge de tokens scoped.

**Ce qui ne change pas** :

- Pas de modification des templates `.hbs`
- Pas de modification des scripts `.mjs`
- Pas de modification de `variables.less` (sauf si un token manque)
- Le mode vente reste non stylé par `uiVariant` (le template exclut la classe en mode `sell`)

### 4. Ajouter un token manquant si nécessaire

**Fichier** : `styles/variables.less` (scope `.swerpg`)

Si une variante a besoin d'un token qui n'existe pas encore dans le design system, l'ajouter ici en suivant `PAT-001`/`PAT-002` du plan `refactor-market-design-tokens-1.md`.

### 5. Validation

```bash
pnpm run build              # doit passer sans erreur
pnpm run style:tokens:strict  # 0 violation sur market.less
```

Vérification visuelle manuelle :

- Changer le type de marché dans le sélecteur → l'ambiance change immédiatement
- Chaque variante est lisible et contrastée
- Compatibilité `.dark-side` et `.light-side`

## Résultat attendu

- `market.hbs:2` active la bonne classe → `market.less` applique l'ambiance correspondante
- 4 ambiances visuellement distinctes, 0 couleur en dur, 0 changement JS
- Le sélecteur de marché produit un changement visuel immédiat
