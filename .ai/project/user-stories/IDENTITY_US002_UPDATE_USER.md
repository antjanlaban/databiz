# IDENTITY_US002: Update User Profile

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | user_lifecycle |
| **Feature** | user_management |
| **Slice** | update_user |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een ingelogde gebruiker  
**Wil ik** mijn profielgegevens kunnen bijwerken  
**Zodat** mijn informatie actueel blijft in het systeem  

## Acceptance Criteria

### AC1: Update eigen profiel
- **Given** een geldige JWT voor user "jan@example.com"
- **When** een PATCH request naar `/api/v1/users/me` wordt gestuurd met nieuwe display_name
- **Then** wordt het profiel bijgewerkt
- **And** wordt een 200 OK response teruggegeven met updated user object

### AC2: Admin update andere gebruiker
- **Given** een geldige JWT met admin rechten
- **When** een PATCH request naar `/api/v1/users/{user_id}` wordt gestuurd
- **Then** wordt het profiel van die gebruiker bijgewerkt
- **And** worden audit logs geschreven

### AC3: Email wijziging niet toegestaan
- **Given** een update request met nieuw email adres
- **When** de request wordt verwerkt
- **Then** wordt het email veld genegeerd (geen wijziging)

### AC4: Unauthorized update preventie
- **Given** een reguliere gebruiker (niet admin)
- **When** deze probeert een ander profiel te wijzigen via `/api/v1/users/{other_id}`
- **Then** wordt een 403 Forbidden response teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Update User Profile
  As a logged-in user
  I want to update my profile information
  So that my data stays current

  Scenario: User updates own display name
    Given I am authenticated as "jan@roerdink.nl"
    When I send a PATCH request to "/api/v1/users/me" with:
      | display_name | Jan de Groot |
    Then the response status should be 200
    And the response should contain:
      | display_name | Jan de Groot |
    And updated_at should be updated

  Scenario: Admin updates another user's profile
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/users/{user_id}" with:
      | display_name | Nieuwe Naam |
      | status       | active      |
    Then the response status should be 200
    And an audit log entry should be created

  Scenario: Email change is ignored
    Given I am authenticated as "jan@roerdink.nl"
    When I send a PATCH request with email "new@email.com"
    Then the response status should be 200
    And my email should still be "jan@roerdink.nl"

  Scenario: Regular user cannot update others
    Given I am authenticated as a regular user
    When I send a PATCH request to another user's profile
    Then the response status should be 403
```

## API Contract

### Request - Own Profile
```
PATCH /api/v1/users/me
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "display_name": "string (optional, 2-100 chars)"
}
```

### Request - Other User (Admin Only)
```
PATCH /api/v1/users/{user_id}
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "display_name": "string (optional)",
  "status": "string (optional: active, suspended, pending_activation)"
}
```

### Response 200 OK
```json
{
  "id": "uuid",
  "email": "jan@roerdink.nl",
  "display_name": "Jan de Groot",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:22:00Z"
}
```

### Response 403 Forbidden
```json
{
  "detail": "Not authorized to update this resource"
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
1. Create `UserUpdate` Pydantic schema (display_name optional)
2. Create `AdminUserUpdate` Pydantic schema (includes status)
3. Implementeer `PATCH /api/v1/users/me` endpoint
4. Implementeer `PATCH /api/v1/users/{user_id}` endpoint met admin guard
5. Voeg audit logging toe voor admin updates

### Security Considerations
- Email is immutable via deze endpoint
- Wachtwoord wijziging via aparte endpoint (US006)
- Alleen admin kan status wijzigen
- Audit trail voor alle admin acties

## Test Requirements

### Unit Tests
- [ ] Test display_name validatie
- [ ] Test email immutability
- [ ] Test authorization logic

### Integration Tests
- [ ] Test self-update flow
- [ ] Test admin update flow
- [ ] Test forbidden access

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Code review approved
