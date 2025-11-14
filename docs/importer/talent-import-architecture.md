# Import de Talents OggDude - Documentation Technique

## Vue d'ensemble

Le système d'import de talents OggDude permet d'importer et de transformer les données de talents depuis les fichiers d'export OggDude Character Generator vers le système SwerpgTalent de Foundry VTT.

## Architecture

### Pattern Strategy + Template Method

L'architecture suit les mêmes patterns que les autres domaines d'import (armor, weapon, gear, species, career) :

```
OggDude.mjs (Orchestrateur)
├── buildTalentContext() (Context Builder)
│   └── talentMapper() (Individual Item Mapper)
│       └── OggDudeTalentMapper.transform() (Main Transformation)
│           ├── Activation Mapping
│           ├── Node Resolution  
│           ├── Prerequisite Transformation
│           ├── Rank Processing
│           └── Actions Creation
└── Global Import Metrics
```

### Modules Principaux

#### 1. Context Builder (`talent-ogg-dude.mjs`)
- **Rôle** : Adapter l'interface du mapper principal à l'architecture existante
- **Responsabilités** :
  - Construire le contexte d'import standard (jsonData, zip, image, folder, element)
  - Wrapper le mapper individuel pour compatibilité avec `OggDudeDataElement.processElements()`

#### 2. Mapper Principal (`oggdude-talent-mapper.mjs`)
- **Rôle** : Orchestrer la transformation complète des données talent
- **Pattern** : Template Method avec étapes de transformation définies
- **Responsabilités** :
  - Extraire les données talents depuis la structure OggDude
  - Construire le contexte de mapping pour chaque talent
  - Transformer le contexte en données SwerpgTalent
  - Valider la cohérence des données transformées

#### 3. Modules de Mapping Spécialisés

##### `oggdude-talent-activation-map.mjs`
- Mappe les codes d'activation OggDude vers `SYSTEM.TALENT_ACTIVATION`
- Gère les variations de casse et les activations inconnues
- Statistiques des activations non reconnues

##### `oggdude-talent-node-map.mjs`
- Résout les identifiants de nœuds OggDude vers les instances `SwerpgTalentNode`
- Pattern matching pour les nœuds communs
- Fallback gracieux pour les nœuds non trouvés

##### `oggdude-talent-prerequisite-map.mjs`
- Transforme les prérequis XML OggDude en structure système
- Mappe caractéristiques, compétences et talents requis
- Validation des prérequis transformés

##### `oggdude-talent-rank-map.mjs`
- Extrait tier, rang et coût depuis les données OggDude
- Détecte si un talent est classé (ranked)
- Calculs de coût avec validation des limites

##### `oggdude-talent-actions-map.mjs`
- Transforme les actions OggDude en instances `SwerpgAction`
- Crée des actions par défaut pour les talents sans actions
- Support pour l'extension future des actions complexes

#### 4. Utilitaires (`talent-import-utils.mjs`)
- Statistiques d'import spécifiques au domaine talent
- Fonctions de validation et de nettoyage des données
- Intégration avec le système de métriques globales

## Intégration avec l'Écosystème

### Métriques Globales
Le domaine talent est intégré dans `global-import-metrics.mjs` :
```javascript
// Statistiques agrégées incluent maintenant les talents
const globalStats = getAllImportStats()
console.log(globalStats.talent.processed) // Talents traités
```

### Registry Pattern
Enregistrement dans l'orchestrateur `OggDude.mjs` :
```javascript
buildContextMap.set('talent', { 
  type: 'talent', 
  contextBuilder: buildTalentContext 
})
```

### Compatibilité SwerpgTalent
Les données transformées respectent le schéma `SwerpgTalent` :
```javascript
{
  name: string,
  type: 'talent',
  system: {
    node: SwerpgTalentNode,
    activation: TALENT_ACTIVATION,
    isRanked: boolean,
    rank: { idx: number, cost: number },
    tier: number,
    description: string,
    requirements: object,
    actions: SwerpgAction[],
    actorHooks: object,
    importMeta: object
  }
}
```

