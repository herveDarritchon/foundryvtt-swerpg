---
name: 'swerpg-plan-import-new-item-type'
description: 'Plan d’implémentation pour l’ajout d’un nouveau type d’item dans le système à partir d\'OggDude'
---

L'ajout d'un nouveau type d'item (ex: Force Powers, Vehicles, Adversaries) suit une architecture modulaire bien établie
avec 6 domaines actuellement implémentés (Weapon, Armor, Gear, Species, Career, Talent) servant de références.

## Étapes

### 1. Analyser le fichier XML OggDude source

**Objectif:** Comprendre la structure des données source

**Actions:**

- Examiner la structure du XML cible (ex: `ForcePowers.xml`)
- Identifier les chemins XPath (ex: `ForcePowers.ForcePower`)
- Répertorier les propriétés et leurs types
- Documenter les variations de structure entre versions OggDude
- Créer `documentation/importer/import-{type}.md` avec exemples XML

**Critères de validation:**

- Chemin XPath racine identifié
- Structure XML complètement documentée
- Propriétés obligatoires vs optionnelles listées
- Exemples XML représentatifs capturés

**Références:**

- `documentation/importer/import-weapon.md`
- `documentation/importer/import-armor.md`
- `resources/integration/Weapons.xml`

---

### 2. Créer les tables de correspondance

**Objectif:** Définir les mappings OggDude → Foundry

**Actions:**

- Créer `module/importer/mappings/oggdude-{type}-*-map.mjs` pour:
    - Compétences/attributs
    - Catégories/types
    - Propriétés spéciales
    - Ranges/zones
- Centraliser exports dans `module/importer/mappings/index-{type}.mjs`
- Gérer variations de casse et alias

**Critères de validation:**

- Tables de mapping complètes et testées
- Gestion des valeurs inconnues (fallback ou rejet)
- Documentation des correspondances non-évidentes
- Index centralisé créé

**Références:**

- `module/importer/mappings/oggdude-weapon-skill-map.mjs`
- `module/importer/mappings/oggdude-armor-category-map.mjs`
- `module/importer/mappings/oggdude-weapon-quality-map.mjs`

---

### 3. Implémenter les utilitaires de statistiques

**Objectif:** Créer l'instrumentation pour tracking et observabilité

**Actions:**

- Créer `module/importer/utils/{type}-import-utils.mjs` avec:
    - `reset{Type}ImportStats()` - Initialisation stats
    - `increment{Type}ImportStat(key)` - Incrémentation compteurs
    - `get{Type}ImportStats()` - Récupération stats avec métadonnées
    - `add{Type}Unknown*(value)` - Tracking éléments inconnus
- Définir `FLAG_STRICT_{TYPE}_VALIDATION` pour mode strict
- Implémenter structure `_stats` avec `total`, `rejected`, détails

**Critères de validation:**

- Fonctions stats exportées et documentées
- Structure stats cohérente avec autres domaines
- Mode strict/permissif fonctionnel
- Reset stats fonctionnel entre imports

**Références:**

- `module/importer/utils/weapon-import-utils.mjs` ⭐
- `module/importer/utils/armor-import-utils.mjs`

---

### 4. Créer le Context Builder

**Objectif:** Implémenter l'orchestrateur spécifique au domaine

**Actions:**

- Créer `module/importer/items/{type}-ogg-dude.mjs` avec:
    - `build{Type}Context(zip, groupByDirectory, groupByType)` retournant:
        - `jsonData` - Données XML parsées
        - `zip` - Configuration fichier et contenu
        - `image` - Chemins images (worldPath, systemPath, criteria)
        - `folder` - Configuration dossier Foundry
        - `element` - Mapper et type
    - `{type}Mapper(items)` - Fonction mapping principale:
        - Reset stats en début
        - Itération avec `map()` et `filter(Boolean)`
        - Incrémentation compteurs
        - Résolution via tables mapping
        - Validation stricte optionnelle
        - Construction objet Foundry
    - Exports: `build{Type}Context`, `get{Type}ImportStats`, `reset{Type}ImportStats`

**Critères de validation:**

- Context retourne structure complète
- Mapper gère cas nominal et edge cases
- Stats incrémentées correctement
- Validation des données (sanitize, clamp, reject)
- Flags `oggdudeKey` préservés pour traçabilité

**Références:**

- `module/importer/items/weapon-ogg-dude.mjs` ⭐
- `module/importer/items/talent-ogg-dude.mjs`
- `module/importer/items/armor-ogg-dude.mjs`

---

### 5. Intégrer dans l'orchestrateur global

**Objectif:** Connecter le nouveau domaine au système d'import

