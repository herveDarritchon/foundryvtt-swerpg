---
description: Prepare or create a Pull Request targeting develop
agent: opencode-create-pr
subtask: true
context: fork
---

# /create-pr

Prepare or create a Pull Request from the current work branch to `develop`.

Arguments, if provided: `$ARGUMENTS`

Delegate the whole execution to the `opencode-create-pr` agent.

The command is intentionally thin. It must not duplicate the PR workflow, rewrite the agent rules, or execute Git/GitHub operations itself.

Pass the following request to the agent:

```text
Prepare or create a Pull Request from the current branch to develop.

User arguments:
$ARGUMENTS

Use the project skill `creer-pull-request` as the source of truth for the workflow and safeguards.
Apply the strict Markdown PR body contract before calling `gh pr create`.
Return either the created/existing PR URL or the exact blocking reason.
```
