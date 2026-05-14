# Plan d'implémentation — #252 : Arbre de spécialisation — Pan par glisser-déposer sur le fond du canvas

**Issue** : [#252 — Arbre de spécialisation — Pan par glisser-déposer sur le fond du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/252)  
**Dépendance** : [#250 — Vue initiale centrée et caméra runtime du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/250)  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`

---

## 1. Objectif

Ajouter dans `SpecializationTreeApp` un déplacement de la vue par glisser-déposer sur le fond du canvas PIXI.

Le résultat attendu est :
- un `pointerdown` sur le fond du viewport qui démarre un pan runtime ;
- un `pointermove` qui translate uniquement la caméra `#viewport`, jamais les coordonnées métier des nœuds ;
- un `pointerup` / `pointerupoutside` qui termine proprement le pan ;
- des interactions de nœud qui restent prioritaires et n'initient jamais le pan ;
- des listeners PIXI centralisés, non dupliqués entre rendus et nettoyés au teardown.

Cette tranche complète la navigation de base du viewport après l'introduction de la caméra runtime par `#250` et le recentrage manuel par `#251`.

---

## 2. Périmètre

### Inclus

- Ajout d'un état privé de pan runtime dans `SpecializationTreeApp`.
- Centralisation des listeners `pointerdown` / `pointermove` / `pointerup` / `pointerupoutside` dans une méthode dédiée `#bindViewportInteractions()`.
- Mise à jour de `#viewport.x` et `#viewport.y` pendant le drag.
- Appel à `#applyViewportTransform()` après chaque déplacement.
- Priorité conservée pour les interactions sur nœuds via `stopPropagation()`.
- Prévention de la duplication des listeners entre deux rendus.
- Nettoyage explicite des listeners lors du teardown.
- Tests ciblés sur le contrat observable du pan.

### Exclu

- Zoom molette.
- Boutons `zoomIn` / `zoomOut`.
- Persistance du viewport.
- Inertie, animation ou limites de déplacement.
- Refonte du layout des nœuds.
- Changement des coordonnées `renderNodes`.
- Refonte template / styles / i18n.

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` possède déjà une caméra runtime privée `#viewport = { scale: 1, x: 0, y: 0 }`.
- `#applyViewportTransform()` applique déjà `position.set(x, y)` et `scale.set(scale)` au conteneur PIXI.
- `#centerTree()` et `#resetView()` sont déjà en place suite à `#250` et `#251`.
- `#drawTree()` recrée le `#treeContainer` à chaque redraw, mais la caméra reste portée par l'application.
- Les nœuds utilisent déjà un `hitArea.on('pointerdown', ...)` avec `event.stopPropagation()`, ce qui prépare correctement la priorité des interactions nœud vs fond.
- Le stage PIXI reçoit déjà un `pointerdown` pour masquer le tooltip, mais ce binding est aujourd'hui dispersé dans `#drawTree()` et ne couvre ni pan ni nettoyage dédié.
- Il n'existe pas encore de méthode `#bindViewportInteractions()`.
- Il n'existe pas encore d'état `#isPanning` / `#lastPointerPosition`.
- Le teardown détruit `pixiApp`, mais ne formalise pas le détachement ciblé de listeners viewport.
- Les tests couvrent déjà le viewport runtime, le centrage initial, le reset view et la non-mutation de `renderNodes`.
- Les mocks PIXI du test enregistrent les listeners sur `Graphics`, mais pas encore sur le `stage` de façon exploitable pour simuler un drag complet.

---

## 4. Décisions d'architecture

### 4.1. Pan porté par la caméra runtime, jamais par les nœuds

**Décision** : modifier uniquement `#viewport.x` et `#viewport.y` pendant le drag.

**Justification** :
- conforme à l'issue ;
- cohérent avec `#250` ;
- évite de mélanger navigation UI et coordonnées métier.

### 4.2. Listeners stage centralisés dans `#bindViewportInteractions()`

**Décision** : extraire tout le wiring pointer du stage PIXI dans une méthode dédiée, appelée une fois par cycle de vie.

**Justification** :
- l'issue l'exige explicitement ;
- évite les bindings dispersés dans `#drawTree() ` ;
- simplifie la non-duplication et le teardown.

### 4.3. Ajout d'un unbind explicite

**Décision** : compléter `#bindViewportInteractions()` par un mécanisme de détachement ou de garde empêchant les doublons, et nettoyer au teardown.

**Justification** :
- l'acceptance criterion demande des listeners non dupliqués et nettoyés ;
- `#drawTree()` est rappelée à chaque rendu ;
- le simple `destroy()` final n'est pas un contrat de lisibilité suffisant pour les tests.

### 4.4. Priorité aux interactions nœud

**Décision** : conserver `event.stopPropagation()` sur les `hitArea` des nœuds et ne démarrer le pan que depuis le fond du stage.

**Justification** :
- conforme à l'issue ;
- évite qu'un clic/drag sur un nœud ne bouge la caméra ;
- préserve les interactions existantes de tooltip et futures actions de nœud.

### 4.5. Stage rendu interactif sur tout le viewport

**Décision** : s'assurer que le stage capte bien les événements sur le fond vide du canvas, y compris hors objet enfant, via `eventMode` et un `hitArea` couvrant le viewport si nécessaire.

**Justification** :
- en PIXI, le fond vide ne remonte pas toujours d'événement sans surface interactive explicite ;
- c'est la condition pour que le pan sur fond fonctionne réellement ;
- le plan doit couvrir ce point technique, sinon l'acceptance criterion peut être faux-positif en code.

### 4.6. Tests centrés sur le contrat observable

**Décision** : tester le démarrage/arrêt du pan, les appels à `position.set(...)`, et l'immuabilité des coordonnées de nœud, sans dépendre d'un rendu PIXI réel.

**Justification** :
- conforme ADR-0004 et ADR-0012 ;
- évite les tests fragiles ;
- rend les diagnostics clairs.

---

## 5. Plan de travail détaillé

### Étape 1 — Introduire l'état runtime de pan

**À faire**
- Ajouter `#isPanning = false`.
- Ajouter `#lastPointerPosition = null`.
- Ajouter un état de binding viewport, par exemple `#isViewportInteractionsBound = false` ou une registry de handlers.
- Définir clairement la structure attendue pour la dernière position pointeur `{ x, y }`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- multiplier les états implicites si le pan se mélange au centrage/reset existants.

### Étape 2 — Extraire `#bindViewportInteractions()`

**À faire**
- Créer une méthode dédiée qui branche les événements sur `this.pixiApp.stage`.
- Y déplacer le `pointerdown` de fond aujourd'hui utilisé pour masquer le tooltip.
- Y ajouter :
  - `pointerdown` pour démarrer le pan sur fond ;
  - `pointermove` pour translater `#viewport` ;
  - `pointerup` pour terminer le pan ;
  - `pointerupoutside` pour terminer le pan même si le relâchement sort du viewport.
- Prévoir un garde pour que cette méthode n'ajoute pas deux fois les mêmes listeners.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- listeners dupliqués si le binding reste appelé à chaque render sans garde.

### Étape 3 — Définir le contrat du drag

**À faire**
- Sur `pointerdown` fond :
  - masquer le tooltip ;
  - passer `#isPanning` à `true` ;
  - mémoriser la position courante du pointeur.
- Sur `pointermove` :
  - ne rien faire si `#isPanning === false` ;
  - calculer le delta depuis `#lastPointerPosition` ;
  - incrémenter `#viewport.x` et `#viewport.y` avec ce delta ;
  - mettre à jour `#lastPointerPosition` ;
  - appeler `#applyViewportTransform()`.
- Sur `pointerup` / `pointerupoutside` :
  - remettre `#isPanning` à `false` ;
  - vider `#lastPointerPosition`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- mauvais accès aux coordonnées pointeur selon le mock/test et l'API PIXI.
- Mitigation : encapsuler l'extraction `x/y` dans une lecture simple et testable du pointeur.

### Étape 4 — Garantir la captation sur fond de stage

**À faire**
- Vérifier que `this.pixiApp.stage.eventMode = 'static'` est bien appliqué hors boucle de nœuds.
- Si nécessaire, définir une `hitArea` de stage alignée sur les dimensions du viewport courant.
- Revoir `#resizeViewport()` pour maintenir une surface interactive cohérente après resize.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- `pointerdown` sur fond qui ne se déclenche jamais en vrai runtime.
- Mitigation : lier explicitement la surface interactive au viewport.

### Étape 5 — Nettoyer le cycle de vie des listeners

**À faire**
- Ajouter `#unbindViewportInteractions()` ou un nettoyage équivalent dans `#teardownViewport()`.
- Réinitialiser l'état de pan au teardown.
- Faire en sorte que le redraw du tree container ne réenregistre pas les listeners stage.
- Vérifier que fermer/réouvrir l'application repart d'un état propre.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- fuite d'état ou handlers morts après fermeture/réouverture.

### Étape 6 — Étendre les tests

**À faire**
- Enrichir les mocks PIXI dans `tests/applications/specialization-tree-app.test.mjs` pour :
  - enregistrer les handlers du `stage` ;
  - pouvoir simuler `pointerdown`, `pointermove`, `pointerup`, `pointerupoutside`.
- Ajouter un test qui prouve qu'un drag sur fond :
  - démarre le pan ;
  - appelle `position.set(...)` avec des coordonnées modifiées ;
  - n'altère pas `renderNodes[x/y]`.
- Ajouter un test qui prouve qu'un `pointerup` stoppe le pan.
- Ajouter un test qui prouve qu'un `pointerupoutside` stoppe aussi le pan.
- Ajouter un test qui prouve qu'un `pointerdown` nœud appelle `stopPropagation()` et n'initie pas le pan.
- Ajouter un test de non-régression sur la non-duplication des listeners entre deux rendus si le mock le permet.

**Fichier**
- `tests/applications/specialization-tree-app.test.mjs`

**Risque**
- tests trop couplés à l'implémentation privée.
- Mitigation : vérifier les effets observables sur `position.set`, l'arrêt du pan et l'immuabilité des nœuds.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter l'état de pan runtime, centraliser les bindings pointer du stage, gérer le drag de viewport et le cleanup |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Enrichir les mocks stage PIXI et couvrir le pan fond, l'arrêt du pan, la priorité des nœuds et la non-régression listeners |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le stage ne capte pas les clics sur fond vide | le pan ne fonctionne pas en runtime | définir explicitement `eventMode` et `hitArea` du stage |
| Listeners bindés à chaque render | déplacement accéléré, fuite mémoire, comportements incohérents | centraliser dans `#bindViewportInteractions()` avec garde et cleanup |
| Drag sur nœud déclenche aussi le pan | UX cassée, conflit avec interactions nœud | conserver `stopPropagation()` sur les hit areas des nœuds |
| `pointerupoutside` non géré | pan bloqué si le pointeur sort du viewport | terminer systématiquement le pan sur `pointerupoutside` |
| Tests trop fragiles | faux négatifs et maintenance lourde | tester le contrat observable et enrichir légèrement le mock PIXI |
| Mutation involontaire de `renderNodes` | régression métier et layout corrompu | conserver la translation au niveau caméra uniquement et tester l'immuabilité |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): add runtime drag pan for specialization viewport`
2. `refactor(talent-tree): centralize viewport pointer bindings and cleanup`
3. `test(talent-tree): cover background drag pan and node interaction priority`

---

## 9. Dépendances avec les autres US

- Dépend fonctionnellement de `#250`, déjà fermée et visible dans l'état actuel du code.
- S'appuie aussi sur le recentrage runtime introduit par `#251`, déjà présent dans `SpecializationTreeApp`.
- Prépare naturellement les tranches suivantes :
  - zoom molette ;
  - boutons de zoom ;
  - éventuelle persistance de viewport ;
  - bornage ou inertie de navigation.

## 10. Validation prévue

- `pnpm vitest tests/applications/specialization-tree-app.test.mjs`
