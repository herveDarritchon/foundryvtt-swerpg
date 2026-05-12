# Epic — Refonte V1 des talents Edge : modèle, onglet talents et arbres de spécialisation

**Proposée par** : Hervé D.  
**Statut** : Cadrage V1 validé — points de vigilance à instruire  
**Licence** : SWERPG

---

## 1. Contexte

Le système contient actuellement un embryon de gestion des talents hérité d'un code inspiré de Crucible, qui n'est **pas
adapté aux règles Star Wars RPG Edge**. L'existant se compose :

- d'une **liste de talents** dans la fiche personnage (`templates/sheets/actor/talents.hbs`) peu structurée (affichage
  plat sans regroupement métier) ;
- d'un **canvas PIXI d'arbre de talents** (`module/canvas/talent-tree.mjs`, `talent-tree-node.mjs`,
  `talent-choice-wheel.mjs`, etc.) conçu pour un arbre global, sans notion de spécialisation Edge ;
- de **logiques d'achat éparpillées** entre `module/models/talent.mjs`, `actor-mixins/talents.mjs` et
  `module/lib/talents/*.mjs`, avec des incohérences (coût hardcodé, `isCreation` en garde-fou, mélange XP / talent
  points) ;
- d'un **import OggDude** partiellement amorcé (`module/importer/mappers/oggdude-talent-mapper.mjs`) mais pas aligné sur
  un modèle métier prêt pour l'UI et la progression.

### Décision d'architecture

Le code actuel de l'arbre de talents (PIXI / canvas / HUD / wheel / nodes) peut servir de référence technique ponctuelle
pour certains mécanismes de rendu ou d'intégration Foundry, mais il **n'est pas considéré comme une base métier
réutilisable**.
La vue pourra s’appuyer sur PIXI pour le rendu, mais elle sera implémentée comme une application Foundry dédiée,
indépendante du canvas de scène.

La V1 Talents Edge doit :

