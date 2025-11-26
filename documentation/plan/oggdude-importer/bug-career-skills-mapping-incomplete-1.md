---
purpose: bug
domain: oggdude-importer
feature: career-skills-mapping-incomplete
version: 1
status: draft
created: 2025-11-20
updated: 2025-11-20
tags:
  - oggdude
  - import
  - career
  - skills
  - mapping
  - bug-fix
related-specs:
  - /documentation/spec/oggdude-importer/bug-career-import-data-needs-1.0.md
---

# Plan d'implémentation : Complétion du mapping des compétences de carrières OggDude

## 1. Résumé exécutif

### Problème identifié

L'importeur OggDude des carrières ne mappe pas correctement tous les codes de compétences présents dans les fichiers XML des carrières. Plusieurs codes (`COORD`, `CORE`, `COOL`, `BRAWL`, `MELEE`, `RANGLT`, `RANGHVY`, `GUNN`, `ASTRO`, `PILOTPL`, `PILOTSP`, `MECH`, `MED`, `EDU`, `LORE`, `VIGIL`, `RESIL`, `LEAD`, `NEG`, `COERC`, `SW`, `OUT`, `SURV`, `XEN`, `WARF`, `DISC`, `LTSABER`) ne sont pas mappés vers les IDs de compétences du système SWERPG, ce qui entraîne des champs `careerSkills` incomplets ou vides.

**Exemple concret** : La carrière **Sentinel** définit les codes `COMP`, `CORE`, `DECEP`, `PERC`, `SKUL`, `STEAL` mais seuls `DECEP` (deception), `PERC` (perception), et `STEAL` (stealth) sont actuellement mappés. Les codes `COMP`, `CORE`, et `SKUL` sont ignorés car absents de la table `OGG_DUDE_SKILL_MAP`.

### Objectif

Compléter la table de mapping `OGG_DUDE_SKILL_MAP` dans `/module/importer/mappings/oggdude-skill-map.mjs` pour couvrir **tous les codes de compétences** utilisés dans les 20 fichiers XML de carrières présents dans `/resources/integration/Careers/`.

### Périmètre

**In scope** :

- Analyse exhaustive des 20 fichiers XML de carrières pour identifier tous les codes `<CareerSkills><Key>` utilisés
- Extension de `OGG_DUDE_SKILL_MAP` avec les mappings manquants vers les compétences SWERPG existantes dans `SKILLS` (`/module/config/attributes.mjs`)
- Validation que chaque code OggDude mappe vers une compétence valide du système
- Mise à jour des tests unitaires et d'intégration pour couvrir les nouveaux mappings
- Documentation des mappings ajoutés

**Out of scope** :

- Création de nouvelles compétences dans le système SWERPG (on travaille uniquement avec les compétences existantes dans `SKILLS`)
- Modification de la structure XML OggDude
- Mapping des spécialisations (`<Specializations><Key>`)
- Refonte globale de l'architecture d'import

---

## 2. Analyse du problème

### 2.1 Contexte technique

**Fichiers concernés** :

- `/module/importer/mappings/oggdude-skill-map.mjs` : Table de mapping OggDude → SWERPG
- `/module/config/attributes.mjs` : Définition des compétences système dans `SKILLS`
- `/module/importer/items/career-ogg-dude.mjs` : Logique d'import des carrières
- `/resources/integration/Careers/*.xml` : 20 fichiers XML de carrières OggDude

**Processus actuel** :

1. `careerMapper()` extrait les codes avec `extractRawCareerSkillCodes(xmlCareer)`
2. `mapCareerSkills(rawCodes)` utilise `mapOggDudeSkillCodes()` qui consulte `OGG_DUDE_SKILL_MAP`
3. Les codes non trouvés dans la table génèrent un warning et sont ignorés
4. Seuls les codes mappés vers des IDs présents dans `SYSTEM.SKILLS` sont conservés

**Problème** : `OGG_DUDE_SKILL_MAP` est incomplet → codes manquants → `careerSkills` incomplet ou vide.

### 2.2 Codes de compétences identifiés dans les XML

Analyse exhaustive des 20 fichiers XML de carrières :

