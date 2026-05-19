# Plan d'implémentation — #284 : Vue consolidée des talents — consolider le rang et les sources multiples

**Issue** : [#284 — Vue consolidée des talents : consolider le rang et les sources multiples](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/284)
**ADR** : `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`
**Cadrage** : `documentation/cadrage/character-sheet/talent/cadrage-resolution-talents-unknown-vue-consolidee.md`, `documentation/cadrage/character-sheet/talent/04-ui-onglet-talents.md`
**Dépendance fonctionnelle** : `documentation/plan/character-sheet/talent/283-vue-consolidee-resoudre-talents-connus-referentiel.md`
**Module(s) probablement impacté(s)** : `module/lib/talent-node/owned-talent-summary.mjs`, `module/applications/sheets/character-sheet.mjs`, `tests/lib/talent-node/owned-talent-summary.test.mjs`, `tests/applications/sheets/character-sheet-talents.test.mjs`

---

## 1. Objectif

Garantir qu'un même talent acheté plusieurs fois reste affiché comme une seule entrée dans la vue consolidée, avec :

- le rang total correct pour les talents ranked ;
- toutes les sources utiles dédupliquées pour les achats multi-arbres ;
- aucun retour à des doublons visuels ou à une perte d'information de source.

## 2. Périmètre

### Inclus

- vérifier où la consolidation finale peut encore se casser entre le résumé métier et la projection fiche personnage ;
- regrouper strictement les achats par `talentId` canonique ;
- additionner le rang des talents ranked sans dupliquer les lignes ;
- dédupliquer et conserver les sources multiples dans un ordre stable ;
- ajouter des tests ciblés sur les cas multi-achats et multi-sources.

### Hors scope

- migration de données `talentPurchases` ;
- ajout de nouveaux identifiants persistés (`talentUuid`, cache, flags) ;
- refonte visuelle large de l'onglet Talents ;
- import OggDude, effets mécaniques ou Active Effects.

## 3. Constat de départ

- la vue consolidée doit déjà résoudre les talents connus via le référentiel (#283) ;
- le contrat attendu côté cadrage impose une seule entrée par talent, plusieurs sources si nécessaire, et un rang consolidé pour les ranked ;
- le défaut de l'issue #284 est donc probablement un écart d'agrégation ou de projection finale, pas un besoin de nouveau modèle métier.

## 4. Breakdown d'implémentation

### Feature — Stabiliser la consolidation finale des talents

#### Story 1 — Verrouiller l'agrégation métier rang / sources

1. Auditer le point de regroupement réel utilisé pour la vue consolidée afin de confirmer qu'il repose toujours sur `talentId` et non sur le nom affiché.
2. Corriger l'agrégation pour que :
   - un talent ranked cumule son `rank` sur tous les achats correspondants ;
   - un talent non-ranked reste une seule entrée ;
   - les sources multiples soient conservées puis dédupliquées sans écraser un cas valide.

#### Story 2 — Préserver cette consolidation dans la fiche personnage

3. Vérifier que `character-sheet.mjs` ne réintroduit pas de duplication lors de la préparation des données d'affichage.
4. Garantir que la projection UI consomme la structure consolidée telle quelle, sans recalcul concurrent du rang ni aplatissement des sources.

#### Test — Couvrir les cas critiques prouvés par l'issue

5. Étendre les tests pour couvrir au minimum :
   - talent ranked acheté plusieurs fois -> une seule entrée, rang total correct ;
   - talent non-ranked présent dans plusieurs arbres -> une seule entrée, plusieurs sources ;
   - sources identiques répétées -> pas de doublon visuel ;
   - talent non résolu -> fallback conservé sans casser la consolidation des autres entrées.

## 5. Fichiers probables

- `module/lib/talent-node/owned-talent-summary.mjs`
- `module/applications/sheets/character-sheet.mjs`
- `tests/lib/talent-node/owned-talent-summary.test.mjs`
- `tests/applications/sheets/character-sheet-talents.test.mjs`

## 6. Risques

- **Régression de regroupement** : une clé d'affichage remplace par erreur la clé métier `talentId`.
- **Perte de sources** : une déduplication trop agressive masque une provenance valide.
- **Double calcul** : le domaine consolide correctement mais la fiche reconstruit ensuite une vue divergente.

## 7. Critères d'arrêt

- un talent ranked multi-achats apparaît une seule fois avec le bon rang consolidé ;
- un talent multi-sources apparaît une seule fois avec ses sources utiles dédupliquées ;
- les cas non résolus gardent leur fallback sans régression sur les autres talents ;
- la consolidation reste centrée sur `talentId` et ne dérive pas vers une logique par nom affiché.