- **redéfinir son modèle métier selon les règles Star Wars RPG Edge** ;
- **concevoir une nouvelle représentation des arbres de spécialisation** adaptée au jeu ;
- **ne pas chercher à préserver la logique fonctionnelle actuelle** si elle reflète des hypothèses de Crucible ;
- n'extraire de l'existant que des patterns techniques génériques réellement utiles (ex : pattern d'ouverture d'un
  canvas PIXI, gestion d'événements de souris, rendu de formes simples).

---

## 2. Objectif

Livrer une V1 cohérente de la gestion des talents qui permette :

- d’afficher les talents possédés dans un onglet Talents utile en jeu ;
- d’afficher les arbres des spécialisations déjà possédées par l’acteur ;
- de sélectionner une spécialisation comme contexte d’achat courant ;
- de consulter les autres spécialisations possédées en lecture ;
- d’acheter et faire évoluer les talents depuis l’arbre de spécialisation ;
- de consolider les talents possédés, notamment les talents ranked présents dans plusieurs spécialisations ;
- de synchroniser correctement la vue consolidée, la vue arbre et les données du personnage.

---

## 3. Décisions de périmètre

- Cette épique couvre : **UI + achat**.
- Cette épique **réimplémente** la Vue graphique d’arbre de spécialisation (concept conservé, code réécrit).
- Cette épique gère plusieurs spécialisations possédées par l’acteur. Une seule spécialisation peut être sélectionnée
  comme contexte d’achat courant dans l’UI, sans rendre les autres spécialisations mécaniquement inactives.
- Cette épique **ne couvre pas** l'automatisation avancée des effets mécaniques des talents (reportée).
- La **“spécialisation active”** est un état d’interface, non une règle métier Edge.
- Le coût d’achat est porté par le **nœud d’arbre**, pas par la définition globale du talent.
- L’achat V1 se fait depuis l’arbre ; l’onglet Talents est une **vue consolidée de consultation en jeu**. L’achat direct
  depuis la fiche est reporté.

---

## 4. Décisions structurantes du modèle

La V1 distingue explicitement plusieurs niveaux de données :

- **Définition générique de talent** : décrit le talent indépendamment d’un arbre donné  
  (nom, description, activation, ranked, tags, source).

- **Arbre de spécialisation** : référentiel monde/compendium décrivant la progression d’une spécialisation  
  (spécialisation liée, nœuds, connexions, coûts, positions). Les arbres de spécialisation V1 sont représentés par des Items de type `specialization-tree`, stockables en compendium monde ou dans le monde, et référencés depuis les spécialisations possédées par l’acteur.

- **Nœud de talent** : occurrence d’un talent dans un arbre donné  
  (référence talent, position, coût XP, prérequis/connexions).

- **Achat acteur** : état persistant indiquant qu’un personnage a acheté un nœud donné  
  (référence arbre, référence nœud, référence talent).

- **Vue consolidée des talents possédés** : représentation calculée pour l’onglet Talents  
  (talent, rang consolidé, activation, sources, état d’affichage). La vue consolidée des talents possédés est une donnée
  dérivée. Elle ne constitue pas la source de vérité métier : elle est recalculée à partir des achats acteur et des
  référentiels d’arbres/talents.

Chaque spécialisation possédée doit pouvoir être résolue vers un arbre de spécialisation via une référence stable (`treeUuid`, `treeId`, `importKey` ou équivalent). Si l’arbre ne peut pas être résolu, la spécialisation reste affichable mais son arbre est marqué indisponible ou incomplet.

Un talent non-ranked peut apparaître dans plusieurs nœuds et plusieurs arbres. Chaque nœud peut être acheté pour permettre la progression dans l’arbre concerné, mais le bénéfice du talent reste non cumulatif dans la vue consolidée.

La V1 calcule au minimum les états de nœud suivants : acheté, achetable, verrouillé, invalide. Un nœud invalide correspond à une donnée référentielle incomplète ou non résolue.

Un nœud est achetable si sa spécialisation est possédée, si l’arbre et le nœud sont résolus, si le nœud n’est pas déjà acheté, si l’acteur dispose de l’XP nécessaire, et si le nœud est racine ou connecté à un nœud déjà acheté selon les connexions de l’arbre.

### Référentiel d’arbre de spécialisation

Les arbres de spécialisation V1 sont représentés par des référentiels monde/compendium, idéalement sous forme d’Items de type `specialization-tree`.

L’acteur ne stocke pas l’arbre complet ; il stocke uniquement ses spécialisations possédées et ses achats de nœuds.

### Résolution spécialisation → arbre

Chaque spécialisation possédée doit pouvoir être résolue vers un arbre de spécialisation via une référence stable (`treeUuid`, `treeId`, `importKey` ou équivalent).

Si l’arbre ne peut pas être résolu, la spécialisation reste affichable, mais son arbre est marqué indisponible ou incomplet.

### Talents non-ranked présents dans plusieurs arbres

Un talent non-ranked peut apparaître dans plusieurs nœuds et plusieurs arbres.

Chaque nœud peut être acheté pour permettre la progression dans l’arbre concerné, mais le bénéfice du talent reste non cumulatif dans la vue consolidée.

### États minimaux de nœud

La V1 doit calculer au minimum les états de nœud suivants :

- **acheté** ;
- **achetable** ;
- **verrouillé** ;
- **invalide**.

Un nœud invalide correspond à une donnée référentielle incomplète ou non résolue.

### Accessibilité de base d’un nœud

Un nœud est achetable si :

- sa spécialisation est possédée ;
- l’arbre et le nœud sont résolus ;
- le nœud n’est pas déjà acheté ;
- l’acteur dispose de l’XP nécessaire ;
- le nœud est racine ou connecté à un nœud déjà acheté selon les connexions de l’arbre.

Le coût d’achat appartient au nœud d’arbre.  
Le rang affiché appartient à la vue consolidée de l’acteur.  
La définition générique du talent ne porte pas le coût d’achat d’un arbre.

L’acteur persiste uniquement l’état nécessaire au jeu et à la progression :

- les spécialisations possédées ;
- les achats de nœuds de talents ;
- les références vers les arbres/talents concernés ;
- les références nécessaires pour recalculer les coûts XP à partir des nœuds achetés.

Il ne persiste pas l’historique détaillé des achats.

Les achats de nœuds persistés sur l’acteur constituent la source de vérité de la progression talents du personnage. Les
vues consolidées et les états graphiques sont recalculés à partir de
ces achats et des référentiels d’arbres/talents.

---

## 5. In Scope

1. **Modèle métier V1 des talents**, distinguant définition générique, occurrence dans un arbre, achat acteur et vue
   consolidée.
2. **Modèle V1 des arbres de spécialisation** sous forme de référentiels monde/compendium, alimentés notamment par
   l’import OggDude.
3. **Liaison talent ↔ spécialisation ↔ arbre ↔ nœud ↔ achat acteur**.
4. **Vue consolidée des talents possédés** sur la fiche personnage, utilisée en jeu.
5. **Vue graphique dédiée des arbres de spécialisation possédés**, indépendante du canvas de scène Foundry.
6. **Sélecteur de spécialisation courante** comme contexte d’achat UI.
7. **Règles d’achat V1** : coût XP, accessibilité, prérequis par connexions, achat simple, achat de talents ranked.
8. **Consolidation des talents ranked** achetés depuis une ou plusieurs spécialisations.
9. **Synchronisation achat ↔ données acteur ↔ onglet Talents ↔ vue arbre**.
10. **Alignement minimal de l’import OggDude** avec le modèle cible.
11. **Tests ciblés sur les règles critiques de progression et de consolidation.**

---

## 6. Out of Scope

- Achat d’une nouvelle spécialisation.
- Consultation des arbres de spécialisations non possédées.
- Modification manuelle des arbres de spécialisation.
- Achat de talents depuis l’onglet Talents de la fiche personnage.
- Achat par drag & drop depuis la fiche.
- Mode MJ override pour forcer un achat.
- Talents signatures.
- Remboursement / suppression complète avec recalcul intelligent.
- Historique détaillé des achats XP dans l’acteur, couvert par le système d’audit/log.
- Automatisation complète des effets mécaniques des talents.
- Projection systématique en ActiveEffects Foundry.
- Refonte générale de `system.actions`.

---

## 7. Critères d'acceptation

- [ ] L'onglet Talents affiche clairement les talents possédés et leur état (nom, activation, ranked ou non, rang,
  spécialisation(s) source(s)).
