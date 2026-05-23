# Plan d'implementation - dependances d'import OggDude et arbre de resolution

**Contexte** : l'import OggDude groupe peut rater certaines liaisons entre elements, notamment `species -> talent` pour `Bothan -> CONV -> Convincing Demeanor`, meme quand l'ordre statique `talent -> species` est deja en place.

**Perimetre** : orchestrateur OggDude, pipelines d'import, resolution des references inter-items, observabilite et tests associes.

---

## Resume du probleme

L'importeur OggDude repose encore sur des resolutions eager vers `game.items` et `game.packs` pendant le mapping de certains domaines.

Cela cree une dependance implicite au timing de mise a jour des collections Foundry et des index de compendium, plutot qu'une dependance explicite entre pipelines d'import.

Le symptome visible est que l'import en deux temps fonctionne, mais l'import groupe en une seule passe peut perdre certaines liaisons.

---

## Constats de code review

### 1. L'ordre statique `talent -> species` existe deja

- `module/settings/OggDudeDataImporter.mjs` place deja `talent` avant `species` dans `_domainNames`.
- `module/importer/oggDude.mjs` place deja `talent` avant `species` dans `buildContextRegistry()`.

Impact : le probleme ne vient plus uniquement d'un mauvais ordre canonique d'affichage ou d'execution.

### 2. `species` resout trop tot ses references de talents

Le mapper `species` extrait les `freeTalentKeys`, puis tente immediatement de les convertir en UUID Foundry via `game.items` et `game.packs`.

Impact : la resolution depend d'un etat runtime global qui peut ne pas encore refleter tous les documents crees dans le meme batch.

### 3. `specialization-tree` a le meme type de fragilite

Le pipeline `specialization-tree` construit un index de talents depuis le world et les compendiums, puis essaye de remplir `talentUuid` pendant le mapping.

Impact : le probleme d'ordre et de timing n'est pas limite a `species -> talent`.

### 4. Les dependances ne sont pas modelisees explicitement

Le registre de pipelines exprime aujourd'hui un ordre d'insertion, mais pas de relation `dependsOn` ou `softDependsOn`.

Impact :

1. aucune validation structurelle de l'ordre ;
2. aucun tri topologique ;
3. aucune detection de cycle ;
4. aucune trace exploitable des dependances satisfaites ou non.

### 5. La reference metier source existe, mais n'est pas utilisee comme pivot de session

Les items importes preservent deja souvent `flags.swerpg.oggdudeKey` et, pour certains domaines, `system.id`.

Impact : le systeme possede deja les cles metier necessaires pour construire un index de references d'import, mais cet index n'existe pas encore a l'echelle de la session d'import.

---

## Hypothese retenue

Le defaut principal provient de l'absence d'un modele de dependances et d'un index de references partage pendant une session d'import.

Le vrai besoin n'est donc pas seulement de reordonner les domaines, mais de :

1. declarer les dependances entre pipelines ;
2. construire un index de references alimente des creations du batch courant ;
3. faire une reconciliation finale des references non resolues.

---

## Objectifs

1. Introduire une valeur de dependance explicite entre pipelines importes.
2. Rendre la resolution des liens independante du timing de rafraichissement de `game.items` et `game.packs`.
3. Generaliser la solution aux liens deja presents, pas seulement a `species -> talent`.
4. Exposer un arbre de dependances clair et testable.
5. Renforcer l'observabilite des references resolues, partiellement resolues et non resolues.

---

## Modele de dependances recommande

Chaque pipeline du registre d'import doit declarer explicitement :

- `id` : identifiant unique du pipeline ;
- `domain` : domaine utilisateur associe ;
- `type` : type d'item produit ;
- `contextBuilder` : builder existant ;
- `dependsOn` : dependances fortes ;
- `softDependsOn` : dependances faibles ;
- `producesReferences` : types de references publiees dans l'index de session.

### Exemple cible

```js
{
  id: 'talent',
  domain: 'talent',
  type: 'talent',
  contextBuilder: buildTalentContext,
  dependsOn: [],
  softDependsOn: [],
  producesReferences: ['talent.oggdudeKey', 'talent.system.id', 'talent.uuid'],
}
```

