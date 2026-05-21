# 1. Diagnostic rapide

L’évolution est nette : l’écran est plus exploitable qu’avant. Les nœuds sont lisibles, les états sont visibles, l’achat
et l’oubli existent, et le panneau de détail apporte enfin une information contextuelle utile.

Mais l’interface reste encore trop “technique”. Elle montre les choses, mais elle ne les **met pas assez en scène comme
un flux d’action joueur**.

Le joueur doit comprendre en 2 secondes :

1. ce que j’ai déjà acheté ;
2. ce que je peux acheter maintenant ;
3. pourquoi je ne peux pas acheter le reste ;
4. combien cela va me coûter ;
5. ce que je risque de casser si j’oublie un talent.

Aujourd’hui, ces informations existent partiellement, mais elles sont dispersées ou trop implicites.

---

# 2. Améliorations de l’écran principal

## 2.1. Réduire fortement le header

Le grand titre “SPECIALIZATION TREES: BLUE SHADOW” prend encore trop de place. Il donne une belle ambiance, mais il
mange de l’espace utile.

Je proposerais de passer de ça :

> SPECIALIZATION TREES: BLUE SHADOW
> Dedicated graphical viewport…

À un header plus compact :

> Blue Shadow — Specialization Trees
> Scoundrel · 2 purchased · 2 available · 5 XP available

Le nom de la fenêtre Foundry porte déjà une partie de l’information. Le grand titre interne peut devenir une **barre de
contexte**, pas un panneau marketing.

À faire :

* réduire la hauteur du header ;
* afficher la progression utile ;
* afficher l’XP disponible si l’achat est possible depuis l’écran ;
* garder le style Star Wars mais avec moins de verticalité.

---

## 2.2. Ajouter une barre de statut de progression

Actuellement, l’utilisateur doit déduire l’état général de l’arbre en regardant les nœuds. Il manque une synthèse.

Exemple de barre utile :

> Scoundrel — 2/20 talents purchased · 2 available · 5 XP available · Tree available

Cela doit être placé dans la sidebar sur la carte de spécialisation.

---

## 2.3. Mieux exploiter la sidebar

### 2.3.1. Simplifier le contenu de la sidebar

La sidebar répète encore “Scoundrel” deux fois. C’est une perte d’espace.

Supprimer la deuxième ligne qui sera remplacée par la barre de progression (2.2 Ajouter une barre de statut de progression)

### 2.3.2. Rendre l'arbre actif plus visible

Améliorer l'affichage de l'arbre actif:
* avoir un effet hover sur l'arbre que l'on survole (couleur de fond plus claire, bordure lumineuse, etc.) pour indiquer que c'est cliquable.
* mettre en surbrillance l'arbre actif dans la sidebar quand il est sélectionné.
* 

---

# 3. Améliorations des nœuds

## 3.1. Clarifier les états par icône + couleur + texte

Actuellement, on distingue :

* vert : acheté ;
* bleu : disponible ;
* sombre : verrouillé.

C’est correct, mais encore trop dépendant de la couleur.

### 3.1.1. Correction de la couleur des noeuds

Règles métier de la couleur :
* bleu: talent passif
* rouge: talent actif
* acheté: couleur plus dense, bordure lumineuse
* disponible: couleur plus claire, bordure terne

Jouer sur la luminosité des couleurs pour exprimer qu'un nœud est acheté ou pas.

Mettre à jour la couleur des nœuds pour respecter ces règles métier. Par exemple, les talents passifs seront bleus. Les talents actifs seront rouges. Les talents achetés auront une couleur plus dense et une bordure lumineuse, tandis que les talents disponibles auront une couleur plus foncé/terne et une bordure terne.

### 3.1.2. Ajouter un pictogramme

Je veux ajouter un petit marqueur discret (dans le coin en haut à droite) dans chaque nœud (en utilisant un svg chargé comme texture PIXI) :

* assets/images/icons/sell-card.svg pour acheté ;
* assets/images/icons/buy-card.svg pour achetable ;
* assets/images/icons/padlock.svg pour verrouillé ;
* assets/images/icons/hazard-sign.svg pour invalide / non résolu.

Pas besoin d’un pictogramme très visible. Un petit marqueur suffit, mais il rend l’état beaucoup plus immédiat.

---

## 3.2. Éviter que les talents verrouillés deviennent illisibles

Les talents verrouillés sont trop effacés. On comprend qu’ils sont indisponibles, mais on perd en confort de lecture.

Un verrouillé doit être secondaire, pas fantomatique.

