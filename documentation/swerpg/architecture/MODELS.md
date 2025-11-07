# Modèles de Données - Star Wars Edge RPG

## Introduction

Les modèles de données constituent la base structurelle du système Star Wars Edge RPG dans Foundry VTT. Ils utilisent le système `TypeDataModel` de Foundry v13 pour définir des schémas robustes et type-safe pour tous les types d'acteurs et d'objets.

## Architecture des Modèles

### Hiérarchie des Classes

```javascript
// Classe de base commune
class SwerpgDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {}
  }

  static migrateData(source, version) {
    // Migration automatique des données
    return source
  }

  prepareDerivedData() {
    // Calculs automatiques
  }
}

// Modèles d'acteurs
class SwerpgActorModel extends SwerpgDataModel {}
class HeroModel extends SwerpgActorModel {}
class AdversaryModel extends SwerpgActorModel {}
class VehicleModel extends SwerpgActorModel {}

// Modèles d'objets
class SwerpgItemModel extends SwerpgDataModel {}
class TalentModel extends SwerpgItemModel {}
class WeaponModel extends SwerpgItemModel {}
class ArmorModel extends SwerpgItemModel {}
```

### Registration des Modèles

```javascript
// Dans swerpg.mjs
CONFIG.Actor.dataModels = {
  hero: HeroModel,
  adversary: AdversaryModel,
  vehicle: VehicleModel,
}

CONFIG.Item.dataModels = {
  talent: TalentModel,
  weapon: WeaponModel,
  armor: ArmorModel,
  gear: GearModel,
  forcepower: ForcePowerModel,
  species: SpeciesModel,
  career: CareerModel,
  specialization: SpecializationModel,
}
```

## Modèles d'Acteurs

### Modèle Héros

