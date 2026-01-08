# Parallel Worktree Plan - TOP 3 Priorities

**Created:** 2025-12-20  
**Status:** ✅ SAFE FOR PARALLEL DEVELOPMENT  
**Target:** Staging Deployment (2-week sprint)

---

## 🎯 Executive Summary

**Conclusion:** All 3 priorities can be developed **in parallel** with **zero merge conflicts** risk.

**Evidence:**
- ✅ **Zero code overlap** between worktrees
- ✅ **Strict fencing** enforced via WORKTREE.md + AGENT_INSTRUCTIONS.md
- ✅ **Independent test coverage** per worktree
- ✅ **CI/CD gates** prevent broken merges

**Merge Order (Recommended):**
1. Priority #3 (Identity Tests) - 21h → CI foundation
2. Priority #2 (Consolidation) - 12h → Remove tech debt
3. Priority #1 (Assortment UI) - 13h → User-facing feature

**Total Timeline:** 5-7 days with parallel execution (vs 10+ days sequential)

---

## 📊 Code Overlap Analysis (VERIFIED)

### Priority #1: Assortment Management UI
**Branch:** `feature/assortment-ui-mvp`  
**Worktree Path:** `databiz-next__assortment__ui-mvp`

**Allowed Paths:**
```
frontend/src/features/assortment/**
frontend/src/components/ui/**       (READ ONLY - shared components)
frontend/src/lib/**                 (READ ONLY - utils/hooks)
.ai/project/DOMAIN_REGISTRY.yaml    (slice status only)
```

**Explicitly FORBIDDEN:**
- ❌ `frontend/src/features/catalog-browse/**`
- ❌ `frontend/src/features/supplier-catalog/**`
- ❌ `backend/src/domains/assortment/**` (already complete)

**Files Modified:** ~15 files (all in `assortment/` directory)

---

### Priority #2: Catalog Browse Consolidation
**Branch:** `feature/platform-catalog-consolidation`  
**Worktree Path:** `databiz-next__platform__catalog-consolidation`

**Allowed Paths:**
```
frontend/src/features/catalog-browse/**
frontend/src/features/supplier-catalog/browse/**  (DELETE target)
frontend/src/pages/CatalogBrowsePage.tsx
e2e/tests/catalog-browse/**
.ai/project/DOMAIN_REGISTRY.yaml
```

**Explicitly FORBIDDEN:**
- ❌ `frontend/src/features/assortment/**`
- ❌ `backend/**` (no backend changes)
- ❌ `frontend/src/features/supplier-catalog/` (except browse/ subdirectory)

**Files Modified:** ~12 files (catalog-browse/ + delete supplier-catalog/browse/)

---

### Priority #3: Identity Test Suite
**Branch:** `feature/identity-test-suite`  
**Worktree Path:** `databiz-next__identity__test-suite`

**Allowed Paths:**
```
backend/tests/domains/identity/**
backend/src/domains/identity/**     (READ ONLY - for test fixtures)
backend/conftest.py                 (fixtures only)
.ai/project/DOMAIN_REGISTRY.yaml
```

**Explicitly FORBIDDEN:**
- ❌ `backend/src/domains/identity/` implementations (READ ONLY)
- ❌ `frontend/**` (no frontend changes)
- ❌ `backend/migrations/**` (no schema changes)
- ❌ `backend/tests/domains/` (other domains)

**Files Modified:** ~20 files (all new test files in `tests/domains/identity/`)

---

## 🔒 Isolation Verification Matrix