Je proposerais :

* texte à 65–70 % d’opacité, pas 35–40 % ;
* bordure grise plus nette ;
* fond sombre, mais pas noir ;
* coût XP toujours lisible.

Le joueur doit pouvoir planifier son build. Donc les talents verrouillés doivent rester lisibles.

---

## 3.3. Mettre le coût XP en position plus stable

Le coût XP est actuellement en bas à gauche, ce qui est bien. Je le rendrais un peu plus structuré :

```text
Black Market Contacts (R)

5 XP
```

Ou avec une pastille :

```text
Black Market Contacts (R)
[5 XP]
```

Pour les nœuds disponibles, le coût pourrait être plus visible, car c’est une donnée de décision. Pour les talents
achetés, le coût peut être secondaire.

---

# 4. Améliorations des connexions

## 4.1. Les liens doivent raconter le chemin

Les connexions existent, mais elles ne portent pas encore assez d’information.

Je proposerais trois styles :

* lien acheté → plus lumineux que le lien menant vers un noeud disponible ;
* lien menant vers un nœud disponible → neutre ;
* lien verrouillé → gris sombre.

Cela permet au joueur de voir le chemin de progression d’un coup d’œil.

---

## 4.2. Highlight au survol

Quand le joueur survole un nœud :

*
* mettre en lumière ses prérequis directs ;
* mettre en lumière les talents qu’il débloque ;
* atténuer légèrement le reste.

C’est une amélioration UX très forte. Elle répond immédiatement à :

> “Pourquoi ce talent est disponible ?”
> “Qu’est-ce que ce talent débloque ?”
> “Qu’est-ce que je casse si je l’oublie ?”

---

# 5. Améliorations du panneau de détail

Le panneau en bas à droite est une très bonne direction. Il apporte enfin du contexte. Mais il doit devenir le centre de
décision.

## 5.1. Ajouter une action directement dans le panneau

Aujourd’hui, le panneau affiche :

> Hidden Storage
> Cost: 15 XP
> Type: Ranked Talent
> State: Locked
> Reason: Prerequisites not met

C’est bien pour un nœud verrouillé. Mais pour un nœud disponible, le panneau devrait afficher l’action :

```text
Convincing Demeanor

Cost: 10 XP
Type: Ranked Talent
State: Available

[Purchase for 10 XP]
```

Pour un nœud acheté :

```text
Black Market Contacts

Cost: 5 XP
Type: Ranked Talent
State: Purchased

[Forget and refund 5 XP]
```

Et si l’oubli est impossible :

```text
[Cannot forget]
This talent is required by:
- Convincing Demeanor
- Hidden Storage
```

Le panneau doit éviter d’être seulement informatif. Il doit devenir un **panneau d’action contextualisé**.

---

## 5.2. Afficher les prérequis manquants

“Prerequisites not met” est trop vague.

Il faut viser :

```text
Reason: Requires one connected purchased talent.
Missing prerequisite:
- Convincing Demeanor, 10 XP
```

Ou si le système ne connaît pas précisément le nom :

```text
Reason: No connected prerequisite has been purchased.
```

Un joueur ne doit pas avoir à deviner.

---

## 5.3. Ajouter la description du talent

À terme, le panneau doit afficher la description du talent, au moins en version repliable.

Exemple :

```text
Black Market Contacts (Ranked)

Cost: 5 XP
State: Purchased
Rank: 1

Effect:
When purchasing illegal goods, reduce rarity by 1 per rank.
```

C’est important, parce que l’achat ne se fait pas seulement selon le coût ou la position : il se fait selon l’effet.

Tu peux le faire en deux niveaux :

* V1 : état + coût + action ;
* V2 : description complète + source.

---

# 6. Amélioration des dialogues d’achat / oubli

Les dialogues fonctionnent, mais ils sont encore trop bruts.

## 6.1. Problème actuel

Les messages sont directs :

> Spend 10 XP to purchase Convincing Demeanor?

> Forget Black Market Contacts and refund 5 XP?

C’est clair, mais un peu pauvre. Surtout pour une action qui modifie la fiche.

---

## 6.2. Dialogue d’achat recommandé

Je proposerais :

```text
Purchase talent

Convincing Demeanor (Ranked)
Specialization: Scoundrel
Cost: 10 XP

XP before: 15
XP after: 5

[Purchase] [Cancel]
```

Pourquoi c’est mieux :

* le joueur voit le contexte ;
* il voit l’impact XP ;
* le bouton confirme l’action réelle, pas juste “Yes”.

