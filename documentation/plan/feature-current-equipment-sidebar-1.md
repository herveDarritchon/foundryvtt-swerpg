---
goal: Implémentation affichage équipement actuel dans la sidebar de la feuille de personnage
version: 1.0
date_created: 2025-11-10
last_updated: 2025-11-10
owner: Star Wars Edge RPG System Team
status: Completed
tags: [feature, ui, actor-sheet, equipment, sidebar]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan d'implémentation détaillé et déterministe pour la fonctionnalité "Current Equipment Display" décrite dans `spec/design-current-equipment-sidebar.md`. Ce plan structure les phases, tâches et validations pour ajouter l'affichage immersif de l'équipement équipé (armes, armure) dans la barre latérale gauche des feuilles d'acteur (personnage). Toutes les étapes sont atomiques, exécutables par un agent AI ou un humain, sans ambiguïté.

## 1. Requirements & Constraints

Synthèse des exigences issues de la spécification (mappées aux identifiants du plan). Les contraintes et patterns définissent les limites techniques et stylistiques obligatoires.

- **REQ-001**: Afficher l'armure équipée (nom, image, tags principaux)
- **REQ-002**: Afficher armes équipées (mainhand, offhand ou twohand)
- **REQ-003**: Ignorer offhand si arme twohand équipée
- **REQ-004**: Mise à jour automatique lors equip/unequip (sans rechargement manuel de la feuille)
- **REQ-005**: Interactions: ouverture feuille item, futur toggle equip
- **DES-001**: Style conforme ambiance Star Wars (palette sombre + accents)
- **DES-002**: Intégration harmonieuse avec structure existante `.sheet-sidebar`
- **DES-003**: Icônes Foundry / système uniformes (pas d'incohérence visuelle)
- **DES-004**: Tags concis (2–4 max) lisibles contraste AA
- **DES-005**: Indicateur visuel item cassé (`.broken`)
- **TEC-001**: Utiliser méthode `#prepareFeaturedEquipment()` dans `SwerpgBaseActorSheet`
- **TEC-002**: Pas de mutation involontaire des objets `system`
- **TEC-003**: Performance <100ms préparation sur acteur <50 items
- **TEC-004**: Compatible Foundry V13 ApplicationV2
- **TEC-005**: Fallback pour tags manquants ("Dmg", "Range", "Armor", "Soak")
- **SEC-001**: Affichage lecture seule; aucune exposition de données sensibles; pas d'injection
- **CON-001**: Largeur fixe sidebar (`--sidebar-width`); ne pas déborder
- **CON-002**: Ne pas charger de modules externes supplémentaires
- **GUD-001**: Localisation EN + FR pour nouvelles clés (`EQUIPMENT.NO_EQUIPMENT`, `EQUIPMENT.TOGGLE`)
- **PAT-001**: Utiliser pattern existant de préparation `#prepareFeaturedEquipment()` (remplacer stub vide)
- **PAT-002**: Reprendre structure DisplayData homogène (propriétés exactes: id,name,img,type,slot,tags,cssClass,isEquipped,system)
- **PAT-003**: Tags via `item.getTags('short')`
- **PAT-004**: Intégration handlebars dans `templates/sheets/actor/sidebar.hbs`

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Implémenter préparation des données d'équipement et adapter le template pour l'affichage basique.

| Task     | Description                                                                                                                                                                                                                                                                            | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Modifier `module/applications/sheets/base-actor-sheet.mjs`: remplacer corps de méthode privée `#prepareFeaturedEquipment()` (actuellement retourne `{}`) par logique création tableau `featuredEquipment` selon spec. Inclure fallback tags et statut broken. Ajout commentaire JSDoc. |           |      |
| TASK-002 | Ajouter import éventuel `logger` si non présent à la section où méthode modifiée (vérifier déjà inclus). Ne pas dupliquer import.                                                                                                                                                      |           |      |
| TASK-003 | Mettre à jour `templates/sheets/actor/sidebar.hbs`: remplacer bloc actuel `<div class="equipped line-item">` pour utiliser structure avec `data-item-id`, ajout `controls` contenant bouton placeholder equipToggle (même si non câblé initialement).                                  |           |      |
| TASK-004 | Ajouter message vide si `featuredEquipment` length=0 via bloc `{{else}}` déjà existant ou confirmer; ajouter clé localisation fallback si absent.                                                                                                                                      |           |      |
| TASK-005 | Ajouter clés localisation dans `lang/en.json` et `lang/fr.json`: `"EQUIPMENT.NO_EQUIPMENT": "No equipped items"/"Aucun équipement équipé"`, `"EQUIPMENT.TOGGLE": "Toggle Equip"/"Changer état équipement"`.                                                                            |           |      |
| TASK-006 | Vérifier que `_prepareContext` dans `base-actor-sheet.mjs` inclut déjà `featuredEquipment: this.#prepareFeaturedEquipment()` (présent) - si manquant l'ajouter avant retour.                                                                                                           |           |      |
| TASK-007 | Lancer tests existants pour s'assurer absence de régression (vitest).                                                                                                                                                                                                                  |           |      |

Completion Criteria Phase 1: Méthode retourne tableau correct pour cas armure + arme main; template affiche données; localisation résolue; aucun test existant cassé.

### Implementation Phase 2

- GOAL-002: Ajouter stylisation immersive Star Wars et gestion état cassé.

| Task     | Description                                                                                                                                                                                                                                 | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | Modifier `styles/actor.less` (ou créer bloc dans `styles/swerpg.less` si convention) pour ajouter styles `.sheet-sidebar .item-list.equipped .equipped` avec gradient, hover, `.broken` (opacité, filtre), styles tags (taille, uppercase). |           |      |
| TASK-009 | Compiler LESS (commande projet `pnpm build` ou script dédié) et vérifier génération CSS `styles/swerpg.css` contient nouveaux sélecteurs.                                                                                                   |           |      |
| TASK-010 | Vérifier contraste couleurs (manuel ou script) pour tags sur fond sombre (AA). Ajuster si nécessaire.                                                                                                                                       |           |      |
| TASK-011 | Ajouter test visuel automatisé (optionnel) capture DOM (si pipeline Playwright disponible) - sinon marquer comme non applicable.                                                                                                            |           |      |

Completion Criteria Phase 2: Styles appliqués, classes `.broken` visibles en conditions simulées, aucun débordement horizontal, build CSS réussi.

### Implementation Phase 3

- GOAL-003: Ajouter tests unitaires pour la méthode de préparation et scénarios edge cases.

| Task     | Description                                                                                                                           | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-012 | Créer fichier `tests/applications/actor/featuredEquipment.test.js`.                                                                   |           |      |
| TASK-013 | Implémenter factory mock item (fonction `mockItem({id,name,img,type,system,tags})`) retournant objet avec méthode `getTags('short')`. |           |      |
| TASK-014 | Cas test: armure seule -> length=1 type=armor slot=armor tags fallback si manquants.                                                  |           |      |
| TASK-015 | Cas test: arme twohand -> offhand ignorée; slot=twohand.                                                                              |           |      |
| TASK-016 | Cas test: deux armes one-hand -> length=2 slots mainhand/offhand.                                                                     |           |      |
| TASK-017 | Cas test: arme cassée -> cssClass contient "broken" lorsque `system.broken=true`.                                                     |           |      |
| TASK-018 | Cas test: aucun équipement -> tableau vide.                                                                                           |           |      |
| TASK-019 | Mesure performance simple: wrapper appel dans `performance.now()` et expect <50ms pour mocks (documenter).                            |           |      |
| TASK-020 | Ajouter vérification immutabilité: origine objets `system` non modifiés (deepEqual avant/après).                                      |           |      |

Completion Criteria Phase 3: Tous tests passent; couverture ≥80% sur fichier modifié; performance test < seuil; immutabilité confirmée.

### Implementation Phase 4

- GOAL-004: (Optionnel évolutif) Ajouter interaction toggle equip côté sidebar.

| Task     | Description                                                                                                                                                                                                                              | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-021 | Ajouter mapping action `equipToggle` dans `SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions` pointant vers nouvelle méthode statique `#onSidebarEquipToggle`.                                                                                |           |      |
| TASK-022 | Implémenter méthode `#onSidebarEquipToggle(event)` récupérant item via `event.target.closest('.equipped').dataset.itemId`, déterminant type (armor/weapon) puis appel `actor.equipArmor()` ou `actor.equipWeapon()` avec inversion état. |           |      |
| TASK-023 | Forcer re-render partiel: appeler `this.render()` après update pour reflet immédiat.                                                                                                                                                     |           |      |
| TASK-024 | Ajouter test intégration simulant toggle (mock actor methods) et vérifier changement valeur `system.equipped`.                                                                                                                           |           |      |
| TASK-025 | Ajouter conditions action cost (si combat) respectées — si échec, catch et `ui.notifications.warn()`.                                                                                                                                    |           |      |

Completion Criteria Phase 4: Bouton toggle fonctionne pour armes et armure, notifications en cas d'échec, tests intégration correspondants OK.

### Implementation Phase 5

- GOAL-005: Validation finale et durcissement sécurité / accessibilité.

| Task     | Description                                                                                           | Completed | Date |
| -------- |-------------------------------------------------------------------------------------------------------| --------- | ---- |
| TASK-026 | Audit sécurité visuel: aucune insertion HTML non contrôlée (utiliser texte brut pour tags).           |           |      |
| TASK-027 | Vérifier attribut `alt` sur toutes images d'équipement (déjà présent); si manquant, ajouter nom item. |           |      |
| TASK-028 | Ajouter `aria-label` sur bouton equipToggle si nécessaire (`aria-label="Toggle Equipment"`).          |           |      |
| TASK-029 | Lancer linter (`pnpm eslint`) et formatter si besoin.                                                 |           |      |
| TASK-030 | Mise à jour CHANGELOG.md section "Added" (entrée: Equipment sidebar display).                         |           |      |
| TASK-031 | Marquer plan `status: In progress` puis `Completed` une fois tous tasks cochés.                       |           |      |

Completion Criteria Phase 5: Lint OK, accessibilité respectée, changelog mis à jour, statut final mis à jour, aucune fuite HTML.

## 3. Alternatives

- **ALT-001**: Affichage dans onglet Inventory uniquement — rejeté car nécessite navigation supplémentaire.
- **ALT-002**: Overlay flottant dynamique — rejeté car complexité UI accrue et risque conflit HUD Foundry.

## 4. Dependencies

- **DEP-001**: Système d'acteur fournit `actor.equipment` (déjà implémenté).
- **DEP-002**: Méthode `item.getTags('short')` disponible sur `SwerpgItem`.
- **DEP-003**: Localisation base (lang/en.json, lang/fr.json) pour ajout nouvelles clés.
- **DEP-004**: Build LESS → CSS existant fonctionnel (`swerpg.less`).

## 5. Files

- **FILE-001**: `module/applications/sheets/base-actor-sheet.mjs` (implémentation méthode préparation + actions sidebar toggle phase 4).
- **FILE-002**: `templates/sheets/actor/sidebar.hbs` (ajout structure contrôles + classes CSS).
- **FILE-003**: `styles/actor.less` (ou `styles/swerpg.less` si centralisation) (nouveaux styles d'équipement).
- **FILE-004**: `lang/en.json` (localisation nouvelles clés).
- **FILE-005**: `lang/fr.json` (localisation nouvelles clés).
- **FILE-006**: `tests/applications/actor/featuredEquipment.test.js` (nouveaux tests unitaires).
- **FILE-007**: `CHANGELOG.md` (documentation ajout fonctionnalité).

## 6. Testing

- **TEST-001**: Unitaire - armure seule (retourne 1 entrée type armor).
- **TEST-002**: Unitaire - arme twohand (retourne slot twohand, offhand absent).
- **TEST-003**: Unitaire - deux armes one-hand (retourne 2 entrées slots mainhand/offhand).
- **TEST-004**: Unitaire - item cassé => cssClass="broken".
- **TEST-005**: Unitaire - aucun équipement => tableau vide.
- **TEST-006**: Performance - durée <50ms sur mocks.
- **TEST-007**: Intégration - toggle equip sur mainhand appelle `actor.equipWeapon` avec inversion état.
- **TEST-008**: Intégration - equip armor quand déjà équipée nouvelle => armure précédente déséquipée (si logique existante conserve).
- **TEST-009**: Accessibilité - attribut alt présent et aria-label bouton.

## 7. Risks & Assumptions

- **RISK-001**: Mutation involontaire de `system` si copie superficielle -> atténuation: deepClone non nécessaire si lecture seule, éviter assign.
- **RISK-002**: Performance dégradée si `getTags()` coûteux sur grand nombre d'items -> atténuation: limiter aux équipés (2–3 items).
- **RISK-003**: Conflit CSS avec classes existantes `.line-item` -> atténuation: scope sélecteurs sous `.sheet-sidebar .item-list.equipped`.
- **RISK-004**: API `actor.equipWeapon` / `actor.equipArmor` peut lancer erreurs action cost -> gérer via try/catch + notification.
- **ASSUMPTION-001**: Propriété `actor.equipment` toujours préparée avant rendu sheet.
- **ASSUMPTION-002**: Méthode `getTags('short')` retourne objet clé/valeur (string) stable.
- **ASSUMPTION-003**: Build LESS déjà configuré dans pipeline CI.

## 8. Related Specifications / Further Reading

- `spec/design-current-equipment-sidebar.md`
- Foundry VTT API v13 (ApplicationV2, Documents)
- OWASP Secure Coding Guidelines (affichage non modifiable)
- WCAG 2.1 (contraste, accessibilité)
