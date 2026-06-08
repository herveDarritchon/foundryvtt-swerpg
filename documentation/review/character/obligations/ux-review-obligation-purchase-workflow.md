# UX Review — Workflow d'achat / bonus des Obligations

- **Date** : 2026-06-08
- **Périmètre** : experience utilisateur de l'acquisition et configuration des Obligations dans la feuille personnage, du drag-drop à l'activation du bonus de création
- **Reviewer** : UX sénior
- **Fichiers couverts** :
  - `templates/sheets/actor/character-commitments.hbs`
  - `module/applications/sheets/character-sheet.mjs` (préparation contexte, `#onToggleObligationExtraState`, `#buildObligationList`)
  - `templates/sheets/partials/obligation-config.hbs`
  - `module/applications/sheets/obligation.mjs`
  - `module/models/obligation.mjs`
  - `module/lib/obligations/obligation-bonus-calculator.mjs`
  - `module/models/character.mjs` (`_prepareObligationCreationState`, `#extractObligationData`)
  - `lang/en.json` + `lang/fr.json` (bloc `OBLIGATION.UI.*`)

---

## Forces

- **Données temps réel** : le bloc `obligationCreationState` est dérivé et recalculé à chaque rendu — pas de désync.
- **Transparence des erreurs** : les erreurs de conformité sont affichées en clair (combinaison non officielle, doublon, dépassement de plafond). L'information est là.
- **Séparation domaine / UI respectée** : `ObligationBonusCalculator` est pur, sans dépendance Foundry. La logique de validation est testable et l'est.
- **ADR-0025 respectée** : le data model reste minimal et narratif — aucun enrichissement structurel intempestif.

---

## Faiblesses

### 🔴 Bloquantes — rupture de flux

**1. Workflow dispersé sur deux sheets.**

La configuration d'un bonus de création Obligation nécessite :

1. drag-drop d'un item `obligation` sur la feuille personnage
2. clic sur l'item pour ouvrir sa sheet dédiée
3. toggler `isExtra` sur la sheet item
4. remplir `extraXp` ET `extraCredits` à la main
5. retour sur la feuille personnage pour vérifier le bloc `obligationCreationState`

Le joueur doit jongler entre deux fenêtres pour une seule intention métier : "prendre un bonus de départ".  
C'est le problème principal. Le reste en découle.

**Impact** : taux d'abandon élevé, erreurs fréquentes, sentiment que le système "ne marche pas" alors que la règle est respectée.

---

**2. Le toggle `Extra` est un leurre.**

`data-action="toggleObligationExtraState"` bascule `system.isExtra` sans guider la suite.  
L'utilisateur active le mode "extra" mais ne voit aucun champ apparaître dans la feuille personnage — il faut savoir qu'il faut ouvrir la sheet item.

Le toggle ne devrait pas exister sans être immédiatement accompagné du choix du bonus.

---

**3. Erreur affichée au lieu d'empêcher l'erreur.**

Le bloc `obligationCreationState.errors` liste les problèmes après coup. L'utilisateur doit :

1. commettre l'erreur
2. retourner sur la sheet item
3. corriger à l'aveugle (les valeurs autorisées ne sont pas signalées)
4. revenir vérifier

C'est un pattern **error-detection** pur, sans **error-prevention**. Les valeurs `extraXp` et `extraCredits` sont en input libre avec `step` et `min`/`max`, mais aucune contrainte sur la combinaison valide (xp, credits) n'est appliquée à la saisie.

---

### 🟠 Importantes — charge cognitive

**4. Deux intentions métier mélangées dans la même liste.**

La liste d'obligations mélange :

- les obligations narratives de base (`isExtra = false`)
- les obligations bonus de création (`isExtra = true`)

Elles partagent la même ligne, le même toggle, les mêmes colonnes XP/crédits.  
Un joueur qui pose une obligation narrative "Dette 10" voit apparaître un toggle et des colonnes XP/crédits qui n'ont aucun sens pour son cas.

**5. Notion de "base Obligation" implicite.**

