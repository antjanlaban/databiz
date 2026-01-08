# IDENTITY_US006: Refresh JWT Token

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authentication |
| **Feature** | login_flow |
| **Slice** | refresh_token |
| **Priority** | Critical |
| **Status** | Ready for Development |

## User Story

**Als** een ingelogde gebruiker  
**Wil ik** dat mijn sessie automatisch verlengd wordt  
**Zodat** ik niet steeds opnieuw hoef in te loggen  

## Acceptance Criteria

### AC1: Token refresh met geldige refresh token
- **Given** een geldige refresh token in de httpOnly cookie
- **When** een POST request naar `/api/v1/auth/refresh` wordt gestuurd
- **Then** wordt een nieuwe access token teruggegeven
- **And** wordt een nieuwe refresh token gezet (token rotation)

### AC2: Verlopen refresh token
- **Given** een verlopen refresh token (ouder dan 7 dagen)
- **When** een refresh request wordt gestuurd
- **Then** wordt een 401 Unauthorized response teruggegeven
- **And** wordt de gebruiker uitgelogd (redirect naar login)

### AC3: Ongeldig of gemanipuleerde token
- **Given** een refresh token met ongeldige signature
- **When** een refresh request wordt gestuurd
- **Then** wordt een 401 Unauthorized response teruggegeven

### AC4: Token rotation (security)
- **Given** een succesvolle token refresh
- **When** de oude refresh token opnieuw wordt gebruikt
- **Then** wordt een 401 Unauthorized response teruggegeven
- **And** worden alle tokens van die gebruiker geïnvalideerd (security breach)

### AC5: Gedeactiveerde gebruiker
- **Given** een gebruiker die is gedeactiveerd na inloggen
- **When** deze probeert tokens te refreshen
- **Then** wordt een 401 Unauthorized response teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Refresh JWT Token
  As a logged-in user
  I want my session to be extended automatically
  So that I don't have to login repeatedly

  Scenario: Successfully refresh tokens
    Given I have a valid refresh_token cookie
    When I send a POST request to "/api/v1/auth/refresh"
    Then the response status should be 200
    And the response should contain a new "access_token"
    And a new refresh_token cookie should be set
    And the old refresh_token should be invalidated

  Scenario: Expired refresh token
    Given my refresh_token has expired (older than 7 days)
    When I send a POST request to "/api/v1/auth/refresh"
    Then the response status should be 401
    And the refresh_token cookie should be cleared

  Scenario: Invalid refresh token
    Given my refresh_token has an invalid signature
    When I send a POST request to "/api/v1/auth/refresh"
    Then the response status should be 401

  Scenario: Reuse of old refresh token (token replay attack)
    Given I have refreshed my tokens
    And I have the old refresh_token
    When I try to use the old refresh_token again
    Then the response status should be 401
    And all my sessions should be invalidated
    And a security alert should be logged

  Scenario: Deactivated user cannot refresh
    Given I was logged in before being deactivated
    When I send a POST request to "/api/v1/auth/refresh"
    Then the response status should be 401
```

## API Contract

### Request
```
POST /api/v1/auth/refresh
Cookie: refresh_token=<token>
```

### Response 200 OK
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Set-Cookie Header:**
```
refresh_token=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

### Response 401 Unauthorized
```json
{
  "detail": "Invalid or expired refresh token"
}
```

**Clear Cookie Header (on error):**
```
refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
```

## Implementation Notes

### Backend Tasks
1. Implementeer `POST /api/v1/auth/refresh` endpoint
2. Extract refresh token from httpOnly cookie
3. Verify refresh token signature en expiry
4. Implementeer token rotation (nieuwe refresh token bij elke refresh)
5. Maintain token family tracking voor replay detection
6. Invalidate alle tokens bij replay attack

### Token Rotation Strategy
```python
# Refresh token bevat:
{
    "sub": str(user.id),
    "family_id": "uuid",  # Tracks token chain
    "token_id": "uuid",   # Unique per token
    "iat": datetime,
    "exp": datetime  # 7 days
}

# Database: RefreshTokenFamily
class RefreshTokenFamily(Base):
    id: UUID  # family_id
    user_id: UUID
    current_token_id: UUID
    created_at: datetime
    invalidated_at: datetime | None
```

### Replay Detection
```python
async def refresh_tokens(family_id: UUID, token_id: UUID):
    family = await get_token_family(family_id)
    
    if family.invalidated_at:
        raise HTTPException(401, "Token revoked")
    
    if family.current_token_id != token_id:
        # REPLAY ATTACK! Token was already used
        await invalidate_all_user_sessions(family.user_id)
        await log_security_event("refresh_token_replay", family.user_id)
        raise HTTPException(401, "Security violation detected")
    
    # Issue new tokens
    new_token_id = uuid4()
    await update_family_token(family_id, new_token_id)
    return generate_tokens(user, family_id, new_token_id)
```

### Security Considerations
- Token rotation bij elke refresh
- Replay detection invalideert ALLE sessies
- Log security events voor monitoring
- Clear cookies on logout/error

## Test Requirements

### Unit Tests
- [ ] Test token verification
- [ ] Test token rotation logic
- [ ] Test replay detection

### Integration Tests
- [ ] Test complete refresh flow
- [ ] Test expired token handling
- [ ] Test replay attack detection

### Security Tests
- [ ] Test token manipulation detection
- [ ] Verify session invalidation on replay

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Token rotation werkt
- [ ] Replay detection actief
- [ ] Security logging in place
- [ ] Tests passing
