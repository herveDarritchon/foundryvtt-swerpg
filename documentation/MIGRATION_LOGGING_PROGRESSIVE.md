# Guide de Migration Progressive du Logging

## Objectif

Fournir aux contributeurs une méthode incrémentale, sûre et vérifiable pour migrer leur code existant des appels `console.xxx` vers le logger centralisé (`logger.mjs`) sans bloquer d'autres évolutions fonctionnelles.

---

## 🧠 Principes Clés

- Migration **granulaire** : un fichier ou un petit domaine (≤ 5 fichiers) par PR.
- Zéro régression : tests & grep systématiques avant validation PR.
- Traçabilité : commits atomiques et messages standardisés.
- Lisibilité diff : éviter les refactors hors logging dans la même PR.
- Sécurité : ne jamais introduire de logs de données sensibles (tokens, secrets).
- Performance : encapsuler uniquement les opérations coûteuses derrière `logger.isDebugEnabled()`.

---

## 🪜 Étapes Standard (par fichier)

1. Identifier les appels `console.xxx` via `grep "console\." chemin/monFichier.mjs`.
2. Ajouter ou vérifier l'import du logger (chemin relatif correct).
3. Remplacer les appels selon la table de correspondance :
   - `console.error` → `logger.error`
   - `console.warn` → `logger.warn`
   - `console.log` / `console.info` → `logger.info`
   - `console.debug` → `logger.debug`
4. Supprimer les conditions `CONFIG.debug.*` inutiles → appeler directement `logger.debug()`.
5. Pour opérations coûteuses : entourer avec `if (logger.isDebugEnabled()) { ... }`.
6. Préfixer les messages avec contexte si absent : `logger.debug('[ClassName] Message', data)`.
7. Exécuter grep de validation (voir section Validation).
8. Lancer `pnpm test` (ou sous-ensemble ciblé) et vérifier absence de régressions.
9. Commiter avec message normalisé (voir Conventions de Commit).
10. Ouvrir la PR avec checklist remplie.

---

## 🔁 Correspondance & Ajustements

| Avant (`console`) | Après (`logger`) | Visible hors debug | Action supplémentaire          |
| ----------------- | ---------------- | ------------------ | ------------------------------ |
| `error`           | `error`          | Oui                | Conserver stack / error object |
| `warn`            | `warn`           | Oui                | Ajouter contexte fonctionnel   |
| `info`/`log`      | `info`           | Non (debug only)   | Vérifier utilité du message    |
| `debug`           | `debug`          | Non (debug only)   | Ajouter données structurées    |

---

## 🧪 Validation Locale

```bash
# 1. Détection appels console restants (exclure logger.mjs et tests)
grep -r "console\.(log\|warn\|error\|info\|debug)" module/ --exclude="*/logger.mjs" --exclude-dir tests || echo "OK: aucun appel console"

# 2. Vérifier qu'au moins un import logger existe dans les fichiers modifiés
grep -r "import .*logger" module/ | grep MonDossier || echo "ATTENTION: import manquant"

# 3. Lancer tests ciblés
pnpm test actor  # exemple

# 4. Lint
pnpm eslint
```

---

## 🧾 Conventions de Commit

Format recommandé :

```text
logging: migrate <chemin/fichier.mjs> (error/warn/info/debug)
```

Exemples :

```text
logging: migrate module/documents/actor.mjs (error/warn/info)
logging: migrate module/lib/talents/cost.mjs (debug + expensive guard)
```

Commits multiples autorisés si domaine > 1 fichier : un commit par fichier.

---

## 📦 Checklist Pull Request

- [ ] Tous les `console.xxx` remplacés
- [ ] Imports logger corrects (chemins relatifs testés)
- [ ] Pas de refactor hors logging
- [ ] Conditions `CONFIG.debug.*` converties / supprimées
- [ ] Guard `logger.isDebugEnabled()` ajouté pour opérations coûteuses
- [ ] Tests locaux verts (unitaires + ciblés)
- [ ] Lint / format OK
- [ ] Aucune fuite de données sensibles
- [ ] Diff lisible / messages contextualisés
- [ ] Validation grep OK

