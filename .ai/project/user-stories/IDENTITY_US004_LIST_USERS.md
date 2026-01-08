# IDENTITY_US004: List Users

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | user_lifecycle |
| **Feature** | user_management |
| **Slice** | list_users |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een systeembeheerder  
**Wil ik** een overzicht zien van alle gebruikers  
**Zodat** ik het gebruikersbestand kan beheren  

## Acceptance Criteria

### AC1: Gepagineerde gebruikerslijst
- **Given** een geldige JWT met admin rechten
- **When** een GET request naar `/api/v1/users` wordt gestuurd
- **Then** wordt een gepagineerde lijst van gebruikers teruggegeven
- **And** bevat elke gebruiker: id, email, display_name, status, created_at

### AC2: Paginatie parameters
- **Given** 50 gebruikers in het systeem
- **When** een request met `?page=2&page_size=10` wordt gestuurd
- **Then** worden gebruikers 11-20 teruggegeven
- **And** bevat de response pagination metadata

### AC3: Zoeken op email
- **Given** gebruikers met emails "jan@roerdink.nl" en "piet@roerdink.nl"
- **When** een request met `?search=jan` wordt gestuurd
- **Then** wordt alleen "jan@roerdink.nl" teruggegeven

### AC4: Filteren op status
- **Given** actieve en gedeactiveerde gebruikers
- **When** een request met `?status=active` wordt gestuurd
- **Then** worden alleen actieve gebruikers teruggegeven

### AC5: Non-admin geen toegang
- **Given** een reguliere gebruiker
- **When** deze de gebruikerslijst probeert op te vragen
- **Then** wordt een 403 Forbidden response teruggegeven

## Gherkin Scenarios

```gherkin
Feature: List Users
  As a system administrator
  I want to see an overview of all users
  So that I can manage the user base

  Background:
    Given I am authenticated as an admin user
    And the system has 25 users

  Scenario: Get paginated user list
    When I send a GET request to "/api/v1/users"
    Then the response status should be 200
    And the response should contain 20 users (default page size)
    And the response should include pagination metadata

  Scenario: Navigate to second page
    When I send a GET request to "/api/v1/users?page=2&page_size=10"
    Then the response status should be 200
    And the response should contain 10 users
    And the page should be 2

  Scenario: Search users by email
    Given a user "jan@roerdink.nl" exists
    When I send a GET request to "/api/v1/users?search=jan"
    Then the response should contain the user "jan@roerdink.nl"
    And the response should not contain unmatched users

  Scenario: Filter by status
    Given there are 5 deactivated users
    When I send a GET request to "/api/v1/users?status=deactivated"
    Then the response should contain only deactivated users
    And the total should be 5

  Scenario: Regular user cannot list users
    Given I am authenticated as a regular user
    When I send a GET request to "/api/v1/users"
    Then the response status should be 403
```

## API Contract

### Request
```
GET /api/v1/users?page=1&page_size=20&search=&status=
Authorization: Bearer <jwt_token>

Query Parameters:
- page: integer (default: 1, min: 1)
- page_size: integer (default: 20, max: 100)
- search: string (optional, searches email and display_name)
- status: string (optional: active, suspended, deactivated, pending_activation)
```

### Response 200 OK
```json
{
  "items": [
    {
      "id": "uuid",
      "email": "jan@roerdink.nl",
      "display_name": "Jan Jansen",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

### Response 403 Forbidden
```json
{
  "detail": "Admin privileges required"
}
```

## Implementation Notes

### Backend Tasks
1. Create `UserListResponse` Pydantic schema met pagination
2. Create `PaginationParams` dependency voor query params
3. Implementeer `GET /api/v1/users` endpoint met admin guard
4. Voeg ILIKE search toe op email en display_name
5. Voeg status filter toe
6. Optimaliseer queries met proper indexing

### Database Queries
```python
# Base query
query = select(User)

# Search filter
if search:
    query = query.where(
        or_(
            User.email.ilike(f"%{search}%"),
            User.display_name.ilike(f"%{search}%")
        )
    )

# Status filter
if status:
    query = query.where(User.status == status)

# Pagination
query = query.offset((page - 1) * page_size).limit(page_size)
```

### Performance Considerations
- Voeg GIN index toe voor full-text search bij grote datasets
- Consider caching voor veelgebruikte queries
- Limit page_size tot max 100

## Test Requirements

### Unit Tests
- [ ] Test pagination logic
- [ ] Test search filtering
- [ ] Test status filtering
- [ ] Test combined filters

### Integration Tests
- [ ] Test complete list flow
- [ ] Test admin-only guard
- [ ] Test empty results

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Pagination correct
- [ ] Search en filters werken
- [ ] Tests passing
- [ ] Code review approved
