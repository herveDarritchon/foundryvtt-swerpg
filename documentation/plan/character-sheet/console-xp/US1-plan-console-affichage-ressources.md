# Plan d'implémentation — US1 : Console d'affichage des ressources de progression

**Issue
** : [#136 — US1: Console d'affichage des ressources de progression](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/136)  
**Epic
** : [#144 — EPIC: Console de transaction XP des compétences](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/144)  
**Spécification** : `documentation/spec/character-sheet/spec-console-transaction-xp.md` (§5, §6 état neutre)  
**Template concerné** : `templates/sheets/actor/skills.hbs`

---

## 1. Objectif

Rendre la console XP fonctionnelle dans son mode **statique et non interactif** : affichage correct des ressources de
progression, internationalisation, correction des incohérences de structure.

US1 est une fondation pour US3 (survol), US4 (achat) et US5 (retrait). Aucune interaction dynamique n'est ajoutée ici.

---

## 2. Périmètre

### Inclus dans US1

- Affichage des 5 données de progression :
    - XP disponibles
    - XP dépensés
    - Rangs gratuits carrière restants
    - Rangs gratuits spécialisation restants
    - Coût de la sélection en cours (état neutre)
- Internationalisation complète de tous les textes visibles de la console
- Correction du découpage des catégories de compétences sous la console
- Détermination propre de la visibilité de la console
- État neutre : message « Sélectionnez une compétence pour prévisualiser le coût. », coût à `—`

### Exclu de US1

- Survol interactif → US3
- Achat d'un rang → US4
- Retrait d'un rang → US5
- Messages de notification → US7
- Pool de dés dans la console → US8
- Logique de traçabilité des rangs → US6

---

## 3. Constat sur l'existant

### Console hardcodée en anglais

```hbs
<span class="xp-console__title">XP Transaction Console</span>
<span class="xp-console__status" data-xp-console-status>Awaiting selection</span>
<span class="xp-console__label">Available</span>
<span class="xp-console__label">Spent</span>
<span class="xp-console__label">Career Free</span>
<span class="xp-console__label">Specialty Free</span>
<span class="xp-console__label">Selected Cost</span>
<span class="xp-console__selection-placeholder">Select a skill to preview purchase cost.</span>
```

Aucune de ces chaînes n'utilise `{{localize}}`. Aucune clé i18n correspondante n'existe dans `lang/en.json` ou
`lang/fr.json`.

### Visibilité forcée à `true`

Dans `module/applications/sheets/character-sheet.mjs` (ligne 130) :

```js
skills: true,  // toujours true → console toujours visible
```

Ce flag `incomplete.skills` sert aussi à l'état global `i.creation`. Il cumule deux responsabilités : signaler une
création incomplète ET afficher la console.

### Décalage des catégories de compétences

Le template `skills.hbs` itère sur :

```hbs
{{#each skills.general}}
{{#each skills.combat}}
{{#each skills.knowledge}}
```

Mais `#prepareSkills()` groupe par `skill.type.id` qui produit des clés `exp`, `kno`, `soc` (définies dans
`module/config/skills.mjs`).

Le système de skills ne contient pas de catégories `general`, `combat` ou `knowledge`.

### Source de vérité des données

```
system.progression.experience          → { spent, gained, total, available, startingExperience }
system.progression.freeSkillRanks.career         → { spent, gained }
system.progression.freeSkillRanks.specialization → { spent, gained }
```

Les compteurs "available" sont déjà calculés dans `character-sheet.mjs` :

```js
context.progression.freeSkillRanks.career.available =
  a.system.progression.freeSkillRanks.career.gained - a.system.progression.freeSkillRanks.career.spent
context.progression.freeSkillRanks.specialization.available =
  a.system.progression.freeSkillRanks.specialization.gained - a.system.progression.freeSkillRanks.specialization.spent
```

---

## 4. Décisions à prendre avant implémentation

### 4.1. Visibilité de la console

**Constat** : La spec (§5) dit que la console doit afficher les données **en permanence**. L'issue mentionne « La
console n'est pas visible quand aucune progression n'est à gérer ».

### Réponse du PO:

==> Il faut comprendre que lorsque l'on est en phase de dépense d'xp ou de création de personnage alors la console est
visible. En phase de jeu, la console ne sera pas visible (mais c'est hors scope de cette US).

**Décision retenue** : La console est **toujours visible** concernant cette US, quel que soit l'état de progression du
personnage.

Justification :

- Cohérent avec la spec (§5) et la notion d'état neutre (§6 état neutre)
- Permet de préparer visuellement les futures interactions (survol, achat)
- Un personnage à 0 XP et 0 rang gratuit affichera simplement la console en état neutre
- La spec prévoit que la console peut afficher « rien n'est sélectionné » comme un état valide

**Conséquence** : Le flag `incomplete.skills` n'est plus utilisé pour la visibilité de la console. Il reste utilisé
uniquement pour le bandeau de création de personnage (`i.creation`).

### 4.2. Clés i18n

**Décision** : Créer un namespace dédié `SKILL.XP_CONSOLE.*` dans les fichiers `lang/en.json` et `lang/fr.json`.

Structure proposée :

```json
{
  "SKILL": {
    "XP_CONSOLE": {
      "TITLE": "XP Transaction Console",
      "STATUS": {
        "IDLE": "Awaiting selection"
      },
      "LABEL": {
        "AVAILABLE": "Available",
        "SPENT": "Spent",
        "CAREER_FREE": "Career Free",
        "SPECIALIZATION_FREE": "Specialty Free",
        "SELECTED_COST": "Selected Cost"
      },
      "PLACEHOLDER": "Select a skill to preview purchase cost."
    }
  }
}
```

### 4.3. Noms de catégories de compétences

**Décision** : Remplacer `skills.general`, `skills.combat`, `skills.knowledge` par `skills.exp`, `skills.kno`,
`skills.soc`.

Les titres de sections utilisent les clés i18n existantes :

- `SKILL.CATEGORY.EXPLORATION.label`
- `SKILL.CATEGORY.KNOWLEDGE.label`
- `SKILL.CATEGORY.SOCIAL.label`

---

## 5. Plan de travail détaillé

### Étape 1 : Audit des données de contexte disponibles

- Lire les champs réellement produits par `#prepareProgression()` dans `base-actor-sheet.mjs`
- Vérifier que `context.progression.experience` contient `available`, `spent`, `total`, `gained`, `startingExperience`
- Vérifier que `context.progression.freeSkillRanks` contient `career` et `specialization` avec `available`
- Documenter tout écart éventuel

### Étape 2 : Stabiliser la visibilité de la console

- Dans `character-sheet.mjs` `_prepareContext()` :
    - Supprimer le `skills: true` de l'objet `incomplete`
    - Remplacer `{{#if incomplete.skills}}` dans `skills.hbs` par une condition ou une absence de condition
    - Si la console est toujours visible, supprimer simplement le `{{#if}}`
    - Si une condition métier est préférée, créer une propriété dédiée (ex : `context.showXpConsole`) non mélangée à
      `incomplete`
- S'assurer que `i.creation` n'est pas impacté (le bandeau de création de personnage doit continuer à fonctionner)

### Étape 3 : Ajouter les clés i18n

- Ajouter le bloc `SKILL.XP_CONSOLE.*` dans `lang/en.json`
- Ajouter la traduction française dans `lang/fr.json`
- Les clés doivent suivre la structure validée en §4.2

Clés à créer :

| Clé i18n                                     | EN                                       | FR                                                      |
|----------------------------------------------|------------------------------------------|---------------------------------------------------------|
| `SKILL.XP_CONSOLE.TITLE`                     | XP Transaction Console                   | Console de transaction XP                               |
| `SKILL.XP_CONSOLE.STATUS.IDLE`               | Awaiting selection                       | En attente de sélection                                 |
| `SKILL.XP_CONSOLE.LABEL.AVAILABLE`           | Available                                | Disponibles                                             |
| `SKILL.XP_CONSOLE.LABEL.SPENT`               | Spent                                    | Dépensés                                                |
| `SKILL.XP_CONSOLE.LABEL.CAREER_FREE`         | Career Free                              | Gratuits carrière                                       |
| `SKILL.XP_CONSOLE.LABEL.SPECIALIZATION_FREE` | Specialty Free                           | Gratuits spécialisation                                 |
| `SKILL.XP_CONSOLE.LABEL.SELECTED_COST`       | Selected Cost                            | Coût sélectionné                                        |
| `SKILL.XP_CONSOLE.PLACEHOLDER`               | Select a skill to preview purchase cost. | Sélectionnez une compétence pour prévisualiser le coût. |

### Étape 4 : Refactorer le template `skills.hbs`

- Remplacer tous les textes hardcodés par `{{localize "SKILL.XP_CONSOLE.*"}}`
- Remplacer les boucles de catégories :
  ```hbs
  {{#each skills.exp}}
  {{#each skills.kno}}
  {{#each skills.soc}}
  ```
- Remplacer les titres de sections par `{{localize "SKILL.CATEGORY.EXPLORATION.label"}}` etc.
- Conserver **tous les `data-*` attributs** existants (`data-xp-console-status`, `data-selected-skill-cost`, etc.) — ils
  sont nécessaires pour US3+
- Laisser la classe CSS `xp-console` et les sous-structures intactes

### Étape 5 : Vérifier la cohérence des données avec `#prepareSkills()`

- Vérifier que le groupement `Object.groupBy(skills, (skill) => skill.type.id)` produit bien des clés `exp`, `kno`,
  `soc` pour tous les skills définis dans `module/config/skills.mjs`
- Vérifier que `skill.type` existe bien pour chaque skill. Si le `type` est un objet avec une propriété `id`, le
  `Object.groupBy` fonctionne. Si c'est une chaîne directe, il faut adapter.

### Étape 6 : Tests de non-régression

Vérifications manuelles à effectuer :

1. **Personnage neuf** (100 XP, 4 rangs carrière, 2 rangs spé)
    - Console visible, compteurs corrects, état neutre

2. **Personnage avec 0 XP, 0 rang gratuit**
    - Console visible, compteurs à zéro, état neutre

3. **Personnage après import OggDude**
    - Console visible, données de progression cohérentes

4. **Changement de langue FR → EN**
    - Tous les textes de la console changent de langue

5. **Rendu des catégories**
    - Les compétences apparaissent sous les bonnes rubriques
    - Plus aucune référence à `general`, `combat`, `knowledge` dans le template

6. **Bandeau de création de personnage**
    - Le bandeau `i.creation` continue de s'afficher quand la création est incomplète
    - Il n'est pas affecté par le changement de visibilité de la console

---

## 6. Fichiers modifiés

| Fichier                                          | Modification                                                         |
|--------------------------------------------------|----------------------------------------------------------------------|
| `templates/sheets/actor/skills.hbs`              | Localisation + correction catégories + visibilité                    |
| `lang/en.json`                                   | Ajout du bloc `SKILL.XP_CONSOLE.*`                                   |
| `lang/fr.json`                                   | Ajout du bloc `SKILL.XP_CONSOLE.*` (traductions françaises)          |
| `module/applications/sheets/character-sheet.mjs` | Nettoyage du flag `incomplete.skills` et de la logique de visibilité |

---

## 7. Risques

| Risque                                                                          | Impact                            | Mitigation                                                               |
|---------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------------------------------------|
| `incomplete.skills = true` est utilisé ailleurs que dans la console             | Régression du bandeau de création | Vérifier toutes les dépendances à `incomplete.skills` avant modification |
| `skill.type.id` n'existe pas pour tous les skills                               | Catégories vides ou erreur        | Vérifier dans `#prepareSkills()` que chaque skill a `type.id`            |
| Clés i18n `SKILL.CATEGORY.*.label` déjà utilisées ailleurs                      | Double affichage                  | Vérifier qu'elles ne sont pas déjà rendues dans le même template         |
| Modèle de données `progression.freeSkillRanks.*.available` pas toujours calculé | Compteurs absents                 | Vérifier que le calcul est fait dans `_prepareContext()` et pas ailleurs |

---

## 8. Proposition d'ordre de commit

1. Ajout des clés i18n dans `lang/en.json` et `lang/fr.json`
2. Nettoyage de `incomplete.skills` dans `character-sheet.mjs`
3. Refactor de `skills.hbs` (localisation + catégories + visibilité)
4. Vérification manuelle et ajustements

---

## 9. Dépendances avec les autres US

```
US1 (fondation)
  ├── US2 (états visuels des lignes) — peut démarrer en parallèle
  ├── US3 (survol) — dépend de US1 pour la structure de la console
  ├── US4 (achat) — dépend de US3 pour l'interaction
  ├── US7 (notifications) — dépend de US4/US5
  └── US8 (pool de dés) — dépend de US3
```

US1 n'a pas de dépendance bloquante. Il peut être implémenté en isolation complète.
