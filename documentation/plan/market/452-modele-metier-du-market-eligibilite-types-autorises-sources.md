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

---

## État de l’implémentation

_Mis à jour le 2026-05-28 — branche `feat/452-modele-metier-du-market-eligibilite-types-autorises-sources`_

### Étape 1 — Cartographier les entrées Market et formaliser la matrice d’éligibilité ✅

| Livrable                                       | Statut | Détail                                                               |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------- |
| Inventaire entrées Market                      | ✅     | `module/config/market.mjs`, `module/lib/market/`                     |
| Matrice `source → type → éligibilité → raison` | ✅     | `evaluateEligibility()` + 6 raisons dans `ELIGIBILITY_REASONS`       |
| Cas limite : type inconnu                      | ✅     | → `type-not-purchasable`                                             |
| Cas limite : source absente / non fiable       | ✅     | → `untrusted-source` (overridable via `allowUntrustedSources`)       |
| Cas limite : doublon sémantique                | ✅     | `filterDuplicates()` + `DEDUP_STRATEGIES` dans `source-resolver.mjs` |
| Cas limite : nom absent                        | ✅     | → `missing-name`                                                     |
| Cas limite : prix absent/invalide              | ✅     | → `missing-price`                                                    |

### Étape 2 — Poser le contrat canonique du Market et ses constantes métier ✅

| Livrable                                                                     | Statut | Détail                                                                                         |
| ---------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `module/config/market.mjs`                                                   | ✅     | Créé                                                                                           |
| `PURCHASABLE_ITEM_TYPES`                                                     | ✅     | `weapon`, `armor`, `gear` — frozen, avec `id`/`label`/`icon`                                   |
| `EXCLUDED_ITEM_TYPES`                                                        | ✅     | 9 types exclus avec raison machine-readable                                                    |
| `AVAILABILITY_STATUS`                                                        | ✅     | 7 statuts avec `purchasable` + `priceModifier`                                                 |
| `SOURCE_TYPES`                                                               | ✅     | `compendium` (trusted), `world` (trusted), `import` (untrusted)                                |
| `DEFAULT_AVAILABILITY` / `DEFAULT_SOURCE_TYPE` / `MIN_PRICE_FOR_ELIGIBILITY` | ✅     | Constantes nommées, testées ADR-0018                                                           |
| Exposition via `SYSTEM.MARKET`                                               | ✅     | `module/config/system.mjs:238`                                                                 |
| Structure minimale d’une entrée Market                                       | ✅     | `createMarketEntry()` dans `market-entry.mjs`                                                  |
| Formule de prix                                                              | ✅     | `computeMarketPrice()` — `floor(basePrice × (1 + availability + rarity×0.1 + gmModifier/100))` |
| Stratégie de déduplication                                                   | ✅     | `resolveMarketSources()` + `filterDuplicates()`                                                |
| i18n `en.json` / `fr.json`                                                   | ✅     | Clés `MARKET.ItemType.*`, `MARKET.Availability.*`, `MARKET.Source.*`                           |

### Étape 3 — Aligner les adaptateurs et verrouiller la non-régression ✅

| Livrable                                    | Statut | Détail                                            |
| ------------------------------------------- | ------ | ------------------------------------------------- |
| `tests/config/market.test.mjs` (ADR-0018)   | ✅     | Contractual tests sur toutes les constantes       |
| `tests/lib/market/eligibility.test.mjs`     | ✅     | Tous les reason codes couverts                    |
| `tests/lib/market/pricing.test.mjs`         | ✅     | Formule, floor, cas limites                       |
| `tests/lib/market/source-resolver.test.mjs` | ✅     | Les 3 stratégies de dédup                         |
| `tests/lib/market/market-entry.test.mjs`    | ✅     | Création, normalisation nom vide                  |
| Zéro régression suite complète              | ✅     | 2 480 tests, 0 failure, 2 skipped (pré-existants) |

**Note d’adaptation** : `createMarketEntry` normalise un nom absent/vide en `’unknown’` avant `evaluateEligibility`. Le reason code `missing-name` se déclenche uniquement quand `evaluateEligibility` est appelé directement avec un nom blanc — comportement correct par couche.