| Code OggDude | Présent dans map actuelle | Compétence SWERPG cible | Statut                                       |
| ------------ | ------------------------- | ----------------------- | -------------------------------------------- |
| ASTRO        | ❌                        | astrogation             | **À ajouter**                                |
| ATHL         | ✅                        | athletics               | OK                                           |
| BRAWL        | ❌                        | brawl                   | **À ajouter**                                |
| CHARM        | ✅                        | charm                   | OK                                           |
| COERC        | ❌                        | coercion                | **À ajouter**                                |
| COMP         | ✅                        | computers               | OK                                           |
| COOL         | ❌                        | cool                    | **À ajouter**                                |
| COORD        | ❌                        | coordination            | **À ajouter**                                |
| CORE         | ✅                        | coreworlds              | **À corriger** (actuellement → coordination) |
| DECEP        | ✅                        | deception               | OK                                           |
| DISC         | ❌                        | discipline              | **À ajouter**                                |
| EDU          | ✅                        | education               | OK (via mapping science)                     |
| GUNN         | ❌                        | gunnery                 | **À ajouter**                                |
| LEAD         | ❌                        | leadership              | **À ajouter**                                |
| LORE         | ❌                        | lore                    | **À ajouter**                                |
| LTSABER      | ❌                        | lightsaber              | **Absent SKILLS** (ignorer)                  |
| MECH         | ❌                        | mechanics               | **À ajouter**                                |
| MED          | ❌                        | medicine                | **À ajouter**                                |
| MELEE        | ❌                        | melee                   | **À ajouter**                                |
| NEG          | ❌                        | negotiation             | **À ajouter**                                |
| OUT          | ❌                        | outerrim                | **À ajouter**                                |
| PERC         | ✅                        | perception              | OK                                           |
| PILOTPL      | ❌                        | pilotingplanetary       | **À ajouter**                                |
| PILOTSP      | ❌                        | pilotingspace           | **À ajouter**                                |
| RANGHVY      | ❌                        | rangedheavy             | **À ajouter**                                |
| RANGLT       | ❌                        | rangedlight             | **À ajouter**                                |
| RESIL        | ❌                        | resilience              | **À ajouter**                                |
| SKUL         | ✅                        | skulduggery             | OK                                           |
| STEA         | ✅                        | stealth                 | OK                                           |
| STEAL        | ✅                        | stealth                 | OK                                           |
| SURV         | ❌                        | survival                | **À ajouter**                                |
| SW           | ❌                        | streetwise              | **À ajouter**                                |
| VIGIL        | ❌                        | vigilance               | **À ajouter**                                |
| WARF         | ❌                        | warfare                 | **Absent SKILLS** (ignorer)                  |
| XEN          | ❌                        | xenology                | **À ajouter**                                |

**Codes non mappables** (compétences absentes de `SKILLS`) :

- `LTSABER` (Lightsaber) : Compétence spécifique Force and Destiny, pas dans SKILLS actuel
- `WARF` (Warfare) : Compétence Knowledge non présente dans SKILLS

**Total** : 22 mappings à ajouter + 1 à corriger (CORE).

### 2.3 Compétences SWERPG disponibles

Liste complète des compétences dans `SKILLS` (attributes.mjs) :

**General** : cool, discipline, negotiation, perception, vigilance, astrogation, athletics, charm, coercion, computers, coordination, deception, leadership, mechanics, medicine, pilotingplanetary, pilotingspace, resilience, skulduggery, stealth, streetwise, survival

**Combat** : brawl, melee, rangedlight, rangedheavy, gunnery

**Knowledge** : coreworlds, lore, outerrim, underworld, xenology, education

**Total** : 35 compétences système disponibles.

---

## 3. Spécification des exigences

### REQ-001 : Mapping complet des codes OggDude

**Type** : Fonctionnel  
**Priorité** : Haute  
**Description** : Tous les codes de compétences présents dans les 20 fichiers XML de carrières doivent être mappés vers des compétences SWERPG valides (présentes dans `SYSTEM.SKILLS`).  
**Critère d'acceptation** :

- Aucun warning "[OggDudeSkillMap] Unknown OggDude skill code" pour les codes standards des carrières
- Chaque carrière XML produit un objet `careerSkills` complet

