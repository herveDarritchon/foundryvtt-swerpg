# Index des ADR

Cet index reference les ADR du projet pour aider a trouver rapidement la decision pertinente selon le contexte de la demande.

## Regle de maintenance

Ce fichier doit etre mis a jour a chaque creation, suppression, remplacement ou changement significatif d'un ADR.

Avant de modifier une architecture, une convention transverse, un modele de donnees, une integration Foundry, une strategie de test, une regle UI ou une politique de style, consulter d'abord cet index puis l'ADR cible.

## ADR disponibles

| ADR                                                                                         | Domaine                          | But en 1 phrase                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR-0025](./adr-0025-obligation-item-narratif-minimal-sans-enrichissement-du-datamodel.md) | Obligations / DataModel          | Definit que l'item `obligation` reste un item narratif minimal et que son modele de donnees actuel ne doit pas etre enrichi sans besoin metier prouve. |
| [ADR-0001](./adr-0001-foundry-applicationv2-adoption.md)                                    | Architecture Foundry / DataModel | Definit l'adoption de `ApplicationV2` et `TypeDataModel` comme socle technique principal pour l'UI et les donnees du systeme.                          |
| [ADR-0002](./adr-0002-yaml-leveldb-build-system.md)                                         | Build compendiums                | Definit le pipeline source YAML vers compendiums LevelDB comme mecanisme canonique de construction et maintenance des packs.                           |
| [ADR-0003](./adr-0003-narrative-dice-architecture.md)                                       | Des narratifs / moteur de jeu    | Structure l'architecture du systeme de des narratifs Star Wars Edge et la repartition des responsabilites autour des jets.                             |
| [ADR-0004](./adr-0004-vitest-testing-strategy.md)                                           | Strategie de test                | Definit Vitest comme framework principal et pose la strategie de couverture pour les tests unitaires et d'integration.                                 |
| [ADR-0005](./adr-0005-localization-strategy.md)                                             | i18n / localisation              | Cadre la strategie de localisation francais/anglais et l'organisation des textes traduisibles du systeme.                                              |
| [ADR-0006](./adr-0006-specialization-import-error-isolation.md)                             | Import OggDude / robustesse      | Defini l'isolation des erreurs par item dans l'import des specialisations pour conserver les donnees valides et remonter des metriques coherentes.     |
| [ADR-0007](./adr-0007-weapon-taxonomy.md)                                                   | Modele armes                     | Fixe la taxonomie canonique des armes et la structuration de leurs categories et types metier.                                                         |
| [ADR-0008](./adr-0008-armor-taxonomy.md)                                                    | Modele armures                   | Fixe la taxonomie canonique des armures et l'organisation de leurs categories, qualites et mappings associes.                                          |
| [ADR-0009](./adr-0009-restriction-level.md)                                                 | Legalite / equipement            | Definit `system.restrictionLevel` comme sous-systeme canonique pour exprimer la legalite et les restrictions des objets.                               |
| [ADR-0010](./adr-0010-architecture-des-effets-mécaniques-des-talents.md)                    | Talents / effets mecaniques      | Definit `system.effects` comme modele metier canonique des effets de talents, distinct des `ActiveEffect` Foundry.                                     |
| [ADR-0011](./adr-0011-stockage-journal-evolution-personnage-flags.md)                       | Audit personnage / stockage      | Defini le stockage du journal d'evolution d'un personnage dans les `flags` plutot que dans le modele metier principal.                                 |
| [ADR-0012](./adr-0012-unit-tests-readable-diagnostics.md)                                   | Qualite des tests                | Formalise des regles de redaction pour des tests unitaires lisibles, ciblés et diagnostiques.                                                          |
| [ADR-0013](./adr-0013-technical-key-and-business-key-separation.md)                         | Identifiants / modelisation      | Separe la cle metier stable des cles techniques Foundry pour eviter les couplages accidentels et les derives d'identite.                               |
| [ADR-0014](./adr-0014-talents-standalone-arbres-v1-et-source-de-verite-progression.md)      | Talents / progression            | Cadre la relation entre talents standalone, arbres V1 et source de verite de la progression personnage.                                                |
| [ADR-0015](./adr-0015-no-direct-mutation-of-prepared-datamodel-collections.md)              | DataModel / immutabilite         | Interdit la mutation directe des collections preparees du DataModel pour preserver la coherence du cycle de donnees.                                   |
| [ADR-0016](./adr-0016-dialogv2-confirm-usage.md)                                            | UI / dialogues                   | Standardise l'usage de `DialogV2.confirm` pour les confirmations utilisateur dans le systeme.                                                          |
| [ADR-0017](./adr-0017-e2e-playwright-interaction-contract-and-browser-error-capture.md)     | E2E / contrat technique          | Definit le contrat commun d'interaction Playwright et la capture centralisee des erreurs navigateur pour toutes les specs E2E.                         |
| [ADR-0018](./adr-0018-no-magic-numbers-named-constants.md)                                  | Configuration / conventions code | Interdit les magic numbers et magic strings metier au profit de constantes nommees centralisees dans `module/config/`.                                 |
| [ADR-0019](./adr-0019-sizehigh-sizlow-import-flag-only.md)                                  | Import OggDude / taille          | Definit `SizeHigh` et `SizeLow` comme simples marqueurs d'import et non comme champs metier du schema systeme.                                         |
| [ADR-0020](./adr-0020-market-eligibility-static-type-only-no-purchasable-flag.md)           | Marche / eligibilite             | Definit l'eligibilite au marche par type statique plutot que par flag `purchasable` sur les DataModels.                                                |
| [ADR-0021](./adr-0021-scrollable-areas-applicationv2-pattern.md)                            | UI ApplicationV2 / layout        | Standardise le pattern `PARTS + CSS` pour gerer les zones scrollables dans les applications ApplicationV2.                                             |
| [ADR-0022](./adr-0022-design-tokens-mandatory-styling.md)                                   | Styles / design system           | Rend obligatoires les design tokens pour les couleurs et polices afin d'interdire le styling en dur.                                                   |
| [ADR-0023](./adr-0023-e2e-regression-scope-and-responsibilities.md)                         | E2E regression / qualite         | Definit le scope et la responsabilite de `e2e:regression` comme suite de non-regression fonctionnelle pour golden paths et bug-fix de nature E2E.      |
| [ADR-0024](./adr-0024-e2e-smoke-scope-and-responsibilities.md)                              | E2E smoke / observabilite        | Definit le scope et la responsabilite de `e2e:smoke` comme suite de verification de surface rapide, transverse et en lecture seule.                    |

## Usage rapide par contexte

- Si la demande touche Foundry UI, DataModel ou structure d'application : commencer par `ADR-0001`, `ADR-0015`, `ADR-0016`, `ADR-0021`.
- Si la demande touche les conventions de code et de configuration : commencer par `ADR-0018`, `ADR-0022`, `ADR-0013`.
- Si la demande touche les tests : commencer par `ADR-0004`, `ADR-0012`, `ADR-0017`, `ADR-0023`, `ADR-0024`.
- Si la demande touche les imports OggDude : commencer par `ADR-0006`, `ADR-0019` et les ADR de domaine concernes.
- Si la demande touche talents et progression : commencer par `ADR-0010`, `ADR-0011`, `ADR-0014`.
- Si la demande touche armes, armures, legalite ou marche : commencer par `ADR-0007`, `ADR-0008`, `ADR-0009`, `ADR-0020`.
