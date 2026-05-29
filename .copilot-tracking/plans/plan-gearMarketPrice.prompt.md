# Plan : Corriger le prix à 0 des Gear dans le Market

**TL;DR :** Le prix des gear s'affiche à 0 dans le Market parce que `itemToRawItem()` lit `system.price` (valeur post-derivation) alors que `prepareDerivedData()` de `SwerpgGear` produit `NaN` (le calcul `_preparePrice()` utilise un `this.rarity` potentiellement shadowé par la déclaration de propriété de classe). La validation `Number.isFinite` dans `createMarketEntry` convertit alors `NaN` en `0`. La correction doit lire le prix **source** et nettoyer le modèle Gear.

---

## Problème Détecté

### Symptôme

- Les items de type **gear** affichent un prix de **0 crédits** dans le Market
- Cependant, quand on ouvre la fiche de l'item, le prix est bien affiché (ex: 200 crédits)
- Les **weapons** et **armor** affichent correctement leurs prix dans le Market

### Causes Racines

1. **`itemToRawItem()` lit le prix post-dérivation** (`module/applications/market/market-application.mjs`, ligne 61)
   - Actuellement : `basePrice: system.price ?? 0`
   - Devrait lire : `system._source?.price` (le prix avant derivation)
   - Comparaison : `_prepareCredits()` dans `module/models/character.mjs` fait déjà cela correctement

2. **`SwerpgGear.prepareDerivedData()` produit potentiellement `NaN`**
   - Accès à `this.defense.base` qui n'existe pas dans le schéma de `SwerpgPhysicalItem` (ligne 49-50 de `gear.mjs`)
   - Calcul `_preparePrice()` utilise `this.rarity` qui peut être `undefined` si la propriété de classe shadow le champ du DataModel
   - Résultat : `this.price = NaN`

3. **`createMarketEntry()` convertit `NaN` en `0`** (`module/lib/market/market-entry.mjs`, ligne 77)
   - `Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0`
   - Étape inévitable et correcte, mais le problème en amont n'est pas évité

---

## Étapes d'Implémentation

### Étape 1: Corriger `itemToRawItem()` pour lire le prix source

**Fichier** : `module/applications/market/market-application.mjs`

**What** :

- Remplacer `basePrice: system.price ?? 0` par une lecture du prix **source** (avant derivation)
- Utiliser le même pattern que `_prepareCredits()` dans `character.mjs` : `item.system._source?.price ?? system.price ?? 0`
- Cela garantit que le Market lit le prix de base (schema source), pas le prix dérivé après `prepareDerivedData()`

**Why** :

- Le Market engine (`calculateItemPrice`) recalcule le prix basé sur la rareté et le contexte de marché
- Passer le prix source (non dérivé) évite un calcul double en cascade
- Cohérent avec la logique de `_prepareCredits()` pour la gestion des crédits du personnage

**Expected Outcome** :

- Un gear avec `price: 200` dans la source affichera un `basePrice: 200` dans le market entry
- Le `priceResult.finalPrice` sera calculé correctement par le price engine

---

### Étape 2: Nettoyer `SwerpgGear.prepareDerivedData()`

**Fichier** : `module/models/gear.mjs`

**What** :

- Supprimer l'accès à `this.defense.base` et `this.defense.bonus` (lignes 49-50) — ces propriétés n'existent pas dans le schéma de `SwerpgPhysicalItem`
- Retirer la déclaration de propriété de classe `rarity` (ligne 35) qui shadow le champ du DataModel
- Garder l'appel à `this._preparePrice()` (ligne 53) mais s'assurer qu'il ne produit pas `NaN`

**Why** :

- Le code `this.defense.base` accède à une propriété non définie, ce qui peut produire une erreur silencieuse
- La propriété de classe `rarity` shadow le champ du DataModel et peut rester `undefined`
- `_preparePrice()` multipliera alors `this.price * Math.pow(undefined + 1, 3)` = `NaN`

**Expected Outcome** :

- `prepareDerivedData()` s'exécute sans erreur
- `this.price` est toujours un nombre fini après l'appel à `_preparePrice()`
- Les autres items types (armor, weapon) conservent le même comportement

---

### Étape 3: Ajouter un guard dans `_preparePrice()` pour éviter `NaN`

**Fichier** : `module/models/physical.mjs`

**What** :

