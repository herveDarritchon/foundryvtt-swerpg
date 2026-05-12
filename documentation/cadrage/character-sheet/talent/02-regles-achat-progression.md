# 02 — Règles d’achat et progression des talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage règles — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit les règles métier V1 pour :

- calculer l’état des nœuds de talents ;
- acheter un talent depuis un arbre de spécialisation ;
- consolider les talents possédés ;
- remplacer les anciennes règles héritées de Crucible.

La règle centrale est :

> Un achat porte sur un nœud d’arbre, pas directement sur une définition générique de talent.

---

## 2. Principes d’achat

### 2.1 Source de vérité

La source de vérité est l’achat de nœuds persisté sur l’acteur.

La vue graphique, l’onglet Talents et la vue consolidée sont dérivés.

### 2.2 Coût

Le coût XP est toujours lu depuis le nœud de l’arbre de spécialisation.

Interdit en V1 :

- coût calculé depuis le rang du talent ;
- coût calculé depuis la définition générique du talent ;
- fallback silencieux de type `rank * 5` ;
- logique de coût héritée de Crucible.

### 2.3 Contexte d’achat

Un achat se fait dans le contexte :

- d’un acteur ;
- d’une spécialisation possédée ;
- d’un arbre de spécialisation résolu ;
- d’un nœud résolu.

La “spécialisation active” est uniquement le contexte UI courant.

---

## 3. Conditions d’achat d’un nœud

Un nœud est achetable si toutes les conditions suivantes sont remplies :

- la spécialisation liée est possédée par l’acteur ;
- l’arbre de spécialisation est résolu ;
- le nœud existe dans cet arbre ;
- le nœud n’est pas déjà acheté ;
- le nœud n’est pas invalide ;
- l’acteur dispose de l’XP nécessaire ;
- le nœud est racine ou connecté à un nœud déjà acheté selon les connexions de l’arbre.

Si une condition échoue, l’achat est refusé avec une raison exploitable par l’UI.

---

## 4. États de nœud

La V1 calcule au minimum les états suivants :

| État | Signification |
|---|---|
| `purchased` | Le nœud est déjà acheté par l’acteur. |
| `available` | Le nœud peut être acheté maintenant. |
| `locked` | Le nœud est valide mais ses prérequis ne sont pas remplis. |
| `invalid` | Le nœud ou ses références sont incomplets ou incohérents. |

Un nœud `invalid` n’est jamais achetable.

---

## 5. Accessibilité

### 5.1 Nœud racine

Un nœud racine est achetable sans achat préalable dans le même arbre, si toutes les autres conditions sont remplies.

La convention exacte peut être :

- champ explicite `root: true` ;
- absence de prérequis ;
- absence de connexion entrante ;
- rangée initiale.

La convention retenue doit être stable et documentée lors de l’implémentation.

### 5.2 Connexions

Un nœud non racine devient achetable s’il est connecté à au moins un nœud déjà acheté selon les connexions de l’arbre.

Les connexions doivent être suffisamment explicites pour permettre le calcul d’accessibilité.

---

## 6. Talents ranked

Pour un talent ranked :

- chaque nœud acheté portant le même `talentId` augmente le rang consolidé ;
- le rang consolidé est calculé depuis les achats acteur ;
- le rang n’est pas maintenu manuellement comme source de vérité.

Exemple :

```txt
Parer acheté dans un arbre → rang 1
Parer acheté dans un autre arbre → rang 2
````

---

## 7. Talents non-ranked présents dans plusieurs arbres

Un talent non-ranked peut apparaître dans plusieurs nœuds et plusieurs arbres.

Règle V1 :

* chaque nœud peut être acheté s’il sert la progression de l’arbre concerné ;
* le bénéfice du talent reste non cumulatif ;
* l’onglet Talents affiche le talent une seule fois, avec plusieurs sources ;
* la vue graphique peut signaler que le talent est déjà possédé mais que le nœud reste achetable pour progresser.

---

## 8. Achat d’un nœud

### 8.1 Entrées minimales

L’opération d’achat reçoit au minimum :

```js
{
  actor,
  specializationId,
  treeId,
  nodeId
}
```

Selon l’implémentation, les références peuvent être des UUID.

### 8.2 Étapes métier

L’achat doit :

1. vérifier que la spécialisation est possédée ;
2. résoudre l’arbre ;
3. résoudre le nœud ;
4. vérifier l’état du nœud ;
5. vérifier l’XP disponible ;
6. persister l’achat du nœud sur l’acteur ;
7. mettre à jour l’XP selon le modèle XP existant ;
8. déclencher le recalcul de la vue consolidée ;
9. produire une opération traçable pour l’audit/log.

### 8.3 Sortie attendue

L’opération doit retourner un résultat exploitable :

```js
{
  ok: true,
  purchase: {
    treeId: "...",
    nodeId: "...",
    talentId: "...",
    specializationId: "...",
    cost: 10
  }
}
```

En cas d’échec :

```js
{
  ok: false,
  reason: "node-locked"
}
```

---

## 9. Raisons d’échec minimales

La couche domaine doit pouvoir distinguer au minimum :

| Raison                     | Signification                         |
| -------------------------- | ------------------------------------- |
| `specialization-not-owned` | La spécialisation n’est pas possédée. |
| `tree-not-found`           | L’arbre est introuvable.              |
| `node-not-found`           | Le nœud est introuvable.              |
| `node-invalid`             | Le nœud est incomplet ou incohérent.  |
| `node-already-purchased`   | Le nœud est déjà acheté.              |
| `node-locked`              | Le nœud n’est pas encore accessible.  |
| `not-enough-xp`            | L’acteur n’a pas assez d’XP.          |

Ces raisons doivent pouvoir être affichées ou traduites côté UI.

---

## 10. Couche domaine attendue

La logique d’achat doit être isolée dans une couche domaine testable.

Fonctions attendues, noms indicatifs :

```js
getTalentTreeState(actor, specializationTree)
canPurchaseTalentNode(actor, specializationTree, nodeId)
purchaseTalentNode(actor, specializationTree, nodeId)
buildOwnedTalentSummary(actor, talentDefinitions, specializationTrees)
```

La couche domaine ne doit pas dépendre :

* du rendu graphique ;
* des handlers UI ;
* du canvas Foundry ;
* d’un état visuel comme source de vérité.

---

## 11. Neutralisation des règles Crucible

Les anciennes logiques doivent être supprimées, neutralisées ou isolées si elles affectent la V1.

À exclure du flux V1 :

* `rank * 5` comme coût ;
* `isCreation` comme garde-fou métier ;
* talent points ;
* achat direct d’un talent générique ;
* état UI comme source de vérité ;
* logique d’arbre global.

---

## 12. Tests attendus

Les tests doivent couvrir au minimum :

* achat simple d’un nœud racine ;
* refus si spécialisation non possédée ;
* refus si arbre introuvable ;
* refus si nœud introuvable ;
* refus si nœud verrouillé ;
* refus si XP insuffisante ;
* achat ranked depuis un seul arbre ;
* achat ranked depuis plusieurs arbres ;
* achat non-ranked déjà possédé dans un autre arbre ;
* recalcul de la vue consolidée ;
* nœud invalide non achetable.

---

## 13. Hors périmètre V1

Ce document ne couvre pas :

* remboursement ;
* suppression avec recalcul intelligent ;
* override MJ ;
* achat depuis l’onglet Talents ;
* drag & drop d’achat ;
* effets mécaniques des talents ;
* ActiveEffects ;
* talents signatures.
