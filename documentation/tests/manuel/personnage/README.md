# Tests manuels — Fiche Personnage

Création, modification, progression et gestion d'un personnage joueur.

---

## Prérequis

- Monde SWERPG créé et système `swerpg` activé
- Droits GM pour créer/modifier des acteurs
- Packs de compendium système disponibles (espèces, carrières, spécialisations)

---

## 1. Création d'un personnage

### 1.1. Création via le répertoire

| Action | Résultat attendu |
|--------|------------------|
| Cliquer "Créer un acteur" dans le répertoire des acteurs | La fenêtre de création s'ouvre |
| Choisir le type `character` | Le type personnage est sélectionné |
| Nommer le personnage "Test-PJ-1" | Nom enregistré |
| Valider | Un nouvel acteur `character` apparaît dans le répertoire |

### 1.2. Ouverture de la fiche

| Action | Résultat attendu |
|--------|------------------|
| Double-clic sur le personnage | La `CharacterSheet` s'ouvre (ApplicationV2) |
| Vérifier la présence de 8 tabs | Attributs, Actions, Inventaire, Compétences, Talents, Effets, Biographie, Engagements |
| Vérifier l'en-tête (portrait, nom, barres wounds/strain) | En-tête affiché avec barres de ressources |
| Vérifier le sidebar (caractéristiques) | Les 6 caractéristiques (Brawn, Agility...) sont listées |

---

## 2. Application d'une espèce

### 2.1. Drag & drop depuis le compendium

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir un compendium contenant des items `species` | Liste des espèces visible |
| Glisser-déposer une espèce (ex: "Bothan") sur la fiche | Les champs suivants sont mis à jour automatiquement : |
| | — `details.species` : espèce renseignée avec nom, image |
| | — `characteristics` : valeurs de base positionnées (1-5) selon l'espèce |
| | — `thresholds.wounds` : seuil de blessures modifié |
| | — `thresholds.strain` : seuil de fatigue modifié |
| | — `progression.experience` : `gained` = startingExperience de l'espèce |
| | — `details.biography.public` : description de l'espèce copiée |

### 2.2. Changement d'espèce

| Action | Résultat attendu |
|--------|------------------|
| Glisser une autre espèce par-dessus | L'espèce est remplacée, les caractéristiques sont réinitialisées |
| Les points d'expérience sont-ils recalculés ? | Vérifier que `gained` reflète la nouvelle espèce |

---

## 3. Application d'une carrière

### 3.1. Drag & drop

| Action | Résultat attendu |
|--------|------------------|
| Glisser une `career` (ex: "Bounty Hunter") sur la fiche | `details.career` est renseigné |
| Les `careerSkills` de la carrière sont marquées comme compétences de carrière sur l'onglet Compétences | Indicateur visuel (icône ou couleur) sur les compétences concernées |
| `freeSkillRank` de la carrière est crédité dans `progression.freeSkillRanks.career` | `gained` = 4 (ou valeur configurée) |

### 3.2. Changement de carrière

| Action | Résultat attendu |
|--------|------------------|
| Glisser une autre carrière | La carrière est remplacée |
| Les compétences de carrière sont mises à jour | Nouvelles compétences marquées, anciennes dé-marquées |

---

## 4. Application d'une spécialisation

### 4.1. Drag & drop

| Action | Résultat attendu |
|--------|------------------|
| Glisser une `specialization` (ex: "Assassin") sur la fiche | `details.specializations` contient la spécialisation |
| Les `specializationSkills` sont marquées | Indicateur visuel distinct de celui des compétences de carrière |
| `freeSkillRank` est crédité dans `progression.freeSkillRanks.specialization` | `gained` = 4 (ou valeur configurée) |

### 4.2. Spécialisations multiples

