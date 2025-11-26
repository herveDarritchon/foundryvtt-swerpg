---
title: 'Bug OggDude Talent Import – Mauvais mapping des données'
domain: 'oggdude-importer'
purpose: 'bug'
feature: 'oggdude-talent-data-mapping'
version: '1.0'
status: 'draft'
owner: 'SWERPG Core Dev'
createdAt: '2025-11-18'
input-sources:
  - 'OggDude Talent.xml export (Unlimited Power & autres suppléments)'
  - 'UI d’import OggDude dans SWERPG (Foundry VTT v13+)'
notes:
  - 'Spécification de besoin pour générer un plan d’implémentation avec l’agent swerpg-plan.'
---

# 1. Contexte & objectif

Le système SWERPG propose un import des données OggDude (fichiers XML) pour éviter au MJ de recréer manuellement tous les Talents dans Foundry VTT.

Actuellement, l’import du fichier `Talent.xml` crée des Items Foundry de type `talent` avec :

- des **données système incorrectes** (ex. `isRanked` toujours à `false`),
- des **informations perdues** (description, source, modificateurs de dés).

Exemple de Talent dans OggDude :

```xml
<Talent>
  <Key>SECRETLORE</Key>
  <Name>Secret Lore</Name>
  <Description>Please see page 33 of the Unlimited Power Sourcebook for details.</Description>
  <Sources>
    <Source Page="33">Unlimited Power</Source>
  </Sources>
  <Ranked>true</Ranked>
  <ActivationValue>taPassive</ActivationValue>
  <DieModifiers>
    <DieModifier>
      <SkillKey>LORE</SkillKey>
      <SetbackCount>1</SetbackCount>
    </DieModifier>
    <DieModifier>
      <SkillKey>LORE</SkillKey>
      <DecreaseDifficultyCount>1</DecreaseDifficultyCount>
      <ApplyOnce>true</ApplyOnce>
    </DieModifier>
  </DieModifiers>
</Talent>
```

Résultat actuel dans Foundry (simplifié) :

```json
{
  "name": "Secret Lore",
  "img": "systems/swerpg/assets/images/icons/talent.svg",
  "type": "talent",
  "system": {
    "node": "",
    "trees": [],
    "isRanked": false,
    "row": 1,
    "rank": {
      "idx": 0,
      "cost": 0
    },
    "activation": "passive",
    "isFree": false,
    "actions": [],
    "actorHooks": []
  },
  "flags": {}
}
```

**Objectif de ce bugfix :**

Assurer un **mapping fiable** des données `Talent.xml` vers la structure `Item` SWERPG de type `talent`, de manière à ce que les Talents importés :

- aient leurs **propriétés de base correctes** (`isRanked`, `activation`),
- conservent une **description utile** et la **source** (livre + page),
- ne perdent pas les **modificateurs de dés** (au minimum en description lisible, idéalement aussi en structure dans les flags).

---

# 2. Périmètre

## 2.1 In scope

- Import des entrées `<Talent>` issues de `Talent.xml`, notamment :
  - `<Key>`, `<Name>`, `<Description>`,
  - `<Sources>` / `<Source>` (ouvrage + page),
  - `<Ranked>`,
  - `<ActivationValue>`,
  - `<DieModifiers>` (et leurs sous-champs).

- Création / mise à jour d’Items de type `talent` dans Foundry (système `swerpg`).
- Mapping XML → champs `system.*` et `flags.swerpg.*` des Items `talent`.

## 2.2 Out of scope

- Conception / refactor complet du modèle de données des Talents SWERPG (arbres, nodes, etc.).
- Mise en place d’une automatisation complète des Talents (génération automatique de `actorHooks` ou d’`actions` à partir des `DieModifiers`).
- Gestion avancée des arbres de talents (`trees`, `node`, `row`, etc.) :
  - l’import de `Talent.xml` est considéré ici comme import de **Talents “isolés”**, pas comme définition complète de Talent Trees.

- Migration automatique de Talents déjà importés dans des mondes existants (peut faire l’objet d’une issue séparée).

---

# 3. Comportement actuel (bug)

## 3.1 Constats sur l’exemple `SECRETLORE`

À partir du XML :

- `Ranked` est à `true`,
- `ActivationValue` vaut `taPassive`,
- le Talent a :
  - une description,
  - une source (`Unlimited Power`, page 33),
  - des `DieModifiers` sur la compétence `LORE`.

Résultat dans Foundry :

- `system.isRanked` est à `false` → **incorrect** pour un Talent marqué `Ranked=true`.
- `system.activation` est fixé à `"passive"` dans cet exemple, mais :
  - on ne sait pas si le mapping est systématique pour les autres valeurs (`taActive`, `taIncidental`, etc.),
  - il n’y a aucun contrôle / validation.

