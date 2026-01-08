# 🧪 DataBiz Next - Uitgebreid Testplan

> **Status:** ACTIEF  
> **Datum:** 20 december 2025  
> **Versie:** 1.0  
> **Eigenaar:** Multi-Agent Test Team

---

## 🎯 Executive Summary

Dit document beschrijft de **complete teststructuur** voor DataBiz Next waarbij verschillende AI-agents samenwerken om de applicatie uitgebreid en minutieus te testen.

### Team Rollen

| Rol                     | Agent          | Verantwoordelijkheid                                   | Status     |
| :---------------------- | :------------- | :----------------------------------------------------- | :--------- |
| **Manual Testing**      | Lead Developer | Handmatige verificatie user flows, exploratory testing | 🟢 READY   |
| **Test Automation**     | [QA]           | Unit tests, integration tests, E2E automation          | 🟢 READY   |
| **Test Orchestration**  | [ORCHESTRATOR] | Volgorde bewaking, fencing, testplan uitvoering        | 🟢 READY   |
| **Architecture Review** | [ARCHITECT]    | Structurele integriteit, design patterns verificatie   | 🟡 STANDBY |
| **Infrastructure**      | [DEVOPS]       | Testomgevingen, CI/CD, monitoring                      | 🟡 STANDBY |

---

## 📋 Testscope (8-Phase Workflow)

### Fase 1-4: ✅ GEÏMPLEMENTEERD (Te Testen)

| Fase          | Domain  | Status  | Test Priority | Handmatig              | Geautomatiseerd          |
| :------------ | :------ | :------ | :------------ | :--------------------- | :----------------------- |
| 1. Intake     | imports | ✅ Done | P1            | User upload scenario   | Unit + Integration + E2E |
| 2. Mapping    | imports | ✅ Done | P1            | AI mapping verificatie | Unit + Integration       |
| 3. Activation | imports | ✅ Done | P1            | Dataset lifecycle      | Unit + Integration       |
| 4. Catalog    | catalog | ✅ Done | P1            | Browse/search/filter   | Unit + Integration + E2E |

### Fase 5-6: 🔄 IN PROGRESS (Parallel Testen)

| Fase          | Domain     | Status      | Test Priority | Handmatig                  | Geautomatiseerd       |
| :------------ | :--------- | :---------- | :------------ | :------------------------- | :-------------------- |
| 5. Promotion  | promotion  | 🟡 DB Ready | P1            | Selecteer + promoveer flow | Unit (DB models done) |
| 6. Assortment | assortment | 🟡 DB Ready | P1            | CRUD eigen producten       | Unit (DB models done) |

### Fase 7-8: ⏸️ PLANNED (Toekomstig)

| Fase          | Domain     | Status       | Test Priority | Handmatig | Geautomatiseerd |
| :------------ | :--------- | :----------- | :------------ | :-------- | :-------------- |
| 7. Enrichment | enrichment | ❌ Not Built | P3            | -         | -               |
| 8. Export     | export     | ❌ Not Built | P3            | -         | -               |

### Support Domains: ✅ GEÏMPLEMENTEERD (Te Testen)

| Domain      | Status     | Test Priority | Kritieke Flows                                 |
| :---------- | :--------- | :------------ | :--------------------------------------------- |
| identity    | ✅ Done    | P1            | Login, logout, password reset, user management |
| maintenance | 🟡 Partial | P2            | Supplier CRUD, Brand CRUD                      |
| system      | ✅ Done    | P2            | AI config, health checks                       |
| platform    | ✅ Done    | P2            | Navigation, theme, layout                      |

---

## 🎭 Testfasen & Orkestratie

### FASE A: Voorbereiding & Setup (Dag 1)

**Eigenaar:** [ORCHESTRATOR] + [DEVOPS]

#### A1. Testomgeving Verificatie

**[DEVOPS] CHECKLIST:**

```powershell
# 1. Verify all services can start
Task: "🚀 Dev: Start All (Backend + Frontend)"

# 2. Check port availability
npm run ports:check

# 3. Verify database migrations
cd backend
alembic current
alembic upgrade head

# 4. Seed test data
npm run seed

# 5. Health check
curl http://localhost:9000/health
curl http://localhost:9003

# 6. Verify Railway staging environment
railway status
railway logs --lines 50
```

**ACCEPTATIECRITERIA:**

- ✅ Backend draait op http://localhost:9000
- ✅ Frontend draait op http://localhost:9003
- ✅ PostgreSQL accessible op localhost:9020
- ✅ MinIO accessible op localhost:9022
- ✅ Railway staging environment operationeel
- ✅ Test database geseed met demo data

#### A2. Test Data Preparatie

**[ORCHESTRATOR] CHECKLIST:**