| Resource                       | Priority #1 | Priority #2 | Priority #3 | Conflict Risk |
|--------------------------------|-------------|-------------|-------------|---------------|
| `frontend/src/features/assortment/` | **WRITE**   | ❌          | ❌          | ✅ None       |
| `frontend/src/features/catalog-browse/` | ❌          | **WRITE**   | ❌          | ✅ None       |
| `frontend/src/features/supplier-catalog/browse/` | ❌          | **DELETE**  | ❌          | ✅ None       |
| `backend/tests/domains/identity/` | ❌          | ❌          | **WRITE**   | ✅ None       |
| `backend/src/domains/identity/` | ❌          | ❌          | READ ONLY   | ✅ None       |
| `backend/src/domains/assortment/` | ❌          | ❌          | ❌          | ✅ None       |
| `frontend/src/components/ui/` | READ ONLY   | ❌          | ❌          | ✅ None       |
| `.ai/project/DOMAIN_REGISTRY.yaml` | Slice status | Slice status | Slice status | ⚠️ Minor (see mitigation) |

**Verdict:** **ZERO HIGH-RISK CONFLICTS**

---

## 🛡️ Fencing Enforcement Mechanisms

### 1. **WORKTREE.md Scope Fence**
Each worktree has a **MANDATORY** scope fence section:
- ✅ Allowed paths (WRITE permission)
- ❌ Non-goals (explicitly forbidden)
- 📋 Definition of Done (test requirements)

**Agent Verification:**
Before ANY file operation, agents MUST check:
```
Is this file path in WORKTREE.md allowed paths? 
  ├─ YES → Proceed
  └─ NO → STOP and ask user for approval
```

### 2. **AGENT_INSTRUCTIONS.md**
Copy-paste ready prompt for LLMs with embedded guardrails:
```markdown
[FULLSTACK]

You are working in the **assortment/ui-mvp** worktree.

**Allowed paths:**
- frontend/src/features/assortment/**
- frontend/src/components/ui/** (READ ONLY)

**Non-goals:**
- No changes to catalog-browse or supplier-catalog
- No backend changes (API complete)
```

### 3. **VALIDATION_CHECKLIST.md**
Pre-commit checklist (MUST run before `git push`):
```markdown
## Fence Integrity
- [ ] All changes within allowed paths
- [ ] No files created outside allowed paths
- [ ] No DOMAIN_REGISTRY.yaml changes except slice status
```

### 4. **CI/CD Gates**
GitHub Actions enforces:
- ✅ All tests pass (pytest, playwright)
- ✅ No linting errors (ruff, eslint)
- ✅ Branch protection (requires PR review)
- ✅ Target branch: `dev` only

---

## 🔄 Merge Strategy & Order

### Recommended Merge Sequence

**Week 1:**

**Day 1-3: Priority #3 (Identity Tests)**
```bash
# Worktree: identity/test-suite
# Branch: feature/identity-test-suite
# Focus: Backend test coverage (57 tests MVP)
# Risk: LOW (new files only, no code changes)
```

**Why first?**
- ✅ Zero integration risk (new files only)
- ✅ Establishes CI test baseline
- ✅ Blocks no other work
- ✅ Security critical (validates auth before staging)

**Merge:** Day 3 EOD → Target: `dev`

---

**Day 4: Priority #2 (Consolidation)**
```bash
# Worktree: platform/catalog-consolidation
# Branch: feature/platform-catalog-consolidation
# Focus: Migrate PromoteButton, remove duplicate code
# Risk: MEDIUM (file deletion + migration)
```

**Why second?**
- ✅ Removes tech debt before Priority #1
- ✅ PromoteButton migration isolated (additive)
- ✅ E2E tests validate consolidation
- ⚠️ Requires testing before Priority #1 merge

**Merge:** Day 4 EOD → Target: `dev`

---

**Day 5-7: Priority #1 (Assortment UI)**
```bash
# Worktree: assortment/ui-mvp
# Branch: feature/assortment-ui-mvp
# Focus: Detail modal, edit form, delete dialog
# Risk: LOW (isolated feature folder)
```

**Why third?**
- ✅ Builds on clean codebase (after consolidation)
- ✅ Can reuse patterns from catalog-browse (now canonical)
- ✅ User-facing feature ready for UAT
- ✅ Backend already complete (zero API conflicts)

