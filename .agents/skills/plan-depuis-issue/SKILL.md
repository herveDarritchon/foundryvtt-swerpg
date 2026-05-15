---
name: plan-depuis-issue
description: >
  Génère un plan d'implémentation technique détaillé et validé à partir d'une
  issue GitHub pour le système Foundry VTT SWERPG. À utiliser quand l'utilisateur
  demande de créer un plan, une spec technique, ou un découpage pour une issue ou
  une user story. Déclenche-toi aussi quand l'utilisateur parle de "planifier",
  "découper", "splitter", "implémenter", ou "tech lead" une issue. Le skill
  produit un plan validé comme message structuré en suivant le format canonique
  du projet. L'écriture du plan dans `documentation/plan/` et l'implémentation
  sont des étapes séparées. N'hésite PAS à proposer ce skill dès que l'utilisateur
  évoque une issue en demandant comment l'aborder — même s'il ne demande pas
  explicitement un plan.
license: project-internal
compatibility:
  - claude-code
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v14+, JavaScript ES2022, ApplicationV2, TypeDataModel, Handlebars, Vitest
  scope: planification technique, découpage, analyse d'issue, rédaction de plan d'implémentation
---

# Plan depuis une issue GitHub

Utilise ce skill quand l'utilisateur te demande de créer un plan d'implémentation à partir d'une issue GitHub, ou quand il évoque le besoin de planifier/découper une fonctionnalité.

> ⚠️ **Langue** : Ce skill produit des documents en **français** (sauf si l'utilisateur demande explicitement l'anglais). Les échanges avec l'utilisateur peuvent être dans l'une ou l'autre langue.

---

## 1. Règles absolues

1. **Ne jamais écrire une ligne de code d'implémentation.** Un plan décrit ce qu'il faut faire, pas le code final.
2. **Toujours lire les plans existants** dans `documentation/plan/` avant d'écrire pour t'inspirer du format et du niveau de détail. Ne pas produire de fichier dans le repo : livrer le plan comme message validé.
3. **Toujours lire les ADRs** dans `documentation/architecture/adr/` qui concernent le périmètre de l'issue.
4. **Ne pas modifier le code existant** — le plan peut recommander des modifications, mais ne les applique pas.
5. **Ne pas modifier les issues GitHub** — le plan est un document de travail, pas un outil de gestion de projet.
6. **Ne pas élargir le périmètre de l'issue.** Le plan doit refléter l'issue et les arbitrages utilisateur, pas une feuille de route opportuniste.
7. **Ne pas matérialiser automatiquement le plan dans le dépôt.** L'écriture dans `documentation/plan/` est une étape séparée, via `ecrire-plan-fichier`.

---

## 2. Processus

### 2.1. Comprendre l'issue

- Récupère le contenu de l'issue via `gh issue view <numéro>` (ou lis l'URL fournie)
- Identifie : le type (bug, feature, refactor, US), le périmètre, les critères d'acceptation, les dépendances
- Identifie les fichiers et modules impactés potentiels en explorant le codebase
- Identifie les ADRs existants qui contraignent ou guident les décisions d'architecture

### 2.2. Rechercher dans le codebase

Avant d'écrire le plan, explore les zones pertinentes :

- `module/` — la structure des modules existants
- `documentation/architecture/` — les ADRs, le modèle de données, l'intégration Foundry
- `documentation/plan/` — les plans existants (même format à suivre)
- Les fichiers mentionnés dans l'issue ou les issues liées
- Les tests existants (`tests/`) pour comprendre comment le code est testé

Utilise ces lectures pour identifier :
- Les patterns existants à respecter (conventions de nommage, structure de fichiers, hooks, etc.)
- Les API Foundry à utiliser (ApplicationV2, TypeDataModel, etc.)
- Les points d'intégration avec le code existant

### 2.3. Poser des questions si nécessaire

Si l'issue est ambiguë ou que des choix d'architecture sont ouverts, **pose des questions à l'utilisateur**. Ne présume pas. Les choix typiques à valider :

- Stockage des données : `flags` vs `system` (data model) → documenté dans ADR-0011
- Type de hook Foundry à utiliser pour l'interception
- Nouveau module autonome vs extension d'un module existant
- Approche UI : ApplicationV2 vs dialogue natif vs simple template
- Rétrocompatibilité : migration nécessaire ou non ?
- Tests : unitaires (Vitest) vs intégration vs manuels

Présente les options avec leurs avantages/inconvénients et laisse l'utilisateur trancher. Cite les ADRs ou les patterns existants qui appuient chaque option.

### 2.4. Valider les décisions clés

Avant de rédiger la version finale, résume les décisions prises et demande une confirmation :

> "Voici les choix retenus pour le plan :
> 1. Stockage dans `actor.flags.swerpg.X` (conforme ADR-0011)
> 2. Hook `updateActor` plutôt que surcharge de `_onUpdate` (approche AOP)
> 3. Nouveau fichier `module/utils/X.mjs`
> 
> Ces choix te conviennent-ils ?"

### 2.5. Rédiger le plan

Produis un plan validé comme message structuré, en respectant le format canonique des plans existants dans `documentation/plan/`. L'écriture du plan dans le dépôt est une étape séparée : le plan est d'abord livré et validé dans la conversation. Une fois validé, l'utilisateur peut utiliser `ecrire-plan-fichier` pour le matérialiser.

Le plan doit suivre la structure canonique :

