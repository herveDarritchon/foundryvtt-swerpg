# Plan d'Implémentation — Issue #480 : Complétion Phase 7 — Négociation avancée & conséquences narratives

**Statut**: Planned  
**Version**: 1.0  
**Date de création**: 2026-05-30  
**Responsable**: SWERPG Dev Team  
**Portée**: Finalisation et stabilisation de la Phase 7 du Market (négociation, conséquences narratives, intégration persistance)  
**Lié à**: Issue #479 (Phase 7 partiellement implémentée)

---

## 1. Executive Summary

L'issue #480 vise à **finaliser et stabiliser la Phase 7 du Market** : connecter la négociation et les conséquences narratives au gameplay complet avec persistance sur le personnage, intégration chat message, et couverture de tests E2E.

**État actuel**:

- Phase 0–6 ✅ complètes (cadrage métier, catalogue, filtres, pricing, achat simple, marchés contextualisés)
- Phase 7 ⚡ partielle : dialogs UI + calculs purs de négociation/conséquences existent, mais manque persistance des conséquences, chat message, et couverture de tests E2E

**Objectif principal**: Compléter Phase 7 de sorte que :

1. Les conséquences narratives (imperialSuspicion, blackMarketDebt, complication) soient persistées sur l'acteur via flags
2. Un ChatMessage documenta chaque achat avec conséquences acceptées
3. Les tests couvrent domaine + UI (dialogues fonctionnelles)
4. Documentation et i18n complètes

---

## 2. Vision et Principes Métier — Phase 7

### 2.1 Mécanique phase 7 (du cadrage métier)

Phase 7 doit transformer le marché en **moteur narratif** :

- **Tentative de négociation** : joueur roule Deception/Streetwise/Persuasion
- **Résultat influençant le prix** : succès → remise ; disaster → pénalité
- **Menace narrative** : achat d'items restreints/marché noir crée des obligations
- **Signalement impérial** : acheter armement contrôlé peut attirer l'attention
- **Obligations/dettes** : emprunt auprès de vendeur louche = future complication
- **Complication sur Désavantage** : exécuter obligation = source de complications de jeu

### 2.2 Invariants de conception

1. **Conséquences sont des propositions, pas des mutations automatiques** — Le dialog affiche les risques, le MJ/joueur accepte ou refuse
2. **Persistance immédiate** — Les conséquences acceptées sont enregistrées via `actor.setFlag()` au moment de l'achat
3. **Audit trail via ChatMessage** — Chaque achat important génère un message qui documente items + conséquences acceptées
4. **Aucune mutation involontaire** — Le code n'ajoute pas d'obligations sans confirmation explicite

---

## 3. Architecture Technique — Phase 7

### 3.1 Fichiers existants (Phase 7 partiellement implémentée)

```javascript
module/lib/market/
  negotiation.mjs              ← Calculs purs négociation ✅
  consequences.mjs             ← Évaluation conséquences ✅
  rarity-engine.mjs            ← Obtainability + supply delay ✅

module/applications/market/
  market-application.mjs       ← #executePurchase inclut #storeMarketDebt (partiellement) ⚡
  negotiation-dialog.mjs       ← Dialog UX négociation ✅
  consequences-dialog.mjs      ← Dialog UX conséquences ⚡

templates/market/
  negotiation-dialog.hbs       ← Template négociation ✅
  consequences-dialog.hbs      ← Template conséquences ✅
```

### 3.2 Fichiers à créer/améliorer

**Tâche 1** : Persistance des conséquences

```javascript
module/lib/market/
  consequence-persistence.mjs  ← NEW: Helper pur sérialisation/désérialisation
```

**Tâche 2** : Chat narratif

```javascript
module/applications/market/
  market-chat.mjs              ← NEW: Produire ChatMessage Foundry

templates/market/
  purchase-chat.hbs            ← NEW: Template ChatMessage
```

**Tâche 3** : i18n

```json
lang/en.json
lang/fr.json
  + `MARKET.Consequence.*`
  + `MARKET.Chat.*`
  + `MARKET.Negotiation.Outcome.*`
```

**Tâche 4** : Tests

```javascript
tests/lib/market/
  consequence-persistence.test.mjs  ← NEW: Tests domaine persistance

tests/applications/market/
  consequences-dialog.test.mjs       ← NEW: Dialog UX si nécessaire

e2e/smoke/
  market-purchase-flow.spec.ts       ← NEW: E2E smoke workflow complet
```

---

## 4. Découpage Détaillé en Tâches

### Phase 7a — Persistance des conséquences

**TASK-701** : Créer helper domaine `consequence-persistence.mjs`

- Fonction `serializeConsequence(consequence)` → objet plat sérialisable
- Fonction `deserializeConsequences(serialized)` → MarketConsequence[]
- Aucune dépendance Foundry (domaine pur)
- Validations basiques (type vérifiée, metadata présente si requirée)

**TASK-702** : Améliorer `market-application.mjs` — Completer `#storeMarketDebt` + généraliser à tous les types de conséquences

