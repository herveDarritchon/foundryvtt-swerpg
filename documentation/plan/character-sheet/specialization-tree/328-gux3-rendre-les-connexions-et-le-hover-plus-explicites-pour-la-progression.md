# GUX3 — Plan d'implémentation : Rendre les connexions et le hover plus explicites pour la progression

## Contexte

Issue : [#328 — GUX3 - Rendre les connexions et le hover plus explicites pour la progression](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/328)

Référence principale : `documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md` (§4.1, §4.2, §6.2)

L'existant affiche déjà l'arbre courant dans `SpecializationTreeApp`, avec des connexions rendues en PIXI, des variantes visuelles de nœud déjà enrichies côté UI et un panneau de détail consultatif. En revanche, la lecture du chemin de progression reste encore trop implicite : les liens racontent peu la progression, le survol n'aide pas assez à comprendre prérequis et débouchés, et l'arbre entier garde un poids visuel uniforme même quand l'utilisateur explore un talent précis.

## Objectif

Rendre la progression plus immédiate dans la vue graphique en donnant un sens visuel aux connexions et en introduisant un hover contextuel qui révèle clairement le nœud ciblé, ses prérequis directs, les talents qu'il débloque et le reste de l'arbre en arrière-plan, sans modifier les règles métier d'achat, d'oubli ou de déblocage.

## Périmètre

### Inclus

- hiérarchisation visuelle des connexions selon la progression ;
- état de survol explicite pour le nœud ciblé ;
- mise en évidence des prérequis directs et des talents débloqués ;
- atténuation du reste de l'arbre pendant le hover ;
- affichage du panneau de détail au survol ;
- extension des tests applicatifs sur le contrat de rendu et d'interaction.

### Exclus

- changement des règles métier de disponibilité, achat, oubli ou remboursement ;
- refonte du panneau de détail au-delà de son affichage contextuel ;
- nouvelles modales, double-clic ou nouveaux raccourcis d'action ;
- refonte large du layout général de la fenêtre déjà traitée par les issues GUX précédentes.

## Fichiers pressentis

| Fichier                                                     | Rôle                                                                                   |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `module/applications/specialization-tree-app.mjs`           | Calculer l'état de hover, enrichir les connexions et piloter le rendu PIXI contextuel  |
| `module/applications/specialization-tree/node-ui-state.mjs` | Centraliser si nécessaire les variantes UI liées au hover et à la progression visuelle |
| `tests/applications/specialization-tree-app.test.mjs`       | Verrouiller le contrat de hover, de mise en avant des liens et d'affichage du détail   |

## Plan d'implémentation

### Étape 1 — Donner un sens de progression aux connexions

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `module/applications/specialization-tree/node-ui-state.mjs`

1. Définir un mapping visuel simple pour les connexions : lien d'un chemin déjà acheté plus lumineux, lien menant vers un nœud disponible neutre, lien verrouillé plus sombre.
2. Calculer ces variantes à partir des états déjà exposés par le contexte de rendu, sans recalculer localement les règles métier de déblocage.
3. Garder le contrat lisible et déterministe pour que le viewport raconte immédiatement le chemin de progression avant même toute interaction.

**Validation visée :** l'utilisateur distingue d'un coup d'œil les chemins déjà investis, les progressions immédiatement ouvertes et les branches encore verrouillées.

### Étape 2 — Introduire un hover contextuel orienté compréhension

**Fichiers :** `module/applications/specialization-tree-app.mjs`

1. Ajouter un état applicatif de survol pour mémoriser le nœud actif et recalculer un rendu contextuel temporaire.
2. Au survol d'un nœud, renforcer visuellement ce nœud, mettre en lumière ses prérequis directs et les talents qu'il débloque, puis atténuer légèrement le reste de l'arbre.
3. Réutiliser le graphe de connexions courant pour déterminer uniquement les relations directes utiles au hover, sans introduire de nouvelle logique métier.
4. Faire apparaître ou rafraîchir le panneau de détail au survol afin que la lecture de l'impact du talent soit immédiate, même sans clic.
5. Prévoir la sortie de hover pour restaurer proprement le rendu nominal de l'arbre.

**Validation visée :** le survol répond immédiatement à “pourquoi ce talent est disponible ?” et “qu'est-ce qu'il débloque ?”.

### Étape 3 — Verrouiller le contrat UX par des tests ciblés

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

1. Ajouter des tests vérifiant que les connexions consomment bien une variante visuelle cohérente avec l'état de progression attendu.
2. Ajouter des tests de hover couvrant le nœud ciblé, les prérequis directs, les talents débloqués et l'atténuation du reste de l'arbre.
3. Vérifier que le panneau de détail suit le survol sans casser les comportements consultatifs ou actionnables déjà couverts.
4. Vérifier qu'en sortie de hover, l'arbre revient à son état normal sans résidu visuel ni effet de bord applicatif.

**Validation visée :** le nouveau contrat visuel reste stable, explicite et sans régression fonctionnelle observable.

## Définition de done

- [ ] Les connexions racontent visuellement la progression entre chemin acheté, disponible et verrouillé.
- [ ] Le survol met clairement en avant le nœud ciblé, ses prérequis directs et les talents débloqués.
- [ ] Le reste de l'arbre est légèrement atténué pendant l'exploration d'un nœud.
- [ ] Le panneau de détail apparaît ou se met à jour au hover sans casser les interactions existantes.
- [ ] Les tests verrouillent le contrat de progression visuelle et le comportement de hover.
