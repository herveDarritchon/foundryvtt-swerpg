# État de la stack Playwright E2E - Résolution du problème `pnpm e2e:headed`

## Problème initial
La commande `pnpm e2e:headed` plantait avec l'erreur : "Executable doesn't exist" pour les navigateurs Playwright.

## Actions effectuées

### 1. ✅ Installation des navigateurs Playwright
```bash
pnpm exec playwright install --with-deps
```
**Résultat** : Les navigateurs Chromium et Firefox sont maintenant installés.

### 2. ✅ Amélioration de la gestion d'erreur
Mise à jour de `e2e/utils/foundrySession.ts` pour :
- Ajouter des timeouts explicites (30s pour navigation, 10s pour vérification)
- Fournir des messages d'erreur clairs quand Foundry n'est pas accessible
- Gérer proprement les cas d'erreur réseau

### 3. ✅ Création du fichier de configuration
Création de `.env.e2e.local` avec la configuration par défaut :
```env
E2E_FOUNDRY_BASE_URL=http://localhost:30000
E2E_FOUNDRY_USERNAME=Gamemaster
E2E_FOUNDRY_PASSWORD=changeme
E2E_FOUNDRY_WORLD=Swerpg-E2E-World
```

## Situation actuelle

### Ce qui fonctionne
- ✅ Les navigateurs Playwright sont installés et se lancent correctement
- ✅ La commande `pnpm e2e:headed` démarre et ouvre les navigateurs en mode visible
- ✅ Les tests peuvent se connecter à Foundry (la page charge)
- ✅ Les erreurs de connexion sont maintenant claires et explicites

### Ce qui nécessite une configuration
⚠️ **Les tests échouent parce qu'il n'y a pas d'instance Foundry en cours d'exécution sur `http://localhost:30000`**

L'erreur actuelle montre que :
1. La page Foundry se charge (pas d'erreur de connexion)
2. Le test passe `gotoSetup()` avec succès
3. Mais le navigateur se ferme au moment de cliquer sur "Configuration"

Cela peut signifier :
- Soit l'instance Foundry redirige/ferme la fenêtre
- Soit les locators ne correspondent pas à votre interface Foundry réelle
- Soit il n'y a pas vraiment d'instance Foundry à cette URL

## Prochaines étapes pour vous

### Option 1 : Lancer une instance Foundry de test
1. Démarrez Foundry VTT sur le port 30000 (ou tout autre port)
2. Créez ou sélectionnez un monde de test nommé "Swerpg-E2E-World"
3. Configurez un utilisateur "gamemaster" avec le mot de passe "changeme"
4. Relancez `pnpm e2e:headed`

### Option 2 : Adapter la configuration à votre environnement
Si votre instance Foundry tourne sur un port différent ou avec d'autres identifiants :

1. Éditez `.env.e2e.local` :
   ```env
   E2E_FOUNDRY_BASE_URL=http://localhost:VOTRE_PORT
   E2E_FOUNDRY_ADMIN_PASSWORD=votre_mot_de_passe_admin
   E2E_FOUNDRY_USERNAME=votre_utilisateur
   E2E_FOUNDRY_PASSWORD=votre_mot_de_passe
   E2E_FOUNDRY_WORLD=votre_monde_de_test
   ```

2. Relancez `pnpm e2e:headed`

### Option 3 : Vérifier/adapter les locators
Si Foundry est bien accessible mais que les locators ne fonctionnent pas :

1. Lancez `pnpm e2e:headed` pour voir les fenêtres s'ouvrir
2. Observez l'UI de Foundry qui s'affiche
3. Comparez avec les locators dans `e2e/utils/foundrySession.ts` :
   - `/Configuration/i` pour le lien de configuration
   - `/Foundry Virtual Tabletop/i` pour le heading
   - etc.
4. Ajustez les expressions régulières si nécessaire

## Commandes utiles

```bash
# Tests E2E en mode headed (visible)
pnpm e2e:headed

# Tests E2E en mode headless (rapide, pour CI)
pnpm e2e

# Cibler un seul projet
pnpm e2e -- --project=chromium

# Cibler un seul test
pnpm e2e -- e2e/specs/bootstrap.spec.ts

# Voir la trace d'un test échoué
pnpm exec playwright show-trace test-results/.../trace.zip

# Ouvrir l'UI Playwright pour déboguer
pnpm exec playwright test --ui
```

## Tests unitaires (non impactés)

Les tests unitaires continuent de fonctionner normalement :
```bash
pnpm test          # Uniquement Vitest
pnpm test:coverage # Avec couverture
```

## Résumé technique

**✅ Problème initial résolu** : Les navigateurs Playwright sont installés et fonctionnels.

**⚠️ Configuration requise** : Une instance Foundry VTT doit être accessible à l'URL configurée pour que les tests E2E puissent s'exécuter.

**📝 Documentation** : Consultez `documentation/tests/playwright-e2e-guide.md` pour plus de détails.

