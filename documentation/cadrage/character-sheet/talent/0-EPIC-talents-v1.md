# Epic — Refonte V1 des talents Edge : modèle, onglet talents et arbres de spécialisation

**Proposée par** : Hervé D.  
**Statut** : Cadrage V1 validé — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Contexte

Le système contient actuellement un embryon de gestion des talents hérité d'un code inspiré de Crucible, qui n'est pas adapté aux règles Star Wars RPG Edge.

L'existant se compose notamment :

- d'une liste de talents dans la fiche personnage (`templates/sheets/actor/talents.hbs`) peu structurée ;
- d'un ancien canvas PIXI d'arbre de talents (`module/canvas/talent-tree.mjs`, `talent-tree-node.mjs`, `talent-choice-wheel.mjs`, etc.) conçu pour un arbre global, sans notion de spécialisation Edge ;
- de logiques d'achat éparpillées entre `module/models/talent.mjs`, `actor-mixins/talents.mjs` et `module/lib/talents/*.mjs` ;
- d'incohérences métier : coût hardcodé, logique `isCreation`, mélange XP / talent points ;
- d'un import OggDude partiellement amorcé, mais pas encore aligné sur un modèle exploitable pour l’UI, les arbres et la progression.

La V1 Talents Edge doit repartir du besoin Edge, pas adapter la logique fonctionnelle Crucible.

---

## 2. Objectif

Livrer une V1 cohérente de la gestion des talents permettant :

- d’afficher les talents possédés dans un onglet Talents utile en jeu ;
- d’afficher les arbres des spécialisations déjà possédées par l’acteur ;
- de sélectionner une spécialisation comme contexte d’achat courant ;
- de consulter les autres spécialisations possédées en lecture ;
- d’acheter des talents depuis l’arbre de spécialisation ;
- de consolider les talents possédés, notamment les talents ranked présents dans plusieurs spécialisations ;
- de synchroniser correctement l’acteur, la vue consolidée et la vue graphique d’arbre.

---

## 3. Décisions principales

### 3.1 Périmètre V1

La V1 couvre :

- le modèle métier des talents ;
- le modèle des arbres de spécialisation ;
- l’achat de talents depuis les arbres ;
- l’onglet Talents comme vue consolidée de consultation en jeu ;
- la vue graphique dédiée des arbres ;
- l’alignement minimal de l’import OggDude ;
- les tests critiques de progression et de consolidation.

La V1 ne couvre pas :

- l’automatisation mécanique avancée des effets des talents ;
- la projection ActiveEffects ;
- l’achat d’une nouvelle spécialisation ;
- la consultation des arbres non possédés ;
- l’édition manuelle des arbres ;
- l’achat depuis l’onglet Talents ;
- le drag & drop d’achat ;
- le mode MJ override ;
- les talents signatures ;
- le remboursement / suppression complète avec recalcul intelligent.

### 3.2 Spécialisation active

La “spécialisation active” est un état d’interface.

Elle désigne uniquement la spécialisation sélectionnée comme contexte d’achat courant dans l’UI. Elle ne rend pas les autres spécialisations mécaniquement inactives.

### 3.3 Source de vérité

Les achats de nœuds persistés sur l’acteur constituent la source de vérité de la progression talents du personnage.

Les vues consolidées et les états graphiques sont recalculés à partir :

- des achats acteur ;
- des spécialisations possédées ;
- des référentiels d’arbres ;
- des définitions de talents.

L’onglet Talents et la vue graphique ne sont pas des sources de vérité métier.

---

## 4. Modèle métier cible

La V1 distingue explicitement cinq niveaux de données.

### 4.1 Définition générique de talent

Décrit le talent indépendamment d’un arbre donné.

Exemples de données :

- nom ;
- description ;
- activation ;
- ranked / non-ranked ;
- tags ;
- source.

La définition générique du talent ne porte pas le coût d’achat d’un arbre.

### 4.2 Arbre de spécialisation

Référentiel monde/compendium décrivant la progression d’une spécialisation.

Les arbres de spécialisation V1 sont représentés par des Items de type `specialization-tree`, stockables en compendium monde ou dans le monde.

Un arbre contient notamment :

- la spécialisation liée ;
- les nœuds ;
- les connexions ;
- les coûts ;
- les positions.

L’acteur ne stocke pas l’arbre complet.

### 4.3 Nœud de talent

Occurrence d’un talent dans un arbre donné.

Un nœud porte notamment :

- une référence talent ;
- une position ;
- un coût XP ;
- des prérequis ou connexions.

Le coût d’achat appartient au nœud d’arbre.

### 4.4 Achat acteur

État persistant indiquant qu’un personnage a acheté un nœud donné.

