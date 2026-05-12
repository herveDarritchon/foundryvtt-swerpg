## Étape suivante : instruire “Multi-spé existant”

Objectif : vérifier que la V1 repose bien sur un modèle acteur compatible avec plusieurs spécialisations possédées.

### Question à trancher

> Est-ce que la V1 doit corriger immédiatement toutes les incohérences multi-spé existantes dans le modèle acteur ?

Ma réponse : **oui**, au moins pour tout ce qui touche aux talents.

Pas forcément toute la fiche personnage. Mais dès qu’un calcul, affichage ou achat dépend des spécialisations, il doit considérer **toutes les spécialisations possédées**, pas seulement la première.

## Décision de cadrage proposée

Tu peux ajouter sous le tableau des points de vigilance, ou dans une future sous-section d’instruction :

```md
### Point de vigilance — Multi-spé existant

**Décision** : à traiter dans la V1.

La V1 Talents Edge doit considérer l’ensemble des spécialisations possédées par l’acteur pour :
- déterminer les arbres de spécialisation consultables ;
- sélectionner le contexte d’achat courant ;
- vérifier l’accessibilité des nœuds ;
- consolider les talents possédés ;
- consolider les rangs des talents ranked ;
- afficher les sources des talents dans l’onglet Talents.

Aucune logique liée aux talents ne doit supposer qu’un personnage ne possède qu’une seule spécialisation ou que la première spécialisation est la seule pertinente.

Les éventuels compteurs existants qui ne regardent que la première spécialisation doivent être corrigés ou isolés s’ils affectent la V1 Talents.
```

## Ce qu’il faut analyser maintenant dans le code

Il faut regarder précisément les zones suivantes :

```txt
module/models/character.mjs:475-477
module/models/character.mjs:488-490
```

Et plus largement chercher :

```txt
specializations[0]
specialization[0]
actor.system.specializations?.[0]
find(...)
first specialization
```

Ainsi que tout calcul lié à :

```txt
careerSkills
specializationSkills
talents
experience
spent
gained
free ranks
```

## Décision attendue à la fin de cette instruction

On doit sortir avec une conclusion comme celle-ci :

```md
**Décision finale — Multi-spé**

La V1 corrige les incohérences multi-spé qui affectent directement :
- l’affichage des arbres possédés ;
- l’achat de talents ;
- la consolidation des talents ;
- les talents ranked ;
- les sources affichées dans l’onglet Talents.

Les autres incohérences multi-spé non liées aux talents sont documentées mais reportées si elles ne bloquent pas la V1.
```

## Pour avancer concrètement

Envoie-moi le contenu de `module/models/character.mjs` autour des lignes **450 à 510**, puis les fichiers ou extraits qui contiennent la logique talents actuelle :

```txt
module/models/talent.mjs
actor-mixins/talents.mjs
module/lib/talents/*.mjs
```

On commencera par faire le tri :

```txt
à corriger maintenant / à isoler / à ignorer / à reporter
```
