# Character Sheet — Localiser entièrement les chaînes UI de l'inventaire

**Issue** : [#630 — Localiser entièrement les chaînes UI de l'inventaire](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/630)

## Objectif

Supprimer les dernières chaînes UI d’inventaire codées en dur dans la feuille personnage afin que l’onglet `Inventory` rende des libellés, tooltips et hints cohérents en anglais comme en français.

## Décisions de cadrage

- Le périmètre est limité à l’onglet inventaire de la feuille personnage : libellés de sections, actions visibles et hint d’état vide déjà identifié.
- Les chaînes localisées doivent exister dans `lang/en.json` et `lang/fr.json` avec une formulation joueur cohérente ; le correctif ne doit pas dépendre de fallback implicites en anglais.
- La correction doit viser les points de définition les plus centraux du flux inventaire existant : préparation de sections côté sheet et attributs `data-tooltip`/libellés du template.

## Étapes d’implémentation

### 1. Recenser et brancher toutes les chaînes d’inventaire encore en dur sur des clés i18n dédiées

**Fichiers cibles** : `module/applications/sheets/base-actor-sheet.mjs`, `templates/sheets/actor/inventory.hbs`, `lang/en.json`, `lang/fr.json`

**What**

- remplacer les libellés codés en dur encore utilisés par le flux inventaire (`Equipment`, `Backpack`, actions `Equip Item`, `Edit Item`, `Delete Item`, `Create Item`, et toute autre microcopy visible de ce template) par des clés i18n explicites ;
- corriger le hint vide d’équipement déjà repéré comme non traduit en s’assurant que la clé française n’embarque plus de texte anglais ;
- vérifier si les clés existantes `ACTOR.LABELS.*` couvrent correctement le besoin ou s’il faut introduire un sous-ensemble plus précis pour les actions d’inventaire, sans dupliquer inutilement des libellés déjà canoniques.

**Validation visée** : aucun contrôle visible de l’onglet inventaire ne dépend encore d’une chaîne anglaise hardcodée dans le code ou le template.

### 2. Verrouiller la non-régression de localisation sur la préparation de contexte et le rendu de l’onglet

**Fichiers cibles** : `tests/applications/sheets/base-actor-sheet.test.mjs` _(et tout test de rendu inventory plus ciblé si nécessaire)_

**What**

- ajouter des assertions ciblées sur les libellés de sections d’inventaire préparés par la sheet et sur les tooltips/actions exposés au rendu ;
- couvrir explicitement au moins un cas en anglais et un cas en français pour le hint vide d’équipement et les actions principales ;
- vérifier que le correctif reste limité à l’inventaire et n’altère pas le comportement existant des autres onglets de la feuille.

**Validation visée** : les libellés et hints corrigés sont présents dans les deux langues et le rendu anglais historique reste intact.

## Résultat attendu

- l’onglet inventaire n’affiche plus de chaîne UI en anglais lorsqu’il est consulté en français ;
- les actions et sections de l’inventaire reposent sur des clés i18n explicites et maintenables ;
- une non-régression documente la couverture bilingue minimale attendue pour cette UI.
