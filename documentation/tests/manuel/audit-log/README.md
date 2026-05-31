# Tests manuels — Audit Log

Tests du système de journalisation d'évolution du personnage (Character Audit Log).  
Ce système intercepte les modifications des acteurs `character` via des hooks Foundry et enregistre des entrées
structurées dans `actor.flags.swerpg.logs`.

---

## Prérequis

- Monde SWERPG créé et système `swerpg` activé
- Droits GM pour ouvrir la console développeur (F12)
- Un personnage `character` avec espèces/carrière/spécialisations appliquées
- Build à jour : `pnpm run rollup && pnpm run less`

---

## 1. Vérification de base

### 1.1. Lecture des logs

| Action                                                                        | Résultat attendu                                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Ouvrir la console développeur (F12)                                           | Console visible                                                                                                          |
| Sélectionner le personnage dans le répertoire des acteurs                     | Acteur sélectionné                                                                                                       |
| Exécuter dans la console : `game.actors.getName("NomDuPJ").flags.swerpg.logs` | Un tableau (vide si aucun log) ou la liste des entrées existantes                                                        |
| Vérifier la structure d'une entrée                                            | Chaque entrée contient : `id`, `schemaVersion`, `timestamp`, `userId`, `userName`, `type`, `data`, `xpDelta`, `snapshot` |

### 1.2. Vérification de l'enregistrement des hooks

| Action                                    | Résultat attendu                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Exécuter dans la console : `Hooks.events` | Rechercher `preUpdateActor`, `updateActor`, `createItem` dans la liste |
| Vérifier que les 3 hooks sont actifs      | Les hooks sont bien enregistrés par le système                         |

---

## 2. Compétences

### 2.1. Achat de rang (skill.train)

| Action                                                                              | Résultat attendu                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------ |
| Ouvrir la fiche du personnage, onglet Compétences                                   | Onglet visible                             |
| Cliquer sur le "+" d'une compétence de carrière (ex: Cool)                          | Le rang augmente, l'XP est déduite         |
| Vérifier l'audit log : `flags.swerpg.logs`                                          | Une entrée `skill.train` est créée         |
| Vérifier les champs : `skillId`, `oldRank`, `newRank`, `cost`, `isCareer`, `isFree` | Tous les champs sont présents et cohérents |
| Vérifier `xpDelta` = -cost                                                          | Le delta correspond au coût négatif        |

### 2.2. Achat de rang hors carrière

| Action                                          | Résultat attendu                                 |
| ----------------------------------------------- | ------------------------------------------------ |
| Acheter un rang sur une compétence NON carrière | Le coût est plus élevé (rang × 5 + 5)            |
| Vérifier l'entrée `skill.train`                 | `isCareer` = false, le `cost` reflète le surcoût |

### 2.3. Rang gratuit (isFree)

| Action                                                           | Résultat attendu                                 |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| Utiliser un rang gratuit carrière sur une compétence de carrière | Le rang `careerFree` augmente, aucune XP déduite |
| Vérifier l'entrée `skill.train`                                  | `isFree` = true, `cost` = 0, `xpDelta` = 0       |

### 2.4. Oubli de rang (skill.forget)

| Action                                                     | Résultat attendu                     |
| ---------------------------------------------------------- | ------------------------------------ |
| Cliquer sur le "-" d'une compétence avec des rangs achetés | Le rang diminue, l'XP est remboursée |
| Vérifier l'audit log                                       | Une entrée `skill.forget` est créée  |
| Vérifier `xpDelta` positif                                 | Le montant remboursé est créditeur   |

---

## 3. Caractéristiques

### 3.1. Augmentation (characteristic.increase)

| Action                                                                   | Résultat attendu                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| Cliquer sur le "+" d'une caractéristique (ex: Brawn)                     | La valeur augmente, coût = nouvelle valeur × 10 XP |
| Vérifier l'audit log                                                     | Une entrée `characteristic.increase` est créée     |
| Vérifier les champs : `characteristicId`, `oldValue`, `newValue`, `cost` | Les données correspondent                          |
| Vérifier `xpDelta` = -cost                                               | Le delta est négatif (dépense)                     |

---

## 4. XP

### 4.1. Dépense d'XP (xp.spend)

| Action                                        | Résultat attendu                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Acheter une compétence ou une caractéristique | `system.progression.experience.spent` augmente                               |
| Vérifier l'audit log                          | Une entrée `xp.spend` peut être créée (si pas déjà couverte par skill.train) |

