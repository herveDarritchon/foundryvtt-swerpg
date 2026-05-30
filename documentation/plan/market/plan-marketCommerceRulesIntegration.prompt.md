# Plan : Intégration des règles de commerce et impact du type de marché

**Source** : Cadrage `cadrage-regle-impact-type-de-market.md` — Synthèse MJ pour acheter, vendre et trouver des objets dans Star Wars: Aux Confins de l'Empire.

**Objectif global** : Enrichir le Market existant avec les mécaniques narratives et contextuelles décrites dans le cadrage Edge : modificateurs de lieu, tests de disponibilité (Négociation/Pègre), vente/revente, résultats narratifs (Avantages/Menaces/Triomphe/Désastre).

---

## Plan d'implémentation

### Contexte actuel

Le Market actuel supporte :

- 4 types de marché (`standard`, `local`, `specialized`, `black-market`) avec `priceModifier` et `allowedAvailability`
- Calcul de prix : basePrice × (1 + availabilityMod + rarityMod × 0.1 + gmMod + marketTypeMod)
- Validation d'achat (crédits suffisants)
- Restriction des items par `restrictionLevel` (none/restricted/military/illegal)

**Manque** :

- Test de disponibilité (compétence Négociation/Pègre)
- Modificateur de rareté par lieu (planète/région)
- Mécanisme de revente/vente d'objets
- Résultats narratifs appliqués au commerce
- Coûts non-monétaires (dette, faveur, surveillance)

---

## Tranches verticales

### Tranche 1 : Modificateur de rareté par lieu (planète/région)

**Type** : AFK  
**Bloqué par** : Aucun — peut démarrer immédiatement.

**Objectif** : Ajouter un registre de types de lieux (`noyau`, `bordure`, `espaceSauvage`, etc.) avec un modificateur de rareté. Exposer dans `marketContext` et UI via sélecteur.

**What to build**

- Créer `module/config/market-locations.mjs` contenant un registre `MARKET_LOCATIONS` avec au minimum :
  - `noyau`: modificateur rareté `−0.5` (items plus faciles à trouver)
  - `bordure`: modificateur rareté `0` (neutralité)
  - `espaceSauvage`: modificateur rareté `+1.5` (items rares deviennent plus rares)
  - Champ optionnel description/label pour UI

- Étendre `module/config/market.mjs` pour intégrer `MARKET_LOCATIONS` dans le `MarketContext` existant.
- Ajouter `activeLocation` (string key) au `_viewState` de `MarketApplicationV2`.
- Créer sélecteur UI (dropdown) pour changer de lieu. À chaque changement, recalculer rareté effective et rerendre catalogue.
- Mettre à jour le price engine pour appliquer le modificateur de rareté du lieu.
- Ajouter tests Vitest pour vérifier calcul rareté effective = rareté item + modifier lieu.

**Acceptance criteria**

- [ ] Registre `MARKET_LOCATIONS` créé et exposé via `SYSTEM.MARKET.LOCATIONS`
- [ ] `MarketContext.activeLocation` défini et utilisé dans `computeMarketPrice()`
- [ ] Sélecteur de lieu intégré à l'UI (dropdown avec description brève)
- [ ] Prix et filtrage catalogue mis à jour en fonction du lieu actif
- [ ] Tests Vitest pour calcul rareté et price impact
- [ ] Clés i18n complètes (en.json, fr.json)

**Blocked by**

Aucun — peut démarrer immédiatement.

---

### Tranche 2 : Test de disponibilité (Négociation / Pègre)

**Type** : HITL  
**Bloqué par** : Tranche 1 (rareté contextuelle → seuil de test déterminé)

**Objectif** : Avant l'achat, si la rareté effective dépasse un seuil, déclencher un test de compétence. Items légaux → Négociation. Items restreints → Pègre/Streetwise. Résultat autorise/interdit l'achat.

**What to build**

- Créer `module/lib/market/availability-check.mjs` (pur domaine) :
  - Fonction `shouldRequireAvailabilityTest(rarity, restrictionLevel)` → booléen
  - Fonction `buildAvailabilityTestConfig(rarity, restrictionLevel, marketLocation)` → { skill: string, dc: number, narrative: string }
  - Seuils : rareté ≥ 4 → test requis ; rareté ≥ 8 → test très difficile
  - Choix compétence : if restrictionLevel in [restricted/military/illegal] ? 'streetwise' : 'negotiation'

- Créer dialog UI pour présenter le test avant l'achat.
  - Afficher difficulté, compétence requise, description narrative
  - Bouton "Tenter d'obtenir" → lancer test

