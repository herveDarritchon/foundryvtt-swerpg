# Exigences Non-Fonctionnelles - Système Crucible

## Introduction

Ce document décrit les exigences non-fonctionnelles du système Crucible, couvrant les aspects de performance, sécurité, maintenabilité, et compatibilité.

## 1. Performance

### 1.1 Temps de Chargement

**Exigence** : Le système doit se charger rapidement au démarrage de Foundry VTT.

**Critères de performance** :

- Initialisation du système : < 500ms
- Chargement d'une feuille de personnage : < 1s
- Affichage de l'arbre de talents : < 2s

**Mesures d'optimisation** :

- Lazy loading des compendia
- Cache des nœuds de talents
- Minimisation du CSS/JS via build

**Implémentation** :

```javascript
// Cache des ressources
#resourceCache = new Map();

get resources() {
  if (!this.#resourceCache.has("wounds")) {
    this.#resourceCache.set("wounds", this.#calculateWounds());
  }
  return this.#resourceCache.get("wounds");
}
```

### 1.2 Réactivité de l'Interface

**Exigence** : L'interface doit rester fluide même avec de nombreux acteurs/items.

**Critères de performance** :

- Rendu de la feuille de personnage : < 100ms
- Mise à jour d'une ressource : < 50ms
- Affichage d'un chat message : < 200ms

**Mesures d'optimisation** :

- Utilisation de `prepareDerivedData()` pour les calculs
- Éviter les boucles dans les getters
- Debouncing des mises à jour

### 1.3 Gestion Mémoire

**Exigence** : Le système doit gérer efficacement la mémoire pour éviter les fuites.

**Critères de performance** :

- Pas de fuite mémoire sur une session de 4h
- Libération des ressources lors de la fermeture de sheets
- Nettoyage des listeners d'événements

**Implémentation** :

```javascript
async _onClose(options) {
  // Nettoyer les listeners
  this.#removeEventListeners();

  // Libérer les références
  this.actor = null;

  await super._onClose(options);
}
```

### 1.4 Optimisation du Canvas

**Exigence** : L'affichage canvas (arbre de talents, tokens) doit être optimisé.

**Critères de performance** :

- FPS du canvas : > 30 FPS
- Rendu de l'arbre de talents : < 3s
- Nombre de sprites : géré par pooling

**Implémentation** :

- Utilisation de PIXI.Container efficacement
- Culling des éléments hors écran
- Pooling des sprites réutilisables

## 2. Compatibilité

### 2.1 Versions de Foundry VTT

**Exigence** : Le système doit être compatible avec Foundry VTT v13+.

**Versions supportées** :

- Minimum : v13.347
- Vérifié : v14.349
- Maximum : v14

**Contraintes** :

- Utilisation exclusive des APIs v13+
- Pas de fallback pour v11/v12
- Utilisation de `TypeDataModel` et `ApplicationV2`

### 2.2 Navigateurs

**Exigence** : Le système doit fonctionner sur les navigateurs modernes.

**Navigateurs supportés** :

- Chrome/Edge : dernières 2 versions
- Firefox : dernières 2 versions
- Safari : dernières 2 versions

**Non supporté** :

- Internet Explorer
- Navigateurs mobiles (non optimisé)

### 2.3 Modules Tiers

**Exigence** : Le système doit coexister avec des modules populaires.

**Modules testés** :

- ✅ Dice So Nice
- ✅ PopOut!
- ⚠️ foundryvtt-vfx (intégration optionnelle)

**Prévention de conflits** :

- Namespace propre (`crucible`)
- Pas de modification globale de `CONFIG` de base
- Hooks Foundry standard

### 2.4 Systèmes d'Exploitation

**Exigence** : Compatible avec tous les OS supportés par Foundry VTT.

**OS supportés** :

- Windows 10+
- macOS 11+
- Linux (distributions majeures)

## 3. Sécurité

### 3.1 Validation des Entrées

**Exigence** : Toutes les entrées utilisateur doivent être validées.

**Critères** :

