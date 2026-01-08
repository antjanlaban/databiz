# File Upload Domain Model

## Bounded Context: File Reception & Validation

### Domain Overview
De File Upload bounded context is verantwoordelijk voor het ontvangen, valideren en opslaan van supplier bestanden voordat ze verwerkt worden. Dit is de eerste fase in het ETL proces (Extract, Transform, Load).

### Core Domain Entities

#### 1. ImportSession (Aggregate Root)
**Identity**: `id` (UUID)

**Attributes**:
- `file_name`: String - Originele bestandsnaam
- `file_type`: Enum['csv', 'xlsx'] - Type bestand
- `file_hash`: String(64) - SHA256 hash voor duplicaat detectie
- `file_size_bytes`: Integer - Grootte in bytes
- `file_storage_path`: String - Pad in Supabase Storage
- `status`: Enum - Huidige status in lifecycle
- `uploaded_at`: Timestamp - Wanneer bestand is ontvangen
- `error_message`: String (optional) - Foutmelding bij falen

**Lifecycle States**:
```
received → validating → ready_for_processing → processing → completed
                                                        ↓
                                                    failed
```

**Invariants**:
- File hash moet uniek zijn (duplicaat preventie)
- File size moet ≤ 50MB zijn
- File type moet csv of xlsx zijn
- Storage path moet bestaan voordat status kan veranderen naar 'validating'

**Business Rules**:
1. Een bestand met dezelfde hash kan niet opnieuw geüpload worden
2. Bestand moet succesvol opgeslagen zijn in Storage voordat status 'received' is
3. Bij Storage fout: proces stopt, geen database record

#### 2. FileValidator (Domain Service)
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

#### 3. FileStorage (Domain Service)
**Responsibility**: Abstraheert Storage operaties

**Operations**:
- `ensureBucketExists(bucketName: string): Promise<void>`
- `uploadFile(bucket: string, path: string, file: File): Promise<StoragePath>`
- `sanitizeFileName(filename: string): string`

**Business Rules**:
- Bucket naam: `supplier-uploads`
- Bucket type: Private (authenticated only)
- Folder structuur: `incoming/{session_id}/{sanitized_filename}`
- Originele bestandsnaam moet behouden blijven (na sanitization)

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

### Repository Interfaces (Domain)

#### IImportSessionRepository
```typescript
interface IImportSessionRepository {
  create(session: ImportSession): Promise<ImportSession>;
  findByHash(hash: string): Promise<ImportSession | null>;
  findById(id: UUID): Promise<ImportSession | null>;
  updateStatus(id: UUID, status: ImportStatus, errorMessage?: string): Promise<void>;
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
