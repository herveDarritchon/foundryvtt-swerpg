# Tests manuels — Talents

Tests du système de talents : arbre de talents, achat, activation, effets mécaniques, cumul (ranked).

---

## Prérequis

- Personnage avec espèces/carrière/spécialisations appliquées
- Talents disponibles dans le répertoire ou compendium
- Écran suffisamment large pour afficher le canvas secondaire de l'arbre de talents

---

## 1. Onglet Talents de la fiche

### 1.1. Organisation

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir l'onglet Talents de la `CharacterSheet` | Les talents sont visibles |
| Vérifier les groupes : Signature, Actifs, Passifs | Les talents sont triés par type d'activation |
| Vérifier le bouton d'ouverture de l'arbre de talents | Le bouton "Talent Tree" est présent |

### 1.2. Ajout d'un talent via drag & drop

| Action | Résultat attendu |
|--------|------------------|
| Glisser un talent du répertoire sur l'onglet Talents | Le talent est ajouté au personnage |
| Vérifier que `trees` (spécialisation/career) est renseigné | L'UUID de l'item parent est stocké |
| Vérifier que `isRanked` impacte l'affichage | Les talents ranked montrent un compteur de rangs |

---

## 2. Arbre de talents (Talent Tree Canvas)

### 2.1. Ouverture

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur le bouton "Talent Tree" de la fiche | Un canvas PIXI.js secondaire s'ouvre (`SwerpgTalentTree`) |
| Vérifier que l'arbre est centré et visible | Tous les noeuds s'affichent |
| Vérifier les tiers (tiers) : -1 (origin/root), 0 (12 nodes), 1 (16 nodes), 2 (20 nodes), 3 (signature, ~28 nodes), 4 (30 nodes) | Les noeuds sont répartis par tiers |

### 2.2. Navigation

| Action | Résultat attendu |
|--------|------------------|
| Clic droit glissé → panoramique | Le canvas se déplace |
| Molette → zoom avant/arrière | Le canvas zoome |
| Les contrôles (boutons Close/Reset) sont visibles (`SwerpgTalentTreeControls`) | Les boutons overlay fonctionnent |

### 2.3. Interaction avec les noeuds

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur un noeud verrouillé → rien ne se passe | Noeud inactif |
| Cliquer sur un noeud déverrouillé → la roue de choix apparaît | `SwerpgTalentChoiceWheel` s'ouvre |
| La roue affiche les talents disponibles pour ce noeud | Liste des talents du noeud |
| Survoller un noeud → `SwerpgTalentHUD` avec infobulle | Le HUD montre les prérequis et le nom du noeud |
| Survoller un talent dans la roue → infobulle du talent | Description du talent visible |

### 2.4. Achat d'un talent

| Action | Résultat attendu |
|--------|------------------|
| Dans la roue de choix, clic gauche sur un talent | Le talent est acheté |
| Vérifier que le noeud passe à l'état "acheté" | L'icône du noeud change (couleur, coche) |
| Vérifier que les connexions (arêtes) sont dessinées entre les noeuds achetés | Les liens sont visibles |
| Vérifier que les noeuds enfants sont déverrouillés | Les prérequis sont satisfaits |

### 2.5. Suppression d'un talent

| Action | Résultat attendu |
|--------|------------------|
| Clic droit sur un talent acheté | Un dialogue de confirmation s'affiche |
| Confirmer la suppression | Le talent est retiré, l'XP est remboursée |
| Vérifier que le noeud revient à l'état "déverrouillé" | L'icône revient à l'état normal |
| Vérifier que les noeuds enfants sont verrouillés si prérequis non satisfaits | Blocage en chaîne |

