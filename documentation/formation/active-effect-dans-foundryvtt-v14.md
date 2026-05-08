# Rapport — Implémenter les Active Effects dans un système Foundry VTT V14+

## 1. Point de départ : ce qu’un système doit comprendre

Un `ActiveEffect` est un document embarqué dans un `Actor` ou un `Item`. Il appartient à la collection `effects` de son parent, et Foundry expose `Actor` et `Item` comme parents possibles. ([foundryvtt.com][1])

Le principe fonctionnel est simple : un Active Effect ne doit normalement pas modifier la donnée source persistée de l’acteur. Il modifie la donnée préparée, c’est-à-dire la représentation utilisée après préparation de l’acteur. La documentation utilisateur Foundry explique explicitement que l’original reste inchangé et que l’effet s’applique à une copie préparée, ce qui permet de retirer l’effet sans perdre la valeur initiale. ([foundryvtt.com][2])

En V14, il y a un changement important : les changements d’un effet ne sont plus structurés comme avant autour de `ActiveEffect#changes`, mais sont migrés dans `ActiveEffect#system#changes`. Foundry indique que les `TypeDataModel` fournis par les packages doivent implémenter ce champ, le plus simplement en sous-classant `foundry.data.ActiveEffectTypeDataModel`. ([foundryvtt.com][3])

Conséquence directe pour un système V14+ : **les Active Effects ne sont pas seulement une UI d’effets**. Ils deviennent un contrat entre :

1. le modèle de données de l’acteur ;
2. le modèle de données de l’effet ;
3. le pipeline de préparation de l’acteur ;
4. les règles de durée, d’expiration et de suppression ;
5. éventuellement les règles propres au système.

---

# 2. Les grandes stratégies d’implémentation

## Stratégie A — Utiliser les modes natifs sur les chemins de données de l’acteur

C’est l’approche la plus simple : un Active Effect cible une clé d’attribut comme :

```js
system.attributes.speed.value
system.abilities.str.value
system.defenses.ac.bonus
```

L’effet applique ensuite un mode de changement : `add`, `subtract`, `multiply`, `override`, `upgrade`, `downgrade` ou `custom`. Foundry V14 définit ces types de changement et leurs priorités par défaut : `custom: 0`, `multiply: 10`, `add/subtract: 20`, `downgrade: 30`, `upgrade: 40`, `override: 50`. ([foundryvtt.com][4])

Exemple conceptuel :

```js
{
  name: "Hâte",
  type: "base",
  img: "icons/svg/upgrade.svg",
  system: {
    changes: [
      {
        key: "system.movement.walk.bonus",
        type: "add",
        value: "10",
        phase: "apply",
        priority: 20
      }
    ]
  },
  duration: { rounds: 10 },
  disabled: false
}
```

Le nom exact des champs dépend du modèle de données de ton système. Le point important en V14 est que les changements sont dans `system.changes`, pas dans une ancienne propriété racine `changes`.

### Avantages

C’est lisible, testable et compatible avec l’écosystème Foundry. Les utilisateurs avancés peuvent comprendre l’effet sans lire le code du système. C’est aussi la meilleure option pour les bonus simples : bonus de vitesse, bonus de CA, malus de compétence, résistance ajoutée à une liste, remplacement d’un mode de vision, etc.

### Inconvénients

Cette approche devient fragile si tu appliques directement les effets sur des valeurs finales calculées. Exemple : si `system.defense.ac.total` est une donnée dérivée recalculée dans `prepareDerivedData`, appliquer un `add` directement dessus peut être écrasé ensuite ou produire un ordre de calcul ambigu.

### Quand l’utiliser

À utiliser pour les modifications déterministes et locales :

```txt
+2 à une caractéristique
+1 à une défense
remplacer une image de token
ajouter une résistance dans une liste
fixer une valeur minimale avec upgrade
fixer une valeur maximale avec downgrade
```

À éviter pour :

