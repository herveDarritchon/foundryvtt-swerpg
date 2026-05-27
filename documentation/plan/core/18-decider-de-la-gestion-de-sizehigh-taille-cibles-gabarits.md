# Décider de la gestion de SizeHigh (taille / cibles / gabarits)

**Issue** : [#18 — [Architecture / Rules] Décider de la gestion de SizeHigh (taille / cibles / gabarits)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/18)

## Objectif

Transformer `SizeHigh` d’un signal importé isolé en une décision d’architecture explicite : simple métadonnée source ou donnée métier canonique reliée aux règles de taille, de ciblage et de gabarits.

## Décisions de cadrage

- Définir une seule source de vérité pour `SizeHigh`.
- Séparer strictement la sémantique source OggDude de la sémantique métier SWERPG.
- Limiter l’alignement aux surfaces prouvées : import, modèle/config canonique, règles de ciblage/gabarits et affichage associé.
- Préserver la compatibilité avec les imports existants tant qu’aucune migration explicite n’est décidée.

## Étapes d’implémentation

### 1. Cartographier l’existant et lever l’ambiguïté métier

**Fichiers cibles** : `module/importer/items/weapon-ogg-dude.mjs`, `module/models/weapon.mjs`, `module/config/weapon.mjs`, `module/config/system.mjs`, surfaces règles taille/ciblage/gabarits réellement consommatrices, documentation import OggDude associée.

**What**

- inventorier où `SizeHigh` entre, où la notion de taille existe déjà et quelles règles consomment taille/cible/gabarit ;
- distinguer ce qui relève d’un marqueur de source OggDude et ce qui doit devenir une donnée métier SWERPG ;
- formaliser les cas d’usage à couvrir : affichage seul, modificateur de ciblage, interaction avec gabarits, ou absence d’effet gameplay.

**Validation visée** : une matrice claire “source / modèle / règle / UI” supprime l’ambiguïté sur le rôle réel de `SizeHigh`.

### 2. Fixer le contrat canonique SizeHigh côté architecture/règles

**Fichiers cibles** : ADR ou documentation d’architecture pertinente, `module/config/weapon.mjs`, `module/config/system.mjs`, modèle/document concerné si un champ métier canonique est retenu.

**What**

- décider si `SizeHigh` reste un flag d’import, devient un booléen/enum métier nommé, ou se traduit vers une notion existante de taille/gabarit ;
- définir une seule source de vérité, les conversions autorisées depuis l’import et les consommateurs légitimes ;
- verrouiller les invariants : pas de double stockage divergent, pas d’effet implicite non documenté sur le ciblage ou les gabarits.

**Validation visée** : le projet dispose d’un contrat d’architecture testable et documenté pour `SizeHigh`.

### 3. Aligner l’import, les consommateurs métier et la non-régression

**Fichiers cibles** : importer OggDude concerné, modules règles qui lisent la taille/cible/gabarit, affichage/tag éventuel, tests ciblés import + règles + config.

**What**

- faire converger l’import vers le contrat canonique défini à l’étape 2 ;
- mettre à jour uniquement les règles ou surfaces UI réellement consommatrices du signal retenu ;
- ajouter des tests ciblés couvrant conservation des données source, traduction métier éventuelle et absence de régression sur ciblage/gabarits.

**Validation visée** : `SizeHigh` a un comportement unique, observable et non contradictoire du parseur jusqu’aux règles qui l’utilisent.

## Résultat attendu

- `SizeHigh` n’est plus une donnée ambiguë entre import, taille métier et gabarits.
- Le système possède un contrat unique pour cette notion et des points de consommation explicitement identifiés.
- Les futures évolutions sur taille/ciblage/gabarits peuvent s’appuyer sur cette décision sans re-spécifier l’import.
