# US17.4 — Plan d'implémentation : Brancher les interactions UI et confirmations dans SpecializationTreeApp

## Contexte

Issue : [#314 — US17.4 - Brancher les interactions UI et confirmations dans SpecializationTreeApp](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/314)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- `documentation/plan/character-sheet/specialization-tree/311-creer-le-service-metier-dachat-et-doubli-de-noeud.md`
- `documentation/plan/character-sheet/specialization-tree/312-stabiliser-la-persistance-acteur-et-limpact-xp.md`
- `documentation/plan/character-sheet/specialization-tree/313-exposer-un-view-model-de-noeud-actionnable.md`

L'existant dispose déjà d'un view-model actionnable par nœud, d'un flux applicatif d'achat, d'un flux applicatif d'oubli et d'un clic PIXI encore limité à la consultation via tooltip. Le besoin de US17.4 est de transformer ce clic en interaction utilisateur contrôlée, avec garde-fous de permission, confirmation explicite et notifications lisibles, sans réintroduire de logique métier dans l'application.

## Objectif

Permettre à `SpecializationTreeApp` de déclencher un achat ou un oubli depuis un nœud actionnable, après confirmation utilisateur, puis de restituer un retour immédiat succès/échec cohérent avec les `reasonCode` métier et les permissions Foundry.

## Périmètre

### Inclus

- déclenchement de l'action primaire d'un nœud (`purchase` ou `forget`) depuis l'UI ;
- garde de permission avant mutation (`actor.isOwner` ou équivalent applicatif) ;
- confirmation localisée pour achat et oubli ;
- notifications succès/échec alignées sur les raisons métier ;
- fermeture/mise à jour de l'état d'interaction local après action ou annulation ;
- tests d'intégration applicative du flux UI.

### Exclus

- recalcul métier achat/oubli dans l'application ;
- synchronisation transverse arbre + onglet Talents après update acteur (`US17.5`) ;
- audit log d'oubli ou enrichissement du payload d'audit (`US17.6`) ;
- polish UX étendu (hover, tooltips enrichis, états visuels avancés) au-delà du flux nécessaire.

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/applications/specialization-tree-app.mjs` | Orchestrer clic nœud, permission, confirmation, appel achat/oubli, notification et refresh local |
| `module/lib/talent-node/talent-node-purchase.mjs` | Contrat de succès/échec déjà consommé par l'UI d'achat |
| `module/lib/talent-node/talent-node-forget.mjs` | Contrat symétrique à brancher pour l'oubli |
| `templates/applications/specialization-tree-app.hbs` | Ajouter si nécessaire un conteneur/état minimal pour l'interaction active côté application |
| `lang/fr.json` | Ajouter les textes FR de confirmation, refus permission et oubli |
| `lang/en.json` | Ajouter les textes EN de confirmation, refus permission et oubli |
| `tests/applications/specialization-tree-app.test.mjs` | Couvrir clic actionnable, annulation, permissions, notifications achat/oubli |

## Plan d'implémentation

### Étape 1 — Remplacer le clic consultatif par un routeur d'action UI sûr

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Faire évoluer le `pointerdown` de nœud pour distinguer consultation simple et action primaire quand `node.actionable.primaryAction` existe.
2. Centraliser un garde applicatif unique : acteur présent, nœud/actionRef valides, permission d'édition suffisante, action permise par le view-model.
3. Conserver les règles métier exclusivement dans `actionable` et les helpers domaine, l'application ne faisant qu'orchestrer le flux.

### Étape 2 — Brancher confirmations et exécution achat / oubli

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `module/lib/talent-node/talent-node-purchase.mjs`, `module/lib/talent-node/talent-node-forget.mjs`, `lang/fr.json`, `lang/en.json`

1. Introduire un helper UI unique de confirmation basé sur `DialogV2.confirm`, capable de formater séparément achat et oubli avec nom du talent, coût XP et libellé d'action.
2. Router l'action confirmée vers `purchaseTalentNode(...)` ou `forgetTalentNode(...)` selon `primaryAction`, sans dupliquer la validation métier ni la structure des erreurs.
3. Mapper les retours métier vers notifications localisées : succès achat, succès oubli, échec métier explicite, refus de permission ou annulation silencieuse selon la convention retenue.

### Étape 3 — Verrouiller le contrat d'intégration UI

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`, `templates/applications/specialization-tree-app.hbs`

1. Remplacer les assertions obsolètes “clic = tooltip seulement” par des scénarios ciblant achat autorisé, oubli autorisé, action bloquée et annulation de confirmation.
2. Vérifier qu'aucune mutation n'est tentée sans permission, qu'aucun service métier n'est appelé si la confirmation est refusée et que la notification affichée correspond au résultat.
3. Garder le support de consultation des nœuds non actionnables et l'absence d'effet de bord quand aucun `primaryAction` n'est disponible.

## Définition de done

- [ ] Un nœud actionnable peut déclencher un achat ou un oubli depuis `SpecializationTreeApp`.
- [ ] Chaque mutation passe d'abord par une confirmation utilisateur localisée.
- [ ] Les permissions empêchent toute mutation non autorisée avant appel métier.
- [ ] Les notifications UI reflètent correctement succès, refus métier et blocage applicatif.
- [ ] Les tests d'application couvrent achat, oubli, annulation et absence de permission.
