# Plan d'implémentation — US6 : Implémenter l'achat d'un nœud

**Issue
** : [#190 — US6: Implémenter l'achat d'un nœud](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/190)  
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)  
**ADR** : `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md`,
`documentation/architecture/adr/adr-0011-stockage-journal-evolution-personnage-flags.md`,
`documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`  
**Module(s) impacté(s)** : `module/lib/talent-node/talent-node-purchase.mjs` (création), `module/utils/audit-log.mjs` (
modification), `tests/lib/talent-node/talent-node-purchase.test.mjs` (création), `tests/utils/audit-log.test.mjs` (
modification)

---

## 1. Objectif

Implémenter le flux métier d'achat d'un nœud de talent depuis un arbre de spécialisation possédé, en s'appuyant sur les
briques déjà livrées :

- structure persistée `actor.system.progression.talentPurchases` ;
- résolution spécialisation → arbre ;
- calcul d'état des nœuds et raisons de refus.

Le résultat attendu est un point d'entrée unique capable de :

- valider un achat selon les règles V1 ;
- persister l'achat du nœud sur l'acteur ;
- mettre à jour l'XP dépensée ;
- produire une opération structurée exploitable par l'audit/log ;
- laisser les vues dérivées se recalculer à partir de la source de vérité mise à jour.

---

## 2. Périmètre

### Inclus dans cette US / ce ticket

- Création d'un module dédié au flux d'achat d'un nœud dans `module/lib/talent-node/`
- Réutilisation du resolver US4 et du state engine US5
- Validation complète des préconditions d'achat
- Lecture du coût depuis `tree.system.nodes[].cost`
- Persistance d'une nouvelle entrée dans `actor.system.progression.talentPurchases`
- Mise à jour de `actor.system.progression.experience.spent`
- Construction d'une opération d'audit structurée de type `talent-node-purchase`
- Transmission non bloquante de cette opération au système d'audit/log existant
- Tests Vitest couvrant succès, refus et résilience audit

### Exclu de cette US / ce ticket

- Refonte de l'onglet Talents
- Vue graphique d'arbre
- Consolidation des talents possédés
- Gestion ranked / non-ranked au niveau de la vue consolidée
- Achat d'une nouvelle spécialisation
- Migration ou suppression complète des anciennes logiques talents legacy
- Remplacement global de `addTalent()` / `addTalentWithXpCheck()` pour tous les flux existants non liés à V1 Talents
- Historique détaillé persisté dans l'acteur

---

## 3. Constat sur l'existant

### La base V1 est en place

Le codebase contient déjà les fondations nécessaires :

- `module/models/character.mjs` porte `system.progression.talentPurchases[]`
- `module/lib/talent-node/talent-tree-resolver.mjs` résout une spécialisation possédée vers un `specialization-tree`
- `module/lib/talent-node/talent-node-state.mjs` calcule `purchased` / `available` / `locked` / `invalid`

US6 peut donc se concentrer sur l'orchestration d'achat, sans redéfinir ces règles.

### Le legacy talents reste incompatible avec la V1

Des flux historiques existent encore :

- `module/documents/actor-mixins/talents.mjs#addTalentWithXpCheck()`
- `module/lib/talents/talent-cost-calculator.mjs`
- `module/lib/talents/trained-talent.mjs`
- `module/lib/talents/ranked-trained-talent.mjs`

Problèmes constatés :

- coût hardcodé `5`
- coût `rank * 5`
- logique basée sur création d'embedded `Item talent`
- aucune persistance `treeId` / `nodeId` / `specializationId`

Ces flux ne doivent pas servir de base fonctionnelle à US6.

### L'audit/log actuel détecte encore l'ancien modèle

`module/utils/audit-log.mjs` journalise les achats de talent via `Hooks.on('createItem')`, avec une entrée
`talent.purchase` basée sur un `Item talent`.

Ce branchement ne couvrira pas le nouveau flux US6 si l'achat V1 persiste uniquement `talentPurchases` sur l'acteur. US6
doit donc produire sa propre opération structurée et la brancher vers l'audit de manière explicite.

### Les vues dérivées ne doivent pas être persistées

Le cadrage talents et `06-audit-log-et-synchronisation.md` imposent que :

- `talentPurchases` soit la source de vérité ;
- les états de nœuds, rangs consolidés et vues UI soient recalculés.

US6 ne doit donc pas écrire de cache dérivé sur l'acteur.

---

## 4. Décisions d'architecture

### 4.1. Créer un module d'achat dédié dans `module/lib/talent-node/`

**Décision** : créer `module/lib/talent-node/talent-node-purchase.mjs`.

Options envisagées :

- étendre `talent-node-state.mjs`
- ajouter la logique dans `actor-mixins/talents.mjs`
- réutiliser `module/lib/talents/` legacy

**Décision retenue** : module dédié, à côté du resolver et du state engine.

