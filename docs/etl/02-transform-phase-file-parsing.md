# ETL Phase 2: Transform - File Parsing & Metadata Extraction

## Overview
De Transform fase is de tweede stap in het ETL proces en bestaat uit het uitlezen van bestanden met status "received", het extraheren van metadata (aantal productregels en kolommen), en het updaten van de import_sessions tabel. Dit gebeurt automatisch via een queue mechanisme.

## Process Flow

```
[File Upload Complete]
    ↓
[Status: 'received'] → Automatically triggers queue processing
    ↓
[Queue Detection] → Find session with status 'received'
    ↓
[Lock Session] → Update status to 'parsing' (atomic lock)
    ↓
[Download from Storage] → Retrieve file from Supabase Storage
    ↓
    ├─→ [Download Success] → Continue
    │   ↓
    │   [Extract Metadata] → Count rows and columns
    │   ↓
    │   [Update Session] → Store metadata, set status 'ready_for_processing'
    │   ↓
    │   [Trigger EAN Analysis] → Automatically trigger EAN analysis queue
    │   ↓
    │   [Success] → File ready for EAN analysis phase
    │
    └─→ [Download Failure] → Mark as 'failed', store error
        ↓
    [Error Response] → Return error details
```

## Step-by-Step Process

### Step 1: Automatic Queue Trigger
**Location**: `app/api/upload/route.ts`
**Trigger**: Automatically after successful file upload (status = 'received')
**Action**: Fire-and-forget call to `/api/process-queue`

**Implementation**:
```typescript
// After setting status to 'received'
fetch(`${origin}/api/process-queue`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

**Note**: Non-blocking call - upload response is not delayed by parsing.

### Step 2: Queue Detection
**Location**: `app/api/process-queue/route.ts`
**Action**: Query database for sessions with status 'received'

**Query**:
```sql
SELECT id 
FROM import_sessions 
WHERE status = 'received' 
ORDER BY created_at ASC 
LIMIT 1
```

**Business Rule**: Process files in FIFO order (oldest first).

### Step 3: Atomic Locking
**Location**: `app/api/process-queue/route.ts`
**Action**: Update status to 'parsing' atomically (prevents race conditions)

**Query**:
```sql
UPDATE import_sessions 
SET status = 'parsing' 
WHERE id = $1 AND status = 'received'
RETURNING id
```

**Locking Strategy**: Optimistic locking using WHERE clause
- Only one process can successfully update (atomic operation)
- If update returns no rows → another process got the lock
- Prevents concurrent processing of same file

### Step 4: File Download from Storage
**Location**: `lib/storage.ts` → `downloadFileFromStorage()`
**Action**: Download file from Supabase Storage as Blob

**Implementation**:
```typescript
const { data, error } = await supabase.storage
  .from(bucket)
  .download(path);
```

**Error Handling**:
- File not found → Mark session as 'failed' with descriptive error
- Storage API error → Mark session as 'failed', log details
- Network errors → Enhanced error messages with context

### Step 5: Metadata Extraction
**Location**: `lib/fileParser.ts` → `getFileMetadata()`
**Action**: Extract row count and column count without full parsing

**5.1 CSV Metadata Extraction**
- Use PapaParse with step callback
- Count all non-empty rows (excluding header)
- Detect column count from first row
- Handle empty files gracefully

**5.2 Excel Metadata Extraction**
- Use ExcelJS to load workbook
- Get actual row count (excluding empty trailing rows)
- Count columns from header row
- Subtract 1 for header row in data count

**Output**: `ParseMetadata { rowCount: number, columnCount: number }`

### Step 6: Database Update
**Location**: `lib/fileProcessor.ts` → `processFile()`
**Action**: Update import_sessions with metadata

**Update Query**:
```sql
UPDATE import_sessions 
SET 
  status = 'ready_for_processing',
  total_rows_in_file = $1,
  columns_count = $2,
  parsed_at = NOW(),
  error_message = NULL
