---
goal: Correction fiable du mapping Weapon.xml → Items weapon jouables (qualités, portée, description, type, restriction)
version: 1.0
date_created: 2025-11-18
last_updated: 2025-11-18
owner: SWERPG Core Dev
status: 'Planned'
tags: [bug, importer, weapon, oggdude]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Bugfix visant à fiabiliser l’import des armes OggDude (`Weapons.xml`) dans le système SWERPG (Foundry v13). Actuellement plusieurs champs critiques sont perdus ou incorrects : portée (ex. `Short` mappé à `medium`), qualités avec valeur (Blast 2, Burn 2…) réduites à leur nom sans valeur, description vidée, type/catégories ignorées, indication de restriction partielle. L’objectif est que chaque arme nouvellement importée soit immédiatement exploitable en jeu sans retouche manuelle.

## 1. Requirements & Constraints

- **REQ-001**: Mapper correctement la portée en priorisant `RangeValue` (ex. `wrShort` → `short`).
- **REQ-002**: Ne plus perdre les qualités OggDude ; conserver nom + valeur (ex. Blast 2) de façon structurée.
- **REQ-003**: Nettoyer et importer la description (`<Description>`) dans `system.description.public` (suppression balises OggDude type `[H3]`, conservation retours significatifs).
- **REQ-004**: Ajouter la source (`<Source>` + `<Page>`) en bas de description ou dans un flag dédié.
- **REQ-005**: Conserver le type (`<Type>`) et les catégories (`<Categories><Category>`) sous forme de tags visibles (exposition via `item.getTags()` / fiche).
- **REQ-006**: Représenter `Restricted=true` de manière visible (tag ou champ booléen) sur la fiche arme.
- **REQ-007**: Logger et compter les compétences inconnues (`SkillKey`) sans bloquer import en mode non strict.
- **REQ-008**: Logger et compter les qualités inconnues avec détail des codes bruts.
- **REQ-009**: Conserver l’information optionnelle `<SizeHigh>` dans un flag sans impact gameplay.
- **REQ-010**: Ne pas dégrader performance sur import de centaines d’entrées (boucles O(n) sans recalcul coûteux).
- **REQ-011**: Garantir compatibilité Foundry v13 (API standard Item.create & data model existants).
- **REQ-012**: Aucune migration rétroactive : seules les futures importations sont affectées.
- **REQ-013**: Tri déterministe des qualités (alphabétique) pour stabilité et tests.
- **REQ-014**: Préserver sécurité : aucune exécution de contenu XML, seulement parsing texte contrôlé.
- **REQ-015**: Fallback propre si mapping impossible (range/skill manquant) avec warnings et valeurs neutres conformes au schéma.
- **CON-001**: Le schéma actuel `SwerpgWeapon` ne stocke pas numériquement la valeur des qualités (Set&lt;string&gt;) → nécessité d’un stockage secondaire (flags) ou d’un enrichissement non disruptif.
- **CON-002**: Ne pas modifier structure critique des Items (éviter rupture avec autres modules/actions).
- **CON-003**: Localization : conserver langue brute XML, pas de traduction automatique.
- **CON-004**: Accessibilité: les tags ajoutés doivent avoir un label clair pour lecteurs d’écran (ATTR aria-label si ajout en template ultérieurement).
- **CON-005**: Ne pas casser import existant d’armures/gear (isolation du changement dans mapper armes).
- **CON-006**: Valeurs numériques clampées doivent respecter limites (damage 0–20, crit 0–20). Conserver logique actuelle.
- **PAT-001**: Utiliser tables centralisées (`WEAPON_SKILL_MAP`, `WEAPON_RANGE_MAP`, `WEAPON_QUALITY_MAP`) pour mapping déterministe.
- **PAT-002**: Stocker les paires qualité/valeur dans `flags.swerpg.oggdudeQualities` (array d’objets `{id,count}`) comme couche additive sans modifier Set existant.
- **PAT-003**: Stocker Type/Categories dans `flags.swerpg.oggdudeTags` ou `system.tags` si propriété générique existe, sinon fallback flags.
- **PAT-004**: Append source au bloc description avec format: `Source: <Source>, p.<Page>`.
- **PAT-005**: Ajout de codes RangeValue spécifiques (wrShort, wrMedium, wrLong, wrExtreme, wrEngaged) dans `WEAPON_RANGE_MAP`.
- **PAT-006**: Sanitize description via util partagé (réutiliser `sanitizeText` ou étendre) pour retirer balises OggDude `[H3]` / `[h3]`.
- **SEC-001**: Empêcher injection HTML: échapper contenu description avant insertion (innerHTML non utilisé, stockage texte).
- **SEC-002**: Ignorer attributs XML inattendus (deny-by-default) – ne mapper que liste explicitée.
- **ASSUMPTION-001**: Le Set `system.qualities` restera la liste simple sans valeur numérique associée.
- **ASSUMPTION-002**: La fiche arme peut afficher tags additionnels via `getTags()` sans refactor majeur.
- **ASSUMPTION-003**: Aucun besoin de migration des armes déjà importées (PO valide).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse & cartographie des points d’entrée et écarts fonctionnels.

