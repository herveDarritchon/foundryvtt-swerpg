# Scénarios de Déploiement - Système Crucible

## Introduction

Ce document décrit les différents scénarios de déploiement du système Crucible, de l'installation au déploiement en production.

## 1. Installation Standard (Utilisateur Final)

### Prérequis

- Foundry VTT v13.347+ installé
- Connexion internet pour télécharger le système
- Navigateur moderne (Chrome, Firefox, Safari dernières versions)

### Procédure

1. **Depuis l'interface Foundry VTT** :
   - Aller dans "Game Systems"
   - Cliquer sur "Install System"
   - Chercher "Crucible"
   - Cliquer sur "Install"

2. **Via Manifest URL** :
   - URL du manifeste : `https://foundryvtt.com/packages/crucible`
   - Coller dans le champ "Manifest URL"
   - Installer

3. **Première utilisation** :
   - Créer un nouveau monde
   - Sélectionner "Crucible" comme système
   - Lancer le monde

### Vérification

- Le système apparaît dans la liste des systèmes installés
- Version affichée : 0.8.1
- Aucune erreur dans la console

## 2. Installation Développeur (Environnement Local)

### Prérequis

- Foundry VTT v13+ installé
- Node.js 18+ et npm
- Git
- Éditeur de code (VS Code recommandé)

### Procédure

```bash
# 1. Naviguer vers le dossier des systèmes Foundry
cd {FOUNDRY_VTT_DATA_DIR}/systems

# 2. Cloner le repository
git clone https://github.com/foundryvtt/crucible.git

# 3. Entrer dans le dossier
cd crucible

# 4. Installer les dépendances
npm install

# 5. Build initial
npm run build
```

### Structure après installation

```
crucible/
├── build.mjs
├── crucible.mjs
├── gulpfile.js
├── LICENSE
├── package.json
├── README.md
├── rollup.config.mjs
├── system.json
├── _source/          # YAML sources
├── assets/
├── audio/
├── fonts/
├── icons/
├── lang/
├── module/           # Code source
├── node_modules/     # Dépendances npm
├── packs/            # LevelDB compendia
├── styles/           # LESS/CSS
├── templates/        # Handlebars
└── ui/
```

### Vérification

```bash
# Vérifier la compilation
npm run build

# Vérifier qu'aucune erreur n'apparaît
# Le système devrait être visible dans Foundry
```

## 3. Workflow de Développement

### Modification du Code

```bash
# 1. Créer une branche
git checkout -b feature/ma-fonctionnalite

# 2. Modifier le code dans module/

# 3. Compiler (si modifications CSS/JS)
npm run rollup  # Rollup JS
npm run less    # Compile LESS vers CSS

# 4. Tester dans Foundry
# Relancer le monde pour voir les changements
```

### Modification du Contenu

```bash
# 1. Extraire les compendia en YAML
npm run extract

# 2. Modifier les fichiers dans _source/
# Exemple: _source/talent/MonTalent.yml

# 3. Recompiler en LevelDB
npm run compile

# 4. Recharger Foundry
# Les changements sont visibles dans les compendia
```

### Build Complet

```bash
# Build complet (compile + rollup + less)
npm run build
```

### Tests

1. **Tests manuels** :
   - Créer un héros dans le monde de test
   - Tester la fonctionnalité modifiée
   - Vérifier les messages d'erreur dans la console

2. **Tests de régression** :
   - Utiliser le compendium `crucible.playtest`
   - Vérifier que les fonctionnalités existantes fonctionnent toujours

## 4. Déploiement vers GitHub

### Prérequis

- Accès au repository GitHub
- Changements testés localement
- Version bumped si nécessaire

### Procédure

```bash
# 1. Vérifier le statut
git status

# 2. Ajouter les fichiers modifiés
git add .

# 3. Commit avec message descriptif
git commit -m "feat: ajout de [fonctionnalité]"

# 4. Push vers GitHub
git push origin feature/ma-fonctionnalite

# 5. Créer une Pull Request sur GitHub
# Attendre review et approbation
```

### Convention de Commit

- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation
- `refactor:` - Refactoring
- `test:` - Tests
- `chore:` - Tâches de maintenance

## 5. Release (Publication)

### Prérequis

- Droits de publication (équipe interne uniquement)
- Version testée et validée
- CHANGELOG mis à jour (si maintenu)

### Procédure

1. **Mise à jour de version** :

```bash
# Dans system.json
{
  "version": "0.9.0",  # Bump version
  ...
}
```

2. **Build final** :

```bash
npm run build
```

3. **Commit et tag** :

```bash
git add system.json
git commit -m "chore: bump version to 0.9.0"
git tag v0.9.0
git push origin main
git push origin v0.9.0
```

4. **Publication** :
   - GitHub Release créée automatiquement ou manuellement
   - Package disponible via Foundry VTT Package Browser

### Versioning Sémantique

- **MAJOR** (x.0.0) : Changements incompatibles, breaking changes
- **MINOR** (0.x.0) : Nouvelles fonctionnalités, compatibles
- **PATCH** (0.0.x) : Corrections de bugs

## 6. Installation depuis GitHub Release

### Utilisateur Avancé

```bash
# 1. Télécharger le .zip de la release
# https://github.com/foundryvtt/crucible/releases

# 2. Extraire dans le dossier systems
cd {FOUNDRY_VTT_DATA_DIR}/systems
unzip crucible-v0.8.1.zip

# 3. Renommer le dossier si nécessaire
mv crucible-v0.8.1 crucible

# 4. Relancer Foundry
```

## 7. Mise à Jour du Système

### Utilisateur Final (via Foundry)

1. Aller dans "Game Systems"
2. Cliquer sur "Update" à côté de Crucible
3. Confirmer la mise à jour
4. Relancer les mondes utilisant Crucible

### Développeur (via Git)

```bash
cd {FOUNDRY_VTT_DATA_DIR}/systems/crucible

# 1. Fetch les changements
git fetch origin

# 2. Merge ou rebase
git pull origin main

# 3. Réinstaller les dépendances si nécessaire
npm install

# 4. Rebuild
npm run build
```

## 8. Migration de Données

### Lors de Mise à Jour Majeure

Si la structure de données change :

1. **Backup** : Sauvegarder le monde avant mise à jour
2. **Migration automatique** : Le système exécute les scripts de migration
3. **Vérification** : Vérifier que les données sont correctes
4. **Rollback** : Restaurer le backup si problème

### Exemple de Migration

```javascript
// Dans module/documents/actor.mjs
async _preCreate(data, options, user) {
  // Migration de v0.7 vers v0.8
  if (data.system?.schema?.version < 2) {
    await this.#migrateToV2(data);
  }
  return super._preCreate(data, options, user);
}
```

## 9. Configuration Serveur (Auto-hébergement)

### Foundry VTT sur Serveur Linux

```bash
# 1. Installer Foundry VTT sur le serveur
# Suivre la documentation officielle

# 2. Installer Crucible
cd {FOUNDRY_DATA}/Data/systems
git clone https://github.com/foundryvtt/crucible.git
cd crucible
npm install
npm run build

# 3. Configurer les permissions
chown -R foundry:foundry crucible

# 4. Démarrer Foundry
systemctl start foundryvtt
```

### Docker (optionnel)

```dockerfile
# Exemple de Dockerfile pour Foundry + Crucible
FROM felddy/foundryvtt:release

# Installer Node.js
RUN apk add --no-cache nodejs npm git

# Cloner et build Crucible
WORKDIR /data/Data/systems
RUN git clone https://github.com/foundryvtt/crucible.git
WORKDIR /data/Data/systems/crucible
RUN npm install && npm run build

# Retour au dossier Foundry
WORKDIR /data
```

## 10. Environnements Multiples

### Développement

- Code source éditable
- Hot reload (via Foundry)
- Logs verbeux (`crucible.developmentMode = true`)
- Données de test

### Staging

- Build de production
- Tests d'intégration
- Données proche de production
- Validation finale

### Production

- Build optimisé
- Logs minimaux
- Données de partie réelles
- Performance optimale

