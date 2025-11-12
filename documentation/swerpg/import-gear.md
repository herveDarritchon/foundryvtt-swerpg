# Import Gear - Documentation Technique

## Vue d'ensemble

Le système d'import des **Gears** (équipements génériques) depuis les fichiers OggDude XML vers le système Swerpg de Foundry VTT.

## Architecture

Fichier principal : `module/importer/items/gear-ogg-dude.mjs`

Fonctions principales :

- `gearMapper(gears)` : Transforme XML gear vers objets Foundry
- `buildGearSystem(xmlGear)` : Construit l'objet system avec validation

## Schéma supporté

Champs SwerpgGear (hérite de SwerpgPhysicalItem) :

- `category` (String, requis, défaut: 'general')
- `quantity` (Number, requis, défaut: 1)
- `price` (Number, requis, défaut: 0)
- `quality` (String, requis, défaut: 'standard')
- `encumbrance` (Number, requis, défaut: 1)
- `rarity` (Number, requis, défaut: 1)
- `broken` (Boolean, défaut: false)
- `description.public` (HTML, défaut: '')
- `description.secret` (HTML, défaut: '')
- `actions` (Array, défaut: [])

Champs exclus du mapping : `sources`, `categories`, `mods`, `weaponModifiers`, `eraPricing`, `restricted`, `hp`

## Mapping des champs

| XML | System | Transformation |
|-----|--------|----------------|
| Name | name | Validation obligatoire |
| Key | flags.swerpg.oggdudeKey | Métadonnée |
| Type | category + flags.swerpg.originalType | Direct ou 'general' |
| Description | description.public | Nettoyage HTML |
| Price | price | Normalisation numérique |
| Encumbrance | encumbrance | Normalisation numérique |
| Rarity | rarity | Normalisation numérique |

## Validation et normalisation

Fonctions de validation :

- `normalizeGearNumericField()` : Valide les nombres, applique min/max, retourne défauts si invalide
- `validateGearBooleanField()` : Valide les booléens avec fallback
- `normalizeGearDescription()` : Nettoie le HTML
- `validateGearCategory()` : Valide catégorie avec défaut 'general'

## Gestion d'erreur

Stratégie de récupération :

- Champs obligatoires manquants → logs + valeurs par défaut
- Valeurs numériques invalides → normalisation + logs debug
- Erreurs critiques → fallback objet system minimal

Logging : `logger.debug` pour transformations, `logger.warn` pour données invalides importantes.

## Tests

- Tests unitaires : `tests/importer/gear-oggdude.spec.mjs` (9 tests)
- Tests intégration : `tests/importer/gear-import.integration.spec.mjs` (4 tests)
- Couverture : mapping complet, validation, performance, récupération d'erreur

## Métadonnées flags

```javascript
flags: {
  swerpg: {
    oggdudeKey: 'cleOriginaleDuGear',
    originalType: 'typeOriginalSiPresent'
  }
}
```

Permet traçabilité, réimport incrémental, debugging.
