---
goal: Optimisation responsive de la sidebar Current Equipment pour adaptation aux contraintes d'espace
version: 1.0
date_created: 2025-11-11
last_updated: 2025-11-11
owner: Star Wars Edge RPG System Team
status: 'In progress'
tags: [feature, ui, responsive, sidebar, equipment, optimization]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Plan d'implémentation déterministe pour résoudre les problèmes de débordement dans la sidebar "Current Equipment" (largeur fixe 200px). Objectif: garantir la visibilité intégrale et lisible de l'équipement (icône, nom, tags, contrôle) sans modifier la largeur existante, via adaptations CSS, logique de mode compact et normalisation des contenus. Ce document est auto‑suffisant et exécutable par un agent.

## 1. Requirements & Constraints

Liste exhaustive des exigences, contraintes, directives et patterns. Chaque identifiant est unique et immuable.

- **REQ-001**: Tous les items d'équipement visibles sans débordement horizontal (aucun scroll horizontal)
- **REQ-002**: Noms d'items affichés avec troncature ellipsis si dépassement, tooltip complet disponible
- **REQ-003**: Tags affichés de façon compacte (max 2 lignes visuelles, overflow caché)
- **REQ-004**: Mode compact auto si >3 items équipés (réduction espacements & tailles)
- **REQ-005**: Performance préparation + rendu additionnel < 50ms sur acteur <50 items
- **SEC-001**: Aucune insertion HTML non contrôlée (utilisation textes bruts; pas d'innerHTML dynamique)
- **DES-001**: Respect palette et styles existants (variables --color-\* sans ajout arbitraire de couleurs hex hors palette)
- **TEC-001**: Utiliser uniquement modifications dans `/styles/actor.less` et `/templates/sheets/actor/sidebar.hbs`
- **TEC-002**: Nouveau code JS dans `SwerpgBaseActorSheet` sans modifier API publique existante
- **TEC-003**: Aucune dépendance externe ajoutée (pas de nouvelles librairies)
- **CON-001**: Largeur sidebar fixe via CSS variable `--sidebar-width: 200px;` (ligne ~69 de `styles/actor.less`)
- **CON-002**: Structure des objets `featuredEquipment[]` inchangée
- **GUD-001**: Commenter uniquement le WHY pour nouvelles méthodes selon règles self‑explanatory
- **PAT-001**: Suivre pattern `#prepareFeaturedEquipment()` pour dériver mode compact (pas de recomputation séparée des données)
- **PAT-002**: Utiliser classes BEM-like additionnelles suffixées `--compact`
- **PAT-003**: Utiliser variable dédiée `--equipment-icon-size` pour uniformiser taille icône

## 2. Implementation Steps

Chaque phase est atomique. Validation = toutes tâches complétées + critères de fin satisfaits.

### Implementation Phase 1

- GOAL-001: Optimiser structure CSS de base pour réduire consommation d'espace horizontal.

| Task     | Description                                                                                                                                                                                                     | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Ajouter variable CSS `--equipment-icon-size: 32px;` dans bloc `.swerpg.sheet.actor .sheet-sidebar` proche de déclaration existante (après ligne ~264 `styles/actor.less`).                                      | ✅        | 2025-11-11 |
| TASK-002 | Modifier sélecteur `.item-list.equipped .equipped.line-item img.icon` lignes ~330-338 pour utiliser `flex:0 0 var(--equipment-icon-size); width:var(--equipment-icon-size); height:var(--equipment-icon-size);` | ✅        | 2025-11-11 |
| TASK-003 | Réduire padding du wrapper `.equipped.line-item` (ligne ~312) de `0.4rem 0.5rem` à `0.3rem 0.4rem`.                                                                                                             | ✅        | 2025-11-11 |
| TASK-004 | Changer `.controls` (ligne ~363) flex basis de `28px` à `24px`; ajuster `button.icon-button` width/height 24px.                                                                                                 | ✅        | 2025-11-11 |
| TASK-005 | Vérifier absence de débordement horizontal via inspection `element.scrollWidth <= 200`. (Validation manuelle automatisable par script).                                                                         | ✅        | 2025-11-11 |

### Implementation Phase 2

- GOAL-002: Normaliser troncature et compaction des textes (titres + tags).

| Task     | Description                                                                                                                         | Completed | Date       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-006 | Ajouter règle `.equipped.line-item .title h4` pour `max-width: 120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;` | ✅        | 2025-11-11 |
| TASK-007 | Ajouter attribut `title="{{e.name}}"` au `<h4>` dans `templates/sheets/actor/sidebar.hbs` ligne ~11.                                | ✅        | 2025-11-11 |
| TASK-008 | Modifier `.tags .tag` (ligne ~344) `max-width` de `60px` à `45px`; ajouter ellipsis `overflow:hidden; text-overflow:ellipsis;`      | ✅        | 2025-11-11 |
| TASK-009 | Limiter hauteur tags: ajouter `max-height: calc(2 * 1.1em); overflow:hidden;` sur conteneur `.tags`.                                | ✅        | 2025-11-11 |
| TASK-010 | Réduire font-size tag à `var(--font-size-9)` (ou définir nouvelle variable si absent).                                              | ✅        | 2025-11-11 |
| TASK-011 | Ajouter attribut `title="{{this}}"` sur chaque `<span class="tag">` boucle Handlebars.                                              | ✅        | 2025-11-11 |

### Implementation Phase 3

- GOAL-003: Optimiser densité verticale pour plus d'items visibles.

| Task     | Description                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-012 | Réduire `min-height` `.equipped.line-item` (ligne ~308) de `46px` à `38px`.                                                      |           |      |
| TASK-013 | Réduire gap global `.item-list` (ligne ~276) de `var(--margin-half)` à `4px`.                                                    |           |      |
| TASK-014 | Ajuster `.title` (ligne ~342) suppression `gap:0.25rem` -> `gap:2px` pour compacter.                                             |           |      |
| TASK-015 | Vérifier que 5 items tiennent sans scroll vertical excessif sur hauteur fenêtre standard 800px (script: compter items visibles). |           |      |

### Implementation Phase 4

- GOAL-004: Implémenter mode compact dynamique basé sur nombre d'items >3.

| Task     | Description                                                                                                                                                                                                                                                             | Completed | Date       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-012 | Réduire `min-height` `.equipped.line-item` (ligne ~308) de `46px` à `38px`.                                                                                                                                                                                             | ✅        | 2025-11-11 |
| TASK-013 | Réduire gap global `.item-list` (ligne ~276) de `var(--margin-half)` à `4px`.                                                                                                                                                                                           | ✅        | 2025-11-11 |
| TASK-014 | Ajuster `.title` (ligne ~342) suppression `gap:0.25rem` -> `gap:2px` pour compacter.                                                                                                                                                                                    | ✅        | 2025-11-11 |
| TASK-015 | Vérifier que 5 items tiennent sans scroll vertical excessif sur hauteur fenêtre standard 800px (script: compter items visibles).                                                                                                                                        | ✅        | 2025-11-11 |
| TASK-016 | Ajouter classes CSS `.equipped.line-item--compact` réduisant font-size titre (-1px) & tags (-1px) et padding `0.25rem 0.35rem`.                                                                                                                                         | ✅        | 2025-11-11 |
| TASK-017 | Ajouter méthode privée `#applyFeaturedEquipmentCompactMode()` dans `SwerpgBaseActorSheet` après préparation contexte (vers ligne de définition `_prepareFeaturedEquipment` si existante) pour ajouter flag `compactMode` au contexte si `featuredEquipment.length > 3`. | ✅        | 2025-11-11 |
| TASK-018 | Dans template `sidebar.hbs`, ajouter condition `{{#if compactMode}}` wrapper `div.item-list.equipped` ajout classe `compact-mode`.                                                                                                                                      | ✅        | 2025-11-11 |
| TASK-019 | Au render (override `prepareContext` ou équivalent), appliquer ajout classe aux items via Handlebars conditional: `{{#if ../compactMode}}equipped line-item equipped line-item--compact{{else}}equipped line-item{{/if}}`.                                              | ✅        | 2025-11-11 |
| TASK-020 | Tester bascule en ajoutant/supprimant items (simulate updates) — vérifier ajout/suppression classe sans rechargement complet.                                                                                                                                           |           |            |

### Implementation Phase 5

- GOAL-005: Validation, performance, documentation.

| Task     | Description                                                                                                                                                              | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-021 | Script de mesure (console) du temps `performance.now()` autour render sidebar pour confirmer <50ms.                                                                      |           |            |
| TASK-022 | Vérification accessibilité: contraste tags (calcul ratio >= AA) et focus visible sur `button.icon-button`.                                                               |           |            |
| TASK-023 | Ajouter commentaire JSDoc sur `#applyFeaturedEquipmentCompactMode` expliquant raison (WHY) uniquement.                                                                   | ✅        | 2025-11-11 |
| TASK-024 | Mettre à jour `/docs/README.md` section UI avec sous-section "Sidebar Current Equipment Responsive" listant nouvelles classes & variables.                               | ⬜        |            |
| TASK-025 | Ajouter tests Vitest (nouveau fichier `tests/applications/actor-sheet-responsive.test.mjs`) mock contexte => vérifier activation compactMode avec 4 items et non avec 2. | ✅        | 2025-11-11 |
| TASK-026 | Finaliser status plan -> In progress puis Completed après vérification automatique des critères.                                                                         |           |            |

## 3. Alternatives

- **ALT-001**: Augmenter largeur sidebar (rejeté: impose refonte globale layout, casse cohérence).
- **ALT-002**: Carousel horizontal (rejeté: complexité interaction + perte de lisibilité simultanée).
- **ALT-003**: Onglet séparé pour équipement (rejeté: augmente nombre de clics, contre objectif visibilité immédiate).
- **ALT-004**: Réduction radicale info (icône seule + tooltip) (rejeté: découverte moins intuitive).
- **ALT-005**: Scroll interne horizontal (rejeté: anti-pattern UX dans zone étroite).

## 4. Dependencies

- **DEP-001**: Fichier `styles/actor.less` sections lines ~270–400.
- **DEP-002**: Template `templates/sheets/actor/sidebar.hbs` lignes ~1–28.
- **DEP-003**: Méthode de préparation données d'équipement existante (`#prepareFeaturedEquipment`).
- **DEP-004**: Système i18n existant (clés `EQUIPMENT.*`).
- **DEP-005**: Environnement Foundry VTT v13 (ApplicationV2, Handlebars mixin).

## 5. Files

- **FILE-001**: `/styles/actor.less` — Ajustements tailles, padding, ajout classes compact.
- **FILE-002**: `/templates/sheets/actor/sidebar.hbs` — Ajout attributs `title`, conditions Handlebars mode compact.
- **FILE-003**: `/module/applications/sheets/base-actor-sheet.mjs` — Nouvelle méthode `#applyFeaturedEquipmentCompactMode` + intégration contexte.
- **FILE-004**: `/docs/README.md` — Documentation mise à jour.
- **FILE-005**: `/tests/applications/actor-sheet-responsive.test.mjs` — Tests activation mode compact.

## 6. Testing

- **TEST-001**: Contexte 0 item => affichage div vide (`.empty.equipped-empty`) pas de compactMode.
- **TEST-002**: 2 items => non compact (`.equipped.line-item--compact` absent).
- **TEST-003**: 4 items => compactMode actif (wrapper `.compact-mode` + classes compact sur chaque item).
- **TEST-004**: Vérifier truncation nom (longueur > 25 chars) ellipsis présente; tooltip affiche nom complet.
- **TEST-005**: Tags > 6 chars tronqués si dépassent 45px (mesure via offsetWidth <= 45).
- **TEST-006**: Performance: temps moyen 5 rendus <50ms (moyenne script).
- **TEST-007**: Accessibilité: focus sur bouton toggle visible (outline ou effet).
- **TEST-008**: Sécurité: aucune utilisation de `innerHTML`; contrôle regex sur fichiers modifiés.
- **TEST-009**: Test mode bascule en ajout/suppression dynamique d'un item (simulate update) => re-évaluation compactMode.

## 7. Risks & Assumptions

- **RISK-001**: Réduction font-size pourrait affecter lisibilité sur écrans basse résolution.
- **RISK-002**: Ellipsis peut masquer info critique (nom similaire). Mitigation: tooltip complet.
- **RISK-003**: Classes compact pourraient entrer en conflit avec futurs thèmes. Mitigation: préfixer sélecteurs précisément.
- **RISK-004**: Ajout logique peut déclencher rerender supplémentaire. Mitigation: calcul O(1) (simple length check).
- **ASSUMPTION-001**: Nombre moyen items équipés <=5.
- **ASSUMPTION-002**: Aucun item ne nécessite plus de 4 tags essentiels.
- **ASSUMPTION-003**: Palette de couleurs existante suffisante pour contraste AA.

## 8. Related Specifications / Further Reading

- `plan/feature-current-equipment-sidebar-1.md`
- `spec/design-current-equipment-sidebar.md`
- Foundry VTT v13 ApplicationV2 API Reference
- WCAG 2.1 Contrast Guidelines
- Internal coding guidelines (self-explanatory comments, security & performance instructions)