- Aucune description n’est présente (`system.description` absent ou vide).
- La source (`Unlimited Power`, page 33) est **perdue**.
- Les `DieModifiers` sont **complètement ignorés** :
  - rien dans `actions`,
  - rien dans `actorHooks`,
  - rien dans `flags`,
  - rien dans la description.

En pratique, le Talent importé n’apporte quasiment **aucune information utile** au MJ, à part son nom et son activation.

---

# 4. Comportement cible

## 4.1 Objectif métier

Pour le MJ / les joueurs, après import :

- Un Talent doit :
  - refléter correctement s’il est **à rangs multiples** (`isRanked = true/false`),
  - avoir une **activation correcte** (passive, active, etc.),
  - présenter une **description lisible**,
  - préciser clairement sa **source** (livre + page),
  - ne pas perdre les informations de type **modificateur de dés** (au minimum, sous forme de texte lisible).

Résultat attendu :

- Le MJ peut, à partir de la fiche du Talent importé :
  - savoir d’où il vient (ouvrage / page),
  - voir si le Talent est ranké ou non,
  - comprendre les effets mécaniques de base (même si ceux-ci ne sont pas encore automatisés).

---

## 4.2 Mapping XML → Item `talent` (obligatoire)

| Source OggDude                     | Cible SWERPG (`Item` type `talent`)                              | Remarques                                                                   |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `<Key>`                            | `flags.swerpg.oggdudeKey`                                        | Trace d’origine OggDude.                                                    |
| `<Name>`                           | `name`                                                           | Chaîne brute.                                                               |
| `<Description>`                    | `system.description.public`                                      | Voir règles de nettoyage ci-dessous.                                        |
| `<Sources>/<Source>` (book + page) | `system.description.public` (append) **et/ou** `flags.swerpg.*`  | Au minimum : “Source: Unlimited Power, p.33”.                               |
| `<Ranked>`                         | `system.isRanked`                                                | `true`/`false` fidèle au XML.                                               |
| `<ActivationValue>`                | `system.activation`                                              | Mapping enum OggDude → enum interne SWERPG (`taPassive` → `passive`, etc.). |
| `<DieModifiers>`                   | description + éventuellement `flags.swerpg.oggdude.dieModifiers` | Ne pas perdre les effets (SkillKey, SetbackCount, etc.).                    |

---

## 4.3 Description & source

À partir de `<Description>` et `<Sources>` :

- Copier le texte de `<Description>` dans `system.description.public`.
- Ajouter en bas de description :
  - `Source: Unlimited Power, p.33` (ou équivalent, selon `<Source>`/`Page`).

- Conserver les retours à la ligne significatifs.
- Ne pas tenter de “deviner” ou reformuler les règles du Talent à ce stade :
  - si le texte ne contient qu’un renvoi au livre, on **le garde tel quel**.

Exemple de description minimale pour `SECRETLORE` :

```text
Please see page 33 of the Unlimited Power Sourcebook for details.
Source: Unlimited Power, p.33
```

_(Les mécaniques issues de `DieModifiers` seront ajoutées en section dédiée, cf. ci-dessous.)_

---

## 4.4 `Ranked` → `isRanked`

Règle simple :

- Si `<Ranked>true</Ranked>` → `system.isRanked = true`.
- Si `<Ranked>false</Ranked>` (ou absent) → `system.isRanked = false`.

Le champ `system.rank.idx` reste à sa valeur par défaut (0) tant que le Talent n’est pas incorporé dans une arborescence (la logique d’arbres est hors scope de ce bugfix).

---

## 4.5 `ActivationValue` → `activation`

Mapping à définir de façon **systématique** :

Exemples typiques (à adapter au vocabulaire déjà en place dans SWERPG) :

- `taPassive` → `system.activation = "passive"`
- `taActive` → `system.activation = "active"`
- `taIncidental` / `taIncidentalOutOfTurn` → valeurs internes cohérentes (`"incidental"`, `"incidental-out-of-turn"` ou équivalent).
- etc.

Pour ce bugfix :

- S’assurer que la valeur `taPassive` du Talent `SECRETLORE` est **correctement mappée** à l’activation passive.
- Garantir que l’import ne laisse pas `activation` vide ou incohérent quand `<ActivationValue>` est présent.

> Les détails exhaustifs de la table de mapping peuvent être précisés dans le plan d’implémentation, mais le besoin métier est clair : l’activation doit être correctement renseignée.

---

## 4.6 Gestion des `DieModifiers`

Les `DieModifiers` décrivent des effets mécaniques du Talent.

Exemple :

```xml
<DieModifiers>
  <DieModifier>
    <SkillKey>LORE</SkillKey>
    <SetbackCount>1</SetbackCount>
  </DieModifier>
  <DieModifier>
    <SkillKey>LORE</SkillKey>
    <DecreaseDifficultyCount>1</DecreaseDifficultyCount>
    <ApplyOnce>true</ApplyOnce>
  </DieModifier>
</DieModifiers>
```

**Objectif minimal :**

