# Technical Specification: Background Jobs Monitoring

**Slice ID**: `IMP-MON-ACT-001`  
**Feature**: Background Jobs Monitoring  
**Epic**: Job Monitoring  
**Domain**: Imports  
**Status**: In Progress (assigned to Lead)  
**Created**: December 19, 2025  
**Approach**: **Option B** - Background Jobs Table ✅

---

## 📋 Assignment

**Assigned to**: Lead Developer  
**Branch**: `feature/imp-mon-act-001-jobs-table`  
**Estimated Effort**: 8-16 hours  
**Priority**: P1 (High) - Frontend depends on this

**Requirements Document**: `.ai/project/user-stories/IMPORTS_US_JOBS_ACTIVE.md`  
**Registry Entry**: `DOMAIN_REGISTRY.yaml` → `imports.job_monitoring.background_jobs.get_active_jobs`

---

## 🎯 Business Context

### Problem Statement

Frontend polls `/api/v2/jobs/active` every 10 seconds but receives 404. This creates:

- ❌ Console spam (404 errors)
- ❌ No visibility into upload progress
- ❌ Poor UX during long-running operations

### Solution Overview

Implement proper background jobs infrastructure with dedicated database table, allowing:

- ✅ Real-time job monitoring
- ✅ Progress tracking (0-100%)
- ✅ Job history and audit trail
- ✅ Future support for async tasks (Celery/RQ)

---

## 🗄️ Database Schema

### New Table: `background_jobs`

```sql
CREATE TABLE background_jobs (
    -- Identity
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Job Classification
    job_type VARCHAR(50) NOT NULL,  -- 'import', 'export', 'validation', 'processing'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'cancelled'

    -- Progress Tracking
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Relationships
    related_dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,  -- Store arbitrary job data

    -- Indexes
    INDEX idx_background_jobs_status (status),
    INDEX idx_background_jobs_created_by (created_by),
    INDEX idx_background_jobs_created_at (created_at),
    INDEX idx_background_jobs_job_type (job_type)
);
```

### Enum: `job_type`

```sql
CREATE TYPE job_type AS ENUM (
    'import',
    'export',
    'validation',
    'processing'
);

CREATE TYPE job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
);
```

---

## 🏗️ Architecture

### Domain Structure

```
backend/src/domains/imports/job_monitoring/
├── __init__.py
├── router.py              # API endpoints
├── service.py             # Business logic
├── schemas.py             # Pydantic models
└── models.py              # SQLAlchemy model (or add to imports/models.py)
```

### Component Responsibilities

#### 1. **router.py** - API Layer

```python
"""Job Monitoring Router - API endpoints for background jobs."""

@router.get("/active", response_model=list[BackgroundJobResponse])
async def get_active_jobs(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[BackgroundJobResponse]:
    """Get active jobs for current user (last 1 hour)."""
    service = JobMonitoringService(db)
    return await service.get_active_jobs(user_id=current_user.id)

@router.get("/{job_id}", response_model=BackgroundJobResponse)
async def get_job_status(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BackgroundJobResponse:
    """Get detailed status of specific job."""
    service = JobMonitoringService(db)
    return await service.get_job_by_id(job_id, user_id=current_user.id)

@router.post("/", response_model=BackgroundJobResponse, status_code=201)
async def create_job(
    job_data: CreateBackgroundJobRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BackgroundJobResponse:
    """Create new background job (internal use)."""
    service = JobMonitoringService(db)
    return await service.create_job(job_data, user_id=current_user.id)
```

#### 2. **service.py** - Business Logic

