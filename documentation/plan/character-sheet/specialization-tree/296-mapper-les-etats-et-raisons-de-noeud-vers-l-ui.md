# US16.3 — Plan d'implémentation : Mapper les états et raisons de nœud vers l'UI

## Contexte

Issue : [#296 — US16.3 - Mapper les états et raisons de nœud vers l'UI](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/296)

Références :

- `documentation/plan/character-sheet/specialization-tree/us16-2-current-tree-render-view-model.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`

L'existant expose déjà les entrées métier nécessaires :

- `buildRenderViewModel()` prépare les nœuds et connexions de rendu ;
- `getTreeNodesStates(...)` fournit `state` et `reasonCode` ;
- `module/applications/specialization-tree-app.mjs` contient déjà un mapping partiel des labels i18n et des variantes visuelles.

Le point à verrouiller pour US16.3 est un contrat UI explicite, testable et centralisé entre l'état métier du nœud et son rendu applicatif.

## Objectif

Transformer `nodeState` et `reasonCode` en données UI stables (variant visuel, libellé d'état, libellé de raison, fallback) sans recalculer les règles métier côté application.

## Périmètre

### Inclus

- mapping des états `purchased`, `available`, `locked`, `invalid` ;
- conservation du fallback `unresolved` déjà produit par le view-model quand le talent ne peut pas être résolu ;
- mapping des `reasonCode` vers des clés i18n compréhensibles ;
- couverture de test du contrat état / raison / libellé / variante.

### Exclus

- modification de `getTreeNodesStates(...)` ou des règles domaine ;
- layout graphique ;
- dessin PIXI ;
- achat de nœud et notifications métier.

## Fichiers pressentis

| Fichier                                                         | Rôle                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `module/applications/specialization-tree/node-ui-state.mjs`     | Nouveau module de mapping UI des états/raisons                   |
| `module/applications/specialization-tree-app.mjs`               | Remplacer le mapping inline par l'appel au mapper dédié          |
| `lang/fr.json`                                                  | Libellés FR des états et raisons                                 |
| `lang/en.json`                                                  | Libellés EN des états et raisons                                 |
| `tests/applications/specialization-tree/node-ui-state.test.mjs` | Tests unitaires du mapper pur                                    |
| `tests/applications/specialization-tree-app.test.mjs`           | Vérification d'intégration du contrat consommé par l'application |

## Plan d'implémentation

### Étape 1 — Extraire un mapper UI pur pour les nœuds

**Fichiers :** `module/applications/specialization-tree/node-ui-state.mjs`

**Actions :**

1. Centraliser les tables de correspondance `nodeState -> i18n key` et `reasonCode -> i18n key`.
2. Définir les variantes visuelles de nœud par état dans ce module plutôt que dans l'application principale.
3. Exposer une fonction pure qui reçoit le nœud de rendu, le résultat métier (`state`, `reasonCode`) et un `localize` injectable, puis retourne un nœud enrichi prêt pour l'UI.
4. Prévoir un fallback explicite pour les raisons inconnues et pour l'état `unresolved` déjà porté par le view-model.

**Validation visée :** le mapper peut être testé sans `game`, `ui`, `canvas` ni PIXI.

### Étape 2 — Brancher `SpecializationTreeApp` sur ce contrat unique

**Fichiers :** `module/applications/specialization-tree-app.mjs`

**Actions :**

1. Remplacer le mapping inline actuel (`NODE_STATE_LABEL_KEYS`, `REASON_LABEL_KEYS`, `NODE_STATE_VARIANTS`) par l'appel au module dédié.
2. Conserver `getTreeNodesStates(...)` comme unique source des états métier et interdire tout recalcul local.
3. Uniformiser les valeurs exposées au tooltip et au rendu (`nodeStateLabel`, `reasonLabel`, `variant`, fallback raison inconnue).
4. Vérifier que les nœuds sans raison bloquante n'exposent pas de faux message utilisateur.

**Validation visée :** l'application consomme un contrat stable et lisible, sans logique de mapping dispersée.

### Étape 3 — Compléter les traductions et verrouiller les tests

**Fichiers :** `lang/fr.json`, `lang/en.json`, `tests/applications/specialization-tree/node-ui-state.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

**Actions :**

1. Ajouter ou compléter les clés i18n pour les états et raisons attendus par l'issue.
2. Couvrir par tests unitaires les cas suivants :
   - `purchased`, `available`, `locked`, `invalid` ;
   - raison XP insuffisants ;
   - raison prérequis non remplis ;
   - raison talent/nœud/arbre incohérent ;
   - fallback raison inconnue ;
   - nœud `unresolved` conservé comme cas dégradé d'affichage.
3. Garder un test applicatif qui vérifie que le tooltip consomme bien les labels issus du mapper, pas des chaînes hardcodées.

**Validation visée :** le contrat observable UI est couvert de bout en bout et reste cohérent en FR/EN.

## Définition de done

- [ ] Chaque état attendu possède une variante UI dédiée.
- [ ] Chaque raison affichée passe par l'i18n.
- [ ] `SpecializationTreeApp` ne contient plus de mapping inline dispersé pour les états/raisons.
- [ ] Le fallback pour code de raison inconnu reste compréhensible.
- [ ] Les tests couvrent le mapping état / raison / libellé / variante.

## Ordre recommandé

1. Extraire le mapper pur.
2. Brancher l'application dessus.
3. Finaliser les clés i18n et la couverture de test.
