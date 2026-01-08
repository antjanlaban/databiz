# Active Workstreams - DataBiz Next

> **Purpose:** Track who is working on what to prevent conflicts
> **Updated:** December 21, 2025 - 16:00 UTC
> **Rule:** Check this file BEFORE starting any work

---

## 🔴 Currently Active

| Workstream              | Owner | Branch | Domain | Status | Started |
| ----------------------- | ----- | ------ | ------ | ------ | ------- |
| _No active workstreams_ | -     | -      | -      | -      | -       |

**Status:** Enforcement rules implemented. Ready for [AI-DIRECTOR] approval.

---

## 🟢 Recently Completed

| Workstream                           | Owner         | Branch | Domain     | Completed  |
| ------------------------------------ | ------------- | ------ | ---------- | ---------- |
| **Agent Enforcement Rules**          | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **Unified Startup Workflow**         | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **Hot Reload Loop Fix**              | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **DevOps Workflow Simplification**   | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **Database Health Check Tool**       | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **Migration Strategy Documentation** | [DEVOPS]      | `dev`  | all        | 2025-12-21 |
| **Copilot Instructions Update**      | [AI-DIRECTOR] | `dev`  | all        | 2025-12-21 |
| **Documentation Cleanup**            | Agent         | `dev`  | all        | 2025-12-21 |
| **Terminology Clarification**        | Agent         | `dev`  | all        | 2025-12-21 |
| **Status Verification**              | Agent         | `dev`  | all        | 2025-12-21 |
| **Assortment Database Foundation**   | Agent         | `dev`  | assortment | 2025-12-20 |
| **Assortment Backend API**           | Agent         | `dev`  | assortment | 2025-12-20 |
| **Assortment Frontend List**         | Agent         | `dev`  | assortment | 2025-12-20 |
| **Promotion Backend API**            | Agent         | `dev`  | promotion  | 2025-12-20 |
| Background Jobs Monitoring           | Lead          | `dev`  | imports    | 2025-12-19 |
| Jobs Backend (Phase 1: Database)     | Lead          | `dev`  | imports    | 2025-12-19 |
| Jobs Backend (Phase 2: API)          | Lead          | `dev`  | imports    | 2025-12-19 |
| Jobs Backend (Phase 3: Upload)       | Lead          | `dev`  | imports    | 2025-12-19 |
| AI Configuration                     | Agent         | `dev`  | system     | 2025-12-18 |
| Test Suite Fixes                     | Agent         | `dev`  | all        | 2025-12-18 |
| Registry Compression                 | Agent         | `dev`  | -          | 2025-12-18 |

**Latest Completion Details:**

- **Documentation Cleanup** (2025-12-21):

  - ✅ Fixed CatalogusPage.tsx (deprecated warning)
  - ✅ Fixed PromoverenPage.tsx (correct terminology)
  - ✅ Updated MVP_HAPPY_PATH.md (actual status: 67% compleet)
  - ✅ Updated DOMAIN_REGISTRY.yaml (backend-done, frontend-planned)
  - ✅ Clarified terminology: Activeren (dataset) vs Promoveren (to assortment) vs Browse (catalog)
  - 📄 Slices: Documentation update (not tracked in registry)

- **Assortment Complete Implementation** (2025-12-20):
  - ✅ Backend API: 4 REST endpoints (list, detail, update, delete)
  - ✅ Frontend UI: AssortimentPage with grid, filters, detail modal
  - ✅ Promotion API: 2 endpoints (promote, check status)
  - ✅ Tests: 49 total (14 promotion + 13 CRUD + 8 models + 14 integration)
  - ✅ Database: 3 tables with relationships and constraints
  - 📄 Slices: PRO-API-001/002, ASS-UI-PAGE/CARD/GRID/DETAIL-001, ASS-MAS-LST/VIW/UPD/DEL-001

---

## 📋 Ready to Start (Prioritized)

**🎯 NEXT UP: MVP Happy Path Completion**

### Priority 1 - MVP BLOCKER (Frontend Promotion UI)

| Feature                  | Domain    | Slice ID                   | Backend    | Frontend   | Effort        |
| ------------------------ | --------- | -------------------------- | ---------- | ---------- | ------------- |
| Promotion Button         | promotion | PRO-UI-002                 | ✅ Done    | ❌ Missing | 4-6 uur       |
| Promotion Status Badge   | promotion | PRO-UI-001                 | ✅ Done    | ❌ Missing | 2-3 uur       |
| Promotion Confirm Dialog | promotion | PRO-PRV-001                | ✅ Done    | ❌ Missing | 4-6 uur       |
| **TOTAL MVP COMPLETION** | promotion | **PRO-UI-001/002/PRV-001** | **✅ API** | **❌ UI**  | **1-2 dagen** |

**Details:**

- Backend API 100% klaar: `POST /api/v1/assortment/promotion/promote`, `GET /promotion/status/{id}`
- Hooks bestaan al: `usePromoteProduct()`, `usePromotionStatus()` in `useAssortment.ts`
- Ontbreekt: UI button in `CatalogBrowsePage` + `PromoverenPage` implementatie

---

### Priority 2 - Quick Wins (No Backend Needed)

| Feature         | Domain  | Slice ID      | Backend | Frontend   | Effort   |
| --------------- | ------- | ------------- | ------- | ---------- | -------- |
| Categories Page | catalog | CAT-CAT-\*    | ✅ Done | ❌ Missing | 1-2 days |
| Catalog Polish  | catalog | CAT-BROWSE-\* | ✅ Done | 🟡 Basic   | 1 day    |

### Priority 3 - Core Workflow Extension

| Feature                     | Domain     | Slice ID    | Backend     | Frontend | Effort   |
| --------------------------- | ---------- | ----------- | ----------- | -------- | -------- |
| Assortment Variant Edit     | assortment | ASS-VAR-\*  | ✅ API Done | ❌       | 2-3 days |
| Assortment Normalization AI | assortment | ASS-NORM-\* | ❌          | ❌       | 3-4 days |
| Multi-Source Merge          | assortment | ASS-SRC-\*  | 🟡 DB Ready | ❌       | 2-3 days |

### Priority 4 - Future Phases

| Feature             | Domain     | Slice ID   | Backend | Frontend | Effort   |
| ------------------- | ---------- | ---------- | ------- | -------- | -------- |
| Enrichment (Prices) | enrichment | ENR-PRC-\* | ❌      | ❌       | 2-3 days |
| Export to Channel   | export     | EXP-\*     | ❌      | ❌       | 3-5 days |

---

## 🔧 How to Claim a Workstream

1. **Check this file** - Is anyone working on the same area?
2. **Create worktree** (if parallel work): `npm run worktree:create`
3. **Update this file** - Add row to "Currently Active"
4. **Start work** - Reference slice IDs from `DOMAIN_REGISTRY.yaml`
5. **Complete** - Move to "Recently Completed" when done

---

## ⚠️ Conflict Prevention Rules

1. **One domain per agent** - Don't work on same domain simultaneously
2. **Check before starting** - Always read this file first
3. **Update when claiming** - Add yourself immediately
4. **Communicate blockers** - Note dependencies in Status column
5. **Release when done** - Move to completed, don't leave stale entries

---

## 📁 Related Documents

| Document               | Purpose                               |
| ---------------------- | ------------------------------------- |
| `DDD_WORKFLOW_MAP.md`  | Domain architecture, what exists      |
| `DOMAIN_REGISTRY.yaml` | Slice definitions (id, story, status) |
| `WORKTREE_MASTER.md`   | Worktree guidelines for parallel work |
