---
name: creer-branche-feature
description: >
  Crée une branche Git de travail à partir de `develop` en respectant la
  convention `feat/<issue>-<slug>`. Utilise ce skill dès que l'utilisateur
  demande de créer une branche feature, partir de `develop`, nommer une branche
  avec un numéro d'issue, normaliser un slug, ou préparer une branche avant
  implémentation, même s'il ne mentionne pas explicitement le mot “skill”.
  Déclenche-toi aussi sur des formulations comme “crée la branche”, “pars de
  develop”, “ouvre une branche pour l'issue #123”, “prépare ma branche de
  feature”, ou “branche-moi sur le ticket X”.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  scope: création de branche Git depuis develop, normalisation du nom, vérification des collisions, sécurité minimale
---

# Créer une branche feature

Utilise ce skill pour créer une branche Git de travail depuis `develop` avec la convention `feat/<issue>-<slug>`.

Ce skill est volontairement étroit : il prépare proprement la branche et s'arrête là.

## 1. Mission

Le but est de produire une branche locale correctement nommée, basée sur `develop`, sans dériver vers le commit, le push, la PR, ou l'implémentation.

Le skill doit :

1. identifier le numéro d'issue et le slug attendu ;
2. vérifier l'état Git minimal nécessaire ;
3. s'assurer que `develop` existe localement ou qu'il peut être récupéré proprement ;
4. créer la branche avec le format `feat/<issue>-<slug>` ;
5. répondre avec le nom exact de la branche créée.

## 2. Règles absolues

1. Ne crée pas de branche si le numéro d'issue manque et qu'aucune convention alternative n'a été explicitement demandée.
2. Ne choisis pas un slug arbitraire si une source fiable existe déjà, par exemple le titre d'une issue GitHub fournie ou accessible.
3. N'écrase jamais une branche existante.
4. Ne fais pas de `git reset --hard`, `git checkout --`, `git branch -D`, ni aucune commande destructive.
5. Ne crée ni commit, ni tag, ni PR dans ce skill.
6. Ne pousse pas la branche sur le remote sauf demande explicite de l'utilisateur.
7. Si l'état du worktree empêche un changement de branche propre, arrête-toi et explique brièvement le blocage.
8. Si `develop` n'existe pas localement mais existe sur le remote, récupère-la proprement sans modifier d'autres branches.
9. Garde la convention exacte `feat/<issue>-<slug>` sauf demande explicite contraire.

## 3. Quand l'utiliser

Utilise ce skill pour des demandes comme :

- "Crée une branche pour l'issue #270"
- "Pars de develop et fais une branche feature"
- "Prépare une branche `feat/...` pour ce ticket"
- "Crée la branche de travail pour #123 add importer logging"
- "Je veux une branche à partir de develop avec le bon slug"

Ne l'utilise pas si la demande principale est :

- créer un plan ;
- implémenter une feature ;
- corriger un bug dans le code ;
- ouvrir une PR ;
- renommer, fusionner, supprimer, ou nettoyer des branches existantes.

## 4. Entrées attendues

Le skill peut recevoir :

- un numéro d'issue, par exemple `#270` ou `270` ;
- un titre d'issue ou un slug proposé ;
- un lien GitHub d'issue ;
- une demande explicite de branchement depuis `develop`.

Sources prioritaires pour construire le nom :

1. numéro d'issue + titre GitHub ;
2. numéro d'issue + slug explicite donné par l'utilisateur ;
3. numéro d'issue + titre textuel donné dans la conversation.

Si le numéro d'issue manque, pose une question courte. Le skill ne doit pas inventer un numéro.

## 5. Construction du nom de branche

Le nom final doit suivre cette formule :

```text
feat/<issue>-<slug>
```

Exemples valides :

- `feat/270-workflow-test-diagnostics`
- `feat/123-import-oggdude-logging`
- `feat/89-fix-character-sheet-sidebar`

### 5.1. Règles de slug

Normalise le slug de façon prévisible :

1. passer en minuscules ;
2. remplacer accents et ponctuation par des séparateurs simples ;
3. remplacer espaces et séparateurs répétés par `-` ;
4. supprimer les `-` de début et de fin ;
5. garder un slug court, lisible, orienté intention.

Évite de recopier un titre d'issue trop long tel quel. Garde l'idée principale sans bruit inutile.

Exemple :

- Titre : `OpenCode - Cadrer un workflow de tests et d'analyse d'échec avant modification`
- Branche : `feat/270-workflow-test-diagnostics`

## 6. Workflow

### Étape 1 : Récupérer le contexte minimal

Identifie :

- le numéro d'issue ;
- le slug ou le titre source ;
- la branche de base attendue, qui doit être `develop` par défaut.

Si l'utilisateur fournit seulement un numéro d'issue et que GitHub est accessible, récupère le titre de l'issue pour proposer un slug propre.

### Étape 2 : Vérifier l'état Git

Avant toute création :

- vérifier que le dépôt est bien un repo Git ;
- vérifier la branche courante et l'état du worktree ;
- vérifier si `develop` existe localement ;
- vérifier si la branche cible existe déjà localement ou sur le remote.

Si la branche cible existe déjà :

1. ne crée rien ;
2. signale son nom exact ;
3. demande s'il faut s'y positionner ou choisir un autre slug.

### Étape 3 : Préparer `develop`

Cas à gérer :

- si `develop` existe localement, s'en servir comme base ;
- si `develop` n'existe qu'à distance, la récupérer proprement ;
- si `develop` n'existe ni localement ni à distance, s'arrêter et demander quoi faire.

Ne remplace pas implicitement `develop` par `main` ou `master`. Ce serait un changement de convention, pas une simple exécution.

### Étape 4 : Créer la branche

Créer la branche depuis `develop` avec un flux non destructif et explicite.

Objectif opérationnel :

1. partir de `develop` ;
2. créer `feat/<issue>-<slug>` ;
3. se positionner dessus.

Si le worktree sale empêche le checkout, arrêter le workflow et expliquer brièvement pourquoi.

### Étape 5 : Réponse finale

Réponds brièvement avec :

- le nom exact de la branche ;
- la base utilisée, en général `develop` ;
- éventuellement le blocage détecté si la branche n'a pas pu être créée.

Exemples :

- `Branche créée : feat/270-workflow-test-diagnostics (base : develop).`
- `La branche feat/270-workflow-test-diagnostics existe déjà. Je n'ai rien créé.`
- `Impossible de basculer sur develop car le worktree contient des changements incompatibles avec le checkout.`

## 7. Questions légitimes à poser

Pose une question courte seulement si elle est bloquante :

- le numéro d'issue manque ;
- deux slugs plausibles existent et aucun n'est explicitement préféré ;
- `develop` n'existe pas ;
- la branche cible existe déjà ;
- le worktree ne permet pas de changer de branche proprement.

Quand un choix mineur peut être inféré sans risque, fais-le et indique-le brièvement dans la réponse.

## 8. Périmètre strict

Ce skill s'arrête une fois la branche créée ou le blocage expliqué.

Il ne doit pas :

- implémenter le ticket ;
- créer un plan ;
- écrire de fichier ;
- lancer les tests ;
- faire un commit ;
- pousser la branche ;
- ouvrir une pull request.
