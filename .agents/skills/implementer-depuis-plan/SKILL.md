---
name: implementer-depuis-plan
description: >
  Implémente un plan technique déjà rédigé dans le projet SWERPG Foundry VTT,
  en prenant comme entrée un fichier de plan ou son contenu, puis en exécutant le
  travail de bout en bout : lecture du plan, inspection du code, implémentation,
  tests et validation. Utilise ce skill dès que l'utilisateur demande "implémente
  ce plan", "applique ce plan", "exécute ce plan", "code à partir de ce plan",
  ou fournit un fichier dans `documentation/plan/` à transformer en code, même
  s'il ne demande pas explicitement un "skill". Le skill impose les bonnes pratiques
  de développement moderne (DRY, KISS, SOLID, Software Craftsmanship), le Clean Code,
  la Clean Architecture, et l'usage des API Foundry v14+ sans API dépréciées.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v14+, JavaScript ES2022, ApplicationV2, TypeDataModel, Handlebars, Vitest
  scope: implémentation à partir d'un plan, exécution technique, validation, tests, conformité architecture
---

# Implémenter depuis un plan

Utilise ce skill quand l'utilisateur fournit un plan d'implémentation existant et attend du code exécutable, testé, et aligné sur les conventions du projet.

> ⚠️ **Langue** : le skill peut dialoguer en français ou en anglais selon l'utilisateur, mais il doit respecter la langue des artefacts du projet déjà présents. Dans SWERPG, la documentation opérationnelle peut être en français, tandis que le code, les identifiants et une partie des commentaires restent en anglais si c'est le style local.

---

## 1. Mission

Transformer un plan en implémentation réelle, sans repartir de zéro et sans re-spécifier ce qui a déjà été décidé.

Le skill doit :

1. Lire le plan fourni et s'y tenir.
2. Vérifier le code existant autour des zones impactées.
3. Implémenter la solution avec un minimum de changements corrects.
4. Respecter les standards modernes de conception et de qualité.
5. Ajouter ou adapter les tests nécessaires.
6. Vérifier le résultat avec les commandes adaptées.
7. Distinguer explicitement ce qui vient du plan, ce qui vient du code réel, et ce qui relève d'un écart ou d'une adaptation.

Le skill n'est pas un générateur de plan. Si aucun plan n'est fourni, il faut d'abord demander un plan, ou proposer `plan-depuis-issue` si l'utilisateur part d'une issue.

---

## 2. Règles absolues

1. **Toujours lire entièrement le plan fourni avant de coder.**
2. **Ne pas réinventer l'architecture si le plan tranche déjà.** Si le plan est clair, l'exécuter.
3. **Si le plan est ambigu, incomplet, obsolète, ou contredit le code actuel, arrêter et clarifier avec l'utilisateur avant les changements structurants.**
4. **Toujours inspecter le code existant autour des fichiers impactés avant modification.**
5. **Toujours respecter Foundry VTT v14+ et éviter les API dépréciées.**
6. **Toujours séparer le code métier pur des adaptations Foundry quand le changement le permet.**
7. **Toujours ajouter ou mettre à jour les tests quand une règle, un comportement, un calcul, une transformation, ou un flux d'intégration change.**
8. **Ne pas faire de refactor hors périmètre sans nécessité directe pour implémenter le plan.**
9. **Ne jamais introduire de texte utilisateur hardcodé.** Toute chaîne visible doit passer par l'i18n du projet.
10. **Ne jamais muter directement les données persistées Foundry.** Utiliser les API adaptées (`update`, `updateSource`, hooks, modèles) selon le contexte.
11. **Ne jamais changer une règle métier non demandée par le plan sans le signaler comme écart.**
12. **Ne jamais ajouter un comportement opportuniste simplement parce qu'il semble utile.** Si ce comportement n'est pas nécessaire pour exécuter le plan ou préserver un contrat existant, le mentionner comme amélioration possible plutôt que l'implémenter.

---

## 3. Skills complémentaires à charger

Avant toute implémentation non triviale dans SWERPG, charge les skills complémentaires pertinents :

