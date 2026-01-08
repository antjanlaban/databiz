# IDENTITY_US007: Logout and Invalidate Session

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authentication |
| **Feature** | login_flow |
| **Slice** | logout |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een ingelogde gebruiker  
**Wil ik** kunnen uitloggen  
**Zodat** mijn sessie veilig wordt beëindigd  

## Acceptance Criteria

### AC1: Succesvolle logout
- **Given** een ingelogde gebruiker met geldige tokens
- **When** een POST request naar `/api/v1/auth/logout` wordt gestuurd
- **Then** wordt de refresh token geïnvalideerd
- **And** wordt de refresh_token cookie gewist
- **And** wordt een 200 OK response teruggegeven

### AC2: Access token blijft geldig tot expiry
- **Given** een uitgelogde gebruiker
- **When** de access token (nog niet verlopen) wordt gebruikt
- **Then** is de token nog geldig tot de expiry tijd (15 min)
- **Note** Dit is by design - access tokens zijn stateless

### AC3: Logout zonder token
- **Given** een request zonder refresh token
- **When** logout wordt aangeroepen
- **Then** wordt toch een 200 OK teruggegeven (idempotent)

### AC4: Logout all sessions
- **Given** een gebruiker met meerdere actieve sessies
- **When** een POST request naar `/api/v1/auth/logout-all` wordt gestuurd
- **Then** worden alle refresh token families geïnvalideerd
- **And** moet de gebruiker op alle apparaten opnieuw inloggen

## Gherkin Scenarios

```gherkin
Feature: Logout and Invalidate Session
  As a logged-in user
  I want to logout
  So that my session is securely terminated

  Scenario: Successful logout
    Given I am logged in with valid tokens
    When I send a POST request to "/api/v1/auth/logout"
    Then the response status should be 200
    And my refresh_token cookie should be cleared
    And my refresh_token should be invalidated in the database

  Scenario: Access token still works briefly after logout
    Given I have just logged out
    And my access_token has not expired yet
    When I make an authenticated request
    Then the request should succeed
    # This is expected - access tokens are stateless

  Scenario: Logout without token (already logged out)
    Given I don't have a refresh_token cookie
    When I send a POST request to "/api/v1/auth/logout"
    Then the response status should be 200
    # Idempotent - no error

  Scenario: Logout all sessions
    Given I am logged in on multiple devices
    When I send a POST request to "/api/v1/auth/logout-all"
    Then the response status should be 200
    And all my refresh token families should be invalidated
    And I should be logged out on all devices
```

## API Contract

### Logout Current Session

**Request:**
```
POST /api/v1/auth/logout
Cookie: refresh_token=<token>
```

**Response 200 OK:**
```json
{
  "message": "Successfully logged out"
}
```

**Clear Cookie Header:**
```
refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
```

### Logout All Sessions

**Request:**
```
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>
```

**Response 200 OK:**
```json
{
  "message": "Successfully logged out of all sessions",
  "sessions_invalidated": 3
}
```

## Implementation Notes

### Backend Tasks
1. Implementeer `POST /api/v1/auth/logout` endpoint
2. Implementeer `POST /api/v1/auth/logout-all` endpoint
3. Invalidate refresh token family in database
4. Clear refresh_token cookie
5. Return success even if no token (idempotent)

### Logout Logic
```python
@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(None)
):
    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            await invalidate_token_family(payload["family_id"])
        except JWTError:
            pass  # Invalid token, ignore
    
    # Always clear the cookie
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        httponly=True,
        secure=True,
        samesite="strict"
    )
    
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_user)
):
    count = await invalidate_all_user_sessions(current_user.id)
    return {
        "message": "Successfully logged out of all sessions",
        "sessions_invalidated": count
    }
```

### Database Operations
```python
async def invalidate_token_family(family_id: UUID):
    """Invalidate a single token family (current session)"""
    await db.execute(
        update(RefreshTokenFamily)
        .where(RefreshTokenFamily.id == family_id)
        .values(invalidated_at=datetime.utcnow())
    )

async def invalidate_all_user_sessions(user_id: UUID) -> int:
    """Invalidate all token families for a user (all sessions)"""
    result = await db.execute(
        update(RefreshTokenFamily)
        .where(
            RefreshTokenFamily.user_id == user_id,
            RefreshTokenFamily.invalidated_at.is_(None)
        )
        .values(invalidated_at=datetime.utcnow())
    )
    return result.rowcount
```

### Frontend Considerations
- Na logout: clear local storage tokens
- Redirect naar login pagina
- Handle 401 responses by redirecting to login

## Test Requirements

### Unit Tests
- [ ] Test token family invalidation
- [ ] Test cookie clearing
- [ ] Test idempotent behavior

### Integration Tests
- [ ] Test complete logout flow
- [ ] Test logout-all flow
- [ ] Test without cookie

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Cookie wordt correct gewist
- [ ] Logout-all werkt
- [ ] Tests passing
- [ ] Code review approved
