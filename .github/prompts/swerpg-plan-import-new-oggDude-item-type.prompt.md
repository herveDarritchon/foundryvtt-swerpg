---
name: 'swerpg-import-new-oggdude-item-type'
description: 'Plan d’implémentation pour l’ajout d’un nouveau type d’Item dans l’import OggDude'
---

Le type de nouvel item à importer est `${type}`.
Pour intégrer un nouveau type d'Item dans le système d'import OggDude, vous devez créer 4 fichiers principaux et
effectuer 3 modifications dans les fichiers existants, en suivant le pattern Registry établi.

Utiliser le fichier de données OggDude (`${file}`) comme source pour connaitre le format initial des données ou alors un
répertoire de données initiales (`${directory}`) si les données oggdude pour ce type de fichiers sont dans un
répertoire. Dans le cas du répertoire, il faudra utiliser tous les fichiers qui y sont contenus comme source de données.

Utiliser les données exemple pour en extrapoler le modèle de données du système. Faire valider le format avant de passer
à la suite du process.

## Étapes d'Implémentation

### 1. Créer le mapper et context builder

**Fichier**: `module/importer/items/newtype-ogg-dude.mjs`

Créer deux fonctions principales :

#### a. Mapper Function

```javascript
/**
 * Transforme un tableau de données XML OggDude en objets Item Foundry
 * @param {Array} items - Données XML brutes
 * @returns {Array} - Objets formatés pour création Item
 */
export function newTypeMapper(items) {
    resetNewTypeImportStats() // Réinitialise les métriques

    return items
        .map(xmlItem => {
            try {
                incrementNewTypeImportStat('total')

                // 1. Extraction des champs obligatoires
                const name = OggDudeImporter.mapMandatoryString('newtype.Name', xmlItem.Name)
                const key = OggDudeImporter.mapMandatoryString('newtype.Key', xmlItem.Key)

                // 2. Mapping des champs vers le schéma système
                const system = {
                    description: OggDudeImporter.mapOptionalString(xmlItem.Description),
                    // Ajouter les autres propriétés spécifiques au type
                }

                // 3. Construction de l'objet Item avec flags
                incrementNewTypeImportStat('imported')
                return {
                    name,
                    type: 'newtype',
                    system,
                    flags: {
                        swerpg: {
                            oggdudeKey: key,
                            // Autres métadonnées de traçabilité
                        }
                    }
                }
            } catch (error) {
                logger.error('[NewTypeMapper] Error mapping item', error)
                incrementNewTypeImportStat('rejected')
                return null
            }
        })
        .filter(item => item !== null)
}
```

#### b. Context Builder Function

```javascript
/**
 * Construit le contexte d'import pour le nouveau type
 * @param {JSZip} zip - Archive OggDude
 * @param {Array} groupByDirectory - Éléments groupés par répertoire
 * @param {Object} groupByType - Éléments groupés par type
 * @returns {Promise<Object>} - Contexte structuré
 */
export async function buildNewTypeContext(zip, groupByDirectory, groupByType) {
    return {
        // 1. Données JSON parsées depuis XML
        jsonData: await OggDudeDataElement.buildJsonDataFromFile(
            zip,
            groupByDirectory,
            'NewTypes.xml',           // Nom du fichier dans le ZIP
            'NewTypes.NewType'        // XPath JSON vers les données
        ),

        // 2. Métadonnées du ZIP
        zip: {
            elementFileName: 'NewTypes.xml',
            content: zip,
            directories: groupByDirectory
        },

        // 3. Configuration des images
        image: {
            criteria: 'Data/NewTypeImages',                     // Chemin dans ZIP
            worldPath: 'modules/swerpg/assets/images/newtypes/', // Destination
            systemPath: buildItemImgSystemPath('newtype.svg'),  // Fallback
            images: groupByType.image || [],
            prefix: 'NewType'                                   // Préfixe fichiers
        },

        // 4. Dossier Foundry de destination
        folder: {
            name: 'Swerpg - NewTypes',
            type: 'Item'
        },

        // 5. Configuration du mapping
        element: {
            jsonCriteria: 'NewTypes.NewType',
            mapper: newTypeMapper,
            type: 'newtype'
        }
    }
}
```

**Imports nécessaires:**

