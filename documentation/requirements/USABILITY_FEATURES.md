# Fonctionnalités d'Utilisabilité - Système Star Wars Edge RPG (SWERPG)

## Introduction

Ce document décrit les fonctionnalités et principes d'utilisabilité du système Star Wars Edge RPG, visant à offrir une expérience utilisateur optimale qui capture l'essence de l'univers Star Wars tout en restant accessible aux joueurs et maîtres de jeu.

## 1. Interface Utilisateur

### 1.1 Design Cohérent

#### Thématique Star Wars

Le système utilise un design cohérent inspiré de l'esthétique de l'univers Star Wars :

- **Palette de couleurs** : Inspiration des films avec bleu hyperespace, orange rebelle, rouge Sith
- **Typographie** : Polices évoquant l'univers (Star Jedi pour titres, Orbitron pour texte technique)
- **Iconographie** : Font Awesome avec icônes personnalisées (sabres laser, casques, vaisseaux)
- **Effets visuels** : Lueurs subtiles et animations évoquant la technologie Star Wars

**Éléments visuels** :

```less
// styles/variables.less
@color-primary: #00a8ff; // Bleu hyperespace
@color-secondary: #ffc312; // Orange rebelle
@color-danger: #c23616; // Rouge Sith
@color-empire: #2f3640; // Gris Imperial
@color-jedi: #4cd137; // Vert sabre laser
@color-background: #1e1e1e; // Noir spatial
@color-text: #f5f6fa; // Blanc brillant
```

### 1.2 Navigation Intuitive

#### Feuilles de Personnage Star Wars

Organisation par onglets spécialisés :

- **Général** : Vue principale avec caractéristiques, compétences, statut vital
- **Carrière** : Spécialisations, arbres de talents, progression XP
- **Force** : Pouvoirs, moralité, points de Force (si applicable)
- **Combat** : Armes, armures, défenses, manœuvres
- **Équipement** : Inventaire, crédits, encombrement
- **Obligations** : Obligations/Devoirs/Conflits selon la gamme

**Indicateurs visuels Star Wars** :

- 🔴 Seuils de blessures atteints (Wounds/Strain)
- 🟢 Statut normal
- ⚡ Points de Force disponibles
- 🔒 Talents non accessibles (prérequis manquants)
- ✅ Talents acquis
- 💰 Crédits et équipement
- 🎯 Actions de combat disponibles

### 1.3 Responsive Design

**Adaptation aux écrans** :

Le système s'adapte aux différentes tailles d'écran tout en préservant l'accessibilité :

- **Desktop** : Interface complète avec tous les détails
- **Tablet** : Réorganisation des onglets en accordéon
- **Mobile** : Version simplifiée pour consultation rapide

```css
/* Adaptation responsive pour Star Wars */
@media (max-width: 768px) {
  .swerpg-sheet {
    .talent-tree {
      grid-template-columns: repeat(2, 1fr);
      font-size: 0.8em;
    }

    .dice-pool {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
}
```

## 2. Expérience Utilisateur

### 2.1 Workflow de Création de Personnage

**Processus guidé** :

1. **Sélection d'Espèce** : Interface visuelle avec aperçu des bonus raciaux
2. **Choix de Carrière** : Descriptions détaillées et compétences de carrière
3. **Spécialisation** : Présentation de l'arbre de talents associé
4. **Attribution des Points** : Aide contextuelle pour optimisation
5. **Équipement de Départ** : Sélection selon la carrière et les crédits
6. **Obligations/Motivations** : Génération aléatoire ou sélection manuelle

**Assistance contextuelle** :

```javascript
// Guide de création interactif
class CharacterCreationGuide {
  static showSpeciesBonus(species) {
    const tooltip = `
            <div class="species-preview">
                <h4>${species.name}</h4>
                <p><strong>Bonus:</strong> ${species.characteristics}</p>
                <p><strong>Capacités:</strong> ${species.abilities.join(', ')}</p>
                <p><strong>XP de départ:</strong> ${species.startingXP}</p>
            </div>
        `
    ui.notifications.info(tooltip, { permanent: true })
  }
}
```

### 2.2 Système de Dés Intuitif

**Interface de Construction de Pool** :

- Drag & drop pour ajouter/retirer des dés
- Visualisation en temps réel du pool
- Suggestions automatiques basées sur la situation
- Sauvegarde de pools fréquents
- Raccourcis pour jets standards

