---
title: 'Bug OggDude Weapon Import – Mauvais mapping des données'
domain: 'oggdude-importer'
purpose: 'bug'
feature: 'oggdude-weapon-data-mapping'
version: '1.0'
status: 'draft'
owner: 'SWERPG Core Dev'
createdAt: '2025-11-18'
input-sources:
  - 'OggDude Weapon.xml export (No Disintegrations & autres suppléments)'
  - 'UI d’import OggDude dans SWERPG (Foundry VTT v13+)'
notes:
  - 'Spécification de besoin pour générer un plan d’implémentation avec l’agent swerpg-plan.'
---

# 1. Contexte & objectif

Le système SWERPG propose un import des données OggDude (fichiers XML) afin d’éviter au MJ de recréer manuellement tout l’arsenal (armes, armures, etc.).  
Actuellement, l’import des armes à partir de `Weapon.xml` produit des Items Foundry de type `weapon` avec des données système incorrectes ou laissées aux valeurs par défaut.

**Objectif de ce bugfix :**

Assurer un mapping fiable des données de `Weapon.xml` vers la structure `Item` SWERPG de type `weapon`, de manière à ce que les armes importées soient immédiatement jouables en partie (dégâts, critique, portée, qualités, rareté, prix, etc.) sans retouche manuelle.

---

# 2. Périmètre

## 2.1 In scope

- Import des entrées d’arme issues d’un fichier `Weapon.xml` OggDude :
  - Lecture des nœuds suivants au minimum :
    - `<Key>`, `<Name>`, `<Description>`, `<Source>`, `<Type>`, `<Categories>`,
      `<Encumbrance>`, `<HP>`, `<Price>`, `<Rarity>`, `<Restricted>`,
      `<SkillKey>`, `<Damage>`, `<Crit>`, `<RangeValue>`, `<Range>`,
      `<Qualities>` (avec `<Quality><Key>…</Key><Count>…</Count></Quality>`),
      éventuellement `<SizeHigh>`.
  - Création / mise à jour d’`Item` de type `weapon` dans Foundry VTT (système `swerpg`).
- Mapping des champs XML vers les propriétés `system.*` de l’Item SWERPG.
- Gestion minimale mais correcte des qualités d’arme (`Qualities`).

## 2.2 Out of scope

- Refactor complet de l’architecture du module d’import OggDude.
- Gestion avancée des qualités comme effets actifs complexes (Active Effects fully automatisés).
- Traduction / localisation du texte importé (on conserve la langue originale).
- Import d’autres fichiers OggDude (Armor.xml, Gear, etc.), sauf impact collatéral évident.
- Application rétroactive automatique sur toutes les armes déjà importées dans d’anciens mondes (à clarifier, voir §8).

---

# 3. Comportement actuel (bug)

## 3.1 Exemple d’entrée OggDude

```xml
<Weapon>
  <Key>FIRECALLFLAMEPROJ</Key>
  <Name>"Firecaller" Light Flame Projector</Name>
  <Description>
    [H3]"Firecaller" Light Flame Projector[h3]
    Please see page 44 of the No Disintegrations Sourcebook for details.
  </Description>
  <Source Page="44">No Disintegrations</Source>
  <Type>Explosives/Other</Type>
  <Categories>
    <Category>Ranged</Category>
  </Categories>
  <Encumbrance>4</Encumbrance>
  <HP>1</HP>
  <Price>1200</Price>
  <Rarity>7</Rarity>
  <Restricted>true</Restricted>
  <SkillKey>RANGLT</SkillKey>
  <Damage>5</Damage>
  <Crit>2</Crit>
  <SizeHigh>10</SizeHigh>
  <RangeValue>wrShort</RangeValue>
  <Qualities>
    <Quality>
      <Key>BLAST</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>BURN</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>PIERCE</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>VICIOUS</Key>
      <Count>3</Count>
    </Quality>
  </Qualities>
  <Range>Short</Range>
</Weapon>
```

## 3.2 Résultat actuellement généré dans Foundry

