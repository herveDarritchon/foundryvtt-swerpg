# Audit issue #22 — Gestion des Talents dans les arbres

## Résumé

L'issue [#22](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/22) n'est **pas déjà implémentée telle quelle**.

En revanche, la codebase a **largement convergé** vers une réponse produit/architecture implicite :

- `Talent.xml` est traité comme une source de **définitions génériques de talents**, pas comme une source canonique d'arborescences.
- les arbres V1 sont portés par des `Item` de type `specialization-tree` avec `nodes`, `connections`, `row`, `column`, `cost`.
- la progression acteur est portée par `actor.system.progression.talentPurchases`, pas par `Item.talent.system.row/node/trees`.

Le delta principal avec l'issue est donc le suivant :

- la **décision d'architecture demandée par l'issue n'est pas formalisée dans un document unique** ;
- des **reliquats legacy** existent encore sur `module/models/talent.mjs` (`system.node`, `system.trees`, `system.row`) et brouillent la sémantique cible ;
- la documentation est **partiellement contradictoire** sur le support réel des talent trees.

## Conclusion

Conclusion courte : **la direction cible de l'issue est implémentée dans les faits, mais pas complètement stabilisée ni nettoyée**.

Je ne considère donc pas l'issue comme "déjà faite" au sens strict. Je la considère comme **partiellement résolue par des travaux ultérieurs**, avec encore un besoin de :

1. documenter explicitement la décision ;
2. clarifier le statut legacy de `system.trees`, `system.node`, `system.row` sur les talents ;
3. corriger la documentation contradictoire.

## Ce que dit le code aujourd'hui

### 1. `Talent.xml` est traité comme un import de talent générique

Le mapper OggDude talent construit bien un `Item` `talent` centré sur la fiche de base :

- `module/importer/mappers/oggdude-talent-mapper.mjs:264-292`
- `system.id`
- `system.activation`
- `system.isRanked`
- `system.description`
- `flags.swerpg.import.*`

Le mapper **n'écrit pas** `system.trees`, `system.node` ni `system.row` dans le résultat final.

Cela aligne le comportement réel avec l'option :

- `Talent.xml = fiche générique uniquement`

Référence documentaire alignée :

- `documentation/spec/oggdude-importer/bug-fix-talent-import-need1-1.0.md:101-107`
- `documentation/plan/character-sheet/talent/193-plan-importer-definitions-generiques-talents.md:22-40`

### 2. Les arbres V1 sont portés par `specialization-tree`

Le modèle métier V1 des arbres est explicitement séparé des talents génériques :

- `module/models/specialization-tree.mjs:7-35`
- `module/importer/mappers/oggdude-specialization-tree-mapper.mjs:421-468`

Les données structurelles de l'arbre vivent dans :

- `system.specializationId`
- `system.careerId`
- `system.nodes[]`
  - `nodeId`
  - `talentId`
  - `talentUuid`
  - `row`
  - `column`
  - `cost`
- `system.connections[]`

La logique domaine et UI V1 consomme déjà ce contrat :

- `module/lib/talent-node/talent-tree-resolver.mjs`
- `module/lib/talent-node/talent-node-state.mjs`
- `module/applications/specialization-tree-app.mjs`

### 3. La progression acteur ne dépend plus des champs `row/node/trees` du talent

La source de vérité de progression est désormais :

- `actor.system.progression.talentPurchases`

avec des entrées du type :

- `treeId`
- `nodeId`
- `talentId`
- `specializationId`

Cette direction est visible dans :

- `module/lib/talent-node/talent-node-state.mjs:40-45`
- `documentation/cadrage/character-sheet/talent/01-modele-domaine-talents.md:323-374`

### 4. Le code marque explicitement l'ancien arbre global comme legacy

Le fichier legacy des nœuds Crucible indique lui-même qu'il ne faut plus l'utiliser pour la V1 Edge :

- `module/config/talent-tree.mjs:9-15`

Le message est clair :

- ne plus ajouter de nouveaux arbres/nœuds ici ;
- utiliser les `specialization-tree` pour la V1.

## Delta précis entre l'issue et la codebase

### 1. La décision demandée par l'issue est implicite, pas stabilisée

L'issue demande un livrable explicite de type ADR/document de décision.

Je n'ai pas trouvé dans la codebase un document unique qui dise clairement, en une seule place :

- `Talent.xml` n'alimente que les talents génériques ;
- les arborescences sont importées ailleurs ;
- `system.trees`, `system.node`, `system.row` ne sont plus des champs V1 canoniques pour la progression.

La réponse existe, mais elle est dispersée entre :

- des plans (`US9`, `US10`) ;
- des specs d'import ;
- des commentaires de code ;
- les implémentations elles-mêmes.

