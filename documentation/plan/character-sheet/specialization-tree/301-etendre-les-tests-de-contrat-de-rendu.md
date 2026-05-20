# US16.8 — Plan d'implémentation : Étendre les tests de contrat de rendu

## Contexte

Issue : [#301 — US16.8 - Étendre les tests de contrat de rendu](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/301)

Références :

- `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`
- `documentation/plan/character-sheet/specialization-tree/297-definir-le-layout-graphique-minimal.md`
- `documentation/plan/character-sheet/specialization-tree/298-dessiner-les-connexions-et-les-noeuds-dans-pixi.md`
- `documentation/plan/character-sheet/specialization-tree/299-exposer-un-detail-minimal-de-consultation.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`

Le rendu graphique de l'arbre de spécialisation dispose déjà d'un view-model, d'un mapping d'état/raison et d'un layout applicatif. Le besoin restant est de consolider une couverture de tests lisible qui verrouille ce contrat observable sans figer le rendu PIXI au pixel près.

## Objectif

Sécuriser les comportements attendus de `SpecializationTreeApp` et de `buildSpecializationTreeContext()` via des tests de contrat ciblés sur la sélection d'arbre, l'état vide, la structure du view-model, le mapping des états/raisons et l'absence d'effet métier.

## Périmètre

### Inclus

- choix du dernier arbre disponible par défaut et fallback de sélection ;
- état vide quand aucun arbre exploitable n'est résolu ;
- structure observable de `renderNodes` et `renderConnections` ;
- mapping des `nodeState`, `reasonCode` et `reasonLabel` localisés ;
- absence de dépendance au canvas de scène ;
- absence de comportement d'achat déclenché par le rendu.

### Exclus

- snapshots graphiques PIXI ;
- assertions sur des pixels exacts ou sur un thème visuel détaillé ;
- tests d'interactions avancées relevant du zoom/pan ou d'US17/US18.

## Fichiers pressentis

| Fichier                                               | Rôle                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `tests/applications/specialization-tree-app.test.mjs` | Consolider et compléter les tests de contrat du view-model et du rendu observable |

## Plan d'implémentation

### Étape 1 — Consolider la couverture du contrat cœur

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

1. Regrouper les scénarios de contrat autour des axes attendus par l'issue : sélection par défaut, fallback, état vide, nœuds et connexions.
2. Uniformiser les fixtures minimales pour que chaque test exprime clairement le contrat métier attendu.
3. Garder des messages d'échec explicites pour faciliter le diagnostic en cas de régression.

### Étape 2 — Étendre les assertions sur le mapping UI et les garanties non fonctionnelles

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

1. Vérifier explicitement les champs contractuels des nœuds rendus (`nodeState`, `nodeStateLabel`, `reasonCode`, `reasonLabel`, `variant`).
2. Couvrir les cas localisés utiles : nœud disponible, nœud verrouillé, raison absente, raison de fallback et talent introuvable.
3. Verrouiller que les tests passent par le view-model et le rendu observable sans dépendre d'un canvas de scène ni déclencher de logique d'achat.

### Étape 3 — Réduire la fragilité de la suite de tests

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

1. Remplacer ou éviter les assertions trop couplées à des détails de dessin quand une assertion sur le contrat suffit.
2. Préférer des vérifications structurelles et sémantiques aux vérifications pixel-perfect.
3. S'assurer que la suite documente clairement ce qui relève du contrat stable et ce qui reste un détail d'implémentation graphique.

## Définition de done

- [ ] Les tests couvrent explicitement le choix d'arbre par défaut, le fallback et l'état vide.
- [ ] Les tests couvrent la structure attendue de `renderNodes` et `renderConnections`.
- [ ] Les états et raisons exposés au rendu sont vérifiés via des assertions lisibles et localisées.
- [ ] Aucun test de cette issue ne dépend d'un snapshot graphique PIXI ou d'assertions pixel-perfect.
- [ ] Les tests verrouillent l'absence d'achat implicite et l'absence de dépendance au canvas de scène.
