# Plan: Rendre des zones scrollable dans la character sheet (FoundryVTT v14+)

## Objectif

Permettre le scrolling natif et conservé entre re-renders pour les zones de contenu dans la character sheet (onglets Skills, Inventory, Talents, Effects, Biography), suivant le pattern ApplicationV2 + `HandlebarsApplicationMixin` de Foundry VTT v14+.

## Contexte projet

- **Plateforme**: Foundry VTT v14+
- **Architecture**: ApplicationV2 + `HandlebarsApplicationMixin`
- **Fichiers clés**:
  - `module/applications/sheets/base-actor-sheet.mjs` - Définition des PARTS et TABS
  - `templates/sheets/actor/skills.hbs` - Template de l'onglet skills (exemple fourni)
  - `styles/applications.less` - Styles CSS/LESS
- **Patterns similaires existants**:
  - `market-application.mjs` → `PARTS.catalog.scrollable: ['.market-catalog']`
  - `character-audit-log.mjs` → `PARTS.root.scrollable: ['.audit-log__entries']`
  - `specialization-tree-app.mjs` → `PARTS.scrollable: ['.specialization-tree-app__sidebar']`

## Mécanisme Foundry

Foundry v14+ gère automatiquement le scrolling via la propriété `scrollable` dans `PARTS`:

- Chaque PART peut déclarer `scrollable: ['.selector1', '.selector2', ...]`
- Foundry sauvegarde `scrollTop` avant re-render
- Foundry restaure `scrollTop` après re-render
- **Important**: Le CSS `overflow-y: auto` et la contrainte de hauteur sont à la responsabilité du développeur

## Phases d'implémentation

### Phase 1: Configuration PARTS avec scrollable

**Objectif**: Ajouter `scrollable` à chaque PART d'onglet qui doit scroller.

**Checklist**:

- [ ] Ajouter `scrollable: ['.scrollable']` au PART `skills` dans `base-actor-sheet.mjs` (ligne ~91-94)
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `inventory`
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `talents`
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `effects`
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `biography`
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `actions` (si contenu variable)
- [ ] Ajouter `scrollable: ['.scrollable']` au PART `commitments` (si applicable)

**Format attendu**:

```javascript
skills: {
  id: 'skills',
  template: 'systems/swerpg/templates/sheets/actor/skills.hbs',
  scrollable: ['.scrollable'],
}
```

### Phase 2: CSS et structure HTML

**Objectif**: Assurer que les conteneurs `.scrollable` ont la hauteur et le débordement appropriés.

**Checklist**:

- [ ] Vérifier le layout flex de `.sheet-body` ou du conteneur père (doit être `flex-direction: column`)
- [ ] Ajouter/confirmer CSS pour les sections scrollables:
  - `overflow-y: auto` pour chaque `.scrollable` dans un PART
  - Contrainte de hauteur: soit `flex: 1; min-height: 0` (si parent flex), soit `height: 100%` (si parent a height fixe)
- [ ] Tester qu'aucun parent n'empêche le débordement (pas de `overflow: hidden` intempestif)

**Sélecteur CSS minimal** (dans `styles/applications.less`):

```less
.swerpg.sheet {
  .sheet-body {
    display: flex;
    flex-direction: column;

    [data-application-part] {
      &.scrollable {
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }
    }
  }
}
```

### Phase 3: Marquer les conteneurs dans les templates

**Objectif**: S'assurer que chaque template a un conteneur `.scrollable` pour être ciblé par `PARTS.*.scrollable`.

**Checklist**:

- [ ] `skills.hbs`: Vérifier/ajouter `class="scrollable"` au wrapper racine (actuellement `.skills-wrapper`)
- [ ] `inventory.hbs`: Vérifier/ajouter `class="scrollable"` au conteneur du contenu
- [ ] `talents.hbs`: Vérifier/ajouter `class="scrollable"` au conteneur
- [ ] `effects.hbs`: Vérifier/ajouter `class="scrollable"` au conteneur
- [ ] `biography.hbs`: Vérifier/ajouter `class="scrollable"` au conteneur
- [ ] `actions.hbs`: Vérifier/ajouter `class="scrollable"` si applicable
- [ ] Autres templates: Adapter selon besoin

**Exemple pour `skills.hbs`**:

```handlebars
<section class='tab secondary scrollable {{tabs.skills.id}} flexcol' data-tab='{{tabs.skills.id}}' data-group='{{tabs.skills.group}}'>
  <div class='scrollable'>
    <!-- contenu scrollable -->
  </div>
</section>
```

### Phase 4: Validation et tests

**Objectif**: Vérifier que le scrolling fonctionne et persiste entre re-renders.

**Checklist**:

