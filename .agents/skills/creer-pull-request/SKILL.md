---
name: creer-pull-request
description: >
  Prépare ou crée une pull request GitHub vers `develop` à partir de la branche
  courante en vérifiant l'état Git, les commits inclus, le remote, et en
  rédigeant un titre et un corps de PR cohérents avec le repository. Utilise ce
  skill dès que l'utilisateur demande d'ouvrir une PR, préparer une PR, pousser
  une branche pour créer une PR, rédiger une description de PR, ou comparer la
  branche courante à `develop`, même s'il ne mentionne pas explicitement le mot
  “skill”. Déclenche-toi aussi sur des formulations comme “ouvre la PR”,
  “prépare une PR vers develop”, “publie ma branche et crée la PR”, ou
  “rédige la PR pour ce ticket”.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  scope: préparation et création de PR GitHub vers develop, synthèse de commits, vérification remote, rédaction du titre et du corps
---

# Créer une pull request

Utilise ce skill pour préparer ou créer une pull request GitHub vers `develop` depuis la branche courante.

Ce skill couvre l'analyse Git, le push éventuel de la branche, puis la création de la PR. Il ne couvre ni l'implémentation du ticket, ni le merge final.

## 1. Mission

Le but est de produire une PR propre, reviewable, et fidèle à l'ensemble des commits de la branche.

Le skill doit :

1. vérifier l'état Git local et distant de la branche courante ;
2. comparer la branche à `develop` ;
3. analyser tous les commits inclus dans la PR, pas seulement le dernier ;
4. rédiger un titre et un corps de PR utiles pour la review ;
5. pousser la branche si nécessaire ;
6. créer la PR vers `develop` avec `gh pr create` ;
7. répondre avec l'URL de la PR, ou avec le blocage exact si la PR ne peut pas être créée.

## 2. Règles absolues

1. Utilise `gh` pour les opérations GitHub liées aux PR.
2. Utilise `develop` comme branche de base par défaut.
3. N'ouvre pas de PR vide : s'il n'y a aucun commit ou aucune différence utile par rapport à `develop`, arrête-toi.
4. N'invente pas le contenu de la PR sans avoir analysé les commits et le diff `develop...HEAD`.
5. Ne fais jamais de `git push --force`, `git reset --hard`, `git checkout --`, `git branch -D`, ni d'autre commande destructive.
6. Ne merge pas la PR et ne change pas sa cible sans demande explicite.
7. Si la branche courante est `develop`, `main`, ou `master`, arrête-toi et explique qu'une branche de travail dédiée est attendue.
8. Si le remote n'est pas configuré correctement, explique le blocage au lieu de bricoler une configuration Git.
9. Si des changements non commités existent, ne les ajoute pas implicitement à la PR : analyse seulement ce qui est réellement porté par les commits de la branche, et signale l'état du worktree.

## 3. Quand l'utiliser

Utilise ce skill pour des demandes comme :

- "Prépare une PR vers develop"
- "Crée la pull request pour cette branche"
- "Push la branche et ouvre la PR"
- "Rédige le titre et la description de PR pour ce ticket"
- "Compare ma branche à develop et ouvre la PR si tout est prêt"

Ne l'utilise pas si la demande principale est :

- créer une branche feature ;
- faire un commit ;
- relire une PR existante ;
- lister des PR uniquement ;
- merger, fermer, ou nettoyer des PR.

## 4. Entrées attendues

Le skill peut recevoir :

- une demande de PR explicite ;
- un numéro d'issue ou un lien GitHub à référencer ;
- une consigne sur le titre ou le ton de la PR ;
- l'ordre de pousser la branche avant création.

Si l'utilisateur ne précise rien, la base est `develop`.

## 5. Workflow

### Étape 1 : Inspecter l'état Git minimal

Avant toute création de PR, vérifier :

- la branche courante ;
- l'état du worktree ;
- le tracking remote de la branche ;
- l'existence de `develop` localement ou sur le remote ;
- les commits présents sur la branche depuis sa divergence avec `develop`.

Si la branche ne suit aucun remote, le skill peut la pousser avec `-u` si la création de PR le nécessite.

### Étape 2 : Analyser le contenu réel de la PR

Lire et résumer :

- `git log develop..HEAD` pour les commits ;
- `git diff develop...HEAD` pour le contenu global ;
- l'état des changements non commités, afin de signaler ce qui ne sera pas inclus.

La synthèse doit refléter le pourquoi et les effets métier ou techniques du travail, pas seulement une liste brute de fichiers.

### Étape 3 : Vérifier si la PR est légitime

Arrêter le workflow si l'un des cas suivants est vrai :

- aucun commit n'existe sur la branche par rapport à `develop` ;
- la branche courante ne correspond pas à une branche de travail ;
- une PR ouverte existe déjà pour la même branche et la même cible ;
- le remote ou les permissions empêchent la création.

Quand une PR existe déjà, réponds avec son URL au lieu d'en créer une seconde.

### Étape 4 : Préparer le titre et le corps de PR

Construis un titre concis, cohérent avec le style du repo et le scope réel.

Par défaut, préfère un titre de la forme :

```text
<type>: <résumé concis>
```

Quand le contexte le permet, tu peux utiliser un titre plus structuré inspiré des conventions du repo, par exemple :

```text
docs: formalize OpenCode PR workflow
feat: add importer diagnostics mapping
fix: prevent duplicate actor effect projection
```

Le corps de PR doit inclure, si l'information existe :

- une section `## Summary` avec 1 à 3 puces ;
- une référence d'issue, par exemple `Closes #270` ;
- les validations exécutées ou, si elles manquent, la mention explicite qu'elles restent à faire ;
- le chemin du plan d'implémentation si un plan est présent dans le contexte de la branche.

Évite les descriptions vagues ou génériques.

### Étape 5 : Pousser la branche si nécessaire

Si la branche n'est pas encore publiée et que la PR doit être créée, pousse-la avec un flux non destructif, idéalement `git push -u <remote> <branch>`.

N'utilise jamais de push forcé.

### Étape 6 : Créer la PR

Créer la PR avec `gh pr create` en visant `develop`.

Passe le corps via un heredoc ou une chaîne correctement quotée pour éviter de casser le format Markdown.

### Étape 7 : Réponse finale

Réponds brièvement avec :

- le titre de PR utilisé ;
- la base et la branche source ;
- l'URL de la PR créée, ou celle de la PR existante ;
- les validations réellement faites, si elles sont importantes pour la review.

Exemples :

- `PR créée : https://github.com/... (base : develop, source : feat/270-workflow-test-diagnostics).`
- `Une PR existe déjà pour cette branche : https://github.com/...`
- `Impossible de créer la PR : la branche courante ne contient aucun commit par rapport à develop.`

## 6. Questions légitimes à poser

Pose une question courte seulement si elle est bloquante :

- la branche de base doit être autre chose que `develop` ;
- plusieurs issues plausibles doivent être référencées ;
- le titre souhaité par l'utilisateur contredit le contenu réel de la branche ;
- le remote à utiliser n'est pas identifiable ;
- le repo n'est pas connecté à GitHub via `gh`.

Quand le choix raisonnable est évident, fais-le et indique-le dans la réponse finale.

## 7. Périmètre strict

Ce skill s'arrête une fois la PR créée, identifiée, ou bloquée avec une explication claire.

Il ne doit pas :

- implémenter ou corriger le code de la branche ;
- créer un plan ;
- réécrire l'historique Git ;
- merger la PR ;
- approuver sa propre PR ;
- modifier la configuration Git locale ou globale.

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
