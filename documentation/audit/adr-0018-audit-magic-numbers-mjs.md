# Audit ADR-0018 — Magic Numbers et constantes nommées dans le code `*.mjs`

## Résumé

L’ADR [ADR-0018](../architecture/adr/adr-0018-no-magic-numbers-named-constants.md) n’est **pas validée globalement** sur la codebase `*.mjs`.

L’audit montre une adoption **partielle mais incomplète** du pattern :

- certaines constantes métier ont bien été extraites dans `module/config/` ;
- plusieurs règles métier importantes restent encore dupliquées sous forme de literals numériques ou textuels ;
- une part importante du bruit relevé provient aussi de la couche UI/canvas, où l’intention de l’ADR doit être appliquée avec discernement.

### Chiffres clés

Scan numérique ciblé sur le code applicatif hors `module/config/` :

- **316 occurrences candidates**
- **73 fichiers touchés**

Répartition par zone :

- `module/canvas` : **106**
- `module/importer` : **56**
- `module/applications` : **49**
- `module/models` : **40**
- `module/documents` : **20**
- `module/dice` : **19**
- `module/lib` : **19**
- `module/utils` : **7**

Passage ciblé sur des magic strings à forte confiance :

- `forget` : **41**
- `train` : **35**
- `talent` : **31+**
- `mainhand` : **23**
- `none` : **7+**
- `physical` : **5**
- `single` : **3**
- `brawn` : **2**
- `medium` : **2+**

## Conclusion

Conclusion courte : **l’ADR est pertinente, déjà engagée dans certains modules, mais elle n’est pas encore respectée de façon systémique**.

Je considère donc que l’ADR doit être évaluée comme :

- **acceptée architecturalement** ;
- **partiellement appliquée** ;
- **non validée en conformité codebase** à date.

Le code montre déjà la bonne direction sur certains axes, par exemple :

- `module/config/skills.mjs:217-223`
- `module/config/dice.mjs:11-17`
- `module/models/character.mjs:417`

Mais de nombreuses règles métier restent encore encodées en dur dans les couches :

- `lib/`
- `models/`
- `documents/`
- `dice/`
- `importer/`
- certaines parties de `applications/`

## Ce que l’audit valide déjà

### 1. Le pattern ADR existe bien dans la codebase

Le pattern cible est déjà appliqué sur certains cas :

- `module/config/skills.mjs`
  - `MAX_RANK_AT_CREATION = 2`
  - `MAX_RANK = 5`
- `module/config/dice.mjs`
  - `MAX_BOONS`
  - `MAX_BANES`
  - `DIE_STEP`
  - `MIN_DIE`
  - `MAX_DIE`

Exposition via `SYSTEM` :

- `module/config/system.mjs:198-207`
- `module/config/system.mjs:213-243`

Consommation correcte observée :

- `module/models/character.mjs:417`

Tests contractuels déjà présents :

- `tests/config/skills.test.mjs`
- `tests/config/system.test.mjs`

### 2. L’ADR est donc techniquement faisable sans rupture de pattern

Le mécanisme recommandé par l’ADR est déjà opérationnel :

- export dans `module/config/<entity>.mjs`
- exposition via `SYSTEM`
- usage côté logique
- tests contractuels de config

Le problème n’est donc **pas** un manque d’infrastructure, mais une **adoption incomplète**.

## Findings

### 1. Critique — règles métier de progression / XP / rangs encore codées en dur

#### Constat

Les règles métier les plus structurantes du système restent largement dupliquées en literals numériques.

Références principales :

- `module/lib/skills/skill-cost-calculator.mjs:16,21`
- `module/lib/skills/trained-skill.mjs:56,60`
- `module/lib/skills/career-free-skill.mjs:55`
- `module/lib/skills/specialization-free-skill.mjs:55`
- `module/lib/characteristics/characteristic-cost-calculator.mjs:32`
- `module/lib/characteristics/trained-characteristic.mjs:33,37`
- `module/lib/specializations/specialization-cost-service.mjs:54,59`
- `module/models/actor-type.mjs:167,176,391,445,476,499-501`
- `module/models/character.mjs:283,313,328-330,367-368,481,485`
- `module/models/adversary.mjs:58,70-71,89,94,114`