| Task     | Description                                                                                                         | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Lister fonctions et tables: `mapOggDudeWeapon`, `WEAPON_*_MAP`, stats utils (`weapon-import-utils.mjs`).            |           |           |      |
| TASK-002 | Vérifier schéma `module/models/weapon.mjs` pour champs existants / absence de stockage valeur des qualités.         |           |           |      |
| TASK-003 | Identifier emplacement description cible (`system.description.public`) (confirmé dans autres importers ex. armors). |           |           |      |
| TASK-004 | Recenser codes RangeValue manquants (`wrShort`, etc.) à ajouter dans map.                                           |           |           |      |
| TASK-005 | Documenter écarts actuels vs REQ (description manquante, qualities count perdu, type/catégories absents).           | TASK-001  |           |      |
| TASK-006 | Finaliser liste REQ/CON/PAT après vérification code (amender si nécessaire).                                        | TASK-005  |           |      |

### Implementation Phase 2

- GOAL-002: Design précis des modifications code, flags et tests.

| Task     | Description                                                                                                                    | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-007 | Définir structure des nouveaux flags: `flags.swerpg.oggdudeQualities` & `flags.swerpg.oggdudeTags` (documentation interne).    | TASK-006  |           |      |
| TASK-008 | Concevoir algorithme parsing Qualities: collecte clé + count, normalisation id via `WEAPON_QUALITY_MAP`, stockage Set + flags. | TASK-006  |           |      |
| TASK-009 | Spécifier fonction util sanitizeDescription (regex suppression `[h\d+]` + trim multi espaces / lignes).                        | TASK-006  |           |      |
| TASK-010 | Définir mapping Type/Categories → tags (ex: Type string → `type:<value>`, Category → `category:<value>`).                      | TASK-006  |           |      |
| TASK-011 | Définir fallback pour skill/range inconnus: `null` ou valeur initiale schéma + warning + stats.                                | TASK-006  |           |      |
| TASK-012 | Spécifier extension `WEAPON_RANGE_MAP` (ajout codes wrShort, wrMedium, wrLong, wrExtreme, wrEngaged).                          | TASK-006  |           |      |
| TASK-013 | Définir format append source dans description (ligne séparatrice + `Source:`).                                                 | TASK-006  |           |      |
| TASK-014 | Définir tests unitaires couvrant chaque REQ (table correspondance test-cas).                                                   | TASK-006  |           |      |

### Implementation Phase 3

- GOAL-003: Préparation exécution, modifications code et stratégie rollback.

