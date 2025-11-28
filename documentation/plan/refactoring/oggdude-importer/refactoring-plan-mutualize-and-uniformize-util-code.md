# Plan de refactorisation — Importer OggDude

## Objectifs

- Uniformiser l'utilisation d'`ImportStats` sur tous les domaines (armes, armures, talents, etc.).
- Centraliser l'instrumentation (durées, erreurs, taille d'archive) via `global-import-metrics` et le logger officiel.
- Sécuriser et homogénéiser les helpers texte/sanitation.
- Mettre en place des tests (unitaires + intégration) garantissant la forme `{ total, rejected, imported }` et la réinitialisation systématique des stats.

## Portée

- Répertoires ciblés : `module/importer/utils`, mappers `module/importer/**/*.mjs`, tests liés `tests/importer/**/*`.
- Documentation associée : `documentation/plan/refactoring/oggdude-importer`, `.github/instructions/importer-memory.instructions.md`.

## Hypothèses & Contraintes

1. Foundry VTT v13 reste la cible, pas d'accès direct aux globaux dans la logique métier.
2. instrumentation existante (`recordDomainStart`, `markGlobalStart`, etc.) doit rester rétro-compatible.
3. Aucun pack binaire (répertoire `packs/`) n'est modifié durant ce refactor.

## Phases & Tâches

### 1. Cartographie & Tests de base

- [ ] Lister tous les utilitaires `*-import-utils.mjs`, vérifier exports (`reset*`, `get*`).
- [ ] Identifier les mappers qui consomment directement les utils (ré-export manquant).
- [ ] Ajoutez/complétez des tests fumées pour capturer l'état actuel (`reset`/`get`).

### 2. Standardisation `ImportStats`

- [ ] Renommer les compteurs historiques (`processed`, `failed`, `skillCount`, etc.) → `total`, `rejected`, détails via `addDetail`.
- [ ] Supprimer les alias (`failed`) et mapping manuel (`talent`, `specialization`).
- [ ] Couvrir via tests de forme : `expect(stats).toMatchObject({ total, rejected, imported })`.

### 3. Instrumentation & Logging

- [ ] Remplacer tout `console.*` par `logger` (niveau `debug/warn/error`).
- [ ] Étendre `global-import-metrics` pour ne calculer chaque domaine qu'une fois et journaliser les durées.
- [ ] Garantir `markArchiveSize` est appelé au chargement ZIP + tests.

### 4. Sanitation & Helpers texte

- [ ] Harmoniser l'usage de `sanitizeDescription` pour descriptions riches (`armor`, `talent`, etc.).
- [ ] Renforcer `sanitizeText` (échappement basique, suppression scripts/styles) pour champs courts.
- [ ] Ajouter tests unitaires sur `description-markup-utils` et `text.mjs` (cas HTML + edge cases).

### 5. Tests & Documentation

- [ ] Ajouter suite Vitest couvrant `reset*`/`get*`, instrumentation runtime, sanitation.
- [ ] Mettre à jour `importer-memory.instructions.md` si des conventions évoluent.
- [ ] Produire un changelog ciblé (section importer) + résumer les gains (observabilité, sécurité, QA).

## Livrables attendus

- Code refactoré respectant `CODING_STYLES.md` et la mémoire importer.
- Tests automatisés verts validant les nouvelles conventions.
- Documentation mise à jour (présent plan, instructions, éventuelles notes de migration).

## Risques & Mitigations

| Risque                                                 | Impact                 | Mitigation                                                                    |
| ------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------- |
| Régression sur agrégation des stats                    | Échec UI/observabilité | Ajout tests snapshot `global-import-metrics`                                  |
| Dépendances aux alias (`failed`) dans d'autres modules | Build cassé            | Recherches globales + plan de migration en deux temps (export alias déprécié) |
| Logs trop bruyants en prod                             | Lisibilité             | Niveaux logger adaptés (`debug` sous feature flag)                            |

## Validation

- [ ] Vitest + lint.
- [ ] Vérification manuelle d'un import complet (ZIP OggDude) en environnement de dev.
- [ ] Inspection UI : métriques globales affichées et cohérentes.
