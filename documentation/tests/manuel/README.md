# Tests manuels — Index

Ce dossier contient les scénarios de tests manuels organisés par fonctionnalité du système **Star Wars Edge RPG (SWERPG)** pour Foundry VTT.

Chaque sous-dossier détaille les actions à effectuer et les résultats attendus sous forme de tableaux Action → Résultat.

---

## Familles de tests

| Famille | Description | Pages |
|---------|-------------|-------|
| [Personnage](personnage/README.md) | Création, espèces, carrières, spécialisations, caractéristiques, compétences, ressources, XP, audit log | ~30 scénarios |
| [Combat](combat/README.md) | Tours, attaque/défense, dégâts, résistances, effets de statut (23), DOT (13), héroïsme | ~35 scénarios |
| [Dés narratifs](des-narratifs/README.md) | StandardCheck, AttackRoll, pools boon/bane, dialogs, chat, socket | ~25 scénarios |
| [Import OggDude](import-oggdude/README.md) | Pipeline ZIP → parsing → mapping (11 domaines), stockage, erreurs | ~30 scénarios |
| [Talents](talents/README.md) | Arbre de talents (canvas PIXI), achat/suppression, ranked, hooks | ~20 scénarios |
| [Équipement](equipement/README.md) | Armes (7 catégories, 30 qualités), armures (5 catégories), gear, hard points | ~25 scénarios |
| [Véhicules](vehicules/README.md) | Adversary comme véhicule, armes vehicle, combat (partiellement implémenté) | ~10 scénarios |
| [UI Sheets](ui-sheets/README.md) | Sheets V1/V2, tabs, drag & drop, responsive, i18n, performances | ~30 scénarios |

---

## Résumé des counts

| Métrique | Valeur |
|----------|--------|
| Familles de test | 8 |
| Total scénarios documentés | ~200 |
| Statuts couverts | 23 |
| Types de dégâts | 12 |
| Qualités d'arme | 30 |
| Domaines d'import OggDude | 11 |
| Templates HBS | 56 |

---

## Comment utiliser ces documents

1. **Préparer un environnement de test** : monde Foundry avec le système `swerpg` activé, quelques acteurs et items de test.
2. **Choisir une famille** : sélectionner la fonctionnalité à tester.
3. **Suivre les tableaux** : chaque ligne est une action → résultat attendu.
4. **Cocher au fur et à mesure** : utiliser la [grille de test rapide](GRILLE_TEST_RAPIDE.md) pour le suivi.
5. **Signaler les anomalies** : toute différence entre le résultat attendu et le résultat observé est un bug à reporter.

---

## Environnement de test recommandé

- **Foundry VTT** v13+ (compatible jusqu'à v14)
- **Navigateurs** : Chrome/Chromium (primaire), Firefox (secondaire)
- **Résolutions** : 1920×1080 et 1366×768 minimum
- **Mode** : GM (la plupart des tests nécessitent les droits GM)
- **Build** : `pnpm run rollup && pnpm run less` avant de tester

---

## Guide de signalement d'anomalie

Toute anomalie constatée doit être signalée avec :

1. **Famille et scénario** : ex. "Personnage > 5.1 Augmentation de caractéristique"
2. **Action effectuée** : ce qui a été fait
3. **Résultat attendu** : ce qui devrait se produire
4. **Résultat observé** : ce qui s'est réellement produit
5. **Environnement** : navigateur, résolution, version du système
6. **Logs** : captures d'écran et/ou messages de la console développeur (F12)
