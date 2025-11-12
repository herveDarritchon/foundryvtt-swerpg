---
goal: Correction du mapper OggDude Species pour alignement avec le modèle SwerpgSpecies
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: herve.darritchon
status: 'In progress'
tags: [ 'feature', 'migration', 'data-import', 'oggdude' ]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Le mapper OggDude pour les Species n'est pas aligné avec le modèle de données SwerpgSpecies, ce qui empêche l'import
correct des données depuis les fichiers XML d'OggDude. Ce plan vise à corriger le mapper pour qu'il génère des objets
compatibles avec le schéma défini dans SwerpgSpecies.

## 1. Requirements & Constraints

- **REQ-001**: Le mapper doit produire des objets compatibles avec le schéma SwerpgSpecies
- **REQ-002**: Mapper les caractéristiques de départ vers le champ `characteristics`
- **REQ-003**: Mapper les seuils de blessures/contrainte vers `woundThreshold` et `strainThreshold`
- **REQ-004**: Mapper l'expérience de départ vers `startingExperience`
- **REQ-005**: Mapper les compétences gratuites vers `freeSkills` (Set de strings)
- **REQ-006**: Mapper les talents gratuits vers `freeTalents` (Set d'UUIDs)
- **REQ-007**: Traduire les codes de compétences OggDude (ex: ATHL, PERC, DECEP, EDU) en identifiants de compétences du
  système (athletics, awareness, deception, science, etc.) via une table de correspondance déterministe
- **CON-001**: Maintenir la compatibilité avec les données XML OggDude existantes
- **CON-002**: Préserver la structure du système d'import existant
- **SEC-001**: Valider les données mappées selon les contraintes du modèle
- **PAT-001**: Suivre les patterns de validation existants dans SwerpgSpecies

## 2. Implementation Steps

### Implementation Phase 1 - Analyse et restructuration du mapping de base

- GOAL-001: Restructurer le mapping des données de base pour correspondre au schéma SwerpgSpecies

| Task     | Description                                                                                             | Completed | Date       |
|----------|---------------------------------------------------------------------------------------------------------|-----------|------------|
| TASK-001 | Mapper `StartingChars` vers `characteristics` (brawn, agility, intellect, cunning, willpower, presence) | ✅         | 2025-11-12 |
| TASK-002 | Mapper `StartingAttrs.WoundThreshold` vers `woundThreshold.modifier` avec `abilityKey: 'brawn'`         | ✅         | 2025-11-12 |
| TASK-003 | Mapper `StartingAttrs.StrainThreshold` vers `strainThreshold.modifier` avec `abilityKey: 'willpower'`   | ✅         | 2025-11-12 |
| TASK-004 | Mapper `StartingAttrs.Experience` vers `startingExperience`                                             | ✅         | 2025-11-12 |

### Implementation Phase 2 - Mapping des compétences et talents

- GOAL-002: Implémenter le mapping des compétences et talents gratuits

| Task     | Description                                                                                                                 | Completed | Date       |
|----------|-----------------------------------------------------------------------------------------------------------------------------|-----------|------------|
| TASK-005 | Extraire les compétences gratuites depuis `SkillModifiers` vers `freeSkills` (Set)                                          | ✅         | 2025-11-12 |
| TASK-006 | Extraire les talents gratuits depuis `TalentModifiers` vers `freeTalents` (Set d'UUIDs)                                     | ✅         | 2025-11-12 |
| TASK-007 | Implémenter la résolution des UUIDs de talents basée sur les keys OggDude                                                   | ✅         | 2025-11-12 |
| TASK-011 | Créer la table de correspondance codes OggDude -> SKILLS système dans `module/importer/mappings/oggdude-skill-map.mjs`      | ✅         | 2025-11-12 |
| TASK-012 | Adapter `species-ogg-dude.mjs` pour transformer chaque code avant validation (utiliser map, ignorer inconnus avec log warn) | ✅         | 2025-11-12 |
| TASK-013 | Mettre à jour tests pour couvrir: mapping réussi, code inconnu ignoré, duplication éliminée                                 | ✅         | 2025-11-12 |

### Implementation Phase 3 - Nettoyage et optimisation

- GOAL-003: Supprimer les mappings obsolètes et optimiser la structure

| Task     | Description                                                                 | Completed | Date       |
|----------|-----------------------------------------------------------------------------|-----------|------------|
| TASK-008 | Supprimer les mappings non utilisés (SubSpecies, OptionChoices complexes)   | ✅         | 2025-11-12 |
| TASK-009 | Simplifier la structure de retour pour correspondre exactement au schéma    | ✅         | 2025-11-12 |
| TASK-010 | Ajouter la validation des données mappées                                   | ✅         | 2025-11-12 |
| TASK-014 | Retirer tout code mort résiduel après intégration mapping codes compétences | ✅         | 2025-11-12 |

## 3. Alternatives

- **ALT-001**: Modifier le modèle SwerpgSpecies pour s'adapter aux données OggDude - Rejetée car cela casserait la
  compatibilité existante
- **ALT-002**: Créer un adaptateur intermédiaire - Rejetée car trop complexe pour ce cas d'usage
- **ALT-003**: Implémenter une migration post-import - Rejetée car le mapping direct est plus efficace

## 4. Dependencies

- **DEP-001**: Système de résolution UUID pour les talents (probablement via compendium lookup)
- **DEP-002**: Configuration SYSTEM.SKILLS pour valider les compétences
- **DEP-003**: Configuration SYSTEM.CHARACTERISTICS pour les clés d'aptitudes

## 5. Files

- **FILE-001**: `/module/importer/items/species-ogg-dude.mjs` - Fichier principal à modifier
- **FILE-002**: `/module/models/species.mjs` - Modèle de référence (lecture seule)
- **FILE-003**: Possibles fichiers de configuration pour le mapping des UUIDs de talents

## 6. Testing

- **TEST-001**: Test unitaire du mapping des caractéristiques de base
- **TEST-002**: Test de validation des seuils (wound/strain) avec différentes valeurs
- **TEST-003**: Test de mapping des compétences gratuites avec validation Set
- **TEST-004**: Test de résolution des UUIDs de talents
- **TEST-005**: Test d'intégration complète avec un fichier XML Species d'exemple
- **TEST-006**: Test de transformation des codes (ATHL->athletics, PERC->awareness, DECEP->deception, EDU->science) et
  rejet logué d'un code inconnu (ex: UNKNOWN)
- **TEST-007**: Test de non inclusion d'un code inconnu dans freeSkills
- **TEST-008**: Test que la déduplication fonctionne si le même code apparaît plusieurs fois

### Table de correspondance prévue (draft)

| Code OggDude | Système SKILL ID | Justification / Assomption                                      |
|--------------|------------------|-----------------------------------------------------------------|
| ATHL         | athletics        | Correspondance directe (Athletics)                              |
| PERC         | awareness        | PERC ~ Perception -> Awareness dans système                     |
| DECEP        | deception        | Correspondance directe (Deception)                              |
| STEA         | stealth          | Code abrégé classique                                           |
| WILD         | wilderness       | Abréviation supposée (Survival/Wilderness)                      |
| ARCA         | arcana           | Arcana magique                                                  |
| MEDI         | medicine         | Médecine                                                        |
| SCI          | science          | Science générale                                                |
| SOCI         | society          | Société / Culture                                               |
| DIPL         | diplomacy        | Diplomacy social                                                |
| INTIM        | intimidation     | Intimidation                                                    |
| PERFO        | performance      | Performance artistique                                          |
| EDU          | science          | Assomption: Education orientée connaissance générale => science |

Inconnus: log.warn et exclusion.

### Validation Automatisable

- Chaque entrée freeSkills après mapping doit appartenir à Object.keys(SYSTEM.SKILLS)
- Aucune duplication (Set)
- Codes non mappés exclus et log « Unknown OggDude skill code: XXX »

## 7. Risks & Assumptions

- **RISK-001**: Les données XML OggDude peuvent avoir des variations de structure non documentées
- **RISK-002**: La résolution des UUIDs de talents peut échouer si les talents ne sont pas présents dans le compendium
- **ASSUMPTION-001**: Les fichiers XML OggDude suivent une structure cohérente pour les données Species
- **ASSUMPTION-002**: Le système de compendium est correctement configuré pour la résolution des talents
- **ASSUMPTION-003**: Les clés de compétences OggDude correspondent aux IDs dans SYSTEM.SKILLS

## 8. Related Specifications / Further Reading

- [Documentation Foundry VTT TypeDataModel](https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html)
- [Documentation Foundry VTT Fields](https://foundryvtt.com/api/modules/foundry.data.fields.html)
- Documentation interne du système d'import OggDude (si disponible)
