# Plan d'implémentation — Issue #384

**Issue** : [#384 — EDG2 - Mettre en place un monde documentaire déterministe et les helpers d'artefacts](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/384)
**Dépendance** : [#383 — EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/383)
**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- issue fournie par l'utilisateur ;
- `documentation/cadrage/documentation/e2e-documentation-user-guide-generation-with-playwright-and-ai.md` ;
- `documentation/plan/tests/e2e/383-edg1-cadrer-la-suite-e2e-documentation-et-sa-configuration-dediee.md`.

---

## 1. Objectif

Mettre en place le socle déterministe de la suite `e2e:documentation` afin de préparer un monde dédié, stabiliser les captures Playwright et produire des artefacts documentaires structurés sans coupler ce flux aux helpers de régression.

---

## 2. Périmètre

### Inclus

- identification et documentation d'un monde documentaire dédié ;
- contrat de reset visuel et de préparation déterministe avant capture ;
- création des helpers `documentation-world-manager`, `screenshot-helper`, `guide-step-recorder` et `guide-metadata-writer` ;
- séparation claire entre helpers documentaires et helpers de régression.

### Exclu

- livraison d'un parcours `*.guide.spec.ts` complet ;
- génération IA du Markdown final ;
- extension opportuniste des helpers `smoke` ou `regression` hors mutualisation strictement prouvée.

---

## 3. Plan de travail proposé

### Étape 1 — Verrouiller le contrat du monde documentaire déterministe

**But** : définir un monde dédié et le niveau de reset minimal requis pour garantir des captures stables et reproductibles.

**Fichiers cibles** : configuration/documentation E2E dédiée, éventuels exemples d'environnement, `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`.

**Actions** :

- nommer explicitement le monde documentaire cible (ex. `documentation-world`) et son usage exclusif ;
- documenter le reset visuel attendu : nettoyage des entités, suppression des popups/notifications, désactivation des animations, noms/données stables ;
- préciser la frontière entre état documentaire propre et reset fonctionnel de régression.

### Étape 2 — Introduire le helper de préparation du monde documentaire

**But** : centraliser la préparation déterministe avant capture dans une couche dédiée à la suite documentaire.

**Fichiers cibles** : `e2e/documentation/utils/documentation-world-manager.ts`, fixtures/setup documentaires associées, documentation E2E liée.

**Actions** :

- créer un helper responsable de préparer l'état documentaire avant chaque parcours ;
- y encapsuler les opérations de nettoyage/recréation strictement nécessaires à la stabilité visuelle ;
- empêcher un couplage implicite avec les helpers existants orientés `smoke` ou `regression`.

### Étape 3 — Créer les helpers d'artefacts de capture et d'enregistrement

**But** : fournir une chaîne documentaire cohérente pour produire screenshots et métadonnées structurées.

**Fichiers cibles** : `e2e/documentation/utils/screenshot-helper.ts`, `e2e/documentation/utils/guide-step-recorder.ts`, `e2e/documentation/utils/guide-metadata-writer.ts`, répertoire d'output documentaire.

**Actions** :

- implémenter un helper de screenshot avec viewport fixe, animations désactivées et conventions de nommage stables ;
- implémenter un enregistreur d'étapes capable de capturer ordre, titre, action utilisateur, état attendu et chemin du screenshot ;
- implémenter l'écriture d'un JSON structuré décrivant le guide généré et ses artefacts.

### Étape 4 — Documenter l'isolation et les critères de validation du socle

**But** : rendre le socle documentaire compréhensible, exécutable et vérifiable avant l'ajout des premières specs guide.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle documentation dédiée à `e2e/documentation/`.

**Actions** :

- documenter comment préparer le monde documentaire et où sont produits les artefacts ;
- expliciter les conventions de capture reproductible et les responsabilités de chaque helper ;
- lister les critères de clôture : monde dédié identifié, reset visuel documenté, helpers isolés et artefacts structurés produits.

---

## 4. Ordre recommandé

1. Contrat du monde documentaire
2. Helper `documentation-world-manager`
3. Helpers d'artefacts documentaires
4. Documentation finale et critères de validation

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de `e2e:documentation` sur le monde documentaire retenu ;
- vérification qu'une capture répétée dans les mêmes conditions produit des artefacts stables ;
- relecture croisée `README E2E ↔ guide E2E ↔ helpers documentaires ↔ conventions d'output` pour confirmer l'isolation vis-à-vis des helpers de régression.

---

## 6. Résultat attendu

Le projet dispose d'un socle `e2e:documentation` déterministe avec un monde dédié, une préparation visuelle stable et des helpers séparés capables de produire des screenshots et métadonnées exploitables pour les futurs guides utilisateur.