### 2.6. Sons

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur un noeud ou un talent | Un son `click1-5.wav` est joué |
| Les sons sont optionnels (pas d'erreur si fichiers absents) | Pas de crash si audio manquant |

### 2.7. Fermeture

| Action | Résultat attendu |
|--------|------------------|
| Cliquer le bouton Close | Le canvas secondaire se ferme, la fiche acteur est restaurée |
| Aucun état résiduel | Le canvas PIXI est détruit proprement |

---

## 3. Types de talents

### 3.1. Talents passifs

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un talent avec `activation: passive` | Le talent est listé dans la section "Passifs" |
| L'effet est appliqué automatiquement (sans intervention du joueur) | Bonus permanent actif |

### 3.2. Talents actifs

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un talent avec `activation: active` | Le talent est listé dans la section "Actifs" |
| Le talent peut être utilisé comme une action | Les `actions` du talent sont disponibles |

### 3.3. Talents ranked

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un talent `isRanked: true` | Le compteur de rang s'affiche (ex: rank 1/5) |
| Augmenter le rang → `rank.idx` s'incrémente, `rank.cost` est déduit | L'XP est dépensée |
| L'effet du talent évolue avec le rang | Bonus × rang |

### 3.4. Talents signatures (Tier 3)

| Action | Résultat attendu |
|--------|------------------|
| Atteindre le Tier 3 dans l'arbre | Les noeuds signature sont déverrouillés |
| Les talents signatures ont des capacités de groupe (group teleport) | Fonctionnalité spécifique active |

---

## 4. Effets mécaniques des talents

### 4.1. Modificateurs de caractéristiques

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un talent qui donne +1 Brawn | `characteristics.brawn.bonus` passe à 1 |
| La caractéristique effective dans le header est mise à jour | Total = base + trained + bonus |

### 4.2. Modificateurs de compétences

| Action | Résultat attendu |
|--------|------------------|
| Ajouter un talent qui donne un bonus de compétence | Le rang effectif de la compétence est augmenté |
| Le bonus s'affiche dans l'onglet Compétences | Indicateur de bonus visible |

### 4.3. Modificateurs de pool de dés

| Action | Résultat attendu |
|--------|------------------|
| Les talents avec `diemodifiers` (mappés par `oggdude-talent-diemodifiers-map.mjs`) | Les modificateurs de dés sont appliqués au pool |

---

## 5. Actor hooks des talents

| Action | Résultat attendu |
|--------|------------------|
| Les talents avec `actorHooks` sont enregistrés | Les hooks sont appelés aux moments appropriés (début de tour, fin de tour, etc.) |
| `hook: 'onStartTurn'` → exécuté au début du tour | Fonctionne |
| `hook: 'onEndTurn'` → exécuté en fin de tour | Fonctionne |

---

## 6. Règles de précédence et cumul

### 6.1. Cumul de ranked talents

| Action | Résultat attendu |
|--------|------------------|
| Ajouter 3 rangs d'un talent ranked | L'effet est appliqué 3 fois (ex: +3 au lieu de +1) |
| Retirer un rang → l'effet diminue | Correct |

### 6.2. Conflit entre talents

| Action | Résultat attendu |
|--------|------------------|
| Deux talents qui modifient la même caractéristique | Le dernier appliqué prend-il le dessus ? Les deux se cumulent-ils ? |
| Vérifier la règle métier : les bonus de même type se cumulent-ils ou seul le plus grand s'applique ? | Conforme aux règles SW |

---

## 7. Scénarios de régression

- Ouvrir l'arbre de talents → vérifier que le canvas PIXI se charge sans erreur.
- Acheter un talent dans l'arbre → vérifier qu'il apparaît dans l'onglet Talents de la fiche.
- Supprimer un talent dans l'arbre → vérifier qu'il disparaît de la fiche et que l'XP est remboursée.
- Acheter des talents en chaîne (A → B → C) → vérifier que C est verrouillé tant que B n'est pas acheté.
- Ajouter un talent ranked → augmenter/réduire le rang → vérifier que l'XP suit.
- Ajouter un talent avec `activation: active` → vérifier qu'une action est disponible.
- Ajouter un talent passif → vérifier que l'effet est appliqué sans action requise.
- Ouvrir/fermer l'arbre de talents 10 fois → vérifier qu'il n'y a pas de fuite mémoire PIXI.
- Acheter un talent signature → vérifier ses capacités spéciales.
- Appliquer un talent avec `actorHooks` → vérifier que le hook se déclenche au moment attendu.
- Vérifier que les talents sont persistés après rechargement de la page (F5).
