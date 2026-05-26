# MC6 — Verrouiller les contrats config et valider la non-régression

**Issue** : [#414 — MC6 — Verrouiller les contrats config et valider la non-régression](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/414)

## Objectif

Fermer le chantier ADR-0018 côté configuration en garantissant que chaque constante centralisée par MC1 à MC5 est couverte par un test contractuel explicite, exposée de façon vérifiable via `SYSTEM.*` quand c’est attendu, puis en préparant l’activation de `no-magic-numbers` sans faux positifs bloquants.

## Décisions de cadrage

- Conserver un périmètre centré sur `tests/config/`, `module/config/` et `eslint.config.mjs` ; ne toucher aux modules de config eux-mêmes que si un trou de testabilité ou d’exposition est prouvé.
- Partir de l’existant : `tests/config/action.test.mjs`, `armor.test.mjs`, `adversaries.test.mjs`, `dice.test.mjs`, `items.test.mjs`, `progression.test.mjs`, `skills.test.mjs`, `system.test.mjs` et `weapon.test.mjs` servent de base et doivent être homogénéisés, pas dupliqués.
- Vérifier deux contrats distincts pour chaque constante du périmètre ADR-0018 : le contrat d’export direct depuis `module/config/*.mjs` et, lorsqu’il existe, le contrat d’exposition via `SYSTEM.*`.
- Limiter l’activation ESLint aux exceptions minimales strictement justifiées (par exemple littéraux contractuels dans les tests ou surfaces explicitement hors champ ADR-0018), sans rouvrir un refactor fonctionnel hors config.

## Étapes d’implémentation

### 1. Cartographier les constantes config et leurs gaps de couverture

**Fichiers cibles** : `module/config/system.mjs`, `module/config/skills.mjs`, `module/config/action.mjs`, `module/config/adversaries.mjs`, `module/config/armor.mjs`, `module/config/dice.mjs`, `module/config/items.mjs`, `module/config/progression.mjs`, `module/config/weapon.mjs`, `tests/config/*.test.mjs`

**What**

- dresser la matrice des constantes introduites ou consolidées par MC1 à MC5, avec leur module source et leur éventuelle exposition `SYSTEM.*` ;
- repérer les trous restants dans `skills.test.mjs` et `system.test.mjs`, mais aussi les contrats partiels déjà présents dans les autres fichiers `tests/config/` ;
- figer une correspondance explicite “export → test direct → test d’exposition” pour éviter les oublis lors de la finalisation.

**Validation visée** : chaque constante du périmètre ADR-0018 est rattachée à un test contractuel identifié, sans zone grise entre export direct et exposition système.

### 2. Compléter et homogénéiser la suite `tests/config/`

**Fichiers cibles** : `tests/config/skills.test.mjs`, `tests/config/system.test.mjs`, `tests/config/dice.test.mjs`, `tests/config/items.test.mjs`, `tests/config/weapon.test.mjs`, `tests/config/action.test.mjs`, plus `tests/config/adversaries.test.mjs`, `tests/config/armor.test.mjs`, `tests/config/progression.test.mjs` si nécessaire pour fermer les gaps identifiés

**What**

- compléter les assertions manquantes sur les exports nommés, les valeurs attendues et les relations métier simples (bornes, appartenance à un registre, non-vacuité) ;
- ajouter ou renforcer les tests d’exposition `SYSTEM.*`, y compris les cas sensibles déjà centralisés via `Object.defineProperty` ou `Object.freeze` (`SYSTEM.SKILLS`, registres `ACTION`, `WEAPON`, `PROGRESSION`, etc.) ;
- harmoniser le niveau d’exigence des tests pour que les fichiers `tests/config/` expriment un contrat stable et lisible, sans assertions redondantes ni couverture implicite cachée ailleurs.

**Validation visée** : `tests/config/` devient la source de vérité observable des contrats de configuration centralisés par ADR-0018.

### 3. Sécuriser le verrou final `pnpm test` + `no-magic-numbers`

**Fichiers cibles** : `eslint.config.mjs`, ajustements ciblés éventuels dans `tests/config/*.test.mjs` ou `module/config/system.mjs` uniquement si requis par les validations finales

**What**

- activer la règle ESLint `no-magic-numbers` avec une stratégie d’exceptions minimale et explicite, cohérente avec ADR-0018 et la nature contractuelle des tests ;
- corriger les derniers faux positifs prouvés ou angles morts de couverture révélés par les validations globales, sans élargir le chantier à un nettoyage opportuniste du reste de la codebase ;
- vérifier la fermeture de boucle de la feature `#408` en s’assurant que la suite de tests et le lint rendent toute réintroduction de constantes magiques observable.

**Validation visée** : `pnpm test` passe intégralement et `no-magic-numbers` devient activable sans régression ni faux positif bloquant sur le périmètre ADR-0018.

## Résultat attendu

- Chaque constante config centralisée par MC1 à MC5 possède un test contractuel explicite et, quand applicable, un test d’exposition via `SYSTEM.*`.
- La suite `tests/config/` couvre de façon homogène les modules de configuration visés par l’issue.
- La règle ESLint `no-magic-numbers` peut être activée avec un niveau d’exceptions maîtrisé, ce qui verrouille durablement la non-régression ADR-0018.
