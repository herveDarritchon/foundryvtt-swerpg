---
title: 'ADR-0012: Règles d’écriture des tests unitaires lisibles et diagnostiques'
status: 'Accepted'
date: '2026-05-12'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['tests', 'vitest', 'quality', 'maintainability', 'developer-experience']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette décision définit la règle projet pour l’écriture des tests unitaires afin d’améliorer leur lisibilité, leur maintenabilité et la qualité des diagnostics en cas d’échec.

## Context

Le projet utilise une suite de tests automatisés, notamment avec Vitest. Certains tests comparent directement des structures complexes, comme des tableaux d’objets complets, alors que le contrat métier réellement vérifié porte parfois uniquement sur une propriété ou une valeur spécifique.

Cette pratique produit des erreurs difficiles à lire : les diffs sont verbeux, les différences importantes sont noyées dans la structure, et le développeur doit souvent reconstruire mentalement la valeur attendue, la valeur reçue et l’intention métier du test.

Le besoin est donc de formaliser une règle claire, applicable par tous les contributeurs du projet, humains comme assistants LLM, afin que les tests unitaires échouent avec des messages immédiatement exploitables.

## Decision

Tout test unitaire doit vérifier explicitement le contrat métier le plus simple possible, avec une assertion ciblée, lisible et diagnostique.

En pratique :

1. **Tester la valeur métier pertinente**, pas nécessairement toute la structure retournée.
2. **Extraire les valeurs utiles avant l’assertion** lorsque cela améliore la lisibilité.
3. **Comparer des types simples** dès que possible : chaînes, nombres, booléens, listes d’identifiants.
4. **Ajouter un message explicite à l’assertion** lorsque l’intention métier n’est pas évidente.
5. **Réserver les comparaisons profondes d’objets** aux cas où toute la structure fait réellement partie du contrat testé.

Exemple recommandé :

```js
const result = mapCareerSkills(raw, { strict: true })
const ids = result.map(skill => skill.id)

expect(
  ids,
  'mapCareerSkills strict=true doit conserver uniquement les skills autorisés par SYSTEM.SKILLS'
).toEqual([
  'athletics',
  'perception',
  'deception',
  'science',
  'computers',
  'skulduggery',
])
````

Exemple à éviter si seul l’identifiant est important :

```js
expect(result).toEqual([
  { id: 'athletics' },
  { id: 'perception' },
  { id: 'deception' },
  { id: 'science' },
  { id: 'computers' },
  { id: 'skulduggery' },
])
```

Cette seconde forme reste acceptable uniquement si le contrat testé impose explicitement que chaque objet retourné ait exactement cette structure.

## Consequences

### Positive

* **POS-001**: **Erreurs plus lisibles** - Les échecs de tests affichent directement la valeur métier incorrecte.
* **POS-002**: **Diagnostic plus rapide** - Le développeur identifie plus vite la différence entre valeur attendue et valeur reçue.
* **POS-003**: **Tests plus robustes** - Les tests échouent sur le contrat réellement important, pas sur des détails de structure non pertinents.
* **POS-004**: **Meilleure maintenabilité** - Les refactorings internes cassent moins de tests lorsque le comportement métier reste inchangé.
* **POS-005**: **Standard commun humain/LLM** - Les contributeurs humains et assistants LLM disposent d’une règle explicite pour générer des tests exploitables.

### Negative

* **NEG-001**: **Discipline d’écriture requise** - Les développeurs doivent réfléchir au contrat métier exact avant d’écrire l’assertion.
* **NEG-002**: **Quelques lignes supplémentaires** - L’extraction de valeurs intermédiaires peut allonger légèrement certains tests.
* **NEG-003**: **Risque de sous-tester la structure** - Si la structure complète fait partie du contrat, elle doit rester testée explicitement.

## Alternatives Considered

### Comparer systématiquement les objets complets

* **ALT-001**: **Description**: Utiliser `toEqual` sur les structures complètes retournées par les fonctions.
* **ALT-002**: **Rejection Reason**: Produit des diffs complexes, rend les erreurs moins lisibles et couple les tests à des détails d’implémentation parfois non pertinents.

### Se reposer uniquement sur la configuration Vitest

* **ALT-003**: **Description**: Améliorer uniquement les options de reporting et de diff de Vitest.
* **ALT-004**: **Rejection Reason**: Les options Vitest améliorent l’affichage, mais ne remplacent pas des assertions bien ciblées.

### Multiplier les `console.log` dans les tests

* **ALT-005**: **Description**: Ajouter des logs temporaires pour comprendre les valeurs reçues.
* **ALT-006**: **Rejection Reason**: Les logs ne constituent pas une stratégie durable ; le test lui-même doit produire un diagnostic exploitable.

## Implementation Notes

* **IMP-001**: **Nouveaux tests** - Tout nouveau test doit appliquer cette règle par défaut.
* **IMP-002**: **Tests existants** - Les tests existants doivent être améliorés progressivement lorsqu’ils sont modifiés ou lorsqu’un échec révèle un diagnostic difficile à lire.
* **IMP-003**: **Assertions ciblées** - Préférer `result.map(x => x.id)`, `result.status`, `result.length`, `result.type`, etc., lorsque ces valeurs représentent le contrat testé.
* **IMP-004**: **Messages explicites** - Ajouter un message dans `expect(value, message)` lorsque l’intention du test n’est pas immédiatement évidente.
* **IMP-005**: **Comparaisons profondes** - Autoriser `toEqual` sur des objets complets uniquement lorsque la structure complète est volontairement testée.
* **IMP-006**: **Code review** - Les revues de code doivent refuser les tests dont l’échec ne permet pas de comprendre rapidement le problème métier.
* **IMP-007**: **Contributeurs LLM** - Toute génération automatique de tests doit respecter cette règle et privilégier des assertions lisibles plutôt que des snapshots ou diffs massifs.

## References

* **REF-001**: [Vitest - Expect API](https://vitest.dev/api/expect.html)
* **REF-002**: [Vitest - Reporters](https://vitest.dev/config/#reporters)
* **REF-003**: [Vitest - Diff Options](https://vitest.dev/config/#diff)
