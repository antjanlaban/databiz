# 🚀 Parallel Execution Guide - TOP 3 Priorities

**Status:** ✅ 3 VS Code Windows Geopend  
**Date:** 2025-12-20  
**Mode:** PARALLEL DEVELOPMENT

---

## 🎯 Quick Reference

| Window | Priority | Worktree Path | Branch | Focus | Time |
|--------|----------|---------------|--------|-------|------|
| **1️⃣** | Identity Tests | `databiz-next__identity__test-suite` | `feature/identity-test-suite` | Backend tests | 21h |
| **2️⃣** | Consolidation | `databiz-next__platform__catalog-consolidation` | `feature/platform-catalog-consolidation` | Frontend cleanup | 12h |
| **3️⃣** | Assortment UI | `databiz-next__assortment__ui-mvp` | `feature/assortment-ui-mvp` | Frontend feature | 13h |

---

## 📖 Per Worktree Instructies

### 🔒 Window 1: Identity Test Suite

**Locatie:** `C:\Users\antja\OneDrive\Documents\databiz-next__identity__test-suite`

**Lees eerst:**
1. `WORKTREE.md` - Scope fence
2. `AGENT_INSTRUCTIONS.md` - Agent prompt
3. `VALIDATION_CHECKLIST.md` - Pre-commit checks

**Agent Prompt:**
```
[AI-QA]

I'm working in the identity/test-suite worktree.
Objective: Implement Priority #3 (Identity Test Suite MVP)

Slices to implement:
1. IDN-TST-LOG-001: Login Flow Tests (18 tests, 6h)
   - Valid credentials, invalid password, nonexistent user
   - Inactive user, missing fields, malformed email
   - Rate limiting, refresh token creation, timing attacks
   - SQL injection, concurrent requests, token claims

2. IDN-TST-TOK-001: Token Management Tests (12 tests, 4h)
   - Valid token refresh, expired token, invalid token
   - Revoked token, token rotation, concurrent refresh
   - Token validation edge cases

3. IDN-TST-PWD-001: Password Reset Flow Tests (10 tests, 6h)
   - Valid reset request, invalid email, expired token
   - Token reuse prevention, email sending, security

4. IDN-TST-INV-001: Invite Flow Tests (9 tests, 4h)
   - Valid invite creation, duplicate email, expired invite
   - Accept invite, invalid token, permissions

CRITICAL RULES:
- Write tests in backend/tests/domains/identity/ ONLY
- Identity services are READ ONLY (use for fixtures only)
- NO implementation changes in backend/src/domains/identity/
- Create fixtures in backend/conftest.py
- Target: 57 tests MVP (90%+ coverage)

Implementation sequence:
1. Setup fixtures in conftest.py (user, db_session, mock_email)
2. Implement IDN-TST-LOG-001 (login tests - CRITICAL)
3. Implement IDN-TST-TOK-001 (token tests - CRITICAL)
4. Implement IDN-TST-PWD-001 (password reset - HIGH)
5. Implement IDN-TST-INV-001 (invite flow - HIGH)

Run tests: pytest backend/tests/domains/identity -v
Coverage: pytest backend/tests/domains/identity --cov
```

**Definition of Done:**
- [ ] 57+ test cases written (4 slices)
- [ ] All tests pass locally
- [ ] 90%+ code coverage
- [ ] No identity service changes (READ ONLY)
- [ ] Fixtures in conftest.py
- [ ] Security tests included (OWASP)
- [ ] VALIDATION_CHECKLIST.md passes
- [ ] git push origin feature/identity-test-suite
- [ ] PR created targeting `dev`

---

### 🔄 Window 2: Catalog Consolidation

**Locatie:** `C:\Users\antja\OneDrive\Documents\databiz-next__platform__catalog-consolidation`

**Lees eerst:**
1. `WORKTREE.md` - Scope fence
2. `AGENT_INSTRUCTIONS.md` - Agent prompt
3. `VALIDATION_CHECKLIST.md` - Pre-commit checks

