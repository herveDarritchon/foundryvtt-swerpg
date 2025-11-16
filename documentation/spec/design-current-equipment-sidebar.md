---
title: Current Equipment Display in Character Sheet Sidebar
version: 1.0
date_created: 2025-11-10
last_updated: 2025-11-10
owner: Star Wars Edge RPG System Team
tags: [design, ui, character-sheet, equipment, sidebar, star-wars]
---

# Introduction

Cette spécification définit l'implémentation de l'affichage de l'équipement actuellement équipé dans la barre latérale (sidebar) de la feuille de personnage du système Star Wars Edge RPG pour Foundry VTT. L'objectif est de permettre aux joueurs de voir immédiatement leur équipement actuel (armes, armures, accessoires) dans une présentation immersive respectant l'ambiance Star Wars.

## 1. Purpose & Scope

Cette spécification vise à améliorer l'expérience utilisateur en fournissant un affichage visuel clair et accessible de l'équipement équipé d'un personnage. L'implémentation doit s'intégrer parfaitement dans le design existant du système tout en respectant les conventions de Foundry VTT et l'esthétique Star Wars.

**Audience cible** : Développeurs du système, designers UI/UX, testeurs  
**Hypothèses** : Connaissance du système Foundry VTT, du framework ApplicationV2, et de l'architecture du système SWERPG

## 2. Definitions

- **SWERPG** : Star Wars Edge RPG - le système de jeu implémenté
- **Sidebar** : La barre latérale gauche de la feuille de personnage
- **Featured Equipment** : L'équipement mis en avant dans la sidebar
- **Item** : Document Foundry VTT représentant un objet (arme, armure, équipement)
- **Equipped** : État d'un item actuellement équipé par l'acteur
- **Tags** : Étiquettes descriptives affichées sous les items d'équipement
- **ApplicationV2** : Architecture d'application moderne de Foundry VTT v13

## 3. Requirements, Constraints & Guidelines

### Exigences Fonctionnelles

- **REQ-001** : Afficher l'armure actuellement équipée avec nom, image et propriétés
- **REQ-002** : Afficher les armes équipées (main droite, main gauche, deux mains)
- **REQ-003** : Afficher les accessoires équipés pertinents (future extension)
- **REQ-004** : Mettre à jour automatiquement l'affichage lors des changements d'équipement (sans rechargement manuel)
- **REQ-005** : Permettre l'interaction directe avec les éléments affichés (ouverture feuille item, actions contextuelles)

### Exigences de Design

- **DES-001** : Respecter l'esthétique Star Wars (couleurs, polices, iconographie)
- **DES-002** : S'intégrer harmonieusement au design existant de la feuille
- **DES-003** : Utiliser des icônes cohérentes avec l'univers Star Wars
- **DES-004** : Afficher des informations contextuelles via des tags
- **DES-005** : Assurer une lisibilité optimale sur tous les supports

### Exigences Techniques

- **TEC-001** : Utiliser l'architecture ApplicationV2 de Foundry VTT
- **TEC-002** : Implémenter via le système de templates Handlebars existant
- **TEC-003** : Respecter les patterns de code du système SWERPG (`#prepareFeaturedEquipment`)
- **TEC-004** : Assurer la compatibilité avec Foundry VTT v13+
- **TEC-005** : Optimiser les performances (pas de requêtes inutiles, réutilisation des objets déjà préparés)
- **SEC-001** : Ne pas exposer de données sensibles (affichage uniquement, lecture non destructive)

### Contraintes

- **CON-001** : Limitation d'espace dans la sidebar (largeur fixe contrôlée par variable `--sidebar-width`)
- **CON-002** : Compatibilité avec les items existants du système (armes, armures)
- **CON-003** : Respect de l'API Foundry VTT pour les documents Items et Actor
- **CON-004** : Performance acceptable sur les configurations minimales (<100ms préparation)

### Directives

- **GUD-001** : Privilégier la clarté à la complexité visuelle
- **GUD-002** : Utiliser les systèmes de localisation existants (i18n)
- **GUD-003** : Implémenter des tooltips informatifs & non verbeux
- **GUD-004** : Assurer l'accessibilité (contraste, taille des éléments, aria si nécessaire)

### Patterns à Suivre

