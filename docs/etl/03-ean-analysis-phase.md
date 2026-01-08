# ETL Phase 3: EAN Analysis & Code Detection

## Overview
De EAN Analysis fase is de derde stap in het ETL proces en bestaat uit het detecteren van EAN/GTIN-13 kolommen in bestanden met status "ready_for_processing", het analyseren van EAN codes, en het tellen van unieke codes en duplicaten. Dit gebeurt automatisch via een queue mechanisme, met eventuele gebruikersinteractie bij meerdere EAN kolommen.

## Process Flow

```
[File Parsing Complete]
    ↓
[Status: 'ready_for_processing'] → Automatically triggers EAN analysis queue
    ↓
[Queue Detection] → Find session with status 'ready_for_processing' and ean_analysis_status IS NULL
    ↓
[Lock Session] → Update ean_analysis_status to 'analyzing' (atomic lock)
    ↓
[Download from Storage] → Retrieve file from Supabase Storage
    ↓
    ├─→ [Download Success] → Continue
    │   ↓
    │   [Detect EAN Columns] → Analyze columns for GTIN-13/EAN-13 codes
    │   ↓
    │   ├─→ [0 Columns Found] → Status 'no_ean_column', file cannot proceed
    │   │
    │   ├─→ [1 Column Found] → Use automatically, analyze EAN codes
    │   │   ↓
    │   │   [Update Session] → Store results, set status 'completed'
    │   │
    │   └─→ [>1 Columns Found] → Status 'pending_column_selection', wait for user
    │       ↓
    │       [User Selects Column] → Analyze EAN codes with selected column
    │       ↓
    │       [Update Session] → Store results, set status 'completed'
    │
    └─→ [Download Failure] → Mark as 'failed', store error
        ↓
    [Error Response] → Return error details
```

## Step-by-Step Process

### Step 1: Automatic Queue Trigger
**Location**: `app/api/process-queue/route.ts`
**Trigger**: Automatically after successful file parsing (status = 'ready_for_processing')
**Action**: Fire-and-forget call to `/api/analyze-ean`

**Implementation**:
```typescript
// After setting status to 'ready_for_processing'
fetch(`${origin}/api/analyze-ean`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

**Note**: Non-blocking call - parsing response is not delayed by EAN analysis.

### Step 2: Queue Detection
**Location**: `app/api/analyze-ean/route.ts`
**Action**: Query database for sessions with status 'ready_for_processing' and no EAN analysis yet

**Query**:
```sql
SELECT id 
FROM import_sessions 
WHERE status = 'ready_for_processing' 
  AND ean_analysis_status IS NULL
ORDER BY created_at ASC 
LIMIT 1
```

**Business Rule**: Process files in FIFO order (oldest first).

### Step 3: Atomic Locking
**Location**: `app/api/analyze-ean/route.ts`
**Action**: Update ean_analysis_status to 'analyzing' atomically (prevents race conditions)

**Query**:
```sql
UPDATE import_sessions 
SET ean_analysis_status = 'analyzing' 
WHERE id = $1 
  AND status = 'ready_for_processing' 
  AND ean_analysis_status IS NULL
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

### Step 5: EAN Column Detection
**Location**: `lib/eanDetection.ts` → `detectEANColumns()`
**Action**: Analyze all columns in file to detect GTIN-13/EAN-13 codes

**5.1 CSV Column Detection**
- Parse CSV file with headers
- Sample up to 100 rows for efficiency
- For each column, check if values match GTIN-13 standard
- Column is considered EAN column if ≥80% of values are valid GTIN-13

**5.2 Excel Column Detection**
- Load Excel workbook
- Read header row to get column names
- Sample up to 100 rows for efficiency
- For each column, check if values match GTIN-13 standard
- Column is considered EAN column if ≥80% of values are valid GTIN-13

**GTIN-13/EAN-13 Validation**:
- Exact 13 characters
- Only numeric digits (0-9)
- No whitespace or special characters

**Output**: Array of column names that likely contain EAN codes

### Step 6: Handle Detection Results