```python
"""Job Monitoring Service - Business logic for background jobs."""

class JobMonitoringService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active_jobs(
        self,
        user_id: uuid.UUID,
        hours: int = 1
    ) -> list[BackgroundJobResponse]:
        """
        Get active jobs for user from last N hours.

        Returns jobs with status: pending, running
        Excludes: completed, failed, cancelled (unless < 5 min old)
        """
        cutoff_time = datetime.now(UTC) - timedelta(hours=hours)
        recent_completion_cutoff = datetime.now(UTC) - timedelta(minutes=5)

        result = await self.db.execute(
            select(BackgroundJob)
            .where(
                BackgroundJob.created_by == user_id,
                or_(
                    # Active jobs
                    BackgroundJob.status.in_(['pending', 'running']),
                    # Recently completed/failed (show for 5 min)
                    and_(
                        BackgroundJob.status.in_(['completed', 'failed']),
                        BackgroundJob.completed_at >= recent_completion_cutoff
                    )
                ),
                BackgroundJob.created_at >= cutoff_time
            )
            .order_by(BackgroundJob.created_at.desc())
        )

        jobs = result.scalars().all()
        return [self._to_response(job) for job in jobs]

    async def create_job(
        self,
        job_type: str,
        created_by: uuid.UUID,
        related_dataset_id: uuid.UUID | None = None,
        metadata: dict | None = None
    ) -> BackgroundJob:
        """Create new background job."""
        job = BackgroundJob(
            job_type=job_type,
            status='pending',
            created_by=created_by,
            related_dataset_id=related_dataset_id,
            metadata=metadata or {}
        )

        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)

        return job

    async def start_job(self, job_id: uuid.UUID) -> None:
        """Mark job as started."""
        result = await self.db.execute(
            select(BackgroundJob).where(BackgroundJob.id == job_id)
        )
        job = result.scalar_one()

        job.status = 'running'
        job.started_at = datetime.now(UTC)
        await self.db.commit()

    async def update_progress(
        self,
        job_id: uuid.UUID,
        progress: int
    ) -> None:
        """Update job progress (0-100)."""
        result = await self.db.execute(
            select(BackgroundJob).where(BackgroundJob.id == job_id)
        )
        job = result.scalar_one()

        job.progress = max(0, min(100, progress))  # Clamp 0-100
        await self.db.commit()

    async def complete_job(
        self,
        job_id: uuid.UUID,
        error: str | None = None
    ) -> None:
        """Mark job as completed or failed."""
        result = await self.db.execute(
            select(BackgroundJob).where(BackgroundJob.id == job_id)
        )
        job = result.scalar_one()

        if error:
            job.status = 'failed'
            job.error_message = error
        else:
            job.status = 'completed'
            job.progress = 100

        job.completed_at = datetime.now(UTC)
        await self.db.commit()

    def _to_response(self, job: BackgroundJob) -> BackgroundJobResponse:
        """Convert DB model to API response."""
        return BackgroundJobResponse(
            id=str(job.id),
            type=job.job_type,
            status=job.status,
            progress=job.progress
        )
```

#### 3. **schemas.py** - API Contracts

```python
"""Job Monitoring Schemas - Pydantic models for API."""

class BackgroundJobResponse(BaseModel):
    """Response matching frontend interface."""

    id: str
    type: Literal["import", "export", "validation", "processing"]
    status: Literal["running", "completed", "failed", "pending", "cancelled"]
    progress: int = Field(ge=0, le=100)

class CreateBackgroundJobRequest(BaseModel):
    """Request to create new job."""

    job_type: Literal["import", "export", "validation", "processing"]
    related_dataset_id: uuid.UUID | None = None
    metadata: dict = {}
```

#### 4. **models.py** - Database Model

```python
"""Background Jobs Model."""

class BackgroundJob(Base):
    """Background job for async operations."""

    __tablename__ = "background_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default='pending',
        nullable=False,
        index=True,
    )
    progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    related_dataset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    metadata: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Relationships
    dataset: Mapped["Dataset"] = relationship(back_populates="jobs")
    user: Mapped["User"] = relationship()

    __table_args__ = (
        CheckConstraint('progress >= 0 AND progress <= 100', name='progress_range'),
    )
```

---

## 🔄 Integration with File Upload

Update `FileIntakeService.upload_file()` to create background job:

```python
async def upload_file(
    self,
    file: UploadFile,
    supplier_id: uuid.UUID,
    created_by: uuid.UUID | None = None,
) -> UploadResponse:
    """Upload and process file with job tracking."""

    # Create background job
    job_service = JobMonitoringService(self.db)
    job = await job_service.create_job(
        job_type='import',
        created_by=created_by,
        metadata={'filename': file.filename}
    )

    try:
        # Start job
        await job_service.start_job(job.id)

        # Step 1: Validate (10% progress)
        await job_service.update_progress(job.id, 10)
        validation = self.validate_file_format(filename, content)

        # Step 2: Check duplicate (20%)
        await job_service.update_progress(job.id, 20)
        file_hash = calculate_file_hash(content)
        duplicate_check = await check_duplicate(self.db, file_hash)

        # Step 3: Upload to MinIO (40%)
        await job_service.update_progress(job.id, 40)
        raw_path = self.storage.upload_raw_file(raw_filename, content)

        # Step 4: Parse file (70%)
        await job_service.update_progress(job.id, 70)
        parser = FileParser(filename, content)
        parse_result = parser.parse()

        # Step 5: Create dataset (90%)
        await job_service.update_progress(job.id, 90)
        dataset = Dataset(...)
        self.db.add(dataset)
        await self.db.flush()

        # Complete job (100%)
        await job_service.complete_job(job.id)

        return UploadResponse(...)

    except Exception as e:
        # Mark job as failed
        await job_service.complete_job(job.id, error=str(e))
        raise
```

---

## 📝 Migration

### Alembic Migration Script

```bash
cd backend
alembic revision --autogenerate -m "Add background_jobs table"
```

Expected migration:

```python
"""Add background_jobs table

Revision ID: xxxxxxxxxxxx
"""

def upgrade() -> None:
    # Create job_type enum
    op.execute("CREATE TYPE job_type AS ENUM ('import', 'export', 'validation', 'processing')")
    op.execute("CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled')")

    # Create table
    op.create_table(
        'background_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('related_dataset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False),
        sa.Column('max_retries', sa.Integer(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['related_dataset_id'], ['datasets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('progress >= 0 AND progress <= 100', name='progress_range')
    )

    # Create indexes
    op.create_index('idx_background_jobs_status', 'background_jobs', ['status'])
    op.create_index('idx_background_jobs_created_by', 'background_jobs', ['created_by'])
    op.create_index('idx_background_jobs_created_at', 'background_jobs', ['created_at'])
    op.create_index('idx_background_jobs_job_type', 'background_jobs', ['job_type'])

def downgrade() -> None:
    op.drop_index('idx_background_jobs_job_type')
    op.drop_index('idx_background_jobs_created_at')
    op.drop_index('idx_background_jobs_created_by')
    op.drop_index('idx_background_jobs_status')
    op.drop_table('background_jobs')
    op.execute("DROP TYPE job_status")
    op.execute("DROP TYPE job_type")
```

---

## ✅ Testing Strategy

### Unit Tests

```python
# backend/tests/test_job_monitoring.py

async def test_create_background_job(db: AsyncSession):
    """Test creating a background job."""
    service = JobMonitoringService(db)
    job = await service.create_job(
        job_type='import',
        created_by=uuid.uuid4()
    )

    assert job.status == 'pending'
    assert job.progress == 0

async def test_get_active_jobs_filters_by_user(auth_client):
    """Test that users only see their own jobs."""
    # User A uploads file (creates job)
    # User B uploads file (creates job)
    # User A calls /jobs/active
    # Should only see User A's job

async def test_completed_jobs_disappear_after_5_minutes(db):
    """Test that completed jobs are removed from active list."""
    # Create completed job with completed_at = 6 minutes ago
    # Call get_active_jobs()
    # Should return empty list
```

### Integration Tests

```python
async def test_upload_creates_background_job(auth_client):
    """Test that file upload creates corresponding job."""
    # Upload file
    response = await auth_client.post("/api/v2/imports/files/upload", ...)

    # Check jobs endpoint
    jobs_response = await auth_client.get("/api/v2/jobs/active")
    jobs = jobs_response.json()

    assert len(jobs) == 1
    assert jobs[0]["type"] == "import"
    assert jobs[0]["status"] in ["running", "completed"]
```

### E2E Tests

```typescript
// frontend/e2e/tests/background-jobs.spec.ts

test("User sees upload progress in real-time", async ({ page }) => {
  // Login
  // Navigate to imports
  // Start upload
  // Check that job widget shows "1 running"
  // Wait for completion
  // Check that widget updates to "0 running"
});
```

---

## 🚀 Deployment Checklist

- [ ] Create feature branch: `feature/imp-mon-act-001-jobs-table`
- [ ] Implement database model (`models.py`)
- [ ] Create Alembic migration
- [ ] Run migration on dev: `alembic upgrade head`
- [ ] Implement service layer (`service.py`)
- [ ] Implement API endpoints (`router.py`)
- [ ] Register router in `imports/router.py`
- [ ] Update `FileIntakeService` to create jobs
- [ ] Write unit tests (80%+ coverage)
- [ ] Write integration tests
- [ ] Test with frontend (`useBackgroundJobs` hook)
- [ ] Update API docs (auto-generated via FastAPI)
- [ ] PR review & merge to `dev`
- [ ] Deploy to Test environment
- [ ] Verify 404 errors gone in browser console
- [ ] Deploy to Staging

---

## 📊 Success Metrics

### Technical Metrics

- ✅ `GET /api/v2/jobs/active` returns 200 OK
- ✅ No 404 errors in browser console
- ✅ Response time < 100ms (simple SELECT query)
- ✅ Test coverage > 80%

### User Metrics

- ✅ Users see real-time upload progress
- ✅ Dashboard widget shows accurate job count
- ✅ Failed uploads are immediately visible

---

## 🔮 Future Enhancements

### Phase 2 (Next Sprint)

- [ ] WebSocket support for real-time updates (no polling)
- [ ] Job history page (view completed/failed jobs)
- [ ] Retry failed jobs
- [ ] Cancel running jobs

### Phase 3 (Future)

- [ ] Integrate Celery/RQ for true async processing
- [ ] Support for long-running exports
- [ ] Email notifications on job completion
- [ ] Job scheduling (cron-like)

---

## 📚 References

- **Frontend Hook**: `frontend/src/hooks/useBackgroundJobs.ts`
- **Requirements**: `.ai/project/user-stories/IMPORTS_US_JOBS_ACTIVE.md`
- **Registry**: `DOMAIN_REGISTRY.yaml` (IMP-MON-ACT-001)
- **Workstream**: `ACTIVE_WORKSTREAMS.md`

---

**Last Updated**: December 19, 2025  
**Assigned To**: Lead Developer  
**Status**: Ready for Implementation
