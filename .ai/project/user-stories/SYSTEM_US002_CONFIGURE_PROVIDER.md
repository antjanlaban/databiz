# SYS-AI-CFG-001: Configure AI Provider

## User Story
**As an** Admin  
**I want to** add or update an API key for an AI provider  
**So that** I can enable AI features

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | Form accepts provider selection | Dropdown with Gemini/OpenAI/Anthropic |
| 2 | API key input is password-type | Input type="password", masked |
| 3 | Model selection shows available models | Dropdown per provider |
| 4 | API key is AES-256-GCM encrypted | Verify encryption in DB |
| 5 | Encryption key from SECRET_KEY | PBKDF2 derivation |
| 6 | Auto-test after save | Test endpoint called |
| 7 | Validation on invalid key format | 400 error for bad format |
| 8 | Cannot override ENV keys | 403 if ENV key exists |

## API Contract

### POST /api/v2/system/ai/providers

**Request:**
```json
{
  "provider_code": "gemini",
  "api_key": "AIza...",
  "model_name": "gemini-1.5-flash"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "provider_code": "gemini",
  "display_name": "Google Gemini",
  "is_configured": true,
  "is_active": false,
  "source": "db",
  "model_name": "gemini-1.5-flash",
  "test_status": "success"
}
```

**Response 403 (ENV exists):**
```json
{
  "detail": "Cannot override environment variable. Remove GEMINI_API_KEY from ENV first."
}
```

## Security Notes
- API key encrypted with AES-256-GCM
- Encryption key = PBKDF2(SECRET_KEY, salt="ai_provider_keys")
- Keys NEVER logged or returned
- Keys NEVER sent to frontend
