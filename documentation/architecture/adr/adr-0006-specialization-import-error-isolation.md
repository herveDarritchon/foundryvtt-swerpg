# ADR-0006: Isolation des Erreurs par Item dans l'Import Spécialisation OggDude

Date: 2025-11-23  
Status: Proposed  
Context: Correction du dataset vide et invariant de statistiques violé pour l'import des spécialisations.

## Decision
Adopter un pattern d'isolation des erreurs par item dans `specializationMapper` via try/catch autour de chaque transformation, accumulation d'un tableau `rejected[]`, et propagation d'un compteur `rejectedCount` jusqu'à l'UI pour cohérence métriques.

## Context
Le mapper actuel produit un dataset vide sans logs granulaires. Les erreurs de structure ou données inattendues provoquent des retours `null` silencieux. Les statistiques d'import ne reflètent pas les rejets réels entraînant l'invariant violé.

## Options
1. (Choisie) Try/catch par item + collecte metrics rejet.
   - Pros: Granularité, robustesse, diagnostics faciles.
   - Cons: Légère surcharge (O(n)).
2. Abort global au premier échec.
   - Pros: Simplicité.
   - Cons: Perte de données valides, mauvaise UX.
3. Validation pré-tri + filtre multi-pass.
   - Pros: Séparation logique validation/transform.
   - Cons: Double parcours, complexité accrue.

## Rationale
Option 1 maximise la résilience et l'observabilité, maintient performance acceptable (n=123) et s'intègre aux métriques existantes. Permet une future extension (enrichissement reasons, classification erreurs).

## Impact
- Ajout structure de retour `{ dataset, rejected }` pour le mapper spécialisation.
- Mise à jour orchestrateur pour calculer correctement progress + stats.
- Légère augmentation complexité test (cas rejets).

## Security Considerations
Sanitization de la description intégrée dans try/catch pour prévenir injections HTML (OWASP XSS). Aucune exécution dynamique de code. Les skill codes sont normalisés.

## Performance Considerations
Complexité O(n) conservée. Logs par item activés uniquement en mode debug pour éviter bruit excessif.

## Review
Revoir après implémentation des mappers Force Powers (prévoir pattern généralisé d'erreurs). Date de réévaluation: 2026-01-15.

## Links
- Plan: bug-oggdude-specialization-empty-dataset-1.0.md
- Requirements: OGGDUDE_SPECIALIZATION_IMPORT_FIX_REQUIREMENTS.md
- Design: design-specialization-import-fix.md
- Tasks: oggdude-specialization-import-fix.tasks.md

