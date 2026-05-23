# Document de cadrage — Gestion multi-spécialisation dans la feuille personnage

## 1. Objectif

Ce cadrage définit les règles métier et les règles UI/UX associées à la gestion des spécialisations d’un personnage dans le système SWERPG.

Le besoin couvre trois zones fonctionnelles :

1. l’affichage synthétique des spécialisations dans le header de la fiche personnage ;
2. l’ajout d’une spécialisation avec calcul de coût XP et contrôle de disponibilité ;
3. la suppression conditionnelle d’une spécialisation depuis la vue des arbres de spécialisation.

La règle de coût retenue est celle de Star Wars FFG : une spécialisation supplémentaire coûte `10 × le nombre total de spécialisations après achat`, avec `+10 XP` si elle est hors carrière. Les spécialisations universelles sont généralement traitées comme des spécialisations de carrière pour le coût. ([sw-eote-srd.vercel.app][1])

---

## 2. Principes métier

### 2.1. Carrière, spécialisation et arbre actif

La **carrière** du personnage est définie à la création et ne doit pas être modifiée par cette fonctionnalité.

Une **spécialisation possédée** est une spécialisation initiale ou achetée par le personnage. Elle donne accès à son arbre de talents et à ses compétences de spécialisation.

L’**arbre courant** ou **spécialisation sélectionnée** dans l’interface n’a qu’un sens UI. Il ne doit pas être interprété comme une spécialisation mécaniquement active ou exclusive.

Décision métier :

```txt
career = identité métier stable du personnage
ownedSpecializations = spécialisations possédées
selectedSpecializationTree = contexte d’affichage uniquement
```

Cette distinction est importante pour éviter une confusion entre progression métier et simple navigation dans l’interface.

---

## 3. Règles métier d’ajout d’une spécialisation

### 3.1. Calcul du coût

Le coût d’ajout d’une spécialisation est calculé à partir du nombre de spécialisations que le personnage possédera après achat.

```js
baseCost = 10 * (ownedSpecializationsCount + 1)
```

Si la spécialisation ajoutée n’appartient pas à la carrière du personnage, un surcoût est appliqué :

```js
finalCost = baseCost + 10
```

Si la spécialisation appartient à la carrière du personnage :

```js
finalCost = baseCost
```

Si la spécialisation est universelle, elle doit être traitée comme une spécialisation de carrière pour le coût, sauf décision contraire explicite dans les règles du système ou dans une future ADR.

### 3.2. Exemples

| Situation                                                                             |  Coût |
| ------------------------------------------------------------------------------------- | ----: |
| Le personnage possède 1 spécialisation et achète une 2e spécialisation de carrière    | 20 XP |
| Le personnage possède 1 spécialisation et achète une 2e spécialisation hors carrière  | 30 XP |
| Le personnage possède 2 spécialisations et achète une 3e spécialisation de carrière   | 30 XP |
| Le personnage possède 2 spécialisations et achète une 3e spécialisation hors carrière | 40 XP |

Source de règle : table de progression XP reprise du système Star Wars FFG / Edge of the Empire. ([sw-eote-srd.vercel.app][1])

---

## 4. Contrôles métier à l’ajout

### 4.1. Contrôle d’XP disponible

L’ajout est autorisé uniquement si le personnage dispose d’assez d’XP disponible.

```js
canPurchaseSpecialization =
  actor.system.experience.available >= specializationPurchaseCost
```

Si l’XP disponible est insuffisante, l’action doit être bloquée.

Exemple :

```txt
XP disponible : 25
Coût de la spécialisation : 30
Résultat : ajout interdit
```

### 4.2. Contrôle de doublon

Une spécialisation déjà possédée ne doit pas pouvoir être ajoutée une seconde fois.

```js
canPurchaseSpecialization =
  !ownedSpecializations.includes(candidateSpecializationId)
```

La vue d’ajout doit donc exclure les spécialisations déjà possédées ou les afficher en état désactivé avec un message clair.

### 4.3. Contrôle de résolution de l’arbre

L’ajout d’une spécialisation doit idéalement vérifier qu’un arbre associé est disponible ou résoluble.

Trois cas sont possibles :

| Cas                                          | Comportement recommandé           |
| -------------------------------------------- | --------------------------------- |
| Arbre disponible                             | Achat autorisé                    |
| Arbre introuvable mais spécialisation valide | Achat possible avec avertissement |
| Spécialisation non résolue ou invalide       | Achat bloqué                      |