Valeurs concernées :

- `2`
- `3`
- `5`
- `6`
- `10`
- `12`
- `1.5`

#### Évaluation

- **Correction requise** : Oui
- **Criticité** : Critique
- **Motif** :
  - ce sont des règles métier partagées ;
  - elles apparaissent dans plusieurs couches ;
  - certaines ont déjà une version centralisée, mais la migration n’est pas terminée ;
  - leur duplication augmente fortement le risque de divergence silencieuse.

#### Recommandation

Créer ou compléter des constantes métier dans `module/config/` pour couvrir :

- coûts XP par rang ;
- limites de rang création / hors création ;
- seuils de caractéristiques ;
- règles de coût des spécialisations ;
- multiplicateurs et seuils de ressources calculées.

### 2. Critique — moteur de dés et seuils de combat encore partiellement en dur

#### Constat

Une partie du moteur de résolution continue d’utiliser des seuils numériques en dur, malgré l’existence d’un début de centralisation dans `module/config/dice.mjs`.

Références principales :

- `module/dice/standard-check.mjs:103,126,169-171,207,217,358,363`
- `module/documents/actor-mixins/combat/attack.mixin.mjs:46-47,136`
- `module/documents/actor-mixins/combat/defense.mixin.mjs:80-85`
- `module/documents/combat.mjs:93,110-122,136-185`

Valeurs concernées :

- `4`
- `6`
- `8`
- `12`
- `2`
- `-4`

#### Évaluation

- **Correction requise** : Oui
- **Criticité** : Critique
- **Motif** :
  - ces valeurs ont un sens mécanique explicite ;
  - elles pilotent le comportement des checks, critiques, boons/banes, défense et heroism ;
  - la zone est sensible au risque de régression fonctionnelle.

#### Recommandation

Étendre `module/config/dice.mjs` et, si nécessaire, `module/config/system.mjs` pour nommer :

- seuil critique succès / échec par défaut ;
- bornes ability / skill / enchantment ;
- pool de dés par défaut ;
- seuils heroism et escalade ;
- pénalités de résistance / défense.

### 3. Critique — magic strings métier de schéma, enums et valeurs par défaut

#### Constat

De nombreuses valeurs textuelles à sens métier sont encore écrites en dur dans les schémas, validations et documents.

Références principales :

- `module/models/weapon.mjs:14,37-38,162,235,253,264,305`
- `module/models/action.mjs:135,579,585,1100,1322,1344,1347`
- `module/models/physical.mjs:17-18`
- `module/models/adversary.mjs:27`
- `module/models/species.mjs:87,104`
- `module/documents/actor-mixins/combat/attack.mixin.mjs:28`
- `module/documents/actor-mixins/combat/defense.mixin.mjs:19,31,80,84`
- `module/documents/actor.mjs:273,385,397,399,556-562,577`

Exemples :

- `'rangedLight'`
- `'medium'`
- `'single'`
- `'standard'`
- `'none'`
- `'normal'`
- `'physical'`
- `'health'`
- `'restricted'`
- `'mainhand'`

#### Évaluation

- **Correction requise** : Oui, par vagues
- **Criticité** : Critique
- **Motif** :
  - ces valeurs représentent des identifiants métier, pas de simples détails d’implémentation ;
  - elles sont utilisées comme defaults, discriminants, clés d’aiguillage et règles de fallback ;
  - leur duplication rend les schémas moins fiables et moins lisibles.

#### Recommandation

Prioriser :

1. les valeurs par défaut de schéma adossées à des registres `SYSTEM.*`
2. les identifiants d’états et de portées
3. les types d’objets métier récurrents
4. les slots / catégories / niveaux de restriction

### 4. Majeure — importer OggDude avec bornes et defaults métier encore dupliqués

