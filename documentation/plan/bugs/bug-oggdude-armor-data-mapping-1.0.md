---
goal: Correction du mapping OggDude Armor vers Items SWERPG jouables
version: 1.0
date_created: 2025-11-17
last_updated: 2025-11-17
owner: SWERPG Core Dev
status: 'Planned'
tags: [bug, importer, armor, oggdude]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Bugfix visant le domaine `oggdude-importer`: les armures importées depuis `Armor.xml` sont créées avec des valeurs par défaut (0) et une description vide car la structure mappée ne correspond pas au schéma `SwerpgArmor`. Les catégories et BaseMods sont perdues. L’objectif est de corriger le pipeline de mapping pour produire des Items `armor` immédiatement utilisables (défense, soak, encumbrance, rarity, price, hardPoints, description enrichie, tags propriétés issus des catégories, conservation des BaseMods). La cause racine inclut une double encapsulation (`system.system`) introduite par `_storeItems` et un mapper incomplet.

## 1. Requirements & Constraints

- **REQ-001**: Mapper correctement `<Defense>` vers `system.defense.base`.
- **REQ-002**: Mapper `<Soak>` vers `system.soak.base`.
- **REQ-003**: Mapper `<Encumbrance>` vers `system.encumbrance`.
- **REQ-004**: Mapper `<Price>` vers `system.price`.
- **REQ-005**: Mapper `<HP>` vers `system.hardPoints` (pas `hp`).
- **REQ-006**: Mapper `<Rarity>` vers `system.rarity`.
- **REQ-007**: Conserver `<Restricted>` sous forme de tag propriété ou flag clair.
- **REQ-008**: Importer `<Description>` dans `system.description.public` en nettoyant balises `[H3]` / `[h3]`.
- **REQ-009**: Ajouter ligne source “Source: <Book>, p.<Page>” dans la description.
- **REQ-010**: Conserver toutes les entrées `<BaseMods><Mod><MiscDesc>` dans une section “Base Mods:” listée à puces.
- **REQ-011**: Normaliser catégories `<Categories><Category>` en tags propriétés (`sealed`, `full-body`, etc.).
- **REQ-012**: Ne pas perdre les codes dés (`[BO]`, `[SE]`, etc.) dans la description.
- **REQ-013**: Exposer `flags.swerpg.oggdudeKey`, `flags.swerpg.oggdudeSource`, `flags.swerpg.oggdudeSourcePage`.
- **REQ-014**: Prévoir structure optionnelle des BaseMods en `flags.swerpg.oggdude.baseMods` (future évolution).
- **REQ-015**: Garantir absence de double encapsulation des données système (éviter `system.system.*`).
- **REQ-016**: Préserver comportement des autres domaines d’import (weapon, gear, talent) sans régression.
- **REQ-017**: Validation import armure: aucune armure avec valeurs 0 si XML fournit valeurs > 0.
- **REQ-018**: Logger statistiques d’import mises à jour (défense, soak, rejets, catégories inconnues).
- **REQ-019**: Gestion fallback catégorie principale (déjà existant) conservée.
- **REQ-020**: Fusion non destructive des propriétés existantes (`Set`).

- **SEC-001**: Sanitation description pour empêcher injection HTML/JS (conserver sanitizeText).
- **SEC-002**: Rejeter chemins ou noms suspects dans accès fichiers (ne pas réintroduire vulnérabilité).
- **CON-001**: Compatibilité Foundry VTT v13+ sans API expérimentales.
- **CON-002**: Performance: import centaines d’armures sans complexité > O(N).
- **CON-003**: Ne pas casser structure des tests existants talent/weapon.
- **CON-004**: Internationalisation: ajouter nouvelles clés de propriétés dans en.json et fr.json.
- **CON-005**: Les nouvelles propriétés doivent respecter schéma `SetField` (présentes dans `SYSTEM.ARMOR.PROPERTIES`).
- **CON-006**: Nettoyage `[H3]` doit être déterministe et optionnellement remplacer par titre Markdown ou suppression cohérente.
- **CON-007**: Fallback catégorie unknown -> `SYSTEM.ARMOR.DEFAULT_CATEGORY` (medium) si non strict.
- **CON-008**: L’ajout de propriétés supplémentaires (sealed, full-body, restricted) ne doit pas modifier calcul de rarity (aucun rarity bonus).
- **CON-009**: Hard points doivent utiliser champ existant `hardPoints` de `SwerpgCombatItem`.
- **PAT-001**: Pattern unique de mapping: mappers retournent un objet “Item shape” (name, type, img, system) et `_storeItems` extrait `item.system`.
- **PAT-002**: Fonction utilitaire dédiée pour construire la description complète (composition: description nettoyée + source + Base Mods).
- **PAT-003**: Normalisation propriété catégorie: keba-case (`Full Body` -> `full-body`) + lower-case strip quotes.
- **PAT-004**: Tests Vitest isolent mapper sans Foundry complet via mocks minimal.
- **PAT-005**: Ajout d’un adaptateur dans `_storeItems` pour rétrocompatibilité: si `item.system` présent, utiliser `item.system`, sinon `item`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse fine du code existant et identification des points de rupture (double encapsulation, champs erronés).

