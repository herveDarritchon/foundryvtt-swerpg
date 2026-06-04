# Market — Brancher les modificateurs MJ globaux/par type au pricing d’affichage

**Issue** : [#542 — Market — Brancher les modificateurs MJ globaux/par type au pricing d’affichage](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/542)

**Domaine métier** : `market`

## Goal

Faire en sorte que le prix affiché dans le Market reflète réellement les modificateurs MJ globaux et par type déjà portés par la configuration métier, afin que le catalogue rende un `finalPrice` cohérent, explicable et stable sans logique de calcul dupliquée côté UI.

## Contexte utile

- Le moteur de prix Market est déjà le point canonique pour composer les modificateurs de prix et produire un `priceResult` consommé par l’UI.
- Le cadrage `plan-marketAdvancedGMConfiguration.prompt.md` prévoit explicitement deux familles de réglages MJ : un modificateur global et des modificateurs par type.
- Les plans Market récents distinguent bien le calcul métier du simple habillage visuel : cette issue doit brancher les modificateurs au pricing d’affichage, pas rouvrir le design de la table ni la configuration du panel MJ.

## Plan d’implémentation

### Étape 1 — Stabiliser la lecture des modificateurs MJ dans le contexte Market

**Fichiers** : `module/lib/market/market-settings.mjs`, `module/config/market.mjs`, `module/lib/market/price-engine.mjs`

**What** :

- formaliser le contrat lu par le pricing pour le modificateur global et le modificateur par type ;
- garantir des fallbacks déterministes (`0` / aucun modificateur) quand la configuration est absente, partielle ou invalide ;
- faire converger l’entrée du moteur de prix sur une seule source de vérité, sans calcul implicite dans l’application Market.

**Résultat attendu** : le moteur de prix sait toujours quels modificateurs MJ appliquer à un item donné, de manière pure et prévisible.

### Étape 2 — Brancher ces modificateurs sur le `priceResult` exposé au catalogue

**Fichiers** : `module/applications/market/market-application.mjs`, `module/lib/market/market-entry.mjs` _(ou helper Market équivalent)_, `templates/market/market.hbs` _(uniquement si le contrat d’affichage doit être ajusté)_

**What** :

- injecter le modificateur global et le modificateur du type d’item dans le contexte envoyé au moteur de prix ;
- vérifier que le `priceResult` utilisé pour l’affichage, le tri et le détail explicatif reflète bien la somme canonique des modificateurs ;
- conserver l’UI existante autant que possible, en ne touchant au template que si une information supplémentaire doit être rendue explicite.

**Résultat attendu** : une arme, une armure ou un équipement affiche désormais un prix final cohérent avec la configuration MJ globale + par type.

### Étape 3 — Verrouiller la non-régression sur calcul et exposition UI

**Fichiers** : `tests/lib/market/price-engine.test.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- couvrir les cas global seul, par type seul, cumul global + type, et type non configuré ;
- vérifier que les modificateurs apparaissent dans le `priceResult`/détail attendu et que le catalogue consomme bien `finalPrice` ;
- ajouter un test applicatif ciblé garantissant que le prix affiché d’une entrée Market change quand la configuration MJ change.

**Résultat attendu** : le branchement des modificateurs MJ au pricing d’affichage devient un contrat testé, sans régression silencieuse.

## Périmètre / hors périmètre

### Inclus

- lecture des modificateurs MJ globaux et par type pour le pricing Market ;
- branchement de ces modificateurs au `priceResult` affiché ;
- tests ciblés moteur + application.

### Exclus

- création/refonte du panel de configuration MJ ;
- refonte visuelle globale du Market ;
- changement des autres modificateurs métier (rareté, disponibilité, négociation) hors impact direct de composition.
