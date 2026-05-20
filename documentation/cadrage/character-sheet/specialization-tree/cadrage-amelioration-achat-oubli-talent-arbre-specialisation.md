# Document de cadrage — Amélioration de l’achat et de l’oubli d’un talent dans l’arbre de spécialisation

## 1. Objet du document

Ce document cadre l’évolution de la vue graphique des arbres de spécialisation afin de restaurer, fiabiliser et
clarifier les actions d’apprentissage et d’oubli d’un talent depuis l’arbre.

À ce stade, la vue arbre affiche les nœuds, leurs états et leurs connexions, mais elle ne permet plus d’apprendre un
talent ni de l’oublier lorsque cette opération devrait être autorisée. Cette absence bloque l’usage joueur attendu :
progresser dans une spécialisation à partir de la représentation graphique de l’arbre.

L’objectif de ce cadrage est de définir le périmètre fonctionnel, les règles métier attendues, les impacts UX, les
impacts techniques et un découpage d’implémentation raisonnable, sans mélanger la logique métier avec le rendu PIXI ou
la couche UI Foundry.

## 2. Contexte fonctionnel

Dans le modèle cible de la refonte V1 des talents Edge, les arbres de spécialisation sont des référentiels de
progression. Un acteur possède une ou plusieurs spécialisations. Chaque spécialisation peut être associée à un arbre de
talents contenant des nœuds. Chaque nœud référence un talent, porte un coût XP, une position et des connexions de
prérequis.

La progression réelle du personnage ne doit pas être déduite uniquement de l’arbre. Elle doit être persistée sur
l’acteur sous forme d’achats de nœuds. La vue consolidée des talents est ensuite dérivée de ces achats, des arbres
résolus et des définitions de talents.

Actuellement, l’écran graphique est essentiellement consultatif. Il permet d’afficher les états des nœuds, mais ne
fournit plus le flux complet d’action permettant au joueur d’apprendre ou d’oublier un talent depuis l’arbre.

## 3. Problème à résoudre

Le problème utilisateur est simple : lorsqu’un joueur ouvre l’arbre de spécialisation de son personnage, il devrait
pouvoir identifier un talent disponible, cliquer dessus, l’acheter si les conditions sont réunies, puis voir
immédiatement l’arbre et l’onglet Talents refléter ce nouvel achat.

Inversement, lorsqu’un achat peut légalement être annulé, le joueur devrait pouvoir oublier ce talent depuis l’arbre,
avec une confirmation explicite, et voir l’état de progression recalculé.

Aujourd’hui, ce flux n’est pas disponible. Cela entraîne plusieurs effets négatifs :

- la vue arbre reste informative mais non actionnable ;
- la vue consolidée des talents peut rester vide tant qu’aucun achat n’est injecté manuellement ;
- il devient difficile de tester le flux complet en situation réelle dans Foundry VTT ;
- la logique de progression n’est pas encore matérialisée comme une interaction joueur claire.

## 4. Objectifs

### 4.1. Objectif principal

Permettre l’achat et l’oubli contrôlé d’un talent depuis un nœud de l’arbre de spécialisation, en respectant les règles
métier de progression et en synchronisant les vues concernées.

### 4.2. Objectifs secondaires

L’évolution doit permettre de rendre l’état d’un nœud actionnable ou non actionnable de façon explicite. Elle doit
empêcher les achats invalides. Elle doit empêcher les oublis qui casseraient la progression. Elle doit mettre à jour
l’acteur de manière atomique. Elle doit déclencher la mise à jour de la vue arbre et de la vue consolidée des talents.
Elle doit préparer l’intégration avec l’audit log sans stocker l’historique complet dans l’acteur.

### 4.3. Non-objectifs

