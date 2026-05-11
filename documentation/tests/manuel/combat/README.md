# Tests manuels — Combat

Test du système de combat : attaque, défense, dégâts, résistances, effets de statut, tour de combat et ressources.

---

## Prérequis

- Au moins 2 acteurs dans la scène (un PJ ou adversary attaquant, une cible)
- Une arme équipée sur l'attaquant
- Optionnel : token avec barres wounds/strain visibles

---

## 1. Tour de combat

### 1.1. Initialisation

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir le combat tracker (`SwerpgCombatTracker`) | La fenêtre latérale du combat s'affiche |
| Cliquer "Démarrer le combat" | L'initiative est rollée pour chaque participant |
| Vérifier l'ordre d'initiative | Les participants sont triés par initiative décroissante |
| Vérifier que le premier combattant est actif | Son tour est marqué visuellement |

### 1.2. Déroulement d'un tour

| Action | Résultat attendu |
|--------|------------------|
| Cliquer "Tour suivant" → `onStartTurn()` est appelé | Les effets expirent, les ressources sont récupérées |
| Vérifier la récupération de ressources | `wounds.value`, `strain.value` ajustés selon les règles |
| Vérifier l'application des DOT (bleeding, burning...) | Les dégâts sur durée sont appliqués |

### 1.3. Fin de tour

| Action | Résultat attendu |
|--------|------------------|
| Cliquer "Fin de tour" → `onEndTurn()` est appelé | Les effets de fin de tour s'appliquent |
| Vérifier la capacité "Conserve Effort" si applicable | Les ressources sont gérées selon le talent |
| Vérifier l'expiration des effets basés sur le tour | Les effets "jusqu'à la fin du tour" disparaissent |

### 1.4. Action Delay

| Action | Résultat attendu |
|--------|------------------|
| Utiliser l'action "Delay" sur un personnage | L'initiative du personnage passe à une valeur inférieure |
| Vérifier que le personnage est replacé dans l'ordre d'initiative | Sa nouvelle position reflète l'initiative réduite |

### 1.5. Leave Combat

| Action | Résultat attendu |
|--------|------------------|
| Retirer un personnage du combat | `onLeaveCombat()` est appelé, nettoyage effectué |
| Vérifier que les effets temporaires sont nettoyés | Aucun état résiduel |

---

## 2. Attaque

### 2.1. Attaque armée (weaponAttack)

| Action | Résultat attendu |
|--------|------------------|
| Sélectionner l'attaquant, cliquer sur une action d'attaque | `weaponAttack(action, target, weapon)` est invoqué |
| Vérifier que `prepareStandardCheck` est hooké | Le check standard est préparé avec les bons paramètres |
| Vérifier que `prepareWeaponAttack` est hooké | Les modificateurs de l'arme sont inclus |
| Vérifier que `defendWeaponAttack` est hooké sur la cible | La défense de la cible est testée |

### 2.2. Attaque de compétence (skillAttack)

| Action | Résultat attendu |
|--------|------------------|
| Utiliser `skillAttack(action, target)` | L'attaque utilise la compétence comme base |
| Vérifier que le pool de dés est correct | Compétence + caractéristique associée |

### 2.3. Jets de défense (testDefense)

| Action | Résultat attendu |
|--------|------------------|
| Attaquer une cible → la défense est testée | `testDefense(defenseType, roll)` est appelé |
| Vérifier les types de défense physique : esquive (dodge), parade (parry), blocage (block), armure (armor), ricochet (glance), touché (hit) | Le type de défense utilisé est conforme à l'arme et à la cible |
| Vérifier les défenses basées sur les compétences | Les compétences de défense sont utilisées si applicable |

### 2.4. Résultat d'attaque (AttackRoll RESULT_TYPES)

