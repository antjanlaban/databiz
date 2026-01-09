# Test Cases: EAN-Varianten Domain

## Overview
Deze test suite dekt alle functionaliteit van het EAN-Varianten domein, inclusief data conversie, MERK detectie, naam generatie, duplicaat detectie en EAN variant creatie. Test cases zijn georganiseerd per workflow fase.

## Test Suite Organisatie

### Phase 1: Data Preparation
- TC-DP-001 t/m TC-DP-010: Data Conversion & JSON Storage test cases

### Phase 2: MERK Detection & Mapping
- TC-BD-001 t/m TC-BD-015: Brand Detection & Mapping test cases

### Phase 3: Name Template Configuration
- TC-NG-001 t/m TC-NG-012: Name Generation test cases

### Phase 4: Duplicate Detection
- TC-DD-001 t/m TC-DD-010: Duplicate Detection test cases

### Phase 5: Insert/Update EAN Variants
- TC-EV-001 t/m TC-EV-015: EAN Variant Creation test cases

---

## Phase 1: Data Preparation

### TC-DP-001: Successful JSON Conversion (CSV)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'approved' exists
- Approved file exists in Storage (`approved/{sessionId}/{filename}`)
- File is valid CSV format

**Test Data**:
- Session ID: 1
- File: `products.csv` with 100 rows, 10 columns
- Columns: EAN, Artikelnaam, Kleur, Maat, Modelnr, Prijs, etc.

**Steps**:
1. POST request to `/api/activate-session/1` with `{action: 'prepare'}`
2. Verify response status: 200 OK
3. Verify response contains `jsonPath`, `rowCount`, `columns`
4. Verify JSON file exists in Storage at `approved/1/data.json`
5. Verify JSON file contains all rows with all columns
6. Verify session status updated to 'activating'

**Expected Results**:
- HTTP 200
- JSON file created successfully
- All 100 rows present in JSON
- All 10 columns present in each row
- Session status is 'activating'

**Post-conditions**:
- JSON file in Storage
- Session status: 'activating'

---

### TC-DP-002: Successful JSON Conversion (Excel)
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**: Same as TC-DP-001, but Excel file

**Test Data**:
- File: `products.xlsx` with 100 rows, 10 columns

**Steps**: Same as TC-DP-001

**Expected Results**: Same as TC-DP-001

---

### TC-DP-003: JSON Conversion with Missing File
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'approved' exists
- File does NOT exist in Storage

**Test Data**:
- Session ID: 999
- File path: `approved/999/nonexistent.csv`

**Steps**:
1. POST request to `/api/activate-session/999` with `{action: 'prepare'}`
2. Verify response status: 500 or 404
3. Verify error message indicates file not found
4. Verify session status remains 'approved' (not changed to 'failed')

**Expected Results**:
- HTTP 500 or 404
- Error message: "File not found in storage"
- Session status: 'approved' (unchanged)

---

### TC-DP-004: JSON Conversion with Invalid CSV Format
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'approved' exists
- File exists but has invalid CSV format

**Test Data**:
- File: `invalid.csv` with malformed CSV (unclosed quotes, etc.)

**Steps**:
1. POST request with `{action: 'prepare'}`
2. Verify response status: 500
3. Verify error message indicates parsing error
4. Verify session status updated to 'failed'

**Expected Results**:
- HTTP 500
- Error message contains parsing error details
- Session status: 'failed'
- Error message stored in `import_sessions.error_message`

---

### TC-DP-005: JSON Conversion with Empty File
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session with status 'approved' exists
- File exists but is empty

**Test Data**:
- File: `empty.csv` (0 bytes or only headers)

**Steps**:
1. POST request with `{action: 'prepare'}`
2. Verify response status: 400 or 500
3. Verify error message indicates no data found

**Expected Results**:
- HTTP 400 or 500
- Error message: "No data rows found in file"

---

### TC-DP-006: Data Readability Validation - Consistent Columns
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Data array with 100 rows, all have same 10 columns

**Steps**:
1. Call `validateDataReadability(data)`
2. Verify result: `valid: true`
3. Verify `columnCount: 10`
4. Verify `rowCount: 100`
5. Verify `errors: []`

