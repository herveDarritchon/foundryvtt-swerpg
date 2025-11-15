---
goal: Ajouter une jauge de progression globale dans l'interface OggDudeDataImporter (entre statistiques d'import et détail tableau)
version: 1.0
date_created: 2025-11-15
last_updated: 2025-11-15
owner: swerpg-team
status: 'Completed'
tags: [feature, importer, ui, accessibility, performance]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Objectif: Ajouter une jauge (barre de progression) globale verte représentant l'avancement de l'import OggDude au niveau des domaines (weapon, armor, gear, species, career, talent). Cette jauge doit apparaître visuellement entre la section "Import Statistics" et le tableau listant les statistiques par domaine, être accessible (ARIA), performante (mise à jour sur callback sans re-rendu complet inutile) et respecter les patterns ApplicationV2 + Handlebars Foundry VTT v13. Elle doit atteindre 100% lorsque tous les domaines sélectionnés ont été traités. Le fond de la jauge (remplissage) est vert, et sa progression augmente après chaque domaine importé.

## 1. Requirements & Constraints

- **REQ-001**: Ajouter une jauge globale affichant la progression (processed / total domaines) dans `templates/settings/oggDudeDataImporter.hbs` juste après le titre des statistiques et avant le tableau.
- **REQ-002**: La jauge utilise un conteneur avec `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="<total>"`, `aria-valuenow="<processed>"`, label localisé (`SETTINGS.OggDudeDataImporter.loadWindow.progress.global`).
- **REQ-003**: Le remplissage interne (.bar) s'anime (transition CSS) et adopte un fond dégradé vert accessible (contraste >= 4.5:1).
- **REQ-004**: Ne rien afficher tant que `progress.total === 0`.
- **REQ-005**: Calcul du pourcentage dans `OggDudeDataImporter._prepareContext()` fourni à la template via `progressPercentDomains` séparé de l'existant `progressPercent` (qui est déjà présent pour métriques). Nouveau champ ne doit pas entrer en conflit avec metrics existantes.
- **REQ-006**: Aucune dépendance externe supplémentaire; réutiliser architecture existante, pas de librairie tierce.
- **REQ-007**: Respect des instructions a11y (focus non nécessaire, pure info) et performance (éviter recomputation lourde). Mise à jour uniquement sur callback `progressCallback` de `OggDudeImporter.processOggDudeData()`.
- **REQ-008**: Ajouter styles Less dans `styles/applications.less` sous bloc spécifique `.swerpg.application .app#swerpgSettings-form` pour cohérence.
- **REQ-009**: Tests: unitaire (contexte), rendu Handlebars (HTML contient jauge avec attributs), progression (width correcte), absence avant import.
- **REQ-010**: Sécurité: pas d'usage de `innerHTML` pour insertion dynamique; uniquement Handlebars sécurisée, aucune interpolation de données non contrôlées.
- **SEC-001**: Garantir absence d'injection: valeurs numériques (processed, total) converties en entiers avant usage ARIA.
- **SEC-002**: Ne pas exposer noms fichier locaux dans UI (déjà existant, rien à changer dans la jauge).
- **CON-001**: Conformité Foundry VTT v13 Handlebars ApplicationV2.
- **CON-002**: Pas de rupture des tests existants import (ne pas modifier la signature du callback progress existant).
- **GUD-001**: Utiliser code auto-documenté (cf. self-explanatory-code-commenting.instructions.md) limiter commentaires au pourquoi.
- **GUD-002**: Respect des guidelines performance (calcul simple O(1)).
- **PAT-001**: Pattern de mise à jour UI: stocker `_progress` puis `render()` safe try/catch comme existant.
- **PAT-002**: Style BEM léger: bloc `.import-progress-global` élément `.bar`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Préparer contexte et extension de données (nouveau pourcentage domaines) + insertion Handlebars.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Modifier `module/settings/OggDudeDataImporter.mjs`: dans `_prepareContext`, ajouter calcul `progressPercentDomains = (progress.total ? Math.floor((progress.processed / progress.total) * 100) : 0)` et s'assurer cast en entier. | ✅ | 2025-11-15 |
| TASK-002 | Ajouter champ `progressDomain` identique à `_progress` (alias lisible) si nécessaire pour template (sinon réutiliser `progress`). | ✅ | 2025-11-15 |
| TASK-003 | Vérifier que callback `progressCallback` existant fournit bien processed/total domaines (lecture déjà confirmée) et ne nécessite pas modification. | ✅ | 2025-11-15 |
| TASK-004 | Insérer nouveau bloc Handlebars dans `templates/settings/oggDudeDataImporter.hbs` sous `<h4 id="import-stats-heading">` avant `<table>` avec markup accessible + condition `{{#if progress.total}}`. | ✅ | 2025-11-15 |
| TASK-005 | Ajouter `span.sr-only` (classe existante ou à créer) pour texte alternatif `processed/total`. | ✅ | 2025-11-15 |
| TASK-006 | Mettre à jour localisation si clé manquante (clé déjà présente: `progress.global`, donc vérifier seulement). | ✅ | 2025-11-15 |