| Action | Résultat attendu |
|--------|------------------|
| Attaquer une cible sans défense → MISS(0) | L'attaque manque |
| Cible avec esquive → DODGE(1) | Message "Esquivé" |
| Cible avec parade → PARRY(2) | Message "Paré" |
| Cible avec blocage → BLOCK(3) | Message "Bloqué" |
| Cible avec armure → ARMOR(4) ou RESIST(5) | Dégâts réduits par l'armure |
| Cible touchée → HIT(7) | Dégâts pleins appliqués |

### 2.5. Calcul des dégâts

| Action | Résultat attendu |
|--------|------------------|
| Vérifier la formule de dégâts : `overflow * multiplier + base + bonus - resistance` | Le nombre final est cohérent |
| `overflow = totalRoll - DC` | Le surplus au-dessus du DC est ajouté aux dégâts |
| Dégâts clampés entre 1 et `2 * preMitigation` | Minimum 1 dégât, maximum double des dégâts avant réduction |

---

## 3. Ciblage et modificateurs

### 3.1. Boons/Banes de cible (applyTargetBoons)

| Action | Résultat attendu |
|--------|------------------|
| Cible `Guarded` → l'attaque recoit un bane | `applyTargetBoons` ajoute un bane pour la garde |
| Cible `Prone` → modificateur selon la portée | À courte portée : boon, à longue portée : bane |
| Cible `Flanked` → boon pour l'attaquant | `commitFlanking(engagement)` active le flanking |

### 3.2. Distance et portée

| Action | Résultat attendu |
|--------|------------------|
| Arme de portée "Engaged" → ne peut cibler qu'à portée de contact | Vérifier la validation |
| Arme de portée "Short" → peut cibler jusqu'à courte distance | Fonctionne |
| Arme de portée "Extreme" → peut cibler à très longue distance | Fonctionne |

---

## 4. Résistances et types de dégâts

### 4.1. Résistance aux dégâts

| Action | Résultat attendu |
|--------|------------------|
| `getResistance(resource, damageType, restoration)` | La résistance est calculée |
| Vérifier les modificateurs : `isBroken` → résistance réduite, `isWeakened` → résistance réduite | Les statuts affectent la résistance |
| Vérifier les 12 types de dégâts : bludgeoning, piercing, slashing, poison, acid, fire, cold, electricity, psychic, radiant, void, corruption | Chaque type est traité correctement |

### 4.2. Résistance par type

| Action | Résultat attendu |
|--------|------------------|
| Attaque feu sur une cible avec résistance au feu | Les dégâts sont réduits de la valeur de résistance |
| Attaque feu sur une cible sans résistance | Dégâts pleins |
| Attaque physique sur une cible avec armure | L'armure s'applique |

---

## 5. Effets de statut

### 5.1. Application via ActionOutcome

| Action | Résultat attendu |
|--------|------------------|
| `applyActionOutcome(action, outcome, options)` | L'effet de l'action est appliqué |
| Vérifier `_applyOutcomeEffects(outcome, reverse)` | Les ActiveEffects sont créés/mis à jour/supprimés |

### 5.2. Statuts disponibles (23)

| Statut | Test |
|--------|------|
| **weakened** | Appliquer → `isWeakened` = true, dégâts réduits |
| **dead** | Blessures critiques → `isDead` = true, token marqué mort |
| **broken** | Appliquer → `isBroken` = true |
| **insane** | Appliquer → `isInsane` = true |
| **incapacitated** | Fatigue excessive → `isIncapacitated` = true |
| **staggered** | Appliquer → limite 1 action par tour |
| **stunned** | Appliquer → aucune action possible |
| **prone** | Appliquer → modificateurs d'attaque (boon à courte portée, bane à longue) |
| **restrained** | Appliquer → immobilisé |
| **slowed / hastened** | Appliquer → modificateur de vitesse |
| **disoriented** | Appliquer → malus aux tests |
| **blinded / deafened / silenced** | Appliquer → pénalités sensorielles |
| **enraged / frightened** | Appliquer → modificateurs moraux |
| **invisible** | Appliquer → bonus en attaque |
| **resolute** | Appliquer → bonus en défense morale |
| **guarded** | Appliquer → `isGuarded` = true, bane à l'attaque |
| **exposed** | Appliquer → bonus à l'attaque adverse |
| **flanked** | `commitFlanking(engagement)` → `isFlanked` = true |
| **diseased / paralyzed** | Appliquer → effets de maladie/paralysie |

