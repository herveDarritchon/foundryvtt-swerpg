# Spécification — Commande OpenCode de planification en lecture seule

**Issue** : [#269 — OpenCode - Cadrer un workflow de planification sans ecriture de code](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/269)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 19)
**Skill associé** : `.agents/skills/plan-depuis-issue/SKILL.md`

---

## 1. Objectif

Cette spécification décrit la future commande OpenCode de planification en lecture seule. Elle formalise le contrat d'entrée, le contrat d'exécution, le contrat de sortie et la matrice d'escalade, sans présumer de l'emplacement exact de stockage des commandes dans le dépôt (à définir dans un ticket d'alignement technique).

La commande produit un **plan d'intervention structuré** à partir d'une issue GitHub, d'une URL ou d'une demande explicite de planification, sans jamais implémenter, écrire dans le code source ni matérialiser automatiquement le plan dans le dépôt.

---

## 2. Contrat d'entrée

### 2.1. Types de demandes éligibles

La commande est déclenchée pour les intentions suivantes :

- **Planifier depuis une issue** : « Fais un plan pour l'issue #N », « Planifie cette feature »
- **Planifier depuis une URL** : « Crée un plan à partir de https://github.com/.../issues/N »
- **Découper** : « Découpe cette user story en étapes implémentables »
- **Analyser un périmètre** : « J'ai besoin d'un plan pour implémenter X »
- **Amorcer une implémentation** : « Prépare un plan pour ajouter Y »

### 2.2. Types de demandes exclues

La commande refuse ou redirige les demandes suivantes :

- **Explorer** : « Où est définie la fonction X ? » → escalade vers le workflow d'exploration `#268`
- **Implémenter** : « Ajoute la fonction X dans le fichier Y » → escalade vers `implementer-depuis-plan`
- **Corriger** : « Corrige le bug dans Z » → escalade vers diagnostic / correction
- **Écrire le plan dans le repo** : « Mets ce plan dans documentation/plan/ » → escalade vers `ecrire-plan-fichier`
- **Revue** : « Relis ce diff » → escalade vers revue de code

### 2.3. Entrées acceptées

| Type d'entrée | Format | Exemple |
|---|---|---|
| Numéro d'issue | `#N` ou `N` | `#269` |
| URL d'issue | URL GitHub complète | `https://github.com/.../issues/269` |
| Demande textuelle | Phrase libre | « Fais un plan pour ajouter le system.restrictionLevel » |
| Issue + exploration préalable | Constats d'exploration + numéro d'issue | Résultat d'exploration + `#269` |

### 2.4. Niveau de profondeur

| Profondeur | Usage typique | Périmètre du plan |
|---|---|---|
| `quick` | Issue simple, périmètre connu, peu de fichiers | Étapes + fichiers, décisions rapides |
| `standard` (défaut) | Issue standard avec analyse d'architecture | Sections complètes : objectif, périmètre, constats, décisions, étapes, risques, commits |
| `deep` | Refactor transverse, feature complexe, plusieurs ADRs | Plan détaillé avec dépendances, validation par étapes, ordre d'exécution |

---

## 3. Contrat d'exécution

### 3.1. Agent

La commande utilise un agent de type **général / planification**, avec permissions **lecture seule stricte** sur le code et le dépôt.

Le skill `.agents/skills/plan-depuis-issue/SKILL.md` est chargé pour apporter la méthode, le format canonique et les conventions projet.

### 3.2. Outils autorisés

- Recherche de fichiers (glob)
- Recherche textuelle (grep, regex)
- Lecture de fichiers (read, avec offset/limit)
- Consultation web (fetch, search) — pour lire le contenu d'une issue GitHub ou une URL
- Questions à l'utilisateur — pour valider les décisions d'architecture ambiguës

### 3.3. Interdits

- Édition ou écriture de fichiers (write, edit)
- Création ou suppression de fichiers ou dossiers
- Exécution de tests
- Commandes Git modifiant l'état du dépôt (commit, push, branch, merge, rebase)
- Commandes destructrices (rm, mv, chmod, etc.)
- Skills d'implémentation (implementer-depuis-plan)
- Skills d'écriture de plan (ecrire-plan-fichier) — sauf instruction explicite
- Écriture automatique du plan dans le dépôt
- Modification d'issues GitHub

### 3.4. Modèle cible

Modèle standard ou économique selon la complexité du plan. Un plan transverse avec décisions d'architecture justifie un modèle plus capable. Un plan simple sur un périmètre connu peut utiliser un modèle économique.

---

## 4. Contrat de sortie

### 4.1. Format minimal

```markdown
## 1. Objectif

<Pourquoi ce plan ? Quel problème résout-il ?>

## 2. Périmètre

### Inclus
- <liste>

### Exclu
- <liste>

## 3. Constat sur l'existant

<Analyse de l'état actuel du code>

## 4. Décisions d'architecture

<Chaque décision avec options, décision retenue, justification>

## 5. Plan de travail détaillé

<Étapes implémentables avec fichiers et risques>

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|

## 8. Proposition d'ordre de commit

<Messages type conventional commit>

## 9. Dépendances

<Liens avec les autres US, tickets, ADRs>
```

### 4.2. Règles de sobriété

- Pas de code d'implémentation dans le plan.
- Pas d'élargissement du périmètre au-delà de l'issue ou de la demande.
- Pas de décisions d'architecture implicites sans signalement.
- Pas de matérialisation automatique dans le dépôt.
- Pas de transition automatique vers l'implémentation.
- Si la demande dépasse le périmètre de planification, le signaler dans les dépendances sans franchir la frontière.

---

## 5. Garde-fous

### 5.1. Règles impératives

1. **Pas de code** — Aucune ligne de code d'implémentation, même partielle ou commentée.
2. **Pas de doc écrite automatiquement** — Le plan est livré comme message, pas comme fichier dans le repo.
3. **Pas de mise à jour d'issue** — Le plan ne modifie pas GitHub.
4. **Pas d'élargissement du scope** — Le plan reflète l'issue et les arbitrages utilisateur.
5. **Pas de choix d'architecture implicite** — Toute décision d'architecture doit être signalée, justifiée, et si nécessaire validée avant finalisation.
6. **Pas de passage direct à l'implémentation** — Même si la solution est évidente, le workflow s'arrête au plan validé.

### 5.2. Cas nécessitant une question à l'utilisateur

Le workflow doit poser une question à l'utilisateur dans les cas suivants :

- L'issue est ambiguë ou manque de critères d'acceptation clairs.
- Plusieurs options d'architecture sont également valables et le plan ne peut pas trancher seul.
- Le périmètre réel de l'issue semble plus large ou plus étroit que ce que l'utilisateur a décrit.
- Une dépendance externe (issue liée, ADR, PR) semble contredire le plan ou le bloquer.
- Une décision d'architecture a un impact transverse non documenté.

---

## 6. Matrice d'escalade

| Condition d'escalade | Destination | Déclenchement |
|---|---|---|
| La demande nécessite une exploration préalable | Workflow d'exploration `#268` | L'utilisateur demande à comprendre avant de planifier |
| La demande nécessite une implémentation | `implementer-depuis-plan` | L'utilisateur demande du code après le plan |
| La demande nécessite une écriture de plan dans le repo | `ecrire-plan-fichier` | L'utilisateur demande de matérialiser le plan |
| La demande nécessite une correction de bug | Diagnostic / Correction | L'utilisateur signale un comportement inattendu |
| La demande nécessite une revue de diff | Revue de code | L'utilisateur fournit un diff ou une PR à relire |
| Aucune des conditions ci-dessus | Fin | Le plan a répondu au besoin et est validé |

L'escalade n'est jamais automatique. Le workflow signale la recommandation et attend une instruction explicite.

---

## 7. Articulation avec les workflows voisins

```
Exploration (#268) → Planification → Écriture du plan (ecrire-plan-fichier) → Implémentation (implementer-depuis-plan)
```

- L'exploration livre des constats. Si elle détecte un besoin de plan, elle oriente vers cette commande.
- La planification livre un plan validé. L'écriture dans le dépôt et l'implémentation sont des étapes séparées.
- Chaque transition est explicite et nécessite une instruction utilisateur.

---

## 8. Emplacement futur

La commande sera matérialisée dans l'emplacement défini par le futur ticket d'alignement des commandes OpenCode. Les candidats possibles sont :

- `.opencode/commands/plan.mjs` (si le dépôt adopte `.opencode/`)
- `docs/agents/plan-command.md` (si le dépôt privilégie une approche documentaire)
- tout autre emplacement validé par la configuration OpenCode projet

Cette spécification sert de source de vérité fonctionnelle, indépendante de l'emplacement technique final.
