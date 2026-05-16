---
name: corriger-echec-validation
description: >
  Analyse un échec de validation déjà observé puis applique une correction
  minimale, strictement limitée au défaut prouvé, avant de relancer la
  validation ciblée. Utilise ce skill dès que l'utilisateur demande de corriger
  un test cassé, réparer un échec lint/build/e2e, traiter une régression de
  validation, ou appliquer un targeted fix après un diagnostic, même s'il ne
  mentionne pas explicitement le mot “skill”. Déclenche-toi aussi sur des
  formulations comme “corrige cet échec”, “répare la validation”, “fais le fix
  minimal”, “corrige sans hors scope”, ou “fais passer ce test sans refactor”.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  scope: analyse d'échec de validation, correction minimale, relance ciblée, contrôle strict du périmètre
---

# Corriger un échec de validation

Utilise ce skill quand un échec est déjà identifié et que l'utilisateur attend une correction ciblée, sobre, et vérifiable.

Ce skill ne sert pas à refondre une zone instable ni à “améliorer” le code au passage. Il sert à réparer le défaut démontré avec le plus petit changement correct.

## 1. Mission

Le but est de partir d'un échec observable, d'en établir la cause probable avec preuve suffisante, puis d'appliquer une correction minimale et de relancer la validation pertinente.

Le skill doit :

1. partir d'un échec réel, pas d'une hypothèse vague ;
2. identifier la validation concernée et son périmètre ;
3. isoler la cause la plus probable à partir du code et du signal d'échec ;
4. appliquer la plus petite correction correcte ;
5. relancer la validation ciblée ;
6. signaler clairement ce qui a été corrigé, ce qui a été vérifié, et ce qui reste hors scope.

## 2. Règles absolues

1. Ne corrige pas sans échec concret à analyser : sortie de test, erreur lint, build cassé, échec e2e, stack trace, diff de régression, ou reproduction claire.
2. Diagnose avant de modifier. Analyser ne signifie pas corriger à l'aveugle.
3. Garde la correction locale et minimale. Pas de refactor large sans nécessité démontrée.
4. Ne change pas des règles métier ou d'architecture non impliquées par l'échec.
5. Ne “fais pas passer” artificiellement une validation en supprimant une assertion légitime, en affaiblissant un contrat, ou en contournant le comportement attendu sans justification.
6. Relance la validation la plus ciblée possible avant toute validation plus large.
7. Si l'échec révèle un problème de plan, de spec, ou un défaut structurel plus large, arrête-toi et explique pourquoi une correction minimale n'est pas suffisante.
8. Ne mélange pas plusieurs fixes indépendants dans la même intervention.
9. Si des changements non liés sont déjà présents dans le worktree, n'y touche pas et ne les inclue pas dans la correction.

## 3. Quand l'utiliser

Utilise ce skill pour des demandes comme :

- "Corrige ce test qui casse"
- "Répare l'échec lint sur ma branche"
- "Le build échoue depuis mon dernier changement, fais le fix minimal"
- "Analyse cette erreur Vitest et corrige seulement le nécessaire"
- "Répare la validation sans partir en refactor hors scope"

Ne l'utilise pas si la demande principale est :

- planifier une feature ;
- implémenter un ticket complet ;
- faire une revue de code globale ;
- traiter un problème d'architecture large sans preuve de défaut localisable ;
- créer une PR ou un commit.

## 4. Entrées attendues

Le skill peut recevoir :

- une sortie de commande (`pnpm test`, `pnpm exec eslint`, `pnpm run build`, `pnpm e2e`, etc.) ;
- un nom de test ou un fichier de test cassé ;
- un message d'erreur, une stack trace, ou une capture de validation ;
- un contexte de branche ou de plan déjà implémenté ;
- une consigne de sobriété, par exemple "sans hors scope" ou "fix minimal".

Si l'échec n'est pas donné, commence par l'obtenir ou par le reproduire avec la validation la plus ciblée possible.

