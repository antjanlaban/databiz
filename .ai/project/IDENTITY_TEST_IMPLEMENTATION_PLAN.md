# Priority #3: Identity Test Suite - Implementation Plan

**Status:** PLANNED  
**Created:** 2025-12-20  
**Owner:** [AI-QA]  
**Target Coverage:** 65-80 tests  
**Current Coverage:** 1 smoke test only  

---

## Critical Risks

### 1. **Broken Authentication** - CATASTROPHIC - 18 tests needed
**Impact:** Complete system compromise, unauthorized access to all data  
**Attack Vectors:** Credential stuffing, password spray, token theft, session hijacking  
**Tests:** Valid/invalid credentials, inactive users, timing attacks, SQL injection, rate limiting, token validation, logout flows

### 2. **Token Leakage & Session Hijacking** - SEVERE - 15 tests needed
**Impact:** Account takeover, persistent unauthorized access  
**Attack Vectors:** XSS token theft, refresh token replay, expired token acceptance, token not revoked on logout  
**Tests:** Token creation, expiration, revocation, concurrent sessions, remember-me flows, logout-all scenarios

### 3. **Password Reset Abuse** - HIGH - 12 tests needed
**Impact:** Account takeover via email, DoS via reset spam  
**Attack Vectors:** Token prediction, expired token reuse, token enumeration, missing rate limits  
**Tests:** Token generation, expiration, single-use validation, invalid tokens, timing attacks, email delivery

### 4. **Invite Flow Manipulation** - HIGH - 10 tests needed
**Impact:** Unauthorized user registration, privilege escalation  
**Attack Vectors:** Token reuse, expired invite acceptance, role injection, email collision  
**Tests:** Invite creation, expiration, acceptance, duplicate emails, role validation, token uniqueness

### 5. **Insufficient Authorization** - MEDIUM - 8 tests needed
**Impact:** Users accessing/modifying other users' data  
**Attack Vectors:** IDOR, privilege escalation, missing role checks  
**Tests:** User CRUD permissions, role-based access, admin-only operations, self-modification limits

---

## Test Slices

### Slice 1: IDN-TST-LOG-001 - Login Flow Tests
**Priority:** CRITICAL 🔴  
**Effort:** 6 hours  
**Test Count:** 18 tests  
**Risk Coverage:** #1 (Broken Authentication)

**Test Cases:**
1. `test_login_valid_credentials_returns_tokens`
2. `test_login_invalid_password_returns_401`
3. `test_login_nonexistent_user_returns_401`
4. `test_login_inactive_user_returns_403`
5. `test_login_invited_user_returns_403`
6. `test_login_missing_email_returns_422`
7. `test_login_missing_password_returns_422`
8. `test_login_malformed_email_returns_422`
9. `test_login_empty_password_returns_422`
10. `test_login_creates_refresh_token_in_db`
11. `test_login_returns_user_data_in_response`
12. `test_login_password_not_logged_or_returned`
13. `test_login_timing_attack_resistant` (constant-time comparison)
14. `test_login_sql_injection_in_email_safe`
15. `test_login_concurrent_requests_same_user_safe`
16. `test_login_token_includes_user_id_claim`
17. `test_login_remember_me_extends_refresh_token`
18. `test_login_rate_limit_blocks_brute_force` (if implemented)

**File:** `backend/tests/domains/identity/access_control/authentication/test_login_flow.py`  
**Fixtures:** `test_user_active`, `test_user_inactive`, `test_db_session`, `client`  
**Dependencies:** User seeder, password hashing utilities

---

### Slice 2: IDN-TST-TOK-001 - Token Management Tests
**Priority:** CRITICAL 🔴  
**Effort:** 5 hours  
**Test Count:** 15 tests  
**Risk Coverage:** #2 (Token Leakage & Session Hijacking)

