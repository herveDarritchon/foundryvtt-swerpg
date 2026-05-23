# MSM2 — Raffinement : contraste pastille, clic → compendium, bouton arbres

Issue : [#354 — MSM2 - Résumer les spécialisations dans le header et ouvrir la gestion](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/354)

---

## Changements par rapport au plan initial

Le premier jet (PR #359) a modifié `editSpecializations` pour ouvrir `SpecializationTreeApp` au clic, mais le besoin utilisateur est différent :

- clic principal → ouverture du compendium des spécialisations (comportement d'origine, comme espèce/carrière via `_viewDetailItem`)
- bouton secondaire dédié → ouverture de `SpecializationTreeApp`
- la pastille `+N` manque de contraste et casse le flux inline

## Ce qui est conservé du premier jet

- le view-model `specializationHeader` (primaryName, extraCount, extraNames, hasExtraSpecializations, displayName, badgeLabel, tooltip)
- l'affichage compact `0 / 1 / N`
- les clés i18n `SPECIALIZATION.SHEET.NO_SPECIALIZATION`
- la logique de tooltip sur les spécialisations additionnelles

## Ce qui change

### 1. Clic principal → compendium des spécialisations

**Fichier :** `module/applications/sheets/character-sheet.mjs`

- `#onEditSpecializations()` appelle `this.actor._viewDetailItem('specialization', 'specializations', { editable: false })` comme avant le premier jet.
- Le `data-action="editSpecializations"` reste sur le bloc `<h2>` pour le clic.

### 2. Nouveau bouton secondaire pour l'app des arbres

**Fichiers :** `templates/sheets/actor/character-header.hbs`, `module/applications/sheets/character-sheet.mjs`, `styles/actor.less`

- Ajout d'un bouton icon-only juste à droite du `<h2 class="specialization">`.
- Icône : `systems/swerpg/assets/images/icons/choice.svg` (décorative, `aria-hidden="true"`).
- Action : nouvelle action `editSpecializationTrees` ou réutilisation du mécanisme existant → `openSpecializationTreeApp()`.
- Tooltip / `aria-label` / `title` : clé i18n `SWERPG.TALENT.VIEW_SPECIALIZATION_TREES`.
- Styles : compact, cohérent avec les boutons existants du header (`.audit-log-trigger` ou style dédié).

### 3. Positionnement de la pastille `+N` en badge

**Fichiers :** `templates/sheets/actor/character-header.hbs`, `styles/actor.less`

- La pastille passe en `position: absolute` en haut à droite du bouton principal, pas inline dans le texte.
- Ajout d'un conteneur `position: relative` sur le `<a>` ou le `<h2>` selon la structure retenue.

### 4. Contraste Star Wars pour la pastille

**Fichier :** `styles/actor.less`

- Fond : ambre/holo foncé (ex: `#c9a84c` ou un orange foncé / brun chaud) au lieu du bleu ciel.
- Texte : foncé, épais (`font-weight: 700`), lisible sur fond clair.
- Option : bordure subtile ou ombre portée pour détacher la pastille du fond du header.
- Taille : `min-width: 20px`, `height: 20px`, `font-size: var(--font-size-11)` ou `12`.

### 5. Aucune régression

- Les champs `specializationNames`, `specializationCount`, `specializationDisplayName` restent exposés (compatibilité).
- Le view-model `specializationHeader` reste inchangé.
- Le tooltip des spécialisations additionnelles reste fonctionnel.

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `module/applications/sheets/character-sheet.mjs` | Rétablir `_viewDetailItem`, ajouter action secondaire pour `openSpecializationTreeApp()` |
| `templates/sheets/actor/character-header.hbs` | Badge en position absolue, nouveau bouton icône arbres |
| `styles/actor.less` | Contraste pastille (ambre/holo), positionnement badge, style bouton secondaire |
| `tests/applications/sheets/character-sheet-talents.test.mjs` | Mettre à jour les tests d'action : `editSpecializations` → `_viewDetailItem`, nouvelle action → `openSpecializationTreeApp()` |

## Pas de nouvelles clés i18n

La clé `SWERPG.TALENT.VIEW_SPECIALIZATION_TREES` existe déjà et sert le tooltip du bouton arbres.

## Définition de done

- [ ] Le clic sur le bloc spécialisation ouvre le compendium des spécialisations (comportement d'origine).
- [ ] Un bouton icon-only à droite du bloc spécialisation ouvre `SpecializationTreeApp` avec tooltip explicite.
- [ ] La pastille `+N` est positionnée en haut à droite du bouton principal.
- [ ] La pastille a un fond à fort contraste (ambre/holo) et un texte épais lisible.
- [ ] Les tests sont mis à jour pour les deux actions.
- [ ] Aucune régression sur les tests existants.
