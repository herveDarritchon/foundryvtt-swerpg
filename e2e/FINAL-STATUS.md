# Correction finale - Authentification admin Foundry pour tests E2E

## Problèmes corrigés

### 1. ✅ Import dotenv incorrect
**Fichier** : `playwright.config.ts`
**Erreur** : `import {dotenv} from 'dotenv'` (named import)
**Correction** : `import dotenv from 'dotenv'` (default import)

### 2. ✅ Détection et saisie du mot de passe administrateur
**Fichier** : `e2e/utils/foundrySession.ts`
**Amélioration** : 
- Utilisation de `page.locator('input[name="adminPassword"], input[type="password"]')` pour être plus flexible
- Ajout de `waitForLoadState('networkidle')` après le clic sur le bouton LOGIN
- Ajout de délais (`waitForTimeout`) pour laisser Foundry charger complètement

### 3. ✅ Robustesse de loginAndEnterWorld
**Fichier** : `e2e/utils/foundrySession.ts`
**Amélioration** :
- Ajout de `waitFor({ state: 'visible' })` avant chaque clic
- Attente explicite de `networkidle` après gotoSetup
- Timeouts augmentés et mieux gérés

## État actuel

✅ **Test de diagnostic passe** : `diagnostic-admin-auth.spec.ts` valide que :
- L'authentification admin fonctionne
- La page setup apparaît après l'auth
- Les screenshots sont générés correctement

⚠️ **Tests avec fixtures** : `bootstrap.spec.ts` et `oggdude-import.spec.ts` échouent car :
- Le lien "Configuration" n'est pas trouvé après l'authentification admin
- Cela suggère que la page sur laquelle on arrive après l'auth admin n'est pas la page setup attendue

## Fichiers modifiés

1. `playwright.config.ts` - Correction import dotenv
2. `e2e/utils/foundrySession.ts` - Amélioration gestion auth admin et navigation
3. `e2e/specs/diagnostic-admin-auth.spec.ts` - Nouveau test de diagnostic (à supprimer après résolution)

## Prochaines étapes pour investigation

Le test de diagnostic montre que l'authentification fonctionne. Le problème vient probablement de :

1. **La page après auth admin n'est pas celle attendue** - Vérifier les screenshots dans `test-results/`
2. **Le lien "Configuration" a un libellé différent** - Peut-être traduit en français?
3. **La structure de la page setup a changé** - Foundry v13 peut avoir une UI différente

## Commandes pour tester

```bash
# Test de diagnostic qui passe
pnpm e2e:headed e2e/specs/diagnostic-admin-auth.spec.ts

# Tests réels qui échouent
pnpm e2e:headed e2e/specs/bootstrap.spec.ts

# Voir les screenshots d'erreur
open test-results/*/test-failed-1.png

# Voir la trace complète
pnpm exec playwright show-trace test-results/*/trace.zip
```

## Recommandations

1. Ouvrir les screenshots générés pour voir exactement quelle page s'affiche après l'auth admin
2. Vérifier si le lien "Configuration" existe et quel est son libellé exact
3. Ajuster les locators dans `foundrySession.ts` selon ce qui est affiché réellement
4. Une fois résolu, supprimer le test de diagnostic `diagnostic-admin-auth.spec.ts`

