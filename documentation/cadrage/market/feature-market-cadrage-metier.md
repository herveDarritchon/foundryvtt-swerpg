# Feature — Market / Marché

## 1. Intention produit

### Besoin

Le système doit proposer une fenêtre dédiée au marché, ouvrable depuis la feuille de personnage, dans un premier temps
depuis l’onglet Inventory.

Cette fenêtre doit permettre au joueur ou au MJ de consulter les objets achetables disponibles dans le jeu, de les
parcourir, de les filtrer et, à terme, de les acheter pour les ajouter à l’inventaire d’un personnage.

L’objectif n’est pas seulement d’afficher une liste d’items. L’objectif est de créer une expérience de marché crédible,
pratique et immersive, adaptée à Star Wars FFG : crédits, disponibilité, rareté, restrictions locales, marchés légaux ou
illégaux, vendeurs douteux, matériel militaire contrôlé, équipement courant, pièces récupérées, droïdes, armes, armures,
véhicules ou services selon les phases retenues.

## 2. Vision fonctionnelle

Le marché doit devenir l’interface centrale pour gérer l’accès aux biens achetables.

Il doit répondre à quatre besoins principaux :

1. Permettre au joueur de trouver rapidement un item achetable.
2. Permettre au MJ de contrôler ce qui est disponible ou non.
3. Appliquer une logique de prix cohérente avec la rareté, la disponibilité et le contexte.
4. Renforcer l’immersion en donnant l’impression d’un vrai marché galactique plutôt qu’un simple catalogue technique.

## 3. Périmètre initial

### Inclus dans le cadrage

Le marché doit afficher uniquement les items considérés comme achetables.

Il doit permettre une navigation par type d’item.

Il doit permettre un filtre par nom.

Il doit permettre un filtre par prix.

Il doit s’appuyer sur une logique métier séparée du reste de l’interface.

Il doit intégrer progressivement un calcul de prix dépendant de la disponibilité, de la rareté et du contexte.

Il doit être pensé pour une expérience moderne, claire, rapide à utiliser en table et visuellement cohérente avec Star
Wars.

### Hors périmètre initial

Le marché ne doit pas, dans une première version, chercher à simuler toute l’économie galactique.

Il ne doit pas gérer immédiatement des stocks dynamiques par vendeur, sauf si cette notion est explicitement retenue
pour une phase ultérieure.

Il ne doit pas imposer un modèle unique de commerce pour toute la galaxie.

Il ne doit pas mélanger dans une même première livraison l’achat, la vente, le troc, les services, les réparations, les
commandes spéciales et le marché noir.

Il ne doit pas être dépendant uniquement de la feuille de personnage, même s’il est ouvert depuis celle-ci dans la
première phase.

## 4. Principes métier

### 4.1. Le marché n’affiche pas tous les items

Tous les items du système ne sont pas destinés à être achetés.

Certains items sont techniques, narratifs, uniques, liés à un PNJ, liés à une récompense, liés à un pouvoir, liés à un
vaisseau précis, ou simplement non commercialisables.

Le marché doit donc s’appuyer sur une règle d’éligibilité.

Un item est affichable dans le marché uniquement s’il appartient à un type autorisé et s’il dispose des données
minimales nécessaires à l’achat.

### 4.2. Le prix affiché n’est pas toujours le prix de base

Le prix de base d’un item doit être distingué du prix réellement proposé au personnage.

Le prix final peut dépendre :

- du prix de base ;
- de la rareté ;
- de la disponibilité locale ;
- du type de marché ;
- du niveau légal ou illégal de l’objet ;
- du contexte planétaire ou sectoriel ;
- de la qualité du vendeur ;
- d’un éventuel modificateur manuel du MJ.

### 4.3. La disponibilité est une règle métier, pas seulement une donnée d’affichage

La disponibilité doit devenir une notion exploitable.

Elle peut déterminer :

- si l’item est visible ;
- si l’item est achetable immédiatement ;
- si l’item nécessite une recherche ;
- si l’item est uniquement disponible au marché noir ;
- si l’item est affiché mais marqué comme indisponible ;
- si son prix augmente ou diminue.

### 4.4. Le MJ doit garder le contrôle

Le système doit aider à automatiser, pas décider à la place du MJ.

Le MJ doit pouvoir autoriser, masquer, restreindre, surclasser ou modifier les disponibilités et les prix.

Dans Star Wars FFG, le commerce est fortement lié au contexte : un blaster n’a pas le même statut dans un astroport
impérial, une enclave rebelle, une cantina de Tatooine ou un marché noir hutt.

