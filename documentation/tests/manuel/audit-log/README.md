# Tests manuels — Audit Log

Tests du système de journalisation d'évolution du personnage (Character Audit Log).  
Ce système intercepte les modifications des acteurs `character` via des hooks Foundry et enregistre des entrées structurées dans `actor.flags.swerpg.logs`.

---

## Prérequis

- Monde SWERPG créé et système `swerpg` activé
- Droits GM pour ouvrir la console développeur (F12)
- Un personnage `character` avec espèces/carrière/spécialisations appliquées
- Build à jour : `pnpm run rollup && pnpm run less`

---

## 1. Vérification de base

### 1.1. Lecture des logs

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir la console développeur (F12) | Console visible |
| Sélectionner le personnage dans le répertoire des acteurs | Acteur sélectionné |
| Exécuter dans la console : `game.actors.getName("NomDuPJ").flags.swerpg.logs` | Un tableau (vide si aucun log) ou la liste des entrées existantes |
| Vérifier la structure d'une entrée | Chaque entrée contient : `id`, `schemaVersion`, `timestamp`, `userId`, `userName`, `type`, `data`, `xpDelta`, `snapshot` |

### 1.2. Vérification de l'enregistrement des hooks

| Action | Résultat attendu |
|--------|------------------|
| Exécuter dans la console : `Hooks.events` | Rechercher `preUpdateActor`, `updateActor`, `createItem` dans la liste |
| Vérifier que les 3 hooks sont actifs | Les hooks sont bien enregistrés par le système |

---

## 2. Compétences

### 2.1. Achat de rang (skill.train)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir la fiche du personnage, onglet Compétences | Onglet visible |
| Cliquer sur le "+" d'une compétence de carrière (ex: Cool) | Le rang augmente, l'XP est déduite |
| Vérifier l'audit log : `flags.swerpg.logs` | Une entrée `skill.train` est créée |
| Vérifier les champs : `skillId`, `oldRank`, `newRank`, `cost`, `isCareer`, `isFree` | Tous les champs sont présents et cohérents |
| Vérifier `xpDelta` = -cost | Le delta correspond au coût négatif |

### 2.2. Achat de rang hors carrière

| Action | Résultat attendu |
|--------|------------------|
| Acheter un rang sur une compétence NON carrière | Le coût est plus élevé (rang × 5 + 5) |
| Vérifier l'entrée `skill.train` | `isCareer` = false, le `cost` reflète le surcoût |

### 2.3. Rang gratuit (isFree)

| Action | Résultat attendu |
|--------|------------------|
| Utiliser un rang gratuit carrière sur une compétence de carrière | Le rang `careerFree` augmente, aucune XP déduite |
| Vérifier l'entrée `skill.train` | `isFree` = true, `cost` = 0, `xpDelta` = 0 |

### 2.4. Oubli de rang (skill.forget)

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le "-" d'une compétence avec des rangs achetés | Le rang diminue, l'XP est remboursée |
| Vérifier l'audit log | Une entrée `skill.forget` est créée |
| Vérifier `xpDelta` positif | Le montant remboursé est créditeur |

---

## 3. Caractéristiques

### 3.1. Augmentation (characteristic.increase)

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le "+" d'une caractéristique (ex: Brawn) | La valeur augmente, coût = nouvelle valeur × 10 XP |
| Vérifier l'audit log | Une entrée `characteristic.increase` est créée |
| Vérifier les champs : `characteristicId`, `oldValue`, `newValue`, `cost` | Les données correspondent |
| Vérifier `xpDelta` = -cost | Le delta est négatif (dépense) |

---

## 4. XP

### 4.1. Dépense d'XP (xp.spend)

| Action | Résultat attendu |
|--------|------------------|
| Acheter une compétence ou une caractéristique | `system.progression.experience.spent` augmente |
| Vérifier l'audit log | Une entrée `xp.spend` peut être créée (si pas déjà couverte par skill.train) |

### 4.2. Gain d'XP (xp.grant)

| Action | Résultat attendu |
|--------|------------------|
| Accorder de l'XP via un script : `actor.update({"system.progression.experience.gained": valeur})` | `gained` augmente |
| Vérifier l'audit log | Une entrée `xp.grant` est créée avec `amount` positif |
| Vérifier `xpDelta` = +amount | Le delta est positif (gain) |

### 4.3. Remboursement d'XP (xp.refund)

| Action | Résultat attendu |
|--------|------------------|
| Oublier un rang de compétence | `spent` diminue du remboursement |
| Vérifier l'audit log | Une entrée `xp.refund` est créée (si le changement XP est pur, sans skill associé) |

---

## 5. Détails

### 5.1. Changement d'espèce (species.set)

| Action | Résultat attendu |
|--------|------------------|
| Glisser une nouvelle espèce sur la fiche | L'espèce est remplacée |
| Vérifier l'audit log | Une entrée `species.set` est créée |
| Vérifier `data.oldSpecies` et `data.newSpecies` | Les valeurs avant/après sont correctes |

