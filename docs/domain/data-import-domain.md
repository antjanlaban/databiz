# Data-import Domain Model

## Bounded Context: Data Import & Processing

### Domain Overview
Het Data-import domein is verantwoordelijk voor het volledige proces van het ontvangen, valideren, opslaan, parsen en analyseren van supplier bestanden. Dit domein omvat de complete ETL workflow van file upload tot EAN code analyse, inclusief session management en cleanup operaties.

### Core Domain Entities

#### 1. ImportSession (Aggregate Root)
**Identity**: `id` (UUID/BigInt)

**Attributes**:
- `file_name`: String - Originele bestandsnaam
- `file_type`: Enum['csv', 'xlsx'] - Type bestand
- `file_hash`: String(64) - SHA256 hash voor duplicaat detectie
- `file_size_bytes`: Integer - Grootte in bytes
- `file_storage_path`: String - Pad in Supabase Storage
- `status`: Enum - Huidige status in lifecycle
- `uploaded_at`: Timestamp - Wanneer bestand is ontvangen
- `error_message`: String (optional) - Foutmelding bij falen
- `total_rows_in_file`: Integer - Aantal productregels in bestand (exclusief header)
- `columns_count`: Integer - Aantal kolommen in bestand
- `parsed_at`: Timestamp - Wanneer parsing is voltooid
- `unique_ean_count`: Integer - Aantal unieke EAN codes in bestand
- `duplicate_ean_count`: Integer - Aantal EAN duplicaten in bestand
- `detected_ean_column`: String - Naam van de gedetecteerde EAN kolom
- `ean_analysis_status`: Enum - Status van EAN analyse
- `ean_analysis_at`: Timestamp - Wanneer EAN analyse is voltooid

**Complete Lifecycle States**:
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

**Invariants**:
- File hash moet uniek zijn (duplicaat preventie)
- File size moet ≤ 50MB zijn
- File type moet csv of xlsx zijn
- Storage path moet bestaan voordat parsing kan starten
- Parsing status moet atomisch worden gezet (locking mechanisme)
- Metadata (rows/columns) moet correct zijn na succesvolle parsing
- EAN analyse status moet atomisch worden gezet (locking mechanisme)
- Als geen EAN kolom wordt gevonden, kan het bestand niet verder in het proces
- Als meerdere EAN kolommen worden gevonden, moet gebruiker kiezen

**Business Rules**:
1. Een bestand met dezelfde hash kan niet opnieuw geüpload worden
2. Bestand moet succesvol opgeslagen zijn in Storage voordat status 'parsing' is
3. Bij Storage fout: proces stopt, session marked as 'failed'
4. Een bestand kan alleen worden geparsed als het status 'parsing' heeft
5. Status wijziging naar 'parsing' moet atomisch zijn (prevent race conditions)
6. Bij parsing fout: status wordt 'failed' met error_message
7. Bij succesvolle parsing: status wordt 'ready_for_processing' met metadata
8. Na 'ready_for_processing' wordt automatisch EAN analyse getriggerd
9. Een bestand kan alleen worden geanalyseerd als het status 'ready_for_processing' heeft
10. Bij geen EAN kolom: ean_analysis_status wordt 'no_ean_column', bestand kan niet verder
11. Bij meerdere EAN kolommen: ean_analysis_status wordt 'pending_column_selection', wacht op gebruiker
12. Bij succesvolle analyse: ean_analysis_status wordt 'completed' met statistieken
13. Alle session statussen kunnen verwijderd worden
14. Storage delete is optioneel - als Storage delete faalt, gaat database delete door (graceful degradation)
15. Database delete is verplicht - als database delete faalt, wordt de operatie gestopt

### Domain Services

#### 1. FileValidator (Domain Service)
**Responsibility**: Valideert bestandseigenschappen

**Operations**:
- `validateExtension(file: File): ValidationResult`
- `validateSize(file: File, maxSizeMB: number): ValidationResult`
- `calculateHash(file: File): Promise<string>` (SHA256)
- `checkDuplicate(hash: string): Promise<boolean>`

**Validation Rules**:
- Extensie moet .csv, .xlsx of .xls zijn
- Grootte moet ≤ 50MB zijn
- Hash moet SHA256 algoritme gebruiken
- Duplicaat check: hash moet uniek zijn in database

#### 2. FileStorage (Domain Service)
**Responsibility**: Abstraheert Storage operaties

