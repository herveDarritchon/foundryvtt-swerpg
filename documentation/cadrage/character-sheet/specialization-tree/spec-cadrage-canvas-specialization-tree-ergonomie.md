# Spécification / cadrage — Ergonomie du canvas d’arbre de spécialisations

## 1. Contexte

L’écran d’arbre de spécialisations affiche une représentation graphique des talents, de leurs coûts en XP et de leurs
connexions. Le rendu actuel permet de visualiser l’arbre, mais l’ergonomie devient limitée dès que l’arbre dépasse la
zone visible, que la fenêtre est réduite, ou que les nœuds sont nombreux.

Le canvas doit évoluer vers une zone de navigation graphique confortable, comparable à une carte ou à un schéma
interactif : l’utilisateur doit pouvoir se déplacer dans l’arbre, zoomer, recentrer la vue et consulter les nœuds sans
être contraint par la taille initiale du canvas.

Cette évolution concerne exclusivement l’ergonomie runtime du canvas. Elle ne doit pas modifier la logique métier de
résolution des talents, ni la structure des données de l’arbre.

## 2. Objectifs

L’objectif principal est d’introduire une couche de navigation graphique autour de l’arbre de spécialisations.

Le canvas doit permettre à l’utilisateur de zoomer, dézoomer, déplacer la vue et recentrer l’arbre de manière fluide et
prévisible. Ces interactions doivent améliorer la lisibilité des arbres complexes sans modifier les coordonnées métier
ou les données de rendu des nœuds.

L’implémentation doit rester simple, maintenable et cohérente avec l’architecture actuelle du système SWERPG. La logique
de zoom et de pan doit rester dans la couche UI, au niveau de l’application PIXI / canvas, et ne doit pas être déplacée
dans le contexte métier ou dans le resolver des arbres.

## 3. Hors périmètre

Cette évolution ne couvre pas la refonte graphique des nœuds, ni la définition des variantes visuelles par état de
talent.

Elle ne couvre pas non plus l’achat de talents depuis l’arbre, la modification des arbres, l’édition des connexions, ni
l’ajout d’un minimap.

Elle ne couvre pas la persistance long terme du zoom et de la position de caméra entre deux ouvertures de Foundry. Cette
persistance pourra être envisagée dans une évolution ultérieure, mais elle ne doit pas complexifier cette première
étape.

## 4. Principes d’architecture

La donnée de l’arbre doit rester indépendante de la caméra.

Les coordonnées des nœuds représentent leur position logique dans l’arbre. Elles ne doivent pas être recalculées à
chaque zoom ou déplacement utilisateur.

La navigation doit être portée par une transformation appliquée à un conteneur PIXI parent, appelé ici `treeContainer`
ou `viewport container`. Cette transformation comprend trois valeurs : position horizontale, position verticale et
échelle.

La logique cible est donc la suivante :

```txt
buildSpecializationTreeContext()
  → prépare les nœuds et les connexions

#drawTree(context)
  → dessine les nœuds et les connexions dans un container PIXI

#viewport
  → stocke la caméra runtime : x, y, scale

#applyViewportTransform()
  → applique la caméra au container PIXI

#zoomAt(point, scale)
  → modifie la caméra en conservant le point visé sous le curseur

#centerTree()
  → recalcule une caméra permettant de recentrer l’arbre

#bindViewportInteractions()
  → branche les interactions utilisateur : pan, wheel, boutons, double-clic
```

## 5. Fonctionnalités attendues

### 5.1 Zoom à la molette

L’utilisateur doit pouvoir zoomer et dézoomer avec la molette de la souris lorsque le pointeur se trouve au-dessus du
canvas.

Le zoom doit être centré sur la position du pointeur. Cela signifie que le point de l’arbre situé sous la souris doit
rester visuellement stable pendant l’opération de zoom.

Le zoom doit être borné afin d’éviter les situations inutilisables. Les bornes recommandées pour une première version
sont :

```txt
zoom minimum : 0.5
zoom maximum : 2.0
pas de zoom : 1.15
```

Ces valeurs sont des paramètres UI et doivent être faciles à ajuster.

### 5.2 Pan par glisser-déposer

L’utilisateur doit pouvoir déplacer la vue en maintenant le clic sur le fond du canvas puis en déplaçant la souris.

Le pan doit déplacer la caméra, pas les nœuds eux-mêmes.

