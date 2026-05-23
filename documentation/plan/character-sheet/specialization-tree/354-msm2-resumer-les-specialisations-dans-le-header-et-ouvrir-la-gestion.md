## MSM2 — Résumer les spécialisations dans le header et ouvrir la gestion

### Contexte

Issue : [#354 — MSM2 - Résumer les spécialisations dans le header et ouvrir la gestion](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/354)

Parent : [#352 — Multi-Specialization Management - Gérer ajout, synthèse et suppression des spécialisations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/352)

Dépendance : [#353 — MSM1 - Stabiliser le contrat métier des spécialisations et de l'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/353)

L'existant expose déjà `specializationNames`, `specializationCount` et `specializationDisplayName` dans `CharacterSheet`, mais le header affiche encore une concaténation complète peu compacte et l'action `editSpecializations` ouvre la vue détail en lecture seule au lieu de la gestion via `SpecializationTreeApp`.

L'issue demande un affichage compact avec trois états métier/UI :

- `0` spécialisation : afficher une valeur i18n dédiée (`No specialization`) ;
- `1` spécialisation : afficher uniquement son nom ;
- `2+` spécialisations : afficher le nom de la première et une pastille `+N` avec tooltip listant les spécialisations supplémentaires.

### Objectif

Rendre la synthèse des spécialisations immédiatement lisible dans le header de la fiche personnage, sans casser le layout desktop existant, et faire du clic sur le bloc spécialisation un point d'entrée direct vers `SpecializationTreeApp` avec l'arbre courant ou le dernier arbre disponible.

### Périmètre

#### Inclus

- préparation d'un view-model de résumé pour le header personnage ;
- rendu Handlebars des états `0 / 1 / N` avec structure HTML cible de l'issue ;
- tooltip de la pastille `+N` pour les spécialisations additionnelles ;
- branchement de `editSpecializations` vers `openSpecializationTreeApp()` ;
- ajout des clés i18n FR/EN nécessaires ;
- tests de contexte et d'action utilisateur.

#### Exclus

- ajout/suppression effective de spécialisations ;
- modification des règles métier de coût ou de sélection d'arbre ;
- refonte large du header personnage hors bloc spécialisation ;
- refonte de `SpecializationTreeApp` elle-même, sauf adaptation minimale prouvée par le besoin de fallback d'ouverture.

### Fichiers pressentis

| Fichier                                                               | Rôle                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `module/applications/sheets/character-sheet.mjs`                      | Construire le résumé compact consommé par le header                        |
| `templates/sheets/actor/character-header.hbs`                         | Rendre les états `0 / 1 / N`, la pastille `+N` et le tooltip               |
| `styles/actor.less`                                                   | Ajuster au besoin l'alignement léger du libellé primaire et badge          |
| `lang/en.json` / `lang/fr.json`                                       | Ajouter `No specialization` et le texte/format du tooltip                  |
| `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`   | Verrouiller le view-model header pour 0, 1, 2 et 3 spécialisations         |
| `tests/applications/sheets/character-sheet-talents.test.mjs` ou ciblé | Verrouiller l'action `editSpecializations` → `openSpecializationTreeApp()` |

### Plan d'implémentation

#### Étape 1 — Préparer un résumé de spécialisations dédié au header

**Fichiers :** `module/applications/sheets/character-sheet.mjs`

1. Dériver depuis `actor.system.details.specializations` un bloc explicite de type `specializationHeader`, plutôt que de laisser le template parser une chaîne concaténée.
2. Y exposer au minimum : `primaryName`, `extraCount`, `extraNames`, `hasExtraSpecializations`, `displayName`, `badgeLabel` et une valeur de fallback i18n pour l'état vide.
3. Conserver les champs déjà utilisés ailleurs (`specializationNames`, `specializationCount`) tant qu'ils servent encore de compatibilité locale, afin d'éviter une régression inutile hors header.

#### Étape 2 — Rendre le bloc compact et rediriger le clic vers la gestion

**Fichiers :** `templates/sheets/actor/character-header.hbs`, `module/applications/sheets/character-sheet.mjs`, `styles/actor.less`

1. Remplacer l'affichage textuel actuel par la structure cible de l'issue : libellé principal + badge `+N` conditionnel dans le bloc `data-action='editSpecializations'`.
2. Afficher la pastille uniquement quand `extraCount > 0` et lui associer un tooltip listant les spécialisations additionnelles déjà préparées côté contexte.
3. Réaligner `#onEditSpecializations()` sur `this.actor.openSpecializationTreeApp()` au lieu de `_viewDetailItem(...)`.
4. Vérifier que l'ouverture s'appuie bien sur le comportement existant de `SpecializationTreeApp` : arbre courant si déjà sélectionné, sinon dernier / premier arbre disponible sans logique métier dupliquée dans la fiche.
5. Ajouter uniquement le CSS minimal nécessaire si la badge ou l'espacement ne sont pas correctement portés par les styles du header actuels.

#### Étape 3 — Ajouter les clés i18n et verrouiller les cas limites

**Fichiers :** `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs` ou équivalent ciblé

1. Ajouter les clés i18n nécessaires pour l'état sans spécialisation et pour le tooltip des spécialisations supplémentaires.
2. Couvrir les cas de résumé header pour `0`, `1`, `2` et `3` spécialisations, en vérifiant le nom primaire, le compteur `+N` et le contenu des spécialisations additionnelles.
3. Ajouter un test d'action garantissant que `editSpecializations` délègue désormais à `openSpecializationTreeApp()`.
4. Vérifier que le comportement incomplet (`incomplete.specialization`) reste inchangé quand aucune spécialisation n'est possédée.

### Définition de done

- [ ] Le header affiche une valeur i18n dédiée quand le personnage n'a aucune spécialisation.
- [ ] Avec une seule spécialisation, seul son nom est affiché.
- [ ] Avec plusieurs spécialisations, le header affiche `nom principal +N` et la pastille expose le détail des spécialisations restantes.
- [ ] Le clic sur le bloc spécialisation ouvre `SpecializationTreeApp` au lieu de la vue détail read-only.
- [ ] Les tests couvrent les états `0 / 1 / 2 / 3` et la nouvelle délégation d'action.
