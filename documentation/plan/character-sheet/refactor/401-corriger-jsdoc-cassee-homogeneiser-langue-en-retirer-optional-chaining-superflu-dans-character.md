# Plan — Corriger la JSDoc cassée, homogénéiser la langue EN et retirer l'optional chaining superflu dans `character.mjs`

**Issue** : [#401 — Chore: corriger JSDoc cassé, homogénéiser langue EN, retirer optional chaining superflu dans character.mjs](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/401)

## Décision de périmètre

- **À faire** : réparer uniquement la JSDoc invalide ou incohérente dans `module/models/character.mjs`, homogénéiser en anglais les commentaires/JSDoc ciblés, et supprimer les usages d'optional chaining manifestement redondants quand le contrat local garantit déjà la présence de l'objet.
- **À ne pas faire** : ne pas changer le comportement métier de `SwerpgCharacter`, ne pas lancer de refactor transverse sur d'autres modèles, ne pas réécrire toute la documentation du fichier hors zones concernées.
- **Hypothèse retenue** : l'issue est un chantier de qualité locale et de lisibilité statique, sans impact fonctionnel attendu.

## Fichiers impactés

| Fichier | Nature du changement |
| --- | --- |
| `module/models/character.mjs` | Nettoyage JSDoc/commentaires et simplification syntaxique locale sans changement métier |

## Étapes

### 1. Réparer la JSDoc cassée dans `character.mjs`

- Localiser les blocs JSDoc invalides, incomplets ou désalignés avec les signatures réellement exposées.
- Corriger la syntaxe (`@param`, `@returns`, types, fermeture de bloc) sans introduire de nouveau contrat métier.
- Vérifier que chaque bloc documente le comportement réel actuel, pas une intention future.

### 2. Homogénéiser la documentation locale en anglais

- Réécrire uniquement les commentaires et JSDoc français ou mixtes dans les zones touchées pour converger vers un anglais technique cohérent.
- Conserver inchangés les noms d'API, champs métier, clés i18n et vocabulaires fonctionnels déjà établis.
- Employer une terminologie stable pour un même concept sur l'ensemble des sections nettoyées.

### 3. Retirer l'optional chaining superflu

- Identifier les accès où la présence de l'objet est déjà garantie par le flux local, le schéma ou une garde préalable.
- Remplacer uniquement les `?.` redondants par des accès directs lorsque l'absence n'est pas un état supporté par le contrat local.
- Laisser en place tout optional chaining qui protège réellement un cas nullable ou legacy afin d'éviter une régression involontaire.

## Points de vigilance

- Un `?.` n'est superflu que si la garantie de présence est démontrée ; en cas de doute, conserver la protection.
- Une JSDoc syntaxiquement correcte mais sémantiquement fausse reste un défaut : l'alignement avec le code réel prime.
- Ne pas élargir ce nettoyage local à un chantier global de style ou de documentation sur tout `module/models/`.

## Résultat attendu

- `module/models/character.mjs` ne contient plus de JSDoc cassée dans le périmètre de l'issue.
- Les commentaires et JSDoc touchés sont homogènes en anglais.
- Les optional chaining redondants visés par l'issue sont retirés sans changement de comportement observable.