## 5. Types d’items achetables

### Phase initiale recommandée

Pour éviter une première version trop large, le marché devrait commencer par les catégories les plus évidentes :

- armes ;
- armures ;
- équipement général ;
- consommables ;
- outils ;
- cybernétiques, si le modèle existe déjà ;
- droïdes, si le modèle existe déjà ;
- attachments/mods, si le modèle est suffisamment stable.

### À traiter plus tard

Les véhicules, vaisseaux, services, réparations, modifications, licences, faux papiers, informations, soins médicaux,
cargaisons et marchandises devraient être traités dans des phases ultérieures.

La raison est simple : ces éléments ne relèvent pas toujours d’un achat d’item classique. Ils impliquent souvent un
contexte narratif, une disponibilité rare, une négociation, ou une intégration technique plus lourde.

## 6. Expérience utilisateur attendue

### Ouverture

Depuis la feuille de personnage, dans l’onglet Inventory, une action permet d’ouvrir la fenêtre Market.

Cette fenêtre est indépendante de la feuille, mais conserve le personnage courant comme acheteur potentiel.

### Vue principale

La fenêtre affiche une liste d’items achetables.

Chaque item devrait présenter au minimum :

- nom ;
- type ;
- prix affiché ;
- prix de base si différent ;
- rareté ou disponibilité ;
- indication d’achat possible ou non ;
- source ou provenance si disponible ;
- icône ou visuel si disponible ;
- statut légal ou restreint si cette donnée existe.

### Navigation

L’utilisateur doit pouvoir :

- filtrer par type ;
- rechercher par nom ;
- filtrer par prix minimum et maximum ;
- trier par nom ;
- trier par prix ;
- trier par rareté ou disponibilité ;
- ouvrir la fiche de l’item ;
- sélectionner un item pour achat futur.

### Ambiance visuelle

L’interface doit évoquer un terminal de marché galactique : lisible, dense, mais pas austère.

Direction recommandée :

- interface de datapad ou terminal marchand ;
- typographie claire ;
- hiérarchie visuelle forte ;
- badges de disponibilité ;
- prix bien visibles ;
- statut d’achat lisible ;
- micro-copy immersive mais sobre.

Exemples de libellés possibles :

- Disponible
- Rare
- Sur commande
- Restreint
- Marché noir
- Indisponible ici
- Prix local estimé
- Signalement impérial possible
- Vendeur peu fiable

## 7. Règles métier à définir

### 7.1. Éligibilité d’un item au marché

Un item peut apparaître dans le marché si :

- son type appartient à la liste des types achetables ;
- il dispose d’un nom ;
- il dispose d’un prix ou d’une règle de prix ;
- il n’est pas explicitement marqué comme non achetable ;
- il provient d’une source autorisée.

Point à arbitrer : faut-il afficher les items sans prix avec un statut “prix inconnu”, ou les exclure totalement ?

Recommandation : les exclure en V1 pour éviter un marché incohérent.

### 7.2. Sources des items

Le marché doit pouvoir agréger les items depuis plusieurs sources.

Sources possibles :

- items du monde ;
- compendiums créés par import ;
- compendiums utilisateurs ;
- référentiels système autorisés ;
- packs explicitement activés comme sources commerciales.

Point à arbitrer : faut-il que le marché scanne toutes les sources disponibles ou seulement des sources configurées ?

Recommandation : utiliser des sources configurées. Scanner tout automatiquement risque d’afficher des éléments non
prévus, des doublons ou des items narratifs.

### 7.3. Prix de base

Le prix de base est la valeur économique de référence de l’item.

Il ne doit pas être modifié directement par le marché.

Le marché calcule un prix affiché à partir du prix de base.

### 7.4. Prix final

Le prix final peut être calculé à partir de plusieurs modificateurs :

- modificateur de disponibilité ;
- modificateur de rareté ;
- modificateur local ;
- modificateur légal ou marché noir ;
- modificateur manuel du MJ ;
- éventuel résultat de négociation dans une phase ultérieure.

Le calcul doit être explicable.

L’utilisateur doit pouvoir comprendre pourquoi un item coûte plus cher que son prix de base.

Exemple métier :

Prix de base : 500 crédits
Contexte : monde isolé
Disponibilité : rare
Modificateur local : +20 %
Prix affiché : 600 crédits

### 7.5. Disponibilité

La disponibilité peut être représentée par des états simples.

Proposition initiale :

