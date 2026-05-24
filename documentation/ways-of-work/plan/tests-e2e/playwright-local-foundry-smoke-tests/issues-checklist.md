# Issues Checklist — Tests E2E / Playwright Local Foundry Smoke Tests

## Préparation

- [ ] Relire `documentation/cadrage/tests/e2e/presentation_playwright_e_2_e_foundry_swerpg.md`
- [ ] Relire `documentation/tests/e2e/playwright-e2e-guide.md`
- [ ] Confirmer le rattachement à l'epic `Tests E2E`
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `playwright`, `foundry`, `testing`

## Création Epic / Feature

- [ ] Créer ou réutiliser l'epic `Tests E2E`
- [ ] Créer la feature `Playwright Local Foundry Smoke Tests - Sécuriser les parcours MJ essentiels en local`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Testing / Playwright / Foundry`
- [ ] Poser la dépendance feature vers l'epic

## Stories / Enabler / Test à créer

### PWE1 — Baseline locale E2E

- [ ] Titre : `PWE1 - Stabiliser la baseline locale Playwright et le monde E2E`
- [ ] AC : environnement local clarifié, monde de test identifié, conventions d'exécution locale confirmées, scope local-first explicite
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### PWE2 — Contrats d'interaction stables

- [ ] Titre : `PWE2 - Fiabiliser les contrats d'interaction et la capture d'erreurs navigateur`
- [ ] AC : locators critiques stabilisés, usages `getByRole`/`getByLabel` priorisés, `data-testid` ajoutés seulement si nécessaire, erreurs console non autorisées capturées
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PWE1`

### PWE3 — Smoke tests cœur de parcours

- [ ] Titre : `PWE3 - Couvrir les smoke tests de démarrage du monde et de création personnage`
- [ ] AC : démarrage monde validé, sidebar visible, système SWERPG actif, création personnage validée, fiche visible, absence d'erreur console
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PWE2`

### PWE4 — Smoke tests métier avancés

- [ ] Titre : `PWE4 - Couvrir la dépense simple d'XP et l'ouverture de l'arbre de spécialisation`
- [ ] AC : augmentation d'un rang simple, XP disponible mise à jour, persistance après réouverture, ouverture de l'arbre sans erreur bloquante, conteneur graphique visible
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PWE2`, `PWE3`

### PWE5 — Hygiène du monde de test

- [ ] Titre : `PWE5 - Formaliser l'hygiène du monde de test et la stratégie de reset`
- [ ] AC : monde jetable documenté, données minimales définies, politique noms uniques ou cleanup explicitée, reset reproductible décrit
- [ ] Estimate : `2`
- [ ] Priority : `P2`
- [ ] Bloquée par : `PWE1`

### PWE6 — Validation et frontière CI

- [ ] Titre : `PWE6 - Valider la non-régression locale, les erreurs console et la frontière CI`
- [ ] Cas : exécution locale ciblée, erreurs console surveillées, artefacts conservés à l'échec, stratégie `[ci]` explicitée pour les scénarios critiques seulement
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `PWE3`, `PWE4`, `PWE5`

## Sous-tâches recommandées

- [ ] Ajouter une task de validation du fichier `.env.e2e.local` et du monde cible
- [ ] Ajouter une task de revue des locators critiques côté UI Foundry / SWERPG
- [ ] Ajouter une task de capture des erreurs `console` et `pageerror`
- [ ] Ajouter une task dédiée au flux `monde -> personnage -> fiche`
- [ ] Ajouter une task dédiée au flux `XP simple -> persistance`
- [ ] Ajouter une task dédiée au flux `ouverture arbre de spécialisation`
- [ ] Ajouter une task de stratégie de nettoyage ou reset du monde E2E

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Tests E2E`
- [ ] `PWE1` **blocked by** Feature
- [ ] `PWE2` **blocked by** `PWE1`
- [ ] `PWE3` **blocked by** `PWE2`
- [ ] `PWE4` **blocked by** `PWE2`
- [ ] `PWE4` **blocked by** `PWE3`
- [ ] `PWE5` **blocked by** `PWE1`
- [ ] `PWE6` **blocked by** `PWE3`, `PWE4`, `PWE5`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `PWE1` puis `PWE2` en `Sprint Ready` en premier
- [ ] Ouvrir `PWE3` dès que les contrats d'interaction sont jugés stables
- [ ] Traiter `PWE5` comme garde-fou de maintenabilité, pas comme travail annexe optionnel
- [ ] Garder `PWE6` pour verrouiller les critères de clôture et la frontière CI

## Checklist de clôture

- [ ] La suite E2E reste courte et orientée parcours critiques
- [ ] Les scénarios ne dépendent pas de sélecteurs CSS décoratifs
- [ ] Les erreurs console inattendues sont visibles et traitées
- [ ] Les parcours monde / création personnage / XP simple / arbre de spécialisation sont couverts selon le scope retenu
- [ ] Le monde de test est jetable ou réinitialisable sans ambiguïté
- [ ] La distinction entre exécution locale complète et CI ciblée est documentée