**Expected Results**:
- Validation passes
- No errors or warnings

---

### TC-DP-007: Data Readability Validation - Inconsistent Columns
**Priority**: Medium  
**Type**: Unit Test

**Test Data**:
- Data array with 100 rows
- First 50 rows have 10 columns
- Last 50 rows have 8 columns

**Steps**:
1. Call `validateDataReadability(data)`
2. Verify result: `valid: true` (warning only, not blocking)
3. Verify warning in errors about inconsistent columns

**Expected Results**:
- Validation passes (with warning)
- Warning mentions inconsistent column counts

---

### TC-DP-008: Load JSON Data from Storage
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- JSON file exists in Storage at `approved/1/data.json`

**Test Data**:
- JSON file with 100 rows

**Steps**:
1. Call `loadJSONDataFromStorage(1)`
2. Verify returned data has 100 rows
3. Verify all columns present

**Expected Results**:
- Data loaded successfully
- All rows and columns present

---

### TC-DP-009: Load JSON Data - File Not Found
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- JSON file does NOT exist in Storage

**Test Data**:
- Session ID: 999

**Steps**:
1. Call `loadJSONDataFromStorage(999)`
2. Verify error thrown
3. Verify error message indicates file not found

**Expected Results**:
- Error thrown
- Error message: "Failed to download JSON from Storage"

---

### TC-DP-010: JSON File Size Validation
**Priority**: Low  
**Type**: Performance Test

**Test Data**:
- Large dataset: 5,000 rows, 20 columns
- Expected JSON size: ~2-5MB

**Steps**:
1. Convert large dataset to JSON
2. Verify JSON file size is reasonable (< 10MB)
3. Verify conversion completes in < 30 seconds

**Expected Results**:
- JSON file size: 2-5MB
- Conversion time: < 30 seconds

---

## Phase 2: MERK Detection & Mapping

### TC-BD-001: Automatic Brand Column Detection - Exact Match
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- Column names: ['EAN', 'Artikelnaam', 'Merk', 'Kleur', 'Maat']

**Steps**:
1. Call `detectBrandColumn(columnNames)`
2. Verify result: 'Merk'

**Expected Results**:
- Brand column detected: 'Merk'
- Detection uses exact match (case-insensitive)

---

### TC-BD-002: Automatic Brand Column Detection - Fuzzy Match
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Column names: ['EAN', 'Artikelnaam', 'Brandnaam', 'Kleur', 'Maat']

**Steps**:
1. Call `detectBrandColumn(columnNames)`
2. Verify result: 'Brandnaam' (fuzzy match on 'brand')

**Expected Results**:
- Brand column detected: 'Brandnaam'
- Similarity score >= 0.6

---

### TC-BD-003: Automatic Brand Column Detection - No Match
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Column names: ['EAN', 'Artikelnaam', 'Product', 'Kleur', 'Maat']

**Steps**:
1. Call `detectBrandColumn(columnNames)`
2. Verify result: null

**Expected Results**:
- No brand column detected
- Returns null

---

### TC-BD-004: Extract Distinct Brand Values
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Data array with brand column 'Merk'
- Values: ['Tricorp', 'Tricorp', 'Snickers', 'Tricorp', 'Mascot', 'Snickers']

**Steps**:
1. Call `extractDistinctBrandValues(data, 'Merk')`
2. Verify result: ['Mascot', 'Snickers', 'Tricorp'] (sorted)

**Expected Results**:
- Distinct values extracted
- Sorted alphabetically
- No duplicates

---

### TC-BD-005: Check Brands Exist - All Exist
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Brands table contains: 'Tricorp', 'Snickers', 'Mascot'

**Test Data**:
- Brand values: ['Tricorp', 'Snickers', 'Mascot']

**Steps**:
1. Call `checkBrandsExist(brandValues)`
2. Verify result: all brands exist, none missing

**Expected Results**:
- `existing.length === 3`
- `missing.length === 0`

---

### TC-BD-006: Check Brands Exist - Some Missing
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Brands table contains: 'Tricorp', 'Snickers'

