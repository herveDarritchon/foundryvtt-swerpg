# Exigences Fonctionnelles - Système Crucible

## Méthodologie MOSCOW

Ce document classe les exigences fonctionnelles selon la méthode MoSCoW :

- **M**ust have (Essentiel)
- **S**hould have (Important)
- **C**ould have (Souhaitable)
- **W**on't have (Exclu pour cette version)

## M - Must Have (Essentielles)

### M1 - Gestion des Personnages Héros

**Description** : Le système doit permettre la création et la gestion complète de personnages héros joueurs.

**Critères d'acceptation** :

- ✅ Création de personnage avec sélection d'ascendance
- ✅ Sélection de background (historique)
- ✅ Attribution des points de caractéristiques (abilities)
- ✅ Gestion de la progression (niveaux, milestones)
- ✅ Gestion des ressources (action, focus, wounds, health)
- ✅ Équipement et inventaire

**Implémentation** :

- Classe : [`CrucibleHeroActor`](../../module/models/actor-hero.mjs#L8)
- Fichier : [`module/models/actor-hero.mjs`](../../module/models/actor-hero.mjs)
- Sheet : [`HeroSheet`](../../module/applications/sheets/hero-sheet.mjs#L6) ([`module/applications/sheets/hero-sheet.mjs`](../../module/applications/sheets/hero-sheet.mjs))

**Tests** :

- Création d'un héros complet
- Montée de niveau
- Attribution de talents
- Équipement d'armes et armures

---

### M2 - Système d'Actions

**Description** : Toutes les interactions mécaniques (attaque, sort, compétence) doivent être encapsulées dans le système d'actions.

**Critères d'acceptation** :

- ✅ Cycle de vie complet des actions (initialize → confirm)
- ✅ Support des actions de combat (strike, spell, utility)
- ✅ Gestion des cibles (single, AoE, self)
- ✅ Calcul des coûts (action points, focus points)
- ✅ Intégration avec le système de dés
- ✅ Création de messages de chat pour les résultats

**Implémentation** :

- Classe : [`CrucibleAction`](../../module/models/action.mjs#L227)
- Fichier : [`module/models/action.mjs`](../../module/models/action.mjs)
- Configuration : [`module/config/action.mjs`](../../module/config/action.mjs)

**Tests** :

- Utilisation d'une action d'attaque
- Utilisation d'un sort avec AoE
- Vérification des coûts en ressources

---

### M3 - Système de Combat

**Description** : Gestion complète des rencontres de combat avec initiative, tours, et résolution.

**Critères d'acceptation** :

- ✅ Tracker de combat personnalisé
- ✅ Gestion de l'initiative
- ✅ Tours de combat avec actions disponibles
- ✅ Types de challenges (combat, exploration, social)
- ✅ Gestion des statuts d'effet

**Implémentation** :

- Classes : [`CrucibleCombat`](../../module/documents/combat.mjs#L4), [`CrucibleCombatant`](../../module/documents/combatant.mjs#L4)
- Fichiers :
  - [`module/documents/combat.mjs`](../../module/documents/combat.mjs)
  - [`module/documents/combatant.mjs`](../../module/documents/combatant.mjs)
- Models : `CrucibleCombatChallenge`, `CrucibleExplorationChallenge`, `CrucibleSocialChallenge`
- UI : `CrucibleCombatTracker`

**Tests** :

- Création d'un combat
- Gestion de l'initiative
- Résolution d'un round complet
- Application d'effets de statut

---

### M4 - Système de Talents

**Description** : Arbre de talents permettant la progression et la personnalisation des personnages.

**Critères d'acceptation** :

- ✅ Arbre de talents avec nœuds interconnectés
- ✅ Prérequis pour débloquer les talents (level, archetype, training)
- ✅ Rangs de talents multiples (tier 1-4)
- ✅ Actions débloquées par les talents
- ✅ Effets passifs des talents
- ✅ Interface canvas pour visualiser l'arbre

**Implémentation** :

- Classe : [`CrucibleTalentNode`](../../module/config/talent-node.mjs#L21), [`CrucibleTalentItem`](../../module/models/item-talent.mjs#L46)
- Fichiers :
  - [`module/config/talent-node.mjs`](../../module/config/talent-node.mjs)
  - [`module/models/item-talent.mjs`](../../module/models/item-talent.mjs)
- Canvas : `CrucibleTalentTree` ([`module/applications/talent-tree.mjs`](../../module/applications/talent-tree.mjs#L677))

**Tests** :

- Navigation dans l'arbre de talents
- Achat d'un talent
- Vérification des prérequis
- Application des effets passifs

---

### M5 - Système de Dés

**Description** : Système de résolution des jets de dés avec boons, banes, et calcul de résultats.

**Critères d'acceptation** :

- ✅ Jets d'attaque avec comparaison aux défenses
- ✅ Jets de compétence (Standard Check)
- ✅ Application de boons (avantages) et banes (désavantages)
- ✅ Calcul des dégâts avec résistances
- ✅ Gestion des succès/échecs critiques

**Implémentation** :

- Classes : [`AttackRoll`](../../module/dice/attack-roll.mjs#L32), [`StandardCheck`](../../module/dice/standard-check.mjs#L38)
- Fichiers :
  - [`module/dice/attack-roll.mjs`](../../module/dice/attack-roll.mjs)
  - [`module/dice/standard-check.mjs`](../../module/dice/standard-check.mjs)
- Configuration : [`module/config/dice.mjs`](../../module/config/dice.mjs)

**Tests** :

- Jet d'attaque réussi
- Jet d'attaque avec critique
- Jet de compétence avec boons/banes

---

### M6 - Gestion des Items

**Description** : Système complet de gestion des objets (armes, armures, consommables, etc.).

**Critères d'acceptation** :

- ✅ Types d'items multiples (weapon, armor, accessory, consumable, loot, spell, talent, etc.)
- ✅ Propriétés spécifiques par type
- ✅ Équipement et déséquipement
- ✅ Quantités et empilement (stackable)
- ✅ Poids et capacité de transport

**Implémentation** :

- Document : [`CrucibleItem`](../../module/documents/item.mjs#L4)
- Models :
  - [`CrucibleWeaponItem`](../../module/models/item-weapon.mjs#L7)
  - [`CrucibleArmorItem`](../../module/models/item-armor.mjs#L7)
  - `CrucibleAccessoryItem`
  - `CrucibleConsumableItem`
  - `CrucibleLootItem`
  - etc.

**Tests** :

- Création d'une arme
- Équipement d'une armure
- Utilisation d'un consommable
- Gestion de l'inventaire

---

### M7 - Système de Spellcraft

**Description** : Composition dynamique de sorts via runes, gestes, et inflections.

**Critères d'acceptation** :

- ✅ Bibliothèque de runes (fire, ice, lightning, etc.)
- ✅ Bibliothèque de gestes (cone, blast, ray, etc.)
- ✅ Bibliothèque d'inflections (damage, healing, control, etc.)
- ✅ Composition dynamique de sorts
- ✅ Sorts iconiques prédéfinis
- ✅ Grimoire par personnage

**Implémentation** :

- Classe : [`CrucibleSpellAction`](../../module/models/spell-action.mjs#L13)
- Fichier : [`module/models/spell-action.mjs`](../../module/models/spell-action.mjs)
- Configuration :
  - [`module/config/spellcraft.mjs`](../../module/config/spellcraft.mjs)
  - `module/models/spellcraft-rune.mjs`
  - `module/models/spellcraft-gesture.mjs`
  - `module/models/spellcraft-inflection.mjs`

**Tests** :

- Composition d'un sort (rune + gesture + inflection)
- Lancement d'un sort iconique
- Apprentissage d'un nouveau composant

---

### M8 - Gestion des Adversaires

**Description** : Création et gestion des adversaires (PNJ hostiles).

**Critères d'acceptation** :

- ✅ Types d'adversaires avec threat ranks (minion, normal, elite, boss)
- ✅ Application de taxonomies (type de créature)
- ✅ Application d'archétypes d'adversaire
- ✅ Actions et capacités spécifiques
- ✅ Scaling automatique selon threat rank

**Implémentation** :

- Classe : [`CrucibleAdversaryActor`](../../module/models/actor-adversary.mjs#L8)
- Fichier : [`module/models/actor-adversary.mjs`](../../module/models/actor-adversary.mjs)
- Sheet : [`AdversarySheet`](../../module/applications/sheets/adversary-sheet.mjs#L6)
- Item : `CrucibleTaxonomyItem`

**Tests** :

- Création d'un minion
- Création d'un boss
- Application d'une taxonomie
- Scaling des statistiques

---

### M9 - Gestion de Contenu (Compendia)

**Description** : Système de gestion du contenu de jeu via compendia.

**Critères d'acceptation** :

- ✅ Workflow YAML → LevelDB
- ✅ Extraction du contenu (`npm run extract`)
- ✅ Compilation du contenu (`npm run compile`)
- ✅ Compendia pour : talents, sorts, équipement, ancestries, backgrounds, taxonomies
- ✅ IDs stables pour les documents

**Implémentation** :

- Build : [`build.mjs`](../../build.mjs)
- Dossiers :
  - [`_source/`](../../_source/) (YAML éditable)
  - [`packs/`](../../packs/) (LevelDB compilé)

**Tests** :

- Extraction d'un compendium
- Modification d'un fichier YAML
- Recompilation
- Vérification dans Foundry

---

### M10 - Configuration du Système

**Description** : Configuration centralisée du système.

**Critères d'acceptation** :

- ✅ Constants statiques (SYSTEM)
- ✅ Configuration runtime (crucible.CONFIG)
- ✅ Hiérarchie de configuration
- ✅ Settings utilisateur
- ✅ Localisation (i18n)

**Implémentation** :

- Fichier : [`module/config/system.mjs`](../../module/config/system.mjs)
- Exposition : `crucible.CONST`, `crucible.CONFIG`
- Localisation : [`lang/en.json`](../../lang/en.json)

**Tests** :

- Accès aux constants
- Modification de la configuration runtime
- Changement de paramètres utilisateur

---

## S - Should Have (Importantes)

### S1 - Création de Personnage Guidée

**Description** : Interface de création de personnage étape par étape.

**Critères d'acceptation** :

- ✅ Wizard de création en plusieurs étapes
- ✅ Sélection d'ascendance avec preview
- ✅ Sélection de background avec preview
- ✅ Attribution guidée des caractéristiques
- ✅ Sélection de talents de départ

**Implémentation** :

- Classe : [`CrucibleHeroCreationSheet`](../../module/applications/sheets/hero-creation-sheet.mjs#L37)
- Fichier : [`module/applications/sheets/hero-creation-sheet.mjs`](../../module/applications/sheets/hero-creation-sheet.mjs)

**Status** : ✅ Implémenté

---

### S2 - Effets Actifs

**Description** : Gestion des effets temporaires et permanents.

**Critères d'acceptation** :

- ✅ ActiveEffects avec durée
- ✅ Statuts prédéfinis (stunned, prone, invisible, etc.)
- ✅ Effets personnalisés
- ✅ Application automatique via actions
- ✅ Suppression automatique à expiration

**Implémentation** :

- Classe : [`CrucibleActiveEffect`](../../module/documents/active-effect.mjs#L4)
- Fichier : [`module/documents/active-effect.mjs`](../../module/documents/active-effect.mjs)
- Configuration : [`module/config/statuses.mjs`](../../module/config/statuses.mjs)

**Status** : ✅ Implémenté

---

### S3 - Token HUD Personnalisé

**Description** : HUD amélioré pour les tokens.

**Critères d'acceptation** :

- ✅ Affichage des ressources (action, focus, wounds)
- ✅ Accès rapide aux actions
- ✅ Gestion des statuts
- ✅ Preview des défenses

**Implémentation** :

- Classe : [`CrucibleTokenHUD`](../../module/applications/hud/token-hud.mjs#L5)
- Fichier : [`module/applications/hud/token-hud.mjs`](../../module/applications/hud/token-hud.mjs)

**Status** : ✅ Implémenté

---

### S4 - Gestion de Party

**Description** : Acteur de groupe pour gérer le party.

**Critères d'acceptation** :

- ✅ Acteur de type "group"
- ✅ Membres du party
- ✅ Ressources partagées
- ✅ Feuille de groupe

**Implémentation** :

- Classe : [`CrucibleGroupActor`](../../module/models/actor-group.mjs#L10)
- Fichier : [`module/models/actor-group.mjs`](../../module/models/actor-group.mjs)
- Sheet : `CrucibleGroupActorSheet`

**Status** : ✅ Implémenté

---

### S5 - Journal Enrichi

**Description** : Journaux avec mise en forme spécifique au système.

**Critères d'acceptation** :

- ✅ Journaux de règles
- ✅ Enrichers personnalisés (@skill, @action, etc.)
- ✅ Templates de pages spéciales

**Implémentation** :

- Classe : [`CrucibleJournalEntrySheet`](../../module/applications/sheets/journal.mjs#L4)
- Enrichers : [`module/enrichers.mjs`](../../module/enrichers.mjs)

**Status** : ✅ Implémenté

---

### S6 - Compétences (Skills)

**Description** : Système de compétences pour les jets.

**Critères d'acceptation** :

- ✅ Liste de compétences prédéfinies
- ✅ Compétences liées aux caractéristiques
- ✅ Jets de compétence
- ✅ Knowledge (connaissances spécifiques)

**Implémentation** :

- Configuration : [`module/config/skills.mjs`](../../module/config/skills.mjs#L40)
- Intégration dans [`StandardCheck`](../../module/dice/standard-check.mjs#L38)

**Status** : ✅ Implémenté

---

### S7 - Langues

**Description** : Gestion des langues parlées par les personnages.

**Critères d'acceptation** :

- ✅ Liste de langues disponibles
- ✅ Catégories de langues
- ✅ Langues apprises via background/ancestry
- ✅ Configuration personnalisable

**Implémentation** :

- Configuration : `SYSTEM.ACTOR.LANGUAGES` ([`module/config/system.mjs`](../../module/config/system.mjs))
- Storage : `actor.system.details.languages`

**Status** : ✅ Implémenté

---

### S8 - Système de Monnaie

**Description** : Gestion de la monnaie et des transactions.

**Critères d'acceptation** :

- ✅ Dénominations multiples (copper, silver, gold)
- ✅ Conversion automatique
- ✅ Élément HTML personnalisé pour l'entrée
- ✅ Configuration des dénominations

**Implémentation** :

- Configuration : `SYSTEM.ACTOR.CURRENCY_DENOMINATIONS` ([`module/config/system.mjs`](../../module/config/system.mjs))
- Element : [`HTMLCrucibleCurrencyElement`](../../module/applications/elements/currency.mjs#L7)

**Status** : ✅ Implémenté

---

### S9 - Crafting (Artisanat)

**Description** : Système de fabrication d'objets.

**Critères d'acceptation** :

- ✅ Schematics (schémas de fabrication)
- ✅ Matériaux requis
- ✅ Temps de fabrication
- ✅ Jets de compétence pour fabriquer

**Implémentation** :

- Item : [`CrucibleSchematicItem`](../../module/models/item-schematic.mjs#L39)
- Configuration : [`module/config/crafting.mjs`](../../module/config/crafting.mjs)

**Status** : ✅ Implémenté

---

### S10 - Invocations (Summons)

**Description** : Système d'invocation de créatures.

**Critères d'acceptation** :

- ✅ Actions de type "summon"
- ✅ Templates de placement
- ✅ Créatures invoquées avec durée limitée
- ✅ Gestion de l'initiative des invocations

**Implémentation** :

- Action hook : `summon`
- Compendium : [`crucible.summons`](../../_source/summons/)

**Status** : ✅ Implémenté

---

## C - Could Have (Souhaitables)

### C1 - Intégration VFX

**Description** : Effets visuels pour les actions.

**Critères d'acceptation** :

- ⚠️ Détection du module `foundryvtt-vfx`
- ⚠️ Configuration VFX pour les strikes
- ⚠️ Effets par type de dégâts

**Implémentation** :

- Variable : `crucible.vfxEnabled` ([`crucible.mjs`](../../crucible.mjs))
- Fonction : `configureStrikeVFXEffect()`

**Status** : ⚠️ Partiellement implémenté (dépend d'un module externe)

---

### C2 - Audio Contextuel

**Description** : Sons pour les actions et événements.

**Critères d'acceptation** :

- 🔄 Sons d'attaque
- 🔄 Sons de sorts
- 🔄 Musique de combat
- 🔄 Ambiances

**Implémentation** :

- Module : [`module/audio.mjs`](../../module/audio.mjs)
- Dossier : [`audio/`](../../audio/)

**Status** : 🔄 En développement

---

### C3 - Grid Personnalisée

**Description** : Affichage de grille amélioré pour le combat.

**Critères d'acceptation** :

- ✅ Shader de grille sélective
- ✅ Highlight des zones d'attaque
- ✅ Preview de mouvement

**Implémentation** :

- Classe : [`CrucibleSelectiveGridShader`](../../module/canvas/grid/grid-shader.mjs#L6), [`CrucibleGridLayer`](../../module/canvas/grid/grid-layer.mjs#L4)
- Fichiers : [`module/canvas/grid/`](../../module/canvas/grid/)

**Status** : ✅ Implémenté

---

### C4 - Ruler Personnalisé

**Description** : Outil de mesure amélioré.

**Critères d'acceptation** :

- ✅ Affichage de la distance
- ✅ Calcul du coût en mouvement
- ✅ Preview du chemin

**Implémentation** :

- Classe : [`CrucibleTokenRuler`](../../module/canvas/token-ruler.mjs#L2)
- Fichier : [`module/canvas/token-ruler.mjs`](../../module/canvas/token-ruler.mjs)

**Status** : ✅ Implémenté

---

### C5 - Import/Export de Personnages

**Description** : Fonctionnalité d'import/export JSON.

**Critères d'acceptation** :

- 📝 Export d'un héros en JSON
- 📝 Import d'un héros depuis JSON
- 📝 Validation des données importées

**Status** : 📝 À implémenter

---

### C6 - Personnages Pré-générés

**Description** : Bibliothèque de personnages prêts à jouer.

**Critères d'acceptation** :

- ✅ Compendium de pregens
- ✅ Import rapide en partie

**Implémentation** :

- Compendium : [`crucible.pregens`](../../_source/pregens/)

**Status** : ✅ Implémenté

---

### C7 - Chat Cards Améliorées

**Description** : Messages de chat enrichis.

**Critères d'acceptation** :

- ✅ Templates de messages personnalisés
- ✅ Boutons d'action dans le chat
- ✅ Preview d'items

**Implémentation** :

- Module : [`module/chat.mjs`](../../module/chat.mjs)
- Templates : [`templates/chat/`](../../templates/chat/)

**Status** : ✅ Implémenté

---

### C8 - Interactions Sociales

**Description** : Système de challenges sociaux.

**Critères d'acceptation** :

- ✅ Combat de type "social"
- ✅ Actions sociales
- ✅ Influence et persuasion

**Implémentation** :

- Model : [`CrucibleSocialChallenge`](../../module/models/combat-social.mjs#L4)

**Status** : ✅ Implémenté

---

### C9 - Exploration

**Description** : Système de challenges d'exploration.

**Critères d'acceptation** :

- ✅ Combat de type "exploration"
- ✅ Actions d'exploration
- ✅ Découverte et investigation

**Implémentation** :

- Model : [`CrucibleExplorationChallenge`](../../module/models/combat-exploration.mjs#L4)

**Status** : ✅ Implémenté

---

### C10 - Accessibilité

**Description** : Amélioration de l'accessibilité.

**Critères d'acceptation** :

- ⚠️ Labels ARIA
- ⚠️ Navigation au clavier
- ⚠️ Contraste suffisant
- ⚠️ Tooltips

**Status** : ⚠️ Partiellement implémenté

---

## W - Won't Have (Exclus)

### W1 - Localisation Multilingue

**Description** : Support de langues autres que l'anglais.

**Raison** : Le système évolue trop rapidement pour maintenir plusieurs traductions.

---

### W2 - Adoption de TypeScript

**Description** : Migration du code JavaScript vers TypeScript.

**Raison** : Choix architectural du projet de rester en JavaScript.

---

### W3 - Support Foundry VTT v11-12

**Description** : Compatibilité avec les versions antérieures à v13.

**Raison** : Crucible est exclusivement conçu pour Foundry v13+.

---

### W4 - Mode Solo/Campagne

**Description** : Fonctionnalités avancées de gestion de campagne.

**Raison** : Hors scope pour cette version.

---

### W5 - Marketplace d'Extensions

**Description** : Système de modules complémentaires tiers.

**Raison** : Non planifié pour le moment.

---

## Légende des Status

- ✅ Implémenté
- ⚠️ Partiellement implémenté
- 🔄 En développement
- 📝 À implémenter
- ❌ Non implémenté

## Traçabilité

Ce document est maintenu en parallèle du développement. Chaque exigence est liée aux fichiers sources correspondants pour faciliter la traçabilité.

### Dernière Mise à Jour

Date : 2025-11-04
Version du système : 0.8.1
