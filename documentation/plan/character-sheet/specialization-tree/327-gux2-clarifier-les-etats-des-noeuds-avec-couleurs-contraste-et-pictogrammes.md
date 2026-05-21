# GUX2 — Plan d'implémentation : clarifier les états des nœuds avec couleurs, contraste et pictogrammes

## Contexte

- Issue : [#327 — GUX2 - Clarifier les états des nœuds avec couleurs, contraste et pictogrammes](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/327)
- Parent : [#325 — Graphical UX Refresh - Rendre l'arbre de spécialisation plus lisible et actionnable](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/325)
- Références utiles :
  - `documentation/plan/character-sheet/talent/234-plan-appliquer-variantes-visuelles-etats-noeud.md`
  - `documentation/plan/character-sheet/talent/235-plan-fix-afficher-detail-noeuds-raisons-blocage-vue-graphique.md`
  - `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`

Le besoin exprimé par l'issue est de rendre l'état de chaque nœud immédiatement compréhensible sans dépendre uniquement de la couleur : type métier actif/passif, contraste selon disponibilité/achat, pictogrammes d'état, coût XP plus stable visuellement, et lisibilité maintenue des nœuds verrouillés.

## Objectif

Renforcer le contrat visuel du specialization tree pour que chaque nœud expose clairement son type et son état métier en combinant couleur, contraste, iconographie et hiérarchie visuelle, sans modifier les règles domaine ni réintroduire de logique métier côté UI.

## Périmètre

### Inclus

- clarification des variantes visuelles des états `purchased`, `available`, `locked`, `invalid` ;
- différenciation visuelle explicite des nœuds actifs/passifs ;
- ajout d'un pictogramme d'état ou d'un marqueur équivalent non dépendant de la couleur seule ;
- stabilisation de l'affichage du coût XP dans la carte de nœud ;
- maintien d'une bonne lisibilité des nœuds verrouillés pour la planification ;
- tests ciblés du mapping état/type -> rendu observable.

### Exclus

- modification des règles de calcul d'état ou de `reasonCode` ;
- refonte du hover et des connexions (`#328`) ;
- transformation du panneau de détail en panneau d'action (`#329`) ;
- microcopy/légende globale hors besoins stricts de cohérence locale (`#330`).

## Fichiers pressentis

| Fichier | Rôle |
| --- | --- |
| `module/applications/specialization-tree/node-ui-state.mjs` | Canoniser les variantes visuelles et métadonnées UI des nœuds |
| `module/applications/specialization-tree-app.mjs` | Brancher le rendu PIXI/view-model sur le nouveau contrat visuel |
| `lang/fr.json` | Libellés FR complémentaires si pictogrammes/légende locale en ont besoin |
| `lang/en.json` | Libellés EN complémentaires si pictogrammes/légende locale en ont besoin |
| `tests/applications/specialization-tree/node-ui-state.test.mjs` | Verrouiller le mapping état/type -> variante/iconographie |
| `tests/applications/specialization-tree-app.test.mjs` | Vérifier l'intégration du contrat dans le rendu applicatif |

## Plan d'implémentation

### Étape 1 — Canoniser le langage visuel des nœuds

**Fichiers :** `module/applications/specialization-tree/node-ui-state.mjs`

1. Définir une matrice unique qui combine état métier, type de nœud et attributs de rendu observables : palette, contraste, opacité, bordure, pictogramme, traitement du coût XP.
2. Réserver au moins un indice non chromatique par état pour éviter une lecture dépendante de la couleur seule.
3. Prévoir explicitement le cas des nœuds verrouillés afin qu'ils restent planifiables et lisibles, sans paraître désactivés au point de masquer le contenu.

### Étape 2 — Appliquer ce contrat au view-model et au rendu de l'arbre

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Enrichir les nœuds rendus avec les métadonnées nécessaires : type métier, variant UI, pictogramme, style du coût XP, niveau de contraste.
2. Remplacer les choix visuels dispersés par la consommation du mapper dédié pour garder une seule source de vérité applicative.
3. Vérifier que le coût XP conserve une place stable et lisible quel que soit l'état du nœud.

### Étape 3 — Finaliser les libellés utiles et verrouiller les tests

**Fichiers :** `lang/fr.json`, `lang/en.json`, `tests/applications/specialization-tree/node-ui-state.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Ajouter les clés i18n minimales seulement si le contrat retenu expose des libellés ou descriptions d'icônes côté UI.
2. Couvrir les combinaisons clés : actif/passif x `purchased`/`available`/`locked`/`invalid`.
3. Vérifier que les nœuds verrouillés restent lisibles et que le coût XP ne change pas de hiérarchie visuelle selon l'état.

## Définition de done

- [ ] Chaque nœud exprime son état avec au moins deux signaux visuels cohérents, dont un non basé uniquement sur la couleur.
- [ ] Les nœuds actifs et passifs sont distinguables sans ambiguïté.
- [ ] Les nœuds verrouillés restent lisibles pour la planification.
- [ ] Le coût XP reste stable, visible et cohérent sur l'ensemble des états.
- [ ] Le mapping visuel est centralisé et couvert par des tests ciblés.