Le clic ou le drag sur un nœud ne doit pas déclencher le pan. Les événements des nœuds doivent donc stopper leur
propagation lorsque cela est nécessaire.

Le comportement cible est le suivant :

```txt
pointerdown sur le fond → début du pan
pointermove pendant le pan → déplacement de la caméra
pointerup ou pointerupoutside → fin du pan
pointerdown sur un nœud → interaction avec le nœud, sans pan parasite
```

### 5.3 Boutons de zoom

Une petite barre d’outils doit être affichée dans le viewport du canvas.

Elle doit proposer au minimum :

```txt
- bouton zoom out
- bouton recentrer
- bouton zoom in
```

Les boutons de zoom doivent être centrés sur le centre visible du viewport.

Le libellé du bouton de recentrage doit passer par l’i18n Foundry.

Exemple de clé :

```txt
SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER
```

### 5.4 Recentrage de l’arbre

L’utilisateur doit pouvoir recentrer l’arbre dans le viewport.

Le recentrage doit :

```txt
- remettre le zoom à 1 ;
- calculer la bounding box de l’arbre ;
- positionner l’arbre au centre de la zone visible ;
- appliquer la transformation au container PIXI.
```

Le recentrage doit être accessible via le bouton dédié.

Un double-clic sur le fond du canvas peut également recentrer l’arbre, à condition que ce comportement ne gêne pas les
interactions sur les nœuds.

### 5.5 Conservation de la vue pendant les rendus

Les opérations de rendu ne doivent pas casser la navigation utilisateur.

Si l’application redessine l’arbre sans changement réel d’arbre sélectionné, la position et le zoom courants doivent
être conservés.

Si l’utilisateur change d’arbre de spécialisation, l’application peut recentrer automatiquement le nouvel arbre.

Le comportement cible est donc :

```txt
même arbre redessiné → conserver caméra
nouvel arbre affiché → recentrer caméra
redimensionnement du viewport → conserver caméra ou recentrer uniquement si nécessaire
```

Pour une première version, le redimensionnement peut conserver la caméra courante. Le recentrage automatique au resize
ne doit pas être imposé, car il peut être frustrant pour l’utilisateur.

## 6. Modèle d’état UI proposé

L’application doit introduire un état runtime minimal :

```js
#viewport = {
  scale: 1,
  x: 0,
  y: 0,
}

#isPanning = false
#lastPointerPosition = null
#lastContext = null

#minZoom = 0.5
#maxZoom = 2
#zoomStep = 1.15
```

Cet état est strictement local à l’application d’arbre de spécialisation.

Il ne doit pas être écrit dans les documents Foundry, ni dans les données acteur, ni dans les items de spécialisation.

## 7. Méthodes techniques attendues

### 7.1 `#applyViewportTransform()`

Applique la caméra courante au container PIXI.

Responsabilités :

```txt
- lire #viewport.x ;
- lire #viewport.y ;
- lire #viewport.scale ;
- appliquer position et scale à #treeContainer.
```

Pseudo-code :

```js
#applyViewportTransform()
{
  if (!this.#treeContainer) return

  this.#treeContainer.position.set(this.#viewport.x, this.#viewport.y)
  this.#treeContainer.scale.set(this.#viewport.scale)
}
```

### 7.2 `#centerTree(renderNodes)`

Calcule une vue centrée à partir des nœuds rendus.

Responsabilités :

```txt
- calculer la bounding box des nœuds ;
- lire les dimensions du viewport ;
- remettre le zoom à 1 ;
- positionner la caméra pour centrer l’arbre ;
- appliquer la transformation.
```

### 7.3 `#zoomAt(globalPoint, nextScale)`

Modifie le zoom en conservant le point ciblé sous le pointeur.

Responsabilités :

```txt
- borner le niveau de zoom ;
- convertir le point écran en coordonnées monde ;
- appliquer le nouveau scale ;
- recalculer x/y pour conserver le point stable ;
- appliquer la transformation.
```

Cette méthode est centrale. Un zoom qui ne conserve pas le point sous la souris donnera une impression de glissement et
rendra l’outil désagréable.

### 7.4 `#zoomIn()` et `#zoomOut()`

Méthodes appelées par les boutons UI.

Elles doivent utiliser le centre visible du viewport comme point de zoom.

