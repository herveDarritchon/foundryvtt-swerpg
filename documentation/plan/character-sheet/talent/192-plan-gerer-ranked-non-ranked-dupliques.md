# Plan d'implémentation — US8 : Gérer ranked et non-ranked dupliqués

**Issue** : [#192 — US8: Gérer ranked et non-ranked dupliqués](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/192)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/lib/talent-node/owned-talent-summary.mjs` (modification), `module/applications/sheets/character-sheet.mjs` (modification), `templates/sheets/actor/talents.hbs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/lib/talent-node/owned-talent-summary.test.mjs` (modification), `tests/applications/sheets/character-sheet-talents.test.mjs` (création)

---

## 1. Objectif

Finaliser le comportement V1 des talents dupliqués entre plusieurs arbres de spécialisation, en couvrant à la fois :

- la règle métier de consolidation ;
- l'affichage sans doublon dans l'onglet Talents actuel.

Le résultat attendu est :

- un talent ranked acheté depuis plusieurs arbres s'affiche une seule fois avec le bon rang consolidé ;
- un talent non-ranked acheté depuis plusieurs arbres s'affiche une seule fois avec plusieurs sources ;
- l'onglet Talents n'induit plus de faux double bénéfice ni de duplication visuelle.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Validation finale des règles de consolidation ranked / non-ranked dans `owned-talent-summary`
- Durcissement des cas limites si nécessaire :
  - plusieurs achats du même `talentId` sur plusieurs spécialisations ;
  - plusieurs achats du même non-ranked pour progression d'arbres différents ;
  - définition de talent absente ou partielle ;
  - source arbre / spécialisation incomplète
- Création d'un adaptateur fiche personnage pour consommer la vue consolidée au lieu de lire directement `actor.items`
- Adaptation du template `templates/sheets/actor/talents.hbs` pour afficher :
  - nom ;
  - activation ;
  - ranked / non-ranked ;
  - rang consolidé si applicable ;
  - source(s)
- Suppression du comportement UI ambigu sur les lignes consolidées :
  - pas d'édition directe d'un talent consolidé ;
  - pas de suppression directe d'une ligne consolidée
- Ajout des tests unitaires et UI minimaux couvrant l'absence de doublons visuels

### Exclu de cette US / ce ticket

- Refonte complète visuelle de l'onglet Talents prévue par US12 / US13
- Achat de talents depuis l'onglet Talents
- Vue graphique des arbres de spécialisation
- Migration complète du legacy talents hors des zones nécessaires à cet affichage
- Automatisation mécanique des talents
- Refonte du flux d'import OggDude
- Création d'une nouvelle ApplicationV2 dédiée aux talents

---

## 3. Constat sur l'existant

- La source de vérité V1 existe déjà dans `actor.system.progression.talentPurchases` via `module/models/character.mjs`.
- La consolidation métier existe déjà dans `module/lib/talent-node/owned-talent-summary.mjs`.
- Les tests `tests/lib/talent-node/owned-talent-summary.test.mjs` couvrent déjà :
  - ranked multi-achats ;
  - non-ranked dédupliqué ;
  - plusieurs sources ;
  - cas dégradés de résolution.
- En revanche, aucune UI ne consomme aujourd'hui cette consolidation.
- La fiche actuelle continue à construire l'onglet Talents depuis `this.actor.items` dans `module/applications/sheets/character-sheet.mjs#buildTalentList()`.
- Le regroupement actuel des ranked se fait par `name`, pas par `talentId`.
- Les non-ranked restent listés item par item.
- Le template `templates/sheets/actor/talents.hbs` suppose qu'une ligne correspond à un `Item` unique éditable/supprimable.
- Cette hypothèse est incompatible avec une ligne consolidée issue de plusieurs achats de nœuds.
- Le legacy `module/documents/actor-mixins/talents.mjs` et les anciens flux `module/lib/talents/*` restent présents mais ne doivent pas redevenir source de vérité.

---

## 4. Décisions d'architecture

### 4.1. La consolidation canonique reste `buildOwnedTalentSummary()`

**Décision** : US8 réutilise `module/lib/talent-node/owned-talent-summary.mjs` comme point d'entrée canonique, au lieu d'introduire une seconde logique côté sheet.

Justification :

- conforme au cadrage `01-modele-domaine-talents.md` ;
- évite deux interprétations métier concurrentes ;
- garde la logique testable sans Foundry UI ;
- capitalise sur US7 au lieu de la contourner.

### 4.2. Le regroupement UI se fait par `talentId`, jamais par `name`

**Décision** : l'onglet Talents doit afficher une ligne par entrée consolidée issue de `talentId`.

Justification :

- conforme à l'issue #192 ;
- corrige la faiblesse actuelle du regroupement par nom ;
- évite les collisions éditoriales ou de traduction.

### 4.3. L'onglet Talents actuel est branché sur une vue dérivée, pas sur `actor.items`

**Décision** : la fiche personnage construit un adaptateur d'affichage à partir de `buildOwnedTalentSummary()`.

Justification :

- l'AC UI de l'issue ne peut pas être satisfaite sans brancher la fiche ;
- conforme au cadrage `04-ui-onglet-talents.md` ;
- limite le changement à l'onglet Talents sans lancer toute la refonte US12/US13.

### 4.4. Les définitions de talents restent résolues en lecture seule

**Décision** : l'adaptateur sheet résout les métadonnées d'affichage des talents depuis les référentiels disponibles du monde / compendiums talent, sans utiliser les embedded `Item` acteur comme source de possession.

Justification :

- conforme à la séparation modèle métier / vue dérivée ;
- cohérent avec le rôle transitoire déjà décrit dans le plan US7 ;
- évite de recoupler la V1 à l'ancien modèle "un talent possédé = un Item acteur".

### 4.5. Une ligne consolidée n'est plus éditable ni supprimable directement

**Décision** : les contrôles `edit` / `delete` du template talents sont retirés, masqués ou désactivés pour les lignes issues de la vue consolidée.

Justification :

- une ligne consolidée peut représenter plusieurs achats ;
- il n'existe plus de correspondance 1 ligne = 1 document supprimable ;
- conforme au cadrage `04-ui-onglet-talents.md` qui exclut modification / suppression depuis l'onglet.

### 4.6. La règle ranked / non-ranked est reflétée explicitement dans le contrat d'affichage

**Décision** :
- ranked : `rank = nombre d'achats consolidés` ;
- non-ranked : une seule ligne, `rank = null`, plusieurs sources possibles.

Justification :

- conforme à `02-regles-achat-progression.md` ;
- évite toute ambiguïté visuelle sur un double bénéfice ;
- aligne l'UI sur le contrat domaine existant.

### 4.7. Les chaînes visibles doivent passer par l'i18n

**Décision** : les nouveaux libellés ou tags affichés dans l'onglet Talents utilisent des clés `lang/fr.json` et `lang/en.json`.

Justification :

- conforme à l'ADR-0005 ;
- évite de prolonger les textes hardcodés déjà présents dans la fiche ;
- prépare la réutilisation par les futures US UI.

---

## 5. Plan de travail détaillé

### Étape 1 — Verrouiller le contrat métier des talents dupliqués

**Quoi faire** : relire et compléter `owned-talent-summary` pour s'assurer que le contrat final couvre explicitement les règles US8.

**Fichiers** :
- `module/lib/talent-node/owned-talent-summary.mjs`
- `tests/lib/talent-node/owned-talent-summary.test.mjs`

**Risques spécifiques** :
- considérer US8 comme déjà terminée alors que seule la couche domaine l'est partiellement ;
- laisser des cas ambigus non documentés dans le contrat retourné.

### Étape 2 — Ajouter un adaptateur fiche personnage → vue consolidée

**Quoi faire** : remplacer la construction actuelle basée sur `actor.items` par une transformation de la vue `buildOwnedTalentSummary()` vers les données attendues par le template.

**Fichiers** :
- `module/applications/sheets/character-sheet.mjs`

**Risques spécifiques** :
- dépendance trop forte aux embedded items legacy ;
- résolution incomplète des définitions de talents si le référentiel n'est pas chargé.

### Étape 3 — Faire évoluer le template talents vers une ligne consolidée

**Quoi faire** : adapter `templates/sheets/actor/talents.hbs` pour afficher une entrée consolidée et ses sources, sans contrôles incohérents.

**Fichiers** :
- `templates/sheets/actor/talents.hbs`

**Risques spécifiques** :
- conserver des actions `edit` / `delete` devenues trompeuses ;
- afficher les sources de façon illisible si plusieurs spécialisations existent.

### Étape 4 — Localiser les nouveaux libellés d'affichage

**Quoi faire** : introduire ou réutiliser les clés i18n nécessaires pour `Active`, `Passive`, `Ranked`, `Sources`, états inconnus ou incomplets si affichés.

**Fichiers** :
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :
- introduire des libellés hardcodés supplémentaires ;
- divergence entre FR et EN.

### Étape 5 — Couvrir la non-régression UI et métier

**Quoi faire** : compléter les tests domaine et ajouter des tests ciblés sur l'adaptateur sheet pour vérifier l'absence de doublons visuels.

**Fichiers** :
- `tests/lib/talent-node/owned-talent-summary.test.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

**Risques spécifiques** :
- se limiter à des tests domaine alors que l'issue impose un effet visible dans l'UI ;
- écrire des tests trop couplés à une structure HTML fragile.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/lib/talent-node/owned-talent-summary.mjs` | modification | Verrouiller ou compléter le contrat métier de consolidation ranked / non-ranked |
| `module/applications/sheets/character-sheet.mjs` | modification | Construire les données de l'onglet Talents depuis la vue consolidée V1 |
| `templates/sheets/actor/talents.hbs` | modification | Afficher une ligne consolidée par talent avec sources et rang si applicable |
| `lang/fr.json` | modification | Ajouter les libellés FR nécessaires à l'affichage consolidé |
| `lang/en.json` | modification | Ajouter les libellés EN correspondants |
| `tests/lib/talent-node/owned-talent-summary.test.mjs` | modification | Compléter les cas métiers ciblés par l'issue |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | création | Vérifier l'absence de duplication visuelle et la bonne projection de la vue consolidée |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| La fiche continue à lire `actor.items` dans un sous-chemin oublié | L'UI garde des doublons malgré la consolidation | Centraliser toute la préparation talents dans un seul adaptateur sheet |
| Le référentiel de définitions talent n'est pas résolu en lecture | L'onglet affiche des talents partiellement vides | Prévoir un affichage dégradé explicite et des tests associés |
| Une ligne consolidée garde des actions legacy | Suppression ou édition incohérente d'un talent multi-source | Retirer ou neutraliser les contrôles sur les lignes consolidées |
| Les tests ne couvrent que le domaine | L'AC "aucune duplication visuelle" n'est pas réellement prouvée | Ajouter un test ciblé sur la préparation de données de la fiche |
| Le changement empiète trop sur US12/US13 | Rework futur plus coûteux | Limiter cette US à un branchement minimal sans refonte graphique complète |

---

## 8. Proposition d'ordre de commit

1. `test(talent): compléter les cas de consolidation ranked et non-ranked dupliqués`
2. `feat(talent): stabiliser le résumé consolidé des talents possédés`
3. `feat(character-sheet): brancher l'onglet talents sur la vue consolidée`
4. `feat(i18n): localiser les libellés de l'onglet talents consolidé`

---

## 9. Dépendances avec les autres US

- **Dépend de US7 / #191** : la vue consolidée existe déjà et constitue la base métier de cette US.
- **Réutilise US4 et US6 indirectement** : résolution spécialisation → arbre et achats persistés dans `talentPurchases`.
- **Prépare US12 / US13** : l'onglet Talents commencera déjà à consommer la bonne donnée, ce qui réduira la refonte ultérieure à un travail d'UX et de présentation.
- **N'absorbe pas US12 / US13** : cette US ne doit pas devenir une refonte complète de la fiche ou des arbres.
