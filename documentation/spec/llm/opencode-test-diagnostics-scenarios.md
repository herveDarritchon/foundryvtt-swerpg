# Scénarios de validation — Commande OpenCode de test et diagnostic d'échec

**Issue** : [#270 — OpenCode - Cadrer un workflow de tests et d'analyse d'echec avant modification](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/270)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 20)
**Spécification** : `documentation/spec/llm/opencode-test-diagnostics-command.md`

---

## Scénario 1 — Exécution simple de tous les tests (succès)

**Entrée** : « Lance tous les tests Vitest. »

**Comportement attendu** :
- Exécution de `pnpm test`.
- Capture du statut, du nombre de fichiers testés, tests passés/échoués.
- Production du contrat de sortie Phase 1 sans déclencher de diagnostic.

**Format de sortie attendu** :
```
## Résultat

Vérification : tests
Statut : ✅ SUCCÈS
Durée : <secondes>

### Détails
- Commande : pnpm test
- Fichiers testés : 80+
- Tests passés : 1500+
- Tests échoués : 0
```

**Critère d'acceptation** : le résultat est produit sans analyse ni diagnostic. Aucun fichier n'est modifié.

---

## Scénario 2 — Exécution simple de tous les tests (échec)

**Entrée** : « Lance tous les tests Vitest. »

**Comportement attendu** :
- Exécution de `pnpm test`.
- Capture du statut d'échec, du nombre de tests échoués, des fichiers incriminés.
- Production du contrat de sortie Phase 1 avec statut échec.
- Pas de diagnostic automatique (mode `check` par défaut).

**Format de sortie attendu** :
```
## Résultat

Vérification : tests
Statut : ❌ ÉCHEC
Durée : <secondes>

### Détails
- Commande : pnpm test
- Fichiers testés : 80+
- Tests passés : 1495
- Tests échoués : 5
```

**Critère d'acceptation** : l'échec est signalé sans analyse automatique. L'utilisateur peut demander un diagnostic en mode `--diagnose`.

---

## Scénario 3 — Exécution filtrée avec diagnostic

**Entrée** : « Lance les tests du dossier `tests/documents/` avec diagnostic. »

**Comportement attendu** :
- Exécution de `pnpm vitest run tests/documents/`.
- En cas d'échec, déclenchement automatique de la phase 2 (mode `--diagnose`).
- Analyse de la sortie d'erreur : extraction des fichiers en échec, message d'assertion, ligne concernée.
- Production du diagnostic avec hypothèse de cause et suggestion de correction.

**Format de sortie attendu** :
```
## Résultat

Vérification : tests (tests/documents/)
Statut : ❌ ÉCHEC
Durée : <secondes>

### Détails d'exécution
- Commande : pnpm vitest run tests/documents/
- Fichiers testés : 12
- Tests passés : 45
- Tests échoués : 2

### Diagnostic
- Périmètre analysé : tests/documents/actor-creation.test.mjs
- Cause probable : une assertion attend une valeur différente après un changement de modèle
- Fichiers incriminés : tests/documents/actor-creation.test.mjs:142
- Extrait pertinent :
  Expected: 3
  Received: 2
- Suggestion de correction : mettre à jour la valeur attendue dans le test ou corriger le calcul dans le modèle
- Complexité estimée : faible

### Suite recommandée
- Corriger : demande une implémentation de correction
- Ignorer : l'échec est acceptable ou connu
- Reporter : créer une issue pour investigation ultérieure
```

**Critère d'acceptation** : le diagnostic est produit avec les fichiers, lignes et cause probable. Aucune correction n'est appliquée.

---

## Scénario 4 — Lint ESLint avec et sans erreurs

**Entrée** : « Vérifie le lint sur `module/` et `tests/`. »

**Comportement attendu** :
- Exécution de `pnpm exec eslint module/ tests/`.
- Capture du statut et du nombre d'erreurs/warnings.
- En cas d'erreur en mode `--diagnose`, extraction des fichiers incriminés et des règles violées.

**Critère d'acceptation** : la commande distingue les erreurs des warnings. Le diagnostic liste les fichiers et les règles ESLint concernées.

---

## Scénario 5 — Vérification de format Prettier

**Entrée** : « Vérifie le format Prettier. »

**Comportement attendu** :
- Exécution de `pnpm fmt:check`.
- Signalement des fichiers non formatés sans appliquer de correction.

**Critère d'acceptation** : aucun fichier n'est modifié. Les fichiers non conformes sont listés sans correction.

---

## Scénario 6 — Échec de test avec diagnostic complexe (régression)

**Entrée** : « Lance les tests d'import OggDude avec diagnostic. »

**Comportement attendu** :
- Exécution de `pnpm vitest run tests/importer/`.
- En cas d'échec, analyse de la cause : régression après modification du mapper, mock obsolète, fixture manquante.
- Diagnostic incluant l'hypothèse de régression, les fichiers modifiés récemment (diff), et le fichier de test concerné.

**Critère d'acceptation** : le diagnostic mentionne la cause probable de régression en reliant l'échec aux modifications récentes.

---

## Scénario 7 — Demande ambiguë (pas de précision sur le type de vérification)

**Entrée** : « Vérifie que tout va bien. »

**Comportement attendu** :
- Détection que la demande est ambiguë (pas de sous-commande explicite).
- Question à l'utilisateur pour préciser le type de vérification souhaitée.
- Proposition des options disponibles : tests, lint, format, script, ou tout.

**Critère d'acceptation** : le workflow pose une question au lieu de tout exécuter par défaut.

---

## Scénario 8 — Refus correct de corriger automatiquement

**Entrée** : « Lance les tests et corrige les échecs. »

**Comportement attendu** :
- Exécution des tests (phase 1).
- En cas d'échec, production du diagnostic (phase 2).
- Refus explicite de corriger automatiquement.
- Proposition d'escalade vers `implementer-depuis-plan` ou workflow de correction.

**Format de sortie attendu** :
```
### Suite recommandée
- Corriger : demande une implémentation de correction via `implementer-depuis-plan`
- Ignorer : l'échec est acceptable ou connu
- Reporter : créer une issue pour investigation ultérieure
```

**Critère d'acceptation** : aucune correction n'est appliquée. L'escalade est clairement proposée.

---

## Scénario 9 — Escalade correcte vers implémentation ou planification

**Entrée** : Diagnostic d'un échec révélant un problème d'architecture + « Corrige le problème. »

**Comportement attendu** :
- Le diagnostic a déjà été produit.
- Détection que la correction dépasse le périmètre du workflow de tests.
- Proposition d'escalade vers planification (si le problème est architectural) ou vers implémentation (si la correction est localisée).

**Critère d'acceptation** : la correction n'est pas tentée dans ce workflow. L'escalade est claire et argumentée.

---

## Scénario 10 — Exécution E2E simple

**Entrée** : « Lance les tests E2E Chromium. »

**Comportement attendu** :
- Exécution de `pnpm e2e -- --project=chromium`.
- Capture du statut (succès/échec), du nombre de tests et de la durée.
- Pas de diagnostic automatique sauf mode `--diagnose`.

**Critère d'acceptation** : la commande E2E est exécutée avec le bon project. Résultat binaire.

---

## Scénario 11 — Exécution d'un script projet (validate-logging-migration)

**Entrée** : « Exécute la validation de migration du logging. »

**Comportement attendu** :
- Exécution de `bash scripts/validate-logging-migration.sh`.
- Capture du statut (succès/échec) et du message principal (PASS/FAIL pour chaque vérification).
- En mode `--diagnose` et en cas d'échec, extraction des fichiers contenant des appels `console.xxx`.

**Critère d'acceptation** : le script projet est exécuté avec les bons paramètres. Le résultat est interprété correctement.

---

## Scénario 12 — Sous-commande inconnue

**Entrée** : « Lance `check toto`. »

**Comportement attendu** :
- Détection que `toto` n'est pas une sous-commande valide.
- Question à l'utilisateur pour préciser la vérification souhaitée.
- Liste des sous-commandes disponibles : tests, e2e, lint, format, script, all.

**Critère d'acceptation** : le workflow ne tente pas d'exécuter une commande inconnue. Il demande une clarification.

---

## Résumé des cas couverts

| # | Type | Périmètre |
|---|---|---|
| 1 | Exécution tests (succès) | Workflow nominal — succès |
| 2 | Exécution tests (échec sans diagnostic) | Phase 1 uniquement |
| 3 | Exécution filtrée avec diagnostic | Phase 1 + Phase 2 |
| 4 | Lint ESLint | Sous-commande lint |
| 5 | Format Prettier | Sous-commande format |
| 6 | Diagnostic complexe (régression) | Diagnostic avancé |
| 7 | Demande ambiguë | Question à l'utilisateur |
| 8 | Refus de corriger automatiquement | Garde-fou anti-dérive |
| 9 | Escalade vers implémentation/planification | Routage |
| 10 | E2E Playwright | Sous-commande e2e |
| 11 | Script projet | Sous-commande script |
| 12 | Sous-commande inconnue | Gestion d'erreur |