### 4.2. Gain d'XP (xp.grant)

| Action                                                                                            | Résultat attendu                                      |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Accorder de l'XP via un script : `actor.update({"system.progression.experience.gained": valeur})` | `gained` augmente                                     |
| Vérifier l'audit log                                                                              | Une entrée `xp.grant` est créée avec `amount` positif |
| Vérifier `xpDelta` = +amount                                                                      | Le delta est positif (gain)                           |

### 4.3. Remboursement d'XP (xp.refund)

| Action                        | Résultat attendu                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Oublier un rang de compétence | `spent` diminue du remboursement                                                   |
| Vérifier l'audit log          | Une entrée `xp.refund` est créée (si le changement XP est pur, sans skill associé) |

---

## 5. Détails

### 5.1. Changement d'espèce (species.set)

| Action                                          | Résultat attendu                       |
| ----------------------------------------------- | -------------------------------------- |
| Glisser une nouvelle espèce sur la fiche        | L'espèce est remplacée                 |
| Vérifier l'audit log                            | Une entrée `species.set` est créée     |
| Vérifier `data.oldSpecies` et `data.newSpecies` | Les valeurs avant/après sont correctes |

### 5.2. Changement de carrière (career.set)

| Action                                        | Résultat attendu                       |
| --------------------------------------------- | -------------------------------------- |
| Glisser une nouvelle carrière sur la fiche    | La carrière est remplacée              |
| Vérifier l'audit log                          | Une entrée `career.set` est créée      |
| Vérifier `data.oldCareer` et `data.newCareer` | Les valeurs avant/après sont correctes |

---

## 6. Avancement

### 6.1. Changement de niveau (advancement.level)

| Action                                                                     | Résultat attendu                         |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| Modifier `actor.update({"system.advancement.level": 2})` depuis la console | Le niveau change                         |
| Vérifier l'audit log                                                       | Une entrée `advancement.level` est créée |
| Vérifier `data.oldLevel` et `data.newLevel`                                | Les niveaux avant/après sont corrects    |

---

## 7. Talents

### 7.1. Achat de talent (talent.purchase)

| Action                                                                            | Résultat attendu                           |
| --------------------------------------------------------------------------------- | ------------------------------------------ |
| Ajouter un item de type `talent` au personnage (drag & drop depuis un compendium) | Le talent est ajouté                       |
| Vérifier l'audit log                                                              | Une entrée `talent.purchase` est créée     |
| Vérifier les champs : `talentId`, `talentName`, `cost`, `ranks`                   | Les données correspondent au talent ajouté |
| Vérifier `xpDelta` = -cost                                                        | Le delta est négatif (dépense)             |

### 7.2. Item non-talent ignoré

| Action                                                   | Résultat attendu                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| Ajouter un item de type `weapon` ou `gear` au personnage | L'item est ajouté                                                         |
| Vérifier l'audit log                                     | Aucune entrée `talent.purchase` créée (les items non-talent sont ignorés) |

---

## 8. Snapshot XP

### 8.1. Vérification du snapshot dans une entrée

| Action                                                              | Résultat attendu                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Effectuer une action qui génère un log (ex: acheter une compétence) | Une entrée est créée                                                                                                        |
| Inspecter `entry.snapshot` dans la console                          | Le snapshot contient : `xpAvailable`, `totalXpSpent`, `totalXpGained`, `careerFreeAvailable`, `specializationFreeAvailable` |
| Vérifier la cohérence                                               | `xpAvailable` = `totalXpGained` - `totalXpSpent` (ou valeur stockée)                                                        |

---

## 9. Limite et éviction FIFO

### 9.1. Taille max par défaut (500)

