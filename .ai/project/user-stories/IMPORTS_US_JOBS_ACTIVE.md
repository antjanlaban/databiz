# BA Requirements: Background Jobs Monitoring Endpoint

**Datum**: 19 december 2025  
**Status**: ⏳ Requirements Definitie  
**Epic**: Imports Domain  
**Feature**: Background Job Monitoring  
**Slice**: `IMP-MON-ACT-001` - Active Jobs Endpoint

---

## 📋 Business Context

### Probleem

De frontend heeft een `useBackgroundJobs` hook die elke 10 seconden pollt naar `/api/v2/jobs/active`, maar dit endpoint bestaat nog niet (404). Hierdoor:

- Kunnen gebruikers niet zien of er imports bezig zijn
- Geen real-time feedback tijdens lange file uploads
- Geen monitoring van gefaalde jobs

### Huidige Situatie

- ✅ File upload werkt (`POST /api/v2/imports/files/upload`)
- ✅ Upload is **synchroon** - blokkeert tot klaar
- ❌ Geen zichtbaarheid voor gebruiker tijdens processing
- ❌ Frontend toont altijd "0 running jobs"

### Gewenste Situatie

Gebruikers kunnen:

- Real-time zien welke imports bezig zijn
- Progress van uploads volgen (0-100%)
- Gefaalde jobs identificeren
- Aantal actieve import/export jobs zien in dashboard widget

---

## 🎯 User Story

**Als** DataBiz gebruiker  
**Wil ik** real-time zien welke background jobs er draaien  
**Zodat** ik weet wanneer mijn import klaar is en of er errors zijn

---

## 📐 Frontend Contract (Already Implemented)

De frontend verwacht dit interface:

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
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "export",
    "status": "completed",
    "progress": 100
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "import",
    "status": "failed",
    "progress": 45
  }
]
```

### TypeScript Interface (Frontend)

```typescript
export interface BackgroundJob {
  id: string;
  type: "import" | "export" | "validation" | "processing";
  status: "running" | "completed" | "failed";
  progress?: number; // 0-100
}
```

---

## 🔍 Technical Discovery

### Current Architecture

1. **Upload is Synchronous** - `FileIntakeService.upload_file()` blocks until done
2. **No Job Queue** - No Celery, RQ, or background task system
3. **No Job Table** - `Dataset` table tracks uploads, maar niet als "jobs"

### Options for Implementation

#### Option A: Simple - Reuse Dataset Table (RECOMMENDED ⭐)

**Effort**: 2-4 uur  
**Complexity**: Low

Map existing `Dataset` records to job interface:

- `Dataset.id` → `BackgroundJob.id`
- `Dataset.status` → `BackgroundJob.status`
- File type detection → `BackgroundJob.type`
- **Progress**: Start eenvoudig met fixed values (0%, 50%, 100%)

**Pros**:

- ✅ Werkt met huidige architectuur
- ✅ Geen nieuwe tabellen nodig
- ✅ Quick win voor gebruikers
- ✅ Upload status direct zichtbaar

**Cons**:

- ⚠️ Geen echte progress tracking (upload is synchroon)
- ⚠️ "Completed" jobs blijven in lijst (moet filtered worden op created_at)

#### Option B: Background Jobs Table

**Effort**: 8-16 uur  
**Complexity**: Medium

Nieuwe tabel `background_jobs`:

```sql
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY,
  type VARCHAR(50),
  status VARCHAR(20),
  progress INT,
  related_dataset_id UUID REFERENCES datasets(id),
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);
```

**Pros**:

- ✅ Proper job tracking
- ✅ History retention
- ✅ Supports future async jobs

**Cons**:

- ❌ Overkill voor huidige sync upload
- ❌ Migration needed
- ❌ More complexity

#### Option C: Background Task Queue (Celery/RQ)

**Effort**: 24-40 uur  
**Complexity**: High

**Pros**:

- ✅ True async processing
- ✅ Retry logic
- ✅ Scalable

**Cons**:

- ❌ Requires Redis/RabbitMQ
- ❌ Major architecture change
- ❌ Overkill for current needs

---

## ✅ Recommended Approach: Option A (MVP)

### Implementation Plan

#### 1. Create New Slice: `IMP-MON-ACT-001`

**Slice**: Active Jobs Endpoint  
**Location**: `backend/src/domains/imports/job_monitoring/`

#### 2. Backend Components

```python
# backend/src/domains/imports/job_monitoring/router.py

@router.get("/active", response_model=list[BackgroundJobResponse])
async def get_active_jobs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[BackgroundJobResponse]:
    """
    Get currently active background jobs.

    For now, maps recent Datasets to job format.
    Returns jobs from last 1 hour that are:
    - status = 'new' (uploading/parsing)
    - created_at > now - 1 hour
    """
    service = JobMonitoringService(db)
    return await service.get_active_jobs(user_id=current_user.id)
```

```python
# backend/src/domains/imports/job_monitoring/service.py

