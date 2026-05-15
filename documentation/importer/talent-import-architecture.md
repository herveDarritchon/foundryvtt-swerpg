# Import de Talents OggDude — Documentation Technique

## Note d'architecture (ADR-0014)

Depuis [ADR-0014](../architecture/adr/adr-0014-talents-standalone-arbres-v1-et-source-de-verite-progression.md), le système SWERPG considère :

- **`Talent.xml`** : simple définition générique du talent. Aucune arborescence, progression, coût ou connexion de nœud — ces données relèvent strictement des arbres `specialization-tree`.
- **L'arborescence V1** : canonique uniquement portée par les Items de type `specialization-tree`.
- **La progression acquise d'un acteur** : source de vérité unique `actor.system.progression.talentPurchases`.
- **Les champs `system.trees`, `system.node`, `system.row` sur `Item.talent`** : considérés **legacy** et non canoniques V1 (à proscrire dans toute logique actuelle ou future).

Ce document décrit le pipeline d'import OggDude pour les talents, en conformité avec cette architecture.

---

## Vue d'ensemble

L'import `Talent.xml` OggDude produit un **référentiel de définitions génériques de talents** — des `Item` `talent` exploitables par les arbres `specialization-tree` et la vue consolidée onglet Talents, sans stocker de coût XP, de position d'arbre, d'état acheté ou de mécanique d'acteur.

Le pipeline :

1. Extrait les données talents depuis `Talent.xml` (ZIP OggDude)
2. Construit un **contexte de mapping** pour chaque talent (activation, classement, description, modificateurs, source)
3. **Transforme** ce contexte en une définition générique de talent (contrat minimal `system.*`)
4. Enregistre les données brutes et de diagnostic dans `flags.swerpg.import`
5. Ne persiste **aucun** champ d'arborescence ou de progression dans `system.*`

---

## Architecture

### Pattern Strategy + Template Method

L'architecture suit les mêmes patterns que les autres domaines d'import (armor, weapon, gear, species, career) :

```
OggDude.mjs (Orchestrateur)
├── buildTalentContext() (Context Builder)
│   └── OggDudeTalentMapper.buildContextMap() (Strategy)
│       └── buildSingleTalentContext()
│           ├── Activation Mapping
│           ├── Prerequisite Transformation
│           ├── Rank Processing
│           ├── DieModifiers Extraction
│           └── Description Assembly
└── OggDudeTalentMapper.transform() (Template Method)
    └── Production du contrat générique
```

### Modules Principaux

#### 1. Context Builder (`talent-ogg-dude.mjs`)

- **Rôle** : Adapter l'interface du mapper principal à l'architecture d'import existante
- **Responsabilités** :
  - Construire le contexte d'import standard (jsonData, zip, image, folder, element)
  - Wrapper le mapper individuel pour compatibilité avec `OggDudeDataElement.processElements()`

#### 2. Mapper Principal (`oggdude-talent-mapper.mjs`)

- **Rôle** : Orchestrer la transformation complète des données talent
- **Pattern** : Template Method avec étapes de transformation définies
- **Responsabilités** :
  - Extraire les données talents depuis la structure OggDude
  - Construire le contexte de mapping pour chaque talent
  - Transformer le contexte en définition générique `Item` `talent`
  - Valider la cohérence des données transformées

#### 3. Modules de Mapping Spécialisés

##### `oggdude-talent-activation-map.mjs`

- Mappe les codes d'activation OggDude vers `SYSTEM.TALENT_ACTIVATION`
- Gère les variations de casse et les activations inconnues → valeur `unspecified`
- Statistiques des activations non reconnues

##### `oggdude-talent-prerequisite-map.mjs`

- Transforme les prérequis XML OggDude (caractéristiques, compétences) en structure système
- Validation des prérequis transformés
- Stockage dans `flags.swerpg.import.prerequisites` à titre diagnostique uniquement

##### `oggdude-talent-rank-map.mjs`

- Extrait `isRanked`, `tier` et `rank` depuis les données OggDude
- Détecte si un talent est classé (ranked)
- **Ne persiste pas de coût XP** sur la définition générique — le coût relève exclusivement de `specialization-tree.system.nodes[].cost`

##### `oggdude-talent-diemodifiers-map.mjs`

- Extrait les `DieModifiers` OggDude pour enrichir la description et les flags d'import
- Ne produit pas d'effet mécanique automatisé — les DieModifiers restent descriptifs

#### 4. Utilitaires (`talent-import-utils.mjs`)

- Statistiques d'import spécifiques au domaine talent
- Fonctions de validation et de nettoyage des données
- Intégration avec le système de métriques globales

---

## Contrat de transformation

Le mapper `OggDudeTalentMapper.transform()` produit des données conformes à ce contrat :