**Test Cases:**
1. `test_refresh_token_valid_returns_new_access_token`
2. `test_refresh_token_invalid_returns_401`
3. `test_refresh_token_expired_returns_401`
4. `test_refresh_token_revoked_returns_401`
5. `test_refresh_token_not_reusable_after_revocation`
6. `test_validate_token_valid_returns_200`
7. `test_validate_token_expired_returns_401`
8. `test_validate_token_malformed_returns_401`
9. `test_logout_revokes_refresh_token`
10. `test_logout_with_invalid_token_returns_404`
11. `test_logout_all_revokes_all_user_tokens`
12. `test_logout_all_does_not_affect_other_users`
13. `test_remember_me_extends_token_expiry`
14. `test_concurrent_refresh_token_usage_safe`
15. `test_token_cleanup_job_removes_expired_tokens` (if implemented)

**File:** `backend/tests/domains/identity/access_control/authentication/test_token_management.py`  
**Fixtures:** `logged_in_user`, `refresh_token`, `expired_token`, `test_db_session`  
**Dependencies:** JWT utilities, token factories

---

### Slice 3: IDN-TST-PWD-001 - Password Reset Tests
**Priority:** HIGH 🟠  
**Effort:** 5 hours  
**Test Count:** 12 tests  
**Risk Coverage:** #3 (Password Reset Abuse)

**Test Cases:**
1. `test_password_reset_request_valid_email_returns_200`
2. `test_password_reset_request_nonexistent_email_returns_200` (security: no user enumeration)
3. `test_password_reset_request_creates_token_in_db`
4. `test_password_reset_request_sends_email` (mock email service)
5. `test_password_reset_confirm_valid_token_resets_password`
6. `test_password_reset_confirm_invalid_token_returns_400`
7. `test_password_reset_confirm_expired_token_returns_400`
8. `test_password_reset_confirm_used_token_returns_400`
9. `test_password_reset_confirm_revokes_all_sessions`
10. `test_password_reset_confirm_weak_password_returns_422`
11. `test_password_reset_token_single_use_only`
12. `test_password_reset_old_password_no_longer_works`

**File:** `backend/tests/domains/identity/access_control/authentication/test_password_reset.py`  
**Fixtures:** `test_user`, `valid_reset_token`, `expired_reset_token`, `mock_email_service`  
**Dependencies:** Email service mock, password strength validator

---

### Slice 4: IDN-TST-INV-001 - Invite Flow Tests
**Priority:** HIGH 🟠  
**Effort:** 5 hours  
**Test Count:** 12 tests  
**Risk Coverage:** #4 (Invite Flow Manipulation)

**Test Cases:**
1. `test_invite_user_admin_creates_invite`
2. `test_invite_user_non_admin_returns_403`
3. `test_invite_user_duplicate_email_returns_409`
4. `test_invite_user_creates_token_in_db`
5. `test_invite_user_sends_email` (mock)
6. `test_invite_user_default_role_is_user`
7. `test_accept_invite_valid_token_creates_user`
8. `test_accept_invite_invalid_token_returns_400`
9. `test_accept_invite_expired_token_returns_400`
10. `test_accept_invite_used_token_returns_400`
11. `test_accept_invite_sets_password_and_activates_user`
12. `test_accept_invite_token_single_use_only`

**File:** `backend/tests/domains/identity/user_management/test_invite_flow.py`  
**Fixtures:** `admin_user`, `test_invite_token`, `expired_invite_token`, `mock_email_service`  
**Dependencies:** Role enforcement, email mock

---

### Slice 5: IDN-TST-USR-001 - User CRUD Tests
**Priority:** MEDIUM 🟡  
**Effort:** 4 hours  
**Test Count:** 10 tests  
**Risk Coverage:** #5 (Insufficient Authorization)

**Test Cases:**
1. `test_get_users_admin_returns_paginated_list`
2. `test_get_users_non_admin_returns_403`
3. `test_get_user_by_id_admin_returns_user`
4. `test_get_user_by_id_non_admin_own_user_returns_200`
5. `test_get_user_by_id_non_admin_other_user_returns_403`
6. `test_update_user_admin_can_update_any_user`
7. `test_update_user_non_admin_can_update_self_only`
8. `test_update_user_cannot_escalate_own_role`
9. `test_delete_user_admin_soft_deletes_user`
10. `test_delete_user_non_admin_returns_403`

**File:** `backend/tests/domains/identity/user_management/test_user_crud.py`  
**Fixtures:** `admin_user`, `regular_user`, `test_db_session`, `client`  
**Dependencies:** Role-based auth middleware

