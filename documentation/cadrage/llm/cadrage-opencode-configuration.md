# Document de cadrage — Optimisation de la configuration OpenCode

## 1. Finalité du cadrage

L’objectif de cette démarche est d’optimiser l’usage d’OpenCode en associant **le bon type d’action au bon niveau de modèle, au bon niveau d’autonomie et au bon niveau de risque accepté**.

La configuration ne doit pas chercher à créer un système complexe pour le plaisir. Elle doit d’abord répondre à un besoin opérationnel simple : éviter d’utiliser des modèles coûteux ou puissants pour des tâches simples, tout en réservant les modèles les plus capables aux décisions, plans, arbitrages techniques, corrections sensibles et revues critiques.

OpenCode dispose de mécanismes structurants pour spécialiser les usages : agents, commandes, skills, modèles, permissions, outils et plugins. Les agents peuvent être configurés avec des rôles, modèles et accès spécifiques ; les commandes peuvent encapsuler des actions récurrentes ; les skills servent à charger des instructions réutilisables ; les plugins permettent d’étendre ou d’encadrer certains comportements.

Ce cadrage vise donc à définir **une doctrine d’usage**, pas une implémentation.

---

## 2. Principe directeur

La configuration OpenCode doit être organisée autour d’une idée centrale :

> Chaque activité doit être confiée à un profil d’agent adapté, avec le modèle le plus économique capable de produire un résultat fiable.

Cela implique de ne pas raisonner uniquement en termes de “meilleur modèle”, mais en termes de **rapport coût / risque / complexité / valeur produite**.

Un modèle très puissant est pertinent pour analyser une architecture, préparer un plan de refactoring ou résoudre un bug complexe. Il est beaucoup moins pertinent pour lancer un linter, résumer une erreur triviale ou rédiger une PR simple.

La configuration cible doit donc favoriser une logique de **sobriété raisonnée** : utiliser le niveau d’intelligence nécessaire, mais pas davantage.

---

## 3. Objectifs opérationnels

La configuration cible doit permettre de :

1. **Réduire la consommation inutile de tokens**  
   Les modèles coûteux doivent être réservés aux tâches où leur valeur ajoutée est réelle.

2. **Améliorer la qualité des résultats**  
   Chaque tâche doit être confiée à un agent dont le rôle est clair, limité et cohérent.

3. **Limiter les dérives de scope**  
   Un agent chargé de planifier ne doit pas implémenter. Un agent chargé de tester ne doit pas réécrire l’architecture. Un agent chargé de relire ne doit pas modifier le code.

4. **Standardiser les workflows récurrents**  
   Les actions fréquentes — plan, implémentation, correction de bug, tests, lint, revue, PR — doivent devenir des routines explicites.

5. **Préserver le contrôle humain**  
   Les tâches à risque doivent rester sous validation humaine, notamment les modifications de code, les suppressions, les changements d’architecture ou les commandes destructrices.

6. **Capitaliser le contexte projet**  
   Les règles propres au projet doivent être portées par des skills ou instructions réutilisables, afin d’éviter de répéter les mêmes consignes à chaque session.

7. **Séparer les opérations mécaniques des opérations cognitives**  
   Les actions réalisables par script, commande ou outil déterministe doivent être exécutées sans mobiliser inutilement de modèle coûteux. Le LLM doit intervenir prioritairement sur l’interprétation du résultat, l’analyse d’un échec, l’arbitrage ou la correction.

---

## 4. Typologie des activités à distinguer

La configuration doit distinguer clairement les familles d’activités suivantes.

### 4.1 Exploration

L’exploration consiste à comprendre le code, identifier les fichiers concernés, retrouver une convention, analyser une structure existante ou préparer le terrain avant une intervention.

Cette activité doit privilégier des modèles économiques, éventuellement locaux, car elle demande surtout de la lecture, du repérage et de la synthèse.

L’agent d’exploration doit être fortement limité : il lit, cherche, résume, mais ne modifie pas.

### 4.2 Planification

La planification est une activité à forte valeur. Elle sert à transformer une demande en stratégie d’intervention : périmètre, fichiers concernés, risques, dépendances, tests, ordre d’exécution.

Cette activité mérite un modèle de raisonnement plus fort, car une mauvaise décision à ce stade coûte cher ensuite.

L’agent de planification doit être interdit de modification. Son rôle est de produire une décision claire, pas de commencer à coder.

### 4.3 Implémentation

L’implémentation consiste à modifier le code selon un plan déjà défini.

Cette activité doit être confiée à un modèle compétent en code, capable de respecter l’architecture existante et de produire des modifications minimales.

L’agent d’implémentation doit être encadré par des règles strictes : ne pas élargir le scope, ne pas refactorer au-delà du besoin, ne pas modifier des zones non concernées, ne pas inventer de conventions.

### 4.4 Correction de bug

La correction de bug doit être séparée de l’implémentation générique.

Un bug demande d’abord un diagnostic : reproduction, hypothèse, cause probable, preuve, correction minimale, test de non-régression.

L’agent chargé des bugs doit être orienté vers la sobriété : corriger le défaut identifié, pas “améliorer” tout ce qu’il voit autour.

### 4.5 Tests

Les tests doivent être considérés comme une activité distincte.

Un agent de test peut contribuer à exécuter ou analyser les résultats de tests, identifier les échecs, distinguer les problèmes de code, de test ou d’environnement, puis proposer une correction.

Mais il ne doit pas systématiquement modifier le code. Dans beaucoup de cas, son premier rôle est d’expliquer l’échec.

L’exécution d’une suite complète de tests ne doit pas entraîner l’envoi systématique de l’intégralité des logs au modèle. Le résultat attendu d’une exécution complète est d’abord un verdict court : succès ou échec, nombre de fichiers concernés, nombre de tests en échec, chemins des fichiers de test pertinents.

### 4.6 Lint, format et vérifications mécaniques

Les tâches mécaniques doivent être traitées avec le moins d’intelligence artificielle possible.

Un linter, un formatter ou une commande de build doivent être prioritairement pilotés par scripts. Le modèle ne doit intervenir que pour analyser un échec, pas pour décider à la place de l’outil.

Ces tâches sont de bons candidats pour des modèles locaux ou économiques.

### 4.7 Règle générale de ségrégation entre action mécanique, interprétation et correction