| Action | Résultat attendu |
|--------|------------------|
| Ajouter une seconde spécialisation | Les deux apparaissent dans `details.specializations` |
| Les compétences des deux sont marquées | Les deux jeux de compétences sont visibles |
| Vérifier que les rangs gratuits sont additionnés | `gained` = 4 + 4 = 8 |

---

## 5. Caractéristiques

### 5.1. Augmentation

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le bouton "+" d'une caractéristique (ex: Brawn) | La valeur `base` augmente de 1 (max 5) |
| Vérifier la dépense d'XP | Coût = nouvelle valeur × 10 (ex: passer de 3 à 4 coûte 40 XP) |
| Vérifier le log d'audit | Une entrée `characteristic.increase` est créée |

### 5.2. Diminution (forget)

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le bouton "-" d'une caractéristique au-dessus du niveau de base | La valeur diminue, l'XP est remboursée |
| Impossible de descendre sous le `base` de l'espèce | Le bouton "-" est désactivé ou le minimum est bloqué à la valeur d'espèce |

### 5.3. Bonus externes

| Action | Résultat attendu |
|--------|------------------|
| Appliquer un effet qui donne un bonus de caractéristique (via ActiveEffect ou Talent) | Le champ `bonus` est mis à jour |
| Vérifier que la valeur effective (base + trained + bonus) est correcte dans le header | La somme s'affiche |

---

## 6. Compétences

### 6.1. Achat de rang

| Action | Résultat attendu |
|--------|------------------|
| Sur l'onglet Compétences, identifier une compétence de carrière | La compétence est marquée visuellement |
| Cliquer sur le bouton "+" pour acheter un rang | Coût calculé : carrière → rang × 5, hors carrière → rang × 5 + 5 |
| Vérifier la déduction d'XP | `progression.experience.spent` augmente du coût |
| Vérifier le log d'audit | Entrée `skill.train` créée |

### 6.2. Rangs gratuits (carrière)

| Action | Résultat attendu |
|--------|------------------|
| Utiliser un rang gratuit carrière sur une compétence de carrière | `careerFree` passe de 0 à 1, aucune XP déduite |
| Vérifier que `freeSkillRanks.career.spent` s'incrémente | Le compteur de rangs gratuits disponibles diminue |

### 6.3. Rangs gratuits (spécialisation)

| Action | Résultat attendu |
|--------|------------------|
| Utiliser un rang gratuit spécialisation sur une compétence de spécialisation | `specializationFree` passe de 0 à 1, aucune XP déduite |
| Vérifier que `freeSkillRanks.specialization.spent` s'incrémente | Même mécanisme que carrière |

### 6.4. Oubli d'un rang

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le bouton "-" pour retirer un rang acheté | Le rang est retiré, l'XP est remboursée |
| Impossible de retirer un rang gratuit | Le bouton "-" ne descend pas sous les rangs gratuits |

### 6.5. Palier de compétence

| Action | Résultat attendu |
|--------|------------------|
| Vérifier les paliers : untrained(0), novice(1), apprentice(2), specialist(3), adept(4), master(5) | Les paliers s'affichent correctement |
| Vérifier le total = base(0) + careerFree + specializationFree + trained | Le total est la somme des 4 sources |

---

## 7. Ressources

### 7.1. Blessures (Wounds)

| Action | Résultat attendu |
|--------|------------------|
| Modifier `resources.wounds.value` via un effet ou une action | La barre de token se met à jour |
| Si `wounds.value >= wounds.threshold` → `isKnockedOut` = true | Vérifier le statut KO |
| Si `wounds.value >= wounds.threshold × 2` → `isDead` = true | Vérifier le statut Mort |

### 7.2. Fatigue (Strain)

| Action | Résultat attendu |
|--------|------------------|
| Modifier `resources.strain.value` | Barre fatigue mise à jour |
| Si `strain.value > strain.threshold` → `isIncapacitated` = true | Vérifier le statut Incapacité |

### 7.3. Encumbrance

