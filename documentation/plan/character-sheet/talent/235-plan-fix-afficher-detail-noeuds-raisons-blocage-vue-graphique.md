# Plan d'implémentation — #235 : Afficher le détail des nœuds et les raisons de blocage (US16)

**Issue** : [#235 — Afficher le détail des nœuds et les raisons de blocage (US16)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/235)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge — modèle, onglet talents et arbres de spécialisation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**Issue parente** : [#200 — US16: Afficher arbres, nœuds et connexions dans la vue graphique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/200)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (modification), `templates/applications/specialization-tree-app.hbs` (modification), `styles/applications.less` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/specialization-tree-app.test.mjs` (modification)

---

## 1. Objectif

Compléter la vue graphique des arbres de spécialisation pour qu'un utilisateur puisse consulter, au clic sur un nœud, les informations minimales utiles sans déclencher d'achat ni introduire d'état applicatif persistant.

Le résultat attendu est une consultation en lecture seule du nœud courant avec :
- nom du talent ;
- coût XP ;
- indication ranked / non-ranked si disponible ;
- état du nœud ;
- raison localisée compréhensible si le nœud est `locked` ou `invalid`.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Ajouter au view-model de rendu les métadonnées de détail nécessaires à l'affichage du nœud consulté.
- Introduire un mapping applicatif `reasonCode -> clé i18n`.
- Afficher un tooltip DOM léger au clic sur un nœud du viewport.
- Exposer un fallback compréhensible pour les cas invalides ou incomplets.
- Ajouter les clés i18n FR/EN des raisons utilisateur.
- Étendre les tests du contrat de rendu et du mapping des raisons.

### Exclu de cette US / ce ticket

- Achat de nœud depuis la vue -> US18.
- Sélection persistée d'un nœud ou d'une spécialisation -> hors périmètre de `#235`.
- Panneau latéral interactif ou état UI durable.
- Recalcul des règles métier de verrouillage côté UI.
- Modification de `actor.system`, `actor.flags` ou du data model.
- Refonte du moteur PIXI ou du resolver d'arbres.

---

## 3. Constat sur l'existant

- `module/applications/specialization-tree-app.mjs` calcule déjà :
  - les spécialisations possédées ;
  - le dernier arbre `available` affiché par défaut ;
  - les `renderNodes` et `renderConnections` ;
  - les variantes visuelles de nœud ;
  - le label localisé de `nodeState`.
- Le rendu PIXI dessine déjà les connexions, les cartes de nœud, le nom du talent et le coût XP.
- Aucune interaction de consultation n'existe encore dans le viewport :
  - pas de hit area explicite ;
  - pas de tooltip ;
  - pas de détail synchronisé au clic.
- `module/lib/talent-node/talent-node-state.mjs` expose déjà les `reasonCode` métier utiles :
  - `already-purchased`
  - `specialization-not-owned`
  - `tree-not-found`
  - `tree-incomplete`
  - `node-not-found`
  - `node-invalid`
  - `node-locked`
  - `not-enough-xp`
- La couche application n'exploite aujourd'hui ni `reasonCode` ni `details`.
- Les fichiers `lang/fr.json` et `lang/en.json` contiennent déjà les clés de statut de l'application graphique, mais pas encore les libellés détaillés des raisons de blocage.
- Les tests `tests/applications/specialization-tree-app.test.mjs` couvrent déjà :
  - le contexte vide ;
  - le choix du dernier arbre disponible ;
  - la construction des nœuds et connexions ;
  - les variantes d'état ;
  - l'absence de comportement d'achat pendant le rendu.
- L'issue `#234` bloquante est fermée : les variantes visuelles sont donc déjà livrées et `#235` peut se concentrer sur le détail consultatif.

---

## 4. Décisions d'architecture

### 4.1. Détail minimal via tooltip DOM léger

**Problème** : il faut afficher un détail compréhensible sans introduire de panneau complexe ni d'état applicatif persistant.

**Options envisagées** :
- panneau latéral interactif ;
- libellé DOM adjacent permanent ;
- tooltip DOM léger synchronisé au nœud.

**Décision retenue** : utiliser un tooltip DOM léger affiché au clic sur un nœud.

**Justification** :
- respecte explicitement le cadrage de `#235` ;
- reste léger dans une application `ApplicationV2` conforme à ADR-0001 ;
- évite de transformer la consultation en navigation secondaire.

### 4.2. Clic uniquement comme contrat principal

**Problème** : l'issue mentionne "survol ou clic", mais il faut un contrat de test clair et stable.

**Options envisagées** :
- survol ;
- survol + clic ;
- clic uniquement.

**Décision retenue** : considérer le clic comme contrat principal de l'US.

**Justification** :
- plus explicite pour un canvas PIXI ;
- réduit l'ambiguïté de timing et d'accessibilité du survol ;
- simplifie les tests applicatifs sans figer un comportement hover fragile.

### 4.3. Mapping des raisons dans la couche application

**Problème** : `reasonCode` est exploitable techniquement mais pas affichable tel quel à l'utilisateur.

**Décision retenue** : faire le mapping `reasonCode -> clé i18n` dans `specialization-tree-app.mjs`.

**Justification** :
- conforme à ADR-0005 ;
- préserve la pureté de la couche domaine ;
- permet d'améliorer le wording sans toucher au moteur métier.

### 4.4. Réutiliser `getTreeNodesStates()` comme source unique

**Problème** : l'UI ne doit pas re-déduire localement les raisons ou les états.

**Décision retenue** : enrichir le view-model à partir des résultats existants de `getTreeNodesStates()`.

**Justification** :
- une seule source de vérité ;
- pas de divergence entre achat futur, affichage et tests ;
- cohérent avec le découpage des responsabilités déjà en place.

### 4.5. Pas d'état persistant dans l'application ni dans l'acteur

**Décision** : le tooltip est purement consultatif et volatil.

**Justification** :
- conforme au périmètre de l'issue ;
- évite tout débordement vers US17/US18 ;
- ne nécessite ni `flags` ni extension du modèle système.

---

## 5. Plan de travail détaillé

### Étape 1 — Enrichir le view-model de rendu des nœuds

**Quoi faire** :
- compléter `renderNodes` avec les données de détail consultatif :
  - `nodeState`
  - `nodeStateLabel`
  - `reasonCode`
  - `reasonLabel`
  - indicateur ranked / non-ranked si résoluble
  - identifiant stable exploitable pour le clic

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- dupliquer la logique métier existante ;
- ne pas prévoir de fallback clair pour un talent introuvable ou un nœud invalide.

### Étape 2 — Introduire le mapping `reasonCode -> i18n`

**Quoi faire** :
- définir la table de mapping applicative des raisons métier ;
- prévoir des fallbacks localisés pour les cas non attendus ;
- reformuler les raisons techniques en texte utilisateur.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :
- désynchronisation FR/EN ;
- exposition d'un texte trop technique si une raison n'est pas mappée proprement.

### Étape 3 — Ajouter la structure DOM du tooltip

**Quoi faire** :
- enrichir le template de l'application avec une zone DOM dédiée au tooltip ;
- prévoir un conteneur compatible avec un affichage conditionnel, sans panneau latéral ;
- garder la structure simple et découplée du canvas.

**Fichiers** :
- `templates/applications/specialization-tree-app.hbs`

**Risques spécifiques** :
- couplage trop fort entre structure DOM et géométrie PIXI ;
- glissement vers une UI persistante plus lourde que nécessaire.

### Étape 4 — Brancher l'interaction clic dans le rendu PIXI

**Quoi faire** :
- rendre les nœuds cliquables ;
- associer chaque clic à l'ouverture ou mise à jour du tooltip ;
- afficher les informations principales sans déclencher aucune action métier ;
- fermer ou remplacer le détail lorsqu'un autre nœud est cliqué ou lors d'un rerender.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- logique d'interaction trop mêlée au dessin ;
- comportement involontaire assimilable à une préparation d'achat.

### Étape 5 — Styliser le tooltip et préserver la lisibilité

**Quoi faire** :
- ajouter le style du tooltip léger ;
- garantir une lisibilité correcte sur desktop et mobile ;
- veiller à la cohérence visuelle avec les variantes d'état déjà livrées par `#234`.

**Fichiers** :
- `styles/applications.less`

**Risques spécifiques** :
- contraste insuffisant ;
- tooltip coupé ou mal positionné sur petits écrans.

### Étape 6 — Étendre les tests du contrat applicatif

**Quoi faire** :
- couvrir la présence des métadonnées de détail dans le contexte ;
- couvrir le mapping des `reasonCode` vers des labels localisés ;
- vérifier l'absence de déclenchement métier ;
- tester les cas principaux :
  - `locked` par XP insuffisants ;
  - `locked` par accessibilité ;
  - `invalid` pour arbre incomplet ;
  - `invalid` pour talent ou nœud introuvable ;
  - fallback localisé.

**Fichiers** :
- `tests/applications/specialization-tree-app.test.mjs`

**Risques spécifiques** :
- tests trop couplés à PIXI au lieu du contrat ;
- assertions trop larges, contraires à ADR-0012.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Enrichir le view-model, mapper `reasonCode`, gérer le clic sur nœud et synchroniser le tooltip |
| `templates/applications/specialization-tree-app.hbs` | modification | Ajouter la structure DOM légère du détail consultatif |
| `styles/applications.less` | modification | Styliser le tooltip et ses variantes de lisibilité |
| `lang/fr.json` | modification | Ajouter les labels FR des raisons de blocage et du détail de nœud |
| `lang/en.json` | modification | Ajouter les labels EN correspondants |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir le contrat de détail, le mapping i18n et l'absence d'achat |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le tooltip introduit une pseudo-sélection persistante | dérive fonctionnelle hors scope | limiter l'état à une consultation volatile réinitialisée au rerender |
| Le mapping UI diverge des `reasonCode` domaine | incohérences visibles utilisateur | centraliser le mapping dans un seul objet applicatif et le couvrir par tests |
| Le clic sur nœud prépare involontairement US18 | confusion fonctionnelle | séparer strictement consultation et achat, sans appel métier |
| Les raisons invalides restent trop techniques | UX pauvre | reformuler en i18n utilisateur et prévoir un fallback lisible |
| Le rendu/tests deviennent fragiles à cause de PIXI | maintenance coûteuse | tester le view-model et la logique de mapping plutôt que des détails graphiques |
| Le tooltip est mal positionné ou peu lisible sur mobile | régression UX | prévoir un style responsive simple et des limites de largeur |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): expose node detail metadata for graphical tree view`
2. `feat(talent-tree): map node lock reasons to localized labels`
3. `feat(talent-tree): show readonly node details on click`
4. `test(talent-tree): cover localized node detail reasons`

---

## 9. Dépendances avec les autres US

- Dépend de `#200` pour le périmètre global US16.
- Dépend fonctionnellement du travail déjà livré par `#234`, désormais fermé, pour les variantes visuelles de nœud.
- Repose sur `module/lib/talent-node/talent-node-state.mjs` pour les états et `reasonCode`.
- Prépare US18 sans l'anticiper : les nœuds deviennent consultables mais pas achetables.
