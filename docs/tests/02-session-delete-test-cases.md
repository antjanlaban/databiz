# Test Cases: Session Delete Functionality

## Test Suite: DELETE /api/sessions/[id]

### TC-DS-001: Successful Delete with Storage File
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has `file_storage_path` set
- File exists in Supabase Storage at the specified path

**Test Data**:
- Session ID: Valid session ID (e.g., "1")
- Storage path: "incoming/session-id/test.csv"

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Verify response status: 200 OK
3. Verify response contains success message
4. Verify storage file was deleted
5. Verify database record was deleted
6. Verify related `ean_conflicts` automatically deleted (CASCADE)

**Expected Results**:
- HTTP 200
- Response JSON: `{ "success": true, "message": "Session deleted successfully" }`
- Storage file removed from bucket
- Database record deleted
- Related conflicts deleted via CASCADE constraint

**Post-conditions**:
- Session removed from database
- File removed from Storage
- Conflicts removed (if any existed)

---

### TC-DS-002: Successful Delete without Storage File
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has `file_storage_path` as NULL or empty string

**Test Data**:
- Session ID: Valid session ID
- Storage path: NULL or ""

**Steps**:
1. DELETE request to `/api/sessions/[id]` with session ID
2. Verify response status: 200 OK
3. Verify storage delete function not called
4. Verify database delete succeeds

**Expected Results**:
- HTTP 200
- Storage delete function not invoked
- Database record deleted successfully

**Note**: This covers cases where upload failed before Storage was written, or Storage path is missing.

---

### TC-DS-003: Delete Failed Session
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Import session exists with status 'failed'
- Session may or may not have Storage file

**Test Data**:
- Session ID: Valid session ID
- Status: 'failed'
- Storage path: May be present or NULL

**Steps**:
1. DELETE request to `/api/sessions/[id]` with failed session ID
2. Verify response status: 200 OK
3. Verify session deleted successfully

**Expected Results**:
- HTTP 200
- Session deleted regardless of status

**Note**: All session statuses should be deletable.

---

### TC-DS-004: Delete Session Not Found
**Priority**: Critical  
**Type**: Integration Test

**Preconditions**:
- Session ID does not exist in database

**Test Data**:
- Session ID: Non-existent ID (e.g., "999")
- Or empty/missing session ID

**Steps**:
1. DELETE request to `/api/sessions/[id]` with invalid session ID
2. Verify response status: 404 Not Found
3. Verify error code in response

**Expected Results**:
- HTTP 404
- Error code: `SESSION_NOT_FOUND`
- Error message: "Import session not found"
- No storage or database operations attempted

**Test Cases**:
- Non-existent session ID
- Missing session ID parameter
- Invalid session ID format

---

### TC-DS-005: Storage Delete Failure
**Priority**: High  
**Type**: Integration Test (with mocked Storage)

**Preconditions**:
- Session exists in database
- Storage service configured to fail on delete
- Session has valid `file_storage_path`

**Test Data**:
- Session ID: Valid session ID
- Storage path: "incoming/session-id/test.csv"
- Storage error: Simulated failure

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Storage service simulates failure
3. Verify graceful error handling
4. Verify database delete still proceeds

**Expected Results**:
- HTTP 200 (graceful degradation)
- Warning logged for Storage failure
- Database record deleted successfully
- Error logged but not thrown to user

**Note**: Storage delete failure should not prevent database delete (graceful degradation pattern).

---

### TC-DS-006: Database Delete Failure
**Priority**: Critical  
**Type**: Integration Test (with mocked Database)

**Preconditions**:
- Session exists in database
- Database configured to fail on delete

**Test Data**:
- Session ID: Valid session ID
- Database error: Simulated failure

**Steps**:
1. DELETE request to `/api/sessions/[id]` with valid session ID
2. Database delete operation fails
3. Verify error response

**Expected Results**:
- HTTP 500
- Error code: `SESSION_DELETE_FAILED`
- Error message describes database failure
- Storage file remains (delete not rolled back)

**Note**: Database delete failure is a critical error and should stop the process.

---

### TC-DS-007: Delete Session with Conflicts
**Priority**: High  
**Type**: Integration Test

**Preconditions**:
- Import session exists in database
- Session has related `ean_conflicts` records
- CASCADE DELETE constraint exists on `ean_conflicts.session_id`

**Test Data**:
- Session ID: Valid session ID
- Related conflicts: 1 or more conflict records

**Steps**:
1. Verify conflicts exist for session
2. DELETE request to `/api/sessions/[id]`
3. Verify session deleted
4. Verify conflicts automatically deleted

**Expected Results**:
- HTTP 200
- Session deleted successfully
- Conflicts automatically deleted via CASCADE constraint
- No manual conflict cleanup needed in code

**Note**: CASCADE delete is handled by database, not application code. This test verifies the constraint works correctly.

---

### TC-DS-008: Delete Different Session Statuses
**Priority**: Medium  
**Type**: Integration Test

**Preconditions**:
- Multiple sessions exist with different statuses

**Test Data**:
- Sessions with statuses: 'pending', 'received', 'processing', 'completed', 'failed'

**Steps**:
1. For each status, DELETE request to `/api/sessions/[id]`
2. Verify each deletion succeeds

**Expected Results**:
- All statuses can be deleted
- HTTP 200 for all statuses
- No status-specific restrictions

**Test Matrix**:
| Status     | Can Delete | Expected Result |
|------------|------------|-----------------|
| pending    | Yes        | 200 OK          |
| received   | Yes        | 200 OK          |
| processing | Yes        | 200 OK          |
| completed  | Yes        | 200 OK          |
| failed     | Yes        | 200 OK          |

---

## Test Data Requirements

### Sample Session Data
```typescript
{
  id: 1,
  file_name: "test-products.csv",
  status: "received",
  file_storage_path: "incoming/session-id/test-products.csv",
  file_hash: "abc123...",
  total_rows: 100,
  processed_rows: 100,
  conflicts_count: 0
}
```

## Test Environment Setup

### Prerequisites
- Supabase project configured
- Test database with schema
- Storage bucket permissions set
- Environment variables configured

### Test Isolation
- Each test should clean up after execution
- Use unique session IDs
- Mock Storage and Database for error scenarios
- Reset mocks in `beforeEach` hooks

## Test Execution Order

### Smoke Tests (Run First)
1. TC-DS-001 (Successful delete with file)
2. TC-DS-004 (Not found error)

### Core Functionality
3. TC-DS-002 (Delete without file)
4. TC-DS-003 (Delete failed session)
5. TC-DS-008 (All statuses)

### Error Handling
6. TC-DS-005 (Storage failure - graceful degradation)
7. TC-DS-006 (Database failure - critical error)

### Advanced Scenarios
8. TC-DS-007 (CASCADE delete verification)

## Coverage Goals

- **Integration Tests**: All API endpoints covered
- **Error Scenarios**: All error codes tested
- **Edge Cases**: Empty paths, missing data, etc.
- **Critical Paths**: 100% coverage

## Performance Benchmarks

- Delete operation: < 1 second (without Storage file)
- Delete with Storage: < 2 seconds
- Error responses: < 500ms

