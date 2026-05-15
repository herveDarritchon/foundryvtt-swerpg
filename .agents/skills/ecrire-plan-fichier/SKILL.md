---
name: ecrire-plan-fichier
description: >
  Écrit un plan déjà rédigé ou validé dans un fichier Markdown sous
  `documentation/plan/` du projet SWERPG. Utilise ce skill dès que
  l'utilisateur demande de créer, écrire, enregistrer, générer, ou placer dans
  la documentation un fichier `.md` à partir d'un plan déjà existant dans la
  conversation, d'un cadrage déjà validé, ou d'un contenu de plan fourni tel
  quel. Déclenche-toi même si l'utilisateur ne dit pas “skill” mais veut
  clairement matérialiser un plan en fichier avec un nom et un emplacement
  propres. Ne l'utilise pas quand il faut encore concevoir le plan,
  l'améliorer, le challenger, ou l'implémenter dans le code.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  scope: transformation d'un plan existant en fichier Markdown, placement dans documentation/plan, nommage, protection contre l'écrasement
---

# Ecrire un plan dans un fichier

Utilise ce skill pour transformer un plan déjà rédigé en fichier Markdown dans le repository, sans refaire le travail de planification.

> Langue : conserve la langue du plan fourni. Si le plan est en français, garde le français. Si l'utilisateur demande explicitement une autre langue, respecte sa demande.

## 1. Mission

Le but est simple : prendre un plan déjà fourni ou validé, puis le matérialiser proprement dans `documentation/plan/`.

Le skill doit :

1. récupérer le contenu du plan dans la conversation ou depuis l'entrée fournie ;
2. déterminer le bon chemin sous `documentation/plan/` ;
3. choisir un nom de fichier Markdown propre si l'utilisateur n'en donne pas ;
4. créer le fichier sans altérer le sens du plan ;
5. répondre avec une confirmation courte et factuelle.

Ce skill n'est pas un skill de conception, de revue, ni d'implémentation.

## 2. Règles absolues

1. Ne pas inventer de détails techniques absents du plan.
2. Ne pas enrichir, redécouper, ni re-spécifier le plan sauf demande explicite.
3. Préserver la structure, les sections, et les décisions déjà présentes.
4. Autoriser seulement un nettoyage léger de format Markdown si cela améliore la lisibilité sans changer le fond.
5. Écrire uniquement dans `documentation/plan/` ou un sous-dossier explicitement demandé ou déjà cohérent avec l'arborescence existante.
6. Ne jamais écraser silencieusement un fichier existant.
7. Si le chemin cible existe déjà, arrêter et demander s'il faut écraser, renommer, ou fusionner.
8. Ne pas modifier le code source.
9. Ne pas lancer de tests.
10. Ne pas créer de commit ni de PR sauf demande explicite.
11. Si le plan n'est pas réellement fourni ou reste ambigu, demander le contenu avant toute écriture.

## 3. Quand l'utiliser, quand ne pas l'utiliser

Utilise ce skill si la demande ressemble à :

- "Crée le fichier markdown avec ce plan dans documentation/plan."
- "Mets ce plan dans un fichier md dans la doc du projet."
- "Prends le plan qu'on vient de valider et crée le fichier correspondant."
- "Génère le fichier de plan pour l'issue #234 dans documentation/plan."

Ne l'utilise pas si l'utilisateur demande surtout :

- de concevoir un plan depuis une issue ou une idée ;
- de revoir ou améliorer un plan ;
- d'implémenter le plan dans le code ;
- de faire une analyse d'architecture.

Dans ces cas, préfère le skill adapté, par exemple `plan-depuis-issue` ou `implementer-depuis-plan`.

## 4. Entrées attendues

Le skill peut recevoir :

- le contenu complet du plan dans la conversation ;
- un titre ou un slug ;
- un numéro d'issue, une user story, un epic, ou un contexte associé ;
- un nom de fichier cible ;
- un sous-dossier cible sous `documentation/plan/`.

Si certaines informations manquent, complète seulement ce qui est nécessaire pour écrire le fichier :

- inférer un nom de fichier propre ;
- inférer un sous-dossier cohérent si l'utilisateur l'a demandé implicitement et que l'arborescence existante le justifie ;
- sinon rester à la racine de `documentation/plan/`.

