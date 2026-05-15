# Plan d'implémentation — US19 : Synchroniser achat, arbre et onglet Talents

**Issue** : [#203 — US19: Synchroniser achat, arbre et onglet Talents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/203)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/06-audit-log-et-synchronisation.md`, `documentation/cadrage/character-sheet/talent/05-ui-arbres-specialisation.md`, `documentation/cadrage/character-sheet/talent/04-ui-onglet-talents.md`, `documentation/cadrage/character-sheet/talent/02-regles-achat-progression.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs` (modification), `tests/applications/sheets/character-sheet-talents.test.mjs` (modification), `tests/applications/specialization-tree-app.test.mjs` (modification), `module/documents/actor.mjs` (modification si correctif), `tests/unit/documents/actor-synchronization.test.mjs` (création)

---

## 1. Objectif

Assurer la cohérence des trois vues après un achat de nœud de talent :

1. **Données acteur** — `talentPurchases` + `experience.spent` persistés.
2. **Onglet Talents** (vue consolidée) — recalcule et affiche le nouvel état.
3. **Vue graphique d'arbre** — recalcule les états des nœuds et rafraîchit l'affichage.

L'essentiel du socle est déjà livré par les US précédentes (US6, US7, US12, US15, US18, #244).
US19 est un ticket d'orchestration : il vérifie, consolide et teste la chaîne complète, sans introduire de nouveau système d'événements.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Vérification et consolidation de la chaîne complète de synchronisation :
  1. Achat persisté sur l'acteur (`purchaseTalentNode`)
  2. Mise à jour XP
  3. Recalcul de la vue consolidée (`buildOwnedTalentSummary`)
  4. Rafraîchissement de l'onglet Talents (rerender sheet si ouvert)
  5. Recalcul des états des nœuds dans la vue graphique
  6. Rafraîchissement de la vue graphique (rerender app si ouverte)
  7. Opération transmise à l'audit/log via `recordTalentNodePurchase`
- Correction de l'alignement de résolution des définitions de talents entre l'onglet Talents (qui utilise `item.id` comme clé de résolution) et l'arbre (qui suit ADR-0013 avec `talentUuid` / `talentId`).
- Tests d'intégration couvrant un achat suivi de la mise à jour des deux vues.
- Couverture des cas :
  - vue fermée au moment de l'achat (pas de rerender forcé)
  - achat depuis l'arbre déclenché par l'utilisateur (flux clic -> notification -> refresh)
  - achat depuis un script (ex OggDude) via `_onUpdate` automatique
- Nettoyage du `console.table(...)` résiduel dans `buildSpecializationTreeContext` si toujours présent.

### Exclu de cette US / ce ticket

- Nouveau système d'événements interne (bus, pub/sub, EventEmitter).
- Refonte de l'architecture de rafraîchissement des sheets.
- Migration des anciennes données.
- Création d'embedded `Item` talent sur l'acteur.
- Modification de la couche domaine (purchaseNode, state, summary) sauf si un bug de synchronisation est identifié.
- Achat depuis l'onglet Talents.
- Suppression / remboursement.

---

## 3. Constat sur l'existant

### 3.1. La chaîne de synchronisation est livrée en grande partie

| Étape | Module | Statut |
|---|---|---|
| Achat persisté + XP | `module/lib/talent-node/talent-node-purchase.mjs:29` | ✅ |
| Audit non bloquant | `module/utils/audit-log.mjs:322` (`recordTalentNodePurchase`) | ✅ |
| Vue consolidée dérivée | `module/lib/talent-node/owned-talent-summary.mjs` | ✅ |
| Onglet Talents consomme la vue consolidée | `module/applications/sheets/character-sheet.mjs:944` (`#buildConsolidatedTalentList`) | ✅ |
| Vue graphique dédiée | `module/applications/specialization-tree-app.mjs` | ✅ |
| Achat depuis l'arbre | `module/applications/specialization-tree-app.mjs:882` (`#purchaseNode`) | ✅ |
| Refresh auto dans `_onUpdate` | `module/documents/actor.mjs:610` (`talentPurchases` / `experience.spent`) | ✅ |
| Résolution talents par `talentUuid` prioritaire | `module/applications/specialization-tree-app.mjs:154` (`resolveTalentDetail`) | ✅ (#244) |

### 3.2. Alignement de résolution des définitions : divergence potentielle

L'onglet Talents construit ses définitions de talents via `character-sheet.mjs:924-936` (#buildTalentDefinitions) :

```js
for (const item of game.items) {
    if (item.type === 'talent') {
        defs.set(item.id, { name: item.name, activation: item.system?.activation, isRanked: item.system?.isRanked })
    }
}
```

**Problème** : la clé utilisée est `item.id` (identifiant technique Foundry).
Or `talentPurchases` stocke `talentId` (clé métier stable, conforme ADR-0013).
Si `item.id` et `item.system.id` (talentId) divergent, la définition n'est pas retrouvée et l'onglet affiche "Unknown talent".

**Impact** : risque réel sur les imports OggDude où un item talent peut avoir `id !== system.id`.
L'arbre graphique n'a pas ce problème car il résout d'abord par `talentUuid`, puis par `talentId` via `_resolveTalentByBusinessKey()` qui cherche par `system.id`.

### 3.3. La vue graphique se rafraîchit seule, l'onglet Talents dépend du rerender sheet

Après `actor.update()`, le sheet Foundry est par défaut marqué comme modifié et se rerender au prochain cycle.
Mais ce comportement n'est pas garanti dans tous les cas (ex : sheet en arrière-plan, plusieurs updates rapides).
La vue graphique a un refresh explicite via `_onUpdate` et `#purchaseNode` appelle `this.refresh()`.

### 3.4. Tests de synchronisation inter-vues

Les tests unitaires couvrent chaque brique isolément mais il n'existe pas de test qui :
- simule un achat complet via `purchaseTalentNode`
- vérifie que la vue consolidée reflète le changement
- vérifie que la vue graphique reflète le changement
- vérifie que l'audit a bien été écrit

### 3.5. Debug résiduel

Un `console.table(...)` est signalé dans `buildSpecializationTreeContext` dans le plan US18/202. Vérifier s'il a déjà été nettoyé (`specialization-tree-app.mjs:272` à vérifier).

---

## 4. Décisions d'architecture

### 4.1. Pas de bus d'événements interne

**Décision** : ne pas introduire un système d'événements métier (EventEmitter, pub/sub, bus).
La synchronisation reste basée sur le mécanisme Foundry existant : `actor.update()` déclenche `_onUpdate()` côté acteur, qui rafraîchit la vue graphique ; le sheet est rerenderu par Foundry.

Justification :
- le pattern actuel fonctionne et est déjà aligné avec Foundry lifecycle ;
- conforme au cadrage `06-audit-log-et-synchronisation.md` ;
- évite d'introduire une dépendance transverse couplée.

### 4.2. La source de vérité reste `talentPurchases`

**Décision** : aucune vue ne persiste de cache et aucune vue n'écrit directement les achats.
Toute modification passe par `purchaseTalentNode()`.

Justification :
- conforme au cadrage (`01-modele-domaine-talents.md`, `02-regles-achat-progression.md`) ;
- déjà implémenté dans le code.

### 4.3. L'onglet Talents doit résoudre les définitions par `system.id` (clé métier), pas par `item.id` (clé technique)

**Décision** : modifier `#buildTalentDefinitions()` dans `character-sheet.mjs` pour utiliser `item.system?.id` comme clé de résolution, avec fallback sur `item.id`.

Ordre de résolution :
1. `item.system?.id` (clé métier stable, conforme ADR-0013)
2. `item.id` (fallback technique pour les données legacy)

Justification :
- alignement avec ADR-0013 et le resolver de l'arbre (`_resolveTalentByBusinessKey`) ;
- corrige la divergence potentielle entre `talentPurchases.talentId` et la clé de résolution ;
- ne casse pas les données existantes où `item.id === item.system.id`.

### 4.4. Rafraîchissement immédiat de l'onglet Talents après achat

**Décision** : après un achat réussi depuis l'arbre, déclencher un rerender de la sheet si elle est ouverte et affiche l'onglet Talents.

Justification :
- conforme aux critères d'acceptation de l'issue ;
- Foundry rerender la sheet automatiquement après `actor.update()`, donc le comportement est déjà attendu ;
- si le comportement natif ne suffit pas (ex : sheet en arrière-plan), utiliser `game.system.specializationTreeApp` pour déclencher `actor.sheet.render(false)`.

### 4.5. Tests d'intégration de la chaîne complète

**Décision** : créer un test d'intégration qui simule un achat complet et vérifie les trois vues.

Justification :
- aucune couverture de la chaîne bout en bout aujourd'hui ;
- permet de détecter les régressions lors des futures modifications ;
- conforme aux standards de test du projet (ADR-0004, ADR-0012).

---

## 5. Plan de travail détaillé

### Étape 1 — Corriger l'alignement de résolution des définitions dans l'onglet Talents

**Quoi faire** : modifier `#buildTalentDefinitions()` dans `character-sheet.mjs` pour qu'elle priorise `item.system?.id` comme clé de résolution, avec fallback sur `item.id`.

Ajouter une vérification : si `item.system?.id` est présent, utiliser cette valeur comme clé. Sinon, utiliser `item.id`.

Mettre à jour les tests existants dans `character-sheet-talents.test.mjs` pour couvrir ce nouveau comportement.

**Fichiers** :
- `module/applications/sheets/character-sheet.mjs` (modification)
- `tests/applications/sheets/character-sheet-talents.test.mjs` (modification)

**Risques spécifiques** :
- casser la résolution pour des talents où `item.system?.id` est absent ou vide (fallback `item.id` doit couvrir ce cas) ;
- régression si un test mocke `item.id` sans `item.system.id`.

### Étape 2 — Vérifier et compléter le refresh automatique de l'onglet Talents

**Quoi faire** :
- Vérifier que `SwerpgActor._onUpdate()` déclenche bien un rerender de la sheet quand `talentPurchases` ou `experience.spent` changent.
- Si le rerender natif Foundry ne suffit pas (sheet en arrière-plan), ajouter un appel à `this.actor.sheet?.render(false)` conditionnel dans le refresh de l'arbre.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs` (modification si correctif)
- `module/documents/actor.mjs` (vérification uniquement)

**Risques spécifiques** :
- double rerender si le sheet se rafraîchit déjà automatiquement ;
- boucle de rerender si `render(false)` déclenche un `_onUpdate`.

### Étape 3 — Vérifier et nettoyer le debug résiduel

**Quoi faire** : vérifier la présence d'un `console.table(...)` ou autre `console.log` debug dans `buildSpecializationTreeContext`. Si présent, le supprimer ou le remplacer par `logger.debug()` conditionnel.

**Fichiers** :
- `module/applications/specialization-tree-app.mjs` (vérification/correction)

**Risques spécifiques** : aucun.

### Étape 4 — Créer les tests d'intégration de la chaîne de synchronisation

**Quoi faire** :
- Créer un fichier `tests/unit/documents/actor-synchronization.test.mjs` (ou utiliser `tests/integration/` si le dossier existe).
- Le test doit :
  1. Créer un mock actor avec `talentPurchases` vide et `experience.spent: 0`.
  2. Simuler un achat via `purchaseTalentNode(actor, specializationId, nodeId)`.
  3. Vérifier que `actor.update()` a été appelé avec `talentPurchases` et `experience.spent`.
  4. Simuler le rerender de la vue consolidée via `buildOwnedTalentSummary()` et vérifier le résultat.
  5. Vérifier que l'audit a été écrit via `recordTalentNodePurchase`.
- Ajouter un test pour le cas où la vue graphique est ouverte : vérifier que `refresh()` est appelé sur l'application dédiée.
- Ajouter un test pour le cas où la vue graphique est fermée : pas de `refresh()` appelé, pas d'erreur.

**Fichiers** :
- `tests/unit/documents/actor-synchronization.test.mjs` (création)

**Risques spécifiques** :
- dépendre de mocks trop complexes qui rendent le test fragile ;
- ne pas couvrir le cas de la sheet en arrière-plan.

### Étape 5 — Vérification manuelle et validation des critères d'acceptation

**Quoi faire** : Tester manuellement en environnement Foundry les scénarios suivants :
1. Achat d'un nœud depuis l'arbre → onglet Talents reflète le changement.
2. Achat d'un nœud depuis l'arbre → vue graphique se rafraîchit.
3. Achat avec vue graphique fermée → pas d'erreur.
4. Achat avec onglet Talents non actif → rerender lors du retour sur l'onglet.
5. Talent ranked acheté dans deux arbres → rang consolidé correct.
6. Talent non-ranked acheté → une seule entrée, sources listées.

**Fichiers** : aucun (validation manuelle).

**Risques spécifiques** : environnement de test non disponible.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/applications/sheets/character-sheet.mjs` | modification | Corriger `#buildTalentDefinitions()` pour utiliser `item.system?.id` en priorité clé de résolution |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | modification | Ajouter tests pour la résolution par `system.id` vs `item.id` |
| `module/applications/specialization-tree-app.mjs` | modification (si besoin) | Nettoyer le `console.table(...)` résiduel ; ajouter rerender sheet après achat si nécessaire |
| `tests/unit/documents/actor-synchronization.test.mjs` | création | Test d'intégration de la chaîne complète achat → vues → audit |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Résolution des définitions par `item.id` vs `system.id` | Talents affichés "Unknown" dans l'onglet malgré achat réussi | Appliquer priorité `system.id` avec fallback `item.id` (Étape 1) |
| Sheet Foundry ne rerender pas après `actor.update()` dans certains cas | Onglet Talents non synchronisé après achat | Ajouter un `render(false)` conditionnel (Étape 2) |
| Tests d'intégration trop complexes à cause des dépendances Foundry | Tests fragiles ou non maintenables | Utiliser les patterns de mock existants dans `tests/lib/talent-node/` et `tests/applications/` comme référence |
| `_onUpdate` déjà fonctionnel mais potentiellement appelé deux fois | Double rafraîchissement de la vue graphique | C'est acceptable ; `refresh()` gère l'idempotence |
| Vue fermée → `refresh()` sur une app détruite | Erreur JS | Vérifier que `game.system.specializationTreeApp?.actor === this` avant d'appeler `refresh()` (déjà fait) |

---

## 8. Proposition d'ordre de commit

| Ordre | Type | Message |
|---|---|---|
| 1 | fix | `fix(talents): resolve talent definitions by system.id in talent tab (align with ADR-0013)` |
| 2 | fix | `fix(talent-tree): remove console.table debug residual from buildSpecializationTreeContext` |
| 3 | chore | `chore(talents): add integration tests for full purchase-sync chain (talent tab + tree + audit)` |

---

## 9. Dépendances avec les autres US

| US | Dépendance | Statut |
|---|---|---|
| #190 (US6) — Achat nœud | `purchaseTalentNode()` | ✅ Livré |
| #191 (US7) — Consolidation | `buildOwnedTalentSummary()` | ✅ Livré |
| #196 (US12) — Onglet Talents | Vue consolidée branchée | ✅ Livré |
| #202 (US18) — Achat depuis arbre | `#purchaseNode` + refresh | ✅ Livré |
| #244 — Résolution talents par `talentUuid` | `resolveTalentDetail()` corrigé | ✅ Livré |
| #245 — Chaîne complète talents | Vérification manuelle | ✅ Livré |

US19 est la dernière US de l'Epic #184 sur la synchronisation inter-vues.
Elle ne dépend que de la vérification que les livrables précédents fonctionnent ensemble.
