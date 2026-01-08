# SYS-AI-TST-001: Test AI Connection

## User Story
**As an** Admin  
**I want to** test an AI provider with a simple prompt  
**So that** I can verify the API key works

## Acceptance Criteria

| AC | Criterion | Test |
|----|-----------|------|
| 1 | Default prompt: "What is 2+2?" | Quick math test |
| 2 | Response displayed with time | Show ms duration |
| 3 | Success = green checkmark | Visual indicator |
| 4 | Failure = red X + error | Error message shown |
| 5 | Can test any configured provider | provider_id optional |
| 6 | Custom prompt option | prompt field in request |
| 7 | 30 second timeout | Returns timeout error |

## API Contract

### POST /api/v2/system/ai/test

**Request:**
```json
{
  "provider_id": "uuid-optional-defaults-to-active",
  "prompt": "What is 2+2?"
}
```

**Response 200 (success):**
```json
{
  "success": true,
  "provider": "gemini",
  "response": "4",
  "response_time_ms": 234,
  "model_used": "gemini-1.5-flash"
}
```

**Response 200 (failure):**
```json
{
  "success": false,
  "provider": "gemini",
  "error": "Invalid API key",
  "response_time_ms": 1234
}
```

## UI Mockup
```
┌─────────────────────────────────────────────┐
│ 📡 AI Test                                  │
├─────────────────────────────────────────────┤
│ Prompt: [What is 2+2?          ] [Test AI]  │
│                                             │
│ ✅ Response: 4                              │
│ ⏱️ 234ms | Model: gemini-1.5-flash          │
└─────────────────────────────────────────────┘
```
