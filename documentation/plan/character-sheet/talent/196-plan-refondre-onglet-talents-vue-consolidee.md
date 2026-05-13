# Plan d'implementation - US12 : Refondre l'onglet Talents en vue consolidee

**Issue** : [#196 - US12: Refondre l'onglet Talents en vue consolidee](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/196)
**Epic** : [#184 - EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0010-architecture-des-effets-mecaniques-des-talents.md`
**Module(s) impacte(s)** : `module/applications/sheets/character-sheet.mjs` (modification), `templates/sheets/actor/talents.hbs` (modification), `styles/actor.less` (modification), `lang/fr.json` (modification potentielle), `lang/en.json` (modification potentielle), `tests/applications/sheets/character-sheet-talents.test.mjs` (modification)

---

## 1. Objectif

Remplacer l'ancien onglet Talents de la fiche personnage par une vue de consultation consolidee, alimentee par la couche domaine deja introduite avec US7.

Le resultat attendu est un onglet lisible en jeu, sans achat direct, sans persistance d'une vue derivee, et tolerant aux donnees incompletes.

---

## 2. Perimetre

### Inclus dans cette US / ce ticket

- Brancher l'onglet Talents sur la vue consolidee derivee de `actor.system.progression.talentPurchases`.
- Afficher pour chaque talent :
  - nom ;
  - activation ;
  - ranked / non-ranked ;
  - rang consolide si applicable ;
  - source(s) lisibles.
- Garantir une seule entree pour un talent ranked, avec rang consolide.
- Garantir une seule entree pour un talent non-ranked, meme multi-arbres.
- Gerer les cas degrades sans bloquer l'onglet :
  - talent introuvable ;
  - source non resolue ;
  - arbre incomplet ;
  - noeud manquant.
- Stabiliser un ordre d'affichage simple et previsible.
- Ajouter ou ajuster les tests Vitest cibles sur la preparation de contexte de fiche.

### Exclu de cette US / ce ticket

- Achat depuis l'onglet Talents.
- Drag & drop.
- Suppression / remboursement.
- Edition manuelle.
- Automatisation des effets mecaniques / `ActiveEffect`.
- Persistance de la vue consolidee dans `system` ou `flags`.
- Refonte de la vue graphique des arbres de specialisation.
- Ajout d'un acces depuis l'onglet Talents vers la vue graphique.
- Refonte du legacy `actor-mixins/talents.mjs` au-dela de ce qui est strictement necessaire pour ne pas interferer.

---

## 3. Constat sur l'existant

- La couche domaine existe deja :
  - `module/lib/talent-node/owned-talent-summary.mjs`
  - `module/lib/talent-node/talent-tree-resolver.mjs`
- La dependance fonctionnelle principale `#191` est livree : la vue consolidee est calculee a partir de `talentPurchases` et non persistee.
- `module/applications/sheets/character-sheet.mjs` appelle deja `buildOwnedTalentSummary()` via `#buildConsolidatedTalentList()`.
- `templates/sheets/actor/talents.hbs` affiche deja une liste consolidee minimale.
- `tests/applications/sheets/character-sheet-talents.test.mjs` couvrent deja une partie du mapping sheet -> template data.
- `styles/actor.less` possede une section `.tab.talents`, mais pas de stylage explicite des nouvelles classes `talent-consolidated`, `talent-rank`, `talent-sources`.
- Les cles i18n de base existent deja :
  - `SWERPG.TALENT.ACTIVE`
  - `SWERPG.TALENT.PASSIVE`
  - `SWERPG.TALENT.RANKED`
  - `SWERPG.TALENT.UNKNOWN`
  - `SWERPG.TALENT.UNKNOWN_SOURCE`
  - `SWERPG.TALENT.SOURCES`
- L'onglet n'est pas encore completement aligne avec le cadrage :
  - pas d'ordre d'affichage stabilise ;
  - pas de strategie documentee pour les etats degrades fins ;
  - pas de rendu explicite du caractere non-ranked ;
  - pas de stylage dedie ;
  - aucun point d'entree visible vers la vue graphique, bien qu'un handler `talentTree` existe cote `CharacterSheet`.

---

## 4. Decisions d'architecture

### 4.1. L'onglet Talents consomme exclusivement la couche domaine consolidee

**Decision** : l'onglet lit `buildOwnedTalentSummary()` et n'accede pas directement a `talentPurchases` pour reconstruire sa propre logique.

Justification :

- conforme a l'issue ;
- conforme au cadrage `01-modele-domaine-talents.md` et `04-ui-onglet-talents.md` ;
- evite de dupliquer la logique metier dans l'UI ;
- reduit le risque de divergence entre US7 et US12.

### 4.2. La vue consolidee reste derivee et non persistee

**Decision** : aucune donnee supplementaire n'est ecrite dans `actor.system` ou `actor.flags`.

Justification :

- conforme a US7 et au cadrage ;
- evite une deuxieme source de verite ;
- garde le recalcul naturel apres achat ou import.

### 4.3. Presentation minimale retenue : liste simple triee

**Decision** : afficher une liste plate, lisible et stable, sans regroupement visuel par activation en V1.

Justification :

- choix valide ;
- plus simple a implementer et a tester ;
- suffisant pour satisfaire l'issue ;
- evite d'introduire une structure de sections non demandee.

### 4.4. Tri d'affichage deterministe au niveau feuille

**Decision** : appliquer un tri UI stable sur les entrees consolidees avant rendu, sans modifier le contrat domaine de US7.

Ordre recommande :

- nom resolu croissant ;
- a defaut, libelle degrade ;
- en cas d'egalite, `talentId`.

Justification :

- ameliore la lisibilite en jeu ;
- limite les variations d'ordre dues a l'historique d'achat ;
- garde la logique metier independante des preferences d'affichage.

### 4.5. Les sources sont deduites pour l'affichage

**Decision** : l'UI deduplique les libelles de source affiches, meme si plusieurs achats d'un talent ranked proviennent d'une meme specialisation.

Justification :

- l'utilisateur attend des sources lisibles, pas une repetition de labels identiques ;
- le rang reste porte par `entry.rank`, donc la perte d'information n'affecte pas la progression ;
- la granularite achat-par-noeud reste disponible dans la couche domaine si necessaire ailleurs.

### 4.6. Les etats degrages restent non bloquants et localises

**Decision** : toute entree invalide ou partiellement resolue reste affichee avec fallback lisible.

Regles minimales :

- nom manquant -> `SWERPG.TALENT.UNKNOWN`
- source non resolue -> `SWERPG.TALENT.UNKNOWN_SOURCE`
- activation inconnue ou absente -> libelle neutre ou absence de tag, selon la cle disponible
- aucun crash ni filtrage silencieux d'une entree achetee

Justification :

- conforme a l'issue ;
- conforme au cadrage UI ;
- utile pour les imports incomplets et le diagnostic.

### 4.7. Aucun acces a la vue graphique dans cette US

**Decision** : meme si `actor.toggleTalentTree()` existe deja, US12 ne cree pas de bouton ni d'action d'ouverture depuis l'onglet Talents.

Justification :

- choix valide ;
- l'issue #196 est centree sur la vue consolidee ;
- evite d'elargir la US a un couplage avec la vue graphique des arbres.

### 4.8. Les effets mecaniques restent explicitement hors scope

**Decision** : l'onglet n'interprete pas `system.effects`, n'applique aucun `ActiveEffect` et n'enrichit pas le rendu avec de la logique mecanique.

Justification :

- conforme a l'issue ;
- conforme a ADR-0010 ;
- evite de melanger vue de possession et automatisation metier.

---

## 5. Plan de travail detaille

### Etape 1 - Auditer et stabiliser l'adaptateur UI de l'onglet Talents

**Quoi faire** : revoir `#buildConsolidatedTalentList()` dans `module/applications/sheets/character-sheet.mjs` pour garantir un contrat template propre :

- ordre stable ;
- source labels dedupliques ;
- libelles degrages coherents ;
- exposition explicite des donnees utiles au template.

**Fichiers** :

- `module/applications/sheets/character-sheet.mjs`

**Risques** :

- casser les tests existants en modifiant le contrat de rendu ;
- introduire un tri dependant de labels localises si le tri est applique trop tard.

### Etape 2 - Refaire le template de l'onglet Talents autour de la vue consolidee

**Quoi faire** : adapter `templates/sheets/actor/talents.hbs` pour afficher clairement :

- nom ;
- tags d'activation ;
- statut ranked / non-ranked ;
- rang si applicable ;
- sources.

Le template doit rester purement declaratif, sans action d'achat.

**Fichiers** :

- `templates/sheets/actor/talents.hbs`

**Risques** :

- afficher implicitement certaines infos sans les rendre lisibles ;
- conserver des hypotheses de rendu legacy liees aux `Item` embarques.

### Etape 3 - Ajouter le stylage dedie a l'onglet Talents consolide

**Quoi faire** : completer `styles/actor.less` pour prendre en charge la structure reelle du template consolide :

- espacement ;
- lisibilite des tags ;
- mise en valeur du rang ;
- affichage compact et lisible des sources ;
- comportement correct sur largeur reduite.

**Fichiers** :

- `styles/actor.less`

**Risques** :

- regression visuelle sur d'autres `.line-item` si les selecteurs sont trop larges ;
- mauvais rendu mobile/etroit si la hierarchie n'est pas specifique a `.tab.talents`.

### Etape 4 - Completer l'i18n si des libelles manquent

**Quoi faire** : verifier si l'onglet a besoin de nouvelles cles pour :

- non-ranked ;
- rang ;
- etat non specifie ;
- eventuel message vide si aucun talent n'est possede.

N'ajouter des cles que si les libelles existants ne suffisent pas.

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques** :

- introduire des cles non utilisees ;
- incoherence FR/EN.

### Etape 5 - Etendre les tests de feuille personnage

**Quoi faire** : completer `tests/applications/sheets/character-sheet-talents.test.mjs` pour couvrir :

- tri stable ;
- deduplication des sources affichees ;
- rendu degrade non bloquant ;
- absence d'achat direct ;
- talents ranked et non-ranked ;
- multi-spe.

Ajouter des scenarios cibles seulement si le contrat feuille change reellement.

**Fichiers** :

- `tests/applications/sheets/character-sheet-talents.test.mjs`

**Risques** :

- tests trop couples a des details de presentation ;
- oublier un scenario degrade alors qu'il est demande par l'issue.

---

## 6. Fichiers modifies

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/sheets/character-sheet.mjs` | modification | Stabiliser l'adaptation de `buildOwnedTalentSummary()` vers les donnees template-ready |
| `templates/sheets/actor/talents.hbs` | modification | Remplacer le rendu implicite par un affichage consolide explicite et non interactif |
| `styles/actor.less` | modification | Ajouter le stylage specifique de l'onglet Talents consolide |
| `lang/fr.json` | modification potentielle | Ajouter les libelles manquants cote FR si besoin reel |
| `lang/en.json` | modification potentielle | Ajouter les libelles manquants cote EN si besoin reel |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | modification | Couvrir le contrat final de preparation de contexte et les cas degrages |
| `tests/lib/talent-node/owned-talent-summary.test.mjs` | modification optionnelle | Uniquement si un ecart domaine reel est decouvert pendant l'alignement UI |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| L'UI re-duplique de la logique metier | Divergence entre US7 et US12 | Garder toute consolidation dans `owned-talent-summary` et limiter la fiche a l'adaptation d'affichage |
| Ordre d'affichage instable | Mauvaise lisibilite et tests fragiles | Definir un tri explicite et le documenter dans les tests |
| Sources repetees pour un talent ranked | Affichage confus | Dedupliquer les labels de sources cote presentation |
| Etats degrages masques | Donnees achetees invisibles | Toujours afficher une entree avec fallback localise |
| Selecteurs LESS trop generiques | Regression visuelle sur d'autres onglets | Scoper le CSS sous `.swerpg.sheet.actor .tab.talents` |
| Ajout i18n incomplet | Libelles bruts ou cles visibles | Verifier FR/EN ensemble et ne creer que les cles necessaires |
| Glissement de scope vers la vue graphique | US plus large que prevu | Exclure explicitement le bouton d'acces et tout achat depuis l'onglet |

---

## 8. Proposition d'ordre de commit

1. `feat(character-sheet): adapt talents tab data to consolidated talent summary`
2. `feat(character-sheet): refactor talents tab template for consolidated display`
3. `style(character-sheet): polish consolidated talents tab layout`
4. `test(character-sheet): cover consolidated talents tab states and fallbacks`

Si de nouvelles cles i18n sont reellement necessaires :

5. `i18n(talent): add missing labels for consolidated talents tab`

---

## 9. Dependances avec les autres US

- **Bloquante** : `#191` / US7, deja identifiee par l'issue. US12 depend de `buildOwnedTalentSummary()` comme source UI.
- **Amelioration mais non bloquante** : `#193` / US9, qui fiabilise le referentiel des definitions generiques de talents. US12 peut fonctionner avec des fallbacks tant que certaines definitions restent incompletes.
- **Hors dependance directe dans cette US** : la vue graphique des arbres de specialisation. Le cadrage la mentionne, mais le choix retenu est de ne pas l'integrer a US12.
