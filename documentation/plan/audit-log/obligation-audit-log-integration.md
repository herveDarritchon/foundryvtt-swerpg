# Audit Log — Intégrer les obligations au journal d'évolution personnage

**Contexte** : Cadrage technique pour ajouter les obligations (Item type `obligation`) au sous-système Audit Log existant.

---

## Objectif

Ajouter les obligations au sous-système Audit Log afin que les créations, suppressions et modifications significatives d'obligations soient tracées dans le journal d'évolution du personnage, au même titre que les compétences, talents, achats/ventes Market, XP, spécialisations et caractéristiques.

Le journal reste indicatif, stocké sur l'acteur, et ne devient pas une preuve infalsifiable ni une source de vérité métier.

## Contexte Codebase

Le sous-système Audit Log est déjà structuré autour de :

- `module/utils/audit-log.mjs` : hooks Foundry, écriture des entrées, émission chat, ponts explicites talent/item/market.
- `module/utils/audit-diff.mjs` : détection des changements `Actor.system.*`.
- `module/lib/audit/taxonomy.mjs` : registre canonique des types d'événements.
- `module/lib/audit/storage.mjs` : stockage segmenté transparent dans `flags.swerpg.auditLogSegs` / `flags.swerpg.auditLogIndex`.
- `module/applications/character-audit-log.mjs` : UI ApplicationV2, filtres, recherche, export CSV, view-model.
- `templates/applications/character-audit-log.hbs` et `templates/chat/audit-entry*.hbs` : rendu UI et chat.
- `styles/applications.less` et `styles/chat.less` : style audit déjà aligné avec le design system.

Les obligations sont actuellement gérées comme `Item` embarqués de type `obligation` :

- `module/models/obligation.mjs`
- `module/applications/sheets/obligation.mjs`
- `module/applications/sheets/character-sheet.mjs`
- `templates/sheets/actor/character-commitments.hbs`
- `templates/sheets/partials/obligation-config.hbs`
- `module/lib/obligations/obligation-bonus-calculator.mjs`
- `module/lib/obligations/obligation-evolution.mjs`

## Problème Actuel

Les obligations ne sont pas intégrées à l'audit log car le flux existant couvre principalement :

- les changements `Actor.system.*` via `preUpdateActor` / `updateActor` et `composeEntries()`;
- la création d'items `talent` via `createItem`;
- les achats/ventes Market via `recordItemPurchase()` / `recordItemSale()`;
- les talents d'arbre via `recordTalentNodeOperation()`.

Les obligations sont des `Item` embarqués. Leur création, édition ou suppression ne passe donc pas par `audit-diff.mjs`, sauf si un effet secondaire modifie aussi `Actor.system.*`.

## Contraintes Architecturales

- Respecter `ADR-0011` : le journal reste stocké en flags d'acteur et reste indicatif.
- Respecter `ADR-0022` : aucun style brut si du CSS est ajouté, uniquement des design tokens.
- Ne pas enrichir le DataModel `obligation` pour l'audit.
- Ne pas stocker l'historique dans `system.*`.
- Ne pas mettre de logique métier dans les templates.
- Ne pas créer une mécanique d'audit parallèle.
- Ne pas rendre l'audit bloquant pour les actions utilisateur.
- Continuer à éviter les doublons multijoueurs via `game.userId === userId`.
- Conserver l'option interne `{ swerpgAuditLog: false }` pour éviter les boucles d'écriture.

## Point D'attention ADR-0025

`ADR-0025` indique que le modèle `obligation` reste limité à cinq champs, mais le code actuel et les tests verrouillent huit champs :

- `description`
- `value`
- `isExtra`
- `extraXp`
- `extraCredits`
- `campaignDelta`
- `campaignNote`
- `transformedTo`

Le chantier Audit Log ne doit pas ajouter de champ, mais il devrait signaler ou corriger cette incohérence documentaire. Recommandation : mettre à jour `ADR-0025` ou créer un addendum court indiquant que les champs de campagne existent déjà et que l'audit ne les enrichit pas.

## Périmètre Inclus

- Tracer la création d'une obligation narrative.
- Tracer la création d'une obligation de bonus de création.
- Tracer la suppression d'une obligation.
- Tracer la modification des champs significatifs existants.
- Ajouter une famille Audit Log `obligations`.
- Ajouter les libellés i18n FR/EN.
- Afficher les événements dans l'application Audit Log et dans les cartes chat.
- Ajouter les tests unitaires et applicatifs ciblés.

## Périmètre Exclu

