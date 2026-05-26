# Plan — Extraire les constantes magiques `SYSTEM.SKILLS.MAX_RANK*` dans SwerpgCharacter

**Issue** : [#395 — Refactor: extraire constantes magiques SYSTEM.MOVEMENT.\* et SYSTEM.SKILLS.MAX_RANK dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/395)

## Décision issue

- **À faire** : extraire `2` → `SYSTEM.SKILLS.MAX_RANK_AT_CREATION` et `5` → `SYSTEM.SKILLS.MAX_RANK`
- **À ne pas faire** : ne pas créer `SYSTEM.MOVEMENT.BASE_SIZE` / `SYSTEM.MOVEMENT.BASE_STRIDE`
- **À vérifier (fait)** : `size` et `stride` sont encore utilisés après préparation → les conserver comme valeurs techniques locales, documentées

## Collision de namespace

`SYSTEM.SKILLS` pointe aujourd'hui vers `ATTRIBUTES.SKILLS` (`module/config/attributes.mjs`), le catalogue des compétences métier.

`SYSTEM.SKILL` pointe vers `module/config/skills.mjs` (les rangs et leurs coûts).

→ `SYSTEM.SKILLS.MAX_RANK*` ajoute un export au _même_ objet `SYSTEM.SKILLS`. Le plan doit soit :

1. déplacer `MAX_RANK*` dans `module/config/skills.mjs` et l'exporter sous `SYSTEM.SKILL.MAX_RANK*` (cohérent avec la sémantique de `SYSTEM.SKILL`), **ou**
2. enrichir `SYSTEM.SKILLS` avec `MAX_RANK*` en acceptant la dualité sémantique (catalogue + config de rang).

**Choix retenu** : option 2 (`SYSTEM.SKILLS`), par fidélité au texte de l'issue.

## Collision de fichier

`documentation/plan/character-sheet/evolution-logs/395-follow-up-us6-localiser-les-libelles-de-characteristic-increase-dans-l-historique.md` existe mais concerne un sujet différent (US6, caracteristiques). Il s'agit d'une collision de numérotation — ce fichier n'est pas touché par ce plan.

## Fichiers impactés

| Fichier                       | Nature                                   |
| ----------------------------- | ---------------------------------------- |
| `module/config/skills.mjs`    | + `MAX_RANK_AT_CREATION`, `MAX_RANK`     |
| `module/config/system.mjs`    | Surface `MAX_RANK*` sous `SYSTEM.SKILLS` |
| `module/models/character.mjs` | Remplacer `2` et `5` par les constantes  |

## Étapes

### 1. Ajouter les constantes dans `module/config/skills.mjs`

```js
export const MAX_RANK_AT_CREATION = 2
export const MAX_RANK = 5
```

### 2. Surface sous `SYSTEM.SKILLS` dans `module/config/system.mjs`

Ajouter dans l'objet `SYSTEM` :

```js
SKILLS: {
  ...ATTRIBUTES.SKILLS,
  MAX_RANK_AT_CREATION,
  MAX_RANK,
},
```

⚠️ `SYSTEM.SKILLS` passe d'un simple référentiel à un objet composite. Vérifier que tous les consommateurs itèrent avec `Object.values()` ou des accès par clé nommée, pas avec un spread qui perdrait les nouvelles propriétés.

### 3. Remplacer les magic numbers dans `module/models/character.mjs:417`

```diff
- maxRank: isCreation ? 2 : 5,
+ maxRank: isCreation ? SYSTEM.SKILLS.MAX_RANK_AT_CREATION : SYSTEM.SKILLS.MAX_RANK,
```

### 4. Aucune extraction de `size` / `stride`

`size` et `stride` dans `character.mjs:328-329` et `adversary.mjs:70-71` sont encore consommés après préparation par :

- `module/models/actor-type.mjs:546` — `m.free = m.stride`
- `module/config/action.mjs:375` — `const stride = movement.stride`
- `templates/sheets/actor/adversary-attributes.hbs:104` — affichage de stride
- `module/canvas/token.mjs:402` — `actor.system.movement.stride * 2`
- `module/documents/actor.mjs:775` — `token.width = this.size`

Conserver ces valeurs comme constantes locales avec un commentaire documentant leur provenance et leur usage.

## Tests

- Ajouter un test unitaire dans le fichier de config skills qui vérifie que `MAX_RANK_AT_CREATION === 2` et `MAX_RANK === 5` (verrouillage contractuel)
- Ajouter un test sur `SwerpgCharacter._prepareSkill()` ou `getSkillPurchaseState()` qui vérifie que le paramètre `maxRank` utilise les constantes aux deux endroits (création / hors création)
- Vérifier que les tests existants de `skill-costs` et `purchase-state` passent sans changement

## Résultat attendu

- `2` et `5` ne sont plus des magic numbers dans `character.mjs`
- `SYSTEM.SKILLS.MAX_RANK_AT_CREATION` et `SYSTEM.SKILLS.MAX_RANK` sont les seules sources de vérité
- `size` et `stride` restent des constantes locales, documentées, sans promotion au rang métier
- Aucune régression sur les tests existants
