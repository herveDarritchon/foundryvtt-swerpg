# Audit UI/UX & Direction Artistique — Feature Market

> **Périmètre** : interface et expérience de la feature Market (achat/vente) du système Foundry VTT `swerpg` (Star Wars Edge RPG).
> **Date** : 2026-06-01
> **Auteur** : Directeur Artistique Senior / Web Designer Senior (revue design)
> **Entrées** : `templates/market/market.hbs`, `styles/market.less`, `module/config/market.mjs`, `styles/variables.less`, dialogues (`negotiation`, `consequences`, `availability-check`).
> **Objectif** : qualifier la qualité UI/UX, la cohérence de marque et l'immersion ; alimenter la backlog design.

---

## 1. Synthèse exécutive

L'interface Market est **fonctionnelle, structurée et accessible** (ARIA, `sr-only`, `focus-visible`, états vides gérés). La structure BEM est propre et la sémantique HTML correcte. **Mais d'un point de vue direction artistique, le Market ne ressemble pas au reste du jeu** : il abandonne presque totalement le design system Star Wars du projet (palette cyan/or holographique, polices Orbitron/Rajdhani, thèmes Jedi/Sith) au profit d'une **palette Material Design générique** codée en dur. Le résultat est un **dashboard d'admin sombre**, pas un **terminal de commerce galactique**. L'immersion — pourtant l'enjeu n°1 d'un écran de boutique dans un JDR — est quasi nulle.

Plusieurs intentions de design présentes dans la configuration et le markup **ne sont jamais rendues** (types de marché visuellement identiques, prix modifiés invisibles, table de vente non stylée), créant un écart entre l'ambition du code et le rendu réel.

### Scorecard

| Critère                             | Note      | Verdict                                                             |
| ----------------------------------- | --------- | ------------------------------------------------------------------- |
| Cohérence de marque (design system) | 🔴 Faible | 110 couleurs en dur, 0 token du système, palette Material étrangère |
| Immersion / univers Star Wars       | 🔴 Faible | Aucun chrome diégétique, aucune police d'affichage, table neutre    |
| Cohérence interne (buy vs sell)     | 🟠 Moyen  | Table de vente non stylée, parcours asymétriques                    |
| Qualité / finition visuelle         | 🟠 Moyen  | Intentions non rendues (uiVariant, prix modifié, filtres actifs)    |
| Simplicité / lisibilité             | 🟠 Moyen  | Surcharge de badges, boutons icônes minuscules, données brutes      |
| Accessibilité                       | 🟢 Bon    | ARIA solide ; à corriger : cibles tactiles, états couleur-seule     |
| Structure / maintenabilité CSS      | 🟠 Moyen  | BEM propre mais aucune variabilisation, CSS mort                    |

---

## 2. Direction artistique & cohérence de marque

### 🔴 DA1. Dérive de palette : le design system est ignoré

**Preuve** : `styles/market.less` contient **110 littéraux couleur** (hex/rgba) et **0** usage des tokens `var(--color-success|warning|danger|accent|glow)` ni `var(--font-h*)`.

Le projet dispose pourtant d'un design system riche et cohérent (`variables.less`) : palette cyan désaturé / or froid (`--color-glow #78a9c2`, `--color-accent-yellow #c9b36a`), sémantiques (`--color-success #00ff99`, `--color-warning #ffaa00`, `--color-danger #ff3333`). Le Market l'ignore et réintroduit une **palette Material Design** : vert `#81c784`, bleu `#64b5f6`, violet `#ce93d8`, ambre `#ffe082`, rouge `#ef9a9a`. Ces teintes n'existent nulle part ailleurs dans le système → le Market jure visuellement avec les fiches de perso, le HUD, le chat.

**Conséquences** :

- Effet « arc-en-ciel » : vert/bleu/violet/ambre/rouge se disputent l'attention sans hiérarchie de marque.
- Rupture d'identité : un joueur sent immédiatement que cet écran « vient d'ailleurs ».

**Reco** : remapper toutes les couleurs sur les tokens du système (achat → `--color-success`, danger/impérial → `--color-danger`, négociable → `--color-accent-blue`, premium → `--color-accent-yellow`…). Aucune couleur en dur dans `market.less`.

### 🔴 DA2. Aucune identité typographique

**Preuve** : aucune police d'affichage (`Orbitron`, `Rajdhani`, `Audiowide`, `Star Jedi`) n'est utilisée dans `market.less` ; les en-têtes sont du texte `uppercase` + `letter-spacing` en police courante.

