# Exigences Non-Fonctionnelles - Système Star Wars Edge RPG (SWERPG)

## Introduction

Ce document décrit les exigences non-fonctionnelles du système Star Wars Edge RPG, couvrant les aspects de performance, sécurité, maintenabilité, et compatibilité spécifiques à l'univers Star Wars et aux mécaniques narratives.

## 1. Performance

### 1.1 Temps de Chargement

**Exigence** : Le système doit se charger rapidement au démarrage de Foundry VTT, en tenant compte de la complexité des mécaniques Star Wars.

**Critères de performance** :

- Initialisation du système : < 800ms
- Chargement d'une feuille de héros : < 1.2s
- Affichage de l'arbre de talents : < 2.5s
- Construction d'un pool de dés : < 300ms
- Calcul des points de Force : < 200ms

**Mesures d'optimisation** :

- Lazy loading des compendia Star Wars
- Cache des arbres de talents par spécialisation
- Cache des pools de dés fréquemment utilisés
- Minimisation du CSS/JS via build pipeline

**Implémentation** :

```javascript
// Cache spécialisé pour les mécaniques Star Wars
class SwerpgCache {
    #talentTreeCache = new Map();
    #dicePoolCache = new Map();
    #forceRatingCache = new Map();

    getTalentTree(specializationId) {
        if (!this.#talentTreeCache.has(specializationId)) {
            this.#talentTreeCache.set(specializationId, this.#buildTalentTree(specializationId));
        }
        return this.#talentTreeCache.get(specializationId);
    }

    getDicePool(characteristic, skill, difficulty) {
        const key = `${characteristic}-${skill}-${difficulty}`;
        if (!this.#dicePoolCache.has(key)) {
            this.#dicePoolCache.set(key, this.#calculateDicePool(characteristic, skill, difficulty));
        }
        return this.#dicePoolCache.get(key);
    }
}
```

### 1.2 Réactivité de l'Interface

**Exigence** : L'interface doit rester fluide même avec de nombreux personnages et calculs complexes de dés.

**Critères de performance** :

- Rendu de la feuille de personnage : < 150ms
- Mise à jour d'une compétence : < 50ms
- Affichage d'un résultat de dés : < 100ms
- Calcul d'un pool de Force : < 80ms
- Recherche dans les talents : < 200ms

**Mesures d'optimisation** :

- Debouncing des mises à jour de compétences
- Virtualisation des listes longues (talents, équipement)
- Web Workers pour calculs de dés complexes
- Optimisation des re-rendus avec shouldComponentUpdate

```javascript
// Optimisation des calculs de pools de dés
class DicePoolOptimizer {
    static calculatePoolAsync(characteristics, skills, modifiers) {
        return new Promise((resolve) => {
            const worker = new Worker('/systems/swerpg/workers/dice-calculator.js');
            worker.postMessage({ characteristics, skills, modifiers });
            worker.onmessage = (e) => resolve(e.data);
        });
    }
}
```

### 1.3 Gestion Mémoire

**Exigence** : Le système doit gérer efficacement la mémoire, particulièrement pour les longues sessions.

**Critères de performance** :

- Utilisation mémoire de base : < 50MB
- Croissance mémoire par heure de jeu : < 5MB
- Temps de garbage collection : < 10ms
- Cache invalidation automatique après 30min d'inactivité

**Implémentation** :

```javascript
// Gestion automatique du cache avec TTL
class TTLCache {
    #cache = new Map();
    #timers = new Map();
    #ttl = 30 * 60 * 1000; // 30 minutes

    set(key, value) {
        this.#cache.set(key, value);
        
        if (this.#timers.has(key)) {
            clearTimeout(this.#timers.get(key));
        }
        
        this.#timers.set(key, setTimeout(() => {
            this.#cache.delete(key);
            this.#timers.delete(key);
        }, this.#ttl));
    }
}
```

## 2. Sécurité et Intégrité

### 2.1 Validation des Données

**Exigence** : Toutes les données utilisateur doivent être validées selon les règles Star Wars Edge RPG.

