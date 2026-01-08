# Session Delete Domain Model

## Bounded Context: Session Management & Cleanup

### Domain Overview
De Session Delete bounded context is verantwoordelijk voor het verwijderen van import sessions en hun gerelateerde bestanden. Dit is een cleanup operatie die zowel Storage als Database records verwijdert.

### Core Domain Entities

#### 1. ImportSession (Aggregate Root)
**Identity**: `id` (UUID/BigInt)

**Delete Operation**:
- Verwijderen van session vereist verwijdering van:
  - Storage bestand (indien aanwezig)
  - Database record
  - Gerelateerde conflicts (automatisch via CASCADE)

**Invariants**:
- Session moet bestaan voordat verwijdering mogelijk is
- Storage path kan NULL zijn (failed uploads)
- Delete operatie is idempotent (herhaalde calls zijn veilig)

**Business Rules**:
1. Alle session statussen kunnen verwijderd worden ('pending', 'received', 'processing', 'completed', 'failed')
2. Storage delete is optioneel - als Storage delete faalt, gaat database delete door (graceful degradation)
3. Database delete is verplicht - als database delete faalt, wordt de operatie gestopt
4. CASCADE DELETE op `ean_conflicts` zorgt automatisch voor cleanup van gerelateerde data

### Domain Services

#### 1. SessionDeleteService
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

#### 2. FileStorageDeleteService
**Responsibility**: Verwijdert bestanden uit Storage

**Operations**:
- `deleteFile(path: string): Promise<void>`
  - Verwijdert bestand uit Supabase Storage
  - Graceful handling: bestand niet gevonden is geen error

**Business Rules**:
- Bestand niet gevonden wordt behandeld als succes (idempotent)
- Andere Storage errors worden gelogd maar niet gegooid (graceful degradation)

### Value Objects

#### SessionId
- Type: String (URL parameter)
- Validation: Moet niet leeg zijn
- Format: Numeric string of UUID

#### StoragePath
- Type: String (nullable)
- Format: `incoming/{sessionId}/{filename}`
- Nullable: Kan NULL zijn voor failed uploads

### Domain Events

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
  findById(id: string): Promise<ImportSession | null>;
  delete(id: string): Promise<void>;
}
```

### Application Services (Domain)

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

### Error Handling Strategy

#### Graceful Degradation
- **Storage Delete Failure**: Log warning, continueer met database delete
- **Storage File Not Found**: Behandel als succes (idempotent)
- **Rationale**: Storage fouten mogen database cleanup niet blokkeren

#### Critical Errors
- **Database Delete Failure**: Stop proces, retourneer error
- **Session Not Found**: Retourneer 404 (niet een error)
- **Rationale**: Database integriteit is kritisch

### Transaction Boundaries

#### Transaction 1: Session Fetch
- **Scope**: Read session from database
- **Isolation**: Read committed
- **Failure**: Return 404 if not found

#### Transaction 2: Storage Delete (Optional)
- **Scope**: Delete file from Storage
- **Isolation**: Separate operation
- **Failure**: Log warning, continue (graceful degradation)

#### Transaction 3: Database Delete
- **Scope**: Delete session record
- **Isolation**: Atomic delete
- **CASCADE**: Automatically deletes related `ean_conflicts`
- **Failure**: Stop process, return error

### Business Rules Summary

1. **Alle Statussen Deletable**: Geen status-specifieke restricties
2. **Storage Optional**: Storage delete failure blokkeert database delete niet
3. **Database Required**: Database delete failure stopt het proces
4. **Idempotent**: Herhaalde delete calls zijn veilig
5. **CASCADE Cleanup**: Database constraint zorgt voor automatische conflict cleanup
6. **Graceful Degradation**: Storage problemen mogen database operaties niet blokkeren

### Security Considerations

- **Authorization**: Delete operatie vereist authenticatie (toekomstig)
- **Validation**: Session ID moet gevalideerd worden
- **Audit Trail**: Delete operaties moeten gelogd worden (toekomstig)

### Performance Considerations

- **Storage Delete**: Kan langzaam zijn voor grote bestanden (< 2 seconden)
- **Database Delete**: Meestal snel (< 100ms)
- **CASCADE Delete**: Database-geoptimaliseerd, geen extra queries nodig

### Future Enhancements

- Soft delete: Archive sessions instead of hard delete
- Batch delete: Delete multiple sessions at once
- Delete confirmation in UI: Already implemented
- Audit logging: Track who deleted what and when
- Recovery: Restore deleted sessions from backups