```python
# Verify test fixtures exist
backend/tests/conftest.py              # Shared fixtures
backend/seed_assortment.py             # Assortment seed data
backend/test_auth_flow.py              # Auth flow test

# Verify E2E test data
frontend/e2e/tests/auth.spec.ts        # Login test data
frontend/e2e/tests/upload-file.spec.ts # Upload test files
```

**TEST DATA REQUIREMENTS:**

- ✅ Admin user: `admin@databiz.dev` / `admin123`
- ✅ Test supplier: "Test Supplier" in database
- ✅ Sample CSV files in `examples/suppliers/`
- ✅ Test brands in database
- ✅ Test categories in database

#### A3. Test Plan Review

**[ARCHITECT] REVIEW:**

Verify testplan coverage tegen Domain Registry:

```bash
python scripts/validate-copilot-instructions.py
```

**REVIEW CHECKLIST:**

- [ ] Alle registered slices hebben testcases
- [ ] Critical user journeys gedekt
- [ ] Domain boundaries worden getest
- [ ] Security scenarios covered
- [ ] Performance baselines defined

---

### FASE B: Automated Testing (Dag 1-2)

**Eigenaar:** [QA]

#### B1. Backend Unit Tests (Priority 1)

**TARGET: 70% coverage minimum**

```powershell
cd backend
.\run_tests.bat          # All tests
.\run_tests.bat fast     # Skip integration
.\run_tests.bat cov      # HTML coverage report
```

**TEST MATRIX:**

| Domain     | Module             | Coverage Target | Status    |
| :--------- | :----------------- | :-------------- | :-------- |
| identity   | auth_service.py    | 85%             | ⏳ TO RUN |
| identity   | user_service.py    | 85%             | ⏳ TO RUN |
| imports    | parser_service.py  | 85%             | ⏳ TO RUN |
| imports    | upload_service.py  | 85%             | ⏳ TO RUN |
| imports    | mapping_service.py | 85%             | ⏳ TO RUN |
| catalog    | search_service.py  | 85%             | ⏳ TO RUN |
| catalog    | filter_service.py  | 85%             | ⏳ TO RUN |
| assortment | models.py          | 90%             | ⏳ TO RUN |

**CRITICAL TESTS:**

```python
# Identity Domain
tests/domains/identity/test_auth_service.py
  - test_login_success
  - test_login_invalid_credentials
  - test_password_hashing
  - test_jwt_generation
  - test_jwt_validation
  - test_refresh_token

# Imports Domain
tests/domains/imports/test_parser.py
  - test_csv_parse_success
  - test_xlsx_parse_success
  - test_duplicate_detection_sha256
  - test_invalid_file_format

tests/domains/imports/test_upload_router.py
  - test_upload_endpoint_success
  - test_upload_duplicate_file
  - test_upload_invalid_format

# Catalog Domain
tests/domains/catalog/test_search.py
  - test_search_by_brand
  - test_search_by_ean
  - test_search_no_results
  - test_filter_by_category

# Assortment Domain (NEW)
tests/domains/assortment/test_models.py
  - test_create_assortment_master
  - test_create_assortment_variant
  - test_multi_supplier_source
  - test_ean_uniqueness_constraint
  - test_cascade_delete
```

**FENCING RULES:**

- 🚫 STOP als coverage < 60% (blocker)
- ⚠️ WARNING als coverage 60-70%
- ✅ PASS als coverage ≥ 70%

#### B2. Backend Integration Tests (Priority 1)

**TARGET: API endpoints + database interactions**

```powershell
pytest tests/integration/ -v
```

**CRITICAL INTEGRATION TESTS:**

```python
# Assortment Promotion Flow (NEW)
tests/integration/test_assortment_promotion.py
  - test_promote_supplier_product_to_assortment
  - test_prevent_duplicate_ean_promotion
  - test_multi_supplier_sources
  - test_cascade_delete_master_variants

# Import Full Flow
tests/integration/test_import_flow.py
  - test_upload_parse_activate_flow
  - test_duplicate_file_rejection
  - test_invalid_mapping_error

# Auth Full Flow
tests/integration/test_auth_flow.py
  - test_register_login_refresh_logout
  - test_password_reset_flow
  - test_invite_accept_flow
```

**FENCING RULES:**

- 🚫 STOP als critical integration test faalt
- ⚠️ WARNING als non-critical test flaky
- ✅ PASS als alle tests groen

#### B3. Frontend Unit Tests (Priority 2)

**TARGET: Business logic, hooks, utils**

```powershell
cd frontend
npm test -- --coverage
```

**CRITICAL TESTS:**

```typescript
// Store tests
src/lib/__tests__/store.test.ts
  - test_auth_store_login_logout
  - test_upload_store_state_management

// Hook tests
src/features/import-wizard/__tests__/useImportFlow.test.ts
  - test_step_navigation
  - test_form_validation
  - test_api_integration
```

