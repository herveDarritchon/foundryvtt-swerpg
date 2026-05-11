# Tests manuels — UI Sheets

Tests de l'interface utilisateur : fiches d'acteur, d'item, tabs, responsive, drag & drop, context menu, recherche.

---

## Prérequis

- Monde SWERPG avec au moins un personnage et des items
- Navigateur à différentes résolutions (1920×1080, 1366×768, 1024×768)
- Connaissances des différences entre sheets V1 et V2

---

## 1. Architecture des sheets

Le système utilise deux API Foundry :

| API | Classe parente | Utilisé par |
|-----|----------------|-------------|
| **V2** (`ApplicationV2`, `HandlebarsApplicationMixin`, `DocumentSheetV2`) | `SwerpgBaseActorSheet`, `ArmorSheet`, `SwerpgJournalSheet`, `SkillPageSheet` | CharacterSheet, AdversarySheet, ArmorSheet, JournalSheet |
| **V1** (`FormApplication`) | Classe de base Foundry V1 | WeaponSheet, GearSheet, TalentSheet, SpeciesSheet, CareerSheet, SpecializationSheet, ObligationSheet, DutySheet |

---

## 2. Fiche de personnage (CharacterSheet) — V2

### 2.1. Structure générale

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir la fiche d'un personnage | `CharacterSheet` s'affiche (ApplicationV2) |
| Vérifier les dimensions : 900×750 par défaut | Taille correcte |
| Vérifier la présence du header (portrait, nom, barres de ressources) | Header visible |
| Vérifier le sidebar (caractéristiques) | Sidebar avec les 6 caractéristiques |
| Vérifier le body (tabs) | Body avec les tabs |

### 2.2. Tabs

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur chaque tab | Le contenu change, le tab est actif |
| **Attributs** : caractéristiques, défenses, résistances, ressources, progression | Toutes les sections affichées |
| **Actions** : liste groupée par type (Attaque, Réaction, Mouvement, Général) | Groupes visibles |
| **Inventaire** : équipement + toggle equip | Items listés |
| **Compétences** : liste avec achats/remboursements | Compétences avec indicateurs carrière/spécialisation |
| **Talents** : signature, actifs, passifs + bouton arbre | Talents listés |
| **Effets** : temporaires, persistants, désactivés | Effets listés |
| **Biographie** : public, privé, apparence, champs texte | Éditeurs HTML fonctionnels |
| **Engagements** : obligations, devoirs, motivations (personnage seulement) | Engagements listés |

### 2.3. Navigation entre tabs

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur Tab 1 → Tab 5 → Tab 2 | Navigation fluide, pas de re-render complet |
| Pas de flash ou de saut visuel | Transition propre |
| Les données du tab précédent sont conservées | Pas de perte de données en naviguant |

### 2.4. Drag & drop

| Action | Résultat attendu |
|--------|------------------|
| Glisser une espèce du compendium vers la fiche | L'espèce est appliquée (`_applyDetailItem`) |
| Glisser une carrière | Carrière appliquée |
| Glisser une spécialisation | Spécialisation ajoutée |
| Glisser une arme | Arme ajoutée à l'inventaire |
| Glisser un talent | Talent ajouté |

### 2.5. Boutons d'action sur les items

| Action | Résultat attendu |
|--------|------------------|
| Icône étoile → `actionFavorite` | Action marquée favorite |
| Icône crayon → `actionEdit` | Fenêtre de configuration d'action |
| Icône utiliser → `actionUse` | Action exécutée |
| Icône équiper → `equipToggle` | Item équipé/déséquipé |
| Icône corbeille → `itemDelete` / `effectDelete` | Suppression avec confirmation |
| Icône + → `itemCreate` | Nouvel item créé |
| Icône effet → `effectCreate`, `effectEdit`, `effectToggle`, `effectDelete` | Gestion des effets |

---

## 3. Fiche d'adversaire (AdversarySheet) — V2

### 3.1. Différences avec la fiche personnage

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir la fiche d'un adversaire | `AdversarySheet` s'affiche |
| Vérifier l'absence des sections personnage | Pas de progression, pas d'espèce/carrière/spécialisation |
| Vérifier les tabs disponibles | Attributs, Actions, Inventaire, Compétences, Effets, Biographie |
| Vérifier l'absence de l'onglet Engagements | Pas d'engagements pour les adversaires |

### 3.2. Caractéristiques adversaire

| Action | Résultat attendu |
|--------|------------------|
| Les caractéristiques sont en mode `value` (pas base/trained/bonus) | Valeur unique |
| Modifier `advancement.level` | Les compétences s'adaptent (auto-scale) |
| Modifier `advancement.threat` (minion/normal/elite/boss) | Les actions max changent |

