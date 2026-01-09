# Test Cases: Data-import Domain

## Overview
Deze test suite dekt alle functionaliteit van het Data-import domein, inclusief file upload, parsing, EAN analysis en session management. Test cases zijn georganiseerd per workflow fase.

## Test Suite Organisatie

### Phase 1: Extract (File Upload & Storage)
- TC-FU-001 t/m TC-FU-017: File Upload & Storage test cases

### Phase 2: Transform (File Parsing)
- TC-FP-001 t/m TC-FP-020: File Parsing Queue test cases
- TC-FM-001 t/m TC-FM-006: File Metadata Extraction unit tests

### Phase 3: EAN Analysis
- TC-EAN-001 t/m TC-EAN-028: EAN Analysis test cases

### Session Management
- TC-DS-001 t/m TC-DS-008: Session Delete test cases

---

## Phase 1: Extract - File Upload & Storage

### TC-FU-001: Successful File Upload (CSV)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Supabase Storage bucket `supplier-uploads` exists
- Database `import_sessions` table exists
- No duplicate file in database

**Test Data**:
- File: `test-products.csv` (1MB, valid CSV format)
- Content: Valid product data with EAN codes

**Steps**:
1. POST request to `/api/upload` with `test-products.csv`
2. Verify response status: 200 OK
3. Verify response contains `sessionId`, `storagePath`
4. Verify database record created with status `'parsing'`
5. Verify file exists in Storage at correct path
6. Verify file hash is stored correctly

**Expected Results**:
- HTTP 200
- Response JSON matches schema
- Database record exists with correct metadata
- File accessible in Storage
- File hash is SHA256 format (64 chars)

**Post-conditions**:
- Import session in database
- File in Storage bucket

---

### TC-FU-002: Successful File Upload (Excel)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**: Same as TC-FU-001

**Test Data**:
- File: `test-products.xlsx` (2MB, valid Excel format)

**Steps**: Same as TC-FU-001

**Expected Results**: Same as TC-FU-001, with `file_type: 'xlsx'`

---

### TC-FU-003: Duplicate File Detection
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- File `test-products.csv` already uploaded (session exists)

**Test Data**:
- File: `test-products.csv` (exact same content as previous upload)

**Steps**:
1. POST request to `/api/upload` with same file
2. Verify response status: 409 Conflict
3. Verify response contains existing session info
4. Verify no new database record created
5. Verify no new file uploaded to Storage

**Expected Results**:
- HTTP 409
- Error code: `DUPLICATE_FILE`
- Response contains `existingSessionId` and `uploadedAt`
- No new session record
- Storage unchanged

---

### TC-FU-004: Invalid File Extension
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File: `test.txt` (text file)
- File: `test.pdf` (PDF file)
- File: `test.doc` (Word document)

**Steps**:
1. POST request with invalid extension file
2. Verify response status: 400 Bad Request

**Expected Results**:
- HTTP 400
- Error code: `FILE_EXTENSION_INVALID`
- Error message describes allowed extensions
- No database record created
- No Storage upload attempted

---

### TC-FU-005: File Size Exceeds Limit
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File: `large-file.csv` (51MB, exceeds 50MB limit)

**Steps**:
1. POST request with oversized file
2. Verify response status: 400 Bad Request

**Expected Results**:
- HTTP 400
- Error code: `FILE_SIZE_EXCEEDED`
- Error message includes size limit (50MB)
- No database record created
- No Storage upload attempted

---

### TC-FU-006: Empty File
**Priority**: Medium  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File: `empty.csv` (0 bytes)

**Steps**:
1. POST request with empty file
2. Verify response status: 400 Bad Request

**Expected Results**:
- HTTP 400
- Error code: `FILE_INVALID`
- Error message: "File is empty"
- No database record created

---

### TC-FU-007: Storage Upload Failure
**Priority**: High  
**Type**: Integration Test (with mocked Storage)

**Preconditions**:
- Storage service configured to fail on upload

**Test Data**:
- File: `test-products.csv` (valid file)

**Steps**:
1. POST request with valid file
2. Storage service simulates failure
3. Verify response status: 500 Internal Server Error

**Expected Results**:
- HTTP 500
- Error code: `STORAGE_UPLOAD_FAILED`
- No file in Storage
- Database session marked as `'failed'` (or no record if transaction rolled back)

---

### TC-FU-008: Database Connection Failure
**Priority**: Medium  
**Type**: Integration Test (with mocked DB)

**Preconditions**:
- Database unavailable or connection error

**Test Data**:
- File: `test-products.csv` (valid file)

**Steps**:
1. POST request with valid file
2. Database connection fails
3. Verify error handling

**Expected Results**:
- HTTP 500
- Error code: `DATABASE_ERROR`
- No database record created
- No Storage upload attempted (transaction boundary)

---

### TC-FU-009: File Hash Calculation
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File: `test.csv` with known content
- Expected hash: Pre-calculated SHA256 value

**Steps**:
1. Calculate hash for test file
2. Verify hash format and value

**Expected Results**:
- Hash is exactly 64 characters
- Hash matches expected SHA256 value
- Hash is lowercase hex string

**Test Cases**:
- Same file content always produces same hash
- Different file content produces different hash
- Empty file produces valid hash

---