**FENCING RULES:**

- ⚠️ WARNING als coverage < 60%
- ✅ PASS als coverage ≥ 60%
- ℹ️ NOTE: Component tests optional (zie TEST_STRATEGY_LITE.md)

#### B4. End-to-End Tests (Priority 1)

**TARGET: Critical user journeys**

```powershell
cd frontend
npm run test:e2e
```

**CRITICAL E2E SCENARIOS:**

```typescript
// e2e/tests/auth.spec.ts
test("Login flow", async ({ page }) => {
  // GIVEN admin user exists
  // WHEN login with correct credentials
  // THEN redirect to dashboard
});

test("Login with wrong password", async ({ page }) => {
  // GIVEN admin user exists
  // WHEN login with wrong password
  // THEN show error message
});

// e2e/tests/upload-file.spec.ts
test("Upload supplier file happy path", async ({ page }) => {
  // GIVEN logged in user
  // WHEN upload valid CSV file
  // THEN show parsing results
  // AND dataset created
});

// e2e/tests/catalog.spec.ts (NEW)
test("Browse and search catalog", async ({ page }) => {
  // GIVEN active dataset exists
  // WHEN navigate to catalog
  // AND search for brand "Nike"
  // THEN show filtered results
});

// e2e/tests/promotion.spec.ts (NEW - TO CREATE)
test("Promote supplier product to assortment", async ({ page }) => {
  // GIVEN catalog with products
  // WHEN click "Promote" button
  // AND fill promotion form
  // THEN product added to own assortment
});
```

**FENCING RULES:**

- 🚫 STOP als P1 E2E test faalt
- ⚠️ RETRY 3x bij flaky test
- 🗑️ DELETE test als blijft flaky (zie TEST_STRATEGY_LITE.md)
- ✅ PASS als alle tests groen

---

### FASE C: Manual Testing (Dag 2-3)

**Eigenaar:** Lead Developer (Antjan)

#### C1. Exploratory Testing Matrix

**SESSION 1: Identity & Authentication (30 min)**

| Scenario             | Steps                                                                                                           | Verwacht Resultaat                | Status | Notes |
| :------------------- | :-------------------------------------------------------------------------------------------------------------- | :-------------------------------- | :----- | :---- |
| Login happy path     | 1. Open http://localhost:9003/login<br>2. Email: admin@databiz.dev<br>3. Password: admin123<br>4. Click "Login" | Redirect to /dashboard            | ⏳     |       |
| Login wrong password | 1. Open login<br>2. Email: admin@databiz.dev<br>3. Password: WRONG<br>4. Click "Login"                          | Error: "Invalid credentials"      | ⏳     |       |
| Logout               | 1. Login<br>2. Click user menu<br>3. Click "Logout"                                                             | Redirect to /login, token cleared | ⏳     |       |
| Session persistence  | 1. Login<br>2. Refresh page                                                                                     | Still logged in                   | ⏳     |       |
| Protected route      | 1. Logout<br>2. Navigate to /dashboard                                                                          | Redirect to /login                | ⏳     |       |

**SESSION 2: Import Wizard (60 min)**

| Scenario              | Steps                                                                                                              | Verwacht Resultaat                        | Status | Notes |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------- | :---------------------------------------- | :----- | :---- |
| Upload CSV happy path | 1. Login<br>2. Navigate to /imports<br>3. Click "Upload"<br>4. Select `examples/suppliers/sample.csv`<br>5. Submit | File parsed, show preview                 | ⏳     |       |
| Upload duplicate file | 1. Upload same file twice                                                                                          | Error: "File already processed" (SHA-256) | ⏳     |       |
| Upload invalid format | 1. Upload `.txt` file                                                                                              | Error: "Invalid file format"              | ⏳     |       |
| AI mapping review     | 1. Upload file<br>2. View mapping results                                                                          | AI detected: EAN, Brand, Color, Size      | ⏳     |       |
| Override mapping      | 1. View mapping<br>2. Change field mapping<br>3. Save                                                              | Mapping updated, products updated         | ⏳     |       |
| Activate dataset      | 1. Upload + map<br>2. Click "Activate"                                                                             | Dataset status: ACTIVE                    | ⏳     |       |

**SESSION 3: Catalog Browse (45 min)**

