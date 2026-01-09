# Data-import ETL Workflow

## Overview
De Data-import ETL workflow is een geïntegreerd proces dat supplier bestanden ontvangt, valideert, opslaat, parseert en analyseert. Het proces bestaat uit drie naadloos geïntegreerde fases: Extract (File Reception), Transform (File Parsing), en EAN Analysis.

## Complete Process Flow

```
[User Upload] 
    ↓
[Client Validation] → Check file selected
    ↓
[API Request] → POST /api/upload
    ↓
[Server Validation] → Validate extension, size
    ↓
[Hash Calculation] → Calculate SHA256
    ↓
[Duplicate Check] → Query database for existing hash
    ↓
    ├─→ [Duplicate Found] → Return error, stop
    │
    └─→ [Unique File] → Continue
         ↓
[Create Session] → Generate UUID, set status 'pending'
    ↓
[Storage Upload] → Upload to supplier-uploads/incoming/{session_id}/{filename}
    ↓
    ├─→ [Storage Success] → Continue
    │   ↓
    │   [Update Session] → Set status 'parsing', store metadata
    │   ↓
    │   [Trigger Queue] → Automatically trigger parsing queue
    │   ↓
    │   [Queue Detection] → Find session with status 'parsing'
    │   ↓
    │   [Lock Session] → Atomic lock (status remains 'parsing')
    │   ↓
    │   [Download from Storage] → Retrieve file
    │   ↓
    │   [Extract Metadata] → Count rows and columns
    │   ↓
    │   [Update Session] → Store metadata, set status 'ready_for_processing'
    │   ↓
    │   [Trigger EAN Analysis] → Automatically trigger EAN analysis queue
    │   ↓
    │   [EAN Queue Detection] → Find session ready for EAN analysis
    │   ↓
    │   [Lock Session] → Atomic lock (ean_analysis_status = 'analyzing')
    │   ↓
    │   [Download from Storage] → Retrieve file
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
    └─→ [Storage Failure] → Stop process, return error
```

## Phase 1: Extract - File Reception & Storage

### Overview
De Extract fase ontvangt, valideert en slaat supplier bestanden op voordat ze verwerkt worden.

### Step-by-Step Process

#### Step 1: Client-Side File Selection
**Location**: `app/upload/page.tsx`
**Action**: User selects file via HTML input
**Validation**: Basic client-side checks (file exists, not empty)

#### Step 2: API Request
**Endpoint**: `POST /api/upload`
**Content-Type**: `multipart/form-data`
**Payload**: File object

#### Step 3: Server-Side Validation
**Location**: `lib/fileValidation.ts`

**3.1 Extension Validation**
- Allowed: `.csv`, `.xlsx`, `.xls`
- Case-insensitive check
- Extract extension from filename
- **Error**: `FILE_EXTENSION_INVALID`

**3.2 Size Validation**
- Max size: 50 MB (52,428,800 bytes)
- Read `file.size` property
- **Error**: `FILE_SIZE_EXCEEDED`

#### Step 4: Hash Calculation
**Location**: `lib/fileValidation.ts`
**Algorithm**: SHA256
**Implementation**: Web Crypto API or crypto library
**Output**: 64-character hex string