#### Constat

L’importer concentre un volume important de literals numériques et textuels à sens métier.

Références principales :

- `module/importer/items/weapon-ogg-dude.mjs:146-149,191,199,206`
- `module/importer/items/armor-ogg-dude.mjs:227-232,261,281`
- `module/importer/items/career-ogg-dude.mjs:106-110,185-186,237,243,282,303`
- `module/importer/utils/description-markup-utils.mjs:13-18,57,63,108,140`
- `module/importer/mappers/oggdude-talent-mapper.mjs:173,212`

Exemples :

- bornes `0..20`
- bornes `0..8`
- défauts de rang gratuit
- longueurs max de description
- valeurs par défaut comme `'mainhand'`, `'medium'`, `'restricted'`, `'none'`

#### Évaluation

- **Correction requise** : Oui, partielle
- **Criticité** : Majeure
- **Motif** :
  - plusieurs valeurs sont de vraies contraintes métier ou contractuelles ;
  - d’autres relèvent plutôt de sanitation ou de robustesse locale.

#### Recommandation

Corriger en priorité :

- bornes métier partagées avec les modèles runtime ;
- defaults de mapping qui correspondent à des valeurs de config système ;
- limites de rang gratuit ;
- clamps liés au contrat de schéma.

Ne pas sur-centraliser immédiatement :

- limites purement techniques de sanitation ou de formatting, si elles restent nommées localement.

### 5. Majeure — règles UI / applications encore implicites

#### Constat

Certaines règles d’interface ou de comportement produit sont encore encodées directement en literals.

Références principales :

- `module/applications/sheets/base-actor-sheet.mjs:212,363,399,534`
- `module/applications/character-audit-log.mjs:407,432`
- `module/applications/config/skill.mjs:67-69,129`

Exemples :

- `count > 3`
- `1000000`
- `slice(0, 10)`
- sentinelles `-1`

#### Évaluation

- **Correction requise** : Oui, sélectivement
- **Criticité** : Majeure
- **Motif** :
  - certaines valeurs représentent de vraies règles UI ;
  - d’autres sont surtout des constantes techniques de présentation.

#### Recommandation

- remonter les vraies règles UI transverses dans `module/config/ui.mjs` ou `module/config/system.mjs`
- laisser les constantes purement locales dans le fichier, mais **nommées explicitement en tête de module**

### 6. Mineure à Majeure — bruit important dans `canvas/` et rendu Pixi

#### Constat

La plus forte densité d’occurrences numériques est dans la couche graphique.

Top fichiers :

- `module/canvas/token.mjs` : `42`
- `module/applications/specialization-tree/pixi-tree-renderer.mjs` : `26`
- `module/canvas/talent-tree-node.mjs` : `13`
- `module/canvas/talent-tree.mjs` : `13`
- `module/canvas/talent-icon.mjs` : `12`

Références typiques :

- tailles
- offsets
- couleurs hexadécimales
- alphas
- paddings
- throttles
- rayons de coins
- marges de badge

#### Évaluation

- **Correction requise** : Oui, localement
- **Criticité** : Mineure à Majeure selon le cas
- **Motif** :
  - beaucoup de ces valeurs ont un sens d’implémentation visuelle locale, pas un sens métier global ;
  - elles enfreignent souvent la lettre de l’ADR, mais pas toujours son intention.

#### Recommandation

- nommer localement les constantes visuelles réutilisées ;
- ne pas remonter automatiquement toutes ces valeurs dans `module/config/` ;
- corriger en priorité les seuils qui impactent un vrai comportement utilisateur, pas seulement la géométrie.

Exemple positif déjà présent :

- `module/applications/specialization-tree/layout.mjs:17-30`

### 7. Faible — faux positifs ADR ou dette purement technique

#### Constat

Une partie des occurrences relèvent davantage :

- de sentinelles techniques ;
- de couleurs ;
- de formatage ;
- de compatibilité runtime ;
- ou de détails internes d’implémentation.

