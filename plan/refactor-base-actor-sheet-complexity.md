## Refactor Plan: Reduce Cognitive Complexity in `SwerpgBaseActorSheet`

## Plan de Refactor: Réduction de la complexité dans `SwerpgBaseActorSheet`

Objectif: Appliquer Object Calisthenics et simplifier les méthodes complexes identifiées par le linter.

### Méthodes ciblées (complexité élevée)

- `#prepareItems()` (25 → <=15)
- `#prepareActiveEffects()` (21 → <=15)
- Section Drag & Drop legacy (TODO v13) – décider suppression ou migration.

### Principes Object Calisthenics appliqués

1. Small Methods: extraire sous-fonctions pures (`classifyItem`, `buildTalentDescriptor`, `sortInventoryHeading`).
2. One Level of Indentation: remplacer switch imbriqué + négations par mapping + early return.
3. No Else: privilégier early return / accumulation.
4. Wrap Primitives: introduire value-objects si utile (`TalentView`).
5. Single Responsibility: helpers dédiés pour items/effects.
6. Keep Entities Small: classe principale = orchestration.
7. No Complex Getters: calcul dans helpers purs.
8. First-Class Collections: structurer sections via objets légers.
9. No Abbreviations: noms explicites.
10. No Negative Conditionals: filtrer plutôt que tester `!condition`.

### Étapes détaillées

1. Créer helpers:
   - `module/applications/sheets/helpers/items.mjs`
   - `module/applications/sheets/helpers/effects.mjs`
2. Migrer construction sections vers helpers purs.
3. Pipeline `#prepareItems()`: collect → map → group → sort → filter empty.
4. Pipeline `#prepareActiveEffects()`: collect → categorize → decorate → sort → filter empty.
5. Supprimer conditions négatives (filtrage final).
6. Extraire mapping tags d’action dans constante réutilisable.
7. Décider avenir Drag & Drop (ticket séparé) et retirer TODO obsolètes.
8. Ajouter tests unitaires helpers (datasets synthétiques).
9. Mesurer avant/après (complexité, lignes, couverture).
10. Mettre à jour CHANGELOG + note migration interne.

### Critères de succès

- Complexité de chaque méthode ciblée <= 15.
- Aucune régression fonctionnelle (tests verts + nouveaux tests).
- Méthodes refactorisées <= 40 lignes.
- Plus de conditions négatives ou switch volumineux.

### Risques & atténuations

- Duplication de structures → centraliser schémas dans helpers.
- Fuite dépendances Foundry → passer données primitives uniquement.
- Métriques insuffisantes → script de mesure optionnel.

### Backlog (tâches)

- [ ] Créer fichier helpers items.
- [ ] Créer fichier helpers effects.
- [ ] Extraire mapping action tag.
- [ ] Refactor `#prepareItems()`.
- [ ] Refactor `#prepareActiveEffects()`.
- [ ] Nettoyer section Drag & Drop / TODOs.
- [ ] Tests helpers items.
- [ ] Tests helpers effects.
- [ ] Mise à jour CHANGELOG.

### Suivi

Relancer linter + tests après chaque extraction pour confirmer diminution de complexité.
