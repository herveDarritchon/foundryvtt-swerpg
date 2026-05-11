# Plan d'implémentation — TECH : Tests Vitest du système d'audit log

**Issue** : [#163 — TECH: Tests Vitest du système d'audit log](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/163)
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)
**US parente** : [#151 — US1: Enregistrer chaque action d'évolution du personnage dans un journal de bord](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`
**Plan de référence** : `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` (§5, Étape 4)
**Module(s) impacté(s)** : `tests/utils/audit-log.test.mjs` (modification), `tests/utils/audit-diff.test.mjs` (modification), `documentation/tests/manuel/audit-log/README.md` (création)

---

## 1. Objectif

Couvrir le système d'audit log (analyseur de diff, helpers, hooks simulés, gestion d'erreur) avec des tests Vitest automatisés et des scénarios de test manuel, sans modifier le code métier existant.

---

## 2. Périmètre

### Inclus dans ce ticket

- Vérification que tous les tests Vitest existants dans `tests/utils/audit-log.test.mjs` et `tests/utils/audit-diff.test.mjs` passent
- Ajout des tests manquants identifiés par rapport à la spec de l'issue #163
- Création d'un sous-répertoire `documentation/tests/manuel/audit-log/` avec un `README.md` de scénarios de test manuel dédiés à l'audit log
- Mise à jour de `tests/README.md` avec une ligne de référence vers les tests d'audit log
- Mise à jour de `documentation/tests/manuel/README.md` pour ajouter la famille "Audit Log" dans l'index

### Exclu de ce ticket

- Tests pour `onCreateItem` / `talent.purchase` — la fonction `onCreateItem` n'existe pas dans le code de `audit-log.mjs` (gap documenté, renvoi vers US4 ou implémentation future)
- Modification du code métier dans `module/utils/audit-log.mjs` ou `module/utils/audit-diff.mjs` — seuls les tests et la documentation sont modifiés
- Tests E2E Playwright pour l'audit log — non demandés dans l'issue
- Tests d'intégration avec une instance Foundry réelle
- Implémentation de nouvelles fonctionnalités d'audit log

---

## 3. Constat sur l'existant

### Tests Vitest déjà écrits et très complets

Deux fichiers de tests existent déjà et couvrent la quasi-totalité de la spec :

**`tests/utils/audit-log.test.mjs`** (718 lignes, ~35 tests)

| Groupe | Tests | Statut |
|--------|-------|--------|
| `isOnlyAuditChange` | 4 tests (true/false/vide/autres clés) | ✅ Complet |
| `cloneValue` | 3 tests (objets simples/nested/undefined) | ✅ Complet |
| `snapshotOldState` | 5 tests (chemins modifiés, clone défensif, chemins vides, deletion paths, chemins multiples) | ⚠️ Manque : chemin imbriqué profond |
| `isDeletionPath` | 2 tests | ✅ Complet |
| `pending queue` | 1 test FIFO | ✅ Complet |
| `writeLogEntries max size` | 6 tests (éviction, seuil non atteint, limite basse 100, setting dynamique, fallback 500, multi-entries) | ✅ Complet |
| `evictOldestIfNeeded` | 2 tests (overflow, under limit) | ✅ Complet |
| `onPreUpdateActor` | 4 tests (non-character, only audit, swerpg option, capture) | ✅ Complet |
| `onUpdateActor` | 4 tests (non-character, swerpg option, no pending, expired pending) | ✅ Complet |
| `writeLogEntries` | 3 tests (batch, empty, swerpgAuditLog option) | ✅ Complet |
| `registerAuditLogHooks` | 1 test (2 hooks registrés) | ✅ Complet |
| `handleWriteError` | 5 tests (logger.error, ui.warn, GM whisper, non-GM, chat failure catch) | ✅ Complet |
| `writeLogEntries retry` | 3 tests (retry success, retry exhausted, first attempt) | ✅ Complet |
| `pruneExpiredPending` | 2 tests (warning threshold) | ✅ Complet |