Il faut éviter “Yes / No” dans ce genre d’interface. Les boutons doivent être actionnels.

Donc :

* “Purchase” au lieu de “Yes” ;
* “Cancel” au lieu de “No”.

---

## 6.3. Dialogue d’oubli recommandé

Pour l’oubli :

```text
Forget talent

Black Market Contacts (Ranked)
Specialization: Scoundrel
Refund: 5 XP

XP before: 5
XP after: 10

This will remove this purchased node from the specialization tree.

[Forget talent] [Cancel]
```

Si l’oubli a des conséquences :

```text
This action is blocked because the following purchased talents depend on it:
- Convincing Demeanor
- Hidden Storage
```

Dans ce cas, ne pas afficher un bouton “Forget”. Afficher seulement “Close”.

---

## 6.4. Attention au vocabulaire “Forget”

“Forget” fonctionne techniquement, mais ce n’est peut-être pas le meilleur wording produit.

Dans une fiche personnage, “forget” peut sembler diégétique : le personnage oublie vraiment le talent. Or ici, on parle
plutôt d’annuler un achat.

Options possibles :

* **Refund talent**
* **Remove purchase**
* **Undo purchase**
* **Forget talent**

Pour une VTT UI, je recommanderais plutôt :

* en anglais : **Refund talent**
* en français : **Rembourser le talent** ou **Annuler l’achat**

“Forget” est acceptable si c’est déjà le vocabulaire du système, mais “Undo purchase” est plus précis.

---

# 7. Amélioration du flux d’interaction

## 7.1. Clic simple = sélection, pas action directe

Le clic sur un nœud devrait sélectionner le nœud et afficher le panneau de détail. Il ne doit pas ouvrir directement une
modale d’achat ou d’oubli.

Flux recommandé :

1. je clique sur un nœud ;
2. le panneau détail s’ouvre ou se met à jour ;
3. je clique sur “Purchase” ou “Refund” dans le panneau ;
4. la modale de confirmation apparaît ;
5. je confirme.

C’est plus sûr, plus lisible et moins frustrant.

---

## 7.2. Double-clic optionnel pour utilisateurs avancés

Tu pourrais prévoir plus tard :

* double-clic sur un nœud disponible → ouvrir confirmation d’achat ;
* double-clic sur un nœud acheté → ouvrir confirmation d’oubli.

Mais pas prioritaire. Le flux principal doit rester explicite.

---

## 7.3. Curseur et hover

Le curseur doit raconter ce qui est possible :

* nœud disponible : cursor pointer ;
* nœud acheté : cursor pointer ;
* nœud verrouillé : cursor help ou default ;
* nœud invalide : cursor not-allowed ou help.

Au hover :

* nœud disponible : halo léger ;
* nœud acheté : halo vert ;
* nœud verrouillé : highlight sobre + panneau expliquant le blocage ;
* nœud invalide : highlight ambre/rouge.

---

# 8. Légende et aide à la lecture

Il manque une légende. Elle n’a pas besoin d’être grosse.

Exemple en bas à gauche du canevas :

```text
✓ Purchased    + Available    🔒 Locked    ⚠ Invalid
```

Ou sous forme de petites pastilles.

Pourquoi c’est important : même si toi tu connais les états, un joueur ne les connaît pas forcément. Une légende évite
l’apprentissage implicite.

---

# 9. Amélioration de l’immersion Star Wars

L’écran est déjà sombre et “sci-fi”. Mais l’identité Star Wars Edge peut être plus forte sans nuire à l’usage.

Je proposerais une direction :

## “Outer Rim Datapad”

Pas trop impérial, pas trop cyberpunk, pas trop MMO. Un outil de contrebandier : lisible, fonctionnel, un peu usé.

Éléments possibles :

* grille holographique très discrète dans le fond du canevas ;
* coins légèrement biseautés sur les nœuds ;
* petites lignes de scan très subtiles ;
* icônes simples façon datapad ;
* labels courts en capitales seulement pour les métadonnées, pas pour tout ;
* glow limité aux nœuds actionnables.

À éviter :

* trop d’animations ;
* trop de néon ;
* gros effets de particules ;
* typographie illisible ;
* modales trop décorées.

---

# 10. Points de friction actuels à corriger

## 10.1. Le flou derrière les modales

Sur les captures avec modale, le fond est très flouté. L’effet est élégant, mais il rend la scène assez lourde
visuellement.

Je proposerais :

* réduire légèrement le blur ;
* augmenter l’opacité de l’overlay sombre ;
* garder les nœuds visibles mais non distrayants.

