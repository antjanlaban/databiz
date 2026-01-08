# File Parsing Domain Model

## Bounded Context: File Parsing & Metadata Extraction

### Domain Overview
De File Parsing bounded context is verantwoordelijk voor het uitlezen van bestanden die met status "received" zijn opgeslagen, het extraheren van metadata (aantal productregels en kolommen), en het updaten van de import_sessions. Dit is de tweede fase in het ETL proces (Extract, Transform, Load) en maakt gebruik van een queue mechanisme.

### Core Domain Entities

#### 1. ImportSession (Aggregate Root)
**Identity**: `id` (Number/BIGSERIAL)

**Attributes** (extended from File Upload domain):
- `total_rows_in_file`: Integer - Aantal productregels in bestand (exclusief header)
- `columns_count`: Integer - Aantal kolommen in bestand
- `parsed_at`: Timestamp - Wanneer parsing is voltooid
- `status`: Enum - Huidige status in lifecycle

**Lifecycle States** (extended):
```
received → parsing → ready_for_processing → (EAN analysis) → processing → completed
                              ↓
                           failed
```

**Note**: After reaching 'ready_for_processing', the file automatically enters the EAN Analysis phase. See [EAN Analysis Domain](./04-ean-analysis-domain.md) for details.

**Invariants**:
- File moet status 'received' hebben voordat parsing kan starten
- Storage path moet bestaan voordat parsing kan starten
- Parsing status moet atomisch worden gezet (locking mechanisme)
- Metadata (rows/columns) moet correct zijn na succesvolle parsing

**Business Rules**:
1. Een bestand kan alleen worden geparsed als het status 'received' heeft
2. Status wijziging naar 'parsing' moet atomisch zijn (prevent race conditions)
3. Bij parsing fout: status wordt 'failed' met error_message
4. Bij succesvolle parsing: status wordt 'ready_for_processing' met metadata
5. Na 'ready_for_processing' wordt automatisch EAN analyse getriggerd (zie [EAN Analysis Domain](./04-ean-analysis-domain.md))

#### 2. FileProcessor (Domain Service)
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

**Dependencies**:
- FileStorage (download operation)
- FileParser (metadata extraction)
- ImportSessionRepository (database operations)

#### 3. QueueProcessor (Domain Service)
**Responsibility**: Manage queue van bestanden die geparsed moeten worden

**Operations**:
- `getNextQueuedSession(): Promise<ImportSession | null>`
  - Find session with status 'received'
  - Return oldest session (FIFO)
  - Atomic lock by updating status to 'parsing'

**Business Rules**:
- Process files in FIFO order (oldest first)
- Only one process can lock a session (atomic update)
- Locking must use WHERE clause to prevent race conditions
- If lock fails, another process is handling the session

#### 4. FileParser (Domain Service)
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

### Value Objects

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

### Domain Events

#### FileQueuedEvent
**Triggered**: Wanneer bestand met status 'received' wordt toegevoegd aan queue
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

### Repository Interfaces (Domain)

#### IImportSessionRepository (Extended)
```typescript
interface IImportSessionRepository {
  // Existing operations from File Upload domain
  create(session: ImportSession): Promise<ImportSession>;
  findByHash(hash: string): Promise<ImportSession | null>;
  findById(id: number): Promise<ImportSession | null>;
  updateStatus(id: number, status: ImportStatus, errorMessage?: string): Promise<void>;
  
  // New operations for File Parsing domain
  findQueuedSessions(limit: number): Promise<ImportSession[]>;
  lockSessionForParsing(id: number): Promise<boolean>; // Atomic lock
  updateWithMetadata(
    id: number, 
    metadata: ParseMetadata, 
    parsedAt: Timestamp
  ): Promise<void>;
}
```

**New Methods**:
- `findQueuedSessions()`: Find sessions with status 'received', ordered by created_at
- `lockSessionForParsing()`: Atomically update status from 'received' to 'parsing'
- `updateWithMetadata()`: Update session with parsing results

### Application Services (Domain)

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
   - Reset status to 'received'
   - Trigger queue processing again

### Queue Mechanism

#### Queue Strategy
- **Type**: Database-based queue
- **Order**: FIFO (First In, First Out)
- **Locking**: Optimistic locking with atomic updates
- **Concurrency**: Multiple workers can process different files simultaneously

#### Locking Mechanism
```sql
-- Atomic lock: only succeeds if status is still 'received'
UPDATE import_sessions 
SET status = 'parsing' 
WHERE id = $1 AND status = 'received'
RETURNING id;
```

**Locking Rules**:
1. SELECT session with status 'received'
2. UPDATE status to 'parsing' with WHERE clause check
3. If UPDATE returns row → lock successful
4. If UPDATE returns no row → another process got the lock

#### Queue Processing Flow
1. Query sessions with status 'received' (FIFO order)
2. Atomically lock first session (status → 'parsing')
3. Process file (download, parse, update)
4. On success: status → 'ready_for_processing'
5. On failure: status → 'failed' with error message

### Error Handling

#### Error Categories

**Storage Errors**:
- File not found in storage
- Storage API failures
- Network errors during download
- **Action**: Mark session as 'failed', store error message

**Parsing Errors**:
- Corrupt or invalid file format
- Unsupported file type
- Empty files (handled gracefully)
- Missing headers
- **Action**: Mark session as 'failed', store parsing error

**Database Errors**:
- Connection failures
- Update failures
- Transaction conflicts
- **Action**: Mark session as 'failed', store database error

#### Error Recovery

**Retry Strategy**:
- Failed parsing can be manually retried
- Reset status from 'failed' to 'received'
- Trigger queue processing again
- No automatic retries (prevent infinite loops)

**Error Logging**:
- All errors logged with context
- Error messages stored in `error_message` field
- Timestamp of failure stored

### Idempotency

**Principle**: Parsing can be safely retried without side effects

**Idempotent Operations**:
- Metadata extraction (always produces same result)
- Database updates (overwrite previous values)
- Status transitions (idempotent state machine)

**Non-Idempotent Operations**:
- File download (re-downloads file, but same result)
- Processing attempts (multiple attempts logged, but result same)

### Performance Considerations

**Metadata Extraction**:
- Lightweight operation (no full file parsing)
- CSV: Streaming parser (memory efficient)
- Excel: Loads workbook structure only
- Expected time: < 5 seconds for 50MB files

**Concurrent Processing**:
- Multiple queue workers supported
- Atomic locking prevents conflicts
- Each worker processes independent files

**Queue Performance**:
- FIFO ordering ensures fairness
- Index on status for fast queries
- Atomic locks prevent blocking