```json
{
  "name": "\"Firecaller\" Light Flame Projector",
  "img": "systems/swerpg/assets/images/icons/weapon.svg",
  "type": "weapon",
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
    "actions": [],
    "hardPoints": 0,
    "equipped": false,
    "skill": "rangedLight",
    "range": "medium",
    "damage": 0,
    "crit": 0,
    "qualities": []
  },
  "folder": "eT1t6cJwpuEMLjA5",
  "effects": [],
  "flags": {}
}
```

## 3.3 Constats

- Les valeurs issues du XML ne sont pas correctement mappées :
  - `system.damage` et `system.crit` restent à `0` alors que `<Damage>` et `<Crit>` sont présents.
  - `system.price`, `system.encumbrance`, `system.hardPoints`, `system.rarity` restent aux valeurs par défaut.
  - `system.category` reste vide alors que `<Type>` et `<Categories>` fournissent de l’information.
  - `system.range` est à `medium` alors que l’arme est clairement `Short`.

- La description est vide alors que le XML contient du texte.
- Les qualités (BLAST 2, BURN 2, PIERCE 2, VICIOUS 3) sont complètement perdues (`system.qualities` vide).
- Le champ `Restricted` n’est pas reflété (ni booléen, ni propriété/tag).

Résultat : l’objet importé n’est pas jouable en l’état, et ne reflète pas les propriétés attendues de l’arme décrite dans OggDude.

---

# 4. Comportement cible

## 4.1 Objectif métier

Pour le MJ / les joueurs :

- Lorsqu’une arme est importée depuis `Weapon.xml`, elle doit :
  - Avoir ses caractéristiques de base correctes (dégâts, critique, portée, prix, encumbrance, rareté, hard points).
  - Afficher une description exploitable comprenant au minimum le texte OggDude nettoyé + la source.
  - Exposer les qualités (Blast, Burn, Pierce, Vicious, etc.) de manière lisible, et idéalement structurée.
  - Conserver l’information sur le type (Explosives/Other, Ranged, Melee, etc.) et le statut `Restricted`.

L’objectif est que le MJ puisse immédiatement équiper un PNJ ou un PJ avec l’arme importée sans passer par une phase de correction manuelle systématique.

---

## 4.2 Mapping XML → Item SWERPG (obligatoire)

Pour toutes les entrées `<Weapon>` :

| Source OggDude             | Cible SWERPG (`Item` type `weapon`)                      | Remarques                                                                                    |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `<Key>`                    | `flags.swerpg.oggdudeKey`                                | Permet de tracer l’origine OggDude.                                                          |
| `<Name>`                   | `name`                                                   | Chaîne brute.                                                                                |
| `<Description>`            | `system.description.public`                              | Voir règles de nettoyage (§4.3).                                                             |
| `<Source>` + `Page`        | `system.description.public` (append) ou `flags.swerpg.*` | Ajouter au minimum une ligne “Source: No Disintegrations, p.44”.                             |
| `<Type>`                   | `system.category` ou propriété dédiée                    | Mapping à définir / normaliser (ex. `"explosives-other"`).                                   |
| `<Categories><Category>`   | propriétés / tags (ex. `system.properties` ou similaire) | Au minimum : ne pas perdre l’info `Ranged` / `Melee` / `Heavy` etc.                          |
| `<Encumbrance>`            | `system.encumbrance`                                     | Entier.                                                                                      |
| `<HP>`                     | `system.hardPoints`                                      | Entier.                                                                                      |
| `<Price>`                  | `system.price`                                           | Crédits, entier.                                                                             |
| `<Rarity>`                 | `system.rarity`                                          | Entier.                                                                                      |
| `<Restricted>`             | booléen ou tag (ex. `system.restricted` / propriété)     | Si `true`, indiquer clairement que l’arme est restreinte.                                    |
| `<SkillKey>`               | `system.skill`                                           | Mapping via table RANGLT → `rangedLight`, etc.                                               |
| `<Damage>`                 | `system.damage`                                          | Entier.                                                                                      |
| `<Crit>`                   | `system.crit`                                            | Entier (valeur du seuil de critique).                                                        |
| `<RangeValue>` / `<Range>` | `system.range`                                           | Utiliser `RangeValue` comme code interne (wrShort → `short`), `Range` en fallback si besoin. |
| `<Qualities>`              | `system.qualities` + éventuellement description          | Ne pas perdre BLAST, BURN, PIERCE, VICIOUS, etc.                                             |
| `<SizeHigh>`               | optionnel : `flags.swerpg.oggdude.sizeHigh`              | Conserver l’info pour usage futur (hors scope mécanique immédiate).                          |

