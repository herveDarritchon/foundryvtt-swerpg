# Plan d'implémentation — OpenCode : cadrer un workflow d'exploration en lecture seule de bout en bout

**Issue** : [#268 — OpenCode - Cadrer un workflow d'exploration en lecture seule de bout en bout](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/268)
**ADR** : `documentation/architecture/adr/adr-0010-llm-code-ready.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (modification), `documentation/spec/llm/opencode-exploration-readonly-command.md` (création), `documentation/spec/llm/opencode-exploration-readonly-scenarios.md` (création)

---

## 1. Objectif

Définir un workflow complet pour les demandes d'exploration OpenCode, depuis l'intention utilisateur jusqu'au résultat restitué, avec un agent limité à la lecture, à la recherche et à la synthèse.

Le résultat attendu est un cadre opérable et sobre qui :
- traite de bout en bout une demande de compréhension sans aucune capacité d'écriture ;
- explicite les limites de l'agent, le type de résultat attendu et le niveau de modèle visé ;
- réduit le coût des tâches de lecture et de préparation sans dégrader la fiabilité ;
- prépare une future commande OpenCode cohérente avec la doctrine validée en `#267`.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Formaliser le workflow cible d'exploration en lecture seule.
- Définir les intentions utilisateur qui doivent router vers ce workflow.
- Définir les permissions et limites du profil d'exploration.
- Définir le contrat de sortie attendu :
  - synthèse courte ;
  - preuves et références de fichiers ;
  - questions ouvertes ;
  - critères d'escalade.
- Définir le niveau de modèle cible :
  - modèle économique ou local par défaut ;
  - pas de modèle de raisonnement fort pour la simple exploration.
- Définir la place du sous-agent `explore` dans ce workflow.
- Définir une matrice de scénarios de validation manuelle.
- Produire la spécification documentaire d'une future commande OpenCode d'exploration.

### Exclu de cette US / ce ticket

- Implémentation effective d'une commande OpenCode exécutable.
- Création ou modification d'un skill dédié à l'exploration simple.
- Création ou modification d'un agent d'implémentation.
- Toute écriture de code applicatif SWERPG.
- Toute modification de permissions runtime réelles hors documentation.
- Toute automatisation d'escalade vers planification ou implémentation.
- Toute mise à jour de l'issue GitHub elle-même.

---

## 3. Constat sur l'existant

### 3.1. La doctrine cible existe déjà

`documentation/cadrage/llm/cadrage-opencode-configuration.md` formalise déjà les règles structurantes utiles ici :
- exploration = lecture, recherche, synthèse ;
- une tâche de lecture doit avoir un accès en lecture seule ;
- les commandes portent les routines ;
- les skills portent le savoir projet ;
- les modèles économiques suffisent pour l'exploration ;
- la cible recommandée est une orchestration assistée.

### 3.2. L'issue #267 a déjà tranché le positionnement doctrinal

La section 17 du cadrage, issue de `#267`, classe explicitement l'exploration parmi les activités à faible risque et rappelle qu'il ne faut pas créer de skill pour les activités mécaniques ou l'exploration simple.

Cela oriente fortement `#268` vers une **commande documentée**, et non vers un nouveau skill.

### 3.3. Aucun artefact OpenCode local n'existe encore pour les commandes

Le dépôt ne contient pas aujourd'hui :
- de répertoire `.opencode/` ;
- de répertoire `docs/agents/` ;
- de fichier `AGENTS.md` projet ;
- de convention locale déjà matérialisée pour stocker des commandes OpenCode.

Le ticket doit donc d'abord cadrer le workflow et la spécification, sans présumer d'une implémentation technique déjà installée.

### 3.4. Le dépôt possède déjà des patterns documentaires réutilisables

Les zones existantes les plus cohérentes pour porter ce travail sont :
- `documentation/cadrage/llm/` pour la doctrine ;
- `documentation/spec/` pour une spécification opérable ;
- `.github/prompts/` et `.github/chatmodes/` comme références de structuration d'artefacts assistants, sans les cibler directement dans ce ticket.

### 3.5. Le niveau de modèle recommandé est déjà documenté

Le cadrage OpenCode et le prompt `model-recommendation` convergent :
- outils lecture seule => modèles économiques ou locaux ;
- pas de modèle avancé pour une simple tâche de repérage ;
- raisonnement fort réservé aux plans, arbitrages et revues critiques.

### 3.6. Le ticket a une dépendance GitHub ambiguë

L'issue mentionne un blocage par `#256`, mais la référence GitHub actuelle pointe vers une PR `talent-tree` sans lien apparent avec OpenCode ou le workflow d'exploration.

Cette dépendance doit être clarifiée dans le plan comme risque documentaire, pas comme dépendance technique fiable.

---

## 4. Décisions d'architecture

### 4.1. Commande documentée plutôt que skill dédié

**Décision** : cadrer le workflow comme une future **commande OpenCode**, documentée dans le dépôt, et non comme un nouveau skill.

**Options envisagées** :
- créer un skill d'exploration ;
- décrire une commande/routine d'exploration ;
- rester purement théorique sans artefact cible.

**Justification** :
- la doctrine validée dit : commandes pour les routines, skills pour le savoir ;
- l'audit `#267` recommande explicitement de ne pas créer de skill pour l'exploration simple ;
- une commande est mieux adaptée à un flux standardisé entrée -> recherche -> synthèse.

### 4.2. Sous-agent `explore` seul pour l'exécution

**Décision** : retenir le sous-agent `explore` comme moteur exclusif du workflow d'exploration.

**Options envisagées** :
- agent général bridé ;
- mix `general` / `explore` ;
- `explore` seul.

**Justification** :
- l'objectif du ticket est précisément une activité bornée à la lecture ;
- cela limite le risque de dérive de scope ;
- cela rend le choix du modèle plus économique et plus prévisible ;
- cela aligne mieux autonomie, coût et fiabilité.

### 4.3. Sortie courte, sourcée, non verbeuse

**Décision** : imposer une restitution courte avec preuves minimales :
- réponse synthétique ;
- références de fichiers et lignes pertinentes ;
- éventuelles zones d'incertitude ;
- proposition d'escalade seulement si nécessaire.

**Justification** :
- le cadrage OpenCode impose de ne pas noyer le contexte avec des sorties longues ;
- ADR-0012 valorise des diagnostics lisibles et ciblés ;
- l'exploration doit aider à décider, pas produire un dump brut.

### 4.4. Escalade explicite vers planification ou implémentation

**Décision** : le workflow d'exploration s'arrête dès que la demande nécessite :
- arbitrage d'architecture ;
- plan d'implémentation ;
- modification de code ;
- validation fonctionnelle large.

**Justification** :
- séparation stricte des rôles ;
- prévention des dérives ;
- conformité avec l'orchestration assistée validée par `#267`.

### 4.5. Spécification documentaire avant matérialisation technique

**Décision** : dans ce ticket, créer une spécification documentaire de la future commande et de ses scénarios de validation, sans figer encore un répertoire runtime OpenCode inexistant dans le repo.

**Justification** :
- le dépôt n'a pas encore de convention locale pour les commandes OpenCode ;
- cela permet de livrer une décision exploitable sans inventer une intégration prématurée ;
- la matérialisation technique pourra suivre dans un ticket d'alignement des commandes.

---

## 5. Plan de travail détaillé

### Étape 1 — Consolider la doctrine d'exploration en lecture seule

**Quoi faire** :
- Extraire du cadrage OpenCode les règles normatives applicables à l'exploration.
- Ajouter une section dédiée au workflow d'exploration :
  - intention utilisateur ;
  - permissions ;
  - type d'agent ;
  - niveau de modèle ;
  - forme du résultat ;
  - conditions d'escalade.

**Fichiers à modifier** :
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- répéter la doctrine existante sans valeur ajoutée ;
- rester trop abstrait pour être exécutable.

### Étape 2 — Définir le contrat d'entrée du workflow

**Quoi faire** :
- Décrire précisément quels types de demandes doivent déclencher l'exploration.
- Décrire les exclusions :
  - demandes de plan ;
  - demandes d'implémentation ;
  - demandes de correction ;
  - demandes de revue de diff.
- Définir les variantes de profondeur attendues :
  - rapide ;
  - moyenne ;
  - approfondie.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-exploration-readonly-command.md`

**Risques spécifiques** :
- frontière floue entre exploration et planification ;
- sur-déclenchement du workflow pour des demandes non adaptées.

### Étape 3 — Définir le contrat d'exécution du sous-agent

**Quoi faire** :
- Formaliser l'usage du sous-agent `explore`.
- Décrire les outils autorisés en lecture :
  - recherche de fichiers ;
  - recherche textuelle ;
  - lecture de fichiers ;
  - consultation web si explicitement utile.
- Décrire les interdits :
  - édition de fichiers ;
  - écriture de documentation ;
  - commandes destructrices ;
  - tests non nécessaires ;
  - Git modifiant l'état du dépôt.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-exploration-readonly-command.md`

**Risques spécifiques** :
- oublier un garde-fou important ;
- décrire un profil trop large, proche d'un agent général.

### Étape 4 — Définir le contrat de sortie

**Quoi faire** :
- Définir le format minimal de restitution :
  - résumé de la demande comprise ;
  - constats principaux ;
  - références factuelles ;
  - points non résolus ;
  - recommandation d'étape suivante.
- Définir les règles de sobriété :
  - pas de longs logs ;
  - pas de citations massives ;
  - pas de pseudo-plan caché ;
  - pas d'action non demandée.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-exploration-readonly-command.md`

**Risques spécifiques** :
- sortie trop bavarde ;
- sortie trop pauvre pour être utile ;
- confusion entre synthèse et plan d'action.

### Étape 5 — Définir la matrice d'escalade

**Quoi faire** :
- Décrire quand l'exploration doit s'arrêter et orienter vers :
  - planification ;
  - implémentation ;
  - revue ;
  - test ;
  - documentation.
- Donner des exemples concrets de routage.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-exploration-readonly-command.md`
- `documentation/spec/llm/opencode-exploration-readonly-scenarios.md`

**Risques spécifiques** :
- laisser l'agent franchir trop facilement la frontière de rôle ;
- escalade trop tardive.

### Étape 6 — Définir les scénarios de validation manuelle

**Quoi faire** :
- Rédiger 6 à 10 scénarios représentatifs couvrant :
  - compréhension de convention ;
  - cartographie d'un module ;
  - identification de fichiers concernés ;
  - préparation d'un futur plan ;
  - refus correct d'une demande d'écriture ;
  - escalade correcte vers un autre workflow.
- Associer à chaque scénario :
  - entrée ;
  - comportement attendu ;
  - format de sortie attendu ;
  - critère d'acceptation.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-exploration-readonly-scenarios.md`

**Risques spécifiques** :
- validation trop théorique ;
- scénarios non représentatifs des usages réels.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `documentation/plan/llm/268-plan-workflow-exploration-readonly.md` | création | Plan canonique de l'issue |
| `documentation/cadrage/llm/cadrage-opencode-configuration.md` | modification | Ajout d'une section normative dédiée au workflow d'exploration en lecture seule |
| `documentation/spec/llm/opencode-exploration-readonly-command.md` | création | Spécification opérable de la future commande OpenCode d'exploration |
| `documentation/spec/llm/opencode-exploration-readonly-scenarios.md` | création | Scénarios de validation manuelle et matrice d'escalade |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Confondre exploration et planification | L'agent commence à proposer ou imposer une solution | Définir des critères d'entrée/sortie et une matrice d'escalade explicite |
| Créer un skill au lieu d'une commande | Désalignement avec la doctrine `#267` | Rappeler explicitement la règle "commandes pour les routines" |
| Décrire un agent trop puissant | Dérive de scope et coût excessif | Imposer `explore` seul, lecture seule stricte, modèle économique |
| Sortie trop verbeuse | Coût élevé et faible lisibilité | Fixer un contrat de restitution court et sourcé |
| Sortie insuffisamment étayée | Baisse de fiabilité | Exiger références de fichiers et éléments vérifiés |
| Absence de convention locale pour stocker les commandes OpenCode | Blocage d'implémentation ultérieure | Livrer d'abord une spécification documentaire indépendante du runtime |
| Dépendance `#256` incohérente | Mauvaise lecture des prérequis | Documenter la dépendance comme ambiguë et demander clarification avant implémentation runtime |
| Validation trop théorique | Workflow non fiable en pratique | Prévoir une batterie de scénarios manuels représentatifs |

---

## 8. Proposition d'ordre de commit

1. `docs(opencode): formaliser le workflow d'exploration en lecture seule`
2. `docs(opencode): specifier la commande d'exploration et son contrat de sortie`
3. `docs(opencode): ajouter les scenarios de validation du workflow d'exploration`

---

## 9. Dépendances avec les autres US

- Ce ticket dépend conceptuellement de la doctrine validée par `#267`.
- Ce ticket est amont pour un futur ticket d'alignement des commandes OpenCode.
- Ce ticket est amont pour un futur ticket de définition des permissions runtime par type d'agent.
- Ce ticket est amont pour tout workflow "préparer un plan", "diagnostiquer", "review" ou "préparer une PR" nécessitant un routage depuis une phase d'exploration.
- La référence "Blocked by #256" doit être clarifiée, car l'objet actuellement résolu par GitHub ne semble pas lié au périmètre OpenCode.
