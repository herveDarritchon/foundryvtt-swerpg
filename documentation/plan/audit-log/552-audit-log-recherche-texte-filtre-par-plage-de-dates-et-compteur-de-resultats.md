# Issue #552 — Audit Log : recherche texte, filtre par plage de dates et compteur de résultats

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/552  
**Domaine métier** : `audit-log`

## Goal

Faire du journal d’audit un outil de consultation plus exploitable en ajoutant une recherche texte, un filtre par plage de dates et un compteur de résultats visible, sans changer le modèle métier, la production des entrées ni le format d’export CSV.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-05**.
- L’écran Audit Log filtre aujourd’hui surtout par famille ; il manque un levier de recherche transversal sur les descriptions/types et un cadrage temporel consultable.
- Le besoin semble pouvoir rester 100% côté application, à partir des entrées déjà construites, sans refonte du stockage ni du pipeline d’audit.
- `tests/applications/character-audit-log.test.mjs` et `tests/utils/audit-log.test.mjs` sont les ancrages de non-régression probables pour verrouiller le contrat de filtrage et de comptage.

## Plan d’implémentation

### Étape 1 — Canoniser l’état de recherche et de filtrage temporel dans le view-model

**Fichiers** : `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs` _(si une aide pure de filtrage/normalisation est nécessaire)_

**What** :

- Définir un état de filtre applicatif couvrant au minimum : famille active, requête texte, date de début, date de fin, compteur filtré et compteur total.
- Appliquer la recherche texte sur les champs déjà visibles/consultables du journal (au minimum type/famille/libellé/description) avec une normalisation cohérente pour éviter une logique divergente entre rendu et filtrage.
- Normaliser la plage de dates côté client avec bornes inclusives et comportement sûr pour les cas incomplets (`from` seul, `to` seul, plage vide, `from > to`).

**Résultat attendu** : le contexte de l’application expose une seule source de vérité pour les entrées affichées et pour les compteurs associés.

### Étape 2 — Brancher les contrôles UI et le compteur sur la toolbar Audit Log

**Fichiers** : `templates/applications/character-audit-log.hbs`, `styles/applications.less`, `lang/en.json`, `lang/fr.json`

**What** :

- Ajouter à la toolbar un champ de recherche texte, deux contrôles de date (`from` / `to`) et un compteur de résultats lisible (`filteredCount` / `totalCount`) sans casser les filtres de famille ni l’action d’export existants.
- Rendre explicitement l’état vide “aucun résultat” quand les filtres ne retournent rien, en distinguant ce cas d’un journal réellement vide.
- Préserver le comportement actuel de consultation locale : pas de requête serveur, pas de pagination, pas de changement du CSV dans ce chantier.

**Résultat attendu** : l’utilisateur peut retrouver rapidement un événement par mot-clé ou période et comprend immédiatement combien d’entrées correspondent aux filtres en cours.

### Étape 3 — Verrouiller les règles de filtrage et les cas limites de consultation

**Fichiers** : `tests/applications/character-audit-log.test.mjs`, `tests/utils/audit-log.test.mjs`

**What** :

- Étendre les tests pour couvrir au minimum : recherche texte positive/négative, plage de dates bornée, borne unique, combinaison famille + texte + dates, et cohérence `filteredCount` / `totalCount`.
- Vérrouiller les cas limites de normalisation temporelle pour éviter les régressions silencieuses sur les dates localisées et les horodatages de fin de journée.
- Prévoir une validation ciblée de la toolbar et de l’état vide filtré pendant l’implémentation.

**Résultat attendu** : le nouveau contrat de consultation reste stable, lisible et limité au périmètre Audit Log.

## Périmètre / hors périmètre

### Inclus

- Recherche texte dans le journal Audit Log
- Filtre par plage de dates côté application
- Compteur de résultats sur la liste affichée

### Exclus

- Regroupement par date (`AUDIT-UI-06`)
- Désactivation/compteur des familles vides (`AUDIT-UI-10`)
- Changement du modèle métier, du stockage ou de l’export CSV
