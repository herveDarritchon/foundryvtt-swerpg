---
title: 'Spécification canonique de la taxonomie des armes (system.category, system.weaponType)'
status: 'Validé'
date: '2026-05-07'
issue: '#97'
tags: ['weapon', 'taxonomy', 'canonical', 'spec']
---

## Status

**Validé** — Cette spécification finalise les valeurs canoniques de la taxonomie des armes définie dans ADR-0007.
Elle sert de document de référence unique pour les issues #98 (schéma), #101 (import OggDude) et #100 (UX/tests).

## system.category — Enum canonique fermée

### Valeurs autorisées

| Clé | Rôle mécanique | Skill principal | RangeCategory | Exemples OggDude |
|-----|----------------|-----------------|---------------|------------------|
| `melee` | Corps-à-corps | melee, lightsaber, brawl | melee | Armes blanches, vibro-lames, gantelets |
| `ranged` | Tir standard, armes légères et lourdes portatives | rangedLight, rangedHeavy | distant | Blasters, fusils, pistolets |
| `gunnery` | Armes lourdes portatives, mitrailleuses, lance-missiles | gunnery | distant | Mitrailleuses lourdes, lance-missiles |
| `explosive` | Explosifs, démolitions, grenades | rangedLight, gunnery | distant | Grenades, mines, charges |
| `thrown` | Armes de jet | rangedLight | distant | Couteaux de lancer, shurikens, hachettes |
| `vehicle` | Armement monté sur véhicule ou vaisseau | gunnery | distant | Tourelles, canons montés |
| `natural` | Attaques naturelles sans arme | brawl | melee | Griffes, crocs, attaques à mains nues |

### Règles de l'enum

1. **Enum fermée** : `system.category` ne peut contenir qu'une valeur de cette liste. Toute valeur invalide est rejetée par le schéma au même titre que les catégories d'armure (cf. `SwerpgArmor.ITEM_CATEGORIES`).
2. **Pas de `other` / `unknown`** : L'enum n'autorise pas de valeur fourre-tout. En cas d'impossibilité de résolution, la chaîne de priorité (§Priorités et fallbacks) détermine une valeur fiable. En dernier recours, un fallback par défaut documenté est utilisé.
3. **Correspondance rangeCategory** : Chaque catégorie a un `rangeCategory` associé (`melee` ou `distant`) qui sert de base aux décisions mécaniques (animation, boons/banes, etc.).

## system.weaponType — Liste normalisée ouverte

`system.weaponType` n'est **pas** une enum fermée au niveau du schéma. C'est une liste de référence de valeurs normalisées, avec un fallback par slugification pour les valeurs inconnues.

### Valeurs connues (liste de référence, non exhaustive)

| Valeur normalisée | Source `<Type>` OggDude typique | `system.category` typique |
|---|---|---|
| `blaster` | Blasters | ranged |
| `blaster-heavy` | Blasters/Heavy | ranged, gunnery |
| `slugthrower` | Slugthrowers | ranged |
| `flame-projector` | Flame-Projectors | ranged |
| `explosive-other` | Explosives/Other | explosive |
| `ion` | Ion | ranged |
| `missile` | Missiles | gunnery |
| `melee` | Melee | melee |
| `lightsaber` | Lightsabers | melee |
| `brawl` | Brawl | natural |

### Règles de normalisation

1. **Valeur connue** → mapping explicite vers la valeur normalisée (table ci-dessus).
2. **Valeur inconnue** → slugification : `kebab-case`, suppression des caractères spéciaux, normalisation Unicode.
3. **Valeur brute conservée** : la valeur originale de `<Type>` est toujours stockée dans `flags.swerpg.oggdude.type`.
4. **Pas de validation stricte** : `system.weaponType` est un `StringField` libre dans le schéma. La normalisation est assurée par le mapper, pas par le modèle.

### Algorithme de slugification

```
input: valeur brute <Type>
1. trim()
2. toLowerCase()
3. remplacer '/', '\', '|', '—', '–' par '-'
4. supprimer tout caractère non [a-z0-9-]
5. réduire les '-' multiples en un seul '-'
6. supprimer les '-' en début et fin de chaîne
output: chaîne slugifiée
```

## Tables de mapping OggDude → SWERPG

### `<Categories>` → `system.category`

| `<Category>` OggDude | `system.category` | Priorité |
|---|---|---|
| `Ranged` | `ranged` | 1 |
| `Melee` | `melee` | 1 |
| `Thrown` | `thrown` | 1 |
| `Vehicle` | `vehicle` | 1 |
| `Starship` | `vehicle` | 1 |
| `Explosive` | `explosive` | 1 |
| `Heavy` | `gunnery` | 1 |

**Règle de prise en compte pour les tableaux** : Parcourir le tableau dans l'ordre. La première valeur reconnue détermine `system.category`. Si cette valeur entre en conflit avec SkillKey, le conflit est loggué et SkillKey l'emporte (§Priorités et fallbacks).

### `<Type>` → `system.weaponType`

| `<Type>` OggDude | `system.weaponType` | Priorité |
|---|---|---|
| `Blasters` | `blaster` | 1 |
| `Blasters/Heavy` | `blaster-heavy` | 1 |
| `Slugthrowers` | `slugthrower` | 1 |
| `Flame-Projectors` | `flame-projector` | 1 |
| `Ion` | `ion` | 1 |
| `Missiles` | `missile` | 1 |
| `Melee` | `melee` | 1 |
| `Lightsabers` | `lightsaber` | 1 |
| `Brawl` | `brawl` | 1 |
| `Explosives/Other` | `explosive-other` | 1 |
| *Toute autre valeur* | `slugify(valeur)` | 2 (fallback) |

