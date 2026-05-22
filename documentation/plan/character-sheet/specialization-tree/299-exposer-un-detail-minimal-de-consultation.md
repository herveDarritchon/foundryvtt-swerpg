# US16.6 — Plan d'implémentation : Exposer un détail minimal de consultation

## Contexte

Issue : [#299 — US16.6 - Exposer un détail minimal de consultation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/299)

Références :

- `documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md`
- `documentation/plan/character-sheet/specialization-tree/297-definir-le-layout-graphique-minimal.md`
- `documentation/plan/character-sheet/specialization-tree/298-dessiner-les-connexions-et-les-noeuds-dans-pixi.md`
- `documentation/ways-of-work/plan/specialization-tree-v1/us16-graphical-tree-rendering/project-plan.md`

L'existant fournit déjà les briques principales :

- `buildSpecializationTreeContext()` expose `renderNodes` avec `talentName`, `xpCost`, `nodeStateLabel` et `reasonLabel` ;
- `SpecializationTreeApp` dispose déjà d'un viewport PIXI et d'un conteneur de tooltip dans le template ;
- le mapping d'état / raison localisée a déjà été cadré par US16.3.

Le besoin de l'issue est maintenant de transformer cette base en détail de consultation léger, lisible et strictement sans action métier ni état de sélection persistant.

## Objectif

Permettre à l'utilisateur de consulter, depuis un nœud du tree, un détail minimal (nom, coût, état, raison si applicable) via un tooltip accessible ou un libellé adjacent, sans achat implicite, sans panneau complexe et sans mémoire durable de sélection.

## Périmètre

### Inclus

- déclenchement d'un détail consultatif depuis un nœud rendu ;
- affichage des informations minimales demandées par l'issue ;
- comportement éphémère de show / hide sans état applicatif persistant ;
- tests ciblés sur le contrat de consultation read-only.

### Exclus

- achat de nœud ou prévisualisation d'achat ;
- panneau latéral interactif ou popover persistant ;
- nouvelle logique métier de calcul d'état / raison ;
- zoom, pan ou autre navigation avancée.

## Fichiers pressentis

| Fichier                                               | Rôle                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `module/applications/specialization-tree-app.mjs`     | Porter le flux de consultation read-only et le cycle show/hide |
| `templates/applications/specialization-tree-app.hbs`  | Stabiliser le conteneur de détail minimal accessible           |
| `styles/applications.less`                            | Garantir une présentation légère, lisible et non intrusive     |
| `tests/applications/specialization-tree-app.test.mjs` | Verrouiller l'absence d'action métier et l'affichage minimal   |

## Plan d'implémentation

### Étape 1 — Découpler la consultation de toute action métier

**Fichiers :** `module/applications/specialization-tree-app.mjs`

**Actions :**

1. Définir un chemin d'interaction dédié à la consultation du détail, distinct de toute logique d'achat.
2. Faire en sorte que l'interaction sur un nœud n'appelle aucune mutation document ni service métier dans le cadre de US16.6.
3. Supprimer la dépendance à un état de sélection persistant pour afficher le détail ; le tooltip doit pouvoir s'ouvrir puis se refermer sans mémoriser durablement le nœud courant.
4. Réutiliser uniquement les données déjà présentes dans `renderNodes` (`talentName`, `xpCost`, `nodeStateLabel`, `reasonLabel`).

**Validation visée :** consulter un nœud n'entraîne aucun achat, aucune notification métier et aucune persistance d'état UI.

### Étape 2 — Exposer un détail minimal accessible et éphémère

**Fichiers :** `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`

**Actions :**

1. Réutiliser le conteneur de tooltip existant ou un libellé adjacent léger pour afficher nom, coût XP, état et raison localisée si présente.
2. Donner au conteneur un comportement accessible et purement consultatif : structure lisible, état masqué/visible explicite, aucune interaction interne requise.
3. Fermer le détail sur sortie de contexte pertinente (nouveau rendu, changement d'arbre, clic hors nœud ou équivalent léger retenu), sans conserver d'historique de sélection.
4. Garder un rendu sobre qui reste compréhensible pour les nœuds `locked`, `invalid` et `unresolved`.

**Validation visée :** le détail minimal est visible à la demande, compréhensible, non bloquant et toujours temporaire.

### Étape 3 — Sécuriser le contrat par des tests applicatifs ciblés

**Fichiers :** `tests/applications/specialization-tree-app.test.mjs`

**Actions :**

1. Vérifier qu'une interaction de consultation affiche bien le détail minimal attendu pour un nœud.
2. Vérifier que la raison n'est affichée que pour les états qui en portent une, sans faux message sur un nœud disponible.
3. Vérifier qu'aucune interaction de consultation n'appelle la logique d'achat, ne déclenche de notification métier ou ne mutile le document.
4. Vérifier que le détail se masque proprement et qu'aucun état de sélection n'est conservé entre deux interactions ou après rerender.

**Validation visée :** le comportement observable reste strictement read-only et conforme aux critères d'acceptation de l'issue.

## Définition de done

- [ ] Un nœud expose un détail minimal consultatif avec nom, coût, état et raison si applicable.
- [ ] Le détail ne déclenche aucune action métier.
- [ ] Aucun état de sélection persistant n'est conservé par l'application.
- [ ] Le conteneur de détail reste léger, accessible et non interactif.
- [ ] Les tests couvrent l'affichage minimal et l'absence de couplage avec l'achat.
