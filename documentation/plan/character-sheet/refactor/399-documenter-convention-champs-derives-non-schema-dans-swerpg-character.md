# Plan — Documenter la convention des champs dérivés non schéma dans `SwerpgCharacter`

**Issue** : [#399 — Docs: documenter convention champs dérivés non-schéma dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/399)

## Décision de périmètre

- **À faire** : documenter explicitement dans `module/models/character.mjs` quels champs de `progression.experience` sont persistés par le schéma et quels champs sont uniquement dérivés au runtime.
- **À ne pas faire** : ne pas ajouter ces champs dérivés au schéma Foundry, ne pas changer leur calcul métier, ne pas restructurer la donnée persistée.
- **Hypothèse retenue** : le pattern actuel de champs dérivés hors schéma est acceptable s'il est rendu explicite et cohérent dans la JSDoc et les commentaires du fichier.

## Fichiers impactés

| Fichier | Nature du changement |
| --- | --- |
| `module/models/character.mjs` | Compléter la JSDoc du typedef `Experience` et clarifier la convention persisté vs dérivé autour de `_prepareExperience()` |

## Étapes

### 1. Expliciter le contrat documentaire de `progression.experience`

- Compléter le typedef `Experience` avec tous les champs dérivés effectivement exposés au runtime : `obligationXpBonus`, `startingExperience`, `total`, `available`.
- Annoter chaque champ dérivé avec une mention explicite du type « non persisté », pour le distinguer des champs portés par le schéma.
- Regrouper ou ordonner la JSDoc de façon à rendre immédiatement visible la séparation entre données persistées et données calculées.

### 2. Clarifier la convention dans le flux de préparation

- Ajouter ou réécrire les commentaires autour de `_prepareExperience()` et des affectations dérivées pour expliquer que ces propriétés enrichissent l'objet préparé sans élargir le schéma.
- Employer une terminologie stable dans tout le fichier (`persisté`, `dérivé`, `non persisté`) afin d'éviter toute ambiguïté sur le statut de ces champs.
- Ne créer un groupe explicite `derived` que si cette option améliore réellement la lisibilité sans changer l'API runtime attendue ; sinon rester sur la forme actuelle documentée.

### 3. Vérifier la cohérence documentaire locale

- Relire tous les accès et affectations liés à `progression.experience` dans `character.mjs` pour confirmer qu'aucun champ dérivé exposé au runtime n'est oublié dans la JSDoc.
- Vérifier que les commentaires n'induisent pas qu'un champ dérivé serait sauvegardé en base ou validé par le schéma.
- Garder le plan strictement documentaire : aucune refactor métier, aucun changement de persistance, aucune migration.

## Points de vigilance

- La documentation ne doit pas normaliser par erreur un schema bypass implicite ailleurs que sur `progression.experience` ; rester ciblé sur le contrat réellement utilisé.
- Si l'option `derived` implique un changement de forme observable pour les consommateurs runtime, la laisser hors périmètre de cette issue.
- La JSDoc doit rester alignée avec le comportement réel du fichier, pas avec une architecture idéale future.

## Résultat attendu

- Tous les champs dérivés de `progression.experience` sont documentés dans `character.mjs` avec leur statut non persisté.
- La convention locale « schéma persisté vs champs dérivés runtime » est compréhensible sans relire la review externe.
- Le fichier conserve le même comportement fonctionnel, avec une intention documentaire explicitée.
