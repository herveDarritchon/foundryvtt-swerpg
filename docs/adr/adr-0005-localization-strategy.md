---
title: "ADR-0005: Stratégie de Localisation Français/Anglais"
status: "Accepted"
date: "2025-11-10"
authors: "Hervé Darritchon, Localization Team"
tags: ["architecture", "i18n", "localization", "multilingual", "foundry"]
supersedes: ""
superseded_by: ""
---

## Status

**Accepted** - Cette stratégie de localisation est implémentée avec support complet français/anglais.

## Context

Le système Star Wars Edge RPG doit supporter une audience internationale tout en maintenant une excellence dans la langue française. La complexité terminologique de l'univers Star Wars et des mécaniques de jeu narratives nécessite une approche de localisation sophistiquée.

**Exigences linguistiques :**

- **Français comme langue principale** - Développement et documentation native en français
- **Anglais comme langue secondaire** - Accessibilité internationale obligatoire
- **Terminologie Star Wars cohérente** - Respect des traductions officielles établies
- **Mécaniques de jeu précises** - Traduction fidèle des termes techniques (Triomphe, Désespoir, etc.)

**Contraintes techniques :**

- Système i18n FoundryVTT avec clés de localisation
- Performance runtime sans impact sur les calculs de jeu
- Maintenance synchronisée entre langues lors des évolutions
- Support des caractères étendus et formatage spécifique

**Contexte utilisateur :**

- Communauté francophone prioritaire mais non-exclusive
- Nouveaux joueurs nécessitant terminologie accessible
- MJ expérimentés attendant précision technique
- Contributeurs potentiels multilingues

## Decision

Implémentation d'une stratégie de localisation bilingue français-prioritaire avec les composants :

1. **Français comme langue de référence** - Développement et design en français natif
2. **Fichiers de localisation séparés** - `lang/fr.json` et `lang/en.json` indépendants
3. **Clés sémantiques hiérarchiques** - Organisation logique par domaine fonctionnel
4. **Traduction contextuelle** - Adaptation culturelle au-delà de la traduction littérale
5. **Validation automatisée** - Détection des clés manquantes et incohérences

**Architecture de localisation :**

```text
lang/
├── fr.json          (référence, ~2000 clés)
│   ├── ACTOR.*      (acteurs, classes, espèces)
│   ├── ITEM.*       (équipements, talents, pouvoirs)  
│   ├── DICE.*       (dés narratifs, résultats)
│   └── UI.*         (interface, dialogs, sheets)
└── en.json          (traduction complète)
    └── [structure identique]
```

## Consequences

### Positive

- **POS-001**: **Accessibilité francophone** - Expérience native pour la communauté française prioritaire
- **POS-002": **Portée internationale** - Ouverture vers l'audience anglophone mondiale
- **POS-003**: **Cohérence terminologique** - Vocabulaire Star Wars unifié et professionnel
- **POS-004**: **Maintenance facilitée** - Structure claire pour évolutions multilingues
- **POS-005**: **Performance optimale** - Chargement conditionnel sans surcoût runtime
- **POS-006**: **Contribution communautaire** - Possibilité d'ajout de langues supplémentaires

### Negative

- **NEG-001**: **Effort de maintenance double** - Chaque évolution nécessite mise à jour bilingue
- **NEG-002**: **Risque de désynchronisation** - Incohérences possibles entre versions linguistiques
- **NEG-003**: **Complexité terminologique** - Traduction technique Star Wars complexe à maintenir
- **NEG-004**: **Volume de contenu** - ~2000 clés de localisation à maintenir synchronisées
- **NEG-005**: **Validation manuelle** - Contrôle qualité traduction nécessite expertise bilingue

## Alternatives Considered

### Anglais uniquement

- **ALT-001**: **Description**: Développement exclusivement en anglais pour audience maximale
- **ALT-002**: **Rejection Reason**: Perte de l'expertise française et de la communauté francophone prioritaire

### Auto-traduction avec APIs (Google Translate, DeepL)

- **ALT-003**: **Description**: Génération automatique des traductions via services externes
- **ALT-004**: **Rejection Reason**: Qualité insuffisante pour terminologie technique Star Wars

### Localisation communautaire pure

- **ALT-005**: **Description**: Délégation complète de la traduction à la communauté
- **ALT-006**: **Rejection Reason**: Risque de qualité incohérente et maintenance non-garantie

### Support multilingue étendu (DE, ES, IT)

- **ALT-007**: **Description**: Support immédiat de 5+ langues européennes
- **ALT-008**: **Rejection Reason**: Complexité de maintenance excessive pour l'équipe actuelle

## Implementation Notes

- **IMP-001**: **Clés hiérarchiques** - Nomenclature `DOMAIN.CATEGORY.ITEM` pour organisation claire
- **IMP-002**: **Validation CI/CD** - Scripts automatiques détectant clés manquantes ou obsolètes
- **IMP-003**: **Fallback intelligent** - Affichage français si traduction anglaise manquante
- **IMP-004**: **Contexte pour traducteurs** - Commentaires explicatifs dans fichiers JSON
- **IMP-005**: **Tests de localisation** - Suite Vitest validant cohérence des traductions

## References

- **REF-001**: [FoundryVTT Localization Guide](https://foundryvtt.com/article/localization/)
- **REF-002**: [French Localization File](../../lang/fr.json)
- **REF-003**: [English Localization File](../../lang/en.json)
- **REF-004**: [Star Wars Official Terminology](https://www.starwars.com/)
- **REF-005**: [Localization Testing Suite](../../tests/localization/)
