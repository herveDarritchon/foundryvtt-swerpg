# Character Sheet — Prévenir doublons et dépassements dans le sélecteur de bonus Obligation

**Issue** : [#659 — Prévenir doublons et dépassements dans le sélecteur de bonus Obligation](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/659)
**Domaine métier** : `character-sheet/obligation`

## Objectif

Empêcher le parcours guidé de bonus d’Obligation de proposer ou confirmer une option déjà prise ou hors plafond, tout en conservant les erreurs globales de conformité pour les états legacy, importés ou modifiés hors du flux standard.

## Contexte utile

- `documentation/plan/character-sheet/obligation/658-ajouter-un-selecteur-guide-pour-prendre-un-bonus-officiel-d-obligation.md` pose déjà le sélecteur guidé et l’exposition des options officielles côté UI.
- L’issue `#659` durcit ce parcours : les erreurs doivent être évitées avant confirmation, pas seulement diagnostiquées après coup.
- Les critères d’acceptation distinguent bien deux niveaux : prévention locale dans le sélecteur, puis maintien du diagnostic global pour les données non conformes préexistantes.

## Plan d'implémentation

### Étape 1 — Canoniser les états de disponibilité du sélecteur

**Fichiers** : `module/lib/obligations/obligation-bonus-calculator.mjs`, `module/models/character.mjs`, `module/applications/sheets/character-sheet.mjs`, `tests/lib/obligations/obligation-bonus-calculator.test.mjs`, `tests/applications/sheets/character-sheet-commitments.test.mjs`

**What** :

- faire porter par l’état dérivé des bonus une distinction explicite entre `available`, `already-selected` et `over-cap`, avec raison localisable et booléen de confirmation autorisée ;
- conserver séparément les erreurs globales de conformité pour les combinaisons legacy afin qu’un état invalide existant reste visible sans polluer le chemin nominal ;
- verrouiller par tests ciblés les cas limites de doublon, de dépassement du plafond restant et de combinaison encore autorisée.

**Résultat attendu** : le runtime fournit au sélecteur un contrat simple et sûr, suffisant pour interdire préventivement les choix invalides sans perdre le diagnostic legacy.

### Étape 2 — Verrouiller l’UX de sélection et de confirmation

**Fichiers** : `module/applications/sheets/character-sheet.mjs`, `templates/sheets/actor/character-commitments.hbs`, `module/applications/sheets/obligation.mjs` ou application/dialog du sélecteur, `lang/en.json`, `lang/fr.json`, `tests/applications/sheets/character-sheet-commitments.test.mjs`, `tests/applications/sheets/obligation-sheet.test.mjs`

**What** :

- afficher chaque option avec son état localisé et accessible, en désactivant explicitement celles déjà prises ou hors plafond avec explication claire ;
- empêcher la validation d’une option indisponible, y compris si l’utilisateur tente de contourner le disabled via un état UI incohérent ;
- maintenir l’affichage des erreurs globales de conformité pour les obligations bonus déjà invalides présentes sur l’acteur.

**Résultat attendu** : le joueur ne peut plus créer naturellement un doublon ni dépasser le plafond via le sélecteur, tout en gardant un feedback utile sur les données non conformes héritées.

## Périmètre / hors périmètre

### Inclus

- indisponibilité préventive des options déjà prises
- indisponibilité préventive des options hors plafond restant
- raisons d’indisponibilité localisées et accessibles
- maintien du diagnostic global pour états legacy non conformes

### Exclus

- création initiale du sélecteur guidé déjà cadrée par l’issue `#658`
- harmonisation globale de toute la microcopy/accessibilité du workflow Obligation au-delà des états du sélecteur
- évolution des règles métier officielles des bonus d’Obligation