**6.1 No EAN Column Found (0 columns)**
- Update session:
  - `ean_analysis_status`: 'no_ean_column'
  - `error_message`: "No EAN/GTIN-13 column found in file. File cannot proceed without EAN codes."
  - `ean_analysis_at`: Current timestamp
- File cannot proceed in import process
- User must be informed

**6.2 Single EAN Column Found (1 column)**
- Automatically use the detected column
- Proceed to Step 7: EAN Analysis

**6.3 Multiple EAN Columns Found (>1 columns)**
- Update session:
  - `ean_analysis_status`: 'pending_column_selection'
  - `error_message`: "Multiple EAN columns detected: {columns}. Please select the correct column."
  - `ean_analysis_at`: Current timestamp
- Wait for user to select column via UI
- After selection, proceed to Step 7: EAN Analysis

### Step 7: EAN Code Analysis
**Location**: `lib/eanAnalyzer.ts` → `analyzeEANs()`
**Action**: Extract and analyze EAN codes from selected column

**7.1 Extract EAN Values**
- Extract all values from the selected column
- Filter to only valid GTIN-13 codes
- Handle both CSV and Excel formats

**7.2 Count Statistics**
- **Unique Count**: Number of distinct EAN codes
- **Duplicate Count**: Number of EAN codes that appear more than once
- **Total EANs**: Total number of valid EAN codes found

**Output**: `EANAnalysisResult { uniqueCount, duplicateCount, totalEANs }`

### Step 8: Database Update
**Location**: `lib/eanAnalysisProcessor.ts` → `processEANAnalysis()`
**Action**: Update import_sessions with analysis results

**Update Query**:
```sql
UPDATE import_sessions 
SET 
  ean_analysis_status = 'completed',
  unique_ean_count = $1,
  duplicate_ean_count = $2,
  detected_ean_column = $3,
  ean_analysis_at = NOW(),
  error_message = NULL
WHERE id = $4
```

**Fields Updated**:
- `ean_analysis_status`: 'completed'
- `unique_ean_count`: Number of unique EAN codes
- `duplicate_ean_count`: Number of duplicate EAN codes
- `detected_ean_column`: Name of the EAN column used
- `ean_analysis_at`: Timestamp of successful analysis
- `error_message`: Cleared (NULL) on success

### Step 9: User Column Selection (if needed)
**Location**: `app/sessions/[id]/select-ean-column/page.tsx`
**Trigger**: When ean_analysis_status = 'pending_column_selection'

**Flow**:
1. User navigates to column selection page
2. UI displays list of detected EAN columns
3. User selects one column
4. POST request to `/api/select-ean-column`
5. EAN analysis proceeds with selected column
6. Results stored in database

**API Endpoint**: `POST /api/select-ean-column`
**Body**: `{ sessionId: number, columnName: string }`

## Status Lifecycle

```
ready_for_processing → (EAN analyse trigger)
    ↓
analyzing → (EAN detectie)
    ├─→ no_ean_column (geen EAN kolom gevonden, bestand kan niet verder)
    ├─→ pending_column_selection (meerdere EAN kolommen, wacht op gebruiker)
    │   ↓
    │   [User Selects Column]
    │   ↓
    │   analyzing → completed
    └─→ completed (EAN analyse succesvol, klaar voor volgende stap)
```

**Status Transitions**:
- `NULL` → `'analyzing'`: Queue picked up file (atomic lock)
- `'analyzing'` → `'no_ean_column'`: No EAN column found
- `'analyzing'` → `'pending_column_selection'`: Multiple EAN columns found
- `'analyzing'` → `'completed'`: Single EAN column, analysis successful
- `'pending_column_selection'` → `'analyzing'`: User selected column
- `'pending_column_selection'` → `'completed'`: Analysis with selected column successful
- Any status → `'failed'`: Error during processing

## API Endpoints

### POST /api/analyze-ean

**Purpose**: Process EAN analysis for files ready for analysis

**Request**: No body required