### TC-FU-010: Filename Sanitization
**Priority**: Medium  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Filename: `test file (1).csv`
- Filename: `test/file.csv`
- Filename: `test@file#name$.csv`
- Filename: `test file with spaces.csv`

**Steps**:
1. Sanitize filename
2. Verify sanitized result

**Expected Results**:
- Special characters removed or replaced
- Extension preserved
- Valid path characters only
- No path traversal (`../` removed)

**Examples**:
- `test file (1).csv` → `test-file-1.csv`
- `test/file.csv` → `test-file.csv`
- `test@file#name$.csv` → `test-filename.csv`

---

### TC-FU-011: Storage Path Construction
**Priority**: High  
**Type**: Unit Test

**Preconditions**: Session ID generated

**Test Data**:
- Session ID: `550e8400-e29b-41d4-a716-446655440000`
- Filename: `products.csv`

**Steps**:
1. Construct storage path
2. Verify path format

**Expected Results**:
- Path: `incoming/550e8400-e29b-41d4-a716-446655440000/products.csv`
- Path starts with `incoming/`
- Path contains valid UUID
- Path contains sanitized filename

---

### TC-FU-012: Concurrent Upload Detection
**Priority**: Low  
**Type**: Integration Test

**Preconditions**: None

**Test Data**:
- Same file uploaded simultaneously from 2 requests

**Steps**:
1. Start 2 concurrent POST requests with same file
2. Verify duplicate detection works

**Expected Results**:
- One request succeeds (200)
- One request fails (409 DUPLICATE_FILE)
- Only one database record created
- Only one file in Storage

**Note**: Requires database unique constraint on `file_hash`

---

### TC-FU-013: Storage Bucket Auto-Creation
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Bucket `supplier-uploads` does not exist

**Test Data**:
- File: `test-products.csv`

**Steps**:
1. POST request with valid file
2. Verify bucket is created automatically

**Expected Results**:
- Bucket `supplier-uploads` is created
- Bucket is private (authenticated only)
- File upload succeeds
- Subsequent uploads don't recreate bucket

---

### TC-FU-014: Session Status Lifecycle
**Priority**: High  
**Type**: Integration Test

**Preconditions**: None

**Test Data**:
- File: `test-products.csv`

**Steps**:
1. POST request with file
2. Check database session status at each step

**Expected Results**:
1. After session creation: `status = 'pending'`
2. After storage upload: `status = 'parsing'`
3. `uploaded_at` timestamp set
4. `file_storage_path` populated

---

### TC-FU-015: Large File Upload (Edge Case)
**Priority**: Medium  
**Type**: Performance Test

**Preconditions**: None

**Test Data**:
- File: `large-products.csv` (exactly 50MB, boundary value)

**Steps**:
1. POST request with 50MB file
2. Monitor upload time and memory usage

**Expected Results**:
- Upload succeeds (within limit)
- Response time acceptable (< 5 minutes, API timeout limit)
- Memory usage stable
- File correctly stored in Storage

---

### TC-FU-016: Network Timeout Handling
**Priority**: High  
**Type**: Integration Test (with mocked network failure)

**Preconditions**:
- Storage service configured to simulate network timeout

**Test Data**:
- File: `large-file.csv` (24MB, real-world scenario)

**Steps**:
1. POST request with large file
2. Storage service simulates network timeout/fetch failure
3. Verify error handling and response

**Expected Results**:
- HTTP 500
- Error code: `STORAGE_UPLOAD_FAILED`
- Error message includes context about file size and network issue
- Error message is user-friendly and actionable (suggests retry or support contact)
- Database session marked as `'failed'` with descriptive error message
- Error message contains file size information for debugging

---

### TC-FU-017: Large File Upload Success (Real-world)
**Priority**: High  
**Type**: Integration Test

**Preconditions**: None

**Test Data**:
- File: `FHB-Artikelstammdaten_v105.csv` (24MB, real file)

**Steps**:
1. POST request with 24MB file
2. Monitor upload progress
3. Verify successful completion

**Expected Results**:
- Upload succeeds within 5-minute timeout
- Response time acceptable (< 2 minutes for 24MB)
- File correctly stored in Storage
- Session status updated to `'parsing'`
- All metadata correctly stored
- Upload duration logged for monitoring

---

## Phase 2: Transform - File Parsing & Metadata Extraction

### TC-FP-001: Successful Queue Processing (CSV)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'parsing' exists
- File exists in Supabase Storage at `file_storage_path`
- File is valid CSV format

**Test Data**:
- Session: ID 123, status 'parsing', file_type 'csv'
- File: `test-products.csv` in Storage
- Content: CSV with 100 data rows, 10 columns

**Steps**:
1. POST request to `/api/process-queue`
2. Verify response status: 200 OK
3. Verify response contains `processed: 1`, `sessionId`, `metadata`
4. Verify database session status updated to 'ready_for_processing'
5. Verify `total_rows_in_file = 100`
6. Verify `columns_count = 10`
7. Verify `parsed_at` timestamp is set
8. Verify `error_message` is NULL

**Expected Results**:
- HTTP 200
- Response JSON: `{ success: true, processed: 1, sessionId: 123, metadata: { rowCount: 100, columnCount: 10 } }`
- Database session has correct metadata
- Status is 'ready_for_processing'
- File not downloaded to client (only metadata extracted)

**Post-conditions**:
- Session status: 'ready_for_processing'
- Metadata stored in database

---