## Priorités et fallbacks

### Résolution de `system.category`

```
1. <Categories> OggDude
   │
   ├── valeur unique reconnue → l'utiliser
   ├── plusieurs valeurs reconnues → la première dans l'ordre du tableau
   └── conflit avec SkillKey → SkillKey l'emporte (warning)
   │
   └─ si absent ou aucune valeur reconnue
      ↓
2. SkillKey
   │
   ├── melee / lightsaber / brawl → "melee"
   ├── rangedLight / rangedHeavy → "ranged"
   ├── gunnery → "gunnery"
   └── autre / inconnu
      ↓
3. Range (RangeValue)
   │
   ├── engaged → "melee"
   └── short / medium / long / extreme → "ranged"
      ↓
4. Fallback par défaut : "ranged"
```

**Règles :**
- Chaque saut de fallback émet un warning loggué (catégorie `WEAPON_CATEGORY_FALLBACK`).
- En mode strict (flag import), l'absence de résolution fiable peut rejeter l'item.

### Résolution de `system.weaponType`

```
1. <Type> OggDude → valeur mappée dans la table de référence
   │
   ├── valeur connue → valeur normalisée
   └── valeur inconnue → slugify(valeur brute)
   │
   └─ si <Type> absent
      ↓
2. Chaîne vide ""
```

**Règle :** `system.weaponType` n'est jamais critique pour le fonctionnement mécanique de l'arme. Un fallback vide est acceptable.

## Cas ambigus documentés

### Cas 1 : Blasters/Heavy + `Ranged` + SkillKey RangedLight
- **system.category** : `ranged` (Categories reconnue)
- **system.weaponType** : `blaster-heavy`
- **Justification** : Cohérent. Le `Heavy` du type ne change pas la famille mécanique.

### Cas 2 : Explosives/Other + `Ranged` + SkillKey RangedLight
- **system.category** : `ranged` (Categories reconnue)
- **system.weaponType** : `explosive-other`
- **Justification** : Les explosifs lancés sont `Ranged` dans OggDude. Le type `Explosive-other` permet de les distinguer.

### Cas 3 : Explosives/Other + `Explosive` (Categories)
- **system.category** : `explosive`
- **system.weaponType** : `explosive-other`
- **Justification** : `<Categories>` fournit `Explosive` → mappé directement vers `explosive`.

### Cas 4 : Type inconnu + Categories absentes + SkillKey Melee
- **system.category** : `melee` (via SkillKey)
- **system.weaponType** : `slugify(Type)` ou `""`
- **Justification** : SkillKey fiable en fallback quand Categories est absent.

### Cas 5 : `['Melee', 'Ranged']` + SkillKey RangedLight
- **system.category** : `ranged` (conflit entre Categories et SkillKey → SkillKey l'emporte avec warning)
- **Justification** : La première valeur reconnue dans Categories serait `melee`, mais SkillKey indique `ranged`. Le conflit est tranché en faveur de SkillKey.

### Cas 6 : Pas de Type ni Categories (création manuelle ou source non-OggDude)
- **system.category** : `"ranged"` (valeur par défaut du schéma)
- **system.weaponType** : `""` (vide)
- **Justification** : Fallback documenté pour les armes créées manuellement.

### Cas 7 : `['Ranged', 'Starship']` + SkillKey Gunnery
- **system.category** : `vehicle` (Starship → vehicle) si c'est la première valeur reconnue pertinente. Si conflit avec SkillKey gunnery → `gunnery` l'emporte avec warning.
- **Justification** : Les armes montées sur vaisseau peuvent être taguées `Ranged` et `Starship`. La résolution dépend de l'ordre des valeurs et de SkillKey.

### Cas 8 : Arme sans SkillKey ni Range (données minimales)
- **system.category** : `"ranged"` (fallback ultime)
- **system.weaponType** : `""` (vide)
- **Justification** : Sécurité. Une arme sans skill ni range est invalide mais ne doit pas planter l'import.

## Implications pour les issues suivantes

### #98 — Schéma weapon
- Définir `SwerpgWeapon.ITEM_CATEGORIES = SYSTEM.WEAPON.CATEGORIES` (pattern `SwerpgArmor`)
- Définir `SwerpgWeapon.DEFAULT_CATEGORY = 'ranged'`
- Ajouter `system.weaponType` : `StringField({ required: false, initial: '' })`
- Ajouter les clés de localisation `WEAPON.CATEGORIES.*` dans `lang/*.json`

### #101 — Import OggDude weapon
- Mapper `<Categories>` → `system.category` via la table de mapping
- Mapper `<Type>` → `system.weaponType` via la table de mapping
- Stocker `flags.swerpg.oggdude.type` (valeur brute)
- Stocker `flags.swerpg.oggdude.categories` (tableau brut)
- Émettre les warnings pour les fallbacks
- Clarifier l'avenir de `flags.swerpg.oggdudeTags`

### #100 — UX/Tests
- Exposer `system.category` dans la fiche d'arme (selecteur)
- Afficher `system.weaponType` en lecture seule (ou éditable si pertinent)
- Préparer les filtres UI par `system.category`
- Mettre à jour les tests d'import pour couvrir la taxonomie
- Documenter l'usage résiduel de `oggdudeTags`

## Références

- ADR-0007 : Taxonomie canonique des armes
- Issue source : #15
- Issues découlant de cette spec : #98, #100, #101
- Plan d'implémentation : `documentation/plan/features/feature-weapon-taxonomy-adr-1.md`