Le plafond des bonus supplémentaires est calculé à partir de la somme des obligations non-extra.  
Si le joueur n'a qu'une seule obligation de base `value: 10` et qu'il ajoute une extra, le plafond est 10.  
Mais rien n'explique visuellement d'où vient ce plafond — il est juste affiché dans `obligationCreationState.totalObligationConsumed / baseObligationValue`.

**6. Pas de CTA primaire pour ajouter une obligation.**

L'onglet Commitments n'a aucun bouton "Ajouter une obligation". Le seul moyen est le drag-drop depuis un compendium.  
L'inventaire, les talents, les jauges ont tous un bouton `+` — pas les obligations. L'utilisateur doit deviner le drag-drop.

---

### 🟡 Mineures — friction

**7. Colonnes XP/Crédits visibles pour toutes les obligations.**

Les colonnes `extraXp` / `extraCredits` s'affichent dans la liste même pour les obligations non-extra (tiret).  
C'est du bruit visuel. Seules les obligations extra ont besoin de ces colonnes.

**8. Aucun feedback positif après configuration réussie.**

Quand l'utilisateur configure correctement un bonus, le bloc passe de `--invalid` à vert avec "Toutes les obligations supplémentaires respectent les règles officielles."  
Mais aucun changement visible dans les métriques du personnage (XP, crédits) n'est immédiatement perceptible — il faut aller voir l'onglet "Progression" ou le budget crédits.

**9. Pas de guidance sur les valeurs autorisées dans la sheet item.**

`obligation-config.hbs` affiche une liste des options officielles en commentaire (`<ul class="obligation-official-options__list">`) mais c'est statique et les champs restent en input libre avec `step:5`.  
Un utilisateur peut taper `extraXp: 7` sans que le champ ne le rejette — l'erreur n'apparaît que dans le bloc de la feuille personnage.

---

## Analyse par étape du flux actuel

```
Étape                     | Problème                          | Coût
--------------------------|-----------------------------------|-----
1. Drag-drop obligation   | Pas de CTA visible                | Élevé (découverte)
2. Voir la ligne          | Colonnes inutiles pour le joueur  | Faible
3. Toggle Extra           | Aucun guidage sur la suite        | Moyen
4. Ouvrir sheet item      | Changement de fenêtre             | Élevé
5. Saisir extraXp/credits | Input libre, pas de validation    | Élevé (erreur probable)
6. Retour feuille perso   | Vérifier bloc erreurs             | Moyen
7. Corriger si erreur     | Retour étape 4, boucle            | Très élevé
```

---

## Recommandations UX

### R1 — Séparer clairement "Obligations narratives" et "Bonus de création"

Dans l'onglet Commitments :

```
┌─────────────────────────────────────────────────┐
│  Obligations (20)                               │
│  ┌───────────────────────────────────────────┐  │
│  │ Dette envers Teemo (10)           ✎  🗑  │  │
│  │ Prime sur ma tête (10)            ✎  🗑  │  │
│  └───────────────────────────────────────────┘  │
│  [+ Ajouter une obligation narrative]           │
│                                                 │
│  ── Bonus de départ ──────────────────────────  │
│                                                   │
│  Plafond disponible : 10 / 10                     │
│  Bonus déjà pris :                                │
│  ┌───────────────────────────────────────────┐  │
│  │ +5 XP (5 Obligation)             ✎  🗑  │  │
│  │ +1 000 crédits (5 Obligation)    ✎  🗑  │  │
│  └───────────────────────────────────────────┘  │
│  Total : +5 XP, +1 000 crédits                  │
│  [Prendre un bonus]                         │
└─────────────────────────────────────────────────┘
```

### R2 — Remplacer le toggle + inputs libres par un sélecteur guidé

Au clic sur "Prendre un bonus" :