Cette évolution ne doit pas refondre le modèle complet des talents. Elle ne doit pas automatiser les effets mécaniques
des talents. Elle ne doit pas résoudre à elle seule la résilience V2 en cas de suppression des référentiels. Elle ne
doit pas déplacer la logique métier dans la couche PIXI. Elle ne doit pas créer d’achats directement sur les items de
talents ou de specialization-tree : la progression reste une donnée de l’acteur.

## 5. Principes d’architecture

### 5.1. L’acteur porte la progression

L’achat d’un talent doit être persisté sur l’acteur, au niveau du nœud acheté. L’acteur ne doit pas embarquer une copie
complète de l’arbre ou du talent. Il doit stocker les informations minimales nécessaires à la résolution ultérieure, au
recalcul de progression et à la consolidation.

La structure exacte doit rester alignée avec le modèle existant de `actor.system.progression.talentPurchases`.

### 5.2. Le nœud, pas le talent global, est l’unité d’achat

Dans Edge of the Empire, un même talent peut apparaître dans plusieurs arbres et à des coûts différents. L’achat ne doit
donc pas être modélisé comme « le personnage possède le talent X » de manière isolée. Il doit être modélisé comme « le
personnage a acheté tel nœud dans tel arbre de spécialisation ».

La vue consolidée peut ensuite agréger les talents possédés, notamment pour les talents à rangs.

### 5.3. La logique métier ne doit pas être dans l’UI

La couche UI doit demander si une action est possible et déclencher une commande. Elle ne doit pas recalculer elle-même
les règles d’achat ou d’oubli.

Les règles doivent être centralisées dans un service ou module de domaine dédié, par exemple autour d’un
`TalentPurchaseService`, `TalentProgressionService` ou équivalent.

### 5.4. Les états de nœuds restent la source UX principale

Les états produits par la logique de nœuds doivent continuer à alimenter l’interface : `purchased`, `available`,
`locked`, `invalid`. L’UI doit consommer ces états pour décider des actions visibles, mais la validation finale doit
être refaite côté domaine au moment de l’action.

Cela évite qu’un état visuel obsolète permette une action invalide.

### 5.5. Les mises à jour doivent être atomiques

Acheter ou oublier un talent modifie l’état de progression de l’acteur et potentiellement l’expérience
disponible/dépensée. Ces changements doivent être appliqués dans une seule opération cohérente.

Il faut éviter les mises à jour partielles où le talent serait acheté sans coût XP correctement appliqué, ou l’inverse.

## 6. Règles métier d’achat

### 6.1. Conditions minimales d’achat

Un nœud peut être acheté si les conditions suivantes sont réunies :

- l’acteur possède la spécialisation concernée ou le contexte d’achat l’autorise explicitement ;
- l’arbre de spécialisation est résolu et utilisable ;
- le nœud existe dans l’arbre ;
- le talent référencé par le nœud est résolu ou suffisamment identifiable selon la stratégie de clés retenue ;
- le nœud n’est pas déjà acheté ;
- les prérequis du nœud sont satisfaits ;
- l’acteur dispose de suffisamment d’XP disponible ;
- le nœud n’est pas dans un état invalide.

L’état `available` indique qu’un nœud est candidat à l’achat, mais l’action d’achat doit tout de même refaire une
validation métier au moment du clic.

### 6.2. Coût XP

Le coût d’achat doit provenir du nœud de l’arbre, pas de la définition globale du talent. Si le coût est absent,
invalide ou incohérent, l’achat doit être bloqué avec un message explicite.

L’achat doit décrémenter l’XP disponible ou incrémenter l’XP dépensée selon le modèle XP déjà retenu dans l’acteur. La
règle exacte doit s’aligner avec les conventions existantes du système SWERPG.

### 6.3. Talents à rangs

Pour un talent à rangs, chaque achat de nœud peut contribuer au rang consolidé du talent. Le système ne doit pas
empêcher automatiquement plusieurs achats d’un même talent si ce talent est `ranked`.