### TC-FP-002: Successful Queue Processing (Excel)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**: Same as TC-FP-001, but with Excel file

**Test Data**:
- Session: ID 124, status 'parsing', file_type 'xlsx'
- File: `test-products.xlsx` in Storage
- Content: Excel with 50 data rows, 15 columns

**Steps**: Same as TC-FP-001

**Expected Results**: Same as TC-FP-001, with Excel-specific values:
- `metadata.rowCount = 50`
- `metadata.columnCount = 15`
- File type handling correct

---

### TC-FP-003: Queue Empty (No Files)
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- No import sessions with status 'parsing' exist

**Test Data**: None

**Steps**:
1. POST request to `/api/process-queue`
2. Verify response status: 200 OK

**Expected Results**:
- HTTP 200
- Response JSON: `{ success: true, processed: 0, message: "No files in queue" }`
- No database changes

---

### TC-FP-004: Concurrent Queue Processing
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Two import sessions with status 'parsing' exist
- Multiple queue workers can run simultaneously

**Test Data**:
- Session 1: ID 125, status 'parsing'
- Session 2: ID 126, status 'parsing'

**Steps**:
1. Start 2 concurrent POST requests to `/api/process-queue`
2. Verify both requests succeed
3. Verify each processes a different session
4. Verify no session is processed twice

**Expected Results**:
- Both requests return HTTP 200
- One request processes session 125
- One request processes session 126
- No race conditions
- Atomic locking works correctly

**Note**: Tests atomic locking mechanism

---

### TC-FP-005: File Not Found in Storage
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'parsing' exists
- File does NOT exist in Storage (or path is incorrect)

**Test Data**:
- Session: ID 127, status 'parsing', file_storage_path: 'invalid/path/file.csv'

**Steps**:
1. POST request to `/api/process-queue`
2. Verify error handling
3. Verify response status: 500 Internal Server Error
4. Verify database session status updated to 'failed'
5. Verify error_message contains storage error details

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session status: 'failed'
- Error message: "Failed to download file from storage: File not found..."
- No metadata extracted

---

### TC-FP-006: Corrupt CSV File
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'parsing' exists
- File exists in Storage but is corrupt/invalid

**Test Data**:
- Session: ID 128, status 'parsing', file_type 'csv'
- File: Corrupt CSV (invalid encoding, malformed structure)

**Steps**:
1. POST request to `/api/process-queue`
2. Verify error handling
3. Verify response status: 500 Internal Server Error
4. Verify database session status updated to 'failed'
5. Verify error_message contains parsing error details

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session status: 'failed'
- Error message: "Failed to parse file: {parsing error}"
- No metadata extracted

---

### TC-FP-007: Empty CSV File
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'parsing' exists
- File exists in Storage but is empty (0 bytes)

**Test Data**:
- Session: ID 129, status 'parsing', file_type 'csv'
- File: Empty CSV file

**Steps**:
1. POST request to `/api/process-queue`
2. Verify response status: 200 OK
3. Verify metadata: `rowCount = 0`, `columnCount = 0`

**Expected Results**:
- HTTP 200
- Success response
- `metadata.rowCount = 0`
- `metadata.columnCount = 0`
- Status: 'ready_for_processing'
- No error thrown (empty file is valid)

---

### TC-FP-008: CSV File with Only Header
**Priority**: Medium  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV content: `"ean,name,price,supplier\n"` (header only, no data rows)

**Steps**:
1. Call `getFileMetadata()` with CSV file
2. Verify metadata returned

**Expected Results**:
- `metadata.rowCount = 0` (no data rows, header excluded)
- `metadata.columnCount = 4` (header columns detected)
- No error thrown

---

### TC-FP-009: CSV File with Different Column Counts
**Priority**: Low  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV with inconsistent column counts across rows

**Steps**:
1. Call `getFileMetadata()` with CSV file
2. Verify column count detection

**Expected Results**:
- Column count based on header row
- Row count includes all rows with data (even if inconsistent columns)
- No error thrown (metadata extraction, not validation)

---

### TC-FP-010: Large CSV File (50MB)
**Priority**: Medium  
**Type**: Performance Test

**Preconditions**:
- Import session with large file (50MB) exists
- File exists in Storage

**Test Data**:
- Session: ID 130, status 'parsing', file_type 'csv'
- File: Large CSV (50MB, ~15,000 rows, 36 columns)

**Steps**:
1. POST request to `/api/process-queue`
2. Monitor processing time
3. Verify successful processing
4. Verify correct metadata extracted

**Expected Results**:
- Processing completes within 30 seconds (metadata only, not full parsing)
- Memory usage stable (streaming parser)
- Metadata correct: `rowCount = ~15,000`, `columnCount = 36`
- Status: 'ready_for_processing'

---

### TC-FP-011: Excel File with Multiple Sheets
**Priority**: Medium  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Excel file with 3 sheets
- First sheet has data (100 rows, 10 columns)
- Other sheets have different structures

**Steps**:
1. Call `getFileMetadata()` with Excel file
2. Verify metadata from first sheet

**Expected Results**:
- Metadata from first sheet only
- `rowCount = 100`
- `columnCount = 10`
- Other sheets ignored

---

### TC-FP-012: Excel File with Empty Rows
**Priority**: Low  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Excel file with:
  - Header row (row 1)
  - Data rows (rows 2-101)
  - Empty rows (rows 102-200)
  - Trailing empty rows should be ignored

