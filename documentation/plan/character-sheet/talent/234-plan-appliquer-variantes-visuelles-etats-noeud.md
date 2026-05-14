# Plan d'implémentation — Appliquer les variantes visuelles des états de nœud (US16)

**Issue
** : [#234 — Appliquer les variantes visuelles des états de nœud (US16)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/234)  
**Parent
** : [#200 — US16: Afficher arbres, nœuds et connexions dans la vue graphique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/200)  
**Blocked by
** : [#233 — Afficher l'arbre par défaut avec nœuds positionnés et connexions (US16)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/233)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`,
`documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`,
`documentation/architecture/adr/adr-0005-localization-strategy.md`,
`documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (modification), `lang/fr.json` (
modification), `lang/en.json` (modification), `tests/applications/specialization-tree-app.test.mjs` (modification)

---

## 1. Objectif

Compléter la vue graphique des arbres de spécialisation pour que chaque nœud affiche un état métier visuellement
identifiable sans ambiguïté : `purchased`, `available`, `locked`, `invalid`.

Le résultat attendu est une application `SpecializationTreeApp` qui continue d'afficher l'arbre courant en lecture
seule, mais dont les nœuds sont désormais stylisés selon l'état retourné par la couche domaine existante. Aucun achat ne
doit être déclenché, aucune logique métier ne doit être recalculée côté UI, et les libellés d'état doivent être
localisés en français et en anglais.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Consommer `getTreeNodesStates(actor, specializationId, tree)` pour obtenir l'état métier de chaque nœud affiché.
- Enrichir le view-model de `SpecializationTreeApp` avec les informations d'état nécessaires au rendu.
- Définir une variante PIXI dédiée pour chacun des états :
    - `purchased`
    - `available`
    - `locked`
    - `invalid`
- Appliquer ces variantes au rendu graphique des nœuds :
    - couleur de fond ;
    - bordure ;
    - opacité ;
    - couleur de texte si nécessaire.
- Ajouter les clés i18n FR/EN pour les libellés d'état de nœud.
- Étendre les tests Vitest pour couvrir le mapping état métier -> variante UI.
- Préserver la règle héritée de `#233` : l'arbre courant reste le dernier arbre résolu `available` dans l'ordre des
  spécialisations possédées.

### Exclu de cette US / ce ticket

- Mapping `reasonCode` -> message utilisateur compréhensible -> `#235`
- Tooltip, panneau de détail ou libellé adjacent expliquant pourquoi un nœud est verrouillé ou invalide -> `#235`
- Sélection interactive de spécialisation courante -> US17
- Achat de nœud depuis la vue graphique -> US18
- Persistance d'un état UI dans `actor.system` ou `actor.flags`
- Refonte du layout `row` / `column`
- Modification du template Handlebars ou des styles LESS, sauf besoin technique imprévu strictement nécessaire
- Modification de `module/lib/talent-node/talent-node-state.mjs`

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` affiche déjà l'arbre courant, les nœuds et les connexions dans un
  viewport PIXI autonome.
- Le choix de l'arbre courant suit déjà la règle du dernier arbre `available`, conforme au cadrage US16 et au ticket
  `#233`.
- Le rendu actuel des nœuds est neutre :
    - fond uniforme ;
    - bordure uniforme ;
    - texte uniforme ;
    - aucune distinction visuelle entre états métier.
- `module/lib/talent-node/talent-node-state.mjs` expose déjà :
    - `NODE_STATE` avec `purchased`, `available`, `locked`, `invalid`
    - `getTreeNodesStates(actor, specializationId, tree)`
    - des `reasonCode` machine-readable pour les blocages et invalidités
- Les fichiers `lang/fr.json` et `lang/en.json` contiennent déjà les libellés de statut de résolution d'arbre (
  `available`, `unresolved`, `incomplete`) mais pas les libellés d'état de nœud.
- `tests/applications/specialization-tree-app.test.mjs` couvre déjà :
    - le choix de l'arbre courant ;
    - la construction de `renderNodes` ;
    - la construction de `renderConnections` ;
    - le rendu PIXI de base.
- Aucun test actuel ne vérifie que les états de nœud sont récupérés depuis `getTreeNodesStates()` ni qu'ils sont
  traduits en variantes visuelles spécifiques.

---

## 4. Décisions d'architecture

### 4.1. Source de vérité unique pour les états de nœud

**Problème** : comment déterminer si un nœud est `purchased`, `available`, `locked` ou `invalid` sans dupliquer la
logique métier dans l'application ?

**Options envisagées** :

- recalculer localement l'état selon la position, l'XP et les achats ;
- enrichir le ticket avec une nouvelle couche intermédiaire domaine ;
- consommer directement `getTreeNodesStates()`.

**Décision retenue** : utiliser exclusivement `getTreeNodesStates(actor, specializationId, tree)` comme source de vérité
pour les états de nœud.

**Justification** :

- respecte explicitement l'acceptance criterion de `#234` ;
- évite toute divergence entre UI, achat et règles métier ;
- garde l'application dans un rôle de consommation, conforme à ADR-0001.

### 4.2. Variantes visuelles définies par constantes applicatives PIXI

**Problème** : comment rendre les états visibles et maintenables sans disperser les couleurs et opacités dans le code de
dessin ?

**Options envisagées** :

- coder les couleurs inline dans `#drawTree` ;
- ajouter des styles CSS/LESS, malgré un rendu principalement PIXI ;
- centraliser les variantes de rendu dans des constantes applicatives du module.

**Décision retenue** : définir un mapping constant `state -> variant` dans
`module/applications/specialization-tree-app.mjs`.

**Justification** :

- cohérent avec un rendu PIXI piloté en JavaScript ;
- facilite la lecture, les tests et les évolutions futures ;
- limite le changement au module applicatif déjà responsable du dessin.

### 4.3. Le view-model doit porter l'état et sa variante, pas seulement la géométrie

**Problème** : le code de rendu actuel consomme surtout des coordonnées et libellés. Il manque les métadonnées d'état
nécessaires au style.

**Décision retenue** : enrichir chaque entrée `renderNode` avec :

- `nodeState`
- `nodeStateLabel`
- les propriétés visuelles dérivées de la variante retenue

**Justification** :

- isole le mapping domaine -> UI en amont du dessin ;
- rend le contrat de rendu testable sans assertions PIXI fragiles ;
- prépare naturellement `#235`, qui pourra réutiliser l'état déjà exposé.

### 4.4. Lecture seule stricte malgré l'affordance d'un nœud disponible

**Problème** : un nœud `available` doit sembler achetable, mais l'achat ne fait pas partie de cette US.

**Décision retenue** : autoriser une affordance visuelle plus active pour `available`, mais ne brancher aucun
comportement d'achat ni de sélection durable.

**Justification** :

- respecte le scope de `#234` ;
- permet de distinguer clairement les états sans anticiper US18 ;
- évite une interaction partiellement implémentée.

### 4.5. Les libellés d'état passent par l'i18n projet

**Problème** : les noms d'état visibles par l'utilisateur ne doivent pas être hardcodés.

**Décision retenue** : ajouter des clés dédiées dans `lang/fr.json` et `lang/en.json` pour les états de nœud.

**Justification** :

- conforme à ADR-0005 ;
- assure la cohérence FR/EN ;
- permet de réutiliser ces libellés ailleurs dans l'application ou dans les tests.

### 4.6. Les tests portent sur le contrat de mapping, pas sur le pixel-perfect

**Décision retenue** : tester le view-model enrichi, le mapping `state -> variant`, la localisation des libellés, et
l'absence de comportement d'achat, sans snapshots graphiques PIXI.

**Justification** :

- conforme à ADR-0004 et ADR-0012 ;
- réduit fortement la fragilité de la suite ;
- cible le vrai contrat métier de cette sous-issue.

### 4.7. Direction visuelle : lisibilité immersive, pas neutralité abstraite

**Problème** : les variantes d’état doivent être immédiatement compréhensibles, mais le rendu ne doit pas paraître générique ou hors thème.

**Décision retenue** : les variantes visuelles sont définies selon une direction artistique légère, compatible avec Star Wars et avec le ton du système :
- interface tactique / holo-affichage ;
- palette sobre et crédible ;
- contraste suffisant entre états ;
- rendu non cartoon, non fantasy, non “UI web générique” ;
- priorité absolue à la lisibilité en jeu.

**Justification** :
- renforce l’immersion ;
- donne une identité propre à la vue graphique ;
- prépare les futures US sans imposer une refonte visuelle globale.
- 
---

## 5. Plan de travail détaillé

### Étape 1 — Intégrer les états de nœud dans le contexte de rendu

**Quoi faire** : faire évoluer `buildSpecializationTreeContext(actor)` pour calculer les états des nœuds de l'arbre
courant via `getTreeNodesStates()` et enrichir `renderNodes` avec ces informations.

Chaque nœud rendu doit au minimum exposer :

- son `nodeId`
- son `talentName`
- son `xpCost`
- sa position logique et graphique
- son `nodeState`
- son `nodeStateLabel`

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- confusion entre état d'arbre `available` et état de nœud `available` ;
- oubli du `specializationId` correct lors de l'appel à `getTreeNodesStates()`.

### Étape 2 — Définir le mapping des variantes visuelles

**Quoi faire** : introduire des constantes de rendu décrivant, pour chaque état de nœud, les propriétés visuelles
utilisées par PIXI.

Le contrat à figer :

- `purchased` : visuellement acquis, stable et non ambigu ;
- `available` : visuellement actif/accessible ;
- `locked` : visuellement bloqué ;
- `invalid` : visuellement incohérent/erreur de données.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- contraste insuffisant entre deux états ;
- variantes définies implicitement dans plusieurs zones du code.

### Étape 3 — Appliquer les variantes au dessin PIXI des nœuds

**Quoi faire** : adapter `#drawTree` pour que le fond, la bordure, l'opacité et le texte du nœud dépendent de la
variante associée à son état.

Le dessin doit rester :

- déterministe ;
- robuste quand l'arbre est vide ;
- strictement en lecture seule.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- régression sur le rendu neutre existant ;
- mélange entre code de style et code métier si le mapping n'est pas préparé dans le contexte.

### Étape 4 — Ajouter les libellés i18n des états de nœud

**Quoi faire** : ajouter les clés FR/EN pour les quatre états métier de nœud et les utiliser dans l'application.

À prévoir :

- `PURCHASED`
- `AVAILABLE`
- `LOCKED`
- `INVALID`

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- désynchronisation FR/EN ;
- formulation trop technique ou trop proche des identifiants internes.

### Étape 5 — Étendre les tests de contrat

**Quoi faire** : enrichir `tests/applications/specialization-tree-app.test.mjs` pour couvrir :

- l'utilisation effective de `getTreeNodesStates()` dans la construction du contexte ;
- la présence de l'état métier dans `renderNodes` ;
- le mapping `purchased` / `available` / `locked` / `invalid` vers une variante UI dédiée ;
- la présence des libellés localisés d'état ;
- l'absence de comportement d'achat déclenché par le rendu.

Les assertions doivent privilégier des contrats ciblés et lisibles.

**Fichiers** :

- `tests/applications/specialization-tree-app.test.mjs`

**Risques spécifiques** :

- tests trop couplés à la structure exacte des objets PIXI ;
- assertions trop larges, contraires à ADR-0012.

---

## 6. Fichiers modifiés

| Fichier                                               | Action       | Description du changement                                                                                            |
|-------------------------------------------------------|--------------|----------------------------------------------------------------------------------------------------------------------|
| `module/applications/specialization-tree-app.mjs`     | modification | Intégrer `getTreeNodesStates()`, enrichir `renderNodes` avec l'état métier et appliquer les variantes visuelles PIXI |
| `lang/fr.json`                                        | modification | Ajouter les libellés FR des états de nœud                                                                            |
| `lang/en.json`                                        | modification | Ajouter les libellés EN des états de nœud                                                                            |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir le mapping état métier -> variante UI et la localisation des libellés                                        |

Aucune modification n'est prévue sur :

- `templates/applications/specialization-tree-app.hbs`
- `styles/applications.less`

Le rendu est déjà principalement assuré par PIXI, et le ticket `#234` ne demande pas d'ajout de structure DOM.

---

## 7. Risques

| Risque                                                                              | Impact                                      | Mitigation                                                                                         |
|-------------------------------------------------------------------------------------|---------------------------------------------|----------------------------------------------------------------------------------------------------|
| L'application recalcule localement l'état au lieu d'utiliser `getTreeNodesStates()` | divergence entre UI et métier               | imposer `getTreeNodesStates()` comme unique source de vérité dans le plan et dans les tests        |
| Deux états restent visuellement trop proches                                        | critère d'acceptation non atteint           | définir des variantes explicites sur plusieurs dimensions : fond, bordure, opacité, texte          |
| Confusion entre statut d'arbre et état de nœud                                      | erreurs de mapping ou faux positifs en test | nommer explicitement les champs `resolvedTreeStatus` vs `nodeState` dans le plan et les assertions |
| Les tests deviennent fragiles car trop liés à PIXI                                  | maintenance coûteuse                        | tester le view-model et le mapping des variantes plutôt que l'ordre exact des appels graphiques    |
| Le rendu "available" suggère un achat fonctionnel                                   | régression de périmètre                     | ne brancher aucun handler d'achat ni mutation d'état applicatif                                    |
| Les traductions FR/EN divergent                                                     | UX incohérente selon la langue              | ajouter les clés en paire et les valider ensemble dans les tests modifiés                          |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): map node states into specialization tree render model`
2. `feat(talent-tree): apply pixi visual variants for specialization tree node states`
3. `feat(i18n): add localized labels for specialization tree node states`
4. `test(talent-tree): cover node state to visual variant mapping`

---

## 9. Dépendances avec les autres US

- Dépend de `#233`, qui livre l'arbre courant, les nœuds positionnés et les connexions.
- Dépend indirectement de US15 (`#199`), qui a introduit l'application graphique dédiée et le viewport PIXI autonome.
- Repose sur US4 (`#188`) et US5 (`#189`) pour disposer de la résolution d'arbres et des états métier de nœud.
- Prépare `#235`, qui ajoutera les raisons utilisateur localisées et le détail de consultation des nœuds.
- Prépare US18, en distinguant déjà visuellement les nœuds achetables sans déclencher d'achat.
