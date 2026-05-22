# GUX2 — Plan d'implementation : Corriger le statut actif/passif des talents dans l'arbre de specialisation

## Contexte

Issue parente : [#327 — GUX2](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/327)

Un ecart fonctionnel subsiste dans l'arbre de specialisation : les talents passifs devraient etre affiches avec la variante bleue et les talents actifs avec la variante rouge, mais l'UI remonte actuellement les talents passifs comme actifs.

Le diagnostic montre deux causes distinctes dans la chaine complete :

- le rendu de l'arbre s'appuie sur un booleen `isActive`, mais ce booleen est aujourd'hui derive via `!!item.system?.activation`, ce qui transforme toute valeur d'activation non vide, y compris `passive`, en `true` ;
- le mapping OggDude ne prend pas explicitement en charge le contrat reel `ActivationValue`, alors que la regle metier attendue est : `taPassive` => passif, toute autre valeur non vide => actif.

Le modele canonique des talents est deja porte par `system.activation` dans `module/models/talent.mjs`. Le plan doit donc corriger la resolution, l'import et la documentation locale du modele, sans refondre le renderer PIXI ni la palette de `node-ui-state.mjs`.

## Objectif

Retablir une chaine coherente de bout en bout pour que :

- un talent importe comme passif reste `system.activation = 'passive'` ;
- un talent importe comme actif reste `system.activation = 'active'` ;
- l'arbre de specialisation derive `isActive` uniquement des talents reellement actifs ;
- la documentation du modele n'entretienne plus l'ambiguite entre l'ancien booleen `active` et le champ canonique `activation`.

## Perimetre

### Inclus

- correction du mapping OggDude `ActivationValue` pour les talents ;
- correction de la derivee `isActive` utilisee par l'arbre et les vues consolidees ;
- alignement de la documentation locale du modele `talent` sur `system.activation` ;
- mise a jour des tests unitaires et applicatifs couvrant cette chaine.

### Exclus

- changement des couleurs ou du contrat visuel de `node-ui-state.mjs` ;
- ajout d'un troisieme etat visuel specifique pour `unspecified` ;
- refonte du renderer PIXI de `SpecializationTreeApp` ;
- migration large d'anciens donnees hors du besoin prouve par ce bug.

## Fichiers pressentis

| Fichier                                                      | Role                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `module/importer/mappings/oggdude-talent-activation-map.mjs` | Porter le vrai contrat OggDude pour `ActivationValue`                 |
| `module/importer/mappers/oggdude-talent-mapper.mjs`          | Lire `ActivationValue` en priorite dans le contexte talent            |
| `module/lib/talent-node/talent-reference-resolver.mjs`       | Deriver `isActive` a partir de `system.activation === 'active'`       |
| `module/models/talent.mjs`                                   | Aligner le typedef/documentation sur `activation` plutot que `active` |
| `tests/importer/talent-mappings.spec.mjs`                    | Verrouiller le mapping OggDude `taPassive` / autres valeurs           |
| `tests/lib/talent-node/talent-reference-resolver.test.mjs`   | Verrouiller la derivee `isActive` pour `active` vs `passive`          |
| `tests/applications/specialization-tree-app.test.mjs`        | Verrouiller la resolution utilisee par l'app de l'arbre               |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | Verrouiller les definitions consolidees exposees a l'UI               |

## Plan d'implementation

### Etape 1 — Recaler le contrat d'import OggDude sur `ActivationValue`

**Fichiers :** `module/importer/mappings/oggdude-talent-activation-map.mjs`, `module/importer/mappers/oggdude-talent-mapper.mjs`, `tests/importer/talent-mappings.spec.mjs`

1. Faire lire `ActivationValue` avant `Activation` et `ActivationType` dans la construction du contexte talent OggDude.
2. Adapter `resolveTalentActivation()` pour reconnaitre explicitement `taPassive` comme `passive`.
3. Definir le fallback metier attendu pour les codes OggDude reels : toute valeur non vide differente de `taPassive` doit etre mappee vers `active`.
4. Conserver un comportement neutre pour les valeurs absentes ou vides si aucun code d'activation n'est fourni.
5. Mettre a jour les tests de mapping pour couvrir au minimum `taPassive`, une valeur non vide representative d'un talent actif, et les cas vides.

**Validation visee :** un talent importe depuis OggDude expose un `system.activation` conforme a la regle metier fournie par la source.

### Etape 2 — Corriger la derivee `isActive` utilisee par l'arbre

**Fichiers :** `module/lib/talent-node/talent-reference-resolver.mjs`, `tests/lib/talent-node/talent-reference-resolver.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

1. Remplacer les derives actuelles `!!item.system?.activation` par une regle explicite basee sur `item.system?.activation === 'active'`.
2. Appliquer cette correction a toutes les branches de resolution : `fromUuidSync`, recherche `game.items`, index compendium et map des definitions consolidees.
3. Verifier que `passive` donne `isActive = false`, `active` donne `isActive = true`, et qu'une absence d'activation ne force pas un actif par defaut.
4. Mettre a jour les attentes de tests existantes qui considerent aujourd'hui a tort qu'un talent `passive` est actif.

**Validation visee :** l'app d'arbre et les vues derivees recoivent un booleen `isActive` semantiquement correct, sans toucher au renderer lui-meme.

### Etape 3 — Aligner la documentation du modele talent

**Fichiers :** `module/models/talent.mjs`

1. Remplacer dans le typedef `TalentData` la mention obsolete `active` par le champ canonique `activation`.
2. Verifier que les commentaires et la schema definition racontent la meme chose sur le modele de donnees.
3. Garder ce changement strictement documentaire tant qu'aucune logique runtime supplementaire n'est necessaire.

**Validation visee :** le modele ne laisse plus penser qu'un booleen `TalentData.active` est la source de verite, alors que le champ reel est `system.activation`.

### Etape 4 — Verrouiller la chaine complete par des tests cibles

**Fichiers :** `tests/importer/talent-mappings.spec.mjs`, `tests/lib/talent-node/talent-reference-resolver.test.mjs`, `tests/applications/specialization-tree-app.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

1. Ajouter un test unitaire qui prouve que `taPassive` est importe en `passive`.
2. Ajouter un test unitaire qui prouve qu'une autre valeur OggDude non vide produit `active`.
3. Ajouter ou ajuster un test de resolution montrant qu'un talent `passive` produit `isActive = false`.
4. Ajouter ou ajuster un test applicatif montrant que les definitions consolidees de talents passifs restent passives jusqu'a l'UI.
5. Verifier qu'aucun test n'impose encore implicitement la logique fautive basee sur la verite d'une chaine.

**Validation visee :** la regression est couverte au niveau import, resolution et consommation UI.

## Risques et points d'attention

- Le code OggDude reel utilise peut varier entre `ActivationValue`, `Activation` et `ActivationType` selon les exports ; il faut conserver l'ordre de priorite sans casser les jeux de donnees deja supportes.
- Certains tests existants ont encode le bug actuel comme comportement attendu ; il faudra les corriger en meme temps que le code pour eviter une fausse impression de regression.
- Le renderer PIXI ne doit pas etre modifie si la correction de `isActive` suffit a retablir les couleurs rouge/bleu deja portees par `node-ui-state.mjs`.

## Definition de done

- [ ] Un talent OggDude avec `ActivationValue = taPassive` est importe en `system.activation = 'passive'`.
- [ ] Un talent OggDude avec une autre valeur d'activation non vide est importe en `system.activation = 'active'`.
- [ ] Un talent `passive` ne produit plus `isActive = true` dans `talent-reference-resolver`.
- [ ] `SpecializationTreeApp` recoit bien des talents passifs en bleu et des talents actifs en rouge sans changement du renderer.
- [ ] Le typedef de `module/models/talent.mjs` reference `activation` comme champ canonique.
- [ ] Les tests cibles couvrant import, resolution et UI passent avec le comportement corrige.

## References liees

- `documentation/plan/character-sheet/specialization-tree/327-gux2-clarifier-les-etats-des-noeuds-avec-couleurs-contraste-et-pictogrammes.md`
- `module/applications/specialization-tree/node-ui-state.mjs`
- `module/models/talent.mjs`
