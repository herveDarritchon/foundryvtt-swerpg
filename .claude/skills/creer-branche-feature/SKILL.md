---
name: creer-branche-feature
description: >
  Crée une branche Git de travail depuis develop avec la convention
  <prefix>/<issue>-<slug>, sans commit, push, PR ni implémentation.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  scope: création de branche Git depuis develop
---

# Créer une branche feature

## Mission

Créer une branche locale de travail depuis `develop`, puis s'arrêter.

Format par défaut :

```text
feat/<issue>-<slug>
```

Exemple :

```text
feat/270-workflow-test-diagnostics
```

## Entrées attendues

Le skill attend :

- un numéro d'issue : `270`, `#270` ou une URL GitHub ;
- un titre ou un slug explicite ;
- éventuellement un préfixe : `feat`, `fix`, `chore` ou `docs`.

Valeurs par défaut :

- base : `develop` ;
- préfixe : `feat`.

Si le numéro d'issue manque, arrêter et demander ce numéro.  
Ne pas inventer de numéro d'issue.

## Règles strictes

- Ne jamais modifier `main`, `master` ou `develop` directement.
- Ne jamais utiliser `main` ou `master` comme base de remplacement implicite.
- Ne pas créer la branche si le worktree est sale.
- Ne pas écraser une branche existante.
- Ne pas utiliser de commande destructive : `reset --hard`, `checkout --`, `branch -D`.
- Ne pas commit, push, tag, ouvrir de PR, lancer de test ou implémenter du code.
- Ne pas lire largement le dépôt : Git suffit.

## Slug

Construire un slug court et stable :

1. minuscules ;
2. accents supprimés ;
3. espaces et ponctuation remplacés par `-` ;
4. séparateurs répétés compactés ;
5. `-` de début et de fin supprimés.

Garder l'intention principale, pas le titre complet.

## Procédure

### 1. Déterminer le nom cible

Construire :

```text
<prefix>/<issue>-<slug>
```

### 2. Vérifier l'état Git

Exécuter uniquement les contrôles nécessaires :

```bash
git rev-parse --is-inside-work-tree
git status --short
git branch --list develop
git ls-remote --heads origin develop
git branch --list "<branch>"
git ls-remote --heads origin "<branch>"
```

Arrêter si :

- le dépôt n'est pas un repo Git ;
- le worktree est sale ;
- `develop` est introuvable ;
- la branche cible existe déjà localement ou à distance.

### 3. Créer la branche

Si tout est clair :

```bash
git fetch origin
git checkout develop
git pull --ff-only origin develop
git checkout -b "<branch>"
```

Si `develop` n'existe pas localement mais existe sur `origin/develop` :

```bash
git fetch origin
git checkout -b develop origin/develop
git pull --ff-only origin develop
git checkout -b "<branch>"
```

## Réponse attendue

Répondre brièvement avec :

- branche créée ou blocage ;
- base utilisée ;
- état Git final si disponible.

Exemples :

```text
Branche créée : feat/270-workflow-test-diagnostics (base : develop).
```

```text
Blocage : worktree non propre. Aucune branche créée.
```

```text
Blocage : la branche feat/270-workflow-test-diagnostics existe déjà. Aucune action destructive effectuée.
```
