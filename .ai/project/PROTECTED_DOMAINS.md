# 🔒 Protected Domains Registry

**Last Updated:** December 21, 2025
**Maintained By:** [AI-DIRECTOR]

This file lists all domains that are **FROZEN** or **PROTECTED**.
AI Agents must check this registry before modifying any code in these paths.

---

## 🔴 STRICT PROTECTION (Frozen)

**Rules:**
- ❌ NO modifications without explicit user approval
- ❌ NO refactoring
- ❌ NO signature changes
- ✅ Bug fixes ONLY (must include regression tests)
- ✅ Documentation updates allowed

| Domain | Path | Owner | Reason |
| :--- | :--- | :--- | :--- |
| **Identity** | `backend/src/domains/identity/` | [AI-DIRECTOR] | Production-stable authentication & user management. Critical security. |

---

## 🟡 MODERATE PROTECTION (Stable)

**Rules:**
- ⚠️ Modifications require tests
- ✅ Refactoring allowed if tests pass
- ⚠️ Signature changes need documentation

| Domain | Path | Owner | Reason |
| :--- | :--- | :--- | :--- |
| *(None yet)* | | | |

---

## 🟢 FLEXIBLE (Active Development)

All other domains are considered **FLEXIBLE** unless listed above.