### REQ-002 : Cohérence des mappings

**Type** : Fonctionnel  
**Priorité** : Haute  
**Description** : Les mappings doivent respecter la sémantique des compétences OggDude et SWERPG.  
**Critère d'acceptation** :

- COOL → cool (pas confusion avec coordination)
- COORD → coordination (pas confusion avec coreworlds)
- CORE → coreworlds (Knowledge: Core Worlds, pas coordination)
- Tous les synonymes sont couverts (ex: ASTRO, ASTROGATION)

### REQ-003 : Gestion des codes non mappables

**Type** : Non-fonctionnel  
**Priorité** : Moyenne  
**Description** : Les codes pour lesquels aucune compétence SWERPG n'existe doivent être documentés et générer un warning explicite.  
**Critère d'acceptation** :

- LTSABER et WARF documentés comme non mappables dans les commentaires du fichier
- Warning spécifique si ces codes sont rencontrés (distinct des codes inconnus par erreur)

### REQ-004 : Validation des mappings

**Type** : Non-fonctionnel  
**Priorité** : Haute  
**Description** : Chaque mapping doit pointer vers une compétence existant réellement dans `SYSTEM.SKILLS`.  
**Critère d'acceptation** :

- Tests unitaires vérifiant que tous les codes mappés correspondent à des IDs valides dans `SKILLS`
- Aucun mapping vers des compétences inexistantes

### REQ-005 : Tests de non-régression

**Type** : Non-fonctionnel  
**Priorité** : Haute  
**Description** : Les mappings existants fonctionnels ne doivent pas être cassés.  
**Critère d'acceptation** :

- Tous les tests existants passent après modifications
- Les carrières déjà importées correctement continuent de l'être

### REQ-006 : Documentation des mappings

**Type** : Non-fonctionnel  
**Priorité** : Moyenne  
**Description** : Les mappings ajoutés doivent être documentés avec des commentaires clairs dans le code.  
**Critère d'acceptation** :

- Sections commentées par type de compétence (General, Combat, Knowledge)
- Commentaires explicatifs pour les mappings ambigus (CORE vs COORD)

---

## 4. Contraintes et considérations

### CON-001 : Contrainte de compatibilité système

**Description** : On ne peut mapper que vers des compétences existantes dans `SYSTEM.SKILLS` (module/config/attributes.mjs).  
**Impact** : Certains codes OggDude (LTSABER, WARF) resteront non mappables jusqu'à ajout de ces compétences au système.  
**Mitigation** : Documenter clairement les codes non mappables et leur raison.

### CON-002 : Contrainte de rétrocompatibilité

**Description** : Les mappings existants et fonctionnels ne doivent pas être modifiés sans raison valide.  
**Impact** : Nécessité de tests de non-régression exhaustifs.  
**Mitigation** : Execution de tous les tests existants après modifications.

### CON-003 : Contrainte de performance

**Description** : La table `OGG_DUDE_SKILL_MAP` est utilisée intensivement lors de l'import (appel par compétence par carrière).  
**Impact** : Doit rester un `Object.freeze()` pour lookup O(1).  
**Mitigation** : Aucune modification structurelle, simple ajout de paires clé-valeur.

### CON-004 : Ambiguïté CORE vs COORD

**Description** : Les codes `CORE` et `COORD` sont proches phonétiquement mais désignent des compétences différentes.  
**Impact** : Risque de confusion lors du mapping.  
**Mitigation** :

- CORE → coreworlds (Knowledge: Core Worlds lore)
- COORD → coordination (General: Coordination, agility-based)
- Commentaires explicites dans le code

### CON-005 : Codes synonymes

**Description** : Certaines compétences ont plusieurs abréviations possibles dans OggDude.  
**Impact** : Nécessité de mapper tous les synonymes pour robustesse.  
**Mitigation** : Mapper toutes les variantes identifiées (ex: ASTRO + ASTROGATION, COMP + COMPUTERS).

---

## 5. Architecture et design

### PAT-001 : Organisation de la table de mapping

