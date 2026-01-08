# SYS-AI-DEL-001: Delete Provider Key

## User Story
**As an** Admin  
**I want to** remove an API key from the database  
**So that** I can revoke access or switch providers

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | Can only delete DB-sourced keys | 403 for ENV keys |
| 2 | Deleting active → fallback | Next provider or rules |
| 3 | Confirmation dialog | UI shows warning |
| 4 | Permanent deletion | No soft delete |
| 5 | Returns 204 No Content | Success code |

## API Contract

### DELETE /api/v2/system/ai/providers/{id}

**Response 204:** (success, no body)

**Response 403 (ENV source):**
```json
{
  "detail": "Cannot delete environment variable key. Remove from ENV configuration."
}
```

**Response 404:**
```json
{
  "detail": "Provider not found"
}
```

## Security Notes
- ENV keys are managed via infrastructure, not UI
- Hard delete for security (no recovery)
- Audit log entry recommended
