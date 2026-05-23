# Plan de correction - plafond de skill a 2 en creation malgre les free ranks

**Contexte** : bug dans la logique metier de progression des skills pendant la creation de personnage. Lorsqu'un skill recoit un rang gratuit de species et qu'il est aussi skill de career et de specialization, le cumul de free ranks peut actuellement pousser `rank.value` au-dela de `2`, alors que la regle metier attend un plafond strict a `2` pendant la creation.

**Perimetre** : lib metier de skills, calcul d'etat d'achat des skills, garde-fous de creation et tests de non-regression associes.

---

## Resume du probleme

Le plafond `max 2 a la creation` existe deja pour les achats XP dans `TrainedSkill`, mais il n'est pas applique dans les transactions de type `CareerFreeSkill` et `SpecializationFreeSkill`.

En pratique, un skill peut donc atteindre `3` pendant la creation si l'on cumule :

1. `species` donnant `rank.base = 1` ;
2. un free rank `career` ;
3. un free rank `specialization`.

Le probleme est double :

1. la transaction backend n'interdit pas ce cumul dans les branches free-rank ;
2. l'UI continue de presenter l'achat comme possible, car l'etat de purchase conserve un `maxRank = 5` par defaut.

---

## Constat code review

### 1. Regle appliquee seulement a `TrainedSkill`

`TrainedSkill` refuse deja un `rank.value > 2` pendant la creation.

Impact : les achats XP respectent la regle, mais pas les achats gratuits.

### 2. Absence de garde-fou dans `CareerFreeSkill`

`CareerFreeSkill.process()` recalcule `rank.value`, mais ne bloque pas le depassement du plafond de creation.

Impact : un free rank career peut faire passer un skill a `3` pendant la creation.

### 3. Absence de garde-fou dans `SpecializationFreeSkill`

`SpecializationFreeSkill.process()` a la meme faiblesse.

Impact : un free rank specialization peut aussi contourner la regle de creation.

### 4. Etat d'achat UI non aligne

`getSkillPurchaseState()` supporte un `maxRank` parametrable, mais l'appel courant n'envoie pas `2` pendant la creation.

Impact : l'interface peut continuer d'afficher un skill comme achetable alors qu'il devrait etre bloque a `MAX_RANK`.

### 5. Couverture de tests incomplete

Les tests couvrent deja :

1. la regle `max 2` pour `TrainedSkill` ;
2. les regles de free ranks career et specialization individuellement.

Mais ils ne couvrent pas le cas metier critique :

1. `species base 1` ;
2. skill a la fois `career` et `specialization` ;
3. tentative de passage a `3` en creation.

---

## Hypothese retenue

La regression vient du fait que la regle metier `rank.value <= 2 a la creation` n'est pas centralisee et n'est appliquee que dans la branche `TrainedSkill`.

Le contournement se produit donc lorsque la progression passe par les classes free-rank.

---

## Objectifs de correction

1. Garantir que `rank.value` ne depasse jamais `2` pendant la creation, quelle que soit la source du rang.
2. Aligner le backend transactionnel et l'etat d'achat expose a l'UI.
3. Ajouter une couverture de tests de non-regression sur le cumul species + career + specialization.

---

## Strategie de correction recommandee

### Axe 1 - Verrouiller les transactions free-rank

Ajouter le meme garde-fou metier que dans `TrainedSkill` dans :

1. `CareerFreeSkill.process()` ;
2. `SpecializationFreeSkill.process()`.

Apres recalcul de `this.data.rank.value`, si `isCreation === true` et `rank.value > 2`, retourner une erreur avec un message coherent avec la branche `TrainedSkill`.

Message cible :

`you can't have more than 2 ranks at creation!`

### Axe 2 - Aligner l'etat d'achat expose a l'UI

Passer explicitement `maxRank = 2` a `getSkillPurchaseState()` quand le personnage est en creation.

Effet attendu :

1. un skill deja a `2` pendant la creation retourne `MAX_RANK` ;
2. l'UI n'affiche plus un achat gratuit ou XP comme disponible au-dela de ce seuil.

### Axe 3 - Garder un point de verite simple

