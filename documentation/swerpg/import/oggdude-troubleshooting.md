# Guide de Troubleshooting Import OggDude

## 1. Symptômes fréquents

| Symptôme                          | Cause probable                                 | Action rapide                                             |
| --------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Aucune donnée importée            | Aucune domain sélectionné                      | Cocher au moins un domaine avant Load                     |
| Erreur `xml2js vendor non chargé` | Vendor absent en environnement test            | Vérifier `vendors/xml2js.min.js` présent                  |
| Images manquantes                 | Nom clé non trouvé ou image spécifique absente | Fallback automatique déjà appliqué, vérifier chemin world |
| Performances lentes (>4000ms)     | Fichier XML volumineux / surcharge mémoire     | Vérifier taille ZIP, relancer avec moins de domaines      |
| Mémoire élevée                    | Parsing gros XML accumulé                      | Vérifier version optimisée (libération rawData)           |
| Statistiques non mises à jour     | Utilitaires stats non appelés dans mapper      | Inspecter mapper et appels `increment...Stat`             |

## 2. Procédure d'analyse rapide

1. Activer logs debug dans console Foundry: `CONFIG.debug.hooks = true`.
2. Lancer import d'un seul domaine (ex: weapon) pour réduire bruit.
3. Vérifier sortie logger pour étapes: `Step 1 Zip`, `Step 2 All Data Elements`, `Step 3.1 Group By Directory`.
4. Si blocage avant Step 6, problème de construction de contexte.
5. Si exception dans Step 6-3 (parse XML) : valider structure XML.

## 3. Erreurs XML fréquentes

| Erreur              | Explication                          | Correction                               |
| ------------------- | ------------------------------------ | ---------------------------------------- |
| Balises non fermées | XML incomplet                        | Ouvrir fichier source et corriger balise |
| Encodage inattendu  | BOM/charset non UTF-8                | Re-sauver en UTF-8                       |
| Racine inattendue   | Critère `Weapons.Weapon` introuvable | Vérifier version générateur OggDude      |

## 4. Stratégie de Retry

Le retry automatique (TASK-023) ré-exécute jusqu'à 3 tentatives sur erreurs transitoires (parse ou IO). Journalise chaque tentative: `RetryAttempt {count}`.

## 5. Vérification des statistiques

Utiliser:

```javascript
import { getGlobalImportMetrics } from 'module/importer/utils/global-import-metrics.mjs'
console.log(getGlobalImportMetrics())
```

Si `total === 0` pour un domaine attendu, suspecter critère JSON (`elementCriteria`).

## 6. Nettoyage environnement

- Supprimer ZIP problématique et re-télécharger depuis source OggDude.
- Redémarrer Foundry pour vider caches mémoire internes.

## 7. Sécurité

Rejet des noms suspects via `OggDudeDataElement.getElementsFrom`. Si un fichier légitime contient `/` ou `..` dans son nom, ajuster prétraitement du ZIP (renommer avant import).

## 8. Quand ouvrir un ticket

Ouvrir issue si:

- Temps import > 2x seuil performance base.
- Statistiques inconsistantes (imported > total).
- Crash répété malgré retry sur fichier sain.

Inclure: version système, extrait log, taille ZIP, domaines sélectionnés.
