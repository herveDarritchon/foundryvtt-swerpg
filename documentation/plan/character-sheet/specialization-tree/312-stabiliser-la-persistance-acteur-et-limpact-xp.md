# US17.2 — Plan d'implémentation : Stabiliser la persistance acteur et l'impact XP

## Contexte

Issue : [#312 — US17.2 - Stabiliser la persistance acteur et l'impact XP](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/312)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- `documentation/plan/character-sheet/specialization-tree/311-creer-le-service-metier-dachat-et-doubli-de-noeud.md`

L'existant dispose déjà d'un contrat métier central via `processTalentNodeProgression()` et d'un flux `purchaseTalentNode()` qui applique un patch acteur sur l'achat. Le besoin de US17.2 est de stabiliser la couche applicative de persistance pour qu'achat et oubli appliquent toujours `talentPurchases` et `experience.spent` dans une seule mise à jour, sans divergence avec la convention XP actuelle de l'acteur.

## Objectif

Garantir qu'un achat ou un oubli validé produit un patch acteur unique, cohérent et réutilisable, aligné sur `system.progression.talentPurchases` et `system.progression.experience.spent`, afin de préparer les futures interactions UI et la synchronisation des vues sans réintroduire de logique métier.

## Périmètre

### Inclus

- stabilisation de la structure persistée des entrées `talentPurchases` ;
- persistance atomique progression + XP via un unique `actor.update()` ;
- ajout du flux de persistance d'oubli, symétrique au flux d'achat ;
- alignement explicite sur la convention XP existante (`experience.spent`) ;
- tests de non-régression sur patch, remboursement et absence d'update partielle.

### Exclus

- view-model UI des nœuds (`US17.3`) ;
- branchement des clics, confirmations et notifications (`US17.4`) ;
- refresh arbre / onglet Talents (`US17.5`) ;
- extension du périmètre audit log au-delà du comportement déjà présent côté achat (`US17.6`).

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/lib/talent-node/talent-node-persistence.mjs` | Nouveau helper applicatif pour transformer un résultat métier valide en patch acteur atomique |
| `module/lib/talent-node/talent-node-purchase.mjs` | Déléguer la persistance d'achat au helper partagé et conserver le contrat public existant |
| `module/lib/talent-node/talent-node-forget.mjs` | Nouveau point d'entrée applicatif pour persister l'oubli d'un nœud |
| `module/lib/talent-node/talent-node-progression.mjs` | Confirmer/compléter les métadonnées minimales nécessaires au patch applicatif |
| `tests/lib/talent-node/talent-node-persistence.test.mjs` | Vérifier la construction du patch atomique et les garde-fous applicatifs |
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | Réaligner les assertions d'achat sur la couche de persistance partagée |
| `tests/lib/talent-node/talent-node-forget.test.mjs` | Couvrir oubli nominal, remboursement XP et refus sans effet de bord |

## Plan d'implémentation

### Étape 1 — Formaliser le patch acteur atomique partagé

**Fichiers :** `module/lib/talent-node/talent-node-persistence.mjs`, `module/lib/talent-node/talent-node-progression.mjs`

1. Introduire un helper applicatif unique qui reçoit l'acteur et le `payload` valide du service métier.
2. Centraliser dans ce helper le patch `actor.update()` sur `system.progression.talentPurchases` et `system.progression.experience.spent`.
3. Verrouiller la forme persistée minimale d'un achat (`treeId`, `treeUuid`, `nodeId`, `talentId`, `talentUuid`, `specializationId`) pour éviter toute divergence entre achat et oubli.

### Étape 2 — Brancher achat et oubli sur la même couche de persistance

**Fichiers :** `module/lib/talent-node/talent-node-purchase.mjs`, `module/lib/talent-node/talent-node-forget.mjs`, `module/lib/talent-node/talent-node-persistence.mjs`

1. Faire déléguer `purchaseTalentNode()` au helper partagé sans changer son contrat d'appel actuel.
2. Ajouter un flux `forgetTalentNode()` qui réutilise `processTalentNodeProgression(..., 'forget')` puis applique le même mécanisme atomique de persistance.
3. Garder l'impact XP strictement aligné avec la convention existante : achat = incrément de `experience.spent`, oubli autorisé = décrément/remboursement dans le même patch.

### Étape 3 — Verrouiller les non-régressions applicatives

**Fichiers :** `tests/lib/talent-node/talent-node-persistence.test.mjs`, `tests/lib/talent-node/talent-node-purchase.test.mjs`, `tests/lib/talent-node/talent-node-forget.test.mjs`

1. Vérifier qu'un succès achat/oubli produit toujours un unique patch contenant à la fois progression et XP.
2. Vérifier qu'aucun `actor.update()` n'est déclenché quand la validation métier échoue en amont.
3. Couvrir explicitement l'ajout d'achat, le retrait d'achat, le remboursement XP et la stabilité des entrées persistées.

## Définition de done

- [ ] Achat et oubli appliquent la progression et l'XP dans un seul `actor.update()`.
- [ ] La structure persistée des entrées `talentPurchases` est identique quel que soit le flux.
- [ ] L'oubli autorisé retire l'entrée ciblée et ajuste `experience.spent` selon la convention actuelle.
- [ ] Aucun patch partiel n'est émis quand le service métier refuse l'action.
- [ ] Les tests applicatifs couvrent les flux nominaux et les principaux refus sans effet de bord.
