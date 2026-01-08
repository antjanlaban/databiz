# IDENTITY_US009: Assign Role to User

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authorization |
| **Feature** | rbac |
| **Slice** | assign_role |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een systeembeheerder  
**Wil ik** rollen kunnen toewijzen aan gebruikers  
**Zodat** ze de juiste rechten hebben in het systeem  

## Acceptance Criteria

### AC1: Succesvolle rol toewijzing
- **Given** een admin en een bestaande gebruiker
- **When** een PATCH request naar `/api/v1/users/{user_id}/role` met een geldige rol
- **Then** wordt de rol toegewezen aan de gebruiker
- **And** wordt een 200 OK response teruggegeven

### AC2: Beschikbare rollen
- **Given** het systeem
- **When** rollen worden toegewezen
- **Then** zijn alleen deze rollen geldig: `admin`, `manager`, `editor`, `viewer`

### AC3: Laatste admin bescherming
- **Given** er is slechts één admin in het systeem
- **When** geprobeerd wordt deze admin te degraderen
- **Then** wordt een 400 Bad Request teruggegeven
- **And** is de error "Cannot remove last admin"

### AC4: Rol wijziging audit
- **Given** een succesvolle rol wijziging
- **Then** wordt een audit log entry aangemaakt
- **And** bevat deze: actor, target_user, old_role, new_role, timestamp

### AC5: Non-admin geen toegang
- **Given** een niet-admin gebruiker
- **When** deze probeert een rol toe te wijzen
- **Then** wordt een 403 Forbidden response teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Assign Role to User
  As a system administrator
  I want to assign roles to users
  So that they have appropriate permissions

  Background:
    Given I am authenticated as an admin
    And a user "jan@roerdink.nl" exists with role "viewer"

  Scenario: Successfully assign a role
    When I send a PATCH request to "/api/v1/users/{jan_id}/role" with:
      | role | editor |
    Then the response status should be 200
    And the user should have role "editor"
    And an audit log entry should be created

  Scenario: Assign admin role
    When I send a PATCH request with role "admin"
    Then the response status should be 200
    And the user should have role "admin"

  Scenario: Invalid role rejected
    When I send a PATCH request with role "superuser"
    Then the response status should be 422
    And the response should list valid roles

  Scenario: Cannot remove last admin
    Given I am the only admin in the system
    When I try to change my role to "editor"
    Then the response status should be 400
    And the response message should be "Cannot remove last admin"

  Scenario: Regular user cannot assign roles
    Given I am authenticated as an editor
    When I try to assign a role to another user
    Then the response status should be 403

  Scenario: Audit log created
    When I change a user's role from "viewer" to "manager"
    Then an audit log entry should exist with:
      | actor_id     | <my_user_id>      |
      | target_id    | <jan_user_id>     |
      | action       | role_change       |
      | old_value    | viewer            |
      | new_value    | manager           |
```

## API Contract

### Request
```
PATCH /api/v1/users/{user_id}/role
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "role": "string (required: admin | manager | editor | viewer)"
}
```

### Response 200 OK
```json
{
  "id": "uuid",
  "email": "jan@roerdink.nl",
  "display_name": "Jan Jansen",
  "role": "editor",
  "updated_at": "2024-01-16T14:30:00Z"
}
```

### Response 400 Bad Request
```json
{
  "detail": "Cannot remove last admin"
}
```

### Response 403 Forbidden
```json
{
  "detail": "Admin privileges required"
}
```

### Response 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "role"],
      "msg": "Invalid role. Valid roles: admin, manager, editor, viewer",
      "type": "value_error"
    }
  ]
}
```

### Get Available Roles
```
GET /api/v1/roles
Authorization: Bearer <jwt_token>

Response 200 OK:
{
  "roles": [
    {"name": "admin", "description": "Full system access"},
    {"name": "manager", "description": "Manage products and imports"},
    {"name": "editor", "description": "Edit products and data"},
    {"name": "viewer", "description": "Read-only access"}
  ]
}
```

## Implementation Notes

### Backend Tasks
1. Create `Role` enum: admin, manager, editor, viewer
2. Add `role` column to users table (default: viewer)
3. Create `AssignRoleRequest` Pydantic schema
4. Implementeer `PATCH /api/v1/users/{user_id}/role` endpoint
5. Implementeer last-admin protection
6. Voeg audit logging toe
7. Implementeer `GET /api/v1/roles` endpoint

### Database Changes
```sql
-- Add role column
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer';

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    target_id UUID,
    target_type VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_id, target_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### Role Assignment Logic
```python
@router.patch("/{user_id}/role")
async def assign_role(
    user_id: UUID,
    request: AssignRoleRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    target_user = await get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(404, "User not found")
    
    # Last admin protection
    if target_user.role == Role.ADMIN and request.role != Role.ADMIN:
        admin_count = await count_admins(db)
        if admin_count <= 1:
            raise HTTPException(400, "Cannot remove last admin")
    
    old_role = target_user.role
    target_user.role = request.role
    target_user.updated_at = datetime.utcnow()
    
    # Audit log
    await create_audit_log(
        db,
        actor_id=current_user.id,
        target_id=target_user.id,
        target_type="user",
        action="role_change",
        old_value={"role": old_role},
        new_value={"role": request.role}
    )
    
    await db.commit()
    return target_user
```

## Test Requirements

### Unit Tests
- [ ] Test role enum validation
- [ ] Test last-admin protection logic
- [ ] Test audit log creation

### Integration Tests
- [ ] Test complete role assignment flow
- [ ] Test last-admin scenario
- [ ] Test admin-only guard

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Last-admin protection werkt
- [ ] Audit logging actief
- [ ] Tests passing
- [ ] Code review approved
