# Document de cadrage — Évolution UX/UI de la vue Arbres de spécialisation

## 1. Objet du document

Ce document vise à cadrer la réflexion produit, UX et technique autour de l’évolution de la vue graphique des arbres de
spécialisation du système SWERPG pour Foundry VTT.

L’écran actuel permet déjà d’afficher une spécialisation sous forme d’arbre, avec ses nœuds de talents, ses coûts en XP,
ses liens de prérequis, une navigation latérale et des contrôles de zoom. La base fonctionnelle est donc présente.
L’enjeu du prochain cycle n’est pas de repartir de zéro, mais de transformer cette vue en un écran réellement
exploitable par les joueurs et le MJ : lisible, explicite, immersif, cohérent avec Foundry VTT et aligné avec l’univers
Star Wars Edge of the Empire.

Le document formule des constats, des objectifs d’évolution, des principes de design, des recommandations priorisées et
des critères d’acceptation destinés au PO et à l’équipe de développement.

## 2. Périmètre

Le périmètre concerne la vue dédiée aux arbres de spécialisation possédés par un acteur personnage, affichée dans une
fenêtre Foundry VTT distincte.

Sont inclus dans ce cadrage :

* la structure générale de l’écran ;
* la hiérarchie visuelle ;
* la lisibilité du canevas ;
* le rendu des nœuds ;
* le rendu des liens ;
* les états visuels des talents ;
* les interactions de consultation ;
* les contrôles de zoom, pan et recentrage ;
* la navigation entre arbres ;
* l’ambiance graphique Star Wars / Foundry ;
* les exigences UX minimales pour que l’écran aide réellement à comprendre et décider.

Sont exclus à ce stade :

* la refonte complète du modèle de données des talents ;
* les règles métier d’achat de talents, sauf lorsqu’elles doivent être exposées visuellement ;
* la refonte globale de la fiche personnage ;
* l’intégration d’animations avancées non nécessaires à la compréhension ;
* la création d’un thème graphique complet pour tout le système.

## 3. Diagnostic synthétique de l’écran actuel

L’écran actuel constitue une bonne fondation. Il propose une structure claire avec une sidebar de sélection, une grande
zone graphique centrale, des nœuds positionnés et des liens visibles. L’intention de créer une interface immersive est
déjà perceptible grâce à une palette sombre, une typographie science-fiction et un traitement visuel proche d’un
terminal ou d’un datapad.

Cependant, l’écran donne encore une impression de prototype avancé plutôt que de composant produit finalisé. Le graphe
n’est pas encore suffisamment dominant, les états de nœuds ne sont pas assez explicites, les informations décisionnelles
restent insuffisantes et l’espace disponible n’est pas pleinement exploité.

Le problème principal n’est donc pas architectural. La structure générale est bonne. Le problème est UX : l’utilisateur
voit l’arbre, mais ne comprend pas encore immédiatement ce qu’il peut faire, pourquoi certains talents sont accessibles,
pourquoi d’autres sont verrouillés, ni quel est son meilleur prochain choix.

## 4. Problématique produit

La vue arbre doit répondre à une question simple côté joueur :

« Où en est mon personnage dans cette spécialisation, et quelles sont mes prochaines options d’évolution ? »

Aujourd’hui, l’écran répond partiellement à la première moitié de cette question : il affiche l’arbre et certains états.
Il répond moins bien à la seconde : il ne rend pas encore les prochaines décisions suffisamment évidentes.

Le risque produit est que cette vue soit perçue comme une visualisation agréable mais non indispensable. Pour qu’elle
devienne une vraie valeur ajoutée du système, elle doit devenir un outil de décision : comprendre, comparer, anticiper,
acheter ou préparer l’achat.

## 5. Objectifs d’évolution

### 5.1. Objectif principal

Faire évoluer la vue des arbres de spécialisation d’une visualisation technique vers un outil joueur clair, immersif et
actionnable.

### 5.2. Objectifs secondaires

L’écran doit permettre de comprendre immédiatement l’état de progression du personnage dans une spécialisation. Il doit
clarifier les talents achetés, disponibles, verrouillés ou invalides. Il doit rendre visibles les chemins de progression
et les prérequis. Il doit exploiter correctement l’espace disponible. Il doit rester cohérent avec Foundry VTT et avec
l’ambiance Star Wars Edge of the Empire.