Justification :

- sépare clairement validation d'état et exécution d'achat ;
- évite de recoupler la V1 au legacy talents ;
- fournit une API réutilisable par les futures UI.

### 4.2. L'achat doit réutiliser US4 et US5, pas dupliquer leurs règles

**Décision** : le flux d'achat orchestre :

1. validation de la spécialisation possédée ;
2. résolution de l'arbre via `resolveSpecializationTree()`;
3. lecture de l'état du nœud via `getNodeState()`;
4. persistance seulement si l'état est `available`.

Justification :

- évite deux sources de vérité métier ;
- garantit que l'UI et l'achat partagent exactement les mêmes raisons de refus ;
- réduit le risque de divergence entre US5 et US6.

### 4.3. Le coût vient exclusivement du nœud résolu

**Décision** : le coût XP utilisé par US6 est `node.cost` lu depuis l'arbre résolu.

Justification :

- conforme à l'issue #190 ;
- conforme à `02-regles-achat-progression.md` ;
- interdit toute réintroduction de `rank * 5`, coût hardcodé ou coût porté par la définition générique du talent.

### 4.4. Persister achat et XP dans un seul `actor.update()`

**Décision** : effectuer un unique `actor.update()` qui écrit :

- `system.progression.talentPurchases`
- `system.progression.experience.spent`

Justification :

- réduit le risque d'état intermédiaire incohérent ;
- simplifie les tests ;
- laisse les hooks et recalculs observer un changement atomique côté acteur.

### 4.5. Ne pas créer d'embedded `Item talent` dans le flux US6

**Décision** : l'achat V1 ne crée pas d'`Item talent` embarqué comme source de vérité.

Justification :

- la source de vérité V1 est `talentPurchases` ;
- les vues futures devront dériver l'état depuis achats + arbres + définitions ;
- cela évite de prolonger le modèle legacy incompatible avec le cadrage.

### 4.6. Produire une opération d'audit structurée, puis la transmettre de façon non bloquante

**Décision** : le flux d'achat construit une opération métier de forme :

```js
{
  type: 'talent-node-purchase',
    actorId,
    specializationId,
    treeId,
    nodeId,
    talentId,
    cost,
    source
:
  'specialization-tree',
    previousXp,
    nextXp
}
```

Puis un bridge audit dédié l'écrit dans `flags.swerpg.logs` si disponible, sans bloquer l'achat en cas d'échec.

Justification :

- conforme à `06-audit-log-et-synchronisation.md` ;
- évite de dépendre du hook `createItem` devenu insuffisant ;
- respecte ADR-0011 : l'audit reste secondaire.

### 4.7. Aucun recalcul persistant des vues dérivées en US6

**Décision** : US6 se limite à mettre à jour la source de vérité. Le recalcul des vues dérivées se fait par les flux
normaux de préparation et par les futures US de consolidation/UI.

Justification :

- évite d'introduire une vue persistée concurrente ;
- conforme au cadrage V1 ;
- garde US6 centrée sur l'achat.

---

## 5. Plan de travail détaillé

### Étape 1 — Définir l'API publique du module d'achat

**Quoi faire** : créer un point d'entrée clair, par exemple `purchaseTalentNode(actor, specializationId, nodeId)` ou
`purchaseTalentNode({ actor, specializationId, nodeId })`, qui retourne un résultat structuré.

**Fichiers** :

- `module/lib/talent-node/talent-node-purchase.mjs` (création)

**Risques spécifiques** :

- API trop couplée à une UI précise ;
- API qui force les appelants à recalculer eux-mêmes l'état ou l'arbre.

### Étape 2 — Orchestrer validation, résolution et lecture d'état

**Quoi faire** : dans le flux d'achat :

- vérifier que la spécialisation est possédée ;
- résoudre l'arbre ;
- localiser le nœud ;
- appeler `getNodeState()` ;
- refuser tout état autre que `available` avec une raison machine-readable.

**Fichiers** :

- `module/lib/talent-node/talent-node-purchase.mjs` (création)

**Risques spécifiques** :

- dupliquer des contrôles déjà faits dans `talent-node-state.mjs` ;
- divergences de `reasonCode`.

### Étape 3 — Persister l'achat acteur et la dépense d'XP

**Quoi faire** :

- construire la nouvelle entrée `{ treeId, nodeId, talentId, specializationId }`
- l'ajouter à `actor.system.progression.talentPurchases`
- incrémenter `system.progression.experience.spent` du coût du nœud
- exécuter un `actor.update()` unique

**Fichiers** :

- `module/lib/talent-node/talent-node-purchase.mjs` (création)

**Risques spécifiques** :

- double achat si l'entrée existe déjà ;
- mise à jour XP sans mise à jour achat, ou inversement, si le flux n'est pas atomique.

### Étape 4 — Construire l'opération d'audit métier

**Quoi faire** : après achat réussi, construire une opération traçable contenant au minimum :

