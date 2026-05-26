---
name: creer-pull-request
description: >
  Prépare ou crée une pull request GitHub vers `develop` depuis la branche
  courante, avec commit Conventional Commits / semantic-release préalable si
  nécessaire. Vérifie la branche, l'état Git, le remote, les commits inclus,
  puis rédige un titre et un corps de PR factuels et valides en Markdown.
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

Il couvre uniquement : vérification Git, commit préalable si nécessaire, analyse du diff, push éventuel, création de PR avec `gh pr create`.

Il ne couvre pas : implémentation, correction de tests, merge, approbation, nettoyage de branche ou modification de configuration Git.

## 1. Mission

Produire une PR propre, reviewable et fidèle au contenu réellement modifié sur la branche de travail.

Le skill doit :

1. refuser toute exécution directe depuis `develop`, `main` ou `master` ;
2. vérifier l'état local, le tracking remote et la base `develop` ;
3. créer un commit Conventional Commits si le worktree contient des changements pertinents ;
4. analyser tous les commits et le diff `develop...HEAD` ;
5. rédiger un titre et un corps de PR factuels, valides en Markdown ;
6. pousser la branche si nécessaire ;
7. créer la PR vers `develop`, ou expliquer précisément le blocage.

## 2. Invariants non négociables

- Base par défaut : `develop`.
- Outil GitHub : `gh`.
- Aucune PR vide : arrêter si la branche ne contient aucun commit ou diff utile par rapport à `develop`.
- Aucune action destructive : pas de `git push --force`, `git reset --hard`, `git checkout --`, `git branch -D`, ni équivalent.
- Aucun merge, changement de cible ou changement de configuration Git sans demande explicite.
- Aucun contenu inventé : le titre, le corps, les notes et les limites doivent venir des commits et du diff.
- Aucun résultat inventé : ne mentionner test, lint, build ou validation que s'ils ont réellement été exécutés.
- Si le remote, les permissions ou l'authentification GitHub bloquent la PR, expliquer le blocage au lieu de bricoler.

## 3. Quand utiliser ce skill

Utilise-le pour :

- préparer ou créer une PR vers `develop` ;
- pousser une branche et ouvrir une PR ;
- rédiger un titre et une description de PR ;
- comparer la branche courante à `develop` avant PR.

Ne l'utilise pas pour : créer une branche, implémenter du code, corriger des tests, relire une PR existante, lister des PR, merger ou fermer une PR.

Entrées possibles : demande de PR, numéro ou lien d'issue, consigne de titre ou de ton, ordre explicite de push/création.

## 4. Workflow

### 4.1 Inspecter l'état Git

Exécuter au minimum :

```bash
git branch --show-current
git status --short
git status --branch --short
git log --oneline develop..HEAD
git diff --stat develop...HEAD
```

Si `develop` local n'existe pas, utiliser la référence remote pertinente, par exemple `origin/develop`, sans modifier la configuration Git.

Arrêter immédiatement si la branche courante est `develop`, `main` ou `master`.

### 4.2 Créer un commit préalable si nécessaire

Si `git status --short` indique des changements :

1. analyser les fichiers modifiés, ajoutés, supprimés et non suivis ;
2. exclure tout fichier manifestement secret, temporaire, généré, de cache, de dépendances ou hors scope ;
3. arrêter si un fichier sensible ou hors scope crée un doute bloquant ;
4. indexer uniquement les fichiers pertinents ;
5. créer un commit Conventional Commits compatible semantic-release ;
6. relire `git status --short` et signaler ce qui reste volontairement non inclus.

Format obligatoire :

```text
<type>(<scope optionnel>): <résumé court et factuel>
```