Un achat acteur référence notamment :

- l’arbre ;
- le nœud ;
- le talent ;
- la spécialisation concernée.

L’acteur persiste uniquement l’état nécessaire au jeu et à la progression :

- les spécialisations possédées ;
- les achats de nœuds ;
- les références vers les arbres et talents concernés ;
- les références nécessaires pour recalculer les coûts XP depuis les nœuds achetés.

L’acteur ne persiste pas l’historique détaillé des achats.

### 4.5 Vue consolidée des talents possédés

Représentation calculée pour l’onglet Talents.

Elle expose notamment :

- le talent ;
- le rang consolidé ;
- l’activation ;
- les sources ;
- l’état d’affichage.

La vue consolidée est une donnée dérivée. Elle n’est pas persistée comme source de vérité métier.

---

## 5. Règles structurantes de progression

### 5.1 Résolution spécialisation → arbre

Chaque spécialisation possédée doit pouvoir être résolue vers un arbre de spécialisation via une référence stable :

- `treeUuid` ;
- `treeId` ;
- `importKey` ;
- ou équivalent.

Si l’arbre ne peut pas être résolu, la spécialisation reste affichable, mais son arbre est marqué indisponible ou incomplet.

### 5.2 Accessibilité d’un nœud

Un nœud est achetable si :

- sa spécialisation est possédée ;
- l’arbre est résolu ;
- le nœud est résolu ;
- le nœud n’est pas déjà acheté ;
- l’acteur dispose de l’XP nécessaire ;
- le nœud est racine ou connecté à un nœud déjà acheté selon les connexions de l’arbre.

### 5.3 États minimaux de nœud

La V1 doit calculer au minimum les états suivants :

- **acheté** ;
- **achetable** ;
- **verrouillé** ;
- **invalide**.

Un nœud invalide correspond à une donnée référentielle incomplète ou non résolue.

### 5.4 Talents ranked

Pour les talents ranked, chaque nœud acheté portant le même talent augmente le rang consolidé.

Le rang affiché appartient à la vue consolidée de l’acteur.

### 5.5 Talents non-ranked présents dans plusieurs arbres

Un talent non-ranked peut apparaître dans plusieurs nœuds et plusieurs arbres.

Chaque nœud peut être acheté pour permettre la progression dans l’arbre concerné, mais le bénéfice du talent reste non cumulatif dans la vue consolidée.

---

## 6. Architecture UI cible

### 6.1 Onglet Talents

L’onglet Talents est une vue de consultation utilisée en jeu.

Il affiche les talents possédés, leurs rangs consolidés, leurs activations et leurs sources.

Il ne permet pas l’achat de talents en V1.

### 6.2 Vue graphique d’arbre de spécialisation

La V1 réimplémente une vue graphique dédiée aux arbres de spécialisation.

Cette vue :

- est indépendante du canvas de scène Foundry ;
- peut s’appuyer sur PIXI pour le rendu ;
- est implémentée comme une application Foundry dédiée ;
- affiche les arbres des spécialisations possédées ;
- permet de sélectionner une spécialisation comme contexte d’achat courant ;
- délègue les règles d’achat, d’accessibilité et de consolidation à la couche domaine.

Le code existant de l’ancien arbre Crucible peut servir d’inspiration technique ponctuelle, mais il n’est pas reconduit comme base fonctionnelle.

---

## 7. Import OggDude

L’import OggDude doit alimenter les référentiels nécessaires à la V1 sans dicter le modèle métier.

Il doit produire ou compléter :

- les définitions génériques de talents ;
- les arbres de spécialisation ;
- les nœuds de talents ;
- les positions des nœuds ;
- les coûts XP par nœud ;
- les connexions / prérequis d’accessibilité ;
- le rattachement carrière / spécialisation lorsque disponible.

Les données brutes importées doivent être conservées dans `flags.swerpg.import`.

L’import ne doit pas :

- créer d’achats acteur ;
- stocker les arbres complets dans l’acteur ;
- calculer les rangs consolidés ;
- automatiser les effets mécaniques ;
- imposer une structure ad hoc différente du modèle V1.

En cas de donnée ambiguë ou incomplète, l’import doit produire un warning exploitable et éviter les fallbacks silencieux.

---

## 8. Audit / log

La V1 Talents ne stocke pas l’historique détaillé des achats dans l’acteur.

Le flux d’achat doit produire une opération suffisamment explicite pour être auditée :

- acteur concerné ;
- spécialisation concernée ;
- arbre concerné ;
- nœud acheté ;
- talent concerné ;
- coût XP ;
- rang consolidé avant / après si disponible ;
- source de l’action : achat depuis arbre de spécialisation.

