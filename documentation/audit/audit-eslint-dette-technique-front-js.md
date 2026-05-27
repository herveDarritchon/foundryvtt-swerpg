# Rapport ESLint — analyse Tech Lead Front JS

Source analysée : sortie ESLint fournie dans `Texte collé.txt`, total annoncé `296 problems (0 errors, 296 warnings)`

## Synthèse exécutive

Le codebase n’a **aucune erreur bloquante ESLint**, mais il a un **niveau de bruit très élevé** : 296 warnings. Le sujet principal n’est pas un bug runtime immédiat, c’est une **dette qualité / maintenabilité**.

Répartition principale :

| Famille                             |                                                                                                     Règles | Volume | Gravité          | Priorité              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------: | -----: | ---------------- | --------------------- |
| Documentation JSDoc incomplète      | `jsdoc/require-param-type`, `jsdoc/require-description`, `jsdoc/check-param-names`, `jsdoc/require-yields` |    238 | Faible à moyenne | P2                    |
| Code legacy JS risqué               |                                                        `eqeqeq`, `no-var`, `no-alert`, `no-useless-escape` |     26 | Moyenne          | P1                    |
| Anti-pattern Promise                |                                                                               `no-promise-executor-return` |      5 | Moyenne à élevée | P1                    |
| Nombres magiques                    |                                                                                         `no-magic-numbers` |     15 | Faible à moyenne | P2                    |
| Usage de `__proto__` dans les tests |                                                                                                 `no-proto` |     12 | Moyenne          | P1/P2 selon intention |
| Signal JSDoc incohérent             |                                                                                  `jsdoc/check-param-names` |      6 | Moyenne          | P1                    |

Le vrai point rouge est `module/utils/xml2json.js` : **30 warnings à lui seul**, avec `var`, `==`, `alert`, échappement inutile et JSDoc incomplet. C’est très probablement un fichier legacy ou importé. Il faut décider explicitement : **on le modernise, on l’isole, ou on le remplace**.

---

# 1. État global

## 1.1 Volume par règle

| Règle ESLint                 | Nombre | Lecture Tech Lead                                                  |
| ---------------------------- | -----: | ------------------------------------------------------------------ |
| `jsdoc/require-param-type`   |    186 | Trop de formalisme JSDoc appliqué partout, y compris tests/helpers |
| `jsdoc/require-description`  |     45 | Principalement bruit documentaire dans les tests                   |
| `eqeqeq`                     |     16 | Comparaisons faibles potentiellement dangereuses                   |
| `no-magic-numbers`           |     15 | Constantes implicites à nommer                                     |
| `no-proto`                   |     12 | Usage déprécié de `__proto__`, surtout dans tests                  |
| `no-var`                     |      8 | JS legacy, à migrer vers `let` / `const`                           |
| `jsdoc/check-param-names`    |      6 | Documentation fausse ou obsolète                                   |
| `no-promise-executor-return` |      5 | Anti-pattern Promise, correction simple mais importante            |
| `jsdoc/require-yields`       |      1 | Générateur mal documenté                                           |
| `no-alert`                   |      1 | UI bloquante / debug legacy                                        |
| `no-useless-escape`          |      1 | Nettoyage mineur                                                   |

## 1.2 Répartition production vs tests

| Zone      | Warnings | Lecture                                                     |
| --------- | -------: | ----------------------------------------------------------- |
| `module/` |      166 | Dette présente dans le code applicatif                      |
| `tests/`  |      130 | Beaucoup de bruit JSDoc probablement inutile ou trop strict |

Conclusion claire : **la configuration ESLint est trop uniforme**. Elle applique des exigences de documentation de production à des fichiers de test. Ça gonfle artificiellement le backlog.

---

# 2. Classement par priorité

## P1 — À corriger en premier

Ces problèmes peuvent masquer des bugs ou rendent le code fragile.

### 2.1 Comparaisons faibles `==`

**Règle :** `eqeqeq`
**Volume :** 16
**Fichier principal :** `module/utils/xml2json.js`

### Problème

`==` et `!=` déclenchent des coercitions implicites JavaScript. Exemple classique : `0 == false`, `'' == false`, `null == undefined`.

