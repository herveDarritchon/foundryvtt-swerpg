# Plan d'implémentation — #255 : Arbre de spécialisation — Stabilité au resize, au rerender et au changement d'arbre

**Issue** : [#255 — Arbre de spécialisation — Stabilité au resize, au rerender et au changement d'arbre](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/255)  
**Bloquants** : [#252](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/252), [#253](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/253)  
**Statut des bloquants** : fermés  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`, `templates/applications/specialization-tree-app.hbs`

---

## 1. Objectif

Stabiliser le viewport PIXI de `SpecializationTreeApp` face aux redimensionnements du host Foundry, aux rerenders de l'application, et permettre à l'utilisateur de changer d'arbre de spécialisation affiché quand le personnage en possède plusieurs.

Le résultat attendu est :
- le renderer PIXI suit les dimensions du host via `ResizeObserver` ;
- la `hitArea` du stage reste alignée au viewport courant ;
- la caméra utilisateur est conservée quand le même arbre est rerendu ;
- la vue est recentrée uniquement quand l'arbre affiché change ;
- l'utilisateur peut sélectionner un arbre parmi ses spécialisations disponibles depuis la sidebar ;
- les listeners `pointer`, `wheel`, `ResizeObserver` et l'état de pan sont correctement nettoyés au teardown ;
- les tests prouvent explicitement ces contrats.

---

## 2. Périmètre

### Inclus

- Conservation de `#viewport.x`, `#viewport.y` et `#viewport.scale` lors d'un rerender du même arbre.
- Recentrage automatique lors d'un changement de `selectedTreeKey`.
- Redimensionnement du renderer PIXI et mise à jour de `stage.hitArea` via `ResizeObserver`.
- **Ajout d'un mécanisme de sélection d'arbre dans la sidebar** : clic sur une spécialisation disponible pour afficher son arbre.
- **État privé `#selectedTreeKey`** distinct du simple "dernier arbre disponible", permettant à l'utilisateur de choisir son arbre.
- Synchronisation entre la sélection (sidebar) et le viewport (PIXI).
- Nettoyage complet des listeners `pointer`, `wheel`, `ResizeObserver` et de l'état de pan.
- Ajout de tests de non-régression sur resize, rerender, changement d'arbre et teardown.

### Exclu

- Refonte graphique du viewport.
- Persistance du viewport entre ouvertures.
- Boutons additionnels de navigation (zoomIn/zoomOut).
- Refonte métier des arbres ou des nœuds.
- Migration de données.
- Achat de talents (préparé mais pas implémenté ici).

---

## 3. Constat sur l'existant

- `SpecializationTreeApp` possède déjà une caméra runtime `#viewport = { scale, x, y }` dans `module/applications/specialization-tree-app.mjs`.
- `#bindResizeObserver()` existe déjà et relance `#resizeViewport()` puis `#applyViewportTransform()`.
- `#resizeViewport()` redimensionne déjà le renderer et remet `stage.hitArea`.
- `#syncViewport()` recentre déjà seulement si premier rendu ou si le `currentTreeId` distillé du contexte change.
- Le cleanup existe déjà dans `#unbindViewportInteractions()` et `#teardownViewport()`.
- Les tickets bloquants `#252` et `#253` sont absorbés dans le code actuel.
- Les tests couvrent déjà le pan, le zoom, la non-duplication de listeners stage et le retrait du listener `wheel`.

### Ce qui manque pour satisfaire l'issue

**Côté stabilité (gaps identifiés) :**
- aucun test ne prouve qu'un resize réel ne réinitialise pas la caméra utilisateur ;
- aucun test ne prouve qu'un changement d'arbre déclenche bien un recentrage.

**Côté sélection UI (nouvelle fonctionnalité) :**
- aujourd'hui, `buildSpecializationTreeContext()` retourne le **dernier** arbre disponible (`lastAvailableEntry`), sans notion de sélection utilisateur ;
- la sidebar liste les spécialisations mais elles ne sont pas cliquables ;
- `SpecializationTreeApp` ne dispose pas d'un état `#selectedTreeKey` persistant entre les rerenders.

---

## 4. Décisions d'architecture

### 4.1. Conserver la caméra comme état runtime unique

**Décision** : continuer à porter pan et zoom uniquement dans `#viewport`, jamais dans `renderNodes`.

**Justification** :
- cohérent avec `#252` et `#253` ;
- évite toute mutation des coordonnées métier ;
- simplifie les garanties de stabilité au rerender et au resize.

### 4.2. Le resize ne doit jamais recadrer implicitement

**Décision** : un callback `ResizeObserver` ne doit faire que redimensionner le renderer, mettre à jour la hitArea et réappliquer le transform courant.

**Justification** :
- c'est le contrat fonctionnel central de résistance de l'issue ;
- un resize Foundry ne doit pas casser la position utilisateur.

### 4.3. Sélection courante portée par l'application

**Décision** : remplacer l'état implicite `#currentTreeId` (distillé du contexte) par un état explicite `#selectedTreeKey` que l'utilisateur contrôle depuis la sidebar.

**Justification** :
- l'utilisateur doit pouvoir choisir un arbre précis parmi plusieurs ;
- le contexte ne doit plus imposer "le dernier disponible" comme seul choix ;
- cela rend le comportement stable entre interactions et rerenders.

### 4.4. Sidebar cliquable

**Décision** : rendre chaque spécialisation disponible cliquable via `data-action="selectTree"` avec un état visuel "active" marqué dans le contexte.

**Justification** :
- UI minimale, cohérente avec l'existant (pas de nouveau composant) ;
- le template lit déjà les spécialisations ;
- pas besoin d'un sélecteur complexe.

### 4.5. Fallback initial conservateur

**Décision** : au premier affichage, sélectionner automatiquement la première spécialisation disponible, comme aujourd'hui.

**Justification** :
- évite un viewport vide inutile ;
- conserve le comportement actuel comme fallback ;
- minimise la rupture UX.

### 4.6. Le recentrage reste conditionné à un changement de la sélection

**Décision** : recentrer la vue uniquement quand `#selectedTreeKey` change (initialisation comprise).

**Justification** :
- c'est la bonne séparation entre rerender du même contenu et changement de contenu ;
- le code existant est déjà proche : il suffit de le faire dépendre de `#selectedTreeKey` et non de `context.currentTreeId`.

### 4.7. Teardown symétrique et explicite

**Décision** : considérer le cleanup explicite comme une exigence de contrat, pas comme un effet secondaire de `pixiApp.destroy()`.

**Justification** :
- évite les comportements fantômes après fermeture/réouverture ;
- rend les tests plus lisibles et diagnostiques.

### 4.8. Tests centrés sur le contrat observable

**Décision** : tester les appels à `position.set()`, `scale.set()`, les dimensions de `hitArea`, les appels `addEventListener` / `removeEventListener` / `disconnect`, et l'immuabilité des `renderNodes`, sans dépendre d'un rendu PIXI réel.

**Justification** :
- conforme ADR-0004 et ADR-0012 ;
- évite les tests fragiles ;
- rend les diagnostics clairs.

---

## 5. Plan de travail détaillé

### Étape 1 — Ajouter l'état de sélection dans `SpecializationTreeApp`

**À faire**
- Remplacer `#currentTreeId` par `#selectedTreeKey = null`.
- Ajouter une méthode privée `#selectTree(key, context)` qui :
  - positionne `#selectedTreeKey` ;
  - stocke le contexte correspondant pour `#drawTree()` ;
  - déclenche un recentrage.
- Conserver un fallback automatique sur la première spécialisation disponible si `#selectedTreeKey` est `null` et qu'il existe des spécialisations disponibles.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- rupture avec la logique existante qui se basait sur `context.currentTreeId`.
- **Mitigation** : `#selectedTreeKey` remplace proprement `#currentTreeId`, avec un fallback conservateur.

### Étape 2 — Refondre `#syncViewport()` autour de `#selectedTreeKey`

**À faire**
- Remplacer :
  ```js
  const shouldResetView = !this.#hasInitializedViewport || this.#currentTreeId !== nextTreeId
  ```
  par :
  ```js
  const shouldResetView = !this.#hasInitializedViewport || this.#selectedTreeKey !== nextTreeKey
  ```
- Dans `#syncViewport()` : récupérer l'arbre sélectionné depuis le contexte et le passer à `#drawTree()`.
- Vérifier qu'aucun chemin de resize ou de rerender du même arbre n'appelle `#centerTree()` implicitement.
- Vérifier que `requestAnimationFrame()` de post-render ne recadre pas par effet de bord.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- recentrage involontaire après rerender ou après resize.

### Étape 3 — Revoir `buildSpecializationTreeContext()` pour supporter la sélection

**À faire**
- Remplacer la logique `lastAvailableEntry` par un paramètre `selectedKey` optionnel.
- Si `selectedKey` est fourni et correspond à une spécialisation disponible, résoudre cet arbre.
- Sinon, retomber sur le premier disponible.
- Ajouter un champ `isSelected` sur chaque entrée de `specializations` pour que le template puisse marquer l'élément actif dans la sidebar.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- le contexte reflète l'arbre affiché ; si `selectedKey` est `null` ou invalide, il faut un fallback propre.
- **Mitigation** : conserver le comportement "dernier disponible" comme fallback.

### Étape 4 — Ajouter l'action `selectTree` et rendre la sidebar interactive

**À faire**
- Déclarer une action `selectTree` dans `DEFAULT_OPTIONS.actions` :
  ```js
  selectTree: SpecializationTreeApp.#onSelectTree,
  ```
- Implémenter `#onSelectTree(event, target)` :
  - extraire la clé de l'arbre depuis `target.dataset.treeKey` ;
  - mettre à jour `#selectedTreeKey` ;
  - rerendre l'application.
- Dans le template `specialization-tree-app.hbs` :
  - ajouter `data-action="selectTree"` et `data-tree-key="{{specialization.key}}"` sur chaque `<li>` disponible ;
  - ajouter `class="is-active"` conditionnelle si `specialization.isSelected`.
- Désactiver (ou rendre non cliquable) les spécialisations non disponibles.

**Fichier**
- `module/applications/specialization-tree-app.mjs`
- `templates/applications/specialization-tree-app.hbs`

**Risque**
- conflit entre l'affichage passif et l'interactivité de la sidebar.
- **Mitigation** : conserver la sidebar comme simple liste avec attributs `data-action`, pas de refonte du layout.

### Étape 5 — Synchroniser la sélection et le viewport

**À faire**
- S'assurer que `#onSelectTree` déclenche un rerender complet.
- Vérifier que `#syncViewport()` :
  - si même arbre : conserve la caméra, redessine seulement ;
  - si arbre différent : recentre.
- Vérifier que le resize ne réinitialise ni `#selectedTreeKey`, ni l'état de zoom/pan.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- rerender intempestif ou boucle.
- **Mitigation** : `render()` une seule fois par sélection, avec garde sur l'égalité.

### Étape 6 — Durcir le contrat du `ResizeObserver`

**À faire**
- Vérifier que le callback du `ResizeObserver` :
  - relance `#resizeViewport()` ;
  - remet une `hitArea` cohérente ;
  - réapplique seulement le transform courant.
- Vérifier que le resize ne réinitialise ni `#viewport`, ni `#selectedTreeKey`, ni l'état de zoom/pan.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- impression de "saut" de caméra lors d'un resize de fenêtre ou de panneau Foundry.

### Étape 7 — Vérifier le teardown complet

**À faire**
- Vérifier que `#unbindViewportInteractions()` retire bien tous les listeners stage et canvas.
- Vérifier que `#teardownViewport()` déconnecte le `ResizeObserver`.
- Vérifier que `#stopPanning()` est toujours appelé au teardown.
- Vérifier que `#selectedTreeKey` et `#hasInitializedViewport` sont réinitialisés.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- listeners zombies ou état sélection résiduel après fermeture/réouverture.

### Étape 8 — Ajouter les tests manquants

**Sous-étape 8a — Tests de stabilité resize**

- Ajouter un test "resize preserve camera" qui :
  - pan ou zoome le viewport ;
  - déclenche le callback du `ResizeObserver` ;
  - vérifie que `renderer.resize(...)` est appelé ;
  - vérifie que `stage.hitArea` est mise à jour avec les nouvelles dimensions ;
  - vérifie que la position utilisateur n'est pas réinitialisée.

**Sous-étape 8b — Tests de changement d'arbre**

- Ajouter un test "même arbre rerendu conserve la caméra" :
  - déplacer la caméra ;
  - rerendre avec la même sélection d'arbre ;
  - vérifier absence de recentrage.
- Ajouter un test "arbre différent recentre" :
  - déplacer la caméra ;
  - sélectionner un autre arbre ;
  - vérifier que la vue est recentrée.

**Sous-étape 8c — Tests de sélection sidebar**

- Ajouter un test "clic sur une spécialisation disponible change l'arbre affiché" :
  - construire un contexte avec deux spécialisations disponibles ;
  - cliquer sur la seconde dans la sidebar ;
  - vérifier que `#selectedTreeKey` change ;
  - vérifier que le viewport est recentré.
- Ajouter un test "spécialisation non disponible ne déclenche pas de sélection".

**Sous-étape 8d — Tests de teardown**

- Ajouter un test explicite que `ResizeObserver.disconnect()` est appelé au `close()`.
- Ajouter un test qu'un pan en cours est annulé au teardown et qu'aucun mouvement fantôme ne survit à une réouverture.

**Fichier**
- `tests/applications/specialization-tree-app.test.mjs`

**Risque**
- tests trop couplés à l'implémentation privée.
- **Mitigation** : tester les effets observables (position.set, scale.set, hitArea, listeners).

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter `#selectedTreeKey`, refondre `#syncViewport()` et `buildSpecializationTreeContext()`, ajouter l'action `#onSelectTree`, gérer l'état visuel de sélection |
| `templates/applications/specialization-tree-app.hbs` | modification | Ajouter `data-action="selectTree"`, `data-tree-key`, état `is-active` sur les spécialisations disponibles |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Ajouter la couverture resize, changement d'arbre, sélection UI et cleanup complet |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Recentrage involontaire après resize | perte de position utilisateur | tester explicitement le callback du `ResizeObserver` |
| Recentrage involontaire au rerender du même arbre | UX instable | test dédié sur conservation de caméra avec `#selectedTreeKey` identique |
| Absence de recentrage lors d'un changement d'arbre | viewport incohérent sur nouveau contenu | test dédié sur `#selectedTreeKey` différent |
| `buildSpecializationTreeContext()` écrase la sélection à chaque render | sélection utilisateur perdue | extraire la sélection comme paramètre, fallback conservateur |
| La sidebar est rendue non interactive par le template | impossible de changer d'arbre | test d'intégration sur l'action `selectTree` |
| Conflit entre clic sidebar et événements PIXI | comportement inattendu | `event.stopPropagation()` si nécessaire |
| Listener zombie après fermeture | comportements fantômes | assertions explicites sur `off`, `removeEventListener`, `disconnect()` |
| Pan restant actif après teardown | mouvements imprévisibles à la réouverture | test dédié sur reset de l'état de pan |

---

## 8. Proposition d'ordre de commit

1. `refactor(talent-tree): replace implicit currentTreeId with explicit selectedTreeKey state`
2. `feat(talent-tree): add specialization tree selection from sidebar with selectTree action`
3. `fix(talent-tree): preserve camera on viewport resize and same-tree rerender`
4. `test(talent-tree): cover tree selection, viewport stability resize, rerender, and teardown`

---

## 9. Dépendances avec les autres US

- `#252` et `#253` sont fermées et fournissent la base pan/zoom nécessaire.
- `#255` se place au-dessus de ces deux tickets pour fiabiliser leur cycle de vie et ajouter la sélection utilisateur.
- Les étapes 1 à 3 (sélection + stabilité) peuvent être implémentées ensemble, car la refonte de `#currentTreeId` vers `#selectedTreeKey` touche le même périmètre.

---

## 10. Validation prévue

```bash
pnpm vitest tests/applications/specialization-tree-app.test.mjs
```
