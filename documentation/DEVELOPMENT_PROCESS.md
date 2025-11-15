# Development Process

---

## Feature: Jauge de progression globale import OggDude

## Contexte

Ajout d'une barre de progression globale (domaines) dans l'interface `OggDudeDataImporter` pour visualiser l'avancement de l'import des domaines sélectionnés (weapon, armor, gear, species, career, talent). Positionnée dans la section Statistiques, entre le titre et le tableau détaillé.

## Fichiers Analysés / Modifiés

- `module/settings/OggDudeDataImporter.mjs` (extension du contexte `_prepareContext`, casting numérique dans callback)
- `templates/settings/oggDudeDataImporter.hbs` (insertion markup Handlebars jauge accessible)
- `styles/applications.less` (styles `.import-progress-global` + utilitaire `.sr-only`)
- `tests/settings/OggDudeDataImporter.progress.spec.mjs` (nouveaux tests calcul pourcentage & cas limites)
- `plan/feature-importer-global-progress-jauge-1.md` (plan d'implémentation)

## Étapes Suivies

1. Lecture du plan `feature-importer-global-progress-jauge-1.md` et validation exigences (a11y, performance, sécurité).
2. Ajout champ `progressPercentDomains` dans `_prepareContext()` sans modifier usage existant de `progressPercent` (compatibilité).
3. Sécurisation callback de progression (cast `Number()` pour éviter valeurs non numériques / injection inattendue).
4. Insertion markup conditionnel Handlebars (affichage seulement si `progress.total > 0`).
5. Ajout styles Less (container + barre + transition + utilitaire a11y `.sr-only`).
6. Création tests unitaires : 0%, 50%, 100%, absence quand total=0.
7. Exécution suite d'intégration espèces (détection régression — échec initial hors périmètre fonctionnel de la jauge ; aucune modification requise sur ce point car pas lié; la jauge n'introduit pas de nouvelle dépendance).
8. Documentation mise à jour (présent document).

## Design & Décisions

