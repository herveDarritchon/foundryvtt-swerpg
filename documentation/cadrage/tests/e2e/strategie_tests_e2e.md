## 1. Principe directeur

Un test E2E doit répondre à cette question :

> “Est-ce qu’un utilisateur réel, dans Foundry, peut encore accomplir un parcours critique de bout en bout après mes changements ?”

Il ne doit pas répondre à :

> “Est-ce que chaque règle métier, chaque calcul d’XP, chaque effet de talent, chaque mapping OggDude et chaque edge case est exact ?”

Ça, c’est pour les tests unitaires et d’intégration.

La pyramide de tests reste la référence : beaucoup de tests unitaires, moins de tests d’intégration, très peu de tests E2E. Martin Fowler rappelle que la pyramide vise un portefeuille équilibré avec beaucoup plus de tests bas niveau que de tests haut niveau via interface graphique. Google recommande historiquement un ordre de grandeur 70 % unitaires, 20 % intégration, 10 % E2E, à adapter selon le contexte. ([martinfowler.com][1]) ([Google Testing Blog][2])

Dans ton cas, je viserais même quelque chose comme :

| Niveau           | Rôle dans ton système Foundry                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Unitaires Vitest | Règles pures : XP, compétences, coûts, talents, conditions, validation, mapping                              |
| Intégration      | Interaction entre Document Foundry simulé, services système, importeurs, persistance contrôlée               |
| E2E Playwright   | Parcours utilisateur réels dans Foundry : création, import, drag & drop, achat, roll, combat, affichage chat |

## 2. Ce que les E2E doivent tester

### A. Les parcours critiques utilisateur

C’est le cœur.

Pour ton système Star Wars Edge, je testerais en E2E uniquement les parcours qui prouvent que l’ensemble UI + Foundry + système + données fonctionne ensemble.

Exemples pertinents :

| Domaine E2E                                                                  | Pourquoi c’est E2E                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Créer un acteur personnage depuis Foundry                                    | Valide l’intégration avec l’UI Foundry, les types Actor, la feuille système |
| Ouvrir une feuille personnage                                                | Valide rendu Handlebars/HTML/CSS, données système, hooks Foundry            |
| Choisir espèce / carrière / spécialisation via l’interface                   | Parcours utilisateur central, multi-documents, UI interactive               |
| Modifier une caractéristique ou compétence depuis la sheet                   | Interaction UI + update Actor + rerender                                    |
| Glisser-déposer un item sur un acteur                                        | Très Foundry-spécifique ; difficile à garantir uniquement en unitaire       |
| Acheter une spécialisation / talent depuis l’interface                       | Parcours métier + UI + persistance + état visible                           |
| Lancer un jet depuis la feuille                                              | Valide bouton UI, roller, création ChatMessage, rendu chat                  |
| Démarrer un combat avec un personnage et un PNJ                              | Valide Actor + Combat + initiative + tracker                                |
| Importer un jeu minimal OggDude puis vérifier un acteur/arbre/talent visible | Valide la chaîne complète import → documents → UI                           |

Ici, tu ne testes pas “toutes les règles”. Tu testes que **le système est utilisable dans Foundry**.

Le livre de jeu lui-même montre à quel point les combinaisons carrière/spécialisation/talent/compétences peuvent exploser en complexité, avec des arborescences de talents, des coûts, des compétences de carrière et des effets passifs/actifs ; c’est exactement le type de domaine qu’il faut couvrir majoritairement par tests unitaires/intégration, pas par E2E exhaustifs.

## 3. Ce que les E2E ne doivent pas tester

### A. Les calculs métier purs

À ne pas mettre en Playwright :

| Sujet                                    | Bon niveau de test  |
| ---------------------------------------- | ------------------- |
| Calcul XP disponible / dépensée / gagnée | Unit                |
| Coût d’achat d’une compétence            | Unit                |
| Validation d’une carrière déjà acquise   | Unit                |
| Calcul des rangs de compétence           | Unit                |
| Application d’un talent passif           | Unit ou intégration |
| Transformation OggDude XML → DTO système | Unit                |
| Résolution d’un arbre de talents         | Unit / intégration  |
| Règles de prérequis entre talents        | Unit                |
| Calcul d’encaissement, stress, blessures | Unit                |
| Éligibilité achat/vente marché           | Unit                |

Un E2E peut vérifier **un exemple représentatif** : “quand j’achète ce talent, il apparaît dans la vue consolidée et l’XP baisse”. Mais il ne doit pas tester tous les coûts, toutes les branches, toutes les combinaisons.

