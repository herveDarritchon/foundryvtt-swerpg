# Scénarios de Déploiement - Système Star Wars Edge RPG (SWERPG)

## Introduction

Ce document décrit les différents scénarios de déploiement du système Star Wars Edge RPG, de l'installation utilisateur final au déploiement en environnement serveur, en tenant compte des spécificités de l'univers Star Wars et des mécaniques narratives.

## 1. Installation Standard (Utilisateur Final)

### Prérequis

- Foundry VTT v13.347+ installé
- Connexion internet pour télécharger le système et les compendia
- Navigateur moderne (Chrome 120+, Firefox 120+, Safari 17+, Edge 120+)
- Espace disque : ~500MB (système + compendia complets)
- RAM recommandée : 4GB minimum, 8GB optimal

### Procédure

1. **Depuis l'interface Foundry VTT** :
   - Aller dans "Game Systems"
   - Cliquer sur "Install System"
   - Chercher "Star Wars Edge RPG" ou "SWERPG"
   - Cliquer sur "Install"
   - Attendre le téléchargement des compendia (Species, Careers, Talents, Equipment)

2. **Via Manifest URL** :
   - URL du manifeste : `https://github.com/herveDarritchon/foundryvtt-swerpg/releases/latest/download/system.json`
   - Coller dans le champ "Manifest URL"
   - Installer et attendre la synchronisation

3. **Première utilisation** :
   - Créer un nouveau monde
   - Sélectionner "Star Wars Edge RPG" comme système
   - Choisir la gamme par défaut (Edge of the Empire/Age of Rebellion/Force & Destiny)
   - Configurer les modules recommandés (optionnel)
   - Lancer le monde

### Vérification

- Le système apparaît dans la liste avec l'icône Star Wars
- Version affichée correspond à la dernière release
- Compendia chargés : Species, Careers, Specializations, Talents, Weapons, Armor
- Aucune erreur dans la console navigateur
- Test de création de personnage fonctionnel

```javascript
// Script de vérification automatique
const verifyInstallation = async () => {
    const requiredPacks = [
        "swerpg.species", "swerpg.careers", "swerpg.specializations",
        "swerpg.talents", "swerpg.weapons", "swerpg.armor"
    ];
    
    for (const packId of requiredPacks) {
        const pack = game.packs.get(packId);
        if (!pack) {
            ui.notifications.error(`Compendium manquant: ${packId}`);
            return false;
        }
    }
    
    ui.notifications.info("Installation SWERPG vérifiée avec succès!");
    return true;
};
```

## 2. Installation Développeur (Environnement Local)

### Prérequis Développeur