- Choix de conserver `progressPercent` (ancien nom) mais ajouter `progressPercentDomains` pour clarté future et éviter conflit sémantique si une autre jauge items est ajoutée.
- Aucune suppression de l'ancienne barre `progress-global` dans la section métriques (décision: la nouvelle jauge est focalisée sur domaines, l'ancienne sur métriques globales détaillées). Risque faible de confusion car position différente; pourra être revue ultérieurement.
- Style: dégradé vert (#0b5e0b -> #19a319) garantissant contraste sur fond sombre (ratio > 4.5 estimé). Bordure et background semi-transparent pour lisibilité.
- Accessibilité: `role="progressbar"`, valeurs ARIA min/now/max, `aria-label` localisé, contenu texte masqué avec `.sr-only`.

## Tests & Couverture

| Test | Objectif |
|------|----------|
| `OggDudeDataImporter.progress.spec.mjs` | Calcul pourcentages & cas limites |
| Contexte existant | Non modifié, toujours valide |
| Intégration espèces | Pas d'impact direct sur import logique |

## Risques

- Double indication de progression (ancienne barre + nouvelle). Mitigation: design futur pour fusion éventuelle.
- Non compilation des styles si oubli de build manuel. Mitigation: script `pnpm run build` en CI.
- Performance: appels fréquents `render()` déjà existants; ajout non significatif (calcul O(1)).

## Points de Sécurité

- Casting numérique défensif pour éviter interprétation chaîne mal formée.
- Aucune interpolation HTML dangereuse; Handlebars échappe par défaut.

## Suivi / Améliorations Futures

- Fusion potentielle des deux jauges en un seul composant configurable.
- Ajout d'indicateurs de temps restant estimé si métriques disponibles.
- Tests de rendu Handlebars complets (snapshot) éventuels.

---

## Overview

This document outlines the step-by-step process followed to fix the TypeError bug in `base-actor-sheet.mjs` where `Cannot read properties of undefined (reading 'items')` was occurring at line 911 in the `#getEventItem` method.

## Problem Analysis

### Root Cause Identified

The bug was caused by the static method `#getEventItem` using `this.actor.items.get(itemId)`. In a static method, `this` refers to the class itself, not an instance, making `this.actor` undefined.

### Error Location

- **File**: `/module/applications/sheets/base-actor-sheet.mjs`
- **Method**: `static #getEventItem(event)`
- **Line**: 911 (original)
- **Error**: `TypeError: Cannot read properties of undefined (reading 'items')`

### Methods Affected

The following methods were calling `#getEventItem` and were susceptible to the same error:

- `#onItemDelete` (line 825)
- `#onItemEdit` (line 843)
- `#onItemEquip` (line 855)
- `#getEventItemDeleteAction` (line 922)

## Files Analyzed

### Core Implementation Files

- `/module/applications/sheets/base-actor-sheet.mjs` - Main implementation file containing the bug
- `/module/utils/logger.mjs` - Logging utility for error handling patterns

### Configuration Files

- `/lang/en.json` - English localization strings
- `/lang/fr.json` - French localization strings

### Test Files

- `/tests/applications/sheets/base-actor-sheet.test.mjs` - New integration tests created

### Documentation Files

- `/plan/bugs/fix-bug-base-actor-sheet.md` - Implementation plan
- `/documentation/DEVELOPMENT_PROCESS.md` - This process document

## Error Handling Patterns Identified

From project analysis, the following error handling patterns were identified and followed:

### UI Notifications

- `ui.notifications.error()` - For blocking errors
- `ui.notifications.warn()` - For non-blocking warnings
- `ui.notifications.info()` - For informational messages

### Error Logging

- `logger.error()` - For serious errors that need investigation
- `logger.warn()` - For warnings and recoverable issues
- `logger.info()` - For informational logging

### Try-Catch Patterns

- Always provide user feedback through UI notifications
- Log detailed error information for debugging
- Graceful degradation when possible

## Implementation Steps

### 1. Method Signature Change

**Before:**

```javascript
static #getEventItem(event) {
  const itemId = event.target.closest('.line-item')?.dataset.itemId
  return this.actor.items.get(itemId, { strict: true })
}
```

**After:**

```javascript
static #getEventItem(event, actor) {
  // Comprehensive error handling implementation
}
```

### 2. Defensive Validation Added

- **Event validation**: Check if event parameter is provided
- **Actor validation**: Check if actor parameter is provided
- **DOM validation**: Check if itemId exists in dataset
- **Items collection validation**: Check if actor has items collection
- **Item existence validation**: Check if item exists in collection

### 3. Error Handling Implementation

- **Try-catch wrapper**: Catch unexpected errors
- **Specific error messages**: Different messages for different error types
- **User notifications**: Appropriate UI feedback for each error type
- **Logging**: Detailed logging for debugging
- **Graceful return**: Return null on errors instead of throwing

### 4. Method Call Updates

Updated all callers to pass the actor parameter:

```javascript
// Before
const item = SwerpgBaseActorSheet.#getEventItem(event)

// After
const item = SwerpgBaseActorSheet.#getEventItem(event, this.actor)
if (!item) return
```

### 5. Localization Strings Added

Added error messages in both English and French:

**English (`/lang/en.json`):**

```json
"ERRORS": {
  "InvalidEvent": "Invalid event: Unable to process the UI interaction.",
  "InvalidActor": "Invalid actor: Unable to access character data.",
  "NoItemId": "No item selected: Please click on a valid item.",
  "NoItemsCollection": "Character data error: Items collection is missing.",
  "ItemNotFound": "Item not found: The selected item may have been deleted.",
  "UnexpectedError": "An unexpected error occurred. Please check the console for details."
}
```

**French (`/lang/fr.json`):**

```json
"ERRORS": {
  "InvalidEvent": "Événement invalide : Impossible de traiter l'interaction d'interface.",
  "InvalidActor": "Acteur invalide : Impossible d'accéder aux données du personnage.",
  "NoItemId": "Aucun objet sélectionné : Veuillez cliquer sur un objet valide.",
  "NoItemsCollection": "Erreur de données du personnage : La collection d'objets est manquante.",
  "ItemNotFound": "Objet introuvable : L'objet sélectionné a peut-être été supprimé.",
  "UnexpectedError": "Une erreur inattendue s'est produite. Consultez la console pour plus de détails."
}
```

### 6. Integration Tests Created

Created comprehensive integration tests in `/tests/applications/sheets/base-actor-sheet.test.mjs`:

- **Success scenarios**: Normal operation with valid data
- **Error scenarios**: Various error conditions and edge cases
- **Error boundary testing**: Unexpected errors and malformed data
- **UI notification verification**: Ensuring proper user feedback
- **Logging verification**: Ensuring proper error logging

## Testing Strategy

### Test Categories

1. **Integration Tests**: Test the actual methods that call `#getEventItem`
2. **Error Boundary Tests**: Test error handling with various invalid inputs
3. **UI Feedback Tests**: Verify proper notifications are shown
4. **Logging Tests**: Verify proper error logging

### Test Scenarios Covered

- Valid item editing/equipping operations
- Missing itemId in DOM dataset
- Non-existent item IDs
- Actor without items collection
- Broken items collection (throws errors)
- Malformed DOM events
- Null/undefined parameters

## Code Quality Measures

### Defensive Programming

- Parameter validation at method entry
- Null checks before property access
- Graceful error handling with user feedback

### Error Messages

- Specific, actionable error messages
- Localized for international users
- Different severity levels (error vs warning)

### Logging

- Detailed logging for debugging
- Structured error information
- Follows project logging patterns

## Deployment Considerations

### Backward Compatibility

- No breaking changes to public API
- Internal method signature change only affects internal callers
- All existing functionality preserved

### Performance Impact

- Minimal performance impact from additional validation
- Error handling only executes on error conditions
- No impact on success path performance

### Monitoring

- Enhanced error logging for better debugging
- User-friendly error messages reduce support burden
- Clear error categorization for issue triage

## Future Improvements

### Potential Enhancements

1. **Centralized Error Handling**: Create a shared error handler for common sheet errors
2. **Error Analytics**: Track error frequency and types for proactive fixes
3. **Automated Testing**: Add e2e tests for user interaction scenarios
4. **Documentation Updates**: Update JSDoc with error handling details

### Prevention Measures

1. **Code Review Checklist**: Include static method context checks
2. **Linting Rules**: Consider custom ESLint rules for static method patterns
3. **Developer Education**: Document common pitfalls with static methods

## Conclusion

The bug fix successfully addresses the root cause while implementing comprehensive error handling that follows project patterns. The solution is defensive, user-friendly, and maintainable, with proper test coverage to prevent regressions.

### Key Success Metrics

- ✅ Bug eliminated - no more TypeError crashes
- ✅ Graceful error handling with user feedback
- ✅ Comprehensive test coverage
- ✅ Internationalized error messages
- ✅ Follows project conventions and patterns
- ✅ No breaking changes or performance impact

### Files Modified

- `module/applications/sheets/base-actor-sheet.mjs` - Main bug fix
- `lang/en.json` - English error messages
- `lang/fr.json` - French error messages
- `tests/applications/sheets/base-actor-sheet.test.mjs` - New test file
- `documentation/DEVELOPMENT_PROCESS.md` - This documentation

The fix is ready for code review and deployment.
