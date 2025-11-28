---
goal: Réorganiser les imports OggDude en dossiers hiérarchiques par type d'Item
version: 1.0
date_created: 2025-11-28
last_updated: 2025-11-28
owner: SWERPG Core Dev
status: 'Planned'
tags: ['feature', 'oggdude-importer', 'data', 'folders']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ce plan décrit l’implémentation d’une organisation en dossiers hiérarchiques pour les imports OggDude dans SWERPG : au lieu de créer tous les Items et entrées de compendiums à plat dans un même dossier, chaque domaine OggDude (Weapons, Armor, Gear, Careers, Talents, etc.) sera rangé dans un sous-dossier `OggDude/<Type d'Item>` cohérent, tant pour les Items de monde que pour les compendiums dédiés à l’import.

## 1. Requirements & Constraints

- **REQ-001**: Lors d’un import OggDude, les Items créés directement dans le monde doivent être placés dans un dossier racine `OggDude` avec un sous-dossier par type d’Item (par ex. `OggDude/Weapons`, `OggDude/Armor`, `OggDude/Gear`, `OggDude/Careers`, `OggDude/Talents`, etc.).
- **REQ-002**: Lors de l’import en compendium (si le flux de l’importeur le prévoit), les entrées doivent être organisées selon une hiérarchie logique équivalente, en utilisant les dossiers de compendium Foundry (root `OggDude`, sous-dossiers par type d’Item) ou un schéma de nommage qui reflète clairement le type.
- **REQ-003**: Le comportement doit être appliqué à tous les mappers OggDude existants (weapons, armor, gear, careers, talents, species, etc.) de manière cohérente, sans changer le contenu fonctionnel des Items (uniquement leur dossier).
- **REQ-004**: Le système doit être idempotent : relancer un import sur des données déjà importées ne doit pas créer des arborescences de dossiers en double (ex. éviter `OggDude/OggDude/Weapons`).
- **REQ-005**: Les imports doivent continuer de fonctionner lorsque le monde contient déjà d’anciens dossiers (plate), en créant la nouvelle hiérarchie sans casser les références existantes.
- **REQ-006**: Le choix de l’organisation en dossiers doit être centralisé dans une couche utilitaire pour éviter la duplication de logique dans chaque mapper.
- **REQ-007**: Si un type d’Item OggDude n’est pas reconnu par la configuration, il doit être rangé dans un dossier de fallback explicite (`OggDude/Misc` ou similaire) avec un log d’avertissement.
- **REQ-008**: La hiérarchie de dossiers doit pouvoir être configurée ou étendue facilement (par ex. ajouter plus tard `OggDude/NPCs`, `OggDude/Starships`, etc.).

- **SEC-001**: Ne pas exposer de chemins dynamiques basés sur des entrées utilisateur non contrôlées. La construction des noms de dossiers doit se baser sur un mapping interne validé (pas de concaténation brute de chaînes non contrôlées).

- **CON-001**: Compatibilité totale avec Foundry VTT v13.x et le modèle d’Items existant de SWERPG (aucun changement de schema `system.*`).
- **CON-002**: Ne pas casser les workflows existants d’import OggDude (boutons, UI, statistiques, métriques). La seule modification visible doit être la réorganisation des dossiers.
- **CON-003**: Les imports peuvent concerner plusieurs centaines d’Items par domaine ; la création / résolution de dossiers doit être performante (utiliser un cache in-memory pour les dossiers créés pendant un même import batch).
- **CON-004**: Ne pas modifier les IDs des Items déjà créés ni leur contenu métier ; seule la propriété `folder` (ou l’équivalent compendium) est concernée.
- **CON-005**: Les imports en compendium doivent respecter les contraintes de Foundry sur les dossiers de compendium (adapter si certains environnements limitent la profondeur ou le format des noms).

- **GUD-001**: Utiliser une nomenclature claire et stable des dossiers (`OggDude/Weapons`, `OggDude/Armor`, etc.) en anglais pour rester cohérent avec les autres éléments techniques du système.
- **GUD-002**: Centraliser les constantes de noms de dossiers et le mapping type OggDude → type SWERPG → sous-dossier dans un module de configuration dédié.
- **GUD-003**: Respecter le style de logging existant (utilisation de `console`/logger central, pas de `alert` ou de notifications utilisateur bloquantes pour les simples déplacements de dossiers).

- **PAT-001**: Introduire un utilitaire `OggDudeImportFolderService` ou équivalent qui :
  - maintient un cache des dossiers déjà résolus / créés pour la session d’import,
  - offre une méthode `getOrCreateFolder(domain, itemType)` pour les Items de monde,
  - offre une méthode symétrique pour les compendiums si nécessaire.