| Task     | Description                                                                                                                                                        | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-015 | Modifier `module/importer/items/weapon-ogg-dude.mjs` pour intégrer description, flags qualités, type/catégories, SizeHigh, source et range étendue.                | TASK-008  |           |      |
| TASK-016 | Étendre `module/importer/mappings/oggdude-weapon-range-map.mjs` avec codes RangeValue supplémentaires (PAT-005).                                                   | TASK-012  |           |      |
| TASK-017 | Ajouter util `sanitizeOggDudeWeaponDescription` (nouveau fichier `module/importer/mappings/oggdude-weapon-utils.mjs` si extension nécessaire).                     | TASK-009  |           |      |
| TASK-018 | Adapter construction objet final: ajouter `flags.swerpg.oggdudeQualities`, `flags.swerpg.oggdudeTags`, `flags.swerpg.oggdude.sizeHigh`, `flags.swerpg.oggdudeKey`. | TASK-015  |           |      |
| TASK-019 | Mettre à jour `getTags()` dans `module/models/weapon.mjs` pour inclure tags Type/Categories + `restricted` si présent.                                             | TASK-015  |           |      |
| TASK-020 | Créer tests Vitest `tests/importer/weapon-import.spec.mjs` couvrant mapping complet (REQ-001…REQ-009, REQ-013, REQ-015).                                           | TASK-014  |           |      |
| TASK-021 | Créer tests stats Vitest `tests/importer/weapon-import-stats.spec.mjs` (unknown skills/qualités + strict mode).                                                    | TASK-014  |           |      |
| TASK-022 | Ajouter test qualité count multiple (ex: Blast count=2) pour flags détaillés.                                                                                      | TASK-020  |           |      |
| TASK-023 | Vérifier non-régression import autres domaines (exécuter import armures via test existant ou script) – ajuster si side-effects.                                    | TASK-015  |           |      |
| TASK-024 | Documenter dans README interne importer section « Weapon Mapping » (ajout bref).                                                                                   | TASK-018  |           |      |
| TASK-025 | Définir critères rollback (désactiver nouveau mapping via feature flag si régression critique).                                                                    | TASK-015  |           |      |

## 3. Alternatives

- **ALT-001**: Modifier schéma `weapon` pour stocker directement qualités avec valeur → rejeté (impact large, hors périmètre bugfix rapide).
- **ALT-002**: Ignorer les valeurs numériques des qualités et laisser uniquement Set → rejeté (perte d’information critique gameplay futur).
- **ALT-003**: Stocker dans description brute les qualités avec valeurs → retenu partiellement mais insuffisant pour exploitation programmatique, utilisé seulement en fallback visuel.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x.
- **DEP-002**: Tables système `SYSTEM.WEAPON.*` (qualités, skills, range types) déjà chargées avant import.
- **DEP-003**: Module Sequencer optionnel (utilisation dans weapon.mjs reste inchangée).

## 5. Files

- **FILE-001**: `module/importer/items/weapon-ogg-dude.mjs` – Fonction principale `mapOggDudeWeapon`, ajout mapping étendu.
- **FILE-002**: `module/importer/mappings/oggdude-weapon-range-map.mjs` – Extension codes RangeValue.
- **FILE-003**: `module/importer/mappings/oggdude-weapon-utils.mjs` – Ajout fonction sanitizeDescription (si extension nécessaire au-delà existant).
- **FILE-004**: `module/models/weapon.mjs` – Méthode `getTags()` enrichie pour type/catégories/restricted.
- **FILE-005**: `tests/importer/weapon-import.spec.mjs` – Tests mapping principal.
- **FILE-006**: `tests/importer/weapon-import-stats.spec.mjs` – Tests statistiques unknown / strict mode.
- **FILE-007**: `documentation/importer/README.md` – Section Weapon Mapping (documentation interne).

## 6. Testing

