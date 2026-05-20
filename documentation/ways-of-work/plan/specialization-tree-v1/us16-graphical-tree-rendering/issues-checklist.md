# Issues Checklist — Specialization Tree V1 / US16 Graphical Tree Rendering

## Préparation

- [ ] Relire le cadrage source `cadrage-us16-decoupage-rendu-graphique-arbres-specialisation.md`
- [ ] Vérifier le rattachement à l'epic `Specialization Tree V1`
- [ ] Confirmer le composant métier `character-sheet / specialization-tree`
- [ ] Préparer les labels `epic`, `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `specialization-tree`

## Création Epic / Feature

- [ ] Créer l'epic `Specialization Tree V1 - vue graphique des arbres de spécialisation`
- [ ] Ajouter la valeur métier, les critères de succès et la DoD epic
- [ ] Créer la feature `US16 - Afficher arbres, nœuds et connexions dans la vue graphique`
- [ ] Lier la feature à l'epic
- [ ] Renseigner `Priority = P0/P1`, `Value = High/Medium`, `Component = Specialization Tree`

## Stories / Enablers / Tests à créer

### 16.1 — Déterminer l'arbre affiché par défaut

- [ ] Titre : `US16.1 - Déterminer l'arbre de spécialisation affiché par défaut`
- [ ] AC : parcourir les spécialisations possédées, retenir le dernier arbre `resolvedTreeStatus: "available"`, état vide si aucun
- [ ] Estimate : `1`
- [ ] Priority : `P0`

### 16.2 — View-model de rendu

- [ ] Titre : `US16.2 - Construire le view-model de rendu de l'arbre courant`
- [ ] AC : normaliser les nœuds avec ID, talent, coût, row/column, état, métadonnées ; préparer les connexions ; fallback si talent introuvable
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : Feature

### 16.3 — Mapping états/raisons

- [ ] Titre : `US16.3 - Mapper les états et raisons de nœud vers l'UI`
- [ ] AC : mapping `purchased`/`available`/`locked`/`invalid`, raisons localisées (XP, prérequis, talent introuvable, nœud invalide, arbre incohérent)
- [ ] Estimate : `1`
- [ ] Priority : `P0`
- [ ] Bloquée par : 16.2

### 16.4 — Layout graphique minimal

- [ ] Titre : `US16.4 - Définir le layout graphique minimal`
- [ ] AC : constantes de layout, conversion row/column → coordonnées PIXI, positionnement des connexions
- [ ] Estimate : `1`
- [ ] Priority : `P0`
- [ ] Bloquée par : 16.2

### 16.5 — Dessin PIXI

- [ ] Titre : `US16.5 - Dessiner les connexions et les nœuds dans PIXI`
- [ ] AC : nettoyage du viewport, dessin connexions puis nœuds, variante visuelle par état, affichage nom + coût + ranked, lecture seule
- [ ] Estimate : `2`
- [ ] Priority : `P0`
- [ ] Bloquée par : 16.3, 16.4

### 16.6 — Détail minimal de consultation

- [ ] Titre : `US16.6 - Exposer un détail minimal de consultation`
- [ ] AC : tooltip ou libellé adjacent avec nom, coût, état, raison localisée ; aucun état applicatif persistant
- [ ] Estimate : `1`
- [ ] Priority : `P1`
- [ ] Bloquée par : 16.5

### 16.7 — Traductions FR/EN

- [ ] Titre : `US16.7 - Compléter les traductions FR/EN des états et raisons`
- [ ] AC : libellés des états de nœud, raisons de verrouillage et d'invalidité, fallbacks cohérents, aucune chaîne hardcodée
- [ ] Estimate : `1`
- [ ] Priority : `P1`
- [ ] Bloquée par : 16.3

### 16.8 — Tests de contrat de rendu

- [ ] Titre : `US16.8 - Étendre les tests de contrat de rendu`
- [ ] Cas : choix dernier arbre available, état vide, construction view-model, présence nœuds/connexions, mapping états, mapping raisons, absence canvas scène, absence achat
- [ ] Estimate : `1`
- [ ] Priority : `P0`
- [ ] Bloquée par : 16.2, 16.3, 16.4

## Sous-tâches recommandées

- [ ] Ajouter une task de sélection du dernier arbre `available` avec gestion de l'état vide
- [ ] Ajouter une task de normalisation des nœuds avec fallback talent introuvable
- [ ] Ajouter une task de mapping `reasonCode` → clé i18n
- [ ] Ajouter une task de définition des constantes de layout (nodeWidth, nodeHeight, spacingX, spacingY, margins)
- [ ] Ajouter une task de dessin des connexions avant les nœuds (ordre z-index)
- [ ] Ajouter une task de variante visuelle par état (couleur, opacité, icône)
- [ ] Ajouter une task de configuration tooltip PIXI pour le détail minimal
- [ ] Ajouter une task d'ajout des clés dans `lang/en.json` et `lang/fr.json`
- [ ] Ajouter une task de tests view-model (nœuds, connexions, fallback)
- [ ] Ajouter une task de tests mapping (états, raisons, i18n)

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic
- [ ] 16.2 **blocked by** Feature
- [ ] 16.3 **blocked by** 16.2
- [ ] 16.4 **blocked by** 16.2
- [ ] 16.5 **blocked by** 16.3
- [ ] 16.5 **blocked by** 16.4
- [ ] 16.6 **blocked by** 16.5
- [ ] 16.7 **blocked by** 16.3
- [ ] 16.8 **blocked by** 16.2
- [ ] 16.8 **blocked by** 16.3
- [ ] 16.8 **blocked by** 16.4

## Checklist board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Renseigner `Priority`, `Value`, `Component`, `Estimate`, `Epic`, `US`
- [ ] Mettre les issues prêtes (AC validés) dans `Sprint Ready`
- [ ] Paralléliser 16.3 et 16.4 si les ressources le permettent
- [ ] Ajouter les tests progressivement dès 16.2, sans attendre 16.8
- [ ] Garder du buffer pour les ajustements de layout sur arbres réels

## Checklist de clôture

- [ ] L'arbre affiché par défaut est déterministe (dernier `available`)
- [ ] Le view-model expose nœuds, connexions, états et métadonnées sans couplage PIXI
- [ ] Chaque état métier possède une variante visuelle et un libellé i18n
- [ ] Les coordonnées graphiques sont dérivées de `row` / `column`
- [ ] Les connexions et nœuds sont rendus en lecture seule dans le viewport PIXI
- [ ] Les raisons de blocage sont localisées et compréhensibles
- [ ] Aucun comportement d'achat ou de sélection persistante n'est exposé
- [ ] Les tests de contrat couvrent le view-model, le layout et le mapping
- [ ] Les dépendances GitHub sont fermées dans l'ordre prévu
- [ ] La feature et l'epic reflètent les métriques finales
