# Modèle métier du Market — éligibilité, types autorisés, sources

**Issue** : [#452 — Modèle métier du Market — éligibilité, types autorisés, sources](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/452)

## Objectif

Poser un contrat métier unique pour le Market afin d’éviter que l’éligibilité, les types autorisés et l’origine des données soient reconstruits différemment selon les consommateurs. Définir une source canonique, les règles d’acceptation et les adaptateurs autorisés sans ouvrir le scope UI.

## Décisions de cadrage

- Limiter le chantier au modèle métier du Market et à ses adaptateurs immédiats, sans refonte UI/UX.
- Séparer strictement la donnée source/importée du contrat canonique consommé par le système.
- Définir explicitement quels types sont autorisés, refusés ou ignorés, avec raisons observables.
- Préserver la compatibilité des données historiques via normalisation/fallback documentés si des écarts existent déjà.

## Étapes d’implémentation

### 1. Cartographier les entrées Market et formaliser la matrice d’éligibilité

**Fichiers cibles** : surfaces Market existantes, adaptateurs d’entrée/import éventuels, documentation d’architecture pertinente.

**What**

- inventorier où le Market reçoit, dérive ou filtre ses données ;
- dresser la matrice `source -> type -> statut d’éligibilité -> raison` ;
- expliciter les cas limites : type inconnu, source absente, source non fiable, doublon de sémantique.

**Validation visée** : une table de décision claire supprime l’ambiguïté sur ce qui peut alimenter le Market.

### 2. Poser le contrat canonique du Market et ses constantes métier

**Fichiers cibles** : `module/config/market.mjs` (nouveau si absent), surface `SYSTEM.*` associée, module métier `module/lib/market/` ou DataModel/Document concerné, documentation d’architecture pertinente.

**What**

- nommer les types autorisés, statuts d’éligibilité et sources supportées dans un registre canonique ;
- définir la structure métier minimale d’une entrée Market et ses invariants ;
- préciser la stratégie de normalisation depuis les sources externes vers ce contrat unique.

**Validation visée** : le Market dispose d’une seule source de vérité testable pour les types, l’éligibilité et la provenance.

### 3. Aligner les adaptateurs et verrouiller la non-régression

**Fichiers cibles** : adaptateurs/importers/consommateurs Market identifiés à l’étape 1, `tests/config/market.test.mjs` (nouveau si utile), `tests/lib/market/*.test.mjs` ou tests ciblés équivalents.

**What**

- faire converger les producteurs et consommateurs du Market vers le contrat canonique ;
- refuser ou normaliser explicitement les cas hors périmètre au lieu de laisser des heuristiques locales ;
- ajouter des tests ciblés couvrant types autorisés, types refusés, sources supportées et cas de fallback.

**Validation visée** : une même donnée obtient la même décision d’éligibilité quel que soit son point d’entrée.

## Résultat attendu

- Le Market possède un contrat métier explicite pour l’éligibilité, les types autorisés et les sources.
- Les adaptateurs ne reconstruisent plus chacun leurs propres règles.
- Les futures évolutions du Market peuvent ajouter un type ou une source en modifiant un point canonique unique.