**Steps**:
1. Call `getFileMetadata()` with Excel file
2. Verify only data rows counted

**Expected Results**:
- `rowCount = 100` (excludes header and empty trailing rows)
- `columnCount = 10` (from header)
- Empty trailing rows excluded from count

---

### TC-FP-013: Session Lock Already Taken
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Session with status 'parsing' exists
- Another process has already locked it

**Test Data**:
- Session: ID 131, status 'parsing' (locked by another process)

**Steps**:
1. POST request to `/api/process-queue`
2. Verify lock detection
3. Verify response status: 200 OK

**Expected Results**:
- HTTP 200
- Response: `{ success: true, processed: 0, message: "No files available..." }`
- No processing attempted
- No database changes (session remains 'parsing')

---

### TC-FP-014: Queue Processing with Missing Storage Path
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'parsing' exists
- Session has NULL or empty `file_storage_path`

**Test Data**:
- Session: ID 132, status 'parsing', file_storage_path: NULL

**Steps**:
1. POST request to `/api/process-queue`
2. Verify error handling
3. Verify response status: 500 Internal Server Error

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session status: 'failed'
- Error message: "Session 132 has no storage path"
- No processing attempted

---

### TC-FP-015: Queue Processing FIFO Order
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Three import sessions with status 'parsing' exist
- Sessions created at different times

**Test Data**:
- Session 1: ID 133, created_at: 2026-01-08 10:00:00
- Session 2: ID 134, created_at: 2026-01-08 10:01:00
- Session 3: ID 135, created_at: 2026-01-08 10:02:00

**Steps**:
1. POST request to `/api/process-queue`
2. Verify session 133 is processed (oldest first)
3. Repeat to verify session 134 is next
4. Repeat to verify session 135 is last

**Expected Results**:
- First request processes session 133 (oldest)
- Second request processes session 134
- Third request processes session 135
- FIFO order maintained

---

### TC-FP-016: Database Update Failure During Processing
**Priority**: Medium  
**Type**: Integration Test (with mocked DB)

**Preconditions**:
- Import session with status 'parsing' exists
- File exists in Storage and is valid
- Database update operation configured to fail

**Test Data**:
- Session: ID 136, status 'parsing', valid file

**Steps**:
1. POST request to `/api/process-queue`
2. Database update fails after successful parsing
3. Verify error handling

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session status: 'failed'
- Error message: "Failed to update session with metadata: {error}"
- Metadata extracted but not saved

---

### TC-FP-017: Retry Failed Parsing
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'failed' exists
- Original error resolved (e.g., file now exists in Storage)

**Test Data**:
- Session: ID 137, status 'failed', error_message: "File not found"
- File now exists in Storage (error resolved)

**Steps**:
1. Update session status from 'failed' to 'parsing'
2. POST request to `/api/process-queue`
3. Verify successful processing

**Expected Results**:
- Processing succeeds
- Status: 'ready_for_processing'
- Metadata extracted and stored
- Error message cleared (NULL)

---

### TC-FP-018: CSV with Special Characters in Data
**Priority**: Low  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV with special characters: quotes, commas, newlines in data cells
- Header: "ean,name,description"
- Data rows contain special characters

**Steps**:
1. Call `getFileMetadata()` with CSV file
2. Verify metadata extraction

**Expected Results**:
- Row count correct (handles special characters)
- Column count correct (header detection works)
- No parsing errors
- Special characters don't break counting

---

### TC-FP-019: Excel with Merged Cells
**Priority**: Low  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Excel file with merged cells in header or data area

**Steps**:
1. Call `getFileMetadata()` with Excel file
2. Verify metadata extraction

**Expected Results**:
- Row count correct
- Column count based on actual cell boundaries
- Merged cells handled correctly
- No parsing errors

---

### TC-FP-020: Automatic Queue Trigger After Upload
**Priority**: High  
**Type**: Integration Test

**Preconditions**: None

**Test Data**:
- File: `test-products.csv` (valid CSV)

**Steps**:
1. POST request to `/api/upload` with file
2. Verify upload succeeds (status = 'parsing')
3. Verify queue processing is automatically triggered
4. Wait for queue processing to complete
5. Verify session status is 'ready_for_processing'

**Expected Results**:
- Upload succeeds
- Queue processing triggered automatically (fire-and-forget)
- Session processed without manual intervention
- Status: 'ready_for_processing' with metadata

**Note**: Tests automatic integration between upload and queue

---

## Phase 3: EAN Analysis & Code Detection

### TC-EAN-001: Validate GTIN-13 - Valid Code
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Valid GTIN-13: `"8712345678901"` (13 digits)

**Steps**:
1. Call `validateGTIN13("8712345678901")`
2. Verify return value

**Expected Results**:
- Returns `true`
- Code is recognized as valid GTIN-13

---

### TC-EAN-002: Validate GTIN-13 - Invalid Length (Too Short)
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Invalid: `"871234567890"` (12 digits)

**Steps**:
1. Call `validateGTIN13("871234567890")`
2. Verify return value

**Expected Results**:
- Returns `false`
- Code rejected due to incorrect length

---

### TC-EAN-003: Validate GTIN-13 - Invalid Length (Too Long)
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Invalid: `"87123456789012"` (14 digits)