Dans un parseur XML/JSON, ce genre de comportement est dangereux, car les valeurs peuvent venir de texte, d’attributs XML ou de nœuds absents.

### Solution recommandée

Remplacer systématiquement :

```js
if (value == null) {
}
```

par :

```js
if (value === null) {
}
```

Mais attention : le cas `value == null` est parfois volontaire pour couvrir `null` **et** `undefined`.

Dans ce cas, écrire explicitement :

```js
if (value === null || value === undefined) {
}
```

ou plus moderne :

```js
if (value == null) {
}
```

avec désactivation locale commentée uniquement si c’est intentionnel :

```js
// eslint-disable-next-line eqeqeq -- intentional nullish check: matches null and undefined
if (value == null) {
}
```

### Décision recommandée

Ne pas faire un remplacement automatique aveugle sur `xml2json.js`. Il faut relire les conditions une par une.

---

## 2.2 Usage de `var`

**Règle :** `no-var`
**Volume :** 8
**Fichier principal :** `module/utils/xml2json.js`

### Problème

`var` a une portée fonctionnelle, pas une portée bloc. Ça peut créer des effets de bord subtils dans les boucles, closures et conditions.

### Solution recommandée

Remplacer par :

```js
const value = computeValue()
```

si la variable n’est pas réassignée.

Sinon :

```js
let value = initialValue
```

### Risque

Faible si les tests couvrent le parseur XML. Moyen si `xml2json.js` est critique et peu testé.

---

## 2.3 `alert` dans du code applicatif

**Règle :** `no-alert`
**Volume :** 1
**Fichier :** `module/utils/xml2json.js`

### Problème

`alert()` bloque le thread UI, dégrade l’expérience et ne s’intègre pas au système de notification/logging.

### Solution recommandée

Dans un contexte FoundryVTT, préférer probablement :

```js
ui.notifications.error('Message d’erreur')
```

ou, pour un utilitaire bas niveau :

```js
console.error(error)
```

ou remonter une exception :

```js
throw new Error('Invalid XML input')
```

### Décision Tech Lead

Un utilitaire comme `xml2json` ne devrait probablement **pas** afficher directement une alerte utilisateur. Il devrait retourner une erreur ou lever une exception, et laisser l’appelant décider de l’affichage.

---

## 2.4 `no-promise-executor-return`

**Règle :** `no-promise-executor-return`
**Volume :** 5
**Fichiers concernés :**

- `module/utils/audit-log.mjs`
- `tests/importer/global-import-metrics.spec.mjs`
- `tests/importer/last-import-stats-fix.spec.mjs`

### Problème

Dans :

```js
new Promise((resolve) => return resolve(value));
```

la valeur retournée par l’executor Promise est ignorée. Ce n’est pas toujours un bug, mais c’est un signal de code confus.

### Correction type

Avant :

```js
return new Promise((resolve) => setTimeout(resolve, 100))
```

Après :

```js
return new Promise((resolve) => {
  setTimeout(resolve, 100)
})
```

Ou mieux, factoriser :

```js
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
```

### Priorité

À corriger tôt : c’est rapide et ça enlève un signal de mauvaise hygiène async.

---

## 2.5 JSDoc incohérente : paramètres inexistants

**Règle :** `jsdoc/check-param-names`
**Volume :** 6
**Exemples :**

- `module/canvas/talent-tree.mjs` : `@param "y" does not match an existing function parameter`
- `module/dice/standard-check.mjs` : `@param "flavor" does not match an existing function parameter`
- `module/documents/actor.mjs` : noms attendus incohérents
- `module/models/action.mjs` : `options.rollMode` inexistant

### Problème

Cette famille est plus grave que les types JSDoc manquants. Une documentation fausse est pire qu’une documentation absente.

Elle induit les développeurs en erreur, casse l’aide IDE, et peut masquer une dérive entre signature réelle et intention métier.

### Solution recommandée

Pour chaque cas :

1. Vérifier la signature réelle de la fonction.
2. Supprimer les `@param` obsolètes.
3. Renommer les `@param` si le code a évolué.
4. Si le paramètre devrait exister mais a disparu, vérifier s’il y a une régression fonctionnelle.

Exemple :

