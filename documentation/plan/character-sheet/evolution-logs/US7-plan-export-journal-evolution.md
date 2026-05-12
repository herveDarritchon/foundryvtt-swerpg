# Plan d'implémentation — US7 : Exporter le journal d'évolution du personnage

**Issue** : [#157 — US7: Exporter le journal d'évolution du personnage](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/157)  
**Epic** : [#150 — EPIC: Système de logs d'évolution du personnage (Character Audit Log)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/150)  
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`, `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`, `documentation/architecture/adr/adr-0005-localization-strategy.md`  
**Module(s) impacté(s)** : `module/applications/character-audit-log.mjs` (modification), `templates/applications/character-audit-log.hbs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/applications/character-audit-log.test.mjs` (modification), `documentation/tests/manuel/audit-log/README.md` (modification)

---

## 1. Objectif

Ajouter, depuis la fenêtre de consultation du journal d'évolution du personnage livrée en US6, une fonctionnalité d'export au format CSV téléchargé directement par le navigateur.

L'export doit permettre à un MJ d'archiver, partager ou analyser le journal hors de Foundry, sans modifier la persistance existante, sans stockage serveur, et sans dépendre du filtre actif dans l'interface.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Ajout d'un bouton `Exporter` dans la fenêtre `CharacterAuditLogApp`
- Génération d'un fichier CSV à partir de `actor.flags.swerpg.logs`
- Téléchargement local via le navigateur
- Construction d'un nom de fichier slugifié basé sur :
  - nom du personnage ;
  - propriétaire `OWNER` principal s'il existe, sinon `unknown-player` ;
  - date d'export
- Export de toutes les entrées du journal, même si un filtre est actif dans l'UI
- Ajout des clés i18n FR/EN nécessaires
- Couverture de tests automatisés et mise à jour des scénarios manuels

### Exclu de cette US / ce ticket

- Export JSON, PDF ou autre format
- Stockage d'un fichier sur le serveur Foundry
- Persistance d'un historique des exports
- Export limité au sous-ensemble visible après filtrage
- Refonte du modèle de données des logs
- Nouvelle fenêtre d'export séparée de `CharacterAuditLogApp`
- Paramétrage utilisateur du séparateur CSV, de l'encodage ou des colonnes

---

## 3. Constat sur l'existant

### 3.1. La fenêtre de consultation existe déjà

`module/applications/character-audit-log.mjs` expose déjà :

- `canViewAuditLog(actor, user)`
- `buildAuditLogDescription(entry)`
- `buildAuditLogEntries(actor, filter)`
- l'application `CharacterAuditLogApp`

Cette base fournit déjà :

- le contrôle d'accès ;
- le tri chronologique inverse ;
- les labels localisés ;
- les descriptions lisibles ;
- le filtrage métier purement UI.

### 3.2. Le journal reste stocké dans les flags

Conformément à `ADR-0011`, les entrées sont stockées dans `actor.flags.swerpg.logs`.  
US7 n'a pas besoin d'ajouter de nouveau stockage ni de modifier le data model.

### 3.3. Le filtre actif ne doit pas influencer l'export

L'issue impose que l'export contienne toutes les entrées, même si un filtre est actif.  
Le code actuel de `buildAuditLogEntries(actor, filter)` filtre la vue ; il ne doit donc pas être utilisé tel quel comme source directe de l'export si cela introduit un risque de n'exporter qu'un sous-ensemble.

### 3.4. Aucun utilitaire d'export CSV/téléchargement n'est présent dans ce périmètre

Le repo ne montre pas de primitive déjà en place pour :

- sérialiser une liste métier en CSV ;
- déclencher un téléchargement navigateur avec `Blob` ;
- normaliser les noms de fichiers d'export dans cette fonctionnalité.

US7 devra donc formaliser ce comportement dans le module applicatif existant.

### 3.5. Les tests existants couvrent déjà l'application du journal

`tests/applications/character-audit-log.test.mjs` couvre déjà :

- permissions ;
- tri et filtrage ;
- fallback de description ;
- non-rendu sans permission.

US7 peut s'appuyer sur ce fichier pour ajouter les tests d'export sans créer une nouvelle famille de tests inutile.

---

## 4. Décisions d'architecture

### 4.1. Point d'entrée UX : réutiliser `CharacterAuditLogApp`

**Décision** : Ajouter le bouton d'export dans la fenêtre existante `CharacterAuditLogApp`.

Options envisagées :

- bouton dans la fenêtre de consultation existante ;
- bouton directement dans la fiche personnage ;
- nouvelle fenêtre ou dialogue d'export dédiée.

Décision retenue : bouton dans `CharacterAuditLogApp`.

Justification :

- US6 a déjà établi cette fenêtre comme point d'entrée naturel du journal ;
- l'issue mentionne explicitement la fenêtre de consultation du journal ;
- cela évite de dupliquer les contrôles d'accès et le contexte métier.

### 4.2. Export depuis la source brute, pas depuis la vue filtrée

**Décision** : Construire l'export à partir de `actor.flags.swerpg.logs` complet, puis enrichir les lignes sans appliquer le filtre UI actif.

Justification :

- conforme à l'AC 4 ;
- évite toute dépendance accidentelle à `this.filter` ;
- garde une séparation nette entre vue filtrée et export exhaustif.

### 4.3. Logique d'export dans `module/applications/character-audit-log.mjs`

**Décision** : Ajouter des helpers nommés testables dans le même module applicatif, plutôt que créer un nouveau fichier utilitaire.

Options envisagées :

- logique dans le module existant ;
- nouveau `module/utils/audit-log-export.mjs`.

Décision retenue : rester dans `character-audit-log.mjs`.

Justification :

- changement minimal ;
- la logique d'enrichissement et de libellés est déjà dans ce module ;
- limite la dispersion des responsabilités pour une feature strictement UI.

### 4.4. Téléchargement navigateur via `Blob`

**Décision** : Utiliser `Blob` + `URL.createObjectURL()` + lien temporaire + `click()` + révocation de l'URL.

Justification :

- conforme à l'AC 3 ;
- ne dépend pas d'un backend ;
- reste compatible avec une application Foundry côté client.

### 4.5. Nom de fichier basé sur le personnage, le propriétaire principal et la date d'export

**Décision** : Le nom de fichier slugifié suit la forme :

`<character-name>_<owner-name-or-unknown-player>_<export-date>.csv`

Le “nom du joueur” est résolu comme le propriétaire `OWNER` principal s'il existe, sinon `unknown-player`.

Justification :

- choix validé par le demandeur ;
- plus stable que le nom de l'utilisateur courant exporteur ;
- mieux adapté à l'archivage et au partage entre MJ.

### 4.6. CSV orienté usage humain + tableur

**Décision** : Exporter un CSV lisible dans Excel/LibreOffice avec colonnes métier stables, et non un dump JSON aplati.

Colonnes recommandées :

- `timestamp`
- `date`
- `userName`
- `type`
- `typeLabel`
- `description`
- `xpDelta`
- `actorName`
- `playerName`

Justification :

- couvre les AC : date, type, description, variation d'XP ;
- évite un format trop technique ;
- reste suffisamment riche pour analyse externe simple.

### 4.7. Description et labels localisés au moment de l'export

**Décision** : Réutiliser les descriptions et labels localisés générés à partir des clés i18n au moment de l'export.

Justification :

- conforme à `ADR-0005` ;
- cohérent avec l'UI existante ;
- évite de persister des textes dépendants de la langue dans les flags.

### 4.8. Pas de dépendance à l'ordre d'affichage filtré

**Décision** : L'export conserve un ordre déterministe basé sur la chronologie complète, indépendamment du filtre actif.

Justification :

- l'utilisateur peut exporter depuis n'importe quel état de l'UI ;
- l'export doit refléter l'historique complet, non l'état de lecture courant.

---

## 5. Plan de travail détaillé

### Étape 1 : Ajouter l'action d'export dans l'application

**Quoi faire** :

- Ajouter une nouvelle action V2 dans `CharacterAuditLogApp`
- Prévoir un handler d'export dédié
- Rendre le bouton visible seulement pour les utilisateurs autorisés à consulter le journal

**Fichiers** :

- `module/applications/character-audit-log.mjs`
- `templates/applications/character-audit-log.hbs`

**Risques spécifiques** :

- rendre le bouton actif alors que l'utilisateur ne peut pas ouvrir ou exporter ;
- introduire une action trop couplée au markup.

### Étape 2 : Définir les helpers de préparation du CSV

**Quoi faire** :

- Lire la liste complète des logs bruts depuis `actor.flags.swerpg.logs`
- Construire une projection export indépendante du filtre UI
- Réutiliser les helpers existants pour :
  - label de type ;
  - description ;
  - formatage de date ;
- Définir un mapping colonnes -> valeurs stable et testable

**Fichiers** :

- `module/applications/character-audit-log.mjs`

**Risques spécifiques** :

- dépendance involontaire à la vue filtrée ;
- divergence entre la description UI et la description exportée.

### Étape 3 : Générer un CSV robuste

**Quoi faire** :

- Sérialiser l'en-tête et les lignes
- Gérer l'échappement CSV :
  - virgules ;
  - guillemets ;
  - retours à la ligne ;
- Garantir un encodage compatible tableur
- Définir le séparateur retenu et le documenter dans les tests si nécessaire

**Fichiers** :

- `module/applications/character-audit-log.mjs`

**Risques spécifiques** :

- CSV invalide si une description contient des guillemets ou des sauts de ligne ;
- mauvaise ouverture dans Excel selon l'encodage.

### Étape 4 : Construire le nom de fichier d'export

**Quoi faire** :

- Résoudre le propriétaire `OWNER` principal
- Prévoir le fallback `unknown-player`
- Slugifier :
  - nom du personnage ;
  - nom du propriétaire ;
  - date d'export ;
- Produire un nom de fichier stable en `.csv`

**Fichiers** :

- `module/applications/character-audit-log.mjs`

**Risques spécifiques** :

- absence de propriétaire explicite ;
- caractères spéciaux ou accents produisant un nom de fichier fragile ;
- ambiguïté si plusieurs owners existent.

### Étape 5 : Déclencher le téléchargement navigateur

**Quoi faire** :

- Créer un `Blob` de type CSV
- Générer une URL objet temporaire
- Déclencher le téléchargement via un lien temporaire
- Libérer les ressources associées après usage
- Prévoir un message d'erreur localisé si l'export échoue

**Fichiers** :

- `module/applications/character-audit-log.mjs`
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- fuite mémoire si l'URL n'est pas révoquée ;
- erreur silencieuse côté navigateur ;
- absence de feedback utilisateur en cas d'échec.

### Étape 6 : Mettre à jour le template de la fenêtre

**Quoi faire** :

- Ajouter le bouton `Exporter` dans le header ou la zone d'actions de la fenêtre
- Ajouter le libellé, tooltip et attributs d'accessibilité
- Préserver la lisibilité des filtres existants et la hiérarchie visuelle

**Fichiers** :

- `templates/applications/character-audit-log.hbs`

**Risques spécifiques** :

- surcharge du header ;
- collision visuelle avec les filtres.

### Étape 7 : Compléter l'i18n

**Quoi faire** :

- Ajouter les clés FR/EN pour :
  - le bouton d'export ;
  - l'info-bulle ;
  - le message d'erreur d'export ;
  - éventuellement les en-têtes de colonnes exportées si elles sont localisées

**Fichiers** :

- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :

- désynchronisation FR/EN ;
- noms de colonnes trop techniques pour l'utilisateur final.

### Étape 8 : Ajouter les tests et scénarios manuels

**Quoi faire** :

- Ajouter des tests pour :
  - construction du CSV ;
  - échappement des cellules ;
  - exhaustivité malgré filtre actif ;
  - nom de fichier avec owner principal et fallback ;
  - déclenchement du téléchargement ;
- Étendre le README de tests manuels de l'audit log avec un scénario d'export

**Fichiers** :

- `tests/applications/character-audit-log.test.mjs`
- `documentation/tests/manuel/audit-log/README.md`

**Risques spécifiques** :

- mocks navigateur insuffisants (`Blob`, `URL.createObjectURL`) ;
- tests trop couplés au détail d'implémentation.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---------|--------|---------------------------|
| `module/applications/character-audit-log.mjs` | Modification | Ajout des helpers d'export CSV, du calcul du nom de fichier, et du handler de téléchargement |
| `templates/applications/character-audit-log.hbs` | Modification | Ajout du bouton `Exporter` dans l'UI du journal |
| `lang/fr.json` | Modification | Ajout des clés FR liées à l'export |
| `lang/en.json` | Modification | Ajout des clés EN liées à l'export |
| `tests/applications/character-audit-log.test.mjs` | Modification | Couverture automatisée de la génération CSV et du téléchargement |
| `documentation/tests/manuel/audit-log/README.md` | Modification | Ajout des scénarios manuels d'export CSV |

---

## 7. Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| L'export réutilise par erreur la vue filtrée | Fichier incomplet, non conforme à l'AC | Séparer explicitement la source brute d'export de la fonction de filtrage UI |
| Le propriétaire principal n'est pas trivial à déterminer | Nom de fichier incohérent | Documenter la règle de sélection et tester le fallback `unknown-player` |
| Des champs contiennent des virgules, guillemets ou retours à la ligne | CSV cassé ou mal interprété | Ajouter une fonction d'échappement centralisée et des tests dédiés |
| L'encodage ouvre mal dans Excel | Mauvaise lisibilité côté utilisateur | Valider le format de sortie avec tests et scénario manuel |
| Le téléchargement navigateur échoue silencieusement | Fonction perçue comme cassée | Ajouter notification localisée en cas d'erreur et tests de comportement |
| Le header de la fenêtre devient chargé | Dégradation UX | Garder un seul bouton discret et cohérent avec la mise en page existante |
| Désynchronisation FR/EN | Export partiellement localisé | Ajouter les deux langues dans la même étape et vérifier la parité |

---

## 8. Proposition d'ordre de commit

1. `feat(audit-log-ui): add csv export action to character audit log`
2. `feat(audit-log-export): generate full history csv and browser download`
3. `i18n(audit-log-export): add localized labels and export messages`
4. `test(audit-log-export): cover csv generation, filename, and download flow`
5. `docs(audit-log): add manual export scenarios`

---

## 9. Dépendances avec les autres US

- **Dépend de** :
  - `#151` / US1 pour l'infrastructure de stockage ;
  - `#152` / US2 pour les champs enrichis des compétences ;
  - `#153` / US3 pour les caractéristiques ;
  - `#155` / US5 pour les choix fondamentaux ;
  - `#156` / US6 pour la fenêtre de consultation servant de point d'entrée ;
  - `#159` / TECH-159 pour l'analyse structurée des entrées ;
  - `#161` / TECH-161 pour le snapshot XP enrichi utile à de futurs exports plus avancés.

- **N'introduit pas de dépendance forte vers** :
  - une migration de données ;
  - un nouveau modèle `system.*` ;
  - un backend de fichier.

- **Prépare potentiellement** :
  - un export enrichi futur (JSON, PDF, analytics), sans remettre en cause le stockage actuel.

## 10. Décisions validées avec le demandeur

1. Le point d'entrée d'export reste la fenêtre existante `CharacterAuditLogApp`.
2. L'export lit toute la source `flags.swerpg.logs`, sans tenir compte du filtre actif.
3. Le téléchargement se fait côté navigateur uniquement.
4. Le nom de fichier slugifié utilise le propriétaire `OWNER` principal s'il existe, sinon `unknown-player`.
