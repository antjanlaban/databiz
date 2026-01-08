# IDENTITY_US010: Check User Role/Permission

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authorization |
| **Feature** | rbac |
| **Slice** | check_role |
| **Priority** | Critical |
| **Status** | Ready for Development |

## User Story

**Als** het systeem  
**Wil ik** kunnen controleren of een gebruiker de juiste rol heeft  
**Zodat** ongeautoriseerde toegang wordt voorkomen  

## Acceptance Criteria

### AC1: Role-based endpoint protection
- **Given** een endpoint dat admin rol vereist
- **When** een gebruiker met viewer rol toegang probeert te krijgen
- **Then** wordt een 403 Forbidden response teruggegeven

### AC2: Hiërarchische rol check
- **Given** de rol hiërarchie: admin > manager > editor > viewer
- **When** een endpoint "editor of hoger" vereist
- **Then** hebben admin, manager en editor toegang
- **And** heeft viewer geen toegang

### AC3: JWT role claim
- **Given** een geldige JWT
- **When** de token wordt geverifieerd
- **Then** bevat deze de rol van de gebruiker
- **And** wordt deze rol gebruikt voor autorisatie checks

### AC4: Gestolen token scenario
- **Given** een gebruiker wiens rol is gewijzigd na token uitgifte
- **When** deze de oude token gebruikt
- **Then** wordt de rol in de token gebruikt (geen database lookup per request)
- **Note** Token refresh haalt nieuwe rol op

### AC5: Get current user permissions
- **Given** een ingelogde gebruiker
- **When** een GET request naar `/api/v1/auth/me` wordt gestuurd
- **Then** worden de gebruikersgegevens inclusief rol teruggegeven

## Gherkin Scenarios

```gherkin
Feature: Check User Role/Permission
  As the system
  I want to verify user roles
  So that unauthorized access is prevented

  Scenario Outline: Role-based access control
    Given I am authenticated with role "<role>"
    When I access an endpoint requiring "<required_role>" or higher
    Then the response status should be <status>

    Examples:
      | role    | required_role | status |
      | admin   | admin         | 200    |
      | admin   | editor        | 200    |
      | manager | editor        | 200    |
      | editor  | editor        | 200    |
      | viewer  | editor        | 403    |
      | viewer  | admin         | 403    |

  Scenario: Get current user info
    Given I am authenticated as "jan@roerdink.nl" with role "editor"
    When I send a GET request to "/api/v1/auth/me"
    Then the response status should be 200
    And the response should contain:
      | email | jan@roerdink.nl |
      | role  | editor          |

  Scenario: Role from JWT is used
    Given I was assigned role "editor" when I logged in
    And my role was changed to "admin" in the database
    When I make a request with my current token
    Then I should still have "editor" permissions
    # Token refresh will update the role

  Scenario: Expired token rejected
    Given my access token has expired
    When I try to access a protected endpoint
    Then the response status should be 401
```

## API Contract

### Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <jwt_token>
```

**Response 200 OK:**
```json
{
  "id": "uuid",
  "email": "jan@roerdink.nl",
  "display_name": "Jan Jansen",
  "role": "editor",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Protected Endpoint Response (Forbidden)
```json
{
  "detail": "Insufficient permissions. Required: admin"
}
```

### Role Hierarchy Reference
| Role | Level | Permissions |
|------|-------|-------------|
| admin | 4 | Full access, user management, system settings |
| manager | 3 | Product management, imports, team oversight |
| editor | 2 | Edit products, run imports, view reports |
| viewer | 1 | Read-only access to products and reports |

## Implementation Notes

### Backend Tasks
1. Implementeer `get_current_user` dependency
2. Implementeer `require_role(minimum_role)` dependency factory
3. Create role hierarchy utilities
4. Implementeer `GET /api/v1/auth/me` endpoint
5. Voeg role guards toe aan bestaande endpoints

### FastAPI Dependencies
```python
from enum import IntEnum
from fastapi import Depends, HTTPException
from jose import JWTError, jwt

class Role(IntEnum):
    VIEWER = 1
    EDITOR = 2
    MANAGER = 3
    ADMIN = 4

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract and validate user from JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except JWTError:
        raise HTTPException(401, "Invalid token")
    
    # Optionally validate user still exists and is active
    user = await get_user_by_id(db, user_id)
    if not user or user.status != "active":
        raise HTTPException(401, "User not found or inactive")
    
    # Attach role from token (not database) for performance
    user.token_role = Role[payload.get("role", "VIEWER").upper()]
    return user


def require_role(minimum_role: Role):
    """Factory for role-based access control"""
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.token_role < minimum_role:
            raise HTTPException(
                403, 
                f"Insufficient permissions. Required: {minimum_role.name.lower()}"
            )
        return current_user
    return role_checker

# Convenience dependencies
require_admin = require_role(Role.ADMIN)
require_manager = require_role(Role.MANAGER)
require_editor = require_role(Role.EDITOR)
```

### Usage in Endpoints
```python
@router.get("/users")
async def list_users(
    current_user: User = Depends(require_admin)
):
    """Admin only endpoint"""
    pass

@router.post("/products")
async def create_product(
    current_user: User = Depends(require_editor)
):
    """Editor or higher"""
    pass

@router.get("/products")
async def list_products(
    current_user: User = Depends(get_current_user)
):
    """Any authenticated user"""
    pass
```

### /me Endpoint
```python
@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Get current user info from token"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        status=current_user.status,
        created_at=current_user.created_at
    )
```

## Test Requirements

### Unit Tests
- [ ] Test role hierarchy comparison
- [ ] Test JWT decoding
- [ ] Test role extraction from token

### Integration Tests
- [ ] Test admin-only endpoints
- [ ] Test editor endpoints with various roles
- [ ] Test /me endpoint

### Security Tests
- [ ] Test expired token rejection
- [ ] Test malformed token rejection
- [ ] Test missing token rejection

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Role guards werken correct
- [ ] /me endpoint beschikbaar
- [ ] Tests passing
- [ ] Code review approved