| Scenario           | Steps                                                     | Verwacht Resultaat          | Status | Notes |
| :----------------- | :-------------------------------------------------------- | :-------------------------- | :----- | :---- |
| View catalog       | 1. Login<br>2. Navigate to /catalog                       | Show supplier products grid | ⏳     |       |
| Search by brand    | 1. Catalog page<br>2. Search: "Nike"<br>3. Enter          | Filter to Nike products     | ⏳     |       |
| Search by EAN      | 1. Catalog page<br>2. Search: "8719632024095"<br>3. Enter | Show specific product       | ⏳     |       |
| Filter by category | 1. Catalog page<br>2. Select category<br>3. Apply         | Filter to category products | ⏳     |       |
| Product detail     | 1. Catalog page<br>2. Click product                       | Show detail modal/page      | ⏳     |       |
| Pagination         | 1. Catalog with >50 products<br>2. Click "Next"           | Load next page              | ⏳     |       |

**SESSION 4: Assortment Management (45 min - NIEUWE FUNCTIONALITEIT)**

| Scenario               | Steps                                                                      | Verwacht Resultaat                       | Status | Notes                 |
| :--------------------- | :------------------------------------------------------------------------- | :--------------------------------------- | :----- | :-------------------- |
| View empty assortment  | 1. Login<br>2. Navigate to /assortment                                     | Show empty state "No products yet"       | ⏳     | Check seed script ran |
| View seeded assortment | 1. Run `npm run seed`<br>2. Navigate to /assortment                        | Show 5-10 promoted products              | ⏳     | Verify DB seed worked |
| Promote from catalog   | 1. Catalog page<br>2. Click "Promote" on product<br>3. Confirm             | Product added to assortment              | ⏳     | API not built yet     |
| Prevent duplicate EAN  | 1. Promote product with EAN<br>2. Try promote same EAN                     | Error: "EAN already in assortment" (409) | ⏳     | Test uniqueness       |
| Multi-supplier source  | 1. Promote product from supplier A<br>2. Link same product from supplier B | AssortmentMasterSources shows 2 entries  | ⏳     | Check junction table  |

**SESSION 5: Cross-Domain Flows (30 min)**

| Scenario            | Steps                                                                                                                       | Verwacht Resultaat         | Status | Notes    |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------- | :----- | :------- |
| Full happy path     | 1. Login<br>2. Upload file<br>3. Map fields<br>4. Activate<br>5. Browse catalog<br>6. Promote product<br>7. View assortment | End-to-end flow complete   | ⏳     | MVP test |
| Supplier management | 1. Navigate to /suppliers<br>2. Create supplier<br>3. Upload file for supplier                                              | Supplier linked to dataset | ⏳     |          |
| Brand management    | 1. Navigate to /brands<br>2. Create brand<br>3. Verify in catalog                                                           | Brand visible in products  | ⏳     |          |

#### C2. Edge Cases & Stress Testing

**EDGE CASES:**

| Scenario                 | Expected                                 | Status                 | Notes            |
| :----------------------- | :--------------------------------------- | :--------------------- | :--------------- | --------------- |
| Upload 10MB CSV          | Parse successfully or timeout gracefully | ⏳                     | Performance test |
| Unicode characters       | ä, ö, ü, é, 中文                         | Display correctly      | ⏳               | i18n test       |
| Special characters       | Product name: "T-Shirt & Co."            | Parse correctly        | ⏳               | Escaping test   |
| Empty fields             | CSV with missing columns                 | Show validation errors | ⏳               | Robustness test |
| 1000 products in catalog | Pagination works                         | ⏳                     | Performance test |

**BROWSER COMPATIBILITY:**

| Browser | Version | Login | Upload | Catalog | Status   |
| :------ | :------ | :---- | :----- | :------ | :------- |
| Chrome  | Latest  | ⏳    | ⏳     | ⏳      |          |
| Firefox | Latest  | ⏳    | ⏳     | ⏳      |          |
| Edge    | Latest  | ⏳    | ⏳     | ⏳      |          |
| Safari  | Latest  | ⏳    | ⏳     | ⏳      | Optional |

**RESPONSIVE DESIGN:**

| Screen Size         | Layout | Navigation | Forms | Status |
| :------------------ | :----- | :--------- | :---- | :----- |
| Desktop (1920x1080) | ⏳     | ⏳         | ⏳    |        |
| Laptop (1366x768)   | ⏳     | ⏳         | ⏳    |        |
| Tablet (768x1024)   | ⏳     | ⏳         | ⏳    |        |
| Mobile (375x667)    | ⏳     | ⏳         | ⏳    |        |

---

### FASE D: Architecture & Security Review (Dag 3)

**Eigenaar:** [ARCHITECT] + [DEVOPS]

#### D1. Code Quality Review

**[ARCHITECT] CHECKLIST:**

```bash
# 1. Verify DDD structure
tree backend/src/domains/

# 2. Check for cross-domain violations
grep -r "from src.domains" backend/src/domains/identity/
grep -r "from src.domains" backend/src/domains/imports/

# 3. Verify shared models usage
grep -r "from src.shared.models" backend/src/

# 4. Check router registration
cat backend/src/main.py | grep "include_router"

# 5. Verify migrations
cd backend
alembic history
```

