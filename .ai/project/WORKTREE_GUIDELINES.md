# Worktree Agent Guidelines

**All agents working in worktrees MUST follow these universal rules.**

## Before Starting

Every agent working in a worktree must:

1. **Read these files in order:**

   - `WORKTREE.md` — Your scope fence and allowed paths
   - `AGENT_INSTRUCTIONS.md` — Your exact task + copy-paste prompt
   - `VALIDATION_CHECKLIST.md` — Your pre-commit guardrails
   - `.ai/project/DOMAIN_REGISTRY.yaml` — Understand the architecture

2. **VERIFY slice exists in DOMAIN_REGISTRY.yaml:**

   - Search for slice ID (e.g., `IMP-DAT-ACT-001`)
   - If NOT found → STOP and ask user to register it
   - Read user_story and acceptance_criteria before coding
   - Never assume a feature is "implied" by another slice

3. **Understand your constraints:**

   - Allowed paths are **hard limits** — work only in those paths
   - Non-goals are **off-limits** — don't do them even if they seem helpful
   - Definition of Done is **binding** — no exceptions

4. **Never assume:**
   - Always verify file paths before editing (use `find` or `ls`)
   - Always verify function signatures before calling (check imports)
   - Always check if a module exists before importing it
   - Ask for clarification rather than guess

## The "Hallucination Kill Switch"

If you (the agent) are uncertain about:

- A file path or location → **verify it exists first**
- A function or method signature → **read the source code**
- A module or package → **check pyproject.toml or package.json**
- A configuration value → **reference DOMAIN_REGISTRY.yaml or PORT_REGISTRY.yaml**

**If you cannot verify it → don't guess. Stop and ask.**

## Fence Breakout Prevention

Your allowed paths are listed in `WORKTREE.md`. **Do not create or edit files outside these paths.** Specifically:

❌ **Never touch without explicit approval:**