La responsabilité de la V1 Talents est de fournir une opération claire et traçable.

La responsabilité de persister l’historique appartient au système d’audit/log.

Si l’audit/log est indisponible, l’achat ne doit pas être bloqué pour cette seule raison, sauf décision contraire dans l’épic audit/log.

---

## 9. In Scope

1. Modèle métier V1 des talents.
2. Modèle V1 des arbres de spécialisation.
3. Liaison talent ↔ spécialisation ↔ arbre ↔ nœud ↔ achat acteur.
4. Vue consolidée des talents possédés sur la fiche personnage.
5. Vue graphique dédiée des arbres de spécialisation possédés.
6. Sélecteur de spécialisation courante comme contexte d’achat UI.
7. Règles d’achat V1.
8. Consolidation des talents ranked.
9. Gestion des talents non-ranked présents dans plusieurs arbres.
10. Synchronisation achat ↔ données acteur ↔ onglet Talents ↔ vue graphique.
11. Alignement minimal de l’import OggDude.
12. Intégration audit/log sans stockage d’historique dans l’acteur.
13. Tests ciblés sur les règles critiques de progression et de consolidation.
14. Neutralisation ou isolement des anciennes logiques Crucible incompatibles avec la V1.

---

## 10. Out of Scope

- Achat d’une nouvelle spécialisation.
- Consultation des arbres de spécialisations non possédées.
- Modification manuelle des arbres de spécialisation.
- Achat de talents depuis l’onglet Talents de la fiche personnage.
- Achat par drag & drop depuis la fiche.
- Mode MJ override pour forcer un achat.
- Talents signatures.
- Remboursement / suppression complète avec recalcul intelligent.
- Historique détaillé des achats XP dans l’acteur.
- Automatisation complète des effets mécaniques des talents.
- Projection systématique en ActiveEffects Foundry.
- Refonte générale de `system.actions`.

---

## 11. Critères d’acceptation globaux

- [ ] L’onglet Talents affiche clairement les talents possédés et leur état :
    - nom ;
    - activation ;
    - ranked ou non ;
    - rang consolidé ;
    - spécialisation(s) source(s).

- [ ] Le personnage peut consulter ses arbres de spécialisation via une vue graphique dédiée, indépendante du canvas de scène Foundry.

- [ ] Une spécialisation peut être choisie comme contexte d’achat courant dans l’UI.

- [ ] Les autres spécialisations possédées par l’acteur restent consultables en lecture.

- [ ] L’achat d’un talent met à jour correctement :
    - les données persistantes de l’acteur ;
    - les achats de nœuds ;
    - le rang consolidé du talent ;
    - l’onglet Talents / vue consolidée ;
    - la vue graphique d’arbre ;
    - les règles d’accessibilité des nœuds suivants.

- [ ] Les talents ranked sont gérés proprement :
    - achats multiples possibles sur des nœuds valides ;
    - rang consolidé correct ;
    - coût XP issu des nœuds achetés.

- [ ] Les talents non-ranked présents dans plusieurs arbres peuvent être achetés comme nœuds distincts sans cumul de bénéfice dans la vue consolidée.

- [ ] Les prérequis et blocages sont compréhensibles côté UI.

- [ ] Les données importées OggDude peuvent alimenter ce flux sans structure ad hoc cassante.

- [ ] Les achats déclenchent une opération audit/log compatible sans stocker l’historique dans l’acteur.

- [ ] Les tests couvrent au minimum :
    - achat simple ;
    - achat ranked depuis un seul arbre ;
    - achat ranked depuis plusieurs arbres ;
    - achat non-ranked déjà possédé dans un autre arbre ;
    - verrouillage / déverrouillage par connexions ;
    - recalcul de la vue consolidée ;
    - import minimal d’un arbre OggDude ;
    - cas d’arbre ou de nœud invalide.

---

## 12. Documents de référence

- `01-modele-domaine-talents.md`
- `02-regles-achat-progression.md`
- `03-import-oggdude-talents.md`
- `04-ui-onglet-talents.md`
- `05-ui-arbres-specialisation.md`
- `06-audit-log-et-synchronisation.md`
- `07-plan-issues-github.md`

---

## 13. Décision de cadrage

La V1 est validée comme une refonte centrée sur :

- la modélisation des arbres de spécialisation Edge ;
- l’achat de talents depuis les arbres possédés ;
- la consolidation des talents possédés dans l’onglet Talents ;
- la préparation minimale de l’import OggDude ;
- la neutralisation des logiques Crucible incompatibles ;
- l’intégration audit/log sans stockage d’historique dans l’acteur.

Les effets mécaniques, l’édition avancée, les overrides MJ, les suppressions/remboursements et les talents signatures sont exclus de la V1.