```txt
lancer un jet
appliquer des dégâts
déclencher une animation
créer un item
modifier définitivement l’acteur
exécuter une logique conditionnelle lourde
```

---

## Stratégie B — Faire cibler les effets vers des “buckets” de modificateurs, pas vers les totaux

C’est souvent la meilleure architecture pour un système sérieux.

Au lieu de permettre :

```txt
system.defenses.ac.total += 2
```

on fait cibler :

```txt
system.modifiers.ac.status
system.modifiers.ac.circumstance
system.modifiers.speed.item
system.bonuses.attack.melee
```

Puis `prepareDerivedData()` calcule les totaux à partir de ces entrées.

Exemple :

```js
// Active Effect
{
  key: "system.modifiers.ac.status",
  type: "add",
  value: "2",
  phase: "apply",
  priority: 20
}
```

Puis côté acteur :

```js
prepareDerivedData() {
  super.prepareDerivedData();

  const system = this.system;

  system.defenses.ac.total =
    system.defenses.ac.base
    + system.modifiers.ac.status
    + system.modifiers.ac.item
    + system.modifiers.ac.circumstance;
}
```

### Avantages

C’est robuste. Tu sépares clairement :

```txt
source persistée → effets → données dérivées
```

Cela évite de stocker des totaux modifiés, réduit les bugs d’ordre de préparation, et rend les règles plus explicites.

### Inconvénients

Il faut concevoir le modèle de données en amont. Cela ajoute plus de champs dans `system`, et donc plus de migration à maintenir. Mais c’est le prix d’un système propre.

### Quand l’utiliser

C’est l’approche recommandée pour les systèmes complexes : bonus typés, empilement limité, bonus conditionnels, caps, malus, résistances, immunités, états, niveaux de blessure, etc.

---

## Stratégie C — Utiliser `custom` pour déléguer la logique au système

Foundry prévoit un mode `custom`. La documentation précise que ce mode applique une logique définie par le système de jeu ou par un module. ([foundryvtt.com][2])

L’idée : l’effet ne dit pas seulement “ajoute 2 à tel champ”, il dit “applique une règle métier”.

Exemple conceptuel :

```js
{
  key: "system.rules.grantAdvantage",
  type: "custom",
  value: "perception",
  phase: "apply",
  priority: 0
}
```

Puis le système intercepte cette règle.

Selon l’architecture retenue, cela peut se faire par :

```js
Hooks.on("applyActiveEffect", (actor, change, current, delta, changes) => {
  if (change.type !== "custom") return;

  switch (change.key) {
    case "system.rules.grantAdvantage":
      changes[`system.rollOptions.${change.value}.advantage`] = true;
      break;
  }
});
```

Ou par une sous-classe de `ActiveEffect` / logique d’application dédiée, selon le degré de contrôle voulu. Foundry expose `applyChange` et `applyChangeField`, qui permettent d’appliquer un changement à un document ou à un champ, avec support de données de remplacement pour les expressions `@`. ([foundryvtt.com][1])

### Avantages

C’est flexible. Tu peux modéliser des règles qui ne rentrent pas dans `add`, `multiply` ou `override`.

Exemples :

```txt
accorder un avantage à certains jets
ajouter une option de jet
débloquer une action spéciale
changer une catégorie d’armure
ajouter une règle d’exception
activer un tag utilisé ailleurs dans le système
```

### Inconvénients

C’est moins transparent pour les utilisateurs. Un effet `custom` n’a pas de sens sans le code du système. Cela demande aussi une très bonne discipline : si chaque effet devient un mini-script, le système devient ingérable.

### Quand l’utiliser

À utiliser quand la règle est métier, pas mathématique.

Bon usage :

```txt
“tant que cet effet est actif, le personnage est considéré comme invisible”
“cet effet ajoute le trait ‘flying’ aux options de mouvement”
“cet effet rend les attaques d’opportunité impossibles”
```

Mauvais usage :

```txt
“+2 en Force”
“+1 mètre de déplacement”
“CA minimum 16”
```