- Ajouter une validation au début de `_preparePrice()` pour que `this.rarity` soit toujours un nombre fini
- Fallback : si `rarity` n'est pas fini, retourner `this.price` sans modification
- Ajouter un log debug/warn si la rareté est invalide

**Why** :

- Garantir que aucune callstack ne produit `NaN` même en cas de mal-initialization
- Faciliter le débogage si une autre classe subit le même problème

**Expected Outcome** :

- `_preparePrice()` retourne toujours un nombre fini >= 0
- Aucun NaN propagé dans `system.price`

---

### Étape 4: Ajouter tests Market pour le Gear

**Fichier** : `tests/applications/market/market-application.test.mjs`

**What** :

- Créer un test spécifique au gear: "gear item with price 200 and rarity 1 should have non-zero basePrice and finalPrice"
- Créer un test unitaire dans `tests/lib/market/market-entry.test.mjs` ou similaire
- Vérifier que `createMarketEntry()` produit un `basePrice > 0` pour un raw gear item avec `basePrice: 200`

**Why** :

- Régresser : empêcher que ce bug ne se reproduise après future refactor
- Couvrir le cas spécifique du gear (actuellement pas couvert dans les tests existants)

**Expected Outcome** :

- Tests passent avec le gear à prix non-zéro
- Les tests détectent une régression si `prepareDerivedData()` produit à nouveau `NaN`

---

### Étape 5: Ajouter test unitaire pour `SwerpgGear.prepareDerivedData()`

**Fichier** : `tests/models/gear.test.mjs` (créer si n'existe pas)

**What** :

- Test : "prepareDerivedData should not produce NaN in price"
- Instancier un mock `SwerpgGear` avec `price: 200, rarity: 1, defense: undefined`
- Appeler `prepareDerivedData()`
- Vérifier que `this.price` et `this.rarity` sont toujours des nombres finis

**Why** :

- Valider que le modèle Gear fonctionne correctement après nettoyage
- Détecter les régressions si le modèle est modifié

**Expected Outcome** :

- `this.price` est un nombre fini > 100 (200 \* (1+1)^3 = 1600)
- Aucune exception levée lors de l'appel

---

## Considérations Supplémentaires

### 1. La propriété `defense` dans Gear

- **Question** : Est-ce que Gear devrait avoir une propriété `defense` ?
- **Constat** : Code semble copié d'Armor par erreur (armor.mjs l'a aussi)
- **Recommandation** : Supprimer le code mort qui accède à `this.defense.base` dans Gear
- **Alternative** : Si Gear devrait supporter defense, ajouter le champ au schéma de `SwerpgPhysicalItem`

### 2. Prix source vs prix dérivé dans Market

- **Question** : Le Market affiche-t-il le prix source (base) ou le prix dérivé (post-rareté) ?
- **Constat** : Le Market engine (`calculateItemPrice`) recalcule déjà le prix selon contexte (`availability`, `rarity`, `marketType`)
- **Recommandation** : Lire toujours le prix **source**, laisser le price engine recalculer
- **Validateur** : Comparer avant/après pour weapon et armor — les prix ne doivent pas diminuer drastiquement

### 3. Impact sur les données existantes

- **Risk** : Changer `itemToRawItem` affecte tous les item types (weapon, armor, gear)
- **Mitigation** : Tests suffisants pour les trois types avant déploiement
- **Fallback** : La partie `?? system.price ?? 0` assure qu'on peut fallback au prix post-dérivation si `_source` n'existe pas

---

## Fichiers à Modifier

- `module/applications/market/market-application.mjs` — `itemToRawItem()`
- `module/models/gear.mjs` — `prepareDerivedData()`
- `module/models/physical.mjs` — `_preparePrice()`
- `tests/applications/market/market-application.test.mjs` — ajouter test gear
- `tests/models/gear.test.mjs` (ou équivalent) — ajouter test prepareDerivedData

---

## Critères de Succès

- [x] Gear item avec `price: 200` dans source affiche `basePrice: 200` dans le Market
- [x] Gear item affiche un `finalPrice > 0` dans le Market (après price engine)
- [x] Weapon et Armor conservent leurs prix corrects dans le Market
- [x] `SwerpgGear.prepareDerivedData()` ne produit jamais `NaN`
- [x] Tests du Market et du modèle Gear passent sans régression
- [x] Code mort (accès à `this.defense`) supprimé de Gear
