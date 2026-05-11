# Tests manuels — Véhicules

Tests des véhicules : création, pilotage et combat naval.

> **Note :** Le module véhicules est actuellement en développement partiel. Les fonctionnalités marquées [Non implémenté] sont des stubs ou absentes.

---

## Prérequis

- Acteur de type adversaire configuré pour représenter un véhicule
- Compréhension des règles de véhicules SWRPG (manoeuvrabilité, équipage, armement)

---

## 1. Création d'un véhicule

### 1.1. Type d'acteur

| Action | Résultat attendu |
|--------|------------------|
| Créer un nouvel acteur | La fenêtre de création s'ouvre |
| Choisir le type `adversary` pour représenter un véhicule | Le type adversaire est sélectionné (pas de type vehicle dédié) |
| Configurer `advancement.level` (-5 à 24) | Le niveau correspond à la puissance du véhicule |
| Configurer `advancement.threat` (minion/normal/elite/boss) | La menace définit les actions max |

### 1.2. Adversary comme véhicule

| Action | Résultat attendu |
|--------|------------------|
| Les caractéristiques sont en mode `value` (pas de base/trained) | Les valeurs sont des entiers simples |
| Les compétences s'auto-scale : `_autoSkillRank = ceil(threatLevel / 6)` | Le rank automatique est calculé (0-5) |
| `maxAction = threatConfig.actionMax` | Nombre d'actions défini par la menace |

---

## 2. Équipement du véhicule

### 2.1. Armes de véhicule

| Action | Résultat attendu |
|--------|------------------|
| Créer une arme avec `weaponType: 'vehicle'` | L'arme est catégorisée comme arme de véhicule |
| Configurer `range` adapté au combat spatial (long, extreme) | Portée configurable |
| Ajouter des qualités spécifiques (linked, blast, etc.) | Qualités configurables |
| Glisser l'arme dans l'inventaire du véhicule | L'arme apparaît dans l'inventaire |

### 2.2. Attaches et modifications

| Action | Résultat attendu |
|--------|------------------|
| Configurer `hardPoints` | Points d'attache définis |
| Les modifications sont-elles supportées ? | [Vérifier l'état d'avancement] |

---

## 3. Combat de véhicules

### 3.1. Attaque de véhicule

| Action | Résultat attendu |
|--------|------------------|
| Utiliser `weaponAttack(action, target, weapon)` sur un véhicule | L'attaque fonctionne avec les mêmes mécanismes que le combat PJ |
| Vérifier la compétence utilisée : `gunnery` pour les armes lourdes | La compétence est correcte |

### 3.2. Défense de véhicule

| Action | Résultat attendu |
|--------|------------------|
| `testDefense(defenseType, roll)` sur un véhicule | Les défenses s'appliquent (armor, dodge, etc.) |
| Vérifier `getResistance(resource, damageType, restoration)` | Les résistances sont calculées |

### 3.3. Dégâts et réparations

| Action | Résultat attendu |
|--------|------------------|
| Appliquer des dégâts au véhicule | `resources.wounds` se met à jour |
| Vérifier les statuts : `isBroken`, `isDisabled` (si véhicule) | [Vérifier la présence des statuts] |

---

## 4. Fonctionnalités non implémentées

| Fonctionnalité | Statut |
|----------------|--------|
| Type d'acteur `vehicle` dédié | Non implémenté (utiliser `adversary`) |
| Fiche de véhicule spécifique | Non implémenté (utiliser `AdversarySheet`) |
| Manoeuvrabilité (silhouette, vitesse) | Non implémenté |
| Équipage et passagers | Non implémenté |
| Système de dégâts critiques véhicule | Non implémenté |
| Compétences de pilotage dédiées | À vérifier |
| Règles de crash/ collision | Non implémenté |

---

## 5. Scénarios de régression

- Créer un adversaire configuré comme vaisseau (niveau, menace) → vérifier que la fiche s'affiche correctement.
- Ajouter une arme de catégorie `vehicle` → vérifier qu'elle apparaît dans l'inventaire.
- Équiper l'arme sur le véhicule → vérifier le toggle equip.
- Simuler une attaque de véhicule → vérifier que `gunnery` est utilisé comme compétence.
- Appliquer des dégâts → vérifier que les wounds du véhicule se mettent à jour.
- Vérifier que les compétences auto-scale fonctionnent correctement pour le niveau du véhicule.
- Documenter les fonctionnalités manquantes pour le planning de développement.
