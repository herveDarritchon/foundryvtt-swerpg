# GUX1 — Plan d'implémentation : Compacter le header et clarifier la sidebar de progression

## Contexte

Issue : [#326 — GUX1 - Compacter le header et clarifier la sidebar de progression](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/326)

Parent : [#325 — Graphical UX Refresh - Rendre l'arbre de spécialisation plus lisible et actionnable](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/325)

L'existant montre déjà un arbre exploitable dans `SpecializationTreeApp`, avec :

- un header haut (`title` + `subtitle`) ;
- une sidebar listant les spécialisations et leur état ;
- un viewport PIXI déjà sélectionnable par arbre actif ;
- des tests applicatifs couvrant le contrat principal de contexte, de sélection et de rendu.

Le besoin de `#326` est purement UX : réduire l'encombrement du header, rendre la progression immédiatement utile dans la sidebar, supprimer les redondances visuelles et mieux distinguer l'arbre actif, sans changer la logique métier d'achat, d'oubli ou de rendu PIXI.

## Objectif

Rendre `SpecializationTreeApp` plus dense et plus lisible en exposant un résumé de progression pertinent pour l'arbre courant, en clarifiant la hiérarchie visuelle entre header, sidebar et viewport, et en renforçant l'état actif de la spécialisation sélectionnée.

## Périmètre

### Inclus

- compaction du header de `SpecializationTreeApp` ;
- ajout d'un view-model léger de progression pour l'arbre courant ;
- réorganisation de la sidebar pour distinguer clairement résumé courant et liste des spécialisations ;
- renforcement du marquage visuel de l'entrée active ;
- suppression des informations dupliquées entre header, sidebar et vue courante ;
- extension des tests applicatifs sur le contrat de contexte et l'état sélectionné.

### Exclus

- changement des règles métier de progression, d'achat ou d'oubli ;
- refonte du rendu PIXI des nœuds et connexions ;
- nouvelle navigation viewport ;
- harmonisation large de microcopy et ambiance visuelle hors strict besoin structurel (portée plutôt `#330`) ;
- validation globale UX / non-régression finale (portée `#331`).

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/applications/specialization-tree-app.mjs` | Exposer un résumé dérivé de progression et réduire les données redondantes du contexte |
| `templates/applications/specialization-tree-app.hbs` | Recomposer le header et la sidebar autour du nouvel affichage compact |
| `styles/applications.less` | Porter le layout compact, la hiérarchie visuelle et l'état actif renforcé |
| `tests/applications/specialization-tree-app.test.mjs` | Verrouiller le nouveau contrat de contexte et les garanties UX observables |

## Plan d'implémentation

### Étape 1 — Exposer un résumé de progression orienté UI pour l'arbre courant

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Ajouter au contexte un bloc dérivé dédié à l'UI, par exemple `currentTreeSummary`, calculé à partir de `renderNodes`, `currentTreeName` et de la progression acteur déjà disponible.
2. Y exposer uniquement les informations utiles à la lecture rapide : nom de l'arbre courant, nombre de nœuds achetés, total de nœuds, nombre de nœuds immédiatement actionnables ou verrouillés, XP disponibles si pertinent.
3. Garder ce bloc absent ou nul quand aucun arbre exploitable n'est sélectionné, afin de préserver les empty states existants.
4. Ne pas déplacer de logique métier dans le template : tous les compteurs et labels d'état restent préparés côté contexte.

**Validation visée :** le template peut afficher un résumé compact de progression sans recalcul local ni dépendance à PIXI.

### Étape 2 — Recomposer le header et la sidebar pour réduire les redondances

**Fichiers :** `templates/applications/specialization-tree-app.hbs`

1. Réduire le header à une structure plus compacte : titre principal conservé, sous-information secondaire allégée ou fusionnée avec un méta-bloc plus discret.
2. Introduire dans la sidebar un bloc de synthèse de l'arbre courant avant la liste des spécialisations, afin que la progression utile soit visible sans parcourir le viewport.
3. Simplifier la liste des spécialisations pour éviter la répétition inutile entre `name`, `treeName`, `stateLabel` et le résumé courant ; ne garder par entrée que les informations nécessaires au choix d'arbre.
4. Renforcer l'entrée active avec une structure et des hooks CSS explicites, sans changer l'action existante `data-action='selectTree'`.
5. Conserver les comportements vides actuels (`hasActor`, `hasSpecializations`, `showViewport`) et la sélection courante existante.

**Validation visée :** l'utilisateur identifie immédiatement l'arbre actif, son avancement utile et la liste des alternatives, sans surcharge de texte.

### Étape 3 — Stabiliser le contrat UX par styles et tests ciblés

**Fichiers :** `styles/applications.less`, `tests/applications/specialization-tree-app.test.mjs`

1. Ajuster le layout CSS pour obtenir un header plus bas, une sidebar mieux segmentée et un état actif plus contrasté.
2. Veiller à ce que la version compacte reste lisible en largeur desktop et ne casse pas le mode responsive déjà prévu sous `768px`.
3. Étendre les tests de `buildSpecializationTreeContext()` pour vérifier la présence et la cohérence du résumé courant dérivé.
4. Ajouter des assertions applicatives sur le marquage de l'entrée active et sur l'absence de résumé quand aucun arbre n'est disponible.
5. Vérifier que cette refonte ne modifie ni la sélection d'arbre, ni les états vides, ni les contrats déjà couverts autour du viewport.

**Validation visée :** la refonte UX reste strictement structurelle et n'altère pas les comportements applicatifs existants.

## Définition de done

- [ ] Le header de `SpecializationTreeApp` est visiblement plus compact.
- [ ] La sidebar expose un résumé de progression utile pour l'arbre courant.
- [ ] L'entrée active est immédiatement identifiable sans ambiguïté.
- [ ] Les redondances visibles entre header, sidebar et arbre courant sont réduites.
- [ ] Les tests verrouillent le nouveau contrat de contexte et l'absence de régression fonctionnelle observable.
