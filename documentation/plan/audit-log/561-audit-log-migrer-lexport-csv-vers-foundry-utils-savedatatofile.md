# Issue #561 — Audit Log : migrer l’export CSV vers `foundry.utils.saveDataToFile`

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/561  
**Domaine métier** : `audit-log`

## Goal

Sécuriser l’export CSV Audit Log sur la cible Foundry v14 en remplaçant l’appel implicite au global déprécié par l’API namespacée `foundry.utils.saveDataToFile`, sans changer le contenu exporté, le nom du fichier ni les permissions d’accès.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` identifie ce point comme **AL2 / AUDIT-02** : l’export CSV repose encore sur `saveDataToFile(...)` global, documenté comme déprécié au profit de `foundry.utils.saveDataToFile`.
- `module/applications/character-audit-log.mjs` concentre déjà tout le flux d’export : `#onExportCsv()` construit le CSV via `buildCsvContent()`, calcule le nom via `buildExportFilename()` puis déclenche le téléchargement.
- `tests/applications/character-audit-log.test.mjs` couvre aujourd’hui surtout les helpers CSV (échappement, contenu, nom de fichier), mais pas encore le contrat applicatif d’appel à l’utilitaire Foundry d’export.
- `tests/helpers/mock-foundry.mjs` est le point naturel si le mock Foundry doit exposer/stubber `foundry.utils.saveDataToFile` pour verrouiller la régression sans élargir le périmètre.

## Plan d’implémentation

### Étape 1 — Qualifier explicitement l’API Foundry utilisée pour l’export CSV

**Fichiers** : `module/applications/character-audit-log.mjs`

**What** :

- Remplacer l’appel implicite à `saveDataToFile(...)` par `foundry.utils.saveDataToFile(...)` dans `#onExportCsv()`.
- Garder inchangés le contrôle d’accès `canViewAuditLog()`, la génération du contenu CSV, la convention de nommage du fichier et la gestion d’erreur déjà en place.
- Limiter le correctif à la migration d’API visée par l’issue, sans introduire de refactor plus large du module Audit Log.

**Résultat attendu** : l’export CSV Audit Log dépend explicitement de l’API Foundry namespacée supportée par la cible v14, et non d’un global déprécié.

### Étape 2 — Verrouiller le contrat d’export applicatif par des tests ciblés

**Fichiers** : `tests/applications/character-audit-log.test.mjs`, `tests/helpers/mock-foundry.mjs` _(si nécessaire)_

**What** :

- Ajouter un test orienté application qui vérifie que l’action d’export appelle `foundry.utils.saveDataToFile` avec le contenu généré, le MIME `text/csv;charset=utf-8` et le nom calculé par `buildExportFilename()`.
- Ajouter le cas d’échec miroir confirmant que si `foundry.utils.saveDataToFile` lève, l’application journalise l’erreur et affiche `SWERPG.AUDIT_LOG.EXPORT_FAILED` sans casser le flux utilisateur.
- Étendre le mock Foundry uniquement au strict nécessaire pour rendre ce contrat testable de manière stable et explicite.

**Résultat attendu** : la migration vers `foundry.utils.saveDataToFile` est protégée par un test applicatif explicite et ne peut plus régresser silencieusement.

## Périmètre / hors périmètre

### Inclus

- Migration de l’appel d’export CSV Audit Log vers `foundry.utils.saveDataToFile`
- Tests ciblés couvrant le chemin nominal et le chemin d’erreur de l’export

### Exclus

- Changement du format CSV, des colonnes exportées ou du nommage du fichier
- Ajout du BOM UTF-8, durcissement anti-injection CSV ou autres améliorations backlog non demandées par l’issue
- Refonte plus large de l’application Audit Log, du modèle métier ou du pipeline d’écriture d’audit
