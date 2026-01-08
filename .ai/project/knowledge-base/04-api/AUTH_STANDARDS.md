# Authentication Standards (Vendor Agnostic)

This document defines the authentication protocol for the DataBiz platform.
The architecture is designed to be **Identity Provider (IDP) Agnostic**.
Currently, we use Supabase Auth, but the backend logic MUST rely on standard JWT validation, not vendor-specific SDK magic.

## 1. The Protocol: Stateless JWT

- **Mechanism**: Bearer Token Authentication.
- **Header**: `Authorization: Bearer <token>`
- **Format**: JSON Web Token (JWT) signed with HS256 (Symmetric) or RS256 (Asymmetric).

## 2. Token Validation (Backend Responsibility)

Every backend service (Node.js V1 or Python V2) must independently validate incoming requests.

### Validation Steps

1.  **Signature Check**: Verify the token signature using the shared `JWT_SECRET` (or Public Key).
2.  **Expiration Check**: Ensure `exp` claim is in the future.
3.  **Issuer Check**: Ensure `iss` matches the expected Identity Provider.

### Required Claims

The backend expects the following standard claims in the JWT:

- `sub` (Subject): The unique User ID (UUID).
- `role` (Role): The user's permission level (e.g., `authenticated`, `admin`).
- `exp` (Expiration): Unix timestamp.

## 3. User Context (Dependency Injection)

In the code (Python/Node), the validated token must be transformed into a generic `User` object.

**Python (FastAPI) Example:**

```python
# GOOD: Generic User dependency
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_jwt(token) # Generic library (PyJWT)
    return User(id=payload.get("sub"), role=payload.get("role"))

# BAD: Vendor lock-in
async def get_current_user():
    return supabase.auth.get_user() # ❌ Avoid direct vendor SDK calls in business logic
```

## 4. Service-to-Service Auth

If the Node.js backend calls the Python backend (or vice versa):

- Do **NOT** share database connections directly for auth.
- Pass the original User JWT downstream (Forwarding).
- OR use a dedicated `SERVICE_ROLE_KEY` for internal system calls (Machine-to-Machine).
