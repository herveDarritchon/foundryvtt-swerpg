# Issues Checklist — Documentation / E2E Documentation User Guide Generation with Playwright and AI

## Préparation

- [ ] Relire `documentation/cadrage/documentation/e2e-documentation-user-guide-generation-with-playwright-and-ai.md`
- [ ] Relire `documentation/tests/e2e/playwright-e2e-guide.md`
- [ ] Confirmer le rattachement à l'epic `Documentation`
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `documentation`, `playwright`, `ai`

## Création Epic / Feature

- [ ] Créer ou réutiliser l'epic `Documentation`
- [ ] Créer la feature `Documentation E2E User Guides - Produire des guides utilisateur à partir de parcours Playwright`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Documentation / Testing / Playwright / AI`
- [ ] Poser la dépendance feature vers l'epic

## Stories / Enabler / Test à créer

### EDG1 — Contrat de la suite documentaire

- [ ] Titre : `EDG1 - Cadrer la suite e2e:documentation et sa configuration dédiée`
- [ ] AC : commande dédiée isolée, specs `*.guide.spec.ts` séparées, structure de sortie explicitée, frontière avec smoke/regression définie
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### EDG2 — Socle déterministe documentaire

- [ ] Titre : `EDG2 - Mettre en place un monde documentaire déterministe et les helpers d'artefacts`
- [ ] AC : monde dédié identifié, reset visuel documenté, screenshots nommés de façon stable, writer JSON et métadonnées prévus
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `EDG1`

### EDG3 — Premier parcours guide complet

- [ ] Titre : `EDG3 - Livrer un premier parcours *.guide.spec.ts avec screenshots et JSON`
- [ ] AC : un parcours documentaire complet existe, chaque étape importante est capturée, le JSON reflète fidèlement les étapes, les captures sont exploitables
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `EDG1`, `EDG2`

### EDG4 — Génération Markdown séparée

- [ ] Titre : `EDG4 - Générer un user guide Markdown en anglais via commande séparée`
- [ ] AC : commande distincte disponible, prompt strict défini, génération Markdown basée uniquement sur les artefacts fournis, screenshots correctement référencés
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `EDG3`

### EDG5 — Exploitation et gouvernance

- [ ] Titre : `EDG5 - Documenter l'exploitation, la gouvernance et la séparation avec smoke/regression`
- [ ] AC : mode de relance documenté, rôles Dev/QA vs Documentation clarifiés, non-objectifs rappelés, usage hors CI bloquante explicité
- [ ] Estimate : `2`
- [ ] Priority : `P2`
- [ ] Bloquée par : `EDG1`, `EDG4`

### EDG6 — Validation finale

- [ ] Titre : `EDG6 - Valider la stabilité des captures, la sûreté des données et la checklist de release`
- [ ] Cas : captures stables, absence de données sensibles, JSON et Markdown cohérents, relecture humaine prévue, critères d'acceptation couverts
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `EDG3`, `EDG4`, `EDG5`

## Sous-tâches recommandées

- [ ] Ajouter une task de cadrage des scripts `e2e:documentation`, `docs:generate-user-guides` et `docs:user-guides`
- [ ] Ajouter une task de normalisation des screenshots et du viewport
- [ ] Ajouter une task de reset du monde documentaire et de nettoyage des éléments parasites
- [ ] Ajouter une task de writer JSON / recorder des étapes documentaires
- [ ] Ajouter une task de premier guide de référence avec screenshots ordonnés
- [ ] Ajouter une task de prompt IA strict et de génération Markdown sans hallucination
- [ ] Ajouter une task de revue humaine et de validation des captures sensibles

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Documentation`
- [ ] `EDG1` **blocked by** Feature
- [ ] `EDG2` **blocked by** `EDG1`
- [ ] `EDG3` **blocked by** `EDG1`
- [ ] `EDG3` **blocked by** `EDG2`
- [ ] `EDG4` **blocked by** `EDG3`
- [ ] `EDG5` **blocked by** `EDG1`
- [ ] `EDG5` **blocked by** `EDG4`
- [ ] `EDG6` **blocked by** `EDG3`, `EDG4`, `EDG5`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `EDG1` puis `EDG2` en `Sprint Ready` en premier
- [ ] Ouvrir `EDG3` dès que le monde documentaire et les helpers sont jugés stables
- [ ] Garder `EDG5` comme garde-fou de gouvernance, pas comme documentation annexe facultative
- [ ] Réserver `EDG6` pour verrouiller stabilité, sécurité et clôture

## Checklist de clôture

- [ ] La suite documentaire est explicitement distincte des suites smoke et regression
- [ ] Les captures sont stables, lisibles et exemptes de données sensibles
- [ ] Le premier parcours documentaire produit screenshots, JSON et Markdown cohérents
- [ ] La génération IA reste bornée aux données fournies et relue par un humain
- [ ] Les commandes de relance et la gouvernance de maintenance sont documentées
- [ ] Les dépendances GitHub et critères de done sont posés sans ambiguïté