### B. Les cas combinatoires

Très mauvais candidat E2E :

> “Tester toutes les espèces × toutes les carrières × toutes les spécialisations × tous les talents.”

C’est précisément ce qui tue une suite E2E.

À la place :

| Besoin                            | Stratégie                           |
| --------------------------------- | ----------------------------------- |
| Vérifier toutes les règles        | Unitaires paramétrés                |
| Vérifier tous les mappings XML    | Tests d’intégration sur fixtures    |
| Vérifier que l’UI fonctionne      | Quelques E2E représentatifs         |
| Vérifier les régressions majeures | Parcours smoke + parcours critiques |

### C. Les détails visuels fins

Playwright peut faire du screenshot testing, mais pour ton projet je serais prudent.

À tester en E2E :

- la sheet s’ouvre ;
- les blocs essentiels sont visibles ;
- les valeurs clés sont affichées ;
- les boutons critiques sont présents ;
- les messages chat ont les bonnes classes ou textes principaux.

À éviter :

- comparer au pixel près une feuille Foundry ;
- valider toute la mise en page ;
- tester les couleurs exactes ;
- tester chaque animation CSS.

Foundry, les polices, le navigateur, le zoom, les assets et les modules peuvent rendre les tests visuels très fragiles.

## 4. Les vrais domaines à couvrir en non-régression E2E

Je structurerais ta suite autour de **domaines de risque**, pas autour de toutes les features.

### Domaine 1 — Boot système Foundry

Objectif : détecter immédiatement si le système ne charge plus.

Tests :

- le monde démarre ;
- le système SWERPG est actif ;
- aucun crash console bloquant ;
- la sidebar Actors/Items est accessible ;
- les templates principaux ne cassent pas.

C’est ton “smoke test” absolu.

### Domaine 2 — Création personnage minimale

Objectif : vérifier qu’un joueur peut créer un personnage jouable.

Parcours :

1. créer un Actor `character` ;
2. ouvrir la sheet ;
3. vérifier les champs de base ;
4. modifier nom / espèce / carrière ou valeurs simples ;
5. sauvegarder ;
6. fermer / rouvrir ;
7. vérifier persistance.

Ce test doit rester simple. Il ne doit pas devenir un tutoriel complet de création de personnage.

### Domaine 3 — Progression personnage

Objectif : vérifier que l’évolution fonctionne via l’interface.

Parcours représentatif :

1. partir d’un personnage fixture ;
2. attribuer XP ;
3. acheter une compétence ;
4. acheter une spécialisation ;
5. acheter un talent accessible ;
6. vérifier XP restant, affichage et persistance.

Ici, tu n’as besoin que d’une carrière, une spécialisation, deux talents. Le reste doit être couvert ailleurs.

### Domaine 4 — Import de données

Objectif : sécuriser le flux le plus risqué : OggDude / compendiums / données système.

Je ferais deux niveaux :

| Test                                                                    | Niveau      |
| ----------------------------------------------------------------------- | ----------- |
| Mapping XML complet vers structure système attendue                     | Intégration |
| Import depuis l’UI Foundry puis vérification que les documents existent | E2E         |

En E2E, ne teste pas tout le contenu importé. Vérifie seulement :

- nombre minimal attendu ;
- présence d’une carrière connue ;
- présence d’une spécialisation connue ;
- ouverture d’un arbre ;
- présence d’un talent connu ;
- absence d’erreur bloquante.

### Domaine 5 — Drag & drop Foundry

Objectif : sécuriser une mécanique très UI/Foundry.

C’est un excellent candidat E2E, car le drag & drop dans Foundry implique souvent :

- DOM ;
- données `DataTransfer` ;
- hooks Foundry ;
- ActorSheet ;
- Item documents ;
- rerender ;
- persistance.

Parcours :

1. créer/importer un item fixture ;
2. ouvrir un acteur ;
3. drag item vers sheet ;
4. vérifier qu’il apparaît dans l’inventaire ;
5. rouvrir la sheet ;
6. vérifier persistance.

### Domaine 6 — Chat et jets de dés

Objectif : vérifier le cœur de la table de jeu.

À tester :

- cliquer un bouton de jet depuis une compétence ;
- un ChatMessage est créé ;
- le message affiche la compétence ;
- les dés / symboles / résultat sont visibles ;
- les classes CSS globales nécessaires au design sont présentes.

