# MC2 — Extraire les seuils du moteur de dés et du combat

**Issue** : [#410 — MC2 — Extraire les seuils du moteur de dés et du combat](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/410)

## Objectif

Nommer et centraliser les seuils métier encore codés en dur dans le moteur de jet standard et la préparation des attaques de combat, afin d’aligner ces règles avec ADR-0018 et d’éviter que les mêmes valeurs critiques restent dispersées entre configuration, résolution de jet et combat.

## Décisions de cadrage

- Limiter le chantier aux seuils explicitement visibles et partagés entre moteur de dés et combat : au minimum les seuils critiques par défaut (`6`) et les overrides combat liés aux propriétés d’arme (`4`).
- Réutiliser `module/config/dice.mjs` comme point d’entrée canonique pour ces constantes, puis les exposer via `module/config/system.mjs` sans refonte plus large de l’API publique.
- Exclure du périmètre les autres nombres de combat qui ne sont pas des seuils de résolution de jet prouvés par l’issue (progression, dégâts, round flow, heroism, etc.).
- Ne pas changer le comportement fonctionnel : seul le point de vérité des seuils est déplacé vers des constantes nommées.

## Étapes d’implémentation

### 1. Poser les constantes de seuils du moteur de dés

**Fichiers cibles** : `module/config/dice.mjs`, `module/config/system.mjs`

**What**

- ajouter des constantes nommées pour les seuils critiques standards et les variantes combat ;
- exposer ces constantes dans la surface système déjà utilisée par le moteur de dés ;
- documenter clairement la sémantique de chaque seuil (critique par défaut, critique succès arme, critique échec arme).

**Validation visée** : les seuils métier ciblés sont accessibles via une configuration stable et lisible, sans littéral métier anonyme.

### 2. Remplacer les magic numbers dans la résolution de jet et l’attaque

**Fichiers cibles** : `module/dice/standard-check.mjs`, `module/documents/actor-mixins/combat/attack.mixin.mjs`

**What**

- remplacer les fallback `6` du `StandardCheck` par les constantes dédiées ;
- remplacer les seuils `4`/`6` injectés lors de la préparation d’une attaque d’arme par les mêmes constantes ;
- conserver strictement les comparaisons et règles existantes (`> dc + seuil`, `< dc - seuil`).

**Validation visée** : le moteur de dés et la préparation des attaques réutilisent la même source de vérité pour les seuils critiques.

### 3. Verrouiller le contrat par des tests ciblés

**Fichiers cibles** : `tests/config/dice.test.mjs` (nouveau si absent), `tests/module/dice/standard-check.test.mjs`, `tests/documents/actor-combat-attack.test.mjs` ou test ciblé équivalent

**What**

- ajouter un test contractuel sur les constantes exportées ;
- verrouiller les seuils par défaut du `StandardCheck` ;
- couvrir la préparation d’attaque pour garantir les overrides attendus selon les propriétés d’arme concernées.

**Validation visée** : toute réintroduction future de seuils critiques codés en dur devient observable et détectable.

## Résultat attendu

- Les seuils critiques du moteur de dés et des attaques de combat sont nommés et centralisés.
- `standard-check` et `attack.mixin` ne portent plus de littéraux métier `4`/`6` pour ces règles.
- Le comportement de résolution reste inchangé ; seule la source de vérité des seuils est consolidée.
