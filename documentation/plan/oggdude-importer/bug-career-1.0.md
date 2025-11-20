---
goal: Correction import OggDude Career (skills, description, source)
version: 1.0
date_created: 2025-11-19
last_updated: 2025-11-19
owner: SWERPG Core Team
status: 'Planned'
tags: [bug, importer, career, oggdude]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Correction ciblée du flux d'import OggDude pour les Items de type `career` (Foundry VTT v13, système SWERPG). Actuellement les careers importées présentent `system.careerSkills = []` et `system.description = ""`; la source (livre + page) n'est pas exposée. Objectif : fiabiliser le mapping (codes de compétences → objets `{id}`), assainir la description (suppression / conversion des balises OggDude `[H4]`, `[B]`, etc.), intégrer la référence source, et assurer réimport/migration cohérente sans casser données existantes.

## 1. Requirements & Constraints

- **REQ-001**: Mapper correctement les compétences de carrière depuis le XML (`<CareerSkills><Key>...</Key></CareerSkills>`) vers `system.careerSkills` (liste ordonnée de max 8 objets `{id}` sans doublons).
- **REQ-002**: Assainir la description OggDude : suppression/normalisation des balises (`[H1]`, `[H4]`, `[B]`, `[I]`, etc.) et trimming → stocker HTML minimal dans `system.description` (champ HTMLField du modèle).
- **REQ-003**: Capturer les informations de source (texte + attribut Page) et les stocker de façon cohérente (flags `flags.swerpg.oggdudeSource`, `flags.swerpg.oggdudeSourcePage`).
- **REQ-004**: Conserver la clé originale OggDude dans `flags.swerpg.oggdudeKey` (déjà partiellement présent) et l'utiliser pour une éventuelle migration/réimport ciblée.
- **REQ-005**: Gérer les compétences inconnues sans échec d'import (fail-soft), enregistrer métriques `unknownCareerSkills` pour observabilité.
- **REQ-006**: Supporter formes XML variables (tableau, objet imbriqué `CareerSkills.CareerSkill.Key`, alias possibles) via extraction robuste.
- **REQ-007**: Éviter duplication des compétences (déduplication ordonnée) et tronquer à 8 selon le schéma métier.
- **REQ-008**: Réimport d'une même career met à jour description / skills / source (overwrite contrôlé) sans créer de doublons quand la clé OggDude est identique.
- **REQ-009**: Option migration de réparation : fournir utilitaire pour mettre à jour careers existantes vides (scope minimal, déclenchable manuellement).
- **REQ-010**: Journaliser stats d'import avant/après mapping (`total`, `skillCount`, `unknownCount`).
- **REQ-011**: Fournir tests unitaires couvrant extraction, mapping, sanitation, source; tests d'intégration import complet.
- **REQ-012**: Performances raisonnables (pas de surcoût >10% sur lot careers vs version actuelle).
- **REQ-013**: Ne pas introduire de régression sur feuilles (`career.mjs` sheet) affichant les compétences.
- **REQ-014**: Description assainie ne doit pas dépasser limite configurable (ex: 2000 chars), tronquage propre si nécessaire.
- **REQ-015**: Code conforme aux guidelines (ApplicationV2 patterns, validation schéma, logging centralisé).
- **REQ-016**: Internationalisation intacte (pas de chaîne non localisée ajoutée côté UI).
- **REQ-017**: Sécurité: ne pas exécuter ni laisser HTML arbitraire dangereux (sanitize côté importer).

