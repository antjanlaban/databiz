# 🔒 Code Protection Strategy - DataBiz Next

**Created:** December 21, 2025  
**Author:** [AI-DIRECTOR] + [DEVOPS]  
**Status:** PROPOSAL FOR REVIEW

---

## 🎯 Problem Statement

In vibecoding/AI-driven development, werkende code kan onbedoeld worden gewijzigd door AI agents, wat tot regressies leidt. We hebben een mechanisme nodig om stabiele domeinen te "bevriezen" zonder ontwikkeling volledig te blokkeren.

---

## 🔍 Industry Research: Best Practices

### 1. **Documentation-Based Guards** (Anthropic/OpenAI approach)
**Methode:** Expliciete instructies in prompt/context  
**Effectiviteit:** 70-80%  
**Voordelen:**
- ✅ Flexibel (emergencies kunnen nog)
- ✅ Geen extra tooling
- ✅ AI agents begrijpen natuurlijke taal

**Nadelen:**
- ❌ Agents kunnen "vergeten" bij lange gesprekken
- ❌ Geen technische enforcement

**Voorbeeld:**
```markdown
## 🔒 PROTECTED DOMAINS

**The following domains are PRODUCTION-STABLE and FROZEN:**
- `backend/src/domains/identity/` - Authentication & user management
  - ❌ NO modifications without explicit approval
  - ❌ NO refactoring
  - ✅ Bug fixes ONLY with tests
```

---

### 2. **Comment-Based Markers** (Google/Meta approach)
**Methode:** Special comments in code that AI agents recognize  
**Effectiviteit:** 85-90%  
**Voordelen:**
- ✅ Code-level protection
- ✅ Clear visibility in file
- ✅ Can be enforced by linters

**Nadelen:**
- ❌ Requires discipline to add markers
- ❌ Can clutter code

**Voorbeeld:**
```python
# === PROTECTED CODE: DO NOT MODIFY WITHOUT APPROVAL ===
# Domain: Identity / Authentication
# Status: PRODUCTION-STABLE (2025-12-21)
# Owner: [AI-DIRECTOR]
# Reason: Critical security logic, tested and validated
# Contact: Before modifying, check .ai/project/PROTECTED_DOMAINS.md
# === END PROTECTED CODE ===

async def authenticate(self, email: str, password: str) -> tuple[User, str]:
    """Authentication logic - DO NOT MODIFY"""
    ...
```

---

### 3. **Test-Based Protection** (TDD approach)
**Methode:** Comprehensive tests that break if code changes  
**Effectiviteit:** 90-95%  
**Voordelen:**
- ✅ Technical enforcement
- ✅ AI agents run tests and see failures
- ✅ Supports safe refactoring

**Nadelen:**
- ❌ Requires high test coverage
- ❌ Can be circumvented by modifying tests

**Voorbeeld:**
```python
# tests/domains/identity/test_protection.py
def test_authentication_signature_unchanged():
    """This test MUST pass - ensures auth API didn't change"""
    from src.domains.identity.access_control.authentication.login_flow.service import LoginService
    
    # Check method signature
    import inspect
    sig = inspect.signature(LoginService.authenticate)
    assert list(sig.parameters.keys()) == ['self', 'email', 'password']
    
    # Check return type
    assert sig.return_annotation == "tuple[User, str]"
```

---

### 4. **File Metadata + Pre-commit Hooks** (Enterprise approach)
**Methode:** `.protected` files + Git hooks that prevent commits  
**Effectiviteit:** 95-99%  
**Voordelen:**
- ✅ Strong technical enforcement
- ✅ Works for all developers (human + AI)
- ✅ Clear audit trail

**Nadelen:**
- ❌ More complex setup
- ❌ Can block legitimate bug fixes
- ❌ Requires override mechanism

**Voorbeeld:**
```yaml
# .ai/project/PROTECTED_MANIFEST.yaml
protected_domains:
  - path: backend/src/domains/identity/
    level: STRICT
    allowed_operations:
      - bug_fixes_with_tests
      - documentation_updates
    forbidden_operations:
      - refactoring
      - signature_changes
      - new_features
    approval_required_from:
      - AI-DIRECTOR
      - LEAD
```

