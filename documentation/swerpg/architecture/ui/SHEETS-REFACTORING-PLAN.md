# Plan de Refactorisation des Sheets swerpg

> **Objectif**: Corriger les violations des règles architecturales et améliorer la cohérence des 21 classes de sheet du système swerpg selon les standards définis dans `APPLICATIONS-RULES.md` et `APPLICATIONS-AGENT.md`.

---

## 🔍 État des Lieux - Problèmes Identifiés

### ❌ Problèmes Critiques

#### 1. **Documentation et Commentaires Incorrects**

- `ObligationSheet` (ligne 5): Documentation JSDoc indique "ancestry" au lieu d'"obligation"
- `SpecializationSheet` (ligne 5): Même problème de documentation
- `CareerSheet` (ligne 5): Documentation JSDoc incorrecte

#### 2. **Logs de Débogage Permanents**

- `ObligationSheet` (ligne 37): `console.log` permanent dans `_prepareContext`
- `CharacterSheet`: Multiples `console.log` et `console.debug` permanents
- Violation de la règle : "Il faut éviter les console.log permanents"

#### 3. **Architecture ApplicationV2 Incohérente**

- Duplication entre `base-actor-sheet.mjs` et `base-actor-sheet-origin.mjs`
- Patterns `DEFAULT_OPTIONS` non uniformes entre les classes
- Mélange de patterns ApplicationV1 et ApplicationV2

#### 4. **Préparation de Contexte Non Standardisée**

- Logique métier dans les méthodes de préparation non factorisée
- Contexte minimum requis non respecté dans certaines classes
- Méthodes communes dupliquées entre sheets

---

## 📋 Plan de Correction Détaillé

### **Phase 1: Nettoyage et Standardisation** 🚨 **PRIORITÉ CRITIQUE**

#### 1.1 Nettoyer les Logs de Débogage

**Fichiers à corriger:**

- `module/applications/sheets/obligation.mjs` (ligne 37)
- `module/applications/sheets/character-sheet.mjs` (multiples lignes)

**Action:**

```javascript
// ❌ À SUPPRIMER
console.log(`ObligationSheet._prepareContext ${context.name}:`, context);
console.log(`[character-sheet] #buildJaugeDisplayData - resource ${type}`, resource);
console.debug("[CharacterSheet] context", context);

// ✅ Si logging nécessaire, utiliser un mécanisme conditionnel
if (CONFIG.debug?.sheets) {
    console.debug(`[${this.constructor.name}] Context prepared:`, context);
}
```

#### 1.2 Corriger la Documentation JSDoc

**Fichiers à corriger:**

- `module/applications/sheets/obligation.mjs`
- `module/applications/sheets/specialization.mjs`
- `module/applications/sheets/career.mjs`

**Template JSDoc standard:**

```javascript
/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "{TYPE}" type.
 * @extends SwerpgBaseItemSheet
 */
export default class {Type}Sheet extends SwerpgBaseItemSheet {
    // ...
}
```

#### 1.3 Unifier les DEFAULT_OPTIONS

**Pattern à généraliser:**

```javascript
static DEFAULT_OPTIONS = {
    classes: ["swerpg", "sheet", "item", "{type}"], // ou "actor" pour acteurs
    tag: "form",
    position: {
        width: 600,
        height: "auto",
    },
    window: {
        minimizable: true,
        resizable: true,
    },
    actions: {
        // Actions spécifiques à la sheet
    }
};
```

---

### **Phase 2: Consolidation Architecturale** 🔥 **PRIORITÉ HAUTE**

#### 2.1 Résoudre la Duplication base-actor-sheet

**Problème:** Deux fichiers base pour les acteurs

- `module/applications/sheets/base-actor-sheet.mjs`
- `module/applications/sheets/base-actor-sheet-origin.mjs`

**Solution:** Migrer vers une seule classe de base uniforme

**Actions:**

1. Analyser les différences entre les deux classes
2. Choisir `base-actor-sheet.mjs` comme référence (architecture ApplicationV2 plus récente)
3. Migrer les fonctionnalités manquantes de `base-actor-sheet-origin.mjs`
4. Mettre à jour toutes les sheets qui étendent l'ancienne base
5. Supprimer `base-actor-sheet-origin.mjs`

#### 2.2 Standardiser _prepareContext()

**Template obligatoire pour toutes les sheets:**

```javascript
/**
 * Prepare the context data for rendering the sheet template.
 * @param {object} options - Rendering options
 * @returns {Promise<object>} The prepared context
 */
