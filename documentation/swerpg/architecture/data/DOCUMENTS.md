# Document Extensions - Architecture des Documents

## 🎯 Vue d'ensemble

Documentation des extensions de documents Foundry utilisées dans swerpg.

## 📊 Architecture des Documents

| Document     | Classe               | Responsabilité                         |
| ------------ | -------------------- | -------------------------------------- |
| Actor        | `SwerpgActor`        | Gestion des personnages et adversaires |
| Item         | `SwerpgItem`         | Gestion des objets, talents, sorts     |
| Combat       | `SwerpgCombat`       | Gestion des rencontres de combat       |
| ActiveEffect | `SwerpgActiveEffect` | Gestion des effets actifs              |
| Token        | `SwerpgToken`        | Représentation canvas des acteurs      |
| ChatMessage  | `SwerpgChatMessage`  | Messages de chat enrichis              |

## 🔧 Patterns d'Extension

### SwerpgActor

- Calculs des attributs dérivés
- Gestion des compétences
- Système de talents

### SwerpgItem

- Actions liées aux items
- Effets mécaniques
- Validation des prérequis

---

> 📖 **Documentation complète à venir**