**Operations**:
- `ensureBucketExists(bucketName: string): Promise<void>`
- `uploadFile(bucket: string, path: string, file: File): Promise<StoragePath>`
- `downloadFileFromStorage(bucket: string, path: string): Promise<Blob>`
- `deleteFile(path: string): Promise<void>`
- `sanitizeFileName(filename: string): string`

**Business Rules**:
- Bucket naam: `supplier-uploads`
- Bucket type: Private (authenticated only)
- Folder structuur: `incoming/{session_id}/{sanitized_filename}`
- Originele bestandsnaam moet behouden blijven (na sanitization)
- Bestand niet gevonden wordt behandeld als succes (idempotent)
- Storage errors worden gelogd maar niet gegooid (graceful degradation)

#### 3. FileProcessor (Domain Service)
**Responsibility**: Orchestreert file parsing proces

**Operations**:
- `processFile(sessionId: number): Promise<ParseMetadata>`
  - Download file from Storage
  - Extract metadata (rows/columns)
  - Update session with metadata
  - Handle errors gracefully

**Business Rules**:
- Bestand moet eerst gedownload worden uit Storage
- Metadata extractie gebeurt zonder volledige data parsing
- Database updates moeten atomisch zijn
- Errors moeten altijd leiden tot status 'failed' met error message

#### 4. QueueProcessor (Domain Service)
**Responsibility**: Manage queue van bestanden die geparsed moeten worden

**Operations**:
- `getNextQueuedSession(): Promise<ImportSession | null>`
  - Find session with status 'parsing'
  - Return oldest session (FIFO)
  - Atomic lock by updating status

**Business Rules**:
- Process files in FIFO order (oldest first)
- Only one process can lock a session (atomic update)
- Locking must use WHERE clause to prevent race conditions
- If lock fails, another process is handling the session

#### 5. FileParser (Domain Service)
**Responsibility**: Extract metadata from files

**Operations**:
- `getFileMetadata(file: File): Promise<ParseMetadata>`
  - Extract row count (excluding header)
  - Extract column count
  - Handle CSV and Excel formats

**Validation Rules**:
- Row count excludes header row
- Column count based on header row
- Empty files return 0 rows, 0 columns
- Corrupt files throw errors with descriptive messages

#### 6. EANDetector (Domain Service)
**Responsibility**: Detecteert EAN/GTIN-13 kolommen in bestanden

**Operations**:
- `detectEANColumns(file: File, headers: string[]): Promise<string[]>`
  - Analyseert alle kolommen in het bestand
  - Detecteert welke kolommen voldoen aan GTIN-13/EAN-13 standaard
  - Retourneert array van kolomnamen die mogelijk EAN kolommen zijn
- `validateGTIN13(value: string): boolean`
  - Valideert of een waarde voldoet aan GTIN-13/EAN-13 standaard
  - GTIN-13/EAN-13: exact 13 cijfers, alleen numeriek

**Validation Rules**:
- GTIN-13/EAN-13 moet exact 13 cijfers bevatten
- Alleen numerieke waarden zijn toegestaan
- Kolom moet minimaal 5 waarden bevatten
- Minimaal 80% van de waarden moet valide GTIN-13 zijn om als EAN kolom te worden beschouwd

**Business Rules**:
- Detectie gebeurt op basis van steekproef (max 100 rijen voor performance)
- Kolom wordt als EAN kolom beschouwd als ≥80% van waarden valide GTIN-13 zijn
- Detectie werkt voor zowel CSV als Excel bestanden

#### 7. EANAnalyzer (Domain Service)
**Responsibility**: Analyseert EAN codes en telt unieke codes en duplicaten

**Operations**:
- `analyzeEANs(file: File, eanColumnName: string): Promise<EANAnalysisResult>`
  - Extraheert alle EAN codes uit de opgegeven kolom
  - Filtert alleen valide GTIN-13 codes
  - Telt unieke EAN codes
  - Detecteert en telt duplicaten (EAN codes die meer dan 1x voorkomen)
  - Retourneert analyse resultaten

**Business Rules**:
- Alleen valide GTIN-13 codes worden meegenomen in de analyse
- Unieke count: aantal verschillende EAN codes
- Duplicate count: aantal EAN codes die meer dan 1x voorkomen
- Analyse werkt voor zowel CSV als Excel bestanden