- **TEST-001**: Vitest – portée: données XML avec `RangeValue=wrShort` + fallback `Range=Short` → résultat `system.range === 'short'` (REQ-001).
- **TEST-002**: Vitest – qualité avec count>1 (Blast 2, Burn 3) → Set inclut `blast`,`burn` + flags.swerpg.oggdudeQualities contient `{id:'blast',count:2}`, etc. (REQ-002, PAT-002).
- **TEST-003**: Vitest – description cleaning: entrée avec `[H3]Title[/H3]\nMultiline` → `system.description.public` sans balises + append source (REQ-003, REQ-004).
- **TEST-004**: Vitest – type/catégorie: `<Type>Explosives/Other</Type><Categories><Category>Ranged</Category></Categories>` → flags tags présents + `getTags()` inclut type/categorie (REQ-005).
- **TEST-005**: Vitest – restricted: `<Restricted>true</Restricted>` → `system.restricted===true` et tag `restricted` visible (REQ-006).
- **TEST-006**: Vitest – skill inconnu: SkillKey=FOO → warning log + stats unknownSkills++ + valeur fallback (REQ-007, REQ-015).
- **TEST-007**: Vitest – qualité inconnue: Quality.Key=UnknownQ → warning + stats unknownQualities++ sans rejet (REQ-008).
- **TEST-008**: Vitest – SizeHigh présent → `flags.swerpg.oggdude.sizeHigh` défini (REQ-009).
- **TEST-009**: Vitest – performance: importer tableau simulé 200 objets (mesurer durée < seuil raisonnable, pas d’exception) (REQ-010).
- **TEST-010**: Vitest – tri alphabétique des qualités (input non trié) → Set converti en tableau trié stable (REQ-013).
- **TEST-011**: Vitest – injection tentative dans Description `<Description><script>alert()</script></Description>` → contenu échappé, pas d’exécution (SEC-001, SEC-002).
- **TEST-012**: Manual – Import réel dans Foundry d’un pack OggDude contenant au moins une arme avec chaque cas (qualités multiples, restricted, type/catégories). Checklist: affichage fiche, tags, absence erreurs console.
- **TEST-013**: Manual – Vérifier armures import intactes (non-régression) (CON-005).

## 7. Risks & Assumptions

- **RISK-001**: Stockage flags additionnels peut augmenter taille documents marginalement (acceptable).
- **RISK-002**: Ajout mapping range codes risque collision si codes futurs différents (mitigation: table dédiée facilement extensible).
- **RISK-003**: Informations qualité valeur non exploitées dans gameplay tant que logique actions ne lit pas flags → usage futur à prévoir.
- **RISK-004**: Nettoyage description trop agressif pourrait supprimer informations utiles (tests couvrent balises).
- **RISK-005**: Omission d’un code Range ou Skill exotique générant fallback silencieux (logs + stats atténuent).
- **ASSUMPTION-004**: `sanitizeText` existant insuffisant pour balises OggDude → extension acceptée.
- **ASSUMPTION-005**: Aucun besoin d’i18n pour nouvelles chaînes source/tags (utilisation brute acceptable).

## 8. Related Specifications / Further Reading

- `/documentation/spec/oggdude-importer/bug-fix-weapon-import-need1-1.0.md` – Spécification de besoin initiale.
- `/documentation/plan/importer/` (autres plans si existants pour cohérence mapping armures).
- Foundry VTT API v13 – Items & DataModel.
- OWASP Secure Coding (référence interne `security-best-practices.collection.yml`).