**Critères de sécurité** :

- Validation des caractéristiques (1-6, sauf avec talents spéciaux)
- Validation des rangs de compétences (0-5)
- Validation des coûts XP et crédits
- Prévention de la manipulation côté client
- Validation des formules de dés personnalisées

**Implémentation** :

```javascript
class SwerpgValidator {
    static validateCharacteristic(value, hasEnhancement = false) {
        const min = 1;
        const max = hasEnhancement ? 7 : 6;
        return Number.isInteger(value) && value >= min && value <= max;
    }

    static validateSkillRank(rank, characteristic) {
        return Number.isInteger(rank) && rank >= 0 && rank <= Math.max(5, characteristic);
    }

    static validateXpCost(current, spent, earned) {
        return spent >= 0 && spent <= earned && current >= 0;
    }
}
```

### 2.2 Prévention des Exploits

**Exigence** : Le système doit empêcher les exploits courants liés aux mécaniques Star Wars.

**Mesures de sécurité** :

- Vérification serveur des calculs XP
- Validation des connexions de talents
- Contrôle des limites d'obligations/devoirs
- Protection contre la manipulation des pools de Force
- Audit trail pour les modifications importantes

```javascript
class SecurityManager {
    static auditCharacterChange(actor, field, oldValue, newValue, user) {
        const audit = {
            timestamp: Date.now(),
            actor: actor.id,
            user: user.id,
            field: field,
            oldValue: oldValue,
            newValue: newValue,
            ip: user.ip
        };
        
        game.socket.emit("system.swerpg", {
            type: "audit",
            data: audit
        });
    }
}
```

## 3. Compatibilité

### 3.1 Foundry VTT

**Exigence** : Compatibilité totale avec Foundry VTT v13+ et rétrocompatibilité limitée.

**Versions supportées** :

- **Primaire** : Foundry VTT v13.347+
- **Secondaire** : Foundry VTT v12.331+ (fonctionnalités dégradées)
- **Non supporté** : Foundry VTT < v12

**Fonctionnalités dégradées en v12** :

- Interface ApplicationV2 → ApplicationV1 fallback
- Certains composants UI modernes non disponibles
- Performance réduite pour les gros datasets

### 3.2 Navigateurs

**Exigence** : Support des navigateurs modernes avec dégradation gracieuse.

**Navigateurs supportés** :

- **Optimal** : Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- **Acceptable** : Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- **Non supporté** : Internet Explorer, navigateurs obsolètes

**Fonctionnalités dépendantes du navigateur** :

- WebGL pour effets visuels avancés
- Web Workers pour calculs parallèles
- CSS Grid pour layouts complexes
- ES2022 features avec transpilation fallback

### 3.3 Modules Communautaires

**Exigence** : Compatibilité avec les modules populaires de la communauté Foundry.

**Modules prioritaires** :

- **Combat** : Simple Calendar, Turn Marker, Combat Utility Belt
- **Interface** : PopOut!, Window Controls, Monk's Enhanced Journal
- **Automation** : Token Action HUD, Better Rolls for 5e (adaptation)
- **Qualité de vie** : Quick Insert, Find the Culprit, Bug Reporter

**Intégration spécialisée** :

```javascript
// Hook pour modules externes
Hooks.on("swerpg.diceRolled", (roll, actor, data) => {
    // Permet aux modules externes de réagir aux jets de dés Star Wars
    if (game.modules.get("custom-dice-module")?.active) {
        game.modules.get("custom-dice-module").api.processSWRoll(roll, data);
    }
});
```

## 4. Maintenabilité

### 4.1 Architecture Modulaire

**Exigence** : Code organisé en modules clairs avec séparation des responsabilités.

**Structure recommandée** :

```text
module/
├── dice/           # Système de dés narratifs
├── force/          # Mécaniques de la Force
├── talents/        # Système de talents et spécialisations
├── combat/         # Combat Star Wars
├── obligations/    # Obligations/Devoirs/Conflits
├── species/        # Espèces et caractéristiques raciales
└── vehicles/       # Véhicules et starships
```

