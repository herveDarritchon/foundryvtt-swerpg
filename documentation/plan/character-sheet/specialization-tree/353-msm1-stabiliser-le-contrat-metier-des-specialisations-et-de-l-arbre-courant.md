## MSM1 — Stabiliser le contrat métier des spécialisations et de l'arbre courant

### Contexte

Issue : [#353 — MSM1 - Stabiliser le contrat métier des spécialisations et de l'arbre courant](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/353)

Le flux multi-spécialisations doit cesser de mélanger :

- `career` : identité métier stable ;
- `ownedSpecializations` : source canonique des spécialisations possédées ;
- `selectedSpecializationTree` : contexte d'affichage uniquement.

L'issue demande aussi un service de coût pur, réutilisable par la prévisualisation UI et par le futur flux d'achat, avec
la règle :

Le service de coût MSM1 calcule le coût d’obtention d’une spécialisation dans tous les cas.

Règle :

- si le personnage ne possède aucune spécialisation, la première spécialisation coûte 0 XP ;
- à partir de la deuxième spécialisation, le coût est 10 × le nombre total de spécialisations après achat ;
- si la spécialisation ajoutée n’est pas une spécialisation de carrière, ajouter +10 XP ;
- en V1, une spécialisation universelle est traitée comme une spécialisation de carrière pour le coût.

### Objectif

Poser un contrat métier explicite pour les spécialisations possédées et fournir un calculateur de coût pur, sans
dépendance UI, afin que l'arbre courant ne puisse plus influencer les décisions métier.

### Fichiers pressentis

| Fichier                                                            | Rôle                                                                           |
|--------------------------------------------------------------------|--------------------------------------------------------------------------------|
| `module/lib/specializations/owned-specializations.mjs`             | Nouveau module pur : contrat canonique, lecture/normalisation, helpers métier  |
| `module/lib/specializations/specialization-cost-service.mjs`       | Nouveau service pur de calcul de coût                                          |
| `module/models/character.mjs`                                      | Documenter l'alignement entre le modèle acteur et le contrat métier            |
| `module/lib/talent-node/talent-tree-resolver.mjs`                  | Réutiliser le contrat canonique côté résolution, sans dépendre d'un état UI    |
| `module/applications/specialization-tree/tree-context-builder.mjs` | Consommer le contrat métier sans faire de `selected tree` une source de vérité |
| `module/applications/specialization-tree-app.mjs`                  | Garder `#selectedTreeKey` strictement dans le rôle de sélection d'affichage    |
| `tests/lib/specializations/*.test.mjs`                             | Couvrir contrat, helpers de typage et calcul de coût                           |
| `tests/applications/specialization-tree/*.test.mjs`                | Verrouiller la séparation métier vs contexte UI                                |

### Plan d'implémentation

#### Étape 1 — Formaliser le contrat canonique des spécialisations

**Fichiers :** `module/lib/specializations/owned-specializations.mjs`, `module/models/character.mjs`

1. Définir un contrat pur qui expose explicitement `career`, `ownedSpecializations` et interdit d'y inclure la notion d'
   arbre courant.
2. Aligner ce contrat sur la persistance actuelle (`system.details.career`, `system.details.specializations`) avec JSDoc
   et helpers de lecture/normalisation.
3. Ajouter les helpers de typage demandés (`isCareerSpecialization`, `isUniversalSpecialization`) pour éviter les
   heuristiques dispersées.

#### Étape 2 — Créer le service métier de calcul de coût

**Fichiers :** `module/lib/specializations/specialization-cost-service.mjs`,
`module/lib/specializations/owned-specializations.mjs`

1. Implémenter un service pur qui reçoit la spécialisation candidate et le snapshot `ownedSpecializations` canonique.
2. Encapsuler la formule complète (`baseCost`, `finalCost`) et la règle V1 « universelle = carrière ».
3. Retourner un résultat stable, réutilisable tel quel par la prévisualisation UI et le futur flux d'achat.

#### Étape 3 — Réaligner les adaptateurs application/UI sur ce contrat

**Fichiers :** `module/lib/talent-node/talent-tree-resolver.mjs`,
`module/applications/specialization-tree/tree-context-builder.mjs`, `module/applications/specialization-tree-app.mjs`

1. Faire consommer le contrat canonique par les adaptateurs existants au lieu de reconstruire localement la sémantique
   métier.
2. Conserver `selectedSpecializationTree` / `#selectedTreeKey` comme simple sélection d'affichage, jamais comme
   spécialisation « active » métier.
3. Vérifier que les usages de prévisualisation et de résolution passent toujours la spécialisation ciblée explicitement
   au service métier.

#### Étape 4 — Verrouiller les non-régressions par tests

**Fichiers :** `tests/lib/specializations/*.test.mjs`, `tests/lib/talent-node/talent-tree-resolver.test.mjs`,
`tests/applications/specialization-tree/*.test.mjs`

1. Couvrir les cas de coût : `0→1 = 0 XP`, `1→2 carrière = 20 XP`, `1→2 hors carrière = 30 XP`, `2→3 carrière = 30 XP`, `2→3 hors carrière = 40 XP`.
2. Couvrir explicitement le cas universel et les helpers `isCareerSpecialization` / `isUniversalSpecialization`.
3. Vérifier qu'un changement d'arbre courant ne change que le contexte de rendu, jamais le contrat métier ni le calcul
   de coût.

### Définition de done

- [ ] `ownedSpecializations` est la source canonique des spécialisations possédées.
- [ ] `selectedSpecializationTree` n'est utilisé que comme contexte UI.
- [ ] Le calcul de coût vit dans `module/lib/specializations/` et ne dépend pas de `game`/`ui`.
- [ ] Les spécialisations universelles suivent bien la règle V1 de coût carrière.
- [ ] Les tests couvrent le contrat métier et la séparation avec le contexte d'affichage.