```js
{
  id: 'species',
  domain: 'species',
  type: 'species',
  contextBuilder: buildSpeciesContext,
  dependsOn: ['talent'],
  softDependsOn: [],
  producesReferences: ['species.oggdudeKey', 'species.uuid'],
}
```

```js
{
  id: 'specialization-tree',
  domain: 'specialization',
  type: 'specialization-tree',
  contextBuilder: buildSpecializationTreeContext,
  dependsOn: ['talent'],
  softDependsOn: ['career', 'specialization'],
  producesReferences: ['specialization-tree.specializationId', 'specialization-tree.uuid'],
}
```

---

## Arbre de dependances propose

### Dependances fortes

```text
talent
├─ species
└─ specialization-tree
```

### Dependances faibles

```text
career
└─ specialization-tree

specialization
└─ specialization-tree

motivation-category
└─ motivation
```

### Vue complete par domaine

```text
weapon
armor
gear
talent
├─ species
└─ specialization-tree
career
└─ specialization-tree   (soft)
specialization
└─ specialization-tree   (soft)
obligation
motivation-category
└─ motivation            (soft)
duty
```

---

## Ordre d'execution recommande

L'ordre doit etre derive par tri topologique des dependances fortes, puis stabilise par ordre canonique pour les pipelines independants.

Ordre recommande :

```text
weapon
armor
gear
talent
career
specialization
obligation
motivation-category
motivation
duty
species
specialization-tree
```

Regles :

1. `species` doit toujours passer apres `talent`.
2. `specialization-tree` doit toujours passer apres `talent`.
3. `specialization-tree` devrait idealement passer apres `career` et `specialization` pour coherence fonctionnelle et diagnostic, sans etre bloque si ces domaines ne sont pas selectionnes.
4. `motivation` devrait idealement passer apres `motivation-category`, sans blocage dur.

---

## Architecture cible de session d'import

Introduire un objet `importSession` partage pendant tout `processOggDudeData()`.

### Responsabilites de `importSession`

1. Conserver l'ordre effectif d'execution.
2. Maintenir un index de references publiees par les pipelines deja executes.
3. Fournir ces references aux pipelines dependants pendant leur mapping.
4. Accumuler les references non resolues pour reconciliation finale.
5. Produire un bilan de dependances dans les logs et stats.

### Structure proposee

```js
{
  createdByPipeline: new Map(),
  referenceIndex: {
    talent: {
      byOggdudeKey: new Map(),
      bySystemId: new Map(),
    },
    specializationTree: {
      bySpecializationId: new Map(),
    },
  },
  unresolvedReferences: [],
  executionOrder: [],
}
```

### Alimentation de l'index

Apres chaque `createDocuments`, l'orchestrateur ou la couche de stockage doit enrichir `importSession.referenceIndex` a partir des documents effectivement crees, sans attendre un refresh global de `game.items` ou de `pack.index`.

---

## Strategie de resolution des references

### Regle generale

Pour tout pipeline dependent :

1. resoudre d'abord via `importSession.referenceIndex` ;
2. fallback ensuite sur `game.items` ;
3. fallback ensuite sur `game.packs` ;
4. conserver la reference metier source si la resolution echoue ;
5. enregistrer le cas dans `unresolvedReferences` pour reconciliation finale.

### Cas `species -> talent`

1. Conserver `flags.swerpg.oggdude.freeTalentKeys` comme source canonique.
2. Remplir `system.freeTalents` avec les UUID resolus via l'index de session en priorite.
3. En fin d'import, reconcilier les species encore partielles.

### Cas `specialization-tree -> talent`

1. Resoudre `talentUuid` via l'index de session avant toute lecture du world ou du compendium.
2. Conserver `talentId` comme reference metier stable.
3. Reconcilier en fin d'import les noeuds encore non resolus.

---

## Plan technique detaille

### Etape 1 - Faire evoluer le registre de pipelines