- Intégration dans `MarketApplicationV2` :
  - Hook `#onBuyItem()` : avant d'accorder l'achat, vérifier si un test est requis
  - Si requis, ouvrir dialog sans fermer le market
  - Dialog lance test via le système dice pool existant
- **HITL** : Décision d'architecture requise sur :
  - Comment intégrer le dice pool du système?
  - La dialog est-elle un ApplicationV2 séparé ou un render modal dans le Market?
  - Comment passer les résultats du test au flow d'achat?

**Acceptance criteria**

- [ ] Logique pure `availablity-check.mjs` créée, testée sans Foundry
- [ ] UI dialog créée (type ApplicationV2 ou modal)
- [ ] Hook #onBuyItem() modifiée pour intercepter et tester
- [ ] Dice pool intégré pour lancer test (exploit pattern existant système?)
- [ ] Résultat test bloque ou autorise achat
- [ ] Tests Vitest pour logique pure (thresholds, skill choice, DC calculation)
- [ ] Clés i18n pour messages dialog

**Blocked by**

- Tranche 1 (pour rareté contextuelle)
- **Décision architecurale** sur intégration dice pool ← HITL

---

### Tranche 3 : Résultats narratifs du test de commerce

**Type** : AFK  
**Bloqué par** : Tranche 2 (résultats du test disponibles)

**Objectif** : Appliquer les résultats du test (Avantages/Menaces/Triomphe/Désastre) comme modificateurs prix et/ou conséquences narratives.

**What to build**

- Créer `module/lib/market/commerce-outcomes.mjs` :
  - Fonction `computeCommerceOutcome(testResult, context)` → { priceModifier, narrativeKey, consequences: string[] }
  - Résultats narratifs Edge :
    - Succès : aucune conséquence
    - Avantages : −10% prix, rabais appliqué, marchandise en bon état
    - Menaces : +10% prix, délai, vendeur bavard, surveillance
    - Triomphe : contact durable, objet supérieur, information bonus
    - Désastre : arnaque, embuscade, objet tracé, intervention impériale

- Intégrer dans le flow d'achat post-test :
  - Appliquer `priceModifier` au prix final
  - Afficher outcome narratif dans le chat ou notification
  - Stocker conséquences (si applicable) pour suivi ultérieur

- Création chat message pour documenter l'achat et ses conséquences narratives.

**Acceptance criteria**

- [ ] Logique pure `commerce-outcomes.mjs` créée et testée
- [ ] Outcomes mappés pour Succès/Avantages(1+)/Menaces(1+)/Triomphe/Désastre
- [ ] Prix réajusté selon outcome
- [ ] Chat message généré avec détails achat + outcome
- [ ] Clés i18n pour tous les outcomes
- [ ] Tests Vitest pour logique outcome

**Blocked by**

- Tranche 2 (résultats test disponibles)

---

### Tranche 4 : Mécanisme de revente d'objets

**Type** : AFK  
**Bloqué par** : Aucun — peut démarrer en parallèle.

**Objectif** : Acteur vend un item possédé. Prix de revente = % du basePrice selon résultat test Négociation (25%/50%/75%). Créditer l'acteur.

**What to build**

- Créer `module/lib/market/sell-valuation.mjs` (pur domaine) :
  - Fonction `calculateSellValue(basePrice, condition, testResult?)` → number
  - Règles : condition 'excellent' +10%, 'degraded' −25%
  - Si test Négociation présent : 25% success / 50% +avantage / 75% triomphe

- Créer UI "Mes articles à vendre" (onglet dans Market ou action séparée) :
  - Lister items possédés (weapon/armor/gear) avec prix de base
  - Afficher valeur de revente estimée (% du prix)
  - Option : lancer test Négociation pour chercher meilleur prix
  - Bouton "Vendre" → débiter l'item, créditer l'acteur

- Intégrer dans `MarketApplicationV2` :
  - Mode "seller" vs "buyer" toggable via bouton ou context
  - Crédits additionnés/soustraits lors de vente

**Acceptance criteria**

- [ ] Logique `sell-valuation.mjs` créée, testée
- [ ] UI "Mes articles" intégrée au Market (tab ou section)
- [ ] Test Négociation lancé avant vente (optionnel/recommandé)
- [ ] Item supprimé du inventaire, crédits augmentés
- [ ] Tests Vitest pour logique valuation
- [ ] Clés i18n

**Blocked by**

Aucun — peut démarrer immédiatement.

---

### Tranche 5 : Filtrage catalogue par légalité et niveau de restriction

