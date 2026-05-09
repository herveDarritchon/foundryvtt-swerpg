# Spécification fonctionnelle — Console de transaction XP des compétences

## 1. Finalité de la fonctionnalité

La console de transaction XP permet au joueur de gérer l’évolution des compétences de son personnage directement depuis l’onglet **Skills** de la feuille de personnage.

Elle doit rendre lisible, fiable et réversible la progression des compétences, en permettant :

* de consulter les XP disponibles ;
* de visualiser les XP déjà dépensés ;
* de voir les rangs gratuits restants ;
* de prévisualiser le coût d’un achat de rang ;
* d’acheter un nouveau rang de compétence ;
* de revenir sur un achat lorsque cela est autorisé ;
* de comprendre pourquoi une action est possible ou impossible.

La fonctionnalité ne doit pas seulement modifier un rang. Elle doit sécuriser une **transaction de progression**.

---

# 2. Problème utilisateur à résoudre

Aujourd’hui, l’interface affiche une console XP statique. Elle donne l’impression qu’une mécanique d’achat de compétences existe, mais aucune interaction réelle n’est possible.

Le joueur ne peut pas :

* savoir combien coûtera le prochain rang ;
* distinguer une compétence éligible à un rang gratuit d’une compétence payante ;
* acheter un rang depuis l’interface ;
* corriger une erreur d’achat ;
* voir immédiatement l’impact sur ses XP et son pool de dés.

Cela crée une rupture entre l’intention de l’interface et son comportement réel.

---

# 3. Périmètre fonctionnel

## Inclus dans cette fonctionnalité

La console doit couvrir :

1. l’affichage synthétique des ressources de progression ;
2. la prévisualisation d’achat au survol d’une compétence ;
3. l’achat d’un rang de compétence ;
4. le retrait d’un rang précédemment acheté via la console ;
5. la gestion des rangs gratuits de carrière et de spécialisation ;
6. la mise à jour visuelle immédiate après transaction ;
7. l’affichage des raisons de refus ;
8. la compatibilité bilingue français / anglais.

## Hors périmètre

Cette fonctionnalité ne couvre pas :

* l’achat de talents ;
* l’achat de spécialisations ;
* l’achat de caractéristiques ;
* la gestion complète de la création de personnage ;
* la modification manuelle avancée par le MJ ;
* la reconstruction automatique d’un historique XP depuis un personnage importé ;
* la correction rétroactive de personnages déjà modifiés manuellement.

---

# 4. Utilisateurs concernés

## Joueur

Le joueur peut utiliser la console pour gérer les compétences de son propre personnage, dans les limites des règles autorisées.

Il peut :

* consulter l’état XP ;
* prévisualiser un achat ;
* acheter un rang ;
* annuler un achat traçable effectué via la console.

## Maître de jeu

Le MJ peut utiliser les mêmes actions que le joueur.

Il peut également avoir besoin, dans un second temps, d’outils de correction manuelle. Ces outils doivent rester distincts de la console de transaction XP afin de ne pas confondre une transaction normale avec une correction administrative.

---

# 5. Données affichées dans la console

La console doit afficher en permanence :

## XP disponibles

Nombre d’XP que le personnage peut encore dépenser.

## XP dépensés

Nombre total d’XP déjà dépensés dans la progression suivie par le système.

## Rangs gratuits de carrière restants

Nombre de rangs gratuits encore disponibles pour les compétences de carrière.

## Rangs gratuits de spécialisation restants

Nombre de rangs gratuits encore disponibles pour les compétences de spécialisation.

## Coût de la sélection en cours

Coût du prochain achat prévisualisé et la valeur d'xp rendu en cas d'annulation de l'achat en cours si c'est possible.

Lorsque rien n’est sélectionné, ce champ doit afficher un état neutre.

---

# 6. États fonctionnels de la console

La console peut être dans plusieurs états.

## État neutre

Aucune compétence n’est sélectionnée.

Message attendu :

> Sélectionnez une compétence pour prévisualiser le coût.

## Achat gratuit disponible

La compétence sélectionnée peut recevoir un rang gratuit.

La console doit indiquer :

* la compétence concernée ;
* le rang actuel ;
* le rang obtenu après achat ;
* que le coût est de 0 XP ;
* le type de rang gratuit utilisé : carrière ou spécialisation.

## Achat payant possible

La compétence sélectionnée peut être augmentée avec les XP disponibles.

La console doit indiquer :

* la compétence concernée ;
* le rang actuel ;
* le rang après achat ;
* le coût XP ;
* les XP restants après achat ;
* le pool de dés actuel ;
* le pool de dés après achat.

## Achat impossible — XP insuffisants

La compétence peut théoriquement être augmentée, mais le personnage n’a pas assez d’XP.

