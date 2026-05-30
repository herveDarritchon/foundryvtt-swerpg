# Plan d'implémentation — Phase 7 — Négociation, rareté avancée et conséquences narratives

**Issue** : #478  
**Basé sur** : `feature-market-cadrage-metier.md` — Phase 7 du cadrage métier du Market

## Intention produit

Transformer le Market d'un simple catalogue d'achat en un **moteur narratif** qui connecte le commerce à des mécaniques de jeu existantes (Désavantage, Désastre, négociation) et crée des conséquences tangibles au-delà de la transaction.

## Objectif principal

Implémenter la négociation de prix au moment de l'achat, enrichir le concept de rareté par des entités narratives (stocks limités, délai d'approvisionnement, menace impériale), et brancher le Market sur les systèmes de comptes du personnage (obligation, dette, faveur).

## Décisions de cadrage

- La négociation utilise les valeurs de Compétence existantes du personnage (Négociation, Persuasion, Tromperie) pour influencer le prix final.
- Les **conséquences narratives** ne sont pas des pénalités automatiques, mais des événements proposés au MJ pour validation.
- Les **stocks limités** sont représentés par des items du monde marqués `rarity: "veryRare"` ou `availability: "blackMarket"` — on ne crée pas un nouveau système d'inventaire vendeur.
- Les **dettes** et **obligations** restent optionnelles : le système propose, mais le MJ valide. Aucune création automatique sans approbation.
- La rareté avancée repose sur les données métier existantes (`rarity: 0-10`, `availability: string key`), enrichies par des règles de calcul de probabilité d'obtention.

## Phases de livraison recommandées

### Phase 7.1 — Négociation de prix (test de Compétence)

**Objectif** : Permettre au joueur de tenter de négocier le prix d'un item avant achat.

**Livrables** :

- Ajouter un champ optionnel `negotiationAllowed: boolean` au registre `MARKET_TYPES`.
- Afficher un bouton "Négocier" à côté de "Acheter" si le marché autorise la négociation et qu'un item est sélectionné.
- Lancer un dialogue de négociation : choix de Compétence (Négociation, Persuasion, Tromperie).
- Calcul du succès basé sur la Compétence du personnage. Formule recommandée :
  - **Difficulté** : basée sur `rarity` (0-10) → adaptée à Fondateur de difficulté FFG.
  - **Résultat** : remise en pourcentage (-5% % rangs réussis, maximum -30%).
  - **Désastre** : prix augmente de 10% (vendeur offensé).
- Appliquer la remise au prix final et proposer achat avec prix réduit.

**Tests à minima** :

- Succès sans rangs réussis → prix inchangé.
- 1-2 rangs réussis → remise appliquée.
- Désastre → prix augmenté.
- Compétence manquante → message utilisateur clair.

**Ressources** :

- `module/lib/market/negotiation.mjs` — logique pure de calcul de remise.
- `module/applications/market/negotiation-dialog.mjs` — dialogue ApplicationV2.
- `templates/market/negotiation-dialog.hbs` — sélection de Compétence et résultat.

### Phase 7.2 — Rareté avancée et probabilités d'obtention

**Objectif** : Enrichir le concept de rareté par des probabilités d'obtention et des délais d'approvisionnement narratifs.

**Livrables** :

- Ajouter un objet `rarityRules` à `AVAILABILITY_STATUS` avec champs :
  - `obtainmentProbability: number` (0-100%) — chance d'obtenir l'item immédiatement.
  - `supplyDelay: { days: number, description: string }` — délai narratif si obtention échouée.
  - `narrativeReason: string` — explication narrative du délai (ex: "En attente de ravitaillement...", "Marché noir, livraison risky").

- Créer `module/lib/market/rarity-engine.mjs` :
  - Fonction `evaluateObtainability(entry, marketType)` → `{ immediate, delayInDays, reason }`.
  - Logique : plus la rareté augmente, moins la probabilité d'obtention immédiate augmente.

- Afficher dans la fiche d'item du marché un badge "Accès immédiat" ou "Délai d'ici X jours".
- Proposer au joueur, lors de l'achat :
  - _Acheter maintenant si immédiat_.
  - _Passer une commande avec délai X jours_ sinon.

