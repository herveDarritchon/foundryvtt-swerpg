---
title: 'Bug OggDude Gear Import – Mauvais mapping des données'
domain: 'oggdude-importer'
purpose: 'bug'
feature: 'oggdude-gear-data-mapping'
version: '1.0'
status: 'draft'
owner: 'SWERPG Core Dev'
createdAt: '2025-11-18'
input-sources:
  - 'OggDude Gear.xml export (Fully Operational & autres suppléments)'
  - 'UI d’import OggDude dans SWERPG (Foundry VTT v13+)'
notes:
  - 'Spécification de besoin pour générer un plan d’implémentation avec l’agent swerpg-plan.'
---

# 1. Contexte & objectif

Le système SWERPG propose un import des données OggDude (fichiers XML) pour éviter au MJ de recréer manuellement tout l’équipement (armes, armures, gear, etc.).  
Actuellement, l’import du fichier `Gear.xml` crée des Items Foundry de type `gear` avec des données système incorrectes ou laissées aux valeurs par défaut, et perd des informations importantes (mods, profil d’arme, etc.).

**Objectif de ce bugfix :**

Assurer un mapping fiable des données `Gear.xml` vers la structure `Item` SWERPG de type `gear`, de manière à ce que les équipements importés :

- aient des valeurs de base correctes (prix, encumbrance, rareté, etc.),
- exposent une description utile,
- conservent les `BaseMods`,
- et ne perdent pas les informations critiques de `WeaponModifiers` (gear utilisable comme arme).

---

# 2. Périmètre

## 2.1 In scope

- Import des entrées `<Gear>` issues d’un fichier `Gear.xml` OggDude, notamment les nœuds :
  - `<Key>`, `<Name>`, `<Description>`, `<Source>`, `<Type>`,
  - `<Price>`, `<Encumbrance>`, `<Rarity>`,
  - `<BaseMods>`,
  - `<WeaponModifiers>` (et leurs sous-champs).
- Création / mise à jour d’Items de type `gear` dans Foundry VTT (système `swerpg`).
- Mapping des champs XML vers les propriétés `system.*` et/ou `flags.swerpg.*` du `Item`.

## 2.2 Out of scope

- Refactor complet de l’architecture du module d’import OggDude.
- Conception d’un système complet “gear-as-weapon” (création automatique d’Items `weapon` liés, automatisation des attaques, etc.).
- Traduction / localisation des descriptions (on garde la langue source).
- Migration automatique des `gear` déjà importés dans des mondes existants (à traiter éventuellement dans une US séparée).

---

# 3. Comportement actuel (bug)

## 3.1 Exemple d’entrée OggDude

```xml
<Gear>
  <Key>BREAKHVYHYDROSP</Key>
  <Name>"Breaker" Heavy Hydrospanner</Name>
  <Description>
    [H3]Regalis Engineering "Breaker" Heavy Hydrospanner[h3]
    Please see page 47 of the Fully Operational Sourcebook for details.
  </Description>
  <Source Page="47">Fully Operational</Source>
  <Type>Tools/Electronics</Type>
  <Price>250</Price>
  <Encumbrance>3</Encumbrance>
  <Rarity>2</Rarity>
  <BaseMods>
    <Mod>
      <MiscDesc>Adds [AD] to Mechanics checks.</MiscDesc>
      <DieModifiers>
        <DieModifier>
          <SkillKey>MECH</SkillKey>
          <AdvantageCount>1</AdvantageCount>
        </DieModifier>
      </DieModifiers>
    </Mod>
    <Mod>
      <MiscDesc>May be used as a weapon.</MiscDesc>
    </Mod>
  </BaseMods>
  <WeaponModifiers>
    <WeaponModifier>
      <Unarmed>false</Unarmed>
      <UnarmedName>Breaker Heavy Hydrospanner</UnarmedName>
      <SkillKey>MELEE</SkillKey>
      <AllSkillKey />
      <Damage>0</Damage>
      <DamageAdd>2</DamageAdd>
      <Crit>4</Crit>
      <CritSub>0</CritSub>
      <RangeValue>wrEngaged</RangeValue>
      <Qualities>
        <Quality>
          <Key>CUMBERSOME</Key>
          <Count>3</Count>
        </Quality>
        <Quality>
          <Key>DISORIENT</Key>
          <Count>1</Count>
        </Quality>
        <Quality>
          <Key>INACCURATE</Key>
          <Count>1</Count>
        </Quality>
      </Qualities>
    </WeaponModifier>
  </WeaponModifiers>
</Gear>
```

## 3.2 Résultat actuellement généré dans Foundry

