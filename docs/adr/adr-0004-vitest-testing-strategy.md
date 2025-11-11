---
title: 'ADR-0004: Pattern de Test avec Vitest et Stratégie de Couverture'
status: 'Accepted'
date: '2025-11-10'
authors: 'Hervé Darritchon, Quality Team'
tags: ['architecture', 'testing', 'quality', 'vitest', 'coverage']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette stratégie de test est implémentée et appliquée dans tout le projet swerpg.

## Context

Le projet Star Wars Edge RPG nécessite une stratégie de test robuste pour garantir la fiabilité des mécaniques de jeu complexes et l'intégration FoundryVTT. La nature critique des calculs de dés narratifs, de la gestion des talents et des workflows ApplicationV2 exige une couverture de test exhaustive.

**Exigences de qualité :**

- Validation des mécaniques de dés narratifs avec toutes leurs combinaisons
- Tests de régression pour les migrations ApplicationV1→ApplicationV2
- Couverture des modèles de données TypeDataModel complexes
- Tests d'intégration avec l'écosystème FoundryVTT
- Performance des calculs temps réel (jets de dés, résolution talents)

**Contraintes techniques :**

- Environnement Node.js avec modules ES6+
- Simulation de l'environnement FoundryVTT pour les tests
- Tests rapides pour feedback développeur instantané
- Intégration avec workflow pnpm et GitHub Actions
- Support des tests asynchrones (Foundry API calls)

**Contexte écosystème :**

- Projet utilise pnpm comme gestionnaire de packages
- Build pipeline avec Rollup et compilation LESS
- Documentation technique extensive nécessitant validation
- Équipe distribuée nécessitant feedback rapide sur CI/CD

## Decision

Adoption de Vitest comme framework de test principal avec stratégie de couverture progressive :

1. **Vitest comme test runner** - Performance et compatibilité ES modules
2. **Couverture V8** - Rapports détaillés avec @vitest/coverage-v8
3. **Structure de tests modulaire** - Organisation miroir de `/module/` dans `/tests/`
4. **Mocking FoundryVTT** - Simulation des APIs Foundry pour tests isolés
5. **Seuils de couverture progressifs** - Objectif 90%+ avec enforcement automatique

**Configuration de test :**

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
```

## Consequences

### Positive

- **POS-001**: **Performance excellente** - Vitest 10x plus rapide que Jest pour ce projet
- **POS-002**: **Support ES modules natif** - Pas de transpilation nécessaire, tests fidèles au runtime
- **POS-003**: **Hot reload tests** - Feedback instantané pendant développement avec `--watch`
- **POS-004**: **Couverture V8 native** - Rapports précis sans instrumentation lourde
- **POS-005**: **Intégration pnpm** - Workspace monorepo supporté nativement
- **POS-006**: **Developer Experience** - Interface moderne avec stack trace claire

### Negative

- **NEG-001**: **Écosystème plus récent** - Moins de plugins/extensions que Jest
- **NEG-002**: **Mocking FoundryVTT complexe** - Simulation complète de l'environnement requise
- **NEG-003**: **Courbe d'apprentissage** - Équipe doit apprendre Vitest vs Jest familier
- **NEG-004**: **Stabilité relative** - Framework plus récent, potentiels bugs edge-case
- **NEG-005**: **Documentation limitée** - Moins de ressources communautaires que Jest

## Alternatives Considered

### Jest avec Babel

- **ALT-001**: **Description**: Framework de test établi avec transpilation Babel pour ES modules
- **ALT-002**: **Rejection Reason**: Performance dégradée, configuration Babel complexe, pas de hot reload

### Node.js Test Runner natif

- **ALT-003**: **Description**: Utilisation du test runner intégré Node.js 18+
- **ALT-004**: **Rejection Reason**: Fonctionnalités limitées, pas de couverture intégrée, interface basique

### Mocha + Chai + NYC

- **ALT-005**: **Description**: Stack de test traditionnelle modulaire
- **ALT-006**: **Rejection Reason**: Configuration complexe, performances moindres, maintenance multiple packages

### Deno Test (migration vers Deno)

- **ALT-007**: **Description**: Migration complète vers Deno avec son test runner intégré
- **ALT-008**: **Rejection Reason**: Migration majeure requise, incompatibilité écosystème FoundryVTT

## Implementation Notes

- **IMP-001**: **Structure de test miroir** - `/tests/` reflète exactement `/module/` pour navigation intuitive
- **IMP-002**: **Setup files organisés** - `setupTests.js` et `vitest-setup.js` pour mocks FoundryVTT
- **IMP-003**: **Scripts npm standardisés** - `test`, `test:watch`, `test:coverage` dans package.json
- **IMP-004**: **CI/CD intégration** - GitHub Actions avec cache pnpm et rapports de couverture
- **IMP-005**: **Seuils adaptatifs** - Couverture progressive : 60% → 80% → 90% par phase

## References

- **REF-001**: [Vitest Documentation](https://vitest.dev/)
- **REF-002**: [Project Vitest Configuration](../../vitest.config.js)
- **REF-003**: [Test Setup Files](../../tests/vitest-setup.js)
- **REF-004**: [Package.json Test Scripts](../../package.json)
- **REF-005**: [GitHub Actions CI](../../.github/workflows/)
