# SYS-AI-LST-001: List AI Providers

## User Story
**As an** Admin  
**I want to** see all available AI providers with their status  
**So that** I know which providers are configured

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | List shows all supported providers (Gemini, OpenAI, Anthropic) | GET /providers returns 3 providers |
| 2 | Each provider shows status: Active/Configured/Not configured | Check status field |
| 3 | Shows source indicator: ENV or DB | source field = "env" or "db" |
| 4 | ENV-sourced keys are read-only | is_from_env = true → no delete button |
| 5 | Shows which provider is currently active | is_active = true for one |
| 6 | Shows model name configured for each provider | model_name field present |

## API Contract

### GET /api/v2/system/ai/providers

**Response 200:**
```json
[
  {
    "id": "uuid",
    "provider_code": "gemini",
    "display_name": "Google Gemini",
    "is_configured": true,
    "is_active": true,
    "source": "env",
    "model_name": "gemini-1.5-flash",
    "last_tested_at": "2025-12-18T10:00:00Z",
    "test_status": "success"
  },
  {
    "id": null,
    "provider_code": "openai",
    "display_name": "OpenAI GPT-4",
    "is_configured": false,
    "is_active": false,
    "source": null,
    "model_name": null,
    "last_tested_at": null,
    "test_status": null
  }
]
```

## Technical Notes
- Providers are always returned (even if not configured)
- ENV keys take precedence over DB keys
- API key values are NEVER returned in response