- **REQ-001**: Mapper correctement la portée en priorisant `RangeValue` (ex. `wrShort` → `short`).
- **REQ-002**: Ne plus perdre les qualités OggDude ; conserver nom + valeur (ex. Blast 2) de façon structurée.
- **REQ-003**: Nettoyer et importer la description (`<Description>`) dans `system.description.public` (suppression balises OggDude type `[H3]`, conservation retours significatifs).
- **REQ-004**: Ajouter la source (`<Source>` + `<Page>`) en bas de description ou dans un flag dédié.
- **REQ-005**: Conserver le type (`<Type>`) et les catégories (`<Categories><Category>`) sous forme de tags visibles (exposition via `item.getTags()` / fiche).
- **REQ-006**: Représenter `Restricted=true` de manière visible (tag ou champ booléen) sur la fiche arme.
- **REQ-007**: Logger et compter les compétences inconnues (`SkillKey`) sans bloquer import en mode non strict.
- **REQ-008**: Logger et compter les qualités inconnues avec détail des codes bruts.
- **REQ-009**: Conserver l’information optionnelle `<SizeHigh>` dans un flag sans impact gameplay.
- **REQ-010**: Ne pas dégrader performance sur import de centaines d’entrées (boucles O(n) sans recalcul coûteux).
- **REQ-011**: Garantir compatibilité Foundry v13 (API standard Item.create & data model existants).
- **REQ-012**: Aucune migration rétroactive : seules les futures importations sont affectées.
- **REQ-013**: Tri déterministe des qualités (alphabétique) pour stabilité et tests.
- **REQ-014**: Préserver sécurité : aucune exécution de contenu XML, seulement parsing texte contrôlé.
- **REQ-015**: Fallback propre si mapping impossible (range/skill manquant) avec warnings et valeurs neutres conformes au schéma.
- **CON-001**: Le schéma actuel `SwerpgWeapon` ne stocke pas numériquement la valeur des qualités (Set<string>) → nécessité d’un stockage secondaire (flags) ou d’un enrichissement non disruptif.
- **CON-002**: Ne pas modifier structure critique des Items (éviter rupture avec autres modules/actions).
- **CON-003**: Localization : conserver langue brute XML, pas de traduction automatique.
- **CON-004**: Accessibilité: les tags ajoutés doivent avoir un label clair pour lecteurs d’écran (ATTR aria-label si ajout en template ultérieurement).
- **CON-005**: Ne pas casser import existant d’armures/gear (isolation du changement dans mapper armes).
- **CON-006**: Valeurs numériques clampées doivent respecter limites (damage 0–20, crit 0–20). Conserver logique actuelle.
- **PAT-001**: Utiliser tables centralisées (`WEAPON_SKILL_MAP`, `WEAPON_RANGE_MAP`, `WEAPON_QUALITY_MAP`) pour mapping déterministe.
- **PAT-002**: Stocker les paires qualité/valeur dans `flags.swerpg.oggdudeQualities` (array d’objets `{id,count}`) comme couche additive sans modifier Set existant.
- **PAT-003**: Stocker Type/Categories dans `flags.swerpg.oggdudeTags` ou `system.tags` si propriété générique existe, sinon fallback flags.
- **PAT-004**: Append source au bloc description avec format: `Source: <Source>, p.<Page>`.
- **PAT-005**: Ajout de codes RangeValue spécifiques (wrShort, wrMedium, wrLong, wrExtreme, wrEngaged) dans `WEAPON_RANGE_MAP`.
- **PAT-006**: Sanitize description via util partagé (réutiliser `sanitizeText` ou étendre) pour retirer balises OggDude `[H3]` / `[h3]`.
- **SEC-001**: Empêcher injection HTML: échapper contenu description avant insertion (innerHTML non utilisé, stockage texte).
- **SEC-002**: Ignorer attributs XML inattendus (deny-by-default) – ne mapper que liste explicitée.
- **ASSUMPTION-001**: Le Set `system.qualities` restera la liste simple sans valeur numérique associée.
- **ASSUMPTION-002**: La fiche arme peut afficher tags additionnels via `getTags()` sans refactor majeur.
- **ASSUMPTION-003**: Aucun besoin de migration des armes déjà importées (PO valide).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyse & cartographie des points d’entrée et écarts fonctionnels.

| Task     | Description                                                                                                         | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Lister fonctions et tables: `mapOggDudeWeapon`, `WEAPON_*_MAP`, stats utils (`weapon-import-utils.mjs`).            |           |           |      |
| TASK-002 | Vérifier schéma `module/models/weapon.mjs` pour champs existants / absence de stockage valeur des qualités.         |           |           |      |
| TASK-003 | Identifier emplacement description cible (`system.description.public`) (confirmé dans autres importers ex. armors). |           |           |      |
| TASK-004 | Recenser codes RangeValue manquants (`wrShort`, etc.) à ajouter dans map.                                           |           |           |      |
| TASK-005 | Documenter écarts actuels vs REQ (description manquante, qualities count perdu, type/catégories absents).           | TASK-001  |           |      |
| TASK-006 | Finaliser liste REQ/CON/PAT après vérification code (amender si nécessaire).                                        | TASK-005  |           |      |

### Implementation Phase 2

- GOAL-002: Design précis des modifications code, flags et tests.