**Example**:
```typescript
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### Step 5: Duplicate Detection
**Location**: `lib/fileValidation.ts` + Database query
**Query**: 
```sql
SELECT id, file_name, uploaded_at 
FROM import_sessions 
WHERE file_hash = $1
LIMIT 1
```

**Business Rule**: 
- If hash exists → Return error with existing session info
- If hash is new → Continue to storage

#### Step 6: Session Creation
**Location**: Database transaction
**Action**: 
- Generate UUID for session
- Create record with status `'pending'`
- Store: file_name, file_type, file_hash, file_size_bytes

**SQL**:
```sql
INSERT INTO import_sessions (
  id, file_name, file_type, file_hash, 
  file_size_bytes, status
) VALUES (
  gen_random_uuid(), $1, $2, $3, $4, 'pending'
) RETURNING id;
```

#### Step 7: Storage Upload
**Location**: `lib/storage.ts`

**7.1 Bucket Creation** (if not exists)
- Check if bucket `supplier-uploads` exists
- Create if missing (private bucket)
- Set bucket policies (authenticated users only)

**7.2 Path Construction**
- Format: `incoming/{session_id}/{sanitized_filename}`
- Sanitize filename: Remove special characters, preserve extension
- Example: `incoming/550e8400-e29b-41d4-a716-446655440000/products.csv`

**7.3 File Upload**
- Use Supabase Storage API with service role key
- Upload file as binary data
- Store metadata (content-type, size)
- **Timeout**: API route configured with 5-minute timeout (300 seconds) for large files
- **Logging**: Upload progress and duration logged for debugging

**Error Handling**:
- Storage API failure → Rollback session creation (if possible)
- Network timeout → Enhanced error message with file size context and actionable guidance
- Network errors (fetch failed, ECONNRESET, ETIMEDOUT) → Detected and reported with user-friendly messages
- Quota exceeded → Return error

#### Step 8: Session Update
**Location**: Database update
**Action**: 
- Update status to `'parsing'`
- Store `file_storage_path`
- Set `uploaded_at` timestamp

**SQL**:
```sql
UPDATE import_sessions 
SET 
  status = 'parsing',
  file_storage_path = $1,
  uploaded_at = NOW()