**Tests** :

- Rareté 0-3 → 100% obtention immédiate.
- Rareté 4-7 → 60-80% obtention immédiate, délai de 1-2 jours sinon.
- Rareté 8-10 → 20-40% obtention immédiate, délai de 3-7 jours sinon.
- Marché noir → probabilités réduites, délais augmentés.

**Ressources** :

- `module/lib/market/rarity-engine.mjs` — moteur d'obtainabilité pur.
- Mise à jour `module/config/market.mjs` → enrichir `AVAILABILITY_STATUS`.
- Template mise à jour `templates/market/market.hbs` → afficher badges d'obtention.

### Phase 7.3 — Conséquences narratives (obligations, dettes, suspicion impériale)

**Objectif** : Brancher les achats de marché sur les systèmes narratifs existants du personnage.

**Livrables** :

- Créer `module/lib/market/consequences.mjs` :
  - Fonction `evaluateMarketConsequences(entry, marketType, actor)` → `{ consequenceType, description, automatic, playerChoice }`.
  - Types de conséquences :
    - `imperialSuspicion` — achat d'item restreint signalé à l'Empire (restriction level).
    - `blackMarketDebt` — achat au marché noir crée une dette envers le vendeur.
    - `complication` — à chaque achat "risqué", proposer une complication narrative (Désavantage/Désastre).

