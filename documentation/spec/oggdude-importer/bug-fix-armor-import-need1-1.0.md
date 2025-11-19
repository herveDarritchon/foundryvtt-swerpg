---
title: 'Bug OggDude Armor Import – Mauvais mapping des données'
domain: 'oggdude-importer'
purpose: 'bug'
feature: 'oggdude-armor-data-mapping'
version: '1.0'
status: 'draft'
owner: 'SWERPG Core Dev'
createdAt: '2025-11-17'
input-sources:
  - 'OggDude Armor.xml export (Rise of the Separatists)'
  - 'UI d’import OggDude dans SWERPG (Foundry VTT v13+)'
notes:
  - 'Spécification de besoin pour générer un plan d’implémentation avec l’agent swerpg-plan.'
---

# 1. Contexte & objectif

Le système SWERPG propose un import des données OggDude (fichiers XML) pour éviter au MJ de recréer manuellement tout l’équipement.  
Actuellement, l’import des armures à partir de `Armor.xml` produit des Items Foundry de type `armor` avec des données système incorrectes ou par défaut (valeurs à 0, description vide, etc.).

**Objectif de ce bugfix :**

Assurer un mapping fiable des données du XML OggDude vers la structure `Item` SWERPG de type `armor`, de manière à ce que les armures importées soient directement jouables en partie sans retouche manuelle.

---

# 2. Périmètre

## 2.1 In scope

- Import des entrées d’armure issues d’un fichier `Armor.xml` OggDude :
  - Lecture des noeuds suivants au minimum :
    - `<Key>`, `<Name>`, `<Description>`, `<Source>`, `<Defense>`, `<Soak>`, `<Price>`, `<Restricted>`, `<Encumbrance>`, `<HP>`, `<Rarity>`, `<Categories>`, `<BaseMods>`.
  - Création / mise à jour d’`Item` de type `armor` dans Foundry VTT (système `swerpg`).
- Mapping des champs XML vers les propriétés `system.*` de l’Item SWERPG.
- Gestion minimale mais saine des `BaseMods` (au moins la conservation de l’information).

## 2.2 Out of scope

- Refactor complet du module d’import OggDude.
- Gestion avancée des `BaseMods` en tant qu’effets dynamiques Foundry (Active Effects complexes).
- Traduction ou localisation du texte importé (les descriptions restent dans la langue de la source).
- Import d’autres fichiers OggDude (Weapons.xml, Gear.xml, etc.), sauf impact collatéral évident.

---

# 3. Comportement actuel (bug)

Exemple d’entrée OggDude (simplifiée) :

```xml
<Armor>
  <Key>GUNDSCAV</Key>
  <Name>"Gundark" Scav-Suit</Name>
  <Description>
    [H3]"Gundark" Scav-Suit[h3]
    Please see page 56 of the Rise of the Separatists Sourcebook for details.
  </Description>
  <Source Page="56">Rise of the Separatists</Source>
  <Categories>
    <Category>Sealed</Category>
    <Category>Full Body</Category>
  </Categories>
  <Defense>1</Defense>
  <Soak>1</Soak>
  <Price>3000</Price>
  <Restricted>false</Restricted>
  <Encumbrance>4</Encumbrance>
  <HP>2</HP>
  <Rarity>6</Rarity>
  <BaseMods>
    <Mod>
      <MiscDesc>Adds [BO] to Perception checks.</MiscDesc>
      <DieModifiers>
        <DieModifier>
          <SkillKey>PERC</SkillKey>
          <BoostCount>1</BoostCount>
        </DieModifier>
      </DieModifiers>
    </Mod>
    <Mod>
      <MiscDesc>Adds [BO][BO] to checks to avoid adverse effects of cold temperatures.</MiscDesc>
    </Mod>
    <Mod>
      <MiscDesc>Removes [SE] imposed by cold-weather conditions on Perception checks.</MiscDesc>
    </Mod>
  </BaseMods>
</Armor>
```

Exemple de résultat actuellement généré dans Foundry :

```json
{
  "name": "\"Gundark\" Scav-Suit",
  "img": "systems/swerpg/assets/images/icons/armor.svg",
  "type": "armor",
  "system": {
    "category": "medium",
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
    "defense": {
      "base": 0
    },
    "properties": [],
    "soak": {
      "base": 0
    }
  },
  "effects": []
}
```

Constats :

- Les valeurs issues du XML ne sont pas mappées :
  - `Defense` et `Soak` restent à `0`.
  - `Price`, `Encumbrance`, `HP`, `Rarity` restent aux valeurs par défaut.
  - Les catégories (`Sealed`, `Full Body`) ne sont pas reflétées dans `system.properties`.

- La description est vide alors que le XML contient du texte.
- Les `BaseMods` sont entièrement perdus (ni description, ni propriété, ni effet).

Résultat : l’objet importé n’est pas jouable en l’état, le MJ doit tout corriger à la main.

---

# 4. Comportement cible

## 4.1 Objectif métier

Pour le MJ / les joueurs :