#### 8. SessionDeleteService (Domain Service)
**Responsibility**: Orchestreert de delete operatie

**Operations**:
- `deleteSession(sessionId: string): Promise<void>`
  - Haalt session op uit database
  - Verwijdert Storage bestand (indien aanwezig)
  - Verwijdert database record
  - Handelt errors af volgens business rules

**Business Rules**:
- Storage delete fouten blokkeren database delete niet
- Database delete fouten stoppen de operatie
- Onbestaande sessions retourneren 404 (niet een error)

### Value Objects

#### FileHash
- Type: String
- Format: SHA256 hex string (64 karakters)
- Validation: Must match regex `^[a-f0-9]{64}$`

#### FileSize
- Type: Integer
- Unit: Bytes
- Max: 52,428,800 bytes (50MB)

#### StoragePath
- Format: `incoming/{uuid}/{filename}`
- Validation: Moet beginnen met `incoming/`
- Nullable: Kan NULL zijn voor failed uploads

#### SessionId
- Type: String (URL parameter) or Number (BigInt)
- Validation: Moet niet leeg zijn
- Format: Numeric string or UUID

#### ParseMetadata
**Type**: Value Object
**Properties**:
- `rowCount`: Integer - Number of data rows (excluding header)
- `columnCount`: Integer - Number of columns

**Invariants**:
- `rowCount >= 0`
- `columnCount >= 0`
- Both values must be integers

**Validation**:
- Cannot be negative
- Empty files have rowCount = 0, columnCount = 0
- Files with only header have rowCount = 0, columnCount > 0

#### EANAnalysisResult
**Type**: Value Object
**Properties**:
- `uniqueCount`: Integer - Aantal unieke EAN codes
- `duplicateCount`: Integer - Aantal EAN codes die duplicaten zijn
- `totalEANs`: Integer - Totaal aantal valide EAN codes

**Invariants**:
- `uniqueCount >= 0`
- `duplicateCount >= 0`
- `totalEANs >= uniqueCount`
- `duplicateCount <= uniqueCount`

**Validation**:
- Alle waarden moeten niet-negatief zijn
- Duplicate count kan niet groter zijn dan unique count

#### GTIN13
**Type**: Value Object
**Properties**:
- `value`: String - De EAN code waarde

**Invariants**:
- Exact 13 karakters
- Alleen numerieke karakters (0-9)
- Geen whitespace

**Validation**:
- Lengte moet exact 13 zijn
- Moet alleen cijfers bevatten
- Geen lege waarde

### Domain Events

#### FileReceivedEvent
**Triggered**: Wanneer bestand succesvol is opgeslagen in Storage
**Payload**:
```typescript
{
  sessionId: UUID,
  fileName: string,
  fileSize: number,
  storagePath: string,
  receivedAt: Timestamp
}
```

#### DuplicateFileDetectedEvent
**Triggered**: Wanneer bestand met zelfde hash al bestaat
**Payload**:
```typescript
{
  fileName: string,
  hash: string,
  existingSessionId: UUID,
  detectedAt: Timestamp
}
```

#### FileValidationFailedEvent
**Triggered**: Wanneer validatie faalt
**Payload**:
```typescript
{
  fileName: string,
  reason: string,
  failedAt: Timestamp
}
```

#### FileQueuedEvent
**Triggered**: Wanneer bestand met status 'parsing' wordt toegevoegd aan queue
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  storagePath: string,
  queuedAt: Timestamp
}
```

#### FileParsingStartedEvent
**Triggered**: Wanneer parsing start (status → 'parsing')
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  startedAt: Timestamp
}
```

#### FileParsedEvent
**Triggered**: Wanneer bestand succesvol is geparsed
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  metadata: ParseMetadata,
  parsedAt: Timestamp
}
```

#### FileParsingFailedEvent
**Triggered**: Wanneer parsing faalt
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  reason: string,
  failedAt: Timestamp
}
```

#### EANAnalysisStartedEvent
**Triggered**: Wanneer EAN analyse start (ean_analysis_status → 'analyzing')
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  startedAt: Timestamp
}
```

#### EANColumnSelectionRequiredEvent
**Triggered**: Wanneer meerdere EAN kolommen worden gedetecteerd
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  detectedColumns: string[],
  triggeredAt: Timestamp
}
```