- **SEC-001**: Empêcher injection XSS (nettoyage balises, échapper contenu inattendu, pas d'évaluation dynamique).
- **SEC-002**: Ne pas charger de ressources externes à partir du XML importé.

- **CON-001**: Compatibilité Foundry VTT v13.x (API stable seulement).
- **CON-002**: Ne pas modifier schéma `SwerpgCareer` (aucun champ ajouté dans `system.` pour source; utiliser flags pour cette itération).
- **CON-003**: Préserver structure actuelle des SetField `{id}` pour `careerSkills` (aligné avec sheet `career.mjs`).
- **CON-004**: Approche minimal-invasive (pas de refactor global importeur).
- **CON-005**: Rester idempotent sur réimport (même clé → mise à jour unique Item).
- **CON-006**: Logging via `logger.debug/warn` existant, pas de console raw.
- **CON-007**: Accessibilité: description convertie conserve hiérarchie (ex: H4 → `<h4>`), lisible par screen readers.
- **CON-008**: Pas de dépendance additionnelle NPM (réutiliser utilitaires `sanitizeDescription`).

- **PAT-001**: Utiliser `sanitizeDescription()` déjà présent (`module/importer/utils/text.mjs`) avant assignation `system.description`.
- **PAT-002**: Extraction skills via fonction dédiée `extractRawCareerSkillCodes` + transformation `mapCareerSkills` (déjà existantes; compléter tests + robustesse).
- **PAT-003**: Source stockée dans flags pour éviter migration schéma rapide; future évolution pourra créer champ `system.source`.
- **PAT-004**: Utiliser pattern stats import (reset / increment) déjà utilisé pour careers.
- **PAT-005**: Migration de réparation s'appuie sur `oggdudeKey` pour ciblage.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Audit détaillé du code import Career et confirmation du modèle / lacunes (description non sanitizée, source absente).

| Task     | Description                                                                                                      | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Inspecter `module/importer/items/career-ogg-dude.mjs` (careerMapper, mapCareerSkills, extractRawCareerSkillCodes). |           |           |      |
| TASK-002 | Vérifier modèle `module/models/career.mjs` (HTMLField description, SetField careerSkills).                        |           |           |      |
| TASK-003 | Confirmer absence mapping source dans career importer; rechercher usages de `oggdudeSource` ailleurs.             | TASK-001  |           |      |
| TASK-004 | Lister tags OggDude à nettoyer (collecter échantillons) pour description.                                         | TASK-001  |           |      |
| TASK-005 | Recenser tests existants pour importer career (aucun dédié) pour définir couverture manquante.                    |           |           |      |
| TASK-006 | Identifier mécanisme réimport (clé oggdudeKey, dossier, mapping builder dans `oggDude.mjs`).                      | TASK-001  |           |      |
| TASK-007 | Finaliser exigences / hypothèses (format source flags) et verrouiller REQ/CON/PAT.                                | TASK-003  |           |      |

### Implementation Phase 2

- GOAL-002: Concevoir modifications ciblées (sanitization, source flags, tests) et stratégie réimport/migration.

| Task     | Description                                                                                                                         | DependsOn | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Spécifier transformation description: intégrer `sanitizeDescription()` (limite longueur, conversion H4/B/I).                         | TASK-004  |           |      |
| TASK-009 | Définir format flags source: `flags.swerpg.oggdudeSource` (string livre), `flags.swerpg.oggdudeSourcePage` (number).                 | TASK-003  |           |      |
| TASK-010 | Décrire adaptation careerMapper: ajouter extraction source + sanitation description avant construction de l'objet.                 | TASK-008  |           |      |
| TASK-011 | Spécifier logique réimport overwrite: rechercher Item par `flags.swerpg.oggdudeKey` puis `update` plutôt que création doublon.      | TASK-006  |           |      |
| TASK-012 | Définir utilitaire migration réparation (script ou fonction) pour patcher careers vides existantes (optionnel selon M-1/M-2).       | TASK-007  |           |      |
| TASK-013 | Concevoir jeux de données tests (XML minimal, avec unknown skills, variations structure CareerSkills).                              | TASK-002  |           |      |
| TASK-014 | Plan de tests unitaires (mapCareerSkills, extractRawCareerSkillCodes, sanitation).                                                  | TASK-013  |           |      |
| TASK-015 | Plan test d'intégration import (buildCareerContext + exécution mapper) vérifiant overwrite vs création.                             | TASK-011  |           |      |
| TASK-016 | Plan test UI (Playwright) ouvrant sheet career pour vérifier affichage compétences & description.                                   | TASK-011  |           |      |
| TASK-017 | Définir critères rollback (si skill mapping vide après patch → revert commit / désactiver migration).                               | TASK-011  |           |      |

### Implementation Phase 3

- GOAL-003: Implémenter modifications, tests, migration utilitaire et préparer rollback/documentation.

| Task     | Description                                                                                                                                    | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-018 | Modifier `careerMapper`: appliquer `sanitizeDescription(description)` avant assignation, extraire source (XML `<Source Page="">`).            | TASK-010  | done | 2025-11-19 |
| TASK-019 | Ajouter flags source dans objet retourné; préserver flags existants (`oggdudeKey`).                                                             | TASK-009  | done | 2025-11-19 |
| TASK-020 | Implémenter recherche & overwrite: adapter pipeline (probablement dans création d'Item en amont du save).                                      | TASK-011  | in-progress |      |
| TASK-021 | Créer utilitaire migration `module/importer/migrations/repair-careers.mjs` (parcours Items type career flags vides → patch).                   | TASK-012  | in-progress |      |
| TASK-022 | Écrire tests Vitest `tests/importer/career-import.spec.mjs` (unit + integration).                                                               | TASK-014  |           |      |
| TASK-023 | Écrire tests Playwright `tests/ui/career-import.spec.ts` (import puis vérification UI).                                                         | TASK-016  |           |      |
| TASK-024 | Ajouter métrique `unknownCareerSkills` dans stats si non existante ou vérifier incrementation (career-import-utils.mjs).                        | TASK-018  |           |      |
| TASK-025 | Mettre à jour documentation utilisateur `documentation/importer/README.md` (section careers) avec source & réimport.                            | TASK-020  |           |      |
| TASK-026 | Ajouter section risques & rollback dans `MIGRATION_LOGGING_PROGRESSIVE.md` si nécessaire.                                                       | TASK-017  |           |      |
| TASK-027 | Vérifier non-régression sur sheet `module/applications/sheets/career.mjs` (affichage skill badges).                                             | TASK-018  |           |      |
| TASK-028 | Audit performance: mesurer durée import careers avant/après (log timestamps) et valider CON-012 (<10% overhead).                                | TASK-018  |           |      |
| TASK-029 | Vérifier absence XSS: contenu description ne contient pas balises script/style non autorisées (inspection tests).                               | TASK-022  |           |      |
| TASK-030 | Finaliser changelog `CHANGELOG.md` section bugfix careers.                                                                                      | TASK-025  |           |      |

## 3. Alternatives

- **ALT-001**: Ajouter champs `system.source.book/page` dans schéma dès maintenant – rejeté (impliquerait migration schéma; flags suffisent pour bugfix rapide).
- **ALT-002**: Réécrire intégralement l'importeur career avec pipeline générique – rejeté (scope trop large pour correction ciblée, augmente risques de régression).
- **ALT-003**: Ignorer la description (laisser brute) – rejeté (UX médiocre, non conforme aux autres imports qui assainissent).
- **ALT-004**: Supprimer les balises sans conversion HTML heading – rejeté (perte sémantique hiérarchie, impact a11y).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x.
- **DEP-002**: Configuration `SYSTEM.SKILLS` chargée avant import.
- **DEP-003**: Utilitaires `sanitizeDescription`, `mapOggDudeSkillCodes` existants.
- **DEP-004**: Logger central `module/utils/logger.mjs`.

## 5. Files

- **FILE-001**: `module/importer/items/career-ogg-dude.mjs` – Mapping career (description, skills, source flags à modifier).
- **FILE-002**: `module/importer/oggDude.mjs` – Registre context builder career; possible adaptation overwrite logique.
- **FILE-003**: `module/importer/utils/text.mjs` – `sanitizeDescription` (aucune modif attendue, réutilisation).
- **FILE-004**: `module/importer/utils/career-import-utils.mjs` – Stats & métriques; vérifier ajout unknown skills.
- **FILE-005**: `module/models/career.mjs` – Schéma (lecture; pas de modif, valider compat SetField `{id}`).
- **FILE-006**: `module/applications/sheets/career.mjs` – Sheet usage careerSkills (validation affichage post-fix).
- **FILE-007**: `module/importer/migrations/repair-careers.mjs` – Nouveau fichier utilitaire de migration réparation.
- **FILE-008**: `tests/importer/career-import.spec.mjs` – Nouveau tests Vitest unit & integration.
- **FILE-009**: `tests/ui/career-import.spec.ts` – Nouveau tests Playwright UI.
- **FILE-010**: `documentation/importer/README.md` – Documentation utilisateur (section careers).
- **FILE-011**: `CHANGELOG.md` – Entrée bugfix careers.

## 6. Testing

- **TEST-001**: Unit `extractRawCareerSkillCodes` – Cas: structure imbriquée, tableau direct, objets mixtes, vide.
  - REQ: 006, 007.
- **TEST-002**: Unit `mapCareerSkills` – Cas: doublons, >8 codes, inconnus, strict vs non-strict, ordre préservé.
  - REQ: 001, 005, 007.
- **TEST-003**: Unit description sanitation – Entrée avec `[H4][B][I]` / retours ligne → sortie HTML minimal tronquée (si > maxLength).
  - REQ: 002, 014, 017.
- **TEST-004**: Integration `careerMapper` – Objet XML minimal → Item system.careerSkills non vide, description assainie, flags source présents.
  - REQ: 001, 002, 003, 004.
- **TEST-005**: Integration réimport – Deux passes sur même career (même key) → `update` pas doublon, description mise à jour si modifiée.
  - REQ: 008.
- **TEST-006**: Integration compétences inconnues – XML avec codes invalides → mapping filtre, métriques unknown incrémentées.
  - REQ: 005, 010.
- **TEST-007**: Migration réparation – Injecter career existante vide puis exécuter utilitaire → champs remplis.
  - REQ: 009.
- **TEST-008**: Performance – Mesurer temps import 50 careers avant/après (delta <10%).
  - REQ: 012.
- **TEST-009**: UI Playwright – Import puis ouverture sheet career; vérifier nombre badges skill = 8, description visible (heading/p paragraphe).
  - REQ: 013.
- **TEST-010**: Sécurité – Vérifier qu'une description contenant `<script>` est neutralisée (non présent dans output / échappé).
  - REQ: 017, SEC-001.

## 7. Risks & Assumptions

- **RISK-001**: Variation inattendue de structure XML (balises non prévues) → extraction incomplète.
- **RISK-002**: Réimport logique overwrite pourrait impacter Items custom modifiés manuellement.
- **RISK-003**: Migration réparation risque sur données modifiées par MJ (écrasement contenu personnalisé).
- **RISK-004**: Performance dégradée si sanitation implémente regex coûteuses sur gros volumes.
- **RISK-005**: Fausse identification source si `<Source>` absent ou multivalué.
- **ASSUMPTION-001**: `careerSkills` attend objets `{id}` (confirmé par schéma SetField + sheet usage).
- **ASSUMPTION-002**: Aucun champ `system.source` officiel; utilisation flags acceptable court-terme.
- **ASSUMPTION-003**: `sanitizeDescription` gère déjà sécurité XSS basique (sinon ajustement futur hors scope bugfix).
- **ASSUMPTION-004**: Stratégie migration M-1 adoptée (facultatif M-2 utilitaire réparation manuel).

## 8. Related Specifications / Further Reading

- `/documentation/spec/oggdude-importer/bug-career-import-data-needs-1.0.md` (source besoins).
- `module/importer/items/career-ogg-dude.mjs` (implémentation actuelle mapping careers).
- `module/importer/utils/text.mjs` (sanitization description).
- `module/models/career.mjs` (schéma DataModel Career).
- Foundry VTT API v13 Reference (Items, DataModel, ApplicationV2).
- `/documentation/DEVELOPER_GUIDE_LOGGING.md` (pratiques logging).
- `/documentation/strategie-tests.md` (stratégie tests globale projet).
- `/documentation/strategie-tests.md` (stratégie tests globale projet).
