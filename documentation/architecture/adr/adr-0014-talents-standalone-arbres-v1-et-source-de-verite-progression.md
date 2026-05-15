---
title: 'ADR-0014: Talent standalone, arbres V1 et source de vérité de progression'
status: 'Accepted'
date: '2026-05-15'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['talent', 'specialization-tree', 'oggdude', 'architecture', 'progression']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette décision formalise le modèle d'architecture V1 des talents Edge, des arbres de spécialisation et de la progression acteur.

## Context

Le projet a historiquement porté plusieurs représentations concurrentes ou ambiguës autour des talents :

1. des `Item` `talent` avec des champs comme `system.trees`, `system.node` et `system.row` ;
2. une structure legacy héritée de Crucible autour de `SwerpgTalentNode` et d'un arbre global ;
3. un import OggDude `Talent.xml` initialement trop riche et conceptuellement mélangé avec des notions d'arborescence ;
4. une implémentation V1 plus récente fondée sur des `Item` `specialization-tree` et des achats de nœuds acteur dans `actor.system.progression.talentPurchases`.

L'audit de l'issue #22 a montré que la codebase a déjà convergé dans les faits vers une architecture plus claire, mais que cette décision restait implicite, dispersée et partiellement brouillée par des reliquats legacy.

Il faut donc acter officiellement :

1. le rôle de `Talent.xml` ;
2. le support canonique des arbres V1 ;
3. la source de vérité de progression acteur ;
4. le statut des champs `system.trees`, `system.node`, `system.row` sur `Item.talent`.

## Decision

Le projet adopte officiellement la séparation suivante :

```txt
Talent.xml
= définition générique standalone d'un talent

specialization-tree
= support canonique des arbres V1

actor.system.progression.talentPurchases
= source de vérité de progression acteur

Item.talent.system.trees / node / row
= legacy résiduel, non canonique pour la V1
```

Cette décision est normative pour :

1. les imports OggDude ;
2. les évolutions du modèle de données ;
3. les plans techniques ;
4. les futures features UI et domaine autour des talents.

## Detailed Decision

### 1. `Talent.xml` décrit un talent générique standalone

L'import `Talent.xml` sert à créer ou mettre à jour une définition générique de talent.

Le contrat métier attendu pour ce flux concerne la fiche standalone :

1. identité du talent ;
2. description lisible ;
3. activation ;
4. caractère ranked ou non ;
5. données d'import et de diagnostic dans `flags.swerpg.import`.

`Talent.xml` ne constitue pas le support canonique :

1. des positions dans un arbre ;
2. des coûts XP de nœud ;
3. des connexions entre nœuds ;
4. des prérequis structurels d'achat dans un arbre donné ;
5. de la progression possédée par un acteur.

En conséquence, un mapper `Talent.xml` ne doit pas introduire de dépendance métier V1 à `system.trees`, `system.node` ou `system.row` pour représenter une arborescence.

### 2. `specialization-tree` est le support canonique des arbres V1

Les arbres de talents V1 sont portés par des `Item` de type `specialization-tree`.

Ce type est la représentation canonique de :

1. l'identité de l'arbre ;
2. son rattachement à une spécialisation ;
3. son rattachement éventuel à une carrière ;
4. ses nœuds ;
5. les positions `row` / `column` ;
6. les coûts ;
7. les connexions.

Le contrat minimal canonique des nœuds est :

```js
{
  nodeId: 'r1c1',
  talentId: 'parry',
  talentUuid: 'Item.xxxxx',
  row: 1,
  column: 1,
  cost: 5,
}
```

Le contrat minimal canonique des connexions est :

```js
{
  from: 'r1c1',
  to: 'r2c1',
  type: 'vertical',
}
```

Toute logique V1 de résolution, rendu, accessibilité, achat ou consolidation doit partir de `specialization-tree`, et non d'une tentative de reconstruction depuis des champs portés par `Item.talent`.

### 3. `talentPurchases` est la source de vérité de progression acteur

La possession effective d'un talent par un acteur ne se déduit pas d'un simple `Item.talent` embarqué ni d'un champ stocké sur la définition générique.

La source de vérité V1 de progression acteur est :

```txt
actor.system.progression.talentPurchases
```

Chaque entrée représente un achat de nœud dans un arbre donné.

Contrat minimal :

```js
{
  treeId: 'bodyguard-tree',
  nodeId: 'r1c1',
  talentId: 'parry',
  specializationId: 'bodyguard',
}
```

Ce stockage doit permettre de recalculer :

1. les nœuds achetés ;
2. les nœuds accessibles ;
3. les talents possédés ;
4. les rangs consolidés des talents ranked ;
5. les sources d'acquisition d'un talent ;
6. les coûts XP associés aux achats.

Les vues dérivées, y compris l'onglet Talents et les vues graphiques d'arbres, doivent être reconstruites à partir de :