**Steps**:
1. Call `validateGTIN13("87123456789012")`
2. Verify return value

**Expected Results**:
- Returns `false`
- Code rejected due to incorrect length

---

### TC-EAN-004: Validate GTIN-13 - Non-Numeric Characters
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Invalid: `"87123456789AB"` (contains letters)

**Steps**:
1. Call `validateGTIN13("87123456789AB")`
2. Verify return value

**Expected Results**:
- Returns `false`
- Code rejected due to non-numeric characters

---

### TC-EAN-005: Validate GTIN-13 - With Whitespace
**Priority**: Medium  
**Type**: Unit Test

**Test Data**:
- Invalid: `" 8712345678901 "` (with spaces)

**Steps**:
1. Call `validateGTIN13(" 8712345678901 ")`
2. Verify return value

**Expected Results**:
- Returns `true` (validation should trim first, then check)

---

### TC-EAN-006: Validate GTIN-13 - Empty String
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Invalid: `""` (empty)

**Steps**:
1. Call `validateGTIN13("")`
2. Verify return value

**Expected Results**:
- Returns `false`
- Empty string rejected

---

### TC-EAN-007: Validate GTIN-13 - Null/Undefined
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Invalid: `null` or `undefined`

**Steps**:
1. Call `validateGTIN13(null)` or `validateGTIN13(undefined)`
2. Verify return value

**Expected Results**:
- Returns `false`
- Null/undefined rejected

---

### TC-EAN-008: Detect EAN Columns - CSV with Single EAN Column
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV file with columns: `ean, name, price`
- EAN column contains valid GTIN-13 codes (≥80% valid)
- Other columns contain non-EAN data

**Steps**:
1. Call `detectEANColumns(file, ["ean", "name", "price"])`
2. Verify return value

**Expected Results**:
- Returns array with single element: `["ean"]`
- Only EAN column detected

---

### TC-EAN-009: Detect EAN Columns - CSV with Multiple EAN Columns
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- CSV file with columns: `ean, gtin, barcode, name`
- Multiple columns contain valid GTIN-13 codes

**Steps**:
1. Call `detectEANColumns(file, ["ean", "gtin", "barcode", "name"])`
2. Verify return value

**Expected Results**:
- Returns array with multiple elements: `["ean", "gtin", "barcode"]` (or similar)
- All EAN columns detected

---

### TC-EAN-010: Detect EAN Columns - CSV with No EAN Column
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- CSV file with columns: `name, price, supplier`
- No column contains valid GTIN-13 codes

**Steps**:
1. Call `detectEANColumns(file, ["name", "price", "supplier"])`
2. Verify return value

**Expected Results**:
- Returns empty array: `[]`
- No EAN columns detected

---

### TC-EAN-011: Detect EAN Columns - Excel with Single EAN Column
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- Excel file with columns: `EAN, Name, Price`
- EAN column contains valid GTIN-13 codes

**Steps**:
1. Call `detectEANColumns(file, ["EAN", "Name", "Price"])`
2. Verify return value

**Expected Results**:
- Returns array with single element: `["EAN"]`
- Only EAN column detected

---

### TC-EAN-012: Detect EAN Columns - Column with <80% Valid Codes
**Priority**: Medium  
**Type**: Unit Test

**Test Data**:
- CSV file with column that has <80% valid GTIN-13 codes
- Column has mix of valid and invalid values

**Steps**:
1. Call `detectEANColumns(file, headers)`
2. Verify return value

**Expected Results**:
- Column not included in results
- Only columns with ≥80% valid codes are detected

---

### TC-EAN-013: Analyze EANs - All Unique Codes
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File with EAN column containing 10 unique GTIN-13 codes
- No duplicates

**Steps**:
1. Call `analyzeEANs(file, "ean")`
2. Verify return value

**Expected Results**:
- `uniqueCount = 10`
- `duplicateCount = 0`
- `totalEANs = 10`

---

### TC-EAN-014: Analyze EANs - With Duplicates
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- File with EAN column containing:
  - 5 unique codes
  - 3 codes appear twice (duplicates)
  - Total: 11 EAN codes

**Steps**:
1. Call `analyzeEANs(file, "ean")`
2. Verify return value

**Expected Results**:
- `uniqueCount = 5`
- `duplicateCount = 3` (3 codes that appear more than once)
- `totalEANs = 11`

---

### TC-EAN-015: Analyze EANs - Empty File
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Empty file or file with no data rows

**Steps**:
1. Call `analyzeEANs(file, "ean")`
2. Verify return value

**Expected Results**:
- `uniqueCount = 0`
- `duplicateCount = 0`
- `totalEANs = 0`
- No error thrown

---

### TC-EAN-016: Analyze EANs - Invalid Codes Filtered
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- File with EAN column containing:
  - 5 valid GTIN-13 codes
  - 3 invalid codes (wrong length, non-numeric, etc.)

**Steps**:
1. Call `analyzeEANs(file, "ean")`
2. Verify return value

**Expected Results**:
- `uniqueCount = 5` (only valid codes counted)
- `duplicateCount = 0`
- `totalEANs = 5` (invalid codes filtered out)

---

### TC-EAN-017: Analyze EANs - CSV File
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- CSV file with EAN column

**Steps**:
1. Call `analyzeEANs(csvFile, "ean")`
2. Verify return value

