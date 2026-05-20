# Plan / cadrage — Adapter la configuration OpenCode pour Claude Code sans migration

## 1. Intention

L’objectif n’est pas de remplacer OpenCode par Claude Code. L’objectif est de faire coexister les deux outils dans le même dépôt, avec une logique claire : OpenCode reste utilisable tel quel, Claude Code devient utilisable avec les mêmes conventions de travail, et les éléments déjà structurés pour OpenCode ne sont pas déplacés quand un simple problème de localisation peut être résolu par un lien symbolique.

Le principe directeur est donc : une seule source de vérité quand c’est possible, une adaptation explicite quand les formats divergent, et aucune duplication silencieuse qui créerait deux configurations à maintenir.

## 2. Constat de départ

Le dépôt contient déjà une organisation LLM structurée autour d’OpenCode, notamment un fichier `opencode.jsonc`, une documentation de cadrage LLM existante, des plans LLM, un fichier `AGENTS.md`, un fichier `skills-lock.json`, ainsi qu’un script `scripts/claude-setup.sh`. Le dépôt contient aussi un document `documentation/claude-integration.md`, ce qui indique qu’une première intention d’intégration Claude existe déjà.

Ce constat est important : le chantier ne doit pas repartir de zéro. Il doit auditer l’existant, clarifier ce qui est OpenCode-spécifique, puis exposer ou adapter ces éléments pour Claude Code.

## 3. Décision d’architecture

La configuration OpenCode reste la référence pour les éléments déjà maintenus dans l’organisation OpenCode : skills, agents, commandes, règles de travail et éventuels wrappers d’exécution.

Claude Code reçoit une couche d’exposition dans `.claude/` et à la racine du dépôt uniquement lorsque Claude Code l’exige. Cette couche peut contenir des fichiers natifs Claude Code, mais uniquement pour les éléments qui ne peuvent pas être consommés directement depuis l’organisation OpenCode.

Quand Claude Code attend un fichier ou un répertoire à un emplacement donné et que le contenu OpenCode est déjà compatible, on crée un lien symbolique depuis l’emplacement Claude Code vers la source OpenCode. Le fichier d’origine reste dans l’organisation OpenCode.

Quand Claude Code attend un format différent, on crée un fichier d’adaptation explicite, court, documenté, et idéalement générable. Ce fichier n’est pas une nouvelle source de vérité ; c’est un pont.

## 4. Périmètre fonctionnel

Le chantier couvre quatre familles d’éléments.

### 4.1. Instructions projet

Il faut faire le lien entre les instructions générales du dépôt et le système de mémoire de Claude Code. Le dépôt dispose déjà de `AGENTS.md`. Claude Code peut utiliser `CLAUDE.md` ou `.claude/CLAUDE.md` comme mémoire projet.

Deux options sont possibles. La première consiste à faire de `AGENTS.md` la source de vérité et à créer un `CLAUDE.md` synthétique qui pointe vers lui, en ajoutant uniquement les conventions Claude Code nécessaires. La seconde consiste à créer un lien symbolique si le contenu de `AGENTS.md` est directement compatible avec Claude Code. La première option est préférable si `AGENTS.md` contient des instructions pensées pour plusieurs agents ou pour OpenCode, car elle évite d’injecter trop de contexte non pertinent à chaque session Claude Code.

Décision recommandée : créer un `CLAUDE.md` court, maintenu comme pont, qui référence `AGENTS.md` et les documents LLM structurants. Ne pas symlinker automatiquement `AGENTS.md` vers `CLAUDE.md` avant audit du contenu.

### 4.2. Skills

Les skills OpenCode doivent être rendues disponibles dans Claude Code lorsque leur structure est compatible avec le format attendu par Claude Code, notamment un répertoire de skill contenant un fichier `SKILL.md`.

Si les skills OpenCode sont déjà organisées en dossiers avec un fichier `SKILL.md`, la solution cible est de créer des liens symboliques depuis `.claude/skills/<nom-skill>` vers les dossiers OpenCode existants.

Si les skills OpenCode utilisent un format différent, il faut créer une phase d’adaptation : soit produire un `SKILL.md` wrapper minimal par skill, soit générer des skills Claude Code à partir des fichiers OpenCode. Dans ce cas, le contenu OpenCode reste la référence et les wrappers Claude Code sont considérés comme des artefacts d’exposition.

Décision recommandée : symlink lorsque la structure est compatible ; wrapper/génération lorsque la structure diverge.

### 4.3. Agents

Claude Code supporte des subagents de projet dans `.claude/agents/`, sous forme de fichiers Markdown avec frontmatter YAML. Si les agents OpenCode sont déjà des fichiers Markdown compatibles, ils peuvent être exposés par symlink.