### Points importants

- Le mapping doit s’aligner sur le schéma actuel des Items `weapon` dans SWERPG :
  - Utiliser la même structure que celle générée par l’UI de création d’arme pour `system.qualities`, `system.range`, `system.skill`, etc.
  - Éviter de réinventer un format parallèle.

---

## 4.3 Règles de nettoyage de description

À partir de `<Description>` :

- Supprimer les balises OggDude du type `[H3]` / `[h3]` :
  - Soit en les remplaçant par un titre markdown `###`,
  - Soit en les supprimant, mais de façon **cohérente** avec la logique déjà choisie pour les armures.

- Conserver les retours à la ligne significatifs.
- Conserver les éventuels codes de dés (`[BO]`, `[SE]`, etc.) tels quels.
- Ajouter la source en bas de description :

Exemple attendu (version simple) :

```text
"Firecaller" Light Flame Projector

Please see page 44 of the No Disintegrations Sourcebook for details.
Source: No Disintegrations, p.44
```

---

## 4.4 Type, catégories & restriction

### Type / catégories

- `<Type>` (ici `Explosives/Other`) doit alimenter un champ lisible par le système :
  - Soit `system.category`,
  - Soit un champ structuré (ex. `system.group`, `system.weaponType`) selon ce qui existe déjà dans le schéma.

- `<Categories>` (ex. `Ranged`) doit permettre au MJ de voir immédiatement s’il s’agit d’une arme de tir, de mêlée, etc.
  - Si le système SWERPG dispose déjà d’une taxonomie, s’aligner dessus.
  - Sinon, au minimum, stocker les catégories comme tags (liste de chaînes) sans les perdre.

### Restricted

- Si `<Restricted>true</Restricted>` :
  - Ajouter un booléen `system.restricted = true` **ou**
  - Ajouter un tag `restricted` dans la liste de propriétés / qualités contextuelles de l’arme.

- L’info doit être visible dans la fiche d’arme (de manière cohérente avec l’UI).

---

## 4.5 Portée & compétence

### Compétence (SkillKey → system.skill)

- Exemple : `RANGLT` (Ranged - Light) → `system.skill = "rangedLight"`.
- Le mapping doit utiliser la même table que celle déjà potentiellement utilisée ailleurs dans le système (pour lier items et compétences d’acteur).
- En cas de `SkillKey` inconnu, prévoir une stratégie de fallback (ex. `system.skill = null` + avertissement loggué).

### Portée (RangeValue / Range → system.range)

- `RangeValue` contient une valeur codée (`wrShort`, `wrMedium`, etc.).
- `Range` contient la version lisible (`Short`, `Medium`, …).
- Le mapping doit :
  - Utiliser `RangeValue` comme source de vérité pour `system.range` (ex. `wrShort` → `"short"`),
  - Utiliser `Range` en fallback si `RangeValue` est manquante ou incohérente,
  - S’aligner sur les valeurs d’énumération déjà utilisées dans SWERPG (`engaged`, `short`, `medium`, `long`, `extreme`, etc.).

Exemple attendu pour l’arme d’exemple : `system.range = "short"`.

---

## 4.6 Gestion des qualités (Qualities)

Les qualités (Blast, Burn, Pierce, Vicious, etc.) sont centrales dans le gameplay FFG/SWERPG.

### Objectif minimal

- **Ne plus perdre l’information** :
  - `BLAST 2`, `BURN 2`, `PIERCE 2`, `VICIOUS 3` doivent être visibles **au moins** :
    - dans `system.qualities` sous une forme structurée,
    - et/ou dans la description (par exemple sous forme de liste à puces).

