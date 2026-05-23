## MSM3 — Acheter une spécialisation avec coût prévisualisé et blocages explicites

### Contexte

Issue : [#355 — MSM3 - Acheter une spécialisation avec coût prévisualisé et blocages explicites](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/355)

Parent : [#352 — Multi-Specialization Management - Gérer ajout, synthèse et suppression des spécialisations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/352)

Dépendance : [#353 — MSM1 - Stabiliser le contrat métier des spécialisations et de l'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/353)

L'existant route le drop d'une spécialisation dans `CharacterSheet` vers `actor.system.applySpecialization(item)`, qui
délègue ensuite au flux générique `_applyDetailItem(...)`. Ce chemin ne couvre ni le refus de doublon, ni le contrôle
d'XP, ni la confirmation avec prévisualisation, et il risque de rejouer des effets de création incompatibles avec
l'ajout post-création.

### Objectif

Brancher sur la feuille personnage un flux d'ajout de spécialisation par drag'n drop qui applique les règles MSM1,
refuse explicitement les cas bloquants, confirme les achats payants avec aperçu du coût, et persiste l'ajout sans
attribuer de rangs gratuits de compétences.

### Périmètre

#### Inclus

- validation métier du drop de spécialisation sur la fiche personnage ;
- détection de doublon, calcul du coût et contrôle d'XP disponible ;
- confirmation utilisateur pour les achats `1 -> 2+` avec coût et XP restante ;
- persistance de la spécialisation et décrément d'XP après confirmation ;
- messages `ui.notifications.warn` localisés FR/EN ;
- couverture unitaire du service et du flux principal de drop.

#### Exclus

- implémentation dans `SpecializationTreeApp` ;
- ajout/suppression depuis la sidebar ou un autre point d'entrée UI ;
- attribution de rangs gratuits de compétences de spécialisation ;
- refonte générale du modèle de carrière ou de l'arbre de spécialisation au-delà du strict support du flux.

### Fichiers pressentis

| Fichier                                                       | Rôle                                                                              |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `module/lib/specializations/owned-specializations.mjs`        | Réutiliser/compléter la détection de spécialisation déjà possédée                 |
| `module/lib/specializations/specialization-cost-service.mjs`  | Réutiliser le calcul de coût MSM1 pour la prévisualisation                        |
| `module/lib/specializations/specialization-purchase-flow.mjs` | Nouveau service métier pur de validation, preview et résultat d'achat             |
| `module/models/character.mjs`                                 | Introduire un point d'entrée dédié à l'acquisition post-création                  |
| `module/applications/sheets/character-sheet.mjs`              | Brancher le drop `specialization` sur le nouveau flux au lieu du raccourci actuel |
| `lang/en.json` / `lang/fr.json`                               | Ajouter les messages de refus et de confirmation                                  |
| `tests/lib/specializations/*.test.mjs`                        | Couvrir calcul, blocages et preview métier                                        |
| `tests/applications/sheets/character-sheet-talents.test.mjs`  | Vérifier le flux de drop, les warnings et la confirmation                         |
| `tests/models/character-specializations.test.mjs`             | Verrouiller l'absence de rangs gratuits dans ce flux                              |

### Plan d'implémentation

#### Étape 1 — Formaliser un contrat métier de validation et de prévisualisation

**Fichiers :** `module/lib/specializations/specialization-purchase-flow.mjs`,
`module/lib/specializations/owned-specializations.mjs`, `module/lib/specializations/specialization-cost-service.mjs`

1. Introduire un service pur qui reçoit l'acteur, la spécialisation candidate et le snapshot métier des spécialisations
   possédées.
2. Y centraliser les décisions : `free-add`, `confirm-required`, `blocked-duplicate`, `blocked-insufficient-xp`.
3. Retourner un résultat stable avec au minimum : spécialisation ciblée, type carrière/hors carrière, coût XP, XP
   disponible, XP restante, raison de blocage éventuelle et patch métier attendu.
4. Fiabiliser la détection de doublon à partir de `specializationId`, `treeUuid`, puis du nom en fallback contrôlé.

#### Étape 2 — Brancher le flux de drop et persister l'achat sans rejouer la création

**Fichiers :** `module/applications/sheets/character-sheet.mjs`, `module/models/character.mjs`

1. Remplacer le `applySpecialization(item)` direct du drop par un point d'entrée dédié au flux d'acquisition
   post-création.
2. Pour `0 -> 1`, ajouter immédiatement la spécialisation sans dialogue ni dépense d'XP.
3. Pour `1 -> 2+`, afficher une confirmation `DialogV2` avec le nom, le statut carrière/hors carrière, le coût, l'XP
   disponible et l'XP restante ; après validation, appliquer l'ajout et la dépense d'XP via `actor.update()` /
   `document.update()`.
4. Refuser les doublons et l'XP insuffisante via `ui.notifications.warn` localisés.
5. Isoler ce flux du comportement de création afin que l'ajout n'accorde aucun rang gratuit de compétence de
   spécialisation.

#### Étape 3 — Ajouter les messages i18n et verrouiller les cas nominaux et bloquants

**Fichiers :** `lang/en.json`, `lang/fr.json`, `tests/lib/specializations/*.test.mjs`,
`tests/applications/sheets/character-sheet-talents.test.mjs`, `tests/models/character-specializations.test.mjs`

1. Ajouter les clés FR/EN pour les warnings de doublon, d'XP insuffisante et pour le contenu/titre de confirmation.
2. Couvrir le service métier sur les cas : `0 -> 1` gratuit, doublon refusé, XP insuffisante refusée, achat carrière
   confirmé, achat hors carrière confirmé.
3. Ajouter des tests du flux feuille personnage garantissant : pas de dialogue sur `0 -> 1`, dialogue sur `1 -> 2+`,
   aucune mutation après annulation, décrément XP après confirmation.
4. Verrouiller explicitement qu'aucun rang gratuit de compétence n'est attribué lors de ce chemin d'ajout.

### Définition de done

- [ ] Un drop de première spécialisation ajoute la spécialisation gratuitement sans confirmation.
- [ ] Un doublon est refusé avec un message utilisateur explicite et localisé.
- [ ] Une spécialisation supplémentaire sans XP suffisante est refusée avec un message explicite et localisé.
- [ ] Une spécialisation supplémentaire avec XP suffisante affiche une confirmation avec coût et XP restante.
- [ ] Après confirmation, la spécialisation est ajoutée et l'XP est décrémentée ; après annulation, rien n'est modifié.
- [ ] Ce flux n'accorde aucun rang gratuit de compétence de spécialisation.
