---
title: 'ADR-0009: Sous-système canonique de légalité des objets (system.restrictionLevel)'
status: 'Accepted'
date: '2026-05-07'
authors: 'Hervé Darritchon'
tags: [ 'architecture', 'data-model', 'items', 'legality', 'restriction', 'import-oggdude', 'ui' ]
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** — Cette décision formalise les choix d'architecture issus de l'issue #16 pour la gestion de la légalité des objets dans SWERPG. Elle sert de référence pour le schéma, les imports OggDude, l'UI et les futures mécaniques liées aux restrictions légales.

## Context

Les données OggDude indiquent si un objet est restreint via un champ `Restricted` (ex. `<Restricted>true</Restricted>` dans `Weapon.xml` ou `Armor.xml`).

Dans SWERPG, cette information existe aujourd'hui sous des formes incohérentes :

- pour les **armes**, l'import OggDude renseigne `system.restricted` comme booléen,
- pour les **armures**, l'import renseigne `system.restricted` comme booléen **et** ajoute `restricted` dans `system.qualities`,
- le schéma de base des Items ne définit pas encore de champ canonique pour la légalité,
- l'UI n'expose pas de convention transverse stable pour visualiser ou filtrer les objets restreints.

Cette situation pose plusieurs problèmes :

- absence de contrat de schéma clair pour tous les types d'Items,
- duplication de sens entre booléen, qualité et affichage,
- impossibilité de faire évoluer proprement vers un sous-système de légalité / contrainte,
- difficulté à proposer des filtres ou badges UI cohérents.

Le besoin identifié dans l'issue #16 est de faire de cette notion un concept métier officiel, exploitable par :

- les filtres de listes,
- les futures limitations d'achat / port / usage,
- les interactions avec talents, capacités ou statuts,
- les imports futurs au-delà d'OggDude.

## Decision

### D1 — `restrictionLevel` est un concept légal transverse

La légalité d'un objet est un concept transverse au système, applicable à tous les Items pertinents, au minimum :

- `weapon`
- `armor`
- `gear`

Les futurs types d'Items physiques ou équipables peuvent adopter le même champ si la notion de légalité leur est applicable.

`restrictionLevel` n'est pas un simple indicateur visuel. C'est un **hook officiel** pour :

- filtres et tris,
- règles d'acquisition,
- restrictions de port ou d'usage,
- futures mécaniques de légalité / marché noir / autorisations,
- interactions futures avec talents, capacités ou statuts.

### D2 — Source de vérité unique : `system.restrictionLevel`

La légalité d'un objet est stockée **uniquement** dans :

```javascript
system.restrictionLevel
```

Ce champ devient la source de vérité canonique.

Règles :

- `system.restrictionLevel` remplace le booléen historique `system.restricted`,
- `restricted` **n'est pas** une qualité d'objet,
- `restricted` **ne doit pas** vivre dans `system.qualities`,
- `restricted` **ne doit pas** vivre dans `system.properties`,
- les badges, tags et filtres UI dérivent de `system.restrictionLevel`.

### D3 — Enum canonique fermée

La V1 retient une enum fermée de quatre niveaux :

| Clé          | Label       | Description métier                                      |
|--------------|-------------|---------------------------------------------------------|
| `none`       | Aucune      | Objet libre, sans contrainte légale particulière        |
| `restricted` | Restreinte  | Objet nécessitant une autorisation, un permis ou accord |
| `military`   | Militaire   | Objet réservé à un usage, circuit ou profil militaire   |
| `illegal`    | Illégale    | Objet illicite, de contrebande ou pénalement exposé     |

Règles :

- `none` est la valeur par défaut,
- l'enum est fermée en V1,
- toute extension future (ex. `licensed`, `imperial`, `black-market`) devra faire l'objet d'un amendement ADR ou d'une nouvelle ADR.

### D4 — Mapping OggDude minimal et conservation des données brutes

OggDude ne fournit aujourd'hui qu'une information booléenne `Restricted`. Le mapping canonique est donc minimal :

| Valeur OggDude | `system.restrictionLevel` |
|----------------|---------------------------|
| `false`        | `none`                    |
| `true`         | `restricted`              |

Comme pour les ADR-0007 et ADR-0008, les données brutes OggDude doivent être conservées dans `flags.swerpg.oggdude` pour traçabilité :

```javascript
flags.swerpg.oggdude = {
  restricted: true,
}
```

Règles :

- la valeur brute OggDude est conservée sans interprétation supplémentaire,
- l'import ne doit pas inventer automatiquement `military` ou `illegal`,
- si une future source d'import expose une granularité plus riche, elle devra être mappée vers l'enum canonique SWERPG.

### D5 — Stratégie de migration depuis l'existant

Le système doit migrer depuis les formes existantes vers la nouvelle source de vérité.

Règles de migration :

- `system.restricted === true` → `system.restrictionLevel = 'restricted'`
- `system.restricted === false` → `system.restrictionLevel = 'none'`
- `system.restricted` absent → `system.restrictionLevel = 'none'`

Règles complémentaires :

- le champ historique `system.restricted` doit être supprimé à terme,
- la pseudo-qualité `restricted` actuellement injectée dans les armures doit être supprimée,
- tout affichage qui dépendait d'un booléen `restricted` doit être rebranché sur `restrictionLevel`.

### D6 — Implications UI

Le niveau de proéminence retenu est **moyen** :

- badge discret dans les listes (inventaires, compendia, sélecteurs),
- affichage visible dans la fiche de l'objet,
- pas de signal visuel agressif ou envahissant en V1.

Règles UI :

