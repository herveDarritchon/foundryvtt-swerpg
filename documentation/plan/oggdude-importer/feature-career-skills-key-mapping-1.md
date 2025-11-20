---
goal: Mise en place d'un mapping déterministe des CareerSkills OggDude via leurs codes (Key) et ajout des compétences manquantes (COMP, CORE, PERC, SKUL, variante STEAL) dans le système SWERPG
version: 1
date_created: 2025-11-19
last_updated: 2025-11-19
owner: swerpg-plan-agent
status: 'Planned'
tags: [feature, importer, career, skills, mapping]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Objectif: permettre à l'import OggDude des carrières de sélectionner correctement les compétences de carrière à partir des codes `<CareerSkills><Key>` (ex: COMP, CORE, DECEP, PERC, SKUL, STEAL) en alignant la table de mapping et le registre `SYSTEM.SKILLS`. Actuellement, la table `OGG_DUDE_SKILL_MAP` ne couvre pas ces abréviations et contient une incohérence PERC→perception alors que le registre système utilise `awareness`. Les tests unitaires import carrière font référence à `perception`. Le plan introduit les compétences manquantes dans `module/config/skills.mjs` et étend le mapping pour supporter toutes les variantes codes OggDude, avec accessibilité renforcée sur la feuille carrière pour la sélection (data attributs et ARIA). Basé sur `documentation/importer/import-career.md`.

## 1. Requirements & Constraints