---

## Points ouverts (hors scope phase 1, phase 2+)

Ces trois questions ont été identifiées pendant l’implémentation. Toutes ont été tranchées — elles sont closes.

### PO-1 — Flag `purchasable` sur le DataModel Foundry ✅ Clos

**Contexte** : le contrat canonique définit `PURCHASABLE_ITEM_TYPES` comme registre statique. Mais certains items pourraient être marqués non-achetables dynamiquement (item unique, lié à un personnage, désactivé par le MJ).

**Question** : faut-il ajouter un champ `purchasable: Boolean` (ou `nonPurchasable`) dans les DataModels `SwerpgWeapon`, `SwerpgArmor`, `SwerpgGear` ?

**Impact** : si oui, `evaluateEligibility` lit `item.nonPurchasable` (déjà prévu dans `EligibilityItem`) — il suffit d’alimenter ce champ depuis le DataModel. Si non, la règle reste purement statique par type.

**Décision prise** : non, pas de champ `purchasable` dans les DataModels Foundry. La logique d’éligibilité reste basée sur le type d’item. La couche domaine (`EligibilityItem.nonPurchasable`) est déjà prête — l’évolution future ne nécessite que l’ajout du champ DataModel et de l’adaptateur.

**ADR** : [ADR-0020 — Market — éligibilité statique par type, pas de flag `purchasable` sur les DataModels](../../architecture/adr/adr-0020-market-eligibility-static-type-only-no-purchasable-flag.md)

### PO-2 — `SOURCE_TYPES` comme Foundry Setting vs config statique ✅ Clos

**Contexte** : `SOURCE_TYPES` est actuellement un objet frozen statique (`compendium`, `world`, `import`). `resolveMarketSources()` accepte déjà des `sourceConfigs` dynamiques en entrée, anticipant un futur où les sources seraient configurables.

**Question** : les sources actives doivent-elles être persistées en `game.settings` (configurables par le MJ en session) ou rester une config statique modifiable uniquement à la compilation ?

**Impact** :

- Config statique → simple, zéro migration, mais le MJ ne peut pas désactiver `import` sans recompiler.
- Foundry Setting → `resolveMarketSources()` lit les settings au runtime, nécessite un écran de config UI et une migration si les valeurs changent.

**Décision prise** : config statique pour des raisons de simplicité. `SOURCE_TYPES` reste un objet frozen dans `module/config/market.mjs`. Si un besoin fort de configurabilité runtime est identifié, une migration vers `game.settings` sera documentée dans une ADR dédiée avec migration explicite.

### PO-3 — Échelle de rareté FFG et formule de prix ✅ Clos

**Contexte** : `computeMarketPrice` applique `rarity × 0.1` (10 % par point de rareté, échelle 0–10). Cette valeur est une hypothèse basée sur l’échelle FFG Edge of the Empire, non vérifiée sur les règles officielles SWERPG.

**Question** : l’échelle de rareté est-elle bien 0–10 dans ce système ? Le coefficient multiplicateur 0.1 est-il aligné avec les règles officielles, ou doit-il être ajusté (ex. 0.05 pour rareté 0–20) ?

**Impact** : si l’échelle ou le coefficient change, seule la constante dans `pricing.mjs` est à ajuster — la formule est isolée. Aucun autre fichier impacté. Les tests associés devront être mis à jour.

**Décision prise** : règle conservée telle quelle pour le MVP. La formule est suffisante à ce stade et sera affinée dans une itération future pour coller aux règles officielles SWERPG. Le point de modification est unique et isolé (`pricing.mjs`).

---

## Clôture

_2026-05-28 — Plan complet, tous les points ouverts tranchés._

- Couche domaine pur implémentée et testée (`module/lib/market/`, `module/config/market.mjs`)
- 2 480 tests, 0 régression
- ADR-0020 créé pour PO-1
- PO-2 et PO-3 tranchés par décision explicite, sans ADR (décisions simples, réversibles sans migration)