```javascript
class HeroModel extends SwerpgActorModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Caractéristiques de base
      characteristics: new fields.SchemaField({
        brawn: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
        agility: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
        intellect: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
        cunning: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
        willpower: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
        presence: new fields.NumberField({
          required: true,
          initial: 2,
          min: 1,
          max: 6,
          integer: true,
        }),
      }),

      // Compétences
      skills: new fields.SchemaField({
        // Compétences Générales
        athletics: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'brawn' }),
        }),
        charm: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'presence' }),
        }),
        coercion: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'willpower' }),
        }),
        computers: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        cool: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'presence' }),
        }),
        coordination: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        deception: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'cunning' }),
        }),
        discipline: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'willpower' }),
        }),
        leadership: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'presence' }),
        }),
        mechanics: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        medicine: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        negotiation: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'presence' }),
        }),
        perception: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'cunning' }),
        }),
        piloting_planetary: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        piloting_space: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        resilience: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'brawn' }),
        }),
        skulduggery: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'cunning' }),
        }),
        stealth: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        streetwise: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'cunning' }),
        }),
        survival: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'cunning' }),
        }),
        vigilance: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'willpower' }),
        }),

        // Compétences de Combat
        brawl: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'brawn' }),
        }),
        gunnery: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        lightsaber: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'brawn' }),
        }),
        melee: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'brawn' }),
        }),
        ranged_heavy: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),
        ranged_light: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'agility' }),
        }),

        // Compétences de Connaissance
        knowledge_core_worlds: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_education: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_lore: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_outer_rim: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_underworld: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_warfare: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
        knowledge_xenology: new fields.SchemaField({
          rank: new fields.NumberField({ initial: 0, min: 0, max: 5 }),
          career: new fields.BooleanField({ initial: false }),
          characteristic: new fields.StringField({ initial: 'intellect' }),
        }),
      }),

      // Statut vital
      health: new fields.SchemaField({
        wounds: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0 }),
          max: new fields.NumberField({ initial: 10, min: 1 }),
        }),
        strain: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0 }),
          max: new fields.NumberField({ initial: 10, min: 1 }),
        }),
      }),

      // Défenses
      defense: new fields.SchemaField({
        melee: new fields.NumberField({ initial: 0, min: 0 }),
        ranged: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Seuils de Stress
      thresholds: new fields.SchemaField({
        wound: new fields.NumberField({ initial: 10, min: 1 }),
        strain: new fields.NumberField({ initial: 10, min: 1 }),
      }),

      // Expérience
      experience: new fields.SchemaField({
        total: new fields.NumberField({ initial: 0, min: 0 }),
        available: new fields.NumberField({ initial: 0, min: 0 }),
        spent: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Carrière et Spécialisations
      career: new fields.SchemaField({
        name: new fields.StringField({ initial: '' }),
        source: new fields.StringField({ initial: '' }),
        skills: new fields.ArrayField(new fields.StringField()),
      }),

      specializations: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          source: new fields.StringField(),
          career: new fields.BooleanField({ initial: true }),
          purchased: new fields.BooleanField({ initial: false }),
          cost: new fields.NumberField({ initial: 0 }),
        }),
      ),

      // Talents
      talents: new fields.ObjectField({ initial: {} }),

      // Obligations/Devoirs/Conflits
      obligations: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          type: new fields.StringField(),
          value: new fields.NumberField({ initial: 5, min: 0 }),
          description: new fields.StringField(),
        }),
      ),

      // Force (si applicable)
      force: new fields.SchemaField({
        rating: new fields.NumberField({ initial: 0, min: 0, max: 6 }),
        committed: new fields.NumberField({ initial: 0, min: 0 }),
        morality: new fields.NumberField({ initial: 50, min: 1, max: 100 }),
        conflict: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Motivations
      motivations: new fields.SchemaField({
        desire: new fields.StringField(),
        fear: new fields.StringField(),
        strength: new fields.StringField(),
        flaw: new fields.StringField(),
      }),

      // Informations Personnelles
      biography: new fields.SchemaField({
        species: new fields.StringField(),
        age: new fields.StringField(),
        height: new fields.StringField(),
        build: new fields.StringField(),
        hair: new fields.StringField(),
        eyes: new fields.StringField(),
        background: new fields.HTMLField(),
      }),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Calculer les seuils de blessure
    this.thresholds.wound = 10 + this.characteristics.brawn
    this.thresholds.strain = 10 + this.characteristics.willpower

    // Calculer les défenses de base (Agilité)
    this.defense.melee = this.characteristics.agility
    this.defense.ranged = this.characteristics.agility

    // Ajouter les bonus d'armure et de talents
    this._calculateArmorDefense()
    this._calculateTalentBonuses()

    // Calculer l'XP disponible
    this.experience.available = this.experience.total - this.experience.spent
  }

  _calculateArmorDefense() {
    const armor = this.parent.items.find((i) => i.type === 'armor' && i.system.equipped)

    if (armor) {
      this.defense.melee += armor.system.defense.melee || 0
      this.defense.ranged += armor.system.defense.ranged || 0
    }
  }

  _calculateTalentBonuses() {
    // Parcourir les talents pour appliquer les bonus
    for (const [talentId, talentData] of Object.entries(this.talents)) {
      const talent = this.parent.items.get(talentData.id)
      if (!talent) continue

      // Appliquer les effets passifs du talent
      this._applyTalentEffects(talent, talentData.rank)
    }
  }
}
```

### Modèle Adversaire