- `coding-standards-project-conventions` : pour les règles de qualité, de structure, de tests et de livraison.
- `foundry-vtt-system-architecture` : pour les contraintes d'architecture et de séparation des couches.
- `testing-strategy-vitest-playwright` : si des tests sont ajoutés, réparés ou étendus.
- `logging-diagnostics` : si le plan touche au logging, aux diagnostics, aux erreurs ou à l'observabilité.
- `applicationv2-ui-sheets` : si le plan touche aux feuilles, templates, tabs, PARTS, TABS, ApplicationV2.
- `narrative-dice`, `oggdude-importer`, `swerpg-talent-effects` : si le périmètre du plan tombe dans ces domaines spécialisés.

Ne charge pas tout aveuglément. Charge ce qui correspond réellement au plan.

---

## 4. Principes de mise en oeuvre

### 4.1. Exécuter le plan, pas le paraphraser

Quand l'utilisateur donne un plan, considère que la phase d'analyse a déjà eu lieu. Le travail est d'implémenter avec rigueur, pas de reformuler le document.

Tu peux :

- préciser mentalement l'ordre de travail ;
- corriger les détails techniques en fonction du code réel ;
- signaler les écarts importants ;
- proposer une clarification ciblée si nécessaire.

Tu ne dois pas relancer une longue phase de planification si le plan est exploitable.

### 4.2. Minimalisme discipliné

Applique les principes suivants sans en faire des slogans :

- **KISS** : préfère la solution la plus simple qui respecte le plan.
- **DRY** : factorise seulement quand il y a une duplication réelle et utile.
- **SOLID** : garde des responsabilités nettes, surtout entre logique métier, adaptation Foundry, UI et tests.
- **Software Craftsmanship** : favorise lisibilité, réversibilité, petites étapes cohérentes, validations régulières.
- **Clean Code** : noms clairs, fonctions courtes quand cela aide, peu de commentaires, mais de bons commentaires là où le code porterait une ambiguïté de conception.
- **Clean Architecture** : la logique métier ne doit pas dépendre inutilement de `game`, `ui`, `Hooks`, du DOM, ni des documents Foundry si une extraction pure est possible.

Le but n'est pas de sur-architecturer. Le but est de rendre le changement facile à comprendre, sûr à faire évoluer, et cohérent avec le projet.

### 4.3. Source de vérité

Le plan guide l'implémentation, mais le repository reste la source de vérité sur :

- les chemins de fichiers ;
- les conventions réellement en place ;
- les noms de classes et d'exports ;
- les structures `system.*`, `flags.*`, `CONFIG.*` ;
- les patterns déjà utilisés ;
- les tests existants ;
- les contrats publics déjà consommés par d'autres modules du système.

Si le plan et le code divergent :

1. évalue si l'écart est mineur et corrige localement ;
2. si l'écart change le sens du travail, demande confirmation à l'utilisateur ;
3. ne casse pas un contrat public simplement pour coller au texte du plan ;
4. mentionne l'écart dans le résumé final.

---

## 5. Contrôle du périmètre

Cette section est obligatoire dans le raisonnement d'implémentation.

### 5.1. Ce qui est autorisé

Tu peux modifier :

- les fichiers explicitement mentionnés par le plan ;
- les tests directement liés au comportement implémenté ;
- les fichiers i18n nécessaires si une chaîne visible est ajoutée ;
- les helpers ou modules voisins si l'extraction est nécessaire pour éviter une duplication réelle ou séparer une logique pure ;
- les mocks de test si le nouveau comportement les exige.

### 5.2. Ce qui doit être évité

Évite :

- les refactors généraux ;
- les changements de règles métier non demandés ;
- les renommages opportunistes ;
- les migrations de style ou de formatting sur des fichiers non concernés ;
- les helpers génériques ajoutés “au cas où” ;
- les corrections de bugs non liées au plan ;
- les changements de comportement qui font passer les tests mais contredisent les décisions utilisateur ou ADR.

### 5.3. Si une amélioration hors plan semble utile

