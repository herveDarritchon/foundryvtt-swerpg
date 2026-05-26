# MC1 — Extraire les constantes de progression/XP/rangs/coûts métier

**Issue** : [#409 — MC1 — Extraire les constantes de progression/XP/rangs/coûts métier](https://github.com/herveDarritchon/foundryvtt-swerpg/issues/409)

## Objectif

Centraliser les derniers nombres métier encore codés en dur dans les flux de progression personnage (XP, rangs, coûts de skills, caractéristiques et spécialisations) afin d'aligner le domaine avec ADR-0018 et de supprimer les divergences entre calculs, validations et surfaces `SYSTEM.*`.

## Décisions de cadrage

- Réutiliser `SYSTEM.SKILLS.MAX_RANK_AT_CREATION` et `SYSTEM.SKILLS.MAX_RANK` déjà introduites par `#395` ; ne pas recréer un second point de vérité.
- Introduire uniquement les constantes métier manquantes pour les coûts et plafonds encore dispersés (`5`, `+5`, `10`, `6`, première spécialisation gratuite, pénalité hors carrière, etc.).
- Exclure `module/lib/talents/talent-cost-calculator.mjs` du périmètre : logique legacy Crucible déjà dépréciée, sans intérêt pour ce chantier de centralisation métier V1.
- Ne pas mélanger ce chantier avec une refonte UX, i18n ou un changement de règles de progression.

## Étapes d’implémentation

### 1. Poser la surface de constantes métier de progression

**Fichiers cibles** : `module/config/progression.mjs`, `module/config/system.mjs`

**What**

- créer un namespace dédié (`SYSTEM.PROGRESSION`) pour les constantes transverses encore absentes ;
- garder les constantes déjà portées par `SYSTEM.SKILLS` comme source canonique pour les plafonds de skills ;
- documenter explicitement les coefficients métier attendus : coût XP des skills, surcharge hors carrière, coût des caractéristiques, plafonds de caractéristiques, coût de spécialisation et pénalité hors carrière.

**Validation visée** : toutes les règles numériques ciblées sont adressables via une surface de config nommée, stable et lisible.

### 2. Remplacer les magic numbers dans les services de progression

**Fichiers cibles** : `module/lib/skills/skill-cost-calculator.mjs`, `module/lib/skills/trained-skill.mjs`, `module/lib/skills/career-free-skill.mjs`, `module/lib/skills/specialization-free-skill.mjs`, `module/lib/characteristics/characteristic-cost-calculator.mjs`, `module/lib/characteristics/trained-characteristic.mjs`, `module/lib/specializations/specialization-cost-service.mjs`, `module/models/actor-type.mjs`

**What**

- remplacer les littéraux métier par les constantes dédiées ;
- aligner les validations de rang/plafond et les calculateurs de coût sur la même source ;
- conserver le comportement actuel, sans changer les règles métier ni les messages au-delà du strict nécessaire pour lire les nouvelles constantes.

**Validation visée** : les flux `skill`, `characteristic` et `specialization` ne portent plus de nombres métier codés en dur sur les cas couverts par l’issue.

### 3. Verrouiller le contrat par des tests ciblés

**Fichiers cibles** : `tests/config/progression.test.mjs`, tests ciblés sous `tests/lib/skills/`, `tests/lib/characteristics/`, `tests/lib/specializations/` et validation associée côté `actor-type` si déjà couverte

**What**

- ajouter un test contractuel pour chaque constante exportée ;
- couvrir au minimum les cas représentatifs : skill carrière/hors carrière, plafond skill création/hors création, coût caractéristique, plafond caractéristique, spécialisation initiale/gratuite puis coût incrémental et pénalité hors carrière ;
- verrouiller que `#395` reste la source de vérité des plafonds de skills.

**Validation visée** : la centralisation des constantes devient observable et protégée contre toute réintroduction future de magic numbers métier.

## Résultat attendu

- Les règles numériques de progression ciblées sont nommées et exposées via `SYSTEM.*`.
- Les services de coût et de validation réutilisent ces constantes au lieu de littéraux `2/5/6/10` dispersés.
- Le comportement métier reste inchangé ; seule la source de vérité est consolidée.
