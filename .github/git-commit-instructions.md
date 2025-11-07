# Instructions for Git Commit Messages

You are writing commit messages for a professional project in English, following the semantic commit convention.

## 🎯 Objective

Generate informative and consistent commit messages using the following structure.

## 📌 Expected Format

    <type>(<scope>): <short description>

    <optional long description>

    <BREAKING CHANGE: <optional description of the major change>>

## 🧩 Valid Types

Use one of the following types:

- `feat`: adding a new feature
- `fix`: fixing a bug
- `docs`: documentation changes
- `style`: formatting, indentation, spacing, etc., without changing logic
- `refactor`: code refactoring without adding features or fixing bugs
- `perf`: performance improvements
- `test`: adding or updating tests
- `chore`: maintenance tasks (CI, dependencies, scripts...)

## 🧠 Additional Rules

- Use the infinitive form in English (e.g., "add", "fix", "update").
- Do not capitalize the description after the colon.
- Do not end the title line with a period.
- Keep the title line under 72 characters.
- If necessary, add a message body below the title (with a line break) to provide context.
- Mention related issues in the body if needed (e.g., `Closes #42`).

## 🛑 Don’ts

- Do not write in English.
- Do not use vague messages like "update", "changes", "fix bug".
- Do not mix different types of changes in a single commit.

## Full Example

feat(auth): ajout de la connexion via Google OAuth

Ajout de la stratégie OAuth pour permettre la connexion avec un compte Google.
Closes #132.

## 📝 Conclusion

Your goal is to help the team maintain a clear, readable, and useful Git history.
