# Plan d'implementation — #244 : Resoudre les talents des arbres par `talentUuid` dans l'interface

**Issue** : [#244 — Resoudre les talents des arbres par talentUuid dans l'interface](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/244)
**Bloque par** : [#243 — Enrichir les noeuds d'arbres de specialisation avec `talentUuid` a l'import](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/243)
**ADR principale** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**ADRs complementaires** : `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`, `documentation/architecture/adr/adr-0006-specialization-import-error-isolation.md`
**Module(s) impacte(s)** : `module/applications/specialization-tree-app.mjs`, `tests/applications/specialization-tree-app.test.mjs`

---

## 1. Objectif

Corriger la resolution des talents affiches dans l'application graphique des arbres de specialisation pour :

- utiliser `node.talentUuid` comme reference nominale ;
- conserver un fallback transitoire sur `node.talentId` uniquement pour les anciennes donnees ;
- reserver `Unknown talent` aux cas ou la resolution echoue reellement.

Le ticket porte sur la couche UI uniquement. Il ne doit ni changer le contrat de donnees importer, ni introduire de migration.

---

## 2. Perimetre

### Inclus dans ce ticket

- Correction de la logique de resolution des talents dans `specialization-tree-app.mjs`.
- Priorite stricte a `talentUuid` quand il est present.
- Fallback legacy via `talentId` comme cle metier, sans traiter `talentId` comme un UUID Foundry.
- Mise a jour des tests UI pour couvrir le chemin nominal, le fallback legacy et le vrai cas `Unknown talent`.

### Exclu de ce ticket

- Modification du schema `specialization-tree`.
- Modification du flux d'import OggDude.
- Migration des anciens `specialization-tree` deja persistes.
- Refonte globale de la resolution des talents dans tout le systeme.
- Ajout de nouvelles cles i18n (la cle existante `SWERPG.TALENT.UNKNOWN` suffit).

---

## 3. Constat sur l'existant

### 3.1. L'application tente encore de resoudre `talentId` comme un UUID

Dans `module/applications/specialization-tree-app.mjs:119-140`, `resolveTalentItem()` et `resolveTalentDetail()` appellent directement `fromUuidSync(talentId)`.

**Consequence** : si `talentId` contient une cle metier comme `grit`, la resolution echoue et l'UI affiche `Unknown talent` alors que le talent reel existe.

### 3.2. Le rendu ignore `node.talentUuid`

Dans `module/applications/specialization-tree-app.mjs:222-225`, le contexte de rendu appelle `resolveTalentDetail(node.talentId)` au lieu de consommer le noeud complet (`node.talentUuid`).

Le contrat enrichi livre par #243 n'est donc pas exploite cote interface.

### 3.3. Le socle importer pour `talentUuid` est deja en place

Le code montre que #243 est bien integre :

- `module/importer/items/specialization-tree-ogg-dude.mjs:7-113` construit un index `talentById` ;
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs:425-437` persiste `talentUuid` dans les noeuds importes.

Le prerequis fonctionnel de l'issue UI est donc satisfait.

### 3.4. Les tests UI ne couvrent pas encore `talentUuid`

`tests/applications/specialization-tree-app.test.mjs` couvre les cas `talentId` / `Unknown talent`, mais aucun test ne valide :

- la priorite de `talentUuid` ;
- l'absence d'appel a `fromUuidSync(node.talentId)` quand `talentUuid` est present ;
- le fallback legacy par cle metier.

### 3.5. Les evenements de clic sur un noeud utilisent aussi `talentId` comme UUID

Il faut verifier si les interactions (affichage d'un popup, achat, etc.) utilisent aussi la meme fonction de resolution et les aligner si necessaire.

---

## 4. Decisions d'architecture

### 4.1. La resolution UI doit consommer le noeud, pas seulement `talentId`

**Decision** : faire evoluer `resolveTalentDetail()` pour qu'il accepte les informations du noeud (`talentUuid`, `talentId`), pas seulement une chaine.

**Justification** :
- conforme a ADR-0013 ;
- evite de perdre l'information technique au point d'appel ;
- permet d'exprimer clairement l'ordre de resolution nominal et fallback.

### 4.2. Ordre de resolution nominal : `talentUuid` puis fallback legacy metier

**Decision** : appliquer l'ordre suivant :

1. `node.talentUuid` → `fromUuidSync()` → si trouve, utiliser `item.name`
2. fallback legacy : rechercher un talent par `talentId` (cle metier) dans `game.items` et index de compendiums
3. `Unknown talent` : si aucune resolution possible

**Justification** :
- conforme a l'issue et a ADR-0013 ;
- garde la compatibilite transitoire avec les anciennes donnees ;
- empeche de confondre cle metier et UUID Foundry.

### 4.3. Le fallback legacy ne doit jamais appeler `fromUuidSync(node.talentId)`

**Decision** : le fallback legacy doit chercher un talent par cle metier stable (`system.id`), pas essayer de resoudre `talentId` comme un UUID.

**Justification** :
- c'est la cause directe du bug actuel ;
- l'issue l'interdit explicitement ("sans devenir le chemin nominal de resolution").

### 4.4. Fallback legacy par index des talents disponibles

**Decision** : construire, au sein du meme fichier applicatif, un petit index des talents resolubles par cle metier, en parcourant les items du monde et les index de compendiums.

**Justification** :
- changement minimal et localise ;
- evite un refactor transverse premature ;
- reprend le pattern deja utilise par l'import (#243) pour la resolution.

### 4.5. Eviter les warnings bruyants au rendu

**Decision** : ne pas emettre de `logger.warn` par noeud lors du rendu si le fallback legacy est utilise. Un seul `logger.debug` global en debut de construction du contexte pour indiquer le nombre de noeud tombant en fallback.

**Justification** :
- le rendu peut etre frequent (scroll, resize, onglet) ;
- un warning par noeud polluerait les logs without benefice actionnable ;
- le besoin principal du ticket est l'affichage correct, pas le diagnostic importer.

---

## 5. Plan de travail detaille

### Etape 1 — Ajouter un helper de resolution legacy par cle metier

**A faire**

- Creer ou etendre le resolvers pour accepter un objet `{ talentUuid, talentId }`.
- Definir une fonction interne `#resolveTalentLegacy(talentId)` qui cherche un talent par `system.id` dans `game.items`, puis dans les index de compendium.
- Retourner `{ name, isRanked }` ou `null`.

**Fichiers**
- `module/applications/specialization-tree-app.mjs`

**Risques**
- impacter la signature public exportee (`resolveTalentDetail`, `resolveTalentItem`) si on ne gere pas la retrocompatibilite.

---

### Etape 2 — Refactorer `resolveTalentDetail()` pour prioriser `talentUuid`

**A faire**

- Modifier la signature ou le comportement de `resolveTalentDetail()` pour qu'il prenne en compte `talentUuid` en premier.
- Si `talentUuid` est present et valide → retourner le detail via `fromUuidSync`.
- Si `talentUuid` est absent/invalide → tenter le fallback legacy.
- Si le fallback legacy echoue → retourner `Unknown talent`.

**Fichiers**
- `module/applications/specialization-tree-app.mjs`

**Risques**
- casser les tests existants si on change la signature ; mitigation : garder un overload ou adapter les appels.

---

### Etape 3 — Brancher le rendu des noeuds sur le nouveau resolver

**A faire**

- Remplacer l'appel `resolveTalentDetail(node.talentId)` par `resolveTalentDetail({ talentUuid: node.talentUuid, talentId: node.talentId })`.
- Continuer a produire les memes proprietes de rendu : `talentName`, `isRanked`, `talentId`.

**Fichiers**
- `module/applications/specialization-tree-app.mjs`

**Risques**
- regression discrete dans `buildSpecializationTreeContext()` si le contrat de sortie change (meme proprietes, valeurs corrigees, donc aucun risque).

---

### Etape 4 — Aligner `resolveTalentItem()` sur la nouvelle logique

**A faire**

- Soit aligner `resolveTalentItem()` sur la nouvelle logique ;
- soit le reduire a un simple wrapper sur le resolver principal pour les tests.

**Fichiers**
- `module/applications/specialization-tree-app.mjs`

**Risques**
- garder deux logiques divergentes dans le meme fichier.

---

### Etape 5 — Ajouter la couverture de tests metier

**A faire**

Ajouter les tests suivants dans `tests/applications/specialization-tree-app.test.mjs` :

1. **Priorite `talentUuid`** : noeud avec `talentUuid` valide et `talentId` non-UUID → le vrai nom du talent doit s'afficher.
2. **Fallback legacy** : noeud avec `talentUuid` absent et `talentId` correspondant a un `system.id` de talent existant → le vrai nom du talent doit s'afficher.
3. **Echec total** : noeud avec `talentUuid` absent et `talentId` introuvable dans les items et compendiums → `Unknown talent`.
4. **Non-regression** : verifier que `fromUuidSync` n'est pas appele avec une valeur de `talentId` qui n'est pas un UUID.
5. **Mise a jour des tests existants** de `resolveTalentDetail()` et `resolveTalentItem()` pour refleter le nouveau contrat.

**Fichiers**
- `tests/applications/specialization-tree-app.test.mjs`

**Risques**
- tests trop couples a l'implementation au lieu du comportement metier ;
- mocks Foundry insuffisants pour simuler `game.items` et index compendium.

---

### Etape 6 — Verification de non-regression UI

**A faire**

- Verifier que les noeuds continuent a s'afficher avec les memes coordonnees, couts et etats.
- Verifier qu'aucune traduction supplementaire n'est necessaire.
- Verifier que le rendu `Unknown talent` reste stable pour les vrais cas d'echec.

**Fichiers a relire**
- `module/applications/specialization-tree-app.mjs`
- `tests/applications/specialization-tree-app.test.mjs`

**Risques**
- corriger la resolution mais casser un test annexe de rendu (par ex. tests de `renderConnections`, `variant`, `nodeState`).

---

## 6. Fichiers modifies

| Fichier | Action | Description |
|---|---|---|
| `module/applications/specialization-tree-app.mjs` | modification | Faire resoudre les talents par `talentUuid` en priorite, avec fallback legacy par `talentId` |
| `tests/applications/specialization-tree-app.test.mjs` | modification | Couvrir priorite `talentUuid`, fallback legacy et vrai cas `Unknown talent` |

Aucun autre fichier n'est necessaire pour ce ticket si on reste sur une correction minimale, locale a l'application.

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| L'UI continue d'utiliser `talentId` comme UUID dans un chemin residu | bug non entierement corrige | centraliser toute la resolution dans un seul helper |
| Fallback legacy trop large ou ambigu | mauvais talent affiche | chercher par `system.id` normalise et documenter le caractere transitoire |
| Regression sur les tests existants exportant l'ancienne signature | friction de maintenance | adapter les tests au nouveau contrat public |
| Logs trop verbeux au rendu | pollution console | eviter les warnings par noeud, logger global en debug |
| Couverture incomplete du cas compendium | bug latent hors monde | ajouter au moins un test cible si le fallback compendium est retenu |
| Les evenements de clic sur noeud utilisent une resolution differente du rendu | incoherence UX | verifier le code d'interaction dans le meme fichier |

---

## 8. Proposition d'ordre de commit

1. `feat(ui): resolve specialization tree talents from talentUuid first with legacy fallback`
2. `test(ui): cover specialization tree talent resolution with talentUuid and fallback`

---

## 9. Dependances avec les autres US

- **Depend de #243** : l'UI ne peut exploiter `talentUuid` que si les noeuds importes sont deja enrichis.
- **S'appuie sur #242 et ADR-0013** : le fallback legacy par `talentId` cle metier repose sur `system.id` defini comme cle stable.
- **Ne couvre pas la migration** : les anciennes donnees restent supportees via fallback, sans enrichissement automatique dans ce ticket.
