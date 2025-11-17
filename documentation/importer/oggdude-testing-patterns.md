# Patterns de tests pour futurs mappers OggDude

Ce guide décrit les patterns Vitest utilisés pour garantir la robustesse des futurs mappers (ex: talents, force powers).

## 1. Structure des fichiers

- `tests/integration/<type>-import.integration.spec.mjs` : parsing + mapping réel sur extrait XML.
- `tests/unit/<type>-utils.spec.mjs` : statistiques, normalisation, fonctions pures.
- `tests/unit/<type>-mapper-edge.spec.mjs` : cas limites (valeurs manquantes, attributs inconnus).

## 2. Données de test minimales

Utiliser un fragment XML minimal couvrant :

```xml
<Root>
  <Element>
    <Name>Sample</Name>
    <Key>SAMPLE_KEY</Key>
  </Element>
</Root>
```

## 3. Assertions recommandées

| Contexte               | Assertion                                      | Raison                    |
| ---------------------- | ---------------------------------------------- | ------------------------- |
| Mapping principal      | `expect(item.system).toMatchObject({...})`     | Vérifie intégrité schéma  |
| Statistiques           | `expect(get<Type>ImportStats().total).toBe(n)` | Observabilité             |
| Performance (gros XML) | durée < seuil (ex 4000ms)                      | Régression parsing        |
| Sécurité               | Rejet de nom invalide (".." etc.)              | Protection path traversal |
| Localisation           | `game.i18n.localize(key)` ≠ key                | Clé existante             |

## 4. Techniques de simulation

- Stub `globalThis.xml2js` pour tests unitaires parseurs.
- Fake JSZip : objet `{ files: { 'Data/File.xml': { name, async: () => contenu }}}`.
- Monkey patch logger (optionnel) pour réduire bruit en CI.

## 5. Anti-patterns à éviter

- Tests dépendants de l'ordre des éléments XML.
- Assertions sur la taille exacte de gros fichiers (fragile) — préférer >=.
- Mocks profonds du mapper entraînant divergence vs implémentation réelle.

## 6. Couverture minimale cible

| Domaine | Intégration | Unitaire          | Performance | Sécurité |
| ------- | ----------- | ----------------- | ----------- | -------- |
| Weapon  | ✅          | ✅                | ✅          | ✅       |
| Armor   | ✅          | (stats partagées) | ✅          | ✅       |
| Gear    | ✅          | ✅                | ✅          | ✅       |
| Species | ✅          | ✅                | (N/A)       | ✅       |
| Career  | ✅          | ✅                | (N/A)       | ✅       |

## 7. Extension future

Ajouter tests snapshot (optionnels) pour vérifier consistance schéma Items complexes.

## 8. Exemple base intégration

```javascript
import { describe, it, expect } from 'vitest'
import { buildWeaponContext } from './weapon-ogg-dude.mjs'

it('importe un weapon minimal', async () => {
  const zip = buildFakeZip({ 'Data/Weapons.xml': '<Weapons><Weapon><Name>X</Name></Weapon></Weapons>' })
  const allElements = OggDudeDataElement.from(zip)
  const byDir = OggDudeDataElement.groupByDirectory(allElements)
  const byType = OggDudeDataElement.groupByType(allElements)
  const ctx = await buildWeaponContext(zip, byDir, byType)
  expect(ctx.jsonData.Name).toBe('X')
})
```

## 9. Mise à jour continue

Tout nouveau mapper doit ajouter sa ligne dans la table couverture et fournir au moins un test échec / inconnu (ex: skill non résolu) pour valider voies d'erreur.
