# Code Review — `module/models/character.mjs`

- **Date** : 2026-05-25
- **Fichier cible** : `module/models/character.mjs`
- **Classe** : `SwerpgCharacter extends SwerpgActorType`
- **Reviewer** : Claude Opus 4.7 (tech lead senior)
- **Lignes** : 703

---

## Forces

- **Schéma déclaratif propre.** `defineSchema()` exhaustif, contraintes `min/max/integer`, labels i18n, validators dédiés. Conforme `foundry.abstract.TypeDataModel` v14.
- **Domaine extrait.** Logique de coût/achat skill déléguée à `module/utils/skill-costs.mjs` (pure, testable sans Foundry) — respecte la séparation domaine/adapter du `CLAUDE.md`.
- **Logger central** utilisé (`logger.debug` ligne 259), aucun `console.*` direct. Conforme à la règle projet.
- **Private statics `#`** pour validators/calculs — bonne encapsulation moderne ES2022.
- **JSDoc typedefs** en tête (Thresholds, Experience, Progression, FreeSkillRank) — contrat de schéma explicite.
- **Tests existants** pour `acquireSpecialization`, `removeSpecialization`, `talentPurchases` (`tests/models/character-*.test.mjs`).
- **API d'apply\* asynchrone** déléguée à `actor._applyDetailItem` — pattern cohérent entre species/career/specialization.

---

## Faiblesses

### 🔴 Bloquantes / dette critique

**1. Code mort + commenté massif.**

- `#prepareAdvancement()` (l.335–346) jamais appelé → la propriété `points` (l.294) reste `undefined`. Tout le système de points abilité/skill/talent est zombie.
- `#prepareExperience()` (l.351–357) vide, contenu commenté.
- Gros blocs commentés l.423–427, 530–540, 548–566, 376–384. Bruit pur, masque l'intention.
- **Action :** supprimer ou ouvrir issues "réactiver pts" si encore au backlog.

**2. Stubs hardcodés en production** (l.398–400) :

```js
// FIXME this is some Stubs for the moment
thresholds.strain = 2
thresholds.wounds = 3
```

Écrasent les valeurs de schéma `min:0, max:2000` à chaque `prepareBaseData()`. Les valeurs persistées en DB sont silencieusement ignorées. **Régression latente.**

**3. Schema bypass silencieux.**

`_prepareExperience()` (l.256–258) ajoute `obligationXpBonus`, `total`, `available` sur `progression.experience` — champs absents du schéma. Idem `startingExperience` (l.419). Acceptable pour de la donnée dérivée non persistée, mais aucune doc / convention `_prepareDerivedData` claire.

**Action :** convention explicite (`@property` dérivés en JSDoc), ou champ `derived` non-stocké.

---

### 🟠 Importantes

**4. Magic numbers dispersés.**

- `size = 3`, `stride = 10` (l.324–325) — devrait être `SYSTEM.MOVEMENT.*`.
- `maxRank: isCreation ? 2 : 5` (l.471) — règle métier critique, devrait être `SYSTEM.SKILLS.MAX_RANK_CREATION / MAX_RANK`.
- `pool: 9` (l.339) — règle d'ability points.

**5. Naming collision `size`.**

- `this.size = 3 + …` (l.309) — taille de l'acteur sur l'instance.
- `m.size = size + m.sizeBonus` (l.326) — taille de mouvement.

Deux notions différentes, même nom. Confusion garantie.

**6. Duplication apply\* methods** (l.597–640).

Trois méthodes quasi-identiques `applySpecies / applyCareer / applySpecialization` avec mêmes options. Candidate à un helper `_apply(detailItem, opts)`.

**7. `SetField` mal typé** pour `details.specializations` (l.206–217) :

```js
specializations: new fields.SetField(
  new fields.SchemaField({...}, { required: true, nullable: true, initial: null }),
),
```

