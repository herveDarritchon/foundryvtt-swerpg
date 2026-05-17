# Plan d'implémentation — #282 : Vue consolidée des talents — résoudre les talents connus par identifiant métier

**Issue** : [#282 — Vue consolidée des talents : résoudre les talents connus par identifiant métier](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/282)
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/cadrage-resolution-talents-unknown-vue-consolidee.md`
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

---

## 1. Objectif

Faire en sorte que l'onglet Talents affiche le nom, l'activation et le rang des talents déjà connus quand `talentPurchases` ne transporte qu'un `talentId` métier, tout en conservant un fallback dégradé explicite pour les talents réellement introuvables.

## 2. Périmètre

### Inclus

- durcir la résolution des définitions de talents utilisées par la vue consolidée ;
- prioriser la clé métier des talents référentiels avant les identifiants techniques Foundry ;
- conserver le fallback `Unknown`/`Unspecified` quand aucune résolution n'est possible ;
- ajouter la couverture de tests ciblée sur les cas importés et legacy.

### Hors scope

- ajout de `talentUuid` dans `talentPurchases` ;
- modification de la vue graphique des arbres de spécialisation ;
- refonte de l'import OggDude ;
- effets mécaniques, `system.effects` ou `ActiveEffect` ;
- refonte du template Handlebars au-delà du strict nécessaire au rendu existant.

## 3. Notes sur l'existant

- `module/lib/talent-node/owned-talent-summary.mjs` groupe déjà les achats par `talentId` et résout correctement les sources.
- `module/applications/sheets/character-sheet.mjs` prépare la vue consolidée à partir d'une map de définitions de talents.
- `tests/applications/sheets/character-sheet-talents.test.mjs` couvre déjà la priorité `item.system.id` avec fallback `item.id`.
- Le cadrage local identifie encore un besoin de robustesse sur les clés métier réellement rencontrées à l'import et sur le diagnostic des cas non résolus.

## 4. Décisions d'architecture

- `talentId` reste la clé métier de référence pour la vue consolidée ; il ne doit pas être traité comme un UUID Foundry.
- La logique de résolution reste côté préparation de contexte / index, jamais dans `templates/sheets/actor/talents.hbs`.
- Les diagnostics doivent être ciblés sur les cas non résolus pour éviter un bruit de logs permanent.

## 5. Fichiers probables

- `module/applications/sheets/character-sheet.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

## 6. Étapes d'implémentation

1. Vérifier la forme exacte des clés talent attendues par l'issue à partir du cadrage et des tests existants, puis retenir le plus petit ensemble d'alias métier réellement nécessaire.
2. Ajuster le resolver/index des définitions de talents de l'onglet Talents pour prioriser la clé métier prouvée (`system.id`, puis alias métier justifié), avec fallback legacy sur `item.id`.
3. Conserver le fallback visuel actuel pour les talents introuvables et ajouter un diagnostic ciblé quand un `talentId` acheté ne matche aucun talent référentiel.
4. Étendre les tests de la fiche personnage pour couvrir : résolution par clé métier, fallback legacy, absence de régression sur les sources consolidées, et cas non résolu explicite.

## 7. Tests attendus

- un talent acheté via un `talentId` métier court est résolu vers le bon nom/tag dans la vue consolidée ;
- un talent legacy sans clé métier continue d'être résolu via `item.id` ;
- un talent non résolu reste affiché en `Unknown` sans perdre ses sources ;
- le tri et la déduplication de la vue consolidée restent inchangés.

## 8. Risques

- collision entre plusieurs talents portant la même clé métier ;
- élargissement de scope si trop d'alias spéculatifs sont supportés sans preuve ;
- logs trop verbeux si le diagnostic n'est pas limité aux échecs.

## 9. Critères d'arrêt

- la vue consolidée résout les talents connus de l'issue par identifiant métier dans les tests ciblés ;
- les cas non résolus gardent le fallback dégradé actuel ;
- aucune logique métier de résolution n'est déplacée dans le template ;
- le correctif reste limité à la vue consolidée des talents et à ses tests.
