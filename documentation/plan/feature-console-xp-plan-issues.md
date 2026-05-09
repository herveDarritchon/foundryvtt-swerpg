# Plan d'implémentation — Console de transaction XP

## Epic

**EPIC: Console de transaction XP des compétences** — [#144](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/144)

## User Stories

| # | US | Description | Lien | Priorité |
|---|----|-------------|------|----------|
| 1 | **US1** | Console d'affichage des ressources de progression | [#136](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/136) | P0 - Base |
| 2 | **US2** | États visuels des lignes de compétence | [#137](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/137) | P0 - Base |
| 3 | **US3** | Prévisualisation d'achat au survol d'une compétence | [#138](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/138) | P0 - Core |
| 4 | **US4** | Achat d'un rang de compétence (XP et gratuit) | [#139](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/139) | P0 - Core |
| 5 | **US5** | Retrait d'un rang de compétence (XP et gratuit) | [#140](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/140) | P1 |
| 6 | **US6** | Gestion des rangs non traçables (importés / manuels) | [#141](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/141) | P1 |
| 7 | **US7** | Messages et notifications utilisateur | [#142](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/142) | P0 - Core |
| 8 | **US8** | Mise à jour dynamique du pool de dés dans la console | [#143](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/143) | P1 |

## Ordre d'implémentation suggéré

1. **US1** — Console statique + i18n + fix catégories (base indispensable)
2. **US2** — États visuels des lignes (prépare les data attributes)
3. **US3** — Survol → mise à jour console (première interaction)
4. **US8** — Pool de dés dans la console (enrichit US3, parallélisable)
5. **US4** — Achat d'un rang (coeur de la feature)
6. **US6** — Traçabilité des rangs (prérequis pour retrait)
7. **US5** — Retrait d'un rang (réversibilité)
8. **US7** — Notifications (feedback transverse, à intégrer dans chaque étape)

## Dépendances

```
US1 → US2 → US3 → US4 → US5
                  ↓      ↑
                 US8    US6
                  ↓      ↑
                 US7 ←──┘
```

## Références

- Spécification fonctionnelle : `documentation/spec/character-sheet/spec-console-transaction-xp.md`
- Plan de refonte original : `documentation/plan/feature-refactor-skill-tabs.md`
- Chantier 5 (console HTML/CSS) : `documentation/plan/feature-refactor-skill-tabs-chantier-5.md`
- Chantier 6 (interaction) : `documentation/plan/feature-refactor-skill-tabs-chantier-6.md`