### 5.3. Objectifs non poursuivis à court terme

Le prochain incrément ne doit pas chercher à multiplier les fonctionnalités secondaires. L’enjeu prioritaire n’est pas
d’ajouter beaucoup de boutons, d’effets ou d’animations, mais de rendre l’écran plus lisible, plus explicite et plus
confortable.

## 6. Principes de design recommandés

### 6.1. Le graphe est le héros de l’écran

La zone centrale doit être dominée par l’arbre, pas par le titre ni par l’espace vide. À l’ouverture, le graphe doit
être automatiquement cadré, centré et zoomé pour occuper une portion significative du viewport.

Le joueur ne doit pas avoir à zoomer ou déplacer manuellement l’arbre pour commencer à l’utiliser.

### 6.2. Les états doivent être compris sans apprentissage préalable

Les couleurs sont utiles mais insuffisantes. Un utilisateur doit pouvoir distinguer un talent acheté, disponible,
verrouillé ou invalide sans connaître la convention visuelle interne.

Cela implique une combinaison de couleur, contraste, opacité, bordure, icône éventuelle, tooltip et légende.

### 6.3. Chaque nœud doit expliquer sa situation

Un nœud ne doit pas seulement afficher un nom et un coût. Au survol ou au clic, il doit expliquer ce qu’il représente :
talent, coût, statut, prérequis, raison d’indisponibilité, rang éventuel, action possible.

La règle est simple : si le joueur se demande « pourquoi ? », l’interface doit pouvoir répondre.

### 6.4. L’immersion doit servir la lisibilité

L’écran doit évoquer Star Wars, mais ne doit pas sacrifier la clarté. L’esthétique recommandée est celle d’un datapad ou
d’une holo-interface de Bordure Extérieure : sombre, technique, légèrement usée, lisible, avec des accents lumineux
contrôlés.

Il faut éviter une direction trop néon, trop cyberpunk ou trop MMO. L’univers Edge of the Empire appelle une interface
fonctionnelle, un peu bricolée, mais crédible.

### 6.5. Foundry d’abord

L’écran doit rester cohérent avec les usages Foundry VTT : fenêtre redimensionnable, tooltips localisés, contrôles
explicites, accessibilité clavier raisonnable, comportement stable au resize, absence d’effets envahissants,
compatibilité avec les thèmes sombres.

## 7. Recommandations fonctionnelles et UX

### 7.1. Recentrage et zoom automatique du graphe

À l’ouverture de la vue, l’arbre sélectionné doit être automatiquement ajusté à la zone disponible. Il doit être centré
et dimensionné de façon à occuper la majorité utile du canevas, sans être collé aux bords.

Le comportement attendu est un « fit to tree » automatique au chargement, puis manuel via un bouton de recentrage.

Critères d’acceptation proposés :

* à l’ouverture, l’arbre sélectionné est visible intégralement ;
* l’arbre occupe visuellement environ 60 à 75 % de l’espace utile du canevas ;
* aucun nœud n’est tronqué ;
* un bouton permet de revenir à ce cadrage initial ;
* le comportement reste stable après redimensionnement de la fenêtre.

### 7.2. Réduction du poids visuel du header

Le titre interne occupe actuellement une place trop importante par rapport au contenu utile. Il convient de le
compacter.

Le titre de la fenêtre Foundry peut porter l’information principale. Dans le contenu, un bandeau plus discret peut
suffire, par exemple avec le nom de la spécialisation, le statut de l’arbre et une synthèse de progression.

Critères d’acceptation proposés :

* le canevas devient l’élément dominant de l’écran ;
* le titre reste identifiable sans écraser la vue ;
* la hauteur disponible pour le graphe augmente ;
* les informations redondantes sont supprimées ou fusionnées.

### 7.3. Amélioration des états de nœuds

Les nœuds doivent porter des états visuels robustes. Les états minimaux à couvrir sont : acheté, disponible, verrouillé,
invalide ou incomplet.

Orientation visuelle recommandée :

