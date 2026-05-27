---
title: 'ADR-0019: SizeHigh et SizeLow — marqueurs d'import OggDude uniquement (pas de champ système)'
status: 'Accepted'
date: '2026-05-27'
authors: 'Hervé Darritchon'
tags: ['architecture', 'weapon', 'import-oggdude', 'sizehigh', 'sizelimit', 'silhouette']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Validée le 2026-05-27. Cette ADR résout l'ambiguïté levée par l'issue #18 concernant `SizeHigh` (et par extension `SizeLow`) dans le contexte OggDude / SWERPG.

## Context

Le fichier OggDude `Weapons.xml` expose deux champs par arme :

- `<SizeLow>` : silhouette minimale requise pour utiliser l'arme (ex. 0 = aucune restriction, 3 = silhouette 3+).
- `<SizeHigh>` : silhouette maximale autorisée (ex. 0 = aucune restriction, 10 = jusqu'à silhouette 10).

Sur 175 armes observées dans `resources/integration/Weapons.xml` :

| Valeur SizeHigh | Occurrences |
| --------------- | ----------- |
| 10              | 159         |
| 0               | 15          |
| 4               | 1           |

| Valeur SizeLow | Occurrences |
| -------------- | ----------- |
| 0              | 65          |
| 3              | 15          |
| 2              | 9           |
| 4              | 8           |
| 6              | 6           |
| 5              | 6           |
| 1              | 2           |
| 7              | 1           |

Ces champs représentent en OggDude une contrainte de **gabarit cible** (silhouette range) applicable à l'arme : l'arme ne peut cibler que des tokens dont la silhouette est dans `[SizeLow, SizeHigh]`.

SWERPG ne dispose pas encore de règles de gabarits/silhouettes implémentées. Aucun module consommateur ne lit ces valeurs au moment de la présente ADR. Le champ `system.*` de l'arme ne contient pas de champ `sizeLow` ou `sizeHigh`.

La question soulevée par l'issue #18 était : `SizeHigh` doit-il devenir un champ métier canonique (`system.sizeHigh`, `system.sizeLow`) ou rester un marqueur d'import dans `flags.swerpg.oggdude` ?

## Decision

### D1 — SizeHigh et SizeLow restent des marqueurs d'import OggDude

`SizeHigh` et `SizeLow` sont stockés **uniquement** dans `flags.swerpg.oggdude` :

```javascript
flags.swerpg.oggdude = {
  sizeHigh: 10, // uniquement si présent dans le XML (non null)
  sizeLow: 3, // uniquement si présent dans le XML (non null)
  // ... autres marqueurs OggDude
}
```

Aucun champ `system.sizeHigh` ni `system.sizeLow` n'est créé dans le `TypeDataModel` de l'arme.

### D2 — Absence de valeur ≠ zéro

Un champ absent ou vide dans le XML (`undefined`, `null`, `''`) est représenté par l'absence de la clé dans `flags.swerpg.oggdude` (pas de `sizeHigh: null`).

Un champ valant `0` dans le XML est conservé tel quel (`sizeHigh: 0`) : 0 est une valeur valide signifiant "aucune restriction" côté OggDude.

### D3 — Symétrie SizeLow / SizeHigh

`SizeLow` est capturé avec les mêmes règles que `SizeHigh`. Les deux champs forment ensemble la plage de silhouettes cibles.

### D4 — Aucun effet gameplay aujourd'hui

Ces valeurs sont conservées pour traçabilité et pour permettre l'implémentation future des règles de ciblage par gabarit/silhouette sans perte de données d'import. Elles ne modifient aucun calcul, aucune règle de ciblage, aucune UI.

### D5 — Source de vérité unique

La source de vérité pour `SizeHigh`/`SizeLow` est `flags.swerpg.oggdude.sizeHigh` / `flags.swerpg.oggdude.sizeLow`. Tout code futur consommant ces données doit lire depuis ces flags jusqu'à ce qu'une ADR ultérieure décide de promouvoir ces valeurs en champ système.

## Options écartées

### O1 — Promouvoir en champ système `system.sizeHigh` / `system.sizeLow`

- **Avantages** : disponible sans lire les flags.
- **Inconvénients** : nécessite une migration de schéma, une validation dans `TypeDataModel`, une UI et des règles de ciblage non encore décidées. Prématuré.
- **Décision** : Rejetée à ce stade. À reconsidérer quand les règles de silhouette seront spécifiées.

### O2 — Ignorer SizeLow / SizeHigh complètement

- **Avantages** : zéro dette.
- **Inconvénients** : perte d'information source non récupérable sans re-importer. Contraire à la politique de conservation des données brutes (ADR-0007 D5).
- **Décision** : Rejetée.

### O3 — Stocker seulement SizeHigh (comme avant)

- **Avantages** : changement minimal.
- **Inconvénients** : SizeLow est symétrique et également présent dans le XML. L'omettre crée une asymétrie arbitraire et une perte d'information.
- **Décision** : Rejetée.

## Rationale

1. **Conservation des données source** : ADR-0007 D5 établit le principe de conserver les données brutes OggDude en flags. Appliquer ce principe à `SizeHigh`/`SizeLow` est cohérent.
2. **Pas de comportement gameplay défini** : sans règles de silhouette/ciblage spécifiées dans SWERPG, créer un champ système serait une sur-ingénierie sans valeur immédiate.
3. **Réversibilité** : conserver les données en flags n'empêche pas une migration future vers un champ système si les règles de ciblage sont implémentées.
4. **Symétrie SizeLow/SizeHigh** : les deux champs sont sémantiquement liés et doivent être traités de manière identique.

## Impact

### Import OggDude (`module/importer/items/weapon-ogg-dude.mjs`)

- La fonction `normalizeSizeHigh` est renommée `normalizeSizeValue` (réutilisée pour les deux champs).
- `SizeLow` est capturé et stocké dans `flags.swerpg.oggdude.sizeLow` (si présent).
- `SizeHigh` continue d'être stocké dans `flags.swerpg.oggdude.sizeHigh` (si présent).
- La valeur `0` est préservée (elle est finiment numérique).

### Modèle (`module/models/weapon.mjs`)

Aucun changement. Aucun champ système ajouté.

### Config (`module/config/weapon.mjs`, `module/config/system.mjs`)

Aucun changement.

### Tests (`tests/importer/weapon-import.spec.mjs`)

Ajout de tests couvrant :

- `SizeHigh=0` → stocké (`sizeHigh: 0`)
- `SizeLow` présent → stocké (`sizeLow: <value>`)
- `SizeLow` absent → non stocké
- Paire `SizeHigh` + `SizeLow` ensemble

## Contrat testable

```javascript
// SizeHigh absent → pas de clé sizeHigh dans les flags
expect(weapon.flags.swerpg.oggdude?.sizeHigh).toBeUndefined()

// SizeHigh = 0 → conservé tel quel
expect(weapon.flags.swerpg.oggdude.sizeHigh).toBe(0)

// SizeLow présent → conservé
expect(weapon.flags.swerpg.oggdude.sizeLow).toBe(3)

// Aucun champ système
expect(weapon.system.sizeHigh).toBeUndefined()
expect(weapon.system.sizeLow).toBeUndefined()
```

## Review

**Validation :** ADR validée le 2026-05-27.

Cette ADR doit être réévaluée après :

- Implémentation des règles de silhouette/gabarits dans SWERPG.
- Décision sur un éventuel champ `system.silhouetteRange` ou similaire.

Prochaine réévaluation : à la création d'une issue portant sur les règles de silhouette.

## Links

- Issue source : #18
- ADR-0007 (Taxonomie weapon) : `documentation/architecture/adr/adr-0007-weapon-taxonomy.md`
- ADR-0018 (no magic numbers) : `documentation/architecture/adr/adr-0018-no-magic-numbers-named-constants.md`
- XML source OggDude : `resources/integration/Weapons.xml`
- Import weapon : `module/importer/items/weapon-ogg-dude.mjs`
