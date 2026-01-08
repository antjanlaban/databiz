# Test Cases: File Parsing Queue & Metadata Extraction

## Test Suite: File Parsing Queue API

### TC-FP-001: Successful Queue Processing (CSV)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'received' exists
- File exists in Supabase Storage at `file_storage_path`
- File is valid CSV format

**Test Data**:
- Session: ID 123, status 'received', file_type 'csv'
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
- Session: ID 124, status 'received', file_type 'xlsx'
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
- No import sessions with status 'received' exist

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
- Two import sessions with status 'received' exist
- Multiple queue workers can run simultaneously

**Test Data**:
- Session 1: ID 125, status 'received'
- Session 2: ID 126, status 'received'

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
- Import session with status 'received' exists
- File does NOT exist in Storage (or path is incorrect)

**Test Data**:
- Session: ID 127, status 'received', file_storage_path: 'invalid/path/file.csv'

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
- Import session with status 'received' exists
- File exists in Storage but is corrupt/invalid

**Test Data**:
- Session: ID 128, status 'received', file_type 'csv'
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
- Import session with status 'received' exists
- File exists in Storage but is empty (0 bytes)

**Test Data**:
- Session: ID 129, status 'received', file_type 'csv'
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
- Session: ID 130, status 'received', file_type 'csv'
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
- Session with status 'received' exists
- Another process has already locked it (status = 'parsing')

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
- Import session with status 'received' exists
- Session has NULL or empty `file_storage_path`

**Test Data**:
- Session: ID 132, status 'received', file_storage_path: NULL

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
- Three import sessions with status 'received' exist
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
- Import session with status 'received' exists
- File exists in Storage and is valid
- Database update operation configured to fail

**Test Data**:
- Session: ID 136, status 'received', valid file

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
1. Update session status from 'failed' to 'received'
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
2. Verify upload succeeds (status = 'received')
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

## Test Suite: File Metadata Extraction (Unit Tests)

### TC-FM-001: CSV Metadata Extraction - Standard File
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV content: `"ean,name,price\n8712345678901,Product A,15.99\n8712345678902,Product B,25.50\n"`

**Steps**:
1. Call `getFileMetadata()` with CSV file
2. Verify metadata returned

**Expected Results**:
- `metadata.rowCount = 2` (excludes header)
- `metadata.columnCount = 3`
- No errors

---

### TC-FM-002: CSV Metadata Extraction - Empty File
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV content: `""` (empty file)

**Steps**:
1. Call `getFileMetadata()` with empty CSV file
2. Verify metadata returned

**Expected Results**:
- `metadata.rowCount = 0`
- `metadata.columnCount = 0`
- No errors (empty file is valid)

---

### TC-FM-003: CSV Metadata Extraction - Header Only
**Priority**: Medium  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- CSV content: `"ean,name,price,supplier\n"` (header only)

**Steps**:
1. Call `getFileMetadata()` with CSV file
2. Verify metadata returned

**Expected Results**:
- `metadata.rowCount = 0`
- `metadata.columnCount = 4`
- No errors

---

### TC-FM-004: Excel Metadata Extraction - Standard File
**Priority**: Critical  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Excel file with header row + 100 data rows, 10 columns

**Steps**:
1. Call `getFileMetadata()` with Excel file
2. Verify metadata returned

**Expected Results**:
- `metadata.rowCount = 100` (excludes header)
- `metadata.columnCount = 10`
- No errors

---

### TC-FM-005: Excel Metadata Extraction - Empty File
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- Excel file with no data (empty workbook)

**Steps**:
1. Call `getFileMetadata()` with empty Excel file
2. Verify error handling

**Expected Results**:
- Error thrown: "No worksheet found in Excel file"
- Or: `rowCount = 0`, `columnCount = 0` if handled gracefully

---

### TC-FM-006: Unsupported File Format
**Priority**: High  
**Type**: Unit Test

**Preconditions**: None

**Test Data**:
- File: `test.txt` (text file, not CSV or Excel)

**Steps**:
1. Call `getFileMetadata()` with unsupported file
2. Verify error handling

**Expected Results**:
- Error thrown: "Unsupported file format. Please upload CSV or Excel files."
- Clear error message

---

## Test Data Requirements

### Sample CSV Files
```csv
ean,name,price,supplier
8712345678901,Product A,15.99,Supplier X
8712345678902,Product B,25.50,Supplier Y
```

### Sample Excel Files
- Sheet 1: Same columns as CSV
- Minimum 10 rows of test data
- Various column counts for testing

## Test Environment Setup

### Prerequisites
- Supabase project configured
- Test database with schema (including `import_sessions` table)
- Storage bucket permissions set
- Environment variables configured

### Test Isolation
- Each test should clean up after execution
- Use unique session IDs
- Delete test files from Storage after tests
- Reset database state if needed

## Test Execution Order

### Smoke Tests (Run First)
1. TC-FP-001 (Basic queue processing - CSV)
2. TC-FP-003 (Empty queue)

### Core Functionality
3. TC-FP-002 (Excel processing)
4. TC-FP-004 (Concurrent processing)
5. TC-FP-015 (FIFO order)

### Error Handling
6. TC-FP-005 (File not found)
7. TC-FP-006 (Corrupt file)
8. TC-FP-014 (Missing storage path)

### Edge Cases
9. TC-FP-007 (Empty file)
10. TC-FP-008 (Header only)
11. TC-FP-010 (Large file)
12. TC-FP-013 (Lock already taken)

### Integration Tests
13. TC-FP-020 (Automatic queue trigger)

## Coverage Goals

- **Unit Tests**: 80%+ code coverage for fileParser and fileProcessor
- **Integration Tests**: Complete queue processing flow
- **Error Handling**: All error scenarios covered
- **Concurrency**: Concurrent processing scenarios tested

## Performance Benchmarks

- **Small file (< 1MB)**: < 2 seconds for metadata extraction
- **Medium file (1-10MB)**: < 5 seconds
- **Large file (10-50MB)**: < 30 seconds
- **Queue processing**: < 1 second overhead per file
- **Concurrent processing**: No performance degradation with multiple workers