```javascript
class AdversaryModel extends SwerpgActorModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Caractéristiques simplifiées
      characteristics: new fields.SchemaField({
        brawn: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
        agility: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
        intellect: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
        cunning: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
        willpower: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
        presence: new fields.NumberField({ initial: 2, min: 1, max: 8 }),
      }),

      // Compétences clés seulement
      skills: new fields.ObjectField({ initial: {} }),

      // Points de vie simplifiés
      health: new fields.SchemaField({
        wounds: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0 }),
          max: new fields.NumberField({ initial: 10, min: 1 }),
        }),
        strain: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, min: 0 }),
          max: new fields.NumberField({ initial: 10, min: 1 }),
        }),
      }),

      // Type d'adversaire
      adversaryType: new fields.StringField({
        initial: 'minion',
        choices: ['minion', 'rival', 'nemesis'],
      }),

      // Groupes de subalternes
      minionGroup: new fields.SchemaField({
        size: new fields.NumberField({ initial: 1, min: 1, max: 20 }),
        remaining: new fields.NumberField({ initial: 1, min: 0, max: 20 }),
      }),

      // Talents spéciaux
      talents: new fields.ArrayField(new fields.StringField()),

      // Capacités spéciales
      abilities: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.StringField(),
          activation: new fields.StringField({ initial: 'passive' }),
        }),
      ),

      // Équipement
      equipment: new fields.ArrayField(new fields.StringField()),

      // Notes MJ
      notes: new fields.HTMLField(),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Calculs spécifiques aux adversaires
    this._calculateAdversaryStats()
    this._applyMinionGroupRules()
  }

  _calculateAdversaryStats() {
    // Seuils selon le type
    switch (this.adversaryType) {
      case 'minion':
        this.health.wounds.max = 5 + this.characteristics.brawn
        this.health.strain.max = 0 // Les subalternes n'ont pas de Strain
        break
      case 'rival':
        this.health.wounds.max = 10 + this.characteristics.brawn
        this.health.strain.max = 10 + this.characteristics.willpower
        break
      case 'nemesis':
        this.health.wounds.max = 15 + this.characteristics.brawn
        this.health.strain.max = 15 + this.characteristics.willpower
        break
    }
  }

  _applyMinionGroupRules() {
    if (this.adversaryType === 'minion' && this.minionGroup.size > 1) {
      // Bonus de groupe pour les subalternes
      const groupBonus = Math.min(this.minionGroup.remaining - 1, 4)

      // Ajouter des dés de compétence selon la taille du groupe
      for (const skill of Object.values(this.skills)) {
        skill.groupBonus = groupBonus
      }
    }
  }
}
```

### Modèle Véhicule

```javascript
class VehicleModel extends SwerpgActorModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Silhouette et Vitesse
      silhouette: new fields.NumberField({ initial: 2, min: 0, max: 10 }),
      speed: new fields.NumberField({ initial: 3, min: 0, max: 6 }),
      handling: new fields.NumberField({ initial: 0, min: -3, max: 5 }),

      // Défenses
      defense: new fields.SchemaField({
        fore: new fields.NumberField({ initial: 0, min: 0 }),
        aft: new fields.NumberField({ initial: 0, min: 0 }),
        port: new fields.NumberField({ initial: 0, min: 0 }),
        starboard: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Points de Coque et Systèmes
      hull: new fields.SchemaField({
        trauma: new fields.NumberField({ initial: 0, min: 0 }),
        threshold: new fields.NumberField({ initial: 10, min: 1 }),
      }),

      systems: new fields.SchemaField({
        strain: new fields.NumberField({ initial: 0, min: 0 }),
        threshold: new fields.NumberField({ initial: 10, min: 1 }),
      }),

      // Armement
      weapons: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          arc: new fields.StringField({ initial: 'forward' }),
          damage: new fields.NumberField({ initial: 5 }),
          critical: new fields.NumberField({ initial: 3 }),
          range: new fields.StringField({ initial: 'close' }),
          skill: new fields.StringField({ initial: 'gunnery' }),
          qualities: new fields.ArrayField(new fields.StringField()),
        }),
      ),

      // Équipage
      crew: new fields.SchemaField({
        pilot: new fields.NumberField({ initial: 1 }),
        copilot: new fields.NumberField({ initial: 0 }),
        gunners: new fields.NumberField({ initial: 0 }),
        engineers: new fields.NumberField({ initial: 0 }),
        passengers: new fields.NumberField({ initial: 0 }),
      }),

      // Capacités
      encumbrance: new fields.SchemaField({
        capacity: new fields.NumberField({ initial: 10 }),
        current: new fields.NumberField({ initial: 0 }),
      }),

      // Consommables
      consumables: new fields.SchemaField({
        food: new fields.NumberField({ initial: 0 }),
        fuel: new fields.NumberField({ initial: 0 }),
        oxygen: new fields.NumberField({ initial: 0 }),
      }),

      // Type de véhicule
      category: new fields.StringField({
        initial: 'starfighter',
        choices: ['starfighter', 'transport', 'freighter', 'corvette', 'frigate', 'cruiser', 'destroyer', 'speeder', 'walker', 'beast'],
      }),

      // Hyperdrive
      hyperdrive: new fields.SchemaField({
        rating: new fields.NumberField({ initial: 0, min: 0 }),
        backup: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Capteurs et Communications
      sensors: new fields.SchemaField({
        range: new fields.StringField({ initial: 'short' }),
        rating: new fields.NumberField({ initial: 0 }),
      }),

      communications: new fields.SchemaField({
        range: new fields.StringField({ initial: 'short' }),
        rating: new fields.NumberField({ initial: 0 }),
      }),

      // Modifications
      attachments: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.StringField(),
          hardpoints: new fields.NumberField({ initial: 1 }),
        }),
      ),

      // Points de Modification disponibles
      hardpoints: new fields.SchemaField({
        used: new fields.NumberField({ initial: 0, min: 0 }),
        total: new fields.NumberField({ initial: 0, min: 0 }),
      }),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Calculer les hardpoints utilisés
    this.hardpoints.used = this.attachments.reduce((sum, attachment) => sum + (attachment.hardpoints || 0), 0)

    // Calculer l'encombrement actuel
    this._calculateCurrentEncumbrance()

    // Ajuster les défenses selon les modifications
    this._applyAttachmentBonuses()
  }

  _calculateCurrentEncumbrance() {
    // Calculer selon les objets portés
    const items = this.parent.items.filter((i) => i.type === 'gear' || i.type === 'weapon' || i.type === 'armor')

    this.encumbrance.current = items.reduce((sum, item) => sum + (item.system.encumbrance || 0), 0)
  }

  _applyAttachmentBonuses() {
    // Appliquer les bonus des modifications
    for (const attachment of this.attachments) {
      // Logique spécifique selon le type de modification
      this._applyAttachmentEffect(attachment)
    }
  }
}
```

