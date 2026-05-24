# Plan d'implémentation — Issue #369

**Issue** : [#369 — PWE3 - [Tier 1 Regression] Spec regression : création personnage et ouverture de fiche](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/369)

**Domaine métier** : `tests/e2e`

**Dépendances** : #366, #367, #368 (contrats interaction + capture erreurs navigateur)

## 1. Constat

La spec Tier 1 qui devait couvrir `création personnage → ouverture de fiche` n'existe pas encore comme spec dédiée.
Les seules regression specs présentes sont `01-smoke.spec.ts` (sidebar, onglets) et `02-oggdude-import.spec.ts`.
Aucun helper partagé d'interaction acteur n'existe dans `e2e/utils/foundryUI.ts` (settings uniquement) ou `e2e/utils/foundrySession.ts` (session uniquement).

## 2. Fichiers ciblés

| Fichier | Action |
|---------|--------|
| `e2e/regression/specs/03-character-creation.spec.ts` | **Créer** — nouvelle spec Tier 1 |
| `e2e/utils/foundryUI.ts` | **Étendre** — ajouter helpers `openActorsTab()`, `createActor(name, type)` |
| `e2e/utils/browserErrors.ts` | **Aucun changement** — déjà fonctionnel, utilisé via la fixture |
| `e2e/fixtures/index.ts` | **Aucun changement** — `worldReady` + `createBrowserErrorCollector` déjà branchés |

## 3. Plan de travail

### Étape 1 — Ajouter les helpers d'interaction acteur dans `foundryUI.ts`

**But** : factoriser la création d'acteur et l'ouverture de fiche pour toutes les specs.

- `openActorsTab(page)` : clic sur l'onglet Actors, attente section `#actors` visible.
- `createActor(page, name, type)` : bouton "Create Actor", sélection du type (Personnage), remplissage nom, validation.

**Signature** (approximative) :

```ts
export async function openActorsTab(page: Page): Promise<void>
export async function createActor(page: Page, name: string, type: string): Promise<string> /* actorId */
```

### Étape 2 — Créer la spec Tier 1 `03-character-creation.spec.ts`

**Répertoire** : `e2e/regression/specs/`

**Scénario** :
1. Fixture `worldReady` (auto) → page en `/game`.
2. Ouvrir l'onglet Actors.
3. Créer un personnage (nom unique, type personnage).
4. Vérifier que la fiche s'ouvre (élément visible, titre correct).
5. Vérifier qu'aucune erreur navigateur n'est survenue (via `errorCollector` déjà dans la fixture).

**Assertions clés** :
- Acteur créé visible dans la directory Actors.
- Fiche ouverte (fenêtre de sheet avec le bon titre).
- `assertNoErrors('création personnage')` en fin de scénario.

### Étape 3 — Exécuter et valider

- `pnpm e2e` ou `pnpm e2e:headed` sur la spec ciblée.
- Vérifier que le test passe en local (port 31001) sans erreur navigateur.
- Vérifier que les tests existants (`01-smoke`, `02-oggdude-import`) ne régressent pas.

## 4. Résultat attendu

Une spec Tier 1 stable, déterministe et diagnostiquable pour le parcours
`connexion → onglet Actors → création personnage → ouverture fiche → zéro erreur navigateur`,
réutilisant les helpers partagés et le contrat d'erreur déjà établi par PWE1/PWE2.
