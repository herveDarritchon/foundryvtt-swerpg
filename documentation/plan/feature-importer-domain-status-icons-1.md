---
goal: Ajout d'icônes de statut par domaine dans Import Statistics (succès / mixte / erreurs / en attente)
version: 1.0
date_created: 2025-11-15
last_updated: 2025-11-15
owner: importer-ui
status: 'Planned'
tags: ['feature', 'importer', 'ui', 'accessibility', 'performance', 'a11y']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ajouter en début de ligne de chaque domaine dans la table « Import Statistics » un indicateur graphique reflétant l'état d'import du domaine: gris tant que non traité ou partiellement traité, vert si 100% importé sans rejet, jaune si mixte (au moins un rejet mais des succès), rouge si uniquement des rejets (aucun succès). Icônes doivent être accessibles (aria-label), non intrusives et calculées de façon déterministe dans le contexte sans logique dans le template. Zero ambiguïté, impact O(nDomaines) négligeable.

## 1. Requirements & Constraints

- **REQ-001**: Chaque ligne domaine dans `Import Statistics` doit commencer par une cellule status contenant une icône et un label caché accessible.
- **REQ-002**: Statuts définis: `pending`, `success`, `mixed`, `error` avec mapping couleur: gris, vert, jaune, rouge.
- **REQ-003**: Calcul statut basé uniquement sur triplet `{total, imported, rejected}` et invariant: `imported + rejected <= total`.
- **REQ-004**: `success` si `total > 0` ET `imported === total` ET `rejected === 0`.
- **REQ-005**: `error` si `total > 0` ET `imported === 0` ET `rejected === total`.
- **REQ-006**: `mixed` si `imported > 0` ET `rejected > 0` ET `imported + rejected === total`.
- **REQ-007**: `pending` sinon (inclut case initiale ou import partiel où `imported + rejected < total`).
- **REQ-008**: Aucun changement des clés existantes de stats; ajouter structure dérivée `importDomainStatus` dans le contexte (objet par domaine `{code, labelI18n, class}`).
- **REQ-009**: Icône doit avoir contraste >= 3:1 sur fond; utiliser variables LESS système.
- **REQ-010**: A11y: `aria-label` doit contenir traduction claire du statut (`SETTINGS.OggDudeDataImporter.loadWindow.stats.status.success` etc.).
- **REQ-011**: Test unitaire doit vérifier mapping pour chaque cas et classe CSS présence.
- **REQ-012**: Pas de dépendance npm additionnelle; utilisation d'icônes FontAwesome déjà présentes (`fa-circle` ou spécifique).
- **REQ-013**: Code pur fonctionnel pour calcul (pas d'effet secondaire); couvert par tests Vitest.
- **SEC-001**: Aucun nouvel accès fichiers; données seulement in-memory.
- **CON-001**: Ne pas casser structure tableau existante (ajout d'une colonne supplémentaire en première position). En-têtes mis à jour.
- **GUD-001**: Suivre instructions `a11y.instructions.md` (focus, rôle img, aria-label).
- **PAT-001**: Respect ApplicationV2 + Handlebars; logique dans `_prepareContext`, pas dans template.
- **PERF-001**: Calcul de statut en O(nDomaines) à chaque render; nDomaines faible (<15) accepté.
- **I18N-001**: Ajouter 4 nouvelles clés de traduction statut EN/FR.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Calcul & exposition des statuts domaine dans contexte.

| Task     | Description                                                                                                                               | Completed | Date       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-001 | Créer fonction pure `computeDomainStatus({total, imported, rejected})` retournant code parmi pending/success/mixed/error                  | ✅        | 2025-11-15 |
| TASK-002 | Ajouter méthode statique ou fonction interne dans `OggDudeDataImporter.mjs` pour itérer domaines et construire objet `importDomainStatus` | ✅        | 2025-11-15 |
| TASK-003 | Injecter `importDomainStatus` dans retour `_prepareContext` avec structure `{ armor: {...}, weapon: {...}, ... }`                         | ✅        | 2025-11-15 |

### Implementation Phase 2

- GOAL-002: Adapter template pour afficher colonne statut.

| Task     | Description                                                                                                                                                                              | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-004 | Ajouter entête colonne avant « Domain »: label i18n `SETTINGS.OggDudeDataImporter.loadWindow.stats.status.title`                                                                         | ✅        | 2025-11-15 |
| TASK-005 | Ajouter cellule `<td class="domain-status {{importDomainStatus.armor.class}}" aria-label="{{localize importDomainStatus.armor.labelI18n}}">` avec icône conditionnelle pour chaque ligne | ✅        | 2025-11-15 |
| TASK-006 | Utiliser icône FontAwesome: `fa-circle` + style couleur via classe; éviter inline style                                                                                                  | ✅        | 2025-11-15 |
| TASK-007 | S'assurer que l'ordre des cellules reste cohérent (status, domain, total, imported, rejected, duration)                                                                                  | ✅        | 2025-11-15 |

### Implementation Phase 3

- GOAL-003: Styling & accessibilité.

| Task     | Description                                                                                                                       | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-008 | Ajouter classes CSS: `.domain-status--pending`, `--success`, `--mixed`, `--error` dans `styles/components/importer.less`          | ✅        | 2025-11-15 |
| TASK-009 | Couleurs: pending=fade(@color-light,30%), success=@color-success, mixed=@color-accent, error=#c62828 (ou variable rouge si dispo) | ✅        | 2025-11-15 |
| TASK-010 | Ajouter règle `td.domain-status { width: 1.2rem; text-align: center; }`                                                           | ✅        | 2025-11-15 |
| TASK-011 | Vérifier contraste >= 3:1 (manuel: utiliser couleurs existantes haute visibilité)                                                 | ✅        | 2025-11-15 |
| TASK-012 | Ajouter style focus si statut cliquable (non cliquable ici, donc aucun tabindex)                                                  | ✅        | 2025-11-15 |

### Implementation Phase 4

- GOAL-004: Tests de validation.

| Task     | Description                                                                                                  | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-013 | Étendre `OggDudeDataImporter.context.spec.mjs` pour tester `computeDomainStatus` sur jeux de données (4 cas) | ✅        | 2025-11-15 |
| TASK-014 | Ajouter tests template: vérifier présence colonne header et classes par ligne                                | ✅        | 2025-11-15 |
| TASK-015 | Ajouter test accessibilité: chaque cellule a `aria-label` correct (utiliser i18n stub)                       | ✅        | 2025-11-15 |
| TASK-016 | Vérifier absence de colonne si stats absentes (hasStats false)                                               | ✅        | 2025-11-15 |

### Implementation Phase 5

- GOAL-005: Documentation & i18n.

| Task     | Description                                                                                         | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-017 | Ajouter clés EN: `status.title`, `status.pending`, `status.success`, `status.mixed`, `status.error` | ✅        | 2025-11-15 |
| TASK-018 | Ajouter clés FR équivalentes                                                                        | ✅        | 2025-11-15 |
| TASK-019 | Mettre à jour `DEVELOPMENT_PROCESS.md` section Importer (sous-section Statuts domaine)              | ✅        | 2025-11-15 |
| TASK-020 | Ajouter commentaires JSDoc sur `computeDomainStatus` (règles / invariants)                          | ✅        | 2025-11-15 |

## 3. Alternatives

- **ALT-001**: Calcul dynamique dans template via helpers Handlebars (rejetté: logique dispersée, moins testable).
- **ALT-002**: Icônes SVG inline différentes (rejetté: surcharge markup et nécessité assets supplémentaires).

## 4. Dependencies

- **DEP-001**: Fichier `module/settings/OggDudeDataImporter.mjs` pour injection des statuts.
- **DEP-002**: Template `templates/settings/oggDudeDataImporter.hbs` pour colonne supplémentaire.
- **DEP-003**: Styles `styles/components/importer.less` pour classes couleur.
- **DEP-004**: Fichiers i18n `lang/en.json` & `lang/fr.json` pour labels statut.

## 5. Files

- **FILE-001**: `module/settings/OggDudeDataImporter.mjs` – ajout fonction & contexte.
- **FILE-002**: `templates/settings/oggDudeDataImporter.hbs` – ajout colonne icône.
- **FILE-003**: `styles/components/importer.less` – nouvelles classes status.
- **FILE-004**: `tests/settings/OggDudeDataImporter.context.spec.mjs` – tests du calcul.
- **FILE-005**: `tests/settings/oggDudeDataImporter.template.spec.mjs` – tests rendu icônes.
- **FILE-006**: `DEVELOPMENT_PROCESS.md` – documentation statuts.

## 6. Testing

- **TEST-001**: `computeDomainStatus({0,0,0})` => pending.
- **TEST-002**: `computeDomainStatus({10,10,0})` => success.
- **TEST-003**: `computeDomainStatus({10,0,10})` => error.
- **TEST-004**: `computeDomainStatus({10,7,3})` => mixed.
- **TEST-005**: Template rendu success => classe `.domain-status--success` présente.
- **TEST-006**: Accessibilité: cellule a `aria-label` égal à traduction.
- **TEST-007**: Performance: pas de re-calcul hors render (spy sur fonction si nécessaire).
- **TEST-008**: hasStats false => colonne non rendue.

## 7. Risks & Assumptions

- **RISK-001**: Ajout colonne peut casser tests existants cherchant index colonne; mitigation: adapter tests en conséquence.
- **RISK-002**: Couleurs choisies peuvent manquer contraste sur certains thèmes; mitigation: utiliser variables système haute visibilité.
- **RISK-003**: Erreur logique si invariants non respectés (ex imported+rejected>total); mitigation: clamp et log warning.
- **ASSUMPTION-001**: FontAwesome disponible (déjà utilisé dans projet).
- **ASSUMPTION-002**: Nombre de domaines fixe connu (armor, weapon, gear, species, career, talent).

## 8. Related Specifications / Further Reading

- `plan/feature-oggdude-importer-immersive-ui-1.md`
- `.github/instructions/a11y.instructions.md`
- `.github/instructions/performance-optimization.instructions.md`
- `.github/instructions/security-and-owasp.instructions.md`