La règle de ségrégation ne doit pas être limitée aux tests. Elle doit s’appliquer à toutes les actions qui peuvent être réalisées par script, commande, outil projet ou automatisation déterministe.

Par principe, une action ne doit pas être confiée à un LLM si elle peut être exécutée de manière fiable par une commande existante.

Cela concerne notamment :

- tests ;
- lint ;
- format ;
- build ;
- génération de types ;
- vérification de dépendances ;
- extraction de diff ;
- recherche de fichiers ;
- calcul de couverture ;
- génération de rapports techniques ;
- création d’artefacts mécaniques ;
- commandes Git simples ;
- vérifications de structure ou de conventions déjà outillées.

Ces actions doivent être exécutées prioritairement hors LLM, ou par un agent local ou économique disposant uniquement des permissions nécessaires à l’exécution de commandes.

Le rôle du LLM ne doit pas être de remplacer l’outil déterministe, mais d’intervenir lorsque son apport est réellement utile :

- interpréter un résultat ;
- expliquer un échec ;
- formuler une hypothèse ;
- proposer une correction ;
- arbitrer entre plusieurs solutions ;
- relier l’erreur à l’architecture ou aux conventions du projet.

L’exécution complète d’une commande ne doit pas entraîner l’envoi automatique de l’intégralité de sa sortie au contexte LLM. Les sorties longues doivent être filtrées, résumées ou réduites au périmètre utile.

En cas d’échec, une deuxième étape distincte doit isoler le périmètre pertinent :

- commande exécutée ;
- statut de sortie ;
- message d’erreur principal ;
- fichiers ou modules concernés ;
- extrait minimal de log ;
- diff attendu/reçu lorsque disponible ;
- contexte récent de modification si nécessaire ;
- hypothèse de rattachement à une zone du code.

L’analyse doit être déclenchée seulement après échec, sur un volume réduit et pertinent.

La correction doit constituer une troisième étape séparée, avec un agent, un modèle et des permissions adaptés. Elle ne doit intervenir qu’après un diagnostic explicite et une proposition de correction minimale.

La doctrine à respecter est la suivante :

> Exécuter ne signifie pas analyser.  
> Analyser ne signifie pas corriger.  
> Corriger ne signifie pas élargir le scope.

Formulé autrement :

> Ce qui peut être fait par script doit être fait par script.  
> Ce qui doit être compris, arbitré ou corrigé peut être confié au LLM.  
> Le LLM doit travailler sur le résultat utile, pas sur le bruit produit par l’exécution.

Cette règle est centrale pour limiter la consommation de tokens, éviter les corrections hasardeuses et empêcher qu’un agent chargé d’une simple vérification mécanique se transforme en agent de refactoring non contrôlé.

### 4.8 Revue de code

La revue est une activité critique.

Elle doit être confiée à un agent distinct de celui qui a implémenté, afin d’éviter l’auto-validation complaisante.

La revue doit porter sur les risques réels : régression, dette technique, incohérence avec l’architecture, sécurité, maintenabilité, tests absents, dérive de scope.

Elle ne doit pas se limiter à une reformulation positive du travail effectué.

### 4.9 Rédaction de PR ou de changelog

La rédaction de PR est une activité utile mais rarement critique.

Elle peut être confiée à un modèle simple ou intermédiaire, à condition qu’il s’appuie sur le diff réel, le plan initial et les tests exécutés.

Le texte de PR doit rester factuel : ce qui a été changé, pourquoi, comment tester, risques éventuels.

---

## 5. Doctrine de choix des modèles

Le choix du modèle doit suivre une logique d’arbitrage.

### 5.1 Modèles locaux

Les modèles locaux doivent être privilégiés pour :

- exploration simple ;
- résumé de logs ;
- analyse de sorties de tests ;
- préparation de listes de fichiers ;
- tâches répétitives ;
- reformulations non critiques ;
- vérifications à faible risque ;
- pilotage ou synthèse d’opérations mécaniques ;
- diagnostic simple sur logs courts.

Ils sont intéressants quand la qualité attendue est correcte mais que le coût doit rester faible.

Ils ne doivent pas être utilisés pour prendre seuls des décisions d’architecture majeures, modifier des zones sensibles ou arbitrer des refactorings complexes.

### 5.2 Modèles distants simples ou intermédiaires

Les modèles distants simples ou intermédiaires doivent être utilisés pour :

- rédaction de PR ;
- synthèse de diff ;
- petites corrections ;
- diagnostic de tests lisibles ;
- aide à la documentation ;
- tâches standards avec peu d’ambiguïté ;
- correction ciblée après diagnostic clair.

Ils offrent un bon compromis entre fiabilité, rapidité et coût.

### 5.3 Modèles de raisonnement avancé

Les modèles de raisonnement avancé doivent être réservés à :

- cadrage d’architecture ;
- refactoring complexe ;
- bug difficile à reproduire ;
- arbitrage entre plusieurs solutions ;
- conception de plan d’implémentation ;
- revue critique avant merge ;
- décisions qui engagent la maintenabilité long terme ;
- analyse d’échecs persistants après plusieurs diagnostics simples.

Ces modèles doivent être utilisés moins souvent, mais mieux.

Ils ne doivent pas être mobilisés par défaut pour exécuter une suite de tests, lire des logs volumineux, lancer un linter ou rédiger une PR simple.

### 5.4 Modèles spécialisés code

Les modèles spécialisés code doivent être privilégiés pour :

- implémentation ;
- refactoring localisé ;
- écriture ou adaptation de tests ;
- correction de bug confirmée ;
- migration technique ;
- compréhension fine d’une base existante.

Leur usage doit rester encadré par un plan ou une demande précise.

---

## 6. Règles de séparation des responsabilités

La configuration doit éviter les agents “tout-puissants”.

Chaque agent doit avoir une responsabilité principale claire :

- un agent de planification ne modifie pas ;
- un agent d’implémentation suit un plan ;
- un agent de test exécute ou diagnostique avant de corriger ;
- un agent de vérification mécanique ne modifie pas le code ;
- un agent d’analyse d’échec ne corrige pas sans validation ou commande dédiée ;
- un agent de correction applique une correction minimale ;
- un agent de revue ne valide pas son propre travail ;
- un agent documentaire ne change pas le comportement applicatif ;
- un agent local économique ne prend pas de décision d’architecture majeure.

