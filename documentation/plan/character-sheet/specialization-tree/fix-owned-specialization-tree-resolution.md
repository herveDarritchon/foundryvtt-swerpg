# Fix bug — Arbres de spécialisation non résolus

## Problème

Les arbres `specialization-tree` existent et sont valides, mais les spécialisations stockées sur l’acteur ne contiennent ni `specializationId`, ni `treeUuid`.

Exemple actuel :

```json
{
  "name": "Ambassador",
  "img": "...",
  "description": "...",
  "specializationSkills": {},
  "freeSkillRank": 4
}
````

Le resolver ne peut donc pas relier la spécialisation possédée à son arbre.

## Cause

`actor.system.details.specializations` stocke une donnée incomplète.

Le resolver attend :

```js
specializationId
// ou
treeUuid
```

Mais il ne reçoit que `name`.

## Correction attendue

### 1. Corriger l’ajout d’une spécialisation à l’acteur

Quand une spécialisation est ajoutée à l’acteur, stocker aussi :

```js
specializationId
treeUuid
```

Format cible :

```json
{
  "name": "Ambassador",
  "specializationId": "ambassador",
  "treeUuid": "Item.UYiw0UBrUptRpxTk",
  "img": "...",
  "description": "...",
  "specializationSkills": {},
  "freeSkillRank": 4
}
```

### 2. Ajouter une compatibilité legacy

Pour les acteurs existants, résoudre temporairement par `name` si `specializationId` et `treeUuid` sont absents.

Ordre de résolution :

```txt
1. treeUuid
2. specializationId
3. name fallback legacy
4. unresolved
```

Le fallback par `name` doit logger un warning indiquant que les données acteur doivent être migrées.

### 3. Ajouter une migration / normalisation

Créer une fonction qui enrichit les anciennes spécialisations acteur :

```js
name -> specialization-tree.name -> specializationId + treeUuid
```

Ne pas supprimer les champs existants.

## À ne pas faire

* Ne pas corriger dans le renderer graphique.
* Ne pas utiliser `name` comme clé métier principale.
* Ne pas traiter l’i18n dans ce fix.
* Ne pas élargir le scope aux compendiums.

## Tests à ajouter

* Résolution par `treeUuid`.
* Résolution par `specializationId`.
* Résolution legacy par `name`.
* Retour `unresolved` si aucune correspondance.
* Retour `incomplete` si l’arbre n’a pas de nodes/connections.
* Migration sans perte des champs existants.

## Critère d’acceptation

L’acteur `Bo'Than Expl-Amb` affiche correctement les arbres `Ambassador` et `Advisor`, sans warning :

```txt
Owned specialization is missing specializationId and treeUuid
```