- Pour chaque type :
  - Si `automatic: true` → appliquer sans confirmation (ex: signalement impérial).
  - Si `playerChoice: true` → proposer au joueur (ex: s'endetter pour un délai réduit).

- Créer `module/applications/market/consequences-dialog.mjs` — dialogue proposant les conséquences.

- Intégration :
  - Appeler `evaluateMarketConsequences()` lors de l'achat.
  - Afficher conséquences proposées avant confirmation finale.
  - MJ peut approuver ou rejeter les conséquences narratives.

**Cas d'usage** :

1. Achat restreint → "Vous avez été repéré par un agent impérial. Jet de Vigilance pour l'éviter ?"
2. Marché noir → "Vous devez une faveur au vendeur. Acceptez-vous la dette ?"
3. Item très rare → "Le vendeur ne peut vous le vendre que dans 5 jours. Acceptez-vous d'attendre ?"

**Tests** :

- Achat standard → aucune conséquence.
- Achat restreint → suspension impériale proposée.
- Marché noir + budget limité → dialogue de négociation + option dette.
- Item très rare + délai → proposition d'accélération narrative.

**Ressources** :

- `module/lib/market/consequences.mjs` — logique pure.
- `module/applications/market/consequences-dialog.mjs` — dialogue ApplicationV2.
- `templates/market/consequences-dialog.hbs` — affichage conséquences.
- `lang/en.json`, `lang/fr.json` — nouvelles clés i18n.

### Phase 7.4 — Intégration avec le système de Comptes du personnage

**Objectif** : Synchroniser les dettes et obligations créées par le market avec les systèmes existants.

**Livrables** :

- Si le système supporte les Items `obligation` ou `debt` :
  - Créer automatiquement un item obligation/debt au personnage après achat au marché noir.
  - Item description : `"Vendeur: [nom vendeur] — Dette: [prix de vente]"`.
  - Montant : le prix de l'item acheté.

- Si le système ne supporte pas :
  - Stocker un flag sur l'actor : `flags.swerpg.marketDebts = [{ vendorId, itemName, amount, date }]`.
  - Proposer un rapport UI optionnel pour le MJ de consultation.

- Créer une vue optionnelle "Dettes du Marché" accessible depuis la feuille personnage.

**Tests** :

- Achat marché noir → obligation créée.
- Consultation de l'obligati vous montrer source "Marché Noir".
- Suppression de l'obligation → flag synchronisé.

### Phase 7.5 — Raffinement UI/UX et immersion narrative

**Objectif** : Améliorer le ressenti narratif par des messages, emojis, badges immersifs.

**Livrables** :

- Badges dans la liste du marché :
  - 🚨 "Signalé impérial" pour les items restreints.
  - ⏳ "Délai d'approvisionnement" pour les items rares.
  - 💀 "Marché noir" pour les sources illégales.
  - 💰 "Negociable" pour les items où la négociation est possible.

- Messages de chat post-achat immersifs :
  - `"[Actor] a acheté [Item] pour [Price] ⭐ crédits chez [Vendor]."`.
  - Si conséquence : `"💀 [Actor] contracte une dette envers [Vendor]."`

- CSS/LESS pour styliser les badges et dialogues dans le thème Star Wars.

**Ressources** :

- `templates/market/market.hbs` — ajouter badges.
- `styles/market.less` — styles badges et dialogues.
- `lang/en.json`, `lang/fr.json` — messages immersifs.

## Étapes d'implémentation (détail technique)

1. **Phase 7.1 — Négociation** :
   - [ ] Créer `module/lib/market/negotiation.mjs` avec formule de remise.
   - [ ] Créer dialogue negotiation avec test de Compétence.
   - [ ] Intégrer dialogue dans le workflow d'achat existant.
   - [ ] Tests Vitest pour logique de remise.
   - [ ] Tests Playwright pour dialogue et workflow.
   - [ ] Ajouter clés i18n (en + fr).

2. **Phase 7.2 — Rareté avancée** :
   - [ ] Enrichir `AVAILABILITY_STATUS` avec `rarityRules`.
   - [ ] Créer `module/lib/market/rarity-engine.mjs` avec `evaluateObtainability()`.
   - [ ] Mettre à jour `createMarketEntry()` pour intégrer obtainability.
   - [ ] Afficher badges dans `market.hbs`.
   - [ ] Tests Vitest pour moteur de rareté.
   - [ ] Ajouter clés i18n.

3. **Phase 7.3 — Conséquences** :
   - [ ] Créer `module/lib/market/consequences.mjs`.
   - [ ] Créer dialogue consequences avec ApplicationV2.
   - [ ] Intégrer appel `evaluateMarketConsequences()` dans workflow achat.
   - [ ] Tests Vitest pour logique conséquences.
   - [ ] Tests Playwright pour dialogues conséquences.
   - [ ] Ajouter clés i18n complètes.

4. **Phase 7.4 — Intégration Comptes** :
   - [ ] Vérifier support Item `obligation`/`debt` existant.
   - [ ] Implémenter création auto ou stockage flag.
   - [ ] Vue optionnelle "Dettes du Marché".
   - [ ] Tests synchronisation.

5. **Phase 7.5 — Immersion** :
   - [ ] Ajouter badges CSS.
   - [ ] Afficher messages de chat post-achat.
   - [ ] Affiner UX dialogues.
   - [ ] Validation visuelle par le MJ (screenshot).

## Dépendances

- Issue #457 (Achat simple) — obligatoire.
- Issue #458 (Marchés contextualisés) — fortement recommandé.
- Système d'Obligation/Compétence existant — pour intégration.
- Système de Chat existant — pour messages immersifs.

## Risques & mitigations

| Risque                                       | Mitigation                                                            |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Surcharge MJ par dialogues multiples         | Proposer option "approuver automatiquement les conséquences standard" |
| Complexité de négociation trop grande        | Garder formule simple : remise = rangs réussis × 5% max               |
| Créations auto d'obligations trop fréquentes | Mettre en place checkliste "décocher si non désiré"                   |
| Performance si beaucoup de calculs rareté    | Mettre en cache résultats d'obtainability par session                 |

## Succès criteria

✅ Joueur peut négocier et obtenir remise min 5%, max 30%.  
✅ MJ voit badges et propositions d'obtention pour chaque item.  
✅ Conséquences narratives proposées à validation MJ, jamais forcées.  
✅ Dettes créées et consultables via item/flag.  
✅ Aucun crash ou regression sur catalogue/achat existant.  
✅ Couverture test >80% pour nouvelle logique.  
✅ E2E Playwright couvre happy path négociation + conséquence.

## Notes

Cette phase transforme le Market d'un système transactionnel pur en un **moteur narratif**. L'accent reste sur la **proposition** au MJ, pas sur l'automatisation forcée. Le MJ garde le contrôle total : peut approuver, rejeter ou modifier chaque conséquence avant mutation.
