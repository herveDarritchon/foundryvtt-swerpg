# Matrice de couverture E2E — Swerpg

> Document de référence PWE6. Mis à jour lors de tout ajout, suppression ou déplacement de spec.

---

## 1. Lecture de la matrice

Chaque ligne représente un domaine fonctionnel ou un parcours critique. Les colonnes indiquent :

- **Suite** : `regression`, `smoke`, `[ci]` (legacy), ou `—` (hors scope).
- **Spec** : chemin relatif depuis `e2e/`, ou test Vitest si la couche est unitaire.
- **Statut** : `couvert`, `hors scope accepté`, ou `non couvert`.
- **Notes** : contexte utile.

---

## 2. Matrice

### 2.1. Bootstrap / santé instance

| Domaine | Parcours critique | Suite | Spec | Statut | Notes |
|---|---|---|---|---|---|
| Bootstrap Foundry | Instance répond, système swerpg chargé | `regression` | `regression/specs/01-smoke.spec.ts` — `monde chargé avec système swerpg` | couvert | |
| Bootstrap Foundry | Sidebar présente (Actors, Items, Settings) | `regression` | `regression/specs/01-smoke.spec.ts` — `sidebar contient les sections principales` | couvert | |
| Bootstrap Foundry | Instance répond, système swerpg chargé | `smoke` | `smoke/01-health.spec.ts` — `l'instance répond et charge le système swerpg` | couvert | lecture seule, prod |
| Bootstrap Foundry | body.system-swerpg présent | `smoke` | `smoke/01-health.spec.ts` — `body.system-swerpg est présent quand le système est chargé` | couvert | |
| Bootstrap Foundry | Aucune erreur console critique sur /game | `smoke` | `smoke/01-health.spec.ts` — `aucune erreur console critique sur /game` | couvert | |
| Bootstrap Foundry | Aucun asset système critique en 404 | `smoke` | `smoke/01-health.spec.ts` — `aucun asset système critique en 404` | couvert | |
| Bootstrap Foundry | Instance répond, world load | `[ci]` (legacy) | `specs/bootstrap.spec.ts` | couvert | candidat migration vers `regression` |

### 2.2. Interface — surfaces UI et i18n

| Domaine | Parcours critique | Suite | Spec | Statut | Notes |
|---|---|---|---|---|---|
| UI / i18n | Sidebar : onglets sans clé i18n brute | `smoke` | `smoke/02-surfaces.spec.ts` — `sidebar affiche les onglets principaux sans clé i18n brute` | couvert | |
| UI / i18n | Sidebar : aucun placeholder cassé (undefined, null) | `smoke` | `smoke/02-surfaces.spec.ts` — `aucun placeholder cassé visible dans la sidebar` | couvert | |
| UI / i18n | Onglet Actors accessible en lecture | `smoke` | `smoke/02-surfaces.spec.ts` — `onglet Actors visible et accessible en lecture` | couvert | |
| UI / i18n | Onglet Items accessible en lecture | `smoke` | `smoke/02-surfaces.spec.ts` — `onglet Items visible et accessible en lecture` | couvert | |
| UI / i18n | Onglet Settings accessible en lecture | `smoke` | `smoke/02-surfaces.spec.ts` — `onglet Settings visible et accessible en lecture` | couvert | |

### 2.3. Import OggDude