## Modèles d'Objets

### Modèle Talent

```javascript
class TalentModel extends SwerpgItemModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Identificateur unique
      identifier: new fields.StringField({ required: true }),

      // Type de talent
      type: new fields.StringField({
        initial: 'passive',
        choices: ['passive', 'active', 'threshold', 'ranked'],
      }),

      // Rangs
      maxRank: new fields.NumberField({ initial: 1, min: 1, max: 5 }),

      // Activation
      activation: new fields.SchemaField({
        type: new fields.StringField({
          initial: 'passive',
          choices: ['passive', 'incidental', 'maneuver', 'action'],
        }),
        cost: new fields.SchemaField({
          strain: new fields.NumberField({ initial: 0, min: 0 }),
          force: new fields.NumberField({ initial: 0, min: 0 }),
          other: new fields.StringField(),
        }),
      }),

      // Effets
      effects: new fields.ArrayField(
        new fields.SchemaField({
          type: new fields.StringField({
            choices: ['bonus', 'skill', 'characteristic', 'threshold', 'special'],
          }),
          target: new fields.StringField(),
          value: new fields.StringField(),
          condition: new fields.StringField(),
        }),
      ),

      // Position dans l'arbre de talents
      treePosition: new fields.SchemaField({
        specialization: new fields.StringField(),
        row: new fields.NumberField({ min: 0, max: 4 }),
        column: new fields.NumberField({ min: 0, max: 4 }),
        connections: new fields.ArrayField(new fields.StringField()),
      }),

      // Description et lore
      shortDescription: new fields.StringField(),
      longDescription: new fields.HTMLField(),

      // Système source
      source: new fields.SchemaField({
        book: new fields.StringField(),
        page: new fields.NumberField({ min: 0 }),
        system: new fields.StringField({
          choices: ['edge', 'rebellion', 'destiny', 'universal'],
        }),
      }),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Analyser les effets pour l'automatisation
    this._parseEffects()
  }

  _parseEffects() {
    // Parser les effets pour créer des ActiveEffects automatiques
    this.parsedEffects = this.effects.map((effect) => ({
      ...effect,
      automatable: this._isEffectAutomatable(effect),
    }))
  }

  _isEffectAutomatable(effect) {
    // Déterminer si l'effet peut être automatisé
    const automatableTypes = ['bonus', 'skill', 'characteristic', 'threshold']
    return automatableTypes.includes(effect.type) && effect.target
  }
}
```

### Modèle Arme