Décision recommandée : pour la V1, bloquer l’achat si la spécialisation ne peut pas être résolue proprement. Cela évite d’ajouter à l’acteur une spécialisation impossible à afficher ou à exploiter.

---

## 5. Effets métier de l’ajout

Lorsqu’une spécialisation est ajoutée avec succès, le système doit :

1. ajouter la spécialisation à la liste des spécialisations possédées par l’acteur ;
2. décrémenter l’XP disponible du coût calculé ;
3. rendre l’arbre de talents accessible dans la vue des arbres ;
4. recalculer les compétences de carrière dérivées si le système les déduit depuis les spécialisations ;
5. journaliser l’opération si l’audit log est déjà disponible.

Une spécialisation achetée après la création ne doit pas attribuer automatiquement de rangs gratuits de compétences. À la création, la spécialisation initiale donne des compétences de spécialisation et permet de choisir deux rangs gratuits ; ce comportement ne doit pas être rejoué lors d’un achat ultérieur. ([sw-eote-srd.vercel.app][2])

---

## 6. Règles métier de suppression d’une spécialisation

### 6.1. Principe général

Une spécialisation peut être supprimée uniquement si aucun talent n’a été acheté dans son arbre.

```js
canRemoveSpecialization =
  purchasedTalentsInSpecialization.length === 0
```

Cette règle protège l’intégrité de la progression du personnage.

### 6.2. Spécialisation initiale

La spécialisation initiale du personnage ne devrait pas être supprimable en V1.

Raison : elle peut avoir participé à la création du personnage, notamment via les compétences de spécialisation et les rangs gratuits initiaux. La supprimer proprement demanderait une logique de rollback plus complexe.

Règle recommandée :

```js
canRemoveSpecialization =
  !isInitialSpecialization
  && purchasedTalentsInSpecialization.length === 0
```

### 6.3. Suppression et remboursement XP

Pour la V1, la suppression d’une spécialisation ne doit pas rembourser automatiquement l’XP.

Deux raisons :

1. le remboursement automatique impose de reconstruire l’historique exact de dépense ;
2. une suppression pourrait être utilisée pour optimiser artificiellement les coûts de progression.

Décision recommandée :

```txt
Suppression autorisée = retrait technique d’une spécialisation sans talent acheté.
Remboursement XP = hors scope V1.
```

Si le remboursement devient nécessaire plus tard, il doit passer par une logique d’audit log explicite.

---

## 7. Effets métier de la suppression

Lorsqu’une spécialisation est supprimée, le système doit :

1. retirer la spécialisation de la liste des spécialisations possédées ;
2. retirer l’accès à son arbre dans la vue des arbres ;
3. recalculer les compétences de carrière dérivées ;
4. changer l’arbre courant si la spécialisation supprimée était sélectionnée ;
5. journaliser l’opération si l’audit log est disponible.

Si la spécialisation supprimée était l’arbre courant, la vue doit sélectionner automatiquement une autre spécialisation disponible.

Règle recommandée :

```txt
Après suppression, sélectionner la dernière spécialisation possédée encore disponible.
```

Cette règle reste cohérente avec l’idée actuelle de sélectionner le dernier arbre disponible comme contexte actif d’interface.

---

# 8. Règles UI/UX — Header de la fiche personnage

## 8.1. Affichage compact des spécialisations

Dans le header de la fiche personnage, l’objectif est d’afficher une information courte, lisible et stable.

Structure cible :

```html
<h2 class="specialization flexrow" data-action="editSpecializations">
  <a>
    <span class="specialization__primary">Scoundrel</span>
    <span class="specialization__count-badge">+1</span>
  </a>
</h2>
```

Règle d’affichage :

| Nombre de spécialisations | Affichage                                      |
| ------------------------: | ---------------------------------------------- |
|                         0 | `No specialization` ou valeur i18n équivalente |
|                         1 | `Scoundrel`                                    |
|                         2 | `Scoundrel +1`                                 |
|                         3 | `Scoundrel +2`                                 |

Il vaut mieux éviter `Scoundrel, Pilot, ...` dans le header. Cette forme devient vite illisible et casse la stabilité visuelle de la fiche.

## 8.2. Tooltip de la pastille

La pastille doit afficher la liste des spécialisations supplémentaires au survol.

Exemple :