**Expected Results**:
- Analysis completes successfully
- Results are correct
- CSV parsing works correctly

---

### TC-EAN-018: Analyze EANs - Excel File
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- Excel file with EAN column

**Steps**:
1. Call `analyzeEANs(excelFile, "EAN")`
2. Verify return value

**Expected Results**:
- Analysis completes successfully
- Results are correct
- Excel parsing works correctly

---

### TC-EAN-019: Successful EAN Analysis - Single Column
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'ready_for_processing' exists
- File exists in Supabase Storage
- File has exactly one EAN column

**Test Data**:
- Session: ID 200, status 'ready_for_processing', ean_analysis_status NULL
- File: CSV with single EAN column, 100 rows

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify response status: 200 OK
3. Verify database session updated
4. Verify ean_analysis_status = 'completed'
5. Verify unique_ean_count and duplicate_ean_count set

**Expected Results**:
- HTTP 200
- Response JSON: `{ success: true, processed: 1, sessionId: 200 }`
- Database session has correct EAN statistics
- Status is 'completed'
- detected_ean_column set to column name

---

### TC-EAN-020: EAN Analysis - No EAN Column Found
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'ready_for_processing' exists
- File exists in Storage
- File has no EAN columns

**Test Data**:
- Session: ID 201, status 'ready_for_processing'
- File: CSV with no EAN columns

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify response status: 200 OK
3. Verify database session updated
4. Verify ean_analysis_status = 'no_ean_column'

**Expected Results**:
- HTTP 200
- Session ean_analysis_status = 'no_ean_column'
- Error message indicates no EAN column found
- File cannot proceed

---

### TC-EAN-021: EAN Analysis - Multiple EAN Columns
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'ready_for_processing' exists
- File exists in Storage
- File has multiple EAN columns

**Test Data**:
- Session: ID 202, status 'ready_for_processing'
- File: CSV with multiple EAN columns (ean, gtin, barcode)

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify response status: 200 OK
3. Verify database session updated
4. Verify ean_analysis_status = 'pending_column_selection'
5. Verify error_message contains detected columns

**Expected Results**:
- HTTP 200
- Session ean_analysis_status = 'pending_column_selection'
- Error message lists detected columns
- User selection required

---

### TC-EAN-022: Select EAN Column - Successful
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session with ean_analysis_status 'pending_column_selection' exists
- File exists in Storage
- Valid column name provided

**Test Data**:
- Session: ID 203, ean_analysis_status 'pending_column_selection'
- Column name: "ean"

**Steps**:
1. POST request to `/api/select-ean-column` with { sessionId: 203, columnName: "ean" }
2. Verify response status: 200 OK
3. Verify database session updated
4. Verify ean_analysis_status = 'completed'
5. Verify EAN statistics set

**Expected Results**:
- HTTP 200
- Response JSON: `{ success: true, sessionId: 203, columnName: "ean" }`
- Session ean_analysis_status = 'completed'
- unique_ean_count and duplicate_ean_count set
- detected_ean_column = "ean"

---

### TC-EAN-023: Select EAN Column - Invalid Session
**Priority**: High  
**Type**: Integration Test

**Preconditions**: None

**Test Data**:
- Session ID: 999 (does not exist)

**Steps**:
1. POST request to `/api/select-ean-column` with { sessionId: 999, columnName: "ean" }
2. Verify response status: 404

**Expected Results**:
- HTTP 404
- Error code: `SESSION_NOT_FOUND`
- Error message indicates session not found

---

### TC-EAN-024: Select EAN Column - Wrong Status
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session exists but not in 'pending_column_selection' status

**Test Data**:
- Session: ID 204, ean_analysis_status 'completed'

**Steps**:
1. POST request to `/api/select-ean-column` with { sessionId: 204, columnName: "ean" }
2. Verify response status: 400

**Expected Results**:
- HTTP 400
- Error code: `INVALID_STATUS`
- Error message indicates incorrect status

---

### TC-EAN-025: EAN Analysis Queue - Empty
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- No import sessions with status 'ready_for_processing' and ean_analysis_status NULL

**Test Data**: None

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify response status: 200 OK

**Expected Results**:
- HTTP 200
- Response JSON: `{ success: true, processed: 0, message: "No files ready for EAN analysis" }`
- No database changes

---

### TC-EAN-026: Concurrent EAN Analysis Processing
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Two import sessions with status 'ready_for_processing' exist
- Multiple queue workers can run simultaneously

**Test Data**:
- Session 1: ID 205, status 'ready_for_processing'
- Session 2: ID 206, status 'ready_for_processing'

**Steps**:
1. Start 2 concurrent POST requests to `/api/analyze-ean`
2. Verify both requests succeed
3. Verify each processes a different session
4. Verify no session is processed twice

**Expected Results**:
- Both requests return HTTP 200
- One request processes session 205
- One request processes session 206
- No race conditions
- Atomic locking works correctly

---

### TC-EAN-027: EAN Analysis - File Not Found
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'ready_for_processing' exists
- File does NOT exist in Storage

**Test Data**:
- Session: ID 207, status 'ready_for_processing', file_storage_path: 'invalid/path/file.csv'

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify error handling
3. Verify response status: 500
4. Verify database session ean_analysis_status = 'failed'

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session ean_analysis_status = 'failed'
- Error message contains storage error details

---