```javascript
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import {buildItemImgSystemPath} from '../../settings/directories.mjs'
import {logger} from '../../utils/logger.mjs'
import {
    resetNewTypeImportStats,
    incrementNewTypeImportStat,
    getNewTypeImportStats
} from '../utils/newtype-import-utils.mjs'
```

---

### 2. Créer les tables de mapping (si nécessaire)

**Fichier**: `module/importer/mapping/newtype-mapping.mjs`

Si le nouveau type nécessite des conversions de codes OggDude vers valeurs système :

```javascript
/**
 * Table de correspondance OggDude → Système
 */
export const NEWTYPE_PROPERTY_MAP = Object.freeze({
        'OGGDUDE_CODE_1': {
            systemValue: 'swerpg-value-1',
            description: 'Description de la correspondance'
        },
        'OGGDUDE_CODE_2': {
            systemValue: 'swerpg-value-2',
            description: 'Description de la correspondance'
        },
        // ...
    })

/**
 * Fonction de résolution avec fallback
 */
export function resolveNewTypeProperty(oggDudeCode) {
    const mapping = NEWTYPE_PROPERTY_MAP[oggDudeCode]
    if (!mapping) {
        logger.warn(`Unknown OggDude code: ${oggDudeCode}`)
        addUnknownPropertyStat(oggDudeCode) // Métriques
        return 'default-value'
    }
    return mapping.systemValue
}
```

---

### 3. Créer les utilitaires de statistiques

**Fichier**: `module/importer/utils/newtype-import-utils.mjs`

```javascript
import {logger} from '../../utils/logger.mjs'

// État local des statistiques
let stats = {
    total: 0,              // Total d'items traités
    imported: 0,           // Items importés avec succès
    rejected: 0,           // Items rejetés (validation échouée)
    unknownProperties: 0,  // Propriétés non reconnues
    propertyDetails: []    // Liste des propriétés inconnues
}

/**
 * Réinitialise les statistiques d'import
 */
export function resetNewTypeImportStats() {
    stats = {
        total: 0,
        imported: 0,
        rejected: 0,
        unknownProperties: 0,
        propertyDetails: []
    }
}

/**
 * Incrémente une statistique
 * @param {string} key - Clé de la statistique
 * @param {number} value - Valeur à ajouter (défaut: 1)
 */
export function incrementNewTypeImportStat(key, value = 1) {
    if (stats[key] !== undefined) {
        stats[key] += value
    }
}

/**
 * Ajoute une propriété inconnue aux statistiques
 * @param {string} property - Nom de la propriété inconnue
 */
export function addUnknownPropertyStat(property) {
    stats.unknownProperties++
    if (!stats.propertyDetails.includes(property)) {
        stats.propertyDetails.push(property)
    }
}

/**
 * Récupère les statistiques d'import
 * @returns {Object} - Copie des statistiques actuelles
 */
export function getNewTypeImportStats() {
    return {...stats}
}

/**
 * Enregistre les métriques pour l'agrégateur global
 * @returns {Object} - Configuration des métriques
 */
export function registerNewTypeMetrics() {
    return {
        domain: 'newtype',
        getStats: getNewTypeImportStats
    }
}
```

---

### 4. Enregistrer dans le Registry

**Fichier**: `module/importer/oggDude.mjs`

#### a. Ajouter l'import en haut du fichier

```javascript
import {buildNewTypeContext} from './items/newtype-ogg-dude.mjs'
```

#### b. Dans `processOggDudeData()` (ligne ~185)

Ajouter dans la Map :

```javascript
buildContextMap.set('newtype', {
    type: 'newtype',
    contextBuilder: buildNewTypeContext
})
```

#### c. Dans `preloadOggDudeData()` (ligne ~234)

Ajouter exactement la même ligne :

```javascript
buildContextMap.set('newtype', {
    type: 'newtype',
    contextBuilder: buildNewTypeContext
})
```

---

### 5. Activer dans l'UI

#### a. Fichier: `module/settings/OggDudeDataImporter.mjs`

**Ligne 29** - Ajouter le domaine au tableau :

```javascript
_domainNames = ['weapon', 'armor', 'gear', 'species', 'career', 'talent', 'newtype']
```

#### b. Fichiers de localisation

