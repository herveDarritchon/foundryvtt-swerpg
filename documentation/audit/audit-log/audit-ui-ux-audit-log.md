# Audit UI/UX & Direction Artistique — Feature Audit Log (Journal d'audit)

> **Périmètre** : interface et expérience du journal d'audit personnage du système Foundry VTT `swerpg` (Star Wars Edge RPG) — application dédiée **et** cartes de chat.
> **Date** : 2026-06-01
> **Auteur** : Directeur Artistique Senior / Web Designer Senior (revue design)
> **Entrées** : `templates/applications/character-audit-log.hbs`, `templates/chat/audit-entry.hbs`, `styles/applications.less` (bloc audit), `styles/chat.less` (bloc audit-entry), `module/applications/character-audit-log.mjs`, `module/utils/audit-log.mjs`.
> **Objectif** : qualifier la qualité UI/UX, la cohérence de marque et l'immersion ; alimenter la backlog design.

---

## 1. Synthèse exécutive

Bonne surprise : **contrairement au Market, le journal d'audit respecte le design system** du projet. L'application et la carte de chat utilisent les **tokens de couleur** (`--color-primary/secondary/success/accent-yellow`), les **polices de marque** (`--font-h1/h2/h3`, Orbitron pour les valeurs) et un **codage couleur sémantique** par variante (gain/ajout/retrait/échec). La carte de chat est **soignée et immersive** (avatar, transition _valeur précédente → nouvelle_, pied de page métadonnées).

Deux problèmes dominent néanmoins :

1. **Variables CSS fantômes** (`--color-cool-4`, `--color-text-dark-secondary`, `--color-error`, `--color-underline`) non définies → **bordures manquantes** dans l'app et **couleurs cassées** sur les variantes _fail_ et _change_ de la carte chat.
2. **Inversion de richesse** : l'écran d'audit **dédié** est **moins expressif** que la carte de chat éphémère (pas d'avatar, pas d'icône de type, pas de transition visuelle, pas de recherche ni de regroupement). L'outil censé être la référence est plus pauvre que le message jetable.

### Scorecard

| Critère                             | Note     | Verdict                                                      |
| ----------------------------------- | -------- | ------------------------------------------------------------ |
| Cohérence de marque (design system) | 🟢 Bon   | Tokens + polices utilisés ; quelques variables fantômes      |
| Immersion / univers Star Wars       | 🟢 Bon   | Carte chat Orbitron, variantes colorées, avatar              |
| Cohérence interne (app ↔ chat)     | 🟠 Moyen | L'app n'reprend pas le langage visuel de la carte chat       |
| Qualité / finition visuelle         | 🟠 Moyen | 4 variables CSS fantômes → bordures/couleurs cassées         |
| Simplicité / lisibilité (rétrieval) | 🟠 Moyen | Pas d'icônes, pas de recherche, pas de regroupement par date |
| Accessibilité                       | 🟠 Moyen | aria-label présent ; manque `aria-pressed` sur filtres       |

---

## 2. Direction artistique & cohérence de marque

### 🟢 Points forts (à préserver)