```js
/**
 * Rolls a standard check.
 * @param {object} options - Roll options.
 * @param {string} options.flavor - Message flavor.
 */
function roll(options) {}
```

ou si `flavor` n’existe plus :

```js
/**
 * Rolls a standard check.
 * @param {object} options - Roll options.
 */
function roll(options) {}
```

### Priorité

P1, car la documentation est mensongère.

---

# 3. P2 — Dette qualité à traiter par lots

## 3.1 JSDoc : types de paramètres manquants

**Règle :** `jsdoc/require-param-type`
**Volume :** 186

### Problème

Le code contient beaucoup de blocs JSDoc avec des `@param` sans type :

```js
/**
 * @param value
 */
function normalize(value) {}
```

ESLint attend :

```js
/**
 * @param {string} value
 */
function normalize(value) {}
```

### Lecture Tech Lead

Le volume est trop élevé pour une correction manuelle opportuniste. Il faut une stratégie.

Le point important : **ne pas documenter pour faire plaisir à ESLint**. Les types JSDoc doivent améliorer la compréhension et l’aide IDE. Sinon, c’est du bruit.

### Solution recommandée

Pour le code `module/` :

- Corriger progressivement.
- Prioriser les fonctions exportées, hooks, helpers partagés, fonctions métier.
- Utiliser des types structurés pour les objets complexes.

Exemple :

```js
/**
 * Formats an XP delta.
 * @param {number} xpDelta - The XP variation to display.
 * @returns {string}
 */
function formatXpDelta(xpDelta) {}
```

Pour les handlers DOM / Foundry :

```js
/**
 * Handles click on specialization node.
 * @param {PointerEvent} event - Click event.
 * @param {HTMLElement} target - Click target.
 * @returns {void}
 */
function onClick(event, target) {}
```

Pour les paramètres ignorés préfixés `_` :

```js
/**
 * Handles dialog confirmation.
 * @param {Event} _event - Unused event argument required by the callback signature.
 * @param {HTMLElement} _button - Unused button argument required by the callback signature.
 * @returns {void}
 */
function onConfirm(_event, _button) {}
```

### Recommandation config

Dans les tests, la règle est probablement trop stricte. Je recommande un override ESLint :

```js
{
  files: ["tests/**/*.mjs", "tests/**/*.js"],
  rules: {
    "jsdoc/require-param-type": "off",
    "jsdoc/require-description": "off"
  }
}
```

Ça ne veut pas dire “pas de doc dans les tests”. Ça veut dire : on documente les helpers complexes, pas chaque factory de test.

---

## 3.2 JSDoc : description manquante

**Règle :** `jsdoc/require-description`
**Volume :** 45
**Zone :** quasi exclusivement `tests/`

### Problème

Des blocs JSDoc existent mais sans description :

```js
/**
 * @param {object} overrides
 */
function createActor(overrides) {}
```

### Solution

Soit on ajoute une vraie description :

```js
/**
 * Creates a test actor fixture with optional overrides.
 * @param {object} overrides - Actor fields to override.
 * @returns {object}
 */
function createActor(overrides = {}) {}
```

Soit on supprime le bloc JSDoc s’il n’apporte rien.

### Recommandation

Dans les tests, désactiver cette règle ou la limiter aux fonctions exportées. Le gain qualité est faible comparé au bruit.

---

## 3.3 Nombres magiques

**Règle :** `no-magic-numbers`
**Volume :** 15
**Fichiers principaux :**

- `module/config/action.mjs`
- `module/config/effects.mjs`
- `module/config/talent-tree.mjs`

### Problème

Des valeurs comme `2`, `3`, `0.5`, `16` apparaissent directement dans le code.

Un nombre magique est problématique quand il encode une règle métier, une unité graphique, un seuil ou une convention.

### Solution recommandée

Remplacer :

```js
const width = size * 0.5
```

par :

```js
const HALF_SIZE_RATIO = 0.5

const width = size * HALF_SIZE_RATIO
```

Ou pour une configuration :

```js
const TALENT_TREE = {
  halfNodeRatio: 0.5,
  maxLinkedAbilities: 2,
  defaultGridColumns: 3,
}
```

### Attention

Il ne faut pas nommer mécaniquement tous les `2`. Certains nombres sont évidents selon le contexte. Si la règle devient contre-productive, configurer des exceptions :