**`lang/fr.json`** - Ajouter la clé :

```json
"SETTINGS.OggDudeDataImporter.loadWindow.domains.newtype": "Nouveau Type"
```

**`lang/en.json`** - Ajouter la clé :

```json
"SETTINGS.OggDudeDataImporter.loadWindow.domains.newtype": "New Type"
```

---

### 6. Créer les tests

#### a. Tests unitaires du mapper

**Fichier**: `tests/importer/newtype-oggdude.spec.mjs`

```javascript
import {describe, it, expect, beforeEach} from 'vitest'
import {
    newTypeMapper,
    resetNewTypeImportStats,
    getNewTypeImportStats
} from '../../module/importer/items/newtype-ogg-dude.mjs'

describe('newTypeMapper', () => {
    beforeEach(() => {
        resetNewTypeImportStats()
    })

    it('should map basic newtype with all standard fields', () => {
        const xmlItems = [{
            Name: 'Test NewType',
            Key: 'testNewType',
            Description: 'A test newtype item',
            // Ajouter autres champs spécifiques
        }]

        const result = newTypeMapper(xmlItems)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            name: 'Test NewType',
            type: 'newtype',
            system: {
                description: 'A test newtype item'
            },
            flags: {
                swerpg: {
                    oggdudeKey: 'testNewType'
                }
            }
        })
    })

    it('should track statistics correctly', () => {
        const xmlItems = [
            {Name: 'Item1', Key: 'key1'},
            {Name: 'Item2', Key: 'key2'}
        ]

        newTypeMapper(xmlItems)
        const stats = getNewTypeImportStats()

        expect(stats.total).toBe(2)
        expect(stats.imported).toBe(2)
        expect(stats.rejected).toBe(0)
    })

    it('should handle missing mandatory fields gracefully', () => {
        const xmlItems = [
            {Description: 'Missing name and key'}
        ]

        const result = newTypeMapper(xmlItems)
        const stats = getNewTypeImportStats()

        expect(result).toHaveLength(0)
        expect(stats.rejected).toBe(1)
    })
})
```

#### b. Tests d'intégration

**Fichier**: `tests/importer/newtype-import.integration.spec.mjs`

```javascript
import {describe, it, expect} from 'vitest'
import fs from 'node:fs/promises'
import {parseXmlToJson} from '../../module/utils/xml/parser.mjs'
import {
    newTypeMapper,
    resetNewTypeImportStats,
    getNewTypeImportStats
} from '../../module/importer/items/newtype-ogg-dude.mjs'

describe('Intégration OggDude -> newTypeMapper', () => {
    it('NewTypes.xml - mapping de plusieurs items réels', async () => {
        // 1. Charger le fichier XML de test
        const xml = await fs.readFile('resources/integration/NewTypes.xml', 'utf8')
        const raw = await parseXmlToJson(xml)

        // 2. Extraire les données et mapper
        const newTypeNodes = raw.NewTypes.NewType
        const mapped = newTypeMapper(newTypeNodes.slice(0, 5))

        // 3. Assertions sur la structure
        expect(mapped[0].type).toBe('newtype')
        expect(mapped[0].system).toHaveProperty('description')
        // Ajouter assertions spécifiques au type

        // 4. Vérification des statistiques
        const stats = getNewTypeImportStats()
        expect(stats.total).toBe(5)
        expect(stats.imported).toBe(mapped.length)
    })
})
```

#### c. Tests des utilitaires

**Fichier**: `tests/importer/newtype-utils.spec.mjs`