**REVIEW CHECKLIST:**

- [ ] Geen directe cross-domain imports
- [ ] Shared models gebruikt via `src.shared.models`
- [ ] Alle routers geregistreerd in `main.py`
- [ ] Migrations in sync met models
- [ ] Pydantic schemas strict mode
- [ ] TypeScript strict mode enabled
- [ ] No `any` types in frontend

#### D2. Security Audit

**[DEVOPS] CHECKLIST:**

```powershell
# Backend security scan
cd backend
bandit -r src/

# Frontend security scan
cd frontend
npm audit

# Check for secrets in code
git grep -i "password\s*=\s*['\"]"
git grep -i "api_key\s*=\s*['\"]"
git grep -i "secret\s*=\s*['\"]"

# Verify environment variables
cat backend\.env.example
cat frontend\.env.example
```

**SECURITY CHECKLIST:**

- [ ] No hardcoded passwords/secrets
- [ ] JWT tokens expire correctly
- [ ] Password hashing uses bcrypt
- [ ] SQL injection protection (SQLAlchemy)
- [ ] CORS configured correctly
- [ ] No high/critical npm vulnerabilities
- [ ] No high/critical Python vulnerabilities

#### D3. Performance Baselines

**[DEVOPS] BENCHMARKS:**

```powershell
# API response times
Measure-Command { curl http://localhost:9000/api/v1/health }
Measure-Command { curl http://localhost:9000/api/v1/auth/login -Method POST -Body '...' }
Measure-Command { curl http://localhost:9000/api/v2/catalog/supplier-products }

# Database query times
cd backend
python -c "
from src.shared.database import get_db
import time
# Measure query times
"
```

**PERFORMANCE TARGETS:**

| Endpoint          | Target  | Acceptable | Status |
| :---------------- | :------ | :--------- | :----- |
| /health           | < 50ms  | < 100ms    | ⏳     |
| /auth/login       | < 200ms | < 500ms    | ⏳     |
| /catalog/products | < 300ms | < 1000ms   | ⏳     |
| File upload (1MB) | < 2s    | < 5s       | ⏳     |
| Search query      | < 200ms | < 500ms    | ⏳     |

---

### FASE E: Staging Deployment Test (Dag 4)

**Eigenaar:** [DEVOPS] + [ORCHESTRATOR]

#### E1. Railway Staging Deployment

```powershell
# 1. Verify staging branch up to date
git checkout staging
git pull origin staging

# 2. Merge latest from dev
git merge dev

# 3. Push to Railway
git push origin staging

# 4. Monitor deployment
railway logs --service databiz-staging-api

# 5. Run migrations on staging
railway run alembic upgrade head

# 6. Seed staging data
railway run npm run seed
```

**STAGING CHECKLIST:**

- [ ] Backend deploys successfully
- [ ] Frontend deploys to Cloudflare Pages
- [ ] Database migrations applied
- [ ] Environment variables correct
- [ ] Health check passes: `https://staging-api.databiz.dev/health`
- [ ] Frontend accessible: `https://staging.databiz.dev`

#### E2. Smoke Tests on Staging

**CRITICAL SMOKE TESTS:**

| Test           | Endpoint/URL                             | Expected       | Status |
| :------------- | :--------------------------------------- | :------------- | :----- |
| Backend health | `https://staging-api.databiz.dev/health` | 200 OK         | ⏳     |
| API docs       | `https://staging-api.databiz.dev/docs`   | Swagger UI     | ⏳     |
| Frontend load  | `https://staging.databiz.dev`            | Homepage loads | ⏳     |
| Login staging  | Login with admin@databiz.dev             | Success        | ⏳     |
| Upload staging | Upload test file                         | Success        | ⏳     |

#### E3. E2E Tests op Staging

```powershell
# Run E2E tests against staging
cd frontend
$env:PLAYWRIGHT_BASE_URL="https://staging.databiz.dev"
npm run test:e2e
```

**FENCING RULES:**

- 🚫 STOP als smoke test faalt op staging
- 🚫 BLOCK production deployment
- ⚠️ WARNING bij performance degradation
- ✅ PASS → ready for production consideration

---

## 🔄 Orchestration & Fencing Protocol

### [ORCHESTRATOR] Responsibilities

#### 1. Test Execution Order

**STRICT SEQUENCE:**

