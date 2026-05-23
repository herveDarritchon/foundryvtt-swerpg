# Plan de correction - regression OggDude species/talent sur les free talents

**Contexte** : regression probable sur l'import OggDude des species quand une species reference un talent gratuit via `TalentModifiers`, notamment `Bothan` avec `CONV` pour `Convincing Demeanor`.

**Perimetre** : importer OggDude `species` et `talent`, orchestration d'import, resolution des references de talents, observabilite et tests associes.

---

## Resume du probleme

Le pipeline actuel importe les `species` avant les `talent`.

Le mapper species tente de resoudre immediatement les talents gratuits en UUID Foundry via les talents deja presents dans `game.items` ou dans `game.packs`.

Quand les talents OggDude ne sont pas encore importes, la resolution echoue et la species est stockee sans `freeTalents` resolus.

Au moment ou la species est appliquee a un acteur, seuls les UUID presents dans `system.freeTalents` sont utilises pour creer les talents gratuits. La reference metier OggDude est donc perdue.

Le cas `Bothan -> CONV -> Convincing Demeanor` correspond exactement a ce scenario.

---

## Constat code review

### 1. Dependance d'ordre explicite

L'ordre canonique d'import place `species` avant `talent` dans l'UI et dans l'orchestrateur.

Impact : si l'utilisateur selectionne les deux domaines, les species sont mappees avant que les talents n'existent.

### 2. Resolution trop tot dans le mapper species

Le mapper species transforme `TalentModifiers` en `freeTalents` resolves des le mapping.

Impact : la resolution depend d'un etat de stockage deja peuple, alors que la donnee source species ne contient qu'une cle metier OggDude.

### 3. Perte definitive de l'information metier

Une fois la species creee sans UUID de talent, l'application sur l'acteur ne peut plus reconstituer le talent gratuit.

Impact : le talent attendu n'apparait jamais sur l'acteur, meme si les talents sont importes ensuite.

### 4. Couverture de tests insuffisante

Les tests verifies actuellement s'arretent a `freeTalents` comme tableau, sans verifier qu'une cle comme `CONV` est resolue en UUID valide.

Impact : la regression peut passer sans etre detectee.

### 5. Observabilite partielle

Une statistique `unknownTalents` existe pour species, mais elle n'est pas alimentee par le mapper quand une resolution echoue.

Impact : le diagnostic utilisateur et developpeur est incomplet.

### 6. Compatibilite fragile avec les talents natifs du systeme

La resolution actuelle repose surtout sur `system.id`, `flags.swerpg.oggdudeKey` ou le nom exact. Les talents natifs preexistants ne sont pas garantis d'exposer une cle compatible avec les codes OggDude comme `CONV`.

Impact : importer seulement les species peut rester insuffisant, meme hors dependance d'ordre.

---

## Hypothese retenue

La regression principale provient du fait que la resolution des talents gratuits des species est faite trop tot, dans un pipeline ou `species` est importe avant `talent`.

Le probleme structurel est donc une resolution eager vers UUID alors que la source porte une reference metier.

---

## Objectifs de correction

1. Supprimer la dependance fonctionnelle a l'ordre d'import entre `species` et `talent`.
2. Preserver la reference metier source tant qu'une resolution UUID fiable n'est pas possible.
3. Ameliorer le diagnostic en cas de talent introuvable.
4. Ajouter une couverture de tests de non-regression sur les cas species/talent couples.

---

## Option 1 - Correctif minimal

### Principe

Importer `talent` avant `species`.

### Modifications

1. Changer l'ordre canonique des domaines dans l'UI.
2. Changer l'ordre du registre de pipelines pour que `talent` passe avant `species`.
3. Ajouter un test d'orchestration qui verifie cet ordre.

### Avantages

1. Correction rapide.
2. Faible surface de changement.
3. Forte probabilite de corriger immediatement le cas Bothan.

### Limites

1. Ne supprime pas la dependance conceptuelle.
2. Ne corrige pas le cas `species` seule.
3. Ne resout pas pleinement la compatibilite avec des talents natifs deja presents.

---

## Option 2 - Correctif robuste recommande

### Principe

Passer a une resolution en deux temps :

1. Le mapper species conserve les cles metier OggDude des talents gratuits.
2. Une etape de reconciliation ulterieure resolve ces cles en UUID Foundry quand l'ensemble des talents disponibles est connu.

### Modifications fonctionnelles

1. Extraire `TalentModifiers.Key` comme source canonique de travail pour les species.
2. Persister ces cles dans les flags de la species, par exemple `flags.swerpg.oggdude.freeTalentKeys`.
3. Remplir `system.freeTalents` uniquement avec les UUID effectivement resolus.
4. Ajouter une phase de reconciliation apres import des domaines selectionnes.
5. Mettre a jour les species importees avec les UUID resolves une fois l'index de talents disponible.

