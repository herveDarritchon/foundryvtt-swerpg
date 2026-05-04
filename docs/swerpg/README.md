# Documentation Technique - Système Star Wars Edge RPG (swerpg)

Bienvenue dans la documentation technique du système Star Wars Edge RPG pour Foundry Virtual Tabletop v13+.

## 🆕 Mise à Jour Novembre 2025

**Migration Logger Centralisé Complétée** ✅

- **[DEVELOPER_GUIDE_LOGGING.md](./DEVELOPER_GUIDE_LOGGING.md)** - ⭐ Guide complet du logging centralisé
- **[MIGRATION_LOGGING_PROGRESSIVE.md](./MIGRATION_LOGGING_PROGRESSIVE.md)** - 📈 Stratégie de migration incrémentale pour PR
- **Interdiction stricte** des appels `console.xxx` directs
- **API logger unifiée** avec contrôle debug automatique
- **Patterns d'utilisation** par contexte (applications, documents, helpers)

## 📚 Table des Matières

### 🏗️ Architecture

- **[OVERVIEW.md](./architecture/OVERVIEW.md)** - Vue d'ensemble complète de l'architecture du système
  - Architecture globale
  - Principes architecturaux
  - Composants principaux
  - Flux de données
  - Patterns de code
  - Points d'extension

- **[PATTERNS.md](./architecture/PATTERNS.md)** - Patterns architecturaux Star Wars Edge
  - Patterns spécifiques au système narratif
  - Gestion des dés complexes
  - Intégration des mécaniques Star Wars
  - Bonnes pratiques

- **[MODELS.md](./architecture/MODELS.md)** - Modèles de données détaillés
  - Modèles d'acteurs (Héros, Adversaires, Véhicules)
  - Modèles d'objets (Talents, Équipements, Pouvoirs)
  - Schémas de données
  - Relations entre entités

- **[WORKFLOWS.md](./architecture/WORKFLOWS.md)** - Workflows système
  - Création de personnage
  - Résolution d'actions
  - Gestion du combat
  - Progression des personnages

### 🔧 Modules

- **[DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)** - Système de dés narratifs
  - Dés spécialisés (Ability, Proficiency, Difficulty, Challenge)
  - Symboles narratifs (Succès, Avantages, Menaces, Désespoir)
  - Résolution des jets
  - Interprétation narrative

- **[TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)** - Système de talents
  - Arbres de talents par spécialisation
  - Prérequis et progression
  - Rangs et formation
  - Interface de l'arbre de talents
  - Effets passifs et actifs

- **[OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md)** - Système d'obligations
  - Obligations Edge of the Empire
  - Devoirs Age of Rebellion
  - Conflits narratifs
  - Gestion automatique des déclenchements

### 📋 Exigences

- **[FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)** - Exigences fonctionnelles (MOSCOW)
  - Must Have (10 exigences essentielles)
  - Should Have (10 exigences importantes)
  - Could Have (10 exigences souhaitables)
  - Won't Have (5 exclusions)

- **[NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md)** - Exigences non-fonctionnelles
  - Performance
  - Compatibilité
  - Sécurité
  - Maintenabilité
  - Utilisabilité
  - Fiabilité
  - Évolutivité

- **[DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md)** - Scénarios de déploiement
  - Installation standard et développeur
  - Workflow de développement
  - Release et mise à jour
  - Configuration serveur
  - Dépannage

- **[USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md)** - Fonctionnalités d'utilisabilité
  - Interface utilisateur
  - Feedback utilisateur
  - Accessibilité
  - Assistant de création
  - Tooltips et aide

### 📝 Processus

- **[DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)** - Méthodologie de documentation
  - Approche utilisée
  - Fichiers analysés
  - Documentation créée
  - Statistiques
  - Prochaines étapes

## 🎯 Public Cible

Cette documentation est destinée à :

- **Développeurs** travaillant sur le système Star Wars Edge RPG
- **Contributeurs** souhaitant comprendre l'architecture
- **Mainteneurs** du projet
- **Développeurs Foundry VTT** expérimentés
- **MJ et Joueurs** intéressés par les mécaniques internes

⚠️ **Note** : Cette documentation suppose une connaissance solide de Foundry VTT v13+ et de JavaScript moderne (ES6+).

## 🚀 Démarrage Rapide

