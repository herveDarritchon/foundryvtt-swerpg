# EW2 — Compléter les types JSDoc manquants

**Issue** : [#438 — EW2 — Compléter les types JSDoc manquants](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/438)

## Objectif

Réduire le lot principal de warnings `jsdoc/require-param-type` du chantier `ESLint Warnings Reduction` en ajoutant uniquement des types JSDoc mécaniques, prudents et justifiables, sans changement comportemental ni invention de contrats métier incertains.

## Décisions de cadrage

- Limiter le périmètre aux occurrences remontées par `jsdoc/require-param-type` dans le scope déjà retenu pour la feature : `module/**/*.mjs`, `tests/**/*.mjs` et `swerpg.mjs`.
- Prioriser les fichiers les plus denses en warnings pour obtenir une baisse visible du backlog sans disperser le lot.
- Ajouter des types larges, observables et défendables (`string`, `number`, `boolean`, `object`, `Array<...>`, unions simples, nullable) plutôt que des types métier spéculatifs.
- Réutiliser les typedefs, shapes et conventions JSDoc déjà présents quand ils existent localement, sans ouvrir de refactor documentaire transverse.
- Exclure de ce lot les descriptions JSDoc manquantes, les paramètres mal nommés, les warnings de code et le chantier ADR-0018 `no-magic-numbers`.

## Étapes d’implémentation

### 1. Borner le lot EW2 et ordonner les fichiers

**Fichiers cibles** : fichiers remontés par `jsdoc/require-param-type`, avec priorité aux modules les plus denses

**What**

- partir du baseline ESLint laissé par EW1 pour isoler uniquement les warnings `jsdoc/require-param-type` ;
- regrouper les occurrences par fichier ou module cohérent afin de garder une revue lisible ;
- confirmer avant modification quels cas relèvent d’un ajout mécanique de type et quels cas doivent rester hors lot si le contrat n’est pas suffisamment observable.

**Validation visée** : le lot EW2 est borné, priorisé et ne mélange pas les warnings d’autres stories.

### 2. Compléter les types JSDoc manquants sans élargir le contrat

**Fichiers cibles** : uniquement les fichiers confirmés à l’étape 1

**What**

- ajouter les types manquants sur les paramètres signalés par ESLint ;
- choisir le type le plus simple compatible avec l’usage réel visible localement, sans profiter du chantier pour renommer, restructurer ou documenter davantage que nécessaire ;
- harmoniser au passage les formes JSDoc minimales nécessaires quand cela évite des incohérences locales dans un même bloc commenté.

**Validation visée** : les warnings `jsdoc/require-param-type` disparaissent sur le lot traité sans création de documentation trompeuse.

### 3. Stabiliser le résiduel et préparer EW3/EW5

**Fichiers cibles** : fichiers modifiés EW2, rapport ESLint du lot

**What**

- relever les cas éventuellement exclus car nécessitant un arbitrage métier ou une clarification de contrat ;
- laisser le terrain propre pour EW3 en n’ajoutant pas de descriptions éditoriales inutiles dans ce lot ;
- consigner le résiduel attendu pour la revalidation globale EW5.

**Validation visée** : EW2 ferme le lot mécanique des types JSDoc et laisse un résiduel clairement qualifié pour la suite.

## Résultat attendu

- Le backlog `jsdoc/require-param-type` baisse fortement sur le scope priorisé.
- Les types ajoutés restent prudents, alignés sur le code observable et non spéculatifs.
- Aucun warning hors périmètre EW2 n’est absorbé opportunistement dans ce chantier.