- Refactor `#storeMarketDebt` en `#storeMarketConsequence` (accepte type générique)
- Stocker dans `flags.swerpg.marketConsequences` (array) au lieu de `marketDebts`
- Chaque conséquence inclut : type, metadata, dateAccepted, actorId
- Appeler pour chaque conséquence de `consequencesResult.acceptedTypes`
- Ajouter logs structurés (logger.info au lieu de console)

**TASK-703** : Ajouter lecteur de conséquences (helper)

- Fonction `getMarketConsequences(actor)` retourne array des conséquences stockées
- Fonction `clearMarketConsequence(actor, type)` pour nettoyer une conséquence résorbée

### Phase 7b — Chat message narratif

**TASK-704** : Créer `market-chat.mjs` — Produire ChatMessage après achat

- Fonction `createPurchaseChatMessage({ buyer, entry, outcome, consequencesAccepted, negotiatedPrice })`
- Produit objet Foundry ChatMessage data (content HTML via template, speaker=buyer, type='ic')
- Aucune mutation (retourne l'objet, le caller décide d'appeler `ChatMessage.create()`)

**TASK-705** : Créer template `purchase-chat.hbs`

- Affiche résumé d'achat : item name, price payé, market type
- Affiche conséquences acceptées (icônes + labels i18n)
- Style cohérent avec UI star wars

**TASK-706** : Intégrer chat dans `market-application.mjs` — Appeler après `#storeMarketConsequence`

- Dans `#executePurchase`, après items créés et conséquences stockées
- Appeler `createPurchaseChatMessage(...)`
- Créer ChatMessage via Foundry API
- Gestion d'erreur gracieuse (log warning si chat échoue, ne bloque pas l'achat)

### Phase 7c — Enrichissement dialog conséquences + refusabilité

**TASK-707** : Améliorer `consequences-dialog.mjs` — Choices joueur refusables

- Actuellement : affiche conséquences, boutons Yes/No confirment tout
- Nouveau : pour chaque conséquence avec `playerChoice: true`, ajouter toggle checkbox (accept/refuse)
- Résultat : `{ confirmed: bool, acceptedConsequences: [type1, type2, ...] }`
- Logique : si joueur refuse une conséquence `playerChoice: true` **et obligatoire**, annuler l'achat (message d'avertissement)

**TASK-708** : Améliorer template `consequences-dialog.hbs`

- Boucle sur conséquences
- Si playerChoice: afficher checkbox + label
- Afficher description i18n de chaque conséquence
- Si complication/debt : afficher metadata (montant, vendeur, etc)

### Phase 7d — Localisations

**TASK-709** : Compléter `lang/en.json` avec clés manquantes

```json
{
  "MARKET.Consequence": {
    "ImperialSuspicion": {
      "Title": "Imperial Suspicion",
      "Description": "Purchasing restricted items may attract Imperial scrutiny..."
    },
    "BlackMarketDebt": {
      "Title": "Black Market Debt",
      "Description": "The vendor may demand repayment with interest, or services rendered..."
    },
    "Complication": {
      "Title": "Complication",
      "Description": "This transaction may trigger unforeseen complications..."
    }
  },
  "MARKET.Chat": {
    "PurchaseTitle": "Market Purchase",
    "ItemLabel": "Item",
    "PriceLabel": "Price",
    "ConsequencesLabel": "Consequences"
  },
  "MARKET.Negotiation.Outcome": {
    "Success": "Negotiation succeeded",
    "Failure": "Negotiation failed",
    "Disaster": "Negotiation disaster"
  }
}
```

**TASK-710** : Ajouter traductions `lang/fr.json` parallèles

### Phase 7e — Tests unitaires domaine

**TASK-711** : Créer `tests/lib/market/consequence-persistence.test.mjs`

- Test `serializeConsequence()` avec tous les types (imperialSuspicion, blackMarketDebt, complication)
- Test `deserializeConsequences()` round-trip
- Test validation (types invalides → fallback gracieux)
- Pas de Foundry mock

**TASK-712** : Étendre `tests/lib/market/consequences.test.mjs`

- Ajouter cas : item avec rarity=8 → inclut complication
- Ajouter cas : market type black-market + restricted item → imperialSuspicion + blackMarketDebt + complication
- Ajouter cas : empty array when no consequences apply

### Phase 7f — Tests E2E smoke

**TASK-713** : Créer `e2e/smoke/market-purchase-workflow.spec.ts`

- Naviguer à personnage sheet (inventory tab)
- Cliquer "Open Market"
- Attendre catalogue visible
- Filtrer par weapon
- Cliquer "Buy" sur premier item
- Dashboard : vérifier crédits diminués
- Vérifier item ajouté à inventory
- Check: ChatMessage créé (si dispo sur port 30000)

**Remarque** : E2E sur environment Docker Foundry (port 31001) peut être reportée si infra non dispo ; smoke = read-only basic checks.

---

## 5. Critères d'acceptation — Issue #480

### Critères fonctionnels

