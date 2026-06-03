# Plan d'implementation — E2E OggDude world import avec fixtures mutualisées

**Domaine metier** : `tests/e2e/oggdude-import/world`
**Issue liee** : #588
**Source de cadrage** : `589-impl-world-import-e2e-oggdude-avec-fixtures-mutualisees.md` (present document)
**Pre-requis** : PR #589 mergee (separation world/compendium existante)

---

## 1. Objectif

Enrichir la regression E2E OggDude pour qu'elle prouve un **veritable import world**
d'items dans `game.items`, avec un cleanup strict des items monde avant chaque
run, en mutualisant le code commun entre les specs `world` et `compendium`
via une fixture dediee et des helpers de haut niveau.

Contrat cle : le test **ne doit pas interagir** avec la case `Import to Compendium`
en mode world — seul le mode compendium la coche.

---

## 2. Decisions verrouillees

- le test `world` importe dans `game.items`, jamais dans les packs
- le test `world` ne coche ni ne decoche la case `Import to Compendium`
- la case `Import to Compendium` est decochee par defaut a l'ouverture du dialog
- tous les `game.items` sont supprimes `beforeEach` du test `world` et `compendium`
- les packs OggDude ne sont supprimes que dans le cleanup du test `compendium`
- les items importes restent presents a la fin du test `world` (pas d'`afterEach`)
- le trio de sentinelles est verrouille :
  - `Holdout Blaster` (`weapon`)
  - `Armored Clothing` (`armor`)
  - `Bothan` (`species`)
- le chemin ZIP est centralise dans la fixture, pas duplique dans les specs
- la source de verite des packs OggDude pour le cleanup cible est
  `module/utils/oggdude-mapping-config.mjs`

---

## 3. Perimetre

### Inclus

- creation d'une fixture OggDude dediee `e2e/regression/fixtures/oggdude.ts`
- mutualisation du flux d'import commun par helper de haut niveau
- cleanup parametrique : items monde pour le test `world`, items + packs cibles
  pour le test `compendium`
- contrat semantique `importMode: 'world' | 'compendium'` pour remplacer le booleen
  `toCompendium`
- recentrage de la spec `world` sur ce nouveau contrat
- alignement de la spec `compendium` sur la meme fixture
- correction du chemin ZIP par defaut de `e2e/fixtures/` vers `resources/`

### Exclu

- ajout de nouvelles sentinelles ou de nouvelles categories OggDude
- modification du runtime applicatif OggDude (`module/utils/oggdude-*.mjs`)
- extension de couverture a d'autres flux que `weapon`, `armor`, `species`
- refonte generale de l'architecture des fixtures E2E hors OggDude

---

## 4. Etapes

### Etape 1 — Rendre le cleanup parametrique

**Fichier** : `e2e/regression/utils/oggdude-cleanup.ts`

**But** : le cleanup actuel supprime tous les packs world, ce qui est trop large
pour le test `world` qui n'a besoin que de vider `game.items`.

**Actions** :

- ajouter un parametre `options` a `runOggDudePreImportCleanup` :
  ```ts
  interface OggDudeCleanupOptions {
    cleanPacks?: boolean // supprimer aussi les packs OggDude (defaut: false)
  }
  ```
- quand `cleanPacks: true`, supprimer uniquement les packs dont le `metadata.name`
  est dans la liste fournie par `module/utils/oggdude-mapping-config.mjs` :
  `['swerpg-weapons', 'swerpg-armors', 'swerpg-species', 'swerpg-gears', 'swerpg-talents', …]`
- quand `cleanPacks: false` (mode `world`), ne supprimer que les `game.items`,
  laisser les packs intacts
- conserver le contrat de retour (`OggDudeCleanupSummary`) en ajoutant le champ
  `packsTargeted` au besoin

### Etape 2 — Remplacer `toCompendium` par `importMode`

**Fichier** : `e2e/regression/utils/oggdude-importer.ts`

**But** : le booleen `toCompendium` ne reflete pas le contrat "ne pas toucher la case"
en mode world. Un mode semantique est plus explicite.

**Actions** :

- ajouter le type :
  ```ts
  type ImportMode = 'world' | 'compendium'
  ```
- remplacer `toCompendium?: boolean` par `importMode?: ImportMode` dans
  `OggDudeImportOptions`
- dans `uploadOggDudeZip` :
  - si `importMode === 'world'` : ne pas interagir avec la checkbox, juste
    verifier qu'elle est deja decochee via une assertion rapide
  - si `importMode === 'compendium'` : cocher la checkbox
- mettre a jour le helper pour exposer aussi une fonction
  `verifyImportCheckboxState(page, mode)` qui verifie l'etat attendu sans
  le modifier

### Etape 3 — Creer la fixture OggDude dediee

**Fichier** : `e2e/regression/fixtures/oggdude.ts`

**But** : mutualiser le flux complet d'import OggDude entre les specs `world`
et `compendium` pour eliminer la duplication des etapes d'ouverture, upload,
attente, fermeture.

**Actions** :

- creer une fixture `oggdudeReady` qui compose `worldReady` (de
  `e2e/fixtures/index.ts`) et y ajoute :
  - la resolution du chemin ZIP (`process.env.E2E_OGGDUDE_ZIP_PATH ??
path.resolve(process.cwd(), 'resources/oggdude-data.zip')`)
  - le cleanup parametrique en `beforeEach`
  - le timeout commun eventuellement
- exposer un contexte d'import typé pour les specs :
  ```ts
  interface OggDudeContext {
    zipPath: string
    runImport(page: Page, mode: ImportMode): Promise<void>
  }
  ```
- la fixture retourne le contexte aux specs via `use(context)`

### Etape 4 — Ajouter le helper de haut niveau `runOggDudeImportScenario`

**Fichier** : `e2e/regression/utils/oggdude-importer.ts`

**But** : fournir une fonction qui enchaine toutes les etapes d'import en une
seule instruction pour eviter la repetition dans les specs.

**Actions** :

- ajouter :
  ```ts
  async function runOggDudeImportScenario(page: Page, options: { importMode: ImportMode; zipPath: string }): Promise<void>
  ```
- elle enchaine :
  1. `openOggDudeImporterDialog(page)`
  2. `uploadOggDudeZip(page, { zipPath, importMode, selectAll: true })`
  3. `triggerOggDudeImport(page)`
  4. `waitForOggDudeImportComplete(page, timeout)`
  5. `closeOggDudeDialogs(page)`
- les assertions ne sont PAS incluses dans le helper — elles restent dans les
  specs pour garder la separation lecture/ecriture

### Etape 5 — Recentrer la spec `world` sur la nouvelle fixture

**Fichier** : `e2e/regression/specs/02-oggdude-import-world.spec.ts`

**But** : la spec `world` ne doit plus contenir que le strict necessaire :

- import en mode `world` via la fixture
- assertion sur `game.items`

**Actions** :

- remplacer l'import direct des helpers par l'utilisation de la fixture
  `oggdudeReady`
- supprimer la duplication du chemin ZIP
- la spec se reduit a :
  ```ts
  test('import world crée les sentinelles dans game.items [ci]', async ({ page, oggdude }) => {
    await oggdude.runImport(page, 'world')
    await verifyOggDudeWorldItems(page)
  })
  ```
- le `beforeEach` est porte par la fixture — plus besoin de l'ecrire dans la spec
- verifier qu'aucune interaction avec la case `Import to Compendium` n'a lieu
  pendant le test

### Etape 6 — Rebrancher la spec `compendium` sur la meme fixture

**Fichier** : `e2e/regression/specs/02b-oggdude-import-compendium.spec.ts`

**But** : utiliser exactement la meme fixture `oggdudeReady` et le meme helper
`runOggDudeImportScenario`. La seule difference est le mode `compendium` et les
assertions finales.

**Actions** :

- remplacer les imports par la fixture mutualisee
- le `beforeEach` avec cleanup + timeout est porte par la fixture
- la spec se reduit a :
  ```ts
  test('import compendium crée les packs avec sentinelles [ci]', async ({ page, oggdude }) => {
    test.setTimeout(240_000)
    await oggdude.runImport(page, 'compendium')
    await verifyOggDudeCompendiumItems(page)
  })
  ```

### Etape 7 — Corriger le chemin ZIP et supprimer les duplications

**Fichiers** : `02-oggdude-import-world.spec.ts`, `02b-oggdude-import-compendium.spec.ts`

**But** : le ZIP est dans `resources/oggdude-data.zip`, pas dans
`e2e/fixtures/oggdude-data.zip`. La constante `OGGDUDE_ZIP_PATH` est dupliquee
dans les deux specs.

**Actions** :

- centraliser la constante dans la fixture `oggdude.ts` uniquement
- supprimer les definitions `OGGDUDE_ZIP_PATH` dans les specs
- verifier que le chemin par defaut pointe bien vers `resources/oggdude-data.zip`
- documenter la variable d'env `E2E_OGGDUDE_ZIP_PATH` dans `e2e/README.md`

---

## 5. Fichiers modifies / crees

| Fichier                                                      | Action                                      |
| ------------------------------------------------------------ | ------------------------------------------- |
| `e2e/regression/fixtures/oggdude.ts`                         | CREER — fixture OggDude dediee              |
| `e2e/regression/utils/oggdude-importer.ts`                   | MODIFIER — `importMode`, helper haut niveau |
| `e2e/regression/utils/oggdude-cleanup.ts`                    | MODIFIER — cleanup parametrique             |
| `e2e/regression/specs/02-oggdude-import-world.spec.ts`       | MODIFIER — fixture mutualisee               |
| `e2e/regression/specs/02b-oggdude-import-compendium.spec.ts` | MODIFIER — fixture mutualisee               |

---

## 6. Ordre recommande

1. cleanup parametrique (`oggdude-cleanup.ts`)
2. contrat `importMode` + helper haut niveau (`oggdude-importer.ts`)
3. fixture OggDude (`fixtures/oggdude.ts`)
4. migration spec `world`
5. migration spec `compendium`
6. correction ZIP + verifications finales

---

## 7. Criteres d'acceptation

- [ ] le test `world` n'interagit pas avec la case `Import to Compendium`
- [ ] avant chaque import `world`, tous les `game.items` sont supprimes
- [ ] les packs world ne sont PAS supprimes dans le cleanup `world`
- [ ] a la fin du test `world`, les 3 sentinelles existent dans `game.items`
- [ ] le test `compendium` continue de fonctionner sur la meme fixture
- [ ] les packs cibles sont supprimes uniquement dans le cleanup `compendium`
- [ ] le chemin ZIP par defaut pointe sur `resources/oggdude-data.zip`
- [ ] plus aucune duplication de `OGGDUDE_ZIP_PATH` dans les specs
- [ ] un rerun du test `world` passe sans nettoyage manuel
- [ ] le test `world` conserve les items importes presents a la fin du scenario
- [ ] le contrat `importMode` est strict : `'world' | 'compendium'`, pas de
      booleen implicite

---

## 8. Validation prevue

- `pnpm e2e:regression` — la suite complete de regression s'execute sans echec
- execution isolee de la spec `world`
- execution isolee de la spec `compendium`
- rerun des deux specs consecutifs sans nettoyage manuel
- verification que le test `world` echoue si la case `Import to Compendium`
  est interactee (validation du contrat)
- verification que le test `world` echoue si les sentinelles ne sont pas creees
  (ZIP absent ou invalide)
