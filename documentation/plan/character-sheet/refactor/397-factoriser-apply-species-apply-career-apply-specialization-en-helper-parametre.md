# Plan — Factoriser `applySpecies` / `applyCareer` / `applySpecialization` en helper paramétré

**Issue** : [#397 — Refactor: factoriser applySpecies/applyCareer/applySpecialization en helper paramétré](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/397)

## Décision de périmètre

- **À faire** : supprimer la duplication des trois méthodes d'application dans `SwerpgCharacter` via un helper interne paramétré qui centralise l'appel à `this.parent._applyDetailItem(...)`.
- **À ne pas faire** : ne pas modifier `Actor._applyDetailItem`, ne pas toucher `acquireSpecialization`, ne pas changer les call sites de `CharacterSheet`, ni le comportement métier actuel.
- **Hypothèse retenue** : `applySpecies`, `applyCareer` et `applySpecialization` restent des points d'entrée publics ; seule leur implémentation interne est factorisée.

## Fichiers impactés

| Fichier | Nature du changement |
| --- | --- |
| `module/models/character.mjs` | Extraire un helper commun, y router les trois wrappers publics, conserver les options métier existantes |
| `tests/models/character-detail-application.test.mjs` | Ajouter des non-régressions sur les options déléguées à `_applyDetailItem` |
| `tests/applications/sheets/character-sheet-specialization-drop.test.mjs` | Garder le rôle de garde d'intégration sur l'API publique `applySpecialization` sans changer le flux métier |

## Étapes

### 1. Extraire le helper commun de délégation

- Ajouter dans `SwerpgCharacter` un helper interne qui reçoit l'item et un bloc d'options spécifiques, puis applique les options communes `{ canApply: true, canClear: true }`.
- Centraliser dans ce helper la récupération de `this.parent` et l'appel unique à `_applyDetailItem(...)`.
- Garder les trois méthodes publiques comme wrappers nommés pour préserver l'API métier existante.

### 2. Conserver la divergence métier de `applySpecialization`

- Faire porter à `applySpecialization` uniquement le delta spécifique `{ isCollection: true, collectionKey: 'specializations' }`.
- Laisser `applySpecies` et `applyCareer` déléguer au helper sans option additionnelle.
- Ne pas déplacer dans le nouveau helper la logique avale déjà portée par `Actor._applyDetailItem` pour les collections et les spécialisations.

### 3. Verrouiller les non-régressions de délégation

- Ajouter des tests modèle qui espionnent `parent._applyDetailItem` et vérifient que `applySpecies` et `applyCareer` transmettent les options communes attendues.
- Ajouter le cas `applySpecialization` pour vérifier l'ajout exact de `isCollection: true` et `collectionKey: 'specializations'`.
- Conserver les tests de sheet existants comme preuve que l'API publique `applySpecialization(item)` reste inchangée côté UI.

## Points de vigilance

- Le helper doit rester interne à `SwerpgCharacter` ; ce refactor ne doit pas remonter de logique dans `Actor` ni créer une nouvelle surface publique.
- La factorisation ne doit pas masquer la différence fonctionnelle entre détail simple (`species`, `career`) et collection (`specializations`).
- Éviter toute modification de signature, de nom de méthode ou de shape d'options observable par les tests existants.

## Résultat attendu

- `SwerpgCharacter` n'embarque plus trois blocs dupliqués pour déléguer à `_applyDetailItem`.
- `applySpecies`, `applyCareer` et `applySpecialization` gardent la même API publique et les mêmes options effectives qu'avant refactor.
- Les tests couvrent explicitement la délégation commune et le cas spécifique collection des spécialisations.
