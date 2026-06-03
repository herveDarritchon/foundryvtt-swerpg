# Plan d'implementation — E2E OggDude

**Domaine metier** : `tests/e2e/oggdude-import`
**Contexte** : enrichir la regression E2E OggDude pour couvrir explicitement les deux modes d'import (`world` et `compendium`) avec un cleanup deterministe du monde avant chaque run.
**Sources de cadrage** :

- `documentation/cadrage/tests/e2e/import-oggdude-save.md`
- `documentation/tests/e2e/playwright-e2e-guide.md`
- `e2e/README.md`
- `e2e/regression/specs/02-oggdude-import.spec.ts`
- `e2e/regression/utils/oggdude-importer.ts`
- `e2e/fixtures/index.ts`
- `e2e/regression/fixtures/global-setup.ts`
- `e2e/regression/utils/world-manager.ts`
- `module/utils/oggdude-mapping-config.mjs`

---

## 1. Objectif

Rendre la regression E2E OggDude rejouable et probante en separant les flux `world` et `compendium` en deux suites distinctes, tout en supprimant avant chaque execution les items monde et les compendiums world rattaches au monde actif.

---

## 2. Decisions verrouillees

- couvrir les deux flux OggDude dans 2 suites E2E de regression separees ;
- identifier les compendiums a supprimer via le `world id` actif ;
- utiliser un cleanup API-first via `page.evaluate()` plutot qu'un parcours UI destructif ;
- verifier un trio de sentinelles stable issu du ZIP de fixture :
- `Holdout Blaster` (`weapon`)
- `Armored Clothing` (`armor`)
- `Bothan` (`species`)

---

## 3. Perimetre

### Inclus

- separation de la spec OggDude actuelle en deux suites dediees ;
- cleanup deterministe avant import des `game.items` et des compendiums world du monde actif ;
- verification post-import des sentinelles dans le monde ;
- verification post-import des sentinelles dans les compendiums world OggDude ;
- alignement des helpers et types E2E necessaires aux appels Foundry via `page.evaluate()`.

### Exclu

- refonte generale de toute l'architecture E2E hors perimetre OggDude ;
- extension de couverture a d'autres domaines OggDude que `weapon`, `armor`, `species` ;
- modification du runtime applicatif OggDude sans preuve que le blocage vient du systeme et non du test.

---

## 4. Plan de travail propose

### Etape 1 — Poser le contrat commun world/compendium

**But** : figer un contrat de regression clair avant de modifier les specs.

**Fichiers cibles** : `e2e/regression/specs/02-oggdude-import.spec.ts`, documentation associee si necessaire

**Actions** :

- confirmer que le flux `world` importe avec `toCompendium: false` et ne verifie que les objets monde ;
- confirmer que le flux `compendium` importe avec `toCompendium: true` et verifie les packs world OggDude ;
- supprimer le contrat ambigu actuel ou `toCompendium: false` est suivi d'une verification compendium ;
- verrouiller l'usage du trio de sentinelles `Holdout Blaster`, `Armored Clothing`, `Bothan`.

### Etape 2 — Ajouter le cleanup deterministe OggDude

**But** : garantir qu'un rerun de l'import part d'un etat propre sans dependre d'un nettoyage manuel.

**Fichiers cibles** : nouveau helper ou fixture sous `e2e/regression/utils/` ou `e2e/regression/fixtures/`, types sous `e2e/types/foundry.d.ts`

**Actions** :

- creer un helper dedie, par exemple `runOggDudePreImportCleanup(page)` ;
- dans `page.evaluate()`, resoudre `game.world.id` et echouer explicitement si absent ;
- supprimer tous les `game.items` via `Item.deleteDocuments(itemIds)` ;
- supprimer uniquement les compendiums appartenant au monde actif, en filtrant sur `pack.metadata.packageType === 'world'` et `pack.metadata.packageName === worldId` ;
- deverrouiller les packs avant suppression quand necessaire ;
- retourner un resume de cleanup exploitable pour le diagnostic ;
- etendre les types E2E minimaux pour `game.world`, `game.items`, `game.packs`, `Item`, `Dialog`, `ui`.

### Etape 3 — Renforcer les helpers d'assertion OggDude

**But** : verifier des donnees importees reelles plutot qu'une simple presence d'UI.