La console doit indiquer :

* le coût nécessaire ;
* les XP disponibles ;
* le manque d’XP.

## Achat impossible — rang maximum atteint

La compétence est déjà au rang maximal.

La console doit indiquer clairement qu’aucun achat supplémentaire n’est possible.

## Retrait possible

Le dernier rang de la compétence peut être oublié parce qu’il a été acquis via la console.

La console doit indiquer :

* la compétence concernée ;
* le rang qui sera retiré ;
* le remboursement prévu ;
* ou la restauration d’un rang gratuit si le rang retiré était gratuit.

## Retrait impossible

Le rang ne peut pas être oublié automatiquement.

Cela concerne notamment :

* les rangs importés ;
* les rangs saisis manuellement ;
* les rangs antérieurs à la mise en place de la console ;
* les rangs dont le système ne connaît pas l’origine.

Message attendu :

> Ce rang n’a pas été acheté via la console XP et ne peut pas être remboursé automatiquement.

---

# 7. Règles d’achat d’un rang

## 7.1. Achat séquentiel uniquement

Le joueur ne peut acheter que le prochain rang disponible.

Exemple :

* rang actuel : 1 ;
* achat possible : rang 2 ;
* achat impossible : rang 3 directement.

## 7.2. Rang maximum

Une compétence ne peut pas dépasser le rang maximum prévu par le système de jeu.

Par défaut, le rang maximum est 5.

## 7.3. Priorité aux rangs gratuits

Si une compétence est éligible à un rang gratuit et qu’un rang gratuit correspondant est disponible, le système doit proposer en priorité l’utilisation de ce rang gratuit.

Un rang gratuit ne consomme pas d’XP.

## 7.4. Achat avec XP

Si aucun rang gratuit applicable n’est disponible, le système calcule le coût XP du prochain rang.

Le coût dépend du statut de la compétence :

* compétence de carrière ou de spécialisation : coût réduit ;
* compétence hors carrière : coût normal.

## 7.5. XP insuffisants

Si les XP disponibles sont inférieurs au coût requis, l’achat est refusé.

Le refus doit être expliqué dans la console et, si nécessaire, par une notification.

---

# 8. Règles de retrait / oubli d’un rang

## 8.1. Retrait séquentiel uniquement

Le joueur ne peut retirer que le dernier rang acquis d’une compétence.

Exemple :

* rang actuel : 4 ;
* retrait possible : retour au rang 3 ;
* retrait direct au rang 2 impossible.

## 8.2. Retrait uniquement si l’origine du rang est connue

Un rang ne peut être oublié automatiquement que si le système sait comment il a été acquis.

Sont oubliables :

* les rangs achetés via la console XP ;
* les rangs gratuits consommés via la console XP.

Ne sont pas oubliables automatiquement :

* les rangs importés ;
* les rangs créés manuellement ;
* les rangs existants avant cette fonctionnalité ;
* les rangs dont l’origine est inconnue.

## 8.3. Remboursement d’un rang acheté avec XP

Si le rang retiré avait été acheté avec XP, le système rembourse le montant exact dépensé lors de l’achat.

Le système ne doit pas recalculer un coût théorique. Il doit restituer le coût réellement payé.

## 8.4. Restauration d’un rang gratuit

Si le rang retiré avait été acquis gratuitement, aucun XP n’est remboursé.

Le système restaure le rang gratuit correspondant.

Exemple :

* un rang gratuit de carrière avait été utilisé ;
* le joueur retire ce rang ;
* le compteur de rangs gratuits de carrière augmente de 1.

## 8.5. Pas de remboursement approximatif

Si le système ne connaît pas le coût exact d’un rang, il ne doit pas proposer de remboursement automatique.

C’est une règle importante pour éviter les incohérences d’XP.

---

# 9. Prévisualisation au survol

Lorsqu’un joueur survole une compétence, la console doit afficher une prévisualisation de l’action principale disponible.

## Si le prochain rang est achetable

La console affiche :

* nom de la compétence ;
* rang actuel ;
* prochain rang ;
* coût ;
* XP restants après achat ;
* pool de dés actuel ;
* pool de dés après achat.

## Si le rang est gratuit

La console affiche :

* nom de la compétence ;
* rang actuel ;
* prochain rang ;
* coût : 0 XP ;
* source du rang gratuit ;
* pool de dés après achat.

## Si l’achat est impossible

La console affiche :

* nom de la compétence ;
* raison de blocage ;
* éventuellement le coût requis et les XP disponibles.

## Si le rang maximum est atteint

La console affiche que la compétence ne peut plus progresser.

---

# 10. Interaction avec les lignes de compétences

Chaque compétence est affichée sous forme de ligne compacte : nom, attribut associé, marqueurs éventuels de carrière/spécialisation, rang actuel, coût du prochain rang et pool de dés actuel.