- **REQ-001**: Extraire les codes de compétences depuis toutes les formes XML supportées (`CareerSkills` tableau, `CareerSkills.CareerSkill[].Key`, variantes `Skill`, `Skills`, `Key`).
- **REQ-002**: Supporter les abréviations OggDude supplémentaires: COMP (Computers), CORE (Coordination), PERC (Perception), SKUL (Skulduggery), STEAL (Stealth) en plus des codes existants.
- **REQ-003**: Aligner le mapping PERC avec une compétence système valide (création de `perception`) pour cohérence avec les tests existants et usage SW Star Wars Edge.
- **REQ-004**: Ajouter les définitions manquantes des compétences `computers`, `coordination`, `perception`, `skulduggery` dans `SYSTEM.SKILLS` avec catégories appropriées.
- **REQ-005**: Étendre `OGG_DUDE_SKILL_MAP` pour inclure codes longs et courts (ex: COMPUTERS, COMP; COORDINATION, CORE; PERCEPTION, PERC; SKULDUGGERY, SKUL; STEAL, STEA, STEALTH).
- **REQ-006**: Conserver limitation de 0–8 compétences de carrière (validation existante + messages UI).
- **REQ-007**: Déduplication ordonnée des compétences mappées (préserver premier ordre d'apparition).
- **REQ-008**: Journaliser (warn) les codes inconnus ignorés pour observabilité sans casser l'import.
- **REQ-009**: Mode strict (`strictSkills`) filtre les ids non présents dans `SYSTEM.SKILLS` après ajout des nouvelles compétences.
- **REQ-010**: Fournir tests unitaires couvrant nouveaux codes et variantes, y compris synonymes (STEAL vs STEALTH, CORE vs COORDINATION).
- **REQ-011**: Fournir tests d'intégration vérifiant mapping complet d'un exemple de carrière (Sentinel) avec les nouveaux codes.
- **REQ-012**: Mise à jour localisation `lang/en.json` & `lang/fr.json` pour nouvelles compétences (labels + abréviations + catégories si nécessaire).
- **REQ-013**: Accessibilité: chaque élément compétence sur la feuille carrière expose `aria-selected`, `tabindex`, et un `data-code` contenant le code clé si disponible (améliorer navigation clavier & voice access).
- **REQ-014**: Ne pas altérer les carrières déjà importées (absence d'obligation de migration automatique) – compatibilité ascendante.
- **REQ-015**: Performance: mapping en O(n) sur nombre de codes (≤ 12 typiquement) sans allocations excessives.
- **REQ-016**: Code sécurisé: aucune exécution de contenu XML arbitraire (lecture pure de strings), validation d'entrée.
- **SEC-001**: Empêcher injection de code via description (sanitization déjà existante, conserver usage `sanitizeDescription`).
- **CON-001**: Compatibilité Foundry VTT v13 (API ApplicationV2, DataModel inchangée).
- **CON-002**: Ne pas casser API publique existante (fonctions `careerMapper`, `mapCareerSkills`).
- **CON-003**: Structure `SYSTEM.SKILLS` doit rester cohérente (catégories `exp`, `kno`, `soc`).
- **CON-004**: Localisation: suivre patron `SKILLS.<NAME>` et `SKILLS.<NAME>Abbr`.
- **CON-005**: Spécification d'origine (`import-career.md`) partielle – extensions justifiées par abréviations utilisateur (COMP, CORE, SKUL, PERC, STEAL).
- **CON-006**: Tests existants référencent `perception`; éviter régression en ajoutant la compétence plutôt que remapper vers `awareness`.
- **PAT-001**: Étendre `SYSTEM.SKILLS` en ajoutant objets simples {id, category, characteristics} alignés sur conventions existantes.
- **PAT-002**: Centraliser mapping codes dans `OGG_DUDE_SKILL_MAP` (uppercase), aucune logique de fallback heuristique.
- **PAT-003**: Injection test via `globalThis.SYSTEM.SKILLS` reste supportée (tests unitaires isolés).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse & validation du périmètre (codes manquants, incohérences mapping/tests) + décisions architecture.

| Task     | Description                                                                                                      | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Inventorier codes OggDude à ajouter (COMP, CORE, PERC, SKUL, STEAL) et vérifier absence dans `SYSTEM.SKILLS`.     |           |           |      |
| TASK-002 | Confirmer incohérence PERC (tests vs config) et décider ajout compétence `perception` (PAT-001).                 | TASK-001  |           |      |
| TASK-003 | Définir catégories des nouvelles compétences: computers→kno, coordination→exp, perception→exp, skulduggery→soc. | TASK-002  |           |      |
| TASK-004 | Recenser fichiers impactés (`FILE-001`..`FILE-010`).                                                             |           |           |      |
| TASK-005 | Finaliser liste REQ / CON / PAT (ajouts validés).                                                                | TASK-004  |           |      |

### Implementation Phase 2

- GOAL-002: Conception détaillée des modifications code, mapping, localisation et a11y feuille carrière.

| Task     | Description                                                                                                                   | DependsOn | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-006 | Spécifier objets compétences à ajouter dans `skills.mjs` (id, category, characteristics placeholder).                         | TASK-003  |           |      |
| TASK-007 | Définir entrées mapping `OGG_DUDE_SKILL_MAP` pour nouveaux codes et synonymes longs/courts.                                  | TASK-006  |           |      |
| TASK-008 | Décrire modifications `career-ogg-dude.mjs`: aucune refactor majeure, vérifier extraction couvre `<CareerSkills><Key>`.       | TASK-006  |           |      |
| TASK-009 | Décrire ajout `data-code` & maintien attributs ARIA dans `career.mjs` (#prepareCareerSkills).                                | TASK-006  |           |      |
| TASK-010 | Spécifier clés de localisation EN/FR (labels + abbréviations).                                                               | TASK-006  |           |      |
| TASK-011 | Définir scénarios tests unitaires & intégration (REQ-010, REQ-011) & strict mode.                                            | TASK-006  |           |      |
| TASK-012 | Concevoir stratégie de non-migration (documenter dans risques & assumptions).                                                | TASK-006  |           |      |

### Implementation Phase 3

- GOAL-003: Préparation exécution, ajout code, tests, validation & rollback.

| Task     | Description                                                                                                                | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-013 | Modifier `skills.mjs` pour ajouter 4 nouvelles compétences (FILE-004).                                                     | TASK-006  |           |      |
| TASK-014 | Mettre à jour `oggdude-skill-map.mjs` avec nouveaux codes + commentaires (FILE-001).                                       | TASK-007  |           |      |
| TASK-015 | Ajouter synonymes STEAL→stealth, SKULDUGGERY variantes si nécessaires (FILE-001).                                         | TASK-014  |           |      |
| TASK-016 | Vérifier extraction déjà conforme (aucun changement requis sinon ajuster commentaires) (FILE-002).                        | TASK-008  |           |      |
| TASK-017 | Ajouter `data-code` sur éléments UI compétence + conserver ARIA (FILE-003).                                                | TASK-009  |           |      |
| TASK-018 | Ajouter localisation EN (labels + abbr) pour nouvelles compétences (FILE-005).                                             | TASK-010  |           |      |
| TASK-019 | Ajouter localisation FR (labels + abbr) (FILE-006).                                                                        | TASK-010  |           |      |
| TASK-020 | Mettre à jour tests unitaires `career-ogg-dude.spec.mjs` pour nouveaux codes + strict (FILE-007).                          | TASK-011  |           |      |
| TASK-021 | Mettre à jour tests intégration `career-import.integration.spec.mjs` (inclure Sentinel.xml exemple) (FILE-008).            | TASK-011  |           |      |
| TASK-022 | Mettre à jour test strict `career-oggdude-strict.spec.mjs` pour filtrage (FILE-010).                                      | TASK-011  |           |      |
| TASK-023 | Executer suite Vitest & corriger éventuelles régressions (tous tests).                                                     | TASK-020  |           |      |
| TASK-024 | Vérifier absence de régression sur import carrière existant (manual QA).                                                  | TASK-023  |           |      |
| TASK-025 | Documenter risques & rollback dans ce plan (section Risks) – si échec revert modifications SKILLS + mapping.              | TASK-024  |           |      |

## 3. Alternatives

- **ALT-001**: Remapper PERC vers `awareness` sans créer `perception`. Rejeté: perte de sémantique Star Wars Edge, tests existants cassés, confusion pour utilisateurs OggDude.
- **ALT-002**: Ignorer codes inconnus sans ajout de compétences (laisser import partiel). Rejeté: réduit fidélité des données importées, frustrant pour GM.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x (DataModel, ApplicationV2).
- **DEP-002**: Infrastructure localisation SWERPG (lang/en.json, lang/fr.json).
- **DEP-003**: Logger utilitaire (`module/utils/logger.mjs`).

## 5. Files

- **FILE-001**: `module/importer/mappings/oggdude-skill-map.mjs` – Table de correspondance codes→ids système.
- **FILE-002**: `module/importer/items/career-ogg-dude.mjs` – Mapping carrière (extraction + transformation skill codes).
- **FILE-003**: `module/applications/sheets/career.mjs` – UI sélection compétences carrière (ajout data-code, a11y).
- **FILE-004**: `module/config/skills.mjs` – Registre des compétences, ajout des nouvelles entrées.
- **FILE-005**: `lang/en.json` – Localisation EN nouvelles compétences.
- **FILE-006**: `lang/fr.json` – Localisation FR nouvelles compétences.
- **FILE-007**: `tests/importer/career-ogg-dude.spec.mjs` – Tests unitaires mapping.
- **FILE-008**: `tests/importer/career-import.integration.spec.mjs` – Tests d'intégration import carrière complet.
- **FILE-009**: `documentation/importer/import-career.md` – Spécification de base existante.
- **FILE-010**: `tests/importer/career-oggdude-strict.spec.mjs` – Tests mode strict.

## 6. Testing

Stratégie couvrant chaque requirement clé:

- **TEST-001** (REQ-001, REQ-002, REQ-007): Unitaire `mapCareerSkills` – extraction codes multiples formes (array, objet), mapping nouveaux codes COMP, CORE, PERC, SKUL, STEAL, déduplication, ordre préservé.
- **TEST-002** (REQ-003, REQ-004, REQ-005): Unitaire – ajout perception & mapping PERC/ PERCEPTION; mapping synonymes STEAL/STEALTH, SKUL/SKULDUGGERY; vérification presence dans `SYSTEM.SKILLS`.
- **TEST-003** (REQ-006, REQ-009): Unitaire – dépassement >8 codes tronqué, mode strict filtre id absent si retiré volontairement dans mock.
- **TEST-004** (REQ-008, REQ-015): Unitaire – injection code inconnu produit log.warn (mock logger) sans crash; performance O(n) (mesure temps vs taille 100 simulée, assertion < seuil ms).
- **TEST-005** (REQ-011, REQ-014): Intégration – importer carrière Sentinel.xml simulée contenant {COMP, CORE, DECEP, PERC, SKUL, STEAL} -> résultat contient 6 compétences mappées attendues.
- **TEST-006** (REQ-012): Localisation – vérifier présence clés SKILLS.Computers, SKILLS.ComputersAbbr, etc. en & fr, non vides.
- **TEST-007** (REQ-013): UI (Playwright) – feuille carrière: chaque compétence a `aria-selected` correct, `tabindex=0`, `data-code` attribut pour compétences importées.
- **TEST-008** (REQ-016, SEC-001): Sécurité – description HTML sanitization préservée (aucun script exécuté), import code injection testé.

Procédure manuelle complémentaire (QA):

1. Importer un pack carrière OggDude contenant codes nouveaux → vérifier absence de warnings inattendus & présence mappages.
2. Ouvrir feuille carrière → activer/désactiver compétences nouvellement ajoutées, vérifier limite de 8.
3. Test voice access (optionnel): commande sur label perçu identique au nom visuel.

Critères réussite: tous tests passent; aucun log.error généré; warnings uniquement pour codes réellement inconnus; interface reflète nouvelles compétences localisées.

## 7. Risks & Assumptions

- **RISK-001**: Ajout nouvelles compétences peut nécessiter ultérieure migration pour acteurs/items existants – non traité ici (limité à import futur).
- **RISK-002**: Traductions manquantes provoquent clés brutes visibles – atténué par tests localisation (TEST-006).
- **RISK-003**: Performance insignifiante mais boucle supplémentaire sur mapping; surveiller régression improbable.
- **RISK-004**: Conflit futur si taxonomy officielle différente (ex: renommage perception) – documenter dans release notes.
- **ASSUMPTION-001**: GM souhaite fidélité aux compétences Edge d'origine plutôt que regroupements approximatifs.
- **ASSUMPTION-002**: Aucune donnée existante à migrer obligatoire (les carrières déjà importées gardent anciennes listes).
- **ASSUMPTION-003**: Catégorisation choisie (computers→kno, coordination→exp, perception→exp, skulduggery→soc) acceptée.

## 8. Related Specifications / Further Reading

- `documentation/importer/import-career.md` – spécification de base mapping carrière.
- `documentation/importer/oggdude-troubleshooting.md` – patterns debug importer.
- Foundry VTT API v13 – DataModel & ApplicationV2 ([https://foundryvtt.com/api/](https://foundryvtt.com/api/)).
- SWERPG localisation & styles (`lang/en.json`, `lang/fr.json`, `styles/`).