## 11. Rollback et Récupération

### Rollback vers Version Précédente

**Via Git (développeur)** :

```bash
cd {FOUNDRY_VTT_DATA_DIR}/systems/crucible

# Lister les tags
git tag -l

# Revenir à une version précédente
git checkout v0.7.5

# Rebuild
npm run build
```

**Via Foundry (utilisateur)** :

1. Désinstaller la version actuelle
2. Installer la version précédente via manifest URL avec version spécifique

### Récupération de Données

1. **Restaurer backup de monde** :
   - Foundry VTT : utiliser la fonction de restauration de backup
   - Manuel : copier le dossier du monde sauvegardé

2. **Export/Import d'acteurs** :
   - Exporter les acteurs en JSON
   - Importer dans un nouveau monde

## 12. Monitoring et Diagnostics

### Logs

**Console du navigateur** :

- F12 → Console
- Filtrer par "Crucible" ou "crucible"
- Vérifier erreurs et warnings

**Logs Foundry** :

```bash
# Linux/Mac
tail -f {FOUNDRY_DATA}/Logs/foundry.log

# Filtrer pour Crucible
grep -i crucible {FOUNDRY_DATA}/Logs/foundry.log
```

### Diagnostics

```javascript
// Dans la console Foundry
game.system.id
// "crucible"

game.system.version
// "0.8.1"

crucible.developmentMode
// true ou false

crucible.vfxEnabled
// true si foundryvtt-vfx actif

// Vérifier l'API
crucible.api
// Doit afficher l'objet API
```

## 13. Dépannage Courant

### Le système ne s'affiche pas

**Causes possibles** :

- Version Foundry < 13.347
- Installation incomplète
- Fichiers manquants

**Solution** :

```bash
cd {FOUNDRY_VTT_DATA_DIR}/systems/crucible
npm run build
# Relancer Foundry
```

### Erreurs de compilation

**Cause** : Dépendances manquantes

**Solution** :

```bash
rm -rf node_modules
npm install
npm run build
```

### Contenu manquant dans compendia

**Cause** : LevelDB pas compilé

**Solution** :

```bash
npm run compile
# Relancer Foundry
```

### Performance dégradée

**Causes possibles** :

- Trop d'acteurs/items
- Modules conflictuels
- Navigateur surchargé

**Solutions** :

- Désactiver modules non essentiels
- Vider le cache du navigateur
- Utiliser un navigateur moderne

## 14. Sécurité

### Permissions Fichiers

```bash
# Linux: s'assurer que Foundry peut lire/écrire
chown -R foundry:foundry {FOUNDRY_VTT_DATA_DIR}/systems/crucible
chmod -R 755 {FOUNDRY_VTT_DATA_DIR}/systems/crucible
```

### Accès Repository

- Repository public en lecture
- Contributions : via Pull Request
- Merge : équipe interne uniquement

### Modules Tiers

- Tester la compatibilité avant activation
- Désactiver en cas de conflit
- Signaler les incompatibilités

## 15. Best Practices

### Développement

- ✅ Toujours tester localement avant push
- ✅ Utiliser des branches de feature
- ✅ Écrire des messages de commit descriptifs
- ✅ Compiler avant de tester
- ✅ Vérifier la console pour erreurs

### Production

- ✅ Backup du monde avant mise à jour
- ✅ Lire le CHANGELOG (si disponible)
- ✅ Tester dans un monde de staging d'abord
- ✅ Ne pas modifier directement les packs binaires
- ✅ Utiliser les outils de build fournis

### Maintenance

- ✅ Garder Node.js et npm à jour
- ✅ Nettoyer node_modules périodiquement
- ✅ Recompiler après chaque pull
- ✅ Documenter les changements de configuration

## Conclusion

Ce document couvre les principaux scénarios de déploiement du système Crucible, de l'installation de base au déploiement en production. Suivez les procédures appropriées à votre rôle (utilisateur, développeur, administrateur système) pour garantir une installation et utilisation optimales.

---

**Dernière Mise à Jour** : 2025-11-04  
**Version du système** : 0.8.1
