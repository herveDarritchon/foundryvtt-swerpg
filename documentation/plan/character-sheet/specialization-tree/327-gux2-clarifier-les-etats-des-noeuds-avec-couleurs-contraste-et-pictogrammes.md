---
goal: Clarifier les états des nœuds de l'arbre de spécialisation avec couleurs, contraste et pictogrammes
version: 2.0
date_created: 2026-05-21
last_updated: 2026-05-21
status: 'In progress'
tags: feature, specialization-tree, visual-refresh, gux
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Mettre à jour le contrat visuel des nœuds de l'arbre de spécialisation pour que chaque nœud expose clairement son type (actif/passif) et son état métier (acheté/disponible/verrouillé/invalide) en combinant **couleur, contraste, iconographie SVG et hiérarchie visuelle**, sans modifier les règles domaine.

Ce plan remplace la v1 (implémentée partiellement dans PR #333) pour corriger les écarts détectés avec le cadrage `cadrage-refonte-graphique.md` §3.

## 1. Requirements & Constraints

- **REQ-001**: La couleur de fond du nœud doit exprimer le type métier : bleu pour passif, rouge pour actif (cadrage §3.1.1)
- **REQ-002**: La luminosité de la couleur doit exprimer l'état d'achat : dense + bordure lumineuse pour acheté, atténué + bordure terne pour disponible (cadrage §3.1.1)
- **REQ-003**: Chaque nœud doit porter un pictogramme SVG chargé comme texture PIXI, positionné en haut-droit (cadrage §3.1.2)
- **REQ-004**: Les icônes SVG sont : `sell-card.svg` (acheté), `buy-card.svg` (disponible), `padlock.svg` (verrouillé), `hazard-sign.svg` (invalide)
- **REQ-005**: Les nœuds verrouillés doivent rester lisibles pour la planification : texte 65-70% opacité, bordure grise nette, fond sombre pas noir, coût XP toujours lisible (cadrage §3.2)
- **REQ-006**: Le coût XP doit être stable et structuré, optionnellement avec pastille `[5 XP]` pour les nœuds disponibles (cadrage §3.3)
- **REQ-007**: Au moins un indice non chromatique par état (le pictogramme SVG)
- **REQ-008**: Aucune modification des règles de calcul d'état ou de `reasonCode`
- **CON-001**: Les fichiers SVG existent déjà dans `assets/images/icons/` — pas de création d'assets
- **CON-002**: Le module `node-ui-state.mjs` doit rester pur (zéro dépendance Foundry/PIXI)
- **CON-003**: Les clés i18n existantes sont réutilisées ; n'ajouter que si nécessaire
- **PAT-001**: Suivre le pattern `enrichNode()` existant pour l'enrichissement des nœuds
- **PAT-002**: Centraliser tout le mapping visuel dans `node-ui-state.mjs`

## 2. Implementation Steps

### Implementation Phase 1 — Correction des couleurs : palette active/passive + luminance état

- GOAL-001: Rebaser la palette `NODE_STATE_VARIANTS` sur le système bleu (passif) / rouge (actif) avec différenciation par luminance entre acheté et disponible, et renforcer la lisibilité des verrouillés.

| Task     | Description                                                                                                                                                                  | Completed  | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| TASK-001 | Définir la matrice combinant état × type → attributs : fillColor, borderColor, borderWidth, alpha, textColor, costColor avec bleu (passif) / rouge (actif) en teinte de base |            |            |
| TASK-002 | Appliquer la luminance : acheté → saturation élevée + bordure lumineuse (borderWidth+glow) ; disponible → saturation réduite + bordure terne                                 |            |            |
| TASK-003 | Mettre à jour la matrice des verrouillés : fond sombre mais pas noir (ex: `0x1a1a1a`), texte 65-70% opacité, bordure grise nette (borderWidth 2), coût XP en `0x999999`      |            |            |
| TASK-004 | Mettre à jour la matrice des invalides : teinte rouge sombre, bordure rouge terne, texte lisible                                                                             |            |            |
| TASK-005 | Conserver l'indicateur iconographique actif/passif (`nodeTypeIcon`) en complément de la couleur                                                                              | ✅ PR #333 | 2026-05-21 |
| TASK-006 | Mettre à jour `enrichNode()` si la signature change pour accepter les nouvelles données                                                                                      |            |            |
| TASK-007 | Mettre à jour les tests `node-ui-state.test.mjs` : vérifier chaque combinaison état × type avec les nouvelles couleurs                                                       |            |            |

### Implementation Phase 2 — Pictogrammes SVG chargés comme textures PIXI

- GOAL-002: Remplacer les pictogrammes Unicode par des sprites PIXI chargés depuis `assets/images/icons/`, positionnés en haut-droit du nœud.

| Task     | Description                                                                                                                                                                        | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | Exporter les constantes de chemins SVG dans `node-ui-state.mjs` : `NODE_STATE_SVG_ICONS` mappant chaque état → chemin relatif                                                      |           |      |
| TASK-009 | Créer une fonction utilitaire `loadStatePictogram(state): Promise<PIXI.Texture>` dans la couche applicative (hors module pur)                                                      |           |      |
| TASK-010 | Implémenter un cache de textures (`Map<string, PIXI.Texture>`) pour éviter de recharger les SVGs à chaque render                                                                   |           |      |
| TASK-011 | Dans `#drawTree()` de `specialization-tree-app.mjs` : charger la texture au premier render, créer un `PIXI.Sprite` positionné en haut-droit (node.x + NODE_WIDTH - 20, node.y + 4) |           |      |
| TASK-012 | Fallback : si le chargement SVG échoue, afficher le pictogramme Unicode comme fallback                                                                                             |           |      |
| TASK-013 | Mettre à jour les tests de rendu PIXI dans `specialization-tree-app.test.mjs` : vérifier la présence du Sprite                                                                     |           |      |
| TASK-014 | Supprimer le rendu Unicode des pictogrammes en bas-droit (remplacé par SVG en haut-droit)                                                                                          |           |      |

### Implementation Phase 3 — Stabilisation du coût XP

- GOAL-003: Rendre l'affichage du coût XP plus structuré et cohérent visuellement entre tous les états.

| Task     | Description                                                                                                     | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-015 | Pour les nœuds disponibles : afficher le coût XP dans une pastille/badge `[5 XP]` avec une couleur plus visible |           |      |
| TASK-016 | Pour les nœuds achetés : afficher le coût XP en texte secondaire (grisé)                                        |           |      |
| TASK-017 | Pour les nœuds verrouillés et invalides : coût XP en texte lisible, identique au texte principal                |           |      |
| TASK-018 | Mettre à jour `#drawTree()` : appliquer le style de coût selon l'état du nœud                                   |           |      |
| TASK-019 | Mettre à jour les tests de rendu PIXI pour vérifier le style du coût XP par état                                |           |      |

### Implementation Phase 4 — Finalisation i18n et documentation

- GOAL-004: Ajouter les clés i18n minimales et finaliser la documentation.

| Task     | Description                                                                                               | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-020 | Ajouter les clés i18n dans `lang/en.json` et `lang/fr.json` si des libellés SVG ou badges sont introduits |           |      |
| TASK-021 | Mettre à jour la Définition of Done dans ce plan                                                          |           |      |
| TASK-022 | Exécuter la suite complète de tests (`pnpm test`)                                                         |           |      |

## 3. Alternatives

- **ALT-001** (implémenté dans PR #333) : Pictogrammes Unicode au lieu de SVG. Rejeté car le cadrage demande explicitement des SVG et les assets existent déjà. Les caractères Unicode sont moins précis visuellement et ne peuvent pas être stylisés (couleur, taille, rotation).
- **ALT-002** (implémenté dans PR #333) : Couleur par état (vert/bleu/gris/rouge foncé) au lieu de couleur par type (bleu passif/rouge actif). Rejeté car le cadrage §3.1.1 spécifie que la couleur doit porter la distinction actif/passif, pas l'état d'achat.
- **ALT-003** : Distinction actif/passif uniquement par icône sans couleur. Rejeté car le cadrage veut un système redondant : couleur + icône + pictogramme.

## 4. Dependencies

- **DEP-001**: `assets/images/icons/sell-card.svg` — existe déjà
- **DEP-002**: `assets/images/icons/buy-card.svg` — existe déjà
- **DEP-003**: `assets/images/icons/padlock.svg` — existe déjà
- **DEP-004**: `assets/images/icons/hazard-sign.svg` — existe déjà
- **DEP-005**: PR #333 (branche `feat/327-clarifier-etats-noeuds-couleurs-contraste-pictogrammes`) — doit être soit mergée puis corrigée, soit remplacée

## 5. Files

- **FILE-001**: `module/applications/specialization-tree/node-ui-state.mjs` — matrice des variantes visuelles, constantes SVG, `enrichNode()`
- **FILE-002**: `module/applications/specialization-tree-app.mjs` — rendu PIXI avec sprites SVG, badge XP, palette mise à jour
- **FILE-003**: `tests/applications/specialization-tree/node-ui-state.test.mjs` — tests mapping état/type → variante
- **FILE-004**: `tests/applications/specialization-tree-app.test.mjs` — tests rendu PIXI (sprites, badge, palette)
- **FILE-005**: `lang/en.json` — clés i18n si nouveaux libellés
- **FILE-006**: `lang/fr.json` — clés i18n si nouveaux libellés

## 6. Testing

- **TEST-001**: Vérifier que chaque combinaison `{state} × {type}` produit la variante visuelle correcte (couleur, luminance, bordure)
- **TEST-002**: Vérifier que les pictogrammes SVG sont chargés et affichés comme sprites PIXI en haut-droit
- **TEST-003**: Vérifier le fallback Unicode quand le SVG ne charge pas
- **TEST-004**: Vérifier que le coût XP s'affiche avec le bon style selon l'état : badge pour disponible, texte secondaire pour acheté, texte normal pour verrouillé/invalide
- **TEST-005**: Vérifier que les nœuds verrouillés ont texte 65-70% opacité et bordure grise nette
- **TEST-006**: Vérifier qu'aucune régression sur les tests existants (3363 tests passent)

## 7. Risks & Assumptions

- **RISK-001**: Les textures PIXI chargées depuis des fichiers SVG peuvent ne pas s'afficher correctement selon le rendu SVG du navigateur. Mitigation : test manuel sur Chrome/Firefox/Safari.
- **RISK-002**: Le cache de textures peut consommer de la mémoire si de nombreux SVGs sont chargés. Mitigation : 4 icônes seulement, impact négligeable.
- **RISK-003**: PR #333 a déjà modifié les fichiers ; la rebase ou le remplacement peut causer des conflits. Mitigation : travailler sur la même branche et forcer le push, ou créer une nouvelle branche depuis develop.
- **ASSUMPTION-001**: Les fichiers SVG dans `assets/images/icons/` sont compatibles PIXI (pas de SVG complexe avec CSS externe).
- **ASSUMPTION-002**: Le système de couleurs bleu/rouge pour actif/passif est cohérent avec l'identité visuelle Star Wars Edge (holographique bleu pour les compétences passives, rouge/ambre pour les actions actives).

## 8. Related Specifications / Further Reading

- [Cadrage refonte graphique — §3 (Améliorations des nœuds)](file:///Users/hervedarritchon/Workspace/Perso/FoundryVTT/foundryvtt-swerpg/documentation/cadrage/character-sheet/specialization-tree/cadrage-refonte-graphique.md)
- [Issue #327 — GUX2](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/327)
- [PR #333 — Implémentation v1 (à corriger)](https://github.com/herveDarritchon/foundryvtt-swerpg/pull/333)
- [Plan précédent v1](file:///Users/hervedarritchon/Workspace/Perso/FoundryVTT/foundryvtt-swerpg/documentation/plan/character-sheet/talent/234-plan-appliquer-variantes-visuelles-etats-noeud.md)
- [Plan précédent : mapping états](file:///Users/hervedarritchon/Workspace/Perso/FoundryVTT/foundryvtt-swerpg/documentation/plan/character-sheet/specialization-tree/296-mapper-les-etats-et-raisons-de-noeud-vers-l-ui.md)
