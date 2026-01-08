# WORKTREE.md — Testing Domain Focused Development

**Status**: 🆕 TEMPLATE (Use this when creating a testing worktree)  
**Template Date**: December 17, 2025  
**Purpose**: Scope fence for `databiz-next--testing` worktree  

---

## 1. WORKTREE METADATA

```yaml
worktree_name: databiz-next--testing
branch_name: feature/testing-domain
domain: testing
scope: Testing infrastructure, standards, and CI/CD configuration
created_from: main (December 17, 2025)
estimated_duration: 3-5 days (can be extended)
orchestrator: [ORCHESTRATOR] Agent
```

---

## 2. ALLOWED PATHS (YOU CAN EDIT THESE)

### Documentation & Design
- ✅ `.ai/project/testing-domain/` — Domain documentation (charter, patterns, guides)
- ✅ `.ai/project/DOMAIN_REGISTRY.yaml` — **ONLY the `testing:` section**
- ✅ `.ai/project/DECISION_LOG.md` — Add new testing decisions (DEC-012+)

### GitHub Actions & CI/CD
- ✅ `.github/workflows/test.yml` — Create/update test execution workflow
- ✅ `.github/workflows/lint.yml` — Create/update linting workflow (if needed)

### Backend Test Infrastructure
- ✅ `backend/tests/` — Test patterns, fixtures, conftest.py improvements
- ✅ `backend/pyproject.toml` — **ONLY `[tool.pytest.ini_options]` and `[tool.coverage.*]` sections**
- ✅ `backend/requirements.txt` — Add/update test dependencies (pytest, pytest-cov, mypy, etc.)
- ✅ `backend/run_tests.bat` — Update test execution script

### Frontend Test Infrastructure
- ✅ `frontend/e2e/` — E2E test patterns, playwright.config.ts updates
- ✅ `frontend/package.json` — **ONLY test scripts, NOT dependencies** (use npm install)
- ✅ `frontend/vite.config.ts` — **ONLY if adding test-related Vite config**

### Configuration Files
- ✅ `.env.test` — Test environment variables (create if missing)
- ✅ `.vscode/settings.json` — Python test discovery settings

---

## 3. FORBIDDEN PATHS (DO NOT EDIT)

### Business Logic (Other Domains Own These)
- ❌ `backend/src/domains/identity/` — Identity domain (other worktree)
- ❌ `backend/src/domains/imports/` — Imports domain (other worktree)
- ❌ `backend/src/domains/catalog/` — Catalog domain (future)
- ❌ `frontend/src/pages/` — Frontend pages/components

### Database & Migrations
- ❌ `backend/migrations/` — Database schema (managed separately)
- ❌ `backend/src/shared/database.py` — Core database setup

### Core Infrastructure
- ❌ `backend/src/main.py` — FastAPI app initialization
- ❌ `backend/src/shared/` — Shared utilities (except adding test fixtures)
- ❌ `docker-compose.yml` — Unless adding test service (ask first)

### Version Control & Deployment
- ❌ `.gitignore` — Unless specifically for test artifacts
- ❌ `Dockerfile` — Container configuration
- ❌ Root-level config files (pyproject.toml root section, etc.)

---

## 4. DEFINITION OF DONE (Quality Gate Before Merge)

### Code Quality
- ✅ All new Python files: `mypy --strict` passes
- ✅ All new TypeScript files: `tsc --noEmit` passes (or `npm run type-check`)
- ✅ No `any` types anywhere
- ✅ All imports organized, unused imports removed

### Documentation
- ✅ Updated DOMAIN_REGISTRY.yaml with completed slice IDs (mark as "done")
- ✅ Every slice has acceptance criteria met and documented
- ✅ New patterns documented in `.ai/project/TESTING_DOMAIN_CHARTER.md`
- ✅ Decisions logged in DECISION_LOG.md with rationale

