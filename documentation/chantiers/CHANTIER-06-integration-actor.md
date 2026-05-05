# Chantier 06 : Intégration dans actor.mjs

## Objectif
Modifier `actor.mjs` pour utiliser le `CombatMixin` composé et supprimer les méthodes extraites.

## Fichiers modifiés

- `module/documents/actor.mjs` - Modification principale

## Étapes d'implémentation

### 1. Importer le CombatMixin

En haut de `actor.mjs`, ajouter l'import :

```javascript
import { CombatMixin } from './actor-mixins/combat/index.mjs'
```

### 2. Modifier la déclaration de classe

**Avant :**
```javascript
export default class SwerpgActor extends Actor {
  // ... 2302 lignes
}
```

**Après :**
```javascript
export default class SwerpgActor extends CombatMixin(Actor) {
  // ... classe allégée
}
```

### 3. Supprimer les méthodes extraites

Supprimer les méthodes suivantes de `actor.mjs` (~300 lignes) :

**Actions de combat :**
- `useAction()` (lignes 878-882)
- `weaponAttack()` (lignes 955-995)
- `skillAttack()` (lignes 907-944)
- `castSpell()` (à créer, voir chantier 02)
- `applyTargetBoons()` (lignes 716-740)

**Défense et résistances :**
- `testDefense()` (lignes 827-868)
- `getResistance()` (lignes 750-764)

**Gestion des tours :**
- `onStartTurn()` (lignes 1281-1308)
- `onEndTurn()` (lignes 1317-1336)
- `onLeaveCombat()` (lignes 1344-1351)
- `delay()` (lignes 1005-1028)

**Effets de combat :**
- `applyActionOutcome()` (lignes 1181-1201)
- `_applyOutcomeEffects()` (anciennement `#applyOutcomeEffects`, lignes 1211-1235)
- `_trackHeroismDamage()` (anciennement `#trackHeroismDamage`, lignes 1244-1252)
- `onDealDamage()` (lignes 1261-1269)
- `applyDamageOverTime()` (lignes 1361-1377)
- `expireEffects()` (lignes 1386-1392)
- `_isEffectExpired()` (anciennement `#isEffectExpired`, lignes 1402-1417)

### 4. Vérifier les méthodes restantes

Les méthodes qui restent dans `actor.mjs` et qui sont appelées par les mixins :
- `callActorHooks()` - Doit rester dans actor.mjs
- `alterResources()` - Doit rester dans actor.mjs
- `reset()` - Hérité de Actor, pas besoin de l'extraire

### 5. Vérifier les imports dans actor.mjs

Après suppression des méthodes, certains imports peuvent devenir inutiles :

**Imports à vérifier :**
- `AttackRoll` from `'../dice/attack-roll.mjs'` - Maintenant utilisé dans `attack.mixin.mjs`
- `SwerpgAction` from `'./action.mjs'` - Maintenant utilisé dans `attack.mixin.mjs`
- `SYSTEM` from `'../config/system.mjs'` - Maintenant utilisé dans `effects.mixin.mjs`
- `logger` from `'../utils/logger.mjs'` - Maintenant utilisé dans `attack.mixin.mjs`

Ces imports peuvent être supprimés de `actor.mjs` s'ils ne sont plus utilisés ailleurs dans le fichier.

## Exemple de actor.mjs après modification

```javascript
import { CombatMixin } from './actor-mixins/combat/index.mjs'
// Autres imports (talents, equipment, etc.)

export default class SwerpgActor extends CombatMixin(Actor) {
  
  // ... constructeur, prepareData, etc.
  
  // Méthodes qui restent :
  // - callActorHooks()
  // - alterResources()
  // - prepareEmbeddedDocuments()
  // - etc.
  
  // Les méthodes de combat sont maintenant dans les mixins
}
```

## Points de vérification

### 1. Compilation/Syntaxe
```bash
node --check module/documents/actor.mjs
```

### 2. Lint
```bash
npm run lint
```

### 3. Test de chargement Foundry
- Démarrer Foundry VTT avec le module
- Vérifier qu'il n'y a pas d'erreurs dans la console
- Créer un actor, vérifier qu'il fonctionne

### 4. Test de combat
- Lancer un combat
- Vérifier que `onStartTurn()`, `onEndTurn()` sont appelés
- Effectuer une attaque d'arme (`weaponAttack()`)
- Effectuer une attaque de compétence (`skillAttack()`)
- Vérifier les défenses (`testDefense()`)

## Ordre de réalisation

1. ✅ Terminer les chantiers 01-05 (créer tous les mixins)
2. Modifier `actor.mjs` (ce chantier)
3. Tester (chantier 07)

## Réversible ?

Oui, ce changement est réversible :
- Si problème, supprimer l'import et le mixin
- Remettre les méthodes dans actor.mjs
- Revenir à l'état précédent

## Impact sur les autres fichiers

**Aucun** - Le mixin est transparent pour les autres fichiers :
- Les appels à `actor.weaponAttack()` fonctionnent toujours
- Les appels à `actor.onStartTurn()` fonctionnent toujours
- La signature des méthodes ne change pas

## Notes importantes

⚠️ **Ne pas supprimer `callActorHooks()` et `alterResources()`**
- Ces méthodes sont utilisées par les mixins
- Elles doivent rester dans `actor.mjs` (ou être extraites dans un autre mixin plus tard)

⚠️ **Vérifier les dépendances circulaires**
- L'import `import { CombatMixin } from './actor-mixins/combat/index.mjs'` ne doit pas créer de dépendance circulaire
- Si `actor.mjs` importe `action.mjs` et que `action.mjs` importe `actor.mjs`, il y a un problème
- Vérifier que les mixins n'importent pas `actor.mjs` directement

⚠️ **Fallback pour `castSpell()`**
- Si `castSpell()` n'existe pas dans actor.mjs original, le mixin doit la définir
- Voir le chantier 02 pour l'implémentation de `castSpell()`
