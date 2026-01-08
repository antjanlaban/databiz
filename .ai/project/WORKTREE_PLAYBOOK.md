# Worktree Playbook (Git Fencing for Parallel Work)

> **Purpose**: Isolate multiple development workstreams without branch conflicts or cross-contamination.

---

## Quick Start

### 1. Create a new worktree for your feature

```bash
git worktree add ..\\databiz-next--feature-xyz -b feature/xyz
cd ..\\databiz-next--feature-xyz
```

### 2. Open in VS Code

- Open the worktree folder directly (not as a workspace subdirectory)
- Treat it like a separate project

### 3. Setup Python environment (isolated per worktree)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 4. Develop, test, commit

```bash
# Make changes
# Test
pytest backend/tests/

# Commit from this worktree
git add -A
git commit -m "feat(feature-xyz): ..."
```

### 5. Clean up when done

```bash
# Exit the worktree
cd ..\\databiz-next

# Remove the worktree (prunes the branch)
git worktree remove ..\\databiz-next--feature-xyz
```

---

## Why Worktrees?

| Approach | Isolation | Branch Overhead | Test Independence |
|----------|-----------|-----------------|------------------|
| Branches (with checkout) | ✅ Good | ❌ High (rebuild) | ❌ Shared venv |
| Worktrees | ✅ Excellent | ✅ None | ✅ Per-venv isolation |

---

## Key Rules

1. **One worktree = One feature branch** (never reuse worktrees across features)
2. **Always use separate `.venv`** (prevents dependency conflicts)
3. **Commit from the worktree you changed** (ensures branch is correct)
4. **Delete worktree after merge/abandon** (keeps workspace clean)
5. **Never nest worktrees** (each worktree is a sibling directory)

---

## Workflow Example

### Scenario: Work on Imports domain while Identity tests run

**Terminal 1 (Main worktree):**
```bash
cd c:\Users\Antjan\databiz-next
pytest backend/tests/domains/identity/  # Long-running tests
```

**Terminal 2 (New worktree):**
```bash
cd ..
git worktree add ..\\databiz-next--imports-domain -b feature/imports-domain-work
cd ..\\databiz-next--imports-domain
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt

# Now develop imports features in parallel
# Terminal 1 tests Identity, Terminal 2 builds Imports
```

---

## Troubleshooting

### Problem: "worktree already exists"
```bash
git worktree list  # Check what exists
git worktree remove ..\\databiz-next--old-feature  # Remove stale one
```

### Problem: Port conflicts between worktrees
- Worktrees share the same machines (backend 9000, frontend 9003 are global)
- **Solution**: Run one worktree's dev server at a time, or use different ports
- Use `PORT_REGISTRY.yaml` to allocate temporary ports for parallel work

### Problem: "fatal: invalid reference"
- Ensure you're on the main branch before creating a worktree
- ```bash
  git checkout main
  git worktree add ..\\databiz-next--feature-xyz -b feature/xyz
  ```

---

## Integration with CI/CD

Each worktree has its own branch. When you:
1. Create a PR from `feature/xyz`
2. GitHub Actions runs against that branch
3. Your main worktree stays unaffected

---

## Cleanup Script (Optional)

```bash
# Remove ALL worktrees except main (dangerous, use with caution)
git worktree list | Select-String -NotMatch "main" | ForEach-Object {
  $path = $_ -split '\s+' | Select-Object -First 1
  git worktree remove $path
}
```