- Ne pas perdre ces informations.
- Les rendre visibles dans la description du Talent, via une section dédiée (par exemple “Die Modifiers” ou “Effets”).

Proposition de rendu texte :

```text
Die Modifiers:
- Skill LORE: +1 Setback die.
- Skill LORE: Decrease difficulty by 1 (Apply once).
```

_(Le format exact peut être ajusté côté plan d’implémentation, tant que l’information est complète et lisible.)_

**Optionnel / préparatoire (mais fortement recommandé en flags, sans automatisation) :**

- Stocker la structure brute ou simplifiée dans :

```json
"flags": {
  "swerpg": {
    "oggdude": {
      "dieModifiers": [
        {
          "skillKey": "LORE",
          "setbackCount": 1
        },
        {
          "skillKey": "LORE",
          "decreaseDifficultyCount": 1,
          "applyOnce": true
        }
      ]
    }
  }
}
```

Cela prépare des features futures (génération de hooks / effets), sans les implémenter dans ce bugfix.

**Hors scope dans ce bugfix :**

- Générer automatiquement des `actorHooks` ou `actions` à partir des `DieModifiers`.
- Appliquer automatiquement ces modificateurs aux jets dans le système.

---

# 5. Contraintes & hypothèses

## 5.1 Contraintes techniques

- Compatibilité Foundry VTT v13+.
- Performance : l’import de plusieurs centaines de Talents ne doit pas provoquer de ralentissements majeurs.
- Non-régression sur :
  - l’import des autres types OggDude (Weapons, Armor, Gear),
  - les Talents créés manuellement dans SWERPG.

## 5.2 Hypothèses

- Le schéma `system` des Items `talent` est déjà défini dans SWERPG et inclut :
  - `system.isRanked`,
  - `system.activation`,
  - `system.description.public`,
  - `system.actions`, `system.actorHooks` (même si non utilisés ici).

- L’UI de fiche de Talent peut déjà afficher :
  - l’activation,
  - la description publique.

- Il n’y a pas encore de UI dédiée pour visualiser les `dieModifiers` structurés :
  - le bugfix s’appuie sur la **description texte** comme canal principal.

---

# 6. Exemple détaillé : `SECRETLORE` après bugfix

**Entrée :** XML OggDude donné plus haut.

**Résultat attendu dans Foundry (simplifié, illustratif) :**

```json
{
  "name": "Secret Lore",
  "img": "systems/swerpg/assets/images/icons/talent.svg",
  "type": "talent",
  "system": {
    "node": "",
    "trees": [],
    "isRanked": true,
    "row": 1,
    "rank": {
      "idx": 0,
      "cost": 0
    },
    "activation": "passive",
    "isFree": false,
    "description": {
      "public": "Please see page 33 of the Unlimited Power Sourcebook for details.\nSource: Unlimited Power, p.33\n\nDie Modifiers:\n- Skill LORE: +1 Setback die.\n- Skill LORE: Decrease difficulty by 1 (Apply once).",
      "secret": ""
    },
    "actions": [],
    "actorHooks": []
  },
  "flags": {
    "swerpg": {
      "oggdudeKey": "SECRETLORE",
      "oggdude": {
        "dieModifiers": [
          {
            "skillKey": "LORE",
            "setbackCount": 1
          },
          {
            "skillKey": "LORE",
            "decreaseDifficultyCount": 1,
            "applyOnce": true
          }
        ]
      }
    }
  }
}
```

> NB : La structure exacte de `flags.swerpg.oggdude.dieModifiers` pourra être ajustée par le plan d’implémentation.
> Le besoin métier est simplement : **ne perdre aucun champ utile** et rendre les effets lisibles.

---

# 7. Critères d’acceptation

1. **Ranked correctement importé**
   - Étant donné un Talent avec `<Ranked>true</Ranked>`,
   - Quand il est importé depuis `Talent.xml`,
   - Alors `system.isRanked` doit être à `true`.

2. **Activation correctement mappée**
   - Étant donné un Talent avec `<ActivationValue>taPassive</ActivationValue>`,
   - Quand il est importé,
   - Alors `system.activation` doit être correctement renseigné (ex. `"passive"`) et non vide.

3. **Description & source préservées**
   - La description publique du Talent contient au minimum :
     - le texte de `<Description>`,
     - la ligne `Source: <Book>, p.<Page>` générée à partir de `<Source>`.

4. **DieModifiers non perdus**
   - Les `DieModifiers` ne sont plus silencieusement ignorés :
     - ils apparaissent sous forme lisible dans la description (section “Die Modifiers” ou équivalent),
     - et/ou sont stockés dans `flags.swerpg.oggdude.dieModifiers`.

5. **Non-régression**
   - L’import de Talents sans `DieModifiers` continue de fonctionner (description + source au minimum).
   - L’import d’autres types OggDude (Weapons, Armor, Gear) n’est pas cassé par ce changement.