- [ ] Conséquences narratives persistées via `actor.flags.swerpg.marketConsequences`
- [ ] Dialog conséquences permet refus individuel (si playerChoice=true)
- [ ] ChatMessage produit après achat réussi avec conséquences
- [ ] Négociation calcule prix + applique correctement (remise vs pénalité)
- [ ] Toutes les clés i18n présentes et testées

### Critères techniques

- [ ] `module/lib/market/consequence-persistence.mjs` pur (zéro Foundry deps)
- [ ] Tests unitaires ≥ 90% couverture domaine (`consequence-persistence.test.mjs`, étendus `consequences.test.mjs`)
- [ ] Aucune mutation involontaire (conséquences seulement si acceptées)
- [ ] Pas de breaking changes API publique (market-application.mjs handlers restes compatibles)
- [ ] Logs structurés (logger.info/warn/error, pas console.log)

### Critères UX

- [ ] Dialog conséquences clair et intuitif (checkboxes visibles, labels explicites)
- [ ] ChatMessage style immersive (Star Wars look-and-feel)
- [ ] Aucun blocage non prévu (refus conséquence indienne non recueil utilisateur)

---

## 6. Dépendances et Bloqueurs

### Dépendances internes

- ✅ `module/lib/market/negotiation.mjs` — déjà complète
- ✅ `module/lib/market/consequences.mjs` — déjà complète
- ✅ `module/applications/market/market-application.mjs` — partiellement prête

### Dépendances externes

- ✅ Foundry VTT v14+ API (ChatMessage API)
- ✅ `module/utils/logger.mjs`

### Bloqueurs potentiels

- **E2E infra** : Si Docker Foundry (port 31001) non disponible, reporter tests E2E complets à tâche séparée
- **i18n manque** : Vérifier présence des clés dans base i18n avant PR

---

## 7. Timeline estimation

| Tâche                                 | Estimation   | Priorité |
| ------------------------------------- | ------------ | -------- |
| TASK-701: consequence-persistence.mjs | ~1 jour      | P1       |
| TASK-702: Améliorer #storeMarketDebt  | ~1 jour      | P1       |
| TASK-703: Helper lecture conséquences | ~0.5 jour    | P2       |
| TASK-704: market-chat.mjs             | ~1 jour      | P1       |
| TASK-705: purchase-chat.hbs           | ~0.5 jour    | P1       |
| TASK-706: Intégration chat            | ~0.5 jour    | P1       |
| TASK-707: Refusabilité dialog         | ~1 jour      | P1       |
| TASK-708: Améliorer consequences.hbs  | ~0.5 jour    | P1       |
| TASK-709: i18n anglais                | ~0.5 jour    | P1       |
| TASK-710: i18n français               | ~0.5 jour    | P1       |
| TASK-711: Tests persistence           | ~1 jour      | P1       |
| TASK-712: Étendre tests consequences  | ~0.5 jour    | P1       |
| TASK-713: E2E smoke workflow          | ~1 jour      | P2       |
| **TOTAL (P1)**                        | **~9 jours** | **Core** |
| TOTAL (P2)                            | ~2 jours     | Stretch  |

---

## 8. Considérations particulières

### 8.1 Faut-il un panneau "Market Debts" pour le MJ ?

Le code stocke `marketConsequences` via flags, mais aucune UI de consultation n'existe côté MJ.

**Recommandation** : Reporter à **Phase 8 (issue séparée)** avec titre "Market Debts Dashboard for GM".

### 8.2 Intégration avec système dés narratifs

Le `NegotiationDialog` accepte aujourd'hui des inputs manuels (successRanks, isDisaster).

**Recommandation** : L'intégration directe avec `module/dice/` pour jet automatique peut être **Phase 8b (issue séparée)** afin de garder #480 focalisée sur persistance + chat.

### 8.3 Refusabilité de conséquences

Actuellement, dialog affiche conséquences puis "Yes/No" pour confirmer achat entier.

**Demande cadrage** : Si joueur refuse une conséquence `mandatory: true`, :

- Option A : Annuler l'achat entier (risqué, mauvaise UX)
- Option B : Acheter quand même mais ignorer la conséquence refusée (laxiste, perte d'immersion)

**Recommandation** : Marquer _seules_ `playerChoice: true` comme optionnelles ; les autres (imperialSuspicion auto=false) sont proposées mais non refusables → validation avant achat.

---

## 9. Références documentaires

- **Cadrage métier Phase 7** : `documentation/cadrage/market/feature-market-cadrage-metier.md`, section 7
- **Plan #479** : `documentation/plan/market/plan-marketFeature479.prompt.md`, sections 5–7
- **ADR-0018 (constantes)** : `documentation/architecture/adr/adr-0018-no-magic-numbers-named-constants.md`

---

## 10. Prochaines étapes après #480

1. **Phase 8** — Market Debts GM Dashboard + Debt resolution mechanics
2. **Phase 8b** — Automated dice integration for negotiation
3. **Phase 9** — Dynamic stock management (quantities, restock timers)
4. **Phase 10** — Special orders (delays, custom prices)
5. **Phase 11** — Scene/NPC-bound markets (vendor at location)
6. **Phase 12** — Character-to-market sales (selling items at lower price)

---

**Fin du document**
