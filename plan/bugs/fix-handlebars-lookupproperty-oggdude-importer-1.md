---
goal: Résoudre l'erreur "c.lookupProperty is not a function" dans l'application OggDude Data Importer
version: 1.0
date_created: 2025-01-14
last_updated: 2025-01-14
owner: FoundryVTT SweRPG Team
status: 'Planned'
tags: ['bug', 'handlebars', 'oggdude', 'importer', 'ui', 'settings']
---

# Résolution Bug Handlebars lookupProperty - OggDude Data Importer

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan d'implémentation pour résoudre l'erreur `c.lookupProperty is not a function` qui se produit lors de l'ouverture de la fenêtre de configuration OggDude Data Importer dans FoundryVTT. Cette erreur est liée à une incompatibilité de version Handlebars et à l'utilisation de helpers ou expressions non supportés dans les templates.

## 1. Requirements & Constraints

### Erreur Identifiée

- **ERR-001**: L'erreur `c.lookupProperty is not a function` se produit dans le template `oggDudeDataImporter.hbs`
- **ERR-002**: L'erreur survient lors du rendu de la partie `swerpgSettings` de l'application `OggDudeDataImporter`
- **ERR-003**: Stack trace indique un problème dans `handlebars.min.js` ligne 27 avec `lookupProperty`

### Exigences Techniques

- **REQ-001**: L'application doit s'ouvrir sans erreur de rendu Handlebars
- **REQ-002**: Tous les éléments du template doivent être correctement affichés
- **REQ-003**: La fonctionnalité d'import OggDude doit rester intacte
- **REQ-004**: Maintenir la compatibilité avec FoundryVTT v13
- **REQ-005**: Respecter les standards ApplicationV2 + HandlebarsApplicationMixin

### Contraintes

- **CON-001**: Ne pas modifier la logique métier de l'importateur
- **CON-002**: Préserver l'interface utilisateur existante
- **CON-003**: Maintenir la compatibilité avec les templates Handlebars de Foundry
- **CON-004**: Ne pas impacter les autres applications du système

### Guidelines

- **GUD-001**: Suivre les patterns ApplicationV2 établis dans le projet
- **GUD-002**: Utiliser les helpers Handlebars Foundry natifs
- **GUD-003**: Éviter les expressions Handlebars complexes dans les templates
- **GUD-004**: Documenter les modifications de template

### Pattern à Suivre

- **PAT-001**: Modèle `HandlebarsApplicationMixin(ApplicationV2)` standard
- **PAT-002**: Préparation de contexte via `_prepareContext()`
- **PAT-003**: Utilisation des helpers Foundry standard (`localize`, conditionnels simples)

## 2. Implementation Steps

### Implementation Phase 1 - Analyse et Diagnostic

- GOAL-001: Identifier la source exacte de l'erreur `lookupProperty` dans les templates

| Task     | Description           | Completed | Date       |
| -------- | --------------------- | --------- | ---------- |
| TASK-001 | Analyser le template `oggDudeDataImporter.hbs` pour identifier les expressions Handlebars problématiques | | |
| TASK-002 | Vérifier les helpers Handlebars utilisés et leur compatibilité avec Foundry v13 | | |
| TASK-003 | Examiner le contexte de données passé depuis `_prepareContext()` dans `OggDudeDataImporter.mjs` | | |
| TASK-004 | Identifier les références `this.` potentiellement problématiques dans le template | | |

### Implementation Phase 2 - Correction des Templates

- GOAL-002: Corriger les expressions Handlebars incompatibles dans le template

| Task     | Description           | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-005 | Remplacer les références `this.domains` par `domains` dans le template | | |
| TASK-006 | Corriger les références `this.zipFile` par `zipFile` | | |
| TASK-007 | Simplifier les expressions conditionnelles complexes | | |
| TASK-008 | Valider que tous les helpers utilisés sont standard Foundry | | |

### Implementation Phase 3 - Validation et Tests

- GOAL-003: Vérifier que l'application fonctionne correctement après correction

| Task     | Description           | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-009 | Tester l'ouverture de l'application OggDude Data Importer | | |
| TASK-010 | Vérifier l'affichage correct de tous les éléments du formulaire | | |
| TASK-011 | Tester les interactions (sélection de fichier, domaines, actions) | | |
| TASK-012 | Valider que l'import OggDude fonctionne de bout en bout | | |

## 3. Alternatives

- **ALT-001**: Mise à jour de la version Handlebars - Rejetée car Foundry contrôle la version
- **ALT-002**: Réécriture complète du template - Trop complexe pour un simple bug de compatibilité
- **ALT-003**: Migration vers un autre système de templating - Non compatible avec l'écosystème Foundry

## 4. Dependencies

- **DEP-001**: FoundryVTT v13 et sa version de Handlebars
- **DEP-002**: Template `oggDudeDataImporter.hbs` existant
- **DEP-003**: Classe `OggDudeDataImporter` et sa méthode `_prepareContext()`
- **DEP-004**: Système de localisation FoundryVTT (`game.i18n.localize`)

## 5. Files

- **FILE-001**: `/templates/settings/oggDudeDataImporter.hbs` - Template principal à corriger
- **FILE-002**: `/module/settings/OggDudeDataImporter.mjs` - Application source (vérification contexte)
- **FILE-003**: `/lang/en.json` et `/lang/fr.json` - Clés de localisation (vérification)

## 6. Testing

- **TEST-001**: Test manuel d'ouverture de l'application OggDude Data Importer depuis les paramètres FoundryVTT
- **TEST-002**: Test de sélection de fichier ZIP OggDude
- **TEST-003**: Test de sélection/désélection des domaines d'import
- **TEST-004**: Test des actions Load, Preview, Reset
- **TEST-005**: Test complet d'import de données OggDude (optionnel pour validation)

## 7. Risks & Assumptions

### Risques

- **RISK-001**: La correction pourrait affecter d'autres templates utilisant des patterns similaires
- **RISK-002**: Les modifications pourraient impacter la logique de rendu existante
- **RISK-003**: Incompatibilité avec des versions futures de Foundry si changements trop spécifiques

### Assumptions

- **ASSUMPTION-001**: L'erreur est causée par des expressions Handlebars non compatibles avec la version utilisée par Foundry v13
- **ASSUMPTION-002**: Les données du contexte sont correctement préparées dans `_prepareContext()`
- **ASSUMPTION-003**: Les clés de localisation sont correctement définies et accessibles
- **ASSUMPTION-004**: Le problème est limité au template et ne nécessite pas de modifications de la logique JavaScript

## 8. Related Specifications / Further Reading

- [Documentation ApplicationV2 FoundryVTT](https://foundryvtt.com/api/interfaces/foundry.applications.api.ApplicationV2Configuration.html)
- [Handlebars Documentation](https://handlebarsjs.com/guide/)
- [Architecture UI Applications SweRPG](/documentation/swerpg/architecture/ui/APPLICATIONS.md)
- [Patterns Handlebars FoundryVTT](/documentation/swerpg/architecture/integration/FOUNDRY_INTEGRATION.md)