**Pattern** : Grouped Frozen Object Literal  
**Justification** : Structure actuelle éprouvée, lecture O(1), immuabilité garantie.  
**Implémentation** :

```javascript
export const OGG_DUDE_SKILL_MAP = Object.freeze({
  // === GENERAL SKILLS ===
  COOL: 'cool',
  DISC: 'discipline',
  DISCIPLINE: 'discipline',
  // ... autres general

  // === COMBAT SKILLS ===
  BRAWL: 'brawl',
  MELEE: 'melee',
  // ... autres combat

  // === KNOWLEDGE SKILLS ===
  CORE: 'coreworlds',
  COREWORLDS: 'coreworlds',
  LORE: 'lore',
  // ... autres knowledge

  // === NON-MAPPABLE (documented) ===
  // LTSABER: Lightsaber skill not present in SWERPG SKILLS
  // WARF: Warfare knowledge skill not present in SWERPG SKILLS
})
```

### PAT-002 : Convention de nommage

**Pattern** : Uppercase OggDude Code → lowercase SWERPG ID  
**Justification** : Cohérence avec mappings existants, case-insensitive lookup via `trim().toUpperCase()`.  
**Exemple** : `ASTRO: 'astrogation'`, `PILOTPL: 'pilotingplanetary'`

### PAT-003 : Gestion des synonymes

**Pattern** : Multiple Keys → Same Value  
**Justification** : Robustesse face aux variations OggDude entre versions/sources.  
**Exemple** :

```javascript
ASTRO: 'astrogation',
ASTROGATION: 'astrogation',
COORD: 'coordination',
COORDINATION: 'coordination',
```

### PAT-004 : Validation post-mapping

**Pattern** : Filter by SYSTEM.SKILLS Membership  
**Justification** : Sécurité contre mapping vers compétence inexistante.  
**Localisation** : Déjà implémenté dans `mapCareerSkills()` (career-ogg-dude.mjs:175).

---

## 6. Plan de test

### TEST-001 : Validation mappings complets

**Type** : Unitaire  
**Fichier** : tests/importer/oggdude-skill-map.spec.mjs (nouveau)  
**Description** : Vérifier que tous les codes OggDude utilisés dans les carrières XML sont mappés.  
**Cas de test** :

1. Lire les 20 fichiers XML de carrières
2. Extraire tous les codes `<CareerSkills><Key>`
3. Vérifier que chaque code (sauf LTSABER, WARF) existe dans `OGG_DUDE_SKILL_MAP`
4. Vérifier que chaque valeur mappée existe dans `SYSTEM.SKILLS`

### TEST-002 : Validation mappings spécifiques

**Type** : Unitaire  
**Fichier** : tests/importer/oggdude-skill-map.spec.mjs  
**Description** : Tests explicites pour mappings critiques.  
**Cas de test** :

```javascript
expect(mapOggDudeSkillCode('COOL')).toBe('cool')
expect(mapOggDudeSkillCode('COORD')).toBe('coordination')
expect(mapOggDudeSkillCode('CORE')).toBe('coreworlds')
expect(mapOggDudeSkillCode('ASTRO')).toBe('astrogation')
expect(mapOggDudeSkillCode('RANGLT')).toBe('rangedlight')
expect(mapOggDudeSkillCode('RANGHVY')).toBe('rangedheavy')
expect(mapOggDudeSkillCode('LTSABER', { warnOnUnknown: false })).toBeNull()
```

### TEST-003 : Tests de non-régression carrières

**Type** : Intégration  
**Fichier** : tests/importer/career-ogg-dude.spec.mjs  
**Description** : Vérifier que les carrières actuelles continuent de s'importer correctement.  
**Cas de test** :

- Ajout de tests pour Sentinel (COMP, CORE, SKUL nouveaux codes)
- Ajout de tests pour Ace (ASTRO, COOL, GUNN, RANGLT)
- Vérification que les tests existants (Soldier, Spy) passent toujours

### TEST-004 : Test import carrières réelles

**Type** : Intégration  
**Fichier** : tests/importer/career-import.integration.spec.mjs  
**Description** : Import des 20 fichiers XML réels et vérification des résultats.  
**Cas de test** :

