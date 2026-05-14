# Plan d'implémentation — #251 : Arbre de spécialisation — Contrôle de recentrage dans la toolbar du viewport

**Issue** : [#251 — Arbre de spécialisation — Contrôle de recentrage dans la toolbar du viewport](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/251)  
**Dépendance** : [#250 — Vue initiale centrée et caméra runtime du canvas](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/250)  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`, `tests/applications/specialization-tree-app.test.mjs`

---

## 1. Objectif

Ajouter le premier contrôle utilisateur explicite du viewport de `SpecializationTreeApp` : un bouton de toolbar permettant de recentrer l'arbre et de remettre le zoom à `1`.

Le résultat attendu est :
- une toolbar visible en surimpression du viewport, en haut à droite ;
- une action ApplicationV2 `resetView` branchée au bouton ;
- une clé i18n dédiée `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER` ;
- une méthode de recentrage qui réutilise la caméra runtime introduite par `#250` ;
- un test qui prouve qu'un clic sur le bouton remet bien la vue au centre.

---

## 2. Périmètre

### Inclus

- Ajout d'une toolbar DOM dans le template de `SpecializationTreeApp`.
- Ajout d'un bouton `data-action="resetView"` libellé via i18n.
- Déclaration d'une action ApplicationV2 dans `DEFAULT_OPTIONS.actions`.
- Ajout d'une méthode dédiée de type `_onResetView()` qui délègue à `#resetView()`.
- Implémentation de `#resetView()` pour :
  - remettre `#viewport.scale` à `1`,
  - recalculer la bounding box,
  - recentrer l'arbre dans le host visible,
  - réappliquer la transformation au conteneur PIXI existant.
- Ajout du style sombre de toolbar.
- Ajout des tests unitaires / intégration ciblés.

### Exclu

- Boutons `zoomIn` / `zoomOut`.
- Zoom molette.
- Drag-pan.
- Persistance du viewport.
- Refonte du layout des nœuds ou des connexions.
- Changement du contrat de sélection d'arbre courant.

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` possède déjà :
  - un état privé `#viewport = { scale: 1, x: 0, y: 0 }`,
  - `#applyViewportTransform()`,
  - `#centerTree(context)`,
  - le branchement `options.resetView !== false` dans `_onRender()`.
- Le template `templates/applications/specialization-tree-app.hbs` expose aujourd'hui :
  - la sidebar,
  - le host viewport `[data-specialization-tree-viewport]`,
  - le tooltip,
  - mais aucune toolbar.
- Les styles du viewport existent déjà dans `styles/applications.less`, avec un thème sombre compatible.
- Les clés i18n de `SPECIALIZATION_TREE_APP` existent en `fr` et `en`, mais aucun sous-namespace `ACTION`.
- Les tests existants couvrent déjà :
  - le centrage initial,
  - le non-recentrage avec `resetView: false`,
  - l'application du transform viewport,
  - la non-mutation de `renderNodes`.
- Le pattern projet pour les actions UI est `DEFAULT_OPTIONS.actions` + `data-action`, déjà utilisé dans les sheets et apps existantes.

---

## 4. Décisions d'architecture

### 4.1. Toolbar DOM plutôt que contrôle PIXI

**Décision** : implémenter la toolbar dans le template Handlebars, pas dans le canvas PIXI.

**Justification** :
- cohérent avec `ApplicationV2` et les `data-action` du projet ;
- plus simple à tester ;
- évite de mélanger contrôles d'interface et couche de dessin du graphe.

### 4.2. Action déclarée dans `DEFAULT_OPTIONS.actions`

**Décision** : ajouter `resetView` à `SpecializationTreeApp.DEFAULT_OPTIONS.actions`.

**Justification** :
- c'est le pattern déjà utilisé dans le repo ;
- l'issue demande explicitement une action ApplicationV2 ;
- le test peut invoquer directement le handler, sans dépendre d'un wiring DOM lourd.

### 4.3. `_onResetView()` comme pont vers `#resetView()`

**Décision** : exposer un handler interne `_onResetView()` qui appelle une méthode privée `#resetView()`.

**Justification** :
- sépare le contrat UI de la logique de caméra ;
- garde `#resetView()` réutilisable en interne ;
- respecte l'esprit de l'acceptance criterion.

### 4.4. Réutiliser le centrage existant au lieu de dupliquer la logique

**Décision** : `#resetView()` doit s'appuyer sur la logique actuelle de bounding box / centrage, pas introduire une seconde formule.

**Justification** :
- un seul comportement de recentrage ;
- réduit le risque de divergence entre centrage initial et recentrage manuel ;
- facilite les futurs boutons de zoom.

### 4.5. Préserver strictement le host viewport existant

**Décision** : ajouter la toolbar comme sibling overlay du host `[data-specialization-tree-viewport]`, sans modifier son dataset ni son rôle.

**Justification** :
- `#getViewportHost()` dépend déjà de ce sélecteur ;
- réduit le risque de casser le montage PIXI ou les tests existants ;
- répond à l'acceptance criterion de non-régression template.

---

## 5. Plan de travail détaillé

### Étape 1 — Déclarer l'action ApplicationV2

**À faire**
- Ajouter `actions: { resetView: ... }` dans `SpecializationTreeApp.DEFAULT_OPTIONS`.
- Introduire un handler `_onResetView(event, target)` ou équivalent.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- mauvais binding de `this` dans l'action.

### Étape 2 — Implémenter la logique de reset runtime

**À faire**
- Ajouter `#resetView()` si absente.
- Faire en sorte que cette méthode :
  - récupère le contexte utile courant,
  - remette `scale` à `1`,
  - recalcule l'offset centré,
  - appelle `#applyViewportTransform()` sans forcer un rerender complet.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- dépendre d'un contexte non disponible au moment du clic.
- Mitigation : réutiliser `#renderNodesCache` ou reconstruire un contexte minimal fiable.

### Étape 3 — Ajouter la toolbar au template

**À faire**
- Introduire un conteneur toolbar dans `.specialization-tree-app__viewport-panel`.
- Ajouter un bouton `type="button"` avec `data-action="resetView"`.
- Utiliser `{{localize 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER'}}`.

**Fichier**
- `templates/applications/specialization-tree-app.hbs`

**Risque**
- casser la structure actuelle du viewport ou du tooltip.
- Mitigation : conserver le host viewport et le tooltip tels quels, ajouter la toolbar en overlay.

### Étape 4 — Ajouter les clés i18n

**À faire**
- Ajouter `ACTION.CENTER` sous `SWERPG.TALENT.SPECIALIZATION_TREE_APP` en français et en anglais.

**Fichiers**
- `lang/fr.json`
- `lang/en.json`

**Risque**
- désynchronisation des fichiers de langue.
- Mitigation : même structure dans les deux fichiers.

### Étape 5 — Styliser la toolbar

**À faire**
- Ajouter les classes de toolbar et bouton dans `styles/applications.less`.
- Respecter le thème sombre SWERPG :
  - `rgba(...)`,
  - bordure discrète,
  - contraste lisible,
  - position absolute en haut à droite,
  - `z-index` et `pointer-events` corrects.

**Fichiers**
- `styles/applications.less`
- potentiellement `styles/swerpg.css` si le repo versionne l'artefact compilé

**Risque**
- chevauchement avec le tooltip ou mauvaise lisibilité mobile.
- Mitigation : espacement simple, taille contenue, règles responsive minimales.

### Étape 6 — Étendre les tests

**À faire**
- Ajouter un test qui invoque l'action `resetView` et vérifie que `position.set(...)` reçoit les coordonnées de recentrage.
- Vérifier que `scale.set(1)` est appliqué après reset.
- Vérifier que l'action de clic n'altère pas `renderNodes`.
- Conserver les assertions ciblées et diagnostiques.

**Fichier**
- `tests/applications/specialization-tree-app.test.mjs`

**Risque**
- test trop couplé à la structure interne.
- Mitigation : tester le contrat observable (`position.set`, `scale.set`, coordonnées inchangées), pas l'implémentation détaillée.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter l'action `resetView`, le handler UI et la logique de reset runtime |
| `templates/applications/specialization-tree-app.hbs` | modification | Ajouter la toolbar overlay et le bouton de recentrage |
| `styles/applications.less` | modification | Styliser la toolbar et son bouton |
| `styles/swerpg.css` | potentielle modification | Refléter la compilation LESS si l'artefact est commité |
| `lang/fr.json` | modification | Ajouter la clé `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER` |
| `lang/en.json` | modification | Ajouter la clé `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.CENTER` |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Ajouter la couverture du clic de recentrage |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Duplication entre `#centerTree()` et `#resetView()` | comportement divergent | faire de `#resetView()` un simple point d'entrée qui réutilise la logique de centrage existante |
| Toolbar casse le host viewport | PIXI ne se monte plus correctement | conserver `[data-specialization-tree-viewport]` inchangé |
| Handler d'action mal bindé | clic inopérant | suivre le pattern `DEFAULT_OPTIONS.actions` déjà utilisé dans le projet |
| Test trop fragile | faux négatifs | assertions sur contrat observable seulement |
| CSS overlay gêne tooltip ou mobile | UX dégradée | positionnement simple, espacements, vérification responsive minimale |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): add reset view action to specialization tree app`
2. `feat(talent-tree): add viewport toolbar and center action label`
3. `style(talent-tree): add dark toolbar styling for specialization viewport`
4. `test(talent-tree): cover reset view action recentering`

---

## 9. Dépendances avec les autres US

- Dépend directement de `#250`, car le recentrage manuel repose sur la caméra runtime déjà introduite.
- Prépare naturellement les tranches suivantes :
  - `zoomIn`,
  - `zoomOut`,
  - éventuel pan utilisateur,
  - éventuelle conservation de vue entre rerenders.

## 10. Validation prévue

- `pnpm vitest tests/applications/specialization-tree-app.test.mjs`
