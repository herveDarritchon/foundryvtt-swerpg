---
name: plan-depuis-issue
description: >
  Génère un plan d'implémentation technique à partir d'une issue GitHub ou
  d'un cadrage, puis le matérialise directement dans un fichier Markdown sous
  `documentation/plan/<business-domain-path>/`. À utiliser quand l'utilisateur
  demande de créer un plan, une spec technique, ou un découpage pour une issue
  ou une user story. Le skill produit un artefact versionnable : un fichier de
  plan Markdown classé dans une arborescence métier. Il ne doit jamais
  implémenter le code ou lancer les tests.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v14+, JavaScript ES2022, ApplicationV2, TypeDataModel, Handlebars, Vitest
  scope: planification technique, découpage, analyse d'issue, rédaction et matérialisation de plan sous documentation/plan/<business-domain-path>
---

# Plan depuis une issue GitHub

Utilise ce skill quand l'utilisateur demande de créer un plan d'implémentation à partir d'une issue GitHub, d'une URL d'issue, d'un numéro d'issue, ou d'un cadrage.

> Langue : produis le plan en français sauf demande explicite contraire.

## 1. Mission

Produire un plan d'implémentation court, actionnable, puis l'écrire directement comme fichier Markdown dans une arborescence métier sous `documentation/plan/`.

Le résultat attendu n'est pas seulement un message : c'est un artefact versionnable dans le dépôt.

Le skill doit :

1. comprendre l'issue ou le cadrage ;
2. lire uniquement le contexte projet nécessaire ;
3. identifier le domaine métier concerné ;
4. choisir un `business-domain-path` stable, potentiellement multi-niveaux ;
5. rédiger un plan exploitable ;
6. déterminer un chemin cible stable sous `documentation/plan/<business-domain-path>/` ;
7. vérifier les collisions ;
8. créer le fichier Markdown ;
9. répondre avec le chemin exact créé.

## 2. Règles absolues

1. Ne jamais écrire une ligne de code d'implémentation.
2. Ne jamais modifier le code source.
3. Ne jamais modifier les issues GitHub.
4. Ne jamais lancer de tests.
5. Ne jamais créer de branche, commit ni PR.
6. Ne pas élargir le périmètre de l'issue.
7. Lire `documentation/plan/` pour respecter le format, identifier les chemins métier existants et éviter les collisions.
8. Lire les ADRs pertinentes dans `documentation/architecture/adr/` seulement si le périmètre de l'issue le justifie.
9. Ne jamais écrire directement sous `documentation/plan/`.
10. Écrire uniquement sous `documentation/plan/<business-domain-path>/`.
11. Ne jamais écraser silencieusement un fichier existant.
12. Si le fichier cible existe, arrêter et retourner : `BLOCKED: target plan file already exists: <path>`.
13. Si le chemin métier est ambigu, arrêter et retourner : `BLOCKED: ambiguous business-domain path for plan directory.`
14. Si l'issue ou le cadrage est insuffisant pour produire un plan fiable, arrêter et retourner les ambiguïtés au lieu d'inventer.

## 3. Processus

### 3.1. Comprendre l'entrée

À partir de `$ARGUMENTS`, identifie :

- l'URL ou le numéro d'issue ;
- le titre de l'issue si disponible ;
- le type de demande : bug, feature, refactor, US, dette technique ;
- le périmètre fonctionnel et métier ;
- les critères d'acceptation ;
- les dépendances éventuelles.

Si l'entrée est une URL GitHub mais que les outils web/bash sont indisponibles, utilise uniquement le texte visible dans l'entrée. Si le contenu de l'issue n'est pas accessible et que le titre ne suffit pas, bloque avec une question courte.

### 3.2. Lire le contexte minimal

Lis uniquement :

- `documentation/plan/` pour le format, les collisions et les chemins métier existants ;
- les fichiers explicitement mentionnés par l'issue ou le cadrage ;
- les ADRs directement liées au périmètre ;
- les tests existants seulement s'ils sont nécessaires pour définir les validations attendues.

Ne scanne pas tout le dépôt.

### 3.3. Déterminer le chemin métier

Le plan doit être écrit sous :

```text
documentation/plan/<business-domain-path>/<issue-number>-<kebab-case-slug>.md
```

`<business-domain-path>` est une série d'un ou plusieurs sous-répertoires en kebab-case.

#### Règles de choix du `business-domain-path`

- Le plan ne doit jamais être écrit directement sous `documentation/plan/`.
- Le chemin doit représenter le domaine fonctionnel ou métier de l'issue, pas seulement un fichier technique touché.
- Préfère un chemin existant sous `documentation/plan/` quand il correspond clairement au domaine.
- Si un parent existant correspond, réutilise-le et ajoute uniquement le sous-répertoire manquant.
- Crée de nouveaux sous-répertoires seulement si le domaine est clair.
- Ne crée pas plus de 3 niveaux métier sauf si une structure plus profonde existe déjà pour ce domaine.
- N'utilise jamais de dossiers fourre-tout : `misc`, `other`, `general`, `technical`, `todo`.
- Si plusieurs chemins sont plausibles sans règle claire pour trancher, bloque.