Cette séparation est plus importante que le choix exact du modèle.

Un mauvais découpage des rôles fera gaspiller plus de tokens qu’un mauvais choix ponctuel de modèle.

La séparation minimale à garantir est :

1. **préparer ou planifier** ;
2. **implémenter** ;
3. **exécuter les vérifications** ;
4. **analyser les échecs** ;
5. **corriger de manière ciblée** ;
6. **relire avant intégration**.

---

## 7. Gouvernance des permissions

Les permissions doivent être pensées selon le risque de l’activité.

Une tâche de lecture doit avoir un accès en lecture seule.

Une tâche de planification ne doit pas pouvoir modifier le code.

Une tâche d’implémentation peut modifier, mais dans un périmètre cadré.

Une tâche de test peut exécuter des commandes, mais ne doit pas nécessairement pouvoir modifier.

Une tâche de diagnostic peut lire les fichiers concernés et les logs ciblés, mais ne doit pas automatiquement écrire dans le code.

Une tâche de correction peut modifier, mais seulement après diagnostic et dans un périmètre explicitement limité.

Une tâche de revue doit pouvoir lire le diff, les fichiers concernés et les tests, mais ne doit pas écrire.

Cette logique doit être utilisée comme un garde-fou, pas seulement comme une commodité.

---

## 8. Rôle des skills

Les skills ne doivent pas être utilisés comme des workflows.

Ils doivent plutôt contenir la connaissance durable du projet :

- conventions d’architecture ;
- règles de nommage ;
- conventions de tests ;
- stratégie i18n ;
- règles de documentation ;
- principes de découpage des issues ;
- règles propres au framework utilisé ;
- décisions d’architecture déjà prises ;
- erreurs récurrentes à éviter ;
- règles de diagnostic des tests ;
- règles de sobriété sur les logs et sorties de commandes.

Un bon skill doit être court, ciblé, actionnable et maintenable.

Un mauvais skill devient un fourre-tout qui surcharge le contexte et affaiblit la qualité des réponses.

La logique recommandée est donc :

> Les agents exécutent des rôles.  
> Les commandes déclenchent des actions.  
> Les skills apportent le savoir projet.  
> Les permissions encadrent le risque.

---

## 9. Rôle des commandes

Les commandes doivent formaliser les activités récurrentes.

Elles servent à éviter de réécrire les mêmes prompts et à standardiser la qualité attendue.

Chaque commande doit exprimer :

- l’objectif ;
- le résultat attendu ;
- les limites ;
- les critères de réussite ;
- le niveau d’autonomie autorisé ;
- le type d’agent ou de modèle adapté ;
- le type de sortie attendue ;
- la règle d’escalade éventuelle vers un autre agent ou modèle.

Les commandes doivent rester orientées métier d’usage, pas technologie interne.

Exemples de familles de commandes à prévoir :

- préparer un plan ;
- cadrer une issue ;
- corriger un bug ;
- implémenter un plan ;
- exécuter les tests ;
- analyser un échec de test ;
- lancer le lint ;
- analyser un échec de lint ;
- relire un diff ;
- préparer une PR ;
- mettre à jour une documentation projet.

Les commandes de vérification doivent distinguer clairement :

- l’exécution complète ;
- l’isolation des échecs ;
- l’analyse ciblée ;
- la correction ;
- la relance de validation.

Cette distinction doit empêcher qu’une seule commande ou qu’un seul agent ne fasse tout le cycle sans contrôle.

---

## 10. Rôle des hooks et plugins

Les hooks et plugins ne doivent pas devenir le cœur du système.

Ils doivent être réservés à des usages transverses :

- appliquer des règles de sécurité ;
- empêcher l’accès à certains fichiers ;
- journaliser les modèles utilisés ;
- suivre les coûts ou durées ;
- vérifier qu’une commande critique demande validation ;
- déclencher une action mécanique après modification ;
- intégrer un outil externe ;
- limiter ou filtrer les sorties longues avant transmission au modèle ;
- empêcher l’envoi automatique de logs volumineux au contexte LLM.

La règle est simple :  
si la logique relève d’un **workflow humain**, elle doit plutôt être portée par des commandes et agents.  
Si la logique relève d’un **contrôle automatique transversal**, elle peut être portée par un hook ou plugin.

---

## 11. Critères d’arbitrage pour choisir le bon agent

Avant de lancer une tâche, le système doit pouvoir répondre à ces questions :

1. La tâche demande-t-elle de modifier le code ?
2. La tâche engage-t-elle l’architecture ?
3. Le résultat attendu est-il exploratoire ou exécutable ?
4. Le coût d’une erreur est-il faible, moyen ou élevé ?
5. La tâche est-elle répétitive ou exceptionnelle ?
6. Peut-elle être traitée par un modèle local ?
7. Faut-il un modèle de raisonnement ?
8. Faut-il un modèle spécialisé code ?
9. Faut-il une validation humaine avant action ?
10. Le contexte projet doit-il être chargé via un skill ?
11. La tâche consiste-t-elle seulement à exécuter une commande ?
12. Le modèle doit-il lire les logs complets ou seulement un extrait ciblé ?
13. L’échec est-il simple, persistant, ambigu ou architectural ?
14. L’agent doit-il diagnostiquer ou corriger ?
15. La correction minimale est-elle suffisamment claire pour autoriser une modification ?

Ces questions doivent guider la configuration, pas l’inverse.

---

## 12. Critères d’évaluation de la configuration

La configuration sera considérée comme efficace si elle permet de constater :

- moins de prompts manuels répétés ;
- moins d’usage des modèles coûteux sur des tâches simples ;
- moins de dérives de scope ;
- meilleure qualité des plans ;
- meilleure lisibilité des PR ;
- meilleure séparation entre diagnostic et correction ;
- meilleure reproductibilité des workflows ;
- moins de corrections humaines après passage du LLM ;
- meilleure traçabilité des décisions ;
- meilleur usage des skills projet ;
- moins de logs inutiles transmis au contexte ;
- meilleure isolation des tests en échec ;
- meilleure capacité à escalader vers un modèle plus fort uniquement lorsque c’est justifié.

Le critère principal n’est pas la sophistication de la configuration.  
Le critère principal est la **réduction du bruit opérationnel**.

---

## 13. Risques à éviter

### 13.1 Sur-orchestration