### 7.5 `#resetView()`

Recentre l’arbre courant.

Cette méthode doit s’appuyer sur le dernier contexte connu ou sur un cache des nœuds rendus.

### 7.6 `#bindViewportInteractions()`

Centralise le branchement des interactions canvas.

Responsabilités :

```txt
- brancher la molette ;
- brancher pointerdown / pointermove / pointerup ;
- brancher éventuellement le double-clic ;
- éviter les doublons de listeners entre deux rendus ;
- s’assurer que les listeners sont nettoyés à la fermeture de l’application.
```

## 8. Intégration dans le template

Le template doit prévoir une toolbar positionnée au-dessus du canvas.

Structure recommandée :

```hbs
<div class="specialization-tree-app__viewport">
  <div class="specialization-tree-app__viewport-toolbar">
    <button type="button" data-action="zoomOut" aria-label="{{localize 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_OUT'}}">−</button>
    <button type="button" data-action="resetView">
      {{localize "SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER"}}
    </button>
    <button type="button" data-action="zoomIn" aria-label="{{localize 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_IN'}}">+</button>
  </div>

  <div data-specialization-tree-viewport class="specialization-tree-app__viewport-host"></div>
</div>
```

Le conteneur principal doit être en `position: relative` afin que la toolbar puisse être placée par-dessus la zone
canvas.

## 9. Intégration ApplicationV2

Les actions de la toolbar doivent être déclarées dans les options de l’application.

Exemple cible :

```js
static
DEFAULT_OPTIONS = {
  // ...
  actions: {
    zoomIn() {
      this.#zoomIn()
    },
    zoomOut() {
      this.#zoomOut()
    },
    resetView() {
      this.#resetView()
    },
  },
}
```

Si les méthodes privées ne sont pas accessibles correctement selon le binding Foundry, utiliser des méthodes publiques
internes :

```js
_onZoomIn()
{
  this.#zoomIn()
}

_onZoomOut()
{
  this.#zoomOut()
}

_onResetView()
{
  this.#resetView()
}
```

## 10. CSS attendu

La toolbar doit rester discrète, lisible et cohérente avec l’interface sombre de SWERPG.

Base recommandée :

```css
.specialization-tree-app__viewport {
    position: relative;
    min-height: 0;
    overflow: hidden;
}

.specialization-tree-app__viewport-toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid rgba(120, 169, 194, 0.5);
    border-radius: 6px;
    background: rgba(5, 12, 20, 0.85);
}

.specialization-tree-app__viewport-toolbar button {
    min-width: 28px;
    height: 28px;
    border: 1px solid rgba(120, 169, 194, 0.6);
    border-radius: 4px;
    color: #d8edf7;
    background: rgba(26, 44, 68, 0.9);
    cursor: pointer;
}

.specialization-tree-app__viewport-toolbar button:hover {
    border-color: rgba(120, 169, 194, 1);
    background: rgba(34, 64, 96, 0.95);
}
```

Le style peut être affiné plus tard dans le cadre du chantier visuel immersif Star Wars. Ici, la priorité est
l’ergonomie et la stabilité des interactions.

## 11. Gestion du resize

Le canvas doit continuer à s’adapter à la taille de la fenêtre Foundry.

Un `ResizeObserver` sur le conteneur du viewport est préférable à un simple listener `window.resize`, car la fenêtre
Foundry peut être redimensionnée sans que la fenêtre du navigateur ne change.

Comportement attendu :

```txt
- observer la taille du viewport host ;
- redimensionner le renderer PIXI ;
- mettre à jour la hitArea du stage ;
- conserver la caméra courante ;
- ne pas recentrer automatiquement sauf changement d’arbre.
```

## 12. Nettoyage des listeners

L’application doit nettoyer correctement les listeners et observers lors du teardown.

À nettoyer :

```txt
- listener wheel sur le canvas ;
- listeners pointer sur le stage PIXI ;
- ResizeObserver ;
- références runtime inutiles ;
- état de pan en cours.
```

Cela évite les comportements fantômes après fermeture/réouverture de la fenêtre.

## 13. Critères d’acceptation

### Navigation

L’utilisateur peut déplacer l’arbre en glissant le fond du canvas.

L’utilisateur peut zoomer et dézoomer avec la molette.

Le zoom à la molette est centré sur le pointeur.

