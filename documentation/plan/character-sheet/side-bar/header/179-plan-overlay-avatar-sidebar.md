# Plan d'implémentation — #179 : Ajouter un overlay visuel en bas de l'avatar dans la sidebar

**Issue** : [#179 — Ajouter un overlay visuel en bas de l'avatar dans la sidebar](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/179)    
**Epic** : [#177 — Epic: Enrichir le header de la sidebar Character Sheet](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/177)   
**ADR(s)** :
- `documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md` (UI en ApplicationV2)
- `documentation/architecture/adr/adr-0004-vitest-testing-strategy.md` (stratégie de test)
- `documentation/architecture/adr/adr-0005-localization-strategy.md` (i18n, pas de nouvelles clés nécessaires)   
**Module(s) impacté(s)** : `templates/sheets/actor/sidebar.hbs` (modification), `styles/actor.less` (modification)

---

## 1. Objectif

Ajouter un overlay translucide, immersif et non interactif en bas de l'avatar dans la sidebar Character Sheet. Cet overlay prépare l'emplacement visuel qui accueillera les ressources `Wounds` et `Strain` dans l'issue `#180`.

`#179` est strictement visuel et structurel : aucun enrichissement du contexte, aucune donnée métier, aucun changement de modèle. L'overlay est vide, positionné, stylé, et ne doit pas bloquer l'interaction `data-action="editImage"` sur l'avatar.

---

## 2. Périmètre

### Inclus dans #179

- Ajout d'un conteneur `.sidebar-profile-overlay` dans `templates/sheets/actor/sidebar.hbs`, à l'intérieur du bloc `{{#if sidebarHeader}}`
- Positionnement absolu en bas de `.sidebar-profile-wrapper`
- Hauteur fixe (~20 %) avec fond semi-translucide `rgba(0, 0, 0, 0.65)` et `backdrop-filter: blur(…)`
- Rendu non interactif : `pointer-events: none` sur tout le conteneur pour préserver le clic `editImage`
- Garde-fou `{{#if sidebarHeader}}` déjà en place, pas de régression sur les sheets `adversary`
- Validation manuelle du rendu visuel (character overlay présent, adversary inchangé)

### Exclu de #179

- Affichage de `Wounds` / `Strain` (valeurs et labels) → issue `#180`
- Enrichissement de `context.sidebarHeader` avec `wounds` / `strain` → `#180`
- Toute modification de `module/applications/sheets/character-sheet.mjs`
- Changement du data model (`actor.system.*`)
- Ajout de clés i18n (aucune nouvelle chaîne utilisateur)
- Création d'un template de sidebar dédié aux `character`
- Refonte du layout de la sidebar ou du header droit
- Tests automatisés de rendu DOM (risque exclusivement CSS/interaction)

---

## 3. Constat sur l'existant

### 3.1. Le bloc `character` est déjà conditionnel dans la sidebar

```
templates/sheets/actor/sidebar.hbs:2-11
```

La template partagée `sidebar.hbs` utilise déjà `{{#if sidebarHeader}}` pour afficher le bloc character. La branche `else` conserve l'image avatar simple pour les autres types d'acteurs.

### 3.2. `.sidebar-profile-wrapper` est déjà en `position: relative`

```
styles/actor.less:315-326
```

Le wrapper qui contient l'image avatar est déjà en `position: relative`, ce qui permet d'y ancrer un overlay en `position: absolute`.

### 3.3. Le contexte `sidebarHeader` n'expose que `name` et `img`

```
module/applications/sheets/character-sheet.mjs:154
```

```js
context.sidebarHeader = { name: s.name, img: s.img }
```

Aucune donnée de `resources.wounds` ou `resources.strain` n'est encore disponible dans le contexte. Ce sera l'objet de `#180`.

### 3.4. La sidebar reste un `PART` partagé

```
module/applications/sheets/base-actor-sheet.mjs:62-66
```

Tous les types d'acteurs utilisent la même template `sidebar.hbs`. La protection `{{#if sidebarHeader}}` est donc essentielle.

### 3.5. Aucun test automatisé de rendu n'existe actuellement

Les tests existants (`tests/applications/sheets/character-sheet-sidebar-header.test.mjs`) valident la présence de `sidebarHeader` dans le contexte, mais ne testent pas le rendu DOM.

---

## 4. Décisions d'architecture

### 4.1. Overlay vide dans `#179` vs overlay déjà peuplé

**Question** : faut-il afficher dès `#179` les ressources `Wounds` / `Strain` dans l'overlay ?

**Options envisagées** :
- Overlay strictement vide (conteneur seul)
- Overlay avec des `div` slots préparés pour `#180`
- Overlay complet avec valeurs déjà branchées

**Décision** : overlay vide, sans conteneur interne supplémentaire.

**Justification** :
- Découpage clair validé : `#179` = structure visuelle, `#180` = contenu métier
- Pas d'enrichissement de contexte ni d'hypothèse sur la mise en page exacte de `#180`
- `#180` pourra ajouter sa structure interne dans le conteneur sans refonte
- Un `div` vide supplémentaire n'a pas de valeur ajoutée immédiate et complexifie le diff

### 4.2. Réutilisation du `PART sidebar` existant vs création d'un template dédié

**Question** : faut-il modifier la template partagée ou en créer une propre aux `character` ?

**Options envisagées** :
- Modifier `templates/sheets/actor/sidebar.hbs`
- Créer `templates/sheets/actor/sidebar-character.hbs`

**Décision** : modifier la template partagée.

**Justification** :
- Le garde-fou `{{#if sidebarHeader}}` existe déjà et protège les autres types d'acteurs
- Créer une seconde sidebar dupliquerait tout le contenu (équipement, actions) pour un seul overlay
- Le pattern est déjà utilisé par `#178`

### 4.3. Overlay interactif vs non interactif

**Question** : comment garantir que le clic sur l'avatar continue d'ouvrir l'éditeur d'image (`data-action="editImage"`) ?

**Options envisagées** :
- Overlay avec `pointer-events: none`
- Overlay transparent aux événements via CSS
- Overlay avec gestion manuelle des événements

**Décision** : `pointer-events: none` sur l'overlay.

**Justification** :
- Solution CSS pure, sans JavaScript
- L'overlay n'a aucun comportement interactif en `#179` (et `#180` affiche seulement des données en lecture seule)
- Aucune régression possible si l'overlay ne capture pas les événements souris
- Compatible avec les futurs ajouts de contenu

### 4.4. Changement de contexte vs pure évolution template/CSS

**Question** : faut-il enrichir `sidebarHeader` dès `#179` avec les données `wounds` / `strain` ?

**Options envisagées** :
- Enrichir le contexte dès maintenant
- Ne rien changer au contexte

**Décision** : ne pas modifier le contexte.

**Justification** :
- `#179` ne consomme et n'affiche aucune donnée métier
- Enrichir le contexte maintenant créerait une dépendance inutile du template vers des données non utilisées
- `#180` portera à la fois l'enrichissement du contexte et l'affichage des données
- Responsabilité unique : `#179` = structure visuelle, `#180` = données

### 4.5. Tests automatisés vs validation manuelle

**Question** : quelle stratégie de validation pour un changement purement CSS/interaction ?

**Options envisagées** :
- Ajouter un test de rendu DOM automatisé
- Valider manuellement sur les deux types d'acteurs

**Décision** : validation manuelle uniquement, pas de test automatisé.

**Justification** :
- Le risque principal est CSS (positionnement, superposition, blur) et non logique métier
- Les tests existants (`sidebar-header.test.mjs`) couvrent déjà le garde-fou `sidebarHeader`
- Un test de template purement structurel serait fragile et de faible valeur sans moteur de rendu UI stabilisé
- La validation manuelle est documentée dans ce plan (voir étape 3)

---

## 5. Plan de travail détaillé

### Étape 1 : Ajouter le conteneur overlay dans la sidebar `character`

**Fichier** : `templates/sheets/actor/sidebar.hbs`

Dans le bloc `{{#if sidebarHeader}}`, à l'intérieur de `.sidebar-profile-wrapper` et **après** `<img class="profile">`, ajouter :

```hbs
<div class="sidebar-profile-overlay"></div>
```

Le résultat dans la branche `character` devient :

```hbs
{{#if sidebarHeader}}
  <div class="sidebar-header">
    <input class="sidebar-name" name="name" type="text" value="{{sidebarHeader.name}}" placeholder="Actor Name">
    <div class="sidebar-profile-wrapper">
      <img class="profile" src="{{sidebarHeader.img}}" alt="{{sidebarHeader.name}}"
           width="200" height="200" data-action="editImage" data-edit="img">
      <div class="sidebar-profile-overlay"></div>
    </div>
  </div>
{{else}}
  <img class="profile" src="{{source.img}}" alt="{{source.name}}"
       width="200" height="200" data-action="editImage" data-edit="img" />
{{/if}}
```

**Risque spécifique** : ne pas ajouter accidentellement l'overlay dans la branche `else`. L'overlay doit rester exclusif à la branche `character`.

### Étape 2 : Styliser l'overlay pour un rendu immersif et discret

**Fichier** : `styles/actor.less`

Ajouter sous `.sidebar-profile-wrapper` (après `img.profile` existant) :

```less
.sidebar-profile-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20%;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  border-radius: 0 0 4px 4px;
  pointer-events: none;
}
```

Explications des choix de style :
- `position: absolute` + ancrage `bottom:0 / left:0 / right:0` : l'overlay occupe toute la largeur de l'image et est collé en bas
- `height: 20%` : hauteur proportionnelle à l'image, ajustable ultérieurement
- `background: rgba(0, 0, 0, 0.65)` : fond sombre semi-transparent, assure un bon contraste même si `backdrop-filter` n'est pas supporté
- `backdrop-filter: blur(2px)` : flou artistique Star Wars, dégradé gracieusement si absent
- `border-radius: 0 0 4px 4px` : cohérent avec le `border-radius: 4px` de l'image
- `pointer-events: none` : garantit que les clics passent au travers vers l'image

**Risque spécifique** : si `height: 20%` est trop petit ou trop grand sur certains portraits très verticaux, prévoir un ajustement manuel.

### Étape 3 : Vérifier la non-régression fonctionnelle et visuelle

**Fichiers** : aucun changement obligatoire

Valider manuellement les scénarios suivants :

| Scénario | Attendu |
|---|---|
| Character Sheet, avatar | Un bandeau translucide apparaît en bas de l'image |
| Character Sheet, clic sur l'avatar | L'éditeur d'image s'ouvre (l'overlay ne bloque pas) |
| Character Sheet, redimensionnement | L'overlay suit la largeur de l'image et reste proportionnel |
| Adversary Sheet | Pas d'overlay, sidebar inchangée |
| Sidebar en mode compact (si applicable) | L'overlay reste visible et ne décale pas le contenu |

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `templates/sheets/actor/sidebar.hbs` | Modification | Ajout du `<div class="sidebar-profile-overlay">` dans la branche `{{#if sidebarHeader}}` |
| `styles/actor.less` | Modification | Ajout des styles `.sidebar-profile-overlay` : position absolute, fond rgba, blur, pointer-events |

---

## 7. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| L'overlay bloque le clic sur l'avatar | Élevé | `pointer-events: none` + validation manuelle du scénario `editImage` |
| Régression sur les sheets `adversary` | Élevé | Overlay strictement dans la branche `{{#if sidebarHeader}}` ; tester qu'AdversarySheet reste inchangée |
| Overlay trop petit ou trop grand visuellement | Moyen | Valeur initiale `height: 20%`, ajustement possible en `#180` avec `min-height` / `max-height` si nécessaire |
| `backdrop-filter` non supporté (Safari, certains environnements) | Faible | Le fond `rgba` assure le rendu visuel ; le flou est un enrichissement progressif |
| L'overlay dépasse visuellement des bords de l'image | Faible | `border-radius` cohérent avec celui de `.sidebar-profile-wrapper img.profile` ; vérifier que l'ancrage `left/right: 0` reste dans le wrapper |

---

## 8. Proposition d'ordre de commit

1. **`feat(sidebar-header): add avatar overlay container to character sidebar`**
   - `templates/sheets/actor/sidebar.hbs`
   - Ajout du `<div class="sidebar-profile-overlay">` dans la branche `{{#if sidebarHeader}}`

2. **`style(sidebar-header): add translucent avatar overlay with backdrop blur`**
   - `styles/actor.less`
   - Styles `.sidebar-profile-overlay` : positionnement, fond, blur, pointer-events

---

## 9. Dépendances avec les autres US

- `#179` dépend de `#178` — le bloc `{{#if sidebarHeader}}`, `.sidebar-profile-wrapper` et `context.sidebarHeader` sont déjà en place
- `#180` dépend de `#179` — l'overlay vide sera le conteneur d'affichage de `Wounds` / `Strain`
- Ordre d'implémentation conseillé dans l'épic `#177` :
  1. `#178` — ✅ déjà implémenté
  2. `#179` — ce plan
  3. `#180` — affichage des ressources dans l'overlay