class JobMonitoringService:
    async def get_active_jobs(self, user_id: UUID) -> list[BackgroundJobResponse]:
        """Map recent datasets to job format."""

        # Get datasets from last hour
        one_hour_ago = datetime.now(UTC) - timedelta(hours=1)

        result = await self.db.execute(
            select(Dataset)
            .where(
                Dataset.created_by == user_id,
                Dataset.created_at >= one_hour_ago,
                Dataset.status.in_(['new', 'inactive'])  # Active statuses
            )
            .order_by(Dataset.created_at.desc())
        )
        datasets = result.scalars().all()

        # Map to job format
        jobs = []
        for ds in datasets:
            jobs.append(BackgroundJobResponse(
                id=str(ds.id),
                type=self._detect_job_type(ds),
                status=self._map_status(ds.status),
                progress=self._calculate_progress(ds)
            ))

        return jobs

    def _detect_job_type(self, ds: Dataset) -> str:
        """Detect job type from filename."""
        # All uploads are imports for now
        return "import"

    def _map_status(self, dataset_status: str) -> str:
        """Map dataset status to job status."""
        if dataset_status == "new":
            return "running"
        elif dataset_status == "inactive":
            return "completed"
        else:
            return "failed"

    def _calculate_progress(self, ds: Dataset) -> int:
        """Simple progress calculation."""
        if ds.status == "new":
            return 50  # Halfway (parsing)
        elif ds.status == "inactive":
            return 100  # Done
        else:
            return 0
```

```python
# backend/src/domains/imports/job_monitoring/schemas.py

class BackgroundJobResponse(BaseModel):
    """Background job response matching frontend interface."""

    id: str
    type: Literal["import", "export", "validation", "processing"]
    status: Literal["running", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
```

#### 3. Router Registration

```python
# backend/src/domains/imports/router.py

from src.domains.imports.job_monitoring import router as monitoring_router

router.include_router(
    monitoring_router.router,
    prefix="/jobs",
    tags=["jobs"],
)
```

#### 4. Test Implementation

```python
# backend/tests/test_job_monitoring.py

async def test_get_active_jobs_returns_recent_uploads(auth_client):
    """Test that recent uploads appear as active jobs."""
    # Upload a file
    # ...

    # Check jobs endpoint
    response = await auth_client.get("/api/v2/imports/jobs/active")

    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 1
    assert jobs[0]["type"] == "import"
    assert jobs[0]["status"] in ["running", "completed"]
```

---

## 🎯 Acceptance Criteria

### Must Have (P0)

- [ ] `GET /api/v2/jobs/active` returns 200 OK
- [ ] Returns empty array `[]` when no active jobs
- [ ] Returns recent uploads (< 1 hour) as jobs
- [ ] Job has `id`, `type`, `status`, `progress` fields
- [ ] Frontend hook stops showing 404 errors
- [ ] Dashboard widget shows running job count

### Should Have (P1)

- [ ] Filter jobs by current user (don't show other users' jobs)
- [ ] Status mapping correct: new→running, inactive→completed
- [ ] Progress shows realistic values (not always 0)

### Nice to Have (P2)

- [ ] Include `filename` in job response
- [ ] Include `started_at` timestamp
- [ ] Filter out jobs older than 1 hour

---

## 📊 Impact Analysis

### Positive Impact

- ✅ Frontend stops logging 404 errors (every 10 seconds)
- ✅ Users get feedback during uploads
- ✅ Dashboard widget becomes functional
- ✅ Better UX - visibility into system activity

### Risk Assessment

- ⚠️ **Low Risk** - Read-only endpoint, no data modification
- ⚠️ **No Breaking Changes** - New endpoint, doesn't affect existing code
- ⚠️ **Performance** - Simple SELECT query, fast response

---

## 🚀 Next Steps

### Immediate Action Items

1. **Lead/Architect Review** - Approve Option A (MVP approach)
2. **Create Feature Branch** - `feature/imp-mon-act-001-active-jobs`
3. **Register in DOMAIN_REGISTRY.yaml**
4. **Implement Backend** (~2-3 hours)
5. **Test with Frontend** (verify hook works)
6. **Deploy to Dev** → **Test** → **Staging**

### Future Enhancements (Next Sprint)

- [ ] Real progress tracking (requires async upload)
- [ ] Job history table (retain completed jobs)
- [ ] WebSocket updates (instead of polling)
- [ ] Support export jobs

---

## 📝 Questions for Lead

1. **Option A (Dataset mapping) vs Option B (new table)** - gaan we voor quick win of proper architecture?
2. **User Isolation** - moeten users alleen hun eigen jobs zien, of ook team jobs?
3. **Job Retention** - hoelang houden we "completed" jobs in de lijst? (1 uur, 1 dag?)
4. **Progress Accuracy** - is fixed 50%/100% acceptabel, of willen we echte tracking?

---

## 🎭 DevOps Notes

### Deployment Impact

- ✅ **No Migration** - Uses existing `datasets` table
- ✅ **No Config Changes** - No new env vars needed
- ✅ **Zero Downtime** - New endpoint, existing code unchanged
- ✅ **Rollback Safe** - Can deploy/rollback without issues

### Monitoring

- Add metric: `jobs_active_count` (gauge)
- Add metric: `jobs_active_endpoint_latency` (histogram)

---

**Status**: ⏳ Wacht op Lead approval  
**Estimated Effort**: 2-4 uur (Option A) | 8-16 uur (Option B)  
**Priority**: P1 (High) - Frontend verwacht dit endpoint  
**Target Sprint**: Current sprint (December 2025)