### Testing
- ✅ Backend: `./run_tests.bat` passes all tests
- ✅ Backend: `./run_tests.bat cov` shows ≥40% coverage
- ✅ Frontend: `npm run test` passes (if frontend tests added)
- ✅ No pytest warnings or deprecations

### Git Cleanliness
- ✅ `git status` is clean before merge
- ✅ All commits have descriptive messages: `feat(testing): ...` or `docs(testing): ...`
- ✅ No merge conflicts with main
- ✅ Branch is up-to-date: `git pull origin main`

### Pre-Commit Checklist
```bash
# Run before committing
cd c:\Users\Antjan\databiz-next--testing

# 1. Backend tests
cd backend
./run_tests.bat lint       # Linting
./run_tests.bat type       # Type checking
./run_tests.bat fast       # Fast tests

# 2. Check git status
cd ..
git status

# 3. Review changes
git diff --stat

# 4. Commit with clear message
git add -A
git commit -m "feat(testing): [slice-id] - Clear description"

# 5. Before pushing, ensure main is not ahead
git fetch origin main
git rebase origin/main  # If needed
git push origin feature/testing-domain
```

---

## 5. KEY FILES & REFERENCES

### Must Read Before Starting
1. `.ai/project/testing-domain/TESTING_DOMAIN_CHARTER.md` — This domain's purpose
2. `.ai/project/DOMAIN_REGISTRY.yaml` — Your scope (testing section)
3. `.ai/company/BUSINESS_SYSTEM.md` — How DataBiz projects work
4. `.ai/company/DDD_GUIDE.md` — Domain-Driven Design rules

### Active Context
- `.ai/project/ACTIVE_CONTEXT.md` — Current sprint/focus (if updated)
- `DECISION_LOG.md` — Testing decisions made to date

### Quick References
- Test Strategy: `.ai/project/TEST_STRATEGY_LITE.md`
- Iron Dome Compliance: `.ai/project/IRON_DOME_COMPLIANCE_AUDIT.md`
- Test Explorer Config: `.ai/project/TEST_EXPLORER_CONFIG.md`

---

## 6. COMMON TASKS IN TESTING WORKTREE

### Task: Add a New Test Pattern
1. ✅ Read: TESTING_DOMAIN_CHARTER.md (section on patterns)
2. ✅ Create: `.ai/project/testing-domain/{pattern_name}_GUIDE.md`
3. ✅ Include: Real code examples, do's and don'ts
4. ✅ Update: DOMAIN_REGISTRY.yaml with slice ID (mark as "done")
5. ✅ Commit: `feat(testing): Add {pattern_name} testing guide`

### Task: Set Up GitHub Actions Workflow
1. ✅ Read: `.github/workflows/` existing workflows
2. ✅ Create: `.github/workflows/test.yml` with test stages
3. ✅ Test locally: Check workflow logic (simulate with manual run)
4. ✅ Update: DOMAIN_REGISTRY.yaml slice [TST-INF-CID-001]
5. ✅ Commit: `feat(testing): Implement GitHub Actions test workflow`

### Task: Fix Test Infrastructure Issue
1. ✅ Identify: Which slice is affected? (e.g., TST-INF-TSK-001)
2. ✅ Diagnose: Run `./run_tests.bat check` to see error
3. ✅ Fix: Update config (pyproject.toml, conftest.py, etc.)
4. ✅ Verify: Tests pass again
5. ✅ Commit: `fix(testing): [slice-id] - Specific issue fixed`

---

## 7. COMMUNICATION & ESCALATION

### During Development
- **Blocker**: Can't run tests? → Check `.env.test`, test database connection
- **Conflict**: Unsure if file is in scope? → Ask [ORCHESTRATOR] before editing
- **Design Question**: How should E2E tests be structured? → Ask [QA] persona

### Pre-Merge Review
- **Self-Review**: Run through Definition of Done (section 4) manually
- **Peer Review**: Ask another developer to review WORKTREE.md compliance
- **Orchestrator Approval**: [ORCHESTRATOR] approves before merging to main