**Interprétation des Résultats** :

- Affichage graphique des symboles obtenus
- Suggestions narratives automatiques
- Calcul des degrés de succès/échec
- Historique des jets avec contexte

```javascript
// Interface de pool de dés intelligente
class SmartDiceInterface {
  static suggestPool(characteristic, skill, difficulty, situation) {
    const base = this.calculateBasePool(characteristic, skill, difficulty)
    const modifiers = this.analyzeSituation(situation)

    return {
      pool: base,
      suggestions: modifiers.suggestions,
      explanation: modifiers.reasoning,
    }
  }

  static formatResult(roll) {
    return {
      success: roll.total >= 0,
      narrative: this.generateNarrative(roll.symbols),
      mechanical: this.calculateEffects(roll.symbols),
    }
  }
}
```

### 2.3 Gestion des Talents Streamlinée

**Arbre de Talents Interactif** :

- Vue d'ensemble avec zoom et pan
- Filtrage par type de talent (passif, actif, Force)
- Simulation d'achat avec calcul XP
- Connexions visuelles entre talents prérequis
- Export/import de builds de personnage

**Recherche et Découverte** :

- Moteur de recherche par nom, effet, ou mot-clé
- Recommandations basées sur le style de jeu
- Comparaison de talents similaires
- Favoris et listes de souhaits

## 3. Accessibilité

### 3.1 Standards WCAG 2.1

**Conformité Level AA** :

- Contraste de couleurs suffisant (4.5:1 minimum)
- Navigation complète au clavier
- Lecteurs d'écran supportés
- Textes alternatifs pour tous les éléments visuels
- Focus visible et logique

```html
<!-- Exemple d'élément accessible pour dés de Force -->
<button class="force-die-button" aria-label="Lancer dé de Force - Rating 3" aria-describedby="force-explanation" role="button" tabindex="0">
  <i class="sw-icon sw-force-die" aria-hidden="true"></i>
  <span class="sr-only">Dé de Force</span>
</button>

<div id="force-explanation" class="tooltip" role="tooltip">Lance 3 dés de Force (d12) pour générer des points lumineux ou obscurs</div>
```

### 3.2 Support Multi-langue

**Localisation complète** :

- Interface traduite (français, anglais)
- Contenus des compendia localisés
- Adaptation culturelle des références Star Wars
- RTL support pour langues arabes (futur)

**Système de traduction dynamique** :

```javascript
// Localisation contextuelle
class SwerpgI18n {
  static localizeWithContext(key, context = {}) {
    const base = game.i18n.localize(key)
    return this.interpolateContext(base, context)
  }

  static getSpeciesName(species, gender = 'neutral') {
    const key = `SPECIES.${species}.name.${gender}`
    return game.i18n.has(key) ? game.i18n.localize(key) : species
  }
}
```

### 3.3 Options de Confort

**Personnalisation d'affichage** :

- Taille de police ajustable
- Contraste élevé optionnel
- Réduction des animations pour sensibilité motion
- Mode daltonien avec palettes adaptées
- Simplification d'interface optionnelle

## 4. Aide et Documentation

### 4.1 Système d'Aide Contextuelle

**Tooltips Intelligents** :

- Information adaptée au niveau d'expérience
- Liens vers règles complètes
- Exemples concrets d'utilisation
- Références de page des livres officiels

**Assistant de Règles** :

```javascript
// Assistant contextuel pour règles complexes
class RulesAssistant {
  static explainMechanic(mechanic, userLevel = 'beginner') {
    const explanations = {
      beginner: this.getSimpleExplanation(mechanic),
      intermediate: this.getDetailedExplanation(mechanic),
      expert: this.getReferenceOnly(mechanic),
    }

    return explanations[userLevel]
  }

  static suggestTutorial(context) {
    if (context.firstTimeUser) {
      return this.getGettingStartedTutorial()
    }
    if (context.strugglingWithMechanic) {
      return this.getTargetedHelp(context.mechanic)
    }
  }
}
```

### 4.2 Tutoriels Intégrés

**Parcours d'Apprentissage** :

1. **Bases** : Création de personnage et interface
2. **Dés Narratifs** : Comprendre les symboles et interprétation
3. **Talents** : Navigation et optimisation
4. **Combat** : Initiative et actions
5. **Force** : Pouvoirs et moralité (pour Force & Destiny)