| Action                                                                                      | Résultat attendu                                            |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Remplir le log avec 500+ entrées (script : boucle d'update avec des modifications mineures) | Le log ne dépasse pas 500 entrées                           |
| Vérifier que les plus anciennes sont supprimées                                             | Les premières entrées (timestamp le plus bas) disparaissent |

### 9.2. Taille max configurable via setting

| Action                                                                                    | Résultat attendu                                                |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Modifier le setting : `game.settings.set("swerpg", "auditLogMaxEntries", 100)`            | La limite est abaissée à 100                                    |
| Déclencher une nouvelle entrée                                                            | Si le log a déjà 100+ entrées, les plus anciennes sont évincées |
| Restaurer la valeur par défaut : `game.settings.set("swerpg", "auditLogMaxEntries", 500)` | Limite restaurée                                                |

---

## 10. Résilience

### 10.1. Erreur d'écriture simulée

| Action                                                                                                           | Résultat attendu                                          |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| (Test indirect) Forcer une erreur en désactivant les permissions d'écriture sur l'acteur (via un module externe) | L'action utilisateur n'est PAS bloquée                    |
| Vérifier la console développeur                                                                                  | Un message `logger.error` est émis par le système d'audit |
| Vérifier la notification UI                                                                                      | `ui.notifications.warn` est affiché                       |
| Si l'utilisateur est GM : vérifier le message chuchoté                                                           | Un whisper GM est envoyé avec les détails de l'erreur     |

---

## 11. Scénario de bout en bout

| Action                                                      | Résultat attendu                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Créer un nouveau personnage `character`                     | La fiche s'ouvre                                                            |
| Appliquer une espèce (drag & drop)                          | Entrée `species.set` créée                                                  |
| Appliquer une carrière (drag & drop)                        | Entrée `career.set` créée                                                   |
| Appliquer une spécialisation (drag & drop)                  | Entrée `specialization.add` créée                                           |
| Acheter 3 rangs de compétence (dont 1 gratuit)              | 3 entrées `skill.train` créées                                              |
| Augmenter une caractéristique de 2→3                        | Entrée `characteristic.increase` créée                                      |
| Ajouter un talent (drag & drop)                             | Entrée `talent.purchase` créée                                              |
| Vérifier le nombre total d'entrées dans `flags.swerpg.logs` | Au moins 8 entrées (species + career + spec + 3 skills + carac + talent)    |
| Vérifier que `xpDelta` cumulé = `totalXpSpent` final        | La somme des `xpDelta` de toutes les entrées correspond à la dépense totale |

---

## 12. Export CSV

### 12.1. Bouton d'export dans la fenêtre de consultation

| Action                                                              | Résultat attendu                                   |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| Ouvrir la fenêtre du journal d'évolution depuis la fiche personnage | La fenêtre s'affiche avec les filtres habituels    |
| Vérifier la présence d'un bouton `Exporter` (icône download)        | Le bouton est visible dans l'en-tête de la fenêtre |
| Cliquer sur le bouton `Exporter`                                    | Un fichier CSV est téléchargé par le navigateur    |

### 12.2. Nom du fichier exporté

| Action                                                                                 | Résultat attendu                                                |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Exporter le journal d'un personnage nommé "Vara Kesh" dont le propriétaire est "Alice" | Le fichier téléchargé se nomme `vara_kesh_alice_YYYY-MM-DD.csv` |
| Exporter le journal d'un personnage sans propriétaire explicite                        | Le fichier téléchargé contient `unknown-player` dans son nom    |

### 12.3. Contenu du CSV

| Action                                                           | Résultat attendu                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Ouvrir le fichier CSV dans un tableur (Excel, LibreOffice)       | Les colonnes sont : timestamp, date, userName, type, typeLabel, description, xpDelta, actorName, playerName |
| Vérifier la première ligne de données                            | Les informations correspondent à la première entrée du journal (chronologie complète)                       |
| Vérifier que toutes les entrées sont présentes                   | Le nombre de lignes de données correspond au nombre total d'entrées dans `flags.swerpg.logs`                |
| Appliquer un filtre (ex: "Compétences") dans la UI puis exporter | Le CSV exporté contient TOUTES les entrées, pas seulement celles du filtre actif                            |

### 12.4. Cas aux limites

| Action                                                 | Résultat attendu                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Exporter le journal d'un personnage sans aucune entrée | Le CSV contient uniquement l'en-tête (aucune ligne de données)                                |
| Ouvrir le CSV dans un éditeur de texte                 | Les cellules contenant des virgules, guillemets ou sauts de ligne sont correctement échappées |
| Vérifier les colonnes xpDelta                          | Les valeurs numériques sont présentes (positives, négatives, ou zéro)                         |

---

## 13. Gap connu

Les entrées `specialization.remove` ne peuvent pas être testées facilement via l'UI car la suppression d'une
spécialisation n'est pas encore exposée dans l'interface.  
Les entrées `xp.remove` (diminution de `gained`) ne se produisent pas dans l'UI standard — uniquement via script direct.

---

## 14. Achats Market (item.purchase)

Tests du flux Market → Audit Log : chaque achat d'item via le Market doit créer une entrée `item.purchase`
dans `actor.flags.swerpg.logs`, envoyer un message chat, et apparaître dans le filtre `Purchases`.

### Prérequis spécifiques

- Market activé dans les settings système (`game.settings.get('swerpg', 'marketEnabled')` = true)
- Personnage `character` avec 500+ crédits
- Au moins un item achetable dans le compendium Market (arme, armure ou équipement)

---

### 14.1. Achat arme simple (item.purchase)

| Action                                                                                                         | Résultat attendu                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ouvrir le Market depuis la fiche personnage (bouton Market ou via `game.system.api.methods.openMarket(actor)`) | Fenêtre Market ouverte, catalogue d'items visible                                                        |
| Chercher "Blaster Pistol" (prix ~100 crédits)                                                                  | L'item apparaît dans la liste                                                                            |
| Cliquer "Acheter"                                                                                              | Notification succès ; solde crédits mis à jour (500 → 400)                                               |
| Exécuter dans la console F12 : `game.actors.getName("NomDuPJ").flags.swerpg.logs`                              | Le tableau contient une entrée `type: "item.purchase"`                                                   |
| Inspecter l'entrée `item.purchase`                                                                             | `data.itemName = "Blaster Pistol"`, `data.itemType = "weapon"`, `data.price = 100`, `creditDelta = -100` |
| Vérifier `snapshot`                                                                                            | `snapshot.creditsBefore = 500`, `snapshot.creditsAfter = 400`, `snapshot.creditsDelta = 100`             |
| Vérifier que l'item est dans l'inventaire du personnage                                                        | L'item apparaît dans les embedded documents de l'acteur                                                  |

### 14.2. Message chat après achat

| Action                        | Résultat attendu                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Effectuer un achat (cf. 14.1) | Un message chat apparaît dans le chat log                                                            |
| Inspecter le message chat     | `flags.swerpg.auditChat = true`, `flags.swerpg.auditType = "item.purchase"`                          |
| Vérifier la variante visuelle | Le message a la classe CSS `audit-entry--add` (variante verte)                                       |
| Vérifier le contenu           | Contient le nom de l'item et les montants de crédits (metaLeft = prix, metaRight = crédits restants) |

### 14.3. Achat armure

| Action                                               | Résultat attendu                                            |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Acheter une armure (ex: "Padded Armor", ~75 crédits) | Entrée `item.purchase` créée avec `data.itemType = "armor"` |
| Vérifier `creditDelta`                               | `-75` (négatif, représente une dépense)                     |

### 14.4. Achats multiples successifs

| Action                                             | Résultat attendu                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Achat #1 : Blaster Pistol (100 crédits, reste 400) | Entrée audit créée                                                       |
| Achat #2 : Vibroblade (75 crédits, reste 325)      | Deuxième entrée audit créée                                              |
| Vérifier `flags.swerpg.logs`                       | 2 entrées `item.purchase` dans le tableau, ordre chronologique croissant |
| Ouvrir Character Audit Log                         | 2 entrées visibles, ordre chronologique inversé (plus récent d'abord)    |
| Vérifier les `creditDelta` respectifs              | -100 et -75                                                              |
| Vérifier les `snapshot.creditsAfter`               | 400 puis 325                                                             |

### 14.5. Rejet achat (crédits insuffisants)

| Action                                 | Résultat attendu                                                |
| -------------------------------------- | --------------------------------------------------------------- |
| Personnage à 50 crédits                | Solde initial vérifié                                           |
| Tenter d'acheter un item à 100 crédits | Notification erreur "Insufficient credits" (ou équivalent i18n) |
| Vérifier `flags.swerpg.logs`           | **Aucune** nouvelle entrée `item.purchase` créée                |
| Vérifier l'inventaire                  | L'item n'est **pas** ajouté à l'inventaire                      |

### 14.6. Filtre "Purchases" dans Character Audit Log

| Action                                                       | Résultat attendu                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Effectuer 1 achat Market + 1 achat de rang de compétence     | 2 entrées de types différents dans les logs                    |
| Ouvrir Character Audit Log (bouton dans la fiche personnage) | La fenêtre s'ouvre avec le filtre "All" actif                  |
| Cliquer sur le filtre "Purchases"                            | Seule(s) les entrées `item.purchase` sont affichées            |
| Cliquer sur le filtre "Skills"                               | L'entrée `skill.train` est affichée, l'achat Market est masqué |
| Cliquer sur le filtre "All"                                  | Toutes les entrées sont à nouveau visibles                     |

### 14.7. Export CSV avec achats Market

| Action                                         | Résultat attendu                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Effectuer un achat Market                      | Entrée `item.purchase` dans les logs                                                                                     |
| Ouvrir Character Audit Log et cliquer "Export" | Un fichier CSV est téléchargé                                                                                            |
| Ouvrir le CSV dans un tableur                  | L'en-tête contient la colonne `creditDelta`                                                                              |
| Localiser la ligne `item.purchase`             | `creditDelta` = valeur négative (ex: `-100`), `type` = `item.purchase`, description contient le nom de l'item et le prix |
| Vérifier les autres colonnes                   | `xpDelta = 0` (les achats Market ne dépensent pas d'XP)                                                                  |

### 14.8. Persistance après rechargement

| Action                                    | Résultat attendu                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Effectuer un achat Market                 | Entrée créée dans `flags.swerpg.logs`                                                    |
| Recharger la page (F5 ou Ctrl+R)          | La page se reconnecte au monde                                                           |
| Inspecter `flags.swerpg.logs` de l'acteur | L'entrée `item.purchase` est **persistée** (les flags Foundry survivent au rechargement) |
| Ouvrir Character Audit Log                | L'entrée apparaît toujours dans la liste                                                 |

---

### 14.9. Checklist de validation

| Point              | Critère                                                                                | Statut |
| ------------------ | -------------------------------------------------------------------------------------- | ------ |
| Entrée audit créée | `flags.swerpg.logs` contient `type="item.purchase"` avec `itemId`, `itemName`, `price` | ✓/✗    |
| Snapshot crédits   | `snapshot.creditsBefore`, `creditsAfter`, `creditsDelta` cohérents                     | ✓/✗    |
| creditDelta        | `entry.creditDelta = -(price * quantity)`                                              | ✓/✗    |
| Message chat       | `flags.swerpg.auditChat = true`, `auditType = "item.purchase"`, variante `add` (verte) | ✓/✗    |
| Filtre UI          | Filtre "Purchases" isole les entrées, filtre "Skills" les masque                       | ✓/✗    |
| Export CSV         | Colonne `creditDelta` présente et valeur correcte, `xpDelta = 0`                       | ✓/✗    |
| Solde crédits      | Barre personnage mise à jour immédiatement après achat                                 | ✓/✗    |
| Persistance        | Entrée survit au rechargement de page                                                  | ✓/✗    |
| Rejet              | Achat refusé (crédits insuffisants) ne crée **pas** d'entrée audit                     | ✓/✗    |

Tous les 9 points doivent être ✓ pour valider la feature Audit Log Market Purchases.

**Date test** : **\_** **Testeur** : **\_** **Résultat** : ✓ PASS / ✗ FAIL

---

## 15. Vérification smoke rapide du flux complet (< 2 minutes)

**But** : Valider rapidement que le circuit Market → audit log → chat → filtrage → export fonctionne de bout en bout.

**Prérequis** :

- Personnage actif avec ≥ 500 crédits
- Market ouvert et chargé
- Console F12 disponible
- Character Audit Log accessible

| Étape | Action                                                                      | Résultat attendu                                                               |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | Ouvrir Market, acheter 1 item (ex : « Blaster Pistol » 100 crédits)         | Notification succès, solde mis à jour (500 → 400)                              |
| 2     | Exécuter en console : `game.actors.getName("NomDuPJ").flags.swerpg.logs[0]` | Entrée `type='item.purchase'`, `creditDelta=-100`, `snapshot.creditsAfter=400` |
| 3     | Aller au chat log et chercher le dernier message du Market                  | Message avec classe CSS `audit-entry--add` (fond vert), contient nom item      |
| 4     | Ouvrir Character Audit Log (bouton fiche personnage), filtrer « Purchases » | Seule l'entrée achat Market visible, autres entrées (skills, XP) masquées      |
| 5     | Cliquer « Exporter CSV »                                                    | Fichier CSV téléchargé, contient ligne `item.purchase` avec `creditDelta=-100` |

**Verdict** :

- Si toutes les étapes réussissent → flux complet OK
- Si une étape échoue → noter laquelle et relancer le test après correction

**Temps estimé** : 1–2 minutes
