---
id: oggdude-career-import-data-bug
title: 'OggDude – Correction de l’import des Career (description, careerSkills, etc.)'
domain: oggdude-importer
purpose: bug
feature: career-import-data
version: 1.0
status: draft
author: 'Ô Grand-Maître'
created: 2025-11-19
updated: 2025-11-19
---

## 1. Contexte & problème

Le système **SWERPG / Star Wars Edge** permet d’importer des données OggDude dans Foundry VTT (v13+) à partir des fichiers XML fournis par OggDude.

Pour les **careers** (fichiers XML dans le répertoire `career` d’OggDude, par ex. `Careers.xml`), l’importeur crée actuellement des Items de type `career` dans Foundry, mais plusieurs champs sont incorrects ou vides :

- `system.careerSkills` est vide (`[]`) alors que le XML contient bien les compétences de carrière.
- `system.description` est vide (`""`) alors que le XML contient une description (avec balises de mise en forme OggDude, ex. `[H4]Ace [h4] ...`).
- (Potentiellement) les informations de source et de pagination (`<Source Page="64">…</Source>`) ne sont pas exploitées ou pas de façon cohérente avec les autres importeurs (weapons, talents, etc.).

Exemple simplifié :

**Entrée OggDude**

```xml
<Career>
  <Key>THEACE</Key>
  <Name>Ace</Name>
  <Description>
    [H4]Ace [h4]
    Please see page 64 of the Age of Rebellion Core Rulebook for details.
  </Description>
  <Source Page="64">Age of Rebellion Core Rulebook</Source>
  <CareerSkills>
    <Key>ASTRO</Key>
    <Key>COOL</Key>
    <Key>GUNN</Key>
    <Key>MECH</Key>
    <Key>PERC</Key>
    <Key>PILOTPL</Key>
    <Key>PILOTSP</Key>
    <Key>RANGLT</Key>
  </CareerSkills>
  <Specializations>
    <Key>DRIVER</Key>
    <Key>GUNNER</Key>
    <Key>PILOT</Key>
    <Key>BEASTRIDER</Key>
    <Key>HOTSHOT</Key>
    <Key>RIGGER</Key>
  </Specializations>
</Career>
```

**Item Foundry créé actuellement**

```json
{
  "name": "Ace",
  "img": "systems/swerpg/assets/images/icons/career.svg",
  "type": "career",
  "system": {
    "careerSkills": [],
    "freeSkillRank": 0,
    "description": ""
  },
  "folder": "QjY7A7nR3IRc93eO",
  "effects": [],
  "flags": {},
  "_stats": {
    "compendiumSource": null,
    "duplicateSource": null,
    "exportSource": {
      "worldId": "swerpg-test",
      "uuid": "Item.ace0000000000000",
      "coreVersion": "13.350",
      "systemId": "swerpg",
      "systemVersion": "#{VERSION}#"
    },
    "coreVersion": "13.350",
    "systemId": "swerpg",
    "systemVersion": "#{VERSION}#",
    "createdTime": 1763365566160,
    "modifiedTime": 1763586061799,
    "lastModifiedBy": "8VADnEoyDM8awtMQ"
  },
  "ownership": {
    "default": 0
  }
}
```

Le résultat est inutilisable en jeu : les careers ne proposent pas les bonnes compétences de carrière, et la description est absente.

---

## 2. Objectifs métier

### 2.1 Objectif principal

Pour un MJ ou un joueur qui importe les données OggDude :

- **Chaque Career importée doit refléter fidèlement les données OggDude** :
  - Les compétences de carrière affichées sur la fiche sont correctes.
  - La description est présente et lisible (mise en forme simple, pas de balises OggDude brutes).
  - Les informations de source (livre, page) sont disponibles de manière cohérente avec le reste du système.

En pratique, une Career importée doit être prête à l’emploi pour la création de personnage, sans retouche manuelle.

### 2.2 Problème à résoudre

- Les Items `career` importés **ne contiennent pas les bons champs système** (au minimum `careerSkills` et `description`).
- Le MJ ne peut pas s’appuyer sur l’import OggDude pour créer des PJ : il doit compléter les careers à la main, ce qui contredit l’objectif d’automatisation du système.

### 2.3 Critères d’acceptation métier (high level)