1. `talentPurchases` ;
2. `specialization-tree` ;
3. la définition générique des talents ;
4. les spécialisations possédées.

### 4. `system.trees`, `system.node`, `system.row` sur `Item.talent` sont legacy

Les champs suivants sur `Item.talent` ne sont pas la modélisation canonique V1 des arbres ou de la progression :

1. `system.trees`
2. `system.node`
3. `system.row`

Ils doivent être traités comme du legacy résiduel.

Cela signifie :

1. aucun nouveau flux V1 ne doit les choisir comme source de vérité ;
2. aucun nouveau plan ne doit les utiliser pour encoder une arborescence V1 ;
3. leur présence actuelle n'implique pas qu'ils représentent un contrat stable à étendre ;
4. tout nettoyage ou retrait doit être planifié de manière explicite pour éviter de casser les usages legacy encore présents.

Tant qu'ils existent, leur statut doit être lu comme :

```txt
compatibilité interne ou reliquat historique
!= contrat métier canonique V1
```

## Consequences

### Positive

1. **POS-001**: séparation claire entre définition de talent, structure d'arbre et progression acteur.
2. **POS-002**: réduction des ambiguïtés autour de `Talent.xml` et du périmètre des bugfix d'import.
3. **POS-003**: stabilité du contrat consommé par la couche domaine V1 (`specialization-tree` + `talentPurchases`).
4. **POS-004**: base explicite pour les futures features de rendu, validation de prérequis et achat de talents.
5. **POS-005**: meilleure lisibilité pour les plans techniques, revues et contributions LLM.

### Negative

1. **NEG-001**: coexistence temporaire entre architecture canonique V1 et reliquats legacy sur `Item.talent`.
2. **NEG-002**: nécessité de maintenir une discipline documentaire pour éviter le retour de formulations ambiguës comme "full talent tree support" côté import talent.
3. **NEG-003**: futurs nettoyages du data model `talent` devront être planifiés avec précaution pour éviter des régressions sur les usages historiques.

## Alternatives Considered

### Stocker l'arborescence directement sur `Item.talent`

1. **ALT-001**: **Description**: utiliser `system.trees`, `system.node`, `system.row` comme base métier V1 et enrichir progressivement ces champs.
2. **ALT-002**: **Rejection Reason**: mélange la définition générique du talent avec ses occurrences dans plusieurs arbres, complique le multi-arbre, et entre en conflit avec l'architecture V1 déjà en place sur `specialization-tree`.

### Faire de `Talent.xml` la source primaire des arbres

1. **ALT-003**: **Description**: enrichir `Talent.xml` pour porter les positions, dépendances et coûts des talents dans les arbres.
2. **ALT-004**: **Rejection Reason**: ne correspond pas au découpage actuel du pipeline, mélange deux concepts différents, et rend l'import talent inutilement couplé à la structure des arbres.

### Utiliser les `Item.talent` embarqués acteur comme source de vérité de progression

1. **ALT-005**: **Description**: considérer qu'un acteur possède un talent dès qu'un `Item.talent` lui est attaché.
2. **ALT-006**: **Rejection Reason**: ne permet pas de distinguer proprement les nœuds sources, les achats multi-arbres, les rangs consolidés et les données structurelles d'achat.

## Implementation Notes

1. **IMP-001**: tout bugfix `Talent.xml` doit rester centré sur la fiche standalone, sauf décision ultérieure explicite.
2. **IMP-002**: tout travail sur les arbres V1 doit cibler `specialization-tree` comme contrat canonique.
3. **IMP-003**: toute logique de possession, consolidation ou accessibilité doit partir de `actor.system.progression.talentPurchases`.
4. **IMP-004**: les champs `system.trees`, `system.node`, `system.row` de `Item.talent` doivent être explicitement considérés comme legacy dans les plans et audits.
5. **IMP-005**: la documentation d'import doit être corrigée lorsqu'elle laisse entendre que `Talent.xml` porte à lui seul le support complet des arbres.
6. **IMP-006**: les nettoyages futurs du data model `talent` doivent être faits via une issue ou un plan dédié, et non de manière opportuniste.

## References

1. `documentation/audit/issue-22-audit-gestion-talents-arbres.md`
2. `documentation/spec/oggdude-importer/bug-fix-talent-import-need1-1.0.md`
3. `documentation/cadrage/character-sheet/talent/01-modele-domaine-talents.md`
4. `documentation/cadrage/character-sheet/talent/03-import-oggdude-talents.md`
5. `documentation/plan/character-sheet/talent/193-plan-importer-definitions-generiques-talents.md`
6. `documentation/plan/character-sheet/talent/194-plan-importer-arbres-specialisation.md`
7. `module/models/talent.mjs`
8. `module/models/specialization-tree.mjs`
9. `module/importer/mappers/oggdude-talent-mapper.mjs`
10. `module/importer/mappers/oggdude-specialization-tree-mapper.mjs`
11. `module/lib/talent-node/talent-node-state.mjs`