### Pour Comprendre l'Architecture

1. Commencez par **[OVERVIEW.md](./architecture/OVERVIEW.md)** pour une vision globale
2. Lisez **[DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)** pour comprendre le cœur mécanique
3. Consultez **[TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)** pour la progression des personnages

### Pour Contribuer

1. **OBLIGATOIRE** : Lisez **[DEVELOPER_GUIDE_LOGGING.md](./DEVELOPER_GUIDE_LOGGING.md)** - Logging centralisé
2. Suivez **[MIGRATION_LOGGING_PROGRESSIVE.md](./MIGRATION_LOGGING_PROGRESSIVE.md)** avant toute PR de migration
3. Consultez **[CODING_STYLES.md](./CODING_STYLES.md)** - Standards de code
4. Référez-vous à **[FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)** pour voir ce qui est implémenté
5. Vérifiez **[NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md)** pour les standards de qualité

### Pour Étendre le Système

1. Consultez la section "Points d'Extension" dans **[OVERVIEW.md](./architecture/OVERVIEW.md)**
2. Examinez les patterns dans **[PATTERNS.md](./architecture/PATTERNS.md)**
3. Référez-vous aux modèles dans **[MODELS.md](./architecture/MODELS.md)**

### Pour Jouer et Maîtriser

1. Commencez par **[DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)** pour comprendre les mécaniques de base
2. Consultez **[OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md)** pour les complications narratives

## 🌟 Spécificités Star Wars Edge RPG

Le système Star Wars Edge RPG se distingue par :

### Mécaniques Narratives

- **Dés Spécialisés** : Système unique de succès/échec avec nuances narratives
- **Symboles Multiples** : Chaque jet produit succès, avantages, menaces et complications
- **Interprétation** : Les résultats encouragent la narration collaborative

### Progression Organique

- **Arbres de Talents** : Progression flexible par spécialisation
- **Coûts Variables** : Système d'XP dynamique selon la distance des talents
- **Carrières Multiples** : Possibilité de diversifier les compétences

### Intégration Star Wars

- **Systèmes** : Edge of the Empire, Age of Rebellion
- **Obligations/Devoirs** : Complications personnelles intégrées au gameplay

## 📈 Métriques du Système

- **Types d'Acteurs** : 3 (Héros, Adversaires, Véhicules)
- **Types d'Objets** : 8+ (Talents, Armes, Armures, Équipements, etc.)
- **Compendiums** : 15+ packs de contenu officiel
- **Langues** : Français, Anglais
- **Compatibilité** : Foundry VTT v13.347+

## 🔧 Développement

### Structure du Projet

```text
swerpg/
├── swerpg.mjs              # Point d'entrée principal
├── module/                 # Code source organisé par domaine
│   ├── config/            # Configuration système
│   ├── documents/         # Extensions Foundry
│   ├── models/           # Modèles de données
│   ├── applications/     # Interfaces utilisateur
│   └── dice/             # Système de dés narratifs
├── _source/              # Données YAML sources
├── packs/                # Compendiums compilés
└── templates/            # Templates Handlebars
```

### Workflow de Développement

1. **Extraction** : `npm run extract` - YAML depuis packs binaires
2. **Compilation** : `npm run compile` - Packs binaires depuis YAML
3. **Build** : `npm run build` - Compilation complète
4. **Test** : `pnpm test` - Suite de tests
5. **Lint** : `npm run lint` - Vérification coding standards

### ⚠️ Règles Obligatoires Novembre 2025

```javascript
// ❌ INTERDIT - Appels console directs
console.log('message')
console.debug('debug')

// ✅ OBLIGATOIRE - Logger centralisé
import { logger } from '../utils/logger.mjs'
logger.info('message')
logger.debug('debug')
```

**Référence complète** : [DEVELOPER_GUIDE_LOGGING.md](./DEVELOPER_GUIDE_LOGGING.md)

## 📞 Support et Communauté

- **GitHub** : [foundryvtt-swerpg](https://github.com/herveDarritchon/foundryvtt-swerpg)
- **Issues** : Rapports de bugs et demandes de fonctionnalités
- **Discord** : Communauté Foundry VTT francophone
- **Email** : <herve.darritchon@gmail.com>

---

_Cette documentation est maintenue par Hervé Darritchon et la communauté des contributeurs._
