# Achat simple depuis le Market (crédits, vérification, inventaire)

**Issue** : [#457 — Achat simple depuis le Market (crédits, vérification, inventaire)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/457)

**Dépend sur** : [#456 — Moteur de prix avec modificateurs (rareté, disponibilité, contexte)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/456) ✅ bloquant déclaré par l’issue

## Objectif

Permettre à un personnage d’acheter réellement un item depuis la fenêtre Market en utilisant le prix final canonique, avec contrôle des crédits, confirmation utilisateur, ajout d’une copie dans l’inventaire et feedback clair en succès comme en échec.

## Décisions de cadrage

- `system.credits` devient un champ persistant de `SwerpgCharacter` uniquement, entier `>= 0`, valeur par défaut `0`.
- Le Market doit connaître explicitement l’acteur acheteur ; sans acteur courant, le catalogue peut rester consultatif mais l’action d’achat est indisponible.
- Le montant facturé est toujours `entry.priceResult.finalPrice` ; aucun recalcul de prix n’est autorisé côté template ou dialogue.
- L’achat crée une copie embarquée de l’item source dans l’inventaire du personnage ; l’item du monde reste inchangé.
- Les mutations ne partent qu’après validation complète (acteur présent, item résolvable, crédits suffisants) ; en échec, aucun changement n’est appliqué.
- Faute de règle canonique déjà formalisée pour « quantité suffisante déjà possédée », cette tranche se limite à vérifier la solvabilité et la validité de la source ; la gestion métier des doublons/stock devra faire l’objet d’une issue dédiée si elle doit devenir bloquante.

## Étapes d’implémentation

### 1. Ajouter les crédits au modèle personnage et les exposer sur la feuille

**Fichiers cibles** : `module/models/character.mjs`, `templates/sheets/actor/character-header.hbs` (ou `inventory.hbs` si le placement est jugé plus cohérent), `lang/en.json`, `lang/fr.json`, tests modèle/feuille ciblés.

**What**

- ajouter `system.credits` au schéma `SwerpgCharacter` avec contraintes entières et borne basse à `0` ;
- afficher ce champ sur la feuille `character`, avec libellé localisé et édition conforme au contrat de permissions attendu pour le MJ ;
- préparer le contexte/markup nécessaire pour réutiliser cette valeur dans les flows Market sans logique dupliquée.

**Validation visée** : un personnage possède un solde de crédits persistant, visible et éditable sur sa feuille.

### 2. Porter l’acteur acheteur dans le flow d’ouverture du Market et préparer l’UI d’achat

**Fichiers cibles** : `swerpg.mjs`, `module/applications/sheets/character-sheet.mjs`, `module/applications/market/market-application.mjs`, `templates/market/market.hbs`.

**What**

- faire évoluer `openMarket()` pour accepter l’acteur courant lors de l’ouverture depuis la feuille de personnage ;
- stocker/rafraîchir ce contexte acheteur dans `MarketApplicationV2`, malgré le singleton existant ;
- exposer dans le contexte du catalogue les informations nécessaires à l’achat (`currentActor`, `currentCredits`, `finalPrice`, état `canBuy` / raison de blocage) ;
- ajouter l’affordance UI `buyItem` par entrée achetable, avec état désactivé ou masqué quand aucun acteur acheteur valide n’est disponible.

**Validation visée** : le Market sait pour quel personnage il travaille et peut rendre un bouton d’achat cohérent par ligne.

### 3. Implémenter la validation d’achat, la confirmation et la séquence de mutation

**Fichiers cibles** : `module/lib/market/purchase.mjs` (nouveau), `module/lib/market/index.mjs`, `module/applications/market/market-application.mjs`, `lang/en.json`, `lang/fr.json`.

**What**

- extraire un helper métier pur qui valide un achat (`acteur`, `entrée`, `prix`) et retourne un résultat explicite avec raisons d’échec machine-readable ;
- ouvrir un dialogue de confirmation affichant item, prix final, crédits actuels et reste après achat ;
- sur confirmation, re-résoudre l’item source, déduire les crédits du personnage, créer une copie de l’item dans son inventaire et afficher un message de succès localisé ;
- en cas d’erreur (`acteur absent`, `crédits insuffisants`, `item introuvable`, écriture refusée), afficher un message clair et ne rien modifier.

**Validation visée** : un achat réussi débite le bon montant et ajoute la copie d’item ; un achat refusé laisse l’état du personnage inchangé.

### 4. Verrouiller le flux par des tests ciblés

**Fichiers cibles** : `tests/lib/market/purchase.test.mjs` (nouveau), `tests/applications/market/market-application.test.mjs`, `tests/applications/sheets/character-sheet-market.test.mjs`, éventuel test modèle personnage ciblé.

**What**

- couvrir le helper métier sur les cas `succès`, `acteur manquant`, `crédits insuffisants`, `source manquante` ;
- couvrir l’application Market sur l’injection de l’acteur acheteur, l’affichage/état du bouton `Acheter`, la confirmation et l’absence de mutation en échec ;
- couvrir la feuille de personnage sur le passage explicite de l’acteur courant à `openMarket()`.

**Validation visée** : le flux d’achat est couvert de bout en bout par des tests unitaires ciblés et non ambigus.

## Résultat attendu

- `SwerpgCharacter` possède un champ `system.credits` persistant et visible en feuille.
- Le Market ouvert depuis une feuille de personnage connaît l’acheteur courant.
- Chaque entrée achetable peut proposer un achat confirmé avec résumé financier.
- Un achat réussi déduit les crédits et ajoute une copie propre de l’item à l’inventaire.
- Un achat impossible n’altère rien et affiche un message d’échec compréhensible.