| Action | Résultat attendu |
|--------|------------------|
| Ajouter des objets à l'inventaire | `resources.encumbrance.value` augmente |
| Si `encumbrance.value > encumbrance.threshold` → pénalité applicable | Vérifier le message ou l'indicateur visuel |

---

## 8. Progression et XP

### 8.1. Suivi de l'XP

| Action | Résultat attendu |
|--------|------------------|
| Noter les valeurs initiales : `spent`, `gained` | `gained` = startingExperience de l'espèce |
| Acheter une compétence | `spent` augmente, le disponible = gained - spent diminue |
| Accorder de l'XP (via un effet ou script) | `gained` augmente, une entrée `xp.grant` est créée dans l'audit log |

### 8.2. XP négative

| Action | Résultat attendu |
|--------|------------------|
| Retirer de l'XP (via script) | `gained` diminue, entrée `xp.remove` créée |
| Vérifier que l'XP disponible ne passe pas en négatif | Minimum à 0 |

---

## 9. Engagements (onglet Commitments)

| Action | Résultat attendu |
|--------|------------------|
| Glisser une `obligation` sur la fiche | L'obligation s'affiche dans l'onglet Engagements |
| Modifier la valeur de l'obligation (0-50 par pallier de 5) | La valeur est persistée |
| Glisser une `duty` | Le devoir s'affiche |
| Glisser une `motivation` | La motivation s'affiche |

---

## 10. Biographie

| Action | Résultat attendu |
|--------|------------------|
| Onglet Biographie : éditer le champ Public (HTML) | Le texte enrichi est sauvegardé |
| Éditer le champ Privé (HTML) | Texte privé sauvegardé (visible GM seulement) |
| Éditer les champs Notable Features, Age, Gender, Height, Build, Hair, Eyes | Tous les champs sont persistés |
| Vérifier le rendu dans la fiche | Le HTML s'affiche correctement (pas de XSS, pas de balises cassées) |

---

## 11. Actions

| Action | Résultat attendu |
|--------|------------------|
| Onglet Actions : vérifier la liste des actions disponibles | Les actions sont groupées par type (Attaque, Réaction, Mouvement, Général) |
| Cliquer sur l'icône étoile d'une action → Favorite | L'action est marquée comme favorite |
| Cliquer sur l'icône d'utilisation → `actionUse()` | Le dialogue `ActionUseDialog` s'ouvre ou l'action est exécutée |
| Cliquer sur l'icône d'édition → `actionEdit()` | La fenêtre de configuration d'action s'ouvre |

---

## 12. Effets

| Action | Résultat attendu |
|--------|------------------|
| Onglet Effets : ajouter un effet temporaire | L'effet apparaît dans la liste |
| Basculer l'effet actif/inactif (toggle) | Le state est mis à jour |
| Supprimer un effet | L'effet disparaît |

---

## 13. Audit log

| Action | Résultat attendu |
|--------|------------------|
| Effectuer plusieurs achats/oublis | L'audit log (`flags.swerpg.logs`) contient des entrées |
| Vérifier le format d'une entrée : `type`, `data`, `xpDelta`, `snapshot`, `timestamp`, `userId`, `userName` | Tous les champs sont présents et cohérents |
| Vérifier la limite (`auditLogMaxEntries`, défaut 500) | Au-delà de 500 entrées, les plus anciennes sont supprimées |

---

## 14. Scénarios de régression

- Créer un personnage, lui assigner espèce + carrière + spécialisation, dépenser toute l'XP, vérifier que les totaux sont cohérents.
- Ré-affecter une nouvelle espèce après avoir dépensé de l'XP : les caractéristiques se réinitialisent-elles correctement ?
- Supprimer une spécialisation : les rangs gratuits sont-ils recalculés ?
- Charger un personnage existant : vérifier que toutes les données sont correctement hydratées.
- Créer 2 personnages avec des espèces différentes et comparer les valeurs de base.