**Actions:**

- **Dans `module/importer/oggDude.mjs`:**
    - Importer `build{Type}Context`
    - Ajouter entrée à `buildContextMap.set('{type}', { type: '{type}', contextBuilder: build{Type}Context })`

- **Dans `module/importer/utils/global-import-metrics.mjs`:**
    - Importer `get{Type}ImportStats`
    - Ajouter dans `getAllImportStats()`:
        - `const {type} = safeCall(get{Type}ImportStats)`
        - Inclure dans `totalProcessed` et `totalRejected`
        - Retourner dans objet final
    - Ajouter dans `computeDomainDurations()` si applicable

- **Dans `module/settings/OggDudeDataImporter.mjs`:**
    - Ajouter checkbox pour le nouveau type dans template
    - Mettre à jour `_prepareContext()` pour inclure stats
    - Rafraîchir UI après import avec `this.render()`

**Critères de validation:**

- Type sélectionnable dans UI d'import
- Stats affichées correctement post-import
- Métriques globales incluent nouveau domaine
- Durée d'import trackée

**Références:**

- `module/importer/oggDude.mjs` ligne ~150-170
- `module/importer/utils/global-import-metrics.mjs` ⭐
- `module/settings/OggDudeDataImporter.mjs` ⭐

---

### 6. Créer la suite de tests complète

**Objectif:** Assurer qualité et non-régression

**Actions:**

- **Tests unitaires mapper** (`tests/importer/{type}-import.spec.mjs`):
    - Setup: shim xml2js, mock SYSTEM
    - beforeEach: reset stats
    - Tests mapping nominal avec assertions complètes
    - Tests propriétés inconnues (strict vs permissif)
    - Tests valeurs aberrantes (clamping, sanitization)
    - Tests edge cases (null, undefined, empty)

- **Tests statistiques** (`tests/importer/{type}-import-stats.spec.mjs`):
    - Incrémentation compteurs
    - Reset stats
    - Tracking détails (unknowns)
    - Calcul derived values (imported = total - rejected)

- **Tests intégration XML réel** (`tests/importer/{type}-import.integration.spec.mjs`):
    - Charger fichier XML réel depuis `resources/integration/`
    - Parser avec `parseXmlToJson()`
    - Mapper échantillon représentatif
    - Valider structure Foundry produite
    - Vérifier stats cohérentes

- **Tests sécurité** (`tests/importer/oggdude-security.spec.mjs`):
    - XSS: script tags, event handlers
    - Path traversal: `../`, `./`, backslash
    - Injection: commandes shell, SQL-like
    - Robustesse: valeurs extrêmes, Unicode malformé

- **Tests performance** (si type volumineux):
    - Génération XML >10MB avec array.join()
    - Parse sous seuil temps (ex: 4000ms)
    - Mapping sous seuil temps
    - Timeout tests à 15000ms

**Critères de validation:**

- Couverture >80% du mapper
- Tests passent en isolation et batch
- Edge cases couverts
- Performance validée si applicable
- Sécurité validée (XSS, path traversal)

**Références:**

- `tests/importer/weapon-import.spec.mjs` ⭐
- `tests/importer/weapon-import-stats.spec.mjs`
- `tests/importer/armor-import.integration.spec.mjs` ⭐
- `tests/importer/oggdude-performance.spec.mjs` ⭐
- `tests/importer/oggdude-security.spec.mjs`

---

## Considérations Complémentaires

### Validation des données

**Questions à résoudre:**

- Mode strict ou permissif par défaut?
- Stratégie pour propriétés inconnues: rejet vs fallback vs warning?
- Valeurs numériques: limites min/max appropriées?
- Texte: sanitization XSS nécessaire?

**Pattern recommandé:**

```javascript
// Permissif par défaut, strict optionnel - TYPE est le nom du type
export const FLAG_STRICT_TYPE_VALIDATION = false

// Fallback avec warning
let mappedValue = MAP[xmlValue]
if (!mappedValue) {
    logger.warn(`Unknown value: ${xmlValue}`)
    addTypeUnknown * (xmlValue)
    if (FLAG_STRICT_TYPE_VALIDATION) {
        incrementTypeImportStat('rejected')
        return null
    }
    mappedValue = 'defaultValue'
}
```

---

### Gestion des images

**Configuration requise:**

- **Chemin source OggDude:** Identifier dans ZIP (ex: `Data/{Type}Images/`, `Data/SpeciesImages/`)
- **worldPath Foundry:** Définir destination (ex: `modules/swerpg/assets/{type}`)
- **systemPath:** Icône par défaut (ex: `icons/{type}.svg`)
- **Prefix:** Préfixe fichiers (ex: `ForcePower`, `Vehicle`)