### Format structuré (à adapter au schéma existant)

- Si le schéma `weapon` dispose déjà d’une structure (ex. un tableau d’objets) :

  Exemple conceptuel (à ajuster à la réalité du système) :

  ```json
  "qualities": [
    { "key": "blast", "rank": 2, "active": true },
    { "key": "burn", "rank": 2, "active": true },
    { "key": "pierce", "rank": 2, "active": true },
    { "key": "vicious", "rank": 3, "active": true }
  ]
  ```

- Les clés doivent être normalisées (ex. `BLAST` → `"blast"`, `VICIOUS` → `"vicious"`).

### Fallback descriptif

- En complément (ou en attendant un support complet) :
  - Ajouter une section “Qualities” en bas de la description :

    ```text
    Qualities:
    - Blast 2
    - Burn 2
    - Pierce 2
    - Vicious 3
    ```

---

## 4.7 Champs hors scope / optionnels

- `<SizeHigh>` : interprétation non critique pour la jouabilité immédiate.
  - Scope minimal : conserver la valeur dans `flags.swerpg.oggdude.sizeHigh` pour usage futur.
  - Pas d’impact immédiat sur les jets ou feuilles de personnage.

---

# 5. Contraintes & hypothèses

## 5.1 Contraintes techniques

- Compatibilité Foundry VTT v13+ :
  - Utiliser les APIs v13 pour la création / mise à jour d’Items (`Item.create`, `fromCompendium`, etc.).

- Le module d’import peut traiter des centaines d’armes :
  - Le parsing XML et la création d’Items doivent rester raisonnablement performants.

- Ne pas casser l’import d’autres types de données OggDude :
  - Le bugfix doit être localisé à l’import des armes ou utiliser des fonctions utilitaires partagées sans régression.

## 5.2 Hypothèses

- Le schéma `system` des Items `weapon` est stable et conforme à l’exemple fourni :
  - Présence de `system.damage`, `system.crit`, `system.range`, `system.skill`,
    `system.price`, `system.encumbrance`, `system.rarity`, `system.hardPoints`, `system.qualities`.

- Il existe (ou il est acceptable de créer) une table de mapping entre les `SkillKey` OggDude (RANGLT, RANGHV, MELEE, BRWL, etc.) et les identifiers de compétence SWERPG (`rangedLight`, `rangedHeavy`, etc.).
- L’UI de fiche d’arme SWERPG sait déjà afficher `system.qualities` dans un format exploitable :
  - L’implémentation du bugfix s’alignera sur cette logique, sans refonte de l’UI.

---

# 6. Exemples détaillés

## 6.1 Entrée XML d’exemple (rappel)

```xml
<Weapon>
  <Key>FIRECALLFLAMEPROJ</Key>
  <Name>"Firecaller" Light Flame Projector</Name>
  <Description>
    [H3]"Firecaller" Light Flame Projector[h3]
    Please see page 44 of the No Disintegrations Sourcebook for details.
  </Description>
  <Source Page="44">No Disintegrations</Source>
  <Type>Explosives/Other</Type>
  <Categories>
    <Category>Ranged</Category>
  </Categories>
  <Encumbrance>4</Encumbrance>
  <HP>1</HP>
  <Price>1200</Price>
  <Rarity>7</Rarity>
  <Restricted>true</Restricted>
  <SkillKey>RANGLT</SkillKey>
  <Damage>5</Damage>
  <Crit>2</Crit>
  <SizeHigh>10</SizeHigh>
  <RangeValue>wrShort</RangeValue>
  <Qualities>
    <Quality>
      <Key>BLAST</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>BURN</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>PIERCE</Key>
      <Count>2</Count>
    </Quality>
    <Quality>
      <Key>VICIOUS</Key>
      <Count>3</Count>
    </Quality>
  </Qualities>
  <Range>Short</Range>
</Weapon>
```

## 6.2 Résultat attendu (structure cible, illustratif)

> NB : la structure exacte de `system.qualities` doit être alignée avec le schéma réel. Ci-dessous : illustration conceptuelle.

