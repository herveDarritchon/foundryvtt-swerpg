# Plan d'implémentation — US20 : Produire une opération audit/log lors d'un achat

**Issue** : [#204 — US20: Produire une opération audit/log lors d'un achat](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/204)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/06-audit-log-et-synchronisation.md`, `documentation/cadrage/character-sheet/talent/02-regles-achat-progression.md`, `documentation/cadrage/character-sheet/talent/07-plan-issues-github.md`
**Module(s) impacté(s)** : `module/lib/talent-node/talent-node-purchase.mjs` (modification ciblée si enrichissement), `module/utils/audit-log.mjs` (modification), `module/applications/character-audit-log.mjs` (modification), `lang/fr.json` (modification), `lang/en.json` (modification), `tests/lib/talent-node/talent-node-purchase.test.mjs` (modification), `tests/utils/audit-log.test.mjs` (modification), `tests/applications/character-audit-log.test.mjs` (modification)

---

## 1. Objectif

Rendre chaque achat de nœud de talent traçable par une opération structurée, émise après persistance de l'achat, compatible avec le système d'audit/log existant, sans stocker d'historique métier détaillé dans `actor.system`.

Cette US complète le flux V1 Talents en fermant la boucle audit :
- émission métier structurée ;
- persistance audit secondaire ;
- lisibilité dans l'UI du journal d'audit ;
- résilience si l'audit/log est indisponible.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Vérifier et consolider le contrat de l'opération `talent-node-purchase`.
- Garantir que l'opération est produite après validation et persistance de l'achat.
- Conserver le caractère non bloquant si l'écriture audit échoue.
- Rendre `talent-node-purchase` lisible dans `CharacterAuditLogApp`.
- Ajouter les libellés i18n FR/EN du type et de la description d'événement.
- Compléter la couverture de tests sur le bridge audit et le viewer audit.
- Enrichir l'événement avec `previousRank` / `nextRank` uniquement si ces valeurs sont dérivables proprement depuis la source de vérité existante, sans nouvelle persistance.

### Exclu de cette US / ce ticket

- Refonte globale du système d'audit/log.
- Migration ou réécriture des anciennes entrées `talent.purchase`.
- Stockage d'un historique détaillé dans `actor.system`.
- Nouveau bus d'événements interne.
- Refonte de la synchronisation arbre / onglet Talents déjà couverte par US19.
- Calcul persistant de rangs consolidés.
- Remboursement, suppression ou rollback d'achats.

---

## 3. Constat sur l'existant

Le socle principal est déjà présent.

- `module/lib/talent-node/talent-node-purchase.mjs` persiste déjà `talentPurchases` et `experience.spent` dans un unique `actor.update()`.
- Ce même flux appelle déjà `recordTalentNodePurchase(actor, payload)` après la persistance.
- `module/utils/audit-log.mjs` écrit déjà une entrée `type: 'talent-node-purchase'` dans `flags.swerpg.logs`.
- Les données déjà émises couvrent `actorId`, `specializationId`, `treeId`, `nodeId`, `talentId`, `cost`, `source`, `previousXp`, `nextXp`.
- Les tests `tests/lib/talent-node/talent-node-purchase.test.mjs`, `tests/utils/audit-log.test.mjs` et `tests/unit/documents/actor-synchronization.test.mjs` couvrent déjà une partie importante du comportement attendu.
- `module/documents/actor.mjs` rafraîchit déjà la vue arbre et la sheet quand `talentPurchases` ou `experience.spent` changent.

Le gap principal identifié est côté exploitation du log.

- `module/applications/character-audit-log.mjs` connaît `talent.purchase`, mais pas `talent-node-purchase`.
- En l'état, une entrée `talent-node-purchase` tombe dans le fallback `unknown`.
- Les tests de viewer audit ne couvrent pas encore ce nouveau type.
- Les champs `previousRank` / `nextRank` ne sont pas encore portés par le bridge actuel, ce qui reste acceptable fonctionnellement car l'issue les demande seulement "si disponibles".

---

## 4. Décisions d'architecture

### 4.1. Garder `purchaseTalentNode()` comme producteur canonique de l'opération

**Décision** : conserver la production de l'opération métier dans `module/lib/talent-node/talent-node-purchase.mjs`, après succès de `actor.update()`.

Justification :
- le contexte métier complet y est déjà disponible ;
- l'achat V1 n'est pas basé sur `createItem`, donc il ne faut pas réintroduire le legacy `talent.purchase` comme source principale ;
- cela garantit que l'opération n'est produite qu'après persistance réussie.

### 4.2. Conserver l'audit comme donnée secondaire dans `flags.swerpg.logs`

**Décision** : ne rien stocker de plus dans `actor.system` ; l'audit reste dans `actor.flags.swerpg.logs`.

Justification :
- conforme ADR-0011 ;
- évite de transformer l'historique en donnée cœur ;
- respecte le cadrage talents V1 qui garde `talentPurchases` comme source de vérité.

### 4.3. Traiter `talent-node-purchase` comme un type distinct du legacy `talent.purchase`

**Décision** : ajouter un support explicite de `talent-node-purchase` dans `CharacterAuditLogApp`, sans le masquer derrière `talent.purchase`.

Justification :
- les deux événements n'ont pas la même sémantique ;
- `talent.purchase` décrit un achat legacy par création d'item ;
- `talent-node-purchase` décrit un achat V1 par nœud d'arbre et doit rester identifiable.

### 4.4. Les rangs avant/après restent optionnels

**Décision** : `previousRank` et `nextRank` n'entrent dans cette US que s'ils peuvent être calculés depuis les achats existants sans introduire de nouvelle source de vérité ni coupler la couche domaine au rendu UI.

Justification :
- l'issue et le cadrage les demandent seulement "si disponibles" ;
- la règle projet est de dériver les rangs depuis les achats, pas de les persister ;
- cela évite d'alourdir inutilement le flux d'achat.

### 4.5. Le viewer audit ne doit pas dépendre d'une résolution Foundry complexe pour afficher l'événement

**Décision** : la description de `talent-node-purchase` doit pouvoir être rendue à partir des données embarquées dans l'entrée, avec fallback sur les identifiants métier si aucun libellé plus riche n'est disponible.

Justification :
- minimise le couplage entre le viewer audit et les documents monde/compendium ;
- reste aligné avec ADR-0013 ;
- évite qu'un audit ancien devienne illisible si un document lié est absent.

---

## 5. Plan de travail détaillé

### Étape 1 — Figer le contrat cible de l'événement `talent-node-purchase`

**Quoi faire** : confirmer le payload attendu côté bridge audit et tests.

Le contrat minimal doit inclure :
- `actorId`
- `specializationId`
- `treeId`
- `nodeId`
- `talentId`
- `cost`
- `source: 'specialization-tree'`

Les champs utiles mais optionnels :
- `previousXp`
- `nextXp`
- `previousRank`
- `nextRank`

**Fichiers** :
- `module/lib/talent-node/talent-node-purchase.mjs`
- `module/utils/audit-log.mjs`
- `tests/lib/talent-node/talent-node-purchase.test.mjs`
- `tests/utils/audit-log.test.mjs`

**Risques spécifiques** :
- faire dériver le contrat de tests existants sans formalisation claire ;
- ajouter trop de données non nécessaires au payload.

### Étape 2 — Compléter le bridge audit si un enrichissement léger est requis

**Quoi faire** : ajuster la composition du payload si des champs optionnels doivent être ajoutés ou normalisés, tout en conservant l'écriture non bloquante.

Si les rangs sont ajoutés :
- les dériver depuis la source de vérité existante ;
- ne jamais persister ces rangs sur l'acteur ;
- ne pas dépendre d'un état UI ouvert.

**Fichiers** :
- `module/lib/talent-node/talent-node-purchase.mjs`
- `module/utils/audit-log.mjs`

**Risques spécifiques** :
- coupler l'achat à la couche de consolidation de manière excessive ;
- introduire des rangs incohérents pour les talents non-ranked.

### Étape 3 — Rendre `talent-node-purchase` exploitable dans l'UI audit

**Quoi faire** :
- ajouter le type dans `AUDIT_LOG_TYPE_LABELS` ;
- mapper `talent-node-purchase` vers la famille `talents` ;
- ajouter une description dédiée dans `buildAuditLogDescription()` ;
- utiliser une description basée sur `talentId`, `nodeId`, `treeId`, `cost` et éventuellement `previousRank` / `nextRank`.

**Fichiers** :
- `module/applications/character-audit-log.mjs`

**Risques spécifiques** :
- confondre `talent.purchase` et `talent-node-purchase` ;
- produire une description trop dépendante de données non garanties.

### Étape 4 — Ajouter les traductions FR/EN

**Quoi faire** : introduire les clés i18n pour le nouveau type et sa description.

Exemples attendus :
- `SWERPG.AUDIT_LOG.TYPE.TALENT_NODE_PURCHASE`
- `SWERPG.AUDIT_LOG.DESCRIPTION.TALENT_NODE_PURCHASE`

**Fichiers** :
- `lang/fr.json`
- `lang/en.json`

**Risques spécifiques** :
- divergence entre les placeholders utilisés dans le code et ceux définis dans les fichiers de langue.

### Étape 5 — Étendre la couverture de tests

**Quoi faire** :
- compléter les tests métier pour vérifier le contrat exact envoyé au bridge ;
- compléter les tests du bridge audit pour vérifier la forme finale de l'entrée ;
- compléter les tests du viewer audit pour vérifier :
  - le mapping vers la famille `talents` ;
  - le libellé du type ;
  - la description dédiée ;
  - l'absence de fallback `unknown` pour ce type.

**Fichiers** :
- `tests/lib/talent-node/talent-node-purchase.test.mjs`
- `tests/utils/audit-log.test.mjs`
- `tests/applications/character-audit-log.test.mjs`

**Risques spécifiques** :
- tests trop couplés au wording exact des traductions ;
- oubli d'un cas sans champs optionnels.

### Étape 6 — Validation manuelle en environnement Foundry

**Quoi faire** : vérifier manuellement :
- achat d'un nœud avec audit disponible ;
- achat d'un nœud avec échec d'écriture audit ;
- apparition d'une entrée `talent-node-purchase` lisible dans le journal ;
- absence d'historique détaillé supplémentaire dans `actor.system`.

**Fichiers** : aucun

**Risques spécifiques** :
- environnement de validation non disponible ;
- faux positif si on ne vérifie que les tests unitaires.

---

## 6. Fichiers modifiés

| Fichier | Action | Description |
|---|---|---|
| `module/lib/talent-node/talent-node-purchase.mjs` | modification ciblée | Normaliser ou enrichir le payload envoyé au bridge audit si nécessaire |
| `module/utils/audit-log.mjs` | modification | Finaliser le contrat de `recordTalentNodePurchase()` |
| `module/applications/character-audit-log.mjs` | modification | Supporter `talent-node-purchase` dans le viewer audit |
| `lang/fr.json` | modification | Ajouter le type et la description FR |
| `lang/en.json` | modification | Ajouter le type et la description EN |
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | modification | Vérifier le payload métier et la résilience non bloquante |
| `tests/utils/audit-log.test.mjs` | modification | Vérifier la structure finale de l'entrée audit |
| `tests/applications/character-audit-log.test.mjs` | modification | Vérifier le rendu du nouveau type dans l'UI audit |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Périmètre réel de l'issue déjà partiellement implémenté | Travail redondant ou plan trop large | Cadrer explicitement l'US comme "complétion et visibilité audit", pas comme greenfield |
| Confusion entre `talent.purchase` et `talent-node-purchase` | Historique incohérent ou UI ambiguë | Garder deux types distincts avec mapping explicite |
| Calcul des rangs avant/après trop couplé | Complexité inutile dans la couche domaine | Rendre ces champs strictement optionnels |
| Viewer audit dépendant d'une résolution Foundry fragile | Entrées illisibles si documents absents | Construire la description depuis le payload avec fallback identifiant |
| Régression i18n | UI cassée ou placeholders non remplacés | Ajouter des tests ciblés sur les descriptions rendues |

---

## 8. Proposition d'ordre de commit

1. `feat(audit-log): support talent-node-purchase entries in audit viewer`
2. `feat(talent-node): normalize node purchase audit payload`
3. `test(audit-log): cover talent node purchase bridge and viewer`

Si aucun enrichissement de payload n'est finalement nécessaire, le commit 2 peut être supprimé.

---

## 9. Dépendances avec les autres US

- Dépend fonctionnellement de [#190 — US6: Implémenter l'achat d'un nœud](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/190), car `purchaseTalentNode()` est le producteur canonique de l'opération.
- S'appuie sur [#203 — US19: Synchroniser achat, arbre et onglet Talents](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/203) pour la chaîne de synchronisation déjà en place.
- Reste cohérente avec l'épic audit/log initié par [#151 — US1](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/151), mais ne doit pas refondre ce système.

**Hypothèse retenue**
- `previousRank` / `nextRank` ne sont pas bloquants pour déclarer l'US terminée si leur calcul propre impose un couplage excessif.
