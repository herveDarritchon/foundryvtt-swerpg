---
goal: Fix TypeError in base-actor-sheet.mjs - Cannot read properties of undefined (reading 'items')
version: 1.0
date_created: 2025-11-11
last_updated: 2025-11-11
owner: Development Team
status: 'Completed'
tags: [bug, actor-sheet, error-handling, ui]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Ce plan d'implémentation vise à corriger le bug TypeError qui se produit dans `base-actor-sheet.mjs` à la ligne 911, où la propriété `items` est indéfinie lors de l'appel à `#getEventItem`. Cette erreur se manifeste lors des interactions avec l'équipement d'un acteur, particulièrement lors des actions d'équipement/déséquipement.

## 1. Requirements & Constraints

- **REQ-001**: Corriger le TypeError sans casser la fonctionnalité existante d'équipement
- **REQ-002**: Maintenir la compatibilité avec l'API Foundry VTT v13
- **REQ-003**: Implémenter une gestion d'erreur robuste pour éviter les crashes futurs
- **REQ-004**: Préserver l'interface utilisateur actuelle
- **SEC-001**: Valider les données d'entrée pour éviter les injections malveillantes
- **CON-001**: Le code doit rester compatible avec le système SwEotE existant
- **CON-002**: Les modifications ne doivent pas affecter les performances de rendu des sheets
- **GUD-001**: Utiliser les patterns de gestion d'erreur existants du système
- **GUD-002**: Suivre les conventions de nommage et structure du projet
- **PAT-001**: Implémenter la validation défensive dans les méthodes d'accès aux données

## 2. Implementation Steps

### Implementation Phase 1 - Investigation et Diagnostic

- GOAL-001: Identifier la cause racine du bug et comprendre le contexte d'exécution

| Task     | Description                                                                                | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-001 | Analyser le code dans `#getEventItem` à la ligne 911 pour identifier l'origine de l'erreur | ✅        | 2025-11-11 |
| TASK-002 | Examiner la méthode `#onItemEquip` pour comprendre le flux d'appel                         | ✅        | 2025-11-11 |
| TASK-003 | Identifier les conditions qui causent `items` à être undefined                             | ✅        | 2025-11-11 |
| TASK-004 | Reproduire le bug en local pour valider le diagnostic                                      | ✅        | 2025-11-11 |

### Implementation Phase 2 - Correction du Bug

- GOAL-002: Implémenter les corrections nécessaires avec gestion d'erreur appropriée

| Task     | Description                                                                                | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-005 | Ajouter une validation défensive dans `#getEventItem` pour vérifier l'existence de `items` | ✅        | 2025-11-11 |
| TASK-006 | Implémenter une gestion d'erreur gracieuse avec notification utilisateur appropriée        | ✅        | 2025-11-11 |
| TASK-007 | Ajouter des logs de debug pour faciliter le débogage futur                                 | ✅        | 2025-11-11 |
| TASK-008 | Mettre à jour les JSDoc des méthodes affectées                                             | ✅        | 2025-11-11 |

### Implementation Phase 3 - Tests et Validation

- GOAL-003: Valider la correction et s'assurer qu'aucune régression n'est introduite

| Task     | Description                                                                       | Completed | Date       |
| -------- | --------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-009 | Créer des tests unitaires pour `#getEventItem` avec différents scénarios d'erreur | ✅        | 2025-11-11 |
| TASK-010 | Tester manuellement les fonctionnalités d'équipement/déséquipement                | ✅        | 2025-11-11 |
| TASK-011 | Vérifier le comportement sur différents types d'acteurs (Hero, NPC, etc.)         | ✅        | 2025-11-11 |
| TASK-012 | Valider que les notifications d'erreur sont correctement affichées                | ✅        | 2025-11-11 |

## 3. Alternatives

- **ALT-001**: Refactoriser complètement la gestion des items dans la sheet - Rejeté car trop invasif pour un simple bug fix
- **ALT-002**: Utiliser try-catch global sur toute la méthode - Rejeté car masquerait d'autres erreurs potentielles
- **ALT-003**: Validation préventive dans `#onItemEquip` uniquement - Rejeté car ne protège pas contre d'autres appels à `#getEventItem`

## 4. Dependencies

- **DEP-001**: Foundry VTT v13 API pour les notifications utilisateur (`ui.notifications`)
- **DEP-002**: Système de logging existant du projet
- **DEP-003**: Framework de test Vitest pour les tests unitaires
- **DEP-004**: Système de localisation (`game.i18n`) pour les messages d'erreur

## 5. Files

- **FILE-001**: `/module/applications/actor/base-actor-sheet.mjs` - Fichier principal à corriger
- **FILE-002**: `/tests/applications/actor/base-actor-sheet.test.js` - Tests unitaires à créer/modifier
- **FILE-003**: `/lang/en.json` - Messages d'erreur en anglais
- **FILE-004**: `/lang/fr.json` - Messages d'erreur en français

## 6. Testing

- **TEST-001**: Test unitaire pour `#getEventItem` avec paramètre undefined
- **TEST-002**: Test unitaire pour `#getEventItem` avec objet sans propriété `items`
- **TEST-003**: Test unitaire pour `#getEventItem` avec données valides
- **TEST-004**: Test d'intégration pour le flux complet d'équipement d'un item
- **TEST-005**: Test de régression pour s'assurer qu'aucune fonctionnalité existante n'est cassée

## 7. Risks & Assumptions

- **RISK-001**: La correction pourrait masquer d'autres bugs sous-jacents dans la gestion des items
- **RISK-002**: Des appels à `#getEventItem` depuis d'autres parties du code pourraient être affectés
- **ASSUMPTION-001**: L'erreur est causée par un accès à une propriété undefined et non par une corruption de données
- **ASSUMPTION-002**: Les utilisateurs accepteront les notifications d'erreur comme alternative au crash
- **ASSUMPTION-003**: Le bug n'affecte que les interactions avec l'équipement et non d'autres fonctionnalités

## 8. Related Specifications / Further Reading

- [Foundry VTT Application V2 Documentation](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)
- [SwEotE System Actor Sheet Architecture](documentation/swerpg/actor-sheets.md)
- [Error Handling Best Practices](/.github/instructions/performance-optimization.instructions.md)
- [Security Guidelines](.github/instructions/security-and-owasp.instructions.md)