```
┌─────────────────────────────────────────────────────┐
│ FASE A: VOORBEREIDING (Parallel)                    │
│  ├─ A1: Testomgeving setup [DEVOPS]                │
│  ├─ A2: Test data preparatie [ORCHESTRATOR]        │
│  └─ A3: Testplan review [ARCHITECT]                │
└─────────────────────────────────────────────────────┘
              ↓ (All green)
┌─────────────────────────────────────────────────────┐
│ FASE B: AUTOMATED TESTING (Sequential)              │
│  ├─ B1: Backend unit tests [QA]                    │
│  │   └─ FENCE: Coverage ≥ 70% OR STOP              │
│  ├─ B2: Backend integration tests [QA]             │
│  │   └─ FENCE: All critical tests pass OR STOP     │
│  ├─ B3: Frontend unit tests [QA]                   │
│  │   └─ FENCE: Coverage ≥ 60% OR WARN              │
│  └─ B4: E2E tests [QA]                             │
│      └─ FENCE: All P1 tests pass OR STOP           │
└─────────────────────────────────────────────────────┘
              ↓ (All green)
┌─────────────────────────────────────────────────────┐
│ FASE C: MANUAL TESTING (Parallel sessions)          │
│  ├─ C1: Exploratory testing [Lead Dev]             │
│  └─ C2: Edge cases [Lead Dev]                      │
└─────────────────────────────────────────────────────┘
              ↓ (All documented)
┌─────────────────────────────────────────────────────┐
│ FASE D: ARCHITECTURE REVIEW (Parallel)              │
│  ├─ D1: Code quality [ARCHITECT]                   │
│  ├─ D2: Security audit [DEVOPS]                    │
│  └─ D3: Performance baselines [DEVOPS]             │
└─────────────────────────────────────────────────────┘
              ↓ (All approved)
┌─────────────────────────────────────────────────────┐
│ FASE E: STAGING DEPLOYMENT (Sequential)             │
│  ├─ E1: Deploy to Railway [DEVOPS]                 │
│  │   └─ FENCE: Deployment success OR ROLLBACK      │
│  ├─ E2: Smoke tests [DEVOPS]                       │
│  │   └─ FENCE: All smoke tests pass OR ROLLBACK    │
│  └─ E3: E2E on staging [QA]                        │
│      └─ FENCE: All tests pass OR BLOCK PRODUCTION  │
└─────────────────────────────────────────────────────┘
```

#### 2. Fencing Rules (Quality Gates)

**BLOCKER FENCES (STOP ALL WORK):**

| Fence                 | Condition                   | Action                              |
| :-------------------- | :-------------------------- | :---------------------------------- |
| **F1: Coverage**      | Backend coverage < 60%      | 🛑 STOP - Fix tests before continue |
| **F2: Critical Test** | P1 integration test fails   | 🛑 STOP - Fix implementation        |
| **F3: E2E P1**        | Any P1 E2E test fails       | 🛑 STOP - Fix before staging        |
| **F4: Security**      | High/Critical vulnerability | 🛑 STOP - Fix immediately           |
| **F5: Smoke Test**    | Staging smoke test fails    | 🛑 STOP - Rollback deployment       |

**WARNING FENCES (PROCEED WITH CAUTION):**

| Fence               | Condition                  | Action                       |
| :------------------ | :------------------------- | :--------------------------- |
| **W1: Coverage**    | Backend coverage 60-70%    | ⚠️ WARN - Document gaps      |
| **W2: Flaky Test**  | Test passes 2/3 runs       | ⚠️ WARN - Mark for review    |
| **W3: Performance** | Response time > acceptable | ⚠️ WARN - Monitor in staging |

#### 3. Agent Handoffs

**HANDOFF PROTOCOL:**

```markdown
✅ [FASE {X} COMPLETE] Agent: {ROLE}
📋 Deliverables:

- {artifact 1}
- {artifact 2}
- {artifact 3}
  🎯 Results:
- {metric 1}: {value}
- {metric 2}: {value}
  🚦 Fencing Status:
- Fence F1: ✅ PASS (coverage 72%)
- Fence F2: ✅ PASS (all tests green)
  🔗 Next Agent: {NEXT_ROLE}
  ⚠️ Notes: {blockers/decisions}
```

**VOORBEELD HANDOFF:**

```markdown
✅ [FASE B1 COMPLETE] Agent: QA
📋 Deliverables:

- Backend unit tests: 127 passing
- Coverage report: htmlcov/index.html
- Test matrix: All domains tested
  🎯 Results:
- Overall coverage: 72%
- Identity domain: 85%
- Imports domain: 78%
- Catalog domain: 68%
- Assortment domain: 92%
  🚦 Fencing Status:
- Fence F1 (Coverage): ✅ PASS (72% > 60%)
- Fence F2 (Critical): ✅ PASS (all green)
  🔗 Next Agent: QA (continue to B2: Integration Tests)
  ⚠️ Notes: Catalog domain coverage slightly below target (68% vs 70%), maar acceptabel. Focus on search edge cases in volgende sprint.
```