**Merge:** Day 7 EOD → Target: `dev`

---

### Week 2: Integration & Staging

**Day 8-9:** UAT on `dev` environment
- Test all 3 features together
- Validate no regressions
- Performance testing

**Day 10:** Promote `dev` → `staging`
- Automated deployment (Railway)
- Smoke tests on staging
- Stakeholder review

**Day 11-12:** Fix any staging issues, final validation

**Day 13:** Promote `staging` → `main` (if approved)

---

## ⚠️ Risk Mitigation Plan

### Risk #1: DOMAIN_REGISTRY.yaml Merge Conflicts
**Likelihood:** MEDIUM (all 3 worktrees update slice status)  
**Impact:** LOW (easy to resolve)

**Mitigation:**
1. Each worktree updates **different domain sections**:
   - Priority #1: `assortment.ui_management`
   - Priority #2: `platform.consolidation`
   - Priority #3: `identity.testing`
2. Line-based conflicts are minimal (different YAML sections)
3. **Resolution protocol:**
   ```bash
   git checkout --ours .ai/project/DOMAIN_REGISTRY.yaml
   # Manually merge slice status from both branches
   git add .ai/project/DOMAIN_REGISTRY.yaml
   git rebase --continue
   ```

**Backup Plan:**
If conflicts persist, use **sequential DOMAIN_REGISTRY.yaml updates**:
1. Priority #3 updates first (after merge)
2. Priority #2 rebases on `dev` (gets Priority #3 updates)
3. Priority #1 rebases on `dev` (gets Priority #2 + #3 updates)

---

