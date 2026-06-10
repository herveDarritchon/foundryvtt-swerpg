# Issue #674 — Étape 4 mise à jour documentation ADR-0025 et Audit Log

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/674  
**Plan parent** : `documentation/plan/audit-log/obligation-audit-log-integration.md`  
**Domaine métier** : `audit-log`

## Goal

Corriger l'incohérence documentaire autour du modèle `obligation` en réalignant ADR-0025 sur le contrat réellement implémenté, puis ajuster la documentation Audit Log seulement si une documentation canonique énumère encore un périmètre devenu faux ou incomplet.

## Contexte utile

- L'issue `#674` reprend explicitement l'**Étape 4 — Documentation** du cadrage `obligation-audit-log-integration.md`.
- `ADR-0025` documente encore un modèle `obligation` à 5 champs alors que le code et les tests verrouillent aussi `campaignDelta`, `campaignNote` et `transformedTo`.
- Ces trois champs sont déjà exploités côté modèle, évolution métier, rendu feuille personnage et composition des entrées Audit Log ; l'objectif est donc une correction documentaire, pas un enrichissement fonctionnel du DataModel.
- Toute évolution significative d'ADR doit garder `documentation/architecture/adr/INDEX.md` cohérent dans le même changement.

## Plan d'implémentation

### Étape 1 — Revalider le contrat réel avant écriture documentaire

**Fichiers** : `module/models/obligation.mjs`, `module/lib/obligations/obligation-evolution.mjs`, `module/applications/sheets/character-sheet.mjs`, `module/lib/audit/obligation-events.mjs`, `tests/models/obligation.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`, `tests/lib/obligations/obligation-evolution.test.mjs`, `tests/lib/audit/obligation-events.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- confirmer que `campaignDelta`, `campaignNote` et `transformedTo` font bien partie du contrat réellement supporté ;
- relever leur rôle exact pour éviter une mise à jour ADR trompeuse ;
- vérifier que l'Audit Log consomme ces champs comme données existantes et n'introduit aucun nouveau champ sur `obligation`.

**Résultat attendu** : la mise à jour documentaire repose sur l'état réel du code et distingue clairement « champs déjà existants » et « absence d'enrichissement du modèle par l'audit ».

### Étape 2 — Corriger ADR-0025 sans changer la décision produit

**Fichiers** : `documentation/architecture/adr/adr-0025-obligation-item-narratif-minimal-sans-enrichissement-du-datamodel.md`, `documentation/architecture/adr/INDEX.md`

**What** :

- mettre à jour le contexte, la décision, l'impact et le contrat testable pour refléter les 8 champs réels du modèle `obligation` ;
- expliciter que `campaignDelta`, `campaignNote` et `transformedTo` sont des champs déjà présents au service de l'évolution narrative en campagne, et non une remise en cause du principe de minimalisme ;
- ajouter une note claire indiquant que l'intégration Audit Log exploite ces champs existants mais n'enrichit pas le DataModel ;
- ajuster l'entrée d'index ADR si son résumé doit mentionner plus précisément le contrat désormais documenté.

**Résultat attendu** : ADR-0025 redevient exacte, cohérente avec le code et continue de porter la même décision architecturale sans nécessiter une nouvelle ADR.

### Étape 3 — Aligner la documentation Audit Log seulement si elle porte encore cette incohérence

**Fichiers** : `documentation/plan/audit-log/obligation-audit-log-integration.md` _(si cette documentation doit rester synchronisée comme référence du chantier)_

**What** :

- relire la documentation Audit Log liée au chantier obligations pour repérer toute mention encore ambiguë sur « 5 champs » ou sur un enrichissement supposé du modèle ;
- corriger uniquement les passages documentaires devenus faux, sans rouvrir le cadrage fonctionnel ni créer d'ADR additionnelle ;
- conserver le principe que l'Audit Log trace les obligations à partir du modèle existant et reste un consommateur documentaire du contrat, pas son moteur d'évolution.

**Résultat attendu** : la documentation du chantier Audit Log n'entretient plus de contradiction avec ADR-0025 mise à jour.

## Périmètre / hors périmètre

### Inclus

- correction documentaire ADR-0025 ;
- clarification explicite des 8 champs réels du modèle `obligation` ;
- mention explicite que l'Audit Log n'ajoute aucun champ ;
- alignement de la documentation Audit Log seulement si elle contient encore l'incohérence.

### Exclus

- toute modification du code source ou des tests ;
- ajout, suppression ou renommage de champs du DataModel `obligation` ;
- nouvelle ADR de fond sur le domaine Obligation ;
- refonte plus large de la documentation Audit Log hors défaut prouvé.
