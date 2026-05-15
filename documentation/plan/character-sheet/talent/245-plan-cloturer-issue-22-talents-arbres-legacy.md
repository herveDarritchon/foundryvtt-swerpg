# Plan d'implémentation — Clôturer l'issue #22 : talents, arbres et reliquats legacy

**Issue** : [#22 — Gestion des Talents dans les arbres (`system.trees`, `system.node`, `system.row`)](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/22)
**Epic** : [#184 — EPIC: Refonte V1 des talents Edge](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/184)
**ADR** : `documentation/architecture/adr/adr-0014-talents-standalone-arbres-v1-et-source-de-verite-progression.md`, `documentation/architecture/adr/adr-0013-technical-key-and-business-key-separation.md`, `documentation/architecture/adr/adr-0012-unit-tests-readable-diagnostics.md`
**Audit de référence** : `documentation/audit/issue-22-audit-gestion-talents-arbres.md`
**Module(s) impacté(s)** : `documentation/importer/talent-import-architecture.md` (modification), `module/models/talent.mjs` (modification), `module/importer/mappers/oggdude-talent-mapper.mjs` (modification potentielle), `tests/importer/` (modification potentielle), issue `#22` (commentaire ou checklist finale)

---

## 1. Objectif

Clôturer proprement l'issue `#22` en alignant définitivement la documentation et les points de contact techniques restants sur l'architecture désormais formalisée par ADR-0014 :

- `Talent.xml` = définition générique standalone d'un talent ;
- `specialization-tree` = support canonique des arbres V1 ;
- `actor.system.progression.talentPurchases` = source de vérité de progression acteur ;
- `Item.talent.system.trees`, `system.node`, `system.row` = reliquats legacy non canoniques pour la V1.

Le résultat attendu n'est pas la suppression complète de tout le legacy talents, mais une **clôture saine de l'ambiguïté d'architecture** : plus aucune documentation active ni aucun point d'entrée courant ne doivent laisser entendre que `Talent.xml` ou `Item.talent` portent à eux seuls l'arborescence V1.

---

## 2. Périmètre

### Inclus dans ce ticket

- Réécrire la documentation d'import talent encore contradictoire avec ADR-0014
- Expliciter dans le code le statut legacy de `system.trees`, `system.node`, `system.row` sur `Item.talent`
- Vérifier si le mapper `Talent.xml` conserve des résidus conceptuels legacy non nécessaires au flux actuel
- Réduire ou isoler les reliquats legacy du mapper talent si cela est faisable sans casser la compatibilité utile
- Ajouter ou ajuster les tests qui verrouillent le contrat documentaire et technique minimal
- Mettre à jour l'issue `#22` avec une checklist de sortie et la décision sur ce qui reste volontairement hors scope

### Exclu de ce ticket

- Suppression physique complète de `SwerpgTalentNode` et du canvas legacy Crucible
- Suppression complète des flows legacy `trained-talent` / `ranked-trained-talent`
- Migration des données existantes de personnages legacy
- Refonte fonctionnelle des arbres V1 ou de l'UI de spécialisation
- Réécriture complète de toute la documentation historique talents du projet

---

## 3. Constat sur l'existant

### 3.1. La décision d'architecture existe désormais

ADR-0014 formalise explicitement la séparation entre talent générique, arbre de spécialisation et progression acteur. L'audit de l'issue `#22` est donc désormais couvert sur le plan décisionnel.

### 3.2. La documentation import talent reste partiellement contradictoire

Le fichier `documentation/importer/talent-import-architecture.md` contient maintenant une note d'architecture correcte en tête, mais son corps continue de décrire un modèle ancien centré sur `SwerpgTalentNode`, `system.node`, `rank` et un contrat plus riche que le `transform()` réellement produit.

Cela crée un risque immédiat :

- un développeur peut lire l'en-tête ADR puis être recontaminé par le corps du document ;
- la doc suggère encore une canonicité de `node` qui n'est plus vraie pour la V1 ;
- le schéma documenté n'est plus celui réellement écrit par le mapper actuel.

### 3.3. `module/models/talent.mjs` expose encore le legacy comme schéma normal

Le data model `talent` déclare toujours :

- `node` ;
- `trees` ;
- `row`.

Ces champs sont aujourd'hui des reliquats de compatibilité, mais leur présence nue dans `defineSchema()` entretient une ambiguïté si elle n'est pas explicitement documentée dans le code.

### 3.4. Le mapper `Talent.xml` ne persiste plus l'arbre, mais garde des traces de l'ancien modèle

`module/importer/mappers/oggdude-talent-mapper.mjs` ne persiste plus `system.node`, `system.row` ou `system.trees` dans le résultat final. En revanche, le contexte calcule encore `node`, `tier` et `rank`.

Ce n'est pas forcément un bug, mais cela doit être requalifié :

- soit ces informations sont encore utiles comme diagnostics d'import ;
- soit elles doivent sortir du chemin principal pour éviter de maintenir une dette conceptuelle inutile.

### 3.5. Des chemins legacy runtime existent encore, mais ce n'est pas le vrai sujet de clôture de `#22`

Les flows `trained-talent`, `ranked-trained-talent`, le global tree Crucible et certaines classes canvas legacy existent encore. Ils sont déjà identifiés comme dépréciés et suivis par d'autres travaux de neutralisation.

La clôture de `#22` n'exige pas leur suppression immédiate, mais impose qu'ils soient clairement traités comme **hors contrat canonique V1**.

---

## 4. Décisions d'architecture appliquées par ce plan

### 4.1. `#22` se clôt sur la clarification, pas sur l'éradication complète du legacy

**Décision** : considérer l'issue `#22` comme une issue d'architecture et d'alignement documentaire/technique minimal, pas comme un ticket de suppression exhaustive du legacy talents.

Justification :
- cohérent avec le texte initial de l'issue ;
- cohérent avec ADR-0014 ;
- évite de bloquer indéfiniment la clôture sur des travaux plus larges déjà identifiés ailleurs.

### 4.2. Toute documentation active doit refléter le contrat réellement canonique

**Décision** : une documentation active qui décrit encore `SwerpgTalentNode` ou `system.node` comme contrat normal du flux `Talent.xml` doit être réécrite, pas seulement préfacée d'un avertissement.

Justification :
- une note en tête ne suffit pas si le contenu détaillé raconte encore l'ancien modèle ;
- la doc doit aider un futur contributeur à prendre la bonne direction sans ambiguïté.

### 4.3. Les champs legacy du modèle `talent` doivent être explicitement annotés comme tels

**Décision** : tant que `node`, `trees` et `row` restent dans `module/models/talent.mjs`, ils doivent être signalés dans le code comme champs legacy non canoniques V1.

Justification :
- limite les réintroductions accidentelles dans de nouveaux développements ;
- rend le contrat plus honnête pour les mainteneurs ;
- aligne le code avec ADR-0014 sans forcer une suppression risquée immédiate.

### 4.4. Le mapper talent peut conserver des diagnostics, pas une dépendance métier implicite

**Décision** : si `node`, `tier` ou `rank` sont encore utiles dans le contexte d'import, ils doivent être conservés uniquement comme aide de diagnostic ou de compatibilité transitoire, jamais comme représentation métier canonique de l'arbre V1.

Justification :
- respecte ADR-0014 ;
- évite une suppression trop agressive ;
- permet un nettoyage progressif et testable.

---

## 5. Plan de travail détaillé

### Étape 1 — Réécrire complètement `documentation/importer/talent-import-architecture.md`

**Quoi faire** : remplacer les sections qui décrivent le flux comme centré sur `SwerpgTalentNode`, `system.node`, `rank` et un pseudo-contrat d'arbre par une documentation alignée sur le mapper réel : définition générique, activation, `isRanked`, description enrichie, données d'import dans `flags.swerpg.import`, et séparation stricte avec `specialization-tree`.

**Fichiers** :
- `documentation/importer/talent-import-architecture.md`

**Risques** : réécrire trop vite et perdre quelques détails utiles sur les diagnostics d'import ; corriger la direction mais décrire un contrat qui ne correspond pas exactement au code actuel.

### Étape 2 — Annoter clairement le legacy dans `module/models/talent.mjs`

**Quoi faire** : ajouter une documentation de code explicite sur `node`, `trees` et `row` pour préciser qu'ils ne sont pas canoniques pour la V1 Talents Edge. Ajuster la JSDoc et, si utile, des commentaires ciblés dans `defineSchema()` et/ou les getters concernés.

**Fichiers** :
- `module/models/talent.mjs`

**Risques** : commentaires trop vagues ou trop dispersés ; oubli d'un point de contact important qui continuerait de présenter ces champs comme normaux.

### Étape 3 — Qualifier le reliquat legacy du mapper `Talent.xml`

**Quoi faire** : relire `module/importer/mappers/oggdude-talent-mapper.mjs` et ses mappings satellites pour décider si `resolveTalentNode()`, `tier` et `rank` sont encore nécessaires.

Sous-cas possibles :
- s'ils ne servent plus au contrat ni aux tests utiles, les retirer du contexte principal ;
- s'ils servent encore au diagnostic, les reléguer explicitement au statut de métadonnées non canoniques ;
- s'ils servent à un test obsolète, corriger le test au lieu de sanctuariser le legacy.

**Fichiers** :
- `module/importer/mappers/oggdude-talent-mapper.mjs`
- `module/importer/mappings/oggdude-talent-node-map.mjs`
- `module/importer/mappings/oggdude-talent-rank-map.mjs`
- `tests/importer/talent-mapper.spec.mjs`
- `tests/importer/talent-mappings.spec.mjs`

**Risques** : casser un diagnostic d'import légitime ; retirer une donnée encore utile sans couverture de test suffisante.

### Étape 4 — Verrouiller le contrat par tests ciblés

**Quoi faire** : ajouter ou mettre à jour des tests qui garantissent au minimum :

- que le `transform()` talent n'écrit pas `system.node`, `system.row`, `system.trees` ;
- que les métadonnées utiles restent dans `flags.swerpg.import` ;
- que la documentation technique réécrite reflète bien le contrat réellement vérifié par le code ;
- qu'aucun test ne dépend encore d'une hypothèse du type "Talent.xml = full tree support".

**Fichiers** :
- `tests/importer/talent-mapper.spec.mjs`
- `tests/importer/talent-import-real-test.spec.mjs`
- éventuellement un nouveau test ciblé si le contrat actuel n'est pas assez lisible

**Risques** : tests trop couplés à l'implémentation actuelle des flags ; couverture insuffisante de la séparation talent générique / arbre.

### Étape 5 — Clore `#22` avec une note de sortie explicite

**Quoi faire** : une fois les points précédents livrés, ajouter sur l'issue `#22` un commentaire de clôture résumant :

- ce qui est désormais couvert par ADR-0014 ;
- les corrections documentaires réalisées ;
- le fait que `system.trees/node/row` sont legacy ;
- ce qui reste volontairement hors scope et suivi par des tickets/US de nettoyage legacy séparés.

**Fichiers / supports** :
- issue GitHub `#22`

**Risques** : fermer l'issue sans mentionner clairement le reliquat legacy restant, ce qui pourrait recréer de l'ambiguïté plus tard.

---

## 6. Fichiers modifiés

| Fichier | Action | Description du changement |
|---|---|---|
| `documentation/importer/talent-import-architecture.md` | modification | Réécrire le document pour refléter le vrai contrat `Talent.xml` générique et la séparation avec `specialization-tree` |
| `module/models/talent.mjs` | modification | Annoter `node`, `trees`, `row` comme legacy non canoniques V1 |
| `module/importer/mappers/oggdude-talent-mapper.mjs` | modification potentielle | Réduire ou requalifier les reliquats legacy du contexte d'import |
| `module/importer/mappings/oggdude-talent-node-map.mjs` | modification potentielle | Ajuster ou isoler la logique de résolution legacy si elle reste nécessaire |
| `module/importer/mappings/oggdude-talent-rank-map.mjs` | modification potentielle | Vérifier si la donnée reste utile comme diagnostic uniquement |
| `tests/importer/talent-mapper.spec.mjs` | modification | Verrouiller le contrat final du mapper talent |
| `tests/importer/talent-import-real-test.spec.mjs` | modification potentielle | Vérifier le pipeline réel sans support implicite des arbres via `Talent.xml` |

---

## 7. Stratégie de validation

### Tests automatisés

- `pnpm vitest run tests/importer/talent-mapper.spec.mjs`
- `pnpm vitest run tests/importer/talent-mappings.spec.mjs`
- `pnpm vitest run tests/importer/talent-import-real-test.spec.mjs`

### Vérifications de revue

- Relire `documentation/importer/talent-import-architecture.md` comme si l'ADR n'existait pas : le lecteur doit comprendre le bon contrat sans dépendre uniquement de la note en tête.
- Vérifier que `module/models/talent.mjs` ne présente plus `node`, `trees`, `row` comme des champs V1 normaux sans qualification.
- Vérifier qu'aucune spec ou test touché par cette US ne réintroduit l'idée de "full talent tree support" côté `Talent.xml`.

---

## 8. Critères d'acceptation

- [ ] `documentation/importer/talent-import-architecture.md` est entièrement cohérent avec ADR-0014, pas seulement son en-tête
- [ ] `module/models/talent.mjs` explicite le statut legacy non canonique V1 de `system.trees`, `system.node`, `system.row`
- [ ] Le mapper talent n'introduit aucune dépendance métier V1 implicite à l'arborescence via `Talent.xml`
- [ ] Les tests d'import talent verrouillent l'absence de persistance de `system.trees/node/row` dans le flux générique
- [ ] L'issue `#22` peut être clôturée avec une note claire sur le périmètre réellement traité et le legacy restant hors scope

---

## 9. Risques et points d'attention

- **Risque de faux alignement documentaire** : ajouter une note ADR sans réécrire le corps du document laisserait subsister l'ambiguïté.
- **Risque de compatibilité legacy** : retirer trop tôt des reliquats du mapper ou du modèle `talent` pourrait casser des chemins encore tolérés.
- **Risque de fermeture prématurée** : clôturer `#22` sans consigner le reliquat legacy restant ferait croire que tout le nettoyage Crucible est terminé.

---

## 10. Résultat attendu

À l'issue de ce plan, `#22` devient clôturable pour de bonnes raisons :

- la décision d'architecture est formalisée ;
- la documentation active raconte le bon modèle ;
- le code signale honnêtement ses reliquats legacy ;
- les tests empêchent la réintroduction d'une confusion entre talent générique, arbre V1 et progression acteur.
