# Issue #536 — Market : appliquer le jet de disponibilité dans le flux « négocier » (anti-bypass)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/536  
**Domaine métier** : `market`

## Goal

Supprimer le contournement du jet de disponibilité dans le parcours `négocier`, en garantissant qu’un item rare/restreint déclenche le même contrôle obligatoire que le parcours `acheter`, avant l’ouverture de la négociation, sans régression sur l’achat standard.

## Contexte utile

- `module/applications/market/market-application.mjs` fait déjà le contrôle de disponibilité dans `#onBuyItem`, mais `#onNegotiateItem` ouvre directement `NegotiationDialog.prompt()` puis appelle `#executePurchase`.
- `#executePurchase` est commun aux deux flux, mais il intervient après la négociation ; y déplacer le contrôle changerait l’ordre UX attendu par l’issue, qui demande un jet avant la négociation.
- `module/lib/market/availability-check.mjs` couvre déjà les règles métier pures (`resolveAvailabilityCheck`) ; le défaut est un problème d’orchestration du flux Market, pas de matrice métier.
- `tests/applications/market/market-application.test.mjs` couvre déjà largement `buyItem` et `negotiateItem`, mais pas encore l’anti-bypass du jet de disponibilité sur `négocier`.

## Plan d’implémentation

### Étape 1 — Factoriser le garde-fou de disponibilité au niveau du flux Market

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- Extraire la séquence de contrôle de disponibilité (résolution `resolveAvailabilityCheck`, ouverture de `AvailabilityCheckDialog`, abort sur annulation/échec, notification associée) dans un helper privé réutilisable par les deux actions UI.
- Garder `#executePurchase` centré sur l’exécution d’achat (conséquences, confirmation, mutation inventaire) pour éviter de déplacer le contrôle trop tard dans le parcours `négocier`.
- Préserver le comportement déjà livré pour `buyItem`, y compris les effets déjà branchés autour du résultat du check.

**Résultat attendu** : la règle de disponibilité n’est plus dupliquée à la main dans un seul handler ; elle devient un prérequis partagé des parcours d’achat Market.

### Étape 2 — Appliquer le contrôle avant `NegotiationDialog` dans le parcours « négocier »

**Fichiers** : `module/applications/market/market-application.mjs`

**What** :

- Brancher le helper partagé dans `#onNegotiateItem` juste après la reconstruction de `entry` et avant l’appel à `NegotiationDialog.prompt()`.
- Faire en sorte qu’un check annulé/raté stoppe le flux sans ouvrir la négociation, conformément au critère d’acceptation anti-bypass.
- Conserver ensuite le flux existant : négociation, construction de `negotiatedEntry`, puis `#executePurchase` avec le prix négocié.

**Résultat attendu** : cliquer sur `Négocier` pour un item rare/restreint ne contourne plus le jet obligatoire, et l’ordre UX devient cohérent avec l’issue.

### Étape 3 — Verrouiller la non-régression par des tests d’orchestration ciblés

**Fichiers** : `tests/applications/market/market-application.test.mjs`

**What** :

- Ajouter un mock dédié de `AvailabilityCheckDialog.prompt()` pour pouvoir piloter le résultat du jet dans les tests du flux Market.
- Ajouter au moins les cas ciblés suivants :
  - `negotiateItem` déclenche le check avant `NegotiationDialog` pour un item rare/restreint ;
  - `negotiateItem` s’arrête si le check est annulé ou échoue ;
  - `buyItem` conserve son comportement existant et ne subit pas de régression de séquencement.
- Prévoir la validation finale par `pnpm test` lors de l’implémentation, sans élargir le ticket à une refonte du moteur `availability-check`.

**Résultat attendu** : le bug anti-bypass est couvert par des tests applicatifs explicites et le comportement historique de `acheter` reste protégé.

## Périmètre / hors périmètre

### Inclus

- Orchestration commune du jet de disponibilité dans les handlers Market
- Application du contrôle au flux `négocier` avant ouverture de la négociation
- Tests ciblés sur l’ordre d’exécution et l’abandon du flux

### Exclus

- Changement des règles métier de `resolveAvailabilityCheck`
- Refonte de `AvailabilityCheckDialog`, `NegotiationDialog` ou du moteur de prix
- Modification du parcours de confirmation / conséquences hors besoin strict du correctif
