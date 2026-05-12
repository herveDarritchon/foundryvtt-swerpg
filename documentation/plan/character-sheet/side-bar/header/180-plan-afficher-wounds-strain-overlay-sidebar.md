# Plan d'implémentation — #180 : Afficher Wounds et Strain dans l'overlay de la sidebar

**Issue** : [#180 — Afficher Wounds et Strain (valeur/seuil) dans l'overlay de la sidebar](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/180)
**Epic** : [#177 — Epic: Enrichir le header de la sidebar Character Sheet](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/177)
**ADR(s)** :
- `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`
- `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`
- `documentation/architecture/adr/adr-0005-localization-strategy.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs` (modification), `templates/sheets/actor/sidebar.hbs` (modification), `styles/actor.less` (modification), `tests/applications/sheets/character-sheet-sidebar-header.test.mjs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification)

---

## 1. Objectif

Afficher en lecture seule les ressources `Wounds` et `Strain` au format `valeur/seuil` dans l'overlay déjà présent en bas de l'avatar de la Character Sheet.

Le ticket `#179` a déjà livré le conteneur visuel (`.sidebar-profile-overlay`). `#180` complète ce travail en branchant les données existantes du personnage dans `context.sidebarHeader`, en ajoutant le markup de rendu dans la sidebar, et en enrichissant le style de l'overlay pour présenter les deux ressources sans interaction utilisateur.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Enrichissement de `context.sidebarHeader` avec :
  - `wounds.value`
  - `wounds.threshold`
  - `strain.value`
  - `strain.threshold`
- Affichage des deux ressources dans `templates/sheets/actor/sidebar.hbs` à l'intérieur de `.sidebar-profile-overlay`
- Affichage en lecture seule, sans champ de saisie ni action cliquable
- Mise en forme visuelle de l'overlay pour accueillir deux blocs de ressource lisibles
- Conservation du comportement `editImage` sur l'avatar
- Réutilisation des clés i18n pour les labels, avec ajout de la clé manquante `RESOURCES.STRAIN`
- Mise à jour des tests de contexte `CharacterSheet._prepareContext()`
- Validation manuelle du rendu sur `character` et de la non-régression sur `adversary`

### Exclu de cette US / ce ticket

- Changement de modèle de données `actor.system.*`
- Refonte du layout global de la sidebar
- Changement du header droit ou du champ nom déjà traité par `#178`
- Nouveau template dédié aux seuls `character`
- Ajout d'interactions dans l'overlay
- Harmonisation générale de la terminologie FR des ressources au-delà du besoin immédiat
- Refonte globale de la palette `strain` dans tout le système

---

## 3. Constat sur l'existant

### 3.1. L'overlay visuel existe déjà

`templates/sheets/actor/sidebar.hbs:2-8` contient déjà :

- le bloc `{{#if sidebarHeader}}`
- le wrapper `.sidebar-profile-wrapper`
- le conteneur `.sidebar-profile-overlay`

Le ticket `#180` n'a donc pas à créer la structure de base, seulement à la peupler.

### 3.2. Le contexte `sidebarHeader` n'expose encore que `name` et `img`

`module/applications/sheets/character-sheet.mjs:151-154` construit actuellement :

```js
context.sidebarHeader = { name: s.name, img: s.img }
```

Les ressources `wounds` et `strain` existent déjà dans `actor.system.resources`, mais ne sont pas encore exposées au template.

### 3.3. Les ressources existent déjà dans le modèle

Les tests et le modèle montrent déjà la présence de :

- `system.resources.wounds.value`
- `system.resources.wounds.threshold`
- `system.resources.strain.value`
- `system.resources.strain.threshold`

Il n'y a donc ni migration, ni ajout de schéma à prévoir.

### 3.4. La sidebar reste un `PART` partagé

`module/applications/sheets/base-actor-sheet.mjs:62-66` déclare une template commune `sidebar.hbs`. La garde `{{#if sidebarHeader}}` reste le mécanisme qui limite ce rendu enrichi aux `character`.

### 3.5. La base i18n n'est pas complètement alignée avec le besoin

- `RESOURCES.WOUNDS` existe déjà dans `lang/fr.json` et `lang/en.json`
- `RESOURCES.STRAIN` est référencé dans `module/config/attributes.mjs`, mais absent des fichiers de langue

Sans correction, utiliser `{{localize 'RESOURCES.STRAIN'}}` afficherait la clé brute.

### 3.6. La palette visuelle existante de `strain` est bleue/cyan

Le design system existant expose déjà des variables et composants utilisant une teinte bleue/cyan pour `strain` (`styles/variables.less`, `styles/swerpg.css`, `styles/components/jauge.less`).

L'issue mentionne du vert, mais le choix retenu pour ce ticket est de préserver la cohérence visuelle locale avec l'existant.

---

## 4. Décisions d'architecture

### 4.1. Réutiliser `sidebarHeader` existant vs créer un nouveau bloc de contexte

**Question** : faut-il enrichir `sidebarHeader` existant ou exposer un bloc de contexte dédié ?

**Options envisagées** :
- Ajouter `wounds` / `strain` dans `sidebarHeader`
- Exposer un nouveau bloc dédié (`context.sidebarResources`)
- Lire directement dans `source.system.resources` depuis la template

**Décision** : enrichir `context.sidebarHeader` avec `wounds` et `strain`.

**Justification** :
- Le plan de l'épic `documentation/plan/character-sheet/side-bar/header/README.md` prévoit déjà cette extension
- `sidebarHeader` est le point d'entrée logique de tout le bloc au-dessus de l'avatar
- Éviter de faire dépendre le template d'un chemin métier profond alors que le header dispose déjà d'un contexte dédié
- Garder la template plus lisible et limiter le couplage à `source.system.*`

### 4.2. Réutiliser l'overlay existant vs créer une structure parallèle

**Question** : faut-il remplir `sidebar-profile-overlay` ou créer un second conteneur ?

**Options envisagées** :
- Injecter les ressources dans `.sidebar-profile-overlay`
- Créer un second conteneur sous l'image
- Déplacer les ressources ailleurs dans la sidebar

**Décision** : remplir `.sidebar-profile-overlay` existant.

**Justification** :
- `#179` a précisément préparé ce conteneur pour `#180`
- Le diff reste minimal
- Pas de duplication structurelle ni de refonte de layout

### 4.3. Affichage lecture seule dans le template

**Question** : comment présenter les valeurs dans l'overlay ?

**Options envisagées** :
- Inputs désactivés
- Composants interactifs
- Markup purement présentational

**Décision** : utiliser des éléments de présentation simples (`div` / `span`) sans `input`.

**Justification** :
- Conforme au besoin fonctionnel de l'issue
- Évite toute ambiguïté UX sur une éventuelle éditabilité
- Préserve `pointer-events: none` sur l'overlay

### 4.4. Stratégie i18n pour les labels

**Question** : comment gérer l'affichage des labels ?

**Options envisagées** :
- Hardcoder `Wounds` / `Strain`
- Réutiliser les clés existantes, avec ajout de la clé manquante
- Détourner une autre clé proche (`MORALE`, `MADNESS`, etc.)

**Décision** : utiliser `{{localize}}` et ajouter `RESOURCES.STRAIN` dans les deux fichiers de langue.

**Justification** :
- Conforme à l'ADR-0005
- Évite toute chaîne hardcodée dans la UI
- Corrige un trou existant entre `module/config/attributes.mjs` et `lang/*.json`
- La portée reste faible et directement liée à l'affichage demandé

### 4.5. Palette `strain` locale vs demande de vert de l'issue

**Question** : quelle couleur pour le label et la valeur `strain` dans l'overlay ?

**Options envisagées** :
- Suivre l'issue à la lettre avec une teinte verte
- Réutiliser la palette `strain` déjà utilisée dans le design system

**Décision** : conserver la couleur `strain` existante du système, donc bleu/cyan.

**Justification** :
- Cohérence visuelle avec les autres composants ressources
- Pas de création d'une exception locale difficile à justifier
- Réduit le risque d'incohérence entre l'overlay et les jauges existantes

### 4.6. Tests automatisés ciblés vs test de rendu DOM complet

**Question** : quel niveau de test pour ce ticket ?

**Options envisagées** :
- Tester le contexte seulement
- Ajouter un test DOM/template complet
- Validation manuelle uniquement

**Décision** : étendre les tests de contexte existants et compléter par validation manuelle du rendu.

**Justification** :
- La logique métier de ce ticket se situe surtout dans `_prepareContext()`
- Le projet a déjà des tests ciblés sur `sidebarHeader`
- Le rendu visuel reste principalement CSS et plus rentable à valider manuellement

---

## 5. Plan de travail détaillé

### Étape 1 : Enrichir `sidebarHeader` avec les ressources nécessaires

**Fichier** : `module/applications/sheets/character-sheet.mjs`

Ajouter dans `_prepareContext()` l'exposition de :

- `sidebarHeader.wounds.value`
- `sidebarHeader.wounds.threshold`
- `sidebarHeader.strain.value`
- `sidebarHeader.strain.threshold`

Les valeurs doivent venir de `actor.system.resources` sans transformation métier additionnelle.

**Risques spécifiques** :
- Mauvais usage de `source` au lieu des données préparées de l'actor
- Accès non protégé si la structure `resources` est incomplète dans certains tests ou mocks

### Étape 2 : Peupler l'overlay de la sidebar

**Fichier** : `templates/sheets/actor/sidebar.hbs`

Remplacer l'overlay vide par une structure de lecture seule contenant :

- un bloc `wounds` avec classe `.sidebar-resource.wounds`
- un bloc `strain` avec classe `.sidebar-resource.strain`
- un label localisé via `{{localize 'RESOURCES.WOUNDS'}}` et `{{localize 'RESOURCES.STRAIN'}}`
- une valeur formatée `{{sidebarHeader.wounds.value}}/{{sidebarHeader.wounds.threshold}}`

Le rendu doit rester dans la branche `{{#if sidebarHeader}}` uniquement.

**Risques spécifiques** :
- Régression sur les autres types d'acteurs si le guard est déplacé ou élargi
- Dégradation de lisibilité si le markup introduit trop de profondeur inutile

### Étape 3 : Étendre le style de l'overlay pour accueillir deux ressources

**Fichier** : `styles/actor.less`

Faire évoluer `.sidebar-profile-overlay` pour :

- disposer ses enfants horizontalement avec `display: flex` et `justify-content: space-around`
- centrer les deux ressources verticalement
- ajouter typographie (`font-family`, `font-size`) et espacement
- conserver `pointer-events: none` sur le conteneur racine
- utiliser une couleur `wounds` rouge (variables CSS existantes `--color-wounds`, `--color-wounds-glow`)
- utiliser une couleur `strain` alignée avec la palette existante bleue/cyan (`--color-strain`, `--color-strain-glow`)

Le style doit rester limité à la sidebar actor et ne pas redéfinir les tokens globaux.

**Risques spécifiques** :
- Surcharge visuelle si la hauteur de l'overlay devient trop faible pour le contenu
- Contraste insuffisant selon certains portraits
- Retours à la ligne indésirables sur `value/threshold`

### Étape 4 : Corriger l'i18n minimale nécessaire

**Fichiers** :
- `lang/fr.json`
- `lang/en.json`

Ajouter la clé manquante `RESOURCES.STRAIN` dans les deux langues.

Conserver `RESOURCES.WOUNDS` tel qu'il est déjà utilisé par le projet pour rester dans le scope strict du ticket.

**Risques spécifiques** :
- Introduire une divergence entre langues si une seule des deux clés est ajoutée
- Déborder du scope en lançant une harmonisation terminologique plus large

### Étape 5 : Mettre à jour les tests de contexte existants

**Fichier** : `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`

Étendre le test `sidebarHeader` pour vérifier :

- la présence de `wounds` et `strain`
- les valeurs et seuils exposés correspondant aux données mockées
- l'absence de régression sur le comportement hors `character`

**Risques spécifiques** :
- Mocks de test incomplets si les assertions deviennent plus strictes
- Test fragile si le contexte attendu est reconstruit différemment sans raison fonctionnelle

### Étape 6 : Validation manuelle UI

**Fichiers** : aucun changement obligatoire

Valider manuellement :

| Scénario | Attendu |
|---|---|
| Character Sheet ouverte | L'overlay affiche deux blocs `Wounds` et `Strain` |
| Ressource wounds à `3/12` | Le format affiché est `3/12` |
| Ressource strain à `2/11` | Le format affiché est `2/11` |
| Clic sur l'avatar | L'éditeur d'image s'ouvre toujours |
| Portrait clair / portrait sombre | Le contraste reste lisible |
| Adversary Sheet | Aucun bloc ressource n'apparaît dans la branche `else` |

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `module/applications/sheets/character-sheet.mjs` | Modification | Enrichir `context.sidebarHeader` avec `wounds` et `strain` |
| `templates/sheets/actor/sidebar.hbs` | Modification | Remplacer l'overlay vide par le markup des deux ressources |
| `styles/actor.less` | Modification | Ajouter le layout et la typographie de `.sidebar-profile-overlay` et `.sidebar-resource` |
| `tests/applications/sheets/character-sheet-sidebar-header.test.mjs` | Modification | Étendre les assertions sur `sidebarHeader` |
| `lang/fr.json` | Modification | Ajouter `RESOURCES.STRAIN` |
| `lang/en.json` | Modification | Ajouter `RESOURCES.STRAIN` |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| `RESOURCES.STRAIN` absent au runtime | Moyen | Ajouter explicitement la clé dans `fr.json` et `en.json` |
| Overlay trop chargé visuellement sur petits portraits | Moyen | Garder un markup minimal, limiter la taille de police, valider manuellement |
| Régression du clic avatar | Élevé | Conserver `pointer-events: none` sur l'overlay et tester `editImage` |
| Incohérence visuelle de `strain` si vert local | Moyen | Choix validé : réutiliser la palette bleue/cyan existante |
| Régression sur `adversary` | Élevé | Ne modifier que la branche `{{#if sidebarHeader}}` et vérifier manuellement l'autre branche |
| Tests cassés par manque de données mockées | Faible | Réutiliser le mock existant qui contient déjà `resources.wounds` et `resources.strain` |

---

## 8. Proposition d'ordre de commit

1. `feat(sidebar-header): expose wounds and strain in character sidebar context`
   - `module/applications/sheets/character-sheet.mjs`
2. `feat(sidebar-header): render wounds and strain in avatar overlay`
   - `templates/sheets/actor/sidebar.hbs`
3. `style(sidebar-header): format overlay resources in character sidebar`
   - `styles/actor.less`
4. `test(sidebar-header): cover wounds and strain header context`
   - `tests/applications/sheets/character-sheet-sidebar-header.test.mjs`
5. `i18n(resources): add missing strain label`
   - `lang/fr.json`
   - `lang/en.json`

---

## 9. Dépendances avec les autres US

- `#180` dépend de `#178` :
  - `sidebarHeader` existe déjà
  - le nom a déjà été déplacé dans la sidebar
- `#180` dépend de `#179` :
  - `.sidebar-profile-overlay` existe déjà
  - le conteneur est déjà positionné et non interactif
- `#180` ne crée pas de dépendance technique nouvelle pour d'autres tickets
- Ordre recommandé dans l'épic `#177` :
  1. `#178`
  2. `#179`
  3. `#180`
