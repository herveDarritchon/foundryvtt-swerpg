# Plan de correction - talents gratuits de species absents de la vue agregee

**Contexte** : les talents gratuits fournis par la species d'un personnage existent bien sur l'actor, mais ils ne sont pas affiches dans l'onglet talents au niveau de la vue agregee.

---

## Constat

1. L'onglet talents agrege est construit dans `module/applications/sheets/character-sheet.mjs:1010` via `buildOwnedTalentSummary(...)`.
2. `buildOwnedTalentSummary` ne lit aujourd'hui que `actor.system.progression.talentPurchases` dans `module/lib/talent-node/owned-talent-summary.mjs:36-68`.
3. Les talents gratuits de species ne passent pas par `talentPurchases` : ils sont ajoutes comme `Item` embarques dans `module/documents/actor.mjs:401-410`, avec `object.system.isFree = true`.
4. Le schema `talentPurchases` dans `module/models/character.mjs:176-184` est oriente achats d'arbres de specialisation, pas talents gratuits de species.

En l'etat, la vue agregee ignore donc les talents gratuits de species, meme s'ils existent bien sur l'actor.

## Correction ciblee

1. Etendre `buildOwnedTalentSummary(...)` pour fusionner deux sources :
   - les achats de talents via `system.progression.talentPurchases` ;
   - les talents embarques gratuits de species detectes via `actor.items` avec `type === 'talent'` et `system.isFree === true`.
2. Conserver intacte la logique actuelle d'agregation des achats issus des arbres de specialisation.
3. Ajouter pour les talents gratuits de species une source synthetique exploitable par la vue agregee.
4. Afficher cette source cote sheet dans `CharacterSheet.#buildTalentSourceEntries(...)`, en utilisant de preference le nom de la species comme label de source.

## Risque voisin a traiter

`module/documents/actor.mjs:378-380` nettoie `existing.talents`, alors que la species stocke `freeTalents`.

Si l'affichage agrege commence a lire les talents gratuits depuis `actor.items`, un changement de species risque de laisser remonter d'anciens talents gratuits encore embarques sur l'actor.

Correction complementaire recommandee :

1. Ajuster le nettoyage dans `_applyDetailItem()` pour supprimer les anciens talents gratuits de species sur la base de `existing.freeTalents`.
2. Verifier que ce nettoyage reste strictement limite aux talents gratuits portes par la species remplacee.

## Fichiers cibles

1. `module/lib/talent-node/owned-talent-summary.mjs`
2. `module/applications/sheets/character-sheet.mjs`
3. `module/documents/actor.mjs`
4. `tests/lib/talent-node/owned-talent-summary.test.mjs`
5. `tests/applications/sheets/character-sheet-talents.test.mjs`

## Validation ciblee

1. Ajouter un test unitaire prouvant que `buildOwnedTalentSummary(...)` integre un talent gratuit de species present dans `actor.items`.
2. Ajouter un test de sheet prouvant que `context.talents` expose bien ce talent dans la vue agregee avec une source lisible.
3. Ajouter, si le correctif de nettoyage est inclus, un test sur `_applyDetailItem()` garantissant que le remplacement de species retire les anciens talents gratuits embarques.
4. Lancer la validation ciblee :

```bash
pnpm vitest run tests/lib/talent-node/owned-talent-summary.test.mjs tests/applications/sheets/character-sheet-talents.test.mjs
```

5. Si un test est ajoute sur le document actor, etendre la commande a ce fichier de test cible.

## Resultat attendu

1. Les talents gratuits fournis par la species apparaissent dans l'onglet talents, dans la vue agregee.
2. Les talents achetes via arbres de specialisation continuent d'etre consolides comme aujourd'hui.
3. Un changement de species ne laisse pas de talents gratuits obsoletes dans la vue si le nettoyage complementaire est applique.