Ces cas doivent rester des changements natifs.

---

## Stratégie D — Utiliser les Active Effects comme porteurs de tags, puis résoudre les règles ailleurs

C’est une variante propre de `custom`.

L’effet ne modifie presque aucune donnée numérique. Il ajoute des tags ou états normalisés :

```js
{
  key: "system.traits.conditions",
  type: "add",
  value: "frightened",
  phase: "apply",
  priority: 20
}
```

Puis les jets, l’UI ou les calculateurs de règles interrogent les tags actifs :

```js
const frightened = actor.system.traits.conditions.includes("frightened");

if (frightened) {
  rollData.modifiers.push({ slug: "frightened", value: -2 });
}
```

### Avantages

C’est extrêmement lisible. Les effets deviennent des faits déclaratifs :

```txt
l’acteur est effrayé
l’acteur vole
l’acteur est invisible
l’acteur est empoisonné
```

Le reste du système décide quoi faire de ces faits.

### Inconvénients

Cela demande une couche de résolution des règles. Un tag seul ne fait rien. Si le système ne consomme pas correctement ces tags, les effets semblent “ne pas marcher”.

### Quand l’utiliser

Très bon choix pour :

```txt
conditions
traits temporaires
immunités
états narratifs
options de roll
permissions temporaires
capacités activées
```

---

## Stratégie E — Effets d’Item transférés à l’Actor

Foundry distingue les effets portés directement par un acteur, les effets liés aux conditions, et les effets d’item. La documentation indique qu’un item contenant un Active Effect peut transférer cet effet à l’acteur lorsqu’il est porté ou ajouté, par exemple pour un objet magique qui augmente une caractéristique. ([foundryvtt.com][2])

Exemple typique :

```txt
Anneau de protection
  Active Effect transféré :
    key: system.modifiers.ac.item
    type: add
    value: 1
```

### Avantages

C’est naturel pour les équipements, dons, pouvoirs passifs, implants, cyberwares, armures, armes enchantées.

Cela permet aussi d’embarquer la règle avec l’objet. Quand l’item est copié, exporté ou mis en compendium, l’effet suit.

### Inconvénients

Il faut définir clairement les règles d’activation :

```txt
L’effet est-il actif si l’objet est seulement dans l’inventaire ?
Faut-il qu’il soit équipé ?
Faut-il qu’il soit attuné / préparé / chargé ?
Faut-il supprimer ou supprimer-suspendre l’effet quand l’objet est déséquipé ?
```

Si le système ne gère pas la suppression ou la suppression logique, les effets d’item deviennent vite incohérents.

### Recommandation

Ne laisse pas `transfer: true` faire toute la logique métier à ta place si ton système a des états d’équipement complexes. Utilise `isSuppressed`, ou une logique équivalente, pour que l’effet existe mais ne s’applique pas quand l’item n’est pas réellement actif. Foundry V14 expose `isSuppressed` comme le fait qu’une logique système, ou à défaut l’expiration, rend l’effet inéligible à l’application. ([foundryvtt.com][1])

---

## Stratégie F — Conditions / status effects

Les conditions sont le cas d’usage le plus visible : “Prone”, “Dead”, “Invisible”, “Poisoned”, “Blessed”, etc.

Foundry décrit les effets de condition comme des effets souvent définis au niveau système et appliqués via le Token HUD. ([foundryvtt.com][2])

Un système peut donc définir un catalogue de statuts avec icône, label, identifiant et données d’effet. Ensuite, quand l’utilisateur clique sur le statut dans le HUD, l’Active Effect correspondant est créé sur l’acteur.

### Avantages

C’est accessible aux joueurs et MJ. Les conditions sont visibles sur le token, filtrables, et manipulables par l’interface.

### Inconvénients

Il ne faut pas confondre condition et règle complète. Une condition peut porter des changements, mais la logique complexe associée doit souvent rester dans le système.