`nullable: true` + `initial: null` à l'intérieur d'un `SetField` n'a pas de sens (un Set ne peut pas contenir `null` proprement). Tout le code utilise `Array.from(this.details.specializations || [])` partout (l.492, 506, 665, 690) — symptôme d'une mauvaise abstraction. **`ArrayField` serait plus honnête.**

**8. Mutation in iteration sans nom** (`_applyFreeSkillSpecies` l.436–442).

`skill.rank.base = 1` mute le param. Contourne la règle `no-param-reassign` ESLint via mutation de propriété — fonctionnel mais sournois.

**9. Responsabilité mixte.**

`acquireSpecialization` / `removeSpecialization` font `actor.update(...)` depuis le DataModel. Le DataModel sait normalement *décrire* et *préparer*, pas *persister*. Ces opérations métier appartiennent à un service ou à l'extension `SwerpgActor`. Acceptable tant que discipliné, mais à isoler avant prolifération.

---

### 🟡 Mineures

**10. Optional chaining inutile.**

`this.details?.size` (l.309), `this.parent?.isL0` (l.461) — `details` et `parent` sont toujours définis dans le cycle `prepareData`. Bruit défensif non justifié.

**11. JSDoc faux** (l.265–267).

`#computeObligationBonusExperience` commenté "Validate an attribute field" — copy-paste cassé.

**12. Langue mixte.**

Commentaires `removeSpecialization` (l.679–687) en français, le reste en anglais. Convention projet : anglais pour le code.

**13. Convention privée incohérente.**

Mélange `#privateMethod` (true private) et `_protectedMethod` (convention). Coexistence OK, mais `#prepareExperience` (l.351) et `_prepareExperience` (l.253) avec noms quasi identiques → confusion certaine.

**14. Sémantique `thresholds` trompeuse.**

`thresholds.wounds / strain` sont utilisés comme bonus additifs dans `#calculateWoundThreshold` (`brawn + wounds`). Soit renommer en `woundsBonus/strainBonus`, soit revoir la sémantique.

---

## Améliorations recommandées

| Prio | Action | Effort |
|------|--------|--------|
| P0 | Supprimer code mort (`#prepareAdvancement`, `#prepareExperience`, blocs commentés, propriété `points`) | S |
| P0 | Retirer FIXME hardcode `thresholds.strain/wounds = 2/3` ou ouvrir issue dédiée | S |
| P1 | Extraire constantes `SYSTEM.MOVEMENT.BASE_SIZE/STRIDE`, `SYSTEM.SKILLS.MAX_RANK_CREATION` | S |
| P1 | Remplacer `SetField` par `ArrayField` pour `details.specializations`, supprimer `Array.from(... \|\| [])` partout | M |
| P1 | Factoriser `applySpecies / applyCareer / applySpecialization` en helper paramétré | S |
| P2 | Déplacer `acquireSpecialization / removeSpecialization` vers `SwerpgActor` ou un `SpecializationService` | M |
| P2 | Documenter convention "champs dérivés non-schéma" (`@property` JSDoc ou pattern `derived`) | S |
| P2 | Renommer `thresholds.wounds/strain` → `woundsBonus/strainBonus` pour aligner sémantique | S |
| P3 | Corriger JSDoc copy-paste cassés, homogénéiser langue (EN), retirer optional chaining superflu | S |

---

## Verdict

**État global : fonctionnel mais dette technique visible.**

Le squelette TypeDataModel est solide, la séparation domaine (skill-costs) suit le `CLAUDE.md`. La couche métier visible (skills, specializations, talents) est testée et propre.

Trois zones rouges :

- **(a) Dead code ostensible** — `points`/advancement zombies.
- **(b) Stubs FIXME en runtime** — thresholds écrasés à chaque prepareData.
- **(c) Abstractions floues** — `SetField` mal posé, naming `size` ambigu, convention privé/protégé incohérente.

Pas de bug bloquant identifié. La dette freinera la prochaine refonte XP/progression. **Nettoyer P0+P1 avant toute nouvelle feature de progression.**
