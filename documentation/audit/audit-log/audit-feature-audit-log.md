# Audit technique — Feature Audit Log (Journal d'audit personnage)

> **Périmètre** : sous-système de journalisation des évolutions de personnage (XP, compétences, talents, caractéristiques, achats/ventes Market) du système Foundry VTT `swerpg`.
> **Date** : 2026-06-01
> **Auteur** : Tech Lead Senior (revue de code)
> **Entrées** : `module/utils/audit-log.mjs`, `module/utils/audit-diff.mjs`, `module/applications/character-audit-log.mjs`, `templates/applications/character-audit-log.hbs`.
> **Objectif** : qualifier l'état de la feature (fonctionnalité, archi, sécurité, perf, qualité) et alimenter la backlog.

---

## 1. Synthèse exécutive

Le sous-système d'audit est **riche, soigné et bien testé** (≈ 1 500 LOC, **217 tests unitaires verts**). Le diff générique par chemins (`snapshotOldState` + `reconstructPreviousValue`), la gestion mémoire des états _pending_ (TTL, éviction LRU, prune, alerte de fuite) et la robustesse défensive (retry, `try/catch` partout, fallbacks) dénotent un vrai niveau d'ingénierie.

Cependant, la revue identifie **un défaut critique de multijoueur** : aucun garde _mono-écrivain_ sur les hooks d'audit. Les hooks sont enregistrés **sur tous les clients connectés** sans filtre `userId`/GM, ce qui provoque en session multi-joueurs des **entrées dupliquées**, des **messages chat dupliqués**, et du **spam de whispers GM** depuis les clients non-propriétaires. À cela s'ajoutent un **risque d'intégrité** (le journal est stocké sur l'acteur que le joueur audité possède et peut donc éditer), une **dépendance d'API dépréciée** pour l'export CSV, et une **inversion de couche** entre `utils/` et `applications/`.

| Axe                  | Note     | Commentaire                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| Fonctionnalité       | 🟢 Bon   | Couverture d'événements large, filtres, export CSV, chat           |
| Architecture         | 🟠 Moyen | Inversion de couche util→applications ; taxonomie dupliquée 4×     |
| Sécurité / intégrité | 🟠 Moyen | Journal éditable par l'audité ; CSV injection ; API dépréciée      |
| Performance          | 🟢 Bon   | Gestion mémoire pending soignée ; bémol : tableau 500 sur l'acteur |
| Qualité / solidité   | 🟠 Moyen | Critique multijoueur ; bug d'affichage chat ; magic numbers        |

---

## 2. Cartographie

