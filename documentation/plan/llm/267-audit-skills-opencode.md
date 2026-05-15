# Audit de cohérence des skills OpenCode — Issue #267

**Issue** : [#267 — OpenCode - Valider la doctrine cible et la liste des usages frequents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/267)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 17)
**Périmètre** : Audit documentaire uniquement — aucune modification des skills n’est effectuée dans ce ticket.

---

## Contexte

Cinq skills locaux sous `.agents/skills/` sont audités au regard de la doctrine cible validée (orchestration assistée, séparation des rôles, skills = savoir projet, commandes = routines). L’audit compare pour chaque skill l’**intention annoncée**, le **résultat attendu**, les **limites**, le **niveau d’autonomie implicite** et la **cohérence avec le rôle doctrinal attendu**.

---

## 1. `plan-depuis-issue`

### Intention annoncée

Générer un plan d’implémentation technique détaillé à partir d’une issue GitHub. Le skill produit un document structuré dans `documentation/plan/`.

### Résultat attendu

Plan validé, fichier `.md` créé, aucune modification de code.

### Limites explicites

- Ne jamais écrire une ligne de code d’implémentation.
- Ne pas modifier le code existant.
- Ne pas modifier les issues GitHub.

### Niveau d’autonomie implicite

**Assistée** — Le skill pose des questions à l’utilisateur avant de finaliser le plan (décisions d’architecture, périmètre). Il ne modifie pas le code.

### Cohérence avec la doctrine

| Critère | État |
|---|---|
| Rôle doctrinal attendu | Planification |
| Séparation des responsabilités | ✅ Ne modifie pas le code |
| Validation humaine | ✅ Décisions validées avant rédaction |
| Skill ou commande | ✅ Skill (apporte méthode et structure de plan) |
| Alignement risque | ✅ Risque moyen, validation humaine intégrée |

### Écarts identifiés

Aucun écart significatif. Le skill est bien aligné avec la doctrine.

---

## 2. `ecrire-plan-fichier`

### Intention annoncée

Prendre un plan déjà rédigé ou validé et le matérialiser dans `documentation/plan/` sans refaire le travail de planification.

### Résultat attendu

Fichier Markdown créé au bon emplacement, contenu préservé.

### Limites explicites

- Ne pas inventer de détails techniques.
- Ne pas enrichir, redécouper ni re-spécifier.
- Ne pas modifier le code source.
- Ne pas lancer de tests.
- Ne pas créer de commit ni de PR.

### Niveau d’autonomie implicite

**Assistée** — Opération mécanique avec vérifications (collision, arborescence, nommage).

### Cohérence avec la doctrine

| Critère | État |
|---|---|
| Rôle doctrinal attendu | Documentation |
| Séparation des responsabilités | ✅ Opération d’écriture pure |
| Validation humaine | ✅ Plan déjà validé avant |
| Skill ou commande | ⚠️ **Pourrait être une commande** — Opération mécanique, pas de savoir projet |
| Alignement risque | ✅ Faible |

### Écarts identifiés

**Écart structurel** : Ce skill est une opération mécanique d’écriture de fichier. Selon la doctrine (“les skills apportent le savoir projet, les commandes standardisent les routines”), il correspond davantage au rôle d’une **commande** que d’un skill porteur de connaissance. Il ne contient pas de règle projet, de convention d’architecture ou de connaissance durable — seulement un workflow d’écriture.

**Recommandation** : Évaluer sa transformation en commande OpenCode dans un ticket ultérieur.

---

## 3. `implementer-depuis-plan`

### Intention annoncée

Transformer un plan en implémentation réelle, sans repartir de zéro, en exécutant le plan de manière disciplinée avec tests et validation.

### Résultat attendu

Code implémenté, tests ajoutés ou adaptés, validation effectuée, résumé livré.

### Limites explicites

- Ne pas réinventer l’architecture si le plan tranche.
- Ne pas faire de refactor hors périmètre.
- Ne pas modifier des zones non concernées.
- Ne pas introduire de comportement opportuniste.

### Niveau d’autonomie implicite

**Assistée** — Autonomie élevée dans le cadre du plan, mais strictement bornée par les règles du skill (ne pas dévier, ne pas étendre, signaler les écarts).

### Cohérence avec la doctrine

| Critère | État |
|---|---|
| Rôle doctrinal attendu | Implémentation |
| Séparation des responsabilités | ✅ Suit un plan, ne planifie pas |
| Validation humaine | ✅ Écarts signalés, validation des choix ambigus |
| Skill ou commande | ✅ Skill (contient savoir projet : conventions, architecture, tests) |
| Alignement risque | ✅ Risque élevé, encadré par des règles strictes |

### Écarts identifiés

Aucun écart significatif. Le skill est le plus complet et le mieux aligné avec la doctrine.

---

## 4. `to-issues`

### Intention annoncée

Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices.

### Résultat attendu

Issues créées sur le tracker GitHub, découpées en tranches verticales, avec critères d’acceptation et dépendances.

### Limites explicites

- Do NOT close or modify any parent issue.
- Prefer AFK over HITL where possible.
- Keep issue content in French.

### Niveau d’autonomie implicite

**Élevée** — Le skill peut créer des issues de manière autonome (AFK) après validation du découpage par l’utilisateur.

### Cohérence avec la doctrine

| Critère | État |
|---|---|
| Rôle doctrinal attendu | Planification / Découpage |
| Séparation des responsabilités | ✅ Crée des issues, ne modifie pas le code |
| Validation humaine | ✅ Découpage validé avant publication |
| Skill ou commande | ✅ Skill (apporte méthode de découpage vertical) |
| Alignement risque | ✅ Moyen, validation humaine sur le contenu |
| Langue | ⚠️ Skill en anglais, mais produit du contenu français — acceptable |

### Écarts identifiés

**Écart mineur** : Le skill est entièrement en anglais alors que les autres skills du projet sont en français (ou bilingues). La doctrine ne tranche pas sur la langue des skills, mais l’incohérence peut surprendre.

---

## 5. `my-pull-requests`

### Intention annoncée

List my pull requests in the current repository.

### Résultat attendu

Affichage des PR assignées à l’utilisateur, avec description, statut de review et check failures.

### Limites explicites

- Read-only : liste et décrit, ne crée pas.
- Utilise `#list_pull_requests` et `#request_copilot_review`.

### Niveau d’autonomie implicite

**Lecture seule** — Consultation uniquement.

### Cohérence avec la doctrine

| Critère | État |
|---|---|
| Rôle doctrinal attendu | Documentation / Consultation |
| Séparation des responsabilités | ✅ Lecture seule |
| Validation humaine | ✅ Pas d’action |
| Skill ou commande | ⚠️ Usage très étroit, pourrait être une commande |
| Alignement risque | ✅ Faible |

### Écarts identifiés

**Écart critique** : L’issue #267 liste comme activité fréquente “faire une pr avec le code développer” (préparer/créer une PR). Or `my-pull-requests` ne fait que **lister** les PR existantes. Il n’existe aucun skill ni commande pour **créer** ou **préparer** une PR.

**Recommandation** : Créer un nouveau skill (ou étendre `my-pull-requests`) dédié à la préparation et création de PR, capable de :
- Lire le diff, le plan initial et les résultats de tests
- Générer un résumé factuel des changements
- Créer la PR sur le tracker avec titre, corps et labels

---

## Synthèse des écarts

| Skill | Alignement | Écart | Priorité |
|---|---|---|---|
| `plan-depuis-issue` | ✅ Bon | Aucun | — |
| `ecrire-plan-fichier` | ⚠️ Partiel | Opération mécanique → commande plutôt que skill | Faible |
| `implementer-depuis-plan` | ✅ Bon | Aucun | — |
| `to-issues` | ✅ Bon | Langue anglaise (mineur) | Très faible |
| `my-pull-requests` | ❌ Décalé | Liste les PR mais ne permet pas d’en créer | **Élevée** |

## Recommandations générales

1. **Créer un skill “préparer/créer une PR”** pour couvrir l’usage manquant le plus critique.
2. **Évaluer `ecrire-plan-fichier` comme future commande OpenCode** plutôt que skill, dans un ticket d’alignement des commandes.
3. **Ne pas créer de skills pour les activités mécaniques** (lint, tests automatisés, exploration simple) — privilégier des commandes ou scripts.
4. **Maintenir la séparation des rôles** dans les nouveaux skills : ne pas mélanger planification, implémentation et review dans le même skill.
5. **Documenter l’exigence de langue française** pour les skills destinés à produire du contenu destiné au projet.