Pour un talent non classé/rangé, il faut définir le comportement cible : soit interdire l’achat d’un doublon, soit
autoriser l’achat du nœud pour respecter l’arbre mais ne pas dupliquer l’effet consolidé. Ce point doit être arbitré si
la règle n’est pas déjà fixée.

Recommandation : pour la V1, respecter la logique FFG suivante : un talent non ranked déjà possédé ne doit pas produire
d’effet cumulatif, mais la question de l’achat d’un second nœud identique doit être traitée explicitement pour éviter
les incohérences de progression.

### 6.4. Résultat attendu après achat

Après achat réussi :

- une entrée d’achat est ajoutée à `actor.system.progression.talentPurchases` ;
- l’XP de l’acteur est mise à jour ;
- l’arbre est recalculé ;
- le nœud acheté passe à l’état `purchased` ;
- les nœuds dépendants peuvent passer de `locked` à `available` ;
- l’onglet Talents consolidé reflète le nouveau talent ;
- une notification utilisateur confirme l’achat ;
- un événement d’audit peut être émis.

## 7. Règles métier d’oubli

### 7.1. Définition de l’oubli

L’oubli d’un talent correspond à l’annulation d’un achat de nœud persisté sur l’acteur. Ce n’est pas la suppression du
talent référentiel, ni la suppression du nœud dans l’arbre.

L’opération retire une entrée de progression et rembourse ou ajuste l’XP selon la règle validée.

### 7.2. Conditions minimales d’oubli

Un nœud acheté peut être oublié seulement si l’opération ne casse pas la cohérence de progression.

Conditions minimales proposées :

- le nœud est effectivement acheté ;
- l’achat correspondant est identifiable dans la progression de l’acteur ;
- aucun autre nœud acheté ne dépend de ce nœud comme prérequis obligatoire ;
- l’oubli ne rend pas invalide un chemin de progression déjà acheté ;
- l’acteur peut être mis à jour de façon atomique ;
- l’utilisateur confirme explicitement l’action.

### 7.3. Protection contre la casse de chaîne

Le point central de l’oubli est la dépendance. Si un joueur a acheté un talent qui a permis d’en acheter d’autres plus
loin dans l’arbre, il ne doit pas pouvoir oublier ce talent sans d’abord oublier les talents dépendants.

L’UI doit expliquer la raison du blocage, par exemple :

> Ce talent ne peut pas être oublié car il débloque actuellement Quick Strike et Side Step.

### 7.4. Remboursement XP

Le remboursement XP doit être explicitement défini.

Deux options existent :

- Option A : oubli comme annulation complète. L’XP du nœud est remboursée. Cette option est utile pour corriger une
  erreur d’achat ou pour tester.
- Option B : oubli comme suppression sans remboursement automatique. Cette option est plus stricte mais moins
  confortable.

Recommandation pour la V1 : traiter l’oubli comme une annulation contrôlée avec remboursement XP, tant que l’opération
ne casse pas les prérequis. Cela correspond mieux à un outil de gestion de fiche dans Foundry VTT.

### 7.5. Résultat attendu après oubli

Après oubli réussi :

- l’entrée d’achat est retirée de `actor.system.progression.talentPurchases` ;
- l’XP est recalculée ou ajustée ;
- le nœud repasse à `available` ou `locked` selon ses prérequis ;
- les nœuds dépendants restent cohérents ;
- la vue consolidée des talents est recalculée ;
- une notification confirme l’oubli ;
- un événement d’audit peut être émis.

## 8. UX cible dans l’arbre

### 8.1. Interaction principale

Le joueur clique sur un nœud. Selon son état, l’interface propose l’action pertinente :

- nœud `available` : action « Apprendre » ;
- nœud `purchased` : action « Oublier » si autorisé, sinon information de blocage ;
- nœud `locked` : aucune action d’achat, mais explication des prérequis manquants ;
- nœud `invalid` : aucune action, explication du problème de données.

### 8.2. Ne pas acheter sur simple clic accidentel

