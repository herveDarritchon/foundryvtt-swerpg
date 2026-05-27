# Plan — Supprimer les stubs FIXME `thresholds.strain/wounds` dans `SwerpgCharacter`

**Issue** : [#394 — Refactor: supprimer stubs FIXME thresholds.strain/wounds dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/394)

## Décision de périmètre

- **À faire** : supprimer le transport intermédiaire des bonus de seuil via `this.thresholds.wounds` / `this.thresholds.strain` lorsqu'ils ne servent qu'à recopier les modificateurs de l'espèce.
- **À ne pas faire** : ne pas renommer dans cette issue la sémantique publique des ressources (`resources.wounds.threshold`, `resources.strain.threshold`) ni lancer une refonte plus large du naming `thresholds`.
- **Hypothèse retenue** : le calcul métier reste `caractéristique + modificateur d'espèce`; seule la couche de stub runtime disparaît.

## Fichiers impactés

| Fichier                                      | Nature du changement                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `module/models/actor-type.mjs`               | Remplacer la dépendance à `actor.thresholds.*` par un point d'accès explicite aux bonus |
| `module/models/character.mjs`                | Calculer les bonus depuis l'espèce et retirer le stub `thresholds.*`                    |
| `tests/models/character-thresholds.test.mjs` | Verrouiller le calcul des seuils sans champ intermédiaire                               |

## Étapes

### 1. Introduire un point d'extension explicite pour les bonus de seuil

- Refactorer `SwerpgActorType` pour que le calcul de `wounds.threshold` et `strain.threshold` lise des helpers dédiés (`_getWoundThresholdBonus()`, `_getStrainThresholdBonus()` ou équivalent) au lieu de dépendre directement de `actor.thresholds`.
- Garder un défaut neutre (`0`) pour les sous-types qui n'ont pas de bonus spécifique.

### 2. Brancher `SwerpgCharacter` directement sur les modificateurs d'espèce

- Lire `this.details.species?.woundThreshold?.modifier` et `this.details.species?.strainThreshold?.modifier` dans le nouveau point d'extension.
- Supprimer `schema.thresholds` et les affectations dans `#prepareSpecies()` si plus aucun consommateur ne lit `this.thresholds`.

### 3. Couvrir le contrat métier par des tests ciblés

- Ajouter un test qui vérifie : `wounds.threshold = brawn + species.woundThreshold.modifier`.
- Ajouter un test qui vérifie : `strain.threshold = willpower + species.strainThreshold.modifier`.
- Ajouter une non-régression avec espèce absente pour confirmer le fallback à `0` côté bonus.

## Points de vigilance

- `#calculateWoundThreshold` et `#calculateStrainThreshold` sont privés statiques aujourd'hui : la refactor doit éviter de dupliquer le calcul entre classe mère et sous-classe.
- Le retrait de `schema.thresholds` change la forme du data model : confirmer qu'aucun consommateur hors modèle ne lit encore `system.thresholds.wounds` / `system.thresholds.strain`.
- Ne pas toucher dans cette issue à la règle existante `resources.*.max = Math.ceil(1.5 * resources.*.threshold)`.

## Résultat attendu

- `SwerpgCharacter` ne maintient plus de stub runtime `thresholds.wounds` / `thresholds.strain`.
- Le calcul utilisateur des seuils reste inchangé.
- Le bonus de seuil provient directement de l'espèce via un contrat explicite et testé.
