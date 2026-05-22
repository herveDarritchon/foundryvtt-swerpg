# GUX4 — Plan d'implémentation : Transformer le panneau de détail en panneau d'action contextuelle

## Contexte

Issue : [#329 — GUX4 - Transformer le panneau de détail en panneau d'action contextuelle](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/329)

Références principales :

- `documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md` (§5.1, §5.2)
- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/graphical-ux-refresh/issues-checklist.md`
- `documentation/plan/character-sheet/specialization-tree/313-exposer-un-view-model-de-noeud-actionnable.md`
- `documentation/plan/character-sheet/specialization-tree/314-brancher-les-interactions-ui-et-confirmations-dans-specialization-tree-app.md`
- `documentation/plan/character-sheet/specialization-tree/328-gux3-rendre-les-connexions-et-le-hover-plus-explicites-pour-la-progression.md`

L'existant dispose déjà d'un panneau de détail consultatif, d'un contrat d'action par nœud (`purchase` / `forget` / aucune action), d'un flux UI achat/oubli déjà branché dans `SpecializationTreeApp` et, depuis GUX3, d'un rafraîchissement contextuel du détail au hover. Le besoin de GUX4 est maintenant de faire du panneau le point d'entrée principal de décision : afficher l'action utile quand elle est autorisée, garder les raisons de blocage lisibles quand elle ne l'est pas, et enrichir le contexte avec la description du talent, sans réintroduire de logique métier dans la vue.

## Objectif

Transformer le panneau de détail de la vue graphique en panneau d'action contextuelle capable d'exposer, selon l'état du nœud, une action explicite d'achat ou d'oubli, le blocage éventuel et un contexte suffisant pour décider sans quitter l'écran.

## Périmètre

### Inclus

- affichage de l'action contextuelle `Purchase` ou `Refund/Forget` quand le nœud le permet ;
- maintien de l'état métier visible et de la raison de blocage pour les cas non actionnables ;
- ajout de la description du talent dans le panneau, sous une forme lisible et sobre ;
- absence volontaire d'action quand l'oubli n'est pas autorisé ;
- adaptation des tests applicatifs sur le contrat du panneau d'action.

### Exclus

- nouvelle règle métier d'achat, d'oubli, de disponibilité ou de remboursement ;
- refonte large des modales, de la microcopy globale ou des curseurs (GUX5) ;
- nouveaux gestes d'interaction comme double-clic, raccourci clavier ou menu secondaire ;
- refonte du layout général de l'application hors panneau ciblé.

## Fichiers pressentis

| Fichier                                               | Rôle                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `module/applications/specialization-tree-app.mjs`     | Construire le view-model du panneau, router l'action contextuelle et gérer le refresh |
| `templates/applications/specialization-tree-app.hbs`  | Rendre le panneau avec zone d'action, état, raison et description                     |
| `styles/applications.less`                            | Assurer la hiérarchie visuelle du panneau d'action sans bruit UX                       |
| `lang/fr.json`                                        | Ajouter ou compléter les libellés FR du panneau et des CTA                            |
| `lang/en.json`                                        | Ajouter ou compléter les libellés EN du panneau et des CTA                            |
| `tests/applications/specialization-tree-app.test.mjs` | Verrouiller le contrat du panneau d'action contextuelle                               |

## Plan d'implémentation

### Étape 1 — Recentrer le panneau sur un view-model d'action contextuelle

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Définir un builder UI unique pour le panneau à partir des données déjà disponibles sur le nœud ciblé : nom, coût, type, état, raison, description et `primaryAction` éventuelle.
2. Établir une convention d'affichage stable : nœud `available` → CTA d'achat ; nœud `purchased` oubliable → CTA de remboursement/oubli ; nœud `purchased` non oubliable → aucun CTA mais blocage explicite ; nœuds `locked` / `invalid` → panneau informatif sans action.
3. Garder toute décision métier dans le contrat actionnable existant ; le panneau ne doit que refléter l'état courant et exposer l'action déjà autorisée.

**Validation visée :** le panneau raconte immédiatement “que puis-je faire maintenant ?” sans divergence avec les règles déjà livrées par US17.

### Étape 2 — Rendre le panneau décisionnel, lisible et cohérent avec le hover

**Fichiers :** `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`, `module/applications/specialization-tree-app.mjs`

1. Afficher dans le panneau une zone d'action explicite avec verbe, coût et libellé localisé, sans dupliquer les contrôles ailleurs dans la vue.
2. Ajouter la description du talent sous une forme compacte, avec priorité visuelle donnée à l'état et à l'action avant le texte descriptif.
3. Conserver l'affichage de la raison de blocage quand le nœud n'est pas actionnable, et supprimer tout faux affordance visuel quand aucune action n'est permise.
4. Vérifier que le panneau continue de se mettre à jour correctement au hover et au changement de contexte, sans casser le flux de clic/action déjà branché dans l'application.

**Validation visée :** le panneau devient le point d'entrée principal pour décider, agir ou comprendre pourquoi l'action est impossible.

### Étape 3 — Verrouiller le contrat UX du panneau d'action

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

1. Ajouter des tests couvrant les cas `available`, `purchased` oubliable, `purchased` non oubliable, `locked` et `invalid`.
2. Vérifier que le CTA affiché correspond strictement à `primaryAction` et qu'aucune action n'est rendue quand le contrat métier ne l'autorise pas.
3. Vérifier que le panneau affiche bien la raison de blocage et la description attendue sans régression sur le détail contextuel déjà introduit par GUX3.
4. Vérifier que l'activation du CTA continue de déléguer au flux UI existant (confirmation, achat/oubli, notifications) sans logique parallèle dans le panneau.

**Validation visée :** le panneau d'action reste cohérent, explicite et sans régression fonctionnelle observable.

## Définition de done

- [ ] Le panneau de détail expose une action contextuelle explicite quand le nœud est réellement actionnable.
- [ ] Les cas bloqués conservent un état et une raison lisibles sans faux bouton d'action.
- [ ] La description du talent est visible dans le panneau sans masquer l'information décisionnelle principale.
- [ ] Le panneau reste synchronisé avec le hover contextuel et le flux d'action déjà existant.
- [ ] Les tests couvrent les états actionnables et non actionnables du panneau.