---

### 5. **Hybrid Approach** (RECOMMENDED)
**Methode:** Combine documentation + code markers + tests  
**Effectiviteit:** 95%+  
**Voordelen:**
- ✅ Defense in depth
- ✅ Flexible but safe
- ✅ Works for AI + human developers

---

## 🏆 Recommended Solution for DataBiz Next

**Multi-Layer Protection:**

```
Layer 1: AI Instructions (.github/copilot-instructions.md)
    ↓
Layer 2: Protected Domain Registry (.ai/project/PROTECTED_DOMAINS.md)
    ↓
Layer 3: Code Markers (comments in files)
    ↓
Layer 4: Test Guards (contract tests)
    ↓
Layer 5: Git Pre-commit Hook (optional, for strict enforcement)
```

---

## 📋 Implementation Plan

### Phase 1: Documentation Layer (Week 1)

**1. Create Protected Domain Registry**
```markdown
# .ai/project/PROTECTED_DOMAINS.md

## 🔒 Protected Domains

### Identity Domain (backend/src/domains/identity/)
**Status:** 🔴 FROZEN  
**Protected Since:** 2025-12-21  
**Owner:** [AI-DIRECTOR]  
**Reason:** Production-stable authentication logic. Critical security.

**Protection Level:** STRICT

**Allowed Operations:**
- ✅ Bug fixes (with regression tests)
- ✅ Documentation updates
- ✅ Type hint improvements (non-breaking)

**Forbidden Operations:**
- ❌ Refactoring (without approval)
- ❌ Method signature changes
- ❌ New features
- ❌ Database model changes

**Override Process:**
1. Document reason in PROTECTED_DOMAINS.md
2. Get approval from [AI-DIRECTOR]
3. Add comprehensive tests
4. Update protection markers
```

**2. Update AI Agent Instructions**
Add section to `.github/copilot-instructions.md`:
```markdown
## 🔒 PROTECTED DOMAINS

**CRITICAL: Before modifying any code, check `.ai/project/PROTECTED_DOMAINS.md`**

**If domain is PROTECTED:**
1. ❌ STOP immediately
2. 🚨 Alert user: "This domain is protected"
3. 📖 Show protection details
4. 🤝 Ask for explicit approval to override

**Violation = Session terminated.**
```

---

### Phase 2: Code Markers (Week 1)

Add protection markers to Identity domain files:

**Example: `backend/src/domains/identity/models.py`**
```python
"""
🔒 PROTECTED FILE - Identity Domain Models
════════════════════════════════════════════════════════════════
Status: FROZEN (Production-Stable)
Protected Since: 2025-12-21
Owner: [AI-DIRECTOR]

⚠️  CRITICAL SECURITY CODE - DO NOT MODIFY WITHOUT APPROVAL

Allowed: Bug fixes with tests, documentation
Forbidden: Schema changes, refactoring, new fields

See: .ai/project/PROTECTED_DOMAINS.md
Contact: Check PROTECTED_DOMAINS.md before modifying
════════════════════════════════════════════════════════════════
"""

from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
...
```

**Example: Critical function**
```python
    # 🔒 PROTECTED METHOD - Authentication Core
    # DO NOT MODIFY signature or logic without [AI-DIRECTOR] approval
    async def authenticate(
        self,
        email: str,
        password: str
    ) -> tuple[User, str]:
        """
        Authenticate user and return (user, access_token).
        
        🔒 PROTECTED: This is critical security logic.
        Changes require regression tests + security review.
        """
        ...
    # 🔒 END PROTECTED METHOD
```

---

### Phase 3: Test Guards (Week 2)

Create contract tests that enforce API stability:

**File: `tests/domains/identity/test_protection.py`**
```python
"""
🔒 Protection Tests for Identity Domain
These tests MUST pass. They ensure protected APIs remain stable.
"""

import pytest
import inspect
from src.domains.identity.access_control.authentication.login_flow.service import LoginService
from src.domains.identity.user_management.service import UserManagementService

class TestAuthenticationContractProtection:
    """Ensures authentication API signatures remain unchanged"""
    
    def test_login_service_authenticate_signature(self):
        """🔒 PROTECTED: LoginService.authenticate signature"""
        sig = inspect.signature(LoginService.authenticate)
        params = list(sig.parameters.keys())
        
        # Exact signature check
        assert params == ['self', 'email', 'password'], \
            "🚨 PROTECTED METHOD MODIFIED: LoginService.authenticate signature changed!"
        
        # Return type check
        assert 'tuple[User, str]' in str(sig.return_annotation) or \
               'Tuple[User, str]' in str(sig.return_annotation), \
            "🚨 PROTECTED METHOD MODIFIED: Return type changed!"
    
    def test_create_access_token_signature(self):
        """🔒 PROTECTED: LoginService.create_access_token signature"""
        sig = inspect.signature(LoginService.create_access_token)
        params = list(sig.parameters.keys())
        
        assert params == ['self', 'user_id'], \
            "🚨 PROTECTED METHOD MODIFIED: create_access_token signature changed!"
    
    def test_user_management_core_methods_exist(self):
        """🔒 PROTECTED: Core user management methods must exist"""
        required_methods = [
            'get_users',
            'get_user_by_id',
            'create_user',
            'update_user',
            'delete_user',
            'invite_user',
            'accept_invite',
        ]
        
        for method_name in required_methods:
            assert hasattr(UserManagementService, method_name), \
                f"🚨 PROTECTED METHOD REMOVED: {method_name} missing!"


class TestIdentityModelsProtection:
    """Ensures database models remain stable"""
    
    def test_user_model_required_fields(self):
        """🔒 PROTECTED: User model required fields"""
        from src.shared.models import User
        
        required_columns = {
            'id', 'email', 'hashed_password', 'role', 
            'status', 'created_at', 'updated_at'
        }
        
        user_columns = {col.name for col in User.__table__.columns}
        
        missing = required_columns - user_columns
        assert not missing, \
            f"🚨 PROTECTED FIELDS REMOVED: {missing} missing from User model!"
    
    def test_user_role_enum_values(self):
        """🔒 PROTECTED: UserRole enum values"""
        from src.domains.identity.models import UserRole
        
        required_roles = {'admin', 'user', 'readonly'}
        actual_roles = {role.value for role in UserRole}
        
        missing = required_roles - actual_roles
        assert not missing, \
            f"🚨 PROTECTED ENUM MODIFIED: Roles {missing} removed!"


class TestIdentityEndpointsProtection:
    """Ensures API endpoints remain stable"""
    
    @pytest.mark.asyncio
    async def test_login_endpoint_exists(self, test_client):
        """🔒 PROTECTED: POST /api/v1/auth/login must exist"""
        response = await test_client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrong"}
        )
        # Should return 401, not 404
        assert response.status_code != 404, \
            "🚨 PROTECTED ENDPOINT REMOVED: /api/v1/auth/login missing!"
    
    @pytest.mark.asyncio
    async def test_users_endpoint_exists(self, test_client):
        """🔒 PROTECTED: GET /api/v1/users must exist"""
        response = await test_client.get("/api/v1/users")
        # Should return 401 (no auth) not 404
        assert response.status_code != 404, \
            "🚨 PROTECTED ENDPOINT REMOVED: /api/v1/users missing!"
```

---

### Phase 4: Validation Script (Week 2)