```js
"no-magic-numbers": ["warn", {
  "ignore": [0, 1, -1],
  "ignoreArrayIndexes": true,
  "enforceConst": true
}]
```

---

# 4. P1/P2 — Cas particulier : `__proto__` dans les tests

**Règle :** `no-proto`
**Volume :** 12
**Fichier :** `tests/documents/item.test.mjs`

### Problème

`__proto__` est déprécié. Même dans les tests, c’est à éviter sauf si le test vérifie explicitement une attaque de pollution de prototype ou un comportement legacy.

### Solution standard

Avant :

```js
object.__proto__
```

Après :

```js
Object.getPrototypeOf(object)
```

Pour modifier le prototype :

```js
Object.setPrototypeOf(object, prototype)
```

### Si le test porte sur la pollution de prototype

Si l’usage de `__proto__` est volontaire pour tester une vulnérabilité, il faut le documenter et désactiver localement :

```js
// eslint-disable-next-line no-proto -- intentional: verifies prototype pollution hardening
payload.__proto__ = maliciousPrototype
```

### Priorité

- P1 si ce n’est pas intentionnel.
- P2 si c’est un test de sécurité volontaire et bien isolé.

---

# 5. Fichiers les plus touchés

| Fichier                                                      | Warnings | Diagnostic                                     |
| ------------------------------------------------------------ | -------: | ---------------------------------------------- |
| `module/utils/xml2json.js`                                   |       30 | Legacy JS, à traiter en priorité               |
| `tests/utils/audit-diff.test.mjs`                            |       26 | Bruit JSDoc test très élevé                    |
| `module/settings/OggDudeDataImporter.mjs`                    |       23 | Beaucoup de handlers à typer                   |
| `module/importer/oggDude.mjs`                                |       18 | Mapping/import : JSDoc utile mais à structurer |
| `tests/utils/audit-log.test.mjs`                             |       15 | Bruit JSDoc test                               |
| `module/applications/specialization-tree-app.mjs`            |       14 | Handlers UI à documenter proprement            |
| `tests/documents/item.test.mjs`                              |       12 | `__proto__` à clarifier                        |
| `tests/integration/specialization-tree-pixi-render.test.mjs` |       11 | Bruit JSDoc test                               |
| `module/applications/character-audit-log.mjs`                |       10 | JSDoc param types manquants                    |
| `tests/importer/import-session.spec.mjs`                     |       10 | Bruit JSDoc test                               |

---

# 6. Plan de correction recommandé

## Phase 1 — Nettoyage à fort signal

Objectif : supprimer les vrais risques sans passer des heures sur la doc.

À faire :

1. Corriger `no-promise-executor-return`.
2. Corriger ou justifier les `jsdoc/check-param-names`.
3. Moderniser `module/utils/xml2json.js` :
   - `var` → `const` / `let`
   - `==` → `===` ou check nullish explicite
   - supprimer `alert`
   - nettoyer l’échappement inutile

4. Clarifier les usages de `__proto__` dans `tests/documents/item.test.mjs`.

Résultat attendu : moins de warnings, mais surtout un code plus sûr.

---

## Phase 2 — Réglage ESLint

Objectif : éviter que la CI devienne un générateur de bruit.

Recommandation :

```js
{
  files: ["tests/**/*.mjs", "tests/**/*.js"],
  rules: {
    "jsdoc/require-description": "off",
    "jsdoc/require-param-type": "off"
  }
}
```

Et éventuellement garder dans les tests :

```js
"jsdoc/check-param-names": "warn"
```

Car une doc fausse reste un problème même dans les tests.

---

## Phase 3 — Documentation utile du code applicatif

Objectif : documenter ce qui a une vraie valeur.

Prioriser :

1. Fonctions exportées.
2. API internes partagées.
3. Importer OggDude.
4. Audit log.
5. Handlers complexes UI / canvas / Foundry.

Ne pas perdre de temps à typer des callbacks triviaux si la signature est évidente et locale.

---

# 7. Recommandations ESLint concrètes

## Pour `jsdoc`

La configuration actuelle semble trop stricte. Je recommanderais une politique plus nuancée :