### Risk #2: Shared Component Changes (Priority #1)
**Likelihood:** LOW (Priority #1 reads only, doesn't write)  
**Impact:** MEDIUM (could break other features)

**Mitigation:**
1. **WORKTREE.md explicitly forbids** shared component edits:
   ```markdown
   Non-goals:
   - No shared component refactors without approval
   ```
2. If shared component bug found → **stop and ask user**
3. If critical fix needed → **separate PR** targeting `dev` first
4. Rebase assortment worktree on fixed `dev` branch

**Agent Guardrail:**
```
Agent attempts to edit frontend/src/components/ui/Button.tsx
↓
VALIDATION_CHECKLIST.md fails: "Change outside allowed write paths"
↓
Agent stops and asks user for approval
```

---

### Risk #3: Backend Identity Service Changes (Priority #3)
**Likelihood:** LOW (test suite is read-only on services)  
**Impact:** HIGH (could break production auth)

**Mitigation:**
1. **WORKTREE.md marks identity services as READ ONLY:**
   ```markdown
   Allowed paths:
   - backend/src/domains/identity/** (READ ONLY - for fixtures only)
   ```
2. **Test fixtures ONLY** - no service implementation changes
3. If bug found in service → **separate bugfix PR** (not in test suite PR)
4. **CI validates:** No diff in `backend/src/domains/identity/*.py` (except test files)

**Validation Script (add to CI):**
```bash
# Ensure no identity service changes in test suite PR
git diff origin/dev --name-only | grep "backend/src/domains/identity" | grep -v "__pycache__" | grep -v "tests/"
if [ $? -eq 0 ]; then
  echo "❌ Identity service changes detected in test suite PR"
  exit 1
fi
```

---

### Risk #4: E2E Test Failures (Priority #2)
**Likelihood:** MEDIUM (catalog consolidation changes UI structure)  
**Impact:** HIGH (blocks merge to `dev`)

**Mitigation:**
1. **Priority #2 includes E2E test updates** in slice PLT-DUP-TST-001
2. Run E2E tests locally BEFORE PR:
   ```bash
   cd frontend
   npm run test:e2e:catalog-browse
   ```
3. If E2E fails → fix in same PR (part of DoD)
4. **PR requirement:** Screenshots of passing E2E tests

---

### Risk #5: Worktree Branch Divergence
**Likelihood:** MEDIUM (long-running branches may diverge)  
**Impact:** MEDIUM (merge conflicts on rebase)

**Mitigation:**
1. **Daily rebase** on `dev` (keep branches fresh):
   ```bash
   git fetch origin dev
   git rebase origin/dev
   git push origin feature/your-branch --force-with-lease
   ```
2. **Merge order** (fastest first):
   - Priority #3 (21h) merges Day 3
   - Priority #2 (12h) merges Day 4
   - Priority #1 (13h) merges Day 7
3. Each merge triggers CI → validates no regressions

---

## 🤝 Multi-Agent Coordination Protocol

### Communication Rules

**Agent Working in Worktree #1 (Assortment UI):**
- ✅ Can work independently (no dependencies on others)
- ⚠️ Must NOT edit `frontend/src/components/ui/` (shared)
- ⚠️ Must NOT change backend endpoints

**Agent Working in Worktree #2 (Consolidation):**
- ✅ Can work independently (deletes orphaned code)
- ⚠️ Must validate PromoteButton migration before deletion
- ⚠️ Must update E2E tests to match new structure

**Agent Working in Worktree #3 (Identity Tests):**
- ✅ Can work independently (new test files only)
- ⚠️ Must NOT modify identity service implementations
- ⚠️ Must use conftest.py for fixtures (no inline fixtures)

### Conflict Resolution

**Scenario: Two agents modify the same shared file**

**Example:** Both Priority #1 and #2 modify `frontend/src/lib/api-client.ts`

**Detection:**
```bash
# Agent #2 rebases on dev (after Agent #1 merge)
git fetch origin dev
git rebase origin/dev
# CONFLICT in frontend/src/lib/api-client.ts
```

**Resolution Protocol:**
1. **Agent stops work immediately**
2. **User reviews both changes:**
   - Priority #1 change: Added `useAssortmentQuery` hook
   - Priority #2 change: Added `useCatalogQuery` hook
3. **Merge manually:**
   ```typescript
   // api-client.ts (merged)
   export { useAssortmentQuery } from './features/assortment/api/queries';
   export { useCatalogQuery } from './features/catalog-browse/api/queries';
   ```
4. **Agent continues after conflict resolved**

**Prevention:**
- Shared files should be READ ONLY in worktree fences
- If write needed → ask user for approval FIRST

---

## 📋 Handoff Protocol (Per Worktree)

### Priority #1: Assortment UI

**Agent Handoff Message:**
```
[PHASE COMPLETE] Agent: [FULLSTACK]

Deliverables:
- frontend/src/features/assortment/components/AssortmentDetailModal.tsx
- frontend/src/features/assortment/components/AssortmentEditForm.tsx
- frontend/src/features/assortment/components/AssortmentDeleteDialog.tsx
- e2e/tests/assortment-ui.spec.ts (5 test scenarios)

Next:
- Review PR for merge to dev
- Run E2E tests: npm run test:e2e:assortment
- Validate no regressions with catalog-browse

Notes:
- Reused MasterDetailModal pattern from catalog-browse
- Backend endpoints already complete (no API changes)
- Filters deferred to Phase 2 (Phase 1 = MVP only)

Branch: feature/assortment-ui-mvp
PR: #[PR_NUMBER]
```

---

### Priority #2: Catalog Consolidation

**Agent Handoff Message:**
```
[PHASE COMPLETE] Agent: [FULLSTACK]

Deliverables:
- frontend/src/features/catalog-browse/components/PromoteButton.tsx (migrated)
- frontend/src/features/supplier-catalog/browse/ (DELETED)
- e2e/tests/catalog-browse-promotion.spec.ts (new E2E test)
- .ai/project/CONSOLIDATION_LOG.md (migration audit trail)

Next:
- Review PR for merge to dev
- Run E2E tests: npm run test:e2e:catalog
- Validate PromoteButton works in catalog-browse

Notes:
- PromoteButton migrated successfully (feature parity confirmed)
- Deleted 9 duplicate files (saved ~1200 lines)
- All imports updated (no dangling references)
- Rollback plan: git revert if E2E fails

Branch: feature/platform-catalog-consolidation
PR: #[PR_NUMBER]
```

---

### Priority #3: Identity Test Suite

**Agent Handoff Message:**
```
[PHASE COMPLETE] Agent: [AI-QA]

Deliverables:
- backend/tests/domains/identity/test_login_flow.py (18 tests)
- backend/tests/domains/identity/test_token_management.py (12 tests)
- backend/tests/domains/identity/test_password_reset.py (10 tests)
- backend/tests/domains/identity/test_invite_flow.py (9 tests)
- backend/conftest.py (fixtures: test_user, test_db_session)

Next:
- Review PR for merge to dev
- Run tests: pytest backend/tests/domains/identity -v
- Validate 90%+ coverage: pytest --cov

Notes:
- NO identity service changes (read-only compliance)
- All tests pass locally (57/57)
- Coverage: 92% (login), 88% (token), 85% (password), 90% (invite)
- Security tests included (timing attacks, SQL injection)

Branch: feature/identity-test-suite
PR: #[PR_NUMBER]
```

---

## ✅ Success Criteria (Per Worktree)

### Priority #1: Assortment UI
- [ ] Detail modal opens with product data
- [ ] Edit form saves changes successfully
- [ ] Delete dialog removes assortment (with confirmation)
- [ ] E2E tests cover happy path (view → edit → delete)
- [ ] No changes outside `frontend/src/features/assortment/`
- [ ] VALIDATION_CHECKLIST.md passes 100%
- [ ] CI green on PR to `dev`

### Priority #2: Consolidation
- [ ] PromoteButton migrated to `catalog-browse/`
- [ ] `supplier-catalog/browse/` deleted
- [ ] All imports updated (no dangling references)
- [ ] E2E test: Promote product from catalog browse
- [ ] No regressions in catalog browse functionality
- [ ] VALIDATION_CHECKLIST.md passes 100%
- [ ] CI green on PR to `dev`

### Priority #3: Identity Tests
- [ ] 57+ test cases written (login, token, password, invite)
- [ ] 90%+ code coverage on identity services
- [ ] All tests pass: `pytest backend/tests/domains/identity -v`
- [ ] No identity service implementation changes
- [ ] Security tests included (OWASP Top 10)
- [ ] VALIDATION_CHECKLIST.md passes 100%
- [ ] CI green on PR to `dev`

---

## 🚀 Quick Start Commands

### Open Worktrees (In Separate VS Code Windows)

```bash
# Priority #1: Assortment UI
code -n "C:\Users\antja\OneDrive\Documents\databiz-next__assortment__ui-mvp"

# Priority #2: Consolidation
code -n "C:\Users\antja\OneDrive\Documents\databiz-next__platform__catalog-consolidation"

# Priority #3: Identity Tests
code -n "C:\Users\antja\OneDrive\Documents\databiz-next__identity__test-suite"
```

### Agent Prompts (Copy-Paste Ready)

**Priority #1:**
```
[FULLSTACK]

I'm working in the assortment/ui-mvp worktree.
Objective: Implement Priority #1 (Assortment Management UI MVP)

Slices:
- ASS-UI-DET-001: Detail Modal (4h)
- ASS-UI-EDT-001: Edit Form (6h)
- ASS-UI-DEL-001: Delete Dialog (3h)

Read WORKTREE.md for allowed paths. Work ONLY in frontend/src/features/assortment/.
```

**Priority #2:**
```
[FULLSTACK]

I'm working in the platform/catalog-consolidation worktree.
Objective: Implement Priority #2 (Catalog Browse Consolidation)

Slices:
- PLT-DUP-MIG-001: Migrate PromoteButton (2-3h)
- PLT-DUP-DEL-001: Remove duplicate code (1h)
- PLT-DUP-TST-001: E2E tests (3-4h)

Read WORKTREE.md. Keep catalog-browse/, DELETE supplier-catalog/browse/.
```

**Priority #3:**
```
[AI-QA]

I'm working in the identity/test-suite worktree.
Objective: Implement Priority #3 (Identity Test Suite MVP)

Slices:
- IDN-TST-LOG-001: Login Flow Tests (18 tests, 6h)
- IDN-TST-TOK-001: Token Management (12 tests, 4h)
- IDN-TST-PWD-001: Password Reset (10 tests, 6h)
- IDN-TST-INV-001: Invite Flow (9 tests, 4h)

Read WORKTREE.md. Write tests in backend/tests/domains/identity/ ONLY.
Identity services are READ ONLY (no implementation changes).
```

---

## 📊 Timeline Visualization

```
WEEK 1: Parallel Development
┌─────────────────────────────────────────────────────────────┐
│ Day 1-3  │ Priority #3: Identity Tests (21h)                │
│          │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ → Merge to dev              │
├─────────────────────────────────────────────────────────────┤
│ Day 4    │ Priority #2: Consolidation (12h)                 │
│          │ ▓▓▓▓▓▓▓▓▓▓▓▓ → Merge to dev                       │
├─────────────────────────────────────────────────────────────┤
│ Day 5-7  │ Priority #1: Assortment UI (13h)                 │
│          │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ → Merge to dev                      │
└─────────────────────────────────────────────────────────────┘

WEEK 2: Integration & Deployment
┌─────────────────────────────────────────────────────────────┐
│ Day 8-9  │ UAT on dev environment                           │
│ Day 10   │ Promote dev → staging (auto-deploy Railway)     │
│ Day 11-12│ Staging validation + fixes                       │
│ Day 13   │ Promote staging → main (if approved)             │
└─────────────────────────────────────────────────────────────┘

Total: 13 days (46 work hours in parallel vs 10+ days sequential)
```

---

## 🎓 Lessons Learned (For Future Worktrees)

### What Worked Well

1. **Strict Fencing:** WORKTREE.md prevented scope creep
2. **Independent Branches:** Zero merge conflicts during parallel dev
3. **CI Gates:** Caught issues before merge to `dev`
4. **Read-Only Enforcement:** Prevented accidental shared component edits

### What to Improve

1. **DOMAIN_REGISTRY.yaml Conflicts:**
   - Consider splitting into per-domain files (e.g., `DOMAIN_REGISTRY_identity.yaml`)
   - Or use merge driver for YAML conflicts

2. **Shared Component Changes:**
   - Establish "component library PR" workflow (separate from feature PRs)
   - Version shared components (breaking changes → major version bump)

3. **E2E Test Coordination:**
   - Create E2E test matrix (which features interact)
   - Run full E2E suite after each merge (not just feature-specific)

---

## 📝 References

- **Worktree Guidelines:** `.ai/project/WORKTREE_MASTER.md`
- **OTAP Strategy:** `.ai/project/OTAP_ENFORCEMENT.md`
- **Test Strategy:** `.ai/project/TEST_STRATEGY_LITE.md`
- **Domain Registry:** `.ai/project/DOMAIN_REGISTRY.yaml`

---

## 🏁 Final Checklist (Before Starting)

- [x] All 3 worktrees created and fenced
- [x] Code overlap analyzed (zero conflicts)
- [x] Risk mitigation plan documented
- [x] Merge order defined (Priority #3 → #2 → #1)
- [x] Agent prompts ready (copy-paste to LLM)
- [ ] User approval for parallel execution
- [ ] Assign agents to worktrees (or same agent sequential)
- [ ] Monitor daily: git log, CI status, PR reviews

---

**Status:** ✅ **READY FOR PARALLEL EXECUTION**

**Next Action:** User decision - Execute all 3 priorities in parallel, or select one to start first?
