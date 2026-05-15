# Plan d'implémentation — US18 : Acheter un nœud depuis la vue graphique

**Issue** : [#202 — US18: Acheter un nœud depuis la vue graphique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/202)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`  
**Module(s) impacté(s)** : `module/applications/specialization-tree-app.mjs` (modification), `module/documents/actor.mjs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/specialization-tree-app.test.mjs` (modification), `tests/unit/documents/actor-specialization-tree-refresh.test.mjs` (création recommandée)

---

## 1. Objectif

Permettre l'achat d'un nœud de talent directement depuis la vue graphique des arbres de spécialisation, en déléguant la validation et la persistance à la couche domaine déjà en place.

Résultat attendu :
- un clic sur un nœud `available` déclenche `purchaseTalentNode(...)` ;
- un nœud `locked` ou `invalid` n'est jamais acheté ;
- l'utilisateur reçoit un retour clair en succès comme en échec ;
- après achat réussi, la vue graphique se rafraîchit immédiatement et reste synchronisée avec l'état acteur.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Brancher l'interaction d'achat dans `SpecializationTreeApp`.
- Réutiliser le domaine existant `purchaseTalentNode(actor, specializationId, nodeId)`.
- Distinguer les comportements au clic selon `nodeState` :
  - `available` → achat ;
  - `locked` → explication ;
  - `invalid` → erreur de données ;
  - `purchased` → détail du talent.
- Ajouter des messages utilisateur localisés pour :
  - achat réussi ;
  - XP insuffisants ;
  - prérequis non remplis ;
  - nœud invalide / arbre incomplet / spécialisation introuvable ;
  - talent non-ranked déjà possédé mais achetable pour la progression.
- Rafraîchir explicitement l'application après achat réussi.
- Élargir le refresh automatique côté `SwerpgActor._onUpdate()` pour couvrir les updates V1 pertinents (`talentPurchases`, `experience.spent`).
- Nettoyer le `console.table(...)` de debug résiduel dans `buildSpecializationTreeContext`.
- Étendre les tests applicatifs et de refresh.

### Exclu de cette US / ce ticket

- Refonte du domaine d'achat US6.
- Refonte de `talent-node-state.mjs`.
- Consolidation des talents possédés.
- Achat d'une nouvelle spécialisation.
- Refonte complète du tooltip consultatif livré par US16.
- Migration ou suppression globale du legacy canvas talents.
- Refonte des logs d'audit existants.

---

## 3. Constat sur l'existant

- **Domaine d'achat existant** : `module/lib/talent-node/talent-node-purchase.mjs` expose `purchaseTalentNode(actor, specializationId, nodeId)`. Il valide spécialisation, arbre, nœud, état, XP, persiste atomiquement et écrit l'audit de façon non bloquante.
- **Vue graphique existante** : `module/applications/specialization-tree-app.mjs` avec sélection de spécialisation, rendu PIXI, pan/zoom, tooltip consultatif. Les nœuds sont déjà cliquables mais ouvrent seulement le tooltip — pas d'achat.
- **États et raisons disponibles** : `getTreeNodesStates(...)` fournit `nodeState`, `reasonCode` et le mapping i18n existe déjà côté application.
- **Tests de domaine** : `tests/lib/talent-node/talent-node-purchase.test.mjs` et `tests/lib/talent-node/talent-node-state.test.mjs` couvrent le domaine.
- **Tests applicatifs** : `tests/applications/specialization-tree-app.test.mjs` couvre rendu, tooltip, pan/zoom, pas encore l'achat.
- **Refresh runtime** : `SwerpgActor._onUpdate()` (actor.mjs:610) ne rafraîchit la vue d'arbre que sur `system.advancement.level` ou `items`, pas sur `system.progression.talentPurchases` ni `system.progression.experience.spent`.
- **Debug résiduel** : `buildSpecializationTreeContext` contient un `console.table(...)` ligne 272.

---

## 4. Décisions d'architecture

### 4.1. Réutiliser `purchaseTalentNode(...)` comme point d'entrée unique

**Problème** : la vue graphique doit acheter un nœud sans persister elle-même les données acteur.

**Options envisagées** :
- appeler directement `actor.update(...)` depuis l'application ;
- dupliquer des validations UI ;
- appeler `purchaseTalentNode(actor, specializationId, nodeId)`.

**Décision retenue** : déléguer tout achat à `purchaseTalentNode(...)`.

**Justification** :
- conforme à `05-ui-arbres-specialisation.md` ;
- évite une seconde source de vérité ;
- garantit que l'UI et le domaine partagent les mêmes règles de refus.

### 4.2. Piloter le clic par `nodeState`

**Problème** : l'issue distingue explicitement `available`, `locked`, `invalid` et `purchased`.

**Décision retenue** :
- `available` → tentative d'achat ;
- `locked` → affichage d'une explication ;
- `invalid` → affichage d'une erreur de données ;
- `purchased` → détail consultatif uniquement.

**Justification** :
- conforme aux critères d'acceptation de l'issue ;
- cohérent avec US16 et le moteur `talent-node-state.mjs` ;
- interdit tout achat implicite sur un état non valide.

### 4.3. Feedback utilisateur via notifications + tooltip

**Problème** : l'issue demande un message clair en cas d'échec et un retour immédiat après achat.

**Options envisagées** :
- tooltip seul ;
- zone inline dédiée ;
- notifications UI + tooltip.

**Décision retenue** : `ui.notifications` pour succès/échec, tooltip conservé comme support consultatif.

**Justification** :
- message immédiat et explicite ;
- ne surcharge pas l'application avec un nouvel état persistant ;
- reste cohérent avec les patterns existants du projet ;
- respecte ADR-0005 via clés i18n dédiées.

### 4.4. Rafraîchissement explicite dans l'application et élargissement de `_onUpdate`

**Problème** : le refresh automatique actuel ne couvre pas les changements V1 talents réellement produits par `purchaseTalentNode(...)`.

**Options envisagées** :
- refresh explicite dans l'application seulement ;
- élargissement de `SwerpgActor._onUpdate()` seulement ;
- combiner les deux.

**Décision retenue** : combiner les deux.

**Justification** :
- l'application garantit le retour visuel immédiat après achat ;
- `SwerpgActor._onUpdate()` couvre aussi les cas où la mise à jour vient d'un autre flux (script, import, autre UI) ;
- reste aligné avec `06-audit-log-et-synchronisation.md` sur la synchronisation des vues.

### 4.5. Aucun recalcul métier côté UI

**Décision** : l'application n'interprète pas localement les règles d'achat au-delà de `nodeState` et `reasonCode` déjà fournis.

**Justification** :
- la vue ne doit pas recalculer la mécanique ;
- réduit le risque de divergence ;
- conforme à `05-ui-arbres-specialisation.md`.

### 4.6. Le cas non-ranked déjà possédé reste informatif, pas bloquant

**Problème** : l'issue précise qu'un nœud non-ranked déjà possédé peut rester achetable pour la progression de l'arbre.

**Décision retenue** : conserver l'achat possible si le domaine retourne `available`, mais afficher un message indicatif côté UI (notification `info`).

**Justification** :
- conforme à `02-regles-achat-progression.md` section 7 ;
- évite de transformer une règle de progression valide en faux refus UI ;
- garde la décision métier dans le domaine.

---

## 5. Plan de travail détaillé

### Étape 1 — Identifier dans le view-model les données nécessaires à l'achat

**Quoi faire** :
- vérifier que chaque `renderNode` transporte bien :
  - `nodeId`
  - `nodeState`
  - `reasonCode`
  - la spécialisation courante via le contexte actif.
- compléter si besoin les métadonnées nécessaires au handler d'achat.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- dépendre d'un identifiant ambigu ;
- coupler le handler à des données de rendu insuffisantes.

### Étape 2 — Brancher le clic sur nœud vers quatre comportements explicites

**Quoi faire** :
- conserver le clic sur nœud comme point d'entrée unique ;
- router le comportement selon `nodeState` ;
- préserver le détail consultatif pour `purchased`, `locked` et `invalid` ;
- déclencher l'achat uniquement pour `available`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- casser le tooltip consultatif existant (US16) ;
- lancer un achat sur un nœud non achetable à cause d'un handler trop générique.

### Étape 3 — Déléguer l'achat à la couche domaine existante

**Quoi faire** :
- appeler `purchaseTalentNode(this.actor, specializationId, nodeId)` depuis l'application ;
- ne jamais écrire directement dans `actor.system` depuis la vue ;
- récupérer le résultat structuré `{ ok, purchase }` ou `{ ok: false, reasonCode, reason }`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- contourner accidentellement le domaine ;
- perdre la raison machine-readable renvoyée par US6.

### Étape 4 — Mapper les résultats domaine vers des messages utilisateur localisés

**Quoi faire** :
- introduire une table de mapping `reasonCode -> clé i18n` pour les retours d'achat ;
- distinguer les cas de retour :
  - succès d'achat ;
  - XP insuffisants ;
  - prérequis non remplis ;
  - arbre/nœud invalide ;
  - spécialisation non possédée ;
  - fallback inconnu ;
  - message indicatif non-ranked déjà possédé si le nœud reste achetable.
- utiliser `ui.notifications.info/warn/error` selon le cas.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :
- désynchronisation FR/EN ;
- message trop technique exposant directement les codes métier.

### Étape 5 — Rafraîchir l'application immédiatement après achat réussi

**Quoi faire** :
- après un achat réussi, fermer/mettre à jour le tooltip si nécessaire ;
- relancer un `refresh()` explicite de l'application ;
- s'assurer que le rerender reflète le nouvel état des nœuds et de l'XP.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- double rendu non maîtrisé ;
- tooltip affichant un état devenu obsolète.

### Étape 6 — Corriger la synchronisation runtime côté acteur

**Quoi faire** :
- étendre la détection de `talentChange` dans `module/documents/actor.mjs` pour inclure au minimum :
  - `system.progression.talentPurchases`
  - `system.progression.experience.spent`
- conserver le refresh de l'application dédiée en priorité, avec fallback legacy.

**Fichiers** :
- `module/documents/actor.mjs`

**Risques spécifiques** :
- refresh trop large sur des updates sans rapport ;
- oubli d'un chemin de donnée réellement modifié par US6.

### Étape 7 — Nettoyer le debug résiduel

**Quoi faire** :
- supprimer ou remplacer par un `logger.debug` conditionnel le `console.table(...)` ligne 272 de `specialization-tree-app.mjs`.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs`

**Risques spécifiques** :
- aucun.

### Étape 8 — Étendre les tests du contrat applicatif

**Quoi faire** :
- couvrir le clic sur nœud `available` et l'appel au domaine ;
- couvrir l'absence d'achat sur `locked` et `invalid` ;
- couvrir l'affichage des notifications de succès/échec ;
- couvrir le refresh explicite de l'app après succès ;
- couvrir le cas non-ranked déjà possédé avec message indicatif ;
- couvrir la synchronisation `_onUpdate()` sur `talentPurchases` / `experience.spent`.

**Fichiers** :
- `tests/applications/specialization-tree-app.test.mjs`
- `tests/unit/documents/actor-specialization-tree-refresh.test.mjs`

**Risques spécifiques** :
- tests trop couplés aux détails PIXI ;
- oublier de tester la non-régression "locked/invalid ne déclenchent pas l'achat".

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Brancher l'achat depuis le clic, router selon `nodeState`, mapper retours domaine vers notifications, rafraîchir l'app après succès, supprimer `console.table` |
| `module/documents/actor.mjs` | modification | Étendre le refresh automatique de la vue graphique aux updates `talentPurchases` et `experience.spent` |
| `lang/fr.json` | modification | Ajouter les messages FR d'achat réussi, refus d'achat et message indicatif non-ranked |
| `lang/en.json` | modification | Ajouter les messages EN correspondants |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir le clic d'achat, l'absence d'achat sur états non valides, les notifications et le refresh |
| `tests/unit/documents/actor-specialization-tree-refresh.test.mjs` | création | Vérifier que `_onUpdate()` rafraîchit la vue dédiée sur les changements V1 talents |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| L'application achète directement sans passer par le domaine | divergence métier/UI | imposer `purchaseTalentNode(...)` comme seul point d'entrée |
| `locked` ou `invalid` deviennent cliquables de façon destructive | régression fonctionnelle | router strictement le clic via `nodeState` |
| La vue ne se rafraîchit pas après achat | retour utilisateur incohérent | combiner `app.refresh()` explicite et élargissement de `_onUpdate()` |
| Messages utilisateur incomplets ou techniques | UX dégradée | mapping i18n dédié avec fallback localisé |
| Désynchronisation FR/EN | dette i18n | ajouter les clés dans les deux fichiers et tester le mapping |
| Tooltip obsolète après achat | confusion utilisateur | fermer ou reconstruire le détail après succès |
| Tests trop PIXI-centriques | fragilité | tester le contrat applicatif et les appels métier, pas le rendu graphique fin |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-tree): wire node click purchase through domain service`  
   Brancher l'achat depuis la vue graphique en réutilisant `purchaseTalentNode` et en bloquant les états non achetables. Supprimer le `console.table` de debug.

2. `feat(i18n): add specialization tree purchase feedback messages`  
   Ajouter les messages localisés de succès, refus et indication non-ranked déjà possédé.

3. `fix(actor): refresh specialization tree on talent purchase updates`  
   Étendre la synchronisation runtime aux changements `talentPurchases` et `experience.spent`.

4. `test(talent-tree): cover graphical node purchase interactions`  
   Ajouter les tests applicatifs et de refresh liés à l'achat depuis la vue graphique.

---

## 9. Dépendances avec les autres US

- Dépend de **US6 (#190)** : le domaine `purchaseTalentNode(...)` doit être livré et fonctionnel (déjà présent dans le codebase).
- Dépend de **US16 (#200)** et **US15 (#199)** : la vue graphique avec le rendu d'arbres, le tooltip consultatif et la sélection de spécialisation (US17) doivent exister (déjà livrés).
- S'appuie sur **US5 (189)** et **US3 (187)** : `talent-node-state.mjs` et `talentPurchases` sur l'acteur (déjà livrés).
- US18 ne modifie pas le domaine, ni l'import OggDude, ni le legacy canvas — elle branche uniquement l'interaction d'achat dans la vue graphique existante.
- Le refresh runtime étendu prépare la synchronisation attendue par les US de consolidation sans les implémenter.
