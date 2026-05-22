# US16.5 — Plan d'implémentation : Dessiner les connexions et les nœuds dans PIXI

## Contexte

Issue : [#298 — US16.5 - Dessiner les connexions et les nœuds dans PIXI](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/298)

Références :

- `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`
- `documentation/plan/character-sheet/specialization-tree/297-definir-le-layout-graphique-minimal.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us16-graphical-tree-rendering/project-plan.md`

L'existant fournit déjà les entrées nécessaires au rendu :

- le viewport PIXI autonome de `SpecializationTreeApp` ;
- `buildSpecializationTreeContext()` qui expose `renderNodes` et `renderConnections` pour l'arbre courant ;
- le mapping UI des états (US16.3) et le layout minimal centralisé (US16.4).

Le besoin de l'issue est maintenant de transformer ce contrat de rendu en affichage graphique lisible, strictement en lecture seule, sans réintroduire de logique métier dans PIXI.

## Objectif

Dessiner l'arbre courant dans le viewport PIXI en affichant les connexions, les nœuds, leurs informations minimales et leurs variantes visuelles, tout en conservant un rendu consultatif et déterministe.

## Périmètre

### Inclus

- nettoyage du viewport avant chaque rendu ;
- dessin des connexions avant les nœuds ;
- dessin des cartes de nœud à partir des positions calculées ;
- affichage du nom du talent, du coût XP et d'un indicateur ranked / non-ranked si disponible ;
- application des variantes visuelles issues du mapping UI.

### Exclus

- achat de nœud ;
- détail riche ou tooltip métier (US16.6) ;
- zoom, pan, drag ou navigation avancée ;
- rendu pixel-perfect, animations ou transitions.

## Fichiers pressentis

| Fichier                                               | Rôle                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `module/applications/specialization-tree-app.mjs`     | Consommer `renderNodes` / `renderConnections` et piloter le rendu PIXI read-only |
| `tests/applications/specialization-tree-app.test.mjs` | Vérifier le contrat observable du rendu, son cleanup et l'absence d'effet métier |

## Plan d'implémentation

### Étape 1 — Brancher le pipeline de dessin PIXI sur le contexte de rendu

**Fichiers :** `module/applications/specialization-tree-app.mjs`

**Actions :**

1. Ajouter ou compléter une méthode dédiée de rendu (`#drawTree()` ou équivalent) qui reconstruit le conteneur graphique à partir du contexte courant.
2. Dessiner les connexions via `PIXI.Graphics` avant tout rendu de nœud afin de garantir une superposition propre.
3. Dessiner chaque nœud à partir de `x`, `y`, des dimensions centralisées par US16.4 et de la `variant` fournie par US16.3.

**Validation visée :** le viewport reconstruit un arbre complet sans recalcul métier local.

### Étape 2 — Rendre les informations minimales lisibles, en lecture seule

**Fichiers :** `module/applications/specialization-tree-app.mjs`

**Actions :**

1. Ajouter les libellés visibles minimum : nom du talent, coût XP et indication ranked / non-ranked quand l'information existe.
2. Prévoir un rendu sobre mais explicite pour les nœuds dégradés (`invalid`, `unresolved`) sans casser l'ensemble du viewport.
3. Garder le rendu strictement consultatif : aucun appel à `purchaseTalentNode`, aucune mutation du document, aucun comportement d'achat implicite.

**Validation visée :** l'arbre est lisible et distinguable visuellement sans quitter le mode lecture seule.

### Étape 3 — Verrouiller le contrat de rendu par des tests ciblés

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

**Actions :**

1. Vérifier que le conteneur PIXI est nettoyé puis reconstruit à chaque rerender.
2. Vérifier l'ordre de dessin observable : connexions d'abord, nœuds ensuite.
3. Vérifier que les informations minimales et les variantes visuelles sont bien consommées depuis le contexte de rendu.
4. Vérifier qu'aucune interaction graphique de cette sous-issue ne déclenche d'action métier.

**Validation visée :** le rendu reste stable sans assertions pixel-perfect fragiles.

## Définition de done

- [ ] Le viewport est nettoyé puis redessiné à chaque rendu.
- [ ] Les connexions sont visibles derrière les nœuds.
- [ ] Les nœuds affichent au minimum le nom, le coût XP et l'indication ranked / non-ranked si disponible.
- [ ] Les états sont distinguables visuellement via les variantes de US16.3.
- [ ] Le rendu reste strictement en lecture seule.
- [ ] Les tests couvrent le contrat observable sans dépendre d'un rendu pixel-perfect.
