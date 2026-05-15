# Plan d'implémentation — OpenCode : cadrer un workflow de planification sans écriture de code

**Issue** : [#269 — OpenCode - Cadrer un workflow de planification sans ecriture de code](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/269)
**ADR** : `documentation/architecture/adr/adr-0010-llm-code-ready.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Module(s) impacté(s)** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (modification), `documentation/spec/llm/opencode-planning-readonly-command.md` (création), `documentation/spec/llm/opencode-planning-readonly-scenarios.md` (création), `.agents/skills/plan-depuis-issue/SKILL.md` (modification ciblée)

---

## 1. Objectif

Définir un workflow complet de planification OpenCode qui transforme une demande utilisateur en **plan d'intervention exploitable**, sans aucune capacité d'implémentation ni dérive de périmètre.

Le résultat attendu est un cadre opérable qui :
- cadre l'entrée, l'exécution et la sortie d'une demande de planification ;
- interdit explicitement l'écriture de code et l'élargissement opportuniste du scope ;
- garantit une sortie structurée couvrant périmètre, dépendances, risques, validations et ordre d'exécution ;
- s'articule proprement avec la doctrine `#267`, le workflow d'exploration `#268` et le skill existant `plan-depuis-issue`.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Formaliser un workflow cible de planification OpenCode en lecture seule stricte côté code.
- Définir les intentions utilisateur qui doivent router vers ce workflow.
- Définir le contrat d'entrée :
  - issue GitHub, URL, numéro d'issue, ou demande explicite de plan.
- Définir le contrat d'exécution :
  - lecture, recherche, analyse, synthèse, questions d'arbitrage.
- Définir le contrat de sortie :
  - objectif ;
  - périmètre inclus/exclu ;
  - constats sur l'existant ;
  - décisions d'architecture ;
  - étapes de travail ;
  - fichiers visés ;
  - risques ;
  - validations attendues ;
  - ordre de commit.
- Définir les garde-fous explicites :
  - pas d'implémentation ;
  - pas d'élargissement du scope ;
  - pas de modification d'issue ;
  - pas de matérialisation automatique dans le repo.
- Définir l'articulation entre :
  - future commande OpenCode de planification ;
  - skill `plan-depuis-issue` ;
  - étape séparée d'écriture via `ecrire-plan-fichier`.
- Produire une matrice de scénarios de validation manuelle.

### Exclu de cette US / ce ticket

- Implémentation effective d'une commande OpenCode exécutable.
- Création d'un agent runtime spécifique si OpenCode n'en a pas encore la convention locale.
- Écriture automatique du plan dans `documentation/plan/` à l'issue du workflow.
- Toute modification du code applicatif SWERPG.
- Toute automatisation d'implémentation après plan.
- Toute mise à jour de l'issue GitHub elle-même.
- Toute redéfinition du workflow d'exploration déjà cadré par `#268`.

---

## 3. Constat sur l'existant

### 3.1. La doctrine OpenCode couvre déjà les principes structurants

`documentation/cadrage/llm/cadrage-opencode-configuration.md` formalise déjà :
- l'orchestration assistée ;
- la séparation stricte des rôles ;
- l'alignement des permissions sur le risque ;
- la règle "commandes pour les routines, skills pour le savoir".

La section 17 issue de `#267` classe déjà "Créer un plan depuis une issue" comme activité de **planification**, à risque **moyen**, avec validation humaine.

### 3.2. Le workflow d'exploration existe déjà et doit escalader vers la planification

La section 18 du cadrage et les documents issus de `#268` définissent déjà :
- un workflow d'exploration en lecture seule ;
- une frontière explicite avec la planification ;
- une escalade manuelle vers `plan-depuis-issue`.

Le ticket `#269` doit donc compléter cette chaîne, pas la réinventer.

### 3.3. Le skill `plan-depuis-issue` apporte la méthode, mais pas encore le workflow OpenCode cible

Le skill local `.agents/skills/plan-depuis-issue/SKILL.md` est déjà robuste :
- lecture des plans existants ;
- lecture des ADRs ;
- exploration du codebase ;
- questions d'arbitrage ;
- format canonique du plan.

Mais il présente un décalage avec le workflow cible retenu ici :
- il parle encore de "produire un document structuré dans `documentation/plan/`" ;
- il ne sépare pas explicitement la **production du plan validé** de sa **matérialisation dans le dépôt** ;
- il n'énonce pas encore comme règle explicite l'interdiction d'**élargir le périmètre**.

### 3.4. Une étape mécanique d'écriture existe déjà séparément

Le skill `ecrire-plan-fichier` matérialise déjà un plan validé dans `documentation/plan/`.
Cela confirme qu'il existe une séparation naturelle entre :
- planifier ;
- écrire le fichier ;
- implémenter.

Le ticket `#269` doit capitaliser sur cette séparation au lieu de la brouiller.

### 3.5. Aucun artefact documentaire dédié au workflow de planification n'existe encore

À ce stade, le repo contient :
- une doctrine générale ;
- un workflow d'exploration documenté ;
- un skill de planification ;
- un skill d'écriture de plan.

En revanche, il manque encore :
- une spécification documentaire explicite du workflow de planification OpenCode ;
- une matrice de scénarios de validation ;
- une clarification documentaire du rôle exact du skill dans ce workflow.

### 3.6. La dépendance `Blocked by #256` n'est pas crédible techniquement

Comme pour `#268`, la référence GitHub `#256` pointe vers une PR `talent-tree` sans lien apparent avec le périmètre OpenCode / documentation.

Cette dépendance doit être traitée comme un **risque de traçabilité documentaire**, pas comme un blocage technique réel.

---

## 4. Décisions d'architecture

### 4.1. Workflow porté par une commande documentée, pas par le skill seul

**Question** : faut-il cadrer la planification comme simple évolution du skill `plan-depuis-issue`, ou comme un workflow OpenCode plus large ?

**Options envisagées** :
- faire évoluer uniquement le skill ;
- cadrer une future commande OpenCode distincte ;
- faire les deux.

**Décision** : cadrer le workflow comme une future **commande OpenCode de planification**, tout en conservant `plan-depuis-issue` comme porteur de savoir méthodologique.

**Justification** :
- la doctrine `#267` dit explicitement : commandes pour les routines, skills pour le savoir ;
- la planification est un workflow récurrent, donc bonne candidate pour une commande ;
- le skill existant reste utile pour injecter méthode, format et conventions projet ;
- cela évite de transformer un skill en pseudo-orchestrateur général.

### 4.2. Agent de planification en lecture seule stricte, avec capacité d'analyse forte

**Décision** : le workflow de planification doit utiliser un agent de type **général / planification**, mais avec permissions **lecture seule stricte** sur le code et le dépôt.

**Justification** :
- contrairement à l'exploration simple, la planification exige synthèse, arbitrage et structuration ;
- la doctrine réserve les modèles plus capables aux plans complexes ;
- l'interdiction d'écriture supprime le principal risque de dérive d'un agent plus puissant ;
- cela sépare nettement "penser" de "faire".

### 4.3. Le workflow s'arrête au plan validé, pas à l'écriture du fichier

**Options envisagées** :
- arrêter le workflow à la restitution du plan validé ;
- inclure aussi la création du fichier Markdown dans `documentation/plan/`.

**Décision** : arrêter le workflow de planification au **plan validé**.

**Justification** :
- l'écriture du fichier est déjà couverte par une étape dédiée (`ecrire-plan-fichier`) ;
- cela renforce la séparation des responsabilités ;
- cela maintient le workflow de planification dans un mode strictement non-modificateur ;
- cela évite qu'une demande de planification crée automatiquement un artefact repo sans validation explicite.

### 4.4. Interdire explicitement l'élargissement du périmètre

**Décision** : le workflow doit contenir une règle explicite de **non-extension du scope**.

**Justification** :
- l'acceptance criterion `#269` l'exige ;
- un agent de planification a naturellement tendance à "compléter" un sujet ;
- le plan doit refléter l'issue et les arbitrages utilisateur, pas une feuille de route opportuniste ;
- cela protège la traçabilité entre issue, plan et implémentation.

### 4.5. La sortie doit être un plan d'intervention, pas une simple synthèse

**Décision** : la sortie minimale doit imposer une structure de plan proche du format canonique déjà utilisé dans `documentation/plan/`.

**Justification** :
- un simple résumé serait insuffisant pour l'implémentation ultérieure ;
- le projet possède déjà un format éprouvé ;
- la cohérence documentaire facilitera ensuite l'écriture de fichier si elle est demandée.

### 4.6. L'escalade depuis l'exploration et vers l'écriture/implémentation reste manuelle

**Décision** : aucune transition ne doit être automatique.

Le workflow doit :
- accepter une escalade depuis l'exploration ;
- proposer l'écriture du plan ou l'implémentation comme suites possibles ;
- attendre une instruction explicite avant tout changement d'étape.

**Justification** :
- cohérence avec l'orchestration assistée ;
- prévention des enchaînements implicites ;
- réduction du risque de confusion entre lire, planifier, écrire, coder.

### 4.7. Le skill `plan-depuis-issue` doit être réaligné sur le workflow cible

**Décision** : ajuster le skill pour expliciter que :
- son rôle est de produire un **plan validé** ;
- l'écriture du fichier est une étape séparée ;
- il ne doit ni coder ni étendre le périmètre.

**Justification** :
- aujourd'hui, le skill mélange légèrement planification et matérialisation ;
- sans cet alignement, la doctrine et la réalité d'exécution resteraient contradictoires ;
- c'est une modification ciblée, cohérente avec le ticket, sans changer le fond méthodologique du skill.

---

## 5. Plan de travail détaillé

### Étape 1 — Ajouter une section normative dédiée au workflow de planification

**Quoi faire** :
- Étendre `documentation/cadrage/llm/cadrage-opencode-configuration.md` avec une nouvelle section dédiée au workflow de planification.
- Y formaliser :
  - intention utilisateur ;
  - niveau de risque ;
  - type d'agent ;
  - permissions ;
  - contrat de sortie ;
  - garde-fous ;
  - articulation avec exploration, écriture de plan et implémentation.

**Fichiers à modifier** :
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- répéter la doctrine existante sans l'opérationnaliser ;
- rester trop abstrait sur les frontières de rôle.

### Étape 2 — Spécifier la future commande OpenCode de planification

**Quoi faire** :
- Créer une spécification documentaire `opencode-planning-readonly-command`.
- Définir :
  - les demandes éligibles ;
  - les entrées acceptées ;
  - le niveau de profondeur ;
  - l'usage du skill `plan-depuis-issue` ;
  - les outils autorisés ;
  - les interdits ;
  - la structure de sortie attendue.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-planning-readonly-command.md`

**Risques spécifiques** :
- produire une spec trop liée au runtime OpenCode actuel ;
- trop dépendre d'un emplacement technique non encore standardisé.

### Étape 3 — Formaliser les garde-fous anti-dérive

**Quoi faire** :
- Documenter explicitement les interdits :
  - pas de code ;
  - pas de doc écrite automatiquement ;
  - pas de mise à jour d'issue ;
  - pas d'élargissement du scope ;
  - pas de choix d'architecture implicite sans signalement ;
  - pas de passage direct à l'implémentation.
- Définir les cas où le workflow doit poser une question à l'utilisateur.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-planning-readonly-command.md`
- `.agents/skills/plan-depuis-issue/SKILL.md`

**Risques spécifiques** :
- garde-fous trop faibles ;
- garde-fous trop nombreux et peu utilisables.

### Étape 4 — Définir le contrat de sortie du plan

**Quoi faire** :
- Imposer un format de sortie directement exploitable :
  - objectif ;
  - périmètre inclus/exclu ;
  - constats ;
  - décisions ;
  - étapes ;
  - fichiers ;
  - risques ;
  - validations ;
  - ordre de commit ;
  - dépendances.
- Ajouter une section explicite "validations attendues avant implémentation".

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-planning-readonly-command.md`

**Risques spécifiques** :
- plan trop bavard ;
- plan trop léger pour guider l'implémentation ;
- mélange entre plan et solution détaillée.

### Étape 5 — Clarifier la frontière avec les autres workflows

**Quoi faire** :
- Décrire la chaîne attendue :
  - exploration -> planification ;
  - planification -> écriture de plan ;
  - planification -> implémentation.
- Préciser que :
  - l'exploration ne planifie pas ;
  - la planification n'écrit pas automatiquement dans le repo ;
  - l'implémentation exige un plan validé.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-planning-readonly-command.md`
- `documentation/cadrage/llm/cadrage-opencode-configuration.md`

**Risques spécifiques** :
- frontière floue entre exploration et planification ;
- frontière floue entre planification et documentation.

### Étape 6 — Produire une matrice de validation manuelle

**Quoi faire** :
- Créer des scénarios couvrant au minimum :
  - demande explicite de plan depuis issue ;
  - issue ambiguë nécessitant arbitrage ;
  - refus correct d'implémenter ;
  - refus correct d'élargir le périmètre ;
  - arrêt au plan validé ;
  - escalade séparée vers écriture du plan ;
  - escalade séparée vers implémentation ;
  - signalement d'une dépendance GitHub incohérente.

**Fichiers à modifier** :
- `documentation/spec/llm/opencode-planning-readonly-scenarios.md`

**Risques spécifiques** :
- oublier des cas limites ;
- validations trop théoriques pour être rejouées.

### Étape 7 — Réaligner le skill `plan-depuis-issue`

**Quoi faire** :
- Mettre à jour le texte du skill pour refléter le workflow retenu :
  - plan validé en sortie ;
  - pas de matérialisation automatique ;
  - interdiction explicite d'élargir le scope ;
  - interaction attendue avec `ecrire-plan-fichier`.
- Conserver le cœur méthodologique existant.

**Fichiers à modifier** :
- `.agents/skills/plan-depuis-issue/SKILL.md`

**Risques spécifiques** :
- dupliquer dans le skill ce qui relève mieux de la commande ;
- introduire une contradiction avec la doctrine générale si le wording reste flou.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `documentation/plan/llm/269-plan-workflow-planification-readonly.md` | création | Plan canonique de l'issue |
| `documentation/cadrage/llm/cadrage-opencode-configuration.md` | modification | Ajout d'une section normative dédiée au workflow de planification |
| `documentation/spec/llm/opencode-planning-readonly-command.md` | création | Spécification opérable de la future commande OpenCode de planification |
| `documentation/spec/llm/opencode-planning-readonly-scenarios.md` | création | Scénarios de validation et matrice d'escalade du workflow |
| `.agents/skills/plan-depuis-issue/SKILL.md` | modification | Réalignement du skill sur la séparation commande / plan validé / écriture séparée |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Confondre planification et implémentation | L'agent commence à proposer du code ou des changements trop détaillés | Interdits explicites dans la spec et scénarios de refus |
| Confondre planification et écriture documentaire | Le workflow modifie le repo alors qu'il devait s'arrêter au plan validé | Sortie du workflow bornée au plan ; écriture renvoyée vers étape dédiée |
| Élargissement opportuniste du périmètre | Le plan devient plus large que l'issue et perd sa traçabilité | Section "inclus / exclu" obligatoire et règle explicite de non-extension |
| Skill et commande se contredisent | Exécution incohérente selon le point d'entrée | Réaligner `.agents/skills/plan-depuis-issue/SKILL.md` sur la spec |
| Redondance avec `#268` | Documentation dispersée ou répétitive | Définir clairement la frontière exploration -> planification |
| Dépendance GitHub `#256` trompeuse | Mauvaise lecture de l'ordre réel des travaux | La signaler comme anomalie documentaire, pas blocage technique |
| Sortie trop abstraite | Le plan n'est pas exploitable pour implémenter | Imposer un format canonique proche des plans existants |
| Sortie trop verbeuse | Coût élevé et faible lisibilité | Format sobre, structuré, focalisé sur décisions et exécution |

---

## 8. Proposition d'ordre de commit

1. `docs(opencode): formaliser le workflow de planification en lecture seule`
2. `docs(opencode): specifier la commande de planification readonly`
3. `docs(opencode): ajouter les scenarios de validation du workflow de planification`
4. `docs(skills): aligner plan-depuis-issue sur le workflow de planification`

---

## 9. Dépendances avec les autres US

- `#267` est une dépendance doctrinale amont déjà traitée :
  - elle valide l'orchestration assistée ;
  - elle classe la planification comme activité distincte ;
  - elle fixe la règle commandes vs skills.
- `#268` est une dépendance fonctionnelle voisine :
  - le workflow d'exploration doit pouvoir escalader vers ce workflow de planification ;
  - `#269` complète donc la chaîne utilisateur lecture -> plan.
- Une future étape d'alignement des commandes OpenCode reste probable pour matérialiser réellement la commande, mais n'est pas bloquante pour ce ticket documentaire.
- L'étape d'écriture du fichier de plan reste volontairement séparée :
  - elle peut s'appuyer sur `ecrire-plan-fichier` ;
  - elle ne fait pas partie du workflow décrit ici.
- La référence `Blocked by #256` doit être clarifiée, car elle ne constitue pas une dépendance technique cohérente avec le périmètre OpenCode.