Le risque principal est de construire trop tôt une usine à gaz.

Il faut commencer par quelques agents et commandes bien conçus, puis enrichir progressivement.

### 13.2 Agents trop larges

Un agent qui sait tout faire finit par mal faire beaucoup de choses.

Les agents doivent être spécialisés, mais pas proliférants.

### 13.3 Skills trop longs

Un skill trop complet peut devenir contre-productif.

Il doit contenir les règles réellement utiles au moment de l’action.

### 13.4 Automatisation excessive

Tout ne doit pas être automatisé.

Les décisions d’architecture, les changements de comportement, les suppressions et les refactorings importants doivent rester sous contrôle humain.

### 13.5 Modèle puissant utilisé par défaut

Utiliser systématiquement le meilleur modèle est une mauvaise stratégie économique.

Le modèle fort doit être une exception justifiée, pas le mode normal.

### 13.6 Transmission excessive de logs

Les logs complets de tests, lint ou build peuvent consommer inutilement du contexte et détourner le modèle de l’information utile.

Le système doit privilégier les sorties courtes, les erreurs ciblées et les relances limitées aux tests ou fichiers en échec.

### 13.7 Confusion entre diagnostic et correction

Un diagnostic ne doit pas déclencher automatiquement une modification.

La correction doit être une étape distincte, explicitement autorisée, avec une attente de correction minimale.

---

## 14. Niveau d’ambition recommandé

La cible raisonnable n’est pas une orchestration autonome complète.

La cible recommandée est une **orchestration assistée**, dans laquelle :

- l’utilisateur choisit l’intention ;
- OpenCode sélectionne ou applique le bon agent ;
- les skills apportent le contexte projet ;
- les permissions limitent les risques ;
- les modèles coûteux sont réservés aux tâches à forte valeur ;
- les commandes standardisent les routines ;
- les revues restent explicites ;
- les opérations mécaniques restent sobres ;
- les analyses sont déclenchées seulement lorsque les résultats le justifient.

L’autonomie doit augmenter seulement lorsque les routines sont stables et observées comme fiables.

---

## 15. Recommandation de déploiement progressif

La mise en place doit être progressive.

### Phase 1 — Clarifier les usages

Identifier les 6 à 10 activités réellement fréquentes.

Ne pas configurer des agents pour des cas rares.

### Phase 2 — Séparer les rôles

Créer une première cartographie des responsabilités :

- lire ;
- planifier ;
- implémenter ;
- exécuter ;
- analyser ;
- corriger ;
- relire ;
- documenter ;
- préparer une PR.

### Phase 3 — Associer les niveaux de modèles

Définir pour chaque activité le niveau de modèle attendu :

- aucun modèle lorsque l’action est purement mécanique ;
- local ;
- distant économique ;
- distant spécialisé code ;
- raisonnement fort.

### Phase 4 — Formaliser les commandes

Créer des commandes courtes, stables, réutilisables.

Chaque commande doit exprimer ce qu’elle fait et ce qu’elle ne doit pas faire.

Les commandes de test, lint et build doivent éviter de mélanger exécution, analyse et correction.

### Phase 5 — Structurer les skills

Transformer les règles récurrentes du projet en skills spécialisés.

Les skills doivent rester modulaires.

Ils doivent inclure les conventions projet, mais aussi les règles de sobriété applicables aux sorties de commandes, tests et diagnostics.

### Phase 6 — Ajouter des garde-fous

Mettre en place les restrictions de permissions adaptées.

Les permissions doivent refléter le niveau de risque.

Les agents chargés d’exécuter des vérifications mécaniques doivent pouvoir exécuter les commandes nécessaires, mais ne doivent pas avoir par défaut le droit de modifier le code.

### Phase 7 — Mesurer et ajuster

Observer les résultats :

- quelle commande marche bien ;
- quel agent dérive ;
- quel modèle est surdimensionné ;
- quelle tâche demande un modèle plus fort ;
- quel skill est inutile ;
- quelle règle manque ;
- quels logs sont encore trop volumineux ;
- quels échecs justifient réellement une escalade.

---

## 16. Synthèse exécutive

La configuration OpenCode doit être pensée comme une organisation du travail entre plusieurs profils d’assistants, et non comme un simple fichier de préférences de modèles.

Le bon objectif n’est pas d’automatiser tout le développement.  
Le bon objectif est de rendre chaque interaction plus précise, plus sobre et plus fiable.

La stratégie recommandée est :

> standardiser les actions fréquentes, spécialiser les agents, réserver les modèles puissants aux décisions importantes, utiliser les skills pour le contexte projet, maintenir une validation humaine sur les actions à risque, et séparer strictement l’exécution mécanique, l’analyse et la correction.

C’est cette discipline qui permettra d’obtenir le meilleur compromis entre coût, qualité, contrôle et vélocité.

La règle structurante à retenir est simple :

> Exécuter ≠ analyser ≠ corriger.

Elle peut être généralisée ainsi :

> Script d’abord.  
> LLM ensuite, uniquement si le résultat mérite interprétation, arbitrage ou correction.

C’est cette règle qui doit guider en priorité la conception des agents, des commandes, des permissions et des choix de modèles.


## 2. Principe directeur

La configuration OpenCode doit être organisée autour d’une idée centrale :

> Chaque activité doit être confiée à un profil d’agent adapté, avec le modèle le plus économique capable de produire un résultat fiable.

Cela implique de ne pas raisonner uniquement en termes de “meilleur modèle”, mais en termes de **rapport coût / risque / complexité / valeur produite**.

Un modèle très puissant est pertinent pour analyser une architecture, préparer un plan de refactoring ou résoudre un bug complexe. Il est beaucoup moins pertinent pour lancer un linter, résumer une erreur triviale ou rédiger une PR simple.

La configuration cible doit donc favoriser une logique de **sobriété raisonnée** : utiliser le niveau d’intelligence nécessaire, mais pas davantage.

---

## 3. Objectifs opérationnels

La configuration cible doit permettre de :

1. **Réduire la consommation inutile de tokens**  
   Les modèles coûteux doivent être réservés aux tâches où leur valeur ajoutée est réelle.

2. **Améliorer la qualité des résultats**  
   Chaque tâche doit être confiée à un agent dont le rôle est clair, limité et cohérent.

