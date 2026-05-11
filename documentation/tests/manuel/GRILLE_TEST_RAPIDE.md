# Grille de test rapide

Grille de suivi pour les tests manuels. Imprimable ou consultable en numérique.

Instructions :
- Cocher ✅ quand le test passe
- Cocher ❌ quand le test échoue (noter le bug)
- Cocher ⏭️ quand le test est non applicable (N/A)
- Noter la date et le testeur en pied de grille

---

## Personnage

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Création d'un personnage type `character` | | |
| 2 | Ouverture de la CharacterSheet (8 tabs) | | |
| 3 | Drag & drop d'une espèce | | |
| 4 | Drag & drop d'une carrière | | |
| 5 | Drag & drop d'une spécialisation | | |
| 6 | Spécialisations multiples | | |
| 7 | Augmentation de caractéristique | | |
| 8 | Diminution de caractéristique (forget) | | |
| 9 | Achat de rang de compétence | | |
| 10 | Rangs gratuits carrière | | |
| 11 | Rangs gratuits spécialisation | | |
| 12 | Oubli d'un rang de compétence | | |
| 13 | Blessures (wounds) → KO → Mort | | |
| 14 | Fatigue (strain) → Incapacité | | |
| 15 | Encombrement | | |
| 16 | Suivi XP (spent/gained/available) | | |
| 17 | Obligation / Duty / Motivation | | |
| 18 | Biographie (public/privé/HTML) | | |
| 19 | Actions (favorite, use, edit) | | |
| 20 | Effets (création, toggle, suppression) | | |
| 21 | Audit log (entrées, format, limite) | | |
| 22 | Changement d'espèce après XP dépensée | | |
| 23 | Suppression de spécialisation → rangs recalculés | | |
| 24 | Chargement d'un personnage existant | | |

---

## Combat

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Initialisation du combat (initiative) | | |
| 2 | Ordre d'initiative décroissant | | |
| 3 | Début de tour (onStartTurn) | | |
| 4 | Fin de tour (onEndTurn) | | |
| 5 | Action Delay (repositionnement initiative) | | |
| 6 | Leave Combat (nettoyage) | | |
| 7 | Attaque armée (weaponAttack) | | |
| 8 | Attaque de compétence (skillAttack) | | |
| 9 | Jet de défense (testDefense - dodge/parry/block/armor) | | |
| 10 | Résultat MISS/DODGE/PARRY/BLOCK/ARMOR/HIT | | |
| 11 | Calcul des dégâts (overflow × multiplier + base + bonus - resistance) | | |
| 12 | Clamp dégâts [1, 2×preMitigation] | | |
| 13 | Boon/Bane de cible (Guarded, Prone, Flanked) | | |
| 14 | Distance et portée d'arme | | |
| 15 | Résistance par type de dégâts (12 types) | | |
| 16 | Application des statuts (weakened, broken, etc.) | | |
| 17 | KO et Mort (wounds threshold ×1, ×2) | | |
| 18 | DOT : Bleeding, Burning, etc. | | |
| 19 | Expiration des effets (début/fin de tour) | | |
| 20 | Héroïsme (trackHeroismDamage) | | |
| 21 | Ressources : actions, focus | | |
| 22 | Combat complet 3+ tours | | |

---

## Dés narratifs

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Pool de base 3d8 | | |
| 2 | 1 boon → d8 → d10 | | |
| 3 | 2 boons → d8 → d12 ou 2× d10 | | |
| 4 | 1 bane → d8 → d6 | | |
| 5 | 2 banes → d8 → d4 ou 2× d6 | | |
| 6 | Limite 6 boons/banes | | |
| 7 | Min d4, max d12 | | |
| 8 | Total = pool + ability + skill + enchantment | | |
| 9 | Seuils de difficulté (Trivial→Impossible) | | |
| 10 | Succès/Échec critique (DC ± 6) | | |
| 11 | AttackRoll : target, defenseType, result | | |
| 12 | Dégâts = overflow × multiplier + base + bonus - resistance | | |
| 13 | StandardCheckDialog (difficulté, DC, boon/bane, roll mode) | | |
| 14 | ActionUseDialog (template targeting, cibles) | | |
| 15 | Rendu chat (cartes de jet) | | |
| 16 | Confirmation d'action (KeyX / autoConfirm) | | |
| 17 | Socket : diceCheck, roll modes | | |

---