- **PAT-002**: Utiliser un mapping de configuration simple (objet clé/valeur) pour relier `importDomain` (weapon, armor, gear, etc.) → chemin de dossier relatif sous `OggDude/`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Cartographier les points d’entrée et usages actuels des dossiers pour l’import OggDude, et définir le modèle de hiérarchie cible.

| Task     | Description                                                                                                                      | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Identifier les fichiers responsables de la création d’Items et/ou de l’affectation de `folder` lors de l’import OggDude.        |           |           |      |
| TASK-002 | Lister les types d’Item OggDude pris en charge (weapons, armor, gear, careers, talents, species, etc.) et leur type SWERPG.    | TASK-001  |           |      |
| TASK-003 | Analyser l’usage actuel des dossiers (ex. dossiers par défaut `folder` dans les exemples d’Items importés) et leurs IDs fixes. | TASK-001  |           |      |
| TASK-004 | Définir la hiérarchie cible des dossiers : noms exacts, profondeur (root `OggDude` + un niveau par type).                       | TASK-002  |           |      |
| TASK-005 | Valider qu’aucun autre module / fonctionnalité ne dépend de l’ancien schéma « flat » de dossiers (ou documenter l’impact).      | TASK-001  |           |      |

### Implementation Phase 2

- GOAL-002: Concevoir et implémenter un service centralisé pour la gestion des dossiers d’import OggDude, puis l’intégrer dans les mappers.

| Task     | Description                                                                                                                                      | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-006 | Créer un nouveau module utilitaire `module/importer/utils/oggdude-import-folders.mjs` pour centraliser la logique de gestion des dossiers.      | TASK-004  |           |      |
| TASK-007 | Dans ce module, implémenter une fonction `getOrCreateWorldFolder(importDomain, itemType)` avec cache interne pour les dossiers `OggDude/*`.      | TASK-006  |           |      |
| TASK-008 | (Si pertinent) Concevoir l’API pour gérer aussi les dossiers de compendiums (`getOrCreateCompendiumFolder`), en respectant les contraintes v13. | TASK-006  |           |      |
| TASK-009 | Mettre à jour le fichier principal de l’importeur (ex. `module/importer/oggDude.mjs`) pour utiliser le nouveau service lors de la création d’Items. | TASK-007  |           |      |
| TASK-010 | Adapter au moins un mapper existant (par ex. `module/importer/items/weapon-ogg-dude.mjs`) pour déléguer l’affectation du champ `folder` au service. | TASK-009  |           |      |
| TASK-011 | Étendre l’intégration à tous les mappers OggDude (armor, gear, careers, talents, etc.) afin d’appliquer uniformément la hiérarchie.              | TASK-010  |           |      |
| TASK-012 | Ajouter une configuration simple (objet mapping) listant `importDomain` → `OggDude/<Subfolder>` dans un module dédié ou dans le service.          | TASK-006  |           |      |

### Implementation Phase 3

- GOAL-003: Gérer la compatibilité ascendante, la robustesse et la validation de la nouvelle organisation de dossiers.

| Task     | Description                                                                                                                                              | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-013 | Ajouter une gestion de fallback pour les types inconnus (`OggDude/Misc`) avec un log d’avertissement clair.                                            | TASK-007  |           |      |
| TASK-014 | S’assurer que la logique de `getOrCreateWorldFolder` ne recrée pas de doublons (`OggDude/OggDude/...`) et gère correctement les dossiers déjà existants. | TASK-007  |           |      |
| TASK-015 | Vérifier que les IDs de dossiers « historiques » utilisés dans les anciens exemples ne sont plus codés en dur dans le code (ou les encapsuler proprement). | TASK-003  |           |      |
| TASK-016 | Mettre à jour la documentation utilisateur sur l’import OggDude (`documentation/oggdude-import-guide.md`) pour décrire la nouvelle hiérarchie.          | TASK-011  |           |      |
| TASK-017 | Vérifier que les métriques et statistiques d’import (si existantes) ne dépendent pas de l’ancienne organisation en dossiers.                            | TASK-011  |           |      |

## 3. Alternatives

- **ALT-001**: Continuer à créer un dossier plat par domaine (ex. `OggDude Weapons`, `OggDude Armor`) sans hiérarchie racine commune.
  - Rejeté car moins lisible dans la vue Dossiers et plus difficile à étendre pour de nouveaux domaines.
- **ALT-002**: Laisser le choix du nom de dossier à l’utilisateur via les Settings du système.
  - Rejeté pour ce plan initial afin de garder un comportement déterministe et simple ; pourra être ajouté plus tard comme amélioration.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x minimum, avec support des dossiers hiérarchiques pour les Items et compendiums.
- **DEP-002**: Module d’import OggDude déjà opérationnel (lecture des XML, création d’Items) : ce plan ne couvre pas la mise en place de l’import lui-même.

## 5. Files