- Validation des schémas de données via `DataField`
- Échappement du HTML dans les champs texte
- Validation des formules de dés

**Implémentation** :

```javascript
static defineSchema() {
  return {
    name: new fields.StringField({
      required: true,
      blank: false,
      validate: (value) => {
        if (value.length > 100) {
          throw new Error("Name too long");
        }
      }
    })
  }
}
```

### 3.2 Permissions

**Exigence** : Respecter les permissions Foundry VTT.

**Critères** :

- Vérification des permissions avant modification
- Respect des niveaux de permission (NONE, LIMITED, OBSERVER, OWNER)
- GM-only pour certaines fonctions sensibles

**Implémentation** :

```javascript
async _preUpdate(data, options, user) {
  // Vérifier les permissions
  if (!this.canUserModify(game.user, "update")) {
    throw new Error("Insufficient permissions");
  }
  return super._preUpdate(data, options, user);
}
```

### 3.3 Code JavaScript Sécurisé

**Exigence** : Le code dynamique (hooks de talents) doit être sécurisé.

**Critères** :

- Champs `JavaScriptField` avec `gmOnly: true`
- Validation du code avant exécution
- Sandboxing via `AsyncFunction`

**Implémentation** :

```javascript
actorHooks: new fields.ArrayField(
  new fields.SchemaField({
    hook: new fields.StringField({ required: true }),
    fn: new fields.JavaScriptField({
      async: true,
      gmOnly: true, // Uniquement éditable par le GM
    }),
  }),
)
```

### 3.4 Sanitization HTML

**Exigence** : Le HTML dans les descriptions doit être nettoyé.

**Critères** :

- Utilisation de `HTMLField` qui sanitize automatiquement
- Pas d'injection de scripts
- Whitelist de balises autorisées

**Implémentation** :

```javascript
description: new fields.HTMLField({
  // Automatiquement sanitized par Foundry
})
```

## 4. Maintenabilité

### 4.1 Architecture Modulaire

**Exigence** : Le code doit être organisé en modules clairs.

**Structure** :

```
module/
├── config/         # Configuration statique
├── documents/      # Extensions de documents
├── models/         # Schémas de données
├── applications/   # Interface utilisateur
├── dice/           # Système de dés
├── canvas/         # Composants canvas
└── hooks/          # Hooks Foundry
```

**Principe** : Chaque module a une responsabilité unique.

### 4.2 Documentation du Code

**Exigence** : Le code doit être documenté avec JSDoc.

**Critères** :

- JSDoc pour toutes les méthodes publiques
- `@typedef` pour les structures complexes
- `@param` et `@returns` systématiques

**Exemple** :

```javascript
/**
 * Utiliser une action
 * @param {CrucibleActionUsageOptions} options - Options d'utilisation
 * @returns {Promise<CrucibleActionOutcomes>} Les résultats de l'action
 */
async use(options = {}) {
  // ...
}
```

### 4.3 Conventions de Code

**Exigence** : Le code doit suivre des conventions strictes.

**Conventions** :

- **Nommage** :
  - Classes : `PascalCase`
  - Fonctions/Variables : `camelCase`
  - Constants : `UPPER_SNAKE_CASE`
- **Indentation** : 2 espaces
- **Quotes** : Double quotes `"` préférées
- **Semicolons** : Obligatoires

### 4.4 Gestion des Versions

**Exigence** : Versioning sémantique strict.

**Format** : `MAJOR.MINOR.PATCH`

- **MAJOR** : Changements incompatibles
- **MINOR** : Nouvelles fonctionnalités compatibles
- **PATCH** : Corrections de bugs

**Actuel** : `0.8.1` (pre-release)

### 4.5 Tests

**Exigence** : Les fonctionnalités critiques doivent être testables.

**Approche** :

- Tests manuels via scenarios de playtest
- Validation des migrations de données
- Tests de régression sur les fonctionnalités existantes

**Compendium de test** :

- `crucible.playtest` - Aventure de test complète

## 5. Utilisabilité