- un objet `none` peut ne rien afficher ou afficher un état neutre discret selon le contexte,
- un objet `restricted`, `military` ou `illegal` doit être identifiable sans ouvrir la fiche,
- l'UI doit pouvoir proposer à terme un filtre du type « afficher / masquer les objets restreints »,
- les labels et couleurs doivent être dérivés d'une configuration centrale.

### D7 — Gouvernance

SWERPG fait autorité sur sa taxonomie légale :

- les champs système sont normalisés,
- les imports externes sont mappés vers le modèle canonique,
- les valeurs brutes source sont conservées en flags,
- aucune source externe ne dicte directement le schéma applicatif.

## Options

### O1 — Conserver un booléen simple `system.restricted`

- **Description** : garder `system.restricted: true | false`.
- **Avantages** : implémentation immédiate, lecture simple.
- **Inconvénients** : bloque l'évolution vers des niveaux de légalité, schéma trop pauvre pour les besoins futurs.
- **Décision** : Rejetée — insuffisant pour le sous-système visé.

### O2 — Utiliser une qualité `restricted`

- **Description** : modéliser la légalité comme une qualité d'objet dans `system.qualities`.
- **Avantages** : homogénéité apparente avec d'autres tags.
- **Inconvénients** : confusion sémantique entre propriétés mécaniques et statut légal, duplication de sens, mauvais support des niveaux.
- **Décision** : Rejetée — `restricted` n'est pas une qualité.

### O3 — Double stockage (`system.restricted` + `system.restrictionLevel`)

- **Description** : conserver le booléen historique en parallèle du nouveau champ.
- **Avantages** : transition douce à court terme.
- **Inconvénients** : duplication, dérive de cohérence, ambiguïté sur la source de vérité.
- **Décision** : Rejetée — un seul champ canonique doit exister.

### O4 — Texte libre pour la légalité

- **Description** : stocker une chaîne libre de type `"black market"` ou `"imperial only"`.
- **Avantages** : flexibilité maximale.
- **Inconvénients** : pas de contrat stable pour schéma, UI, filtres ou règles métier.
- **Décision** : Rejetée — l'enum fermée V1 est préférée.

## Rationale

1. **Légalité ≠ qualité** : une qualité décrit une propriété ou un comportement de l'objet. La légalité décrit son statut normatif dans le monde. Les deux concepts ne doivent pas être mélangés.

2. **Préparation du futur sans sur-ingénierie** : une enum fermée à quatre niveaux couvre le besoin d'évolution sans imposer prématurément un sous-modèle plus lourd (licences détaillées, juridictions, factions, etc.).

3. **Cohérence transverse** : un même champ commun à tous les Items concernés simplifie schéma, UI, filtres, import et migration.

4. **Compatibilité avec OggDude** : OggDude ne fournit aujourd'hui qu'un booléen. Le mapping minimal `true → restricted` est le plus sûr, le plus lisible et le moins spéculatif.

5. **Traçabilité** : la conservation de la valeur brute source dans `flags.swerpg.oggdude.restricted` permet d'auditer ou de faire évoluer les mappings sans perte d'information.

## Impact

### Schéma Items (`module/models/physical.mjs`)

- ajout de `system.restrictionLevel` au schéma commun des Items physiques ou de la classe de base partagée pertinente,
- valeur initiale `none`,
- validation contre l'enum canonique.

### Config système (`module/config/system.mjs`)

- ajout d'une enum `RESTRICTION_LEVELS`,
- ajout des labels et métadonnées UI associées.

### Import OggDude weapon (`module/importer/items/weapon-ogg-dude.mjs`)

- remplacement de `system.restricted` par `system.restrictionLevel`,
- conservation de `flags.swerpg.oggdude.restricted`.

### Import OggDude armor (`module/importer/items/armor-ogg-dude.mjs`)

- remplacement de `system.restricted` par `system.restrictionLevel`,
- suppression de l'ajout de `restricted` dans `system.qualities`,
- conservation de `flags.swerpg.oggdude.restricted`.

### Import OggDude gear

- alignement sur la même stratégie si le champ `Restricted` est présent dans la source.

### UI / listes / fiches

- badges et filtres dérivés de `system.restrictionLevel`,
- suppression des dépendances directes à `system.restricted`.

### Migration

- migration des données existantes depuis `system.restricted`,
- suppression progressive des usages historiques.

## Security Considerations

- `restrictionLevel` est une enum fermée : les valeurs acceptées sont bornées et validées au niveau schéma.
- Les données brutes OggDude conservées en flags restent des données de traçabilité et ne doivent pas être interprétées dynamiquement comme du code ou du contenu fiable.

## Performance Considerations

- l'ajout d'un `StringField` supplémentaire a un coût négligeable,
- les filtres par niveau de restriction reposent sur une valeur simple et stable,
- la suppression de la duplication `restricted` comme qualité réduit les ambiguïtés sans coût runtime significatif.

## Review

Cette ADR doit être réévaluée après :

- l'implémentation de la config des niveaux de restriction,
- l'introduction du champ schéma canonique,
- l'alignement des imports weapon / armor / gear,
- les premiers travaux UI sur badges et filtres.

Une extension future de l'enum ou un passage à un sous-modèle plus riche devra faire l'objet d'un amendement ou d'une nouvelle ADR.

## Links

- Issue source : #16
- Issue ADR : #110
- Config enum : #111
- Schema : #112
- Import weapon : #113
- Import armor : #114
- Import gear : #115
- Weapon tags : #116
- UI fiche : #118
- UI listes : #119
- Migration : #120
- Cleanup armor : #121
- ADR taxonomie armes : `documentation/architecture/adr/adr-0007-weapon-taxonomy.md`
- ADR taxonomie armures : `documentation/architecture/adr/adr-0008-armor-taxonomy.md`