#### Niveaux recommandés

- Niveau 1 : grande zone fonctionnelle ou applicative.
- Niveau 2 : module fonctionnel ou famille de fonctionnalité.
- Niveau 3 : sous-fonctionnalité ou workflow spécifique, seulement si cela aide vraiment à retrouver les plans.

#### Mapping indicatif

Ce mapping guide le choix du chemin. Il ne remplace pas l'observation de la structure existante.

- character sheet, actor sheet → `character-sheet`
- vue talents de la character sheet, talents consolidés → `character-sheet/talent`
- arbres de spécialisation affichés depuis la character sheet → `character-sheet/talent/specialization-tree`
- modèle métier des talents, définitions, achats de talents → `talents`
- modèle ou resolver des arbres de spécialisation hors UI sheet → `talents/specialization-tree`
- importers, OggDude → `importers/oggdude`
- compendiums, PackFolders, référentiels importés → `importers/compendiums`
- dés narratifs, mécanique de jet → `narrative-dice`
- construction de dice pool → `narrative-dice/dice-pool`
- active effects, effect engine, conditions → `active-effects`
- bridge Foundry Active Effects → `active-effects/foundry-bridge`
- logs, diagnostics, audit logs → `logging`
- hooks d'audit log → `logging/audit-log`
- UI framework, ApplicationV2, infrastructure sheet partagée → `ui/application-v2`
- tests, CI, validation tooling → `testing`
- architecture, ADR, frontières techniques → `architecture`

#### Exemples valides

```text
documentation/plan/character-sheet/talent/282-vue-consolidee-resoudre-identifiant-metier.md
documentation/plan/character-sheet/talent/specialization-tree/233-afficher-arbre-specialisation.md
documentation/plan/importers/oggdude/300-import-armors.md
documentation/plan/narrative-dice/dice-pool/310-refactor-pool-builder.md
documentation/plan/active-effects/foundry-bridge/320-connecter-effect-engine-active-effects.md
documentation/plan/logging/audit-log/330-ajouter-hooks-audit.md
```

### 3.4. Déterminer le nom de fichier

Le nom de fichier doit suivre ce format :

```text
<issue-number>-<kebab-case-slug>.md
```

Si le numéro d'issue est absent :

```text
<kebab-case-slug>.md
```

Le slug doit :

- être basé sur le titre de l'issue ou du cadrage ;
- être court, lisible et significatif ;
- être en kebab-case ;
- ne pas contenir d'accents ;
- éviter la ponctuation inutile ;
- éviter de répéter le domaine déjà exprimé par le chemin.

Évite :

```text
documentation/plan/character-sheet/talent/282-character-sheet-talent-vue-consolidee-talents.md
```

Préférer :

```text
documentation/plan/character-sheet/talent/282-vue-consolidee-resoudre-identifiant-metier.md
```

### 3.5. Rédiger le plan

Le plan doit être court, actionnable.

Structure cible :

```md
# Plan d'implémentation — <Titre>

**Issue** : [#N — Titre](url)
**ADR** : `documentation/architecture/adr/adr-N-*.md` (si applicable)
**Module(s) impacté(s)** : `module/X.mjs`, `tests/X.test.mjs`

---

## 1. Objectif

## 2. Périmètre

### Inclus

### Hors scope

## 3. Constat sur l'existant

## 4. Décisions d'architecture

## 5. Plan de travail

## 6. Fichiers probablement modifiés

## 7. Tests attendus

## 8. Risques et mitigations

## 9. Critères d'arrêt
```

Ne mets pas de code d'implémentation dans le plan.

### 3.6. Vérifier les collisions

Avant d'écrire :

1. liste les fichiers existants dans le chemin cible ;
2. vérifie que le fichier cible n'existe pas ;
3. vérifie aussi les noms très proches pour éviter un doublon évident.

Si le fichier existe déjà :

```text
BLOCKED: target plan file already exists: <path>
```

Ne propose pas d'écrasement automatique.

### 3.7. Créer le fichier

Écris le plan final dans le chemin cible.

Le fichier créé est la sortie principale du skill.

### 3.8. Réponse finale

Réponds uniquement avec :

```text
Created <path>
```

ou, en cas de blocage :

```text
BLOCKED: <reason>
```

## 4. Périmètre strict

Ce skill s'arrête après la création du fichier de plan.

Il ne doit pas :

- implémenter le plan ;
- modifier du code ;
- lancer des validations ;
- créer une branche ;
- créer une PR ;
- enrichir le scope au-delà de l'issue ;
- écrire un fichier temporaire sauf demande explicite.

## 5. Politique de sobriété contexte / tokens

- Ne lis pas le dépôt entier.
- Ne lis pas tous les ADRs.
- Ne lis pas tous les tests et ne les exécutes pas.
- Ne charge un skill métier complémentaire que si le périmètre l'exige explicitement.
- Si une information manque, bloque au lieu de compenser par de longues explorations.
- Si un chemin métier existant convient, réutilise-le au lieu d'inventer une nouvelle structure.
