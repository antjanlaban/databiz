# IDENTITY_US008: Change Password

## Meta
| Field | Value |
|-------|-------|
| **Domain** | Identity |
| **Epic** | authentication |
| **Feature** | password_management |
| **Slice** | change_password |
| **Priority** | High |
| **Status** | Ready for Development |

## User Story

**Als** een ingelogde gebruiker  
**Wil ik** mijn wachtwoord kunnen wijzigen  
**Zodat** ik mijn account veilig kan houden  

## Acceptance Criteria

### AC1: Succesvolle wachtwoord wijziging
- **Given** een ingelogde gebruiker met huidig wachtwoord "OldPass123!"
- **When** een POST request met huidig en nieuw wachtwoord wordt gestuurd
- **Then** wordt het wachtwoord bijgewerkt
- **And** worden alle andere sessies geïnvalideerd
- **And** wordt een bevestigingsmail gestuurd (indien email service actief)

### AC2: Huidig wachtwoord verificatie
- **Given** een wachtwoord wijziging request
- **When** het huidige wachtwoord onjuist is
- **Then** wordt een 400 Bad Request teruggegeven
- **And** is de error "Current password is incorrect"

### AC3: Nieuw wachtwoord validatie
- **Given** een wachtwoord wijziging request
- **When** het nieuwe wachtwoord te zwak is
- **Then** wordt een 422 Validation Error teruggegeven
- **And** worden de wachtwoordeisen uitgelegd

### AC4: Nieuw wachtwoord != huidig
- **Given** een wachtwoord wijziging request
- **When** het nieuwe wachtwoord gelijk is aan het huidige
- **Then** wordt een 400 Bad Request teruggegeven
- **And** is de error "New password must be different"

### AC5: Sessie invalidatie na wijziging
- **Given** een succesvolle wachtwoord wijziging
- **When** andere apparaten proberen de oude tokens te gebruiken
- **Then** worden die sessies afgewezen (refresh tokens invalid)

## Gherkin Scenarios

```gherkin
Feature: Change Password
  As a logged-in user
  I want to change my password
  So that I can keep my account secure

  Scenario: Successfully change password
    Given I am logged in
    When I send a POST request to "/api/v1/auth/change-password" with:
      | current_password | OldPass123!    |
      | new_password     | NewSecure456!  |
    Then the response status should be 200
    And my password should be updated
    And all my other sessions should be invalidated

  Scenario: Incorrect current password
    Given I am logged in
    When I send a POST request with wrong current_password
    Then the response status should be 400
    And the response message should be "Current password is incorrect"

  Scenario: Weak new password
    Given I am logged in
    When I send a POST request with new_password "weak"
    Then the response status should be 422
    And the response should explain password requirements

  Scenario: Same password as before
    Given I am logged in with password "SamePass123!"
    When I try to change to the same password "SamePass123!"
    Then the response status should be 400
    And the response message should be "New password must be different"

  Scenario: Other sessions invalidated
    Given I am logged in on multiple devices
    When I change my password on device A
    Then device B should fail on next token refresh
```

## API Contract

### Request
```
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "current_password": "string (required)",
  "new_password": "string (required, min 8 chars, 1 uppercase, 1 number)"
}
```

### Response 200 OK
```json
{
  "message": "Password successfully changed"
}
```

### Response 400 Bad Request (wrong current password)
```json
{
  "detail": "Current password is incorrect"
}
```

### Response 400 Bad Request (same password)
```json
{
  "detail": "New password must be different from current password"
}
```

### Response 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "new_password"],
      "msg": "Password must be at least 8 characters with 1 uppercase and 1 number",
      "type": "value_error"
    }
  ]
}
```

## Implementation Notes

### Backend Tasks
1. Create `ChangePasswordRequest` Pydantic schema
2. Implementeer `POST /api/v1/auth/change-password` endpoint
3. Verify current password met bcrypt
4. Validate new password requirements
5. Update password_hash in database
6. Invalidate alle refresh token families (behalve huidige)
7. Optioneel: send confirmation email

### Change Password Logic
```python
@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(None)
):
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    
    # Check new != current
    if verify_password(request.new_password, current_user.password_hash):
        raise HTTPException(400, "New password must be different from current password")
    
    # Update password
    current_user.password_hash = hash_password(request.new_password)
    current_user.updated_at = datetime.utcnow()
    
    # Invalidate other sessions (keep current)
    current_family_id = None
    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            current_family_id = payload.get("family_id")
        except JWTError:
            pass
    
    await invalidate_other_sessions(current_user.id, exclude_family=current_family_id)
    
    await db.commit()
    
    # Optional: send confirmation email
    # await send_password_changed_email(current_user.email)
    
    return {"message": "Password successfully changed"}
```

### Password Requirements
```python
class PasswordValidator:
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_NUMBER = True
    
    @classmethod
    def validate(cls, password: str) -> bool:
        if len(password) < cls.MIN_LENGTH:
            return False
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            return False
        if cls.REQUIRE_NUMBER and not any(c.isdigit() for c in password):
            return False
        return True
```

## Test Requirements

### Unit Tests
- [ ] Test password verification
- [ ] Test password validation rules
- [ ] Test same-password check

### Integration Tests
- [ ] Test complete change flow
- [ ] Test session invalidation
- [ ] Test error cases

## Definition of Done
- [ ] Alle acceptance criteria geïmplementeerd
- [ ] Wachtwoord wordt veilig gehasht
- [ ] Andere sessies geïnvalideerd
- [ ] Tests passing
- [ ] Code review approved
