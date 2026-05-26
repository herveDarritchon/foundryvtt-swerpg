# Plan d'implémentation — Issue #386

**Issue** : [#386 — EDG4 - Générer un user guide Markdown en anglais via commande séparée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/386)
**Dépendances** :

- [#383 — EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/383)
- [#384 — EDG2 - Mettre en place un monde documentaire déterministe et les helpers d'artefacts](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/384)
- [#385 — EDG3 - Livrer un premier parcours \*.guide.spec.ts avec screenshots et JSON](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/385)

**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- issue fournie par l'utilisateur ;
- `documentation/cadrage/documentation/e2e-documentation-user-guide-generation-with-playwright-and-ai.md` ;
- `documentation/plan/tests/e2e/383-edg1-cadrer-la-suite-e2e-documentation-et-sa-configuration-dediee.md` ;
- `documentation/plan/tests/e2e/384-edg2-mettre-en-place-un-monde-documentaire-deterministe-et-les-helpers-d-artefacts.md` ;
- `documentation/plan/tests/e2e/385-edg3-livrer-un-premier-parcours-guide-spec-ts-avec-screenshots-et-json.md`.

---

## 1. Objectif

Ajouter une génération séparée du guide utilisateur final à partir des artefacts produits par `e2e:documentation`, afin de transformer le JSON structuré et les screenshots existants en un Markdown lisible en anglais sans relancer la capture Playwright.

---

## 2. Périmètre

### Inclus

- cadrage du contrat d'entrée/sortie de la génération Markdown ;
- ajout d'une commande dédiée, distincte de `pnpm e2e:documentation` ;
- transformation des métadonnées guide existantes en Markdown anglais ;
- insertion correcte des références vers les screenshots déjà produits ;
- documentation de relance et des critères de validation du flux complet.

### Exclu

- ajout d'un nouveau parcours `*.guide.spec.ts` au-delà de celui déjà livré ;
- recapture Playwright pendant la génération Markdown ;
- publication opportuniste des guides hors du répertoire d'artefacts documentaires ;
- enrichissement métier inventé ou non présent dans le JSON source.

---

## 3. Plan de travail proposé

### Étape 1 — Verrouiller le contrat de génération séparée du guide

**But** : définir une commande dédiée, son périmètre exact et l'arborescence canonique des fichiers lus/produits.

**Fichiers cibles** : `package.json`, `e2e/README.md`, `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`.

**Actions** :

- retenir une commande canonique distincte de la capture documentaire (ex. `pnpm run docs:generate-user-guides`) ;
- fixer les entrées du générateur : JSON guide déjà produit et dossier de screenshots correspondant ;
- fixer les sorties attendues, notamment le dossier de Markdown généré et la convention de nommage par `guideId` ;
- préciser le comportement en cas d'artefact manquant ou incohérent sans coupler la commande à un rerun Playwright.

### Étape 2 — Définir le générateur Markdown anglais à partir du JSON guide

**But** : transformer fidèlement les données structurées existantes en un guide utilisateur final lisible, stable et sans hallucination.

**Fichiers cibles** : point d'entrée de génération dédié sous `e2e/documentation/`, éventuel helper dédié sous `e2e/documentation/utils/`, ressource de prompt/templating si retenue pendant l'implémentation.

**Actions** :

- consommer uniquement les champs déjà fournis par le JSON intermédiaire ;
- produire une structure Markdown cohérente (`title`, introduction, prérequis, étapes, notes éventuelles) en anglais ;
- référencer chaque screenshot à l'endroit exact de l'étape correspondante avec un chemin stable ;
- centraliser des règles strictes de génération pour interdire l'invention de fonctionnalités, labels, règles métier ou détails techniques internes.

### Étape 3 — Brancher la commande dédiée et la production des fichiers `.md`

**But** : rendre la génération exécutable indépendamment de `e2e:documentation`, sur un ou plusieurs guides déjà capturés.

**Fichiers cibles** : `package.json`, point d'entrée de génération documentaire, éventuel répertoire d'output documentaire Markdown.

**Actions** :

- brancher la commande dédiée sur le générateur Markdown retenu ;
- permettre la génération de tous les guides disponibles ou d'un guide ciblé si ce mode est utile au diagnostic ;
- garantir une écriture déterministe des fichiers Markdown pour éviter des variations non justifiées entre deux runs identiques ;
- s'assurer que la commande échoue proprement si le JSON source ou les screenshots attendus sont absents.

### Étape 4 — Documenter le workflow complet et les critères de clôture

**But** : rendre la chaîne `capture → JSON → Markdown anglais` compréhensible et relançable sans ambiguïté.

**Fichiers cibles** : `e2e/README.md`, `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`.

**Actions** :

- documenter l'ordre d'usage : exécuter d'abord `e2e:documentation`, puis la commande de génération Markdown ;
- préciser où trouver les JSON, screenshots et fichiers `.md` générés ;
- expliciter les critères de clôture : commande séparée disponible, Markdown en anglais, captures bien référencées, aucun détail Playwright visible côté utilisateur final ;
- synchroniser la documentation E2E pour qu'un seul contrat décrive le flux documentaire complet.

---

## 4. Ordre recommandé

1. Verrouiller le contrat de génération séparée
2. Définir le générateur Markdown anglais
3. Brancher la commande dédiée et l'output `.md`
4. Synchroniser la documentation et les critères de validation

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de `pnpm e2e:documentation` pour produire ou rafraîchir le JSON et les screenshots ;
- exécution de la commande dédiée de génération Markdown ;
- vérification qu'un fichier `documentation-output/markdown/<guide>.md` est créé en anglais et référence correctement les captures ;
- relecture rapide pour confirmer l'absence d'hallucination, d'anglicisme interne incorrect ou de mention technique Playwright dans le rendu final.

---

## 6. Résultat attendu

Le projet dispose d'une commande séparée capable de convertir les artefacts de `e2e:documentation` en user guide Markdown anglais, avec un rendu stable, des screenshots correctement référencés et une documentation claire pour relancer le flux de bout en bout.