Exemple : “Grappled” peut réduire le mouvement à 0 via un effet. Mais “ne peut pas se déplacer sauf téléportation” est une règle que le système doit comprendre dans sa logique d’action, pas seulement dans un champ numérique.

### Quand l’utiliser

À utiliser pour tout état visible, temporaire, directement manipulable en jeu.

---

## Stratégie G — Effets de région, scène ou environnement

Foundry V14 introduit des comportements de région capables d’appliquer des Active Effects aux tokens dans une zone : la documentation de `ApplyActiveEffectRegionBehaviorType` indique que le comportement applique les effets configurés à l’acteur du token lorsqu’il entre dans la région, puis les retire quand il en sort. ([foundryvtt.com][5])

Exemples :

```txt
zone de blizzard : effet “ralenti”
hautes herbes : effet “couvert léger”
aura sacrée : bonus de sauvegarde
zone toxique : condition “empoisonné”
```

### Avantages

C’est idéal pour les effets spatiaux. Tu évites d’écrire une logique propriétaire pour détecter entrée/sortie de zone.

### Inconvénients

Il faut être prudent avec les acteurs liés à plusieurs tokens, les tokens non liés, et les scènes multiples. La question “où vit l’effet ?” devient importante : sur l’acteur, sur le token synthétique, ou sur une logique temporaire liée à la scène.

### Quand l’utiliser

À utiliser pour les auras, terrains, zones dangereuses, couvertures, lumières magiques, champs de force.

---

## Stratégie H — Modifier les propriétés de token via Active Effects

V14 ajoute la possibilité de cibler des données de token avec des Active Effects. Foundry mentionne explicitement les modifications de vision, modes de détection, lumière, image, alpha, disposition, taille, etc., via `Actor.tokenOverrides`, avec une réserve : les changements de dimensions de token sur grille ne sont pas traités automatiquement, et un système peut surcharger `TokenDocument#_onOverrideSize` pour une logique propre. ([foundryvtt.com][3])

Exemples :

```txt
torche équipée → émission de lumière
lunettes nocturnes → mode de vision
déguisement magique → image du token
invisibilité → alpha réduit ou effet visuel
```

### Avantages

Très puissant pour rendre les effets visibles et automatiques.

### Inconvénients

C’est facile d’en abuser. Le token est une représentation scénique ; toutes les règles ne doivent pas être encodées dans le token. Attention aussi aux acteurs avec plusieurs tokens : une modification pensée comme “scénique” peut devenir globale si elle est appliquée au mauvais niveau.

### Quand l’utiliser

À utiliser pour les effets visuels et sensoriels :

```txt
lumière
vision
détection
apparence
opacité
disposition
```

À éviter pour les statistiques de jeu pures, sauf si la règle dépend réellement du token.

---

# 3. Gestion des durées et expirations en V14

V14 améliore fortement la durée des Active Effects. Foundry indique que les durées peuvent être définies autrement qu’en secondes et inclure un événement d’expiration, par exemple début ou fin de combat, de tour ou de round. Les systèmes peuvent étendre ces options avec des événements personnalisés et annoncer leur occurrence via `ActiveEffect.registry#refresh`. ([foundryvtt.com][3])

Foundry expose aussi `ActiveEffect.registry`, un registre qui suit les effets temporaires, leurs durées et leurs statuts expirés. ([foundryvtt.com][6])

### Implémentation recommandée

Pour un système V14+, il faut définir une politique claire :

```txt
Effets instantanés : pas des Active Effects.
Effets persistants : Active Effects sans durée.
Effets temporaires en temps réel : durée en secondes.
Effets de combat : durée en rounds / tours / événements.
Effets système : événements d’expiration personnalisés.
```

Exemple d’événements métier possibles :

```txt
endOfScene
afterNextAttack
afterNextDamageRoll
startOfCasterTurn
afterRest
afterShortRest
afterLongRest
```

### Attention

