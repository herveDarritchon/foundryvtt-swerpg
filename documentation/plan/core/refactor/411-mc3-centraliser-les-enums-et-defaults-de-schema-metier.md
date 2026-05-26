# MC3 — Centraliser les enums et defaults de schéma métier

**Issue** : [#411 — MC3 — Centraliser les enums et defaults de schéma métier](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/411)

## Objectif

Centraliser les dernières valeurs textuelles métier encore codées en dur dans les schémas DataModel et les documents de combat, afin d’aligner ces defaults et discriminants avec ADR-0018 et d’éviter que les mêmes enums restent dispersés entre `module/models/`, `module/documents/` et `module/config/`.

## Décisions de cadrage

- Limiter le chantier aux chaînes explicitement citées par l’issue et aux entités listées : `weapon`, `action`, `physical`, `adversary`, `species`, `actor` et mixins de combat.
- Réutiliser les points d’entrée config existants (`module/config/weapon.mjs`, `module/config/action.mjs`, `module/config/items.mjs`, `module/config/adversaries.mjs`) et créer uniquement les modules métier manquants si aucune surface canonique `SYSTEM.*` n’existe déjà.
- Exposer les registres via `SYSTEM.*` et utiliser `Object.defineProperty` dès qu’une constante doit rester non énumérable sur un objet parcouru par des consommateurs.
- Ne pas transformer ce refactor en refonte de taxonomie, d’i18n ou de règles de combat : seul le point de vérité des enums/defaults change.

## Étapes d’implémentation

### 1. Poser les registres métier et defaults canoniques

**Fichiers cibles** : `module/config/weapon.mjs`, `module/config/action.mjs`, `module/config/items.mjs`, `module/config/adversaries.mjs`, `module/config/system.mjs`, modules de config manquants éventuels pour `species` / `actor` / `physical`

**What**

- nommer les enums et defaults métier encore en dur (`rangedLight`, `medium`, `single`, `standard`, `none`, `normal`, `physical`, `health`, `restricted`, `mainhand`, etc.) ;
- organiser ces constantes par entité métier plutôt que dans un registre générique unique ;
- exposer chaque registre sur la surface `SYSTEM.*` déjà cohérente avec son domaine.

**Validation visée** : chaque valeur métier ciblée est adressable via une constante nommée et un point d’entrée `SYSTEM.*` stable.

### 2. Remplacer les littéraux métier dans les modèles et documents

**Fichiers cibles** : `module/models/weapon.mjs`, `module/models/action.mjs`, `module/models/physical.mjs`, `module/models/adversary.mjs`, `module/models/species.mjs`, `module/documents/actor.mjs`, `module/documents/actor-mixins/combat/attack.mixin.mjs`, `module/documents/actor-mixins/combat/defense.mixin.mjs`

**What**

- remplacer les defaults de schéma et discriminants textuels par les constantes introduites à l’étape 1 ;
- aligner les mixins de combat et `actor.mjs` sur les mêmes slots, états et types de dégâts que les modèles ;
- conserver strictement le comportement actuel, sans modifier les règles métier ni les valeurs par défaut effectives.

**Validation visée** : les modèles et documents couverts par l’issue ne portent plus de magic strings métier pour les cas ciblés.

### 3. Verrouiller le contrat par des tests ciblés

**Fichiers cibles** : `tests/config/` pour les nouveaux registres ou registres enrichis, plus tests ciblés des modèles/documents impactés

**What**

- ajouter des tests contractuels sur les constantes exportées et leur exposition via `SYSTEM.*` ;
- couvrir au minimum un cas représentatif par entité pour garantir que les defaults de schéma et les discriminants consomment bien les constantes ;
- verrouiller les cas combat sensibles (slot d’arme, état par défaut, type de dégât/défense) afin de détecter toute réintroduction future de littéraux métier.

**Validation visée** : la centralisation des enums/defaults devient observable, testée et protégée contre les régressions ADR-0018 sur ce périmètre.

## Résultat attendu

- Les enums et defaults métier listés par l’issue sont centralisés dans des modules `module/config/` dédiés et exposés via `SYSTEM.*`.
- Les DataModel et documents de combat ciblés consomment ces constantes au lieu de chaînes métier codées en dur.
- Le comportement fonctionnel reste inchangé ; seule la source de vérité des valeurs métier est consolidée.
