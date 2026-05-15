# Plan d'implémentation — OpenCode : valider la doctrine cible et la liste des usages fréquents

**Issue** : [#267 — OpenCode - Valider la doctrine cible et la liste des usages frequents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/267)
**ADR** : `documentation/architecture/adr/adr-0010-llm-code-ready.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (modification), `.agents/skills/*/SKILL.md` (audit documentaire uniquement dans ce ticket, modification potentielle hors périmètre)

---

## 1. Objectif

Formaliser une doctrine cible exploitable pour l'usage d'OpenCode dans le projet SWERPG, en priorisant les activités récurrentes, en leur associant un niveau de risque, un niveau d'autonomie acceptable et un type d'agent attendu.

Le résultat attendu n'est pas une configuration exécutable, mais un cadre de décision stable pour les tickets suivants portant sur les commandes, skills, agents, permissions et garde-fous. Le ticket doit aussi vérifier si les skills déjà présents sont cohérents avec cette doctrine cible, sans commencer à les refondre.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Définir explicitement la doctrine cible OpenCode pour le projet.
- Confirmer que la cible est une **orchestration assistée** et non une automatisation complète.
- Produire une liste priorisée de **6 à 10 activités fréquentes**.
- Associer à chaque activité :
  - un niveau de risque ;
  - un niveau d'autonomie acceptable ;
  - un type d'agent ou de profil attendu ;
  - le rôle attendu des skills, commandes et permissions.
- Auditer les skills existants suivants au regard de la doctrine :
  - `plan-depuis-issue`
  - `ecrire-plan-fichier`
  - `implementer-depuis-plan`
  - `to-issues`
  - `my-pull-requests`
- Identifier les écarts entre usages cibles et outillage existant.
- Préparer des recommandations structurantes pour les tickets d'orchestration suivants.

### Exclu de cette US / ce ticket

- Implémentation de commandes OpenCode.
- Création ou modification effective des agents.
- Changement de permissions ou de plugins.
- Refactor direct des skills existants.
- Automatisation d'un workflow complet de bout en bout.
- Toute modification du code applicatif SWERPG.
- Toute mise à jour de l'issue GitHub elle-même.

---

## 3. Constat sur l'existant

### 3.1. Un cadrage doctrinal existe déjà

Le document `documentation/cadrage/llm/cadrage-opencode-configuration.md` contient déjà la matière principale :

- principe directeur d'affectation par coût / risque / complexité ;
- séparation forte des rôles ;
- importance des permissions ;
- rôle distinct des skills, commandes, agents et plugins ;
- rejet explicite de l'automatisation excessive ;
- recommandation d'une **orchestration assistée** ;
- recommandation de partir de **6 à 10 activités fréquentes**.

Ce document constitue la source principale pour ce ticket.

### 3.2. Les skills projet existent déjà mais ne forment pas encore une doctrine validée

Le repo contient plusieurs skills locaux sous `.agents/skills/`, dont les plus pertinents ici :

- `plan-depuis-issue`
- `ecrire-plan-fichier`
- `implementer-depuis-plan`
- `to-issues`
- `my-pull-requests`

Ils matérialisent déjà des usages réels, mais ils n'ont pas encore été reliés explicitement à une cartographie commune du risque, de l'autonomie et du type d'agent.

### 3.3. Un écart explicite existe autour de la PR

L'issue cite comme activité fréquente : "faire une pr avec le code développer".
Or le skill existant `my-pull-requests` sert aujourd'hui à **lister** les PR assignées, pas à **préparer/créer** une PR.

Cet écart doit être documenté comme un problème de cohérence entre besoin d'usage et outillage actuel.

### 3.4. Le projet possède déjà des garde-fous architecturaux réutilisables

Même si l'issue ne concerne pas le code SWERPG directement, deux ADRs apportent une discipline utile :

- `adr-0010-llm-code-ready.md` : formalise des garde-fous destinés aux agents et rappelle qu'un brief opérationnel n'est pas l'architecture complète.
- `adr-0012-unit-tests-readable-diagnostics.md` : impose une exigence de lisibilité et de diagnostic utile, pertinente pour caractériser l'activité "tests".

### 3.5. Le besoin est documentaire, pas technique

Le ticket est étiqueté `documentation`, `architecture`, `epic`.
Le besoin est de produire une base de pilotage et d'arbitrage, pas une configuration prématurée. Cela est cohérent avec le cadrage existant : "la configuration ne doit pas chercher à créer un système complexe pour le plaisir".

---

## 4. Décisions d'architecture

### 4.1. Doctrine d'orchestration assistée vs automatisation complète

**Question** : quel niveau d'autonomie cible faut-il valider ?

**Options envisagées** :
- Automatisation complète des workflows fréquents.
- Orchestration assistée avec validation humaine sur les zones à risque.

**Décision** : retenir l'**orchestration assistée** comme doctrine cible.

**Justification** :
- Le cadrage existant l'énonce explicitement.
- Les activités à risque du projet incluent code, architecture, suppression, refactor et Git.
- Cela évite de transformer trop tôt OpenCode en "agent tout-puissant".
- Le ticket demande une base de décision stable, pas une délégation totale.

### 4.2. Prioriser une matrice d'usages fréquents élargie à 6-10 activités

**Question** : faut-il se limiter aux 5 activités citées dans l'issue ?

**Options envisagées** :
- Rester strictement sur les 5 activités listées.
- Produire une matrice élargie cohérente avec le cadrage OpenCode.

**Décision** : produire une matrice **élargie à 6-10 activités**.

**Justification** :
- Le document de cadrage recommande explicitement ce volume.
- Les activités "tests", "revue", "diagnostic de bug" et "préparation de PR" sont structurellement récurrentes.
- Une doctrine partielle serait trop faible pour guider les tickets suivants.

### 4.3. Séparer doctrine d'usage et audit des skills

**Question** : faut-il modifier les skills actuels dans ce ticket ?

**Options envisagées** :
- Corriger immédiatement les skills incohérents.
- Se limiter à un audit documentaire et préparer les tickets suivants.

**Décision** : faire un **audit de cohérence sans modification**.

**Justification** :
- L'issue vise une doctrine, pas une implémentation.
- Le cadrage insiste sur la séparation des responsabilités.
- Cette approche évite un mélange entre conception et exécution.

### 4.4. Utiliser les skills comme porteurs de savoir, pas comme workflows complets

**Question** : quelle place donner aux skills dans la doctrine ?

**Options envisagées** :
- Faire des skills le conteneur principal des workflows.
- Réserver les skills au savoir projet et laisser les commandes porter les routines.

**Décision** : confirmer que **les skills apportent le savoir projet**, tandis que **les commandes standardisent les routines**.

**Justification** :
- C'est la règle explicitée dans `documentation/cadrage/llm/cadrage-opencode-configuration.md`.
- Cela évite des skills trop longs et trop directifs.
- Cela permet de mieux relier risque, permission et type d'agent.

### 4.5. Auditer les usages réels à partir des écarts de langage entre besoin et skill

**Question** : comment détecter les incohérences les plus utiles ?

**Options envisagées** :
- Lire uniquement les noms des skills.
- Comparer l'intention métier de l'issue avec la capacité réelle de chaque skill.

**Décision** : auditer par **écart intention / capacité réelle**.

**Justification** :
- Le cas `my-pull-requests` montre qu'un nom ou une présence de skill ne suffit pas.
- La doctrine doit porter sur des usages opérationnels réels, pas sur un inventaire superficiel.

---

## 5. Plan de travail détaillé

### Étape 1 — Consolider la doctrine cible à partir du cadrage existant

**Quoi faire** :
- Extraire du document de cadrage les principes réellement normatifs.
- Reformuler une doctrine courte et stable :
  - orchestration assistée ;
  - séparation des rôles ;
  - permissions alignées sur le risque ;
  - commandes pour les routines ;
  - skills pour la connaissance durable.

**Fichiers concernés** :
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`
- futur plan dans `documentation/plan/llm/`

**Risques spécifiques** :
- Produire une doctrine redondante par rapport au cadrage.
- Rester trop abstrait pour être exploitable.

### Étape 2 — Définir la liste prioritaire des activités fréquentes

**Quoi faire** :
- Établir une matrice priorisée de 6 à 10 usages.
- Recommandation de base pour la matrice :
  - créer des issues depuis un cadrage ;
  - créer un plan depuis une issue ;
  - écrire un plan dans `documentation/plan/` ;
  - implémenter un plan ;
  - diagnostiquer/corriger un bug ;
  - exécuter et analyser des tests ;
  - relire un diff ;
  - préparer/créer une PR ;
  - mettre à jour une documentation projet ;
  - lancer des vérifications mécaniques.

**Fichiers concernés** :
- futur plan
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- Liste trop large pour être utile.
- Liste trop courte pour guider les prochains tickets.

### Étape 3 — Associer risque, autonomie et type d'agent à chaque activité

**Quoi faire** :
- Pour chaque activité, préciser :
  - niveau de risque : faible / moyen / élevé ;
  - autonomie : lecture seule / exécution assistée / exécution avec validation humaine ;
  - type d'agent : exploration, planification, implémentation, test, review, documentation ;
  - besoin éventuel de skill spécialisé ;
  - nécessité ou non d'une validation explicite.

**Fichiers concernés** :
- futur plan

**Risques spécifiques** :
- Confondre activité métier et choix d'outil.
- Sous-estimer le risque Git / architecture / code.

### Étape 4 — Auditer la cohérence des skills existants avec la doctrine

**Quoi faire** :
- Vérifier pour chaque skill :
  - intention annoncée ;
  - résultat attendu ;
  - limites ;
  - niveau d'autonomie implicite ;
  - cohérence avec le rôle doctrinal attendu.
- Identifier les écarts notables, par exemple :
  - skill manquant pour préparer/créer une PR ;
  - skill trop étroit ou mal nommé ;
  - usage qui devrait être une commande plutôt qu'un skill.

**Fichiers concernés** :
- `.agents/skills/plan-depuis-issue/SKILL.md`
- `.agents/skills/ecrire-plan-fichier/SKILL.md`
- `.agents/skills/implementer-depuis-plan/SKILL.md`
- `.agents/skills/to-issues/SKILL.md`
- `.agents/skills/my-pull-requests/SKILL.md`

**Risques spécifiques** :
- Basculer vers une refonte de skills hors scope.
- Juger un skill sur son nom plutôt que sur son contrat réel.

### Étape 5 — Formaliser les écarts et les suites recommandées

**Quoi faire** :
- Produire une section claire :
  - usages déjà couverts ;
  - usages partiellement couverts ;
  - usages non couverts ;
  - ambiguïtés de vocabulaire ;
  - tickets d'orchestration à ouvrir ensuite.

**Fichiers concernés** :
- futur plan

**Risques spécifiques** :
- Recommandations trop vagues.
- Absence de priorisation exploitable.

### Étape 6 — Définir un ordre de mise en oeuvre pour les tickets suivants

**Quoi faire** :
- Recommander un enchaînement logique :
  1. doctrine et cartographie ;
  2. alignement des commandes ;
  3. alignement des skills ;
  4. permissions ;
  5. plugins/hooks transverses si nécessaire ;
  6. mesure et ajustements.

**Fichiers concernés** :
- futur plan

**Risques spécifiques** :
- Démarrer par la technique avant la doctrine.
- Créer une sur-orchestration trop tôt.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `documentation/plan/llm/267-plan-doctrine-opencode-usages-frequents.md` | création | Plan canonique de l'issue |
| `documentation/cadrage/llm/cadrage-opencode-configuration.md` | modification potentielle ultérieure | Alignement ou extraction éventuelle d'une synthèse doctrinale après validation |
| `.agents/skills/plan-depuis-issue/SKILL.md` | audit uniquement dans ce ticket | Vérifier cohérence avec rôle de planification sans modification |
| `.agents/skills/ecrire-plan-fichier/SKILL.md` | audit uniquement dans ce ticket | Vérifier séparation planification / matérialisation |
| `.agents/skills/implementer-depuis-plan/SKILL.md` | audit uniquement dans ce ticket | Vérifier cohérence avec autonomie assistée |
| `.agents/skills/to-issues/SKILL.md` | audit uniquement dans ce ticket | Vérifier cohérence avec découpage vertical des tickets |
| `.agents/skills/my-pull-requests/SKILL.md` | audit uniquement dans ce ticket | Documenter l'écart avec l'usage cible "préparer/créer une PR" |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| La doctrine répète le cadrage existant sans valeur ajoutée | Document peu utile pour la suite | Produire une synthèse orientée décision et matrice d'usages |
| La matrice des usages est trop large | Priorisation floue | Limiter à 6-10 usages réellement fréquents |
| La matrice des usages est trop étroite | Doctrine insuffisante pour les prochains tickets | Inclure au minimum plan, issues, implémentation, tests, review, PR |
| Confusion entre skill, commande, agent et plugin | Mauvais design des tickets suivants | Réserver à chaque notion un rôle explicite dans le plan |
| Tentation de corriger les skills tout de suite | Dérive de scope | Limiter ce ticket à l'audit et aux recommandations |
| Sous-estimation du risque des tâches Git et code | Automatisation excessive | Imposer validation humaine sur PR, code, architecture et opérations critiques |
| Mauvais alignement entre besoin métier et outillage actuel | Doctrine théorique, peu actionnable | Documenter explicitement les écarts comme `my-pull-requests` vs création de PR |

---

## 8. Proposition d'ordre de commit

1. `docs(opencode): formaliser la doctrine cible d'orchestration assistee`
2. `docs(opencode): cartographier les usages frequents avec risque et autonomie`
3. `docs(opencode): auditer la coherence des skills existants avec la doctrine`

---

## 9. Dépendances avec les autres US

- Ce ticket est **amont** pour les futurs tickets de configuration OpenCode.
- Les tickets suivants devraient dépendre de sa validation :
  - commande ou workflow "préparer une issue" ;
  - commande ou workflow "créer un plan depuis une issue" ;
  - commande ou workflow "écrire un plan dans `documentation/plan/`" ;
  - commande ou workflow "implémenter un plan" ;
  - commande ou workflow "préparer/créer une PR" ;
  - tickets d'alignement des permissions et garde-fous.
- Aucun blocage technique identifié dans le repo actuel.
- Blocage principal : validation humaine de la doctrine.
