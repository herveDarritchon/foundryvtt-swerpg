# Cadrage — Découpage US16 : Afficher arbres, nœuds et connexions dans la vue graphique

## US parente

**US16 — Afficher arbres, nœuds et connexions dans la vue graphique**

Objectif : livrer une vue graphique en lecture seule d’un arbre de spécialisation résolu, avec nœuds positionnés, connexions visibles, coûts, états visuels et raisons minimales compréhensibles.

Cette US ne couvre pas :
- la sélection interactive de spécialisation courante ;
- l’achat de nœud ;
- la synchronisation post-achat avec l’onglet Talents ;
- la persistance d’un état UI ;
- le zoom, pan, drag ou navigation graphique avancée.

---

## Découpage proposé

## Sous-issue 16.1 — Déterminer l’arbre affiché par défaut

### Objectif

Identifier de manière déterministe l’arbre à afficher dans la vue graphique lorsque l’acteur possède plusieurs spécialisations.

### Règle retenue

En US16, l’arbre affiché par défaut est le **dernier arbre résolu avec `resolvedTreeStatus: "available"` dans l’ordre des spécialisations possédées par l’acteur**.

Cette règle traduit l’idée que la dernière spécialisation possédée est celle qui est considérée comme la plus “active” pour l’utilisateur, sans introduire encore de sélection interactive.

### Inclus

- Parcourir les spécialisations possédées par l’acteur.
- Identifier les arbres résolus disponibles.
- Retenir le dernier arbre `available`.
- Conserver un état vide si aucun arbre affichable n’est disponible.
- Ne pas persister ce choix.

### Exclus

- Sélection manuelle d’une spécialisation.
- Mémorisation de la spécialisation courante.
- Modification de `actor.system` ou `actor.flags`.

### Critères d’acceptation

- Si plusieurs arbres sont disponibles, le dernier dans l’ordre des spécialisations possédées est affiché.
- Si aucun arbre n’est disponible, la vue reste dans son état vide.
- Le comportement est déterministe et couvert par test.

---

## Sous-issue 16.2 — Construire le view-model de rendu de l’arbre courant

### Objectif

Produire un modèle de rendu exploitable par la vue graphique, sans mettre de logique métier dans le code PIXI.

### Inclus

- Ajouter au contexte de `SpecializationTreeApp` un modèle représentant l’arbre courant.
- Normaliser les nœuds à partir du modèle `specialization-tree`.
- Associer à chaque nœud :
  - son identifiant ;
  - son talent ;
  - son coût ;
  - sa position logique `row` / `column` ;
  - son état métier ;
  - ses métadonnées d’affichage.
- Préparer la liste des connexions à rendre.
- Prévoir un fallback explicite si un talent référencé est introuvable.

### Convention de nommage

Pour éviter l’ambiguïté entre disponibilité d’un arbre et disponibilité d’un nœud :

- `resolvedTreeStatus: "available"` désigne le statut de résolution de l’arbre ;
- `nodeState: "available"` désigne l’état d’un nœud achetable.

### Point d’attention

Le statut `available` du resolver d’arbre ne doit pas être confondu avec l’état `available` d’un nœud achetable.

### Critères d’acceptation

- Le view-model expose les nœuds nécessaires au rendu.
- Le view-model expose les connexions nécessaires au rendu.
- Les états de nœuds proviennent de la couche domaine existante.
- Le modèle reste testable sans dépendre du rendu PIXI réel.

---

## Sous-issue 16.3 — Mapper les états et raisons de nœud vers l’UI

### Objectif

Traduire les états métier des nœuds en variantes visuelles et en libellés compréhensibles.

### Inclus

- Mapper les états :
  - `purchased`
  - `available`
  - `locked`
  - `invalid`
- Mapper les `reasonCode` vers des clés i18n.
- Prévoir des libellés utilisateur pour les blocages courants :
  - XP insuffisants ;
  - prérequis non remplis ;
  - talent introuvable ;
  - nœud invalide ;
  - arbre incomplet ou incohérent.

### Exclus

- Texte hardcodé dans l’application.
- Recalcul local des règles de prérequis.
- Modification de la couche domaine.

### Critères d’acceptation

- Chaque état métier attendu possède une variante UI.
- Les raisons affichées passent par l’i18n.
- Un nœud verrouillé ou invalide expose une raison compréhensible.
- Les tests couvrent le mapping état / raison / libellé.

---

## Sous-issue 16.4 — Définir le layout graphique minimal

### Objectif

Convertir les coordonnées logiques `row` / `column` en coordonnées graphiques stables.

### Inclus

- Définir des constantes simples de layout :
  - largeur de nœud ;
  - hauteur de nœud ;
  - espacement horizontal ;
  - espacement vertical ;
  - marges internes du viewport.
- Convertir `row` / `column` en positions graphiques.
- Positionner les connexions à partir des positions calculées des nœuds.

### Exclus

- Zoom.
- Pan.
- Drag.
- Auto-layout complexe.
- Recalcul des positions à partir des connexions.
- Réutilisation du canvas legacy.

### Critères d’acceptation

