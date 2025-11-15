---
description: 'Mémoire localisation & intégrité i18n (structure JSON, clés, tests)'
applyTo: 'lang/*.json, templates/**/*.hbs, tests/**/*localization*.mjs'
---

# Localisation Memory

Optimiser l'ajout et la robustesse des clés i18n tout en préservant la validation JSON et la cohérence UI.

## Workflow ajout de nouvelles clés

1. Scanner la template cible (`grep SETTINGS.OggDudeDataImporter.loadWindow.stats`) pour éviter collisions (clé utilisée comme string vs objet).
2. Déterminer structure finale (objet ou valeur simple). Si une clé devient parent d'un nouvel objet, renommer la clé d'usage string (`preview` -> `previewButton`).
3. Ajouter d'abord les clés en anglais puis en français pour garder parité; ne pas laisser une langue désynchronisée dans un commit isolé.
4. Exécuter le test rapide `vitest run tests/importer/localization-oggdude.spec.mjs` avant la suite complète.

## Intégrité JSON

- Toujours valider la présence des virgules après insertion de blocs; préférer patch unique contenant ouverture + fermeture + virgule terminale.
- Éviter modifications partielles multi-commits qui laissent le fichier cassé (coût de feedback élevé).
- Utiliser un éditeur/CI avec lint JSON si disponible (future amélioration).

## Duplication de blocs OggDudeDataImporter (FR)

- Le fichier `fr.json` contient deux sections: `SETTINGS.OggDudeDataImporter` et `OggDudeDataImporter`. Tant que les deux sont consommées, injecter les nouvelles sous-clés dans les deux.
- Prévoir une future rationalisation: décider source unique et déprécier l'autre (ajouter tâche si amorcé).

## Emplacement des statuts domaine

- Les clés de statut doivent vivre sous `loadWindow.stats.status` (`title/pending/success/mixed/error`). Ne jamais insérer dans des objets métier non liés (`ACTION.FIELDS.target`).
- Raison: segmentation claire (statistiques vs configuration d'action), réduction risque de collision et parse errors.

## Tests localisation

- Tester existence des clés critiques (ex: `status.success`, `preview.title`, `progress.global`).
- Pour évolutivité, ajouter test structurel: vérifier que `status` est un objet avec les 5 sous-clés attendues dans chaque langue.

## Prévention collisions de clé

- Avant ajout d'un sous-objet, faire une recherche: `grep -R "localize .*<clé parent>" templates/`.
- Si trouvé utilisé comme texte, migrer usage vers `<clé>Label` ou `<clé>Button` et introduire l'objet sous `<clé>`.

## Bonnes pratiques Handlebars & i18n

- Toujours passer par `_prepareContext()` pour assembler les chemins dynamiques; éviter helpers non standard qui compliquent la localisation.
- Ne pas mettre de logique de fallback complexe dans la template; gérer fallback des clés manquantes côté JS et loguer via `logger.warn`.

## Recovery rapide après JSON cassé

1. Localiser la position du parse error (offset ou ligne dans stack vitest).
2. Ouvrir portion fautive (lecture ciblée 30–50 lignes). Vérifier accolades/virgules.
3. Reconstituer l'objet complet et relancer test localisation isolé.
4. Une fois vert, relancer test suite complète.

## Evolution future

- Introduire script de validation: vérifie parité des clés entre `en.json` et `fr.json` + absence de collisions clé/objet.
- Ajouter test snapshot minimal de l'arbre i18n critique pour l'importer (dommages collatéraux détectés tôt).