| Task     | Description                                                                                             | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Inspecter armor-ogg-dude.mjs pour lister divergences (`system.hp`, description simple, Set properties). |           |           |      |
| TASK-002 | Inspecter `_storeItems` dans OggDudeDataElement.mjs pour confirmer double encapsulation.                |           |           |      |
| TASK-003 | Confirmer schéma `SwerpgArmor` (armor.mjs) & `SwerpgCombatItem` (hardPoints).                           |           |           |      |
| TASK-004 | Lister catégories “réelles” observées dans OggDude (exemple spec) à ajouter en PROPERTIES.              | TASK-001  |           |      |
| TASK-005 | Recenser risques régression pour weapon mapper (même structure) et définir stratégie test.              | TASK-002  |           |      |
| TASK-006 | Finaliser inventaire fichiers impactés (FILE-001..009).                                                 | TASK-001  |           |      |
| TASK-007 | Mettre à jour exigences si besoin (REQ ajout ou ajustement) post analyse.                               | TASK-006  |           |      |

### Implementation Phase 2

- GOAL-002: Conception du correctif (adaptateur stockage, mapping étendu, normalisation, description builder).

| Task     | Description                                                                                                         | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Concevoir adaptation `_storeItems`: extraction `item.system` + merge métadonnées (`name`, `img`, flags).            | TASK-002  |           |      |
| TASK-009 | Définir fonction `buildArmorDescription(xmlArmor)` dans armor-ogg-dude.mjs ou util séparé (armor-import-utils.mjs). | TASK-001  |           |      |
| TASK-010 | Définir `normalizeArmorCategoryTag(category)` (kebab-case, lower, strip quotes).                                    | TASK-001  |           |      |
| TASK-011 | Spécifier ajout PROPERTIES: `sealed`, `full-body`, `restricted` (labels i18n).                                      | TASK-004  |           |      |
| TASK-012 | Spécifier structure `flags.swerpg.oggdude.baseMods` (array d’objets `{ text, skillKey?, boostCount? }`).            | TASK-001  |           |      |
| TASK-013 | Stratégie fallback si `BaseMods` absent: ne pas ajouter section “Base Mods”.                                        | TASK-009  |           |      |
| TASK-014 | Définir tests mapping (cas nominal, catégories inconnues, missing numeric, sanitize script injection).              | TASK-005  |           |      |
| TASK-015 | Définir tests non-régression weapon (structure champ non cassée).                                                   | TASK-005  |           |      |
| TASK-016 | Localisation: ajouter clés `ARMOR.PROPERTIES.SEALED`, `ARMOR.PROPERTIES.FULL_BODY`, `ARMOR.PROPERTIES.RESTRICTED`.  | TASK-011  |           |      |

### Implementation Phase 3

- GOAL-003: Implémentation code correctif (mapping, adaptateur, i18n) et hooks de tests.