**`tests/utils/audit-diff.test.mjs`** (1311 lignes, ~30 tests)

| Groupe | Tests | Statut |
|--------|-------|--------|
| `captureSnapshot` | 2 tests (XP snapshot complet, progression manquante → zéros) | ✅ Complet |
| `makeEntry` | 4 tests (bien formé, Unknown fallback, -0 normalisation, shallow clone) | ✅ Complet |
| `cost helpers` | 5 tests (skill train career/non-career, forget, characteristic) | ✅ Complet |
| `reconstructPreviousValue` | 2 tests | ✅ Complet |
| `skill changes` | 5 tests (train career, train non-career, forget, unchanged → empty, isFree) | ✅ Complet |
| `characteristic changes` | 2 tests (increase, decrease → empty) | ✅ Complet |
| `XP changes` | 6 tests (spend, refund, grant, remove, unchanged, composite skill+XP) | ✅ Complet |
| `detail changes` | 5 tests (species.set, career.set, spec.add, spec.add existant, spec.remove) | ✅ Complet |
| `advancement changes` | 2 tests (level change, unchanged) | ✅ Complet |
| `composeEntries` | 4 tests (empty changes, non-system, unknown user, flat Foundry diff, analyse failure) | ✅ Complet |
| `inferIsCareer` | 3 tests (career skill, spec skill, non-career) | ✅ Complet |
| `getCareerSkillIds` | 1 test (collecte career + spec skills avec objets) | ✅ Complet |

### Tests manuels existants

Des tests manuels d'audit log sont déjà intégrés dans `documentation/tests/manuel/personnage/README.md` :
- Vérification d'entrée `characteristic.increase` (l.108)
- Vérification d'entrée `skill.train` (l.135)
- Vérification d'entrée `xp.grant` (l.201)
- Vérification des limites (l.259-261)

Cependant, il n'existe pas de fichier dédié `documentation/tests/manuel/audit-log/README.md`.

### Gap identifié : `onCreateItem` non implémenté

Le plan US1 (§5) et la spec de l'issue #163 mentionnent un hook `createItem` pour détecter les achats de talent. Ce hook n'est pas présent dans `module/utils/audit-log.mjs` — seuls `onPreUpdateActor` et `onUpdateActor` sont exportés et câblés via `registerAuditLogHooks()`. Les tests correspondants ne peuvent donc pas être écrits sans modifier le code métier. Ce gap est documenté et renvoie vers une implémentation future (US4 ou ticket dédié).

---

## 4. Décisions d'architecture

### 4.1. Aucune modification du code métier

**Décision** : Conforme à la règle inviolable de l'issue, aucun fichier dans `module/` n'est modifié. Les tests sont purement additifs et ne touchent que `tests/` et `documentation/tests/`.

Justification :
- L'audit log est déjà implémenté et opérationnel
- L'objectif est la couverture de test, pas l'évolution fonctionnelle
- Réduit le risque de régression

### 4.2. Nouveaux tests ajoutés dans les fichiers existants

**Décision** : Ajouter les tests manquants dans `tests/utils/audit-log.test.mjs` plutôt que de créer un nouveau fichier.

Justification :
- Cohérence : tous les tests du module `audit-log.mjs` sont déjà dans ce fichier
- Pas de fragmentation
- La spec de l'issue liste des tests qui s'ajoutent naturellement aux `describe` existants

### 4.3. Fichier de tests manuels dédié

**Décision** : Créer `documentation/tests/manuel/audit-log/README.md` avec des scénarios spécifiques, en extrayant et complétant les tests déjà présents dans `personnage/README.md`.

