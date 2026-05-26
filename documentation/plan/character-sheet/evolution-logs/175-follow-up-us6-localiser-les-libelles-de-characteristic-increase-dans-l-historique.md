# Plan d'implémentation — Follow-up US6 : localiser les libellés de `characteristic.increase` dans l'historique

**Issue** : [#175 — Follow-up US6: localiser les libellés de characteristic.increase dans l'historique](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/175)
**Lié à** : [#156 — US6: Consulter l'historique d'évolution du personnage depuis sa fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/156), [#153 — US3: Tracer les augmentations de caractéristiques](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/153)

## Objectif

Afficher, dans le journal d'évolution, un libellé de caractéristique localisé pour les entrées `characteristic.increase`, au lieu de l'identifiant technique brut (`brawn`, `agility`, etc.), sans modifier les logs persistés.

## Périmètre

- Résolution du libellé au rendu à partir des clés/caractéristiques déjà définies par le système.
- Fallback sûr si `characteristicId` est absent ou inconnu.
- Couverture de tests ciblée sur le rendu de l'historique.

## Étapes d'implémentation

### 1. Corriger la résolution du nom de caractéristique au rendu

**Fichiers pressentis** : `module/applications/character-audit-log.mjs`

- Remplacer l'injection directe de `data.characteristicId` dans la description par une résolution vers le libellé canonique de la caractéristique.
- Réutiliser la source métier/i18n déjà présente dans le système pour éviter tout mapping local ad hoc.
- Conserver la génération de description côté UI, conformément au plan US6 existant.

### 2. Sécuriser le fallback et l'alignement i18n

**Fichiers pressentis** : `module/applications/character-audit-log.mjs`, `lang/en.json`, `lang/fr.json` (uniquement si une clé réellement nécessaire est manquante)

- Vérifier que les six caractéristiques disposent déjà des clés exploitables pour l'affichage localisé.
- En cas d'identifiant inconnu ou vide, conserver le fallback métier existant plutôt qu'un libellé cassé.
- Ne pas ajouter de donnée dérivée dans `flags.swerpg.logs`.

### 3. Ajouter la couverture de tests ciblée

**Fichiers pressentis** : `tests/applications/character-audit-log.test.mjs`

- Ajouter un cas `characteristic.increase` qui vérifie que la description affiche un libellé localisé et non l'identifiant brut.
- Ajouter un cas de fallback pour un `characteristicId` inconnu ou absent.
- Prévoir la vérification ciblée des tests de l'application d'historique lors de l'implémentation.

## Résultat attendu

- Une entrée `characteristic.increase` affiche un nom de caractéristique lisible et localisé dans l'historique.
- Aucun changement du format des logs stockés.
- Le correctif reste limité au rendu du journal et à ses tests ciblés.