## 5. Workflow

### Étape 1 : Vérifier que le plan existe déjà

Confirme que le plan est bien présent dans la conversation ou dans l'entrée fournie.

Si le plan n'est pas là, demande-le. N'écris jamais un fichier vide ou rempli avec des suppositions.

### Étape 2 : Inspecter l'arborescence de documentation

Avant d'écrire, regarde `documentation/plan/` et ses sous-dossiers pertinents pour :

- réutiliser un sous-dossier existant quand il correspond clairement au sujet ;
- éviter de créer un emplacement incohérent ;
- observer les habitudes de nommage déjà présentes.

Ne crée un nouveau sous-dossier que si c'est explicitement demandé ou clairement nécessaire.

### Étape 3 : Déterminer le chemin cible

Priorité de décision :

1. chemin explicite donné par l'utilisateur ;
2. sous-dossier explicite donné par l'utilisateur ;
3. sous-dossier existant clairement cohérent avec le sujet ;
4. sinon `documentation/plan/`.

Le nom de fichier doit être en kebab-case et se terminer par `.md`.

Sources possibles pour construire le nom :

1. nom de fichier explicite ;
2. slug explicite ;
3. titre du plan ;
4. contexte issue / US si le titre est absent.

Exemples valides :

- `documentation/plan/us16-specialization-tree-rendering.md`
- `documentation/plan/234-node-visual-states.md`
- `documentation/plan/character-sheet/talent/234-plan-appliquer-variantes-visuelles-etats-noeud.md`

### Étape 4 : Vérifier les collisions

Si le fichier cible existe déjà :

1. n'écris rien ;
2. signale le chemin existant ;
3. demande une décision courte : écraser, renommer, ou fusionner.

Ne choisis pas à la place de l'utilisateur.

### Étape 5 : Matérialiser le Markdown

Crée le fichier avec le contenu du plan, en respectant autant que possible sa structure source.

Le document final doit contenir :

- un titre clair ;
- le contexte issue / epic / parent si ces informations sont fournies ;
- les sections du plan déjà présentes ;
- le contenu du plan sans invention ni extension arbitraire.

Tu peux normaliser légèrement le Markdown pour éviter un rendu cassé :

- titres bien formés ;
- listes lisibles ;
- séparateurs cohérents ;
- liens correctement écrits si déjà fournis.

Tu ne dois pas :

- ajouter des sections métier non demandées ;
- compléter des trous techniques par imagination ;
- transformer un cadrage court en plan détaillé si ce détail n'existe pas déjà.

### Étape 6 : Répondre brièvement

La réponse finale doit être courte, factuelle, et inclure le chemin exact.

Exemples :

- `Created documentation/plan/234-node-visual-states.md from the provided plan.`
- `Created documentation/plan/character-sheet/talent/234-plan-appliquer-variantes-visuelles-etats-noeud.md from the validated plan.`

Si le nom de fichier ou le dossier a été inféré, ajoute une phrase courte seulement si utile.

## 6. Format du fichier à produire

Vise un Markdown propre et direct.

Structure minimale attendue :

```md
# <Titre du plan>

**Issue** : ...
**Epic** : ...
**Contexte** : ...

---

## ...
```

Si le plan source possède déjà sa propre structure, conserve-la plutôt que d'imposer un gabarit artificiel.

## 7. Gestion des ambiguïtés

Pose une question courte seulement si elle bloque réellement l'écriture du fichier, par exemple :

- le plan n'est pas fourni ;
- deux sous-dossiers semblent plausibles et aucun n'est demandé ;
- le titre ne permet pas de produire un nom de fichier stable ;
- le fichier cible existe déjà.

Quand un choix mineur peut être inféré sans risque, fais-le et signale-le brièvement dans la confirmation.

## 8. Périmètre strict

Ce skill s'arrête une fois le fichier créé.

Il ne doit pas :

- analyser le fond technique du plan ;
- valider l'architecture ;
- toucher au code ;
- lancer la mise en oeuvre ;
- engager des actions Git.

S'il devient clair que l'utilisateur veut en réalité produire le plan lui-même, bascule vers le skill de planification pertinent au lieu d'étirer celui-ci.