### 5.1 Interface Utilisateur

**Exigence** : L'interface doit être intuitive et cohérente.

**Critères** :

- Design cohérent avec le thème Crucible
- Icônes Font Awesome pour clarté
- Tooltips informatifs
- Messages d'erreur clairs

**Implémentation** :

```javascript
// Tooltip avec data-tooltip
<button data-tooltip="Use this action">
  <i class="fa-solid fa-bolt"></i>
</button>
```

### 5.2 Feedback Utilisateur

**Exigence** : Feedback clair pour toutes les actions.

**Types de feedback** :

- Notifications : succès, avertissement, erreur
- Animations : transitions fluides
- Sons : feedback audio optionnel
- Chat messages : résultats détaillés

**Implémentation** :

```javascript
// Notification de succès
ui.notifications.info('Action used successfully')

// Notification d'erreur
ui.notifications.error('Cannot use action: not enough action points')
```

### 5.3 Accessibilité

**Exigence** : Améliorer l'accessibilité pour tous les utilisateurs.

**Critères** :

- Labels ARIA pour les éléments interactifs
- Navigation au clavier
- Contraste suffisant (WCAG AA minimum)
- Taille de police lisible

**Implémentation** :

```html
<button aria-label="Use Action: Strike" data-action="use-action">
  <i class="fa-solid fa-sword"></i>
</button>
```

### 5.4 Responsive (partiel)

**Exigence** : Interface adaptable aux différentes résolutions.

**Critères** :

- Feuilles de personnage utilisables en 1920x1080
- Pas d'éléments tronqués en 1280x720
- Scrolling fluide pour contenu long

**Limitation** : Pas d'optimisation mobile complète.

## 6. Fiabilité

### 6.1 Gestion des Erreurs

**Exigence** : Toutes les erreurs doivent être gérées proprement.

**Critères** :

- Try-catch autour des opérations critiques
- Messages d'erreur explicites
- Logging console pour debug
- Pas de crash silencieux

**Implémentation** :

```javascript
async use(options = {}) {
  try {
    // Logic
  } catch(err) {
    console.error("Action use failed:", err);
    ui.notifications.error(`Cannot use action: ${err.message}`);
    throw err;
  }
}
```

### 6.2 Validation des Données

**Exigence** : Les données doivent être validées à chaque étape.

**Points de validation** :

- À la création de document (`_preCreate`)
- À la mise à jour (`_preUpdate`)
- À la préparation des données (`prepareBaseData`)

**Implémentation** :

```javascript
static #validateAttribute(attr) {
  if ((attr.base + attr.increases) > 12) {
    throw new Error("Attribute cannot exceed 12");
  }
}
```

### 6.3 Migrations de Données

**Exigence** : Support des migrations lors des mises à jour du système.

**Approche** :

- Numéro de version de schéma
- Scripts de migration automatiques
- Backup avant migration
- Rollback possible

**Implémentation** :

```javascript
async _preCreate(data, options, user) {
  // Migration si nécessaire
  if (data.system?.schema?.version < CURRENT_VERSION) {
    await this.#migrateData(data);
  }
  return super._preCreate(data, options, user);
}
```

### 6.4 Intégrité des Données

**Exigence** : Les données doivent rester cohérentes.

**Critères** :

- IDs stables générés via `generateId()`
- Relations maintenues (parent-child)
- Pas d'états incohérents

**Implémentation** :

```javascript
// Génération d'ID stable
generateId(name, length = 16) {
  const hash = name.split("").reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash).toString(36).substring(0, length).padStart(length, "0");
}
```

## 7. Évolutivité

### 7.1 API Publique

**Exigence** : Exposition d'une API stable pour extensions.

**API exposée** :

```javascript
crucible.api = {
  applications, // Classes d'UI
  audio, // Helpers audio
  canvas, // Composants canvas
  dice, // Système de dés
  documents, // Classes de documents
  models, // Data models
  methods, // Méthodes utilitaires
  talents, // Système de talents
  hooks, // Handlers de hooks
}
```

