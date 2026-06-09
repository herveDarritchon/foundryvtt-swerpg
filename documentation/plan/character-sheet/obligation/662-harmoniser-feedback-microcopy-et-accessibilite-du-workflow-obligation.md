# Character Sheet — Harmoniser feedback, microcopy et accessibilité du workflow Obligation

**Issue** : [#662 — Harmoniser feedback, microcopy et accessibilité du workflow Obligation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/662)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Finaliser la qualité d’usage du workflow Obligation après les parcours guidés déjà introduits, afin que chaque état du flux soit compréhensible, localisé et accessible, avec un feedback positif explicite quand la configuration est conforme.

## Contexte utile

- Les issues `#656` à `#661` ont déjà structuré le workflow : CTA d’ajout, séparation narratif / bonus, sélecteur guidé, prévention des doublons/dépassements, suppression claire et fallback expert sécurisé.
- `templates/sheets/actor/character-commitments.hbs` expose déjà un résumé de création, un état vide et une liste des bonus, mais le feedback positif, les messages d’indisponibilité et les affordances accessibles restent à homogénéiser.
- `templates/sheets/partials/obligation-config.hbs` et `module/applications/sheets/obligation.mjs` portent encore le fallback expert de la fiche item, qui doit rester cohérent avec la microcopy et les signaux du parcours principal.
- `styles/actor.less` et `styles/item.less` contiennent déjà les styles des résumés / CTA / états Obligation ; l’issue impose de compléter ces états sans sortir du système de design tokens ADR-0022.

## Plan d'implémentation

### Étape 1 — Unifier les états de feedback et rendre le succès réellement informatif

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- enrichir le contexte de l’onglet `Commitments` pour distinguer explicitement les états vide, succès conforme, avertissement et erreur, au lieu de n’exposer qu’un résumé partiellement binaire ;
- reformuler la microcopy de succès pour afficher clairement l’impact validé sur les XP, les crédits et l’Obligation consommée, afin que la conformité soit perçue comme un résultat utile et non comme une simple absence d’erreur ;
- homogénéiser et localiser EN/FR les titres, messages d’état, résumés et libellés de synthèse visibles dans le workflow principal.

**Résultat attendu** : l’utilisateur comprend immédiatement l’état courant du workflow et voit explicitement ce qu’une configuration valide lui apporte.

### Étape 2 — Rendre les actions et indisponibilités accessibles sans dépendre de la couleur seule

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `module/applications/sheets/obligation.mjs`, `templates/sheets/actor/character-commitments.hbs`, `templates/sheets/partials/obligation-config.hbs`, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- compléter les actions principales avec labels visibles ou accessibles, tooltips cohérents, textes d’aide et associations sémantiques utiles (`aria-*`, rôle/status/alert quand pertinent) ;
- faire porter aux options indisponibles une raison textuelle explicite et localisée (déjà prise, dépassement du plafond, fallback expert recommandé, etc.), au lieu de s’appuyer principalement sur la couleur ou l’état disabled implicite ;
- aligner la fiche item `obligation` sur ce contrat de microcopy/accessibilité pour que le fallback expert conserve les mêmes repères que le parcours guidé.

**Résultat attendu** : toutes les actions clés restent compréhensibles au clavier et au lecteur d’écran, et une option bloquée explique son état sans ambiguïté.

### Étape 3 — Finaliser les styles d’état/focus par tokens et verrouiller les validations ciblées

**Fichiers** : `styles/actor.less`, `styles/item.less`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- compléter les variantes visuelles nécessaires pour les états vide / succès / avertissement / erreur, les raisons d’indisponibilité et les focus clavier visibles sur les CTA et contrôles du workflow ;
- vérifier que tous les ajouts de style utilisent uniquement des design tokens existants du projet ou de Foundry, sans couleur ou police en dur ;
- étendre les tests de rendu/accessibilité ciblés pour couvrir les nouveaux états, les messages d’indisponibilité, les labels/tooltips essentiels et le feedback positif attendu, puis documenter dans le plan de validation le smoke manuel de l’onglet `Commitments` demandé par l’issue.

**Résultat attendu** : le workflow possède des états visuels et focus lisibles, cohérents et contractualisés par tests ciblés.

## Périmètre / hors périmètre

### Inclus

- harmonisation de la microcopy et des feedbacks du workflow Obligation
- accessibilité des actions, états et options indisponibles du parcours principal et du fallback expert
- styles tokenisés et validations ciblées du périmètre `Commitments` / fiche item `obligation`

### Exclus

- nouvelle refonte métier des règles de bonus d’Obligation déjà cadrées par `#646` à `#661`
- ajout d’un nouveau modèle de données ou d’un nouveau parcours fonctionnel hors harmonisation UX/a11y
- exécution des tests, lint ou smoke dans le cadre de ce plan