1. Parser chaque fichier XML de carrière
2. Appeler `careerMapper()`
3. Vérifier que `careerSkills.length > 0` pour chaque carrière
4. Vérifier aucun warning pour codes standards

### TEST-005 : Test codes non mappables

**Type** : Unitaire  
**Fichier** : tests/importer/oggdude-skill-map.spec.mjs  
**Description** : Vérifier comportement correct pour codes non mappables.  
**Cas de test** :

```javascript
// Avec warning
expect(mapOggDudeSkillCode('LTSABER')).toBeNull()
expect(consoleWarnSpy).toHaveBeenCalledWith('[OggDudeSkillMap] Unknown OggDude skill code: LTSABER')

// Sans warning (option)
expect(mapOggDudeSkillCode('WARF', { warnOnUnknown: false })).toBeNull()
expect(consoleWarnSpy).not.toHaveBeenCalled()
```

### TEST-006 : Test synonymes

**Type** : Unitaire  
**Fichier** : tests/importer/oggdude-skill-map.spec.mjs  
**Description** : Vérifier que tous les synonymes mappent vers la même compétence.  
**Cas de test** :

```javascript
expect(mapOggDudeSkillCode('ASTRO')).toBe('astrogation')
expect(mapOggDudeSkillCode('ASTROGATION')).toBe('astrogation')
expect(mapOggDudeSkillCode('COORD')).toBe('coordination')
expect(mapOggDudeSkillCode('COORDINATION')).toBe('coordination')
```

### TEST-007 : Test case-insensitivity

**Type** : Unitaire  
**Fichier** : tests/importer/oggdude-skill-map.spec.mjs  
**Description** : Vérifier que le mapping est insensible à la casse.  
**Cas de test** :

```javascript
expect(mapOggDudeSkillCode('cool')).toBe('cool')
expect(mapOggDudeSkillCode('COOL')).toBe('cool')
expect(mapOggDudeSkillCode('Cool')).toBe('cool')
```

---

## 7. Fichiers impactés

### FILE-001 : /module/importer/mappings/oggdude-skill-map.mjs

**Type** : Modification  
**Changements** :

- Ajout de 22 paires clé-valeur dans `OGG_DUDE_SKILL_MAP`
- Correction du mapping `CORE` : `coordination` → `coreworlds`
- Ajout de sections commentées pour organisation (General, Combat, Knowledge)
- Ajout de commentaire documentant codes non mappables (LTSABER, WARF)

### FILE-002 : /tests/importer/oggdude-skill-map.spec.mjs

**Type** : Création  
**Contenu** : Fichier de tests dédié pour validation exhaustive des mappings.

### FILE-003 : /tests/importer/career-ogg-dude.spec.mjs

**Type** : Modification  
**Changements** :

- Ajout de tests pour carrières utilisant les nouveaux codes (Sentinel, Ace, etc.)
- Vérification non-régression tests existants

### FILE-004 : /tests/importer/career-import.integration.spec.mjs

**Type** : Modification  
**Changements** :

- Extension des tests d'intégration pour couvrir toutes les carrières XML
- Vérification absence de warnings pour codes standards

### FILE-005 : /documentation/importer/import-career.md

**Type** : Modification  
**Changements** :

- Mise à jour de la section "Mappings" avec liste complète des codes supportés
- Documentation des codes non mappables

---

## 8. Implémentation par phases

### Phase 1 : Analyse et préparation (TASK-001 à TASK-005)

| ID       | Description                                                                             | Fichiers                             | Dépendances        | Priorité |
| -------- | --------------------------------------------------------------------------------------- | ------------------------------------ | ------------------ | -------- |
| TASK-001 | Analyser les 20 fichiers XML de carrières pour extraire tous les codes `<Key>` utilisés | resources/integration/Careers/\*.xml | -                  | Haute    |
| TASK-002 | Lister toutes les compétences disponibles dans `SYSTEM.SKILLS`                          | module/config/attributes.mjs         | -                  | Haute    |
| TASK-003 | Établir la table de correspondance codes OggDude → compétences SWERPG                   | -                                    | TASK-001, TASK-002 | Haute    |
| TASK-004 | Identifier les codes non mappables (compétences absentes de SKILLS)                     | -                                    | TASK-002, TASK-003 | Haute    |
| TASK-005 | Identifier les synonymes à mapper (ASTRO/ASTROGATION, etc.)                             | -                                    | TASK-001           | Moyenne  |

