## MSM3 — Acheter une spécialisation avec coût prévisualisé et blocages explicites

### Contexte

Issue : [#355 — MSM3 - Acheter une spécialisation avec coût prévisualisé et blocages explicites](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/355)

Suite de `MSM1` et `MSM2`, le socle existe déjà sur deux points utiles :

- `calculateSpecializationCost()` encapsule la règle de coût métier ;
- `SpecializationTreeApp` est désormais le point d'entrée de gestion des spécialisations.

En revanche, l'application ne permet encore que de naviguer dans les spécialisations déjà possédées : elle n'expose ni catalogue d'achat, ni prévisualisation du coût avant confirmation, ni raison explicite quand une spécialisation ne peut pas être achetée.

### Objectif

Permettre l'achat d'une nouvelle spécialisation depuis `SpecializationTreeApp`, avec une prévisualisation fiable du coût (y compris la surtaxe hors carrière) et des blocages lisibles, sans déplacer la logique métier dans l'UI.

### Périmètre

#### Inclus

- construction d'un view-model pur de spécialisations achetables ;
- prévisualisation du coût à partir du service métier existant ;
- exposition de blocages explicites côté UI ;
- action d'achat avec revalidation métier, application de la spécialisation et déduction XP ;
- rafraîchissement de l'application après succès ;
- clés i18n et tests ciblés.

#### Exclus

- suppression / oubli de spécialisation ;
- refonte générale de `SpecializationTreeApp` hors parcours d'achat ;
- modification des règles de coût définies en `MSM1` ;
- changement du pipeline d'import OggDude ou du modèle d'arbre de talents.

### Fichiers pressentis

| Fichier                                                                    | Rôle                                                                    |
|----------------------------------------------------------------------------|-------------------------------------------------------------------------|
| `module/lib/specializations/specialization-purchase-service.mjs`          | Nouveau service pur : éligibilité, preview de coût, blocages, payload   |
| `module/lib/specializations/owned-specializations.mjs`                    | Réutiliser le snapshot canonique et éviter les doublons métier          |
| `module/lib/specializations/specialization-cost-service.mjs`              | Réemploi du calcul détaillé (`baseCost`, `nonCareerPenalty`, `finalCost`) |
| `module/models/character.mjs` et/ou `module/documents/actor-mixins/*.mjs` | Orchestration document : appliquer la spécialisation et débiter l'XP    |
| `module/applications/specialization-tree/tree-context-builder.mjs`        | Exposer la liste achetable, la preview et l'état bloqué/actionnable     |
| `module/applications/specialization-tree-app.mjs`                         | Gérer sélection, confirmation, achat, refresh et sélection post-achat   |
| `templates/applications/specialization-tree-app.hbs`                      | Rendre le panneau/liste d'achat et ses blocages explicites              |
| `lang/en.json` / `lang/fr.json`                                           | Ajouter les libellés de preview, action et raisons de blocage           |
| `tests/lib/specializations/*.test.mjs`                                    | Couvrir preview de coût, éligibilité et refus métier                    |
| `tests/applications/specialization-tree-app.test.mjs`                     | Couvrir le flux UI achat/refresh et les états bloqués                   |

### Plan d'implémentation

#### Étape 1 — Construire un contrat métier pur pour l'achat de spécialisation

**Fichiers :** `module/lib/specializations/specialization-purchase-service.mjs`, `module/lib/specializations/owned-specializations.mjs`, `module/lib/specializations/specialization-cost-service.mjs`

1. Définir une entrée candidate stable (identité, lien carrière/universelle, arbre associé, statut déjà possédé ou non).
2. Produire un résultat pur réutilisable par l'UI et par l'action d'achat : `canPurchase`, `blockedReasonCode`, `blockedReasonLabelKey`, `costPreview`, `isCareerOrUniversal`.
3. Réutiliser `calculateSpecializationCost()` pour exposer la décomposition du coût au lieu de recalculer localement la formule.
4. Couvrir au minimum les blocages explicites attendus : spécialisation déjà possédée, XP insuffisante, candidate invalide / introuvable.

#### Étape 2 — Introduire l'orchestration document et brancher l'action d'achat

**Fichiers :** `module/models/character.mjs` et/ou `module/documents/actor-mixins/*.mjs`, `module/applications/specialization-tree-app.mjs`

1. Ajouter une orchestration non-UI qui revalide la candidate au moment du clic, applique la spécialisation via le mécanisme document existant, puis débite l'XP dans la même transaction observable.
2. Retourner un résultat uniforme (`ok`, `reasonCode`, `reason`, `cost`, `specializationId`) pour que l'application n'ait qu'à afficher succès/échec sans porter la règle métier.
3. Faire sélectionner automatiquement la spécialisation nouvellement achetée après succès, puis rafraîchir `SpecializationTreeApp` pour exposer immédiatement son arbre ou son état résolu/non résolu.

#### Étape 3 — Exposer la preview et les blocages dans l'application

**Fichiers :** `module/applications/specialization-tree/tree-context-builder.mjs`, `module/applications/specialization-tree-app.mjs`, `templates/applications/specialization-tree-app.hbs`, `lang/en.json`, `lang/fr.json`

1. Étendre la sidebar de `SpecializationTreeApp` avec une section d'achat distincte des spécialisations déjà possédées.
2. Afficher pour la candidate sélectionnée un récapitulatif de coût stable (`coût de base`, `surtaxe hors carrière`, `coût total`) et un CTA unique d'achat quand l'action est autorisée.
3. Quand l'action est bloquée, afficher un état lisible et localisé au lieu d'un simple bouton absent ou muet.
4. Ajouter uniquement les clés i18n nécessaires pour la preview, l'action d'achat, le `0 XP` de première spécialisation et les raisons de blocage retenues.

#### Étape 4 — Verrouiller les cas nominaux et les refus métier

**Fichiers :** `tests/lib/specializations/*.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`

1. Couvrir les previews de coût représentatives : première spécialisation `0 XP`, deuxième spécialisation de carrière `20 XP`, deuxième hors carrière `30 XP`.
2. Couvrir les refus métier principaux : déjà possédée, XP insuffisante, candidate invalide / absente.
3. Couvrir le flux UI : sélection d'une candidate, affichage de la preview, confirmation d'achat, refresh et sélection de la nouvelle spécialisation après succès.

### Définition de done

- [ ] `SpecializationTreeApp` expose un parcours d'achat pour une nouvelle spécialisation.
- [ ] Le coût affiché provient du service métier central et montre explicitement la surtaxe hors carrière si elle s'applique.
- [ ] Les blocages principaux sont lisibles et localisés, sans logique métier dupliquée dans le template.
- [ ] L'achat réussi applique la spécialisation, débite l'XP et rafraîchit l'application sur la nouvelle spécialisation.
- [ ] Les tests verrouillent les cas nominaux et les refus métier ciblés.
