# Fix OggDude Specialization Tree Import — Arbres de spécialisation vides

## Problème

Le mapper OggDude des arbres de spécialisation cherchait les nœuds dans `TalentRows.TalentRow.TalentColumns.TalentColumn`, mais le XML réel OggDude encode les arbres via `TalentRows.TalentRow.Talents.Key` et `Directions.Direction`. Résultat : tous les imports d'arbres produisaient des items vides (0 nœuds, 0 connexions).

## Corrections appliquées

| US | Issue | PR | Description |
|---|---|---|---|
| US1 | #218 | #223 | Mapping des nœuds depuis le format réel OggDude (`Talents.Key`, `Cost`) |
| US2 | #219 | #224 | Génération des connexions depuis `Directions` (`Right` → horizontal, `Down` → vertical) |
| US3 | #220 | #225 | Logs de diagnostic structurés (détection de format, résumé mapping, warnings) |
| US4 | #221 | #226 | Tests unitaires et d'intégration sur format réel avec fixture Advisor.xml (20 nœuds) |
| US5 | #222 | — | Validation d'intégration Foundry bout en bout (tests pipeline + scénario manuel) |

## Résultat

- Le format réel `TalentRows.TalentRow.Talents.Key[]` est correctement parsé
- Les connexions sont générées depuis `Directions.Direction` (`Right` / `Down`)
- L'ancien format `TalentColumns` reste supporté (fallback)
- Les logs de diagnostic (`logger.debug`/`warn`) permettent de détecter les formats inconnus
- La fixture Advisor.xml (5 lignes × 4 nœuds) produit exactement :
  - 20 nœuds avec coûts 5/10/15/20/25
  - 20 connexions (7 horizontales + 13 verticales)
  - Aucun doublon
- Couverture de test : 39 tests (19 unitaires + 20 intégration) + 1 test pipeline complet
- La suite complète des tests d'import (547 tests) est au vert

## Critères d'acceptation de l'epic

- [x] 20 nœuds produits depuis Advisor.xml
- [x] Coûts 5/10/15/20/25 XP selon les lignes
- [x] Connexions générées depuis Directions
- [x] Aucun arbre importé depuis ce format ne reste vide
- [x] Tests unitaires passent (547/547)
- [x] Fallback ancien format conservé
- [x] Logs de diagnostic permettent de détecter un format inconnu

## Références

- Epic parent : [#217](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/217)
- Plans : `documentation/plan/character-sheet/specialization-tree/218-*.md` à `222-*.md`
- Tests : `tests/importer/specialization-tree-ogg-dude.spec.mjs`, `tests/importer/specialization-tree-ogg-dude.integration.spec.mjs`
- Test manuel : `tests/manual/specialization-tree-import-validation.md`
