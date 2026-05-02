# Chantier 4 — Enrichissement du HTML des compétences (badges C/S, coût, rang)

## Objectif
Modifier le template de ligne de compétence pour afficher les nouvelles informations.

## Fichiers probablement concernés
- `templates/sheets/partials/character-skill.hbs`
- `styles/actor.less` (ou `styles/swerpg.css`) pour les nouvelles classes

## Travail à faire
1. Ajouter la classe `skill__rank` avec `{{rank.value}}/5`.
2. Ajouter la classe `skill__cost` (afficher `nextCost` XP ou `FREE`).
3. Remplacer l'icône `career-and-speciality` par des badges explicites `C` et `S` (`.skill-tag--career`, `.skill-tag--specialization`).
4. Ajouter les attributs `data-skill-next-cost`, `data-skill-can-purchase`, `data-skill-is-free`.

## Critères d'acceptation
- Chaque ligne affiche le coût du prochain rang (ou FREE).
- Les badges C et S identifient clairement les compétences carrière/spécialisation.
- Le rendu global reste lisible.

## Risques / points de vigilance
- Ne pas casser la structure `data-action="toggleTrainedSkill"` sur les pips.
- Le HTML doit rester compatible avec le CSS existant.

## Commande de test ou vérification manuelle
Ouvrir la fiche personnage, vérifier l'affichage de plusieurs compétences (carrière, spécialisation, hors carrière).