- CA-1 : Après import des careers OggDude, chaque Career dans Foundry affiche la **liste correcte de compétences de carrière**.
- CA-2 : La **description** textuelle d’une Career est renseignée, sans balises OggDude visibles (`[H4]`, `[B]`, etc.), dans un format conforme au reste du système (HTML ou texte enrichi simple).
- CA-3 : Les informations de **source** (livre + page) sont conservées (si le modèle de données SWERPG les expose).
- CA-4 : Il est possible de **réimporter** les careers sans casser les liens existants (si un comportement d’overwrite ou de merge est prévu côté importeur).
- CA-5 : Optionnel / à arbitrer : possibilité de corriger les careers déjà importées avec des données vides via une migration ou un ré-import guidé.

---

## 3. Périmètre

### 3.1 In scope

- Lecture et parsing des fichiers **Career OggDude** (XML) déjà pris en charge par l’importeur.
- Mapping des données OggDude vers le modèle d’Item `career` du système SWERPG :
  - Champs OggDude concernés :
    - `Career/Key`
    - `Career/Name`
    - `Career/Description`
    - `Career/Source/@Page` + contenu de `Career/Source`
    - `Career/CareerSkills/Key`
    - `Career/Specializations/Key` (voir non-objectifs).

- Correction du mapping pour :
  - `system.careerSkills`
  - `system.description`
  - éventuellement autres champs carrière si déjà prévus dans le modèle (ex. `system.source`, `system.oggdudeKey`, etc.).

- Gestion des cas d’erreur minimum :
  - Skill inconnue dans la config SWERPG.
  - Description vide ou absente.

### 3.2 Out of scope (non-objectifs)

- Modification du modèle de données global des careers (ajout de nouveaux champs non prévus dans le système actuel, sauf si nécessaire pour consistance avec les autres importeurs).
- Refonte complète de l’UI de visualisation des careers.
- Gestion fine des **Specializations** (création automatique des Items de spécialisation, liens bi-directionnels, talent trees, etc.) — sauf si l’importeur le fait déjà et que la correction est triviale.
- Refactor global de l’importeur OggDude (performance, architecture, logs) au-delà de ce qui est strictement nécessaire pour corriger ce bug.

---

## 4. Règles fonctionnelles attendues

### 4.1 Mapping des CareerSkills

- Pour chaque `<Career>` :
  - Lire la liste des `<CareerSkills>/<Key>`.
  - Construire `system.careerSkills` comme une **liste ordonnée** de références de compétences.

- La nature de la référence dépend du modèle actuel :
  - **Hypothèse A (à confirmer)** : `careerSkills` stocke des **identifiants internes de compétences** (clé du système ou ID d’Item compendium).
  - **Hypothèse B** : `careerSkills` stocke directement les **codes de compétence** (par ex. `"ASTRO"`, `"COOL"`, etc.), résolus ensuite par le système.

- Si une clé de compétence OggDude ne peut pas être résolue :
  - La Career est quand même créée.
  - La compétence inconnue n’est pas ajoutée à `careerSkills`.
  - Une mécanique de log / métrique doit être utilisée si elle existe déjà (ex. compteur de “unknown skills” pour l’importeur).

**Exemple pour THEACE (Ace)**

- Entrée `CareerSkills`: `ASTRO`, `COOL`, `GUNN`, `MECH`, `PERC`, `PILOTPL`, `PILOTSP`, `RANGLT`
- Sortie attendue (conceptuelle) :

```json
"system": {
  "careerSkills": ["ASTRO", "COOL", "GUNN", "MECH", "PERC", "PILOTPL", "PILOTSP", "RANGLT"],
  ...
}
```

(adapter au format exact utilisé par SWERPG).

### 4.2 Mapping de la description

- Le contenu de `<Description>` est importé dans `system.description`.
- Le parser doit :
  - Nettoyer les balises OggDude `[H1]`, `[H4]`, `[B]`, etc. :
    - soit en les supprimant,
    - soit en les remplaçant par un HTML minimal (`<h4>`, `<strong>`, etc.) si c’est déjà utilisé par le système pour d’autres imports.

  - Nettoyer les retours à la ligne inutiles et l’indentation XML.

- Le résultat doit être cohérent avec les autres imports (weapons, talents, etc.) pour éviter une UX incohérente.

**Exemple pour THEACE (simplifié)**

- Entrée :

```text
[H4]Ace [h4]
Please see page 64 of the Age of Rebellion Core Rulebook for details.
```

- Sortie possible (selon convention existante) :

```html
<h4>Ace</h4>
<p>Please see page 64 of the Age of Rebellion Core Rulebook for details.</p>
```

ou, si le système stocke du texte simple :

```text
Ace

Please see page 64 of the Age of Rebellion Core Rulebook for details.
```

### 4.3 Mapping de la source

Si le modèle `career` expose déjà des champs de source (à confirmer en lisant le code) :