### 2. `system.trees`, `system.node`, `system.row` existent encore sur `Item.talent`

Le modèle `module/models/talent.mjs` déclare toujours :

- `node` (`StringField` adossé au legacy `SwerpgTalentNode`) ;
- `trees` (`SetField(DocumentUUIDField)`) ;
- `row` (`NumberField`).

Référence :

- `module/models/talent.mjs:68-95`

Problèmes observés :

- `node` reste couplé au fichier legacy `module/config/talent-tree.mjs` ;
- `trees` valide des UUID de `specialization` ou `career`, pas de `specialization-tree` (`module/models/talent.mjs:316-327`) ;
- `row` existe encore pour des flux legacy de coût d'achat (`module/lib/talents/trained-talent.mjs:16-58`, `module/lib/talents/ranked-trained-talent.mjs:17-64`).

Donc la sémantique demandée par l'issue n'est **pas vraiment stabilisée** sur ces champs : ils sont surtout des **reliquats legacy** encore présents pour compatibilité interne.

### 3. Le mapper `Talent.xml` garde un reste de logique legacy dans son contexte

Même si le résultat final n'écrit plus `system.node`, le contexte du mapper calcule encore :

- `node: resolveTalentNode(...)`
- `tier`
- `rank`

Référence :

- `module/importer/mappers/oggdude-talent-mapper.mjs:103-137`

Ce n'est pas bloquant fonctionnellement, mais cela montre que le nettoyage conceptuel n'est pas terminé.

### 4. La documentation contient au moins une contradiction importante

Le fichier :

- `documentation/importer/README.md:33`

annonce :

- `Talent ... Full talent tree support`

Cette phrase est trompeuse par rapport à l'état réel :

- le support des arbres existe bien dans le système ;
- mais il est porté par le domaine `specialization-tree`, pas par `Talent.xml` seul ;
- et la doc `documentation/importer/talent-import-architecture.md` reste décrite selon un contrat plus ancien, centré sur `node`, `rank`, `actions`, `actorHooks`.

## Réponse aux questions de l'issue, à partir de l'état actuel

### 1. Rôle de `Talent.xml`

Réponse implicite actuelle de la codebase :

- `Talent.xml` doit rester **agnostique des arbres** au niveau du contrat persistant `Item.talent`.
- Les arbres et leurs nœuds sont importés dans un flux séparé `specialization-tree`.

### 2. Signification de `system.trees`, `system.node`, `system.row`

Réponse implicite actuelle :

- ces champs **ne sont pas la base canonique V1** pour la progression talents Edge ;
- la base canonique V1 est :
  - `specialization-tree.system.nodes[*]`
  - `specialization-tree.system.connections[*]`
  - `actor.system.progression.talentPurchases[*]`

En l'état, `system.trees/node/row` sur `Item.talent` doivent être lus comme des **champs legacy résiduels**, pas comme le contrat architecturel recommandé.

### 3. Workflow cible de gestion des Talent Trees

Réponse implicite actuelle :

- import des définitions génériques de talents ;
- import séparé des arbres de spécialisation ;
- résolution runtime arbre <-> spécialisation <-> talent ;
- progression acteur via achat de nœuds.

Donc le workflow réel est un **mix orienté référentiels importés + exploitation in-Foundry**, pas un stockage d'arborescence directement dans `Item.talent`.

### 4. Priorité court terme

Le code actuel montre que la priorité court terme a déjà été tranchée en pratique :

- les bugfix `Talent.xml` ciblent la fiche standalone ;
- les arbres ont leur propre chantier ;
- la progression V1 s'appuie sur `specialization-tree` et `talentPurchases`.

## Verdict

### Ce qui est déjà fait

- séparation effective entre talent générique et arbre de spécialisation ;
- import dédié des arbres ;
- logique métier V1 de nœuds et achats ;
- documents de plan US9/US10 cohérents avec cette séparation.

### Ce qui n'est pas complètement fait

- un document de décision explicite répondant à l'issue #22 ;
- une stabilisation claire du statut de `system.trees/node/row` ;
- un nettoyage complet des reliquats legacy du mapper talent ;
- une documentation import cohérente avec l'architecture actuelle.

## Recommandation

Je recommande de considérer l'issue #22 comme **partiellement satisfaite par l'architecture actuelle, mais non clôturable sans formalisation**.

Action minimale recommandée :

1. garder l'issue ouverte tant qu'une décision explicite n'est pas écrite ;
2. référencer cet audit ;
3. ouvrir ensuite un petit ticket de nettoyage documentaire/legacy pour :
   - clarifier `module/models/talent.mjs` ;
   - corriger `documentation/importer/README.md` ;
   - archiver ou réécrire `documentation/importer/talent-import-architecture.md`.