### TC-EAN-028: EAN Analysis - Corrupt File
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'ready_for_processing' exists
- File exists in Storage but is corrupt/invalid

**Test Data**:
- Session: ID 208, status 'ready_for_processing'
- File: Corrupt CSV file

**Steps**:
1. POST request to `/api/analyze-ean`
2. Verify error handling
3. Verify response status: 500
4. Verify database session ean_analysis_status = 'failed'

**Expected Results**:
- HTTP 500
- Error code: `PROCESSING_ERROR`
- Session ean_analysis_status = 'failed'
- Error message contains parsing error details

---

## Session Management

### TC-DS-001: Successful Delete with Storage File
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has `file_storage_path` set
- File exists in Supabase Storage at the specified path

**Test Data**:
- Session ID: Valid session ID (e.g., "1")
- Storage path: "incoming/session-id/test.csv"

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Verify response status: 200 OK
3. Verify response contains success message
4. Verify storage file was deleted
5. Verify database record was deleted
6. Verify related `ean_conflicts` automatically deleted (CASCADE)

**Expected Results**:
- HTTP 200
- Response JSON: `{ "success": true, "message": "Session deleted successfully" }`
- Storage file removed from bucket
- Database record deleted
- Related conflicts deleted via CASCADE constraint

**Post-conditions**:
- Session removed from database
- File removed from Storage
- Conflicts removed (if any existed)

---

### TC-DS-002: Successful Delete without Storage File
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has `file_storage_path` as NULL or empty string

**Test Data**:
- Session ID: Valid session ID
- Storage path: NULL or ""

**Steps**:
1. DELETE request to `/api/sessions/[id]` with session ID
2. Verify response status: 200 OK
3. Verify storage delete function not called
4. Verify database delete succeeds

**Expected Results**:
- HTTP 200
- Storage delete function not invoked
- Database record deleted successfully

**Note**: This covers cases where upload failed before Storage was written, or Storage path is missing.

---

### TC-DS-003: Delete Failed Session
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session exists with status 'failed'
- Session may or may not have Storage file

**Test Data**:
- Session ID: Valid session ID
- Status: 'failed'
- Storage path: May be present or NULL

**Steps**:
1. DELETE request to `/api/sessions/[id]` with failed session ID
2. Verify response status: 200 OK
3. Verify session deleted successfully

**Expected Results**:
- HTTP 200
- Session deleted regardless of status

**Note**: All session statuses should be deletable.

---

### TC-DS-004: Delete Session Not Found
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Session ID does not exist in database

**Test Data**:
- Session ID: Non-existent ID (e.g., "999")
- Or empty/missing session ID

**Steps**:
1. DELETE request to `/api/sessions/[id]` with invalid session ID
2. Verify response status: 404 Not Found
3. Verify error code in response

**Expected Results**:
- HTTP 404
- Error code: `SESSION_NOT_FOUND`
- Error message: "Import session not found"
- No storage or database operations attempted

**Test Cases**:
- Non-existent session ID
- Missing session ID parameter
- Invalid session ID format

---

### TC-DS-005: Storage Delete Failure
**Priority**: High  
**Type**: Integration Test (with mocked Storage)

**Preconditions**:
- Session exists in database
- Storage service configured to fail on delete
- Session has valid `file_storage_path`

**Test Data**:
- Session ID: Valid session ID
- Storage path: "incoming/session-id/test.csv"
- Storage error: Simulated failure

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Storage service simulates failure
3. Verify graceful error handling
4. Verify database delete still proceeds

**Expected Results**:
- HTTP 200 (graceful degradation)
- Warning logged for Storage failure
- Database record deleted successfully
- Error logged but not thrown to user

**Note**: Storage delete failure should not prevent database delete (graceful degradation pattern).

---

### TC-DS-006: Database Delete Failure
**Priority**: Critical  
**Type**: Integration Test (with mocked Database)

**Preconditions**:
- Session exists in database
- Database configured to fail on delete

**Test Data**:
- Session ID: Valid session ID
- Database error: Simulated failure

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Database delete operation fails
3. Verify error response

**Expected Results**:
- HTTP 500
- Error code: `SESSION_DELETE_FAILED`
- Error message describes database failure
- Storage file remains (delete not rolled back)

**Note**: Database delete failure is a critical error and should stop the process.

---

### TC-DS-007: Delete Session with Conflicts
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has related `ean_conflicts` records
- CASCADE DELETE constraint exists on `ean_conflicts.session_id`

**Test Data**:
- Session ID: Valid session ID
- Related conflicts: 1 or more conflict records

**Steps**:
1. Verify conflicts exist for session
2. DELETE request to `/api/sessions/[id]`
3. Verify session deleted
4. Verify conflicts automatically deleted

**Expected Results**:
- HTTP 200
- Session deleted successfully
- Conflicts automatically deleted via CASCADE constraint
- No manual conflict cleanup needed in code

**Note**: CASCADE delete is handled by database, not application code. This test verifies the constraint works correctly.

---

### TC-DS-008: Delete Different Session Statuses
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Multiple sessions exist with different statuses

**Test Data**:
- Sessions with statuses: 'pending', 'parsing', 'ready_for_processing', 'completed', 'failed'

**Steps**:
1. For each status, DELETE request to `/api/sessions/[id]`
2. Verify each deletion succeeds

**Expected Results**:
- All statuses can be deleted
- HTTP 200 for all statuses
- No status-specific restrictions