### 4.2 Documentation

**Exigence** : Documentation complète pour développeurs et utilisateurs.

**Standards de documentation** :

- JSDoc pour toutes les fonctions publiques
- README détaillé avec exemples
- Architecture documentée avec diagrammes
- Changelog sémantique (CHANGELOG.md)
- Guide de contribution (CONTRIBUTING.md)

```javascript
/**
 * Calcule un pool de dés pour une action Star Wars Edge RPG
 * @param {number} characteristic - Valeur de la caractéristique (1-6)
 * @param {number} skill - Rang de compétence (0-5)
 * @param {number} difficulty - Difficulté de base (0-5)
 * @param {Object} modifiers - Modificateurs situationnels
 * @param {number} modifiers.boost - Dés de boost à ajouter
 * @param {number} modifiers.setback - Dés de setback à ajouter
 * @returns {SwerpgDicePool} Pool de dés configuré
 */
function calculateDicePool(characteristic, skill, difficulty, modifiers = {}) {
    // Implementation...
}
```

### 4.3 Tests et Qualité

**Exigence** : Couverture de tests comprehensive et qualité de code élevée.

**Objectifs de qualité** :

- Couverture de tests : > 80%
- Temps d'exécution des tests : < 30s
- Linting sans erreurs (ESLint + Prettier)
- Pas de dépendances vulnérables
- Métriques de complexité acceptables

**Infrastructure de tests** :

```javascript
// Tests spécialisés pour les mécaniques Star Wars
describe("Force System", () => {
    test("should generate correct Force points from dice", () => {
        const result = SwerpgForce.rollForcePool(3);
        expect(result.lightPoints).toBeGreaterThanOrEqual(0);
        expect(result.darkPoints).toBeGreaterThanOrEqual(0);
        expect(result.totalPoints).toBe(result.lightPoints + result.darkPoints);
    });
    
    test("should apply morality changes correctly", () => {
        const character = createTestCharacter({ morality: 50 });
        SwerpgForce.addConflict(character, 3);
        expect(character.system.force.conflict).toBe(3);
    });
});
```

## 5. Utilisabilité

### 5.1 Interface Star Wars

**Exigence** : Interface cohérente avec l'esthétique Star Wars tout en restant fonctionnelle.

**Principes de design** :

- **Couleurs** : Palette inspirée des films (noir, gris, bleu, orange, rouge)
- **Typographie** : Fonts évoquant l'univers sans nuire à la lisibilité
- **Iconographie** : Icônes reconnaissables (sabres laser, casques, vaisseaux)
- **Feedback** : Sons optionnels pour actions importantes

```css
/* Thème Star Wars */
:root {
    --sw-primary: #00a8ff;      /* Bleu hyperespace */
    --sw-secondary: #ffc312;    /* Jaune-orange */
    --sw-danger: #c23616;       /* Rouge Sith */
    --sw-dark: #2f3640;         /* Gris spatial */
    --sw-light: #f5f6fa;        /* Blanc Imperial */
}

.swerpg-sheet {
    background: linear-gradient(135deg, var(--sw-dark) 0%, #1e1e1e 100%);
    border: 2px solid var(--sw-primary);
    color: var(--sw-light);
}
```

### 5.2 Accessibilité

**Exigence** : Interface accessible aux utilisateurs avec handicaps.

**Standards WCAG 2.1 Level AA** :

- Contraste minimum 4.5:1 pour le texte normal
- Contraste minimum 3:1 pour le texte large
- Support navigation clavier complète
- Attributs ARIA appropriés
- Textes alternatifs pour images

```html
<!-- Exemple d'élément accessible -->
<button 
    class="dice-roll-button"
    aria-label="Lancer les dés pour Tir à distance (Agilité + Ranged Light)"
    aria-describedby="dice-pool-description"
    tabindex="0">
    <i class="fas fa-dice" aria-hidden="true"></i>
    Lancer les dés
</button>
<div id="dice-pool-description" class="sr-only">
    Pool actuel: 2 dés d'Aptitude, 1 dé de Maîtrise, 2 dés de Difficulté
</div>
```