## Import OggDude

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Ouverture de l'importateur (Settings → System) | | |
| 2 | Upload d'un fichier ZIP valide | | |
| 3 | Parsing via JSZip + xml2js | | |
| 4 | Sélection des domaines (11 domaines) | | |
| 5 | Import d'armes (skill, range, damage, crit, qualities) | | |
| 6 | Import d'armures (defense, soak, qualities) | | |
| 7 | Import d'équipement (category, price, encumbrance...) | | |
| 8 | Import de talents (node, ranked, activation, actions) | | |
| 9 | Import d'espèces (6 caracs, thresholds, XP, free skills) | | |
| 10 | Import de carrières (careerSkills, freeSkillRank) | | |
| 11 | Import de spécialisations (specializationSkills) | | |
| 12 | Import d'obligations/devoirs/motivations | | |
| 13 | Stockage monde (dossiers "SWERPG OggDude Import") | | |
| 14 | Stockage compendium (packs world.swerpg-{type}) | | |
| 15 | Mapping des IDs OggDude → SWERPG | | |
| 16 | ZIP invalide / corrompu → message d'erreur | | |
| 17 | Retry logic (1 tentative, 1000ms) | | |
| 18 | Métriques globales d'import | | |

---

## Talents

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Onglet Talents (signature, actifs, passifs) | | |
| 2 | Drag & drop d'un talent sur la fiche | | |
| 3 | Ouverture de l'arbre de talents (canvas PIXI) | | |
| 4 | Panoramique (clic droit glissé) | | |
| 5 | Zoom (molette) | | |
| 6 | Clic sur noeud → roue de choix | | |
| 7 | Hover → HUD avec prérequis | | |
| 8 | Achat d'un talent (clic gauche dans la roue) | | |
| 9 | Connexions entre noeuds achetés | | |
| 10 | Suppression d'un talent (clic droit → confirm) | | |
| 11 | Blocage en chaîne des prérequis | | |
| 12 | Talent ranked : achat de rangs multiples | | |
| 13 | Talent passif → effet appliqué automatiquement | | |
| 14 | Talent actif → action disponible | | |
| 15 | Sons (click1-5.wav) | | |
| 16 | Fermeture de l'arbre → fiche restaurée | | |
| 17 | Persistance après F5 | | |

---

## Équipement

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Création d'une arme (weapon) | | |
| 2 | Configuration des qualités d'arme (30 qualités) | | |
| 3 | Création d'une armure (armor) | | |
| 4 | Propriétés d'armure (bulky, organic, sealed, full-body) | | |
| 5 | Création d'un équipement (gear) | | |
| 6 | Drag & drop dans l'inventaire | | |
| 7 | Toggle equip (arme/armure) | | |
| 8 | Encombrement total | | |
| 9 | Qualité (shoddy → masterwork) | | |
| 10 | Enchantement (mundane → legendary) | | |
| 11 | Hard points | | |
| 12 | Niveau de restriction (none → illegal) | | |
| 13 | Item broken → bonus désactivés | | |
| 14 | Actions liées à l'équipement | | |

---

## Véhicules

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | Création d'un adversaire configuré comme véhicule | | |
| 2 | Armes de catégorie vehicle | | |
| 3 | Combat de véhicule (attaque/défense) | | |
| 4 | Compétence gunnery | | |

---

## UI Sheets

| # | Scénario | ✅/❌/⏭️ | Notes |
|---|----------|----------|-------|
| 1 | CharacterSheet : 8 tabs, header, sidebar | | |
| 2 | AdversarySheet : pas d'engagements, caracs simplifiées | | |
| 3 | WeaponSheet (V1) : skill, range, damage, crit, qualities | | |
| 4 | ArmorSheet (V2) : defense, soak, qualities | | |
| 5 | GearSheet (V1) : category, price, encumbrance, broken | | |
| 6 | TalentSheet (V1) : node, ranked, activation, actions | | |
| 7 | SpeciesSheet (V1) : 6 caracs, thresholds, XP, free skills | | |
| 8 | CareerSheet (V1) : careerSkills, freeSkillRank | | |
| 9 | SpecializationSheet (V1) : skills, freeSkillRank | | |
| 10 | ObligationSheet / DutySheet (V1) | | |
| 11 | JournalSheet (V2) + SkillPageSheet (V2) | | |
| 12 | Navigation entre tabs | | |
| 13 | Drag & drop de tous les types d'items | | |
| 14 | Boutons d'action sur les items (favorite, edit, use, equip, delete) | | |
| 15 | Redimensionnement à 1024×768 | | |
| 16 | Responsive : 1920×1080, 1366×768, 1024×768 | | |
| 17 | StandardCheckDialog (difficulté, boon/bane, roll mode) | | |
| 18 | ActionUseDialog (template targeting, cibles) | | |
| 19 | Token HUD (wounds, strain, pips) | | |
| 20 | Combat Tracker sidebar | | |
| 21 | i18n : basculer français/anglais | | |
| 22 | Performance : ouverture fiche chargée < 1s | | |

---

## Résumé

| Famille | Total | ✅ | ❌ | ⏭️ |
|---------|-------|----|----|-----|
| Personnage | 24 | | | |
| Combat | 22 | | | |
| Dés narratifs | 17 | | | |
| Import OggDude | 18 | | | |
| Talents | 17 | | | |
| Équipement | 14 | | | |
| Véhicules | 4 | | | |
| UI Sheets | 22 | | | |
| **Total** | **138** | | | |

---

**Testeur :** _____________  **Date :** _____________  **Version système :** _____________
