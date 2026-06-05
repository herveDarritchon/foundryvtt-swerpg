# Issue #553 — Audit Log : regroupement par date avec en-têtes et horaire réduit sur les lignes

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/553  
**Domaine métier** : `audit-log`

## Goal

Rendre le journal d’audit plus lisible en regroupant les entrées par jour avec des en-têtes dédiés et en remplaçant l’horodatage complet répété par un affichage réduit à l’heure sur chaque ligne, sans changer le modèle métier, le stockage ni l’export CSV.

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-06**.
- L’application expose aujourd’hui une liste plate anté-chronologique où chaque entrée affiche `formattedTimestamp` complet ; la densité visuelle vient surtout de cette répétition.
- Le besoin semble pouvoir rester 100% côté application, à partir des entrées déjà construites et filtrées, avec un regroupement de présentation calculé localement.
- `tests/applications/character-audit-log.test.mjs` est l’ancrage principal de non-régression pour verrouiller le contrat de regroupement, l’ordre des sections et le rendu temporel.

## Plan d’implémentation

### Étape 1 — Introduire un view-model de sections journalières à partir des entrées filtrées

**Fichiers** : `module/applications/character-audit-log.mjs`

**What** :

- Conserver `buildAuditLogEntries()` comme source de vérité des entrées filtrées, puis construire au niveau application une projection groupée par jour local.
- Définir pour chaque groupe un identifiant canonique de journée, un libellé d’en-tête localisé (`Aujourd’hui` / `Hier` / date complète) et la liste des entrées correspondantes conservant l’ordre anté-chronologique existant.
- Scinder le rendu temporel en deux usages explicites : un libellé court pour la ligne (heure seule) et une valeur machine exploitable pour `<time datetime>`.

**Résultat attendu** : le contexte de l’application expose des sections par date prêtes à rendre, sans dupliquer la logique de filtre ni modifier les données métier d’audit.

### Étape 2 — Rendre les en-têtes de journée et alléger la méta temporelle des lignes

**Fichiers** : `templates/applications/character-audit-log.hbs`, `styles/applications.less`, `lang/en.json`, `lang/fr.json`

**What** :

- Remplacer la boucle plate des entrées par une boucle de groupes contenant un en-tête de journée puis les articles associés.
- Utiliser `<time datetime>` pour les repères temporels : en-tête daté au niveau du groupe et heure seule au niveau de chaque entrée.
- Ajouter les libellés i18n nécessaires pour `today` / `yesterday` et ajuster le style pour que les séparateurs journaliers améliorent la lecture sans casser les variantes visuelles déjà en place.

**Résultat attendu** : la liste Audit Log devient plus scannable, avec une structure journalière claire et un horodatage allégé sur chaque ligne.

### Étape 3 — Verrouiller le contrat de regroupement et les cas limites calendaires

**Fichiers** : `tests/applications/character-audit-log.test.mjs`

**What** :

- Étendre les tests pour couvrir au minimum : plusieurs entrées le même jour, plusieurs jours distincts, ordre décroissant des groupes, et maintien de l’ordre interne des entrées.
- Vérrouiller les libellés relatifs `today` / `yesterday` et le fallback date localisée pour les jours plus anciens.
- Vérifier que le rendu applicatif expose bien une heure réduite sur la ligne et une valeur `datetime` exploitable, sans impact sur les compteurs, filtres et état vide déjà présents.

**Résultat attendu** : le regroupement par date reste stable, localisé et strictement limité à la couche de consultation Audit Log.

## Périmètre / hors périmètre

### Inclus

- Regroupement visuel des entrées Audit Log par jour
- En-têtes journaliers localisés (`Aujourd’hui` / `Hier` / date)
- Affichage de l’heure seule sur chaque ligne avec balises `<time datetime>`

### Exclus

- Changement du modèle métier, du stockage ou de l’export CSV
- Regroupement multi-événements d’une même opération métier
- Refonte des filtres, du compteur ou du langage visuel hors besoin de regroupement
