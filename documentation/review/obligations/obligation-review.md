# Code Review — Domaine « Obligations »

- **Date** : 2026-06-07
- **Périmètre** : tout le domaine obligations (modèle, sheet, character integration, calculateurs, importer, config, templates, i18n)
- **Reviewer** : Claude Opus 4.8 (tech lead senior)
- **Fichiers couverts** :
  - `module/models/obligation.mjs`
  - `module/applications/sheets/obligation.mjs`
  - `templates/sheets/partials/obligation-config.hbs`
  - `module/models/character.mjs` (méthodes `_prepareExperience`, `_prepareCredits`, `#extractObligationData`)
  - `module/applications/sheets/character-sheet.mjs` (`#buildObligationList`, `#buildObligationDisplayData`, `#computeObligationPoints`, `#onToggleObligationExtraState`)
  - `templates/sheets/actor/character-commitments.hbs`
  - `module/lib/obligations/obligation-bonus-calculator.mjs`
  - `module/lib/credits/obligation-bonus-calculator.mjs`
  - `module/lib/credits/index.mjs`
  - `module/lib/credits/credit-calculator.mjs`
  - `module/config/progression.mjs` (constantes `OBLIGATION_EXTRA_CREDITS_5/_10`)
  - `module/importer/items/obligation-ogg-dude.mjs`
  - `module/importer/utils/obligation-import-utils.mjs`
  - `lang/en.json` + `lang/fr.json` (bloc `OBLIGATION`)

---

## Forces

- **Séparation domaine / adaptateur Foundry respectée.** `#extractObligationData` est l'unique bridge Item → objet plat ; les calculateurs (`lib/obligations/`) n'ont aucune dépendance Foundry. Conforme à l'ADR et au `CLAUDE.md`.
- **Budget défensif.** `computeCreditBudget` sanitise NaN/Infinity/négatifs ; `_prepareCredits` lit `_source` pour éviter la propagation d'un `_preparePrice()` cassé. Bien pensé.
- **Importer OggDude robuste.** Tolérant aux erreurs (rejette sans crash), observable (stats total/imported/rejected + métriques globales via `global-import-metrics.mjs`), traçabilité flags `oggdude*`.
- **Dérivés non persistés correctement isolés.** Aucun `document.update()` dans `prepareDerivedData`, conformément à la règle projet.
- **Logger central** utilisé partout (`logger.debug/warn/error`), aucun `console.*` direct.
- **Couverture de tests large.** 12 fichiers de test touchent l'obligation (importer, calculateurs, config, intégration acteur).

---

## Faiblesses

### 🔴 Bloquantes / dette critique

**1. Calculateur dupliqué + barrel mort.**

`module/lib/credits/obligation-bonus-calculator.mjs` n'est qu'un wrapper de re-export de `module/lib/obligations/obligation-bonus-calculator.mjs` (la source canonique).

- Le runtime (`character.mjs`) importe **directement** `lib/obligations/…`, pas le wrapper.
- `lib/credits/index.mjs` réexporte le wrapper mais n'est importé **par personne** (0 hit runtime, 0 hit test).
- `tests/lib/credits/obligation-bonus-calculator.test.mjs` teste le wrapper en double de `tests/lib/obligations/…`.

Résultat : trois fichiers de code mort entretenus. Le commentaire du wrapper justifie son existence par les « credit-calculator consumers » — mais `credit-calculator.mjs` n'importe pas ce wrapper.

**Action :** supprimer `lib/credits/obligation-bonus-calculator.mjs`, `lib/credits/index.mjs` (ou le réduire au seul `credit-calculator`), et `tests/lib/credits/obligation-bonus-calculator.test.mjs`. Une seule source de vérité dans `lib/obligations/`.

---

**2. Constantes de règle métier définies, testées, mais jamais branchées.**

`module/config/progression.mjs` exporte `OBLIGATION_EXTRA_CREDITS_5 = 1000` et `OBLIGATION_EXTRA_CREDITS_10 = 2500`, exposées via `SYSTEM.PROGRESSION` et couvertes par `tests/config/progression.test.mjs`.

La règle FFG documentée en commentaire dans le calculateur est : « +5 Obligation → 1 000 cr, +10 → 2 500 cr ».

Or **aucun code runtime ne connecte ces constantes au comportement réel** : le calculateur somme `item.system.extraCredits` librement (schéma `min:0 max:5000 step:500`), et la `value` de l'obligation n'est jamais lue pour dériver `extraCredits`. Les constantes créent un faux sentiment de couverture.

**Action :** trancher avec le game design — soit appliquer la règle (dériver `extraCredits` depuis `value`), soit supprimer les constantes et leurs tests.

---

**3. Lacune de localisation FR.**

`lang/en.json` contient le bloc `OBLIGATION.FIELDS.*` (consommé via `LOCALIZATION_PREFIXES = ['OBLIGATION']` dans le modèle). `lang/fr.json` **n'a aucune clé `OBLIGATION`** : les labels et hints du sheet d'item s'affichent en anglais (ou en clé brute) pour les utilisateurs FR. Régression directe vs l'effort de localisation récent (commit `b566da5a`).

**Action :** ajouter le miroir `OBLIGATION.FIELDS.*` dans `lang/fr.json`.

---

### 🟠 Importantes

