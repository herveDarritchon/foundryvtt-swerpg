---
post_title: "OggDude Weapon Mapping Reference"
author1: "SWERPG Core Dev"
post_slug: "oggdude-weapon-mapping"
microsoft_alias: "swerpg-dev"
featured_image: ""
categories:
  - importer
tags:
  - oggdude
  - weapon
  - mapping
ai_note: "Generated with AI assistance"
summary: "Documentation synthétique sur le mapping Weapon.xml vers les Items weapon SWERPG après la correction 1.0."
post_date: 2025-11-18
---

<!-- markdownlint-disable-next-line MD041 -->
## Vue d'ensemble

Le correctif 1.0 du mapper `Weapons.xml` fiabilise l'import des armes OggDude: portée (`RangeValue` puis `Range`), qualités avec valeurs numériques, description nettoyée, type/catégories et contraintes (Restricted, SizeHigh). Les données sont injectées dans le schéma `SwerpgWeapon` sans modifier la structure existante et restent compatibles Foundry v13.

## Pipeline de mapping

- **Entrée**: objet XML OggDude `Weapons.Weapon`.
- **Mapper**: `module/importer/items/weapon-ogg-dude.mjs`.
- **Tables**: `WEAPON_SKILL_MAP`, `WEAPON_RANGE_MAP`, `WEAPON_QUALITY_MAP`, `WEAPON_HANDS_MAP`.
- **Fallbacks**: compétence → `rangedLight`, portée → `medium`, qualité inconnue ignorée après journalisation.
- **Description**: nettoyage `[H*]`, `[BR]`, balises `[color]`, conversion script → texte neutre puis append `Source: <Livre>, p.<page>`.

## Flags et métadonnées

| Clé | Contenu | Usage |
| --- | --- | --- |
| `flags.swerpg.oggdudeKey` | Identifiant source OggDude | Traçabilité et diff ultérieur |
| `flags.swerpg.oggdudeQualities` | Tableau `{ id, count }` trié | Référence future pour mécaniques lisant les valeurs |
| `flags.swerpg.oggdudeTags` | Tags `type`, `category`, `status` | Exposé via `SwerpgWeapon.getTags()` |
| `flags.swerpg.oggdude.sizeHigh` | Valeur numérique ou texte | Information annexe non jouée |
| `flags.swerpg.oggdude.source` | `{ name, page }` | Source affichée dans la description |

## Tests et validation

- `pnpm test weapon-import` vérifie le mapping, le nettoyage, les flags et les performances (≈200 entrées).
- `pnpm test weapon-import-stats` s’assure que les inconnues alimentent bien les métriques et que les fallbacks n’échouent pas.
- Vérification manuelle: importer un lot OggDude avec armes multi-qualités, restreintes et portées variées; confirmer l'affichage sur la fiche.

## Critères de rollback

En cas de régression critique, désactiver temporairement la nouvelle logique via un flag runtime:

1. Basculer `weaponMapper` vers une version précédente (commit de référence `bug-oggdude-weapon-data-mapping` < 1.0).
2. Conserver `WEAPON_RANGE_MAP` enrichi (non disruptif) mais neutraliser l'ajout des nouveaux flags dans `mapOggDudeWeapon`.
3. Documenter la régression et ouvrir un plan `swerpg-plan` dédié avant réactivation.

## Références

- `module/importer/items/weapon-ogg-dude.mjs`
- `module/importer/mappings/oggdude-weapon-range-map.mjs`
- `module/importer/mappings/oggdude-weapon-utils.mjs`
- `module/models/weapon.mjs`
- `tests/importer/weapon-import*.spec.mjs`