```txt
+2
Tooltip: Pilot, Charmer
```

La spécialisation principale reste visible en permanence ; les spécialisations supplémentaires sont accessibles au survol ou au clic.

## 8.3. Action au clic

Le clic sur le bloc spécialisation doit ouvrir l’interface de gestion des spécialisations, idéalement la fenêtre existante des arbres de spécialisation.

Comportement :

```txt
Click sur le bloc specialization
→ ouvre SpecializationTreeApp
→ affiche l’arbre courant ou le dernier arbre disponible
```

---

# 9. Règles UI/UX — Specialization Tree View App

## 9.1. Rôle de la fenêtre

La fenêtre des arbres de spécialisation devient le centre de gestion des spécialisations possédées.

Elle doit permettre :

1. de consulter les spécialisations possédées ;
2. de sélectionner l’arbre affiché ;
3. de voir la progression par arbre ;
4. d’ajouter une spécialisation ;
5. de supprimer une spécialisation lorsque la règle métier l’autorise.

L’écran actuel dispose déjà d’une sidebar listant les spécialisations et d’une zone centrale dédiée à l’arbre graphique, ce qui correspond bien au besoin.

---

## 9.2. Sidebar des spécialisations

Chaque spécialisation affichée dans la sidebar doit présenter au minimum :

```txt
Nom de la spécialisation
État de résolution de l’arbre
Progression talents achetés / talents totaux
Action de sélection
Action de suppression si autorisée
```

Exemple :

```txt
Scoundrel
Available tree
0/20
```

Pour l’arbre courant :

```txt
Pilot
Current tree
0/20
```

Pour une spécialisation avec talents achetés :

```txt
Pilot
3/20 talents
Removal locked
```

## 9.3. Suppression dans la sidebar

La suppression doit être une action secondaire, jamais une action principale.

Recommandation UI :

```txt
[Nom de la spé]        [icône corbeille]
Available tree
0/20
```

L’icône de suppression est affichée uniquement si :

```txt
spécialisation non initiale
ET aucun talent acheté dans cette spécialisation
```

Si le choix UX est de garder l’icône visible mais désactivée, il faut un tooltip explicite :

```txt
Cannot remove this specialization because talents have already been purchased.
```

ou en français :

```txt
Impossible de supprimer cette spécialisation : des talents ont déjà été achetés dans cet arbre.
```

---

## 9.4. Confirmation de suppression

Une confirmation est obligatoire avant suppression.

Texte recommandé :

```txt
Remove specialization “Pilot”?

This specialization has no purchased talents.
Removing it will remove access to its specialization tree.
No XP refund will be applied.

[Cancel] [Remove specialization]
```

Version française :

```txt
Supprimer la spécialisation « Pilot » ?

Aucun talent n’a été acheté dans cet arbre.
La suppression retirera l’accès à cet arbre de spécialisation.
Aucun remboursement d’XP ne sera appliqué.

[Annuler] [Supprimer la spécialisation]
```

---

# 10. Règles UI/UX — Ajout d’une spécialisation

## 10.1. Emplacement de l’ajout

L’ajout peut rester là où il existe actuellement, mais il doit afficher clairement le coût avant validation.

Dans la fenêtre de gestion, l’action d’ajout doit être accessible depuis la sidebar ou depuis un bouton dédié :

```txt
+ Add specialization
```

ou :

```txt
+ Ajouter une spécialisation
```

## 10.2. Prévisualisation du coût

Avant achat, l’utilisateur doit voir :

```txt
Specialization: Charmer
Type: Career specialization
Current specializations: 2
Cost: 30 XP
Available XP: 100
```

Si la spécialisation est hors carrière :

```txt
Specialization: Mercenary Soldier
Type: Non-career specialization
Current specializations: 2
Cost: 40 XP
Available XP: 100
```

## 10.3. État XP insuffisante

Si l’XP disponible est insuffisante, le bouton d’achat doit être désactivé.

Message recommandé :

```txt
Insufficient XP — cost: 40 XP, available: 25 XP.
```

Version française :

```txt
XP insuffisante — coût : 40 XP, disponible : 25 XP.
```

Ne pas masquer l’option. Il vaut mieux afficher l’action bloquée avec une raison claire.

---

# 11. États UI recommandés

## 11.1. Spécialisation possédée

```txt
Owned
Selectable
Tree available
```

## 11.2. Spécialisation sélectionnée