Si les agents OpenCode ont une structure propre à OpenCode, il faut créer des fichiers `.claude/agents/*.md` d’adaptation, un par agent réellement utile dans Claude Code. Il ne faut pas convertir mécaniquement tous les agents si certains reposent sur des capacités OpenCode absentes ou différentes dans Claude Code.

Décision recommandée : commencer par 2 ou 3 agents à forte valeur, vérifier le comportement réel, puis élargir. Ne pas faire une conversion massive sans validation.

### 4.4. Commandes

Claude Code a fusionné les custom commands avec les skills : une commande peut être exposée via `.claude/commands/*.md` ou via `.claude/skills/<skill>/SKILL.md`.

Les commandes OpenCode doivent donc être classées en deux catégories : les commandes qui sont en réalité des procédures de travail réutilisables, à exposer comme skills ; les commandes qui sont des raccourcis ou workflows shell, à conserver comme scripts ou à exposer via des wrappers Claude Code.

Décision recommandée : privilégier les skills Claude Code pour les workflows LLM, et réserver les commandes aux usages historiques ou aux raccourcis simples.

### 4.5. Serveurs MCP

Les serveurs MCP doivent être disponibles dans les deux outils, mais leur configuration ne doit pas être dupliquée sans contrôle.

Pour Claude Code, la configuration projet partagée se fait via `.mcp.json` à la racine du dépôt. Si OpenCode utilise déjà une configuration MCP compatible JSON, deux options existent : créer un lien symbolique si le format est identique, ou créer un fichier `.mcp.json` d’adaptation si les schémas divergent.

Décision recommandée : ne pas symlinker la configuration MCP tant que le schéma OpenCode n’a pas été comparé au schéma Claude Code. Les MCP transportent souvent des chemins locaux, variables d’environnement ou secrets ; une duplication imprudente peut casser l’outil ou exposer une configuration non portable.

## 5. Organisation cible proposée

La cible minimale peut être la suivante :

```text
.
├── AGENTS.md                         # Source existante d’instructions agents
├── CLAUDE.md                         # Pont court pour Claude Code
├── opencode.jsonc                    # Configuration OpenCode inchangée
├── .mcp.json                         # Configuration MCP Claude Code si schéma compatible ou adaptée
├── .claude/
│   ├── settings.json                 # Paramètres partagés Claude Code
│   ├── agents/                       # Symlinks ou wrappers vers agents OpenCode
│   ├── skills/                       # Symlinks ou wrappers vers skills OpenCode
│   ├── commands/                     # À limiter, sauf besoin spécifique
│   └── rules/                        # Symlinks vers règles partagées si applicable
└── scripts/
    ├── claude-setup.sh               # À compléter / fiabiliser
    └── validate-llm-config.sh        # Nouveau script recommandé
```

Cette organisation garde OpenCode intact et crée une façade Claude Code explicite.

## 6. Règles de décision symlink vs adaptation

Un lien symbolique est accepté si le fichier ou répertoire source est directement consommable par Claude Code, si le contenu ne contient pas d’hypothèses OpenCode incompatibles, si le chemin relatif reste stable depuis la racine du dépôt, et si le lien fonctionne sur l’environnement cible principal du projet.

Un fichier d’adaptation est requis si le format attendu diverge, si le contenu contient des instructions spécifiques OpenCode, si le fichier contient des variables locales ou sensibles, ou si Claude Code impose une structure différente.

Une duplication complète est à éviter. Elle n’est acceptable que temporairement, avec une mention explicite de dette technique et une issue de suivi.

## 7. Découpage du chantier

### Phase 1 — Audit de l’existant

Lister précisément les éléments OpenCode : configuration, skills, agents, commandes, MCP, scripts, règles, documents de doctrine. Pour chaque élément, identifier son emplacement, son format, son rôle, son niveau de généricité, et sa compatibilité potentielle avec Claude Code.

Livrable : une matrice d’inventaire `documentation/plan/llm/audit-opencode-claude-code.md`.

### Phase 2 — Définition de la cible Claude Code minimale

Créer ou mettre à jour la structure `.claude/`. Définir `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`, `.claude/agents/`, `.claude/rules/` et `.mcp.json` selon les besoins réellement identifiés.

Livrable : un plan d’arborescence cible et les règles de nommage.

### Phase 3 — Exposition des skills

Pour chaque skill OpenCode, décider entre symlink, wrapper ou exclusion temporaire. Les skills compatibles sont exposées dans `.claude/skills/`. Les skills non compatibles sont adaptées par wrappers courts ou reportées.

Critère de sortie : au moins un skill OpenCode important est invocable dans Claude Code sans déplacer la source OpenCode.

### Phase 4 — Exposition des agents

Identifier les agents utiles pour Claude Code. Les agents compatibles sont exposés dans `.claude/agents/`. Les agents nécessitant une conversion sont réécrits au format Claude Code, en gardant un lien clair vers la source OpenCode.