1. Remplacer le registre minimal actuel par une structure enrichie declarative.
2. Donner un `id` explicite a chaque pipeline.
3. Ajouter `dependsOn` et `softDependsOn`.
4. Conserver le comportement actuel pour les domaines sans dependances.

### Etape 2 - Ajouter un tri topologique

1. Construire la liste des pipelines selectionnes.
2. Appliquer un tri topologique sur les dependances fortes.
3. Conserver un ordre stable pour les pipelines independants.
4. Detecter et journaliser tout cycle de dependance.
5. Refuser l'execution seulement pour les cycles sur dependances fortes.

### Etape 3 - Introduire `importSession`

1. Creer `importSession` dans `processOggDudeData()`.
2. Le transmettre aux `contextBuilder` et au stockage.
3. Enregistrer l'ordre effectif d'execution.
4. Enregistrer les documents crees par pipeline.
5. Construire un index de references des documents crees pendant le batch.

### Etape 4 - Publier les references apres creation

1. A la sortie de `_storeItems`, recuperer les documents crees.
2. Publier dans l'index de session :
   - `flags.swerpg.oggdudeKey`
   - `system.id`
   - `uuid`
   - toute cle metier necessaire par domaine.
3. Supporter world et compendium avec la meme interface de publication.

### Etape 5 - Adapter les pipelines dependants

1. Modifier `species` pour resoudre via l'index de session en priorite.
2. Modifier `specialization-tree` pour resoudre via l'index de session en priorite.
3. Preserver les references metier sources quand la resolution echoue.
4. Enregistrer les references non resolues dans `importSession.unresolvedReferences`.

### Etape 6 - Ajouter une phase finale de reconciliation

1. Rebalayer les references non resolues en fin de batch.
2. Mettre a jour les documents concernes si de nouvelles references sont resolvables.
3. Laisser les references encore non resolues tracees dans les flags et les stats.

### Etape 7 - Renforcer l'observabilite

1. Logger l'ordre de pipelines calcule.
2. Logger les dependances fortes et faibles satisfaites ou absentes.
3. Exposer le nombre de resolutions via session index vs world vs compendium.
4. Exposer les references non resolues par domaine.

---

## Tests a ajouter

### Tests orchestrateur

1. test de tri topologique avec `talent -> species` ;
2. test de tri topologique avec `talent -> specialization-tree` ;
3. test de dependance faible non selectionnee sans blocage ;
4. test de detection de cycle sur dependances fortes.

### Tests `species`

1. import groupe `talent + species` en une passe avec resolution `Bothan -> CONV` ;
2. import groupe en compendium avec resolution via index de session ;
3. conservation de `freeTalentKeys` si la resolution finale echoue ;
4. increment des stats de references non resolues.

### Tests `specialization-tree`

1. import groupe `talent + specialization` en une passe avec `talentUuid` resolu ;
2. resolution via session index avant fallback world/compendium ;
3. conservation de `talentId` en cas d'echec ;
4. stats sur noeuds non resolus.

### Tests de non-regression

1. import domaine seul sans dependance selectionnee reste possible quand la dependance est faible ;
2. import domaine seul avec dependance forte absente preserve la reference metier et journalise proprement ;
3. aucun domaine independant n'est impacte par l'ajout du graphe de dependances.

---

## Risques et points d'attention

1. Ne pas coupler le tri topologique a l'ordre de rendu UI.
2. Ne pas casser la validation `DocumentUUIDField` de `system.freeTalents`.
3. Ne pas dependre d'un refresh implicite des index de compendium.
4. Garder la distinction entre reference metier canonique et projection technique UUID.
5. Ne pas introduire de fuzzy matching non maitrise.

---

## Decision recommandee

Mettre en oeuvre une solution en trois axes :

1. dependances declaratives dans le registre de pipelines ;
2. index de references partage pendant la session d'import ;
3. reconciliation finale des references non resolues.

Cette approche traite le cas `species -> talent`, generalise la resolution aux autres liens existants, et fournit un arbre de dependances explicite, testable et observable.