- Disponible : achat immédiat possible.
- Commun : facile à trouver.
- Rare : prix augmenté ou achat soumis à vérification.
- Très rare : visible mais pas forcément achetable immédiatement.
- Restreint : achat dépendant du contexte légal ou du MJ.
- Marché noir : visible uniquement si le marché courant le permet.
- Indisponible : non achetable dans ce contexte.

Point important : la rareté et la disponibilité ne sont pas exactement la même chose.

La rareté décrit la difficulté générale à trouver l’objet.

La disponibilité décrit le fait qu’il soit accessible ici, maintenant, dans ce marché précis.

### 7.6. Achat

L’achat ne doit pas être inclus dans la toute première étape si l’objectif est d’abord de cadrer, afficher et filtrer
proprement.

Quand l’achat sera implémenté, il devra :

- vérifier le personnage acheteur ;
- vérifier les crédits disponibles ;
- retirer les crédits ;
- ajouter l’item à l’inventaire ;
- conserver les données utiles de l’item acheté ;
- afficher une confirmation claire ;
- permettre une annulation uniquement si le système le prévoit explicitement.

Point à arbitrer : l’achat doit-il créer une copie de l’item ou une référence à l’item source ?

Recommandation métier : l’inventaire du personnage doit recevoir une instance propre de l’item acheté. Le marché est une
source d’achat, pas un lien permanent vers l’objet catalogue.

## 8. Découpage projet recommandé

### Phase 0 — Cadrage et modèle métier

Objectif : définir précisément les concepts métier avant l’interface.

Livrables :

- définition de “market” ;
- définition d’un “market item” ;
- définition d’un “purchasable item” ;
- définition des types autorisés ;
- définition des sources commerciales ;
- définition des statuts de disponibilité ;
- définition du prix de base et du prix final ;
- règles d’exclusion des items non achetables.

Cette phase doit produire les issues de conception et les premiers tests métier.

### Phase 1 — Catalogue consultable

Objectif : afficher une fenêtre Market depuis la feuille de personnage.

Fonctions :

- bouton d’ouverture depuis Inventory ;
- fenêtre indépendante ;
- chargement des items achetables ;
- affichage d’une liste simple ;
- regroupement ou filtre par type ;
- affichage du nom, type, prix et rareté si disponibles.

Pas d’achat dans cette phase.

Valeur : le joueur peut consulter le catalogue.

### Phase 2 — Recherche et filtres

Objectif : rendre le marché réellement utilisable en table.

Fonctions :

- recherche par nom ;
- filtre par type ;
- filtre par prix minimum ;
- filtre par prix maximum ;
- tri par nom ;
- tri par prix ;
- tri par rareté ou disponibilité ;
- état vide clair si aucun résultat.

Valeur : le joueur trouve rapidement ce qu’il cherche.

### Phase 3 — Éligibilité et sources configurables

Objectif : éviter que le marché affiche n’importe quoi.

Fonctions :

- liste des types achetables configurée ;
- sources de données configurables ;
- exclusion des items non achetables ;
- gestion minimale des doublons ;
- statut “non affichable” pour les items incomplets si nécessaire.

Valeur : le MJ garde le contrôle du contenu commercial.

### Phase 4 — Calcul métier du prix

Objectif : introduire la logique économique.

Fonctions :

- prix de base ;
- prix final ;
- modificateur de rareté ;
- modificateur de disponibilité ;
- modificateur de contexte ;
- explication du calcul ;
- affichage du prix final dans l’interface.

Valeur : le marché commence à refléter le monde de jeu.

### Phase 5 — Achat simple

Objectif : permettre l’achat réel depuis le marché.

Fonctions :

- sélection d’un item ;
- confirmation d’achat ;
- vérification des crédits ;
- retrait des crédits ;
- ajout à l’inventaire ;
- message de succès ou d’échec.

Valeur : le marché devient une fonctionnalité complète de gameplay.

### Phase 6 — Marchés contextualisés

Objectif : transformer le catalogue global en marchés locaux.

Fonctions possibles :

- marché standard ;
- marché noir ;
- boutique spécialisée ;
- vendeur d’armes ;
- surplus impérial ;
- casse de droïdes ;
- comptoir hutt ;
- monde pauvre ;
- monde industriel ;
- monde impérial contrôlé ;
- enclave rebelle.

Chaque marché pourrait avoir :

- types d’items autorisés ;
- modificateurs de prix ;
- restrictions ;
- disponibilité locale ;
- ambiance visuelle ou libellés spécifiques.

Valeur : forte immersion Star Wars.

### Phase 7 — Négociation, rareté avancée et conséquences narratives

Objectif : connecter le marché aux mécaniques narratives.