---

## 📊 Test Results Tracking

### Test Execution Dashboard

**LOCATION:** `.ai/project/test-results/TEST_EXECUTION_LOG.md`

**FORMAT:**

```markdown
# Test Execution Log

## Test Run: {DATE} - {TIME}

**Orchestrator:** [ORCHESTRATOR]
**Executed By:** {AGENT/PERSON}

### Fase A: Voorbereiding

- [x] A1: Testomgeving setup - PASS (15 min)
- [x] A2: Test data preparatie - PASS (10 min)
- [x] A3: Testplan review - PASS (20 min)

### Fase B: Automated Testing

- [x] B1: Backend unit tests - PASS (72% coverage, 127 tests)
- [x] B2: Backend integration - PASS (23 tests)
- [ ] B3: Frontend unit tests - IN PROGRESS
- [ ] B4: E2E tests - PENDING

### Issues Found

| ID      | Severity | Domain   | Description                | Status |
| :------ | :------- | :------- | :------------------------- | :----- |
| TST-001 | Medium   | catalog  | Search special chars fails | OPEN   |
| TST-002 | Low      | identity | Flaky logout test          | FIXED  |

### Fencing Status

- Fence F1 (Coverage): ✅ PASS
- Fence F2 (Critical): ✅ PASS
- All blockers cleared: ✅ YES

### Next Steps

1. Complete Frontend unit tests (B3)
2. Run E2E test suite (B4)
3. Schedule manual testing session
```

---

## 🚨 Incident Response Plan

### Test Failures

**SCENARIO 1: Unit Test Failure**

```markdown
**DETECT:** pytest shows failures
**TRIAGE:** [QA] analyzes failure
**DECISION:**

- If test logic wrong → Fix test
- If code wrong → [ARCHITECT] reviews
- If environment → [DEVOPS] fixes
  **ACTION:** Fix + rerun + verify
  **FENCE:** Block progress until green
```

**SCENARIO 2: E2E Test Flaky**

```markdown
**DETECT:** Test passes 2/3 runs
**TRIAGE:** [QA] retries 3x
**DECISION:**

- If still flaky → DELETE test (per TEST_STRATEGY_LITE)
- If specific timing → Add wait conditions
- If environment → [DEVOPS] stabilizes
  **ACTION:** Fix or delete
  **FENCE:** Warning but don't block
```

**SCENARIO 3: Staging Deployment Fails**

```markdown
**DETECT:** Railway deployment error
**TRIAGE:** [DEVOPS] checks logs
**DECISION:**

- If migration issue → Rollback + fix migration
- If env vars → Update Railway config
- If code → Rollback deployment
  **ACTION:** Rollback + fix + redeploy
  **FENCE:** BLOCK production until stable
```

---

## 📁 Deliverables & Artifacts

### Test Documentation

**CREATED DURING TESTING:**

```
.ai/project/test-results/
├── TEST_EXECUTION_LOG.md          # Per test run results
├── MANUAL_TEST_REPORT.md          # Exploratory testing notes
├── PERFORMANCE_BASELINE.md        # Response time benchmarks
├── SECURITY_AUDIT_REPORT.md       # Vulnerability scan results
└── STAGING_SMOKE_TEST_REPORT.md   # Staging verification

backend/htmlcov/                    # Coverage HTML reports
backend/test-results.xml            # JUnit format results

frontend/coverage/                  # Frontend coverage
frontend/playwright-report/         # E2E test reports
```

### Test Artifacts (Git Tracked)

```
backend/tests/                      # All test files
frontend/e2e/tests/                 # E2E scenarios
.github/workflows/test.yml          # CI/CD test pipeline
```

---

## 🎯 Success Criteria

### Definition of DONE

**TESTPLAN COMPLEET wanneer:**

- ✅ Alle automated tests groen (B1-B4)
- ✅ Manual testing checklist 100% afgerond (C1-C2)
- ✅ Architecture review approved (D1-D3)
- ✅ Staging smoke tests passed (E1-E3)
- ✅ Zero blocker fences active
- ✅ All issues logged and triaged
- ✅ Test coverage ≥ 70% backend, ≥ 60% frontend
- ✅ Performance benchmarks within targets
- ✅ Security scan clean (no high/critical)

### Sign-off Matrix

| Role           | Responsibility         | Status | Signature |
| :------------- | :--------------------- | :----- | :-------- |
| [QA]           | Automated tests passed | ⏳     |           |
| Lead Developer | Manual tests completed | ⏳     |           |
| [ARCHITECT]    | Code quality approved  | ⏳     |           |
| [DEVOPS]       | Infrastructure stable  | ⏳     |           |
| [ORCHESTRATOR] | All fences cleared     | ⏳     |           |

