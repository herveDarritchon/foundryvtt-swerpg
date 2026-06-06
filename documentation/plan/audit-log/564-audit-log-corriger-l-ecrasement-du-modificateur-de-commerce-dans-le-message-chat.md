# Issue #564 — Audit Log : corriger l’écrasement du modificateur de commerce dans le message chat

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/564  
**Domaine métier** : `audit-log`

## Goal

Rendre visible dans la carte chat d’achat le modificateur narratif de commerce (`AppliedModifier`) sans perdre l’information de solde restant (`creditsRemaining`), en corrigeant uniquement le contrat de rendu `item.purchase` et ses tests ciblés.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` référence explicitement ce défaut sous **AL6** et recommande de ne plus faire cohabiter `AppliedModifier` et `CREDITS_REMAINING` sur le même slot `metaRight`.
- Dans `module/utils/audit-log.mjs`, la branche `item.purchase` renseigne aujourd’hui `context.metaRight` avec `MARKET.CommerceOutcome.AppliedModifier`, puis l’écrase systématiquement avec `SWERPG.AUDIT_LOG.META.CREDITS_REMAINING` dès que `snapshot.creditsAfter` existe.
- Le template `templates/chat/audit-entry.hbs` expose déjà trois zones exploitables sans refonte structurelle : `description`, `metaLeft` et `metaRight`.
- Les garde-fous naturels existent déjà dans `tests/utils/audit-log.test.mjs` et `tests/integration/market-audit-log.integration.test.mjs` pour verrouiller le view-model chat des achats.

## Plan d’implémentation

### Étape 1 — Corriger le contrat de rendu `item.purchase` pour préserver les deux informations

**Fichiers** : `module/utils/audit-log.mjs`

**What** :

- Revoir la branche `_buildChatContext()['item.purchase']` pour que le modificateur narratif ne soit plus stocké dans un champ ensuite écrasé.
- Conserver `creditsRemaining` dans `metaRight` comme information de solde final, et router `AppliedModifier` vers un emplacement stable non destructif (`metaLeft` enrichi, `description`, ou fusion explicite) sans masquer le prix de base.
- Garder le correctif strictement local au rendu chat des achats, sans changer la persistance de l’entrée d’audit, le calcul métier du commerce, ni les autres types d’événements.

**Résultat attendu** : un achat avec `outcome.priceModifier !== 0` affiche simultanément le prix/modificateur narratif et le solde restant dans la carte chat.

### Étape 2 — Verrouiller le bug et la non-régression sur les achats

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/integration/market-audit-log.integration.test.mjs`

**What** :

- Ajouter un cas ciblé couvrant un `item.purchase` avec `outcome.priceModifier !== 0` et `snapshot.creditsAfter` défini.
- Vérifier explicitement que le contexte template conserve le modificateur narratif visible et garde `SWERPG.AUDIT_LOG.META.CREDITS_REMAINING` visible en parallèle.
- Mettre à jour les assertions existantes sur `item.purchase` pour refléter le nouvel emplacement du modificateur sans élargir le périmètre aux ventes, au résumé chat ou à l’application Audit Log.

**Résultat attendu** : le bug d’écrasement est couvert par des tests unitaires/intégration ciblés et ne peut pas réapparaître silencieusement.

## Périmètre / hors périmètre

### Inclus

- Correction du view-model chat pour `item.purchase`
- Conservation simultanée du modificateur narratif et du solde restant
- Mise à jour ciblée des tests Audit Log / Market liés à ce rendu

### Exclus

- Refonte du template chat ou des styles sans besoin prouvé
- Changement du calcul de `priceModifier`, des règles Market ou du stockage `flags.swerpg.logs`
- Élargissement aux autres branches du switch chat (`item.sale`, `xp.*`, talents, etc.)
