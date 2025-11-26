---
goal: Auto‑sélection et mise en évidence des Career Skills importées (OggDude) sur la feuille de carrière
version: 1.0
date_created: 2025-11-19
last_updated: 2025-11-19
owner: SWERPG Core Team
status: 'Planned'
tags: [feature, career-sheet, oggdude-importer, ui, data]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

La feuille d'Item "career" doit afficher automatiquement les compétences de carrière issues d'un import OggDude (balise `<CareerSkills>` du XML, ex. Ace.xml) en les marquant actives (classe CSS `active`) et en comptant le nombre de compétences sélectionnées. Actuellement, le mapping fonctionne partiellement mais la robustesse face aux différentes structures XML, la validation du maximum (8), la gestion des doublons et codes inconnus, ainsi que la traçabilité/tests sont insuffisantes ou non explicitement spécifiées. Cette fonctionnalité améliore l'expérience MJ/Joueur lors de la configuration d'une carrière et garantit la cohérence entre données importées et interface Foundry VTT v13.

## 1. Requirements & Constraints

- **REQ-001**: Extraire les codes de compétences de carrière depuis toutes les variantes possibles de structure XML `<CareerSkills>` (liste `<Key>`, tableau simple, objets imbriqués) et produire un tableau nettoyé de codes bruts.
- **REQ-002**: Mapper chaque code OggDude vers un identifiant de compétence interne Foundry (`SYSTEM.SKILLS`) en filtrant doublons et codes inconnus.
- **REQ-003**: Limiter le nombre de compétences mappées à 8 (business rule) en respectant l'ordre initial et dédupliqué.
- **REQ-004**: Sur la feuille Career (`CareerSheet`), marquer automatiquement comme actives (`skill.isActive=true`, CSS `active`) les compétences présentes dans `system.careerSkills` du document.
- **REQ-005**: Actualiser dynamiquement le compteur affiché `(selectedSkills)` dans le template `career-config.hbs` (ex: "(5)").
- **REQ-006**: Empêcher la sélection manuelle au‐delà de 8 compétences (côté UI + côté modèle) avec feedback utilisateur localisé.
- **REQ-007**: Conserver la persistance après toggle (ajout/suppression) via mise à jour de `system.careerSkills` sans corruption d'autres champs.
- **REQ-008**: Ignorer silencieusement les codes inconnus tout en journalisant (`logger.warn`) la liste des codes écartés pour observabilité.
- **REQ-009**: Fournir métriques d'import spécifiques (compteur total skills importées, inconnues) agrégées avec statistiques existantes (réutilisation career import stats).
- **REQ-010**: Assurer compatibilité avec le modèle `SwerpgCareer` (SetField) et sa validation (0..8) sans exceptions inattendues.
- **REQ-011**: Garantir que la description et les flags déjà présents (source, oggdudeKey) ne sont pas affectés par la logique de skills.
- **REQ-012**: Internationaliser tout message UI ajouté (ex: dépassement de limite) via clés `CAREER.*`.
- **REQ-013**: Respecter Accessibilité (a11y): distinguer visuellement active/inactive avec contraste suffisant; focus clavier sur éléments togglables.
- **REQ-014**: Performance: mapping + préparation contexte doivent rester <5ms pour 50 skills (`SYSTEM.SKILLS` complet) sur machine standard.
- **REQ-015**: Ajout de tests Vitest couvrant extraction, mapping, validation limite, toggling, compteur.
- **REQ-016**: Ajout tests Playwright validant affichage automatique et comportement d'interdiction de sélection >8.
- **REQ-017**: Edge cases couverts: absence `<CareerSkills>`, codes en double, plus de 8 codes, codes inconnus, mélange casse, tableau vide.
- **REQ-018**: Fiabiliser réimport: une carrière réimportée met à jour `system.careerSkills` conformément au nouveau XML sans créer doublons.
- **REQ-019**: Documenter la fonctionnalité dans `documentation/` (guide import + feuille carrière).
- **REQ-020**: Sécurité: prévenir injection via skill IDs (assurer qu'on ne traite que clés présentes dans `SYSTEM.SKILLS`).

- **CON-001**: Foundry VTT v13.x stable APIs uniquement (ApplicationV2, DataModel).
- **CON-002**: Pas de modification du schéma `SwerpgCareer` (pas de nouveaux champs système, uniquement usage existant SetField).
- **CON-003**: Pas de dépendance NPM additionnelle, usage utilitaires existants.
- **CON-004**: Conserver style actuel (classes `active`/`inactive`) sans restructuration CSS majeure.
- **CON-005**: Code minimal‐invasif: ne pas refactoriser globalement l'importeur hors logique CareerSkills.
- **CON-006**: Gestion erreurs silencieuse côté extraction (retour tableau vide) + logging.
- **CON-007**: Si `<CareerSkills>` absent: interface affiche toutes les skills inactives et compteur = 0.
- **CON-008**: Limite 8 imposée côté modèle déjà (validation SetField) → éviter double lancer d'exception.
- **CON-009**: Tests ne doivent pas dépendre de présence packs; utiliser mocks `SYSTEM.SKILLS`.
- **CON-010**: Accessibilité: focusable éléments toggle doivent conserver ordre lecture.
- **CON-011**: Template Handlebars ne doit pas contenir de logique métier lourde (préparation dans `_prepareContext`).

- **PAT-001**: Extraction codes via fonction dédiée `extractRawCareerSkillCodes` (déjà présente dans importeur) réutilisée/renforcée.
- **PAT-002**: Mapping filtrant + déduplication avant tronquage (`mapCareerSkills`).
- **PAT-003**: Contexte sheet: enrichir `careerSkills` avec propriétés `isActive`, `extraCss`; recalcul compteur `selectedSkills`.
- **PAT-004**: Toggling via actions `toggleCareer` (pattern ApplicationV2 actions).
- **PAT-005**: Logging avec `logger.debug/warn` pour observabilité; pas de `console.*` direct.
- **PAT-006**: Tests unitaires isolent mapping (pure functions) pour performance & robustesse.
- **PAT-007**: UI test Playwright cible classes `.career.active` / `.career.inactive` et compteur.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse & cartographie du code existant + consolidation exigences.

| Task     | Description                                                                                              | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Lire `module/importer/items/career-ogg-dude.mjs` pour confirmer logique actuelle d'extraction & mapping. |           |           |      |
| TASK-002 | Analyser `module/applications/sheets/career.mjs` (#prepareCareerSkills, toggling) et template HBS.       |           |           |      |
| TASK-003 | Vérifier modèle `module/models/career.mjs` (SetField validation 0..8).                                   |           |           |      |
| TASK-004 | Lister variantes XML attendues (ex: Ace.xml, structure manquante, liste simple).                         | TASK-001  |           |      |
| TASK-005 | Identifier points de logging & métriques disponibles (career import stats).                              | TASK-001  |           |      |
| TASK-006 | Recenser tests existants liés à career (chercher `career-ogg-dude.spec.mjs`).                            |           |           |      |
| TASK-007 | Formaliser REQ/CON/PAT définitifs (ajuster si découverte divergente).                                    | TASK-002  |           |      |

### Implementation Phase 2

- GOAL-002: Conception précise (fonctions, mises à jour UI, tests).

| Task     | Description                                                                                                       | DependsOn | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Spécifier renforcement `extractRawCareerSkillCodes`: gérer objets orphelins, filtrage types non-string.           | TASK-001  |           |      |
| TASK-009 | Définir pipeline mapping final: extraction → map → déduplication → tronquage → assignation `system.careerSkills`. | TASK-008  |           |      |
| TASK-010 | Concevoir mécanisme d'overwrite sur réimport (rechercher item par flag oggdudeKey, update skills).                | TASK-009  |           |      |
| TASK-011 | Décrire adaptation `#prepareCareerSkills` (ajout attribut focus/tabindex si a11y requis).                         | TASK-002  |           |      |
| TASK-012 | Définir logique côté toggling pour empêcher ajout si déjà 8 (grâce à contrôle préalable avant update).            | TASK-011  |           |      |
| TASK-013 | Spécifier message UI localisé sur dépassement (nouvelle clé i18n).                                                | TASK-012  |           |      |
| TASK-014 | Plan détaillé tests Vitest (unit extraction/mapping, integration sheet toggling, réimport).                       | TASK-009  |           |      |
| TASK-015 | Plan Playwright: ouvrir sheet carrière, vérifier auto-sélection, empêcher 9ème ajout.                             | TASK-011  |           |      |
| TASK-016 | Définir instrumentation performance (mesure temps mapping dans test).                                             | TASK-014  |           |      |
| TASK-017 | Documentation: section ajoutée dans `documentation/` (guide carrière & import).                                   | TASK-013  |           |      |

### Implementation Phase 3

- GOAL-003: Implémentation & validation.

| Task     | Description                                                                                                               | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-018 | Renforcer `extractRawCareerSkillCodes` dans `career-ogg-dude.mjs` (filtrage types, robustesse).                           | TASK-008  |           |      |
| TASK-019 | Ajuster `mapCareerSkills` (ordre, déduplication stable, tronquage) + logging codes inconnus.                              | TASK-009  |           |      |
| TASK-020 | Implémenter réimport overwrite (recherche par flag oggdudeKey avant création).                                            | TASK-010  |           |      |
| TASK-021 | Étendre stats import career: totalSkills, unknownSkills (déjà partiel) si besoin (utilitaire career-import-utils).        | TASK-019  |           |      |
| TASK-022 | Modifier `CareerSheet.#prepareCareerSkills` pour ajouter data attributes a11y (`aria-selected`, `tabindex`).              | TASK-011  |           |      |
| TASK-023 | Implémenter blocage toggling >8: vérification taille `document.system.careerSkills` avant ajout + notification localisée. | TASK-012  |           |      |
| TASK-024 | Ajouter nouvelle clé i18n message dépassement dans `lang/en.json` & `lang/fr.json`.                                       | TASK-013  |           |      |
| TASK-025 | Mettre à jour template `career-config.hbs` si ajout attributs a11y (ex: role="button").                                   | TASK-022  |           |      |
| TASK-026 | Créer tests Vitest unitaires `tests/importer/career-skills-mapping.spec.mjs`.                                             | TASK-014  |           |      |
| TASK-027 | Créer tests Vitest intégration `tests/applications/career-sheet.spec.mjs` (toggle, limite, compteur).                     | TASK-014  |           |      |
| TASK-028 | Créer test Vitest réimport `tests/importer/career-reimport.spec.mjs`.                                                     | TASK-014  |           |      |
| TASK-029 | Créer test performance (mesure temps mapping 50 skills fictives) `tests/importer/career-performance.spec.mjs`.            | TASK-016  |           |      |
| TASK-030 | Créer test Playwright `tests/ui/career-sheet-auto-selection.spec.ts`.                                                     | TASK-015  |           |      |
| TASK-031 | Documentation mise à jour `documentation/importer/README.md` + `documentation/modules/career-sheet.md`.                   | TASK-017  |           |      |
| TASK-032 | Vérifier absence régression description/source flags (test snapshot item).                                                | TASK-019  |           |      |
| TASK-033 | Ajouter entrée CHANGELOG bugfix/feature.                                                                                  | TASK-031  |           |      |
| TASK-034 | Audit a11y manuel (focus, lecture screen reader) & ajustements mineurs nécessaires.                                       | TASK-025  |           |      |
| TASK-035 | Validation finale & rollback plan (si échecs mapping généralisés) documenté dans MIGRATION_LOGGING_PROGRESSIVE.md.        | TASK-030  |           |      |

## 3. Alternatives

- **ALT-001**: Introduire champ `system.maxCareerSkills` configurable → rejeté (alourdit schéma; règle fixe 8).
- **ALT-002**: Calcul du compteur coté template en re-scan de DOM → rejeté (logique métier doit rester dans contexte pour performance/testabilité).
- **ALT-003**: Refactor complet sheet carrière avec composant UI V2 séparé → rejeté (scope trop large pour feature ciblée).
- **ALT-004**: Ajouter dépendance externe pour a11y/ARIA automatisée → rejeté (surcoût, dépendance inutile).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13 ApplicationV2 / DataModel.
- **DEP-002**: `SYSTEM.SKILLS` chargé avant ouverture sheet.
- **DEP-003**: Fichier importé OggDude (XML Careers) déjà parsé via importeur existant.
- **DEP-004**: Logger central `module/utils/logger.mjs`.
- **DEP-005**: Internationalisation via `lang/en.json`, `lang/fr.json`.

## 5. Files

- **FILE-001**: `module/importer/items/career-ogg-dude.mjs` – Extraction/mapping career skills (renforcement + overwrite).
- **FILE-002**: `module/importer/utils/career-import-utils.mjs` – Statistiques import career (compteurs supplémentaires).
- **FILE-003**: `module/applications/sheets/career.mjs` – Contexte & toggling (a11y, blocage >8).
- **FILE-004**: `templates/sheets/partials/career-config.hbs` – Affichage compétences + compteur; éventuels attributs ARIA.
- **FILE-005**: `module/models/career.mjs` – Validation (lecture; pas de modif attendue).
- **FILE-006**: `lang/en.json`, `lang/fr.json` – Ajout clé message limite atteinte.
- **FILE-007**: `tests/importer/career-skills-mapping.spec.mjs` – Unit mapping/extraction.
- **FILE-008**: `tests/applications/career-sheet.spec.mjs` – Integration toggling/limite.
- **FILE-009**: `tests/importer/career-reimport.spec.mjs` – Réimport overwrite.
- **FILE-010**: `tests/importer/career-performance.spec.mjs` – Performance mapping.
- **FILE-011**: `tests/ui/career-sheet-auto-selection.spec.ts` – Playwright UI.
- **FILE-012**: `documentation/importer/README.md` – Section mise à jour.
- **FILE-013**: `documentation/modules/career-sheet.md` – Nouveau guide feuille carrière.
- **FILE-014**: `CHANGELOG.md` – Entrée feature.
- **FILE-015**: `MIGRATION_LOGGING_PROGRESSIVE.md` – Ajout rollback note.

## 6. Testing

- **TEST-001**: Unit extraction – Entrées: XML absent, tableau simple, objets imbriqués, codes non-string → sortie tableau filtré (REQ-001, REQ-017).
- **TEST-002**: Unit mapping – Doublons, >8 codes, codes inconnus, ordre stable; vérifie tronquage & déduplication (REQ-002, REQ-003, REQ-008).
- **TEST-003**: Integration importer – Ace.xml: 8 codes → `system.careerSkills` list correspondante; aucune exception (REQ-001 à REQ-004, REQ-018).
- **TEST-004**: Integration réimport – Modifier XML (retirer 2 codes) → après réimport item reflète nouvelle liste (REQ-018).
- **TEST-005**: Sheet context – `#prepareCareerSkills` marque classes active/inactive, compteur correct (REQ-004, REQ-005).
- **TEST-006**: Toggling ajout – Ajout jusqu'à 8 puis tentative 9ème: pas d'ajout + message localisé (REQ-006, REQ-012, REQ-023).
- **TEST-007**: Toggling suppression – Retirer skill puis ajouter autre (compteur décrémente/incrémente) (REQ-007).
- **TEST-008**: Performance – Mesurer temps mapping 50 skills fictives (<5ms) (REQ-014).
- **TEST-009**: Sécurité – Injection tentative skillId inconnu/ne faisant pas partie de `SYSTEM.SKILLS` ignorée (REQ-020, REQ-008).
- **TEST-010**: Playwright UI – Ouvrir sheet, vérifier 8 `.career.active`, compteur (8), bloquer ajout 9ème, focus navigation clavier séquentiel (REQ-004, REQ-005, REQ-006, REQ-013, REQ-016).
- **TEST-011**: Snapshot item – Description & flags source intactes après modifications skills (REQ-011).
- **TEST-012**: i18n – Vérifier clés présentes pour message limite FR & EN (REQ-012).

## 7. Risks & Assumptions

- **RISK-001**: Incohérence codes OggDude non mappables → liste partielle (atténuée par logging & filtrage).
- **RISK-002**: Réimport overwrite pourrait écraser modifications manuelles de l'utilisateur (documenter comportement).
- **RISK-003**: Limite >8 déclenche exception DataModel si contournement direct (nécessité de garde UI & pré‐validation).
- **RISK-004**: Performance dégradée si regex excessives ajoutées (limiter opérations O(n)).
- **RISK-005**: Accessibilité insuffisante si focus non géré; risque pour utilisateurs clavier.
- **ASSUMPTION-001**: Aucun changement requis dans schéma DataModel (validation existante suffisante).
- **ASSUMPTION-002**: `SYSTEM.SKILLS` contient toutes les compétences référencées par OggDude (sinon codes inconnus loggés).
- **ASSUMPTION-003**: Importeur OggDude exécute mapping avant ouverture d'une feuille carrière.
- **ASSUMPTION-004**: Pas de besoin de migration DB globale; réimport agit comme mécanisme de correction.
- **ASSUMPTION-005**: Screenshot fourni reflète design cible (utilisation classes active/inactive persistantes).

## 8. Related Specifications / Further Reading

- `module/importer/items/career-ogg-dude.mjs` – Logiciel mapping carrière.
- `module/applications/sheets/career.mjs` – Feuille Item carrière.
- `templates/sheets/partials/career-config.hbs` – Template compétences carrière.
- `module/models/career.mjs` – Schéma DataModel.
- Documentation Foundry VTT v13 API (DataModel, ApplicationV2).
- `/documentation/DEVELOPER_GUIDE_LOGGING.md` – Guide logging.
- `/documentation/strategie-tests.md` – Stratégie tests globale.
- Ace.xml (exemple OggDude carrière).