3. **Limiter les dérives de scope**  
   Un agent chargé de planifier ne doit pas implémenter. Un agent chargé de tester ne doit pas réécrire l’architecture. Un agent chargé de relire ne doit pas modifier le code.

4. **Standardiser les workflows récurrents**  
   Les actions fréquentes — plan, implémentation, correction de bug, tests, lint, revue, PR — doivent devenir des routines explicites.

5. **Préserver le contrôle humain**  
   Les tâches à risque doivent rester sous validation humaine, notamment les modifications de code, les suppressions, les changements d’architecture ou les commandes destructrices.

6. **Capitaliser le contexte projet**  
   Les règles propres au projet doivent être portées par des skills ou instructions réutilisables, afin d’éviter de répéter les mêmes consignes à chaque session.

7. **Séparer les opérations mécaniques des opérations cognitives**  
   L’exécution d’une commande, l’analyse de son résultat et la correction d’un problème doivent être considérées comme trois activités différentes.

---

## 4. Typologie des activités à distinguer

La configuration doit distinguer clairement les familles d’activités suivantes.

### 4.1 Exploration

L’exploration consiste à comprendre le code, identifier les fichiers concernés, retrouver une convention, analyser une structure existante ou préparer le terrain avant une intervention.

Cette activité doit privilégier des modèles économiques, éventuellement locaux, car elle demande surtout de la lecture, du repérage et de la synthèse.

L’agent d’exploration doit être fortement limité : il lit, cherche, résume, mais ne modifie pas.

### 4.2 Planification

La planification est une activité à forte valeur. Elle sert à transformer une demande en stratégie d’intervention : périmètre, fichiers concernés, risques, dépendances, tests, ordre d’exécution.

Cette activité mérite un modèle de raisonnement plus fort, car une mauvaise décision à ce stade coûte cher ensuite.

L’agent de planification doit être interdit de modification. Son rôle est de produire une décision claire, pas de commencer à coder.

### 4.3 Implémentation

L’implémentation consiste à modifier le code selon un plan déjà défini.

Cette activité doit être confiée à un modèle compétent en code, capable de respecter l’architecture existante et de produire des modifications minimales.

L’agent d’implémentation doit être encadré par des règles strictes : ne pas élargir le scope, ne pas refactorer au-delà du besoin, ne pas modifier des zones non concernées, ne pas inventer de conventions.

### 4.4 Correction de bug

La correction de bug doit être séparée de l’implémentation générique.

Un bug demande d’abord un diagnostic : reproduction, hypothèse, cause probable, preuve, correction minimale, test de non-régression.

L’agent chargé des bugs doit être orienté vers la sobriété : corriger le défaut identifié, pas “améliorer” tout ce qu’il voit autour.

### 4.5 Tests

Les tests doivent être considérés comme une activité distincte.

Un agent de test peut contribuer à exécuter ou analyser les résultats de tests, identifier les échecs, distinguer les problèmes de code, de test ou d’environnement, puis proposer une correction.

Mais il ne doit pas systématiquement modifier le code. Dans beaucoup de cas, son premier rôle est d’expliquer l’échec.

L’exécution d’une suite complète de tests ne doit pas entraîner l’envoi systématique de l’intégralité des logs au modèle. Le résultat attendu d’une exécution complète est d’abord un verdict court : succès ou échec, nombre de fichiers concernés, nombre de tests en échec, chemins des fichiers de test pertinents.

### 4.6 Lint, format et vérifications mécaniques

Les tâches mécaniques doivent être traitées avec le moins d’intelligence artificielle possible.

Un linter, un formatter ou une commande de build doivent être prioritairement pilotés par scripts. Le modèle ne doit intervenir que pour analyser un échec, pas pour décider à la place de l’outil.

Ces tâches sont de bons candidats pour des modèles locaux ou économiques.

### 4.7 Règle de ségrégation entre exécution, analyse et correction

Les commandes de test, lint, build, format et vérification doivent être considérées comme des opérations mécaniques.

Elles doivent être exécutées prioritairement hors LLM, ou par un agent local ou économique disposant uniquement des permissions nécessaires à l’exécution de commandes.

L’exécution complète d’une suite de tests, d’un lint ou d’un build ne doit pas entraîner l’envoi automatique de l’intégralité des logs au contexte LLM. Les sorties longues doivent être filtrées, résumées ou réduites au périmètre utile.

En cas d’échec, une deuxième étape distincte doit isoler le périmètre pertinent :

- fichier ou fichiers de test en échec ;
- nom des tests concernés ;
- erreur principale ;
- diff attendu/reçu lorsque disponible ;
- stack trace minimale ;
- fichiers métier probablement liés ;
- contexte récent de modification si nécessaire.

L’analyse des logs doit être déclenchée seulement après échec, sur un volume réduit et pertinent.

La correction doit constituer une troisième étape séparée, avec un agent, un modèle et des permissions adaptés. Elle ne doit intervenir qu’après un diagnostic explicite et une proposition de correction minimale.

La doctrine à respecter est la suivante :

> Exécuter ne signifie pas analyser.  
> Analyser ne signifie pas corriger.  
> Corriger ne signifie pas élargir le scope.

Cette règle est centrale pour limiter la consommation de tokens, éviter les corrections hasardeuses et empêcher qu’un agent chargé d’une simple vérification mécanique se transforme en agent de refactoring non contrôlé.

### 4.8 Revue de code

La revue est une activité critique.

Elle doit être confiée à un agent distinct de celui qui a implémenté, afin d’éviter l’auto-validation complaisante.

La revue doit porter sur les risques réels : régression, dette technique, incohérence avec l’architecture, sécurité, maintenabilité, tests absents, dérive de scope.

Elle ne doit pas se limiter à une reformulation positive du travail effectué.

### 4.9 Rédaction de PR ou de changelog

La rédaction de PR est une activité utile mais rarement critique.

Elle peut être confiée à un modèle simple ou intermédiaire, à condition qu’il s’appuie sur le diff réel, le plan initial et les tests exécutés.

Le texte de PR doit rester factuel : ce qui a été changé, pourquoi, comment tester, risques éventuels.

---

## 5. Doctrine de choix des modèles

Le choix du modèle doit suivre une logique d’arbitrage.

### 5.1 Modèles locaux

Les modèles locaux doivent être privilégiés pour :