L’interaction ne repose pas sur des pips de rang. Elle repose sur la **ligne de compétence** et sur des **actions contextuelles compactes**.

## 10.1. Survol d’une compétence

Au survol d’une ligne, la console affiche la prévisualisation de l’action principale disponible :

* achat du prochain rang ;
* utilisation d’un rang gratuit ;
* retrait du dernier rang acquis via la console ;
* impossibilité d’agir, avec raison courte.

Le survol ne modifie jamais les données du personnage.

## 10.2. Actions disponibles

Une compétence peut proposer des actions explicites et compactes :

* acheter le prochain rang ;
* oublier le dernier rang traçable ;
* afficher le détail du calcul si nécessaire.

Ces actions peuvent être affichées au survol, à la sélection de la ligne ou directement dans la console.

Un simple clic non contextualisé sur la ligne ne doit pas déclencher une transaction irréversible.

## 10.3. Achat

L’action d’achat est disponible uniquement si le prochain rang peut être acheté avec XP ou obtenu gratuitement.

Si l’achat est impossible, l’interface doit afficher la raison : XP insuffisants, rang maximum atteint ou compétence non éligible.

## 10.4. Retrait

L’action de retrait est disponible uniquement pour le dernier rang acquis via la console.

Le retrait doit indiquer clairement :

* le rang retiré ;
* le remboursement XP éventuel ;
* ou la restauration d’un rang gratuit.

Un rang importé, manuel ou non traçable ne peut pas être remboursé automatiquement.

## 10.5. États visuels

La ligne de compétence doit permettre d’identifier rapidement :

* compétence de carrière ;
* compétence de spécialisation ;
* prochain rang gratuit ;
* prochain rang achetable ;
* achat bloqué ;
* rang maximum atteint ;
* dernier rang oubliable ;
* dernier rang non remboursable.

Ces états doivent rester visuellement discrets pour ne pas alourdir la liste.

---

# 11. Messages et retours utilisateur

## Achat réussi

La console et/ou une notification doivent confirmer :

> La compétence passe au rang X.

## Achat refusé

Le système doit expliquer la raison :

* XP insuffisants ;
* rang maximum atteint ;
* compétence non éligible ;
* transaction invalide.

## Retrait réussi

La console et/ou une notification doivent confirmer :

> La compétence revient au rang X.

## Retrait refusé

Le système doit expliquer pourquoi :

* rang non traçable ;
* retrait non séquentiel ;
* action non autorisée ;
* rang non remboursable.

---

# 12. Exigences de cohérence XP

La console doit garantir que :

1. les XP disponibles ne deviennent jamais négatifs ;
2. les rangs de compétence ne dépassent jamais le maximum ;
3. un rang gratuit utilisé est bien déduit du compteur correspondant ;
4. un rang gratuit oublié est bien restauré ;
5. un rang acheté avec XP est remboursé au montant réellement payé ;
6. un rang non traçable n’est jamais remboursé automatiquement ;
7. chaque transaction modifie la compétence et les compteurs XP de manière cohérente.

---

# 13. Gestion des personnages existants

Les personnages existants peuvent avoir des compétences déjà renseignées avant l’arrivée de cette fonctionnalité.

Ces rangs doivent être considérés comme **non traçables** tant qu’ils n’ont pas été acquis via la console.

Conséquence :

* ils restent affichés normalement ;
* ils comptent dans le rang actuel ;
* ils peuvent servir de base pour acheter le rang suivant ;
* ils ne peuvent pas être remboursés automatiquement.

Exemple :

Un personnage importé possède déjà `Athlétisme rang 2`.

Le joueur peut acheter le rang 3 via la console.

Il pourra ensuite annuler cet achat et revenir au rang 2.

Mais il ne pourra pas automatiquement retirer les rangs 2, 1 ou 0 s’ils n’ont pas été acquis via la console.

---

# 14. Cas d’usage principaux

## Cas 1 — Acheter une compétence avec XP

Le joueur survole une compétence au rang 1.

La console indique :

* passage du rang 1 au rang 2 ;
* coût XP ;
* XP restants après achat ;
* nouveau pool de dés.

Le joueur clique sur le pip du rang 2.

Le système valide l’achat.

La compétence passe au rang 2.

Les XP disponibles diminuent.

---

## Cas 2 — Acheter une compétence avec un rang gratuit

Le joueur survole une compétence de carrière au rang 0.

Il lui reste un rang gratuit de carrière.

La console indique que le prochain rang est gratuit.

Le joueur clique sur le pip du rang 1.

La compétence passe au rang 1.

Le compteur de rangs gratuits de carrière diminue.

Les XP disponibles ne changent pas.

---

