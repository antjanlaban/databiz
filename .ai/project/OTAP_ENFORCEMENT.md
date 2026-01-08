# OTAP ENFORCEMENT PROTOCOL (Mandatory for All Agents)

**Status:** ACTIVE - December 18, 2025  
**Authority:** AI-DIRECTOR  
**Scope:** Alle AI agents, developers, en automated workflows

---

## 🚨 CRITICAL: READ BEFORE ANY GIT OPERATION

Dit document definieert **verplichte regels** voor het OTAP proces. Agents die deze regels overtreden worden gestopt.

---

## 1. BRANCH HIERARCHY (The Law)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BRANCH HIERARCHY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   feature/*  ──┐                                                 │
│   hotfix/*   ──┼──▶  dev  ──▶  staging  ──▶  main               │
│   worktree   ──┘      │          │            │                  │
│                       │          │            │                  │
│                       O          T/A          P                  │
│                   (Develop)  (Test/Accept) (Production)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Branch Descriptions

| Branch      | Type        | Purpose                  | Auto-Deploy           |
| ----------- | ----------- | ------------------------ | --------------------- |
| `feature/*` | Feature     | New functionality        | ❌                    |
| `hotfix/*`  | Hotfix      | Urgent fixes             | ❌                    |
| `dev`       | Integration | All features merged here | ❌ Local only         |
| `staging`   | Acceptance  | QA + stakeholder preview | ✅ Railway Staging    |
| `main`      | Production  | Live environment         | ⏸️ **NOT YET ACTIVE** |

### ⚠️ CURRENT STATUS (December 2025)

**Production (`main`) is NOT yet configured.**

- ✅ `dev` → `staging` flow is active
- ⏸️ `staging` → `main` flow is **disabled** until production is needed
- 🛑 Do NOT merge to `main` until explicitly instructed by AI-DIRECTOR

**End of OTAP flow for now: `staging`**

---

## 2. MANDATORY WORKFLOW: Feature Development

### Step 1: Create Worktree (Recommended) or Feature Branch

```bash
# Option A: Worktree (isolated, recommended)
node scripts/create-worktree.js --domain <domain> --feature <feature> --open

# Option B: Feature branch
git checkout dev
git pull origin dev
git checkout -b feature/<domain>-<feature>
```

### Step 2: Develop & Test Locally

```bash
# Work on feature
# Run tests before commit
cd backend && pytest
```

### Step 3: Commit & Push

```bash
git add -A
git commit -m "feat: <description>"
git push origin feature/<domain>-<feature>
```

### Step 4: Merge to DEV

```bash
# If using worktree, go to main repo first
cd C:\Users\Antjan\databiz-next

# Checkout dev (or use dev worktree)
git checkout dev  # Or work in dev worktree
git pull origin dev
git merge feature/<domain>-<feature>
git push origin dev

# Run full test suite
cd backend && pytest --cov=src
```

### Step 5: Promote to STAGING

```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging
# → Automatic deploy to Railway Staging
```

### Step 6: Promote to MAIN (Production)

**⚠️ REQUIRES: Staging QA sign-off**

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
# → Automatic deploy to Railway Production
```

---

## 3. MANDATORY WORKFLOW: Hotfix (Urgent Fixes)

### When to Use Hotfix Flow

- 🔴 Production is broken
- 🔴 Critical security issue
- 🔴 Data corruption risk

### Hotfix Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      HOTFIX FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   staging ──▶ hotfix/XXX ──┬──▶ staging ──▶ main                │
│                            │                                     │
│                            └──▶ dev (backport)                   │
│                                                                  │
│   ⚠️ Hotfix branches from STAGING, not from dev!                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Create Hotfix Branch from STAGING

```bash
git checkout staging
git pull origin staging
git checkout -b hotfix/<issue-description>
```

### Step 2: Fix & Test

```bash
# Make minimal fix
# Test locally
cd backend && pytest
```

### Step 3: Merge to STAGING First

```bash
git checkout staging
git merge hotfix/<issue-description>
git push origin staging
# → Verify fix on Staging environment
```

### Step 4: Promote to MAIN

```bash
git checkout main
git pull origin main
git merge staging
git push origin main
# → Fix is now in Production
```

### Step 5: Backport to DEV (MANDATORY!)

```bash
git checkout dev
git pull origin dev
git merge hotfix/<issue-description>
git push origin dev
# → Dev now has the fix too
```

### Step 6: Cleanup

```bash
git branch -d hotfix/<issue-description>
git push origin --delete hotfix/<issue-description>
```

---

## 4. FORBIDDEN ACTIONS (Agent Blockers)

| Action                                       | Reason                   | What to Do Instead              |
| -------------------------------------------- | ------------------------ | ------------------------------- |
| ❌ Push directly to `main`                   | Bypasses QA              | Merge via staging               |
| ❌ Push directly to `staging` without tests  | Untested code            | Merge from dev after tests pass |
| ❌ Merge `main` back to `dev`                | Creates circular history | Only forward merges allowed     |
| ❌ Delete `dev`, `staging`, or `main`        | Protected branches       | Never delete these              |
| ❌ Force push to `dev`, `staging`, or `main` | Destroys history         | Only fast-forward merges        |
| ❌ Skip hotfix backport to dev               | Dev gets out of sync     | Always backport hotfixes        |

---

## 5. AGENT CHECKLIST (Before Every Git Operation)

### Before Committing

- [ ] Am I on the correct branch? (`git branch --show-current`)
- [ ] Did tests pass? (`pytest`)
- [ ] Is this a hotfix? → Use hotfix flow
- [ ] Is this a feature? → Use feature flow

### Before Merging to DEV

- [ ] Feature branch is up to date with dev? (`git merge dev`)
- [ ] All tests pass?
- [ ] Conflicts resolved?

### Before Merging to STAGING

- [ ] Dev is stable? (no failing tests)
- [ ] All features for this release are merged to dev?

### Before Merging to MAIN

- [ ] Staging has been tested by QA/stakeholders?
- [ ] No blocking issues in staging?
- [ ] Hotfixes have been backported to dev?

---

## 6. WORKTREE MANAGEMENT

### Creating a Worktree

```bash
node scripts/create-worktree.js --domain <domain> --feature <feature> --open
```

### Listing Worktrees

```bash
git worktree list
```

### Removing a Worktree (After Merge)

```bash
# First ensure changes are merged
git worktree remove ../databiz-next__<domain>__<feature>
```

### Worktree Branch Conflict

If a branch is locked by a worktree:

```bash
# Option 1: Go to that worktree
cd C:\Users\Antjan\databiz-next__<domain>__<feature>

# Option 2: Remove the worktree first
git worktree remove <path>
```

---

## 7. QUICK REFERENCE COMMANDS

### Check Current State

```bash
git branch --show-current      # Current branch
git worktree list              # All worktrees
git status                     # Uncommitted changes
git log --oneline -5           # Recent commits
```

### Standard Promotion Flow

```bash
# Feature → Dev → Staging → Main
git checkout dev && git merge feature/xxx && git push origin dev
git checkout staging && git merge dev && git push origin staging
git checkout main && git merge staging && git push origin main
```

### Hotfix Flow (Emergency)

```bash
# Staging → Hotfix → Staging → Main + Backport to Dev
git checkout staging && git checkout -b hotfix/xxx
# ... fix ...
git checkout staging && git merge hotfix/xxx && git push origin staging
git checkout main && git merge staging && git push origin main
git checkout dev && git merge hotfix/xxx && git push origin dev
```

---

## 8. MONITORING & VERIFICATION

### After Deploy to Staging

```bash
curl https://databiz-next-acceptance-production.up.railway.app/api/v2/health
```

### After Deploy to Production

```bash
curl https://databiz-next-production.up.railway.app/api/v2/health
```

### Railway Logs

```bash
cd backend && railway logs --lines 50
```

---

## 9. ENFORCEMENT: Agent Behavior

**When an agent receives a task involving git operations:**

1. **READ THIS DOCUMENT FIRST** (`.ai/project/OTAP_ENFORCEMENT.md`)
2. **Identify the flow type:**
   - New feature → Feature Flow (Section 2)
   - Urgent fix → Hotfix Flow (Section 3)
   - Promotion → Standard Promotion (Section 7)
3. **Execute the correct flow step-by-step**
4. **Never skip steps**
5. **Report any conflicts or blockers to user**

---

## Changelog

| Date       | Change                       | Author      |
| ---------- | ---------------------------- | ----------- |
| 2025-12-18 | Initial enforcement protocol | AI-DIRECTOR |
