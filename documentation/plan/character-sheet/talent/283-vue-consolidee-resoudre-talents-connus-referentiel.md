# Plan d'implémentation — #283 : Vue consolidée des talents — résoudre les talents connus depuis le référentiel

**Issue** : [#283 — Vue consolidée des talents : résoudre les talents connus depuis le référentiel](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/283)
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/cadrage-resolution-talents-unknown-vue-consolidee.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

---

## 1. Objectif

Faire en sorte que l'onglet Talents résolve les talents déjà présents dans le référentiel `game.items` quand un achat acteur porte un `talentId` métier connu, au lieu d'afficher `Unknown Talent`.

## 2. Périmètre

### Inclus

- fiabiliser l'index des définitions de talents utilisé par la vue consolidée ;
- faire primer les clés métier réellement portées par le référentiel talent avant les identifiants techniques Foundry ;
- conserver le fallback `Unknown` / `Unspecified` pour les talents réellement introuvables ;
- ajouter la couverture de tests ciblée sur les cas référentiels connus et les fallbacks legacy.

### Hors scope

- modification du stockage `actor.system.progression.talentPurchases` ;
- ajout de `talentUuid` ou migration de données ;
- refonte de l'import OggDude ;
- refonte du template Handlebars ou de la présentation visuelle de l'onglet ;
- effets mécaniques des talents.

## 3. Constat sur l'existant

- `#buildTalentDefinitions()` dans `module/applications/sheets/character-sheet.mjs` construit aujourd'hui un index simple à partir de `item.system.id || item.id`.
- `buildOwnedTalentSummary()` résout chaque entrée consolidée uniquement via la clé `talentId` reçue des achats acteur.
- Les tests couvrent déjà la priorité `system.id` avec fallback `item.id`, ainsi que le fallback `Unknown` en cas d'absence de définition.
- Le cadrage montre que des talents connus du référentiel restent non résolus malgré des `talentId` courts valides, ce qui indique un décalage entre la clé d'achat et la clé réellement indexée côté référentiel.

## 4. Décisions d'architecture

- `talentId` reste la clé métier de liaison pour la vue consolidée ; il ne doit pas être remplacé par un identifiant technique Foundry.
- La résolution du référentiel doit rester dans la préparation de contexte de la fiche, jamais dans le template.
- Le correctif doit introduire uniquement l'ensemble minimal d'alias métier prouvés par les données référentielles réellement chargées.
- Le warning existant sur les talents non résolus doit être conservé pour les vrais échecs de résolution.

## 5. Plan de travail

1. Vérifier quelles clés métier exposent réellement les Items `talent` du référentiel pour les cas visés par l'issue, puis retenir le plus petit ensemble de clés de lookup nécessaire.
2. Ajuster la construction de l'index des définitions de talents pour enregistrer chaque talent référentiel sous sa clé métier canonique et, seulement si justifié, sous un alias compatible avec les achats importés.
3. Garder la priorité de résolution sur les clés métier avant tout fallback `item.id`, afin d'éviter qu'un talent connu du référentiel retombe sur un identifiant technique.
4. Étendre `tests/applications/sheets/character-sheet-talents.test.mjs` pour couvrir : talent connu résolu depuis le référentiel, fallback legacy via `item.id`, et maintien du fallback `Unknown` quand aucun talent référentiel ne correspond.

## 6. Fichiers probablement modifiés

- `module/applications/sheets/character-sheet.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

## 7. Tests attendus

- un achat avec `talentId` métier court retrouve le talent attendu dans le référentiel ;
- un talent legacy sans clé métier continue d'être résolu via `item.id` ;
- un talent absent du référentiel reste affiché en `Unknown` avec warning ciblé ;
- l'ordre d'affichage consolidé et les sources restent inchangés.

## 8. Risques et mitigations

- **Collision de clés métier** : limiter l'indexation aux alias explicitement prouvés.
- **Élargissement de scope** : ne pas toucher au modèle d'achat acteur ni à l'importer.
- **Régression silencieuse** : verrouiller les cas référentiel connu / fallback legacy / non résolu par tests dédiés.

## 9. Critères d'arrêt

- les talents connus visés par l'issue sont résolus depuis le référentiel dans la vue consolidée ;
- les cas legacy et non résolus conservent leur comportement actuel ;
- aucune logique métier de résolution n'est déplacée dans le template ;
- le correctif reste limité à la vue consolidée des talents et à ses tests.