```json
{
  "name": "\"Breaker\" Heavy Hydrospanner",
  "img": "systems/swerpg/assets/images/icons/gear.svg",
  "type": "gear",
  "system": {
    "category": "",
    "quantity": 1,
    "price": 0,
    "quality": "standard",
    "encumbrance": 1,
    "rarity": 1,
    "broken": false,
    "description": {
      "public": "",
      "secret": ""
    },
    "actions": []
  },
  "folder": "bV0m7raZkYg2VG2J",
  "effects": [],
  "flags": {}
}
```

## 3.3 Constats

- Les valeurs issues du XML ne sont pas reprises :
  - `Price`, `Encumbrance` et `Rarity` sont remplacées par les valeurs par défaut (`0`, `1`, `1`).
  - `Type` est ignoré (`system.category` vide).

- La description est vide alors que `<Description>` contient du texte et une référence à la source.
- Les `BaseMods` sont totalement perdus :
  - Bonus à Mechanics ([AD]) et note “May be used as a weapon” non visibles.

- Les `WeaponModifiers` sont également perdus :
  - Aucun lien ou information sur le profil d’arme possible (Melee, damage+2, crit 4, qualités Cumbersome/Disorient/Inaccurate, etc.).

- `actions` est vide alors que ce gear peut manifestement servir comme arme.

Résultat : l’objet importé ne reflète pas les propriétés attendues du “Breaker Heavy Hydrospanner”, ni en tant qu’outil, ni en tant qu’arme improvisée.

---

# 4. Comportement cible

## 4.1 Objectif métier

Pour le MJ / les joueurs :

- Lorsqu’un équipement est importé depuis `Gear.xml`, il doit :
  - Avoir ses caractéristiques de base correctes (prix, encumbrance, rareté).
  - Afficher une description compréhensible, incluant au minimum :
    - la description OggDude nettoyée,
    - la référence à la source (ouvrage + page).

  - Conserver les `BaseMods` de manière lisible.
  - Conserver les informations critiques de `WeaponModifiers` :
    - même si aucune automatisation complète n’est implémentée, le MJ doit pouvoir voir clairement :
      - que le gear peut être utilisé comme arme,
      - avec quel profil (compétence, dégâts, crit, qualités, portée).

L’objectif est que le MJ n’ait pas à rouvrir OggDude ou le livre pour comprendre ce que fait réellement le gear importé.

---

## 4.2 Mapping XML → Item SWERPG (obligatoire)

Pour toutes les entrées `<Gear>` :

| Source OggDude      | Cible SWERPG (`Item` type `gear`)                            | Remarques                                                          |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `<Key>`             | `flags.swerpg.oggdudeKey`                                    | Trace de l’origine OggDude.                                        |
| `<Name>`            | `name`                                                       | Chaîne brute.                                                      |
| `<Description>`     | `system.description.public`                                  | Voir règles de nettoyage (§4.3).                                   |
| `<Source>` + `Page` | `system.description.public` (append) ou `flags.swerpg.*`     | Au minimum : “Source: Fully Operational, p.47”.                    |
| `<Type>`            | `system.category` ou champ dédié / flags                     | Au minimum : ne pas perdre l’info (ex. `Tools/Electronics`).       |
| `<Price>`           | `system.price`                                               | Entier.                                                            |
| `<Encumbrance>`     | `system.encumbrance`                                         | Entier.                                                            |
| `<Rarity>`          | `system.rarity`                                              | Entier.                                                            |
| `<BaseMods>`        | description + éventuellement données structurées (`flags.*`) | Ne pas perdre les descriptions ni les modificateurs renseignés.    |
| `<WeaponModifiers>` | description + éventuellement données structurées (`flags.*`) | Ne pas perdre le profil d’arme, même sans automatisation complète. |

> NB : Comme pour les bugs d’import Weapons / Armor, ce bugfix vise d’abord à **ne plus perdre de données** et à rendre le gear correctement exploitable par le MJ.
> Toute automatisation avancée (actions d’arme, Active Effects, jet auto) est à réserver à des features ultérieures.

---

## 4.3 Règles de nettoyage de description

À partir de `<Description>` :

- Supprimer / normaliser les balises OggDude `[H3]` / `[h3]` :
  - soit les remplacer par `###` en markdown,
  - soit les supprimer, mais de façon cohérente avec les autres imports (Weapons / Armor).

- Conserver les retours à la ligne significatifs.
- Ajouter en bas de description la source :
  - `Source: Fully Operational, p.47`

- Les codes de dés `[AD]` (et autres, si présents) peuvent être conservés tels quels.