L’achat d’un talent dépense de l’XP. Il ne doit pas être déclenché par un clic accidentel sans confirmation ou sans
action explicite.

Deux patterns sont envisageables :

- clic sur le nœud → panneau/tooltip d’action → bouton « Apprendre » ;
- clic droit/context menu → action « Apprendre » ou « Oublier ».

Recommandation : utiliser un panneau ou popover d’action au clic gauche. Le clic droit peut être ajouté ensuite pour les
utilisateurs avancés.

### 8.3. Confirmation

L’achat peut être confirmé par une boîte de dialogue simple affichant :

- nom du talent ;
- spécialisation ;
- coût XP ;
- XP disponible avant/après ;
- bouton confirmer ;
- bouton annuler.

L’oubli doit toujours demander confirmation, avec indication du remboursement XP éventuel et des conséquences.

### 8.4. Feedback immédiat

Après action réussie, le joueur doit voir immédiatement :

- le changement de couleur/état du nœud ;
- les liens mis à jour ;
- les nouveaux nœuds disponibles ;
- une notification Foundry courte ;
- l’onglet Talents consolidé mis à jour si visible.

### 8.5. Messages d’erreur utiles

Les erreurs doivent être formulées pour un utilisateur, pas pour un développeur.

Exemples :

- « XP insuffisante pour apprendre ce talent. »
- « Ce talent nécessite d’abord l’achat d’un nœud connecté. »
- « Ce talent ne peut pas être oublié car d’autres talents achetés en dépendent. »
- « Le talent référencé par ce nœud est introuvable. »
- « L’arbre de spécialisation n’est pas résolu. »

Les détails techniques peuvent être loggés côté console/logger.

## 9. Données à persister

L’achat doit persister une entrée minimale mais robuste.

Structure indicative, à aligner avec le modèle existant :

```js
{
  specializationId: 'scoundrel',
    treeUuid
:
  'Item.xxxxx',
    treeId
:
  'scoundrel',
    nodeId
:
  'scoundrel-quick-draw-5',
    talentId
:
  'quickdr',
    talentUuid
:
  'Compendium.world.swerpg-talents.Item.yyyyy',
    cost
:
  5,
    purchasedAt
:
  '2026-05-20T00:00:00.000Z'
}
```

Point d’attention : `purchasedAt` peut être utile pour l’audit et le debug, mais l’historique complet ne doit pas être
stocké dans l’acteur si la décision d’architecture est de confier l’historique à l’audit log. Si cette donnée est jugée
historique plutôt qu’état courant, elle doit être retirée de l’acteur.

Pour la V1, il faut arbitrer la structure exacte, mais les références suivantes sont importantes :

- `specializationId` pour le rattachement métier ;
- `treeUuid` pour retrouver le référentiel Foundry ;
- `nodeId` pour identifier l’occurrence achetée ;
- `talentId` pour la clé métier du talent ;
- `talentUuid` pour la résolution robuste du talent ;
- `cost` pour sécuriser le recalcul ou l’audit de l’achat.

## 10. Impacts techniques

### 10.1. Domaine

Créer ou consolider un service métier dédié aux opérations de progression talent.

Responsabilités attendues :

- valider l’achat d’un nœud ;
- valider l’oubli d’un nœud ;
- calculer les prérequis ;
- vérifier l’XP ;
- produire une erreur métier exploitable par l’UI ;
- préparer le patch acteur atomique ;
- émettre ou préparer un événement d’audit.

### 10.2. View model

Le view model de l’arbre doit exposer, pour chaque nœud :

- son état ;
- son libellé d’état ;
- les actions disponibles ;
- la raison d’indisponibilité ;
- les prérequis manquants ;
- les dépendants bloquant l’oubli ;
- le coût ;
- la référence d’achat si existante.

L’UI ne doit pas reconstruire ces données directement depuis des fragments dispersés.

### 10.3. Application Foundry

