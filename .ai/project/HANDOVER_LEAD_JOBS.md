# 🎯 Lead Handover: Background Jobs Monitoring

**Date**: December 19, 2025  
**From**: Orchestrator + BA  
**To**: Lead Developer  
**Slice**: `IMP-MON-ACT-001`  
**Priority**: P1 (High)

---

## 📦 What's Ready for You

### ✅ Completed

- **BA Analysis** → `.ai/project/user-stories/IMPORTS_US_JOBS_ACTIVE.md`
- **Technical Spec** → `.ai/project/user-stories/IMP_MON_ACT_001_BACKGROUND_JOBS.md`
- **Registry Entry** → `DOMAIN_REGISTRY.yaml` (slice registered)
- **Workstream Claimed** → `ACTIVE_WORKSTREAMS.md` (assigned to you)

### 📋 Your Task

Implement **Option B: Background Jobs Table** (8-16 hour effort)

---

## 🎯 Quick Summary

**Problem**: Frontend polls `/api/v2/jobs/active` → 404 errors every 10 seconds

**Solution**: Create proper background jobs infrastructure:

1. New table: `background_jobs`
2. API endpoint: `GET /api/v2/jobs/active`
3. Integrate with file upload flow
4. Real-time progress tracking (0-100%)

---

## 📂 Files to Create

```
backend/src/domains/imports/job_monitoring/
├── __init__.py
├── router.py              # GET /jobs/active, POST /jobs
├── service.py             # JobMonitoringService (business logic)
├── schemas.py             # BackgroundJobResponse (Pydantic)
└── models.py              # BackgroundJob (SQLAlchemy) - OR add to imports/models.py
```

---

## 🗄️ Database Migration

### Create Migration

```bash
cd backend
alembic revision --autogenerate -m "Add background_jobs table"
```

### Expected Schema

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,  -- 'import', 'export', 'validation', 'processing'
    status VARCHAR(20) NOT NULL,     -- 'pending', 'running', 'completed', 'failed'
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    related_dataset_id UUID REFERENCES datasets(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_created_by ON background_jobs(created_by);
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at);
```

---

## 🔌 API Contract (Frontend Already Expects This)

### Request

```
GET /api/v2/jobs/active
Authorization: Bearer <token>
```

### Response 200 OK

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "import",
    "status": "running",
    "progress": 67
  }
]
```

**Frontend Hook**: `frontend/src/hooks/useBackgroundJobs.ts` (already polling)

---

## 🔄 Integration Point

Update `FileIntakeService.upload_file()` to:

1. Create background job at start
2. Update progress at each step (10%, 20%, 40%, 70%, 90%, 100%)
3. Mark as completed/failed at end

**Key File**: `backend/src/domains/imports/file_intake/service.py`

---

## ✅ Acceptance Criteria

### Must Have

- [ ] Migration creates `background_jobs` table
- [ ] `GET /api/v2/jobs/active` returns 200 OK
- [ ] Returns empty array when no jobs
- [ ] Returns recent jobs (< 1 hour old)
- [ ] Job has: `id`, `type`, `status`, `progress`
- [ ] File upload creates background job
- [ ] Progress updates during upload
- [ ] Frontend stops showing 404 errors
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration test: upload → check jobs endpoint

### Nice to Have

- [ ] Filter completed jobs after 5 minutes
- [ ] Include filename in response
- [ ] Support job cancellation

---

## 🧪 Testing Strategy

### 1. Unit Tests

```python
# backend/tests/test_job_monitoring.py

async def test_create_job()
async def test_get_active_jobs_filters_by_user()
async def test_update_progress()
async def test_complete_job()
```

### 2. Integration Test

```python
async def test_upload_creates_background_job(auth_client):
    # Upload file
    upload_response = await auth_client.post("/api/v2/imports/files/upload", ...)

    # Check jobs
    jobs_response = await auth_client.get("/api/v2/jobs/active")
    jobs = jobs_response.json()

    assert len(jobs) == 1
    assert jobs[0]["type"] == "import"
```

### 3. Manual Test

```bash
# Start app
npm run dev

# Open browser console
# Upload file via UI
# Check network tab: /api/v2/jobs/active should return 200 (not 404)
# Check widget shows "1 running job"
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Models (2-3h)

- [ ] Create `BackgroundJob` model in `models.py`
- [ ] Create Alembic migration
- [ ] Run migration locally: `alembic upgrade head`
- [ ] Verify table created: `psql` → `\d background_jobs`

### Phase 2: Service Layer (2-3h)

- [ ] Create `JobMonitoringService` in `service.py`
- [ ] Implement `create_job()`
- [ ] Implement `get_active_jobs()`
- [ ] Implement `update_progress()`
- [ ] Implement `complete_job()`

### Phase 3: API Layer (1-2h)

- [ ] Create router in `router.py`
- [ ] Implement `GET /active`
- [ ] Implement `GET /{job_id}` (optional)
- [ ] Register router in `imports/router.py`

### Phase 4: Integration (2-3h)

- [ ] Update `FileIntakeService.upload_file()`
- [ ] Add job creation at start
- [ ] Add progress updates (10%, 20%, 40%, 70%, 90%, 100%)
- [ ] Add error handling (mark failed)

### Phase 5: Testing (2-3h)

- [ ] Write unit tests
- [ ] Write integration test
- [ ] Manual test with frontend
- [ ] Verify no 404s in console

### Phase 6: Documentation (1h)

- [ ] Update API docs (auto via FastAPI)
- [ ] Add comments to complex logic
- [ ] Update README if needed

---

## 🚀 Branch Strategy

```bash
# Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/imp-mon-act-001-jobs-table

# Work...

# Push when ready
git push origin feature/imp-mon-act-001-jobs-table

# Create PR: feature/imp-mon-act-001-jobs-table → dev
```

---

## 📚 Reference Documents

| Document            | Location                                                      | Purpose                   |
| ------------------- | ------------------------------------------------------------- | ------------------------- |
| **BA Requirements** | `.ai/project/user-stories/IMPORTS_US_JOBS_ACTIVE.md`          | Business context, options |
| **Technical Spec**  | `.ai/project/user-stories/IMP_MON_ACT_001_BACKGROUND_JOBS.md` | Implementation details    |
| **Registry**        | `.ai/project/DOMAIN_REGISTRY.yaml`                            | Slice definition          |
| **Frontend Hook**   | `frontend/src/hooks/useBackgroundJobs.ts`                     | API contract              |

---

## 🤔 Questions?

**Ask Orchestrator or BA via chat:**

- Architecture questions → Tag me with `[ARCHITECT]`
- Business logic questions → Tag me with `[BA]`
- Domain questions → Tag me with `[ORCHESTRATOR]`

---

## 🎯 Success = Done When...

✅ Frontend console shows **0 errors** (no more 404s)  
✅ Upload widget shows **"1 running job"** during upload  
✅ Job disappears when upload completes  
✅ Tests pass (`pytest backend/tests/test_job_monitoring.py`)  
✅ PR approved and merged to `dev`

---

**Status**: 🟢 Ready to Start  
**Estimated Time**: 8-16 hours  
**Blocked By**: Nothing - all dependencies ready

**Good luck! 🚀**
