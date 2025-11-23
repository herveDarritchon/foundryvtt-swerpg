# Guide de Test - Correction Import Specializations

## 🎯 Objectif
Valider que l'import des spécialisations OggDude fonctionne correctement après la correction du bug UI.

---

## 📋 Pré-requis

1. ✅ Archive OggDude contenant des spécialisations (`Data/Specializations/*.xml`)
2. ✅ Foundry VTT version 13 lancé
3. ✅ Système SWERPG activé
4. ✅ Console DevTools ouverte (F12)

---

## 🚀 Procédure de Test

### Étape 1: Préparation
1. **Redémarrer Foundry VTT** (important pour charger les nouveaux fichiers)
2. **Vider le cache navigateur**: 
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`
3. **Ouvrir la console DevTools**: Appuyer sur `F12`
4. **Aller dans Settings > Configure Settings > System Settings**
5. **Cliquer sur "Import OggDude Data"**

### Étape 2: Sélection du Fichier
1. **Cliquer sur "Select File"**
2. **Choisir votre archive OggDude ZIP**
3. **Vérifier** que le nom du fichier s'affiche

### Étape 3: Sélection du Domaine
1. **Décocher tous les domaines**
2. **Cocher UNIQUEMENT "Load Specialization data"** ✅
3. **Vérifier** que la case est bien cochée (orange)

### Étape 4: Lancement de l'Import
1. **Cliquer sur le bouton "Load"** (icône Jedi)
2. **Observer la barre de progression** (doit passer de 0% à 100%)
3. **Attendre la fin de l'import** (message de complétion ou disparition du spinner)

### Étape 5: Vérification des Résultats

#### ✅ Vérification 1: Tableau des Statistiques
**Où**: Section "Import Statistics" (si ouverte, sinon cliquer pour déplier)

**Attendu**:
- [ ] Une ligne **"Load Specialization data"** est visible
- [ ] Colonne **"Total"** affiche un nombre >0
- [ ] Colonne **"Imported"** affiche un nombre >0
- [ ] Colonne **"Rejected"** affiche 0 ou un petit nombre
- [ ] Icône de statut: ✓ (vert) si tout importé, ou ⚠ (jaune) si mixte

**Exemple de ligne attendue**:
```
Status | Domain                      | Total | Imported | Rejected | Duration
✓      | Load Specialization data    | 25    | 25       | 0        | 1.2 s
```

#### ✅ Vérification 2: Dossier Foundry
**Où**: Onglet "Items" (barre latérale gauche)

**Attendu**:
- [ ] Un dossier **"Swerpg - Specializations"** est visible
- [ ] Le dossier contient des Items (nombre = valeur "Imported" du tableau)

**Comment vérifier**:
1. Cliquer sur l'icône "Items" (📦) dans la barre latérale
2. Chercher le dossier "Swerpg - Specializations" dans la liste
3. Cliquer pour l'ouvrir
4. Vérifier la présence des Items (ex: "Pilot", "Marksman", etc.)

#### ✅ Vérification 3: Logs Console
**Où**: Console DevTools (F12 > onglet "Console")

**Logs attendus** (chercher avec Ctrl+F):

1. **Context prepared**:
```javascript
[OggDudeDataImporter] Context prepared {
  domainsCount: 8,
  domainsList: ["weapon", "armor", "gear", "species", "career", "talent", "obligation", "specialization"],
  hasSpecializationInStats: true,
  specializationStats: { total: 25, imported: 25, rejected: 0 }
}
```

2. **Pipeline initialization**:
```javascript
[ProcessOggDudeData] DIAGNOSTIC - Pipeline initialization {
  contextEntriesCount: 1,
  contextEntriesTypes: ["specialization"],
  hasSpecialization: true,
  specializationInEntries: true
}
```

3. **Building context**:
```javascript
[SpecializationImporter] Building Specialization context
[SpecializationImporter] Dataset size { count: 25 }
```

4. **Stats finales**:
```javascript
[SpecializationImporter] Statistiques après import {
  stats: { total: 25, imported: 25, rejected: 0, unknownSkills: 0 }
}
```

---

## ❌ Problèmes Courants

### Problème 1: Ligne "Load Specialization data" invisible
**Cause**: Cache navigateur non vidé  
**Solution**: 
1. Forcer le rechargement: `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows/Linux)
2. Redémarrer Foundry VTT