Le but est de comprendre le contexte sans fatiguer.

---

## 10.2. Les boutons “Yes / No”

C’est le point UX le plus faible des modales.

À remplacer par :

* **Purchase / Cancel**
* **Refund / Cancel**
* **Forget talent / Cancel** si tu gardes “forget”.

“Oui / Non” est toujours moins bon qu’un verbe d’action explicite.

---

## 10.3. La modale est trop large pour peu d’information

La modale occupe beaucoup d’espace mais affiche peu de contenu. Soit tu l’enrichis avec XP avant/après et contexte, soit
tu la compactes.

Je recommande de l’enrichir, car l’action est importante.

---

# 11. Proposition d’UI cible

## 11.1. Nœud disponible

```text
+ Convincing Demeanor (R)
10 XP
```

Style :

* bordure cyan ;
* fond bleu sombre ;
* léger halo au hover ;
* clic → panneau détail ;
* bouton “Purchase for 10 XP”.

---

## 11.2. Nœud acheté

```text
✓ Black Market Contacts (R)
5 XP
```

Style :

* fond vert sombre ;
* bordure verte ;
* coche discrète ;
* connexions sortantes actives ;
* panneau détail avec “Refund purchase”.

---

## 11.3. Nœud verrouillé

```text
🔒 Hidden Storage
15 XP
```

Style :

* fond gris sombre ;
* texte encore lisible ;
* pas de glow ;
* panneau détail avec raison précise.

---

## 11.4. Panneau détail disponible

```text
Convincing Demeanor (Ranked)

Cost: 10 XP
State: Available
Prerequisite: satisfied
XP after purchase: 5

[Purchase for 10 XP]
```

---

## 11.5. Panneau détail verrouillé

```text
Hidden Storage

Cost: 15 XP
State: Locked

Reason:
Requires a connected purchased talent.

Missing:
- Convincing Demeanor
```

---

## 11.6. Panneau détail acheté

```text
Black Market Contacts (Ranked)

Cost: 5 XP
State: Purchased
Rank contribution: +1

[Refund 5 XP]
```

Si oubli impossible :

```text
Cannot refund this talent.

It is required by:
- Convincing Demeanor
- Hidden Storage
```

---

# 12. Priorisation recommandée

## Priorité 1 — Très forte

À faire avant de considérer l’écran comme réellement utilisable :

1. remplacer “Yes / No” par des boutons actionnels ;
2. ajouter XP avant/après dans les confirmations ;
3. enrichir le panneau détail avec action possible ;
4. afficher des raisons de verrouillage plus précises ;
5. distinguer acheté / disponible / verrouillé par icône + couleur.

---

## Priorité 2 — Forte

À faire pour améliorer fortement l’expérience joueur :

1. highlight des chemins au hover ;
2. styles différenciés des connexions ;
3. légende compacte ;
4. carte sidebar enrichie ;
5. header plus compact avec progression et XP disponible.

---

## Priorité 3 — Moyenne

À faire pour le polish :

1. grille holographique subtile ;
2. coins biseautés ;
3. micro-animations au hover ;
4. description complète du talent dans le panneau ;
5. context menu clic droit.

---

# 13. Critères d’acceptation UX proposés

Tu peux transformer ça directement en critères de ticket.

L’écran est satisfaisant si :

* un joueur comprend immédiatement quels talents sont achetés, disponibles et verrouillés ;
* un clic sur un nœud affiche un détail utile ;
* un nœud disponible propose clairement l’achat ;
* un nœud acheté propose clairement l’annulation ou le remboursement si autorisé ;
* un nœud verrouillé explique pourquoi il l’est ;
* une confirmation d’achat affiche le coût et l’XP avant/après ;
* une confirmation d’oubli affiche le remboursement et l’XP avant/après ;
* les boutons de confirmation utilisent des verbes d’action ;
* les connexions montrent le chemin de progression ;
* l’interface reste lisible sans connaître le code couleur.

---

# 14. Verdict

La direction est bonne. L’achat et l’oubli sont maintenant visibles, ce qui change tout. Mais il faut éviter de
s’arrêter là : l’UI actuelle prouve que la mécanique marche, pas encore que l’expérience est fluide.

La prochaine étape doit être de faire passer l’écran de :

> “je peux cliquer sur des nœuds”

à :

> “je comprends mon build et je prends une décision sans hésiter”.

Le plus gros gain immédiat sera obtenu en travaillant trois éléments : **panneau de détail actionnable, confirmations
plus explicites, états de nœuds plus lisibles**.