**Fichiers cibles** : `e2e/regression/utils/oggdude-importer.ts`, eventuel nouveau helper d'assertion

**Actions** :

- conserver les helpers existants d'ouverture, upload, declenchement et attente d'import ;
- ajouter une verification des sentinelles monde dans `game.items` avec nom et type attendus ;
- remplacer la verification compendium faible par une verification de contenu des packs world OggDude ;
- verifier explicitement la presence des sentinelles dans `world.swerpg-weapons`, `world.swerpg-armors` et `world.swerpg-species`.

### Etape 4 — Creer la suite de regression import monde

**But** : prouver que l'import `world` cree bien les objets attendus dans le monde actif.

**Fichiers cibles** : nouvelle spec dediee sous `e2e/regression/specs/`

**Actions** :

- creer une spec dediee, par exemple `02-oggdude-import-world.spec.ts` ;
- brancher le cleanup OggDude en `beforeEach` ;
- lancer l'import avec `toCompendium: false` et `selectAll: true` ;
- attendre la fin d'import puis fermer les dialogs ;
- verifier que `Holdout Blaster`, `Armored Clothing` et `Bothan` existent dans `game.items` avec les types `weapon`, `armor`, `species` ;
- ne faire aucune assertion compendium dans cette suite.

### Etape 5 — Creer la suite de regression import compendium

**But** : prouver que l'import `compendium` cree bien les packs et objets attendus.

**Fichiers cibles** : nouvelle spec dediee sous `e2e/regression/specs/`

**Actions** :

- creer une spec dediee, par exemple `02b-oggdude-import-compendium.spec.ts` ;
- reutiliser le meme cleanup OggDude en `beforeEach` ;
- lancer l'import avec `toCompendium: true` ;
- attendre la fin d'import puis fermer les dialogs ;
- verifier l'existence des packs `world.swerpg-weapons`, `world.swerpg-armors`, `world.swerpg-species` ;
- verifier la presence des trois sentinelles dans ces packs ;
- ne pas se contenter d'une verification de dossier UI `SWERPG OggDude Import`.

### Etape 6 — Finaliser le retrait de la spec mixte actuelle

**But** : eviter que l'ancienne spec continue de porter un contrat contradictoire.

**Fichiers cibles** : `e2e/regression/specs/02-oggdude-import.spec.ts`, eventuelle documentation E2E

**Actions** :

- soit supprimer la spec mixte au profit des deux nouvelles suites ;
- soit la reduire a un smoke de dialog si ce contrat reste utile ;
- mettre a jour les commentaires de spec et la documentation E2E pour refleter la separation `world` / `compendium`.

---

## 5. Checklist d'implementation

- [ ] verrouiller le trio de sentinelles `Holdout Blaster`, `Armored Clothing`, `Bothan`
- [ ] creer un helper ou une fixture de cleanup OggDude dediee
- [ ] etendre `e2e/types/foundry.d.ts` pour les API Foundry utilisees en cleanup/assertions
- [ ] supprimer les items monde via `Item.deleteDocuments(itemIds)` avant chaque run OggDude
- [ ] supprimer les compendiums world du monde actif via `game.world.id`
- [ ] ajouter les assertions monde des 3 sentinelles
- [ ] ajouter les assertions compendium de contenu des packs world OggDude
- [ ] creer la spec `world`
- [ ] creer la spec `compendium`
- [ ] retirer ou simplifier la spec mixte historique
- [ ] mettre a jour la documentation E2E si le contrat de suite change

---

## 6. Ordre recommande

1. cleanup OggDude dedie
2. extension des types E2E
3. assertions monde
4. suite `world`
5. assertions compendium
6. suite `compendium`
7. retrait de la spec mixte

---

## 7. Validation prevue (non executee dans ce plan)

- execution isolee de la suite `world` ;
- execution isolee de la suite `compendium` ;
- rerun des deux suites sans nettoyage manuel intermediaire ;
- verification que les erreurs navigateur restent bloquantes via `worldReady` ;
- verification que l'import echoue si une sentinelle attendue n'est pas creee dans le monde ou le pack cible.

---

## 8. Resultat attendu

La regression OggDude dispose de deux suites claires et rejouables, chacune prouvant un mode d'import distinct. Le cleanup prealable elimine les faux positifs lies a l'etat residuel du monde, et les assertions metier s'appuient sur des objets reels importes depuis le ZIP de fixture.
