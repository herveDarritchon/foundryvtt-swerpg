# Suite E2E Documentation

Ce dossier contient la suite Playwright dédiée à la validation documentaire de Swerpg.

---

## Rôle et périmètre

La suite `e2e:documentation` produit des captures d'écran et valide les invariants visibles
(i18n, placeholders, absence d'erreurs navigateur) sur les parcours documentaires de l'application.

**Ce que couvre cette suite :**

- parcours et pages documentables (feuilles d'acteur, compendium, interfaces clés) ;
- captures d'écran reproductibles pour la documentation utilisateur ;
- invariants visibles : absence de placeholder cassé (`undefined`, `null`, clé brute `SWERPG.*`) ;
- absence d'erreurs `console.error` ou `pageerror` inattendues dans les zones documentées.

**Frontière avec les autres suites :**

| Critère | `documentation` | `regression` | `smoke` |
|---|---|---|---|
| Objectif | Captures documentaires, invariants visibles | Validation fonctionnelle pré-livraison | Santé de surface post-déploiement |
| Mutations | Lecture seule par défaut (prérequis contrôlés acceptés si documentés) | Autorisées | Interdites |
| Instance cible | Port 30000 (production ou dédiée stable) | Port 31001 (dédiée, monde jetable) | Port 30000 (production) |
| Exécution | Manuelle | Manuelle | Manuelle |
| CI | Non | Non | Non |

**Décision : lecture seule par défaut**

Les specs documentation sont en lecture seule. Si une spec a besoin de créer un état stable
pour une capture (ex. personnage pré-configuré), elle doit :

1. déclarer explicitement ce prérequis dans sa description ;
2. assurer son propre cleanup après les assertions ;
3. utiliser un nom d'artefact horodaté unique (`<Prefixe>-${Date.now()}`).

---

## Commandes

```bash
# Suite documentation headless
pnpm e2e:documentation

# Suite documentation avec navigateur visible
pnpm e2e:documentation:headed

# Suite documentation en mode UI interactif (debug)
pnpm e2e:documentation:ui
```

---

## Configuration

Fichier d'environnement : `.env.e2e.documentation`

```bash
cp .env.e2e.documentation.example .env.e2e.documentation
# Remplir les valeurs (URL, mot de passe admin, monde cible)
```

Variables requises :

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `E2E_FOUNDRY_BASE_URL` | URL de l'instance Foundry | `http://localhost:30000` |
| `E2E_FOUNDRY_ADMIN_PASSWORD` | Mot de passe administrateur | — (requis) |
| `E2E_FOUNDRY_USERNAME` | Nom du compte | `Gamemaster` |
| `E2E_FOUNDRY_PASSWORD` | Mot de passe du compte | — (vide si non requis) |
| `E2E_FOUNDRY_WORLD` | Monde stable cible | `test-v14-309` |

---

## Artefacts produits

Le report HTML est généré systématiquement dans `playwright-documentation-report/`.

```bash
pnpm exec playwright show-report playwright-documentation-report
```

Les captures d'écran sont conservées dans le report HTML.
Les traces sont activées sur tous les runs (pas seulement en échec) pour permettre
l'inspection complète des états documentaires capturés.

---

## Structure du dossier

```
e2e/documentation/
  specs/               # Specs documentation — un fichier par domaine documenté
  utils/               # Helpers spécifiques à la suite documentation
  fixtures.ts          # Fixture documentationReady — navigation sans mutation par défaut
  global-setup.ts      # Vérification de connectivité avant les specs
  README.md
```

---

## Écrire une nouvelle spec documentation

1. Créer le fichier dans `e2e/documentation/specs/`.
2. Importer la fixture : `import { test, expect } from '../fixtures'`
3. Brancher `documentationReady` : `async ({ page, documentationReady }) => { ... }`
4. Utiliser les helpers communs (`foundryUI.ts`, `foundrySession.ts`) pour la navigation.
5. Prendre des captures avec `await page.screenshot({ path: '...', fullPage: true })` si nécessaire.
6. Vérifier les invariants visibles : i18n, absence de placeholder cassé, absence d'erreur console.

### Checklist pour toute nouvelle spec documentation

- [ ] Importer depuis `../fixtures` (fixture `documentationReady`)
- [ ] Pas de listener ad hoc `page.on('console')` ou `page.on('pageerror')` — la fixture s'en charge
- [ ] Interactions via helpers de `e2e/utils/foundryUI.ts` et `e2e/utils/foundrySession.ts`
- [ ] `ensureSessionActive` avant toute séquence longue
- [ ] Pas de `waitForTimeout` — utiliser des assertions web-first
- [ ] Si un prérequis contrôlé est créé : nom horodaté, cleanup explicite, mention dans la description
- [ ] Pas de `click({ force: true })` sans justification écrite

---

## Prérequis

1. Instance Foundry accessible sur le port configuré dans `E2E_FOUNDRY_BASE_URL`
2. Fichier `.env.e2e.documentation` configuré
3. Monde stable dans un état représentatif des captures attendues