## Flux de Données

### 1. Extraction
```
OggDude ZIP → buildTalentContext() → 
{
  jsonData: Talents.xml parsed,
  zip: archive content,
  image: talent images,
  folder: 'Swerpg - Talents',
  element: { mapper: talentMapper }
}
```

### 2. Mapping Individuel
```
OggDude Talent Data → OggDudeTalentMapper.buildSingleTalentContext() →
{
  key: unique identifier,
  name: talent name,
  activation: resolved activation,
  node: SwerpgTalentNode instance,
  prerequisites: transformed requirements,
  rank: { idx, cost },
  actions: SwerpgAction[]
}
```

### 3. Transformation Finale
```
Talent Context → OggDudeTalentMapper.transform() → 
SwerpgTalent Compatible Data → Foundry Item Creation
```

## Gestion d'Erreurs

### Stratégie de Fallback
- **Activations inconnues** → 'passive'
- **Nœuds non trouvés** → null (talent orphelin)
- **Prérequis invalides** → {} (aucun prérequis)
- **Actions manquantes** → action par défaut créée
- **Données corrompues** → élément ignoré, statistique d'échec

### Logging et Observabilité
Chaque module log ses opérations avec niveaux appropriés :
- `debug` : Transformations réussies
- `warn` : Données manquantes ou prérequis non trouvés
- `error` : Échecs de transformation bloquants

### Statistiques d'Import
Métriques détaillées pour le monitoring :
```javascript
{
  processed: 0,      // Talents traités
  created: 0,        // Talents créés avec succès
  failed: 0,         // Échecs de traitement
  validation_failed: 0,  // Échecs de validation
  transform_failed: 0,   // Échecs de transformation
  contextMaps: 0,        // Contextes construits
  duplicates: 0,         // Doublons détectés
  unknownActivations: 0, // Activations non reconnues
  unresolvedNodes: 0,    // Nœuds non résolus
  invalidPrerequisites: 0, // Prérequis invalides
  transformed: 0         // Transformations réussies
}
```

## Extension et Maintenance

### Ajout de Nouveaux Mappings
Pour ajouter un nouveau type de mapping :

1. Créer le module dans `module/importer/mappings/`
2. Exporter les fonctions de transformation
3. Importer et utiliser dans `oggdude-talent-mapper.mjs`
4. Ajouter les tests dans `tests/importer/`

### Modification du Schéma SwerpgTalent
Si le schéma `SwerpgTalent` évolue :

1. Mettre à jour `OggDudeTalentMapper.transform()`
2. Adapter les modules de mapping concernés  
3. Mettre à jour les tests de validation
4. Documenter les changements de rétrocompatibilité

### Performance et Optimisation
- Les mappings utilisent des `Map` pour les lookups O(1)
- Validation paresseuse des prérequis complexes
- Cache des nœuds résolus dans `SwerpgTalentNode.nodes`
- Streaming pour les gros volumes de talents

## Tests

### Coverage
- **Utilitaires** : `tests/importer/talent-utils.spec.mjs`
- **Mappings** : `tests/importer/talent-mappings.spec.mjs`  
- **Mapper Principal** : `tests/importer/talent-mapper.spec.mjs`
- **Intégration** : Tests d'import bout-en-bout (à créer)

### Stratégie de Test
- Tests unitaires pour chaque fonction de mapping
- Mocks des dépendances externes (SwerpgTalentNode, SYSTEM)
- Tests d'intégration avec données OggDude réelles
- Tests de performance pour gros datasets

## Sécurité

### Validation des Entrées
- Sanitisation des chaînes de caractères
- Validation des types de données
- Limites sur la longueur des descriptions
- Protection contre l'injection de code dans les noms

### Gestion des Ressources
- Limitation de la mémoire pour les gros imports
- Timeout sur les opérations de transformation
- Nettoyage des références temporaires
- Gestion des erreurs sans fuite mémoire