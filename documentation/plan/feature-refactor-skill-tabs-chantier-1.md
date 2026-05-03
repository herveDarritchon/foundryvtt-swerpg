# Chantier 1 — Audit et correction de l'anomalie Xenology

## Objectif

Corriger le bug d'affichage de la compétence Xenology et comprendre le flux de données actuel.

## Fichiers probablement concernés

- `module/config/attributes.mjs` (définition de `xenology`)
- `templates/sheets/partials/character-skill.hbs`
- `module/applications/sheets/character-sheet.mjs` (méthode `#prepareSkills`)

## Travail à faire

1. Vérifier dans `SYSTEM.SKILLS.xenology` que le `label` pointe vers la bonne clé de localisation.
2. Vérifier que `Piloting Planetary` n'est pas dupliqué dans les Lore Skills.
3. Corriger la source de données si nécessaire (ne pas corriger seulement le template).

## Critères d'acceptation

- La compétence `xenology` affiche "Xenology" ou "Xénologie" (selon la locale).
- Aucune régression sur les autres compétences.

## Risques / points de vigilance

Faible. Attention à ne pas casser la fusion `...SYSTEM.SKILLS[k]` dans `#prepareSkills`.

## Commande de test ou vérification manuelle

Ouvrir une fiche personnage, onglet Skills, vérifier l'étiquette de Xenology.