Exemple attendu (version simple) :

```text
Regalis Engineering "Breaker" Heavy Hydrospanner

Please see page 47 of the Fully Operational Sourcebook for details.
Source: Fully Operational, p.47
```

---

## 4.4 Gestion des `BaseMods`

Les `BaseMods` décrivent les bonus / capacités par défaut du gear.

Exemple :

```xml
<BaseMods>
  <Mod>
    <MiscDesc>Adds [AD] to Mechanics checks.</MiscDesc>
    <DieModifiers>
      <DieModifier>
        <SkillKey>MECH</SkillKey>
        <AdvantageCount>1</AdvantageCount>
      </DieModifier>
    </DieModifiers>
  </Mod>
  <Mod>
    <MiscDesc>May be used as a weapon.</MiscDesc>
  </Mod>
</BaseMods>
```

**Objectif minimal :**

- Ne pas perdre l’information.
- Ajouter une section “Base Mods” en bas de la description publique :

```text
Base Mods:
- Adds [AD] to Mechanics checks.
- May be used as a weapon.
```

**Optionnel / préparatoire (flags, hors scope fort du bugfix) :**

- Stocker également une version structurée dans :
  - `flags.swerpg.oggdude.baseMods`, reprenant éventuellement :
    - `SkillKey` (`MECH`),
    - `AdvantageCount` (`1`),
    - etc.

- Ceci prépare de futures features d’automatisation, sans y engager ce bugfix.

---

## 4.5 Gestion des `WeaponModifiers` (gear utilisable comme arme)

Les `WeaponModifiers` définissent un **profil d’arme associé au gear**.
Pour le “Breaker Heavy Hydrospanner” :

- Compétence : `MELEE`
- Dégâts : `Damage=0`, `DamageAdd=2` → typiquement “Brawn + 2”
- Critique : `4`
- Portée : `wrEngaged` (donc `engaged`)
- Qualités : `CUMBERSOME 3`, `DISORIENT 1`, `INACCURATE 1`
- Nom d’arme : `Breaker Heavy Hydrospanner` (hors guillemets, version destinée au profil de combat).

**Objectif minimal :**

- Ne pas perdre l’info, même sans créer un Item `weapon` séparé.
- Ajouter une section dédiée dans la description, par exemple :

```text
Weapon Use:
- Can be used as a melee weapon.
- Skill: Melee
- Damage: Brawn + 2
- Crit: 4
- Range: Engaged
- Qualities:
  - Cumbersome 3
  - Disorient 1
  - Inaccurate 1
```

**Optionnel (à jalonner clairement dans le plan comme “future evolution”) :**

- Stocker une structure exploitable dans `flags.swerpg.oggdude.weaponProfile`, par exemple :

```json
{
  "skillKey": "MELEE",
  "damage": 0,
  "damageAdd": 2,
  "crit": 4,
  "rangeValue": "wrEngaged",
  "qualities": [
    { "key": "cumbersome", "rank": 3 },
    { "key": "disorient", "rank": 1 },
    { "key": "inaccurate", "rank": 1 }
  ]
}
```

- Préparer le terrain pour :
  - la création automatique d’une `action` d’attaque dans `system.actions`,
  - ou la génération d’un Item `weapon` lié, dans une feature dédiée future.

Pour ce bugfix, il est acceptable de rester au niveau **description + flags**, tant que rien n’est perdu.

---

## 4.6 Champ `Type` / taxonomie

Le `<Type>` de Gear (ex. `Tools/Electronics`) ne doit pas être perdu.

**Exigence minimale :**

- Conserver la valeur, soit :
  - dans `system.category` si c’est cohérent avec la taxonomie actuelle de SWERPG,
  - soit dans `flags.swerpg.oggdude.type` si la taxonomie globale n’est pas encore fixée.

Les décisions d’architecture sur la taxonomie complète (gear / weapons / armor) sont à traiter dans des issues / specs d’architecture dédiées.

---

# 5. Contraintes & hypothèses

## 5.1 Contraintes techniques

- Compatibilité Foundry VTT v13+.
- Le module d’import OggDude doit rester utilisable pour des volumes importants de données (nombreux entry `<Gear>`).
- Le bugfix ne doit pas casser l’import des autres types OggDude (Weapons, Armor, etc.), surtout si du code utilitaire partagé est factorisé.

## 5.2 Hypothèses

- Le schéma `system` d’un Item `gear` est stable et inclut au minimum :
  - `system.price`, `system.encumbrance`, `system.rarity`,
  - `system.category`,
  - `system.description.public`.

