# Tests manuels — Import OggDude

Tests de l'importateur de données OggDude : pipeline ZIP → parsing → mapping → création d'items Foundry.

---

## Prérequis

- Monde SWERPG avec droits GM
- Un fichier ZIP OggDude valide (export de OggDude Data Editor)
- Optionnel : compendiums configurés pour le stockage

---

## 1. Ouverture de l'importateur

### 1.1. Accès via les paramètres

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir Game Settings → Configure Settings | La fenêtre des paramètres s'affiche |
| Cliquer sur le bouton "Star Wars Edge RPG" | Les paramètres système s'affichent |
| Localiser la section "OggDude Data Importer" | La section est visible |
| Cliquer "Import data from OggDude" | La fenêtre `OggDudeDataImporter` s'ouvre |
| Vérifier que le bouton "OggDude Zip Data File" est présent | Le bouton de sélection de fichier est visible |

### 1.2. Upload du fichier ZIP

| Action | Résultat attendu |
|--------|------------------|
| Cliquer "OggDude Zip Data File" | Un sélecteur de fichier s'ouvre |
| Sélectionner un fichier `.zip` OggDude valide | Le fichier est chargé via `JSZip` |
| Vérifier que les données sont parsées | `OggDudeDataElement.from(zip)` extrait tous les éléments |
| Vérifier le groupement par répertoire et type | Les éléments sont organisés par domaine |

---

## 2. Domaines d'import

### 2.1. Sélection des domaines

L'importateur supporte 11 domaines :

| Domaine | Classe Builder | Fichier de mapping |
|---------|----------------|-------------------|
| weapon | `weapon-ogg-dude.mjs` | weapon-quality-map, weapon-skill-map, weapon-range-map... |
| armor | `armor-ogg-dude.mjs` | armor-category-map, armor-property-map |
| gear | `gear-ogg-dude.mjs` | gear-utils |
| species | `species-ogg-dude.mjs` | — |
| career | `career-ogg-dude.mjs` | career-skill-map |
| specialization | `specialization-ogg-dude.mjs` | — |
| talent | `talent-ogg-dude.mjs` | talent-node-map, talent-rank-map... |
| obligation | `obligation-ogg-dude.mjs` | — |
| motivation | `motivation-ogg-dude.mjs` | — |
| motivation-category | `motivation-category-ogg-dude.mjs` | — |
| duty | `duty-ogg-dude.mjs` | — |

| Action | Résultat attendu |
|--------|------------------|
| Cocher "weapon" uniquement | Seules les armes seront importées |
| Cocher tous les domaines | Tous les types seront importés |
| Décocher un domaine | Ce domaine est exclu de l'import |

---

## 3. Pipeline d'import

### 3.1. Parsing du ZIP

| Action | Résultat attendu |
|--------|------------------|
| Vérifier que tous les fichiers XML du ZIP sont parsés | `xml2js` convertit chaque fichier |
| Les fichiers mal formés sont ignorés avec un warning | Log d'erreur visible |

### 3.2. Mapping des données

Pour chaque élément importé :

| Action | Résultat attendu |
|--------|------------------|
| Les IDs OggDude sont traduits en IDs SWERPG via les fichiers de mapping | Mapping correct |
| Les qualités d'armes sont mappées (`oggdude-weapon-quality-map.mjs`) | Qualité correspondante trouvée |
| Les compétences sont mappées (`oggdude-skill-map.mjs`) | Skill ID correct |
| Les catégories d'armure sont mappées | Catégorie correcte |
| Les noeuds de talent sont mappés (`oggdude-talent-node-map.mjs`) | Node ID correct |

### 3.3. Création des items Foundry

| Action | Résultat attendu |
|--------|------------------|
| Pour chaque élément parsé, un item Foundry est créé | Item du type approprié |
| Vérifier les champs : name, img, system (type-specific) | Tous les champs sont renseignés |
| Vérifier la stratégie de stockage | `WorldItemStorageTarget` ou `CompendiumItemStorageTarget` selon la config |

---

## 4. Stratégies de stockage

### 4.1. Stockage dans le monde

| Action | Résultat attendu |
|--------|------------------|
| Sélectionner "Importer dans le monde" | Les items sont créés dans le répertoire des items du monde |
| Vérifier l'organisation des dossiers | Dossier racine "SWERPG OggDude Import" créé |
| Vérifier les sous-dossiers : "Actor Options" (careers, species, specializations, obligations, motivations, talents, duties) et "Equipments" (armors, gears, weapons) | Structure de dossiers correcte |

### 4.2. Stockage dans les compendiums

| Action | Résultat attendu |
|--------|------------------|
| Sélectionner "Importer dans les compendiums" | Les items sont créés dans des packs |
| Vérifier le nommage : `world.swerpg-{type}` | Pack créé avec le bon nom |
| Vérifier l'organisation des dossiers dans le compendium | Même structure que le stockage monde |

---

## 5. Import d'armes (weapon)

| Action | Résultat attendu |
|--------|------------------|
| Importer une arme du ZIP | Item de type `weapon` créé |
| Vérifier les champs : `skill`, `range`, `damage`, `crit`, `qualities` | Tous les champs sont mappés correctement |
| Vérifier les qualités : accurate, autoFire, breach, burn, blast... (30 qualités) | Chaque qualité est soit active avec rang, soit booléenne |
| Vérifier la catégorie d'arme : melee, ranged, gunnery, explosive, thrown, vehicle, natural | Catégorie correctement attribuée |
| Vérifier `hardPoints` et `equipped` | Valeurs par défaut ou mappées |