---

## 4. Fiches d'item (Item Sheets)

### 4.1. WeaponSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une arme | `WeaponSheet` s'affiche (FormApplication V1) |
| Configurer `skill`, `range`, `damage`, `crit` | Champs fonctionnels |
| Widget qualités : 30 qualités listées, toggle actif/inactif, rang pour celles avec `hasRank` | Widget fonctionnel |
| Configurer `hardPoints` | Point d'attache configurable |
| Configurer `weaponType` (narrative subtype) | Type défini |

### 4.2. ArmorSheet (V2)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une armure | `ArmorSheet` s'affiche (ApplicationV2) |
| Configurer `defense.base`, `soak.base` | Champs fonctionnels |
| Widget qualités d'armure : bulky, organic, sealed, full-body | Propriétés configurables |
| Configurer `hardPoints` | Points d'attache |

### 4.3. GearSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir un équipement | `GearSheet` s'affiche (V1) |
| Configurer `category`, `quantity`, `price`, `quality`, `restrictionLevel`, `encumbrance`, `rarity` | Tous les champs fonctionnels |
| Marquer `broken` | Checkbox fonctionnelle |

### 4.4. TalentSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir un talent | `TalentSheet` s'affiche (V1) |
| Configurer `node`, `isRanked`, `rank`, `activation`, `isFree` | Champs fonctionnels |
| Lier à une spécialisation/carrière (`trees`) | Lien fonctionnel |
| Configurer les actions du talent | Actions configurables |

### 4.5. SpeciesSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une espèce | `SpeciesSheet` s'affiche (V1) |
| Configurer les 6 caractéristiques (1-5) | Champs fonctionnels |
| Configurer `woundThreshold`, `strainThreshold` | Seuils configurables |
| Configurer `startingExperience` (100-300) | XP de départ |
| Configurer `freeSkills`, `freeTalents` | Listes modifiables |

### 4.6. CareerSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une carrière | `CareerSheet` s'affiche (V1) |
| Configurer `careerSkills` | Liste de skills modifiable |
| Configurer `freeSkillRank` (0-8, défaut 4) | Rangs gratuits configurables |

### 4.7. SpecializationSheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une spécialisation | `SpecializationSheet` s'affiche (V1) |
| Configurer `specializationSkills` | Liste de skills modifiable |
| Configurer `freeSkillRank` (0-8, défaut 4) | Rangs gratuits configurables |

### 4.8. ObligationSheet / DutySheet (V1)

| Action | Résultat attendu |
|--------|------------------|
| Configurer `value` obligation (0-50, step 5) | Valeur fonctionnelle |
| Configurer `isExtra`, `extraXp`, `extraCredits` | Champs optionnels fonctionnels |
| Configurer `value` duty (0-50, step 5) | Valeur fonctionnelle |
| Configurer `sources` (book, page) | Sources fonctionnelles |

---

## 5. Journal et compétences

### 5.1. SwerpgJournalSheet (V2)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir un JournalEntry | `SwerpgJournalSheet` s'affiche |
| Navigation entre les pages | Fonctionnelle |

### 5.2. SkillPageSheet (V2)

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une page de type `skill` | `SkillPageSheet` s'affiche |
| Vérifier `skillId`, `overview`, `ranks`, `paths` | Tous les champs visibles |
| Chaque rang a une description | Descriptions par rang affichées |
| Les `paths` (voies) sont listés avec leur description | Voies affichées |

---

## 6. Fenêtres de dialogue (Dialogs)

### 6.1. StandardCheckDialog (V2, DialogV2)

| Action | Résultat attendu |
|--------|------------------|
| Déclencher un check | `StandardCheckDialog` s'ouvre |
| Vérifier le sélecteur de difficulté | 7 niveaux : Trivial → Impossible |
| Vérifier le champ DC manuel | Éditable |
| Vérifier les boutons Boon/Bane (+/-) | Fonctionnels, max 6 |
| Vérifier le roll mode : public, gm, blind, self | Sélecteur fonctionnel |
| Bouton Roll | Le jet est lancé |
| Bouton Request | Requête envoyée |

### 6.2. ActionUseDialog (Étend StandardCheckDialog)

| Action | Résultat attendu |
|--------|------------------|
| Utiliser une action avec AOE | Template targeting disponible |
| Bouton "Place Template" pour les gabarits | Template plaçable (cône, cercle, rayon, rectangle) |
| Liste de cibles avec statut | Cibles listées, invalides signalées |