## 5. Workflow

### Étape 1 : Cadrer l'échec réel

Identifie explicitement :

- quelle validation échoue ;
- quel fichier, test, module, ou règle est concerné ;
- si l'échec est déterministe, intermittent, ou environnemental ;
- ce qui semble inclus ou hors scope du fix.

Si l'échec n'est pas assez concret, reproduis-le avant de coder.

### Étape 2 : Isoler la cause probable

Lis d'abord :

- la sortie de validation ;
- les fichiers directement impliqués ;
- les tests ou règles proches ;
- les changements récents du périmètre si c'est nécessaire pour comprendre la régression.

Cherche la cause la plus proche du symptôme.

Préférer :

- une hypothèse simple confirmée par le code ;
- une incohérence de contrat local ;
- un oubli de branchement, d'import, de structure de données, ou d'attendu de test.

Éviter :

- les refactors spéculatifs ;
- les généralisations prématurées ;
- les “nettoyages” opportunistes.

### Étape 3 : Choisir la correction minimale

Avant d'éditer, pose mentalement la question :

> Quel est le plus petit changement qui corrige ce défaut sans élargir le périmètre ?

Exemples de corrections minimales légitimes :

- ajuster une condition incorrecte ;
- corriger un mapping ou un nom de propriété ;
- réaligner un test sur un contrat réellement attendu ;
- ajouter un guard local ;
- restaurer une donnée requise par le flux concerné.

Exemples de dérive hors scope à éviter :

- extraire plusieurs helpers génériques non nécessaires ;
- renommer massivement des symboles ;
- réorganiser l'architecture d'un module entier ;
- corriger en même temps d'autres défauts non liés découverts en chemin.

### Étape 4 : Appliquer le fix

Applique le patch le plus petit possible.

Si un test doit être ajusté, vérifie d'abord s'il exprimait un contrat valide. Un test cassé n'est pas forcément un mauvais test ; le code cassé n'est pas forcément fautif si le contrat a changé volontairement.

Quand la bonne correction touche à la fois code et test, garde le changement centré sur le même défaut.

### Étape 5 : Relancer la validation ciblée

Relance d'abord la commande la plus petite et la plus probante :

- test unique ;
- fichier de test ;
- cible lint restreinte ;
- build local pertinent ;
- scénario e2e concerné.

Élargis ensuite seulement si cela apporte une confiance utile et raisonnable pour le coût.

### Étape 6 : Réponse finale

Réponds brièvement avec :

- la cause corrigée ;
- les fichiers réellement touchés ;
- la validation relancée et son résultat ;
- ce qui reste explicitement hors scope.

Exemples :

- `Fix appliqué : garde manquante dans le mapping talent. Validation relancée : tests/lib/talent-map.test.mjs OK.`
- `Correction minimale appliquée sur l'assertion du test pour refléter le contrat actuel. Vitest ciblé OK.`
- `Je n'ai rien modifié : l'échec suggère un problème d'architecture plus large qu'un fix local.`

## 6. Questions légitimes à poser

Pose une question courte seulement si elle est bloquante :

- l'échec exact n'est pas disponible ;
- plusieurs validations distinctes échouent sans relation claire ;
- le comportement attendu est ambigu entre code, test, plan, ou spec ;
- la correction minimale impliquerait une décision d'architecture ou de produit ;
- la reproduction dépend d'un environnement manquant.

Quand le signal est suffisant, avance sans ouvrir une phase de clarification inutile.

## 7. Périmètre strict

Ce skill s'arrête une fois le fix ciblé appliqué et la validation pertinente relancée, ou une fois le blocage correctement expliqué.

Il ne doit pas :

- transformer un bug local en chantier de refactor ;
- traiter des défauts annexes non demandés ;
- créer un plan complet d'implémentation ;
- faire un commit, un push, ou une PR ;
- présenter comme “corrigé” un cas seulement masqué ou contourné.