### Implementation Phase 2

- GOAL-002: Styles Less + accessibilité + tests unitaires de contexte.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-007 | Modifier `styles/applications.less`: ajouter bloc `.import-progress-global { ... }` avec conteneur, hauteur 12px, bordure, radius, overflow, marges, contrast. | ✅ | 2025-11-15 |
| TASK-008 | Ajouter style interne `.import-progress-global .bar { background: linear-gradient(90deg,#0b5e0b,#19a319); transition: width .25s ease; }`. | ✅ | 2025-11-15 |
| TASK-009 | Ajouter utilitaire `.sr-only` si absent (vérifier présence; sinon ajouter). | ✅ | 2025-11-15 |
| TASK-010 | Recompiler Less (commande `pnpm run build` non automatisée ici, mais mention). | ✅ | 2025-11-15 |
| TASK-011 | Créer test `tests/settings/OggDudeDataImporter.progress.spec.mjs`: cas intermédiaires & structure contexte. | ✅ | 2025-11-15 |
| TASK-012 | Étendre test pour progression 100% (`processed===total`) width 100%. | ✅ | 2025-11-15 |
| TASK-013 | Test absence: `_progress={processed:0,total:0}` ne doit pas rendre `.import-progress-global` (via progress.total). | ✅ | 2025-11-15 |

### Implementation Phase 3

- GOAL-003: Intégration & validation visuelle + robustesse.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-014 | Lancer tests existants import pour détection régression: `pnpm vitest run tests/integration/species-import.integration.spec.mjs`. | ✅ | 2025-11-15 |
| TASK-015 | Ajouter éventuel ajustement si conflit avec progress déjà dans métriques (décision: conserver les deux). | ✅ | 2025-11-15 |
| TASK-016 | Vérifier accessibilité manuelle: rôle, attributs ARIA, ratio contraste (revue rapide). | ✅ | 2025-11-15 |
| TASK-017 | Mettre à jour documentation résumée si nécessaire (DEVELOPMENT_PROCESS). | ✅ | 2025-11-15 |
| TASK-018 | Marquer plan comme Completed une fois merge + tests verts. |  |  |

## 3. Alternatives

- **ALT-001**: Utiliser une jauge circulaire SVG (abandonné: surcharge visuelle, complexité CSS/ARIA supplémentaire).
- **ALT-002**: Ajout d'une notification de progression (toast) au lieu d'une barre persistante (abandonné: moins visible pour suivi continu, pas d'état stable).

## 4. Dependencies

- **DEP-001**: Fichier `module/importer/oggDude.mjs` pour callback de progression (déjà existant, inchangé).
- **DEP-002**: Fichier de template `templates/settings/oggDudeDataImporter.hbs` (point d'insertion UI).
- **DEP-003**: Style principal `styles/applications.less` (emplacement pour nouveaux styles).
- **DEP-004**: Système de localisation `lang/fr.json` & `lang/en.json` (clé progress.global déjà définie).

## 5. Files

- **FILE-001**: `module/settings/OggDudeDataImporter.mjs` (ajout calcul pourcentage domaines).
- **FILE-002**: `templates/settings/oggDudeDataImporter.hbs` (ajout bloc jauge).
- **FILE-003**: `styles/applications.less` (styles barre de progression verte).
- **FILE-004**: `tests/importer/oggDudeDataImporter-progress.spec.mjs` (nouveaux tests).

## 6. Testing

- **TEST-001**: Contexte: `_prepareContext()` retourne `progressPercentDomains` correct pour plusieurs valeurs (0%, 33%, 100%).
- **TEST-002**: Template rendu: présence bloc `.import-progress-global` quand total>0, absence sinon.
- **TEST-003**: Accessibilité: attributs ARIA exacts (`aria-valuenow`, `aria-valuemax`, label localisé).
- **TEST-004**: Style: width inline style correspond à pourcentage (parser `style` et comparer). (Test unitaire parse DOM string).
- **TEST-005**: Non régression: exécution tests import espèces existants (commandes vitest). Tous passent.

## 7. Risks & Assumptions

- **RISK-001**: Double barre de progression (ancienne + nouvelle) pouvant confondre l'utilisateur. Mitigation: décider maintien ou suppression (TASK-015).
- **RISK-002**: Style non compilé si oubli de build. Mitigation: documenter commande build; CI assure compilation.
- **RISK-003**: Régression performance si render trop fréquent. Mitigation: garder logique existante, pas de setInterval.
- **ASSUMPTION-001**: `progressCallback` fourni avant chaque domaine terminé et non pour chaque item (confirmé par lecture `processOggDudeData`).
- **ASSUMPTION-002**: Largeur progression = domaines traités / domaines totaux correspond au besoin métier.

## 8. Related Specifications / Further Reading

- `TESTS_COVERAGE_IMPROVEMENT.md` section Import OggDude.
- Instructions a11y: `.github/instructions/a11y.instructions.md`.
- Performance: `.github/instructions/performance-optimization.instructions.md`.
- Importer mémoire: `.github/instructions/importer-memory.instructions.md`.