### Problème 2: Total/Imported affichent 0
**Cause**: Archive ZIP ne contient pas de spécialisations  
**Solution**: Vérifier le contenu de l'archive:
1. Extraire le ZIP manuellement
2. Vérifier la présence du dossier `Data/Specializations/`
3. Vérifier la présence de fichiers `.xml` dans ce dossier

### Problème 3: Items créés mais dossier invisible
**Cause**: Dossier créé mais vide ou filtré  
**Solution**:
1. Actualiser la vue Items (F5)
2. Vérifier les filtres de recherche (barre de recherche vide)
3. Scroller dans la liste des dossiers (peut être en bas)

### Problème 4: Erreur dans la console
**Exemple d'erreur**:
```
[ProcessOggDudeData] Domaine sans données, import ignoré { domain: "specialization" }
```

**Cause**: Fichiers XML mal formés ou répertoire vide  
**Solution**:
1. Vérifier la structure XML des fichiers
2. Chercher les logs d'erreur de parsing XML
3. Tester avec une archive OggDude de référence

---

## 📊 Résultat Attendu Final

### Avant la Correction ❌
```
Import Statistics
Status | Domain                  | Total | Imported | Rejected
○      | Load Armor data         | 0     | 0        | 0
○      | Load Weapons data       | 0     | 0        | 0
○      | Load Gear data          | 0     | 0        | 0
○      | Load Species data       | 0     | 0        | 0
○      | Load Career data        | 0     | 0        | 0
○      | Load Talent data        | 0     | 0        | 0
○      | Load Obligation data    | 0     | 0        | 0
(ligne specialization MANQUANTE)
```

### Après la Correction ✅
```
Import Statistics
Status | Domain                      | Total | Imported | Rejected | Duration
○      | Load Armor data             | 0     | 0        | 0        | -
○      | Load Weapons data           | 0     | 0        | 0        | -
○      | Load Gear data              | 0     | 0        | 0        | -
○      | Load Species data           | 0     | 0        | 0        | -
○      | Load Career data            | 0     | 0        | 0        | -
○      | Load Talent data            | 0     | 0        | 0        | -
○      | Load Obligation data        | 0     | 0        | 0        | -
✓      | Load Specialization data    | 25    | 25       | 0        | 1.2 s
```

**Et dans la liste des Items**:
```
📦 Items
  📁 Swerpg - Armors
  📁 Swerpg - Careers
  📁 Swerpg - Gears
  📁 Swerpg - Obligations
  📁 Swerpg - Species
  📁 Swerpg - Specializations ← NOUVEAU !
  📁 Swerpg - Talents
  📁 Swerpg - Weapons
```

---

## ✅ Checklist de Validation Complète

- [ ] Ligne "Load Specialization data" visible dans le tableau
- [ ] Colonnes Total/Imported/Rejected affichent des valeurs >0
- [ ] Icône de statut est ✓ (vert) ou ⚠ (jaune)
- [ ] Dossier "Swerpg - Specializations" créé dans Items
- [ ] Items visibles dans le dossier (même nombre que "Imported")
- [ ] Logs console montrent `hasSpecialization: true`
- [ ] Logs console montrent les stats finales avec total >0
- [ ] Barre de progression est passée à 100%
- [ ] Aucune erreur rouge dans la console

**Si tous les critères sont ✅ → Le bug est corrigé avec succès !**

---

## 🎓 Pour Aller Plus Loin

### Test de Régression (Recommandé)
Pour s'assurer qu'aucun autre domaine n'a été cassé:

1. **Décocher "Load Specialization data"**
2. **Cocher "Load Career data"**
3. **Lancer l'import**
4. **Vérifier** que la ligne "Load Career data" affiche des stats >0
5. **Vérifier** que le dossier "Swerpg - Careers" est créé

### Test Multi-Domaines
Pour valider l'import combiné:

1. **Cocher "Load Career data" ET "Load Specialization data"**
2. **Lancer l'import**
3. **Vérifier** que les 2 lignes affichent des stats >0
4. **Vérifier** que les 2 dossiers sont créés
5. **Vérifier** que la barre de progression passe à 2/2 (100%)

---

## 📞 Support

Si après ces tests, le problème persiste:

1. **Capturer les logs console**: Clic droit > "Save as..." dans l'onglet Console
2. **Faire une capture d'écran** du tableau des statistiques
3. **Noter** la version de Foundry VTT utilisée
4. **Fournir** l'archive OggDude utilisée (si possible)
5. **Ouvrir une issue** avec ces informations

---

**Bonne chance pour les tests ! 🚀**

