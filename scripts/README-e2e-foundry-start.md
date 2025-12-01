# Script Foundry E2E – Démarrage Docker propre

Ce script permet de démarrer une instance **Foundry VTT** locale, spécialement pour les tests **Playwright E2E** du système **Swerpg**, avec un répertoire de données éphémère pour éviter de polluer votre disque.

## Fichier

- `scripts/e2e-foundry-start.sh`

## Prérequis

- **Docker** installé
- **Licence Foundry VTT** valide
- Fichier `.env.e2e.local` avec vos variables (recommandé) ou variables d'environnement exportées

## Chargement automatique des variables

Le script charge **automatiquement** le fichier `.env.e2e.local` s'il existe à la racine du projet. Vous n'avez donc plus besoin de faire `source .env.e2e.local` manuellement avant de lancer le script.

Pour désactiver ce comportement et utiliser uniquement les variables d'environnement exportées:

```bash
SKIP_ENV_FILE=1 pnpm foundry:e2e:start
```

## Variables d'environnement

- `FOUNDRY_IMAGE` (défaut: `felddy/foundryvtt:13.351.0`)
- `FOUNDRY_PORT` (défaut: `30000`)
- `FOUNDRY_INTERNAL_PORT` (défaut: `30000`)
- `FOUNDRY_CONTAINER_NAME` (défaut: `foundry-e2e-local`)
- `FOUNDRY_LICENSE_KEY` (**requis**)
- `FOUNDRY_USERNAME` (défaut: `herveDarritchon`)
- `FOUNDRY_PASSWORD` (défaut: `2BZUKy3JgbnX2ai`)
- `FOUNDRY_ADMIN_KEY` (défaut: `admin`)
- `SYSTEM_ID` (défaut: `swerpg`)
- `KEEP_DATA` (`0` par défaut: nettoie `./.e2e-foundry-data` à l'arrêt; mettre `1` pour conserver)
- `SKIP_ENV_FILE` (`0` par défaut: charge `.env.e2e.local`; mettre `1` pour ignorer)

## Usage

Lancer via PNPM (charge automatiquement `.env.e2e.local`):

```bash
pnpm foundry:e2e:start
```

Arrêter et nettoyer:

```bash
pnpm foundry:e2e:stop
```

Redémarrer:

```bash
pnpm foundry:e2e:restart
```

Le script:
- Charge automatiquement `.env.e2e.local` s'il existe
- Monte `./.e2e-foundry-data` comme `/data` (créé et supprimé automatiquement à l'arrêt)
- Monte le système courant dans `/data/Data/systems/swerpg`
- Expose l'instance sur `http://localhost:FOUNDRY_PORT`

## Intégration avec Playwright E2E

Configurer `.env.e2e.local` (ignoré par Git):

```dotenv
E2E_FOUNDRY_BASE_URL=http://localhost:30000
E2E_FOUNDRY_ADMIN_PASSWORD='admin'
E2E_FOUNDRY_USERNAME=Gamemaster
E2E_FOUNDRY_PASSWORD=changeme
E2E_FOUNDRY_WORLD=Swerpg-E2E-World
```

Démarrez Foundry puis lancez les tests:

```bash
pnpm e2e:headed e2e/specs/bootstrap.spec.ts
```

## Notes de sécurité

- Ne commitez jamais votre `FOUNDRY_LICENSE_KEY` ni vos mots de passe.
- Utilisez des fichiers `.env` locaux ou des gestionnaires de secrets pour les fournir au script.

## Nettoyage

Par défaut, `./.e2e-foundry-data` est supprimé lors de `pnpm foundry:e2e:stop`. Pour conserver les données (diagnostics), lancez:

```bash
KEEP_DATA=1 pnpm foundry:e2e:stop
```
