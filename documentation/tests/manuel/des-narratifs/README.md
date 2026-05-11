# Tests manuels — Dés narratifs

Tests du système de dés narratifs (StandardCheck, AttackRoll) : construction du pool, jets, résultats, dialog et rendu chat.

---

## Prérequis

- Personnage avec des caractéristiques et compétences définies
- Optionnel : arme équipée pour tester AttackRoll
- Acteur avec des actions configurées

---

## 1. StandardCheck — Jet de base

### 1.1. Construction du pool de dés

Le `StandardCheck` hérite de `Roll` Foundry.

**Pool de base :** 3d8

| Action | Résultat attendu |
|--------|------------------|
| Construire un StandardCheck sans modificateur | Pool = 3d8 |
| Appliquer 1 boon (augmente un dé de +2 steps) | Un d8 passe en d10 |
| Appliquer 2 boons | Deux d8 passent en d10, ou un d8 en d12 |
| Appliquer 1 bane | Un d8 descend en d6 |
| Appliquer 2 banes | Un d8 descend en d4, ou deux en d6 |
| Boons appliqués Left-To-Right (d'abord les dés les plus faibles) | Ordre correct |
| Banes appliqués Right-To-Left (d'abord les dés les plus forts) | Ordre correct |

### 1.2. Limites de boons/banes

| Action | Résultat attendu |
|--------|------------------|
| Appliquer 6 boons maximum | Au-delà, les boons supplémentaires sont ignorés |
| Appliquer 6 banes maximum | Au-delà, les banes sont ignorés |
| Pool minimum : `minDie = 4` (d4) | Aucun dé ne descend sous d4 |
| Pool maximum : `maxDie = 12` (d12) | Aucun dé ne dépasse d12 |
| Boon/Bane step : 2 | Step fixe de 2 (d8 → d10, d8 → d6) |

### 1.3. Jet final

| Action | Résultat attendu |
|--------|------------------|
| Vérifier le total : `pool dice + ability bonus + skill bonus + enchantment bonus` | Total correct |
| `ability = valeur de caractéristique (0-12)` | Ajouté |
| `skill = rang de compétence (-4 à 12)` | Ajouté |
| `enchantment = bonus d'enchantement (0-6)` | Ajouté |

### 1.4. Seuils de difficulté

| Action | Résultat attendu |
|--------|------------------|
| Chaque niveau de difficulté a un DC : Trivial(10), Easy(15), Moderate(20), Challenging(25), Difficult(30), Formidable(35), Impossible(45) | Le DC est correct pour chaque niveau |
| Mode passif : `PassiveCheck = 10` | Vérifier le calcul passif |

### 1.5. Résultats

| Action | Résultat attendu |
|--------|------------------|
| `total > DC` → `isSuccess = true` | Succès |
| `total > DC + 6` → `isCriticalSuccess = true` | Succès critique |
| `total <= DC` → `isFailure = true` | Échec |
| `total < DC - 6` → `isCriticalFailure = true` | Échec critique |

---

## 2. AttackRoll — Jet d'attaque

### 2.1. Pool étendu

| Action | Résultat attendu |
|--------|------------------|
| `AttackRoll` étend `StandardCheck` | Même mécanismes que StandardCheck |
| Attributs supplémentaires : `target`, `defenseType`, `result` | Présents dans le roll |
| `result` est un type de `RESULT_TYPES` | MISS(0), DODGE(1), PARRY(2), BLOCK(3), ARMOR(4), RESIST(5), GLANCE(6), HIT(7) |

### 2.2. Calcul des dégâts

| Action | Résultat attendu |
|--------|------------------|
| `overflow = total - DC` | Le surplus est calculé |
| `damage = overflow * multiplier + base + bonus - resistance` | Formule appliquée |
| `overflow * multiplier` → bonus de réussite | Plus le jet est haut, plus les dégâts sont élevés |
| Dégâts clampés entre 1 et `2 * preMitigation` | Minimum 1, maximum double avant réduction |

---

## 3. StandardCheckDialog — Dialogue de jet

### 3.1. Ouverture

| Action | Résultat attendu |
|--------|------------------|
| Déclencher un check standard (clic sur compétence ou action) | `StandardCheckDialog` s'ouvre |
| Le dialogue est une sous-classe de `DialogV2` | Fenêtre Foundry standard |

### 3.2. Configuration du jet

| Action | Résultat attendu |
|--------|------------------|
| Sélecteur de niveau de difficulté | Trivial → Impossible (7 niveaux) |
| Saisie manuelle du DC | Champ DC éditable |
| Boutons Boon/Bane (+/-, jusqu'à 6 chaque) | Les valeurs s'incrémentent/décrémentent |
| Roll Mode : public, gm, blind, self | Le mode choisi est appliqué |

### 3.3. Boutons d'action

| Action | Résultat attendu |
|--------|------------------|
| Cliquer "Roll" | Le jet est effectué et affiché dans le chat |
| Cliquer "Request" | Une demande de jet est envoyée (socket) |

---

## 4. ActionUseDialog — Dialogue d'utilisation d'action

### 4.1. Ciblage

| Action | Résultat attendu |
|--------|------------------|
| `ActionUseDialog` étend `StandardCheckDialog` | Mêmes fonctionnalités que le check standard |
| Template targeting : cône, cercle, rayon, rectangle pour les AOE | Les gabarits sont plaçables |
| Bouton "Place Template" pour les AOE | Le template apparaît sur la scène |

### 4.2. Liste de cibles

| Action | Résultat attendu |
|--------|------------------|
| La liste des cibles s'affiche dans le dialogue | Les tokens sélectionnés sont listés |
| Les cibles invalides (hors portée) sont signalées | Tooltip d'erreur sur les cibles hors-limite |

### 4.3. Tags de contexte

| Action | Résultat attendu |
|--------|------------------|
| Les tags d'activation et de contexte de l'action sont affichés | Tags visibles (30+ définis) |

---

## 5. Affichage dans le chat

### 5.1. Rendu du jet

| Action | Résultat attendu |
|--------|------------------|
| Template `standard-check-chat.hbs` | Carte de jet affichée dans le chat |
| Template `action-use-chat.hbs` | Carte d'action affichée |
| Template `standard-check-roll.hbs` (partial) | Détails du roll |
| Template `standard-check-details.hbs` (partial) | Détails supplémentaires |

### 5.2. Informations affichées

| Action | Résultat attendu |
|--------|------------------|
| Pool de dés (d8/d10/d12/d6/d4) | Visible dans la carte |
| Total du jet | Visible |
| DC | Visible |
| Résultat Succès/Échec + Critique | Visible |
| Boons/Banes appliqués | Visible |

### 5.3. Confirmation d'action

| Action | Résultat attendu |
|--------|------------------|
| Action non confirmée → indicateur visuel dans le chat | Badge "à confirmer" |
| Touche de raccourci `KeyX` (confirm keybinding) → confirme l'action | L'état passe à "confirmé" |
| `autoConfirm` setting : 0=none, 1=self, 2=all | Comportement de confirmation automatique |

---

## 6. Socket et multi-joueur

### 6.1. Événements socket

| Action | Résultat attendu |
|--------|------------------|
| `diceCheck` → `StandardCheck.handle(data)` | Le jet est traité côté MJ |
| `diceContest` → stub | Non implémenté (attend développement) |
| `diceGroupCheck` → stub | Non implémenté (attend développement) |

### 6.2. Jet en mode GM

| Action | Résultat attendu |
|--------|------------------|
| Lancer un jet en mode GM | Le résultat est visible par le MJ uniquement |
| Lancer un jet en mode Blind | Le MJ voit le résultat, le joueur non |
| Lancer un jet en mode Self | Seul le lanceur voit le résultat |

---

## 7. Scénarios de régression

- Lancer un StandardCheck avec 0 boon/0 bane → vérifier 3d8.
- Lancer avec 6 boons → vérifier que les dés sont tous en d12 (max).
- Lancer avec 6 banes → vérifier que les dés sont tous en d4 (min).
- Vérifier les seuils critiques : `DC + 6` = critique succès, `DC - 6` = critique échec.
- Attaque avec une arme : vérifier les dégâts = `overflow * multiplier + base + bonus - resistance`.
- Attaque avec overflow = 0 → vérifier que les dégâts sont au moins 1 (clamp min).
- Ouvrir le dialogue StandardCheckDialog → vérifier le rendu du template.
- Ouvrir ActionUseDialog avec une AOE → vérifier le bouton "Place Template".
- Changer le roll mode dans le dialogue → vérifier que le mode est pris en compte.
- Utiliser KeyX pour confirmer → vérifier que l'action est confirmée.
- Lancer un jet en tant que joueur → vérifier que le résultat apparaît dans le chat.
