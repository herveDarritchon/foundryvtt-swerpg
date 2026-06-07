# Character Sheet — Appliquer les règles officielles de bonus de création liés aux Obligations

**Issue** : [#646 — Appliquer les règles officielles de bonus de création liés aux Obligations](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/646)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Faire respecter dans le runtime SWERPG les règles officielles FFG/Edge des bonus de création liés aux Obligations, afin que la fiche personnage ne somme plus librement des valeurs saisies mais dérive un état canonique, validé et lisible côté UI.

## Contexte utile

- `module/config/progression.mjs` porte déjà `STARTING_CREDITS`, `OBLIGATION_EXTRA_CREDITS_5` et `OBLIGATION_EXTRA_CREDITS_10`, mais le domaine n'exprime pas encore les paliers XP officiels ni un contrat métier complet pour les bonus de création.
- `module/lib/obligations/obligation-bonus-calculator.mjs` additionne actuellement `extraXp` et `extraCredits` pour les obligations `isExtra === true`, sans vérifier les combinaisons autorisées, les doublons d'option ni le coût total en Obligation supplémentaire.
- `module/models/character.mjs` dérive déjà `progression.credits`, `creditBudget` et `creditsInfo`, tandis que `CharacterSheet` expose `obligations` et `obligationPoints`, mais aucun diagnostic métier n'indique si l'état courant respecte les règles officielles.
- Le cadrage `documentation/cadrage/character-sheet/obligations/cadrage-obligations-star-wars-edge-aux-confins-empire.md` formalise la matrice à appliquer : `+5 XP`, `+10 XP`, `+1 000 crédits`, `+2 500 crédits`, chaque option au plus une fois, avec un plafond d'Obligation supplémentaire borné par la valeur de départ.

## Plan d'implémentation

### Étape 1 — Canoniser les options officielles de bonus de création dans le domaine pur

**Fichiers** : `module/config/progression.mjs`, `module/lib/obligations/obligation-bonus-calculator.mjs`, `tests/config/progression.test.mjs`, `tests/lib/obligations/obligation-bonus-calculator.test.mjs`

**What** :

- ajouter des constantes nommées pour les paliers XP d'Obligation, au même niveau que les constantes crédits déjà présentes ;
- faire évoluer le calculateur pur pour qu'il ne retourne plus seulement des sommes brutes, mais un récapitulatif canonique des bonus sélectionnés (`xp`, `credits`, coût total en Obligation supplémentaire, options reconnues, incohérences détectées) ;
- verrouiller par tests les cas officiels valides (`+5 XP`, `+10 XP`, `+1 000 crédits`, `+2 500 crédits`, combinaison `+5 XP +1 000 crédits`) ainsi que les états invalides (montants non officiels, doublons, bonus marqués `isExtra` mais incohérents).

**Résultat attendu** : le domaine Obligation possède une source unique de vérité pour les bonus de création et sait distinguer un bonus officiel d'une saisie libre invalide.

### Étape 2 — Brancher un état dérivé de conformité des bonus sur le personnage

**Fichiers** : `module/models/character.mjs`, `module/models/obligation.mjs`, `tests/models/obligation.test.mjs`, `tests/applications/sheets/character-sheet-inventory.test.mjs`

**What** :

- enrichir la préparation du personnage avec une structure dérivée dédiée aux bonus de création liés aux Obligations (bonus XP, bonus crédits, coût supplémentaire consommé, reste disponible, erreurs métier éventuelles) ;
- relier explicitement cet état dérivé au plafond officiel d'Obligation supplémentaire au lieu de laisser l'UI ou les items interpréter seuls les champs `value`, `extraXp` et `extraCredits` ;
- clarifier dans le modèle `SwerpgObligation` les invariants réellement portés par le schéma vs ceux délégués au calculateur métier pour éviter les validations contradictoires.

**Résultat attendu** : la couche modèle expose un diagnostic métier prêt à consommer, stable et centralisé, sans doubles calculs dispersés dans les feuilles.

### Étape 3 — Encadrer l'édition et rendre visibles les écarts sur la fiche personnage

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `templates/sheets/partials/obligation-config.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- exposer dans le contexte de sheet un résumé lisible des bonus de création issus des Obligations et des éventuelles anomalies de conformité ;
- faire évoluer l'UI d'édition pour guider vers les seules options officielles (au lieu d'autoriser silencieusement des montants arbitraires) et afficher clairement quand une combinaison sort du cadre FFG/Edge ;
- ajouter les clés i18n EN/FR nécessaires pour les libellés, aides et messages de validation du parcours d'édition des Obligations.

**Résultat attendu** : la fiche personnage et la fiche item rendent les bonus de création compréhensibles, bornés par les règles officielles et immédiatement auditables par le joueur comme par le MJ.

## Périmètre / hors périmètre

### Inclus

- formalisation canonique des paliers officiels XP / crédits liés aux Obligations à la création
- dérivation centralisée d'un état de conformité des bonus sur le personnage
- encadrement UI des saisies et visualisation des écarts côté fiches

### Exclus

- refonte large du domaine Obligation hors bonus de création (tirage, résolution, diminution/augmentation en campagne)
- enrichissement narratif détaillé d'une Obligation individuelle traité par l'issue `#647`
- changements génériques du système de crédits non directement requis pour appliquer les règles officielles d'Obligation
