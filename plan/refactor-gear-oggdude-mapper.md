---
goal: Correction du mapper OggDude Gear pour alignement avec le modèle SwerpgGear
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: herve.darritchon
status: 'Planned'
tags: ['feature', 'migration', 'data-import', 'oggdude', 'gear']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Le mapper OggDude pour les Gears (`gear-ogg-dude.mjs`) n'est pas aligné avec le modèle de données `SwerpgGear` (`module/models/gear.mjs`). Il retourne actuellement des champs non supportés par le modèle (sources, categories, mods, weaponModifiers, eraPricing, etc.) et ne construit pas l'objet `system` selon le schéma défini par `SwerpgGear.defineSchema()`. Ce plan définit les étapes pour produire des objets conformes au schéma et assurer une validation stricte.

## 1. Requirements & Constraints

- **REQ-001**: Le mapper doit générer des objets dont `system` ne contient que les champs définis dans `SwerpgGear.defineSchema()` (hérite de `SwerpgPhysicalItem`)
- **REQ-002**: Adapter la structure de sortie pour produire `{ name, type: 'gear', system: {...}, flags: {...} }` uniquement
- **REQ-003**: Mapper les champs OggDude vers les propriétés système appropriées (description, encumbrance, price, rarity, hp, etc.)
- **REQ-004**: Normaliser les valeurs numériques (encumbrance, price, rarity, hp) avec validation et valeurs par défaut
- **REQ-005**: Gérer la propriété `restricted` booléenne correctement
- **REQ-006**: Exclure tous les champs non définis dans le schéma (sources, categories, mods, weaponModifiers, eraPricing, etc.)
- **REQ-007**: Conserver les métadonnées importantes dans `flags.swerpg` (oggdudeKey, type original)
- **REQ-008**: Implémenter une validation des types de données avant construction de l'objet final
- **REQ-009**: Journaliser les transformations avec `logger.debug` et les erreurs de mapping avec `logger.warn`
- **REQ-010**: Garantir que tous les champs requis par `SwerpgGear` ont des valeurs valides ou des défauts appropriés
- **SEC-001**: Empêcher injection de données inattendues dans l'objet retourné (validation de whitelist des clés)
- **CON-001**: Ne pas modifier le modèle `SwerpgGear` (alignement côté importer uniquement)
- **CON-002**: Préserver le pattern actuel du contexte d'import (structure `element`, `folder`, `image`)
- **PAT-001**: Utiliser le pattern déjà appliqué pour mapping career (structure `system` + filtrage + validation)
- **GUD-001**: Utiliser `logger.debug` pour traçabilité et `logger.warn` pour données invalides ou manquantes

## 2. Implementation Steps

### Implementation Phase 1 - Analyse du modèle SwerpgGear

- GOAL-001: Comprendre le schéma exact de `SwerpgGear` et identifier les champs supportés

| Task     | Description                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Analyser `SwerpgGear.defineSchema()` et `SwerpgPhysicalItem.defineSchema()` pour identifier les champs supportés | ✓         | 2025-11-12 |
| TASK-002 | Documenter la correspondance entre champs OggDude et champs système                                | ✓         | 2025-11-12 |
| TASK-003 | Identifier les champs à exclure (sources, categories, mods, weaponModifiers, eraPricing)           | ✓         | 2025-11-12 |
| TASK-004 | Définir les valeurs par défaut pour champs optionnels                                              | ✓         | 2025-11-12 |
| TASK-005 | Créer la table de correspondance des types de gear si nécessaire                                   | ✓         | 2025-11-12 |

### Implementation Phase 2 - Restructuration du mapper

- GOAL-002: Adapter la sortie du mapper pour ne retourner que les champs supportés dans `system`

| Task     | Description                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Refactorer `gearMapper` pour retourner structure `{ name, type, system, flags }`              | ✓         | 2025-11-12 |
| TASK-007 | Construire objet `system` avec uniquement les champs définis dans le schéma                   | ✓         | 2025-11-12 |
| TASK-008 | Supprimer champs obsolètes (sources, categories, mods, weaponModifiers, eraPricing, etc.)     | ✓         | 2025-11-12 |
| TASK-009 | Implémenter normalisation des valeurs numériques (encumbrance, price, rarity, hp)             | ✓         | 2025-11-12 |
| TASK-010 | Ajouter validation booléenne pour `restricted`                                                | ✓         | 2025-11-12 |
| TASK-011 | Construire `flags.swerpg` avec métadonnées (oggdudeKey, originalType)                         | ✓         | 2025-11-12 |
| TASK-012 | Ajouter logs debug pour chaque gear importé avec récap des champs mappés                      | ✓         | 2025-11-12 |

