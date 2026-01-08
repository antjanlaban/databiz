# ETL Phase 1: Extract - File Reception & Storage

## Overview
De Extract fase is de eerste stap in het ETL proces en bestaat uit het ontvangen, valideren en opslaan van supplier bestanden.

## Process Flow

```
[User Upload] 
    ↓
[Client Validation] → Check file selected
    ↓
[API Request] → POST /api/upload
    ↓
[Server Validation] → Validate extension, size
    ↓
[Hash Calculation] → Calculate SHA256
    ↓
[Duplicate Check] → Query database for existing hash
    ↓
    ├─→ [Duplicate Found] → Return error, stop
    │
    └─→ [Unique File] → Continue
         ↓
[Create Session] → Generate UUID, set status 'pending'
    ↓
[Storage Upload] → Upload to supplier-uploads/incoming/{session_id}/{filename}
    ↓
    ├─→ [Storage Success] → Continue
    │   ↓
    │   [Update Session] → Set status 'received', store metadata
    │   ↓
    │   [Success Response] → Return session ID to client
    │
    └─→ [Storage Failure] → Stop process, return error
```

## Step-by-Step Process

### Step 1: Client-Side File Selection
**Location**: `app/upload/page.tsx`
**Action**: User selects file via HTML input
**Validation**: Basic client-side checks (file exists, not empty)

### Step 2: API Request
**Endpoint**: `POST /api/upload`
**Content-Type**: `multipart/form-data`
**Payload**: File object

### Step 3: Server-Side Validation
**Location**: `lib/fileValidation.ts`

**3.1 Extension Validation**
- Allowed: `.csv`, `.xlsx`, `.xls`
- Case-insensitive check
- Extract extension from filename
- **Error**: `FILE_EXTENSION_INVALID`

**3.2 Size Validation**
- Max size: 50 MB (52,428,800 bytes)
- Read `file.size` property
- **Error**: `FILE_SIZE_EXCEEDED`

### Step 4: Hash Calculation
**Location**: `lib/fileValidation.ts`
**Algorithm**: SHA256
**Implementation**: Web Crypto API or crypto library
**Output**: 64-character hex string

**Example**:
```typescript
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Step 5: Duplicate Detection
**Location**: `lib/fileValidation.ts` + Database query
**Query**: 
```sql
SELECT id, file_name, uploaded_at 
FROM import_sessions 
WHERE file_hash = $1
LIMIT 1
```

**Business Rule**: 
- If hash exists → Return error with existing session info
- If hash is new → Continue to storage

### Step 6: Session Creation
**Location**: Database transaction
**Action**: 
- Generate UUID for session
- Create record with status `'pending'`
- Store: file_name, file_type, file_hash, file_size_bytes

**SQL**:
```sql
INSERT INTO import_sessions (
  id, file_name, file_type, file_hash, 
  file_size_bytes, status
) VALUES (
  gen_random_uuid(), $1, $2, $3, $4, 'pending'
) RETURNING id;
```

### Step 7: Storage Upload
**Location**: `lib/storage.ts`

**7.1 Bucket Creation** (if not exists)
- Check if bucket `supplier-uploads` exists
- Create if missing (private bucket)
- Set bucket policies (authenticated users only)

**7.2 Path Construction**
- Format: `incoming/{session_id}/{sanitized_filename}`
- Sanitize filename: Remove special characters, preserve extension
- Example: `incoming/550e8400-e29b-41d4-a716-446655440000/products.csv`

**7.3 File Upload**
- Use Supabase Storage API with service role key
- Upload file as binary data
- Store metadata (content-type, size)
- **Timeout**: API route configured with 5-minute timeout (300 seconds) for large files
- **Logging**: Upload progress and duration logged for debugging

**Error Handling**:
- Storage API failure → Rollback session creation (if possible)
- Network timeout → Enhanced error message with file size context and actionable guidance
- Network errors (fetch failed, ECONNRESET, ETIMEDOUT) → Detected and reported with user-friendly messages
- Quota exceeded → Return error

### Step 8: Session Update
**Location**: Database update
**Action**: 
- Update status to `'received'`
- Store `file_storage_path`
- Set `uploaded_at` timestamp

**SQL**:
```sql
UPDATE import_sessions 
SET 
  status = 'received',
  file_storage_path = $1,
  uploaded_at = NOW()
WHERE id = $2;
```

### Step 9: Response
**Success Response** (200):
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "fileName": "products.csv",
  "fileSize": 1048576,
  "storagePath": "incoming/550e8400-e29b-41d4-a716-446655440000/products.csv",
  "message": "File uploaded successfully"
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "error": "DUPLICATE_FILE",
  "message": "This exact file has already been uploaded",
  "existingSessionId": "existing-uuid-here",
  "uploadedAt": "2026-01-08T10:00:00Z"
}
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `FILE_NOT_PROVIDED` | No file in request | 400 |
| `FILE_EXTENSION_INVALID` | Extension not csv/xlsx | 400 |
| `FILE_SIZE_EXCEEDED` | File > 50MB | 400 |
| `DUPLICATE_FILE` | Hash already exists | 409 |
| `STORAGE_UPLOAD_FAILED` | Storage API error | 500 |
| `STORAGE_BUCKET_ERROR` | Bucket creation/access error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `HASH_CALCULATION_FAILED` | Hash generation error | 500 |

## Dependencies

### External Services
- **Supabase Storage**: File storage service
- **Supabase Database**: Session metadata storage

### Internal Services
- **FileValidator**: Validation logic
- **FileStorage**: Storage abstraction
- **ImportSessionRepository**: Database operations

## Transaction Boundaries

### Transaction 1: Session Creation + Storage Upload
- Start: Session record creation
- Commit: After successful storage upload
- Rollback: If storage upload fails

**Note**: If storage fails after session creation, mark session as `'failed'` with error message.

## Performance Considerations

- Hash calculation: Can be async, doesn't block
- Storage upload: Large files may take time, consider progress tracking
- **API Timeout**: Configured to 5 minutes (300 seconds) for files up to 50MB
- **Large File Handling**: Files >20MB may require longer upload times (typically 1-2 minutes for 24MB files)
- **Logging**: Upload duration and file size logged for performance monitoring
- Duplicate check: Index on `file_hash` required for performance

## Security Considerations

- File validation: Prevent malicious files
- Storage bucket: Private access only
- Service role key: Never expose to client
- File size limit: Prevent DoS attacks