**Type** : AFK  
**Bloqué par** : Tranche 1 (contexte de marché nécessaire pour logique filtrage)

**Objectif** : Quand marché `standard` ou `local`, masquer items `restricted`/`military`/`illegal`. Quand `black-market`, tous visibles mais avec indicateur visuel. Ajouter filtre restriction dans toolbar.

**What to build**

- Créer fonction pure `isItemVisibleForMarket(item, marketType)` → booléen
  - `standard`/`local` → masquer restricted/military/illegal
  - `specialized` → afficher restricted/military mais épingler
  - `black-market` → all visible

- Intégrer logique de filtrage dans `#buildCatalogFromWorldItems()` (MarketApplicationV2)
  - Appliquer filtre après autres critères d'éligibilité

- Ajouter filtre restriction dans toolbar (dropdown) :
  - Options : "Tous", "Légal", "Restreint"
  - Interagit avec `marketType` (black-market masque l'option "Légal")

- CSS/UI : visuellement distinguer items restreints (`badge RESTREINT`, couleur, icône ⚠️)

**Acceptance criteria**

- [ ] Fonction `isItemVisibleForMarket()` créée, testée
- [ ] Filtrage intégré au catalogue rendering
- [ ] Filtre restriction dans toolbar (dropdown)
- [ ] Items restreints marqués visuellement (badge, couleur)
- [ ] Tests Vitest pour logique filtrage
- [ ] Pas de changement comportement pour `specialized` existing

**Blocked by**

- Tranche 1 (contexte marché et rareté)

---

### Tranche 6 : Intégration du coût narratif (dette, faveur, risque)

**Type** : HITL  
**Bloqué par** : Tranche 3 (outcomes narratifs disponibles)

**Objectif** : Modéliser conséquences non-monétaires (dette envers Hutt, surveillance impériale…) comme effets persistants. Nécessite décision architecturale.

**What to build**

- **HITL — Décision d'architecture** :
  - Structure de données : flags sur acteur + chat? Items narratifs (obligation-like)? ActiveEffects?
  - Durée : persistent ou temporaire?
  - Suivi : simple texte ou système de dettes/faveurs mécanique?

- MVP post-décision :
  - Ajouter flag acteur `market.lastNarrativeConsequences` (array de strings)
  - Dans chat, afficher conséquences narratives
  - Dashboard simple : "Vous avez une dette envers [Hutt]" affiché sur character sheet

- Exemple conséquences :
  - Achat black-market risqué → "Surveillance impériale déclenchée (test Discrétion requis?"
  - Achat chez Hutt avec dette → "Obligation : faveur au Hutt"
  - Revente arnaque → "Arnaqueur cherche vengeance"

**Acceptance criteria**

- [ ] **Décision architecturale prise** : structure de données définie
- [ ] Conséquences stockées sur acteur
- [ ] Dashboard/display sur sheet ou Market
- [ ] Chat messages documentes conséquences
- [ ] Tests Vitest pour logique pure
- [ ] Clés i18n

**Blocked by**

- Tranche 3 (outcomes narratifs)
- **Décision architecturale** ← HITL

---

## Considérations de design

### 1. Ordem de mise en œuvre recommandée

1. **Tranches 1 & 4** (indépendantes, livraison rapide)
2. **Tranche 5** (dépend 1, améliore UX filtrage)
3. **Tranches 2 & 3** (cœur des règles Edge, dépendent les unes des autres)
4. **Tranche 6** (nice-to-have, dépend décision archi)

### 2. Points HITL critiques

- **Tranche 2** : Intégration dice pool — le système lance-t-il les tests via API existante?
- **Tranche 6** : Modèle de données pour conséquences non-monétaires

### 3. Granularité

Toutes les tranches sont techniquement décomposables en sous-tranches (logique pure / UI / test). La granularité actuelle convient à un découpage vertical fin.

---

## Succès globaux

- [ ] Modificateurs de lieu impactent rareté effective et tarification
- [ ] Tests de disponibilité (Négociation/Pègre) peuvent être lancés avant achat
- [ ] Résultats des tests appliquent modificateurs narratifs au commerce
- [ ] Revente d'objets fonctionne avec valuation et Négociation optionnelle
- [ ] Items restreints filtrés/affichés selon type de marché
- [ ] Conséquences narratives tracées (decision archi prise)
- [ ] Clés i18n complètes (en + fr)
- [ ] Couverture tests Vitest ≥ 80% (logique pure)
- [ ] Pas de breaking change sur Market existant