La `SpecializationTreeApp` doit gérer les interactions utilisateur : clic sur nœud, ouverture du popover ou de la boîte
de dialogue, confirmation, appel au service métier, rafraîchissement.

Elle ne doit pas contenir les règles métier.

### 10.4. PIXI

Le rendu PIXI doit permettre :

- nœuds cliquables ;
- hover clair ;
- cursor pointer uniquement si une interaction est possible ;
- sélection visuelle temporaire ;
- mise à jour après achat/oubli sans fuite mémoire ;
- conservation du viewport lorsque l’arbre est redessiné.

### 10.5. Synchronisation de la fiche acteur

Après achat ou oubli, il faut vérifier que les autres parties de la fiche acteur se mettent à jour, notamment l’onglet
Talents consolidé.

Si la fiche ne se rafraîchit pas automatiquement via l’update acteur, un mécanisme explicite de refresh ou
d’invalidation du contexte doit être prévu.

## 11. Audit log

La décision d’architecture actuelle indique que l’acteur stocke l’état courant de progression, pas l’historique complet.
L’audit log doit recevoir les opérations significatives.

Événements candidats :

- `talent.purchase.requested` ;
- `talent.purchase.succeeded` ;
- `talent.purchase.failed` ;
- `talent.forget.requested` ;
- `talent.forget.succeeded` ;
- `talent.forget.failed`.

Informations utiles :

- acteur ;
- spécialisation ;
- arbre ;
- nœud ;
- talent ;
- coût XP ;
- XP avant/après ;
- raison d’échec éventuelle ;
- utilisateur Foundry.

L’audit ne doit pas bloquer l’action si le logging échoue, sauf décision contraire.

## 12. Sécurité et permissions

Les actions d’achat et d’oubli modifient l’acteur. Elles doivent respecter les permissions Foundry.

Règles attendues :

- seul un utilisateur autorisé à modifier l’acteur peut acheter ou oublier un talent ;
- le MJ conserve la capacité d’agir sur les acteurs qu’il contrôle ;
- en cas de permission insuffisante, l’action est masquée ou bloquée avec un message clair ;
- aucune mise à jour acteur ne doit être tentée depuis un utilisateur non autorisé.

## 13. Tests à prévoir

### 13.1. Tests unitaires métier

Couvrir au minimum :

- achat d’un nœud disponible ;
- refus d’achat d’un nœud verrouillé ;
- refus d’achat d’un nœud déjà acheté ;
- refus d’achat si XP insuffisante ;
- refus d’achat si arbre non résolu ;
- refus d’achat si talent introuvable ;
- oubli d’un nœud acheté sans dépendant ;
- refus d’oubli si un nœud acheté dépend de lui ;
- recalcul des états après achat ;
- recalcul des états après oubli ;
- comportement des talents ranked ;
- comportement des talents non ranked dupliqués si ce cas est autorisé ou interdit.

### 13.2. Tests de view model

Couvrir :

- actions exposées selon l’état du nœud ;
- raisons de blocage ;
- dépendants bloquant l’oubli ;
- libellés i18n disponibles ;
- cohérence entre état du nœud et action proposée.

### 13.3. Tests UI / intégration Foundry

Couvrir :

- clic sur nœud disponible ;
- affichage confirmation achat ;
- achat confirmé met à jour l’acteur ;
- clic sur nœud acheté ;
- oubli confirmé met à jour l’acteur ;
- erreur affichée proprement ;
- l’arbre conserve son viewport après refresh ;
- l’onglet Talents consolidé reflète l’achat ;
- les permissions sont respectées.

## 14. Proposition de découpage en sous-issues

### Issue 1 — Service métier d’achat/oubli de nœud

Créer le service central de progression des talents.

Contenu : validation achat, validation oubli, calcul patch acteur, erreurs métier, tests unitaires.

### Issue 2 — Persistance acteur et XP

Stabiliser la structure de `talentPurchases`, appliquer les mises à jour atomiques et gérer l’impact XP.