- Quand une armure est importée depuis `Armor.xml`, elle doit :
  - Avoir ses valeurs de base correctes (défense, encaissement, encombrement, rareté, prix, points de montage).
  - Afficher une description exploitable comprenant au minimum le texte OggDude nettoyé.
  - Répercuter les catégories importantes sous forme de propriétés / tags (ex. Sealed, Full Body).
  - Conserver la logique des `BaseMods` d’une façon lisible (au minimum dans la description, idéalement structurée).

## 4.2 Mapping XML → Item SWERPG (obligatoire)

Pour toutes les entrées `<Armor>` :

| Source OggDude           | Cible SWERPG (`Item` type `armor`)                            | Remarques                                                                                      |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `<Key>`                  | utilisé en interne (optionnel)                                | Peut servir de clé technique / flag dans `flags.swerpg.oggdudeKey`.                            |
| `<Name>`                 | `name`                                                        | Chaîne brute sans post-traitement.                                                             |
| `<Description>`          | `system.description.public`                                   | Voir règles de nettoyage ci-dessous.                                                           |
| `<Source>` + `Page`      | `system.description.public` (append) ou `flags.swerpg.source` | Au minimum, ajouter une ligne “Source: Rise of the Separatists, p.56”.                         |
| `<Defense>`              | `system.defense.base`                                         | Nombre entier.                                                                                 |
| `<Soak>`                 | `system.soak.base`                                            | Nombre entier.                                                                                 |
| `<Price>`                | `system.price`                                                | Crédits, entier.                                                                               |
| `<Encumbrance>`          | `system.encumbrance`                                          | Nombre entier.                                                                                 |
| `<HP>`                   | `system.hardPoints`                                           | Nombre entier.                                                                                 |
| `<Rarity>`               | `system.rarity`                                               | Nombre entier.                                                                                 |
| `<Restricted>`           | propriété / flag (optionnel)                                  | Si `true`, ajouter un tag `restricted` dans `system.properties` ou un booléen dans `system.*`. |
| `<Categories><Category>` | `system.properties` (liste de tags)                           | Voir 4.4.                                                                                      |
| `<BaseMods>`             | description + (optionnel) structure interne                   | Obligatoire : ne pas perdre l’info.                                                            |

## 4.3 Règles de nettoyage de description

À partir de `<Description>` :

- Supprimer les balises OggDude de type `[H3]` / `[h3]` :
  - Soit en les remplaçant par un titre markdown `###`.
  - Soit en les supprimant simplement (au choix de l’implémentation, mais **consistant**).

- Conserver les retours à la ligne significatifs.
- Conserver les codes de dés `[BO]`, `[SE]`, etc. tels quels (pas d’obligation de les transformer en icônes pour ce bugfix).
- Optionnel : préfixer la section description par un titre “Description” si besoin pour cohérence UX.

Exemple attendu (version simple) :

```text
"Gundark" Scav-Suit

Please see page 56 of the Rise of the Separatists Sourcebook for details.
Source: Rise of the Separatists, p.56
```

## 4.4 Mapping des catégories → propriétés

Les catégories OggDude décrivent des traits d’armure importants (étanchéité, couverture du corps, etc.).
Pour ce bugfix, l’objectif est de ne plus perdre l’information, même si le système SWERPG n’a pas encore de mécanique automatisée pour chaque catégorie.

Règles :

- Chaque `<Category>` est transformée en tag de propriété dans `system.properties` :
  - Nom brut ou version normalisée (kebab-case ou snake_case) – choix à fixer dans le plan d’implémentation.
  - Exemple : `"Sealed"` → `"sealed"`, `"Full Body"` → `"fullBody"` ou `"full-body"`.

- Ne jamais écraser des propriétés déjà présentes (fusion de listes).

Exemple attendu pour l’armure exemple :

```json
"properties": [
  "sealed",
  "full-body"
]
```

## 4.5 Gestion minimale des BaseMods

Les `BaseMods` décrivent des effets “par défaut” de l’armure (bonus de dés, résistances, etc.).

Pour ce bugfix :

- **Obligatoire** : conserver l’information textuelle de chaque `<Mod>` :
  - Ajouter en bas de la description publique une section “Base Mods” avec une liste à puces :
    - `- Adds [BO] to Perception checks.`
    - `- Adds [BO][BO] to checks to avoid adverse effects of cold temperatures.`
    - `- Removes [SE] imposed by cold-weather conditions on Perception checks.`

- **Optionnel / Nice-to-have** (peut être explicitement mis en “à traiter plus tard”) :
  - Stocker une version structurée dans `flags.swerpg.oggdude.baseMods`, en reprenant `SkillKey`, `BoostCount`, etc.
  - Préparer l’utilisation future en Active Effects sans les implémenter dans ce bugfix.

---

# 5. Contraintes & hypothèses

## 5.1 Contraintes techniques

- Compatibilité Foundry VTT v13+ (utilisation des APIs v13 pour la création / mise à jour d’Items).
- Le module d’import OggDude peut déjà être utilisé par des mondes existants :
  - Le bugfix **ne doit pas casser** l’import d’autres types de données (armes, gear, etc.).