Ne mets pas toute la logique de durée dans des hooks bricolés si le registre V14 peut la gérer. L’équipe Crucible a justement migré sa gestion personnalisée des durées round/tour vers le système natif `ActiveEffectRegistry` de V14, ce qui montre la direction attendue par Foundry. ([GitHub][7])

---

# 4. Où placer la logique : Active Effect, Actor, Item ou système de jets ?

## Règle simple

Un Active Effect doit exprimer **un état ou une modification stable**.

Il ne doit pas devenir un moteur de règles complet.

### À mettre dans l’Active Effect

```txt
bonus
malus
minimum / maximum
override temporaire
trait temporaire
condition
vision / lumière / apparence de token
durée
origine
icône
statut
```

### À mettre dans l’Actor

```txt
calcul des totaux
empilement des bonus
validation des caps
suppression des effets inapplicables
préparation des données dérivées
normalisation des listes
```

### À mettre dans l’Item

```txt
quand l’effet est accordé
si l’objet est équipé
si l’objet est activé
si l’objet a des charges
si l’objet est préparé
```

### À mettre dans le moteur de jets

```txt
avantage / désavantage
relance
degré de succès
modificateur contextuel
résistance appliquée aux dégâts
règles conditionnelles dépendant de la cible
```

---

# 5. Recommandation d’architecture pour un système V14+

## Architecture minimale acceptable

Pour un petit système :

```txt
Actor.system contient les valeurs modifiables.
ActiveEffect.system.changes cible ces valeurs.
prepareDerivedData calcule les totaux.
Les sheets affichent un onglet Effects.
Les conditions sont configurées via status effects.
```

C’est suffisant pour un système léger.

## Architecture robuste

Pour un système professionnel :

```txt
1. ActorDataModel typé.
2. ActiveEffect TypeDataModel dédié, basé sur ActiveEffectTypeDataModel.
3. Champs de modificateurs séparés des totaux.
4. Catalogue de conditions système.
5. Gestion claire des effets transférés depuis les items.
6. Système d’expiration utilisant ActiveEffect.registry.
7. Custom changes limités à des règles métier déclaratives.
8. Tests de préparation d’acteur avec plusieurs effets concurrents.
```

---

# 6. Tableau comparatif

| Approche                            |               Usage principal | Avantages                       | Limites                                 | Recommandation                      |
| ----------------------------------- | ----------------------------: | ------------------------------- | --------------------------------------- | ----------------------------------- |
| Changements natifs sur champs Actor |                 Bonus simples | Simple, lisible, compatible     | Fragile sur données dérivées            | Oui, pour les cas simples           |
| Buckets de modificateurs            |            Systèmes complexes | Robuste, maintenable            | Demande un bon modèle de données        | Meilleure approche générale         |
| `custom` change mode                |                 Règles métier | Très flexible                   | Opaque, facile à surutiliser            | À limiter                           |
| Tags déclaratifs                    |           Conditions / traits | Très propre conceptuellement    | Nécessite une couche de résolution      | Excellent choix                     |
| Effets transférés d’Item            | Équipement / pouvoirs passifs | Naturel, portable en compendium | Activation/suppression à gérer          | Fortement recommandé                |
| Conditions / status effects         |                États visibles | UX claire                       | Ne suffit pas pour les règles complexes | Recommandé                          |
| Effets de région                    |               Auras / terrain | Spatial, automatique            | Attention aux tokens multiples          | Très utile en V14                   |
| Token overrides                     |  Vision / lumière / apparence | Très immersif                   | Risque de confusion Actor/Token         | À utiliser pour le visuel/sensoriel |

---

# 7. Les erreurs à éviter

## 1. Modifier directement les totaux finaux

Mauvais :

```txt
system.ac.total + 2
```

Meilleur :

```txt
system.modifiers.ac.status + 2
```

Puis `prepareDerivedData()` recalcule `system.ac.total`.

## 2. Utiliser `override` trop souvent

`override` est brutal. Il remplace. Il doit être réservé aux règles qui disent vraiment “cette valeur devient X”.

Exemples corrects :

