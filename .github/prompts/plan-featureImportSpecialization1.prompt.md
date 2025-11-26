# Plan de Correction – Import des Spécialisations OggDude

Nom interne: featureImportSpecialization1
Date: 2025-11-22
Auteur: Plan généré pour correction du blocage d'import

## 1. Objectif

Corriger le blocage constaté lors de l'import des spécialisations depuis l'archive OggDude : aucun Item créé, barre de progression immobile, processus semblant s'arrêter après l'étape de construction du contexte.

## 2. Constat / Symptômes

- Sélection du seul domaine "Specialization" dans l'UI d'import.
- Logs montrent exécution Steps 1–3 (zip, extraction, groupements) puis listing des domaines à importer ne contient pas "specialization" (absence dans buildContextMap principal).
- Fin prématurée avec hook `oggdudeImport.completed` sans création d'Items, durée globale enregistrée.
- Barre de progression (progressCallback) jamais incrémentée (aucune itération sur le domaine).

## 3. Cause Racine Probable

Oubli d'enregistrement du domaine `specialization` dans la map de contextes utilisée par `processOggDudeData()`. Le domaine est présent dans `preloadOggDudeData()` mais manquant dans `processOggDudeData()`, empêchant toute exécution du pipeline spécifique (build context + processElements) et donc la création des Items ainsi que les callbacks de progression.

## 4. Portée

Uniquement l'import des spécialisations OggDude. Vérifications de non-régression sur les autres domaines (armor, weapon, gear, species, career, talent, obligation). Pas de changement sur structure générale des autres importateurs. Ajout instrumentation & robustesse asynchrone.

## 5. Exigences (REQ)

- REQ-001: Le domaine specialization doit être importable via le pipeline standard (`processOggDudeData`).
- REQ-002: La barre de progression doit refléter l'avancement (processed/total) incluant specialization.
- REQ-003: Création des Items specialization dans un dossier dédié `Swerpg - Specializations`.
- REQ-004: Logging détaillé du mapping (skills, description, clés inconnues) sans bloquer le flux.
- REQ-005: Gestion d'erreur XML ou parsing: échec d'un fichier ne bloque pas les autres; log + compteur rejetés.
- REQ-006: Retenter (retry) uniquement sur erreurs parse/upload définies; ne pas boucler sur erreurs de validation métier.
- REQ-007: Statistiques mapping spécialisation (total, filtrés, inconnus) visibles dans logs.
- REQ-008: ProgressCallback appelé au début et après traitement du domaine.
- REQ-009: Préservation sécurité: aucun code exécuté depuis contenu importé, validation basique des noms.
- REQ-010: Performance acceptable: <2s pour 500 spécialisations sur environnement standard (batch unique Item.createDocuments).
- REQ-011: Aucune régression sur import pré-existant (talent/career).
- REQ-012: Tests de reproduction du bug initial (absence dans map) puis validation de correction.
- REQ-013: Traitement de compétences inconnues: log + agrégation, non bloquant.
- REQ-014: Compatibilité Foundry VTT v13 maintenue.
- REQ-015: Pas de fuite mémoire (cache images réutilisé, stats réinitialisées).
- REQ-016: Fiabilité: hook `oggdudeImport.completed` reflète nombre réel de domaines traités.

## 6. Hypothèses

- Fichiers XML de spécialisations situés sous `Data/Specializations` avec pattern `*.xml` et racine `Specializations.Specialization`.
- L'UI sélectionne correctement le domaine `specialization` (id attendu "specialization").
- Le mapping skills existant est suffisant; mode strict désactivé par défaut.

## 7. Stratégie de Correction (Haute Niveau)

1. Ajouter entrée specialization au `buildContextMap` dans `processOggDudeData`.
2. Ajouter validation: si domaine coché absent de la map → log warning.
3. Enrichir progression: progressCallback avant et après `processElements` (états start/end). Option: structure {processed, total, domain, phase}.
4. Encapsuler try/catch autour du bloc de traitement domaine pour log + comptage rejet si exception.
5. Vérifier `buildSpecializationContext` pour cohérence (jsonCriteria, dossier, images). Ajouter logs de taille dataset.
6. Ajouter instrumentation statistique déjà existante (utilitaires specialization-import-utils) dans pipeline principal (réinitialisation avant mapping, log final).
7. Tests: unitaires (mapper, extraction codes) + intégration (pipeline complet via zip mock).
8. Vérifier non-régression sur autres importations (exécuter import avec 2 domaines simultanés).