Copier la checklist dans la description PR et cocher chaque item.

---

## ⚠️ Erreurs Fréquentes & Corrections

| Problème                       | Cause                                  | Solution rapide                                         |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| Import relatif incorrect       | Mauvaise profondeur `../`              | Comparer avec autre fichier du dossier utilisant logger |
| Log verbeux en production      | Utilisation de `logger.info` pour spam | Requalifier en `logger.debug` ou supprimer              |
| Garde manquante coûteuse       | Boucle lourde toujours exécutée        | Envelopper avec `if (logger.isDebugEnabled())`          |
| Données sensibles loggées      | Ajout d'objet complet (token)          | Filtrer avant log / supprimer clé sensible              |
| Tests cassés (spy sur console) | Ancien mock console non mis à jour     | Adapter tests pour espionner `logger.*`                 |

---

## 🧩 Stratégie Multi-PR (Domaines larges)

Pour un module volumineux (> 10 fichiers, ex: importer OggDude) :

1. PR 1 : Fichiers racine + entry points.
2. PR 2 : Services / helpers.
3. PR 3 : Documents / modèles.
4. PR 4 : Applications / sheets.
5. PR finale : Balayage restant + script global.

Chaque PR doit passer grep et tests avant la suivante.

---

## 🧪 Test de Non-Régression Rapide

Intégrer (ou adapter) ce test dans la suite existante :

```javascript
import { glob } from 'glob'
import { readFile } from 'node:fs/promises'
import { describe, test, expect } from 'vitest'

describe('Logging Migration (progressive)', () => {
  test('no direct console calls outside logger.mjs', async () => {
    const files = await glob('module/**/*.mjs', { ignore: ['**/logger.mjs', '**/tests/**'] })
    for (const f of files) {
      const c = await readFile(f, 'utf8')
      expect(c).not.toMatch(/console\.(log|warn|error|info|debug)/)
    }
  })
})
```

---

## 🛠 Outils Script Partiel

Exemple pour un dossier précis :

```bash
TARGET_DIR=module/lib/talents
find "$TARGET_DIR" -name "*.mjs" | while read -r file; do
  sed -i '' -e 's/console\.debug(/logger.debug(/g' \
            -e 's/console\.log(/logger.info(/g' \
            -e 's/console\.info(/logger.info(/g' \
            -e 's/console\.warn(/logger.warn(/g' \
            -e 's/console\.error(/logger.error(/g' "$file"
  if ! grep -q "import .*logger" "$file"; then
    sed -i '' "1i\\
import { logger } from '../../utils/logger.mjs'" "$file"
  fi
done
```

Toujours relire visuellement les diffs avant commit.

---

## 📝 Annotation de Progression

Utiliser labels d'issue :

- `logging:pending` — Fichiers non migrés
- `logging:in-progress` — PR ouverte
- `logging:review` — En attente de review
- `logging:done` — Domaine migré / fusionné

Tableau de suivi recommandé dans issue épique.

---

## 🤝 Code Review Checklist (Reviewer)

- Aucune occurrence `console.` restante
- Import logger correct et placé après autres imports
- Niveaux cohérents (`error` pour exceptions réelles, pas d'abus de `warn`)
- Ajout de contexte suffisant (nom de classe, identifiant objet)
- Pas de surcharge verbeuse (`debug` inutiles)
- Garde pour opérations lourdes présente
- Tests adaptés si nécessaires

---

## 🔄 Rollback Rapide (rare)

En cas de régression critique post-merge :

```bash
git revert <commit_migration>
pnpm test
```

Puis corriger et réintroduire la migration proprement.

---

## 🔗 Références

- Plan complet : `docs/ways-of-work/plan/core-refactor/logger-consolidation/implementation-plan.md`
- Guide API : `documentation/swerpg/DEVELOPER_GUIDE_LOGGING.md`
- Source logger : `module/utils/logger.mjs`

---

**Dernière mise à jour** : 11 novembre 2025
**Statut** : Guide opérationnel pour migrations incrémentales
