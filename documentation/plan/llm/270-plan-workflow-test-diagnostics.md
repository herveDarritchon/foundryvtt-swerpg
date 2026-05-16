# Plan d'implémentation — OpenCode : cadrer un workflow de tests et d'analyse d'échec avant modification

**Issue** : [#270 — OpenCode - Cadrer un workflow de tests et d'analyse d'echec avant modification](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/270)
**ADR** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (modification), `documentation/spec/llm/opencode-test-diagnostics-command.md` (création), `documentation/spec/llm/opencode-test-diagnostics-scenarios.md` (création)

---

## 1. Objectif

Définir un workflow complet pour l'exécution de tests, de lint et de vérifications mécaniques dans OpenCode, avec une priorité donnée au diagnostic et à l'explication des échecs avant toute correction.

Le résultat attendu est un cadre opérable qui :
- prend en charge les demandes de vérification mécanique (tests, lint, format, scripts projet) de bout en bout ;
- sépare explicitement l'exécution mécanique, le diagnostic des échecs et la décision éventuelle de correction ;
- limite l'usage du modèle LLM aux cas où l'outil seul ne suffit pas (interprétation, analyse, arbitrage) ;
- s'articule proprement avec la doctrine `#267`, le workflow d'exploration `#268` et le workflow de planification `#269`.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Formaliser le workflow cible d'exécution et d'analyse de vérifications mécaniques.
- Définir les intentions utilisateur qui doivent router vers ce workflow.
- Définir le contrat d'exécution : séquence en 3 phases (exécution → diagnostic → correction).
- Définir les vérifications couvertes par le workflow :
  - tests unitaires Vitest (`pnpm test`, `pnpm vitest run ...`)
  - tests de couverture Vitest (`pnpm test:coverage`)
  - tests E2E Playwright (`pnpm e2e`, `pnpm e2e:headed`, `pnpm e2e:ci`)
  - vérification de format Prettier (`pnpm fmt:check`)
  - lint ESLint (`pnpm exec eslint ...`)
  - scripts mécaniques projet (ex. `scripts/validate-logging-migration.sh`)
- Produire la spécification documentaire d'une future commande OpenCode de test/diagnostic.
- Produire une matrice de scénarios de validation manuelle.

### Exclu de cette US / ce ticket

- Implémentation effective d'une commande OpenCode exécutable.
- Création ou modification d'un skill dédié (le workflow sera porté par une commande, pas un skill).
- Correction automatique des échecs détectés (la correction est une étape séparée et optionnelle).
- Toute écriture de code applicatif SWERPG.
- Toute modification du code source (même pour corriger un échec de test).
- Toute automatisation d'escalade vers implémentation sans instruction explicite.
- Toute mise à jour de l'issue GitHub elle-même.
- Toute redéfinition des workflows d'exploration et planification déjà cadrés par `#268` et `#269`.

---

## 3. Constat sur l'existant

### 3.1. La doctrine OpenCode couvre déjà les principes structurants

`documentation/cadrage/llm/cadrage-opencode-configuration.md` formalise déjà les règles applicables aux vérifications mécaniques :

- **Section 4.5 (Tests)** : les tests sont une activité distincte ; l'exécution ne doit pas entraîner l'envoi systématique des logs au modèle ; le premier rôle est d'expliquer l'échec.
- **Section 4.6 (Lint, format et vérifications mécaniques)** : ces tâches doivent être pilotées par scripts ; le modèle n'intervient que pour analyser un échec.
- **Section 4.7 (Ségrégation entre action mécanique, interprétation et correction)** : énonce la règle centrale "Exécuter ≠ Analyser ≠ Corriger" et détaille les 3 étapes séparées.

### 3.2. Les workflows d'exploration et de planification existent déjà

La section 18 (issue `#268`) définit le workflow d'exploration en lecture seule. La section 19 (issue `#269`) définit le workflow de planification en lecture seule.

Le workflow de tests/diagnostic vient compléter cette chaîne : il est le troisième volet après l'exploration et la planification, avant l'implémentation et la correction.

### 3.3. L'existant projet révèle l'état réel des vérifications mécaniques

**Tests Vitest** :
- 2 configurations coexistent : `vitest.config.mjs` (défaut, setup minimal, ~80+ fichiers de test) et `vitest.config.js` (coverage, clearMocks, setup complet).
- Scripts package.js : `test`, `test:watch`, `test:coverage`.
- Plus de 1500 tests dans `tests/` couvrant documents, dés, import OggDude, applications, lib, etc.

**Tests E2E Playwright** :
- Configuration complète dans `playwright.config.ts`.
- Scripts : `e2e`, `e2e:headed`, `e2e:ci`, `e2e:ui`.
- Documentation dédiée : `documentation/tests/e2e/playwright-e2e-guide.md`.

**Lint ESLint** :
- Configuration `eslint.config.mjs` existante et opérationnelle.
- Mais **aucun script `lint` n'est encore déclaré dans `package.json`**.
- Les références dans la documentation utilisent `pnpm exec eslint ...` ou `pnpm eslint ...` (via `npx`).
- Une commande `fmt:check` existe pour Prettier.

**Scripts mécaniques projet** :
- `scripts/validate-logging-migration.sh` : valide la migration du logging (console → logger centralisé).
- `scripts/e2e-foundry-start.sh` : gestion du conteneur Docker Foundry pour E2E.

### 3.4. La dépendance `Blocked by #256` n'est pas un blocage technique

Comme pour `#268` et `#269`, la référence GitHub `#256` pointe vers une PR `talent-tree` déjà mergée, sans lien apparent avec le périmètre OpenCode / documentation. Cette dépendance est traitée comme un risque de traçabilité documentaire, pas comme un blocage technique réel.

### 3.5. Aucun artefact documentaire dédié au workflow de tests/diagnostic n'existe encore

Le repo contient aujourd'hui :
- une doctrine générale (cadrage OpenCode) ;
- un workflow d'exploration documenté (`#268`) ;
- un workflow de planification documenté (`#269`) ;
- des skills de planification, implémentation, écriture de plan ;
- une infrastructure de tests riche mais sans workflow OpenCode formalisé.

Il manque :
- une spécification documentaire explicite du workflow de tests/diagnostic OpenCode ;
- une matrice de scénarios de validation ;
- la section normative dans le cadrage OpenCode.

---

## 4. Décisions d'architecture

### 4.1. Commande documentée plutôt que skill dédié

**Question** : faut-il cadrer le workflow de tests/diagnostic comme un nouveau skill ou comme une commande OpenCode documentée ?

**Options envisagées** :
- créer un skill dédié aux vérifications mécaniques ;
- cadrer une future commande OpenCode distincte ;
- faire les deux.

**Décision** : cadrer le workflow comme une future **commande OpenCode de test et diagnostic**, sans skill dédié.

**Justification** :
- `#267` classe les vérifications mécaniques parmi les activités à faible risque, adaptées aux commandes/scripts plutôt qu'aux skills.
- L'audit `#267` recommande explicitement de ne pas créer de skill pour les activités mécaniques (lint, tests automatisés).
- Le savoir projet à capitaliser est faible ici : le besoin est un flux standard, pas une connaissance métier durable.
- Cohérence avec les workflows `#268` (commande d'exploration) et `#269` (commande de planification).

### 4.2. Séparation stricte en 3 phases : exécution → diagnostic → correction

**Question** : comment organiser la séquence d'intervention pour une demande de test/vérification ?

**Options envisagées** :
- workflow monolithique (tout-en-un : exécuter, analyser, corriger) ;
- 2 phases (exécution + analyse, puis correction si besoin) ;
- 3 phases séparées (exécution, diagnostic, correction).

**Décision** : retenir **3 phases strictement séparées**.

**Justification** :
- C'est le principe central énoncé dans le cadrage OpenCode (§4.7).
- Chaque phase a un agent, un modèle et des permissions différents.
- Cela évite qu'une simple demande d'exécution de tests déclenche une correction non sollicitée.
- L'exécution doit être pilotée par script avec intervention LLM minimale.
- Le diagnostic est la seule phase qui justifie un modèle plus capable.
- La correction est une étape optionnelle, déclenchée explicitement.

### 4.3. Périmètre des vérifications couvertes par le workflow

**Question** : quelles vérifications mécaniques le workflow doit-il couvrir ?

**Options envisagées** :
- limiter à Vitest uniquement ;
- couvrir Vitest + lint ;
- couvrir toutes les vérifications projet (tests, lint, format, scripts, E2E).

**Décision** : couvrir **toutes les vérifications mécaniques projet** dans le workflow, avec un paramètre de sélection.

**Justification** :
- L'issue demande explicitement "tests, lint et vérifications mécaniques".
- L'existant projet montre que plusieurs outils sont déjà configurés (ESLint, Prettier, Vitest, Playwright, scripts shell).
- Un workflow unique avec sous-commandes est plus simple que des workflows séparés par outil.
- Cohérent avec la doctrine : toutes ces tâches relèvent du même profil d'exécution mécanique.

Sous-commandes prévues :
- `check tests` — exécution Vitest
- `check coverage` — couverture Vitest
- `check e2e` — tests Playwright (avec variantes headed/ci)
- `check lint` — ESLint (exécution explicite)
- `check format` — Prettier check
- `check script <nom>` — script projet (ex. validate-logging-migration)
- `check all` — toutes les vérifications applicables

### 4.4. Le workflow s'arrête au diagnostic exploitable

**Question** : le workflow doit-il inclure une correction automatique des échecs ?

**Options envisagées** :
- inclure la correction dans le même workflow ;
- arrêter le workflow au diagnostic et laisser la correction en étape séparée.

**Décision** : arrêter le workflow au **diagnostic exploitable**.

**Justification** :
- L'acceptance criterion `#270` demande explicitement "avant modification".
- La règle "exécuter ≠ analyser ≠ corriger" est fondamentale dans le cadrage OpenCode.
- La correction nécessite un agent, un modèle et des permissions différents.
- Permet à l'utilisateur de valider le diagnostic avant d'engager une correction.
- Cohérent avec le workflow de planification `#269` qui s'arrête aussi au plan validé.

### 4.5. Le diagnostic doit être ciblé, pas un dump de logs

**Question** : quel format de sortie pour le diagnostic en cas d'échec ?

**Options envisagées** :
- envoyer l'intégralité des logs au modèle pour analyse ;
- pré-filtrer le résultat de la commande pour extraire le périmètre utile ;
- les deux selon la complexité.

**Décision** : le diagnostic doit travailler sur **un volume réduit et pertinent** extrait de la sortie de la commande.

**Justification** :
- Le cadrage OpenCode (§4.7) le stipule explicitement.
- ADR-0012 impose des diagnostics lisibles et ciblés.
- Évite la consommation inutile de tokens sur des logs massifs.
- La sortie utile comprend : commande exécutée, statut de sortie, message d'erreur principal, fichiers concernés, extrait minimal de log.

### 4.6. Phase 1 (exécution) : agent économique ou local, sans modèle

**Question** : quel niveau de modèle pour l'exécution mécanique ?

**Décision** : l'exécution mécanique est confiée à un **agent économique ou local**, ou mieux à une **exécution script sans modèle**.

**Justification** :
- Conforme à la doctrine : ce qui peut être fait par script doit être fait par script.
- Aucune intelligence n'est requise pour lancer une commande de test et en capturer la sortie.
- Un modèle économique suffit pour interpréter le statut de sortie et décider de la suite.

### 4.7. Phase 2 (diagnostic) : modèle intermédiaire ou de raisonnement

**Question** : quel niveau de modèle pour le diagnostic d'échec ?

**Décision** : le diagnostic utilise un **modèle intermédiaire ou de raisonnement** selon la complexité de l'échec.

**Justification** :
- Un échec simple (test qui ne passe pas, erreur ESLint évidente) peut être diagnostiqué par un modèle intermédiaire.
- Un échec complexe (régression transverse, mock obsolète, dépendance cassée) justifie un modèle de raisonnement.
- Le diagnostic doit inclure : hypothèse de cause, fichiers concernés, suggestion de correction minimale.

### 4.8. Phase 3 (correction) : étape séparée, non incluse dans ce workflow

**Décision** : la correction est une **étape séparée et optionnelle**, déclenchée explicitement par l'utilisateur après réception du diagnostic.

**Justification** :
- Cohérence avec le périmètre "avant modification" de l'issue.
- La correction mobilise un agent d'implémentation, pas un agent de diagnostic.
- Évite les corrections automatiques non sollicitées.
- L'utilisateur peut choisir de corriger lui-même, de reporter, ou de demander une correction.

### 4.9. Traitement de la dépendance `#256`

**Décision** : la référence `Blocked by #256` est traitée comme une **anomalie de traçabilité documentaire**, pas comme un blocage technique.

**Justification** :
- `#256` pointe vers une PR talent tree mergée, sans lien avec OpenCode ou les tests.
- Même constat que pour `#268` et `#269`.
- À signaler dans le plan comme risque de traçabilité, sans impact sur l'exécution du ticket.

---

## 5. Plan de travail détaillé

### Étape 1 — Ajouter une section normative dédiée au workflow de tests et diagnostic

**Quoi faire** :
- Étendre `documentation/cadrage/llm/cadrage-opencode-configuration.md` avec une nouvelle section (section 20) dédiée au workflow de tests et diagnostic d'échec.
- Y formaliser :
  - intention utilisateur ;
  - niveau de risque ;
  - type d'agent par phase ;
  - permissions par phase ;
  - contrat de sortie par phase ;
  - articulation avec exploration, planification, implémentation et correction.
- Structurer la section en 3 sous-sections correspondant aux 3 phases : exécution, diagnostic, correction.

**Fichiers à modifier** :
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- Répéter la doctrine existante sans l'opérationnaliser.
- Créer une section trop lourde qui duplique les §4.5, 4.6, 4.7 déjà présents.

### Étape 2 — Spécifier la future commande OpenCode de test et diagnostic

**Quoi faire** :
- Créer une spécification documentaire `opencode-test-diagnostics-command.md` dans `documentation/spec/llm/`.
- Définir :
  - les demandes éligibles (exécuter des tests, lancer le lint, vérifier le format, exécuter un script) ;
  - les entrées acceptées (filtres de tests, sous-commande, profondeur de diagnostic) ;
  - la séquence en 3 phases ;
  - les outils autorisés par phase ;
  - les interdits par phase ;
  - la structure de sortie attendue par phase ;
  - les garde-fous explicites.

**Fichiers à créer** :
- `documentation/spec/llm/opencode-test-diagnostics-command.md`

**Risques spécifiques** :
- Produire une spec trop liée au runtime OpenCode actuel.
- Négliger la variété des sous-commandes (tests, lint, format, E2E, scripts).

### Étape 3 — Formaliser les contrats de sortie par phase

**Quoi faire** :
- Définir le format de sortie pour chaque phase :

**Phase 1 — Exécution** :
```
Commande exécutée : <commande>
Statut : <succès/échec>
Durée : <secondes>
Fichiers testés : <nombre> (si applicable)
Tests passés : <nombre> (si applicable)
Tests échoués : <nombre> (si applicable)
Sortie complète : <référence vers fichier temporaire si longue>
```

**Phase 2 — Diagnostic** (déclenché seulement si échec) :
```
Périmètre analysé : <fichiers/modules>
Cause probable : <hypothèse>
Fichiers incriminés : <liste>
Extrait pertinent : <code/log extrait>
Suggestion de correction : <description courte>
Complexité estimée : <faible/moyenne/élevée>
Modèle recommandé pour la correction : <type>
```

**Phase 3 — Correction** (déclenchée explicitement) :
Non détaillée dans ce ticket (renvoi vers `implementer-depuis-plan` ou workflow de correction).

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-test-diagnostics-command.md`

**Risques spécifiques** :
- Formats trop verbeux pour une exécution rapide.
- Formats trop pauvres pour un diagnostic utile.

### Étape 4 — Définir le routage et les garde-fous

**Quoi faire** :
- Documenter explicitement les règles de routage :
  - demande de test simple → exécution uniquement ;
  - demande de test avec analyse → exécution + diagnostic ;
  - demande de correction → exécution + diagnostic + proposition de correction (attente validation).
- Documenter les interdits :
  - pas de correction automatique sans validation ;
  - pas d'élargissement du scope au-delà de la demande ;
  - pas de modification de code pendant le diagnostic ;
  - pas de reformulation du plan de test en plan d'implémentation.
- Documenter les cas nécessitant une question à l'utilisateur :
  - filtre de tests ambigu ;
  - échec massif (>50% des tests) ;
  - échec sur l'infrastructure de test (mock, setup) vs code métier ;
  - diagnostic incertain.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-test-diagnostics-command.md`

**Risques spécifiques** :
- Garde-fous trop faibles (risque de dérive).
- Garde-fous trop nombreux (blocage du workflow).

### Étape 5 — Articuler avec les workflows voisins

**Quoi faire** :
- Décrire la chaîne complète des workflows OpenCode :
```
Exploration (#268) → Planification (#269) → Exécution de tests (ce ticket) → Diagnostic → Correction (séparée)
```
- Préciser les transitions :
  - l'exploration peut détecter un besoin de test et orienter vers ce workflow ;
  - la planification peut inclure une validation par les tests ;
  - l'implémentation (implementer-depuis-plan) doit pouvoir déclencher une vérification post-implémentation ;
  - le diagnostic peut escalader vers planification si l'échec révèle un problème d'architecture.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-test-diagnostics-command.md`
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- Créer des dépendances circulaires entre workflows.
- Surcharger la spécification avec des cas d'escalade rares.

### Étape 6 — Produire une matrice de validation manuelle

**Quoi faire** :
- Créer des scénarios couvrant au minimum :
  - exécution simple de tous les tests (succès et échec) ;
  - exécution filtrée (un dossier, un fichier, un pattern) ;
  - lint avec et sans erreurs ;
  - vérification de format avec et sans écarts ;
  - échec de test avec diagnostic simple (assertion incorrecte) ;
  - échec de test avec diagnostic complexe (mock obsolète, régression) ;
  - demande ambiguë (pas de précision sur le type de vérification) ;
  - refus correct de corriger automatiquement ;
  - escalade correcte vers implémentation ou planification ;
  - exécution E2E simple ;
  - exécution d'un script projet (validate-logging-migration).

**Fichiers à créer** :
- `documentation/spec/llm/opencode-test-diagnostics-scenarios.md`

**Risques spécifiques** :
- Oublier des cas limites (échec de l'outil lui-même, timeout).
- Scénarios trop théoriques pour être rejoués.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `documentation/plan/llm/270-plan-workflow-test-diagnostics.md` | création | Plan canonique de l'issue |
| `documentation/cadrage/llm/cadrage-opencode-configuration.md` | modification | Ajout d'une section 20 dédiée au workflow de tests et diagnostic d'échec |
| `documentation/spec/llm/opencode-test-diagnostics-command.md` | création | Spécification opérable de la future commande OpenCode de test et diagnostic |
| `documentation/spec/llm/opencode-test-diagnostics-scenarios.md` | création | Scénarios de validation manuelle et matrice d'escalade |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Confondre exécution et correction | L'agent corrige avant d'avoir diagnostiqué | Séparation stricte en 3 phases avec permissions différentes |
| Confondre diagnostic et implémentation | Le diagnostic propose du code au lieu d'une analyse | Contrat de sortie borné : hypothèse, cause, fichiers, pas de code correctif |
| Périmètre trop large (trop de sous-commandes) | Spécification difficile à implémenter | Prioriser Vitest + lint comme socle minimal, E2E et scripts comme extensions |
| Aucun script lint dans package.json | Impossible d'exécuter "pnpm lint" | La spec documente l'appel explicite `pnpm exec eslint ...` et recommande d'ajouter le script dans un ticket ultérieur |
| Sortie de test trop volumineuse pour le modèle | Consommation excessive de tokens | Filtrer la sortie : statut + erreurs + fichiers incriminés uniquement |
| Dépendance `#256` incohérente | Mauvaise lecture des prérequis | Documenter la dépendance comme anomalie de traçabilité, pas comme blocage technique |
| Validation trop théorique | Workflow non fiable en pratique | Prévoir une batterie de scénarios manuels représentatifs couvrant succès, échec simple, échec complexe |

---

## 8. Proposition d'ordre de commit

1. `docs(opencode): formaliser le workflow de tests et diagnostic d'echec`
2. `docs(opencode): specifier la commande de test et diagnostic`
3. `docs(opencode): ajouter les scenarios de validation du workflow de tests`

---

## 9. Dépendances avec les autres US

- `#267` est une dépendance doctrinale amont : elle valide l'orchestration assistée, classe les vérifications mécaniques en risque faible, fixe la règle commandes vs skills.
- `#268` et `#269` sont des dépendances fonctionnelles voisines : les workflows d'exploration et de planification doivent pouvoir escalader vers ce workflow de tests/diagnostic, et réciproquement.
- Une future étape d'alignement des commandes OpenCode reste probable pour matérialiser réellement la commande, mais n'est pas bloquante pour ce ticket documentaire.
- La correction des échecs détectés reste volontairement séparée : elle sera couverte par un ticket dédié ou par `implementer-depuis-plan`.
- La référence `Blocked by #256` doit être clarifiée : GitHub pointe vers une PR talent-tree mergée sans lien avec OpenCode. Traitée comme anomalie documentaire.