## 8. Tâches Détaillées

- TASK-001: Auditer code actuel `oggDude.mjs` (identifié absence specialization).
- TASK-002: Insérer `buildSpecializationContext` dans `buildContextMap` de `processOggDudeData`.
- TASK-003: Ajouter guard log si domaines sélectionnés non présents.
- TASK-004: Étendre progressCallback (phase start/end) pour granularité.
- TASK-005: Ajouter try/catch autour de `withRetry` + `processElements` pour domaine specialization (en cas d'erreur mapping/création).
- TASK-006: Log stats finales (appel `getSpecializationImportStats`).
- TASK-007: Vérification jsonData non vide; si vide → log warning et incrément rejet global, continuer.
- TASK-008: Test unitaire `extractRawSpecializationSkillCodes` (variantes structure).
- TASK-009: Test unitaire `mapSpecializationSkills` (déduplication, tronquage à 8, inconnus).
- TASK-010: Test unitaire `specializationMapper` (rejets si name/key manquants).
- TASK-011: Mock zip intégration: 2 XML valides, 1 corrompu → importer specialization uniquement.
- TASK-012: Vérifier progression (au moins 1 callback) et Items créés.
- TASK-013: Test de regression carrière+specialization simultanés.
- TASK-014: Mesure durée import (timer simple) pour dataset mock volumineux.
- TASK-015: Documentation courte (README section import specialization fix).
- TASK-016: Mise à jour CHANGELOG.

## 9. Tests (Résumé)

- TEST-001: Reproduction bug initial (avant fix) — absence progression et Items.
- TEST-002: Pipeline après fix (progressCallback appelé deux fois min.).
- TEST-003: Création Items >0, dossier créé.
- TEST-004: XML invalide n'interrompt pas import.
- TEST-005: Compétences inconnues loggées.
- TEST-006: Déduplication & limite 8 compétences.
- TEST-007: Mode multi-domaine (career + specialization) fonctionne.
- TEST-008: Performance (mock 500 spécializations <2s).
- TEST-009: Hook completion domaines corrects.
- TEST-010: Stats (total vs filtered) cohérentes.
- TEST-011: Progress bar valeur finale = 1/1 (si un seul domaine).
- TEST-012: Retrys ne se déclenchent pas sur erreurs de validation.

## 10. Risques & Mitigations

- RISK-001: Régression autres domaines — Test multi-domaine (TEST-007).
- RISK-002: Explosion mémoire si gros XML — Traitement par Promise.all déjà; surveiller taille, éventuel batching futur.
- RISK-003: Skills inconnues nombreuses spamment logs — Throttling déjà via stats utilitaires (vérifier).
- RISK-004: Progression incohérente si callback échoue — try/catch interne & log warn.
- RISK-005: Conflits d'images — Cache image existant limite appels.

## 11. Performance & Sécurité

- Batch unique `Item.createDocuments` (déjà présent) pour réduire overhead.
- Validation de noms fichiers (déjà dans `getElementsFrom` pour injections path). Aucune exécution de contenu importé.

## 12. Observabilité

- Ajout logs start/end domaine specialization.
- Statistiques finales specialization (counts) en debug.
- ProgressCallback phases permet instrumentation UI.

## 13. Critères d'Acceptation

- Import specialization seul: Items créés, progression passe à 1/1, stats cohérentes.
- Import specialization + career: progression 2/2, chaque dossier créé.
- XML corrompu: Import continue, log warning, Items valides présents.
- Compétences inconnues: listées dans logs sans échec global.

## 14. Plan de Validation Final

1. Exécuter suite tests unitaires & intégration.
2. Lancer import réel avec archive de référence (petit dataset) en environnement Foundry.
3. Vérifier UI (barre progression, dossier Items, logs).
4. Ajouter entrée CHANGELOG.
5. Confirmer absence erreurs console.

## 15. Suivi / Prochaines étapes

- Exposer `strictSkills` dans UI (amélioration future).
- Batching adaptatif pour >1000 spécializations.
- Export metrics vers panneau admin (future feature).

---

Fin du plan featureImportSpecialization1
