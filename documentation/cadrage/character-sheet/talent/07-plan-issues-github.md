# 07 — Plan d’issues GitHub Talents V1

**Epic parente** : `0-EPIC-talents-v1.md`  
**Statut** : Plan de découpage — prêt pour création des issues  
**Licence** : SWERPG

---

## 1. Rôle du document

Ce document propose un découpage des issues GitHub pour la V1 Talents Edge.

Objectif : transformer le cadrage en lots de travail livrables, testables et cohérents.

---

## 2. Ordre recommandé

Ne pas commencer par l’UI.

Ordre conseillé :

1. modèle domaine ;
2. règles d’achat ;
3. import minimal ;
4. onglet Talents ;
5. vue graphique ;
6. synchronisation, audit/log, tests et nettoyage Crucible.

---

## 3. Lot 1 — Modèle domaine

### US 1 — Définir le type `specialization-tree`

**Objectif** : créer le référentiel d’arbre de spécialisation.

**À couvrir** :
- Item type `specialization-tree` ;
- spécialisation liée ;
- carrière liée si disponible ;
- nœuds ;
- connexions ;
- métadonnées de source/import.

**AC** :
- un arbre peut être stocké dans le monde ou en compendium ;
- l’acteur ne stocke pas l’arbre complet.

---

### US 2 — Définir la structure des nœuds de talent

**Objectif** : représenter une occurrence de talent dans un arbre.

**À couvrir** :
- `nodeId` stable ;
- `talentId` / référence talent ;
- position ;
- coût XP ;
- connexions / prérequis.

**AC** :
- le coût est porté par le nœud ;
- aucun coût n’est lu depuis la définition générique du talent.

---

### US 3 — Définir les achats de nœuds sur l’acteur

**Objectif** : persister la progression talents.

**À couvrir** :
- structure `talentPurchases` ou équivalent ;
- référence arbre ;
- référence nœud ;
- référence talent ;
- référence spécialisation.

**AC** :
- l’acteur stocke les achats de nœuds ;
- l’acteur ne stocke pas l’historique détaillé.

---

### US 4 — Résoudre spécialisation possédée → arbre

**Objectif** : relier les spécialisations possédées aux arbres référentiels.

**À couvrir** :
- `treeUuid`, `treeId`, `importKey` ou équivalent ;
- cas d’arbre introuvable ;
- état arbre indisponible / incomplet.

**AC** :
- toutes les spécialisations possédées sont prises en compte ;
- aucune logique ne se limite à la première spécialisation.

---

## 4. Lot 2 — Règles d’achat et consolidation

### US 5 — Calculer l’état des nœuds

**Objectif** : déterminer si un nœud est acheté, achetable, verrouillé ou invalide.

**À couvrir** :
- `purchased` ;
- `available` ;
- `locked` ;
- `invalid`.

**AC** :
- un nœud invalide n’est pas achetable ;
- les raisons de blocage sont exploitables par l’UI.

---

### US 6 — Implémenter l’achat d’un nœud

**Objectif** : acheter un talent depuis un nœud valide.

**À couvrir** :
- spécialisation possédée ;
- arbre résolu ;
- nœud résolu ;
- accessibilité ;
- XP disponible ;
- persistance achat acteur.

**AC** :
- l’achat porte sur un nœud ;
- le coût vient du nœud ;
- l’achat met à jour l’acteur.

---

### US 7 — Consolider les talents possédés

**Objectif** : construire la vue consolidée des talents.

**À couvrir** :
- regroupement par `talentId` ;
- rang consolidé ;
- sources ;
- activation ;
- ranked / non-ranked.

**AC** :
- la vue consolidée est dérivée ;
- elle n’est pas source de vérité.

---

### US 8 — Gérer ranked et non-ranked dupliqués

**Objectif** : appliquer les règles de consolidation spécifiques.

**À couvrir** :
- ranked : rang augmenté par nœud acheté ;
- non-ranked : bénéfice non cumulatif ;
- non-ranked achetable dans plusieurs arbres pour progression.

**AC** :
- un ranked acheté dans deux arbres donne rang 2 ;
- un non-ranked acheté dans deux arbres apparaît une seule fois avec plusieurs sources.

---

## 5. Lot 3 — Import OggDude minimal

### US 9 — Importer les définitions génériques de talents

**Objectif** : alimenter les talents de référence.

**À couvrir** :
- nom ;
- description ;
- activation ;
- ranked ;
- tags/source ;
- données brutes dans `flags.swerpg.import`.

**AC** :
- aucun coût XP n’est stocké sur la définition générique.

---

### US 10 — Importer les arbres de spécialisation

**Objectif** : créer les référentiels `specialization-tree`.

**À couvrir** :
- spécialisation liée ;
- carrière liée si disponible ;
- nœuds ;
- positions ;
- coûts ;
- connexions si disponibles.

**AC** :
- l’arbre est exploitable par la couche domaine ;
- l’acteur ne reçoit pas une copie complète de l’arbre.

---