### Phase 2 : Implémentation des mappings (TASK-006 à TASK-009)

| ID       | Description                                                                            | Fichiers | Dépendances | Priorité |
| -------- | -------------------------------------------------------------------------------------- | -------- | ----------- | -------- |
| TASK-006 | Ajouter sections commentées dans OGG_DUDE_SKILL_MAP (General, Combat, Knowledge)       | FILE-001 | TASK-003    | Moyenne  |
| TASK-007 | Ajouter mappings General Skills (COOL, DISC, LEAD, NEG, COERC, VIGIL, RESIL, SW, SURV) | FILE-001 | TASK-006    | Haute    |
| TASK-008 | Ajouter mappings Combat Skills (BRAWL, MELEE, RANGLT, RANGHVY, GUNN)                   | FILE-001 | TASK-006    | Haute    |
| TASK-009 | Ajouter mappings Knowledge Skills (LORE, OUT, XEN)                                     | FILE-001 | TASK-006    | Haute    |
| TASK-010 | Corriger mapping CORE : coordination → coreworlds                                      | FILE-001 | TASK-003    | Haute    |
| TASK-011 | Ajouter mappings pilotage (PILOTPL, PILOTSP) et mécanique (MECH, ASTRO)                | FILE-001 | TASK-007    | Haute    |
| TASK-012 | Ajouter mapping médecine (MED)                                                         | FILE-001 | TASK-007    | Haute    |
| TASK-013 | Ajouter tous les synonymes identifiés                                                  | FILE-001 | TASK-005    | Moyenne  |
| TASK-014 | Documenter codes non mappables (LTSABER, WARF) avec commentaires                       | FILE-001 | TASK-004    | Moyenne  |

### Phase 3 : Tests et validation (TASK-015 à TASK-022)

| ID       | Description                                                         | Fichiers | Dépendances | Priorité |
| -------- | ------------------------------------------------------------------- | -------- | ----------- | -------- |
| TASK-015 | Créer fichier de tests oggdude-skill-map.spec.mjs                   | FILE-002 | TASK-014    | Haute    |
| TASK-016 | Implémenter TEST-001 (validation mappings complets)                 | FILE-002 | TASK-015    | Haute    |
| TASK-017 | Implémenter TEST-002 (validation mappings spécifiques)              | FILE-002 | TASK-015    | Haute    |
| TASK-018 | Implémenter TEST-005 (codes non mappables)                          | FILE-002 | TASK-014    | Moyenne  |
| TASK-019 | Implémenter TEST-006 (synonymes)                                    | FILE-002 | TASK-013    | Moyenne  |
| TASK-020 | Implémenter TEST-007 (case-insensitivity)                           | FILE-002 | TASK-015    | Basse    |
| TASK-021 | Ajouter tests carrières Sentinel, Ace dans career-ogg-dude.spec.mjs | FILE-003 | TASK-014    | Haute    |
| TASK-022 | Étendre tests d'intégration pour toutes les carrières XML           | FILE-004 | TASK-014    | Moyenne  |

### Phase 4 : Documentation et finition (TASK-023 à TASK-025)

| ID       | Description                                                                   | Fichiers | Dépendances | Priorité |
| -------- | ----------------------------------------------------------------------------- | -------- | ----------- | -------- |
| TASK-023 | Mettre à jour documentation import-career.md                                  | FILE-005 | TASK-014    | Moyenne  |
| TASK-024 | Exécuter tous les tests et corriger régressions                               | -        | TASK-022    | Haute    |
| TASK-025 | Validation manuelle : importer toutes les carrières XML et vérifier résultats | -        | TASK-024    | Haute    |

---

## 9. Critères d'acceptation globaux

