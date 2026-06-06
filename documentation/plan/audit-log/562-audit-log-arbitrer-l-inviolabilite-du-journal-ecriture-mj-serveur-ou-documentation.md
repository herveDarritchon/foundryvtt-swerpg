# Issue #562 — Audit Log : arbitrer l’inviolabilité du journal (écriture MJ/serveur ou documentation)

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/562  
**Domaine métier** : `audit-log`

## Goal

Acter puis rendre explicite le niveau de confiance du journal Audit Log afin d’éviter une promesse implicite de traçabilité inviolable alors que le stockage actuel sur l’acteur reste modifiable par son propriétaire.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` identifie **AL3 / AUDIT-03** : le journal vit aujourd’hui dans `flags.swerpg.logs` sur l’acteur et l’audité peut donc altérer ou purger son propre historique.
- Le correctif **#560** traite le doublonnage multijoueur via un garde mono-écrivain, mais ne change pas le niveau d’intégrité du stockage.
- Les permissions de lecture/export sont déjà cadrées côté UI ; le point restant est bien l’**arbitrage du contrat d’inviolabilité**, pas une refonte générale de l’interface Audit Log.
- L’issue ouvre explicitement deux sorties acceptables : **durcir l’écriture/stockage côté MJ/serveur** ou **documenter clairement que le journal est indicatif et non inviolable**.

## Plan d’implémentation

### Étape 1 — Acter le contrat de confiance cible

**Fichiers** : `documentation/audit/audit-log/audit-feature-audit-log.md` ; ADR dédiée uniquement si l’option retenue modifie l’architecture de persistance

**What** :

- Décider explicitement si l’objectif produit est un journal **informatif** ou un journal **autoritaire**.
- Formaliser les critères de décision : qui écrit, où le journal est stocké, qui peut le modifier, et quel niveau de preuve l’UI est autorisée à revendiquer.
- Si aucune persistance protégée MJ/serveur n’est retenue dans ce cycle, acter sans ambiguïté la voie documentation plutôt qu’une promesse de sécurité partielle.

**Résultat attendu** : un contrat de confiance unique, explicite et partageable, qui supprime l’ambiguïté fonctionnelle de l’issue.

### Étape 2 — Appliquer la voie retenue sans mélange de promesses

**Option A — Documentation assumée**

**Fichiers** : documentation Audit Log et toute surface utilisateur décrivant la feature

**What** :

- Documenter que le journal actuel est **indicatif, consultable et exportable**, mais **non inviolable** tant qu’il reste stocké sur l’acteur.
- Aligner le wording UI/doc pour éviter toute formulation laissant entendre une preuve infalsifiable.
- Ajouter une note de limites connues reliant cette décision à la backlog d’un éventuel durcissement futur.

**Résultat attendu** : plus aucune ambiguïté entre le comportement réel du système et la promesse faite aux MJ/joueurs.

**Option B — Écriture/stocker autoritaires côté MJ/serveur**

**Fichiers** : pipeline Audit Log d’écriture/lecture, emplacement de persistance retenu, tests ciblés, documentation d’architecture associée

**What** :

- Déplacer l’autorité d’écriture et le stockage vers un support que l’audité ne peut pas modifier directement.
- Adapter la lecture/export pour conserver l’expérience actuelle de consultation sans reposer sur un flag acteur falsifiable.
- Encadrer par des tests ciblés le fait qu’un propriétaire d’acteur ne peut plus altérer seul le journal autoritaire.

**Résultat attendu** : le niveau d’intégrité promis par la feature devient techniquement cohérent avec son architecture de stockage.

### Étape 3 — Verrouiller la clôture de l’issue par des critères ciblés

**Fichiers** : documentation et/ou tests strictement alignés sur l’option retenue

**What** :

- Pour la voie documentation : vérifier que les docs et libellés exposés n’emploient plus un vocabulaire de preuve/inviolabilité.
- Pour la voie autoritaire : vérifier que l’écriture protégée, la lecture MJ/OWNER et l’export continuent de fonctionner sans retour au flag acteur éditable.
- Maintenir le périmètre strict de l’issue : ne pas embarquer la taxonomie Audit Log, le durcissement CSV ou d’autres refactors non requis.

**Résultat attendu** : l’issue se ferme sur une définition claire, vérifiable et non trompeuse de la fiabilité du journal.

## Périmètre / hors périmètre

### Inclus

- Arbitrage explicite du statut de confiance du journal Audit Log
- Mise en cohérence de la documentation et/ou de l’architecture avec cet arbitrage
- Validation ciblée du contrat retenu

### Exclus

- Refonte générale de l’application Audit Log
- Consolidation de taxonomie, durcissement CSV, ou autres items backlog AUDIT-04+
- Travaux hors sujet sur d’autres journaux, chats ou pipelines de progression