- acteur ;
- spécialisation ;
- arbre ;
- nœud ;
- talent ;
- coût ;
- XP avant/après ;
- source `specialization-tree`

**Fichiers** :

- `module/lib/talent-node/talent-node-purchase.mjs` (création)

**Risques spécifiques** :

- format divergent du cadrage `06-audit-log-et-synchronisation.md` ;
- mélange entre opération métier et format final de log.

### Étape 5 — Brancher l'audit/log sans rendre l'achat dépendant de lui

**Quoi faire** : ajouter dans `module/utils/audit-log.mjs` un helper explicite pour enregistrer cette opération,
réutilisant l'infrastructure existante (`makeEntry`, `captureSnapshot`, `writeLogEntries`) avec `try/catch` non
bloquant.

**Fichiers** :

- `module/utils/audit-log.mjs` (modification)
- éventuellement `tests/utils/audit-log.test.mjs` (modification)

**Risques spécifiques** :

- casser les tests existants centrés sur `createItem`;
- faire échouer l'achat quand l'écriture du log échoue.

### Étape 6 — Couvrir le flux par des tests ciblés

**Quoi faire** : créer des tests sur le module d'achat couvrant :

- achat simple d'un nœud racine ;
- achat refusé si spécialisation absente ;
- achat refusé si arbre introuvable ou incomplet ;
- achat refusé si nœud déjà acheté ;
- achat refusé si nœud verrouillé ;
- achat refusé si XP insuffisante ;
- achat qui écrit correctement `talentPurchases` et `experience.spent` ;
- opération d'audit correctement formée ;
- achat réussi même si l'audit est indisponible.

**Fichiers** :

- `tests/lib/talent-node/talent-node-purchase.test.mjs` (création)
- `tests/utils/audit-log.test.mjs` (modification)

**Risques spécifiques** :

- tests trop couplés à la structure interne au lieu du contrat métier ;
- couverture insuffisante des cas de refus.

---

## 6. Fichiers modifiés

| Fichier                                               | Action       | Description du changement                                                                                |
|-------------------------------------------------------|--------------|----------------------------------------------------------------------------------------------------------|
| `module/lib/talent-node/talent-node-purchase.mjs`     | création     | Nouveau flux d'achat V1 d'un nœud de talent                                                              |
| `module/utils/audit-log.mjs`                          | modification | Ajout d'un bridge explicite pour journaliser une opération `talent-node-purchase` sans hook `createItem` |
| `tests/lib/talent-node/talent-node-purchase.test.mjs` | création     | Tests métier du flux d'achat                                                                             |
| `tests/utils/audit-log.test.mjs`                      | modification | Couverture du nouveau branchement audit non bloquant                                                     |

Fichiers explicitement non ciblés par défaut dans cette US :

- `module/documents/actor-mixins/talents.mjs`
- `module/lib/talents/talent-cost-calculator.mjs`
- `module/lib/talents/*.mjs`

Ils pourront être neutralisés plus tard, mais ne doivent pas être utilisés comme base du flux US6.

---

## 7. Risques

| Risque                                               | Impact                  | Mitigation                                                                           |
|------------------------------------------------------|-------------------------|--------------------------------------------------------------------------------------|
| Réintroduction du coût legacy (`5` ou `rank * 5`)    | Achat faux métier       | Tester explicitement que le coût vient du nœud résolu                                |
| Duplication des règles entre US5 et US6              | Divergences UI / achat  | Faire de `getNodeState()` la porte d'entrée canonique de validation                  |
| Achat bloqué si audit/log échoue                     | Régression UX           | Isoler l'écriture d'audit dans un bridge non bloquant avec warning technique         |
| Persistance non atomique achat + XP                  | Incohérence acteur      | Utiliser un unique `actor.update()`                                                  |
| Tentation de créer encore des embedded `Item talent` | Double source de vérité | Documenter explicitement que US6 persiste uniquement `talentPurchases`               |
| Tests peu diagnostiques                              | Maintenance difficile   | Suivre ADR-0012 avec assertions ciblées sur `reasonCode`, `spent`, `talentPurchases` |

---

## 8. Proposition d'ordre de commit

1. `feat(talent-node): add purchase workflow for specialization tree nodes`
2. `feat(audit-log): record talent node purchase operations`
3. `test(talent-node): cover talent node purchase success and refusal cases`

---

## 9. Dépendances avec les autres US

- **Dépend de US3 / #187** : structure `talentPurchases`
- **Dépend de US4 / #188** : résolution spécialisation → arbre
- **Dépend de US5 / #189** : calcul d'état et raisons de refus
- **Prépare US7 / US8** : consolidation des talents possédés
- **Prépare US12+** : UI onglet Talents et vue graphique
- **S'aligne avec l'épic audit/log** : l'opération est produite maintenant, l'exploitation UI de l'historique reste
  séparée