```json
{
  "name": "\"Firecaller\" Light Flame Projector",
  "type": "weapon",
  "img": "systems/swerpg/assets/images/icons/weapon.svg",
  "system": {
    "category": "explosives-other",
    "quantity": 1,
    "price": 1200,
    "quality": "standard",
    "encumbrance": 4,
    "rarity": 7,
    "broken": false,
    "description": {
      "public": "\"Firecaller\" Light Flame Projector\n\nPlease see page 44 of the No Disintegrations Sourcebook for details.\nSource: No Disintegrations, p.44\n\nQualities:\n- Blast 2\n- Burn 2\n- Pierce 2\n- Vicious 3",
      "secret": ""
    },
    "actions": [],
    "hardPoints": 1,
    "equipped": false,
    "skill": "rangedLight",
    "range": "short",
    "damage": 5,
    "crit": 2,
    "qualities": [
      { "key": "blast", "rank": 2 },
      { "key": "burn", "rank": 2 },
      { "key": "pierce", "rank": 2 },
      { "key": "vicious", "rank": 3 }
    ]
  },
  "flags": {
    "swerpg": {
      "oggdudeKey": "FIRECALLFLAMEPROJ",
      "oggdudeSource": "No Disintegrations",
      "oggdudeSourcePage": 44,
      "oggdude": {
        "sizeHigh": 10
      }
    }
  }
}
```

---

# 7. Critères d’acceptation

1. **Import d’une arme simple**
   - Étant donné un fichier `Weapon.xml` contenant l’entrée `"Firecaller" Light Flame Projector`,
   - Quand je lance l’import OggDude Weapons,
   - Alors l’Item `weapon` créé dans Foundry :
     - a `system.damage = 5`,
     - a `system.crit = 2`,
     - a `system.range = "short"`,
     - a `system.skill = "rangedLight"`,
     - a `system.encumbrance = 4`,
     - a `system.hardPoints = 1`,
     - a `system.price = 1200`,
     - a `system.rarity = 7`.

2. **Conservation du type et des catégories**
   - Le type `Explosives/Other` et la catégorie `Ranged` sont visibles sous forme de `system.category` et/ou de tags clairement identifiables.

3. **Description non vide et source visible**
   - La description publique contient au minimum :
     - le nom de l’arme,
     - le texte de description OggDude nettoyé,
     - une ligne de référence à la source (“Source: No Disintegrations, p.44”).

4. **Qualités visibles**
   - Les qualités BLAST 2, BURN 2, PIERCE 2, VICIOUS 3 :
     - sont présentes dans `system.qualities` sous une forme structurée cohérente avec le schéma,
     - et/ou sont listées de façon lisible dans la description.

5. **Restriction visible**
   - Le statut `Restricted=true` est reflété, soit par un booléen dédié (`system.restricted`), soit par un tag visible sur la fiche d’arme.

6. **Non-régression**
   - L’import d’autres armes OggDude ne produit plus d’Items avec dégâts/critique/portée à 0 ou `medium` par défaut quand le XML fournit une valeur.
   - L’import des autres types d’objets (armures, gear, etc.) continue de fonctionner comme avant (ou mieux si un code partagé est factorisé).

---

# 8. Points à clarifier pour le plan / auprès du PO

Ces éléments devront être explicitement traités dans le plan d’implémentation généré par `swerpg-plan` (section CON-XXX / Assumptions) :

- **Format exact de `system.qualities`** :
  - Quel est le schéma actuel utilisé dans SWERPG pour les qualités d’armes ?
  - Faut-il aligner OggDude sur un format déjà existant (probable) ou définir une nouvelle structure standard ?

- **Destinataire de `<Type>` et `<Categories>`** :
  - `system.category` vs champ dédié (ex. `system.group`) ?
  - Faut-il aligner avec une liste prédéfinie (enum) ou accepter des valeurs libres ?

- **Visibilité de `Restricted` dans l’UI** :
  - Doit-elle apparaître sous forme d’icône, de tag texte, d’un champ booléen, … ?