- **PAT-001** : Utiliser le pattern de préparation de données `#prepareFeaturedEquipment()`
- **PAT-002** : Reproduire la structure des objets DisplayData (inspiration TalentDisplayData)
- **PAT-003** : Utiliser `item.getTags('short')` pour obtenir des tags concis
- **PAT-004** : Brancher les actions via `data-action` dans le template (ex: `itemSheet`, `equipToggle`)

## 4. Interfaces & Data Contracts

### Structure de Données pour l'Équipement Affiché

```typescript
/**
 * Représente les données d'affichage pour un élément d'équipement.
 */
export interface EquipmentDisplayData {
  id: string // ID unique de l'Item
  name: string // Nom de l'équipement
  img: string // Chemin de l'image de l'équipement
  type: string // Type d'équipement (weapon, armor)
  slot: string // Emplacement (mainhand, offhand, twohand, armor)
  tags: string[] // Tags descriptifs (dégâts, portée, défense...)
  cssClass?: string // Classe CSS optionnelle (ex: broken)
  isEquipped: boolean // État d'équipement
  system: object // Snapshot des données système (lecture seule)
}
```

### Interface Template Handlebars

```handlebars
{{! Current Equipment }}
<h2 class='section-header divider'>{{localize 'ACTOR.LABELS.CURRENT_EQUIPMENT'}}</h2>
<div class='item-list equipped'>
  {{#each featuredEquipment as |equipment|}}
    <div class='equipped line-item {{equipment.cssClass}}' data-item-id='{{equipment.id}}'>
      <img class='icon' src='{{equipment.img}}' alt='{{equipment.name}}' data-action='itemSheet' />
      <div class='title'>
        <h4>{{equipment.name}}</h4>
        <div class='tags'>
          {{#each equipment.tags}}<span class='tag'>{{this}}</span>{{/each}}
        </div>
      </div>
      <div class='controls'>
        <a class='button icon fa-solid fa-shield-alt' data-action='equipToggle' data-tooltip='EQUIPMENT.TOGGLE'></a>
      </div>
    </div>
  {{else}}
    <div class='empty-equipment'>
      <p class='hint'>{{localize 'EQUIPMENT.NO_EQUIPMENT'}}</p>
    </div>
  {{/each}}
</div>
```

### Méthode de Préparation

```javascript
#prepareFeaturedEquipment() {
  const featuredEquipment = []
  const { armor, weapons } = this.actor.equipment

  // Armure équipée
  if (armor?.system?.equipped) {
    const armorTags = armor.getTags('short')
    featuredEquipment.push({
      id: armor.id,
      name: armor.name,
      img: armor.img,
      type: 'armor',
      slot: 'armor',
      tags: [armorTags.armor || 'Armor', armorTags.dodge || armorTags.soak || 'Soak'],
      cssClass: armor.system.broken ? 'broken' : '',
      isEquipped: true,
      system: armor.system,
    })
  }

  // Armes (main / offhand)
  const { mainhand: mh, offhand: oh, twoHanded: th } = weapons
  if (mh?.id) {
    const mhTags = mh.getTags('short')
    featuredEquipment.push({
      id: mh.id,
      name: mh.name,
      img: mh.img,
      type: 'weapon',
      slot: th ? 'twohand' : 'mainhand',
      tags: [mhTags.damage || 'Dmg', mhTags.range || 'Range'],
      cssClass: mh.system.broken ? 'broken' : '',
      isEquipped: true,
      system: mh.system,
    })
  }
  if (oh?.id && !th) {
    const ohTags = oh.getTags('short')
    featuredEquipment.push({
      id: oh.id,
      name: oh.name,
      img: oh.img,
      type: 'weapon',
      slot: 'offhand',
      tags: [ohTags.damage || 'Dmg', ohTags.range || 'Range'],
      cssClass: oh.system.broken ? 'broken' : '',
      isEquipped: true,
      system: oh.system,
    })
  }

  return featuredEquipment
}
```

## 5. Acceptance Criteria

### Fonctionnels

- **AC-001** : Given un personnage avec armure équipée, When la feuille s'ouvre, Then l'armure apparaît dans la section Current Equipment.
- **AC-002** : Given un personnage avec arme à deux mains équipée, When la feuille s'ouvre, Then seule l'arme à deux mains apparaît avec slot = twohand.
- **AC-003** : Given un personnage avec deux armes une main, When la feuille s'ouvre, Then les deux armes apparaissent (mainhand, offhand).
- **AC-004** : Given un changement d'état d'équipement (equip/unequip), When l'item est mis à jour, Then la section se met à jour sans rechargement forcé.
- **AC-005** : Given aucun équipement, When la feuille s'ouvre, Then un message d'aide « EQUIPMENT.NO_EQUIPMENT » est affiché.

