# Plan d'implémentation — US6 : Consulter l'historique d'évolution du personnage depuis sa fiche

**Issue** : [#156 — US6: Consulter l'historique d'évolution du personnage depuis sa fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/156)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`, `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`
**Module(s) impacté(s)** : `module/applications/character-audit-log.mjs` (création), `module/applications/_module.mjs` (modification), `module/applications/sheets/character-sheet.mjs` (modification), `module/utils/audit-diff.mjs` (modification mineure), `templates/applications/character-audit-log.hbs` (création), `templates/sheets/actor/character-header.hbs` (modification), `styles/applications.less` (modification), `styles/actor.less` (modification mineure), `lang/fr.json` (modification), `lang/en.json` (modification)

---

## 1. Objectif

Ajouter une interface Foundry V2 permettant d'ouvrir, depuis la fiche d'un personnage, une fenetre de consultation en lecture seule de `actor.flags.swerpg.logs`, affichee du plus recent au plus ancien, filtrable par familles metier, localisee FR/EN, et conforme aux regles d'acces suivantes :

- un MJ peut consulter le journal de tous les personnages ;
- un joueur ne peut consulter que le journal des personnages dont il est proprietaire (`OWNER` exact).

Cette US couvre uniquement la visualisation. Elle ne modifie ni le principe de stockage des logs, valide par ADR-0011, ni le comportement d'export qui reste hors scope et renvoye a US7.

---

## 2. Perimetre

### Inclus dans cette US / ce ticket

- Creation d'une application Foundry V2 dediee a la consultation du journal d'evolution.
- Ajout d'un point d'entree depuis la fiche `character`.
- Integration d'un bouton d'ouverture discret sous forme d'icone Font Awesome evocant l'historique / la consultation de log, avec tooltip et traitement visuel immersif coherent avec l'esthetique Star Wars du systeme.
- Affichage chronologique inverse des entrees.
- Affichage, pour chaque entree :
  - date lisible ;
  - type d'action lisible ;
  - description textuelle claire ;
  - variation d'XP visuellement differenciee.
- Filtrage des entrees par familles metier.
- Internationalisation complete FR/EN.
- Controle d'acces GM / proprietaire exact.
- Gestion d'un fallback d'affichage pour les types inconnus ou les entrees partielles.
- Enrichissement minimal des logs de specialisation pour permettre une description lisible de l'historique.

### Exclu de cette US / ce ticket

- Export du journal -> US7.
- Modification, suppression ou edition d'une entree depuis l'UI.
- Regroupement metier de plusieurs entrees techniques en une seule ligne visuelle.
- Migration retroactive ou backfill des anciennes entrees deja persistees.
- Refonte du modele d'audit log ou deplacement hors `flags.swerpg.logs`.
- Mecanisme de recherche texte libre, pagination ou virtualisation avancee.

---

## 3. Constat sur l'existant

### 3.1. L'infrastructure d'audit existe deja

Le stockage et l'ecriture sont deja en place :

- `module/utils/audit-log.mjs:8` stocke le journal dans `flags.swerpg.logs`.
- `module/utils/audit-log.mjs:222-295` expose `onPreUpdateActor`, `onUpdateActor`, `onCreateItem`, `registerAuditLogHooks()`.
- `swerpg.mjs:323-338` enregistre les hooks au `setup`.

Les entrees actuelles incluent deja les champs structurants attendus par ADR-0011 :

- `id`
- `schemaVersion`
- `timestamp`
- `userId`
- `userName`
- `type`
- `data`
- `xpDelta`
- `snapshot`

Reference : `module/utils/audit-diff.mjs:52-63`.

### 3.2. Il n'existe aucune UI de consultation

Aucune application, aucun template, aucune action de sheet ne permet aujourd'hui d'ouvrir le journal.

- La fiche personnage expose deja des actions V2 dans `module/applications/sheets/character-sheet.mjs:71-95`.
- Le header de la fiche est le point d'integration le plus naturel : `templates/sheets/actor/character-header.hbs:1-45`.
- La base sheet actor est deja structuree en `PARTS` et `TABS` via ApplicationV2 : `module/applications/sheets/base-actor-sheet.mjs:62-127`.

### 3.3. Les logs sont exploitables pour l'affichage, avec un gap sur les specialisations

La majorite des types d'entree disposent deja de donnees suffisantes pour une description claire :

- `skill.train` / `skill.forget` : `skillName`, `skillCategory`, rangs, cout
- `characteristic.increase` : `characteristicId`, `oldValue`, `newValue`, `cost`
- `xp.spend` / `xp.refund` / `xp.grant` / `xp.remove` : montants et valeurs avant/apres
- `species.set`, `career.set` : anciennes et nouvelles valeurs
- `talent.purchase` : `talentName`, `cost`, `ranks`
- `advancement.level` : `oldLevel`, `newLevel`

References : `module/utils/audit-diff.mjs:70-430`, `module/utils/audit-log.mjs:259-285`.

Gap identifie :

- `specialization.add` et `specialization.remove` ne stockent aujourd'hui que `specializationId` dans `module/utils/audit-diff.mjs:326-368`.
- Pour une suppression, le nom n'est plus reconstructible depuis l'etat courant de l'acteur.
- Sans enrichissement a l'ecriture, l'UI ne peut pas toujours produire une description claire conforme au critere d'acceptation.

### 3.4. Les contraintes d'architecture sont deja definies

- ADR-0011 impose le stockage dans `actor.flags.swerpg.logs` comme donnee secondaire.
- ADR-0001 impose ApplicationV2 / HandlebarsApplicationMixin pour toute nouvelle UI moderne.
- ADR-0005 impose une localisation FR/EN via cles i18n, sans texte hardcode.

### 3.5. La performance cible reste compatible avec une liste simple

Le journal est plafonne par setting via `module/utils/audit-log.mjs:204-210`, avec une valeur par defaut de 500 entrees et une borne haute documentee plus large. Une liste simple reste adaptee si :

- le rendu est plat ;
- le conteneur est scrollable ;
- le filtrage est local a la fenetre ;
- aucun etat de filtre n'est persiste sur l'acteur.

---

## 4. Decisions d'architecture

### 4.1. Fenetre dediee plutot qu'un nouvel onglet de fiche

**Decision** : creer une application Foundry V2 dediee, ouverte depuis la fiche, plutot qu'ajouter un nouvel onglet dans `CharacterSheet`.

Options envisagees :

- nouvel onglet dans la fiche personnage ;
- fenetre dediee `ApplicationV2` / `DocumentSheetV2`.

Decision retenue : fenetre dediee.

Justification :

- l'issue demande explicitement de pouvoir ouvrir une fenetre ;
- le journal est consultatif et n'appartient pas au flux principal d'edition ;
- une fenetre se prete mieux a la lecture seule et a un historique potentiellement long ;
- cela evite d'alourdir les tabs permanents de la fiche.

### 4.2. Application liee au document acteur

**Decision** : implementer l'UI comme application Handlebars basee sur un document acteur, dans la lignee du pattern deja present avec `SkillConfig`.

Options envisagees :

- `HandlebarsApplicationMixin(api.DocumentSheetV2)` avec `document: actor` ;
- `ApplicationV2` libre avec l'acteur passe dans les options.

Decision retenue : application liee au document.

Justification :

- le pattern existe deja dans le repo ;
- le titre, le contexte, les permissions et le cycle de rendu sont plus simples a gerer ;
- l'application reste naturellement associee a un acteur unique.

### 4.3. Bouton d'ouverture dans le header, sous forme d'icone discrete immersive

**Decision** : ajouter le declencheur dans `templates/sheets/actor/character-header.hbs`, sous forme d'une icone Font Awesome discrete avec tooltip et effet de survol immersif Star Wars.

Options envisagees :

- bouton texte dans le header ;
- icone discrete dans le header ;
- controle dans la sidebar.

Decision retenue : icone discrete dans le header.

Justification :

- conforme a l'AC "dans l'en-tete ou la barre laterale" ;
- l'utilisateur a explicitement valide ce choix ;
- le header contient deja les actions de haut niveau ;
- une icone discreete limite l'impact visuel tout en restant accessible via tooltip et style de survol.

### 4.4. Controle d'acces strict : MJ ou `OWNER` exact

**Decision** : autoriser l'ouverture uniquement si `game.user.isGM` ou `actor.testUserPermission(game.user, 'OWNER', { exact: true })`.

Options envisagees :

- `actor.isOwner` ;
- `testUserPermission(..., 'OWNER', { exact: true })` ;
- simple visibilite de la fiche.

Decision retenue : `OWNER` exact ou MJ.

Justification :

- c'est la seule option strictement conforme a l'AC "ses propres personnages" ;
- un observateur ou un utilisateur avec droit inferieur ne doit pas voir le journal ;
- le pattern `OWNER` exact existe deja dans `module/dice/standard-check.mjs:400-408`.

### 4.5. Filtre par familles metier plutot que par types techniques bruts

**Decision** : filtrer par familles metier (`competences`, `talents`, `XP`, `caracteristiques`, `choix fondamentaux`, `avancement`) plutot que par types exacts comme `skill.train` ou `xp.refund`.

Options envisagees :

- filtre par types techniques ;
- filtre par familles metier.

Decision retenue : filtre metier.

Justification :

- l'utilisateur a explicitement valide ce choix ;
- l'issue donne des exemples de filtrage metier ;
- c'est plus lisible pour un joueur ou un MJ qu'un filtre expose sur les details internes du systeme.

### 4.6. Description lisible calculee au rendu, pas persistee dans les flags

**Decision** : conserver les logs structures bruts et fabriquer les labels / descriptions localises au moment du rendu.

Options envisagees :

- persister une `description` localisee dans chaque entree ;
- generer la description cote UI a partir de `type` + `data`.

Decision retenue : generation cote UI.

Justification :

- conforme ADR-0011 : le log reste une structure de trace, pas une vue materialisee ;
- conforme ADR-0005 : les textes doivent suivre la langue active ;
- evite de figer une langue ou un wording au moment de l'ecriture ;
- limite les besoins de migration si les libelles evoluent.

### 4.7. Enrichissement minimal des entrees de specialisation, sans migration

**Decision** : enrichir `specialization.add` et `specialization.remove` avec le nom de la specialisation au moment de l'ecriture, sans migration de donnees.

Options envisagees :

- afficher uniquement l'ID ;
- tenter de resoudre le nom depuis l'etat courant ;
- persister le nom dans `data`.

Decision retenue : persister le nom.

Justification :

- l'utilisateur a valide cet enrichissement ;
- pour `specialization.remove`, le nom n'est plus disponible apres suppression ;
- le projet est encore en developpement, donc aucune migration n'est necessaire ;
- cet enrichissement reste minimal et n'affecte pas le principe de stockage en flags.

### 4.8. Tri inverse et filtrage purement UI

**Decision** : conserver le stockage append-only dans l'ordre d'ecriture et presenter une vue triee du plus recent au plus ancien, avec filtrage local a la fenetre.

Justification :

- l'ecriture actuelle est deja append-only ;
- cela evite de modifier les invariants de stockage ;
- le filtre ne doit pas ecrire sur le document ni creer d'etat persistant parasite.

---

## 5. Plan de travail detaille

### Etape 1 : Creer l'application de consultation

**Quoi faire** :

- Creer une nouvelle application dediee au journal d'evolution.
- Lier l'application a un acteur `character`.
- Definir un titre localise incluant le nom du personnage.
- Preparer un contexte de rendu contenant :
  - l'acteur ;
  - l'autorisation d'acces ;
  - la liste des entrees formatees ;
  - les familles de filtres ;
  - le filtre actif ;
  - l'etat vide.

**Fichiers** :

- `module/applications/character-audit-log.mjs`
- `module/applications/_module.mjs`

**Risques specifiques** :

- mauvais choix de classe de base Foundry ;
- contexte de rendu trop couple au stockage brut.

### Etape 2 : Brancher l'ouverture depuis la fiche personnage

**Quoi faire** :

- Ajouter une nouvelle action dans `CharacterSheet.DEFAULT_OPTIONS.actions`.
- Implementer le handler d'ouverture de la fenetre.
- Ajouter une icone Font Awesome discrete dans `character-header.hbs`.
- Ajouter une tooltip localisee et des attributs d'accessibilite adaptes.
- Masquer ou neutraliser le controle si l'utilisateur n'a pas les droits requis.

**Fichiers** :

- `module/applications/sheets/character-sheet.mjs`
- `templates/sheets/actor/character-header.hbs`
- `styles/actor.less`

**Risques specifiques** :

- collision visuelle avec les controles deja presents dans le header ;
- controle visible mais non fonctionnel pour un utilisateur non autorise.

### Etape 3 : Construire la presentation des entrees

**Quoi faire** :

- Lire `actor.flags.swerpg.logs`.
- Trier du plus recent au plus ancien.
- Mapper chaque entree vers une structure d'affichage comprenant :
  - date formatee ;
  - label de type ;
  - famille metier ;
  - description ;
  - `xpDelta` formate ;
  - classes CSS d'etat.
- Prevoir un fallback pour les types inconnus ou les donnees partielles.

**Fichiers** :

- `module/applications/character-audit-log.mjs`

**Risques specifiques** :

- descriptions incompletes pour certains types historiques ;
- divergence entre type technique et libelle affiche.

### Etape 4 : Enrichir les logs de specialisation pour l'affichage historique

**Quoi faire** :

- Completer `specialization.add` et `specialization.remove` avec le nom de specialisation.
- Ajouter les tests de non-regression associes.
- Conserver un fallback sur l'ID si une entree partielle est lue.

**Fichiers** :

- `module/utils/audit-diff.mjs`
- `tests/utils/audit-diff.test.mjs`

**Risques specifiques** :

- hypothese erronee sur la structure des specialisations dans le diff ;
- coexistence temporaire d'entrees partielles en test local.

### Etape 5 : Realiser le template et le style de la fenetre

**Quoi faire** :

- Creer un template Handlebars dedie.
- Ajouter :
  - un entete de fenetre ;
  - un controle de filtre ;
  - une liste scrollable ;
  - un etat vide ;
  - une presentation claire de la date, de la description, du type et de la variation XP.
- Styliser l'icone du header avec un effet de survol discret, immersif et coherent avec le langage visuel SWERPG.
- Styliser les variations d'XP :
  - gain en vert ;
  - depense en rouge ;
  - neutre en style discret.

**Fichiers** :

- `templates/applications/character-audit-log.hbs`
- `styles/applications.less`
- `styles/actor.less`

**Risques specifiques** :

- surcharge visuelle si l'esthetique prend le pas sur la lisibilite ;
- scroll ou densite degradant la lecture d'un historique long.

### Etape 6 : Ajouter l'i18n

**Quoi faire** :

- Ajouter les cles FR/EN pour :
  - le titre de la fenetre ;
  - le tooltip et l'aria-label du bouton d'ouverture ;
  - les familles de filtres ;
  - les labels de type ;
  - les descriptions textuelles ;
  - l'etat vide ;
  - les libelles de variation XP.

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques specifiques** :

- cles manquantes entre FR et EN ;
- formulations trop techniques exposees a l'utilisateur final.

### Etape 7 : Couvrir par tests et scenarios manuels

**Quoi faire** :

- Ajouter des tests unitaires / d'integration pour :
  - permissions d'ouverture ;
  - tri inverse ;
  - filtrage metier ;
  - fallback d'entree inconnue ;
  - formatage `xpDelta` ;
  - descriptions de specialisation enrichies.
- Ajouter un test de l'action de feuille qui ouvre la fenetre.
- Etendre les scenarios manuels de l'audit log avec la consultation UI.

**Fichiers** :

- `tests/applications/character-audit-log.test.mjs`
- `tests/applications/sheets/character-sheet-audit-log.test.mjs`
- `tests/utils/audit-diff.test.mjs`
- `documentation/tests/manuel/audit-log/README.md`

**Risques specifiques** :

- mock Foundry insuffisant pour une application document-based ;
- tests trop couples au markup exact.

---

## 6. Fichiers modifies

| Fichier | Action | Description du changement |
|---------|--------|---------------------------|
| `module/applications/character-audit-log.mjs` | Creation | Nouvelle application V2 de consultation du journal |
| `module/applications/_module.mjs` | Modification | Export de la nouvelle application |
| `module/applications/sheets/character-sheet.mjs` | Modification | Action d'ouverture du journal depuis la fiche |
| `module/utils/audit-diff.mjs` | Modification | Enrichissement des entrees de specialisation avec leur nom |
| `templates/applications/character-audit-log.hbs` | Creation | Template de la fenetre d'historique |
| `templates/sheets/actor/character-header.hbs` | Modification | Ajout de l'icone d'ouverture avec tooltip |
| `styles/applications.less` | Modification | Style de la fenetre d'historique |
| `styles/actor.less` | Modification mineure | Ajustement du header et du survol de l'icone |
| `lang/fr.json` | Modification | Nouvelles cles FR de l'UI d'historique |
| `lang/en.json` | Modification | Nouvelles cles EN de l'UI d'historique |
| `tests/applications/character-audit-log.test.mjs` | Creation | Tests de l'application d'historique |
| `tests/applications/sheets/character-sheet-audit-log.test.mjs` | Creation | Tests du declencheur depuis la fiche |
| `tests/utils/audit-diff.test.mjs` | Modification | Couverture de l'enrichissement specialisation |
| `documentation/tests/manuel/audit-log/README.md` | Modification | Ajout des scenarios manuels de consultation UI |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Les anciennes entrees de specialisation ne portent pas encore de nom pendant le developpement local | Description moins lisible sur certaines donnees de test | Fallback sur l'ID et enrichissement immediat pour toutes les nouvelles entrees |
| Mauvais niveau de permission | Exposition du journal a des joueurs non proprietaires | Double garde : masquage UI + verification runtime a l'ouverture |
| Rendu lent avec grand volume de logs | UX degradee | Liste simple, conteneur scrollable, filtrage local, pas de composants imbriques |
| Desynchronisation FR/EN | UI partiellement localisee | Ajouter les cles dans les deux langues dans la meme etape et verifier la parite |
| Regression visuelle du header personnage | Degradation de la fiche | Placement minimal, icone discrete, ajustement CSS limite et teste |
| Effet immersif trop marque | Baisse de lisibilite ou surcharge visuelle | Prioriser contraste, taille contenue, survol discret et non bloquant |

---

## 8. Proposition d'ordre de commit

1. `feat(audit-log): persist specialization names for history display`
2. `feat(audit-log-ui): add character audit log application`
3. `feat(character-sheet): add audit log entry point in character header`
4. `style(audit-log-ui): add history window and immersive trigger styling`
5. `i18n(audit-log-ui): add localized filters, labels, and descriptions`
6. `test(audit-log-ui): cover permissions, sorting, filtering, and specialization labels`

---

## 9. Dependances avec les autres US

- **Depend de** :
  - `#151` / US1 pour l'infrastructure de stockage et de hooks ;
  - `#152` / US2 pour l'enrichissement des entrees de competences ;
  - `#153` / US3 pour les caracteristiques ;
  - `#155` / US5 pour les choix fondamentaux ;
  - `#159` / TECH-159 pour l'analyseur de diff.

- **Prepare** :
  - `#157` / US7 export, qui pourra reutiliser la meme fenetre comme point d'entree UX.

- **Hors dependance forte** :
  - un futur regroupement visuel d'actions composites (`skill.train` + `xp.spend`) pourra etre ajoute ulterieurement sans remettre en cause cette UI.

---

## 10. Decisions validees avec le demandeur

Les choix suivants ont ete valides avant redaction finale du plan :

1. Filtre par familles metier plutot que par types techniques bruts.
2. Bouton d'ouverture dans le header, sous forme d'une icone Font Awesome discrete, immersive, avec effet de survol et tooltip.
3. Permission d'acces : MJ ou proprietaire `OWNER` exact uniquement.
4. Enrichissement minimal des entrees de specialisation avec leur nom, sans migration a prevoir car le projet est encore en developpement.
