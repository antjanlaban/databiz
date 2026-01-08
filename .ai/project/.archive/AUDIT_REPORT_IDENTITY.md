# Identity Domain Audit Report

**Date**: December 16, 2025  
**Auditor**: [DATA] + [ARCHITECT] Agent  
**Domain**: Identity (Authentication & Authorization)

---

## 📊 Executive Summary

De Identity domain is momenteel in **demo state**. Er is een werkende login flow met hardcoded user, maar geen database integratie. Dit rapport documenteert de gaps en het implementatieplan.

---

## 🔍 Infrastructure Status

| Component | Status | Port | Notes |
|-----------|--------|------|-------|
| **Docker PostgreSQL** | ✅ Running | 5432 | Moet naar 9020 per PORT_REGISTRY |
| **Database `databiz`** | ✅ Created | - | Geen tabellen (fresh) |
| **Docker MinIO** | ⚠️ Not Running | 9000/9001 | Niet nodig voor Identity |
| **Backend venv** | ⚠️ Unknown | - | Moet handmatig gecheckt worden |

---

## 📦 Dependencies Check

| Package | Required | In requirements.txt |
|---------|----------|---------------------|
| `fastapi` | ✅ | ✅ |
| `sqlalchemy` | ✅ | ✅ |
| `alembic` | ✅ | ✅ |
| `asyncpg` | ✅ | ✅ |
| `passlib` | ✅ | ❌ **MISSING** |
| `python-jose` | ✅ | ❌ **MISSING** |
| `bcrypt` | ✅ | ❌ **MISSING** |

### ⚠️ ACTION REQUIRED
Add missing packages to `requirements.txt`:
```
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
```

---

## 🗄️ Database Schema Status

### Current State: NO TABLES

```
databiz=# \dt
Did not find any relations.
```

### Required Tables for Identity Domain

1. **users** (Priority 1)
   - `id` UUID PRIMARY KEY
   - `email` VARCHAR(255) UNIQUE NOT NULL
   - `hashed_password` VARCHAR(255)
   - `role` ENUM('admin', 'user') DEFAULT 'user'
   - `status` ENUM('invited', 'active', 'disabled') DEFAULT 'invited'
   - `created_at` TIMESTAMP DEFAULT NOW()
   - `updated_at` TIMESTAMP

2. **refresh_tokens** (Priority 2)
   - `id` UUID PRIMARY KEY
   - `user_id` UUID REFERENCES users(id)
   - `token` VARCHAR(255) UNIQUE NOT NULL
   - `expires_at` TIMESTAMP NOT NULL
   - `revoked` BOOLEAN DEFAULT FALSE
   - `created_at` TIMESTAMP DEFAULT NOW()

3. **invite_tokens** (Priority 3)
   - `id` UUID PRIMARY KEY
   - `user_id` UUID REFERENCES users(id)
   - `token` VARCHAR(255) UNIQUE NOT NULL
   - `expires_at` TIMESTAMP NOT NULL
   - `used_at` TIMESTAMP

---

## 📋 Slice Gap Analysis

| Slice ID | User Story | Status | Gap Description |
|----------|-----------|--------|-----------------|
| **IDN-AUTH-LOG-001** | Login | 🟡 Partial | Hardcoded user, no DB lookup, no rate limiting |
| **IDN-AUTH-OUT-001** | Logout | ❌ Missing | Endpoint not implemented |
| **IDN-AUTH-REF-001** | Refresh Token | ❌ Missing | No refresh token logic |
| **IDN-AUTH-VER-001** | Verify Token | 🟡 Partial | `decode_access_token()` exists, no middleware |
| **IDN-AUTH-RST-001** | Request Password Reset | ❌ Missing | Not implemented |
| **IDN-AUTH-RST-002** | Reset Password | ❌ Missing | Not implemented |
| **IDN-USR-CRE-001** | Create User | ❌ Missing | No User model |
| **IDN-USR-INV-001** | Invite User | ❌ Missing | Not implemented |
| **IDN-USR-ACC-001** | Accept Invite | ❌ Missing | Not implemented |
| **IDN-AUT-ROL-001** | Check Role | ❌ Missing | No RBAC implemented |

---

## 🏗️ Code Analysis

### ✅ Working Components

1. **security.py** - Password hashing and JWT utilities
   - `verify_password()` ✅
   - `get_password_hash()` ✅
   - `create_access_token()` ✅
   - `decode_access_token()` ✅

2. **database.py** - Async SQLAlchemy setup
   - `engine` ✅
   - `async_session_maker` ✅
   - `get_db()` dependency ✅
   - `Base` declarative base ✅

3. **config.py** - Settings from environment
   - `DATABASE_URL` property ✅
   - `SECRET_KEY`, `ALGORITHM` ✅

### ❌ Missing Components

1. **User Model** (`backend/src/domains/identity/models.py`)
2. **Alembic Configuration** (`backend/alembic.ini` + `migrations/`)
3. **Auth Dependencies** (`get_current_user`, `require_role`)
4. **Logout/Refresh endpoints**

### 🟡 Needs Refactoring

1. **service.py** - Replace hardcoded `DEMO_USER` with DB lookup
2. **router.py** - Add auth dependency to `/me` endpoint

---

## ⚠️ Port Configuration Issue

**Current State:**
- `docker-compose.yml`: PostgreSQL on port **5432**
- `PORT_REGISTRY.yaml`: Database should be on port **9020**
- `config.py`: Defaults to port **5432**

**Decision:** Align with PORT_REGISTRY (9020) for consistency across all environments.

**Required Changes:**
1. Update `docker-compose.yml`: `"9020:5432"`
2. Update `config.py`: `POSTGRES_PORT: int = 9020`

---

## 📌 Implementation Plan

### Phase 1: Database Foundation (Day 1)

1. ✅ Fix Docker Compose port alignment
2. ✅ Add missing Python packages
3. ✅ Create User model with SQLAlchemy
4. ✅ Initialize Alembic
5. ✅ Create initial migration
6. ✅ Seed admin user

### Phase 2: Core Authentication (Day 2)

7. Refactor LoginService → DB lookup
8. Create `get_current_user` dependency
9. Implement `/logout` endpoint
10. Implement `/refresh` endpoint

### Phase 3: User Management (Day 3)

11. Create `/users` CRUD endpoints
12. Implement `@require_role` decorator
13. Implement invite flow

### Phase 4: Advanced Flows (Day 4)

14. Password reset flow
15. Rate limiting
16. Audit logging

---

## 🚀 Next Steps

Begin with **Phase 1** tasks:

```bash
# 1. Stop current container (wrong port)
docker compose down

# 2. Start with updated config
docker compose up -d db

# 3. Install Python packages
pip install passlib[bcrypt] python-jose[cryptography]

# 4. Initialize Alembic
cd backend
alembic init migrations

# 5. Create and run migration
alembic revision --autogenerate -m "create_users_table"
alembic upgrade head
```

---

## 📁 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modify | Change port to 9020 |
| `backend/src/shared/config.py` | Modify | Default port to 9020 |
| `backend/requirements.txt` | Modify | Add passlib, python-jose |
| `backend/src/domains/identity/models.py` | Create | User & RefreshToken models |
| `backend/alembic.ini` | Create | Alembic configuration |
| `backend/migrations/` | Create | Alembic migrations folder |
| `backend/src/shared/security/dependencies.py` | Create | Auth dependencies |

---

**Report Complete** ✅  
**Next Action**: Begin Phase 1 implementation