- [ ] Le personnage peut consulter ses arbres de spécialisation via une vue graphique dédiée, indépendante du canvas de
  scène Foundry.
- [ ] Une spécialisation peut être choisie comme contexte d’achat courant dans l’UI.
- [ ] Les autres spécialisations possédées par l’acteur restent consultables en lecture.
- [ ] L’achat d’un talent met à jour correctement :
    - les données persistantes de l’acteur ;
    - les achats de nœuds ;
    - le rang consolidé du talent ;
    - l’onglet Talents / vue consolidée ;
    - la vue graphique d'arbre ;
    - les règles d’accessibilité des nœuds suivants.
- [ ] Les talents à rangs sont gérés proprement : achats multiples possibles sur des nœuds valides, rang consolidé
  correct, coût XP issu des nœuds achetés.
- [ ] Les prérequis et blocages sont compréhensibles côté UI.
- [ ] Les données importées OggDude peuvent alimenter ce flux sans structure ad hoc cassante.
- [ ] Les tests couvrent au minimum :
    - achat simple ;
    - achat ranked depuis un seul arbre ;
    - achat ranked depuis plusieurs arbres ;
    - verrouillage / déverrouillage par connexions ;
    - recalcul de la vue consolidée ;
    - import minimal d’un arbre OggDude.

---

## 8. Points de vigilance à instruire

