# US17.5 — Plan d'implémentation : Synchroniser l'arbre et l'onglet Talents après update acteur

## Contexte

Issue : [#315 — US17.5 - Synchroniser l'arbre et l'onglet Talents après update acteur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/315)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/issues-checklist.md`
- `documentation/plan/character-sheet/specialization-tree/311-creer-le-service-metier-dachat-et-doubli-de-noeud.md`
- `documentation/plan/character-sheet/specialization-tree/312-stabiliser-la-persistance-acteur-et-limpact-xp.md`

Après US17.4, le flux achat/oubli déclenche bien une mise à jour acteur, mais US17.5 doit verrouiller la synchronisation des deux vues ouvertes : l'arbre de spécialisation et l'onglet Talents consolidé.

## Objectif

Garantir qu'un `actor.update()` pertinent après achat ou oubli de nœud rafraîchit les vues Talents sans divergence visuelle : l'arbre se met à jour sans perdre son viewport courant, et l'onglet Talents reflète immédiatement l'état consolidé recalculé depuis l'acteur.

## Périmètre

### Inclus

- détection des updates acteur pertinents pour la progression talent (`talentPurchases`, `experience.spent`) ;
- rafraîchissement de l'arbre de spécialisation déjà ouvert sur le bon acteur ;
- conservation du viewport et de l'état de consultation de l'arbre pendant le refresh ;
- alignement de l'onglet Talents sur les données acteur fraîches après achat/oubli ;
- garde-fous pour éviter les rerenders inutiles sur des updates non liés.

### Exclus

- nouvelles règles métier d'achat/oubli ;
- audit log (`US17.6`) ;
- campagne complète de tests de non-régression et matrice de refresh (`US17.7`) ;
- refonte UI/CSS de l'arbre ou de l'onglet Talents.

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/documents/actor.mjs` | Filtrer les updates acteur qui doivent déclencher la synchronisation UI |
| `module/applications/specialization-tree-app.mjs` | Recharger le contexte arbre et préserver le viewport pendant le refresh |
| `module/applications/sheets/character-sheet.mjs` | Garantir que la vue Talents se recalcule sur l'état acteur mis à jour |
| `tests/applications/specialization-tree-app.test.mjs` | Cas de refresh arbre avec viewport conservé *(si couverture locale minimale ajoutée dans la même PR)* |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | Cas de réalignement de la vue Talents *(sinon couverture reportée à US17.7)* |

## Plan d'implémentation

### Étape 1 — Centraliser le déclenchement du refresh post-update

**Fichiers :** `module/documents/actor.mjs`, `module/applications/specialization-tree-app.mjs`

1. Identifier précisément les chemins d'update acteur qui doivent déclencher une synchronisation des vues Talents.
2. Réutiliser un point d'entrée de refresh explicite côté `SpecializationTreeApp` au lieu de disperser la logique dans plusieurs appels.
3. S'assurer que le refresh relit l'état courant de l'acteur, sans dépendre d'un cache UI obsolète.

### Étape 2 — Préserver le viewport de l'arbre pendant le rerender

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Capturer avant refresh les informations minimales de consultation (arbre courant, zoom/pan/caméra, sélection utile si présente).
2. Recalculer le contexte puis réappliquer cet état après rerender.
3. Prévoir un no-op sûr si l'application, l'arbre courant ou le canvas interne ne sont plus disponibles.

### Étape 3 — Réaligner l'onglet Talents sur l'état acteur rafraîchi

**Fichiers :** `module/applications/sheets/character-sheet.mjs`, `module/documents/actor.mjs`

1. Vérifier que la vue consolidée Talents est bien reconstruite depuis l'acteur au render suivant, sans état dérivé persistant.
2. Si le rerender natif de la fiche ne suffit pas dans ce flux, ajouter un rerender ciblé et conditionnel de la sheet ouverte du même acteur.
3. Éviter les doubles refreshs et toute boucle de rerender en limitant le déclenchement aux updates pertinents.

## Définition de done

- [ ] Un achat ou un oubli validé rafraîchit l'arbre de spécialisation ouvert après `actor.update()`.
- [ ] Le viewport de l'arbre est conservé pendant ce refresh.
- [ ] L'onglet Talents affiche immédiatement l'état consolidé mis à jour après achat/oubli.
- [ ] Les updates acteur non liés aux talents ne déclenchent pas de refresh Talents inutile.
- [ ] Les scénarios de non-régression restants sont explicitement couverts dans `US17.7`.
