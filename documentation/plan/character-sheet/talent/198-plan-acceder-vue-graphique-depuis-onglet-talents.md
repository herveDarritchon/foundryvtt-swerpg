# Plan d'implémentation — US14 : Accéder à la vue graphique depuis l'onglet Talents

**Issue** : [#198 — US14: Accéder à la vue graphique depuis l'onglet Talents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/198)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs` (modification), `module/documents/actor-mixins/talents.mjs` (modification), `templates/sheets/actor/talents.hbs` (modification), `styles/actor.less` (modification), `lang/fr.json` (modification potentielle), `lang/en.json` (modification potentielle), `tests/applications/sheets/character-sheet-talents.test.mjs` (modification), `tests/unit/documents/actor-talents-mixin.test.mjs` (modification potentielle)

---

## 1. Objectif

Ajouter dans l'onglet Talents de la fiche personnage un point d'entrée explicite vers la future vue graphique des arbres de spécialisation, sans réintroduire de logique métier dans l'onglet et sans le coupler au canvas legacy.

Le résultat attendu est un pont de navigation simple : depuis l'onglet Talents, l'utilisateur ouvre l'application graphique dédiée livrée par US15, avec l'acteur courant déjà transmis. La gestion de l'état interne de cette application, le choix de la spécialisation courante et l'achat de nœud restent hors de l'onglet.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Ajouter un bouton ou une action visible dans `templates/sheets/actor/talents.hbs` pour ouvrir la vue graphique.
- Brancher cette action sur la feuille personnage via le mécanisme d'actions existant de `CharacterSheet`.
- Introduire ou stabiliser un bridge acteur dédié vers l'application graphique, afin que l'onglet ne dépende pas directement d'un singleton UI global ou du canvas legacy.
- Transmettre l'acteur courant à l'application graphique au moment de l'ouverture.
- Garantir que l'ouverture et la fermeture de la vue graphique n'altèrent pas le rendu ni l'état de l'onglet Talents.
- Ajouter ou adapter les libellés i18n nécessaires au CTA si les clés n'existent pas déjà.
- Ajouter ou ajuster les tests ciblés sur le contexte de feuille et sur le bridge d'ouverture.

### Exclu de cette US / ce ticket

- Création de l'application graphique elle-même -> US15 (#199).
- Rendu des arbres, nœuds et connexions -> US16 (#200).
- Sélection de la spécialisation courante comme état UI interne de la vue graphique -> US17 (#201).
- Achat d'un nœud depuis la vue graphique -> US18 (#202).
- Synchronisation post-achat entre vue graphique et onglet Talents -> US19 (#203).
- Réécriture fonctionnelle du canvas legacy `module/canvas/talent-tree.mjs`.
- Achat depuis l'onglet Talents.
- Persistance d'un état de navigation dans `actor.system` ou `actor.flags`.

---

## 3. Constat sur l'existant

- `module/applications/sheets/character-sheet.mjs` contient déjà un handler d'action `talentTree` et prépare un `talentTreeButtonText`, mais aucun bouton correspondant n'est actuellement rendu dans `templates/sheets/actor/talents.hbs`.
- L'onglet Talents actuel est une vue consolidée de consultation conforme à US12 : il affiche les talents possédés, sans achat ni gestion d'un état de progression.
- Le point d'entrée existant `actor.toggleTalentTree()` dans `module/documents/actor-mixins/talents.mjs` ouvre encore `game.system.tree`, c'est-à-dire le canvas legacy instancié dans `swerpg.mjs` via `new SwerpgTalentTree()`.
- Ce canvas legacy dépend explicitement de `canvas`, minimise la fiche acteur, gère son propre cycle de vie et ne correspond pas à la cible de l'issue #199, qui impose une application Foundry dédiée et indépendante du canvas de scène.
- `templates/sheets/actor/talents.hbs` ne contient aujourd'hui aucun `data-action="talentTree"` ni autre CTA d'ouverture vers la vue graphique.
- `styles/actor.less` contient déjà le stylage de la liste consolidée des talents, mais aucune zone dédiée à une barre d'action ou à un bouton de navigation dans l'onglet Talents.
- Les tests existants couvrent bien la construction des entrées consolidées dans `tests/applications/sheets/character-sheet-talents.test.mjs`, mais pas l'exposition d'un CTA d'ouverture ni le contrat de navigation vers la vue graphique.
- Les tests unitaires de `toggleTalentTree()` dans `tests/unit/documents/actor-talents-mixin.test.mjs` sont actuellement `skip`, ce qui confirme que le bridge d'ouverture n'est pas encore stabilisé et qu'il faudra clarifier son contrat dans cette US.
- Le plan US12 (#196) excluait explicitement l'ajout d'un accès vers la vue graphique. US14 doit donc compléter l'onglet sans remettre en cause la consolidation déjà livrée.

---

## 4. Décisions d'architecture

### 4.1. Passer par un bridge acteur dédié, pas par `game.system.tree`

**Problème** : l'onglet Talents a besoin d'un point d'entrée pour ouvrir la vue graphique, mais l'API existante pointe vers le canvas legacy.

**Options envisagées** :

- appeler directement `game.system.tree.open(actor)` depuis la feuille ;
- réutiliser tel quel `actor.toggleTalentTree()` ;
- exposer une méthode acteur dédiée vers la future application graphique.

**Décision retenue** : utiliser un bridge acteur dédié, par exemple `actor.openSpecializationTreeApp()` ou équivalent, consommé par la feuille.

**Justification** :

- le template et `CharacterSheet` restent découplés de l'implémentation concrète de la vue graphique ;
- US15 peut faire évoluer l'application sans obliger US14 à dépendre d'un singleton UI ou du canvas ;
- l'API document-centric est cohérente avec le fait que l'acteur courant est la donnée minimale à transmettre.

### 4.2. US14 ouvre l'application, mais ne gère pas son état interne

**Problème** : l'issue mentionne la spécialisation courante, alors que l'onglet Talents n'a pas vocation à porter l'état de la vue graphique.

**Options envisagées** :

- faire porter à l'onglet un état de spécialisation sélectionnée ;
- transmettre seulement l'acteur et laisser la vue graphique gérer sa sélection ;
- persister une préférence de navigation sur l'acteur.

**Décision retenue** : US14 transmet l'acteur courant et, au mieux, un contexte initial non persistant si l'API US15 en prévoit un. La sélection effective de la spécialisation reste de la responsabilité de la vue graphique.

**Justification** :

- conforme à l'issue : l'onglet est un pont de navigation, pas le gestionnaire d'état de la vue graphique ;
- conforme au cadrage `04-ui-onglet-talents.md` et `05-ui-arbres-specialisation.md` ;
- évite d'introduire une source de vérité UI concurrente.

### 4.3. Ne pas prolonger l'existant legacy comme base fonctionnelle

**Problème** : le codebase contient déjà `toggleTalentTree()` et `module/canvas/talent-tree.mjs`, mais ce flux repose sur le canvas de scène et des patterns hérités de Crucible.

**Décision retenue** : US14 doit cibler le contrat de la future application dédiée US15, et non consolider `module/canvas/talent-tree.mjs` comme solution V1.

**Justification** :

- l'epic #184 et l'issue #199 actent que le canvas legacy n'est pas la base fonctionnelle à reconduire ;
- cela évite de créer une dette supplémentaire juste avant l'introduction de l'application dédiée ;
- US14 reste alignée avec ADR-0001 : nouvelle UI Foundry moderne plutôt que dépendance à un flux historique.

### 4.4. Le CTA doit être localisé et explicite

**Problème** : le code de feuille contient actuellement des chaînes anglaises hardcodées (`Open Talent Tree`, `Close Talent Tree`) pour un texte qui n'est même pas rendu dans l'onglet.

**Décision retenue** : le libellé du CTA exposé par US14 doit passer par i18n, avec des clés FR/EN dédiées si les clés existantes ne couvrent pas le besoin.

**Justification** :

- conforme à ADR-0005 ;
- évite de propager des textes hardcodés dans une zone visible de l'UI ;
- prépare l'évolution du wording quand la vue graphique US15 existera réellement.

### 4.5. Les tests doivent valider le contrat de navigation, pas l'implémentation de l'application

**Problème** : US14 dépend de US15, mais ne doit pas embarquer des tests fragiles sur le rendu graphique lui-même.

**Décision retenue** : tester uniquement :

- la présence et le câblage du CTA côté feuille ;
- l'appel du bridge acteur avec l'acteur courant ;
- l'absence d'impact sur la liste consolidée des talents.

**Justification** :

- conforme à ADR-0004 et ADR-0012 ;
- limite les mocks UI lourds ;
- garde des assertions centrées sur le contrat métier de navigation.

---

## 5. Plan de travail détaillé

### Étape 1 — Stabiliser le point d'entrée d'ouverture côté acteur

**Quoi faire** : définir ou adapter dans `module/documents/actor-mixins/talents.mjs` un point d'entrée acteur dédié vers la future application graphique, sans exposition directe du canvas legacy depuis la feuille.

Le plan doit clarifier le contrat minimal attendu :

- accepter l'acteur courant comme contexte ;
- déléguer l'ouverture à l'application dédiée de US15 ;
- préserver un comportement de fermeture sans effet secondaire sur l'onglet Talents.

**Fichiers** :

- `module/documents/actor-mixins/talents.mjs`

**Risques spécifiques** :

- conflit de nommage ou de responsabilité avec `toggleTalentTree()` ;
- couplage accidentel au canvas legacy si la méthode ne devient qu'un alias temporaire mal défini.

### Étape 2 — Brancher la feuille personnage sur ce bridge

**Quoi faire** : ajuster `module/applications/sheets/character-sheet.mjs` pour que l'action de l'onglet Talents appelle le bridge acteur retenu, au lieu de piloter directement une implémentation legacy.

Points à verrouiller :

- ne pas réinjecter de logique métier dans la feuille ;
- conserver la liste consolidée existante ;
- supprimer ou réaligner le texte de bouton actuellement hardcodé si nécessaire.

**Fichiers** :

- `module/applications/sheets/character-sheet.mjs`

**Risques spécifiques** :

- divergence entre le handler de feuille et l'API finalement livrée par US15 ;
- maintien de chaînes hardcodées ou d'un état de toggle devenu faux.

### Étape 3 — Ajouter le CTA dans l'onglet Talents

**Quoi faire** : faire évoluer `templates/sheets/actor/talents.hbs` pour exposer un bouton ou une action visible de type "Voir les arbres de spécialisation" dans une zone cohérente avec la liste consolidée.

Le CTA doit :

- être explicite ;
- ne pas ressembler à une action d'achat ;
- rester utilisable même si la liste de talents est vide ;
- ne pas parasiter la lecture des talents possédés.

**Fichiers** :

- `templates/sheets/actor/talents.hbs`

**Risques spécifiques** :

- ambiguïté visuelle avec une action métier d'achat ;
- CTA trop discret ou au contraire trop intrusif dans une zone de consultation.

### Étape 4 — Compléter le stylage et l'i18n du CTA

**Quoi faire** : ajouter le stylage nécessaire dans `styles/actor.less` pour intégrer proprement la nouvelle zone d'action à l'onglet Talents, puis créer ou réutiliser les clés de traduction correspondantes.

Le texte devra couvrir au minimum :

- l'ouverture de la vue graphique ;
- éventuellement l'état de fermeture si le comportement toggle est conservé par l'API retenue.

**Fichiers** :

- `styles/actor.less`
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- régression de layout sur mobile ou petites largeurs ;
- mismatch FR/EN ou duplication de clés si le naming n'est pas aligné.

### Étape 5 — Étendre les tests ciblés sur la navigation

**Quoi faire** : compléter les tests existants pour vérifier le contrat minimal de US14.

Cas à couvrir :

- le contexte de feuille expose les données nécessaires au CTA ;
- le handler appelle le bridge acteur avec l'acteur courant ;
- l'ajout du CTA ne modifie pas la logique de consolidation déjà couverte par US12 ;
- le bridge acteur reste inactif pour un type d'acteur non supporté si cette garde fait partie du contrat retenu.

**Fichiers** :

- `tests/applications/sheets/character-sheet-talents.test.mjs`
- `tests/unit/documents/actor-talents-mixin.test.mjs`

**Risques spécifiques** :

- tests trop couplés à l'implémentation interne de l'application US15 ;
- réutilisation de tests `skip` non fiabilisés au lieu d'un contrat testable simple.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/documents/actor-mixins/talents.mjs` | modification | Introduire ou stabiliser le bridge acteur vers l'application graphique dédiée |
| `module/applications/sheets/character-sheet.mjs` | modification | Câbler l'action de feuille vers le bridge et supprimer le couplage direct au legacy |
| `templates/sheets/actor/talents.hbs` | modification | Ajouter le CTA d'ouverture dans l'onglet Talents |
| `styles/actor.less` | modification | Styliser la zone d'action et préserver la lisibilité de l'onglet |
| `lang/fr.json` | modification potentielle | Ajouter les libellés FR du CTA si absents |
| `lang/en.json` | modification potentielle | Ajouter les libellés EN du CTA si absents |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | modification | Couvrir le contrat de navigation côté feuille |
| `tests/unit/documents/actor-talents-mixin.test.mjs` | modification potentielle | Couvrir le bridge acteur sans dépendre du canvas réel |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| US14 code contre le canvas legacy au lieu de l'application US15 | dette technique immédiate et rework | imposer dans le plan un bridge acteur ciblant l'API de la future app, pas `game.system.tree` |
| Contrat d'ouverture non aligné avec US15 | intégration cassée ou doublon d'API | faire explicitement dépendre US14 du point d'entrée public livré par US15 |
| CTA ambigu avec une action d'achat | confusion utilisateur | wording explicite orienté navigation et placement visuel distinct des talents |
| Texte hardcodé ou incohérent entre langues | régression i18n | passer par des clés dédiées FR/EN conformes à ADR-0005 |
| Tests trop intégrés à la vue graphique | tests fragiles et coûteux | limiter US14 à des tests de contrat : présence du CTA et appel du bridge |
| Régression visuelle dans l'onglet Talents | baisse de lisibilité en jeu | ajouter un conteneur de CTA spécifique et vérifier le rendu sur largeur réduite |

---

## 8. Proposition d'ordre de commit

1. `refactor(talent-sheet): add actor bridge for specialization tree app`
2. `feat(talent-sheet): add specialization tree entry point in talents tab`
3. `test(talent-sheet): cover specialization tree navigation bridge`

---

## 9. Dépendances avec les autres US

- **Dépend de US12 (#196)** : l'onglet Talents consolidé existe déjà et constitue la base UI à compléter.
- **Dépend fortement de US15 (#199)** : US14 ne doit pas inventer une seconde API d'ouverture ; il doit consommer le point d'entrée public de l'application dédiée.
- **Complète US13 (#197)** : après l'amélioration de lisibilité des rangs et sources, US14 ajoute le pont de navigation vers la vue graphique.
- **Prépare US17 (#201)** : la sélection de spécialisation courante après ouverture appartient à la vue graphique, pas à l'onglet.
- **Prépare US19 (#203)** : l'ouverture seule est traitée ici ; la synchronisation achat <-> onglet <-> vue graphique viendra ensuite.