- L’import peut être exécuté sur des centaines d’entrées :
  - Le parsing doit rester raisonnablement performant (pas de traitement O(N²) inutile).

## 5.2 Hypothèses (à faire apparaître clairement dans le plan)

- La structure `system` d’un `Item` de type `armor` est stable et au moins compatible avec l’exemple fourni :
  - `system.defense.base`, `system.soak.base`, `system.encumbrance`, `system.price`, `system.rarity`, `system.hardPoints`, `system.properties`, `system.description.public`.

- La propriété `system.category` (ici `"medium"`) est gérée ailleurs (table de correspondance type d’armure) et **ne fait pas partie du bug** courant :
  - Ce bugfix se concentre sur les données issues de `Armor.xml`.

- L’ID de dossier (`folder`) et la gestion des images (`img`) ne sont pas impactés :
  - On réutilise la logique existante de choix de dossier / icône par défaut.

---

# 6. Exemples détaillés

## 6.1 Entrée XML d’exemple (rappel)

```xml
<Armor>
  <Key>GUNDSCAV</Key>
  <Name>"Gundark" Scav-Suit</Name>
  <Description>
    [H3]"Gundark" Scav-Suit[h3]
    Please see page 56 of the Rise of the Separatists Sourcebook for details.
  </Description>
  <Source Page="56">Rise of the Separatists</Source>
  <Categories>
    <Category>Sealed</Category>
    <Category>Full Body</Category>
  </Categories>
  <Defense>1</Defense>
  <Soak>1</Soak>
  <Price>3000</Price>
  <Restricted>false</Restricted>
  <Encumbrance>4</Encumbrance>
  <HP>2</HP>
  <Rarity>6</Rarity>
  <BaseMods>
    <Mod>
      <MiscDesc>Adds [BO] to Perception checks.</MiscDesc>
      <DieModifiers>
        <DieModifier>
          <SkillKey>PERC</SkillKey>
          <BoostCount>1</BoostCount>
        </DieModifier>
      </DieModifiers>
    </Mod>
    <Mod>
      <MiscDesc>Adds [BO][BO] to checks to avoid adverse effects of cold temperatures.</MiscDesc>
    </Mod>
    <Mod>
      <MiscDesc>Removes [SE] imposed by cold-weather conditions on Perception checks.</MiscDesc>
    </Mod>
  </BaseMods>
</Armor>
```

## 6.2 Résultat attendu (structure cible)

**NB : ceci illustre le résultat logique. Le plan d’implémentation précisera ce qui est obligatoire vs optionnel.**

```json
{
  "name": "\"Gundark\" Scav-Suit",
  "type": "armor",
  "img": "systems/swerpg/assets/images/icons/armor.svg",
  "system": {
    "category": "medium", // inchangé (hors scope du bug)
    "quantity": 1,
    "price": 3000, // ← Price
    "quality": "standard",
    "encumbrance": 4, // ← Encumbrance
    "rarity": 6, // ← Rarity
    "broken": false,
    "description": {
      "public": "\"Gundark\" Scav-Suit\n\nPlease see page 56 of the Rise of the Separatists Sourcebook for details.\nSource: Rise of the Separatists, p.56\n\nBase Mods:\n- Adds [BO] to Perception checks.\n- Adds [BO][BO] to checks to avoid adverse effects of cold temperatures.\n- Removes [SE] imposed by cold-weather conditions on Perception checks.",
      "secret": ""
    },
    "actions": [],
    "hardPoints": 2, // ← HP
    "equipped": false,
    "defense": {
      "base": 1 // ← Defense
    },
    "soak": {
      "base": 1 // ← Soak
    },
    "properties": [
      "sealed", // ← Categories
      "full-body"
    ]
  },
  "flags": {
    "swerpg": {
      "oggdudeKey": "GUNDSCAV",
      "oggdudeSource": "Rise of the Separatists",
      "oggdudeSourcePage": 56
      // Optionnel : "baseMods": [...]
    }
  }
}
```

---

# 7. Critères d’acceptation

Du point de vue du MJ :

1. **Import simple d’une armure**
   - Étant donné un fichier `Armor.xml` contenant l’entrée `"Gundark" Scav-Suit`,
   - Quand je lance l’import OggDude Armor,
   - Alors l’Item créé dans Foundry :
     - a `system.defense.base = 1`,
     - a `system.soak.base = 1`,
     - a `system.price = 3000`,
     - a `system.encumbrance = 4`,
     - a `system.hardPoints = 2`,
     - a `system.rarity = 6`.

2. **Conservation des catégories**
   - Les catégories `Sealed` et `Full Body` sont visibles dans `system.properties` sous forme de tags clairement identifiables.

3. **Description non vide**
   - La description publique contient au minimum le nom, le texte de description OggDude nettoyé, et une référence à la source (ouvrage + page).
   - La section “Base Mods” liste les trois `MiscDesc` du XML.

4. **Non-régression**
   - L’import de `Armor.xml` ne casse pas l’import des autres types d’objets OggDude (tests de regression à prévoir dans le plan).
   - Aucun Item `armor` n’est créé avec toutes les valeurs à 0 si le XML contient des données valides.