Ne l'implémente pas automatiquement.

À la place :

1. termine le plan demandé ;
2. note l'amélioration dans “Risques restants / pistes ultérieures” ;
3. indique pourquoi elle n'a pas été incluse.

Exception : si l'amélioration est strictement nécessaire pour que le plan fonctionne ou pour préserver un contrat existant, elle peut être faite, mais elle doit apparaître dans la section “Écarts / adaptations”.

---

## 6. Workflow d'implémentation

### Étape 1 : Lire et cadrer

À partir du plan :

1. Identifie l'objectif concret.
2. Liste les fichiers explicitement mentionnés.
3. Repère les couches concernées : domaine, document, hook, UI, modèle, intégration, tests.
4. Repère les risques déjà listés dans le plan.
5. Note les décisions d'architecture à ne pas remettre en cause sans raison.
6. Note les comportements explicitement attendus et les comportements explicitement exclus.

Si le plan pointe vers d'autres documents de référence, lis-les avant de coder : ADR, spec, plans précédents, docs d'architecture.

### Étape 2 : Inspecter le code réel

Avant d'éditer :

1. Lis les fichiers à modifier.
2. Lis les voisins immédiats quand ils servent de référence de pattern.
3. Lis les tests existants proches du périmètre.
4. Vérifie les conventions d'import, de nommage, de structure, de logs et de hooks déjà utilisées.

Cherche en particulier :

- ce qui existe déjà et peut être réutilisé ;
- les contrats publics à préserver ;
- la frontière entre logique pure et adaptation Foundry ;
- les API v14+ à privilégier ;
- les API anciennes ou dépréciées à éviter ;
- les tests qui doivent échouer avant correction et passer après correction.

### Étape 3 : Découper mentalement en petits changements sûrs

Avant d'appliquer le patch, organise le travail en petites unités :

1. structures ou helpers purs ;
2. branchement dans le code existant ;
3. tests ;
4. i18n éventuelle ;
5. validation.

Si le plan propose plusieurs étapes, suis cet ordre autant que possible.

### Étape 4 : Implémenter

Pendant l'implémentation :

1. fais le plus petit changement correct ;
2. reste cohérent avec l'architecture du projet ;
3. n'introduis pas de wrappers ou abstractions inutiles ;
4. n'ajoute pas de compatibilité legacy sans besoin réel ;
5. documente seulement les décisions non évidentes ;
6. conserve les responsabilités au bon endroit ;
7. évite les modifications de comportement non demandées ;
8. évite les modifications de style sur fichiers non concernés.

### Étape 5 : Tester

Ajoute ou adapte les tests au bon niveau :

- **Vitest unitaire** pour logique pure, calculs, transformations, parsing, mapping.
- **Vitest intégration légère** pour hooks, adaptateurs Foundry, orchestration modérée.
- **Tests manuels ciblés** si le changement touche l'UI ou un flux Foundry difficile à mocker proprement.

Quand un bug est corrigé, privilégie un test qui aurait échoué avant le correctif.

Chaque comportement nouveau doit avoir au moins un test ou une justification explicite si le test automatisé n'est pas réaliste.

### Étape 6 : Valider

Après l'implémentation :

1. lance les tests ciblés ;
2. lance d'autres commandes utiles si le périmètre le justifie ;
3. vérifie qu'aucune régression évidente n'a été introduite ;
4. vérifie le diff avant de conclure ;
5. signale honnêtement ce qui a été validé ou non.

---

## 7. Contraintes SWERPG / Foundry à respecter

### 7.1. APIs Foundry v14+

Privilégie les APIs modernes et les patterns maintenus par Foundry v14+.

Évite notamment :

- les APIs documentées comme deprecated dans le contexte du projet ;
- les patterns Application v1 quand ApplicationV2 est le standard local ;
- les contournements DOM globaux ;
- les mutations directes de documents ;
- les chemins ad hoc si le projet possède déjà une intégration propre.

Si tu dois choisir entre une compatibilité rétro vague et un pattern propre v14+, choisis le pattern propre v14+ sauf contrainte explicite du repository.

