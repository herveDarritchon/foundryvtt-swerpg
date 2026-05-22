.vscode<!-- Integration guide: expose OpenCode organisation to Claude Code via symlinks -->

# Claude Code — integration with existing OpenCode organisation

But: vous gardez `opencode.jsonc` et la structure actuelle intactes. Le but
est d'exposer les mêmes fichiers aux deux outils (OpenCode et Claude Code)
sans dupliquer le contenu.

Approche

- créer un répertoire `.claude/` à la racine du dépôt
- créer des liens symboliques depuis `.claude/` vers les ressources canonique
  utilisées par OpenCode (ex: `opencode.jsonc`, `.agents/`, `scripts/`)
- fournir un script idempotent `scripts/claude-setup.sh` pour créer / supprimer
  ces liens

Commandes utiles

Créer les liens (mode effectif):

```bash
./scripts/claude-setup.sh
```

Essayer sans modifier le système (dry-run):

```bash
./scripts/claude-setup.sh --dry-run
```

Supprimer les liens créés par le script:

```bash
./scripts/claude-setup.sh --revert
```

Notes

- Le script est conservateur: il n’écrase pas des fichiers existants qui ne
  sont pas des symlinks, sauf si vous passez `--force`.
- Si Claude Code s’exécute dans un environnement sandboxé qui n’autorise pas
  les symlinks ou l’accès hors de son répertoire de travail, préférez la
  génération d’un fichier de configuration `claude` qui référence les
  chemins plutôt que les symlinks.

Vérification rapide (après setup)

```bash
ls -la .claude
readlink .claude/opencode.jsonc
readlink .claude/agents
```

Rollback

- `--revert` supprime uniquement les symlinks créés par ce script et
  supprime `.claude/` si le dossier est vide.

Sécurité

- Les symlinks créés référencent des fichiers dans ce dépôt. Ne créez pas de
  symlink vers des emplacements sensibles externes.