```
┌─ Choisir un bonus de départ ───────────────────┐
│                                                 │
│  Sélectionne une option parmi les suivantes :   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │ ◉ +5 XP          · Coût : +5 Obligation  │   │
│  │   Obligation totale : 10 → 15            │   │
│  ├──────────────────────────────────────────┤   │
│  │ ○ +10 XP         · Coût : +10 Obligation │   │
│  │   Obligation totale : 10 → 20            │   │
│  ├──────────────────────────────────────────┤   │
│  │ ○ +1 000 crédits · Coût : +5 Obligation  │   │
│  │   Obligation totale : 10 → 15            │   │
│  ├──────────────────────────────────────────┤   │
│  │ ○ +2 500 crédits · Coût : +10 Obligation │   │
│  │   Obligation totale : 10 → 20            │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│       [Annuler]              [Confirmer]         │
└─────────────────────────────────────────────────┘
```

- Les options déjà prises sont désactivées (disabled + tooltip "Déjà sélectionné")
- Les options dépassant le plafond restant sont désactivées (disabled + tooltip "Dépasse le plafond disponible")
- Chaque ligne montre l'impact immédiat sur la valeur d'obligation totale

### R3 — Feedback immédiat des bonus sur la feuille

Une fois configuré, le total XP et crédits dérivés doit apparaître directement dans l'onglet Commitments (pas besoin d'aller voir un autre onglet). Soit sous forme de métriques synthétiques en haut de section :

```
XP bonus : +5    Crédits bonus : +1 000    Obligation totale : 15 / 20 (plafond 10)
```

### R4 — CTA primaire "Ajouter une obligation"

Ajouter un bouton `+` dans l'en-tête de la section Obligations, comme pour l'inventaire :

```hbs
<button
  type='button'
  class='icon frame-brown fa-solid fa-plus'
  data-action='itemCreate'
  data-tooltip='Ajouter une obligation'
  data-item-type='obligation'
></button>
```

(ou une action spécifique `createObligation` si `itemCreate` est trop générique)

### R5 — Nettoyage des colonnes conditionnelles

Les colonnes XP / Crédits ne devraient apparaître que dans la section des bonus de création, pas dans la liste des obligations narratives.

---

## Plan d'action suggéré

| #   | Section        | Action                                                                 | Effort |
| --- | -------------- | ---------------------------------------------------------------------- | ------ |
| 1   | Template HBS   | Séparer le partial `character-commitments.hbs` en deux zones           | M      |
| 2   | Sheet contr.   | Créer une action `createObligation` avec CTA visible                   | XS     |
| 3   | Nouveau dialog | Créer une mini-ApplicationV2 `ObligationBonusPicker` avec les 4 cartes | M      |
| 4   | Sheet contr.   | Remplacer `toggleObligationExtraState` par `openObligationBonusPicker` | M      |
| 5   | Sheet contr.   | Ajouter les métriques synthétiques XP/crédits bonus en haut de section | S      |
| 6   | Config partial | Remplacer les inputs libres par des radios/readonly en fallback expert | S      |
| 7   | i18n           | Extraire toutes les chaînes résiduelles en clés `SWERPG.*`             | S      |
| 8   | Tests          | Adapter les tests du toggle et ajouter des tests pour le picker dialog | M      |

---

## Vérification

```bash
pnpm vitest run tests/applications/sheets/character-sheet-commitments.test.mjs
pnpm run lint && pnpm fmt:check
```

Smoke manuel :

- ouvrir un Personnage, onglet Commitments
- cliquer "Ajouter une obligation" → item créé
- cliquer "Prendre un bonus" → dialog s'affiche avec options
- sélectionner +5 XP → confirmer → section bonus mise à jour, métriques impactées
- tenter de reprendre la même option → désactivée
- tenter de dépasser le plafond → option désactivée
- supprimer un bonus → compteurs recalculés
- vérifier que la sheet item obligation reste éditable en fallback (GM mode)

---

## Verdict

**L'implémentation actuelle est correcte du point de vue des règles mais pénalisante du point de vue UX.**  
Le flux oblige l'utilisateur à connaître l'architecture du système (deux sheets, deux fenêtres, trois champs à remplir) pour accomplir une tâche simple : "je veux plus de XP / plus de crédits en échange d'une obligation plus lourde".

La séparation claire des deux intentions métier (narrer une dette / acheter un bonus) combinée à un sélecteur guidé et contraint est le levier le plus fort pour transformer l'onglet Commitments d'un "éditeur d'items" en un vrai outil de création de personnage fluide.