### 5.2. Changement de carrière (career.set)

| Action | Résultat attendu |
|--------|------------------|
| Glisser une nouvelle carrière sur la fiche | La carrière est remplacée |
| Vérifier l'audit log | Une entrée `career.set` est créée |
| Vérifier `data.oldCareer` et `data.newCareer` | Les valeurs avant/après sont correctes |

---

## 6. Avancement

### 6.1. Changement de niveau (advancement.level)

| Action | Résultat attendu |
|--------|------------------|
| Modifier `actor.update({"system.advancement.level": 2})` depuis la console | Le niveau change |
| Vérifier l'audit log | Une entrée `advancement.level` est créée |
| Vérifier `data.oldLevel` et `data.newLevel` | Les niveaux avant/après sont corrects |

---

## 7. Talents

### 7.1. Achat de talent (talent.purchase)

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un item de type `talent` au personnage (drag & drop depuis un compendium) | Le talent est ajouté |
| Vérifier l'audit log | Une entrée `talent.purchase` est créée |
| Vérifier les champs : `talentId`, `talentName`, `cost`, `ranks` | Les données correspondent au talent ajouté |
| Vérifier `xpDelta` = -cost | Le delta est négatif (dépense) |

### 7.2. Item non-talent ignoré

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un item de type `weapon` ou `gear` au personnage | L'item est ajouté |
| Vérifier l'audit log | Aucune entrée `talent.purchase` créée (les items non-talent sont ignorés) |

---

## 8. Snapshot XP

### 8.1. Vérification du snapshot dans une entrée

| Action | Résultat attendu |
|--------|------------------|
| Effectuer une action qui génère un log (ex: acheter une compétence) | Une entrée est créée |
| Inspecter `entry.snapshot` dans la console | Le snapshot contient : `xpAvailable`, `totalXpSpent`, `totalXpGained`, `careerFreeAvailable`, `specializationFreeAvailable` |
| Vérifier la cohérence | `xpAvailable` = `totalXpGained` - `totalXpSpent` (ou valeur stockée) |

---

## 9. Limite et éviction FIFO

### 9.1. Taille max par défaut (500)

| Action | Résultat attendu |
|--------|------------------|
| Remplir le log avec 500+ entrées (script : boucle d'update avec des modifications mineures) | Le log ne dépasse pas 500 entrées |
| Vérifier que les plus anciennes sont supprimées | Les premières entrées (timestamp le plus bas) disparaissent |

### 9.2. Taille max configurable via setting

| Action | Résultat attendu |
|--------|------------------|
| Modifier le setting : `game.settings.set("swerpg", "auditLogMaxEntries", 100)` | La limite est abaissée à 100 |
| Déclencher une nouvelle entrée | Si le log a déjà 100+ entrées, les plus anciennes sont évincées |
| Restaurer la valeur par défaut : `game.settings.set("swerpg", "auditLogMaxEntries", 500)` | Limite restaurée |

---

## 10. Résilience

### 10.1. Erreur d'écriture simulée

| Action | Résultat attendu |
|--------|------------------|
| (Test indirect) Forcer une erreur en désactivant les permissions d'écriture sur l'acteur (via un module externe) | L'action utilisateur n'est PAS bloquée |
| Vérifier la console développeur | Un message `logger.error` est émis par le système d'audit |
| Vérifier la notification UI | `ui.notifications.warn` est affiché |
| Si l'utilisateur est GM : vérifier le message chuchoté | Un whisper GM est envoyé avec les détails de l'erreur |

---

## 11. Scénario de bout en bout

| Action | Résultat attendu |
|--------|------------------|
| Créer un nouveau personnage `character` | La fiche s'ouvre |
| Appliquer une espèce (drag & drop) | Entrée `species.set` créée |
| Appliquer une carrière (drag & drop) | Entrée `career.set` créée |
| Appliquer une spécialisation (drag & drop) | Entrée `specialization.add` créée |
| Acheter 3 rangs de compétence (dont 1 gratuit) | 3 entrées `skill.train` créées |
| Augmenter une caractéristique de 2→3 | Entrée `characteristic.increase` créée |
| Ajouter un talent (drag & drop) | Entrée `talent.purchase` créée |
| Vérifier le nombre total d'entrées dans `flags.swerpg.logs` | Au moins 8 entrées (species + career + spec + 3 skills + carac + talent) |
| Vérifier que `xpDelta` cumulé = `totalXpSpent` final | La somme des `xpDelta` de toutes les entrées correspond à la dépense totale |

---

## 12. Gap connu

Les entrées `specialization.remove` ne peuvent pas être testées facilement via l'UI car la suppression d'une spécialisation n'est pas encore exposée dans l'interface.  
Les entrées `xp.remove` (diminution de `gained`) ne se produisent pas dans l'UI standard — uniquement via script direct.
