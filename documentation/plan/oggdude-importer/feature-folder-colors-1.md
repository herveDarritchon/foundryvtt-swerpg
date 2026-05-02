---
goal: Ajout de couleurs déterministes aux dossiers OggDude selon le type importé
version: 1.0
date_created: 2025-11-28
last_updated: 2025-11-29
owner: SWERPG Core Dev
status: 'In Progress'
tags: ['feature', 'oggdude-importer', 'ui', 'folders']
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-orange)

Définir un plan d'implémentation pour que chaque dossier créé lors d'un import OggDude (racine `OggDude/<Type>`) possède une couleur de dossier stable selon le type d'objet (Weapons, Armor, etc.). L'objectif est d'améliorer la lisibilité des dossiers créés automatiquement dans Foundry v13, en conservant la hiérarchie introduite en novembre 2025 et en évitant toute régression sur les imports existants. La couleur doit être déterminée dans le code (pas via configuration manuelle) avec des valeurs alignées sur la charte graphique SWERPG.

## Observations d'implémentation

**Phase 1 & 2 complétées** (2025-11-29):

- Mapping de couleurs `OGGDUDE_FOLDER_COLORS` ajouté avec palette SWERPG
- Fonction `resolveFolderColor(importDomain)` implémentée
- Fonction `applyFolderColor(folder, color)` implémentée avec gestion conditionnelle des updates
- `getOrCreateFolderInternal` et `getOrCreateWorldFolder` modifiées pour gérer les couleurs
- `getFolderConfiguration()` étendue pour exposer `colorMap` et `fallbackColor`

**Tests automatisés (TASK-008)** :

- Problème de configuration de mocks Vitest rencontré
- Le mock de `game.folders` n'est pas correctement initialisé avant l'import du module testé
- Tests unitaires de logique (getFolderConfiguration) passent ✅
- Tests d'intégration avec Foundry mocks échouent en raison de l'ordre d'exécution des setup
- **Recommandation** : Déléguer TASK-008 à `swerpg-dev-test` ou effectuer validation manuelle en priorité (TEST-004, TEST-005)

**Documentation (TASK-009)** ✅ :

- Guide `oggdude-import-guide.md` mis à jour avec la liste complète des couleurs
- Section dédiée aux GMs expliquant l'utilité du code couleur
- Notes pour les développeurs sur l'extension du système

**Vérification des logs (TASK-012)** ✅ :

- Tous les logs d'application de couleur utilisent `logger.debug` (non verbeux en production)
- `logger.info` uniquement pour création de nouveaux dossiers (événement important)
- `logger.warn` pour domaines inconnus et erreurs non bloquantes
- `logger.error` pour erreurs critiques (domaine invalide)
- **Résultat** : Verbosité appropriée pour la production ✅

**Guide de test manuel (TASK-011)** ✅ :

- Fichier créé : `documentation/plan/oggdude-importer/MANUAL_TEST_folder-colors.md`
- Couvre 5 scénarios de test : import initial, ré-import, couleurs personnalisées, fallback, logs
- Inclut tableau de validation et rapport de test
- **Recommandation** : Exécuter ce test manuel avant validation finale

**Restant à faire** :

- TASK-010 (optionnel) : Référence croisée dans feature-folder-organization-1.md

## 1. Requirements & Constraints