**Agent Prompt:**
```
[FULLSTACK]

I'm working in the platform/catalog-consolidation worktree.
Objective: Implement Priority #2 (Catalog Browse Consolidation)

Background:
- TWO duplicate implementations exist:
  A. frontend/src/features/catalog-browse/ (KEEP - active, better UX)
  B. frontend/src/features/supplier-catalog/browse/ (DELETE - orphaned)
- PromoteButton ONLY exists in B → MUST migrate to A first

Slices to implement:
1. PLT-DUP-INV-001: Feature Inventory (2h) ✅ DONE (in expert analysis)

2. PLT-DUP-MIG-001: Migrate PromoteButton (2-3h)
   - Copy PromoteButton.tsx from supplier-catalog/browse/ to catalog-browse/components/
   - Update imports in CatalogBrowsePage.tsx
   - Test promotion flow works
   - Keep full feature parity

3. PLT-DUP-DEL-001: Remove Duplicate (1h)
   - Delete frontend/src/features/supplier-catalog/browse/
   - Update any remaining imports
   - Verify no dangling references

4. PLT-DUP-TST-001: E2E Tests (3-4h)
   - Create e2e/tests/catalog-browse-promotion.spec.ts
   - Test: Browse catalog → Promote product → Verify in assortment
   - Test: Filter products → Promote → Verify success
   - Test: Error handling (product already promoted)

5. PLT-DUP-DOC-001: Update Documentation (1h)
   - Create .ai/project/CONSOLIDATION_LOG.md (migration audit)
   - Update DOMAIN_REGISTRY.yaml slice status

CRITICAL RULES:
- Work ONLY in frontend/src/features/catalog-browse/** and supplier-catalog/browse/**
- NO changes to frontend/src/features/assortment/**
- NO backend changes
- E2E tests MUST pass before merge
- Rollback plan: git revert if issues found

Implementation sequence:
1. Migrate PromoteButton (PLT-DUP-MIG-001)
2. Test promotion flow manually
3. Delete supplier-catalog/browse/ (PLT-DUP-DEL-001)
4. Write E2E tests (PLT-DUP-TST-001)
5. Update docs (PLT-DUP-DOC-001)

Run E2E: npm run test:e2e:catalog-browse
```

**Definition of Done:**
- [ ] PromoteButton migrated to catalog-browse/
- [ ] supplier-catalog/browse/ deleted
- [ ] All imports updated (no dangling refs)
- [ ] E2E test: Promote product works
- [ ] No regressions in catalog browse
- [ ] CONSOLIDATION_LOG.md created
- [ ] VALIDATION_CHECKLIST.md passes
- [ ] git push origin feature/platform-catalog-consolidation
- [ ] PR created targeting `dev`

---

### ✨ Window 3: Assortment UI

**Locatie:** `C:\Users\antja\OneDrive\Documents\databiz-next__assortment__ui-mvp`

**Lees eerst:**
1. `WORKTREE.md` - Scope fence
2. `AGENT_INSTRUCTIONS.md` - Agent prompt
3. `VALIDATION_CHECKLIST.md` - Pre-commit checks