```javascript
class WeaponModel extends SwerpgItemModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Statistiques de base
      damage: new fields.NumberField({ initial: 5, min: 0 }),
      critical: new fields.NumberField({ initial: 3, min: 1, max: 5 }),
      range: new fields.StringField({
        initial: 'medium',
        choices: ['engaged', 'short', 'medium', 'long', 'extreme'],
      }),

      // Compétence associée
      skill: new fields.StringField({
        initial: 'ranged_light',
        choices: ['brawl', 'melee', 'lightsaber', 'ranged_light', 'ranged_heavy', 'gunnery'],
      }),

      // Caractéristique pour les dégâts
      characteristic: new fields.StringField({
        initial: 'brawn',
        choices: ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'],
      }),

      // Qualités et défauts
      qualities: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          value: new fields.NumberField({ initial: 1 }),
          description: new fields.StringField(),
        }),
      ),

      // Encombrement et Rareté
      encumbrance: new fields.NumberField({ initial: 1, min: 0 }),
      rarity: new fields.NumberField({ initial: 1, min: 1, max: 10 }),

      // Prix
      price: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        currency: new fields.StringField({ initial: 'credits' }),
        restricted: new fields.BooleanField({ initial: false }),
      }),

      // Modifications
      modifications: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.StringField(),
          installed: new fields.BooleanField({ initial: false }),
          modded: new fields.BooleanField({ initial: false }),
        }),
      ),

      // Munitions (si applicable)
      ammunition: new fields.SchemaField({
        type: new fields.StringField(),
        current: new fields.NumberField({ initial: 0, min: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Statut
      equipped: new fields.BooleanField({ initial: false }),

      // Catégorie d'arme
      category: new fields.StringField({
        initial: 'blaster',
        choices: ['blaster', 'slugthrower', 'melee', 'primitive', 'lightsaber', 'explosive', 'energy', 'vehicle'],
      }),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Calculer les dégâts avec les modifications
    this._calculateModifiedDamage()

    // Analyser les qualités pour l'automatisation
    this._parseQualities()
  }

  _calculateModifiedDamage() {
    let totalDamage = this.damage

    // Ajouter les bonus des modifications
    for (const mod of this.modifications.filter((m) => m.installed)) {
      const damageBonus = this._getModificationDamageBonus(mod)
      totalDamage += damageBonus
    }

    this.effectiveDamage = totalDamage
  }

  _parseQualities() {
    // Parser les qualités pour l'automatisation
    this.automatedQualities = this.qualities.filter((quality) => this._isQualityAutomatable(quality.name))
  }

  async performAttack(actor, target, options = {}) {
    // Méthode pour effectuer une attaque
    const skill = actor.system.skills[this.skill]
    const characteristic = actor.system.characteristics[this.characteristic]

    // Construire le pool de dés
    const pool = DicePoolBuilder.buildPool(characteristic, skill?.rank || 0, options.difficulty || 2)

    // Appliquer les modificateurs d'arme
    this._applyWeaponModifiers(pool, options)

    // Lancer les dés
    const roll = await pool.roll()
    const result = DiceResultResolver.resolve(roll)

    if (result.success) {
      // Calculer les dégâts
      const damage = await this._calculateDamage(actor, result)
      return { hit: true, damage: damage, result: result }
    }

    return { hit: false, result: result }
  }
}
```

### Modèle Armure

```javascript
class ArmorModel extends SwerpgItemModel {
  static defineSchema() {
    const fields = foundry.data.fields

    return {
      // Défense
      defense: new fields.SchemaField({
        melee: new fields.NumberField({ initial: 0, min: 0 }),
        ranged: new fields.NumberField({ initial: 0, min: 0 }),
      }),

      // Absorption
      soak: new fields.NumberField({ initial: 0, min: 0 }),

      // Encombrement
      encumbrance: new fields.NumberField({ initial: 1, min: 0 }),

      // Statut
      equipped: new fields.BooleanField({ initial: false }),

      // Prix et Rareté
      price: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0 }),
        currency: new fields.StringField({ initial: 'credits' }),
        restricted: new fields.BooleanField({ initial: false }),
      }),
      rarity: new fields.NumberField({ initial: 1, min: 1, max: 10 }),

      // Qualités spéciales
      qualities: new fields.ArrayField(new fields.StringField()),

      // Type d'armure
      category: new fields.StringField({
        initial: 'clothing',
        choices: ['clothing', 'padded', 'armored_clothing', 'laminate', 'battle', 'superior', 'powered'],
      }),

      // Modifications
      modifications: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField(),
          description: new fields.StringField(),
          installed: new fields.BooleanField({ initial: false }),
        }),
      ),
    }
  }

  prepareDerivedData() {
    super.prepareDerivedData()

    // Calculer les bonus avec modifications
    this._calculateModifiedDefense()
    this._calculateModifiedSoak()
  }

  _calculateModifiedDefense() {
    this.effectiveDefense = {
      melee: this.defense.melee,
      ranged: this.defense.ranged,
    }

    // Ajouter les bonus des modifications
    for (const mod of this.modifications.filter((m) => m.installed)) {
      const defenseBonus = this._getModificationDefenseBonus(mod)
      this.effectiveDefense.melee += defenseBonus.melee || 0
      this.effectiveDefense.ranged += defenseBonus.ranged || 0
    }
  }
}
```

