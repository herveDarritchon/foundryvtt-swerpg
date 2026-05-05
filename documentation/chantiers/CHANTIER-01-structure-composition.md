# Chantier 01 : Structure et Composition des Mixins de Combat

## Objectif
Créer la structure de répertoires et le fichier de composition pour les mixins de combat.

## Fichiers à créer

```
module/documents/actor-mixins/combat/
├── attack.mixin.mjs      (à créer au chantier 02)
├── defense.mixin.mjs    (à créer au chantier 03)
├── turn.mixin.mjs       (à créer au chantier 04)
├── effects.mixin.mjs    (à créer au chantier 05)
└── index.mjs            ← Création principale
```

## Implémentation de `combat/index.mjs`

```javascript
/**
 * Combat Mixin Composition
 * Combines all combat-related mixins into a single CombatMixin
 */

import { AttackMixin } from './attack.mixin.mjs'
import { DefenseMixin } from './defense.mixin.mjs'
import { TurnMixin } from './turn.mixin.mjs'
import { EffectsMixin } from './effects.mixin.mjs'

/**
 * Composes all combat mixins into a single mixin
 * Order matters: TurnMixin and EffectsMixin may depend on Attack/Defense mixins
 */
export const CombatMixin = (Base) =>
  AttackMixin(DefenseMixin(TurnMixin(EffectsMixin(Base))))
```

## Étapes

1. **Créer le répertoire**
   ```bash
   mkdir -p module/documents/actor-mixins/combat
   ```

2. **Créer le fichier `index.mjs`**
   - Importer les 4 mixins (même si les fichiers n'existent pas encore)
   - Exporter `CombatMixin` qui compose les mixins dans l'ordre

## Dépendances

- Aucune dépendance sur les autres chantiers
- Les fichiers importés seront créés aux chantiers 02-05

## Vérification

```bash
# Vérifier que le répertoire existe
ls -la module/documents/actor-mixins/combat/

# Vérifier la syntaxe du fichier index.mjs
node --check module/documents/actor-mixins/combat/index.mjs
```

## Notes

- Le fichier `index.mjs` utilise des imports qui n'existent pas encore
- C'est normal, les chantiers suivants créeront les fichiers manquants
- L'ordre de composition est important : `EffectsMixin` en premier (base), puis `TurnMixin`, `DefenseMixin`, `AttackMixin` (couche externe)