**Agent Prompt:**
```
[FULLSTACK]

I'm working in the assortment/ui-mvp worktree.
Objective: Implement Priority #1 (Assortment Management UI MVP)

Background:
- Backend 100% complete (6 API endpoints exist)
- Frontend 40% complete (basic components exist but not functional)
- Need: Detail view, Edit form, Delete dialog

Slices to implement:
1. ASS-UI-DET-001: Detail Modal (4h)
   - Component: AssortmentDetailModal.tsx
   - Reuse MasterDetailModal pattern from catalog-browse (proven pattern)
   - Show: assortment details, variant table, metadata
   - Use Radix UI Dialog
   - React Query for data fetching

2. ASS-UI-EDT-001: Edit Form (6h)
   - Component: AssortmentEditForm.tsx
   - Fields: name, description, brand, category, active status
   - Validation: Zod schema
   - API: PUT /api/assortments/{id}
   - Success toast, error handling

3. ASS-UI-DEL-001: Delete Dialog (3h)
   - Component: AssortmentDeleteDialog.tsx
   - Confirmation dialog with variant count warning
   - API: DELETE /api/assortments/{id}
   - Cascade warning: "This will delete X variants"
   - Success feedback

OPTIONAL (defer to Phase 2):
4. ASS-UI-FIL-001: Enhanced Filters (8h)
5. ASS-UI-INT-001: Grid Polish (4h)

CRITICAL RULES:
- Work ONLY in frontend/src/features/assortment/**
- NO changes to catalog-browse or supplier-catalog
- NO backend changes (API already complete)
- Reuse patterns from catalog-browse (MasterDetailModal)
- Radix UI for dialogs (already installed)
- React Query for state (already setup)

Implementation sequence:
1. Create AssortmentDetailModal (ASS-UI-DET-001)
2. Integrate modal with AssortmentManagementPage
3. Test detail view with real data
4. Create AssortmentEditForm (ASS-UI-EDT-001)
5. Test edit flow end-to-end
6. Create AssortmentDeleteDialog (ASS-UI-DEL-001)
7. Test delete flow with cascade warning

Run dev: npm run dev:frontend (port 9003)
```

**Definition of Done:**
- [ ] Detail modal shows assortment data
- [ ] Edit form saves changes successfully
- [ ] Delete dialog removes assortment
- [ ] Cascade warning shows variant count
- [ ] E2E test covers happy path (view → edit → delete)
- [ ] No changes outside frontend/src/features/assortment/
- [ ] VALIDATION_CHECKLIST.md passes
- [ ] git push origin feature/assortment-ui-mvp
- [ ] PR created targeting `dev`

---

## 🔄 Workflow Per Window

### Voor elke worktree:

**1. Verify Worktree Context**
```bash
# Check you're in the right worktree
git branch  # Should show feature/[domain]-[feature]
pwd         # Should show worktree path

# Read the fence
cat WORKTREE.md
cat AGENT_INSTRUCTIONS.md
```

**2. Implement Slices**
- Work through slices in order (see agent prompt)
- Commit frequently with descriptive messages
- Follow fence rules (no work outside allowed paths)

**3. Test Locally**
```bash
# Backend tests (Window 1)
pytest backend/tests/domains/identity -v

# Frontend dev server (Windows 2 & 3)
npm run dev:frontend

# E2E tests (Window 2)
npm run test:e2e:catalog-browse
```

**4. Run Validation Checklist**
```bash
# In each worktree before commit
cat VALIDATION_CHECKLIST.md
# Manually verify each item
```

**5. Commit & Push**
```bash
git add -A
git commit -m "feat(domain): implemented slice XYZ"
git push origin feature/[your-branch]
```

**6. Create PR**
- Target branch: `dev`
- Link to DOMAIN_REGISTRY.yaml slices
- Include screenshots/test results

---

## 🚨 Critical Rules (All Worktrees)

### ✅ DO:
- Work ONLY in allowed paths (see WORKTREE.md)
- Read DOMAIN_REGISTRY.yaml for context
- Run VALIDATION_CHECKLIST.md before every commit
- Commit frequently with clear messages
- Test locally before pushing
- Ask if uncertain about scope

### ❌ DON'T:
- Edit files outside allowed paths
- Change shared components without approval
- Add new environment variables
- Modify database schema
- Refactor unrelated code
- Skip validation checklist

---

## 📊 Progress Tracking

