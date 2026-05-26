# MC5 — Nommer les constantes UI/canvas locales

**Issue** : [#413 — MC5 — Nommer les constantes UI/canvas locales](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/413)

## Objectif

Nommer les valeurs visuelles et techniques réutilisées dans la couche canvas/PIXI afin de supprimer les magic numbers locales les plus denses sans les promouvoir abusivement au rang de constantes métier `SYSTEM.*`, conformément à ADR-0018 et à l’exemple déjà posé par `module/applications/specialization-tree/layout.mjs`.

## Décisions de cadrage

- Limiter le chantier aux fichiers explicitement listés par l’issue : `module/canvas/token.mjs`, `module/canvas/talent-tree-node.mjs`, `module/canvas/talent-tree.mjs`, `module/canvas/talent-icon.mjs`, `module/applications/specialization-tree/pixi-tree-renderer.mjs`.
- Traiter les tailles, offsets, couleurs, alphas, paddings, rayons et facteurs de scale comme des constantes locales de module ; ne pas les déplacer dans `module/config/` tant qu’aucune règle transverse n’est prouvée.
- Réutiliser les points de vérité UI déjà existants (`layout.mjs`, `node-ui-state.mjs`, `connection-ui-state.mjs`) plutôt que dupliquer des dimensions ou styles déjà nommés.
- Exclure du périmètre toute refonte UX, i18n ou évolution fonctionnelle du canvas/token : seul le nommage et la consolidation locale des littéraux changent.

## Étapes d’implémentation

### 1. Poser le vocabulaire local des constantes UI/canvas

**Fichiers cibles** : `module/canvas/token.mjs`, `module/canvas/talent-tree-node.mjs`, `module/canvas/talent-tree.mjs`, `module/canvas/talent-icon.mjs`, `module/applications/specialization-tree/pixi-tree-renderer.mjs`

**What**

- inventorier, par fichier, les littéraux visuels réutilisés plus d’une fois ;
- remonter en tête de module des constantes explicites ou petits registres gelés par thème (bars, pips, hover, overlays, icon slots, viewport, sharpness) ;
- garder les constantes strictement locales quand leur sémantique reste confinée au fichier.

**Validation visée** : chaque module ciblé expose des constantes locales lisibles pour ses règles visuelles récurrentes.

### 2. Refactorer les routines de rendu sans changer le comportement

**Fichiers cibles** : `module/applications/specialization-tree/pixi-tree-renderer.mjs`, `module/canvas/token.mjs`, `module/canvas/talent-tree-node.mjs`, `module/canvas/talent-tree.mjs`, `module/canvas/talent-icon.mjs`

**What**

- remplacer dans les routines de draw/refresh/interaction les tailles, offsets, couleurs, alpha et seuils UI réutilisés par les constantes nommées ;
- aligner le renderer PIXI moderne et les modules canvas legacy sur la même stratégie de nommage local ;
- ne promouvoir une constante hors du fichier que si la duplication inter-modules est prouvée et sémantiquement identique.

**Validation visée** : les fichiers du périmètre ne portent plus de magic numbers UI/canvas réutilisés, sans régression visuelle ou comportementale attendue.

### 3. Verrouiller le contrat sur les helpers et points testables

**Fichiers cibles** : `tests/integration/specialization-tree-pixi-render.test.mjs`, tests ciblés adjacents éventuels si un helper pur est extrait pendant le refactor

**What**

- étendre les tests déjà existants du renderer sur les contrats observables issus des constantes nommées (viewport minimal, sharpness config, positionnement/slots testables) ;
- ajouter un test unitaire uniquement pour les helpers purs extraits durant le chantier, sans forcer une couverture artificielle des classes PIXI legacy si elles ne deviennent pas isolables ;
- conserver les assertions centrées sur le comportement rendu observable plutôt que sur l’implémentation interne.

**Validation visée** : le refactor reste observable par des tests ciblés et limite le risque de réintroduire des littéraux réutilisés sur les surfaces testables.

## Résultat attendu

- Les modules canvas/PIXI ciblés nomment leurs constantes locales réutilisées.
- Aucune centralisation abusive dans `module/config/` n’est introduite pour de simples détails visuels.
- Le rendu et les interactions restent inchangés ; seule la lisibilité et la maintenabilité de la couche UI/canvas progressent.