À ne pas tester en E2E :

- toutes les probabilités ;
- toute la combinatoire des dés ;
- tous les symboles ;
- tous les cas d’avantage/triomphe/menace.

Ces règles doivent être testées en unitaire sur le roller.

### Domaine 7 — Combat minimal

Objectif : vérifier que l’intégration Foundry Combat ne casse pas.

Parcours :

1. créer un PJ ;
2. créer un PNJ ;
3. créer une scène ou utiliser une scène fixture ;
4. ajouter les tokens ;
5. démarrer le combat ;
6. lancer initiative ;
7. vérifier tracker et tour actif.

À éviter : simuler tout un combat complet avec dégâts, critiques, talents et états. Ce serait lent et fragile.

### Domaine 8 — Migration / compatibilité données

Très important pour un système Foundry.

Les E2E peuvent vérifier :

- ouvrir un acteur créé avec une version précédente de ton schema ;
- vérifier que la sheet ne crashe pas ;
- vérifier qu’une migration s’applique ;
- vérifier que l’acteur reste éditable.

Mais la logique de migration elle-même doit être testée en intégration avec des snapshots de données.

## 5. Le point clé : les fixtures doivent remplacer les longs prérequis UI

Tu as identifié le vrai problème : certains tests exigent “un personnage avec telle carrière, telle spécialisation, tel talent, telle XP, tel item”.

La mauvaise approche :

> Rejouer toute la création du personnage à chaque test.

La bonne approche :

> Avoir des fixtures de monde ou des factories de documents qui créent directement l’état nécessaire.

En E2E, l’interface doit être utilisée pour **l’action que tu veux tester**, pas pour tous les prérequis.

Exemple :

| Test                        | Préparation recommandée                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| Acheter un talent           | Créer directement un personnage avec carrière/spécialisation/XP via fixture |
| Tester la création complète | Utiliser l’UI depuis zéro                                                   |
| Tester le roller            | Créer directement l’acteur avec les compétences nécessaires                 |
| Tester l’inventaire         | Créer directement item + acteur, puis drag & drop via UI                    |
| Tester import OggDude       | Utiliser l’UI d’import, mais avec un XML minimal maîtrisé                   |

Playwright recommande explicitement l’isolation des tests : chaque test doit être indépendant, avec son propre état local, stockage, cookies, etc. ([Playwright][3]) Playwright réalise cette isolation par des Browser Contexts séparés, créés par défaut par le test runner. ([Playwright][4])

Pour Foundry, ça veut dire : **ne pas faire dépendre un test du résultat d’un test précédent**.

## 6. Typologie concrète de ta suite Playwright

Je te recommande trois familles.

### 1. Smoke tests

Très rapides, lancés souvent.

Objectif : “le système n’est pas mort”.

Exemples :

- Foundry démarre ;
- login OK ;
- monde ouvert ;
- création Actor OK ;
- sheet ouverte ;
- aucun crash console majeur.

### 2. Golden paths

Parcours métier critiques, peu nombreux.

Exemples :

- création personnage complète ;
- import OggDude minimal ;
- achat spécialisation/talent ;
- roll compétence ;
- combat minimal.

Ce sont tes vrais tests de non-régression.

### 3. Scenarios de bug fix

Un bug critique corrigé = un E2E seulement si le bug venait d’une interaction UI/Foundry impossible à capter plus bas.

Sinon : test unit/intégration.

Exemple :

| Bug                                      | Niveau recommandé        |
| ---------------------------------------- | ------------------------ |
| Mauvais calcul XP                        | Unit                     |
| Mauvais mapping XML                      | Integration              |
| Bouton UI qui ne déclenche plus l’action | E2E                      |
| ChatMessage invalide dans Foundry v14    | Integration ou E2E léger |
| Drag & drop cassé                        | E2E                      |
| Sheet qui ne rerender plus après update  | E2E                      |

## 7. Règle de décision : “est-ce que ça mérite un E2E ?”

Je te propose cette grille.

Un test mérite Playwright si au moins 2 conditions sont vraies :

| Question                                                       | Oui = E2E probable |
| -------------------------------------------------------------- | ------------------ |
| Est-ce que ça passe par une vraie interaction utilisateur ?    | Oui                |
| Est-ce que ça dépend fortement de Foundry ?                    | Oui                |
| Est-ce que le bug ne serait pas détecté par unit/intégration ? | Oui                |
| Est-ce que c’est un parcours critique MJ/Joueur ?              | Oui                |
| Est-ce que la régression serait bloquante en partie ?          | Oui                |
| Est-ce que ça implique rendu sheet/chat/canvas/sidebar ?       | Oui                |