- `.github/workflows/` (unless in platform/otap worktree)
- `.devcontainer/` (it will break other agents' environments)
- `backend/migrations/versions/` (unless implementing a data-layer feature)
- Root config files (`docker-compose.yml`, `package.json`, `pyproject.toml`)
- `.ai/project/DOMAIN_REGISTRY.yaml` (only update your slice status)

✅ **Safe to work in your allowed paths:**

- Feature domains: `backend/src/domains/<your-domain>/`
- Tests: `backend/tests/` or `frontend/tests/`
- Frontend: `frontend/src/pages/`, `frontend/src/components/`, etc.
- CI/CD workflows: `.github/workflows/` (only in platform/otap worktree)

## Code Quality Standards

All agents must follow:

1. **Type safety:**

   - Python: Use Pydantic for validation, SQLAlchemy for DB
   - TypeScript: Use Zod for validation, proper types everywhere
   - No `any` types (TypeScript) or bare `Object` (Python)

2. **Testing:**

   - Unit tests: test individual functions/components
   - Integration tests: test DB transactions, API endpoints
   - E2E tests: Playwright (only in T environment per DEC-010)
   - Coverage target: 70%+ for new code

3. **Documentation:**

   - Comments explain _why_, not _what_
   - Function docstrings describe inputs, outputs, exceptions
   - Complex algorithms get a summary paragraph

4. **Commits:**
   - Format: `type: description` (e.g., `feat: add user login`, `fix: handle null pointer`)
   - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`
   - One logical change per commit (no mixing features + fixes)

## The Validation Checklist is Your Friend

Before pushing, **always** run through `VALIDATION_CHECKLIST.md`. It catches:

- Fence breakouts
- Hallucinated files/modules
- Missing tests
- Secrets in code
- Git hygiene issues

If a check fails → **fix it**. Don't push until all checks pass.

## If You Get Stuck

1. **Check SSOT documents:**

   - `.ai/company/BUSINESS_SYSTEM.md` — Business rules
   - `.ai/company/DDD_GUIDE.md` — Domain-Driven Design
   - `.ai/project/DOMAIN_REGISTRY.yaml` — Architecture
   - `.ai/project/DECISION_LOG.md` — Why things are the way they are

2. **Verify against reality:**

   - Read the actual source file before making assumptions
   - Check test files to understand expected behavior
   - Look at recent commits for context

3. **Ask for clarification:**
   - If the task is ambiguous → ask before guessing
   - If the fence seems wrong → ask before breaking it
   - If tests fail for unclear reasons → ask before hacking a fix

## Multi-Agent Coordination

Multiple agents can work in parallel worktrees without interference:

- Each worktree has its own branch (`feature/domain-feature`)
- CI gates prevent broken code from reaching `dev`
- Branch protection rules ensure PRs are reviewed
- No shared state = no race conditions

**Conflict resolution:**

- If two agents modify the same file → merge conflict on GitHub
- Resolve in PR review (human decision)
- Rebase and re-test

## Handoff Protocol

When passing work to another agent:

1. **Push your branch:** `git push origin feature/your-branch`
2. **Create a PR:** Target `dev`, link to DOMAIN_REGISTRY.yaml slice
3. **Summarize in PR description:**
   - What you did
   - Why you did it
   - What was tested
   - What still needs doing

Next agent will:

- Read the PR
- Understand the context
- Create a new worktree/branch if needed
- Continue from where you left off

---

## 🏁 Worktree Afsluiting Checklist

**Gebruik deze checklist om een worktree netjes af te sluiten en te mergen naar dev.**

### Stap 1: Lokale Validatie

```bash
# Run VALIDATION_CHECKLIST.md checks
# Backend tests
cd backend && pytest -m "not slow"

# Frontend build check
cd frontend && npm run build

# Bekijk alle wijzigingen
git status
git diff --stat
```

### Stap 2: Commit Alle Wijzigingen

```bash
# Commit eventuele linting/formatting fixes
git add -A
git commit -m "style: apply linting and formatting fixes"

# Of squash meerdere kleine commits:
git rebase -i HEAD~3  # Interactief rebasen van laatste 3 commits
```

### Stap 3: Rebase op Laatste Dev

```bash
# Haal laatste dev op
git fetch origin dev

# Rebase je branch bovenop dev (schone lineaire historie)
git rebase origin/dev

# Bij conflicten:
#   1. Los conflict op in editor
#   2. git add <conflicted-file>
#   3. git rebase --continue
#   Of annuleer: git rebase --abort
```

### Stap 4: Push naar Origin

```bash
# Na rebase ALTIJD force-with-lease gebruiken (veilig)
git push origin feature/your-branch --force-with-lease

# NOOIT --force zonder --with-lease (onveilig)
```

### Stap 5: Maak PR naar Dev

```bash
# GitHub CLI (optioneel):
gh pr create --base dev --title "feat(domain): your feature" --body "..."

# Of ga naar GitHub en maak PR handmatig via de link die git push toont
```

### Stap 6: Na Merge - Worktree Opruimen

```bash
# In de HOOFD repo (niet de worktree zelf):
cd /pad/naar/databiz-next

# Verwijder de worktree
git worktree remove ../databiz-next--domain-feature

# Verwijder de branch (optioneel, als gemerged)
git branch -d feature/domain-feature
```

---

### ⚡ Quick Reference (Copy-Paste)

**Standaard worktree afsluiting:**

```bash
# 1. Commit alles
git add -A && git commit -m "style: apply linting fixes"

# 2. Rebase op dev
git fetch origin dev && git rebase origin/dev

# 3. Push
git push origin feature/your-branch --force-with-lease

# 4. Maak PR op GitHub
```

---

## Example: Following the Protocol

**Agent 1 (imports/file-intake):**

```bash
npm run worktree:create -- --domain imports --feature file-intake
# → Opens new worktree
# → Reads WORKTREE.md, AGENT_INSTRUCTIONS.md, VALIDATION_CHECKLIST.md
# → Implements file parsing logic
# → Runs VALIDATION_CHECKLIST.md (all pass)
# → git push origin feature/imports-file-intake
# → Creates PR to dev
```

**Agent 2 (identity/auth):**

```bash
npm run worktree:create -- --domain identity --feature auth
# → Opens new worktree
# → Reads WORKTREE.md, AGENT_INSTRUCTIONS.md, VALIDATION_CHECKLIST.md
# → Implements login flow
# → Runs VALIDATION_CHECKLIST.md (all pass)
# → git push origin feature/identity-auth
# → Creates PR to dev
```

**Human/CI:**

- Reviews both PRs
- Merges Agent 1's PR → triggers CI → passes
- Merges Agent 2's PR → triggers CI → passes
- Promotes dev → staging (auto-deploys to A)
- Promotes staging → main (auto-deploys to P)

No conflicts. All parallel. Fully gated. ✅

---

**Remember: Your fence keeps you safe AND it keeps the project safe.**

Follow it. Validate before pushing. Ask when unsure.

Happy coding! 🚀
