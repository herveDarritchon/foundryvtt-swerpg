---
goal: Correction du mapper OggDude Weapon pour alignement avec le modèle SwerpgWeapon
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: herve.darritchon
status: 'Planned'
tags: ['feature', 'refactor', 'migration', 'data-import', 'oggdude', 'weapon']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ce plan définit la refonte du mapper `weapon-ogg-dude.mjs` pour produire des objets compatibles avec le schéma et la logique métier de l’Item `Weapon` (`module/models/weapon.mjs`). Il élimine les champs non supportés, introduit des tables de correspondance déterministes (skills, range, qualities, slots) et garantit une validation stricte et testable.

## 1. Requirements & Constraints

- **REQ-001**: Le mapper doit retourner uniquement des clés root Foundry valides: `name`, `type: 'weapon'`, `img`, `system`, `folder` (optionnel context) — aucun champ arbitraire supplémentaire.
- **REQ-002**: Le sous-objet `system` doit contenir uniquement les champs déclarés dans `SwerpgWeapon.defineSchema()` + ceux hérités de `SwerpgCombatItem` (ex: `damage`, `crit`, `skill`, `range`, `qualities`, `animation` (optionnel), `encumbrance`, `rarity`, `price`, `hp`, `restricted`, `slot`, `broken` si prévu par le parent).
- **REQ-003**: Combiner `xmlWeapon.Damage` (base) et `xmlWeapon.DamageAdd` (bonus fixe) en une valeur normalisée `damage` bornée 0–20 (clamp).
- **REQ-004**: Mapper `xmlWeapon.Crit` vers `crit` (borné 0–20, clamp, défaut = 0 si absent).
- **REQ-005**: Mapper `xmlWeapon.SkillKey` via une table de correspondance déterministe vers un ID de skill système; ignorer inconnus avec `logger.warn`.
- **REQ-006**: Mapper `xmlWeapon.Range` et/ou `xmlWeapon.RangeValue` vers une entrée valide de `SYSTEM.WEAPON.RANGETYPES` (ex: engaged, short, medium, long, extreme) via table RANGE_MAP.
- **REQ-007**: Construire `qualities` = Set de IDs qualité (`SYSTEM.WEAPON.QUALITIES`), dérivé de `xmlWeapon.Qualities.Quality[].Key` en ignorant doublons et inconnus.
- **REQ-008**: Si `Qualities.Quality[].Count > 1` et qualité répétable, dupliquer logique via suffixe ou ignorer selon nature (décision PAT-003); pour ce plan: répéter l’ID autant de fois n’est PAS permis (Set) → appliquer augmentation implicite via log seulement (PATTERN explicité dans doc).
- **REQ-009**: Mapper `xmlWeapon.Hands` vers `slot` (ONE_HAND / TWO_HAND) via table HANDS_MAP; défaut = ONE_HAND.
- **REQ-010**: Si `xmlWeapon.NoMelee === true`, marquer portée/ranged cohérente (range min ≥ short) et log debug.
- **REQ-011**: Ignorer champs non-supportés: `sizeLow`, `sizeHigh`, `attachCostMult`, `ordnance`, `vehicleNoReplace`, `scale`, `weaponModifiers`, `mods`, `eraPricing`, `categories`, `sources`.
- **REQ-012**: Normaliser `rarity` (clamp 0–20) et `price` (>=0).
- **REQ-013**: Support `restricted` comme booléen dans `system.restricted` si accepté par parent.
- **REQ-014**: Tout champ falsy critique (`skill`, `range`) déclenche exclusion de l'objet avec log warn catégorisé `WEAPON_IMPORT_INVALID`.
- **REQ-015**: Ajouter validation finale: chaque entrée `qualities` ∈ keys `SYSTEM.WEAPON.QUALITIES`; sinon exclusion silencieuse + comptage rejet.
- **REQ-016**: Ajouter instrumentation (stats) : total armes traitées, total rejetées, skills inconnus, qualities inconnues.
- **REQ-017**: Mode strict activable (const FLAG_STRICT_WEAPON_VALIDATION) pour forcer rejet si skill ou range non résolu.
- **SEC-001**: Empêcher injection XSS via `name` / `description` → trim + replacer tout `<script` par entité HTML (sanitisation légère).
- **SEC-002**: Aucune exécution dynamique depuis données XML (pas d`eval`, pas de chemins fichiers arbitraires).
- **CON-001**: Ne pas modifier `SwerpgWeapon` (adaptation côté importer uniquement).
- **CON-002**: Conserver structure de contexte retournée par `buildWeaponContext`.
- **GUD-001**: Utiliser `logger.debug` pour flux normal, `logger.warn` pour anomalies mappage.
- **PAT-001**: Reproduire pattern de mapping Species/Career (tables, filtrage, Set, log rejet).
- **PAT-002**: Règle de clamp numérique (min/max) alignée sur schema (damage/crit 0–20).
- **PAT-003**: Gestion Count sur qualité répétable: appliquer log informatif sans altérer Set (simplification).
- **PAT-004**: Filtrage final `qualities` et structure stable ordonnée (tri alphabétique) pour déterminisme.
- **PAT-005**: Tests couvrent >95% branches mapping (cible couverture).
- **PERF-001**: Effet minimal en mémoire: aucune copie profonde inutile; réutiliser arrays transitoires.

