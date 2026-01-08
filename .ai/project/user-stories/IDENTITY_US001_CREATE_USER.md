# IDENTITY_US001: Create User Account

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | user_lifecycle |
| **Feature** | user_management |
| **Slice** | create_user |
| **Priority** | Critical |
| **Status** | Ready for Development |

## User Story

**Als** een systeembeheerder  
**Wil ik** nieuwe gebruikers kunnen aanmaken via de API  
**Zodat** medewerkers toegang krijgen tot het PIM-systeem  

## Acceptance Criteria

### AC1: Succesvolle gebruiker aanmaak
- **Given** een geldige JWT met admin rechten
- **When** een POST request naar `/api/v1/users` wordt gestuurd met email, display_name, en password
- **Then** wordt een nieuwe gebruiker aangemaakt met status `pending_activation`
- **And** wordt het wachtwoord gehasht met bcrypt (cost factor 12)
- **And** wordt een 201 Created response teruggegeven met user object (zonder password)

### AC2: Duplicate email preventie
- **Given** een gebruiker met email "jan@example.com" bestaat al
- **When** een nieuw account met dezelfde email wordt aangemaakt
- **Then** wordt een 409 Conflict response teruggegeven
- **And** is de error message generiek (geen email leakage)

### AC3: Wachtwoord validatie
- **Given** een create user request
- **When** het wachtwoord minder dan 8 karakters heeft
- **Then** wordt een 422 Validation Error teruggegeven
- **And** bevat de error details over password requirements

### AC4: Rate limiting
- **Given** meer dan 5 create requests binnen 1 minuut van hetzelfde IP
- **When** een nieuwe request binnenkomt
- **Then** wordt een 429 Too Many Requests teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Create User Account
  As a system administrator
  I want to create new user accounts
  So that employees can access the PIM system

  Background:
    Given I am authenticated as an admin user
    And the API is available at "/api/v1/users"

  Scenario: Successfully create a new user
    When I send a POST request with:
      | email        | jan@roerdink.nl   |
      | display_name | Jan Jansen        |
      | password     | SecurePass123!    |
    Then the response status should be 201
    And the response should contain:
      | id           | <uuid>            |
      | email        | jan@roerdink.nl   |
      | display_name | Jan Jansen        |
      | status       | pending_activation|
    And the response should not contain "password"

  Scenario: Reject duplicate email
    Given a user with email "jan@roerdink.nl" already exists
    When I send a POST request with email "jan@roerdink.nl"
    Then the response status should be 409
    And the response message should not reveal email existence

  Scenario: Reject weak password
    When I send a POST request with password "weak"
    Then the response status should be 422
    And the response should contain validation errors for "password"

  Scenario: Rate limit exceeded
    Given I have made 5 requests in the last minute
    When I send another POST request
    Then the response status should be 429
    And the response should contain "Retry-After" header
```

## API Contract

### Request
```
POST /api/v1/users
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "string (required, email format)",
  "display_name": "string (required, 2-100 chars)",
  "password": "string (required, min 8 chars, 1 uppercase, 1 number)"
}
```

### Response 201 Created
```json
{
  "id": "uuid",
  "email": "jan@roerdink.nl",
  "display_name": "Jan Jansen",
  "status": "pending_activation",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Response 409 Conflict
```json
{
  "detail": "Unable to create account. Please contact support if this persists."
}
```

### Response 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must be at least 8 characters with 1 uppercase and 1 number",
      "type": "value_error"
    }
  ]
}
```

## Implementation Notes

### Backend Tasks
1. Create `User` SQLAlchemy model met velden: id, email, password_hash, display_name, status, created_at, updated_at
2. Implementeer `UserCreate` Pydantic schema met validatie
3. Maak `POST /api/v1/users` endpoint met admin-only guard
4. Integreer bcrypt password hashing (passlib)
5. Voeg slowapi rate limiter toe

### Database Schema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_activation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### Dependencies
- `passlib[bcrypt]` voor password hashing
- `slowapi` voor rate limiting
- `pydantic[email]` voor email validatie

## Test Requirements

### Unit Tests
- [ ] Test password hashing met bcrypt
- [ ] Test email validatie
- [ ] Test duplicate email detection
- [ ] Test user status defaults

### Integration Tests
- [ ] Test complete create flow
- [ ] Test rate limiting behavior
- [ ] Test admin authorization guard

### E2E Tests (Playwright)
- [ ] N/A - API only slice

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] API documentatie bijgewerkt
- [ ] Code review approved
- [ ] Geen linting errors
