# 🚀 Test Plan Quick Reference Card

> **Voor Lead Developer - Snelle toegang tot alle testcommando's en resources**

---

## 📋 TEST FASES OVERZICHT

```
A. VOORBEREIDING (30-45 min)
   ├─ A1: Environment setup [DEVOPS]
   ├─ A2: Test data prep [ORCHESTRATOR]
   └─ A3: Plan review [ARCHITECT]

B. AUTOMATED TESTS (2-3 uur)
   ├─ B1: Backend unit (70%+ coverage)
   ├─ B2: Backend integration
   ├─ B3: Frontend unit (60%+ coverage)
   └─ B4: E2E tests (P1 scenarios)

C. MANUAL TESTS (3-4 uur)
   ├─ C1: Exploratory testing (8 sessions)
   └─ C2: Edge cases + browsers

D. ARCHITECTURE REVIEW (1-2 uur)
   ├─ D1: Code quality [ARCHITECT]
   ├─ D2: Security [DEVOPS]
   └─ D3: Performance [DEVOPS]

E. STAGING DEPLOY (30-60 min)
   ├─ E1: Deploy to Railway
   ├─ E2: Smoke tests
   └─ E3: E2E on staging
```

---

## ⚡ SNELLE START

### 1. Start Testomgeving

```powershell
# Start alle services
Task: "🚀 Dev: Start All (Backend + Frontend)"

# Verificatie
curl http://localhost:9000/health
curl http://localhost:9003
```

### 2. Test Data Klaarzetten

```powershell
# Run migrations
cd backend
alembic upgrade head

# Seed data
cd ..
npm run seed

# Verify
psql postgres://postgres:postgres@localhost:9020/databiz -c "SELECT COUNT(*) FROM users;"
```

### 3. Start Automated Tests

```powershell
# Backend (alles)
cd backend
.\run_tests.bat

# Backend (alleen unit)
.\run_tests.bat fast

# Coverage report (HTML)
.\run_tests.bat cov
# Open: backend\htmlcov\index.html

# Frontend
cd ..\frontend
npm test

# E2E
npm run test:e2e
```

---

## 🎯 KRITIEKE COMMANDO'S

### Backend Tests

```powershell
cd backend

# All tests with coverage
pytest --cov=src --cov-report=html --cov-report=term

# Specific domain
pytest tests/domains/identity/ -v

# Specific test
pytest tests/domains/identity/test_auth_service.py::test_login_success -v

# Integration tests only
pytest tests/integration/ -v

# Skip slow tests
pytest -m "not slow"
```

### Frontend Tests

```powershell
cd frontend

# Run once
npm test -- --run

# Watch mode
npm test

# Coverage
npm test -- --coverage

# Specific test
npm test -- src/features/import-wizard/__tests__/useImportFlow.test.ts
```

### E2E Tests

```powershell
cd frontend

# All E2E tests
npm run test:e2e

# Headed mode (zichtbaar)
npx playwright test --headed

# Specific test
npx playwright test e2e/tests/auth.spec.ts

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

---

## 🔍 VERIFICATIE COMMANDO'S

### Environment Checks

```powershell
# Check Python version
python --version  # Should be 3.11+

# Check Node version
node --version    # Should be 20+

# Check ports
npm run ports:check

# Check services
docker ps
```

### Database Checks

```powershell
# Current migration
cd backend
alembic current

# Migration history
alembic history

# Connect to DB
psql postgres://postgres:postgres@localhost:9020/databiz

# Count records
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM suppliers) as suppliers,
  (SELECT COUNT(*) FROM supplier_products) as products;
```

### API Checks

```powershell
# Health
curl http://localhost:9000/health

# Login (get token)
$response = curl -s http://localhost:9000/api/v1/auth/login `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"admin@databiz.dev","password":"admin123"}' | ConvertFrom-Json
$token = $response.access_token

# Use token
curl http://localhost:9000/api/v2/catalog/supplier-products `
  -Headers @{"Authorization"="Bearer $token"}
