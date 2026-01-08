# SYS-AI-ACT-001: Activate AI Provider

## User Story
**As an** Admin  
**I want to** set one AI provider as the active/primary provider  
**So that** the system uses that provider for AI features

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | Only one provider active at a time | DB constraint or service logic |
| 2 | Activating deactivates current | Previous is_active → false |
| 3 | Cannot activate unconfigured | 400 if no API key |
| 4 | Provider tested before activation | Test must pass |
| 5 | Returns updated provider list | Full list in response |
| 6 | Fallback setting available | Enable/disable rules fallback |

## API Contract

### PUT /api/v2/system/ai/providers/{id}/activate

**Response 200:**
```json
{
  "message": "Provider activated",
  "active_provider": {
    "provider_code": "gemini",
    "display_name": "Google Gemini",
    "model_name": "gemini-1.5-flash"
  }
}
```

**Response 400 (not configured):**
```json
{
  "detail": "Cannot activate provider without API key"
}
```

**Response 400 (test failed):**
```json
{
  "detail": "Provider test failed: Invalid API key"
}
```

## Business Rules
- System always has exactly one active provider OR falls back to rules
- If no provider active AND fallback disabled → AI features return error
- Activation triggers a test call to verify connectivity
