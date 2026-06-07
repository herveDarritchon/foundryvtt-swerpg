# Design Review — Onglet Inventory (Character Sheet)

**Reviewer:** Design Director Senior  
**Date:** 2026-06-07  
**Scope:** `templates/sheets/actor/inventory.hbs` uniquement (Equipment / Backpack / Credits). Hors scope : Market, autres onglets.  
**References code :** `inventory.hbs`, `styles/actor.less`, `module/applications/sheets/base-actor-sheet.mjs#prepareItems`

---

## Verdict global

L'ossature fonctionne (sections Equipment/Backpack, listes, controls). Mais l'onglet **n'est pas fini niveau Art Direction** : le bloc CREDITS n'a aucun style, des données cassées (`NaN`, `0 Damage`) sont exposées au joueur, des tags sont tronqués au point de devenir illisibles, et des chaînes UI sont en dur (non i18n, violation ADR + CLAUDE.md). Ce n'est pas livrable en l'état pour un joueur.

---

## 🔴 Bloquant

### B1 — Bloc CREDITS sans aucun style

`credits-summary`, `credits-breakdown`, `over-budget`, `total-budget`, `total-spent`, `separator`, `warning` : **zéro règle CSS** nulle part (`actor.less`, `applications.less`, `market.less` vérifiés).

**Conséquence visible :**

- Texte brut empilé
- `<h4>` CREDITS rendu **plus gros** que les `<h3>` EQUIPMENT/BACKPACK (hiérarchie inversée)
- Pas de panneau délimité
- Séparateur `.line.separator` invisible
- "Over Budget!" pas en rouge alors que c'est l'info critique

**Localisation code :**

- `inventory.hbs:46-82` produit le markup
- Aucune cible CSS correspondante

**Action :**
Créer le bloc `.credits-summary` dans `actor.less` (panneau cadré console, alignement label/valeur en grille, `.over-budget` + `.warning` en `--color-*` rouge/danger, `.separator` visible, `.bonus`/`.adjustment.negative` colorés). Respecter ADR-0022 (design tokens).

---

### B2 — Données cassées exposées au joueur

Exemple : **"NaN Dodge / NaN Defense"** sur Ancient Battle Armor ; **"0 Damage"** sur armes.

**Problème :**

- Soit calcul base+caractéristique non fait
- Soit placeholder non filtré côté template
- Un `NaN` affiché brise totalement l'immersion et signale un bug de modèle

**Source :** `getTags()` des items (armor/weapon)

**Action :**
Corriger le calcul des tags (`SwerpgArmor`/`SwerpgWeapon` getTags) ; à défaut, **ne pas rendre** un tag dont la valeur est `NaN`/indéfinie (garde côté domaine). Tech lead à router vers le model, pas le template.

---

### B3 — Tags tronqués → illisibles

`.tag { max-width: 45px }` (`actor.less:665`) + ellipsis coupe le texte porteur de sens :

- "Range Medium" → "**ge Medium**"
- Icône lock cadenas collée au texte rendant illisible

**Action :**
Revoir la stratégie tags inventory : soit largeur auto avec wrap propre, soit tooltip systématique sur tag tronqué, soit abréviations contrôlées. 45px est trop agressif pour des libellés à 2+ mots.

---

## 🟠 Majeur

### M1 — Chaînes UI en dur (i18n manquant — viole CLAUDE.md + ADR i18n)

**Localisation :**

- `data-tooltip="Equip Item"` (`inventory.hbs:34`)
- `"Edit Item"` (`:36`)
- `"Delete Item"` (`:37`)
- `"Create Item"` (`:84`)

**Problème :**

- Tooltip "Equip Item" visible en anglais à l'écran
- Le bouton Market (`:90-91`) est correctement localisé → **incohérence dans le même fichier**

**Action :**
Remplacer par `{{localize "SWERPG..."}}` + ajouter clés `en.json`/`fr.json`.

---

### M2 — Hints FR non traduits

`EQUIPMENT_HINT` en `fr.json:699` = texte anglais ("Equip weapons and armor...").  
Empty-state visible en anglais pour joueur FR.

**Action :** Traduire la clé FR.

---

### M3 — Informations métier manquantes (le joueur n'a pas ce qu'il lui faut)

**Contexte :**
L'inventaire d'un jeu Edge ne montre actuellement **ni prix, ni encombrement (Encumbrance), ni quantité visible par défaut**.

**Problèmes :**

- Bloc CREDITS juste dessous parle budget/dépenses, mais **aucune ligne d'item n'affiche son prix** → impossible de relier "Spent on Items: −4600" à un item précis
- **Encumbrance** : mécanique centrale du système, totalement absente
- Quantité affichée seulement si `showStack` (>1) — un stack n'est jamais lisible au repos

**Décision produit validée :**
Afficher **Prix (credits) + Encombrement + Quantité (toujours visible, même à 1)** + **total encombrement** (somme backpack+equipment).

**Impact tech lead :**

- `prepareInventory` (`base-actor-sheet.mjs:403-433`) : exposer `price`, `encumbrance`, `quantity` (sortir `quantity` du conditionnel `showStack`)
- Models armor/weapon/gear : garantir `price`/`encumbrance` non `NaN` (lié B2)
- `inventory.hbs:13-31` : nouvelles colonnes/badges dédiés (séparés des tags pour ne pas retomber dans B3)
- Ajouter **total encombrement** (nouvelle donnée de contexte + affichage)