**Mode Entraînement** :

- Simulations sans conséquences
- Retour immédiat sur les actions
- Progression guidée
- Certificats de compétence

### 4.3 Base de Connaissances

**Recherche Unifiée** :

- Recherche cross-référencée (règles, talents, équipement)
- Suggestions automatiques
- Historique de recherche
- Bookmarks personnels

**Contenu Communautaire** :

- Guides de joueurs intégrés
- Partage de builds de personnages
- Exemples d'interprétation narrative
- FAQ collaborative

## 5. Personnalisation

### 5.1 Thèmes Visuels

**Thèmes Prédefinis** :

- **Classic** : Palette de base Star Wars
- **Empire** : Tons gris et rouges
- **Rebellion** : Orange et bleus
- **Jedi** : Verts et dorés apaisants
- **Sith** : Rouges et noirs dramatiques
- **High Contrast** : Accessibilité maximale

### 5.2 Layouts Adaptables

**Configuration d'Interface** :

- Réorganisation des onglets par drag & drop
- Masquage d'éléments non utilisés
- Taille des panels ajustable
- Raccourcis personnalisables

```javascript
// Système de personnalisation
class SwerpgCustomization {
  static saveLayout(userId, layoutConfig) {
    return game.settings.set('swerpg', `layout.${userId}`, layoutConfig)
  }

  static applyTheme(themeName) {
    document.documentElement.className = document.documentElement.className.replace(/theme-\w+/, '') + ` theme-${themeName}`
  }
}
```

### 5.3 Macros et Automatisation

**Macros Pré-construites** :

- Jets de compétences fréquents
- Actions de combat standards
- Utilisation de talents actifs
- Gestion des ressources (Strain, Force, etc.)

**Builder de Macros Visuel** :

- Interface glisser-déposer
- Prévisualisation en temps réel
- Partage avec autres joueurs
- Validation automatique

## 6. Performance et Fluidité

### 6.1 Optimisations Ciblées

**Chargement Intelligent** :

- Lazy loading des talents non visibles
- Cache des calculs fréquents (pools de dés)
- Préchargement des éléments critiques
- Compression des assets graphiques

### 6.2 Feedback Utilisateur

**Indicateurs Visuels** :

- Spinners pour opérations longues
- Progress bars pour chargements
- Confirmation visuelle des actions
- États d'erreur clairs et actionables

**Retour Haptique** (si supporté) :

- Vibration subtile pour jets critiques
- Feedback tactile pour interactions importantes
- Paramètres de sensibilité ajustables

## 7. Intégration Sociale

### 7.1 Collaboration en Temps Réel

**Partage d'Informations** :

- Partage de feuilles de personnage en lecture
- Collaboration sur création de groupe
- Votes pour décisions de groupe
- Historique partagé des événements importants

### 7.2 Communication Intégrée

**Chat Enrichi** :

- Intégration des résultats de dés dans le chat
- Émotes et reactions Star Wars
- Chuchotements automatiques pour actions secrètes
- Formatage riche pour descriptions

```javascript
// Chat enrichi pour Star Wars
class SwerpgChat {
  static enhanceMessage(message, roll) {
    return {
      ...message,
      starWarsFormatting: true,
      diceResult: this.formatDiceForChat(roll),
      narrativeSuggestion: this.generateNarrative(roll),
      soundEffect: this.getSoundForAction(roll.action),
    }
  }
}
```

## 8. Métriques et Amélioration Continue

### 8.1 Analytics d'Utilisation

**Données Collectées** (anonymisées) :

- Fonctionnalités les plus utilisées
- Points de friction identifiés
- Temps passé sur différentes tâches
- Patterns d'utilisation par type d'utilisateur

### 8.2 Feedback Loop

**Retour Utilisateur** :

- Système de rating in-app
- Suggestions d'amélioration intégrées
- Bug reporting simplifié
- Beta testing pour nouvelles fonctionnalités

---

## Conclusion

Ces fonctionnalités d'utilisabilité garantissent que le système Star Wars Edge RPG offre une expérience immersive et accessible, capturant l'essence de l'univers Star Wars tout en restant intuitive pour les joueurs de tous niveaux. L'accent est mis sur la découvrabilité des fonctionnalités et l'assistance contextuelle pour les mécaniques complexes du jeu.