#### EANAnalysisCompletedEvent
**Triggered**: Wanneer EAN analyse succesvol is voltooid
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  result: EANAnalysisResult,
  selectedColumn: string,
  completedAt: Timestamp
}
```

#### EANAnalysisFailedEvent
**Triggered**: Wanneer EAN analyse faalt
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  reason: string,
  failedAt: Timestamp
}
```

#### NoEANColumnFoundEvent
**Triggered**: Wanneer geen EAN kolom wordt gevonden
**Payload**:
```typescript
{
  sessionId: number,
  fileName: string,
  triggeredAt: Timestamp
}
```

#### SessionDeletedEvent
**Triggered**: Wanneer session succesvol is verwijderd
**Payload**:
```typescript
{
  sessionId: string,
  deletedAt: Timestamp,
  hadStorageFile: boolean
}
```

#### SessionDeleteFailedEvent
**Triggered**: Wanneer session delete faalt (database error)
**Payload**:
```typescript
{
  sessionId: string,
  reason: string,
  failedAt: Timestamp
}
```

#### StorageDeleteSkippedEvent
**Triggered**: Wanneer Storage delete wordt overgeslagen (file niet gevonden of error)
**Payload**:
```typescript
{
  sessionId: string,
  storagePath: string,
  reason: string,
  skippedAt: Timestamp
}
```

### Repository Interfaces (Domain)

#### IImportSessionRepository
```typescript
interface IImportSessionRepository {
  // File Upload operations
  create(session: ImportSession): Promise<ImportSession>;
  findByHash(hash: string): Promise<ImportSession | null>;
  findById(id: string | number): Promise<ImportSession | null>;
  updateStatus(id: string | number, status: ImportStatus, errorMessage?: string): Promise<void>;
  
  // File Parsing operations
  findQueuedSessions(limit: number): Promise<ImportSession[]>;
  lockSessionForParsing(id: number): Promise<boolean>; // Atomic lock
  updateWithMetadata(
    id: number, 
    metadata: ParseMetadata, 
    parsedAt: Timestamp
  ): Promise<void>;
  
  // EAN Analysis operations
  findSessionsReadyForEANAnalysis(limit: number): Promise<ImportSession[]>;
  lockSessionForEANAnalysis(id: number): Promise<boolean>; // Atomic lock
  updateWithEANAnalysisResults(
    id: number,
    result: EANAnalysisResult,
    columnName: string
  ): Promise<void>;
  updateEANAnalysisStatus(
    id: number,
    status: EANAnalysisStatus,
    errorMessage?: string
  ): Promise<void>;
  
  // Session Delete operations
  delete(id: string): Promise<void>;
  
  // JSON Conversion operations
  findSessionsReadyForJSONConversion(limit: number): Promise<ImportSession[]>;
  lockSessionForJSONConversion(id: number): Promise<boolean>; // Atomic lock
  updateWithJSONConversionStatus(
    id: number,
    status: 'converting' | 'ready_for_activation' | 'failed',
    errorMessage?: string
  ): Promise<void>;
}
```

### Application Services (Domain)

#### FileUploadService
**Orchestrates**: File upload proces
**Depends on**: 
- FileValidator
- FileStorage
- IImportSessionRepository

**Use Cases**:
1. Receive and Validate File
2. Detect Duplicate Files
3. Store File in Storage
4. Register Import Session

#### FileProcessingService
**Orchestrates**: Complete file parsing workflow
**Depends on**: 
- QueueProcessor
- FileProcessor
- FileStorage
- IImportSessionRepository

**Use Cases**:
1. Process Next File in Queue
   - Get next queued session
   - Lock session atomically
   - Process file (download, parse, update)
   - Handle errors
2. Retry Failed Parsing
   - Find session with status 'failed'
   - Reset status to 'parsing'
   - Trigger queue processing again

#### EANAnalysisService
**Orchestrates**: Complete EAN analysis workflow
**Depends on**: 
- EANDetector
- EANAnalyzer
- FileStorage
- IImportSessionRepository

**Use Cases**:
1. Analyze EAN Codes in File
   - Get next session ready for analysis
   - Lock session atomically
   - Detect EAN columns
   - Handle different scenarios (0, 1, or multiple columns)
   - Analyze EAN codes
   - Update session with results
2. Select EAN Column (User Interaction)
   - Get session with status 'pending_column_selection'
   - Verify selected column is valid
   - Analyze EAN codes with selected column
   - Update session with results

