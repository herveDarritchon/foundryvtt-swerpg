# Issue #534 — Market UI : états vides illustrés, loader de catalogue, signalement hors budget, suppression CSS mort

**Issue** : https://github.com/herveDarritchon/foundryvtt-swerpg/issues/534  
**Domaine métier** : `market`

**Dépend sur** : [#523 — Market UI : Variabiliser toute la palette `market.less` sur le design system](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/523)

## Goal

Finaliser le polish du catalogue Market avec des états vides plus guidants, un habillage de chargement discret pendant les reconstructions asynchrones, un signal visuel net des items hors budget, et un nettoyage strictement factuel du CSS réellement mort, sans changer la logique métier d’achat/vente.

## Contexte utile

- L’issue fusionne des constats d’audit `UX10`, `UX11` et `UX16` issus de `documentation/audit/market/audit-ui-ux-market.md`.
- Le catalogue achat est rendu par `templates/market/market.hbs`, alimenté par `module/applications/market/market-application.mjs`, et restylé dans `styles/market.less`.
- `market-application.mjs` rerender déjà le catalogue à chaque saisie / changement de filtre ; le loader doit donc traiter un état transitoire de reconstruction sans introduire de race conditions visuelles.
- Le code courant expose déjà `entry.canBuy`, `buyBlockedReason`, `priceStateClass` et les compteurs/états de filtre ; le plan peut capitaliser dessus pour distinguer les lignes hors budget sans toucher au moteur métier.
- Le nettoyage CSS doit être requalifié sur l’état actuel du code : l’audit a depuis été partiellement dépassé (`.is-active` est maintenant branché dans le template) et la correction factuelle de l’audit indique que `--color-cool-*` ne doit être supprimé que si son inutilité est prouvée.
- `tests/applications/market/market-application.test.mjs` couvre déjà les états `isEmpty`, `isFilteredEmpty`, `canBuy`, `buyBlockedReason` et le view-model prix ; c’est l’ancrage naturel pour verrouiller la non-régression.

## Plan d’implémentation

### Étape 1 — Formaliser les états UI transitoires et d’accessibilité du catalogue

**Fichiers** : `module/applications/market/market-application.mjs`, `tests/applications/market/market-application.test.mjs`

**What** :

- Introduire un petit state UI explicite pour le catalogue achat : chargement en cours, type d’état vide à afficher, et état de finançabilité par ligne exploitable sans logique supplémentaire dans le template.
- Encadrer la reconstruction asynchrone du catalogue pour pouvoir afficher un loader/skeleton discret pendant les rerenders déclenchés par recherche, filtres ou changement de marché.
- Ajouter des tests ciblés sur ce contrat de contexte pour verrouiller : état vide catalogue, état vide filtré, item hors budget, et absence de régression sur `canBuy` / `buyBlockedReason`.

**Résultat attendu** : le template reçoit un contrat UI complet pour loader, empty states et hors-budget, sans calcul implicite embarqué côté Handlebars.

### Étape 2 — Remplacer les messages vides bruts par des états illustrés avec CTA utiles

**Fichiers** : `templates/market/market.hbs`, `lang/en.json`, `lang/fr.json`

**What** :

- Remplacer les simples `<p class="market-empty">` par un bloc d’état vide illustré, cohérent avec l’identité Market et compatible avec lecteur d’écran.
- Distinguer au moins les 2 cas demandés par l’issue : catalogue réellement vide vs aucun résultat après recherche / filtrage.
- Ajouter un CTA contextualisé en réutilisant les actions déjà naturelles du flux (par exemple reset des filtres pour l’état filtré), sans inventer une nouvelle logique métier ni un nouveau parcours GM.

**Résultat attendu** : l’utilisateur comprend immédiatement pourquoi la liste est vide et quelle action simple tenter ensuite.

### Étape 3 — Afficher le loader discret et signaler clairement les lignes hors budget

**Fichiers** : `templates/market/market.hbs`, `styles/market.less`

**What** :

- Ajouter dans le template un skeleton/loader léger réservé au temps de reconstruction du catalogue, sans bloquer durablement la toolbar ni masquer les focus visibles.
- Rendre les items hors budget immédiatement identifiables : ligne atténuée, hover/cursor adaptés, prix teinté via token sémantique de danger, en complément du bouton déjà désactivé.
- Veiller à ce que le signal hors budget ne repose pas uniquement sur la couleur et reste compatible avec les variantes visuelles du Market.

**Résultat attendu** : la reconstruction du catalogue paraît intentionnelle et les items non achetables sont détectables au premier coup d’œil.

### Étape 4 — Nettoyer le CSS mort réel et verrouiller le périmètre

**Fichiers** : `styles/market.less` _(et uniquement les fichiers Market directement concernés si un hook mort doit être retiré proprement)_

**What** :

- Requalifier les règles et variables supposées mortes à partir du code courant avant suppression ; ne retirer que le CSS/les hooks effectivement inutilisés après les tickets UI déjà passés.
- Ne pas supprimer aveuglément `--color-cool-*` ni `.is-active` si ces éléments sont encore valides, câblés ou fournis par Foundry Core / le template actuel.
- Garder le nettoyage strictement local au Market et sans refactor cosmétique élargi hors besoin prouvé.

**Résultat attendu** : la dette CSS visée par l’issue baisse réellement, sans casser des styles désormais vivants ni introduire de régression silencieuse.

### Étape 5 — Validation ciblée

**Fichiers** : aucun nouveau fichier requis

**What** :

- Vérifier la cohérence visuelle des 4 cas clés : catalogue vide, recherche sans résultat, reconstruction en cours, item hors budget.
- Vérifier qu’aucune régression n’apparaît sur les filtres actifs, le compteur de résultats, le toggle buy/sell et les états prix déjà livrés.
- Prévoir la validation finale par `pnpm run build` et une revue visuelle ciblée du Market.

## Périmètre / hors périmètre

### Inclus

- États vides illustrés du catalogue achat
- CTA contextuels minimaux
- Loader/skeleton discret pendant la reconstruction du catalogue
- Signalement visuel des items hors budget
- Nettoyage factuel du CSS mort réellement prouvé
- Tests ciblés sur le contrat UI Market

### Exclus

- Changement du moteur métier de prix, d’éligibilité, d’achat, de vente ou de négociation
- Refonte globale de l’application Market hors points ciblés par l’issue
- Suppression spéculative de tokens/sélecteurs non prouvée par le code courant
