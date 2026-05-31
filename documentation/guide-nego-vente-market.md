# Guide utilisateur — Négociation lors de la vente d'un item au Market

## Déclenchement

Quand un PJ vend un item depuis son inventaire via le Market, une boîte de dialogue de négociation apparaît **après la validation de vente initiale** (calcul du prix de base + choix de négocier ou non).

Le titre de la boîte indique alors **« Négocier le prix de vente »** (au lieu de « Négocier le prix d'achat »).

## Interface

![Dialogue de négociation vente](screenshot-nego-vente.png)

La boîte de dialogue contient :

1. **Nom de l'item** et son **prix d'origine** (prix de base calculé par le vendeur)
2. **Difficulté** (dépend de la rareté de l'item)
3. **Compétence de négociation** (au choix parmi les compétences disponibles)
4. **Rangs de succès** (nombre de succès nets obtenus au jet, de 0 à 6)
5. **Case à cocher Désastre** (à cocher si le jet a fait un Désastre)
6. **Prix de vente calculé** en temps réel selon les rangs saisis
7. **Bouton « Vendre à ce prix »** (confirme la vente au prix affiché)
8. **Bouton « Annuler »** (annule la vente)

## Outcomes de la négociation en mode vente

Le prix de revente final dépend du résultat de la négociation :

| Outcome                 | Condition                                                | Fraction du prix de base | Prix pour un item à 1000 crédits |
| ----------------------- | -------------------------------------------------------- | ------------------------ | -------------------------------- |
| **Échec** (failure)     | 0 succès, pas de désastre                                | 25 %                     | 250 crédits                      |
| **Succès** (success)    | 1 à 3 succès, pas de désastre                            | 50 %                     | 500 crédits                      |
| **Triomphe** (triumph)  | 4 succès ou plus, pas de désastre                        | 75 %                     | 750 crédits                      |
| **Désastre** (disaster) | Case désastre cochée (quel que soit le nombre de succès) | 10 %                     | 100 crédits                      |

### Détail des outcomes

**Échec** — Le PJ n'obtient pas de meilleur prix que l'offre de base (25 %). Il peut soit accepter ce montant, soit annuler la vente.

**Succès** — Le PJ obtient un prix correct (50 %). C'est le résultat le plus courant.

**Triomphe** — Le PJ obtient un prix exceptionnel (75 %). Déclenché automatiquement quand le nombre de succès nets est ≥ 4. Pas besoin de case à cocher spécifique.

**Désastre** — La négociation tourne très mal. Le prix chute à 10 % de la valeur de base. Le joueur doit cocher manuellement la case « Désastre » si le jet de dés a produit un Désastre.

## Interactions clés

- **Modifier les rangs** → le prix se met à jour en temps réel (re-rendu automatique)
- **Changer la compétence** → la difficulté reste la même (déterminée par la rareté), seul le label de compétence change
- **Cocher Désastre** → le résultat passe immédiatement à désastre, le prix chute à 10 %
- **Confirmer** → la vente est exécutée au prix négocié, l'item est supprimé de l'inventaire, les crédits sont crédités
- **Annuler** → la vente n'a pas lieu, l'item reste dans l'inventaire

## Notes techniques (pour testeurs)

- Le seuil de Triomphe est fixé à **4 rangs de succès** (`TRIUMPH_THRESHOLD = 4` dans `negotiation-dialog.mjs`)
- Les fractions de revente sont définies dans `sell-valuation.mjs` :
  - `SELL_BASE_FRACTION = 0.25`
  - `SELL_NEGOTIATED_FRACTION = 0.5`
  - `SELL_MAX_FRACTION = 0.75`
  - `SELL_DISASTER_FRACTION = 0.1`
- Le prix final est **arrondi à l'entier inférieur** (`Math.floor`)
- Aucune modification de schéma persistant : le flux de vente existant (`#onSellItem`) est enrichi sans rupture

## Tests de non-régression

- Le mode achat existant n'est pas impacté : le paramètre `forSale` est optionnel et par défaut à `false`
- Les tests unitaires (11 tests) couvrent tous les outcomes et les fractions associées

## Questions fréquentes

**Q : Puis-je obtenir un Triomphe sans cocher de case ?**
R : Oui. Dès que vous saisissez 4 rangs de succès ou plus, l'outcome passe automatiquement à « triomphe » (75 %).

**Q : Que se passe-t-il si je coche Désastre avec 4 succès ?**
R : Le Désastre l'emporte. Le prix tombe à 10 %, même avec un nombre élevé de succès.

**Q : Puis-je négocier sans jeter les dés ?**
R : Oui. Les champs sont saisis manuellement pour simuler le résultat du jet. C'est un dialogo de saisie, pas un lanceur de dés.

**Q : La vente est-elle irréversible après confirmation ?**
R : Oui. Une fois « Vendre à ce prix » cliqué, l'item est supprimé et les crédits ajoutés. L'opération est tracée dans le journal d'audit.
