# Plan — Clarifier la sémantique des seuils `wounds/strain` dans `SwerpgCharacter`

**Issue** : [#400 — Refactor: clarifier sémantique thresholds.wounds/strain dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/400)

## Décision de périmètre

- **À faire** : rendre explicite, dans le code et les tests, la différence entre le **bonus additif** fourni par l'espèce et le **seuil final** exposé dans `resources.wounds.threshold` / `resources.strain.threshold`.
- **À ne pas faire** : ne pas renommer dans cette issue les champs persistés `details.species.woundThreshold` / `details.species.strainThreshold`, ne pas introduire de migration de données, ne pas modifier la règle métier de calcul des seuils.
- **Hypothèse retenue** : depuis le retrait du stub runtime `thresholds.wounds/strain`, le besoin restant est un nettoyage sémantique ciblé, pas une refonte du schéma.

## Fichiers impactés

| Fichier | Nature du changement |
| --- | --- |
| `module/models/actor-type.mjs` | Clarifier le contrat entre helpers de bonus et calcul des seuils finaux |
| `module/models/character.mjs` | Documenter la provenance du bonus d'espèce et la sémantique locale côté Character |
| `tests/models/character-thresholds.test.mjs` | Aligner les libellés et assertions sur le contrat « bonus additif » vs « seuil final » |

## Étapes

### 1. Normaliser le vocabulaire autour du calcul des seuils

- Vérifier dans `actor-type.mjs` et `character.mjs` qu'aucun nom local, commentaire ou JSDoc ne laisse entendre qu'un bonus additif serait lui-même un seuil absolu.
- Employer systématiquement le vocabulaire `bonus` pour `_getWoundThresholdBonus()` / `_getStrainThresholdBonus()` et `threshold` pour la valeur finale écrite dans `resources.*.threshold`.
- Ne conserver `threshold` que pour les ressources calculées ou pour la formule métier portée par l'espèce.

### 2. Documenter explicitement la sémantique côté `SwerpgCharacter`

- Ajouter une note claire près des hooks `_getWoundThresholdBonus()` / `_getStrainThresholdBonus()` indiquant que `details.species.*Threshold.modifier` représente la partie additive de la formule d'espèce, pas le seuil final du personnage.
- Si nécessaire, clarifier en commentaire dans `#prepareSpecies()` ou `_prepareResources()` que le modèle Character ne stocke plus de champ intermédiaire `thresholds.wounds/strain`.
- Garder inchangée l'API runtime observable : `resources.wounds.threshold` et `resources.strain.threshold` restent les valeurs absolues consommées par le reste du système.

### 3. Verrouiller le contrat sémantique dans les tests

- Renommer les blocs de tests et messages d'intention pour distinguer explicitement les **bonus d'espèce** des **seuils calculés**.
- Ajouter ou ajuster une non-régression montrant que le bonus lu depuis l'espèce alimente bien le calcul, tandis que `resources.*.threshold` reste la sortie finale absolue.
- Confirmer qu'aucun test ne repose encore sur l'ancien vocabulaire `thresholds.wounds/strain` comme donnée intermédiaire du modèle Character.

## Points de vigilance

- Ne pas transformer cette issue en migration de schéma : le renommage des champs persistés de l'espèce serait plus large et hors périmètre.
- Ne pas casser la distinction entre la formule d'espèce (`modifier` + `abilityKey`) et la donnée calculée de l'acteur (`resources.*.threshold`).
- Ne pas toucher à la règle existante `resources.*.max = Math.ceil(1.5 * resources.*.threshold)`.

## Résultat attendu

- La sémantique `bonus additif` vs `seuil final` est explicite et non ambiguë dans `SwerpgCharacter` et `SwerpgActorType`.
- Aucun reliquat de vocabulaire trompeur `thresholds.wounds/strain` ne subsiste dans le flux Character concerné par l'issue.
- Le comportement métier et la forme de données observée par les consommateurs restent inchangés.