Contenu : ajout achat, retrait achat, coût, recalcul XP ou ajustement, tests de non-régression.

### Issue 3 — View model actionnable des nœuds

Enrichir le contexte de rendu pour exposer les actions possibles et les raisons de blocage.

Contenu : `canPurchase`, `canForget`, `actionLabel`, `blockedReason`, `blockingDependents`, i18n.

### Issue 4 — Interaction UI dans SpecializationTreeApp

Brancher les clics sur nœuds, popover/dialogue de confirmation, appel au service métier, notifications.

Contenu : achat depuis nœud disponible, oubli depuis nœud acheté, erreurs utilisateur.

### Issue 5 — Synchronisation arbre et onglet Talents

Garantir que l’achat ou l’oubli met à jour l’arbre et la vue consolidée.

Contenu : refresh après update acteur, conservation du viewport, recalcul des états, tests d’intégration.

### Issue 6 — Audit log

Émettre les événements d’achat et d’oubli sans stocker l’historique complet dans l’acteur.

Contenu : événements succès/échec, payload minimal, logs exploitables.

### Issue 7 — Polish UX et accessibilité

Finaliser les messages, tooltips, labels, confirmations et états visuels liés aux actions.

Contenu : labels localisés, curseur, hover, message d’erreur, confirmations claires.

## 15. Critères d’acceptation globaux

L’évolution est considérée comme réussie si :

- un joueur autorisé peut apprendre un talent disponible depuis l’arbre ;
- l’achat est impossible si les prérequis ne sont pas remplis ;
- l’achat est impossible si l’XP est insuffisante ;
- l’achat met à jour l’acteur et la vue consolidée ;
- un joueur autorisé peut oublier un talent acheté lorsque cela ne casse pas la progression ;
- l’oubli est bloqué si des talents achetés en dépendent ;
- l’oubli met à jour l’acteur, l’XP et les états de l’arbre ;
- les erreurs sont compréhensibles par un joueur ;
- les règles métier ne sont pas implémentées dans le rendu PIXI ;
- les actions respectent les permissions Foundry ;
- les tests couvrent les cas nominaux et les principaux cas d’échec.

## 16. Arbitrages à valider

Plusieurs points doivent être tranchés avant l’implémentation complète.

Premier arbitrage : l’oubli rembourse-t-il toujours l’XP lorsque l’opération est autorisée ?

Deuxième arbitrage : un talent non ranked déjà possédé peut-il être racheté dans un autre nœud pour respecter le chemin
de progression, ou doit-il être bloqué ?

Troisième arbitrage : l’achat doit-il être possible directement depuis la vue arbre dès cette itération, ou seulement
préparé côté domaine et activé dans une issue suivante ?

Quatrième arbitrage : l’UI utilise-t-elle un panneau de détail, un popover ou une boîte de dialogue simple pour
déclencher l’achat et l’oubli ?

Cinquième arbitrage : quelles données exactes doivent être stockées dans `talentPurchases` pour équilibrer robustesse,
résilience et absence d’historique embarqué ?

## 17. Recommandation finale

La priorité doit être de restaurer un flux complet et fiable : état du nœud, action possible, confirmation, validation
métier, mise à jour acteur, recalcul des vues.

Le bon découpage consiste à commencer par le domaine et la persistance, puis seulement à brancher l’UI PIXI. L’inverse
créerait une dette technique immédiate, car l’écran deviendrait responsable de règles qu’il ne doit pas porter.

Pour la V1, la cible raisonnable est : apprendre un talent disponible, oublier un talent acheté si aucun achat dépendant
ne serait cassé, rembourser l’XP lors de l’oubli, rafraîchir l’arbre et la vue consolidée, et tracer l’opération dans
l’audit log.

Cette évolution est structurante. Elle marque le passage de la vue arbre comme visualisation à la vue arbre comme
véritable interface de progression du personnage.