À l’inverse, si tu peux tester la même chose sans navigateur, sans Foundry réel, sans souris, sans DOM : **ne le fais pas en E2E**.

## 8. Playwright : pratiques à respecter absolument

### A. Utiliser des locators stables

Playwright recommande de privilégier les attributs visibles utilisateur et les contrats explicites comme `getByRole`. ([Playwright][5])

Dans Foundry, tu n’auras pas toujours des rôles accessibles propres. Donc je te conseille d’ajouter volontairement des attributs de test dans tes templates :

```html
<button type="button" data-action="rollSkill" data-testid="skill-roll-vigilance">Vigilance</button>
```

Puis :

```ts
await page.getByTestId('skill-roll-vigilance').click()
```

Je sais que certains puristes préfèrent `getByRole`, mais dans un système Foundry custom, `data-testid` est souvent plus stable que des sélecteurs CSS profonds.

À éviter :

```ts
await page.locator('.window-app .sheet .tab:nth-child(3) button:nth-child(2)').click()
```

C’est fragile.

### B. Utiliser les assertions auto-attendues

Playwright recommande les “web-first assertions”, qui attendent automatiquement que l’état attendu soit atteint. ([Playwright][3])

À privilégier :

```ts
await expect(page.getByText('Bothan')).toBeVisible()
await expect(page.getByTestId('xp-available')).toHaveText('90')
```

À éviter :

```ts
await page.waitForTimeout(1000)
expect(await page.locator('.xp').textContent()).toBe('90')
```

Les tempos sont utiles pour regarder en mode debug, pas pour stabiliser une suite.

### C. Traces, screenshots, vidéos seulement quand utile

Playwright fournit des outils de trace/debug, très utiles pour diagnostiquer les régressions. ([GitHub][6])

Je mettrais :

```ts
use: {
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

Pas de vidéo systématique, sinon tu vas alourdir inutilement les runs.

### D. Ne pas dépendre du hasard

Pour ton roller de dés, c’est crucial.

En E2E, ne teste pas un résultat aléatoire. Teste que :

- le jet est déclenché ;
- le message apparaît ;
- la structure du résultat est présente ;
- les dés affichés correspondent au pool demandé.

Les distributions, symboles, conversions et probabilités doivent être testés en unitaire avec RNG injecté ou seedé.

Les tests flaky sont un problème sérieux : Google définit un test flaky comme un test qui peut réussir ou échouer avec le même code, et cite notamment la concurrence, les comportements non déterministes et l’infrastructure comme causes fréquentes. ([Google Testing Blog][7])

## 9. Architecture recommandée pour tes prérequis

Je créerais une couche dédiée :

```txt
e2e/
  regression/
    specs/
      smoke.spec.ts
      character-creation.spec.ts
      progression.spec.ts
      drag-drop.spec.ts
      chat-roll.spec.ts
      combat.spec.ts
      oggdude-import.spec.ts

    fixtures/
      global-setup.ts
      foundry-login.ts
      world-reset.ts
      actor-factory.ts
      item-factory.ts
      compendium-factory.ts
      test-data/
        character-minimal.json
        character-with-xp.json
        character-with-career-specialization.json
        item-blaster.json
        oggdude-minimal.xml

    helpers/
      foundry-api.ts
      actor-sheet.po.ts
      chat.po.ts
      combat-tracker.po.ts
      sidebar.po.ts