WHERE id = $3
```

**Fields Updated**:
- `status`: 'ready_for_processing'
- `total_rows_in_file`: Number of data rows (excluding header)
- `columns_count`: Number of columns detected
- `parsed_at`: Timestamp of successful parsing
- `error_message`: Cleared (NULL) on success

### Step 7: Error Handling
**Location**: `lib/fileProcessor.ts`

**Error Scenarios**:
1. **Storage Download Failure**
   - Status → 'failed'
   - Error message: "Failed to download file from storage: {details}"

2. **File Parsing Failure**
   - Status → 'failed'
   - Error message: "Failed to parse file: {details}"
   - Examples: Corrupt file, unsupported format, parsing errors

3. **Database Update Failure**
   - Status → 'failed'
   - Error message: "Failed to update session with metadata: {details}"

**Error Recovery**: Failed parsing can be retried by manually triggering queue processing again.

## Status Lifecycle

```
pending → received → parsing → ready_for_processing → (EAN analysis trigger) → (later: processing → completed)
                              ↓
                           failed
```

**Status Transitions**:
- `'received'` → `'parsing'`: Queue picked up file (atomic lock)
- `'parsing'` → `'ready_for_processing'`: Metadata extraction successful
- `'parsing'` → `'failed'`: Error during processing
- `'ready_for_processing'`: Automatically triggers EAN analysis queue (see [EAN Analysis Phase](./03-ean-analysis-phase.md))

## API Endpoint

### POST /api/process-queue

**Purpose**: Process files with status 'received' from the queue

**Request**: No body required

**Success Response** (200):
```json
{
  "success": true,
  "processed": 1,
  "sessionId": 123,
  "metadata": {
    "rowCount": 1500,
    "columnCount": 36
  },
  "message": "File processed successfully"
}
```

**No Queue Items Response** (200):
```json
{
  "success": true,
  "processed": 0,
  "message": "No files in queue"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "processed": 0,
  "sessionId": 123,
  "error": "PROCESSING_ERROR",
  "message": "Failed to process file: {error details}"
}
```

**Concurrency Response** (200):
```json
{
  "success": true,
  "processed": 0,
  "message": "No files available for processing (may be locked by another process)"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `DATABASE_ERROR` | Database query/update failed | 500 |
| `PROCESSING_ERROR` | File processing failed | 500 |
| `UNEXPECTED_ERROR` | Unexpected error occurred | 500 |

**Storage/File Errors** (handled internally):
- File not found in storage
- Corrupt or invalid file format
- Parsing errors (missing headers, empty files, etc.)

## Dependencies

### External Services
- **Supabase Storage**: File retrieval service
- **Supabase Database**: Session metadata storage and updates

### Internal Services
- **FileStorage**: Storage download abstraction (`downloadFileFromStorage`)
- **FileParser**: Metadata extraction (`getFileMetadata`)
- **FileProcessor**: Orchestration service (`processFile`)

## Transaction Boundaries

### Transaction 1: Lock Session
- Start: SELECT session with status 'received'
- Update: SET status = 'parsing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

### Transaction 2: Process File
- Start: Download file from storage
- Process: Extract metadata
- Commit: Update database with metadata and status
- Rollback: On any error → mark status as 'failed' with error message

**Note**: Each step is independent and can fail gracefully without affecting other sessions.

## Performance Considerations

- **Metadata Extraction**: Only reads file structure, not full content
  - CSV: Streaming parser (memory efficient)
  - Excel: Loads workbook structure only
  - Expected time: < 5 seconds for files up to 50MB

- **Concurrent Processing**: 
  - Multiple queue workers can run simultaneously
  - Atomic locking prevents duplicate processing
  - Queue processes files in FIFO order

- **Retry Strategy**:
  - Failed files remain in 'failed' status
  - Can be manually retried by updating status back to 'received'
  - Automatic retry not implemented (to prevent infinite loops)

## Security Considerations

- **Storage Access**: Uses service role key (server-side only)
- **File Validation**: Only processes files that passed upload validation
- **Error Messages**: Sanitized error messages (no internal paths exposed)
- **Status Locking**: Prevents unauthorized status changes

## Best Practices

1. **Idempotence**: Processing can be safely retried on failure
2. **Atomic Updates**: Status changes are atomic to prevent race conditions
3. **Error Recovery**: Failed processing stores error details for debugging
4. **Logging**: All processing steps logged for monitoring
5. **Performance**: Metadata extraction is lightweight (no full file parsing)

