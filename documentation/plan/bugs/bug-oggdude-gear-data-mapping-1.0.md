---
goal: Correction du mapping des données Gear OggDude vers Items SWERPG (préservation BaseMods & WeaponModifiers, description enrichie, source et taxonomie)
version: 1.0
date_created: 2025-11-18
last_updated: 2025-11-18
owner: SWERPG Core Dev
status: 'Planned'
tags: [bug, importer, oggdude, gear, data-mapping]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Bugfix visant à corriger la perte d'information lors de l'import OggDude du fichier `Gear.xml`. Actuellement les Items `gear` créés ignorent Price/Encumbrance/Rarity/Type réels, perdent la description, les sections `<BaseMods>` et `<WeaponModifiers>`. Le plan définit les tâches pour : 1) extraire et nettoyer correctement les champs simples, 2) intégrer la source (ouvrage + page), 3) sérialiser BaseMods et WeaponModifiers dans la description puis dans des `flags` structurés préparant des évolutions futures (actions, item weapon dérivé), 4) préserver Type/taxonomie sans régression sur performance, stabilité ou autres imports (armor/weapons/talents). Compatible Foundry v13.

## 1. Requirements & Constraints

- **REQ-001**: Mapper correctement `Price`, `Encumbrance`, `Rarity` depuis `<Price>`, `<Encumbrance>`, `<Rarity>` en valeurs entières fiables (>=0) dans `system.*`.
- **REQ-002**: Conserver `<Type>` : remplir `system.category` (slugifié) ou fallback `flags.swerpg.originalType` si invalid.
- **REQ-003**: Nettoyer `<Description>` (suppression balises OggDude `[H3]`, `[h3]`, `[b]`, etc.) en conservant la structure lisible + sauter lignes significatives.
- **REQ-004**: Apposer la source sous forme "Source: NOM, p.PAGE" issue de l'élément Source (attribut Page) en bas de la description publique.
- **REQ-005**: Concaténer une section "Base Mods:" listant chaque `<Mod><MiscDesc>` (préserve codes de dés `[AD]` etc.).
- **REQ-006**: Concaténer une section "Weapon Use:" si `<WeaponModifiers>` présent avec Skill, Damage (Damage + DamageAdd → libellé Brawn + X si base=0), Crit, Range (wrEngaged → Engaged), Qualities (clé + rang).
- **REQ-007**: Sérialiser structure des BaseMods dans `flags.swerpg.oggdude.baseMods[]` (facultatif mais implémenté pour future exploitation actions).
- **REQ-008**: Sérialiser structure weapon profile dans `flags.swerpg.oggdude.weaponProfile{ skillKey, damage, damageAdd, crit, rangeValue, qualities[] }`.
- **REQ-009**: Ne rien perdre si certains sous-champs manquants : valeurs par défaut sûres (ex: rarity=1 si absent) sans rejet.
- **REQ-010**: Maintenir performance : importer 150+ gear en < 150ms sur configuration actuelle ( proximité des tests existants ).
- **REQ-011**: Ajouter logs d'observabilité (niveau debug) sur parse des BaseMods & WeaponModifiers (compte éléments, anomalies).
- **REQ-012**: Backwards compatibility: ne pas casser schema SwerpgGear existant (aucun champ supprimé), seulement enrichir description + flags.
- **REQ-013**: Respect des règles de sécurité (pas d'injection HTML non nettoyée, utilisation sanitation existante).
- **REQ-014**: Tests Vitest couvrent : mapping complet, absence de WeaponModifiers, présence partielle de champs, performance.
- **REQ-015**: Tests garantissent absence de régression sur importer existant (armes/armures unaffected).
- **REQ-016**: Accessibilité indirecte: description générée texte brut sans HTML exotique permettant lecture screen reader.
- **REQ-017**: Flag `FLAG_STRICT_GEAR_VALIDATION` inchangé mais algorithme ignore strict pour sections BaseMods/WeaponModifiers (juste enrichissement).
- **REQ-018**: Normalisation slug catégorie: caractères non alphanum remplacés par tirets bas, tout en minuscule.
- **REQ-019**: Conservation de la clé OggDude via `flags.swerpg.oggdudeKey` (principe déjà présent).
- **REQ-020**: Gestion multi qualities dans WeaponModifiers (coalescence même clé + somme counts).

- **SEC-001**: Sanitize texte descriptions & mods (réutiliser utilitaire `sanitizeText` ou créer version gear) pour prévenir XSS.
- **SEC-002**: Ne pas interpréter balises OggDude comme HTML réel (pas d'injection dynamique via innerHTML).

- **CON-001**: Compatibilité Foundry VTT ≥ v13; ne pas invoquer APIs v14+.
- **CON-002**: Ne pas modifier structure pack existante; seulement items nouvellement importés enrichis.
- **CON-003**: Volume import élevé (plusieurs milliers de Gear) → complexité O(n) linéaire, pas de parsing regex lourds non nécessaires.
- **CON-004**: Pas de migration rétroactive automatique des gear déjà importés (documenté en Assumption).
- **CON-005**: Fichier `gear-ogg-dude.mjs` reste point d'entrée principal; éviter fragmentation en trop de petits modules (limiter à 1 nouveau utilitaire si besoin).
- **CON-006**: Limiter taille description générée (éviter duplication Source si déjà présent).
- **CON-007**: Tests existants `gear-import.integration.spec.mjs` doivent continuer à passer (adapter assertions si nécessaires pour nouvelles sections).

- **GUD-001**: Suivre pattern de weapon importer pour append source + flags structurés.
- **GUD-002**: Logging uniforme `logger.debug('[GearImporter] ...')` pour nouveaux parse steps.
- **GUD-003**: Self-explanatory code: fonctions courtes, noms explicites (`extractGearWeaponProfile`, `formatBaseModsSection`).

- **PAT-001**: Recyclage utilitaires weapon: `sanitizeText`; créer utilitaire `sanitizeOggDudeGearDescription` dérivé de `sanitizeOggDudeWeaponDescription` si divergences.
- **PAT-002**: Construction progressive description: pipeline concat en tableau puis join par double newline pour lisibilité.
- **PAT-003**: Mapping qualities via normalisation clé en minuscule; si count manquant → 1.
- **PAT-004**: Rendu final description uniquement texte (pas markdown riche pour le bugfix).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse & cadrage précis des points de modification dans l'importer Gear.

| Task     | Description                                                                                                              | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-001 | Identifier fonctions: `gearMapper`, `buildGearSystem`, utilitaires `normalizeGearDescription` pour extension. (FILE-001) |           |           |      |
| TASK-002 | Cartographier structure XML attendue pour BaseMods / WeaponModifiers; définir représentation interne (flags). (FILE-001) |           |           |      |
| TASK-003 | Vérifier utilitaires réutilisables dans `oggdude-weapon-utils.mjs` pour sanitation & source parsing. (FILE-002)          |           |           |      |
| TASK-004 | Lister impacts tests existants `tests/importer/gear-import.integration.spec.mjs` et nouvelles specs à créer. (FILE-005)  |           |           |      |
| TASK-005 | Confirmer absence d'effets de bord sur armor/weapon importers (lecture rapide de leurs modules). (FILE-003, FILE-004)    |           |           |      |
| TASK-006 | Définir stratégie performance (une passe unique, pas d'accès DOM).                                                       | TASK-001  |           |      |
| TASK-007 | Finaliser ensemble `REQ/CON/PAT` (compléter si trous identifiés).                                                        | TASK-002  |           |      |

### Implementation Phase 2

- GOAL-002: Conception détaillée du mapping enrichi & mise à jour code + tests.

| Task     | Description                                                                                                               | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Créer fonction `sanitizeOggDudeGearDescription(description)` (si divergence minimale sinon réutiliser weapon). (FILE-006) | TASK-001  |           |      |
| TASK-009 | Implémenter `extractGearSourceInfo(xmlGear.Source)` inspirée de weapon. (FILE-001)                                        | TASK-001  |           |      |
| TASK-010 | Implémenter parse BaseMods: `extractBaseMods(xmlGear.BaseMods)` → array structuré & section description. (FILE-001)       | TASK-002  |           |      |
| TASK-011 | Implémenter parse WeaponModifiers: `extractWeaponProfile(xmlGear.WeaponModifiers)` + normalisation qualités. (FILE-001)   | TASK-002  |           |      |
| TASK-012 | Ajouter slug catégorie: `slugifyCategory(originalType)` (remplacer espaces & `/` par `-`, toLowerCase). (FILE-001)        | TASK-001  |           |      |
| TASK-013 | Refactor `buildGearSystem` pour intégrer description pipeline & valeurs existantes + sections. (FILE-001)                 | TASK-010  |           |      |
| TASK-014 | Enrichir `gearMapper` pour setter flags: baseMods, weaponProfile, source, originalType. (FILE-001)                        | TASK-010  |           |      |
| TASK-015 | Ajouter logs debug pour chaque section parse (compte mods, qualité, anomalies). (FILE-001)                                | TASK-010  |           |      |
| TASK-016 | Mettre à jour test existant pour tolérer sections supplémentaires (ajustements assertions description). (FILE-005)        | TASK-013  |           |      |
| TASK-017 | Créer nouveau test `gear-import.weapon-profile.spec.mjs` pour cas avec WeaponModifiers & BaseMods. (FILE-007)             | TASK-011  |           |      |
| TASK-018 | Créer test performance >150 items (déjà partiel) adapt pour nouveaux parse (durée <150ms). (FILE-007)                     | TASK-013  |           |      |
| TASK-019 | Créer test absence WeaponModifiers → pas de section Weapon Use. (FILE-007)                                                | TASK-011  |           |      |
| TASK-020 | Créer test robustesse champs manquants (pas de Price / Rarity / BaseMods) → defaults + pas d'erreur. (FILE-007)           | TASK-013  |           |      |
| TASK-021 | Créer test qualities merge counts. (FILE-007)                                                                             | TASK-011  |           |      |
| TASK-022 | Vérifier successful mapping multi mods & weapon profile flags JSON structure. (FILE-007)                                  | TASK-011  |           |      |
| TASK-023 | Ajouter documentation courte dans `documentation/importer/` sur comportement gear mapping (résumé). (FILE-008)            | TASK-014  |           |      |

### Implementation Phase 3

- GOAL-003: Préparer stratégie de validation, migration ciblée et rollback.

| Task     | Description                                                                                              | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-024 | Définir script manuel éventuel de réparation pour gear existants (documenté seulement). (FILE-008)       | TASK-023  |           |      |
| TASK-025 | Rédiger critères de rollback (perte performance, description > taille limite) dans doc. (FILE-008)       | TASK-023  |           |      |
| TASK-026 | Checklist manuelle QA (import gear avec WeaponModifiers, gear simple, volume 500 items). (FILE-008)      | TASK-023  |           |      |
| TASK-027 | Vérification non régression armor/weapon importer via exécution tests existants. (FILE-005)              | TASK-016  |           |      |
| TASK-028 | Finalisation du plan de release (branch, changelog, incrément version system.json si requis). (FILE-009) | TASK-023  |           |      |

## 3. Alternatives

- **ALT-001**: Créer automatiquement un Item `weapon` lié pour chaque `WeaponModifiers` – rejeté (scope bugfix trop large, nécessite design actions & liaisons).
- **ALT-002**: Stocker BaseMods uniquement en texte dans description sans structure flags – rejeté (perd potentiel future automation, coût faible pour structuré).
- **ALT-003**: Refonte complète architecture importer (factory générique) – rejeté (coût élevé, hors périmètre bugfix ciblé).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x.
- **DEP-002**: Module SWERPG `logger` utilitaire pour debug.
- **DEP-003**: Utilitaires weapon sanitation (`sanitizeText`).
- **DEP-004**: `gear-import-utils.mjs` (stats) conservé.

## 5. Files

- **FILE-001**: `module/importer/items/gear-ogg-dude.mjs` – Core mapping à enrichir (description, flags, parse mods & weapon profile).
- **FILE-002**: `module/importer/mappings/oggdude-weapon-utils.mjs` – Réutilisation sanitizeText; possible extension pour gear.
- **FILE-003**: `module/importer/items/weapon-ogg-dude.mjs` – Référence pattern source + flags.
- **FILE-004**: `module/importer/items/armor-ogg-dude.mjs` – Vérification non-régression.
- **FILE-005**: `tests/importer/gear-import.integration.spec.mjs` – Tests existants à adapter.
- **FILE-006**: `module/importer/mappings/oggdude-gear-utils.mjs` – Nouveau utilitaire (optionnel) description & helpers parse mods/profil.
- **FILE-007**: `tests/importer/gear-import.weapon-profile.spec.mjs` – Nouveau tests spécifiques WeaponModifiers/BaseMods.
- **FILE-008**: `documentation/importer/gear-mapping.md` – Documentation du comportement enrichi (nouveau).
- **FILE-009**: `CHANGELOG.md` – Ajout entrée bugfix + version bump si nécessaire.

## 6. Testing

- **TEST-001**: Mapping complet avec BaseMods + WeaponModifiers → description contient sections, flags structurés; valeurs price/encumbrance/rarity correctes; qualities fusionnées. (REQ-001↔REQ-005↔REQ-006↔REQ-008↔REQ-020)
- **TEST-002**: Gear sans WeaponModifiers → absence section "Weapon Use:"; pas de flag weaponProfile. (REQ-006)
- **TEST-003**: Gear sans BaseMods → absence section "Base Mods:"; flags baseMods inexistants ou tableau vide. (REQ-005)
- **TEST-004**: Champs manquants (Price, Rarity, Encumbrance) → defaults appliqués (> = 0) sans exception. (REQ-009)
- **TEST-005**: Performance batch 200 items (<150ms). (REQ-010)
- **TEST-006**: Sécurité sanitation (injection `<script>` dans Description ou MiscDesc) → neutralisé dans output. (SEC-001)
- **TEST-007**: Qualities avec doublons counts merge (Quality X count 2 + Quality X count 1 → rank 3). (REQ-020)
- **TEST-008**: Source mapping page manquante → format "Source: NOM" sans page. (REQ-004)
- **TEST-009**: Regression armor & weapon importers (run leurs tests existants passent). (REQ-015)
- **TEST-010**: Category slugification Tools/Electronics → tools-electronics. (REQ-018)
- **TEST-011**: Description nettoyage balises `[H3]` disparaissent proprement. (REQ-003)
- **TEST-012**: Flags baseMods structure contient SkillKey + AdvantageCount si présents. (REQ-007)

Stratégie:

- Vitest: ajouter nouveau fichier test FILE-007 couvrant TEST-001..TEST-012.
- Adapter test existant FILE-005 assertions description.
- Pas de Playwright (fonction pure import, pas UI directe) – manuel: validation en Foundry monde test (Checklist TASK-026).

## 7. Risks & Assumptions

- **RISK-001**: Augmentation taille description peut ralentir affichage fiches item (risque faible; texte brut).
- **RISK-002**: Erreur parsing WeaponModifiers multi structures (array vs objet unique) → nécessitera robustesse.
- **RISK-003**: Qualities inconnues polluent description si non filtrées → décision: conserver texte brut qualities même si non mappées.
- **RISK-004**: Performance dégradée si regex trop lourdes dans sanitation → limiter transformations.
- **RISK-005**: Duplication Source si déjà présent dans description initiale → ajouter contrôle avant append.
- **RISK-006**: Flags supplémentaires augmentent taille sauvegarde monde (impact mineur).

- **ASSUMPTION-001**: Pas de migration automatique des gear existants (documenté comme future action).
- **ASSUMPTION-002**: `system.actions` reste vide (pas d'action d'attaque générée pour ce bugfix).
- **ASSUMPTION-003**: BaseMods & WeaponModifiers structures OggDude stables (clé noms attendus).
- **ASSUMPTION-004**: Performance cible machine ~ moderne (exécution tests existants <100ms pour 150 items).

## 8. Related Specifications / Further Reading

- `/documentation/spec/oggdude-importer/bug-fix-gear-import-need1-1.0.md` – Spécification besoin originale.
- `module/importer/items/weapon-ogg-dude.mjs` – Référence pattern weapon importer.
- `module/importer/mappings/oggdude-weapon-utils.mjs` – Utilitaires sanitation.
- Foundry VTT API v13 Documentation – Référence objets Item & flags.
  `tests/importer/gear-import.integration.spec.mjs` – Tests actuels gear importer.
