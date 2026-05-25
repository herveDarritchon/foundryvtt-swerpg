# Plan d'implémentation — Issue #385

**Issue** : [#385 — EDG3 - Livrer un premier parcours *.guide.spec.ts avec screenshots et JSON](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/385)
**Dépendances** :

- [#383 — EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/383)
- [#384 — EDG2 - Mettre en place un monde documentaire déterministe et les helpers d'artefacts](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/384)

**Domaine métier** : `tests/e2e`
**Source de cadrage** :

- issue fournie par l'utilisateur ;
- `documentation/cadrage/documentation/e2e-documentation-user-guide-generation-with-playwright-and-ai.md` ;
- `documentation/plan/tests/e2e/383-edg1-cadrer-la-suite-e2e-documentation-et-sa-configuration-dediee.md` ;
- `documentation/plan/tests/e2e/384-edg2-mettre-en-place-un-monde-documentaire-deterministe-et-les-helpers-d-artefacts.md`.

---

## 1. Objectif

Livrer le premier parcours documentaire complet de la suite `e2e:documentation`, sous forme d'un fichier `*.guide.spec.ts` capable d'exécuter un scénario représentatif, de produire des screenshots ordonnés et de générer un JSON intermédiaire fidèle au parcours.

---

## 2. Périmètre

### Inclus

- choix et cadrage du premier parcours guide à couvrir ;
- création d'une première spec documentaire sous `e2e/documentation/specs/` ;
- capture des étapes importantes avec préfixe d'ordre stable ;
- production d'un JSON intermédiaire cohérent avec les étapes enregistrées ;
- rangement des artefacts dans `e2e/documentation/output/` ;
- documentation minimale du parcours et de ses sorties.

### Exclu

- génération Markdown finale via IA ;
- multiplication des parcours `*.guide.spec.ts` dans la même issue ;
- refonte large des helpers documentaires si le socle EDG2 suffit déjà ;
- ajout d'assertions métier profondes relevant des suites de régression.

---

## 3. Plan de travail proposé

### Étape 1 — Verrouiller le premier parcours documentaire et son contrat d'étapes

**But** : fixer un scénario guide unique, lisible et suffisamment représentatif pour valider toute la chaîne documentaire.

**Fichiers cibles** : `e2e/documentation/specs/<guide-id>.guide.spec.ts`, documentation E2E associée si besoin.

**Actions** :

- retenir le premier parcours à documenter (par exemple `character-creation`) et son `guideId` canonique ;
- définir la liste minimale des étapes à capturer, leur ordre et leur titre utilisateur ;
- vérifier que chaque étape a un état visuel stable, lisible et compatible avec le monde documentaire déterministe.

### Étape 2 — Implémenter la spec `*.guide.spec.ts` sur le socle documentaire existant

**But** : créer la première spec complète en s'appuyant sur la configuration, les fixtures et les helpers documentaires déjà cadrés.

**Fichiers cibles** : `e2e/documentation/specs/<guide-id>.guide.spec.ts`, éventuels points d'intégration documentaires strictement nécessaires.

**Actions** :

- structurer le parcours avec des étapes explicites alignées sur le guide cible ;
- utiliser le helper de préparation du monde documentaire avant capture ;
- limiter les assertions aux garde-fous nécessaires pour garantir des captures pertinentes.

### Étape 3 — Produire les artefacts ordonnés : screenshots et JSON

**But** : garantir que la spec génère des sorties stables, ordonnées et directement exploitables en aval.

**Fichiers cibles** : helpers documentaires déjà introduits sous `e2e/documentation/utils/` si un ajustement minimal est requis, répertoires d'output sous `e2e/documentation/output/`.

**Actions** :

- nommer les screenshots avec un préfixe d'ordre stable (`01-`, `02-`, `03-`, etc.) ;
- enregistrer pour chaque étape le titre, l'action utilisateur, l'état attendu et le chemin de capture ;
- produire un JSON intermédiaire reflétant fidèlement l'ordre réel du parcours et les artefacts générés.

### Étape 4 — Documenter l'usage du premier parcours guide et ses critères de clôture

**But** : rendre le premier guide exécutable et compréhensible sans ambiguïté pour les prochaines itérations EDG.

**Fichiers cibles** : `e2e/README.md`, `documentation/tests/e2e/playwright-e2e-guide.md`, éventuelle note dédiée à `e2e/documentation/`.

**Actions** :

- documenter le nom du parcours, sa commande d'exécution et ses sorties attendues ;
- expliciter où trouver le JSON intermédiaire et les screenshots produits ;
- lister les critères de clôture : spec complète, captures exploitables, ordre stable, JSON fidèle, output rangé dans `e2e/documentation/output/`.

---

## 4. Ordre recommandé

1. Choisir et verrouiller le premier parcours guide
2. Implémenter la spec documentaire complète
3. Stabiliser la production des screenshots et du JSON
4. Synchroniser la documentation d'usage

---

## 5. Validation prévue (non exécutée dans ce plan)

- exécution ciblée de `e2e:documentation` sur le premier parcours retenu ;
- vérification que les screenshots sont lisibles, stables et exempts de données sensibles ;
- vérification que le JSON produit reflète exactement les étapes capturées et leurs chemins d'artefacts ;
- relecture croisée `spec guide ↔ helpers documentaires ↔ output ↔ documentation E2E`.

---

## 6. Résultat attendu

Le projet dispose d'un premier parcours `*.guide.spec.ts` prêt à servir de référence pour la suite `e2e:documentation`, avec un enchaînement d'étapes clair, des screenshots ordonnés, un JSON intermédiaire structuré et une documentation d'usage alignée.
