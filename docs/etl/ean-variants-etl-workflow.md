# EAN-Varianten ETL Workflow

## Overview

De EAN-Varianten ETL workflow activeert goedgekeurde datasets en creëert EAN-varianten in het systeem. Het proces bestaat uit vijf fases: Data Preparation, MERK Detection & Mapping, Name Template Configuration, Duplicate Detection, en Insert/Update EAN Variants.

## Complete Process Flow

```
[Approved Dataset] (status: 'approved')
    ↓
[Phase 1: Data Preparation]
    ├─→ Download approved file from Storage
    ├─→ Parse all columns (not just specific fields)
    ├─→ Validate data readability
    ├─→ Convert to JSON format
    ├─→ Save to Storage (approved/{sessionId}/data.json)
    └─→ Update status to 'activating'
    ↓
[Phase 2: MERK Detection & Mapping]
    ├─→ Automatic MERK column detection (fuzzy search)
    ├─→ Extract distinct brand values
    ├─→ Check if brands exist in database
    ├─→ If missing: ask user to add brands
    ├─→ If not found: ask user to manually select MERK
    ├─→ User maps columns (Kleur, Maat)
    └─→ EAN column already known (from EAN analysis phase)
    ↓
[Phase 3: Name Template Configuration]
    ├─→ Show available columns to user
    ├─→ User builds template (columns + static text + separators)
    ├─→ Preview generated names (first 5 rows)
    ├─→ Validate template (check for empty names)
    └─→ Check name uniqueness (warning, not blocking)
    ↓
[Phase 4: Duplicate Detection]
    ├─→ For each row with EAN:
    │   ├─→ Check if EAN exists in ean_variants (is_active = TRUE)
    │   ├─→ If yes: fuzzy match on name (warning if name differs)
    │   └─→ Mark as duplicate
    ├─→ Deactivate old variants (is_active = FALSE)
    └─→ Log which old variant was deactivated
    ↓
[Phase 5: Insert/Update EAN Variants]
    ├─→ Batch processing (500 rows per batch):
    │   ├─→ Generate name from template
    │   ├─→ Validate required fields (MERK, Kleur, Maat, EAN)
    │   ├─→ Insert new variant or update existing
    │   └─→ If duplicate: deactivate old variant
    ├─→ Update import_session:
    │   ├─→ Status to 'activated'
    │   ├─→ activated_variants_count
    │   └─→ activated_duplicates_count
    └─→ Complete
```

## Phase 1: Data Preparation

### Overview
Converteer goedgekeurde dataset naar JSON formaat voor snelle verwerking tijdens activatie.

### Step-by-Step Process

#### Step 1: Fetch Approved Session
**Location**: `app/api/activate-session/[sessionId]/route.ts` (GET)
**Action**: Fetch session with status 'approved'
**Validation**: 
- Session must exist
- Status must be 'approved' or 'activating'
- File storage path must exist

#### Step 2: Download Approved File
**Location**: `lib/dataConverter.ts` - `convertApprovedDatasetToJSON()`
**Action**: Download file from Storage (`approved/{sessionId}/{filename}`)
**Storage Path**: From `import_sessions.file_storage_path`

#### Step 3: Parse All Columns
**Location**: `lib/dataConverter.ts` - `parseFileAllColumns()`

**For CSV**:
- Use PapaParse with `header: true`
- Preserve all columns (not just ean/name/price/supplier)
- Clean values (trim strings, handle nulls)

**For Excel**:
- Use ExcelJS to read workbook
- Get headers from first row
- Process all data rows
- Preserve all columns

**Output**: Array of objects with all original columns

#### Step 4: Validate Data Readability
**Location**: `lib/dataConverter.ts` - `validateDataReadability()`

**Checks**:
- Data array is not empty
- At least one column exists
- Column count is consistent (warning if not)

**Output**: Validation result with errors/warnings

#### Step 5: Convert to JSON
**Action**: Convert data array to JSON string
**Format**: Array of objects `[{...}, {...}]`
**Size**: ~2-5MB for 5,000 rows

#### Step 6: Save to Storage
**Location**: `lib/dataConverter.ts` - `convertApprovedDatasetToJSON()`
**Path**: `approved/{sessionId}/data.json`
**Action**: Upload JSON blob to Supabase Storage
**Content-Type**: `application/json`

#### Step 7: Update Session Status
**Action**: Update `import_sessions.status` to `'activating'`

**SQL**:
```sql
UPDATE import_sessions 
SET status = 'activating'
WHERE id = $1;
```

### Error Handling
- **File not found**: Return error, session remains 'approved'
- **Parse error**: Return error with details
- **Validation error**: Return error, session remains 'approved'
- **Storage error**: Return error, session remains 'approved'

## Phase 2: MERK Detection & Mapping

### Overview
Detecteer MERK kolom automatisch of vraag gebruiker om handmatige selectie. Map Kleur en Maat kolommen.

