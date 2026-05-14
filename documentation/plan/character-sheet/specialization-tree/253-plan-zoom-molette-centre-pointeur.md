# Plan d'implémentation — #253 : Arbre de spécialisation — Zoom à la molette centré sur le pointeur

**Issue** : [#253 — Arbre de spécialisation — Zoom à la molette centré sur le pointeur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/253)  
**Dépendance** : [#250 — Vue initiale centrée et caméra runtime du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/250)  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`

---

## 1. Objectif

Ajouter dans `SpecializationTreeApp` un zoom à la molette centré sur le pointeur, sans jamais modifier les coordonnées métier des nœuds.

Le résultat attendu est :
- un listener `wheel` branché sur le canvas PIXI ;
- une méthode `#zoomAt(globalPoint, nextScale)` qui conserve visuellement le point sous la souris ;
- un zoom borné entre `#minZoom` et `#maxZoom` ;
- un facteur multiplicatif `#zoomStep = 1.15` par tick ;
- un nettoyage explicite du listener `wheel` au teardown ;
- des tests qui prouvent que seul le viewport change, pas `renderNodes`.

---

## 2. Périmètre

### Inclus

- Ajout du binding `wheel` au canvas dans `#bindViewportInteractions()`.
- Ajout d'une méthode privée `#zoomAt(globalPoint, nextScale)`.
- Borne du scale avec `#minZoom` et `#maxZoom`.
- Conversion pointeur écran vers coordonnées monde avant changement de scale.
- Recalcul de `#viewport.x` et `#viewport.y` pour stabiliser visuellement le point sous la souris.
- Garde pour ignorer la molette hors canvas.
- Nettoyage du listener `wheel` dans le teardown viewport.
- Tests ciblés sur le contrat observable du zoom.

### Exclu

- Boutons `zoomIn` / `zoomOut`.
- Persistance du viewport.
- Animation/inertie du zoom.
- Limites de pan automatiques.
- Refonte du layout des nœuds ou des connexions.
- Changement des coordonnées métier `renderNodes`.
- Dépendance externe.

---

## 3. Constat sur l'existant

- `SpecializationTreeApp` possède déjà une caméra runtime `#viewport = { scale, x, y }`.
- Les bornes `#minZoom`, `#maxZoom` et `#zoomStep` existent déjà, mais `#zoomStep` n'est pas encore utilisée.
- `#applyViewportTransform()` applique déjà `position.set(x, y)` et `scale.set(scale)` au conteneur PIXI.
- `#bindViewportInteractions()` centralise déjà les interactions `pointerdown` / `pointermove` / `pointerup` / `pointerupoutside` pour le pan.
- Le `stage` PIXI est déjà configuré avec une `hitArea` adaptée au viewport.
- Le teardown nettoie déjà les listeners stage via `#unbindViewportInteractions()`, mais pas encore de listener `wheel` DOM.
- Les tests couvrent déjà :
  - centrage initial ;
  - reset view ;
  - pan fond ;
  - non-duplication / cleanup des listeners stage ;
  - non-mutation des coordonnées métier.
- L'issue `#250` est fermée, donc le blocage annoncé par `#253` est levé.

---

## 4. Décisions d'architecture

### 4.1. Zoom porté uniquement par la caméra runtime

**Décision** : modifier uniquement `#viewport.scale`, `#viewport.x` et `#viewport.y`.

**Justification** :
- cohérent avec `#250` et `#252` ;
- préserve la séparation layout métier / navigation UI ;
- garantit que `renderNodes` reste stable.

### 4.2. Listener `wheel` sur le canvas DOM, pas sur le stage PIXI

**Décision** : brancher la molette sur `this.pixiApp.canvas ?? this.pixiApp.view`.

**Justification** :
- l'acceptance criterion demande explicitement un listener `wheel` sur le canvas ;
- l'événement `wheel` est un événement DOM natif ;
- le cleanup est plus explicite qu'un binding indirect via PIXI.

### 4.3. Extraire `#zoomAt(globalPoint, nextScale)` comme point d'entrée unique

**Décision** : centraliser tout le calcul de zoom dans une méthode dédiée.

**Justification** :
- un seul point de vérité pour la conversion écran → monde → nouvel offset ;
- évite de disperser le calcul dans le handler `wheel` ;
- facilite les tests unitaires indirects via le contrat observable.

### 4.4. Garder le point sous le pointeur visuellement stable

**Décision** : calculer les coordonnées monde sous le curseur avant changement de scale, puis recalculer `#viewport.x/y` pour que ce même point monde retombe sous le même point écran après zoom.

**Justification** :
- c'est le coeur fonctionnel de l'issue ;
- évite l'effet de zoom "vers le centre" jugé peu ergonomique ;
- rend le zoom compatible avec le pan déjà en place.

### 4.5. Nettoyage symétrique du binding `wheel`

**Décision** : stocker la cible canvas et le handler `wheel` pour pouvoir les détacher explicitement au teardown.

**Justification** :
- le listener n'est pas porté par le stage PIXI, donc il ne doit pas être oublié ;
- évite les fuites de listeners entre fermeture/réouverture ;
- aligne la logique avec le cleanup déjà en place pour les événements de pan.

### 4.6. Tests centrés sur le contrat observable

**Décision** : vérifier le scale appliqué, le déplacement cohérent du viewport, le respect des bornes et l'immuabilité de `renderNodes`, sans test pixel-perfect.

**Justification** :
- conforme ADR-0004 et ADR-0012 ;
- plus robuste que des assertions trop couplées au rendu ;
- diagnostique clair en cas de régression.

---

## 5. Plan de travail détaillé

### Étape 1 — Introduire l'état de binding `wheel`

**À faire**
- Ajouter des champs privés pour mémoriser :
  - l'élément canvas lié ;
  - le handler `wheel` actif.
- Prévoir une garde empêchant de binder plusieurs fois le même canvas.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- duplication du listener si le canvas est rebinding à chaque render.

### Étape 2 — Étendre `#bindViewportInteractions()`

**À faire**
- Conserver les bindings stage existants pour le pan.
- Récupérer le canvas PIXI.
- Brancher un listener `wheel` sur ce canvas.
- Dans le handler :
  - ignorer si le pointeur n'est pas sur le canvas ;
  - appeler `preventDefault()` ;
  - déterminer le prochain scale selon `deltaY` et `#zoomStep` ;
  - déléguer à `#zoomAt(globalPoint, nextScale)`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- brancher le wheel trop tôt, avant disponibilité du canvas DOM.

### Étape 3 — Implémenter `#zoomAt(globalPoint, nextScale)`

**À faire**
- Borner `nextScale` entre `#minZoom` et `#maxZoom`.
- Si le scale borné est identique au scale courant, ne rien faire.
- Convertir `globalPoint` écran en coordonnées monde courantes :
  - `worldX = (screenX - viewport.x) / viewport.scale`
  - `worldY = (screenY - viewport.y) / viewport.scale`
- Mettre à jour `#viewport.scale`.
- Recalculer `#viewport.x` et `#viewport.y` pour conserver ce point monde sous le curseur :
  - `viewport.x = screenX - worldX * nextScale`
  - `viewport.y = screenY - worldY * nextScale`
- Appeler `#applyViewportTransform()`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- confusion entre coordonnées écran du canvas et coordonnées globales du pointer.
- Mitigation : utiliser un contrat de coordonnées cohérent avec les événements déjà manipulés dans les tests/mocks.

### Étape 4 — Nettoyer le cycle de vie du listener `wheel`

**À faire**
- Ajouter un unbind explicite du listener `wheel`.
- L'appeler depuis `#teardownViewport()`.
- Réinitialiser les références de binding lorsque le viewport est détruit.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- fermeture/réouverture de l'app laissant un handler zombie sur un ancien canvas.

### Étape 5 — Étendre les tests

**À faire**
- Enrichir le mock canvas si nécessaire pour supporter `addEventListener` / `removeEventListener`.
- Ajouter un test qui prouve que le listener `wheel` est bien enregistré sur le canvas.
- Ajouter un test qui prouve qu'un tick de molette modifie `scale` selon `#zoomStep`.
- Ajouter un test qui prouve que le scale est borné par `#minZoom` et `#maxZoom`.
- Ajouter un test qui prouve que le point sous le pointeur reste stable visuellement.
- Ajouter un test de non-régression : après zoom, `renderNodes[x/y]` restent inchangés.
- Ajouter un test de cleanup : `removeEventListener('wheel', ...)` est bien appelé au `close()`.

**Fichier**
- `tests/applications/specialization-tree-app.test.mjs`

**Risque**
- tests trop dépendants de l'implémentation privée.
- Mitigation : tester le contrat observable via les appels à `position.set`, `scale.set`, les bornes, et l'immuabilité des nœuds.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter le binding `wheel`, `#zoomAt(...)`, le calcul de zoom centré pointeur et le cleanup associé |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Ajouter la couverture du zoom molette, des bornes, de la stabilité du point sous curseur et du cleanup |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Listener `wheel` dupliqué entre rendus | zoom accéléré, comportement incohérent | mémoriser la cible + handler et protéger le binding |
| Mauvais repère de coordonnées | zoom qui "saute" ou dérive | centraliser le calcul dans `#zoomAt()` et tester un cas simple avec pointeur fixe |
| Oubli du cleanup DOM | fuite mémoire / listeners zombies | unbind explicite au teardown |
| Borne de scale mal appliquée | viewport inutilisable | tests dédiés sur min/max |
| Mutation involontaire de `renderNodes` | régression métier | test explicite d'immuabilité après zoom |
| Molette hors canvas prise en compte | UX surprenante | garde sur la cible canvas et test dédié si le mock le permet |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): add pointer-centered wheel zoom to specialization viewport`
2. `refactor(talent-tree): manage wheel listener lifecycle for specialization tree app`
3. `test(talent-tree): cover viewport wheel zoom bounds and node immutability`

---

## 9. Dépendances avec les autres US

- Dépend conceptuellement de `#250`, déjà fermée.
- S'appuie sur `#252` car le viewport dispose déjà d'un système d'interactions centralisé.
- Prépare naturellement :
  - boutons `zoomIn` / `zoomOut` ;
  - éventuelle persistance de viewport ;
  - éventuel reset combiné pan + zoom.

## 10. Validation prévue

- `pnpm vitest tests/applications/specialization-tree-app.test.mjs`
