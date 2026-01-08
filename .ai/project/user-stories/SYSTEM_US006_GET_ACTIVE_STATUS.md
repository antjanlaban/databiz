# SYS-AI-STA-001: Get Active AI Status

## User Story
**As the** System  
**I want to** quickly get the current active AI provider  
**So that** AI features know which provider to use

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | Returns current active provider | provider field |
| 2 | Returns fallback status | fallback_enabled field |
| 3 | Cached response (5 min TTL) | Performance optimization |
| 4 | No provider = rules info | provider = "rules" |

## API Contract

### GET /api/v2/system/ai/active

**Response 200 (provider active):**
```json
{
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "fallback_enabled": true,
  "source": "env"
}
```

**Response 200 (no provider, fallback enabled):**
```json
{
  "provider": "rules",
  "model": null,
  "fallback_enabled": true,
  "source": null
}
```

**Response 200 (no provider, fallback disabled):**
```json
{
  "provider": null,
  "model": null,
  "fallback_enabled": false,
  "source": null,
  "warning": "No AI provider configured and fallback disabled"
}
```

## Technical Notes
- This endpoint is called by ai_service.py to determine provider
- Should be fast (<10ms) due to caching
- Cache invalidated on provider change
