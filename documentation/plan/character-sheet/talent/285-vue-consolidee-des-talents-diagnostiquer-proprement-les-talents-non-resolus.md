# Plan d'implémentation — #285 : Vue consolidée des talents — diagnostiquer proprement les talents non résolus

**Issue** : [#285 — Vue consolidée des talents : diagnostiquer proprement les talents non résolus](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/285)  
**ADR** : `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`  
**Cadrage** : `documentation/cadrage/character-sheet/talent/cadrage-resolution-talents-unknown-vue-consolidee.md`  
**Plans de référence** : `documentation/plan/character-sheet/talent/283-vue-consolidee-resoudre-talents-connus-referentiel.md`, `documentation/plan/character-sheet/talent/284-vue-consolidee-des-talents-consolider-le-rang-et-les-sources-multiples.md`  
**Module(s) impacté(s)** : `module/applications/sheets/character-sheet.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

---

## 1. Objectif

Faire en sorte que les talents réellement non résolus dans la vue consolidée gardent le fallback d'affichage actuel, tout en produisant un diagnostic ciblé, exploitable et peu bruyant pour comprendre pourquoi la résolution a échoué.

## 2. Périmètre

### Inclus

- localiser précisément le point où la vue consolidée bascule vers `Unknown Talent` ;
- ajouter un warning structuré uniquement pour les cas réellement non résolus ;
- inclure dans ce diagnostic les identifiants utiles côté acteur, achat et source ;
- préserver le fallback visuel existant et ajouter des tests ciblés sur les diagnostics.

### Hors scope

- refonte de la stratégie de résolution des talents au-delà du strict nécessaire au diagnostic ;
- migration de données acteur ou ajout de `talentUuid` ;
- refonte du template Handlebars ou de la présentation de l'onglet Talents ;
- logs verbeux permanents de tout l'index talents ;
- import OggDude et effets mécaniques des talents.

## 3. Constat sur l'existant

- Les plans #283 et #284 cadrent déjà la résolution référentielle et la consolidation rang/sources de la vue Talents.
- Le cadrage dédié recommande un diagnostic centré sur les cas où un `talentId` ne retrouve aucun talent référentiel.
- Le besoin restant n'est pas d'ajouter une nouvelle UI, mais de rendre les échecs de résolution lisibles sans noyer les logs normaux.

## 4. Décisions d'architecture

- Le diagnostic doit rester dans la préparation de contexte de la fiche, jamais dans `templates/sheets/actor/talents.hbs`.
- Un warning ne doit être émis que lorsqu'une entrée consolidée retombe réellement sur le fallback non résolu.
- Le payload de diagnostic doit rester borné à des informations utiles : acteur, `talentId`, identifiants de source, clés tentées et aperçu limité du référentiel si nécessaire.
- Le comportement visuel dégradé (`Unknown Talent`, `Unspecified`, sources conservées) reste inchangé.

## 5. Plan de travail

1. Identifier le maillon exact de la chaîne de préparation des talents consolidés où une définition manquante devient une entrée `Unknown Talent`, ainsi que le contexte encore disponible à cet endroit.
2. Ajouter un diagnostic structuré pour les cas non résolus, avec les identifiants utiles au triage (`actorId`, `actorName`, `talentId`, source(s), clés tentées) et un bruit minimal en régime normal.
3. Vérifier que le fallback de rendu actuel reste strictement identique pour l'utilisateur final et qu'aucun warning n'est émis pour les talents correctement résolus.
4. Étendre les tests ciblés pour couvrir : cas non résolu avec warning exploitable, cas résolu sans warning, et maintien des sources / tags dégradés existants.

## 6. Fichiers probablement modifiés

- `module/applications/sheets/character-sheet.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

## 7. Tests attendus

- un talent non résolu conserve `Unknown Talent` et `Unspecified` tout en produisant un warning contenant les identifiants attendus ;
- un talent résolu n'émet pas de warning parasite ;
- les sources consolidées restent visibles même quand la définition du talent manque ;
- le diagnostic reste borné et n'exige pas de dump complet du référentiel talents.

## 8. Risques et mitigations

- **Logs trop verbeux** : limiter le diagnostic aux seuls échecs de résolution et borner les données annexes incluses.
- **Diagnostic insuffisant** : inclure les identifiants réellement utiles au rapprochement métier (`talentId`, source, acteur) plutôt qu'un message générique.
- **Régression d'affichage** : verrouiller par tests le maintien du fallback visuel actuel.

## 9. Critères d'arrêt

- un cas non résolu produit un diagnostic exploitable et ciblé ;
- les talents résolus n'ajoutent pas de bruit de logs ;
- le fallback visuel actuel de la vue consolidée reste inchangé ;
- le correctif reste borné à la vue consolidée des talents et à ses tests ciblés.