### US 11 — Gérer les données OggDude incomplètes

**Objectif** : éviter les imports silencieusement faux.

**À couvrir** :
- talent inconnu ;
- coût manquant ;
- connexion manquante ;
- arbre sans spécialisation ;
- warnings.

**AC** :
- les données brutes sont conservées ;
- un nœud incomplet est marqué invalide ou non achetable ;
- aucun fallback implicite dangereux n’est appliqué.

---

## 6. Lot 4 — Onglet Talents

### US 12 — Refondre l’onglet Talents en vue consolidée

**Objectif** : afficher les talents possédés en jeu.

**À couvrir** :
- liste consolidée ;
- nom ;
- activation ;
- ranked ;
- rang ;
- sources.

**AC** :
- l’onglet affiche les talents depuis la vue consolidée ;
- aucun achat n’est possible depuis l’onglet.

---

### US 13 — Afficher rangs et sources

**Objectif** : rendre lisible l’origine et le niveau des talents.

**À couvrir** :
- rang consolidé ;
- spécialisation(s) source(s) ;
- cas multi-spé ;
- cas talent non résolu.

**AC** :
- un ranked multi-source affiche le bon rang ;
- un non-ranked multi-source n’apparaît pas en doublon.

---

### US 14 — Accéder à la vue graphique depuis l’onglet

**Objectif** : ouvrir la vue des arbres depuis la fiche.

**À couvrir** :
- bouton ou action dédiée ;
- ouverture application arbre ;
- acteur courant transmis.

**AC** :
- l’utilisateur peut ouvrir les arbres depuis l’onglet Talents ;
- l’achat reste dans la vue arbre, pas dans l’onglet.

---

## 7. Lot 5 — Vue graphique des arbres

### US 15 — Créer l’application graphique dédiée

**Objectif** : remplacer l’ancien canvas fonctionnellement.

**À couvrir** :
- application Foundry dédiée ;
- indépendante du canvas de scène ;
- base de rendu graphique ;
- cycle de vie ouverture / fermeture.

**AC** :
- la vue ne dépend pas du canvas de scène ;
- l’ancien arbre Crucible n’est pas reconduit comme base métier.

---

### US 16 — Afficher arbres, nœuds et connexions

**Objectif** : rendre l’arbre de spécialisation sélectionné.

**À couvrir** :
- nœuds ;
- connexions ;
- coût ;
- nom talent ;
- états visuels.

**AC** :
- les états `purchased`, `available`, `locked`, `invalid` sont distinguables.

---

### US 17 — Sélectionner la spécialisation courante

**Objectif** : naviguer entre les arbres possédés.

**À couvrir** :
- liste des spécialisations possédées ;
- sélection courante ;
- arbre indisponible / incomplet.

**AC** :
- la sélection est un état UI ;
- les autres spécialisations restent consultables.

---

### US 18 — Acheter un nœud depuis la vue graphique

**Objectif** : déclencher l’achat depuis un nœud disponible.

**À couvrir** :
- clic / action achat ;
- appel couche domaine ;
- retour succès / échec ;
- messages de blocage.

**AC** :
- la vue ne persiste pas directement l’achat ;
- un nœud verrouillé ou invalide ne peut pas être acheté.

---

## 8. Lot 6 — Synchronisation, audit et nettoyage

### US 19 — Synchroniser achat, arbre et onglet Talents

**Objectif** : garder les vues cohérentes après achat.

**À couvrir** :
- recalcul vue consolidée ;
- refresh onglet Talents ;
- refresh vue graphique ;
- recalcul états de nœuds.

**AC** :
- un achat est visible dans les deux vues ;
- aucun doublon de vue consolidée n’est persisté comme source de vérité.

---

### US 20 — Produire une opération audit/log

**Objectif** : rendre l’achat traçable.

**À couvrir** :
- acteur ;
- spécialisation ;
- arbre ;
- nœud ;
- talent ;
- coût XP ;
- rang avant/après si disponible.

**AC** :
- l’acteur ne stocke pas l’historique ;
- l’audit/log peut recevoir une opération structurée ;
- l’achat n’est pas bloqué si l’audit/log est indisponible.

---

### US 21 — Neutraliser les anciennes logiques Crucible

**Objectif** : éviter les conflits avec la V1.

**À couvrir** :
- `rank * 5` ;
- `isCreation` ;
- talent points ;
- arbre global ;
- `choice wheel` métier ;
- achat direct de talent générique.

**AC** :
- le flux V1 n’utilise plus ces logiques ;
- les anciens modules sont supprimés, isolés ou rendus inaccessibles au flux V1.

---

### US 22 — Couvrir la V1 par tests

**Objectif** : sécuriser les règles critiques.

**À couvrir** :
- achat simple ;
- ranked multi-arbres ;
- non-ranked multi-arbres ;
- nœud verrouillé ;
- nœud invalide ;
- import minimal ;
- synchronisation ;
- audit/log.

**AC** :
- les règles critiques sont couvertes ;
- les scénarios manuels sont documentés.