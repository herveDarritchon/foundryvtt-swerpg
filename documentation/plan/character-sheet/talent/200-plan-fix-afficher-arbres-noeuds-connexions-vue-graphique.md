# Plan d'implémentation — US16 : Afficher arbres, nœuds et connexions dans la vue graphique

**Issue** : [#200 — US16: Afficher arbres, nœuds et connexions dans la vue graphique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/200)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (modification), `templates/applications/specialization-tree-app.hbs` (modification), `styles/applications.less` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/specialization-tree-app.test.mjs` (modification)

---

## 1. Objectif

Compléter l'application graphique dédiée livrée par US15 pour qu'elle affiche effectivement un arbre de spécialisation exploitable visuellement : nœuds positionnés, connexions visibles, libellés utiles au joueur et états graphiques sans ambiguïté.

Le résultat attendu pour cette US est une vue graphique de consultation d'un arbre résolu, indépendante du canvas de scène, branchée sur la couche domaine existante, mais encore sans sélection interactive de spécialisation courante ni achat de nœud. L'utilisateur doit pouvoir comprendre quel talent est à quel endroit, combien il coûte et pourquoi il est déjà acheté, disponible, verrouillé ou invalide.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Déterminer quel arbre afficher dans l'application dédiée quand plusieurs spécialisations possédées existent.
- Construire dans `SpecializationTreeApp` un modèle de rendu dérivé à partir de l'acteur, de la résolution d'arbre et des états de nœud.
- Afficher les nœuds selon leurs coordonnées d'arbre (`row`, `column`).
- Afficher les connexions entre nœuds à partir de `tree.system.connections`.
- Afficher au minimum pour chaque nœud : nom du talent, coût XP, indication ranked ou non-ranked si disponible.
- Distinguer visuellement les états `purchased`, `available`, `locked`, `invalid`.
- Afficher une raison compréhensible pour un nœud verrouillé ou invalide, sans déclencher d'achat.
- Étendre les clés i18n nécessaires aux statuts et raisons affichées dans l'application.
- Ajouter ou adapter les tests Vitest ciblant le contexte de rendu, le choix de l'arbre affiché et la traduction des états/raisons.

### Exclu de cette US / ce ticket

- Sélection interactive de la spécialisation courante -> US17 (#201).
- Achat d'un nœud depuis la vue -> US18 (#202).
- Synchronisation post-achat complète avec l'onglet Talents -> US19 (#203).
- Modification du data model `specialization-tree`.
- Réécriture de la couche domaine `talent-node-state` ou `talent-tree-resolver`.
- Réactivation du canvas legacy `module/canvas/talent-tree.mjs`.
- Persistance d'un état UI de navigation dans `actor.system` ou `actor.flags`.

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` existe déjà et fournit la coque `ApplicationV2`, le contexte de base, la sidebar des spécialisations résolues/non résolues et un viewport PIXI autonome.
- Le viewport actuel ne dessine encore aucun arbre métier : il crée seulement une `PIXI.Application` et attache son canvas au DOM.
- `buildSpecializationTreeContext(actor)` expose aujourd'hui une liste de spécialisations et des booléens d'état (`hasActor`, `hasSpecializations`, `hasResolvedTrees`), mais pas encore le détail d'un arbre affichable ni le calcul des nœuds à rendre.
- La couche domaine nécessaire à US16 est déjà présente :
- `module/lib/talent-node/talent-tree-resolver.mjs` résout les spécialisations possédées vers leurs arbres référentiels et distingue `available`, `unresolved`, `incomplete`.
- `module/lib/talent-node/talent-node-state.mjs` calcule les états `purchased`, `available`, `locked`, `invalid` et expose `reasonCode` + `details` pour les blocages.
- `module/models/specialization-tree.mjs` définit le schéma minimal attendu des nœuds (`nodeId`, `talentId`, `row`, `column`, `cost`) et des connexions (`from`, `to`, `type`).
- Les tests `tests/applications/specialization-tree-app.test.mjs` sécurisent déjà l'ouverture, le cycle de vie PIXI et le contexte vide, mais pas encore le rendu métier des nœuds ni la sélection implicite de l'arbre affiché.
- Le cadrage `05-ui-arbres-specialisation.md` impose que la vue soit branchée sur la couche domaine, n'utilise pas le canvas de scène et affiche des raisons compréhensibles pour les nœuds verrouillés ou invalides.
- Le découpage `07-plan-issues-github.md` sépare explicitement US16 (rendu) et US17 (sélection de spécialisation courante). US16 ne doit donc pas introduire un sélecteur interactif complet sous couvert de "choisir quel arbre afficher".

---

## 4. Décisions d'architecture

### 4.1. Afficher un seul arbre par défaut en US16

**Problème** : l'issue demande d'afficher l'arbre de spécialisation sélectionné, mais le sélecteur de spécialisation courante relève de US17.

**Options envisagées** :

- implémenter dès US16 une vraie sélection interactive ;
- ne rien afficher tant qu'aucune spécialisation n'est sélectionnée ;
- afficher par défaut un arbre déterministe sans introduire encore la sélection utilisateur.

**Décision retenue** : afficher par défaut le premier arbre résolu `available` de l'acteur courant, sans persistance d'état UI.

**Justification** :

- respecte le découpage officiel US16/US17 ;
- livre une vue métier visible dès cette US sans anticiper la navigation future ;
- garde un comportement déterministe et testable.

### 4.2. Construire un view-model dédié dans `SpecializationTreeApp`

**Problème** : l'application doit dessiner des nœuds, connexions et libellés sans recalculer les règles métier dans le code PIXI.

**Options envisagées** :

- calculer inline pendant le dessin PIXI ;
- ajouter un nouveau module domaine partagé ;
- construire dans l'application un modèle de rendu dérivé à partir des helpers domaine existants.

**Décision retenue** : enrichir `SpecializationTreeApp` avec un view-model de rendu dérivé du resolver et du moteur d'état de nœud.

**Justification** :

- l'UI reste consommatrice de la couche domaine, sans la dupliquer ;
- le changement reste local à l'application livrée en US15 ;
- facilite les tests unitaires du contexte de rendu sans dépendre du canvas réel.

### 4.3. Utiliser les coordonnées `row` / `column` comme base canonique de placement

**Problème** : comment positionner les nœuds sans recréer une géométrie implicite depuis les connexions ou depuis des coordonnées legacy ?

**Décision retenue** : dériver le placement graphique directement de `node.row` et `node.column` du data model `specialization-tree`.

**Justification** :

- conforme au schéma déjà adopté dans `module/models/specialization-tree.mjs` ;
- cohérent avec l'import OggDude qui alimente précisément ces champs ;
- évite tout couplage au canvas legacy ou à une heuristique fragile.

### 4.4. Les états visuels proviennent exclusivement de `getTreeNodesStates()`

**Problème** : l'UI doit distinguer `purchased`, `available`, `locked`, `invalid` sans re-déduire localement les prérequis ou l'XP.

**Décision retenue** : mapper directement les résultats de `getTreeNodesStates(actor, specializationId, tree)` vers des variantes de rendu UI.

**Justification** :

- la source de vérité métier reste unique ;
- les raisons machine-readable déjà établies par US5 restent réutilisables ;
- évite les divergences futures entre rendu, achat et tests.

### 4.5. Raisons utilisateur dérivées des `reasonCode`, pas de texte hardcodé

**Problème** : l'issue demande une raison compréhensible pour les nœuds verrouillés ou invalides.

**Options envisagées** :

- exposer seulement le `reasonCode` brut ;
- générer des phrases hardcodées dans l'application ;
- mapper les `reasonCode` vers des clés i18n dédiées.

**Décision retenue** : introduire un mapping `reasonCode -> clé i18n` côté application.

**Justification** :

- conforme à ADR-0005 ;
- garde la couche domaine pure et non localisée ;
- permet d'améliorer le wording sans toucher au moteur métier.

### 4.6. US16 reste en lecture seule malgré le caractère cliquable visuel de certains nœuds

**Problème** : un nœud `available` doit paraître actif, mais l'achat n'est pas dans le périmètre de cette US.

**Décision retenue** : autoriser des affordances visuelles de type "interactif" pour distinguer `available`, mais limiter l'interaction à la consultation du détail/raison tant que US18 n'est pas livrée.

**Justification** :

- respecte le périmètre de l'issue et le découpage du lot 5 ;
- évite d'introduire un achat incomplet ou semi-fonctionnel ;
- prépare l'extension vers US18 sans refonte du rendu.

### 4.7. Étendre les tests sur le contrat de rendu plutôt que sur le dessin PIXI pixel-perfect

**Décision** : tester le view-model, le choix de l'arbre affiché, les métadonnées de nœud, les statuts et les raisons localisées, sans figer des coordonnées de pixels exactes ni des snapshots graphiques.

**Justification** :

- conforme à ADR-0004 et ADR-0012 ;
- limite la fragilité des tests UI ;
- cible le vrai contrat métier de cette US.

---

## 5. Plan de travail détaillé

### Étape 1 — Déterminer l'arbre affiché par défaut

**Quoi faire** : faire évoluer la préparation de contexte de `SpecializationTreeApp` pour identifier un arbre "courant" déterministe en US16.

Le contrat à figer :

- si au moins un arbre est `available`, afficher le premier arbre `available` ;
- sinon conserver l'état vide déjà géré par US15 ;
- ne pas introduire de sélection persistée.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- dérive fonctionnelle vers US17 si la notion de sélection devient interactive ;
- comportement ambigu si plusieurs arbres sont disponibles et qu'aucune règle d'ordre n'est explicitée.

### Étape 2 — Construire le modèle de rendu de l'arbre courant

**Quoi faire** : enrichir le contexte applicatif avec un view-model décrivant l'arbre à afficher.

Ce modèle doit au minimum porter :

- l'identité de la spécialisation et de l'arbre ;
- la liste des nœuds normalisés ;
- leurs états (`purchased`, `available`, `locked`, `invalid`) ;
- le coût, le nom du talent, l'indication ranked / non-ranked si résoluble ;
- les raisons utilisateur pour `locked` et `invalid` ;
- la liste des connexions prêtes au rendu.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- dupliquer localement les règles de `talent-node-state` ;
- échouer silencieusement si un talent référencé par `talentId` n'est pas résolu.

### Étape 3 — Rendre les nœuds et les connexions dans le viewport PIXI

**Quoi faire** : compléter le cycle de rendu de l'application pour dessiner les connexions, puis les nœuds, dans le viewport PIXI déjà monté par US15.

Le rendu minimal doit couvrir :

- lignes ou flèches de connexion visibles entre `from` et `to` ;
- nœuds positionnés à partir de `row` / `column` ;
- nom du talent lisible ;
- coût XP visible sur ou près du nœud ;
- variante visuelle claire par état.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`
- `templates/applications/specialization-tree-app.hbs` si la structure DOM d'accueil doit être enrichie

**Risques spécifiques** :

- rendu trop couplé aux dimensions en pixels au lieu d'un placement relatif ;
- mélange entre dessin métier US16 et interaction d'achat US18.

### Étape 4 — Exposer le détail de consultation des nœuds

**Quoi faire** : permettre à l'utilisateur de consulter pourquoi un nœud est verrouillé ou invalide, et d'obtenir ses informations principales sans enclencher d'achat.

Formes acceptables en US16 :

- tooltip ;
- panneau de détail latéral ;
- popover applicatif léger.

Le détail doit au minimum couvrir :

- nom du talent ;
- coût XP ;
- ranked / non-ranked si connu ;
- raison utilisateur localisée pour `locked` / `invalid`.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`
- `templates/applications/specialization-tree-app.hbs`
- `styles/applications.less`

**Risques spécifiques** :

- dériver vers une UI d'achat complète ;
- raison trop technique si l'i18n reprend le `reasonCode` sans reformulation.

### Étape 5 — Compléter la localisation et les statuts visibles

**Quoi faire** : enrichir les traductions FR/EN pour les états et raisons visibles dans l'application.

À prévoir au minimum :

- libellés d'états de nœud ;
- raisons de verrouillage (`XP insuffisants`, `prérequis non remplis`) ;
- raisons d'invalidité (`arbre incomplet`, `nœud introuvable`, `talent introuvable`, etc.).

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- désynchronisation FR/EN ;
- wording trop proche du jargon technique interne.

### Étape 6 — Étendre les tests ciblés de l'application

**Quoi faire** : adapter la suite `tests/applications/specialization-tree-app.test.mjs` pour couvrir le contrat rendu par US16.

Cas à couvrir :

- choix du premier arbre `available` comme arbre affiché par défaut ;
- contexte vide si aucun arbre `available` ;
- présence des métadonnées minimales de nœud dans le contexte ;
- mapping des états domaine vers les variantes UI attendues ;
- mapping des `reasonCode` vers des messages localisés ;
- présence des connexions dans le modèle de rendu ;
- absence de dépendance au `canvas` de scène maintenue.

**Fichiers** :

- `tests/applications/specialization-tree-app.test.mjs`

**Risques spécifiques** :

- tests trop couplés à l'ordre exact des objets PIXI ;
- assertions trop larges et peu diagnostiques, contraires à ADR-0012.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Ajouter le choix de l'arbre courant, le view-model de rendu, le mapping états/raisons et le dessin des nœuds/connexions |
| `templates/applications/specialization-tree-app.hbs` | modification | Prévoir les zones DOM nécessaires au détail de nœud et à l'affichage du contexte de l'arbre courant |
| `styles/applications.less` | modification | Styliser les états visuels, le panneau de détail et la lisibilité générale de la vue graphique |
| `lang/fr.json` | modification | Ajouter les libellés FR des états et raisons de nœud |
| `lang/en.json` | modification | Ajouter les libellés EN correspondants |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir le contrat de rendu de l'arbre courant et des états de nœud |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| US16 implémente déjà la sélection de spécialisation | chevauchement fonctionnel avec US17 et rework | figer explicitement un seul arbre affiché par défaut, sans état utilisateur persistant |
| Le rendu recalcule localement les règles d'état | divergence entre UI, achat et tests | imposer `getTreeNodesStates()` comme unique source pour les états et raisons |
| Les talents référencés par `talentId` ne sont pas tous résolus | nœuds partiellement vides ou incompréhensibles | prévoir un fallback explicite "talent introuvable" et classer le nœud `invalid` si nécessaire |
| Les connexions existent mais sont mal placées | arbre visuellement trompeur | dériver le placement uniquement de `row` / `column` et tester la transformation en modèle de rendu |
| Les couleurs/variantes d'état ne sont pas assez contrastées | états ambigus, AC non tenus | définir des variantes visuelles distinctes + libellé/raison complémentaire |
| Les tests deviennent fragiles car trop liés à PIXI | maintenance coûteuse | tester le modèle de rendu et les contrats de contexte plutôt que le pixel-perfect |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): select default resolved tree for graphical view`
2. `feat(talent-tree): build render model for specialization tree nodes and links`
3. `feat(talent-tree): render node states and localized lock reasons`
4. `test(talent-tree): cover graphical tree render context contracts`

---

## 9. Dépendances avec les autres US

- Dépend de US15 (#199), déjà requise par l'issue, car le viewport applicatif et le bridge acteur sont la base technique du rendu.
- Repose sur US4 (#188), US5 (#189) et les plans associés à l'import/résolution d'arbres pour disposer d'arbres, connexions et états exploitables.
- Prépare US17 (#201) en fixant un contrat clair de "tree courant" sans encore introduire la sélection interactive.
- Prépare US18 (#202) en rendant visibles les nœuds `available`, leurs coûts et leurs raisons de blocage, sans encore déclencher l'achat.
- Sera complétée par US19 (#203) pour la synchronisation complète après achat.