L’utilisateur peut zoomer, dézoomer et recentrer via la toolbar.

Le double-clic sur le fond recentre l’arbre si cette interaction est retenue.

### Robustesse

Un clic sur un nœud ne déclenche pas le pan.

Un tooltip ou une interaction de nœud reste utilisable après zoom ou pan.

Le canvas reste fonctionnel après redimensionnement de la fenêtre Foundry.

La vue courante n’est pas réinitialisée à chaque rendu inutile.

Le changement d’arbre peut recentrer automatiquement la vue.

### Architecture

La logique de zoom/pan reste dans `SpecializationTreeApp`.

Le contexte métier de l’arbre n’est pas modifié pour gérer la caméra.

Les coordonnées des nœuds restent exprimées dans le repère logique de l’arbre.

Aucune dépendance externe n’est introduite pour cette première version.

## 14. Découpage recommandé en sous-issues

### Sous-issue 1 — Introduire l’état de caméra du canvas

Ajouter l’état runtime `#viewport`, les bornes de zoom et la méthode `#applyViewportTransform()`.

Objectif : préparer le terrain sans changer encore les interactions utilisateur.

### Sous-issue 2 — Ajouter le recentrage de l’arbre

Extraire le calcul de centrage dans `#centerTree(renderNodes)` et ajouter `#resetView()`.

Objectif : disposer d’un recentrage fiable avant d’ajouter zoom et pan.

### Sous-issue 3 — Ajouter le pan par drag du canvas

Brancher les événements pointer sur le stage PIXI et déplacer la caméra lors du drag sur le fond.

Objectif : permettre la navigation dans un arbre plus grand que le viewport.

### Sous-issue 4 — Ajouter le zoom molette centré sur le pointeur

Implémenter `#zoomAt(globalPoint, nextScale)` et le listener `wheel`.

Objectif : rendre l’exploration du canvas confortable.

### Sous-issue 5 — Ajouter la toolbar de contrôle

Ajouter les boutons zoom out, recentrer et zoom in dans le template, avec les actions ApplicationV2 et les clés i18n.

Objectif : rendre les fonctionnalités découvrables par l’utilisateur.

### Sous-issue 6 — Stabiliser le comportement au resize et au rerender

Ajouter ou ajuster le `ResizeObserver`, conserver la caméra lorsque l’arbre ne change pas, recentrer uniquement lorsque
c’est pertinent.

Objectif : éviter les régressions d’usage lors des redimensionnements et des rendus Foundry.

## 15. Risques et points de vigilance

Le principal risque est de mélanger les coordonnées de rendu des nœuds avec la caméra. Ce serait une erreur
d’architecture : les nœuds doivent rester dans leur repère logique, et seule la transformation du container doit
changer.

Le deuxième risque est d’empiler des listeners à chaque rendu. Toute liaison d’événement doit être centralisée et
nettoyée.

Le troisième risque est de recentrer trop souvent. Un utilisateur qui a zoomé ou déplacé la vue ne doit pas perdre son
contexte à chaque mise à jour mineure de l’application.

Le quatrième risque concerne les interactions sur les nœuds. Les événements des nœuds doivent rester prioritaires sur le
pan du fond.

## 16. Arbitrage recommandé

Pour cette première version, il est préférable de ne pas intégrer `pixi-viewport` ou une autre dépendance externe.

Le besoin actuel est simple : un container PIXI, une transformation `x/y/scale`, quelques événements pointer et wheel.
Une implémentation interne courte sera plus lisible, plus maîtrisable et plus cohérente avec l’état actuel du module.

Une dépendance spécialisée pourra être réévaluée plus tard si l’arbre évolue vers des fonctions plus avancées : inertie,
pinch mobile, minimap, limites de monde complexes, sélection multiple, drag de nœuds ou édition graphique.

## 17. Résultat attendu

À l’issue de ce chantier, l’arbre de spécialisations doit être utilisable confortablement même lorsqu’il dépasse la
taille visible du canvas.

L’utilisateur doit avoir l’impression de naviguer dans une carte technique claire : il peut se rapprocher pour lire,
s’éloigner pour comprendre la structure globale, déplacer son point de vue, puis revenir rapidement à une vue centrée.

Cette base ergonomique doit ensuite permettre de travailler plus sereinement sur le rendu visuel immersif des nœuds, des
connexions et des états.