---

## 📞 Communication Protocol

### Daily Standup (During Testing)

**FORMAT:**

```markdown
## Test Standup - {DATE}

### [QA] Status

- Completed: B1 (unit tests)
- In Progress: B2 (integration tests)
- Blocked: None
- Next: B3 (frontend tests)

### Lead Developer Status

- Completed: C1 Session 1-2
- In Progress: C1 Session 3
- Blocked: Waiting for promotion API
- Next: C1 Session 4-5

### [ARCHITECT] Status

- Completed: D1 (code quality review)
- In Progress: None
- Blocked: None
- Next: Standby for escalations

### [DEVOPS] Status

- Completed: A1 (environment setup)
- In Progress: D2 (security audit)
- Blocked: None
- Next: E1 (staging deployment)

### [ORCHESTRATOR] Status

- Fences: All green
- Blockers: 0
- Issues: 2 medium, 1 low
- Next phase: Proceed to Fase C
```

### Escalation Path

```
┌──────────────────────────────────────┐
│ LEVEL 1: Agent Self-Resolution       │
│  - Test fails → Debug → Fix → Rerun │
└──────────────────────────────────────┘
              ↓ (Can't resolve)
┌──────────────────────────────────────┐
│ LEVEL 2: Orchestrator Coordination   │
│  - [ORCHESTRATOR] analyzes           │
│  - Route to specialist agent         │
└──────────────────────────────────────┘
              ↓ (Still blocked)
┌──────────────────────────────────────┐
│ LEVEL 3: Architect Review            │
│  - [ARCHITECT] design decision       │
│  - Approve workaround or redesign    │
└──────────────────────────────────────┘
              ↓ (Requires business input)
┌──────────────────────────────────────┐
│ LEVEL 4: Lead Developer Escalation   │
│  - Product Owner decision             │
│  - Scope change approval              │
└──────────────────────────────────────┘
```

---

## 🔧 Tools & Environment

### Required Tools

| Tool       | Version | Purpose                  | Installation                      |
| :--------- | :------ | :----------------------- | :-------------------------------- |
| Python     | 3.11+   | Backend tests            | `python --version`                |
| Node.js    | 20+     | Frontend tests           | `node --version`                  |
| pytest     | 7.0+    | Backend unit/integration | `pip install pytest`              |
| Playwright | Latest  | E2E tests                | `npm install -D @playwright/test` |
| Docker     | Latest  | Service orchestration    | `docker --version`                |
| PostgreSQL | 15+     | Database                 | Via Docker Compose                |
| MinIO      | Latest  | File storage             | Via Docker Compose                |

### VS Code Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-playwright.playwright",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

---

## 📚 References

**PROJECT DOCUMENTATION:**

- [DOMAIN_REGISTRY.yaml](DOMAIN_REGISTRY.yaml) - Feature registry (SSOT)
- [MVP_HAPPY_PATH.md](MVP_HAPPY_PATH.md) - Current sprint focus
- [DDD_WORKFLOW_MAP.md](DDD_WORKFLOW_MAP.md) - Architecture overview
- [TEST_STRATEGY_LITE.md](TEST_STRATEGY_LITE.md) - Pragmatic testing approach
- [ACTIVE_WORKSTREAMS.md](ACTIVE_WORKSTREAMS.md) - Conflict prevention

**AGENT GUIDES:**

- [QA_SPECIALIST.md](../.ai/company/agent-library/core/QA_SPECIALIST.md)
- [ORCHESTRATOR.md](../.ai/company/agent-library/core/ORCHESTRATOR.md)
- [ARCHITECT.md](../.ai/company/agent-library/core/ARCHITECT.md)
- [DEVOPS_ENGINEER.md](../.ai/company/agent-library/specialized/DEVOPS_ENGINEER.md)

**EXTERNAL:**

- [Playwright Documentation](https://playwright.dev)
- [Pytest Documentation](https://docs.pytest.org)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

## ✅ Checklist voor Start

**VOORDAT JE BEGINT MET TESTEN:**

- [ ] Alle instructies gelezen
- [ ] Testplan begrepen
- [ ] Tools geïnstalleerd en geverifieerd
- [ ] Testomgeving operationeel (Task: "🚀 Dev: Start All")
- [ ] Test data geseed (`npm run seed`)
- [ ] Alle agents beschikbaar ([QA], [ORCHESTRATOR], [ARCHITECT], [DEVOPS])
- [ ] Communication protocol duidelijk
- [ ] Escalation path bekend
- [ ] Ready to start Fase A

---

**LAST UPDATED:** 20 december 2025  
**VERSION:** 1.0  
**OWNER:** [ORCHESTRATOR]  
**NEXT REVIEW:** Na voltooiing testcyclus