| Point                      | Risque                                                                                                                                             | Décision de cadrage attendue                                                                                |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Multi-spé existant         | Une partie du code semble déjà lire plusieurs spécialisations, mais certains compteurs ne prennent que la première. Risque de calculs incohérents. | Déterminer si la V1 corrige immédiatement le modèle multi-spé acteur.                                       |
| Canvas hérité              | L’arbre actuel suppose un arbre global et des patterns Crucible. Risque de réutilisation abusive.                                                  | Confirmer ce qui est réécrit, ignoré ou seulement repris comme pattern technique.                           |
| Règles d’achat Crucible    | Coût hardcodé, logique `isCreation`, mélange XP/talent points. Risque de fausse règle Edge.                                                        | Remplacer par une couche domaine testable et indépendante de Foundry.                                       |
| Import OggDude             | Les données importées peuvent être incomplètes ou ambiguës. Risque de modèle dicté par l’import.                                                   | Définir les champs minimaux requis et les garde-fous.                                                       |
| Dépendances avec audit/log | Risque de dupliquer l’historique dans l’acteur ou de ne pas déclencher l’audit lors d’un achat.                                                    | Vérifier que le flux d’achat met à jour l’état acteur et déclenche l’audit/log sans dupliquer l’historique. |

---

### 8.1 Point de vigilance — Multi-spé existant

**Décision** : à traiter dans la V1.

La V1 Talents Edge doit considérer l’ensemble des spécialisations possédées par l’acteur pour tous les flux liés aux
talents.

Aucune logique V1 liée aux talents ne doit supposer qu’un personnage ne possède qu’une seule spécialisation ou que la
première spécialisation est la seule pertinente.

La V1 doit notamment utiliser toutes les spécialisations possédées pour :

- déterminer les arbres de spécialisation consultables ;
- sélectionner le contexte d’achat courant ;
- vérifier qu’un achat est réalisé dans une spécialisation possédée ;
- consolider les talents possédés ;
- consolider les rangs des talents ranked ;
- afficher les spécialisation(s) source(s) dans l’onglet Talents ;
- éviter les incohérences entre l’affichage des arbres, les achats de nœuds et la vue consolidée.

Les compteurs ou calculs existants qui ne regardent que la première spécialisation doivent être corrigés s’ils affectent
directement la V1 Talents. Les incohérences multi-spé sans impact direct sur les talents peuvent être documentées et
reportées.

#### Détails

[pdv-cadrage-multi-spé.md](pdv-cadrage-multi-spé.md)

---

### 8.2 Point de vigilance — Règles d’achat Crucible

**Décision** : à traiter dans la V1.

La V1 remplace les règles d’achat héritées de Crucible par une couche domaine dédiée aux talents Edge.

La logique d’achat ne doit plus :

- calculer le coût depuis le rang du talent ;
- utiliser `isCreation` comme garde-fou métier ;
- mélanger XP, talent points et états UI ;
- dépendre directement du rendu graphique ;
- modifier la vue consolidée comme source de vérité.

La logique d’achat doit :

- partir d’un acteur ;
- vérifier que la spécialisation concernée est possédée ;
- vérifier que l’arbre de spécialisation référencé existe ;
- vérifier que le nœud existe dans cet arbre ;
- vérifier que le nœud n’est pas déjà acheté ;
- vérifier que les prérequis / connexions rendent le nœud accessible ;
- lire le coût XP depuis le nœud ;
- vérifier que l’acteur dispose de l’XP nécessaire ;
- persister l’achat du nœud sur l’acteur ;
- déclencher le recalcul de la vue consolidée ;
- laisser l’audit/log tracer l’opération sans stocker l’historique dans l’acteur.

#### Détails
[pdv-cadrage-crucible-achat.md](pdv-cadrage-crucible-achat.md)

---

### 8.3 Point de vigilance — Import OggDude

**Décision** : à traiter dans la V1, sur un périmètre minimal.

L’import OggDude doit alimenter les référentiels nécessaires à la V1 sans dicter le modèle métier. Il doit produire ou
compléter :

- les définitions génériques de talents ;
- les arbres de spécialisation ;
- les nœuds de talents ;
- les positions des nœuds ;
- les coûts XP par nœud ;
- les connexions / prérequis d’accessibilité ;
- le rattachement carrière / spécialisation lorsque disponible.

Les données brutes doivent être conservées dans `flags.swerpg.import`.

L’import ne crée pas d’achats acteur, ne stocke pas les arbres complets dans l’acteur, ne calcule pas les rangs
consolidés et n’automatise pas les effets mécaniques.