#### SessionDeleteApplicationService
**Orchestrates**: Session delete proces
**Depends on**: 
- IImportSessionRepository
- FileStorageDeleteService

**Use Cases**:
1. Delete Session with Storage File
2. Delete Session without Storage File
3. Handle Storage Delete Failure (graceful degradation)
4. Handle Database Delete Failure (critical error)

### Queue Mechanisms

#### Queue Strategy
- **Type**: Database-based queue
- **Order**: FIFO (First In, First Out)
- **Locking**: Optimistic locking with atomic updates
- **Concurrency**: Multiple workers can process different files simultaneously
- **Trigger**: Automatically triggered after successful file upload/parsing

#### Locking Mechanism (File Parsing)
```sql
-- Atomic lock: only succeeds if status is still 'parsing'
UPDATE import_sessions 
SET status = 'parsing' 
WHERE id = $1 AND status = 'parsing'
RETURNING id;
```

#### Locking Mechanism (EAN Analysis)
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

### Error Handling Strategy

#### Graceful Degradation
- **Storage Delete Failure**: Log warning, continueer met database delete
- **Storage File Not Found**: Behandel als succes (idempotent)
- **Rationale**: Storage fouten mogen database cleanup niet blokkeren

#### Critical Errors
- **Database Delete Failure**: Stop proces, retourneer error
- **Session Not Found**: Retourneer 404 (niet een error)
- **Rationale**: Database integriteit is kritisch

#### Error Categories

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

#### Error Recovery

**Retry Strategy**:
- Failed parsing can be manually retried
- Reset status from 'failed' to appropriate previous status
- Trigger queue processing again
- No automatic retries (prevent infinite loops)

**Error Logging**:
- All errors logged with context
- Error messages stored in `error_message` field
- Timestamp of failure stored

### Idempotency

**Principle**: Operations can be safely retried without side effects

**Idempotent Operations**:
- Metadata extraction (always produces same result)
- EAN column detection (always produces same result for same file)
- EAN code analysis (always produces same result for same file and column)
- Database updates (overwrite previous values)
- Status transitions (idempotent state machine)
- Delete operations (idempotent - safe to retry)

**Non-Idempotent Operations**:
- File download (re-downloads file, but same result)
- Processing attempts (multiple attempts logged, but result same)

### Performance Considerations

**File Upload**:
- Hash calculation: Can be async, doesn't block
- Storage upload: Large files may take time, consider progress tracking
- API Timeout: Configured to 5 minutes (300 seconds) for files up to 50MB
- Large File Handling: Files >20MB may require longer upload times (typically 1-2 minutes for 24MB files)

**Metadata Extraction**:
- Lightweight operation (no full file parsing)
- CSV: Streaming parser (memory efficient)
- Excel: Loads workbook structure only
- Expected time: < 5 seconds for 50MB files

**EAN Column Detection**:
- Samples up to 100 rows for efficiency
- Lightweight operation (no full file parsing)
- Expected time: < 5 seconds for files up to 50MB

**EAN Analysis**:
- Processes all rows in file
- Memory efficient (streaming for CSV, row-by-row for Excel)
- Expected time: < 30 seconds for files up to 50MB with 15k rows

**Concurrent Processing**:
- Multiple queue workers supported
- Atomic locking prevents conflicts
- Each worker processes independent files

**Queue Performance**:
- FIFO ordering ensures fairness
- Index on status and ean_analysis_status for fast queries
- Atomic locks prevent blocking

**Storage Delete**:
- Can be slow for large files (< 2 seconds)
- Database Delete: Usually fast (< 100ms)
- CASCADE Delete: Database-optimized, no extra queries needed

### Security Considerations

- **File Validation**: Prevent malicious files
- **Storage Bucket**: Private access only
- **Service Role Key**: Never expose to client
- **File Size Limit**: Prevent DoS attacks
- **Authorization**: Operations require authentication (future)
- **Validation**: Session ID must be validated
- **Audit Trail**: Operations should be logged (future)
- **Error Messages**: Sanitized error messages (no internal paths exposed)
- **Status Locking**: Prevents unauthorized status changes
- **User Input Validation**: Column selection validated against detected columns

### Transaction Boundaries

#### Transaction 1: Session Creation + Storage Upload
- Start: Session record creation
- Commit: After successful storage upload
- Rollback: If storage upload fails

