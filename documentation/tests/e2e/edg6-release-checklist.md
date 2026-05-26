# Checklist de release — `e2e:documentation` (EDG6)

Ce document fournit la séquence courte et exécutable pour conclure qu'un guide documentaire peut être rerun, relu et diffusé sans ambiguïté.

Il clôt le chantier EDG6 : stabilité des captures, sûreté des données et checklist de release.

---

## Séquence canonique de release documentaire

### Ordre obligatoire

```
1. Préparer le monde documentaire
2. Lancer la capture (Playwright)
3. Vérifier les artefacts produits (screenshots + JSON)
4. Générer le guide Markdown
5. Relire le guide généré (humain)
```

### Étape 1 — Préparer le monde documentaire

- [ ] L'instance Foundry est accessible à l'URL configurée dans `E2E_FOUNDRY_BASE_URL` (port 30000 par défaut).
- [ ] Le fichier `.env.e2e.documentation` est configuré (copier depuis `.env.e2e.documentation.example` si absent).
- [ ] Le monde documentaire (`documentation-world` ou valeur de `E2E_FOUNDRY_WORLD`) est dans un état **stable et représentatif** des captures attendues.
- [ ] Le monde documentaire est **distinct** du monde de production et du monde de régression (`Swerpg-Regression-World`).
- [ ] Aucune donnée sensible, client, ou non maîtrisée n'est présente dans le monde documentaire.

### Étape 2 — Lancer la capture (Playwright)

```bash
# Run complet de la suite documentaire
pnpm e2e:documentation

# Run ciblé sur un seul parcours
pnpm e2e:documentation -- e2e/documentation/specs/character-sheet.guide.spec.ts

# Run avec navigateur visible (debug)
pnpm e2e:documentation:headed
```

**Preuves minimales à conserver :**

- [ ] La commande s'est terminée sans erreur de spec.
- [ ] Aucune erreur navigateur inattendue (`console.error` non filtré, `pageerror`) dans la sortie.
- [ ] Le report Playwright est disponible : `pnpm exec playwright show-report playwright-documentation-report`

### Étape 3 — Vérifier les artefacts produits

Après le run, vérifier manuellement :

```
documentation-output/
  screenshots/<guide>/
    01-<slug>.png   ← présent, lisible, dans le bon ordre
    02-<slug>.png
    …
  guides/
    <guide>.json    ← présent, cohérent avec les étapes capturées
```

**Contrôle de stabilité :**

- [ ] Les captures sont dans l'ordre stable attendu (préfixe `01-`, `02-`, `03-`, `04-`).
- [ ] Les noms de fichier sont déterministes (slug kebab-case, sans espace ni caractère aléatoire).
- [ ] Le viewport est constant (1920×1080 configuré dans `playwright.documentation.config.ts`).
- [ ] Pas de bruit parasite visible (animations gelées, overlays fermés, apps fermées).

**Contrôle de sûreté des données :**

- [ ] Aucun identifiant réel d'utilisateur ou de compte visible dans les captures.
- [ ] Aucune donnée client ou de production dans les captures, le JSON ou le futur Markdown.
- [ ] Aucun secret, URL non prévue, ou token visible dans les artefacts.
- [ ] Les noms d'artefacts éphémères utilisent le préfixe `Doc-` + horodatage — aucune donnée personnelle.
- [ ] Le JSON intermédiaire ne contient que les métadonnées déclarées : titre, actions, états attendus, chemins de screenshots.

**Contrôle de cohérence JSON :**

- [ ] Le nombre d'étapes dans le JSON correspond au nombre de captures présentes dans `screenshots/<guide>/`.
- [ ] Chaque `screenshotPath` dans le JSON pointe vers un fichier réellement présent.
- [ ] L'ordre des étapes dans le JSON est aligné avec l'ordre des captures (index `01-`, `02-`, …).

### Étape 4 — Générer le guide Markdown

```bash
# Générer tous les guides disponibles
pnpm run docs:generate-user-guides

# Générer un guide ciblé
pnpm run docs:generate-user-guides -- --guide character-sheet
```

**Preuves minimales à conserver :**

- [ ] La commande s'est terminée sans erreur (fichier JSON source présent, dossier screenshots présent).
- [ ] Le fichier Markdown est présent dans `documentation-output/markdown/<guide>.md`.
- [ ] Les chemins de screenshots dans le Markdown sont relatifs et stables.

### Étape 5 — Relecture humaine

