# Plan d'implémentation — US13 : Afficher rangs et sources dans l'onglet Talents

**Issue** : [#197 — US13: Afficher rangs et sources dans l'onglet Talents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/197)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0010-architecture-des-effets-mécaniques-des-talents.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs` (modification), `templates/sheets/actor/talents.hbs` (modification), `styles/actor.less` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/sheets/character-sheet-talents.test.mjs` (modification)

---

## 1. Objectif

Compléter la refonte de l'onglet Talents livrée par US12 pour rendre immédiatement lisibles :

- le rang consolidé des talents ranked ;
- les spécialisations sources lorsqu'un même talent provient de plusieurs arbres ;
- les cas dégradés où la source ne peut pas être résolue précisément.

Le résultat attendu est un onglet Talents qui conserve une seule ligne par `talentId`, n'introduit aucun doublon visuel, et distingue mieux les états "source inconnue" et "spécialisation sans arbre disponible" sans bloquer l'affichage.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Rendre le rang consolidé plus explicite dans les données préparées pour le template et dans le rendu visuel.
- Garantir qu'un talent ranked multi-arbres affiche un rang total unique et visible sans ouverture de détail.
- Garantir qu'un talent non-ranked multi-arbres affiche une seule ligne avec plusieurs sources dédupliquées.
- Différencier les principaux cas dégradés de résolution de source déjà exposés par la couche domaine :
  - `tree-unresolved` ;
  - `tree-incomplete` ;
  - `specialization-not-found` ;
  - `node-missing`.
- Introduire les libellés i18n manquants pour afficher des marqueurs compréhensibles selon l'état de résolution.
- Ajuster le template et le style pour que rang, sources et états dégradés soient lisibles en desktop et en largeur réduite.
- Étendre les tests Vitest ciblés sur l'adaptateur de fiche personnage et le contrat d'affichage.

### Exclu de cette US / ce ticket

- Toute modification de la source de vérité `actor.system.progression.talentPurchases`.
- Toute persistance d'une vue consolidée dans `actor.system` ou `actor.flags`.
- Refonte de la couche domaine `owned-talent-summary` au-delà d'un éventuel ajustement mineur si un écart contractuel bloquant est constaté pendant l'implémentation.
- Achat, suppression, remboursement ou édition de talents depuis l'onglet Talents.
- Ajout d'une nouvelle vue graphique ou refonte de l'ouverture des arbres de spécialisation.
- Automatisation des effets mécaniques des talents, `system.effects` ou `ActiveEffect`.
- Gestion des talents signatures ou filtres avancés.

---

## 3. Constat sur l'existant

- US12 a déjà branché `module/applications/sheets/character-sheet.mjs#buildConsolidatedTalentList()` sur `buildOwnedTalentSummary()`.
- Le template `templates/sheets/actor/talents.hbs` affiche déjà une liste consolidée, le rang des ranked et une liste de sources.
- Le style `styles/actor.less` possède déjà une base de rendu pour `.talent-consolidated`, `.talent-rank` et `.talent-sources`.
- Les tests `tests/applications/sheets/character-sheet-talents.test.mjs` couvrent déjà :
  - rang ranked affiché ;
  - absence de rang pour les non-ranked ;
  - déduplication simple des sources ;
  - tri stable ;
  - fallback global `SWERPG.TALENT.UNKNOWN_SOURCE`.
- La couche domaine `module/lib/talent-node/owned-talent-summary.mjs` expose déjà des `resolutionState` assez fins :
  - `ok` ;
  - `specialization-not-found` ;
  - `tree-unresolved` ;
  - `tree-incomplete` ;
  - `node-missing`.
- Le principal écart entre l'issue #197 et l'existant n'est donc pas la consolidation métier, mais la qualité d'explication de l'affichage :
  - tous les états non `ok` sont aujourd'hui ramenés au même libellé `SWERPG.TALENT.UNKNOWN_SOURCE` ;
  - le template ne distingue pas visuellement une source partiellement résolue d'une absence totale de source ;
  - l'issue demande explicitement des marqueurs lisibles comme "Spécialisation sans arbre disponible" ou "Source inconnue".
- Le cadrage `04-ui-onglet-talents.md` confirme que l'onglet doit rester une vue de consultation dérivée, tolérante aux données incomplètes, sans achat direct.

---

## 4. Décisions d'architecture

### 4.1. US13 reste une US d'adaptation UI, pas de refonte du domaine

**Décision** : conserver `buildOwnedTalentSummary()` comme source canonique de consolidation et limiter US13 à l'adaptation fiche personnage -> template -> style.

Justification :

- conforme au découpage `07-plan-issues-github.md` : US7/US8 portent la consolidation, US12/US13 portent l'onglet Talents ;
- évite de dupliquer la logique métier dans la sheet ;
- le domaine expose déjà les informations nécessaires via `rank`, `sources` et `resolutionState`.

### 4.2. Les états dégradés sont traduits au niveau de l'adaptateur sheet

**Décision** : mapper les `resolutionState` techniques vers des libellés UI localisés dans `#buildConsolidatedTalentList()` plutôt que d'introduire des chaînes UI dans `owned-talent-summary`.

Exemples attendus :

- `tree-unresolved` / `tree-incomplete` -> libellé du type `SWERPG.TALENT.SOURCE_SPECIALIZATION_WITHOUT_TREE` ;
- `specialization-not-found` -> `SWERPG.TALENT.UNKNOWN_SOURCE` ou libellé plus précis dédié si validé ;
- `node-missing` -> libellé source dégradée dédié si l'état doit rester visible côté joueur.

Justification :

- conforme à la séparation domaine pur / UI décrite dans `01-modele-domaine-talents.md` ;
- évite de coupler `module/lib/talent-node/` à `game.i18n` ;
- garde le contrat domaine testable sans Foundry.

### 4.3. Les sources affichées restent dédupliquées, mais la déduplication ne doit pas masquer un état dégradé distinct

**Décision** : conserver une déduplication des libellés de sources pour éviter les répétitions visuelles, tout en s'assurant qu'un libellé dégradé distinct n'est pas absorbé par un simple fallback générique.

Justification :

- conforme à l'issue : pas de doublon visuel inutile ;
- un non-ranked multi-spé doit rester une seule entrée ;
- l'information importante est la liste des spécialisations sources uniques et, en cas d'échec, la nature du problème de résolution.

### 4.4. Le rang consolidé reste calculé dans le domaine et seulement mis en valeur dans l'UI

**Décision** : ne pas recalculer le rang dans le template ni dans le style ; la fiche se contente d'afficher `entry.rank` quand `entry.isRanked === true`.

Justification :

- conforme à `02-regles-achat-progression.md` ;
- évite tout risque de divergence entre la vue et la couche domaine ;
- garde un contrat simple à tester côté sheet.

### 4.5. Aucun enrichissement mécanique des talents dans cette US

**Décision** : US13 n'interprète pas `system.effects`, n'ajoute aucun comportement d'activation, et n'utilise pas `ActiveEffect`.

Justification :

- conforme à ADR-0010 ;
- l'issue porte sur la lisibilité de possession, pas sur l'automatisation mécanique ;
- évite un glissement de scope entre vue, règles et effets.

### 4.6. Les chaînes visibles supplémentaires passent obligatoirement par l'i18n projet

**Décision** : toute nouvelle distinction visible pour les sources dégradées passe par `lang/fr.json` et `lang/en.json`.

Justification :

- conforme à ADR-0005 ;
- évite les textes hardcodés dans `character-sheet.mjs` ou le template ;
- garde la cohérence FR/EN des états utilisateurs.

### 4.7. Les tests restent centrés sur le contrat d'affichage utile

**Décision** : étendre les tests `character-sheet-talents.test.mjs` avec des assertions ciblées sur les libellés, la déduplication, le tri et les marqueurs dégradés, sans comparer des structures HTML complètes.

Justification :

- conforme à ADR-0004 et ADR-0012 ;
- meilleure lisibilité des échecs ;
- protège le contrat métier visible sans rendre les tests fragiles au markup exact.

---

## 5. Plan de travail détaillé

### Étape 1 — Auditer le contrat d'affichage préparé par `#buildConsolidatedTalentList()`

**Quoi faire** : revoir les données exposées au template pour que chaque entrée talents porte explicitement :

- un nom d'affichage sûr ;
- des tags lisibles ;
- un rang visible pour les ranked ;
- des sources localisées et dédupliquées ;
- une distinction entre source inconnue et spécialisation sans arbre disponible.

**Fichiers** :

- `module/applications/sheets/character-sheet.mjs`

**Risques spécifiques** :

- continuer à écraser toute erreur de résolution derrière un unique fallback trop vague ;
- faire dériver l'adaptateur sheet vers une logique métier qui devrait rester dans le domaine.

### Étape 2 — Refaire le rendu des sources et du rang dans le template talents

**Quoi faire** : ajuster `templates/sheets/actor/talents.hbs` pour que la hiérarchie visuelle rende plus évidents :

- le rang des ranked ;
- la liste des spécialisations sources ;
- les libellés dégradés lorsqu'une source n'est pas résolue.

Le template doit rester déclaratif, sans logique d'achat, d'édition ou de suppression.

**Fichiers** :

- `templates/sheets/actor/talents.hbs`

**Risques spécifiques** :

- laisser un rendu ambigu entre source connue et source dégradée ;
- dégrader la lisibilité si plusieurs spécialisations sont présentes sur une petite largeur.

### Étape 3 — Ajuster le style de l'onglet Talents pour les cas multi-sources et dégradés

**Quoi faire** : compléter `styles/actor.less` pour améliorer :

- la mise en avant du rang ;
- la lecture des tags ;
- le wrapping des sources longues ;
- l'identification visuelle des états dégradés.

**Fichiers** :

- `styles/actor.less`

**Risques spécifiques** :

- régression visuelle sur d'autres `line-item` si le scope CSS n'est pas strict ;
- mauvais rendu mobile/étroit si les sources longues ne se replient pas proprement.

### Étape 4 — Ajouter les clés i18n nécessaires aux nouveaux marqueurs de source

**Quoi faire** : compléter `lang/fr.json` et `lang/en.json` avec les libellés manquants pour exprimer distinctement :

- source inconnue ;
- spécialisation sans arbre disponible ;
- éventuellement source incomplète / nœud introuvable si ces états sont exposés dans la UI finale.

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- créer des clés trop fines non utilisées ;
- divergence FR/EN ou terminologie incohérente entre états proches.

### Étape 5 — Étendre les tests de non-régression sur l'adaptateur de fiche

**Quoi faire** : compléter `tests/applications/sheets/character-sheet-talents.test.mjs` pour couvrir au minimum :

- ranked multi-arbres -> rang consolidé visible ;
- non-ranked multi-arbres -> une seule entrée ;
- déduplication des sources sans duplication inutile ;
- distinction entre `UNKNOWN_SOURCE` et "spécialisation sans arbre disponible" ;
- maintien de l'affichage des autres talents quand une entrée est dégradée ;
- stabilité du tri malgré les nouveaux fallbacks.

**Fichiers** :

- `tests/applications/sheets/character-sheet-talents.test.mjs`

**Risques spécifiques** :

- tests trop couplés à la structure HTML au lieu du contrat de données ;
- oubli d'un cas dégradé explicitement demandé par l'issue.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/sheets/character-sheet.mjs` | modification | Affiner le mapping `OwnedTalentSummary` -> données template-ready avec marqueurs de source plus explicites |
| `templates/sheets/actor/talents.hbs` | modification | Rendre le rang et les sources plus lisibles, y compris en cas d'état dégradé |
| `styles/actor.less` | modification | Ajuster la présentation des lignes consolidées, du rang et des sources multi-spé |
| `lang/fr.json` | modification | Ajouter les libellés FR pour les nouveaux marqueurs de source dégradée |
| `lang/en.json` | modification | Ajouter les libellés EN correspondants |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | modification | Vérifier le contrat d'affichage final de US13 |
| `tests/lib/talent-node/owned-talent-summary.test.mjs` | modification optionnelle | Uniquement si un écart de contrat domaine est découvert en cours d'implémentation |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Tous les états dégradés restent ramenés à `UNKNOWN_SOURCE` | L'issue #197 n'est pas réellement satisfaite | Mapper explicitement les `resolutionState` vers des libellés distincts et les verrouiller par tests |
| L'adaptateur UI réimplémente de la logique métier | Divergence future entre domaine et fiche personnage | Limiter la sheet à la traduction visuelle des états déjà calculés par `buildOwnedTalentSummary()` |
| Les sources multi-spé deviennent illisibles | Régression UX malgré la consolidation correcte | Déduplication stricte, wrapping CSS contrôlé, tests ciblés sur les labels produits |
| Le style de l'onglet impacte d'autres lignes de fiche | Régression visuelle hors Talents | Scoper le CSS sous `.tab.talents .talent-consolidated` |
| Les nouvelles clés i18n ne sont ajoutées que dans une langue | Clés brutes ou UI incohérente | Mettre à jour FR et EN dans le même changement et vérifier les usages |
| Les tests restent trop superficiels | Régression discrète sur les cas dégradés | Ajouter des assertions ciblées sur `sourceLabels`, `rank` et l'unicité des entrées |
| Glissement de scope vers la vue graphique ou les effets mécaniques | Retard et complexité inutile | Garder explicitement hors scope arbres, achat et ADR-0010 |

---

## 8. Proposition d'ordre de commit

1. `test(character-sheet): cover talent source degradation states`
2. `feat(character-sheet): clarify consolidated talent ranks and source labels`
3. `i18n(talent): add source fallback labels for talents tab`
4. `style(character-sheet): polish consolidated talent sources and rank display`

---

## 9. Dépendances avec les autres US

- **Dépend de US12 / #196** : la vue consolidée et le branchement initial de l'onglet Talents existent déjà.
- **S'appuie sur US7 / #191** : le rang consolidé et les sources proviennent de `buildOwnedTalentSummary()`.
- **S'appuie sur US8 / #192** : la gestion métier ranked / non-ranked dupliqués est déjà cadrée et testée.
- **Réutilise indirectement US4 / #188** : la résolution spécialisation -> arbre conditionne la qualité des sources affichées.
- **Ne remplace pas les futures US mécaniques** : les effets talents décrits par ADR-0010 restent hors de ce ticket.
