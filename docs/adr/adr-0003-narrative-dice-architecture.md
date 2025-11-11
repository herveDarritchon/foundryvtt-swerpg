---
title: 'ADR-0003: Architecture des Dés Narratifs Star Wars Edge'
status: 'Accepted'
date: '2025-11-10'
authors: 'Hervé Darritchon, Game Design Team'
tags: ['architecture', 'dice', 'narrative', 'star-wars', 'gameplay']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette architecture est implémentée et constitue le cœur du système de jeu swerpg.

## Context

Le système Star Wars Edge RPG utilise un système de dés narratifs unique qui va au-delà des succès/échecs traditionnels. Ce système nécessite une implémentation technique sophistiquée pour gérer les interactions complexes entre différents types de résultats.

**Spécificités du système Star Wars Edge :**

- **Dés de Capacité** (Ability) : Succès, Avantages
- **Dés de Compétence** (Proficiency) : Succès, Avantages, Triomphes
- **Dés de Difficulté** (Difficulty) : Échecs, Menaces
- **Dés de Challenge** (Challenge) : Échecs, Menaces, Désespoirs
- **Dés d'Amélioration** (Boost) : Succès, Avantages
- **Dés de Complication** (Setback) : Échecs, Menaces

**Complexités techniques :**

- Résolution narrative avec multiples axes de résultats simultanés
- Annulation entre succès/échecs et avantages/menaces
- Effets spéciaux des Triomphes et Désespoirs non-annulables
- Interface utilisateur intuitive pour la construction de pools
- Intégration avec les mécaniques de talents et équipements

**Contraintes FoundryVTT :**

- Système de dés personnalisé dans l'écosystème Foundry
- Performance temps réel pour les jets complexes
- Compatibilité avec les macros et automatisations
- Support des rolls privés/publics du MJ

## Decision

Implémentation d'une architecture modulaire de dés narratifs avec les composants suivants :

1. **SwerpgDie Classes** - Hiérarchie de classes pour chaque type de dé
2. **SwerpgDicePool** - Gestionnaire de pool avec logique d'annulation
3. **SwerpgDiceResult** - Résultat structuré avec succès nets et effets narratifs
4. **SwerpgDiceDialog** - Interface de construction de pools intuitive
5. **Chat Integration** - Affichage enrichi des résultats dans le chat

**Architecture technique :**

```javascript
// Hiérarchie des dés
class SwerpgDie extends Die {
  // Logique commune (faces, étiquettes, couleurs)
}

class SwerpgAbilityDie extends SwerpgDie {
  // Dé vert - Capacité
}

class SwerpgProficiencyDie extends SwerpgDie {
  // Dé jaune - Compétence avec Triomphes
}

// Pool de dés avec résolution narrative
class SwerpgDicePool {
  resolve() {
    // Calcul des succès nets après annulation
    // Gestion des Triomphes/Désespoirs
    // Génération des suggestions narratives
  }
}
```

## Consequences

### Positive

- **POS-001**: **Expérience narrative authentique** - Respect fidèle des mécaniques Star Wars Edge
- **POS-002**: **Interface intuitive** - Construction de pools accessible aux nouveaux joueurs
- **POS-003**: **Performance optimisée** - Calculs de résolution rapides même pour pools complexes
- **POS-004**: **Extensibilité** - Architecture permettant l'ajout de nouveaux types de dés
- **POS-005**: **Intégration FoundryVTT** - Compatibilité native avec les systèmes de rolls et macros
- **POS-006**: **Suggestions narratives** - Aide à l'interprétation des résultats pour les MJ/joueurs

### Negative

- **NEG-001**: **Complexité technique** - Système de dés plus complexe qu'un système traditionnel
- **NEG-002**: **Courbe d'apprentissage** - Joueurs doivent comprendre les mécaniques narratives
- **NEG-003**: **Performance UI** - Interface de construction de pools peut être lourde
- **NEG-004**: **Maintenance spécialisée** - Expertise Star Wars Edge requise pour modifications
- **NEG-005**: **Dépendance règles** - Fortement couplé aux règles officielles Star Wars

## Alternatives Considered

### Système de dés traditionnel (d20, d%)

- **ALT-001**: **Description**: Conversion vers un système de dés classique plus simple
- **ALT-002**: **Rejection Reason**: Perte complète de l'expérience narrative unique Star Wars Edge

### Dés binaires Succès/Échec seulement

- **ALT-003**: **Description**: Simplification en gardant seulement succès/échecs, ignorant avantages/menaces
- **ALT-004**: **Rejection Reason**: Élimination des mécaniques narratives centrales du système

### Utilisation de dés FoundryVTT standard

- **ALT-005**: **Description**: Adaptation avec les dés standard Foundry + tables de résultats
- **ALT-006**: **Rejection Reason**: Interface utilisateur confuse et non-intuitive

### Système de cartes au lieu de dés

- **ALT-007**: **Description**: Remplacement des dés par un système de cartes narratives
- **ALT-008**: **Rejection Reason**: Rupture totale avec les règles officielles Star Wars Edge

## Implementation Notes

- **IMP-001**: **Modularité** - Chaque type de dé implémenté comme classe séparée pour la maintenance
- **IMP-002**: **Caching des calculs** - Optimisation des résolutions pour les pools fréquents
- **IMP-003**: **Interface progressive** - Modes débutant/expert pour la construction de pools
- **IMP-004**: **Tests exhaustifs** - Suite de tests couvrant toutes les combinaisons de dés
- **IMP-005**: **Documentation intégrée** - Aide contextuelle pour les mécaniques de dés

## References

- **REF-001**: [Star Wars Edge RPG Core Rulebook - Dice System](https://www.fantasyflightgames.com/)
- **REF-002**: [Dice System Implementation](../../module/dice/)
- **REF-003**: [SwerpgDicePool Class](../../module/dice/dice-pool.mjs)
- **REF-004**: [Dice UI Components](../../ui/dice/)
- **REF-005**: [Dice System Documentation](../documentation/swerpg/modules/DICE_SYSTEM.md)