### 5.3 Aide Contextuelle

**Exigence** : Système d'aide intégré pour les règles complexes Star Wars.

**Fonctionnalités d'aide** :

- Tooltips explicatifs sur tous les éléments
- Aide contextuelle pour calculs de dés
- Liens vers sections du livre de règles
- Exemples d'utilisation des talents
- Glossaire des termes Star Wars

```javascript
// Système de tooltips contextuels
class SwerpgTooltips {
    static init() {
        $(document).on('mouseenter', '[data-swerpg-tooltip]', function() {
            const type = $(this).data('swerpg-tooltip');
            const content = SwerpgTooltips.getTooltipContent(type, $(this));
            
            $(this).tooltipster({
                content: content,
                theme: 'swerpg-tooltip',
                side: 'top',
                delay: 500
            });
        });
    }
    
    static getTooltipContent(type, element) {
        switch(type) {
            case 'force-rating':
                return "Évaluation de Force détermine le nombre de dés de Force lancés pour les pouvoirs";
            case 'morality':
                return "Échelle de 1-100 représentant l'alignement moral du personnage";
            // ... autres types
        }
    }
}
```

## 6. Évolutivité

### 6.1 Architecture Extensible

**Exigence** : Système conçu pour supporter de futurs ajouts de contenu Star Wars.

**Points d'extension** :

- Nouvelles espèces via modules de données
- Carrières et spécialisations additionnelles
- Pouvoirs de Force personnalisés
- Équipement et véhicules étendus
- Règles de campagne spécialisées

```javascript
// API d'extension pour modules tiers
class SwerpgExtensionAPI {
    static registerSpecies(speciesData) {
        SwerpgSpecies.register(speciesData);
    }
    
    static registerCareer(careerData) {
        SwerpgCareer.register(careerData);
    }
    
    static registerForcePower(powerData) {
        SwerpgForcePowers.register(powerData);
    }
}

// Export pour modules externes
window.SwerpgAPI = SwerpgExtensionAPI;
```

### 6.2 Versioning et Migration

**Exigence** : Gestion des versions et migration automatique des données.

**Stratégie de versioning** :

- Semantic Versioning (SemVer)
- Migration automatique pour changements de schéma
- Backup automatique avant migration majeure
- Rollback possible en cas de problème

```javascript
class SwerpgMigration {
    static async migrateToVersion(targetVersion) {
        const currentVersion = game.settings.get("swerpg", "version");
        const migrations = this.getMigrationPath(currentVersion, targetVersion);
        
        for (const migration of migrations) {
            await this.runMigration(migration);
        }
        
        await game.settings.set("swerpg", "version", targetVersion);
    }
}
```

## 7. Monitoring et Observabilité

### 7.1 Métriques de Performance

**Exigence** : Collecte de métriques pour optimisation continue.

**Métriques clés** :

- Temps de chargement des différents composants
- Fréquence d'utilisation des fonctionnalités
- Erreurs JavaScript et leurs contextes
- Performance des calculs de dés
- Utilisation mémoire et CPU

### 7.2 Logging et Debug

**Exigence** : Système de logging structuré pour le débogage.

```javascript
class SwerpgLogger {
    static log(level, message, context = {}) {
        if (game.settings.get("swerpg", "debugMode")) {
            console[level](`[SWERPG] ${message}`, context);
        }
        
        // Envoi vers service de monitoring si configuré
        if (game.settings.get("swerpg", "telemetryEnabled")) {
            this.sendTelemetry(level, message, context);
        }
    }
}
```

---

## Conclusion

Ces exigences non-fonctionnelles garantissent que le système Star Wars Edge RPG pour Foundry VTT offre une expérience de qualité professionnelle, performante et maintenable à long terme. L'accent est mis sur l'optimisation des mécaniques spécifiques à Star Wars tout en maintenant les standards de qualité attendus d'un système moderne.