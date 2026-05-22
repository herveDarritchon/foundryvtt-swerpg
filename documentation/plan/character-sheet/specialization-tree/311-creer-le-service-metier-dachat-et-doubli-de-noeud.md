    # US17.1 — Plan d'implémentation : Créer le service métier d'achat et d'oubli de nœud

## Contexte

Issue : [#311 — US17.1 - Créer le service métier d'achat et d'oubli de nœud](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/311)

Références :

- `documentation/ways-of-work/plan/specialization-tree-v1/us17-talent-node-purchase-and-forget/project-plan.md`
- `documentation/cadrage/character-sheet/specialization-tree/cadrage-amelioration-achat-oubli-talent-arbre-specialisation.md`
- `documentation/plan/character-sheet/specialization-tree/202-plan-acheter-noeud-vue-graphique.md`
- `documentation/plan/character-sheet/specialization-tree/203-plan-synchroniser-achat-arbre-onglet-talents.md`

L'existant dispose déjà d'un flux `purchaseTalentNode()` focalisé sur l'achat, d'un moteur d'état de nœud et d'une synthèse des talents possédés. Le besoin de US17.1 est de poser un contrat métier unique pour l'achat et l'oubli, avec erreurs explicites et patch acteur déterministe, avant de brancher l'UI et les refreshs.

## Objectif

Centraliser la logique métier de progression des nœuds de talent dans un service unique, capable de valider un achat ou un oubli, de refuser proprement les cas bloquants et de produire un résultat exploitable par les couches de persistance, d'UI et d'audit.

## Périmètre

### Inclus

- contrat métier unique pour `purchase` et `forget` ;
- validations communes : acteur, spécialisation, arbre, nœud, état courant ;
- validation d'oubli avec détection des achats dépendants bloquants ;
- calcul du changement cible sur `talentPurchases` et l'XP, sans règle dupliquée côté UI ;
- format de résultat structuré (`ok`, `action`, `reasonCode`, `reason`, `payload` ou équivalent) ;
- tests unitaires du service sur flux nominaux et refus métier.

### Exclus

- branchement des clics, confirmations et notifications dans `SpecializationTreeApp` ;
- refresh des vues arbre / onglet Talents ;
- émissions d'audit log ;
- travail de traduction et labels UI.

## Fichiers pressentis

| Fichier                                                  | Rôle                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `module/lib/talent-node/talent-node-purchase.mjs`        | Point d'entrée existant à refactorer ou à déléguer vers le nouveau service métier       |
| `module/lib/talent-node/talent-node-state.mjs`           | Réutiliser les états/raisons canoniques et compléter si l'oubli exige de nouveaux codes |
| `module/lib/talent-node/owned-talent-summary.mjs`        | Référence utile pour dériver les dépendances ou consolider le rang courant              |
| `module/lib/talent-node/talent-node-progression.mjs`     | Nouveau service métier central pressenti pour achat / oubli                             |
| `tests/lib/talent-node/talent-node-purchase.test.mjs`    | Couverture existante d'achat à réaligner sur le contrat central                         |
| `tests/lib/talent-node/talent-node-progression.test.mjs` | Nouvelle suite ciblant achat, oubli et blocages de dépendance                           |

## Plan d'implémentation

### Étape 1 — Formaliser le contrat central de progression de nœud

**Fichiers :** `module/lib/talent-node/talent-node-progression.mjs`, `module/lib/talent-node/talent-node-state.mjs`

1. Introduire un service métier unique recevant l'acteur, la spécialisation, le nœud ciblé et l'action (`purchase` ou `forget`).
2. Définir un résultat structuré stable pour tous les appels, avec succès métier, refus métier et données minimales de sortie.
3. Réutiliser les `reasonCode` existants quand ils couvrent le besoin et ajouter seulement les codes strictement nécessaires aux blocages d'oubli.

### Étape 2 — Centraliser les règles d'achat et d'oubli sans logique UI

**Fichiers :** `module/lib/talent-node/talent-node-progression.mjs`, `module/lib/talent-node/talent-node-purchase.mjs`, `module/lib/talent-node/owned-talent-summary.mjs`

1. Faire déléguer le flux d'achat existant au nouveau service pour éviter deux sources de vérité.
2. Implémenter la validation d'oubli : nœud acheté requis, dépendances descendantes achetées détectées, remboursement XP cohérent avec le cadrage V1.
3. Produire pour chaque action un payload métier déterministe prêt à être persisté par la couche suivante (`talentPurchases`, `experience.spent`, métadonnées utiles de résultat).

### Étape 3 — Verrouiller le contrat par des tests unitaires ciblés

**Fichiers :** `tests/lib/talent-node/talent-node-purchase.test.mjs`, `tests/lib/talent-node/talent-node-progression.test.mjs`

1. Conserver les scénarios d'achat nominal déjà couverts, mais les réaligner sur le service central.
2. Ajouter les cas d'oubli autorisé, oubli bloqué par dépendance, nœud absent, spécialisation non possédée et XP/rangs recalculés.
3. Vérifier que le service retourne toujours une raison exploitable et qu'aucune règle métier n'est laissée à l'appelant UI.

## Définition de done

- [ ] Un point d'entrée métier unique couvre achat et oubli de nœud.
- [ ] Les refus métier sont explicités par des `reasonCode` stables et testés.
- [ ] Le service calcule un résultat/payload exploitable sans dépendre de l'UI.
- [ ] L'achat existant délègue au contrat central sans divergence de règles.
- [ ] Les tests unitaires couvrent les cas nominaux et les principaux blocages d'oubli.