```js
{
  rules: {
    "jsdoc/check-param-names": "warn",
    "jsdoc/require-param-type": "warn",
    "jsdoc/require-yields": "warn"
  }
}
```

Puis override tests :

```js
{
  files: ["tests/**/*.{js,mjs}"],
  rules: {
    "jsdoc/require-description": "off",
    "jsdoc/require-param-type": "off"
  }
}
```

## Pour `no-magic-numbers`

À garder, mais avec exceptions raisonnables :

```js
{
  rules: {
    "no-magic-numbers": ["warn", {
      "ignore": [-1, 0, 1, 2],
      "ignoreArrayIndexes": true,
      "ignoreDefaultValues": true,
      "enforceConst": true
    }]
  }
}
```

Attention : ignorer `2` peut masquer de vraies constantes métier. Dans votre code, plusieurs `2` semblent peut-être métier. Je ne l’ignorerais qu’après revue.

---

# 8. Décision Tech Lead

## Ce qu’il ne faut pas faire

Ne pas lancer une correction automatique massive uniquement pour “avoir zéro warning”. Ça risque de :

- produire de la JSDoc pauvre ;
- masquer les vrais problèmes ;
- ajouter du bruit dans les PR ;
- faire perdre du temps sur les tests au lieu du code applicatif.

## Ce qu’il faut faire

Traiter en priorité les warnings qui signalent un vrai risque :

1. `eqeqeq`
2. `no-var`
3. `no-alert`
4. `no-promise-executor-return`
5. `jsdoc/check-param-names`
6. `no-proto`

Ensuite seulement, traiter la JSDoc manquante par lots ciblés.

---

# 9. Backlog proposé

## Ticket 1 — Moderniser `module/utils/xml2json.js`

**Priorité : haute**
**Type : refactor sécurisé**

Critères d’acceptation :

- Plus aucun `var`.
- Plus aucun `==` sauf exception documentée.
- Plus aucun `alert`.
- Tests XML existants toujours verts.
- Ajout de tests si le fichier est critique et non couvert.

---

## Ticket 2 — Corriger les JSDoc incohérentes

**Priorité : haute**
**Type : maintenabilité**

Critères :

- Plus aucun `jsdoc/check-param-names`.
- Signatures et documentation alignées.
- Suppression des `@param` obsolètes.

---

## Ticket 3 — Corriger les anti-patterns Promise

**Priorité : haute**
**Type : qualité async**

Critères :

- Plus aucun `no-promise-executor-return`.
- Helpers async lisibles.
- Pas de changement comportemental.

---

## Ticket 4 — Clarifier `__proto__` dans les tests

**Priorité : moyenne à haute**
**Type : test / sécurité**

Critères :

- Remplacer par `Object.getPrototypeOf` / `Object.setPrototypeOf`, sauf test volontaire.
- Si volontaire, désactivation ESLint locale avec commentaire explicite.

---

## Ticket 5 — Revoir la configuration ESLint des tests

**Priorité : moyenne**
**Type : DX / qualité CI**

Critères :

- Les tests ne remontent plus de bruit JSDoc inutile.
- Les règles à signal fort restent actives.
- La CI reste stricte sur les vrais risques.

---

## Ticket 6 — Nettoyer les nombres magiques métier

**Priorité : moyenne**
**Type : lisibilité**

Critères :

- Constantes nommées dans `config/action.mjs`, `config/effects.mjs`, `config/talent-tree.mjs`.
- Les noms expriment l’intention métier ou graphique.
- Pas de constantes artificielles du type `TWO = 2`.

---

# 10. Conclusion

Le code n’est pas “cassé” selon ESLint : **0 erreur**. Mais la qualité du signal est mauvaise : 296 warnings, dont une majorité de JSDoc.

La priorité n’est pas de tout corriger indistinctement. La bonne approche est :

1. **corriger les vrais risques JS** ;
2. **corriger la documentation fausse** ;
3. **réduire le bruit ESLint dans les tests** ;
4. **documenter utilement le code applicatif**.

Le fichier à attaquer en premier est clairement `module/utils/xml2json.js`. Ensuite, les corrections les plus rentables sont `jsdoc/check-param-names`, `no-promise-executor-return`, puis le réglage des règles JSDoc sur `tests/`.