---

### Slice 6: IDN-TST-INT-001 - Integration & E2E Tests
**Priority:** HIGH 🟠  
**Effort:** 6 hours  
**Test Count:** 8 tests  
**Risk Coverage:** All (end-to-end validation)

**Test Cases (E2E Scenarios):**
1. `test_e2e_complete_invite_to_login_flow`
   - Admin invites user → Email sent → User accepts → User logs in → User accesses protected resource
2. `test_e2e_password_reset_complete_flow`
   - User requests reset → Email sent → User confirms → Old password fails → New password works
3. `test_e2e_multi_device_session_management`
   - User logs in on device A → User logs in on device B → Logout-all revokes both sessions
4. `test_e2e_token_refresh_before_expiry`
   - Login → Wait until near expiry → Refresh → Use new token → Success
5. `test_e2e_admin_user_lifecycle`
   - Admin creates user → Admin updates user → Admin deactivates user → User login fails
6. `test_e2e_concurrent_login_attempts`
   - Multiple users log in simultaneously → All receive valid independent tokens
7. `test_e2e_security_audit_trail` (if audit logging exists)
   - Login → Logout → Password reset → Check audit log entries
8. `test_e2e_expired_token_cleanup`
   - Create expired tokens → Run cleanup job → Verify tokens removed from DB

**File:** `backend/tests/domains/identity/test_integration.py`  
**Fixtures:** `client`, `test_db_session`, `mock_email_service`, `admin_user`, `time_mock`  
**Dependencies:** Full stack (DB, email, auth middleware)

---

### Slice 7: IDN-TST-SEC-001 - Security Edge Cases (Optional)
**Priority:** LOW 🟢  
**Effort:** 3 hours  
**Test Count:** 8 tests  
**Risk Coverage:** Defense in depth

**Test Cases:**
1. `test_csrf_protection_on_state_changing_endpoints` (if implemented)
2. `test_cors_headers_properly_configured`
3. `test_sensitive_data_not_in_logs`
4. `test_password_hash_algorithm_secure` (bcrypt/argon2)
5. `test_token_entropy_sufficient` (32+ bytes)
6. `test_session_fixation_attack_prevented`
7. `test_jwt_signature_validation_enforced`
8. `test_insecure_direct_object_references_blocked`

**File:** `backend/tests/domains/identity/test_security_edge_cases.py`  
**Fixtures:** Custom security test fixtures  
**Dependencies:** Security scanning tools, log capture

---

## Implementation Order

### Phase 1: Critical Auth Foundation (11 hours)
1. **Slice 1 (Login)** - 6 hours
   - **Why first:** Foundation for all other tests; most critical attack surface
   - **Blockers:** None
2. **Slice 2 (Token)** - 5 hours
   - **Why second:** Required for session management and all authenticated tests
   - **Blockers:** Needs Slice 1 fixtures (logged-in users)

### Phase 2: User Onboarding & Recovery (10 hours)
3. **Slice 3 (Password Reset)** - 5 hours
   - **Why third:** High user impact; required for production readiness
   - **Blockers:** Needs email mocking setup
4. **Slice 4 (Invite Flow)** - 5 hours
   - **Why fourth:** Critical for user onboarding; admin workflows depend on it
   - **Blockers:** Needs admin user fixture from Slice 1

### Phase 3: Authorization & CRUD (4 hours)
5. **Slice 5 (User CRUD)** - 4 hours
   - **Why fifth:** Lower risk; depends on auth being solid first
   - **Blockers:** Needs role-based fixtures from Slices 1 & 4

### Phase 4: Integration & Validation (6 hours)
6. **Slice 6 (Integration)** - 6 hours
   - **Why sixth:** Validates all slices working together; catches integration bugs
   - **Blockers:** Requires Slices 1-5 to be complete

### Phase 5: Defense in Depth (Optional) (3 hours)
7. **Slice 7 (Security)** - 3 hours
   - **Why last:** Nice-to-have; addresses edge cases after core is solid
   - **Blockers:** None (independent tests)

---

## Total Effort

