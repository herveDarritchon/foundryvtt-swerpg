# Exigences Fonctionnelles - Système Star Wars Edge RPG (SWERPG)

## Méthodologie MOSCOW

Ce document classe les exigences fonctionnelles selon la méthode MoSCoW :

- **M**ust have (Essentiel)
- **S**hould have (Important)
- **C**ould have (Souhaitable)
- **W**on't have (Exclu pour cette version)

## M - Must Have (Essentielles)

### M1 - Gestion des Personnages Héros Star Wars

**Description** : Le système doit permettre la création et la gestion complète de personnages héros dans l'univers Star Wars.

**Critères d'acceptation** :

- ✅ Création de personnage avec sélection d'espèce (Species)
- ✅ Sélection de carrière et spécialisation
- ✅ Attribution des caractéristiques (Brawn, Agility, Intellect, Cunning, Willpower, Presence)
- ✅ Gestion des compétences par rang et carrière
- ✅ Gestion des ressources (Health, Strain, Wounds, Stress)
- ✅ Système d'obligations/devoirs/conflits
- ✅ Équipement et inventaire Star Wars

**Implémentation** :

- Classe : [`SwerpgHero`](../../module/models/hero.mjs#L8)
- Fichier : [`module/models/hero.mjs`](../../module/models/hero.mjs)
- Sheet : [`HeroSheet`](../../module/applications/sheets/hero-sheet.mjs#L6) ([`module/applications/sheets/hero-sheet.mjs`](../../module/applications/sheets/hero-sheet.mjs))

**Tests** :

- Création d'un héros complet avec espèce et carrière
- Attribution de talents de spécialisation
- Équipement d'armes blaster et sabres laser
- Gestion des obligations

---

### M2 - Système de Dés Narratifs

**Description** : Implémentation complète du système de dés narratifs unique à Star Wars Edge RPG.

**Critères d'acceptation** :

- ✅ Support de tous les types de dés (Ability, Proficiency, Difficulty, Challenge, Boost, Setback, Force)
- ✅ Calcul automatique des pools de dés basé sur caractéristiques + compétences
- ✅ Interprétation des symboles (Success, Advantage, Threat, Despair, Triumph)
- ✅ Gestion des dés de Force avec points lumineux/obscurs
- ✅ Interface utilisateur pour construction manuelle des pools
- ✅ Affichage narratif des résultats avec suggestions d'interprétation

**Implémentation** :

- Classes : [`SwerpgDicePool`](../../module/dice/dice-pool.mjs#L1), [`SwerpgDiceRoll`](../../module/dice/dice-roll.mjs#L1)
- Fichiers :
  - [`module/dice/dice-pool.mjs`](../../module/dice/dice-pool.mjs)
  - [`module/dice/dice-roll.mjs`](../../module/dice/dice-roll.mjs)
  - [`module/config/dice.mjs`](../../module/config/dice.mjs)

**Tests** :

- Jet de compétence standard (caractéristique + compétence)
- Jet de Force avec interprétation des points
- Jet opposé entre personnages
- Application de modificateurs situationnels

---

### M3 - Système de Talents et Spécialisations

**Description** : Gestion des arbres de talents spécifiques aux carrières et spécialisations Star Wars.

**Critères d'acceptation** :

- ✅ Arbres de talents par spécialisation avec disposition 5x4
- ✅ Système de connexions et prérequis entre talents
- ✅ Calcul automatique du coût d'acquisition (5×rang)
- ✅ Talents à rangs multiples
- ✅ Talents passifs et actifs
- ✅ Interface visuelle de l'arbre de talents

**Implémentation** :

- Classes : [`SwerpgTalent`](../../module/models/talent.mjs#L1), [`SwerpgTalentNode`](../../module/config/talent-tree.mjs#L1)
- Fichiers :
  - [`module/models/talent.mjs`](../../module/models/talent.mjs)
  - [`module/config/talent-tree.mjs`](../../module/config/talent-tree.mjs)
  - [`module/models/specialization.mjs`](../../module/models/specialization.mjs)
- UI : [`TalentTree`](../../ui/tree/talent-tree.mjs#L1)

**Tests** :

- Achat de talent avec XP
- Vérification des prérequis
- Application d'effets de talents
- Navigation dans l'arbre de talents

---

### M4 - Système de la Force

**Description** : Implémentation complète du système mystique de la Force avec pouvoirs et moralité.

**Critères d'acceptation** :

- ✅ Évaluation de Force (Force Rating 0-6)
- ✅ Génération de points de Force avec dés de Force
- ✅ Pouvoirs de base (Move, Influence, Sense, etc.)
- ✅ Système de Moralité (1-100) et Conflit
- ✅ Pool de Destinée partagé (points lumineux/obscurs)
- ✅ Conséquences morales de l'usage du côté obscur

**Implémentation** :

- Classes : [`SwerpgForceSystem`](../../module/models/force-system.mjs#L1), [`ForceUser`](../../module/models/force-user.mjs#L1)
- Fichiers :
  - [`module/models/force-system.mjs`](../../module/models/force-system.mjs)
  - [`module/config/force-powers.mjs`](../../module/config/force-powers.mjs)
- Configuration : [`FORCE_POWERS`](../../module/config/system.mjs#L45)

**Tests** :

- Utilisation d'un pouvoir de Force
- Génération de Conflit par usage du côté obscur
- Évolution de la Moralité
- Gestion du pool de Destinée

---

### M5 - Combat Star Wars

**Description** : Système de combat tactique avec initiative structurée et actions spécialisées.

**Critères d'acceptation** :

- ✅ Initiative par emplacements (slots) et non par ordre fixe
- ✅ Actions de combat (Action, Maneuver, Incidental)
- ✅ Système de défense (Ranged/Melee Defense, Soak)
- ✅ Armes Star Wars (blasters, sabres laser, vibroblades)
- ✅ Gestion de l'encombrement (Encumbrance)
- ✅ Blessures critiques avec table des effets

**Implémentation** :

- Classes : [`SwerpgCombat`](../../module/models/combat.mjs#L1), [`SwerpgWeapon`](../../module/models/weapon.mjs#L1)
- Fichiers :
  - [`module/models/combat.mjs`](../../module/models/combat.mjs)
  - [`module/models/weapon.mjs`](../../module/models/weapon.mjs)
  - [`module/config/weapon.mjs`](../../module/config/weapon.mjs)

**Tests** :

- Combat avec sabres laser
- Tir de blaster avec défense à distance
- Application de blessures critiques
- Gestion des manœuvres

---

## S - Should Have (Importantes)

### S1 - Système d'Obligations/Devoirs

**Description** : Mécaniques de complications personnelles qui influencent le gameplay.

**Critères d'acceptation** :

- ✅ Types d'obligations par gamme (Edge: Obligations, Age: Duty, F&D: Morality)
- ✅ Valeurs numériques et seuils de déclenchement
- ✅ Intégration avec les jets de début de session
- ✅ Effets mécaniques et narratifs

**Implémentation** :

- Classe : [`SwerpgObligation`](../../module/models/obligation.mjs#L1)
- Fichier : [`module/models/obligation.mjs`](../../module/models/obligation.mjs)

---

### S2 - Véhicules et Starships

**Description** : Gestion des véhicules terrestres et vaisseaux spatiaux.

**Critères d'acceptation** :

- ✅ Feuilles de véhicules avec caractéristiques spécialisées
- ✅ Combat de véhicules et spatial
- ✅ Systèmes de véhicules et dommages
- ✅ Équipages et postes d'action

**Implémentation** :

- Classe : [`SwerpgVehicle`](../../module/models/vehicle.mjs#L1)
- Configuration : [`VEHICLE_SYSTEMS`](../../module/config/vehicles.mjs#L1)

---

### S3 - Système de Réputation

**Description** : Gestion de la réputation des personnages dans différentes factions.

**Critères d'acceptation** :

- ✅ Factions principales (Empire, Rébellion, Cartels, etc.)
- ✅ Échelles de réputation par faction
- ✅ Effets sur les interactions sociales
- ✅ Événements liés à la réputation

---

### S4 - Gestion de l'Équipement Star Wars

**Description** : Équipement spécialisé de l'univers Star Wars avec modificateurs.

**Critères d'acceptation** :

- ✅ Armes iconiques (sabres laser, blasters)
- ✅ Armures et équipements de protection
- ✅ Modificateurs d'équipement (mods)
- ✅ Équipement de survie et outils
- ✅ Cybernétiques et implants

**Implémentation** :

- Classes : [`SwerpgWeapon`](../../module/models/weapon.mjs#L1), [`SwerpgArmor`](../../module/models/armor.mjs#L1)
- Fichiers :
  - [`module/models/weapon.mjs`](../../module/models/weapon.mjs)
  - [`module/models/armor.mjs`](../../module/models/armor.mjs)

---

## C - Could Have (Souhaitables)

### C1 - Système de Crafting

**Description** : Création d'équipement et de sabres laser personnalisés.

**Critères d'acceptation** :

- ✅ Construction de sabres laser avec cristaux
- ✅ Modificateurs et améliorations
- ✅ Processus de création avec jets de compétence
- ✅ Matériaux et ressources

---

### C2 - Système de Base/Hideout

**Description** : Gestion des bases d'opération et planques.

**Critères d'acceptation** :

- ✅ Acquisition et amélioration de bases
- ✅ Modules et fonctionnalités
- ✅ Défenses et sécurité
- ✅ Revenus et maintenance

---

### C3 - Événements Galactiques

**Description** : Système d'événements à l'échelle galactique affectant les campagnes.

**Critères d'acceptation** :

- ✅ Chronologie de la Guerre Civile Galactique
- ✅ Événements majeurs automatisés
- ✅ Impacts sur les factions et la réputation
- ✅ Hooks narratifs générés

---

### C4 - Système de Compagnons

**Description** : Gestion des compagnons IA, droïdes et créatures.

**Critères d'acceptation** :

- ✅ Compagnons droïdes avec programmation
- ✅ Créatures et montures
- ✅ Progression et fidélité
- ✅ Actions coordonnées en combat

---

## W - Won't Have (Exclus pour cette version)

### W1 - Système d'Empire Building

**Description** : Gestion de factions à grande échelle.

**Justification** : Trop complexe pour la version actuelle, nécessiterait un module séparé.

---

### W2 - Réalité Virtuelle/AR

**Description** : Intégration avec des technologies immersives.

**Justification** : Hors du scope de Foundry VTT et des besoins actuels.

---

### W3 - Intelligence Artificielle Avancée

**Description** : IA pour génération automatique de contenu.

**Justification** : Technologie non mature pour l'intégration système.

---

## Critères Transversaux

### Performance

- Temps de chargement des feuilles : < 1s
- Calcul des pools de dés : < 200ms
- Rendu de l'arbre de talents : < 2s

### Compatibilité

- Foundry VTT v13.347+
- Support navigateurs modernes
- Modules communautaires populaires

### Utilisabilité

- Interface cohérente avec l'esthétique Star Wars
- Tooltips explicatifs pour les mécaniques
- Raccourcis clavier pour actions fréquentes
- Support tactile basique

### Maintenance

- Code modulaire et documenté
- Tests unitaires pour fonctions critiques
- Migration automatique des données
- Logs d'erreur détaillés

---

## Références

- **Documentation API** : [Foundry VTT v13 API](https://foundryvtt.com/api/v13/)
- **Livres de règles** : Edge of the Empire, Age of Rebellion, Force and Destiny
- **Architecture** : [MODELS.md](../architecture/MODELS.md), [OVERVIEW.md](../architecture/OVERVIEW.md)
- **Modules** : [DICE_SYSTEM.md](../modules/DICE_SYSTEM.md), [FORCE_SYSTEM.md](../modules/FORCE_SYSTEM.md), [TALENT_SYSTEM.md](../modules/TALENT_SYSTEM.md)