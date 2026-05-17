# Spécification — Commande OpenCode de test et diagnostic d'échec

**Issue** : [#270 — OpenCode - Cadrer un workflow de tests et d'analyse d'echec avant modification](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/270)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 20)

---

## 1. Objectif

Cette spécification décrit la future commande OpenCode de test et diagnostic d'échec. Elle formalise le contrat d'entrée, le contrat d'exécution, le contrat de sortie et la matrice d'escalade, sans présumer de l'emplacement exact de stockage des commandes dans le dépôt (à définir dans un ticket d'alignement technique).

La commande exécute des vérifications mécaniques (tests, lint, format, scripts projet) et produit un diagnostic ciblé en cas d'échec, sans jamais corriger automatiquement ni modifier le code source.

---

## 2. Contrat d'entrée

### 2.1. Types de demandes éligibles

La commande est déclenchée pour les intentions suivantes :

- **Exécuter des tests** : « Lance les tests », « Exécute `pnpm test` », « Fais passer les tests du dossier `tests/documents/` »
- **Vérifier le format** : « Vérifie le format Prettier », « Lance `pnpm fmt:check` »
- **Lancer le lint** : « Vérifie le lint ESLint », « Lance ESLint sur le module X »
- **Exécuter un script projet** : « Lance la validation de migration du logging », « Exécute `validate-logging-migration` »
- **Analyser un échec** : « Les tests échouent, peux-tu analyser pourquoi ? », « Diagnostique cet échec de test »
- **Vérification complète** : « Fais une vérification complète du projet », « Lance `check all` »

### 2.2. Types de demandes exclues

La commande refuse ou redirige les demandes suivantes :

- **Explorer** : « Où est définie la fonction X ? » → escalade vers le workflow d'exploration `#268`
- **Planifier** : « Fais un plan pour ajouter la fonctionnalité Y » → escalade vers `plan-depuis-issue`
- **Corriger** : « Corrige le bug dans Z » → escalade vers diagnostic / correction
- **Implémenter** : « Ajoute la fonction X dans le fichier Y » → escalade vers `implementer-depuis-plan`
- **Écrire des tests** : « Ajoute des tests pour le module X » → implémentation dédiée

### 2.3. Entrées acceptées

| Type d'entrée | Format | Exemple |
|---|---|---|
| Sous-commande explicite | `check <sous-commande>` | `check tests` |
| Sous-commande + filtre | `check <sous-commande> <filtre>` | `check tests tests/documents/` |
| Profondeur de diagnostic | `check --diagnose` ou `check --fix` | `check tests --diagnose` |
| Demande textuelle | Phrase libre | « Lance les tests du dossier importer » |
| Résultat précédent | Sortie d'une commande + demande d'analyse | Sortie de `pnpm test` + « Analyse cet échec » |

### 2.4. Profondeur de diagnostic

| Mode | Usage typique | Phases activées |
|---|---|---|
| `check` (défaut) | Vérification rapide, résultat binaire | Phase 1 uniquement |
| `check --diagnose` | Exécution + analyse en cas d'échec | Phase 1 + Phase 2 |
| `check --fix` | Exécution + analyse + proposition de correction (attente validation) | Phase 1 + Phase 2 + Phase 3 (validation requise) |

---

## 3. Contrat d'exécution

### 3.1. Phase 1 — Exécution mécanique

**Agent** : exécution script, pas de modèle ou modèle économique.

**Outils autorisés** :
- Commande shell pour lancer la vérification (bash)
- Lecture du statut de sortie et de la sortie standard/erreur

**Interdits** :
- Modification de code
- Analyse ou interprétation du résultat
- Lancement de vérifications supplémentaires non demandées

**Sortie produite** :
```
Commande exécutée : <commande exacte>
Statut : <succès/échec>
Durée : <secondes>
Fichiers testés : <nombre> (si applicable)
Tests passés : <nombre> (si applicable)
Tests échoués : <nombre> (si applicable)
Sortie complète : <référence vers fichier temporaire si longue>
```