- **Tokens & polices respectés** : titre en `--font-h1`, carte chat en `--font-h2/h3`, valeurs en Orbitron, couleurs via `--color-*`. Le journal _ressemble_ au reste du jeu (à l'inverse du Market).
- **Codage couleur sémantique par variante** (carte chat) : `add`→`--color-success`, `remove`→`--color-box-warm-1`, `gain`→`--color-accent-blue`. Lecture rapide de la nature de l'événement.
- **En-tête app** avec dégradé subtil et `--font-h1` : identité présente.

### 🔴 DA1. Variables CSS fantômes → défauts de rendu visibles

**Preuve** (vérifié : 0 définition dans `variables.less`/`theme.less`) :

| Variable non définie          | Usage                                                                         | Effet                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--color-cool-4`              | `applications.less:379,426` — bordure header + bordure des cartes d'entrée    | **Bordures manquantes** : les cartes du journal perdent leur contour    |
| `--color-text-dark-secondary` | `chat.less:258,351` — couleur « valeur précédente » + badge variante _change_ | **Couleur de texte cassée** (retombe sur `currentColor`/héritée)        |
| `--color-error`               | `chat.less:345` — badge variante _fail_                                       | **Couleur d'échec cassée** : un échec de talent ne ressort pas en rouge |
| `--color-underline`           | `chat.less:352` — bordure variante _change_                                   | **Bordure cassée** sur les events espèce/carrière/niveau                |

Les variantes les plus courantes (`add`/`remove`/`gain`) fonctionnent ; mais _fail_ (échec d'achat de nœud talent) et _change_ (espèce/carrière/niveau) — justement les événements à signaler clairement — ont un rendu dégradé.

**Reco** : remplacer les tokens réellement cassés par `--color-danger`. Ajouter un lint LESS interdisant les `var(--…)` non résolus (livré depuis : `scripts/check-style-tokens.mjs`, cf. [ADR-0022](../../architecture/adr/adr-0022-design-tokens-mandatory-styling.md)).

> **⚠ Correctif factuel (post-vérification ADR-0022)** — Vérification faite via `scripts/check-style-tokens.mjs` : `--color-cool-4`, `--color-text-dark-secondary` et `--color-underline` **sont des tokens fournis par Foundry Core**, et non des « phantom vars » — leur rendu n'est donc **pas** cassé. Le tableau ci-dessus était inexact sur ces trois entrées. Le **seul** token réellement cassé dans `chat.less` est **`--color-error`** (variante _fail_, lignes 170-171/344-345 ; le token réel est `--color-danger`). La sévérité de DA1 est donc revue à la baisse : un défaut localisé (couleur d'échec) plutôt que des bordures/variantes multiples cassées. Le reste de l'analyse (tokens correctement utilisés, cohérence de marque) reste valable.

### 🟠 DA2. Deux verts différents pour « gain » dans la même feature

**Preuve** : la carte chat colore le gain via `var(--color-success)` (`#00ff99`) ; la liste de l'app code le delta gain en dur `#77d38a` (`applications.less:462`) et la dépense en `#f07a7a` (`:466`). Résultat : **le même concept (gain XP) a deux teintes** selon qu'on le lit dans l'app ou dans le chat. Incohérence interne.

**Reco** : aligner la liste sur `--color-success`/`--color-danger`. Aucune couleur en dur.

### 🟡 DA3. Bypass ponctuels de tokens

`chat.less:256,282` référencent la police en littéral `'Orbitron', sans-serif` au lieu de `var(--font-h1)` (utilisé ailleurs). Glow `rgba(79,168,255,0.22)` en dur (`applications.less:408`). Cosmétique mais à tokeniser pour le theming Jedi/Sith.

---

## 3. UX — Application « Journal d'audit »

### 🔴 UX1. L'écran dédié est moins riche que la carte de chat (inversion)

**Preuve** : `audit-entry.hbs` (chat) affiche **avatar + acteur + label + transition `précédent → nouveau` (badge) + description + pied méta**. La ligne de l'app (`character-audit-log.hbs:40-50`) affiche seulement : `date · type` (méta) puis `description` + `delta`. **Ni avatar, ni badge de transition, ni codage couleur de variante** (seul le delta est coloré).

L'outil de référence (consultation, export, preuve) est donc **visuellement plus pauvre** que le message éphémère. Le langage visuel « variante + badge » conçu pour le chat n'est pas réutilisé dans l'app.

**Reco** : porter le même view-model (variante, badge `prev→next`, couleur) dans la liste de l'app. Une carte d'entrée unifiée chat/app réduirait aussi la dette (un seul langage visuel).

### 🟠 UX2. Aucune icône de type/famille → scan lent

Filtres = boutons **texte** ; entrées = **texte** seul. Sur un journal long (jusqu'à 500, voire 5000 entrées), rien n'accroche l'œil pour distinguer une compétence d'un achat d'un gain d'XP.

**Reco** : un glyphe par famille (compétence, talent, XP, caractéristique, détails, advancement, achat, vente) sur le bouton filtre **et** sur chaque ligne. Gain de lisibilité majeur.

### 🟠 UX3. Pas de recherche ni de filtre temporel

Le seul levier de rétrieval est la barre de 9 familles. Pour un **outil d'audit**, c'est faible : impossible de chercher « toutes les opérations sur Pilotage » ou « le mois dernier ». On scrolle.

**Reco** : champ de recherche texte (sur description/type) + filtre par plage de dates. Afficher un compteur de résultats.

### 🟠 UX4. Pas de regroupement par date ; horodatage lourd répété

Chaque ligne répète l'horodatage complet localisé (« 1 juin 2026 à 14:32 »). Liste plate anté-chronologique sans séparateurs. Visuellement répétitif et dense.

**Reco** : regrouper par jour (« Aujourd'hui / Hier / 28 mai ») avec en-têtes ; n'afficher que l'heure sur la ligne. Utiliser `<time datetime>`.

### 🟡 UX5. Colonne delta : unités mélangées sans repère

Le delta affiche tantôt `+50 XP`, tantôt `+25 cr`, même style, même colonne droite. Un achat et un entraînement se ressemblent.

**Reco** : icône d'unité (XP vs crédits) et/ou regroupement visuel ; la famille (UX2) aide déjà.

### 🟡 UX6. Filtres de familles vides non signalés

Les 9 boutons sont toujours affichés. Cliquer « Talents » sans talent → liste vide sans prévenir.

**Reco** : compteur par famille sur le bouton (`Talents · 0`) ou désactivation des familles vides.

### 🟡 UX7. Pas de détail par entrée (snapshot non exploité)

Le modèle capture `xpAvailable`, `creditsBefore/After` mais l'app ne les montre pas (seul le chat affiche le solde en pied). Un clic « détails » révélant le solde XP/crédits **au moment de l'action** ajouterait une vraie valeur d'audit.

**Reco** : ligne dépliable affichant snapshot + utilisateur + id d'entrée.

### 🟡 UX8. État vide minimal

`audit-log__empty` = texte centré. Pas d'icône/illustration ni d'amorce.

**Reco** : pictogramme + phrase guide (« Les évolutions du personnage apparaîtront ici »).

---

## 4. UX — Carte de chat

**Forte qualité globale** : hiérarchie claire (acteur/label, corps `prev→next`, pied méta), troncature `ellipsis` propre, variantes colorées, avatar. C'est la pièce maîtresse de l'expérience quotidienne.

### 🟡 UX9. Spam de cartes lors d'opérations multi-changements

Une montée de niveau touchant plusieurs compétences poste **une carte par changement** (`sendChatForAuditEntries` boucle sur chaque entrée). Build de personnage = pluie de cartes. (Aggravé par le bug multi-écrivain relevé dans l'audit technique.)

**Reco** : carte « récapitulative » groupant les entrées d'une même opération (option de réglage), ou regroupement visuel.

### 🟡 UX10. Variantes _fail_/_change_ au rendu cassé

Conséquence directe de DA1 : l'échec (`--color-error`) et le changement (`--color-underline`/`--color-text-dark-secondary`) n'ont pas leurs couleurs. Les events à signaler le plus (un échec) passent inaperçus.

---

## 5. Accessibilité

**Points forts** : `aria-label` sur la barre de filtres et l'export, `data-tooltip` sur l'export, structure sémantique (`<header>`, `<article>`, `<footer>`), responsive (`@media 640px`), signe `+/-` sur les deltas (pas que la couleur).

**À corriger** :

- **`aria-pressed` absent** sur les boutons filtres : l'état actif n'est qu'une classe visuelle (`is-active`), non exposé aux lecteurs d'écran. Ajouter `aria-pressed="true|false"`.
- **`<time datetime>`** non utilisé pour les horodatages (lié à UX4).
- **Contraste** des textes secondaires (`--color-secondary`/`--color-tertiary`) sur fonds sombres à valider AA, surtout les méta en `font-size-11`.
- **Couleur seule** pour les variantes du chat : un glyphe par variante (UX2) renforcerait l'accessibilité.

---

## 6. Points forts à préserver

- **Respect du design system** (tokens + polices) — référence pour ce que le Market devrait devenir.
- **Carte de chat soignée et immersive** : avatar, transition `prev→next`, variantes sémantiques, pied méta (prix/solde).
- **Filtres avec état actif réellement rendu** (`is-active` appliqué et stylé, glow).
- **Responsive** (breakpoint 640px) et **structure HTML sémantique** propre (BEM cohérent).
- **i18n complet**, dates localisées, export CSV accessible depuis l'UI.

---

## 7. Backlog proposée (design)

> **P0** = défaut de rendu visible ; **P1** = valeur d'usage / cohérence ; **P2** = polish.

| ID          | Titre                                                                           | Prio   | Type     | Effort | Réf.     |
| ----------- | ------------------------------------------------------------------------------- | ------ | -------- | ------ | -------- |
| AUDIT-UI-01 | Corriger les 4 variables CSS fantômes (bordures app + variantes fail/change)    | **P0** | DA/dette | XS     | DA1/UX10 |
| AUDIT-UI-02 | Aligner les deltas de l'app sur `--color-success/--color-danger`                | **P1** | DA       | XS     | DA2      |
| AUDIT-UI-03 | Unifier le langage visuel app ↔ chat (variante + badge `prev→next` dans l'app) | **P1** | UX       | M      | UX1      |
| AUDIT-UI-04 | Icône par famille/type (boutons filtres + lignes)                               | **P1** | UX       | S      | UX2      |
| AUDIT-UI-05 | Recherche texte + filtre par plage de dates + compteur de résultats             | **P1** | UX       | M      | UX3      |
| AUDIT-UI-06 | Regroupement par date (en-têtes Aujourd'hui/Hier/date) + `<time>`               | **P1** | UX       | S      | UX4      |
| AUDIT-UI-07 | Ligne dépliable « détails » exploitant le snapshot (solde XP/crédits)           | **P2** | UX       | M      | UX7      |
| AUDIT-UI-08 | Carte chat récapitulative pour opérations multi-changements                     | **P2** | UX       | M      | UX9      |
| AUDIT-UI-09 | `aria-pressed` sur les filtres + glyphe par variante (a11y)                     | **P2** | a11y     | XS     | §5       |
| AUDIT-UI-10 | Compteur/désactivation des familles vides                                       | **P2** | UX       | S      | UX6      |
| AUDIT-UI-11 | Repère d'unité XP vs crédits sur le delta                                       | **P2** | UX       | XS     | UX5      |
| AUDIT-UI-12 | État vide illustré + amorce                                                     | **P2** | UX       | XS     | UX8      |
| AUDIT-UI-13 | Tokeniser polices/glow en dur du chat (theming)                                 | **P2** | DA/dette | XS     | DA3      |

---

## 8. Recommandation

Le journal d'audit est, sur le plan DA, **un bon élève** : il prouve que le design system du projet sait produire une UI Star Wars cohérente — c'est le contre-exemple du Market. Priorité **AUDIT-UI-01** : un correctif quasi gratuit (4 variables) qui restaure des **bordures et des couleurs d'échec aujourd'hui cassées**, donc des défauts visibles. Vient ensuite **AUDIT-UI-03** (unifier app et chat) qui élève l'écran de référence au niveau de la carte de chat et **mutualise un seul langage visuel** — gain de cohérence et de maintenabilité. Les chantiers de **rétrieval** (AUDIT-UI-04/05/06 : icônes, recherche, regroupement par date) transforment ensuite un simple flux en véritable **outil d'audit consultable**. Aucune refonte structurelle n'est nécessaire.
</content>
