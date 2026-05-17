---
name: creer-pull-request
description: >
  Prépare ou crée une pull request GitHub vers `develop` à partir de la branche
  courante, après avoir créé si nécessaire un commit Conventional Commits /
  semantic-release avec le contenu modifié de la branche de travail. Vérifie
  l'état Git, refuse `develop`, `main` et `master`, analyse les commits inclus,
  le remote, puis rédige un titre et un corps de PR cohérents avec le repository.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  scope: commit semantic-release préalable, préparation et création de PR GitHub vers develop, synthèse de commits, vérification remote, rédaction du titre et du corps
---

# Créer une pull request

Utilise ce skill pour préparer ou créer une pull request GitHub vers `develop` depuis la branche courante.

Ce skill couvre :

1. la vérification stricte de la branche courante ;
2. la création préalable d'un commit Conventional Commits compatible semantic-release si le worktree contient des modifications ;
3. l'analyse Git de la branche ;
4. le push éventuel de la branche ;
5. la création de la PR avec `gh pr create`.

Il ne couvre ni l'implémentation du ticket, ni la correction de tests, ni le merge final.

## 1. Mission

Le but est de produire une PR propre, reviewable, et fidèle au contenu réellement modifié sur la branche de travail.

Le skill doit :

1. vérifier que la branche courante n'est pas `develop`, `main` ou `master` ;
2. vérifier l'état Git local et distant de la branche courante ;
3. si des modifications non commités existent, créer d'abord un commit Conventional Commits compatible semantic-release ;
4. comparer la branche à `develop` ;
5. analyser tous les commits inclus dans la PR, pas seulement le dernier ;
6. rédiger un titre et un corps de PR utiles pour la review ;
7. pousser la branche si nécessaire ;
8. créer la PR vers `develop` avec `gh pr create` ;
9. répondre avec l'URL de la PR, ou avec le blocage exact si la PR ne peut pas être créée.

## 2. Règles absolues

1. Utilise `gh` pour les opérations GitHub liées aux PR.
2. Utilise `develop` comme branche de base par défaut.
3. N'ouvre pas de PR vide : s'il n'y a aucun commit ou aucune différence utile par rapport à `develop`, arrête-toi.
4. Avant tout commit ou PR, vérifie que la branche courante n'est pas `develop`, `main` ou `master`.
5. Si la branche courante est `develop`, `main`, ou `master`, arrête-toi et explique qu'une branche de travail dédiée est attendue.
6. Si des changements non commités existent sur une branche de travail, crée un commit avant la PR.
7. Le commit préalable doit respecter Conventional Commits / semantic-release, par exemple `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `refactor: ...`, `chore: ...`.
8. Ne fais jamais de `git push --force`, `git reset --hard`, `git checkout --`, `git branch -D`, ni d'autre commande destructive.
9. Ne merge pas la PR et ne change pas sa cible sans demande explicite.
10. Si le remote n'est pas configuré correctement, explique le blocage au lieu de bricoler une configuration Git.
11. N'invente pas le contenu de la PR sans avoir analysé les commits et le diff `develop...HEAD`.
12. Ne prétends jamais qu'un test, lint, build ou validation a été exécuté si ce n'est pas prouvé.

## 3. Politique de commit préalable

### Quand committer

Avant de créer ou préparer la PR :

1. exécute `git branch --show-current` ;
2. refuse immédiatement si la branche est `develop`, `main` ou `master` ;
3. exécute `git status --short` ;
4. si le worktree est propre, ne crée pas de commit inutile ;
5. si le worktree contient des modifications, prépare un commit avec le contenu modifié ;
6. après le commit, relis `git status --short` pour vérifier que le worktree est propre ou signaler ce qui reste volontairement non inclus.

### Contenu du commit

Le commit doit porter le contenu modifié de la branche de travail.

Par défaut, il peut inclure les fichiers modifiés, ajoutés, supprimés et non suivis visibles dans `git status --short`, sauf si un fichier semble manifestement hors scope, temporaire, secret, généré ou à ignorer.

Ne committe pas :

- fichiers `.env` ou secrets ;
- logs temporaires ;
- fichiers de cache ;
- dossiers de dépendances ;
- artefacts manifestement générés non attendus ;
- fichiers hors scope évident.

En cas de doute bloquant sur un fichier sensible ou hors scope, arrête-toi et signale le blocage.

### Format du message

Utilise un message compatible semantic-release :

```text
<type>(<scope optionnel>): <résumé impératif ou descriptif court>
```

Types recommandés :

- `feat` pour une fonctionnalité ;
- `fix` pour une correction ;
- `docs` pour de la documentation seule ;
- `test` pour des tests seuls ;
- `refactor` pour un refactor sans changement fonctionnel ;
- `chore` pour de la maintenance ;
- `build` pour build/package/outillage ;
- `ci` pour GitHub Actions ou CI.

Inférence conseillée :

- branche `feat/...` -> `feat`;
- branche `fix/...` -> `fix`;
- branche `docs/...` ou modifications uniquement documentaires -> `docs`;
- modifications uniquement sous `tests/` -> `test`;
- modifications CI -> `ci`;
- modifications outillage/build -> `build`;
- sinon `chore` si aucun type plus précis n'est justifié.

Le résumé doit être factuel et dérivé du diff, jamais marketing.

Exemples :

```text
docs: document create-pr semantic commit workflow
fix(talents): resolve known talents by business identifier
feat(talents): add consolidated known talent resolution
chore(opencode): tighten pull request command safeguards
```

## 4. Quand l'utiliser

Utilise ce skill pour des demandes comme :

- "Prépare une PR vers develop"
- "Crée la pull request pour cette branche"
- "Push la branche et ouvre la PR"
- "Rédige le titre et la description de PR pour ce ticket"
- "Compare ma branche à develop et ouvre la PR si tout est prêt"

Ne l'utilise pas si la demande principale est :

- créer une branche feature ;
- implémenter du code ;
- corriger des tests ;
- relire une PR existante ;
- lister des PR uniquement ;
- merger, fermer, ou nettoyer des PR.

## 5. Entrées attendues

Le skill peut recevoir :

- une demande de PR explicite ;
- un numéro d'issue ou un lien GitHub à référencer ;
- une consigne sur le titre ou le ton de la PR ;
- l'ordre de pousser la branche avant création.

Si l'utilisateur ne précise rien, la base est `develop`.

## 6. Workflow

### Étape 1 : Inspecter l'état Git minimal

Avant toute création de PR, vérifier :

- la branche courante ;
- l'état du worktree ;
- le tracking remote de la branche ;
- l'existence de `develop` localement ou sur le remote ;
- les commits présents sur la branche depuis sa divergence avec `develop`.

Commandes utiles :

```bash
git branch --show-current
git status --short
git status --branch --short
git log --oneline develop..HEAD
git diff --stat develop...HEAD
```

Si `develop` local n'existe pas, utiliser la référence remote pertinente, par exemple `origin/develop`, sans modifier la configuration Git.

### Étape 2 : Créer le commit préalable si nécessaire

Si `git status --short` montre des modifications :

1. vérifier une seconde fois que la branche n'est pas protégée ;
2. analyser les fichiers modifiés ;
3. déterminer un message Conventional Commits compatible semantic-release ;
4. indexer les fichiers à inclure ;
5. créer le commit avec `git commit -m "<type>: <résumé>"`.

Commandes possibles :

```bash
git add <fichiers>
git commit -m "<type>: <résumé factuel>"
git status --short
```

Ne lance pas de tests ou lint dans cette étape. La création de PR ne doit pas inventer de validation.

### Étape 3 : Analyser le contenu réel de la PR

Lire et résumer :

- `git log develop..HEAD` pour les commits ;
- `git diff develop...HEAD` pour le contenu global ;
- l'état des changements non commités restants, afin de signaler ce qui ne sera pas inclus.

La synthèse doit refléter le pourquoi et les effets métier ou techniques du travail, pas seulement une liste brute de fichiers.

### Étape 4 : Vérifier si la PR est légitime

Arrêter le workflow si l'un des cas suivants est vrai :

- aucun commit n'existe sur la branche par rapport à `develop` ;
- aucune différence utile n'existe par rapport à `develop` ;
- la branche courante ne correspond pas à une branche de travail ;
- une PR ouverte existe déjà pour la même branche et la même cible ;
- le remote ou les permissions empêchent la création.

Quand une PR existe déjà, réponds avec son URL au lieu d'en créer une seconde.

### Étape 5 : Préparer le titre et le corps de PR

Construis un titre concis, cohérent avec le style du repo et le scope réel.

Par défaut, préfère un titre de la forme :

```text
<type>: <résumé concis>
```

Le corps de PR doit inclure, si l'information existe :

- une section `## Summary` avec 1 à 3 puces ;
- une référence d'issue, par exemple `Closes #270` ;
- une section `## Tests` avec uniquement les validations réellement exécutées ;
- une section `## Notes` ou `## Known limits` si nécessaire ;
- le chemin du plan d'implémentation si un plan est présent dans le contexte de la branche.

