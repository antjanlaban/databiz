# Phase 3 Implementation Complete: FileIntakeService Integration

## ✅ Geïmplementeerd (December 19, 2025)

### 1. Job Tracking in File Upload Flow

**File**: `backend/src/domains/imports/file_intake/service.py`

De `upload_file()` methode maakt nu automatisch een background job aan en tracked de progress:

```python
# Job lifecycle tijdens upload:
1. Create job (type="import")
2. Start job (status → "running")
3. Progress updates:
   - 10%: File format validation
   - 20%: Duplicate check
   - 40%: Upload to MinIO
   - 70%: File parsing
   - 90%: JSON storage
   - 100%: Dataset creation
4. Complete job (status → "completed")
5. Link job to dataset (related_dataset_id)
6. Error handling: job → "failed" on exception
```

### 2. Progress Tracking Commits

Elke progress update wordt gecommit naar de database:

```python
await job_service.update_progress(job.id, progress=10)
await self.db.commit()  # Immediate visibility for polling
```

Dit zorgt ervoor dat de frontend real-time updates ziet tijdens het polling (10s interval).

### 3. Dataset Linking

Na succesvolle dataset creation:

```python
job.related_dataset_id = dataset.id
```

Dit linkt de job aan de dataset voor traceability.

### 4. Error Handling

Bij elke exception:

```python
except Exception as e:
    await job_service.complete_job(
        job.id,
        error=str(e),
        job_metadata={...}
    )
    await self.db.commit()
    raise  # Re-raise for FastAPI error handling
```

Job wordt gemarkeerd als "failed" met error message.

### 5. Test Coverage

**File**: `backend/tests/test_imports.py`

Nieuwe test class `TestBackgroundJobMonitoring`:

- `test_upload_creates_background_job`: Verifieert dat upload → job creation
- Checkt `/api/v2/jobs/active` endpoint werkt
- Verifieert dataset is aangemaakt

## 🎯 Frontend Impact

Met deze implementatie:

1. **404 errors opgelost**: `/api/v2/jobs/active` bestaat nu
2. **Real-time progress**: Frontend ziet upload progress (10%, 20%, 40%, etc.)
3. **Job widget werkt**: "1 running job" verschijnt tijdens upload
4. **Completed jobs**: Blijven 5 minuten zichtbaar (per specificatie)

## 📊 Database Schema Usage

De `background_jobs` table wordt nu actief gebruikt:

```sql
-- Voorbeeld job tijdens upload:
{
  "id": "uuid",
  "job_type": "import",
  "status": "running",  -- of "completed"/"failed"
  "progress": 70,       -- 0-100
  "related_dataset_id": "uuid",  -- linked na creation
  "created_by": "user-uuid",
  "job_metadata": {
    "filename": "products.csv",
    "supplier_id": "supplier-uuid",
    "dataset_id": "dataset-uuid"  -- added on completion
  }
}
```

## 🚀 Next Steps (Phase 4-6)

1. **Phase 4**: Unit tests voor JobMonitoringService
2. **Phase 5**: Integration test met MinIO (volledige upload flow)
3. **Phase 6**: Manual testing met UI

## ⚠️ Breaking Changes

Geen - backward compatible. Oude code blijft werken, nieuwe uploads krijgen automatisch job tracking.

## 📝 Implementation Notes

- Jobs worden synchroon aangemaakt (niet async background)
- Progress updates zijn realtime (immediate commit)
- Error handling behoudt job in database (niet verwijderd)
- Job cleanup: Na 5 minuten verdwijnen completed jobs uit `/active` response
- Full job history blijft in database (geen auto-cleanup)