- [ ] Un lecteur Dev/QA confirme que les captures sont à jour et représentatives de l'interface actuelle.
- [ ] Un lecteur Documentation/PO relit le contenu Markdown sur le fond fonctionnel.
- [ ] Aucune information hors JSON source n'a été introduite par la génération.
- [ ] Le guide est compréhensible et exploitable par un utilisateur final.

**Signal de diffusion :**

Le guide ne peut être diffusé qu'après validation explicite de Documentation/PO.
La validation Dev/QA seule ne suffit pas pour autoriser la publication.

---

## Écarts tolérés vs écarts bloquants

### Écarts tolérés avant release documentaire

| Écart                                                              | Tolérance                                           |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Légère variation de rendu due à la police ou au zoom               | Toléré si le contenu reste lisible et représentatif |
| Durée de chargement variable selon l'environnement                 | Toléré si `networkidle` stabilise les captures      |
| Captures partiellement décalées d'1-2px entre reruns               | Toléré — pas de comparaison pixel-à-pixel           |
| Artefacts d'un run précédent présents dans `documentation-output/` | Toléré — les fichiers sont écrasés lors du rerun    |

### Écarts bloquants avant release documentaire

| Écart                                                                | Statut                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| Capture manquante ou fichier PNG corrompu                            | **Bloquant** — rerun obligatoire                       |
| Ordre des captures incohérent avec le JSON                           | **Bloquant** — rerun obligatoire                       |
| Nom de fichier contenant un horodatage ou un identifiant aléatoire   | **Bloquant** — rerun et correction de la spec          |
| Donnée sensible, client ou non maîtrisée visible dans une capture    | **Bloquant** — nettoyage du monde et rerun obligatoire |
| Erreur navigateur inattendue non filtrée pendant le run              | **Bloquant** — investigation et rerun après correction |
| JSON incohérent avec les captures (étape manquante, chemin invalide) | **Bloquant** — rerun obligatoire                       |
| Guide généré contenant des informations hors JSON source             | **Bloquant** — investigation du générateur Markdown    |

---

## Données interdites dans les artefacts

Les catégories suivantes ne doivent **jamais** apparaître dans `screenshots/`, `guides/*.json` ou `markdown/*.md` :

| Catégorie                   | Exemples                                                                 | Mécanisme d'évitement                                  |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Identifiants réels          | Noms d'utilisateurs réels, comptes client, emails                        | Monde dédié, noms neutres (`Doc-*`)                    |
| Données client              | Personnages issus d'une campagne réelle, données de jeu partagées        | Monde dédié isolé                                      |
| Secrets et tokens           | Mots de passe, clés API, tokens de session visibles                      | Monde dédié, captures sans zone sensible               |
| URLs non prévues            | Redirections vers un autre environnement, URLs de production dans le DOM | Contrôle du point d'entrée avant run                   |
| Bruit de session            | Notifications d'usage Foundry, alertes de mise à jour, popups de cookies | `dismissOverlayIfPresent` + `closeAllOpenApplications` |
| Données non représentatives | États d'erreur, données de migration incomplète                          | État stable du monde avant run                         |

**Mécanismes en place :**

- Le monde documentaire est distinct du monde de production (pas de données partagées).
- Chaque prérequis contrôlé utilise un préfixe neutre `Doc-` + horodatage — pas de nom personnel ou client.
- Le helper `prepareDocumentationState` ferme les overlays et les applications avant chaque capture.
- Les animations sont désactivées — pas d'état intermédiaire capturé par inadvertance.
- Le JSON ne contient que les métadonnées déclarées dans la spec — pas d'injection automatique de contenu externe.

---

## Feu vert documentaire vs release applicative globale

La clôture EDG6 s'applique **uniquement** au flux documentaire `e2e:documentation`.

| Signal                       | Périmètre                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Feu vert documentaire (EDG6) | Captures stables + artefacts sûrs + checklist complète + relecture humaine                   |
| Release applicative globale  | Inclut régression fonctionnelle, smoke, validation métier, tests Vitest — indépendant d'EDG6 |

La suite `e2e:documentation` n'est **jamais** un gate bloquant pour un merge ou une release applicative.
Un guide documentaire non à jour ne bloque pas la livraison — il indique que la documentation est à régénérer.

---

## Références

- Contrat d'exploitation complet : `e2e/documentation/README.md`
- Guide Playwright E2E (incluant la checklist PWE6) : `documentation/tests/e2e/playwright-e2e-guide.md`
- Matrice de couverture : `documentation/tests/e2e/couverture-e2e-matrice.md`
- Helpers documentaires : `e2e/documentation/utils/`
- Configuration Playwright documentation : `playwright.documentation.config.ts`