| Task     | Description                                                                                                                    | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-007 | Définir structure des nouveaux flags: `flags.swerpg.oggdudeQualities` & `flags.swerpg.oggdudeTags` (documentation interne).    | TASK-006  |           |      |
| TASK-008 | Concevoir algorithme parsing Qualities: collecte clé + count, normalisation id via `WEAPON_QUALITY_MAP`, stockage Set + flags. | TASK-006  |           |      |
| TASK-009 | Spécifier fonction util sanitizeDescription (regex suppression `[h\d+]` + trim multi espaces / lignes).                        | TASK-006  |           |      |
| TASK-010 | Définir mapping Type/Categories → tags (ex: Type string → `type:<value>`, Category → `category:<value>`).                      | TASK-006  |           |      |
| TASK-011 | Définir fallback pour skill/range inconnus: `null` ou valeur initiale schéma + warning + stats.                                | TASK-006  |           |      |
| TASK-012 | Spécifier extension `WEAPON_RANGE_MAP` (ajout codes wrShort, wrMedium, wrLong, wrExtreme, wrEngaged).                          | TASK-006  |           |      |
| TASK-013 | Définir format append source dans description (ligne séparatrice + `Source:`).                                                 | TASK-006  |           |      |
| TASK-014 | Définir tests unitaires couvrant chaque REQ (table correspondance test-cas).                                                   | TASK-006  |           |      |

### Implementation Phase 3

- GOAL-003: Préparation exécution, modifications code et stratégie rollback.

| Task     | Description                                                                                                                                                        | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-015 | Modifier `module/importer/items/weapon-ogg-dude.mjs` pour intégrer description, flags qualités, type/catégories, SizeHigh, source et range étendue.                | TASK-008  |           |      |
| TASK-016 | Étendre `module/importer/mappings/oggdude-weapon-range-map.mjs` avec codes RangeValue supplémentaires (PAT-005).                                                   | TASK-012  |           |      |
| TASK-017 | Ajouter util `sanitizeOggDudeWeaponDescription` (nouveau fichier `module/importer/mappings/oggdude-weapon-utils.mjs` si extension nécessaire).                     | TASK-009  |           |      |
| TASK-018 | Adapter construction objet final: ajouter `flags.swerpg.oggdudeQualities`, `flags.swerpg.oggdudeTags`, `flags.swerpg.oggdude.sizeHigh`, `flags.swerpg.oggdudeKey`. | TASK-015  |           |      |
| TASK-019 | Mettre à jour `getTags()` dans `module/models/weapon.mjs` pour inclure tags Type/Categories + `restricted` si présent.                                             | TASK-015  |           |      |
| TASK-020 | Créer tests Vitest `tests/importer/weapon-import.spec.mjs` couvrant mapping complet (REQ-001…REQ-009, REQ-013, REQ-015).                                           | TASK-014  |           |      |
| TASK-021 | Créer tests stats Vitest `tests/importer/weapon-import-stats.spec.mjs` (unknown skills/qualities + strict mode).                                                   | TASK-014  |           |      |
| TASK-022 | Ajouter test qualité count multiple (ex: Blast count=2) pour flags détaillés.                                                                                      | TASK-020  |           |      |
| TASK-023 | Vérifier non-régression import autres domaines (exécuter import armures via test existant ou script) – ajuster si side-effects.                                    | TASK-015  |           |      |
| TASK-024 | Documenter dans README interne importer section « Weapon Mapping » (ajout bref).                                                                                   | TASK-018  |           |      |
| TASK-025 | Définir critères rollback (désactiver nouveau mapping via feature flag si régression critique).                                                                    | TASK-015  |           |      |

## 3. Alternatives

- **ALT-001**: Modifier schéma `weapon` pour stocker directement qualités avec valeur → rejeté (impact large, hors périmètre bugfix rapide).
- **ALT-002**: Ignorer les valeurs numériques des qualités et laisser uniquement Set → rejeté (perte d’information critique gameplay futur).
- **ALT-003**: Stocker dans description brute les qualités avec valeurs → retenu partiellement mais insuffisant pour exploitation programmatique, utilisé seulement en fallback visuel.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x.
- **DEP-002**: Tables système `SYSTEM.WEAPON.*` (qualités, skills, range types) déjà chargées avant import.
- **DEP-003**: Module Sequencer optionnel (utilisation dans weapon.mjs reste inchangée).

## 5. Files