### Step-by-Step Process

#### Step 1: Automatic MERK Column Detection
**Location**: `lib/brandDetector.ts` - `detectBrandColumn()`

**Process**:
1. Normalize column names (lowercase, trim)
2. Try exact match on patterns: 'merk', 'brand', 'fabrikant', etc.
3. If no exact match: try fuzzy match (threshold: 0.6)
4. Return best match or null

**Patterns**:
- merk, brand, fabrikant, manufacturer, producent, leverancier, supplier, marca, marque

#### Step 2: Extract Distinct Brand Values
**Location**: `lib/brandDetector.ts` - `extractDistinctBrandValues()`

**Process**:
1. Load JSON data from Storage
2. Extract all values from brand column
3. Filter out empty/null values
4. Return sorted array of unique values

#### Step 3: Check Brands Exist
**Location**: `lib/brandDetector.ts` - `checkBrandsExist()`

**Process**:
1. Query `brands` table for all brand values (case-insensitive)
2. Compare with extracted values
3. Return existing and missing brands

**SQL**:
```sql
SELECT id, name FROM brands 
WHERE LOWER(name) IN (LOWER($1), LOWER($2), ...);
```

#### Step 4: Handle Missing Brands
**Action**: If brands are missing:
- Show warning to user
- User can create missing brands
- Or user can select different brand column

#### Step 5: Manual Brand Selection (if auto-detection fails)
**Action**: If no brand column found:
- User selects one brand for entire dataset
- Or user creates new brand

#### Step 6: Column Mapping
**Location**: `app/api/activate-session/[sessionId]/route.ts` - `handleMapColumns()`

**Process**:
1. User selects color column from dropdown
2. User selects size column from dropdown
3. Validate columns exist in dataset
4. Store mappings (used in activation step)

**Required**:
- Color column (required)
- Size column (required)
- EAN column (already known from EAN analysis phase)

### Error Handling
- **No brand column found**: User must manually select brand
- **Missing brands**: Warning shown, user can add brands
- **Invalid column mapping**: Return error, user must reselect

## Phase 3: Name Template Configuration

### Overview
Configureer naam template voor productnamen. Template combineert kolommen en statische tekst met scheidingstekens.

### Step-by-Step Process

#### Step 1: Show Available Columns
**Action**: Display all columns from JSON data to user

#### Step 2: Template Builder
**Location**: `app/activate/[sessionId]/page.tsx`

**Process**:
1. User clicks column buttons to add to template
2. User can add static text
3. User configures separator (default: " | ")
4. Template parts stored as array: `[{type: 'column', value: 'modelnr'}, ...]`

#### Step 3: Preview Generated Names
**Location**: `lib/nameGenerator.ts` - `generateNames()`

**Process**:
1. Load JSON data (first 5 rows for preview)
2. Generate names using template
3. Display preview to user

**Template Format**:
- Column reference: `{columnName}`
- Static text: `"Static Text"`
- Separator: `" | "` (configurable)

**Example**:
```
Template: {modelnr} | {merk} | {Kleur} | {Maat}
Row: {modelnr: "TS-001", merk: "Tricorp", Kleur: "Navy", Maat: "M"}
Generated: "TS-001 | Tricorp | Navy | M"
```

#### Step 4: Validate Template
**Location**: `lib/nameGenerator.ts` - `validateTemplate()`

**Checks**:
- Template has at least one part
- All parts have valid type ('column' or 'text')
- All parts have non-empty value

#### Step 5: Check Name Uniqueness
**Location**: `lib/nameGenerator.ts` - `checkNameUniqueness()`

**Process**:
1. Generate names for all rows
2. Count unique names
3. Count duplicates
4. Count empty names

**Output**:
- Unique count
- Duplicate count
- Duplicate names list
- Empty names count

**Business Rule**: Uniqueness check is warning only (not blocking)

### Error Handling
- **Invalid template**: Return error, user must fix
- **Empty names**: Blocking error, user must fix template
- **Many duplicates**: Warning shown, user can proceed

## Phase 4: Duplicate Detection

### Overview
Detecteer duplicaten op EAN code. Bij duplicaat: deactiveer oude variant, activeer nieuwe.

### Step-by-Step Process

#### Step 1: Batch Check EANs
**Location**: `lib/duplicateDetector.ts` - `checkEANsExist()`

**Process**:
1. Extract all EANs from JSON data
2. Query `ean_variants` table for existing EANs (is_active = TRUE)
3. Return map of EAN to existing variant

**SQL**:
```sql
SELECT * FROM ean_variants 
WHERE ean IN ($1, $2, ...) 
AND is_active = TRUE;
```

#### Step 2: Fuzzy Name Matching
**Location**: `lib/duplicateDetector.ts` - `detectDuplicates()`