- Foundry VTT v13+ installé en mode développeur
- Node.js 18+ et pnpm
- Git
- Éditeur de code (VS Code recommandé avec extensions ES6)
- Docker (optionnel, pour tests d'environnement)

### Procédure Développeur

```bash
# 1. Cloner le repository
git clone https://github.com/herveDarritchon/foundryvtt-swerpg.git
cd foundryvtt-swerpg

# 2. Installer les dépendances
pnpm install

# 3. Créer le lien symbolique vers Foundry
# Remplacer [PATH] par le chemin vers votre dossier Data/systems
ln -s $(pwd) "/Users/[USER]/Library/Application Support/FoundryVTT/Data/systems/swerpg"

# 4. Build initial
pnpm run build

# 5. Extraire les compendia pour édition
pnpm run extract

# 6. Lancer en mode watch pour développement
pnpm run dev
```

### Configuration de Développement

```json
// .vscode/settings.json
{
    "javascript.preferences.importModuleSpecifier": "relative",
    "typescript.preferences.importModuleSpecifier": "relative",
    "emmet.includeLanguages": {
        "handlebars": "html"
    },
    "files.associations": {
        "*.hbs": "handlebars",
        "*.mjs": "javascript"
    }
}
```

### Scripts de Développement

```json
// package.json - scripts principaux
{
    "scripts": {
        "build": "rollup -c && npm run less",
        "dev": "concurrently \"rollup -c -w\" \"npm run less:watch\"",
        "less": "lessc styles/swerpg.less styles/swerpg.css",
        "less:watch": "nodemon --watch styles --ext less --exec \"npm run less\"",
        "extract": "fvtt package unpack --in packs --out _source",
        "compile": "fvtt package pack --in _source --out packs",
        "test": "vitest",
        "test:coverage": "vitest --coverage",
        "lint": "eslint . --ext .mjs,.js",
        "lint:fix": "eslint . --ext .mjs,.js --fix"
    }
}
```

## 3. Déploiement Serveur (Hosting Provider)

### 3.1 Forge Foundry

**Configuration recommandée** :

- Instance : Medium (2GB RAM, 2 vCPU)
- Stockage : 10GB minimum
- Région : Selon localisation des joueurs
- Modules : Selon besoins de la campagne

**Procédure** :

1. Créer une nouvelle instance Foundry
2. Installer SWERPG via l'interface système
3. Configurer les paramètres de jeu :
   - Gamme par défaut (EotE/AoR/F&D)
   - Niveau de complexité des règles
   - Modules de qualité de vie
4. Créer le monde de campagne
5. Inviter les joueurs

### 3.2 Serveur Dédié

**Spécifications minimales** :

- OS : Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- CPU : 4 cores, 2.5GHz+
- RAM : 8GB minimum, 16GB recommandé
- Stockage : SSD 50GB minimum
- Réseau : 100Mbps+ upload/download

**Installation Docker** :

```dockerfile
# Dockerfile pour SWERPG
FROM foundryvtt/foundry:11.315

# Variables d'environnement
ENV FOUNDRY_MINIFY_STATIC_FILES=true
ENV FOUNDRY_HOSTNAME=0.0.0.0
ENV FOUNDRY_PORT=30000

# Copier les données de système pré-configurées
COPY --chown=foundry:foundry ./systems/swerpg /data/Data/systems/swerpg
COPY --chown=foundry:foundry ./worlds/star-wars-campaign /data/Data/worlds/star-wars-campaign

# Configuration SSL (si applicable)
COPY --chown=foundry:foundry ./certs /data/certs

EXPOSE 30000

CMD ["node", "resources/app/main.js", "--dataPath=/data/Data", "--port=30000", "--hostname=0.0.0.0"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  swerpg-foundry:
    build: .
    ports:
      - "30000:30000"
    volumes:
      - foundry-data:/data/Data
      - ./backups:/data/backups
    environment:
      - FOUNDRY_ADMIN_KEY=${FOUNDRY_ADMIN_KEY}
      - FOUNDRY_LICENSE_KEY=${FOUNDRY_LICENSE_KEY}
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - swerpg-foundry
    restart: unless-stopped

volumes:
  foundry-data:
```

## 4. Configuration Avancée

### 4.1 Optimisation Performance

**Paramètres Foundry pour SWERPG** :

```javascript
// world.json - configuration optimisée
{
    "coreVersion": "13.347",
    "system": "swerpg",
    "systemVersion": "1.0.0",
    "settings": {
        "swerpg.dicePoolCache": true,
        "swerpg.talentTreeOptimization": true,
        "swerpg.forceAnimations": false,
        "swerpg.compendiumPreload": "essential"
    }
}
```

**Configuration serveur** :

```nginx
# nginx.conf - optimisé pour Foundry VTT + SWERPG
server {
    listen 443 ssl http2;
    server_name your-star-wars-game.com;
    
    # Certificats SSL
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    
    # Optimisations pour assets SWERPG
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
    }
    
    # WebSocket pour Foundry
    location /socket.io/ {
        proxy_pass http://localhost:30000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Application principale
    location / {
        proxy_pass http://localhost:30000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 Sauvegardes et Maintenance

**Script de sauvegarde automatique** :

```bash
#!/bin/bash
# backup-swerpg.sh

BACKUP_DIR="/var/backups/foundry-swerpg"
FOUNDRY_DATA="/opt/foundry/Data"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le dossier de sauvegarde
mkdir -p "$BACKUP_DIR"

# Arrêter Foundry temporairement
systemctl stop foundry

# Sauvegarde complète
tar -czf "$BACKUP_DIR/swerpg-backup-$DATE.tar.gz" \
    "$FOUNDRY_DATA/worlds" \
    "$FOUNDRY_DATA/systems/swerpg" \
    "$FOUNDRY_DATA/Config"

# Redémarrer Foundry
systemctl start foundry

# Nettoyer les anciennes sauvegardes (garder 7 jours)
find "$BACKUP_DIR" -name "swerpg-backup-*.tar.gz" -mtime +7 -delete

echo "Sauvegarde SWERPG terminée: swerpg-backup-$DATE.tar.gz"
```

### 4.3 Monitoring et Logs

**Configuration de monitoring** :

```javascript
// Monitoring spécialisé pour SWERPG
class SwerpgMonitoring {
    static init() {
        // Métriques de performance
        this.trackDiceRollPerformance();
        this.trackTalentTreeLoading();
        this.trackForceCalculations();
        
        // Métriques d'usage
        this.trackPlayerActions();
        this.trackSystemErrors();
    }
    
    static trackDiceRollPerformance() {
        Hooks.on("swerpg.diceRolled", (roll, duration) => {
            if (duration > 1000) {
                console.warn(`Jet de dés lent détecté: ${duration}ms`);
            }
        });
    }
}
```

## 5. Déploiement en Équipe

### 5.1 Workflow Git pour Campagnes

```bash
# Structure de branches recommandée
main                    # Version stable de la campagne
├── development        # Intégration des nouvelles fonctionnalités
├── feature/new-species # Ajout d'espèces personnalisées
├── feature/custom-talents # Talents de campagne
└── hotfix/critical-bug # Corrections urgentes

# Workflow de contribution
git checkout development
git pull origin development
git checkout -b feature/mon-ajout
# Faire les modifications
git add .
git commit -m "Ajout: nouvelle espèce Zabrak personnalisée"
git push origin feature/mon-ajout
# Créer une Pull Request
```

### 5.2 Synchronisation Multi-GM

**Configuration pour plusieurs MJ** :

```javascript
// sync-config.js - Configuration de synchronisation
const syncConfig = {
    sharedElements: [
        "compendia.species",
        "compendia.talents", 
        "compendia.equipment",
        "world.npcs",
        "world.locations"
    ],
    gmSpecific: [
        "world.plots",
        "world.secret-npcs",
        "journal.gm-notes"
    ],
    syncInterval: 300000, // 5 minutes
    conflictResolution: "timestamp" // ou "manual"
};
```

## 6. Résolution de Problèmes

### 6.1 Problèmes Courants

**1. Compendia non chargés** :

```javascript
// Script de diagnostic
async function diagnosePacks() {
    const requiredPacks = ["swerpg.species", "swerpg.careers", "swerpg.talents"];
    const results = {};
    
    for (const packId of requiredPacks) {
        const pack = game.packs.get(packId);
        results[packId] = {
            exists: !!pack,
            loaded: pack?.loaded,
            size: pack?.index?.size || 0
        };
    }
    
    console.table(results);
    return results;
}
```

**2. Performance dégradée** :

- Vérifier la cache des talents : `game.swerpg.cache.talents.size`
- Contrôler les modules conflictuels
- Valider la configuration de serveur

**3. Désynchronisation des données** :

```bash
# Réinitialisation complète
rm -rf Data/systems/swerpg
git clone --depth 1 https://github.com/herveDarritchon/foundryvtt-swerpg.git Data/systems/swerpg
```

### 6.2 Support et Communauté

**Ressources de support** :

- **Documentation** : [GitHub Wiki](https://github.com/herveDarritchon/foundryvtt-swerpg/wiki)
- **Issues** : [GitHub Issues](https://github.com/herveDarritchon/foundryvtt-swerpg/issues)
- **Discord** : Canal #swerpg sur le serveur Foundry VTT FR
- **Forum** : Section Star Wars sur Foundry VTT Community

**Processus de support** :

1. Consulter la documentation et FAQ
2. Rechercher dans les issues existantes
3. Créer un rapport de bug détaillé avec :
   - Version de Foundry VTT
   - Version de SWERPG
   - Modules actifs
   - Logs d'erreur
   - Étapes de reproduction

---

## Conclusion

Ce guide de déploiement couvre tous les scénarios d'installation et de configuration du système Star Wars Edge RPG pour Foundry VTT, depuis l'installation simple pour joueurs occasionnels jusqu'aux déploiements serveur complexes. L'accent est mis sur la fiabilité, la performance et la facilité de maintenance pour permettre aux groupes de se concentrer sur leurs aventures dans la galaxie lointaine, très lointaine.