* acheté : vert validé, halo discret, lien actif ;
* disponible : bleu/cyan lumineux, bordure nette, invitation visuelle ;
* verrouillé : gris sombre mais lisible, opacité réduite sans disparition ;
* invalide/incomplet : ambre ou rouge discret, icône d’alerte, tooltip explicatif.

Critères d’acceptation proposés :

* chaque état est différenciable sans dépendre uniquement de la couleur ;
* les textes restent lisibles dans tous les états ;
* les états sont cohérents entre nœuds et connexions ;
* les états invalides ou incomplets ne ressemblent pas à des états verrouillés ordinaires.

### 7.4. Ajout d’une légende compacte

Une légende doit permettre au joueur de comprendre rapidement le code visuel. Elle peut être positionnée dans le
canevas, en bas ou en haut, de manière discrète.

Elle doit rester compacte et ne pas concurrencer l’arbre.

Critères d’acceptation proposés :

* la légende affiche les états principaux ;
* elle utilise les mêmes styles que les nœuds ;
* elle ne masque pas l’arbre ;
* elle reste lisible après redimensionnement.

### 7.5. Tooltips ou panneau de détail des talents

Au survol ou au clic d’un nœud, l’utilisateur doit accéder aux détails utiles. Il faut privilégier une solution simple
dans un premier temps.

Deux options sont possibles :

Option A : tooltip enrichi au survol. Cette option est légère, rapide et cohérente avec Foundry. Elle convient pour
afficher le statut, le coût, les prérequis et une raison de verrouillage courte.

Option B : panneau de détail latéral ou flottant au clic. Cette option est plus robuste si l’on veut afficher la
description complète du talent, le rang, les sources, les effets et une action d’achat.

Recommandation : démarrer par un tooltip enrichi, puis prévoir un panneau de détail si l’achat depuis la vue devient un
objectif prioritaire.

Critères d’acceptation proposés :

* un nœud disponible indique qu’il peut être acheté ;
* un nœud verrouillé indique pourquoi il est verrouillé ;
* un nœud acheté indique son statut et son rang éventuel ;
* un nœud invalide indique la nature du problème ;
* les textes sont localisés.

### 7.6. Mise en valeur des chemins de progression

Les connexions ne doivent pas être de simples traits structurels. Elles doivent aider le joueur à lire sa progression.

Les liens devraient exprimer au minimum :

* chemin déjà parcouru ;
* chemin menant aux talents disponibles ;
* chemin verrouillé ;
* relation mise en évidence au survol d’un nœud.

Critères d’acceptation proposés :

* les liens des talents achetés sont plus visibles ;
* les liens vers des talents disponibles sont identifiables ;
* les liens verrouillés restent présents mais secondaires ;
* au survol d’un nœud, ses prérequis et débouchés sont mis en évidence.

### 7.7. Enrichissement de la carte de spécialisation dans la sidebar

La sidebar ne doit pas simplement répéter le nom de la spécialisation. Elle doit donner une information synthétique
utile.

Informations candidates :

* nom de la spécialisation ;
* carrière associée ;
* statut de résolution de l’arbre ;
* nombre de talents achetés ;
* nombre de talents disponibles ;
* XP dépensée dans l’arbre ;
* alerte si l’arbre est incomplet ou non résolu.

Critères d’acceptation proposés :

* aucune information n’est répétée inutilement ;
* la carte sélectionnée est clairement distinguée ;
* le statut métier de l’arbre est distinct de l’état UI sélectionné ;
* la sidebar reste lisible avec plusieurs spécialisations.

### 7.8. Clarification des contrôles de zoom

Les contrôles existants doivent être conservés mais clarifiés.

Chaque bouton doit disposer d’un tooltip localisé. L’icône de recentrage doit être explicite. Le comportement attendu
doit être stable et prévisible.

Critères d’acceptation proposés :

* bouton zoom arrière avec tooltip ;
* bouton recentrer/ajuster avec tooltip ;
* bouton zoom avant avec tooltip ;
* raccourcis souris conservés ;
* reset de vue fiable.

## 8. Recommandations graphiques

### 8.1. Direction artistique

La direction recommandée est : « datapad de Bordure Extérieure / holochart de progression ».

L’écran doit donner l’impression d’un outil utilisé par des contrebandiers, mercenaires, pilotes et agents rebelles, pas
d’une interface impériale clinique ni d’un arbre de talents de jeu vidéo générique.