```txt
la vitesse devient 0
la CA minimale devient 16 → plutôt upgrade selon le modèle
le token prend telle image
```

## 3. Faire des Active Effects des scripts cachés

Un effet doit rester inspectable. Si l’effet déclenche des cascades invisibles, les développeurs et les MJ ne pourront pas déboguer.

## 4. Mélanger source data et derived data

Les données persistées doivent rester propres. Les effets doivent modifier la donnée préparée ou des champs prévus pour cela.

## 5. Ignorer l’expiration native V14

V14 ajoute un registre et des événements d’expiration. Recréer une gestion maison des durées round/tour est rarement justifié. ([foundryvtt.com][3])

---

# 8. Exemple de design recommandé

Imaginons un système avec trois types de bonus : `status`, `item`, `circumstance`.

## Modèle acteur

```js
system: {
  abilities: {
    strength: {
      base: 10,
      total: 10
    }
  },
  modifiers: {
    strength: {
      status: 0,
      item: 0,
      circumstance: 0
    }
  }
}
```

## Active Effect

```js
{
  name: "Force du taureau",
  type: "base",
  system: {
    changes: [
      {
        key: "system.modifiers.strength.status",
        type: "add",
        value: "4",
        phase: "apply",
        priority: 20
      }
    ]
  },
  duration: {
    rounds: 10
  }
}
```

## Préparation acteur

```js
prepareDerivedData() {
  super.prepareDerivedData();

  const s = this.system;

  s.abilities.strength.total =
    s.abilities.strength.base
    + s.modifiers.strength.status
    + s.modifiers.strength.item
    + s.modifiers.strength.circumstance;
}
```

C’est la bonne direction : l’effet ne sait pas comment la Force totale est calculée. Il fournit seulement une contribution.

---

# 9. Conclusion nette

Pour former des développeurs Foundry VTT V14+, je recommanderais ce message central :

**Les Active Effects ne sont pas faits pour coder toutes les règles. Ils sont faits pour déclarer des modifications temporaires ou conditionnelles que le système sait ensuite interpréter.**

La meilleure implémentation est généralement hybride :

```txt
Changements natifs pour les bonus simples.
Buckets de modificateurs pour les statistiques.
Tags pour les conditions et états.
Custom changes pour les règles métier rares.
Item effects pour équipement et capacités passives.
Registry V14 pour les durées.
Token overrides pour les effets visuels/sensoriels.
Region effects pour les effets spatiaux.
```

Le mauvais design consiste à laisser les Active Effects écrire partout dans `system` sans stratégie. Le bon design consiste à préparer le modèle de données pour recevoir les effets proprement, puis à centraliser la résolution des règles dans l’acteur, les items et le moteur de jets.

[1]: https://foundryvtt.com/api/classes/foundry.documents.ActiveEffect.html "ActiveEffect | Foundry Virtual Tabletop - API Documentation - Version 14"
[2]: https://foundryvtt.com/article/active-effects/ "Active Effects | Foundry Virtual Tabletop"
[3]: https://foundryvtt.com/releases/14.353 "Release 14.353 | Foundry Virtual Tabletop"
[4]: https://foundryvtt.com/api/v14/variables/CONST.ACTIVE_EFFECT_CHANGE_TYPES.html "ACTIVE_EFFECT_CHANGE_TYPES | Foundry Virtual Tabletop - API Documentation - Version 14"
[5]: https://foundryvtt.com/api/classes/foundry.data.regionBehaviors.ApplyActiveEffectRegionBehaviorType.html?utm_source=chatgpt.com "ApplyActiveEffectRegionBehavio..."
[6]: https://foundryvtt.com/api/classes/foundry.documents.ActiveEffect.html?utm_source=chatgpt.com "ActiveEffect | Foundry Virtual Tabletop - API Documentation"
[7]: https://github.com/foundryvtt/crucible/issues/607 "V14 Active Effect Redesign · Issue #607 · foundryvtt/crucible · GitHub"