- Extraire :
  - `Career/Source/@Page` → `system.source.page` (ou équivalent).
  - `Career/Source` (texte) → `system.source.book` ou `system.source.label`.

- En l’absence de structure dédiée dans `system`, au minimum :
  - Concaténer la source (livre + page) dans la description ou dans un champ générique cohérent avec les autres imports (`system.reference`, `system.source`, etc.).

### 4.4 Gestion des Specializations

Selon le comportement actuel du système :

- Si les Specializations sont déjà importées ailleurs et qu’il existe un champ `system.specializations` sur la Career :
  - Populer ce champ à partir de `<Specializations>/<Key>`.

- Si aucun lien n’est prévu dans le modèle ou que ce lien est hors scope :
  - Ne pas ajouter de nouveau champ.
  - Documenter clairement dans le plan et/ou la doc utilisateur que les Specializations sont gérées séparément.

### 4.5 Gestion des erreurs & robustesse

- L’import d’une Career ne doit pas échouer à cause :
  - d’une clé de compétence inconnue,
  - d’une description vide,
  - d’une source manquante.

- En cas de problème, l’importeur doit :
  - Continuer (fail-soft),
  - Logguer l’anomalie (format aligné avec le reste de l’importeur),
  - Mettre à jour les métriques d’import si elles existent (ex. compteur “unknownCareerSkills”).

---

## 5. Comportement actuel observé

- `system.careerSkills` est systématiquement un tableau vide (`[]`) pour les careers importées.
- `system.description` est vide (`""`).
- Les autres champs présents sur l’Item (`name`, `img`, `type`, `folder`) semblent renseignés correctement.
- Les `flags` ne contiennent pas d’identifiant OggDude (`oggdudeKey`) dans l’exemple fourni — à vérifier sur d’autres imports :
  - Si ce n’est pas un bug, OK.
  - Si l’importeur est censé renseigner `flags.swerpg.oggdudeKey`, ce point doit être vérifié dans le plan.

---

## 6. Comportement cible (vue métier)

Pour un MJ :

1. Il lance l’import OggDude (incluant les careers).
2. Il ouvre une Career importée, par ex. **Ace**.
3. Sur la fiche d’Item Career :
   - La description est lisible et correspond bien à celle du livre.
   - La liste des compétences de carrière correspond à la VO/ VF (ASTRO, COOL, etc.).
   - (Si exposé dans l’UI) La source indique bien le livre et la page.

4. Il peut créer un personnage Ace en cochant les compétences de carrière correctes, sans devoir corriger à la main.

---

## 7. Contraintes techniques & données

- **Compatibilité Foundry** : conserver la compatibilité Foundry v13+.
- **Compatibilité système SWERPG** :
  - Ne pas casser les autres importeurs (weapons, talents, gear) ni la structure actuelle des Items `career`.
  - Reprendre autant que possible les utilitaires de parsing déjà existants (par ex. conversion `[H4]` → `<h4>`, etc.).

- **Performance** :
  - L’import complet des careers doit rester raisonnable (ordre de grandeur similaire aux autres imports OggDude).
  - Le parsing XML + transformation de description ne doit pas introduire de surcoût massif.

- **Backward compatibility des données** :
  - Décider si une **migration** doit corriger les careers déjà importées dans les mondes existants, ou si seule la qualité des futurs imports est garantie (voir § 8).

---

## 8. Données existantes & migration

### 8.1 Problème

Des mondes de test ou de production peuvent déjà contenir des Items `career` importés avec :

- `system.careerSkills = []`
- `system.description = ""`

Ces données sont incorrectes et peuvent impacter :

- Les PJ déjà créés sur la base de ces careers.
- Les compendiums système (si l’import écrit dans des compendiums).

### 8.2 Attentes (à trancher, mais à considérer sérieusement)

- M-1 : **Minimum** : la correction s’applique aux **futurs imports**. Les données déjà importées restent telles quelles, charge au MJ de ré-importer si nécessaire.
- M-2 : **Optionnel mais souhaitable** : proposer un mécanisme de **réparation** :
  - Soit via une **migration automatique** (parcours des Items `career` avec un flag OggDude, relecture du XML source si encore disponible).
  - Soit via un **bouton de ré-import** dans l’UI de l’importeur (hors scope si non-prévu aujourd’hui, mais à mentionner).

Le plan d’implémentation devra choisir une stratégie explicite (et documenter les limites).

---

## 9. Cas de test & critères d’acceptation détaillés

### 9.1 Import d’une Career simple (Ace)

