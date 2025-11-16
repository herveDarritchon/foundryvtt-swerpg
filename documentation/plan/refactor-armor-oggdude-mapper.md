---
goal: Correction du mapper OggDude Armor pour alignement avec le modèle SwerpgArmor
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: herve.darritchon
status: 'Completed'
tags: ['feature', 'refactor', 'migration', 'data-import', 'oggdude', 'armor']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

Ce plan décrit la refonte complète de `armor-ogg-dude.mjs` pour produire des objets compatibles avec le schéma `SwerpgArmor` (`module/models/armor.mjs`). Il introduit des tables de correspondance déterministes (catégorie, propriétés), nettoie les champs non supportés, applique une validation stricte et ajoute instrumentation et tests couvrant les cas limites.

## 1. Requirements & Constraints

- **REQ-001**: Le mapper doit retourner un objet Foundry minimal: `{ name, type:'armor', img, system:{...}, folder? }` sans champs arbitraires.
- **REQ-002**: Les champs spécifiques au schéma `SwerpgArmor` doivent être présents dans `system`: `category`, `defense.base`, `soak.base`, `properties` (Set de IDs), plus hérités (ex: `encumbrance`, `price`, `rarity`, `hp`, `restricted`, `broken?` si parent).
- **REQ-003**: Mapper `xmlArmor.Defense` → `system.defense.base` (entier ≥0) avec clamp final dans limites de la catégorie (appliqué plus tard par préparation mais bornage initial).
- **REQ-004**: Mapper `xmlArmor.Soak` → `system.soak.base` (entier ≥0) idem clamp.
- **REQ-005**: Normaliser la catégorie via table déterministe `ARMOR_CATEGORY_MAP` (ex: OggDude codes / noms → keys `light`, `medium`, `heavy`, etc.). Défaut = `SwerpgArmor.DEFAULT_CATEGORY` si inconnu.
- **REQ-006**: Distinguer catégories et propriétés: `xmlArmor.Categories.Category[]` peut contenir à la fois la catégorie primaire et des tags supplémentaires. Utiliser deux tables: `ARMOR_CATEGORY_MAP` et `ARMOR_PROPERTY_MAP`.
- **REQ-007**: Construire `properties` Set en filtrant chaque entrée mappée via `ARMOR_PROPERTY_MAP`; ignorer inconnues avec `logger.warn`.
- **REQ-008**: Clamp `price >= 0`; si manquant → 0.
- **REQ-009**: Clamp `rarity` dans [0,20]; défaut = 0 si absent.
- **REQ-010**: `restricted` → booléen dans `system.restricted` (valeur falsy => false).
- **REQ-011**: Sanitiser `name` et `description` (trim + neutraliser `<script`).
- **REQ-012**: Ignorer champs non supportés: `sources`, `mods`, `weaponModifiers`, `eraPricing`, `categories` (après extraction), `key`, `type` (OggDude), attributs de taille non pertinents.
- **REQ-013**: Ajouter instrumentation: compteur total, rejetés, catégories inconnues, propriétés inconnues.
- **REQ-014**: Mode strict activable `FLAG_STRICT_ARMOR_VALIDATION`: rejet si catégorie non résolue ou defense/soak invalides (non-entier).
- **REQ-015**: Validation finale: `properties` ⊆ `Object.keys(SYSTEM.ARMOR.PROPERTIES)`.
- **REQ-016**: Ordre déterministe: tri alphabétique des propriétés avant intégration.
- **REQ-017**: Protection contre valeurs non numériques (parseInt safe) pour Defense/Soak; si NaN → 0 (warn).
- **REQ-018**: Si `xmlArmor.Defense` ou `xmlArmor.Soak` > 100 (valeurs aberrantes), clamp + log `logger.warn` code `ARMOR_DEFENSE_SOAK_ABNORMAL`.
- **REQ-019**: Aucun objet partiel: ne jamais insérer `{}` ou propriété undefined dans le Set (`properties.filter(...)`).
- **REQ-020**: Tests >95% de couverture branches sur module mapper.
- **SEC-001**: Aucune interpolation HTML non échappée dans `description`.
- **SEC-002**: Pas d’exécution dynamique (aucun `eval`, aucune construction de chemin système hors image pré-définie).
- **CON-001**: Ne pas modifier `SwerpgArmor` (adaptation côté importer seulement).
- **CON-002**: Conserver structure `buildArmorContext`.
- **PAT-001**: Reprendre pattern Species/Career (tables, filtrage, instrumentation).
- **PAT-002**: Utiliser utilitaire `clampNumber`.
- **PAT-003**: Logs catégorisés: debug (flux normal), warn (inconnus), error (exception inattendue).
- **PERF-001**: Complexité O(n) sur nombre d’armures, sans copies profondes inutiles.

