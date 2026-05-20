# US16.2 — Plan d'implémentation : Construire le view-model de rendu de l'arbre courant

## Contexte

Issue : [#295 — US16.2 - Construire le view-model de rendu de l'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/295)

Plan parent : `project-plan.md` (US16 Graphical Tree Rendering)
Cadrage parent :
`documentation/cadrage/character-sheet/specialization-tree/cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`

Règle métier : **le view-model de rendu expose, à partir du `currentTree` résolu par US16.1, une structure normalisée de
nœuds et connexions prête à être consommée par la couche PIXI, sans logique métier dans le canvas.**

## État des lieux

La construction du view-model est actuellement embarquée dans `buildSpecializationTreeContext()` à
`module/applications/specialization-tree-app.mjs`. Cette fonction (~291 lignes) mêle résolution d'arbre, layout, mapping
d'états et préparation des données de rendu. Le view-model n'est pas extrait dans une fonction pure, isolée et testable
unitairement.

### Problème adressé par le plan

1. Le code qui construit les nœuds et connexions pour le rendu PIXI est noyé dans le contexte de l'application.
2. Il n'existe pas de contrat explicite (type/interface) pour le view-model de rendu.
3. Le fallback sur un talent introuvable n'est pas explicite ni déterministe.
4. Impossible de tester la structure des données de rendu sans instancier l'application complète.

## Solution proposée

Extraire un builder pur `buildRenderViewModel(currentTree, talentLookup)` :

1. **Normalisation des nœuds** — chaque nœud expose `nodeId`, talent résolu ou fallback, coût, `row`, `column`, état
   métier, métadonnées d'affichage.
2. **Préparation des connexions** — transformer les arêtes du modèle domaine en une structure prête pour PIXI (
   coordonnées, type de trait).
3. **Fallback explicite** — talent introuvable → nœud avec état `unresolved`, données de fallback déterminées, pas
   d'erreur silencieuse.

### Contrat du view-model

```js
// RenderNode
{
  nodeId: string,
    talent
:
  {
    name: string, uuid
  :
    string
  }
|
  FallbackTalent,
    cost
:
  number,
    row
:
  number,
    column
:
  number,
    state
:
  NodeState,         // locked, available, purchased, unavailable, unresolved
    displayMeta
:
  {
    label: string,
      isPurchased
  :
    boolean,
      isAvailable
  :
    boolean,
      isLocked
  :
    boolean,
      isUnresolved
  :
    boolean,
  }
,
}

// RenderConnection
{
  fromNodeId: string,
    toNodeId
:
  string,
    type
:
  'straight' | 'angled',
    isActive
:
  boolean,
}

// RenderViewModel
{
  nodes: RenderNode[],
    connections
:
  RenderConnection[],
    metadata
:
  {
    treeName: string,
      treeId
  :
    string,
      totalNodes
  :
    number,
      totalConnections
  :
    number,
  }
,
}
```

## Fichiers impactés

| Fichier                                                         | Modifications                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `module/applications/specialization-tree/render-view-model.mjs` | Nouveau builder pur `buildRenderViewModel()`               |
| `module/applications/specialization-tree-app.mjs`               | Remplacer la préparation embarquée par un appel au builder |
| `module/applications/specialization-tree/types.mjs`             | Nouveau (ou existant) — types du view-model                |

## Tests

`tests/applications/specialization-tree/render-view-model.test.mjs` (nouveau) :

- rendu nominal : tous les nœuds et connexions présents
- talent introuvable : fallback explicite présent
- arbre vide : view-model avec nœuds/connexions vides
- perte de connexion si nœud source absent
- pas de logique PIXI dans le builder

## Définition de done

- [ ] `buildRenderViewModel()` est une fonction pure, sans dépendance `game`, `ui`, `canvas`
- [ ] Le view-model expose nœuds normalisés, connexions, métadonnées
- [ ] Le fallback talent introuvable est explicite et testé
- [ ] L'application utilise le builder plutôt que la logique embarquée
- [ ] Couverture > 90% sur le nouveau fichier
- [ ] Aucune régression sur les tests existants

## Découpage en sous-issues

| Issue | Titre                                            | Estimation |
| ----- | ------------------------------------------------ | ---------- |
| #295  | Story parente                                    | 2          |
| —     | US16.2.a — Normaliser les nœuds du tree courant  | 1          |
| —     | US16.2.b — Préparer les connexions du view-model | 1          |
| —     | US16.2.c — Gérer le fallback talent introuvable  | 1          |
| —     | US16.2.t — Tests du view-model de rendu          | 1          |

## Dépendances

- **Blocked by** : #294 (US16.1 — déterminer arbre courant)
- **Blocked by** : Feature #200 (US16 — Graphical Tree Rendering)
- **Blocks** : US16.3 (mapping états/raisons), US16.4 (layout graphique), US16.8 (consolidation)