```

### Le point important

Tu dois avoir deux types de setup :

#### Setup par API Foundry

Pour créer vite l’état :

```ts
await createCharacter(page, {
  name: 'E2E Progression Character',
  xp: 100,
  career: 'Explorer',
  specialization: 'Scout',
})
```

#### Action par UI

Pour tester réellement la fonctionnalité :

```ts
await actorSheet.buyTalent('Rapid Recovery')
await expect(actorSheet.talent('Rapid Recovery')).toBeVisible()
```

Autrement dit :

> Préparer par API, agir par UI, vérifier par UI + données.

C’est le bon équilibre.

## 10. Ce que je testerais dans ton système, concrètement

### Pack minimal prioritaire

Je ferais d’abord ces 8 tests E2E, pas plus.

| Priorité | Test                                         | Pourquoi                    |
| -------- | -------------------------------------------- | --------------------------- |
| P0       | Le monde démarre avec le système             | Détecte crash global        |
| P0       | Créer un personnage et ouvrir la sheet       | Parcours de base            |
| P0       | Modifier une donnée et vérifier persistance  | Actor update + rerender     |
| P0       | Lancer un jet de compétence                  | Cœur table de jeu           |
| P1       | Drag & drop item vers acteur                 | Interaction Foundry fragile |
| P1       | Import OggDude minimal                       | Chaîne de données critique  |
| P1       | Acheter spécialisation/talent depuis fixture | Progression personnage      |
| P2       | Combat minimal PJ vs PNJ                     | Intégration combat          |

Ce pack te donnera beaucoup plus de valeur qu’une batterie de 80 tests E2E détaillés.

## 11. Anti-patterns à éviter

### Anti-pattern 1 — Le scénario roman-fleuve

Un test qui fait :

> créer monde → importer tout OggDude → créer personnage → choisir espèce → choisir carrière → choisir spécialisation → acheter compétences → acheter talents → équiper arme → créer PNJ → lancer combat → résoudre attaque.

C’est séduisant. C’est aussi une bombe à flakiness.

À garder éventuellement comme **un seul scénario “journey complet”**, lancé manuellement ou rarement, pas comme base de non-régression quotidienne.

### Anti-pattern 2 — Tester la logique métier par l’UI

Mauvais :

```ts
test('all talent costs are correct through UI', async ...)
```

Bon :

```ts
test.each(talentCostCases)('computes talent cost', ...)
```

Puis un seul E2E :

```ts
test('player can buy an available talent from the sheet', ...)
```

### Anti-pattern 3 — Réutiliser le même monde sale

Si les tests modifient tous le même monde sans reset fiable, tu vas avoir :

- ordre d’exécution implicite ;
- état fantôme ;
- tests qui passent chez toi et cassent ailleurs ;
- bugs impossibles à reproduire.

### Anti-pattern 4 — Trop de dépendance aux textes

Dans ton cas, attention : les libellés peuvent changer, être traduits, ou être stylisés.

Préférer :

```ts
data-testid="career-selector"
data-testid="specialization-card-assassin"
data-testid="buy-talent-dodge"
```

plutôt que des sélecteurs basés uniquement sur le texte visible.

## 12. Ma recommandation stratégique

Ta suite E2E de non-régression doit être conçue comme une **sonde de santé du système dans Foundry**, pas comme une encyclopédie de règles.

La bonne stratégie :

1. **Unit tests massifs** sur règles, calculs, validations, mappings.
2. **Integration tests solides** sur documents Foundry, importeurs, services, migrations.
3. **E2E rares mais très représentatifs** sur les parcours réellement impossibles à garantir sans navigateur + Foundry.
4. **Fixtures agressives** pour éviter de rejouer les prérequis par l’UI.
5. **Un monde de test resettable** ou des factories idempotentes.
6. **Aucun test E2E dépendant d’un autre test.**
7. **Des selectors stables ajoutés volontairement dans tes templates.**

La phrase de cadrage que je mettrais dans ton ADR :

> Les tests E2E Playwright du système SWERPG ne valident pas exhaustivement les règles métier. Ils valident que les parcours critiques MJ/Joueur restent exécutables dans une instance Foundry réelle, avec une couverture ciblée des intégrations UI, documents Foundry, sheets, chat, drag & drop, import et combat. Toute logique déterministe testable sans navigateur doit être couverte en priorité par Vitest, en test unitaire ou d’intégration.

C’est le garde-fou qui t’évitera de transformer Playwright en marteau universel.

[1]: https://martinfowler.com/bliki/TestPyramid.html?utm_source=chatgpt.com 'Test Pyramid'
[2]: https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html?utm_source=chatgpt.com 'Just Say No to More End-to-End Tests'
[3]: https://playwright.dev/docs/best-practices?utm_source=chatgpt.com 'Best Practices'
[4]: https://playwright.dev/docs/browser-contexts?utm_source=chatgpt.com 'Isolation'
[5]: https://playwright.dev/docs/locators?utm_source=chatgpt.com 'Locators'
[6]: https://github.com/microsoft/playwright?utm_source=chatgpt.com 'microsoft/playwright: Playwright is a framework for Web ...'
[7]: https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html?utm_source=chatgpt.com 'Flaky Tests at Google and How We Mitigate Them'