| Task     | Description                                                                                                                                                            | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-017 | Modifier `_storeItems` (`FILE-003`): utiliser `const systemData = item.system ?? item;` puis construire l’objet final avec `system: systemData`.                       | TASK-008  |           |      |
| TASK-018 | Mettre à jour armor-ogg-dude.mjs (`FILE-001`): remplacer `system.hp` par `system.hardPoints`; générer objet description `system.description = { public, secret: '' }`. | TASK-009  |           |      |
| TASK-019 | Ajouter fonction `buildArmorDescription` (nettoyage `[H3]`, ajout source, liste Base Mods).                                                                            | TASK-009  |           |      |
| TASK-020 | Ajouter normalisation catégories -> propriétés + push `restricted` si vrai (`system.properties.add('restricted')`).                                                    | TASK-010  |           |      |
| TASK-021 | Étendre `SYSTEM.ARMOR.PROPERTIES` dans armor.mjs (`FILE-004`) avec `sealed`, `full-body`, `restricted`.                                                                | TASK-011  |           |      |
| TASK-022 | Localisation en.json / fr.json (`FILE-005`, `FILE-006`): ajouter labels.                                                                                               | TASK-016  |           |      |
| TASK-023 | Ajuster validation `validateArmorSystem` pour accepter nouvelles propriétés (déjà via SYSTEM).                                                                         | TASK-021  |           |      |
| TASK-024 | Ajouter export util (si déplacé) dans armor-import-utils.mjs (`FILE-002`) pour description builder si extraction décidée.                                              | TASK-009  |           |      |
| TASK-025 | Ajouter flags: après mapping, `armorData.flags.swerpg = { oggdudeKey, oggdudeSource, oggdudeSourcePage, baseMods? }`.                                                  | TASK-012  |           |      |
| TASK-026 | Vérifier absence d’impact weapon: importer une arme test -> inspecter structure finale (manuel dev & test automatisé).                                                 | TASK-017  |           |      |
| TASK-027 | Mettre à jour logs statistiques (ajouter compteur `baseModsCount`, `categoryTagsAdded`).                                                                               | TASK-017  |           |      |

### Implementation Phase 4

- GOAL-004: Tests automatisés (Vitest) et validations manuelles.

| Task     | Description                                                                                                      | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-028 | Créer fichier test `tests/importer/armor-import-mapping.spec.mjs` (FILE-007) couvrant cas nominal et edge cases. | TASK-014  |           |      |
| TASK-029 | Ajouter test injection `<script>` dans description (sanitize).                                                   | TASK-028  |           |      |
| TASK-030 | Test catégories inconnues -> fallback + log + pas d’ajout propriété invalidante.                                 | TASK-028  |           |      |
| TASK-031 | Test BaseMods absent -> pas de section “Base Mods”.                                                              | TASK-028  |           |      |
| TASK-032 | Test weapon import non régressé (structure sans double encapsulation, champs attendus).                          | TASK-015  |           |      |
| TASK-033 | Test restricted = true -> tag ajouté.                                                                            | TASK-028  |           |      |
| TASK-034 | Test hardPoints mapping (HP XML -> hardPoints).                                                                  | TASK-028  |           |      |
| TASK-035 | Test propriétés Set contient nouvelles clés (`sealed`, `full-body`) et pas de duplication.                       | TASK-028  |           |      |

### Implementation Phase 5

- GOAL-005: Documentation & finalisation.

| Task     | Description                                                                                                      | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-036 | Mettre à jour spec existante si écarts (documentation/spec/... bug spec) – section “Résultat attendu” confirmée. | TASK-025  |           |      |
| TASK-037 | Ajouter note dans PLAN_DEVELOPPEMENT_EXECUTIF.md sur correction mapping armor.                                   | TASK-036  |           |      |
| TASK-038 | Créer entrée CHANGELOG avec détail bugfix et impact non régressif.                                               | TASK-032  |           |      |
| TASK-039 | Checklist manuelle en Foundry (import réel) validée et logs sans erreurs.                                        | TASK-028  |           |      |
| TASK-040 | Vérifier i18n (labels apparaissent sur fiche armure) – FR/EN.                                                    | TASK-022  |           |      |

## 3. Alternatives

- **ALT-001**: Refactor global des mappers pour retourner directement `system` uniquement. Rejeté (risque régression large multi-domaines, besoin rapide bugfix focalisé).
- **ALT-002**: Créer un post-traitement après création Items pour corriger `system.system`. Rejeté (double écriture + cycles supplémentaires).
- **ALT-003**: Ignorer BaseMods (laisser pour évolution). Rejeté (perte d’information métier).
- **ALT-004**: Ajouter Active Effects pour BaseMods immédiat. Rejeté (hors scope bugfix, complexité).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x.
- **DEP-002**: Système SWERPG initialisé (SYSTEM disponible).
- **DEP-003**: Module OggDudeImporter existant (fichiers mappers).
- **DEP-004**: Vitest pour tests unitaires.
- **DEP-005**: i18n fichiers en.json, fr.json.