### 7.2 Hooks Personnalisés

**Exigence** : Système de hooks pour permettre l'extension.

**Hooks disponibles** :

- `crucible.action.*` : Lifecycle des actions
- `crucible.talent.*` : Gestion des talents
- `crucible.combat.*` : Événements de combat

**Exemple** :

```javascript
Hooks.on('crucible.action.postActivate', (action, outcome) => {
  // Extension custom
})
```

### 7.3 Configuration Personnalisable

**Exigence** : Permettre la personnalisation du système.

**Éléments configurables** :

- Compendia sources (`crucible.CONFIG.packs`)
- Dénominations de monnaie (`crucible.CONFIG.currency`)
- Langues (`crucible.CONFIG.languages`)
- Connaissances (`crucible.CONFIG.knowledge`)

**Exemple** :

```javascript
// Ajouter une langue personnalisée
crucible.CONFIG.languages.elvish = {
  label: 'Elvish',
  category: 'ancient',
}
```

### 7.4 Extensibilité des Items

**Exigence** : Support de nouveaux types d'items via modules.

**Approche** :

- `CONFIG.Item.dataModels` extensible
- Templates partiels réutilisables
- Hooks pour customisation

## 8. Localisation

### 8.1 Support i18n

**Exigence** : Architecture prête pour la localisation.

**État actuel** :

- Uniquement anglais (`lang/en.json`)
- Toutes les strings via `game.i18n.localize()`
- Structure prête pour d'autres langues

**Implémentation** :

```javascript
// Toujours utiliser i18n
const label = game.i18n.localize('CRUCIBLE.ActionUse')
```

### 8.2 Format de Nombres

**Exigence** : Utiliser le formatage Foundry pour les nombres.

**Exemple** :

```javascript
const formatted = game.i18n.format('CRUCIBLE.DamageAmount', {
  amount: 25,
})
// "25 damage"
```

## 9. Monitoring & Logging

### 9.1 Logging Console

**Exigence** : Logs structurés pour le debugging.

**Niveaux** :

- `console.log()` : Information générale
- `console.warn()` : Avertissements
- `console.error()` : Erreurs

**Mode Debug** :

```javascript
if (crucible.developmentMode) {
  console.log('Debug: Action initialized', action)
}
```

### 9.2 Télémétrie

**Exigence** : Pas de télémétrie sans consentement.

**Politique** :

- Aucune donnée envoyée à des serveurs externes
- Pas de tracking d'usage
- Respect de la vie privée

## 10. Build & Déploiement

### 10.1 Build Process

**Exigence** : Build reproductible et automatisé.

**Scripts npm** :

```json
{
  "build": "npm run compile && npm run rollup && npm run less",
  "compile": "node build.mjs compile",
  "extract": "node build.mjs extract",
  "rollup": "npx rollup --config",
  "less": "lessc styles/crucible.less styles/crucible.css"
}
```

### 10.2 Workflow YAML

**Exigence** : Contenu éditable en YAML, compilé en LevelDB.

**Workflow** :

```mermaid
Edit _source/*.yml
    ↓
npm run compile
    ↓
packs/*.db (LevelDB)
    ↓
Foundry VTT
```

### 10.3 Versioning

**Exigence** : Gestion stricte des versions.

**Fichiers à mettre à jour** :

- `system.json` : version
- `package.json` : version (si pertinent)
- CHANGELOG (si maintenu)

## Résumé

Ces exigences non-fonctionnelles garantissent que le système Crucible est :

- ⚡ **Performant** : Chargement rapide, interface fluide
- 🔒 **Sécurisé** : Validation des entrées, respect des permissions
- 🔧 **Maintenable** : Code modulaire, bien documenté
- 🌐 **Compatible** : Foundry v13+, navigateurs modernes
- 🎯 **Fiable** : Gestion des erreurs, intégrité des données
- 📈 **Évolutif** : API publique, hooks, configuration

---

**Dernière Mise à Jour** : 2025-11-04  
**Version du système** : 0.8.1
