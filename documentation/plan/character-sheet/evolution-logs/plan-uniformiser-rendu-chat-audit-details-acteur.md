# Plan de refactor : uniformiser le rendu chat des changements d'espece, carriere et specialisation

## Contexte

Le pipeline actuel des messages de chat d'audit est centralise, mais le rendu des changements d'espece, de carriere et de specialisation n'est pas adapte a la nature de ces donnees.

Fichiers concernes dans l'existant :

- `module/utils/audit-diff.mjs`
- `module/utils/audit-log.mjs`
- `templates/chat/audit-entry.hbs`
- `styles/chat.less`
- `module/applications/character-audit-log.mjs`
- `tests/utils/audit-log.test.mjs`

Constat principal : le meme template est reutilise pour plusieurs types de messages, mais `species.set` et `career.set` injectent une chaine longue de type `ancienne valeur -> nouvelle valeur` dans un badge visuel concu pour un contenu court. Le message de specialisation parait plus propre surtout parce que sa valeur est plus courte, pas parce qu'il utilise une meilleure structure.

## Etat actuel

- `module/utils/audit-diff.mjs` detecte correctement les changements metier :
  - `species.set`
  - `career.set`
  - `specialization.add`
  - `specialization.remove`
- `module/utils/audit-log.mjs` construit le contexte de rendu via `_buildChatContext(actor, entry)`.
- `templates/chat/audit-entry.hbs` est le template unique utilise pour les messages d'audit.
- `styles/chat.less` repose encore sur une structure issue d'un composant de type `skill transaction`.
- `tests/utils/audit-log.test.mjs` verifie l'emission du message, mais pas la qualite du view-model de rendu ni la structure visuelle.

## Probleme a corriger

Le bug de rendu vient du couple `view-model + template + CSS`, pas des donnees d'audit elles-memes.

Constats :

- `audit-entry.hbs` affiche `changeText` dans `.skill-transaction__rank`.
- Pour `species.set` et `career.set`, `_buildChatContext(...)` y injecte `oldValue -> newValue`.
- Pour `specialization.add`, `_buildChatContext(...)` n'injecte qu'un nom de specialisation, donc le rendu tient mieux.
- `.skill-transaction__rank` utilise un layout adapte a un badge court : pas de largeur max utile, pas de structure semantique pour separer ancienne et nouvelle valeur.
- Les cas `species.set` et `career.set` n'activent pas une presentation plus detaillee et forcent trop d'information dans la premiere ligne.

## Objectif

Uniformiser les messages de chat d'audit de modification d'acteur autour d'un composant unique, capable d'afficher proprement :

- un libelle d'evenement ;
- une ancienne valeur optionnelle ;
- une nouvelle valeur mise en avant ;
- des metadonnees optionnelles ;
- des variantes visuelles legeres selon le type d'evenement.

## Etat cible

Tous les messages d'audit de changement d'acteur doivent partager :

- un header stable avec avatar, nom d'acteur et libelle ;
- un body stable avec ancienne valeur discrete et nouvelle valeur mise en avant ;
- un footer optionnel pour les informations secondaires ;
- aucune chaine longue metier injectee dans un badge lateral non contraint ;
- une seule structure de template, avec variantes de rendu minimales.

## Fichiers affectes

| Fichier | Type de changement | Notes |
| --- | --- | --- |
| `module/utils/audit-log.mjs` | modification | faire evoluer le contrat de `_buildChatContext(...)` |
| `templates/chat/audit-entry.hbs` | modification | aligner la structure HTML sur le nouveau view-model |
| `styles/chat.less` | modification | introduire une structure visuelle adaptee aux changements de details |
| `module/applications/character-audit-log.mjs` | optionnel | seulement si un alignement des libelles devient utile |
| `tests/utils/audit-log.test.mjs` | modification | verifier le nouveau contexte passe au template |
| `tests/utils/audit-diff.test.mjs` | probablement inchange | les donnees metier semblent deja suffisantes |

## Structure HTML cible

```html
<article class="swerpg chat-message audit-entry audit-entry--change">
  <header class="audit-entry__header">
    <img class="audit-entry__avatar" src="{{actorImg}}" alt="{{actorName}}">
    <div class="audit-entry__meta">
      <span class="audit-entry__actor">{{actorName}}</span>
      <span class="audit-entry__label">{{eventLabel}}</span>
    </div>
  </header>

  <div class="audit-entry__body">
    {{#if previousValue}}
    <div class="audit-entry__previous" title="{{previousValue}}">
      {{previousValue}}
    </div>
    {{/if}}

    <div class="audit-entry__change">
      {{#if previousValue}}
      <span class="audit-entry__arrow">-></span>
      {{/if}}
      <span class="audit-entry__badge" title="{{nextValue}}">
        {{nextValue}}
      </span>
    </div>

    {{#if description}}
    <div class="audit-entry__description">
      {{description}}
    </div>
    {{/if}}
  </div>

  {{#if hasMeta}}
  <footer class="audit-entry__footer">
    {{#if metaLeft}}
    <span class="audit-entry__meta-left">{{metaLeft}}</span>
    {{/if}}
    {{#if metaRight}}
    <span class="audit-entry__meta-right">{{metaRight}}</span>
    {{/if}}
  </footer>
  {{/if}}
</article>
```

## Classes CSS cibles