```javascript
{
  name: string,           // Nom du talent
  type: 'talent',         // Type d'Item
  system: {
    id: string,           // Identifiant unique du talent
    activation: string,   // Activation résolue (ou 'unspecified')
    isRanked: boolean,    // Le talent est-il classé ?
    description: string,  // Description enrichie (source, die modifiers)
  },
  flags: {
    swerpg: {
      oggdudeKey: string,           // Clé OggDude source
      import: {
        status: string,             // 'valid' ou 'incomplete'
        warnings: string[],         // Avertissements (ex: activation inconnue)
        source: string,             // Source éditeur
        sourceText: string,         // Texte source formaté
        dieModifiers: object[],     // Modificateurs de dés (descriptif)
        prerequisites: object,      // Prérequis (diagnostic)
        tier: number,               // Tier OggDude (diagnostic)
        raw: {                      // Données brutes OggDude
          key: string,
          activation: string|undefined,
          source: string|undefined,
        },
        importedAt: string,         // Timestamp ISO d'import
      },
    },
  },
}
```

⚠️ **Attention** : ce contrat **n'inclut pas** les champs suivants, qui sont legacy :

| Champ legacy | Statut |
|---|---|
| `system.node` | Legacy — ne pas utiliser pour V1 |
| `system.trees` | Legacy — ne pas utiliser pour V1 |
| `system.row` | Legacy — ne pas utiliser pour V1 |
| `system.rank.cost` | Non persistant — le coût XP relève de `specialization-tree` |
| `system.actions` | Legacy — les actions ne sont pas importées depuis `Talent.xml` |
| `system.actorHooks` | Legacy — non supporté dans le flux d'import V1 |

---

## Flux de données

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

### 2. Contexte individuel

```
OggDude Talent Data → OggDudeTalentMapper.buildSingleTalentContext() →
{
  key: string,                    // Identifiant unique
  name: string,                   // Nom du talent
  activation: string,             // Activation résolue
  isRanked: boolean,              // Classé ou non
  description: string,            // Description nettoyée
  sourceText: string,             // Texte source
  dieModifiers: object[],         // Modificateurs de dés
  prerequisites: object,          // Prérequis transformés
  // Champs diagnostiques suivants (calculés mais non persistés dans system.*) :
  node: SwerpgTalentNode|null,    // Résolution de nœud legacy (diagnostic)
  tier: number,                   // Tier OggDude
  rank: { idx, cost },            // Rang et coût OggDude
}
```

### 3. Transformation finale

```
Talent Context → OggDudeTalentMapper.transform() →
Item talent générique (contrat system.* minimal + flags.swerpg.import)
```

---

## Gestion d'Erreurs

### Stratégie de Fallback

- **Activations inconnues** → `unspecified` (avec warning)
- **Prérequis invalides** → `{}` (aucun prérequis)
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
  processed: 0,               // Talents traités
  created: 0,                 // Talents créés avec succès
  failed: 0,                  // Échecs de traitement
  validation_failed: 0,       // Échecs de validation
  transform_failed: 0,        // Échecs de transformation
  contextMaps: 0,             // Contextes construits
  duplicates: 0,              // Doublons détectés
  unknownActivations: 0,      // Activations non reconnues
  invalidPrerequisites: 0,    // Prérequis invalides
  transformed: 0,             // Transformations réussies
}
```

---

## Extension et Maintenance

### Ajout de Nouveaux Mappings

Pour ajouter un nouveau type de mapping :

1. Créer le module dans `module/importer/mappings/`
2. Exporter les fonctions de transformation
3. Importer et utiliser dans `oggdude-talent-mapper.mjs`
4. Ajouter les tests dans `tests/importer/`

### Modification du Contrat de Transformation

Si le schéma `Item.talent` générique évolue :

1. Mettre à jour `OggDudeTalentMapper.transform()`
2. Adapter les modules de mapping concernés
3. Mettre à jour les tests de validation
4. Documenter les changements de rétrocompatibilité

### Performance et Optimisation

- Les mappings utilisent des `Map` pour les lookups O(1)
- Validation paresseuse des prérequis complexes
- Streaming pour les gros volumes de talents

---

## Tests

### Coverage

- **Utilitaires** : `tests/importer/talent-utils.spec.mjs`
- **Mappings** : `tests/importer/talent-mappings.spec.mjs`
- **Mapper Principal** : `tests/importer/talent-mapper.spec.mjs`
- **Intégration** : `tests/importer/talent-import-real-test.spec.mjs`

### Stratégie de Test

- Tests unitaires pour chaque fonction de mapping
- Mocks des dépendances externes
- Vérification du contrat générique : pas de `system.node`, `system.row`, `system.trees` dans le résultat
- Tests d'intégration avec données OggDude réelles

---

## Sécurité

### Validation des Entrées

- Sanitisation des chaînes de caractères
- Validation des types de données
- Limites sur la longueur des descriptions (2000 caractères)
- Protection contre l'injection de code dans les noms

### Gestion des Ressources

- Limitation de la mémoire pour les gros imports
- Timeout sur les opérations de transformation
- Nettoyage des références temporaires
- Gestion des erreurs sans fuite mémoire