### Design

- **AC-006** : Les blocs d'équipement utilisent un fond dégradé sombre + accent color selon thème.
- **AC-007** : Les tags sont lisibles (contraste AA) et limités à 2–4 par item.
- **AC-008** : Les items cassés affichent une classe `.broken` (opacité réduite + filtre).

### Techniques

- **AC-009** : Préparation des données < 100ms sur un personnage standard (<50 items).
- **AC-010** : Aucune mutation involontaire des objets système (lecture seule pour `system`).
- **AC-011** : Aucune erreur ESLint / Prettier sur les ajouts.
- **AC-012** : Compatible Foundry v13 (utilisation API ApplicationV2).

## 6. Test Automation Strategy

- **Test Levels** : Unit (construction des DisplayData), Integration (interaction feuille ↔ actor), End-to-End (équipement en jeu).
- **Frameworks** : Vitest (unit), éventuel Playwright pour E2E si pipeline disponible.
- **Test Data Management** : Factories de mock Actor/Item (objets JSON clonés), reset entre tests.
- **CI/CD Integration** : Inclusion dans job `test.yml` GitHub Actions (déjà existant). Ajout seuil de couverture si nécessaire.
- **Coverage Requirements** : ≥80% lignes sur nouvelles fonctions.
- **Performance Testing** : Mesure simple via `performance.now()` autour de la méthode de préparation.

### Exemple de Test Unitaire

```javascript
describe('#prepareFeaturedEquipment', () => {
  it('retourne armure quand équipée', () => {
    const actor = mockActor({ armor: mockEquippedArmor })
    const sheet = new CharacterSheet({ document: actor })
    const data = sheet.#prepareFeaturedEquipment()
    expect(data).toHaveLength(1)
    expect(data[0].type).toBe('armor')
  })
})
```

## 7. Rationale & Context

L'accès immédiat à l'équipement critique améliore la prise de décision en jeu (combat, interactions). Le choix de la sidebar évite des clics supplémentaires. Les tags condensent l'information clé (dégâts, portée, armure) sans surcharge visuelle. L'approche réutilise les mécanismes déjà présents (getTags, equipment sur Actor) minimisant le risque de régression.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001** : Foundry VTT Core v13 – moteur de rendu et documents.

### Third-Party Services

- **SVC-001** : N/A (aucun service externe).

### Infrastructure Dependencies

- **INF-001** : Navigateur moderne compatible WebGL (standard Foundry).

### Data Dependencies

- **DAT-001** : Données Item existantes (armes/armures) avec champs `system.equipped` et catégories.

### Technology Platform Dependencies

- **PLT-001** : ESModules, Handlebars, ApplicationV2.

### Compliance Dependencies

- **COM-001** : Respect bonnes pratiques sécurité (pas d'injection, affichage texte tag sûr).

## 9. Examples & Edge Cases

```code
// Edge Case: deux armes équipées alors que l'une est twohand -> offhand ignorée
// Edge Case: aucune armure -> objet unarmored virtuel ignoré pour l'affichage (ne pas polluer la vue)
// Edge Case: item cassé => classe CSS .broken appliquée
// Edge Case: tags manquants => fallback valeurs génériques ('Dmg', 'Range')
```

## 10. Validation Criteria

1. Revue de code approuvée (>=1 reviewer).
2. Tests unitaires & intégration passent.
3. Aucune régression observée dans l'onglet Inventory.
4. Conformité accessibilité (contrastes vérifiés via outil dev).
5. Localisation: FR/EN pour clés ajoutées (`EQUIPMENT.NO_EQUIPMENT`, `EQUIPMENT.TOGGLE`).

## 11. Related Specifications / Further Reading

- Architecture feuilles de personnage (`module/applications/sheets/`)
- API Foundry VTT v13 ApplicationV2
- WCAG 2.1 contrast guidelines
- Patterns de tags existants (cf. `SwerpgItem.getTags`)

---

Note: Selon la convention de nommage globale, le fichier devrait idéalement être nommé `spec-design-current-equipment-sidebar.md`. Créé ici selon la demande utilisateur.