- exploration simple ;
- résumé de logs ;
- analyse de sorties de tests ;
- préparation de listes de fichiers ;
- tâches répétitives ;
- reformulations non critiques ;
- vérifications à faible risque ;
- pilotage ou synthèse d’opérations mécaniques ;
- diagnostic simple sur logs courts.

Ils sont intéressants quand la qualité attendue est correcte mais que le coût doit rester faible.

Ils ne doivent pas être utilisés pour prendre seuls des décisions d’architecture majeures, modifier des zones sensibles ou arbitrer des refactorings complexes.

### 5.2 Modèles distants simples ou intermédiaires

Les modèles distants simples ou intermédiaires doivent être utilisés pour :

- rédaction de PR ;
- synthèse de diff ;
- petites corrections ;
- diagnostic de tests lisibles ;
- aide à la documentation ;
- tâches standards avec peu d’ambiguïté ;
- correction ciblée après diagnostic clair.

Ils offrent un bon compromis entre fiabilité, rapidité et coût.

### 5.3 Modèles de raisonnement avancé

Les modèles de raisonnement avancé doivent être réservés à :

- cadrage d’architecture ;
- refactoring complexe ;
- bug difficile à reproduire ;
- arbitrage entre plusieurs solutions ;
- conception de plan d’implémentation ;
- revue critique avant merge ;
- décisions qui engagent la maintenabilité long terme ;
- analyse d’échecs persistants après plusieurs diagnostics simples.

Ces modèles doivent être utilisés moins souvent, mais mieux.

Ils ne doivent pas être mobilisés par défaut pour exécuter une suite de tests, lire des logs volumineux, lancer un linter ou rédiger une PR simple.

### 5.4 Modèles spécialisés code

Les modèles spécialisés code doivent être privilégiés pour :

- implémentation ;
- refactoring localisé ;
- écriture ou adaptation de tests ;
- correction de bug confirmée ;
- migration technique ;
- compréhension fine d’une base existante.

Leur usage doit rester encadré par un plan ou une demande précise.

---

## 6. Règles de séparation des responsabilités

La configuration doit éviter les agents “tout-puissants”.

Chaque agent doit avoir une responsabilité principale claire :

- un agent de planification ne modifie pas ;
- un agent d’implémentation suit un plan ;
- un agent de test exécute ou diagnostique avant de corriger ;
- un agent de vérification mécanique ne modifie pas le code ;
- un agent d’analyse d’échec ne corrige pas sans validation ou commande dédiée ;
- un agent de correction applique une correction minimale ;
- un agent de revue ne valide pas son propre travail ;
- un agent documentaire ne change pas le comportement applicatif ;
- un agent local économique ne prend pas de décision d’architecture majeure.

Cette séparation est plus importante que le choix exact du modèle.

Un mauvais découpage des rôles fera gaspiller plus de tokens qu’un mauvais choix ponctuel de modèle.

La séparation minimale à garantir est :

1. **préparer ou planifier** ;
2. **implémenter** ;
3. **exécuter les vérifications** ;
4. **analyser les échecs** ;
5. **corriger de manière ciblée** ;
6. **relire avant intégration**.

---

## 7. Gouvernance des permissions

Les permissions doivent être pensées selon le risque de l’activité.

Une tâche de lecture doit avoir un accès en lecture seule.

Une tâche de planification ne doit pas pouvoir modifier le code.

Une tâche d’implémentation peut modifier, mais dans un périmètre cadré.

Une tâche de test peut exécuter des commandes, mais ne doit pas nécessairement pouvoir modifier.

Une tâche de diagnostic peut lire les fichiers concernés et les logs ciblés, mais ne doit pas automatiquement écrire dans le code.

Une tâche de correction peut modifier, mais seulement après diagnostic et dans un périmètre explicitement limité.

Une tâche de revue doit pouvoir lire le diff, les fichiers concernés et les tests, mais ne doit pas écrire.

Cette logique doit être utilisée comme un garde-fou, pas seulement comme une commodité.

---

## 8. Rôle des skills

Les skills ne doivent pas être utilisés comme des workflows.

Ils doivent plutôt contenir la connaissance durable du projet :

- conventions d’architecture ;
- règles de nommage ;
- conventions de tests ;
- stratégie i18n ;
- règles de documentation ;
- principes de découpage des issues ;
- règles propres au framework utilisé ;
- décisions d’architecture déjà prises ;
- erreurs récurrentes à éviter ;
- règles de diagnostic des tests ;
- règles de sobriété sur les logs et sorties de commandes.

Un bon skill doit être court, ciblé, actionnable et maintenable.

Un mauvais skill devient un fourre-tout qui surcharge le contexte et affaiblit la qualité des réponses.

La logique recommandée est donc :

> Les agents exécutent des rôles.  
> Les commandes déclenchent des actions.  
> Les skills apportent le savoir projet.  
> Les permissions encadrent le risque.

---

## 9. Rôle des commandes

Les commandes doivent formaliser les activités récurrentes.

Elles servent à éviter de réécrire les mêmes prompts et à standardiser la qualité attendue.

Chaque commande doit exprimer :

- l’objectif ;
- le résultat attendu ;
- les limites ;
- les critères de réussite ;
- le niveau d’autonomie autorisé ;
- le type d’agent ou de modèle adapté ;
- le type de sortie attendue ;
- la règle d’escalade éventuelle vers un autre agent ou modèle.

Les commandes doivent rester orientées métier d’usage, pas technologie interne.

Exemples de familles de commandes à prévoir :

- préparer un plan ;
- cadrer une issue ;
- corriger un bug ;
- implémenter un plan ;
- exécuter les tests ;
- analyser un échec de test ;
- lancer le lint ;
- analyser un échec de lint ;
- relire un diff ;
- préparer une PR ;
- mettre à jour une documentation projet.

Les commandes de vérification doivent distinguer clairement :

- l’exécution complète ;
- l’isolation des échecs ;
- l’analyse ciblée ;
- la correction ;
- la relance de validation.

Cette distinction doit empêcher qu’une seule commande ou qu’un seul agent ne fasse tout le cycle sans contrôle.

---

## 10. Rôle des hooks et plugins

Les hooks et plugins ne doivent pas devenir le cœur du système.

Ils doivent être réservés à des usages transverses :