- Pas de refonte du modèle `obligation`.
- Pas de nouvel écran d'évolution d'obligation.
- Pas de stockage serveur ou MJ-only.
- Pas de durcissement anti-falsification.
- Pas de refonte générale de l'Audit Log.
- Pas de réglage utilisateur supplémentaire sauf besoin découvert pendant l'implémentation.
- Pas de logging brut du HTML complet de `description`.

## Événements Audit Proposés

Types canoniques à ajouter dans `module/lib/audit/taxonomy.mjs` :

- `obligation.create`
- `obligation.update`
- `obligation.delete`

Famille à ajouter :

- `AUDIT_LOG_FAMILIES.obligations = 'obligations'`

Données minimales d'entrée :

```js
{
  obligationId,
  obligationName,
  isExtra,
  value,
  currentValue,
  extraXp,
  extraCredits,
  campaignDelta,
  campaignNoteChanged,
  transformedTo,
  changedFields,
}
```

Pour les updates :

```js
{
  obligationId,
  obligationName,
  isExtra,
  changedFields,
  oldValue, newValue,
  oldCurrentValue, newCurrentValue,
  oldIsExtra, newIsExtra,
  oldExtraXp, newExtraXp,
  oldExtraCredits, newExtraCredits,
  oldCampaignDelta, newCampaignDelta,
  campaignNoteChanged,
  oldTransformedTo, newTransformedTo,
}
```

La description ne doit pas être loggée en clair par défaut. Une entrée peut seulement indiquer `descriptionChanged: true` pour limiter le volume, éviter l'HTML dans les logs et respecter le caractère narratif potentiellement sensible.

## Architecture Cible

### 1. Hooks Item dédiés

Étendre `registerAuditLogHooks()` dans `module/utils/audit-log.mjs` :

```js
Hooks.on('createItem', onCreateItem)
Hooks.on('preUpdateItem', onPreUpdateItem)
Hooks.on('updateItem', onUpdateItem)
Hooks.on('deleteItem', onDeleteItem)
```

Le handler `onCreateItem` existe déjà pour les talents. Il doit être étendu sans casser `talent.purchase`.

### 2. Guards communs

Appliquer les mêmes gardes que l'audit acteur :

- ignorer si `game.userId !== userId`;
- ignorer si `options?.swerpgAuditLog === false`;
- ignorer si l'item n'est pas embarqué sur un acteur `character`;
- ignorer si `item.type !== 'obligation'`;
- ne jamais bloquer l'action métier en cas d'échec d'écriture.

### 3. Snapshot item avant update

Créer une file pending dédiée aux updates d'items obligations, similaire à `pendingOldStates` côté acteur.

Clé recommandée : `item.uuid:userId`

Utiliser un `_swerpgOpId` dans `options` comme le flux acteur afin d'éviter les appariements FIFO incorrects après update rejetée.

### 4. Helper pur optionnel

Pour éviter d'alourdir encore `audit-log.mjs`, créer un helper pur sous `module/lib/audit/obligation-events.mjs`.

Responsabilités :

- normaliser l'état d'une obligation en plain object;
- détecter les champs modifiés;
- produire les données métier de l'entrée;
- ne pas dépendre de `game`, `foundry`, `Item`, `Actor`, `Hooks`.

L'adapter Foundry dans `audit-log.mjs` reste responsable de `makeEntry()`, `captureSnapshot()`, `writeLogEntries()` et `game.users`.

## Rendu Audit Log

### Application

Modifier `module/applications/character-audit-log.mjs` :

- ajouter `AUDIT_LOG_FAMILIES.obligations` dans `AUDIT_LOG_FILTER_ORDER`;
- ajouter le label `SWERPG.AUDIT_LOG.FILTER.OBLIGATIONS`;
- ajouter une icône de famille, par exemple `fa-solid fa-scale-balanced` ou `fa-solid fa-link`;
- ajouter les branches visuelles dans `buildAuditLogEntryVisual()`.

Rendu attendu :

- création : variante `add`, badge `Nom (valeur)`;
- suppression : variante `remove`, badge `Nom (valeur)`;
- modification : variante `change`, transition ancienne valeur vers nouvelle valeur si pertinente;
- bonus création : description ou meta indiquant XP/crédits accordés, sans utiliser `xpDelta` comme dépense de progression.

### Chat

Modifier les handlers chat dans `module/utils/audit-log.mjs` :

- ajouter les entrées `CHAT_HANDLERS` pour `obligation.create`, `obligation.update`, `obligation.delete`;
- conserver `xpDelta: 0` et `creditDelta: 0` sauf décision explicite contraire;
- afficher les bonus dans `description`, `metaLeft` ou `metaRight`.

## i18n

Ajouter dans `lang/en.json` et `lang/fr.json` :