- **Traitement des armes déjà importées** :
  - le scope se limite aux futurs imports

- **Gestion de `SizeHigh`** :
  - Simple stockage dans `flags.swerpg.oggdude.sizeHigh` comme proposé,
  * C'est une “future evolution” donc non traité pour ce bugfix.
  *

### Clarifications produit / périmètre de ce bugfix

Pour cette US, l’objectif est **uniquement** de corriger le mapping des données OggDude à l’import.  
Les sujets suivants sont **traités au strict minimum** et explicitement reportés à de futures features plus larges.

- **`system.qualities`**
  - Objectif de ce bugfix : ne plus perdre l’information sur les qualités OggDude (BLAST, BURN, etc.).
  - Exigence minimale :
    - Les qualités doivent être **au moins lisibles** par le MJ (ex. liste textuelle ajoutée dans la description).
    - Si le système SWERPG dispose **déjà** d’un format structuré pour `system.qualities`, l’import doit **simplement l’alimenter** en respectant ce format existant, sans le redéfinir.
  - Hors scope pour cette US :
    - Redéfinition du format canonique de `system.qualities`.
    - Décision sur une enum globale de qualités, ou sur la structure définitive (objets vs chaînes, flags, etc.).
    - Toute logique d’automatisation basée sur les qualités (modificateurs de dés, effets automatiques, etc.).

- **Mapping de `<Type>` et `<Categories>`**
  - Objectif de ce bugfix : ne plus perdre ces informations à l’import.
  - Exigence minimale :
    - Les valeurs de `<Type>` et `<Categories>` doivent être **conservées quelque part** dans l’Item (champ système existant ou `flags.swerpg.*`), même si leur usage reste purement informatif.
  - Hors scope pour cette US :
    - Définir une taxonomie “officielle” (enum) des types d’armes dans SWERPG.
    - Décider définitivement si `system.category` représente la famille mécanique, le type narratif, ou autre.
    - Mettre en place des filtres, tris ou comportements UI basés sur ces champs.

- **Visibilité de `Restricted`**
  - Objectif de ce bugfix : ne plus perdre l’info `Restricted` à l’import.
  - Exigence minimale :
    - La valeur `<Restricted>true/false</Restricted>` doit être **stockée** (ex. `system.restricted` ou `flags.swerpg.restricted`), de façon fiable.
    - Aucun comportement mécanique supplémentaire n’est attendu dans cette US.
  - Hors scope pour cette US :
    - Design UI détaillé (icône, badge, couleur spécifique, filtres sur les listes, etc.).
    - Mise en place d’un système de “légalité” ou de règles spéciaux pour les objets restreints.

- **Traitement des armes déjà importées**
  - Objectif de ce bugfix : fiabiliser les **futurs imports**.
  - Décision pour cette US :
    - Le périmètre de correction porte **uniquement** sur les nouveaux imports de `Weapon.xml`.
    - Aucun mécanisme automatique de migration / réparation des armes déjà présentes dans les mondes existants n’est prévu dans cette US.
  - Hors scope pour cette US :
    - Script de migration, bouton “Réparer les armes OggDude”, ou réimport automatique des anciens objets.
    - Stratégie fine pour détecter / préserver les modifications manuelles des MJ sur des armes déjà importées.

- **Gestion de `SizeHigh`**
  - Objectif de ce bugfix : ne pas perdre l’information.
  - Exigence minimale :
    - La valeur `<SizeHigh>` doit être **conservée** (par exemple dans `flags.swerpg.oggdude.sizeHigh`), sans effet mécanique ni UI particulier pour l’instant.
  - Hors scope pour cette US :
    - Toute mécanique de “taille / silhouette / nombre de cibles” basée sur `SizeHigh`.
    - Exposition UI dédiée, champs visibles ou règles spéciales associées à ce paramètre.

En résumé : ce bugfix vise à **corriger le mapping et préserver toutes les données utiles** à partir de `Weapon.xml`, tout en **évacuant les décisions d’architecture et d’UX plus profondes** vers de futures features (où elles seront formalisées en tant que `feature`/`architecture` plans dédiés).