Un écran de boutique est une vitrine. Le titre de fenêtre, les en-têtes de colonnes, le nom de l'échoppe sont autant d'occasions d'asseoir l'univers (terminal holographique, datapad). Ici : typographie système neutre. Aucune verticalité de marque.

**Reco** : titres/en-têtes en `--font-h2/h3` (Orbitron/Rajdhani) ; envisager un nom diégétique par type de marché (« Réseau commercial impérial », « Contacts du milieu »…).

### 🔴 DA3. Les 4 types de marché sont visuellement identiques (intention morte)

**Preuve** : `market.hbs:2` applique `catalog.activeMarketDef.uiVariant` (`market--standard|local|specialized|black-market`) à la racine ; **`market.less` ne définit aucun style pour ces classes**.

La config (`market.mjs:271-316`) prévoit explicitement une différenciation visuelle par marché (`uiVariant` documenté comme « CSS modifier class applied to the market UI for visual distinction »). Dans les faits, le **marché noir ressemble trait pour trait au marché standard**. L'opportunité d'immersion la plus forte (ambiance interlope, néons violets, ambiance impériale froide…) est **codée mais non rendue**.

**Reco** : décliner une ambiance par `uiVariant` (teinte d'accent, fond, bordures, voire texture/scanlines). C'est le levier d'immersion #1, déjà câblé côté données.

### 🟠 DA4. Aucun support des thèmes Jedi/Sith

**Preuve** : `variables.less:188-218` définit `.theme-light()/.theme-dark()` (light-side/dark-side). Le Market étant 100 % couleurs en dur, **le switch de thème n'a aucun effet** sur lui.

**Reco** : conséquence directe de DA1 — une fois variabilisé, le Market héritera automatiquement des thèmes.

### 🟠 DA5. Zéro chrome diégétique / immersion

Le Market est une `<table>` posée sur un panneau sombre. Aucun cadre holographique, coin biseauté, liseré lumineux, séparateur stylé, ni even hover « scan ». Pour un JDR Star Wars, l'échoppe devrait évoquer un terminal GalactiCommerce. En l'état : austère et générique.

**Reco** : framing léger (bornes d'angle, liseré `--color-glow`, en-tête de marché illustré). Faible coût, fort impact perçu.

---

## 3. UX & parcours utilisateur

### 🔴 UX1. La table de vente n'est pas stylée (incohérence majeure)

**Preuve** : `market.less` style `.market-catalog__table` (achat) mais **aucune règle** pour `.market-inventory__table`, `.market-mode-toggle`, `.market-selector`, `.market-resale-estimate` (vérifié : absents).

Conséquence : le **mode achat est soigné** (en-têtes capitales, hover, bordures arrondies) ; le **mode vente retombe sur le rendu navigateur par défaut** (table nue, alignements bruts, pas de hover). Deux moitiés de la même feature à deux niveaux de finition opposés. Le **toggle buy/sell lui-même n'est pas stylé** → deux boutons par défaut.

**Reco** : factoriser un style de table commun appliqué aux deux tables ; styler le toggle (segmented control actif/inactif avec `--color-accent`).

### 🟠 UX2. Parcours achat et vente asymétriques

**Achat** : sélecteur de marché + barre acheteur + **toolbar complète** (recherche, 3 filtres, tri, reset). **Vente** : barre + description + table, **sans aucune recherche/tri/filtre**. Un personnage avec 30 objets n'a aucun moyen de trier/chercher ce qu'il revend. Capacités incohérentes entre deux modes jumeaux.

**Reco** : offrir au minimum recherche + tri (nom/prix) en mode vente.

### 🟠 UX3. Surcharge de badges dans la colonne « Nom »

**Preuve** : `market.hbs:262-323`. La cellule nom peut cumuler : badge de restriction (icône **+ texte**) **et** jusqu'à 4 badges narratifs (œil impérial, tête de mort marché noir, accès immédiat/différé, poignée de main négociable). Soit **5+ glyphes** autour du nom, en `flex-wrap`.

Problèmes : densité cognitive élevée, layout qui « pousse » sur les noms longs, et **redondances** :

- la poignée de main « négociable » (badge) double l'icône du bouton « Négocier » (même ligne) ;
- un objet `illegal` peut afficher une **tête de mort en badge restriction** ET une **tête de mort en badge marché noir**.

**Reco** : hiérarchiser (1 badge de statut prioritaire), regrouper les badges narratifs dans une colonne dédiée ou un survol unique, dédupliquer l'iconographie tête-de-mort/poignée-de-main.

### 🟠 UX4. Données affichées brutes (rareté, restriction)

**Preuve** : `market.hbs:335` `{{entry.rarity}}` (entier 0–10 nu) ; `:336` `{{entry.restrictionLevel}}` affiche la **clé brute non localisée** (`none`, `restricted`…), alors que le badge, lui, localise. Incohérence : même donnée, localisée dans le badge, brute dans la colonne.

**Reco** : rareté en pips/étoiles colorées (échelle sémantique) ; colonne restriction localisée et/ou fusionnée avec le badge (éviter le doublon colonne + badge).

### 🟠 UX5. Le prix modifié est invisible

**Preuve** : `market.hbs:326-333` distingue `market-price--modified`, mais **`market.less` ne style ni `.market-price` ni `.market-price--modified`** (vérifié : absent). Un prix gonflé/réduit par les modificateurs s'affiche **exactement** comme un prix normal ; le détail base→final n'existe que dans un tooltip.

C'est dommage : le système a des couleurs sémantiques (succès/danger) parfaites pour signaler une remise (vert) ou un premium (rouge/or). L'info clé d'un écran d'achat (« est-ce une bonne affaire ? ») est masquée.

**Reco** : colorer le prix modifié (remise = `--color-success`, premium = `--color-warning/danger`), avec petit indicateur ↑/↓.

### 🟡 UX6. Portefeuille peu valorisé

`market.hbs:38,133` : « Credits: **1234** » — sans icône monétaire, sans séparateur de milliers, sans emphase. C'est pourtant le chiffre le plus regardé en boutique.

**Reco** : icône crédits, format milliers, mise en avant (la « valeur d'argent » doit accrocher l'œil).

### 🟡 UX7. Boutons d'action minuscules et icône-seule

**Preuve** : `market.less:302-352` — `.market-col--buy` ≈ 50px contient **2 boutons** (achat + négocier), padding `0.3rem`, icône seule. Cibles tactiles bien en dessous des **44px** recommandés ; distinction achat/négocier reposant entièrement sur le tooltip. Discoverabilité faible.

**Reco** : élargir la colonne, augmenter les cibles, envisager un libellé court ou une iconographie plus contrastée ; gérer la superposition des deux actions.

### 🟡 UX8. État « filtre actif » non rendu ; reset toujours visible

**Preuve** : `market.less:113-117` définit `.is-active` pour les filtres, mais le template **ne l'applique jamais** aux `<select>` (uniquement au toggle buy/sell). L'utilisateur n'a aucun repère visuel des filtres en cours hors la valeur du select. CSS mort.

**Reco** : marquer visuellement tout filtre non-défaut (pastille/contour `--color-accent`) ; afficher un compteur de résultats.

### 🟡 UX9. Toolbar dense et peu lisible

8 contrôles (`recherche + 3 filtres + checkbox + 2 tris + reset`) en `flex-wrap` sur une fenêtre de 740px, tous au même style neutre `font-size-12`, labels en `sr-only`. À l'œil, impossible de savoir quel select filtre quoi sans l'ouvrir. Pas de regroupement visuel.

**Reco** : icônes/labels visibles par groupe (Filtrer / Trier), séparateurs, alignement déterministe.

### 🟡 UX10. États vides minimalistes ; pas d'état de chargement

Catalogue vide = texte italique. Aucune illustration/CTA. Et le catalogue se reconstruit à chaque frappe (cf. audit technique) **sans indicateur de chargement** → ressenti de saccade non habillé.

**Reco** : états vides illustrés + skeleton/loader discret pendant la (re)construction.

### 🟡 UX11. Items non finançables peu signalés

Le bouton d'achat passe en `opacity .45` mais la **ligne reste « active »** (curseur main, hover). Aucun indice prix « hors budget ». Seule la case « abordables uniquement » aide.

**Reco** : atténuer/teinter la ligne non finançable ; colorer le prix > solde.

---

## 4. Accessibilité (synthèse)

**Points forts** : `aria-label`/`aria-pressed`/`role="img"` présents, `sr-only` cohérent, `:focus-visible` sur les boutons, `aria-disabled` sur états désactivés, `cursor: help` sur badges.

**À corriger** :

- **Cibles tactiles** < 44px (boutons achat/négocier, badges 1.4rem) — UX7.
- **États couleur-seule** : disabled (opacité) et futurs prix modifiés ne doivent pas reposer que sur la couleur (ajouter icône/texte).
- **Info essentielle en tooltip** : la distinction achat/négocier et le détail de prix ne sont accessibles qu'au survol → invisibles au tactile/clavier rapide.
- **Contraste** : valider les textes secondaires `#7c8a9e` sur fonds très sombres (AA 4.5:1).

---

## 5. Points forts à préserver

- **Structure BEM propre et lisible**, sémantique HTML correcte (vraies `<table>`, `<th scope>` implicite, `<label>`).
- **Accessibilité de base solide** (ARIA, sr-only, focus-visible) — au-dessus de la moyenne des systèmes Foundry.
- **États vides / filtrés gérés** côté template (`isEmpty`, `isFilteredEmpty`).
- **Transitions discrètes et homogènes** (0.12s) — pas d'animation tape-à-l'œil.
- **Intentions design présentes dans les données** (`uiVariant`, prix modifié, filtres actifs) : le terrain est prêt, il « suffit » de rendre ces intentions.

---

## 6. Backlog proposée (design)

> **P0** = rupture de marque/incohérence visible ; **P1** = finition/immersion ; **P2** = polish.

| ID        | Titre                                                                                  | Prio   | Type         | Effort | Réf.    |
| --------- | -------------------------------------------------------------------------------------- | ------ | ------------ | ------ | ------- |
| MKT-UI-01 | Variabiliser toute la palette `market.less` sur le design system (0 couleur en dur)    | **P0** | DA/dette     | M      | DA1     |
| MKT-UI-02 | Styler la table de vente + le toggle buy/sell (parité avec l'achat)                    | **P0** | UX           | M      | UX1     |
| MKT-UI-03 | Décliner une ambiance visuelle par `uiVariant` (standard/local/spécialisé/marché noir) | **P0** | DA/immersion | M      | DA3     |
| MKT-UI-04 | Rendre visible le prix modifié (couleur remise/premium + indicateur)                   | **P1** | UX           | S      | UX5     |
| MKT-UI-05 | Identité typographique (titres/headers en Orbitron/Rajdhani)                           | **P1** | DA           | S      | DA2     |
| MKT-UI-06 | Rationaliser les badges (hiérarchie, dédup tête-de-mort/poignée, regroupement)         | **P1** | UX           | M      | UX3     |
| MKT-UI-07 | Recherche + tri en mode vente (symétrie des parcours)                                  | **P1** | UX           | M      | UX2     |
| MKT-UI-08 | Rareté en pips/étoiles + restriction localisée (supprimer données brutes)              | **P1** | UX           | S      | UX4     |
| MKT-UI-09 | Chrome diégétique léger (cadre/liseré holographique, en-tête de marché)                | **P1** | DA/immersion | M      | DA5     |
| MKT-UI-10 | Valoriser le portefeuille (icône crédits, format milliers, emphase)                    | **P2** | UX           | XS     | UX6     |
| MKT-UI-11 | Agrandir/clarifier les actions d'achat/négocier (cibles ≥ 44px)                        | **P2** | UX/a11y      | S      | UX7     |
| MKT-UI-12 | Rendre l'état « filtre actif » + compteur de résultats                                 | **P2** | UX           | S      | UX8     |
| MKT-UI-13 | Réorganiser la toolbar (groupes Filtrer/Trier, repères visuels)                        | **P2** | UX           | S      | UX9     |
| MKT-UI-14 | États vides illustrés + loader pendant (re)construction du catalogue                   | **P2** | UX           | S      | UX10    |
| MKT-UI-15 | Signaler visuellement les items hors budget (ligne/prix)                               | **P2** | UX           | XS     | UX11    |
| MKT-UI-16 | Supprimer le CSS mort / variables fantômes (`--color-cool-*`, `.is-active` filtres)    | **P2** | dette        | XS     | DA1/UX8 |

---

## 7. Recommandation

La structure UX est saine et accessible : **aucune refonte du markup n'est nécessaire**. L'effort principal est de **direction artistique** et tient en une idée : **arrêter de peindre le Market à la main et le brancher sur le design system existant**. Les 3 chantiers **P0** (variabilisation palette, parité achat/vente, ambiances par type de marché) suffisent à faire passer le Market de « dashboard générique » à « terminal Star Wars cohérent », en réutilisant des intentions **déjà câblées dans les données** (`uiVariant`, `market-price--modified`, tokens de couleur). Les P1 (typographie, badges, chrome diégétique) capitalisent ensuite sur l'immersion, cœur de valeur d'un écran de boutique en JDR.
</content>
