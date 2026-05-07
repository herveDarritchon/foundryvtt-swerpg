# Analyse de l'Issue #14 - Format canonique de `system.qualities`

## 📋 Contexte

L'issue #14 pose une question d'architecture fondamentale pour le système SWERPG : **le format canonique de `system.qualities`** (qualités d'armes : Blast, Burn, Pierce, Vicious, etc.).

### Problème actuel
- Le format de `system.qualities` **n'est pas clairement défini** ni stabilisé
- Cela impacte : les Items (armes, armures, mods, talents), l'UI, les imports de données (OggDude), et les futures fonctionnalités d'automatisation

### Enjeu
> "C'est le moment de décider **le format canonique** des qualités dans SWERPG. Si on le planifie maintenant, on va le traîner partout (armes, armures, talents, effets, UI, imports...)."

---

## 📋 Questions à trancher

### 1. Usage attendu des qualités dans SWERPG

**Dans la vision cible :**

- [ ] **Affichage uniquement** (le MJ applique les effets à la main) ?
- [x] **Base à de l'automatisation** (modificateurs de dés, effets conditionnels, interactions avec des règles maison, etc.) ?

**À horizon 1-2 versions :**
- [ ] On reste en **100% manuel** (affichage / aide-mémoire) ?
- [x] On vise une **résolution semi-automatisée** basée sur les qualités (au moins pour certaines d'entre elles) ?

---

### 2. Format de base de `system.qualities`

**Aujourd'hui, pour une arme, quel format choisis-tu ?**

#### Option A – Liste de chaînes
```javascript
["blast 2", "burn 2", "pierce 2", "vicious 3"]
```
- ✅ Simple pour l'affichage
- ❌ Difficile pour l'automatisation (parsing nécessaire)

#### Option B – Liste d'objets simples
```javascript
[{ key: "blast", rank: 2 }, { key: "burn", rank: 2 }, ...]
```
- ✅ Structure exploitable
- ✅ Facile à étendre
- ⚠️ Standard de facto pour Foundry

#### Option C – Structure plus riche (avec flags / métadonnées)
```javascript
[{ key: "blast", rank: 2, active: true, source: "base" }]
```
- ✅ Très extensible
- ❌ Plus complexe à maintenir
- ❌ Peut être overkill pour l'instant

**Décision à prendre :** Jusqu'à quel niveau de structure on s'engage maintenant, en cohérence avec les besoins actuels et les futures features.

##### Réponse :
- [ ] Option A – Liste de chaînes
- [ ] Option B – Liste d'objets simples
- [x] Option C – Structure plus riche (avec flags / métadonnées)

---

### 3. Normalisation des clés

**Pour les qualités standard (Blast, Burn, Pierce, Vicious, etc.) :**

- [x] Des **clés normalisées** en anglais (`"blast"`, `"burn"`, `"pierce"`, `"vicious"`) ?
- [ ] Conserver la casse / forme OggDude (`"BLAST"`, `"BURN"`, etc.) ?

**Doit-on définir :**
- [ ] Une **liste fermée** de qualités supportées (enum interne) ?
- [x] Accepter **n'importe quelle clé** venant des datas (extensibilité / contenu maison), quitte à ne pas automatiser toutes les qualités ?

Dans le JdR, on fait souvent du "homebrew" avec des qualités personnalisées. Il faut trouver un équilibre entre :
- **Normalisation** pour les qualités standard (facilite l'automatisation)
- **Flexibilité** pour les qualités maison (permet d'ajouter des effets uniques sans devoir modifier le code)

---

### 4. Gestion des qualités sans rang

**Certaines qualités ont un rang (Blast 2), d'autres non (Accurate, Linked sans chiffre, etc.).**

- [ ] Toujours avoir un champ `rank` numérique (avec `null` ou `1` par défaut pour les qualités "sans rang") ?
- [x] Utiliser un modèle mixte, par ex. :

- ```javascript
  { key: "accurate", hasRank: false }
  ```
- 
- **Objectif :** éviter que le code d'affichage / d'automatisation ne se casse sur les qualités non chiffrées.

Possibilité d'ajouter un champ `hasRank` ou `type` pour différencier les qualités avec et sans rang, afin de faciliter le traitement dans l'UI et les règles d'automatisation.

---

### 5. Unification avec le reste du système

**`system.qualities` doit-il être **le même format partout** pour :**
- Armes ✅
- Armures ❓
- Talents ❓
- Mods / Attachments ❓

- [x] **Oui, format global** (même structure partout)
- [ ] **Non, format local** (spécifique aux armes seulement, les autres auront leur propre format)

**Si Oui :**
- [x] Est-on prêt à **refactoriser** les endroits où un autre format est déjà utilisé ?
- [ ] On impose : *"À partir de maintenant, le format canonique est X, et on migrera le reste plus tard"* (avec un plan de migration explicite à prévoir) ?

#### Piste de solution :
Ne pas hésiter à ajouter un attribut avec une liste d'objets sur lesquels la qualité pourra s'appliquer (armes, armures, talents, mods) pour clarifier les implications de la décision.

---

## 📋 Pistes / options possibles (à discuter)

### Minimaliste / court terme
- `system.qualities` utilisé principalement pour l'affichage
- Liste d'objets simples `{ key, rank }` pour rester exploitable plus tard
- Enum interne "soft" (liste recommandée) mais sans enforcement strict dans le code

### Structurel / moyen terme
- `system.qualities` devient la base d'un système commun de règles :
  - Même structure pour armes / armures / talents
  - Mapping rigoureux depuis OggDude vers un jeu de qualités internes normalisées
  - Préparation explicite à l'automatisation (drapeau `active`, `source`, etc.)

#### Réponse :
- [ ] Minimaliste / court terme
- [x] Structurel / moyen terme

---

## 📋 Critères d'acceptation de l'issue

- [x] Un format canonique de `system.qualities` est défini (structure JSON précise documentée)
- [x] La stratégie de **normalisation des clés** (ex. `blast`, `burn`, ...) est actée
- [x] La gestion des **qualités avec et sans rang** est spécifiée
- [x] La décision "local vs global" (armes seulement vs armes + armures + talents + mods) est documentée
- [x] Les implications sur :
  - Les imports (OggDude et futurs)
  - Les futures features d'automatisation
  sont notées dans la spec / un ADR ou plan d'architecture lié

---

## 📋 Impacts de la décision

**Cette décision impactera :**
1. Le schéma de données des Items
2. Les plans d'implémentation futurs (imports, UI, automatisation)
3. La dette technique et le besoin de migration sur les données existantes

**Recommandation :** Choisir une option qui permet l'évolution vers l'automatisation tout en restant simple à implémenter maintenant.

---

## 📋 Prochaines étapes après ta réponse

Une fois tes réponses données, je mettrai à jour l'issue #14 avec un commentaire récapitulant tes décisions, et on passera à l'implémentation si nécessaire.