### 7.2. Data models et documents

Quand le plan touche aux données métier :

- `system.*` pour la donnée coeur validée par modèle ;
- `flags.*` pour les données secondaires quand c'est cohérent avec les ADRs ;
- `TypeDataModel` et `foundry.data.fields.*` pour les formes structurées ;
- méthodes de document et hooks pour le cycle de vie ;
- logique pure hors document quand elle peut vivre sans dépendance Foundry.

### 7.3. UI et templates

Quand le plan touche l'interface :

- utilise ApplicationV2 ;
- prépare les données côté JS ;
- garde les templates orientés rendu ;
- ne déplace pas de logique métier dans Handlebars ;
- respecte les patterns de `PARTS`, `TABS`, `tabGroups`, `data-action`, `data-application-part` si déjà en place.

---

## 8. Format de sortie attendu

Quand tu as fini l'implémentation, réponds avec une sortie orientée exécution :

1. **Résumé** : objectif et résultat concret.
2. **Fichiers touchés** : création/modification.
3. **Demandé explicitement par le plan** : liste courte des points implémentés.
4. **Adaptations dues au code réel** : seulement s'il y en a.
5. **Hors périmètre non traité** : améliorations vues mais volontairement non incluses.
6. **Tests** : ce qui a été ajouté ou modifié.
7. **Validation** : commandes lancées et résultat.
8. **Écarts éventuels par rapport au plan** : uniquement s'il y en a, avec justification.
9. **Risques restants** : uniquement s'ils sont utiles au prochain intervenant.

Ne noie pas l'utilisateur sous une longue théorie après avoir codé. Le code et la validation sont la priorité.

---

## 9. Exemples de déclenchement

**Exemple 1 :**
Utilisateur : `Implémente ce plan : documentation/plan/character-sheet/evolution-logs/TECH-159-plan-diff-analyzer.md`

Comportement attendu :

- lire le plan ;
- inspecter les fichiers mentionnés ;
- implémenter les changements demandés ;
- ajouter les tests ;
- exécuter les validations utiles ;
- résumer le résultat en distinguant demandé / adapté / non traité.

**Exemple 2 :**
Utilisateur : `Applique ce plan de refactor et fais le code, pas une nouvelle spec.`

Comportement attendu :

- ne pas repartir en planification ;
- charger les skills d'architecture/conventions utiles ;
- exécuter le plan de manière disciplinée ;
- signaler seulement les ambiguïtés bloquantes ;
- éviter les améliorations hors plan.

**Exemple 3 :**
Utilisateur : `À partir de ce plan dans documentation/plan/importer/... je veux l'implémentation complète avec tests.`

Comportement attendu :

- suivre le plan ;
- respecter l'architecture du domaine concerné ;
- ajouter les tests adaptés ;
- vérifier les commandes pertinentes ;
- signaler tout écart au plan.

---

## 10. Anti-patterns à éviter

N'emploie pas ce skill pour :

- réécrire un plan alors que l'utilisateur veut du code ;
- faire une refonte globale non demandée ;
- introduire des abstractions “enterprise” sans besoin réel ;
- migrer vers TypeScript ;
- contourner les patterns du projet ;
- ignorer les tests ou la validation ;
- utiliser des APIs Foundry dépréciées alors qu'une alternative moderne existe ;
- mélanger plusieurs sujets non liés dans la même intervention ;
- changer une règle métier sous couvert d'amélioration technique ;
- faire passer une extension de périmètre pour une simple adaptation.

---

## 11. Rappel final

Le bon comportement est :

1. comprendre rapidement le plan ;
2. lire le code réel ;
3. implémenter proprement ;
4. rester dans le périmètre ;
5. tester ;
6. valider ;
7. livrer un résultat sobre, fiable et conforme à l'architecture.

Si le plan est bon, exécute-le avec précision. Si le plan est bancal, clarifie juste ce qu'il faut pour débloquer l'implémentation. Si une amélioration hors plan semble utile, ne l'intègre pas sans nécessité : note-la pour plus tard.

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