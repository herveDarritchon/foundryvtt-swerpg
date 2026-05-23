# Plan de correction - regression de la valeur specialization free dans la console XP

**Contexte** : feuille de personnage, console XP, ajout de specialisation, creation vs post-creation  
**Zone fonctionnelle** : `character-sheet`, `console-xp`, `specialization purchase flow`

---

## Probleme constate

Le champ affiche la valeur `0` dans la console XP de la feuille de personnage alors qu'une valeur non nulle est attendue apres ajout d'une specialisation pendant la creation.

Le symptome est visible dans le champ rendu par :

- `templates/sheets/actor/character-header.hbs`
- `module/applications/sheets/character-sheet.mjs`

La valeur affichee provient de `progression.freeSkillRanks.specialization.available`.

---

## Diagnostic etabli

### 1. Source de la valeur affichee

La console XP lit :

- `progression.freeSkillRanks.specialization.available`

Cette valeur est rafraichie dans la feuille via :

- `module/applications/sheets/character-sheet.mjs`

### 2. Calcul metier amont

La valeur `available` depend de :

- `progression.freeSkillRanks.specialization.gained`
- `progression.freeSkillRanks.specialization.spent`

Le champ `gained` est reconstruit a partir de la somme des :

- `system.details.specializations[*].freeSkillRank`

Calcul localise dans :

- `module/models/character.mjs`

### 3. Cause probable de la regression

Le drop d'une specialisation sur la feuille passe maintenant par le flux d'achat de specialisation au lieu de passer directement par l'application de specialisation en creation.

Chemin actuel :

1. `#handleSpecializationDrop()` evalue l'ajout.
2. Si le resultat est `free-add`, le flux appelle `actor.system.acquireSpecialization(item)`.
3. `acquireSpecialization()` persiste la specialisation avec `freeSkillRank: 0`.
4. Lors du recalcul des donnees acteur, `#prepareSpecializations()` somme des valeurs deja remises a `0`.
5. La console XP affiche donc `specialization.available = 0`.

### 4. Nature exacte de la regression

La regression est liee a la distinction suivante :

- creation du personnage : la specialisation initiale doit conserver ses rangs gratuits ;
- post-creation : une specialisation achetee ne doit pas recrediter de rangs gratuits.

Le flux actuel traite aussi le cas de creation via `acquireSpecialization()`, ce qui aligne a tort la creation sur la logique post-creation.

---

## Point d'attention sur l'exemple Bounty Hunter / Scoundrel

Les donnees source actuelles indiquent :

- `Bounty Hunter` : `freeSkillRank: 4` cote carriere ;
- `Scoundrel` : `freeSkillRank: 2` cote specialisation ;
- `Scoundrel` expose 4 `specializationSkills`.

Cela implique qu'il faut clarifier le contrat metier du champ :

- soit il affiche les rangs gratuits de specialisation restants ;
- soit il affiche le nombre de competences de specialisation candidates.

Le code actuel implemente clairement le premier contrat : rangs gratuits restants.

---

## Correction minimale proposee

### Objectif

Restaurer la valeur correcte de `progression.freeSkillRanks.specialization.available` pendant la creation sans casser le flux d'achat post-creation.

### Strategie

1. Garder `acquireSpecialization()` reserve au post-creation.
2. Dans `#handleSpecializationDrop()`, distinguer explicitement le cas creation du cas post-creation.
3. En creation, utiliser `applySpecialization()` pour conserver `freeSkillRank` d'origine.
4. En post-creation, conserver le flux `evaluateSpecializationPurchase()` puis `acquireSpecialization()`.

### Modification ciblee

#### A. Branche creation dans le drop de specialisation

Dans `module/applications/sheets/character-sheet.mjs` :

- ajouter une garde explicite pour le cas creation ;
- faire transiter ce cas par `actor.system.applySpecialization(item)` ;
- ne pas faire passer la specialisation initiale par `acquireSpecialization()`.

#### B. Conserver la logique post-creation

Ne pas modifier la regle actuelle de `acquireSpecialization()` :

- une specialisation acquise hors creation doit rester persistante avec `freeSkillRank: 0`.

#### C. Ne pas toucher au rendu de la console XP

Le rendu actuel de la console lit la bonne donnee.

La correction doit rester metier et non cosmetique.

---

## Tests de regression a ajouter

### 1. Test feuille / drop en creation

Verifier que le drop d'une premiere specialisation pendant la creation :

- appelle le bon chemin metier ;
- conserve `freeSkillRank` dans `system.details.specializations` ;
- produit une valeur `progression.freeSkillRanks.specialization.available` strictement positive.

### 2. Test modele / post-creation

Verifier qu'une specialisation acquise hors creation :

- continue a persister avec `freeSkillRank: 0` ;
- ne recredite pas de rang gratuit de specialisation.

### 3. Test feuille / console XP

Verifier que la console XP affiche la valeur issue de `progression.freeSkillRanks.specialization.available` apres ajout d'une specialisation en creation.

---

## Hors scope

- Changer la signification metier du champ pour afficher le nombre de `specializationSkills`.
- Modifier les donnees source des specialisations.
- Refondre le flux d'achat de specialisation post-creation.
- Corriger les `console.log` residuels non lies a cette regression.

---

## Resultat attendu apres correction

- En creation, l'ajout de la specialisation initiale conserve ses rangs gratuits.
- `progression.freeSkillRanks.specialization.gained` est correctement recalcule.
- `progression.freeSkillRanks.specialization.available` n'est plus a `0` a tort.
- La console XP affiche une valeur coherente avec les donnees metier.

---

## Verification ciblee

1. Creer un personnage en creation.
2. Lui appliquer une carriere puis une specialisation.
3. Ouvrir la feuille et verifier la valeur `specialization free` dans la console XP.
4. Verifier qu'un achat post-creation de specialisation ne redonne pas de rangs gratuits.