- appliquer des règles de sécurité ;
- empêcher l’accès à certains fichiers ;
- journaliser les modèles utilisés ;
- suivre les coûts ou durées ;
- vérifier qu’une commande critique demande validation ;
- déclencher une action mécanique après modification ;
- intégrer un outil externe ;
- limiter ou filtrer les sorties longues avant transmission au modèle ;
- empêcher l’envoi automatique de logs volumineux au contexte LLM.

La règle est simple :  
si la logique relève d’un **workflow humain**, elle doit plutôt être portée par des commandes et agents.  
Si la logique relève d’un **contrôle automatique transversal**, elle peut être portée par un hook ou plugin.

---

## 11. Critères d’arbitrage pour choisir le bon agent

Avant de lancer une tâche, le système doit pouvoir répondre à ces questions :

1. La tâche demande-t-elle de modifier le code ?
2. La tâche engage-t-elle l’architecture ?
3. Le résultat attendu est-il exploratoire ou exécutable ?
4. Le coût d’une erreur est-il faible, moyen ou élevé ?
5. La tâche est-elle répétitive ou exceptionnelle ?
6. Peut-elle être traitée par un modèle local ?
7. Faut-il un modèle de raisonnement ?
8. Faut-il un modèle spécialisé code ?
9. Faut-il une validation humaine avant action ?
10. Le contexte projet doit-il être chargé via un skill ?
11. La tâche consiste-t-elle seulement à exécuter une commande ?
12. Le modèle doit-il lire les logs complets ou seulement un extrait ciblé ?
13. L’échec est-il simple, persistant, ambigu ou architectural ?
14. L’agent doit-il diagnostiquer ou corriger ?
15. La correction minimale est-elle suffisamment claire pour autoriser une modification ?

Ces questions doivent guider la configuration, pas l’inverse.

---

## 12. Critères d’évaluation de la configuration

La configuration sera considérée comme efficace si elle permet de constater :

- moins de prompts manuels répétés ;
- moins d’usage des modèles coûteux sur des tâches simples ;
- moins de dérives de scope ;
- meilleure qualité des plans ;
- meilleure lisibilité des PR ;
- meilleure séparation entre diagnostic et correction ;
- meilleure reproductibilité des workflows ;
- moins de corrections humaines après passage du LLM ;
- meilleure traçabilité des décisions ;
- meilleur usage des skills projet ;
- moins de logs inutiles transmis au contexte ;
- meilleure isolation des tests en échec ;
- meilleure capacité à escalader vers un modèle plus fort uniquement lorsque c’est justifié.

Le critère principal n’est pas la sophistication de la configuration.  
Le critère principal est la **réduction du bruit opérationnel**.

---

## 13. Risques à éviter

### 13.1 Sur-orchestration

Le risque principal est de construire trop tôt une usine à gaz.

Il faut commencer par quelques agents et commandes bien conçus, puis enrichir progressivement.

### 13.2 Agents trop larges

Un agent qui sait tout faire finit par mal faire beaucoup de choses.

Les agents doivent être spécialisés, mais pas proliférants.

### 13.3 Skills trop longs

Un skill trop complet peut devenir contre-productif.

Il doit contenir les règles réellement utiles au moment de l’action.

### 13.4 Automatisation excessive

Tout ne doit pas être automatisé.

Les décisions d’architecture, les changements de comportement, les suppressions et les refactorings importants doivent rester sous contrôle humain.

### 13.5 Modèle puissant utilisé par défaut

Utiliser systématiquement le meilleur modèle est une mauvaise stratégie économique.

Le modèle fort doit être une exception justifiée, pas le mode normal.

### 13.6 Transmission excessive de logs

Les logs complets de tests, lint ou build peuvent consommer inutilement du contexte et détourner le modèle de l’information utile.

Le système doit privilégier les sorties courtes, les erreurs ciblées et les relances limitées aux tests ou fichiers en échec.

### 13.7 Confusion entre diagnostic et correction

Un diagnostic ne doit pas déclencher automatiquement une modification.

La correction doit être une étape distincte, explicitement autorisée, avec une attente de correction minimale.

---

## 14. Niveau d’ambition recommandé

La cible raisonnable n’est pas une orchestration autonome complète.

La cible recommandée est une **orchestration assistée**, dans laquelle :

- l’utilisateur choisit l’intention ;
- OpenCode sélectionne ou applique le bon agent ;
- les skills apportent le contexte projet ;
- les permissions limitent les risques ;
- les modèles coûteux sont réservés aux tâches à forte valeur ;
- les commandes standardisent les routines ;
- les revues restent explicites ;
- les opérations mécaniques restent sobres ;
- les analyses sont déclenchées seulement lorsque les résultats le justifient.

L’autonomie doit augmenter seulement lorsque les routines sont stables et observées comme fiables.

---

## 15. Recommandation de déploiement progressif

La mise en place doit être progressive.

### Phase 1 — Clarifier les usages

Identifier les 6 à 10 activités réellement fréquentes.

Ne pas configurer des agents pour des cas rares.

### Phase 2 — Séparer les rôles

Créer une première cartographie des responsabilités :

- lire ;
- planifier ;
- implémenter ;
- exécuter ;
- analyser ;
- corriger ;
- relire ;
- documenter ;
- préparer une PR.

### Phase 3 — Associer les niveaux de modèles

Définir pour chaque activité le niveau de modèle attendu :

- aucun modèle lorsque l’action est purement mécanique ;
- local ;
- distant économique ;
- distant spécialisé code ;
- raisonnement fort.

### Phase 4 — Formaliser les commandes

Créer des commandes courtes, stables, réutilisables.

Chaque commande doit exprimer ce qu’elle fait et ce qu’elle ne doit pas faire.

Les commandes de test, lint et build doivent éviter de mélanger exécution, analyse et correction.

### Phase 5 — Structurer les skills

Transformer les règles récurrentes du projet en skills spécialisés.

Les skills doivent rester modulaires.

Ils doivent inclure les conventions projet, mais aussi les règles de sobriété applicables aux sorties de commandes, tests et diagnostics.

### Phase 6 — Ajouter des garde-fous

Mettre en place les restrictions de permissions adaptées.

Les permissions doivent refléter le niveau de risque.

Les agents chargés d’exécuter des vérifications mécaniques doivent pouvoir exécuter les commandes nécessaires, mais ne doivent pas avoir par défaut le droit de modifier le code.

