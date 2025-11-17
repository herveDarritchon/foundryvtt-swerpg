---
goal: UI immersive & sections repliables pour Import OggDude Data
version: 1.0
date_created: 2025-11-15
last_updated: 2025-11-15
owner: importer-ui
status: 'Planned'
tags: ['feature', 'importer', 'ui', 'accessibility', 'performance']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Rendre la fenêtre « Import OggDude Data » plus immersive (thème Star Wars) et réduire sa hauteur en rendant les blocs Import Statistics, Global Metrics et Preview Items optionnels et repliables (affichés seulement si pertinents ou sur action explicite de l'utilisateur). Améliorations à apporter : esthétique Star Wars, accessibilité (ARIA / navigation clavier), performance (rendu conditionnel), et conservation des métriques pour tests existants.

## 1. Requirements & Constraints

- **REQ-001**: Les sections Statistiques, Métriques globales, Prévisualisation doivent être masquées par défaut et n'apparaître que si des données existent ET si l'utilisateur les ouvre.
- **REQ-002**: Fournir un résumé compact post-import (durée totale, items importés, taux d'erreur) directement sous la barre de progression.
- **REQ-003**: Maintenir la compatibilité avec les tests existants (identifiants contextuels, structure de progression) sans casser les sélecteurs.
- **REQ-004**: Accessibilité : chaque section repliable doit utiliser un pattern conforme (button + aria-expanded + region, ou details/summary) avec annonce screen reader correcte.
- **REQ-005**: Persister l'état d'ouverture pendant la session d'application (pas nécessaire après fermeture).
- **REQ-006**: Prévisualisation rendue uniquement après action « Preview Items » et lorsque des données préchargées existent.
- **REQ-007**: Ne pas déclencher de re-rendus inutiles : mise à jour de jauge uniquement sur callback progression.
- **REQ-008**: Styling basé sur variables CSS existantes + ajout léger de classes (pas de rupture framework Foundry).
- **SEC-001**: Aucun accès supplémentaire aux chemins de fichiers; ne pas exposer informations sensibles de zip.
- **A11-001**: Focus visible pour contrôles de repli/extension; titre unique (h2) conservé; ordre tabulation logique.
- **PERF-001**: Sections lourdes (table preview, stats) non insérées dans le DOM si vides ou fermées.
- **CON-001**: Largeur fenêtre inchangée (640px) pour ne pas impacter layout externe.
- **CON-002**: API publique du module import ne doit pas changer (OggDudeImporter.processOggDudeData).
- **GUD-001**: Suivre fichiers d'instructions a11y & performance.
- **PAT-001**: Respect ApplicationV2 + HandlebarsApplicationMixin.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Préparer logique applicative (états de visibilité, actions toggle)

| Task     | Description                                                                                                                 | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Ajouter propriétés `showStats`, `showMetrics`, `showPreview` initialisées à false dans `OggDudeDataImporter`                |           |            |
| TASK-002 | Ajouter méthodes actions `toggleStatsAction`, `toggleMetricsAction`, `togglePreviewAction` dans DEFAULT_OPTIONS.actions     | ✅        | 2025-11-15 |
| TASK-003 | Adapter `_prepareContext` pour fournir flags et résumé compact `importSummary` (overallDuration, totalProcessed, errorRate) | ✅        | 2025-11-15 |

### Implementation Phase 2

- GOAL-002: Adapter template Handlebars pour sections repliables et rendu conditionnel

| Task     | Description                                                                                                         | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-004 | Remplacer blocs par sections repliables (pattern details/summary) avec `{{#if showStats}}` etc. + résumé accessible | ✅        | 2025-11-15 |
| TASK-005 | N'afficher section stats que si `importStats` a des données (`hasStats`)                                            | ✅        | 2025-11-15 |
| TASK-006 | N'afficher section métriques que si `importMetricsFormatted.totalProcessed > 0`                                     | ✅        | 2025-11-15 |
| TASK-007 | N'afficher section preview que si `preview.hasData`                                                                 | ✅        | 2025-11-15 |
| TASK-008 | Ajouter barre résumé compact sous progression (utilise `importSummary`)                                             | ✅        | 2025-11-15 |

### Implementation Phase 3

- GOAL-003: Styling immersif & accessibilité

| Task     | Description                                                                                                              | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-009 | Ajouter classes `sw-panel`, `sw-collapsible` et effets visuels (bordure lueur, police Star Wars si disponible) dans LESS | ✅        | 2025-11-15 |
| TASK-010 | Ajouter styles focus visibles personnalisés pour boutons toggle                                                          | ✅        | 2025-11-15 |
| TASK-011 | Vérifier contraste texte / fond (>4.5:1) pour résumé compact                                                             | ✅        | 2025-11-15 |
| TASK-012 | Ajouter icônes thématiques (sabres, data holocron) dans résumé & summaries (via FontAwesome existant)                    | ✅        | 2025-11-15 |

### Implementation Phase 4

- GOAL-004: Tests & ajustements

| Task     | Description                                                                                                | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-013 | Mettre à jour tests context (`OggDudeDataImporter.context.spec.mjs`) pour vérifier présence flags & résumé | ✅        | 2025-11-15 |
| TASK-014 | Ajouter test d'affichage conditionnel (stats masquées sans import)                                         | ✅        | 2025-11-15 |
| TASK-015 | Ajouter test action toggle (simule click data-action)                                                      | ✅        | 2025-11-15 |
| TASK-016 | Ajouter test prévisualisation conditionnelle (après preloadAction uniquement)                              | ✅        | 2025-11-15 |
| TASK-017 | Vérifier non-régression UI refresh tests existants (barre progression)                                     | ✅        | 2025-11-15 |

### Implementation Phase 5

- GOAL-005: Documentation & process

| Task     | Description                                                                    | Completed | Date       |
| -------- | ------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-018 | Mettre à jour `documentation/importer/README.md` pour décrire nouveaux toggles |           |            |
| TASK-019 | Mettre à jour `DEVELOPMENT_PROCESS.md` avec étapes d'implémentation            | ✅        | 2025-11-15 |
| TASK-020 | Ajouter commentaires JSDoc sur nouvelles actions (WHY + usage)                 | ✅        | 2025-11-15 |

## 3. Alternatives

- **ALT-001**: Utiliser un système d'onglets séparés au lieu de sections repliables (rejetté: plus lourd, navigation supplémentaire).
- **ALT-002**: Afficher tout et réduire via CSS scroll interne (rejetté: toujours coûteux en DOM & lisibilité réduite).

## 4. Dependencies

- **DEP-001**: Fichier `module/settings/OggDudeDataImporter.mjs` (classe application).
- **DEP-002**: Template `templates/settings/oggDudeDataImporter.hbs`.
- **DEP-003**: Styles LESS principal (probablement `styles/swerpg.less` ou fichier spécifique importer si existe).
- **DEP-004**: Tests existants sous `tests/settings/` et `tests/unit/` pour importer.

## 5. Files

- **FILE-001**: `module/settings/OggDudeDataImporter.mjs` – ajout états & actions.
- **FILE-002**: `templates/settings/oggDudeDataImporter.hbs` – refonte sections.
- **FILE-003**: `styles/components/importer.less` (nouveau) – styles immersifs & collapsibles.
- **FILE-004**: `tests/settings/OggDudeDataImporter.context.spec.mjs` – extension tests.
- **FILE-005**: `documentation/importer/README.md` – mise à jour usage.

## 6. Testing

- **TEST-001**: Contexte préparé contient `showStats`, `showMetrics`, `showPreview`, `importSummary`.
- **TEST-002**: Avant import -> sections absentes (stats, metrics) / preview absente.
- **TEST-003**: Après import -> stats & metrics présentes mais fermées par défaut (details closed).
- **TEST-004**: Toggle actions ouvrent/ferment (aria-expanded bascule) & rendu conditionnel.
- **TEST-005**: Préload seul (sans import) -> preview disponible repliée.
- **TEST-006**: Accessibilité: chaque bouton a attribut `aria-controls` vers section.
- **TEST-007**: Performance: DOM ne contient pas tableau preview si fermé (vérifier via querySelector).

## 7. Risks & Assumptions

- **RISK-001**: Rupture tests cherchant anciennes sections; mitigation: conserver IDs ou ajouter fallback selectors.
- **RISK-002**: Comportement des éléments details/summary partiel certains navigateurs; hypothèse: Foundry exécuté sur Chromium/Electron moderne → acceptable.
- **RISK-003**: Complexité CSS supplémentaire peut impacter performance légère (mitigation: styles minimalistes, pas d'animations lourdes).
- **RISK-004**: Actions supplémentaires augmentent surface de maintenance; mitigation: code clair + JSDoc.
- **ASSUMPTION-001**: Font Star Wars déjà disponible (`Star_Jedi`); sinon fallback Orbitron.
- **ASSUMPTION-002**: Aucune dépendance supplémentaire npm nécessaire.

## 8. Related Specifications / Further Reading

- `plan/feature-importer-global-progress-jauge-1.md`
- Instructions a11y: `.github/instructions/a11y.instructions.md`
- Performance: `.github/instructions/performance-optimization.instructions.md`
- Secure coding: `.github/instructions/security-and-owasp.instructions.md`