- `system.actions` existe, mais ce bugfix ne requiert pas d’y définir une action d’attaque complète :
  - la création d’actions structurées (attaques) à partir de `WeaponModifiers` est considérée comme une **feature future**.

- Les icônes / dossier (`img`, `folder`) suivent la logique déjà existante et ne sont pas concernés par le bug.

---

# 6. Exemples détaillés

## 6.1 Entrée XML (rappel)

```xml
<Gear>
  <Key>BREAKHVYHYDROSP</Key>
  <Name>"Breaker" Heavy Hydrospanner</Name>
  <Description>
    [H3]Regalis Engineering "Breaker" Heavy Hydrospanner[h3]
    Please see page 47 of the Fully Operational Sourcebook for details.
  </Description>
  <Source Page="47">Fully Operational</Source>
  <Type>Tools/Electronics</Type>
  <Price>250</Price>
  <Encumbrance>3</Encumbrance>
  <Rarity>2</Rarity>
  <BaseMods>...</BaseMods>
  <WeaponModifiers>...</WeaponModifiers>
</Gear>
```

## 6.2 Résultat attendu (structure illustrée)

> NB : ce JSON est illustratif ; le plan d’implémentation précisera ce qui est obligatoire (description, champs simples) vs optionnel (flags structurés).

```json
{
  "name": "\"Breaker\" Heavy Hydrospanner",
  "img": "systems/swerpg/assets/images/icons/gear.svg",
  "type": "gear",
  "system": {
    "category": "tools-electronics", // ou valeur existante, mais non vide
    "quantity": 1,
    "price": 250, // ← Price
    "quality": "standard",
    "encumbrance": 3, // ← Encumbrance
    "rarity": 2, // ← Rarity
    "broken": false,
    "description": {
      "public": "Regalis Engineering \"Breaker\" Heavy Hydrospanner\n\nPlease see page 47 of the Fully Operational Sourcebook for details.\nSource: Fully Operational, p.47\n\nBase Mods:\n- Adds [AD] to Mechanics checks.\n- May be used as a weapon.\n\nWeapon Use:\n- Can be used as a melee weapon.\n- Skill: Melee\n- Damage: Brawn + 2\n- Crit: 4\n- Range: Engaged\n- Qualities:\n  - Cumbersome 3\n  - Disorient 1\n  - Inaccurate 1",
      "secret": ""
    },
    "actions": []
  },
  "flags": {
    "swerpg": {
      "oggdudeKey": "BREAKHVYHYDROSP",
      "oggdudeSource": "Fully Operational",
      "oggdudeSourcePage": 47,
      "oggdude": {
        "type": "Tools/Electronics",
        "baseMods": [
          /* optionnel : version structurée des BaseMods */
        ],
        "weaponProfile": {
          "skillKey": "MELEE",
          "damage": 0,
          "damageAdd": 2,
          "crit": 4,
          "rangeValue": "wrEngaged",
          "qualities": [
            { "key": "cumbersome", "rank": 3 },
            { "key": "disorient", "rank": 1 },
            { "key": "inaccurate", "rank": 1 }
          ]
        }
      }
    }
  }
}
```

---

# 7. Critères d’acceptation

1. **Import de base correct**
   - Étant donné un `Gear.xml` contenant `"Breaker" Heavy Hydrospanner`,
   - Quand je lance l’import OggDude Gear,
   - Alors l’Item `gear` créé dans Foundry :
     - a `system.price = 250`,
     - a `system.encumbrance = 3`,
     - a `system.rarity = 2`,
     - n’a plus `system.category` vide (type / catégorie conservée).

2. **Description non vide et informative**
   - La description publique contient :
     - le texte de description OggDude (sans balises `[H3]`),
     - la source au format “Source: Fully Operational, p.47”,
     - une section “Base Mods” listant les `MiscDesc` des `BaseMods`,
     - une section “Weapon Use” résumant clairement le profil d’arme issu de `WeaponModifiers`.

3. **Conservation des mods et profil d’arme**
   - Aucun des éléments suivants n’est perdu :
     - “Adds [AD] to Mechanics checks.”,
     - “May be used as a weapon.”,
     - compétence Melee, damage+2, crit 4, portée Engaged,
     - qualités Cumbersome 3, Disorient 1, Inaccurate 1.

   - Ces informations sont au minimum lisibles dans la description.

4. **Non-régression**
   - L’import d’autres Gear sans `WeaponModifiers` ne casse pas et reste cohérent (simple gear sans section “Weapon Use” si inexistant).
   - Les imports Armor / Weapons restent fonctionnels (et, si leurs bugfixes sont en place, compatibles avec ce changement).
