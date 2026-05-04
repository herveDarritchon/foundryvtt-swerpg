# Guide de Test Manuel - Couleurs des Dossiers OggDude

## Objectif

Valider que les dossiers créés lors de l'import OggDude ont les bonnes couleurs selon le type d'objet.

## Prérequis

- Foundry VTT v13 avec le système SWERPG installé
- Un fichier ZIP d'export OggDude de test contenant plusieurs types d'objets (armes, armures, équipement, carrières, talents, etc.)
- Recommandation : utiliser `resources/oggdude-data.zip` si disponible

## Procédure de Test

### Test 1: Import initial et création des dossiers avec couleurs

1. **Préparer un monde de test**
   - Créer un nouveau monde Foundry ou utiliser un monde de test existant
   - S'assurer qu'aucun dossier `OggDude` n'existe dans les Items

2. **Lancer l'import OggDude**
   - Aller dans les Settings du système SWERPG
   - Cliquer sur "Import OggDude Data"
   - Sélectionner votre fichier ZIP de test
   - Cocher plusieurs domaines (au minimum : Weapons, Armor, Gear, Careers, Talents)
   - Lancer l'import

3. **Vérifier la hiérarchie de dossiers**
   - Ouvrir la sidebar "Items"
   - Vérifier qu'un dossier racine `OggDude` existe (sans couleur ou couleur par défaut)
   - Vérifier que des sous-dossiers existent pour chaque type importé

4. **Vérifier les couleurs des dossiers**

   Vérifier visuellement que les couleurs correspondent au mapping attendu :

   | Dossier                   | Couleur attendue | Code hex | Description  |
   | ------------------------- | ---------------- | -------- | ------------ |
   | `OggDude/Weapons`         | Bleu hyperespace | #00a8ff  | Bleu vif     |
   | `OggDude/Armor`           | Vert sabre laser | #4cd137  | Vert vif     |
   | `OggDude/Gear`            | Orange rebelle   | #ffc312  | Orange vif   |
   | `OggDude/Careers`         | Rouge Sith       | #c23616  | Rouge foncé  |
   | `OggDude/Talents`         | Violet           | #9c88ff  | Violet/Mauve |
   | `OggDude/Species`         | Vert nature      | #44bd32  | Vert clair   |
   | `OggDude/Specializations` | Rouge-orange     | #e84118  | Rouge orangé |
   | `OggDude/Obligations`     | Orange foncé     | #f79f1f  | Orange doré  |
   | `OggDude/Duties`          | Bleu clair       | #0097e6  | Bleu cyan    |
   | `OggDude/Motivations`     | Jaune or         | #fbc531  | Jaune doré   |

   **Critères de succès** :
   - ✅ Chaque dossier a une couleur distincte
   - ✅ Les couleurs sont cohérentes avec la palette SWERPG
   - ✅ Le dossier racine `OggDude` n'a pas de couleur spécifique (ou couleur par défaut Foundry)

### Test 2: Ré-import ne crée pas de doublons ni ne change les couleurs

1. **Relancer un import avec les mêmes données**
   - Utiliser le même fichier ZIP
   - Cocher les mêmes domaines

2. **Vérifier qu'aucun doublon n'est créé**
   - ✅ Pas de dossiers `OggDude/OggDude/...`
   - ✅ Pas de doublons de dossiers `Weapons`, `Armor`, etc.

3. **Vérifier que les couleurs sont préservées**
   - ✅ Les couleurs des dossiers restent identiques

### Test 3: Couleur personnalisée par le GM n'est pas écrasée

1. **Changer manuellement la couleur d'un dossier**
   - Clic droit sur le dossier `OggDude/Weapons`
   - Modifier la configuration du dossier
   - Changer la couleur pour une couleur personnalisée (ex: rose #ff69b4)
   - Sauvegarder

2. **Relancer un import incluant des armes**
   - Importer à nouveau des données OggDude avec des armes

3. **Vérifier que la couleur personnalisée est préservée**
   - ✅ Le dossier `OggDude/Weapons` conserve la couleur rose personnalisée
   - ✅ Pas de réinitialisation automatique au bleu #00a8ff

### Test 4: Domaine inconnu utilise la couleur de fallback

1. **Importer un domaine non standard** (si possible)
   - Si le ZIP contient des types non mappés

2. **Vérifier le dossier `OggDude/Misc`**
   - ✅ Le dossier `Misc` est créé
   - ✅ Couleur : Bleu-gris #1b5f8c (fallback)

3. **Vérifier les logs console**
   - Ouvrir la console développeur (F12)
   - Chercher un message de type : `[OggDudeImportFolders] Domaine inconnu, utilisation du fallback`

### Test 5: Vérification des logs en production

1. **Ouvrir la console développeur** (F12)

2. **Effectuer un import complet**

3. **Vérifier la verbosité des logs**
   - ✅ Les messages `debug` ne doivent PAS apparaître en production
   - ✅ Seuls les messages `info` de création de dossiers doivent apparaître
   - ✅ Les messages `warn` ne doivent apparaître que pour les cas exceptionnels (domaine inconnu, erreur update)

4. **En mode développement** (si `CONFIG.debug.hooks = true`)
   - Les messages `debug` peuvent apparaître pour le diagnostic

## Critères de Validation Globale

✅ **Test 1 réussi** : Dossiers créés avec les bonnes couleurs  
✅ **Test 2 réussi** : Pas de doublons, couleurs préservées  
✅ **Test 3 réussi** : Couleurs personnalisées non écrasées  
✅ **Test 4 réussi** : Fallback fonctionne correctement  
✅ **Test 5 réussi** : Logs non verbeux en production

## Problèmes Potentiels et Solutions

### Problème : Les couleurs n'apparaissent pas

**Cause possible** : Thème Foundry personnalisé qui écrase les couleurs de dossiers  
**Solution** : Vérifier avec le thème par défaut de Foundry

### Problème : Couleurs différentes de celles attendues

**Cause possible** : Cache navigateur ou Foundry  
**Solution** : Faire Ctrl+F5 pour recharger sans cache

### Problème : Dossiers en doublon

**Cause possible** : Bug dans la logique de détection des dossiers existants  
**Solution** : Vérifier les logs et reporter le bug avec les détails

## Rapport de Test

**Date** : **\*\***\_\_\_**\*\***  
**Testeur** : **\*\***\_\_\_**\*\***  
**Version SWERPG** : **\*\***\_\_\_**\*\***  
**Version Foundry** : **\*\***\_\_\_**\*\***

| Test                          | Statut          | Observations |
| ----------------------------- | --------------- | ------------ |
| Test 1: Import initial        | ⬜ Pass ⬜ Fail |              |
| Test 2: Ré-import             | ⬜ Pass ⬜ Fail |              |
| Test 3: Couleur personnalisée | ⬜ Pass ⬜ Fail |              |
| Test 4: Fallback              | ⬜ Pass ⬜ Fail |              |
| Test 5: Logs                  | ⬜ Pass ⬜ Fail |              |

**Résultat Global** : ⬜ Validé ⬜ Non validé

**Notes supplémentaires** :

---

---

---