## 2. Implementation Steps

### Implementation Phase 1 - Tables & Utilitaires

- GOAL-001: Introduire tables de correspondance et helpers génériques.

| Task     | Description                                                                                 | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Créer `module/importer/mappings/oggdude-armor-category-map.mjs` export `ARMOR_CATEGORY_MAP` | ✓         | 2025-11-12 |
| TASK-002 | Créer `module/importer/mappings/oggdude-armor-property-map.mjs` export `ARMOR_PROPERTY_MAP` | ✓         | 2025-11-12 |
| TASK-003 | Ajouter `module/importer/mappings/index-armor.mjs` re-export catégories & propriétés        | ✓         | 2025-11-12 |
| TASK-004 | Implémenter util `clampNumber(value,min,max,defaultValue)` dans mapper ou util partagé      | ✓         | 2025-11-12 |
| TASK-005 | Implémenter `sanitizeText(str)` (remplacer `<script` → `&lt;script`, trim)                  | ✓         | 2025-11-12 |
| TASK-006 | Définir constante `FLAG_STRICT_ARMOR_VALIDATION = false` (exportable)                       | ✓         | 2025-11-12 |
| TASK-007 | Tests unitaires pour les deux tables de mapping (catégorie & propriété)                     | ✓         | 2025-11-12 |
| TASK-008 | Ajouter doc inline (WHY) sur choix clamp (pas d'expansion auto par rareté ici)              | ✓         | 2025-11-12 |

### Implementation Phase 2 - Refactor Mapper Principal

- GOAL-002: Réécrire `armorMapper` pour schéma conforme.

| Task     | Description                                                                                                                     | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-009 | Extraire logique dans fonction `mapOggDudeArmor(xmlArmor)`                                                                      | ✓         | 2025-11-12 |
| TASK-010 | Construire structure root `{ name, type: 'armor', img, system: {} }`                                                            | ✓         | 2025-11-12 |
| TASK-011 | Mapper catégorie: parcourir `xmlArmor.Categories.Category[]` → première catégorie résolue via `ARMOR_CATEGORY_MAP` sinon défaut | ✓         | 2025-11-12 |
| TASK-012 | Collecter propriétés: toutes entrées mappées via `ARMOR_PROPERTY_MAP` → Set                                                     | ✓         | 2025-11-12 |
| TASK-013 | Mapper `Defense` → entier (parse), clamp [0,100] pré-validation, assign `system.defense = { base }`                             | ✓         | 2025-11-12 |
| TASK-014 | Mapper `Soak` → entier, clamp [0,100], assign `system.soak = { base }`                                                          | ✓         | 2025-11-12 |
| TASK-015 | Mapper `Encumbrance` → `system.encumbrance` (≥0)                                                                                | ✓         | 2025-11-12 |
| TASK-016 | Mapper `Rarity` (clamp [0,20])                                                                                                  | ✓         | 2025-11-12 |
| TASK-017 | Mapper `Price` (≥0 sinon 0)                                                                                                     | ✓         | 2025-11-12 |
| TASK-018 | Mapper `HP` → `system.hp` si supporté par parent (sinon ignorer après vérif)                                                    | ✓         | 2025-11-12 |
| TASK-019 | Mapper `Restricted` → bool `system.restricted`                                                                                  | ✓         | 2025-11-12 |
| TASK-020 | Sanitize `name`, `description`                                                                                                  | ✓         | 2025-11-12 |
| TASK-021 | Tri alphabétique final des propriétés                                                                                           | ✓         | 2025-11-12 |
| TASK-022 | Supprimer champs extraits non supportés du résultat final                                                                       | ✓         | 2025-11-12 |
| TASK-023 | Accumuler stats (total++, unknownCategory++, unknownProperties += n, rejected++)                                                | ✓         | 2025-11-12 |
| TASK-024 | Exporter fonction `getArmorImportStats()` et `resetArmorImportStats()`                                                          | ✓         | 2025-11-12 |

### Implementation Phase 3 - Validation & Mode Strict

- GOAL-003: Ajouter validation systémique.

| Task     | Description                                                                               | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-025 | Implémenter `validateArmorSystem(system)` retourne `{ valid, errors }`                    |           |      |
| TASK-026 | Validation: `category` string non vide, `defense.base` et `soak.base` entiers ≥0          |           |      |
| TASK-027 | Check `properties` ⊆ `SYSTEM.ARMOR.PROPERTIES` (filtrer sinon)                            |           |      |
| TASK-028 | Mode strict: rejet si `category` inconnue ou defense/soak NaN                             |           |      |
| TASK-029 | Log warn détaillé pour chaque rejet (`ARMOR_IMPORT_INVALID`)                              |           |      |
| TASK-030 | Empêcher insertion d’objet si `validateArmorSystem` retourne `valid=false`                |           |      |
| TASK-031 | Test interne sur nombre de propriétés > 12 → tronquer + warn `ARMOR_PROPERTIES_TRUNCATED` |           |      |
| TASK-032 | Instrumentation: enregistrer motifs de rejet (array codes)                                |           |      |

### Implementation Phase 4 - Tests Unitaires & Intégration

- GOAL-004: Couverture >95% branche.

| Task     | Description                                                          | Completed | Date |
| -------- | -------------------------------------------------------------------- | --------- | ---- |
| TASK-033 | Créer `tests/importer/armor-oggdude.spec.mjs`                        |           |      |
| TASK-034 | TEST: catégorie connue mappée correctement                           |           |      |
| TASK-035 | TEST: catégorie inconnue → défaut medium (non strict)                |           |      |
| TASK-036 | TEST: mode strict + catégorie inconnue → rejet                       |           |      |
| TASK-037 | TEST: propriétés connues dédupliquées                                |           |      |
| TASK-038 | TEST: propriété inconnue → warn + exclusion                          |           |      |
| TASK-039 | TEST: Defense/Soak NaN → 0 + warn                                    |           |      |
| TASK-040 | TEST: Defense/Soak aberrants (>100) → clamp + warn                   |           |      |
| TASK-041 | TEST: Rarity hors borne → clamp                                      |           |      |
| TASK-042 | TEST: Price négatif → 0                                              |           |      |
| TASK-043 | TEST: Sanitize description `<script>alert()` retiré                  |           |      |
| TASK-044 | TEST: Tri alphabétique propriétés                                    |           |      |
| TASK-045 | TEST: Instrumentation stats (unknownProperties++, unknownCategory++) |           |      |
| TASK-046 | TEST: Rejet item invalid (strict sans catégorie)                     |           |      |
| TASK-047 | TEST: Troncature >12 propriétés                                      |           |      |
| TASK-048 | TEST: resetArmorImportStats() remet compteurs à 0                    |           |      |
| TASK-049 | TEST: Performance (500 armors synthétiques < seuil X ms)             |           |      |

### Implementation Phase 5 - Documentation & Traçabilité

- GOAL-005: Documenter nouveau flux.

| Task     | Description                                                                                 | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-050 | Créer `documentation/swerpg/import-armor.md` (mapping, strict mode, limitations propriétés) | ✓         | 2025-11-12 |
| TASK-051 | Mettre à jour `CHANGELOG.md` (section Unreleased Added/Changed/Removed)                     | ✓         | 2025-11-12 |
| TASK-052 | Ajouter exemple avant/après mapping dans doc                                                | ✓         | 2025-11-12 |
| TASK-053 | Mention sécurité sanitisation texte                                                         | ✓         | 2025-11-12 |
| TASK-054 | Lier aux plans species/career/weapon                                                        | ✓         | 2025-11-12 |

### Implementation Phase 6 - Observabilité & Optimisation

- GOAL-006: Metrics & robustesse.

| Task     | Description                                                                        | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-055 | Export JSON final stats dans log debug après import batch                          | ✓         | 2025-11-12 |
| TASK-056 | Ajouter tag PERF sur boucle propriétés si future optimisation possible             | ✓         | 2025-11-12 |
| TASK-057 | Audit mémoire (absence de références persistantes sur arrays temporaires)          | ✓         | 2025-11-12 |
| TASK-058 | Évaluer fusion catégorie + propriété dans une seule passe map/reduce (ADR si gain) | ✓         | 2025-11-12 |
| TASK-059 | Mettre statut plan → In progress après début dev                                   | ✓         | 2025-11-12 |
| TASK-060 | Marquer plan Completed après validation manuelle en instance Foundry               | ✓         | 2025-11-12 |

## 3. Alternatives

- **ALT-001**: Conserver toutes catégories comme propriétés (rejeté: confusion sémantique).
- **ALT-002**: Migration post-création pour réécrire items (rejeté: double coût + complexité).
- **ALT-003**: Ignorer entièrement propriétés inconnues sans log (rejeté: invisibilité des erreurs source).
- **ALT-004**: Compter multiplicité des propriétés (rejeté: schéma actuel Set sans quantification).

## 4. Dependencies

- **DEP-001**: `SYSTEM.ARMOR.CATEGORIES`
- **DEP-002**: `SYSTEM.ARMOR.PROPERTIES`
- **DEP-003**: Logger `module/utils/logger.mjs`
- **DEP-004**: XML structure `Armors.Armor`
- **DEP-005**: Schéma hérité via `SwerpgCombatItem`
- **DEP-006**: Contexte d’import `buildArmorContext`

## 5. Files

- **FILE-001**: `module/importer/items/armor-ogg-dude.mjs` (refactor)
- **FILE-002**: `module/models/armor.mjs` (référence schéma - lecture seule)
- **FILE-003**: `module/importer/mappings/oggdude-armor-category-map.mjs`
- **FILE-004**: `module/importer/mappings/oggdude-armor-property-map.mjs`
- **FILE-005**: `module/importer/mappings/index-armor.mjs`
- **FILE-006**: `tests/importer/armor-oggdude.spec.mjs`
- **FILE-007**: `documentation/swerpg/import-armor.md`
- **FILE-008**: `CHANGELOG.md` (mise à jour)

## 6. Testing

- **TEST-001**: Catégorie connue → mapping correct
- **TEST-002**: Catégorie inconnue non strict → fallback medium
- **TEST-003**: Catégorie inconnue strict → rejet
- **TEST-004**: Propriété inconnue exclue + warn
- **TEST-005**: Defense/Soak NaN → 0
- **TEST-006**: Defense/Soak >100 clamp
- **TEST-007**: Rarity clamp
- **TEST-008**: Price négatif → 0
- **TEST-009**: Sanitize description
- **TEST-010**: Tri propriétés
- **TEST-011**: Stats incrémentation
- **TEST-012**: Rejet strict item invalid
- **TEST-013**: Troncature >12 propriétés
- **TEST-014**: resetArmorImportStats()
- **TEST-015**: Performance 500 items
- **TEST-016**: Propriétés Set sans doublons
- **TEST-017**: Absence champs non supportés
- **TEST-018**: Mode non strict conserve catégorie fallback
- **TEST-019**: Logs warn présents pour inconnus
- **TEST-020**: Couverture >95% branches

## 7. Risks & Assumptions

- **RISK-001**: Table catégorie incomplète → fallback excessifs.
- **RISK-002**: Valeurs Defense/Soak extrêmes pouvant masquer erreurs de source.
- **RISK-003**: Troncature propriétés pourrait perdre signal métier (documenté).
- **RISK-004**: Mode strict rejetant trop d’items en import initial.
- **ASSUMPTION-001**: `Categories.Category[]` contient au plus une catégorie primaire.
- **ASSUMPTION-002**: `SYSTEM` initialisé avant lancer importer.
- **ASSUMPTION-003**: Logger non bloquant.
- **ASSUMPTION-004**: Propriétés n’ont pas besoin de compter des occurrences.

## 8. Related Specifications / Further Reading

- `plan/features/fix-mapper-species-oggdude.md`
- `plan/features/fix-mapper-careers-oggdude.md`
- `plan/refactor-weapon-oggdude-mapper-1.md`
- Foundry VTT DataModel: https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
- Fields API: https://foundryvtt.com/api/modules/foundry.data.fields.html