---

### M4 — Hiérarchie & cohérence visuelle des sections

**Problèmes :**

- `<h3>` EQUIPMENT/BACKPACK rendus en pastilles centrées ; `<h4>` CREDITS rendu énorme → niveaux inversés (lié à B1)
- Bouton flottant "Equip Item" semble détaché/superposé à droite plutôt qu'intégré à la ligne → affordance peu claire vs. l'icône shield inline

**Action :**

- Harmoniser l'échelle typographique des trois en-têtes (CREDITS doit être au même niveau que EQUIPMENT/BACKPACK)
- Intégrer le contrôle equip dans la zone `.controls` de la ligne

---

## 🟡 Mineur / Polish

### M5 — Espace mort

Grande zone vide sous CREDITS. Layout non rempli.

**Décision produit validée :** Déplacer/compacter le bloc CREDITS.

**Action :**
Réoriente l'action : pas seulement styler en place, mais **repenser l'emplacement** pour combler l'espace mort.

- Décider cible : header de l'onglet, colonne latérale, ou barre compacte (cf. `market-buyer-bar__credits` existant dans `market.less:656` — pattern réutilisable, cohérence cross-onglet)
- Le style reste à créer (tokens ADR-0022) ; B1 fusionne donc avec M5

---

### M6 — Lisibilité controls

Icônes edit/trash bas contraste, peu découvrables. États hover existent mais l'état "non-équipé vs équipé" repose seulement sur le shield.

**Action :** Renforcer le feedback visuel d'équipement.

---

### M7 — Accessibilité

Controls de ligne sont des `<a>` sans `href`/`role`/`aria-label` (seulement `data-tooltip`), alors que create/market ont `aria-label`.

**Action :** Uniformiser (boutons + aria-label localisé).

---

### M8 — Empty-state

Sections vides montrent un hint, mais pas d'affordance drag-drop visuelle (zone de drop).

**Action :** Texte seul = découvrabilité faible. Ajouter repères visuels.

---

## Synthèse pour les Tech Leads (priorisation)

| #     | Sévérité | Sujet                                                           | Couche                         |
| ----- | -------- | --------------------------------------------------------------- | ------------------------------ |
| B1    | 🔴       | CREDITS sans CSS, hiérarchie inversée + M5 (déplacer/compacter) | `actor.less` (tokens ADR-0022) |
| B2    | 🔴       | `NaN`/`0 Damage` exposés                                        | Models `getTags` (domaine)     |
| B3    | 🔴       | Tags tronqués illisibles                                        | `actor.less` tags              |
| M1    | 🟠       | Tooltips en dur (i18n)                                          | `inventory.hbs` + lang         |
| M2    | 🟠       | Hints FR non traduits                                           | `fr.json`                      |
| M3    | 🟠       | Prix / encombrement / quantité manquants + total encombrement   | produit + prep + template      |
| M4    | 🟠       | Hiérarchie titres + bouton equip                                | `actor.less` + `.hbs`          |
| M6–M8 | 🟡       | Contraste controls, a11y, drop-zone                             | mix                            |

---

## Priorisation révisée par lot

| Lot                         | Contenu                                                             | Sévérité          | Dépendances     |
| --------------------------- | ------------------------------------------------------------------- | ----------------- | --------------- |
| **Lot 1 — Data sanity**     | B2 (`NaN`/`0 Damage`)                                               | 🔴 bloquant       | Prérequis Lot 4 |
| **Lot 2 — Quick wins**      | M1, M2 (i18n), B3 (tags)                                            | 🔴/🟠 faible coût | Indépendant     |
| **Lot 3 — Credits refonte** | B1 + M5 (déplacer/compacter, réutiliser pattern `market-buyer-bar`) | 🔴                | Indépendant     |
| **Lot 4 — Infos item**      | M3 (prix + encombrement + quantité + total encombrement)            | 🟠                | Lot 1 (B2)      |
| **Lot 5 — Polish**          | M4, M6, M7, M8                                                      | 🟡                | Après Lot 3     |

**Ordre recommandé :** Lot 1 → Lot 2 → Lot 3 (parallèle possible) → Lot 4 → Lot 5

---

## Décisions produit actées

### M3 — Infos par ligne d'item

✅ Afficher **Prix (credits) + Encombrement + Quantité (toujours visible, même à 1)**

### B1 / M5 — Credits

✅ **Déplacer/compacter** (pas seulement styler en place)

---

## Annexe : Références code

- **Template :** `templates/sheets/actor/inventory.hbs` (95 lignes)
- **Styles inventory :** `styles/actor.less` lignes 1753–1859 (tab.inventory)
- **Styles line-item :** `styles/actor.less` lignes 578–707 (base)
- **Data prep :** `module/applications/sheets/base-actor-sheet.mjs` lignes 388–459 (#prepareItems)
- **I18n hints :** `lang/en.json` lignes 578–579, `lang/fr.json` lignes 699–700
- **Pattern réutilisable :** `market-buyer-bar__credits` (`styles/market.less:656–674`)
