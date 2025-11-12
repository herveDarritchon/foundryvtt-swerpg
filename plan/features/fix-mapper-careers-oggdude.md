---
goal: Correction du mapper OggDude Career pour alignement avec le modèle SwerpgCareer
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: herve.darritchon
status: 'In progress'
tags: ['feature', 'migration', 'data-import', 'oggdude', 'career']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Le mapper OggDude pour les Careers (`career-ogg-dude.mjs`) n’est pas aligné avec le modèle de données `SwerpgCareer` (`module/models/career.mjs`). Il retourne actuellement des champs non supportés (attributes, sources, careerSpecializations, etc.) et ne construit pas `careerSkills` selon le schéma (Set de `{id}`) ni `freeSkillRank`. Ce plan définit les étapes pour produire des objets conformes au schéma et assurer une validation stricte.

## 1. Requirements & Constraints

- **REQ-001**: Le mapper doit générer des objets dont `system` ne contient que `description`, `careerSkills`, `freeSkillRank` conformément à `SwerpgCareer.defineSchema()`
- **REQ-002**: Adapter `careerSkills` pour produire un Set (taille 0–8) d’objets `{id: <skillId>}` sans doublons
- **REQ-003**: Mapper `xmlCareer.FreeRanks` vers `freeSkillRank` (valeur entière 0–8, défaut = 4 si absent ou invalide)
- **REQ-004**: Normaliser les codes de compétences OggDude (si fournis sous forme abrégée) vers les IDs du système via une table de correspondance déterministe (réutilisation ou création si inexistante)
- **REQ-005**: Ignorer toute compétence inconnue avec log `logger.warn` et exclusion de la liste
- **REQ-006**: Garantir que `careerSkills.length <= freeSkillRank` n’est PAS une contrainte implicite (seule la borne 0–8 s’applique)
- **REQ-007**: Exclure tous les champs non définis dans le schéma (sources, attributes, careerSpecializations, etc.)
- **REQ-008**: Filtrer toute entrée de `careerSkills` dont l'id est falsy (undefined, empty) avant validation finale
- **REQ-009**: Réintroduire une validation stricte optionnelle (mode strict) vérifiant l'appartenance de chaque id à `SYSTEM.SKILLS`; en mode non strict, seulement exclure les ids falsy
- **REQ-010**: Journaliser (niveau warn) la liste des codes sources et leur mapping lorsqu'au moins un id est filtré
- **REQ-011**: Garantir qu'aucun objet partiel (`{}` ou `{id:undefined}`) n'est inséré dans le Set afin d'éviter l'erreur "id: may not be undefined"
- **SEC-001**: Empêcher injection de données inattendues dans l’objet retourné (validation de whitelist des clés)
- **CON-001**: Ne pas modifier le modèle `SwerpgCareer` (alignement côté importer uniquement)
- **CON-002**: Préserver le pattern actuel du contexte d’import (structure `element`, `folder`, `image`)
- **PAT-001**: Utiliser le pattern déjà appliqué pour mapping species (Set + filtrage + log des inconnus)
- **GUD-001**: Utiliser `logger.debug` pour traçabilité et `logger.warn` pour codes compétences non résolus

## 2. Implementation Steps

### Implementation Phase 1 - Restructuration du mapper

- GOAL-001: Adapter la sortie du mapper pour ne retourner que les champs supportés (`system.description`, `system.careerSkills`, `system.freeSkillRank`)

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Ajouter construction `system` et déplacer `description` dedans | ✅ | 2025-11-12 |
| TASK-002 | Supprimer champs obsolètes (`sources`, `attributes`, `careerSpecializations`, `freeRanks` direct) | ✅ | 2025-11-12 |
| TASK-003 | Implémenter normalisation valeur `freeSkillRank` depuis `xmlCareer.FreeRanks` (borne 0–8, défaut 4) | ✅ | 2025-11-12 |
| TASK-004 | Ajouter whitelist des clés retournées (root: name, type, system, img, folder) | ✅ | 2025-11-12 |
| TASK-005 | Ajouter logs debug pour chaque carrière importée avec récap des skills retenues | ✅ | 2025-11-12 |

### Implementation Phase 2 - Mapping & Validation des compétences

