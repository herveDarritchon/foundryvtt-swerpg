# Plan d'implémentation — #284 : Vue consolidée des talents — consolider le rang et les sources multiples

**Issue** : [#284 — Vue consolidée des talents : consolider le rang et les sources multiples](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/284)  
**ADR** : `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`  
**Plans de référence** : `documentation/plan/character-sheet/talent/191-plan-consolider-talents-possedes.md`, `documentation/plan/character-sheet/talent/192-plan-gerer-ranked-non-ranked-dupliques.md`, `documentation/plan/character-sheet/talent/197-plan-afficher-rangs-sources-onglet-talents.md`  
**Module(s) impacté(s)** : `module/lib/talent-node/owned-talent-summary.mjs`, `module/applications/sheets/character-sheet.mjs`, `tests/lib/talent-node/owned-talent-summary.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

---

## 1. Objectif

Garantir que la vue consolidée des talents affiche une seule entrée par `talentId`, avec le rang total correct pour les talents ranked et l'ensemble des sources uniques quand un même talent provient de plusieurs arbres ou spécialisations.

## 2. Périmètre

### Inclus

- vérifier où le rang consolidé ou les sources multiples se perdent entre la consolidation métier et l'adaptateur de fiche ;
- corriger la consolidation ou le mapping UI minimalement pour préserver `rank` et `sources` sur une seule ligne ;
- conserver les fallbacks existants pour les talents ou sources non résolus ;
- ajouter la couverture de tests ciblée sur ranked multi-sources, non-ranked multi-sources et cas dégradés.

### Hors scope

- modification de `actor.system.progression.talentPurchases` ;
- refonte visuelle du template talents ou du style ;
- import OggDude, migration de données ou ajout de nouveaux identifiants ;
- effets mécaniques des talents.

## 3. Constat sur l'existant

- `owned-talent-summary` est déjà la brique canonique pour regrouper les achats par `talentId`.
- Les plans US7, US8 et US13 fixent déjà le contrat attendu : un talent ranked conserve un rang consolidé, un non-ranked reste une seule ligne avec plusieurs sources possibles.
- L'issue #284 indique que ce contrat n'est pas restitué de manière fiable dans la vue consolidée actuelle, soit parce que la consolidation perd une partie des achats, soit parce que l'adaptateur sheet n'expose pas correctement `rank` et `sources`.

## 4. Décisions d'architecture

- `talentId` reste la clé unique de consolidation ; aucun regroupement par nom ne doit réapparaître.
- Le calcul du rang reste dans `owned-talent-summary` ; la fiche ne fait qu'afficher la valeur consolidée.
- Les sources affichées doivent être complètes et dédupliquées, sans masquer un fallback dégradé distinct si une résolution échoue.
- Le correctif doit rester limité à la chaîne `owned-talent-summary` -> `character-sheet` -> tests ciblés.

## 5. Plan de travail

1. Auditer la chaîne `talentPurchases` -> `owned-talent-summary` -> `#buildConsolidatedTalentList()` pour identifier l'étape exacte où le rang consolidé ou les sources multiples sont perdus.
2. Corriger le maillon minimal concerné pour garantir qu'un même `talentId` produit une seule entrée, avec `rank` total pour les ranked et toutes les sources uniques conservées.
3. Vérifier que les fallbacks actuels (`Unknown Talent`, `Unknown Source`, source partielle) restent inchangés pour les cas réellement non résolus.
4. Étendre les tests unitaires et sheet pour couvrir : ranked acheté plusieurs fois avec rang total visible, non-ranked acheté depuis plusieurs sources avec une seule ligne, et maintien du comportement dégradé quand une source ou une définition manque.

## 6. Fichiers probablement modifiés

- `module/lib/talent-node/owned-talent-summary.mjs`
- `module/applications/sheets/character-sheet.mjs`
- `tests/lib/talent-node/owned-talent-summary.test.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

## 7. Tests attendus

- un talent ranked acheté sur plusieurs nœuds / arbres produit une seule entrée avec le rang total attendu ;
- un talent non-ranked acheté depuis plusieurs spécialisations produit une seule entrée avec plusieurs sources dédupliquées ;
- la résolution d'un talent connu continue de fonctionner avec la consolidation ;
- un talent ou une source réellement introuvable conserve le fallback existant sans casser l'affichage.

## 8. Risques et mitigations

- **Régression sur les talents déjà résolus** : garder des tests qui combinent résolution de définition et consolidation multi-achats.
- **Perte d'information lors de la déduplication** : dédupliquer uniquement les libellés de sources, jamais les achats utiles au calcul du rang.
- **Élargissement de scope** : ne pas toucher au stockage acteur, au template ni à l'importer sans preuve que c'est nécessaire.

## 9. Critères d'arrêt

- la vue consolidée affiche bien une seule ligne par `talentId` concerné par l'issue ;
- le rang total des talents ranked correspond au nombre d'achats consolidés ;
- les sources multiples restent visibles et dédupliquées ;
- le correctif reste borné à la consolidation talents et à ses tests ciblés.
