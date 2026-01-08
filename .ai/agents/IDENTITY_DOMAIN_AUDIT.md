# [DATA] + [ARCHITECT] Identity Domain Complete Audit

## 🎯 Missie

Je bent de DATA_ENGINEER en ARCHITECT agent. Je taak is een **volledige audit** van de Identity domain in DataBiz Next, gevolgd door een **implementatieplan** om van de huidige "demo state" naar een volledig werkende authenticatie te komen.

---

## 📋 Context

### Wat al bestaat:

**Backend structuur** (`backend/src/domains/identity/`):
- `access_control/authentication/login_flow/` met:
  - `router.py` - POST /login, GET /me endpoints
  - `service.py` - LoginService met **hardcoded demo user** (geen DB!)
  - `schemas.py` - Pydantic models

**Shared utilities** (`backend/src/shared/`):
- `security.py` - bcrypt hashing, JWT encode/decode (WERKT)
- `database.py` - SQLAlchemy async engine setup (NIET AANGESLOTEN)
- `config.py` - Settings (Pydantic)

**Docker** (`docker-compose.yml`):
- PostgreSQL 15-alpine op port **5432** (standaard, NIET 9020 zoals PORT_REGISTRY)
- MinIO storage op port 9000/9001

### Wat NIET bestaat:
- ❌ User model (SQLAlchemy)
- ❌ Database migraties (Alembic)
- ❌ Refresh tokens
- ❌ Token blacklist/invalidation
- ❌ Role-based access control
- ❌ Password reset flow
- ❌ Invite flow

---

## 🔍 Stap 1: Onderzoek & Validatie

Voer de volgende controles uit:

### 1. Docker Status
```powershell
docker compose ps
docker compose logs db
```
- Is PostgreSQL draaiend?
- Is de database `databiz` aangemaakt?

### 2. Database Connectiviteit
- Check of `DATABASE_URL` in `.env` correct is
- Test connectie met:
```powershell
docker compose exec db psql -U postgres -d databiz -c "\dt"
```

### 3. Backend Dependencies
- Zijn `asyncpg`, `alembic`, `passlib`, `python-jose` geïnstalleerd?
- Check `backend/requirements.txt`

### 4. Port Conflict Check
- Docker PostgreSQL: 5432
- PORT_REGISTRY zegt: 9020
- **BESLUIT NODIG**: Welke port gebruiken?

---

## 🏗️ Stap 2: Gap Analysis

Vergelijk de huidige implementatie met `DOMAIN_REGISTRY.yaml`:

| Slice ID | User Story | Status | Gap |
|----------|-----------|--------|-----|
| IDN-AUTH-LOG-001 | Login | Deels | Geen DB, geen rate limiting |
| IDN-AUTH-OUT-001 | Logout | ❌ | Niet geïmplementeerd |
| IDN-AUTH-REF-001 | Refresh Token | ❌ | Niet geïmplementeerd |
| IDN-AUTH-VER-001 | Verify Token | Deels | Functie bestaat, geen middleware |
| IDN-USR-CRE-001 | Create User | ❌ | Geen User model |
| IDN-USR-INV-001 | Invite User | ❌ | Niet geïmplementeerd |
| IDN-AUT-ROL-001 | Check Role | ❌ | Geen RBAC |

---

## 🎯 Stap 3: Implementatieplan

Maak een geordend implementatieplan:

### Fase 1: Database Foundation (EERST!)
1. **Fix Docker Compose** - Align port met PORT_REGISTRY (9020)
2. **Maak User model** - `backend/src/domains/identity/models.py`
3. **Setup Alembic** - Migraties voor User tabel
4. **Maak RefreshToken model** - Voor token management

### Fase 2: Core Authentication
5. **Refactor LoginService** - Van hardcoded naar DB lookup
6. **Implementeer /logout** - Token invalidation
7. **Implementeer /refresh** - Refresh token flow
8. **Maak auth dependency** - `get_current_user()` middleware

### Fase 3: User Management
9. **Create User endpoint** - POST /users (Admin only)
10. **List Users endpoint** - GET /users (Admin only)
11. **Role-based access** - `@require_role('admin')` decorator

### Fase 4: Advanced Flows
12. **Invite flow** - Token generatie, email (mock)
13. **Password reset** - Token-based reset flow

---

## 📦 Deliverables

Na je audit, lever:

1. **AUDIT_REPORT.md** in `.ai/project/` met:
   - Huidige status per slice
   - Database connectiviteit status
   - Gevonden issues/blockers

2. **Update DOMAIN_REGISTRY.yaml**:
   - Zet `IDN-AUTH-LOG-001` op `status: active` zodra je begint

3. **Eerste implementatie**:
   - User model met Alembic migratie
   - Database connectie werkend

---

## ⚠️ Kritieke Vragen om te Beantwoorden

1. Draait Docker PostgreSQL? Zo niet, start met `docker compose up -d db`
2. Is er een `.env` file met correcte `DATABASE_URL`?
3. Moeten we port 5432 of 9020 gebruiken? (Besluit en documenteer)
4. Is Alembic al geconfigureerd? Zo niet, initialiseer.

---

## 🚀 Start Commando's

Begin met:

```powershell
# 1. Check Docker status
docker compose ps

# 2. Start database indien nodig
docker compose up -d db

# 3. Check backend venv (Windows)
cd backend
.venv\Scripts\activate

# 4. Test database connectie
python -c "from src.shared.database import engine; print(engine.url)"
```

---

## 📁 Relevante Bestanden

Lees deze bestanden voor context:
- `.ai/project/DOMAIN_REGISTRY.yaml` - Alle user stories voor Identity
- `backend/src/domains/identity/` - Huidige implementatie
- `backend/src/shared/database.py` - Database setup
- `backend/src/shared/security.py` - JWT/password utilities
- `docker-compose.yml` - Docker services

---

**Rol**: [DATA] + [ARCHITECT]  
**Focus**: Identity Domain - Database First  
**Doel**: Van demo-hardcoded naar productie-ready auth