Critère de sortie : au moins un agent de planification et un agent de diagnostic sont disponibles dans Claude Code.

### Phase 5 — Exposition ou adaptation des commandes

Classer les commandes OpenCode. Les commandes-procédures deviennent des skills Claude Code. Les commandes shell restent des scripts. Les commandes purement OpenCode ne sont pas exposées si elles ne fonctionnent pas dans Claude Code.

Critère de sortie : les workflows fréquents — exploration readonly, planification readonly, diagnostic de tests — sont accessibles dans Claude Code.

### Phase 6 — MCP

Comparer la configuration MCP OpenCode avec le format Claude Code. Créer `.mcp.json` uniquement si le schéma est validé. Utiliser des variables d’environnement pour les chemins ou secrets. Ne pas committer de secret.

Critère de sortie : `claude mcp list` voit les serveurs attendus et `/mcp` confirme leur état.

### Phase 7 — Script d’installation et validation

Compléter `scripts/claude-setup.sh` pour créer les répertoires nécessaires, poser les liens symboliques, vérifier les liens cassés et afficher les actions réalisées.

Ajouter un script `scripts/validate-llm-config.sh` qui vérifie : existence de `opencode.jsonc`, existence de `CLAUDE.md`, validité JSON de `.claude/settings.json`, validité JSON de `.mcp.json` si présent, absence de symlinks cassés, présence des skills/agents attendus.

Critère de sortie : un développeur peut cloner le dépôt, exécuter le setup, puis utiliser OpenCode et Claude Code sans déplacer les fichiers existants.

## 8. Points d’attention

Le risque principal est de créer deux systèmes de configuration divergents. Le second risque est de surexposer à Claude Code des instructions OpenCode non adaptées, ce qui pourrait dégrader le comportement de Claude Code. Le troisième risque est la gestion des secrets dans les serveurs MCP.

Il faut aussi éviter de transformer ce chantier en refonte générale de l’outillage LLM. Le périmètre doit rester une compatibilité Claude Code, pas une réorganisation complète de l’écosystème agentique.

## 9. Critères d’acceptation

OpenCode continue de fonctionner avec son organisation actuelle.

Claude Code dispose d’un `CLAUDE.md` exploitable, d’un `.claude/settings.json` minimal, et d’une structure `.claude/` cohérente.

Les skills OpenCode compatibles sont disponibles dans Claude Code sans déplacement des fichiers sources.

Les agents OpenCode compatibles sont disponibles dans Claude Code sans déplacement des fichiers sources.

Les commandes utiles sont disponibles dans Claude Code sous forme de skills, commandes ou scripts selon leur nature.

Les serveurs MCP nécessaires sont disponibles dans Claude Code via `.mcp.json` ou configuration locale, sans secret committé.

Un script de setup crée ou vérifie les liens symboliques.

Un script de validation détecte les liens cassés, fichiers manquants et erreurs JSON.

La documentation explique clairement ce qui est source de vérité, ce qui est symlink, et ce qui est adaptation.

## 10. Proposition de sous-issues

### Issue 1 — Auditer la configuration OpenCode existante

Objectif : produire une cartographie des skills, agents, commandes, MCP et scripts existants, avec leur compatibilité Claude Code estimée.

### Issue 2 — Créer la structure Claude Code minimale du dépôt

Objectif : ajouter `CLAUDE.md`, `.claude/settings.json`, les répertoires `.claude/skills`, `.claude/agents`, `.claude/rules`, et documenter leur rôle.

### Issue 3 — Exposer les skills OpenCode compatibles dans Claude Code

Objectif : créer les symlinks ou wrappers nécessaires pour rendre les skills OpenCode utilisables dans Claude Code.

### Issue 4 — Exposer les agents OpenCode compatibles dans Claude Code

Objectif : rendre disponibles les agents prioritaires dans `.claude/agents/`, avec adaptation si nécessaire.

### Issue 5 — Adapter les commandes OpenCode utiles à Claude Code

Objectif : transformer les workflows fréquents en skills ou commandes Claude Code, sans dupliquer inutilement les sources.

### Issue 6 — Rendre les MCP disponibles dans Claude Code

Objectif : créer ou adapter `.mcp.json`, vérifier les transports, variables d’environnement et règles de sécurité.

### Issue 7 — Fiabiliser le setup et la validation

Objectif : compléter `scripts/claude-setup.sh` et ajouter un script de validation pour rendre le dispositif reproductible.

## 11. Hors périmètre

Ce chantier ne remplace pas OpenCode. Il ne refond pas la stratégie globale d’orchestration multi-agent. Il ne choisit pas les modèles LLM à utiliser. Il ne modifie pas les workflows métier du projet SWERPG. Il ne migre pas les documents de cadrage existants sauf s’ils doivent être référencés depuis Claude Code.

## 12. Slug proposé

`cadrage-adaptation-opencode-claude-code`

