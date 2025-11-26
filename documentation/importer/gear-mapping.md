---
post_title: 'OggDude Gear Mapping Reference'
author1: 'SWERPG Core Dev'
post_slug: 'oggdude-gear-mapping'
microsoft_alias: 'swerpg-dev'
featured_image: ''
categories:
  - importer
tags:
  - oggdude
  - gear
  - mapping
ai_note: 'Generated with AI assistance'
summary: 'Documentation synthétique sur le correctif Gear.xml : valeurs numériques fiabilisées, description enrichie, BaseMods et WeaponModifiers sérialisés.'
post_date: 2025-11-18
---

<!-- markdownlint-disable-next-line MD041 -->

## Vue d'ensemble

Le correctif 1.0 du mapper `Gear.xml` préserve désormais tous les champs critiques : prix, encombrement et rareté, type d'équipement, description nettoyée, mods de base et profil d'arme. Les données importées restent compatibles avec le schéma `SwerpgGear` existant et Foundry v13 sans nécessiter de migration rétroactive.

## Pipeline de mapping

- **Entrée** : objet XML `Gears.Gear` produit par OggDude.
- **Mapper** : `module/importer/items/gear-ogg-dude.mjs` (refactor 1.0).
- **Utilitaires** : `module/importer/mappings/oggdude-gear-utils.mjs` (sanitisation, slug, formatage).
- **Fallbacks** : prix/rarete/encombrement ≥ 0, catégorie `general` si type absent.
- **Logs** : `logger.debug('[GearImporter] Parsed BaseMods', ...)` et `Parsed WeaponModifiers` pour l'observabilité.

## Description générée

- Nettoyage des balises OggDude (`[H3]`, `[BR]`, `[color]`) via `sanitizeOggDudeGearDescription`.
- Ajout systématique d'une ligne `Source: <Livre>, p.<page>` (page optionnelle).
- Section **Base Mods** si des `MiscDesc` sont présents (chaque entrée devient une puce `- ...`).
- Section **Weapon Use** lorsque `<WeaponModifiers>` existe :
  - Puces `Skill`, `Damage`, `Crit`, `Range`.
  - Qualités fusionnées (`cumbersome` + `count`) triées et affichées avec indentation.
- Pas de HTML injecté : toute tentative `<script>` est échappée (`&lt;script`).

## Flags et structures enregistrées

| Flag                                               | Contenu                                                          | Usage                               |
| -------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| `flags.swerpg.oggdudeKey`                          | Identifiant OggDude d'origine                                    | Traçabilité                         |
| `flags.swerpg.originalType`                        | Type brut (`Tools/Electronics`)                                  | Debug & audit                       |
| `flags.swerpg.oggdudeSource` / `oggdudeSourcePage` | Source textuelle                                                 | Affichage description               |
| `flags.swerpg.oggdude.type`                        | Type original (copie)                                            | Préparation future taxonomie        |
| `flags.swerpg.oggdude.baseMods[]`                  | Tableau `{ description, dieModifiers[] }`                        | Automatisation ultérieure des bonus |
| `flags.swerpg.oggdude.weaponProfile`               | `{ skillKey, damage, damageAdd, crit, rangeValue, qualities[] }` | Génération d'actions futures        |

## Tests & validation

- `tests/importer/gear-import.integration.spec.mjs`
  - Vérifie le schéma, le slug `system.category`, la performance < 150 ms sur 200 items.
- `tests/importer/gear-import.weapon-profile.spec.mjs`
  - Couverture BaseMods + WeaponModifiers, valeurs par défaut, sanitation, fusion des qualités.
- Validation manuelle : importer un lot `Gear.xml` complet et vérifier la lisibilité des fiches (description, sections, flags).

## Critères de rollback

1. Si la performance dépasse 150 ms/200 items, revenir à la version précédente du mapper et ouvrir un plan dédié.
2. Si un monde dépend d'une description plus courte, conserver les flags mais désactiver temporairement l'ajout des sections via un patch conditionnel.
3. Documenter tout rollback dans `CHANGELOG.md` et notifier l'équipe QA pour replanifier la migration.