```javascript
import {describe, it, expect, beforeEach} from 'vitest'
import {
    resetNewTypeImportStats,
    incrementNewTypeImportStat,
    addUnknownPropertyStat,
    getNewTypeImportStats,
    registerNewTypeMetrics
} from '../../module/importer/utils/newtype-import-utils.mjs'

describe('newtype-import-utils', () => {
    beforeEach(() => {
        resetNewTypeImportStats()
    })

    it('should initialize stats correctly', () => {
        const stats = getNewTypeImportStats()
        expect(stats).toEqual({
            total: 0,
            imported: 0,
            rejected: 0,
            unknownProperties: 0,
            propertyDetails: []
        })
    })

    it('should increment stats correctly', () => {
        incrementNewTypeImportStat('total')
        incrementNewTypeImportStat('imported', 5)

        const stats = getNewTypeImportStats()
        expect(stats.total).toBe(1)
        expect(stats.imported).toBe(5)
    })

    it('should track unknown properties', () => {
        addUnknownPropertyStat('unknownProp1')
        addUnknownPropertyStat('unknownProp2')
        addUnknownPropertyStat('unknownProp1') // Duplicate

        const stats = getNewTypeImportStats()
        expect(stats.unknownProperties).toBe(3)
        expect(stats.propertyDetails).toEqual(['unknownProp1', 'unknownProp2'])
    })

    it('should register metrics correctly', () => {
        const metrics = registerNewTypeMetrics()
        expect(metrics.domain).toBe('newtype')
        expect(typeof metrics.getStats).toBe('function')
    })
})
```

#### d. Fixture XML

**Fichier**: `resources/integration/NewTypes.xml`

Créer un fichier XML de test avec des données réelles issues d'OggDude.

---

## Considérations Importantes

### Questions à clarifier avant l'implémentation

1. **Structure du fichier XML OggDude**
    - Quel est le nom exact du fichier dans le ZIP ? (ex: `NewTypes.xml`)
    - Quel est le chemin JSON vers les données ? (ex: `NewTypes.NewType`)
    - Quelle est la structure XML des éléments ?

2. **Schéma de données Foundry**
    - Le type d'Item existe-t-il déjà dans le système ?
    - Faut-il créer un nouveau `TypeDataModel` dans `module/models/` ?
    - Quelles sont les propriétés système obligatoires et optionnelles ?

3. **Propriétés complexes**
    - Y a-t-il des champs nécessitant des mappings spécifiques (skills, qualities, modifiers) ?
    - Des tables de mapping dédiées sont-elles nécessaires ?
    - Y a-t-il des relations avec d'autres types d'items ?

### Bonnes pratiques

1. **Validation stricte**
    - Utiliser `mapMandatoryString/Number/Boolean` pour les champs obligatoires
    - Toujours prévoir des valeurs par défaut avec `mapOptional*`

2. **Gestion d'erreurs**
    - Logger avec le bon niveau : `info` pour succès, `warn` pour données manquantes, `error` pour échecs bloquants
    - Incrémenter les statistiques appropriées (total, imported, rejected)
    - Filtrer les `null` en fin de mapper

3. **Performance**
    - Pour les gros volumes (>1000 items), envisager le streaming
    - Cacher les résolutions de mapping fréquentes
    - Lazy loading des images

4. **Sécurité**
    - Valider les chemins de fichiers pour éviter les attaques de traversée
    - Sanitiser les entrées HTML si nécessaire
    - Toujours vérifier les types avant manipulation

5. **Documentation**
    - Créer `documentation/importer/import-newtype.md`
    - Mettre à jour `documentation/importer/README.md`
    - Ajouter le type dans la matrice de statut d'implémentation

---

## Checklist Finale

### Fichiers à créer

- [ ] `module/importer/items/newtype-ogg-dude.mjs`
- [ ] `module/importer/mapping/newtype-mapping.mjs` (si nécessaire)
- [ ] `module/importer/utils/newtype-import-utils.mjs`
- [ ] `tests/importer/newtype-oggdude.spec.mjs`
- [ ] `tests/importer/newtype-import.integration.spec.mjs`
- [ ] `tests/importer/newtype-utils.spec.mjs`
- [ ] `resources/integration/NewTypes.xml`
- [ ] `documentation/importer/import-newtype.md`

### Modifications à effectuer

- [ ] `module/importer/oggDude.mjs` - Ajouter import et enregistrement (2 endroits)
- [ ] `module/settings/OggDudeDataImporter.mjs` - Ajouter au tableau `_domainNames`
- [ ] `lang/fr.json` - Ajouter clé de localisation
- [ ] `lang/en.json` - Ajouter clé de localisation
- [ ] `documentation/importer/README.md` - Mettre à jour la documentation

### Validation

- [ ] Tests unitaires passent (`pnpm test`)
- [ ] Tests d'intégration passent
- [ ] Import fonctionnel dans Foundry VTT
- [ ] Statistiques correctement trackées
- [ ] Documentation complète et à jour