**Process**:
1. For each row with EAN:
   - Check if EAN exists in database
   - If exists: fuzzy match on name (similarity score)
   - If similarity < 0.5: add warning
2. Return duplicate results with warnings

**Fuzzy Match Algorithm**:
- Word-level similarity (70% weight)
- Character-level similarity (30% weight)
- Threshold: 0.5 for warning

#### Step 3: Deactivate Old Variants
**Location**: `lib/duplicateDetector.ts` - `deactivateVariants()`

**Process**:
1. Collect all variant IDs to deactivate
2. Batch update: set `is_active = FALSE`
3. Log which variants were deactivated

**SQL**:
```sql
UPDATE ean_variants 
SET is_active = FALSE 
WHERE id IN ($1, $2, ...);
```

**Business Rule**: Never overwrite EAN, always deactivate old variant

### Error Handling
- **Database error**: Return error, activation stops
- **Name mismatch warning**: Warning shown, user can proceed

## Phase 5: Insert/Update EAN Variants

### Overview
Creëer EAN varianten in database. Batch processing voor performance.

### Step-by-Step Process

#### Step 1: Prepare Variants for Insertion
**Location**: `app/api/activate-session/[sessionId]/route.ts` - `handleActivate()`

**Process**:
1. Load JSON data from Storage
2. Generate names for all rows using template
3. Determine brand ID (from brand column or manual selection)
4. Prepare variant objects:
   ```typescript
   {
     ean: string,
     brand_id: string,
     color: string,
     size: string,
     name: string,
     import_session_id: number,
     is_active: true
   }
   ```

#### Step 2: Validate Required Fields
**Checks**:
- EAN is not empty
- Color is not empty
- Size is not empty
- Name is not empty

**Errors**: Collect validation errors, skip invalid rows

#### Step 3: Batch Insert
**Location**: `app/api/activate-session/[sessionId]/route.ts` - `handleActivate()`

**Process**:
1. Split variants into batches of 500
2. For each batch:
   - Insert into `ean_variants` table
   - Handle unique constraint violation (EAN already exists)
   - Count successful inserts
3. Track total inserted count

**SQL**:
```sql
INSERT INTO ean_variants (ean, brand_id, color, size, name, import_session_id, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7), ...;
```

**Performance**: 5,000 rows = 10 batches, expected time: 30-60 seconds

#### Step 4: Update Session
**Action**: Update `import_sessions` with activation results

**SQL**:
```sql
UPDATE import_sessions 
SET 
  status = 'activated',
  activated_variants_count = $1,
  activated_duplicates_count = $2,
  activated_at = NOW()
WHERE id = $3;
```

### Error Handling
- **Validation errors**: Collect errors, skip invalid rows, continue
- **Unique constraint violation**: Skip duplicate EANs (already handled in duplicate detection)
- **Database error**: Update session to 'failed', return error

## Data Storage

### JSON File Format

**Location**: `approved/{sessionId}/data.json`

**Format**: Array of objects with all original columns

**Example**:
```json
[
  {
    "EAN": "8712345678901",
    "Kleur": "Navy",
    "Maat": "M",
    "Artikelnaam": "T-shirt Basic",
    "Modelnr": "TS-001",
    "Modelomschrijving": "Basic T-shirt",
    "Prijs": "19.95",
    "Voorraad": "100",
    "Leverancier": "Supplier A"
  },
  ...
]
```

### Database Table (`ean_variants`)

**Essentiële velden** (geïndexeerd voor snelle zoeken):
- `ean` (VARCHAR 14, UNIQUE)
- `brand_id` (UUID, FK)
- `color` (TEXT)
- `size` (TEXT)
- `name` (TEXT)
- `is_active` (BOOLEAN)

**Alle andere kolommen** blijven in JSON bestand.

## Performance Considerations

### Batch Processing
- **Batch Size**: 500 rows per batch
- **Expected Time**: 1-2 minutes for 5,000 rows
- **Memory**: JSON file loaded once, reused

### Indexing
- **EAN Index**: Fast EAN lookup
- **Brand Index**: Fast brand filtering
- **Color/Size Indexes**: Fast filtering
- **Name Index**: Fast name searching
- **Composite Index**: brand_id + color + size for common queries

### JSON File
- **Size**: ~2-5MB for 5,000 rows
- **Loading**: One-time load, then reused
- **Storage**: Supabase Storage (cheaper than database)

## Error Recovery

### Partial Success
- If some rows fail validation: continue with valid rows
- Log errors for review
- Update session with partial results

### Complete Failure
- Update session status to 'failed'
- Store error message
- User can retry activation

## Success Criteria

✅ Dataset converted to JSON format  
✅ MERK detected or manually selected  
✅ Columns mapped (Kleur, Maat)  
✅ Name template configured  
✅ Names generated correctly  
✅ Duplicates detected and old variants deactivated  
✅ EAN variants created in database  
✅ Session status updated to 'activated'  