- **FILE-001**: `module/importer/items/weapon-ogg-dude.mjs` – Fonction principale `mapOggDudeWeapon`, ajout mapping étendu.
- **FILE-002**: `module/importer/mappings/oggdude-weapon-range-map.mjs` – Extension codes RangeValue.
- **FILE-003**: `module/importer/mappings/oggdude-weapon-utils.mjs` – Ajout fonction sanitizeDescription (si extension nécessaire au-delà existant).
- **FILE-004**: `module/models/weapon.mjs` – Méthode `getTags()` enrichie pour type/catégories/restricted.
- **FILE-005**: `tests/importer/weapon-import.spec.mjs` – Tests mapping principal.
- **FILE-006**: `tests/importer/weapon-import-stats.spec.mjs` – Tests statistiques unknown / strict mode.
- **FILE-007**: `documentation/importer/README.md` – Section Weapon Mapping (documentation interne).

## 6. Testing

- **TEST-001**: Vitest – portée: données XML avec `RangeValue=wrShort` + fallback `Range=Short` → résultat `system.range === 'short'` (REQ-001).
- **TEST-002**: Vitest – qualité avec count>1 (Blast 2, Burn 3) → Set inclut `blast`,`burn` + flags.swerpg.oggdudeQualities contient `{id:'blast',count:2}`, etc. (REQ-002, PAT-002).
- **TEST-003**: Vitest – description cleaning: entrée avec `[H3]Title[/H3]\nMultiline` → `system.description.public` sans balises + append source (REQ-003, REQ-004).
- **TEST-004**: Vitest – type/catégorie: `<Type>Explosives/Other</Type><Categories><Category>Ranged</Category></Categories>` → flags tags présents + `getTags()` inclut type/categorie (REQ-005).
- **TEST-005**: Vitest – restricted: `<Restricted>true</Restricted>` → `system.restricted===true` et tag `restricted` visible (REQ-006).
- **TEST-006**: Vitest – skill inconnu: SkillKey=FOO → warning log + stats unknownSkills++ + valeur fallback (REQ-007, REQ-015).
- **TEST-007**: Vitest – qualité inconnue: Quality.Key=UnknownQ → warning + stats unknownQualities++ sans rejet (REQ-008).
- **TEST-008**: Vitest – SizeHigh présent → `flags.swerpg.oggdude.sizeHigh` défini (REQ-009).
- **TEST-009**: Vitest – performance: importer tableau simulé 200 objets (mesurer durée < seuil raisonnable, pas d’exception) (REQ-010).
- **TEST-010**: Vitest – tri alphabétique des qualités (input non trié) → Set converti en tableau trié stable (REQ-013).
- **TEST-011**: Vitest – injection tentative dans Description `<Description><script>alert()</script></Description>` → contenu échappé, pas d’exécution (SEC-001, SEC-002).
- **TEST-012**: Manual – Import réel dans Foundry d’un pack OggDude contenant au moins une arme avec chaque cas (qualités multiples, restricted, type/catégories). Checklist: affichage fiche, tags, absence erreurs console.
- **TEST-013**: Manual – Vérifier armures import intactes (non-régression) (CON-005).

## 7. Risks & Assumptions

- **RISK-001**: Stockage flags additionnels peut augmenter taille documents marginalement (acceptable).
- **RISK-002**: Ajout mapping range codes risque collision si codes futurs différents (mitigation: table dédiée facilement extensible).
- **RISK-003**: Informations qualité valeur non exploitées dans gameplay tant que logique actions ne lit pas flags → usage futur à prévoir.
- **RISK-004**: Nettoyage description trop agressif pourrait supprimer informations utiles (tests couvrent balises).
- **RISK-005**: Omission d’un code Range ou Skill exotique générant fallback silencieux (logs + stats atténuent).
- **ASSUMPTION-004**: `sanitizeText` existant insuffisant pour balises OggDude → extension acceptée.
- **ASSUMPTION-005**: Aucun besoin d’i18n pour nouvelles chaînes source/tags (utilisation brute acceptable).

## 8. Related Specifications / Further Reading

- `/documentation/spec/oggdude-importer/bug-fix-weapon-import-need1-1.0.md` – Spécification de besoin initiale.
- `/documentation/plan/importer/` (autres plans si existants pour cohérence mapping armures).
- Foundry VTT API v13 – Items & DataModel.
- OWASP Secure Coding (référence interne `security-best-practices.collection.yml`).