**Success Response** (200):
```json
{
  "success": true,
  "processed": 1,
  "sessionId": 123,
  "message": "EAN analysis completed successfully"
}
```

**No Queue Items Response** (200):
```json
{
  "success": true,
  "processed": 0,
  "message": "No files ready for EAN analysis"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "processed": 0,
  "sessionId": 123,
  "error": "PROCESSING_ERROR",
  "message": "Failed to analyze EAN codes: {error details}"
}
```

### POST /api/select-ean-column

**Purpose**: Allow user to select EAN column when multiple are detected

**Request Body**:
```json
{
  "sessionId": 123,
  "columnName": "EAN"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "sessionId": 123,
  "columnName": "EAN",
  "message": "EAN analysis completed successfully with selected column"
}
```

**Error Responses**:
- **400**: Validation error (missing sessionId or columnName)
- **404**: Session not found
- **400**: Invalid status (not in 'pending_column_selection')
- **500**: Processing error

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `DATABASE_ERROR` | Database query/update failed | 500 |
| `PROCESSING_ERROR` | EAN analysis failed | 500 |
| `VALIDATION_ERROR` | Invalid request parameters | 400 |
| `SESSION_NOT_FOUND` | Session does not exist | 404 |
| `INVALID_STATUS` | Session not in correct status | 400 |
| `UNEXPECTED_ERROR` | Unexpected error occurred | 500 |

**Storage/File Errors** (handled internally):
- File not found in storage
- Corrupt or invalid file format
- Parsing errors during column detection
- Analysis errors

## Dependencies

### External Services
- **Supabase Storage**: File retrieval service
- **Supabase Database**: Session metadata storage and updates

### Internal Services
- **FileStorage**: Storage download abstraction (`downloadFileFromStorage`)
- **EANDetector**: Column detection service (`detectEANColumns`)
- **EANAnalyzer**: EAN code analysis service (`analyzeEANs`)
- **EANAnalysisProcessor**: Orchestration service (`processEANAnalysis`)

## Transaction Boundaries

### Transaction 1: Lock Session
- Start: SELECT session with status 'ready_for_processing' and ean_analysis_status IS NULL
- Update: SET ean_analysis_status = 'analyzing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

### Transaction 2: Process EAN Analysis
- Start: Download file from storage
- Process: Detect columns, analyze EAN codes
- Commit: Update database with results and status
- Rollback: On any error → mark ean_analysis_status as 'failed' with error message

**Note**: Each step is independent and can fail gracefully without affecting other sessions.

## Performance Considerations

- **Column Detection**: Samples up to 100 rows (memory efficient)
  - CSV: Streaming parser
  - Excel: Row-by-row processing
  - Expected time: < 5 seconds for files up to 50MB

- **EAN Analysis**: Processes all rows in file
  - CSV: Streaming parser
  - Excel: Row-by-row processing
  - Expected time: < 30 seconds for files up to 50MB with 15k rows

- **Concurrent Processing**: 
  - Multiple queue workers can run simultaneously
  - Atomic locking prevents duplicate processing
  - Queue processes files in FIFO order

- **Retry Strategy**:
  - Failed analysis remains in 'failed' status
  - Can be manually retried by resetting ean_analysis_status to NULL
  - Automatic retry not implemented (to prevent infinite loops)

## Security Considerations

- **Storage Access**: Uses service role key (server-side only)
- **File Validation**: Only processes files that passed previous validation phases
- **Error Messages**: Sanitized error messages (no internal paths exposed)
- **Status Locking**: Prevents unauthorized status changes
- **User Input Validation**: Column selection validated against detected columns

## Best Practices

1. **Idempotence**: EAN analysis can be safely retried on failure
2. **Atomic Updates**: Status changes are atomic to prevent race conditions
3. **Error Recovery**: Failed analysis stores error details for debugging
4. **Logging**: All processing steps logged for monitoring
5. **Performance**: Column detection uses sampling for efficiency
6. **User Experience**: Clear status indicators and error messages
7. **Data Integrity**: Only valid GTIN-13 codes are counted