- **Pré-conditions**
  - Fichiers OggDude disponibles, incluant la Career `THEACE`.
  - Importeur OggDude configuré et fonctionnel.

- **Scénario**
  1. Lancer l’import des careers OggDude.
  2. Ouvrir l’Item `Ace` créé dans Foundry (type `career`).

- **Résultats attendus**
  - R1 : `name` = `"Ace"`.
  - R2 : `system.careerSkills` contient exactement les clés attendues : `ASTRO`, `COOL`, `GUNN`, `MECH`, `PERC`, `PILOTPL`, `PILOTSP`, `RANGLT` (ou les références équivalentes).
  - R3 : `system.description` n’est pas vide et contient le texte de description (sans balises OggDude brutes).
  - R4 : Si le modèle le permet, `system.source` (ou champ équivalent) contient le livre + la page (Age of Rebellion Core Rulebook, p.64).
  - R5 : Aucun log d’erreur bloquant dans la console/ log d’import.

### 9.2 Career avec skill inconnue

- **Préparation**
  - Ajouter (ou simuler) une Career avec une `CareerSkills/Key` qui ne mappe pas à une compétence SWERPG connue.

- **Résultats attendus**
  - R6 : L’Item est quand même créé.
  - R7 : `system.careerSkills` ne contient pas la skill inconnue.
  - R8 : Une métrique / log indique qu’une skill de Career est inconnue (si un mécanisme similaire existe pour les weapons, talents, etc.).

### 9.3 Réimport sur des données existantes

- **Pré-conditions**
  - Une Career `Ace` déjà importée avec `careerSkills = []` et `description = ""`.

- **Scénario**
  - Relancer l’import OggDude des careers (en utilisant la stratégie standard : overwrite / merge, selon le comportement actuel).

- **Résultats attendus (selon stratégie choisie)**
  - R9 (si overwrite) : L’Item `Ace` existant est mis à jour avec les bonnes `careerSkills` et la description correcte.
  - R10 (si création d’un doublon) : La nouvelle Career créée est correcte ; la doc devra alors expliquer comment le MJ doit gérer les doublons.

---

## 10. Questions ouvertes / hypothèses

1. **Format exact de `system.careerSkills`**
   - Hypothèse actuelle : tableau de codes de compétences (`"ASTRO"`, `"COOL"`, ...).
   - À confirmer en regardant :
     - le modèle de données `career`,
     - la façon dont la fiche de personnage récupère les compétences de carrière.

2. **Champ(s) de source dans `system`**
   - Le modèle `career` expose-t-il des champs dédiés (book, page) ?
   - Faut-il aligner la structure sur celle déjà utilisée pour weapons / talents ?

3. **Lien avec les Specializations**
   - Existe-t-il déjà un champ `system.specializations` pour relier une Career à des Specializations ?
   - Si oui, comment sont gérées les Specializations côté importeur (autre étape, autre spec ?) et quel lien attend-on exactement ?

4. **Stratégie de migration**
   - Doit-on prévoir une migration automatique des careers déjà importées ?
   - Ou considère-t-on que ce bugfix ne s’applique qu’aux futurs imports (plus simple, mais moins confortable pour les campagnes existantes) ?

5. **Gestion des balises de formatage**
   - Quelle est la convention actuelle dans SWERPG pour transformer les balises OggDude (`[H1]`, `[B]`, etc.) ?
   - Peut-on factoriser le code avec les parseurs déjà utilisés pour d’autres types (weapons, talents) afin d’éviter les divergences ?

Les réponses à ces questions devront être intégrées dans le plan d’implémentation (`PAT-XXX`, `CON-XXX`) puis dans les tâches (`TASK-XXX`).

---

## 11. Annexes

### 11.1 Résumé des champs XML OggDude Career pertinents

- `Career/Key` : identifiant interne OggDude (ex. `THEACE`).
- `Career/Name` : nom affiché (ex. `Ace`).
- `Career/Description` : description avec balises OggDude.
- `Career/Source` (texte) + attribut `Page` : référence livre + page.
- `Career/CareerSkills/Key` : liste de clés de compétence.
- `Career/Specializations/Key` : liste de clés de spécialisation.

### 11.2 Résumé des champs SWERPG Career (observés)

- `Item.name` : nom de la Career.
- `Item.type = "career"`.
- `Item.system.careerSkills: []` (bug : vide actuellement).
- `Item.system.freeSkillRank` (présent mais hors scope de ce bug).
- `Item.system.description` (bug : vide actuellement).
- `Item.img`, `Item.folder`, `_stats`, `ownership` : corrects dans l’exemple fourni.

---