Évite les descriptions vagues ou génériques.

### Étape 6 : Pousser la branche si nécessaire

Si la branche n'est pas encore publiée et que la PR doit être créée, pousse-la avec un flux non destructif :

```bash
git push -u <remote> <branch>
```

N'utilise jamais de push forcé.

### Étape 7 : Créer la PR

Créer la PR avec `gh pr create` en visant `develop`.

Passe le corps via un heredoc ou une chaîne correctement quotée pour éviter de casser le format Markdown.

### Étape 8 : Réponse finale

Réponds brièvement avec :

- le commit créé, s'il y en a eu un ;
- le titre de PR utilisé ;
- la base et la branche source ;
- l'URL de la PR créée, ou celle de la PR existante ;
- les validations réellement faites, si elles sont importantes pour la review ;
- les éventuels fichiers non inclus dans le commit ou la PR.

Exemples :

- `Commit créé : docs: document create-pr semantic commit workflow. PR créée : https://github.com/... (base : develop, source : docs/282-create-pr-workflow).`
- `Aucun commit créé : worktree propre. PR créée : https://github.com/...`
- `Impossible de créer la PR : la branche courante est develop. Crée une branche de travail dédiée.`
- `Impossible de créer la PR : la branche courante ne contient aucun commit par rapport à develop.`

## 7. Questions légitimes à poser

Pose une question courte seulement si elle est bloquante :

- la branche de base doit être autre chose que `develop` ;
- plusieurs issues plausibles doivent être référencées ;
- le titre souhaité par l'utilisateur contredit le contenu réel de la branche ;
- le remote à utiliser n'est pas identifiable ;
- le repo n'est pas connecté à GitHub via `gh` ;
- un fichier modifié semble secret, temporaire, généré ou hors scope.

Quand le choix raisonnable est évident, fais-le et indique-le dans la réponse finale.

## 8. Périmètre strict

Ce skill s'arrête une fois la PR créée, identifiée, ou bloquée avec une explication claire.

Il ne doit pas :

- implémenter ou corriger le code de la branche ;
- créer un plan ;
- lancer lint, tests, build ou validation sauf demande explicite séparée ;
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