Les choix visuels doivent privilégier :

* fonds sombres bleutés ;
* bordures cyan ou vertes maîtrisées ;
* textures très discrètes ;
* coins légèrement biseautés ;
* glow limité aux états importants ;
* typographie immersive pour les titres, lisible pour les informations fonctionnelles.

### 8.2. Typographie

La police science-fiction peut être conservée pour les titres et labels courts. Les noms de talents et les informations
fonctionnelles doivent rester très lisibles.

Recommandations :

* augmenter légèrement le contraste des noms de talents ;
* éviter les textes trop fins sur fond sombre ;
* limiter l’italique aux textes d’ambiance ;
* vérifier les noms longs ;
* prévoir les traductions françaises qui peuvent être plus longues que les libellés anglais.

### 8.3. Couleurs

La couleur doit servir l’état fonctionnel. Elle ne doit pas être seulement décorative.

Palette fonctionnelle recommandée :

* acheté : vert contrôlé ;
* disponible : cyan/bleu clair ;
* verrouillé : gris froid ;
* invalide/incomplet : ambre ou rouge doux ;
* sélection/survol : halo clair temporaire.

Il faudra vérifier le contraste des textes et ne pas rendre les nœuds verrouillés illisibles.

## 9. Accessibilité et robustesse

Même si Foundry VTT est souvent utilisé dans des environnements très visuels, la vue doit éviter les pièges classiques :
état uniquement porté par la couleur, textes trop petits, contrastes trop faibles, tooltips absents, boutons sans
libellés accessibles.

Exigences minimales :

* les états ne reposent pas uniquement sur la couleur ;
* les textes principaux restent lisibles ;
* les boutons disposent de labels accessibles ;
* les tooltips sont localisés ;
* la vue reste exploitable après redimensionnement ;
* les noms longs ne cassent pas la mise en page ;
* les états d’erreur sont compréhensibles.

## 10. Impacts techniques pressentis

### 10.1. Côté rendu PIXI

Les évolutions de cadrage automatique, de styles de nœuds, de styles de liens et de highlight au survol relèvent
principalement du rendu PIXI et de la logique de viewport.

Points techniques à prévoir :

* calcul de bounding box de l’arbre ;
* fonction fit-to-tree ;
* recalcul au resize ;
* mapping stable entre état métier et style visuel ;
* gestion du hover sur nœud ;
* mise en évidence temporaire des connexions associées.

### 10.2. Côté données de vue

La vue doit disposer des informations nécessaires pour expliquer les états : acheté, disponible, verrouillé, invalide,
raison de verrouillage, prérequis manquants, coût, rang éventuel.

Si ces informations existent déjà dans le view model, il faut les exposer de façon claire. Si elles n’existent pas
encore, le besoin doit être cadré comme une évolution du view model plutôt que comme une logique UI dispersée.

### 10.3. Côté i18n

Tous les statuts, tooltips, raisons de verrouillage, labels de boutons et textes de légende doivent passer par les
fichiers de langue.

La vue ne doit pas afficher de clés i18n brutes.

### 10.4. Côté tests

Les tests doivent couvrir les invariants UX critiques, notamment :

* calcul de cadrage initial ;
* styles associés aux états ;
* présence des tooltips ou labels ;
* non-régression des interactions zoom/pan ;
* stabilité avec arbres incomplets ou non résolus ;
* comportement avec plusieurs spécialisations ;
* comportement avec noms longs.

## 11. Proposition de découpage en incréments

### Incrément 1 — Lisibilité et cadrage

Objectif : rendre l’arbre immédiatement lisible à l’ouverture.

Contenu :

* fit-to-tree initial ;
* bouton recentrer/ajuster ;
* réduction du header ;
* amélioration du contraste de base ;
* tooltips des contrôles de zoom.

Valeur : forte. C’est l’incrément qui améliorera le plus immédiatement la perception de l’écran.

### Incrément 2 — États visuels et légende

Objectif : rendre les statuts compréhensibles.

Contenu :

* styles différenciés des nœuds ;
* styles différenciés des liens ;
* légende compacte ;
* état invalide/incomplet explicite ;
* vérification des contrastes.

