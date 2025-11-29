# Résumé des corrections apportées pour `pnpm e2e:headed`

## Problèmes identifiés et corrigés

### 1. ✅ Résolution d'écran insuffisante
**Problème** : Message d'avertissement Foundry indiquant que la résolution 1280x720 est trop petite.

**Solution** : Configuration du viewport à 1920x1080 dans `playwright.config.ts`
```typescript
use: {
  baseURL,
  viewport: { width: 1920, height: 1080 },
  // ...
}
```

### 2. ✅ Authentification administrateur Foundry
**Problème** : Impossibilité d'accéder au setup sans saisir le mot de passe administrateur.

**Solution** : Gestion automatique de l'authentification admin dans `e2e/utils/foundrySession.ts`
- Détection automatique de la page d'authentification admin
- Saisie du mot de passe admin depuis `E2E_FOUNDRY_ADMIN_PASSWORD`
- Attente du chargement de la page setup après authentification

## Fichiers modifiés

### Configuration
1. **`playwright.config.ts`** - Ajout du viewport 1920x1080
2. **`.env.e2e.example`** - Ajout de `E2E_FOUNDRY_ADMIN_PASSWORD`
3. **`.env.e2e.local`** - Mot de passe admin configuré : `Aotearoa3`

### Code E2E
4. **`e2e/utils/foundrySession.ts`**
   - Interface `FoundrySessionOptions` étendue avec `adminPassword`
   - Fonction `gotoSetup()` mise à jour pour gérer l'auth admin
   - Messages d'erreur améliorés

5. **`e2e/fixtures/index.ts`**
   - Ajout de `adminPassword` dans les options du fixture

### CI/CD
6. **`.github/workflows/test.yml`**
   - Ajout du secret `E2E_FOUNDRY_ADMIN_PASSWORD` dans les variables d'environnement

### Documentation
7. **`e2e/STATUS.md`** - Mise à jour avec les nouvelles étapes
8. **`documentation/tests/playwright-e2e-guide.md`** - Documentation de `E2E_FOUNDRY_ADMIN_PASSWORD`

## Variables d'environnement requises

```env
E2E_FOUNDRY_BASE_URL=http://localhost:30000
E2E_FOUNDRY_ADMIN_PASSWORD=Aotearoa3          # ⬅️ NOUVEAU
E2E_FOUNDRY_USERNAME=gamemaster
E2E_FOUNDRY_PASSWORD=changeme
E2E_FOUNDRY_WORLD=Swerpg-E2E-World
```

## Flux d'authentification E2E

1. Navigation vers `E2E_FOUNDRY_BASE_URL`
2. **[NOUVEAU]** Détection page auth admin → Saisie `E2E_FOUNDRY_ADMIN_PASSWORD`
3. Accès à la page setup Foundry
4. Clic sur "Configuration"
5. Sélection du monde `E2E_FOUNDRY_WORLD`
6. Connexion avec `E2E_FOUNDRY_USERNAME` / `E2E_FOUNDRY_PASSWORD`
7. Chargement du jeu

## Secret GitHub à configurer

Pour la CI, ajoutez le secret suivant dans les paramètres GitHub du repository :

**Nom** : `E2E_FOUNDRY_ADMIN_PASSWORD`  
**Valeur** : `Aotearoa3`

## Commandes de test

```bash
# Mode visible (headed) - pour debug
pnpm e2e:headed

# Mode headless - pour CI
pnpm e2e

# Cibler un navigateur
pnpm e2e -- --project=chromium
pnpm e2e -- --project=firefox

# UI interactive
pnpm exec playwright test --ui
```

## Résultat attendu

- ✅ Aucun message d'avertissement de résolution
- ✅ Authentification admin automatique et transparente
- ✅ Accès direct à la page de setup après auth admin
- ✅ Tests E2E exécutables avec Foundry configuré

## Vérification

Pour vérifier que tout fonctionne :

1. Assurez-vous que Foundry VTT tourne sur `http://localhost:30000`
2. Le mot de passe admin doit être `Aotearoa3`
3. Un monde nommé `Swerpg-E2E-World` doit exister
4. Un utilisateur `gamemaster` / `changeme` doit être configuré dans ce monde
5. Lancez `pnpm e2e:headed`

Les navigateurs devraient s'ouvrir, s'authentifier automatiquement avec le mot de passe admin, accéder au setup, puis se connecter au monde.

