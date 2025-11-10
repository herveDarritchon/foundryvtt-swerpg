# 📋 Plan de Développement - Swerpg (Version Exécutive)

_Document de référence : [ASSESSMENT_ET_PLAN_DEVELOPPEMENT.md](./ASSESSMENT_ET_PLAN_DEVELOPPEMENT.md)_

## 🎯 Objectifs & Priorités

### 🚨 Phase 1 : Stabilisation (Semaines 1-2) - CRITIQUE

**Objectif** : Passer de 4.41% à 70% de couverture de code

#### Tests Core à Implémenter (40h)

```bash
# Structure de tests prioritaires
tests/unit/
├── models/
│   ├── swerpg-actor.test.mjs      # 15h - Tests acteur complets
│   ├── swerpg-action.test.mjs     # 15h - Tests actions & workflow
│   └── data-models.test.mjs       # 5h - Tests modèles de données
└── applications/
    └── character-sheet.test.mjs   # 5h - Tests intégration UI
```

#### Dette Technique (20h)

- **Complexité cyclomatique** : Réduire 8 fonctions >15 → <15
- **Cleanup** : Supprimer code commenté + résoudre 15 TODOs
- **Variables inutilisées** : Corriger 12 occurrences

### 🎯 Phase 2 : Performance (Semaines 3-4) - ÉLEVÉE

#### Optimisations (30h)

```javascript
// Priority fixes
_prepareWeapons() // O(n²) → O(n)
.sort() mutations → .toSorted()
CompendiumCache implementation
```

### 🔒 Phase 3 : Sécurité (Semaines 5-6) - MODÉRÉE

#### Validation & Robustesse (15h)

- Validation UUID stricte
- Sanitization JavaScriptField
- Error boundaries

## 📊 Métriques de Succès

| Métrique            | Actuel | Objectif 1 mois | Objectif 3 mois |
| ------------------- | ------ | --------------- | --------------- |
| **Couverture Code** | 4.41%  | 70%             | 85%             |
| **Erreurs ESLint**  | 72     | <10             | 0               |
| **Perf Actions**    | N/A    | <100ms          | <50ms           |
| **Build Time**      | ~60s   | <45s            | <30s            |

## 🚀 Actions Immédiates (Cette Semaine)

### Jour 1-2 : Setup Tests

```bash
# 1. Créer structure
mkdir -p tests/{unit,integration,fixtures}/{models,applications}

# 2. Premier test SwerpgActor
cat > tests/unit/models/swerpg-actor.test.mjs << 'EOF'
import { describe, test, expect } from 'vitest'
import '../../../tests/setupTests.js'

describe('SwerpgActor', () => {
  test('should calculate derived values correctly', () => {
    // TODO: Implement
    expect(true).toBe(true)
  })
})
EOF

# 3. Lancer tests
pnpm test
```

### Jour 3-5 : ESLint Critical

```bash
# Identifier top 10 erreurs critiques
npx eslint module/ --max-warnings 10 --format compact

# Focus prioritaire :
# 1. Complexité: resetAllActorTalents(), _prepareWeapons()
# 2. Variables inutilisées: mh, oh, abilities
# 3. Code commenté: supprimer // lignes
```

## 📈 Tracking Progress

### Dashboard Hebdo

```bash
# Métriques à suivre chaque vendredi
pnpm test:coverage  # Couverture
pnpm lint          # Erreurs ESLint
npm run build      # Temps de build
```

### Revues

- **Lundi** : Planning sprint tests
- **Mercredi** : Point technique dette
- **Vendredi** : Métriques qualité

## 💰 ROI Estimé

**Investissement** : 105h × €80/h = €8,400  
**Économies annuelles** : €15,000+ (réduction 70% incidents)  
**ROI** : 179% sur 12 mois

## 🎖️ Success Criteria

### ✅ Phase 1 Complète Quand

- [ ] Couverture code ≥70%
- [ ] Tests SwerpgActor/Action passent
- [ ] Erreurs ESLint <10
- [ ] Build stable

### ✅ Projet Réussi Quand

- [ ] 0 défauts critiques production
- [ ] Performance <100ms actions courantes
- [ ] Déploiements sans rollback
- [ ] Équipe confiante pour releases

---

**Contact** : Équipe Technique Swerpg  
**Mise à jour** : Hebdomadaire vendredi  
**Escalation** : Si >2 semaines de retard sur Phase 1
