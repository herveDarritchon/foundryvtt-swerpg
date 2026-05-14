# Fix follow-up — layout + taille + i18n arbre de spécialisation

## Problèmes restants

### 1. Layout / position
Les nœuds sont affichés mais mal positionnés dans le canvas :
- arbre trop décalé ;
- partie visible tronquée ;
- mauvais centrage dans la zone utile.

### 2. Taille
Les cartes de nœud semblent trop grandes / peu adaptées :
- largeur/hauteur peu cohérentes ;
- densité faible ;
- arbre difficile à lire.

### 3. i18n / résolution texte
Deux sous-problèmes :
- les clés d’UI ne sont pas localisées (`SWERPG.TALENT.SPECIALIZATION_TREE_APP.*`) ;
- les talents affichent `SWERPG.TALENT.UNKNOWN`, donc les labels des talents ne sont pas correctement résolus.

---

## Cause probable

### Layout / taille
Problème dans la logique de rendu :
- calcul des positions ;
- dimensions fixes des nœuds ;
- absence de `fit-to-view` / centrage initial ;
- viewport pas recalculé après rendu.

### i18n UI
Le template ou le renderer affiche les clés brutes au lieu d’appeler `game.i18n.localize(...)`.

### i18n talents
Les nœuds de l’arbre ne retrouvent pas correctement le talent associé :
- référence talent absente / incorrecte ;
- fallback vers `SWERPG.TALENT.UNKNOWN` ;
- ou nom/label non localisé.

---

## Correction attendue

### 1. Corriger l’i18n UI
Vérifier que tous les libellés de l’app passent bien par localisation.

À corriger pour :
- titre ;
- sous-titre ;
- labels de panneau ;
- tooltips ;
- états vides.

### 2. Corriger la résolution des talents des nœuds
Pour chaque nœud :
- retrouver le talent cible ;
- afficher son vrai nom ;
- ne plus afficher `SWERPG.TALENT.UNKNOWN` si la référence existe.

Fallback attendu :
- si talent introuvable, afficher un libellé de secours lisible du type `Unknown Talent`, pas une clé brute.

### 3. Corriger layout / position
Mettre en place :
- dimensions de nœud centralisées dans des constantes ;
- espacement horizontal/vertical centralisé ;
- calcul propre du bounding box global ;
- centrage initial de l’arbre dans le viewport ;
- si nécessaire, `fit to available area` au chargement.

### 4. Corriger la taille des nœuds
Réduire et homogénéiser :
- largeur ;
- hauteur ;
- padding ;
- taille de typo.

Objectif : afficher l’arbre complet de manière lisible sans impression de zoom excessif.

---

## TODO

1. Localiser toutes les clés UI `SWERPG.TALENT.SPECIALIZATION_TREE_APP.*`.
2. Remplacer tout affichage direct de clé par `game.i18n.localize(...)`.
3. Corriger la résolution du nom de talent dans chaque nœud.
4. Ne plus afficher `SWERPG.TALENT.UNKNOWN` si le talent existe.
5. En fallback, afficher `Unknown Talent` localisé, pas une clé brute.
6. Centraliser les constantes de rendu : `NODE_WIDTH`, `NODE_HEIGHT`, `ROW_GAP`, `COLUMN_GAP`.
7. Réduire la taille des nœuds pour tenir dans le panneau.
8. Calculer la bounding box réelle de l’arbre après layout.
9. Centrer automatiquement l’arbre dans le viewport au chargement.
10. Ajouter un padding de sécurité autour de l’arbre.
11. Éviter les positions négatives ou hors cadre non contrôlées.
12. Vérifier que le zoom initial permet de voir l’arbre complet.
13. Ajouter tests sur localisation UI.
14. Ajouter tests sur résolution des noms de talents.
15. Ajouter tests sur bounding box / centrage initial.

---

## Critères d’acceptation

- Le titre et les textes de l’app sont localisés.
- Les nœuds n’affichent plus `SWERPG.TALENT.UNKNOWN` si le talent existe.
- L’arbre est centré à l’ouverture.
- L’arbre tient visuellement dans la zone utile.
- Les nœuds ont une taille cohérente et lisible.

## Slug
fix-specialization-tree-layout-and-i18n