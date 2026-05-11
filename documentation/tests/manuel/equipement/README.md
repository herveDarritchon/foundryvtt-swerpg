# Tests manuels — Équipement

Tests des items d'équipement : armes, armures, équipement général, encaissement, attaches/modifications.

---

## Prérequis

- Personnage avec inventaire
- Items de test disponibles : armes, armures, équipement divers

---

## 1. Types d'items d'équipement

Le système SWERPG distingue 3 types d'équipement physique :

| Type | Classe | Catégories |
|------|--------|------------|
| **weapon** | `SwerpgWeapon` | melee, ranged, gunnery, explosive, thrown, vehicle, natural |
| **armor** | `SwerpgArmor` | unarmored, light, medium, heavy, natural |
| **gear** | `SwerpgGear` | défini par `category` |

---

## 2. Création et configuration

### 2.1. Création d'une arme

| Action | Résultat attendu |
|--------|------------------|
| Créer un item de type `weapon` | L'item est créé, la `WeaponSheet` s'ouvre |
| Configurer `skill` : rangedLight, rangedHeavy, gunnery, brawl, melee, lightSaber | La compétence est enregistrée |
| Configurer `range` : engaged, short, medium, long, extreme | La portée est enregistrée |
| Configurer `damage` (0-20) | Les dégâts de base sont définis |
| Configurer `crit` (0-20) | Le seuil de critique est défini |
| Configurer `hardPoints` (0+) | Points d'attache configurés |

### 2.2. Qualités d'arme

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir le widget des qualités | La liste des 30 qualités est visible |
| Activer `accurate` → définir le rang | `{ key: 'accurate', rank: 2, hasRank: true }` |
| Activer `autoFire` (booléenne) | `{ key: 'autoFire', hasRank: false }` |
| Activer `blast` → définir le rang | Qualité blast avec rang |
| Vérifier les qualités avec `hasRank: true` : accurate, blast, breach, burn, concussive, cortosis, cumbersome, defensive, deflection, disorient, ensnare, guided, inaccurate, inferior, ion, knockdown, linked, pierce, prepare, slowFiring, stun, stunDamage, sunder, superior, tractor, unwieldy, twoHanded, vicious | Chaque qualité est correctement configurable |
| Désactiver une qualité | La qualité n'est plus active |

### 2.3. Création d'une armure

| Action | Résultat attendu |
|--------|------------------|
| Créer un item de type `armor` | L'item est créé, la `ArmorSheet` s'ouvre |
| Configurer `defense.base` (0+) | La défense de base est définie |
| Configurer `soak.base` (0+) | L'encaissement est défini |
| Configurer les propriétés : bulky, organic, sealed, full-body (0-4 propriétés) | Les propriétés sont actives |
| Configurer `hardPoints` (0+) | Points d'attache configurables |

### 2.4. Création d'un équipement

| Action | Résultat attendu |
|--------|------------------|
| Créer un item de type `gear` | L'item est créé, la `GearSheet` s'ouvre |
| Configurer `category` | La catégorie est choisie parmi `ITEM_CATEGORIES` |
| Configurer `quantity` (0+, défaut 1) | Quantité enregistrée |
| Configurer `price` | Prix défini |
| Configurer `quality` : shoddy, standard, fine, superior, masterwork | Qualité définie avec modificateur correspondant |
| Configurer `restrictionLevel` : none, restricted, military, illegal | Niveau de restriction défini |
| Configurer `encumbrance` (0+, défaut 1) | Encombrement défini |
| Configurer `rarity` (0+) | Rareté définie |
| Marquer `broken` | L'item est marqué comme cassé |

---

## 3. Inventaire du personnage

### 3.1. Onglet Inventaire

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir l'onglet Inventaire de la fiche | La liste de l'équipement s'affiche |
| Vérifier les groupes : équipé et sac à dos | Les items sont répartis selon leur état `equipped` |

### 3.2. Drag & drop dans l'inventaire

| Action | Résultat attendu |
|--------|------------------|
| Glisser une arme du répertoire vers l'inventaire | L'arme apparaît dans l'inventaire |
| Glisser une armure | L'armure apparaît |
| Glisser un équipement | L'équipement apparaît |

### 3.3. Equipement/Déséquipement

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le toggle equip d'une arme | `equipWeapon(item)` est appelé, `equipped` = true |
| Cliquer à nouveau → déséquiper | `equipped` = false |
| Équiper une armure | `equipArmor(item)` est appelé |
| Vérifier que les bonus de l'armure sont appliqués à la fiche | `defenses.armor` et `soak` mis à jour |
| Vérifier que les qualités de l'équipement s'appliquent (si actives) | Bonus visibles |

### 3.4. Suppression d'un item

| Action | Résultat attendu |
|--------|------------------|
| Clic droit → Delete sur un item de l'inventaire | L'item est supprimé |
| L'item disparaît de l'inventaire | Confirmé |

---