- Les nœuds sont positionnés à partir de `row` / `column`.
- Les connexions relient les bons nœuds.
- Le layout reste simple, déterministe et testable.
- Aucun couplage au canvas de scène Foundry n’est introduit.

---

## Sous-issue 16.5 — Dessiner les connexions et les nœuds dans PIXI

### Objectif

Afficher visuellement l’arbre courant dans le viewport PIXI autonome livré par US15.

### Inclus

- Nettoyer le viewport avant chaque rendu.
- Dessiner les connexions avant les nœuds.
- Dessiner chaque nœud selon sa position calculée.
- Afficher :
  - le nom du talent ;
  - le coût XP ;
  - l’indication ranked / non-ranked si disponible ;
  - une variante visuelle selon l’état du nœud.
- Garantir une lisibilité minimale.

### Exclus

- Achat de nœud.
- Drag & drop.
- Sélection persistée.
- Rendu pixel-perfect.
- Animations ou transitions avancées.

### Critères d’acceptation

- Un arbre disponible affiche ses nœuds.
- Les connexions sont visibles.
- Les états sont distinguables visuellement.
- Le rendu reste en lecture seule.
- Aucun comportement d’achat n’est déclenché.

---

## Sous-issue 16.6 — Exposer un détail minimal de consultation

### Objectif

Permettre à l’utilisateur de comprendre un nœud sans introduire de gestion d’état applicatif supplémentaire.

### Décision retenue

Le détail est exposé via **tooltip accessible ou libellé adjacent**, sans panneau latéral interactif et sans état UI persistant.

### Inclus

- Afficher les informations principales :
  - nom du talent ;
  - coût XP ;
  - état ;
  - raison localisée si verrouillé ou invalide.
- Utiliser une solution légère ne nécessitant pas de sélection applicative durable.

### Exclus

- Panneau de détail complexe.
- Popover avec état persistant.
- Sélection active de nœud.
- Prévisualisation d’achat.
- Bouton d’achat.

### Critères d’acceptation

- Un utilisateur peut comprendre pourquoi un nœud est verrouillé ou invalide.
- Le détail ne déclenche aucune action métier.
- Aucun état de sélection n’est conservé dans l’application.

---

## Sous-issue 16.7 — Compléter les traductions FR / EN

### Objectif

Ajouter les clés i18n nécessaires à l’affichage des états et raisons de nœud.

### Inclus

- Libellés des états de nœud.
- Raisons principales de verrouillage.
- Raisons principales d’invalidité.
- Fallbacks compréhensibles pour les cas incomplets.

### Fichiers concernés

- `lang/fr.json`
- `lang/en.json`

### Critères d’acceptation

- Les clés FR et EN sont cohérentes.
- Aucun texte utilisateur visible n’est hardcodé dans l’application.
- Les raisons techniques sont reformulées de manière compréhensible.

---

## Sous-issue 16.8 — Étendre les tests de contrat de rendu

### Objectif

Sécuriser le comportement métier et applicatif sans figer le rendu graphique pixel-perfect.

### Inclus

Tester :

- le choix du dernier arbre résolu `available` ;
- l’état vide si aucun arbre disponible ;
- la construction du view-model ;
- la présence des nœuds et connexions ;
- le mapping des états de nœud ;
- le mapping des raisons localisées ;
- l’absence de dépendance au canvas de scène ;
- l’absence de comportement d’achat.

### Exclus

- Snapshots graphiques PIXI fragiles.
- Assertions sur des pixels exacts.
- Tests d’interaction avancée relevant de US17 ou US18.

### Critères d’acceptation

- Les tests documentent clairement le contrat attendu.
- Les diagnostics de test restent lisibles.
- Le rendu graphique reste testable principalement via son view-model.

---

## Synthèse du découpage

| Sous-issue | Sujet | Nature |
|---|---|---|
| 16.1 | Choix de l’arbre affiché par défaut | Logique applicative |
| 16.2 | View-model de rendu | Modèle UI |
| 16.3 | Mapping états / raisons | Pont domaine → UI |
| 16.4 | Layout graphique minimal | Géométrie de rendu |
| 16.5 | Dessin PIXI | Rendu graphique |
| 16.6 | Détail minimal de consultation | UX légère |
| 16.7 | Traductions FR / EN | i18n |
| 16.8 | Tests de contrat | Qualité / non-régression |

---

## Ordre recommandé de réalisation

1. **16.1 — Choix de l’arbre affiché**
2. **16.2 — View-model de rendu**
3. **16.3 — Mapping états / raisons**
4. **16.4 — Layout graphique minimal**
5. **16.5 — Dessin PIXI**
6. **16.6 — Détail minimal**
7. **16.7 — Traductions**
8. **16.8 — Tests**

Les tests peuvent être ajoutés progressivement au fil des sous-issues, mais la sous-issue 16.8 sert de consolidation finale.

---

## Proposition de commits

1. `feat(talent-tree): select latest available resolved tree`
2. `feat(talent-tree): build graphical tree render model`
3. `feat(talent-tree): map node states and lock reasons`
4. `feat(talent-tree): compute minimal tree layout`
5. `feat(talent-tree): draw specialization tree nodes and links`
6. `feat(talent-tree): expose readonly node details`
7. `test(talent-tree): cover graphical tree render contracts`