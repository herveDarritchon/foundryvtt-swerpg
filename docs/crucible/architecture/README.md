# Documentation Architecture - Système Crucible

Ce dossier contient la documentation architecturale du système Crucible pour Foundry VTT v13.

---

## Documents Disponibles

### OVERVIEW.md

**Description** : Vue d'ensemble architecturale complète du système

**Contenu** :

- Architecture générale Foundry VTT
- Structure des documents et data models
- Applications et UI
- Configuration et initialisation
- Diagrammes de structure

**Pour qui** : Développeurs voulant comprendre l'architecture globale

**Liens vers** : Tous les autres documents de ce dossier

---

### PATTERNS.md ⭐ NOUVEAU

**Description** : Catalogue complet des patterns de conception utilisés dans Crucible

**Contenu** :

- **Patterns Structurels** (3) : Mixin, Template Method, Type Object
- **Patterns Comportementaux** (4) : Command, Strategy, Observer, State
- **Patterns de Création** (3) : Factory, Builder, Prototype
- **Patterns Foundry VTT** (3) : Document-Model Separation, Configuration Hierarchy, Enum

**Total** : 13 patterns documentés avec diagrammes

**Pour qui** :

- Développeurs voulant comprendre les choix architecturaux
- Contributeurs voulant respecter les conventions existantes
- Architectes évaluant la qualité du code

**Exemples d'utilisation** :

- Comment le Mixin pattern est utilisé avec HandlebarsApplicationMixin
- Comment le Command pattern encapsule les actions
- Comment le Template Method structure la préparation de données

**Diagrammes** : 13 diagrammes de classes et séquences Mermaid

---

### MODELS.md ⭐ NOUVEAU

**Description** : Documentation exhaustive de tous les data models TypeDataModel

**Contenu** :

- **Actor Models** (4) : BaseActor, HeroActor, AdversaryActor, GroupActor
- **Item Models** (13) : PhysicalItem, Weapon, Armor, Talent, Spell, Ancestry, Background, etc.
- **Combat Models** (3) : CombatChallenge, ExplorationChallenge, SocialChallenge
- **Action Models** (2) : CrucibleAction, CrucibleSpellAction
- **Spellcraft Models** (3) : Gesture, Rune, Inflection

**Total** : 24+ models documentés avec schémas complets

**Pour qui** :

- Développeurs créant de nouveaux types d'items ou actors
- Développeurs modifiant les schémas de données
- Analystes de données comprenant la structure

**Exemples d'utilisation** :

- Structure complète d'un CrucibleHeroActor avec tous ses champs
- Schéma d'un CrucibleWeaponItem avec damage, scaling, properties
- Système de spellcraft avec Gesture + Rune + Inflections

**Diagrammes** : 10 diagrammes de classes et hiérarchies Mermaid

---

### WORKFLOWS.md ⭐ NOUVEAU

**Description** : Documentation de tous les workflows (flux de travail) majeurs du système

**Contenu** :

- **Création de Personnage** : 3 étapes (Ancestry, Background, Talents)
- **Utilisation d'Action** : 5 phases complètes avec hooks
- **Combat** : Round complet avec système Heroism
- **Spellcasting** : Construction dynamique de sorts
- **Progression** : Montées de niveau et allocation de points
- **Repos** : Short rest et Long rest
- **Inventaire** : Équipement et encombrement
- **Compendium** : YAML → Compilation → LevelDB

**Total** : 8 workflows documentés avec diagrammes

**Pour qui** :

- Développeurs implémentant de nouvelles fonctionnalités
- Testeurs comprenant les scénarios utilisateur
- Game designers comprenant les mécaniques

**Exemples d'utilisation** :

- Séquence complète d'utilisation d'une action du clic au confirm
- Workflow de création d'un héros étape par étape
- Processus de compilation du contenu YAML vers LevelDB

**Diagrammes** : 30+ diagrammes de flux et séquences Mermaid

---

