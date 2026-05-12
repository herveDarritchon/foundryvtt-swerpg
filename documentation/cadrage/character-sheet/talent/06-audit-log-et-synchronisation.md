# 06 — Audit/log et synchronisation Talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage intégration — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit les règles d’intégration entre la V1 Talents, l’audit/log et la synchronisation des vues.

Objectif : tracer les achats sans transformer l’acteur en historique d’achats.

---

## 2. Principe directeur

La V1 Talents persiste uniquement l’état final utile au jeu :

- spécialisations possédées ;
- achats de nœuds ;
- références vers arbres / nœuds / talents.

Elle ne stocke pas l’historique détaillé des achats.

L’historique relève du système d’audit/log.

---

## 3. Source de vérité

La source de vérité métier reste :

```txt
actor.system.progression.talentPurchases
````

ou structure équivalente.

Les éléments suivants sont recalculés :

* vue consolidée des talents ;
* rangs consolidés ;
* états graphiques des nœuds ;
* accessibilité des nœuds suivants.

---

## 4. Opération d’achat traçable

Lorsqu’un talent est acheté, la V1 doit produire une opération suffisamment explicite pour être auditée.

Données minimales attendues :

```js
{
  type: "talent-node-purchase",
  actorId: "...",
  specializationId: "...",
  treeId: "...",
  nodeId: "...",
  talentId: "...",
  cost: 10,
  source: "specialization-tree"
}
```

Données utiles si disponibles :

```js
{
  previousXp: 100,
  nextXp: 90,
  previousRank: 1,
  nextRank: 2
}
```

---

## 5. Responsabilités

### 5.1 V1 Talents

La V1 Talents doit :

* valider l’achat via la couche domaine ;
* persister l’achat du nœud sur l’acteur ;
* mettre à jour l’XP selon le modèle existant ;
* produire une opération traçable ;
* déclencher le recalcul des vues dérivées.

### 5.2 Audit/log

Le système d’audit/log doit :

* recevoir l’opération ;
* persister l’historique ;
* conserver les anciennes / nouvelles valeurs si nécessaire ;
* permettre le diagnostic ultérieur.

La V1 Talents ne duplique pas ces données dans l’acteur.

---

## 6. Comportement si audit/log indisponible

Si l’audit/log est indisponible :

* l’achat ne doit pas être bloqué pour cette seule raison ;
* un warning technique peut être émis ;
* l’opération d’achat doit rester structurée pour un branchement futur.

Exception : décision contraire explicite dans l’épic audit/log.

---

## 7. Synchronisation après achat

Après un achat réussi :

1. l’achat du nœud est persisté sur l’acteur ;
2. l’XP est mise à jour ;
3. la vue consolidée est recalculée ;
4. la vue graphique d’arbre est rafraîchie ;
5. les états des nœuds sont recalculés ;
6. l’onglet Talents reflète le nouvel état ;
7. l’opération est transmise à l’audit/log si disponible.

---

## 8. Ce qui ne doit pas arriver

La V1 ne doit pas :

* stocker une liste d’événements d’achat dans l’acteur ;
* stocker les anciennes valeurs dans l’acteur ;
* considérer l’audit/log comme source de vérité ;
* bloquer l’affichage si l’audit/log est absent ;
* modifier directement la vue consolidée sans recalcul depuis les achats.

---

## 9. Tests attendus

Tests ou scénarios à couvrir :

* achat avec audit/log disponible ;
* achat avec audit/log indisponible ;
* opération d’achat contenant acteur, arbre, nœud, talent, coût ;
* acteur mis à jour sans historique détaillé ;
* vue consolidée recalculée après achat ;
* vue graphique rafraîchie après achat ;
* rang ranked avant / après si disponible ;
* absence de double persistance historique dans l’acteur.

---

## 10. Hors périmètre V1

Ce document ne couvre pas :

* conception complète du système d’audit/log ;
* interface de consultation de l’historique ;
* rollback automatique ;
* remboursement ;
* suppression intelligente ;
* comparaison détaillée de toutes les anciennes / nouvelles valeurs.
