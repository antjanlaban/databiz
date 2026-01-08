# Test Cases: EAN Analysis & Code Detection

## Test Suite: EAN Detection (Unit Tests)

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
- Returns `false` (validation should trim, but trimmed value should be checked)
- Actually, validation trims first, so should return `true` after trim

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

## Test Suite: EAN Analysis (Unit Tests)

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

## Test Suite: EAN Analysis API (Integration Tests)

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

## Test Data Requirements

### Sample CSV Files
```csv
ean,name,price
8712345678901,Product A,15.99
8712345678902,Product B,25.50
8712345678901,Product A Duplicate,15.99
```

### Sample Excel Files
- Sheet 1: Same columns as CSV
- Multiple EAN columns for testing column selection
- Various EAN code scenarios (unique, duplicates, invalid)

## Test Environment Setup

### Prerequisites
- Supabase project configured
- Test database with schema (including EAN analysis fields)
- Storage bucket permissions set
- Environment variables configured

### Test Isolation
- Each test should clean up after execution
- Use unique session IDs
- Delete test files from Storage after tests
- Reset database state if needed

## Test Execution Order

### Smoke Tests (Run First)
1. TC-EAN-001 (Validate GTIN-13 - Valid)
2. TC-EAN-019 (Successful EAN Analysis - Single Column)

### Core Functionality
3. TC-EAN-008 (Detect EAN Columns - Single)
4. TC-EAN-013 (Analyze EANs - All Unique)
5. TC-EAN-014 (Analyze EANs - With Duplicates)
6. TC-EAN-022 (Select EAN Column - Successful)

### Error Handling
7. TC-EAN-020 (No EAN Column Found)
8. TC-EAN-021 (Multiple EAN Columns)
9. TC-EAN-023 (Invalid Session)
10. TC-EAN-024 (Wrong Status)
11. TC-EAN-027 (File Not Found)

### Edge Cases
12. TC-EAN-002 through TC-EAN-007 (Validation edge cases)
13. TC-EAN-015 (Empty File)
14. TC-EAN-016 (Invalid Codes Filtered)

### Integration Tests
15. TC-EAN-026 (Concurrent Processing)
16. TC-EAN-025 (Empty Queue)

## Coverage Goals

- **Unit Tests**: 80%+ code coverage for eanDetection and eanAnalyzer
- **Integration Tests**: Complete EAN analysis flow
- **Error Handling**: All error scenarios covered
- **Concurrency**: Concurrent processing scenarios tested

## Performance Benchmarks

- **Column Detection**: < 5 seconds for files up to 50MB
- **EAN Analysis**: < 30 seconds for files up to 50MB with 15k rows
- **Queue Processing**: < 1 second overhead per file
- **Concurrent Processing**: No performance degradation with multiple workers