**Test Data**:
- Brand values: ['Tricorp', 'Snickers', 'Mascot', 'Dassy']

**Steps**:
1. Call `checkBrandsExist(brandValues)`
2. Verify result: 2 exist, 2 missing

**Expected Results**:
- `existing.length === 2`
- `missing.length === 2`
- `missing` contains: ['Mascot', 'Dassy']

---

### TC-BD-007: Create Brand
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Brand 'NewBrand' does NOT exist in database

**Test Data**:
- Brand name: 'NewBrand'

**Steps**:
1. Call `createBrand('NewBrand')`
2. Verify brand created in database
3. Verify returned brand has id and name

**Expected Results**:
- Brand created successfully
- Brand has UUID id
- Brand name is 'NewBrand'

---

### TC-BD-008: Create Brand - Duplicate Name
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Brand 'Tricorp' already exists in database

**Test Data**:
- Brand name: 'Tricorp'

**Steps**:
1. Call `createBrand('Tricorp')`
2. Verify error thrown
3. Verify error indicates duplicate

**Expected Results**:
- Error thrown
- Error message indicates unique constraint violation

---

### TC-BD-009: Manual Brand Selection
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Session with status 'activating'
- JSON data loaded

**Test Data**:
- Manual brand: 'Tricorp' (exists in database)

**Steps**:
1. POST request with `{action: 'detect-brand', manualBrand: 'Tricorp'}`
2. Verify response status: 200
3. Verify response indicates manual mode

**Expected Results**:
- HTTP 200
- Response contains `mode: 'manual'`
- Response contains `brand: 'Tricorp'`

---

### TC-BD-010: Column Mapping - Valid Columns
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Session with JSON data loaded
- Columns: ['EAN', 'Kleur', 'Maat', 'Artikelnaam']

**Test Data**:
- Color column: 'Kleur'
- Size column: 'Maat'

**Steps**:
1. POST request with `{action: 'map-columns', colorColumn: 'Kleur', sizeColumn: 'Maat'}`
2. Verify response status: 200
3. Verify mappings stored

**Expected Results**:
- HTTP 200
- Mappings validated successfully

---

### TC-BD-011: Column Mapping - Invalid Column
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Session with JSON data loaded
- Columns: ['EAN', 'Kleur', 'Maat']

**Test Data**:
- Color column: 'Color' (does not exist)

**Steps**:
1. POST request with `{action: 'map-columns', colorColumn: 'Color', sizeColumn: 'Maat'}`
2. Verify response status: 400
3. Verify error message indicates column not found

**Expected Results**:
- HTTP 400
- Error message: "Color column 'Color' not found"

---

## Phase 3: Name Template Configuration

### TC-NG-001: Generate Name - Simple Template
**Priority**: Critical  
**Type**: Unit Test

**Test Data**:
- Template: `{parts: [{type: 'column', value: 'Artikelnaam'}], separator: ' | '}`
- Row: `{Artikelnaam: 'T-shirt Basic'}`

**Steps**:
1. Call `generateName(template, row)`
2. Verify result: 'T-shirt Basic'

**Expected Results**:
- Generated name: 'T-shirt Basic'

---

### TC-NG-002: Generate Name - Complex Template
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Template: `{parts: [
    {type: 'column', value: 'Modelnr'},
    {type: 'text', value: ' | '},
    {type: 'column', value: 'Merk'},
    {type: 'text', value: ' | '},
    {type: 'column', value: 'Kleur'},
    {type: 'text', value: ' | '},
    {type: 'column', value: 'Maat'}
  ], separator: ' | '}`
- Row: `{Modelnr: 'TS-001', Merk: 'Tricorp', Kleur: 'Navy', Maat: 'M'}`

**Steps**:
1. Call `generateName(template, row)`
2. Verify result

**Expected Results**:
- Generated name: 'TS-001 | Tricorp | Navy | M'

---

### TC-NG-003: Generate Name - Missing Column Value
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Template: `{parts: [{type: 'column', value: 'Modelnr'}, {type: 'text', value: ' | '}, {type: 'column', value: 'Merk'}], separator: ' | '}`
- Row: `{Modelnr: '', Merk: 'Tricorp'}` (Modelnr is empty)

