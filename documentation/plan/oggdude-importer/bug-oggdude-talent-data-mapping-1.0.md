---
goal: "Correction mapping Talent OggDude (isRanked, activation, description, source, DieModifiers)"
version: 1.0
date_created: 2025-11-19
last_updated: 2025-11-19
owner: SWERPG Core Dev
status: 'Planned'
tags: [bug, importer, talent, mapping]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ce plan corrige le mapping des Talents importés depuis le fichier OggDude `Talents.xml` (champ `<Talent>`). Le comportement actuel perd des informations cruciales (Ranked, ActivationValue, description complète, source livre+page, DieModifiers). L'objectif est de produire des Items `talent` conformes au modèle `SwerpgTalent` avec une description enrichie, des activations fiables, un flag de rang correct et la persistance des modificateurs de dés (lisibles + structurés dans des flags pour évolutions futures). Compatibilité Foundry VTT v13 conservée, aucun refactor massif du modèle de données hors scope.

## 1. Requirements & Constraints

- **REQ-001**: Mapper correctement `<Ranked>` / `<IsRanked>` vers `system.isRanked` (true/false fidèle au XML).
- **REQ-002**: Mapper `<ActivationValue>` / `<Activation>` / `<ActivationType>` vers `system.activation` via table de correspondance centralisée (passive, active, incidental, maneuver, action, reaction, fallback passive).
- **REQ-003**: Extraire `<Description>` (ou Text/Summary fallback) et l’injecter dans `system.description` (champ HTML) avec nettoyage (trim, espaces normalisés, limite longueur 2000 chars).
- **REQ-004**: Ajouter la source livre + page depuis `<Sources>/<Source Page="X">Book</Source>` à la fin de la description sous forme: `Source: Book, p.X` (si page définie) ou `Source: Book` (sinon).
- **REQ-005**: Ne pas perdre les `<DieModifiers>`: produire une section lisible ajoutée à la description (label "Die Modifiers:" suivi de puces) reproduisant chaque effet (SkillKey + SetbackCount / DecreaseDifficultyCount / BoostCount / RemoveSetbackCount / UpgradeDifficultyCount / etc.).
- **REQ-006**: Stocker structure des DieModifiers dans `flags.swerpg.oggdude.dieModifiers` (tableau d'objets normalisés: `{ skillKey, setbackCount?, decreaseDifficultyCount?, applyOnce?, ... }`).
- **REQ-007**: Stocker la clé d’origine `<Key>` dans `flags.swerpg.oggdudeKey` pour traçabilité future.
- **REQ-008**: Fallbacks robustes: absence de description → chaîne vide; absence de source → pas de ligne Source; absence de DieModifiers → pas de section.
- **REQ-009**: Sanitation: empêcher injection HTML/JS dans description (conserver texte brut; échapper si besoin avant insertion HTML si futur rendu convertit en HTML).
- **REQ-010**: Non-régression: import des autres domaines (armor, weapon, gear, career, species) inchangé; tests existants doivent continuer à passer.
- **REQ-011**: Performances: importer 500+ talents sans dégradation notable (>5% temps) par rapport à l’existant (assemblage description O(n) sur talents).
- **REQ-012**: Observabilité: compter les talents avec DieModifiers via nouvelle stat `dieModifiers` dans utilitaires (optionnel si faible coût) pour métriques futures.
- **REQ-013**: Activer détection d'activations inconnues existante pour nouveaux codes et ne jamais bloquer l'import (fallback passive).
- **REQ-014**: Respect du modèle `SwerpgTalent` sans modifier `defineSchema()`: description reste un champ unique (non scindé public/secret) – adapter besoin métier à structure actuelle.
- **SEC-001**: Neutraliser tout contenu potentiellement malveillant provenant du XML (strip balises, limiter longueur, ne jamais évaluer code).
- **CON-001**: Compatibilité Foundry v13+ obligatoire (pas d’API expérimentale).
- **CON-002**: Ne pas modifier la structure des packs existants ni migrer Items déjà importés (hors scope).
- **CON-003**: Limite longueur description 2000 caractères (alignement code actuel) – DieModifiers ajoutés inclus; tronquer proprement si dépassement.
- **CON-004**: Ne pas créer d'automatisation d'effets (actions, actorHooks) à partir des DieModifiers (hors scope bugfix).
- **CON-005**: Pas de refactor complet du pipeline d’import – modifications incrémentales ciblées.
- **CON-006**: Internationalisation: le texte généré (section Die Modifiers, Source) reste en anglais pour cohérence interne actuelle (potentiel i18n futur hors scope).
- **GUD-001**: Utiliser pattern existant des fichiers `module/importer/mappings/*` pour nouveau mapping DieModifiers (Single Responsibility).
- **GUD-002**: Logger événements critiques (nombre de talents avec DieModifiers, activations inconnues) au niveau debug/info.
- **PAT-001**: Nouveau module `oggdude-talent-diemodifiers-map.mjs` exposant `extractTalentDieModifiers(talentData)` + `formatTalentDieModifiersForDescription(list)`.
- **PAT-002**: Enrichissement description réalisé lors de `transform(context)` (point unique d’assemblage) pour éviter duplication.
- **PAT-003**: Flags OggDude ajoutés dans l'objet final retourné par `transform` (pas besoin d’étape post-traitement).
- **PAT-004**: Test Driven: ajouter TUs avant implémentation complète (décrire talent OggDude sample avec DieModifiers) pour verrouiller comportement.
- **ASSUMPTION-001**: Les balises `<DieModifiers>` peuvent contenir 0..N `<DieModifier>` avec sous-champs Optionnels.
- **ASSUMPTION-002**: `<Sources>` peut contenir plusieurs `<Source>`; on prend la première avec page sinon concatène toutes séparées par `;` (clarifié dans implémentation).
- **ASSUMPTION-003**: Page est un attribut `Page` dans `<Source>`.
- **ASSUMPTION-004**: Les champs non supportés parmi DieModifiers sont ignorés mais conservés si faciles à détecter.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse détaillée & design du mapping DieModifiers + stratégie description enrichie.

| Task     | Description                                                                                                   | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Recenser champs DieModifiers possibles dans exports OggDude (SetbackCount, DecreaseDifficultyCount, etc.).    |           |           |      |
| TASK-002 | Définir structure JSON normalisée pour `flags.swerpg.oggdude.dieModifiers`.                                   | TASK-001  |           |      |
| TASK-003 | Spécifier format texte description (section, puces, syntaxe).                                                  | TASK-001  |           |      |
| TASK-004 | Confirmer absence impact sur modèle `SwerpgTalent` (description champ simple) → documenter **CON-014**.       |           |           |      |
| TASK-005 | Identifier points d’injection code: `buildSingleTalentContext` & `transform`.                                  |           |           |      |
| TASK-006 | Définir stratégie fallback multi-sources (première + concat / toutes).                                         | TASK-001  |           |      |
| TASK-007 | Définir nouvelles métriques (optionnel) `dieModifiers` dans `talent-import-utils.mjs`.                         |           |           |      |

### Implementation Phase 2

- GOAL-002: Implémentation code + tests unitaires mapping enrichi.

| Task     | Description                                                                                                                            | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Créer fichier `module/importer/mappings/oggdude-talent-diemodifiers-map.mjs` (PAT-001).                                                | TASK-001  |           |      |
| TASK-009 | Ajouter extraction DieModifiers dans `OggDudeTalentMapper.buildSingleTalentContext` (contexte.dieModifiers).                           | TASK-008  |           |      |
| TASK-010 | Modifier `transform(context)` pour assemblage description: description + Source + Die Modifiers (REQ-003 à REQ-006).                   | TASK-009  |           |      |
| TASK-011 | Ajouter flags `flags.swerpg.oggdudeKey` + `flags.swerpg.oggdude.dieModifiers` dans résultat `transform`.                               | TASK-009  |           |      |
| TASK-012 | Implémenter sanitation (strip balises, normaliser espaces) pour description + DieModifiers (SEC-001).                                  | TASK-010  |           |      |
| TASK-013 | Mettre à jour util `talent-import-utils.mjs` pour compteur `dieModifiers` si liste non vide.                                           | TASK-009  |           |      |
| TASK-014 | Ajouter tests TUs nouveaux comportements `tests/importer/talent-die-modifiers.spec.mjs`.                                               | TASK-008  |           |      |
| TASK-015 | Étendre tests existants (`talent-mapper.spec.mjs`) pour vérifier présence flags + description enrichie.                                | TASK-010  |           |      |
| TASK-016 | Ajouter test activation + ranked end-to-end (context avec Ranked=true, Activation="Passive").                                         | TASK-010  |           |      |
| TASK-017 | Vérifier non-régression en exécutant suite Vitest existante (automatisé).                                                              | TASK-015  |           |      |
| TASK-018 | Audit performance (mesurer temps import 200 talents avant/après, simple chronométrage) – consigner si variation >5%.                  | TASK-017  |           |      |

### Implementation Phase 3

- GOAL-003: Préparation diffusion, rollback et validation finale.

| Task     | Description                                                                                                                | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-019 | Documentation rapide: ajouter section dans `documentation/importer/` sur mapping talents enrichi.                          | TASK-015  |           |      |
| TASK-020 | Définir procédure rollback: retirer nouveau fichier mapping + revert modifications (git tag pré-changement).              | TASK-019  |           |      |
| TASK-021 | Checklist manuelle Foundry: importer Talents avec DieModifiers + sans DieModifiers + multi-source.                         | TASK-015  |           |      |
| TASK-022 | Vérifier logs: aucune erreur runtime; stats dieModifiers cohérentes (>0 si sample).                                        | TASK-021  |           |      |
| TASK-023 | Finaliser plan: marquer tâches complétées; mettre à jour status si tout validé.                                             | TASK-022  |           |      |

## 3. Alternatives

- **ALT-001**: Modifier le schéma `SwerpgTalent` pour ajouter `description.public/secret` – rejeté (hors scope bugfix, risque migration).
- **ALT-002**: Générer automatiquement `actions`/`actorHooks` à partir des DieModifiers – rejeté (complexité, besoin futur séparé).
- **ALT-003**: Ignorer DieModifiers et laisser au MJ la saisie manuelle – rejeté (perte d'information métier critique).
- **ALT-004**: Insérer DieModifiers uniquement en flags sans rendu description – rejeté (manque lisibilité immédiate UI).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x (API DataModel & Item creation).
- **DEP-002**: Module système SWERPG (modèle `SwerpgTalent`).
- **DEP-003**: Fichiers d’import OggDude (Talents.xml) valides.

## 5. Files

- **FILE-001**: `module/importer/mappers/oggdude-talent-mapper.mjs` – Ajouter extraction DieModifiers + enrichissement description + flags.
- **FILE-002**: `module/importer/mappings/oggdude-talent-diemodifiers-map.mjs` – Nouveau mapping DieModifiers (PAT-001).
- **FILE-003**: `module/importer/utils/talent-import-utils.mjs` – Ajouter compteur `dieModifiers` (optionnel métriques) & sanitation réutilisable si besoin.
- **FILE-004**: `tests/importer/talent-die-modifiers.spec.mjs` – Nouveaux tests DieModifiers + description enrichie.
- **FILE-005**: `tests/importer/talent-mapper.spec.mjs` – Mise à jour tests transform (description enrichie + flags).
- **FILE-006**: `tests/importer/talent-mappings.spec.mjs` – Ajouter cas Ranked+Activation consolidé si nécessaire.
- **FILE-007**: `documentation/importer/talents-mapping.md` – Documentation synthétique mapping post-correctif.

## 6. Testing

- **TEST-001** (REQ-001): TU extraction Ranked/IsRanked → `extractIsRanked` pour true/false - déjà partiellement existant, compléter cas `<Ranked>true`.
- **TEST-002** (REQ-002/REQ-013): TU activation mapping unknown code → fallback passive + enregistrement activation inconnue.
- **TEST-003** (REQ-003/REQ-004): TU description assemblée: base + ligne Source (avec et sans Page) + sanitation (strip multiples espaces).
- **TEST-004** (REQ-005/REQ-006/SEC-001): TU DieModifiers: sample avec deux modificateurs → section "Die Modifiers" description + flags structurés fidèles.
- **TEST-005** (REQ-007): TU flags oggdudeKey présent et matching `<Key>`.
- **TEST-006** (REQ-008): TU fallbacks: talent sans Source ni DieModifiers → absence section; description vide mais pas d'erreur.
- **TEST-007** (REQ-010): Non-régression: exécuter import d’un talent minimal; vérifier que autres domaines (weapon) unchanged (smoke test création weapon existant).
- **TEST-008** (REQ-011): Performance (profil léger): mesurer temps mapping 300 talents avant/après; assert delta < 5% (test conditionnel / skip CI si instable).
- **TEST-009** (REQ-009/SEC-001): Injection attempt `<script>alert(1)</script>` dans Description → rendu nettoyé sans balises script.
- **TEST-010** (REQ-005/CON-003): Long DieModifiers + Description dépassant 2000 chars → tronquage propre (ne coupe pas au milieu d’une balise script, section toujours présente si possible).
- **TEST-011** (REQ-012): Stat dieModifiers incrémentée quand flags non vide.

Stratégie:

- Vitest pour unités & transform (`tests/importer/...`).
- Pas de Playwright requis (pas de nouvelle UI); test manuel Foundry (TASK-021) pour rendu visuel.
- Chaque TEST-XXX doit référencer un REQ-XXX – traçabilité intégrée dans commentaires test.


## 7. Risks & Assumptions

- **RISK-001**: Variabilité structure XML Sources (attribut Page absent ou multiple Source) → solution: prendre première + concaténation sécurisée.
- **RISK-002**: Troncature à 2000 chars peut couper section Die Modifiers → mitigation: assembler description puis si longueur > limit, retirer partie initiale non critique (prioriser garder section Die Modifiers) ou accepter coupe; documenter.
- **RISK-003**: Performances: ajout parsing DieModifiers augmente temps → optimisation: parcourt direct sans conversions coûteuses, éviter regex complexes.
- **RISK-004**: Éventuelle dépendance future sur flags structure – fixer format stable dès maintenant.
- **RISK-005**: Tests existants pourraient casser si description attendue simple – mise à jour contrôlée (TASK-015).
- **ASSUMPTION-005**: Aucune migration rétroactive requise (utilisateur peut réimporter si besoin).
- **ASSUMPTION-006**: Activation codes fournis limités au set actuel + inconnus isolés; fallback passif acceptable.

## 8. Related Specifications / Further Reading

- Input Spec: `/documentation/spec/oggdude-importer/bug-fix-talent-import-need1-1.0.md`
- Talent Model: `module/models/talent.mjs`
- Mapper Tests existants: `tests/importer/talent-mapper.spec.mjs`, `tests/importer/talent-mappings.spec.mjs`
- Activation Map: `module/importer/mappings/oggdude-talent-activation-map.mjs`
- Rank Map: `module/importer/mappings/oggdude-talent-rank-map.mjs`
- Import Orchestrator: `module/importer/oggDude.mjs`
- Observabilité: `module/importer/utils/talent-import-utils.mjs`
- Foundry VTT API (DataModel): [Foundry VTT API](https://foundryvtt.com/api/)
