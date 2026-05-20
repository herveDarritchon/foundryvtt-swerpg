# US16.7 — Plan d'implémentation : Compléter les traductions FR/EN des états et raisons

## Contexte

Issue : [#300 — US16.7 - Compléter les traductions FR/EN des états et raisons](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/300)

Références :

- `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`
- `documentation/plan/character-sheet/specialization-tree/299-exposer-un-detail-minimal-de-consultation.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us16-graphical-tree-rendering/project-plan.md`

US16.3 a déjà cadré le contrat UI des états, raisons et fallbacks. Le besoin restant est de compléter et homogénéiser les libellés FR/EN réellement consommés par ce contrat, afin d'éviter tout texte utilisateur hardcodé et de garder des messages compréhensibles dans les cas dégradés.

## Objectif

Garantir que tous les états de nœud, raisons principales et fallbacks visibles de l'arbre de spécialisation disposent de clés i18n cohérentes en français et en anglais.

## Périmètre

### Inclus

- complétude des clés i18n consommées par le mapping US16.3 ;
- cohérence FR/EN des états, raisons de verrouillage, raisons d'invalidité et fallbacks ;
- reformulation des messages techniques en libellés utilisateur compréhensibles ;
- vérification ciblée du contrat i18n par tests existants ou ajustés.

### Exclus

- ajout de nouvelles règles métier d'état ou de raison ;
- refonte du layout, du dessin PIXI ou du tooltip ;
- achat de nœud, interactions métier ou persistance de sélection.

## Fichiers pressentis

| Fichier                                                         | Rôle                                                |
| --------------------------------------------------------------- | --------------------------------------------------- |
| `lang/fr.json`                                                  | Compléter les libellés FR                           |
| `lang/en.json`                                                  | Compléter les libellés EN                           |
| `tests/applications/specialization-tree/node-ui-state.test.mjs` | Verrouiller la parité des clés et fallbacks attendus |
| `tests/applications/specialization-tree-app.test.mjs`           | Vérifier l'absence de texte utilisateur hardcodé    |

## Plan d'implémentation

### Étape 1 — Inventorier le contrat i18n réellement consommé

**Fichiers :** `lang/fr.json`, `lang/en.json`

1. Relever la liste des états, raisons et fallbacks attendus par le mapper UI défini en US16.3.
2. Vérifier que chaque clé visible dans le détail minimal US16.6 existe en FR et en EN, avec la même structure de namespace.
3. Identifier les trous restants : raison inconnue, nœud non résolu, cas verrouillé et cas invalide.

### Étape 2 — Compléter et harmoniser les libellés utilisateur

**Fichiers :** `lang/fr.json`, `lang/en.json`

1. Ajouter les clés manquantes pour les états de nœud et les raisons principales attendues par l'issue.
2. Reformuler les messages trop techniques pour qu'ils restent compréhensibles côté joueur, sans divergence de sens entre FR et EN.
3. Vérifier que les fallbacks restent explicites et utiles quand une raison ou un état ne peut pas être résolu finement.

### Étape 3 — Sécuriser la cohérence par des tests ciblés

**Fichiers :** `tests/applications/specialization-tree/node-ui-state.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Couvrir la présence des labels pour les états attendus (`purchased`, `available`, `locked`, `invalid`, `unresolved`).
2. Couvrir les raisons majeures de verrouillage et d'invalidité, ainsi que le fallback de raison inconnue.
3. Vérifier que l'application consomme des clés i18n localisées plutôt que des chaînes utilisateur hardcodées.

## Définition de done

- [ ] Les clés FR et EN nécessaires aux états et raisons visibles sont complètes et symétriques.
- [ ] Aucun texte utilisateur visible lié aux états/raisons n'est hardcodé dans l'application.
- [ ] Les raisons techniques sont reformulées de manière compréhensible.
- [ ] Les fallbacks restent lisibles pour les cas incomplets ou inconnus.
- [ ] Les tests ciblés verrouillent la cohérence du contrat i18n.
