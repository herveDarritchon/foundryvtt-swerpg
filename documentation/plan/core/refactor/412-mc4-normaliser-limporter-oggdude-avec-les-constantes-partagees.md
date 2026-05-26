# MC4 — Normaliser l'importer OggDude avec les constantes partagées

**Issue** : [#412 — MC4 — Normaliser l'importer OggDude avec les constantes partagées](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/412)

## Objectif

Faire consommer à l'importer OggDude les constantes métier déjà centralisées par MC1 et MC3, afin de supprimer les derniers fallbacks codés en dur dans les mappers/importers ciblés sans changer le comportement fonctionnel de l'import.

## Décisions de cadrage

- Limiter le chantier aux fichiers explicitement listés par l'issue : `weapon-ogg-dude`, `armor-ogg-dude`, `career-ogg-dude`, `description-markup-utils` et `oggdude-talent-mapper`.
- Réutiliser en priorité les surfaces déjà partagées (`SYSTEM.WEAPON.*`, `SYSTEM.ARMOR.*`, `SYSTEM.DEFAULT_RESTRICTION_LEVEL`, `SYSTEM.RESTRICTION_LEVELS`, `SYSTEM.TALENT_ACTIVATION`, `SYSTEM.SKILLS.MAX_RANK*`) au lieu d'introduire un registre spécifique à l'importer.
- Si une constante manque encore pour un cas prouvé par l'issue, l'ajouter dans le module métier canonique déjà cohérent avec son domaine, pas dans le code d'import.
- Exclure du périmètre toute refonte de taxonomie OggDude, de pipeline d'import ou de comportement métier au-delà du déplacement du point de vérité.

## Étapes d’implémentation

### 1. Aligner les fallbacks métier du weapon/armor importer sur la config partagée

**Fichiers cibles** : `module/importer/items/weapon-ogg-dude.mjs`, `module/importer/items/armor-ogg-dude.mjs`, plus config métier ciblée uniquement si une constante manque (`module/config/weapon.mjs`, `module/config/armor.mjs`, `module/config/items.mjs`, `module/config/system.mjs`)

**What**

- remplacer les defaults locaux encore en dur (`rangedLight`, `medium`, `mainhand`, `restricted` / `none`, catégorie armor de repli) par les constantes déjà exposées par le domaine ;
- aligner les bornes et valeurs de fallback métier sur les modules `config` déjà consommés par les modèles/documents ;
- conserver strictement les tables de mapping OggDude et les règles de fallback actuelles, seule la source des valeurs change.

**Validation visée** : les imports weapon/armor gardent les mêmes sorties, mais leurs valeurs métier par défaut proviennent désormais de constantes partagées.

### 2. Supprimer les duplications de bornes/defaults dans career, description et talent

**Fichiers cibles** : `module/importer/items/career-ogg-dude.mjs`, `module/importer/utils/description-markup-utils.mjs`, `module/importer/mappers/oggdude-talent-mapper.mjs`

**What**

- faire converger `freeSkillRank` (défaut, min/max, limites de liste) sur les constantes déjà centralisées au lieu de conserver des `4` / `8` dupliqués ;
- réutiliser le helper partagé de description/source au lieu de garder des implémentations parallèles portant les mêmes bornes et defaults ;
- remplacer les defaults talent encore en dur (`unspecified`, source d'import par défaut, tier diagnostic de repli) par des points de vérité partagés ou un helper ciblé si aucun point canonique n'existe encore.

**Validation visée** : les importers career/talent et les utilitaires de description n'embarquent plus de valeurs métier partagées codées en dur sur ce périmètre.

### 3. Verrouiller les contrats d'import ciblés

**Fichiers cibles** : `tests/importer/weapon-import.spec.mjs`, `tests/importer/armor-import.integration.spec.mjs` ou `tests/importer/armor-import-mapping.spec.mjs`, `tests/importer/career-ogg-dude.spec.mjs`, `tests/importer/talent-mapper.spec.mjs`, `tests/importer/utils/description-markup-utils.test.mjs`, tests `config` associés si une nouvelle constante canonique est créée

**What**

- ajuster les assertions pour prouver que les fallbacks passent par les constantes partagées attendues ;
- couvrir au minimum un cas représentatif par domaine : restriction weapon/armor, `freeSkillRank` carrière, activation talent, limite/section source des descriptions ;
- ajouter un contrat `tests/config/*` minimal seulement si MC4 doit compléter une surface canonique absente.

**Validation visée** : toute réintroduction future de defaults métier codés en dur dans l'importer OggDude devient observable et détectable.

## Résultat attendu

- L'importer OggDude consomme les constantes métier déjà partagées par la codebase au lieu de recopier ses propres defaults.
- Les duplications entre importers et utilitaires communs sont réduites au strict nécessaire.
- Le comportement fonctionnel de l'import reste inchangé ; seule la source de vérité des valeurs métier est normalisée.