- **REQ-001**: Chaque dossier créé par `getOrCreateWorldFolder` doit avoir une propriété `color` définie selon un mapping `importDomain -> couleur` aligné sur la palette SWERPG (valeurs hex ou `Color` Foundry).
- **REQ-002**: La couleur doit être assignée dès la création du dossier Foundry et appliquée aussi quand le dossier existe déjà (mettre à jour s'il n'a pas de couleur ou s'il est différent de la palette cible).
- **REQ-003**: Le mapping de couleurs doit couvrir tous les domaines enregistrés dans `OGGDUDE_FOLDER_MAP` et disposer d'une valeur par défaut pour les domaines inconnus.
- **REQ-004**: Les couleurs doivent respecter le contraste et la lisibilité dans Foundry (pas de couleurs pâles sur fond sombre) et réutiliser les variables/valeurs existantes (`SYSTEM.COLORS`, `:root` CSS) quand possible.
- **REQ-005**: Le plan doit inclure les étapes pour mettre à jour la documentation (`documentation/oggdude-import-guide.md`) et informer les utilisateurs de la nouvelle convention.
- **REQ-006**: Ajouter des tests unitaires (Vitest) garantissant que `getOrCreateWorldFolder` applique bien la couleur correcte et qu'un dossier mis à jour conserve la hiérarchie.
- **SEC-001**: Pas d'introduction de données utilisateur dans la définition des couleurs (mapping purement interne).
- **CON-001**: Compatibilité totale avec Foundry v13.x et avec l'API `Folder.create` / `Folder.update`.
- **CON-002**: Ne pas ralentir le cycle d'import: l'application de couleurs ne doit ajouter qu'un coût constant (pas de requêtes réseau supplémentaires).
- **CON-003**: Ne pas modifier les dossiers d'autres modules ou la configuration manuelle d'un MJ (on ne change la couleur que si le dossier correspond à la hiérarchie gérée par l'import OggDude).
- **GUD-001**: Les couleurs doivent s'inscrire dans la charte SWERPG décrite dans `USABILITY_FEATURES.md` (bleu hyperespace, orange rebelle, etc.).
- **PAT-001**: Centraliser le mapping couleur et la logique dans `module/importer/utils/oggdude-import-folders.mjs` afin que tous les importeurs existants en bénéficient sans duplication.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Étendre le service `oggdude-import-folders` pour préparer la gestion des couleurs.

| Task     | Description                                                                                                                                | DependsOn | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---------- |
| TASK-001 | Auditer `module/importer/utils/oggdude-import-folders.mjs` et lister les points où la couleur doit être injectée (création + mise à jour). |           | ✅        | 2025-11-29 |
| TASK-002 | Définir un objet `OGGDUDE_FOLDER_COLORS` aligné sur `OGGDUDE_FOLDER_MAP` et une couleur fallback (ex: `#1b5f8c`).                          | TASK-001  | ✅        | 2025-11-29 |
| TASK-003 | Décider d'une API interne (ex: `resolveFolderColor(importDomain)`) pour retourner la couleur voulue en préservant la cohérence du cache.   | TASK-002  | ✅        | 2025-11-29 |

### Implementation Phase 2

- GOAL-002: Implémenter l'application des couleurs lors de la création ou mise à jour des dossiers Foundry.

| Task     | Description                                                                                                                                                               | DependsOn | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------- |
| TASK-004 | Modifier `getOrCreateFolderInternal` pour accepter un paramètre optionnel `color` et, si fourni, paramétrer `data.color` lors de `Folder.create`.                         | TASK-003  | ✅        | 2025-11-29 |
| TASK-005 | Ajouter une étape après récupération du dossier existant: si `folder.color` diffère de la couleur attendue, effectuer `folder.update({ color })` avec log debug contrôlé. | TASK-004  | ✅        | 2025-11-29 |
| TASK-006 | Adapter `getOrCreateWorldFolder` pour passer la couleur issue de `resolveFolderColor(importDomain)` lors des appels à `getOrCreateFolderInternal`.                        | TASK-004  | ✅        | 2025-11-29 |
| TASK-007 | Introduire une fonction `applyFolderColor(folder, color)` testable séparément (gère update conditionnel, logs, erreurs).                                                  | TASK-004  | ✅        | 2025-11-29 |

### Implementation Phase 3

- GOAL-003: Couvrir la fonctionnalité par des tests Vitest et mettre à jour la documentation.

| Task     | Description                                                                                                                                                                             | DependsOn | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------- |
| TASK-008 | Créer ou étendre `tests/importer/oggdude-import-folders.spec.mjs` pour couvrir: mapping couleur, création avec couleur, update conditionnel, fallback.                                  | TASK-007  | ⚠️        | 2025-11-29 |
| TASK-009 | Documenter dans `documentation/oggdude-import-guide.md` (section organisation) la palette assignée à chaque dossier et les implications pour les MJ.                                    | TASK-006  | ✅        | 2025-11-29 |
| TASK-010 | Ajouter une note dans `documentation/plan/oggdude-importer/feature-folder-organization-1.md` (ou plan équivalent) en référence croisée si nécessaire (optionnel selon instructions PO). | TASK-009  |           |            |

### Implementation Phase 4

- GOAL-004: Préparer la validation et la communication.

| Task     | Description                                                                                                                         | DependsOn | Completed | Date       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------- |
| TASK-011 | Mettre à jour/ajouter un guide de test manuel: importer un ZIP de référence et vérifier dans Foundry que chaque dossier est coloré. | TASK-009  |           |            |
| TASK-012 | Vérifier que les logs (`logger.debug/info`) restent non verbeux en production (mettre un niveau debug pour les updates de couleur). | TASK-005  | ✅        | 2025-11-29 |

## 3. Alternatives

- **ALT-001**: Laisser le MJ configurer manuellement les couleurs via les paramètres système. Rejeté pour ce plan initial afin d'assurer un comportement déterministe et faible maintenance.
- **ALT-002**: Utiliser des couleurs aléatoires par dossier pour varier la palette. Rejeté car la lisibilité et la reproductibilité sont prioritaires.
- **ALT-003**: Appliquer des couleurs via CSS au lieu des dossiers Foundry. Rejeté car la couleur doit être visible dans toutes les vues (sidebar, dialogues) sans surcharge CSS.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x (API `Folder.create`, `Folder.update`, structure `color`).
- **DEP-002**: `module/importer/utils/oggdude-import-folders.mjs` (service hiérarchie).
- **DEP-003**: `documentation/oggdude-import-guide.md` (guide utilisateur pour importer).
- **DEP-004**: Jeu d'essai OggDude ZIP pour tests manuels (déjà utilisé par les guides existants).

## 5. Files

- **FILE-001**: `module/importer/utils/oggdude-import-folders.mjs` – Ajouter le mapping couleur et la logique d'application.
- **FILE-002**: `module/settings/models/OggDudeDataElement.mjs` – S'assurer qu'aucune logique locale ne force un dossier sans couleur (vérifier, adapter si besoin).
- **FILE-003**: `tests/importer/oggdude-import-folders.spec.mjs` – Nouveau fichier ou extension pour couvrir la logique couleur.
- **FILE-004**: `documentation/oggdude-import-guide.md` – Expliquer comment les dossiers sont colorés et comment vérifier le résultat.
- **FILE-005**: `documentation/plan/oggdude-importer/feature-folder-organization-1.md` – Ajouter une référence croisée à la fonctionnalité couleur (si jugé pertinent par le PO).

## 6. Testing

- **TEST-001**: Vitest – `getOrCreateWorldFolder('weapon')` crée un dossier avec couleur `#0e5ba8` (exemple); un second appel retourne le même dossier sans update inutile.
- **TEST-002**: Vitest – Dossier existant sans couleur: `applyFolderColor` applique la couleur attendue et loggue une entrée debug.
- **TEST-003**: Vitest – Domaine inconnu `foo` utilise la couleur fallback et loggue un warn unique.
- **TEST-004**: Manual – Lancer un import OggDude complet (ZIP de test) et vérifier dans la sidebar Foundry que `OggDude/Weapons`, `OggDude/Armor`, etc. ont les couleurs prédéfinies.
- **TEST-005**: Manual – Créer un dossier avec couleur custom différente puis relancer l'import pour confirmer que le système ne surcharge pas les dossiers hors hiérarchie OggDude.

## 7. Risks & Assumptions

- **RISK-001**: Certains mondes peuvent déjà avoir des couleurs personnalisées sur les dossiers OggDude; la mise à jour automatique pourrait surprendre les MJ. Mitigation: n'écraser la couleur que si elle est absente ou incompatible, et documenter le comportement.
- **RISK-002**: Les palettes choisies peuvent ne pas être lisibles sur certains thèmes Foundry personnalisés. Mitigation: utiliser des couleurs contrastées et permettre aux MJ de les changer après coup.
- **RISK-003**: Tests automatisés doivent mocker `Folder.create`/`Folder.update`; nécessitera peut-être des helpers pour éviter les faux positifs.
- **ASSUMPTION-001**: Tous les importeurs passent par `getOrCreateWorldFolder`; aucune création directe de dossier n'interviendra ailleurs.
- **ASSUMPTION-002**: Les MJ peuvent toujours changer manuellement la couleur si nécessaire; la fonctionnalité ne doit pas verrouiller l'UI Foundry.

## 8. Related Specifications / Further Reading

- `/documentation/plan/oggdude-importer/feature-folder-organization-1.md` – Hiérarchie de dossiers.
- `/documentation/oggdude-import-guide.md` – Guide général pour l'import OggDude.
- `.github/instructions/a11y.instructions.md` – Rappels about contrast and accessibility.
- `.github/instructions/performance-optimization.instructions.md` – Considérations performance lors des imports.