### Source de resolution recommandee

Construire un index de talents reutilisable a partir de :

1. `game.items` pour les talents world.
2. `game.packs` pour les talents compendium.
3. `system.id` quand il existe.
4. `flags.swerpg.oggdudeKey` quand il existe.

### Avantages

1. Supprime la dependance a l'ordre.
2. Rend le flux d'import plus resilient.
3. Conserve la trace metier source en cas de resolution partielle.
4. Facilite le diagnostic et les reprises ulterieures.

### Limites

1. Demande une etape supplementaire d'implementation.
2. Introduit une logique de reconciliation a cadrer proprement entre world et compendium.

---

## Option 3 - Compatibilite etendue avec le referentiel natif

### Principe

Ajouter une couche d'alias ou de resolution metier qui permette de relier un code OggDude comme `CONV` a un talent systeme preexistant, meme hors import du domaine `talent`.

### Approches possibles

1. Reutiliser et factoriser la logique d'indexation des talents deja presente pour les specialization trees.
2. Etendre la resolution avec une table d'alias `oggdudeKey -> system.id` si necessaire.
3. En dernier recours seulement, utiliser des correspondances strictement controlees par nom normalise.

### Avantages

1. Rend l'import species plus autonome.
2. Ameliore la compatibilite avec les talents natifs du systeme.

### Limites

1. Introduit une couche de mapping supplementaire.
2. Doit rester deterministe et testee pour eviter des faux positifs.

---

## Recommandation de mise en oeuvre

### Phase 1

Appliquer l'Option 1 pour corriger rapidement le cas principal.

### Phase 2

Implementer l'Option 2 comme solution durable.

### Phase 3

Ajouter l'Option 3 seulement si l'objectif produit est de supporter l'import des species sans reimport des talents OggDude.

---

## Plan technique detaille recommande

### Etape 1 - Reordonner le pipeline

1. Passer `talent` avant `species` dans `_domainNames`.
2. Passer `talent` avant `species` dans `buildContextRegistry()`.
3. Verifier qu'aucun autre domaine n'est impacte par ce changement d'ordre.

### Etape 2 - Preserver les cles metier de talents dans species

1. Modifier le mapper species pour extraire les cles de `TalentModifiers` sans les perdre.
2. Persister ces cles dans les flags d'import de la species.
3. Continuer a remplir `freeTalents` avec les UUID resolubles immediatement quand ils existent.

### Etape 3 - Ajouter une reconciliation post-import

1. Construire un index de talents unifie.
2. Resoudre les `freeTalentKeys` restants.
3. Mettre a jour les species importees qui disposent de cles mais pas encore de tous leurs UUID.
4. Alimenter les statistiques pour les cles non resolues.

### Etape 4 - Renforcer l'observabilite

1. Incremeter `unknownTalents` quand une cle n'est pas resolue.
2. Conserver le detail des cles en echec.
3. Ajouter des logs de diagnostic utiles mais non verbeux.

### Etape 5 - Ajouter les tests de non-regression

1. Test mapper species avec `Bothan.xml` et verification de la capture de `CONV`.
2. Test d'import combine `talent + species` avec resolution effective vers UUID.
3. Test en mode compendium.
4. Test d'import `species` seule avec talents deja presents en world.
5. Test de resolution partielle avec statistiques `unknownTalents`.
6. Test d'orchestration sur l'ordre des domaines.

---

## Scenarios de validation

### Scenario 1 - Cas nominal world

Importer `talent` et `species`, puis verifier que `Bothan` contient un `freeTalents` resolu vers `Convincing Demeanor`.

### Scenario 2 - Application a un acteur

Appliquer la species `Bothan` a un acteur et verifier que le talent gratuit est cree sur l'acteur avec `system.isFree = true`.

### Scenario 3 - Mode compendium

Importer en compendium et verifier que la resolution des UUID compendium fonctionne aussi pour les talents gratuits des species.

### Scenario 4 - Talent introuvable

Importer une species referenceant un talent absent et verifier :

1. aucune corruption de la species ;
2. conservation de la cle source ;
3. increment de `unknownTalents` ;
4. diagnostic exploitable.

---

## Risques et points d'attention

1. Ne pas casser la validation `DocumentUUIDField` de `freeTalents`.
2. Bien distinguer la donnee canonique metier et la projection technique UUID.
3. Eviter tout fuzzy matching non maitrise dans la resolution des talents.
4. Verifier la coherence world/compendium pour les UUID generes.
5. Ne pas melanger cette correction avec une refonte plus large des talents ou des species.

---

## Decision recommandee

Valider un correctif en deux temps :

1. correctif minimal immediat par reordonnancement `talent -> species` ;
2. correctif durable par persistance des cles metier et reconciliation post-import.

Ce chemin corrige rapidement la regression observee tout en traitant proprement la dependance entre elements.