### 3.2. Phase 2 — Diagnostic

**Déclenchement** : seulement si la phase 1 échoue et si l'utilisateur le demande (mode `--diagnose` ou `--fix`).

**Agent** : général / diagnostic, modèle intermédiaire ou de raisonnement selon complexité.

**Outils autorisés** :
- Recherche de fichiers (glob)
- Recherche textuelle (grep, regex)
- Lecture de fichiers (read, avec offset/limit)
- Extraction de logs à partir de la sortie de la phase 1

**Interdits** :
- Édition ou écriture de fichiers
- Modification de code
- Lancement de nouvelles vérifications
- Correction même partielle

**Sortie produite** :
```
Périmètre analysé : <fichiers/modules concernés>
Cause probable : <hypothèse>
Fichiers incriminés : <liste>
Extrait pertinent : <code/log extrait>
Suggestion de correction : <description courte>
Complexité estimée : <faible/moyenne/élevée>
Modèle recommandé pour la correction : <type>
```

### 3.3. Phase 3 — Correction

**Déclenchement** : seulement sur instruction explicite de l'utilisateur après réception du diagnostic.

**Agent** : implémentation.

**Détail** : non spécifié dans ce document. Renvoi vers `implementer-depuis-plan` ou workflow de correction dédié.

---

## 4. Contrat de sortie

### 4.1. Format par défaut (mode `check`)

```
## Résultat

Vérification : <sous-commande>
Statut : ✅ SUCCÈS / ❌ ÉCHEC
Durée : <secondes>

### Détails
- Commande : <commande exécutée>
- Fichiers testés : <nombre>
- Tests passés : <nombre>
- Tests échoués : <nombre>
```

### 4.2. Format avec diagnostic (mode `--diagnose` ou `--fix`)

```
## Résultat

Vérification : <sous-commande>
Statut : ❌ ÉCHEC
Durée : <secondes>

### Détails d'exécution
- Commande : <commande exécutée>
- Fichiers testés : <nombre>
- Tests passés : <nombre>
- Tests échoués : <nombre>

### Diagnostic
- Périmètre analysé : <fichiers/modules>
- Cause probable : <hypothèse>
- Fichiers incriminés : <liste>
- Extrait pertinent :
```
<code ou log>
```
- Suggestion de correction : <description>
- Complexité estimée : <faible/moyenne/élevée>

### Suite recommandée
- Corriger : demande une implémentation de correction
- Ignorer : l'échec est acceptable ou connu
- Reporter : créer une issue pour investigation ultérieure
```

### 4.3. Règles de sobriété

- La sortie complète de la phase 1 n'est pas envoyée au modèle si elle dépasse 50 lignes.
- Seuls le statut, le message d'erreur principal et les fichiers incriminés sont transmis au diagnostic.
- Le diagnostic ne contient pas de code correctif exécutable, seulement une description textuelle.
- Pas de transition automatique vers la phase 3.

---

## 5. Sous-commandes détaillées

### 5.1. `check tests` — Tests unitaires Vitest

| Propriété | Valeur |
|---|---|
| Commande par défaut | `pnpm test` |
| Commande avec filtre | `pnpm vitest run <filtre>` |
| Commande coverage | `pnpm test:coverage` |
| Configuration | `vitest.config.mjs` (défaut) ou `vitest.config.js` (coverage) |
| Filtres acceptés | Chemin de dossier, chemin de fichier, pattern grep |

### 5.2. `check e2e` — Tests E2E Playwright

| Propriété | Valeur |
|---|---|
| Commande par défaut | `pnpm e2e` |
| Variante headed | `pnpm e2e:headed` |
| Variante CI | `pnpm e2e:ci` |
| Variante UI | `pnpm e2e:ui` |
| Configuration | `playwright.config.ts` |

### 5.3. `check lint` — Lint ESLint

