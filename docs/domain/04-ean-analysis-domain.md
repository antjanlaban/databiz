# EAN Analysis Domain Model

## Bounded Context: EAN Code Detection & Analysis

### Domain Overview
De EAN Analysis bounded context is verantwoordelijk voor het detecteren van EAN/GTIN-13 kolommen in bestanden, het analyseren van EAN codes, en het tellen van unieke codes en duplicaten. Dit is de derde fase in het ETL proces na file parsing en maakt gebruik van automatische detectie en eventueel gebruikersinteractie.

### Core Domain Entities

#### 1. ImportSession (Aggregate Root - Extended)
**Identity**: `id` (Number/BIGSERIAL)

**Attributes** (extended from File Parsing domain):
- `unique_ean_count`: Integer - Aantal unieke EAN codes in bestand
- `duplicate_ean_count`: Integer - Aantal EAN duplicaten in bestand
- `detected_ean_column`: String - Naam van de gedetecteerde EAN kolom
- `ean_analysis_status`: Enum - Status van EAN analyse
- `ean_analysis_at`: Timestamp - Wanneer EAN analyse is voltooid

**Lifecycle States** (extended):
```
ready_for_processing → (EAN analyse trigger)
    ↓
analyzing → (EAN detectie)
    ├─→ no_ean_column (geen EAN kolom gevonden, bestand kan niet verder)
    ├─→ pending_column_selection (meerdere EAN kolommen, wacht op gebruiker)
    └─→ completed (EAN analyse succesvol, klaar voor volgende stap)
```

**Invariants**:
- File moet status 'ready_for_processing' hebben voordat EAN analyse kan starten
- EAN analyse status moet atomisch worden gezet (locking mechanisme)
- Als geen EAN kolom wordt gevonden, kan het bestand niet verder in het proces
- Als meerdere EAN kolommen worden gevonden, moet gebruiker kiezen

**Business Rules**:
1. Een bestand kan alleen worden geanalyseerd als het status 'ready_for_processing' heeft
2. Status wijziging naar 'analyzing' moet atomisch zijn (prevent race conditions)
3. Bij geen EAN kolom: status wordt 'no_ean_column', bestand kan niet verder
4. Bij meerdere EAN kolommen: status wordt 'pending_column_selection', wacht op gebruiker
5. Bij succesvolle analyse: status wordt 'completed' met statistieken

#### 2. EANDetector (Domain Service)
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

#### 3. EANAnalyzer (Domain Service)
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

### Value Objects

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

#### EANAnalysisStartedEvent
**Triggered**: Wanneer EAN analyse start (status → 'analyzing')
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

### Repository Interfaces (Domain)

#### IImportSessionRepository (Extended)
```typescript
interface IImportSessionRepository {
  // Existing operations from previous domains
  findById(id: number): Promise<ImportSession | null>;
  updateStatus(id: number, status: ImportStatus, errorMessage?: string): Promise<void>;
  
  // New operations for EAN Analysis domain
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
}
```

**New Methods**:
- `findSessionsReadyForEANAnalysis()`: Find sessions with status 'ready_for_processing' and ean_analysis_status IS NULL
- `lockSessionForEANAnalysis()`: Atomically update ean_analysis_status from NULL to 'analyzing'
- `updateWithEANAnalysisResults()`: Update session with EAN analysis results
- `updateEANAnalysisStatus()`: Update EAN analysis status and error message

### Application Services (Domain)

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

### Queue Mechanism

#### Queue Strategy
- **Type**: Database-based queue
- **Order**: FIFO (First In, First Out)
- **Locking**: Optimistic locking with atomic updates
- **Concurrency**: Multiple workers can process different files simultaneously
- **Trigger**: Automatically triggered after successful file parsing

#### Locking Mechanism
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
1. SELECT session with status 'ready_for_processing' and ean_analysis_status IS NULL
2. UPDATE ean_analysis_status to 'analyzing' with WHERE clause check
3. If UPDATE returns row → lock successful
4. If UPDATE returns no row → another process got the lock

### Error Handling

#### Error Categories

**Storage Errors**:
- File not found in storage
- Storage API failures
- Network errors during download
- **Action**: Mark ean_analysis_status as 'failed', store error message

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
- No EAN column found → status 'no_ean_column', bestand kan niet verder
- Multiple EAN columns → status 'pending_column_selection', wacht op gebruiker
- **Action**: Update status appropriately, store information for user

**Database Errors**:
- Connection failures
- Update failures
- Transaction conflicts
- **Action**: Mark ean_analysis_status as 'failed', store database error

#### Error Recovery

**Retry Strategy**:
- Failed analysis can be manually retried
- Reset ean_analysis_status from 'failed' to NULL
- Trigger EAN analysis queue again
- No automatic retries (prevent infinite loops)

**Error Logging**:
- All errors logged with context
- Error messages stored in `error_message` field
- Timestamp of failure stored

### Idempotency

**Principle**: EAN analysis can be safely retried without side effects

**Idempotent Operations**:
- EAN column detection (always produces same result for same file)
- EAN code analysis (always produces same result for same file and column)
- Database updates (overwrite previous values)
- Status transitions (idempotent state machine)

**Non-Idempotent Operations**:
- File download (re-downloads file, but same result)
- Analysis attempts (multiple attempts logged, but result same)

### Performance Considerations

**Column Detection**:
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

### Business Rules Summary

1. **EAN Column Detection**:
   - Automatically detects columns that contain GTIN-13/EAN-13 codes
   - Requires ≥80% of values to be valid GTIN-13
   - Requires minimum 5 values in column

2. **No EAN Column**:
   - If no EAN column found, file cannot proceed
   - Status set to 'no_ean_column'
   - User must be informed

3. **Multiple EAN Columns**:
   - If multiple EAN columns found, user must select
   - Status set to 'pending_column_selection'
   - User selection required before analysis can proceed

4. **Single EAN Column**:
   - If exactly one EAN column found, automatically used
   - Analysis proceeds immediately
   - Results stored in database

5. **EAN Analysis**:
   - Only valid GTIN-13 codes are counted
   - Unique count: number of distinct EAN codes
   - Duplicate count: number of EAN codes that appear more than once
   - Results stored for display and further processing

