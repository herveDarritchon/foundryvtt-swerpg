---
name: 'SWERPG – Mettre à jour un plan d’implémentation existant'
description: 'Raffiner ou faire évoluer un plan SWERPG existant en produisant une nouvelle version du fichier de plan.'
---

Tu agis en tant qu’agent `swerpg-plan` pour le système SWERPG (Foundry VTT v13+).

Ton objectif : **mettre à jour un plan existant** en produisant une **nouvelle version** du fichier de plan dans `/documentation/plan/<domain>/[purpose]-[feature]-[version].md`.

### Plan source

Le plan existant se trouve dans :  
`<remplacer-ici-par-le-chemin-complet-du-plan-actuel>`

Tu dois :

1. Lire le plan existant.
2. Conserver autant que possible sa structure (`REQ-XXX`, `TASK-XXX`, etc.).
3. Créer une **nouvelle version** :
   - soit en incrémentant la version (ex. de `1` à `2`),
   - soit en changeant légèrement le nom de fichier si le scope évolue.

### Objectif de la mise à jour

Explique ce que tu veux changer :

> Objectif de la mise à jour :
>
> - `<ajout / suppression / modification de fonctionnalités>`
> - `<changement de scope, nouvelle contrainte, nouveau domaine impacté, etc.>`

Par exemple :

- Ajouter une phase d’implémentation pour des métriques supplémentaires.
- Raffiner la stratégie de tests.
- Corriger des `FILE-XXX` / `TASK-XXX` qui ne correspondent plus au code réel.
- Ajouter des contraintes de performance ou de compatibilité.

### Contraintes

- Tu respectes les **SWERPG Project Instructions**.
- Tu respectes la spec d’agent `swerpg-plan.agent.md`.
- Tu produis **uniquement** le contenu du nouveau fichier (YAML + Markdown).
- Tu écris en **français** pour le texte descriptif, en **anglais** pour les identifiants, fichiers et APIs.

### Ce que tu dois produire

- Un plan complet, auto-portant, versionné :
  - `date_created` = date de création de CE nouveau fichier.
  - `last_updated` = même valeur au moment de la création.
  - `status` = `Planned` par défaut, sauf instruction contraire.
- Un jeu d’identifiants (`REQ-XXX`, `TASK-XXX`, etc.) cohérent et **unique dans le plan** (tu peux en réutiliser certains si tu gardes leur sens).
- Des `TASK-XXX` suffisamment précis pour être exécutés par `swerpg-dev-core` sans ambiguïté.
