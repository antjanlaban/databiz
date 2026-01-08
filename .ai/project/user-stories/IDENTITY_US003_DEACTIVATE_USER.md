# IDENTITY_US003: Deactivate User

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | user_lifecycle |
| **Feature** | user_management |
| **Slice** | deactivate_user |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een systeembeheerder  
**Wil ik** gebruikers kunnen deactiveren  
**Zodat** ex-medewerkers geen toegang meer hebben tot het systeem  

## Acceptance Criteria

### AC1: Succesvolle deactivatie
- **Given** een geldige JWT met admin rechten en een actieve gebruiker
- **When** een DELETE request naar `/api/v1/users/{user_id}` wordt gestuurd
- **Then** wordt de gebruiker status op `deactivated` gezet
- **And** worden alle actieve sessies van die gebruiker beëindigd
- **And** wordt een 200 OK response teruggegeven

### AC2: Soft delete (geen data verlies)
- **Given** een gedeactiveerde gebruiker
- **When** de database wordt gequeried
- **Then** bestaat de gebruiker nog steeds (soft delete)
- **And** kan de gebruiker niet meer inloggen

### AC3: Zelf-deactivatie preventie
- **Given** een admin die zijn eigen account probeert te deactiveren
- **When** de request wordt verwerkt
- **Then** wordt een 400 Bad Request teruggegeven
- **And** is de error message "Cannot deactivate your own account"

### AC4: Non-admin preventie
- **Given** een reguliere gebruiker
- **When** deze probeert een gebruiker te deactiveren
- **Then** wordt een 403 Forbidden response teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Deactivate User
  As a system administrator
  I want to deactivate users
  So that former employees cannot access the system

  Background:
    Given I am authenticated as an admin user
    And a user "jan@roerdink.nl" exists with status "active"

  Scenario: Successfully deactivate a user
    When I send a DELETE request to "/api/v1/users/{jan_user_id}"
    Then the response status should be 200
    And the user status should be "deactivated"
    And all sessions for that user should be invalidated

  Scenario: Deactivated user cannot login
    Given user "jan@roerdink.nl" has been deactivated
    When that user tries to login
    Then the login should fail with status 401
    And the error should be generic (not reveal deactivation)

  Scenario: Admin cannot deactivate self
    When I send a DELETE request to my own user endpoint
    Then the response status should be 400
    And the response message should be "Cannot deactivate your own account"

  Scenario: Regular user cannot deactivate others
    Given I am authenticated as a regular user
    When I send a DELETE request to "/api/v1/users/{other_id}"
    Then the response status should be 403
```

## API Contract

### Request
```
DELETE /api/v1/users/{user_id}
Authorization: Bearer <jwt_token>
```

### Response 200 OK
```json
{
  "id": "uuid",
  "email": "jan@roerdink.nl",
  "display_name": "Jan Jansen",
  "status": "deactivated",
  "deactivated_at": "2024-01-16T14:22:00Z"
}
```

### Response 400 Bad Request
```json
{
  "detail": "Cannot deactivate your own account"
}
```

### Response 403 Forbidden
```json
{
  "detail": "Admin privileges required"
}
```

### Response 404 Not Found
```json
{
  "detail": "User not found"
}
```

## Implementation Notes

### Backend Tasks
1. Add `deactivated_at` column to users table
2. Implementeer soft delete logica (status = 'deactivated')
3. Voeg sessie invalidatie toe (clear tokens in blacklist)
4. Implementeer self-deactivation guard
5. Update login endpoint om deactivated users te blokkeren

### Database Changes
```sql
ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP WITH TIME ZONE;

-- Login query moet checken: status != 'deactivated'
```

### Session Invalidation
- Token blacklist in Redis/memory cache
- Of: voeg `token_valid_after` timestamp toe aan user

## Test Requirements

### Unit Tests
- [ ] Test soft delete logica
- [ ] Test self-deactivation prevention
- [ ] Test session invalidation

### Integration Tests
- [ ] Test complete deactivation flow
- [ ] Test login prevention after deactivation
- [ ] Test admin-only guard

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Soft delete werkt correct
- [ ] Sessies worden geïnvalideerd
- [ ] Tests passing
- [ ] Code review approved