| Domaine | Parcours critique | Suite | Spec | Statut | Notes |
|---|---|---|---|---|---|
| Import OggDude | Dialog OggDude s'ouvre depuis les settings système | `regression` | `regression/specs/02-oggdude-import.spec.ts` — `dialog OggDude s'ouvre depuis les settings système` | couvert | |
| Import OggDude | Import complet depuis un ZIP OggDude | `regression` | `regression/specs/02-oggdude-import.spec.ts` — `import complet depuis un ZIP OggDude` | couvert | |
| Import OggDude | Ouverture dialog OggDude | `[ci]` (legacy) | `specs/oggdude-import.spec.ts` | couvert | candidat migration vers `regression` |

### 2.4. Création de personnage

| Domaine | Parcours critique | Suite | Spec | Statut | Notes |
|---|---|---|---|---|---|
| Création personnage | Onglet Actors accessible depuis la sidebar | `regression` | `regression/specs/03-character-creation.spec.ts` — `onglet Actors accessible depuis la sidebar` | couvert | |
| Création personnage | Création et ouverture de fiche sans erreur navigateur | `regression` | `regression/specs/03-character-creation.spec.ts` — `création personnage et ouverture de fiche sans erreur navigateur` | couvert | teardown acteur `Test-Personnage-*` |

### 2.5. XP et arbre de spécialisation

| Domaine | Parcours critique | Suite | Spec | Statut | Notes |
|---|---|---|---|---|---|
| XP / compétences | Console XP visible sur fiche fraîchement créée | `regression` | `regression/specs/04-xp-spend-and-specialization-tree.spec.ts` — `console XP visible sur fiche de personnage fraîchement créé` | couvert | teardown acteur `Test-XP-*` |
| XP / compétences | Achat rang compétence — console XP cohérente | `regression` | `regression/specs/04-xp-spend-and-specialization-tree.spec.ts` — `achat rang compétence : console XP reste cohérente après transaction` | couvert | teardown acteur `Test-XP-Skill-*` |
| Arbre spécialisation | Arbre de spécialisation s'ouvre sans erreur navigateur | `regression` | `regression/specs/04-xp-spend-and-specialization-tree.spec.ts` — `arbre de spécialisation s'ouvre sans erreur navigateur` | couvert | teardown acteur `Test-SpecTree-*` |

### 2.6. Domaines hors scope Playwright (relais Vitest)

| Domaine | Justification hors scope Playwright | Couverture alternative |
|---|---|---|
| Calculs XP (coûts, seuils) | Logique pure testable sans navigateur | `tests/lib/` — Vitest |
| Calculs dés narratifs (pools, symboles) | Logique pure testable sans navigateur | `tests/dice/` — Vitest |
| Mapping import OggDude (XML → modèle) | Transformation pure testable sans navigateur | `tests/` — Vitest |
| Validation TypeDataModel | Dépend de Foundry mais ne requiert pas un navigateur complet | Vitest + mocks Foundry |
| Combat / jets de dés avancés | Hors scope PWE6 — aucune spec prévue pour l'instant | non couvert — hors scope accepté |
| Gestion joueur non-MJ | Hors scope PWE6 — aucune spec prévue pour l'instant | non couvert — hors scope accepté |

---

## 3. Trous de couverture acceptés

Les domaines suivants ne sont pas couverts par la suite E2E actuelle. Cette décision est intentionnelle et documentée ici pour éviter toute confusion avec des oublis :

| Domaine | Raison | Priorité future |
|---|---|---|
| Parcours joueur non-MJ | Requiert un second compte — hors scope PWE1–6 | moyenne |
| Jets de dés dans le chat | Difficile à vérifier sans UI de dés — hors scope PWE1–6 | basse |
| Combat (initiative, attaques) | Hors scope PWE1–6 | basse |
| Équipement / items (gear, armes, armures) | Hors scope PWE1–6 | moyenne |
| Talents avancés (achat depuis arbre) | Extension naturelle de PWE4 — non encore spécifié | haute |

---

## 4. Specs legacy à requalifier

Les specs dans `e2e/specs/` sont des specs legacy non encore migrées :

| Spec legacy | Migration cible | État |
|---|---|---|
| `specs/bootstrap.spec.ts` | `regression/specs/01-smoke.spec.ts` | doublon couvert — à archiver ou supprimer |
| `specs/oggdude-import.spec.ts` | `regression/specs/02-oggdude-import.spec.ts` | doublon couvert — à archiver ou supprimer |

Ces specs ne sont accessibles qu'avec `pnpm e2e:ci` (tag `[ci]`). Leur migration vers `regression` est souhaitable mais non urgente pour PWE6.

---

## 5. Commandes de référence

```bash
# Validation fonctionnelle pré-livraison (PWE3 + PWE4)
pnpm e2e:regression

# Contrôle de surface post-déploiement (lecture seule)
pnpm e2e:smoke

# Campagne complète (les deux instances doivent être disponibles)
pnpm e2e

# Specs legacy [ci]
pnpm e2e:ci

# Ouvrir le report HTML après un run
pnpm exec playwright show-report playwright-regression-report
pnpm exec playwright show-report playwright-smoke-report
```