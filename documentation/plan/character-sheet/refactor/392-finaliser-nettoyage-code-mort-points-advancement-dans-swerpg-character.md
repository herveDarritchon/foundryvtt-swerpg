# Plan — Finaliser nettoyage code mort `points` / `advancement` dans `SwerpgCharacter`

**Issue** : [#392 — Refactor: finaliser nettoyage code mort `points` / `advancement` dans SwerpgCharacter](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/392)

## Objectif

Clore la zombie API `points`/`advancement` héritée de Crucible autour du personnage en alignant `SwerpgCharacter`, `SwerpgActor`, la fiche, le HUD et les tests sur le vrai modèle Edge actuellement en production.

## Décision de cadrage

- **Option recommandée** : **Option A — suppression définitive** de `points` côté personnage et nettoyage en cascade des consommateurs.
- **Raison** : le système actuel repose déjà sur `progression.experience`, `freeSkillRanks`, les coûts XP et les achats de talents ; `points` n'est plus peuplé nulle part et n'est maintenu que par des fallbacks/branches legacy.
- **Hors périmètre** : ne pas réintroduire dans cette issue un vrai moteur de points de création/progression. Si ce besoin refait surface, l'ouvrir comme feature dédiée avec règles métier explicites.

## Fichiers impactés

| Fichier                                                             | Nature du changement                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `module/models/character.mjs`                                       | Retirer la propriété dérivée `points` restante et les derniers commentaires/scaffolds liés                    |
| `module/documents/actor.mjs`                                        | Supprimer ou réécrire les accès `actor.points` / logique de création qui dépend encore de cette API zombie    |
| `module/applications/sheets/character-sheet.mjs`                    | Nettoyer le contexte de fiche qui lit encore `a.points` / `system.points`                                     |
| `templates/sheets/actor/character-attributes.hbs`                   | Retirer les bindings UI qui affichent ou conditionnent `points.*`                                             |
| `templates/hud/talent-tree-controls.hbs`                            | Remplacer la lecture `actor.points.talent.available` par le vrai contrat métier ou retirer l'affichage legacy |
| `tests/applications/sheets/character-sheet-sidebar-header.test.mjs` | Migrer les fixtures/assertions qui fake `points.*`                                                            |
| `tests/documents/actor-creation.test.mjs`                           | Réécrire les tests qui dépendent encore de `actor.points.*`                                                   |

## Étapes d’implémentation

### 1. Trancher et documenter le contrat public cible

- Formaliser dans l'issue/ADR que le personnage SWERPG Edge ne supporte plus l'API générique `points`.
- Lister les remplacements autorisés par intention métier : XP disponible via `progression.experience.available`, rangs gratuits via `progression.freeSkillRanks`, état création via `actor.isL0`, et aides spécifiques si un écran a encore besoin d'un booléen dédié.
- Vérifier que `advancement.level` reste un concept valide ailleurs dans le système, mais qu'aucun flux personnage ne dépend d'un pseudo-`prepareAdvancement()` absent.

### 2. Supprimer la zombie API en cascade côté runtime personnage

- Nettoyer `SwerpgCharacter` pour qu'il n'expose plus `points` comme donnée dérivée implicite.
- Rebrancher `SwerpgActor` et la fiche personnage sur des helpers/champs explicites au lieu de `actor.points`.
- Mettre à jour les templates de fiche et de HUD pour qu'ils ne lisent plus `points.*` non peuplé ; si une information manque, introduire un nom métier explicite au lieu de ressusciter `points`.

### 3. Aligner les tests et verrouiller l'absence de références dangling

- Migrer ou supprimer les tests qui fabriquent encore `system.points` dans leurs fixtures de personnage.
- Ajouter des non-régressions ciblées sur le contrat réellement supporté : disponibilité XP, rangs gratuits, garde-fous de création, rendu fiche/HUD sans `points`.
- Terminer par une vérification ciblée des références personnage pour confirmer qu'aucun `points.*` non alimenté ne subsiste après la cascade.

## Points de vigilance

- Ne pas supprimer aveuglément `advancement.level` pour les autres sous-types (`adversary`, audit log, diff, ressources) : le chantier vise le **parcours personnage** et la fausse API `points`.
- La fiche et le HUD peuvent consommer des contextes différents (`actor.points`, `system.points`, fallback `?? {}`) : traiter la chaîne complète pour éviter une régression silencieuse.
- Si une règle métier réelle de création a besoin d'un pool intermédiaire, arrêter le refactor et rouvrir une feature dédiée plutôt que de réintroduire un conteneur `points` générique.

## Résultat attendu

- La décision suppression vs réactivation est explicitement tranchée, avec **suppression définitive** recommandée pour cette issue.
- `SwerpgCharacter`, `SwerpgActor`, la fiche, le HUD et les tests personnage n'ont plus de dépendance à `points.*` non peuplé.
- Le parcours personnage repose uniquement sur des surfaces métier explicites et déjà cohérentes avec le modèle XP Edge.