## 2. Implementation Steps

### Implementation Phase 1 - Tables de Correspondance & Infrastructure Mapping

- GOAL-001: Créer les tables et helpers déterministes pour skills, range, qualities, slot/hands, numeric clamps.

| Task     | Description                                                                                                          | Completed | Date       |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Créer `module/importer/mappings/oggdude-weapon-skill-map.mjs` export `WEAPON_SKILL_MAP` (codes → skill IDs système)  | ✅        | 2024-12-11 |
| TASK-002 | Créer `module/importer/mappings/oggdude-weapon-range-map.mjs` export `WEAPON_RANGE_MAP` (codes OggDude → range IDs)  | ✅        | 2024-12-11 |
| TASK-003 | Créer `module/importer/mappings/oggdude-weapon-quality-map.mjs` si divergences de nommage (codes → qualité système)  | ✅        | 2024-12-11 |
| TASK-004 | Créer `module/importer/mappings/oggdude-weapon-hands-map.mjs` (ex: '1','One','Single'→ONE_HAND / '2','Two'→TWO_HAND) | ✅        | 2024-12-11 |
| TASK-005 | Implémenter `clampNumber(value,min,max,defaultValue)` utilitaire local réutilisable                                  | ✅        | 2024-12-11 |
| TASK-006 | Implémenter `sanitizeText(str)` (trim, remplacer `<script` → `&lt;script`)                                           | ✅        | 2024-12-11 |
| TASK-007 | Ajouter fichier `module/importer/mappings/index-weapon.mjs` centralisant re-export des tables                        | ✅        | 2024-12-11 |
| TASK-008 | Rédiger tests unitaires mappages (1 spec par table)                                                                  |           |            |

### Implementation Phase 2 - Refactor Mapper Principal

- GOAL-002: Réécrire `weaponMapper` pour qu'il produise un objet conforme au schéma.

| Task     | Description                                                                                             | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-009 | Renommer fonction interne vers `mapOggDudeWeapon(xmlWeapon)` pour clarté                                | ✅        | 2024-12-27 |
| TASK-010 | Construire structure root `{ name, type:'weapon', img, system:{...} }`                                  | ✅        | 2024-12-27 |
| TASK-011 | Mapper `SkillKey` via `WEAPON_SKILL_MAP` → `system.skill`; warn si inconnu                              | ✅        | 2024-12-27 |
| TASK-012 | Mapper Range (préférence `RangeValue` si présent sinon `Range`) via `WEAPON_RANGE_MAP` → `system.range` | ✅        | 2024-12-27 |
| TASK-013 | Calculer `damage = clampNumber(Damage + (DamageAdd or 0),0,20,0)`                                       | ✅        | 2024-12-27 |
| TASK-014 | Calculer `crit = clampNumber(Crit,0,20,0)`                                                              | ✅        | 2024-12-27 |
| TASK-015 | Mapper `Qualities.Quality[].Key` → transformer via QUALITY_MAP; filtrer duplicats avec Set              | ✅        | 2024-12-27 |
| TASK-016 | Exclure qualité inconnue (warn); ignorer `Count` >1 (log debug mention "MULTI_COUNT_IGNORED")           | ✅        | 2024-12-27 |
| TASK-017 | Mapper `restricted`, `price`, `rarity`, `encumbrance`, `hp` (clamp ≥0 / clamp 0–20 pour rarity)         | ✅        | 2024-12-27 |
| TASK-018 | Mapper `Hands` via `WEAPON_HANDS_MAP` → `system.slot`                                                   | ✅        | 2024-12-27 |
| TASK-019 | Exclure champs non supportés listés REQ-011                                                             |           |            |
| TASK-020 | Appliquer `sanitizeText` sur `name` et `description`                                                    |           |            |
| TASK-021 | Ignorer item si `system.skill` ou `system.range` indéfinis en mode strict                               |           |            |
| TASK-022 | Ajouter instrumentation accumulation stats dans module (objet `weaponImportStats`)                      |           |            |
| TASK-023 | Tri final `system.qualities = Array.from(set).sort()`                                                   |           |            |
| TASK-024 | Ajouter export des stats via fonction `getWeaponImportStats()`                                          |           |            |