```
SWERPG.AUDIT_LOG.FILTER.OBLIGATIONS
SWERPG.AUDIT_LOG.TYPE.OBLIGATION_CREATE
SWERPG.AUDIT_LOG.TYPE.OBLIGATION_UPDATE
SWERPG.AUDIT_LOG.TYPE.OBLIGATION_DELETE
SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_CREATE
SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_UPDATE
SWERPG.AUDIT_LOG.DESCRIPTION.OBLIGATION_DELETE
SWERPG.AUDIT_LOG.UNKNOWN_OBLIGATION
```

## Fichiers Impactés

- `module/utils/audit-log.mjs`
- `module/lib/audit/taxonomy.mjs`
- `module/applications/character-audit-log.mjs`
- `lang/en.json`
- `lang/fr.json`
- `tests/utils/audit-log.test.mjs`
- `tests/lib/audit/taxonomy.test.mjs`
- `tests/applications/character-audit-log.test.mjs`
- `tests/applications/sheets/character-sheet-commitments.test.mjs` si les flows de création/suppression pilotés par sheet doivent être verrouillés
- `documentation/architecture/adr/adr-0025-obligation-item-narratif-minimal-sans-enrichissement-du-datamodel.md` si l'incohérence actuelle est corrigée

## Plan D'implémentation

### Étape 1 — Taxonomie et UI Audit Log

- Ajouter la famille `obligations`.
- Ajouter les types `obligation.create/update/delete`.
- Ajouter les descriptions registry.
- Ajouter les labels FR/EN.
- Ajouter le filtre, l'icône et le rendu visuel application.
- Ajouter les handlers chat.

### Étape 2 — Hooks Item obligations

- Étendre `onCreateItem` pour les obligations.
- Ajouter `onPreUpdateItem` / `onUpdateItem`.
- Ajouter `onDeleteItem`.
- Garantir les guards multijoueurs et anti-récursion.
- Utiliser `writeLogEntries()` existant.

### Étape 3 — Tests

- Tester que la création d'une obligation narrative écrit une entrée `obligation.create`.
- Tester que la création d'une obligation extra écrit une entrée avec `isExtra`, `extraXp`, `extraCredits`.
- Tester que la création d'un talent reste `talent.purchase`.
- Tester qu'un item non-obligation ne produit rien.
- Tester que l'update `system.value` / `system.campaignDelta` produit `obligation.update`.
- Tester que l'update de description ne logge pas le HTML complet.
- Tester que la suppression produit `obligation.delete`.
- Tester que `swerpgAuditLog: false` désactive le flux.
- Tester que `game.userId !== userId` évite les doublons.
- Tester les descriptions taxonomy et les familles.
- Tester que le filtre `Obligations` apparaît et compte les entrées.

### Étape 4 — Documentation

- Corriger ou annoter l'incohérence ADR-0025.
- Mettre à jour la documentation de l'Audit Log si elle liste les familles suivies.
- Ne pas créer d'ADR nouvelle sauf si la décision produit change la nature des obligations.

## Critères D'acceptation

- Une obligation créée sur un personnage apparaît dans l'Audit Log.
- Une obligation modifiée apparaît dans l'Audit Log avec une description lisible.
- Une obligation supprimée apparaît dans l'Audit Log.
- Les obligations disposent d'un filtre dédié dans l'application Audit Log.
- Les cartes chat restent cohérentes avec les variantes visuelles existantes.
- Aucun champ nouveau n'est ajouté au DataModel `obligation`.
- Aucun raw color/font n'est ajouté dans les styles.
- L'audit reste non bloquant.
- Aucun doublon n'est produit en session multi-client.
- Les tests ciblés passent.

## Commandes De Validation

```bash
pnpm vitest run tests/utils/audit-log.test.mjs
pnpm vitest run tests/lib/audit/taxonomy.test.mjs
pnpm vitest run tests/applications/character-audit-log.test.mjs
pnpm vitest run tests/applications/sheets/character-sheet-commitments.test.mjs
pnpm run style:tokens
pnpm test
```

## Risques

- Logging trop verbeux si chaque édition de description génère une entrée très détaillée.
- Confusion entre XP de progression et XP de bonus de création si `xpDelta` est utilisé naïvement.
- Dérive de taxonomie si `buildAuditLogEntryVisual()` et `CHAT_HANDLERS` ne sont pas mis à jour ensemble.
- Incohérence documentaire ADR-0025 déjà présente et à clarifier.
- Suppression d'item : vérifier en Foundry réel que `deleteItem` conserve bien assez de données pour construire l'entrée.

## Recommandation

Implémenter une intégration légère par hooks Item, sans toucher au DataModel. Ajouter `obligations` comme famille Audit Log dédiée, mais garder les données de bonus de création en métadonnées descriptives plutôt qu'en `xpDelta` de progression.