## Migration des Données

### Système de Migration

```javascript
class SwerpgDataMigration {
  static migrations = new Map([
    ['1.0.0', this.migrateTo100],
    ['1.1.0', this.migrateTo110],
    ['1.2.0', this.migrateTo120],
  ])

  static async migrateToVersion(data, fromVersion, toVersion) {
    const sortedMigrations = Array.from(this.migrations.entries())
      .filter(([version]) => this.compareVersions(version, fromVersion) > 0)
      .filter(([version]) => this.compareVersions(version, toVersion) <= 0)
      .sort(([a], [b]) => this.compareVersions(a, b))

    let migratedData = foundry.utils.duplicate(data)

    for (const [version, migrationFn] of sortedMigrations) {
      try {
        migratedData = await migrationFn(migratedData)
        console.log(`Migration vers ${version} réussie`)
      } catch (error) {
        console.error(`Erreur lors de la migration vers ${version}:`, error)
        break
      }
    }

    return migratedData
  }

  static async migrateTo100(data) {
    // Migration vers 1.0.0 : Restructuration des compétences
    if (data.skills && Array.isArray(data.skills)) {
      const newSkills = {}
      for (const skill of data.skills) {
        newSkills[skill.name] = {
          rank: skill.rank || 0,
          career: skill.career || false,
          characteristic: skill.characteristic || 'brawn',
        }
      }
      data.skills = newSkills
    }

    return data
  }

  static async migrateTo110(data) {
    // Migration vers 1.1.0 : Ajout du système de Force
    if (!data.force) {
      data.force = {
        rating: 0,
        committed: 0,
        morality: 50,
        conflict: 0,
      }
    }

    return data
  }

  static async migrateTo120(data) {
    // Migration vers 1.2.0 : Restructuration des talents
    if (data.talents && Array.isArray(data.talents)) {
      const newTalents = {}
      for (const talent of data.talents) {
        newTalents[talent.identifier] = {
          id: talent.id,
          rank: talent.rank || 1,
          source: talent.source || 'manual',
        }
      }
      data.talents = newTalents
    }

    return data
  }
}
```

## Validation et Contraintes

### Validateurs Personnalisés

```javascript
class SwerpgFieldValidators {
  static skillRank(value) {
    return Number.isInteger(value) && value >= 0 && value <= 5
  }

  static characteristic(value) {
    return Number.isInteger(value) && value >= 1 && value <= 6
  }

  static obligationValue(value) {
    return Number.isInteger(value) && value >= 0 && value <= 100
  }

  static forceRating(value) {
    return Number.isInteger(value) && value >= 0 && value <= 6
  }

  static morality(value) {
    return Number.isInteger(value) && value >= 1 && value <= 100
  }
}

// Utilisation dans les schémas
new fields.NumberField({
  required: true,
  initial: 0,
  validate: SwerpgFieldValidators.skillRank,
  validationError: 'La valeur doit être entre 0 et 5',
})
```

## Performance et Optimisation

### Cache des Calculs

```javascript
class SwerpgDataCache {
  static cache = new Map()
  static maxSize = 1000

  static getCachedValue(key) {
    return this.cache.get(key)
  }

  static setCachedValue(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  static invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
```

## Conclusion

Les modèles de données de Star Wars Edge RPG fournissent une base solide et type-safe pour toutes les mécaniques du système. L'utilisation des `TypeDataModel` de Foundry v13 garantit la cohérence des données et facilite les migrations, tout en offrant des calculs automatiques et une validation robuste.

L'architecture modulaire permet l'extension facile pour de nouveaux types d'acteurs et d'objets, assurant l'évolutivité du système pour les contenus officiels et communautaires.
