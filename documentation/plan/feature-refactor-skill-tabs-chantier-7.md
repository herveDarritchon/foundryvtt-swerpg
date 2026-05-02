# Chantier 7 — Prévisualisation du pool de dés et finalisation CSS

## Objectif
Ajouter la prévisualisation du pool de dés positifs et finaliser les styles.

## Fichiers probablement concernés
- `templates/sheets/partials/character-skill.hbs` (ajouter `.skill__dice-preview`)
- `styles/actor.less` (styles des dés : `.die--ability`, `.die--proficiency`)
- `module/applications/sheets/character-sheet.mjs` (ajouter `dicePreview` dans la préparation)

## Travail à faire
1. Dans la préparation des données, ajouter `dicePreview` (appel à `getPositiveDicePoolPreview`).
2. Ajouter dans le template `.skill__dice-preview` avec les spans représentant les dés (jaunes + verts).
3. Finaliser les styles LESS pour la console XP, les lignes de compétence, et les dés.
4. Prévoir les variables LESS si elles n'existent pas déjà (ou utiliser les custom properties).

## Critères d'acceptation
- La prévisualisation des dés s'affiche (masquée par défaut, visible au survol ou dans la console).
- Les styles sont cohérents avec la charte Star Wars.
- Aucun autre onglet de la fiche n'est impacté.

## Risques / points de vigilance
Dernier chantier, peut nécessiter des ajustements visuels. Ne pas bloquer l'intégration principale si la donnée de caractéristique n'est pas facilement disponible.

## Commande de test ou vérification manuelle
- Vérifier que le pool de dés s'affiche correctement (ex: Agilité 3 + Distance légère 2 = 2 jaunes + 1 vert).
- Tester le rendu sur différentes largeurs d'écran.
