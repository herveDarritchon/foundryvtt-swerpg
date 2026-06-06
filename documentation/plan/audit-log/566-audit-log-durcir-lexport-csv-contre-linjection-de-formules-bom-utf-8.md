# Issue #566 — Audit Log : durcir l’export CSV contre l’injection de formules + BOM UTF-8

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/566  
**Domaine métier** : `audit-log`

## Goal

Sécuriser l’export CSV Audit Log contre l’exécution de formules dans Excel/Sheets et améliorer l’ouverture UTF-8 dans Excel FR, sans changer les colonnes exportées, le nom du fichier ni les permissions d’accès.

## Contexte utile

- `documentation/audit/audit-log/audit-feature-audit-log.md` référence explicitement ces deux écarts sous **AL8** (formula injection) et **AL13** (BOM UTF-8).
- `module/applications/character-audit-log.mjs` concentre déjà tout le pipeline d’export : `#onExportCsv()` appelle `buildCsvContent(this.actor)` puis télécharge le résultat via `foundry.utils.saveDataToFile(...)`.
- `escapeCsvCell()` protège aujourd’hui les virgules, guillemets et retours à la ligne, mais pas les préfixes dangereux `=`, `+`, `-`, `@`.
- `buildCsvContent()` renvoie actuellement un CSV UTF-8 sans BOM ; `tests/applications/character-audit-log.test.mjs` est déjà le garde-fou naturel pour verrouiller helpers et contrat applicatif d’export.

## Plan d’implémentation

### Étape 1 — Durcir la sérialisation CSV et préfixer le fichier avec un BOM UTF-8

**Fichiers** : `module/applications/character-audit-log.mjs`

**What** :

- Faire évoluer le chemin de sérialisation CSV pour neutraliser les cellules commençant par `=`, `+`, `-` ou `@`, en les préfixant d’une apostrophe avant l’échappement CSV final.
- Ajouter un préfixe BOM UTF-8 au payload exporté, au niveau du fichier complet, pour que le téléchargement commence bien par `\uFEFF` sans dupliquer ce marqueur dans chaque cellule.
- Garder le correctif strictement local au pipeline d’export Audit Log, sans toucher au stockage `flags.swerpg.logs`, au nommage du fichier, au MIME ni au contrôle d’accès existant.

**Résultat attendu** : un export CSV Audit Log ne déclenche plus de formule à l’ouverture et s’affiche correctement avec accents dans Excel FR.

### Étape 2 — Verrouiller la non-régression sur les helpers CSV et le contrat d’export

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**What** :

- Ajouter des tests ciblés sur `escapeCsvCell()` et/ou `buildCsvContent()` pour couvrir des valeurs représentatives commençant par `=`, `+`, `-` et `@`, tout en conservant le comportement existant sur virgules, guillemets et retours à la ligne.
- Étendre le test applicatif `#onExportCsv` pour vérifier que le contenu transmis à `foundry.utils.saveDataToFile` commence par le BOM UTF-8 et contient des cellules neutralisées quand les données source portent un préfixe dangereux.
- Garder les assertions focalisées sur le contenu exporté, sans élargir le périmètre aux filtres, au rendu UI Audit Log ou aux autres familles d’événements.

**Résultat attendu** : les deux durcissements demandés par l’issue sont couverts par des tests explicites et ne peuvent plus régresser silencieusement.

## Périmètre / hors périmètre

### Inclus

- Neutralisation des préfixes de formule dans l’export CSV Audit Log
- Ajout du BOM UTF-8 en tête du fichier exporté
- Mise à jour ciblée des tests Audit Log liés à l’export CSV

### Exclus

- Changement des colonnes, de leur ordre ou du format métier des lignes d’audit
- Refonte plus large de l’application Audit Log ou de ses helpers hors export CSV
- Durcissements supplémentaires non demandés (nouveau format de fichier, options d’export, sandbox tableur, etc.)
