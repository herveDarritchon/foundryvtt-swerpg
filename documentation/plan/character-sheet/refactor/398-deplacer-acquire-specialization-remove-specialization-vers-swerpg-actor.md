# Plan — Déplacer `acquireSpecialization` / `removeSpecialization` vers `SwerpgActor`

**Issue** : [#398 — Refactor: déplacer `acquireSpecialization`/`removeSpecialization` vers `SwerpgActor`](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/398)

## Décision de périmètre

- **À faire** : remonter les flux d'acquisition/suppression de spécialisation dans `module/documents/actor.mjs`, puis rebrancher les call sites applicatifs sur l'API document.
- **À ne pas faire** : ne pas déplacer `applySpecialization`, ne pas changer les règles métier de coût XP, de `freeSkillRank`, ni le format persisté de `system.details.specializations`.
- **Hypothèse retenue** : ces deux méthodes relèvent du document acteur car elles pilotent directement `actor.update(...)` et sont consommées par des applications qui manipulent déjà `actor`.

## Fichiers impactés

| Fichier                                                                  | Nature du changement                                                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `module/documents/actor.mjs`                                             | Ajouter `acquireSpecialization` et `removeSpecialization` sur `SwerpgActor` en conservant le comportement actuel |
| `module/models/character.mjs`                                            | Retirer ces méthodes de `SwerpgCharacter` sans toucher aux méthodes `apply*`                                     |
| `module/applications/sheets/character-sheet.mjs`                         | Appeler `actor.acquireSpecialization(...)` au lieu de `actor.system.acquireSpecialization(...)`                  |
| `module/applications/specialization-tree-app.mjs`                        | Appeler `actor.removeSpecialization(...)` au lieu de `actor.system.removeSpecialization(...)`                    |
| `tests/documents/actor-specializations.test.mjs`                         | Couvrir l'API document déplacée et ses payloads d'update                                                         |
| `tests/applications/sheets/character-sheet-specialization-drop.test.mjs` | Réaligner les mocks/attentes sur l'API `actor.acquireSpecialization(...)`                                        |
| `tests/applications/specialization-tree-app.test.mjs`                    | Réaligner les mocks/attentes sur l'API `actor.removeSpecialization(...)`                                         |

## Étapes

### 1. Déplacer la logique métier dans `SwerpgActor`

- Reprendre dans `SwerpgActor` la construction de la spécialisation acquise (`toObject()`, `name`, `img`, `freeSkillRank: 0`) et la mise à jour optionnelle de `system.progression.experience.spent`.
- Reprendre la suppression par clé métier (`specializationId || treeUuid || name`) en conservant `keepEmbeddedIds: true`.
- Faire reposer les deux méthodes sur `this.system.details.specializations` et `this.update(...)`, sans dépendre de `this.system.parent`.

### 2. Nettoyer `SwerpgCharacter` et rebrancher les consommateurs

- Supprimer `acquireSpecialization` et `removeSpecialization` de `SwerpgCharacter` pour éviter la duplication entre modèle de type et document.
- Mettre à jour la fiche personnage pour distinguer clairement `actor.system.applySpecialization(...)` (création) de `actor.acquireSpecialization(...)` (post-création).
- Mettre à jour `SpecializationTreeApp` pour appeler directement l'API document lors de la suppression.

### 3. Verrouiller la non-régression sur la nouvelle surface publique

- Déplacer ou recréer les tests de comportement dans `tests/documents/actor-specializations.test.mjs` pour valider acquisition, coût XP optionnel, suppression par `specializationId`, `treeUuid` ou `name`, et cas vide/inexistant.
- Adapter les tests applicatifs pour espionner `actor.acquireSpecialization` et `actor.removeSpecialization` au bon niveau.
- Conserver la preuve que le flux L0 continue d'utiliser `actor.system.applySpecialization(...)` afin de préserver l'attribution initiale de `freeSkillRank`.

## Points de vigilance

- Le déplacement ne doit pas casser les mocks de tests qui traitent aujourd'hui ces méthodes comme une API de `actor.system`.
- Le payload d'update doit rester strictement identique pour éviter toute régression de persistance Foundry.
- `applySpecialization` et les helpers `applySpecies/applyCareer` restent sur `SwerpgCharacter` : seul le flux post-création est remonté dans `SwerpgActor`.

## Résultat attendu

- `acquireSpecialization` et `removeSpecialization` vivent sur `SwerpgActor`, au plus près de `update(...)`.
- Les applications consomment une API cohérente côté document acteur pour les opérations post-création.
- Les tests couvrent explicitement la nouvelle surface publique sans changer le comportement métier des spécialisations.