## 5. Files

- **FILE-001**: armor-ogg-dude.mjs – Mapper armure principal à corriger.
- **FILE-002**: armor-import-utils.mjs – Sanitisation + statistiques (ajout builder description si choisi).
- **FILE-003**: OggDudeDataElement.mjs – Méthode `_storeItems` adaptateur encapsulation.
- **FILE-004**: armor.mjs – Ajout nouvelles propriétés (sealed, full-body, restricted).
- **FILE-005**: en.json – i18n nouvelles clés propriétés.
- **FILE-006**: fr.json – i18n nouvelles clés propriétés.
- **FILE-007**: `tests/importer/armor-import-mapping.spec.mjs` – Tests Vitest mapping armure.
- **FILE-008**: bug-fix-armor-import-need1-1.0.md – Spécification source.
- **FILE-009**: oggdude-armor-property-map.mjs – Éventuelle extension mapping propriété si nécessaire (synonymes).

## 6. Testing

- **TEST-001** (REQ-001..006, REQ-017): Mapper valeurs numériques – créer mock XML armure -> vérifier `defense.base`, `soak.base`, `encumbrance`, `price`, `hardPoints`, `rarity`.
- **TEST-002** (REQ-008..013): Description enrichie – XML avec `[H3]`, Source Page, BaseMods -> vérifier description publique contient sections et ordonnancement.
- **TEST-003** (REQ-010, REQ-014): BaseMods structurés – vérifier flags baseMods array length et contenu brut dans description.
- **TEST-004** (REQ-011, CON-005): Catégories en propriétés – XML avec `Sealed`, `Full Body` -> tags `sealed`, `full-body` présents.
- **TEST-005** (REQ-007): Restricted = true -> propriété/tag `restricted` présent.
- **TEST-006** (SEC-001): Injection `<script>` dans description -> sortie sanitised (balises échappées).
- **TEST-007** (REQ-015, CON-003): Absence de double encapsulation – item créé possède `item.system.defense.base` sans couche supplémentaire.
- **TEST-008** (REQ-019): Catégories inconnues -> fallback catégorie medium + log + pas de rejet (mode non strict).
- **TEST-009** (REQ-016): Non régression weapon – importer mock weapon et vérifier que structure non cassée après adaptation `_storeItems`.
- **TEST-010** (REQ-020): Propriétés fusion – importer armure avec propriétés existantes + nouvelles -> Set final contient toutes sans duplication.
- **TEST-011** (REQ-012): Conservation codes dés `[BO]` in description.
- **TEST-012** (REQ-018): Statistiques – après mapping plusieurs armures, vérifier compteur unknownCategories/properties mis à jour.

Vitest: mock minimal Foundry (comme tests talent). Playwright: Non requis pour bugfix (hors scope UI). Manuel: Import réel via interface OggDude Importer, inspection fiche armure.

## 7. Risks & Assumptions

- **RISK-001**: Modification `_storeItems` peut impacter autres domaines si logique dépend de structure erronée actuelle.
- **RISK-002**: Ajout propriétés nouvelles pourrait exiger localisation manquante -> affichage labels bruts.
- **RISK-003**: Données déjà importées restent incorrectes (pas de migration incluse).
- **RISK-004**: Catégories OggDude futures non reconnues -> inflation unknown stats mais item jouable.
- **RISK-005**: HardPoints renommage `hp` -> tests internes ou macros utilisateur pourraient pointer ancien champ.
- **ASSUMPTION-001**: Fichiers XML contiennent toujours `<Key>` et `<Name>` (sinon fallback nom vide acceptable).
- **ASSUMPTION-002**: BaseMods structure simple (une couche `Mod`).
- **ASSUMPTION-003**: Pas d’effets automatisés nécessaires pour BaseMods dans ce sprint.
- **ASSUMPTION-004**: Mode strict validation reste `false`.
- **ASSUMPTION-005**: Aucune dépendance de tierce partie nouvelle pour description builder.

## 8. Related Specifications / Further Reading

- bug-fix-armor-import-need1-1.0.md
- PLAN_DEVELOPPEMENT_EXECUTIF.md (processus global)
- armor.mjs (schéma cible)
- Foundry VTT API v13 (TypeDataModel, Item.createDocuments)
- talent-import-fix-validation.spec.mjs (pattern de mocks)