| Phase | Slices | Tests | Hours | Days (8h) |
|-------|--------|-------|-------|-----------|
| **MVP (Critical)** | 1-2 | 33 | 11h | 1.4 days |
| **Production Ready** | 1-4 | 57 | 21h | 2.6 days |
| **Complete** | 1-6 | 75 | 31h | 3.9 days |
| **Defense in Depth** | 1-7 | 83 | 34h | 4.3 days |

**Recommended Target:** Production Ready (Slices 1-4) = **57 tests in 21 hours**

---

## Success Criteria

### Quantitative Metrics
- [ ] 57+ test cases written and passing (Slices 1-4)
- [ ] 85%+ code coverage on LoginService
- [ ] 80%+ code coverage on UserManagementService
- [ ] 90%+ coverage on authentication routers
- [ ] All tests run in < 45 seconds total
- [ ] Zero flaky tests (3 consecutive runs)

### Qualitative Checks
- [ ] All OWASP Top 10 auth risks tested
- [ ] No hardcoded credentials in tests
- [ ] Security edge cases documented (even if not all tested)
- [ ] Clear test failure messages (no generic "assertion failed")
- [ ] Tests follow DDD structure (match domain folders)

### Production Readiness Gates
- [ ] All critical paths have happy + sad path tests
- [ ] Token expiry/revocation flows fully validated
- [ ] Email service properly mocked (no real emails sent)
- [ ] Password reset cannot be abused (rate limiting tested)
- [ ] Admin-only operations properly protected

---

## Test Fixtures & Utilities

### Core Fixtures (Create First)
```python
# backend/tests/domains/identity/conftest.py

@pytest.fixture
async def test_user_active(db_session):
    """Active user with password set."""
    user = User(
        email="user@test.com",
        hashed_password=get_password_hash("password123"),
        status=UserStatus.ACTIVE,
        role=UserRole.USER
    )
    db_session.add(user)
    await db_session.commit()
    return user

@pytest.fixture
async def admin_user(db_session):
    """Active admin user."""
    # Similar to above with role=UserRole.ADMIN

@pytest.fixture
async def logged_in_user(client, test_user_active):
    """Returns (user, access_token, refresh_token)."""
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_active.email,
        "password": "password123"
    })
    data = response.json()
    return test_user_active, data["access_token"], data["refresh_token"]

@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email sending."""
    emails_sent = []
    async def mock_send(to, subject, body):
        emails_sent.append({"to": to, "subject": subject, "body": body})
    # Apply monkeypatch to email service
    return emails_sent
```

### Utility Helpers
```python
# backend/tests/domains/identity/helpers.py

async def create_expired_token(db_session, user_id):
    """Create a refresh token that's already expired."""
    token = RefreshToken(
        user_id=user_id,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(UTC) - timedelta(days=1)  # Already expired
    )
    db_session.add(token)
    await db_session.commit()
    return token.token

def assert_no_password_in_response(response_data):
    """Ensure no password fields in response."""
    assert "password" not in response_data
    assert "hashed_password" not in response_data
```

---

## DOMAIN_REGISTRY.yaml Registration

```yaml
identity:
  access_control:
    authentication:
      features:
        login_flow:
          slices:
            login_tests:
              id: "IDN-TST-LOG-001"
              story: "Comprehensive login flow tests"
              status: "planned"
              priority: "critical"
              effort: "6h"
              test_count: 18
            token_tests:
              id: "IDN-TST-TOK-001"
              story: "Token management and session tests"
              status: "planned"
              priority: "critical"
              effort: "5h"
              test_count: 15
            password_reset_tests:
              id: "IDN-TST-PWD-001"
              story: "Password reset flow tests"
              status: "planned"
              priority: "high"
              effort: "5h"
              test_count: 12

  user_management:
    features:
      core_operations:
        slices:
          invite_tests:
            id: "IDN-TST-INV-001"
            story: "User invite flow tests"
            status: "planned"
            priority: "high"
            effort: "5h"
            test_count: 12
          user_crud_tests:
            id: "IDN-TST-USR-001"
            story: "User CRUD operation tests"
            status: "planned"
            priority: "medium"
            effort: "4h"
            test_count: 10

  testing:
    features:
      integration:
        slices:
          e2e_tests:
            id: "IDN-TST-INT-001"
            story: "Identity E2E integration tests"
            status: "planned"
            priority: "high"
            effort: "6h"
            test_count: 8
          security_tests:
            id: "IDN-TST-SEC-001"
            story: "Security edge case tests"
            status: "planned"
            priority: "low"
            effort: "3h"
            test_count: 8
```

