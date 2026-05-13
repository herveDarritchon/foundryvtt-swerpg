# Validation manuelle — Import OggDude des arbres de spécialisation

## Prérequis

- Instance Foundry VTT avec le système `swerpg` chargé
- ZIP OggDude contenant au minimum :
  - `Data/Specializations/Advisor.xml` (arbre de spécialisation)
  - `Data/Talents.xml` (définitions des talents)
  - `Data/Careers.xml` (carrières liées aux spécialisations)
- Module OggDude Data Importer activé

## Étapes

### 1. Lancer l'import OggDude

1. Ouvrir Foundry et charger un monde (GM)
2. Ouvrir la Configuration du système → onglet "OggDude"
3. Cliquer "Choose File" et sélectionner le ZIP de test
4. Cliquer "Import"

### 2. Vérifier la console (logs debug/warn)

1. Ouvrir les DevTools (F12) → console
2. Vérifier la présence de logs :
   - `[SpecializationTreeImporter] Format détecté` avec `format: 'talent-rows-keys'` et `specializationId: 'advisor'`
   - `[SpecializationTreeImporter] Résumé du mapping` avec `rawNodeCount: 20`, `importedNodeCount: 20`
   - Absence de `[SpecializationTreeImporter] Format non reconnu`
   - Absence de `directional-target-missing` pour Advisor

### 3. Vérifier le compendium créé

1. Dans le sidebar, ouvrir l'onglet "Items"
2. Localiser le dossier/compendium "Swerpg - Specialization Trees"
3. Vérifier la présence de l'item "Advisor"

### 4. Vérifier les propriétés de l'item Advisor

1. Ouvrir la fiche de l'item "Advisor"
2. Vérifier que `system.specializationId` = `'advisor'`
3. Vérifier `system.nodes` :
   - Nombre de nœuds = 20
   - Présence de `r1c1` à `r5c4`
   - `talentId` normalisés : `plausden`, `knowsom`, `grit`, `kill`, etc.
   - Coûts : ligne 1 = 5, ligne 2 = 10, ligne 3 = 15, ligne 4 = 20, ligne 5 = 25
4. Vérifier `system.connections` :
   - Nombre de connexions > 0 (attendu : 20)
   - Présence de connexions horizontales (Right) et verticales (Down)
   - Pas de doublons détectables visuellement
5. Vérifier les flags :
   - `flags.swerpg.oggdudeKey` = `'ADVISOR'`
   - `flags.swerpg.import.rawNodeCount` = 20
   - `flags.swerpg.import.importedNodeCount` = 20
   - `flags.swerpg.import.importedConnectionCount` = 20

### 5. Vérifier que les talents sont liés

1. Ouvrir l'onglet "Items" et localiser les talents importés
2. Vérifier que des talents comme `plausden`, `knowsom`, `grit`, `kill` existent
3. Vérifier que les coûts dans l'arbre correspondent aux rangs des talents

### 6. Vérifier la non-régression des autres imports

1. Vérifier que les carrières importées sont toujours présentes et non vides
2. Vérifier que les species importées sont toujours présentes et non vides
3. Vérifier que les armes/armures/équipement importés sont toujours présents
4. Vérifier que les compteurs globaux d'import sont cohérents

## Critères de succès

- [ ] `system.nodes.length > 0` et `system.connections.length > 0`
- [ ] `rawNodeCount === importedNodeCount` (20)
- [ ] `talentId` normalisés et correspondant aux talents importés
- [ ] Aucun warning `Format non reconnu` ni `directional-target-missing` pour Advisor
- [ ] Aucune régression visible sur les autres types d'items
- [ ] Les logs de diagnostic sont présents en console
