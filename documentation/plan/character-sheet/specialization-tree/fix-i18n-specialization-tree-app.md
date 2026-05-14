# Fix i18n — Specialization Tree App

## Problème

La page d’arbre de spécialisation affiche les clés i18n brutes :

```html
SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE
````

Le JavaScript appelle des clés sous le namespace :

```js
SWERPG.TALENT.SPECIALIZATION_TREE_APP
```

Mais les fichiers de langue déclarent actuellement ces clés sous :

```json
"TALENT": {
  "SPECIALIZATION_TREE_APP": { ... }
}
```

Donc Foundry ne trouve pas les clés attendues.

## Objectif

Ne pas modifier le JavaScript.

Corriger uniquement les fichiers de langue pour que les clés attendues existent bien sous :

```json
"SWERPG": {
  "TALENT": {
    ...
  }
}
```

## Fichiers concernés

```txt
lang/en.json
lang/fr.json
```

## Correction à faire

Dans `en.json` et `fr.json`, déplacer le bloc :

```json
"TALENT": {
  ...
}
```

à l’intérieur du bloc :

```json
"SWERPG": {
  ...
}
```

Le résultat attendu doit être :

```json
{
  "SWERPG": {
    "Base": "...",
    "Bonus": "...",
    "Rules": "...",
    "Scaling": "...",
    "Scaled": "...",
    "SHEETS": {
      ...
    },
    "TALENT": {
      "FIELDS": {
        ...
      },
      "ACTIVE": "...",
      "PASSIVE": "...",
      "UNSPECIFIED": "...",
      "RANKED": "...",
      "NON_RANKED": "...",
      "RANK": "...",
      "UNKNOWN": "...",
      "UNKNOWN_SOURCE": "...",
      "SOURCE_SPECIALIZATION_WITHOUT_TREE": "...",
      "SOURCE_INCOMPLETE": "...",
      "SOURCES": "...",
      "VIEW_SPECIALIZATION_TREES": "...",
      "SPECIALIZATION_TREE_APP": {
        "TITLE": "...",
        "SUBTITLE": "...",
        "UNKNOWN_ACTOR": "...",
        "UNKNOWN_SPECIALIZATION": "...",
        "VIEWPORT_ARIA_LABEL": "...",
        "STATUS": {
          "AVAILABLE": "...",
          "UNRESOLVED": "...",
          "INCOMPLETE": "..."
        },
        "NODE_STATE": {
          "PURCHASED": "...",
          "AVAILABLE": "...",
          "LOCKED": "...",
          "INVALID": "..."
        },
        "REASON": {
          "ALREADY_PURCHASED": "...",
          "SPECIALIZATION_NOT_OWNED": "...",
          "TREE_NOT_FOUND": "...",
          "TREE_INCOMPLETE": "...",
          "NODE_NOT_FOUND": "...",
          "NODE_INVALID": "...",
          "NODE_LOCKED": "...",
          "NOT_ENOUGH_XP": "...",
          "UNKNOWN": "..."
        },
        "TOOLTIP": {
          "XP_COST": "...",
          "TYPE": "...",
          "RANKED": "...",
          "NON_RANKED": "...",
          "STATE": "...",
          "REASON": "..."
        },
        "EMPTY": {
          "NO_ACTOR_TITLE": "...",
          "NO_ACTOR_DESCRIPTION": "...",
          "NO_SPECIALIZATIONS_TITLE": "...",
          "NO_SPECIALIZATIONS_DESCRIPTION": "...",
          "NO_AVAILABLE_TREE_TITLE": "...",
          "NO_AVAILABLE_TREE_DESCRIPTION": "..."
        }
      }
    }
  }
}
```

## Exemple FR attendu

```json
"SWERPG": {
  "TALENT": {
    "UNKNOWN": "Talent inconnu",
    "UNKNOWN_SOURCE": "Source inconnue",
    "SOURCE_SPECIALIZATION_WITHOUT_TREE": "Spécialisation sans arbre disponible",
    "SOURCE_INCOMPLETE": "Source incomplète",
    "SOURCES": "Sources",
    "VIEW_SPECIALIZATION_TREES": "Voir les arbres de spécialisation",
    "SPECIALIZATION_TREE_APP": {
      "TITLE": "Arbres de spécialisation : {actor}",
      "SUBTITLE": "Viewport graphique dédié aux arbres de spécialisation possédés.",
      "UNKNOWN_ACTOR": "Acteur inconnu",
      "UNKNOWN_SPECIALIZATION": "Spécialisation inconnue",
      "VIEWPORT_ARIA_LABEL": "Viewport graphique des arbres de spécialisation",
      "STATUS": {
        "AVAILABLE": "Arbre disponible",
        "UNRESOLVED": "Arbre non résolu",
        "INCOMPLETE": "Arbre incomplet"
      },
      "NODE_STATE": {
        "PURCHASED": "Acheté",
        "AVAILABLE": "Disponible",
        "LOCKED": "Verrouillé",
        "INVALID": "Invalide"
      },
      "REASON": {
        "ALREADY_PURCHASED": "Déjà acheté",
        "SPECIALIZATION_NOT_OWNED": "Spécialisation non possédée",
        "TREE_NOT_FOUND": "Arbre de référence introuvable",
        "TREE_INCOMPLETE": "Arbre de référence incomplet",
        "NODE_NOT_FOUND": "Nœud introuvable dans l'arbre",
        "NODE_INVALID": "Données du nœud invalides",
        "NODE_LOCKED": "Prérequis non remplis",
        "NOT_ENOUGH_XP": "XP insuffisants",
        "UNKNOWN": "Raison inconnue"
      },
      "TOOLTIP": {
        "XP_COST": "Coût",
        "TYPE": "Type",
        "RANKED": "Talent à rangs",
        "NON_RANKED": "Talent sans rang",
        "STATE": "État",
        "REASON": "Raison"
      },
      "EMPTY": {
        "NO_ACTOR_TITLE": "Aucun acteur sélectionné",
        "NO_ACTOR_DESCRIPTION": "Ouvrez cette application depuis une fiche personnage pour consulter les arbres de spécialisation possédés.",
        "NO_SPECIALIZATIONS_TITLE": "Aucune spécialisation possédée",
        "NO_SPECIALIZATIONS_DESCRIPTION": "Ce personnage ne possède actuellement aucune spécialisation à afficher.",
        "NO_AVAILABLE_TREE_TITLE": "Aucun arbre de spécialisation disponible",
        "NO_AVAILABLE_TREE_DESCRIPTION": "Les spécialisations possédées ont bien été trouvées, mais aucune ne se résout actuellement vers un arbre référentiel complet."
      }
    }
  }
}
```

## Attention

Ne pas créer un second bloc `SWERPG` plus bas dans le fichier.

Ne pas laisser deux blocs `TALENT` concurrents :

```json
"TALENT": { ... }
```

et :

```json
"SWERPG": {
  "TALENT": { ... }
}
```

Sinon tu risques d’avoir une dette i18n ambiguë.

## Test manuel

Après correction :

1. relancer Foundry ou recharger le monde ;
2. ouvrir la fiche personnage ;
3. ouvrir la page d’arbre de spécialisation ;
4. vérifier que les textes affichés sont traduits.

Résultat attendu :

```txt
Arbres de spécialisation : <nom acteur>
Viewport graphique dédié aux arbres de spécialisation possédés.
Arbre disponible
```

au lieu de :

```txt
SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE
```