- `.audit-entry`
- `.audit-entry--change`
- `.audit-entry--add`
- `.audit-entry--remove`
- `.audit-entry--gain`
- `.audit-entry--fail`
- `.audit-entry__header`
- `.audit-entry__avatar`
- `.audit-entry__meta`
- `.audit-entry__actor`
- `.audit-entry__label`
- `.audit-entry__body`
- `.audit-entry__previous`
- `.audit-entry__change`
- `.audit-entry__arrow`
- `.audit-entry__badge`
- `.audit-entry__description`
- `.audit-entry__footer`
- `.audit-entry__meta-left`
- `.audit-entry__meta-right`

## Regles CSS cibles

- `min-width: 0` sur les colonnes textuelles ;
- structure `grid` ou `flex` avec zones explicites ;
- `max-width: 100%` sur le badge ;
- `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` sur les valeurs longues a une ligne ;
- retour a la ligne reserve a la description secondaire, pas au badge principal ;
- alignement vertical stable entre avatar et contenu ;
- variantes visuelles legeres par type sans dupliquer le composant.

## Plan d'implementation

### Phase 1 - Contrat et view-model

- [ ] Refondre `_buildChatContext(...)` dans `module/utils/audit-log.mjs` pour produire un contrat de rendu generique.
- [ ] Separater explicitement :
  - `eventLabel`
  - `previousValue`
  - `nextValue`
  - `description`
  - `metaLeft`
  - `metaRight`
  - `variant`
- [ ] Traiter `species.set`, `career.set`, `specialization.add`, `specialization.remove` comme des cas de changement de details, et non comme des badges de rang.
- [ ] Verifier que les cas espece/carriere/specialisation ne remplissent plus un unique champ `changeText` long.

### Phase 2 - Harmonisation du template

- [ ] Remplacer la structure actuelle de `templates/chat/audit-entry.hbs` par un template generique de type `audit-entry`.
- [ ] Prevoir les sections optionnelles :
  - ancienne valeur ;
  - badge de nouvelle valeur ;
  - description secondaire ;
  - footer de metadonnees.
- [ ] Conserver un seul template commun pour eviter des implementations divergentes.
- [ ] Verifier que le template rend proprement un changement d'espece, de carriere et de specialisation avec le meme squelette HTML.

### Phase 3 - Harmonisation CSS

- [ ] Introduire des classes generiques `audit-entry__*` dans `styles/chat.less`.
- [ ] Gérer les cas longs avec ellipsis et largeur contrainte.
- [ ] Creer des variantes visuelles sobres par type sans casser les autres messages systeme.
- [ ] Conserver le ton visuel de reference du message le plus reussi, sans refonte globale du chat.
- [ ] Verifier l'absence d'overflow horizontal en panneau de chat etroit.

### Phase 4 - Tests

- [ ] Mettre a jour `tests/utils/audit-log.test.mjs` pour verifier le nouveau contexte transmis a `renderTemplate`.
- [ ] Ajouter des assertions specifiques sur `species.set`, `career.set` et `specialization.add` :
  - `previousValue` correctement renseigne ;
  - `nextValue` correctement renseigne ;
  - `variant` correct ;
  - absence de chaine longue concatenee dans un seul champ de badge.
- [ ] Laisser `tests/utils/audit-diff.test.mjs` inchange sauf si une donnee metier manque reellement.
- [ ] Verifier les tests cibles avec `pnpm vitest run tests/utils/audit-log.test.mjs tests/utils/audit-diff.test.mjs`.

### Phase 5 - Validation manuelle UX

- [ ] Verifier dans Foundry un changement d'espece avec un nom long.
- [ ] Verifier un changement de carriere avec un nom long.
- [ ] Verifier ajout et retrait de specialisation.
- [ ] Verifier une largeur reduite du panneau chat.
- [ ] Verifier la lisibilite en theme sombre.
- [ ] Verifier qu'un message skill ou talent existant n'a pas regresse visuellement.

## Risques de regression

- Les messages skills et talents utilisent aujourd'hui le meme composant ; une refonte trop brutale du template peut degrader les cas compacts.
- Un renommage total des classes CSS peut casser le style existant si la migration n'est pas faite proprement.
- Les cas `failed` ou `xp.*` peuvent necessiter une variante plus textuelle que badge-only.
- Les tests actuels couvrent surtout l'emission du message, pas la qualite semantique du contexte de rendu.

## Recommandation technique

Conserver un template commun, mais faire evoluer son contrat pour qu'il cesse de se comporter comme un ancien composant de type `skill transaction`.

Le composant doit devenir un vrai `audit-entry`, avec une responsabilite claire :

- distinguer le libelle d'evenement ;
- distinguer l'ancienne valeur ;
- distinguer la nouvelle valeur mise en avant ;
- isoler les metadonnees et informations secondaires.

## Definition de done

- [ ] Les changements d'espece, de carriere et de specialisation utilisent un rendu commun et lisible.
- [ ] Aucune chaine longue metier n'est injectee dans un badge lateral non adapte.
- [ ] Le template d'audit reste unique et factorise.
- [ ] Le layout ne deborde pas en largeur reduite du panneau chat.
- [ ] Les tests de `audit-log` couvrent le nouveau contrat de rendu.
- [ ] Les messages de skill et autres messages compacts n'ont pas regressé visuellement.