Fonctions possibles :

- tentative de négociation ;
- résultat influençant le prix ;
- menace narrative en cas d’achat illégal ;
- signalement impérial ;
- dette ou obligation ;
- vendeur qui refuse ;
- commande spéciale ;
- délai d’approvisionnement ;
- complication sur Désavantage ou Désastre.

Valeur : le marché devient un moteur de jeu, pas seulement une boutique.

## 9. Risques produit

### Risque 1 — Faire une boutique trop générique

Un simple tableau d’items ne sera pas suffisant.

Le système doit rester pratique, mais il doit aussi sentir Star Wars : marché noir, pénurie, contrôle impérial, vendeurs
douteux, récupération, rareté locale.

### Risque 2 — Trop automatiser trop tôt

Le calcul de prix, la disponibilité, l’achat, la négociation et les conséquences narratives peuvent vite devenir
complexes.

Il faut livrer par étapes.

### Risque 3 — Afficher trop d’items

Si le marché affiche tout, il deviendra inutilisable.

La clé est l’éligibilité : seuls les items réellement achetables doivent apparaître.

### Risque 4 — Mélanger catalogue global et marché local

Un catalogue global répond au besoin de recherche.

Un marché local répond au besoin d’immersion.

Ce sont deux niveaux différents.

Recommandation : commencer par un catalogue global achetable, puis introduire les marchés contextualisés.

### Risque 5 — Coupler trop fortement la feature à la feuille personnage

Le marché peut être ouvert depuis la feuille, mais il ne doit pas être conçu comme une simple sous-fenêtre de
l’inventaire.

À terme, il pourrait aussi être ouvert par le MJ, depuis un lieu, depuis une scène, depuis un vendeur, ou depuis une
macro.

## 10. Arbitrages à prendre avant les issues

1. Quels types d’items sont achetables en V1 ?
2. Les véhicules et vaisseaux sont-ils exclus de la V1 ?
3. Le marché affiche-t-il les items sans prix ?
4. Les sources sont-elles configurées ou scannées automatiquement ?
5. Le prix final est-il calculé dès la V1 ou seulement affiché comme prix de base ?
6. L’achat est-il inclus dans la première livraison ou dans une phase séparée ?
7. Faut-il distinguer catalogue global et marché local dès maintenant ?
8. Le MJ peut-il masquer certains items manuellement ?
9. Le système doit-il afficher les items restreints ou les cacher par défaut ?
10. Le marché noir est-il une variation de marché ou une règle d’affichage ?

## 11. Recommandation de découpage en issues

### Epic — Market / Marché

Créer une fonctionnalité de marché permettant de consulter, filtrer, valoriser et acheter des items achetables dans le
système Star Wars FFG.

### Issue 1 — Définir le modèle métier du Market

But : stabiliser les notions de marché, item achetable, éligibilité, prix de base, prix final, disponibilité et source
commerciale.

### Issue 2 — Ouvrir la fenêtre Market depuis l’inventaire

But : ajouter un point d’entrée depuis l’onglet Inventory de la feuille de personnage.

### Issue 3 — Afficher le catalogue des items achetables

But : construire une première liste lisible des items autorisés.

### Issue 4 — Filtrer et trier les items

But : permettre la recherche par nom, type et prix.

### Issue 5 — Configurer les types d’items affichables

But : éviter d’afficher des items non achetables.

### Issue 6 — Configurer les sources commerciales

But : contrôler les mondes, compendiums ou packs utilisés par le marché.

### Issue 7 — Calculer le prix final selon la disponibilité

But : créer le moteur métier de prix.

### Issue 8 — Afficher l’explication du prix

But : rendre le calcul compréhensible pour le joueur et le MJ.

### Issue 9 — Acheter un item depuis le marché

But : retirer les crédits et ajouter l’item à l’inventaire.

### Issue 10 — Préparer les marchés contextualisés

But : introduire les marchés locaux, vendeurs spécialisés et variations d’ambiance.

## 12. Positionnement recommandé

La bonne trajectoire est progressive.

La première version doit être un catalogue achetable propre, rapide, filtrable et fiable.

La deuxième version doit intégrer un vrai moteur métier de prix et de disponibilité.

La troisième version doit rendre le marché vivant : marchés locaux, vendeurs, rareté contextuelle, marché noir,
conséquences narratives.

Le cœur de la feature ne doit pas être “acheter un objet”.

Le cœur de la feature doit être : “accéder à l’économie galactique depuis le personnage, avec des règles cohérentes,
contrôlables et immersives”.