### Implementation Phase 3 - Validation & Normalisation

- GOAL-003: Mettre en place validation robuste des données et normalisation

| Task     | Description                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Créer fonction `normalizeGearNumericField(value, defaultValue, min, max)` pour validation     | ✓         | 2025-11-12 |
| TASK-014 | Créer fonction `validateGearBooleanField(value, defaultValue)` pour champs booléens           | ✓         | 2025-11-12 |
| TASK-015 | Implémenter validation `description` (HTMLField) avec nettoyage basique                       | ✓         | 2025-11-12 |
| TASK-016 | Ajouter validation du `type` de gear contre une liste autorisée si définie                    | ✓         | 2025-11-12 |
| TASK-017 | Créer fonction utilitaire `buildGearSystem(xmlGear)` testable séparément                      | ✓         | 2025-11-12 |
| TASK-018 | Ajouter gestion des erreurs avec fallback vers valeurs par défaut                             | ✓         | 2025-11-12 |
| TASK-019 | Instrumenter logging détaillé pour transformations et erreurs                                 | ✓         | 2025-11-12 |

### Implementation Phase 4 - Tests & Robustesse

- GOAL-004: Couvrir intégralement le mapping et la validation avec tests unitaires et d'intégration

| Task     | Description                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-020 | Test unitaire: mapping gear basique avec tous champs présents                                 | ✓         | 2025-11-12 |
| TASK-021 | Test unitaire: normalisation valeurs numériques (négatives, non-numériques, hors bornes)     | ✓         | 2025-11-12 |
| TASK-022 | Test unitaire: validation booléenne `restricted` (true, false, undefined, "true", etc.)      | ✓         | 2025-11-12 |
| TASK-023 | Test unitaire: exclusion champs non-supportés (sources, mods, etc. absents du résultat)      | ✓         | 2025-11-12 |
| TASK-024 | Test unitaire: gestion description vide/undefined => valeur par défaut                       | ✓         | 2025-11-12 |
| TASK-025 | Test intégration: objet final conforme au schéma SwerpgGear                                   | ✓         | 2025-11-12 |
| TASK-026 | Test intégration: validation que flags.swerpg contient métadonnées                           | ✓         | 2025-11-12 |
| TASK-027 | Test erreur: gear malformé ou incomplet => fallback approprié + log.warn                      | ✓         | 2025-11-12 |
| TASK-028 | Test performance: mapping d'un lot de gears (>100) sans dégradation                          | ✓         | 2025-11-12 |

### Implementation Phase 5 - Documentation & Qualité

- GOAL-005: Finaliser qualité, documentation et conformité

| Task     | Description                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-029 | Créer `documentation/swerpg/import-gear.md` décrivant logique mapping et validations          | ✓         | 2025-11-12 |
| TASK-030 | Mettre à jour `CHANGELOG.md` (section Unreleased) avec correction mapper gear                 | ✓         | 2025-11-12 |
| TASK-031 | Vérifier conformité ESLint & Prettier sur fichiers modifiés                                   | ✓         | 2025-11-12 |
| TASK-032 | Ajouter commentaires JSDoc complets sur nouvelles fonctions                                   | ✓         | 2025-11-12 |
| TASK-033 | Revue code: vérifier absence de code mort et optimisation des performances                    | ✓         | 2025-11-12 |
| TASK-034 | Test manuel: import réel de gears OggDude en environnement Foundry                            | ✓         | 2025-11-12 |
| TASK-035 | Validation: aucune régression sur autres importers (armor, weapon, species, career)           | ✓         | 2025-11-12 |

### Implementation Phase 6 - Optimisation & Observabilité

- GOAL-006: Assurer performance optimale et visibilité des opérations

| Task     | Description                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-036 | Ajouter métriques d'import (nombre gears, champs transformés, erreurs détectées)              |           |      |
| TASK-037 | Optimiser allocations mémoire dans boucles de mapping                                         |           |      |
| TASK-038 | Ajouter cache pour validations répétitives si applicable                                      |           |      |
| TASK-039 | Créer test benchmark pour mesurer performance sur gros datasets                               |           |      |
| TASK-040 | Ajouter hooks/callbacks optionnels pour monitoring externe                                    |           |      |
| TASK-041 | Finaliser documentation utilisateur pour configuration avancée                                |           |      |
| TASK-042 | Passer statut plan à 'Completed' après validation complète                                    |           |      |