---

## Dependencies & Prerequisites

### Before Starting Any Slice
1. ✅ Verify pytest is configured (`backend/pyproject.toml`)
2. ✅ Verify test database setup (`conftest.py` root fixtures)
3. ✅ Install `pytest-asyncio`, `pytest-mock`, `httpx` (test client)
4. ⚠️ Create `backend/tests/domains/identity/conftest.py` (shared fixtures)
5. ⚠️ Set up email service mocking pattern
6. ⚠️ Document any rate limiting configuration (if exists)

### External Test Dependencies
- **Pytest plugins:** `pytest-asyncio`, `pytest-cov`, `pytest-xdist` (parallel runs)
- **Mocking:** `pytest-mock` (already using `monkeypatch`)
- **Time mocking:** `freezegun` or manual datetime patching
- **Database:** PostgreSQL test instance (already configured)

---

## Risk Mitigation Notes

### Common Test Anti-Patterns to Avoid
1. ❌ **Shared mutable state** - Each test must be isolated
2. ❌ **Hardcoded UUIDs** - Use factories or fixtures
3. ❌ **Real external services** - Mock email, payment, etc.
4. ❌ **Tests that depend on execution order** - Use fixtures, not globals
5. ❌ **Overly complex assertions** - One logical assertion per test

### Security Test Gotchas
1. **Timing attacks** - Use constant-time comparison libraries (built into `verify_password`)
2. **Token entropy** - Verify `secrets.token_urlsafe(32)` = 256 bits minimum
3. **Password hashing** - Ensure bcrypt/argon2 (not MD5/SHA1)
4. **SQL injection** - SQLAlchemy ORM is safe, but test raw SQL if used
5. **Rate limiting** - Mock time to test without waiting

---

## Next Steps (Action Items)

### Immediate (Today)
1. [ ] Create `backend/tests/domains/identity/conftest.py` with core fixtures
2. [ ] Create `backend/tests/domains/identity/helpers.py` with utilities
3. [ ] Update `DOMAIN_REGISTRY.yaml` with test slice registrations
4. [ ] Set up email service mock pattern

### Phase 1 (Day 1-2)
5. [ ] Implement Slice 1 (Login Tests) - 18 tests
6. [ ] Implement Slice 2 (Token Tests) - 15 tests
7. [ ] Run coverage report: `pytest --cov=src/domains/identity/access_control`

### Phase 2 (Day 3)
8. [ ] Implement Slice 3 (Password Reset) - 12 tests
9. [ ] Implement Slice 4 (Invite Flow) - 12 tests

### Phase 3 (Day 4)
10. [ ] Implement Slice 5 (User CRUD) - 10 tests (optional)
11. [ ] Implement Slice 6 (Integration) - 8 tests
12. [ ] Final coverage check and documentation

---

## Appendix: Example Test Structure

```python
# backend/tests/domains/identity/access_control/authentication/test_login_flow.py

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestLoginEndpoint:
    """Test suite for POST /api/v1/auth/login."""

    async def test_login_valid_credentials_returns_tokens(
        self,
        client: AsyncClient,
        test_user_active,
    ):
        """Valid credentials should return access and refresh tokens."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_active.email,
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == test_user_active.email

    async def test_login_invalid_password_returns_401(
        self,
        client: AsyncClient,
        test_user_active,
    ):
        """Invalid password should return 401."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user_active.email,
                "password": "wrong_password",
            },
        )

        assert response.status_code == 401
        assert "detail" in response.json()

    # ... 16 more tests
```

---

**Plan Owner:** [AI-QA]  
**Last Updated:** 2025-12-20  
**Status:** Ready for implementation  
**Approved By:** [AI-DIRECTOR] (pending)
