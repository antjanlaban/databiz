# IDENTITY_US005: Login with Email/Password

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authentication |
| **Feature** | login_flow |
| **Slice** | submit_credentials |
| **Priority** | Critical |
| **Status** | Ready for Development |

## User Story

**Als** een geregistreerde gebruiker  
**Wil ik** kunnen inloggen met mijn email en wachtwoord  
**Zodat** ik toegang krijg tot het PIM-systeem  

## Acceptance Criteria

### AC1: Succesvolle login
- **Given** een actieve gebruiker met email "jan@roerdink.nl" en wachtwoord "SecurePass123!"
- **When** correcte credentials worden ingediend via POST `/api/v1/auth/login`
- **Then** wordt een JWT access token teruggegeven
- **And** wordt een refresh token teruggegeven (httpOnly cookie)
- **And** wordt de last_login timestamp bijgewerkt

### AC2: Onjuiste credentials
- **Given** een login poging met verkeerd wachtwoord
- **When** de request wordt verwerkt
- **Then** wordt een 401 Unauthorized response teruggegeven
- **And** is de error message generiek ("Invalid credentials")
- **And** wordt geen onderscheid gemaakt tussen verkeerde email of wachtwoord

### AC3: Gedeactiveerde gebruiker
- **Given** een gedeactiveerde gebruiker probeert in te loggen
- **When** correcte credentials worden ingediend
- **Then** wordt een 401 Unauthorized response teruggegeven
- **And** is de error message generiek (geen reveal van deactivatie)

### AC4: Rate limiting op login
- **Given** meer dan 5 mislukte login pogingen binnen 5 minuten voor hetzelfde account
- **When** een nieuwe login poging wordt gedaan
- **Then** wordt een 429 Too Many Requests teruggegeven
- **And** wordt aangegeven wanneer opnieuw geprobeerd kan worden

### AC5: JWT token inhoud
- **Given** een succesvolle login
- **When** de access token wordt gedecoded
- **Then** bevat deze: sub (user_id), email, role, exp (15 min), iat

## Gherkin Scenarios

```gherkin
Feature: Login with Email and Password
  As a registered user
  I want to login with my credentials
  So that I can access the PIM system

  Scenario: Successful login
    Given a user "jan@roerdink.nl" with password "SecurePass123!" exists
    And the user status is "active"
    When I send a POST request to "/api/v1/auth/login" with:
      | email    | jan@roerdink.nl  |
      | password | SecurePass123!   |
    Then the response status should be 200
    And the response should contain "access_token"
    And the response should contain "token_type" with value "bearer"
    And a refresh_token cookie should be set with httpOnly flag
    And the user's last_login should be updated

  Scenario: Invalid password
    Given a user "jan@roerdink.nl" exists
    When I send a POST request with wrong password
    Then the response status should be 401
    And the response message should be "Invalid credentials"

  Scenario: Non-existent email
    When I send a POST request with email "unknown@example.com"
    Then the response status should be 401
    And the response message should be "Invalid credentials"
    
  Scenario: Deactivated user login attempt
    Given a user "jan@roerdink.nl" has status "deactivated"
    When I send a POST request with correct credentials
    Then the response status should be 401
    And the response message should be "Invalid credentials"

  Scenario: Account lockout after failed attempts
    Given I have failed login 5 times for "jan@roerdink.nl"
    When I send another login attempt
    Then the response status should be 429
    And the response should contain "Retry-After" header

  Scenario: Validate JWT token structure
    Given I have successfully logged in
    When I decode the access_token
    Then it should contain claim "sub" with user_id
    And it should contain claim "email"
    And it should contain claim "role"
    And it should expire in 15 minutes
```

## API Contract

### Request
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "string (required, email format)",
  "password": "string (required)"
}
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
refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

### Response 401 Unauthorized
```json
{
  "detail": "Invalid credentials"
}
```

### Response 429 Too Many Requests
```json
{
  "detail": "Too many login attempts. Please try again later.",
  "retry_after": 300
}
```

## Implementation Notes

### Backend Tasks
1. Create `LoginRequest` Pydantic schema
2. Create `TokenResponse` Pydantic schema
3. Implementeer `POST /api/v1/auth/login` endpoint
4. Integreer bcrypt password verification
5. Implementeer JWT token generation (python-jose)
6. Voeg refresh token als httpOnly cookie toe
7. Implementeer login rate limiting per account
8. Update last_login timestamp

### JWT Configuration
```python
JWT_SECRET = settings.jwt_secret  # From environment
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Token payload
{
    "sub": str(user.id),
    "email": user.email,
    "role": user.role,
    "iat": datetime.utcnow(),
    "exp": datetime.utcnow() + timedelta(minutes=15)
}
```

### Security Considerations
- Constant-time password comparison (bcrypt handles this)
- Generieke error messages (geen email enumeration)
- Rate limiting per IP én per account
- Refresh token in httpOnly cookie (XSS protection)
- Secure flag voor cookies in productie

### Rate Limiting Strategy
```python
# Per account: 5 attempts per 5 minutes
# Per IP: 20 attempts per minute (higher to allow multiple users)
# After lockout: exponential backoff
```

## Test Requirements

### Unit Tests
- [ ] Test password verification
- [ ] Test JWT token generation
- [ ] Test token payload structure
- [ ] Test rate limiting logic

### Integration Tests
- [ ] Test successful login flow
- [ ] Test invalid credentials
- [ ] Test deactivated user rejection
- [ ] Test cookie settings

### Security Tests
- [ ] Test timing attacks resistance
- [ ] Test rate limiting effectiveness
- [ ] Verify no email enumeration

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] JWT tokens correct gegenereerd
- [ ] Rate limiting werkt
- [ ] Security tests passing
- [ ] Code review approved
