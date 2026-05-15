# Plan d'implémentation — #254 : Arbre de spécialisation — Boutons de zoom dans la toolbar

**Issue** : [#254 — Arbre de spécialisation — Boutons de zoom dans la toolbar](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/254)  
**Dépendances** : [#251 — Contrôle de recentrage dans la toolbar du viewport](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/251), [#253 — Zoom à la molette centré sur le pointeur](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/253)  
**ADR principales** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `styles/applications.less`, `lang/fr.json`, `lang/en.json`, `tests/applications/specialization-tree-app.test.mjs`

---

## 1. Objectif

Compléter la navigation du viewport de `SpecializationTreeApp` avec deux contrôles explicites de zoom dans la toolbar existante : `zoom out` et `zoom in`.

Le résultat attendu est :
- deux nouveaux boutons `-` et `+` visibles dans la toolbar du viewport ;
- deux actions ApplicationV2 `zoomOut` et `zoomIn` branchées via `data-action` et `DEFAULT_OPTIONS.actions` ;
- deux méthodes privées `#zoomOut()` et `#zoomIn()` qui zooment autour du centre visible du viewport ;
- un réemploi de la logique existante `#zoomAt(...)` et des bornes `#minZoom` / `#maxZoom` ;
- des clés i18n dédiées utilisées pour les `aria-label` ;
- un test prouvant que chaque bouton déclenche la bonne action de zoom.

---

## 2. Périmètre

### Inclus

- Ajout de deux boutons supplémentaires dans la toolbar du viewport.
- Déclaration des actions `zoomOut` et `zoomIn` dans `DEFAULT_OPTIONS.actions`.
- Ajout de handlers UI dédiés qui délèguent vers `#zoomOut()` / `#zoomIn()`.
- Calcul du point de zoom à partir du centre visible du viewport.
- Réutilisation de `#zoomAt(globalPoint, nextScale)` pour mutualiser la logique de clamp et de repositionnement.
- Ajout des clés i18n :
  - `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_OUT`
  - `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_IN`
- Ajustement CSS de la toolbar pour accueillir trois contrôles cohérents.
- Tests ciblés sur le déclenchement des actions et le contrat observable du zoom.

### Exclu

- Refonte complète de la toolbar.
- Changement du comportement du bouton `resetView`.
- Changement du zoom molette déjà introduit par `#253`.
- Persistance du viewport.
- Animation/inertie de zoom.
- Refonte du layout des nœuds ou du canvas PIXI.
- Changement des coordonnées métier `renderNodes`.

---

## 3. Constat sur l'existant

- `SpecializationTreeApp` expose déjà `DEFAULT_OPTIONS.actions.resetView`.
- Le template contient déjà une toolbar overlay avec un bouton `resetView`.
- Le code contient déjà :
  - `#minZoom = 0.5`
  - `#maxZoom = 2`
  - `#zoomStep = 1.15`
  - `#zoomAt(globalPoint, nextScale)`
- Le zoom molette est déjà implémenté et testé.
- La toolbar actuelle est stylée via :
  - `styles/applications.less`
  - `styles/swerpg.css`
- Les fichiers de langue ne contiennent aujourd'hui que `ACTION.CENTER`, pas encore `ZOOM_IN` / `ZOOM_OUT`.
- Les tests couvrent déjà :
  - `resetView`
  - le pan
  - le zoom molette
  - les bornes min/max
  - la stabilité du point zoomé
  - le cleanup du listener `wheel`

**Point d'attention** :
- L'issue mentionne `.specialization-tree-app__viewport-toolbar`, alors que le code actuel utilise `.specialization-tree-app__toolbar`.
- Le choix retenu est de faire converger le template et les styles vers `.specialization-tree-app__viewport-toolbar` pour coller au critère d'acceptation du ticket.

---

## 4. Décisions d'architecture

### 4.1. Réutiliser `#zoomAt(...)` comme point d'entrée unique

**Décision** : `#zoomIn()` et `#zoomOut()` ne recalculent pas elles-mêmes les offsets ; elles délèguent à `#zoomAt(centerPoint, nextScale)`.

**Justification** :
- évite de dupliquer la logique de clamp et de repositionnement ;
- garde un seul point de vérité pour le zoom ;
- réduit le risque de divergence entre zoom molette et zoom toolbar.

### 4.2. Zoom relatif au centre visible du viewport

**Décision** : calculer le point cible de zoom à partir du centre du host viewport visible, pas du centre métier de l'arbre.

**Justification** :
- c'est l'exigence explicite du ticket ;
- cohérent avec un contrôle de navigation caméra ;
- respecte la séparation navigation UI / données métier.

### 4.3. Actions ApplicationV2 via `DEFAULT_OPTIONS.actions`

**Décision** : déclarer `zoomOut` et `zoomIn` dans `DEFAULT_OPTIONS.actions`, comme `resetView`.

**Justification** :
- pattern déjà présent dans cette app ;
- cohérent avec ApplicationV2 ;
- facilite les tests en invoquant directement les handlers.

### 4.4. Boutons toolbar DOM, pas contrôles PIXI

**Décision** : ajouter les contrôles dans le template Handlebars existant.

**Justification** :
- cohérent avec `#251` ;
- plus simple à localiser, styliser et tester ;
- évite de mélanger UI de contrôle et scène PIXI.

### 4.5. Accessibilité pilotée par i18n

**Décision** : utiliser les nouvelles clés i18n pour les `aria-label` des boutons de zoom.

**Justification** :
- conforme au ticket ;
- conforme ADR-0005 ;
- évite les chaînes hardcodées.

### 4.6. Ajustement CSS minimal de la toolbar

**Décision** : étendre le style existant de la toolbar sans créer une seconde variante visuelle.

**Justification** :
- changement faible et cohérent ;
- préserve l'identité graphique déjà introduite par `#251` ;
- réduit le coût de maintenance.

### 4.7. Renommage de la classe CSS toolbar

**Décision** : faire converger le template et les styles vers `.specialization-tree-app__viewport-toolbar` pour coller au critère d'acceptation du ticket.

**Justification** :
- le ticket `#254` utilise `.specialization-tree-app__viewport-toolbar` dans son acceptance criterion ;
- le code actuel utilise `.specialization-tree-app__toolbar` ;
- un renommage contrôlé permet de satisfaire le critère sans casser le style (mêmes règles CSS, nouveau nom).

---

## 5. Plan de travail détaillé

### Étape 1 — Déclarer les nouvelles actions UI

**À faire**
- Ajouter `zoomOut` et `zoomIn` dans `SpecializationTreeApp.DEFAULT_OPTIONS.actions`.
- Introduire deux handlers UI dédiés, sur le même modèle que `resetView`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- incohérence de nommage entre `data-action` template et clés `actions`.

### Étape 2 — Implémenter `#zoomIn()` et `#zoomOut()`

**À faire**
- Ajouter deux méthodes privées :
  - `#zoomIn()`
  - `#zoomOut()`
- Calculer le centre visible du viewport à partir des dimensions du host courant.
- Déterminer le prochain scale :
  - `scale * #zoomStep` pour `zoomIn`
  - `scale / #zoomStep` pour `zoomOut`
- Déléguer à `#zoomAt(centerPoint, nextScale)`.

**Fichier**
- `module/applications/specialization-tree-app.mjs`

**Risque**
- utilisation d'un centre incohérent si le viewport host n'est pas disponible.
- Mitigation : garde défensive et no-op si le host ou ses dimensions sont indisponibles.

### Étape 3 — Étendre la toolbar du template et renommer la classe CSS

**À faire**
- Ajouter deux boutons supplémentaires autour du bouton de centrage.
- Déclarer les `data-action` :
  - `zoomOut`
  - `resetView`
  - `zoomIn`
- Utiliser les nouvelles clés i18n pour `aria-label`.
- Remplacer la classe `.specialization-tree-app__toolbar` par `.specialization-tree-app__viewport-toolbar`.
- Conserver le host `[data-specialization-tree-viewport]` inchangé.

**Fichiers**
- `templates/applications/specialization-tree-app.hbs`
- `styles/applications.less`

**Risque**
- structure DOM modifiée d'une façon qui perturbe le montage ou les sélecteurs existants.
- Mitigation : ne toucher qu'à la toolbar, pas au host viewport ni au tooltip.

### Étape 4 — Ajouter les clés i18n

**À faire**
- Ajouter :
  - `ACTION.ZOOM_OUT`
  - `ACTION.ZOOM_IN`
- Conserver `ACTION.CENTER` inchangé.
- Synchroniser strictement `fr.json` et `en.json`.

**Fichiers**
- `lang/fr.json`
- `lang/en.json`

**Risque**
- oubli d'une langue ou structure JSON désynchronisée.

### Étape 5 — Compiler le CSS

**À faire**
- Si le workflow du projet l'exige, recompiler `styles/swerpg.css` à partir de `styles/applications.less` pour versionner l'artefact compilé à jour.

**Fichier**
- `styles/swerpg.css`

**Risque**
- divergence entre LESS source et CSS commité.
- Mitigation : traiter explicitement les deux si le workflow du repo l'exige.

### Étape 6 — Étendre les tests

**À faire**
- Ajouter un test qui prouve que l'action `zoomIn` déclenche une augmentation du scale.
- Ajouter un test qui prouve que l'action `zoomOut` déclenche une diminution du scale.
- Vérifier que le zoom toolbar utilise le centre visible du viewport comme point de référence.
- Vérifier que les bornes `minZoom` / `maxZoom` restent respectées par les actions toolbar.
- Vérifier que `renderNodes` ne sont pas mutés.

**Fichier**
- `tests/applications/specialization-tree-app.test.mjs`

**Risque**
- tests trop couplés à l'implémentation privée.
- Mitigation : tester le contrat observable via `position.set`, `scale.set`, le clamp et l'immuabilité des nœuds.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter les actions `zoomOut` / `zoomIn`, les handlers UI et les méthodes privées de zoom centré viewport |
| `templates/applications/specialization-tree-app.hbs` | modification | Ajouter les deux boutons de zoom dans la toolbar et renommer la classe en `.specialization-tree-app__viewport-toolbar` |
| `styles/applications.less` | modification | Ajouter le style des nouveaux contrôles et renommer la classe toolbar |
| `styles/swerpg.css` | potentielle modification | Refléter la compilation LESS si l'artefact compilé est commité |
| `lang/fr.json` | modification | Ajouter `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_OUT` et `.ZOOM_IN` |
| `lang/en.json` | modification | Ajouter `SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.ZOOM_OUT` et `.ZOOM_IN` |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Ajouter la couverture des actions toolbar de zoom |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Duplication de logique entre molette et boutons | comportements divergents | faire des boutons un simple wrapper autour de `#zoomAt(...)` |
| Mauvais centre de zoom | UX incohérente | calculer explicitement le centre du viewport visible et le tester |
| Renommage CSS cassant la toolbar | toolbar non stylée | appliquer le renommage simultanément dans template et LESS ; vérifier visuellement |
| Bornes `minZoom/maxZoom` contournées par les boutons | viewport inutilisable | laisser `#zoomAt(...)` gérer le clamp |
| Régression sur `resetView` | toolbar partiellement cassée | conserver l'action et le bouton existants, n'ajouter que deux contrôles adjacents |
| Tests trop dépendants du rendu interne | maintenance difficile | rester sur des assertions de contrat observable |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): add toolbar zoom actions to specialization tree app`
2. `feat(talent-tree): add zoom controls and i18n labels to specialization viewport toolbar`
3. `style(talent-tree): align specialization viewport toolbar styles for zoom controls`
4. `test(talent-tree): cover toolbar zoom actions and viewport-centered zoom behavior`

---

## 9. Dépendances avec les autres US

- Dépend directement de `#251` pour la toolbar et l'action `resetView`.
- Dépend directement de `#253` pour la logique de zoom runtime déjà introduite.
- Dans l'état actuel du code local, ces prérequis sont déjà présents, ce qui réduit fortement le périmètre réel de `#254`.
- Cette tranche clôt la navigation de base du viewport avec trois gestes explicites :
  - zoom out
  - centrer
  - zoom in

## 10. Validation prévue

- `pnpm vitest tests/applications/specialization-tree-app.test.mjs`

### Validation manuelle

- Ouvrir `SpecializationTreeApp` depuis une fiche acteur avec un arbre disponible.
- Vérifier la présence de trois contrôles dans la toolbar.
- Cliquer sur `+` :
  - le viewport zoome ;
  - le centre visible reste stable ;
  - le zoom ne dépasse pas `maxZoom`.
- Cliquer sur `-` :
  - le viewport dézoome ;
  - le zoom ne descend pas sous `minZoom`.
- Cliquer sur `Centrer` :
  - la vue revient au centrage initial avec `scale = 1`.
- Vérifier que les boutons ont des `aria-label` localisés.