### 6.3. ActionConfig & SkillConfig

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir `ActionConfig` (config/action.mjs) | Configuration d'action modifiable |
| Ouvrir `SkillConfig` (config/skill.mjs) | Dialogue d'achat de compétence |

---

## 7. Token HUD

### 7.1. SwerpgTokenHUD

| Action | Résultat attendu |
|--------|------------------|
| Cliquer sur un token | Le HUD personnalisé s'affiche |
| Vérifier les barres de ressources | Wounds (haut), Strain (bas) |
| Vérifier les action pips et focus pips | Pips visibles sur le token |

---

## 8. Combat Tracker

### 8.1. SwerpgCombatTracker

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir le combat tracker | `SwerpgCombatTracker` s'affiche dans la sidebar |
| Démarrer un combat | Initiative rollée |
| Navigation des tours | Fonctionnelle |
| Affichage des statuts sur les participants | Statuts visibles |

---

## 9. Responsive et redimensionnement

### 9.1. Test de résolution

| Résolution | Comportement attendu |
|------------|---------------------|
| 1920×1080 (bureau) | Tout est visible, layout normal |
| 1366×768 (bureau standard) | Layout compact mais fonctionnel |
| 1024×768 (tablette/écran réduit) | Tabs accessibles, pas de débordement horizontal |

### 9.2. Redimensionnement

| Action | Résultat attendu |
|--------|------------------|
| Redimensionner la fenêtre du navigateur | Les sheets s'adaptent |
| Redimensionner une sheet (poignée) | La sheet se redimensionne |
| Vérifier les scrollbars internes | Présentes si nécessaire, pas de contenu caché |
| Vérifier le contenu des tabs sur sheet réduite | Pas de perte d'information |

---

## 10. Templates et rendu

### 10.1. Templates HBS (56 fichiers)

| Action | Résultat attendu |
|--------|------------------|
| Les templates sont correctement compilés | Aucune erreur Handlebars |
| Les partials sont chargés | Templates inclus fonctionnels |
| Chaque template se rend sans erreur JS | Console propre |

### 10.2. Vérification visuelle

| Action | Résultat attendu |
|--------|------------------|
| Vérifier le rendu CSS (`styles/swerpg.css`) | Styles corrects, pas de régression |
| Vérifier les icônes et images | Toutes les ressources chargées (pas de 404) |
| Vérifier l'espacement et l'alignement | Layout cohérent entre les sections |
| Vérifier les couleurs des caractéristiques | `attributes-swerpg.mjs` définit les couleurs par caractéristique |

---

## 11. Performances

| Action | Résultat attendu |
|--------|------------------|
| Ouvrir une fiche avec beaucoup de données | Pas de freeze > 1 seconde |
| Naviguer entre les tabs | Réponse instantanée |
| Drag & drop d'un item avec beaucoup de données | Opération < 2 secondes |
| Ouvrir l'arbre de talents (canvas PIXI) | Canvas chargé en < 3 secondes |

---

## 12. Internationalisation (i18n)

| Action | Résultat attendu |
|--------|------------------|
| Basculer Foundry en français | Tous les textes du système sont en français (`lang/fr.json`) |
| Basculer Foundry en anglais | Tous les textes sont en anglais (`lang/en.json`) |
| Vérifier qu'aucun texte n'est manquant | Pas de `[object Object]` ou de clés non traduites |
| Vérifier les textes dans les dialogues et notifications | Messages traduits |

---

## 13. Scénarios de régression

- Ouvrir toutes les sheets (character, adversary, weapon, armor, gear, talent, species, career, specialization, obligation, duty, motivation, journal, skill) → vérifier qu'aucune erreur JS n'apparaît.
- Naviguer dans tous les tabs de la CharacterSheet → vérifier que les données sont correctes et persistées.
- Drag & drop tous les types d'items sur une fiche personnage → vérifier que chaque type s'applique correctement.
- Redimensionner la fenêtre à 1024×768 → vérifier que toutes les sheets sont utilisables.
- Basculer entre français et anglais → vérifier la couverture i18n.
- Ouvrir un dialogue StandardCheckDialog → vérifier le rendu.
- Vérifier que les sheets V1 et V2 cohabitent sans conflit.
- Tester l'accessibilité : tabulation, labels ARIA, rôles dans les sheets V2.
- Créer des sheets avec des données très longues (descriptions HTML, listes de talents) → vérifier qu'il n'y a pas de débordement.
- Recharger la page avec une sheet ouverte → vérifier que les données sont persistées.