## 4. Calcul de l'encombrement

### 4.1. Encombrement total

| Action | Résultat attendu |
|--------|------------------|
| Ajouter des items avec `encumbrance` > 0 | `resources.encumbrance.value` augmente |
| Ajouter 3 items d'encumbrance 2 chacun | Total = 6 |
| Retirer un item | L'encumbrance diminue |
| Dépasser le seuil d'encombrement | Pénalité applicable (ralentissement, malus) |

---

## 5. Catégories d'équipement

### 5.1. Catégories d'armes (7)

| Catégorie | Test |
|-----------|------|
| melee | Arme de corps à corps |
| ranged | Arme à distance |
| gunnery | Arme lourde |
| explosive | Explosif |
| thrown | Arme de jet |
| vehicle | Arme de véhicule |
| natural | Arme naturelle (griffes, crocs) |

### 5.2. Catégories d'armure (5)

| Catégorie | Test |
|-----------|------|
| unarmored | Pas d'armure |
| light | Armure légère |
| medium | Armure moyenne |
| heavy | Armure lourde |
| natural | Armure naturelle (carapace) |

---

## 6. Qualité et enchantement

### 6.1. Qualité

| Qualité | Modificateur | Test |
|---------|-------------|------|
| shoddy | -2 | Défense/dégâts réduits de 2 |
| standard | 0 | Aucun modificateur |
| fine | +1 | Bonus +1 |
| superior | +2 | Bonus +2 |
| masterwork | +3 | Bonus +3 |

| Action | Résultat attendu |
|--------|------------------|
| Changer la qualité d'une arme | Les `derivedData` sont recalculés |
| Vérifier `config.quality` | La qualité est correcte |
| Vérifier `rarity = quality.rarity + enchantment.rarity` | Rareté dérivée correcte |

### 6.2. Enchantement

| Enchantement | Modificateur | Test |
|-------------|-------------|------|
| mundane | 0 | Aucun bonus |
| minor | +1 | Bonus +1 |
| major | +2 | Bonus +2 |
| legendary | +3 | Bonus +3 |

---

## 7. Points d'attache (Hard Points)

| Action | Résultat attendu |
|--------|------------------|
| Configurer `hardPoints` sur une arme | La valeur est affichée dans la fiche |
| Ajouter des modifications/mounts (via actions ou qualités) | Les hard points disponibles diminuent |
| Dépasser le nombre de hard points disponibles | Message d'erreur ou blocage |

---

## 8. Niveau de restriction

| Niveau | Test |
|--------|------|
| none | Aucune restriction |
| restricted | Nécessite une licence ou permis |
| military | Usage militaire uniquement |
| illegal | Interdit, possession illégale |

| Action | Résultat attendu |
|--------|------------------|
| `getTags()` sur un item gear | Le badge de restriction s'affiche |
| Changer le restrictionLevel | Le tag est mis à jour |

---

## 9. Actions liées à l'équipement

### 9.1. Actions des armes

| Action | Résultat attendu |
|--------|------------------|
| Les armes ont des `actions` embarquées (tir, attaque, etc.) | Les actions sont listées dans l'onglet Actions |
| Utiliser une action d'arme | `weaponAttack(action, target, weapon)` est invoqué |

### 9.2. Actions de l'armure

| Action | Résultat attendu |
|--------|------------------|
| Les armures peuvent avoir des actions (ex: réparation, activation de bouclier) | Actions disponibles si configurées |

---

## 10. Items cassés (broken)

| Action | Résultat attendu |
|--------|------------------|
| Marquer un item comme `broken: true` | L'item est visuellement marqué comme cassé |
| Les bonus de l'item ne s'appliquent plus | Les stats ne tiennent pas compte de l'item cassé |
| Réparer l'item (`broken: false`) | Les bonus sont restaurés |

---

## 11. Scénarios de régression

- Créer une arme avec toutes les qualités actives → vérifier que toutes les qualités sont bien persistées et affichées.
- Créer une armure avec les 4 propriétés → vérifier que bulky, organic, sealed, full-body sont tous actifs.
- Équiper une arme → vérifier qu'elle passe dans la section "Équipé".
- Déséquiper une armure → vérifier que les bonus de défense/soak sont retirés.
- Ajouter des items jusqu'à dépasser l'encumbrance → vérifier la pénalité.
- Changer la qualité d'une arme en "masterwork" → vérifier que le bonus +3 est appliqué.
- Marquer un item comme "broken" → vérifier qu'il n'apporte plus ses bonus.
- Créer un item avec restriction "illegal" → vérifier le tag dans l'inventaire.
- Supprimer un item équipé → vérifier que les bonus sont retirés avant la suppression.
- Vérifier que les hard points sont correctement suivis (utilisés/disponibles).
- Modifier un item dans la feuille → vérifier que les changements se reflètent dans l'inventaire du personnage.
- Recharger la page → vérifier que tous les équipements sont persistés.
