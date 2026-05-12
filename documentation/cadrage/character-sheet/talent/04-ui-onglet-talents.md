# 04 — UI Onglet Talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Cadrage UI — prêt pour découpage en US  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document définit le comportement attendu de l’onglet Talents de la fiche personnage.

L’onglet Talents V1 est une vue de consultation utilisée en jeu. Il affiche une vue consolidée des talents possédés.

Il ne sert pas à acheter des talents.

---

## 2. Objectif

L’onglet Talents doit permettre au joueur et au MJ de comprendre rapidement :

- quels talents le personnage possède ;
- quels talents sont ranked ;
- quel est le rang consolidé ;
- quelle est l’activation du talent ;
- de quelle(s) spécialisation(s) le talent provient.

---

## 3. Source des données

L’onglet Talents affiche une vue consolidée dérivée.

Cette vue est recalculée à partir :

- des achats de nœuds persistés sur l’acteur ;
- des définitions génériques de talents ;
- des arbres de spécialisation ;
- des spécialisations possédées.

L’onglet Talents n’est pas une source de vérité métier.

Il ne modifie pas directement les achats acteur.

---

## 4. Données affichées

Chaque talent affiché doit présenter au minimum :

- nom ;
- activation ;
- ranked / non-ranked ;
- rang consolidé si ranked ;
- spécialisation(s) source(s).

Exemple ranked :

```txt
Parer — Rang 2 — Active
Sources : Garde du corps, Soldat mercenaire
````

Exemple non-ranked :

```txt
Dur à cuire — Passive
Sources : Pilote, Explorateur
```

---

## 5. Talents ranked

Pour un talent ranked :

* afficher une seule entrée consolidée ;
* afficher le rang consolidé ;
* ne pas afficher chaque achat comme un talent séparé ;
* permettre d’identifier les spécialisation(s) source(s).

---

## 6. Talents non-ranked présents dans plusieurs arbres

Pour un talent non-ranked acheté via plusieurs nœuds :

* afficher une seule entrée ;
* ne pas cumuler le bénéfice ;
* afficher les différentes sources ;
* ne pas créer de doublon visuel inutile.

Exemple :

```txt
Dur à cuire — Passive
Sources : Pilote, Explorateur
```

---

## 7. Regroupements et filtres V1

L’onglet doit au minimum proposer un affichage lisible.

Regroupements recommandés :

* par activation ;
* ou par spécialisation source ;
* ou liste unique avec tags visibles.

Filtres simples possibles en V1 :

* activation ;
* ranked / non-ranked ;
* spécialisation source.

Les filtres ne doivent pas bloquer la V1 si la liste consolidée est claire.

---

## 8. Accès aux arbres de spécialisation

L’onglet Talents peut proposer un accès à la vue graphique des arbres.

Comportement attendu :

* bouton ou action “Voir les arbres de spécialisation” ;
* ouverture de la vue graphique dédiée ;
* sélection possible de la spécialisation courante dans cette vue.

L’achat ne se fait pas depuis l’onglet Talents.

---

## 9. États et données incomplètes

Si un talent ou une source ne peut pas être résolu :

* afficher une information compréhensible ;
* éviter l’échec silencieux ;
* ne pas bloquer tout l’onglet ;
* signaler la source comme inconnue ou incomplète.

Exemples :

```txt
[Talent non résolu]
Source inconnue
Spécialisation sans arbre disponible
```

---

## 10. Ce que l’onglet ne doit pas faire

L’onglet Talents V1 ne doit pas :

* acheter un talent ;
* supprimer un talent ;
* rembourser un achat ;
* modifier un arbre ;
* modifier directement les achats acteur ;
* stocker la vue consolidée comme source de vérité ;
* automatiser les effets mécaniques des talents ;
* gérer les talents signatures.

---

## 11. Critères d’acceptation

* [ ] L’onglet affiche les talents possédés depuis la vue consolidée.
* [ ] Les talents ranked apparaissent une seule fois avec leur rang consolidé.
* [ ] Les talents non-ranked présents dans plusieurs arbres apparaissent une seule fois avec plusieurs sources.
* [ ] Chaque talent affiche au minimum : nom, activation, ranked ou non, rang si applicable, source(s).
* [ ] Les sources de spécialisation sont lisibles.
* [ ] Les données incomplètes n’empêchent pas l’affichage de l’onglet.
* [ ] L’onglet permet d’accéder à la vue graphique des arbres si cette vue est disponible.
* [ ] Aucun achat ne peut être effectué directement depuis l’onglet Talents en V1.
* [ ] L’onglet ne persiste pas la vue consolidée comme source de vérité.

---

## 12. Tests / scénarios manuels attendus

* personnage avec un seul talent non-ranked ;
* personnage avec un talent ranked rang 1 ;
* personnage avec un talent ranked acheté depuis plusieurs arbres ;
* personnage avec un talent non-ranked acheté depuis plusieurs arbres ;
* personnage avec plusieurs spécialisations sources ;
* talent dont la définition est introuvable ;
* spécialisation source sans arbre résolu ;
* ouverture de la vue graphique depuis l’onglet ;
* vérification qu’aucun achat direct n’est possible depuis l’onglet.

---

## 13. Hors périmètre V1

* achat depuis l’onglet ;
* drag & drop d’achat ;
* suppression / remboursement ;
* édition manuelle ;
* effets mécaniques ;
* ActiveEffects ;
* talents signatures ;
* gestion avancée des filtres ou recherches.
