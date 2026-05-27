# EW1 — Appliquer les auto-fix et warnings triviaux

**Issue** : [#437 — EW1 — Appliquer les auto-fix et warnings triviaux](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/437)

## Objectif

Obtenir le gain rapide initial du chantier `ESLint Warnings Reduction` en absorbant les warnings auto-fixables et triviaux sur le scope lint visé, sans toucher au lot ADR-0018 `no-magic-numbers` ni engager de refactor fonctionnel.

## Décisions de cadrage

- Limiter le lot aux corrections mécaniques remontées par la passe d'auto-fix et aux warnings triviaux explicitement cités par le cadrage (`eqeqeq`, `no-var`, cas simples de style/coercion/escape).
- Travailler sur le scope indicatif déjà défini pour la feature : `module/**/*.mjs`, `tests/**/*.mjs` et `swerpg.mjs`, sans élargir opportunistement à d'autres chantiers.
- Exclure les warnings demandant du contexte métier ou éditorial (`jsdoc/require-param-type`, `jsdoc/require-description`, `jsdoc/check-param-names`, `no-proto`, `no-promise-executor-return`) qui relèvent des lots EW2 à EW4.
- Exclure strictement les warnings `no-magic-numbers`, qui doivent rester rattachés au plan ADR-0018 séparé.

## Étapes d’implémentation

### 1. Cadrer le lot mécanique EW1

**Fichiers cibles** : fichiers remontés par la passe d'auto-fix dans `module/**/*.mjs`, `tests/**/*.mjs`, `swerpg.mjs`

**What**

- partir du baseline ESLint de la feature pour isoler les warnings réellement auto-fixables ou triviaux ;
- séparer explicitement ce qui relève de EW1 de ce qui doit rester pour EW2, EW3, EW4 et EW6 ;
- figer un lot court et relisible centré sur les corrections sans ambiguïté comportementale.

**Validation visée** : le périmètre EW1 est borné et ne mélange pas les warnings contextuels ou ADR-0018.

### 2. Appliquer les corrections automatiques et triviales

**Fichiers cibles** : uniquement les fichiers du lot EW1 confirmés à l’étape 1

**What**

- appliquer les auto-fix sûrs produits par ESLint sur le lot retenu ;
- compléter manuellement les warnings triviaux résiduels de même nature quand la correction est locale et évidente ;
- vérifier que chaque modification reste syntaxique, structurelle ou documentaire, sans changement métier intentionnel.

**Validation visée** : les warnings EW1 disparaissent du lot traité sans introduire de refactor transverse.

### 3. Préparer le relais vers les lots suivants

**Fichiers cibles** : rapport ESLint du lot, fichiers modifiés EW1

**What**

- relever le résiduel non traité après EW1 ;
- router les `jsdoc/require-param-type` vers EW2, les `jsdoc/require-description` vers EW3, les warnings de code restants vers EW4, et les `no-magic-numbers` vers EW6 / ADR-0018 ;
- laisser un bilan clair de ce qui a été absorbé mécaniquement et de ce qui exige encore du contexte.

**Validation visée** : EW1 ferme uniquement le gain rapide et prépare une suite de lots proprement découpée.

## Résultat attendu

- Les warnings auto-fixables et triviaux du lot initial ne remontent plus sur le scope EW1.
- Aucun warning `no-magic-numbers` n’est absorbé dans ce chantier.
- Le résiduel restant est clairement redistribué vers EW2, EW3, EW4 et EW6.