**Steps**:
1. Call `generateName(template, row)`
2. Verify result

**Expected Results**:
- Generated name: 'Tricorp' (empty values skipped)

---

### TC-NG-004: Validate Template - Valid
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Template: `{parts: [{type: 'column', value: 'Artikelnaam'}], separator: ' | '}`

**Steps**:
1. Call `validateTemplate(template)`
2. Verify result: `valid: true`

**Expected Results**:
- Validation passes
- No errors

---

### TC-NG-005: Validate Template - Empty Parts
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Template: `{parts: [], separator: ' | '}`

**Steps**:
1. Call `validateTemplate(template)`
2. Verify result: `valid: false`
3. Verify error about empty parts

**Expected Results**:
- Validation fails
- Error: "Template must have at least one part"

---

### TC-NG-006: Check Name Uniqueness - All Unique
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Names: ['Name1', 'Name2', 'Name3', 'Name4', 'Name5']

**Steps**:
1. Call `checkNameUniqueness(names)`
2. Verify result

**Expected Results**:
- `unique: 5`
- `duplicates: 0`
- `duplicateNames: []`
- `emptyNames: 0`

---

### TC-NG-007: Check Name Uniqueness - Some Duplicates
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Names: ['Name1', 'Name2', 'Name1', 'Name3', 'Name2']

**Steps**:
1. Call `checkNameUniqueness(names)`
2. Verify result

**Expected Results**:
- `unique: 1` (Name3)
- `duplicates: 2` (Name1, Name2)
- `duplicateNames: ['Name1', 'Name2']`
- `emptyNames: 0`

---

### TC-NG-008: Check Name Uniqueness - Empty Names
**Priority**: Medium  
**Type**: Unit Test

**Test Data**:
- Names: ['Name1', '', 'Name2', '   ', 'Name3']

**Steps**:
1. Call `checkNameUniqueness(names)`
2. Verify result

**Expected Results**:
- `unique: 3`
- `emptyNames: 2`

---

### TC-NG-009: Parse Template String
**Priority**: High  
**Type**: Unit Test

**Test Data**:
- Template string: '{Modelnr} | {Merk} | {Kleur}'
- Available columns: ['Modelnr', 'Merk', 'Kleur', 'Maat']

**Steps**:
1. Call `parseTemplateString(templateString, availableColumns)`
2. Verify result

**Expected Results**:
- Template parsed successfully
- 3 parts: Modelnr (column), ' | ' (text), Merk (column), ' | ' (text), Kleur (column)
- Separator: ' | '

---

### TC-NG-010: Configure Template - Valid
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Session with JSON data loaded

**Test Data**:
- Template: `{parts: [{type: 'column', value: 'Artikelnaam'}], separator: ' | '}`

**Steps**:
1. POST request with `{action: 'configure-template', template}`
2. Verify response status: 200
3. Verify preview names returned
4. Verify uniqueness check returned

**Expected Results**:
- HTTP 200
- Preview contains 5 generated names
- Uniqueness statistics returned

---

## Phase 4: Duplicate Detection

### TC-DD-001: Check EAN Exists - Not Found
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- EAN '8712345678901' does NOT exist in database

**Test Data**:
- EAN: '8712345678901'

**Steps**:
1. Call `checkEANExists('8712345678901')`
2. Verify result: null

**Expected Results**:
- EAN not found
- Returns null

---

### TC-DD-002: Check EAN Exists - Found
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- EAN variant with EAN '8712345678901' exists (is_active = TRUE)

**Test Data**:
- EAN: '8712345678901'

**Steps**:
1. Call `checkEANExists('8712345678901')`
2. Verify result: existing variant returned

**Expected Results**:
- EAN found
- Returns EANVariant object
- Variant has is_active = TRUE

---

### TC-DD-003: Detect Duplicate - Same Name
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- EAN variant exists: EAN '8712345678901', name 'T-shirt Basic Navy M'

**Test Data**:
- EAN: '8712345678901'
- Name: 'T-shirt Basic Navy M'

