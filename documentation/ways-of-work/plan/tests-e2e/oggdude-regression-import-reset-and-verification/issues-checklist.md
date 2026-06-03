# Issues Checklist — Tests E2E / OggDude Regression Import Reset and Verification

## Préparation

- [ ] Relire `documentation/cadrage/tests/e2e/import-oggdude-save.md`
- [ ] Relire `documentation/tests/e2e/playwright-e2e-guide.md`
- [ ] Confirmer le rattachement à l'epic `Tests E2E`
- [ ] Préparer les labels `feature`, `user-story`, `enabler`, `test`, `priority-*`, `value-*`, `playwright`, `foundry`, `oggdude`, `testing`

## Création Epic / Feature

- [ ] Créer ou réutiliser l'epic `Tests E2E`
- [ ] Créer la feature `OGR0 - Fiabiliser la régression E2E d'import OggDude par cleanup et vérification d'objets`
- [ ] Renseigner `Priority = P1`, `Value = High`, `Component = Testing / Playwright / Foundry / OggDude`
- [ ] Poser la dépendance feature vers l'epic

## Stories / Enabler / Test à créer

### OGR1 — Contrat cible du scénario

- [ ] Titre : `OGR1 - Clarifier le contrat cible du scénario OggDude de régression`
- [ ] AC : mode d'import attendu explicite, objets sentinelles choisis, source ZIP de référence confirmée, distinction world/compendium documentée
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : Feature

### OGR2 — Cleanup déterministe

- [ ] Titre : `OGR2 - Ajouter le cleanup déterministe des items monde et compendiums world OggDude`
- [ ] AC : suppression des items monde avant scénario, suppression des compendiums world ciblés avant scénario, périmètre destructif borné au monde E2E, stratégie compatible rerun
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `OGR1`

### OGR3 — Vérification des objets importés

- [ ] Titre : `OGR3 - Vérifier les objets importés depuis le ZIP OggDude dans le monde`
- [ ] AC : au moins un ensemble d'objets sentinelles est vérifié après import, les assertions portent sur des données créées par le ZIP, le scénario échoue si les objets attendus sont absents
- [ ] Estimate : `3`
- [ ] Priority : `P1`
- [ ] Bloquée par : `OGR1`, `OGR2`

### OGR4 — Alignement helpers / assertions

- [ ] Titre : `OGR4 - Aligner les helpers et assertions avec le mode d'import attendu`
- [ ] AC : helpers d'import et de vérification expriment le même contrat, les checks compendium ne subsistent que s'ils sont réellement attendus, fermeture des dialogs et post-conditions clarifiées
- [ ] Estimate : `2`
- [ ] Priority : `P2`
- [ ] Bloquée par : `OGR1`, `OGR3`

### OGR5 — Validation de répétabilité

- [ ] Titre : `OGR5 - Valider le rerun sans pollution résiduelle ni faux positif`
- [ ] Cas : relance du scénario sans reset manuel, absence de données parasites héritées, absence d'erreur navigateur non autorisée, import réellement reconstitué
- [ ] Estimate : `2`
- [ ] Priority : `P1`
- [ ] Bloquée par : `OGR2`, `OGR3`, `OGR4`

## Sous-tâches recommandées

- [ ] Ajouter une task de sélection des objets sentinelles stables issus du ZIP de test
- [ ] Ajouter une task de cleanup API-first des items monde
- [ ] Ajouter une task de cleanup API-first des compendiums world du monde de régression
- [ ] Ajouter une task de sécurisation du filtrage sur le package du monde E2E
- [ ] Ajouter une task de vérification post-import côté répertoire `Items`
- [ ] Ajouter une task de revue du helper `verifyOggDudeCompendiums` selon le mode `toCompendium`
- [ ] Ajouter une task de validation de rerun sur monde déjà utilisé

## Dépendances GitHub à poser

- [ ] Feature **blocked by** Epic `Tests E2E`
- [ ] `OGR1` **blocked by** Feature
- [ ] `OGR2` **blocked by** `OGR1`
- [ ] `OGR3` **blocked by** `OGR1`
- [ ] `OGR3` **blocked by** `OGR2`
- [ ] `OGR4` **blocked by** `OGR1`
- [ ] `OGR4` **blocked by** `OGR3`
- [ ] `OGR5` **blocked by** `OGR2`, `OGR3`, `OGR4`

## Board / pilotage

- [ ] Ajouter toutes les issues au board Kanban
- [ ] Mettre `OGR1` puis `OGR2` en `Sprint Ready` en premier
- [ ] Ouvrir `OGR3` dès que le périmètre de cleanup et les objets sentinelles sont validés
- [ ] Traiter `OGR4` comme issue de cohérence de contrat, pas comme finition cosmétique
- [ ] Garder `OGR5` pour verrouiller la preuve de répétabilité avant clôture feature

## Checklist de clôture

- [ ] Le scénario d'import OggDude est rejouable sans intervention manuelle
- [ ] Les items monde importés précédemment sont supprimés avant exécution
- [ ] Les compendiums world ciblés sont supprimés avant exécution
- [ ] Le scénario vérifie des objets réellement importés depuis le ZIP
- [ ] Les assertions world/compendium sont cohérentes avec le mode d'import choisi
- [ ] Les faux positifs dus à un état résiduel sont éliminés du périmètre couvert
