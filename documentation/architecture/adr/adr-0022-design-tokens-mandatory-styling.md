---
title: 'ADR-0022: Design tokens obligatoires — interdiction des couleurs et polices en dur dans les styles'
status: 'Accepted'
date: '2026-06-01'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'ui', 'design-system', 'css', 'less', 'theming', 'immersion', 'coding-standards']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Applicable à toutes les feuilles de style `styles/**/*.less` du système `swerpg`.

## Context

Le système dispose d'un **design system** centralisé dans [`styles/variables.less`](../../../styles/variables.less) (et son application dans [`styles/theme.less`](../../../styles/theme.less)) : une palette Star Wars holographique (cyan désaturé / or froid), des couleurs sémantiques (`--color-success`, `--color-warning`, `--color-danger`), des polices d'affichage (`--font-h1/h2/h3`, Orbitron/Rajdhani/Exo 2) et des thèmes dynamiques Jedi/Sith (`.light-side` / `.dark-side` via `.theme-light()` / `.theme-dark()`).

Or deux audits UI/UX ont montré que cette règle, **non écrite et non outillée**, n'était pas respectée uniformément :

- **Le Market** ([audit](../../audit/market/audit-ui-ux-market.md)) réintroduit une **palette Material Design générique codée en dur** (≈ 110 littéraux couleur, **0 token**). Résultat : un écran qui « vient d'ailleurs », étranger à l'univers, et **insensible au switch de thème** (les couleurs en dur n'héritent jamais de `.theme-light/.theme-dark`).
- **Le journal d'audit** ([audit](../../audit/audit-log/audit-ui-ux-audit-log.md)), à l'inverse, consomme les tokens et les polices → cohérent, immersif, et **thémable gratuitement**.

Un scan outillé (`scripts/check-style-tokens.mjs`) confirme l'ampleur de la dette : **331 couleurs en dur** réparties sur `actor.less` (113), `market.less` (110), `applications.less` (85), `item.less` (9), `dice.less` (8), `chat.less` (6), plus une dizaine de **tokens cassés** (`--colorBeige`, `--colorOlive`, `--colorSuccess`, `--colorError`, `--color-error`, `--color-light-4`).

Les conséquences sont les mêmes que pour les magic numbers (cf. [ADR-0018](adr-0018-no-magic-numbers-named-constants.md)), transposées au style :

1. **Rupture d'immersion / de marque** : chaque couleur en dur diverge de l'identité Star Wars et casse l'homogénéité entre écrans.
2. **Theming impossible** : une valeur en dur n'hérite pas des thèmes Jedi/Sith ; le switch de côté de la Force n'a aucun effet sur l'écran fautif.
3. **Maintenabilité fragile** : changer une teinte de marque = N retouches manuelles dispersées au lieu d'un token.
4. **Bugs silencieux** : référencer un token inexistant (`var(--color-error)` au lieu de `--color-danger`) casse une couleur/bordure sans erreur visible.

> **Note factuelle** : `--color-cool-*`, `--color-warm-*`, `--font-size-*`, `--z-index-*`, `--color-text-light/dark-*` sont des **tokens fournis par Foundry Core** — leur usage est **conforme** (ils ne sont pas « cassés »). Seuls les tokens ni définis dans le projet ni fournis par Foundry sont des bugs.

## Decision

**Toute valeur de couleur ou de police dans les feuilles de style doit passer par un design token. Aucune couleur ni police en dur dans la logique de présentation.**

### Règle principale

```
Aucun littéral couleur (hex, rgb/rgba, hsl/hsla) ni police (font-family littérale)
à valeur de marque ne doit apparaître directement dans styles/**/*.less,
en dehors des fichiers de définition de tokens (variables.less, theme.less).

Toute référence var(--token) doit pointer vers un token RÉELLEMENT défini :
- soit un token projet déclaré dans styles/variables.less / theme.less ;
- soit un token Foundry Core connu (--color-cool-*, --font-size-*, …).
```

### Où vivent les tokens

| Catégorie                                   | Source de vérité                 | Exemple                                                 |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| Palette, sémantiques, polices, thèmes       | `styles/variables.less`          | `--color-success`, `--color-accent-yellow`, `--font-h2` |
| Application typographique / structurelle    | `styles/theme.less`              | headers, tables, blockquote                             |
| Tokens neutres / layout fournis par Foundry | Foundry Core (ne pas redéclarer) | `--color-cool-4`, `--font-size-12`                      |

Un nouveau besoin de couleur récurrente **doit** être ajouté comme token dans `variables.less` (et décliné dans `.theme-light()/.theme-dark()` si pertinent), **puis** consommé via `var(--…)`.

### Pattern d'implémentation

```less
/* ❌ Couleur en dur — diverge du thème, insensible Jedi/Sith */
.market-item__buy {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #81c784;
}

/* ✅ Tokens — cohérent, thémable, maintenable */
.market-item__buy {
  background: color-mix(in srgb, var(--color-success) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  color: var(--color-success);
}
```

```less
/* ❌ Token inexistant — couleur silencieusement cassée */
.audit-entry--fail .audit-entry__badge {
  color: var(--color-error);
}

/* ✅ Token sémantique réel */
.audit-entry--fail .audit-entry__badge {
  color: var(--color-danger);
}
```

```less
/* ❌ Police en dur */
.audit-entry__badge {
  font-family: 'Orbitron', sans-serif;
}

/* ✅ Token de police */
.audit-entry__badge {
  font-family: var(--font-h1);
}
```

### Ce qui est autorisé

- `transparent`, `currentColor`, `inherit`, `none`.
- `#000` / `#fff` neutres purs sans valeur de marque (ombres, voiles) — préférer toutefois un token si disponible.
- Tokens Foundry Core (`--color-cool-*`, `--color-warm-*`, `--font-size-*`, `--z-index-*`, `--color-text-light/dark-*`).
- Variables locales de composant (`--hex-bg`, `--button-*`) déclarées puis consommées dans le même périmètre.
- **Exception ponctuelle justifiée** : un littéral inévitable (dégradé d'illustration, image) peut être toléré en suffixant la ligne de `// tokens-allow-raw`, avec un commentaire expliquant pourquoi.

### Ce qui est interdit

- Littéral couleur (`#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`) à valeur de marque dans un `.less` de composant.
- `font-family` avec une police littérale (`'Orbitron'`, `'Rajdhani'`…) au lieu de `var(--font-*)`.
- `var(--token)` pointant vers un token **non défini** (ni projet, ni Foundry Core).
- Redéclarer/écraser un token Foundry Core.

## Contrôle automatisé

Le script `scripts/check-style-tokens.mjs` (sans dépendance) outille la règle :

```bash
node scripts/check-style-tokens.mjs            # avertissements (couleurs en dur + tokens non reconnus)
node scripts/check-style-tokens.mjs --strict   # bloquant (exit 1) sur les couleurs en dur
pnpm run style:tokens                           # alias avertissement
pnpm run style:tokens:strict                    # alias bloquant (CI)
```

Il détecte :

1. **Couleurs en dur** hors `variables.less`/`theme.less` (bloquant sous `--strict`).
2. **Tokens non reconnus** : `var(--x)` ni déclaré localement ni listé comme token Foundry Core (`FOUNDRY_CORE_VAR_PATTERNS`) — advisory, à curer (vrai bug _ou_ token Foundry à ajouter à l'allowlist).

**Stratégie d'adoption (dette existante)** : la dette actuelle (331 couleurs) est trop large pour bloquer la CI immédiatement. Politique :

- **Nouveau code / fichier modifié** : 0 couleur en dur (revue PR + `--strict` ciblé).
- **Remédiation progressive** par fichier (chantiers backlog `MKT-UI-01`, etc.), en commençant par les pires (`market.less`, `actor.less`).
- **Bascule CI bloquante** (`pnpm run style:tokens:strict` en pre-commit Husky / pipeline) **une fois la dette résorbée**.

## Consequences

### Positif

- **Immersion & cohérence de marque** garanties : tous les écrans partagent une seule palette Star Wars.
- **Theming gratuit** : tout style tokenisé hérite automatiquement des thèmes Jedi/Sith.
- **Refactoring sûr** : changer une teinte = un token modifié, propagé partout.
- **Bugs de token détectés** tôt (`var(--color-error)` inexistant) par le contrôle.
- **LLM-friendly** : un agent trouve la palette autorisée en lisant `variables.less`, sans inventer de couleurs.

### Négatif / Contraintes

- Dette de remédiation importante (331 occurrences) à traiter progressivement.
- L'allowlist Foundry Core (`FOUNDRY_CORE_VAR_PATTERNS`) doit être maintenue si Foundry introduit de nouveaux tokens.
- Légère verbosité (`color-mix(...)` pour les opacités au lieu d'un `rgba()` direct).

## Checklist agent (LLM)

Avant d'écrire ou modifier une règle dans `styles/**/*.less` :

1. **J'introduis une couleur ?** → utiliser un `var(--color-*)` du design system ; jamais de hex/rgb/rgba en dur. Besoin d'une nouvelle teinte récurrente → l'ajouter d'abord comme token dans `variables.less`.
2. **J'introduis une police ?** → `var(--font-h1/h2/h3/body)` ; jamais de `font-family` littérale.
3. **Je référence `var(--x)` ?** → vérifier que `--x` est défini dans `variables.less`/`theme.less` **ou** est un token Foundry Core connu. Sinon, c'est un bug.
4. **Une opacité sur un token ?** → `color-mix(in srgb, var(--token) N%, transparent)` plutôt qu'un `rgba()` en dur.
5. **Un littéral est inévitable ?** → le justifier en commentaire et suffixer `// tokens-allow-raw`.
6. **Avant de finir** → `pnpm run style:tokens` ne doit pas faire apparaître de nouvelle couleur en dur ni de token non reconnu dans les fichiers touchés.

## Références

- [ADR-0018 — No Magic Numbers / Named Constants](adr-0018-no-magic-numbers-named-constants.md) — même principe, appliqué aux valeurs métier.
- [ADR-0001 — Foundry ApplicationV2 Adoption](adr-0001-foundry-applicationv2-adoption.md)
- [ADR-0021 — Scrollable areas ApplicationV2 pattern](adr-0021-scrollable-areas-applicationv2-pattern.md)
- [Audit UI/UX Market](../../audit/market/audit-ui-ux-market.md) — cas non conforme (palette en dur).
- [Audit UI/UX Journal d'audit](../../audit/audit-log/audit-ui-ux-audit-log.md) — cas conforme (tokens).
- [Règles UI swerpg](../ui/APPLICATIONS-RULES.md) §11 — contrat CSS/HTML & design tokens.
- `styles/variables.less`, `styles/theme.less` — source de vérité des tokens.
- `scripts/check-style-tokens.mjs` — contrôle automatisé.
  </content>