En cas de donnée ambiguë ou incomplète, l’import doit préserver la donnée brute, produire un warning exploitable, et
éviter les fallbacks silencieux. Un nœud sans coût ou sans accessibilité fiable doit être marqué comme non achetable
plutôt que corrigé par une règle implicite.

### Détails
[pdv-cadrage-import-ogg.md](pdv-cadrage-import-ogg.md)

---

### 8.4 Point de vigilance — Canvas hérité

**Décision** : à traiter dans la V1 comme audit technique, sans reconduction fonctionnelle.

Le canvas / arbre de talents hérité de Crucible n’est pas une base métier réutilisable. La V1 réimplémente une vue
graphique dédiée aux arbres de spécialisation Edge, indépendante du canvas de scène Foundry.

Les modules existants peuvent seulement servir à identifier des patterns techniques génériques : rendu PIXI, pan/zoom,
gestion du hover/clic, rendu de connexions, cycle de vie d’une vue graphique. Aucune logique métier héritée ne doit être
reprise si elle suppose un arbre global, une choice wheel métier, un coût calculé hors nœud, un achat direct de talent
générique, ou une source de vérité portée par l’UI.

La V1 ne reconduit pas la logique de choice wheel comme mécanisme métier. Un nœud correspond à une occurrence de talent
définie par l’arbre de spécialisation. L’interaction principale d’un nœud est : consulter, acheter, ou comprendre
pourquoi il est verrouillé.

La vue graphique délègue les règles d’achat, d’accessibilité et de consolidation à la couche domaine. Elle ne stocke pas
l’état métier durable et ne dépend pas du canvas de scène Foundry.

#### Détails
[pdv-cadrage-canvas.md](pdv-cadrage-canvas.md)

---

### 8.5 Point de vigilance — Dépendances avec audit/log

**Décision** : à traiter dans la V1 comme contrainte d’intégration, sans modifier le modèle métier talents.

Le flux d’achat de talents doit mettre à jour l’état final de l’acteur et déclencher le mécanisme d’audit/log existant lorsque celui-ci est disponible.

L’acteur ne doit pas stocker l’historique détaillé des achats de talents. L’historique d’achat, les anciennes valeurs, les nouvelles valeurs, le coût XP dépensé et les métadonnées de transaction relèvent du système d’audit/log.

La V1 Talents doit donc produire une opération d’achat suffisamment explicite pour être auditée :

- acteur concerné ;
- spécialisation concernée ;
- arbre concerné ;
- nœud acheté ;
- talent concerné ;
- coût XP ;
- rang consolidé avant / après si disponible ;
- source de l’action : achat depuis arbre de spécialisation.

Si l’audit/log est indisponible, l’achat ne doit pas être bloqué pour cette seule raison, sauf décision technique contraire dans l’épique audit/log. En revanche, le flux doit rester compatible avec l’audit dès que celui-ci est branché.

La responsabilité de la V1 Talents est de fournir une opération claire et traçable. La responsabilité de persister l’historique appartient au système d’audit/log.

---

## 9. Sujets reportés vers de futures épiques

Ces sujets sont exclus de la V1 mais devront faire l’objet d’un cadrage dédié :

- **Automatisation mécanique des effets de talents**.
- **Projection ActiveEffects**.
- **Talents réactifs / temporaires / contextuels**.
- **Refonte des actions talents**.
- **Achat depuis l’onglet Talents / drag & drop**.
- **Remboursement / suppression complète avec recalcul intelligent**.
- **Mode MJ override**.
- **Consultation et acquisition de spécialisations non possédées**.
- **Édition manuelle des arbres de spécialisation**.
- **Talents signatures**.

## 10. Décision de cadrage

La V1 est validée comme une refonte centrée sur :

- la modélisation des arbres de spécialisation Edge ;
- l’achat de talents depuis les arbres possédés ;
- la consolidation des talents possédés dans l’onglet Talents ;
- la préparation minimale de l’import OggDude.

Les effets mécaniques, l’édition avancée, les overrides MJ, les suppressions/remboursements et les talents signatures
sont exclus de la V1.