WHERE id = $2;
```

#### Step 9: Automatic Queue Trigger
**Location**: `app/api/upload/route.ts`
**Trigger**: Automatically after successful file upload (status = 'parsing')
**Action**: Fire-and-forget call to `/api/process-queue`

**Implementation**:
```typescript
// After setting status to 'parsing'
fetch(`${origin}/api/process-queue`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

**Note**: Non-blocking call - upload response is not delayed by parsing.

#### Step 10: Response
**Success Response** (200):
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "products.csv",
  "fileSize": 1048576,
  "storagePath": "incoming/550e8400-e29b-41d4-a716-446655440000/products.csv",
  "message": "File uploaded successfully"
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "error": "DUPLICATE_FILE",
  "message": "This exact file has already been uploaded",
  "existingSessionId": "existing-uuid-here",
  "uploadedAt": "2026-01-08T10:00:00Z"
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `FILE_NOT_PROVIDED` | No file in request | 400 |
| `FILE_EXTENSION_INVALID` | Extension not csv/xlsx | 400 |
| `FILE_SIZE_EXCEEDED` | File > 50MB | 400 |
| `DUPLICATE_FILE` | Hash already exists | 409 |
| `STORAGE_UPLOAD_FAILED` | Storage API error | 500 |
| `STORAGE_BUCKET_ERROR` | Bucket creation/access error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `HASH_CALCULATION_FAILED` | Hash generation error | 500 |

## Phase 2: Transform - File Parsing & Metadata Extraction

### Overview
De Transform fase leest bestanden uit die met status "parsing" zijn opgeslagen, extraheert metadata (aantal productregels en kolommen), en update de import_sessions tabel. Dit gebeurt automatisch via een queue mechanisme.

### Step-by-Step Process

#### Step 1: Queue Detection
**Location**: `app/api/process-queue/route.ts`
**Action**: Query database for sessions with status 'parsing'

**Query**:
```sql
SELECT id 
FROM import_sessions 
WHERE status = 'parsing' 
ORDER BY created_at ASC 
LIMIT 1
```

**Business Rule**: Process files in FIFO order (oldest first).

#### Step 2: Atomic Locking
**Location**: `app/api/process-queue/route.ts`
**Action**: Lock session atomically (status remains 'parsing', prevents race conditions)

**Query**:
```sql
UPDATE import_sessions 
SET status = 'parsing' 
WHERE id = $1 AND status = 'parsing'
RETURNING id
```

**Locking Strategy**: Optimistic locking using WHERE clause
- Only one process can successfully update (atomic operation)
- If update returns no rows → another process got the lock
- Prevents concurrent processing of same file

#### Step 3: File Download from Storage
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

#### Step 4: Metadata Extraction
**Location**: `lib/fileParser.ts` → `getFileMetadata()`
**Action**: Extract row count and column count without full parsing

**4.1 CSV Metadata Extraction**
- Use PapaParse with step callback
- Count all non-empty rows (excluding header)
- Detect column count from first row
- Handle empty files gracefully

**4.2 Excel Metadata Extraction**
- Use ExcelJS to load workbook
- Get actual row count (excluding empty trailing rows)
- Count columns from header row
- Subtract 1 for header row in data count

**Output**: `ParseMetadata { rowCount: number, columnCount: number }`

#### Step 5: Database Update
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

#### Step 6: Automatic EAN Analysis Trigger
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

#### Step 7: Error Handling
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

### API Endpoint

#### POST /api/process-queue

**Purpose**: Process files with status 'parsing' from the queue

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

## Phase 3: EAN Analysis & Code Detection

### Overview
De EAN Analysis fase detecteert EAN/GTIN-13 kolommen in bestanden met status "ready_for_processing", analyseert EAN codes, en telt unieke codes en duplicaten. Dit gebeurt automatisch via een queue mechanisme, met eventuele gebruikersinteractie bij meerdere EAN kolommen.

### Step-by-Step Process

#### Step 1: Queue Detection
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

#### Step 2: Atomic Locking
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

#### Step 3: File Download from Storage
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

#### Step 4: EAN Column Detection
**Location**: `lib/eanDetection.ts` → `detectEANColumns()`
**Action**: Analyze all columns in file to detect GTIN-13/EAN-13 codes

**4.1 CSV Column Detection**
- Parse CSV file with headers
- Sample up to 100 rows for efficiency
- For each column, check if values match GTIN-13 standard
- Column is considered EAN column if ≥80% of values are valid GTIN-13

**4.2 Excel Column Detection**
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

#### Step 5: Handle Detection Results

**5.1 No EAN Column Found (0 columns)**
- Update session:
  - `ean_analysis_status`: 'no_ean_column'
  - `error_message`: "No EAN/GTIN-13 column found in file. File cannot proceed without EAN codes."
  - `ean_analysis_at`: Current timestamp
- File cannot proceed in import process
- User must be informed

**5.2 Single EAN Column Found (1 column)**
- Automatically use the detected column
- Proceed to Step 6: EAN Analysis

**5.3 Multiple EAN Columns Found (>1 columns)**
- Update session:
  - `ean_analysis_status`: 'pending_column_selection'
  - `error_message`: "Multiple EAN columns detected: {columns}. Please select the correct column."
  - `ean_analysis_at`: Current timestamp
- Wait for user to select column via UI
- After selection, proceed to Step 6: EAN Analysis

#### Step 6: EAN Code Analysis
**Location**: `lib/eanAnalyzer.ts` → `analyzeEANs()`
**Action**: Extract and analyze EAN codes from selected column

**6.1 Extract EAN Values**
- Extract all values from the selected column
- Filter to only valid GTIN-13 codes
- Handle both CSV and Excel formats

**6.2 Count Statistics**
- **Unique Count**: Number of distinct EAN codes
- **Duplicate Count**: Number of EAN codes that appear more than once
- **Total EANs**: Total number of valid EAN codes found

**Output**: `EANAnalysisResult { uniqueCount, duplicateCount, totalEANs }`

#### Step 7: Database Update
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

#### Step 8: User Column Selection (if needed)
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

### API Endpoints

#### POST /api/analyze-ean

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

#### POST /api/select-ean-column

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

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `DATABASE_ERROR` | Database query/update failed | 500 |
| `PROCESSING_ERROR` | EAN analysis failed | 500 |
| `VALIDATION_ERROR` | Invalid request parameters | 400 |
| `SESSION_NOT_FOUND` | Session does not exist | 404 |
| `INVALID_STATUS` | Session not in correct status | 400 |
| `UNEXPECTED_ERROR` | Unexpected error occurred | 500 |

## Status Lifecycle

```
pending → uploading → parsing → ready_for_processing → analyzing → completed → approved → converting → ready_for_activation → activating → activated
                                                              ↓
                                                          no_ean_column
                                                              ↓
                                                    pending_column_selection
                                                              ↓
                                                          failed
```

**Status Transitions**:
- `pending` → `uploading`: Session created, preparing for storage upload
- `uploading` → `parsing`: File uploaded to storage successfully
- `parsing` → `ready_for_processing`: Metadata extraction successful
- `parsing` → `failed`: Parsing error occurred
- `ready_for_processing` → `analyzing`: EAN analysis triggered (automatic)
- `analyzing` → `completed`: EAN analysis successful
- `analyzing` → `no_ean_column`: No EAN column found
- `analyzing` → `pending_column_selection`: Multiple EAN columns detected
- `pending_column_selection` → `analyzing`: User selected column
- `pending_column_selection` → `completed`: Analysis with selected column successful
- `completed` → `approved`: EAN analysis completed successfully, dataset approved
- `approved` → `converting`: Automatic JSON conversion triggered
- `converting` → `ready_for_activation`: JSON conversion completed successfully
- `converting` → `failed`: JSON conversion failed
- `ready_for_activation` → `activating`: User starts activation process
- `activating` → `activated`: Activation completed successfully
- Any status → `failed`: Error occurred

**EAN Analysis Status Transitions**:
- `NULL` → `'analyzing'`: Queue picked up file (atomic lock)
- `'analyzing'` → `'no_ean_column'`: No EAN column found
- `'analyzing'` → `'pending_column_selection'`: Multiple EAN columns found
- `'analyzing'` → `'completed'`: Single EAN column, analysis successful
- `'pending_column_selection'` → `'analyzing'`: User selected column
- `'pending_column_selection'` → `'completed'`: Analysis with selected column successful
- Any status → `'failed'`: Error during processing

## Queue Mechanisms

### Queue Strategy
- **Type**: Database-based queue
- **Order**: FIFO (First In, First Out)
- **Locking**: Optimistic locking with atomic updates
- **Concurrency**: Multiple workers can process different files simultaneously
- **Trigger**: Automatically triggered after successful file upload/parsing

### Locking Mechanism (File Parsing)
```sql
-- Atomic lock: only succeeds if status is still 'parsing'
UPDATE import_sessions 
SET status = 'parsing' 
WHERE id = $1 AND status = 'parsing'
RETURNING id;
```

### Locking Mechanism (EAN Analysis)
```sql
-- Atomic lock: only succeeds if ean_analysis_status is still NULL
UPDATE import_sessions 
SET ean_analysis_status = 'analyzing' 
WHERE id = $1 
  AND status = 'ready_for_processing' 
  AND ean_analysis_status IS NULL
RETURNING id;
```

**Locking Rules**:
1. SELECT session with correct status
2. UPDATE status with WHERE clause check
3. If UPDATE returns row → lock successful
4. If UPDATE returns no row → another process got the lock

## Error Handling

### Error Categories

**Storage Errors**:
- File not found in storage
- Storage API failures
- Network errors during download/upload
- **Action**: Mark session as 'failed', store error message

**Parsing Errors**:
- Corrupt or invalid file format
- Unsupported file type
- Empty files (handled gracefully)
- Missing headers
- **Action**: Mark session as 'failed', store parsing error

**Detection Errors**:
- No headers found in file
- File parsing failures
- Column detection failures
- **Action**: Mark ean_analysis_status as 'failed', store detection error

**Analysis Errors**:
- Column not found in file
- File parsing failures during analysis
- Invalid column selection
- **Action**: Mark ean_analysis_status as 'failed', store analysis error

**Business Logic Errors**:
- No EAN column found → ean_analysis_status 'no_ean_column', bestand kan niet verder
- Multiple EAN columns → ean_analysis_status 'pending_column_selection', wacht op gebruiker
- **Action**: Update status appropriately, store information for user

**Database Errors**:
- Connection failures
- Update failures
- Transaction conflicts
- **Action**: Mark status as 'failed', store database error

### Error Recovery

**Retry Strategy**:
- Failed parsing can be manually retried
- Reset status from 'failed' to appropriate previous status
- Trigger queue processing again
- No automatic retries (prevent infinite loops)

**Error Logging**:
- All errors logged with context
- Error messages stored in `error_message` field
- Timestamp of failure stored

## Performance Considerations

**File Upload**:
- Hash calculation: Can be async, doesn't block
- Storage upload: Large files may take time, consider progress tracking
- **API Timeout**: Configured to 5 minutes (300 seconds) for files up to 50MB
- **Large File Handling**: Files >20MB may require longer upload times (typically 1-2 minutes for 24MB files)
- **Logging**: Upload duration and file size logged for performance monitoring

**Metadata Extraction**:
- Only reads file structure, not full content
- CSV: Streaming parser (memory efficient)
- Excel: Loads workbook structure only
- Expected time: < 5 seconds for files up to 50MB

**EAN Column Detection**:
- Samples up to 100 rows (memory efficient)
- CSV: Streaming parser
- Excel: Row-by-row processing
- Expected time: < 5 seconds for files up to 50MB

**EAN Analysis**:
- Processes all rows in file
- CSV: Streaming parser
- Excel: Row-by-row processing
- Expected time: < 30 seconds for files up to 50MB with 15k rows

**Concurrent Processing**: 
- Multiple queue workers can run simultaneously
- Atomic locking prevents duplicate processing
- Queue processes files in FIFO order

**Retry Strategy**:
- Failed files remain in 'failed' status
- Can be manually retried by updating status back to appropriate previous status
- Automatic retry not implemented (to prevent infinite loops)

## Security Considerations

- **Storage Access**: Uses service role key (server-side only)
- **File Validation**: Only processes files that passed upload validation
- **Error Messages**: Sanitized error messages (no internal paths exposed)
- **Status Locking**: Prevents unauthorized status changes
- **User Input Validation**: Column selection validated against detected columns
- **File Size Limit**: Prevent DoS attacks
- **Authorization**: Operations require authentication (future)

## Best Practices

1. **Idempotence**: Processing can be safely retried on failure
2. **Atomic Updates**: Status changes are atomic to prevent race conditions
3. **Error Recovery**: Failed processing stores error details for debugging
4. **Logging**: All processing steps logged for monitoring
5. **Performance**: Metadata extraction and column detection use sampling for efficiency
6. **User Experience**: Clear status indicators and error messages
7. **Data Integrity**: Only valid GTIN-13 codes are counted
8. **Queue Processing**: FIFO ordering ensures fairness

## Dependencies

### External Services
- **Supabase Storage**: File storage service
- **Supabase Database**: Session metadata storage and updates

### Internal Services
- **FileStorage**: Storage upload/download abstraction
- **FileParser**: Metadata extraction (`getFileMetadata`)
- **FileProcessor**: Orchestration service (`processFile`)
- **EANDetector**: Column detection service (`detectEANColumns`)
- **EANAnalyzer**: EAN code analysis service (`analyzeEANs`)
- **EANAnalysisProcessor**: Orchestration service (`processEANAnalysis`)

## Transaction Boundaries

### Transaction 1: Session Creation + Storage Upload
- Start: Session record creation
- Commit: After successful storage upload
- Rollback: If storage upload fails

### Transaction 2: Lock Session (Parsing)
- Start: SELECT session with status 'parsing'
- Update: SET status = 'parsing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

### Transaction 3: Process File
- Start: Download file from storage
- Process: Extract metadata
- Commit: Update database with metadata and status
- Rollback: On any error → mark status as 'failed' with error message

### Transaction 4: Lock Session (EAN Analysis)
- Start: SELECT session with status 'ready_for_processing' and ean_analysis_status IS NULL
- Update: SET ean_analysis_status = 'analyzing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

### Transaction 5: Process EAN Analysis
- Start: Download file from storage
- Process: Detect columns, analyze EAN codes
- Commit: Update database with results and status
- Rollback: On any error → mark ean_analysis_status as 'failed' with error message

**Note**: Each step is independent and can fail gracefully without affecting other sessions.

## JSON Viewer API

### GET /api/sessions/[sessionId]/json

**Purpose**: Get JSON data for a session with server-side pagination and search

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Rows per page (default: 50, max: 200)
- `search`: Search term (optional, searches in all columns, case-insensitive)

**Success Response** (200):
```json
{
  "success": true,
  "data": [...], // Array of row objects for current page
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  },
  "columns": ["col1", "col2", ...], // All column names
  "searchResults": 42 // Number of rows matching search (if search param present)
}
```

**Error Responses**:
- **404**: Session not found or JSON data not found
- **500**: Internal server error

**Use Cases**:
- Validate JSON data structure before activation
- Search for specific products or values
- Verify data completeness and accuracy
- Review converted data format

**Access Control**:
- Available for sessions with status: `approved`, `converting`, `ready_for_activation`, `activating`, `activated`
- JSON data must exist in Storage at path: `approved/{sessionId}/data.json`