**Steps**:
1. Call `detectDuplicate('8712345678901', 'T-shirt Basic Navy M')`
2. Verify result: duplicate detected
3. Verify name similarity: 1.0 (exact match)
4. Verify no warning

**Expected Results**:
- `isDuplicate: true`
- `nameSimilarity: 1.0`
- `warning: null`

---

### TC-DD-004: Detect Duplicate - Different Name
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- EAN variant exists: EAN '8712345678901', name 'T-shirt Basic Navy M'

**Test Data**:
- EAN: '8712345678901'
- Name: 'Completely Different Product Name'

**Steps**:
1. Call `detectDuplicate('8712345678901', 'Completely Different Product Name')`
2. Verify result: duplicate detected
3. Verify name similarity < 0.5
4. Verify warning present

**Expected Results**:
- `isDuplicate: true`
- `nameSimilarity < 0.5`
- `warning` contains name mismatch message

---

### TC-DD-005: Detect Duplicates - Batch
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- EAN variants exist for some EANs

**Test Data**:
- Rows: [
    {ean: '8712345678901', name: 'Name1'},
    {ean: '8712345678902', name: 'Name2'},
    {ean: '8712345678903', name: 'Name3'}
  ]

**Steps**:
1. Call `detectDuplicates(rows)`
2. Verify results for all rows
3. Verify duplicates identified correctly

**Expected Results**:
- Results array has 3 items
- Duplicates correctly identified
- Warnings for name mismatches

---

### TC-DD-006: Deactivate Variant
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- EAN variant exists with is_active = TRUE

**Test Data**:
- Variant ID: 'uuid-123'

**Steps**:
1. Call `deactivateVariant('uuid-123')`
2. Verify variant updated: is_active = FALSE
3. Verify updated_at timestamp changed

**Expected Results**:
- Variant is_active = FALSE
- Updated_at timestamp updated

---

### TC-DD-007: Deactivate Variants - Batch
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Multiple EAN variants exist with is_active = TRUE

**Test Data**:
- Variant IDs: ['uuid-1', 'uuid-2', 'uuid-3']

**Steps**:
1. Call `deactivateVariants(['uuid-1', 'uuid-2', 'uuid-3'])`
2. Verify all variants updated: is_active = FALSE

**Expected Results**:
- All variants is_active = FALSE
- Batch update successful

---

## Phase 5: Insert/Update EAN Variants

### TC-EV-001: Activate Dataset - Successful
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Session with status 'activating'
- JSON data loaded
- Brand exists in database
- Columns mapped
- Template configured

**Test Data**:
- 100 rows in JSON data
- All rows have valid EAN, color, size
- Brand ID: 'brand-uuid-1'
- Template configured

**Steps**:
1. POST request with `{action: 'activate', ...}`
2. Verify response status: 200
3. Verify EAN variants created in database
4. Verify session status updated to 'activated'
5. Verify activated_variants_count = 100

**Expected Results**:
- HTTP 200
- 100 EAN variants created
- Session status: 'activated'
- activated_variants_count: 100

---

### TC-EV-002: Activate Dataset - With Duplicates
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- EAN variants exist for some EANs in dataset
- Session ready for activation

**Test Data**:
- 100 rows, 10 have duplicate EANs
- Existing variants have is_active = TRUE

**Steps**:
1. POST request with `{action: 'activate', ...}`
2. Verify old variants deactivated (is_active = FALSE)
3. Verify new variants created (is_active = TRUE)
4. Verify activated_duplicates_count = 10

**Expected Results**:
- 10 old variants deactivated
- 100 new variants created (10 replace old ones)
- activated_duplicates_count: 10

---

### TC-EV-003: Activate Dataset - Missing Required Fields
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Session ready for activation
- Some rows missing required fields

**Test Data**:
- 100 rows, 5 missing EAN, 3 missing color

**Steps**:
1. POST request with `{action: 'activate', ...}`
2. Verify response status: 200 (partial success)
3. Verify errors collected
4. Verify 92 variants created (100 - 8 invalid)

**Expected Results**:
- HTTP 200
- Errors array contains 8 errors
- 92 variants created
- Invalid rows skipped

---

### TC-EV-004: Activate Dataset - Batch Processing
**Priority**: High  
**Type**: Performance Test