**Test Matrix**:
| Status                | Can Delete | Expected Result |
|-----------------------|------------|-----------------|
| pending               | Yes        | 200 OK          |
| parsing               | Yes        | 200 OK          |
| ready_for_processing  | Yes        | 200 OK          |
| completed             | Yes        | 200 OK          |
| failed                | Yes        | 200 OK          |

---

## Test Data Requirements

### Sample CSV File
```csv
ean,name,price,supplier
8712345678901,Product A,15.99,Supplier X
8712345678902,Product B,25.50,Supplier Y
```

### Sample Excel File
- Sheet 1: Same columns as CSV
- Minimum 10 rows of test data
- Various column counts for testing
- Multiple EAN columns for testing column selection
- Various EAN code scenarios (unique, duplicates, invalid)

## Test Environment Setup

### Prerequisites
- Supabase project configured
- Test database with schema (including `import_sessions` table and EAN analysis fields)
- Storage bucket permissions set
- Environment variables configured

### Test Isolation
- Each test should clean up after execution
- Use unique session IDs
- Delete test files from Storage after tests
- Reset database state if needed
- Mock Storage and Database for error scenarios
- Reset mocks in `beforeEach` hooks

## Test Execution Order

### Smoke Tests (Run First)
1. TC-FU-001 (Basic upload)
2. TC-FU-004 (Validation)
3. TC-FP-001 (Basic queue processing - CSV)
4. TC-FP-003 (Empty queue)
5. TC-EAN-001 (Validate GTIN-13 - Valid)
6. TC-EAN-019 (Successful EAN Analysis - Single Column)
7. TC-DS-001 (Successful delete with file)
8. TC-DS-004 (Not found error)

### Core Functionality
9. TC-FU-002 (Excel upload)
10. TC-FU-003 (Duplicate detection)
11. TC-FU-009 (Hash calculation)
12. TC-FP-002 (Excel processing)
13. TC-FP-004 (Concurrent processing)
14. TC-FP-015 (FIFO order)
15. TC-EAN-008 (Detect EAN Columns - Single)
16. TC-EAN-013 (Analyze EANs - All Unique)
17. TC-EAN-014 (Analyze EANs - With Duplicates)
18. TC-EAN-022 (Select EAN Column - Successful)
19. TC-DS-002 (Delete without file)
20. TC-DS-003 (Delete failed session)
21. TC-DS-008 (All statuses)

### Error Handling
22. TC-FU-005 (Size limit)
23. TC-FU-007 (Storage failure)
24. TC-FU-008 (Database failure)
25. TC-FP-005 (File not found)
26. TC-FP-006 (Corrupt file)
27. TC-FP-014 (Missing storage path)
28. TC-EAN-020 (No EAN Column Found)
29. TC-EAN-021 (Multiple EAN Columns)
30. TC-EAN-023 (Invalid Session)
31. TC-EAN-024 (Wrong Status)
32. TC-EAN-027 (File Not Found)
33. TC-DS-005 (Storage failure - graceful degradation)
34. TC-DS-006 (Database failure - critical error)

### Edge Cases
35. TC-FU-010 (Filename sanitization)
36. TC-FU-015 (Large file)
37. TC-FU-016 (Network timeout)
38. TC-FU-017 (Real-world large file)
39. TC-FP-007 (Empty file)
40. TC-FP-008 (Header only)
41. TC-FP-010 (Large file)
42. TC-FP-013 (Lock already taken)
43. TC-EAN-002 through TC-EAN-007 (Validation edge cases)
44. TC-EAN-015 (Empty File)
45. TC-EAN-016 (Invalid Codes Filtered)

### Integration Tests
46. TC-FP-020 (Automatic queue trigger)
47. TC-EAN-026 (Concurrent Processing)
48. TC-EAN-025 (Empty Queue)
49. TC-DS-007 (CASCADE delete verification)

## Coverage Goals

- **Unit Tests**: 80%+ code coverage for fileValidation, fileParser, fileProcessor, eanDetection, eanAnalyzer
- **Integration Tests**: All API endpoints covered
- **Error Handling**: All error scenarios covered
- **Concurrency**: Concurrent processing scenarios tested
- **Critical Paths**: 100% coverage

## Performance Benchmarks

### File Upload
- Small file (< 1MB): < 2 seconds
- Medium file (1-10MB): < 10 seconds
- Large file (10-24MB): < 2 minutes (typical)
- Very large file (24-50MB): < 5 minutes (API timeout limit)
- Hash calculation: < 1 second per MB
- **Note**: API route timeout is configured to 5 minutes (300 seconds) to accommodate large file uploads

### File Parsing
- Small file (< 1MB): < 2 seconds for metadata extraction
- Medium file (1-10MB): < 5 seconds
- Large file (10-50MB): < 30 seconds
- Queue processing: < 1 second overhead per file
- Concurrent processing: No performance degradation with multiple workers

### EAN Analysis
- Column Detection: < 5 seconds for files up to 50MB
- EAN Analysis: < 30 seconds for files up to 50MB with 15k rows
- Queue Processing: < 1 second overhead per file
- Concurrent Processing: No performance degradation with multiple workers

### Session Delete
- Delete operation: < 1 second (without Storage file)
- Delete with Storage: < 2 seconds
- Error responses: < 500ms