| Module                                           | Rôle                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/audit-log.mjs`                            | Hooks Foundry, file _pending_ old-state, écriture batch, émission chat, enregistreurs (`recordItemPurchase/Sale`, `recordTalentNode*`) |
| `utils/audit-diff.mjs`                           | Détecteurs de diff par domaine (skills, caractéristiques, XP, détails, spécialisations, advancement), `makeEntry`, `composeEntries`    |
| `applications/character-audit-log.mjs`           | ApplicationV2 d'affichage + helpers (familles, labels, descriptions i18n, export CSV)                                                  |
| `templates/applications/character-audit-log.hbs` | Gabarit (header, filtres, liste, vide)                                                                                                 |
| `settings.js`                                    | Réglage `auditLogMaxEntries` (world, 100–5000, défaut 500)                                                                             |

**Flux** : `preUpdateActor` capture l'old-state (file _pending_ par `actor.uuid:userId`) → `updateActor` apparie l'old-state aux changements appliqués → `composeEntries` produit les entrées → `writeLogEntries` les ajoute au flag `flags.swerpg.logs` (tronqué au max) → `sendChatForAuditEntries` émet un message chat par entrée.

---

## 3. Constats détaillés

### 🔴 Critiques

#### AL1. Aucun garde _mono-écrivain_ → écritures et chats dupliqués en multijoueur

**Fichiers** : `swerpg.mjs:350` (`registerAuditLogHooks()` dans le hook _ready_, **sans gating GM**) ; `audit-log.mjs:333-371,384-410` (handlers **sans** filtre `userId`/`activeGM` — vérifié : aucun `game.userId === userId`, `activeGM`, `isSelf`).

Les hooks `preUpdateActor`/`updateActor`/`createItem` se déclenchent **sur chaque client connecté**. `onUpdateActor` → `writeLogEntries` → `actor.update(...)`. Conséquences avec un MJ **et** le joueur propriétaire connectés (cas nominal) :

- **Les deux** ont la permission d'écrire → **2 écritures** : la seconde relit le log déjà augmenté par la première et **ré-ajoute** les mêmes entrées → **doublons** dans `flags.swerpg.logs`.
- **2 appels** à `sendChatForAuditEntries` → **messages chat dupliqués**.
- Sur tout client **sans** permission (autres joueurs), `actor.update` est rejeté → retry → `handleWriteError` → **whisper GM d'erreur** à chaque update légitime d'un autre joueur (**spam**).

`pendingOldStates` étant une Map **en mémoire par client**, chaque client constitue sa propre paire old/new : la duplication est systématique, pas une race rare.

**Correctif** : élire un écrivain unique. Le plus simple et cohérent avec la donnée `userId` portée par l'entrée : garder l'écriture au seul utilisateur déclencheur —

```js
export function onUpdateActor(actor, changes, options, userId) {
  if (game.userId !== userId) return            // ← single-writer
  …
}
```

Idem pour `onCreateItem` (`game.userId !== userId`). Variante MJ-autoritaire : `if (!game.users.activeGM?.isSelf) return`. Ajouter un test multijoueur (2 users) garantissant **une seule** entrée et **un seul** message chat.

---

### 🟠 Majeurs

#### AL2. Export CSV via API Foundry dépréciée/retirée

**Fichier** : `character-audit-log.mjs:445` — `saveDataToFile(...)` est appelé **sans import**, en s'appuyant sur le **global** Foundry. Ce global est déprécié (déplacé vers `foundry.utils.saveDataToFile`) et susceptible d'être retiré sur la cible **v14** du projet. En cas de retrait, l'export lève → capté → notification `EXPORT_FAILED` (fonction silencieusement cassée).

**Correctif** : importer/qualifier `foundry.utils.saveDataToFile` ; ajouter un test ou un smoke E2E sur l'export. Vérifier la disponibilité sur v14.309.

#### AL3. Intégrité du journal compromise : il est éditable par l'audité

Le journal vit dans `flags.swerpg.logs` **sur l'acteur** que le joueur possède (`OWNER`). Un joueur peut donc **éditer ou purger son propre historique** (`actor.setFlag`, console, voire désactivation du module). Pour une feature d'**audit/responsabilité** (tracer les dépenses XP/crédits), l'audité ne devrait pas pouvoir altérer la preuve.

**Décision à acter** : selon l'objectif (confort joueur vs contrôle MJ). Options : journal en _flag_ protégé écrit uniquement par le MJ/serveur, hash de chaînage anti-falsification, ou stockage côté MJ (journal de monde) répliqué. À défaut, documenter explicitement que le journal est **indicatif, non inviolable**.

#### AL4. Taxonomie des types dupliquée en 4 endroits (risque de dérive)

Le même ensemble de types d'événements est mappé séparément dans :

1. `AUDIT_LOG_TYPE_LABELS` (labels), 2. `getAuditLogFamily` (familles/filtres), 3. `buildAuditLogDescription` (descriptions), 4. `_buildChatContext` (rendu chat).

Ajouter un type impose **4 éditions** synchronisées ; un oubli passe en `UNKNOWN`/`other` silencieusement. Risque de drift élevé à mesure que les types se multiplient (déjà ~20).

**Correctif** : une **table de registre unique** par type `{ label, family, describe(), chatVariant }` consommée par les 4 usages. Réduit la surface et garantit la cohérence.

#### AL5. Inversion de couche : `utils/` dépend de `applications/`

**Fichier** : `audit-log.mjs:3` importe `buildAuditLogDescription` depuis `applications/character-audit-log.mjs`. La couche utilitaire/technique dépend de la couche UI, et la **logique métier de description** (mapping type→texte i18n) réside dans un fichier _Application_. Contraire à la séparation prescrite (`CLAUDE.md`) ; gêne la testabilité et crée un couplage cyclique potentiel.

**Correctif** : extraire la taxonomie + descriptions dans un module dédié (idéalement proche du domaine, ex. `module/lib/audit/` ou `utils/audit-taxonomy.mjs`) importé par les deux couches. Converge avec AL4.

#### AL6. Bug d'affichage chat : le modificateur de commerce est écrasé (item.purchase)

**Fichier** : `audit-log.mjs:738-753`. La branche `item.purchase` pose `context.metaRight = AppliedModifier` (modificateur de prix narratif) **puis**, juste après, `context.metaRight = CREDITS_REMAINING` dès que `snapshot.creditsAfter` est défini (**toujours** pour un achat). Le **modificateur de prix issu du jet narratif n'apparaît donc jamais** dans le message chat.

**Correctif** : router le modificateur sur un autre emplacement (ex. `metaLeft` complémentaire ou `description`), ou fusionner les deux infos. Ajouter un test couvrant un achat avec `outcome.priceModifier !== 0`.

---

### 🟡 Mineurs

#### AL7. Appariement old/new fragile en cas d'update rejetée

La file _pending_ est FIFO par `actor:userId`. Si un `preUpdateActor` pousse un old-state mais que l'update est **rejetée** (validation) → `updateActor` ne tire jamais cette entrée. L'update **suivante** tirera le **mauvais** old-state (le plus ancien) et produira un diff erroné. Le TTL (30 s) ne couvre pas une seconde update rapprochée.

**Reco** : corréler par un identifiant d'opération plutôt que FIFO, ou purger l'old-state d'une update échouée (hook d'erreur). Edge case, mais produit une entrée d'audit fausse.

#### AL8. CSV injection (formula injection)

`escapeCsvCell` (`:461`) protège virgules/guillemets/sauts de ligne mais **pas** les préfixes de formule (`=`, `+`, `-`, `@`). Un nom d'item/perso `=HYPERLINK(...)` s'exécute à l'ouverture dans Excel/Sheets.

**Reco** : préfixer d'un apostrophe/zero-width les cellules commençant par `= + - @`.

#### AL9. Empreinte donnée : tableau jusqu'à 500 (→ 5000) entrées sur l'acteur

Le journal est un flag du document acteur, **synchronisé à tous les clients à chaque update**. À 500–5000 entrées, le document grossit et chaque petite modif resynchronise l'ensemble. `writeLogEntries` relit + clone + réécrit **tout le tableau** à chaque écriture (O(n)).

**Reco** : surveiller la taille ; envisager pagination/segmentation ou stockage externe si la volumétrie grimpe.

#### AL10. `_buildChatContext` : switch monolithique (~190 lignes)

Difficile à tester unitairement et à étendre. **Reco** : map de handlers par type (converge avec AL4), un test par branche.

#### AL11. Double source de vérité du delta crédits

`recordItemPurchase` calcule `creditDelta = -(price*quantity)` **indépendamment** de `snapshot.creditsDelta = creditsBefore - creditsAfter`. Les deux peuvent diverger (modificateurs, arrondis). **Reco** : dériver l'un de l'autre ou documenter la sémantique distincte.

#### AL12. Magic numbers

`item.system?.cost ?? 5`, `?? 1` (`audit-log.mjs:391-392`), `computeCharacteristicCost = newValue * 10` (`audit-diff.mjs:30`), seuils `100`/`MAX_PENDING`/TTL. Plusieurs littéraux métier mériteraient des constantes nommées (cf. ADR-0018), notamment le coût de caractéristique (règle de jeu).

#### AL13. Export CSV sans BOM UTF-8

Le contenu est annoncé `charset=utf-8` mais sans BOM ; Excel (FR) peut mal afficher les accents. **Reco** : préfixer `﻿`.

---

## 4. Points forts à préserver

- **Diff générique robuste** : capture par chemins, gestion des chemins de suppression Foundry (`.-=`), reconstruction d'ancienne valeur à partir d'un diff partiel (`reconstructPreviousValue`).
- **Gestion mémoire des _pending_ exemplaire** : TTL, éviction LRU (`evictOldestIfNeeded`), `pruneExpiredPending`, alerte de fuite au-delà de 100.
- **Anti-boucle d'écriture** : marqueur `{ swerpgAuditLog: false }` ignoré par les handlers + `isOnlyAuditChange`.
- **Robustesse** : retry (`MAX_RETRIES`), `handleWriteError` + whisper GM, `composeEntries` encapsulé dans `try/catch`.
- **Permissions de lecture/export** correctes : `canViewAuditLog` = MJ **ou** `OWNER` exact ; `render()` et `exportCsv` re-vérifient.
- **i18n complet**, dates localisées (`Intl.DateTimeFormat`), familles de filtres, export CSV avec échappement de base.
- **Couverture de tests forte** : 217 tests verts (unités + intégration Market/audit).
- **Fire-and-forget non bloquant** : l'audit ne casse jamais le flux métier (achats, talents, progression).

---

## 5. Backlog proposée

> **P0** = correctness/intégrité multijoueur ; **P1** = robustesse/architecture ; **P2** = polish/hardening.

| ID       | Titre                                                                                   | Prio   | Type             | Effort | Réf.     |
| -------- | --------------------------------------------------------------------------------------- | ------ | ---------------- | ------ | -------- |
| AUDIT-01 | Garde mono-écrivain sur les hooks (`game.userId === userId`) + test multijoueur         | **P0** | bug              | S      | AL1      |
| AUDIT-02 | Migrer l'export CSV vers `foundry.utils.saveDataToFile` (+ test)                        | **P1** | dette/API        | XS     | AL2      |
| AUDIT-03 | Arbitrer l'inviolabilité du journal (écriture MJ/serveur ou doc de monde)               | **P1** | conception/sécu  | M      | AL3      |
| AUDIT-04 | Registre unique de taxonomie type→{label,family,describe,chatVariant}                   | **P1** | refactor         | M      | AL4/AL10 |
| AUDIT-05 | Sortir la taxonomie/descriptions de `applications/` vers le domaine (lever l'inversion) | **P1** | archi            | S      | AL5      |
| AUDIT-06 | Corriger l'écrasement de `metaRight` (modificateur commerce visible) + test             | **P1** | bug              | XS     | AL6      |
| AUDIT-07 | Corréler old/new par id d'opération (ou purge sur update échouée)                       | **P2** | robustesse       | M      | AL7      |
| AUDIT-08 | Durcir `escapeCsvCell` contre l'injection de formules                                   | **P2** | sécu             | XS     | AL8      |
| AUDIT-09 | Surveiller/segmenter la volumétrie du journal sur l'acteur                              | **P2** | perf             | M      | AL9      |
| AUDIT-10 | Nommer les constantes métier (coût caractéristique, défauts cost/ranks)                 | **P2** | dette (ADR-0018) | S      | AL12     |
| AUDIT-11 | Unifier la source du delta crédits (purchase)                                           | **P2** | qualité          | XS     | AL11     |
| AUDIT-12 | BOM UTF-8 dans l'export CSV                                                             | **P2** | i18n             | XS     | AL13     |

---

## 6. Recommandation

La base technique est **solide et bien testée** ; aucune refonte n'est nécessaire. La priorité absolue est **AUDIT-01** : sans garde mono-écrivain, toute session multijoueur produit des **doublons d'entrées et de messages chat** et du **spam de whispers** — un défaut visible et corrosif pour une feature dont la valeur est la fiabilité de la trace. Viennent ensuite la **migration de l'API d'export** (AUDIT-02), l'**arbitrage d'intégrité** (AUDIT-03, structurant pour la finalité « audit »), puis la **consolidation de la taxonomie** (AUDIT-04/05) qui réduira durablement le coût d'ajout de nouveaux types d'événements. Le bug d'affichage AUDIT-06 est un correctif rapide à fort retour utilisateur.
</content>