## 3. Alternatives

- **ALT-001**: Étendre le modèle `SwerpgGear` pour inclure sources et mods (rejeté: augmentation complexité / hors scope)
- **ALT-002**: Créer adaptateur post-mapping pour transformation (rejeté: double passage + performance)
- **ALT-003**: Migration progressive avec support des anciens champs (rejeté: dette technique)
- **ALT-004**: Mapping conditionnel basé sur type de gear (rejeté: complexité excessive)
- **ALT-005**: Stockage des champs exclus dans flags custom (rejeté: pollution de l'objet)

## 4. Dependencies

- **DEP-001**: Modèle `SwerpgGear` et `SwerpgPhysicalItem` pour référence du schéma
- **DEP-002**: Module logger (`module/utils/logger.mjs`)
- **DEP-003**: OggDude XML structure stable (`Gear.xml` dans structure `Gears.Gear`)
- **DEP-004**: OggDudeImporter utilities (mapMandatoryString, mapOptionalNumber, etc.)
- **DEP-005**: Conventions Foundry pour création items (root keys: name, type, system, flags)
- **DEP-006**: Système de validation Foundry (TypeDataModel, Field types)

## 5. Files

- **FILE-001**: `module/importer/items/gear-ogg-dude.mjs` (modifications principales)
- **FILE-002**: `module/models/gear.mjs` (référence du schéma - lecture seule)
- **FILE-003**: `module/models/physical.mjs` (référence schéma parent - lecture seule)
- **FILE-004**: `tests/importer/gear-oggdude.spec.mjs` (nouveau fichier de tests unitaires)
- **FILE-005**: `tests/importer/gear-import.integration.spec.mjs` (nouveau fichier tests intégration)
- **FILE-006**: `documentation/swerpg/import-gear.md` (nouvelle documentation)
- **FILE-007**: `CHANGELOG.md` (mise à jour)
- **FILE-008**: Éventuels fixtures XML dans `tests/fixtures/Gears/` pour tests d'intégration

## 6. Testing

- **TEST-001**: Mapping gear basique avec tous champs standard
- **TEST-002**: Normalisation price/rarity/encumbrance/hp (valeurs négatives, NaN, undefined)
- **TEST-003**: Validation restricted boolean (true, false, "true", undefined, etc.)
- **TEST-004**: Exclusion complète champs non-schématisés (sources, mods, weaponModifiers, eraPricing)
- **TEST-005**: Construction correcte flags.swerpg avec métadonnées
- **TEST-006**: Gestion description vide/malformée
- **TEST-007**: Type de gear validation si table de correspondance définie
- **TEST-008**: Objet final conforme à SwerpgGear.defineSchema()
- **TEST-009**: Performance sur batch import (>100 gears)
- **TEST-010**: Logging approprié (debug + warn) selon situations
- **TEST-011**: Intégration complète: XML → objet → validation Foundry
- **TEST-012**: Régression: autres importers non impactés

## 7. Risks & Assumptions

- **RISK-001**: Structure XML Gear pourrait varier selon versions OggDude (nécessite adaptation)
- **RISK-002**: Schéma SwerpgGear pourrait évoluer, rendant ce mapping obsolète
- **RISK-003**: Perte de données importantes stockées dans champs exclus (sources, mods)
- **RISK-004**: Performance dégradée sur gros datasets sans optimisation
- **ASSUMPTION-001**: Structure OggDude Gear stable avec champs Name, Key, Description, Type, etc.
- **ASSUMPTION-002**: SwerpgGear hérite correctement de SwerpgPhysicalItem
- **ASSUMPTION-003**: Validation Foundry sera cohérente avec schéma défini
- **ASSUMPTION-004**: Pas de dépendances circulaires dans validation des types

## 8. Related Specifications / Further Reading

- Plan Career: `plan/features/fix-mapper-careers-oggdude.md` (pattern de référence)
- Documentation Foundry DataModel: <https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html>
- Documentation Fields API: <https://foundryvtt.com/api/modules/foundry.data.fields.html>
- Documentation interne import OggDude (si disponible)
- Standards de test Vitest pour ce projet