### If Scope Changes
- **New Requirement**: Document it in DECISION_LOG.md and update DOMAIN_REGISTRY.yaml
- **Blocked by Other Domain**: Create issue, don't work around it
- **Deadline Pressure**: Communicate early, don't expand scope silently

---

## 8. MERGING BACK TO MAIN

### When Ready to Merge

```bash
# 1. Ensure all changes committed
git status  # Should be clean

# 2. Fetch latest main
git fetch origin main

# 3. Rebase (keep history clean)
git rebase origin/main

# 4. Resolve any conflicts
# (If conflicts: fix files, then git rebase --continue)

# 5. Push to remote
git push origin feature/testing-domain

# 6. Create PR (GitHub UI)
# Title: "feat(testing): [scope] - Clear description"
# Description: Link to DOMAIN_REGISTRY.yaml slices completed

# 7. Wait for CI to pass
# (GitHub Actions should run test.yml workflow)

# 8. Merge via GitHub UI
# Delete remote branch after merge

# 9. Return to main repo, remove worktree
cd c:\Users\Antjan\databiz-next
git pull origin main
git worktree remove ..\databiz-next--testing
```

---

## 9. QUICK START CHECKLIST

- [ ] Worktree created: `git worktree add ../databiz-next--testing -b feature/testing-domain`
- [ ] Navigated to worktree: `cd ../databiz-next--testing`
- [ ] Read TESTING_DOMAIN_CHARTER.md
- [ ] Reviewed DOMAIN_REGISTRY.yaml (testing section)
- [ ] Identified which slice(s) to work on
- [ ] Created local branch tracking `origin/feature/testing-domain`
- [ ] Set up .env.test if needed
- [ ] Verified `./run_tests.bat fast` passes
- [ ] Started development 🚀

---

## 10. TROUBLESHOOTING

### Tests Not Running
```bash
# Verify pytest can see tests
cd backend
.\.venv\Scripts\python.exe -m pytest --collect-only

# If no tests found, check:
# 1. backend/tests/ has __init__.py
# 2. pyproject.toml [tool.pytest.ini_options] is correct
# 3. .venv is activated: .\.venv\Scripts\Activate.ps1
```

### Merge Conflicts with main
```bash
# If conflict during rebase
git status  # Shows conflicted files
# Edit conflicted files, keep testing-domain changes
git add -A
git rebase --continue
```

### Worktree Lock Error
```bash
# If error: "already locked"
# Remove stale lock file:
rm ..\databiz-next--testing\.git\worktrees\...\locked

# Then try again:
git worktree add ../databiz-next--testing -b feature/testing-domain
```

---

## APPENDIX: Example Commits

### Good Commit Messages for Testing Worktree

```
✅ feat(testing): Implement GitHub Actions test workflow [TST-INF-CID-001]
   - Added .github/workflows/test.yml
   - Runs backend tests on every PR
   - Uploads coverage reports
   - Fails if coverage < 40%

✅ docs(testing): Write unit test patterns guide
   - Added UNIT_TEST_PATTERNS.md with 5 detailed examples
   - Covers: Arrange/Act/Assert, fixtures, parametrization
   - Updated DOMAIN_REGISTRY.yaml [TST-STD-UNT-001]

✅ fix(testing): Exclude .archive folder from Playwright discovery
   - Updated playwright.config.ts testDir path
   - Added .archive to .gitignore
   - Resolves: Playwright finding old tests (DEC-010 compliance)

❌ BAD: "updated stuff" (too vague)
❌ BAD: "fix(backend): changed database" (not testing scope)
❌ BAD: "feat: test infrastructure" (no slice ID)
```

---

**Document Status**: 📋 TEMPLATE READY  
**When to Use**: Copy this entire file to the testing worktree root, rename to `WORKTREE.md`  
**Last Updated**: December 17, 2025
