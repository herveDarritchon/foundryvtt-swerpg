# Scénarios de validation — Commande OpenCode d'exploration en lecture seule

**Issue** : [#268 — OpenCode - Cadrer un workflow d'exploration en lecture seule de bout en bout](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/268)
**Doctrine de référence** : `documentation/cadrage/llm/cadrage-opencode-configuration.md` (section 18)
**Spécification** : `documentation/spec/llm/opencode-exploration-readonly-command.md`

---

## Scénario 1 — Compréhension d'une convention

**Entrée** : « Où est définie la fonction `calcSkillRank` et combien de paramètres prend-elle ? »

**Comportement attendu** :
- Recherche de la fonction par grep textuel.
- Lecture du fichier contenant la définition.
- Lecture du contexte proche pour identifier les paramètres.

**Format de sortie attendu** :
```markdown
## Résumé
Recherche de `calcSkillRank` dans le codebase. La fonction est définie dans `module/lib/skill-ranks.mjs`.

## Constats
- Fichier : `module/lib/skill-ranks.mjs:12`
- Signature : `calcSkillRank(actor, skillId, options)`
- 3 paramètres : `actor` (SwerpgActor), `skillId` (string), `options` (object optionnel)

## Suite recommandée
Fin — la question est résolue.
```

**Critère d'acceptation** : la sortie contient le fichier, la ligne et la signature réels.

---

## Scénario 2 — Cartographie d'un module

**Entrée** : « Liste tous les fichiers du module `module/importer/` et leur rôle principal. »

**Comportement attendu** :
- Recherche par glob de tous les fichiers dans `module/importer/`.
- Analyse rapide du rôle de chaque fichier (par le nom, les exports, ou l'en-tête).

**Format de sortie attendu** :
```markdown
## Résumé
Cartographie du module `module/importer/` (N fichiers).

## Constats
- `module/importer/items/weapon-ogg-dude.mjs` — Import des armes OggDude
- `module/importer/items/armor-ogg-dude.mjs` — Import des armures OggDude
- `module/importer/items/gear-ogg-dude.mjs` — Import de l'équipement OggDude
- ...

## Suite recommandée
Fin — la cartographie est complète.
```

**Critère d'acceptation** : chaque fichier est listé avec un rôle correctement identifié.

---

## Scénario 3 — Identification de fichiers concernés

**Entrée** : « Quels fichiers faut-il modifier pour ajouter un nouveau type de compétence ? »

**Comportement attendu** :
- Recherche des fichiers qui définissent les types de compétences.
- Analyse des fichiers de config, data model, et templates concernés.
- Synthèse documentaire sans proposition de plan.

**Format de sortie attendu** :
```markdown
## Résumé
Identification des fichiers impactés par l'ajout d'un type de compétence.

## Constats
- `module/config/attributes.mjs` — Définition des types de compétences existants
- `module/models/actor-type.mjs` — Data model contenant les skills
- `templates/sheets/partials/_skills.hbs` — Template d'affichage
- `lang/en.json` et `lang/fr.json` — Clés i18n des types

## Suite recommandée
Planification — un plan d'implémentation serait utile avant de modifier ces fichiers.
```

**Critère d'acceptation** : la liste inclut au moins les fichiers de config, modèle et templates.

---

## Scénario 4 — Vérification d'une règle documentée

**Entrée** : « Vérifie que l'ADR-0011 est bien respectée dans le code actuel. »

**Comportement attendu** :
- Lecture de l'ADR-0011 pour identifier la règle.
- Recherche dans le code des patterns conformes ou non conformes.
- Synthèse factuelle.

**Format de sortie attendu** :
```markdown
## Résumé
Vérification de l'application d'ADR-0011 dans le code.

## Constats
- L'ADR impose le stockage dans `flags.swerpg.logs` : ✅ respecté dans `module/utils/audit-log.mjs`
- Aucune écriture directe dans `system.*` pour les logs : ✅ vérifié
- ...

## Suite recommandée
Fin — la règle est correctement appliquée.
```

**Critère d'acceptation** : la sortie cite des fichiers et lignes précis avec verdict ✅/❌.

---

## Scénario 5 — Refus correct d'une demande d'écriture

**Entrée** : « Trouve où est défini le seuil de blessure et ajoute un commentaire pour le documenter. »

**Comportement attendu** :
- Identification du fichier contenant le seuil de blessure.
- Refus explicite de modifier le fichier.
- Proposition d'escalade vers documentation ou implémentation.

**Format de sortie attendu** :
```markdown
## Résumé
Recherche du seuil de blessure effectuée. La demande d'écriture est hors périmètre.

## Constats
- Fichier : `module/lib/soak.mjs:24`
- La constante `WOUND_THRESHOLD` est définie ici.

## Suite recommandée
Cette demande nécessite une écriture de code ou de documentation, ce qui dépasse le périmètre d'exploration. Merci de reformuler avec :
- `plan-depuis-issue` pour planifier l'ajout de documentation
- `implementer-depuis-plan` pour implémenter le changement
```

**Critère d'acceptation** : le constat est fourni mais le fichier n'est pas modifié.

---

## Scénario 6 — Escalade correcte vers planification

**Entrée** : « J'aimerais ajouter un nouveau type d'item. Fais-moi un plan. »

**Comportement attendu** :
- Identification des fichiers concernés par l'ajout (exploration).
- Refus de produire le plan dans le workflow d'exploration.
- Escalade vers `plan-depuis-issue`.

**Format de sortie attendu** :
```markdown
## Résumé
Analyse exploratoire du périmètre « ajouter un nouveau type d'item ».

## Constats
- Les types d'items sont enregistrés dans `module/config/system.mjs`
- Chaque type a un data model dans `module/models/`
- ...

## Suite recommandée
Cette demande nécessite une planification. Utilise `plan-depuis-issue` avec le résultat de cette exploration.
```

**Critère d'acceptation** : l'exploration livre ses constats puis oriente vers le skill de planification.

---

## Scénario 7 — Demande hors sujet

**Entrée** : « Quelle est la météo aujourd'hui ? »

**Comportement attendu** :
- Constat que la question ne relève pas du projet SWERPG.
- Réponse explicite sur les limites du périmètre.

**Format de sortie attendu** :
```markdown
Cette question ne concerne pas le codebase SWERPG. Le workflow d'exploration est limité à l'analyse du projet. Je ne peux pas répondre à cette demande.
```

**Critère d'acceptation** : pas de tentative de réponse hors périmètre, pas de perte de temps sur une recherche externe.

---

## Scénario 8 — Escalade vers implémentation

**Entrée** : « Maintenant que tu as trouvé le fichier, ajoute la fonction manquante. »

**Comportement attendu** :
- Constat qu'une exploration a déjà eu lieu.
- Refus d'implémenter dans le workflow d'exploration.
- Escalade vers `implementer-depuis-plan`.

**Format de sortie attendu** :
```markdown
## Suite recommandée
Cette demande nécessite une implémentation, ce qui dépasse le périmètre d'exploration. Utilise `implementer-depuis-plan` avec un plan préalable.
```

**Critère d'acceptation** : pas de code écrit, escalade claire.

---

## Résumé des cas couverts

| # | Type | Périmètre |
|---|---|---|
| 1 | Compréhension de convention | Recherche ciblée, lecture de code |
| 2 | Cartographie de module | Glob, analyse de rôle des fichiers |
| 3 | Identification de fichiers impactés | Recherche transverse, synthèse |
| 4 | Vérification de règle documentée | ADR vs code réel, verdict |
| 5 | Refus de demande d'écriture | Blocage correct sans modification |
| 6 | Escalade vers planification | Constats + routage |
| 7 | Demande hors sujet | Refus poli, pas d'action |
| 8 | Escalade vers implémentation | Refus + routage |