Types usuels : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`.

Inférence recommandée :

- `feat/...` -> `feat` ;
- `fix/...` -> `fix` ;
- `docs/...` ou changements uniquement documentaires -> `docs` ;
- changements uniquement sous tests -> `test` ;
- CI -> `ci` ;
- build/outillage -> `build` ;
- sinon type conservateur et factuel, souvent `chore`.

Exemples :

```text
docs: document create-pr semantic commit workflow
fix(talents): resolve known talents by business identifier
feat(talents): add consolidated known talent resolution
chore(opencode): tighten pull request command safeguards
```

Ne lance pas lint, tests ou build dans cette étape sauf demande explicite.

### 4.3 Analyser le contenu réel de la PR

Après le commit éventuel, analyser :

```bash
git log --oneline develop..HEAD
git diff --stat develop...HEAD
git diff develop...HEAD
```

La synthèse doit expliquer les changements utiles pour la review, pas seulement lister les fichiers.

Arrêter si :

- aucun commit n'existe par rapport à `develop` ;
- aucun diff utile n'existe ;
- une PR ouverte existe déjà pour la même branche et la même cible ;
- le remote ou les permissions empêchent la création.

Si une PR existe déjà, répondre avec son URL au lieu d'en créer une seconde.

### 4.4 Préparer le titre et le corps de PR

Titre recommandé :

```text
<type>: <résumé concis>
```

Le titre doit être cohérent avec le scope réel de la branche.

Le corps de PR doit être généré dans un fichier temporaire, par exemple `/tmp/create-pr-body.md`, puis transmis avec `gh pr create --body-file`. Ne jamais utiliser `--body "..."` pour un corps multi-ligne.

Structure recommandée :

```markdown
## Summary

- ...
- ...

## Context

Closes #270

## Tests

- Not run (not requested).

## Notes

- ...
```

Règles Markdown obligatoires :

- sections principales en titres de niveau 2 uniquement : `## Summary`, `## Context`, `## Tests`, `## Notes` ou `## Known limits` ;
- `## Summary` contient 1 à 3 puces factuelles ;
- `## Tests` est obligatoire ; si rien n'a été lancé, écrire exactement `- Not run (not requested).` ;
- références d'issue sur ligne dédiée, par exemple `Closes #270`, uniquement si elles sont fiables ;
- supprimer `## Context`, `## Notes` ou `## Known limits` si elles n'apportent rien de vérifiable ;
- aucune liste vide, aucun titre vide, aucun placeholder (`TBD`, `TODO`, `<issue>`, `<summary>`, `...`) ;
- pas de tableau inutile, HTML brut ou bloc de code non fermé ;
- le corps doit refléter `develop...HEAD`, pas recopier mécaniquement le dernier commit.

Avant création, relire le fichier généré avec `cat` ou équivalent pour vérifier visuellement titres, puces, lignes vides, absence de placeholders et absence de bloc ouvert.

### 4.5 Pousser et créer la PR

Si la branche n'est pas publiée et que la PR doit être créée, utiliser uniquement un push non destructif :

```bash
git push -u <remote> <branch>
```

Créer ensuite la PR vers `develop` :

```bash
gh pr create --base develop --head <branch> --title "<titre>" --body-file /tmp/create-pr-body.md
```

Adapter `<remote>` et `<branch>` aux valeurs réellement détectées.

## 5. Réponse finale

Répondre brièvement avec :

- commit créé, s'il y en a eu un ;
- titre de PR ;
- base et branche source ;
- URL de la PR créée ou existante ;
- validations réellement exécutées ;
- fichiers non inclus, le cas échéant ;
- blocage exact si la PR n'a pas été créée.

Exemples :

- `Commit créé : docs: document create-pr semantic commit workflow. PR créée : https://github.com/... (base : develop, source : docs/282-create-pr-workflow).`
- `Aucun commit créé : worktree propre. PR créée : https://github.com/...`
- `Impossible de créer la PR : la branche courante est develop. Crée une branche de travail dédiée.`
- `Impossible de créer la PR : la branche courante ne contient aucun commit par rapport à develop.`

## 6. Questions bloquantes autorisées

Pose une question courte seulement si :

- la base doit manifestement être autre chose que `develop` ;
- plusieurs issues plausibles peuvent être référencées ;
- le titre demandé contredit le diff ;
- le remote est ambigu ;
- `gh` n'est pas authentifié ou le repo n'est pas connecté à GitHub ;
- un fichier semble secret, temporaire, généré ou hors scope.

Quand le choix raisonnable est évident, fais-le et indique-le dans la réponse finale.

## 7. Token budget policy

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