- **FILE-001**: `module/importer/oggDude.mjs` – Point d’entrée principal de l’import OggDude, orchestration de la création d’Items et de la distribution par domaine.
- **FILE-002**: `module/importer/items/weapon-ogg-dude.mjs` – Mapper des armes OggDude vers Items `weapon` SWERPG.
- **FILE-003**: `module/importer/items/armor-ogg-dude.mjs` – Mapper des armures OggDude vers Items `armor` SWERPG (chemin à confirmer / créer si manquant).
- **FILE-004**: `module/importer/items/gear-ogg-dude.mjs` – Mapper du gear OggDude vers Items `gear` SWERPG (chemin à confirmer / créer si manquant).
- **FILE-005**: `module/importer/items/career-ogg-dude.mjs` – Mapper des careers OggDude vers Items `career` SWERPG (chemin à confirmer / créer si manquant).
- **FILE-006**: `module/importer/items/talent-ogg-dude.mjs` – Mapper des talents OggDude vers Items `talent` SWERPG (chemin à confirmer / créer si manquant).
- **FILE-007**: `module/importer/utils/oggdude-import-folders.mjs` – Nouveau service utilitaire centralisant la création / résolution des dossiers d’import OggDude.
- **FILE-008**: `documentation/oggdude-import-guide.md` – Guide utilisateur de l’import OggDude, à mettre à jour pour décrire l’organisation en dossiers.

## 6. Testing

- **TEST-001**: Vitest – Tests unitaires pour `oggdude-import-folders.mjs` couvrant :
  - création du dossier racine `OggDude` s’il n’existe pas,
  - création / résolution d’un sous-dossier connu (`Weapons`, `Armor`, etc.),
  - réutilisation du même dossier sur plusieurs appels (cache),
  - gestion du fallback pour un type inconnu.
- **TEST-002**: Vitest / tests d’intégration pour `module/importer/oggDude.mjs` – simulation d’un import d’un petit jeu de données OggDude (mocké) et vérification que les Items créés ont `folder` pointant vers `OggDude/<Type>`.
- **TEST-003**: Tests manuels en Foundry – Import réel de quelques domaines (Weapons, Armor, Gear, Careers, Talents) et vérification visuelle de la hiérarchie de dossiers dans la vue Items et dans les compendiums concernés.
- **TEST-004**: Tests de non-régression – Exécuter les scénarios de tests existants pour l’import OggDude (armes, armures, gear, careers, talents) afin de s’assurer que seules les propriétés de dossier ont changé.

## 7. Risks & Assumptions

- **RISK-001**: Certains mondes peuvent déjà contenir un dossier `OggDude` utilisé pour autre chose ; la nouvelle logique pourrait fusionner avec ce dossier existant au lieu d’en créer un dédié.
- **RISK-002**: Des macros ou modules tiers pourraient dépendre de l’ancienne organisation (IDs de dossiers codés en dur) et pourraient être impactés par le changement.
- **RISK-003**: Si la gestion des dossiers de compendium diffère selon les versions de Foundry v13, il peut y avoir des divergences de comportement entre installations.

- **ASSUMPTION-001**: Les utilisateurs acceptent une réorganisation des dossiers limitée aux contenus nouvellement importés ; ce plan ne migre pas rétroactivement les anciens Items déjà créés.
- **ASSUMPTION-002**: Le module d’import OggDude n’expose pas de paramètre utilisateur permettant actuellement de choisir les dossiers de destination ; sinon, il faudra faire évoluer ce plan pour respecter ces options.
- **ASSUMPTION-003**: Les tests existants de l’import OggDude sont suffisamment stables pour détecter d’éventuelles régressions fonctionnelles non liées aux dossiers.

## 8. Related Specifications / Further Reading

- `/documentation/oggdude-import-guide.md` – Guide général sur l’import OggDude (à mettre à jour avec ce changement).
- `/documentation/oggdude-import-stats-guide.md` – Guide sur les statistiques d’import OggDude (utile pour vérifier que la réorganisation des dossiers ne perturbe pas les métriques).
- `/documentation/spec/oggdude-importer/bug-fix-weapon-import-need1-1.0.md` – Spécification détaillée sur le mapping des armes OggDude.
- `/documentation/spec/oggdude-importer/bug-fix-armor-import-need1-1.0.md` – Spécification détaillée sur le mapping des armures OggDude.
- `/documentation/spec/oggdude-importer/bug-fix-gear-import-need1-1.0.md` – Spécification détaillée sur le mapping du gear OggDude.
- `/documentation/spec/oggdude-importer/bug-career-import-data-needs-1.0.md` – Spécification détaillée sur l’import des careers OggDude.
- `/documentation/spec/oggdude-importer/bug-fix-talent-import-need1-1.0.md` – Spécification détaillée sur l’import des talents OggDude.

