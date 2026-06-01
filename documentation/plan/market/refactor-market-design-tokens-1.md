---
goal: Variabiliser toute la palette market.less — 0 couleur en dur, 100% design tokens
version: 1.0
date_created: 2026-06-01
last_updated: 2026-06-01
owner: Hervé Darritchon
status: 'Planned'
tags: [refactor, design-system, market, styles, tokens, adr-0022]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

`styles/market.less` contient ~110 littéraux couleur en dur (hex/rgba) et 0 usage des tokens du design system. Ce plan remplace chaque valeur par un token CSS existant ou nouveau, supprime les références aux variables Foundry Core `--color-cool-3`/`--color-cool-4` (remplacées par des tokens projet), et garantit que le Market hérite automatiquement des thèmes `.light-side`/`.dark-side`.

Issue parente : [#523](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523)
ADR contraignant : [ADR-0022](../../architecture/adr/adr-0022-design-tokens-mandatory-styling.md)

---

## 1. Requirements & Constraints

- **REQ-001**: 0 littéral hex/rgba dans `styles/market.less` après implémentation (sauf exceptions documentées `// tokens-allow-raw`)
- **REQ-002**: Toutes les occurrences de `--color-cool-3`/`--color-cool-4` remplacées par des tokens projet
- **REQ-003**: Les couleurs Market s'adaptent aux thèmes `.light-side`/`.dark-side` (héritage automatique via `color-mix()`)
- **REQ-004**: `pnpm run build` passe sans erreur
- **REQ-005**: `pnpm run style:tokens:strict` passe sans violation sur `market.less`
- **CON-001**: Ne pas modifier les templates `.hbs`, les scripts `.mjs`, ni la logique métier
- **CON-002**: Pas de régression visuelle bloquante sur le mode achat (catalogue / toolbar / badges / boutons)
- **CON-003**: Les nouvelles variables doivent être déclarées dans `styles/variables.less` (scope `.swerpg`)
- **GUD-001**: Utiliser `color-mix(in srgb, var(--color-X) N%, transparent)` pour les variantes alpha de tokens qui changent entre thèmes (ex. `--color-glow`)
- **GUD-002**: Utiliser `rgb(R G B / N%)` pour les variantes alpha de tokens statiques (ex. `--color-frame-bg`)
- **PAT-001**: Nommage des tokens alpha : `--color-<base>-<opacité-entier>` (ex. `--color-glow-22`, `--color-success-15`)
- **PAT-002**: Nouveaux tokens sémantiques marché : préfixe `--color-market-<role>` (ex. `--color-market-forbidden`)

---

## 2. Implementation Steps

### Implementation Phase 1 — Audit et mapping complet

- GOAL-001: Produire la table complète de mapping littéral→token avant toute modification de fichier

| Task     | Description                                                                                                                                                                                                                                        | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Vérifier que le mapping ci-dessous (section 5, table de mapping) est exhaustif en exécutant `grep -n "rgba\|#[0-9a-fA-F]" styles/market.less` et comparant chaque occurrence                                                                       |           |      |
| TASK-002 | Vérifier que les tokens existants dans `styles/variables.less` correspondent bien aux valeurs attendues : `--color-success`, `--color-danger`, `--color-warning`, `--color-accent-blue`, `--color-glow`, `--color-frame-bg`, `--color-frame-bg-50` |           |      |

### Implementation Phase 2 — Ajout des nouveaux tokens dans `styles/variables.less`

- GOAL-002: Déclarer tous les nouveaux tokens dans le scope `.swerpg` de `variables.less` avant de les consommer dans `market.less`

| Task     | Description                                                                                                                                                                                                                                                                              | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-003 | Ajouter dans `.swerpg` les **tokens frame-bg** manquants : `--color-frame-bg-60: rgb(16 23 34 / 60%)` et `--color-frame-bg-70: rgb(16 23 34 / 70%)` (groupe existant des variantes `--color-frame-bg-25/50/75`)                                                                          |           |      |
| TASK-004 | Ajouter dans `.swerpg` le **token input-bg** : `--color-input-bg: rgb(10 17 26 / 70%)` (fond des champs search/filter/select dans la toolbar et le formulaire de négociation)                                                                                                            |           |      |
| TASK-005 | Ajouter dans `.swerpg` les **tokens glow alpha** (variantes `color-mix`) : `--color-glow-07`, `--color-glow-08`, `--color-glow-10`, `--color-glow-15`, `--color-glow-20`, `--color-glow-22`, `--color-glow-25`, `--color-glow-50`, `--color-glow-60` — voir valeurs exactes en section 5 |           |      |
| TASK-006 | Ajouter dans `.swerpg` les **tokens success alpha** : `--color-success-10`, `--color-success-12`, `--color-success-15`, `--color-success-20`, `--color-success-30`, `--color-success-35`, `--color-success-40` (fond/bordure bouton achat et résultat succès)                            |           |      |
| TASK-007 | Ajouter dans `.swerpg` les **tokens success texte** : `--color-success-text` et `--color-success-text-light` (couleurs de texte bouton achat, résultat succès)                                                                                                                           |           |      |
| TASK-008 | Ajouter dans `.swerpg` les **tokens danger alpha** : `--color-danger-08`, `--color-danger-10`, `--color-danger-15`, `--color-danger-20`, `--color-danger-30`, `--color-danger-35` (badge impérial, résultat désastre, bouton annuler-conséquences)                                       |           |      |
| TASK-009 | Ajouter dans `.swerpg` les **tokens danger texte** : `--color-danger-text` et `--color-danger-text-strong` (texte badge impérial, icône désastre)                                                                                                                                        |           |      |
| TASK-010 | Ajouter dans `.swerpg` les **tokens warning alpha** : `--color-warning-08`, `--color-warning-12`, `--color-warning-25`, `--color-warning-30` (badge différé, conséquence complication)                                                                                                   |           |      |
| TASK-011 | Ajouter dans `.swerpg` le **token warning texte** : `--color-warning-text` (texte badge différé `#ffe082`)                                                                                                                                                                               |           |      |
| TASK-012 | Ajouter dans `.swerpg` les **tokens accent-blue alpha** : `--color-accent-blue-12`, `--color-accent-blue-15`, `--color-accent-blue-30` (badge négociable, bouton négocier)                                                                                                               |           |      |
| TASK-013 | Ajouter dans `.swerpg` les **tokens accent-blue texte** : `--color-accent-blue-text` et `--color-accent-blue-text-light` (texte bouton négocier, badge négociable)                                                                                                                       |           |      |
| TASK-014 | Ajouter dans `.swerpg` les **tokens marché interdit** (marché noir / purple) : `--color-market-forbidden: #b400e6`, `--color-market-forbidden-08`, `--color-market-forbidden-12`, `--color-market-forbidden-25`, `--color-market-forbidden-30`, `--color-market-forbidden-text`          |           |      |
| TASK-015 | Ajouter dans `.swerpg` les **tokens restriction générale** : `--color-market-restricted: #ff9500`, `--color-market-restricted-bg`, `--color-market-restricted-border`, `--color-market-restricted-text`                                                                                  |           |      |
| TASK-016 | Ajouter dans `.swerpg` les **tokens restriction militaire** : `--color-market-military` (alias `--color-accent-yellow`), `--color-market-military-bg`, `--color-market-military-border`, `--color-market-military-text`                                                                  |           |      |
| TASK-017 | Ajouter dans `.swerpg` les **tokens restriction illégale** : `--color-market-illegal` (alias `--color-danger`), `--color-market-illegal-bg`, `--color-market-illegal-border`, `--color-market-illegal-text`                                                                              |           |      |

### Implementation Phase 3 — Remplacement dans `styles/market.less`

- GOAL-003: Remplacer chaque littéral couleur et chaque référence `--color-cool-*` par son token, selon la table de mapping (section 5)

| Task     | Description                                                                                                                                                                                                                                                          | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-018 | Remplacer les fonds sombres de panneaux : `rgba(12, 18, 27, 0.7)` → `var(--color-frame-bg-70)`, `rgba(12, 18, 27, 0.6)` → `var(--color-frame-bg-60)` (L60, L174, L277, L499)                                                                                         |           |      |
| TASK-019 | Remplacer les fonds de champs de saisie : `rgba(10, 17, 26, 0.7)` → `var(--color-input-bg)` (L74, L101, L540) et `rgba(10, 17, 26, 0.5)` → `var(--color-frame-bg-50)` (L180)                                                                                         |           |      |
| TASK-020 | Remplacer toutes les occurrences de `var(--color-cool-4, rgba(120, 169, 194, 0.22))` → `var(--color-glow-22)` (L61, L170, L277, L500)                                                                                                                                |           |      |
| TASK-021 | Remplacer toutes les occurrences de `var(--color-cool-4, rgba(120, 169, 194, 0.5))` → `var(--color-glow-50)` (L87, L110, L147, L325, L372)                                                                                                                           |           |      |
| TASK-022 | Remplacer `var(--color-cool-3, rgba(120, 169, 194, 0.6))` → `var(--color-glow-60)` (L115)                                                                                                                                                                            |           |      |
| TASK-023 | Remplacer les variantes alpha du glow sans fallback cool : `rgba(120, 169, 194, 0.15)` → `var(--color-glow-15)`, `rgba(120, 169, 194, 0.25)` → `var(--color-glow-25)`, `rgba(120, 169, 194, 0.2)` → `var(--color-glow-20)` (L75, L103, L133, L191, L204, L265, L660) |           |      |
| TASK-024 | Remplacer les hover/disabled glow : `rgba(120, 169, 194, 0.08)` → `var(--color-glow-08)`, `rgba(120, 169, 194, 0.07)` → `var(--color-glow-07)`, `rgba(120, 169, 194, 0.1)` → `var(--color-glow-10)` (L117, L142, L200, L204, L330, L337, L382, L389, L660, L756)     |           |      |
| TASK-025 | Remplacer les fonds/bordures/textes du bouton **Achat** (success) : tous les `rgba(76, 175, 80, X)` → `var(--color-success-X)`, `#81c784` → `var(--color-success-text)`, `#a5d6a7` → `var(--color-success-text-light)` (L309–L340)                                   |           |      |
| TASK-026 | Remplacer les fonds/bordures/textes du bouton **Négocier** (accent-blue) : tous les `rgba(63, 147, 200, X)` → `var(--color-accent-blue-X)`, `#64b5f6` → `var(--color-accent-blue-text)`, `#90caf9` → `var(--color-accent-blue-text-light)` (L354–L388)               |           |      |
| TASK-027 | Remplacer le badge **Impérial** et les résultats **désastre** : `rgba(235, 70, 70, X)` → `var(--color-danger-X)`, `#ef9a9a` → `var(--color-danger-text)`, `#e57373` → `var(--color-danger-text-strong)` (L422–L426, L552, L589–L597, L706–L710, L795–L811)           |           |      |
| TASK-028 | Remplacer le badge **Marché noir** et la conséquence `blackMarketDebt` : `rgba(180, 0, 230, X)` → `var(--color-market-forbidden-X)`, `#ce93d8` → `var(--color-market-forbidden-text)` (L429–L432, L714–L718)                                                         |           |      |
| TASK-029 | Remplacer le badge **Immédiat** et les boutons confirmer (success) dans les dialogues négociation et conséquences : `rgba(76, 175, 80, X)` → `var(--color-success-X)`, textes success (L434–L438, L568–L572, L647–L655, L793–L801)                                   |           |      |
| TASK-030 | Remplacer le badge **Différé** et la conséquence `complication` : `rgba(255, 193, 7, X)` → `var(--color-warning-X)`, `#ffe082` → `var(--color-warning-text)` (L440–L444, L721–L726)                                                                                  |           |      |
| TASK-031 | Remplacer le badge **Négociable** : `rgba(63, 147, 200, X)` → `var(--color-accent-blue-X)`, `#90caf9` → `var(--color-accent-blue-text-light)` (L446–L450)                                                                                                            |           |      |
| TASK-032 | Remplacer les badges **Restriction** (générale / militaire / illégale) : valeurs orange, goldenrod, rouge → `var(--color-market-restricted-*)`, `var(--color-market-military-*)`, `var(--color-market-illegal-*)` (L457–L480)                                        |           |      |
| TASK-033 | Remplacer les champs du formulaire de négociation : `rgba(10, 17, 26, 0.7)` → `var(--color-input-bg)`, `rgba(120, 169, 194, 0.25)` → `var(--color-glow-25)` (L539–L544)                                                                                              |           |      |
| TASK-034 | Remplacer le label `negotiation-disaster-label` : `#ef9a9a` → `var(--color-danger-text)` (L553)                                                                                                                                                                      |           |      |
| TASK-035 | Remplacer les résultats de négociation : blocs `.success`, `.failure`, `.disaster` et sous-éléments price (L568–L625)                                                                                                                                                |           |      |
| TASK-036 | Remplacer les boutons confirm/cancel du dialogue de négociation : tous les `rgba(76, 175, 80, X)` et `rgba(120, 169, 194, X)` (L647–L666)                                                                                                                            |           |      |
| TASK-037 | Remplacer la conséquence `imperialSuspicion` : `rgba(235, 70, 70, X)` → `var(--color-danger-X)`, icône `#ef9a9a` → `var(--color-danger-text)` (L703–L710)                                                                                                            |           |      |
| TASK-038 | Remplacer le badge `.consequence-badge--automatic` : `rgba(120, 169, 194, X)` → `var(--color-glow-X)` (L753–L757)                                                                                                                                                    |           |      |
| TASK-039 | Remplacer les boutons confirm/cancel du dialogue de conséquences : `rgba(76, 175, 80, X)` → `var(--color-success-X)`, `rgba(235, 70, 70, X)` → `var(--color-danger-X)` (L793–L811)                                                                                   |           |      |
| TASK-040 | Supprimer les fallbacks hex dans les `var()` qui en avaient : `var(--color-text, #d5e4f1)` → `var(--color-text)` (L77, L104, L210)                                                                                                                                   |           |      |

### Implementation Phase 4 — Build et validation

- GOAL-004: Confirmer zéro violation ADR-0022 et zéro régression de build

| Task     | Description                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-041 | Exécuter `pnpm run build` — doit passer sans erreur                                                                                        |           |      |
| TASK-042 | Exécuter `pnpm run style:tokens:strict` — doit rapporter 0 violation sur `styles/market.less`                                              |           |      |
| TASK-043 | Vérifier visuellement le catalogue Market (toolbar, table, badges, boutons achat/négocier) en mode dark-side (thème par défaut)            |           |      |
| TASK-044 | Vérifier visuellement le dialogue de négociation (états success / failure / disaster) en mode dark-side                                    |           |      |
| TASK-045 | Vérifier visuellement le dialogue de conséquences (3 types : imperialSuspicion, blackMarketDebt, complication) en mode dark-side           |           |      |
| TASK-046 | Activer `.light-side` et vérifier que les couleurs Market s'adaptent (glow gold, frame clair) — prouver que l'héritage de thème fonctionne |           |      |

---

## 3. Alternatives

- **ALT-001**: Utiliser des variables LESS (`@var`) plutôt que des custom properties CSS — rejeté car les custom properties CSS permettent l'héritage de thème en runtime sans recompilation LESS
- **ALT-002**: Créer un fichier `styles/market-tokens.less` dédié aux tokens marché — rejeté par conformité ADR-0022 qui mandate `variables.less` comme source unique de vérité des tokens
- **ALT-003**: Garder `--color-cool-4`/`--color-cool-3` comme tokens Foundry Core valides — rejeté car l'issue demande explicitement leur remplacement par des tokens projet, pour ne pas dépendre de l'API Foundry privée

---

## 4. Dependencies

- **DEP-001**: `styles/variables.less` — fichier hôte des nouveaux tokens ; doit être chargé avant `market.less` dans `styles/swerpg.less`
- **DEP-002**: `pnpm run style:tokens:strict` — commande de validation ADR-0022 (script `scripts/check-style-tokens.mjs`) doit être disponible

---

## 5. Files

- **FILE-001**: `styles/market.less` — fichier cible : toutes les couleurs en dur remplacées par des tokens
- **FILE-002**: `styles/variables.less` — fichier hôte : ajout des nouveaux tokens alpha dans le scope `.swerpg`

### Table de mapping complète

| Valeur en dur                                    | Contexte                                                            | Token de remplacement                    | Nouveau token ? |
| ------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------- | --------------- |
| `rgba(12, 18, 27, 0.7)`                          | Fond toolbar, buyer-bar, negotiation item                           | `var(--color-frame-bg-70)`               | Oui             |
| `rgba(12, 18, 27, 0.6)`                          | Fond catalogue table, negotiation item                              | `var(--color-frame-bg-60)`               | Oui             |
| `rgba(10, 17, 26, 0.7)`                          | Fond champs search/filter/select                                    | `var(--color-input-bg)`                  | Oui             |
| `rgba(10, 17, 26, 0.5)`                          | Fond thead table                                                    | `var(--color-frame-bg-50)`               | Non (existant)  |
| `rgba(120, 169, 194, 0.07)`                      | Séparateur ligne tableau                                            | `var(--color-glow-07)`                   | Oui             |
| `rgba(120, 169, 194, 0.08)`                      | Hover item / disabled bg                                            | `var(--color-glow-08)`                   | Oui             |
| `rgba(120, 169, 194, 0.10)`                      | Filtre actif bg / reset hover                                       | `var(--color-glow-10)`                   | Oui             |
| `rgba(120, 169, 194, 0.15)`                      | Bordure th / icône item                                             | `var(--color-glow-15)`                   | Oui             |
| `rgba(120, 169, 194, 0.20)`                      | Bordure cancel / reset                                              | `var(--color-glow-20)`                   | Oui             |
| `var(--color-cool-4, rgba(120, 169, 194, 0.22))` | Bordure frame toolbar, table, buyer-bar                             | `var(--color-glow-22)`                   | Oui             |
| `rgba(120, 169, 194, 0.25)`                      | Bordure champs saisie                                               | `var(--color-glow-25)`                   | Oui             |
| `var(--color-cool-4, rgba(120, 169, 194, 0.5))`  | Focus outline                                                       | `var(--color-glow-50)`                   | Oui             |
| `var(--color-cool-3, rgba(120, 169, 194, 0.6))`  | Bordure filtre actif                                                | `var(--color-glow-60)`                   | Oui             |
| `rgba(76, 175, 80, 0.10)`                        | Résultat succès bg                                                  | `var(--color-success-10)`                | Oui             |
| `rgba(76, 175, 80, 0.12)`                        | Badge immédiat bg                                                   | `var(--color-success-12)`                | Oui             |
| `rgba(76, 175, 80, 0.15)`                        | Bouton achat bg                                                     | `var(--color-success-15)`                | Oui             |
| `rgba(76, 175, 80, 0.20)`                        | Bouton confirmer bg                                                 | `var(--color-success-20)`                | Oui             |
| `rgba(76, 175, 80, 0.30)`                        | Achat hover / badge immédiat bordure / résultat succès bordure      | `var(--color-success-30)`                | Oui             |
| `rgba(76, 175, 80, 0.35)`                        | Résultat succès bordure / confirmer hover                           | `var(--color-success-35)`                | Oui             |
| `rgba(76, 175, 80, 0.40)`                        | Bouton confirmer bordure                                            | `var(--color-success-40)`                | Oui             |
| `#81c784`                                        | Texte bouton achat                                                  | `var(--color-success-text)`              | Oui             |
| `#a5d6a7`                                        | Texte bouton achat hover / résultat succès                          | `var(--color-success-text-light)`        | Oui             |
| `rgba(63, 147, 200, 0.12)`                       | Badge négociable bg                                                 | `var(--color-accent-blue-12)`            | Oui             |
| `rgba(63, 147, 200, 0.15)`                       | Bouton négocier bg                                                  | `var(--color-accent-blue-15)`            | Oui             |
| `rgba(63, 147, 200, 0.30)`                       | Bouton négocier bordure/hover / badge négociable bordure            | `var(--color-accent-blue-30)`            | Oui             |
| `#64b5f6`                                        | Texte bouton négocier                                               | `var(--color-accent-blue-text)`          | Oui             |
| `#90caf9`                                        | Texte bouton négocier hover / badge négociable                      | `var(--color-accent-blue-text-light)`    | Oui             |
| `rgba(235, 70, 70, 0.08)`                        | Conséquence imperialSuspicion bg                                    | `var(--color-danger-08)`                 | Oui             |
| `rgba(235, 70, 70, 0.10)`                        | Résultat désastre bg / bouton cancel-conséquences bg                | `var(--color-danger-10)`                 | Oui             |
| `rgba(235, 70, 70, 0.15)`                        | Badge impérial bg                                                   | `var(--color-danger-15)`                 | Oui             |
| `rgba(235, 70, 70, 0.20)`                        | Bouton cancel-conséquences hover                                    | `var(--color-danger-20)`                 | Oui             |
| `rgba(235, 70, 70, 0.30)`                        | imperialSuspicion bordure / cancel-conséquences bordure             | `var(--color-danger-30)`                 | Oui             |
| `rgba(235, 70, 70, 0.35)`                        | Badge impérial bordure / résultat désastre bordure                  | `var(--color-danger-35)`                 | Oui             |
| `#ef9a9a`                                        | Texte badge impérial / label désastre / icône conséquence impériale | `var(--color-danger-text)`               | Oui             |
| `#e57373`                                        | Icône résultat désastre / prix désastre                             | `var(--color-danger-text-strong)`        | Oui             |
| `rgba(255, 193, 7, 0.08)`                        | Conséquence complication bg                                         | `var(--color-warning-08)`                | Oui             |
| `rgba(255, 193, 7, 0.12)`                        | Badge différé bg                                                    | `var(--color-warning-12)`                | Oui             |
| `rgba(255, 193, 7, 0.25)`                        | Conséquence complication bordure                                    | `var(--color-warning-25)`                | Oui             |
| `rgba(255, 193, 7, 0.30)`                        | Badge différé bordure                                               | `var(--color-warning-30)`                | Oui             |
| `#ffe082`                                        | Texte badge différé / icône complication                            | `var(--color-warning-text)`              | Oui             |
| `rgba(180, 0, 230, 0.08)`                        | Conséquence blackMarketDebt bg                                      | `var(--color-market-forbidden-08)`       | Oui             |
| `rgba(180, 0, 230, 0.12)`                        | Badge marché noir bg                                                | `var(--color-market-forbidden-12)`       | Oui             |
| `rgba(180, 0, 230, 0.25)`                        | Conséquence blackMarketDebt bordure                                 | `var(--color-market-forbidden-25)`       | Oui             |
| `rgba(180, 0, 230, 0.30)`                        | Badge marché noir bordure                                           | `var(--color-market-forbidden-30)`       | Oui             |
| `#ce93d8`                                        | Texte badge marché noir / icône blackMarketDebt                     | `var(--color-market-forbidden-text)`     | Oui             |
| `rgba(255, 149, 0, 0.10)`                        | Badge restriction bg                                                | `var(--color-market-restricted-bg)`      | Oui             |
| `rgba(255, 149, 0, 0.30)`                        | Badge restriction bordure                                           | `var(--color-market-restricted-border)`  | Oui             |
| `#ff9500`                                        | Texte badge restriction                                             | `var(--color-market-restricted-text)`    | Oui             |
| `rgba(218, 165, 32, 0.10)`                       | Badge restriction militaire bg                                      | `var(--color-market-military-bg)`        | Oui             |
| `rgba(218, 165, 32, 0.30)`                       | Badge restriction militaire bordure                                 | `var(--color-market-military-border)`    | Oui             |
| `#daa520`                                        | Texte badge restriction militaire                                   | `var(--color-market-military-text)`      | Oui             |
| `rgba(220, 53, 69, 0.10)`                        | Badge restriction illégale bg                                       | `var(--color-market-illegal-bg)`         | Oui             |
| `rgba(220, 53, 69, 0.30)`                        | Badge restriction illégale bordure                                  | `var(--color-market-illegal-border)`     | Oui             |
| `#dc3545`                                        | Texte badge restriction illégale                                    | `var(--color-market-illegal-text)`       | Oui             |
| `var(--color-text, #d5e4f1)`                     | Texte td / texte input                                              | `var(--color-text)` (supprimer fallback) | Non             |

### Valeurs CSS à déclarer dans `variables.less`

```css
/* Frame-bg alpha manquants */
--color-frame-bg-60: rgb(16 23 34 / 60%);
--color-frame-bg-70: rgb(16 23 34 / 70%);

/* Input background (distinct de frame-bg) */
--color-input-bg: rgb(10 17 26 / 70%);

/* Glow alpha (color-mix pour héritage de thème automatique) */
--color-glow-07: color-mix(in srgb, var(--color-glow) 7%, transparent);
--color-glow-08: color-mix(in srgb, var(--color-glow) 8%, transparent);
--color-glow-10: color-mix(in srgb, var(--color-glow) 10%, transparent);
--color-glow-15: color-mix(in srgb, var(--color-glow) 15%, transparent);
--color-glow-20: color-mix(in srgb, var(--color-glow) 20%, transparent);
--color-glow-22: color-mix(in srgb, var(--color-glow) 22%, transparent);
--color-glow-25: color-mix(in srgb, var(--color-glow) 25%, transparent);
--color-glow-50: color-mix(in srgb, var(--color-glow) 50%, transparent);
--color-glow-60: color-mix(in srgb, var(--color-glow) 60%, transparent);

/* Success alpha */
--color-success-10: color-mix(in srgb, var(--color-success) 10%, transparent);
--color-success-12: color-mix(in srgb, var(--color-success) 12%, transparent);
--color-success-15: color-mix(in srgb, var(--color-success) 15%, transparent);
--color-success-20: color-mix(in srgb, var(--color-success) 20%, transparent);
--color-success-30: color-mix(in srgb, var(--color-success) 30%, transparent);
--color-success-35: color-mix(in srgb, var(--color-success) 35%, transparent);
--color-success-40: color-mix(in srgb, var(--color-success) 40%, transparent);
--color-success-text: color-mix(in srgb, var(--color-success) 80%, var(--color-text));
--color-success-text-light: color-mix(in srgb, var(--color-success) 60%, var(--color-text));

/* Danger alpha */
--color-danger-08: color-mix(in srgb, var(--color-danger) 8%, transparent);
--color-danger-10: color-mix(in srgb, var(--color-danger) 10%, transparent);
--color-danger-15: color-mix(in srgb, var(--color-danger) 15%, transparent);
--color-danger-20: color-mix(in srgb, var(--color-danger) 20%, transparent);
--color-danger-30: color-mix(in srgb, var(--color-danger) 30%, transparent);
--color-danger-35: color-mix(in srgb, var(--color-danger) 35%, transparent);
--color-danger-text: color-mix(in srgb, var(--color-danger) 70%, var(--color-text));
--color-danger-text-strong: color-mix(in srgb, var(--color-danger) 60%, var(--color-text));

/* Warning alpha */
--color-warning-08: color-mix(in srgb, var(--color-warning) 8%, transparent);
--color-warning-12: color-mix(in srgb, var(--color-warning) 12%, transparent);
--color-warning-25: color-mix(in srgb, var(--color-warning) 25%, transparent);
--color-warning-30: color-mix(in srgb, var(--color-warning) 30%, transparent);
--color-warning-text: color-mix(in srgb, var(--color-warning) 90%, var(--color-text));

/* Accent-blue alpha */
--color-accent-blue-12: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
--color-accent-blue-15: color-mix(in srgb, var(--color-accent-blue) 15%, transparent);
--color-accent-blue-30: color-mix(in srgb, var(--color-accent-blue) 30%, transparent);
--color-accent-blue-text: color-mix(in srgb, var(--color-accent-blue) 80%, var(--color-text));
--color-accent-blue-text-light: color-mix(in srgb, var(--color-accent-blue) 90%, var(--color-text));

/* Market forbidden (marché noir / purple) */
--color-market-forbidden: #b400e6;
--color-market-forbidden-08: color-mix(in srgb, var(--color-market-forbidden) 8%, transparent);
--color-market-forbidden-12: color-mix(in srgb, var(--color-market-forbidden) 12%, transparent);
--color-market-forbidden-25: color-mix(in srgb, var(--color-market-forbidden) 25%, transparent);
--color-market-forbidden-30: color-mix(in srgb, var(--color-market-forbidden) 30%, transparent);
--color-market-forbidden-text: color-mix(in srgb, var(--color-market-forbidden) 70%, var(--color-text));

/* Market restriction générale (orange) */
--color-market-restricted: #ff9500;
--color-market-restricted-bg: color-mix(in srgb, var(--color-market-restricted) 10%, transparent);
--color-market-restricted-border: color-mix(in srgb, var(--color-market-restricted) 30%, transparent);
--color-market-restricted-text: var(--color-market-restricted);

/* Market restriction militaire (goldenrod → accent-yellow) */
--color-market-military-bg: color-mix(in srgb, var(--color-accent-yellow) 10%, transparent);
--color-market-military-border: color-mix(in srgb, var(--color-accent-yellow) 30%, transparent);
--color-market-military-text: var(--color-accent-yellow);

/* Market restriction illégale (rouge → danger) */
--color-market-illegal-bg: color-mix(in srgb, var(--color-danger) 10%, transparent);
--color-market-illegal-border: color-mix(in srgb, var(--color-danger) 30%, transparent);
--color-market-illegal-text: var(--color-danger);
```

---

## 6. Testing

- **TEST-001**: `pnpm run style:tokens:strict` retourne exit code 0 avec 0 violation sur `styles/market.less`
- **TEST-002**: `pnpm run build` se termine sans erreur LESS ni Rollup
- **TEST-003**: Vérification visuelle manuelle — catalogue en dark-side : couleurs boutons achat (vert), négocier (bleu), badges (impérial rouge, marché noir violet, immédiat vert, différé jaune, négociable bleu)
- **TEST-004**: Vérification visuelle manuelle — dialogue négociation dark-side : états success / failure / disaster rendus correctement avec les bons tokens
- **TEST-005**: Vérification visuelle manuelle — dialogue conséquences dark-side : 3 types de conséquences (imperialSuspicion, blackMarketDebt, complication) correctement colorés
- **TEST-006**: Switch thème `.light-side` (si disponible en test) — prouver que glow tokens virent au gold et que les couleurs Market s'adaptent

---

## 7. Risks & Assumptions

- **RISK-001**: `color-mix()` produit des couleurs légèrement différentes des `rgba()` d'origine (interpolation sRGB vs valeur littérale) — impact visuel minimal en pratique, mais accepté car l'objectif est l'adaptation thème, pas la reproduction pixel-perfect des anciens literaux
- **RISK-002**: Le `--color-frame-bg` (#101722) est très proche mais pas identique à `rgba(10, 17, 26, X)` (#0a111a) — `--color-input-bg` utilise la valeur originale statique pour éviter toute dérive
- **RISK-003**: Si `pnpm run style:tokens:strict` n'est pas disponible (dépend du script `check-style-tokens.mjs`), fallback sur inspection manuelle via `grep "rgba\|#[0-9a-fA-F]" styles/market.less`
- **ASSUMPTION-001**: `styles/swerpg.less` importe `variables.less` avant `market.less` — l'ordre est déjà correct dans le build LESS existant
- **ASSUMPTION-002**: `color-mix(in srgb, ...)` est supporté par Electron/Chromium embarqué dans Foundry v14 — confirmé (Chromium 120+ requis, Foundry v14 utilise Electron avec Chromium récent)
- **ASSUMPTION-003**: Les tokens `--color-success`, `--color-danger`, `--color-warning`, `--color-accent-blue` ne sont pas surchargés dans les thèmes light/dark — confirmé par lecture de `variables.less` lignes 132–134, 67 ; seul `--color-glow` et `--color-accent` changent per-thème

---

## 8. Related Specifications / Further Reading

- [Issue #523 — Market UI: Variabiliser toute la palette market.less](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523)
- [ADR-0022 — Design tokens mandatory styling](../../architecture/adr/adr-0022-design-tokens-mandatory-styling.md)
- [Audit UI/UX Market](../../audit/market/audit-ui-ux-market.md) — constat DA1 source de ce ticket
- [styles/variables.less](../../../../styles/variables.less) — source unique de vérité des tokens
- [styles/market.less](../../../../styles/market.less) — fichier cible