---

## 6. Import d'armures (armor)

| Action | Résultat attendu |
|--------|------------------|
| Importer une armure du ZIP | Item de type `armor` créé |
| Vérifier les champs : `defense.base`, `soak.base`, `qualities` | Champs corrects |
| Vérifier les propriétés d'armure : bulky, organic, sealed, full-body | Propriétés correctement mappées |
| Vérifier la catégorie : unarmored, light, medium, heavy, natural | Catégorie correcte |

---

## 7. Import d'équipement (gear)

| Action | Résultat attendu |
|--------|------------------|
| Importer un équipement du ZIP | Item de type `gear` créé |
| Vérifier les champs : `category`, `quantity`, `price`, `quality`, `restrictionLevel`, `encumbrance`, `rarity` | Champs corrects |

---

## 8. Import de talents (talent)

| Action | Résultat attendu |
|--------|------------------|
| Importer un talent du ZIP | Item de type `talent` créé |
| Vérifier : `node` (talent tree node), `isRanked`, `rank`, `activation`, `isFree` | Champs corrects |
| Vérifier le mapping du noeud de talent | `oggdude-talent-node-map.mjs` utilisé |
| Vérifier les actions associées au talent | Les actions sont créées dans `actions` |

---

## 9. Import d'espèces (species)

| Action | Résultat attendu |
|--------|------------------|
| Importer une espèce du ZIP | Item de type `species` créé |
| Vérifier les 6 caractéristiques (brawn, agility, intellect, cunning, willpower, presence) avec valeurs 1-5 | Caractéristiques correctes |
| Vérifier `woundThreshold`, `strainThreshold` (modifier + abilityKey) | Seuils corrects |
| Vérifier `startingExperience` (100-300) | XP de départ correct |
| Vérifier `freeSkills` et `freeTalents` | Listes correctes |

---

## 10. Import de carrières (career)

| Action | Résultat attendu |
|--------|------------------|
| Importer une carrière du ZIP | Item de type `career` créé |
| Vérifier `careerSkills` | Compétences de carrière correctement mappées |
| Vérifier `freeSkillRank` (0-8, défaut 4) | Rangs gratuits corrects |

---

## 11. Import de spécialisations (specialization)

| Action | Résultat attendu |
|--------|------------------|
| Importer une spécialisation du ZIP | Item de type `specialization` créé |
| Vérifier `specializationSkills` | Compétences de spécialisation correctes |
| Vérifier `freeSkillRank` (0-8, défaut 4) | Rangs gratuits corrects |

---

## 12. Import d'obligations/devoirs/motivations

### 12.1. Obligation

| Action | Résultat attendu |
|--------|------------------|
| Importer une obligation | Item `obligation` créé |
| Vérifier `value` (0-50, step 5) | Valeur correcte |
| Vérifier `isExtra`, `extraXp`, `extraCredits` | Champs optionnels corrects |

### 12.2. Duty

| Action | Résultat attendu |
|--------|------------------|
| Importer un devoir | Item `duty` créé |
| Vérifier `value` (0-50, step 5) | Valeur correcte |
| Vérifier `sources` (book, page) | Sources correctes |

### 12.3. Motivation

| Action | Résultat attendu |
|--------|------------------|
| Importer une motivation | Item `motivation` ou `motivation-category` créé |
| Vérifier `description` et `category` | Champs corrects |

---

## 13. Gestion des erreurs et reprise

### 13.1. Retry logic

| Action | Résultat attendu |
|--------|------------------|
| Simuler un échec d'import | `retry.mjs` tente 1 nouvelle tentative après 1000ms |
| Vérifier `global-import-metrics.mjs` | Les métriques d'import sont mises à jour (succès, échecs, durée) |

### 13.2. Fichier ZIP invalide

| Action | Résultat attendu |
|--------|------------------|
| Uploader un fichier non-ZIP | Message d'erreur : format invalide |
| Uploader un ZIP corrompu | Message d'erreur : impossible de lire le fichier |
| Uploader un ZIP sans données OggDude | Message : aucun élément trouvé |

---

## 14. Import SW Adversaries

| Action | Résultat attendu |
|--------|------------------|
| `swAdversaries.mjs` parse le format FFG SW Adversaries | Crée des acteurs de type `adversary` |

---

## 15. Scénarios de régression

- Importer un ZIP complet contenant tous les domaines → vérifier que les 11 domaines sont importés sans erreur.
- Importer uniquement les armes → vérifier que seuls les items `weapon` sont créés.
- Importer avec stockage monde → vérifier la structure de dossiers.
- Importer avec stockage compendium → vérifier les packs créés.
- Importer une arme avec qualité "autoFire" → vérifier que la qualité est présente avec `hasRank: true/false`.
- Importer une espèce → vérifier que les 6 caractéristiques sont à la bonne valeur.
- Importer un ZIP vide → vérifier le message approprié.
- Vérifier que les métriques globales sont mises à jour après chaque import.
- Vérifier que le bouton "Import data from OggDude" n'est pas cliquable pendant un import en cours.
- Tester l'import avec un fichier ZIP contenant des données spéciales (caractères Unicode, descriptions longues).
