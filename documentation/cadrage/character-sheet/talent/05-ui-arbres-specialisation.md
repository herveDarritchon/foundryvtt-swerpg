# 05 — UI Arbres de spécialisation V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage UI — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit le comportement attendu de la vue graphique des arbres de spécialisation.

La V1 réimplémente cette vue pour Edge.  
L’ancien arbre hérité de Crucible peut servir d’inspiration technique ponctuelle, mais n’est pas une base fonctionnelle.

---

## 2. Objectif

La vue graphique doit permettre de :

- consulter les arbres des spécialisations possédées ;
- choisir une spécialisation comme contexte d’achat courant ;
- visualiser les nœuds, connexions et états ;
- acheter un nœud valide ;
- comprendre pourquoi un nœud est verrouillé ou invalide.

---

## 3. Architecture cible

La vue graphique est :

- une application Foundry dédiée ;
- indépendante du canvas de scène Foundry ;
- éventuellement rendue avec PIXI ;
- branchée sur la couche domaine pour les règles d’achat.

Elle ne calcule pas elle-même les règles métier.

Flux attendu :

```txt
Acteur + spécialisations possédées
↓
Résolution des arbres référentiels
↓
Calcul des états via couche domaine
↓
Rendu graphique
↓
Achat via couche domaine
↓
Mise à jour acteur
↓
Rafraîchissement vue graphique + onglet Talents
````

---

## 4. Spécialisations affichées

La V1 affiche uniquement les arbres des spécialisations déjà possédées par l’acteur.

Hors V1 :

* consultation des spécialisations non possédées ;
* achat d’une nouvelle spécialisation ;
* prévisualisation avancée de progression future.

Si un arbre ne peut pas être résolu :

* la spécialisation reste visible ;
* l’arbre est marqué indisponible ou incomplet ;
* aucun achat n’est possible dans cet arbre.

---

## 5. Sélecteur de spécialisation courante

La vue doit permettre de sélectionner une spécialisation courante.

Cette sélection est un état UI.

Elle sert uniquement à déterminer dans quel arbre l’utilisateur consulte ou achète.

Elle ne rend pas les autres spécialisations mécaniquement inactives.

---

## 6. Rendu minimal attendu

La vue doit afficher :

* nœuds de talents ;
* connexions entre nœuds ;
* coût XP des nœuds ;
* état du nœud ;
* nom du talent ;
* indication ranked / non-ranked si utile ;
* informations de verrouillage ou d’erreur.

---

## 7. États de nœud

La vue doit distinguer au minimum :

| État        | Signification                           |
| ----------- | --------------------------------------- |
| `purchased` | Nœud déjà acheté.                       |
| `available` | Nœud achetable.                         |
| `locked`    | Nœud valide mais prérequis non remplis. |
| `invalid`   | Données incomplètes ou incohérentes.    |

Un nœud invalide n’est jamais achetable.

---

## 8. Interactions de nœud

Interactions V1 attendues :

* consulter le détail du talent ;
* voir le coût XP ;
* voir pourquoi le nœud est verrouillé ;
* voir pourquoi le nœud est invalide ;
* acheter le nœud s’il est disponible.

La V1 ne reconduit pas la `choice wheel` comme mécanisme métier.

Un nœud correspond à une occurrence de talent définie par l’arbre.

---

## 9. Achat depuis la vue graphique

L’achat se fait uniquement via un nœud disponible.

La vue appelle la couche domaine, qui vérifie :

* spécialisation possédée ;
* arbre résolu ;
* nœud résolu ;
* nœud non acheté ;
* accessibilité ;
* XP disponible.

La vue ne persiste pas directement l’achat sans passer par la couche domaine.

---

## 10. Talents ranked et non-ranked

### 10.1 Ranked

Pour un talent ranked, la vue peut afficher :

* le nœud acheté ;
* le rang consolidé actuel ;
* le coût du prochain nœud achetable si applicable.

### 10.2 Non-ranked déjà possédé

Si un talent non-ranked est déjà possédé via un autre arbre :

* le nœud peut rester achetable s’il sert la progression de cet arbre ;
* le bénéfice ne se cumule pas ;
* l’UI doit éviter de laisser croire à un double bénéfice.

Message indicatif :

```txt
Talent déjà possédé. Acheter ce nœud peut toutefois débloquer la progression dans cet arbre.
```

---

## 11. Données incomplètes

Si les données référentielles sont incomplètes :

* afficher l’arbre ou le nœud si possible ;
* marquer l’état comme `invalid` ou `incomplete` ;
* interdire l’achat non fiable ;
* afficher une raison compréhensible.

Exemples :

```txt
Talent introuvable
Coût manquant
Connexion invalide
Arbre non résolu
```

---

## 12. Ancien canvas Crucible

L’ancien code peut être consulté uniquement pour des patterns techniques :

* rendu PIXI ;
* pan / zoom ;
* hover / clic ;
* rendu de connexions ;
* cycle de vie d’une fenêtre graphique.

À ne pas reprendre comme logique fonctionnelle :

* arbre global ;
* `choice wheel` métier ;
* coût hors nœud ;
* achat direct d’un talent générique ;
* état UI comme source de vérité ;
* dépendance au canvas de scène.

---

## 13. Synchronisation

Après achat :

* les données acteur sont mises à jour ;
* la vue graphique est rafraîchie ;
* les états des nœuds sont recalculés ;
* l’onglet Talents / vue consolidée reflète le changement ;
* l’audit/log peut tracer l’opération.

---

## 14. Critères d’acceptation

* [ ] La vue affiche les arbres des spécialisations possédées.
* [ ] Une spécialisation peut être sélectionnée comme contexte courant.
* [ ] Les nœuds et connexions sont visibles.
* [ ] Les états `purchased`, `available`, `locked`, `invalid` sont distinguables.
* [ ] Le coût XP d’un nœud est visible ou accessible.
* [ ] Un nœud disponible peut être acheté.
* [ ] Un nœud verrouillé ou invalide ne peut pas être acheté.
* [ ] La vue délègue l’achat à la couche domaine.
* [ ] Après achat, la vue graphique et l’onglet Talents restent synchronisés.
* [ ] La logique de `choice wheel` Crucible n’est pas reconduite comme mécanisme métier.
* [ ] La vue ne dépend pas du canvas de scène Foundry.

---

## 15. Tests / scénarios manuels attendus

* personnage avec une spécialisation possédée ;
* personnage avec plusieurs spécialisations possédées ;
* sélection d’une spécialisation courante ;
* affichage d’un nœud acheté ;
* affichage d’un nœud achetable ;
* affichage d’un nœud verrouillé ;
* affichage d’un nœud invalide ;
* achat d’un nœud depuis la vue ;
* achat d’un talent ranked ;
* achat d’un nœud non-ranked déjà possédé ailleurs ;
* arbre introuvable ou incomplet ;
* vérification que l’ancien canvas de scène n’est pas utilisé.

---

## 16. Hors périmètre V1

* édition manuelle d’arbre ;
* consultation des arbres non possédés ;
* achat de nouvelle spécialisation ;
* drag & drop d’achat ;
* remboursement / suppression ;
* talents signatures ;
* effets mécaniques ;
* ActiveEffects ;
* `choice wheel` comme mécanique métier.