**Preconditions**:
- Large dataset ready for activation

**Test Data**:
- 5,000 rows

**Steps**:
1. POST request with `{action: 'activate', ...}`
2. Verify processing completes
3. Verify all 5,000 variants created
4. Verify processing time < 2 minutes

**Expected Results**:
- All variants created
- Processing time: 30-60 seconds
- Batches processed correctly (10 batches of 500)

---

### TC-EV-005: Activate Dataset - Empty Names
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Template generates empty names for some rows

**Test Data**:
- 100 rows, template generates empty names for 5 rows

**Steps**:
1. POST request with `{action: 'activate', ...}`
2. Verify errors collected for empty names
3. Verify 95 variants created (100 - 5 invalid)

**Expected Results**:
- 5 errors for empty names
- 95 variants created

---

## End-to-End Test Cases

### TC-E2E-001: Complete Activation Workflow
**Priority**: Critical  
**Type**: End-to-End Test

**Preconditions**:
- Approved dataset exists

**Steps**:
1. Prepare data (convert to JSON)
2. Detect brand (automatic)
3. Map columns (Kleur, Maat)
4. Configure template
5. Preview names
6. Activate dataset

**Expected Results**:
- All steps complete successfully
- EAN variants created
- Session status: 'activated'

---

### TC-E2E-002: Activation with Manual Brand Selection
**Priority**: High  
**Type**: End-to-End Test

**Steps**:
1. Prepare data
2. Manual brand selection (no auto-detection)
3. Map columns
4. Configure template
5. Activate

**Expected Results**:
- Manual brand selection works
- Activation completes successfully

---

### TC-E2E-003: Activation with Missing Brands
**Priority**: High  
**Type**: End-to-End Test

**Preconditions**:
- Brand column detected
- Some brands missing from database

**Steps**:
1. Prepare data
2. Detect brand column
3. Check brands exist (some missing)
4. Create missing brands
5. Continue activation

**Expected Results**:
- Missing brands identified
- Brands created successfully
- Activation continues

---

## Performance Test Cases

### TC-PERF-001: Large Dataset Activation
**Priority**: Medium  
**Type**: Performance Test

**Test Data**:
- 5,000 rows dataset

**Steps**:
1. Complete activation workflow
2. Measure time for each phase

**Expected Results**:
- Total time: < 2 minutes
- JSON conversion: < 10 seconds
- Duplicate detection: < 20 seconds
- Batch insert: < 60 seconds

---

### TC-PERF-002: JSON File Loading Performance
**Priority**: Low  
**Type**: Performance Test

**Test Data**:
- JSON file with 5,000 rows (~3MB)

**Steps**:
1. Load JSON from Storage
2. Measure load time

**Expected Results**:
- Load time: < 2 seconds

---

## Error Recovery Test Cases

### TC-ERR-001: Partial Activation Failure
**Priority**: High  
**Type**: Error Recovery Test

**Preconditions**:
- Database connection fails during batch insert

**Steps**:
1. Start activation
2. Simulate database failure mid-process
3. Verify session status updated to 'failed'
4. Verify error message stored

**Expected Results**:
- Session status: 'failed'
- Error message stored
- User can retry activation

---

### TC-ERR-002: Retry After Failure
**Priority**: Medium  
**Type**: Error Recovery Test

**Preconditions**:
- Previous activation failed

**Steps**:
1. Fix underlying issue
2. Retry activation
3. Verify activation completes

**Expected Results**:
- Activation retry successful
- EAN variants created

---

## Test Data Requirements

### Test Datasets

1. **Small Dataset**: 10 rows, 5 columns (for unit tests)
2. **Medium Dataset**: 100 rows, 10 columns (for integration tests)
3. **Large Dataset**: 5,000 rows, 15 columns (for performance tests)

### Test Brands

- Tricorp (exists in database)
- Snickers (exists in database)
- Mascot (exists in database)
- NewBrand (does not exist, for creation tests)

### Test EAN Variants

- EAN '8712345678901' (for duplicate tests)
- EAN '8712345678902' (for duplicate tests)
- Multiple variants with same EAN (for deactivation tests)

