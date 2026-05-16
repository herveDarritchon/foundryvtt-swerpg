# Spécification — Commande OpenCode d'exploration en lecture seule

**Issue** : [#268 — OpenCode - Cadrer un workflow d'exploration en lecture seule de bout en bout](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/268)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 18)

---

## 1. Objectif

Cette spécification décrit la future commande OpenCode d'exploration en lecture seule. Elle formalise le contrat d'entrée, le contrat d'exécution, le contrat de sortie et la matrice d'escalade, sans présumer de l'emplacement exact de stockage des commandes dans le dépôt (`.opencode/`, `docs/agents/`, ou autre — à définir dans un ticket d'alignement technique).

---

## 2. Contrat d'entrée

### 2.1. Types de demandes éligibles

La commande est déclenchée pour les intentions suivantes :

- **Comprendre** : « Où est définie la fonction X ? », « Comment fonctionne le flux Y ? »
- **Trouver** : « Quel fichier contient la config des armes ? », « Où est la clé i18n pour Z ? »
- **Cartographier** : « Quels sont les fichiers du module d'import OggDude ? », « Quelle est la structure du dossier `module/models/` ? »
- **Vérifier** : « Est-ce que la règle X est appliquée dans le code ? », « Y a-t-il un test pour Y ? »
- **Préparer** : « Avant de planifier, j'aimerais comprendre comment sont organisés les talents. »

### 2.2. Types de demandes exclues

La commande refuse ou redirige les demandes suivantes :

- **Planifier** : « Fais un plan pour implémenter X » → escalade vers `plan-depuis-issue`
- **Implémenter** : « Ajoute la fonction X dans le fichier Y » → escalade vers `implementer-depuis-plan`
- **Corriger** : « Corrige le bug dans Z » → escalade vers diagnostic / correction
- **Revue** : « Relis ce diff » → escalade vers revue de code
- **Écrire** : « Ajoute cette section dans la doc » → escalade vers documentation

### 2.3. Variantes de profondeur

| Profondeur | Usage typique | Sortie attendue |
|---|---|---|
| `explore --quick` | Question ponctuelle (une convention, un fichier) | 1-3 phrases + référence fichier:ligne |
| `explore` (moyen, défaut) | Cartographie d'un module, compréhension d'un flux | 3-8 constats + fichier:ligne + résumé |
| `explore --deep` | Architecture transverse, dépendances, historique | Synthèse structurée avec sections |

---

## 3. Contrat d'exécution

### 3.1. Sous-agent

La commande utilise exclusivement le sous-agent `explore`. Aucun autre type d'agent (general, planification, implémentation) n'est autorisé dans ce workflow.

### 3.2. Outils autorisés

- Recherche de fichiers (glob)
- Recherche textuelle (grep, regex)
- Lecture de fichiers (read, avec offset/limit)
- Consultation web (fetch, search) — seulement si explicitement utile à la demande

### 3.3. Interdits

- Édition ou écriture de fichiers (write, edit)
- Création ou suppression de fichiers ou dossiers
- Exécution de tests non nécessaires à l'exploration
- Commandes Git modifiant l'état du dépôt (commit, push, branch, merge, rebase)
- Commandes destructrices (rm, mv, chmod, etc.)
- Skills de planification ou d'implémentation (plan-depuis-issue, implementer-depuis-plan)
- Écriture de documentation

### 3.4. Modèle cible

Modèle économique ou local. Pas de modèle de raisonnement avancé pour la simple exploration.

---

## 4. Contrat de sortie

### 4.1. Format minimal

```markdown
## Résumé

<2-3 phrases décrivant la demande comprise et le périmètre exploré>

## Constats

- **Constat 1** : description courte — `fichier.mjs:42`
- **Constat 2** : description courte — `fichier.mjs:85-92`
- ...

## Points non résolus

- <question ouverte s'il y en a>

## Suite recommandée

- <planification | implémentation | revue | documentation | fin>
```

### 4.2. Règles de sobriété

- Pas de logs bruts ou de sorties de commande non filtrées.
- Pas de citations massives de code (max 5 lignes par citation, sauf nécessité justifiée).
- Pas de plan d'implémentation déguisé en synthèse.
- Pas d'action non demandée (exemple : ne pas commencer à implémenter sous prétexte d'exploration).
- Si la demande dépasse le périmètre d'exploration, le signaler dans « Suite recommandée » sans franchir la frontière.

---

## 5. Matrice d'escalade

| Condition d'escalade | Destination | Condition de déclenchement |
|---|---|---|
| La demande nécessite un plan d'implémentation | `plan-depuis-issue` | L'utilisateur demande explicitement une stratégie d'intervention |
| La demande nécessite du code | `implementer-depuis-plan` | L'utilisateur demande une modification du code source |
| La demande nécessite un diagnostic de bug | Diagnostic / Correction | L'utilisateur signale un comportement inattendu ou une erreur |
| La demande nécessite une revue de diff | Revue de code | L'utilisateur fournit un diff ou une PR à relire |
| La demande nécessite une mise à jour de documentation | Documentation | L'utilisateur demande d'écrire ou de modifier un fichier `.md` |
| Aucune des conditions ci-dessus | Fin | L'exploration a répondu à la question |

L'escalade n'est jamais automatique. Le workflow signale la recommandation et attend une instruction explicite.

---

## 6. Emplacement futur

La commande sera matérialisée dans l'emplacement défini par le futur ticket d'alignement des commandes OpenCode. Les candidats possibles sont :

- `.opencode/commands/explore.mjs` (si le dépôt adopte `.opencode/`)
- `docs/agents/explore-command.md` (si le dépôt privilégie une approche documentaire)
- tout autre emplacement validé par la configuration OpenCode projet

Cette spécification sert de source de vérité fonctionnelle, indépendante de l'emplacement technique final.

## Token budget policy

Do not send large context to an LLM unless reasoning is required.

For deterministic tasks:
- execute with shell, Git, npm, Vitest, Playwright or CI;
- collect only the useful output;
- call an LLM only if interpretation, decision or correction is needed.

For failures:
- send only the failing command;
- send only the relevant error block;
- send only the files directly involved;
- ask for the smallest correction.