| Propriété | Valeur |
|---|---|
| Commande | `pnpm exec eslint <cibles>` |
| Cible par défaut | `module/ tests/ scripts/` |
| Note | Aucun script `lint` n'existe dans `package.json` à ce stade ; la commande documente l'appel direct |

### 5.4. `check format` — Format Prettier

| Propriété | Valeur |
|---|---|
| Commande | `pnpm fmt:check` |
| Note | Vérification uniquement, pas de correction automatique |

### 5.5. `check script <nom>` — Scripts projet

| Propriété | Valeur |
|---|---|
| Commande | `bash scripts/<nom>.sh` |
| Scripts connus | `validate-logging-migration`, `e2e-foundry-start` |
| Note | Le nom du script est passé sans l'extension `.sh` |

### 5.6. `check all` — Vérification complète

Exécute séquentiellement : `check tests`, `check lint`, `check format`.

---

## 6. Garde-fous

### 6.1. Règles impératives

1. **Exécuter ≠ Analyser ≠ Corriger** — Chaque phase est une étape distincte avec des permissions différentes.
2. **Pas de correction automatique** — Même si la correction est évidente, le workflow attend une instruction explicite.
3. **Pas d'élargissement du scope** — La vérification se limite à ce qui a été demandé.
4. **Pas de modification de code pendant le diagnostic** — Le diagnostic est lecture seule.
5. **Pas de reformulation du besoin** — Une demande de test ne devient pas une demande d'implémentation.
6. **Volume réduit pour le diagnostic** — Seuls les éléments pertinents (statut, erreur, fichiers) sont transmis au modèle.

### 6.2. Cas nécessitant une question à l'utilisateur

Le workflow doit poser une question à l'utilisateur dans les cas suivants :

- Le filtre de tests est ambigu (plusieurs interprétations possibles).
- L'échec est massif (>50% des tests).
- L'échec semble lié à l'infrastructure de test (mock, setup) plutôt qu'au code métier.
- La cause de l'échec est incertaine et plusieurs hypothèses coexistent.
- La vérification demandée n'existe pas (sous-commande inconnue).

---

## 7. Matrice d'escalade

| Condition d'escalade | Destination | Déclenchement |
|---|---|---|
| La demande nécessite une exploration préalable | Workflow d'exploration `#268` | L'utilisateur demande à comprendre avant de vérifier |
| La demande nécessite une planification | `plan-depuis-issue` | Le diagnostic révèle un problème d'architecture |
| La demande nécessite une implémentation | `implementer-depuis-plan` | L'utilisateur demande du code après le diagnostic |
| La demande nécessite une correction de bug | Diagnostic / Correction | L'utilisateur signale un comportement inattendu |
| Aucune des conditions ci-dessus | Fin | La vérification a répondu au besoin |

L'escalade n'est jamais automatique. Le workflow signale la recommandation et attend une instruction explicite.

---

## 8. Articulation avec les workflows voisins

```
Exploration (#268) → Planification (#269) → Implémentation → Tests/Diagnostic (ce workflow) → Correction (séparée)
```

- L'exploration livre des constats. Si elle détecte un besoin de vérification, elle oriente vers cette commande.
- La planification peut recommander une validation par les tests après implémentation.
- L'implémentation (`implementer-depuis-plan`) doit pouvoir déclencher une vérification post-implémentation.
- La correction est une étape séparée qui suit le diagnostic.

Chaque transition est explicite et nécessite une instruction utilisateur.

---

## 9. Emplacement futur

La commande sera matérialisée dans l'emplacement défini par le futur ticket d'alignement des commandes OpenCode. Les candidats possibles sont :

- `.opencode/commands/check.mjs` (si le dépôt adopte `.opencode/`)
- `docs/agents/check-command.md` (si le dépôt privilégie une approche documentaire)
- tout autre emplacement validé par la configuration OpenCode projet

Cette spécification sert de source de vérité fonctionnelle, indépendante de l'emplacement technique final.