async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // ✅ Standard minimum OBLIGATOIRE
    context.document = this.document;
    context.system = this.document.system;
    context.config = game.system.config;
    context.isOwner = this.document.isOwner;
    
    // Préparation spécifique à la sheet
    // (toute logique métier pour le template va ICI)
    
    return context;
}
```

---

### **Phase 3: Factorisation et Optimisation** ⚡ **PRIORITÉ MOYENNE**

#### 3.1 Remonter les Méthodes Communes dans les Bases

**Dans CharacterSheet, méthodes à factoriser:**

- `#buildJaugeDisplayData(resources)` → à remonter dans `SwerpgBaseActorSheet`
- `#buildDefenseDisplayData()` → à remonter dans `SwerpgBaseActorSheet`
- `#buildMotivationList()` → logique commune aux personnages

**Critères de factorisation:**

- Méthode utilisée par 2+ classes de sheet
- Logique métier non spécifique à un type d'acteur/item
- Calculs de données pour templates

#### 3.2 Améliorer la Gestion des Événements

**Pattern ApplicationV2 à systématiser:**

```javascript
static DEFAULT_OPTIONS = {
    // ...
    actions: {
        editSpecies: CharacterSheet.#onEditSpecies,
        editCareer: CharacterSheet.#onEditCareer,
        toggleTrainedSkill: CharacterSheet.#onToggleTrainedSkill,
        rollSkill: CharacterSheet.#onRollSkill
    }
};

// Méthodes d'action privées
static async #onEditSpecies(event, target) {
    // Logique d'édition d'espèce
}
```

#### 3.3 Optimiser les Performances

**Actions:**

- Debouncer les inputs fréquents (ex: champs numériques)
- Cache des sélecteurs DOM récurrents
- Lazy loading des données coûteuses

---

### **Phase 4: Conformité CSS/HTML** 🎨 **PRIORITÉ MOYENNE**

#### 4.1 Standardiser les Classes CSS

**Structure CSS obligatoire:**

```javascript
// Pour les feuilles d'acteur
static DEFAULT_OPTIONS = {
    classes: ["swerpg", "sheet", "actor", "{actorType}"],
    // ...
};

// Pour les feuilles d'item
static DEFAULT_OPTIONS = {
    classes: ["swerpg", "sheet", "item", "{itemType}"],
    // ...
};
```

#### 4.2 Vérifier la Structure HTML

**Template HTML obligatoire:**

```html
<div class="swerpg sheet actor {type}">
    <header class="sheet-header">
        <!-- En-tête de la feuille -->
    </header>
    <nav class="sheet-tabs">
        <!-- Navigation par onglets -->
    </nav>
    <section class="sheet-body">
        <!-- Contenu principal -->
    </section>
    <footer class="sheet-footer">
        <!-- Actions de pied de page -->
    </footer>
</div>
```

---

## 🎯 Calendrier d'Implémentation

### **Semaine 1: Nettoyage Critique** (4-5 jours)

**Jour 1-2:**

- [ ] Supprimer tous les `console.log/debug` permanents
- [ ] Corriger la documentation JSDoc erronée
- [ ] Linter et formatter tout le code des sheets

**Jour 3-4:**

- [ ] Unifier les `DEFAULT_OPTIONS` dans toutes les classes
- [ ] Standardiser les patterns de classe CSS
- [ ] Vérifier la conformité des templates HTML

**Jour 5:**

- [ ] Tests de régression
- [ ] Documentation des changements

### **Semaine 2: Consolidation Architecturale** (5 jours)

**Jour 1-2:**

- [ ] Analyser et résoudre la duplication `base-actor-sheet`
- [ ] Créer la classe de base unifiée
- [ ] Migrer 50% des sheets vers la nouvelle base

**Jour 3-4:**

- [ ] Migrer les 50% restantes
- [ ] Standardiser `_prepareContext()` dans toutes les classes
- [ ] Supprimer l'ancienne classe de base

**Jour 5:**

- [ ] Tests d'intégration complets
- [ ] Vérification de la compatibilité modules externes

### **Semaine 3: Factorisation et Optimisation** (5 jours)

**Jour 1-2:**