### Window 1: Identity Tests (21h)
- [ ] Setup fixtures (conftest.py)
- [ ] IDN-TST-LOG-001: Login tests (18 tests)
- [ ] IDN-TST-TOK-001: Token tests (12 tests)
- [ ] IDN-TST-PWD-001: Password reset (10 tests)
- [ ] IDN-TST-INV-001: Invite flow (9 tests)
- [ ] Coverage report (90%+)
- [ ] Push & PR

**Status:** 🟡 Not Started  
**ETA:** 2.5 days

---

### Window 2: Consolidation (12h)
- [ ] PLT-DUP-MIG-001: Migrate PromoteButton
- [ ] Test promotion flow manually
- [ ] PLT-DUP-DEL-001: Delete duplicate code
- [ ] PLT-DUP-TST-001: E2E tests
- [ ] PLT-DUP-DOC-001: CONSOLIDATION_LOG.md
- [ ] Push & PR

**Status:** 🟡 Not Started  
**ETA:** 1 day

---

### Window 3: Assortment UI (13h)
- [ ] ASS-UI-DET-001: Detail modal
- [ ] Integrate with AssortmentManagementPage
- [ ] ASS-UI-EDT-001: Edit form
- [ ] Test edit flow
- [ ] ASS-UI-DEL-001: Delete dialog
- [ ] Test delete with cascade warning
- [ ] Push & PR

**Status:** 🟡 Not Started  
**ETA:** 2 days

---

## 🎯 Merge Strategy

**Recommended Order:**

1. **Window 1 (Identity Tests)** merges FIRST
   - Why: New files only, zero integration risk
   - Timeline: Day 3 EOD
   - CI validates: All tests pass

2. **Window 2 (Consolidation)** merges SECOND
   - Why: Removes tech debt before Window 3
   - Timeline: Day 4 EOD
   - CI validates: E2E tests pass

3. **Window 3 (Assortment UI)** merges LAST
   - Why: Builds on clean codebase
   - Timeline: Day 7 EOD
   - CI validates: Feature tests pass

**After all 3 merged → dev environment UAT → Promote to staging**

---

## 🆘 Troubleshooting

### "I can't find WORKTREE.md"
→ You're in the wrong directory. Check `pwd` and verify worktree path.

### "Git says I'm on the wrong branch"
→ Check `git branch`. Should be `feature/[domain]-[feature]`. If not, you're in main repo.

### "Tests are failing"
→ Check if you're running tests from the correct worktree.
→ Backend: `pytest backend/tests/domains/identity -v`
→ Frontend: `npm run test:e2e:catalog-browse`

### "VALIDATION_CHECKLIST.md fails"
→ You've edited files outside allowed paths. Revert those changes.

### "Merge conflict in DOMAIN_REGISTRY.yaml"
→ Expected. Each worktree updates different sections. Manual merge needed.

### "VS Code shows wrong Python environment"
→ Each worktree should have its own `.venv`. Create if missing:
```bash
cd [worktree-path]
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

---

## 📞 Support

**Documents:**
- Worktree Master Guide: `.ai/project/WORKTREE_MASTER.md`
- Parallel Plan: `.ai/project/PARALLEL_WORKTREE_PLAN.md`
- OTAP Strategy: `.ai/project/OTAP_ENFORCEMENT.md`
- Domain Registry: `.ai/project/DOMAIN_REGISTRY.yaml`

**If stuck:** Stop and ask user. Don't guess.

---

## 🏁 Success Criteria (All Windows)

**When all 3 PRs merged to `dev`:**
- ✅ 57+ identity tests passing (Priority #3)
- ✅ Catalog consolidation complete (Priority #2)
- ✅ Assortment UI MVP functional (Priority #1)
- ✅ All CI checks green
- ✅ Zero regression in existing features
- ✅ Ready for staging promotion

**Timeline:** 5-7 days parallel execution → 2 week UAT → Staging deployment

---

**Status:** ✅ 3 VS Code Windows Open - Ready for Parallel Development!

**Next:** Start implementing in each window following the agent prompts above.
