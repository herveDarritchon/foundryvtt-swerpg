# Development Process - Fix TypeError in base-actor-sheet.mjs

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