## Guide de Lecture Recommandé

### Pour comprendre le système en profondeur

1. **OVERVIEW.md** - Comprendre la structure globale
2. **PATTERNS.md** - Comprendre les choix architecturaux
3. **MODELS.md** - Comprendre la structure des données
4. **WORKFLOWS.md** - Comprendre les processus métier

### Pour implémenter une fonctionnalité spécifique

#### Créer une nouvelle action

1. **MODELS.md** → Section "CrucibleAction"
2. **WORKFLOWS.md** → Section "Workflow Utilisation d'Action"
3. **PATTERNS.md** → Section "Command Pattern"

#### Créer un nouveau type d'item

1. **MODELS.md** → Section "Item Models"
2. **PATTERNS.md** → Section "Type Object Pattern"
3. **WORKFLOWS.md** → Section "Workflow Compendium"

#### Modifier l'interface de création de personnage

1. **WORKFLOWS.md** → Section "Workflow Création de Personnage"
2. **PATTERNS.md** → Section "State Pattern"
3. **MODELS.md** → Section "CrucibleHeroActor"

#### Comprendre le système de combat

1. **WORKFLOWS.md** → Section "Workflow Combat"
2. **MODELS.md** → Section "Combat Models"
3. **PATTERNS.md** → Section "Observer Pattern" (pour les hooks)

---

## Statistiques

| Document     | Lignes    | Diagrammes | Sections | Models/Patterns/Workflows |
| ------------ | --------- | ---------- | -------- | ------------------------- |
| OVERVIEW.md  | ~500      | 5+         | 10+      | Vue globale               |
| PATTERNS.md  | ~650      | 13         | 13       | 13 patterns               |
| MODELS.md    | ~1100     | 10         | 24+      | 24+ models                |
| WORKFLOWS.md | ~1200     | 30+        | 8        | 8 workflows               |
| **Total**    | **~3450** | **58+**    | **55+**  | **45 éléments**           |

---

## Conventions de Documentation

### Format

- Tous les documents sont en **Markdown**
- Les diagrammes utilisent **Mermaid** (compatible GitHub/GitLab)
- Les exemples de code utilisent des blocs **JavaScript**
- Les schémas de données sont présentés en **pseudo-code** structuré

### Structure

Chaque document suit la structure :

1. **Table des matières**
2. **Introduction/Vue d'ensemble**
3. **Sections principales** (avec sous-sections)
4. **Diagrammes** (intégrés dans les sections)
5. **Exemples de code** (quand pertinent)
6. **Références** (liens vers fichiers source)

### Diagrammes Mermaid

Types utilisés :

- **classDiagram** : Structure de classes et héritage
- **sequenceDiagram** : Interactions et appels de méthodes
- **flowchart** : Flux de décision et processus
- **stateDiagram** : États et transitions
- **graph** : Graphes génériques

---

## Maintenance

### Quand mettre à jour

Ces documents doivent être mis à jour lorsque :

- ✅ Un nouveau pattern est introduit
- ✅ Un nouveau data model est créé
- ✅ Un workflow majeur est modifié
- ✅ L'architecture globale change
- ⚠️ Des détails d'implémentation mineurs changent (optionnel)

### Comment mettre à jour

1. Identifier le(s) document(s) affecté(s)
2. Mettre à jour les sections pertinentes
3. Mettre à jour les diagrammes si nécessaire
4. Vérifier les liens croisés
5. Mettre à jour DOCUMENTATION_PROCESS.md avec la date de modification

---

## Références

- **Code source** : `/module/**/*.mjs`
- **Configuration** : `/module/config/*.mjs`
- **Build** : `/build.mjs`
- **Foundry API** : <https://foundryvtt.com/api/>
- **TypeDataModel** : <https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html>

---

**Dernière mise à jour** : 2025-11-05  
**Version Crucible** : 0.8.1  
**Auteur** : Documentation AI-assistée (GitHub Copilot)