### Implementation Phase 3 - Validation & Filtrages Avancés

- GOAL-003: Ajouter couche validation & mode strict.

| Task     | Description                                                                                                         | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-025 | Implémenter `validateWeaponSystem(system)` : retourne {valid:boolean, errors:string[]}                              |           |      |
| TASK-026 | Conditions: damage, crit entiers; skill/range string non vide; qualities array ≤ 12 (borne décorative anti-surplus) |           |      |
| TASK-027 | Mode strict: vérifier `system.skill ∈ Object.keys(SYSTEM.WEAPON.SKILLS)`                                            |           |      |
| TASK-028 | Mode strict: vérifier `system.range ∈ Object.keys(SYSTEM.WEAPON.RANGETYPES)`                                        |           |      |
| TASK-029 | Filtrer toute qualité hors `SYSTEM.WEAPON.QUALITIES` (compteur rejet)                                               |           |      |
| TASK-030 | Logger résumé par arme: skillInconnues, qualitiesRejetees, validité                                                 |           |      |
| TASK-031 | Si invalid → ne pas inclure dans résultat final `weaponMapper` + incrémenter stats.rejected                         |           |      |
| TASK-032 | Ajouter test pour invalidation volontaire (skill inconnu en strict)                                                 |           |      |

### Implementation Phase 4 - Tests Unitaires & d’Intégration

- GOAL-004: Couverture >95% branches mapping & validation.

| Task     | Description                                                                 | Completed | Date |
| -------- | --------------------------------------------------------------------------- | --------- | ---- |
| TASK-033 | Créer fichier `tests/importer/weapon-oggdude.spec.mjs`                      |           |      |
| TASK-034 | TEST: skill mapping connu                                                   |           |      |
| TASK-035 | TEST: skill code inconnu → warn + exclusion strict                          |           |      |
| TASK-036 | TEST: range mapping (RangeValue prioritaire)                                |           |      |
| TASK-037 | TEST: damage + damageAdd clamp                                              |           |      |
| TASK-038 | TEST: qualities déduplication + rejet inconnue                              |           |      |
| TASK-039 | TEST: Count>1 log MULTI_COUNT_IGNORED                                       |           |      |
| TASK-040 | TEST: Hands mapping → slot TWO_HAND                                         |           |      |
| TASK-041 | TEST: restricted boolean conservé                                           |           |      |
| TASK-042 | TEST: invalid system (missing skill strict) rejeté                          |           |      |
| TASK-043 | TEST: stats accumulation (total, rejected, unknownSkills, unknownQualities) |           |      |
| TASK-044 | TEST: sanitation name/description (injection `<script`)                     |           |      |
| TASK-045 | TEST: qualities triées alphabétiquement                                     |           |      |
| TASK-046 | TEST: performance (mapper sur 500 armes synthétiques < seuil temps défini)  |           |      |

### Implementation Phase 5 - Documentation & Changelog

- GOAL-005: Documenter le nouveau flux et enregistrer changements.

| Task     | Description                                                                                 | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-047 | Créer `documentation/swerpg/import-weapon.md` (flux mapping, tables, strict mode, exemples) |           |      |
| TASK-048 | Mettre à jour `CHANGELOG.md` section Unreleased (Added/Changed/Removed)                     |           |      |
| TASK-049 | Ajouter mention sécurité (sanitisation) dans doc import weapon                              |           |      |
| TASK-050 | Ajouter section "Limitations" (Count ignoré, qualities Set)                                 |           |      |

### Implementation Phase 6 - Observabilité & Optimisation

- GOAL-006: Ajouter métriques et vérifier absence régression.

| Task     | Description                                                                                       | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-051 | Ajouter fonction `resetWeaponImportStats()`                                                       |           |      |
| TASK-052 | Exporter stats après import massif (log final format JSON)                                        |           |      |
| TASK-053 | Ajouter tag PERF dans code si boucle critique (qualités)                                          |           |      |
| TASK-054 | Audit mémoire (pas de rétention arrays temporaires)                                               |           |      |
| TASK-055 | Ajouter test charge: importer 1000 armes synthétiques (mesure durée + pas d’augmentation mémoire) |           |      |
| TASK-056 | Évaluer éventuelle fusion des maps dans un seul objet (décision ADR si gain minimal)              |           |      |
| TASK-057 | Statut plan → In progress après démarrage impl                                                    |           |      |

