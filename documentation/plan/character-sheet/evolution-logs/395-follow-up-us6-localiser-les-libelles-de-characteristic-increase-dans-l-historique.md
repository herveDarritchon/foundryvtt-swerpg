# Plan d'implémentation — Follow-up US6 : localiser les libellés de `characteristic.increase` dans l'historique

**Issue** : [#395 — Follow-up US6: localiser les libelles de characteristic.increase dans l'historique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/395)
**Lié à** : [#156 — US6: Consulter l'historique d'évolution du personnage depuis sa fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/156), [#153 — US3: Tracer les augmentations de caractéristiques](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/153)

## Objectif

Faire en sorte que les entrées `characteristic.increase` du journal d'évolution affichent systématiquement un libellé de caractéristique localisé et lisible, sans modifier le format des logs persistés.

## Plan d'implémentation

### 1. Fiabiliser la résolution du libellé au rendu

**Fichiers pressentis** : `module/applications/character-audit-log.mjs`

- Vérifier le chemin de résolution utilisé pour transformer `data.characteristicId` en libellé localisé.
- Aligner cette résolution sur la source canonique des caractéristiques déjà exposée par la configuration système.
- Conserver un fallback sûr pour les IDs absents ou inconnus afin d'éviter tout affichage cassé dans l'historique.

### 2. Sécuriser la couverture de tests ciblée

**Fichiers pressentis** : `tests/applications/character-audit-log.test.mjs`

- Ajouter un test qui vérifie qu'une entrée `characteristic.increase` affiche le libellé localisé attendu au lieu de l'identifiant brut.
- Ajouter un test de fallback quand `characteristicId` est absent ou non reconnu.
- Vérifier que le correctif reste limité au rendu du journal et n'introduit pas de dépendance à une migration de données.

## Résultat attendu

- L'historique affiche un nom de caractéristique localisé pour `characteristic.increase`.
- Les logs stockés dans `flags.swerpg.logs` restent inchangés.
- Le comportement est verrouillé par des tests unitaires ciblés.
