# Issue #554 — Audit Log : carte de chat récapitulative pour opérations multi-changements

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/554  
**Domaine métier** : `audit-log`

## Goal

Réduire le spam de cartes chat produit lors d’une opération métier générant plusieurs entrées d’audit, en ajoutant un mode récapitulatif activable par setting MJ qui regroupe ces entrées dans une seule carte listée, sans changer la persistance du journal ni supprimer le mode actuel « une carte par entrée ».

## Contexte utile

- `documentation/audit/audit-log/audit-ui-ux-audit-log.md` rattache ce besoin à **AUDIT-UI-08** et pointe explicitement la boucle de `sendChatForAuditEntries()` comme source de la “pluie de cartes”.
- `writeLogEntries()` appelle déjà `sendChatForAuditEntries(actor, entries)` avec le batch d’entrées issu d’une même écriture ; ce tableau constitue donc la frontière naturelle de regroupement sans refonte du modèle métier.
- Le contrat visuel chat actuel est concentré dans `module/utils/audit-log.mjs`, `templates/chat/audit-entry.hbs` et `styles/chat.less` ; le plan doit préserver ce langage visuel et la résilience non bloquante du pipeline chat.
- Le pattern de setting monde est déjà établi dans `module/applications/settings/settings.js` et verrouillé par `tests/applications/settings/settings.test.mjs`.

## Plan d’implémentation

### Étape 1 — Ajouter un setting monde pour piloter le mode récapitulatif chat

**Fichiers** : `module/applications/settings/settings.js`, `lang/en.json`, `lang/fr.json`, `module/utils/audit-log.mjs`, `tests/applications/settings/settings.test.mjs`

**What** :

- Enregistrer un nouveau setting booléen côté MJ/monde pour activer ou désactiver le regroupement des cartes chat d’audit.
- Ajouter les clés i18n `name` / `hint` associées et prévoir une lecture sûre côté `audit-log.mjs` avec fallback explicite vers le comportement actuel.
- Garder le défaut sur le mode historique “une carte par entrée” afin que l’activation du mode récapitulatif soit opt-in.

**Résultat attendu** : le regroupement chat devient une capacité configurable sans impact sur le stockage du journal ni sur les mondes existants tant que le setting reste désactivé.

### Étape 2 — Introduire une carte chat récapitulative à partir du batch d’entrées d’une même opération

**Fichiers** : `module/utils/audit-log.mjs`, `templates/chat/audit-entry-summary.hbs` _(nouveau)_, `styles/chat.less`, `lang/en.json`, `lang/fr.json`

**What** :

- Faire bifurquer `sendChatForAuditEntries()` : si le setting est actif et que plusieurs entrées sont reçues dans le même batch, rendre une seule carte récapitulative ; sinon conserver strictement le flux actuel.
- Réutiliser `_buildChatContext()` comme brique de base pour chaque ligne récapitulative afin d’éviter une divergence entre carte simple et carte groupée sur les labels, variantes, glyphes et métadonnées.
- Définir un template de synthèse avec en-tête acteur/opération puis liste ordonnée des changements, et enrichir les `flags.swerpg` du message récapitulatif avec un marqueur de synthèse et la trace des `auditEntryId` groupés.

**Résultat attendu** : une montée de niveau ou toute autre opération multi-entrées peut produire une seule carte chat lisible, sans perdre le détail de chaque changement ni casser le rendu unitaire existant.

### Étape 3 — Verrouiller la compatibilité ascendante et les cas limites du pipeline chat

**Fichiers** : `tests/utils/audit-log.test.mjs` _(et `tests/integration/market-audit-log.integration.test.mjs` si un verrou d’intégration s’avère utile)_

**What** :

- Étendre les tests pour couvrir au minimum : setting désactivé → une carte par entrée, setting activé + batch multi-entrées → une seule carte récapitulative, setting activé + entrée unique → chemin historique inchangé.
- Vérrouiller le contexte template récapitulatif (ordre des items, variantes, libellés, flags de traçabilité) et la non-régression du comportement non bloquant si le rendu ou `ChatMessage.create()` échoue.
- Confirmer que le regroupement reste purement côté émission chat : aucune modification attendue sur `flags.swerpg.logs`, l’application Audit Log ou l’export CSV.

**Résultat attendu** : le nouveau mode récapitulatif reste optionnel, traçable et sûr, sans régression sur les cartes unitaires ni sur la persistance d’audit.

## Périmètre / hors périmètre

### Inclus

- Carte chat récapitulative pour un batch d’entrées d’audit issu d’une même opération
- Setting MJ/monde pour activer ou désactiver le regroupement
- Conservation du mode actuel « une carte par entrée »

### Exclus

- Changement du modèle métier, du stockage `flags.swerpg.logs` ou de l’export CSV
- Regroupement heuristique entre plusieurs écritures distinctes ou plusieurs opérations séparées
- Refonte de l’application Character Audit Log hors impacts visuels strictement nécessaires au template chat récapitulatif
