# Plan d'implémentation — US15 : Créer l'application graphique dédiée aux arbres

**Issue** : [#199 — US15: Créer l'application graphique dédiée aux arbres](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/199)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (création), `module/applications/_module.mjs` (modification), `swerpg.mjs` (modification), `module/documents/actor.mjs` (modification), `module/documents/actor-mixins/talents.mjs` (modification potentielle), `templates/applications/specialization-tree-app.hbs` (création), `styles/applications.less` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/specialization-tree-app.test.mjs` (création), `tests/unit/documents/actor-talents-mixin.test.mjs` (modification potentielle)

---

## 1. Objectif

Créer une application Foundry dédiée pour héberger la future vue graphique des arbres de spécialisation, indépendante du canvas de scène et branchée sur la couche domaine talents déjà introduite par les US précédentes.

US15 livre la coque applicative et le viewport graphique isolé : l'application s'ouvre et se ferme proprement, reçoit l'acteur courant, prépare un conteneur PIXI autonome et expose un contrat public de rafraîchissement. Le rendu fonctionnel des arbres, des nœuds et des connexions reste hors de cette US et sera traité en US16.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Créer une application dédiée basée sur `ApplicationV2` + `HandlebarsApplicationMixin`.
- Héberger un viewport graphique indépendant du canvas de scène Foundry.
- Permettre l'ouverture/fermeture standard Foundry via le bridge déjà consommé par la fiche personnage (`actor.openSpecializationTreeApp()`).
- Recevoir l'acteur courant et préparer le contexte minimal nécessaire à la future vue graphique.
- Brancher l'application sur la couche domaine existante pour lire les spécialisations possédées et l'état de résolution des arbres, sans recalcul métier local.
- Exposer un contrat public minimal `open(actor, options)`, `close()`, `refresh()` et une propriété `actor`.
- Ajouter le template applicatif, le style dédié et les clés i18n visibles par l'utilisateur.
- Ajouter des tests ciblés sur le cycle de vie, le bridge et l'indépendance vis-à-vis du canvas.

### Exclu de cette US / ce ticket

- Rendu métier des nœuds, connexions, coûts et états visuels détaillés -> US16 (#200).
- Sélection de la spécialisation courante -> US17 (#201).
- Achat d'un nœud depuis la vue -> US18 (#202).
- Synchronisation post-achat complète entre vue graphique et onglet Talents -> US19 (#203).
- Neutralisation ou suppression du legacy `module/canvas/talent-tree.mjs` -> US21.
- Réintroduction de la `choice wheel` ou de toute logique Crucible comme mécanisme métier.
- Dépendance au `canvas` de scène ou au `scene manager`.
- Persistance d'un état UI de navigation dans `actor.system` ou `actor.flags`.

---

## 3. Constat sur l'existant

- `module/applications/sheets/character-sheet.mjs:205-206` ouvre déjà la vue via `this.actor.openSpecializationTreeApp()`.
- `module/documents/actor-mixins/talents.mjs:37-56` contient déjà un bridge transitoire qui préfère `game.system.specializationTreeApp` puis retombe sur `game.system.tree`.
- `swerpg.mjs:333-338` instancie encore le legacy `game.system.tree = new SwerpgTalentTree()`.
- `swerpg.mjs:373-375` dépend du hook `canvasReady` pour rouvrir la vue legacy, ce qui est contraire à l'objectif d'indépendance vis-à-vis du canvas.
- `module/documents/actor.mjs:597-620` rafraîchit encore explicitement `game.system.tree` lors des updates acteur et embedded documents.
- Le codebase possède déjà une couche domaine talents réutilisable :
  - `module/lib/talent-node/talent-tree-resolver.mjs` pour résoudre spécialisation -> arbre.
  - `module/lib/talent-node/talent-node-state.mjs` pour les états de nœud.
  - `module/lib/talent-node/talent-node-purchase.mjs` pour l'achat domaine.
  - `module/lib/talent-node/owned-talent-summary.mjs` pour la vue consolidée.
- Il n'existe pas encore de classe d'application dédiée pour la vue graphique des arbres.
- Il n'existe pas encore de template `templates/applications/...` ni de tests spécifiques pour cette application.
- L'ancien `module/canvas/talent-tree.mjs` est fortement couplé à `PIXI`, `document.body`, `canvas.hud` et au cycle de vie du canvas Foundry. Il peut servir de référence technique ponctuelle pour le viewport et le pan/zoom, mais pas de base fonctionnelle.

---

## 4. Décisions d'architecture

### 4.1. Application autonome `ApplicationV2`, pas `DocumentSheetV2`

**Décision** : créer une application autonome basée sur `foundry.applications.api.ApplicationV2` avec `HandlebarsApplicationMixin`, et non une `DocumentSheetV2`.

Justification :

- la vue n'édite pas directement un document unique ;
- elle consomme un acteur comme contexte, mais son rôle principal est une visualisation dédiée ;
- cela évite de faire croire qu'il s'agit d'une sheet d'Actor ou d'Item ;
- c'est le meilleur alignement avec ADR-0001 pour une nouvelle UI moderne.

### 4.2. Conserver un bridge public singleton `game.system.specializationTreeApp`

**Décision** : exposer une instance applicative unique sur `game.system.specializationTreeApp`, consommée par le bridge acteur déjà présent.

Justification :

- le contrat est déjà anticipé dans `TalentsMixin` ;
- cela limite les changements de surface côté feuille personnage ;
- le système garde un point d'entrée public simple : `open`, `close`, `refresh`, `actor`;
- cela évite d'introduire un second mécanisme d'ouverture concurrent.

### 4.3. Monter un viewport PIXI dédié, mais sans rendu métier complet

**Décision** : US15 livre un conteneur graphique autonome avec montage PIXI dans l'application, sans encore dessiner les arbres/nœuds/connexions métier.

Justification :

- conforme au choix retenu pour "base de rendu graphique" ;
- permet de sécuriser tôt le cycle de vie technique PIXI hors canvas ;
- évite d'empiéter sur US16, qui doit porter le vrai rendu métier ;
- réduit le risque de mélanger infrastructure UI et logique de visualisation.

### 4.4. L'application lit la couche domaine, elle ne la remplace pas

**Décision** : l'application prépare son contexte à partir des helpers domaine existants, sans recalcul local des règles d'achat, d'accessibilité ou de consolidation.

Justification :

- conforme au cadrage `05-ui-arbres-specialisation.md` ;
- respecte la séparation domaine / adapter Foundry ;
- évite de dupliquer dans l'UI les règles déjà codées dans `module/lib/talent-node/*`.

### 4.5. Remplacer le point d'entrée V1 sans supprimer encore le legacy

**Décision** : l'application dédiée devient le point d'entrée privilégié du flux V1, mais le nettoyage/suppression du canvas legacy n'est pas inclus dans US15.

Justification :

- l'issue demande le remplacement fonctionnel, pas encore le nettoyage complet ;
- US21 est explicitement prévu pour neutraliser les anciennes logiques ;
- cela garde US15 focalisée sur l'introduction de la nouvelle coque sans ouvrir un chantier de décommission large.

### 4.6. Le rafraîchissement doit être piloté par l'acteur, pas par `canvasReady`

**Décision** : l'application dédiée doit se rafraîchir via son API publique lors des mises à jour de l'acteur et de ses embedded documents ; elle ne doit pas dépendre du hook `canvasReady`.

Justification :

- l'AC impose l'indépendance vis-à-vis du canvas ;
- `canvasReady` est un symptôme du flux legacy à éliminer du chemin V1 ;
- le bon événement source est la vie du document acteur, pas celle de la scène.

### 4.7. Pas d'état métier persistant dans cette US

**Décision** : l'application ne persiste ni spécialisation courante, ni état de navigation, ni achat pending dans `system` ou `flags`.

Justification :

- la sélection courante est explicitement un état UI pour US17 ;
- évite d'introduire une source de vérité parasite ;
- garde US15 centrée sur l'infrastructure applicative.

---

## 5. Plan de travail détaillé

### Étape 1 — Créer la classe d'application dédiée

**Quoi faire** : créer une classe applicative dédiée, par exemple `SpecializationTreeApp`, sous `module/applications/`, avec :

- `DEFAULT_OPTIONS` conformes aux applications V2 du projet ;
- état interne minimal (`actor`, `pixiApp`, `viewportReady`, etc.) ;
- méthodes publiques `open(actor, options)`, `refresh()`, `close()` ;
- `_prepareContext()` branché sur l'acteur courant et la résolution domaine ;
- hooks de rendu et de destruction pour gérer proprement le montage/démontage du viewport PIXI.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`
- `module/applications/_module.mjs`

**Risques spécifiques** :

- classe trop proche d'une sheet document alors que le besoin est une application autonome ;
- fuite mémoire si le viewport PIXI n'est pas démonté proprement à la fermeture.

### Étape 2 — Créer le template applicatif et le contexte initial

**Quoi faire** : créer un template dédié qui expose :

- un header avec le nom de l'acteur et un titre localisé ;
- une zone de viewport graphique ;
- un état vide / indisponible quand aucun acteur n'est fourni ou quand aucune spécialisation résolue n'est exploitable ;
- une structure DOM stable pour accueillir US16 et US17.

Le contexte doit au minimum fournir :

- l'acteur courant ;
- les spécialisations possédées ;
- le résultat de résolution des arbres ;
- des booléens d'état (`hasActor`, `hasSpecializations`, `hasResolvedTrees`, etc.).

**Fichiers** :

- `templates/applications/specialization-tree-app.hbs`
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :

- template trop riche qui embarque déjà la logique d'US16 ;
- texte hardcodé au lieu de l'i18n projet.

### Étape 3 — Monter le viewport PIXI indépendant du canvas

**Quoi faire** : ajouter dans l'application le montage d'une instance PIXI dédiée dans un conteneur DOM interne à la fenêtre, sans accès à `canvas`, `canvas.hud` ni au cycle de vie de la scène.

Le montage doit être limité à :

- création ;
- resize de base ;
- destruction propre ;
- réinitialisation si l'acteur change ou si la fenêtre est rouverte.

**Fichiers** :

- `module/applications/specialization-tree-app.mjs`
- `templates/applications/specialization-tree-app.hbs`

**Risques spécifiques** :

- réutilisation accidentelle de patterns legacy dépendants de `document.body` ou `canvas` ;
- code PIXI trop avancé qui déporte US16 dans US15.

### Étape 4 — Enregistrer l'application dans le système

**Quoi faire** : instancier l'application au bootstrap système et l'exposer sur `game.system.specializationTreeApp`, en conservant un contrat stable pour le bridge acteur.

Le plan doit aussi retirer du chemin V1 toute réouverture dépendante de `canvasReady` pour cette nouvelle application.

**Fichiers** :

- `swerpg.mjs`
- `module/applications/_module.mjs`

**Risques spécifiques** :

- coexistence mal contrôlée entre `game.system.tree` et `game.system.specializationTreeApp` ;
- ordre d'initialisation incorrect si l'application est exposée avant disponibilité des dépendances Foundry.

### Étape 5 — Aligner le rafraîchissement document sur la nouvelle application

**Quoi faire** : faire évoluer les points de rafraîchissement acteur pour appeler l'application dédiée quand elle est ouverte pour l'acteur courant, au lieu de ne cibler que `game.system.tree`.

Cela concerne :

- update acteur ;
- création d'embedded documents ;
- suppression d'embedded documents ;
- fermeture de sheet déjà couverte par `closeSpecializationTreeApp()` si le contrat reste inchangé.

**Fichiers** :

- `module/documents/actor.mjs`
- `module/documents/actor-mixins/talents.mjs` si ajustement du bridge nécessaire

**Risques spécifiques** :

- double rafraîchissement legacy + dedicated ;
- oubli d'un point d'entrée de refresh qui crée une UI incohérente.

### Étape 6 — Styliser l'application dédiée

**Quoi faire** : ajouter les styles nécessaires dans `styles/applications.less` pour :

- la fenêtre applicative ;
- la zone viewport ;
- les états vides ;
- le responsive minimal desktop/mobile.

**Fichiers** :

- `styles/applications.less`

**Risques spécifiques** :

- viewport non redimensionnable ;
- régression visuelle sur petits écrans ;
- style couplé au markup d'US16 au lieu de rester générique.

### Étape 7 — Ajouter l'i18n dédiée

**Quoi faire** : introduire les clés FR/EN nécessaires pour :

- le titre de l'application ;
- le sous-titre éventuel ;
- les états vides ou indisponibles ;
- les messages de fallback visibles.

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- divergence entre les libellés du bouton d'US14 et ceux de la nouvelle fenêtre ;
- duplication de clés proches.

### Étape 8 — Ajouter les tests ciblés

**Quoi faire** : créer des tests pour valider :

- l'existence et l'initialisation de l'application ;
- l'ouverture avec acteur courant ;
- l'absence de dépendance au canvas de scène ;
- le contrat de `refresh()` quand l'acteur courant change ;
- le comportement du bridge acteur vers l'application dédiée ;
- le rendu d'un état vide en absence de données exploitables.

**Fichiers** :

- `tests/applications/specialization-tree-app.test.mjs`
- `tests/unit/documents/actor-talents-mixin.test.mjs`

**Risques spécifiques** :

- tests trop couplés à PIXI réel ;
- mocks Foundry/canvas trop lourds et fragiles ;
- assertions sur le rendu métier qui appartient à US16.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | création | Nouvelle application V2 dédiée aux arbres avec acteur courant, viewport PIXI et API `open/refresh/close` |
| `module/applications/_module.mjs` | modification | Exporter l'application dédiée |
| `templates/applications/specialization-tree-app.hbs` | création | Template de la fenêtre graphique dédiée |
| `swerpg.mjs` | modification | Instancier et exposer `game.system.specializationTreeApp`, retirer la dépendance V1 au `canvasReady` pour cette vue |
| `module/documents/actor.mjs` | modification | Rediriger le refresh de la vue ouverte vers l'application dédiée |
| `module/documents/actor-mixins/talents.mjs` | modification potentielle | Ajuster le bridge si le contrat public doit être clarifié |
| `styles/applications.less` | modification | Styles de la fenêtre et du viewport dédié |
| `lang/fr.json` | modification | Libellés FR de l'application |
| `lang/en.json` | modification | Libellés EN de l'application |
| `tests/applications/specialization-tree-app.test.mjs` | création | Tests de cycle de vie et d'indépendance au canvas |
| `tests/unit/documents/actor-talents-mixin.test.mjs` | modification potentielle | Tests du bridge acteur vers l'application dédiée |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Le viewport PIXI fuit en mémoire ou garde des listeners après fermeture | instabilité UI, re-render dégradé | imposer dans le plan des hooks explicites de mount/unmount/destroy et des tests de fermeture |
| Le nouveau flux conserve une dépendance cachée à `canvas` | non-respect de l'AC principal | interdire dans US15 tout appel à `canvas`, `canvas.hud`, `canvasReady` dans le chemin de la nouvelle application |
| US15 dérive vers le rendu métier d'US16 | périmètre flou, rework | limiter US15 à la coque, au contexte et au viewport technique |
| Le refresh reste câblé uniquement au legacy `game.system.tree` | application dédiée obsolète ou incohérente | faire une revue systématique des points de refresh dans `actor.mjs` et le bridge acteur |
| Coexistence legacy/dedicated mal contrôlée | doubles ouvertures, comportement incohérent | faire de `game.system.specializationTreeApp` le point d'entrée prioritaire et ne pas supprimer le legacy dans cette US |
| Tests trop fragiles à cause de PIXI/Foundry mocks | faible valeur de non-régression | tester le contrat applicatif et le bridge, pas le rendu graphique détaillé |

---

## 8. Proposition d'ordre de commit

1. `feat(applications): add specialization tree application shell`
2. `feat(applications): mount dedicated pixi viewport for specialization tree app`
3. `refactor(actor): route specialization tree refresh to dedicated application`
4. `style(applications): add specialization tree application styling`
5. `test(applications): cover specialization tree app lifecycle and actor bridge`

---

## 9. Dépendances avec les autres US

- **#188 — US4 Résoudre spécialisation possédée -> arbre** : dépendance forte. US15 doit lire des arbres résolus via la couche domaine ; sans cela, l'application ne peut pas préparer un contexte fiable.
- **#189 — US5 Calculer l'état des nœuds** : dépendance fonctionnelle surtout pour US16, mais utile dès US15 pour stabiliser le contrat de lecture domaine attendu par la future vue.
- **#190 — US6 Implémenter l'achat d'un nœud** : dépendance d'intégration future. US15 ne doit pas acheter, mais doit laisser une couture claire vers l'API domaine qui sera consommée plus tard par US18.
- **#198 — US14 Accéder à la vue graphique depuis l'onglet Talents** : déjà alignée avec ce plan via le bridge acteur et le CTA de navigation.
- **#200 — US16 Afficher arbres, nœuds et connexions** : dépend directement de la coque livrée par US15.
- **#201 — US17 Sélectionner la spécialisation courante** : dépend de l'existence de l'application dédiée et de son contexte acteur.
- **#202 — US18 Acheter un nœud depuis la vue graphique** : dépend de l'application dédiée et de l'intégration future avec `purchaseTalentNode`.
- **#203 — US19 Synchroniser achat, arbre et onglet Talents** : dépend du mécanisme de refresh introduit ou clarifié par US15.
