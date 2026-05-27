# Plan — Corriger l'initialisation du `SetField details.specializations` dans `SwerpgCharacter`

**Issue** : [#396 — Refactor: corriger l'initialisation du SetField details.specializations dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/396)

## Décision de périmètre

- **À faire** : conserver `details.specializations` en `SetField`, corriger son contrat d'initialisation, puis simplifier les usages runtime devenus inutilement défensifs dans `character.mjs`.
- **À ne pas faire** : ne pas remplacer le champ par un `ArrayField`, ne pas refondre la persistance des spécialisations, ne pas étendre la refactor aux autres collections du modèle.
- **Hypothèse retenue** : Foundry sérialise correctement un `SetField` en tableau côté document, donc `initial: []` est la forme attendue pour l'initialisation canonique.

## Fichiers impactés

| Fichier                                           | Nature du changement                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | --- | ------------------------------------------------- |
| `module/models/character.mjs`                     | Corriger les options du `SetField` et retirer les `Array.from(...               |     | [])`devenus inutiles sur`details.specializations` |
| `tests/models/character-specializations.test.mjs` | Verrouiller le contrat de schéma et la disponibilité d'un `Set` vide par défaut |

## Étapes

### 1. Stabiliser le contrat du champ `details.specializations`

- Sur le `SetField` externe, définir explicitement `{ required: true, nullable: false, initial: [] }`.
- Sur le `SchemaField` interne, retirer `nullable: true, initial: null` si ces options ne servent qu'à tolérer un état impossible pour une entrée d'un `Set`.
- Conserver inchangée la structure métier des spécialisations (`specializationId`, `treeUuid`, `name`, `img`, `freeSkillRank`, `specializationSkills`, etc.).

### 2. Simplifier les accès runtime dans `SwerpgCharacter`

- Remplacer les usages `Array.from(this.details.specializations || [])` par `Array.from(this.details.specializations)` dans `#getFreeSkillStatus`, `#prepareSpecializations`, `acquireSpecialization` et `removeSpecialization`.
- Ne retirer que la garde devenue inutile sur la collection racine `specializations` ; ne pas élargir la refactor aux gardes sur des sous-champs qui peuvent encore être absents dans les données métier.
- Préserver le format de persistance actuel des updates (`'system.details.specializations': [...]`).

### 3. Adapter les tests de contrat et de non-régression

- Étendre le test de schéma pour vérifier que `details.specializations` reste un `SetField` avec `initial: []` et `nullable: false`.
- Ajouter une non-régression qui construit un `SwerpgCharacter` sans `details.specializations` explicite et confirme que la préparation lit un `Set` vide sans fallback `|| []`.
- Conserver les tests d'acquisition/suppression qui valident que les payloads d'update restent des tableaux d'objets sérialisables.

## Points de vigilance

- `SetField` reste le contrat du data model ; la simplification ne doit pas casser les composants UI Foundry qui s'appuient sur ce type.
- La correction ne doit pas introduire de migration de données : la forme persistée attendue reste une collection d'objets de spécialisation.
- Si un test applicatif de fiche repose sur `details.specializations` absent ou `null`, l'ajuster pour refléter le nouveau contrat canonique : collection toujours présente, éventuellement vide.

## Résultat attendu

- `details.specializations` est toujours initialisé comme un `Set` non nul.
- `character.mjs` ne contient plus de `Array.from(this.details.specializations || [])`.
- Les flux de spécialisation côté modèle conservent le même comportement fonctionnel et le même format de persistance.
