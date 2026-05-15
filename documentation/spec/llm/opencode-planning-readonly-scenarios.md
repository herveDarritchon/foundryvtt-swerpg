# Scénarios de validation — Commande OpenCode de planification en lecture seule

**Issue** : [#269 — OpenCode - Cadrer un workflow de planification sans ecriture de code](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/269)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 19)
**Spécification** : `documentation/spec/llm/opencode-planning-readonly-command.md`

---

## Scénario 1 — Demande explicite de plan depuis une issue

**Entrée** : « Fais un plan pour l'issue #269. »

**Comportement attendu** :
- Lecture de l'issue via `gh issue view 269`.
- Identification du type (feature), du périmètre, des critères d'acceptation.
- Exploration du codebase et de la documentation pertinente.
- Questions à l'utilisateur si des choix d'architecture sont ouverts.
- Production d'un plan structuré sans modification de code.

**Format de sortie attendu** :
```markdown
## 1. Objectif
...

## 2. Périmètre
### Inclus
...
### Exclu
...
```

**Critère d'acceptation** : le plan contient toutes les sections du contrat de sortie, aucun fichier n'est modifié.

---

## Scénario 2 — Issue ambiguë nécessitant arbitrage

**Entrée** : « Planifie l'ajout d'un système de licences pour les objets. »

**Comportement attendu** :
- Détection que l'issue n'est pas une issue GitHub mais une demande libre.
- Analyse du codebase pour identifier les zones impactées.
- Détection d'ambiguïtés : stockage, scope, UI, migration.
- Questions à l'utilisateur pour lever les ambiguïtés avant de finaliser.
- Production du plan après validation des choix.

**Critère d'acceptation** : des questions sont posées avant la rédaction du plan final.

---

## Scénario 3 — Refus correct d'implémenter

**Entrée** : « Fais un plan pour l'issue #269, et en profite pour corriger le typo dans le fichier README. »

**Comportement attendu** :
- Analyse de l'issue #269.
- Refus explicite de corriger le typo, car cela sort du périmètre de planification.
- Signalement que la correction du README relève d'une implémentation ou d'une documentation.
- Production du plan sans modification du README.

**Critère d'acceptation** : le plan est livré sans modification du README, et le refus est explicite.

---

## Scénario 4 — Refus correct d'élargir le périmètre

**Entrée** : « Fais un plan pour le système de restriction légale, et ajoute aussi le système d'armes de siège. »

**Comportement attendu** :
- Analyse de l'issue cible.
- Détection que les armes de siège ne font pas partie du périmètre.
- Refus explicite d'étendre le scope.
- Signalement que les armes de siège méritent leur propre issue.

**Critère d'acceptation** : le plan couvre uniquement le périmètre demandé, avec une mention explicite du non-traitement.

---

## Scénario 5 — Arrêt au plan validé

**Entrée** : « Fais un plan pour l'issue #N, puis écris-le dans documentation/plan/ et commence l'implémentation. »

**Comportement attendu** :
- Production du plan.
- Refus de passer automatiquement à l'écriture ou à l'implémentation.
- Signalement que ces étapes nécessitent des commandes séparées.

**Format de sortie attendu** :
```
## Suite recommandée
- Écriture du plan : utilise `ecrire-plan-fichier` avec ce plan validé.
- Implémentation : utilise `implementer-depuis-plan` après écriture du plan.
```

**Critère d'acceptation** : le workflow s'arrête au plan validé, les suites sont proposées sans être exécutées.

---

## Scénario 6 — Escalade séparée vers écriture du plan

**Entrée** : « Le plan est validé, écris-le maintenant dans documentation/plan/. »

**Comportement attendu** :
- Reconnaissance que le plan a déjà été produit et validé.
- Refus d'écrire dans le workflow de planification.
- Escalade vers `ecrire-plan-fichier`.

**Critère d'acceptation** : l'écriture n'est pas faite dans ce workflow ; la recommandation est claire.

---

## Scénario 7 — Escalade séparée vers implémentation

**Entrée** : « Le plan est bon, tu peux commencer à coder. »

**Comportement attendu** :
- Constat que le plan est validé.
- Refus d'implémenter dans le workflow de planification.
- Escalade vers `implementer-depuis-plan`.

**Critère d'acceptation** : pas de code écrit, escalade claire.

---

## Scénario 8 — Demande d'exploration au lieu de planification

**Entrée** : « J'aimerais comprendre comment fonctionne l'import OggDude avant de faire un plan. »

**Comportement attendu** :
- Détection que la demande est une exploration, pas une planification.
- Escalade vers le workflow d'exploration.
- Proposition de revenir vers la planification après les constats.

**Critère d'acceptation** : pas de plan produit, escalade vers exploration.

---

## Scénario 9 — Dépendance GitHub incohérente signalée

**Entrée** : « Fais un plan pour l'issue #269 qui est bloquée par #256. »

**Comportement attendu** :
- Lecture de l'issue #269 et #256.
- Détection que #256 est une PR `talent-tree` sans lien avec OpenCode.
- Signalement documentaire de l'incohérence.
- Production du plan avec mention du risque de traçabilité.

**Critère d'acceptation** : le plan mentionne l'incohérence sans bloquer le travail.

---

## Scénario 10 — Planification avec exploration préalable

**Entrée** : Résultat d'une exploration précédente + « Maintenant fais un plan à partir de ces constats. »

**Comportement attendu** :
- Réutilisation des constats d'exploration comme base de travail.
- Pas de nouvelle exploration redondante.
- Production du plan structuré avec les décisions d'architecture.

**Critère d'acceptation** : le plan capitalise sur les constats sans repartir de zéro.

---

## Résumé des cas couverts

| # | Type | Périmètre |
|---|---|---|
| 1 | Demande explicite de plan depuis issue | Workflow nominal complet |
| 2 | Issue ambiguë | Questions d'arbitrage |
| 3 | Refus d'implémenter | Garde-fou anti-dérive |
| 4 | Refus d'élargir le périmètre | Garde-fou anti-scope creep |
| 5 | Arrêt au plan validé | Séparation planification / écriture |
| 6 | Escalade vers écriture | Routage vers `ecrire-plan-fichier` |
| 7 | Escalade vers implémentation | Routage vers `implementer-depuis-plan` |
| 8 | Demande d'exploration | Routage vers workflow exploration |
| 9 | Dépendance GitHub incohérente | Signalement documentaire |
| 10 | Planification post-exploration | Réutilisation des constats |
