# Plan d'implémentation — Issue #388

**Issue** : [#388 — EDG6 - Valider la stabilité des captures, la sûreté des données et la checklist de release](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/388)
**Dépendances** :

- [#383 — EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/383)
- [#384 — EDG2 - Mettre en place un monde documentaire déterministe et les helpers d'artefacts](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/384)
- [#385 — EDG3 - Livrer un premier parcours *.guide.spec.ts avec screenshots et JSON](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/385)
- [#386 — EDG4 - Générer un user guide Markdown en anglais via commande séparée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/386)
- [#387 — EDG5 - Documenter l'exploitation, la gouvernance et la séparation avec smoke/regression](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/387)

**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- issue fournie par l'utilisateur ;
- `documentation/cadrage/documentation/e2e-documentation-user-guide-generation-with-playwright-and-ai.md` ;
- `documentation/plan/tests/e2e/383-edg1-cadrer-la-suite-e2e-documentation-et-sa-configuration-dediee.md` ;
- `documentation/plan/tests/e2e/384-edg2-mettre-en-place-un-monde-documentaire-deterministe-et-les-helpers-d-artefacts.md` ;
- `documentation/plan/tests/e2e/385-edg3-livrer-un-premier-parcours-guide-spec-ts-avec-screenshots-et-json.md` ;
- `documentation/plan/tests/e2e/386-edg4-generer-un-user-guide-markdown-en-anglais-via-commande-separee.md` ;
- `documentation/plan/tests/e2e/387-edg5-documenter-l-exploitation-la-gouvernance-et-la-separation-avec-smoke-regression.md`.

---

## 1. Objectif

Clore le chantier `e2e:documentation` avec une passe finale de sécurisation avant release, en validant la reproductibilité des captures, l'absence de données sensibles dans les artefacts produits et l'existence d'une checklist courte permettant d'exécuter puis relire le flux documentaire de bout en bout.

---

## 2. Périmètre

### Inclus

- validation du contrat de stabilité visuelle des screenshots et du JSON associé ;
- formalisation des garde-fous sur les données visibles dans le monde documentaire et les artefacts générés ;
- checklist de release dédiée à `e2e:documentation` couvrant capture, génération Markdown et revue humaine ;
- synchronisation finale de la documentation d'exploitation avec ces critères de sortie.

### Exclu

- ajout d'un nouveau parcours guide hors besoin de validation finale ;
- refonte large des helpers ou de la configuration sans écart prouvé ;
- automatisation de publication ou usage de la suite comme validation fonctionnelle bloquante.

---

## 3. Plan de travail proposé

### Étape 1 — Verrouiller le contrat de stabilité des captures et des artefacts

**But** : figer ce qui doit rester déterministe entre deux reruns identiques pour qu'un guide soit diffable et relisible avant release.

**Fichiers cibles** : `e2e/documentation/specs/*.guide.spec.ts`, `e2e/documentation/utils/`, `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`.

**Actions** :

- lister les invariants attendus sur les captures : ordre stable, viewport constant, nommage déterministe, écrans sans bruit parasite ;
- vérifier que le JSON intermédiaire reste aligné avec l'ordre réel des screenshots et ne dépend pas d'un état aléatoire ;
- documenter les écarts tolérés vs les écarts bloquants avant release documentaire.

### Étape 2 — Formaliser la sûreté des données du monde documentaire

**But** : empêcher qu'un rerun documentaire expose des données sensibles, environnementales ou non maîtrisées dans les captures, le JSON ou le Markdown généré.

**Fichiers cibles** : `e2e/documentation/utils/`, `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle documentation dédiée au monde documentaire.

**Actions** :

- expliciter les catégories de données interdites dans les artefacts (identifiants réels, données client, secrets, URLs non prévues, bruit de session) ;
- cadrer les mécanismes à utiliser pour les éviter : monde dédié, fixtures déterministes, noms neutres, nettoyage préalable, masquage minimal si nécessaire ;
- ajouter un point de contrôle documentaire confirmant que la génération Markdown n'introduit pas d'information hors JSON source.

### Étape 3 — Construire la checklist de release `e2e:documentation`

**But** : fournir une séquence courte et exécutable pour conclure qu'un guide peut être rerun, relu et diffusé sans ambiguïté.

**Fichiers cibles** : `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle checklist dédiée sous `documentation/tests/e2e/`.

**Actions** :

- définir l'ordre canonique : préparation du monde, run de capture, vérification des screenshots/JSON, génération Markdown, relecture humaine ;
- lister les preuves minimales à conserver pour la clôture : artefacts produits, absence d'erreurs navigateur inattendues, captures lisibles, contrôle des données sensibles ;
- distinguer clairement ce qui relève d'un feu vert documentaire et ce qui reste hors scope d'une release applicative globale.

### Étape 4 — Synchroniser les critères de clôture finaux

**But** : aligner en un seul contrat la stabilité des captures, la sûreté des données et la checklist de release.

**Fichiers cibles** : `e2e/README.md`, `e2e/documentation/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle checklist dédiée.

**Actions** :

- harmoniser les formulations sur `e2e:documentation` comme suite documentaire non bloquante mais exploitable avant publication ;
- regrouper les critères de sortie finaux pour éviter des consignes concurrentes entre README, guide E2E et cadrage documentaire ;
- expliciter le signal de clôture EDG6 : captures stables, artefacts sûrs, checklist courte, rerun compréhensible et revue humaine prévue.

---

## 4. Ordre recommandé

1. Figer le contrat de stabilité des captures
2. Sécuriser le contrat de données du monde documentaire
3. Formaliser la checklist de release
4. Synchroniser les critères de clôture dans la documentation

---

## 5. Validation prévue (non exécutée dans ce plan)

- rerun ciblé d'un parcours `*.guide.spec.ts` de référence pour vérifier la stabilité des screenshots et du JSON ;
- contrôle manuel qu'aucune donnée sensible ou non maîtrisée n'apparaît dans `screenshots/`, `raw/` ou `markdown/` ;
- relecture croisée `README documentation ↔ guide E2E ↔ checklist` pour confirmer un seul contrat de release documentaire ;
- vérification qu'une revue humaine reste explicitement requise avant diffusion d'un guide généré.

---

## 6. Résultat attendu

Le projet dispose d'une fermeture EDG6 claire pour `e2e:documentation`, avec des captures reproductibles, des artefacts sûrs vis-à-vis des données exposées et une checklist de release courte permettant de relancer puis valider le flux documentaire avant diffusion.
