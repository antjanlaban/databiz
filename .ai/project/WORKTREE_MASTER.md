# Worktree Master Guide

> **Purpose**: Complete guide for Git worktree isolation in DataBiz Next.  
> **Merged from**: `WORKTREE_GUIDELINES.md` + `WORKTREE_PLAYBOOK.md`

---

## 🚀 Quick Start

### 1. Create Worktree

```bash
# Option A: Using script (recommended)
node scripts/create-worktree.js --domain <domain> --feature <feature> --open

# Option B: Manual
git worktree add ..\databiz-next--<domain>-<feature> -b feature/<domain>-<feature>
cd ..\databiz-next--<domain>-<feature>
```

### 2. Setup Python Environment (Isolated)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Open in VS Code

Open the worktree folder directly (not as workspace subdirectory).

---

## 📋 Before You Start (MANDATORY)

Every agent working in a worktree MUST read these files in order:

1. **`WORKTREE.md`** — Your scope fence and allowed paths
2. **`AGENT_INSTRUCTIONS.md`** — Your exact task
3. **`VALIDATION_CHECKLIST.md`** — Pre-commit checks
4. **`.ai/project/DOMAIN_REGISTRY.yaml`** — Verify slice exists

### Slice Verification

```
Search DOMAIN_REGISTRY.yaml for slice ID (e.g., IMP-DAT-ACT-001)
├── Found → Read user_story and acceptance_criteria
└── NOT found → STOP and ask user to register it
```

---

## 🚧 Fence Rules (Hard Limits)

### ✅ Safe to Work In

- `backend/src/domains/<your-domain>/` — Your feature code
- `backend/tests/domains/<your-domain>/` — Your tests
- `frontend/src/pages/` — UI components
- Your slice files as defined in WORKTREE.md

### ❌ Never Touch Without Approval

- `.github/workflows/` — CI/CD (only in platform worktree)
- `.devcontainer/` — Breaks other environments
- `backend/migrations/versions/` — Unless data-layer feature
- Root config files (`docker-compose.yml`, `package.json`, `pyproject.toml`)
- `.ai/project/DOMAIN_REGISTRY.yaml` — Only update YOUR slice status

---

## 🔄 Standard Workflow

### Develop & Test

```bash
# Work on feature
# Run tests before commit
cd backend && pytest -m "not slow"
```

### Commit & Push

```bash
git add -A
git commit -m "feat(<domain>): description"
git push origin feature/<domain>-<feature>
```

### Create PR → Dev

Target: `dev` branch  
Link: DOMAIN_REGISTRY.yaml slice

---

## 🏁 Worktree Closing Checklist

### Step 1: Local Validation

```bash
# Backend tests
cd backend && pytest -m "not slow"

# Frontend build check
cd frontend && npm run build

# Review changes
git status
git diff --stat
```

### Step 2: Rebase on Latest Dev

```bash
git fetch origin dev
git rebase origin/dev

# On conflicts:
#   1. Resolve in editor
#   2. git add <file>
#   3. git rebase --continue
```

### Step 3: Push (Force-with-Lease)

```bash
# ALWAYS use --force-with-lease after rebase
git push origin feature/<branch> --force-with-lease
```

### Step 4: Create PR

```bash
# GitHub CLI
gh pr create --base dev --title "feat(<domain>): description"

# Or use GitHub web UI
```

### Step 5: Cleanup (After Merge)

```bash
# Go to MAIN repo (not worktree)
cd C:\Users\Antjan\databiz-next

# Remove worktree
git worktree remove ..\databiz-next--<domain>-<feature>

# Remove branch (optional)
git branch -d feature/<domain>-<feature>
```

---

## 🔧 Troubleshooting

### "Worktree already exists"

```bash
git worktree list                              # Check existing
git worktree remove ..\databiz-next--old-one   # Remove stale
```

### Port Conflicts Between Worktrees

Worktrees share the same ports (9000, 9003). Run ONE dev server at a time, or use different ports via `PORT_REGISTRY.yaml`.

### "fatal: invalid reference"

```bash
git checkout dev  # Ensure you're on dev branch first
git worktree add ..\databiz-next--feature -b feature/xyz
```

---

## 🛡 Anti-Hallucination Rules

If uncertain about:

| Topic | Action |
|:------|:-------|
| File path | Use `list_dir` or `file_search` to verify |
| Function signature | Read the source code |
| Module/package | Check `pyproject.toml` or `package.json` |
| Config value | Reference `DOMAIN_REGISTRY.yaml` or `PORT_REGISTRY.yaml` |

**Can't verify → Don't guess → Ask.**

---

## 🤝 Multi-Agent Coordination

Multiple agents can work in parallel worktrees:

- Each worktree = separate branch
- CI gates prevent broken code from reaching `dev`
- No shared state = no race conditions

**Conflict Resolution**:
- If two agents modify same file → merge conflict on GitHub
- Resolve in PR review (human decision)
- Rebase and re-test

---

## 📦 Handoff Protocol

When passing work to another agent:

1. Push branch: `git push origin feature/<branch>`
2. Create PR targeting `dev`
3. Summarize in PR: what you did, what's tested, what's remaining

Next agent reads PR → creates new worktree if needed → continues.

---

**Remember: Your fence keeps you safe AND the project safe.**  
Follow it. Validate before pushing. Ask when unsure. 🚀
