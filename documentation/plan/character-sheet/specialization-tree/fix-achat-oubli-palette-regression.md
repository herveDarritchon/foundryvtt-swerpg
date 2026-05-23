## Fix — Régressions achat/oubli et palette (post-MSM4)

### Contexte

Deux régressions constatées après le travail MSM4 (+ palette GUX2) dans `SpecializationTreeApp` :

1. **Achat/oubli de nœud ne fonctionne plus** : les CTA d'achat/oubli sont absents ou inefficaces pour les personnages existants (et potentiellement aussi les nouveaux).
2. **Palette de couleurs des nœuds différente** : le rendu visuel a changé depuis `babbcb1b`.

Ni l'une ni l'autre n'est volontaire ; ce plan couvre l'analyse et la correction des deux.

---

### 1 — Achat/oubli : causes racines (3 problèmes imbriqués)

#### 1.1 — Contrat de clé flou entre UI et moteur métier

- L'UI de `tree-context-builder.mjs` construit une clé de sélection (`selectedKey`) qui peut être :
  - `specializationId` canonique,
  - `treeUuid`,
  - `name` (slug).
- Cette même clé est ensuite passée comme `specializationId` aux appels :
  - `getTreeNodesStates()` (ligne 212),
  - `processTalentNodeProgression()`.
- Or le moteur métier (`talent-node-state.mjs`, `talent-node-progression.mjs`) fait une comparaison stricte (`===`) avec le `specializationId` canonique des spécialisations de l'acteur.
- Résultat : si la clé n'est PAS un `specializationId` canonique, tous les nœuds sont vus comme `SPECIALIZATION_NOT_OWNED` → plus de CTA achat/oubli.

#### 1.2 — Normalisation legacy jamais appelée au runtime

- `normalizeActorSpecializations()` existe dans `talent-tree-resolver.mjs:16-33` mais n'est **appelée nulle part** au runtime de l'application.
- Les acteurs créés avant l'enrichissement `specializationId` gardent leurs données non normalisées.
- La méthode `resolveSpecializationTree()` fait bien une résolution par fallback (name/UUID), mais le résultat ne porte pas le `specializationId` attendu par les moteurs.

#### 1.3 — Impact universel

- Même les nouveaux personnages peuvent être touchés si le flux d'ajout de spécialisation ne pose pas systématiquement un `specializationId` canonique (cas des arbres OggDude sans `specializationId` défini, ou des imports sans résolution préalable).

### 2 — Palette : analyse

- Changement volontaire dans `babbcb1b` (feat GUX2) : palette blue/red avec distinction actif/passif.
- Ajustement alpha dans `116df8f6`.
- Palette actuelle définie dans `node-ui-state.mjs:85-229`.
- Légende réalignée dans `styles/applications.less:953-972`.
- La palette précédente (pré-`babbcb1b`) était plus simple : vert/bleu/gris/rouge sans matrice actif/passif.
- Décision : **garder la palette actuelle** (volontaire, documentée, avec légende à jour). Si revert demandé, base = pré-`babbcb1b`.

---

### Plan de correction

#### 3.1 — Séparer clé UI et identifiant métier (achat/oubli)

Fichiers cibles :

- `module/applications/specialization-tree/tree-context-builder.mjs`
- `module/applications/specialization-tree/node-ui-state.mjs`
- `module/lib/talent-node/talent-node-state.mjs`
- `module/lib/talent-node/talent-node-progression.mjs`
- `module/applications/specialization-tree-app.mjs`

Modifications :

1. Dans `tree-context-builder.mjs`, exposer deux valeurs distinctes : `selectionKey` (pour l'UI) et `canonicalSpecializationId` (pour le métier).
2. Calculer `canonicalSpecializationId` par résolution : si `tree.system.specializationId` existe, l'utiliser ; sinon résoudre via `resolveSpecializationTree()` ou fallback vers `name`.
3. Propager `canonicalSpecializationId` dans `getTreeNodesStates()` et `processTalentNodeProgression()`.
4. Vérifier que `SpecializationTreeApp.#onContextualAction` utilise le bon identifiant pour l'achat/oubli.

#### 3.2 — Normaliser au runtime (legacy + nouveaux)

Fichier cible : `module/applications/specialization-tree-app.mjs`

Modifications :

1. Appeler `normalizeActorSpecializations(this.actor)` dans `_prepareContext()` ou `onTreeChanged()`.
2. Ajouter une vérification : si la normalisation a modifié la `selectedTreeKey`, rafraîchir le rendu.

#### 3.3 — Palette : garder l'existant

- Aucun changement sur la palette sauf si reversion demandée explicitement.
- Si demandé, revert de `node-ui-state.mjs:85-229` vers la version pré-`babbcb1b` et réalignement de `styles/applications.less:953-972`.

#### 3.4 — Tests de régression

Fichiers cibles : nouveaux tests ou extension des fichiers existants :

- `tests/lib/talent-node/talent-node-state.test.mjs`
- `tests/lib/talent-node/talent-node-progression.test.mjs`
- `tests/applications/specialization-tree-app.test.mjs`

Cas à couvrir :

1. Acteur legacy **sans** `specializationId` : achat d'un nœud racine.
2. Acteur legacy **sans** `specializationId` : oubli d'un nœud acheté.
3. Sélection UI par `treeUuid` → achat correct.
4. Sélection UI par `name` → achat correct.
5. Normalisation appelée à l'ouverture de l'app (mock `normalizeActorSpecializations`).
6. Vérifier que le CTA d'achat/oubli est présent dans `actionableNodeViewModel` pour les cas 1-4.

---

### Fichiers impactés (résumé)

| Fichier                                                            | Modifications                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `module/applications/specialization-tree/tree-context-builder.mjs` | Exposer `canonicalSpecializationId` + `selectionKey` séparés |
| `module/lib/talent-node/talent-node-state.mjs`                     | Optionnel : assouplir comparaison si besoin                  |
| `module/lib/talent-node/talent-node-progression.mjs`               | Optionnel : assouplir comparaison si besoin                  |
| `module/applications/specialization-tree-app.mjs`                  | Normalisation au runtime + propagation nouvel ID             |
| `module/applications/specialization-tree/node-ui-state.mjs`        | Aucun (sauf revert palette)                                  |
| `styles/applications.less`                                         | Aucun (sauf revert palette)                                  |
| `tests/*`                                                          | Nouveaux tests de régression                                 |

---

### Risques

- **Risque 1** : le calcul du `canonicalSpecializationId` ajoute une dépendance à `resolveSpecializationTree()` dans un hot path. Mitigation : mise en cache du résultat par `treeKey` dans `tree-context-builder`.
- **Risque 2** : la normalisation au runtime modifie l'acteur au premier rendu. Mitigation : n'appeler `normalizeActorSpecializations` qu'une fois par cycle de vie de l'app (flag `_normalized`).
- **Risque 3** : les tests mock doivent reproduire des données OggDude sans `specializationId`. Mitigation : fixtures dédiées dans `tests/helpers/specialization-tree-fixtures.mjs`.

---

### Ordre d'exécution

1. `tree-context-builder.mjs` : séparation clé UI / ID métier.
2. `specialization-tree-app.mjs` : normalisation runtime + propagation ID.
3. `talent-node-state.mjs` / `talent-node-progression.mjs` : ajustement si nécessaire.
4. Tests de régression (legacy + normalisés + CTA présents).
5. Validation : `pnpm test` — attendu 1962+ passed, 0 failures.
