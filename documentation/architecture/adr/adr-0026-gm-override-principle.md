---
title: 'ADR-0026: Principe de souveraineté du MJ — toute règle doit être contournable'
status: 'Accepted'
date: '2026-06-09'
authors: 'Hervé Darritchon'
tags: ['product', 'ux', 'gm', 'override', 'settings', 'ttrpg']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Validée le 2026-06-09. Cette ADR pose le principe fondateur que tout mécanisme de règle implémenté dans SWERPG doit offrir au MJ un moyen de l'adapter, de le contourner ou de le désactiver.

## Context

SWERPG est un système de jeu de rôle sur table (TTRPG). À la différence d'un jeu vidéo, un TTRPG ne s'adresse pas à une table unique avec des règles uniformes : chaque groupe, chaque campagne, chaque MJ a sa propre interprétation des règles officielles, ses propres variantes maison, ses propres exceptions ponctuelles.

Implémenter une règle de façon rigide — même une règle canonique du livre de base — expose le système à devenir un obstacle plutôt qu'un outil. Un MJ qui ne peut pas désactiver une validation, ajuster un plafond ou passer outre une contrainte ponctuelle est contraint par le logiciel plutôt que servi par lui.

Ce principe s'applique à **toutes les catégories de règles** :

- validations de création de personnage (points de caractéristiques, budgets XP, rangs de compétence, obligations, devoirs…) ;
- contraintes de progression (coût des talents, règles de rang, prérequis) ;
- limites mécaniques (capacités de charge, valeurs d'armure, rangs maximum) ;
- règles d'éligibilité (accès au marché, restrictions légales) ;
- comportements automatiques (application d'effets, calculs dérivés, déclencheurs).

## Decision

### D1 — Toute règle implémentée expose un mécanisme de contournement MJ

Dès qu'une règle est codée avec un effet contraignant (blocage, alerte, calcul automatique, validation), elle doit prévoir au moins un des quatre niveaux de contournement définis en D2.

Il est explicitement interdit d'implémenter une contrainte métier sans prévoir ce mécanisme.

### D2 — Quatre niveaux de contournement hiérarchiques

Les quatre niveaux sont ordonnés du plus global au plus local. Un niveau plus local prend toujours le dessus sur un niveau plus global.

**Niveau 1 — Bascule système (toggle global)**

Une règle peut être activée ou désactivée globalement pour tout le monde.  
Implémentée via un `game.settings.register(...)` booléen accessible au MJ dans les paramètres système.  
Usage : variante officielle optionnelle, règle maison qui remplace complètement la règle de base.

**Niveau 2 — Paramétrage système (valeur ajustable)**

La valeur d'une contrainte (plafond, seuil, coût, budget) peut être modifiée globalement.  
Implémentée via un `game.settings.register(...)` numérique ou sélecteur accessible au MJ.  
Usage : adapter une limite à la taille du groupe, au niveau de la campagne, à une variante de difficulté.

**Niveau 3 — Exception ponctuelle (override local)**

Une contrainte peut être ignorée pour un personnage, un item ou une situation précise, sans modifier le comportement global.  
Implémentée via un `flag` ou un champ dédié sur l'entité concernée, éditable directement en sheet ou via une action dédiée du MJ.  
Usage : situation narrative exceptionnelle, personnage aux règles spéciales, test ponctuel MJ.

**Niveau 4 — Application manuelle différée (chat message)**

Le calcul ou la résolution d'une règle produit un message de chat Foundry synthétisant le résultat prévu, mais **n'applique aucun changement automatiquement**. Le MJ décide ensuite, via un bouton d'action ou un menu déroulant dans le message de chat, d'appliquer ou non le résultat à la fiche du personnage concerné.  
Si le MJ ne valide pas, les modifications doivent être faites à la main sur la fiche — ce qui est délibérément acceptable.  
Implémentée via `ChatMessage` avec des boutons `data-action` ciblant un handler MJ-only (vérification `game.user.isGM`).  
Usage : résultats de jet structurels (attribution d'XP, progression de rang, application d'effet de status, bilan de fin de session), toute règle où l'automatisme total serait perçu comme intrusif ou contestable à la table.

### D3 — Comportement par défaut : règle écrite

En l'absence de contournement actif, le système applique la règle telle qu'elle est écrite dans le livre de base.  
Le default de chaque paramètre de contournement est toujours "règle officielle active".

Cela garantit qu'un nouveau groupe qui installe SWERPG sans configuration joue selon les règles canoniques.

### D4 — Visibilité des contournements actifs

Quand un contournement est actif, l'UI signale son effet sans le cacher.  
Ce signal peut être discret (icône, tooltip, style distinctif) mais il doit exister pour éviter qu'un MJ oublie qu'il a modifié une règle.

### D5 — Les contournements ne génèrent pas de dette de code

Un contournement n'est pas une exception ad hoc codée en dur dans la logique métier. Il s'appuie sur les mécanismes standards de Foundry (settings, flags) et sur la couche domaine pure (`module/lib/`).  
La logique de règle doit rester lisible avec et sans contournement actif.

### D6 — Ce principe s'applique dès la conception, pas en post-traitement

Lors de la planification d'une fonctionnalité, la question « quel contournement MJ prévoir ? » fait partie du scope minimal à définir. Un plan ou une issue qui n'y répond pas est incomplet.

### D7 — Le choix du niveau d'override reste une décision humaine validée

Avant toute implémentation, l'agent ou le développeur **propose** le ou les niveaux de contournement qu'il juge pertinents, avec justification courte. Le choix final appartient au porteur du projet (MJ de la table, product owner).

**L'implémentation ne commence qu'après validation explicite du niveau retenu.**

Cette règle s'applique même si un seul niveau semble évident. La proposition reste obligatoire.

## Options écartées

### O1 — Règles strictes sans contournement

Implémenter des règles non contournables pour garantir la cohérence mécanique.

- **Avantages** : comportement prévisible, moins de code conditionnel.
- **Inconvénients** : rend le système inutilisable pour tout groupe qui s'écarte tant soit peu des règles officielles ; transforme l'outil en arbitre plutôt qu'en assistant.
- **Décision** : rejetée.

### O2 — Contournements uniquement via l'édition directe des données (flags bruts, modifications JSON)

Forcer le MJ à modifier les données directement pour contourner une règle.

- **Avantages** : moins de surface UI à développer.
- **Inconvénients** : inaccessible pour la majorité des MJs, fragile, source d'erreurs, cache les effets de bord.
- **Décision** : rejetée.

### O3 — Mode "permissif global" unique qui désactive toutes les règles d'un coup

Un seul toggle "mode sandbox" qui coupe toutes les validations.

- **Avantages** : simple à implémenter.
- **Inconvénients** : pas de granularité, pas de signal visuel par règle, force un choix binaire alors que les groupes ont des besoins mixtes (certaines règles maison, d'autres officielles).
- **Décision** : rejetée comme solution exclusive. Peut exister en complément des niveaux D2.

## Rationale

1. **Nature du TTRPG** : le logiciel sert la table, pas l'inverse. Le MJ est l'autorité finale sur les règles appliquées à son groupe.
2. **Diversité des usages** : même au sein du même jeu, les interprétations varient. Un système rigide exclurait des pans entiers d'utilisateurs légitimes.
3. **Réutilisabilité** : un système qui permet les variantes sert aussi les jeux dérivés, les hack, les campagnes homebrew — autant d'usages réels des utilisateurs SWERPG.
4. **Confiance** : donner au MJ le contrôle augmente la confiance dans l'outil. Un MJ qui peut toujours passer outre accepte mieux les comportements automatiques par défaut.
5. **Coût vs bénéfice** : prévoir un contournement dès la conception coûte peu. L'ajouter après coup en post-traitement d'une fonctionnalité rigide coûte beaucoup plus.

## Implications sur le processus de développement

### Planification

Chaque plan de fonctionnalité (`documentation/plan/`) doit inclure une section dédiée aux contournements MJ. Cette section suit le processus suivant :

1. **Proposition** : l'agent liste le ou les niveaux candidats (parmi les quatre de D2) avec une justification d'une ligne par niveau proposé.
2. **Validation** : le porteur du projet choisit explicitement le niveau retenu. Aucune implémentation ne commence avant cette validation.
3. **Documentation** : le niveau retenu et la raison du choix sont consignés dans le plan et dans le ticket associé.

Pour le Niveau 4, la proposition précise également les actions disponibles dans le message de chat et les permissions requises (MJ only ou accessible aux joueurs).

### Implémentation

Les paramètres de contournement Niveau 1 et 2 sont enregistrés dans `module/config/settings.mjs` (ou le fichier d'enregistrement des settings).  
Les overrides Niveau 3 sont stockés dans `flags.swerpg` sur l'entité concernée avec un nom de clé documenté.  
Les actions Niveau 4 sont implémentées dans `module/chat.mjs` (ou un handler dédié) ; les boutons du message de chat vérifient `game.user.isGM` avant d'autoriser l'action.

### Tests

Les tests unitaires d'une règle couvrent les quatre états : règle active par défaut, règle modifiée (Niveau 1/2), exception ponctuelle (Niveau 3), et application manuelle différée (Niveau 4 : vérifier que le chat message est produit sans modification des données, et que l'action d'application modifie correctement l'entité).

### Review

Toute PR qui implémente une règle contraignante sans mécanisme de contournement est incomplète et doit être refusée.

## Contrat testable

Pour chaque règle contraignante implémentée, les tests suivants doivent exister :

```js
describe('règle X', () => {
  it('applique la règle par défaut (officielle)', () => {
    /* ... */
  })
  it('désactive la règle si le setting toggle est false', () => {
    /* ... */
  })
  it('utilise la valeur paramétrable si le setting est modifié', () => {
    /* ... */
  })
  it("ignore la règle si le flag d'exception ponctuelle est actif sur l'entité", () => {
    /* ... */
  })
  // Niveau 4 uniquement si la règle utilise l'application manuelle différée
  it('produit un ChatMessage sans modifier les données du personnage', () => {
    /* ... */
  })
  it("applique les modifications à l'entité quand le MJ active l'action du message de chat", () => {
    /* ... */
  })
  it("n'expose pas l'action d'application aux joueurs non-MJ", () => {
    /* ... */
  })
})
```

## Review

**Validation :** ADR acceptée le 2026-06-09.

Cette ADR doit être réévaluée si :

- Foundry VTT introduit un mécanisme natif de gestion des variantes de règles qui rendrait ce pattern obsolète ;
- un sous-système SWERPG démontre qu'une règle strictement non contournable est nécessaire pour des raisons de cohérence de données (à documenter explicitement dans l'ADR du sous-système concerné, avec justification).

## Links

- Settings Foundry : `game.settings.register` / `game.settings.get`
- Flags Foundry : `entity.setFlag` / `entity.getFlag`
- Module config : `module/config/settings.mjs`
- Chat message : `module/chat.mjs`
- Couche domaine pure : `module/lib/`
- ADR connexes : [ADR-0009](./adr-0009-restriction-level.md) (legalite / equipement), [ADR-0018](./adr-0018-no-magic-numbers-named-constants.md) (constantes nommées pour les valeurs paramétrables)