Justification :
- L'issue le demande explicitement
- L'audit log est un aspect transverse (touche skills, caracs, XP, talents, espèces)
- Un fichier dédié permet une couverture plus systématique
- Les tests `personnage/README.md` ne seront pas modifiés (ils référencent l'audit log comme point de vérification, pas comme objet de test principal)

### 4.4. Gap documenté pour `onCreateItem`

**Décision** : Les tests pour `onCreateItem` sont exclus du périmètre. Le gap est documenté dans ce plan et dans le README de tests manuels.

Justification :
- La fonction `onCreateItem` n'existe pas dans le code (seulement `onPreUpdateActor` et `onUpdateActor`)
- La règle "Aucune modification du code métier" interdit de l'ajouter dans ce ticket
- US4 (talents) prévoit l'instrumentation des achats de talent via `createItem`

---

## 5. Plan de travail détaillé

### Étape 1 : Vérifier que tous les tests existants passent

**Quoi** : Lancer `npx vitest run tests/utils/audit-log.test.mjs tests/utils/audit-diff.test.mjs` et analyser les résultats. Identifier les échecs.

Si des tests échouent, investiguer :
- Est-ce un problème de mock (mock-foundry qui a changé) ?
- Est-ce un problème de code métier (régression) ?
- Est-ce un problème de test lui-même (assertion incorrecte) ?

**Actions possibles** :
- Si le test est mal écrit : corriger le test
- Si le mock est obsolète : corriger le mock dans le test (pas dans le code métier)
- Si le code métier est en cause : ne pas modifier, documenter l'écart et reporter

**Fichiers** : `tests/utils/audit-log.test.mjs`, `tests/utils/audit-diff.test.mjs`
**Risque** : Découverte de bugs dans le code métier → ne pas corriger, documenter et reporter.

### Étape 2 : Ajouter les tests manquants dans `audit-log.test.mjs`

**Quoi** : Ajouter les tests spécifiques de la spec #163 qui ne sont pas encore couverts.

Tests à ajouter :

**snapshotOldState (chemin profond imbriqué)** :
```
test('captures deeply nested paths like system.skills.stealth.rank.trained')
  source = { system: { skills: { stealth: { rank: { base: 0, trained: 2, careerFree: 0, specializationFree: 0 } } } } }
  changes = { 'system.skills.stealth.rank.trained': 3 }
  → oldState doit contenir system.skills.stealth.rank avec trained = 2
```

Ce test manque dans le `describe('snapshotOldState')` existant. Le test actuel le plus proche est "extracts system paths from source matching changes" mais il utilise un chemin à 2 niveaux (`skills.Athletics.rank`), pas 3+.

**Fichiers** : `tests/utils/audit-log.test.mjs` (modification)
**Risque** : Faible — simple ajout de test.

### Étape 3 : Créer `documentation/tests/manuel/audit-log/README.md`

**Quoi** : Créer un fichier de tests manuels dédié à l'audit log, structuré comme les autres fichiers dans `documentation/tests/manuel/` (tableaux Action → Résultat attendu).

Contenu à couvrir :

1. **Prérequis** : Personnage character créé, au moins un MJ connecté
2. **1. Vérification de base** : accès à `flags.swerpg.logs` via console, structure d'une entrée
3. **2. Compétences** : achat (skill.train), revente (skill.forget), rang gratuit (isFree), achat carrière vs non-carrière
4. **3. Caractéristiques** : augmentation (characteristic.increase)
5. **4. XP** : dépense (xp.spend), gain (xp.grant), remboursement (xp.refund)
6. **5. Détails** : changement d'espèce (species.set), changement de carrière (career.set)
7. **6. Limite et éviction** : vérifier la taille max (500), comportement FIFO
8. **7. Résilience** : comportement en cas d'erreur d'écriture (simulation)
9. **8. Gap connu** : les achats de talent (talent.purchase) ne sont pas encore loggés — renvoi vers US4

Inspiration du format : `documentation/tests/manuel/talents/README.md`

**Fichiers** : `documentation/tests/manuel/audit-log/README.md` (création)
**Risque** : Faible.

### Étape 4 : Mettre à jour `tests/README.md`

**Quoi** : Ajouter une ligne dans la section "Structure du dossier `tests/`" (l.90-111) pour mentionner les fichiers d'audit log.

Ajout dans l'arborescence :
```
  utils/
    audit-log.test.mjs          # Tests du module d'audit log (hooks, écriture, résilience)
    audit-diff.test.mjs          # Tests de l'analyseur de diff (composeEntries, détecteurs)
```

**Fichiers** : `tests/README.md` (modification)
**Risque** : Faible — simple mise à jour documentaire.

### Étape 5 : Mettre à jour `documentation/tests/manuel/README.md`

**Quoi** : Ajouter une ligne dans le tableau des familles de test pour l'audit log, et mettre à jour les compteurs.

Ajout dans le tableau :
```
| [Audit Log](audit-log/README.md) | Hooks, entrées, résilience, éviction FIFO | ~12 scénarios |
```

Mettre à jour "Total scénarios documentés" (12 de plus).

**Fichiers** : `documentation/tests/manuel/README.md` (modification)
**Risque** : Faible.

### Étape 6 : Vérification finale

**Quoi** :
- Lancer tous les tests audit-log et audit-diff : `npx vitest run tests/utils/audit-log.test.mjs tests/utils/audit-diff.test.mjs`
- Vérifier que le coverage est satisfaisant sur les chemins critiques (analyseur de diff, écriture, résilience)
- Vérifier la cohérence de la documentation (liens, format des tableaux)
- Vérifier que `documentation/tests/manuel/README.md` référence bien le nouveau dossier

**Fichiers** : Aucune modification
**Risque** : Si les tests échouent, revenir à l'étape 1.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---------|--------|-------------|
| `tests/utils/audit-log.test.mjs` | Modification | Ajout du test manquant `snapshotOldState` pour chemin profond imbriqué |
| `documentation/tests/manuel/audit-log/README.md` | Création | Tests manuels dédiés à l'audit log (~12 scénarios) |
| `tests/README.md` | Modification | Ajout des lignes pour les fichiers d'audit log dans l'arborescence |
| `documentation/tests/manuel/README.md` | Modification | Ajout de la famille "Audit Log" dans l'index |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Tests existants qui échouent** (mock obsolète, régression code métier) | Bloquant pour l'étape 1 | Debug du test ou du mock (pas du code métier). Si régression code métier, documenter et reporter. |
| **`onCreateItem` gap non documenté** | Confusion pour le développeur suivant | Documenter explicitement dans ce plan §4.4 et dans le README de tests manuels |
| **Tests manuels redondants** avec `personnage/README.md` | Duplication, désynchronisation possible | Référencer les tests existants plutôt que de copier |
| **Oubli de mise à jour de l'index** | Lien mort dans `documentation/tests/manuel/README.md` | Vérification finale incluse dans l'étape 6 |

---

## 8. Proposition d'ordre de commit

1. `test(audit-log): add snapshotOldState test for deeply nested paths` — ajout du test manquant
2. `docs(tests): create manual test scenarios for audit log` — création du README de tests manuels
3. `docs(tests): update tests README with audit log references` — mise à jour des index de documentation
4. `test(audit-log): verify all tests pass` — validation finale

---

## 9. Dépendances avec les autres US

```
US1 (infrastructure audit log) — déjà implémentée
  └── #163 (ce ticket) — tests et documentation
        └── US4 (talents) — devra implémenter onCreateItem + ses tests
```

**Gap connu** : Les tests pour `talent.purchase` (via `createItem`) ne peuvent pas être écrits car le hook `onCreateItem` n'est pas encore implémenté dans `module/utils/audit-log.mjs`. Ce gap sera résolu par US4 ou par un ticket dédié qui :
1. Ajoutera `onCreateItem` dans `audit-log.mjs`
2. Câblera `Hooks.on('createItem', auditLog.onCreateItem)` dans `registerAuditLogHooks()`
3. Ajoutera les tests Vitest correspondants dans `audit-log.test.mjs`
