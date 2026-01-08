# Test Cases: File Upload & Storage

## Test Suite: File Upload API

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
4. Verify database record created with status `'received'`
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
- One request succeeds (201)
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
2. After storage upload: `status = 'received'`
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
- Session status updated to `'received'`
- All metadata correctly stored
- Upload duration logged for monitoring

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

## Test Environment Setup

### Prerequisites
- Supabase project configured
- Test database with schema
- Storage bucket permissions set
- Environment variables configured

### Test Isolation
- Each test should clean up after execution
- Use unique session IDs
- Delete test files from Storage after tests
- Reset database state if needed

## Test Execution Order

### Smoke Tests (Run First)
1. TC-FU-001 (Basic upload)
2. TC-FU-004 (Validation)

### Core Functionality
3. TC-FU-002 (Excel upload)
4. TC-FU-003 (Duplicate detection)
5. TC-FU-009 (Hash calculation)

### Error Handling
6. TC-FU-005 (Size limit)
7. TC-FU-007 (Storage failure)
8. TC-FU-008 (Database failure)

### Edge Cases
9. TC-FU-010 (Filename sanitization)
10. TC-FU-015 (Large file)
11. TC-FU-016 (Network timeout)
12. TC-FU-017 (Real-world large file)

## Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Complete upload flow

## Performance Benchmarks

- Small file (< 1MB): < 2 seconds
- Medium file (1-10MB): < 10 seconds
- Large file (10-24MB): < 2 minutes (typical)
- Very large file (24-50MB): < 5 minutes (API timeout limit)
- Hash calculation: < 1 second per MB
- **Note**: API route timeout is configured to 5 minutes (300 seconds) to accommodate large file uploads