- [ ] Lancer la character sheet dans Foundry
- [ ] Naviguer vers l'onglet Skills → Vérifier scrolling horizontal et vertical
- [ ] Naviguer vers un autre onglet → Revenir à Skills → Vérifier que la position de scroll est restaurée
- [ ] Répéter pour Inventory, Talents, Effects, Biography
- [ ] Redimensionner la fenêtre → Vérifier que le scroll reste cohérent
- [ ] Modifier une donnée → Vérifier re-render sans perte de position scroll
- [ ] Console: Aucune erreur JavaScript relative au scroll ou aux sélecteurs

## Considérations supplémentaires

### Quelle hauteur contraindre ?

Le conteneur parent (`.sheet-body` ou les PARTS) doit avoir une hauteur donnée pour que `overflow-y: auto` fonctionne:

- **En flex**: Parent `flex-direction: column`, enfant `.scrollable` avec `flex: 1; min-height: 0`
- **En hauteur fixe**: Parent avec `height: Npx` ou `height: 100%`, enfant `.scrollable` avec `overflow-y: auto`
- **Vérifier le layout actuel** dans `styles/applications.less` pour déterminer le bon pattern

### Quels onglets rendre scrollables ?

À confirmer et documenter:

- `skills` → Oui (liste de skills longue)
- `inventory` → Oui (listes d'armures, armes, équipement)
- `talents` → Oui (arbre ou liste de talents)
- `effects` → Probablement (listes d'effets actifs)
- `biography` → Dépend (text long vs texte court)
- `actions` → Dépend (si contenu variable)
- `attributes` → Probablement non (peu de contenu)
- `commitments` → Dépend

**Taille de contenu à viser**: Onglets avec listes ou contenu potentiellement > hauteur visible → scrollable.

### Convention de sélecteur CSS

Deux options:

1. **Garder `.scrollable`** comme classe marqueuse dans templates + sélecteur PARTS
   - Avantage: Explicitement documenté dans le template
   - Inconvénient: Classe "utilitaire" plutôt que sémantique
2. **Utiliser sélecteurs spécifiques** par PART (ex: `.skills-wrapper`, `.inventory-list`)
   - Avantage: Chaque PART a son propre sélecteur
   - Inconvénient: Plus de maintenance si conteneur renommé

**Recommandation**: Utiliser `.scrollable` de préférence pour uniformité et maintenance centralisée.

## Résultats attendus

✅ Chaque onglet scrollable conserve sa position lors de la navigation entre onglets
✅ Chaque onglet scrollable conserve sa position lors d'un re-render (modification de données)
✅ Aucune saccade ou perte de position sur les listes longues
✅ La classe ApplicationV2 Foundry gère automatiquement le scrollTop sans code custom
✅ Compatibilité complète avec Foundry VTT v14+

## Fichiers à modifier

1. `module/applications/sheets/base-actor-sheet.mjs` - Ajouter `scrollable` à PARTS
2. `templates/sheets/actor/skills.hbs` - Vérifier/ajouter classe `.scrollable`
3. `templates/sheets/actor/inventory.hbs` - Vérifier/ajouter classe `.scrollable`
4. `templates/sheets/actor/talents.hbs` - Vérifier/ajouter classe `.scrollable`
5. `templates/sheets/actor/effects.hbs` - Vérifier/ajouter classe `.scrollable`
6. `templates/sheets/actor/biography.hbs` - Vérifier/ajouter classe `.scrollable`
7. `templates/sheets/actor/actions.hbs` - Vérifier/ajouter classe `.scrollable` (si applicable)
8. `styles/applications.less` - Ajouter/confirmer CSS overflow-y et flex constraints

## Fix appliqué

### Cause racine identifiée

Le `.sheet-body` (conteneur flex-column des onglets) manquait `min-height: 0`. En CSS flexbox, sans cette propriété, un flex-item ne peut pas être plus petit que la taille intrinsèque de son contenu — donc `overflow-y: auto` sur les enfants `.tab.scrollable` n'avait aucun effet car le parent grandissait indéfiniment pour accommoder le contenu.

### Correction dans `styles/actor.less`

```less
.sheet-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  height: 100%;
  min-height: 0; /* ← Permet au flex-item de shrink en dessous de sa taille de contenu */
  overflow: hidden; /* ← Empêche le débordement du conteneur parent */
}
```

### Chaîne flex corrigée

```
.swerpg.sheet.actor (overflow: visible)
  └─ .window-content (flex-direction: row, height: calc(100% - header), overflow: visible)
       ├─ [sidebar PART]
       └─ .sheet-body (flex: 1, flex-direction: column, height: 100%, min-height: 0, overflow: hidden) ← FIX
            ├─ [header PART]
            └─ .tab.skills.scrollable (flex: 1, overflow-y: auto, min-height: 0) ← scroll fonctionne maintenant
```

## Prochaines étapes

1. Tester dans Foundry VTT que le scroll fonctionne sur l'onglet Skills
2. Vérifier que les autres onglets (Inventory, Talents, Effects, Biography) scrollent aussi
3. S'assurer que le header PART ne se retrouve pas masqué par `overflow: hidden`
4. Valider que le redimensionnement de la fenêtre reste correct
5. Commit et PR