### 5.3. Points de vie à zéro

| Action | Résultat attendu |
|--------|------------------|
| `wounds.value >= wounds.threshold` → `isKnockedOut` = true | KO |
| `wounds.value >= wounds.threshold × 2` → `isDead` = true | Mort |
| `isL0` via statut | Niveau 0 (hors-combat) |

---

## 6. Dégâts sur durée (DOT)

### 6.1. Application DOT

| Action | Résultat attendu |
|--------|------------------|
| Appliquer un effet `bleeding` via ActiveEffect | `applyDamageOverTime()` l'applique au début du tour |
| Appliquer `burning` | Dégâts de feu appliqués chaque tour |

### 6.2. Types DOT disponibles

bleeding, burning, chilled, confusion, corroding, decay, entropy, irradiated, mended, inspired, poisoned, shocked, staggered

| Action | Résultat attendu |
|--------|------------------|
| Appliquer chaque type de DOT | Vérifier que l'effet DOT est bien actif |
| Vérifier l'expiration au début du tour (`expireEffects(start)`) | Les effets basés sur le tour expirent |
| Vérifier l'expiration en fin de tour (`expireEffects()`) | Les effets "jusqu'à fin de tour" expirent |

---

## 7. Héroïsme

| Action | Résultat attendu |
|--------|------------------|
| `_trackHeroismDamage(resources, reverse)` | Le score d'héroïsme (`settings.heroism`) est mis à jour |
| Vérifier que le score peut être dépensé | Les actions avec coût en heroism fonctionnent |

---

## 8. Ressources en combat

### 8.1. Actions

| Action | Résultat attendu |
|--------|------------------|
| `resources.action.value` → chaque action dépense une action | Le compteur d'actions décrémente |
| `resources.action.threshold` → nombre d'actions par tour | Défini par le type de personnage |

### 8.2. Focus

| Action | Résultat attendu |
|--------|------------------|
| Vérifier le coût en focus des actions | Les actions avec focus cost consomment du focus |
| Les pips de focus sur le token sont mis à jour | Affichage correct |

---

## 9. Actions spéciales

### 9.1. castSpell

| Action | Résultat attendu |
|--------|------------------|
| Tenter `castSpell(action, target)` | Erreur "not yet implemented" (non implémenté) |

### 9.2. useAction

| Action | Résultat attendu |
|--------|------------------|
| `useAction(actionId, options)` | L'action est utilisée selon son ID |

---

## 10. Gestion des ressources via `modifyResource`

| Action | Résultat attendu |
|--------|------------------|
| `modifyResource(resourceId, delta)` | La ressource est modifiée du montant delta |
| Vérifier les ressources : wounds, strain, encumbrance, action | Chaque ressource réagit correctement |

---

## 11. Scénarios de régression

- Combat complet : dérouler 3+ tours avec attaques, dégâts, guérison, et vérifier que tous les compteurs sont corrects.
- Combat avec effets de statut : appliquer Guarded, Prone, Flanked → vérifier les boons/banes.
- Combat avec DOT : appliquer Bleeding → vérifier les dégâts au début de chaque tour.
- Combat avec Delay : utiliser Delay → vérifier le repositionnement dans l'ordre d'initiative.
- Combat multi-cibles : attaquer avec une AOE → vérifier que toutes les cibles sont touchées.
- Combat et mort : amener un personnage à 0 wounds → vérifier `isKnockedOut` puis `isDead`.
- Combat et héroïsme : dépenser des points d'héroïsme → vérifier le tracking.
