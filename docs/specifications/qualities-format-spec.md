# Spécifications Techniques - Format Canonique de `system.qualities`

## 📋 Contexte

Issue #14 : Décision sur le format canonique des qualités dans SWERPG.
Ce document définit la structure technique retenue pour `system.qualities` dans les Items (armes, armures, talents, mods, attachments).

---

## ✅ **Décisions Retenues**

### 1. Usage Attendu
- **Base à de l'automatisation** (modificateurs de dés, effets conditionnels, interactions avec des règles maison, etc.)
- **Résolution semi-automatisée** basée sur les qualités
- **Préparation pour l'automatisation future** (drapeaux `active`, `source`, etc.)

### 2. Format de Base Retenu : **Option C – Structure Plus Riche**
```javascript
[
  {
    key: "blast",
    rank: 2,
    active: true,
    source: "base"
  },
  {
    key: "burn",
    rank: 2,
    active: true,
    source: "base"
  },
  {
    key: "accurate",
    hasRank: false,
    active: true,
    source: "homebrew"
  }
]
```

**Raison :** Très extensible, prépare l'automatisation, permet de gérer les flags et métadonnées.

### 3. Normalisation des Clés
- **Clés normalisées en anglais** (`"blast"`, `"burn"`, `"pierce"`, `"vicious"`)
- **Liste fermée de qualités supportées** (enum interne) pour les qualités standard
- **Équilibre entre normalisation et flexibilité :**
  - Normalisation pour les qualités standard (facilite l'automatisation)
  - Flexibilité pour les qualités maison (permet d'ajouter des effets uniques sans devoir modifier le code)

### 4. Gestion des Qualités Sans Rang
**Option retenue :** Modèle mixte avec `hasRank`
```javascript
{ key: "accurate", hasRank: false }
{ key: "blast", hasRank: true, rank: 2 }
```
- Permet de différencier les qualités avec et sans rang
- Évite que le code d'affichage / d'automatisation ne se casse sur les qualités non chiffrées
- Ajout possible d'un champ `hasRank` ou `type` pour faciliter le traitement dans l'UI et les règles d'automatisation

### 5. Unification avec le Reste du Système
- **Oui, format global** (même structure partout) :
  - ✅ Armes
  - ✅ Armures
  - ✅ Talents
  - ✅ Mods / Attachments
- **Piste de solution :** Ne pas hésiter à ajouter un attribut avec une liste d'objets sur lesquels la qualité pourra s'appliquer (armes, armures, talents, mods) pour clarifier les implications de la décision.

**Si oui :** On impose : *"À partir de maintenant, le format canonique est Option C, et on migrera le reste plus tard"* (avec un plan de migration explicite à prévoir)

---

## 📋 Structure Technique Détaillée

### Schéma JSON pour `system.qualities`
```javascript
/**
 * @typedef {Object} Quality
 * @property {string} key - Clé normalisée de la qualité (ex: "blast", "burn")
 * @property {number|null} rank - Rang de la qualité (ex: 2 pour Blast 2). Null si pas de rang
 * @property {boolean} hasRank - Indique si la qualité a un rang (pour différencier les qualités avec/sans rang)
 * @property {boolean} active - Indique si la qualité est active (pour l'automatisation future)
 * @property {string} source - Source de la qualité ("base", "homebrew", "oggdude", etc.)
 * @property {Object} [metadata] - Métadonnées additionnelles (optionnel)
 */

// Exemple concret
[
  {
    "key": "blast",
    "rank": 2,
    "hasRank": true,
    "active": true,
    "source": "base",
    "metadata": {
      "description": "Adds blast dice to attack rolls"
    }
  },
  {
    "key": "accurate",
    "hasRank": false,
    "active": true,
    "source": "homebrew"
  }
]
```

### Enum Interne des Qualités Standard (Soft Enum)
```javascript
// config/qualities.mjs
export const QUALITIES = Object.freeze({
  // Qualités avec rang
  BLAST: { key: 'blast', hasRank: true },
  BURN: { key: 'burn', hasRank: true },
  PIERCE: { key: 'pierce', hasRank: true },
  VICIOUS: { key: 'vicious', hasRank: true },
  
  // Qualités sans rang
  ACCURATE: { key: 'accurate', hasRank: false },
  LINKED: { key: 'linked', hasRank: false },
})

// Mapping OggDude vers qualités normalisées
export const OGGDUDE_QUALITY_MAP = {
  'BLAST': 'blast',
  'BURN': 'burn',
  // ...
}
```

---

## 📋 Implémentation

### Étapes à Suivre

#### 1. Créer le fichier de configuration `config/qualities.mjs`
- Définir l'enum interne `QUALITIES`
- Définir le mapping `OGGDUDE_QUALITY_MAP`

#### 2. Mettre à jour le schéma des Items
- Armes : `system.qualities` → Option C
- Armures : `system.qualities` → Option C
- Talents : `system.qualities` → Option C (si applicable)
- Mods / Attachments : `system.qualities` → Option C (si applicable)

#### 3. Mettre à jour les imports OggDude
- Utiliser `OGGDUDE_QUALITY_MAP` pour convertir les qualités OggDude vers le format canonique
- Gérer les qualités inconnues (warning + fallback)

#### 4. Préparer l'automatisation future
- Utiliser le champ `active` pour activer/désactiver les effets
- Utiliser le champ `source` pour tracer l'origine de la qualité

#### 5. Plan de migration pour les données existantes
- Script de migration pour convertir l'ancien format vers Option C
- Gérer les cas particuliers (anciennes chaînes, objets simples, etc.)

---

## 📋 Critères d'Acceptation

- ✅ Un format canonique de `system.qualities` est défini (Option C : structure riche avec flags/métadonnées)
- ✅ La stratégie de normalisation des clés est actée (clés normalisées en anglais, liste fermée pour les standard, flexibilité pour le homebrew)
- ✅ La gestion des qualités avec et sans rang est spécifiée (modèle mixte avec `hasRank`)
- ✅ La décision "global" est documentée (même format pour armes, armures, talents, mods)
- ✅ Les implications sur les imports (OggDude et futurs) et les futures features d'automatisation sont notées dans cette spec

---

## 📋 Impacts de la Décision

Cette décision impactera :
1. **Le schéma de données des Items** (armes, armures, talents, mods)
2. **Les plans d'implémentation futurs** (imports, UI, automatisation)
3. **La dette technique** et le besoin de migration sur les données existantes

**Recommandation :** L'Option C permet l'évolution vers l'automatisation tout en restant simple à implémenter maintenant.

---

## 📋 Prochaines Étapes

1. ✅ **Fait :** Décisions prises et documentées dans l'issue #14
2. ⏳️ **À faire :** Créer un plan de migration pour les données existantes
3. ⏳️ **À faire :** Mettre à jour les imports OggDude pour utiliser le nouveau format
4. ⏳️ **À faire :** Implémenter le format choisi dans le code (schéma des Items)
5. ⏳️ **À faire :** Créer les tests pour valider le nouveau format

---

*Document créé suite aux décisions de l'issue #14 - Format canonique de `system.qualities`*