**4. Chaînes UI codées en dur dans les templates.**

`templates/sheets/actor/character-commitments.hbs` : `"Obligations"`, `"name"`, `"extra"`, `"actions"`, `"Toggle Extra Obligation"` (titre et tooltip), attributs `alt`. `templates/sheets/partials/obligation-config.hbs` : `<legend>Extra bonus</legend>`. Violation de la règle projet « no hard-coded user-facing strings ».

**Action :** extraire en clés `SWERPG.…`, localiser EN + FR.

---

**5. Sheet d'item ne contrôle pas `isExtra`.**

`obligation-config.hbs` affiche `value`, `extraXp`, `extraCredits` mais **pas** `isExtra`. Le toggle n'existe que sur la character sheet. Conséquence : on peut saisir `extraCredits = 2 500` avec `isExtra = false` — le bonus est silencieusement ignoré par le calculateur (`filter(o => o.isExtra === true)`), sans aucun retour visuel.

**Action :** exposer `isExtra` dans le partial (et idéalement masquer/désactiver `extraXp`/`extraCredits` quand `false`) — ou documenter explicitement que `isExtra` se pilote uniquement depuis la character sheet.

---

**6. Handler toggle sans garde de robustesse.**

`character-sheet.mjs` `#onToggleObligationExtraState` (l. 400–408) :

```js
const element = event.target.closest('.obligation')
const itemId = element.dataset.itemId          // NPE si element est null
const item = this.actor.items.get(itemId)
logger.debug(`... for ${item.name}`)           // NPE si item est undefined
await item.update(...)
```

Aucun guard sur `element` ni sur `item`. Le reste du fichier adopte le pattern early-return sur ces cas.

**Action :** ajouter `if (!element || !item) return` en tête.

---

### 🟡 Mineures

**7. JSDoc erroné — copier/coller.**
`module/models/obligation.mjs` l. 2 : « Data schema … specific to **Ancestry** type Items. » — c'est Obligation, pas Ancestry.

**8. `validateJoint(data) {}` vide.**
`obligation.mjs` l. 62 : override no-op. À supprimer (héritage suffit) ou à porter une vraie contrainte (ex. cohérence `isExtra` / `extra*`).

**9. Commentaires français dans l'importer.**
`obligation-ogg-dude.mjs` l. 64–65 : `// Default obligation value per schema`, `// Default: not an extra obligation` — en anglais, OK. Mais `obligation.mjs` l. 38 `// Actions spécifiques à ObligationSheet` en français. Convention projet : anglais pour le code.

**10. `value` du schéma : `step:5 max:50` sans validation à l'écriture API.**
`step:5` est une contrainte UI uniquement ; rien ne garantit un multiple de 5 via l'API ou l'import (l'importer force `value: 10` en dur). Pas un bug bloquant, mais la règle FFG « valeur obligatoirement multiple de 5 » n'est pas contractualisée.

---

## Tableau de remédiation

| Prio | Lot           | Action                                                                                                        | Effort |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| P0   | 1 — Nettoyage | Supprimer `lib/credits/obligation-bonus-calculator.mjs`, `lib/credits/index.mjs`, test redondant              | XS     |
| P0   | 1 — Nettoyage | Corriger JSDoc `obligation.mjs:2` (Ancestry → Obligation)                                                     | XS     |
| P0   | 1 — Nettoyage | Retirer `validateJoint(data) {}` vide                                                                         | XS     |
| P1   | 2 — i18n      | Ajouter `OBLIGATION.FIELDS.*` dans `lang/fr.json`                                                             | XS     |
| P1   | 2 — i18n      | Extraire chaînes en dur de `character-commitments.hbs` + `obligation-config.hbs` en clés `SWERPG.…` (EN + FR) | S      |
| P1   | 3 — Métier    | Ajouter guard `element`/`item` dans `#onToggleObligationExtraState`                                           | XS     |
| P1   | 3 — Métier    | Exposer `isExtra` dans `obligation-config.hbs`                                                                | XS     |
| P2   | 3 — Métier    | Trancher `OBLIGATION_EXTRA_CREDITS_5/_10` : brancher ou supprimer                                             | M      |

---

## Vérification

```bash
# Après Lot 1
pnpm vitest run tests/lib/obligations tests/config/progression.test.mjs
pnpm run lint && pnpm fmt:check

# Après Lot 2-3
# Smoke manuel : ouvrir un Character, onglet Commitments
# → toggle isExtra, vérifier XP total et budget crédits bougent du bon montant
# → ouvrir sheet item obligation, vérifier labels en FR
# → vérifier que saisie extraCredits avec isExtra=false n'applique aucun bonus
```

---

## Verdict

**État global : domaine central sain, périmètre adjacent à nettoyer.**

La séparation domaine pur / adaptateur Foundry est respectée, les calculs sont défensifs, l'importer est production-ready. La couverture de test est large.

Deux zones rouges :

- **(a) Code mort trompeur** — calculateur en double + barrel inutilisé entretenu comme code vivant.
- **(b) Règle métier fantôme** — constantes FFG définies + testées mais déconnectées du runtime.

Plus une lacune i18n FR immédiate. Aucun bug bloquant identifié en runtime. **Nettoyer P0+P1 avant toute nouvelle feature credits/XP obligation.**