Valeur : forte. C’est l’incrément qui transforme la vue en outil compréhensible.

### Incrément 3 — Information contextuelle des nœuds

Objectif : expliquer les décisions au joueur.

Contenu :

* tooltip enrichi ou panneau simple ;
* raison de verrouillage ;
* prérequis manquants ;
* statut d’achat ;
* rang éventuel ;
* coût XP.

Valeur : forte. C’est l’incrément qui transforme la visualisation en outil d’aide à la décision.

### Incrément 4 — Sidebar et progression globale

Objectif : améliorer la navigation entre spécialisations et la synthèse.

Contenu :

* carte de spécialisation enrichie ;
* progression ;
* XP dépensée ou nombre de talents achetés ;
* gestion propre des statuts available/incomplete/unresolved ;
* comportement avec plusieurs arbres.

Valeur : moyenne à forte selon la fréquence des personnages multi-spécialisés.

### Incrément 5 — Polish immersif

Objectif : renforcer l’identité Star Wars sans nuire à l’usage.

Contenu :

* grille holographique subtile ;
* micro-effets de survol ;
* coins biseautés ;
* glow contrôlé ;
* éventuelles animations légères.

Valeur : moyenne. À faire après les bases UX, pas avant.

## 12. Critères de succès produit

L’évolution sera réussie si un joueur peut ouvrir la vue et comprendre immédiatement :

* quelle spécialisation il consulte ;
* quels talents sont déjà achetés ;
* quels talents sont actuellement disponibles ;
* quels talents sont verrouillés ;
* pourquoi un talent est verrouillé ;
* quels chemins de progression s’offrent à lui ;
* comment revenir à une vue centrée après navigation.

L’écran sera considéré comme mature lorsqu’il ne sera plus seulement une représentation graphique de l’arbre, mais un
support clair de décision de progression.

## 13. Risques et points d’attention

### 13.1. Trop d’immersion au détriment de la lisibilité

Le risque est d’ajouter trop d’effets graphiques. Il faut éviter que le glow, les textures ou les animations masquent
l’information.

### 13.2. Trop de logique métier dans l’UI

La vue ne doit pas recalculer elle-même les règles d’achat. Elle doit consommer un état préparé par le domaine ou le
view model.

### 13.3. Confusion entre statut d’arbre et statut de nœud

Le mot « available » peut désigner un arbre résolu ou un talent achetable. Il faut distinguer clairement les libellés et
les styles pour éviter toute ambiguïté.

### 13.4. Noms longs et traduction française

Les libellés français sont souvent plus longs. Le design doit être testé avec des noms de talents longs et des statuts
traduits.

### 13.5. Cas d’erreur et données incomplètes

Les arbres incomplets, talents non résolus ou références invalides doivent avoir un rendu clair. Ils ne doivent pas être
silencieusement assimilés à des talents verrouillés.

## 14. Décisions à arbitrer par le PO

Plusieurs arbitrages produit doivent être clarifiés avant implémentation complète.

Premier arbitrage : la vue doit-elle seulement consulter les arbres ou permettre l’achat direct des talents ?

Deuxième arbitrage : l’information détaillée doit-elle apparaître en tooltip, dans un panneau latéral ou dans une modale
Foundry ?

Troisième arbitrage : la sidebar doit-elle afficher uniquement les spécialisations possédées ou aussi les arbres
incomplets/non résolus pour diagnostic MJ ?

Quatrième arbitrage : faut-il afficher l’XP disponible du personnage dans cette vue ?

Cinquième arbitrage : quel niveau de polish immersif est attendu pour la première version acceptable ?

## 15. Recommandation finale

La priorité doit être donnée à la clarté d’usage plutôt qu’au polish visuel. Le bon ordre est : cadrage automatique,
états explicites, explication des nœuds, puis seulement enrichissement graphique.

La vue actuelle est une base saine. Elle ne doit pas être refondue intégralement. Elle doit être consolidée par petits
incréments orientés utilisateur.

La cible à atteindre est une interface qui ressemble à un datapad de progression Star Wars : lisible, sombre, technique,
immersive, mais d’abord utile. Le joueur doit comprendre en quelques secondes où il en est et ce qu’il peut faire
ensuite.