- GOAL-002: Mettre en place table de correspondance codes OggDude → IDs de compétences système + validation Set

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-006 | Créer ou réutiliser fichier `module/importer/mappings/oggdude-career-skill-map.mjs` (structure export const CAREER_SKILL_MAP = {...}) | ✅ | 2025-11-12 |
| TASK-007 | Extraire `xmlCareer.CareerSkills` et transformer via la table de correspondance | ✅ | 2025-11-12 |
| TASK-008 | Filtrer doublons avec `new Set()` puis re-projeter en tableau ordonné stable | ✅ | 2025-11-12 |
| TASK-009 | Exclure codes inconnus (log.warn + compteur) | ✅ | 2025-11-12 |
| TASK-010 | Tronquer à 8 entrées max (slice(0,8)) avant packaging `{id}` | ✅ | 2025-11-12 |
| TASK-011 | Construire `careerSkills` = array d’objets `{id}` pour compatibilité schema SetField/SchemaField | ✅ | 2025-11-12 |
| TASK-012 | Ajouter fonction util interne `mapCareerSkills(rawCodes)` testable séparément | ✅ | 2025-11-12 |
| TASK-013 | Ajouter validation post-mapping (longueur 0–8 + IDs présents dans `SYSTEM.SKILLS`) | ✅ | 2025-11-12 |

### Implementation Phase 3 - Tests & Robustesse

- GOAL-003: Couvrir intégralement le mapping et la validation

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-014 | Test unitaire: freeSkillRank défaut (absence `FreeRanks`) => 4 | ✅ | 2025-11-12 |
| TASK-015 | Test unitaire: freeSkillRank hors borne (>8) => clamp à 8 | ✅ | 2025-11-12 |
| TASK-016 | Test unitaire: careerSkills avec doublons => déduplication | ✅ | 2025-11-12 |
| TASK-017 | Test unitaire: exclusion code inconnu + log.warn détecté | ✅ | 2025-11-12 |
| TASK-018 | Test unitaire: carrière avec >8 compétences => tronquage | ✅ | 2025-11-12 |
| TASK-019 | Test intégration: objet final ne contient que clés autorisées | ✅ | 2025-11-12 |
| TASK-020 | Test intégration: chaque entrée `careerSkills` format `{id}` uniquement | ✅ | 2025-11-12 |
| TASK-021 | Test erreur: si transformation retourne >8 avant tronquage, confirmer non crash + longueur = 8 | ✅ | 2025-11-12 |
| TASK-022 | Test validation: passer carrière contenant 0 skill => accepte | ✅ | 2025-11-12 |

### Implementation Phase 4 - Nettoyage & Documentation

- GOAL-004: Finaliser qualité et traçabilité

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-023 | Ajouter section dans `documentation/swerpg/` décrivant logique importer Career | ✅ | 2025-11-12 |
| TASK-024 | Mettre à jour `CHANGELOG.md` (section Unreleased) | ✅ | 2025-11-12 |
| TASK-025 | Vérifier conformité ESLint & absence code mort |  |  |
| TASK-026 | Ajouter commentaires de contexte uniquement (WHY) dans mapper | ✅ | 2025-11-12 |
| TASK-027 | Ajouter métrique #skills ignorées dans log.debug récap final | ✅ | 2025-11-12 |

### Implementation Phase 5 - Remédiation erreurs de validation runtime

- GOAL-005: Corriger les erreurs "careerSkills: 0: id may not be undefined" observées en environnement Foundry (cf. captures)

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-028 | Ajouter filtre final `careerSkills = careerSkills.filter(o => o && typeof o.id === 'string' && o.id.length > 0)` |  |  |
| TASK-029 | Instrumenter logging détaillé: codes bruts, mappés, rejetés, résultat final (logger.debug + warn si rejet) |  |  |
| TASK-030 | Option "strictSkillValidation" (config ou flag interne) pour activer filtrage sur `SYSTEM.SKILLS` si disponible |  |  |
| TASK-031 | Re-générer tests: ajouter cas avec codes inconnus + code vide + null pour vérifier exclusion silencieuse |  |  |
| TASK-032 | Ajouter test régression: entrée contenant ['', 'ATHL', undefined] => résultat uniquement athletics |  |  |
| TASK-033 | Ajouter test strict mode (mock SYSTEM) => exclusion d'un id absent de SYSTEM.SKILLS |  |  |
| TASK-034 | Mettre à jour doc `import-career.md` avec section Validation Avancée & strict mode |  |  |
| TASK-035 | Mettre à jour CHANGELOG (complément mention filtrage undefined) |  |  |
| TASK-036 | Repasser lint + tests complets après modifications |  |  |
| TASK-037 | Mettre à jour ce plan (status des tâches phase 5) |  |  |

### Implementation Phase 6 - Stabilisation & Observabilité