- [ ] Identifier et remonter les méthodes communes
- [ ] Refactoriser `CharacterSheet` et classes similaires
- [ ] Optimiser les méthodes de préparation de données

**Jour 3-4:**

- [ ] Améliorer la gestion des événements (ApplicationV2)
- [ ] Implémenter le debouncing sur les inputs fréquents
- [ ] Optimiser les performances de rendu

**Jour 5:**

- [ ] Tests de performance
- [ ] Profilage et optimisations finales

### **Semaine 4: Validation et Documentation** (3-4 jours)

**Jour 1-2:**

- [ ] Tests complets de toutes les sheets
- [ ] Vérification de la conformité aux règles
- [ ] Tests de compatibilité modules externes

**Jour 3:**

- [ ] Documentation des breaking changes
- [ ] Mise à jour du changelog
- [ ] Documentation des nouvelles APIs

**Jour 4 (optionnel):**

- [ ] Formation équipe sur les nouveaux patterns
- [ ] Revue finale du code

---

## ✅ Actions Immédiates (Cette semaine)

### **Critiques (À faire MAINTENANT)**

1. **Supprimer les logs permanents:**

```bash
   # Dans ObligationSheet - Ligne 37
   # ❌ Supprimer cette ligne
   console.log(`ObligationSheet._prepareContext ${context.name}:`, context);
```

2. **Corriger les commentaires JSDoc:**

```javascript
   // Dans ObligationSheet, SpecializationSheet, CareerSheet
   // ❌ Remplacer
   /**
    * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
    */
   
   // ✅ Par
   /**
    * A SwerpgBaseItemSheet subclass used to configure Items of the "obligation" type.
    */
```

3. **Linter tout le code:**

```bash
   npm run lint:fix
   # ou
   pnpm run lint:fix
```

---

## 🔧 Outils et Scripts Utiles

### **Scripts de Refactoring**

```bash
# Rechercher tous les console.log dans les sheets
find module/applications/sheets -name "*.mjs" -exec grep -l "console\." {} \;

# Rechercher les violations de naming
find module/applications/sheets -name "*.mjs" -exec grep -l "class.*Sheet" {} \;

# Vérifier la conformité DEFAULT_OPTIONS
find module/applications/sheets -name "*.mjs" -exec grep -l "DEFAULT_OPTIONS\|defaultOptions" {} \;
```

### **Template de Validation**

```javascript
// Checklist pour chaque nouvelle sheet ou sheet refactorisée:
// [ ] Étend SwerpgBaseActorSheet ou SwerpgBaseItemSheet
// [ ] Classe en PascalCase avec suffixe "Sheet"
// [ ] Fichier en kebab-case avec suffixe "-sheet.mjs"
// [ ] DEFAULT_OPTIONS conforme au standard
// [ ] _prepareContext() implémenté avec minimum requis
// [ ] activateListeners() appelle super et délègue
// [ ] Aucun console.log permanent
// [ ] Documentation JSDoc correcte
// [ ] Classes CSS conformes au contrat
// [ ] Structure HTML respectée
```

---

## 🚨 Points de Vigilance

### **Breaking Changes Potentiels**

1. **Suppression de `base-actor-sheet-origin.mjs`**
   - Impact: Modules externes qui importent cette classe
   - Mitigation: Dépréciation graduelle, documentation

2. **Changement des signatures de méthodes**
   - Impact: Hooks externes qui overrident ces méthodes
   - Mitigation: Maintenir la rétrocompatibilité quand possible

3. **Modifications des classes CSS**
   - Impact: Styles CSS externes qui ciblent ces classes
   - Mitigation: Maintenir les classes principales, ajouter des alias

### **Tests de Non-Régression**

- [ ] Ouverture/fermeture de toutes les types de sheets
- [ ] Édition et sauvegarde dans chaque type de sheet
- [ ] Drag & drop entre sheets
- [ ] Context menus
- [ ] Hooks `render*` pour modules externes
- [ ] Performance de rendu (avant/après)

---

## 📚 Ressources et Références

- **Règles architecturales:** `APPLICATIONS-RULES.md`
- **Guide copilot:** `APPLICATIONS-AGENT.md`
- **Architecture générale:** `APPLICATIONS.md`
- **Foundry VTT ApplicationV2 API:** [Documentation officielle](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)

---

*Plan créé le : 6 novembre 2025*  
*Révision : 1.0*  
*Statut : En attente d'approbation*