```

---

## 📊 COVERAGE TARGETS

| Component        | Minimum | Target | Blocker |
| :--------------- | :------ | :----- | :------ |
| Backend Services | 70%     | 85%    | < 60%   |
| Backend Routers  | 50%     | 70%    | < 40%   |
| Frontend Logic   | 60%     | 75%    | < 50%   |

---

## 🚦 FENCING RULES

| Fence  | Condition              | Action  |
| :----- | :--------------------- | :------ |
| **F1** | Backend coverage < 60% | 🛑 STOP |
| **F2** | Critical test fails    | 🛑 STOP |
| **F3** | P1 E2E fails           | 🛑 STOP |
| **F4** | High security vuln     | 🛑 STOP |
| **F5** | Staging smoke fails    | 🛑 STOP |

---

## 🧪 MANUAL TEST SESSIONS

### Session 1: Identity (30 min)

- Login happy path
- Login wrong password
- Logout
- Session persistence
- Protected routes

### Session 2: Import Wizard (60 min)

- Upload CSV
- Duplicate detection
- Invalid format
- AI mapping
- Dataset activation

### Session 3: Catalog (45 min)

- View catalog
- Search by brand/EAN
- Filter by category
- Product detail
- Pagination

### Session 4: Assortment (45 min) - NEW

- View empty assortment
- View seeded assortment
- Promote product
- Duplicate EAN prevention
- Multi-supplier source

### Session 5: Cross-Domain (30 min)

- Full happy path
- Supplier management
- Brand management

### Session 6: Edge Cases (60 min)

- Large files (10MB)
- Unicode characters
- Special characters
- Empty fields
- 1000 products

### Session 7: Browsers (45 min)

- Chrome, Firefox, Edge, Safari
- All critical flows per browser

### Session 8: Responsive (30 min)

- Desktop, Laptop, Tablet, Mobile
- Layout + Navigation + Forms

---

## 📁 BELANGRIJKE BESTANDEN

### Test Documentatie

- [COMPREHENSIVE_TEST_PLAN.md](COMPREHENSIVE_TEST_PLAN.md) - Volledig testplan
- [TEST_EXECUTION_LOG.md](test-results/TEST_EXECUTION_LOG.md) - Resultaten loggen
- [MANUAL_TEST_REPORT.md](test-results/MANUAL_TEST_REPORT.md) - Manual test notes
- [PERFORMANCE_BASELINE.md](test-results/PERFORMANCE_BASELINE.md) - Performance metrics
- [SECURITY_AUDIT_REPORT.md](test-results/SECURITY_AUDIT_REPORT.md) - Security scan
- [STAGING_SMOKE_TEST_REPORT.md](test-results/STAGING_SMOKE_TEST_REPORT.md) - Staging tests

### Project Documentatie

- [DOMAIN_REGISTRY.yaml](DOMAIN_REGISTRY.yaml) - Feature registry
- [MVP_HAPPY_PATH.md](MVP_HAPPY_PATH.md) - Current sprint
- [DDD_WORKFLOW_MAP.md](DDD_WORKFLOW_MAP.md) - Architecture
- [TEST_STRATEGY_LITE.md](TEST_STRATEGY_LITE.md) - Testing strategie

### Agent Guides

- [QA_SPECIALIST.md](../../.ai/company/agent-library/core/QA_SPECIALIST.md)
- [ORCHESTRATOR.md](../../.ai/company/agent-library/core/ORCHESTRATOR.md)
- [ARCHITECT.md](../../.ai/company/agent-library/core/ARCHITECT.md)
- [DEVOPS_ENGINEER.md](../../.ai/company/agent-library/specialized/DEVOPS_ENGINEER.md)

---

## 🆘 TROUBLESHOOTING

### Backend won't start

```powershell
netstat -ano | findstr :9000
.\.venv\Scripts\activate
where python
python --version
```

### Tests failing

```powershell
cd backend
pytest --create-db  # Reset test DB
pytest tests/domains/identity/test_login.py -v
.\run_tests.bat cov  # Coverage report
```

### Database issues

```powershell
cd backend
alembic current
alembic downgrade -1
alembic upgrade head
npm run seed
```

### E2E flaky

```powershell
# Retry 3x
npx playwright test --retries=3

# Debug
npx playwright test --debug

# If still flaky → DELETE (per TEST_STRATEGY_LITE)
```

---

## 👥 AGENT ROLLEN

| Tag                | Role          | Responsibility                    |
| :----------------- | :------------ | :-------------------------------- |
| **[QA]**           | QA Specialist | Automated tests, coverage         |
| **[ORCHESTRATOR]** | Orchestrator  | Volgorde, fencing, coordination   |
| **[ARCHITECT]**    | Architect     | Code quality, design review       |
| **[DEVOPS]**       | DevOps        | Infrastructure, security, staging |

---

## ✅ DEFINITION OF DONE

- ✅ All automated tests green (B1-B4)
- ✅ Manual testing 100% complete (C1-C2)
- ✅ Architecture review approved (D1-D3)
- ✅ Staging smoke tests passed (E1-E3)
- ✅ Zero blocker fences active
- ✅ Coverage ≥ 70% backend, ≥ 60% frontend
- ✅ Performance within targets
- ✅ Security scan clean

---

## 🔗 SNELKOPPELINGEN

```powershell
# Start everything
Task: "🚀 Dev: Start All (Backend + Frontend)"

# Stop everything
Task: "Services: Stop All"

# Run all tests
.\run_tests.bat && cd ..\frontend && npm test -- --run

# Open coverage
start backend\htmlcov\index.html
start frontend\coverage\index.html

# Open E2E report
npx playwright show-report
```

---

**GEBRUIK:** Print of bookmark deze pagina voor snelle referentie tijdens testen!
