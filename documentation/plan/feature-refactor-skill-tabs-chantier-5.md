# Chantier 5 — Transformation du bandeau XP en console d'achat

## Objectif

Remplacer le bandeau XP actuel par la structure `xp-console` prévue.

## Fichiers probablement concernés

- `templates/sheets/actor/skills.hbs`
- `styles/actor.less` (section `.swerpg .tab.skills .xp-console`)

## Travail à faire

1. Remplacer le bloc `point-pools` par la structure `xp-console` (header, stats, selection summary).
2. Utiliser les données `progression` déjà disponibles et les nouveaux champs du Chantier 3.
3. Ajouter les états CSS `is-idle`, `is-affordable`, `is-free`, `is-locked`, `is-error`.

## Critères d'acceptation

- La console affiche XP disponible, dépensé, choix gratuits restants.
- Le design reste cohérent avec la charte Star Wars/datapad.

## Risques / points de vigilance

Le bandeau actuel est entouré d'un `{{#if incomplete.skills}}`. Vérifier si cette condition reste applicable ou doit être ajustée.

## Commande de test ou vérification manuelle

Vérifier l'affichage de la console avec différents montants d'XP.
