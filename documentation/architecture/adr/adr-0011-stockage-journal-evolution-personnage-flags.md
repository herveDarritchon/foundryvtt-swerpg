# ADR-0011 — Stockage du journal d’évolution du personnage dans les flags

## Statut

Accepté — Contrat de confiance explicité (issue #562, 2026-06-06)

## Contexte

Le système doit pouvoir conserver une trace des principales modifications réalisées sur un personnage.

Ces traces doivent permettre de comprendre l’évolution du personnage dans le temps, notamment :

- choix structurants à la création du personnage ;
- choix d’espèce ;
- choix de carrière ;
- choix de spécialisation ;
- dépenses d’expérience ;
- achat de niveaux de compétence ;
- revente de niveaux de compétence ;
- autres modifications importantes utiles au suivi ou au debug.

Ce journal a une vocation de suivi, d’audit et de debug.

Il ne constitue pas la source de vérité du personnage.
La source de vérité reste l’état courant de l’acteur.

## Décision

Le journal d’évolution du personnage sera stocké dans les flags de l’acteur, dans le namespace du système.

Cible logique :

```txt
actor.flags.swerpg.logs
```

Chaque entrée du journal représente une modification significative du personnage.

## Raisons de la décision

Le journal est une donnée secondaire du système.

Il sert à comprendre, auditer ou diagnostiquer l’évolution d’un personnage, mais il ne doit pas piloter directement les règles ni remplacer les données principales de l’acteur.

Le stockage dans les flags est donc retenu car il permet :

- de conserver les logs directement sur l’acteur ;
- de ne pas modifier le modèle principal du personnage ;
- d’éviter une migration du data model ;
- de faire évoluer progressivement la structure des logs ;
- de garder cette trace séparée des données cœur du système.

## Option écartée — Stockage dans `actor.system.logs`

Le stockage dans `actor.system.logs` n’est pas retenu.

Cette option aurait rendu le journal partie intégrante du modèle métier du personnage.

Elle serait pertinente si le journal était une donnée centrale du système, utilisée comme source de vérité ou comme élément structurant du calcul du personnage.

Ce n’est pas le cas ici.

Cette option impliquerait davantage de rigidité, une maintenance plus forte du modèle de données et de potentielles migrations.

## Conséquences

### Positives

Le journal peut être ajouté sans impact lourd sur le modèle de personnage.

La solution est adaptée à un besoin de trace, d’audit et de debug.

Les logs restent attachés au personnage et persistent avec lui.

La structure peut évoluer plus facilement au fil des besoins.

Le risque technique est limité.

### Négatives

La structure des logs est moins fortement contrôlée qu’une donnée déclarée dans le modèle système.

Il faudra maintenir une convention claire pour éviter des entrées incohérentes.

Le journal ne doit pas être utilisé pour recalculer automatiquement l’état du personnage.

## Règles de conception

Chaque entrée de log doit correspondre à une seule modification du personnage.

Chaque entrée doit permettre d’identifier au minimum :

- la date de l’action ;
- l’utilisateur ayant déclenché l’action ;
- le personnage concerné ;
- le type d’action ;
- une description lisible ;
- les données utiles à la compréhension de la modification.

Les logs doivent rester exploitables pour générer un compte rendu lisible de l’évolution du personnage.

## Règles d’usage

Le journal peut être utilisé pour :

- afficher un historique d’évolution du personnage ;
- comprendre les dépenses et remboursements d’expérience ;
- diagnostiquer une anomalie de progression ;
- produire un compte rendu de création ou d’évolution.

Le journal ne doit pas être utilisé comme source principale de vérité.

L’état actuel de l’acteur reste la référence.

## Décision finale

Le journal d’évolution du personnage est stocké dans :

```txt
actor.flags.swerpg.logs
```

Il s’agit d’une donnée secondaire, destinée au suivi, à l’audit et au debug, et non d’une donnée cœur du modèle personnage.

---

## Contrat de confiance — Niveau indicatif (décision issue #562, AUDIT-03)

### Décision

Le journal est **indicatif** : il est consultable et exportable, mais **non inviolable**.

Un propriétaire d’acteur (rôle OWNER) peut techniquement modifier ou purger ses propres entrées via l’API Foundry (`actor.setFlag`, console développeur, voire désactivation du module). Le système ne met pas en place de stockage protégé côté serveur ou MJ dans ce cycle.

### Critères retenus

| Critère           | Valeur retenue                                           |
| ----------------- | -------------------------------------------------------- |
| Qui écrit         | L’utilisateur déclencheur de la modification (userId)    |
| Où est stocké     | `flags.swerpg.logs` sur l’acteur (côté client/joueur)    |
| Qui peut modifier | Le propriétaire OWNER (non bloqué par le système)        |
| Niveau de preuve  | Indicatif — outil de suivi, pas une preuve infalsifiable |

### Conséquences sur la surface utilisateur

Toute formulation visible dans l’UI ou la documentation doit rester cohérente avec ce contrat :

- Le journal est un **outil de suivi** et de **consultation** de l’évolution du personnage.
- Il **ne constitue pas une preuve** de la conformité des dépenses d’expérience ou de crédits.
- Le MJ peut s’appuyer sur ce journal à titre indicatif, mais ne doit pas en faire une source d’arbitrage définitive.

### Voie future possible (hors périmètre de cette décision)

Un durcissement ultérieur pourrait consister à stocker le journal dans un document de monde accessible uniquement au MJ, ou à implémenter un hash de chaînage anti-falsification. Ce travail est à inscrire explicitement en backlog (AUDIT-03 future) et ne doit pas être promis implicitement par l’interface actuelle.