### Phase 7 — Mesurer et ajuster

Observer les résultats :

- quelle commande marche bien ;
- quel agent dérive ;
- quel modèle est surdimensionné ;
- quelle tâche demande un modèle plus fort ;
- quel skill est inutile ;
- quelle règle manque ;
- quels logs sont encore trop volumineux ;
- quels échecs justifient réellement une escalade.

---

## 16. Synthèse exécutive

La configuration OpenCode doit être pensée comme une organisation du travail entre plusieurs profils d’assistants, et non comme un simple fichier de préférences de modèles.

Le bon objectif n’est pas d’automatiser tout le développement.  
Le bon objectif est de rendre chaque interaction plus précise, plus sobre et plus fiable.

La stratégie recommandée est :

> standardiser les actions fréquentes, spécialiser les agents, réserver les modèles puissants aux décisions importantes, utiliser les skills pour le contexte projet, maintenir une validation humaine sur les actions à risque, et séparer strictement l’exécution mécanique, l’analyse et la correction.

C’est cette discipline qui permettra d’obtenir le meilleur compromis entre coût, qualité, contrôle et vélocité.

---

## 17. Doctrine cible validée — Issue #267

Cette section formalise la doctrine cible validée par l’issue [#267](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/267). Elle extrait les principes normatifs du présent document et les complète par la matrice des usages fréquents, les niveaux de risque, d’autonomie et les types d’agent attendus.

### 17.1. Principes doctrinaux

1. **Orchestration assistée** — OpenCode assiste l’utilisateur, ne le remplace pas. Les décisions d’architecture, les modifications de code, les suppressions et les opérations Git critiques restent sous validation humaine.
2. **Séparation des rôles** — Un agent de planification ne modifie pas le code. Un agent d’implémentation suit un plan. Un agent de revue ne valide pas son propre travail. Un agent de test diagnostique avant de corriger.
3. **Permissions alignées sur le risque** — Les tâches à risque élevé (code, architecture, Git) exigent une validation humaine explicite. Les tâches à faible risque (lecture, recherche, documentation) peuvent être déléguées avec une autonomie plus large.
4. **Commandes pour les routines, skills pour le savoir** — Les commandes standardisent les workflows récurrents. Les skills portent la connaissance durable du projet (conventions, architecture, patterns, pièges).
5. **Modèle adapté au besoin** — Les modèles de raisonnement avancé sont réservés aux décisions d’architecture, plans complexes et revues critiques. Les modèles économiques ou locaux suffisent pour l’exploration, les tâches mécaniques et les reformulations.

### 17.2. Matrice des usages fréquents

| Activité | Risque | Autonomie | Type d’agent | Skill existant | Validation humaine |
|---|---|---|---|---|---|
| Créer des issues depuis un cadrage | Moyen | Assistée | Planification / Découpage | `to-issues` | Oui — contenu des issues |
| Créer un plan depuis une issue | Moyen | Assistée | Planification | `plan-depuis-issue` | Oui — plan validé |
| Écrire un plan dans `documentation/plan/` | Faible | Assistée | Documentation | `ecrire-plan-fichier` | Non |
| Implémenter un plan | Élevé | Assistée | Implémentation | `implementer-depuis-plan` | Oui — code et tests |
| Diagnostiquer / corriger un bug | Élevé | Assistée | Correction | Partiellement `implementer-depuis-plan` | Oui — fix et tests |
| Exécuter et analyser des tests | Faible | Lecture seule ou assistée | Test | Aucun | Non — résultat suffit |
| Relire un diff / revue de code | Élevé | Lecture seule | Revue | Aucun | Oui — approbation |
| Préparer / créer une PR | Moyen | Assistée | Documentation | `my-pull-requests` (lister seulement) | Oui — PR à valider |
| Mettre à jour une documentation projet | Faible | Assistée | Documentation | Aucun | Non |
| Lancer des vérifications mécaniques | Faible | Automatique (script) | Script | Aucun | Non |

### 17.3. Niveaux de risque — Définition

| Niveau | Exemples | Exigence |
|---|---|---|
| **Faible** | Documentation, lint, tests automatisés, exploration | Autonomie large, contrôle minimal |
| **Moyen** | Planification, issues, PR, refactor localisé | Autonomie assistée, validation humaine recommandée |
| **Élevé** | Implémentation, architecture, Git destructeur, suppression | Validation humaine obligatoire avant action |

### 17.4. Écarts identifiés par l’audit des skills

L’audit des skills existants (cf. documentation/plan/llm/267-audit-skills-opencode.md) révèle les écarts suivants :

1. **`my-pull-requests`** — Le skill liste les PR mais ne permet pas d’en créer. Or l’usage attendu “préparer/créer une PR” n’est pas couvert. **Action** : créer ou étendre un skill de création de PR.
2. **`ecrire-plan-fichier`** — Ce skill est une opération mécanique d’écriture. Il correspond davantage au rôle d’une **commande** que d’un skill porteur de connaissance. **Action** : évaluer sa transformation en commande dans un ticket ultérieur.
3. **Activités non couvertes** — Aucun skill dédié n’existe pour : test automatisé, revue de code, diagnostic de bug, vérifications mécaniques, documentation projet. **Action** : décider dans un ticket ultérieur si ces activités nécessitent un skill, une commande, ou un simple prompt réutilisable.

### 17.5. Ordre de mise en oeuvre recommandé pour les tickets suivants

1. Doctrine et cartographie (ce ticket) ✓
2. Alignement des commandes — Formaliser les routines les plus fréquentes en commandes OpenCode
3. Alignement des skills — Corriger les écarts (`my-pull-requests`), transformer les skills mécaniques en commandes
4. Permissions — Définir les permissions par type d’agent et niveau de risque
5. Plugins / hooks transverses — Ajouter des garde-fous si nécessaire (sécurité, coût, validation)
6. Mesure et ajustements — Observer l’utilisation réelle et ajuster la configuration

[1]: https://opencode.ai/docs/agents/?utm_source=chatgpt.com "Agents"
[2]: https://opencode.ai/docs/tools/?utm_source=chatgpt.com "Tools"
[3]: https://opencode.ai/docs/commands/?utm_source=chatgpt.com "Commands"
[4]: https://opencode.ai/docs/plugins/?utm_source=chatgpt.com "Plugins"