## 3. Alternatives

- **ALT-001**: Conserver mappage brut et effectuer migration post-création d’Item (rejeté: double coût + complexité).
- **ALT-002**: Injecter directement valeurs système sans table (rejeté: fragilité si codes OggDude varient).
- **ALT-003**: Utiliser regex heuristiques pour range/skills (rejeté: non déterministe).
- **ALT-004**: Dupliquer qualités selon Count (rejeté: Set ne supporte pas multiplicité; design système différent).

## 4. Dependencies

- **DEP-001**: `SYSTEM.WEAPON.SKILLS`
- **DEP-002**: `SYSTEM.WEAPON.RANGETYPES`
- **DEP-003**: `SYSTEM.WEAPON.QUALITIES`
- **DEP-004**: Logger `module/utils/logger.mjs`
- **DEP-005**: Structure XML OggDude: `Weapons.Weapon`
- **DEP-006**: Foundry DataModel validation (appel lors création Item)
- **DEP-007**: Super-classe `SwerpgCombatItem` (héritage des champs)

## 5. Files

- **FILE-001**: `module/importer/items/weapon-ogg-dude.mjs` (refactor principal)
- **FILE-002**: `module/models/weapon.mjs` (référence schéma - lecture seule)
- **FILE-003**: `module/importer/mappings/oggdude-weapon-skill-map.mjs`
- **FILE-004**: `module/importer/mappings/oggdude-weapon-range-map.mjs`
- **FILE-005**: `module/importer/mappings/oggdude-weapon-quality-map.mjs`
- **FILE-006**: `module/importer/mappings/oggdude-weapon-hands-map.mjs`
- **FILE-007**: `module/importer/mappings/index-weapon.mjs`
- **FILE-008**: `tests/importer/weapon-oggdude.spec.mjs`
- **FILE-009**: `documentation/swerpg/import-weapon.md`
- **FILE-010**: `CHANGELOG.md` (mise à jour Unreleased)

## 6. Testing

- **TEST-001**: Skill mapping succès (code connu → ID attendu)
- **TEST-002**: Skill inconnu en mode strict rejet item
- **TEST-003**: Range mapping hiérarchie RangeValue > Range
- **TEST-004**: Damage clamp et addition DamageAdd
- **TEST-005**: Crit clamp
- **TEST-006**: Qualities déduplication + rejet inconnues
- **TEST-007**: Count>1 qualité → log MULTI_COUNT_IGNORED
- **TEST-008**: Slot mapping Hands=2 → TWO_HAND
- **TEST-009**: Sanitize name/description
- **TEST-010**: Instrumentation stats (valeurs calculées correctes)
- **TEST-011**: Rejet item invalide (skill missing strict)
- **TEST-012**: Performance test (1000 armes < seuil temps X ms)
- **TEST-013**: Qualities tri alphabétique stable
- **TEST-014**: Rarity clamp 0–20
- **TEST-015**: Price ≥0
- **TEST-016**: Mode non strict accepte skill inconnu (avec warn + stats)
- **TEST-017**: Strict range invalid → rejet
- **TEST-018**: Unknown quality n’apparaît pas dans final system.qualities
- **TEST-019**: Stats reset fonctionnel
- **TEST-020**: Injection `<script>` neutralisée

## 7. Risks & Assumptions

- **RISK-001**: Codes OggDude inattendus provoquant rejet massif (atténuation: logs + table extensible).
- **RISK-002**: Différences futures dans schema Weapon parent (nécessité maintenance).
- **RISK-003**: Mode strict trop agressif réduit import utilisable.
- **RISK-004**: Performance dégradée sur imports massifs si logs excessifs.
- **RISK-005**: Qualities Count ignoré pourrait frustrer utilisateurs (doc clarificatrice).
- **ASSUMPTION-001**: Structure XML constante `Qualities.Quality`.
- **ASSUMPTION-002**: `SYSTEM` disponible avant exécution importer.
- **ASSUMPTION-003**: Logger non bloquant (I/O asynchrone acceptée).
- **ASSUMPTION-004**: Aucun besoin immédiat de mapping pour `animation`.

## 8. Related Specifications / Further Reading

- `plan/features/fix-mapper-species-oggdude.md`
- `plan/features/fix-mapper-careers-oggdude.md`
- Foundry VTT DataModel: https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html
- Foundry Fields API: https://foundryvtt.com/api/modules/foundry.data.fields.html
- Importer OggDude existant (`module/importer/items/*.mjs`)