```markdown
# Plan d'implémentation — <Titre>

**Issue** : [#N — Titre](url)
**Epic** : [#N — Titre](url) (si applicable)
**ADR** : `documentation/architecture/adr/adr-N-*.md` (si applicable)
**Module(s) impacté(s)** : `module/X.mjs` (création/modification)

---

## 1. Objectif

Pourquoi ce plan ? Quel problème résout-il ? Quel est le résultat attendu ?

## 2. Périmètre

### Inclus dans cette US / ce ticket

Liste précise de ce qui est couvert.

### Exclu de cette US / ce ticket

Liste de ce qui est explicitement hors scope (et renvoi vers l'US ou le ticket qui le couvre).

## 3. Constat sur l'existant

Analyse de l'état actuel du code : ce qui existe, ce qui manque, ce qui est cassé, les patterns en place.

## 4. Décisions d'architecture

Chaque décision importante est documentée avec :
- Le problème / la question
- Les options envisagées
- La décision retenue
- La justification

## 5. Plan de travail détaillé

Découpage en étapes implémentables indépendamment. Chaque étape décrit :
- Quoi faire (pas comment coder)
- Quels fichiers modifier
- Quels risques spécifiques

## 6. Fichiers modifiés

Tableau : fichier → action (création/modification) → description du changement

## 7. Risques

Tableau : risque → impact → mitigation

## 8. Proposition d'ordre de commit

Les commits dans l'ordre recommandé, chacun avec un message type conventional commit.

## 9. Dépendances avec les autres US

Si applicable : qui dépend de quoi, ordre d'implémentation conseillé.
```

> 💡 Inspire-toi du plan existant `documentation/plan/character-sheet/evolution-logs/US1-plan-audit-log-hooks.md` comme référence de qualité et de niveau de détail.

### 2.6. Vérifications finales

Avant de présenter le plan, vérifie :

- [ ] Toutes les sections du format canonique sont présentes
- [ ] Chaque décision d'architecture a une justification (pas de "parce que c'est comme ça")
- [ ] Les ADRs pertinents sont cités
- [ ] Le périmètre est clairement délimité (inclus vs exclu)
- [ ] Les risques sont identifiés avec des mitiations concrètes
- [ ] Les fichiers impactés sont listés avec leur action (création/modification)
- [ ] L'ordre de commit est réaliste
- [ ] Aucun code d'implémentation n'est présent dans le plan
- [ ] Le périmètre n'a pas été élargi au-delà de l'issue
- [ ] Le plan est livré comme message validé, pas comme fichier dans le dépôt

---

## 3. Conventions du projet à respecter

### Structure du code

```
module/
├── applications/    → Applications V2 (sheets, config, dialogs)
├── config/          → Données de configuration (skills, items, etc.)
├── documents/       → Extensions de documents Foundry (Actor, Item, etc.)
│   └── actor-mixins/ → Mixins pour SwerpgActor
├── models/          → Data models (TypeDataModel)
├── lib/             → Logique métier pure (skill factory, talent factory, etc.)
├── utils/           → Utilitaires transverses (logger, skill-costs, etc.)
└── hooks/           → Hooks spécifiques
documentation/
├── architecture/
│   ├── adr/         → Architecture Decision Records (conventions contraignantes)
│   ├── data/        → Schémas de données
│   ├── integration/ → Intégration Foundry
│   └── ui/          → Patterns UI
├── plan/            → Plans d'implémentation (ce que ce skill produit)
└── spec/            → Spécifications fonctionnelles
templates/
├── chat/            → Templates de messages de chat
├── sheets/          → Templates de feuilles (actor, item)
│   └── partials/    → Partials Handlebars
└── applications/    → Templates d'applications V2
lang/
├── en.json          → Internationalisation anglaise
└── fr.json          → Internationalisation française
styles/
├── *.less           → Sources LESS
└── swerpg.css       → CSS compilé
tests/               → Tests Vitest
```

### Conventions de codage

- Modules ES (`.mjs`) avec `import`/`export`
- Classes avec `PascalCase`, fonctions avec `camelCase`, constantes avec `UPPER_SNAKE_CASE`
- Méthodes privées : `#methodName` (vraie private syntax)
- ApplicationV2 pour toute nouvelle UI (pas de jQuery, pas de Handlebars Application v1)
- TypeDataModel pour les schémas de données (pas de simple ObjectField pour les données métier)
- Logger centralisé depuis `module/utils/logger.mjs` (pas de `console.log` direct)
- Tests Vitest dans `tests/` (un fichier par module)

### Patterns Foundry à privilégier

- **Hooks** : `Hooks.on(...)` pour l'interception transverse (approche AOP)
- **Surcharge** : override des méthodes `_preUpdate`, `_onUpdate`, `_preCreate` sur les classes document pour la logique métier attachée au cycle de vie
- **Flags** : `actor.flags.swerpg.*` pour les données secondaires (ADR-0011)
- **Data model** : `actor.system.*` pour les données cœur via `TypeDataModel.defineSchema()`
- **Sheets V2** : `ApplicationV2` avec `PARTS`, `TABS`, `tabGroups`
- **i18n** : `game.i18n.localize()` et `game.i18n.format()` — jamais de texte hardcodé

---

## 4. Exemple de section « Décisions d'architecture »

```
### 4.1. Hook global vs override de `_onUpdate`

**Décision** : Utiliser `Hooks.on('updateActor', ...)` plutôt que de surcharger `SwerpgActor._onUpdate()`.

Justification :
- Approche AOP : le code métier n'est pas modifié
- Séparation des concerns : l'audit log est un aspect transverse
- Désactivable : on peut retirer les hooks sans impacter le métier

### 4.2. Stockage des données

**Décision** : Stocker dans `actor.flags.swerpg.X` (conforme ADR-0011).

Raison : donnée secondaire, pas de source de vérité, pas de migration data model.
```