#### Transaction 2: Lock Session (Parsing)
- Start: SELECT session with status 'parsing'
- Update: SET status = 'parsing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

#### Transaction 3: Process File
- Start: Download file from storage
- Process: Extract metadata
- Commit: Update database with metadata and status
- Rollback: On any error → mark status as 'failed' with error message

#### Transaction 4: Lock Session (EAN Analysis)
- Start: SELECT session with status 'ready_for_processing' and ean_analysis_status IS NULL
- Update: SET ean_analysis_status = 'analyzing' (atomic lock)
- Success: Proceed to processing
- Failure: Another process got lock → return success (no action)

#### Transaction 5: Process EAN Analysis
- Start: Download file from storage
- Process: Detect columns, analyze EAN codes
- Commit: Update database with results and status
- Rollback: On any error → mark ean_analysis_status as 'failed' with error message

#### Transaction 6: Session Fetch (Delete)
- Scope: Read session from database
- Isolation: Read committed
- Failure: Return 404 if not found

#### Transaction 7: Storage Delete (Optional)
- Scope: Delete file from Storage
- Isolation: Separate operation
- Failure: Log warning, continue (graceful degradation)

#### Transaction 8: Database Delete
- Scope: Delete session record
- Isolation: Atomic delete
- CASCADE: Automatically deletes related `ean_conflicts`
- Failure: Stop process, return error

### Business Rules Summary

1. **File Upload**:
   - File hash moet uniek zijn (duplicaat preventie)
   - File size moet ≤ 50MB zijn
   - File type moet csv of xlsx zijn
   - Bestand moet succesvol opgeslagen zijn in Storage

2. **File Parsing**:
   - Een bestand kan alleen worden geparsed als het status 'parsing' heeft
   - Status wijziging moet atomisch zijn (prevent race conditions)
   - Metadata extractie gebeurt zonder volledige data parsing
   - Bij parsing fout: status wordt 'failed' met error_message

3. **EAN Analysis**:
   - Automatically detects columns that contain GTIN-13/EAN-13 codes
   - Requires ≥80% of values to be valid GTIN-13
   - Requires minimum 5 values in column
   - If no EAN column found, file cannot proceed
   - If multiple EAN columns found, user must select
   - If exactly one EAN column found, automatically used
   - Only valid GTIN-13 codes are counted

4. **Session Delete**:
   - Alle statussen kunnen verwijderd worden
   - Storage delete is optioneel (graceful degradation)
   - Database delete is verplicht (critical)
   - Delete operatie is idempotent
   - CASCADE DELETE op `ean_conflicts` zorgt automatisch voor cleanup

5. **Queue Processing**:
   - Process files in FIFO order (oldest first)
   - Only one process can lock a session (atomic update)
   - Multiple workers can process different files simultaneously

6. **JSON Conversion**:
   - Automatically triggered after status 'approved'
   - Converts approved file to JSON format
   - Saves JSON to Storage: `approved/{sessionId}/data.json`
   - Status transitions: `approved` → `converting` → `ready_for_activation`
   - Original file kept until activation completed

7. **JSON Viewer**:
   - Available for sessions with JSON data (status >= 'approved')
   - Server-side pagination (50 rows per page, max 200)
   - Server-side search across all columns
   - Table view with dynamic columns
   - Statistics display (total rows, columns, search results)

### JSON Viewer Functionality

**Purpose**: Allow users to view and validate converted JSON data before activation

**API Endpoint**: `GET /api/sessions/[sessionId]/json`

**Features**:
- Server-side pagination (default 50 rows per page, max 200)
- Server-side search across all columns (case-insensitive)
- Table view with dynamic columns
- Statistics display (total rows, columns, search results)
- Loading states and error handling

**Use Cases**:
1. Validate JSON data structure before activation
2. Search for specific products or values
3. Verify data completeness and accuracy
4. Review converted data format

**Access Control**:
- Available for sessions with status: `approved`, `converting`, `ready_for_activation`, `activating`, `activated`
- JSON data must exist in Storage at path: `approved/{sessionId}/data.json`

### Future Enhancements

- Soft delete: Archive sessions instead of hard delete
- Batch delete: Delete multiple sessions at once
- Audit logging: Track who deleted what and when
- Recovery: Restore deleted sessions from backups
- Scheduled/automatic imports (cron jobs)
- Enhanced error reporting and monitoring
- Progress tracking for large file operations