## Cas 3 — Refuser un achat faute d’XP

Le joueur survole une compétence.

Le coût du prochain rang est supérieur aux XP disponibles.

La console affiche que l’achat est impossible.

Le pip ne permet pas l’achat ou déclenche un message de refus clair.

Aucune donnée du personnage n’est modifiée.

---

## Cas 4 — Oublier un rang acheté avec XP

Le joueur a acheté un rang via la console.

Il clique sur le dernier pip rempli correspondant à ce rang.

La console indique le remboursement exact.

Le joueur confirme ou l’action est appliquée selon le niveau de sécurité choisi.

La compétence perd un rang.

Les XP sont remboursés.

---

## Cas 5 — Oublier un rang gratuit

Le joueur a utilisé un rang gratuit via la console.

Il clique sur le dernier pip rempli correspondant.

La compétence perd un rang.

Le rang gratuit correspondant est restauré.

Aucun XP n’est remboursé.

---

## Cas 6 — Tenter d’oublier un rang importé

Le joueur clique sur un rang existant avant la console.

Le système refuse le retrait automatique.

La console explique que le rang n’est pas traçable.

Aucune donnée n’est modifiée.

---

# 15. Exigences d’internationalisation

Tous les textes visibles doivent être disponibles en français et en anglais.

Sont concernés :

* titres ;
* libellés de statistiques ;
* états de console ;
* messages de prévisualisation ;
* messages de succès ;
* messages d’erreur ;
* raisons de blocage ;
* libellés liés aux rangs gratuits ;
* libellés liés au remboursement.

Aucun texte visible ne doit rester figé dans une seule langue.

---

# 16. Critères d’acceptation fonctionnels

La fonctionnalité est considérée comme terminée si :

1. la console n’est plus statique ;
2. le survol d’une compétence met à jour la console ;
3. la sortie du survol remet la console dans un état neutre ;
4. un joueur peut acheter un rang valide ;
5. un achat impossible est refusé avec une raison claire ;
6. les rangs gratuits sont consommés correctement ;
7. les XP sont dépensés correctement ;
8. le pool de dés affiché reflète le rang prévisualisé ;
9. un rang acheté via la console peut être oublié ;
10. un rang gratuit utilisé via la console peut être restauré ;
11. un rang non traçable ne peut pas être remboursé automatiquement ;
12. les XP ne deviennent jamais négatifs ;
13. le rang maximum ne peut pas être dépassé ;
14. tous les textes visibles sont internationalisés ;
15. les personnages existants restent compatibles.

---

# 17. Points de vigilance métier

## Ne pas confondre édition manuelle et transaction XP

La console ne doit pas devenir un éditeur libre de compétences.

Elle sert à gérer des transactions de progression.

## Ne pas rembourser ce qu’on ne sait pas expliquer

Un remboursement automatique n’est acceptable que si le système connaît l’origine du rang.

## Préserver les imports existants

Les personnages importés ou déjà créés ne doivent pas être cassés par cette fonctionnalité.

## Prévoir la lisibilité joueur

Le joueur doit toujours comprendre :

* ce qu’il va acheter ;
* combien cela coûte ;
* pourquoi c’est gratuit ou payant ;
* pourquoi c’est refusé ;
* ce qui sera remboursé en cas d’oubli.

---

# 18. Reformulation du vrai besoin

Ce n’est pas seulement une console d’achat de compétences.

C’est un **mini-système de comptabilité de progression** : chaque changement de rang doit être compréhensible, traçable et réversible seulement quand il peut l’être proprement.

---

# 19. Encombrement visuel et taille de la console

La console XP doit rester compacte. Elle sert à aider la décision, pas à devenir un panneau de gestion complet.

## 19.1. Taille maximale perçue

La console ne doit pas repousser excessivement les sections de compétences vers le bas.

Elle doit conserver une hauteur proche de l’état actuel, sauf justification UX forte.

## 19.2. Information courte par défaut

La console doit afficher en priorité :

* XP disponibles ;
* XP dépensés ;
* rangs gratuits restants ;
* coût ou remboursement de la sélection ;
* état court de l’action possible.

Les détails longs ne doivent pas être visibles en permanence.

## 19.3. Usage d’icônes et actions compactes

L’interface doit privilégier :

* icônes ;
* boutons courts ;
* liens discrets ;
* infobulles ;
* états visuels.

Les textes longs doivent être réservés aux détails, confirmations ou erreurs.

## 19.4. Pas de duplication inutile

La console ne doit pas répéter toute l’information déjà visible sur la ligne de compétence.

Elle doit seulement compléter la ligne avec :

* l’action possible ;
* le coût ou remboursement ;
* l’impact sur les XP ;
* l’impact sur le rang ;
* l’impact sur le pool de dés.