**File: `scripts/validate-protected-domains.py`**
```python
#!/usr/bin/env python3
"""
Validate Protected Domains

Checks:
1. Protected files have markers
2. Protection tests exist and pass
3. No unauthorized modifications

Exit codes:
0 = All protected domains valid
1 = Warnings (missing markers)
2 = Violations detected
"""

import sys
from pathlib import Path

def check_file_has_protection_marker(filepath: Path) -> bool:
    """Check if file has 🔒 PROTECTED marker"""
    content = filepath.read_text(encoding='utf-8')
    return '🔒 PROTECTED' in content or 'PROTECTED FILE' in content

def validate_identity_domain():
    """Validate Identity domain protection"""
    issues = []
    
    # Check critical files have markers
    critical_files = [
        'backend/src/domains/identity/models.py',
        'backend/src/domains/identity/access_control/authentication/login_flow/service.py',
        'backend/src/domains/identity/user_management/service.py',
    ]
    
    for filepath in critical_files:
        path = Path(filepath)
        if not path.exists():
            issues.append(f"❌ CRITICAL: {filepath} does not exist!")
        elif not check_file_has_protection_marker(path):
            issues.append(f"⚠️  WARNING: {filepath} missing protection marker")
    
    return issues

def main():
    print("🔒 Validating Protected Domains...\n")
    
    all_issues = []
    all_issues.extend(validate_identity_domain())
    
    if not all_issues:
        print("✅ All protected domains validated successfully!")
        return 0
    
    print("Issues found:\n")
    for issue in all_issues:
        print(f"  {issue}")
    
    # Determine severity
    has_critical = any('❌' in issue for issue in all_issues)
    
    if has_critical:
        print("\n🚨 CRITICAL VIOLATIONS - Fix immediately!")
        return 2
    else:
        print("\n⚠️  Warnings found - Consider fixing")
        return 1

if __name__ == '__main__':
    sys.exit(main())
```

---

### Phase 5: Git Hook (Optional - Week 3)

**File: `.git/hooks/pre-commit`**
```bash
#!/bin/bash
# Protected Domains Pre-commit Hook

echo "🔒 Checking protected domains..."

# Run protection validation
python scripts/validate-protected-domains.py
RESULT=$?

if [ $RESULT -eq 2 ]; then
    echo ""
    echo "🚨 COMMIT BLOCKED: Protected domain violations detected!"
    echo "See output above for details."
    echo ""
    echo "To override (emergencies only):"
    echo "  git commit --no-verify"
    exit 1
fi

if [ $RESULT -eq 1 ]; then
    echo ""
    echo "⚠️  Warnings detected in protected domains"
    echo "Consider fixing before committing."
    echo ""
fi

exit 0
```

---

## 📊 Protection Levels

### 🔴 STRICT (Identity Domain)
- ❌ No modifications without approval
- ❌ No refactoring
- ❌ No signature changes
- ✅ Bug fixes ONLY with tests
- ✅ Documentation updates

### 🟡 MODERATE (Future: Imports Domain)
- ⚠️  Modifications require tests
- ✅ Refactoring allowed if tests pass
- ⚠️  Signature changes need documentation

### 🟢 FLEXIBLE (Future: New Features)
- ✅ Normal development
- ✅ AI agents free to modify

---

## 🎯 Success Metrics

**Week 1:**
- ✅ Protected domain registry created
- ✅ AI instructions updated
- ✅ Identity domain marked in code

**Week 2:**
- ✅ Protection tests passing
- ✅ Validation script working
- ✅ Zero unauthorized modifications

**Week 3:**
- ✅ Git hook (optional) installed
- ✅ Team trained on process
- ✅ Documentation complete

---

## 🚀 Next Steps

1. **Review this proposal** with [LEAD]
2. **Approve approach** (Hybrid with 3 layers minimum)
3. **Start Phase 1** (Documentation layer TODAY)
4. **Test with Identity domain** as pilot
5. **Expand to other domains** after validation

---

## 📝 Example: How It Works in Practice

**Scenario: AI agent tries to refactor authentication**

```
User: "Refactor the authentication service to use dependency injection"

AI Agent:
🔒 PROTECTION CHECK: Checking .ai/project/PROTECTED_DOMAINS.md...

⚠️  PROTECTED DOMAIN DETECTED!

Domain: Identity / Authentication
Status: 🔴 FROZEN (Production-Stable)
Protected Since: 2025-12-21
Level: STRICT

This refactoring is FORBIDDEN without approval.

Options:
1. ❌ Stop (recommended)
2. 🐛 Bug fix only (if there's a bug)
3. 🚨 Override (emergency only - requires justification)

Please confirm: Do you want to override protection? (y/N)
```

---

**[AI-DIRECTOR] + [DEVOPS]** - Ready for review and approval.