Exemples :

- `-1`
- `0xffffff`
- `0x333333`
- `0xff0000`
- `1000`
- `1024`
- `game.release.generation < 13`

#### Évaluation

- **Correction requise** : Non prioritaire
- **Criticité** : Faible
- **Motif** :
  - faible portée métier ;
  - faible probabilité de dérive fonctionnelle ;
  - intérêt principal : lisibilité locale.

#### Recommandation

Si ces zones sont retouchées :
- nommer localement les constantes techniques ;
- ne pas lancer de chantier dédié uniquement pour ces cas.

## Fichiers les plus denses

| Occurrences numériques | Fichier |
| ---: | --- |
| 42 | `module/canvas/token.mjs` |
| 26 | `module/applications/specialization-tree/pixi-tree-renderer.mjs` |
| 13 | `module/canvas/talent-tree-node.mjs` |
| 13 | `module/canvas/talent-tree.mjs` |
| 12 | `module/canvas/talent-icon.mjs` |
| 12 | `module/dice/standard-check.mjs` |
| 10 | `module/models/actor-type.mjs` |
| 9 | `module/importer/utils/global-import-metrics.mjs` |
| 8 | `module/applications/sheets/adversary-sheet.mjs` |
| 8 | `module/importer/items/career-ogg-dude.mjs` |

## Évaluation par famille

| Famille | Volume approx. | Criticité | Corriger |
| --- | ---: | --- | --- |
| Progression / XP / rangs | 30+ | Critique | Oui |
| Dés / combat / résolution | 20+ | Critique | Oui |
| Magic strings de schéma / enums métier | 80+ | Critique | Oui, par vagues |
| Importer OggDude | 50+ | Majeure | Oui, partiel |
| Applications / sheets | 49 | Majeure | Oui, sélectif |
| Canvas / Pixi / rendu | 106 | Mineure à Majeure | Oui localement |
| Sentinelles / couleurs / formatage | variable | Faible | Non prioritaire |

## Cas déjà alignés avec l’ADR

### 1. Skills max rank

Constantes déjà extraites :

- `module/config/skills.mjs:217-223`

Exposition via `SYSTEM` :

- `module/config/system.mjs:204-207`

Consommation correcte :

- `module/models/character.mjs:417`

Tests présents :

- `tests/config/skills.test.mjs`
- `tests/config/system.test.mjs`

### 2. Dice base config

Constantes déjà présentes :

- `module/config/dice.mjs:11-17`

Mais la migration n’est pas terminée dans :

- `module/dice/standard-check.mjs`
- `module/documents/actor-mixins/combat/attack.mixin.mjs`

## Recommandation

Je recommande de considérer l’ADR-0018 comme :

- **bonne et validée sur le fond** ;
- **non conforme globalement dans son application actuelle** ;
- **à industrialiser par lots**, pas en une seule passe.

### Ordre recommandé de remédiation

1. **Lot 1 — métier critique**
   - progression
   - XP
   - rangs
   - caractéristiques
   - spécialisations

2. **Lot 2 — moteur de dés et combat**
   - seuils critiques
   - bornes de check
   - pénalités et caps

3. **Lot 3 — magic strings métier**
   - defaults de schéma
   - enums et discriminants récurrents
   - types d’objets

4. **Lot 4 — importer**
   - clamps métier
   - defaults de mapping
   - limites contractuelles

5. **Lot 5 — UI et canvas**
   - constantes locales nommées
   - centralisation seulement si la règle est réellement transverse

## Verdict final

L’ADR-0018 est **partiellement appliquée mais non validée à l’échelle de la codebase**.

Le système a déjà commencé la transition vers des constantes nommées dans `module/config/`, mais les violations restantes restent suffisamment nombreuses et suffisamment centrales pour empêcher une validation de conformité aujourd’hui.

Le problème principal n’est pas dans quelques oublis isolés, mais dans une **dette transversale encore présente sur les règles métier, le moteur de dés, les schémas et l’importer**.