Deux options acceptables :

1. option minimale : dupliquer le controle dans `CareerFreeSkill` et `SpecializationFreeSkill` ;
2. option legerement plus propre : extraire une petite validation commune dans la base `Skill` et l'appeler depuis les trois branches transactionnelles.

La preference initiale est la correction minimale, plus chirurgicale.

---

## Plan technique detaille

### Etape 1 - Bloquer le depassement dans `CareerFreeSkill`

1. Recalculer `rank.value` comme aujourd'hui.
2. Ajouter un controle `isCreation && rank.value > 2`.
3. Retourner `ErrorSkill` avant de preparer `updateData`.

### Etape 2 - Bloquer le depassement dans `SpecializationFreeSkill`

1. Recalculer `rank.value` comme aujourd'hui.
2. Ajouter le meme controle `isCreation && rank.value > 2`.
3. Retourner `ErrorSkill` avant de preparer `updateData`.

### Etape 3 - Aligner `getSkillPurchaseState()` pendant la creation

1. Identifier l'appel de preparation du skill pour les personnages.
2. Fournir `maxRank: 2` si l'acteur est en creation.
3. Conserver `maxRank: 5` hors creation.

### Etape 4 - Verifier la coherence du factory flow

Verifier que `SkillFactory` peut continuer a router vers `CareerFreeSkill` ou `SpecializationFreeSkill`, mais que `process()` echoue proprement si la regle metier est violee.

L'objectif n'est pas necessairement de changer le routage, mais de garantir la securite metier au moment de l'evaluation.

---

## Tests a ajouter

### Tests unitaires metier

Ajouter un test dans `career-free-skill.test.mjs` :

1. `base: 1` ;
2. `specializationFree: 1` ;
3. tentative d'ajout d'un `careerFree` en creation ;
4. resultat attendu : `ErrorSkill` avec message `you can't have more than 2 ranks at creation!`.

Ajouter un test dans `specialization-free-skill.test.mjs` :

1. `base: 1` ;
2. `careerFree: 1` ;
3. tentative d'ajout d'un `specializationFree` en creation ;
4. resultat attendu : `ErrorSkill` avec le meme message.

### Tests de calcul d'etat d'achat

Ajouter un test sur `getSkillPurchaseState()` ou sur la preparation des skills de personnage :

1. en creation ;
2. `rank = 2` ;
3. free ranks encore disponibles ;
4. resultat attendu : `MAX_RANK`.

### Test d'integration sheet ou contexte acteur

Ajouter un cas de non-regression sur un skill a la fois `career` et `specialization`, avec un rang species deja applique, pour verifier que l'UI reflete bien l'impossibilite de monter au-dela de `2`.

---

## Scenarios de validation

### Scenario 1 - Species + career + specialization

1. Un skill recoit `base = 1` via species.
2. Le skill est dans les career skills.
3. Le skill est aussi dans les specialization skills.
4. Le premier free rank porte le total a `2`.
5. La tentative suivante doit etre refusee.

### Scenario 2 - Affichage UI a rang 2 en creation

1. Le skill est deja a `2`.
2. Il reste des free ranks career ou specialization.
3. L'UI doit afficher `MAX_RANK` et ne pas proposer un achat valide.

### Scenario 3 - Hors creation

1. Le meme skill hors creation doit conserver son plafond habituel a `5`.
2. La correction ne doit pas casser les achats post-creation.

---

## Risques et points d'attention

1. Ne pas casser les comportements existants de remboursement `forget`.
2. Ne pas modifier la logique de cout XP hors creation.
3. Ne pas melanger cette correction avec une refonte plus large des regles de progression de skills.
4. Garder le meme message d'erreur entre branches pour eviter des comportements incoherents cote UI/tests.

---

## Decision recommandee

Appliquer une correction minimale et robuste en deux points :

1. ajouter le garde-fou `max 2 en creation` dans `CareerFreeSkill` et `SpecializationFreeSkill` ;
2. passer `maxRank = 2` dans le calcul d'etat d'achat pendant la creation.

Cette solution couvre a la fois la securite metier backend et la coherence de l'interface sans refonte large du systeme de skills.