**Exemple:**

```javascript

const image = {
    criteria: 'Data/ForcePowerImages',
    worldPath: 'modules/swerpg/assets/forcepowers',
    systemPath: buildItemImgSystemPath('forcepower.svg'),
    images: groupByType.image,
    prefix: 'ForcePower'
}

```

---

### Structure XML spécifique

**Patterns à gérer:**

**Éléments imbriqués:**

```xml

<ForcePower>
    <Upgrades>
        <Upgrade>
            <Key>STRENGTH</Key>
            <Count>2</Count>
        </Upgrade>
    </Upgrades>
</ForcePower>
```

→ Résolution itérative avec `map()`

**Relations parent-enfant:**

```xml

<Vehicle>
    <WeaponProfiles>
        <WeaponProfile>
            <Name>...</Name>
        </WeaponProfile>
    </WeaponProfiles>
</Vehicle>
```

→ Stockage référence ou intégration inline?

**Attributs vs éléments:**

```xml

<Item type="restricted" rarity="8">...</Item>
```

→ Parser doit supporter attributs XML

---

### Performance attendue

**Évaluation nécessaire:**

- Taille fichier XML typique?
- Nombre d'items par fichier?
- Parsing synchrone acceptable ou streaming requis?

**Seuils recommandés:**

- **<1MB:** Parsing synchrone OK
- **1-10MB:** Tests performance obligatoires, seuil 4000ms
- **>10MB:** Envisager streaming/chunking

**Benchmark actuel:**

- Weapons.xml 75k items (~11MB): parsing <4000ms
- Memory footprint: monitoring nécessaire si >100MB

---

### Compatibilité versions OggDude

**Stratégie:**

- Identifier versions OggDude supportées (ex: 2.0+, 2.3+)
- Documenter variations structure entre versions
- Implémenter détection version si possible:

```xml

<Data version="2.3.1.0">...</Data>
```

- Fallbacks gracieux pour champs manquants
- Tests avec échantillons multi-versions

---

## Checklist Finale

Avant de considérer l'implémentation complète:

- [ ] **Documentation:** `documentation/importer/import-{type}.md` créé avec exemples
- [ ] **Mappings:** Tables de correspondance complètes dans `mappings/`
- [ ] **Stats:** Utilitaires dans `utils/{type}-import-utils.mjs`
- [ ] **Context Builder:** `items/{type}-ogg-dude.mjs` implémenté
- [ ] **Orchestrateur:** Enregistré dans `oggDude.mjs`
- [ ] **Métriques:** Intégré dans `global-import-metrics.mjs`
- [ ] **UI:** Checkbox et affichage stats dans `OggDudeDataImporter.mjs`
- [ ] **Tests unitaires:** Mapper + stats testés
- [ ] **Tests intégration:** XML réel testé
- [ ] **Tests sécurité:** XSS + path traversal validés
- [ ] **Tests performance:** Si applicable, seuils validés
- [ ] **Coverage:** >80% pour nouveaux fichiers
- [ ] **Linting:** `pnpm lint` passe sans erreur
- [ ] **Build:** `pnpm build` réussit

---

## Commandes Utiles

```bash
# Développement
pnpm test {type}-import          # Tests spécifiques
pnpm test:coverage               # Avec couverture
pnpm lint                        # Vérification code style
pnpm build                       # Build complet

# Debug Foundry
CONFIG.debug.hooks = true        # Dans console navigateur
```

---

## Ressources Clés

### Fichiers de Référence Prioritaires

- **Orchestration:** `module/importer/oggDude.mjs` ⭐
- **Context Pattern:** `module/importer/items/weapon-ogg-dude.mjs` ⭐
- **Mapping Pattern:** `module/importer/mappers/oggdude-talent-mapper.mjs` ⭐
- **Stats Pattern:** `module/importer/utils/weapon-import-utils.mjs` ⭐
- **Métriques:** `module/importer/utils/global-import-metrics.mjs` ⭐
- **Tests Complets:** `tests/importer/weapon-import.spec.mjs` ⭐
- **Tests Intégration:** `tests/importer/armor-import.integration.spec.mjs` ⭐

### Documentation

- **Importer Memory:** `.github/instructions/importer-memory.instructions.md`
- **Metrics Memory:** `.github/instructions/importer-metrics-memory.instructions.md`
- **Weapon Import:** `documentation/importer/import-weapon.md`
- **Talent Architecture:** `documentation/importer/talent-architecture.md`

### Données Test

- **XML Réels:** `resources/integration/`
- **Structure OggDude:** Analyser fichiers dans `resources/integration/`