```txt
Current tree
Highlighted
Not mechanically exclusive
```

## 11.3. Spécialisation supprimable

```txt
Owned
No purchased talents
Not initial specialization
Remove action available
```

## 11.4. Spécialisation non supprimable

```txt
Owned
Purchased talents exist
Remove action unavailable
Reason displayed in tooltip
```

## 11.5. Spécialisation achetable

```txt
Not owned
Cost computable
Enough XP
Purchase action enabled
```

## 11.6. Spécialisation non achetable

```txt
Not owned
Cost computable
Not enough XP
Purchase action disabled
Reason displayed
```

---

# 12. Critères d’acceptation

## 12.1. Header fiche personnage

```gherkin
Given un personnage avec une seule spécialisation
When la fiche personnage est affichée
Then le header affiche le nom de cette spécialisation sans pastille
```

```gherkin
Given un personnage avec deux spécialisations
When la fiche personnage est affichée
Then le header affiche la première spécialisation
And une pastille "+1" est affichée
```

```gherkin
Given un personnage avec trois spécialisations
When la fiche personnage est affichée
Then le header affiche la première spécialisation
And une pastille "+2" est affichée
And le tooltip de la pastille liste les spécialisations supplémentaires
```

## 12.2. Ajout d’une spécialisation

```gherkin
Given un personnage avec une spécialisation possédée
And 100 XP disponibles
When il sélectionne une deuxième spécialisation de carrière
Then le coût affiché est 20 XP
And l’action d’achat est disponible
```

```gherkin
Given un personnage avec une spécialisation possédée
And 100 XP disponibles
When il sélectionne une deuxième spécialisation hors carrière
Then le coût affiché est 30 XP
And l’action d’achat est disponible
```

```gherkin
Given un personnage avec deux spécialisations possédées
And 25 XP disponibles
When il sélectionne une troisième spécialisation de carrière
Then le coût affiché est 30 XP
And l’action d’achat est désactivée
And un message indique que l’XP est insuffisante
```

```gherkin
Given un personnage possède déjà la spécialisation Pilot
When il ouvre l’ajout de spécialisation
Then Pilot ne peut pas être achetée une seconde fois
```

## 12.3. Suppression d’une spécialisation

```gherkin
Given une spécialisation non initiale
And aucun talent acheté dans son arbre
When l’utilisateur consulte la sidebar des spécialisations
Then une action de suppression est disponible
```

```gherkin
Given une spécialisation non initiale
And au moins un talent acheté dans son arbre
When l’utilisateur consulte la sidebar des spécialisations
Then l’action de suppression est absente ou désactivée
And la raison est affichée
```

```gherkin
Given une spécialisation supprimable
When l’utilisateur clique sur supprimer
Then une confirmation est affichée
```

```gherkin
Given une spécialisation supprimable
When l’utilisateur confirme la suppression
Then la spécialisation est retirée de l’acteur
And l’arbre n’est plus disponible dans la sidebar
And aucun remboursement d’XP n’est appliqué
```

---

# 13. Hors scope V1

Sont explicitement hors scope :

```txt
- changement de carrière ;
- suppression de la spécialisation initiale ;
- remboursement automatique d’XP ;
- oubli de talents achetés ;
- reconstruction automatique d’un arbre supprimé ;
- réparation de liens cassés vers des arbres ou talents supprimés ;
- gestion avancée par audit log.
```

Ces sujets relèvent plutôt d’une V2 de résilience et de maintenance des référentiels.

---

# 14. Recommandation finale

La bonne séparation est la suivante :

```txt
Header personnage
→ affichage compact de l’identité de spécialisation

Specialization Tree View App
→ gestion complète des spécialisations possédées

Service métier
→ calcul du coût, contrôle XP, contrôle suppression

Audit log
→ traçabilité future, pas bloquant pour la V1
```

Le point à ne pas rater : **ne pas transformer la spécialisation sélectionnée dans l’UI en état métier exclusif**. Un personnage peut posséder plusieurs spécialisations et continuer à progresser dans chacune. L’interface doit donc parler de **current tree** ou **selected tree**, pas de spécialisation active au sens mécanique.

[1]: https://sw-eote-srd.vercel.app/experience-points?utm_source=chatgpt.com "Experience Points"
[2]: https://sw-eote-srd.vercel.app/careers-specializations?utm_source=chatgpt.com "Careers & Specs"