- [ ] Tous les codes de compétences des 20 carrières XML (sauf LTSABER, WARF) sont mappés
- [ ] Le mapping CORE pointe vers `coreworlds` (Knowledge) et non `coordination` (General)
- [ ] Aucun warning "[OggDudeSkillMap] Unknown OggDude skill code" pour les codes standards lors de l'import des 20 carrières
- [ ] Tous les tests unitaires (TEST-001 à TEST-007) passent
- [ ] Tous les tests d'intégration existants passent (non-régression)
- [ ] Les nouvelles carrières testées (Sentinel, Ace) produisent des `careerSkills` complets
- [ ] La documentation est à jour avec la liste complète des codes supportés
- [ ] Les codes non mappables sont documentés avec raison explicite

---

## 10. Risques et mitigations

| Risque                                  | Impact | Probabilité | Mitigation                                          |
| --------------------------------------- | ------ | ----------- | --------------------------------------------------- |
| Confusion CORE/COORD                    | Moyen  | Moyenne     | Commentaires explicites + tests spécifiques         |
| Mapping vers compétence inexistante     | Élevé  | Faible      | Validation systématique via `SYSTEM.SKILLS` + tests |
| Régression tests existants              | Moyen  | Faible      | Execution systématique de tous les tests + review   |
| Codes OggDude variants non couverts     | Faible | Moyenne     | Analyse exhaustive des XML + synonymes              |
| Compétences SWERPG manquantes (LTSABER) | Faible | Élevée      | Documentation claire + warning spécifique           |

---

## 11. Dépendances externes

Aucune dépendance externe. Tous les éléments nécessaires sont présents dans le codebase :

- Compétences système définies dans `SKILLS`
- Fichiers XML de carrières dans `resources/integration/Careers/`
- Infrastructure de mapping et tests déjà en place

---

## 12. Références

### Spécifications liées

- `/documentation/spec/oggdude-importer/bug-career-import-data-needs-1.0.md` : Spécification initiale du problème d'import des carrières

### Documentation technique

- `/documentation/importer/import-career.md` : Documentation actuelle du flux d'import des carrières
- `/module/config/attributes.mjs` : Définition des compétences système SWERPG

### Standards OggDude

- Structure XML des carrières : `<Career><CareerSkills><Key>CODE</Key>...`
- Codes de compétences : Abréviations en majuscules (2 à 8 caractères)

### Foundry VTT

- Item type `career` : `system.careerSkills` = `[{id: string}]`
- Data model validation : seuls les IDs présents dans `SYSTEM.SKILLS` sont valides

---

## 13. Notes d'implémentation

### Ordre de priorité des mappings

1. **Critique** (carrières courantes bloquées) :
   - COOL, COORD, BRAWL, MELEE, RANGLT, RANGHVY, GUNN
   - ASTRO, PILOTPL, PILOTSP, MECH
   - LORE, VIGIL, RESIL, LEAD, NEG, COERC

2. **Important** (complétude) :
   - SW, OUT, SURV, XEN, MED, DISC

3. **Correction** :
   - CORE : coordination → coreworlds

### Validation de la cohérence

Après implémentation, vérifier que :

- Aucun doublon de valeur pour des codes différents (sauf synonymes volontaires)
- Tous les codes courts (2-4 car.) ont leur équivalent long si existant dans les XML
- Les compétences Knowledge/General/Combat sont bien dans leurs sections respectives

### Performance

Impact négligeable :

- Ajout de ~25 paires clé-valeur dans un Object.freeze() → toujours O(1) lookup
- Pas de modification algorithmique, simple extension de données statiques
- Import carrières : ~20 carrières × ~8 compétences × lookup O(1) = négligeable

---

## 14. Checklist de validation finale

Avant de marquer le plan comme implémenté :

- [ ] Tous les TASK-001 à TASK-025 sont complétés
- [ ] Tous les REQ-001 à REQ-006 sont satisfaits
- [ ] Tous les TEST-001 à TEST-007 passent
- [ ] Import manuel des 20 carrières XML réussi sans warnings
- [ ] Vérification échantillon : Sentinel, Ace, Spy, Commander importés correctement
- [ ] Revue de code : commentaires clairs, organisation logique
- [ ] Documentation à jour
- [ ] Aucune régression détectée (tests existants passent)

---

**Fin du plan d'implémentation**