- GOAL-006: Assurer robustesse long terme et visibilité des problèmes futurs

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-038 | Ajouter compteur global import carrière (#carrières, #skills totaux, #skills rejetés) exporté dans log final |  |  |
| TASK-039 | Créer test d'intégration simulant import multi-carrières avec mélange codes valides/inconnus |  |  |
| TASK-040 | Ajouter guard: si après filtrage >8 skills, tronquer et logger un warn spécifique "TRUNCATED_SKILLS" |  |  |
| TASK-041 | Ajout d'un hook interne (facultatif) ou fonction pour obtenir stats dernières importations (pour debugging) |  |  |
| TASK-042 | Vérifier absence de fuite mémoire: arrays temporaires libérés (revue code) |  |  |
| TASK-043 | Passer statut plan à 'Completed' après validation manuelle en instance Foundry |  |  |

## 3. Alternatives

- **ALT-001**: Étendre le modèle `SwerpgCareer` pour inclure attributes et specializations (rejeté: augmentation complexité / hors scope)
- **ALT-002**: Créer un adaptateur intermédiaire post-mapping (rejeté: double passage + surcoût perf)
- **ALT-003**: Migration asynchrone en fin d’import pour nettoyer données (rejeté: moins déterministe que nettoyage à la source)
- **ALT-004**: Conserver tous champs et ignorer la validation schema (rejeté: risque incohérence + dette technique)

## 4. Dependencies

- **DEP-001**: `SYSTEM.SKILLS` pour validation des IDs
- **DEP-002**: Module logger (`module/utils/logger.mjs`)
- **DEP-003**: OggDude XML structure stable (`Careers/Career/CareerSkills`)
- **DEP-004**: Fichier de mapping skill OggDude (à créer si pas existant)
- **DEP-005**: Conventions Foundry pour création items (root keys: name, type, system, img, folder)

## 5. Files

- **FILE-001**: `module/importer/items/career-ogg-dude.mjs` (modifications principales)
- **FILE-002**: `module/models/career.mjs` (référence du schéma - lecture seule)
- **FILE-003**: `module/importer/mappings/oggdude-career-skill-map.mjs` (nouveau)
- **FILE-004**: `tests/importer/career-oggdude.spec.mjs` (nouveau fichier de tests)
- **FILE-005**: `documentation/swerpg/import-career.md` (nouvelle doc)
- **FILE-006**: `CHANGELOG.md` (mise à jour)

## 6. Testing

- **TEST-001**: Mapping basique carrière sans skills (liste vide)
- **TEST-002**: Normalisation freeSkillRank (valeurs: undefined, -1, 9, 5)
- **TEST-003**: Déduplication skills (entrée: ['ATHL','ATHL','PERC'])
- **TEST-004**: Exclusion skill inconnue ('UNKNOWN')
- **TEST-005**: Tronquage >8 (entrée 10 codes valides)
- **TEST-006**: Format final `careerSkills` => tableau d’objets `{id}` uniquement
- **TEST-007**: Validation perte champs non-schématisés (attributes supprimés)
- **TEST-008**: Journalisation `logger.warn` sur inconnu
- **TEST-009**: Intégration complète: objet final prêt pour création item Foundry
- **TEST-010**: Robustesse: mapping avec mélange de codes valides/inconnus/doublons

## 7. Risks & Assumptions

- **RISK-001**: Structure réelle XML pourrait contenir `CareerSkills.Skill` au lieu de liste directe (nécessite adaptation)
- **RISK-002**: Table de mapping incomplète provoquant exclusions massives
- **RISK-003**: Réutilisation future des champs supprimés (attributes) => besoin de migration ultérieure
- **RISK-004**: Re-filtrage trop agressif en mode strict supprimant des compétences valides non encore chargées dans `SYSTEM.SKILLS` (ordre d'initialisation)
- **RISK-005**: Performances: logging détaillé sur gros imports peut ralentir (atténuer via debug mode)
- **ASSUMPTION-001**: Les codes compétences carrière suivent mêmes conventions que species
- **ASSUMPTION-002**: `FreeRanks` est déjà borné côté source mais nécessite défense côté importer
- **ASSUMPTION-003**: Le logger est thread-safe et ne nécessite pas d’adaptation
- **ASSUMPTION-004**: Les erreurs observées proviennent d'objets partiels sans `id` plutôt que d'une corruption externe dans DataModel

## 9. Validation Criteria Additionnels (Phase 5+)

- VC-001: Aucun item carrière importé ne déclenche "id may not be undefined" dans 100 carrières de test.
- VC-002: Logs contiennent le total et le nombre rejeté quand au moins un rejet survient.
- VC-003: Mode strict: un code absent de `SYSTEM.SKILLS` est exclu et log.warn émis.
- VC-004: Couverture tests `career-ogg-dude.spec.mjs` ≥ 95% des branches dans `mapCareerSkills`.

## 8. Related Specifications / Further Reading

- Plan Species: `plan/features/fix-mapper-species-oggdude.md`
- Foundry VTT DataModel API: <https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html>
- Fields API: <https://foundryvtt.com/api/modules/foundry.data.fields.html>
- Documentation interne import OggDude (si disponible)